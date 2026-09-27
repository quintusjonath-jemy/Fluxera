import React from 'react'

interface LogoProps {
  className?: string
  size?: number
  showText?: boolean
}

export const FluxeraLogo: React.FC<LogoProps> = ({
  className = '',
  size = 28,
  showText = true
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="streamGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#27C7A5" />
            <stop offset="100%" stopColor="#169D80" />
          </linearGradient>
          <linearGradient id="streamGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#27C7A5" />
          </linearGradient>
          <linearGradient id="streamGrad3" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#27C7A5" />
          </linearGradient>
        </defs>

        {/* Outer subtle shield frame */}
        <rect
          x="3"
          y="3"
          width="34"
          height="34"
          rx="9"
          className="stroke-[#252A2D] dark:stroke-[#252A2D] stroke-[1.2]"
          fill="none"
        />

        {/* Convergent Streams: Wi-Fi (Top), Ethernet (Middle), USB Tether (Bottom) */}
        <path
          d="M 9 12 C 16 12 18 20 25 20"
          stroke="url(#streamGrad1)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 8 20 L 25 20"
          stroke="url(#streamGrad2)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 9 28 C 16 28 18 20 25 20"
          stroke="url(#streamGrad3)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Central Converged Node / Accelerator Core */}
        <path
          d="M 27 20 L 33 20"
          stroke="#27C7A5"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="26" cy="20" r="3" fill="#27C7A5" />
        <circle cx="33" cy="20" r="1.5" fill="#FFFFFF" />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className="font-semibold tracking-wider text-base uppercase bg-gradient-to-r from-[#27C7A5] to-[#76EAD2] bg-clip-text text-transparent">
            Fluxera
          </span>
          <span className="text-[9px] tracking-tight text-[#6E777A] font-mono leading-none -mt-0.5">
            CONCURRENT ENGINE
          </span>
        </div>
      )}
    </div>
  )
}
