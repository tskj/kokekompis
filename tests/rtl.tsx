// Shared setup for React Testing Library tests. Import this (for its side effects) at the top of any
// *.test.tsx that renders a component, and mark the file `// @vitest-environment jsdom`. Importing it
// from the test file — rather than wiring a global setupFile — keeps the node-env DB tests untouched.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom doesn't implement browser APIs layout/animation effects reach for. Stub them so a component
// that calls matchMedia / element.animate / ResizeObserver during render or effects doesn't throw —
// the tests assert behavior and DB writes, not visual motion.
class NoopObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return [];
  }
}

if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList;
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }

  const g = globalThis as unknown as { ResizeObserver?: unknown; IntersectionObserver?: unknown };
  if (!g.ResizeObserver) g.ResizeObserver = NoopObserver;
  if (!g.IntersectionObserver) g.IntersectionObserver = NoopObserver;
}

// Unmount + clear the DOM between tests so portals and rendered trees don't leak.
afterEach(() => {
  cleanup();
});

export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
