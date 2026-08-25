import React from 'react';

export default function BrandLogo({ className = 'h-8 w-8', size = 32 }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full drop-shadow-xs"
      >
        {/* Gradients */}
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          <linearGradient id="streamGradA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#93C5FD" />
          </linearGradient>

          <linearGradient id="streamGradB" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6EE7B7" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>

          <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Outer Background Container */}
        <rect
          width="40"
          height="40"
          rx="10"
          fill="url(#bgGrad)"
        />
        <rect
          x="0.5"
          y="0.5"
          width="39"
          height="39"
          rx="9.5"
          stroke="#60A5FA"
          strokeOpacity="0.4"
        />

        {/* Dynamic Reconciliation Stream Lines (Bank ⇄ Ledger Interlock) */}
        {/* Top Stream: Flowing Right */}
        <path
          d="M10 14.5H24C27.3137 14.5 30 17.1863 30 20.5V20.5"
          stroke="url(#streamGradA)"
          strokeWidth="2.75"
          strokeLinecap="round"
        />
        {/* Top Arrow Head */}
        <path
          d="M22 11.5L25.5 14.5L22 17.5"
          stroke="url(#streamGradA)"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Bottom Stream: Flowing Left */}
        <path
          d="M30 25.5H16C12.6863 25.5 10 22.8137 10 19.5V19.5"
          stroke="url(#streamGradB)"
          strokeWidth="2.75"
          strokeLinecap="round"
        />
        {/* Bottom Arrow Head */}
        <path
          d="M18 22.5L14.5 25.5L18 28.5"
          stroke="url(#streamGradB)"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Central Core Match Node (AI Intelligence Spark) */}
        <circle cx="20" cy="20" r="3.25" fill="#FFFFFF" filter="url(#subtleGlow)" />
        <circle cx="20" cy="20" r="1.75" fill="#10B981" />
      </svg>
    </div>
  );
}
