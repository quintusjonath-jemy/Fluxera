import os from 'os'
import http from 'http'
import https from 'https'
import { EventEmitter } from 'events'
import { NetworkInterfaceInfo, NetworkState, InterfaceType } from '../../shared/types'
import { detectPhysicalAdapters, inferInterfaceType } from './platform-detector'

const DEFAULT_COLORS = [
  '#27C7A5', // teal / brand
  '#3B82F6', // blue
  '#F97316', // orange
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#10B981', // emerald
  '#EAB308', // amber
  '#06B6D4'  // cyan
]

export class InterfaceManager extends EventEmitter {
  private interfaces: Map<string, NetworkInterfaceInfo> = new Map()
  private customizations: Record<
    string,
    { displayName?: string; color?: string; enabled?: boolean }
  > = {}
  private pollIntervalTimer: NodeJS.Timeout | null = null
  private isCheckingReachability = false

  constructor() {
    super()
  }

  public setCustomizations(
    customizations: Record<
      string,
      { displayName?: string; color?: string; enabled?: boolean }
    >
  ): void {
    this.customizations = customizations
    for (const [id, custom] of Object.entries(customizations)) {
      const iface = this.interfaces.get(id)
      if (iface) {
        if (custom.displayName) iface.displayName = custom.displayName
        if (custom.color) iface.color = custom.color
        if (custom.enabled !== undefined) iface.enabled = custom.enabled
      }
    }
  }

  public async start(): Promise<void> {
    await this.refresh()
    // Poll for network changes every 8 seconds
    this.pollIntervalTimer = setInterval(() => {
      this.refresh(false).catch((err) =>
        console.error('[InterfaceManager] Poll refresh error:', err)
      )
    }, 8000)
  }

  public stop(): void {
    if (this.pollIntervalTimer) {
      clearInterval(this.pollIntervalTimer)
      this.pollIntervalTimer = null
    }
  }

  public getInterfaces(): NetworkInterfaceInfo[] {
    return Array.from(this.interfaces.values())
  }

  public getInterface(id: string): NetworkInterfaceInfo | undefined {
    return this.interfaces.get(id)
  }

  public getUsableInterfaces(): NetworkInterfaceInfo[] {
    return Array.from(this.interfaces.values()).filter(
      (iface) => iface.enabled && (iface.status === 'CONNECTED' || iface.status === 'AVAILABLE')
    )
  }

  public updateInterfaceCustomization(
    id: string,
    update: { displayName?: string; color?: string; enabled?: boolean }
  ): NetworkInterfaceInfo | undefined {
    const iface = this.interfaces.get(id)
    if (!iface) return undefined

    if (update.displayName !== undefined) iface.displayName = update.displayName
    if (update.color !== undefined) iface.color = update.color
    if (update.enabled !== undefined) iface.enabled = update.enabled

    this.customizations[id] = {
      displayName: iface.displayName,
      color: iface.color,
      enabled: iface.enabled
    }

    this.emit('updated', this.getInterfaces())
    return iface
  }

  public async refresh(forceEmit = true): Promise<NetworkInterfaceInfo[]> {
    const osInterfaces = os.networkInterfaces()
    const physicalAdapters = await detectPhysicalAdapters()

    const detectedMap = new Map<string, NetworkInterfaceInfo>()
    let colorIndex = 0

    for (const [ifaceName, addresses] of Object.entries(osInterfaces)) {
      if (!addresses || ifaceName === 'lo' || ifaceName.includes('loopback')) {
        continue
      }

      // Filter for IPv4 non-internal addresses first
      const ipv4Info = addresses.find((addr) => addr.family === 'IPv4' && !addr.internal)
      const ipv6Info = addresses.find((addr) => addr.family === 'IPv6' && !addr.internal)

      if (!ipv4Info) {
        // Without an IPv4 routable address on this adapter, socket binding is not usable
        continue
      }

      const id = `${ifaceName}-${ipv4Info.address}`
      const physical = physicalAdapters.get(ifaceName)
      const inferred = inferInterfaceType(ifaceName)

      const type: InterfaceType = physical?.type || inferred.type
      const originalName = physical?.friendlyName || ifaceName
      const defaultColor = DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length]
      colorIndex++

      const existing = this.interfaces.get(id)
      const custom = this.customizations[id] || this.customizations[ifaceName]

      const displayName = custom?.displayName || (existing?.displayName ?? (physical?.friendlyName || inferred.friendlyName))
      const color = custom?.color || (existing?.color ?? defaultColor)
      const enabled = custom?.enabled !== undefined ? custom.enabled : (existing?.enabled ?? true)

      const info: NetworkInterfaceInfo = {
        id,
        name: ifaceName,
        originalName,
        displayName,
        type,
        ipv4: ipv4Info.address,
        ipv6: ipv6Info?.address,
        mac: ipv4Info.mac || physical?.mac,
        status: existing?.status || 'AVAILABLE',
        color,
        enabled,
        speed: existing?.speed || 0,
        bytesTransferred: existing?.bytesTransferred || 0,
        activeWorkers: existing?.activeWorkers || 0,
        latency: existing?.latency || 0,
        chunkCount: existing?.chunkCount || 0
      }

      detectedMap.set(id, info)
    }

    // Detect removed interfaces
    let hasChanged = detectedMap.size !== this.interfaces.size
    if (!hasChanged) {
      for (const [id, item] of detectedMap.entries()) {
        const current = this.interfaces.get(id)
        if (!current || current.ipv4 !== item.ipv4 || current.status !== item.status) {
          hasChanged = true
          break
        }
      }
    }

    this.interfaces = detectedMap

    // Perform background reachability/latency probe for all detected interfaces
    this.checkAllReachabilities().catch((err) =>
      console.warn('[InterfaceManager] Reachability check warning:', err)
    )

    if (hasChanged || forceEmit) {
      this.emit('updated', this.getInterfaces())
    }

    return this.getInterfaces()
  }

  private async checkAllReachabilities(): Promise<void> {
    if (this.isCheckingReachability) return
    this.isCheckingReachability = true

    try {
      const probePromises = Array.from(this.interfaces.values()).map(async (iface) => {
        try {
          const latency = await this.measureInterfaceLatency(iface.ipv4)
          iface.latency = latency
          iface.status = latency > 0 ? 'CONNECTED' : 'UNAVAILABLE'
        } catch {
          iface.latency = 0
          iface.status = 'UNAVAILABLE'
        }
      })

      await Promise.all(probePromises)
      this.emit('updated', this.getInterfaces())
    } finally {
      this.isCheckingReachability = false
    }
  }

  /**
   * Measure latency and verify internet connectivity through a specific bound local IP address
   */
  private measureInterfaceLatency(localAddress: string): Promise<number> {
    return new Promise((resolve) => {
      const startTime = Date.now()
      const req = http.request(
        {
          hostname: '1.1.1.1',
          port: 80,
          path: '/',
          method: 'HEAD',
          localAddress,
          family: 4,
          timeout: 2500
        },
        (res) => {
          res.resume()
          const latency = Date.now() - startTime
          resolve(latency)
        }
      )

      req.on('error', () => {
        // Fallback to secondary reliable DNS probe
        const req2 = http.request(
          {
            hostname: '8.8.8.8',
            port: 80,
            path: '/',
            method: 'HEAD',
            localAddress,
            family: 4,
            timeout: 2500
          },
          (res2) => {
            res2.resume()
            resolve(Date.now() - startTime)
          }
        )

        req2.on('error', () => resolve(0))
        req2.on('timeout', () => {
          req2.destroy()
          resolve(0)
        })
        req2.end()
      })

      req.on('timeout', () => {
        req.destroy()
        resolve(0)
      })

      req.end()
    })
  }

  public recordTelemetry(
    interfaceId: string,
    speed: number,
    bytesDelta: number,
    activeWorkers: number
  ): void {
    const iface = this.interfaces.get(interfaceId)
    if (iface) {
      iface.speed = speed
      iface.bytesTransferred += bytesDelta
      iface.activeWorkers = activeWorkers
    }
  }

  public incrementChunkCount(interfaceId: string): void {
    const iface = this.interfaces.get(interfaceId)
    if (iface) {
      iface.chunkCount++
    }
  }
}
