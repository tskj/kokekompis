import { describe, expect, it } from "vitest";
import { ingredienserForSteg, pågåendeVenting } from "@/lib/steg";
import { withShouldNeverAllowed } from "@/lib/assert";
import { testOppskrift } from "./db";
import type { Steg } from "@/lib/db/schema";

function steg(deler: Partial<Steg> & { id: string }): Steg {
  return { tekst: deler.id, ingredienser: [], passiv: null, imens: false, ...deler };
}

describe("ingredienserForSteg", () => {
  it("slår opp stegets ingredienser i stegets egen rekkefølge", () => {
    const content = testOppskrift();
    const elt = content.steg[0];

    const ingredienser = ingredienserForSteg(content, elt);

    expect(ingredienser.map((i) => i.navn)).toEqual(["hvetemel", "sukker"]);
    expect(ingredienser[0].mengde).toBe(9);
    expect(ingredienser[0].enhet).toBe("dl");
  });

  it("hopper over referanser uten treff i stedet for å velte siden", async () => {
    const content = testOppskrift();
    const ødelagt = steg({ id: "ødelagt", ingredienser: ["finnes-ikke", "kanel"] });

    const ingredienser = await withShouldNeverAllowed(async () => ingredienserForSteg(content, ødelagt));

    expect(ingredienser.map((i) => i.id)).toEqual(["kanel"]);
  });
});

describe("pågåendeVenting", () => {
  const heving = steg({ id: "heving", passiv: { hva: "heving", minutter: 60 } });
  const fyll = steg({ id: "fyll", imens: true });
  const pynt = steg({ id: "pynt", imens: true });
  const kjevle = steg({ id: "kjevle" });

  it("finner ventingen bak et imens-steg", () => {
    const alle = [steg({ id: "elt" }), heving, fyll];

    expect(pågåendeVenting(alle, 2)?.id).toBe("heving");
  });

  it("følger en kjede av imens-steg tilbake til ventingen", () => {
    const alle = [heving, fyll, pynt];

    expect(pågåendeVenting(alle, 2)?.id).toBe("heving");
  });

  it("gir null for vanlige steg — også rett etter en venting", () => {
    const alle = [heving, kjevle];

    expect(pågåendeVenting(alle, 1)).toBeNull();
  });

  it("gir null når et vanlig steg har brutt kjeden", () => {
    const alle = [heving, kjevle, fyll];

    expect(pågåendeVenting(alle, 2)).toBeNull();
  });

  it("gir null for et imens-steg uten venting bak seg", () => {
    const alle = [fyll];

    expect(pågåendeVenting(alle, 0)).toBeNull();
  });
});
