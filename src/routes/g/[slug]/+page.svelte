<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { formatCents } from '$lib/money';
	import { computeBalances, simplifyDebts } from '$lib/balances';
	import { getIdentity, setIdentity, clearIdentity } from '$lib/identity';

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

	function initials(name: string): string {
		return name
			.split(/\s+/)
			.map((s) => s[0]?.toUpperCase() ?? '')
			.slice(0, 2)
			.join('');
	}

	// Deterministic avatar tint from a member id
	const AVATAR_TINTS = [
		'bg-emerald-100 text-emerald-800',
		'bg-sky-100 text-sky-800',
		'bg-amber-100 text-amber-800',
		'bg-fuchsia-100 text-fuchsia-800',
		'bg-indigo-100 text-indigo-800',
		'bg-rose-100 text-rose-800',
		'bg-teal-100 text-teal-800',
		'bg-orange-100 text-orange-800'
	];
	function tint(id: string): string {
		let hash = 0;
		for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
		return AVATAR_TINTS[hash % AVATAR_TINTS.length];
	}

	// Add-expense form state
	let expenseDescription = $state('');
	let expenseAmount = $state('');
	let expensePaidBy = $state<string>('');
	let expenseParticipants = $state<Set<string>>(new Set());
	let submittingExpense = $state(false);

	$effect(() => {
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
	<!-- Header card -->
	<div class="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
		<div class="bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-6 text-white sm:px-8">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div class="min-w-0">
					<p class="text-xs font-medium uppercase tracking-wider text-emerald-100">Group</p>
					<h1 class="mt-0.5 truncate text-2xl font-bold tracking-tight sm:text-3xl">
						{data.group.name}
					</h1>
					<p class="mt-1 text-sm text-emerald-50/90">
						{data.members.length} members · {data.group.currency}
					</p>
				</div>
				<button
					type="button"
					onclick={copyShareLink}
					class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white ring-1 ring-inset ring-white/25 backdrop-blur transition hover:bg-white/25"
				>
					{#if copyState === 'copied'}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5">
							<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
						</svg>
						Copied!
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5">
							<path d="M15.75 3.75a2.25 2.25 0 0 0-2.25-2.25h-6A2.25 2.25 0 0 0 5.25 3.75v10.5A2.25 2.25 0 0 0 7.5 16.5h6a2.25 2.25 0 0 0 2.25-2.25V3.75Z" />
							<path d="M3 6.75A2.25 2.25 0 0 1 5.25 4.5h.75v11.25A3.75 3.75 0 0 0 9.75 19.5h4.5a2.25 2.25 0 0 1-2.25 2.25h-6A3.75 3.75 0 0 1 3 18V6.75Z" />
						</svg>
						Copy share link
					{/if}
				</button>
			</div>
		</div>
		<div class="grid grid-cols-3 divide-x divide-slate-200 bg-white text-center">
			<div class="px-3 py-4">
				<p class="text-xs font-medium uppercase tracking-wider text-slate-500">Total spent</p>
				<p class="mt-1 text-lg font-semibold text-slate-900">
					{formatCents(totalSpentCents, data.group.currency)}
				</p>
			</div>
			<div class="px-3 py-4">
				<p class="text-xs font-medium uppercase tracking-wider text-slate-500">Expenses</p>
				<p class="mt-1 text-lg font-semibold text-slate-900">{data.expenses.length}</p>
			</div>
			<div class="px-3 py-4">
				<p class="text-xs font-medium uppercase tracking-wider text-slate-500">Transfers</p>
				<p class="mt-1 text-lg font-semibold text-slate-900">{settlements.length}</p>
			</div>
		</div>
	</div>

	{#if identityLoaded && myMemberId}
		<div
			class="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900 ring-1 ring-inset ring-emerald-100"
		>
			<span class="inline-flex items-center gap-2">
				<span class="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold {tint(myMemberId)}">
					{initials(memberName(myMemberId))}
				</span>
				You are <strong>{memberName(myMemberId)}</strong>.
			</span>
			<button
				type="button"
				onclick={forgetIdentity}
				class="text-xs font-medium text-emerald-800 underline underline-offset-2 hover:no-underline"
			>
				Not you?
			</button>
		</div>
	{/if}

	{#if identityLoaded && showIdentityPicker}
		<div class="rounded-2xl bg-amber-50 p-5 ring-1 ring-inset ring-amber-200">
			<h2 class="mb-1 font-semibold text-amber-900">Who are you?</h2>
			<p class="mb-3 text-sm text-amber-800">
				Pick your name so we can tag expenses you add. You&rsquo;ll only be able to edit or delete
				expenses you created.
			</p>
			<div class="flex flex-wrap gap-2">
				{#each data.members as m (m.id)}
					<button
						type="button"
						onclick={() => claimIdentity(m.id)}
						class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100"
					>
						<span class="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold {tint(m.id)}">
							{initials(m.name)}
						</span>
						{m.name}
					</button>
				{/each}
			</div>
			<p class="mt-3 text-xs text-amber-700">
				Not listed? Add yourself as a member below first.
			</p>
		</div>
	{/if}

	<!-- Balances + settlements -->
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
			<h2 class="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Balances</h2>
			{#if balances.every((b) => b.net_cents === 0)}
				<div class="py-6 text-center">
					<p class="text-2xl">🎉</p>
					<p class="mt-1 text-sm text-slate-500">All settled up.</p>
				</div>
			{:else}
				<ul class="space-y-2">
					{#each balances as b (b.member_id)}
						<li class="flex items-center justify-between">
							<span class="inline-flex items-center gap-2">
								<span class="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold {tint(b.member_id)}">
									{initials(memberName(b.member_id))}
								</span>
								<span class="text-sm text-slate-800">{memberName(b.member_id)}</span>
							</span>
							{#if b.net_cents > 0}
								<span class="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
									gets +{formatCents(b.net_cents, data.group.currency)}
								</span>
							{:else if b.net_cents < 0}
								<span class="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/15">
									owes {formatCents(-b.net_cents, data.group.currency)}
								</span>
							{:else}
								<span class="text-xs text-slate-400">settled</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
			<h2 class="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
				Suggested transfers
			</h2>
			{#if settlements.length === 0}
				<div class="py-6 text-center">
					<p class="text-2xl">✨</p>
					<p class="mt-1 text-sm text-slate-500">Nothing to transfer.</p>
				</div>
			{:else}
				<ul class="space-y-2">
					{#each settlements as s (s.from_member_id + s.to_member_id + s.amount_cents)}
						<li class="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm">
							<span class="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold {tint(s.from_member_id)}">
								{initials(memberName(s.from_member_id))}
							</span>
							<span class="min-w-0 flex-1 truncate">
								<span class="font-medium text-slate-900">{memberName(s.from_member_id)}</span>
								<span class="text-slate-400"> → </span>
								<span class="font-medium text-slate-900">{memberName(s.to_member_id)}</span>
							</span>
							<span class="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold {tint(s.to_member_id)}">
								{initials(memberName(s.to_member_id))}
							</span>
							<span class="ml-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
								{formatCents(s.amount_cents, data.group.currency)}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>

	<!-- Add expense -->
	<div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
		<div class="mb-4 flex items-center gap-2">
			<span class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
					<path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
				</svg>
			</span>
			<h2 class="font-semibold text-slate-900">Add an expense</h2>
		</div>
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
					<label for="description" class="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
					<input
						id="description"
						name="description"
						bind:value={expenseDescription}
						required
						maxlength="120"
						placeholder="Pizza, cab, hotel…"
						class="w-full rounded-xl border-0 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500"
					/>
				</div>
				<div>
					<label for="amount" class="mb-1.5 block text-sm font-medium text-slate-700">
						Amount ({data.group.currency})
					</label>
					<input
						id="amount"
						name="amount"
						bind:value={expenseAmount}
						required
						inputmode="decimal"
						placeholder="0.00"
						class="w-full rounded-xl border-0 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500"
					/>
				</div>
			</div>

			<div>
				<label for="paid_by" class="mb-1.5 block text-sm font-medium text-slate-700">Paid by</label>
				<select
					id="paid_by"
					name="paid_by"
					bind:value={expensePaidBy}
					required
					class="w-full rounded-xl border-0 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500"
				>
					<option value="" disabled>Select…</option>
					{#each data.members as m (m.id)}
						<option value={m.id}>{m.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<div class="mb-1.5 flex items-center justify-between">
					<span class="text-sm font-medium text-slate-700">Split equally between</span>
					<button
						type="button"
						onclick={toggleAllParticipants}
						class="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
					>
						{expenseParticipants.size === data.members.length ? 'Clear all' : 'Select all'}
					</button>
				</div>
				<div class="flex flex-wrap gap-2">
					{#each data.members as m (m.id)}
						{@const checked = expenseParticipants.has(m.id)}
						<label
							class="inline-flex cursor-pointer select-none items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition {checked
								? 'bg-emerald-600 text-white shadow-sm'
								: 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
						>
							<input
								type="checkbox"
								name="participants"
								value={m.id}
								{checked}
								onchange={() => toggleParticipant(m.id)}
								class="sr-only"
							/>
							{#if checked}
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5">
									<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
								</svg>
							{/if}
							{m.name}
						</label>
					{/each}
				</div>
			</div>

			{#if form?.addExpenseError}
				<div class="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-100">
					{form.addExpenseError}
				</div>
			{/if}

			<button
				type="submit"
				disabled={submittingExpense}
				class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
			>
				{submittingExpense ? 'Saving…' : 'Add expense'}
			</button>
		</form>
	</div>

	<!-- Expenses list -->
	<div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
		<h2 class="mb-4 font-semibold text-slate-900">Expenses</h2>
		{#if data.expenses.length === 0}
			<p class="text-sm text-slate-500">No expenses yet — add the first one above.</p>
		{:else}
			<ul class="divide-y divide-slate-100">
				{#each data.expenses as exp (exp.id)}
					{@const canDelete =
						myMemberId != null && (exp.created_by === null || exp.created_by === myMemberId)}
					<li class="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
						<span class="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold {tint(exp.paid_by)}">
							{initials(memberName(exp.paid_by))}
						</span>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-baseline justify-between gap-2">
								<p class="truncate font-medium text-slate-900">{exp.description}</p>
								<p class="font-semibold text-slate-900">
									{formatCents(exp.amount_cents, data.group.currency)}
								</p>
							</div>
							<p class="mt-0.5 text-xs text-slate-500">
								<span class="font-medium text-slate-700">{memberName(exp.paid_by)}</span>
								paid · split
								<span class="text-slate-700">{exp.shares.length} ways</span>
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
									class="rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600"
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
			<div class="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-100">
				{form.deleteExpenseError}
			</div>
		{/if}
	</div>

	<!-- Members -->
	<div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
		<h2 class="mb-4 font-semibold text-slate-900">Members</h2>
		<div class="mb-4 flex flex-wrap gap-2">
			{#each data.members as m (m.id)}
				<span
					class="inline-flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-3 text-sm text-slate-700"
				>
					<span class="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold {tint(m.id)}">
						{initials(m.name)}
					</span>
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
				class="flex-1 rounded-xl border-0 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500"
			/>
			<button
				type="submit"
				disabled={addingMember}
				class="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
			>
				Add
			</button>
		</form>
		{#if form?.addMemberError}
			<div class="mt-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-100">
				{form.addMemberError}
			</div>
		{/if}
	</div>
</section>
