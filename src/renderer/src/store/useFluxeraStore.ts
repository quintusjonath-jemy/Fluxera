import { create } from 'zustand'
import {
  DownloadItem,
  NetworkInterfaceInfo,
  AppSettings,
  ProbeResult,
  ConnectionMode,
  DiskSpaceInfo
} from '../../../shared/types'

export type NavTab =
  | 'home'
  | 'downloads'
  | 'networks'
  | 'monitor'
  | 'history'
  | 'settings'
  | 'diagnostics'
  | 'about'

export type DownloadFilter = 'all' | 'downloading' | 'paused' | 'completed' | 'failed'

interface FluxeraState {
  // Navigation & UI
  currentTab: NavTab
  setCurrentTab: (tab: NavTab) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
  toggleTheme: () => void

  // Downloads State
  downloads: DownloadItem[]
  selectedDownloadId: string | null
  setSelectedDownloadId: (id: string | null) => void
  downloadFilter: DownloadFilter
  setDownloadFilter: (f: DownloadFilter) => void

  // Networks State
  interfaces: NetworkInterfaceInfo[]
  editingInterface: NetworkInterfaceInfo | null
  setEditingInterface: (iface: NetworkInterfaceInfo | null) => void

  // Settings State
  settings: AppSettings | null

  // New Download Dialog State
  isNewDownloadOpen: boolean
  setIsNewDownloadOpen: (open: boolean) => void
  probeUrlInput: string
  setProbeUrlInput: (url: string) => void
  isProbing: boolean
  probeResult: ProbeResult | null
  probeError: string | null
  destinationPath: string
  setDestinationPath: (path: string) => void
  selectedInterfaceIds: string[]
  setSelectedInterfaceIds: (ids: string[]) => void
  toggleInterfaceSelection: (id: string) => void
  connectionMode: ConnectionMode
  setConnectionMode: (mode: ConnectionMode) => void
  diskSpace: DiskSpaceInfo | null

  // Notification / Toast
  toast: { message: string; type: 'info' | 'success' | 'error' } | null
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void

  // Actions
  initialize: () => Promise<void>
  probe: (url: string) => Promise<void>
  startDownloadFromDialog: () => Promise<void>
  pauseDownload: (id: string) => Promise<void>
  resumeDownload: (id: string) => Promise<void>
  cancelDownload: (id: string) => Promise<void>
  removeDownload: (id: string, deleteFiles?: boolean) => Promise<void>
  openFile: (filePath: string) => Promise<void>
  showInFolder: (filePath: string) => Promise<void>
  refreshInterfaces: () => Promise<void>
  updateInterface: (
    id: string,
    update: { displayName?: string; color?: string; enabled?: boolean }
  ) => Promise<void>
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>
}

export const useFluxeraStore = create<FluxeraState>((set, get) => ({
  currentTab: 'home',
  setCurrentTab: (tab) => set({ currentTab: tab }),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  theme: 'dark',
  setTheme: (theme) => {
    set({ theme })
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  },
  toggleTheme: () => {
    const current = get().theme
    const next = current === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
    get().updateSettings({ theme: next })
  },

  downloads: [],
  selectedDownloadId: null,
  setSelectedDownloadId: (id) => set({ selectedDownloadId: id }),
  downloadFilter: 'all',
  setDownloadFilter: (f) => set({ downloadFilter: f }),

  interfaces: [],
  editingInterface: null,
  setEditingInterface: (iface) => set({ editingInterface: iface }),

  settings: null,

  isNewDownloadOpen: false,
  setIsNewDownloadOpen: (open) => {
    set({
      isNewDownloadOpen: open,
      probeResult: null,
      probeError: null,
      isProbing: false
    })
    if (open) {
      // Auto-select all available interfaces by default
      const usable = get().interfaces.filter((i) => i.enabled)
      set({ selectedInterfaceIds: usable.map((i) => i.id) })
    }
  },
  probeUrlInput: '',
  setProbeUrlInput: (url) => set({ probeUrlInput: url }),
  isProbing: false,
  probeResult: null,
  probeError: null,
  destinationPath: '',
  setDestinationPath: (path) => set({ destinationPath: path }),
  selectedInterfaceIds: [],
  setSelectedInterfaceIds: (ids) => set({ selectedInterfaceIds: ids }),
  toggleInterfaceSelection: (id) => {
    const current = get().selectedInterfaceIds
    if (current.includes(id)) {
      set({ selectedInterfaceIds: current.filter((x) => x !== id) })
    } else {
      set({ selectedInterfaceIds: [...current, id] })
    }
  },
  connectionMode: 'Auto',
  setConnectionMode: (mode) => set({ connectionMode: mode }),
  diskSpace: null,

  toast: null,
  showToast: (message, type = 'info') => {
    set({ toast: { message, type } })
    setTimeout(() => {
      set({ toast: null })
    }, 4000)
  },

  initialize: async () => {
    if (typeof window === 'undefined' || !window.fluxera) return

    try {
      // 1. Fetch settings
      const settings = await window.fluxera.getSettings()
      set({
        settings,
        theme: settings.theme || 'dark',
        destinationPath: settings.defaultDownloadDir || '',
        connectionMode: settings.defaultConnectionMode || 'Auto'
      })
      if (settings.theme === 'light') {
        document.documentElement.classList.remove('dark')
      } else {
        document.documentElement.classList.add('dark')
      }

      // 2. Fetch initial downloads & interfaces
      const [downloads, interfaces] = await Promise.all([
        window.fluxera.getDownloads(),
        window.fluxera.getInterfaces()
      ])
      set({ downloads, interfaces })

      // Auto-select usable interfaces for new download dialog
      const usable = interfaces.filter((i) => i.enabled)
      set({ selectedInterfaceIds: usable.map((i) => i.id) })

      // 3. Register real-time listeners
      window.fluxera.onDownloadProgress((updatedItem) => {
        set((state) => ({
          downloads: state.downloads.map((d) => (d.id === updatedItem.id ? updatedItem : d))
        }))
      })

      window.fluxera.onDownloadUpdated((updatedItem) => {
        set((state) => ({
          downloads: state.downloads.map((d) => (d.id === updatedItem.id ? updatedItem : d))
        }))
      })

      window.fluxera.onDownloadsListUpdated((newList) => {
        set({ downloads: newList })
      })

      window.fluxera.onInterfacesUpdated((newIfaces) => {
        set({ interfaces: newIfaces })
      })
    } catch (err) {
      console.error('[Store] Failed to initialize Fluxera store:', err)
    }
  },

  probe: async (url: string) => {
    if (!window.fluxera || !url.trim()) return
    set({ isProbing: true, probeError: null, probeResult: null })

    try {
      const result = await window.fluxera.probeUrl(url.trim())
      set({ probeResult: result, isProbing: false })

      // Check disk space if directory and size known
      const destDir = get().destinationPath || get().settings?.defaultDownloadDir || ''
      if (destDir && result.fileSize > 0) {
        const space = await window.fluxera.checkDiskSpace(destDir, result.fileSize)
        set({ diskSpace: space })
      }
    } catch (err) {
      set({
        isProbing: false,
        probeError: (err as Error).message || 'Failed to probe download URL'
      })
    }
  },

  startDownloadFromDialog: async () => {
    const {
      probeUrlInput,
      probeResult,
      destinationPath,
      selectedInterfaceIds,
      connectionMode,
      settings
    } = get()
    if (!window.fluxera) return

    const url = probeUrlInput.trim()
    if (!url) return

    try {
      const destDir = destinationPath || settings?.defaultDownloadDir
      const item = await window.fluxera.startDownload({
        url,
        destinationDir: destDir,
        customFileName: probeResult?.suggestedName,
        selectedInterfaceIds: selectedInterfaceIds.length > 0 ? selectedInterfaceIds : undefined,
        connectionMode
      })

      get().showToast(`Started download: ${item.fileName}`, 'success')
      set({
        isNewDownloadOpen: false,
        probeUrlInput: '',
        probeResult: null,
        selectedDownloadId: item.id,
        currentTab: 'monitor'
      })
    } catch (err) {
      get().showToast((err as Error).message || 'Failed to start download', 'error')
    }
  },

  pauseDownload: async (id: string) => {
    if (!window.fluxera) return
    try {
      await window.fluxera.pauseDownload(id)
      get().showToast('Download paused', 'info')
    } catch (err) {
      get().showToast((err as Error).message, 'error')
    }
  },

  resumeDownload: async (id: string) => {
    if (!window.fluxera) return
    try {
      await window.fluxera.resumeDownload(id)
      get().showToast('Resuming download...', 'info')
    } catch (err) {
      get().showToast((err as Error).message, 'error')
    }
  },

  cancelDownload: async (id: string) => {
    if (!window.fluxera) return
    try {
      await window.fluxera.cancelDownload(id)
      get().showToast('Download cancelled', 'info')
    } catch (err) {
      get().showToast((err as Error).message, 'error')
    }
  },

  removeDownload: async (id: string, deleteFiles = false) => {
    if (!window.fluxera) return
    try {
      await window.fluxera.removeDownload(id, deleteFiles)
      if (get().selectedDownloadId === id) {
        set({ selectedDownloadId: null })
      }
      get().showToast('Download removed', 'info')
    } catch (err) {
      get().showToast((err as Error).message, 'error')
    }
  },

  openFile: async (filePath: string) => {
    if (!window.fluxera) return
    try {
      const err = await window.fluxera.openFile(filePath)
      if (err) {
        get().showToast(`Could not open file: ${err}`, 'error')
      }
    } catch (err) {
      get().showToast((err as Error).message, 'error')
    }
  },

  showInFolder: async (filePath: string) => {
    if (!window.fluxera) return
    try {
      await window.fluxera.showInFolder(filePath)
    } catch (err) {
      get().showToast((err as Error).message, 'error')
    }
  },

  refreshInterfaces: async () => {
    if (!window.fluxera) return
    try {
      const ifaces = await window.fluxera.refreshInterfaces()
      set({ interfaces: ifaces })
      get().showToast('Network interfaces refreshed', 'info')
    } catch (err) {
      get().showToast((err as Error).message, 'error')
    }
  },

  updateInterface: async (id, update) => {
    if (!window.fluxera) return
    try {
      const updated = await window.fluxera.updateInterface(id, update)
      if (updated) {
        set((state) => ({
          interfaces: state.interfaces.map((i) => (i.id === id ? updated : i)),
          editingInterface: null
        }))
        get().showToast('Network interface updated', 'success')
      }
    } catch (err) {
      get().showToast((err as Error).message, 'error')
    }
  },

  updateSettings: async (newSettings) => {
    if (!window.fluxera) return
    try {
      const saved = await window.fluxera.saveSettings(newSettings)
      set({ settings: saved })
      get().showToast('Settings saved', 'success')
    } catch (err) {
      get().showToast((err as Error).message, 'error')
    }
  }
}))
