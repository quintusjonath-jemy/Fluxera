import http from 'http'
import https from 'https'
import net from 'net'
import { URL } from 'url'
import { ChunkInfo } from '../../shared/types'
import { FileStorageManager } from '../storage/file-storage'

export interface WorkerOptions {
  workerId: string
  interfaceId: string
  interfaceName: string
  localAddress?: string
  url: string
  chunk: ChunkInfo
  stagingPath: string
  fileStorage: FileStorageManager
  isBackup?: boolean
  stallTimeoutMs?: number
  onProgress: (workerId: string, bytesReceived: number) => void
  onComplete: (workerId: string, chunk: ChunkInfo) => void
  onError: (workerId: string, chunk: ChunkInfo, error: Error, retryAfterSec?: number) => void
}

export class DownloadWorker {
  public readonly workerId: string
  public readonly interfaceId: string
  public readonly interfaceName: string
  public readonly chunk: ChunkInfo
  public readonly isBackup: boolean

  private url: string
  private localAddress?: string
  private stagingPath: string
  private fileStorage: FileStorageManager
  private stallTimeoutMs: number
  private onProgress: (workerId: string, bytesReceived: number) => void
  private onComplete: (workerId: string, chunk: ChunkInfo) => void
  private onError: (workerId: string, chunk: ChunkInfo, error: Error, retryAfterSec?: number) => void

  private req: http.ClientRequest | null = null
  private stallTimer: NodeJS.Timeout | null = null
  private aborted = false
  private startTime = 0
  private lastDataTime = 0
  private bytesThisSession = 0

  constructor(options: WorkerOptions) {
    this.workerId = options.workerId
    this.interfaceId = options.interfaceId
    this.interfaceName = options.interfaceName
    this.localAddress = options.localAddress
    this.url = options.url
    this.chunk = options.chunk
    this.stagingPath = options.stagingPath
    this.fileStorage = options.fileStorage
    this.isBackup = options.isBackup ?? false
    this.stallTimeoutMs = options.stallTimeoutMs ?? 20000
    this.onProgress = options.onProgress
    this.onComplete = options.onComplete
    this.onError = options.onError
  }

  public getBytesThisSession(): number {
    return this.bytesThisSession
  }

  public getElapsedTimeSec(): number {
    if (!this.startTime) return 0
    return (Date.now() - this.startTime) / 1000
  }

  public start(): void {
    this.startTime = Date.now()
    this.lastDataTime = Date.now()
    this.resetStallTimer()

    const parsedUrl = new URL(this.url)
    const isHttps = parsedUrl.protocol === 'https:'
    const client = isHttps ? https : http

    const startByte = this.chunk.startByte + this.chunk.downloadedBytes
    const endByte = this.chunk.endByte

    if (startByte > endByte) {
      this.clearStallTimer()
      this.chunk.state = 'COMPLETE'
      this.onComplete(this.workerId, this.chunk)
      return
    }

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Fluxera/1.0',
      Range: `bytes=${startByte}-${endByte}`,
      Accept: '*/*'
    }

    const reqOptions: http.RequestOptions = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers,
      timeout: 30000
    }

    // Bind to specific local interface address if available and not 0.0.0.0
    if (this.localAddress && this.localAddress !== '0.0.0.0') {
      reqOptions.localAddress = this.localAddress
      // Match the IP family to avoid bind EINVAL when resolving dual-stack hosts (IPv4 localAddress with IPv6 remote)
      if (net.isIPv4(this.localAddress)) {
        reqOptions.family = 4
      } else if (net.isIPv6(this.localAddress)) {
        reqOptions.family = 6
      }
    }

    try {
      this.req = client.request(reqOptions, (res) => {
        const statusCode = res.statusCode || 0

        // Handle Server Refusals & Rate Limits: 503, 429, 403
        if (statusCode === 503 || statusCode === 429 || statusCode === 403) {
          this.clearStallTimer()
          res.resume()

          let retryAfter: number | undefined
          if (res.headers['retry-after']) {
            const parsed = parseInt(res.headers['retry-after'] as string, 10)
            if (!isNaN(parsed) && parsed > 0) {
              retryAfter = parsed
            }
          }

          const err = new Error(`Server refused request with HTTP ${statusCode}`)
          this.onError(this.workerId, this.chunk, err, retryAfter)
          return
        }

        if (statusCode !== 200 && statusCode !== 206) {
          this.clearStallTimer()
          res.resume()
          const err = new Error(`Worker HTTP request failed with status ${statusCode}`)
          this.onError(this.workerId, this.chunk, err)
          return
        }

        let writeOffset = startByte

        res.on('data', async (chunkBuffer: Buffer) => {
          if (this.aborted) {
            res.destroy()
            return
          }

          this.lastDataTime = Date.now()
          this.resetStallTimer()

          const chunkSize = chunkBuffer.length
          const currentWriteOffset = writeOffset
          writeOffset += chunkSize
          this.bytesThisSession += chunkSize
          this.chunk.downloadedBytes += chunkSize

          try {
            // Write directly to staging file at byte offset
            await this.fileStorage.writeAtOffset(
              this.stagingPath,
              chunkBuffer,
              currentWriteOffset
            )
            this.onProgress(this.workerId, chunkSize)
          } catch (writeErr) {
            this.abort()
            this.onError(this.workerId, this.chunk, writeErr as Error)
          }
        })

        res.on('end', () => {
          this.clearStallTimer()
          if (!this.aborted) {
            this.chunk.state = 'COMPLETE'
            this.onComplete(this.workerId, this.chunk)
          }
        })

        res.on('error', (err) => {
          this.clearStallTimer()
          if (!this.aborted) {
            this.onError(this.workerId, this.chunk, err)
          }
        })
      })

      this.req.on('timeout', () => {
        this.clearStallTimer()
        if (this.req) {
          this.req.destroy(new Error('Connection timed out'))
        }
      })

      this.req.on('error', (err) => {
        this.clearStallTimer()
        if (!this.aborted) {
          if (err.message.includes('bind') && this.localAddress) {
            console.warn(
              `[DownloadWorker] Interface bind issue on ${this.localAddress}, disabling local binding for retry:`,
              err.message
            )
            this.localAddress = undefined
          }
          this.onError(this.workerId, this.chunk, err)
        }
      })

      this.req.end()
    } catch (err) {
      this.clearStallTimer()
      this.onError(this.workerId, this.chunk, err as Error)
    }
  }

  public abort(): void {
    this.aborted = true
    this.clearStallTimer()
    if (this.req) {
      try {
        this.req.destroy()
      } catch {
        // Ignore
      }
      this.req = null
    }
  }

  private resetStallTimer(): void {
    this.clearStallTimer()
    this.stallTimer = setTimeout(() => {
      const elapsed = Date.now() - this.lastDataTime
      if (elapsed >= this.stallTimeoutMs && !this.aborted) {
        console.warn(`[DownloadWorker] Worker ${this.workerId} stalled (no data for ${Math.round(elapsed / 1000)}s)`)
        this.abort()
        this.onError(
          this.workerId,
          this.chunk,
          new Error(`Connection stalled (no data for ${Math.round(elapsed / 1000)}s)`)
        )
      }
    }, this.stallTimeoutMs)
  }

  private clearStallTimer(): void {
    if (this.stallTimer) {
      clearTimeout(this.stallTimer)
      this.stallTimer = null
    }
  }
}
