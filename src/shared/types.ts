export type DownloadState =
  | 'QUEUED'
  | 'PROBING'
  | 'DOWNLOADING'
  | 'PAUSED'
  | 'RESUMING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'VERIFYING'
  | 'RECOVERED'

export type ChunkState =
  | 'PENDING'
  | 'DOWNLOADING'
  | 'COMPLETE'
  | 'RETRYING'
  | 'FAILED'
  | 'BACKUP'

export type NetworkState =
  | 'AVAILABLE'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'UNAVAILABLE'
  | 'RECONNECTING'

export type ConnectionMode = 'Auto' | '4' | '8' | '16' | '32'

export type InterfaceType = 'wifi' | 'ethernet' | 'cellular' | 'usb' | 'other'

export interface NetworkInterfaceInfo {
  id: string
  name: string
  originalName: string
  displayName: string
  type: InterfaceType
  ipv4: string
  ipv6?: string
  mac?: string
  status: NetworkState
  color: string
  enabled: boolean
  speed: number // bytes/sec
  bytesTransferred: number
  activeWorkers: number
  latency: number // ms
  chunkCount: number
}

export interface ChunkInfo {
  id: number
  downloadId: string
  startByte: number
  endByte: number
  totalBytes: number
  downloadedBytes: number
  assignedWorker?: string
  assignedInterfaceId?: string
  retryCount: number
  state: ChunkState
  duration?: number
  speed?: number
  isBackup?: boolean
}

export interface ActiveStreamInfo {
  streamId: string
  interfaceId: string
  interfaceName: string
  chunkId: number
  status: 'CONNECTING' | 'RECEIVING' | 'WRITING' | 'BACKUP'
  speed: number
  downloaded: number
  range: string
  duration: number
  isBackup: boolean
}

export interface SpeedHistoryPoint {
  timestamp: number
  totalSpeed: number
  perInterface: Record<string, number>
}

export interface NetworkContribution {
  bytes: number
  percentage: number
  speed: number
  chunks: number
}

export interface DownloadItem {
  id: string
  url: string
  finalFilePath: string
  stagingFilePath: string
  fileName: string
  fileSize: number
  downloadedBytes: number
  state: DownloadState
  rangeSupported: boolean
  etag?: string
  lastModified?: string
  contentType?: string
  createdAt: number
  updatedAt: number
  completedAt?: number
  totalDuration: number // seconds
  currentSpeed: number // bytes/s
  averageSpeed: number // bytes/s
  peakSpeed: number // bytes/s
  eta: number // seconds
  connectionMode: ConnectionMode
  selectedInterfaceIds: string[]
  chunkSize: number
  chunks: ChunkInfo[]
  networkContribution: Record<string, NetworkContribution>
  errorMessage?: string
  activeStreams: ActiveStreamInfo[]
  speedHistory: SpeedHistoryPoint[]
}

export interface ProbeResult {
  url: string
  finalUrl: string
  suggestedName: string
  fileSize: number
  rangeSupported: boolean
  etag?: string
  lastModified?: string
  contentType?: string
}

export interface DiskSpaceInfo {
  available: number
  total: number
  required: number
  sufficient: boolean
}

export interface AppSettings {
  defaultDownloadDir: string
  defaultConnectionMode: ConnectionMode
  chunkSize: number
  maxConnectionsPerInterface: number
  retryLimit: number
  stallTimeout: number
  notificationsEnabled: boolean
  theme: 'dark' | 'light'
  interfaceCustomizations: Record<
    string,
    {
      displayName?: string
      color?: string
      enabled?: boolean
    }
  >
}

export interface DiagnosticLogEntry {
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'debug'
  category: string
  message: string
  details?: Record<string, unknown>
}

export interface DiagnosticsInfo {
  appVersion: string
  electronVersion: string
  nodeVersion: string
  platform: string
  arch: string
  detectedInterfaces: NetworkInterfaceInfo[]
  activeDownloadsCount: number
  totalCompletedCount: number
  logs: DiagnosticLogEntry[]
}

export interface IPCChannels {
  // Probing & Validation
  PROBE_URL: 'fluxera:probe-url'
  CHECK_DISK_SPACE: 'fluxera:check-disk-space'
  SELECT_DESTINATION: 'fluxera:select-destination'
  SELECT_FOLDER: 'fluxera:select-folder'

  // Downloads Management
  START_DOWNLOAD: 'fluxera:start-download'
  PAUSE_DOWNLOAD: 'fluxera:pause-download'
  RESUME_DOWNLOAD: 'fluxera:resume-download'
  CANCEL_DOWNLOAD: 'fluxera:cancel-download'
  REMOVE_DOWNLOAD: 'fluxera:remove-download'
  GET_DOWNLOADS: 'fluxera:get-downloads'
  OPEN_FILE: 'fluxera:open-file'
  SHOW_IN_FOLDER: 'fluxera:show-in-folder'

  // Networks Management
  GET_INTERFACES: 'fluxera:get-interfaces'
  REFRESH_INTERFACES: 'fluxera:refresh-interfaces'
  UPDATE_INTERFACE: 'fluxera:update-interface'

  // Settings & System
  GET_SETTINGS: 'fluxera:get-settings'
  SAVE_SETTINGS: 'fluxera:save-settings'
  GET_DIAGNOSTICS: 'fluxera:get-diagnostics'
  CLEAR_LOGS: 'fluxera:clear-logs'

  // Events from Main to Renderer
  ON_DOWNLOAD_UPDATED: 'fluxera:on-download-updated'
  ON_DOWNLOAD_PROGRESS: 'fluxera:on-download-progress'
  ON_DOWNLOADS_LIST_UPDATED: 'fluxera:on-downloads-list-updated'
  ON_INTERFACES_UPDATED: 'fluxera:on-interfaces-updated'
  ON_NOTIFICATION: 'fluxera:on-notification'
  ON_LOG: 'fluxera:on-log'
}

export const IPC_CHANNELS: IPCChannels = {
  PROBE_URL: 'fluxera:probe-url',
  CHECK_DISK_SPACE: 'fluxera:check-disk-space',
  SELECT_DESTINATION: 'fluxera:select-destination',
  SELECT_FOLDER: 'fluxera:select-folder',

  START_DOWNLOAD: 'fluxera:start-download',
  PAUSE_DOWNLOAD: 'fluxera:pause-download',
  RESUME_DOWNLOAD: 'fluxera:resume-download',
  CANCEL_DOWNLOAD: 'fluxera:cancel-download',
  REMOVE_DOWNLOAD: 'fluxera:remove-download',
  GET_DOWNLOADS: 'fluxera:get-downloads',
  OPEN_FILE: 'fluxera:open-file',
  SHOW_IN_FOLDER: 'fluxera:show-in-folder',

  GET_INTERFACES: 'fluxera:get-interfaces',
  REFRESH_INTERFACES: 'fluxera:refresh-interfaces',
  UPDATE_INTERFACE: 'fluxera:update-interface',

  GET_SETTINGS: 'fluxera:get-settings',
  SAVE_SETTINGS: 'fluxera:save-settings',
  GET_DIAGNOSTICS: 'fluxera:get-diagnostics',
  CLEAR_LOGS: 'fluxera:clear-logs',

  ON_DOWNLOAD_UPDATED: 'fluxera:on-download-updated',
  ON_DOWNLOAD_PROGRESS: 'fluxera:on-download-progress',
  ON_DOWNLOADS_LIST_UPDATED: 'fluxera:on-downloads-list-updated',
  ON_INTERFACES_UPDATED: 'fluxera:on-interfaces-updated',
  ON_NOTIFICATION: 'fluxera:on-notification',
  ON_LOG: 'fluxera:on-log'
}
