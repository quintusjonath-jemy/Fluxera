import React, { useState } from 'react'
import {
  ArrowRight,
  Download,
  Network,
  Zap,
  Layers,
  ShieldCheck,
  Pause,
  Play,
  Activity,
  FolderOpen
} from 'lucide-react'
import { useFluxeraStore } from '../store/useFluxeraStore'
import { formatBytes, formatSpeed, formatDuration } from '../utils/format'

export const HomeView: React.FC = () => {
  const {
    downloads,
    interfaces,
    setIsNewDownloadOpen,
    setProbeUrlInput,
    probe,
    pauseDownload,
    resumeDownload,
    setSelectedDownloadId,
    setCurrentTab
  } = useFluxeraStore()

  const [inputUrl, setInputUrl] = useState('')

  const handleStart = () => {
    if (inputUrl.trim()) {
      setProbeUrlInput(inputUrl.trim())
      setIsNewDownloadOpen(true)
      probe(inputUrl.trim())
    }
  }

  const activeDownloads = downloads.filter((d) => d.state === 'DOWNLOADING')
  const recentDownloads = downloads.slice(0, 3)

  return (
    <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 max-w-6xl mx-auto w-full select-none">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center gap-3 pt-6 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#27C7A5]/10 border border-[#27C7A5]/30 text-xs font-mono text-[#27C7A5]">
          <Zap className="w-3.5 h-3.5" />
          <span>Every connection. One faster download.</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5F7F7]">
          Turn every connection
          <br />
          into a <span className="bg-gradient-to-r from-[#27C7A5] to-[#76EAD2] bg-clip-text text-transparent">faster download</span>.
        </h1>
        <p className="text-sm text-[#A7AFB2] max-w-lg">
          Fluxera intelligently distributes HTTP range requests across your physical network
          interfaces without requiring VPNs or complex bonding hardware.
        </p>

        {/* Large Prominent URL Input Bar */}
        <div className="w-full max-w-2xl mt-4">
          <div className="relative flex items-center p-1.5 rounded-2xl bg-[#111416] border border-[#252A2D] shadow-2xl focus-within:border-[#27C7A5] transition-all">
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              placeholder="Paste download URL (HTTP/HTTPS)..."
              className="flex-1 px-4 py-3 bg-transparent text-sm text-[#F5F7F7] font-mono placeholder-[#6E777A] focus:outline-none"
            />
            <button
              onClick={handleStart}
              disabled={!inputUrl.trim()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#27C7A5] hover:bg-[#20A88B] text-[#0B0D0E] font-semibold text-xs transition-all shadow-[0_2px_12px_rgba(39,199,165,0.25)] disabled:opacity-50 active:scale-95"
            >
              <span>Download</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* Available Physical Networks Grid */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6E777A] flex items-center gap-1.5">
            <Network className="w-4 h-4 text-[#27C7A5]" />
            Detected Physical Networks
          </span>
          <button
            onClick={() => setCurrentTab('networks')}
            className="text-xs text-[#27C7A5] hover:underline"
          >
            Manage Networks →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {interfaces.map((iface) => (
            <div
              key={iface.id}
              className="p-4 rounded-xl bg-[#111416] border border-[#252A2D] hover:border-[#27C7A5]/40 transition-colors flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: iface.color }}
                  />
                  <span className="font-semibold text-xs text-[#F5F7F7] truncate max-w-[110px]">
                    {iface.displayName}
                  </span>
                </div>
                <span
                  className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    iface.status === 'CONNECTED'
                      ? 'bg-[#27C7A5]/10 text-[#27C7A5]'
                      : 'bg-[#EF4444]/10 text-[#EF4444]'
                  }`}
                >
                  {iface.status}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-lg font-bold font-mono text-[#F5F7F7]">
                  {formatSpeed(iface.speed)}
                </span>
                {iface.latency > 0 && (
                  <span className="text-xs font-mono text-[#A7AFB2]">{iface.latency} ms</span>
                )}
              </div>

              <div className="text-[10px] font-mono text-[#6E777A] truncate">
                {iface.ipv4}
              </div>
            </div>
          ))}

          {interfaces.length === 0 && (
            <div className="col-span-full p-4 rounded-xl border border-[#252A2D] text-center text-xs text-[#A7AFB2]">
              Detecting physical network interfaces...
            </div>
          )}
        </div>
      </div>

      {/* Active Downloads or Recent Activity */}
      {activeDownloads.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6E777A] flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#27C7A5]" />
              Active Concurrent Downloads
            </span>
            <button
              onClick={() => setCurrentTab('downloads')}
              className="text-xs text-[#27C7A5] hover:underline"
            >
              View All ({downloads.length}) →
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {activeDownloads.map((item) => {
              const progress =
                item.fileSize > 0
                  ? Math.round((item.downloadedBytes / item.fileSize) * 100)
                  : 0

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedDownloadId(item.id)}
                  className="p-4 rounded-xl bg-[#111416] border border-[#252A2D] hover:border-[#27C7A5]/40 transition-colors flex flex-col gap-3 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#27C7A5]/10 border border-[#27C7A5]/30 flex items-center justify-center text-[#27C7A5] shrink-0">
                        <Download className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-xs text-[#F5F7F7] truncate max-w-md">
                          {item.fileName}
                        </span>
                        <span className="text-[11px] font-mono text-[#6E777A] truncate">
                          {formatBytes(item.downloadedBytes)} / {formatBytes(item.fileSize)} •{' '}
                          {item.eta > 0 ? `${formatDuration(item.eta)} remaining` : 'Calculating...'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-base font-bold font-mono text-[#27C7A5]">
                          {formatSpeed(item.currentSpeed)}
                        </span>
                        <div className="text-[10px] text-[#A7AFB2] font-mono">
                          {item.activeStreams?.length || 0} streams
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          pauseDownload(item.id)
                        }}
                        className="p-2 rounded-lg bg-[#171A1C] hover:bg-[#252A2D] border border-[#252A2D] text-[#F59E0B] transition-colors"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Thin Progress bar */}
                  <div className="h-1.5 w-full bg-[#171A1C] rounded-full overflow-hidden border border-[#252A2D]/60">
                    <div
                      className="h-full bg-[#27C7A5] transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Feature Pillar Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-xl bg-[#111416]/60 border border-[#252A2D] flex flex-col gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#27C7A5]/10 flex items-center justify-center text-[#27C7A5]">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-xs text-[#F5F7F7]">Dynamic Work-Stealing</h3>
          <p className="text-[11px] text-[#A7AFB2] leading-relaxed">
            Chunks are served from a unified pending queue. Faster connections automatically pull
            more chunks, preventing slow networks from holding up transfers.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#111416]/60 border border-[#252A2D] flex flex-col gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6]">
            <Network className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-xs text-[#F5F7F7]">Interface Socket Binding</h3>
          <p className="text-[11px] text-[#A7AFB2] leading-relaxed">
            Worker connections explicitly bind to physical network adapter local source addresses,
            utilizing Wi-Fi, Ethernet, and tethered devices simultaneously.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#111416]/60 border border-[#252A2D] flex flex-col gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center text-[#8B5CF6]">
            <Zap className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-xs text-[#F5F7F7]">Tail Racing & Resumption</h3>
          <p className="text-[11px] text-[#A7AFB2] leading-relaxed">
            Eliminate tail-latency with duplicate backup streams for sluggish final chunks. Safe
            ETag validators prevent corruption on pause and resume.
          </p>
        </div>
      </div>
    </div>
  )
}
