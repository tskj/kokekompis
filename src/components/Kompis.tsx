// Kompisen — husnissen som bor i Oppslagsboka. En klassisk fjøsnisse i sidens palett:
// terrakotta-lue ned over øynene, bare den store nesa stikker frem av skjegget, salviegrønn
// kjortel — og tresleiva i neven, for han er tross alt en kokekompis.
export function Kompis({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 140" aria-hidden className={className} data-testid="kompis">
      <ellipse cx="60" cy="133" rx="30" ry="4.5" fill="#74634c" opacity="0.2" />

      {/* tresleiva — bak kroppen, opp forbi lua */}
      <path d="M91 70 L99 34" stroke="#a9805a" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="100" cy="27" rx="6.5" ry="9.5" fill="#c89a62" transform="rotate(12 100 27)" />
      <ellipse cx="100" cy="25" rx="3" ry="5" fill="#a9805a" opacity="0.5" transform="rotate(12 100 25)" />

      {/* føttene */}
      <ellipse cx="47" cy="128" rx="10" ry="5.5" fill="#362b1e" opacity="0.85" />
      <ellipse cx="73" cy="128" rx="10" ry="5.5" fill="#362b1e" opacity="0.85" />

      {/* kjortelen i salvie, med belte og messingspenne */}
      <path d="M38 127 C31 104 35 86 47 78 L73 78 C85 86 89 104 82 127 z" fill="#76814e" />
      <path d="M40 88 C38 100 38 114 40 124 C36 112 36 98 40 88 z" fill="#5c6539" opacity="0.6" />
      <rect x="36.5" y="103" width="47" height="5.5" rx="1.5" fill="#362b1e" opacity="0.55" />
      <rect x="55" y="101.5" width="10" height="8.5" rx="1.5" fill="#e9b949" />
      <rect x="58" y="104" width="4" height="3.5" fill="#76814e" />

      {/* neven rundt sleivskaftet */}
      <path d="M80 92 C90 90 93 82 92 72" fill="none" stroke="#76814e" strokeWidth="9" strokeLinecap="round" />
      <circle cx="92" cy="70" r="6" fill="#e0a583" />

      {/* skjegget — stort og ullent, det meste av en nisse */}
      <path d="M39 74 C33 96 44 114 60 114 C76 114 87 96 81 74 C74 81 66 84 60 84 C54 84 46 81 39 74 z" fill="#f3ebd9" />
      <path d="M50 90 C52 98 56 104 60 106 M70 90 C68 98 64 104 60 106" fill="none" stroke="#d8c8a4" strokeWidth="2" strokeLinecap="round" opacity="0.8" />

      {/* nesa — det eneste som stikker frem mellom lue og skjegg */}
      <circle cx="60" cy="75" r="8" fill="#e0a583" />
      <path d="M55 71 a7 7 0 0 1 6 -3" fill="none" stroke="#f2c9ae" strokeWidth="2" strokeLinecap="round" opacity="0.8" />

      {/* lua — lang, terrakotta, med knekk på tuppen og dusk */}
      <path d="M37 76 C35 52 42 28 58 16 C58 30 64 36 72 42 C80 48 84 60 83 76 C72 70 48 70 37 76 z" fill="#b04e28" />
      <path d="M58 16 C52 12 42 12 38 18 C44 17 52 18 58 22 z" fill="#b04e28" />
      <circle cx="39" cy="16" r="4.5" fill="#e9b949" />
      <path d="M42 70 C44 56 50 42 58 34" fill="none" stroke="#8c3a1b" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <path d="M37 76 C48 71 72 71 83 76 C72 73 48 73 37 76 z" fill="#8c3a1b" opacity="0.6" />
    </svg>
  );
}
