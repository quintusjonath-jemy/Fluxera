import React, { useState } from 'react'
import { History, Search, FolderOpen, FileCheck, Trash2, ArrowUpRight } from 'lucide-react'
import { useFluxeraStore } from '../store/useFluxeraStore'
import { formatBytes, formatSpeed, formatDuration, formatDate } from '../utils/format'

export const HistoryView: React.FC = () => {
  const { downloads, openFile, showInFolder, removeDownload, setSelectedDownloadId } =
    useFluxeraStore()

  const [query, setQuery] = useState('')

  const completedDownloads = downloads.filter((d) => d.state === 'COMPLETED')
  const filtered = completedDownloads.filter((d) =>
    d.fileName.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 max-w-6xl mx-auto w-full select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F5F7F7]">Download History</h1>
          <p className="text-xs text-[#6E777A]">Completed downloads log and file actions</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E777A]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search completed files..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#111416] border border-[#252A2D] text-xs text-[#F5F7F7] placeholder-[#6E777A] focus:outline-none focus:border-[#27C7A5]"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#252A2D] bg-[#111416]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#171A1C] text-[#6E777A] uppercase text-[10px] tracking-wider border-b border-[#252A2D]">
            <tr>
              <th className="py-3 px-5 font-semibold">File Name</th>
              <th className="py-3 px-3 font-semibold">Size</th>
              <th className="py-3 px-3 font-semibold">Avg Speed</th>
              <th className="py-3 px-3 font-semibold">Duration</th>
              <th className="py-3 px-3 font-semibold">Date Completed</th>
              <th className="py-3 px-5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#252A2D]/50 text-[#F5F7F7]">
            {filtered.map((item) => (
              <tr
                key={item.id}
                onClick={() => setSelectedDownloadId(item.id)}
                className="hover:bg-[#171A1C]/60 transition-colors cursor-pointer"
              >
                <td className="py-3 px-5 font-medium">
                  <div className="flex flex-col min-w-0">
                    <span className="truncate max-w-xs text-xs font-semibold">{item.fileName}</span>
                    <span className="text-[10px] font-mono text-[#6E777A] truncate max-w-sm">
                      {item.finalFilePath}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 font-mono text-[#A7AFB2]">{formatBytes(item.fileSize)}</td>
                <td className="py-3 px-3 font-mono text-[#27C7A5]">
                  {formatSpeed(item.averageSpeed)}
                </td>
                <td className="py-3 px-3 font-mono text-[#A7AFB2]">
                  {formatDuration(item.totalDuration)}
                </td>
                <td className="py-3 px-3 font-mono text-[#6E777A]">
                  {formatDate(item.completedAt || item.updatedAt)}
                </td>
                <td
                  className="py-3 px-5 text-right flex items-center justify-end gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => openFile(item.finalFilePath)}
                    className="p-1.5 rounded-lg bg-[#27C7A5]/10 hover:bg-[#27C7A5]/20 text-[#27C7A5] transition-colors"
                    title="Open File"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => showInFolder(item.finalFilePath)}
                    className="p-1.5 rounded-lg bg-[#171A1C] hover:bg-[#252A2D] text-[#A7AFB2] hover:text-[#F5F7F7] transition-colors"
                    title="Show in Folder"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeDownload(item.id, false)}
                    className="p-1.5 rounded-lg bg-[#171A1C] hover:bg-[#EF4444]/20 text-[#6E777A] hover:text-[#EF4444] transition-colors"
                    title="Delete History Record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-[#6E777A]">
                  No completed downloads in history.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
