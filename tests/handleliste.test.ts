import { describe, expect, it } from "vitest";
import { lagHandleliste } from "@/lib/handleliste";
import { testOppskrift } from "./db";
import type { Ingrediens } from "@/lib/db/schema";

function ingrediens(overrides: Partial<Ingrediens>): Ingrediens {
  return { id: "x", navn: "x", mengde: null, enhet: null, kommentar: null, gruppe: null, ...overrides };
}

function oppskriftMed(ingredienser: Ingrediens[]) {
  return testOppskrift({ ingredienser });
}

describe("handleliste-summeringen", () => {
  it("summerer samme vare i samme mål — på tvers av oppskrifter og grupper", () => {
    const boller = oppskriftMed([
      ingrediens({ id: "smor-deig", navn: "smør", mengde: 100, enhet: "g", gruppe: "Deig" }),
      ingrediens({ id: "smor-fyll", navn: "smør", mengde: 50,  enhet: "g", gruppe: "Fyll" }),
    ]);
    const kake = oppskriftMed([
      ingrediens({ id: "smor", navn: "Smør", mengde: 200, enhet: "g" }),
    ]);

    const linjer = lagHandleliste([{ content: boller }, { content: kake }]);
    expect(linjer).toHaveLength(1);
    expect(linjer[0].mengde).toBe(350);
    expect(linjer[0].enhet).toBe("g");
  });

  it("ganger hver rett med størrelsen den skal lages i — 4× boller er 4× mel", () => {
    const boller = oppskriftMed([ingrediens({ id: "mel", navn: "hvetemel", mengde: 9, enhet: "dl" })]);
    const kake   = oppskriftMed([ingrediens({ id: "mel", navn: "hvetemel", mengde: 4, enhet: "dl" })]);

    const linjer = lagHandleliste([{ content: boller, ganger: 4 }, { content: kake, ganger: 0.5 }]);
    expect(linjer).toHaveLength(1);
    expect(linjer[0].mengde).toBe(38);
  });

  it("blander aldri mål — 2 dl og 100 g av samme vare er to linjer", () => {
    const linjer = lagHandleliste([{ content: oppskriftMed([
      ingrediens({ id: "a", navn: "sukker", mengde: 2,   enhet: "dl" }),
      ingrediens({ id: "b", navn: "sukker", mengde: 100, enhet: "g" }),
    ]) }]);

    expect(linjer).toHaveLength(2);
    expect(linjer.map((l) => l.enhet).sort()).toEqual(["dl", "g"]);
  });

  it("mengdeløse varer («salt») samles til én linje uten mengde", () => {
    const linjer = lagHandleliste([
      { content: oppskriftMed([ingrediens({ id: "a", navn: "salt" })]) },
      { content: oppskriftMed([ingrediens({ id: "b", navn: "salt" })]), ganger: 4 },
    ]);

    expect(linjer).toHaveLength(1);
    expect(linjer[0].mengde).toBeNull();
  });

  it("sorterer alfabetisk — en handleliste leses ovenfra og ned i butikken", () => {
    const linjer = lagHandleliste([{ content: oppskriftMed([
      ingrediens({ id: "a", navn: "vaniljesukker", mengde: 1, enhet: "ts" }),
      ingrediens({ id: "b", navn: "egg",           mengde: 2, enhet: "stk" }),
      ingrediens({ id: "c", navn: "ananas",        mengde: 1, enhet: "stk" }),
    ]) }]);

    expect(linjer.map((l) => l.navn)).toEqual(["ananas", "egg", "vaniljesukker"]);
  });
});
