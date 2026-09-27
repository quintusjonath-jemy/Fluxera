import React from 'react'
import { FluxeraLogo } from '../components/common/FluxeraLogo'
import { ShieldCheck, Heart, ExternalLink, Code } from 'lucide-react'

export const AboutView: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center max-w-2xl mx-auto w-full text-center select-none gap-6">
      <div className="p-4 rounded-3xl bg-[#111416] border border-[#252A2D] shadow-2xl">
        <FluxeraLogo size={64} showText={false} />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold text-[#F5F7F7] tracking-tight">Fluxera</h1>
        <p className="text-xs font-mono text-[#27C7A5] font-semibold">
          Every connection. One faster download.
        </p>
        <p className="text-xs text-[#6E777A] font-mono">Version 1.0.0 (Production Release)</p>
      </div>

      <p className="text-xs text-[#A7AFB2] leading-relaxed max-w-md">
        A multi-network desktop download manager that intelligently distributes file ranges
        across independent physical network connections without requiring packet bonding or VPN
        tunnels.
      </p>

      {/* Tech Stack Pillars */}
      <div className="w-full p-4 rounded-2xl bg-[#111416] border border-[#252A2D] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[#6E777A] uppercase font-semibold">Runtime</span>
          <span className="font-medium text-[#F5F7F7]">Electron 34</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[#6E777A] uppercase font-semibold">Frontend</span>
          <span className="font-medium text-[#F5F7F7]">React 19 + TS</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[#6E777A] uppercase font-semibold">Styling</span>
          <span className="font-medium text-[#F5F7F7]">Tailwind CSS v4</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[#6E777A] uppercase font-semibold">State</span>
          <span className="font-medium text-[#F5F7F7]">Zustand</span>
        </div>
      </div>

      {/* License & Ethics */}
      <div className="flex flex-col gap-2 text-[11px] text-[#6E777A]">
        <div className="flex items-center justify-center gap-1.5 text-[#27C7A5]">
          <ShieldCheck className="w-4 h-4" />
          <span className="font-medium">Open Source Software under the MIT License</span>
        </div>
        <p>© 2026 Fluxera Project Contributors. Built for cross-platform speed and stability.</p>
      </div>
    </div>
  )
}
