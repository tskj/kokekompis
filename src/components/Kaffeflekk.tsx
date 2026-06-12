// Kaffesøl på papiret — en brutt, ujevn ring etter koppen, en søl-klatt og noen dråper, i en
// gylden kaffetone. Ren pynt (aria-hidden), brukt til å avgrense og myke opp flater. Plasser den
// stor og gjerne delvis utenfor flaten sin (negative top/left gir aldri scrollefelt) — den
// trenger ikke ses hel.
export function Kaffeflekk({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden className={`pointer-events-none ${className ?? ''}`}>
      <g fill="none" stroke="#b9802e" strokeLinecap="round">
        {/* selve ringen: brutt og skjev, tykkere der kaffen ble stående */}
        <path d="M159 62 A72 70 3 1 0 168 118"  strokeWidth="10" opacity="0.16" />
        <path d="M152 58 A66 66 0 1 0 163 116"  strokeWidth="4"  opacity="0.10" />
        <path d="M170 95 a70 70 0 0 1 -7 36"    strokeWidth="13" opacity="0.13" />
        <path d="M36 130 a70 70 0 0 0 22 32"    strokeWidth="8"  opacity="0.11" />
      </g>

      <g fill="#b9802e">
        {/* sølet: en klatt med ujevn kant der koppen ble løftet, og dråpene den dro med seg */}
        <path d="M44 158 c-9 3 -15 11 -10 18 c5 8 18 9 27 5 c9 -4 12 -13 6 -19 c-6 -6 -15 -7 -23 -4 z" opacity="0.11" />
        <path d="M172 50 c5 -7 15 -6 19 1 c4 7 -3 15 -11 15 c-8 0 -13 -9 -8 -16 z"                       opacity="0.09" />
        <circle cx="34"  cy="86"  r="4.5" opacity="0.10" />
        <circle cx="187" cy="142" r="3"   opacity="0.09" />
        <circle cx="122" cy="187" r="5.5" opacity="0.08" />
        <circle cx="64"  cy="32"  r="2.5" opacity="0.10" />
        <circle cx="152" cy="170" r="2"   opacity="0.09" />
      </g>
    </svg>
  );
}
