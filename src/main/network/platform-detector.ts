import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import { NetworkInterfaceInfo, InterfaceType } from '../../shared/types'

const execAsync = promisify(exec)

export interface RawAdapterInfo {
  name: string
  friendlyName?: string
  type: InterfaceType
  mac?: string
  status: 'up' | 'down' | 'unknown'
}

/**
 * Platform-specific network interface discovery:
 * - Windows: PowerShell Get-NetAdapter
 * - macOS: networksetup -listallhardwareports
 * - Linux: /sys/class/net and ip route / ip link / /proc/net/dev
 */
export async function detectPhysicalAdapters(): Promise<Map<string, RawAdapterInfo>> {
  const platform = os.platform()
  const adapterMap = new Map<string, RawAdapterInfo>()

  try {
    if (platform === 'win32') {
      await detectWindowsAdapters(adapterMap)
    } else if (platform === 'darwin') {
      await detectMacAdapters(adapterMap)
    } else if (platform === 'linux') {
      await detectLinuxAdapters(adapterMap)
    }
  } catch (err) {
    console.warn('[PlatformDetector] Failed to detect physical adapters via OS tools:', err)
  }

  return adapterMap
}

async function detectWindowsAdapters(adapterMap: Map<string, RawAdapterInfo>): Promise<void> {
  const psCmd = `powershell -NoProfile -Command "Get-NetAdapter | Select-Object Name, InterfaceDescription, InterfaceType, MacAddress, Status | ConvertTo-Json"`
  const { stdout } = await execAsync(psCmd, { timeout: 4000 })
  if (!stdout.trim()) return

  const data = JSON.parse(stdout)
  const items = Array.isArray(data) ? data : [data]

  for (const item of items) {
    const rawName = item.Name || item.InterfaceDescription || ''
    const desc = (item.InterfaceDescription || '').toLowerCase()
    let type: InterfaceType = 'other'

    if (desc.includes('wi-fi') || desc.includes('wireless') || desc.includes('802.11')) {
      type = 'wifi'
    } else if (desc.includes('ethernet') || desc.includes('gigabit') || desc.includes('lan')) {
      type = 'ethernet'
    } else if (desc.includes('rndis') || desc.includes('usb') || desc.includes('tether')) {
      type = 'usb'
    } else if (desc.includes('cellular') || desc.includes('wwan') || desc.includes('mobile')) {
      type = 'cellular'
    }

    adapterMap.set(item.Name, {
      name: item.Name,
      friendlyName: item.InterfaceDescription || item.Name,
      type,
      mac: item.MacAddress,
      status: (item.Status || '').toLowerCase() === 'up' ? 'up' : 'down'
    })
  }
}

async function detectMacAdapters(adapterMap: Map<string, RawAdapterInfo>): Promise<void> {
  const { stdout } = await execAsync('networksetup -listallhardwareports', { timeout: 4000 })
  // Format:
  // Hardware Port: Wi-Fi
  // Device: en0
  // Ethernet Address: xx:xx:xx:xx:xx:xx
  const sections = stdout.split(/Hardware Port:\s*/).filter(Boolean)

  for (const sec of sections) {
    const lines = sec.trim().split('\n')
    const friendlyName = lines[0].trim()
    let device = ''
    let mac = ''

    for (const line of lines.slice(1)) {
      if (line.startsWith('Device:')) {
        device = line.replace('Device:', '').trim()
      } else if (line.startsWith('Ethernet Address:')) {
        mac = line.replace('Ethernet Address:', '').trim()
      }
    }

    if (device) {
      const lower = friendlyName.toLowerCase()
      let type: InterfaceType = 'other'
      if (lower.includes('wi-fi') || lower.includes('airport')) {
        type = 'wifi'
      } else if (lower.includes('ethernet') || lower.includes('lan')) {
        type = 'ethernet'
      } else if (lower.includes('usb') || lower.includes('tether') || lower.includes('iphone') || lower.includes('rndis')) {
        type = 'usb'
      } else if (lower.includes('cellular') || lower.includes('lte')) {
        type = 'cellular'
      }

      adapterMap.set(device, {
        name: device,
        friendlyName,
        type,
        mac,
        status: 'up'
      })
    }
  }
}

async function detectLinuxAdapters(adapterMap: Map<string, RawAdapterInfo>): Promise<void> {
  try {
    const { stdout } = await execAsync('ip -o link show', { timeout: 4000 })
    // Example: 2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> ... \ link/ether 00:11:22:33:44:55
    const lines = stdout.split('\n').filter(Boolean)

    for (const line of lines) {
      const match = line.match(/^\d+:\s+([^:@]+)(?:@[^:]+)?:.*<([^>]+)>.*link\/\w+\s+([0-9a-f:]{17})/i)
      if (match) {
        const name = match[1].trim()
        const flags = match[2]
        const mac = match[3]

        if (name === 'lo') continue // Skip loopback

        let type: InterfaceType = 'other'
        let friendlyName = name

        if (
          name.startsWith('usb') ||
          name.startsWith('rndis') ||
          name.startsWith('enx') ||
          /en.*u\d+/i.test(name) ||
          name.includes('tether')
        ) {
          type = 'usb'
          friendlyName = `USB Tether (${name})`
        } else if (name.startsWith('wl') || name.startsWith('wlan') || name.includes('wifi')) {
          type = 'wifi'
          friendlyName = `Wi-Fi (${name})`
        } else if (
          name.startsWith('eth') ||
          name.startsWith('eno') ||
          name.startsWith('ens') ||
          name.startsWith('enp') ||
          name.startsWith('en')
        ) {
          type = 'ethernet'
          friendlyName = `Ethernet (${name})`
        } else if (name.startsWith('ww') || name.startsWith('lte')) {
          type = 'cellular'
          friendlyName = `Cellular (${name})`
        }

        const isUp = flags.includes('UP') && flags.includes('LOWER_UP')

        adapterMap.set(name, {
          name,
          friendlyName,
          type,
          mac,
          status: isUp ? 'up' : 'down'
        })
      }
    }
  } catch (err) {
    // Fallback if ip command not available or error
    console.warn('[PlatformDetector] ip link show failed, falling back to interface heuristics:', err)
  }
}

/**
 * Infer interface type and friendly name from interface name and OS networkInterfaces
 */
export function inferInterfaceType(name: string): { type: InterfaceType; friendlyName: string } {
  const lower = name.toLowerCase()
  if (
    lower.startsWith('usb') ||
    lower.startsWith('rndis') ||
    lower.startsWith('enx') ||
    /en.*u\d+/i.test(lower) ||
    lower.includes('tether')
  ) {
    return { type: 'usb', friendlyName: 'USB Tether' }
  }
  if (lower.startsWith('wl') || lower.includes('wifi') || lower.includes('wlan')) {
    return { type: 'wifi', friendlyName: 'Wi-Fi' }
  }
  if (
    lower.startsWith('eth') ||
    lower.startsWith('en0') ||
    lower.startsWith('eno') ||
    lower.startsWith('ens') ||
    lower.startsWith('en')
  ) {
    return { type: 'ethernet', friendlyName: 'Ethernet' }
  }
  if (lower.startsWith('ww') || lower.includes('cellular') || lower.includes('lte') || lower.includes('mobile')) {
    return { type: 'cellular', friendlyName: 'Cellular' }
  }
  return { type: 'other', friendlyName: name }
}
