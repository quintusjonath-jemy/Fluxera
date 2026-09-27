import React, { useState } from 'react'
import {
  X,
  Play,
  Pause,
  Trash2,
  FolderOpen,
  FileCheck,
  Activity,
  Layers,
  Info,
  Clock,
  Zap,
  Globe
} from 'lucide-react'
import { useFluxeraStore } from '../../store/useFluxeraStore'
import { formatBytes, formatSpeed, formatDuration, formatDate } from '../../utils/format'
import { ProgressGrid } from '../monitor/ProgressGrid'
import { StreamTable } from '../monitor/StreamTable'
import { SpeedChart } from '../monitor/SpeedChart'
import { BandwidthSummary } from '../monitor/BandwidthSummary'

export const DownloadDetailModal: React.FC = () => {
  const {
    selectedDownloadId,
    setSelectedDownloadId,
    downloads,
    interfaces,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    openFile,
    showInFolder
  } = useFluxeraStore()

  const [activeTab, setActiveTab] = useState<'overview' | 'streams' | 'chart' | 'file'>('overview')

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedDownloadId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setSelectedDownloadId])

  const item = downloads.find((d) => d.id === selectedDownloadId)
  if (!item) return null

  const progressPercent =
    item.fileSize > 0 ? Math.round((item.downloadedBytes / item.fileSize) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-2xl bg-[#111416] border border-[#252A2D] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[#252A2D] bg-[#171A1C]/60 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#27C7A5]/10 border border-[#27C7A5]/30 flex items-center justify-center text-[#27C7A5] shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[#F5F7F7] truncate max-w-md">
                  {item.fileName}
                </h2>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    item.state === 'DOWNLOADING'
                      ? 'bg-[#27C7A5]/20 text-[#27C7A5] border border-[#27C7A5]/40 animate-pulse'
                      : item.state === 'COMPLETED'
                        ? 'bg-[#10B981]/20 text-[#10B981]'
                        : item.state === 'PAUSED'
                          ? 'bg-[#F59E0B]/20 text-[#F59E0B]'
                          : 'bg-[#EF4444]/20 text-[#EF4444]'
                  }`}
                >
                  {item.state}
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#6E777A] truncate max-w-lg">
                {item.url}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {item.state === 'DOWNLOADING' && (
              <button
                onClick={() => pauseDownload(item.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171A1C] hover:bg-[#252A2D] border border-[#252A2D] text-xs text-[#F5F7F7] transition-colors"
              >
                <Pause className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Pause</span>
              </button>
            )}

            {(item.state === 'PAUSED' || item.state === 'RECOVERED' || item.state === 'FAILED') && (
              <button
                onClick={() => resumeDownload(item.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27C7A5]/15 hover:bg-[#27C7A5]/25 border border-[#27C7A5]/40 text-xs text-[#27C7A5] font-semibold transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </button>
            )}

            {item.state === 'COMPLETED' && (
              <>
                <button
                  onClick={() => openFile(item.finalFilePath)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27C7A5]/15 hover:bg-[#27C7A5]/25 border border-[#27C7A5]/40 text-xs text-[#27C7A5] font-semibold transition-colors"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Open</span>
                </button>
                <button
                  onClick={() => showInFolder(item.finalFilePath)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171A1C] hover:bg-[#252A2D] border border-[#252A2D] text-xs text-[#A7AFB2] hover:text-[#F5F7F7] transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Show</span>
                </button>
              </>
            )}

            <button
              onClick={() => setSelectedDownloadId(null)}
              className="p-1.5 rounded-lg text-[#6E777A] hover:text-[#F5F7F7] hover:bg-[#171A1C] transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Telemetry Metrics Bar */}
        <div className="px-6 py-3 border-b border-[#252A2D] bg-[#111416] grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[#6E777A]">Progress</span>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-lg font-bold text-[#F5F7F7]">{progressPercent}%</span>
              <span className="text-[11px] text-[#A7AFB2]">
                ({formatBytes(item.downloadedBytes)} / {formatBytes(item.fileSize)})
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[#6E777A]">Speed</span>
            <div className="text-lg font-bold font-mono text-[#27C7A5]">
              {formatSpeed(item.currentSpeed)}
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[#6E777A]">Avg Speed</span>
            <div className="text-sm font-semibold font-mono text-[#A7AFB2] mt-0.5">
              {formatSpeed(item.averageSpeed)}
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[#6E777A]">ETA</span>
            <div className="text-sm font-semibold font-mono text-[#F5F7F7] mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#6E777A]" />
              <span>{item.state === 'COMPLETED' ? 'Done' : item.eta > 0 ? formatDuration(item.eta) : '—'}</span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[#6E777A]">Concurrency</span>
            <div className="text-sm font-semibold font-mono text-[#F5F7F7] mt-0.5">
              {item.activeStreams?.length || 0} active workers
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-2 border-b border-[#252A2D] bg-[#171A1C]/30 flex items-center gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-[#27C7A5] text-[#27C7A5] font-semibold'
                : 'border-transparent text-[#A7AFB2] hover:text-[#F5F7F7]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Progress & Chunks</span>
          </button>

          <button
            onClick={() => setActiveTab('streams')}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'streams'
                ? 'border-[#27C7A5] text-[#27C7A5] font-semibold'
                : 'border-transparent text-[#A7AFB2] hover:text-[#F5F7F7]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Active Streams ({item.activeStreams?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('chart')}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'chart'
                ? 'border-[#27C7A5] text-[#27C7A5] font-semibold'
                : 'border-transparent text-[#A7AFB2] hover:text-[#F5F7F7]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Throughput Chart</span>
          </button>

          <button
            onClick={() => setActiveTab('file')}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'file'
                ? 'border-[#27C7A5] text-[#27C7A5] font-semibold'
                : 'border-transparent text-[#A7AFB2] hover:text-[#F5F7F7]'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>File Details</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6 text-xs max-h-[60vh]">
          {activeTab === 'overview' && (
            <>
              {/* Bandwidth Contribution summary */}
              <BandwidthSummary
                totalSpeed={item.currentSpeed}
                totalBytes={item.downloadedBytes}
                contributions={item.networkContribution || {}}
                interfaces={interfaces}
              />

              {/* Progress Grid */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-[#A7AFB2] uppercase tracking-wider">
                  Interactive Chunk Map (1:1 Partition)
                </span>
                <ProgressGrid chunks={item.chunks || []} interfaces={interfaces} />
              </div>

              {/* Mini Stream Table */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-[#A7AFB2] uppercase tracking-wider">
                  Live Worker Stream Monitor
                </span>
                <StreamTable streams={item.activeStreams || []} />
              </div>
            </>
          )}

          {activeTab === 'streams' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-[#A7AFB2]">
                Independent concurrent worker socket connections bound to physical network
                interfaces:
              </p>
              <StreamTable streams={item.activeStreams || []} />
            </div>
          )}

          {activeTab === 'chart' && (
            <div className="flex flex-col gap-3">
              <SpeedChart history={item.speedHistory || []} interfaces={interfaces} height={220} />
            </div>
          )}

          {activeTab === 'file' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#171A1C] border border-[#252A2D] flex flex-col gap-2.5">
                <span className="text-[11px] font-semibold text-[#6E777A] uppercase tracking-wider">
                  File Properties
                </span>
                <div className="flex justify-between py-1 border-b border-[#252A2D]/40">
                  <span className="text-[#A7AFB2]">File Name:</span>
                  <span className="font-mono text-[#F5F7F7] font-medium truncate max-w-[200px]">
                    {item.fileName}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#252A2D]/40">
                  <span className="text-[#A7AFB2]">Total Size:</span>
                  <span className="font-mono text-[#F5F7F7]">{formatBytes(item.fileSize)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#252A2D]/40">
                  <span className="text-[#A7AFB2]">Content Type:</span>
                  <span className="font-mono text-[#F5F7F7]">{item.contentType || 'binary/octet-stream'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#252A2D]/40">
                  <span className="text-[#A7AFB2]">Range Support:</span>
                  <span className="font-semibold text-[#27C7A5]">
                    {item.rangeSupported ? 'Enabled (HTTP 206)' : 'Single Connection (HTTP 200)'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#252A2D]/40">
                  <span className="text-[#A7AFB2]">Chunk Size:</span>
                  <span className="font-mono text-[#F5F7F7]">{formatBytes(item.chunkSize)}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#171A1C] border border-[#252A2D] flex flex-col gap-2.5">
                <span className="text-[11px] font-semibold text-[#6E777A] uppercase tracking-wider">
                  Path & Identity
                </span>
                <div className="flex flex-col py-1 border-b border-[#252A2D]/40">
                  <span className="text-[#A7AFB2]">Destination Path:</span>
                  <span className="font-mono text-[#F5F7F7] text-[11px] break-all">
                    {item.finalFilePath}
                  </span>
                </div>
                <div className="flex flex-col py-1 border-b border-[#252A2D]/40">
                  <span className="text-[#A7AFB2]">Staging File:</span>
                  <span className="font-mono text-[#A7AFB2] text-[11px] break-all">
                    {item.stagingFilePath}
                  </span>
                </div>
                {item.etag && (
                  <div className="flex justify-between py-1 border-b border-[#252A2D]/40">
                    <span className="text-[#A7AFB2]">ETag:</span>
                    <span className="font-mono text-[#F5F7F7] truncate max-w-[200px]">{item.etag}</span>
                  </div>
                )}
                {item.lastModified && (
                  <div className="flex justify-between py-1 border-b border-[#252A2D]/40">
                    <span className="text-[#A7AFB2]">Last-Modified:</span>
                    <span className="font-mono text-[#F5F7F7]">{item.lastModified}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-[#A7AFB2]">Created:</span>
                  <span className="font-mono text-[#A7AFB2]">{formatDate(item.createdAt)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
