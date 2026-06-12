import type { SkisseNavn } from '@/lib/bok-utseende';

// Tegnede skisser til bokens forside — enkle, litt skjeve streker, som blyant på papir.
// Velges i bokas utseende-panel; strekene går i blekk-brunt med en terrakotta-detalj.

const TEGNINGER: Record<SkisseNavn, React.ReactNode> = {
  // skillingsbollen: en skjev bolle med spiral og damp
  bolle: (
    <>
      <path d="M22 76 c-3 -24 17 -40 38 -39 c23 1 41 17 38 39 c-2 15 -17 23 -38 23 c-21 0 -36 -8 -38 -23 z" />
      <path d="M60 74 c12 0 17 -8 10 -14 c-8 -6 -22 -2 -22 8 c0 13 17 18 30 11" />
      <path d="M46 28 q5 -8 0 -15" stroke="#b04e28" />
      <path d="M62 26 q5 -8 0 -15" stroke="#b04e28" />
      <path d="M77 29 q5 -8 0 -15" stroke="#b04e28" />
    </>
  ),

  // bløtkaken: to etasjer, et fat og et lys med flamme
  kake: (
    <>
      <path d="M30 95 h60" />
      <path d="M34 93 c-2 -10 1 -19 4 -20 h44 c3 1 6 10 4 20" />
      <path d="M42 72 c-2 -9 1 -16 3 -17 h30 c2 1 5 8 3 17" />
      <path d="M38 76 q6 5 11 0 q6 5 11 0 q6 5 11 0 q6 5 11 0" />
      <path d="M60 54 v-12" />
      <path d="M60 38 c-3 -3 -1 -7 0 -8 c1 1 3 5 0 8 z" stroke="#b04e28" />
    </>
  ),

  // gryta: lokk med knott, hanker og damp
  gryte: (
    <>
      <path d="M30 58 c0 22 12 32 30 32 c18 0 30 -10 30 -32 z" />
      <path d="M26 58 h68" />
      <path d="M34 52 c4 -6 14 -9 26 -9 c12 0 22 3 26 9" />
      <path d="M57 40 a4 3 0 0 1 6 0" />
      <path d="M24 64 l-7 4" />
      <path d="M96 64 l7 4" />
      <path d="M48 30 q4 -7 0 -13" stroke="#b04e28" />
      <path d="M70 30 q4 -7 0 -13" stroke="#b04e28" />
    </>
  ),

  // kaffekanna ved siden av kakebordet — tut, hank og damp
  kanne: (
    <>
      <path d="M42 42 h32 l-4 50 c-1 4 -23 4 -24 0 z" />
      <path d="M42 48 c-10 2 -14 12 -6 18 l8 5" />
      <path d="M74 50 c10 0 14 8 8 14 c-4 4 -10 5 -12 4" />
      <path d="M44 42 c0 -5 28 -5 28 0" />
      <path d="M55 34 a4 3 0 0 1 7 0" />
      <path d="M52 24 q4 -7 0 -13" stroke="#b04e28" />
      <path d="M66 24 q4 -7 0 -13" stroke="#b04e28" />
    </>
  ),
};

export function Skisse({ navn, className }: { navn: SkisseNavn; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden
      className={className}
      fill="none"
      stroke="#74634c"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {TEGNINGER[navn]}
    </svg>
  );
}
