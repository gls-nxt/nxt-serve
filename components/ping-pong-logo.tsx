interface PingPongLogoProps {
  className?: string
}

export function PingPongLogo({ className }: PingPongLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Paddle */}
      <ellipse
        cx="45"
        cy="55"
        rx="28"
        ry="35"
        fill="currentColor"
        fillOpacity="0.9"
      />
      {/* Paddle handle */}
      <rect
        x="38"
        y="85"
        width="14"
        height="15"
        rx="3"
        fill="currentColor"
        fillOpacity="0.7"
      />
      {/* Ball */}
      <circle
        cx="75"
        cy="25"
        r="12"
        fill="currentColor"
      />
      {/* Ball shine */}
      <circle
        cx="71"
        cy="21"
        r="3"
        fill="white"
        fillOpacity="0.4"
      />
    </svg>
  )
}
