<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>SplitPay — split expenses with friends</title>
</svelte:head>

<div class="min-h-screen">
	<header class="border-b border-neutral-200 dark:border-neutral-800">
		<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
			<a href="/" class="text-lg font-semibold tracking-tight">
				<span class="text-emerald-600">split</span>pay
			</a>
			<a
				href="/"
				class="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
			>
				New group
			</a>
		</div>
	</header>
	<main class="mx-auto max-w-3xl px-4 py-8">
		{@render children()}
	</main>
</div>
