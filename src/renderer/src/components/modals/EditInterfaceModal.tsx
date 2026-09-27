import React, { useState, useEffect } from 'react'
import { X, Network, Palette, Check } from 'lucide-react'
import { useFluxeraStore } from '../../store/useFluxeraStore'

const COLOR_PALETTE = [
  '#27C7A5', // teal / brand
  '#3B82F6', // blue
  '#F97316', // orange
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#10B981', // emerald
  '#EAB308', // amber
  '#06B6D4'  // cyan
]

export const EditInterfaceModal: React.FC = () => {
  const { editingInterface, setEditingInterface, updateInterface } = useFluxeraStore()

  const [displayName, setDisplayName] = useState('')
  const [color, setColor] = useState('#27C7A5')
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    if (editingInterface) {
      setDisplayName(editingInterface.displayName)
      setColor(editingInterface.color)
      setEnabled(editingInterface.enabled)
    }
  }, [editingInterface])

  if (!editingInterface) return null

  const handleSave = () => {
    updateInterface(editingInterface.id, {
      displayName: displayName.trim() || editingInterface.originalName,
      color,
      enabled
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-[#111416] border border-[#252A2D] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#252A2D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: color }}
            >
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#F5F7F7]">Customize Interface</h2>
              <p className="text-[11px] text-[#6E777A] font-mono">
                {editingInterface.originalName} ({editingInterface.ipv4})
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditingInterface(null)}
            className="p-1 rounded-lg text-[#6E777A] hover:text-[#F5F7F7] hover:bg-[#171A1C] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          {/* Display Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#A7AFB2] uppercase tracking-wider">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Home Wi-Fi or USB Tether"
              className="px-3 py-2 rounded-lg bg-[#171A1C] border border-[#252A2D] text-xs text-[#F5F7F7] focus:outline-none focus:border-[#27C7A5]"
            />
          </div>

          {/* Color Palette */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#A7AFB2] uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              Interface Color
            </label>
            <div className="flex items-center gap-2 pt-1">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                    color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111416]' : ''
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Enable / Disable for Downloads */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#171A1C] border border-[#252A2D]">
            <div className="flex flex-col">
              <span className="font-medium text-[#F5F7F7]">Enable for downloads</span>
              <span className="text-[11px] text-[#6E777A]">
                Include this interface in concurrent worker pool
              </span>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-[#252A2D] text-[#27C7A5] focus:ring-0 cursor-pointer"
            />
          </div>

          {/* Technical Specs Summary */}
          <div className="p-3 rounded-lg bg-[#171A1C]/50 border border-[#252A2D]/60 text-[11px] flex flex-col gap-1 text-[#6E777A] font-mono">
            <div>Hardware Name: {editingInterface.originalName}</div>
            <div>IPv4 Address: {editingInterface.ipv4}</div>
            {editingInterface.ipv6 && <div>IPv6 Address: {editingInterface.ipv6}</div>}
            {editingInterface.mac && <div>MAC Address: {editingInterface.mac}</div>}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-[#252A2D] bg-[#171A1C]/50 flex items-center justify-between">
          <button
            onClick={() => setEditingInterface(null)}
            className="px-4 py-1.5 rounded-lg hover:bg-[#171A1C] text-[#A7AFB2] hover:text-[#F5F7F7] text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-[#27C7A5] hover:bg-[#20A88B] text-[#0B0D0E] font-semibold text-xs transition-all shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
