import { fail, redirect } from "@sveltejs/kit";
import { customAlphabet } from "nanoid";
import { getSupabase } from "$lib/server/supabase";
import type { Actions } from "./$types";

const makeSlug = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 12);

const ALLOWED_CURRENCIES = new Set([
  "INR",
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "SGD",
]);

export const actions: Actions = {
  create: async ({ request }) => {
    const data = await request.formData();
    const name = String(data.get("name") ?? "").trim();
    const currency = String(data.get("currency") ?? "USD")
      .trim()
      .toUpperCase();
    const memberNames = data
      .getAll("members")
      .map((m) => String(m).trim())
      .filter(Boolean);

    if (!name) return fail(400, { error: "Group name is required." });
    if (!ALLOWED_CURRENCIES.has(currency))
      return fail(400, { error: "Unsupported currency." });
    if (memberNames.length < 2)
      return fail(400, {
        error: "Add at least two members to start splitting.",
      });

    const supabase = getSupabase();
    const slug = makeSlug();

    const { data: group, error: groupErr } = await supabase
      .from("groups")
      .insert({ slug, name, currency })
      .select("id, slug")
      .single();
    if (groupErr || !group) {
      console.error("create group failed", groupErr);
      return fail(500, { error: "Could not create group. Please try again." });
    }

    const { error: memberErr } = await supabase
      .from("members")
      .insert(memberNames.map((n) => ({ group_id: group.id, name: n })));
    if (memberErr) {
      console.error("create members failed", memberErr);
      return fail(500, { error: "Group created but adding members failed." });
    }

    throw redirect(303, `/g/${group.slug}`);
  },
};
