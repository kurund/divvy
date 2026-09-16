<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
	<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
	/>
	<title>Divvy — split expenses with friends</title>
	<meta name="description" content="Create a group, share a link, and split expenses fairly. No sign-up." />
	<meta name="theme-color" content="#10b981" />
	<meta name="apple-mobile-web-app-title" content="Divvy" />
</svelte:head>

<div class="min-h-screen">
	<header class="sticky top-0 z-10 border-b border-neutral-200/70 bg-white/70 backdrop-blur">
		<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
			<a href="/" class="flex items-center gap-2 font-semibold tracking-tight">
				<img src="/favicon.svg" alt="" class="h-7 w-7" />
				<span class="text-lg text-slate-900">Divvy</span>
			</a>
			<a
				href="/"
				class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
			>
				New group
			</a>
		</div>
	</header>
	<main class="mx-auto max-w-3xl px-4 py-8 sm:py-12">
		{@render children()}
	</main>
	<footer class="mx-auto max-w-3xl px-4 pb-10 pt-4 text-center text-xs text-slate-400">
		Divvy · split fair, settle fast
	</footer>
</div>
