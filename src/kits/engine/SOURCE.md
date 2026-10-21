# Where this came from

The UIcockpit engine, moved in whole from `Ideelab/uicockpit`, `dsg/`, at commit
`37ed9bc` ("The merge brief: UISandbox is the host, this engine moves in").
The brief is `MERGE-INTO-UISANDBOX.md` in that repo.

**Copied byte for byte, not rewritten.** The tests are the reason the numbers
can be trusted, and a test that was edited on the way across is a test that
might now be checking something else. The control run, same nine files on both
sides:

    Ideelab/uicockpit  dsg/              103 tests · 103 pass
    Ideelab/uisandbox  src/kits/engine/  103 tests · 103 pass

The flat layout is kept on purpose: the tests read `kits/<id>.json` relative
to the working directory, so `pnpm test:kits` runs them from here rather than
editing a path in each one.

## What is here

Phase 2a, the export: `color` `roles` `stack` `palettes` `generate`
`kit-defaults` `fonts`, the nine kits' fetched values.

Phase 2b, the kit door: the render layer `parts` `scenes` `wall-bindings`
`antd-nodes`, and the build-time layer `build-css` `icons` `icon-sets`
`material-elements` `derive-material` `antd-render` `antd-tree` `npm-read`
`zip`, with `fidelity.mjs` and the cached `material.elements.json` and
`antd.render.*`. The build-time modules `npm install` each kit, pinned to its
version, into a throwaway directory: none of the kits is a dependency of
UISandbox.

Tests, all byte-identical and counted against the source:

    dsg/                    117 of the 123 tests · 117 pass
    src/kits/engine/        117 tests            · 117 pass

The six that did not come:

- `sweep.test.mjs` tests UIcockpit's PAGE: it reads `page.template.html`,
  `build-page.mjs`, `build-home.mjs`. That page does not move — the UI is
  UISandbox's (phase 3) — so a test of it would test nothing here. Its
  invariants (FOLLOW, VISIBLE, STATES, CONSUMED) do move, rebuilt against what
  UISandbox renders: `scripts/kit-export.mjs` holds that every kit build is
  ALIVE and that the export is the screen.
- `live.test.mjs` read UIcockpit's `live.js` and its page. Its four invariants
  (inert outside a frame, only the tool's own origins, the message names on
  both sides, only kits the engine knows) hold for UISandbox's bridge in
  `src/kits/__tests__/live.test.ts`, which also fails if `public/live.js` is
  ever out of date with its template or with `detect.mjs`.

`fidelity.mjs` runs from here unchanged (`pnpm kits:fidelity`): eight kits at
100%, 1271 classes and 28 elements, and every name SKILL.md cites is defined by
the kit it is cited for.

## Older note: what was still to come after 2a

Here (phase 2a, the export): `color` `roles` `stack` `palettes` `generate`
`kit-defaults` `fonts`, the nine kits' fetched values, and the tests of exactly
those.

Not yet, and arriving with the code that uses them:

| test | needs | arrives with |
|---|---|---|
| `material.test.mjs` | `wall-bindings` `scenes` `parts` `fidelity` | the kit door (2b) |
| `wall.test.mjs` `sweep.test.mjs` | the render layer | the kit door (2b) |
| `live.test.mjs` | `live.js` | the third way in (2c) |

## What is UISandbox's own, beside it

Not from the source, and free to change:

- `detect.mjs` — `detect()` lifted out of `live.js` unchanged, so a dropped
  build and the bridge answer with the same rules. 2c makes `live.js` inline it.
- `*.d.mts` — types for the parts UISandbox calls, kept beside the engine so the
  `.mjs` files stay byte-identical.
- `kit-root.mjs` — the wrapper each kit needs on `<html>`, from
  `build-page.mjs`, which does not move. Every attribute keeps its reason.
- `kits/unread.json` — which variables each kit's own stylesheet never reads,
  as uicockpit.com ships it: 16 rows, sha256 of its canonical JSON
  `a663ccbbb71d…`, fetched 2026-10-18 and identical to a local build of
  `37ed9bc`. It is built from `orphans.mjs` over the compiled kit sheets, which
  arrive with 2b; until then this is the list, and 2b's gate must reproduce it.

## One source, from 2026-10-19

This is the only copy that changes. `Ideelab/uicockpit` `dsg/` is frozen at
`37ed9bc`: uicockpit.com serves that frozen copy until the cutover (phase 4)
turns it into a redirect, and no engine change is carried back to it
(decision 188). Two copies kept byte-identical by hand is a mirror, and every
change carried to a site about to become a 301 is work thrown away.

So the drift check reads the other way round now: `cmp` against `37ed9bc`
lists exactly the files changed HERE since the move, and each must be in this
table with its decision.

| file | what | decision |
|---|---|---|
| `wall-bindings.mjs` | Radix divider gets `data-accent-color="gray"` | 187 |
| `generate.mjs` | MANIFEST.md: "The values" for "What you set"; no flat "Nothing" under "nothing reads" for the kits that compile through Tailwind | 191 |
| `generate.test.mjs` | holds both, on Bootstrap and on Tailwind | 191 |
| `generate.mjs` | tokens.json in the W3C shapes (sRGB colour objects, {value, unit} lengths, fontFamily lists); what has no shape is named | 205 |
| `generate.test.mjs` | holds those shapes | 205 |
| `scenes.mjs` | on glass a column takes the board's width, so a kit's own responsive rules fold it | 206 |
| `parts.mjs`, `scenes.mjs` | eight new parts; the screens are overview, list and detail, form, sign in, on top, loading and empty | 211 |
| `wall-bindings.mjs` | the eight parts in every kit; a field's error and secret, a button's disabled | 211 |
| `antd-tree.mjs`, `antd-nodes.mjs`, `antd-render.mjs` | the eight parts rendered by antd; a refresh keeps the antd version; a menu sits in its reserved room | 211 |
| `material-elements.mjs` | md-circular-progress, md-elevation and the segmented button set in the bundle | 211 |
| `icon-sets.mjs` | chevron-left, chevron-right, x and loader-circle in every set | 211 |
| `kit-defaults.mjs`, `kit-defaults.test.mjs` | Tailwind's status colours, read from red-600, green-600, amber-500 | 211 |
| `generate.mjs` | the new gaps named | 211 |
| `scenes.mjs` | the screens are Ledgeway's pages: a shell, a bare sign-in page, no captions, phone rules | 212 |
| `parts.mjs`, `wall-bindings.mjs` | the layer part with each kit's scrim; grid tracks; the mark in every navbar | 212 |
| `antd-tree.mjs` | the mark; the header inside a Layout, light | 212 |
| `icon-sets.mjs` | users, receipt and settings in every set | 212 |
| `kit-defaults.mjs`, `kit-defaults.test.mjs` | Tailwind's surface, read from white | 212 |
| `wall-bindings.mjs` | shadcn's classes merged by tailwind-merge, as their cn() does; field, fields and a titled panel in every kit, shadcn's in their Field and Card anatomy; a kit's frame, shadcn's their Sidebar, SiteHeader and inset; a stat as their SectionCards card; the avatar at a top bar's end | 213 |
| `scenes.mjs` | the shell's nodes carry the user and the page's title; a side frame; Sign in, Settings and the dashboard's cards in fields and titled panels | 213 |
| `parts.mjs`, `icon-sets.mjs` | field and fields; panel-left and ellipsis-vertical in every set | 213 |
| `antd-tree.mjs`, `antd-nodes.mjs` | field and fields as their Form.Item; a panel's title and link; the avatar at the header's end | 213 |
| `parts.mjs` | render() hands a node inside a table cell or a card's head to the part as markup (inProps, cellOf); trending-up and trending-down for every kit | 214 |
| `scenes.mjs` | layers that open and close (LAYER_SCRIPT); the account menu and notifications on every shell page; a row's menu, the void dialog and its toast; the whole dashboard; On top removed | 214 |
| `wall-bindings.mjs` | a layer's id, opener and place (anchor, side, centre, corner); a menu without a trigger and with a plain end item; a stat's trend; table cells and a panel's aside as nodes; a chart's height | 214 |
| `antd-tree.mjs` | the same for Ant: a hidden trigger, the end item, a stat's Tag, nodes in cells and in a card's head | 214 |
| `icon-sets.mjs`, `kit-defaults.mjs` | trending-down in every set; Tailwind's onBrand from white, read as a colour | 213, 214 |
| `parts.mjs`, `antd-nodes.mjs` | drawer and command; a part's foot as a node | 214 |
| `wall-bindings.mjs`, `antd-tree.mjs` | drawer and command in every kit: shadcn's Sheet and CommandDialog, Bootstrap's offcanvas, Mantine's Drawer, Ant's Drawer panel, composed elsewhere; a centred layer near the top, its width, a key | 214 |
| `kits/shadcn.json` | re-read with sheet, command, popover, calendar and input-group | 214 |
| `generate.mjs` | the drawer and command gaps named | 214 |
| `scenes.mjs` | New invoice; Settings with the plan, members and an invite drawer; Expenses in use | 214 |
| `wall-bindings.mjs`, `antd-tree.mjs` | a field's type; a grid's align; Ant's Form.Item vertical on the item | 214 |
| `generate.mjs` | OWN_PACKAGE: a kit's own chart, toast or command named instead of "do not install"; the heading without the body's line height; the spacing as turned; signed UISandbox; no dashes in the generated copy; shadcn's emitter takes the values, so a chosen family replaces init's Geist in `@theme`; daisyUI's theme carries the chosen families in Tailwind's `@theme` with one heading rule; no dash in the Ant header or in the kits' own descriptions (kits/*.json) | 216 |
| `kits/shadcn.json`, `kits/antd.json`, `kits/antd.render.*`, `kits/material.elements.json` | refetched and re-rendered for the new parts | 211 |
| `scenes.mjs` | the fallback font on :where(html), not #strip: a kit's own body font reaches its wall | 207 |
| `kit-defaults.mjs` | each default read from the variable the build writes it into (daisyUI radius, Ant Design ink and muted ink); TABLE exported | 207 |
| `kit-defaults.test.mjs` | new: holds that rule, with the exceptions named | 207 |
| `kits/shadcn.json` | re-read as shadcn 4.22.1 `init --defaults` installs it: preset base-nova (Base UI, Geist, the multiplying radius scale), the parts from the files `shadcn add` writes; by `scripts/kit-shadcn.mjs`, not by hand | 208 |
| `registry-read.mjs` | new here (it stayed behind in `dsg/` with `fetch-kits.mjs`): STYLE base-nova, Base UI's useRender slots, render-prop parts, inner elements, `readInstalled` | 208 |
| `generate.mjs` | shadcn: init's own @theme inline (Geist, radius scale) in the bridge, `html { @apply font-sans }`, components.json in the kit's style, the real init command | 208 |
| `build-css.mjs` | shadcn compiles with `shadcn/tailwind.css` (the data-checked, data-open variants) | 208 |
| `wall-bindings.mjs` | shadcn markup in Base UI's attributes (data-checked, data-open, data-active, data-orientation); the select indicator and the radio dot from their source | 208 |
| `zip.mjs` | takes bytes as well as text, for the kit fonts | 208 |
| `scenes.mjs` | the fallback letter in the layer us-fallback, declared before the kit's sheet, so Tailwind's layered base wins | 208 |
| `generate.test.mjs`, `wall.test.mjs` | shadcn's behaviour is @base-ui/react; its buttons are h-8 | 208 |
| `wall-bindings.mjs` | daisyUI's stat carries its trend as its own stat-desc inside .stat (withTrend skips it), bordered and full width; its list rows drop their side padding inside a card | 216 |

The byte-for-byte rule above still holds for what it was for: the tests were
not edited on the way across. A test changed from here on is changed here,
with a reason in the decisions, like any other file of this repo.
