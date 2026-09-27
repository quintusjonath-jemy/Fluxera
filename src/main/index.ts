import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { IPC_CHANNELS } from '../shared/types'
import { InterfaceManager } from './network/interface-manager'
import { DownloadEngine } from './engine/download-engine'
import { SettingsManager } from './settings/settings-manager'
import { NotificationManager } from './notifications/notification-manager'
import { DiagnosticsLogger } from './diagnostics/diagnostics-logger'
import { probeUrl } from './engine/url-prober'
import { FileStorageManager } from './storage/file-storage'

let mainWindow: BrowserWindow | null = null

const interfaceManager = new InterfaceManager()
const settingsManager = new SettingsManager()
const notificationManager = new NotificationManager()
const diagnosticsLogger = new DiagnosticsLogger()
const fileStorage = new FileStorageManager()
let downloadEngine: DownloadEngine

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Fluxera — Every connection. One faster download.',
    backgroundColor: '#0B0D0E',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  // 1. Initialize settings & logger
  const settings = await settingsManager.initialize()
  notificationManager.setEnabled(settings.notificationsEnabled)
  interfaceManager.setCustomizations(settings.interfaceCustomizations || {})

  // 2. Initialize download engine & interface manager
  downloadEngine = new DownloadEngine(interfaceManager)
  await downloadEngine.initialize()
  await interfaceManager.start()

  // 3. Setup Engine Event Forwarding to Renderer
  downloadEngine.on('download-progress', (item) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.ON_DOWNLOAD_PROGRESS, item)
    }
  })

  downloadEngine.on('download-updated', (item) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.ON_DOWNLOAD_UPDATED, item)
    }
  })

  downloadEngine.on('downloads-list-updated', (list) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.ON_DOWNLOADS_LIST_UPDATED, list)
    }
  })

  downloadEngine.on('download-completed', (item) => {
    const sizeMb = (item.fileSize / (1024 * 1024)).toFixed(1) + ' MB'
    notificationManager.notifyDownloadComplete(item.fileName, sizeMb)
    diagnosticsLogger.log('info', 'Engine', `Download completed: ${item.fileName}`)
  })

  interfaceManager.on('updated', (ifaces) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.ON_INTERFACES_UPDATED, ifaces)
    }
  })

  // 4. Setup IPC Handlers
  ipcMain.handle(IPC_CHANNELS.PROBE_URL, async (_event, url: string) => {
    diagnosticsLogger.log('info', 'Prober', `Probing URL: ${url}`)
    try {
      return await probeUrl(url)
    } catch (err) {
      diagnosticsLogger.log('error', 'Prober', `Probe failed: ${(err as Error).message}`)
      throw err
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHECK_DISK_SPACE, async (_event, dir: string, bytes: number) => {
    return await fileStorage.checkDiskSpace(dir, bytes)
  })

  ipcMain.handle(IPC_CHANNELS.SELECT_DESTINATION, async (_event, defaultPath?: string) => {
    if (!mainWindow) return null
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Select Download Destination',
      defaultPath: defaultPath || app.getPath('downloads')
    })
    return result.canceled ? null : result.filePath
  })

  ipcMain.handle(IPC_CHANNELS.SELECT_FOLDER, async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Destination Directory',
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.START_DOWNLOAD, async (_event, options) => {
    diagnosticsLogger.log('info', 'Engine', `Starting download: ${options.url}`)
    return await downloadEngine.startDownload(options)
  })

  ipcMain.handle(IPC_CHANNELS.PAUSE_DOWNLOAD, async (_event, id: string) => {
    diagnosticsLogger.log('info', 'Engine', `Pausing download: ${id}`)
    await downloadEngine.pauseDownload(id)
  })

  ipcMain.handle(IPC_CHANNELS.RESUME_DOWNLOAD, async (_event, id: string) => {
    diagnosticsLogger.log('info', 'Engine', `Resuming download: ${id}`)
    await downloadEngine.resumeDownload(id)
  })

  ipcMain.handle(IPC_CHANNELS.CANCEL_DOWNLOAD, async (_event, id: string) => {
    diagnosticsLogger.log('info', 'Engine', `Cancelling download: ${id}`)
    await downloadEngine.cancelDownload(id)
  })

  ipcMain.handle(IPC_CHANNELS.REMOVE_DOWNLOAD, async (_event, id: string, deleteFiles: boolean) => {
    diagnosticsLogger.log('info', 'Engine', `Removing download: ${id}, deleteFiles: ${deleteFiles}`)
    await downloadEngine.removeDownload(id, deleteFiles)
  })

  ipcMain.handle(IPC_CHANNELS.GET_DOWNLOADS, () => {
    return downloadEngine.getDownloads()
  })

  ipcMain.handle(IPC_CHANNELS.OPEN_FILE, async (_event, filePath: string) => {
    return await shell.openPath(filePath)
  })

  ipcMain.handle(IPC_CHANNELS.SHOW_IN_FOLDER, async (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle(IPC_CHANNELS.GET_INTERFACES, () => {
    return interfaceManager.getInterfaces()
  })

  ipcMain.handle(IPC_CHANNELS.REFRESH_INTERFACES, async () => {
    return await interfaceManager.refresh(true)
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_INTERFACE, async (_event, id, update) => {
    const updated = interfaceManager.updateInterfaceCustomization(id, update)
    if (updated) {
      const current = settingsManager.getSettings()
      const customizations = current.interfaceCustomizations || {}
      customizations[id] = {
        displayName: updated.displayName,
        color: updated.color,
        enabled: updated.enabled
      }
      await settingsManager.save({ interfaceCustomizations: customizations })
    }
    return updated
  })

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return settingsManager.getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, async (_event, newSettings) => {
    const saved = await settingsManager.save(newSettings)
    if (saved.notificationsEnabled !== undefined) {
      notificationManager.setEnabled(saved.notificationsEnabled)
    }
    if (saved.interfaceCustomizations) {
      interfaceManager.setCustomizations(saved.interfaceCustomizations)
    }
    return saved
  })

  ipcMain.handle(IPC_CHANNELS.GET_DIAGNOSTICS, () => {
    const activeCount = downloadEngine.getDownloads().filter((d) => d.state === 'DOWNLOADING').length
    const completedCount = downloadEngine.getDownloads().filter((d) => d.state === 'COMPLETED').length
    return diagnosticsLogger.getDiagnosticsInfo(
      interfaceManager.getInterfaces(),
      activeCount,
      completedCount
    )
  })

  ipcMain.handle(IPC_CHANNELS.CLEAR_LOGS, () => {
    diagnosticsLogger.clearLogs()
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  interfaceManager.stop()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
