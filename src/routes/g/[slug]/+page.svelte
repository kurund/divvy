<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { formatCents } from '$lib/money';
	import { computeBalances, simplifyDebts } from '$lib/balances';
	import { getIdentity, setIdentity, clearIdentity } from '$lib/identity';
	import type { Member } from '$lib/types';

	let { data, form } = $props();

	const membersById = $derived(new Map(data.members.map((m) => [m.id, m])));
	const balances = $derived(computeBalances(data.members, data.expenses));
	const settlements = $derived(simplifyDebts(balances));
	const totalSpentCents = $derived(
		data.expenses.reduce((sum, e) => sum + e.amount_cents, 0)
	);

	let myMemberId = $state<string | null>(null);
	let identityLoaded = $state(false);
	let showIdentityPicker = $state(false);

	onMount(() => {
		myMemberId = getIdentity(data.group.slug);
		identityLoaded = true;
		if (!myMemberId) showIdentityPicker = true;
	});

	function claimIdentity(memberId: string) {
		setIdentity(data.group.slug, memberId);
		myMemberId = memberId;
		showIdentityPicker = false;
	}

	function forgetIdentity() {
		clearIdentity(data.group.slug);
		myMemberId = null;
		showIdentityPicker = true;
	}

	function memberName(id: string): string {
		return membersById.get(id)?.name ?? 'Unknown';
	}

	// Add-expense form state
	let expenseDescription = $state('');
	let expenseAmount = $state('');
	let expensePaidBy = $state<string>('');
	let expenseParticipants = $state<Set<string>>(new Set());
	let submittingExpense = $state(false);

	$effect(() => {
		// Default paidBy to my identity; default participants to everyone.
		if (identityLoaded && !expensePaidBy) {
			expensePaidBy = myMemberId ?? data.members[0]?.id ?? '';
		}
		if (expenseParticipants.size === 0 && data.members.length > 0) {
			expenseParticipants = new Set(data.members.map((m) => m.id));
		}
	});

	function toggleParticipant(id: string) {
		const next = new Set(expenseParticipants);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expenseParticipants = next;
	}
	function toggleAllParticipants() {
		if (expenseParticipants.size === data.members.length) {
			expenseParticipants = new Set();
		} else {
			expenseParticipants = new Set(data.members.map((m) => m.id));
		}
	}

	let copyState = $state<'idle' | 'copied'>('idle');
	async function copyShareLink() {
		try {
			await navigator.clipboard.writeText(page.url.href);
			copyState = 'copied';
			setTimeout(() => (copyState = 'idle'), 1500);
		} catch {
			// noop
		}
	}

	let addingMember = $state(false);
</script>

<section class="space-y-8">
	<header class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{data.group.name}</h1>
			<p class="text-sm text-neutral-500">
				{data.members.length} members · {data.group.currency} · total spent
				{formatCents(totalSpentCents, data.group.currency)}
			</p>
		</div>
		<button
			type="button"
			onclick={copyShareLink}
			class="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
		>
			{copyState === 'copied' ? 'Link copied!' : 'Copy share link'}
		</button>
	</header>

	{#if identityLoaded && myMemberId}
		<div
			class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
		>
			<span>You are logging in as <strong>{memberName(myMemberId)}</strong>.</span>
			<button
				type="button"
				onclick={forgetIdentity}
				class="text-xs font-medium underline hover:no-underline"
			>
				Not you?
			</button>
		</div>
	{/if}

	{#if identityLoaded && showIdentityPicker}
		<div class="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/40">
			<h2 class="mb-1 font-semibold">Who are you?</h2>
			<p class="mb-3 text-sm text-amber-900 dark:text-amber-200">
				Pick your name so we can tag expenses you add. You&rsquo;ll only be able to edit or
				delete expenses you created.
			</p>
			<div class="flex flex-wrap gap-2">
				{#each data.members as m (m.id)}
					<button
						type="button"
						onclick={() => claimIdentity(m.id)}
						class="rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium hover:bg-amber-100 dark:border-amber-700 dark:bg-neutral-900 dark:hover:bg-amber-950"
					>
						{m.name}
					</button>
				{/each}
			</div>
			<p class="mt-3 text-xs text-amber-800 dark:text-amber-300">
				Not listed? Add yourself as a member below first.
			</p>
		</div>
	{/if}

	<!-- Balances + settlements -->
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Balances</h2>
			{#if balances.every((b) => b.net_cents === 0)}
				<p class="text-sm text-neutral-500">All settled up. Nice.</p>
			{:else}
				<ul class="space-y-1.5 text-sm">
					{#each balances as b (b.member_id)}
						<li class="flex items-center justify-between">
							<span>{memberName(b.member_id)}</span>
							{#if b.net_cents > 0}
								<span class="font-medium text-emerald-700 dark:text-emerald-400">
									+{formatCents(b.net_cents, data.group.currency)}
								</span>
							{:else if b.net_cents < 0}
								<span class="font-medium text-red-600 dark:text-red-400">
									−{formatCents(-b.net_cents, data.group.currency)}
								</span>
							{:else}
								<span class="text-neutral-500">settled</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
				Suggested transfers
			</h2>
			{#if settlements.length === 0}
				<p class="text-sm text-neutral-500">Nothing to transfer.</p>
			{:else}
				<ul class="space-y-1.5 text-sm">
					{#each settlements as s (s.from_member_id + s.to_member_id + s.amount_cents)}
						<li>
							<span class="font-medium">{memberName(s.from_member_id)}</span>
							<span class="text-neutral-500"> → </span>
							<span class="font-medium">{memberName(s.to_member_id)}</span>:
							<span class="font-semibold">
								{formatCents(s.amount_cents, data.group.currency)}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>

	<!-- Add expense -->
	<div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
		<h2 class="mb-3 font-semibold">Add an expense</h2>
		<form
			method="POST"
			action="?/addExpense"
			class="space-y-4"
			use:enhance={() => {
				submittingExpense = true;
				return async ({ update, result }) => {
					await update({ reset: false });
					submittingExpense = false;
					if (result.type === 'success') {
						expenseDescription = '';
						expenseAmount = '';
						await invalidateAll();
					}
				};
			}}
		>
			<input type="hidden" name="created_by" value={myMemberId ?? ''} />

			<div class="grid gap-3 sm:grid-cols-2">
				<div>
					<label for="description" class="mb-1 block text-sm font-medium">Description</label>
					<input
						id="description"
						name="description"
						bind:value={expenseDescription}
						required
						maxlength="120"
						placeholder="Pizza, cab, hotel..."
						class="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-950"
					/>
				</div>
				<div>
					<label for="amount" class="mb-1 block text-sm font-medium">
						Amount ({data.group.currency})
					</label>
					<input
						id="amount"
						name="amount"
						bind:value={expenseAmount}
						required
						inputmode="decimal"
						placeholder="0.00"
						class="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-950"
					/>
				</div>
			</div>

			<div>
				<label for="paid_by" class="mb-1 block text-sm font-medium">Paid by</label>
				<select
					id="paid_by"
					name="paid_by"
					bind:value={expensePaidBy}
					required
					class="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-950"
				>
					<option value="" disabled>Select…</option>
					{#each data.members as m (m.id)}
						<option value={m.id}>{m.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<div class="mb-1 flex items-center justify-between">
					<span class="text-sm font-medium">Split equally between</span>
					<button
						type="button"
						onclick={toggleAllParticipants}
						class="text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
					>
						{expenseParticipants.size === data.members.length ? 'None' : 'All'}
					</button>
				</div>
				<div class="flex flex-wrap gap-2">
					{#each data.members as m (m.id)}
						{@const checked = expenseParticipants.has(m.id)}
						<label
							class="cursor-pointer select-none rounded-lg border px-3 py-1.5 text-sm transition {checked
								? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
								: 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900'}"
						>
							<input
								type="checkbox"
								name="participants"
								value={m.id}
								{checked}
								onchange={() => toggleParticipant(m.id)}
								class="sr-only"
							/>
							{m.name}
						</label>
					{/each}
				</div>
			</div>

			{#if form?.addExpenseError}
				<div
					class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
				>
					{form.addExpenseError}
				</div>
			{/if}

			<button
				type="submit"
				disabled={submittingExpense}
				class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
			>
				{submittingExpense ? 'Saving…' : 'Add expense'}
			</button>
		</form>
	</div>

	<!-- Expenses list -->
	<div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
		<h2 class="mb-3 font-semibold">Expenses</h2>
		{#if data.expenses.length === 0}
			<p class="text-sm text-neutral-500">No expenses yet.</p>
		{:else}
			<ul class="divide-y divide-neutral-200 dark:divide-neutral-800">
				{#each data.expenses as exp (exp.id)}
					{@const canDelete =
						myMemberId != null && (exp.created_by === null || exp.created_by === myMemberId)}
					<li class="flex items-start justify-between gap-3 py-3">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-baseline justify-between gap-2">
								<p class="truncate font-medium">{exp.description}</p>
								<p class="font-semibold">
									{formatCents(exp.amount_cents, data.group.currency)}
								</p>
							</div>
							<p class="mt-0.5 text-xs text-neutral-500">
								Paid by <span class="text-neutral-700 dark:text-neutral-300">{memberName(exp.paid_by)}</span>
								· Split among
								<span class="text-neutral-700 dark:text-neutral-300">
									{exp.shares.map((s) => memberName(s.member_id)).join(', ')}
								</span>
								· {new Date(exp.created_at).toLocaleDateString(undefined, {
									month: 'short',
									day: 'numeric'
								})}
							</p>
						</div>
						{#if canDelete}
							<form
								method="POST"
								action="?/deleteExpense"
								use:enhance={() => {
									return async ({ update }) => {
										await update({ reset: false });
										await invalidateAll();
									};
								}}
							>
								<input type="hidden" name="expense_id" value={exp.id} />
								<input type="hidden" name="acting_as" value={myMemberId ?? ''} />
								<button
									type="submit"
									aria-label="Delete expense"
									class="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
								>
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
										<path fill-rule="evenodd" d="M8.75 1.75a.75.75 0 0 1 .75-.75h1a.75.75 0 0 1 .75.75V3h3.75a.75.75 0 0 1 0 1.5h-.616l-.812 12.181a2 2 0 0 1-1.995 1.819H8.423a2 2 0 0 1-1.995-1.819L5.616 4.5H5a.75.75 0 0 1 0-1.5h3.75V1.75Zm-1.11 2.75.792 11.882a.5.5 0 0 0 .499.455h1.938a.5.5 0 0 0 .499-.455L12.16 4.5H7.64Z" clip-rule="evenodd" />
									</svg>
								</button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
		{#if form?.deleteExpenseError}
			<div
				class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
			>
				{form.deleteExpenseError}
			</div>
		{/if}
	</div>

	<!-- Members -->
	<div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
		<h2 class="mb-3 font-semibold">Members</h2>
		<div class="mb-4 flex flex-wrap gap-2">
			{#each data.members as m (m.id)}
				<span
					class="rounded-full bg-neutral-100 px-3 py-1 text-sm dark:bg-neutral-800"
				>
					{m.name}
				</span>
			{/each}
		</div>
		<form
			method="POST"
			action="?/addMember"
			class="flex gap-2"
			use:enhance={() => {
				addingMember = true;
				return async ({ update, result }) => {
					await update({ reset: true });
					addingMember = false;
					if (result.type === 'success') await invalidateAll();
				};
			}}
		>
			<input
				name="name"
				required
				maxlength="60"
				placeholder="Add another member"
				class="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-950"
			/>
			<button
				type="submit"
				disabled={addingMember}
				class="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
			>
				Add
			</button>
		</form>
		{#if form?.addMemberError}
			<div
				class="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
			>
				{form.addMemberError}
			</div>
		{/if}
	</div>
</section>
