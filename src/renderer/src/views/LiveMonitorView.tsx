import React, { useState } from 'react'
import { Activity, Network, Zap, Layers, AlertCircle, ArrowUpRight } from 'lucide-react'
import { useFluxeraStore } from '../store/useFluxeraStore'
import { formatBytes, formatSpeed, formatDuration } from '../utils/format'
import { ProgressGrid } from '../components/monitor/ProgressGrid'
import { StreamTable } from '../components/monitor/StreamTable'
import { SpeedChart } from '../components/monitor/SpeedChart'
import { BandwidthSummary } from '../components/monitor/BandwidthSummary'

export const LiveMonitorView: React.FC = () => {
  const { downloads, interfaces, setIsNewDownloadOpen } = useFluxeraStore()

  // Select active download or default to first downloading or first item
  const activeDownloads = downloads.filter((d) => d.state === 'DOWNLOADING')
  const [selectedId, setSelectedId] = useState<string>(
    activeDownloads[0]?.id || downloads[0]?.id || ''
  )

  const currentDownload = downloads.find((d) => d.id === selectedId) || activeDownloads[0] || downloads[0]

  if (!currentDownload) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-4 select-none">
        <div className="w-14 h-14 rounded-2xl bg-[#111416] border border-[#252A2D] flex items-center justify-center text-[#27C7A5]">
          <Activity className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#F5F7F7]">No Active Monitoring Session</h2>
          <p className="text-xs text-[#6E777A] max-w-sm mt-1">
            Start a download to observe real-time dynamic chunk distribution, per-interface
            contribution, and live stream telemetry.
          </p>
        </div>
        <button
          onClick={() => setIsNewDownloadOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-[#27C7A5] hover:bg-[#20A88B] text-[#0B0D0E] font-semibold text-xs transition-all shadow-md active:scale-95"
        >
          Start New Download
        </button>
      </div>
    )
  }

  const progressPercent =
    currentDownload.fileSize > 0
      ? Math.round((currentDownload.downloadedBytes / currentDownload.fileSize) * 100)
      : 0

  return (
    <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 max-w-6xl mx-auto w-full select-none">
      {/* Top Bar with Session Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#F5F7F7]">Live Command Monitor</h1>
            <span className="w-2 h-2 rounded-full bg-[#27C7A5] animate-ping" />
          </div>
          <p className="text-xs text-[#6E777A]">Real-time multi-network telemetry & chunk activity</p>
        </div>

        {/* Dropdown if multiple downloads exist */}
        {downloads.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#A7AFB2]">Inspecting:</span>
            <select
              value={currentDownload.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#111416] border border-[#252A2D] text-xs text-[#F5F7F7] font-medium focus:outline-none focus:border-[#27C7A5]"
            >
              {downloads.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fileName} ({d.state})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Target Download Header Card */}
      <div className="p-5 rounded-2xl bg-[#111416] border border-[#252A2D] flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-base text-[#F5F7F7] truncate">
              {currentDownload.fileName}
            </span>
            <span className="text-xs font-mono text-[#6E777A] truncate">
              {currentDownload.url}
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-[#27C7A5]">
                {formatSpeed(currentDownload.currentSpeed)}
              </span>
              <div className="text-[11px] text-[#A7AFB2] font-mono">
                {progressPercent}% • {formatBytes(currentDownload.downloadedBytes)} /{' '}
                {formatBytes(currentDownload.fileSize)}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full bg-[#171A1C] rounded-full overflow-hidden border border-[#252A2D]/60">
          <div
            className="h-full bg-[#27C7A5] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Row 1: Networks Breakdown + Throughput Speed Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BandwidthSummary
          totalSpeed={currentDownload.currentSpeed}
          totalBytes={currentDownload.downloadedBytes}
          contributions={currentDownload.networkContribution || {}}
          interfaces={interfaces}
        />

        <SpeedChart
          history={currentDownload.speedHistory || []}
          interfaces={interfaces}
          height={160}
        />
      </div>

      {/* Row 2: Signature Interactive Progress Grid (1:1 Chunk Map) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6E777A] flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#27C7A5]" />
            Signature Dynamic Progress Grid (1:1 Chunk Partition)
          </span>
          <span className="text-xs text-[#A7AFB2] font-mono">
            Chunk Size: {formatBytes(currentDownload.chunkSize)}
          </span>
        </div>
        <ProgressGrid chunks={currentDownload.chunks || []} interfaces={interfaces} />
      </div>

      {/* Row 3: Active Worker Streams Table */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6E777A] flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#27C7A5]" />
            Active Worker Streams & Socket Bindings
          </span>
          <span className="text-xs font-mono text-[#27C7A5]">
            {currentDownload.activeStreams?.length || 0} active workers
          </span>
        </div>
        <StreamTable streams={currentDownload.activeStreams || []} />
      </div>
    </div>
  )
}
