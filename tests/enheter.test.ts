import { describe, expect, it } from "vitest";
import { formaterMengde, formaterMinutter, tetthetGramPerDl, tilGram } from "@/lib/enheter";

describe("tetthetGramPerDl", () => {
  it("matcher sammensatte navn på siste ledd (hvetemel → mel, vaniljesukker → sukker)", () => {
    expect(tetthetGramPerDl("hvetemel")).toBe(60);
    expect(tetthetGramPerDl("sammalt mel")).toBe(60);
    expect(tetthetGramPerDl("vaniljesukker")).toBe(85);
    expect(tetthetGramPerDl("melis")).toBe(60);
  });

  it("lar IKKE melk treffe mel", () => {
    expect(tetthetGramPerDl("melk")).toBeNull();
    expect(tetthetGramPerDl("helmelk")).toBeNull();
  });

  it("gir null for væsker og ukjente varer", () => {
    expect(tetthetGramPerDl("vann")).toBeNull();
    expect(tetthetGramPerDl("fløte")).toBeNull();
    expect(tetthetGramPerDl("fersk gjær")).toBeNull();
  });
});

describe("tilGram", () => {
  it("konverterer mormors desilitermål til gram", () => {
    // 9 dl hvetemel à 60 g/dl = 540 g — selve grunnen til at Maren vil ha gram
    expect(tilGram("hvetemel", 9, "dl")).toBe(540);
    expect(tilGram("sukker", 1, "dl")).toBe(85);
  });

  it("konverterer skje-mål via ml", () => {
    // 2 ss kanel = 30 ml à 40 g/dl = 12 g
    expect(tilGram("kanel", 2, "ss")).toBe(12);
  });

  it("runder av til mengder en baker bryr seg om", () => {
    // 4 dl sukker = 340 g (allerede rund); 3 dl melis = 180 g; 1.5 dl sukker = 127.5 → 130
    expect(tilGram("sukker", 1.5, "dl")).toBe(130);
  });

  it("er identiteten for vektenheter", () => {
    expect(tilGram("smør", 100, "g")).toBe(100);
    expect(tilGram("hvetemel", 1, "kg")).toBe(1000);
  });

  it("gir null når tettheten er ukjent eller enheten ikke er volum", () => {
    expect(tilGram("melk", 5, "dl")).toBeNull();
    expect(tilGram("egg", 2, "stk")).toBeNull();
  });
});

describe("formaterMengde", () => {
  it("skriver brøker slik de står i en kokebok", () => {
    expect(formaterMengde(0.5, "ts")).toBe("½ ts");
    expect(formaterMengde(1.5, "dl")).toBe("1 ½ dl");
    expect(formaterMengde(0.25, "ts")).toBe("¼ ts");
  });

  it("skriver hele tall uten desimaler og null mengde som tom streng", () => {
    expect(formaterMengde(9, "dl")).toBe("9 dl");
    expect(formaterMengde(2, "stk")).toBe("2 stk");
    expect(formaterMengde(null, null)).toBe("");
  });

  it("bruker komma for desimaler uten pen brøk", () => {
    expect(formaterMengde(1.2, "dl")).toBe("1,2 dl");
  });
});

describe("formaterMinutter", () => {
  it("deler opp i timer og minutter", () => {
    expect(formaterMinutter(45)).toBe("45 min");
    expect(formaterMinutter(120)).toBe("2 t");
    expect(formaterMinutter(165)).toBe("2 t 45 min");
  });
});
