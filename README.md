# Divvy

Split expenses with friends - trips, dinners, roommates. Create a group, share
the link, everyone logs what they paid, and the app tells you the fewest
transfers needed to settle up.

- **No sign-up.** The shared URL is the access token.
- **Per-browser identity.** You claim a member on first visit; only expenses
  you added can be edited or deleted from your browser.
- **Debt simplification.** Greedy algorithm produces at most _n − 1_ transfers
  for _n_ people.

## Stack

- [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5, runes)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Supabase](https://supabase.com) (Postgres)
- Deploys to Vercel, Netlify, Cloudflare — anywhere `@sveltejs/adapter-auto` supports.

## Local setup

1. Install deps:

   ```sh
   pnpm install
   ```

2. Create a Supabase project (free tier is fine). In the SQL editor, run
   [`supabase/schema.sql`](supabase/schema.sql).

3. Copy env template and fill in your project URL + service role key
   (Project settings → API):

   ```sh
   cp .env.example .env
   ```

   > The service role key is used server-side only. It never ships to the
   > browser. See `src/lib/server/supabase.ts`.

4. Run the dev server:

   ```sh
   pnpm dev
   ```

## Deployment

Vercel or Netlify both work out of the box (adapter-auto detects them):

1. Push this repo to GitHub.
2. Import into Vercel/Netlify.
3. Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy.

## Security model

- The unguessable 12-char group slug is the shared secret. Anyone with the URL
  can view and add expenses.
- All database writes go through SvelteKit server actions using the service
  role key. The anon key is never used, so RLS is intentionally disabled.
- Edit/delete permission is enforced server-side: the acting member must match
  the `created_by` of the expense.

## Project layout

```
src/
  lib/
    balances.ts        # net balance + debt simplification
    money.ts           # cents-based amount helpers + equal split
    identity.ts        # per-browser member identity (localStorage)
    types.ts           # shared types
    server/supabase.ts # service-role Supabase client
  routes/
    +page.svelte       # landing / create group
    +page.server.ts    # create-group action
    g/[slug]/
      +page.svelte     # group dashboard
      +page.server.ts  # loader + add/delete actions
supabase/
  schema.sql           # tables (run once in Supabase SQL editor)
```
