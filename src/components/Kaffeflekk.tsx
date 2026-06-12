// Kaffesøl på papiret — én brutt, ujevn ring etter koppen og noen dråper, flatt trykket inn i
// papiret (én farge, lave opasiteter — to konsentriske ringer med ulik tone leste som "bevel").
// Ren pynt (aria-hidden). Plasser den stor og gjerne delvis utenfor kanten: body har
// overflow-x: clip, så høyre-overheng klippes uten å lage scrollefelt.
export function Kaffeflekk({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden className={`pointer-events-none ${className ?? ''}`}>
      <g fill="none" stroke="#b9802e" strokeLinecap="round">
        <path d="M158 64 A70 68 0 1 0 166 116" strokeWidth="9" opacity="0.11" />
        <path d="M150 150 a70 68 0 0 0 17 -28" strokeWidth="7" opacity="0.08" />
      </g>

      <g fill="#b9802e">
        <path d="M46 158 c-9 3 -15 11 -10 18 c5 8 18 9 27 5 c9 -4 12 -13 6 -19 c-6 -6 -15 -7 -23 -4 z" opacity="0.08" />
        <circle cx="34"  cy="86"  r="4" opacity="0.08" />
        <circle cx="186" cy="140" r="3" opacity="0.07" />
        <circle cx="120" cy="187" r="5" opacity="0.06" />
      </g>
    </svg>
  );
}
