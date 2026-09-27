import React from 'react'
import { NetworkContribution, NetworkInterfaceInfo } from '../../../shared/types'
import { formatBytes, formatSpeed } from '../../utils/format'

interface BandwidthSummaryProps {
  totalSpeed: number
  totalBytes: number
  contributions: Record<string, NetworkContribution>
  interfaces: NetworkInterfaceInfo[]
}

export const BandwidthSummary: React.FC<BandwidthSummaryProps> = ({
  totalSpeed,
  totalBytes,
  contributions,
  interfaces
}) => {
  const ifaceMap = new Map(interfaces.map((i) => [i.id, i]))

  const items = Object.entries(contributions).map(([ifaceId, contrib]) => {
    const iface = ifaceMap.get(ifaceId)
    const color = iface?.color || '#27C7A5'
    const name = iface?.displayName || ifaceId
    const percentage = totalBytes > 0 ? Math.round((contrib.bytes / totalBytes) * 100) : 0
    return {
      ifaceId,
      name,
      color,
      speed: contrib.speed,
      bytes: contrib.bytes,
      percentage,
      chunks: contrib.chunks
    }
  })

  return (
    <div className="rounded-xl border border-[#252A2D] bg-[#111416] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wider text-[#6E777A] font-semibold">
            Combined Bandwidth
          </span>
          <span className="text-xl font-bold font-mono text-[#F5F7F7]">
            {formatSpeed(totalSpeed)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[11px] uppercase tracking-wider text-[#6E777A] font-semibold">
            Total Aggregate Data
          </span>
          <p className="text-sm font-mono text-[#A7AFB2]">{formatBytes(totalBytes)}</p>
        </div>
      </div>

      {/* Multi-segment Segmented Progress Bar */}
      <div className="h-2.5 w-full bg-[#171A1C] rounded-full overflow-hidden flex border border-[#252A2D]">
        {items.map((item) => (
          <div
            key={item.ifaceId}
            className="h-full transition-all duration-300"
            style={{
              width: `${item.percentage}%`,
              backgroundColor: item.color
            }}
          />
        ))}
      </div>

      {/* Per-interface breakdown items */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
        {items.map((item) => (
          <div
            key={item.ifaceId}
            className="flex items-center gap-2 p-2 rounded-lg bg-[#171A1C] border border-[#252A2D]/60"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-[#F5F7F7] truncate">{item.name}</span>
              <div className="flex items-center gap-2 text-[10px] text-[#A7AFB2] font-mono">
                <span className="font-bold text-[#F5F7F7]">{item.percentage}%</span>
                <span>•</span>
                <span>{formatBytes(item.bytes)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
