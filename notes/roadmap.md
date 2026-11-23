# Roadmap — from a tool that works to a tool people find

State on 2026-10-19, late evening: merge phases 1 to 3 are done and live,
and so is the polish round after them (decisions 198 to 209). The homepage IS
the editor on the shadcn/ui kit; the Your app tab opens with the bookmarklet
(any screen your browser shows, logged in or not), then `npx uisandbox-mcp
open` for a build or a running dev server, then a build. Live on
uisandbox.org as Worker version `b8becd00` from `main` at `00035d6`.
`uisandbox-mcp` 0.5.0 is on npm (latest) and in the MCP registry
(`io.github.Ideelab/uisandbox`, latest), built from the same commit: the same
bundle as the live site, smoke test green. The engine lives in
`src/kits/engine/`, its only copy (decision 188). Full hold-out gate after
phase 3: 173 fixtures, ok 153, four known flakes, one timeout under load that
is ok 3 of 3 alone (195).

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
- **Polish after phase 3** (2026-10-19, decisions 198–209):
  - **Send:** what you turned goes back to your agent (`wait_for_send`) or to
    the terminal that opened the sandbox.
  - **The nulmeting:** the baseline for "phenomenal", taken on the live
    version.
  - **Footer and kit pages:** a footer in columns, and a static page per kit.
  - **Top bar:** Kit and Preset in the app's own menus, with their motion.
  - **Live mode:** `npx uisandbox-mcp open http://localhost:…` puts a running
    dev server under the sandbox's origin, with hot reload, on Vite and
    Next.js.
  - **tokens.json** in the W3C shapes.
  - **The kits on a phone:** they fit.
  - **The kits against the kits** (207): each kit's own docs page beside our
    canvas. A kit's own font now reaches its wall, daisyUI has its own
    corners, and Ant Design its own ink. Material ships Roboto Flex in the zip,
    and shadcn/ui is built as base-nova, what `shadcn init` gives today (208).
  - **The bookmarklet** (209): one click copies any screen your browser shows
    into a sandbox tab, tab to tab, including an app behind a login.
    Alexander's own staging app works with it.

## Next, in this order

### 1. Polish: make it work phenomenally

- **The bookmarklet behind `Cross-Origin-Opener-Policy: same-origin`.** Such
  an app cuts its tab off from the tab it opens, so nothing can be handed
  over. The bookmarklet says so, but offers no other way. Saving the capture
  as a zip to drop at the door is the candidate (209).
- **Live mode beyond Vite and Next.js:** Nuxt, SvelteKit, Astro. Measure
  first, then claim.
- **The performance ceiling.**
  - Bootswatch's 45 MB froze the tab, and the source scan takes 104 s on it.
  - A budget of 8M characters cut that to 8 s, but gave 2 of the 23 large
    builds a different baseline, so it was taken out (207).
  - Next: measure CSS size against time to the first paint, and say the
    limit at the door instead of freezing.
- **Small leftovers:**
  - the kits' work tables still run off a 360px frame;
  - kit-antd timed out twice under concurrent load, and is ok on every run
    alone; watch it.
- **A first-use test with people:** the bookmarklet, the door and the
  knobs, watched, not asked.
- **The launch page** is the editor with How it works over it at /about
  (decision 210); the clip in it still shows the old screen.

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
  stills and the /about clip show the old screen, and none shows the
  bookmarklet yet.

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

- **Status colours that are Tailwind's palette** (decision 219): an AI-built
  shadcn app often colours its status badges with Tailwind's ramp
  (`bg-red-500/15 text-red-700`, `emerald`, `amber`) rather than
  `--destructive`. The Status knob moves the danger family, which those do
  not join, so the badges stay red; the Hue knob reaches them. Moving a
  ramp when a status pick changes would recolour every use of that ramp,
  decorative ones too: decide whether a ramp used only on status-like
  elements (badges, alerts) should follow, and measure it on real builds.
- **"Use in AI" and a Claude Desktop extension** (Alexander, 2026-10-22;
  researched, not built). The top bar's MCP button only shows before a
  project is loaded, so in the editor nobody sees it. In its place, a button
  that stays: "Use in AI", a menu with
  - **Cursor**, one click: `cursor://anysphere.cursor-deeplink/mcp/install?name=uisandbox&config=<base64 of {"command":"npx","args":["-y","uisandbox-mcp"]}>`
    ([docs](https://cursor.com/docs/mcp/install-links));
  - **VS Code**, one click: `vscode:mcp/install?<encodeURIComponent of {"name":"uisandbox","command":"npx","args":["-y","uisandbox-mcp"]}>`
    (the shape `code --add-mcp` takes; GitHub markdown needs a
    vscode.dev/redirect wrapper; [docs](https://code.visualstudio.com/docs/copilot/guides/mcp-developer-guide));
  - **Claude Desktop**, a download: `uisandbox.mcpb`, an MCP bundle (the
    format was .dxt until September 2025), built and attached by
    release.yml with every version, opened by double click
    ([Anthropic](https://www.anthropic.com/engineering/desktop-extensions));
  - **Claude Code**, copy: `claude mcp add uisandbox -- npx -y uisandbox-mcp`,
    or the plugin (`/plugin marketplace add Ideelab/uisandbox`);
  - **Codex**, copy: `codex mcp add uisandbox -- npx -y uisandbox-mcp`;
  - **anything else**, the JSON block.
  The official listings are Alexander's to file: Anthropic's desktop
  extension directory (an interest form; it asks for tool annotations on
  every tool, a privacy policy and three working examples, which can be
  prepared here) and the official Claude Code plugin marketplace (an
  in-app submission form). Not a fit: claude.ai connectors and ChatGPT
  apps take remote (HTTP) servers only, and UISandbox runs on the
  machine on purpose, next to the files and the localhost. With it:
  .claude-plugin/marketplace.json still says 0.3.2, and the next npm
  release (0.5.4) carries the takeover's uncut glow, which went in after
  0.5.3 was packed.
- **A "Feel" knob, to spar about first** (Alexander, 2026-10-20): one pick
  that sets Spacing, Radius, Elevation and Border width together (Compact,
  Default, Soft, Sharp), the way shadcn's Create offers Style. Alexander
  built it in UIcockpit more than once and took it out again: it fits a
  house that offers one style in several variants, as shadcn does, more
  than somebody tuning their own app. Talk it through before building.
- **Check 1:1 cannot see a font that never arrived** (decision 181): a
  computed font-family names the face asked for, not whether it loaded.
  A check on `document.fonts` status in both frames would close it.
- **The dark block is derived**, not read from the kit's own dark values
  (decision 178).
- **Radix door defaults are typed** until `fetch-kits` reads `themePropDefs`;
  the engine picks "sand" for Radix's grey because its default has no
  selector (decision 179).

## Parked (in order of pull)

- **iOS render** via a simulator screenshot (the Swift export exists; the
  picture does not).
- **Reach beyond CSS**: raster logos through a colour map? Probably never.
  The meter says "outside", and that is the honest answer.
- Whatever the builds people drop after the launch turn up.
