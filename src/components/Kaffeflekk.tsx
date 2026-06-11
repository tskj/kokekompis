// Et kafferingsmerke — som om noen satte koppen fra seg på papiret. Ren pynt (aria-hidden),
// brukt til å avgrense og myke opp flater. Plasser den absolutt, gjerne litt rotert, og la den
// ligge bak innholdet (pointer-events-none følger med).
export function Kaffeflekk({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={`pointer-events-none ${className ?? ''}`}>
      <g fill="none" stroke="#6f4f2a" strokeLinecap="round">
        <path d="M60 12 a48 48 0 1 0 0.01 0" strokeWidth="7"   strokeDasharray="40 14 75 9 55 18 30 12" opacity="0.10" />
        <path d="M60 17 a43 43 0 1 1 -0.01 0" strokeWidth="2.5" strokeDasharray="60 22 38 16 70 10"      opacity="0.08" />
      </g>
      <g fill="#6f4f2a">
        <circle cx="103" cy="78" r="3"   opacity="0.07" />
        <circle cx="22"  cy="34" r="2"   opacity="0.08" />
        <circle cx="94"  cy="22" r="1.6" opacity="0.06" />
      </g>
    </svg>
  );
}
