import React, { useState, useMemo } from 'react'
import { SpeedHistoryPoint, NetworkInterfaceInfo } from '../../../shared/types'
import { formatSpeed } from '../../utils/format'

interface SpeedChartProps {
  history: SpeedHistoryPoint[]
  interfaces: NetworkInterfaceInfo[]
  height?: number
}

export const SpeedChart: React.FC<SpeedChartProps> = ({
  history,
  interfaces,
  height = 160
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const ifaceMap = useMemo(() => {
    const map = new Map<string, NetworkInterfaceInfo>()
    for (const i of interfaces) {
      map.set(i.id, i)
    }
    return map
  }, [interfaces])

  const maxSpeed = useMemo(() => {
    let max = 1024 * 1024 // 1 MB/s min baseline
    for (const pt of history) {
      if (pt.totalSpeed > max) max = pt.totalSpeed
    }
    return max * 1.15 // padding
  }, [history])

  // Generate SVG path for points
  const points = useMemo(() => {
    if (history.length < 2) return ''
    const width = 1000
    const stepX = width / Math.max(1, history.length - 1)

    return history
      .map((pt, i) => {
        const x = i * stepX
        const y = height - (pt.totalSpeed / maxSpeed) * (height - 20)
        return `${i === 0 ? 'M' : 'L'} ${x} ${Math.max(10, y)}`
      })
      .join(' ')
  }, [history, maxSpeed, height])

  const areaPath = useMemo(() => {
    if (!points || history.length < 2) return ''
    const width = 1000
    return `${points} L ${width} ${height} L 0 ${height} Z`
  }, [points, history.length, height])

  if (history.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-[#252A2D] bg-[#111416]/50 text-xs text-[#6E777A] font-mono"
        style={{ height }}
      >
        Waiting for speed telemetry...
      </div>
    )
  }

  const activePoint = hoverIndex !== null && history[hoverIndex] ? history[hoverIndex] : history[history.length - 1]

  return (
    <div className="relative rounded-xl border border-[#252A2D] bg-[#111416] p-3 flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#F5F7F7]">Throughput Velocity</span>
          <span className="font-mono text-[#27C7A5] font-bold">
            {formatSpeed(activePoint.totalSpeed)}
          </span>
        </div>
        <div className="text-[11px] text-[#6E777A] font-mono">
          Peak: {formatSpeed(maxSpeed / 1.15)}
        </div>
      </div>

      <div className="relative w-full overflow-hidden" style={{ height }}>
        <svg
          viewBox={`0 0 1000 ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full cursor-crosshair"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const relativeX = (e.clientX - rect.left) / rect.width
            const index = Math.min(
              history.length - 1,
              Math.max(0, Math.round(relativeX * (history.length - 1)))
            )
            setHoverIndex(index)
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#27C7A5" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#27C7A5" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1="20" x2="1000" y2="20" stroke="#252A2D" strokeDasharray="3 3" />
          <line x1="0" y1={height / 2} x2="1000" y2={height / 2} stroke="#252A2D" strokeDasharray="3 3" />
          <line x1="0" y1={height - 2} x2="1000" y2={height - 2} stroke="#252A2D" />

          {/* Area Fill */}
          <path d={areaPath} fill="url(#speedGrad)" />

          {/* Total Speed Stroke */}
          <path
            d={points}
            fill="none"
            stroke="#27C7A5"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Per Interface line traces */}
          {interfaces.map((iface) => {
            if (!iface.color) return null
            const stepX = 1000 / Math.max(1, history.length - 1)
            const ifacePath = history
              .map((pt, i) => {
                const spd = pt.perInterface[iface.id] || 0
                const x = i * stepX
                const y = height - (spd / maxSpeed) * (height - 20)
                return `${i === 0 ? 'M' : 'L'} ${x} ${Math.max(10, y)}`
              })
              .join(' ')

            return (
              <path
                key={iface.id}
                d={ifacePath}
                fill="none"
                stroke={iface.color}
                strokeWidth="1.2"
                strokeOpacity="0.75"
              />
            )
          })}
        </svg>

        {/* Hover details overlay */}
        {hoverIndex !== null && activePoint && (
          <div className="absolute top-2 right-2 px-2.5 py-1.5 rounded-lg bg-[#171A1C]/95 border border-[#252A2D] shadow-lg text-[10px] flex flex-col gap-0.5 pointer-events-none backdrop-blur-sm">
            <span className="font-mono text-[#A7AFB2]">
              {new Date(activePoint.timestamp).toLocaleTimeString()}
            </span>
            <div className="font-mono font-bold text-[#27C7A5]">
              Total: {formatSpeed(activePoint.totalSpeed)}
            </div>
            {Object.entries(activePoint.perInterface).map(([id, spd]) => (
              <div key={id} className="flex items-center gap-1 font-mono text-[#F5F7F7]">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: ifaceMap.get(id)?.color || '#A7AFB2' }}
                ></span>
                <span>{ifaceMap.get(id)?.displayName || id}:</span>
                <span>{formatSpeed(spd)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
