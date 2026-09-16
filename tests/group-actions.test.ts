import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSupabase, makeRequest } from "./utils";

const state = vi.hoisted(() => ({
  supabase: null as ReturnType<typeof createMockSupabase> | null,
}));

vi.mock("$lib/server/supabase", () => ({
  getSupabase: () => state.supabase,
}));

const mod = await import("../src/routes/g/[slug]/+page.server");

const SLUG = "test-group-01";

function seedGroup() {
  state.supabase!.seed("groups", [
    { id: "g1", slug: SLUG, name: "Test", currency: "GBP" },
  ]);
  state.supabase!.seed("members", [
    { id: "m-pavan", group_id: "g1", name: "Pavan", created_at: "2024-01-01" },
    {
      id: "m-karthik",
      group_id: "g1",
      name: "Karthik",
      created_at: "2024-01-02",
    },
    {
      id: "m-kurund",
      group_id: "g1",
      name: "Kurund",
      created_at: "2024-01-03",
    },
  ]);
}

async function invoke(
  actionName: keyof typeof mod.actions,
  fields: Record<string, string | string[]>,
) {
  const action = mod.actions[actionName]!;
  try {
    const result = await action({
      request: makeRequest(fields) as unknown as Request,
      params: { slug: SLUG },
      cookies: {},
      fetch: globalThis.fetch,
      getClientAddress: () => "",
      locals: {},
      platform: undefined,
      route: { id: "/g/[slug]" },
      setHeaders: () => {},
      url: new URL(`http://test/g/${SLUG}`),
      isDataRequest: false,
      isSubRequest: false,
    } as never);
    return { thrown: null as unknown, result };
  } catch (thrown) {
    return { thrown, result: null };
  }
}

beforeEach(() => {
  state.supabase = createMockSupabase();
  seedGroup();
});

describe("addMember action", () => {
  it("adds a member to the group", async () => {
    const { thrown } = await invoke("addMember", { name: "Diya" });
    expect(thrown).toBeNull();
    const members = state.supabase!.db.members.filter(
      (m) => m.group_id === "g1",
    );
    expect(members).toHaveLength(4);
    expect(members.some((m) => m.name === "Diya")).toBe(true);
  });

  it("trims the name", async () => {
    await invoke("addMember", { name: "  Diya  " });
    const diya = state.supabase!.db.members.find((m) => m.name === "Diya");
    expect(diya).toBeDefined();
  });

  it("rejects empty name", async () => {
    const { result } = await invoke("addMember", { name: "" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = result as any;
    expect(r.status).toBe(400);
    expect(r.data.addMemberError).toMatch(/required/i);
  });
});

describe("addExpense action", () => {
  it("stores expense and shares with equal split", async () => {
    await invoke("addExpense", {
      description: "Buckfast abbey fuel + food",
      amount: "22.50",
      paid_by: "m-pavan",
      created_by: "m-pavan",
      participants: ["m-pavan", "m-karthik", "m-kurund"],
    });

    const expenses = state.supabase!.db.expenses;
    expect(expenses).toHaveLength(1);
    expect(expenses[0]).toMatchObject({
      description: "Buckfast abbey fuel + food",
      amount_cents: 2250,
      paid_by: "m-pavan",
      created_by: "m-pavan",
      group_id: "g1",
    });

    const shares = state.supabase!.db.expense_shares.filter(
      (s) => s.expense_id === expenses[0].id,
    );
    expect(shares).toHaveLength(3);
    expect(shares.map((s) => s.share_cents).sort()).toEqual([750, 750, 750]);
    // Sum equals total
    const sum = shares.reduce((a, b) => a + (b.share_cents as number), 0);
    expect(sum).toBe(2250);
  });

  it("distributes remainder cents (Greendale £27.35 among 3)", async () => {
    await invoke("addExpense", {
      description: "Greendale",
      amount: "27.35",
      paid_by: "m-pavan",
      created_by: "m-pavan",
      participants: ["m-pavan", "m-karthik", "m-kurund"],
    });

    const expenses = state.supabase!.db.expenses;
    const shares = state.supabase!.db.expense_shares.filter(
      (s) => s.expense_id === expenses[0].id,
    );
    const sum = shares.reduce((a, b) => a + (b.share_cents as number), 0);
    expect(sum).toBe(2735);
    expect(shares.map((s) => s.share_cents).sort()).toEqual([911, 912, 912]);
  });

  it("rejects a missing description", async () => {
    const { result } = await invoke("addExpense", {
      description: "",
      amount: "10.00",
      paid_by: "m-pavan",
      participants: ["m-pavan", "m-karthik"],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).data.addExpenseError).toMatch(/description/i);
    expect(state.supabase!.db.expenses).toHaveLength(0);
  });

  it("rejects an invalid amount", async () => {
    const { result } = await invoke("addExpense", {
      description: "Snacks",
      amount: "-5",
      paid_by: "m-pavan",
      participants: ["m-pavan", "m-karthik"],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).data.addExpenseError).toMatch(/valid.*amount/i);
    expect(state.supabase!.db.expenses).toHaveLength(0);
  });

  it("rejects when no participants are picked", async () => {
    const { result } = await invoke("addExpense", {
      description: "Snacks",
      amount: "10.00",
      paid_by: "m-pavan",
      participants: [],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).data.addExpenseError).toMatch(/participant/i);
  });

  it("rejects an unknown payer", async () => {
    const { result } = await invoke("addExpense", {
      description: "Snacks",
      amount: "10.00",
      paid_by: "m-outsider",
      participants: ["m-pavan"],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).data.addExpenseError).toMatch(/no longer exist/i);
  });

  it("stores created_by as null when it isn't a valid group member", async () => {
    await invoke("addExpense", {
      description: "Snacks",
      amount: "10.00",
      paid_by: "m-pavan",
      created_by: "m-outsider",
      participants: ["m-pavan", "m-karthik"],
    });
    const exp = state.supabase!.db.expenses[0];
    expect(exp.created_by).toBeNull();
  });
});

describe("deleteExpense action", () => {
  function addExpenseRow(createdBy: string | null) {
    state.supabase!.seed("expenses", [
      {
        id: "e1",
        group_id: "g1",
        description: "Snacks",
        amount_cents: 900,
        paid_by: "m-pavan",
        created_by: createdBy,
      },
    ]);
    state.supabase!.seed("expense_shares", [
      { expense_id: "e1", member_id: "m-pavan", share_cents: 300 },
      { expense_id: "e1", member_id: "m-karthik", share_cents: 300 },
      { expense_id: "e1", member_id: "m-kurund", share_cents: 300 },
    ]);
  }

  it("lets the creator delete their own expense", async () => {
    addExpenseRow("m-pavan");
    const { result } = await invoke("deleteExpense", {
      expense_id: "e1",
      acting_as: "m-pavan",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any)?.deleteExpenseOk).toBe(true);
    expect(
      state.supabase!.db.expenses.find((e) => e.id === "e1"),
    ).toBeUndefined();
  });

  it("blocks a non-creator from deleting", async () => {
    addExpenseRow("m-pavan");
    const { result } = await invoke("deleteExpense", {
      expense_id: "e1",
      acting_as: "m-karthik",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = result as any;
    expect(r.status).toBe(403);
    expect(r.data.deleteExpenseError).toMatch(/only the person/i);
    expect(
      state.supabase!.db.expenses.find((e) => e.id === "e1"),
    ).toBeDefined();
  });

  it("allows anyone to delete when created_by is null", async () => {
    addExpenseRow(null);
    const { result } = await invoke("deleteExpense", {
      expense_id: "e1",
      acting_as: "m-karthik",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any)?.deleteExpenseOk).toBe(true);
  });

  it("returns 404 for an unknown expense id", async () => {
    const { result } = await invoke("deleteExpense", {
      expense_id: "nope",
      acting_as: "m-pavan",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = result as any;
    expect(r.status).toBe(404);
  });
});
