import type { SkisseNavn } from '@/lib/bok-utseende';

// Tegningene til bokens forside — to familier å velge i: akvarellene (myke halvgjennomsiktige
// lag med utvask bak) og de første blyantskissene (enkle, litt skjeve streker i blekk-brunt
// med en terrakotta-detalj). Velges i bokas utseende-panel.

// blyantstrekens fellesgrep — samme strek som skissene ble født med
function Blyant({ children }: { children: React.ReactNode }) {
  return (
    <g fill="none" stroke="#74634c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </g>
  );
}

const TEGNINGER: Record<SkisseNavn, React.ReactNode> = {
  // — akvarellene —

  // croissanten: en halvmåne lagt ledd for ledd — størst i midten øverst, smalere og brattere
  // nedover mot tuppene, så silhuetten faktisk krummer (forrige forsøk så ut som en bille)
  croissant: (
    <>
      <ellipse cx="60" cy="64" rx="48" ry="24" fill="#e8c06a" opacity="0.20" />

      <ellipse cx="21" cy="82" rx="7"  ry="5"  fill="#d99a32" opacity="0.55" transform="rotate(-68 21 82)" />
      <ellipse cx="99" cy="82" rx="7"  ry="5"  fill="#d99a32" opacity="0.55" transform="rotate(68 99 82)" />
      <ellipse cx="30" cy="72" rx="11" ry="8"  fill="#dfa33e" opacity="0.55" transform="rotate(-48 30 72)" />
      <ellipse cx="90" cy="72" rx="11" ry="8"  fill="#dfa33e" opacity="0.55" transform="rotate(48 90 72)" />
      <ellipse cx="43" cy="61" rx="14" ry="11" fill="#e3ac49" opacity="0.58" transform="rotate(-26 43 61)" />
      <ellipse cx="77" cy="61" rx="14" ry="11" fill="#e3ac49" opacity="0.58" transform="rotate(26 77 61)" />
      <ellipse cx="60" cy="56" rx="17" ry="14" fill="#e9b754" opacity="0.65" />

      {/* gyllen høyde øverst, stekt skygge langs hele undersiden av buen */}
      <ellipse cx="60" cy="50" rx="12" ry="7" fill="#f2cd84" opacity="0.60" />
      <path d="M18 84 C30 78 44 73 60 72 C76 73 90 78 102 84 C88 87 74 84 60 84 C46 84 32 87 18 84 z" fill="#b97c24" opacity="0.30" />

      <path d="M48 45 C45 53 45 62 48 70" fill="none" stroke="#9a6118" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      <path d="M72 45 C75 53 75 62 72 70" fill="none" stroke="#9a6118" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      <path d="M34 56 C32 62 32 68 35 74" fill="none" stroke="#9a6118" strokeWidth="2" strokeLinecap="round" opacity="0.40" />
      <path d="M86 56 C88 62 88 68 85 74" fill="none" stroke="#9a6118" strokeWidth="2" strokeLinecap="round" opacity="0.40" />
    </>
  ),

  jordbaer: (
    <>
      <path d="M62 50 C80 44 94 56 92 70 C90 88 74 102 60 106 C46 102 28 88 28 68 C28 54 44 44 62 50 z" fill="#e2766a" opacity="0.30" transform="translate(3 4) rotate(4 60 70)" />
      <path d="M60 50 C75 46 88 54 88 67 C88 84 73 98 60 103 C47 98 32 84 32 67 C32 54 45 46 60 50 z" fill="#c23b2e" opacity="0.60" />
      <path d="M60 72 C70 72 80 78 78 86 C72 95 65 100 60 102 C55 100 48 95 42 86 C40 78 50 72 60 72 z" fill="#8e2417" opacity="0.35" />
      <path d="M60 50 C54 40 44 36 36 40 C44 43 49 47 52 52 z" fill="#76814e" opacity="0.65" />
      <path d="M60 50 C66 40 76 36 84 40 C76 43 71 47 68 52 z" fill="#76814e" opacity="0.55" />
      <path d="M60 48 C60 42 61 38 63 34" fill="none" stroke="#5a6340" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <g fill="#f6e7b0" opacity="0.85">
        <ellipse cx="48" cy="68" rx="1.4" ry="2.2" />
        <ellipse cx="60" cy="64" rx="1.4" ry="2.2" />
        <ellipse cx="72" cy="68" rx="1.4" ry="2.2" />
        <ellipse cx="53" cy="82" rx="1.4" ry="2.2" />
        <ellipse cx="67" cy="82" rx="1.4" ry="2.2" />
        <ellipse cx="60" cy="93" rx="1.4" ry="2.2" />
      </g>
    </>
  ),

  kaffe: (
    <>
      <path d="M30 64 C28 50 50 44 64 46 C84 48 94 58 92 70 C90 84 76 94 58 92 C42 90 32 78 30 64 z" fill="#b98c5a" opacity="0.22" transform="translate(2 8)" />
      <ellipse cx="58" cy="90" rx="34" ry="8" fill="#b98c5a" opacity="0.35" />
      <path d="M34 54 C34 76 43 90 58 90 C73 90 82 76 82 54 z" fill="#fffdf6" opacity="0.75" />
      <path d="M36 60 C37 76 45 87 58 87 C64 87 69 85 73 80 C64 86 48 84 42 72 C38 66 37 62 36 60 z" fill="#cbb89a" opacity="0.45" />
      <ellipse cx="58" cy="54" rx="24" ry="7" fill="#6f4324" opacity="0.78" />
      <ellipse cx="62" cy="53" rx="12" ry="3.5" fill="#9a6a3c" opacity="0.55" />
      <path d="M82 58 C93 56 96 68 85 73" fill="none" stroke="#cbb89a" strokeWidth="4.5" strokeLinecap="round" opacity="0.8" />
      <path d="M48 38 C45 31 51 27 49 19" fill="none" stroke="#b98c5a" strokeWidth="4.5" strokeLinecap="round" opacity="0.35" />
      <path d="M64 36 C61 30 67 26 65 18" fill="none" stroke="#b98c5a" strokeWidth="4.5" strokeLinecap="round" opacity="0.28" />
    </>
  ),

  blotkake: (
    <>
      <path d="M26 66 C24 54 40 48 60 48 C80 48 96 54 94 66 C96 80 84 92 60 92 C36 92 24 80 26 66 z" fill="#e2a3a3" opacity="0.22" transform="translate(-2 6)" />
      <ellipse cx="60" cy="92" rx="38" ry="7" fill="#b98c5a" opacity="0.30" />
      <path d="M30 60 L90 60 L88 86 C88 92 32 92 32 86 z" fill="#f0ddb6" opacity="0.75" />
      <path d="M31 70 q7.4 4 14.8 0 q7.4 4 14.8 0 q7.4 4 14.8 0 q7.4 4 14.6 0" fill="none" stroke="#fffdf6" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
      <path d="M32 79 q7.2 3.5 14.4 0 q7.2 3.5 14.4 0 q7.2 3.5 14.4 0 q7.2 3.5 14 0" fill="none" stroke="#c23b2e" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />
      <ellipse cx="60" cy="58" rx="31" ry="8" fill="#fdf8ec" opacity="0.92" />
      <g opacity="0.8">
        <circle cx="46" cy="53" r="4.5" fill="#c23b2e" />
        <circle cx="62" cy="50" r="5"   fill="#c23b2e" />
        <circle cx="77" cy="54" r="4"   fill="#c23b2e" />
        <path d="M46 49 l2 -4 M62 45 l2 -4 M77 50 l2 -4" stroke="#76814e" strokeWidth="2" strokeLinecap="round" />
      </g>
    </>
  ),

  // julekakaoen: vinrødt krus, kremtopp som bølger over kanten, marshmallows og damp
  kakao: (
    <>
      <ellipse cx="60" cy="72" rx="42" ry="24" fill="#b98c5a" opacity="0.20" transform="translate(2 6)" />
      <ellipse cx="58" cy="94" rx="30" ry="6" fill="#b98c5a" opacity="0.30" />

      <path d="M34 52 C34 78 42 92 58 92 C74 92 82 78 82 52 z" fill="#9e3b3b" opacity="0.65" />
      <path d="M36 58 C37 76 44 88 58 88 C63 88 68 86 71 82 C62 88 47 85 42 72 z" fill="#6f2727" opacity="0.40" />
      <path d="M82 56 C93 54 96 66 85 71" fill="none" stroke="#9e3b3b" strokeWidth="4.5" strokeLinecap="round" opacity="0.60" />

      <path d="M32 52 c2 -9 10 -13 16 -8 c2 -9 13 -11 17 -3 c9 -6 17 1 15 9 l2 2 z" fill="#fdf8ec" opacity="0.92" />
      <rect x="44" y="40" width="9" height="6.5" rx="1.5" fill="#f2c8c2" opacity="0.9" transform="rotate(-8 48 43)" />
      <rect x="61" y="38" width="9" height="6.5" rx="1.5" fill="#f2c8c2" opacity="0.9" transform="rotate(12 65 41)" />

      <path d="M50 30 C47 24 53 20 51 12" fill="none" stroke="#b98c5a" strokeWidth="4.5" strokeLinecap="round" opacity="0.30" />
      <path d="M66 28 C63 22 69 18 67 10" fill="none" stroke="#b98c5a" strokeWidth="4.5" strokeLinecap="round" opacity="0.25" />
    </>
  ),

  // salatbollen: blader som bobler over kanten, tomater og en rødløkring
  salat: (
    <>
      <ellipse cx="60" cy="74" rx="44" ry="22" fill="#9aa67e" opacity="0.22" transform="translate(-2 6)" />

      <path d="M24 62 C24 82 38 94 60 94 C82 94 96 82 96 62 z" fill="#d8c8a4" opacity="0.65" />
      <path d="M28 66 C30 80 42 90 60 90 C66 90 71 89 76 86 C63 90 41 86 33 70 z" fill="#a98f5f" opacity="0.35" />

      <ellipse cx="42" cy="56" rx="13" ry="9"  fill="#76814e" opacity="0.55" transform="rotate(-18 42 56)" />
      <ellipse cx="62" cy="50" rx="14" ry="10" fill="#8a9a5b" opacity="0.55" transform="rotate(8 62 50)" />
      <ellipse cx="80" cy="57" rx="12" ry="8"  fill="#76814e" opacity="0.50" transform="rotate(20 80 57)" />
      <ellipse cx="52" cy="45" rx="9"  ry="6"  fill="#a4b072" opacity="0.60" transform="rotate(-12 52 45)" />

      <circle cx="71" cy="43" r="5" fill="#c23b2e" opacity="0.75" />
      <circle cx="39" cy="47" r="4" fill="#c23b2e" opacity="0.65" />
      <ellipse cx="57" cy="58" rx="7" ry="4.5" fill="none" stroke="#9e5a7a" strokeWidth="2" opacity="0.60" />
    </>
  ),

  // — blyantskissene fra første runde —

  bolle: (
    <Blyant>
      <path d="M22 76 c-3 -24 17 -40 38 -39 c23 1 41 17 38 39 c-2 15 -17 23 -38 23 c-21 0 -36 -8 -38 -23 z" />
      <path d="M60 74 c12 0 17 -8 10 -14 c-8 -6 -22 -2 -22 8 c0 13 17 18 30 11" />
      <path d="M46 28 q5 -8 0 -15" stroke="#b04e28" />
      <path d="M62 26 q5 -8 0 -15" stroke="#b04e28" />
      <path d="M77 29 q5 -8 0 -15" stroke="#b04e28" />
    </Blyant>
  ),

  kake: (
    <Blyant>
      <path d="M30 95 h60" />
      <path d="M34 93 c-2 -10 1 -19 4 -20 h44 c3 1 6 10 4 20" />
      <path d="M42 72 c-2 -9 1 -16 3 -17 h30 c2 1 5 8 3 17" />
      <path d="M38 76 q6 5 11 0 q6 5 11 0 q6 5 11 0 q6 5 11 0" />
      <path d="M60 54 v-12" />
      <path d="M60 38 c-3 -3 -1 -7 0 -8 c1 1 3 5 0 8 z" stroke="#b04e28" />
    </Blyant>
  ),

  gryte: (
    <Blyant>
      <path d="M30 58 c0 22 12 32 30 32 c18 0 30 -10 30 -32 z" />
      <path d="M26 58 h68" />
      <path d="M34 52 c4 -6 14 -9 26 -9 c12 0 22 3 26 9" />
      <path d="M57 40 a4 3 0 0 1 6 0" />
      <path d="M24 64 l-7 4" />
      <path d="M96 64 l7 4" />
      <path d="M48 30 q4 -7 0 -13" stroke="#b04e28" />
      <path d="M70 30 q4 -7 0 -13" stroke="#b04e28" />
    </Blyant>
  ),

  kanne: (
    <Blyant>
      <path d="M42 42 h32 l-4 50 c-1 4 -23 4 -24 0 z" />
      <path d="M42 48 c-10 2 -14 12 -6 18 l8 5" />
      <path d="M74 50 c10 0 14 8 8 14 c-4 4 -10 5 -12 4" />
      <path d="M44 42 c0 -5 28 -5 28 0" />
      <path d="M55 34 a4 3 0 0 1 7 0" />
      <path d="M52 24 q4 -7 0 -13" stroke="#b04e28" />
      <path d="M66 24 q4 -7 0 -13" stroke="#b04e28" />
    </Blyant>
  ),

  // pepperkakemannen: melisøyne, glasur-sikksakk på armene og terrakotta-knapper
  pepperkake: (
    <Blyant>
      <circle cx="60" cy="30" r="12" />
      <path d="M52 40 l-17 10 q-5 4 -1 8 q4 4 9 0 l11 -7 l-2 19 l-8 14 q-2 5 3 6 q5 1 7 -4 l6 -10 6 10 q2 5 7 4 q5 -1 3 -6 l-8 -14 l-2 -19 l11 7 q5 4 9 0 q4 -4 -1 -8 l-17 -10 z" />
      <circle cx="55.5" cy="28" r="1.5" fill="#74634c" stroke="none" />
      <circle cx="64.5" cy="28" r="1.5" fill="#74634c" stroke="none" />
      <path d="M55 34 q5 4 10 0" />
      <circle cx="60" cy="54" r="1.6" fill="#b04e28" stroke="none" />
      <circle cx="60" cy="62" r="1.6" fill="#b04e28" stroke="none" />
      <path d="M42 50 l3 -3 3 3" stroke="#b04e28" />
      <path d="M72 50 l3 -3 3 3" stroke="#b04e28" />
    </Blyant>
  ),

  // middagen: dampende tallerken med gaffel og kniv
  middag: (
    <Blyant>
      <ellipse cx="60" cy="72" rx="32" ry="11" />
      <ellipse cx="60" cy="70" rx="21" ry="6.5" />
      <path d="M53 56 q4 -7 0 -13" stroke="#b04e28" />
      <path d="M66 54 q4 -7 0 -13" stroke="#b04e28" />
      <path d="M17 52 v36" />
      <path d="M13 52 v10 M21 52 v10" />
      <path d="M103 52 v36" />
      <path d="M103 52 c-6 3 -6 13 0 15" />
    </Blyant>
  ),
};

export function Skisse({ navn, className }: { navn: SkisseNavn; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={className}>
      {TEGNINGER[navn]}
    </svg>
  );
}
