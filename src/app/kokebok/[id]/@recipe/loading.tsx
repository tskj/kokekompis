// Skjelettet mens et oppslag hentes — med prefetch og klient-cache er det sjelden synlig, men
// når nettet er tregt gir det umiddelbar respons i stedet for en side som henger.
export default function LasterOppslag() {
  return (
    <div className="max-w-4xl animate-pulse" aria-hidden>
      <div className="h-10 w-2/3 rounded bg-line/60" />
      <div className="mt-3 h-4 w-1/2 rounded bg-line/40" />
      <div className="mt-6 flex gap-3">
        <div className="h-9 w-40 rounded-full bg-line/40" />
        <div className="h-9 w-24 rounded-full bg-line/30" />
        <div className="h-9 w-24 rounded-full bg-line/30" />
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-[19rem_1fr]">
        <div className="space-y-2.5">
          <div className="h-6 w-32 rounded bg-line/50" />
          <div className="h-4 rounded bg-line/30" />
          <div className="h-4 rounded bg-line/30" />
          <div className="h-4 w-5/6 rounded bg-line/30" />
          <div className="h-4 w-4/6 rounded bg-line/30" />
        </div>

        <div className="space-y-3">
          <div className="h-6 w-44 rounded bg-line/50" />
          <div className="h-4 rounded bg-line/30" />
          <div className="h-4 w-11/12 rounded bg-line/30" />
          <div className="h-4 w-4/5 rounded bg-line/30" />
          <div className="h-4 w-5/6 rounded bg-line/30" />
        </div>
      </div>
    </div>
  );
}
