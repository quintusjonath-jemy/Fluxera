import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC_CHANNELS,
  DownloadItem,
  NetworkInterfaceInfo,
  ProbeResult,
  DiskSpaceInfo,
  AppSettings,
  DiagnosticsInfo,
  ConnectionMode
} from '../shared/types'

export interface FluxeraAPI {
  // Probing & System
  probeUrl: (url: string) => Promise<ProbeResult>
  checkDiskSpace: (dir: string, bytes: number) => Promise<DiskSpaceInfo>
  selectDestination: (defaultPath?: string) => Promise<string | null>
  selectFolder: () => Promise<string | null>

  // Downloads
  startDownload: (options: {
    url: string
    destinationDir?: string
    customFileName?: string
    selectedInterfaceIds?: string[]
    connectionMode?: ConnectionMode
    chunkSize?: number
  }) => Promise<DownloadItem>
  pauseDownload: (id: string) => Promise<void>
  resumeDownload: (id: string) => Promise<void>
  cancelDownload: (id: string) => Promise<void>
  removeDownload: (id: string, deleteFiles?: boolean) => Promise<void>
  getDownloads: () => Promise<DownloadItem[]>
  openFile: (filePath: string) => Promise<string>
  showInFolder: (filePath: string) => Promise<void>

  // Networks
  getInterfaces: () => Promise<NetworkInterfaceInfo[]>
  refreshInterfaces: () => Promise<NetworkInterfaceInfo[]>
  updateInterface: (
    id: string,
    update: { displayName?: string; color?: string; enabled?: boolean }
  ) => Promise<NetworkInterfaceInfo | undefined>

  // Settings & Diagnostics
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>
  getDiagnostics: () => Promise<DiagnosticsInfo>
  clearLogs: () => Promise<void>

  // Event Listeners
  onDownloadProgress: (callback: (item: DownloadItem) => void) => () => void
  onDownloadUpdated: (callback: (item: DownloadItem) => void) => () => void
  onDownloadsListUpdated: (callback: (items: DownloadItem[]) => void) => () => void
  onInterfacesUpdated: (callback: (interfaces: NetworkInterfaceInfo[]) => void) => () => void
}

const api: FluxeraAPI = {
  probeUrl: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.PROBE_URL, url),
  checkDiskSpace: (dir: string, bytes: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_DISK_SPACE, dir, bytes),
  selectDestination: (defaultPath?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SELECT_DESTINATION, defaultPath),
  selectFolder: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_FOLDER),

  startDownload: (options) => ipcRenderer.invoke(IPC_CHANNELS.START_DOWNLOAD, options),
  pauseDownload: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PAUSE_DOWNLOAD, id),
  resumeDownload: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.RESUME_DOWNLOAD, id),
  cancelDownload: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CANCEL_DOWNLOAD, id),
  removeDownload: (id: string, deleteFiles = false) =>
    ipcRenderer.invoke(IPC_CHANNELS.REMOVE_DOWNLOAD, id, deleteFiles),
  getDownloads: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DOWNLOADS),
  openFile: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE, filePath),
  showInFolder: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.SHOW_IN_FOLDER, filePath),

  getInterfaces: () => ipcRenderer.invoke(IPC_CHANNELS.GET_INTERFACES),
  refreshInterfaces: () => ipcRenderer.invoke(IPC_CHANNELS.REFRESH_INTERFACES),
  updateInterface: (id, update) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_INTERFACE, id, update),

  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSettings: (settings) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings),
  getDiagnostics: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DIAGNOSTICS),
  clearLogs: () => ipcRenderer.invoke(IPC_CHANNELS.CLEAR_LOGS),

  onDownloadProgress: (callback) => {
    const handler = (_event: unknown, item: DownloadItem): void => callback(item)
    ipcRenderer.on(IPC_CHANNELS.ON_DOWNLOAD_PROGRESS, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_DOWNLOAD_PROGRESS, handler)
    }
  },
  onDownloadUpdated: (callback) => {
    const handler = (_event: unknown, item: DownloadItem): void => callback(item)
    ipcRenderer.on(IPC_CHANNELS.ON_DOWNLOAD_UPDATED, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_DOWNLOAD_UPDATED, handler)
    }
  },
  onDownloadsListUpdated: (callback) => {
    const handler = (_event: unknown, items: DownloadItem[]): void => callback(items)
    ipcRenderer.on(IPC_CHANNELS.ON_DOWNLOADS_LIST_UPDATED, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_DOWNLOADS_LIST_UPDATED, handler)
    }
  },
  onInterfacesUpdated: (callback) => {
    const handler = (_event: unknown, ifaces: NetworkInterfaceInfo[]): void => callback(ifaces)
    ipcRenderer.on(IPC_CHANNELS.ON_INTERFACES_UPDATED, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_INTERFACES_UPDATED, handler)
    }
  }
}

contextBridge.exposeInMainWorld('fluxera', api)
