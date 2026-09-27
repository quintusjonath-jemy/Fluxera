import React from 'react'
import { ActiveStreamInfo } from '../../../shared/types'
import { formatBytes, formatSpeed } from '../../utils/format'

interface StreamTableProps {
  streams: ActiveStreamInfo[]
}

export const StreamTable: React.FC<StreamTableProps> = ({ streams }) => {
  if (streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-[#252A2D] bg-[#111416]/50 text-center">
        <p className="text-sm text-[#A7AFB2]">No active worker streams at this moment.</p>
        <p className="text-xs text-[#6E777A] mt-1 font-mono">
          Worker connections appear here during active chunk transfer.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#252A2D] bg-[#111416]">
      <table className="w-full text-left text-xs">
        <thead className="bg-[#171A1C] text-[#6E777A] uppercase text-[10px] tracking-wider border-b border-[#252A2D]">
          <tr>
            <th className="py-2.5 px-4 font-semibold">Network</th>
            <th className="py-2.5 px-3 font-semibold">Chunk</th>
            <th className="py-2.5 px-3 font-semibold">Status</th>
            <th className="py-2.5 px-3 font-semibold">Speed</th>
            <th className="py-2.5 px-3 font-semibold">Downloaded</th>
            <th className="py-2.5 px-3 font-semibold">Range</th>
            <th className="py-2.5 px-4 font-semibold text-right">Duration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#252A2D]/50 text-[#F5F7F7]">
          {streams.map((stream) => (
            <tr
              key={stream.streamId}
              className={`hover:bg-[#171A1C]/60 transition-colors ${
                stream.isBackup ? 'bg-[#8B5CF6]/5' : ''
              }`}
            >
              <td className="py-2.5 px-4 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#27C7A5]"></span>
                <span className="truncate max-w-[120px]">{stream.interfaceName}</span>
              </td>
              <td className="py-2.5 px-3 font-mono text-[#A7AFB2]">#{stream.chunkId}</td>
              <td className="py-2.5 px-3">
                {stream.isBackup ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/40">
                    BACKUP
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#27C7A5] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#27C7A5] animate-pulse"></span>
                    {stream.status}
                  </span>
                )}
              </td>
              <td className="py-2.5 px-3 font-mono font-medium text-[#27C7A5]">
                {formatSpeed(stream.speed)}
              </td>
              <td className="py-2.5 px-3 font-mono text-[#A7AFB2]">
                {formatBytes(stream.downloaded)}
              </td>
              <td className="py-2.5 px-3 font-mono text-[#6E777A] text-[11px]">{stream.range}</td>
              <td className="py-2.5 px-4 font-mono text-[#A7AFB2] text-right">{stream.duration}s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
