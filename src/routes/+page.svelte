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
  <div class="space-y-4 text-center sm:text-left">
    <span
      class="inline-flex items-center gap-1.5 rounded-full bg-gold-tint px-3 py-1 text-xs font-medium text-gold ring-1 ring-inset ring-gold/30"
    >
      <span class="h-1.5 w-1.5 rounded-full bg-gold"></span>
      No sign-up. Share a link, split expenses.
    </span>
    <h1
      class="text-4xl leading-[1.05] tracking-tight text-ink sm:text-6xl"
      style="font-family: 'Fraunces', ui-serif, Georgia, serif; font-weight: 600; letter-spacing: -0.03em;"
    >
      Split what you spend.
      <span class="text-gold italic">Settle in a click.</span>
    </h1>
    <p class="max-w-xl text-base text-ink-soft sm:text-lg">
      Trips, dinners, roommates. Create a group, drop the link in your chat, and
      let everyone log what they paid. Divvy shows the fewest transfers to
      square up.
    </p>
  </div>

  <form
    method="POST"
    action="?/create"
    class="space-y-6 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-line sm:p-8"
    use:enhance={() => {
      submitting = true;
      return async ({ update }) => {
        await update();
        submitting = false;
      };
    }}
  >
    <div>
      <label for="name" class="mb-1.5 block text-sm font-medium text-ink">
        Group name
      </label>
      <input
        id="name"
        name="name"
        required
        maxlength="80"
        placeholder="Goa trip, Roommates, Dinner at Mum's Kitchen…"
        class="w-full rounded-lg border-0 bg-paper px-3.5 py-2.5 text-sm text-ink ring-1 ring-inset ring-line placeholder:text-ink-mute focus:bg-card focus:ring-2 focus:ring-navy"
      />
    </div>

    <div>
      <div class="mb-1.5 flex items-center justify-between">
        <span class="text-sm font-medium text-ink">Members</span>
        <button
          type="button"
          onclick={addMemberRow}
          class="text-xs font-semibold text-navy hover:text-navy-dark"
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
              class="flex-1 rounded-lg border-0 bg-paper px-3.5 py-2.5 text-sm text-ink ring-1 ring-inset ring-line placeholder:text-ink-mute focus:bg-card focus:ring-2 focus:ring-navy"
            />
            {#if members.length > 2}
              <button
                type="button"
                onclick={() => removeMemberRow(i)}
                aria-label="Remove member"
                class="rounded-lg px-3 text-ink-mute ring-1 ring-inset ring-line hover:bg-paper hover:text-ink"
              >
                &times;
              </button>
            {/if}
          </div>
        {/each}
      </div>
      <p class="mt-2 text-xs text-ink-mute">You can add more members later.</p>
    </div>

    <div>
      <label for="currency" class="mb-1.5 block text-sm font-medium text-ink">
        Currency
      </label>
      <select
        id="currency"
        name="currency"
        class="w-full rounded-lg border-0 bg-paper px-3.5 py-2.5 text-sm text-ink ring-1 ring-inset ring-line focus:bg-card focus:ring-2 focus:ring-navy"
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
        class="rounded-lg bg-clay-tint px-3.5 py-2.5 text-sm text-clay ring-1 ring-inset ring-clay/25"
      >
        {form.error}
      </div>
    {/if}

    <button
      type="submit"
      disabled={submitting}
      class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark disabled:opacity-60"
    >
      {submitting ? "Creating…" : "Create group →"}
    </button>
  </form>

  <ul class="grid gap-4 text-sm text-ink-soft sm:grid-cols-3">
    <li class="rounded-xl bg-card/60 p-4 ring-1 ring-line/70">
      <p class="mb-1 font-semibold text-ink">Shareable link</p>
      <p>The URL is the invite. No accounts or emails.</p>
    </li>
    <li class="rounded-xl bg-card/60 p-4 ring-1 ring-line/70">
      <p class="mb-1 font-semibold text-ink">Live balances</p>
      <p>Every add updates who owes whom instantly.</p>
    </li>
    <li class="rounded-xl bg-card/60 p-4 ring-1 ring-line/70">
      <p class="mb-1 font-semibold text-ink">Fewest transfers</p>
      <p>Smart settlement means less back-and-forth.</p>
    </li>
  </ul>
</section>
