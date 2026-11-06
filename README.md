# Novigi Annual Trip 2026

A responsive React + TypeScript website, built with Vite, Tailwind CSS v4, and Lucide icons. Includes a live countdown, keyboard-accessible itinerary tabs, room search and filters, a downloadable calendar event, and a packing checklist saved in the visitor’s browser.

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

Requires Node.js 22.6+ for the TypeScript unit tests. The production output is the `dist/` directory, suitable for any static web host.

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

Motion for React powers the staged hero reveal, subtle photo parallax, scroll progress, navigation underline, itinerary transitions and animated room filtering. Section details arrive in gentle sequences; button and packing interactions provide brief feedback. `MotionConfig`, `useReducedMotion` and CSS media queries respect reduced-motion preferences. The decorative scroll cue runs for three short cycles and stops.

The site includes semantic landmarks, a skip link, visible focus outlines, live search result announcements, arrow-key itinerary tabs, mobile menu Escape handling, reduced-motion styles, and responsive layouts down to 320px. The countdown does not announce every second to screen readers.

No backend or third-party analytics are used. The guest directory is part of the static build, so deploy it to an access-controlled host if it should only be available to staff. The packing checklist stores only checked item labels locally.

## Photography

- Hero: the supplied coastal view of Pullman Bentota, saved as `public/images/pullman-bentota-coast.webp`.
- Destination: the supplied overhead resort photograph, saved as `public/images/pullman-bentota-aerial.webp`.

Both images are optimized as WebP at their original resolution. Paths, descriptions and dimensions are editable in `src/data/trip.ts`; they do not depend on external image servers at runtime.
