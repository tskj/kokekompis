// Fargerike illustrasjoner til de innebygde oppslagene — samme akvarellspråk som bokforsidene
// (halvgjennomsiktige lag i sidens palett), så Oppslagsboka blir innbydende og gøy å bla i.
// Nøkkelen er oppslagets id; ukjente oppslag (egne) får ingen tegning.

const TEGNINGER: Record<string, React.ReactNode> = {
  // skålvekta — lodd i den ene skåla, mel i den andre
  'maal-og-vekt': (
    <>
      <ellipse cx="60" cy="102" rx="24" ry="4.5" fill="#74634c" opacity="0.22" />
      <path d="M50 100 C54 92 66 92 70 100 z" fill="#74634c" opacity="0.45" />
      <rect x="57.5" y="40" width="5" height="58" rx="2" fill="#74634c" opacity="0.55" />
      <path d="M22 42 L98 42" stroke="#74634c" strokeWidth="4.5" strokeLinecap="round" opacity="0.6" />
      <circle cx="60" cy="40" r="4.5" fill="#b04e28" opacity="0.75" />

      <path d="M24 44 L17 62 M24 44 L31 62" stroke="#74634c" strokeWidth="2" opacity="0.45" />
      <path d="M13 62 C15 71 33 71 35 62 z" fill="#e9b949" opacity="0.7" />
      <rect x="20" y="52" width="8" height="10" rx="1.5" fill="#2f3a4a" opacity="0.6" />

      <path d="M96 44 L89 62 M96 44 L103 62" stroke="#74634c" strokeWidth="2" opacity="0.45" />
      <path d="M85 62 C87 71 105 71 107 62 z" fill="#e9b949" opacity="0.7" />
      <path d="M88 62 q8 -9 16 0 z" fill="#f3ebd9" opacity="0.95" />
    </>
  ),

  // det smilende egget i rødt eggeglass — toppen av, plomma frem, skje ved siden av
  'kokte-egg': (
    <>
      <ellipse cx="58" cy="104" rx="30" ry="4.5" fill="#74634c" opacity="0.22" />
      <path d="M44 76 C44 90 72 90 72 76 L70 68 H46 z" fill="#b04e28" opacity="0.65" />
      <path d="M52 89 l-3 13 h18 l-3 -13" fill="#b04e28" opacity="0.5" />

      <path d="M46 70 C44 52 50 38 58 38 C66 38 72 52 70 70 z" fill="#fdf8ec" opacity="0.97" />
      <path d="M48 50 C50 46 54 44 58 44 C62 44 66 46 68 50 z" fill="#f3ebd9" opacity="0.9" />
      <ellipse cx="58" cy="49" rx="7" ry="3.5" fill="#e9b949" opacity="0.95" />

      <path d="M90 56 L86 98" stroke="#74634c" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <ellipse cx="91" cy="50" rx="5" ry="7.5" fill="#d8c8a4" opacity="0.9" />
    </>
  ),

  // deigen hever over bollekanten — boblene forteller at gjæren lever
  gjaer: (
    <>
      <ellipse cx="60" cy="98" rx="32" ry="5" fill="#74634c" opacity="0.22" />
      <path d="M28 60 C32 48 44 40 60 40 C76 40 88 48 92 60 z" fill="#f3ebd9" opacity="0.97" />
      <path d="M40 44 C44 38 52 34 60 34 C64 34 68 35 71 37 C66 38 62 40 59 43 z" fill="#f3ebd9" opacity="0.9" />
      <path d="M26 60 C26 82 40 94 60 94 C80 94 94 82 94 60 z" fill="#76814e" opacity="0.65" />
      <path d="M30 66 C32 78 42 88 56 90 C44 86 36 78 33 66 z" fill="#5c6539" opacity="0.45" />

      <circle cx="44" cy="26" r="3"   fill="none" stroke="#74634c" strokeWidth="1.8" opacity="0.45" />
      <circle cx="58" cy="18" r="4"   fill="none" stroke="#74634c" strokeWidth="1.8" opacity="0.4" />
      <circle cx="72" cy="26" r="2.5" fill="none" stroke="#74634c" strokeWidth="1.8" opacity="0.45" />
    </>
  ),

  // steka med termometeret i — nåla står på akkurat passe
  kjernetemperaturer: (
    <>
      <ellipse cx="58" cy="92" rx="36" ry="6" fill="#74634c" opacity="0.22" />
      <path d="M26 70 C24 54 38 46 58 46 C78 46 92 54 90 70 C92 80 80 90 58 90 C36 90 24 80 26 70 z" fill="#8c3a1b" opacity="0.65" />
      <path d="M30 78 C42 86 74 86 86 78 C76 84 40 84 30 78 z" fill="#5e2712" opacity="0.5" />
      <path d="M34 62 C40 54 50 51 60 51" fill="none" stroke="#e3b04b" strokeWidth="3" strokeLinecap="round" opacity="0.45" />

      <path d="M70 60 L82 30" stroke="#74634c" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
      <circle cx="85" cy="23" r="10" fill="#faf5ea" opacity="0.97" stroke="#74634c" strokeWidth="2.5" />
      <path d="M85 23 L89 17" stroke="#b04e28" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="85" cy="23" r="1.6" fill="#b04e28" />
    </>
  ),

  // borddekkingen i miniatyr: gaffel til venstre, kniv til høyre, glasset over kniven
  'dekke-bordet': (
    <>
      <circle cx="58" cy="68" r="27" fill="#faf5ea" opacity="0.97" />
      <circle cx="58" cy="68" r="27" fill="none" stroke="#b04e28" strokeWidth="2.5" opacity="0.7" />
      <circle cx="58" cy="68" r="17" fill="none" stroke="#b04e28" strokeWidth="1.5" opacity="0.4" />

      <path d="M21 60 v32" stroke="#74634c" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
      <path d="M17 46 v10 M21 46 v10 M25 46 v10" stroke="#74634c" strokeWidth="2.4" strokeLinecap="round" opacity="0.75" />
      <path d="M17 56 c0 4 8 4 8 0" fill="none" stroke="#74634c" strokeWidth="2.4" opacity="0.75" />

      <path d="M95 60 v32" stroke="#74634c" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
      <path d="M95 44 c-5 5 -5 13 0 18 z" fill="#74634c" opacity="0.5" />

      <path d="M88 10 c0 9 5 12 7 12 c2 0 7 -3 7 -12 z" fill="#2f3a4a" opacity="0.45" />
      <path d="M95 22 v8 M90 30 h10" stroke="#2f3a4a" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </>
  ),

  // blomstene! løvetann i smørgult, kløverpompongen i rosa-terrakotta, salvieblader rundt
  'spiselige-vekster': (
    <>
      <path d="M38 102 C38 86 39 72 41 58" fill="none" stroke="#76814e" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <g stroke="#e9b949" strokeWidth="3.5" strokeLinecap="round" opacity="0.85">
        <path d="M41 52 L41 38" /><path d="M41 52 L31 42" /><path d="M41 52 L51 42" />
        <path d="M41 52 L28 50" /><path d="M41 52 L54 50" /><path d="M41 52 L33 62" />
        <path d="M41 52 L49 62" />
      </g>
      <circle cx="41" cy="52" r="6" fill="#d99a32" opacity="0.95" />
      <path d="M30 100 l8 -12 l-2 12 l8 -10 l0 10 z" fill="#76814e" opacity="0.6" />

      <path d="M80 102 C80 90 81 80 83 70" fill="none" stroke="#76814e" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <g fill="#c97c5d" opacity="0.85">
        <circle cx="83" cy="62" r="9" />
        <circle cx="77" cy="58" r="4" /><circle cx="89" cy="58" r="4" />
        <circle cx="80" cy="52" r="3.5" /><circle cx="86" cy="52" r="3.5" />
      </g>
      <g fill="#76814e" opacity="0.7">
        <ellipse cx="72" cy="86" rx="6" ry="4.5" transform="rotate(-30 72 86)" />
        <ellipse cx="88" cy="88" rx="6" ry="4.5" transform="rotate(30 88 88)" />
        <ellipse cx="80" cy="92" rx="6" ry="4.5" transform="rotate(90 80 92)" />
      </g>
    </>
  ),

  // kjøkkenspråket: snakkebobla med vispen i — språket man snakker over gryta
  kjokkenspraak: (
    <>
      <path d="M22 46 C22 30 38 20 60 20 C82 20 98 30 98 46 C98 62 82 72 60 72 C54 72 49 71 44 70 L30 80 L34 67 C27 62 22 55 22 46 z" fill="#f7efdd" opacity="0.97" />
      <path d="M22 46 C22 30 38 20 60 20 C82 20 98 30 98 46 C98 62 82 72 60 72 C54 72 49 71 44 70 L30 80 L34 67 C27 62 22 55 22 46 z" fill="none" stroke="#74634c" strokeWidth="2.2" opacity="0.5" />

      <path d="M52 60 L62 34" stroke="#74634c" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
      <path d="M62 34 C56 28 60 20 67 22 C74 24 74 33 67 35 C64 36 63 35 62 34 z" fill="none" stroke="#74634c" strokeWidth="2.2" opacity="0.7" />
      <path d="M64 33 C60 28 64 23 68 24 M65 34 C70 33 72 28 70 25" fill="none" stroke="#74634c" strokeWidth="1.6" opacity="0.55" />

      <circle cx="80" cy="50" r="2"   fill="#b04e28" opacity="0.7" />
      <circle cx="86" cy="44" r="1.6" fill="#b04e28" opacity="0.55" />
    </>
  ),
};

export function OppslagTegning({ id, className }: { id: string; className?: string }) {
  const tegning = TEGNINGER[id];
  if (!tegning) return null;

  return (
    <svg viewBox="0 0 120 120" aria-hidden className={className}>
      {tegning}
    </svg>
  );
}
