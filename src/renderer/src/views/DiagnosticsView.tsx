import React, { useState, useEffect } from 'react'
import {
  Cpu,
  Terminal,
  Trash2,
  Download,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react'
import { DiagnosticsInfo } from '../../../shared/types'
import { useFluxeraStore } from '../store/useFluxeraStore'

export const DiagnosticsView: React.FC = () => {
  const { showToast } = useFluxeraStore()
  const [diagnostics, setDiagnostics] = useState<DiagnosticsInfo | null>(null)
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [copied, setCopied] = useState(false)

  const fetchDiagnostics = async () => {
    if (window.fluxera) {
      try {
        const data = await window.fluxera.getDiagnostics()
        setDiagnostics(data)
      } catch (err) {
        console.error('Failed to get diagnostics:', err)
      }
    }
  }

  useEffect(() => {
    fetchDiagnostics()
    const timer = setInterval(fetchDiagnostics, 3000)
    return () => clearInterval(timer)
  }, [])

  const handleClearLogs = async () => {
    if (window.fluxera) {
      await window.fluxera.clearLogs()
      fetchDiagnostics()
      showToast('Diagnostic logs cleared', 'info')
    }
  }

  const handleExport = () => {
    if (!diagnostics) return
    const exportStr = JSON.stringify(diagnostics, null, 2)
    navigator.clipboard.writeText(exportStr)
    setCopied(true)
    showToast('Diagnostics JSON copied to clipboard', 'success')
    setTimeout(() => setCopied(false), 3000)
  }

  const filteredLogs = (diagnostics?.logs || []).filter((log) => {
    if (filterLevel === 'all') return true
    return log.level === filterLevel
  })

  return (
    <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 max-w-6xl mx-auto w-full select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F5F7F7]">Diagnostics & Environment</h1>
          <p className="text-xs text-[#6E777A]">
            Low-level networking telemetry, system routes, and engine runtime logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171A1C] hover:bg-[#252A2D] border border-[#252A2D] text-xs text-[#F5F7F7] font-medium transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#27C7A5]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Export Diagnostics</span>
          </button>
          <button
            onClick={handleClearLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171A1C] hover:bg-[#EF4444]/20 border border-[#252A2D] text-xs text-[#6E777A] hover:text-[#EF4444] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* System Specifications Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#111416] border border-[#252A2D] flex flex-col gap-1">
          <span className="text-[10px] uppercase font-semibold text-[#6E777A]">Platform</span>
          <span className="text-xs font-mono font-medium text-[#F5F7F7] truncate">
            {diagnostics?.platform || 'Detecting...'}
          </span>
          <span className="text-[10px] font-mono text-[#A7AFB2]">{diagnostics?.arch}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#111416] border border-[#252A2D] flex flex-col gap-1">
          <span className="text-[10px] uppercase font-semibold text-[#6E777A]">Electron</span>
          <span className="text-xs font-mono font-medium text-[#27C7A5]">
            v{diagnostics?.electronVersion}
          </span>
          <span className="text-[10px] font-mono text-[#A7AFB2]">Node v{diagnostics?.nodeVersion}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#111416] border border-[#252A2D] flex flex-col gap-1">
          <span className="text-[10px] uppercase font-semibold text-[#6E777A]">
            Active Sessions
          </span>
          <span className="text-xs font-mono font-medium text-[#F5F7F7]">
            {diagnostics?.activeDownloadsCount} downloading
          </span>
          <span className="text-[10px] font-mono text-[#A7AFB2]">
            {diagnostics?.totalCompletedCount} completed
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#111416] border border-[#252A2D] flex flex-col gap-1">
          <span className="text-[10px] uppercase font-semibold text-[#6E777A]">
            Bound Interfaces
          </span>
          <span className="text-xs font-mono font-medium text-[#27C7A5]">
            {diagnostics?.detectedInterfaces.length} available
          </span>
          <span className="text-[10px] font-mono text-[#A7AFB2]">Direct socket binding</span>
        </div>
      </div>

      {/* Diagnostics Logs Feed */}
      <div className="rounded-2xl border border-[#252A2D] bg-[#111416] overflow-hidden flex flex-col">
        <div className="p-3.5 border-b border-[#252A2D] bg-[#171A1C]/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#27C7A5]" />
            <span className="font-semibold text-[#F5F7F7]">Engine Diagnostic Logs</span>
            <span className="text-[11px] font-mono text-[#6E777A]">
              ({filteredLogs.length} events)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#A7AFB2]">Filter Level:</span>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-2 py-1 rounded bg-[#111416] border border-[#252A2D] text-[11px] text-[#F5F7F7]"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warn">Warnings</option>
              <option value="error">Errors</option>
            </select>
          </div>
        </div>

        <div className="p-3 max-h-[380px] overflow-y-auto font-mono text-[11px] flex flex-col gap-1">
          {filteredLogs.map((log, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 py-1 px-2 rounded hover:bg-[#171A1C]/50 transition-colors"
            >
              <span className="text-[#6E777A] shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span
                className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded shrink-0 ${
                  log.level === 'error'
                    ? 'bg-[#EF4444]/20 text-[#EF4444]'
                    : log.level === 'warn'
                      ? 'bg-[#F59E0B]/20 text-[#F59E0B]'
                      : 'bg-[#27C7A5]/10 text-[#27C7A5]'
                }`}
              >
                {log.level}
              </span>
              <span className="text-[#A7AFB2] font-semibold shrink-0">[{log.category}]</span>
              <span className="text-[#F5F7F7] break-all">{log.message}</span>
            </div>
          ))}

          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-xs text-[#6E777A]">
              No diagnostic events match the current filter.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
