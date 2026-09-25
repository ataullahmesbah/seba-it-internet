/**
 * Built-in vector illustrations used when an ISP has not uploaded photography yet.
 * They inherit brand colors from CSS variables, so they rebrand automatically.
 */

/** Night-city skyline with animated fiber light trails — hero backdrop. */
export function HeroNetworkArt({ className = "" }: { className?: string }) {
  const buildings = [
    [0, 210, 40], [42, 170, 34], [78, 230, 28], [108, 150, 46], [156, 200, 30], [188, 120, 38], [228, 185, 26],
    [256, 95, 44], [302, 160, 32], [336, 60, 30], [368, 140, 40], [410, 105, 36], [448, 175, 30], [480, 130, 42],
    [524, 190, 28], [554, 150, 36], [592, 205, 40], [634, 170, 30], [666, 215, 44], [712, 185, 34], [748, 225, 52],
  ];
  return (
    <svg viewBox="0 0 800 320" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="hn-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b3b66" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--brand-navy)" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="hn-f" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--brand-accent)" stopOpacity="0" />
          <stop offset="0.5" stopColor="var(--brand-accent)" stopOpacity="1" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.9" />
        </linearGradient>
        <filter id="hn-glow" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {buildings.map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={320 - y} fill="url(#hn-b)" />
          {Array.from({ length: Math.floor((320 - y) / 18) }).map((_, r) =>
            Array.from({ length: Math.max(1, Math.floor(w / 10)) }).map((__, c) =>
              (r * 7 + c * 3 + i) % 4 === 0 ? (
                <rect key={`${r}-${c}`} x={x + 4 + c * 10} y={y + 8 + r * 18} width="4" height="6" fill="#ffd89a" opacity="0.55" />
              ) : null,
            ),
          )}
        </g>
      ))}
      <path d="M-20 300 C 180 240, 360 290, 520 200 S 760 90, 840 60" fill="none" stroke="url(#hn-f)" strokeWidth="3" filter="url(#hn-glow)" />
      <path className="fiber-line" d="M-20 310 C 200 260, 380 300, 540 215 S 770 110, 840 80" fill="none" stroke="var(--brand-accent)" strokeWidth="2" opacity="0.8" />
      <path className="fiber-line" d="M-20 290 C 160 230, 340 270, 500 190 S 740 80, 840 40" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.5" />
    </svg>
  );
}

/** Dotted network constellation (used behind stats / coverage). */
export function NetworkDots({ className = "" }: { className?: string }) {
  const pts: Array<[number, number]> = [
    [40, 60], [90, 30], [140, 80], [200, 50], [230, 120], [170, 150], [110, 130], [60, 170], [260, 180], [300, 100], [320, 40],
  ];
  const links: Array<[number, number]> = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [6, 7], [4, 8], [4, 9], [9, 10], [3, 10], [2, 6]];
  return (
    <svg viewBox="0 0 360 220" className={className} aria-hidden="true">
      {links.map(([a, b], i) => (
        <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} stroke="var(--brand-primary)" strokeOpacity="0.25" strokeWidth="1.2" />
      ))}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 5 : 3.5} fill={i % 2 ? "var(--brand-accent)" : "var(--brand-primary)"} className={i % 3 === 0 ? "pulse-dot" : ""} />
      ))}
    </svg>
  );
}

/** Home connectivity illustration (house + router + devices). */
export function HomeArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 220" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ha-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand-accent)" stopOpacity="0.18" />
          <stop offset="1" stopColor="var(--brand-primary)" stopOpacity="0.28" />
        </linearGradient>
      </defs>
      <rect width="320" height="220" rx="18" fill="url(#ha-bg)" />
      <circle cx="250" cy="52" r="26" fill="#ffffff" opacity="0.5" />
      <path d="M70 110 L150 50 L230 110 V185 H70 Z" fill="#ffffff" stroke="var(--brand-primary)" strokeWidth="4" strokeLinejoin="round" />
      <rect x="132" y="135" width="36" height="50" rx="4" fill="var(--brand-primary)" opacity="0.85" />
      <rect x="88" y="120" width="30" height="26" rx="3" fill="var(--brand-accent)" opacity="0.5" />
      <rect x="182" y="120" width="30" height="26" rx="3" fill="var(--brand-accent)" opacity="0.5" />
      <g transform="translate(150 20)">
        <path d="M-26 22a37 37 0 0 1 52 0" fill="none" stroke="var(--brand-primary)" strokeWidth="5" strokeLinecap="round" />
        <path d="M-15 32a21 21 0 0 1 30 0" fill="none" stroke="var(--brand-accent)" strokeWidth="5" strokeLinecap="round" />
        <circle cx="0" cy="41" r="4.5" fill="var(--brand-primary)" />
      </g>
      <rect x="245" y="150" width="46" height="30" rx="4" fill="var(--brand-navy)" />
      <rect x="240" y="180" width="56" height="5" rx="2" fill="var(--brand-navy)" opacity="0.8" />
      <rect x="30" y="148" width="22" height="38" rx="4" fill="var(--brand-navy)" />
      <circle cx="41" cy="180" r="2" fill="#ffffff" />
    </svg>
  );
}

/** Corporate illustration (office towers + linked nodes). */
export function CorporateArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 220" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ca-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand-primary)" stopOpacity="0.2" />
          <stop offset="1" stopColor="var(--brand-navy)" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <rect width="320" height="220" rx="18" fill="url(#ca-bg)" />
      {[
        [40, 90, 50, 110],
        [100, 50, 60, 150],
        [170, 75, 48, 125],
        [228, 110, 52, 90],
      ].map(([x, y, w, h], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} rx="4" fill={i % 2 ? "var(--brand-navy)" : "var(--brand-primary)"} opacity={i % 2 ? 0.9 : 0.75} />
          {Array.from({ length: Math.floor(h / 16) - 1 }).map((_, r) => (
            <rect key={r} x={x + 8} y={y + 10 + r * 16} width={w - 16} height="6" rx="1.5" fill="#ffffff" opacity="0.35" />
          ))}
        </g>
      ))}
      <path d="M65 80 Q 130 20 194 64 T 254 98" fill="none" stroke="var(--brand-accent)" strokeWidth="2.5" strokeDasharray="5 6" className="fiber-line" />
      {[[65, 80], [130, 40], [194, 64], [254, 98]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="6" fill="#ffffff" stroke="var(--brand-accent)" strokeWidth="3" />
      ))}
    </svg>
  );
}

/** Gift/offer illustration. */
export function GiftArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 140" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ga-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5fd3ff" />
          <stop offset="1" stopColor="var(--brand-primary)" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="128" rx="62" ry="8" fill="var(--brand-accent)" opacity="0.35" />
      <rect x="28" y="62" width="104" height="64" rx="6" fill="url(#ga-b)" />
      <rect x="20" y="46" width="120" height="22" rx="5" fill="#8fe2ff" />
      <rect x="72" y="46" width="16" height="80" fill="#ffffff" opacity="0.9" />
      <path d="M80 46 C 60 20, 36 30, 50 46 Z M80 46 C 100 20, 124 30, 110 46 Z" fill="#ffffff" stroke="#bde9ff" strokeWidth="2" />
      <circle cx="30" cy="30" r="3" fill="#ffffff" className="pulse-dot" />
      <circle cx="138" cy="24" r="2.5" fill="#ffffff" className="pulse-dot" />
      <circle cx="146" cy="70" r="2" fill="var(--brand-accent)" className="pulse-dot" />
    </svg>
  );
}

/** Support agent illustration (headset). */
export function SupportArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <circle cx="100" cy="100" r="90" fill="var(--brand-primary)" opacity="0.12" />
      <circle cx="100" cy="86" r="34" fill="var(--brand-navy)" opacity="0.9" />
      <path d="M40 180 C 45 130, 155 130, 160 180 Z" fill="var(--brand-primary)" />
      <path d="M58 88 a42 42 0 0 1 84 0" fill="none" stroke="var(--brand-accent)" strokeWidth="8" strokeLinecap="round" />
      <rect x="50" y="82" width="16" height="28" rx="7" fill="var(--brand-accent)" />
      <rect x="134" y="82" width="16" height="28" rx="7" fill="var(--brand-accent)" />
      <path d="M142 108 q 0 24 -30 24" fill="none" stroke="var(--brand-accent)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="110" cy="132" r="5" fill="#ffffff" />
    </svg>
  );
}

/** Stylized map pin cluster for coverage sections. */
export function CoverageArt({ className = "" }: { className?: string }) {
  const dots: Array<[number, number]> = [
    [70, 40], [95, 55], [120, 48], [110, 80], [85, 90], [135, 100], [100, 120], [75, 130], [125, 140], [100, 160], [140, 70], [60, 100],
  ];
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <path
        d="M70 20 C 110 10, 150 30, 150 60 C 170 80, 160 110, 150 130 C 145 160, 120 190, 100 185 C 80 180, 60 160, 55 130 C 40 110, 45 80, 55 60 C 55 40, 60 25, 70 20 Z"
        fill="var(--brand-primary)"
        opacity="0.12"
        stroke="var(--brand-primary)"
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 5 : 3.5} fill={i % 2 ? "var(--brand-accent)" : "var(--brand-primary)"} className={i % 3 === 0 ? "pulse-dot" : ""} />
      ))}
    </svg>
  );
}
