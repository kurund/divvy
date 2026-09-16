<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();

	let submitting = $state(false);
	let members = $state(['', '', '']);

	function addMemberRow() {
		members = [...members, ''];
	}
	function removeMemberRow(i: number) {
		members = members.filter((_, idx) => idx !== i);
	}
</script>

<section class="space-y-8">
	<div class="space-y-2">
		<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">
			Split expenses with your group.
		</h1>
		<p class="text-neutral-600 dark:text-neutral-400">
			Create a group, share the link, and everyone can log what they paid. We&rsquo;ll show who
			owes whom and the fewest transfers to settle up.
		</p>
	</div>

	<form
		method="POST"
		action="?/create"
		class="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		<div>
			<label for="name" class="mb-1 block text-sm font-medium">Group name</label>
			<input
				id="name"
				name="name"
				required
				maxlength="80"
				placeholder="Goa trip, Roommates, Dinner at Julio's..."
				class="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-950"
			/>
		</div>

		<div>
			<label for="currency" class="mb-1 block text-sm font-medium">Currency</label>
			<select
				id="currency"
				name="currency"
				class="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-950"
			>
				<option value="INR">INR — Indian Rupee</option>
				<option value="USD">USD — US Dollar</option>
				<option value="EUR">EUR — Euro</option>
				<option value="GBP">GBP — British Pound</option>
				<option value="JPY">JPY — Japanese Yen</option>
				<option value="AUD">AUD — Australian Dollar</option>
				<option value="CAD">CAD — Canadian Dollar</option>
				<option value="SGD">SGD — Singapore Dollar</option>
			</select>
		</div>

		<div>
			<div class="mb-1 flex items-center justify-between">
				<span class="text-sm font-medium">Members</span>
				<button
					type="button"
					onclick={addMemberRow}
					class="text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
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
							class="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-950"
						/>
						{#if members.length > 2}
							<button
								type="button"
								onclick={() => removeMemberRow(i)}
								aria-label="Remove member"
								class="rounded-lg border border-neutral-300 px-2 text-sm text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
							>
								&times;
							</button>
						{/if}
					</div>
				{/each}
			</div>
			<p class="mt-1 text-xs text-neutral-500">You can add more members later.</p>
		</div>

		{#if form?.error}
			<div class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
				{form.error}
			</div>
		{/if}

		<button
			type="submit"
			disabled={submitting}
			class="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
		>
			{submitting ? 'Creating…' : 'Create group'}
		</button>
	</form>
</section>
