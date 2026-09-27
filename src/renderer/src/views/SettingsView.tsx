import React, { useState, useEffect } from 'react'
import {
  Settings,
  FolderOpen,
  Bell,
  Sun,
  Moon,
  Layers,
  Cpu,
  Clock,
  ShieldCheck,
  Save
} from 'lucide-react'
import { useFluxeraStore } from '../store/useFluxeraStore'
import { ConnectionMode } from '../../../shared/types'

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, theme, setTheme } = useFluxeraStore()

  const [downloadDir, setDownloadDir] = useState('')
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('Auto')
  const [chunkSizeMb, setChunkSizeMb] = useState<number>(8)
  const [maxWorkers, setMaxWorkers] = useState<number>(16)
  const [retryLimit, setRetryLimit] = useState<number>(5)
  const [stallTimeout, setStallTimeout] = useState<number>(20)
  const [notifications, setNotifications] = useState<boolean>(true)

  useEffect(() => {
    if (settings) {
      setDownloadDir(settings.defaultDownloadDir || '')
      setConnectionMode(settings.defaultConnectionMode || 'Auto')
      setChunkSizeMb(Math.round((settings.chunkSize || 8 * 1024 * 1024) / (1024 * 1024)))
      setMaxWorkers(settings.maxConnectionsPerInterface || 16)
      setRetryLimit(settings.retryLimit || 5)
      setStallTimeout(settings.stallTimeout || 20)
      setNotifications(settings.notificationsEnabled ?? true)
    }
  }, [settings])

  const handleSelectFolder = async () => {
    if (window.fluxera) {
      const folder = await window.fluxera.selectFolder()
      if (folder) {
        setDownloadDir(folder)
      }
    }
  }

  const handleSave = () => {
    updateSettings({
      defaultDownloadDir: downloadDir,
      defaultConnectionMode: connectionMode,
      chunkSize: chunkSizeMb * 1024 * 1024,
      maxConnectionsPerInterface: maxWorkers,
      retryLimit,
      stallTimeout,
      notificationsEnabled: notifications
    })
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 max-w-4xl mx-auto w-full select-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#F5F7F7]">Application Settings</h1>
          <p className="text-xs text-[#6E777A]">Configure download engine and system behavior</p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#27C7A5] hover:bg-[#20A88B] text-[#0B0D0E] font-semibold text-xs transition-all shadow-md active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      <div className="flex flex-col gap-5 text-xs">
        {/* General Section */}
        <div className="p-5 rounded-2xl bg-[#111416] border border-[#252A2D] flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-[#F5F7F7] uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#27C7A5]" />
            General & Storage
          </h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#A7AFB2]">
              Default Download Directory
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={downloadDir}
                onChange={(e) => setDownloadDir(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-[#171A1C] border border-[#252A2D] text-xs text-[#F5F7F7] font-mono focus:outline-none focus:border-[#27C7A5]"
              />
              <button
                onClick={handleSelectFolder}
                className="px-3 py-2 rounded-lg bg-[#171A1C] hover:bg-[#252A2D] border border-[#252A2D] text-[#A7AFB2] hover:text-[#F5F7F7] transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#252A2D]/40">
            <div className="flex flex-col">
              <span className="font-medium text-[#F5F7F7]">Desktop Notifications</span>
              <span className="text-[11px] text-[#6E777A]">
                Receive OS notifications when downloads finish or need attention
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="w-4 h-4 rounded border-[#252A2D] text-[#27C7A5] focus:ring-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Performance & Concurrency Section */}
        <div className="p-5 rounded-2xl bg-[#111416] border border-[#252A2D] flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-[#F5F7F7] uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#27C7A5]" />
            Performance & Networking Engine
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[#A7AFB2]">
                Default Concurrency Mode
              </label>
              <select
                value={connectionMode}
                onChange={(e) => setConnectionMode(e.target.value as ConnectionMode)}
                className="px-3 py-2 rounded-lg bg-[#171A1C] border border-[#252A2D] text-xs text-[#F5F7F7] focus:outline-none focus:border-[#27C7A5]"
              >
                <option value="Auto">Auto (Dynamic Scaling 4–32)</option>
                <option value="4">Fixed 4 Workers / Interface</option>
                <option value="8">Fixed 8 Workers / Interface</option>
                <option value="16">Fixed 16 Workers / Interface</option>
                <option value="32">Fixed 32 Workers / Interface</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[#A7AFB2]">
                Atomic Chunk Size
              </label>
              <select
                value={chunkSizeMb}
                onChange={(e) => setChunkSizeMb(Number(e.target.value))}
                className="px-3 py-2 rounded-lg bg-[#171A1C] border border-[#252A2D] text-xs text-[#F5F7F7] focus:outline-none focus:border-[#27C7A5]"
              >
                <option value="1">1 MB</option>
                <option value="2">2 MB</option>
                <option value="4">4 MB</option>
                <option value="8">8 MB (Recommended default)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[#A7AFB2]">
                Watchdog Stall Timeout (Seconds)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={stallTimeout}
                onChange={(e) => setStallTimeout(Number(e.target.value))}
                className="px-3 py-2 rounded-lg bg-[#171A1C] border border-[#252A2D] text-xs text-[#F5F7F7] font-mono focus:outline-none focus:border-[#27C7A5]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[#A7AFB2]">
                Maximum Chunk Retries
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={retryLimit}
                onChange={(e) => setRetryLimit(Number(e.target.value))}
                className="px-3 py-2 rounded-lg bg-[#171A1C] border border-[#252A2D] text-xs text-[#F5F7F7] font-mono focus:outline-none focus:border-[#27C7A5]"
              />
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="p-5 rounded-2xl bg-[#111416] border border-[#252A2D] flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-[#F5F7F7] uppercase tracking-wider flex items-center gap-2">
            <Sun className="w-4 h-4 text-[#27C7A5]" />
            Appearance & Visual Theme
          </h2>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${
                theme === 'dark'
                  ? 'bg-[#171A1C] border-[#27C7A5] text-[#27C7A5]'
                  : 'bg-[#111416] border-[#252A2D] text-[#A7AFB2]'
              }`}
            >
              <Moon className="w-5 h-5" />
              <div className="flex flex-col text-left">
                <span className="font-semibold text-xs text-[#F5F7F7]">Dark First (Graphite)</span>
                <span className="text-[10px] text-[#6E777A]">
                  Deep graphite #0B0D0E background with teal accents
                </span>
              </div>
            </button>

            <button
              onClick={() => setTheme('light')}
              className={`flex-1 p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${
                theme === 'light'
                  ? 'bg-[#171A1C] border-[#27C7A5] text-[#27C7A5]'
                  : 'bg-[#111416] border-[#252A2D] text-[#A7AFB2]'
              }`}
            >
              <Sun className="w-5 h-5 text-[#F59E0B]" />
              <div className="flex flex-col text-left">
                <span className="font-semibold text-xs text-[#F5F7F7]">Light Mode</span>
                <span className="text-[10px] text-[#6E777A]">Clean high-contrast daytime palette</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
