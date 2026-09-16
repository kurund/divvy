import { error, fail } from "@sveltejs/kit";
import { getSupabase } from "$lib/server/supabase";
import { parseAmountToCents, splitEqually } from "$lib/money";
import type { Expense, Group, Member } from "$lib/types";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const supabase = getSupabase();

  const { data: group, error: groupErr } = await supabase
    .from("groups")
    .select("id, slug, name, currency, created_at")
    .eq("slug", params.slug)
    .maybeSingle();
  if (groupErr) {
    console.error(groupErr);
    throw error(500, "Failed to load group.");
  }
  if (!group) throw error(404, "Group not found.");

  const [{ data: members, error: mErr }, { data: expenses, error: eErr }] =
    await Promise.all([
      supabase
        .from("members")
        .select("id, group_id, name, created_at")
        .eq("group_id", group.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("expenses")
        .select(
          "id, group_id, description, amount_cents, paid_by, created_by, created_at, updated_at, shares:expense_shares(expense_id, member_id, share_cents)",
        )
        .eq("group_id", group.id)
        .order("created_at", { ascending: false }),
    ]);

  if (mErr || eErr) {
    console.error(mErr ?? eErr);
    throw error(500, "Failed to load group data.");
  }

  return {
    group: group as Group,
    members: (members ?? []) as Member[],
    expenses: (expenses ?? []) as Expense[],
  };
};

async function loadGroupByslug(slug: string) {
  const supabase = getSupabase();
  const { data: group, error: groupErr } = await supabase
    .from("groups")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (groupErr) throw error(500, "Failed to load group.");
  if (!group) throw error(404, "Group not found.");
  return { supabase, groupId: group.id as string };
}

export const actions: Actions = {
  addMember: async ({ params, request }) => {
    const data = await request.formData();
    const name = String(data.get("name") ?? "").trim();
    if (!name) return fail(400, { addMemberError: "Name is required." });

    const { supabase, groupId } = await loadGroupByslug(params.slug!);
    const { error: e } = await supabase
      .from("members")
      .insert({ group_id: groupId, name });
    if (e) return fail(500, { addMemberError: "Could not add member." });
    return { addMemberOk: true };
  },

  addExpense: async ({ params, request }) => {
    const data = await request.formData();
    const description = String(data.get("description") ?? "").trim();
    const amountRaw = String(data.get("amount") ?? "");
    const paidBy = String(data.get("paid_by") ?? "");
    const createdBy = String(data.get("created_by") ?? "") || null;
    const participants = data.getAll("participants").map((p) => String(p));

    if (!description)
      return fail(400, { addExpenseError: "Description is required." });
    const amountCents = parseAmountToCents(amountRaw);
    if (amountCents === null)
      return fail(400, { addExpenseError: "Enter a valid positive amount." });
    if (!paidBy) return fail(400, { addExpenseError: "Choose who paid." });
    if (participants.length === 0)
      return fail(400, { addExpenseError: "Pick at least one participant." });

    const { supabase, groupId } = await loadGroupByslug(params.slug!);

    // Verify paidBy and participants belong to this group.
    const memberIds = new Set([
      paidBy,
      ...participants,
      ...(createdBy ? [createdBy] : []),
    ]);
    const { data: memberRows, error: mErr } = await supabase
      .from("members")
      .select("id")
      .eq("group_id", groupId)
      .in("id", [...memberIds]);
    if (mErr)
      return fail(500, { addExpenseError: "Could not validate members." });
    const validIds = new Set((memberRows ?? []).map((r) => r.id as string));
    if (!validIds.has(paidBy) || !participants.every((p) => validIds.has(p))) {
      return fail(400, {
        addExpenseError: "Members no longer exist. Refresh and try again.",
      });
    }
    const createdByValid =
      createdBy && validIds.has(createdBy) ? createdBy : null;

    const shareAmounts = splitEqually(amountCents, participants.length);

    const { data: expense, error: expErr } = await supabase
      .from("expenses")
      .insert({
        group_id: groupId,
        description,
        amount_cents: amountCents,
        paid_by: paidBy,
        created_by: createdByValid,
      })
      .select("id")
      .single();
    if (expErr || !expense)
      return fail(500, { addExpenseError: "Could not add expense." });

    const { error: sharesErr } = await supabase.from("expense_shares").insert(
      participants.map((memberId, i) => ({
        expense_id: expense.id,
        member_id: memberId,
        share_cents: shareAmounts[i],
      })),
    );
    if (sharesErr) {
      // best-effort cleanup
      await supabase.from("expenses").delete().eq("id", expense.id);
      return fail(500, { addExpenseError: "Could not save expense shares." });
    }

    return { addExpenseOk: true };
  },

  deleteExpense: async ({ params, request }) => {
    const data = await request.formData();
    const expenseId = String(data.get("expense_id") ?? "");
    const actingAs = String(data.get("acting_as") ?? "") || null;
    if (!expenseId)
      return fail(400, { deleteExpenseError: "Missing expense id." });

    const { supabase, groupId } = await loadGroupByslug(params.slug!);

    const { data: exp, error: eErr } = await supabase
      .from("expenses")
      .select("id, created_by, group_id")
      .eq("id", expenseId)
      .maybeSingle();
    if (eErr) return fail(500, { deleteExpenseError: "Lookup failed." });
    if (!exp || exp.group_id !== groupId)
      return fail(404, { deleteExpenseError: "Expense not found." });

    if (exp.created_by && exp.created_by !== actingAs) {
      return fail(403, {
        deleteExpenseError:
          "Only the person who added this expense can delete it.",
      });
    }

    const { error: delErr } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId);
    if (delErr) return fail(500, { deleteExpenseError: "Delete failed." });
    return { deleteExpenseOk: true };
  },
};
