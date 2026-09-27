import React from 'react'
import { Plus, Search, Radio, Wifi, Zap } from 'lucide-react'
import { useFluxeraStore } from '../../store/useFluxeraStore'
import { formatSpeed } from '../../utils/format'

export const TopBar: React.FC = () => {
  const {
    interfaces,
    downloads,
    searchQuery,
    setSearchQuery,
    setIsNewDownloadOpen,
    setCurrentTab
  } = useFluxeraStore()

  const activeInterfaces = interfaces.filter(
    (i) => i.enabled && (i.status === 'CONNECTED' || i.status === 'AVAILABLE')
  )

  const activeDownloads = downloads.filter((d) => d.state === 'DOWNLOADING')
  const totalCombinedSpeed = activeDownloads.reduce((acc, d) => acc + (d.currentSpeed || 0), 0)

  return (
    <header className="h-16 px-6 border-b border-[#252A2D] bg-[#111416]/70 backdrop-blur-md flex items-center justify-between gap-4 shrink-0 select-none">
      {/* Global Network Availability Indicator */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCurrentTab('networks')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#171A1C] border border-[#252A2D] hover:border-[#27C7A5]/40 transition-colors text-xs"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              activeInterfaces.length > 0
                ? 'bg-[#27C7A5] shadow-[0_0_8px_#27C7A5]'
                : 'bg-[#EF4444]'
            }`}
          />
          <span className="font-medium text-[#F5F7F7]">
            {activeInterfaces.length}{' '}
            {activeInterfaces.length === 1 ? 'Network' : 'Networks'} Active
          </span>
        </button>

        {totalCombinedSpeed > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#27C7A5]/10 border border-[#27C7A5]/30 text-xs font-mono text-[#27C7A5] font-semibold animate-pulse">
            <Zap className="w-3.5 h-3.5" />
            <span>Combined: {formatSpeed(totalCombinedSpeed)}</span>
          </div>
        )}
      </div>

      {/* Global Search Input & Actions */}
      <div className="flex items-center gap-3">
        <div className="relative w-48 sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E777A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search downloads, files..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#171A1C] border border-[#252A2D] text-xs text-[#F5F7F7] placeholder-[#6E777A] focus:outline-none focus:border-[#27C7A5] transition-colors"
          />
        </div>

        <button
          onClick={() => setIsNewDownloadOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#27C7A5] hover:bg-[#20A88B] text-[#0B0D0E] font-semibold text-xs transition-all shadow-[0_2px_10px_rgba(39,199,165,0.2)] active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Download</span>
        </button>
      </div>
    </header>
  )
}
