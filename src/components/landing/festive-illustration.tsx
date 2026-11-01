export function FestiveIllustration() {
  return (
    <svg
      viewBox="0 0 600 220"
      role="img"
      aria-labelledby="festive-scene-title festive-scene-description"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <title id="festive-scene-title">A colorful celebration mandap</title>
      <desc id="festive-scene-description">
        A floral arch with marigold garlands, glowing lamps, and peacock, rose,
        and indigo details.
      </desc>
      <defs>
        <linearGradient id="festive-scene-wash" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#6C63C7" stopOpacity=".22" />
          <stop offset="52%" stopColor="#E35D7E" stopOpacity=".16" />
          <stop offset="100%" stopColor="#F2A900" stopOpacity=".24" />
        </linearGradient>
        <linearGradient id="festive-scene-arch" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#E35D7E" />
          <stop offset="100%" stopColor="#6C63C7" />
        </linearGradient>
      </defs>
      <rect width="600" height="220" fill="hsl(var(--background))" />
      <rect width="600" height="220" fill="url(#festive-scene-wash)" />
      <circle cx="92" cy="48" r="44" fill="hsl(var(--accent))" opacity=".18" />
      <circle cx="510" cy="36" r="58" fill="#0F7C78" opacity=".16" />

      <path
        d="M142 205V116a158 158 0 0 1 316 0v89h-38v-89a120 120 0 0 0-240 0v89z"
        fill="url(#festive-scene-arch)"
        opacity=".88"
      />
      <path
        d="M183 205v-88a77 77 0 0 1 154 0v88z"
        fill="hsl(var(--background))"
        opacity=".88"
      />
      <path
        d="M263 205v-60a37 37 0 0 1 74 0v60z"
        fill="#0F7C78"
        opacity=".72"
      />
      <path d="M300 205v-56a37 37 0 0 1 37-37v93z" fill="#6C63C7" opacity=".58" />

      <path className="animate-landing-garland" style={{ transformBox: "fill-box", transformOrigin: "center top" }} d="M128 74Q300 150 472 74" fill="none" stroke="hsl(var(--accent))" strokeWidth="5" />
      <path className="animate-landing-garland" style={{ animationDelay: "-3s", transformBox: "fill-box", transformOrigin: "center top" }} d="M145 62Q300 133 455 62" fill="none" stroke="#0F7C78" strokeWidth="3" />
      {[155, 190, 225, 260, 295, 330, 365, 400, 435].map((x, index) => (
        <g key={x}>
          <path
            d={`M${x} ${Math.round(75 + 40 * Math.sin((index / 8) * Math.PI))}v13`}
            stroke="#0F7C78"
            strokeWidth="2"
          />
          <circle
            className="animate-landing-light"
            style={{ animationDelay: `${(index % 3) * 1.06}s`, transformBox: "fill-box", transformOrigin: "center" }}
            cx={x}
            cy={Math.round(91 + 40 * Math.sin((index / 8) * Math.PI))}
            r={index % 2 === 0 ? 6 : 4}
            fill={index % 3 === 0 ? "#E35D7E" : "hsl(var(--accent))"}
          />
        </g>
      ))}

      <path d="M90 204h420" stroke="#0F7C78" strokeOpacity=".65" strokeWidth="3" />
      {[108, 492].map((x) => (
        <g key={x} transform={`translate(${x} 0)`}>
          <path d="M0 128v31" stroke="#6C63C7" strokeWidth="2" />
          <path d="M-11 160h22l-4 9H-7z" fill="hsl(var(--accent))" />
          <path d="M0 149c-7 6-5 10 0 12 5-2 7-6 0-12z" fill="#E35D7E" />
          <circle cx="0" cy="174" r="10" fill="hsl(var(--accent))" opacity=".28" />
        </g>
      ))}

      {[132, 468].map((x) => (
        <g key={x} transform={`translate(${x} 110)`}>
          <circle r="8" fill="#E35D7E" />
          <circle r="4" fill="hsl(var(--accent))" />
          <path d="M-5-7l-4-7m14 7 4-7m-17 16-7 3m20-3 7 3" stroke="#0F7C78" strokeWidth="3" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}
