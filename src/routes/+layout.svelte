<script lang="ts">
  import "../app.css";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,800&family=Inter:wght@400;500;600;700&display=swap"
  />
  <title>Divvy - split expenses with friends</title>
  <meta
    name="description"
    content="Create a group, share a link, and split expenses fairly. No sign-up."
  />
  <meta name="theme-color" content="#1e2b4a" />
  <meta name="apple-mobile-web-app-title" content="Divvy" />
</svelte:head>

<div class="min-h-screen">
  <header
    class="sticky top-0 z-10 border-b border-line/70 bg-paper/80 backdrop-blur"
  >
    <div
      class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5"
    >
      <a href="/" class="flex items-center gap-2 font-semibold tracking-tight">
        <img src="/favicon.svg" alt="" class="h-7 w-7" />
        <span
          class="text-lg text-ink"
          style="font-family: 'Fraunces', ui-serif, Georgia, serif; letter-spacing: -0.02em;"
        >
          Divvy
        </span>
      </a>
      <a
        href="/"
        class="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-medium text-ink-soft shadow-sm transition hover:border-ink/20 hover:text-ink"
      >
        New group
      </a>
    </div>
  </header>
  <main class="mx-auto max-w-3xl px-4 py-8 sm:py-12">
    {@render children()}
  </main>
  <footer
    class="mx-auto max-w-3xl px-4 pb-10 pt-4 text-center text-xs text-ink-mute"
  >
    Divvy · split fair, settle fast
  </footer>
</div>
