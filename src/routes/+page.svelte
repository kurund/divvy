<script lang="ts">
  import { enhance } from "$app/forms";

  let { form } = $props();

  let submitting = $state(false);
  let members = $state(["", "", ""]);

  function addMemberRow() {
    members = [...members, ""];
  }
  function removeMemberRow(i: number) {
    members = members.filter((_, idx) => idx !== i);
  }
</script>

<section class="space-y-10">
  <div class="space-y-3 text-center sm:text-left">
    <span
      class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
    >
      <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
      No sign-up. Share a link, split expenses.
    </span>
    <h1 class="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
      Split what you spend.
      <span class="text-emerald-600">Settle in a click.</span>
    </h1>
    <p class="max-w-xl text-base text-slate-600 sm:text-lg">
      Trips, dinners, roommates. Create a group, drop the link in your chat, and
      let everyone log what they paid. Divvy shows the fewest transfers to
      square up.
    </p>
  </div>

  <form
    method="POST"
    action="?/create"
    class="space-y-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"
    use:enhance={() => {
      submitting = true;
      return async ({ update }) => {
        await update();
        submitting = false;
      };
    }}
  >
    <div>
      <label for="name" class="mb-1.5 block text-sm font-medium text-slate-700"
        >Group name</label
      >
      <input
        id="name"
        name="name"
        required
        maxlength="80"
        placeholder="Goa trip, Roommates, Dinner at Mum's Kitchen…"
        class="w-full rounded-xl border-0 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500"
      />
    </div>

    <div>
      <div class="mb-1.5 flex items-center justify-between">
        <span class="text-sm font-medium text-slate-700">Members</span>
        <button
          type="button"
          onclick={addMemberRow}
          class="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
        >
          + Add member
        </button>
      </div>
      <div class="space-y-2">
        {#each members as _, i (i)}
          <div class="flex gap-2">
            <input
              name="members"
              bind:value={members[i]}
              placeholder="Name"
              maxlength="60"
              class="flex-1 rounded-xl border-0 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
            {#if members.length > 2}
              <button
                type="button"
                onclick={() => removeMemberRow(i)}
                aria-label="Remove member"
                class="rounded-xl px-3 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-slate-700"
              >
                &times;
              </button>
            {/if}
          </div>
        {/each}
      </div>
      <p class="mt-2 text-xs text-slate-500">You can add more members later.</p>
    </div>

    <div>
      <label
        for="currency"
        class="mb-1.5 block text-sm font-medium text-slate-700">Currency</label
      >
      <select
        id="currency"
        name="currency"
        class="w-full rounded-xl border-0 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500"
      >
        <option value="GBP">GBP - British Pound</option>
        <option value="INR">INR - Indian Rupee</option>
        <option value="USD">USD - US Dollar</option>
        <option value="EUR">EUR - Euro</option>
        <option value="JPY">JPY - Japanese Yen</option>
      </select>
    </div>

    {#if form?.error}
      <div
        class="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-100"
      >
        {form.error}
      </div>
    {/if}

    <button
      type="submit"
      disabled={submitting}
      class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
    >
      {submitting ? "Creating…" : "Create group →"}
    </button>
  </form>

  <ul class="grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
    <li class="rounded-2xl bg-white/60 p-4 ring-1 ring-slate-200/70">
      <p class="mb-1 font-semibold text-slate-900">🔗 Shareable link</p>
      <p>The URL is the invite. No accounts or emails.</p>
    </li>
    <li class="rounded-2xl bg-white/60 p-4 ring-1 ring-slate-200/70">
      <p class="mb-1 font-semibold text-slate-900">⚖️ Live balances</p>
      <p>Every add updates who owes whom instantly.</p>
    </li>
    <li class="rounded-2xl bg-white/60 p-4 ring-1 ring-slate-200/70">
      <p class="mb-1 font-semibold text-slate-900">✨ Fewest transfers</p>
      <p>Smart settlement means less back-and-forth.</p>
    </li>
  </ul>
</section>
