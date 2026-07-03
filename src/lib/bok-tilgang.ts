// Tilgangsregelen for bøker, ett sted: en bok er PRIVAT — bare eieren ser den. Andre får
// innsyn kun via delingslenker, stykkevis eller helt (/delt/<token>, /delt-bok/<token>).
// Alt annet finnes ikke (sidene svarer med notFound, ikke "ingen tilgang").
// (Kolonnen cookbook.synlighet står igjen i basen fra utstillings-tiden, men leses ikke.)
export function kanSeBok(bok: { userId: string }, userId: string | null): boolean {
  return bok.userId === userId;
}
