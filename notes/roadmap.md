# Roadmap — from a tool that works to a tool people find

State on 2026-10-19, evening: merge phases 1 to 3 are done and live. The
homepage IS the editor: `/` opens on the shadcn/ui kit, the Your app tab
leads with `npx uisandbox-mcp open` (the sandbox from 127.0.0.1, nothing
reaches this site), and the story lives on /about. Live on uisandbox.org as
Worker version `2aeb544f`; `uisandbox-mcp` 0.4.0 on npm and in the MCP
registry carries the same editor. The engine lives in `src/kits/engine/`, its
only copy (decision 188). Full hold-out gate after phase 3: 173 fixtures, ok
153, four known flakes, one timeout under load that is ok 3 of 3 alone (195).

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
- **Merge phase 3 — one screen** (2026-10-19, decisions 189–197): `/` is the
  editor on shadcn/ui, with tabs Components · Screens · Your app; the story on
  /about. Top bar: Look (another kit's start values), Engine, Light / Dark,
  Share (a link with the knobs, 0 differences in a fresh browser), Read,
  Export. A kit exports Design system + Skill first. What you turn on a kit
  comes along to your own app (0 differences against turning it by hand, on
  three builds). The phone has the knobs in a bottom sheet. The copy follows
  the flow. No flash of the old landing page while the first screen loads.
  The door leads with the local route; the MCP package ships the new editor.

## Next, in this order

### 1. Left over from phase 3

- **The kits' own sheets on a phone.** The components sheet of the kit builds
  is wider than a 360px frame (shadcn's button row runs off it). That is the
  kit build's layout (scenes.mjs), not the editor's; it scrolls inside its
  frame (192).
- **A running dev server, with knobs.** The script line reads a running app's
  kit and writes its design system, but turns no knob: the app is on another
  origin. `npx uisandbox-mcp open` turns knobs, but on a build, not on
  `localhost:3000` (197). Proxying the dev server through the local sandbox's
  own origin would give both; dev servers with hot reload and websockets make
  it uncertain, so it is a measurement first, not a promise.
- **/about as the launch page**, if the launch wants one: a short pitch, the
  clip, the two buttons, then the story. Only on Alexander's call.

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
- **Assets** to redo now that phase 3 is live: the montage GIF, the stage
  stills and the /about clip show the old screen.

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
version stay automatic (the GitHub release; npm and the registry are
Alexander's, and how they want it now is in decision 197); the hold-out counter in the README stays current.
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
