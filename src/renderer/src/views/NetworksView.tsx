import React from 'react'
import {
  Network,
  RefreshCw,
  Edit2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap,
  Activity,
  Sliders,
  ExternalLink
} from 'lucide-react'
import { useFluxeraStore } from '../store/useFluxeraStore'
import { formatBytes, formatSpeed } from '../utils/format'

export const NetworksView: React.FC = () => {
  const { interfaces, refreshInterfaces, setEditingInterface } = useFluxeraStore()

  return (
    <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 max-w-6xl mx-auto w-full select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F5F7F7]">Network Center</h1>
          <p className="text-xs text-[#6E777A]">
            Discover, bind, and configure physical network interfaces
          </p>
        </div>

        <button
          onClick={refreshInterfaces}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#171A1C] hover:bg-[#252A2D] border border-[#252A2D] text-xs text-[#F5F7F7] font-medium transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#27C7A5]" />
          <span>Refresh Interfaces</span>
        </button>
      </div>

      {/* Network Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {interfaces.map((iface) => (
          <div
            key={iface.id}
            className="p-5 rounded-2xl bg-[#111416] border border-[#252A2D] flex flex-col justify-between gap-4 transition-all hover:border-[#27C7A5]/40"
          >
            {/* Card Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                  style={{ backgroundColor: iface.color }}
                >
                  <Network className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#F5F7F7]">
                      {iface.displayName}
                    </span>
                    <span
                      className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        iface.status === 'CONNECTED'
                          ? 'bg-[#27C7A5]/15 text-[#27C7A5] border border-[#27C7A5]/30'
                          : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                      }`}
                    >
                      {iface.status}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#6E777A]">
                    {iface.originalName} • {iface.type.toUpperCase()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setEditingInterface(iface)}
                className="p-1.5 rounded-lg text-[#6E777A] hover:text-[#F5F7F7] hover:bg-[#171A1C] transition-colors"
                title="Edit interface name & color"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#171A1C] border border-[#252A2D]/60 text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#6E777A] uppercase tracking-wider">Speed</span>
                <span className="font-mono font-bold text-sm text-[#27C7A5] mt-0.5">
                  {formatSpeed(iface.speed)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#6E777A] uppercase tracking-wider">Latency</span>
                <span className="font-mono text-sm text-[#F5F7F7] mt-0.5">
                  {iface.latency > 0 ? `${iface.latency} ms` : '—'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#6E777A] uppercase tracking-wider">Workers</span>
                <span className="font-mono text-sm text-[#F5F7F7] mt-0.5">
                  {iface.activeWorkers} active
                </span>
              </div>
            </div>

            {/* Technical Details Footer */}
            <div className="flex flex-col gap-1.5 pt-1 text-[11px] font-mono text-[#A7AFB2] border-t border-[#252A2D]/40">
              <div className="flex justify-between">
                <span className="text-[#6E777A]">Local IPv4:</span>
                <span className="text-[#F5F7F7]">{iface.ipv4}</span>
              </div>
              {iface.mac && (
                <div className="flex justify-between">
                  <span className="text-[#6E777A]">Hardware MAC:</span>
                  <span>{iface.mac}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#6E777A]">Transferred:</span>
                <span className="text-[#27C7A5] font-semibold">
                  {formatBytes(iface.bytesTransferred)} ({iface.chunkCount} chunks)
                </span>
              </div>
            </div>
          </div>
        ))}

        {interfaces.length === 0 && (
          <div className="col-span-full p-8 rounded-xl border border-[#252A2D] bg-[#111416]/50 text-center text-xs text-[#A7AFB2]">
            No physical network interfaces detected. Click "Refresh Interfaces" to retry.
          </div>
        )}
      </div>

      {/* Platform Documentation & Setup Guides */}
      <div className="flex flex-col gap-4 pt-4 border-t border-[#252A2D]">
        <h2 className="text-sm font-semibold text-[#F5F7F7] flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#27C7A5]" />
          Platform Multi-Network Hardware Guides
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* macOS Android TetherKit Guide */}
          <div className="p-4 rounded-xl bg-[#111416] border border-[#252A2D] flex flex-col gap-2.5">
            <span className="font-semibold text-[#F5F7F7] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              macOS — Android USB Tethering (RNDIS)
            </span>
            <p className="text-[#A7AFB2] leading-relaxed">
              macOS does not natively expose Android USB tethering through the standard RNDIS
              protocol. To use an Android device as an additional physical connection on macOS:
            </p>
            <div className="p-2.5 rounded-lg bg-[#171A1C] border border-[#252A2D] font-mono text-[11px] text-[#27C7A5]">
              brew install XiaoMiku01/tap/tetherkit
            </div>
            <ol className="list-decimal list-inside text-[#6E777A] space-y-1 text-[11px]">
              <li>Connect your Android phone via USB and enable USB Tethering</li>
              <li>Ensure TetherKit is running to bridge RNDIS</li>
              <li>Launch Fluxera and click "Refresh Interfaces" to detect the new device</li>
            </ol>
          </div>

          {/* Windows Multi-Homing Guide */}
          <div className="p-4 rounded-xl bg-[#111416] border border-[#252A2D] flex flex-col gap-2.5">
            <span className="font-semibold text-[#F5F7F7] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F97316]" />
              Windows — Simultaneous Wi-Fi & Ethernet
            </span>
            <p className="text-[#A7AFB2] leading-relaxed">
              Some Windows laptops or policies may automatically disable Wi-Fi when an Ethernet
              cable is connected. To keep both active simultaneously:
            </p>
            <ul className="list-disc list-inside text-[#6E777A] space-y-1 text-[11px]">
              <li>Open Group Policy Editor: <code className="text-[#F5F7F7] font-mono">gpedit.msc</code></li>
              <li>Navigate to: Computer Configuration &gt; Administrative Templates &gt; Network &gt; Windows Connection Manager</li>
              <li>Set "Prohibit connection to non-domain networks when connected to domain" to Disabled</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
