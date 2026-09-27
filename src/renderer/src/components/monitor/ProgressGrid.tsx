import React, { useState, useMemo } from 'react'
import { ChunkInfo, NetworkInterfaceInfo } from '../../../shared/types'
import { formatBytes, formatDuration } from '../../utils/format'

interface ProgressGridProps {
  chunks: ChunkInfo[]
  interfaces: NetworkInterfaceInfo[]
  onSelectChunk?: (chunk: ChunkInfo) => void
  maxDisplayChunks?: number
}

export const ProgressGrid: React.FC<ProgressGridProps> = ({
  chunks,
  interfaces,
  onSelectChunk,
  maxDisplayChunks = 500
}) => {
  const [hoveredChunk, setHoveredChunk] = useState<ChunkInfo | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  // Map interfaces by ID for fast color & name lookup
  const ifaceMap = useMemo(() => {
    const map = new Map<string, NetworkInterfaceInfo>()
    for (const i of interfaces) {
      map.set(i.id, i)
    }
    return map
  }, [interfaces])

  // Count states for quick mini-badge bar
  const stats = useMemo(() => {
    let complete = 0
    let downloading = 0
    let retrying = 0
    let failed = 0
    let pending = 0
    let backup = 0

    for (const c of chunks) {
      if (c.state === 'COMPLETE') complete++
      else if (c.isBackup) backup++
      else if (c.state === 'DOWNLOADING') downloading++
      else if (c.state === 'RETRYING') retrying++
      else if (c.state === 'FAILED') failed++
      else pending++
    }

    return { complete, downloading, retrying, failed, pending, backup, total: chunks.length }
  }, [chunks])

  const displayChunks = useMemo(() => {
    if (chunks.length <= maxDisplayChunks) return chunks
    return chunks.slice(0, maxDisplayChunks)
  }, [chunks, maxDisplayChunks])

  const getChunkColor = (chunk: ChunkInfo): { bg: string; border: string; pulse: boolean } => {
    if (chunk.state === 'COMPLETE') {
      const iface = chunk.assignedInterfaceId ? ifaceMap.get(chunk.assignedInterfaceId) : null
      const baseColor = iface?.color || '#27C7A5'
      return { bg: baseColor, border: baseColor, pulse: false }
    }

    if (chunk.isBackup || chunk.state === 'BACKUP') {
      return { bg: '#8B5CF6', border: '#A78BFA', pulse: true }
    }

    if (chunk.state === 'DOWNLOADING') {
      const iface = chunk.assignedInterfaceId ? ifaceMap.get(chunk.assignedInterfaceId) : null
      const baseColor = iface?.color || '#3B82F6'
      return { bg: `${baseColor}66`, border: baseColor, pulse: true }
    }

    if (chunk.state === 'RETRYING') {
      return { bg: '#F59E0B66', border: '#F59E0B', pulse: true }
    }

    if (chunk.state === 'FAILED') {
      return { bg: '#EF4444', border: '#EF4444', pulse: false }
    }

    // PENDING
    return { bg: '#171A1C', border: '#252A2D', pulse: false }
  }

  const handleMouseEnter = (chunk: ChunkInfo, e: React.MouseEvent<HTMLDivElement>) => {
    setHoveredChunk(chunk)
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    })
  }

  const handleMouseLeave = () => {
    setHoveredChunk(null)
    setTooltipPos(null)
  }

  if (chunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-[#252A2D] bg-[#111416]/50 text-center">
        <p className="text-sm text-[#A7AFB2]">No chunk partition available yet.</p>
        <p className="text-xs text-[#6E777A] mt-1 font-mono">
          Chunks will generate automatically when the download begins.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Mini Legend & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[#F5F7F7]">
            <span className="font-semibold text-[#27C7A5]">{stats.complete}</span>
            <span className="text-[#6E777A]">/</span>
            <span>{stats.total} chunks</span>
            <span className="text-[#6E777A]">
              ({stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0}%)
            </span>
          </div>

          {stats.downloading > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse"></span>
              {stats.downloading} active
            </span>
          )}

          {stats.backup > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#8B5CF6]/15 text-[#C4B5FD] border border-[#8B5CF6]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-ping"></span>
              {stats.backup} backup
            </span>
          )}

          {stats.retrying > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F59E0B]/15 text-[#FCD34D] border border-[#F59E0B]/30">
              {stats.retrying} retrying
            </span>
          )}
        </div>

        {/* Dynamic interface color swatches */}
        <div className="flex items-center gap-2.5">
          {interfaces.map((iface) => (
            <div key={iface.id} className="flex items-center gap-1 text-[11px] text-[#A7AFB2]">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: iface.color }}
              ></span>
              <span className="truncate max-w-[90px]">{iface.displayName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="relative p-3 rounded-xl border border-[#252A2D] bg-[#111416]/80 backdrop-blur-sm">
        <div
          className="grid gap-1.5 max-h-[280px] overflow-y-auto pr-1"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(18px, 1fr))'
          }}
        >
          {displayChunks.map((chunk) => {
            const { bg, border, pulse } = getChunkColor(chunk)
            return (
              <div
                key={chunk.id}
                onClick={() => onSelectChunk?.(chunk)}
                onMouseEnter={(e) => handleMouseEnter(chunk, e)}
                onMouseLeave={handleMouseLeave}
                className={`h-[18px] rounded-[3px] border cursor-pointer transition-transform hover:scale-125 hover:z-20 relative group ${
                  pulse ? 'animate-pulse' : ''
                }`}
                style={{
                  backgroundColor: bg,
                  borderColor: border
                }}
              ></div>
            )
          })}
        </div>

        {chunks.length > maxDisplayChunks && (
          <div className="text-center mt-2 text-[11px] text-[#6E777A] font-mono">
            Showing first {maxDisplayChunks} of {chunks.length} total chunks
          </div>
        )}

        {/* Interactive Hover Tooltip */}
        {hoveredChunk && tooltipPos && (
          <div
            className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full px-3 py-2 rounded-lg bg-[#171A1C] border border-[#252A2D] shadow-2xl text-xs flex flex-col gap-1 w-52"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y
            }}
          >
            <div className="flex items-center justify-between pb-1 border-b border-[#252A2D]">
              <span className="font-semibold text-[#F5F7F7] font-mono">
                Chunk #{hoveredChunk.id}
              </span>
              <span
                className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor:
                    hoveredChunk.state === 'COMPLETE'
                      ? '#16372F'
                      : hoveredChunk.state === 'DOWNLOADING'
                        ? '#1E3A8A'
                        : '#252A2D',
                  color:
                    hoveredChunk.state === 'COMPLETE'
                      ? '#27C7A5'
                      : hoveredChunk.state === 'DOWNLOADING'
                        ? '#60A5FA'
                        : '#A7AFB2'
                }}
              >
                {hoveredChunk.isBackup ? 'BACKUP' : hoveredChunk.state}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-[#A7AFB2]">
              <span>Range:</span>
              <span className="font-mono text-[#F5F7F7] text-right">
                {formatBytes(hoveredChunk.startByte, 0)} – {formatBytes(hoveredChunk.endByte, 0)}
              </span>

              <span>Network:</span>
              <span className="font-medium text-[#F5F7F7] text-right truncate">
                {hoveredChunk.assignedInterfaceId
                  ? ifaceMap.get(hoveredChunk.assignedInterfaceId)?.displayName || 'Assigned'
                  : 'Unassigned'}
              </span>

              <span>Size:</span>
              <span className="font-mono text-[#F5F7F7] text-right">
                {formatBytes(hoveredChunk.totalBytes)}
              </span>

              <span>Downloaded:</span>
              <span className="font-mono text-[#F5F7F7] text-right">
                {formatBytes(hoveredChunk.downloadedBytes)}
              </span>

              {hoveredChunk.duration ? (
                <>
                  <span>Time:</span>
                  <span className="font-mono text-[#F5F7F7] text-right">
                    {formatDuration(hoveredChunk.duration)}
                  </span>
                </>
              ) : null}

              {hoveredChunk.retryCount > 0 && (
                <>
                  <span>Retries:</span>
                  <span className="font-mono text-[#F59E0B] text-right">
                    {hoveredChunk.retryCount}/5
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
