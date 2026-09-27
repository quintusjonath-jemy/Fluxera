import React from 'react'
import {
  Download,
  Play,
  Pause,
  Trash2,
  FolderOpen,
  FileCheck,
  Search,
  AlertCircle,
  Plus
} from 'lucide-react'
import { useFluxeraStore, DownloadFilter } from '../store/useFluxeraStore'
import { formatBytes, formatSpeed, formatDuration, formatDate } from '../utils/format'

export const DownloadsView: React.FC = () => {
  const {
    downloads,
    downloadFilter,
    setDownloadFilter,
    searchQuery,
    setSearchQuery,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    removeDownload,
    openFile,
    showInFolder,
    setSelectedDownloadId,
    setIsNewDownloadOpen
  } = useFluxeraStore()

  // Filter downloads by state and search query
  const filteredDownloads = downloads.filter((item) => {
    if (downloadFilter === 'downloading' && item.state !== 'DOWNLOADING' && item.state !== 'RESUMING')
      return false
    if (downloadFilter === 'paused' && item.state !== 'PAUSED' && item.state !== 'RECOVERED')
      return false
    if (downloadFilter === 'completed' && item.state !== 'COMPLETED') return false
    if (downloadFilter === 'failed' && item.state !== 'FAILED' && item.state !== 'CANCELLED')
      return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return item.fileName.toLowerCase().includes(q) || item.url.toLowerCase().includes(q)
    }

    return true
  })

  const filterTabs: { id: DownloadFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: downloads.length },
    {
      id: 'downloading',
      label: 'Downloading',
      count: downloads.filter((d) => d.state === 'DOWNLOADING').length
    },
    {
      id: 'paused',
      label: 'Paused',
      count: downloads.filter((d) => d.state === 'PAUSED' || d.state === 'RECOVERED').length
    },
    {
      id: 'completed',
      label: 'Completed',
      count: downloads.filter((d) => d.state === 'COMPLETED').length
    },
    {
      id: 'failed',
      label: 'Failed',
      count: downloads.filter((d) => d.state === 'FAILED' || d.state === 'CANCELLED').length
    }
  ]

  return (
    <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 max-w-6xl mx-auto w-full select-none">
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F5F7F7]">Download Library</h1>
          <p className="text-xs text-[#6E777A]">Manage active streams and historical transfers</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewDownloadOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#27C7A5] hover:bg-[#20A88B] text-[#0B0D0E] font-semibold text-xs transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Download</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#252A2D] pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDownloadFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                downloadFilter === tab.id
                  ? 'bg-[#171A1C] text-[#27C7A5] border border-[#27C7A5]/30'
                  : 'text-[#A7AFB2] hover:text-[#F5F7F7] hover:bg-[#171A1C]/50'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#111416] text-[#6E777A] font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E777A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter list..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#111416] border border-[#252A2D] text-xs text-[#F5F7F7] placeholder-[#6E777A] focus:outline-none focus:border-[#27C7A5]"
          />
        </div>
      </div>

      {/* Downloads List */}
      <div className="flex flex-col gap-3">
        {filteredDownloads.map((item) => {
          const progress =
            item.fileSize > 0 ? Math.round((item.downloadedBytes / item.fileSize) * 100) : 0
          const isActive = item.state === 'DOWNLOADING' || item.state === 'RESUMING'

          return (
            <div
              key={item.id}
              onClick={() => setSelectedDownloadId(item.id)}
              className="p-4 rounded-xl bg-[#111416] border border-[#252A2D] hover:border-[#27C7A5]/40 transition-colors flex flex-col gap-3 cursor-pointer"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#171A1C] border border-[#252A2D] flex items-center justify-center text-[#27C7A5] shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[#F5F7F7] truncate max-w-sm">
                        {item.fileName}
                      </span>
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          item.state === 'DOWNLOADING'
                            ? 'bg-[#27C7A5]/20 text-[#27C7A5] animate-pulse'
                            : item.state === 'COMPLETED'
                              ? 'bg-[#10B981]/20 text-[#10B981]'
                              : item.state === 'PAUSED' || item.state === 'RECOVERED'
                                ? 'bg-[#F59E0B]/20 text-[#F59E0B]'
                                : 'bg-[#EF4444]/20 text-[#EF4444]'
                        }`}
                      >
                        {item.state}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#6E777A] truncate max-w-md">
                      {formatBytes(item.downloadedBytes)} / {formatBytes(item.fileSize)} •{' '}
                      {item.state === 'COMPLETED'
                        ? `Completed in ${formatDuration(item.totalDuration)}`
                        : item.eta > 0
                          ? `ETA ${formatDuration(item.eta)}`
                          : '—'}
                    </span>
                  </div>
                </div>

                {/* Right Metrics & Actions */}
                <div className="flex items-center gap-4 shrink-0">
                  {isActive ? (
                    <div className="text-right">
                      <span className="text-base font-bold font-mono text-[#27C7A5]">
                        {formatSpeed(item.currentSpeed)}
                      </span>
                      <div className="text-[10px] text-[#A7AFB2] font-mono">
                        {item.activeStreams?.length || 0} streams
                      </div>
                    </div>
                  ) : item.state === 'COMPLETED' ? (
                    <div className="text-right">
                      <span className="text-xs font-mono text-[#A7AFB2]">
                        Avg: {formatSpeed(item.averageSpeed)}
                      </span>
                      <div className="text-[10px] text-[#6E777A]">
                        {formatDate(item.completedAt || item.updatedAt)}
                      </div>
                    </div>
                  ) : null}

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {isActive && (
                      <button
                        onClick={() => pauseDownload(item.id)}
                        className="p-2 rounded-lg bg-[#171A1C] hover:bg-[#252A2D] border border-[#252A2D] text-[#F59E0B] transition-colors"
                        title="Pause Download"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {(item.state === 'PAUSED' ||
                      item.state === 'RECOVERED' ||
                      item.state === 'FAILED') && (
                      <button
                        onClick={() => resumeDownload(item.id)}
                        className="p-2 rounded-lg bg-[#27C7A5]/15 hover:bg-[#27C7A5]/25 border border-[#27C7A5]/40 text-[#27C7A5] transition-colors"
                        title="Resume Download"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {item.state === 'COMPLETED' && (
                      <>
                        <button
                          onClick={() => openFile(item.finalFilePath)}
                          className="p-2 rounded-lg bg-[#27C7A5]/15 hover:bg-[#27C7A5]/25 border border-[#27C7A5]/40 text-[#27C7A5] transition-colors"
                          title="Open File"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => showInFolder(item.finalFilePath)}
                          className="p-2 rounded-lg bg-[#171A1C] hover:bg-[#252A2D] border border-[#252A2D] text-[#A7AFB2] hover:text-[#F5F7F7] transition-colors"
                          title="Show in Folder"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => removeDownload(item.id, false)}
                      className="p-2 rounded-lg bg-[#171A1C] hover:bg-[#EF4444]/20 border border-[#252A2D] text-[#6E777A] hover:text-[#EF4444] transition-colors"
                      title="Remove from list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 bg-[#171A1C] rounded-full overflow-hidden border border-[#252A2D]/60">
                  <div
                    className={`h-full transition-all duration-300 ${
                      item.state === 'COMPLETED'
                        ? 'bg-[#10B981]'
                        : item.state === 'FAILED'
                          ? 'bg-[#EF4444]'
                          : 'bg-[#27C7A5]'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-[#A7AFB2] w-10 text-right">
                  {progress}%
                </span>
              </div>
            </div>
          )
        })}

        {filteredDownloads.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-[#252A2D] bg-[#111416]/50 text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#171A1C] flex items-center justify-center text-[#6E777A]">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F5F7F7]">No downloads found</p>
              <p className="text-xs text-[#6E777A] mt-1">
                Start a multi-network download using any valid URL.
              </p>
            </div>
            <button
              onClick={() => setIsNewDownloadOpen(true)}
              className="mt-2 px-4 py-2 rounded-lg bg-[#27C7A5] hover:bg-[#20A88B] text-[#0B0D0E] font-semibold text-xs transition-all shadow-sm"
            >
              Start New Download
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
