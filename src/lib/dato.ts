// '2026-05-17' → '17. mai 2026'. Planens dato er en kalenderdag uten klokkeslett, lagret som
// ren ISO-dag — formatteres uten Date, så ingen tidssone kan tippe dagen.
const MÅNEDER = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

export function formaterDag(isoDag: string): string {
  const [år, måned, dag] = isoDag.split('-').map(Number);
  if (!år || !måned || !dag || måned > 12) return isoDag;

  return `${dag}. ${MÅNEDER[måned - 1]} ${år}`;
}

// En plan er et tidligere arrangement når dagen er passert — datoløse planer er alltid
// kommende. ISO-dager sammenlignes leksikalsk; `iDag` kommer fra klokken (nowDate) hos kalleren.
export function erTidligereDag(isoDag: string | null, iDag: string): boolean {
  return isoDag !== null && isoDag < iDag;
}
