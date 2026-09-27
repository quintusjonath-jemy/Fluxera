import React from 'react'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { useFluxeraStore } from '../../store/useFluxeraStore'

export const Toast: React.FC = () => {
  const { toast } = useFluxeraStore()
  if (!toast) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div
        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs font-medium backdrop-blur-md ${
          toast.type === 'success'
            ? 'bg-[#16372F]/90 border-[#27C7A5]/40 text-[#27C7A5]'
            : toast.type === 'error'
              ? 'bg-[#3F1218]/90 border-[#EF4444]/40 text-[#EF4444]'
              : 'bg-[#171A1C]/90 border-[#252A2D] text-[#F5F7F7]'
        }`}
      >
        {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-[#27C7A5]" />}
        {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />}
        {toast.type === 'info' && <Info className="w-4 h-4 shrink-0 text-[#3B82F6]" />}
        <span>{toast.message}</span>
      </div>
    </div>
  )
}
