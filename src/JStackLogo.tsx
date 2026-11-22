type JStackLogoProps = {
  compact?: boolean
  className?: string
}

export function JStackLogo({ compact = false, className = '' }: JStackLogoProps) {
  return (
    <svg
      className={`jstack-logo ${compact ? 'jstack-logo-compact' : ''} ${className}`}
      viewBox={compact ? '0 0 52 52' : '0 0 214 52'}
      role="img"
      aria-label="JStack"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="jstack-green-front" x1="8" y1="6" x2="43" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#83E9B5" />
          <stop offset=".42" stopColor="#39C98A" />
          <stop offset="1" stopColor="#16885A" />
        </linearGradient>
        <linearGradient id="jstack-green-side" x1="38" y1="12" x2="50" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#62DDA7" />
          <stop offset="1" stopColor="#107247" />
        </linearGradient>
        <linearGradient id="jstack-green-highlight" x1="10" y1="8" x2="35" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D7FFF0" stopOpacity=".9" />
          <stop offset=".55" stopColor="#62DDA7" stopOpacity=".12" />
          <stop offset="1" stopColor="#16885A" stopOpacity="0" />
        </linearGradient>
        <filter id="jstack-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor="#07120D" floodOpacity=".24" />
        </filter>
      </defs>

      <g className="jstack-symbol" filter="url(#jstack-shadow)">
        <path d="M26 5 43 13.2 26 21.4 9 13.2 26 5Z" fill="#62DDA7" />
        <path d="M9 13.2 26 21.4V27L9 18.8v-5.6Z" fill="#16885A" />
        <path d="M43 13.2 26 21.4V27l17-8.2v-5.6Z" fill="url(#jstack-green-side)" />

        <path d="M26 23.2 43 31.4 26 39.6 9 31.4l17-8.2Z" fill="url(#jstack-green-front)" />
        <path d="M9 31.4 26 39.6V45.2L9 37v-5.6Z" fill="#16885A" />
        <path d="M43 31.4 26 39.6V45.2L43 37v-5.6Z" fill="#107247" />

        <path d="M20.2 13.8h10.8v18.6c0 6.7-3.4 10.5-9.8 10.5-4.7 0-7.8-2.2-9.2-5.9l5.6-2.9c.7 1.6 1.7 2.4 3.3 2.4 2.2 0 3.2-1.3 3.2-4.1V13.8h-3.9Z" fill="url(#jstack-green-front)" />
        <path d="M20.2 13.8h3.9v19.1c0 4.7-1.6 7.6-5.1 8.9-.4-.1-.8-.3-1.1-.5 1.5-.9 2.3-2.5 2.3-5V13.8Z" fill="url(#jstack-green-highlight)" />
        <path d="M13.2 17.5 20.2 13.8l4.2 2.1-7 3.7-4.2-2.1Z" fill="#B7F7D8" opacity=".72" />
      </g>

      {!compact && (
        <g className="jstack-wordmark" aria-hidden="true">
          <text x="58" y="38" fontFamily="Inter, 'Segoe UI', sans-serif" fontSize="34" fontWeight="720" letterSpacing="-1.8">
            <tspan className="jstack-wordmark-j">j</tspan><tspan>stack</tspan>
          </text>
        </g>
      )}
    </svg>
  )
}
