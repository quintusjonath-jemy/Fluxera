import React, { useState } from 'react'
import {
  X,
  Globe,
  HardDrive,
  FolderOpen,
  Network,
  Cpu,
  Layers,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight
} from 'lucide-react'
import { useFluxeraStore } from '../../store/useFluxeraStore'
import { formatBytes } from '../../utils/format'
import { ConnectionMode } from '../../../shared/types'

export const NewDownloadModal: React.FC = () => {
  const {
    isNewDownloadOpen,
    setIsNewDownloadOpen,
    probeUrlInput,
    setProbeUrlInput,
    isProbing,
    probeResult,
    probeError,
    probe,
    destinationPath,
    setDestinationPath,
    interfaces,
    selectedInterfaceIds,
    toggleInterfaceSelection,
    connectionMode,
    setConnectionMode,
    diskSpace,
    startDownloadFromDialog
  } = useFluxeraStore()

  const [chunkSizeMb, setChunkSizeMb] = useState<number>(8)

  if (!isNewDownloadOpen) return null

  const handleProbeClick = () => {
    if (probeUrlInput.trim()) {
      probe(probeUrlInput.trim())
    }
  }

  const handleSelectFolder = async () => {
    if (window.fluxera) {
      const folder = await window.fluxera.selectFolder()
      if (folder) {
        setDestinationPath(folder)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-[#111416] border border-[#252A2D] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#252A2D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#27C7A5]/10 border border-[#27C7A5]/30 flex items-center justify-center text-[#27C7A5]">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#F5F7F7]">New Concurrent Download</h2>
              <p className="text-[11px] text-[#6E777A]">
                Multi-interface range-accelerated download session
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsNewDownloadOpen(false)}
            className="p-1 rounded-lg text-[#6E777A] hover:text-[#F5F7F7] hover:bg-[#171A1C] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-xs">
          {/* Step 1: URL input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#A7AFB2] uppercase tracking-wider">
              Download URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={probeUrlInput}
                onChange={(e) => setProbeUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleProbeClick()}
                placeholder="https://example.com/file.iso"
                className="flex-1 px-3 py-2 rounded-lg bg-[#171A1C] border border-[#252A2D] text-xs text-[#F5F7F7] font-mono placeholder-[#6E777A] focus:outline-none focus:border-[#27C7A5]"
              />
              <button
                onClick={handleProbeClick}
                disabled={isProbing || !probeUrlInput.trim()}
                className="px-4 py-2 rounded-lg bg-[#171A1C] hover:bg-[#252A2D] border border-[#252A2D] text-[#F5F7F7] font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {isProbing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#27C7A5]" />
                    <span>Probing...</span>
                  </>
                ) : (
                  <span>Probe</span>
                )}
              </button>
            </div>
          </div>

          {/* Probe Error */}
          {probeError && (
            <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{probeError}</span>
            </div>
          )}

          {/* Probe Results Details */}
          {probeResult && (
            <div className="p-3.5 rounded-xl bg-[#171A1C] border border-[#252A2D] flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#252A2D]/60">
                <span className="font-medium text-[#F5F7F7] truncate max-w-[280px]">
                  {probeResult.suggestedName}
                </span>
                <span className="font-mono text-[#27C7A5] font-semibold">
                  {probeResult.fileSize > 0 ? formatBytes(probeResult.fileSize) : 'Unknown size'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#6E777A]">Range Requests:</span>
                  {probeResult.rangeSupported ? (
                    <span className="inline-flex items-center gap-1 text-[#27C7A5] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Supported (206)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#F59E0B]">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Standard Mode (200)
                    </span>
                  )}
                </div>

                {probeResult.etag && (
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[#6E777A]">ETag:</span>
                    <span className="font-mono text-[#A7AFB2] truncate">{probeResult.etag}</span>
                  </div>
                )}
              </div>

              {/* Disk Space Status */}
              {diskSpace && (
                <div className="pt-2 border-t border-[#252A2D]/40 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-[#A7AFB2]">
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Disk Available: {formatBytes(diskSpace.available)}</span>
                  </div>
                  {!diskSpace.sufficient && (
                    <span className="text-[#EF4444] font-semibold">Insufficient disk space!</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Destination Directory */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#A7AFB2] uppercase tracking-wider">
              Save Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={destinationPath}
                onChange={(e) => setDestinationPath(e.target.value)}
                placeholder="Downloads folder"
                className="flex-1 px-3 py-2 rounded-lg bg-[#171A1C] border border-[#252A2D] text-xs text-[#F5F7F7] font-mono"
              />
              <button
                onClick={handleSelectFolder}
                className="px-3 py-2 rounded-lg bg-[#171A1C] hover:bg-[#252A2D] border border-[#252A2D] text-[#A7AFB2] hover:text-[#F5F7F7] transition-colors"
                title="Browse folder"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Physical Interfaces Selection */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-[#A7AFB2] uppercase tracking-wider flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-[#27C7A5]" />
                Select Network Interfaces
              </label>
              <span className="text-[10px] text-[#6E777A]">
                {selectedInterfaceIds.length} of {interfaces.length} selected
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {interfaces.map((iface) => {
                const isSelected = selectedInterfaceIds.includes(iface.id)
                return (
                  <div
                    key={iface.id}
                    onClick={() => toggleInterfaceSelection(iface.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#171A1C] border-[#27C7A5]/50'
                        : 'bg-[#111416] border-[#252A2D] opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-[#252A2D] text-[#27C7A5] focus:ring-0 cursor-pointer"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: iface.color }}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-[#F5F7F7]">{iface.displayName}</span>
                        <span className="text-[10px] font-mono text-[#6E777A]">{iface.ipv4}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      {iface.latency > 0 && (
                        <span className="font-mono text-[10px] text-[#A7AFB2]">
                          {iface.latency}ms
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          iface.status === 'CONNECTED'
                            ? 'bg-[#27C7A5]/10 text-[#27C7A5]'
                            : 'bg-[#EF4444]/10 text-[#EF4444]'
                        }`}
                      >
                        {iface.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Connection Mode & Chunk Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[#A7AFB2] uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-[#27C7A5]" />
                Concurrency Mode
              </label>
              <select
                value={connectionMode}
                onChange={(e) => setConnectionMode(e.target.value as ConnectionMode)}
                className="px-3 py-2 rounded-lg bg-[#171A1C] border border-[#252A2D] text-xs text-[#F5F7F7] focus:outline-none focus:border-[#27C7A5]"
              >
                <option value="Auto">Auto (Dynamic Scaling)</option>
                <option value="4">4 Workers / Interface</option>
                <option value="8">8 Workers / Interface</option>
                <option value="16">16 Workers / Interface</option>
                <option value="32">32 Workers / Interface</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[#A7AFB2] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-[#27C7A5]" />
                Chunk Size
              </label>
              <select
                value={chunkSizeMb}
                onChange={(e) => setChunkSizeMb(Number(e.target.value))}
                className="px-3 py-2 rounded-lg bg-[#171A1C] border border-[#252A2D] text-xs text-[#F5F7F7] focus:outline-none focus:border-[#27C7A5]"
              >
                <option value="1">1 MB (Small files)</option>
                <option value="2">2 MB</option>
                <option value="4">4 MB</option>
                <option value="8">8 MB (Default / High speed)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#252A2D] bg-[#171A1C]/50 flex items-center justify-between">
          <button
            onClick={() => setIsNewDownloadOpen(false)}
            className="px-4 py-2 rounded-lg hover:bg-[#171A1C] text-[#A7AFB2] hover:text-[#F5F7F7] text-xs font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={startDownloadFromDialog}
            disabled={!probeUrlInput.trim() || selectedInterfaceIds.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#27C7A5] hover:bg-[#20A88B] text-[#0B0D0E] font-semibold text-xs transition-all shadow-[0_2px_12px_rgba(39,199,165,0.25)] disabled:opacity-50 active:scale-95"
          >
            <span>Start Download</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  )
}
