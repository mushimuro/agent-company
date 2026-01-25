interface HexagonLogoProps {
  size?: number;
  className?: string;
}

export const HexagonLogo = ({ size = 120, className = '' }: HexagonLogoProps) => {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Outer hexagon */}
        <polygon
          points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-[--color-accent-primary]"
        />
        
        {/* Inner hexagon */}
        <polygon
          points="50,15 80,32.5 80,67.5 50,85 20,67.5 20,32.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-[--color-accent-primary]"
          opacity="0.6"
        />
        
        {/* Optional: Add a glow effect */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Center dot or symbol (optional) */}
        <circle
          cx="50"
          cy="50"
          r="4"
          fill="currentColor"
          className="text-[--color-accent-primary]"
        />
      </svg>
    </div>
  );
};
