import { beforeEach, describe, expect, it, vi } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { createMockSupabase, makeRequest } from "./utils";

// Hoisted holder so vi.mock's factory can see the current mock instance.
const state = vi.hoisted(() => ({
  supabase: null as ReturnType<typeof createMockSupabase> | null,
}));

vi.mock("$lib/server/supabase", () => ({
  getSupabase: () => state.supabase,
}));

// Import after mocking
const { actions } = await import("../src/routes/+page.server");

beforeEach(() => {
  state.supabase = createMockSupabase();
});

async function invoke(fields: Record<string, string | string[]>) {
  try {
    const result = await actions.create({
      request: makeRequest(fields) as unknown as Request,
      params: {},
      cookies: {},
      fetch: globalThis.fetch,
      getClientAddress: () => "",
      locals: {},
      platform: undefined,
      route: { id: "/" },
      setHeaders: () => {},
      url: new URL("http://test/"),
      isDataRequest: false,
      isSubRequest: false,
    } as never);
    return { thrown: null as unknown, result };
  } catch (thrown) {
    return { thrown, result: null };
  }
}

describe("create group action", () => {
  it("creates a group and redirects to /g/[slug]", async () => {
    const { thrown } = await invoke({
      name: "Goa trip",
      currency: "INR",
      members: ["Ana", "Bob"],
    });

    expect(isRedirect(thrown)).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redirect = thrown as any;
    expect(redirect.status).toBe(303);
    expect(redirect.location).toMatch(/^\/g\/[a-z2-9]{12}$/);

    const groups = state.supabase!.db.groups;
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ name: "Goa trip", currency: "INR" });

    const members = state.supabase!.db.members;
    expect(members).toHaveLength(2);
    expect(members.map((m) => m.name).sort()).toEqual(["Ana", "Bob"]);
    expect(members.every((m) => m.group_id === groups[0].id)).toBe(true);
  });

  it("uppercases the currency", async () => {
    await invoke({
      name: "Trip",
      currency: "gbp",
      members: ["A", "B"],
    });
    expect(state.supabase!.db.groups[0].currency).toBe("GBP");
  });

  it("trims whitespace from member names and drops empties", async () => {
    await invoke({
      name: "Trip",
      currency: "USD",
      members: ["  Ana  ", "", "Bob"],
    });
    const names = state.supabase!.db.members.map((m) => m.name).sort();
    expect(names).toEqual(["Ana", "Bob"]);
  });

  it("fails when the group name is missing", async () => {
    const { thrown, result } = await invoke({
      name: "",
      currency: "GBP",
      members: ["A", "B"],
    });
    expect(thrown).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = result as any;
    expect(r.status).toBe(400);
    expect(r.data.error).toMatch(/name is required/i);
    expect(state.supabase!.db.groups).toHaveLength(0);
  });

  it("fails on an unsupported currency", async () => {
    const { thrown, result } = await invoke({
      name: "Trip",
      currency: "XYZ",
      members: ["A", "B"],
    });
    expect(thrown).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).data.error).toMatch(/unsupported currency/i);
  });

  it("fails when fewer than 2 members are provided", async () => {
    const { thrown, result } = await invoke({
      name: "Trip",
      currency: "GBP",
      members: ["Only me"],
    });
    expect(thrown).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).data.error).toMatch(/at least two/i);
    expect(state.supabase!.db.groups).toHaveLength(0);
  });
});
