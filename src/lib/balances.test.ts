import { describe, expect, it } from "vitest";
import { computeBalances, simplifyDebts } from "./balances";
import type { Expense, Member } from "./types";

function member(id: string, name: string): Member {
  return { id, group_id: "g", name, created_at: "" };
}

function expense(
  id: string,
  paidBy: string,
  amountCents: number,
  shares: Array<[string, number]>,
): Expense {
  return {
    id,
    group_id: "g",
    description: id,
    amount_cents: amountCents,
    paid_by: paidBy,
    created_by: null,
    created_at: "",
    updated_at: "",
    shares: shares.map(([member_id, share_cents]) => ({
      expense_id: id,
      member_id,
      share_cents,
    })),
  };
}

function balanceOf(id: string, balances: ReturnType<typeof computeBalances>) {
  return balances.find((b) => b.member_id === id)?.net_cents;
}

describe("computeBalances", () => {
  it("returns zero for everyone with no expenses", () => {
    const members = [member("a", "A"), member("b", "B")];
    const balances = computeBalances(members, []);
    expect(balances).toEqual([
      { member_id: "a", net_cents: 0 },
      { member_id: "b", net_cents: 0 },
    ]);
  });

  it("credits the payer and debits the participants", () => {
    // A pays 1000, split equally between A and B
    const members = [member("a", "A"), member("b", "B")];
    const expenses = [
      expense("e1", "a", 1000, [
        ["a", 500],
        ["b", 500],
      ]),
    ];
    const balances = computeBalances(members, expenses);
    expect(balanceOf("a", balances)).toBe(500);
    expect(balanceOf("b", balances)).toBe(-500);
  });

  it("net balances always sum to zero", () => {
    const members = ["a", "b", "c", "d"].map((id) => member(id, id));
    const expenses = [
      expense("e1", "a", 3300, [
        ["a", 1100],
        ["b", 1100],
        ["c", 1100],
      ]),
      expense("e2", "b", 4000, [
        ["a", 1000],
        ["b", 1000],
        ["c", 1000],
        ["d", 1000],
      ]),
      expense("e3", "d", 1200, [
        ["b", 600],
        ["c", 600],
      ]),
    ];
    const balances = computeBalances(members, expenses);
    const sum = balances.reduce((s, b) => s + b.net_cents, 0);
    expect(sum).toBe(0);
  });

  it("matches the Buckfast trip real-world scenario", () => {
    // Real check the user asked us to verify.
    // Members created in order Pavan, Karthik, Kurund => remainder cents
    // go to the first two in that order.
    const members = [
      member("p", "Pavan"),
      member("k", "Karthik"),
      member("u", "Kurund"),
    ];
    const expenses = [
      // £22.50 by Pavan, split 3 ways (750/750/750)
      expense("buckfast", "p", 2250, [
        ["p", 750],
        ["k", 750],
        ["u", 750],
      ]),
      // £27.35 by Pavan, split 3 ways (912/912/911 — 2p remainder)
      expense("greendale", "p", 2735, [
        ["p", 912],
        ["k", 912],
        ["u", 911],
      ]),
      // £58.50 by Kurund, split 3 ways (1950/1950/1950)
      expense("caving", "u", 5850, [
        ["p", 1950],
        ["k", 1950],
        ["u", 1950],
      ]),
      // £49.50 by Karthik, split 3 ways (1650/1650/1650)
      expense("lunch", "k", 4950, [
        ["p", 1650],
        ["k", 1650],
        ["u", 1650],
      ]),
    ];
    const balances = computeBalances(members, expenses);

    expect(balanceOf("p", balances)).toBe(-277); // £2.77 owed
    expect(balanceOf("k", balances)).toBe(-312); // £3.12 owed
    expect(balanceOf("u", balances)).toBe(589); // £5.89 credit

    const settlements = simplifyDebts(balances);
    // Only 2 transfers needed — matches greedy minimum for one creditor
    expect(settlements).toHaveLength(2);

    // Karthik -> Kurund £3.12
    expect(settlements).toContainEqual({
      from_member_id: "k",
      to_member_id: "u",
      amount_cents: 312,
    });
    // Pavan -> Kurund £2.77
    expect(settlements).toContainEqual({
      from_member_id: "p",
      to_member_id: "u",
      amount_cents: 277,
    });
  });
});

describe("simplifyDebts", () => {
  it("returns nothing when everyone is settled", () => {
    expect(
      simplifyDebts([
        { member_id: "a", net_cents: 0 },
        { member_id: "b", net_cents: 0 },
      ]),
    ).toEqual([]);
  });

  it("settles a simple two-person debt", () => {
    const settlements = simplifyDebts([
      { member_id: "a", net_cents: 500 },
      { member_id: "b", net_cents: -500 },
    ]);
    expect(settlements).toEqual([
      { from_member_id: "b", to_member_id: "a", amount_cents: 500 },
    ]);
  });

  it("uses at most n-1 transfers for n people", () => {
    // 5 people, arbitrary but zero-summed balances
    const balances = [
      { member_id: "a", net_cents: 1000 },
      { member_id: "b", net_cents: -400 },
      { member_id: "c", net_cents: 300 },
      { member_id: "d", net_cents: -700 },
      { member_id: "e", net_cents: -200 },
    ];
    const settlements = simplifyDebts(balances);
    expect(settlements.length).toBeLessThanOrEqual(4);
  });

  it("produces settlements whose sums balance", () => {
    const balances = [
      { member_id: "a", net_cents: 1000 },
      { member_id: "b", net_cents: -400 },
      { member_id: "c", net_cents: 300 },
      { member_id: "d", net_cents: -700 },
      { member_id: "e", net_cents: -200 },
    ];
    const settlements = simplifyDebts(balances);

    const perMember = new Map<string, number>();
    for (const b of balances) perMember.set(b.member_id, 0);
    for (const s of settlements) {
      perMember.set(
        s.from_member_id,
        (perMember.get(s.from_member_id) ?? 0) - s.amount_cents,
      );
      perMember.set(
        s.to_member_id,
        (perMember.get(s.to_member_id) ?? 0) + s.amount_cents,
      );
    }
    // After settling, aggregate transfers per member should exactly match their balance
    for (const b of balances) {
      expect(perMember.get(b.member_id)).toBe(b.net_cents);
    }
  });
});
