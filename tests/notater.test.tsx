// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { recipeNotes } from "@/lib/db/schema";
import { makeKokebok, resetDb } from "./db";
import "./rtl";
import { render, screen, userEvent, waitFor } from "./rtl";

// Sesjonssømmen: notat-actions slår opp brukeren via auth(); pek den på testbrukeren.
const hoisted = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (hoisted.userId ? { user: { id: hoisted.userId } } : null)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { NotatTavle } from "@/components/oppskrift/NotatTavle";

describe("postit-lapper (ekte UI-klikk, ekte server actions, ekte database)", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("skriver en lapp via skjemaet og finner den igjen i databasen", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    render(<NotatTavle recipeId={oppskrift.id} notater={[]} />);
    const bruker = userEvent.setup();

    await bruker.click(screen.getByText("ny lapp"));
    await bruker.type(screen.getByLabelText("Notat"), "husk jordbær til pynt");
    await bruker.click(screen.getByRole("button", { name: "Teip på" }));

    await waitFor(async () => {
      const lapper = await db.select().from(recipeNotes).where(eq(recipeNotes.recipeId, oppskrift.id));
      expect(lapper).toHaveLength(1);
      expect(lapper[0].tekst).toBe("husk jordbær til pynt");
      expect(lapper[0].farge).toBe("terrakotta");
      expect(lapper[0].userId).toBe(user.id);
    });
  });

  it("velger teipfarge med fargeprikkene", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    render(<NotatTavle recipeId={oppskrift.id} notater={[]} />);
    const bruker = userEvent.setup();

    await bruker.click(screen.getByText("ny lapp"));
    await bruker.type(screen.getByLabelText("Notat"), "denne var ikke god!");
    await bruker.click(screen.getByTitle("salvie"));
    await bruker.click(screen.getByRole("button", { name: "Teip på" }));

    await waitFor(async () => {
      const lapper = await db.select().from(recipeNotes).where(eq(recipeNotes.recipeId, oppskrift.id));
      expect(lapper).toHaveLength(1);
      expect(lapper[0].farge).toBe("salvie");
    });
  });

  it("river av en lapp — og lar andres lapper være i fred", async () => {
    const { user, oppskrift } = await makeKokebok();
    const annen = await makeKokebok();
    hoisted.userId = user.id;

    const [minLapp] = await db
      .insert(recipeNotes)
      .values({ recipeId: oppskrift.id, userId: user.id, tekst: "min lapp", farge: "rav" })
      .returning();
    const [andres] = await db
      .insert(recipeNotes)
      .values({ recipeId: oppskrift.id, userId: annen.user.id, tekst: "andres lapp", farge: "sand" })
      .returning();

    render(<NotatTavle recipeId={oppskrift.id} notater={[{ id: minLapp.id, tekst: minLapp.tekst, farge: "rav", plass: "nede" }]} />);
    const bruker = userEvent.setup();

    expect(screen.getByText("min lapp")).toBeInTheDocument();
    await bruker.click(screen.getByRole("button", { name: "Riv av lappen" }));

    await waitFor(async () => {
      const igjen = await db.select().from(recipeNotes).where(eq(recipeNotes.recipeId, oppskrift.id));
      expect(igjen.map((l) => l.id)).toEqual([andres.id]);
    });
  });
});
