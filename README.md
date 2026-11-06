# Novigi Annual Trip 2026

A responsive React + TypeScript website, built with Vite, Tailwind CSS v4, and Lucide icons. Includes a live countdown, keyboard-accessible itinerary tabs, room search and filters, a downloadable calendar event, a packing checklist, and a shared trip chat with names, replies and emoji shortcuts.

## Run locally

```sh
npm install
npm run dev
```

## Verify and build

```sh
npm test
npm run build
npm run preview
```

Requires Node.js **22.13+**. The frontend builds into `dist/`. Shared chat also needs the included serverless function and a Postgres database; uploading `dist/` alone will not enable chat.

## Trip chat

Open **Trip chat** in the navigation, or link directly to `/#trip-chat`. A name is required for every message and displayed prominently beside an initial avatar. Visitors can quote a message with **Reply**, add emoji, and use conversation starters. Enter adds a new line; Ctrl/Cmd+Enter sends. Names are remembered on that browser after a successful send.

Choose **Delete** below your own message, then **Delete message** to remove its text for everyone. **Keep message** or Escape cancels. Ownership is tied to the private random key saved in the sending browser, not the displayed name; switching devices or clearing browser storage removes access to deletion. Existing messages from that browser also support deletion. The original text is erased from the active database and replaced by **Message deleted**, including in quoted replies. Names and timestamps remain. Other open chats receive deletions during the next successful five-second update, including deletions from earlier history. Failed deletions keep a retry control available.

A floating ocean-colored message button opens the conversation directly from anywhere on the page. It becomes a 58px circular button on mobile, respects device safe areas, and hides while the conversation, mobile menu, notification, or mobile text entry is in use. Chat controls have larger mobile tap targets, and the message feed adapts to shorter screens.

The feed checks for new messages every five seconds while the tab is visible, catches up after reconnecting, and keeps earlier history available with **Load earlier messages**. It does not jump to new messages while someone is reading earlier ones. Failed sends retain the draft; retrying the same submission does not create duplicate comments. Timestamps use Sri Lanka time.

### Local development

`npm run dev` and `npm run preview` include the chat API automatically. Without `DATABASE_URL`, messages are saved on the development server in **`.data/trip-chat.sqlite`**, shared across browsers using that server, and retained after restarts. This database is ignored by Git. `CHAT_DEV_DB_PATH` can override its location for testing. Browser local storage holds only the remembered name, an anonymous visitor identifier, and the existing packing checklist; it is not the shared message store.

### Vercel or Netlify setup

1. Create a Postgres database, for example through Neon or Supabase. Use the provider’s **pooled connection URL**, with the provider’s recommended TLS settings.
2. Copy `.env.example` to `.env.local` and replace the example `DATABASE_URL` with that URL. This is a **server-only secret**; never use a `VITE_` prefix.
3. Run `npm run chat:setup` once to create the chat table and index. The command is safe to repeat. Development will use this hosted database whenever `DATABASE_URL` is set, so use a separate database for previews/testing if production messages should stay separate.
   Run this command again when upgrading an existing hosted chat to add the deletion history table; existing messages are preserved. Local SQLite databases upgrade automatically on server restart.
   Setup also enables row-level security on both tables. Use the database owner connection for the server; do not add public Supabase policies for these tables. Browser requests go through the chat function, which enforces deletion ownership and message validation.
4. Set `DATABASE_URL` in the hosting project’s server/function environment settings, then deploy this repository:
   - **Vercel:** choose the Vite preset, `npm run build`, and output directory `dist`. `api/chat.ts` serves `/api/chat` on the Node runtime.
   - **Netlify:** `netlify.toml` supplies the build configuration. The function in `netlify/functions/chat.ts` registers `/api/chat`. Make `DATABASE_URL` available to Functions.
5. Verify on the deployed site with two browsers: send a message, wait for the second browser to receive it, then reply. No database credentials belong in the browser bundle.

The same database must be used by every function instance serving a chat. Local SQLite messages are development data and are not automatically uploaded. If the database is unavailable or not configured, the UI shows a reconnection state and keeps unsent text; it never reports a local-only message as shared.

### Chat boundaries

This is a casual, anonymous team chat: names are self-chosen, **not verified identities**. Everyone with access to the site can read and post. The API validates name/message lengths (40/500 characters), reply targets, JSON size and same-origin browser submissions, uses parameterized SQL, and permits up to 12 messages per minute per anonymous browser identifier. That identifier is not authentication and can be reset. The chat does not yet have sign-in or moderation controls. Use host-level access control for a staff-only deployment; keep private or sensitive information out of the chat.

`npm test` covers shared reads, replies, validation, pagination, duplicate retry handling, basic rate limits, request boundaries, persistence and the Node HTTP adapter. Hosted Postgres and deployment should also be smoke-tested after the actual database connection is configured.

## Update trip information

Edit **`src/data/trip.ts`**. All trip facts, itinerary entries, room assignments, organizer contacts, reminders, and packing items live here.

- Confirmed: **13–15 November 2026**, two nights at **Pullman Bentota Resort & Spa**; transport provided; gathering at **office premises, 1:30–2:00 PM on 13 November**, Sri Lanka time.
- The countdown targets the start of the confirmed gathering window. The calendar download is an all-day event for 13–15 November; its exclusive end date is 16 November. No checkout or return time is implied.
- Guest names and groupings are transcribed from the supplied image: **55 people in 19 groups**. Spelling, including the initials `GG` and `TT` and the name `Shamallka`, is retained as supplied.
- Room cards show type, capacity and guest names, without room numbers. Each group has a stable internal `id` for rendering; search matches guest names only. Triple/twin types and capacities are inferred from group sizes and await hotel confirmation.
- The itinerary clearly marks suggested activities. Set `itineraryIsSample` to `false` and update the event descriptions after the schedule is confirmed.
- Organizer email and phone are `null` until provided. Setting these enables accessible email and telephone links automatically.
- Set `startsAt` and `endsAt` to `null` for the undated countdown state. Keep configured timestamps timezone-aware.

## Design and accessibility

Crisp white, ocean blue and seafoam; the supplied resort photographs; self-hosted variable Roboto throughout, with bold ocean-colored accents for headings and photo captions. The header and footer use the supplied Novigi logo, cropped and made transparent without changing its black lettering; the favicon uses its capital N. The logo is stored in `public/images/novigi-logo.png`. Roboto is bundled locally through Fontsource, with system sans-serif fallbacks. No external font requests are needed.

Motion for React powers the staged hero reveal, subtle photo parallax, scroll progress, navigation highlight, itinerary transitions and animated room filtering. The navigation uses rounded rectangular tabs with ocean colors and section icons; at tablet and phone widths it becomes a matching dropdown with generous tap targets, Escape handling and outside-tap dismissal. Section details arrive in gentle sequences; button and packing interactions provide brief feedback. `MotionConfig`, `useReducedMotion` and CSS media queries respect reduced-motion preferences. The decorative scroll cue runs for three short cycles and stops.

The first visit in each browser tab opens with a short coastal welcome: a resort photo clipped into a gently swelling ocean wave, island-time typography, and two simple, softly moving waves along the bottom. The wave artwork is inline SVG and needs no extra image downloads. It prepares the hero image and fonts, plays for about 2.6 seconds, then reveals the homepage; a 4.5-second limit keeps slow or failed assets from blocking access. Skip intro or Escape dismisses it immediately. Repeat visits in that tab, links to specific sections, and reduced-motion preferences bypass the welcome. The session flag is stored as `novigi-welcome-2026`; open a fresh tab to replay it.

The site includes semantic landmarks, a skip link, visible focus outlines, live search result announcements, arrow-key itinerary tabs, mobile menu Escape handling, reduced-motion styles, and responsive layouts down to 320px. The countdown does not announce every second to screen readers.

No third-party analytics are used. Trip chat uses a small backend; the guest directory remains part of the frontend build, so deploy to an access-controlled host if it should only be available to staff. The packing checklist stores only checked item labels locally.

## Photography

- Hero: the supplied coastal view of Pullman Bentota, saved as `public/images/pullman-bentota-coast.webp`.
- Destination: the supplied overhead resort photograph, saved as `public/images/pullman-bentota-aerial.webp`.

Both images are optimized as WebP at their original resolution. Paths, descriptions and dimensions are editable in `src/data/trip.ts`; they do not depend on external image servers at runtime.
