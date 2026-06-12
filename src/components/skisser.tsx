import type { SkisseNavn } from '@/lib/bok-utseende';

// Akvarellene til bokens forside: myke, halvgjennomsiktige lag som flyter litt utenfor
// hverandre (utvasken bak gir papir-blødningen), med noen få mørkere aksentstrøk oppå.
// Velges i bokas utseende-panel.

const TEGNINGER: Record<SkisseNavn, React.ReactNode> = {
  croissant: (
    <>
      <path d="M22 76 C18 58 36 40 60 42 C84 44 100 60 98 78 C84 66 72 62 60 62 C48 62 34 66 22 76 z" fill="#e8c06a" opacity="0.30" transform="translate(-2 6) rotate(-3 60 60)" />
      <path d="M60 42 C74 42 86 51 90 64 C95 60 102 63 104 70 C106 78 98 83 91 79 C83 89 70 93 60 93 C50 93 37 89 29 79 C22 83 14 78 16 70 C18 63 25 60 30 64 C34 51 46 42 60 42 z" fill="#dfa33e" opacity="0.55" />
      <path d="M60 52 C70 52 79 58 83 68 C84 76 74 84 60 84 C46 84 36 76 37 68 C41 58 50 52 60 52 z" fill="#b97c24" opacity="0.35" />
      <path d="M45 49 C41 60 41 72 46 86" fill="none" stroke="#9a6118" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M75 49 C79 60 79 72 74 86" fill="none" stroke="#9a6118" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
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
};

export function Skisse({ navn, className }: { navn: SkisseNavn; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={className}>
      {TEGNINGER[navn]}
    </svg>
  );
}
