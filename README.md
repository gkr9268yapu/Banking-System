# GKR Bank

Mobile-first banking web app for a college project.
Built with Next.js (App Router, TypeScript), Tailwind CSS, Recharts and lucide-react.

Current progress: **Stage 1 of 8** (setup and design system).

## Run it

You need Node.js 20 or newer and an internet connection (the Roboto font is downloaded from Google Fonts).

```bash
npm install
npm run dev
```

Open http://localhost:3000. It redirects to the demo page at `/demo`.

Other commands:

```bash
npm run lint     # check code style
npm run build    # production build (what Vercel runs)
```

## Test Stage 1

1. Open `/demo` on a laptop-width window. You should see the sidebar, three stat cards, two pastel bar charts, a zebra list and a dark table, like the reference screenshot.
2. Click the avatar at the top right. A menu with Profile, Settings and Log out opens. Click outside it to close it.
3. Hover a bar in a chart to see its value.
4. Make the window narrower than 768px (or use the phone mode in browser dev tools). The sidebar becomes a bottom bar, the cards and charts stack, and the page never scrolls sideways.
5. The links in the sidebar, the bottom bar and the "Pay" buttons point to pages built in later stages, so they show a 404 for now. That is expected.

## Files

```
app/
  layout.tsx          Roboto font, page title, phone viewport settings
  globals.css         Color palette (design tokens) from the screenshot
  page.tsx            Redirects to /demo for now
  demo/page.tsx       Static demo page with fake sample data
components/
  PageShell.tsx       Lavender frame, white rounded card, sidebar + header + content
  Sidebar.tsx         Left menu on laptops (active link is bold with a dark bar)
  BottomNav.tsx       Bottom menu on phones
  Header.tsx          Page title, bell, avatar, name, dropdown
  StatCard.tsx        Small summary box with a round colored icon
  BarChartCard.tsx    Pastel bar chart panel (Recharts)
  ListRow.tsx         One list row (and the ListRows wrapper for zebra stripes)
  DarkTable.tsx       Dark card with a table (and TrendValue arrows)
  SectionHeading.tsx  Heading above each block
lib/
  config.ts           Bank name and currency symbol
  format.ts           Money, initials and chart axis helpers
  nav.ts              Menu links for customer and admin
.env.example          Names of the environment variables (no real values)
```

## Changing things

- Bank name or currency symbol: `lib/config.ts`
- Colors: the `@theme` block in `app/globals.css`
- Menu links: `lib/nav.ts`

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values when Stage 2 starts.
`.env.local` is ignored by git, so your secrets are never committed.
