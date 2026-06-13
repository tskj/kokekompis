// Forsiden som ekte rutemål i @recipe-sloten. default.tsx gjelder bare ved hard navigasjon —
// ved myk navigasjon til /kokebok/[id] beholder Next slotens forrige oppslag, så «ny oppskrift»
// satt seg fast og lot seg ikke trykke bort. Med en page her re-rendres sloten til forsiden.
export { default } from './default';
