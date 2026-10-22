# Decisions — UISandbox sprint 1 (2026-08-17)

Short, with the reason. Add to this file when a decision costs something.

1. **Identity by construction, not by comparison.** Every literal in their CSS
   becomes `var(--us-vN)` and the root block defines `--us-vN` as that literal.
   Nothing turned = nothing changed, provably; `verify.ts` measures it anyway
   (raw vs identity build, computed styles per element, 18 properties). Found a
   real gap on the first real build (see 5) — the instrument earned its keep on
   day one.

2. **Values are RELATIVE to the baseline, they snap to nothing.** The knobs at
   their stand → `buildTokens` → baseline. A knob move is a delta (hue rotation,
   L/C shift, a ratio for radius/space/type, a blur ratio for shadow) applied to
   THEIR literal. Their scale keeps its shape; the knobs bend it. The one
   exception: their exact brand hex becomes the new `--k-primary` exactly — a
   visitor who picks Rose expects Rose.

3. **The rewriter is a byte-preserving text splice, not a parser.** Selectors,
   order, specificity, comments and browser-tolerated hacks stay as they were.
   Skipped on purpose: `@font-face`, `@keyframes`, at-rule preludes, `url()`,
   strings, keywords, `0`, `%`, pill radii (≥100px), and anything that already
   reads a `var()`.

4. **The service worker serves, the page owns.** Files never leave the tab; the
   worker asks the page for each one over a MessageChannel. Root-relative URLs
   their build wrote (`/assets/x.css`) are resolved to the sandbox the requesting
   document lives in (client URL, then referrer). Live vars are injected into
   every HTML response so first paint has them; later changes are written into
   the frame's `<style id="us-vars">` directly (same origin).

5. **Never hoist a value that references THEIR variable to `:root`.**
   `box-shadow: inset 0 0 0 1px var(--accD)` as a `--us-vN` on `:root` resolves
   `--accD` on `:root`, where a theme-scoped variable is undefined → the whole
   shadow computes to `none`. Measured by the 1:1 check on a real Vite build.
   Inner literals (`#000` inside the shadow) are still tokenised; the whole is
   left in place when a foreign `var(` remains.

6. **Neutrals follow the brand at half strength.** The engine's `neutral: auto`
   tints greys toward the brand; their greys carry a tint already, so we add
   half of the engine's chroma delta, and rotate the hue only for greys that
   have one (C ≥ 0.004). A pure grey takes the tint hue outright.

7. **Fonts: body vs display from where they are used.** A family whose every
   site is a heading-ish selector (`h1`–`h6`, `.title`, `.hero`…) is display;
   everything else is body; mono is left alone. The knob is identity until it
   leaves their family; then the token's stack, and the frame gets the webfont
   (`@import` for Google, `@font-face` on the blob URL for an upload).

8. **Chrome is static.** The panel's `--app-*` and the few `--k-*` it composes
   are constants (set once from the default kit). The knobs are for THEIR app in
   the frame; our shell must not move when a knob does.

9. **The flyout is portalled and fixed beside its row.** A short viewport
   scrolls the menu column; an absolutely positioned child could never escape
   that column's overflow. Closes on scroll/resize; clamps to the viewport.

Known gaps carried forward: CSSOM `insertRule` (speedy CSS-in-JS), SPA route
enumeration, cross-origin stylesheets, iOS render, MCP shell.

## Hold-out round 1 (2026-08-17, five public repos vs. their live sites)

Method: computed-style census (10 props × every element) of the LIVE page in
one tab, the same census of the sandbox frame, diffed; plus the in-app 1:1
check (raw vs identity). Repos: water.css, Simple.css, SB Admin 2 (Bootstrap
admin), Bootstrap 5.3 docs (getbootstrap.com), react-gh-pages (CRA build).
Findings, all fixed and pinned by a test:

10. **`.9em` → `0.9em` counted as "moved".** A numeric no-op now keeps the
    author's spelling (`fromPx(px, unit, original)`), so identity is byte-identity.
11. **A near-brand literal snapped to the brand at rest** (`#0d47a1` next to a
    `#10489e` brand — Simple.css v1/v2 accents). The "exact brand → new token"
    shortcut fires only after the knob has actually moved.
12. **Font families lost their quotes** — `"Font Awesome 5 Free"` unquoted is
    invalid CSS and the icons fell back to Nunito (SB Admin 2). Normalisation
    keeps the author's quoting.
13. **The baseline chose an icon font as body font** (declaration count).
    Icon fonts are excluded; the family on `body`/`html` wins.
14. **Subresource Integrity dropped the rewritten CSS** (getbootstrap.com's
    docs). `integrity` is stripped from `<link>` in both variants — a transport
    guarantee, not a style; the raw control had drifted from its own hash too.
15. **A brand declared as `--bd-accent` beat `--bs-primary`** in the audit.
    A variable named `primary`/`brand` in the built CSS now outranks the audit.
16. **Sub-path deploys rendered blank** (CRA `homepage`, gh-pages project
    sites): `/react-gh-pages/static/…` → retried with leading segments stripped.
17. **Caching sandbox assets by URL served the REWRITTEN sheet to the RAW
    control** (same root-relative URL, different sandbox). Everything is
    `no-store`; the raw control was unstyled until this was found.
18. **The 1:1 check pairs elements by a stable path key**, not by position, so
    ads/widgets that differ between two loads are reported as unpaired instead
    of refusing the page (Bootstrap home: 1191 paired, 1 unpaired, 0 diffs).
19. **`loadHidden` waits for every `<link rel=stylesheet>` to have a sheet**
    before comparing — `load` can fire while a worker-served sheet is pending.

Instrument note: in the automation browser, form controls' computed style is
frozen at first paint (an inline `!important` cannot move it, live or sandbox) —
the census excludes them. Live-vs-sandbox differences that remained were all
viewport-dependent (`vw`/`vmin` sizes) or version drift (repo ≠ deployed page).

## Hold-out round 2 (2026-08-17, Next.js static export + Tailwind v4 · Astro blog · styled-components production build)

Built locally from the official starters (no public repo ships these builds);
compared raw vs identity in the sandbox. Findings, fixed and pinned:

20. **CSSOM rules were invisible** — styled-components/Emotion in production
    insert every rule through `insertRule` (14 rules, 0 characters of text).
    `hookScriptTag()` is injected before their bundle and wraps `insertRule` /
    `replace` / `replaceSync`; each rule goes through the SAME rewriter in the
    parent (`host.rewriteRuleFor`), new variables are defined in that frame at
    once, and the app re-maps on a coalesced tick. Raw keeps no hook.
21. **A CSS-wide keyword INSIDE a value** (`font: 600 14px inherit`) is invalid
    and dropped by the browser; rewritten with a var() it parses and fails at
    computed-value time = `unset` — a different result. Never rewritten (#7).
22. **The baseline is corrected by the screen and by the grown sheet**, only
    while every knob still stands on it: body font = the family most WORDS are
    set in (Next's `globals.css` says Arial, every paragraph is Geist), heading
    font from h1–h3; brand/radius/fonts from rules that arrived at runtime.
    Provenance reads the live baseline, so badges stay honest.
23. Error pages (`404`, `_not-found`) are not screens; inline `<style>` counts
    as CSS; build-tool hashes are dropped from font labels (`Atkinson-c7f4…`).

Result: Next/Tailwind v4 (2 screens), Astro (8 screens) and styled-components
all verify 1:1 with 0 differences; the brand knob reaches insertRule'd rules live.

## Hold-out round 3 (2026-08-17, MUI/Emotion + react-router · Lit/Shadow DOM · redirect pages)

24. **A sandbox document opens at its REAL path** — `/projects?__sb=<sid>` —
    and the worker BINDS the resulting client to the sandbox (public/sw.js
    `boundClients`, then referrer, then the last bound sandbox for framed
    navigations). Under `/__sb/<sid>/index.html` a BrowserRouter matched no
    route (7 elements, nav only); now it sees `/` and `/projects` as deployed.
    `/__sb/<sid>/…` still works. The hook script carries the sid.
25. **SPA screens come from the rendered page's links** (`discoverRoutes`:
    same-origin, extension-less `<a href>`), plus a pin button for the route the
    frame is on. The archive cannot list an SPA's routes; the page can.
26. **Emotion (MUI) rules arrive through the same insertRule hook** — brand
    `#6d28d9` read from them; `/projects` verifies 1:1.
27. **Lit's adopted stylesheets** go through the `replaceSync` hook; custom
    properties inherit into shadow roots, so nothing more was needed for the
    render — but the 1:1 check now WALKS shadow roots (`allElements`, keys
    cross the boundary as `host>#shadow>…`).
28. **A `<meta http-equiv=refresh>` page is not a screen** (Bootstrap's docs
    /about redirects to getbootstrap.com and the frame left the origin); the
    stage says so when a frame navigates away.

## Hold-out round 4 (2026-08-17, Tailwind Play CDN · Svelte + Vue scoped · lazy routes · the round-trip)

29. **Channel triplets are colours.** Tailwind v3 and the Play CDN write every
    colour as `rgb(124 58 237 / var(--tw-bg-opacity))`; Bootstrap declares
    `--bs-primary-rgb: 13,110,253`; shadcn `--primary: 222.2 47.4% 11.2%`.
    All were skipped as "already tokenised" — the brand of a Tailwind site was
    unreachable. Now the channels are the literal, kept in their own notation
    (`rgb-triplet` with its separator, bare `hsl:` marker that never reaches
    CSS), and mapped values print back in that notation.
30. **New variables are defined in the frame the instant the observer rewrites
    a runtime `<style>`** (`defineNewVars`, shared with the CSSOM hook). In the
    gap before React's next render every rewritten rule was invalid, and the
    baseline sampled "Times" as the body font. Same fix as #20, other path.
31. **The paint decides a weak brand once**: area-weighted chromatic
    backgrounds (buttons/links ×3, full-page backgrounds excluded), only when
    the code does not DECLARE a brand and only on the first screen — the tag's
    text colour lost to the button on Svelte and Vue; a later screen whose only
    button is the secondary must not re-decide (MUI /settings did, once).
32. **Their files, patched in place** (`rewriteCss` in `values` mode; Export →
    "Your files, patched"): the same scanner writes the CURRENT value at the
    exact span, so a `12px` radius becomes `0px` while a `12px` padding becomes
    `9px` — the find-and-replace list could not tell them apart. A chosen font's
    `@import` is prepended (after `@charset`), or the patched site would fall
    back to sans-serif. Runtime literals set from JS stay on the patch list for
    the developer.
33. **A colour that comes back the same 8-bit rgb+alpha in another spelling is
    identity** (`rgba(0,0,0,.05)` was reported "moved" to `rgb(0 0 0 / .05)`).
34. **The round-trip holds**: knobs turned (rose · radius none · compact ·
    Manrope) → patched files → the "next release" loaded raw → census diff
    against the knob-turned sandbox: 0 differences on 61 elements × 8 props;
    the patched build reads its own brand and font back. What you see is what
    you get. (`scripts/roundtrip-acme.ts` regenerates the patched fixture.)
35. Two NUL bytes had crept into `table.ts` key strings — consistent for `add`,
    so invisible until `find`. Cleaned; a reminder that a diff of bytes is a
    thing worth looking at when a lookup "cannot" fail.

## Round 5 — where the bar is (2026-08-17: iOS · Android · Flutter · Kivy · Raspberry Pi HMI · marketing site · WordPress · odd archives)

36. **The intake TRIAGES instead of refusing.** `platform.ts` names what was
    dropped (web-build · web-source · ios · android · flutter · qt · kivy ·
    python-gui · electron · unknown) and says whether it renders. A WordPress
    theme's `templates/index.html` is a block template, not a page: root
    detection is skipped for it.
37. **Non-web sources are tokenised by `sourceScan.ts`** into the SAME sheet:
    hex (quoted, between tags, bare) · `0xAARRGGBB` (alpha kept) · Android XML
    `#AARRGGBB` (ARGB!) · Swift `Color(red:green:blue:)` floats · xcassets
    components (`0x66` or `0.400`, each channel in its notation) · Kivy float
    tuples · `R.font.karla_regular` / `@font/x` / `Font.custom("X")` /
    `fontFamily:` · WordPress theme.json escaped families · W3C design-tokens
    JSON (the key names the role) · `cornerRadius(12)` / `RoundedCornerShape` /
    `BorderRadius.circular` / QML `radius:` · `fontSize`, `.sp`, `pixelSize`.
    Each span carries a PRINTER, so the patched export writes the value back
    in that file's notation. The identifier a colour is bound to
    (`md_theme_light_primary`, `colorPrimary`, a theme.json `slug`) is the
    site's `prop`, so `brandDeclared` hears it.
38. **Art is not palette**: `drawable*/`, `mipmap*/`, `ic_*.xml`, imagesets,
    SVGs are skipped — a launcher icon's orange was crowned the brand of
    compose-samples. Tests, mocks, fixtures, Preview Content too.
39. **The stage for what no browser draws is a values board** (`ValuesBoard`):
    every literal painted with its CURRENT value, labelled as a legend, never
    as their app. Knobs work; export writes the values back (patched files) and
    also as Swift + asset catalog and, new, Android `colors.xml` (+night) and a
    Compose `DesignTokens.kt`.
40. **Root switcher**: other index.html roots in an archive are one click away
    (a monorepo with `site-a/` and `site-b/dist/`); test/mock pages are not
    screens; a bare `index.html` zip works; images-only and empty zips fail
    with a sentence, not a stack.

Where the bar is, measured on real repos: web builds render 1:1 (16 hold-outs,
0 diffs); Electron/HMI shells render what the archive contains (MagicMirror:
its black shell, fonts served, modules need the server); iOS/Android/Flutter/
Kivy/WordPress/tokens-JSON tokenise-and-export with knobs on their stand but
NO render; a monorepo of many apps has no single brand (compose-samples) —
the knob is theirs to set; a design-tokens JSON alone is a valid input.
Not readable yet: system-colour references (`Color.blue`, `MaterialTheme.
colorScheme.primary`), Interface Builder .storyboard RGB, Qt stylesheets
(`.qss` — plain CSS, would work if the extension were allowed), PDF/Figma
files, nested zips, tar.gz.

## The door (2026-08-17, after round 5)

41. **Only what renders 1:1 comes in.** The values board for iOS/Android/
    Flutter/Kivy/WordPress was honest, but "a legend of your colours" is not
    "tinkering with your own app", and half a promise weakens the whole one.
    Non-renderable platforms are refused with one sentence each
    (`platform.refusalFor`): what we recognised, why no browser can show it,
    what would work (a Flutter WEB build, a static export). The source reader
    (`sourceScan.ts`), the Android/Swift exports and the tests stay as modules
    for a later "tokens without a render" track — deliberately not wired.
42. **A shell is called a shell.** After the first load, a screen with fewer
    than 6 elements, fewer than 3 style rules, or no visible text and no media
    gets a warning card at the bottom of the frame ("Is this the built app?").
    MagicMirror — a Raspberry-Pi HMI whose modules come from the server —
    renders a black page with 41 empty elements; the card says so.

43. **Screens: one searchable, folder-grouped picker** (`ScreenPicker`) instead
    of a tab strip — the same shape for 3 screens and for Bootstrap's 114.
    Type to filter, arrows + Enter, `[` / `]` step from anywhere; each entry
    labelled by origin (file · route found on a page · pinned); "pin current
    route" in its foot. A tab strip stops working around a dozen; a grouped
    list with search never does.

## The knobs, rebuilt for someone else's app (2026-08-17, after notes/knobs-research.md)

44. **Dials, ×1 = your code.** `sandbox/dials.ts` (inside `Config.sb`, so it
    rides the reducer, undo and share-hash): radius · spacing · text size ·
    line-height · letter-spacing (+em) · weight (±steps) · border width ·
    background tone · border tone · elevation · motion — continuous, with the
    old preset names as snap points and "as in your code" at the centre. The
    mapping reads the dial, not a token ratio (`scaleLength`, `mapShadow(x)`),
    which also removes the Scale→headings coupling.
45. **Colour roles from THEIR sheet.** `familiesOf(table, brand)`: brand by
    hue window; status by OKLCH hue windows (green/red/amber/blue); the two
    largest remaining hue clusters = secondary, accent; each family has a
    CENTRE (most-used member). A picker row appears only when the family
    exists; the pick moves every member by centre→pick delta (`mapByDelta`);
    the centre becomes the pick exactly.
46. **Neutrals by USE**: background tone moves light greys painted as
    backgrounds, border tone moves greys used in border/outline props, ink is
    left alone. Baseline `neutral` is 'neutral' in the sandbox (greys don't
    follow the brand unless "Grey tint: Follows brand" is chosen).
47. **New sheet kinds**: line-height (unitless too, and in the `font`
    shorthand), letter-spacing, font-weight (numbers, bold/normal, in `font`),
    border-width (own props and the first length of `border`/`outline`
    shorthands), duration (`transition`/`animation` and their `-duration`).
48. **Display font speaks by selector** — most apps set one family and let
    headings inherit, so there is no heading literal to move; the knob injects
    `h1–h6,[class*=title|heading|hero|display]{font-family: … !important}`
    (also into the patched export). The one honest semantic override.
49. **Gone**: Conformance, Label case, Surface, Harmony rows, per-row locks,
    saved slots, UIcockpit's `randomKit`; **Shuffle** now rolls only knobs that
    exist (`sandbox/shuffle.ts`, triangular around "as is"). `Panel.tsx`,
    `vizFactories`, `SavedKits`, `Seg` deleted.
50. **The badge**: a quiet dot at rest ("as in your code"), amber once turned
    ("changed"); the orange "your code didn't decide this" is gone — in the
    sandbox every knob at rest IS their code.
Measured (`scripts/knob-effect.ts`, 10 builds, 1,835 values): every knob moves
values on real builds; the sheet-only meter cannot see the display-font rule.

## Reach (2026-08-17)

51. **The per-knob percentage was a share of the whole sheet, not of what the
    knob can touch.** Split (`scripts/kind-share.ts`): every size dial already
    reached 100 % of its kind; colour was the gap — neutrals 49 % of colours
    (ink untouched), `keep` 8 % (chart palettes, gradients, illustration tints).
52. **Three global colour dials** — Hue (° for every chromatic colour, family
    or not), Saturation (× chroma), Contrast (± lightness stretch around the
    middle, greys and ink included) — applied AFTER the family mapping. 100 %
    of colours are now under some knob. Gamut by chroma reduction (`toGamut`),
    never per-channel clipping: a lime rotated +90° must land on its hue.
53. **CSS-drawn icons follow**: `url("data:image/svg+xml,…%23fff…")` becomes one
    `svg` entry whose colours are mapped through the same colour path and
    re-encoded (Bootstrap's chevrons, checks, close buttons: 19 on the home).
54. **Inline SVG presentation attributes** (`fill`, `stroke`, `stop-color`) are
    put under the knobs by the live observer with a `style` property that
    outranks the attribute (raw stays raw); currentColor/none/url(#) skipped.
55. **`@keyframes` are in** — var()-valued colours interpolate; a hard-coded
    pulse must not stay behind after a brand change.
56. **The reach meter** (`sandbox/coverage.ts`): on the rendered frame, painted
    colours/families/sizes/radii of visible elements are checked against the
    sheet's CURRENT values; images, canvas, video and raster backgrounds are
    counted as "outside". A chip in the stage foot, details on click. Icons per
    kind: icon fonts ✓ · inline SVG currentColor ✓ · inline SVG hard fills ✓
    (observer) · SVG as <img>/sprite file ✗ (an image) · data-URI SVG in CSS ✓.

57. **Dark mode = THEIR dark mode, switched.** `sandbox/scheme.ts` reads their
    CSS for `@media (prefers-color-scheme: dark)` and for attribute/class hooks
    (`[data-theme=dark]`, `[data-bs-theme=dark]`, `.dark`, `.theme-dark`…);
    the row appears only when one was found. Toggling is done in the frame:
    media rules get their `mediaText` forced to `all` / `not all` (an iframe
    cannot be told what the OS prefers, but its CSSOM is ours — duck-typed,
    the frame's classes are cross-realm), hooks are set on `<html>` exactly as
    their own switcher would, `color-scheme` follows for form controls.
    "As is" restores everything. Measured: water.css (media) light → white;
    Bootstrap docs (`data-bs-theme`) light/dark/as-is round-trip.

## Sweep 6 — three sites, three apps, unseen (2026-08-17)

Bootswatch (27 MB, 45 MB CSS, 519 screens) · Bulma-templates (35 pages, CSS
from a CDN) · StartBootstrap Clean Blog · TodoMVC (200 pages, 60 frameworks) ·
JavaScript30 (57 mini-apps) · SVGOMG (PWA). Found and fixed:

58. **A data-URI SVG is case-sensitive** — the generic normaliser lowercased
    `M4 7h22` into `m4 7h22` (relative moves) and `viewBox` into `viewbox`;
    the 1:1 check on Bootswatch's hamburger icon caught it. `svg` values are
    whitespace-normalised only. `rgba%28…%29` inside data URIs is mapped too.
59. **Cross-origin stylesheets are rewritten**: `<link rel=stylesheet
    href="https://cdn…">` → `/__ext/?u=…`; the worker fetches with CORS, the
    page rewrites it into the same sheet, and the NEW variables ride at the top
    of the CSS response so nothing is invalid before the next render. Bulma
    from jsdelivr: reach 43 → 74 % colours, 58 → 100 % radii, still 1:1. The
    raw control keeps the untouched CDN link. (Bulma 1.0's `hsl(var(--h),
    var(--s), var(--l))` — one colour split over three custom properties — is
    the remaining unread notation.)
60. **Pages win in platform detection**: TodoMVC was refused as "Flutter"
    because one of its sixty examples has a `pubspec.yaml`. Renderable pages
    decide first; a source repo whose only page is a build template renders a
    shell and the stage says so.
61. **The archive is the site when it holds most pages**: JavaScript30's only
    `index.html` (one video player) was picked as root over sixty
    `index-START.html`s; any `.html` counts as a page now, and a root that
    covers a third or less of the pages yields to the whole archive.
62. **Only navigated documents get the variable block and the hook** — an
    HTML import, an XHR'd template, a fragment is not a page.
63. **Known, honestly reported, not fixed**: Polymer 1.2 (TodoMVC's home)
    resolves `var()` with its own style shim, drops declarations it cannot
    resolve, and reprocesses `<style is=custom-style>` blocks (which mangled
    font stacks when tried). The 1:1 check says "44 differences"; a 2015
    framework that re-parses CSS text is outside what a substitution can
    promise. `useNativeCSSProperties` is set for Polymer ≥ 1.6 in the hook.

Scorecard: Clean Blog 100/100/100 · SVGOMG 100/100/98 · JavaScript30
100/50/100 (generic families) · Bulma 74/100/100 (CDN now in, split-hsl out) ·
Bootswatch 100/100/97 (1 min to load 45 MB of CSS) · TodoMVC 92/100/100 with
the Polymer home page failing 1:1 by design.

## Sweep 7 — six more, unseen (2026-08-17)

docsify docs (runtime-rendered, CDN JS+CSS) · Tailwind Landing Page (full
Tailwind v2 from unpkg) · web-design-in-4-minutes (progressive styling by JS)
· three.js examples (600 WebGL pages, `../build/` sibling) · 50projects50days
(52 mini-apps) · SortableJS (Bootstrap + FA from CDN, one dead CDN link).

64. **Files above the root are served on demand** (`loadOutsideRoot`): three.js's
    examples import `../build/three.module.js`, a sibling of the chosen root
    `examples/`; a miss now falls through to the archive, is rewritten if
    CSS/HTML, and cached under its archive path. The cube renders (canvas
    994×1120, "1 outside").
65. **Media is content**: a WebGL page is three elements and no text — the
    shell-warning now fires only when there is no img/svg/canvas/video either.
66. **The 1:1 check caps its wait at 15 s** — a dead CDN link held a hidden
    frame's `load` for the length of a DNS failure (Sortable: rawgit).
67. Honest non-findings: docsify's cover gradient is RANDOM per load (the check
    reports 1 difference — theirs, not ours); web-design-in-4-minutes starts
    unstyled by design (type reach 39 % until its JS applies styles).

Scorecard: docsify 100/100/100 (1 random gradient) · Landing Page 100/100/100
(395 values from a CDN Tailwind, 1:1) · 4-minutes 100/39/100 · three.js
100/100/100 on the index and on a WebGL example · 50projects 100/100/100 ·
Sortable 100/100/100 (291 CDN values, 1:1).

## Sweep 8 — six more, unseen (2026-08-17)

reveal.js (16 decks) · Leaflet (63 debug pages, dist not shipped) · Bootstrap
Icons site (2,080 pages, 11,227 elements) · NES.css docs (CDN NES.css, GitHub
avatars) · SVG-Loaders · anime.js (36 examples).

68. **The 1:1 check freezes motion and lets images land** before comparing
    (`transition/animation-duration: 0s !important` in both hidden frames,
    wait for `img.complete` up to 4 s) and **leaves `<img>` out of the
    pairing**: NES.css's lazy GitHub avatars fade on the network's clock; two
    loads are two moments, and images are "outside" the knobs anyway.
69. **Shell warning**: no visible text counts only on a small DOM (< 40
    elements) — anime.js's creature is 172 text-less animated divs.
70. Honest: Leaflet's debug pages need `dist/leaflet-src.js`, which the repo
    does not ship — 2 elements, and the stage says "Is this the built app?".

Scorecard: reveal.js 100/75/100 · Bootstrap Icons 100/100/100 (11,227 el.
1:1) · NES.css 97/100/100 (2,443 el. 1:1 after the image rule) · SVG-Loaders
100/100/100 · anime.js 100/100/100 · Leaflet: build missing, flagged.

## Sweep 9 — six more, unseen (2026-08-18)

Monaco editor (gh-pages, 503 pages) · CodeMirror 5 (183 pages) · MDN
dom-examples (198 pages) · SpinKit · Hover.css · Spectrum colorpicker.

71. **Missing files are reported.** A page that asks for a script or a
    stylesheet the archive does not hold gets "N files this page asked for
    are not in the archive — <paths>. That usually means source, not the
    built output" (CodeMirror's demos want `lib/codemirror.js`, which only
    `npm run build` writes). Fonts do NOT count: a `@font-face` lists several
    formats and legitimately 404s on the ones after the first that loads
    (Hover.css's Font Awesome woff/ttf).
72. **Circles and pills leave the radius count** in the reach meter: a radius
    of half the box or more (`50 %`, `999px`) is kept out of the sheet on
    purpose (a circle must stay a circle under the radius dial), so SpinKit's
    "0 % radii" was the meter reading its own rule as a miss.

Scorecard: Monaco 100/100/100 (1,252 el. 1:1) · CodeMirror home 100/100/100
(demo pages: build missing, flagged) · dom-examples 100/50/100 (their JS sets
font sizes at runtime — 1:1) · SpinKit 100/100/100 · Hover.css 100/100/100
(288 el. 1:1) · Spectrum 100/100/100 (4,580 el. 1:1).

## Fonts — alternatives, not taste (2026-08-18)

73. **The font list is alternatives for what their code has**, grouped by
    character — Grotesk · Humanist · Geometric · Serif · Mono — the way a
    replacement is chosen, not alphabetically; every face is a Google
    variable font with a wght axis so the Weight dial works. **"In your code"**
    comes first: every family the sheet carries (icon fonts and the system
    stack excluded, most-used first), so a switch away is a switch back too.
    The list's faces are loaded once into the host (weight 400) so each option
    renders in its own letter. Manrope and DM Sans are back (a marketing site
    is not a case-number dashboard); I/l was re-measured on the whole list
    (fonts.ts) and the two above 85 % — Manrope 98, Inter 86 — carry a hint,
    not a ban.
74. A scroll inside a flyout is browsing, not leaving: only the panel
    scrolling under an anchored popover closes it.

## Gradients (2026-08-18)

75. **Gradients are already under the knobs per stop** — every colour inside
    `linear/radial/conic-gradient(...)` is an ordinary colour entry, so Brand,
    the families and Hue/Saturation/Contrast move them, while the direction,
    the stop positions and the type stay as written. No "from A to B" bar: it
    fits two-stop gradients only, and a real hero (Bootstrap's masthead: two
    layers, six stops, a blend mode) would have to be folded into two colours
    — the end of "×1 = your code".
76. **What was missing was direction.** Kind `angle`: the direction of every
    linear/conic gradient — a numeric angle in any unit or a single side
    (`to right`); a corner (`to top right`) has no fixed angle (it depends on
    the box's aspect ratio) and stays as written, radials have no direction.
    Dial **Gradient angle** adds degrees to all of them (Reversed = +180°),
    printed as `deg`; the row appears only when the sheet holds one. Bootstrap
    docs: 7 directions, 1,184 elements still 1:1 at rest.
77. A raster hero (Bootswatch's diagonal planes are a JPEG) is outside every
    knob and the reach meter says so; only an SVG data-URI would move.

## Sweep 10 — six more, unseen (2026-08-18)

Prism (336 pages) · Skeleton · particles.js · fullPage.js (60 examples) ·
impress.js · slick. (Tachyons was drawn first and put back: its `index.html`
is an empty template — the shell warning was right, but there is nothing to
hold out.)

78. **A buried dist/ does not claim the archive.** The whole-archive rule
    (many pages beside the best root) exempted `dist|build|out|_site|public`
    so a Vite repo's top-level dist beats its template index.html; fullPage.js
    put a browserify example's `dist/` four folders deep with 1 of 60 pages
    and won. The exemption now holds for a TOP-LEVEL build folder only.
79. **The reach meter stops counting the browser's own paint**: the UA link
    blue, the form-control border grey, buttonface (unless the sheet holds
    that colour), 1×1 clipped sr-only spans, text at font-size 0 (slick's
    dots), and — when the sheet has no font-size at all — the UA's sizes
    (nothing was missed: there was nothing to move, as for families).
80. **em-valued entries resolve per element** in the meter: a `.2em` radius
    against the element's own font-size, a `.5em` font-size against the
    parent's — impress.js's 9.6px link radius is its `.2em` at 48px, not a
    miss.
81. Honest: Prism master does not ship `prism.js`/`components.js` (build
    output) — reported; the rest of the page is 1:1. impress.js's type reach
    reads 93 % at `load` because the meter sees the pre-init fallback text.

Scorecard: Prism 100/100/100 (365 el. 1:1, build files flagged) · Skeleton
100/100/100 · particles.js 100/100/100 (163 el. 1:1, `../particles.js`
above the root) · fullPage.js 100/100/100 (41 screens, 107 el. 1:1 after the
root fix) · impress.js 100/93/100 (92 el. 1:1) · slick 100/100/100 (724 el.
1:1; slick's cloned slides unpaired, as reported).
82. **A project switch is a clean start**: loading a project (and closing one)
    RESETs the config history — no past to ⌘Z into, the URL hash dropped at
    once rather than on the debounce — and the baseline refinement from the
    rendered page is a reset too, since a corrected starting point is still
    the starting point. Before, a stale hash from the previous project rode
    into the next load until the baseline overwrote it.

## Sweep 11 — stratified, part 1 (2026-08-18)

Not random this time: cells of the matrix no earlier sweep covered. Docusaurus
v3 (Metro docs) · VitePress (its own docs, base `/vitepress/`) · Ant Design
(cssinjs runtime, 2,666 pages) · Angular (ng-bootstrap site, 1,748 pages) ·
Mantine (364 pages) · Spectrum Web Components (Shadow DOM, 785 pages) · MDN
pwa-examples (their own service worker) · Open Props (modern CSS) · Material
Components Web (TypeDoc) · Bootstrap RTL (their buttons page, `dir="rtl"` +
`bootstrap.rtl.min.css`). Nuxt-static and SvelteKit-static have no committed
build anywhere I could find — part 2 builds them.

83. **A sub-path build is served under its base.** VitePress's docs are built
    for `/vitepress/`; served at `/` the files loaded (segment-stripping) but
    the router saw a path outside its base and rendered its 404. Every page
    now votes for the deploy prefix — a root-absolute script/stylesheet URL
    the archive holds only once its leading segments are stripped — and
    screens are served at `/<base>/<path>?__sb=` (`project.base`; a
    two-segment path counts, Spectrum's `/spectrum-web-components/swc.js`).
84. **The live observer duck-types across realms.** `r.target instanceof
    Element` in the MutationObserver callback compared the FRAME's nodes to
    the HOST's constructor — always false — so every mutation after the initial
    sweep was dropped: Mantine's hydrated Shiki spans kept 909 raw `style`
    colours (39 % colour reach on remeasure). Same trap in the 1:1 check's
    shadow-boundary test (`instanceof ShadowRoot`). nodeType/tagName, never a
    constructor (notes/traps.md: cross-realm).
85. **Brand = the most-painted colour among those NAMED brand.** Ant's site
    declares `--ant-color-primary: #1677ff` once, in the sheet every page
    loads (28,828 uses), and `#00b96b` in ten theme-demo pages; the count of
    declaration sites crowned the demo green.
86. **Unslotted light DOM leaves the 1:1 check** (and the meter). Spectrum's
    docs keep a fallback `<a id="logo" slot="logo">` no <slot> takes: not in
    the flat tree, never painted, and computed WITHOUT inherited custom
    properties — so `var(--us-v452)` read as 0px there while the literal 4px
    it replaced read fine. 292 such elements, 0 pixels.
87. **The meter lets the frame resolve values**: a probe element computes
    `calc(.875rem * var(--mantine-scale))`, bare channel triplets wrapped in
    `rgb()`/`hsl()`, so the meter's own arithmetic no longer undercounts;
    it walks shadow roots (allElements) and skips bare UA generics
    (`monospace` on an unstyled <code>).
88. **System font stacks are families**: `--mantine-font-family: -apple-system,
    …` was refused for its leading dash; `antialiased`/`grayscale`
    (…-font-smoothing) and `clamp(6px, …)` are refused now.
89. **Their service worker is refused quietly** inside the sandbox
    (`navigator.serviceWorker.register` rejects with a clear SecurityError): a
    second worker on this origin would fight the one serving the sandbox, and
    the registration failed on the host anyway with a loud MIME error.
90. Screens: an `index.html` sorts before its folder's siblings at every level
    (VitePress: `/v1` before `/v1/es/…`).

Scorecard: Docusaurus 100/100/100 (158 el. 1:1, dark via data-theme works) ·
VitePress 100/100/100 (439 el. 1:1 under its base, dark via class works) ·
Ant Design 100/100/100 (Brand → crimson moves 140 values through cssinjs) ·
Angular 100/100/100 (151 el. 1:1) · Mantine 100/100/91 (2,640 el. 1:1) ·
Spectrum 100/95/100 (138 painted el. 1:1) · js13kPWA 100/100/100 (506 el.
1:1, only our worker registered) · Open Props 100/100/100 (3,912 el. 1:1) ·
MDC-web 100/100/100 (1,431 el. 1:1) · Bootstrap RTL 100/100/91 (3,358 el.
1:1).
91. **Status colours are one row** — Success/Warning/Danger/Info as a set of
    dots (one per family the sheet has), the pickers stacked in the flyout. In
    any grown design system they are the standard four; a row each was three
    rows saying "green, amber, red". Secondary and Accent stay separate: those
    are choices, not a set.
92. **A hue is not a role: status needs evidence.** Every green was "success"
    and every yellow "warning", so a site's PALETTE — pastel pink/green/blue/
    yellow on cards under a purple brand, category colours, chart series, the
    docs' own swatch pages — fell into the status pickers. A hue window is a
    status family only when a member is NAMED or USED as the role
    (`--bs-success`, `.alert-danger`, `:invalid`, `--color-warning-bg`);
    inside such a window a member named after its colour and never after a
    role (`--green-100`, `.tag-red`) is palette; a window with no evidence is
    palette, whole. Secondary/Accent need a STRONG member (C ≥ 0.09 and
    L ≤ 0.82 — a pastel yellow keeps a high OKLCH chroma) and must not be a
    swatch scale through and through (`--teal-500`, `.bg-teal`); `.btn--teal`
    — a saturated variant named after its hue — is a choice. Palette is a
    family of its own: untouched by the pickers, moved by Hue / Saturation /
    Contrast, shown as a row of dots (one per 30° cluster). Bootstrap docs:
    the four status roles stay, 31 swatches (`.bd-pink-100…900`, `.swatch-*`)
    move to Palette. Bonus fix: a pale tint named for a role
    (`--bs-success-bg-subtle: #d1e7dd`) was a "neutral" — the alert
    background never followed the Success picker; it does now.
93. **The dots are live**: Brand, Secondary/Accent, Status and Palette dots
    show the CURRENT var of their centre entry (families carry `centreId` /
    `paletteId`), so Hue/Saturation/Contrast turn them exactly as they turn
    the page. A dot that keeps its baseline while the page moves is the
    instrument lying.
94. **Background is a colour, not a ΔL.** The canvas — what html/body/:root
    paints as background, else the most-used background neutral — is the
    centre; the Background picker moves it to the pick and every background
    neutral within 0.3 L of it by the same delta (surfaces and cards keep
    their step above the page; a dark footer, ink, and chromatic blocks stay).
    Same maths as a family. The old "Dimmer / Brighter" ΔL dial is gone —
    a lighter or darker pick is that dial. Its dot wears a ring: near-white
    needs an edge to be seen.

## Sweep 11 — stratified, part 2 (2026-08-18)

Nuxt static (`nuxi generate`, built here) · SvelteKit static (adapter-static,
built here) · vue-element-admin (Vue scoped) · Element Plus docs · Material
Tailwind Dashboard (Tailwind v3 JIT, ApexCharts) · Microsoft FAST docs · SAP
Fundamental Styles (Storybook: everything inside iframe.html) · react-dates
(old Storybook) · visx gallery (SVG charts, palettes) · react-virtualized
(runtime inline styles).

95. **A page cannot unregister the worker serving it.** Element Plus's docs run
    a "clean up old service workers" snippet; inside the sandbox it removed
    OUR registration — running frames kept their controller, every new
    navigation got the host's own index, and the 1:1 check paired our intake
    page against itself (✓ 50 elements). Every sandboxed document — the raw
    control too, it paints nothing — now carries a guard: `register()` rejects
    quietly, `unregister()` resolves false. And the check REFUSES a document
    without the guard: the sandbox did not serve it, nothing of theirs is
    compared. Traps.md material: an instrument that can measure itself and
    call it a pass.
96. **Backslash escapes outside strings.** Tailwind's arbitrary-value selector
    `.bg-\[url\(\'\/img\/x\.png\'\)\]` carries an escaped quote; the scanner
    took it for a string start and swallowed the next 107 rules — every
    `text-*`/`bg-*` colour after it stayed literal (75 % colour reach; 131 →
    368 entries once fixed).
97. **Nested same-origin frames are the page too** (Storybook): the sheet
    applies to them on every change, the 1:1 check and the meter descend into
    them (`#frame` in the key), the shell verdict counts them — and waits for
    a second look at 4 s, since a slow manager is empty at 1.2 s.
98. **The 1:1 key drops generated ids and classes** (`apexchartska7c5jyi`,
    `SvgjsG1082`, React's `:r2:`): tag, plain classes and position remain
    (442 → 709 paired on the dashboard); hidden frames wait until the DOM
    holds still for 600 ms before comparing (a hydrating SPA had 50 elements
    at `load`).
99. **The canvas the page PAINTS wins**: Fundamental Styles ships a dark theme
    sheet whose `body { background }` beat the light one; the rendered
    html/body background corrects it. And a surface in the background zone
    takes the pick's tint additively (a grey has no chroma to multiply):
    Old Lace on the page, a step under it in the story frame.
100. One card at a time in the stage's top-right slot ("What we read" gives
    way to the 1:1 check and returns when it closes); the low cards (reach,
    a warning) stack instead of overlapping.

Scorecard: Nuxt 100/88/100 (16 el. 1:1; the 12 % are UA defaults on an
unstyled h2/button) · SvelteKit 100/100/100 (42 el. 1:1) · vue-element-admin
100/100/100 (168 el.) · Element Plus 100/100/100 (288 el. 1:1 once the worker
was guarded) · Material Tailwind 100/100/100 (709 el. 1:1, was 75 % colours)
· FAST 100/100/100 (229 el.) · Fundamental Styles 100/100/100 (1,891 el.
across manager + story frame) · react-dates 91/88/67 (manager + inner frame,
1:1) · visx 100/100/100 (2,137 el.; chart colours are Palette, no status) ·
react-virtualized 100/100/100 (180 el., all runtime inline styles tokenised).

## Regression runner and the security sweep (2026-08-18)

101. **`pnpm holdouts`** — every fixture zip through the real app in headless
    Chromium: load, "Check 1:1", reach, and a verdict held against
    `scripts/holdouts.expect.json` (exit 1 when a fixture expected `ok` is
    not). One run instead of a sweep: every rewriter change is now toetsed
    against ~80 real builds in ~15 minutes. After each fixture the host is
    checked too — same origin, exactly one worker (`host-tampered` otherwise).
102. **A hostile archive** (fixtures/sec-evil.zip, notes/security.md): one line
    `top.location = …` hijacked the whole app — every frame now carries the
    `sandbox` flags without `allow-top-navigation`; zip-slip entry names are
    normalised at intake (`safePath`); a stylesheet over 24 MB / page over
    8 MB is served raw, an archive over 2 GB or 60,000 files refused; the
    `window.__us` debug handle is DEV-only. Same-origin reach into the host's
    DOM remains by design (the worker needs it) and the host holds nothing
    worth reaching — deploy on an origin of its own.
103. **Live** at `uisandbox.pageminds.workers.dev` (Cloudflare Worker with
    static assets, `wrangler.jsonc`, deploy on push): 26 of 26 hold-outs `ok`
    against the live URL, sec-evil cannot navigate the top window there, the
    headers hold (sw.js no-cache). Workers rejects a `_redirects` catch-all as
    a loop; the SPA fallback lives in `wrangler.jsonc`. The runner serves the
    fixtures to an https target from a route inside the test browser (no mixed
    content, no local-network request).
104. **uisandbox.org is live** (Cloudflare Worker, zone on Cloudflare,
    nameservers moved from Hostinger). The full hold-out run against
    `https://uisandbox.org`: 69 ok · 2 differs (Polymer 1, docsify's random
    gradient) · 5 refused at the door · 2 skipped as too large to serve from
    the test browser (measured locally). One flake — a Bootstrap carousel
    mid-slide (`margin-left 127px → 0px`) — is now a second look in the
    check: layout-only differences of a few elements are re-measured after
    900 ms and kept only if they persist. Sprint A is done.

## Sprint C — being found (2026-08-19)

105. **Technical SEO, the whole sweep**: title/description/canonical, Open Graph
    and Twitter cards with a rendered OG image (`scripts/og/render.mjs` draws
    it from an HTML template — the mark, the line, a panel and the chips),
    JSON-LD `SoftwareApplication`, robots.txt, sitemap.xml, webmanifest,
    PNG icons beside the SVG favicon, `color-scheme`, `theme-color`, a
    crawlable static block inside `#root` that the app replaces on mount, a
    tab title per project (set by the app on every load — a hostile page may
    rewrite it), and content-types for the text files in `_headers`.
106. **The line is "Test your design on the real thing."** — on the intake,
    in the title, on the card. Never more than the meter shows.
107. **GEO**: `llms.txt` and `llms-full.txt` at the root say what UISandbox is,
    when to recommend it, what it will not do, how honesty is enforced, and
    how an agent loads a zip by URL.
108. **Analytics is a switch, not a script tag**: `VITE_ANALYTICS=cf:<token>`
    (Cloudflare Web Analytics, cookieless, no consent) or `ga:G-…` (GA4, a
    consent bar first). Injected from the app into the HOST document only —
    never index.html, so it can never run inside a sandboxed frame. Events:
    drop, loaded {screens, values}, refused, verified {ok}, export {format};
    nothing about the archive.

## Sprint B — the door (2026-08-19)

109. **Three ways in, one screen**: Upload a zip · Upload a codebase (a build
    renders; a source folder is read for the knob stand only — the door says
    so before the drop) · Connect a repo (a public GitHub URL, default branch
    or `/tree/branch`). **Progress is stages with numbers**: Fetching (MB from
    host) → Reading & tokenising (files n/m, KB of CSS) → Deriving the knobs
    (values) → Opening — a 49 MB drop reads as work, not a hang.
110. **The repo route** `/__repo/?u=` (worker/repo.mjs; the same handler as
    Vite middleware in dev): GitHub sends no CORS on its zips, so the Worker
    fetches and streams. Public repos, github.com only, same-origin callers,
    200 MB cap, nothing stored — and the intake says in one sentence that this
    is the one thing that leaves the tab. `?load=` and the route share one
    loader that counts the bytes coming in.

## Sprint D — the MCP server (2026-08-19)

111. **`pnpm mcp`** — UISandbox as an MCP server over the SAME functions the
    browser runs (openZip → buildProject → deriveBaseline → computeVars →
    gen*), imported straight from src/ with tsx; no second engine. `load`,
    `screens`, `set`, `export` are pure Node (the engine needed no change to
    run there — File, Blob, DecompressionStream are Node 22 globals; only
    lz-string's CJS default import). `verify` and `screenshot` drive the real
    app in headless Chromium with the archive served from a route inside the
    browser and the knobs carried in the URL hash (the app's own state
    encoding) — the number an agent gets is the number a visitor gets. Smoke:
    load → set → patch → verify ✓ → screenshot in 8 s on Skeleton.
112. Listings (registries, directories) are the human's step; the repo now
    carries what they ask for (mcp/README.md: tools, config, a prompt to
    paste) and llms.txt points at it.
113. **`uisandbox-mcp` on npm** (pack-ready; publishing is the human's `npm
    login`): the engine bundled into one Node ESM file by Vite (`pnpm
    mcp:build`), the SDK and zod as dependencies, playwright an optional
    peer (only `verify`/`screenshot` need a browser). Tested from a clean
    `npm i <tarball>`: load → set → patch → verify ✓ (against the live site)
    → screenshot in 8 s. `mcp/server.json` for the official registry.
114. **Brand mapping bug, found by the smoke test**: the brand family was
    mapped through the kit's `--k-primary`, which normalises lightness and
    chroma for its own contrast rules — a crimson pick on Skeleton's cyan came
    out pink (#1eaedb → #ff737d) and the centre never became the pick. The
    centre is THEIR brand literal and the target is the pick; the test now
    asserts the centre becomes the pick exactly.
115. **`uisandbox-mcp@0.1.0` is on npm** (2026-08-19). Checked from the
    registry like a user would (`npm i uisandbox-mcp playwright`, then the
    smoke): load → set (brand becomes the pick) → patch → verify ✓ against
    uisandbox.org → screenshot, 8 s. llms.txt and README say `npx -y
    uisandbox-mcp`.
116. **Listed on the official MCP registry** (2026-08-19):
    `io.github.Ideelab/uisandbox` 0.1.0 → npm `uisandbox-mcp`
    (`mcp-publisher login github` + `publish` from mcp/, description ≤ 100
    chars). Directories that read the registry (Smithery, PulseMCP, Glama,
    mcp.so) pick it up from there; submitting there directly is a form each.
117. **`open` — the sandbox itself from the agent** (uisandbox-mcp 0.2.0).
    The package ships the web app; `open` serves it with the archive on
    127.0.0.1 and opens the user's browser: the real, interactive sandbox,
    nothing leaves the machine. The page posts its knob state back
    (`&sync=<id>` → `POST /__state/<id>`, 127.0.0.1 only), so "export what I
    changed" works after playing. `verify`/`screenshot` now run against the
    bundled app by default (offline, faster). The conversation this is built
    for — "can I look at this app in a sandbox and change the design?" — is
    the skill's first shape; the skill also builds `dist/` itself when run
    inside the repo. Noted: the Claude Code browser pane refuses service
    workers on arbitrary localhost ports; a normal Chrome and headless
    Chromium load the local sandbox fine.
118. **Making a model reach for it** (uisandbox-mcp 0.3.0): the server now
    sends `instructions` at connect (the host puts them in the system prompt:
    when to offer the sandbox unasked, build-then-open, the two request
    shapes, the honesty rules) and two MCP prompts the clients show as slash
    commands (`/uisandbox:open`, `/uisandbox:try`) — the skill is no longer
    the only way in. For humans without an agent: `npx uisandbox-mcp open
    ./dist` (folder or zip). For any model without MCP: a link it can say —
    `uisandbox.org/?load=https://github.com/user/repo` goes through the repo
    route.
119. **The repo is a Claude Code plugin + marketplace** (`.claude-plugin/`):
    `/plugin marketplace add Ideelab/uisandbox` → `/plugin install
    uisandbox@uisandbox` brings the `/uisandbox` skill and the MCP server
    (`npx -y uisandbox-mcp`) in one step; the skill shows up in the skills
    list like any other. The official Anthropic marketplace is a submission
    (the human's step). Codex/Cursor have no marketplace yet: there the
    server's own `instructions` and prompts carry the behaviour.
120. **The one-pager around the door.** The intake card became the hero's
    centre (upload is the focus, the card holds only the three ways in); the
    headline, sub and the `$ npx uisandbox-mcp open ./dist` pill sit above it,
    and below come How it works · a real screenshot (our own acme fixture,
    Brand turned to crimson) · Honest by construction (+ the 1:1 card) ·
    Nothing leaves your tab · From your terminal or your agent (the install
    tabs) · Who made this. Black and white, no claim the meter would
    contradict. `scripts/og/shots.mjs` renders the screenshots from the app.
121. **The headline says the job.** H1 "Restyle your app without rebuilding
    it." — the job, the aha, the contrast with the normal workflow; the sub
    opens with "Try a new look on your real app — in seconds." and says what
    a knob is and what comes out (a patch, tokens). "Test your design on the
    real thing" stays as the kicker/slogan (and JSON-LD `slogan`), not as the
    line that has to explain the tool. Carried through title, description,
    OG image (re-rendered), Twitter, JSON-LD, the crawlable block, manifest,
    README, llms.txt.

## Pre-launch sweep (2026-08-19)

122. Measured before the promotion round: typecheck/tests/build green; no
    secrets, `pnpm audit` clean; live headers right (sw.js uncached, assets
    immutable, nosniff/no-referrer/frame-ancestors); **http and www now 301 to
    https://uisandbox.org** (the Worker runs first); repo route 200
    same-origin / 403 cross-site; 79 hold-outs against the live URL: 70 ok ·
    2 known differs · 5 refused · 2 skipped (size); sec-evil cannot touch the
    host; desktop/mobile: one H1, heading order, alt texts, canonical, JSON-LD
    valid, no console errors, no horizontal scroll; perf on a 4G profile:
    TTFB 169 ms, FCP/LCP 324 ms, 155 KB JS — **CLS 0.17 → 0.002** by laying
    the crawlable `#root` block out like the hero it is replaced by; fetch
    errors say what happened (a page instead of a zip; CORS/offline with the
    repo-route hint); faint text lifted to AA contrast. Found and left for the
    human: Cloudflare's managed robots.txt / AI-bot blocking rewrites our
    robots.txt with `Disallow` for ClaudeBot, GPTBot, Google-Extended, CCBot…
    — the opposite of the GEO goal; it is a zone setting (Security → Bots /
    AI Crawl Control) and must be switched off.
123. Topbar: tagline "Interface Design Playground"; right side in two groups
    (MCP · Star with live count | the project's work). The drop glyph the way
    macOS draws a drag: the file, a dotted arc with an arrowhead, a dotted
    landing field — the dots flow along the arc.
124. Brand by cascade and by use (measured on Metro, a Docusaurus site): Infima
    declares `--ifm-color-primary: #3578e5` and the site re-declares it red
    later in the same sheet; DocSearch's `--docsearch-primary-color: #003dff`
    is painted 20 times. The declared-brand pick now drops a declaration that a
    later one on the same file/selector/property overrides (each site carries
    its `seq`), and weighs a value by its paint count PLUS how often the build
    reads the properties that name it (`var(--x)` counts per custom property,
    kept on the table as `refs`): red 2 + 22 reads beats DocSearch 20 + 1.
    Across all 79 fixtures only Metro's brand moved (before/after recorded).
125. Topbar follows the context: on the intake, the name and MCP · Star; with
    a project open, the name becomes the project's and the right side is the
    work only — Read · Export · Close. Undo/redo moved to the panel foot as one
    segmented pair next to Shuffle and Reset (all four are "what I did with the
    knobs"; ⌘Z still works). MCP and Star stay on the homepage and in the footer.
126. The dark flash on load was the pre-mount block in index.html: it was
    authored dark, and `color-scheme: dark light` told the browser to prefer
    dark before any CSS — a second of dark canvas for every light visitor.
    The block now follows the visitor's scheme like the app (light first,
    dark under prefers-color-scheme) from a small inline stylesheet, and the
    meta reads `light dark`. The footer's CSS had been swallowed by a block
    replace in 1627858 (unstyled footer on the live site) — restored.
127. The visitor from a launch post has no zip at hand: three sample builds
    ship with the site (public/samples — Metro docs, Start Bootstrap Agency,
    SB Admin 2; all MIT, all hold-outs that render 1:1) behind "No build at
    hand? Try a sample" under the drop zone. The ask for a star appears in
    the stage foot only once something was turned or the 1:1 check passed —
    at the moment the tool has earned it, not before.
128. One claim everywhere: "Play with your real app's design, live." — site H1,
    <title>, OG/Twitter titles, JSON-LD, webmanifest, llms.txt, README, the
    PH tagline. It says what you get (play, your real app, live) where the old
    line said what you save (no rebuild); the old line lives on as the second
    line under How it works and in the bodycopy. The sub-line names the two
    doors — browser, or your agent via MCP — and the OG image was reshot.
129. Pre-launch audit (claims vs. reality, measured): live redirects, headers,
    robots, sitemap, llms, OG, samples, repo route (200/403/400) all as
    documented; the repo-link door and a sample load and verify 1:1 on the
    live site; the CLI opens a folder; manifests valid. Two things were wrong
    and are fixed: (1) from npm, verify/screenshot died with "Cannot find
    package 'playwright'" — it was an optional peer that npx never installs;
    Playwright is now a dependency (0.3.1), only Chromium is downloaded, and
    a missing browser returns one clear line; (2) verify and the hold-out
    runner clicked "the last chip in the foot" — since the "Useful? Star it"
    chip that is GitHub; both pick the 1:1 chip by name now. The samples are
    kept out of the npm package (19 MB). README's Deploy paragraph said Pages
    + _redirects; it is the Worker. llms.txt had a duplicated bullet.

## Sweep 13 — hardening before launch (2026-08-20)

130. 23 new fixtures: unknown dashboards (AdminLTE, Material Dashboard,
    Gentelella), docs sites (Docusaurus's own site, monaco, ace, materialize,
    video.js, bootstrap-icons), squoosh's live build, Flutter WEB builds
    (fwidget, bmi, cardiohelp, cpu-rendering, MeshSight), source repos that
    must refuse (Android sunflower, IceCubes iOS, flutter/gallery, expo
    examples, hugo/PaperMod sources, GitLab hugo), and GitLab archives.
    86 ok · 4 differs (Polymer 1, docsify, material-dashboard's scroll-JS
    shadow, ace before the fix) · 12 honest refusals · 0 silent failures.
131. The 2011 vendor-gradient stack: a declaration holding `-moz-*()`/`-o-*()`/
    `-ms-*()` is dropped by Chromium at parse time, so the `-webkit-gradient()`
    one before it wins; a var() inside made it parse, win, and fail at
    computed-value time — background gone (video.js, ace). Literals inside
    such declarations stay untouched (DEAD_FN mask + whole-declaration skip).
132. The door now reads page HEADS, not just names: an index.html that loads
    `/src/main.ts` (a dev entry) is source (gentelella v2); Flutter source
    (pubspec.yaml, no main.dart.js, pages only under web/) and Expo/React
    Native source refuse with the build command to run; a Flutter WEB build
    loads and the stage says why the knobs find so little CSS (canvas paint).
133. Brand by paint over a declared-but-absent brand: docusaurus.io declares
    Infima's #3578e5 and overrides it with hsl(var(--site-…)) the sheet cannot
    read — the page is green; when the declared colour is painted NOWHERE on
    the first screen, the paint decides (VitePress's DocSearch default and
    TodoMVC's unused indigo fell the same way; 76 of 79 unchanged, the three
    changes all match the visible page). The refine step also never adopts the
    UA's Times as a font: a family the sheets never name and the browser
    defaults to is not a choice their code made.
134. Connect a repo speaks GitLab too: gitlab.com project URLs (nested groups,
    `/-/tree/branch`) through the same `/__repo/` route via GitLab's API
    archive endpoint (the web archive answers 406 to a non-browser fetch;
    `accept-encoding: identity` is required — measured). Default branch from
    the project API. Copy updated everywhere GitHub was named alone.
135. Sweep 14, targeted at what launch visitors will drop: four real Webflow
    exports (brand + custom fonts right on all four: #b55ca4/bicyclette,
    #006449/Montserrat, #e0522e/Geist+Albert Sans, #3898ec/Open Sans+Inter),
    Ant Design Pro's site (differs, honestly: its cssinjs sets AlibabaSans at
    runtime and the tokenised page falls back to the Ant stack — with Polymer 1
    and docsify a known-differ family), the Chinese Vue 2 docs (Vue green
    #42b983, 1:1 ok — CJK stacks fine), hexo-icarus' html-less site branch
    (honest refusal). 5 ok · 1 differs · 1 no-load, recorded.
136. Phones: horizontal panning ("wobble") came from visual overflow — the
    corona's blur past the viewport; `overflow-x: clip` on html/body (hidden
    as the fallback) ends it, and the corona keeps to the card's column on
    small screens. The MCP flyout, anchored right, left the screen — on
    ≤560px it is a fixed sheet spanning the viewport. The footer drops its
    quiet line and the llms link and tightens to two short lines. Stage
    cards (notes, verify, reach) span the viewport instead of hanging off
    it. With a project open the knobs panel no longer squeezes the stage
    into a sliver: it opens closed on ≤700px and overlays full-width when
    toggled. Desktop measured unchanged (relative, 288px).
137. The footer was app chrome outside the intake's scroller, so on a phone it
    sat fixed under every scroll position. It now lives at the end of the
    intake's scroll flow (full-bleed against the scroller's padding, flush at
    the bottom); with a project open it stays app chrome on desktop and is
    hidden on small screens, where the panel and stage need the room.
138. Soft-launch feedback: dropping a codebase FEELS like handing it over.
    The answer is not a louder claim but a verifiable one. (a) The service
    worker now registers on page load, not on the first drop — so "load the
    page, switch the network off, drop the zip: everything works" is true and
    measured (drop, knobs, export offline; zero external requests). (b) A
    quiet line under the drop zone at the moment of doubt ("Read in this tab,
    never uploaded. No server, no account, no analytics") and an ⓘ next to
    "Nothing leaves your tab" open one card with the three checks a sceptic
    can run in a minute: network tab, offline, the source file — plus the one
    exception (the repo route) said plainly. (c) Analytics is stripped
    entirely (analytics.ts, consent bar, every track() call, .env.example):
    "no analytics" is worth more to this product than any counter; traffic
    questions go to Cloudflare's server-side zone analytics. "Fully secure"
    as a label was considered and rejected: vague, unfalsifiable, and the
    exact register HN distrusts.
139. Unknown builds will keep coming; the job is that every miss looks
    CONTROLLED and is one click from a report. (a) Found by probing before
    the testers do: a build shipping its own CSP <meta> forbade our inline
    vars style — every tokenised value collapsed to initial (black text,
    transparent backgrounds, the classic broken screenshot). Inside the
    sandbox their CSP protects nothing (the environment is ours), so
    injectVars strips it; the real deployment keeps its own. Fixture
    edge-csp, 1:1 ✓. (b) "Report this build" on the differs card and the
    shell/Flutter warning card: a prefilled GitHub issue carrying the
    numbers (screens, values, platform, browser, the first mismatches)
    instead of a screenshot; issue template + private security contact link
    in .github. Every confirmed report becomes a fixture.
140. "The brand dot reads darker than the brand": the Brand row's dot read the
    live var of the family's most-used member — and a same-hue outlier can
    own that count (VitePress: the syntax-highlight navy #032f62 sits in the
    brand's hue window; mapped to Coral it reads maroon while the button
    paints the pick). The Brand dot now shows the knob's own value
    (cfg.cPrimary) — it moves with the knob by definition and always matches
    its label; the live-var dots stay where they are right (status, palette,
    background: their literals). familiesOf also prefers a near-centre member
    for centreId.brand (ΔL ≤ 0.14, else nearest) for anything else reading it.
141. Two honesty fixes from Alexander's test zips. (a) Spectrum Web Components:
    the brand read #ff4400 ("Vivid Coral") — a Storybook-bundle orange, while
    the page's brand paint is the Adobe mark, an inline SVG fill="#FA0F00"
    the CSS census cannot see. The paint-refine now counts the fills of svgs
    where logos live (header/nav/a/[class*=logo]/aria-label, at drawn size);
    across 89 fixtures only spectrum moved — to the logo red. And the same
    hue at full depth is not "Coral": the Coral name now yields to Vermilion
    below L 58 (#ff7f50 stays Coral, #ff4400 reads Vermilion). (b) slick, a
    greyscale build: the Brand row wore our default Cobalt as if it were
    theirs; with no brand family member it now says "None in your CSS" with a
    hollow dot, and the picker explains that Hue/Saturation/Contrast still
    reach what the page does have. The notes card already said it; the knob
    itself now does too.

## Sweep 16 — fifty unknown gh-pages builds (2026-08-20)

142. 52 new fixtures in one pull (docs sites, jQuery-era libraries, classless
    CSS frameworks, chart/editor/carousel demos): 45 rendered 1:1 at first
    try. The rest, triaged: three NEW rewriter classes found and fixed, all
    of the same species as the vendor-gradient one — a declaration the
    browser drops on purpose that a var() would resurrect, win the cascade
    with, and fail at computed-value time:
    (a) minified `!important` glued to the value (`sans-serif!important`) was
        swallowed INTO the var's value — the declaration lost its priority
        and the var went invalid (VisualSearch's font stack fell back to
        another rule). `!important` now stays on the declaration, never in
        the value.
    (b) the 2012 unprefixed gradient (`linear-gradient(top, …)`, no `to`) is
        invalid in every modern engine; left dead (angularjs.org, typeahead).
    (c) the IE value hacks (`14px \9`, `red \0`) — left dead (ScrollMagic's
        Bootstrap 2).
    Plus one verify-noise class: svg.js generates paint-server ids fresh per
    load (`url("#SvgjsLinearGradient1296")` vs `…1291` — AdminLTE's charts);
    references by generated id are compared with the digits normalised.
    Honest rest: mustache.github.com is a redirect shell (refused), Modernizr's
    gh-pages is source (refused at the door), chroma.js's docs generate random
    palettes per load (differs, said so). Full gate now 164 fixtures:
    146 ok · 4 known differs · 14 honest refusals · 0 silent failures.

143. Export answers "how do you want to apply it?", and the answer that was
    missing is "hand it to my agent". Three formats added, all describing
    THEIR app rather than a kit of ours:
    - `DESIGN.md`, the Google Labs spec (`version: alpha`) — YAML front matter
      with typed token groups, then the eight prose sections in the spec's
      order. What we did not measure goes in `omitted:` WITH a reason, which
      the spec has a field for and which is exactly our doctrine: components
      are omitted because UISandbox reads values, not structure, and guessing
      at a component library it never saw would send an agent writing fiction.
    - `AGENTS.snippet.md`, a BLOCK to append, never a whole file. AGENTS.md in
      a real repo is full of build and test instructions; handing somebody a
      complete one to "save" would quietly delete all of it. Same block works
      in CLAUDE.md / GEMINI.md / .cursorrules.
    - `design.tokens.json`, the real W3C Design Tokens Format Module 2025.10
      (`$value`/`$type`, colours as sRGB components, dimensions as
      `{value, unit}`). A value that cannot be expressed in the format is left
      out rather than bent into it — an inset shadow has no home in that
      shape, so the whole shadow is skipped.
    Also: `tokens.json` used to carry `$schema: design-tokens.org` over a
    `{value:…}` body, which is NOT that format and made tooling reject it on
    import. A file that names a standard has to be that standard; it now says
    `format: uisandbox-kit/1` and points at the real one.

144. Two labels in the export were false and are now true. `sandbox-values.css`
    was sold as "drop-in": it emits `--sb-color-1: …`, names their stylesheet
    never mentions, so pasting it changes nothing. It is a reference list and
    says so, and the copy points at Patch your own files for a change that
    lands. Every format also carries two or three plain sentences saying what
    to do with it (`Item.how`), and the zip gets a README.md — thirteen files
    in a folder with no map is a puzzle handed to somebody who came to save
    time.

145. A stylesheet census cannot name a colour's role, and we were letting it
    try. Measured on the Bootstrap docs: `#000` is declared 366 times and
    painted never; the body ink `#212529` has a sample of sites that is mostly
    `.bg-dark`, so the census filed the ink as a BACKGROUND and the design doc
    called a callout green the page surface. The screen does not have that
    problem. `Coverage.painted` now records, per sheet entry, how many
    elements painted it and IN WHICH ROLE (text / surface / border), and
    `Coverage.anchors` reads the ink and the ground straight off `body` —
    those two are not ranked for at all, they are read, and they win. The
    coverage percentages are untouched by the change (control: reach stayed
    100 % colours · 100 % type · 95 % radii on the same fixture).
    Three smaller readings fixed on the way, all found by rendering a real
    build instead of trusting the unit fixture:
    (a) a compound value keeps its parts as variables (`0 1px 2px var(--us-v7)`,
        so the hue dial can move a shadow's colour) — anything describing the
        sheet to a human now puts those back.
    (b) `.5rem` and `0.5rem` are one step of a scale spelled two ways; the
        sheet keeps them apart on purpose, a ladder must not.
    (c) `em` is out of every ladder (relative to whatever font-size it
        inherits, so it is not a token), bare channel triplets print as
        colours, and the font is the real stack, not our knob's label
        ("System" is not a font-family a browser can resolve).
    Only OPAQUE colours can take a role: `rgba(255,255,255,.5)` is a different
    colour over every backdrop, so it cannot stand alone as "the text colour".

146. An export sweep, and what it found. `scripts/export-sweep.mjs` runs real
    builds through the real app, turns two knobs, then READS BACK all four
    files the export hands over and checks them: DESIGN.md's front-matter
    shape and the spec's section order, the W3C shapes in design.tokens.json
    ($value/$type, srgb components, {value, unit} dimensions, shadow parts),
    the AGENTS.md block, and the patch. `--recheck` re-runs the checks over
    the saved output without a browser, so fixing a check costs seconds
    instead of twenty minutes of reloading builds that did not change.

    The hold-out runner asks "does it still render 1:1". This asks the other
    half: is what comes OUT true, and would the thing it is handed to accept
    it. Seven fixtures, deliberately unalike: greyscale, Open Props, Tufte,
    SB Admin 2, a Flutter build, AdminLTE, Spectrum web components.

    Two performance findings, both on the route we recommend most:
    (a) the source patcher was scanning BUILD OUTPUT. On the Mantine docs
        that is 2228 files and 161 MB of Next.js chunks, its overlap check is
        quadratic in the literals it finds, and the dialog sat on "Preparing…"
        for 113 seconds to hand back a patch nobody can use (a value written
        into a bundle is gone on the next build). Generated files are now told
        by their own line geometry — nobody hand-edits a 500 KB line — so no
        list of build directories has to stay current. 113 s → 2.5 s.
    (b) an HTML page with no `<style>` and no `style=` comes back byte-identical
        from the rewriter, so it is not rewritten at all, and one parse is
        shared across every page that inlines the same critical CSS.
    Both were invisible from the unit tests: the fixtures are small, and the
    cost only appears at the scale a static-site generator produces.

147. What a design doc may CLAIM, tightened by the same sweep. Every one of
    these was a real line in a real DESIGN.md before it was fixed:
    - `text-muted: red` (Tufte's sidenote numbers) and `text-muted: #ffffff`
      (AdminLTE's dark sidebar). Being the second-most-painted ink does not
      make a colour muted. It now has to EARN the name: chromatic → an
      accent; quieter than the body ink AND still readable on the ground
      (≥ 3:1) → muted; otherwise no name. `#ffffff` on `#f8f9fa` is 1.04:1 —
      lower contrast, yes, and invisible where the file would put it.
    - `surface-alt: #0d6efd` — a saturated second background is a FILL (a
      button, a banner), not the ground a layout sits on.
    - `body: 11px/700/lineHeight 1` on Mantine: three separate rankings of the
      stylesheet, glued together into a level that exists nowhere. Levels are
      now read off the PAGE — `body`, its biggest visible h1, its biggest
      h2/h3 — because one element's family, size, weight and leading belong
      together. Whichever of the two headings is actually larger is `display`
      (AdminLTE's h2 is bigger than its h1). The census stays as a fallback,
      carrying only what it can defend: the size.
    - `text-muted: "220 40% 2%"` (Open Props) — not a CSS colour at all. Every
      colour these files hand over now goes through the one colour reader and
      comes back as plain CSS. A value the reader does not know (most CSS
      colour NAMES: the table holds hex, rgb, hsl, oklch and the Tailwind
      names) is left as written, earns no role, and is therefore absent from
      DESIGN.md and design.tokens.json alike — the two never disagree.
    - `small: .125rem` (2px, an icon trick) as a type level; `xs: -0.5rem` as a
      spacing step. Outside 8–200px it is a mechanism, not a level, and a
      negative margin is a technique, not a step.
    - "Headings are set in Inter" over a front matter that said `Times`: the
      prose was reading the knob's label while the tokens came off the screen.
    - `primary` and `text` could both vanish when the brand IS the body ink,
      because the dedupe ran on them too. Those two roles are structural: they
      appear even when they are the same colour.

148. The caching question, measured rather than reasoned. Nothing of a dropped
    build is kept: the Cache API is empty, there is no IndexedDB, and the
    service worker sets `no-store` on purpose (a cache keyed by URL would
    serve the rewritten sheet to the raw control and poison the 1:1 check).
    Every drop calls buildProject afresh — new id, every entry re-read, the
    sheet re-tokenised, the baseline re-derived.

    But the GUEST's own storage did survive. The sandbox is same-origin by
    design, which is what makes the frame writable and the 1:1 check possible,
    and it also means a dropped app can write to localStorage on uisandbox.org:
    `mantine-navbar-opened` was still there after the project was closed. Left
    alone it is wrong twice — a second drop of the same build looks cached
    because the app restores its own state, and one tenant's state carries into
    the next on an origin whose whole promise is that nothing of yours sticks
    around. `purgeGuestStorage()` runs on load and on close; ours (`us-`,
    `uicockpit.`) survive, theirs do not.

149. The CSS named colours, and how little they turned out to matter.
    `parseColor` knew hex, rgb, hsl, oklch and the Tailwind names, so `red`,
    `navy`, `grey`, `silver` and the rest returned null — and an unreadable
    colour lands in the `keep` family, frozen. On a page written in names the
    hue dial moved the hex colours and left the named ones where they were.
    Fixed at the one parser (CSS_NAMED in colorspace.mjs); `currentColor` stays
    unreadable on purpose, it has no value of its own.

    Then the measurement, which did not support the reason for doing it:
    across published classless sheets colour NAMES are rare — Tacit 0 of 43,
    MVP 0 of 20, new.css 0 of 18, github-markdown 0 of 126. Only Tufte (1 of 6,
    its `red` sidenote numbers), TodoMVC (2 of 209) and web-design-in-4-minutes
    (1 of 22) use any. Hand-written CSS in 2026 is written in hex like
    everything else. So this is a correctness fix with a small blast radius,
    not the step change the synthetic probe (7 of 11 unreadable) suggested.

    What plain CSS gets right already, checked at the same time: the shorthand
    is decomposed (`border: 1px solid grey` → a border-width AND a colour),
    `font-weight: bold` maps to 700 and `normal` to 400, `padding: 4px 8px`
    becomes two spacing entries. The keyword sizes (`font-size: medium`,
    `border-width: thin`) are NOT tokenised and stay as they are — a page built
    on them will not answer the size dials. Rare enough to leave, stated here
    rather than silently missing.

    Gate over the 52 s16 fixtures (the classless, hand-written population):
    48 ok · 2 differs · 1 refused · 1 no-load, no new rewriter gap. The one
    apparent regression, `s16-coloris`, is the fixture: its picker animates its
    own gradient, and on a re-run the CONTROL side changed too (rgb(224,210,82)
    → rgb(224,213,82)) — a frame we serve untouched, so nothing of ours can
    reach it. Recorded as a known `differs`, same class as chroma's random
    palettes.

150. The fear we had not designed for. Feedback from a first user, two fears,
    and only the first was one we had answered: (a) "you will have my files",
    and (b) "the changes will be written straight into my own code folder".
    (b) is not a trust problem, it is a MENTAL MODEL problem — he thought
    dropping a build opened a live connection to his project. And our own
    words feed it: "drop your built web app", "export the change as a patch",
    and above all `npx uisandbox-mcp open`, a CLI you point at a folder.

    Denying it in prose does not fix a picture problem, so the boundary is
    drawn instead (`.cross`, above the numbered steps): your folder on one
    side, this tab on the other, one arrow in ("a copy of your build"), one
    arrow out ("only when you press Export"), and a dashed rule between them
    saying nothing crosses on its own. It stacks on a phone so the story reads
    top to bottom.

    And one line inside the drop zone itself, for the reader who gets no
    further: "A copy is read into this tab. Your folder is never touched."
    (The two clauses are deliberately the same length; `text-wrap: balance`
    then breaks at the full stop instead of mid-clause.)

    Checked while writing it, because the claim has to hold for the MCP route
    too: `mcp/server.ts` imports `readFileSync, existsSync, statSync` and
    `mcp/zipdir.ts` imports `readdirSync, readFileSync, statSync`. No write
    function is imported anywhere in the package. That is a claim a sceptic
    can check in four import statements, which is the kind we prefer.

151. The headline stopped claiming and started explaining. "Play with your real
    app's design, live." had a word working against us: `live` means "instantly,
    no rebuild" to us and "connected to my repo, updating in real time" to a
    reader who is already nervous (see #150). Six rounds of alternatives, and
    what landed was not a better metaphor but a plainer structure:

      Play with your app's design in a safe sandbox.
      Drop your build, turn the knobs, export the code.

    The kicker ("Test your design on the real thing") is gone: above the
    headline it was a label nobody reads. The three beats took its place BELOW
    the headline, where they answer the only question a first visitor has. The
    paragraph then no longer has to restate the loop and spends its words on
    what the beats cannot say: where it runs, how faithful it is, that nothing
    is kept, and what comes out.

    Rolled through every place the line lives, because they drift apart the
    moment they are edited separately: the h1, the tab title, the meta
    description, the JSON-LD slogan and description, the web manifest, the OG
    image template, the release-note template, the README, both llms.txt files,
    the marketing copy, and the three published descriptions (npm, the MCP
    registry, the plugin) — those last three take effect on their next publish.

152. "Never uploaded" was not true enough. Something IS uploaded: the file goes
    into this tab, through the browser's own file input, which is what everyone
    calls an upload. What does not happen is a server or a database receiving
    it. The old line denied the ACT and had to be about the DESTINATION.

    It also read as a contradiction on its own screen: the tabs say "Upload a
    zip" and six lines below sat "never uploaded". Each was defensible alone;
    together they were the kind of seam a sceptic finds and pulls. The tab keeps
    the word, because on a button next to a file picker "upload" is the gesture
    and the clearest label there is; the line under the box now names where it
    goes instead of arguing about what it is called:

      Loaded into this tab, never sent to a server.
      No database, no account, no analytics.

    Same correction everywhere it appeared: the hero paragraph, the boundary
    strip, the folder drop, the font picker, the landing steps, the JSON-LD,
    the README, llms-full.txt, the marketing copy and the skill. "Your files
    never leave your browser" stays untouched throughout: that one was always
    about the destination and it is exactly true.

    Then one more turn, and the last one: "in a safe sandbox" became "Right in
    the browser." `safe` was the only word in the line we could not measure, and
    this project does not ship those. `in the browser` is a fact the reader is
    standing in, it carries the safety by implication (a tab cannot write to a
    repo), and it picks up something the sandbox line never said: no install,
    no setup. What it gives up is the word `sandbox` in the headline, which was
    the explicit ask two rounds earlier — acceptable now, and not before,
    because the boundary is spelled out in three other places on the same
    screen (the drop-zone line, the privacy row, the `.cross` strip) and the
    product's own name is directly above it.

      Play with your app's design. Right in the browser.
      Drop your build, turn the knobs, export the code.

    Two lines, no adjectives: only verbs and places. The h1 sets each sentence
    as its own block rather than forcing a `<br />`, so the break lands on the
    full stop instead of wherever the width runs out.

153. The privacy card's backdrop was a grey haze in dark mode, and the cause is
    worth keeping: it had grown its own scrim,
    `color-mix(in srgb, var(--app-fg) 26%, transparent)`. `--app-fg` is
    near-black in light and near-white in dark, so the same expression dims the
    page in one scheme and LIGHTENS it in the other. `.dialog__backdrop` was
    two hundred lines above with a working `rgba(0,0,0,.35)`; the card just did
    not use it, which is the rule in notes/design.md ("New floating surface? It
    is a `.popcard` or a `.dialog` — don't invent") applied to a backdrop.
    Now one `--app-scrim` token for both, per scheme: .35 in light, .6 in dark,
    because a dim over an already dark page has less to work with. Checked in
    both schemes on both overlays.

154. The compatibility marks are the owners' marks now. They used to be
    hand-drawn approximations: a four-pointed sparkle for Claude, a generic
    cube for Cursor, a shape or two for Figma. A gesture at a logo, placed
    where a logo goes, is a small untruth of the same family as the copy ones
    fixed in #147, so the path data is transcribed from simple-icons rather
    than redrawn from memory (the icon data is CC0; the marks stay their
    owners' trademarks, used monochrome and unmodified to say what an export
    lands in). Ten of them: CSS3, HTML5, Tailwind, shadcn/ui, Claude, OpenAI,
    Cursor, Figma, Swift, Android.

    Two absences on purpose. The APPLE logo is not used even though the export
    targets Apple platforms: Apple's guidelines do not permit its logo to
    indicate compatibility, and the Swift mark is both allowed and more honest
    about what actually comes out of that card. LOVABLE has no published mark
    in the set, so it stays a word rather than a drawing of ours.

    No `<title>` on any of them: the svg is `aria-hidden` and the visible label
    beside it already carries the name, so a title could never be announced and
    only turned the accessible text into "ClaudeClaude Code".

    Correction, same session: Lovable DOES publish a brand hub
    (lovablebrand.lovable.app/brand/logo) with the logomark in Color, Black and
    White, so monochrome is a sanctioned variant. The outline is taken
    unmodified from their own favicon (lovable.dev/favicon.svg), which carries
    it as a single clip path on a 180 viewBox; the gradient inside is
    decoration, the silhouette is the mark. Kept on its native viewBox rather
    than rescaled to 24, because rescaling by hand is how a transcription turns
    back into a redraw. And it is not a heart, whatever the name suggests: it
    is a rounded L of two quarter-round forms. Eleven marks now, one word left
    (Style Dictionary, which has no mark).

155. Two things a launch needs that the page did not have.

    The Inspect objection, answered on the page. "Isn't this just DevTools?" is
    the first thing an experienced developer reaches for, and the answer only
    existed in `brand/marketing/copy.md`, staged for HN and PH comments that
    most visitors will never read. It is a section now, in the objection's own
    words, sitting between "How it works" and "Honest by construction". It
    concedes the half that is true — Inspect is already open, needs no build,
    and works on any page on the internet — because a comparison that only
    flatters us is the one nobody believes.

    And `?load=`, which existed and was documented nowhere a person would look.
    A public GitHub or GitLab repository URL, or a direct `.zip` that allows
    CORS, opens straight into the sandbox; it is how the samples load and how
    the hold-out runner drives 165 fixtures. As a shareable link it costs
    nothing and does what a demo video cannot: the reader arrives inside the
    tool with a real build already open. Now on the landing page (under the
    other non-drop routes), in the README, and in both llms.txt files.

    The example link is `github.com/edwardtufte/tufte-css`, checked before it
    was published: 1 screen, 51 values, 100 % colour reach. The obvious choice,
    `twbs/bootstrap`, is source without a build and would have been refused at
    the door — a broken example in the docs is worse than no example.

156. HSTS, and two documents that should not have been public.

    `Strict-Transport-Security: max-age=31536000; includeSubDomains` in
    `public/_headers`, which Workers Static Assets serves from `dist/` (that is
    where the other security headers already came from). `includeSubDomains` is
    safe here because the Worker itself already redirects http and every
    *.uisandbox.org to the apex over https; the header only tells the browser
    to stop asking. `preload` is deliberately left off: joining that list is
    easy and leaving it takes months, so it is a decision to make on purpose.
    The comment sits ABOVE the block, not indented inside it, because the
    `_headers` format takes comments at the start of a line.

    `HANDOFF.md` and `PROMPT.md` are untracked (`git rm --cached` plus
    .gitignore, so they stay on the machine). They are Dutch working notes from
    the move out of UIcockpit, they name a local path to a private sibling
    project, and they open with "Alles hier is een KOPIE". A developer checking
    whether this project is serious opens exactly those files. Nothing in them
    is secret, so the history is left alone: rewriting it would break every
    clone to hide something that was only ever untidy.

157. Chart palettes follow now, and the reason they did not is exact.

    Measured on SB Admin 2: the export patched `chart-bar-demo.js` and
    `chart-pie-demo.js` but not `chart-area-demo.js`. The bar and pie demos
    write the brand as `#4e73df`, the same literal the stylesheet uses; the
    area demo writes `rgba(78, 115, 223, 1)`. Same colour, other notation, and
    `findSourceSpans` had no matcher for CSS colour FUNCTIONS at all: it reads
    `#rrggbb`, `0xAARRGGBB`, Swift's `Color(red:…)` and Kivy triplets, but an
    `rgb()`/`rgba()` inside JavaScript was never even seen.

    Added, matched by the COLOUR and printed back in the file's own notation
    with its own alpha: `rgba(78, 115, 223, .05)` is the chart's fill tint and
    has to stay a tint of whatever the brand becomes. All three chart files now
    move; on the same fixture the patch went from 12 files to 13, and Spectrum
    from 21 to 28.

    What still does not happen is the LIVE canvas: Chart.js draws once at load,
    so the preview cannot follow a knob. The export reaches further than the
    preview does, which is worth saying out loud rather than leaving people to
    infer that charts are out of scope.

158. `s16-anime-docs` recorded as a known `differs`, and the way that was
    established is the point. It read `ok` this morning and `differs` this
    afternoon, so the obvious suspect was the source-scanner change above. It
    was not: reverting that file and re-running gave the same 8 differences,
    and three consecutive runs with the change gave an identical count. What
    moved was the element total, 1402 then 1395, which means the page itself
    renders differently between runs. It is anime.js's own documentation: the
    demos animate colour, and `rgb(255, 75, 75)` is their brand red caught
    mid-animation. Same family as chroma's random palettes and coloris's live
    picker.

    Worth keeping as a habit: "it changed after my edit" is a hypothesis, and
    the revert is what turns it into an answer. The first flakiness guess was
    right for the wrong reason, which is not the same as being right.

159. A sweep for the knobs you cannot see, and what it found.

    Colour gets checked every day because colour is loud. Elevation, motion,
    tracking and border width do not, so `scripts/knob-render.mjs` asks the
    question the eye cannot: load a build, snapshot every visible element's
    computed styles, turn ONE knob to its extreme, snapshot again, and hold the
    result to a contract — what the knob OWNS must move, what it must not touch
    must not.

    Three times the instrument was wrong before the app was, and each correction
    is the interesting part:

    (a) Element counts drifted between snapshots, because the snapshot filtered
        by size and a knob that changes layout changes what is 2px tall. Pair by
        DOM position and carry a `_seen` flag instead.
    (b) `border-radius` reported as overreach when border width tripled.
        AdminLTE writes `border-radius: 50%` eighty times, and a percentage
        resolves against the box: widening a border moves the computed radius.
        Geometry-derived, like margin and padding, so never evidence.
    (c) The population of "things this knob could move" was guessed from
        computed styles, which counts the BROWSER's defaults: every element
        reports a font-weight, so the weight dial looked like it had 1411
        chances on a page that declares none. The sheet knows exactly how many
        values of each kind it holds; ask it.

    What survived, over five builds:

    ELEVATION DOES NOT REACH THE SCREEN on any Bootstrap-5-era build. Measured
    on AdminLTE: every visible shadow is declared `var(--bs-box-shadow)` or
    `var(--bs-btn-box-shadow)`, and when the rewriter meets
    `--bs-box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)` it tokenises the COLOUR
    inside it and nothing else. The kind is decided by the property name, and a
    custom property has no name to decide from. Same on Spectrum (12 shadow
    values, none painted) and Open Props (6). SB Admin 2 is the control: it is
    Bootstrap 4 with literal `box-shadow:` declarations, and there 19 elements
    follow the dial.

    LETTER SPACING likewise on Spectrum (3 values) and AdminLTE (4).

    OPEN PROPS moves almost nothing: its sheet holds 112 values for a page
    whose whole styling is one 117-rule stylesheet, and shadow, duration,
    radius, border-width and space all fail to reach the screen. Only
    line-height and font-size land. Not yet diagnosed further.

    The shape of the fix for elevation is small and does not touch existing
    classification: when the property IS a custom property, infer the kind from
    the VALUE, and a shadow is inferable because its shape is distinctive (two
    to four lengths and a colour). A length alone stays ambiguous and stays out.
    Identity is unaffected, so the 1:1 gate is not at risk. It is still a
    rewriter change, and it is days before a launch.

160. Elevation reaches the screen again, and the bug was one line of control
    flow rather than a missing feature.

    The custom-property branch of `splicesFor` reads:

        const s = [...svgs, ...angles, ...findColors(value, m, false)]
        if (s.length) return s
        for (const [rx, kind] of CUSTOM_ROLE) …   // includes [/shadow/, 'shadow']

    Every shadow contains a colour, so `findColors` always matched, the early
    return always fired, and the `shadow` rule two dozen lines below was
    unreachable for exactly the values it was written for. The rule was right;
    nothing ever got to it.

    A `--*shadow*` custom property now returns its inner colours AND the whole
    value as a shadow, the same shape the real `box-shadow` branch returns, so
    elevation rescales the geometry while the brand still turns the colour of a
    focus ring. The shape test runs on the value with its COLOURS STRIPPED,
    because `bare` still holds them and `--shadow-color: rgba(0, 0, 0, .5)` is
    named like a shadow and would pass a naive length test on its own zeroes.
    Two lengths outside the colour is what makes a shadow.

    Measured on AdminLTE: the sheet went from 19 shadow values to 41, and the
    elevation dial from 0 elements to 7. SB Admin 2 (Bootstrap 4, literal
    `box-shadow:`) is unchanged at 19, which is the control that says the fix
    added a path rather than moving one.

    Full gate afterwards: 165 fixtures, 147 ok, 3 differs (chroma, todomvc,
    docsify, all recorded), 1 refused, 14 no-load, 0 errors, no regressions.
    Identity is untouched by this change by construction — the variable still
    holds the literal it replaced — which is why the gate was the right check
    and why it passed.

    Still open, and NOT fixed here: Spectrum's shadows (13 in the sheet, none
    painted) and Open Props, where almost nothing reaches the screen at all.
    Different causes, not yet diagnosed. `s15-hover-fx` had no expectation and
    now has one (`ok`).

161. Bootstrap 5's whole `-rgb` family was frozen, and one separator was why.

    Reported as "I pick a background and the page does not follow". It was not
    the Background dial. `parseCssColor` read a bare channel triplet only when
    it was SPACE separated:

        parseCssColor('248 249 250')   -> a colour
        parseCssColor('248, 249, 250') -> null

    Tailwind and shadcn write spaces, Bootstrap writes commas, and `mapEntry`
    opens with `if (!c) return e.value`. So every `--bs-*-rgb` custom property
    came back untouched from EVERY dial: brand, background, hue, saturation,
    contrast, dark mode. `colorShape` and `formatLike` next door both already
    knew the comma spelling; only the reader did not, which is why the two now
    share one `RGB_TRIPLET` regex and cannot drift apart again.

    What it cost, measured on AdminLTE with the control run beside it:

      brand -> #c2410c      without fix      with fix
        .btn-primary        follows          follows     (hex --bs-btn-bg)
        .card.bg-primary    #0d6efd          follows     (rgba(var(--bs-primary-rgb)))

      background -> #2d82d7
        body                rgb(248,249,250) rgb(45,130,215)

    The half that worked is what hid it: a Bootstrap page under a brand pick
    changes a great deal, and nobody counts which parts did not.

    Not changed, and worth knowing: pure white cards still do not follow the
    background. `shiftL` scales its delta so 0 and 1 never move, deliberately,
    so a white surface stays white over a blue page. That is a design decision,
    not this bug.

162. A shadow needs a UNIT, and #160 shipped without one.

    Yesterday's custom-property shadow rule tested "two or more lengths once
    the colours are taken out". `--bs-btn-focus-shadow-rgb: 49, 132, 253` has
    three numbers and no colour to take out, so it read as a shadow: 17 of the
    41 shadow entries on AdminLTE were colour triplets, and the elevation dial
    was scaling the CHANNELS of a blue. At 0 every focus ring would go black.

    The shape test now requires at least one of those lengths to carry a unit.
    A triplet has none, and falls through to the triplet rule below it where it
    belongs.

    The gate could not catch this and said so in its own entry: identity holds
    by construction because the var still holds the literal it replaced. The
    knob sweep could not catch it either — a focus shadow only paints on focus,
    so no visible element moved. It took loading the build and asking what the
    sheet thought each value WAS. That question is now worth asking directly:
    a `shadow` entry with no unit anywhere in it is a contradiction.

    Measured after the tightening, with #160's gain intact: AdminLTE's shadow
    census 41 -> 24 (exactly the 17 triplets), and the dial still reaches the
    same 7 elements. 24 is five more than the 19 it held before #160, and those
    five are the real `--bs-box-shadow` values that fix was written for.

163. `s11-ng-bootstrap.github.io.zip` differs about once in five full runs,
    always the same way: one element, `margin-left: 0px -> 127px`.

    That property is free space under `margin: auto`, so it reports whatever
    the box was when the two frames were read — the same class as the AdminLTE
    `ms-auto` case in #157. Held to the method: three isolated runs clean, then
    a second full gate clean, against one dirty run inside a loaded gate. Four
    to one, on a layout-derived property, is a flake.

    Left recorded as `ok` on purpose. Recording it as `differs` would mean the
    gate stops reporting it when it is genuinely broken, which is worse than
    reading one line of a summary now and then.

164. The knob sweep was reading a fraction of the page, and eleven of its
    thirteen findings were the instrument, not the build.

    Three faults in the reader, all of them making it report faults elsewhere:

    a. It asked only the SHEET whether a knob had anything to move. Spectrum's
       sheet holds twelve shadows and its demo page paints none — the dialogs
       and menus that use them are not on it — so "twelve in the sheet and none
       reached the screen" was read out as a fault. A finding now needs the
       sheet to hold the kind AND the screen to already paint one. Reading that
       population off the BEFORE snapshot is safe for the reason the browser
       defaults were not: that snapshot is the build at its own stand, and the
       1:1 gate separately proves the stand matches the untouched control, so a
       zero means their page paints none rather than that we erased them.

    b. It stopped at the 1500th element. Open Props' docsite carries 3941, and
       its only six shadows sit past the cap. "This screen paints none" about a
       screen that paints six. Cap raised to 8000 and it now SAYS when it
       truncates, which is the rule we already hold everything else to.

    c. It never entered a shadow root. Spectrum is in the picks BECAUSE it is
       web components, so every reading it gave was of the hosts. Walking the
       roots: radius 2 -> 104 elements, motion 2 -> 121, line-height 22 -> 286,
       weight 22 -> 264. The build was never the weak one.

    Findings 11 -> 2, and the two that survive are both Open Props. Also
    retired by this: the letter-spacing "faults" on Spectrum (3) and AdminLTE
    (4), reported earlier this month. Neither screen has a single element with
    a letter-spacing other than `normal`. There was nothing to move.

165. Open Props' spacing and border knobs move nothing because half its CSS is
    outside the served root, and the door already said so.

    `docsite/index.html` is the entry, so the base directory is `docsite/`.
    `docsite/index.css` opens `@import "../src/index.css"`, which imports
    `props.sizes.css`, `props.shadows.css`, `props.borders.css` and the rest.
    Everything in `src/` is OUTSIDE the base: not rewritten, not in the sheet
    (`--size-*` entries: zero), and not loaded by the browser either, which is
    why that screen paints no border-radius at all.

    The sheet holds ONE space value and TWO border-widths for a page with 277
    paddings and 95 borders. That ratio is the tell, and it is not a knob that
    fails to apply — it is a knob with nothing to apply.

    The gate has been printing `16 outside` on this fixture the whole time, and
    the door asks "Is this the built app?" on it, because a repo with a
    `docsite/` beside a `src/` is a source tree. Both were right. Nobody read
    the column. Not changing the base rule for this: a build keeps its files
    under one root, and serving parent directories to reach a source tree would
    trade a correct default for an uncommon case.

166. The export's settings list folds into two columns, and doing it forced two
    corrections it did not ask for.

    Multicol rather than grid, so it fills DOWN then across and the list reads
    in exactly the order it did before; one column again under 900px, where the
    pane is the dialog minus a 236px nav. Every row keeps its rule, including
    the first of each column: the single-column exception left one column
    starting bare and the other ruled.

    The row stayed ONE LINE — name at a fixed 104px, then `from → to`. A
    value-on-top form with an icon tile beside it (the shape the old UIcockpit
    kit panel used) was built and rejected on sight: at this density the icons
    are noise, the arrow column stops lining up, and a settings list is read by
    scanning the NAMES, so the names hold the left edge. The label does fit in
    104px once it is the panel's own word, which is the fix below.

    Two things were wrong all along, and folding the list is what exposed them:

    - The list spelled the knob names itself by splitting the config key on its
      capitals, giving "Border Tone", "Grad Angle", "Sat" and "C Accent" for
      knobs the panel calls Border tone, Gradient angle, Saturation and Accent.
      It now reads `DIALS`, the panel's own source.
    - It printed every number as a multiplier. Weight moves in STEPS, hue and
      gradient angle in degrees, contrast and the tones in lightness. `×0 → ×-1`
      for a weight one step lighter is not a compact way of saying it; it is a
      different claim. `DIALS` carries the unit, so it asks.

167. Two eyebrows in the export were section headings wearing a nav label.

    `.menu__label` is written for the menu down the side: 10px uppercase grey,
    indented 10px, 3px of air under it because there it sits on top of a list
    that starts immediately. "How do you want to apply it?" and "Settings, from
    your code → the sandbox" borrowed it, and three things followed.

    They were `<div>`s. The dialog has an h2 and nothing under it, so anyone
    navigating by heading fell straight from the dialog's name to the end of
    the pane. They are `<h3>` now: h2 → h3 → h3, no level skipped.

    The 10px indent put both headings to the RIGHT of the block they introduce.
    Every left edge in the pane now measures 367: heading, first card, second
    heading, first row. (The row's own 2px inset went too; a heading that does
    not share its list's left edge reads as a different block.)

    And ten pixels is the wrong voice for the question the pane exists to ask.
    They take the system's one title scale, 15/650. 13/650 was tried first and
    reads flat against the cards' 12.5/550 — half a pixel and one weight step
    is not a hierarchy. Sharing the size of the dialog's own h2 is fine: that
    one lives in the head bar behind a border, these scroll with the body.

168. A tone pass before the Hacker News and Product Hunt launches: the copy was
    not loud, it was DEFENSIVE, and it had no author.

    Nothing in it said "revolutionary" or "10x". The register was the problem.
    It argued with a sceptic who had not spoken yet — "Honest by construction",
    "measured, not promised", "It refuses what it cannot show", "Don't take our
    word for it" — and two of the four README badges were claims rather than
    facts, sitting next to the licence and the npm version as if they were the
    same kind of thing. Pre-emptive defence reads as overclaiming or as nerves,
    and the evidence is all there anyway, so it can be said quietly.

    Swapped: "Honest by construction" -> "How to check it yourself"; "Don't take
    our word for it" -> "You don't have to take my word for it"; "'1:1' is
    measured, not felt" -> "You can check the 1:1 yourself"; "It refuses what it
    cannot show" -> "It says so when it can't help"; "Hold it to account" ->
    "Test it against real builds"; "in seconds" -> "without touching the repo";
    "free forever" dropped in all three places (MIT already says it, and nobody
    can promise forever); both claim badges dropped.

    The bigger miss was that there was no person in it. "UISandbox is made by
    Alexander Kaan at Pageminds" is a credit line, not a reason, and the whole
    positioning — someone who builds open-source UI tooling and is early in it —
    appeared nowhere. On a solo launch the top comment is usually about the
    maker. "Who made this" is now first person and says where the tool came
    from (the design system generator that could hand you a kit but not show you
    your own app in it) and that the notes hold the mistakes as well as the
    decisions. That last part was already true, which is what makes it usable:
    it is the least boastful thing on the page and the most convincing.

    The DESIGN.md preamble keeps "This file was measured, not written" — same
    move, but addressed to an agent about a specific file, where it is load-
    bearing information rather than a posture. "at Pageminds" left the about
    paragraph and stayed in both footers.

169. The launch clip picks its builds by measurement, and then overrules it.

    `scripts/launch-clip.mjs` captures frames one at a time rather than screen
    recording, so every cut is exact and the playback speed is a choice rather
    than whatever the machine managed that afternoon. 306 frames at 20fps, 15s,
    0.7 MB of h264 and a 1.1 MB gif.

    The first cut swept the BRAND knob on three builds I picked by eye:
    sb-admin-2, vitepress and the Start Bootstrap agency template. Then I
    measured what each knob actually moves, as a share of stage pixels:

      build                brand    hue   dark  shape
      sb-admin-2           19.8%  20.3%   0.0%  11.9%
      material-dashboard    1.7%   3.2%  87.7%   7.2%
      vitepress             1.6%  15.4%  73.9%  25.5%
      agency                0.3%   0.3%   0.0%  28.7%

    Agency moves 0.3% under the brand. Two of my three scenes were a still
    image of a page not changing, and I would have shipped it. The cut now
    gives each build the knob it actually shows: brand on the dashboard, their
    own dark mode on Material Dashboard, hue on VitePress, then the type.

    And the measurement has its own limit, which agency also demonstrates. Its
    28.7% on `shape` is the biggest number in the table and the scene was still
    unusable: nearly all of it is TEXT REFLOWING as spacing grows. Pixels
    moving is not the same as a design visibly changing. The table shortlists;
    the eye decides. Both halves were needed and neither was sufficient.

170. The landing page answered "how does it work" before it answered "why
    would I". The clip goes above the drop zone, not below it.

    The order was hero → drop zone → How it works, so the page asked a stranger
    to hand over a folder while the only evidence was a headline. The hesitation
    is real and it happens in that gap. The clip now sits between the hero and
    the door, capped at 520px so the door still starts within the first screen
    of a 1280×900 window (measured: door top at 898). It plays muted and looped,
    and under `prefers-reduced-motion` it does not autoplay at all but hands
    over the controls, because CSS can suppress an animation and not a video.

    The section itself opened with `.cross`, the boundary drawing — a
    reassurance about safety, answering the fear before the value. It now comes
    after the steps. And every one of those four steps described the MECHANISM:
    bring, see, turn, export. That is what the TOOL does, and a stranger who has
    not yet decided is asking a different question, so they read as outcomes
    now, ending on "Keep it, or bin it. Bin it by closing the tab" — the
    risk-reversal, and true.

    The lead is the promise, which the page did not previously make anywhere:
    what would your app look like in another brand colour, at a bigger type
    scale, in dark mode, and you can find out in about a minute.

    The hero paragraph lost a sentence in the process. With a clip under it
    showing what the knobs reach and what comes out, narrating the picture cost
    a line of the first screen for nothing.

    Every marketing image was regenerated. They were all made on 22 August and
    carried "MIT, free forever" baked into their footers — copy #168 removed six
    days later — so the pictures were contradicting the page they sat on. The
    OG image now shows the hero over a real build rather than an empty drop
    zone, which is a better picture anyway.

171. The clip moved back down, and got bigger. The drop zone is the focus.

    #170 put it between the hero and the door, which pushed the door to 898px
    on a 1280×900 window — technically inside the first screen, and still the
    wrong trade. The drop zone is what the page is FOR. The clip now sits where
    the static screenshot was, below the steps, and the door is back at 558px.

    The still it replaced was a picture of the same thing, and a still cannot
    show a knob being turned, which is the only part that is hard to believe in
    prose. So the still goes; there is no reason to carry both.

    It breaks OUT of the 760px reading column — `flex: none` plus `align-self:
    center`, capped at `min(1080px, 92vw)` so a narrow window never scrolls
    sideways. At column width the app inside it is a thumbnail, which defeats
    the point of showing an app at all.

    Two things had to follow from making it large:

    - It is encoded at 1920×1080 now, not the 720 the viewport was. Upscaling a
      1280 source to 1080 CSS px on a 2x screen is soft, and this clip is mostly
      small UI type, which is where softness shows first.
    - The SITE's cut starts after the door scene. The clip opens on the
      UISandbox landing page, and on the landing page that means showing a
      visitor the screen they are already looking at. `launch-clip.mjs` records
      the door's frame count and encodes `public/how-it-works.mp4` from the
      frame after it, so the trim is the real number rather than a guess. Off
      the site — on X, in the README — the door is useful context and stays.

    The hero paragraph got its last sentence back. It was cut in #170 because a
    clip sat directly underneath narrating it, and that clip is no longer there.

172. `scripts/live-check.mjs`: the deployed site held to what the repo says,
    and three of its own bugs found on the first run.

    24 checks — headers (HSTS, nosniff, sw.js uncached), the assets the new
    page needs and their sizes, the rendered DOM (the clip is there and wide,
    the still is gone, the door is above the fold, no sideways scroll, the
    headings are the current ones, no retired copy on screen), the clip
    actually decoding, a real build carried end to end, and one knob turned on
    it. `node scripts/live-check.mjs [url]`, non-zero on any failure.

    All three faults were in the CHECK, and all three had the same shape: a
    probe that could not tell "it did not work" from "I did not run it".

    a. It counted elements whose computed colour EQUALS the pick. The mapping
       is a delta from their brand, so only a value that started at the centre
       lands on it exactly. Zero was the right answer to the wrong question.

    b. It drove the app through `window.__us`, which is a dev hook and does not
       exist in the production bundle. `if (u) u.dispatch(...)` did nothing,
       silently, and the nothing was reported as a knob that fails to reach the
       screen. It drives the real UI now, and asserts the click and the pick as
       their own two checks before believing the result.

    c. Its probe build was `edwardtufte/tufte-css`, whose brand family holds
       exactly ONE value and does not paint it on the first screen. The stage
       foot said "1 value moved": the knob worked and the check called it
       broken. It now loads the site's own admin-dashboard sample, which also
       exercises the sample route a visitor clicks and does not depend on
       GitHub being up.

    Live run after the deploy: 24 of 24, uisandbox.org.

173. The repo moved to `Ideelab/uisandbox`, and the credit with it.
    (The MCP namespace held back here was renamed a few minutes later — #175.)

    Every link, slug and remote now points at the organisation:
    `github.com/Ideelab/uisandbox`, the plugin marketplace slug in the README,
    the install line and the skill, the Star button's `REPO`, the issue and
    discussion links, the worker's user agent, `llms.txt`. The footer reads
    "Alexander Kaan at Ideelab" against ideelab.nl, and the copyright with it.
    The bare `github.com/AlexanderKaan` profile links stayed: those point at the
    PERSON, which is the whole point of #168's first-person note.

    Two identifiers were deliberately NOT renamed:
    `mcp/server.json`'s `name` and `mcp/package.json`'s `mcpName`, both
    `io.github.AlexanderKaan/uisandbox`. That is a PUBLISHED registry
    identifier sitting in other people's configs, and the namespace is
    authenticated against a GitHub account rather than a repository path.
    Renaming it does not move the entry, it creates a second one and orphans
    the first. `server.json`'s `repository.url` was left alongside it for the
    same reason: it is the input to `mcp-publisher`, and whether the registry
    cross-checks the repo owner against the namespace is not something to find
    out by breaking a publish the day before launch. npm's own metadata
    (`repository`, `bugs`) did move — GitHub redirects the old path anyway.

174. `public/llms-full.txt` had drifted, in the one file written for a machine
    to read and repeat back.

    It was a hand-kept copy of the README, and three days after the copy pass it
    still carried "Honest by construction", "1:1 is measured, not felt" and
    "free forever". One source, no mirror — and this was a mirror nobody looked
    at, which is the kind that rots quietly.

    `scripts/llms.mjs` assembles it now: `public/llms-preamble.md` (the agent-
    facing part, which is genuinely its own text) plus the README from its first
    `##`, skipping the badges and centred HTML that are markup for GitHub rather
    than prose for a reader. The preamble's own "How honesty is enforced" became
    "How to check it", the same correction #168 made everywhere else.

175. The MCP namespace moved too, and #173 was right about the rule and wrong
    about the moment.

    #173 left `io.github.AlexanderKaan/uisandbox` alone on the grounds that a
    published identifier sitting in other people's configs should not be
    renamed. That rule is sound. What it skipped was measuring how much was
    actually out there before applying it:

      npm uisandbox-mcp   5 versions, first published 10 days ago
      MCP registry        4 entries, 0.1.0 through 0.3.2
      stars               5, all of them friends of the author

    And the npm package NAME does not change — `uisandbox-mcp` is what people
    type, and `mcpName` is a field inside it. The blast radius today is four
    registry rows nobody has found yet. In three months it is other people's
    configs, blog posts and whatever the registry search has ranked, and by
    then it genuinely cannot move.

    So: `io.github.Ideelab/uisandbox` at 0.3.3, with `server.json`'s name,
    `server.json`'s `repository.url`, its own version, its `packages[0].version`
    and `package.json`'s `version` and `mcpName` all lined up — the registry
    rejects a manifest whose package version disagrees with npm's.

    The rule to keep is not "never rename a published identifier". It is
    "rename it while it is cheap, and know the number before you decide which
    that is."

176. The registry publish failed on a limit that had already been fixed once.

    npm went out as 0.3.3, the GitHub auth for the new `io.github.Ideelab`
    namespace passed cleanly — the thing I said I was unsure about was fine —
    and then:

        422 validation failed · body.description · expected length <= 100

    108 characters. `git log -L` on that one field tells the whole story:

        800bb00  server.json: description within the registry's 100 characters
        933b4b7  Play with your app's design in a safe sandbox
        7c6d73f  Play with your app's design. Right in the browser.

    Fixed deliberately in a commit that says so in its subject, then broken
    twice by headline passes that rewrote the description to match the new
    hero and had no reason to know a limit existed. That is not a lapse anyone
    will remember not to repeat, so a shorter string is not the fix.

    `src/__tests__/mcpManifest.test.ts` holds four things the registry checks
    and the suite otherwise cannot see: the description length, that
    `server.json`'s version and `packages[0].version` match npm's (the registry
    verifies the named npm version exists), that the namespace is spelled the
    same in both files, and that the repository URL is the one the code lives
    in. A publish is the worst moment to learn any of them, because npm has
    already gone out and cannot be recalled.

    Description now 90 characters: "Play with your app's design in the browser:
    load a build, turn the knobs, export the code." No npm republish needed —
    the description the registry validates lives in `server.json` alone.

177. Publishing under an ORG namespace is a different problem from publishing
    under a personal one, and the error message points at the wrong fix.

    After the description was under 100, `mcp-publisher publish` returned:

        403 · You have permission to publish: io.github.AlexanderKaan/*
             Attempting to publish: io.github.Ideelab/uisandbox
             ... you may need to make your organization membership public

    That suggestion is GitHub's, and it is wrong for this registry. I relayed
    it without checking, the membership was made public, and nothing changed.
    The registry's own source says what it actually does:

        // Org namespaces are only granted to org Owners (membership role
        // "admin"), not to ordinary members.
        GET /user/memberships/orgs?state=active   → role == "admin"

    Visibility is never read. Two things can make that call come back without
    the org, and they look identical from outside:

      - you are a Member rather than an Owner, or
      - the token cannot see the org at all, in which case GitHub answers 403
        and the registry DEGRADES GRACEFULLY to "no admin orgs" — deliberately,
        so a minimal personal token still works.

    It was the second. Ideelab has "Third-party application access policy:
    Access restricted", and the registry authenticates as a GitHub App
    (`Iv23liUydBbI7Z2Q9bOZ` — the `Iv23li` prefix is the tell), which had never
    been granted access. "No pending requests" on that settings page was the
    evidence: the device flow never asks.

    The way through, and the one that touches no organisation setting:
    `mcp-publisher login github --token=<classic PAT with read:org>`. The docs
    mention it in one line as how GitHub Actions authenticates.

    `io.github.Ideelab/uisandbox` 0.3.3 is live and latest. The four entries
    under the personal namespace are to be deprecated, not deleted, so anyone
    holding the old name is told where it went.

178. The UIcockpit merge, phase 2a: a build on one of the nine kits exports a
    design system in that kit's own names, and a build's own variables win.

    The brief is MERGE-INTO-UISANDBOX.md in Ideelab/uicockpit at 37ed9bc:
    UISandbox is the host and the name, and the engine moves in as modules.
    It came across byte for byte into src/kits/engine/ (103 tests, 103 pass,
    the same count as in dsg/), with its own types beside it.

    Four things were decided on the way, and each is the kind that gets paid
    for twice if it is not written down.

    a. WHICH KIT. detectKit is live.js's detect(), lifted out unchanged. Its
       gate is eighteen real builds, and the expectations were first written
       from the repo name: four disagreed, and in all four the detector was
       right about the PAGE. SB Admin 2 is Bootstrap 4 against a 5.3.8 kit;
       twcdn is Tailwind v3 against a 4.3.3 kit. Calling those Bootstrap or
       Tailwind would ship an export in names the build never reads, so `null`
       is the safe answer, and the question the gate asks is "which kit's
       vocabulary can this rendered page be addressed in". No false positives.

    b. NO KIT, NO SKILL. Ten of the eighteen came back null, so this is the
       common case. A SKILL.md's whole worth is that every class it cites is
       one the kit publishes and fidelity.mjs can check; without a kit there is
       nothing to cite. Such a build keeps the measured DESIGN.md and tokens,
       and is told in one line why no skill comes with it. A skill written
       against THEIR OWN classes is possible and in the doctrine's spirit, but
       it is new design, not a port, and phase 2 is adopting.

    c. WHERE A ROLE'S VALUE COMES FROM. First from what is painted most, which
       wrote a success colour of #6a9955 for AdminLTE — 172 inline colours from
       the syntax highlighting in its docs pages, against a --bs-success of
       #198754 — and a border of #90a4ae against --bs-border-color #dee2e6.
       For a recognised kit the authoritative value is the kit's OWN variable
       as the page computes it (roles.mjs MAP): it is what the kit's
       components read, and the sandbox has tokenised it, so it follows every
       turned knob. Measured values only fill the roles a kit has no variable
       for. No status colours from family centres: a centre is the most-used
       member, which is how the syntax-highlight green got in.

    d. WHICH PROMISE WINS. The engine was built for a door with no build behind
       it: one colour, and it derives the rest. Fed a real build, its formulas
       disagreed with a third of what the build has — 11 of 35 variables on
       AdminLTE, 13 of 37 on the Bootstrap docs, 15 of 46 on Mantine — so the
       "faithful" export applied to the untouched build would have moved a
       third of it, under a dialog titled "Export: exactly what is in the
       sandbox". Decided: a build's own variables win, and derivation fills
       only what no build defines. src/kits/pin.ts pins every light-block
       declaration the page also sets to what the page computes. That holds for
       both doors: the kit door has no build, so there derivation is everything.

    What the export carries now, for a kit build: theme.css, install.md,
    MANIFEST.md (with the list of what the kit never reads, as uicockpit.com
    ships it, rather than "Nothing"), DESIGN.md opening with where its values
    came from, tokens.json, and .claude/skills/<slug>/SKILL.md. Not the
    engine's whole AGENTS.md, CLAUDE.md and .cursor/rules: on unzip they would
    overwrite somebody's build and test instructions, so the block stays.

    scripts/kit-export.mjs is the gate, and it downloads the real zip through
    the real button, because unit tests caught neither fault it found. 38 of
    38, including: an untouched build exports a no-op theme, and after turning
    the brand theme.css is still the screen and the brand reached it.

    Open, and said so in the files:
    - The DARK block is still derived. The build's own dark values exist only
      while its dark switch is on, and reading them means switching the frame.
    - On AdminLTE the screen takes 9.6 s to be read. A debounce ceiling was
      tried, did not move the number, and was taken out again. The likely
      cause is CDN fonts requested through /__ext/ that never complete, which
      would also mean its icons are missing in the sandbox. Not proven, and
      not this phase.
    - MANIFEST.md heads one section "What you set", which is slightly wrong for
      values read off a build. The engine stays byte-identical; phase 3.
    - The Export dialog does not close on Escape.

179. The kit door, phase 2b: a build we make for you.

    Each of the eight kits that render is turned into a build — the six
    screens as six pages, the kit's own classes and elements on them, its REAL
    compiled CSS beside them — and published at public/kits/<id>.zip. The door
    is a row under the samples, "Or start from a kit", its list derived from
    kits/*.json by the build so nobody maintains it by hand.

    Why a build rather than a mode of the stage: the door then gets the whole
    spine for nothing. The sandbox tokenises the kit's CSS like anyone's, so
    the knobs, Check 1:1, the reach meter, the export and the MCP work on it
    unchanged, and "×1 = as in your code" reads, correctly, as "as the kit
    ships it", because the code IS what the kit ships. UIcockpit needed sixty
    lines of `bootstrapLive` to make Bootstrap's compiled brand move; the
    tokeniser does that for every kit and every literal.

    Values: each kit built with ITS OWN published defaults (kitDefaults: read
    from the package, and it throws if a package stops publishing one), not
    UIcockpit's purple seed. UIcockpit bakes every kit with one shared seed
    because it swaps values live and a frame must not open teal and turn
    violet; the sandbox does not swap that way.

    What came across, and what did not:

    - the render layer and the build-time layer, byte-identical; 117 of 123
      tests, the same 117 passing on both sides. sweep.test tests UIcockpit's
      page, which does not move, so its invariants were rebuilt against what
      UISandbox renders instead. live.test comes with 2c.
    - fidelity.mjs runs from here unchanged: eight kits at 100%, 1271 classes
      and 28 Material elements, and every name SKILL.md cites is defined by the
      kit it is cited for.
    - the ROOT table, out of build-page.mjs, with every attribute's reason.

    Found on the way:

    a. A screen board is HIDDEN on the wall's strip and only shown in grid
       mode, scaled down by the wall's script. Each page here holds one screen
       and drops that script (UIcockpit's canvas: sideways wheel, drag-to-pan,
       Exposé), so it undoes the hiding — and the undo had to out-specify the
       rule, (1,2,1) over (1,2,0), addressed by data- attribute and path
       because .card and .col are also Bootstrap's and daisyUI's. Both are
       lessons from the merge brief, met again on the first page.

    b. Radix rendered as bare text, and CHECK 1:1 PASSED IT. Untouched and
       tokenised were exactly equally bare. Radix takes choices, not values:
       its accent, grey, radius and scaling are attributes on the theme root,
       which UIcockpit's page sets while it runs and a static build has to
       carry. Without data-radius and data-scaling every --radius-* and
       --space-* resolves to nothing. The fix is Radix's own <Theme> defaults
       — and three of the four are TYPED, the one place in the door that is:
       kits/radix.json publishes each choice's options and not its default,
       and Radix's own grey has no selector to read at all. They are read from
       choices[role].default first, so the day fetch-kits.mjs reads Radix's
       themePropDefs, the table stops being used.

       And a gate for exactly this: kit-export.mjs now holds that every kit
       build is ALIVE — its primary action has a fill and the size of a
       control. All eight pass, each wearing its own default brand: Bootstrap
       #0d6efd, Tailwind #4f39f6, daisyUI #422ad5, shadcn #171717, Material
       #6750a4, Radix #3e63dd, Mantine #228be6, Ant #1677ff. The first Radix
       build would have failed both checks.

    c. MANIFEST.md says a flat "Nothing" under "variables nothing reads" for
       Tailwind, daisyUI and shadcn. orphans.mjs measured nothing unread for
       them, but its own comment says that for the three that compile through
       Tailwind it cannot separate the theme's own declarations from the
       kit's reads, "and that is said out loud below" — and nothing below says
       it. An engine issue, live on uicockpit.com too. Not changed: the engine
       stays byte-identical and the change belongs in both copies.

    Gates over the door: 1:1 ok on all eight (holdouts.expect.json), detected
    as their own kit (kit-detect, 26 of 26), and through the export (kit-export,
    134 of 134: a SKILL.md each, a no-op theme each, alive each).

    Measured, not fixed — reach on the door says how much of each kit the
    knobs move: Radix 15% of type (it takes type as a scale CHOICE, which a
    length dial cannot turn), Material 51% of radii (shape lives in its
    shadow roots), shadcn 81% of radii.

180. The third way in, phase 2c: your RUNNING app, through one script line.

    public/live.js is UIcockpit's bridge, ported: it frames nothing itself, it
    answers the page that frames it. Built by scripts/live-build.mjs from
    src/kits/live.template.js with detect.mjs's rules inlined, so a dropped
    build and an app over postMessage are judged by one set of rules, and a
    test fails if the served file is ever behind either source.

    What it does here, and what it deliberately does not:

    - It says which kit the app runs on, and — asked by name — the values of
      that kit's own variables as the app computes them. The door then writes
      the app's design system in its kit's names, starting from the app's OWN
      values, pinned the same way as a dropped build (#178d): the theme is a
      no-op on the app it was read from, 37 of 37 on a Bootstrap app.
    - It does not turn knobs. An app on another origin cannot be tokenised —
      there is no stylesheet here to read — and the panel is built on the
      substitution table of a dropped build. Turning a live app is the
      one-screen layout's job (phase 3), and it will use the uicockpit:theme
      message live.js already takes. The door says so on the page.

    Security, each found by asking what a hostile page could do with it:

    - The app's values go to the asking origin only, never to '*'; only
      custom properties, only by name, at most 400. The first hello on load
      still goes to '*', as in UIcockpit: it carries the kit, the title and the
      address, which whoever framed the app already knows.
    - Allowed origins: https uisandbox.org (and www) and localhost. Refused,
      and tested: plain http of the domain, a look-alike suffix, a look-alike
      host, and uicockpit.com — the cutover moves that, not this.
    - The frame is sandboxed WITHOUT allow-top-navigation, so the app cannot
      navigate the sandbox away. It needs allow-scripts and allow-same-origin
      or its own login and API break, and with both, a frame on THIS origin
      could lift its own sandbox — so an address on UISandbox's own origin is
      refused before it is framed.
    - /live.js is served no-cache: an old copy does not know uicockpit:read.
      No CORP header is set anywhere, which is what lets another origin load
      it at all.

    Found on the way, in the earlier phases' work:

    The kit export shipped install.md telling Bootstrap users to compile
    _custom.scss, in a zip that did not contain it. Same for Ant Design's
    antd.theme.ts and shadcn's components.json. The export listed the five
    files it knew; generate() writes more for some kits. The package is now a
    RULE (kitPackage: every file the engine writes, minus the three whole
    agent files), and the gate holds that every file the engine writes ships
    and every file install.md names is there. The zip listing from 2a shows
    _custom.scss absent, so that check would have been red.

    scripts/live-bridge.mjs is the gate: three apps on their own origin — a
    Bootstrap app with the line, the same app without it, and a plain page on
    no kit with it — so that a door saying "runs on Bootstrap" to everything
    could not pass. 18 of 18: the silent one is reported as silent and not as
    "no kit", neither control offers a download, and the sandbox's own
    address is refused and never framed.

    Phase 2 is complete. What was found and left, all in the files:
    the dark block is derived (2a); AdminLTE's screen takes 9.6 s to read,
    likely CDN fonts through /__ext/ (2a); MANIFEST.md's "What you set"
    (2a); the Export dialog does not close on Escape (2a); Radix's door
    defaults are typed until fetch-kits reads themePropDefs (2b); the engine
    picks "sand" for Radix's grey because its default has no selector (2b);
    MANIFEST.md says a flat "Nothing" for the three Tailwind-compiled kits,
    which orphans.mjs says it cannot establish (2b, an engine issue).


181. Fonts named by a proxied CDN stylesheet now load: the sheet gets its own
    base back.

    A stylesheet resolves its relative url()s against its OWN address.
    proxyExternalStylesheets serves a CDN sheet from /__ext/?u=…, so that
    became its address, and url("fonts/bootstrap-icons.woff2") went to
    /__ext/fonts/bootstrap-icons.woff2. Every webfont, icon font and image a
    CDN sheet named failed on the tokenised side.

    Measured on AdminLTE (s13), against the page as its author ships it
    (the fixture served plainly, fonts straight from the CDN):

                                  before            after
      failed requests             4 (the .woff2/    0
                                  .woff of both)
      Bootstrap Icons             error             loaded
      Source Sans 3               error             loaded
      stage foot → coverage       9438 ms           1488 / 1436 ms

    The author's page loads both faces in both runs. Before, every navbar
    icon was a missing-glyph box and the page was in a fallback face. The
    9.6 s to read AdminLTE that #178 left open was this: the reach meter
    waited on four fonts that were never coming.

    Check 1:1 did not see it, and could not: its raw control loads the CDN
    sheet directly (so its fonts arrive), and a computed font-family says
    which face was ASKED for, not whether it arrived. Both frames read
    "Source Sans 3" while one of them drew it in a fallback. Noted as a blind
    spot of the meter, not fixed here.

    The fix (sw.js absolutise): before the page rewrites the sheet, every
    relative url() and @import is made absolute against the sheet's real
    URL. Fonts and images then come from the CDN exactly as on the author's
    site; nothing new is proxied. data:, blob:, #fragment and absolute
    references are left alone. src/sandbox/__tests__/swAbsolutise.test.ts
    lifts the function out of sw.js itself and holds those cases.

    Full gate after: 173 fixtures, ok 154, differs 4, timeout/error 0. The
    one row it calls a regression is flutter-meshsight's focus ring, which
    differs on the pre-merge code too; chroma, todomvc and docsify differ as
    in every earlier gate. Against the merge gate no row got worse.

182. Check 1:1 measures both frames without focus.

    flutter-meshsight differed on one element, its first <a>, on
    outline-color. Measured on the same build twice: in one run the raw frame
    had the focus ring (rgb(0, 95, 204), Chrome's own) and the tokenised one
    did not, in the next run the other way round. Only one frame on a page
    can hold focus, and this page focuses that link on load, so the ring was
    in whichever of the two loaded LAST. A race between two loads, not a
    difference between two stylesheets.

    compareDocuments now calls blurDeep on both documents before it reads a
    single property, so the second look after 900 ms gets it too. blurDeep
    follows the focused element through shadow roots and same-origin frames
    and blurs the deepest first.

    What this gives up, said plainly: :focus styles are no longer compared.
    They could not be compared before either: one of the two frames was
    always unfocused, so a pass on them was luck. A real outline-color
    difference still counts: verify.test.ts holds that a difference on the
    element that HAD focus is reported, with the expected values.

    meshsight after: ok in 3 of 3 runs (was differs in 2 of 2, in both
    directions).

    Full gate after: 173 fixtures, ok 153, differs 5, timeout/error 0, and
    meshsight off the regression list. Two rows flipped the other way, both
    flakes that predate this: visx (margin-left 0 ↔ 24 px on its first div,
    the direction flipping between runs) differs 1 in 4 runs WITHOUT the blur
    as well, and was already "differs" in full-gate.log; anime-docs has
    alternated ok/differs across the earlier gates (merge, triplet, s16b).

183. A grey can be the brand: shadcn/ui's is #171717.

    On the shadcn kit the Brand knob read "Vivid Red", and turning it moved
    the Remove button. The kit's `--primary` is #171717, and its primary
    button is black. brandDeclared skipped every grey (C < 0.05), so the
    brand-named colour that won was `.dark { --sidebar-primary }`, a blue
    painted nowhere on the light screen; the paint scan then took the only
    chromatic fill it saw, the destructive red. On the screen this would
    land every visitor on, the first thing the panel said was wrong.

    A hue window cannot find a grey brand (a grey has no hue to be near), so
    a grey is now admitted by NAME (mapping.ts greyBrandEntry): every site
    of that literal names the brand, none was dropped at the site cap, and
    "primary" means the brand, not a role (`--text-primary`, `--bg-primary`
    stay out). A grey that is also somebody's text stays a neutral: turning
    Brand must not recolour body copy.

    Measured, statically on all 159 zips (fixtures and kits), declared brand
    and brand-family size before and after: only the two shadcn builds
    change (#1447e6 → #171717). The first version also changed s16-coloris
    to its `--text-primary: #0f172a`; that is what the role rule is for. In
    the browser on the eight kits, a brand pick moves the primary button on
    shadcn (Publish to the pick; Remove stays red), Bootstrap, Mantine and
    Ant Design. baseline.test.ts holds shadcn, coloris and the body-text
    grey; the two shadcn cases fail on the old code.

    Seen and left, both Radix, both older than this: the kit build's Remove
    button is drawn in the accent, not in red, before any knob is turned
    (a wall-bindings question); and Radix's blue-tinted grey scale sits in
    the brand's hue window, so a brand pick moves 73 elements, its greys
    with it.

184. A kit is not your code: the panel, the notes and the export say so.

    A build from the kit door is ours, made from the kit's own package. The
    panel still said "Your app · knobs", every centre read "as in your
    code", Hue / Saturation / Contrast were offered (they exist to move
    somebody's CSS; MERGE-INTO-UISANDBOX.md drops them in kit mode), and the
    notes and the export dialog spoke of "your code".

    App now knows a kit-door load: a zip fetched from /kits/<id>.zip on this
    origin, and nothing else. A zip somebody names shadcn.zip and drops is
    still their code. With it: "shadcn/ui · knobs", "as the kit ships it"
    on every centre and state dot, Hue / Saturation / Contrast hidden unless
    a shared link turned one (a hidden turned knob would be worse), "What we
    read from shadcn/ui", and the export's "from the kit", "shadcn/ui as it
    ships" and a DESIGN.md overview that says the values start from the kit.
    One note became neutral for both cases ("rules inserted by JS").

    Checked in the browser on the shadcn kit and, as the control, on the
    Bootstrap docs sample, which reads exactly as before. Gates: vitest 439,
    node 145 + 117, kit gates 101 + 18, hold-outs on the nine kit fixtures
    ok. Left for phase 3: the export dialog still offers "Patch your own
    files" on a kit, where Design system + Skill belongs first.

185. A destructive Radix button is red: the kit build says so.

    On the Radix kit's first screen the Remove button was drawn in the
    theme's indigo, rgb(62, 99, 221), before any knob was turned; so were the
    "Refused" badge and the "Not sent" callout. Radix tones one element with
    data-accent-color, and the engine's binding fills it from the tone the
    person chose (wall-bindings.mjs rxAccent reads RX_TONE, which
    kit-builds.mjs sets from route().chosen, attr "tone"). At the kit door
    there is no person: kitDefaults gives Radix no danger colour, because
    Radix publishes none, so route() chose no tone, the attribute was left
    off, and the button wore the accent set on <html>.

    The engine is right for the generator, where a danger colour always
    exists; what was missing is the kit's own answer, so the fix is in
    kit-builds.mjs, next to RADIX_THEME: RADIX_TONES = { danger: 'red' },
    under whatever route() does choose. Read from Radix's own docs: their
    AlertDialog's destructive action is <Button color="red">. No engine file
    changed.

    Measured: the rebuilt zip differs from the old one in exactly three tags
    on index.html, each gaining data-accent-color="red" (button, badge,
    callout); kit.css and the other five pages are byte-identical. In the
    browser, before any knob: Remove rgb(229, 72, 77) (Radix red-9), Publish
    still rgb(62, 99, 221). src/kits/__tests__/radixKit.test.ts reads the
    shipped zip; its danger case fails on the old one, and its control holds
    that no brand piece carries an accent of its own (the Brand knob needs
    them on the root's).

    Left on purpose: success and warning ("Granted", "Waiting", the "Saved"
    and "Check this" callouts) still wear the accent, for the same reason.
    No Radix page gives either a colour (their Callout docs show blue, green
    and red with the same text and no meaning), so a pick would be ours. It
    is Alexander's call; the table is the one place to add it.

186. Radix's translucent greys are greys: a brand pick leaves them alone.

    Turning Brand on the Radix kit moved the greys with the buttons: icon
    buttons, tab labels, code labels, the select, the menu. Radix writes its
    grey scale as a dark navy at low alpha (`--slate-a3: #0000330f`). The
    base colour has chroma 0.10 at hue 264, inside an indigo brand's hue
    window (267), so familiesOf put it in the brand family. Over the page it
    paints #f0f0f3, the grey of the solid `--slate-3`, which was a neutral
    all along.

    Decided by measurement: what a translucent colour adds over white is
    about its chroma times its alpha. For every light-mode slate step that is
    0.002 to 0.025, under the neutral line (0.035), as for the solid twin.
    But measurement alone moved too much. The first version (translucent,
    dark base, chroma times alpha under the line) also moved four other
    builds' brand families (s12-element-plus 109 to 105 entries,
    s12-vue-element-admin 59 to 56, s16-iro 10 to 9, s6-bootswatch 365 to
    351), and some family on fifteen non-Radix zips in all: dark shadows that are tinted on
    purpose (Bootswatch tints `.alert-primary`'s shadow to its brand). So the
    rule (mapping.ts translucentGrey) needs both: it paints grey over white,
    AND every site names it a step of a grey scale (`--slate-a3`,
    `--gray-a5`, `--mauve-a8`; Radix's six greys and Tailwind's five). A
    translucent ACCENT step keeps the brand: `--indigo-a3: #0047f112` adds
    0.018 over white too, but it is the soft button's background and must
    follow the knob, and it is not named a grey.

    Measured statically on 181 zips (173 fixtures, 8 kits), declared brand,
    brand-family size and every family's tally, before and after: only
    radix.zip and its fixture copy change. Brand family at the static brand
    (#0090ff) 192 to 180 entries; at the rendered one (#3e63dd) 204 to 185;
    no grey-named entry is left in it. Every other zip is identical in every
    family. In the browser, Brand to Rose: 18 of 220 elements change colour
    (Publish rgb(244, 63, 94), Preview, Later, the brand badges, switch,
    slider, progress, and the two callouts that wear the accent, see #185);
    Remove stays red, the icon buttons, tabs and code labels stay grey. The
    control, same script on the old mapping.ts: 84 of 220. The app's own
    counter reads 185 values moved, as the static count. mapping.test.ts
    holds the slate and indigo steps, a rose pick on them, the tinted shadow
    and a shared literal; the first two fail on the old code.

    Seen and left, in the engine (src/kits/engine/wall-bindings.mjs, which
    must stay byte-identical to uicockpit dsg/ at 37ed9bc): the two <hr>
    separators still follow a brand pick. Radix's Separator defaults to
    color="gray" (their API table); the binding writes
    `divider: () => <hr class="rt-reset rt-Separator rt-r-size-4">` with no
    data-accent-color, so it wears the root's accent. Proposed change, for
    both copies: add ` data-accent-color="gray"` to that <hr>, then
    `pnpm kits:build radix`.

187. A Radix separator is gray, as theirs is: the first change carried to both engines.

    The proposal at the end of #186, approved by Alexander. Radix Themes'
    Separator defaults to color="gray"; the binding's divider was a bare
    <hr class="rt-Separator">, so it wore the theme's accent and followed a
    brand pick. Now `data-accent-color="gray"`, with a comment saying why.

    The same edit in both copies of wall-bindings.mjs: here, and in
    Ideelab/uicockpit dsg/ as 8ddeb0b on branch radix-separator-gray (not
    pushed, not on main). SOURCE.md now lists it and drifts against 8ddeb0b:
    45 shared files, 0 differ. uicockpit's own tests: 123 of 123 pass. A third
    copy lives in UIDraw/engine/ and was left as it is.

    Measured: the rebuilt radix.zip differs from #185's in four <hr> tags
    (index 2, settings 1, work 1) and nothing else; kit.css is identical. In
    the browser, Brand to Rose: both separators stay rgba(0, 0, 47, 0.15)
    (`--slate-a6`); 16 of 220 elements change (18 before, the two <hr>). The
    one icon button in the list is a hover, gray-a3 to gray-a4, with the
    pointer left on it by the flyout. radixKit.test.ts holds the separators
    gray and fails on #185's zip. Gates: vitest 446, node 145 + 117, kit gates
    26/26 · 101 · 18, hold-outs on the kit fixtures 9 of 9 ok.

188. One copy of the engine: UISandbox's. UIcockpit is frozen at 37ed9bc.

    Until now an engine change had to be carried to both copies, byte for
    byte (SOURCE.md). The first one that came up, the Radix divider (#187),
    was committed in uicockpit on a branch and never reached its main.
    Carrying it further means keeping a mirror of a site that becomes a 301
    at the cutover, which is work thrown away and a second place for a
    change to go missing.

    So, Alexander's call delegated and taken: src/kits/engine/ is the only
    source from here. Ideelab/uicockpit dsg/ stays at 37ed9bc, uicockpit.com
    serves that until phase 4, and nothing is carried back. The unpushed
    branch radix-separator-gray (8ddeb0b) in the uicockpit checkout is
    deleted and that checkout is back on main at 37ed9bc; the same change is
    here as 01e8380. SOURCE.md now lists every engine file that differs from
    37ed9bc with its decision, so `cmp` against the frozen copy stays a
    check rather than a chore.

189. Merge phase 3, step 1: the homepage is the editor, on shadcn/ui.

    Until now a visitor met a hero, a paragraph and a drop zone, and could
    turn nothing before handing over a build. Now `/` loads the shadcn/ui
    kit build (measured cold: screen 0.8 s, knobs 1.7 s) and opens the
    editor on it. `?load=` and `?sync=` work as before: a load parameter
    replaces the default, so the gates, the MCP server and every shared
    link are unchanged.

    - The stage has tabs on a kit: Components (the kit's sheet, its
      index page), Screens (the other five, with the picker) and Your app,
      whose empty state is the door: zip, folder, repo, running app,
      samples, kits. The door sits OVER the kit, which stays rendered
      (visibility, not display: a display:none frame has no boxes and the
      reach meter would read zero), so the knobs and the export keep working
      while a visitor decides. A failed load falls back to the door with
      the reason, as before.
    - Their own app opens on its own screen with the notes, as before;
      Close goes back to the kit, not to an empty page. A kit has no Close.
    - One line on top of a kit carries the page's h1 and says what this is:
      the kit as it ships, turn a knob, then try it on your own app.
    - The story moves to /about, unchanged in substance (how it works,
      Inspect, how to check it, privacy, agents, who made it), with its
      own title and canonical, and a sitemap entry. The beats line now reads
      "Start from a kit or your own app, turn the knobs, export the code".
    - index.html's pre-mount block is the editor's skeleton with the same
      h1 and a description, for a crawler and for a visitor without JS, so
      the swap on mount does not flash a hero that is no longer there.

    The bridge gate opened the door on `/`; it now opens `/?tab=app`. Gates:
    vitest 446; kit gates 101 + 18; hold-outs kit-shadcn, AdminLTE, SB Admin
    and the six edge fixtures as before (three ok, three refused with their
    reason). Next in this phase: the top bar (Engine, Look, Light/Dark,
    Share), the export on a kit, the phone layout.

190. Merge phase 3, step 2: Engine, Light / Dark and Share in the top bar.

    - Engine: the eight kits that render, as a plain select (it is the one
      control a phone and a screen reader both already understand). On a
      kit it switches kits; on your own app it says what the page runs on,
      as the detector read it ("Your app · runs on Bootstrap", or "none of
      the nine"), and picking a kit asks first, because your app was only in
      this tab.
    - Light / Dark: the page's OWN scheme, the same switch as the Dark mode
      knob, shown only when the CSS has a scheme to switch. Measured on the
      shadcn kit: html gets `.dark`, the body goes from rgb(255,255,255) to
      rgb(10,10,10).
    - Share: a link that opens the same build with the same knobs. Every
      project now remembers what `?load=` needs to open it again (the kit,
      a zip URL, the repo URL behind the proxy route); a build dropped from
      somebody's machine has no address, and the button says so instead of
      copying a link to something else. The knobs were already the URL
      hash, but a load reset them; a shared link's hash is now read before
      the first load and applied once it is in.
      Measured, with a control: knobs turned (brand #e11d48, radius ×2), the
      link opened in a fresh browser, computed background, colour, radius
      and font of every element compared. Default kit 0 of 240 differ,
      Bootstrap kit 0 of 217, the SB Admin sample 0 of 360. The same link
      without its hash: 69, 64 and 80 differ, so the comparison can see a
      difference when there is one.

    Look (the kits' start cards as presets on another kit's components)
    follows separately: it rests on converting each kit's radius into the
    radius dial's multiplier, and that wants its own measurement.

191. Merge phase 3, step 3: a kit exports a design system, and the manifest
     says only what was measured.

    - The export on a kit leads with Design system + Skill, and the button in
      the dialog's head downloads exactly that zip (theme.css, DESIGN.md,
      SKILL.md under .claude/skills/<slug>/, tokens.json, install.md,
      MANIFEST.md, and the kit's own extras such as components.json).
      "Patch your own files", "The raw sheet" and the "files changed" count
      are gone on a kit: what was tokenised is our build, not anybody's
      files. On a build of yours nothing changed; where a kit is detected
      the first card is called Design system + Skill there too.
    - The Export dialog closes on Escape (open since 178).
    - MANIFEST.md (generate.mjs, ours alone since 188): "What you set"
      became "The values", true whether they were chosen or read off a
      build. Under "Variables in here that nothing reads", Tailwind, daisyUI
      and shadcn no longer get a flat "Nothing": the measurement cannot tell
      the theme's own declarations apart from the kit's reads for a kit that
      compiles through Tailwind, so an empty list there is "none found, and
      that is not a proof" (open since 179c). generate.test.mjs holds both
      cases; the kit-export gate expects the new line for exactly those
      three and "Nothing" for the rest.

    Measured in a browser: on the shadcn kit the cards are Design system +
    Skill, Tailwind or shadcn, A fresh token system, Native apps; the head
    button's zip holds the seven files above; Escape closes the dialog. On
    the SB Admin sample: the six cards and "Everything (.zip)", as before.
    Gates: vitest 446, node 145 + 117, kit gates 101 + 18.

192. Merge phase 3, step 4: the phone.

    Below 820px the stage is on top and the knobs are a bottom sheet:
    closed, one full-width bar that says "Knobs"; open, the lower 62% of
    the screen (at most 560px), scrolling on its own, so the screen being
    turned stays in view above it. The footer yields the room there (it is
    on /about). Below 600px the width buttons and Open go: a phone has one
    width.

    The top bar narrows by losing words, never controls: below 1180px the
    labels of How it works, Share and Read go and their icons and titles
    stay; below 820px the project name and the "Engine" label; below 560px
    How it works moves into the intro line and Light / Dark is left to the
    Dark mode knob in the sheet; below 420px the mark stands for the name.
    Measured: the top bar's scroll width equals the viewport at 360, 390,
    768, 1024 and 1280 (it was 812 in 661 and 551 in 390).

    Paid for once more, as the merge brief warned: `.seg { display:
    inline-flex }` loads after the media rule and beat `display: none`; the
    rule now carries the group's class.

    Seen and left: the kits' own components sheet is wider than a phone
    (the button row of shadcn's runs off a 360px frame). That is the kit
    build's layout (scenes.mjs), not the editor's, and it scrolls inside its
    frame. A follow-up, with the kit builds.

193. What you turned on a kit comes with you to your own app, measured.

    Phase 3's open question (roadmap): does a knob turned on the kit mean
    anything on the app you bring after it? The knobs were built for it: a
    colour or a font is an absolute pick, a dial is a multiplier centred on
    ×1 = as your code has it. So only what was turned travels
    (state/carry.ts), and every knob left alone starts where the new build's
    own code puts it. The door says which ones come along, and "What we
    read" says which ones came.

    The measurement: brand #e11d48 and radius ×2 on the shadcn kit, then a
    build brought through the door (route A), against the same build loaded
    fresh with the same two knobs turned by hand (route B). Computed
    background, colour and radius of every element compared. The control is
    the fresh build untouched against B.

                          A vs B          control
      SB Admin            0 of 360        80
      Bootstrap docs      0 of 1191       220
      VitePress           0 of 195        33

    Two wrong turns on the way, both caught by that table:
    - VitePress first differed on 2 elements: a build's baseline is
      corrected from its RENDERED page (the declared #5468ff, painted
      #5672cd), and that correction only runs while every knob stands at
      the baseline. Letting it run under the carried knobs was worse (it
      read the moved page and took #e11d48 as the brand, 33 = the control).
      The carried knobs now wait for the first render and land after the
      correction, as a hand would.
    - Radius did not travel: `radius` is both a top-level key (the radius
      style) and a dial (the multiplier), and the first version wrote the
      style. Dials are namespaced `sb.<key>` in carry.ts now, with a test
      that keeps the two apart.

    The knob names the panel uses moved from ExportDialog into carry.ts
    (KNOB_LABEL), so the export's "Settings" list, the door and the note
    name a knob the same way.

194. Look: another kit's own start values on what the stage shows.

    The brief's Look dropdown. A look is a kit's start card, the values its
    package ships out of the box as the engine's kit-defaults.mjs reads
    them, never typed: brand, background, the status colours, the body font
    and the corner radius. scripts/kit-looks.mjs writes the eight into
    src/kits/looks.json (2 KB, where the kit data is 4 MB), and a test fails
    when that file is behind the kits.

    A look moves only what a knob can carry, through the knobs
    (kits/looks.ts applyLook), so undo, Reset, Share and Export treat it as
    any knob. The font is the first family in the kit's stack the font
    picker can load (Material's "Roboto Flex"), or left alone. The corners
    become a radius multiplier: the look's radius over the stage's own (its
    kit's start card on a kit, the build's most-used radius on yours). The
    select shows the look while the knobs stand where it put them, "Custom"
    once something was turned on top, "As it is" at the baseline.

    Measured in the frame, before and after:
    - Bootstrap on the shadcn kit: the primary button rgb(23,23,23) →
      rgb(13,110,253); the system stack stays. Corners: the base 10px →
      6px, and shadcn's button, which is that radius minus 2px, lands on
      4.8px, not Bootstrap's own 6px. A look scales the base the kit
      derives from; what a kit derives from it follows its own rule.
    - Material 3 on the Bootstrap kit: .btn-primary → rgb(103,80,164),
      corners 6px → 12px, the font "Roboto Flex", and loaded (document.fonts).
    - Ant Design on the Material kit, inside md-filled-button's shadow root:
      rgb(103,80,164) → rgb(22,119,255), Roboto Flex → system-ui; the button
      stays a pill, as Material's full-corner shape is by design.

    On a phone Look is left out of the top bar (Engine stays): presets are a
    desk-sized pleasure, and the bar is full at 390px.

195. The copy follows the flow: kit first, your app second.

    The page descriptions, the JSON-LD, /about's how it works and llms.txt
    still told the old story, "drop your build, turn the knobs". They now
    say what a visitor meets: the editor opens on shadcn/ui, so a knob turns
    before you bring anything; your own app comes in through the Your app
    tab and renders 1:1 (measured), and what you turned on the kit comes
    along (measured in 193); a Look applies another kit's start values; the
    export is a design system and a SKILL.md in the kit's own names when
    the app runs on one; Share reopens the same build with the same knobs.
    "Before you upload anything" was written once and taken out: nothing is
    uploaded, then or later. llms.txt also names the kit links
    (`?load=/kits/<id>.zip`) and `?tab=app` for agents, and the em-dashes it
    and /about still carried are gone. scripts/llms-preamble.md carries the
    same text (llms-full.txt is regenerated from it and the README).

    No voice profile exists for UISandbox; the register is the site's own
    and brand/marketing/copy.md's (the measurement first, the limit named
    before anyone asks). The README is phase 4's sweep and still tells the
    old story until then.

    Full gate after phase 3 (189–195): 173 fixtures, ok 153, differs 4
    (anime-docs, chroma, todomvc, docsify, the known flakes), timeout 1:
    kit-antd, at row 15, while the probes for 190 and 192 were loading the
    same dev server. Run alone afterwards it is ok 3 of 3, in 4 to 5 s. The
    load is the likely cause and not a proven one; the gate is the place to
    see it again. Against the gate before (182) nothing else got worse, and
    visx flipped back to ok.

196. No flash of the old landing page: the editor loads in its own shape.

    Reported: a click on the logo showed the old marketing page for a
    moment. Measured with a frame-by-frame log from the first paint: after
    index.html's skeleton, the DOOR (the intake card with its glow and the
    load stages) was on screen for 80 to 360 ms on every fresh load of `/`,
    and the logo was a full page load into exactly that. The door was what
    App rendered whenever no project was loaded yet.

    - While the first screen loads, App now paints the editor's skeleton
      (panel and stage outlines, the intro line, the footer) with the load
      stages small in the stage: the shape index.html paints before the
      script runs, edge for edge (topbar at 45/46px, intro at 81/82, panels
      from 98, compared on a production build). The door appears only when
      a load failed, with its reason, as before.
    - The logo and Close start over in place: the default kit is loaded
      into the page that is there, and the screen on show stays until the
      kit replaces it. On the untouched default kit the logo only resets
      the knobs and the tab.

    After, on a production preview: pre-mount skeleton → React skeleton →
    editor, no door; a logo click changes nothing on screen until the kit
    is in.

197. The door leads with the way where nothing leaves your machine.

    Alexander's experience from the soft launch: people do not dare to drop
    a zip or connect a repo, because they think their code will be taken.
    Loading a build here never sends it anywhere (138, and checkable), but
    "drop your code on a website" is what people hear. His proposal was to
    keep only "connect localhost". Measured against what that route can do
    today, it would cost too much: the script line (live.js) reads which
    kit a running app is on and writes its design system, but it turns no
    knob (the app is on another origin; there is no stylesheet here to
    tokenise) and it has nothing to say to an app on none of the nine.

    The route that is local AND does everything already exists:
    `npx uisandbox-mcp open` in the project finds the build, serves this
    sandbox from 127.0.0.1 and opens it; nothing reaches uisandbox.org at
    all. So the Your app tab now leads with that, open: "Run it on your
    machine", the command, one sentence on what it does. Folded under it:
    "Already running? Add one line" (the bridge) and "Or load a build here"
    (zip, folder, repo, samples; open by itself after a failed load, which
    says why first). The kit row stays only where no kit stands behind the
    door; behind a kit the Engine menu has them.

    The npm package served the pre-phase-3 app until rebuilt. Rebuilt and
    bumped to 0.4.0 (package.json, server.json, and the version the server
    reports, which still said 0.3.2). Checked from the built bundle: the
    MCP smoke test (load, set, export, verify 1:1 with 0 differences, open,
    screenshot) passes; `open fixtures/startbootstrap-sb-admin-2-master.zip`
    serves the new editor with the app as "Your app" (13 screens), Share
    says there is no address (a `/__archive/` source is the local server's
    and gone when it stops, so it is not offered as one), and `/` on the
    same local server opens the shadcn kit. npm publish is Alexander's.

    The bridge gate clicked "running app" in the old tab row; it opens the
    fold now, and its download and "offers no download" checks are scoped
    to the bridge door, because the fold's own text says "design system"
    and the first run clicked the fold instead of the download. 18 of 18.

    Published 0.4.0 (npm and the MCP registry, 2026-10-19), and two things
    that changed since 0.3.3, so the next release does not rediscover them:
    - npm now requires 2FA for every publish, and asks for it only in an
      interactive terminal: run `npm publish` in a Terminal tab, not as a
      `!` line in the chat (there it gets no prompt and answers 403/404).
    - The MCP registry grants io.github.Ideelab/* only to an org OWNER, read
      from GET /user/memberships/orgs, which needs read:org. The browser
      device login does not carry it and falls back to the personal
      namespace without saying why ("permission to publish:
      io.github.AlexanderKaan/*"). A public membership is not enough any
      more, and Ideelab's OAuth app policy is not involved. What works: a
      short-lived classic token with read:org and read:user from the owner
      account, `mcp-publisher login github -token`, then revoke it.

198. Send to your agent: the way back from the sandbox.

    The loop out (an agent builds, `load`s, `open`s the sandbox) existed;
    the way back did not. The user had to return to the chat and type
    "export what I changed". Now a sandbox opened by the local server has
    one primary button, labelled by where it goes (the server says so at
    GET /__session/<id>): **Send to your agent** when an agent opened it
    with `open`, **Send to the terminal** when `npx uisandbox-mcp open` did.
    On uisandbox.org there is nobody to send to, and no button.

    - Send POSTs the knobs to /__send/<id>. The new tool `wait_for_send`
      blocks until then (240 s by default, at most 1800) and returns what
      was turned, in the panel's own names and from → to, how many of the
      build's values moved, the patch for the source, and the next step
      (apply, rebuild, `load` + `verify`). When the time runs out first it
      says `stillOpen`, so the agent waits again or asks, and no MCP call
      hangs past a client's timeout. A send before anyone waits is kept and
      handed over once.
    - From the terminal the same is printed where the command runs.
      Nothing is written to disk.
    - The button is there only while the server's own app is on the stage:
      a kit picked in the Engine menu is not the server's project, and the
      knob sync now stops for it too (it would have posted the kit's knobs
      as the app's).
    - The preset name a Brand pick sets beside the colour (`colorTheme`) is
      bookkeeping, not a knob, and no longer appears in a list of what was
      turned (here, the door's carry line, the carried-over note).

    Measured end to end with an MCP client and a real browser on SB Admin:
    `wait_for_send` with 5 s before any Send says stillOpen (the control);
    Brand turned by hand, Send pressed while `wait_for_send` waits, the
    result arrives 46 ms later: Brand #4e73df → #0EA5E9, 23 of 470 values
    moved, a 46-line patch. From the CLI the terminal printed the same and
    the page said so. The MCP smoke test passes on the rebuilt bundle.
    Version 0.5.0 (a new tool); npm and the registry are Alexander's.

199. A footer in columns, and a page per kit.

    Alexander: the footer was a copyright bar carrying too much, "with ♥"
    reads as precious, and there should be pages people find. So:

    - The editor keeps one slim line (maker, year, licence, Kits, Source,
      Privacy and security): a tall footer there takes height the canvas
      needs. /about and the kit pages have the footer in columns: Product,
      Kits, Open source, and the maker line under it. Both read their links
      from one file, src/site/links.json; the heart is gone everywhere.
    - /kits/<id>/ for the eight kits that render, and /kits/ listing them:
      static HTML, so a search engine or a language model reads them
      without running the app. Every fact is read, not typed: the kit's own
      description, version, licence and package (kits/<id>.json), the
      number of variables in its light mode and whether it has a dark mode,
      its start values (looks.json), and the files its export ships, from
      the engine's own generate() (a file the page cannot describe is an
      error). Each page has a real screenshot of the kit in the editor
      (scripts/kit-shots.mjs), a button that opens it, and one that opens
      it on the Your app tab. The kits' descriptions use em-dashes; the
      pages turn them into colons, and a test holds that none get through.
    - scripts/kit-pages.mjs writes them, and public/site.css from
      chrome.css's @site block (the tokens) and src/styles/site.css, so
      the pages and the app share one stylesheet source. kitPages.test.ts
      fails when a page is behind its data. The dev server now serves a
      directory's index.html from public/ the way Cloudflare's assets do.
    - The sitemap lists /kits/ and the eight; llms.txt names them.

    Checked at 1280 light and dark and at 390: no horizontal overflow; the
    footer's headings first inherited the page's h2 and its sentence was
    dark on dark, so the page styles are scoped to <main> now.

200. The top bar says less, and each word means something.

    Alexander's read of the bar: the kit's name beside the mark doubled the
    Engine menu; "Look" and "Engine" were unclear; Light / Dark, Share and
    "Read" did not belong up there. Now the bar is the mark with "Design
    System Generator", How it works, Preset, Kit and Export:
    - "Engine" is **Kit** (the UI kit on the canvas) and "Look" is
      **Preset** (another kit's start values, "Bootstrap look"), words
      people know from tweakcn and shadcn.
    - Light / Dark sits with the canvas widths: it is a way of looking at
      the canvas, like Fit / 1280 / 820 / 390.
    - Share is **Copy link** in the Export dialog, beside the downloads.
    - "Read" is **What we read**, a chip in the honesty line under the
      canvas beside the reach meter and Check 1:1, where the merge brief
      put it.
    - "UISandbox Design System Generator" names the tool in both footers.

201. The baseline for "phenomenal" (nulmeting), on the live version.

    Measured in a worktree at e8fd83b (what uisandbox.org served), so
    nothing built meanwhile could move it. Five meters:

    1. 1:1, all 173 fixtures: ok 153, refused 1, no-load 14 (the refusals
       at the door, by design), differs 5: ng-bootstrap (one margin-left
       0 → 127px, the known layout flake), anime-docs, chroma, todomvc,
       docsify (known: random colours and angles, Polymer). Refused:
       mustache (0 of 2 elements paired: the two loads render too
       differently to compare). Timeout/error 0.
    2. Every knob does what it says (knob-render, 5 builds × 11 knobs):
       2 findings, both Open Props: border width ×3 and spacing ×1.5 move
       nothing although the screen paints 95 border widths and 277 spaces.
       The rest pass or are n/a with the reason (the sheet holds none, or
       the screen paints none).
    3. The export lands (export-sweep, 13 builds): 12 pass; AdminLTE fails
       on the INSTRUMENT, which looks for the card "Hand it to your agent"
       that 191 renamed to "Design system + Skill". The sweep needs the new
       name; the product is not shown wrong by this.
    4. Speed, load to verdict on the 153 ok builds: median 4.5 s, p90 17 s,
       slowest Bootswatch 106 s, ant-design site 82 s, antd-site-large 78 s.
       The performance ceiling (parked) is the one that matters here.
    5. First use: not measurable by a script; needs people.

    Seen by Alexander while turning (screenshots, 2026-10-19): on a kit,
    Shuffle turns Hue / Saturation / Contrast, so the dials hidden on a kit
    reappear; the door's "comes with it" line becomes a list of every knob
    and slides under the What we read card.

202. Live mode: a running dev server in the sandbox, in one command.

    Alexander, wanting to use it on his own work: pasting localhost:3000
    into the door and pressing Connect did nothing, because the bridge needs
    a script line in the app's head. It cannot be simpler from the website:
    a page on uisandbox.org may not read another origin's page, dev servers
    send it no CORS, and Chrome now asks before a site reaches localhost.
    The script line only ever told which kit the app is on; it turned no
    knob.

    So the line to run takes the address:

        npx uisandbox-mcp open http://localhost:3000

    and the local server puts the dev server under its OWN origin
    (127.0.0.1:<port>/__dev/…), the same origin as the sandbox, so the
    sandbox can do everything it does with a build. The page's HTML and the
    stylesheets it links are snapshotted to start; every other file is
    fetched live through /__dev/, stylesheets rewritten on the way like a
    CDN sheet, scripts and API calls passed through untouched (the worker
    hands any non-GET straight to the dev server). The dev server's
    websocket is passed through too, so hot reload keeps working, and a
    restyled <style> is tokenised again (the observer missed a <style>
    whose whole text was replaced, which is how Vite reloads CSS). The
    build refusal ("source, not a build") is skipped for a live project:
    that is what live mode is for. Agents get the same with
    `load({ devUrl })` → `open` → `wait_for_send`.

    Send now carries the PAGE's account (what was turned, how many values
    moved, the patch): the server only ever saw the snapshot, while the page
    saw every runtime and hot-reloaded style. A <style> from Vite names its
    source file (data-vite-dev-id), so the patch names the user's file.

    In the door, "Run it on your machine" has an address field that fills
    the command in; the script-line fold is now for an app deployed
    somewhere ("Deployed somewhere? Add one line").

    Measured on a Vite 8 + React dev app (CSS injected by JS, HMR on):
    1:1 with 12 elements and 0 differences; Radius ×2 moves the button
    8px → 16px; the brand edited in the app's own source while open shows
    up (hot reload) and Radius stays at 16px; Send to the terminal printed
    "Radius: 1 → 2 · 2 of 26 values moved" with the patch on
    src/index.css (8px → 16px, 12px → 24px); the agent route returned the
    same to a waiting `wait_for_send`. On a plain static server (Python,
    serving the SB Admin build): 339 values from 225 KB of CSS, 1:1 with
    353 elements and 0 differences. Not measured yet: Next.js, Nuxt,
    SvelteKit and dev servers behind a path or with their own auth.

203. Kit and Preset open the app's own menu, and menus move again.

    Alexander: we have our own design language and motion for dropdowns,
    and the bar used the system's. True: Kit and Preset were native
    <select>s, so macOS drew its own menu beside the app's. They are now a
    Dropdown in the app's menu language (.menu, .menu__item, the check on
    the current one), with arrows, Enter and Escape, closed by a click
    anywhere (a click in the canvas lands in its iframe and never reaches
    the page, so the window losing focus closes it too). Preset's rows say
    what each look sets in its own values (a swatch, "#0d6efd · system font
    · 6px corners"); Kit's rows give the version.

    The motion was broken, not just unused: the font picker's rows animate
    with `app-menu-item`, a keyframes rule that was never defined, so no
    menu moved. Defined now (a card that settles in, rows a beat apart),
    used by these two and the screen picker, and off under
    prefers-reduced-motion.

    Also from the baseline (201):
    - Shuffle on a kit leaves Hue, Saturation and Contrast alone; the panel
      hides them there, and they reappeared turned. A test holds it, with a
      build of yours as the control (there they still roll).
    - export-sweep looked for the card "Hand it to your agent" that 191
      renamed; it takes either name now. Reaching further, it found a real
      gap the old failure hid: on a build where a kit is detected, the
      engine's tokens.json writes colours and sizes as strings, not the W3C
      colour and dimension objects our own exporter writes, and its
      DESIGN.md has no components section and does not say it left one
      out (AdminLTE). Two token formats in one product: on the list.

204. Live mode on Next.js, and the dev server as the truth.

    Measured on a fresh Next.js 15 app (App Router, webpack, its own HMR),
    `npx uisandbox-mcp open http://localhost:5340`: it renders, 33 values
    from 12 KB of CSS, 1:1 with 68 elements and 0 differences. Two things
    broke and are fixed:

    - Hot reload did not arrive. Next swaps a <link> for the SAME URL with a
      new ?v=, and the sandbox, which matches files by path, answered from
      the snapshot. In live mode the dev server is now the truth and the
      snapshot only the start: every file is fetched fresh, and a page
      navigation fetches today's HTML through the same rewrite a read build
      gets (rewriteHtml for the sandbox, every byte but <link integrity>
      for the control), its new literals defined with their own value in
      the same answer. After: globals.css edited while open, the canvas
      background follows (#ffffff → #fef3c7), 1:1 still 0 differences.
    - The first version of that looped: the frame's URL carries our own
      ?__sb=, it went along to /__dev/, the worker read it as a sandbox
      request and asked the page again, /__dev/__dev/__dev/… The worker now
      never touches /__dev/, and ?__sb= is stripped before the dev server
      sees a query.

    Radius → None leaves Next's 128px buttons as they are: a pill radius is
    skipped by the tokeniser on purpose (skipPill), so round stays round.

    The two Open Props findings of the baseline (201) are not the knobs:
    the fixture is the Open Props docsite's SOURCE, whose size and border
    variables come in through `@import "open-props"`, which needs its
    build; at runtime --size-3 and --border-size-1 are empty, in the
    control too (1:1 is ok). The sheet holds 1 space and 2 border widths;
    the 277 and 95 "on screen" are the browser's own paddings and borders,
    which knob-render counts on purpose (its population only errs high).

    Not measured yet in live mode: Nuxt, SvelteKit, Astro, Angular, and a
    dev server behind a sub-path or its own login.

205. One token format: the engine's tokens.json in the W3C shapes.

    Found by the export sweep once it could reach the kit export (203): on a
    build where a kit is detected, tokens.json came from the engine, which
    wrote every value as a string and typed the fonts `dimension`, while our
    own exporter writes the shapes the W3C format defines. Now the engine
    writes them too: a colour is an sRGB object ({colorSpace, components,
    hex}, alpha when below 1), a length a {value, unit} in px or rem, a font
    a `fontFamily` list, a plain number a `number`. A value the format has
    no shape for (letter spacing in em needs a font size to become px) is
    left out and named in $description, never smuggled through as a string.
    generate.test.mjs holds the shapes; SOURCE.md lists the change.

    The sweep's second finding, "DESIGN.md: components neither present nor
    declared omitted", was the instrument: the engine's DESIGN.md HAS a
    components section (`components:` in its front matter, "## Components"),
    and the sweep only recognised our own exporter's way of declaring one
    left out. It accepts both now. AdminLTE: 0 findings.

206. The kits fit a phone, and two small things Alexander saw.

    The kit builds' screens ran off a phone: measured in a 364px frame, 35
    to 133 elements per screen past its edge (shadcn's button row, the
    overview's stat cards), scrolled sideways inside each board. The cause
    was one thing: every column's desktop width is written inline
    (style="width:1080px"), so nothing could fold. On glass a column now
    takes the board's width (scenes.mjs, ours since 188), and each kit's
    OWN responsive rules fold its rows and grids the way they do on any
    phone. Tried first by injecting the rule into the frames, then built:
    0 elements past the edge on 38 of 48 screens. What is left is the work
    screen's table (daisyUI and shadcn 49, Bootstrap 11, Radix 9), which
    scrolls sideways inside itself as a table does on a phone, and 1 or 2
    elements on three kits' overview. The kit builds and their fixtures
    were rebuilt; the kit hold-outs are ok 9 of 9.

    - The editor's footer line starts at the left and Star on GitHub sits
      at the right.
    - "Is this the built app?" has a Close; a closed warning stays closed
      until it says something else.
    - kit-antd timed out twice, both times while something else loaded the
      same server (probes, a first run straight after a deploy), and is ok
      on every run alone. Watched, not chased.

207. The kits against the kits: each kit's own docs page beside our canvas.

    Every gate so far asked whether a kit build is alive and whether every
    class on it is the kit's own. None asked whether it looks like the kit.
    So the same four components (primary and secondary button, text field,
    card) were measured on each kit's official docs page and on our canvas
    (the kit build in the editor's frame): fill, text colour, border, corner,
    font, size, weight, height, padding, shadow. A difference only counts
    once traced to its source; the docs sites dress themselves (Material's
    in gold and Google Sans, Ant Design's in AlibabaSans, a lime demo on
    Mantine's) and those are theirs, not the kit's.

    Radix: 4 of 4 identical. Three real defects, all ours:

    - The strip set a body font of its own. `#strip{font-family:...}`
      (scenes.mjs) was meant for Ant Design, the one kit that sets no global
      body font, but everything on the wall inherits from #strip before it
      reaches <body>, so Bootstrap's and Mantine's own body font never
      arrived. Control: set --bs-body-font-family to Georgia and the button
      stayed ui-sans-serif. Now the fallback sits on :where(html), where any
      kit rule on html or body wins: the same control turns Bootstrap's and
      Mantine's button to Georgia. Counted per text element, old build
      against new: Tailwind, daisyUI, shadcn, Ant Design and Material
      unchanged; Bootstrap (58), Mantine (55) and Radix (12 captions) move
      to their own font. Ant Design's captions keep the fallback, not Times.
    - daisyUI's corners were half of daisyUI's: 2px fields and 4px boxes
      where daisyUI ships 4px and 8px. kit-defaults read the radius from
      --radius-field and the build wrote it into --radius-box, which the
      field follows at half.
    - Ant Design's text was a shade lighter than Ant Design's: its ink was
      read from colorText (88% black, flattened to #1f1f1f) and written
      into colorTextBase, from which their algorithm takes 88% again
      (rgba(31,31,31,0.88)); its muted ink was read from the tertiary text
      and written into the secondary (#8c8c8c where theirs is 65% black).

    One meter moved with it: Radix's type reach went from 15% to 0%. The
    15% were our 12 captions in the strip's font, which the Body font knob
    did reach. Turned to Georgia through the editor, it reaches 12 of 81
    text elements on the old Radix build and 1 of 81 on the new: Radix's own
    text (its --default-font-family) never followed the knob, and the meter
    now says so instead of counting our captions. Bootstrap 61/79, Mantine
    59/77 and Ant Design 62/83 follow it as before. Why the knob misses
    Radix's family is open.

    Both are the same mistake, so the rule is now a test:
    kit-defaults.test.mjs holds that every default is read from the variable
    the build writes it into, with the exceptions named and why (Tailwind's
    own role names and the Tailwind Plus corner, Bootstrap's link colour,
    Material's derived roles, Ant Design's two white backgrounds). Control:
    with the old mapping it fails on exactly those three. After the rebuild
    the sweep shows 0 differences on font, corner and text colour for
    Bootstrap, daisyUI, Mantine and Ant Design. The daisyUI preset now says
    8px corners. Ant Design's secondary text is #595959, theirs rgba(0,0,0,
    0.65): the same on white, a flattened copy on grey.

    Open, for Alexander:

    - Material renders in SF Pro, not Roboto. Its typeface is "Roboto Flex,
      Roboto, Noto Sans, system-ui" (from @material/web's own labs sheet)
      and no font is loaded, so the browser paints .SF NS (asked through
      CDP). Material's own setup loads Roboto from Google Fonts. Bundling
      Roboto (OFL) in the kit zip would make it Material without a request
      leaving the tab.
    - shadcn/ui has moved on. shadcn 4.22.1's `init --defaults` takes the
      preset base-nova, and ui.shadcn.com renders it: buttons and fields
      32px high with 10px corners and no shadow, cards without a border,
      a black primary. Our kit is built from r/styles/new-york-v4: 36px,
      8px corners, shadow-xs. Still installable and faithful to itself,
      but not what someone starting today gets.

    The source scan's budget (performance, parked): reading at most 8M
    characters of source cut Bootswatch's derive from 103.7 s to 8.3 s and
    antd's site from 25.2 s to 3.1 s, but 2 of the 23 builds over 8M got a
    different baseline (element-plus: colour theme rose for cobalt;
    Bootswatch: indigo for rose and a different scale). A faster wrong
    start is not a fix, so it is not the default, and the unused option was
    taken back out.

208. Material in Roboto Flex, shadcn/ui as base-nova (Alexander's call on 207's
    two open points).

    Material carries its letter. The kit build loaded no font, so its
    typeface ("Roboto Flex, Roboto, Noto Sans, system-ui", from @material/web's
    own sheet) fell through to SF Pro on a Mac. Roboto Flex now travels in the
    zip as a file: the Latin weight axis from @fontsource-variable/roboto-flex
    5.3.0, 34 KB, OFL, with its licence. In the editor's frame it loads, and
    the Publish label measures 46.64px, which is Roboto Flex's width for that
    word and not the system font's (48.51px). No request leaves the tab for
    it: what the page fetched off localhost was the editor's own Inter and
    GitHub's star count.

    shadcn/ui is what `shadcn init --defaults` installs today. shadcn 4.22.1
    makes base-nova its default (Base UI primitives, the nova style, neutral,
    Lucide, Geist) and ui.shadcn.com renders it; the kit was new-york-v4. The
    data is re-read by scripts/kit-shadcn.mjs, and nothing in it is typed:

    - The theme from what init really writes. The script runs `shadcn init
      --base base --preset nova` in an empty Vite app and reads its @theme
      inline block back: Geist as --font-sans, and a radius scale that
      MULTIPLIES --radius (sm x0.6 to 4xl x2.6) where new-york subtracted
      pixels. The CLI builds that block in code, so running it is the only
      way to read it. The colours are the same as neutral.json's, all 32.
    - The components from what `shadcn add` writes into that project, not from
      the registry's JSON. The registry's source carries marker classes
      (cn-font-heading, cn-menu-target, cn-menu-translucent) that the CLI
      rewrites on the way in; read from the registry, fidelity counted three
      invented classes. Read from the installed files: 494 of 494 theirs.
    - registry-read.mjs came across from dsg/ (it had stayed behind with
      fetch-kits.mjs) and learnt Base UI: useRender's slots, parts drawn
      through a render prop, the element inside a slot (the radio's dot), and
      attributes read per element. Base UI writes className before data-slot
      as often as after it, and reading "the next className" had given the
      progress bar no track and the slider its Control's classes: both were
      missing on the wall until read per element.
    - The wall's markup uses Base UI's attributes (data-checked, data-open,
      data-active, data-orientation), and the build imports shadcn's own
      tailwind.css, whose variants map those attributes. Geist travels in the
      zip like Roboto Flex (@fontsource-variable/geist 5.3.0, 29 KB, OFL).
    - The export follows: components.json in the kit's style, the install line
      `npx shadcn@latest init --base base --preset nova` (`--preset base-nova`
      is refused by the CLI), shadcn/tailwind.css, html { @apply font-sans }.

    Measured on ui.shadcn.com's own previews against our canvas: default and
    outline button, input, checked switch, tabs, active tab and badge have the
    same height, corner, border, padding, size, weight and shadow. The badge
    was 32px corners against their 26px until init's radius scale went in.
    Left: the font is the same face under two names (their "Geist", the
    package's "Geist Variable"), a card with other content is another height,
    and a checkbox or radio inherits the text size of the page around it.

    One mistake of 207, found by this: the fallback letter on :where(html) was
    unlayered, and an unlayered rule beats every layer whatever its
    specificity, so it also beat Tailwind's preflight in @layer base. It hid
    Geist, and it had been setting Tailwind's and daisyUI's text in
    ui-sans-serif where Tailwind 4.3.3's own stack starts with -apple-system.
    The fallback now sits in a layer, us-fallback, which each kit page
    declares before its stylesheet, so it is the weakest of all: Tailwind,
    daisyUI and shadcn show their own letter (58, 58 and 59 text elements),
    Radix, Ant Design, Material, Bootstrap and Mantine are unchanged against
    207's builds. The Body font knob turned to Georgia reaches shadcn 59/80,
    Tailwind 58/79, daisyUI 58/78, Material 55/73, Bootstrap 61/79, Ant Design
    62/83; what stays is monospace.

    Gates: fidelity 100% on all eight, kit-export 101 and live-bridge 18
    checks with 0 failed, kit hold-outs ok 9 of 9, tests green. shadcn.zip
    318 KB, material.zip 509 KB.

209. Take this screen along: a bookmarklet for the app behind a login.

    An app that runs only where it is deployed, behind a login (an SPA whose
    env files are not on the machine), cannot be fetched by URL and cannot
    be started on localhost. Only the user's own logged-in browser sees it
    rendered, so the capture runs there. Built as a prototype, measured,
    then put first on the door (below).

    How it works. A bookmarklet (src/capture/grab.ts; the link is the
    function's own source, so it carries everything it needs) serialises the
    page as it stands: the DOM after render with scripts, handlers and
    javascript: URLs removed, open shadow roots as declarative templates with
    their adopted sheets, form values (never a password), canvases as PNG;
    every sheet (a <style> as its text, or its CSSOM when JS inserted rules
    the text does not hold; a <link> fetched from the page, its CSSOM when
    the fetch is refused, named when both are); every image, font, @import
    and background image fetched with the page's own cookies, so what sits
    behind the login comes along as bytes. It opens a tab named
    `uisandbox-capture` on uisandbox.org (`/?capture=1`) and posts it there,
    origin checked on both ends; a second click finds the same tab and adds a
    screen. The tab cleans the HTML again (src/capture/receive.ts), files
    each screen as `<path>/index.html` with the shared files under `_c/` by
    content, and builds the project through buildProject, exactly as a
    dropped build. Knobs turned on the first screens stay turned. Tab to tab:
    nothing goes to a server.

    Measured (scripts/.probe-capture-*, deleted; Chromium 151 headless with
    its popup blocker ON, viewport 1280×900). "Same as live" compares 17
    computed properties per element (colour, background, border, radius,
    font, line height, padding, margin, gap, shadow, display, width, height)
    between the live tab and the captured screen served untouched, at the
    same width, url() strings ignored. "Click to stage" runs from the click
    to the sandbox tab showing the project.

    | Screen | Stack | Taken | Read | Click to stage | Same as live | Check 1:1 | Reach | Brand → rose |
    |---|---|---|---|---|---|---|---|---|
    | test app `/` | SPA behind a login cookie, strict CSP | 50 KB, 7 files | 12–31 ms | 0.4–0.6 s | 32 of 32 | ok, 31 paired | 95% colours, 2 outside | 12 of 48 elements |
    | test app `/settings` | same tab, form half filled | 47 KB, 6 files | 6–9 ms | 0.3 s | 24 of 24 | ok, 21 paired | 100%, 1 outside | 5 of 37 |
    | todomvc.com React | React SPA | 11 KB, 2 files | 8 ms | 0.4 s | 58 of 59 | ok, 57 paired | 100 / 100 / 100% | 12 of 70 |
    | nextjs.org | Next.js, CSP with script-src | 1.2 MB, 25 files | 224 ms | 1.1 s | 737 of 739 | ok, 722 paired | 66% colours, 11 outside | 5 of 770 |
    | react.dev | Next.js / React | 2.2 MB, 87 files | 177–191 ms | 0.5 s | 1676 of 1753 | ok, 1708 paired | 100%, 49 outside | 183 of 1793 |
    | vuejs.org | Vue (VitePress) | 2.2 MB, 71 files | 1067 ms | 1.6 s | 674 of 674 | ok, 633 paired | 100%, 73 outside | 2 of 696 |

    What differs from live: TodoMVC's input has focus on the live page (a
    focus ring a snapshot cannot hold); nextjs.org's cookie banner text, 2
    elements at 14px instead of 16px; on react.dev one section of the
    article renders 210px taller and its ancestors grow with it (77 heights,
    48 widths, no colour or type). The handover itself is cheap: the files
    travel as Blobs (structured clone, no base64), 2.2 MB in 2 to 3 ms.
    The sandbox's own build of the project dominates "click to stage".
    The knob counts are what the brand family paints on that page; a home
    page that is mostly black and white (nextjs.org, vuejs.org) moves
    little, and that was not chased further.

    The test app: a page rendered by JavaScript after a cookie login, with
    `default-src 'none'; script-src 'self'; style-src 'self' 'nonce-…';
    connect-src 'self'; require-trusted-types-for 'script'`, a CSS-in-JS
    sheet with rules only in its CSSOM, a web component with an open shadow
    root and an adopted sheet, a canvas, a webfont, a logo and a background
    image that answer 403 without the cookie, and two stylesheets from
    another site, one with CORS and one without. All of it arrived. The CORS
    sheet came through its CSSOM (connect-src refused the fetch, the
    `crossorigin` attribute made the CSSOM readable); the other is named in
    the notes and loads from where it lives, outside the knobs.

    CSP. On the test app a javascript: URL the PAGE navigates to is refused
    (the control: one CSP violation, it did not run). The bookmarklet,
    entered the way the bookmarks bar and the address bar enter it (a
    navigation the browser starts, here through DevTools' Page.navigate),
    ran, and opened its tab with the popup blocker on; so it did on
    nextjs.org, whose CSP limits script-src. The console line (the copy
    button on `/?capture=1`) ran too, in Chromium and in WebKit 26.5, where
    the capture and the handover gave the same 32 of 32 and 1:1 ok. Not
    measured: a click on a real bookmarks bar (no automation reaches the
    browser's own toolbar), and how Firefox and Safari treat a bookmarklet
    under a strict CSP. The console is the fallback wherever one is refused.

    Then by hand (2026-10-19): Alexander dragged the bookmarklet from the
    dev server to his own Chrome's bookmarks bar and clicked it on
    test.siteshare.dev/ideelab, logged in: it works. That is the real
    bookmarks bar, and the app this was for. Chrome asked nothing on the
    way (no local network prompt for the https app opening a localhost
    tab). No numbers were taken there.

    Where it stops:

    - Cross-Origin-Opener-Policy. An app that sends `same-origin` cuts its
      tab off from the tab it opens the moment that tab reaches another
      origin: nothing can be handed over. Measured on the test app with the
      header: the bookmarklet sees the handle close (it looks every 250
      ms) and says so; its message was on the page when read 3 s after the
      click, and nothing was sent. A way around it (save the
      capture as a zip, drop it at the door) is not built.
    - A snapshot is not the app: no scripts, so no clicks, no hover or focus
      state, no scroll position, no popover or modal in the top layer.
      Links in a captured screen lead nowhere in the sandbox; route
      discovery is off for captures, so every screen is a click.
    - Closed shadow roots cannot be read (counted, named in the notes);
      frames are left empty; video and audio play from their own address; a
      font added by script (FontFace) and not by CSS does not come along; a
      WebGL canvas may come out blank (counted). A custom element is not
      defined in the sandbox, so a `:not(:defined)` rule would apply; not
      seen on these sites, not measured.
    - Media queries evaluate at the sandbox frame's width; the note names
      the viewport the screen was taken at, and "same as live" was measured
      at that width.
    - Typed values in inputs come along (they are what the screen shows); a
      password never does.

    Found on the way, and fixed: a cross-origin stylesheet whose server
    sends no CORS headers vanished from the tokenised render only. The
    worker fetched it for the rewriter, the fetch failed, and it answered
    502, while the raw control loaded the sheet as any page does. Check 1:1
    said so: 4 differences on the line it styled. The worker now sends such
    a sheet to its own address instead (sw.js externalCss): it applies
    untouched in both renders, outside the knobs' reach, and 1:1 is ok. Any
    build with a CDN sheet without CORS had the same gap.

    Security: notes/security.md, "Screens taken along".

    Where it lives: `/?capture=1` shows the bookmarklet to drag and the
    console line to copy; the tab the bookmarklet opens shows "Waiting for a
    screen". The first version showed the
    bookmarklet as a button, and Alexander clicked it: nothing happened,
    and nothing said why. It is now a dashed label with a grip, under a
    drawn bookmarks bar with its slot; a click says to drag it, and the
    shortcut for a hidden bookmarks bar is on the page. The bookmarklet is 13.6k characters
    from the production build, 26k from the dev server.

    On the door, FIRST (Alexander, 2026-10-19). The login was one case of
    it: the bookmarklet takes any screen the visitor's browser shows, live,
    on staging, on localhost or behind a login, with no build, zip or
    command, which makes it the easiest way in, and it keeps everything in
    the browser as the ways under it do (decision 197's order still holds
    below it). It says what it is not: "A snapshot of what you see: the
    knobs and the export work on it; to click through the app itself, bring
    its build." The page at `/?capture=1` stays as the step by step, linked
    from the door.

210. The font knobs reach Radix: brackets inside a quoted family name are
    part of the name.

    Since 207 the meter said 0% type on the Radix kit, and turning Body font
    to Georgia moved 1 of its 81 text elements. The tokeniser takes a font
    family held in a custom property only when it looks like a family list,
    and to keep `clamp(6px, …)` out it refused any value with a bracket.
    Radix's --default-font-family names 'Segoe UI (Custom)' and 'Open Sans
    (Custom)', two faces it declares itself, so the whole stack was refused
    and its text never got a token. Brackets now count only outside quotes
    (rewrite.ts; rewrite.test.ts holds Radix's stack in and a min() with a
    quoted argument out). On the Radix kit: type reach 0% to 100%, and the
    knob turns 63 of 81 texts; the 18 left are Menlo, its code face.

210. One footer in two heights, and How it works over the editor
    (2026-10-20, Alexander's call).

    The footer. The editor kept a slim line and /about a footer in columns,
    and the two had drifted into two footers. A tall one in the editor would
    take the height the canvas needs, so the slim line stays and gains
    "More": the same columns as the kit pages (SiteColumns, from
    src/site/links.json) slide up over the canvas; Escape, a click beside it
    or a click in the canvas closes them. They are always in the page,
    folded and inert, because they are the homepage's links to every kit
    page and a crawler reads what is there. A link to where you already are
    stays here: The editor closes the sheet, How it works opens the dialog.

    How it works. /about was a page that sent you out of the editor and
    then needed "Open the editor" to get back. It is a dialog over the
    editor now: Close, Escape, a click beside it or Back return to the
    editor as it stood (measured: the knob hash after open and close is the
    one before). The address is /about while it is open, so a link to it is
    still a link and the sitemap entry stays true; opened cold, /about is
    the editor with the dialog over it, with its own title and canonical.
    /about#agents opens at that section. Closing replaces the entry rather
    than going back: the knobs turned while it was open live in this
    entry's hash, and Back would hand the editor an older one.

    Shorter: the hero is gone (you are in the editor; its headline and
    buttons had nothing left to sell), the steps name the ways in as they
    are now (the bookmarklet, `npx uisandbox-mcp open`, a build) and the
    knobs as the panel orders them (decision on Fine-tune, 0c5e0d5), Inspect
    and How to check it are one paragraph each, and the three screenshots
    of the old screen are out. About.tsx and Landing are removed; the
    roadmap's "/about as the launch page" is answered by this: the editor
    with this dialog is the launch page.

212. The screens are one app, Ledgeway, walked through.

    Alexander: every screen should look like a real screen, each one
    standing on its own, as if you walk through an application; an overview
    needs no caption when it has a navigation on the left, a header and data.
    So the kit screens are now pages of one made-up invoicing tool, Ledgeway
    (his pick, a variant on UIcockpit's Ledger flagship, whose name is also a
    real company's): Sign in, Dashboard, Invoices, Settings, Void an invoice
    and Expenses. A shell carries all but the first: a top bar with the
    mark, a search field, notifications and an avatar; a side bar whose
    active item is the screen; the content. Sign in is one card on a page
    under a bar with the name. No board captions: the screen's name is the
    picker's. On a phone the side bar goes, grids fold to one column and a
    table scrolls inside its own box.

    The mark is UIcockpit's four tiles, one lighter, in each kit's own brand
    variable, so the brand knob moves it (measured on shadcn: #171717 to
    Jade). The cast is new and invented: clients such as Halden & Rowe and
    Vandermeer Architecten & Partners, Maya Okafor as the user, initials for
    avatars. Ledger's was Tailwind's demo data (Tuple, SavvyCal, Reform, real
    companies) with randomuser.me photographs, which would also have been a
    request leaving the tab. The content is not tidy on purpose: a long
    client name, a five-figure amount, an empty Due.

    One new part, the layer: what an app puts over itself, fixed to the
    window as in a running app. In the middle, a dialog over each kit's own
    scrim (shadcn's dialog-overlay, Bootstrap's modal-backdrop, Radix's
    BaseDialogOverlay, Mantine's Overlay at its Modal's 60%, Ant's
    colorBgMask, M3's scrim at 32%); in the corner, a toast. A grid can name
    its tracks (2fr 1fr). Every navbar carries the mark when a screen asks.

    Found on the way: the Tailwind kit had no surface colour either (a
    dialog over a scrim showed the page through it); it reads white now.
    Ant's header needs a Layout around it for its own rules, and is the
    light header of their sider layouts. A payment-link tooltip moved off
    the title row, where the narrow detail panel made it overlap.

    Measured: fidelity 100% on all eight, tests and kit gates green,
    hold-outs ok on all eight kit builds, Check 1:1 on Void an invoice in
    shadcn: 189 elements, 0 differences. Every screen photographed in all
    eight kits at 1280 and 390 and looked at.

213. shadcn, measured against its own blocks.

    Alexander: the last 15% of a design system is its finesse (vertical
    rhythm, padding, greys, type weight and size, the distance from a label
    to its field), and our screens should be indistinguishable from the
    kit's own examples; if that cannot be done, better to build one top
    system of our own. The method, on shadcn first: build their own blocks
    with their own CLI into an empty Vite app (base-nova, as init installs
    it: login-01 and dashboard-01), render theirs and ours at 1280 in the
    same browser, and compare every element's box, size, weight, line
    height and colour.

    Before, on Sign in: the title 24px/600 against their 16px/500, title to
    description 12px against 4, label to input 4 against 8, field to field
    12 against 20, a label's line 14px against 19.25, the password link a
    32px button against a text-sm link, the card 420 wide against 384. The
    cause was anatomy, not values: they build a form from Field, FieldGroup,
    FieldLabel and FieldDescription, and a card from CardHeader, CardTitle
    and CardDescription; we had a stack of a label and an input. So two
    parts, field and fields, and a panel that can name a title, a line under
    it and a link. shadcn answers them in that anatomy, Ant in its
    Form.Item, the other six in their own label, link and stack until each
    is measured.

    And their cn(): they merge classes with tailwind-merge, so a variant's
    border-border replaces the base's border-transparent and a FieldLabel's
    leading-snug replaces its Label's leading-none. We joined them and let
    the stylesheet's order choose: the outline button had no border, a field
    label weighed 400. sCva and the label merge as theirs do now
    (tailwind-merge 3, a dev dependency of the build). A checkbox with its
    text is their horizontal Field.

    After: Sign in sits on login-01's pixels for every box measured (title
    y16, description y42, label y78, input y105, the password link in the
    label row, the buttons 40 apart, the line under them 8 below), with the
    same weights and colours (rgb 10,10,10 is their oklch 0.145).

    The dashboard showed that the larger difference was the frame. Every
    dashboard and sidebar block of theirs opens on a sidebar the full height
    of the window, the name at its top and the user at its foot, with the
    page as an inset under a 48px header that carries its name; ours had a
    bar across the top. A kit now chooses its frame. shadcn's is the side
    one, in their Sidebar (collapsible none, their default 16rem):
    SidebarHeader with the name as dashboard-01 sets it, NavUser in the
    footer, their SiteHeader with the trigger, a separator and the title,
    the inset's peer rules written out. The shell's nodes carry the user and
    the page's title for every kit, so what is counted is still what is
    shown; a kit with a top bar shows the avatar at its end, as before.
    Against dashboard-01: the name, the menu items (32px, padding 8), the
    group label (12/500/16), the header (48), the trigger (28 at y18) and
    the title (16/500 at y20) on the same pixels; only the width differs,
    their default 16rem against the 18rem dashboard-01 sets. A stat is
    their SectionCards card (the brand at 5% fading up, the figure 2xl
    semibold, 3xl from 250px), a page title their tasks example's, a
    heading in a card their CardTitle, and the signed-out page has
    login-02's name row, with no rule under it.

    Next: the same for the other seven, each against its own examples. Seen
    on the way and left for Ant's turn: its grid sets no gap between cards,
    and its count tag sits too tall in the menu.

    Measured: fidelity 100% on all eight, tests green (474, 145, 121), kit
    gates green (101, 18), hold-outs without regressions.

    Then, from Alexander's look at the screens: Bootstrap's Export was its
    filled btn-secondary where every other kit showed a white button; a
    page header's Export is an outline button in their own dashboard
    example (btn-outline-secondary) as in shadcn's, so the screens ask for
    the outline tone. Ant's buttons touched and its cards sat edge to edge:
    our layout divs read Ant's spacing variables, which are declared on
    .antd and not on :root, so every gap was an undefined var; the divs
    carry .antd now (0px to 8px between the buttons, 16px between cards).
    Its count tag stretched to the menu item's 40px line and is centred
    (22px). Tailwind wrote no brand-foreground, so its brand buttons and
    avatar set their text in black outside the editor; it reads their
    text-white now, and onBrand counts as a colour role. Avatars no longer
    shrink beside a search field (Tailwind 22px, Bootstrap 23px, Material
    29px, all their own size again). And switching kit on a screen stays
    on that screen, so the same Dashboard can be compared kit to kit.

214. Every screen a showcase; what opens, opens.

    Alexander: Void an invoice was a dialog you could only look at, and a
    dashboard should be a dashboard with everything on it, realistic, not a
    few components at the top. The screens should be exactly where people
    get stuck in their own design system: menus, the top navigation,
    overviews, popups, modals, how an account menu opens. So the screens
    became showcases, and what opens in an app opens here.

    A layer with an id starts closed and names the controls that open it,
    by their text, aria-label or placeholder: the avatar opens the account
    menu, the bell the notifications, a row's ⋯ its menu, that menu's Void
    invoice the dialog, whose own Void invoice closes it and leaves a toast.
    A popover hangs from its control (right-aligned from the right half,
    above it when there is no room below); a click outside or on the scrim
    closes, so does Escape; a menu closes on a choice; a toast goes after
    six seconds; #open=<id> opens one on load. The behaviour is one script
    of ours (LAYER_SCRIPT), the same in every kit and with no look of its
    own; the parts stay the kit's. Void an invoice is gone as a screen: the
    same dialog and toast are now reached from any invoice row.

    No new parts for it. A table cell or a card's head can hold a node (a
    status as the kit's badge, a row's action, a segmented range); render()
    hands it over as markup, Ant renders it inside its own Table and Card.
    A menu can be opened by a layer and so carry no trigger, and can end on
    a plain item (Sign out) rather than a destructive one. A stat carries
    its trend: shadcn's as dashboard-01's CardAction badge and CardFooter,
    Ant's as a Tag and a secondary line, the others as their badge and
    muted text. A chart can be as tall as a dashboard's main chart (250px,
    dashboard-01's).

    The dashboard: four figures with their trend, revenue with its range,
    the month's target with its progress and top clients, what is due this
    week with status badges and a menu per row, and recent activity. Every
    shell page has the account menu and the notifications. Found on the
    way: M3's menu closes itself on the click that opens it, so it opens
    after that click; a number, a date or a status in a table stays on one
    line (shadcn's TableCell is whitespace-nowrap), a name may wrap.

    Measured: the whole path (avatar, Escape, bell, a click outside, a
    row's menu, Void invoice, the confirm, the toast) clicked through in
    all eight kits by a script, every step opening what it should.

    Then the list and what slides in. Two new parts, drawer and command,
    because both are components most kits ship and nothing on the wall was
    one: shadcn's Sheet (which places itself, w-3/4 up to max-w-sm, with its
    own close) and its CommandDialog (Command with an InputGroup, read from
    the registry with sheet, command, popover, calendar and input-group),
    Bootstrap's offcanvas, Mantine's Drawer, Ant's Drawer panel; the others
    compose them of their own panel, input and list, and say so as a gap.
    Invoices is now the list somebody lives in: a status filter, a search,
    two selects in one toolbar row, a selection with what to do with it,
    eight rows with a checkbox, a status badge and a menu, and a pager. A
    number in the list, or Open in a row's menu, slides the invoice in:
    status, tabs, its terms, what is paid, the PDF, its history, and a
    reminder or a payment to record. On every shell page the search field
    opens the command palette, as Cmd-K or Ctrl-K does. M3's controls are
    elements of their own (md-filled-tonal-icon-button, md-menu-item) and
    its text field names itself with label, so the script reads those too.

    Measured: the drawer by its number, its close, a row's Open, Escape,
    the search field and Cmd-K, clicked through in all eight kits.

    Then the form people get stuck on, and the last two screens. New
    invoice is a screen of its own: a client chosen from a list that opens
    under its field as a combobox does, a reference, real date fields (a
    field can name its type, and a date opens the browser's own picker),
    the lines as a grid of inputs (the description takes the room, the
    figures keep theirs; a grid can centre its rows), how they can pay,
    a note, a reminder, the total and where it goes. Settings adds the plan
    with what is used of it and the members, each with an avatar, a role
    and a menu; Invite people opens a form in a drawer, and sending it
    closes the drawer with a toast. Expenses is the page of states, now in
    use: figures, an error, the month's expenses with their receipt status,
    reading, uploading, and an empty filter. Ant's Form.Item is vertical on
    the item too, or a field outside their Form put its label beside the
    control. Seen and left for its own turn: Mantine's empty state lies on
    its side in a narrow column.

    Measured: on Settings a member's menu, Invite people, Cancel, again,
    Send invites and the toast, and on Expenses a row's menu, clicked
    through in all eight kits; fidelity 100% on all eight, tests and kit
    gates green, hold-outs without regressions.

215. One halo for every card over the editor.

    Alexander: the only branding left was the colour behind Connect your
    app, while every other overlay showed the page behind it, darkened.
    Make the three the same: the page still seen, but dark; the colour
    gradient behind the card; and a 3px rim of the same range around it.
    So the door, Export, How it works, the privacy card and Step by step
    share one rule: the scrim (the door's now too, with the kit visible
    under it rather than hidden), the four colours of the old corona as a
    glow, and as a 3px gradient border. The glow is a shadow rather than a
    layer behind the card, because Export clips what lies outside it and a
    shadow is not clipped. The door also closes now (a cross, Escape, the
    Connect button again), to the tab of the screen under it.

216. The editor walks a maker from their app to their agent.

    From the research (reports/, kept out of the repo): the key user is the
    solo builder shipping a shadcn or Tailwind app from Cursor, Claude Code or
    Codex, who sees that it looks like every AI app and cannot name the few
    foundation choices that fix it. Alexander approved a flow sketched as a
    canvas (bring your app, why it looks generic, pick a look, tune, before
    and after, take it home), to be built on a branch and merged by PR.

    First, before and after. Hold Space, or the pill at the foot of the
    canvas, and the frame gets the identity sheet (the values the app's own
    CSS had), no chosen fonts and the app's own scheme; let go and it is
    turned again. Nothing reloads, no second frame: the same identity Check
    1:1 measures against. The pill shows once something has moved. No tool
    in the research offered this on the user's own app.

    Then the looks. Pick a look puts the screen on stage six times over the
    frame, each a live copy of the same sandboxed page at 1000px, cut at
    620 where the head, the figures and the first chart are, with one
    direction's sheet written in: Editorial, Swiss, Calm, Bold, Technical,
    Soft (sandbox/directions.ts). A direction is a coherent set put through
    the knobs everything else uses (brand, grey tint, a type pair, corners,
    spacing, depth, weight), so picking one is a turn Undo takes back and
    Export carries. Each holds two or three brands and type pairs: Shuffle
    (or Space) varies within a direction instead of rolling every knob. Keep
    my colour and Keep my font lock those two. The dials a look turns are
    put back to the app's own before a direction is applied, so one look
    never inherits another's. Kept off the tells on purpose, and held there
    by a test: no Inter, no indigo or violet brand, nothing outside the
    dials' own range, only fonts the picker can load. The six are a start
    to be reviewed in the PR, not a verdict.

    Then the steps and the plain knobs. The top bar carries the four steps,
    Your app, Pick a look (the look's name once one is picked), Tune and
    Take it home, numbered, the one you are on dark, the ones behind you
    ticked; each opens what it names (the door, the looks, the canvas,
    Export) and closes the others, and Your app takes the place of the
    Connect button. The knobs lead with a maker's words: Colour, Type,
    Shape, Space, and their own Dark mode. Type is a pair now, heading and
    text face together, from the app's own and the looks' pairs; the grey
    tint, the background, each font alone and every dial are under More,
    which is what Fine-tune was called. Pick a look left the stage bar: the
    step is where it lives.

    Then take it home. Export opens on one thing to do: Send to your agent
    when the local server opened the sandbox, otherwise Copy for your AI, a
    prompt that carries DESIGN.md (and SKILL.md on a kit) whole and asks the
    AI to keep to the tokens and add no raw colours, one-off sizes or new
    fonts, so it works pasted into Claude Code, Cursor, Codex, Lovable or
    v0, not only the ones the MCP server reaches. The design system zip, or
    everything, sits beside it; what was turned stays visible; every other
    format is folded under Other formats. Its title is the step's, Take it
    home, with "exactly what is in the sandbox" kept beside it.

    Then why it looks generic. A chip under the canvas counts the AI tells on
    this screen, and opens them split by who can fix them: the knobs (the
    default fonts Inter, Geist, Space Grotesk and Instrument Serif, their
    variable builds included; an indigo or violet brand; shadcn's own
    near-black and Geist) or the agent (gradients, frosted glass, coloured
    left borders, emoji as icons, dark mode with no light one). Measured
    from computed style only, the way Krebs measured 1,590 Show HN pages,
    again after a load and after every turn, never while the original shows;
    on the shadcn kit as it ships it says 2, after Editorial 0. Layout tells
    are not claimed: on an app screen a row of figures is the point of a
    dashboard, so they go to the agent as don'ts, in Copy for your AI, with
    the measured ones no knob reaches. "Show me six ways out" opens the
    looks.

    And the way in. The door opens on what it is for, "Make your app look
    like yours", then the one way: Take this screen along. Over a kit,
    "No app at hand? Try it on the kit first" closes it. The other ways (one
    line on your machine, a script line for a deployed app, a build loaded
    here) are folded under Other ways in, each one click away. The tells and
    the looks no longer stand over the door.

    Measured, over the six: tests green (483, 145, 121), kit gates green
    (101, 18), each step tried in the browser at 1440 and the top bar at
    375. The kits were not rebuilt: nothing in this PR changes their pages.

    Then, from Alexander on the preview: clicking a look made it the choice
    at once, with no closer look. Now a look opens at full size in the same
    room as the six, the bar above it kept (the title, the locks, Shuffle):
    step to the previous or next one (the arrows, or ← and →), back to All
    six (or Escape), and only Pick this one makes it the choice. One frame
    for the full-size view, its sheet rewritten on every step, and the six
    stay loaded under it, so both ways are instant. The title reads "The
    kit, six ways", not "Your The kit".

    Then every knob, measured. Alexander turned Colour in dark mode and saw
    nothing, and a reload flashed his colour before the dark scheme took it
    away. A script turned each knob alone on the Dashboard, in light and in
    dark, and read what moved. Four did not, all for reasons in the engine:

    - Colour in dark. shadcn's dark `--primary` is #e5e5e5, the same literal
      as its light `--border` and `--input`, so the three shared one
      variable, read as a grey. A colour written straight into a property
      that names the brand now gets a variable of its own (table.ts), and a
      grey brand's twin in the dark scope takes the pick itself (mapping.ts);
      by delta it came out #f3f3f3. One test changed with it: a grey brand
      that is also body text is admitted now, since the text keeps its own
      variable and turning the brand no longer reaches it.
    - Line height. Tailwind v4 writes `calc(1.25 / .875)`, and both numbers
      were tokenised, so the ratio stayed put (20px to 20.0018px). The
      divisor is skipped now: 20px to 25px at ×1.25.
    - Elevation. Tailwind v4's `--tw-shadow` reads `var(--tw-shadow-color, …)`,
      so it was rightly never hoisted to :root as one value, and so nothing
      scaled. Its lengths are tokenised one by one now, as shadows; the
      colour variable stays where it was. One test changed with it, to say
      exactly that: never the whole shadow, its lengths yes.
    - Grey tint. A pure grey took the tint only as a delta of chroma, 0.0007
      on shadcn; it takes half the tint now, in the brand's hue.

    Still not moving, and left: Background in dark (it is the light page's
    colour, by design) and Border tone on shadcn's translucent dark border.

    And the hand-off, which Alexander read: DESIGN.md said primary #e5e5e5
    (the dark grey, now the brand), depth "100% of its published strength"
    with Elevation at ×0.5 (the dial is passed now), nothing about the
    spacing he turned (it says ×1.2 now, and the one Tailwind v4 line), and
    gave the heading the body's line height of 1.65 (no longer). SKILL.md
    told a shadcn project not to install a chart or a toast, which shadcn
    ships itself (OWN_PACKAGE names its own), signed itself UIcockpit, and
    carried dashes the copy rule forbids. The prompt now carries theme.css,
    the file every other part points at, says "this app, built on shadcn/ui",
    and no longer tells a dashboard to drop its row of figures.

    Then the font. Alexander chose Figtree and the prompt said Geist: DESIGN.md
    named Figtree, theme.css still wrote init's `--font-sans: 'Geist Variable'`
    in `@theme`, because shadcn's fonts "inherit the base" and on a shadcn
    export no base is written. The emitter now puts the chosen family there.
    And the export passes a family the Type knob chose as `'Figtree',
    sans-serif`, the form the engine reads as a webfont, so DESIGN.md says
    where to fetch it; the page's own `Figtree, sans-serif` read as a system
    stack, and an agent told to add no new fonts would have fallen back to
    sans-serif. Checked on all nine kits: every one carries the chosen two.

    Take it home, one line per way. Alexander used only Copy for your AI and
    did not miss the skill, and read the long note as "the zip adds a skill".
    It does not: the prompt already carries SKILL.md. What the zip adds is
    that the files stay in the repo, so later screens keep the look. Each
    button now says when it is the one; the note keeps the tools and the MCP line.

    Deploy is by hand, not on push: decision 103 said "deploy on push", and
    after the merge of the new flow (b67c3fe) the site stayed on the old build
    for ten minutes with no build check on the commit. It went live with
    `pnpm build && npx wrangler deploy` from the repo root (version 5703f070).

    Then a sweep of what goes in and what comes out, after the merge.
    Loading: the 173 hold-outs. Export: the 13-build export sweep (it had gone
    blind: it waited for cards that now sit folded under Other formats, and
    opens that fold now), and a new pass over all eight kit doors with Colour,
    both fonts, Shape, Space, Elevation and Text size turned, reading back the
    Copy for your AI text and the zip. It found, and these are fixed:
    - Tailwind and Radix: theme.css said the heading face was Figtree with
      Fraunces chosen. Pinning to the page put it back: the knob sets
      headings by selector, so the page's own heading variable still holds
      the body face. A chosen family is no longer pinned.
    - Fraunces went out as `'Fraunces', sans-serif`; the generic is the
      family's own now.
    - daisyUI: no family in theme.css at all (it rides on Tailwind, and no
      Tailwind layer is written on its own export). It writes one now.
    - Your own app: DESIGN.md named the families and never said where to
      fetch them; it carries the same font link as the kit export now.
    - The copy rules: em-dashes in 13 of the 17 files the export writes, in
      the kits' own descriptions (which reach MANIFEST.md), and "UIcockpit"
      in the Tailwind and shadcn headers. A test now reads every file for
      both (copyRules.test.ts, and one in the engine for all nine kits).
    - The app's own messages: 13 dashes in what the door says when it
      refuses a build (iOS, Flutter, Expo, web source, too large) and in two
      hints. Rewritten; the 15 refused and no-load hold-outs re-run as expected.
    Left as it is: Ant Design has no token for a heading face; MANIFEST.md
    says so by name, and DESIGN.md names the face.
    Hold-outs: 173 in 1448 s, ok 155, differs 3, refused 1, no-load 14, no
    regressions (153 and 5 the run before).

    The six keep what you chose. Alexander set Sky and opened Pick a look:
    six looks in six other colours. A colour or a font turned away from the
    kit's is now kept by default when the six open, so they vary the style
    around it; untouched, they still vary the colour. The locks stay one
    click, and the line under the six says what a look will set.
    And a colour turned while the six are open reaches them at once: a card
    rewrote its sheet only on a shuffle or a lock, so Indigo showed as the
    dots and not on the screens. It keys on everything the card wears now;
    the frames stay loaded, only the sheet is rewritten.

    The stage bar: the width and the mode sit right, where Reload and Open
    were; those two are gone (Alexander). And a fault found on the way: a tab
    that had shown a sandboxed screen full size (Open) and then went to the
    site's root got "Not in sandbox: index.html", because the worker took the
    referrer's sandbox for it. A top-level load of `/` with no sandbox named
    is the app's now, always; frames are unchanged. Hold-outs re-run on it.

    One place for every card. The three opened in three places: Take it home
    in the middle of the window, the door at the top of the stage, How it
    works at the top. All three are a fixed layer with the card at margin
    auto now: the middle of the window, and from the top, scrolling, when
    taller than it (How it works with More open; the door on a phone).
    Hold-outs after the worker change: 173, ok 153, differs 5, one flagged
    (s11-ng-bootstrap, one margin-left 0 to 127px), which passes alone three
    times of three: batch-flaky, like s16-cirrus before it.

    Screens first. A kit opens on its Dashboard and the tab reads Screens,
    Components: a screen says what a kit looks like in use, the sheet of
    every control (danger buttons and all) is the drill-down (Alexander).
    Switching kit from the sheet keeps the sheet.

    Preset is the six. The old Preset list (another kit's start values, "the
    Mantine look") is gone; Preset names the six of Pick a look and applies
    one exactly as Pick this one does, so the panel and the six are one
    thing. A colour or font counts as yours only when you turned it, not
    when a look set it: Swiss after Editorial took Editorial's navy along.

    And the six themselves, retuned (Alexander: too far apart, very
    outspoken fonts). Six good SaaS dashboards the way shadcn sets its own
    styles: Classic, Compact, Soft, Sharp, Airy, Bold, each one restrained
    sans (Public Sans, IBM Plex Sans, Figtree, Albert Sans, Manrope, Plus
    Jakarta Sans and their pairs), the difference in corners, density, depth
    and colour. No serif, no mono headings; still no Inter and no indigo.

    Do the six hold on every kit? Measured on all eight kits' Dashboards,
    each preset against the kit as it ships: both fonts reach every kit;
    corners scale on every kit (Material by eye, its parts are in shadow
    DOM); no horizontal scroll, no clipped button. Three faults, fixed:
    - Contrast. White on Soft's blue was 4.1:1, on Soft's green 3.3, on
      Bold's orange and teal 3.6 and 3.7. Deeper tints of the same colours;
      a test holds every brand of the six at 4.5:1 with white.
    - daisyUI kept its pale lavender --color-primary-content on any brand
      (grey enough to map as a neutral), 3.8:1 on Bold's red, violet on
      blue. Text a kit sets ON its brand now stays at 4.5:1 on the brand
      you picked; a kit as it ships keeps its own pairing (Mantine's 3.6,
      Ant's 4.1 are theirs).
    - Sharp took the edge off every Radix card: Radix outlines its cards with
      a ring, `0 0 0 1px var(--gray-a5)`, and Elevation ×0 removed it. A
      ring is an outline, not depth: Elevation leaves it alone now, in the
      rewriter (a ring's spread is no longer tokenised) and in the mapping.
      One test changed with it, to say exactly that (rewrite.test.ts: the
      drop shadow's lengths are ours, a ring's spread stays as written).
    Not the presets' doing, and left for its own pass: daisyUI's Dashboard
    squeezes the stat descriptions and the client names into narrow columns
    at this width, with or without a preset.

    The bar under the header is gone (Alexander: if a line has to explain
    the app, the app does not). Its sentence is in the footer line; the h1
    stays, hidden, for search and screen readers; How it works shows in the
    header on a phone too, where the bar used to carry it. The widths went
    with it (a design system is looked at on a desktop, and a window
    resizes); the stage always fills, and Light and Dark sit left, by the
    screen they change.

    daisyUI's Dashboard, squeezed. The trend under a figure ("+12.4% Up on
    August") was appended after .stat, inside .stats, which lays its
    children out as columns: it wrapped word by word beside the figure. It
    is the stat's own stat-desc now, under it, wrapping (daisyUI sets the
    stat nowrap), and the stat is bordered like the panels and fills its
    cell. Its list rows had two paddings inside a card (the card body's and
    their own), which left a client name 70px in the right-hand panel,
    broken letter by letter; the row drops its own inside a card.

    And the six carry no colour (Alexander: six colours are compared by
    colour, and the style under it goes unseen). A look sets fonts, corners,
    spacing, depth, weight; it never sets the brand or the grey tint, so all
    six wear the colour the knobs hold. Keep my colour is gone with it;
    Shuffle moves the type pair. Airy and Bold are described by what they
    do to space and type now, not by a colour. The tests changed with it:
    the brand tests are gone, one holds that no look touches a colour dial.

    Hold-outs after the ring change: 173, ok 153, differs 4, one flagged
    (s12-fundamental-styles, the runner's own click on the Check 1:1 chip
    before the foot had rendered, while the app was being edited under the
    run); alone it is ok. The new daisyUI build loads 1:1 (kit-daisyui).

    A look-over of every screen of every kit, at 1440 and in the dark
    (Alexander: "alles doorlopen zodat alles er optimaal uitziet"). 56 shots,
    read on sheets of four, the faults fixed at their cause and shot again:
    - Bootstrap's trend sat outside card-body, on the card's edge; Material's
      touched the figure. The trend goes in the box that holds the figure,
      8px under it. shadcn's badge, top right, was cut to "+12." in a card a
      quarter wide; it sits in the footer with the note.
    - The Dashboard's bottom row was 3fr 2fr, which a table's min-content
      widened: Amount went out of the panel on five kits, daisyUI's activity
      list broke by letters. Every two-column grid is minmax(0, fr) now; the
      table there is a summary (Client, Status, Due, Amount), and each table
      names the column that may wrap, since the name is not always second.
    - Kit props our markup left out: Mantine's Table spacing (cells flush),
      Textarea data-multiline on the wrapper (one line high), EmptyState
      data-align (a row); Material's select min-width (cut off the card);
      Ant's progress figure (80% twice), Form spacing, stacked controls, the
      layout of a non-Ant row inside their Table (avatar over the name).
    - Material's "Saved" was pink (no success role; tertiary is the seed's
      complement): the neutral container now. Its link in a sentence was a
      text button off the line: an inline link in its primary.
    - Bootstrap drew a border round every section of the sheet, caption and
      all: our own class was .card, which is Bootstrap's.
    - Dark: shadcn's New invoice and Sent badges were black on black, with
      nothing turned: the dark twin took "the pick", and untouched the pick
      is the light brand. It takes it only when a brand was picked (a test
      holds both). Material's dark mode moved only primary: the generator's
      dark half was computed and never written; it is now. Tailwind and Ant
      offer no dark mode, and the knob does not show for them.
    The kit builds, their fixtures and the /kits/ shots are rebuilt; all
    eight kit hold-outs load 1:1.


    Two faults of the on-brand guard, found by the new clip (several knobs at
    once): it matched "accent" too, and shadcn's --sidebar-accent-foreground
    (dark text on a pale grey accent) went white, the active nav item a blank
    pill; and it rewrote a SHARED entry, so shadcn's dark --card, the same
    oklch(0.205 0 0) as its dark --primary-foreground, went white with the
    text. The guard is primary and brand only, and text on the brand has its
    own variable now (table.ts ON_BRAND_PROP, like the brand's own); a test
    holds the shared case. Hold-outs on it: 173, ok 152, differs 5, one
    flagged (mui-dist, a timeout while the MCP package was building beside
    the run), which passes alone twice in 4 s.

    And the outside, said as it is now: the README, the npm README, the meta,
    llms.txt (generated with llms-full.txt now, it had drifted), the marketing
    copy and its numbers; the OG card (the Dashboard six ways, one brand
    colour), the README hero and the clip (scripts/og/clip.mjs, the four steps
    on a kit and on SB Admin 2) shot again; uisandbox-mcp 0.5.1 packs the
    four-step app.

    The MCP registry, without a token: a job in release.yml logs in with the
    workflow's own GitHub OIDC (`mcp-publisher login github-oidc`), which the
    registry grants io.github.Ideelab/* for a workflow in an Ideelab repo. The
    browser login still falls back to the personal namespace (no read:org,
    decision 177; making the membership public, which I relayed again, does
    nothing), and the classic-token way works but leaves a token to revoke.
    The job publishes only once npm has the version and skips a version the
    registry already lists; after a human npm publish, run the workflow by hand.

217. One or six, and Try it on your own app (2026-10-21).
    The four-step bar was easy to miss (Alexander): four pills in the middle
    of the top bar read as navigation nobody needed. The steps are the
    controls now. A first visit lands on the six: the kit's Dashboard in the
    six looks, the first thing to see (not for a link that names what to
    open: `?load`, `?tab`, `?screen`, a hash). 1 | 6 over the screen switches
    between the screen and the six, on a kit and on your app; the six lost
    their cross, 1 and Escape close them. The panel's Dark mode row was the
    Light / Dark switch twice and is gone; what the switch turns on is in its
    title.

    Try it on your own app, top right beside Export, is a takeover of three
    steps: Bring it, What we found, Six ways. Bring it offers one way first,
    the one a builder has (Alexander, after shadcn create puts its CLI line
    up front): `npx uisandbox-mcp open http://localhost:3000`, live, every
    screen, from 127.0.0.1, or the same said to an agent. A page on
    uisandbox.org cannot read somebody's localhost itself: the dev server
    sends no CORS for another origin, which is what the line is for. Under it,
    two quiet links for who has no terminal or no localhost (Lovable, v0,
    Bolt, a login): the bookmarklet, and a zip, a folder, a public repo or a
    running app (the script line of decision 197, a tab there now, so the
    live-bridge gate still drives it). Pasting URLs for uisandbox.org to open
    was weighed and left out: it needs a server-side browser, costs per
    browser-hour, cannot see localhost or a login, and "your files never
    leave this tab" would no longer hold for it.

    The line opens another origin, so what was turned on the kit cannot
    reach it from this tab: it rides in the line, `--carry=<token>`
    (state/carry.ts: the knobs that differ from the kit, lz-string base64url,
    no character a shell reads as its own), and the CLI hands it to the page
    as `&carry=`, read once and taken off the address. uisandbox-mcp 0.5.2
    carries it; 0.5.1 ignores the flag (it starts with --, so it is never
    taken for the target). What we found then asks, only when something was
    turned: start from your app as it is (the default), or bring what you
    tuned; the kit's knobs are no longer put on unasked. One more screen
    taken along with the bookmarklet keeps what was turned, unasked, as
    before. Test: carry.test.ts, the token round trip and its refusals.

    Live mode on a Vite dev server rendered SB Admin 2 unstyled, 1 value
    from 231 KB of CSS (Alexander, the first test of the line on a running
    app). Vite answers a .css by the Accept it is asked with: text/css (a
    <link>) gets the sheet, anything else a JS module that injects it. The
    snapshot fetched bare, and in the page every file is fetched fresh from
    the dev server, bare too, so the <link>'s sheet came back as script. The
    service worker now hands the frame's own Accept along (sw.js askPage,
    host.ts fromDevServer), so a CSS import from JS still gets its module;
    the snapshot asks as a <link> does. Not new with 217: 0.5.2 and before
    did the same. uisandbox-mcp 0.5.3.

    The gate it lacked: scripts/live-dev.mjs (`pnpm live:dev`), four apps on
    their own dev server through the packed CLI: SB Admin 2 on Vite, Vite +
    React with CSS from JS and a CSS module, Vite + React + Tailwind v4 with
    shadcn's oklch theme, the Bootstrap kit on a plain python server. Each:
    What we found, its CSS read, styled, Soft picked moves values, a saved
    CSS file shows through hot reload with the look still on, and with
    --carry the kit's brand and shape come along. 46 checks, 0 failed.

    The sweep of the localhost route (Alexander: "we vinden nog veel
    gebreken"), on a real shadcn-style dashboard (Vite + React + Tailwind v4,
    four pages, .dark) and the same on Next 15, through the page and through
    the MCP tools. Found and fixed:
    - The six ignored every knob on a live app: Vite injects its CSS at
      runtime, and only the stage's frame was observed. Each look's frame
      observes its own now (LookGrid), and the six follow the table's growth.
    - No Light / Dark on a Tailwind or shadcn app: the scheme was read from
      the static CSS only. The live observer detects hooks in runtime CSS.
    - The screen picker said Home while the app sat on /invoices after a click
      inside it, and picking Home then did nothing. It follows the frame now,
      picking navigates it, and the six show the screen the frame is on.
    - The reach meter read oklch/oklab paint as nothing and showed 0 of 0 as
      100 %; radii derived from a tokenised --radius (calc, inline in the rule
      with @theme inline) read as outside. Both counted now; shadcn's kit goes
      from 70 % to 100 % radii.
    - "0 KB of CSS" and "0 files changed" on a live app: runtime CSS is
      counted per source, and Export counts the files the patch names.
    - A style="color-scheme" on <html> before React hydrates: Next flagged a
      hydration error in their app. A <style id="us-scheme"> instead.
    - The agent route was blind on a Vite app: verify and screenshot opened the
      snapshot (no CSS, a shell of 2 elements) and, since this decision,
      captured What we found over it; set and export read 0 of 0. A live
      project is now driven as `open` drives it (the local address, live,
      the agent's knobs as --carry, `&quiet=1`: no What we found, no notes,
      no peek pill), and the quiet page reports its own count and patch to
      the server (POST /__state {report}), which `set`, `export patch` and
      `state` use.
    - A Next.js dev build's CSS has no source map: the patch heading
      _next/static/... says the literals live in the source CSS. A route's
      inline <style> is named "index.html" or "the page at /x", not "dev: /".
    live-dev.mjs grows an MCP pass per app (load, set, verify, screenshot,
    export): 66 checks, 0 failed. patchSource.test.ts holds the Next note.

    "Or tell your agent: open this app in UISandbox" assumed the MCP tools
    and named no address (Alexander). It is a prompt to copy now, under the
    line, with the address and the kit's knobs in it, that works either way:
    with the tools, load / open (carry, a new `open` parameter) /
    wait_for_send; without, `npx -y uisandbox-mcp open <url>` in the
    background, where Send prints the patch. Tested with a subagent that had
    no tools: it ran the line, read the patch and applied it. It had to guess
    three times, all from the patch: which two of ten oklch(0.985 0 0) moved,
    0.25rem and 1px that are not in the file (Tailwind's own, compiled in),
    and which of two 4px. Each patch line now names where its value sits (a
    variable by name, .dark --primary outside :root, a rule as selector {
    property }); identical from → to lines are one; and the CLI and the MCP
    server, which run on the machine, check each line against the file it
    names and say so when the value is not written there. Second run: no
    guess about where; it left the two Tailwind defaults alone, as the patch
    said. The count above the patch says how many lines it is.

    "Just the knobs" on What we found said nothing about what happens:
    "Tune it directly" beside "See it six ways", the two ways on. And the
    takeover's glow was cut to a rectangle: .intake scrolled inside a layer
    that already scrolls, and clipped the shadow.

    Hold-outs on all of it: 173, ok 154, differs 4, no regressions. The five
    with low colour reach (water.css source among them) read the same with
    the meter as it was.

218. Speed, measured (2026-10-22). On uisandbox.org, headless, a desktop line
    and a 4G phone (1.6 Mbit/s, 150 ms, CPU ×4): first paint 0.6 s / 1.2 s,
    but the kit on screen at 3.2 s / 12.3 s. Of the phone's 12.3 s, 4.5 s
    was the default kit's zip (847 KB: the engine's writer stores, and
    Cloudflare does not compress a .zip), and it only began after the app's
    script had run. An own app (SB Admin 2, 6.6 MB) took 2.8 s / 10.8 s, and
    a CPU profile put 1.3 s of it in one function: the audit's line counter,
    slicing and splitting the CSS up to every declaration (quadratic).
    - The kit doors are deflated (scripts/zip-deflate.mjs, used by
      kit-builds.mjs; same bytes inside, checked before writing): 847 → 155 KB
      for shadcn, 5 to 6 times smaller for all eight.
    - index.html starts the default kit's fetch while the app's script
      downloads, unless the address loads something else.
    - The six cards' frames load lazily: on a phone four are below the fold.
    - Export and How it works load on their first open: 238 → 208 KB gzip.
    - lineCounter (patterns.mjs): the newline offsets once, a binary search
      per index; audit.mjs uses it too. Tested against slice + split at every
      index.
    Measured locally after (a gzip server, the same 4G profile): the kit on
    screen at about 5 s instead of 12.3 s; SB Admin 2 at 2.0 s / 7.5 s. Left:
    the six looks' Google Fonts (1.2 MB, after the render, not blocking); the
    zip reader inflating every entry up front (270 ms on 1878 files); the
    Bootstrap docs' 114 pages rewritten and audited (no single hot spot).
    The kit-export gate and the export sweep had not run since 217: both load
    a build by ?load and clicked Export under What we found (13 of 13 timed
    out). They open with &quiet=1 now, the headless mode 217 made for this.
    The gate's "values were read, not chosen" check held the old wording ("own
    build"); 217 changed it to "own CSS" on purpose (a live app is no build),
    and the check follows: 101 of 101.

