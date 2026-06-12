// Porsjonsmultiplikatoren — de faste valgene (½×/2×/4×) og lesingen av ?ganger=… fra URL-en.
// Bor i lib fordi både visningen (Oppskrift, bakeviewet) og server actions (planene lagrer
// størrelsen oppskriften ble lagt til i) trenger den.
export const GANGER_VALG = [0.5, 1, 2, 4] as const;

// Bare de faste valgene slipper gjennom — og aldri når oppskriften har skrudd av skalering.
export function lesGanger(rå: string | undefined, kanSkaleres: boolean): number {
  if (!kanSkaleres) return 1;

  const tall = Number(rå);
  return (GANGER_VALG as readonly number[]).includes(tall) ? tall : 1;
}
