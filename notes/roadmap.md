# Roadmap — from a tool that works to a tool people find

State on 2026-10-19: UIcockpit has merged into UISandbox (phases 1 and 2 of
`MERGE-INTO-UISANDBOX.md` in Ideelab/uicockpit). A dropped build exports a
design system and a skill in its kit's own names; nine kits open as builds
through the kit door; a running app connects through one script line
(`live.js`). The engine lives in `src/kits/engine/` and this is its only copy
(decision 188). Live on uisandbox.org since 2026-10-19 (Worker version
`d5a5c5fd`): the nine kit fixtures, AdminLTE and meshsight are `ok` against
the live URL. Full hold-out gate locally: 173 fixtures, ok 153–154, the rest
refusals and four known flakes, timeout/error 0.

Principles that hold across every step: nothing leaves the tab (no server
state, no upload); the copy never claims more than the meter shows, and
every meter carries a control; no analytics, ever (decision 138: "no
analytics" is part of the privacy claim, traffic questions go to Cloudflare's
server-side zone analytics); one source, no mirror; every step ends with
`pnpm test`, `pnpm kits:gates` and `pnpm holdouts` green.

---

## Done

- **Sprint A — Ship it** (2026-08-19): uisandbox.org, own origin, headers,
  footer, README.
- **Sprint B — The intake as a front door** (2026-08-19): three ways in,
  progress with numbers, the `/__repo/` route.
- **Sprint C — Being found** (2026-08-19): copy, SEO, OG, JSON-LD, `llms.txt`.
  The analytics it wired were stripped again the next day (decision 138).
- **Sprint D — The MCP server** (2026-08-19): npm `uisandbox-mcp`, the
  official MCP registry, the Claude Code plugin and `/uisandbox` skill.
- **Merge phase 2** (2026-10-18/19, decisions 178–180): the UIcockpit engine
  with its gates; kit detection; DESIGN.md, SKILL.md and tokens.json in a
  kit's own names, the build's own variables winning; the kit door; the
  running-app bridge.
- **After the merge** (2026-10-19, decisions 181–188): CDN fonts load through
  the proxy (AdminLTE 9.4 s → 1.5 s to coverage); Check 1:1 measures both
  frames without focus; a grey brand (shadcn/ui) is a brand; a kit reads as a
  kit, not as "your code"; Radix's danger is red and its greys stay grey;
  one copy of the engine.

## Next, in this order

### 1. Merge phase 3 — one screen, and the homepage is the app

The brief's layout (tweakcn's skeleton, our rows), and the decision taken on
2026-10-19: a visitor lands IN the editor, on a kit, with nothing to upload.

- **Land on shadcn/ui.** `/` opens the editor on the shadcn kit build
  (measured cold: screen 0.8 s, knobs 1.7 s). One line on top says what this
  is: the kit as it ships; turn a knob; then bring your own app.
- **Top bar:** mark · *Look* (the kit start cards as presets) · *Engine* (the
  nine, preselected when the bridge or detection recognises the app) ·
  Light / Dark · undo / redo · Share · Export · How it works.
- **Left:** the row list, as now. ×1 = "as the kit ships it" on a kit, "as in
  your code" on a build (done in 184).
- **Stage tabs:** Screens · Components · **Your app**. Empty, Your app is the
  door: your build (zip, folder, repo), your running app (the script line),
  your agent (npx, MCP, /uisandbox). The foot keeps one honesty line: reach,
  fidelity, Check 1:1, what we read.
- **Export:** Design system + Skill first. On a kit, "Patch your own files"
  goes (there are no files of yours); Swift / Android and tokens.json (the
  Figma route) stay.
- **The marketing copy moves to `/about`**: how it works, Isn't this just
  Inspect, how to check it yourself, the privacy note, who made this. `/`
  keeps a static intro with the h1 in `index.html` for search engines and
  for HN readers without JS. `llms.txt` points at both.
- **Phone:** stage on top, rows in a bottom sheet below 820 px.
- **Measure before promising:** does what you turned on the kit carry over to
  your own app when you load it? Brand, radius and fonts map by role and
  probably do; hue and spacing scales may not. The page says only what the
  measurement shows.
- **Folded in, from the open list:** the Export dialog closes on Escape;
  MANIFEST.md's "What you set" wording; MANIFEST.md says a flat "Nothing" for
  the three Tailwind-compiled kits where `orphans.mjs` says it cannot
  establish that.
- Done when: a first visit turns a knob within two seconds without reading a
  paragraph; the three ways in work from the Your app tab; the export on a
  kit and on a build both lead with Design system + Skill; the gates are
  green and the hold-outs hold against the deployed URL.

### 2. Merge phase 4 — the cutover

- **Decide the mark first** (Alexander's call): the current one is UIcockpit's.
- uicockpit.com 301s to uisandbox.org.
- One sweep: GitHub About, README, og image, mark, footer, JSON-LD,
  `llms.txt`, sitemap, the skill's footer line, `live.js`'s allow-list and
  message names (`uicockpit:` → `uisandbox:`, both halves and the test), and
  the npm deprecation texts.
- Done when: no page, package or message of ours still says UIcockpit,
  except the redirect and the history in the notes.

### 3. The launch — after phase 4

The homepage, the story (a kit, your app, a design system) and the name all
change in phases 3 and 4, and a Show HN is done well once. So the launch
waits. What does not change can start now: Stage 0 below.

**Stage 0 — the understream (account-work, any time):**

- **MCP directories:** Smithery (one-click installs, real traffic), Glama
  (claim the auto-made card), PulseMCP. Each card links the repo.
- **Awesome lists:** a one-line PR to `punkpeye/awesome-mcp-servers` and
  `wong2/awesome-mcp-servers` with the one-liner from `brand/marketing/copy.md`.
- **Search Console + Bing:** domain property `uisandbox.org` via a DNS TXT in
  Cloudflare, submit `sitemap.xml`; Bing imports from GSC in one click.
- **Assets** to redo after phase 3: the montage GIF and the stage stills show
  the old screen.

**Stage 1 — Show HN, the soft launch (the star source):** developers star,
fork and drop their own builds; each odd build becomes a fixture. Title and
first comment are everything: what it does, how "1:1" is measured, what it
refuses and why, nothing leaves the tab, the MCP server, the honest limits.
Answer with measurements, not defence. Support the same week, not the same
day: the pinned X post and ONE niche channel where we genuinely answer.

**Stage 2 — Product Hunt, a few days later:** makers and designers; they
upvote and share, they barely star, which is why the stars must already be
there. Staged in draft beforehand: tagline, description, gallery, maker
comment with the limits paragraph. Tuesday to Thursday, 00:01 PT, answer all
day.

**Always-on, after both:** one knob per X post (a 6-second clip from
`scripts/og/montage.mjs`); one answer each, with the GIF, where designers
already ask "how do I try a colour on my live site"; releases per MCP
version stay automatic; the hold-out counter in the README stays current.
Where people came from is read from Cloudflare's zone analytics, GitHub's
traffic page and the registry counts, never from a script on the page.

## Open, not yet scheduled

- **Check 1:1 cannot see a font that never arrived** (decision 181): a
  computed font-family names the face asked for, not whether it loaded.
  A check on `document.fonts` status in both frames would close it.
- **The dark block is derived**, not read from the kit's own dark values
  (decision 178).
- **Radix door defaults are typed** until `fetch-kits` reads `themePropDefs`;
  the engine picks "sand" for Radix's grey because its default has no
  selector (decision 179).

## Parked (in order of pull)

- The **performance ceiling**: measure CSS size against time to first paint
  (Bootswatch's 45 MB froze the tab) and say the limit at the door instead of
  freezing.
- **iOS render** via a simulator screenshot (the Swift export exists; the
  picture does not).
- **Reach beyond CSS**: raster logos through a colour map? Probably never.
  The meter says "outside", and that is the honest answer.
- Whatever the builds people drop after the launch turn up.
