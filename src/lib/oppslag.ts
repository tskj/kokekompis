// De innebygde oppslagene — det man ellers googler midt i baksten. Rene tekster med linjeskift;
// visningen bruker whitespace-pre-line. Egne oppslag bor i databasen (tabellen `oppslag`).
export type InnebygdOppslag = { id: string; tittel: string; tekst: string };

export const INNEBYGDE_OPPSLAG: InnebygdOppslag[] = [
  {
    id: 'maal-og-vekt',
    tittel: 'Mål og vekt — omregning',
    tekst: `1 oz = 28 g · 1 lb (pound) = 454 g
1 cup ≈ 2,4 dl · 1 stick smør = 113 g
1 ts = 5 ml · 1 ss = 15 ml · 1 dl = 100 ml

1 dl hvetemel ≈ 60 g
1 dl sukker ≈ 85 g
1 dl smeltet smør ≈ 95 g
1 dl havregryn ≈ 35 g
1 dl kakao ≈ 40 g`,
  },
  {
    id: 'kokte-egg',
    tittel: 'Hvor lenge koker et egg?',
    tekst: `Fra kokende vann, romtemperert egg (str. M):
Bløtkokt — 6 minutter
Smilende — 8 minutter
Hardkokt — 10 minutter

Rett i kaldt vann etterpå, så stopper koken (og skallet slipper).`,
  },
  {
    id: 'gjaer',
    tittel: 'Gjær — fersk og tørr',
    tekst: `50 g fersk gjær ≈ 1 pose tørrgjær (12 g) ≈ ½ pakke fersk.
Fersk gjær: væske på 37 °C. Tørrgjær: blandes i melet, væske på 40 °C.
For varm væske dreper gjæren — fingervarmt er varmt nok.`,
  },
  {
    id: 'kjernetemperaturer',
    tittel: 'Kjernetemperaturer',
    tekst: `Kylling — 68–70 °C
Svin — 65–70 °C
Lam, rosa — 60–65 °C
Storfe, medium — 58–62 °C
Fisk — 52–55 °C
Brød — 96–98 °C (hult når du banker under)`,
  },
  {
    id: 'dekke-bordet',
    tittel: 'Hvordan dekker man et bord?',
    tekst: `Gaffel til venstre, kniv til høyre med eggen mot tallerkenen, skje ytterst til høyre.
Det du bruker først, ligger ytterst. Dessertbestikket på tvers over tallerkenen.
Glassene over kniven: vann nærmest, vin bak. Serviett på tallerkenen eller til venstre.`,
  },
  {
    id: 'spiselige-vekster',
    tittel: 'Spiselige ville vekster — de trygge klassikerne',
    tekst: `Løvetann (blader og blomst), brennesle (forvelles først), ramsløk (NB: kan forveksles med giftig liljekonvall — lukt på den, ramsløk lukter hvitløk), granskudd (de lysegrønne om våren), engsyre, kløver.
Jernregel: spis aldri noe du ikke er helt sikker på.`,
  },
  {
    id: 'kjokkenspraak',
    tittel: 'Kjøkkenspråket',
    tekst: `Romtemperert smør — ut av kjøleskapet en times tid før.
Fingervarmt — ca. 37 °C; du kjenner verken varmt eller kaldt.
Forvelle — et raskt oppkok, så rett i kaldt vann.
Tempurere — varme forsiktig så ingenting skiller seg.
En klype — det du får mellom tommel og pekefinger.`,
  },
];
