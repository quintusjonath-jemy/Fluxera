import React from 'react'
import {
  Home,
  Download,
  Network,
  Activity,
  History,
  Settings,
  Cpu,
  Info,
  Sun,
  Moon
} from 'lucide-react'
import { FluxeraLogo } from '../common/FluxeraLogo'
import { useFluxeraStore, NavTab } from '../../store/useFluxeraStore'

export const Sidebar: React.FC = () => {
  const { currentTab, setCurrentTab, downloads, interfaces, theme, toggleTheme } =
    useFluxeraStore()

  const activeDownloadsCount = downloads.filter(
    (d) => d.state === 'DOWNLOADING' || d.state === 'RESUMING'
  ).length

  const activeNetworksCount = interfaces.filter(
    (i) => i.enabled && (i.status === 'CONNECTED' || i.status === 'AVAILABLE')
  ).length

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: number | string }[] = [
    { id: 'home', label: 'Home', icon: Home },
    {
      id: 'downloads',
      label: 'Downloads',
      icon: Download,
      badge: activeDownloadsCount > 0 ? activeDownloadsCount : undefined
    },
    {
      id: 'networks',
      label: 'Networks',
      icon: Network,
      badge: activeNetworksCount > 0 ? activeNetworksCount : undefined
    },
    { id: 'monitor', label: 'Monitor', icon: Activity },
    { id: 'history', label: 'History', icon: History }
  ]

  const secondaryNavItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'diagnostics', label: 'Diagnostics', icon: Cpu },
    { id: 'about', label: 'About', icon: Info }
  ]

  return (
    <aside className="w-56 shrink-0 h-screen bg-[#111416] border-r border-[#252A2D] flex flex-col justify-between select-none">
      {/* Top Header & Logo */}
      <div className="flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-[#252A2D]/60">
          <FluxeraLogo size={30} />
        </div>

        {/* Main Navigation */}
        <nav className="p-3 flex flex-col gap-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6E777A]">
            Core
          </div>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#27C7A5]/10 text-[#27C7A5] font-semibold border border-[#27C7A5]/30 shadow-sm'
                    : 'text-[#A7AFB2] hover:text-[#F5F7F7] hover:bg-[#171A1C]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#27C7A5]' : 'text-[#6E777A]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-[#27C7A5] text-[#0B0D0E] font-bold'
                        : 'bg-[#171A1C] text-[#A7AFB2] border border-[#252A2D]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* System Navigation */}
        <nav className="px-3 pt-2 flex flex-col gap-1 border-t border-[#252A2D]/40">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6E777A]">
            System
          </div>
          {secondaryNavItems.map((item) => {
            const Icon = item.icon
            const isActive = currentTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#27C7A5]/10 text-[#27C7A5] font-semibold border border-[#27C7A5]/30'
                    : 'text-[#A7AFB2] hover:text-[#F5F7F7] hover:bg-[#171A1C]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#27C7A5]' : 'text-[#6E777A]'}`} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer: Theme Toggle & Version */}
      <div className="p-3 border-t border-[#252A2D] flex items-center justify-between text-xs text-[#6E777A]">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#171A1C] hover:text-[#F5F7F7] transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-[#F59E0B]" />
          ) : (
            <Moon className="w-4 h-4 text-[#3B82F6]" />
          )}
          <span className="capitalize text-[11px]">{theme}</span>
        </button>

        <span className="font-mono text-[10px] text-[#6E777A]">v1.0.0</span>
      </div>
    </aside>
  )
}
