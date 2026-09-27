import fs from 'fs'
import path from 'path'
import { EventEmitter } from 'events'
import { app, powerSaveBlocker } from 'electron'
import {
  DownloadItem,
  DownloadState,
  ChunkInfo,
  ConnectionMode,
  ActiveStreamInfo,
  SpeedHistoryPoint,
  NetworkContribution
} from '../../shared/types'
import { probeUrl } from './url-prober'
import { FileStorageManager } from '../storage/file-storage'
import { InterfaceManager } from '../network/interface-manager'
import { ManifestManager } from './manifest-manager'
import { DownloadWorker } from './download-worker'

const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024 // 8 MB
const MIN_CHUNK_SIZE = 1 * 1024 * 1024 // 1 MB

export interface DownloadStartOptions {
  url: string
  destinationDir?: string
  customFileName?: string
  selectedInterfaceIds?: string[]
  connectionMode?: ConnectionMode
  chunkSize?: number
}

interface ActiveDownloadSession {
  item: DownloadItem
  fileStorage: FileStorageManager
  pendingQueue: number[] // chunk indices
  activeWorkers: Map<string, DownloadWorker>
  backupWorkers: Map<number, DownloadWorker> // chunkId -> backup worker
  concurrencyPerInterface: Map<string, number>
  refusalCooldowns: Map<string, number> // ifaceId -> timestamp when cooldown ends
  intervalTimer: NodeJS.Timeout | null
  speedWindowBytes: number
  speedWindowInterfaceBytes: Map<string, number>
  lastTickTime: number
  rollingSpeeds: number[]
}

export class DownloadEngine extends EventEmitter {
  private downloads: Map<string, DownloadItem> = new Map()
  private sessions: Map<string, ActiveDownloadSession> = new Map()
  private interfaceManager: InterfaceManager
  private manifestManager: ManifestManager
  private fileStorage: FileStorageManager
  private powerSaveBlockerId: number | null = null

  constructor(interfaceManager: InterfaceManager, manifestManager?: ManifestManager) {
    super()
    this.interfaceManager = interfaceManager
    this.manifestManager = manifestManager || new ManifestManager()
    this.fileStorage = new FileStorageManager()
  }

  public async initialize(): Promise<void> {
    const recovered = await this.manifestManager.loadAllManifests()
    for (const item of recovered) {
      this.downloads.set(item.id, item)
    }
  }

  public getDownloads(): DownloadItem[] {
    return Array.from(this.downloads.values())
  }

  public getDownload(id: string): DownloadItem | undefined {
    return this.downloads.get(id)
  }

  public async startDownload(options: DownloadStartOptions): Promise<DownloadItem> {
    const downloadId = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    // 1. Probe the remote resource
    const probe = await probeUrl(options.url)

    // 2. Determine destination paths
    let defaultDir: string
    try {
      defaultDir = app.getPath('downloads')
    } catch {
      defaultDir = path.join(process.cwd(), 'downloads')
    }

    const destDir = options.destinationDir || defaultDir
    const fileName = options.customFileName || probe.suggestedName || `download_${Date.now()}`
    const finalFilePath = path.join(destDir, fileName)
    const stagingFilePath = `${finalFilePath}.plexo`

    // 3. Disk space check
    if (probe.fileSize > 0) {
      const spaceInfo = await this.fileStorage.checkDiskSpace(destDir, probe.fileSize)
      if (!spaceInfo.sufficient) {
        const reqGb = (spaceInfo.required / (1024 * 1024 * 1024)).toFixed(1)
        const availGb = (spaceInfo.available / (1024 * 1024 * 1024)).toFixed(1)
        throw new Error(
          `Not enough disk space. Required: ${reqGb} GB, Available: ${availGb} GB. Choose another destination.`
        )
      }
    }

    // 4. Determine usable interfaces
    const detectedUsable = this.interfaceManager.getUsableInterfaces()
    let selectedInterfaceIds = options.selectedInterfaceIds
    if (!selectedInterfaceIds || selectedInterfaceIds.length === 0) {
      selectedInterfaceIds = detectedUsable.map((i) => i.id)
    }

    // Fallback: If no interface was marked usable (e.g. offline dev or single interface), pick detected or fallback
    if (selectedInterfaceIds.length === 0) {
      const all = this.interfaceManager.getInterfaces()
      if (all.length > 0) {
        selectedInterfaceIds = [all[0].id]
      } else {
        selectedInterfaceIds = ['default-interface']
      }
    }

    // 5. Partition chunks
    const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE
    const chunks: ChunkInfo[] = []

    if (probe.rangeSupported && probe.fileSize > 0) {
      let offset = 0
      let chunkId = 0
      while (offset < probe.fileSize) {
        const endByte = Math.min(offset + chunkSize - 1, probe.fileSize - 1)
        chunks.push({
          id: chunkId++,
          downloadId,
          startByte: offset,
          endByte,
          totalBytes: endByte - offset + 1,
          downloadedBytes: 0,
          retryCount: 0,
          state: 'PENDING'
        })
        offset = endByte + 1
      }
    } else {
      // Non-ranged single chunk fallback
      chunks.push({
        id: 0,
        downloadId,
        startByte: 0,
        endByte: probe.fileSize > 0 ? probe.fileSize - 1 : 0,
        totalBytes: probe.fileSize > 0 ? probe.fileSize : 0,
        downloadedBytes: 0,
        retryCount: 0,
        state: 'PENDING'
      })
    }

    // 6. Setup network contribution initial state
    const networkContribution: Record<string, NetworkContribution> = {}
    for (const ifaceId of selectedInterfaceIds) {
      networkContribution[ifaceId] = {
        bytes: 0,
        percentage: 0,
        speed: 0,
        chunks: 0
      }
    }

    const item: DownloadItem = {
      id: downloadId,
      url: options.url,
      finalFilePath,
      stagingFilePath,
      fileName,
      fileSize: probe.fileSize,
      downloadedBytes: 0,
      state: 'DOWNLOADING',
      rangeSupported: probe.rangeSupported,
      etag: probe.etag,
      lastModified: probe.lastModified,
      contentType: probe.contentType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalDuration: 0,
      currentSpeed: 0,
      averageSpeed: 0,
      peakSpeed: 0,
      eta: 0,
      connectionMode: options.connectionMode || 'Auto',
      selectedInterfaceIds,
      chunkSize,
      chunks,
      networkContribution,
      activeStreams: [],
      speedHistory: []
    }

    this.downloads.set(downloadId, item)
    await this.manifestManager.saveManifest(item)
    this.emit('download-updated', item)
    this.emit('downloads-list-updated', this.getDownloads())

    // 7. Prepare staging file
    await this.fileStorage.prepareStagingFile(stagingFilePath, probe.fileSize)

    // 8. Start active download session
    this.spawnSession(item)

    return item
  }

  public async pauseDownload(id: string): Promise<void> {
    const session = this.sessions.get(id)
    const item = this.downloads.get(id)
    if (!item) return

    if (session) {
      this.teardownSession(session, 'PAUSED')
    } else {
      item.state = 'PAUSED'
    }

    item.updatedAt = Date.now()
    await this.manifestManager.saveManifest(item)
    this.updatePowerSaveBlocker()
    this.emit('download-updated', item)
  }

  public async resumeDownload(id: string): Promise<void> {
    const item = this.downloads.get(id)
    if (!item) return

    item.state = 'RESUMING'
    this.emit('download-updated', item)

    // Safe Resume Validation: Re-probe remote file to verify identity
    try {
      const probe = await probeUrl(item.url)

      const etagMatches = !item.etag || !probe.etag || item.etag === probe.etag
      const lastModMatches =
        !item.lastModified || !probe.lastModified || item.lastModified === probe.lastModified

      if (!etagMatches || !lastModMatches) {
        item.state = 'FAILED'
        item.errorMessage =
          'Resume unavailable: The remote file appears to have changed since this download started. Starting again is required to avoid file corruption.'
        await this.manifestManager.saveManifest(item)
        this.emit('download-updated', item)
        return
      }

      // Prepare staging file
      await this.fileStorage.prepareStagingFile(item.stagingFilePath, item.fileSize)

      item.state = 'DOWNLOADING'
      this.spawnSession(item)
      this.emit('download-updated', item)
    } catch (err) {
      item.state = 'FAILED'
      item.errorMessage = `Failed to resume: ${(err as Error).message}`
      await this.manifestManager.saveManifest(item)
      this.emit('download-updated', item)
    }
  }

  public async cancelDownload(id: string): Promise<void> {
    const session = this.sessions.get(id)
    const item = this.downloads.get(id)
    if (!item) return

    if (session) {
      this.teardownSession(session, 'CANCELLED')
    } else {
      item.state = 'CANCELLED'
    }

    item.updatedAt = Date.now()
    await this.manifestManager.saveManifest(item)
    this.updatePowerSaveBlocker()
    this.emit('download-updated', item)
  }

  public async removeDownload(id: string, deleteFiles = false): Promise<void> {
    const session = this.sessions.get(id)
    if (session) {
      this.teardownSession(session, 'CANCELLED')
    }

    const item = this.downloads.get(id)
    if (item && deleteFiles) {
      try {
        if (fs.existsSync(item.stagingFilePath)) {
          await fs.promises.unlink(item.stagingFilePath)
        }
        if (fs.existsSync(item.finalFilePath)) {
          await fs.promises.unlink(item.finalFilePath)
        }
      } catch (err) {
        console.warn(`[DownloadEngine] Error deleting files for ${id}:`, err)
      }
    }

    this.downloads.delete(id)
    await this.manifestManager.deleteManifest(id)
    this.updatePowerSaveBlocker()
    this.emit('downloads-list-updated', this.getDownloads())
  }

  private spawnSession(item: DownloadItem): void {
    const pendingQueue: number[] = []
    item.chunks.forEach((chunk) => {
      if (chunk.state !== 'COMPLETE') {
        chunk.state = 'PENDING'
        pendingQueue.push(chunk.id)
      }
    })

    const initialWorkersPerIface = this.getInitialWorkerCount(item.connectionMode)
    const concurrencyMap = new Map<string, number>()
    for (const ifaceId of item.selectedInterfaceIds) {
      concurrencyMap.set(ifaceId, initialWorkersPerIface)
    }

    const session: ActiveDownloadSession = {
      item,
      fileStorage: this.fileStorage,
      pendingQueue,
      activeWorkers: new Map(),
      backupWorkers: new Map(),
      concurrencyPerInterface: concurrencyMap,
      refusalCooldowns: new Map(),
      intervalTimer: null,
      speedWindowBytes: 0,
      speedWindowInterfaceBytes: new Map(),
      lastTickTime: Date.now(),
      rollingSpeeds: []
    }

    this.sessions.set(item.id, session)
    this.updatePowerSaveBlocker()

    // Start work distribution
    this.distributeWork(session)

    // Start rolling telemetry timer (every 250ms)
    session.intervalTimer = setInterval(() => {
      this.tickTelemetry(session)
    }, 250)
  }

  private getInitialWorkerCount(mode: ConnectionMode): number {
    switch (mode) {
      case '4':
        return 4
      case '8':
        return 8
      case '16':
        return 16
      case '32':
        return 32
      case 'Auto':
      default:
        return 8
    }
  }

  private distributeWork(session: ActiveDownloadSession): void {
    const { item, pendingQueue, activeWorkers, concurrencyPerInterface, refusalCooldowns } = session
    const now = Date.now()

    if (item.state !== 'DOWNLOADING') return

    // Count active workers per interface
    const currentCounts = new Map<string, number>()
    for (const worker of activeWorkers.values()) {
      currentCounts.set(worker.interfaceId, (currentCounts.get(worker.interfaceId) || 0) + 1)
    }

    // 1. Fill open worker slots from pending queue (Dynamic Work-Stealing)
    for (const ifaceId of item.selectedInterfaceIds) {
      const cooldownUntil = refusalCooldowns.get(ifaceId) || 0
      if (now < cooldownUntil) {
        continue // Honor server refusal cooldown
      }

      const iface = this.interfaceManager.getInterface(ifaceId)
      const maxWorkers = concurrencyPerInterface.get(ifaceId) || 8
      let activeCount = currentCounts.get(ifaceId) || 0

      while (activeCount < maxWorkers && pendingQueue.length > 0) {
        const chunkId = pendingQueue.shift()!
        const chunk = item.chunks[chunkId]
        if (!chunk || chunk.state === 'COMPLETE') continue

        chunk.state = 'DOWNLOADING'
        chunk.assignedInterfaceId = ifaceId

        const workerId = `w_${ifaceId}_${chunkId}_${Math.random().toString(36).substring(2, 6)}`
        chunk.assignedWorker = workerId

        const worker = new DownloadWorker({
          workerId,
          interfaceId: ifaceId,
          interfaceName: iface?.displayName || ifaceId,
          localAddress: iface?.ipv4,
          url: item.url,
          chunk,
          stagingPath: item.stagingFilePath,
          fileStorage: session.fileStorage,
          isBackup: false,
          onProgress: (_wId, bytesReceived) => {
            session.speedWindowBytes += bytesReceived
            const current = session.speedWindowInterfaceBytes.get(ifaceId) || 0
            session.speedWindowInterfaceBytes.set(ifaceId, current + bytesReceived)
            item.downloadedBytes += bytesReceived

            const contrib = item.networkContribution[ifaceId]
            if (contrib) {
              contrib.bytes += bytesReceived
            }
          },
          onComplete: (wId, finishedChunk) => {
            this.handleWorkerComplete(session, wId, finishedChunk, ifaceId)
          },
          onError: (wId, failedChunk, error, retryAfterSec) => {
            this.handleWorkerError(session, wId, failedChunk, ifaceId, error, retryAfterSec)
          }
        })

        activeWorkers.set(workerId, worker)
        activeCount++
        currentCounts.set(ifaceId, activeCount)
        worker.start()
      }
    }

    // 2. Tail Racing Strategy:
    // Once no pending chunk remains, if any active chunk is running slowly and another interface is idle, start a BACKUP duplicate
    if (pendingQueue.length === 0 && activeWorkers.size > 0) {
      this.evaluateTailRacing(session)
    }

    // 3. Check for overall download completion
    this.checkCompletion(session)
  }

  private evaluateTailRacing(session: ActiveDownloadSession): void {
    const { item, activeWorkers, backupWorkers } = session

    for (const [workerId, worker] of activeWorkers.entries()) {
      if (worker.isBackup) continue
      const chunk = worker.chunk

      // If chunk is not finished, has taken > 5s, and has no active backup yet
      if (
        chunk.state === 'DOWNLOADING' &&
        worker.getElapsedTimeSec() > 5 &&
        !backupWorkers.has(chunk.id)
      ) {
        // Find an interface different from the worker's interface
        const altIfaceId = item.selectedInterfaceIds.find((id) => id !== worker.interfaceId)
        if (altIfaceId) {
          const altIface = this.interfaceManager.getInterface(altIfaceId)
          const backupWorkerId = `backup_${altIfaceId}_${chunk.id}`

          const backupWorker = new DownloadWorker({
            workerId: backupWorkerId,
            interfaceId: altIfaceId,
            interfaceName: altIface?.displayName || altIfaceId,
            localAddress: altIface?.ipv4,
            url: item.url,
            chunk,
            stagingPath: item.stagingFilePath,
            fileStorage: session.fileStorage,
            isBackup: true,
            onProgress: (_wId, bytesReceived) => {
              session.speedWindowBytes += bytesReceived
              item.downloadedBytes += bytesReceived
            },
            onComplete: (wId, finishedChunk) => {
              this.handleWorkerComplete(session, wId, finishedChunk, altIfaceId)
            },
            onError: (wId, failedChunk, err) => {
              session.backupWorkers.delete(chunk.id)
              session.activeWorkers.delete(wId)
            }
          })

          chunk.isBackup = true
          session.backupWorkers.set(chunk.id, backupWorker)
          session.activeWorkers.set(backupWorkerId, backupWorker)
          backupWorker.start()
        }
      }
    }
  }

  private handleWorkerComplete(
    session: ActiveDownloadSession,
    workerId: string,
    chunk: ChunkInfo,
    ifaceId: string
  ): void {
    const { activeWorkers, backupWorkers, item, concurrencyPerInterface } = session
    activeWorkers.delete(workerId)

    // If there was a backup racing this chunk, abort and clean it up
    const backup = backupWorkers.get(chunk.id)
    if (backup) {
      backup.abort()
      activeWorkers.delete(backup.workerId)
      backupWorkers.delete(chunk.id)
    }

    chunk.state = 'COMPLETE'
    this.interfaceManager.incrementChunkCount(ifaceId)

    const contrib = item.networkContribution[ifaceId]
    if (contrib) {
      contrib.chunks++
    }

    // Dynamic concurrency ramp-up: if in Auto mode and healthy, increment concurrency up to 32
    if (item.connectionMode === 'Auto') {
      const currentMax = concurrencyPerInterface.get(ifaceId) || 8
      if (currentMax < 32 && Math.random() < 0.25) {
        concurrencyPerInterface.set(ifaceId, currentMax + 1)
      }
    }

    // Schedule next available chunks
    this.distributeWork(session)
  }

  private handleWorkerError(
    session: ActiveDownloadSession,
    workerId: string,
    chunk: ChunkInfo,
    ifaceId: string,
    error: Error,
    retryAfterSec?: number
  ): void {
    const { activeWorkers, pendingQueue, refusalCooldowns, concurrencyPerInterface, item } = session
    activeWorkers.delete(workerId)

    console.warn(`[DownloadEngine] Worker error on interface ${ifaceId} for chunk #${chunk.id}:`, error.message)

    // Handle server refusal cooldown
    if (retryAfterSec) {
      refusalCooldowns.set(ifaceId, Date.now() + retryAfterSec * 1000)
    } else if (error.message.includes('refused')) {
      // 60-second cooldown for server refusal
      refusalCooldowns.set(ifaceId, Date.now() + 60000)
      // Decrease concurrency for this interface
      const current = concurrencyPerInterface.get(ifaceId) || 8
      concurrencyPerInterface.set(ifaceId, Math.max(2, Math.floor(current / 2)))
    }

    // Retry chunk with jittered exponential backoff
    chunk.retryCount++
    if (chunk.retryCount <= 5) {
      chunk.state = 'RETRYING'
      const backoffMs = Math.min(
        15000,
        Math.floor(1000 * Math.pow(1.5, chunk.retryCount) + Math.random() * 500)
      )

      setTimeout(() => {
        if (item.state === 'DOWNLOADING') {
          chunk.state = 'PENDING'
          pendingQueue.unshift(chunk.id)
          this.distributeWork(session)
        }
      }, backoffMs)
    } else {
      chunk.state = 'FAILED'
      item.state = 'FAILED'
      item.errorMessage = `Chunk #${chunk.id} failed after 5 retry attempts: ${error.message}`
      this.teardownSession(session, 'FAILED')
      this.manifestManager.saveManifest(item)
      this.emit('download-updated', item)
    }
  }

  private async checkCompletion(session: ActiveDownloadSession): Promise<void> {
    const { item, pendingQueue, activeWorkers } = session

    if (item.state !== 'DOWNLOADING') return

    const allChunksComplete = item.chunks.every((c) => c.state === 'COMPLETE')

    if (allChunksComplete && pendingQueue.length === 0 && activeWorkers.size === 0) {
      item.state = 'VERIFYING'
      this.emit('download-updated', item)

      try {
        // Safe finalization: flush, close handle, resolve conflict, rename .plexo
        const finalPath = await this.fileStorage.finalizeFile(
          item.stagingFilePath,
          item.finalFilePath
        )
        item.finalFilePath = finalPath
        item.state = 'COMPLETED'
        item.completedAt = Date.now()
        item.currentSpeed = 0
        item.eta = 0

        this.teardownSession(session, 'COMPLETED')
        await this.manifestManager.saveManifest(item)
        this.emit('download-updated', item)
        this.emit('download-completed', item)
      } catch (err) {
        item.state = 'FAILED'
        item.errorMessage = `Finalization error: ${(err as Error).message}`
        this.teardownSession(session, 'FAILED')
        await this.manifestManager.saveManifest(item)
        this.emit('download-updated', item)
      }
    }
  }

  private tickTelemetry(session: ActiveDownloadSession): void {
    const { item, activeWorkers } = session
    const now = Date.now()
    const elapsedSec = (now - session.lastTickTime) / 1000

    if (elapsedSec <= 0) return

    // Calculate current instantaneous speed
    const currentSpeed = session.speedWindowBytes / elapsedSec
    session.speedWindowBytes = 0

    // Rolling window speed average (last ~3 seconds)
    session.rollingSpeeds.push(currentSpeed)
    if (session.rollingSpeeds.length > 12) {
      session.rollingSpeeds.shift()
    }
    const rollingAvgSpeed =
      session.rollingSpeeds.reduce((a, b) => a + b, 0) / session.rollingSpeeds.length

    item.currentSpeed = Math.round(currentSpeed)
    item.averageSpeed = Math.round(rollingAvgSpeed)
    if (item.currentSpeed > item.peakSpeed) {
      item.peakSpeed = item.currentSpeed
    }

    item.totalDuration += elapsedSec

    // Calculate rolling ETA
    const remainingBytes = Math.max(0, item.fileSize - item.downloadedBytes)
    if (rollingAvgSpeed > 0 && remainingBytes > 0) {
      item.eta = Math.round(remainingBytes / rollingAvgSpeed)
    } else {
      item.eta = 0
    }

    // Per-interface telemetry & contribution
    const perInterfaceSpeed: Record<string, number> = {}
    for (const ifaceId of item.selectedInterfaceIds) {
      const bytes = session.speedWindowInterfaceBytes.get(ifaceId) || 0
      session.speedWindowInterfaceBytes.set(ifaceId, 0)
      const ifaceSpeed = Math.round(bytes / elapsedSec)
      perInterfaceSpeed[ifaceId] = ifaceSpeed

      const contrib = item.networkContribution[ifaceId]
      if (contrib) {
        contrib.speed = ifaceSpeed
        contrib.percentage =
          item.downloadedBytes > 0
            ? Math.round((contrib.bytes / item.downloadedBytes) * 100)
            : 0
      }

      const activeWorkersCount = Array.from(activeWorkers.values()).filter(
        (w) => w.interfaceId === ifaceId
      ).length
      this.interfaceManager.recordTelemetry(ifaceId, ifaceSpeed, bytes, activeWorkersCount)
    }

    // Speed history for chart (cap at 60 points)
    const historyPoint: SpeedHistoryPoint = {
      timestamp: now,
      totalSpeed: item.currentSpeed,
      perInterface: perInterfaceSpeed
    }
    item.speedHistory.push(historyPoint)
    if (item.speedHistory.length > 60) {
      item.speedHistory.shift()
    }

    // Active streams snapshot
    const activeStreams: ActiveStreamInfo[] = []
    for (const worker of activeWorkers.values()) {
      const chunk = worker.chunk
      const startMb = (chunk.startByte / (1024 * 1024)).toFixed(1)
      const endMb = (chunk.endByte / (1024 * 1024)).toFixed(1)

      activeStreams.push({
        streamId: worker.workerId,
        interfaceId: worker.interfaceId,
        interfaceName: worker.interfaceName,
        chunkId: chunk.id,
        status: worker.isBackup ? 'BACKUP' : 'RECEIVING',
        speed: Math.round(worker.getBytesThisSession() / Math.max(1, worker.getElapsedTimeSec())),
        downloaded: chunk.downloadedBytes,
        range: `${startMb}–${endMb} MB`,
        duration: Math.round(worker.getElapsedTimeSec()),
        isBackup: worker.isBackup
      })
    }
    item.activeStreams = activeStreams
    session.lastTickTime = now

    // Emit live telemetry progress
    this.emit('download-progress', item)
  }

  private teardownSession(session: ActiveDownloadSession, targetState: DownloadState): void {
    if (session.intervalTimer) {
      clearInterval(session.intervalTimer)
      session.intervalTimer = null
    }

    // Abort all active workers
    for (const worker of session.activeWorkers.values()) {
      worker.abort()
    }
    session.activeWorkers.clear()
    session.backupWorkers.clear()

    session.item.state = targetState
    session.item.currentSpeed = 0
    session.item.activeStreams = []

    this.sessions.delete(session.item.id)
    this.updatePowerSaveBlocker()
  }

  private updatePowerSaveBlocker(): void {
    const hasActiveDownload = Array.from(this.downloads.values()).some(
      (d) => d.state === 'DOWNLOADING' || d.state === 'RESUMING'
    )

    if (hasActiveDownload && this.powerSaveBlockerId === null) {
      try {
        this.powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension')
      } catch (err) {
        console.warn('[DownloadEngine] Failed to start powerSaveBlocker:', err)
      }
    } else if (!hasActiveDownload && this.powerSaveBlockerId !== null) {
      try {
        powerSaveBlocker.stop(this.powerSaveBlockerId)
      } catch {
        // Ignore
      }
      this.powerSaveBlockerId = null
    }
  }
}
