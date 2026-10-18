/**
 * THE ROLES — the one opinion this product is allowed to have.
 *
 * We own no palette, no type scale and no defaults. What we do own is the
 * question: which handful of things is worth a knob? That IS a judgement, and
 * pretending otherwise would leave a tool with a thousand fields and no answer.
 *
 * Everything else here is routing. A role names a job — "the brand colour",
 * "the line between things" — and each kit says which of ITS variables does
 * that job. Turn one knob and every enabled kit is written in its own
 * vocabulary. We never invent a token; we address theirs.
 *
 * Two traps live in this table, and both are why it is a table and not a guess:
 *
 *   · daisyUI's `--border` is a WIDTH. shadcn's `--border` is a COLOUR. Same
 *     name, different quantity — read one as the other and the export is broken
 *     in a way nothing warns about.
 *   · Tailwind has no semantic roles at all. Its palette is `--color-sky-600`,
 *     not `--color-primary`, so "brand" there means writing a NEW variable the
 *     user's own utilities reference. That is a different kind of routing and
 *     it is marked as such.
 */

import { hexToOklch, oklchToHex, oklchStrToHex } from './color.mjs'

export const ROLES = [
  { id: 'brand',    label: 'Brand',        kind: 'colour', what: 'the colour a primary action wears' },
  { id: 'onBrand',  label: 'On brand',     kind: 'colour', what: 'text and icons on top of the brand colour', derived: true },
  { id: 'page',     label: 'Page',         kind: 'colour', what: 'the ground everything sits on' },
  { id: 'surface',  label: 'Surface',      kind: 'colour', what: 'a card or panel lifted off the page' },
  { id: 'ink',      label: 'Ink',          kind: 'colour', what: 'body text' },
  { id: 'inkMuted', label: 'Muted ink',    kind: 'colour', what: 'secondary text' },
  { id: 'line',     label: 'Line',         kind: 'colour', what: 'the border between things' },
  { id: 'success',  label: 'Success',      kind: 'colour', what: 'the colour that says it worked' },
  { id: 'warning',  label: 'Warning',      kind: 'colour', what: 'the colour that says look again' },
  { id: 'danger',   label: 'Danger',       kind: 'colour', what: 'the colour that says it failed' },
  { id: 'fontHeading', label: 'Headings', kind: 'font', what: 'the family headings are set in' },
  { id: 'fontBody',    label: 'Body',     kind: 'font', what: 'the family everything else is set in' },
  { id: 'focus',    label: 'Focus ring',   kind: 'colour', what: 'the ring that says where the keyboard is' },
  { id: 'elevation', label: 'Elevation',   kind: 'ratio',  what: 'how strongly things lift off the page' },
  { id: 'lineHeight',   label: 'Line height',    kind: 'number', what: 'how much air sits between lines of body text' },
  { id: 'letterSpacing', label: 'Letter spacing', kind: 'length', what: 'how tightly the letters sit together' },
  { id: 'fontWeight',    label: 'Heading weight', kind: 'number', what: 'how heavy headings are set' },
  { id: 'borderWidth',   label: 'Border width',   kind: 'length', what: 'how thick a border is drawn' },
  { id: 'space',    label: 'Spacing',      kind: 'ratio',  what: 'how much room everything gets, as a multiple of the kit\'s own step' },
  { id: 'radius',   label: 'Corner radius', kind: 'length', what: 'how round a box is' },
  { id: 'baseText', label: 'Base text',    kind: 'length', what: 'the size body text is set at' },
]

/* kit → role → the variable that does that job.
 *   `new: true`  the kit has no variable for this role; we add one, and the
 *                export tells you to reference it.
 *   `also`       further variables the same knob has to keep in step. */
/* Their seeds are numbers. `10px` is a length to us and nothing to them. */
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null }
const px = (v) => num(v)

export const MAP = {
  tailwind: {
    _note: 'Tailwind ships a palette, not roles. Semantic names are added under @theme and its utilities pick them up.',
    brand:    { var: '--color-brand', new: true },
    onBrand:  { var: '--color-brand-foreground', new: true },
    page:     { var: '--color-page', new: true },
    surface:  { var: '--color-surface', new: true },
    ink:      { var: '--color-ink', new: true },
    inkMuted: { var: '--color-ink-muted', new: true },
    line:     { var: '--color-line', new: true },
    radius:   { var: '--radius-lg', also: ['--radius-md', '--radius-sm'] },
    baseText: { var: '--text-base' },
    fontBody: { var: '--font-sans' },
    fontHeading: { var: '--font-heading', new: true },
    success:  { var: '--color-success', new: true },
    warning:  { var: '--color-warning', new: true },
    danger:   { var: '--color-danger', new: true },
    /* ONE unit. Tailwind computes every spacing utility as
       calc(var(--spacing) * n), so this single value moves p-4, gap-6, the lot. */
    space:    { var: '--spacing', scale: true },
    focus:    { var: '--color-ring', new: true },
    /* Tailwind INLINES the shadow into the utility at build time:
       .shadow-sm carries `0 1px 3px 0 var(--tw-shadow-color, #0000001a)` and
       never reads var(--shadow-sm). So the variable is a build input, the same
       answer Bootstrap's brand gives, and a running page cannot show it. */
    elevation: { shadows: ['--shadow-2xs', '--shadow-xs', '--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-xl', '--shadow-2xl'],
                 needsBuild: { where: 'theme.css', sass: '--shadow-*',
                   why: 'Tailwind compiles each shadow utility from the theme, so the new values only appear after its build runs again' } },
    /* No standalone leading token: Tailwind carries a line height per type step.
       This is the body one; the other steps keep their own, which is deliberate
       on their part. And its border utilities carry a fixed 1px, so there is
       nothing to write for a border width. */
    lineHeight:   { var: '--text-base--line-height',
                    /* every step, because Tailwind pairs each size with its own
                       leading and a screen is mostly text-sm */
                    also: ['--text-xs--line-height', '--text-sm--line-height', '--text-lg--line-height',
                           '--text-xl--line-height', '--text-2xl--line-height', '--text-3xl--line-height'] },
    letterSpacing: { var: '--tracking-normal' },
    fontWeight:   { var: '--font-weight-strong', new: true },
    borderWidth:  null,
  },
  radix: {
    _note: 'Radix does not take values, it takes CHOICES from sets it publishes: named accent scales, named grey scales, five radius settings and five scaling steps. Only the page and panel colours are really variables. Every scale is twelve hand-built steps, so a single step written by hand is eleven steps out of step. The knobs are matched to the nearest published set instead, and the manifest names it.',
    brand:    { choice: 'brand' },
    onBrand:  { derives: 'brand' },
    page:     { var: '--color-background' },
    surface:  { var: '--color-panel-solid', also: ['--color-surface'] },
    ink:      { choice: 'ink' },
    inkMuted: { derives: 'ink' },
    line:     { derives: 'ink' },
    radius:   { choice: 'radius' },
    baseText: { choice: 'baseText' },
    fontBody: { var: '--default-font-family' },
    fontHeading: { var: '--heading-font-family' },
    /* Radix has no semantic variables at all: a green badge is
       <Badge color="green">, so each tone is another CHOICE from its accents. */
    success:  { choice: 'brand', attr: 'tone' },
    warning:  { choice: 'brand', attr: 'tone' },
    danger:   { choice: 'brand', attr: 'tone' },
    /* Radix scales type and space with ONE setting, so the size choice already
       moved the space scale — there is nothing separate to set. */
    space:    { derives: 'baseText' },
    /* --focus-1..12 ARE the accent scale: Radix's focus ring follows the accent
       you chose, so there is nothing separate to set. */
    focus:    { derives: 'brand' },
    /* and its shadows are built from --gray-a* and colour-mix(): the alpha
       lives in a variable, so there is no strength in the string to scale. */
    elevation: null,
    /* Radix's line heights are LENGTHS on its type scale, so the size choice
       already moved them. Its letter spacing is a per-step offset, and step 3
       is the body one. Its headings wear its published bold step — there is no
       separate heading weight to set. */
    lineHeight:   { derives: 'baseText' },
    letterSpacing: { var: '--letter-spacing-3' },
    fontWeight:   null,
    borderWidth:  null,
  },
  mantine: {
    _note: 'Semantic variables throughout, and all settable at runtime. Its COMPONENT class names are content hashes, which is a separate problem and not this table\'s.',
    /* the light trio and the anchor are steps of the SAME family — blue-1,
       blue-2, blue-8 and blue-6 in their published theme — so they follow the
       brand through their own ramp relationship. Without them every Anchor,
       every light Badge and the active NavLink stayed factory blue while the
       buttons moved. */
    brand:    { var: '--mantine-primary-color-filled',
                also: ['--mantine-primary-color-filled-hover'],
                tint: ['--mantine-primary-color-light', '--mantine-primary-color-light-hover',
                       '--mantine-primary-color-light-color', '--mantine-color-anchor'] },
    onBrand:  { var: '--mantine-primary-color-contrast' },
    page:     { var: '--mantine-color-body' },
    surface:  { var: '--mantine-color-default' },
    ink:      { var: '--mantine-color-text' },
    inkMuted: { var: '--mantine-color-dimmed' },
    line:     { var: '--mantine-color-default-border' },
    radius:   { var: '--mantine-radius-default', also: ['--mantine-radius-xs', '--mantine-radius-sm', '--mantine-radius-md', '--mantine-radius-lg', '--mantine-radius-xl'] },
    baseText: { var: '--mantine-font-size-md', also: ['--mantine-font-size-xs', '--mantine-font-size-sm', '--mantine-font-size-lg', '--mantine-font-size-xl'] },
    fontBody: { var: '--mantine-font-family' },
    fontHeading: { var: '--mantine-font-family-headings' },
    success:  { var: '--mantine-color-success' },
    warning:  null,
    danger:   { var: '--mantine-color-error' },
    /* --mantine-scale is a bare multiplier they publish for exactly this. */
    space:    { var: '--mantine-scale', scale: true },
    focus:    null,
    elevation: { shadows: ['--mantine-shadow-xs', '--mantine-shadow-sm', '--mantine-shadow-md', '--mantine-shadow-lg', '--mantine-shadow-xl'] },
    lineHeight:   { var: '--mantine-line-height',
                    /* its headings carry their own, and a table cell reads the
                       size-matched one rather than the base */
                    also: ['--mantine-line-height-xs', '--mantine-line-height-sm', '--mantine-line-height-md',
                           '--mantine-line-height-lg', '--mantine-line-height-xl',
                           '--mantine-h1-line-height', '--mantine-h2-line-height', '--mantine-h3-line-height',
                           '--mantine-h4-line-height', '--mantine-h5-line-height', '--mantine-h6-line-height'] },
    letterSpacing: null,
    /* Their Title writes --title-fw: var(--mantine-h<n>-font-weight), one per
       level — not the theme-wide name. Routing to that name alone left every
       heading at 700 whatever the knob said, so the six travel with it. */
    fontWeight:   { var: '--mantine-heading-font-weight',
                    also: ['--mantine-h1-font-weight', '--mantine-h2-font-weight', '--mantine-h3-font-weight',
                           '--mantine-h4-font-weight', '--mantine-h5-font-weight', '--mantine-h6-font-weight'] },
    borderWidth:  null,
  },
  openprops: {
    _note: 'Scales, plus the small semantic layer its normalize ships. Open Props renders nothing itself: it sits under whatever does, so your own CSS agrees with the kit above it.',
    brand:    { var: '--brand', new: true, also: ['--link'] },
    onBrand:  { var: '--surface-1', new: true },
    page:     { var: '--surface-1' },
    surface:  { var: '--surface-2', also: ['--surface-3'] },
    ink:      { var: '--text-1' },
    inkMuted: { var: '--text-2' },
    line:     { var: '--surface-4' },
    radius:   { var: '--radius-2', also: ['--radius-1', '--radius-3'] },
    baseText: { var: '--font-size-1', also: ['--font-size-0', '--font-size-2', '--font-size-3'] },
    fontBody: { var: '--font-sans' },
    fontHeading: { var: '--font-heading', new: true },
    success:  { var: '--success', new: true },
    warning:  { var: '--warning', new: true },
    danger:   { var: '--danger', new: true },
    space:    { var: '--size-3', scale: true,
                also: ['--size-1', '--size-2', '--size-4', '--size-5', '--size-6', '--size-7', '--size-8', '--size-9'] },
    focus:    null,
    /* Open Props publishes the knob itself: one strength every shadow reads. */
    elevation: { shadows: ['--shadow-strength'] },
    lineHeight:   { var: '--font-lineheight-3',
                    also: ['--font-lineheight-0', '--font-lineheight-1', '--font-lineheight-2', '--font-lineheight-4', '--font-lineheight-5'] },
    /* its letter-spacing scale starts at -.05em and has no zero anchor */
    letterSpacing: null,
    fontWeight:   { var: '--font-weight-7' },
    borderWidth:  { var: '--border-size-1', also: ['--border-size-2', '--border-size-3'] },
  },
  shadcn: {
    _note: 'Semantic variables by design, unprefixed. --border here is a COLOUR.',
    brand:    { var: '--primary' },
    onBrand:  { var: '--primary-foreground' },
    page:     { var: '--background' },
    surface:  { var: '--card', also: ['--popover'] },
    ink:      { var: '--foreground', also: ['--card-foreground', '--popover-foreground'] },
    inkMuted: { var: '--muted-foreground' },
    line:     { var: '--border', also: ['--input'] },
    radius:   { var: '--radius' },
    baseText: null,     // shadcn inherits type from your Tailwind setup
    /* rides on Tailwind, so the family is the base's --font-sans; a variable of
       its own would be a second place for the same answer to live */
    fontBody: { inherits: 'the base' },
    fontHeading: { inherits: 'the base' },
    /* shadcn ships ONE semantic colour. There is no success and no warning in
       its registry, and adding two would be inventing names its components do
       not read — so it says so instead. */
    success:  null,
    warning:  null,
    danger:   { var: '--destructive' },
    space:    { inherits: 'the base' },
    focus:    { var: '--ring' },
    elevation: { inherits: 'the base' },
    lineHeight:   { inherits: 'the base' },
    letterSpacing: { inherits: 'the base' },
    fontWeight:   { inherits: 'the base' },
    borderWidth:  { inherits: 'the base' },
  },
  bootstrap: {
    _note: 'Runtime-themeable for surface, ink, line, radius and type: --bs-border-radius alone is read 105 times. But the BRAND is compiled: .btn-primary hard-codes #0d6efd and `var(--bs-primary)` appears zero times in Bootstrap\'s own stylesheet, so --bs-primary is informational. Changing it for real is a Sass rebuild.',
    /* rgb too: .bg-primary and .text-bg-primary read rgba(var(--bs-primary-rgb));
       without the triple they keep the compiled colour while every button moves,
       which is how the wall got violet buttons over teal chart bars */
    brand:    { var: '--bs-link-color', also: ['--bs-primary'], rgb: ['--bs-primary-rgb'],
                needsBuild: { sass: '$primary', why: 'component colours are compiled; setting --bs-primary alone changes links and nothing else' } },
    onBrand:  { needsBuild: { sass: '$primary-text-emphasis', why: 'the same, compiled into each component' } },
    /* secondary-bg is NOT an alias of the page: it is the colour of every track
       and rail — form-range, progress, disabled fields. Stock keeps it a step
       darker than the body (#fff → #e9ecef), and writing a near-white page into
       it erased every slider track on the wall. tint keeps their step. */
    page:     { var: '--bs-body-bg', tint: ['--bs-secondary-bg'], rgb: ['--bs-body-bg-rgb'] },
    surface:  { var: '--bs-tertiary-bg' },
    ink:      { var: '--bs-body-color', also: ['--bs-emphasis-color'] },
    inkMuted: { var: '--bs-secondary-color', also: ['--bs-tertiary-color'] },
    line:     { var: '--bs-border-color' },
    radius:   { var: '--bs-border-radius',
                also: ['--bs-border-radius-sm', '--bs-border-radius-lg', '--bs-border-radius-xl', '--bs-border-radius-xxl'] },
    baseText: { var: '--bs-body-font-size' },
    fontBody: { var: '--bs-body-font-family', also: ['--bs-font-sans-serif'] },
    fontHeading: { needsBuild: { sass: '$headings-font-family',
      why: 'Bootstrap has no --bs variable for a heading family; it is compiled from Sass like the brand colour' } },
    success:  { var: '--bs-success', rgb: ['--bs-success-rgb'],
                /* the same answer its brand colour gives: btn-success and
                   alert-success carry compiled literals, so the variable alone
                   moves the emphasis text and leaves every component alone */
                needsBuild: { sass: '$success', why: 'Bootstrap compiles its component colours; setting --bs-success alone changes the emphasis text and nothing else' },
                tint: ['--bs-success-text-emphasis', '--bs-success-bg-subtle', '--bs-success-border-subtle'] },
    warning:  { var: '--bs-warning', rgb: ['--bs-warning-rgb'],
                /* the same answer its brand colour gives: btn-warning and
                   alert-warning carry compiled literals, so the variable alone
                   moves the emphasis text and leaves every component alone */
                needsBuild: { sass: '$warning', why: 'Bootstrap compiles its component colours; setting --bs-warning alone changes the emphasis text and nothing else' },
                tint: ['--bs-warning-text-emphasis', '--bs-warning-bg-subtle', '--bs-warning-border-subtle'] },
    danger:   { var: '--bs-danger', rgb: ['--bs-danger-rgb'],
                /* the same answer its brand colour gives: btn-danger and
                   alert-danger carry compiled literals, so the variable alone
                   moves the emphasis text and leaves every component alone */
                needsBuild: { sass: '$danger', why: 'Bootstrap compiles its component colours; setting --bs-danger alone changes the emphasis text and nothing else' },
                tint: ['--bs-danger-text-emphasis', '--bs-danger-bg-subtle', '--bs-danger-border-subtle'] },
    /* $spacer is 1rem, not 1: the knob is a multiplier and Sass wants a length.
       Passing the bare number compiled `.alert{--bs-alert-padding-y:1}` and the
       padding collapsed to zero — every $spacer-derived inset with it. */
    space:    { needsBuild: { sass: '$spacer', from: (v) => `${parseFloat(v) || 1}rem`,
                why: 'Bootstrap has no spacing variable at runtime; p-3 and gap-4 are compiled from $spacer' } },
    focus:    { var: '--bs-focus-ring-color', alphaFrom: '--bs-focus-ring-opacity' },
    elevation: { shadows: ['--bs-box-shadow', '--bs-box-shadow-sm', '--bs-box-shadow-lg', '--bs-box-shadow-inset'] },
    lineHeight:   { var: '--bs-body-line-height' },
    letterSpacing: null,
    fontWeight:   { needsBuild: { sass: '$headings-font-weight', why: 'Bootstrap compiles its heading weight; there is no --bs variable for it' } },
    borderWidth:  { var: '--bs-border-width' },
  },
  material: {
    _note: 'M3 takes ONE input. Its 47 colour roles (containers, on-colours, inverses, fixed variants) are computed from a seed by material-color-utilities, and the tonal surface ramp is an elevation model, not a set of siblings. So the other colour knobs do not reach this kit, and we say so instead of writing four of forty-seven and calling it themed.',
    brand:    { var: '--md-sys-color-primary', seeds: '@material/material-color-utilities' },
    onBrand:  { derives: 'brand' },
    page:     { derives: 'brand' },
    surface:  { derives: 'brand' },
    ink:      { derives: 'brand' },
    inkMuted: { derives: 'brand' },
    line:     { derives: 'brand' },
    /* @material/web ships two shape vocabularies and its components read the
     * OLDER one. labs/gb publishes corner-xs … corner-xxl; every element in the
     * package reads corner-extra-small … corner-extra-large. We routed to the
     * labs names, so the corner-radius knob wrote six variables that Google
     * publishes and Google's own components ignore — it moved nothing. Found by
     * counting reads in their bundle, not by looking at a button.
     * Both are written, because both are theirs and a later release will read
     * the short ones; the route points at the pair that works today. */
    radius:   { var: '--md-sys-shape-corner-medium',
                also: ['--md-sys-shape-corner-extra-small', '--md-sys-shape-corner-small',
                       '--md-sys-shape-corner-large', '--md-sys-shape-corner-extra-large',
                       '--md-sys-shape-corner-xs', '--md-sys-shape-corner-sm', '--md-sys-shape-corner-md',
                       '--md-sys-shape-corner-lg', '--md-sys-shape-corner-xl', '--md-sys-shape-corner-xxl'] },
    baseText: null,
    /* Material is the one kit that names both halves outright: plain for body,
       brand for headings. Its typescale reads them, so setting these two moves
       every one of its fifteen text styles. */
    fontBody: { var: '--md-ref-typeface-plain' },
    fontHeading: { var: '--md-ref-typeface-brand' },
    /* M3 has exactly one semantic colour role. Not an oversight on our part:
       the specification has error and no success or warning at all. */
    success:  null,
    warning:  null,
    /* M3 derives an error role from the seed like everything else, but its API
       takes a custom error colour, so this knob is allowed to replace it. The
       manifest says the derivation was overridden rather than pretending the
       two never met. */
    danger:   { var: '--md-sys-color-error', overrides: 'the scheme its generator derives from your seed',
                tint: ['--md-sys-color-on-error', '--md-sys-color-error-container', '--md-sys-color-on-error-container'] },
    /* M3 publishes colour and shape tokens and no spacing scale at all. */
    space:    null,
    focus:    null,
    elevation: null,
    /* Its typescale carries a line height and a weight per style, both as
       lengths derived from the shorthand it publishes — there is no single
       ratio to set. And M3 specifies no border width at all. */
    lineHeight:   null,
    letterSpacing: null,
    fontWeight:   null,
    borderWidth:  null,
  },
  antd: {
    _note: 'Ant Design publishes no stylesheet and no theme file: 3,056 class rules that read 1,289 variables, and every one of those variables is computed at runtime by its own algorithm out of a handful of SEED tokens. So the knobs here are not variables to write, they are arguments to hand their generator: the same relationship as Material, one layer deeper. The variable each one lands in is named so the swatch can show it, but writing that variable on its own would move one value and leave the two hundred it derives behind.',
    /* INFO FOLLOWS PRIMARY, because Ant says so. Rendered untouched, their own
       defaults put colorPrimary, colorInfo and the progress track all at
       #1677ff: one value under three names. Writing only colorPrimary breaks a
       relationship they publish, and the visible cost was the progress bars,
       the only ones on the whole wall that stayed a kit's factory blue while
       every other kit followed the knob.
       The four siblings are what their algorithm derives from colorInfo. Their
       --ant-blue scale is NOT here: that is a fact about their palette, and
       renaming blue to violet would be a lie. */
    brand:    { var: '--ant-color-primary', seed: ['colorPrimary', 'colorInfo'], seeds: 'antd',
                also: ['--ant-color-info', '--ant-color-info-text', '--ant-color-link',
                       '--ant-progress-default-color'] },
    /* Their algorithm decides what goes on top of the brand — it has a whole
       token for it, colorTextLightSolid — so this is not ours to set. */
    onBrand:  { derives: 'brand' },
    page:     { var: '--ant-color-bg-base', seed: 'colorBgBase' },
    surface:  { var: '--ant-color-bg-container', seed: 'colorBgContainer' },
    ink:      { var: '--ant-color-text-base', seed: 'colorTextBase' },
    inkMuted: { var: '--ant-color-text-secondary', seed: 'colorTextSecondary' },
    line:     { var: '--ant-color-border', seed: 'colorBorder' },
    success:  { var: '--ant-color-success', seed: 'colorSuccess' },
    warning:  { var: '--ant-color-warning', seed: 'colorWarning' },
    danger:   { var: '--ant-color-error', seed: 'colorError' },
    /* Their focus ring is the brand at a lighter step — colorPrimaryBorder —
       and there is no separate input for it. */
    focus:    { derives: 'brand' },
    /* Their seeds are NUMBERS of pixels, not lengths: borderRadius is 6, not
       6px. A length written straight in would be dropped by their algorithm
       without a word. */
    radius:   { var: '--ant-border-radius', seed: 'borderRadius', from: px },
    baseText: { var: '--ant-font-size', seed: 'fontSize', from: px },
    borderWidth: { var: '--ant-line-width', seed: 'lineWidth', from: px },
    lineHeight: { var: '--ant-line-height', seed: 'lineHeight', from: num },
    fontWeight: { var: '--ant-font-weight-strong', seed: 'fontWeightStrong', from: num },
    fontBody: { var: '--ant-font-family', seed: 'fontFamily' },
    /* One family, for everything. antd's Typography.Title is set in the same
       fontFamily as its body text and there is no second token. */
    fontHeading: null,
    /* Their whole spacing scale is sizeUnit multiplied by sizeStep, so the
       ratio knob multiplies the unit and the scale follows.
       NO VARIABLE. Their generator publishes --ant-size-unit and then bakes
       every size it derives as a literal, so nothing reads it — and naming it
       here wrote a bare ratio into a length and then reported the knob as
       doing nothing. The token IS the answer; there is no variable to name. */
    space:    { seed: 'sizeUnit', from: (v) => 4 * (num(v) ?? 1) },
    /* Three published shadow strings, taken as strings and re-alpha'd the same
       way every other kit's are. Their algorithm has no strength input. */
    elevation: { shadows: ['--ant-box-shadow', '--ant-box-shadow-secondary', '--ant-box-shadow-tertiary'] },
    /* Ant Design specifies no letter spacing at all. */
    letterSpacing: null,
  },
  daisyui: {
    _note: 'Registers into Tailwind\'s --color-* namespace on purpose. --border here is a WIDTH, not a colour.',
    brand:    { var: '--color-primary' },
    onBrand:  { var: '--color-primary-content' },
    page:     { var: '--color-base-100' },
    surface:  { var: '--color-base-200', also: ['--color-base-300'] },
    ink:      { var: '--color-base-content' },
    inkMuted: null,     // daisyUI has no muted ink; it dims base-content with opacity
    line:     null,     // no border COLOUR variable — --border is a width
    radius:   { var: '--radius-box', also: ['--radius-field', '--radius-selector'] },
    baseText: null,
    /* rides on Tailwind, so the family is the base's --font-sans; a variable of
       its own would be a second place for the same answer to live */
    fontBody: { inherits: 'the base' },
    fontHeading: { inherits: 'the base' },
    success:  { var: '--color-success', tint: ['--color-success-content'] },
    warning:  { var: '--color-warning', tint: ['--color-warning-content'] },
    danger:   { var: '--color-error', tint: ['--color-error-content'] },
    space:    { inherits: 'the base' },
    focus:    null,
    /* daisyUI publishes --depth, a 0/1 flag, not a shadow scale. */
    elevation: null,
    lineHeight:   { inherits: 'the base' },
    letterSpacing: null,
    fontWeight:   null,
    borderWidth:  { var: '--border' },
  },
}

/**
 * What each kit can and cannot take, said out loud rather than quietly dropped.
 *
 *   missing  the kit has no variable for this job at all
 *   added    the kit has no semantic name; we add one and the export says so
 *   derived  the kit COMPUTES this from another role, with its own generator —
 *            writing it ourselves would be overwritten, or would half-theme it
 */
export function coverage(kitId) {
  const m = MAP[kitId] ?? {}
  const missing = ROLES.filter((r) => m[r.id] === null).map((r) => r.id)
  const added = ROLES.filter((r) => m[r.id]?.new).map((r) => r.id)
  /* WHAT it is derived from, not just that it is: Material computes its
     colours from the brand seed, Radix ties its space scale to the size
     setting. One sentence for both was wrong for one of them. */
  const derived = ROLES.filter((r) => m[r.id]?.derives).map((r) => ({ role: r.id, from: m[r.id].derives }))
  /* A fourth answer, and the one people most need before they choose a kit:
     the kit CAN take this, but not while the page is running. The export
     carries a build-time line instead of a variable. */
  const needsBuild = ROLES.filter((r) => m[r.id]?.needsBuild)
    .map((r) => ({ role: r.id, ...m[r.id].needsBuild }))
  const seeds = Object.entries(m).filter(([, t]) => t?.seeds).map(([id, t]) => ({ role: id, by: t.seeds }))
  return { missing, added, derived, needsBuild, seeds, note: m._note }
}

/**
 * A length, including the ones a kit wraps in calc().
 *
 * Mantine publishes `calc(1rem * var(--mantine-scale))` and Radix
 * `calc(4px * var(--scaling))` — both are a real length multiplied by a knob
 * of their own. A regex that only matched a bare length read those as nothing,
 * so every Mantine radius and spacing sibling was reported as "no ratio could
 * be read" and left at its published value. The first length in the expression
 * is the one the ratio lives in; their multiplier stays theirs.
 */
const LEN = /^(?:calc\(\s*)?(-?[\d.]+)(rem|em|px)\b/
export const KIND = Object.fromEntries(ROLES.map((r) => [r.id, r.kind]))

/**
 * A colour and a length do not travel the same way.
 *
 * `also` for a COLOUR means "these must match" — a card and a popover are the
 * same surface, and writing one without the other is how a theme comes out
 * half-applied. `also` for a LENGTH means the opposite: those siblings are a
 * SCALE. daisyUI ships box 1rem, field 0.25rem, selector 0.5rem on purpose, and
 * Tailwind's sm/md/lg are a ramp. Writing one value into all three flattens a
 * decision the kit made — so the knob scales their ratio instead, and the ratio
 * is read from what they published rather than chosen by us.
 *
 * @param kits  the fetched kit documents, keyed by id — needed for those ratios
 */
/**
 * A kit that takes CHOICES, not values.
 *
 * Radix Themes has no brand variable: it has twenty-five hand-built accent
 * scales and you pick one. Writing our hex into --accent-9 would leave the
 * other eleven steps belonging to the previous accent — a half-applied theme,
 * the exact failure this project keeps finding. So the knob is matched to the
 * nearest thing the kit really offers, and the manifest names it.
 *
 * Colours are compared in OKLCH because that is where "nearest" means what a
 * person means by it; lengths are compared as numbers. Hue is weighted hardest:
 * a teal asked for and a teal given is the answer, a grey of the same lightness
 * is not.
 */
export function nearestChoice(want, choice) {
  const entries = Object.entries(choice?.of ?? {})
  if (!entries.length || want == null) return null
  if (choice.unit === 'colour') {
    /* hexToOklch returns a triple, not an object — reading .l/.c/.h off it gave
       NaN for every accent and the nearest colour to everything was amber. */
    const hex6 = /^#[0-9a-f]{6}$/i.test(String(want)) ? String(want) : null
    if (!hex6) return null
    const [aL, aC, aH] = hexToOklch(hex6)
    let best = null
    for (const [name, hex] of entries) {
      if (!/^#[0-9a-f]{6}$/i.test(hex)) continue
      const [bL, bC, bH] = hexToOklch(hex)
      let dh = Math.abs(aH - bH) % 360
      if (dh > 180) dh = 360 - dh
      /* Hue counts in proportion to how colourful BOTH are: a hard cut-off sent
         a grey brand to Radix's gold, because with hue switched off the two
         happened to sit at a similar lightness. Chroma outweighs lightness --
         asking for grey and being handed a mustard is the worse answer. */
      const hueWeight = Math.min(1, Math.min(aC, bC) / 0.06)
      const d = Math.hypot((aL - bL) * 1.5, (aC - bC) * 6, (dh / 180) * 4 * hueWeight)
      if (!best || d < best.d) best = { name, value: hex, d }
    }
    return best && { ...best, distance: Number(best.d.toFixed(3)) }
  }
  const w = parseFloat(want)
  if (!Number.isFinite(w)) return null
  let best = null
  for (const [name, v] of entries) {
    const n = parseFloat(v)
    if (!Number.isFinite(n)) continue
    const d = Math.abs(n - w)
    if (!best || d < best.d) best = { name, value: v, d }
  }
  return best && { ...best, distance: Number(best.d.toFixed(3)) }
}

/** Any published colour as OKLCH — kits write hex, oklch() or rgb(). */
function asOklch(value) {
  const v = String(value ?? '').trim()
  /* A translucent value is not a colour we can take a relationship out of.
     shadcn's dark --border is oklch(1 0 0 / 10%) — white at a tenth — and
     reading it as plain white produced a solid white border in dark mode.
     Refusing here makes the caller fall back to the kit's own value, which is
     the right answer for anything we cannot faithfully carry. */
  if (/\/|rgba\(|hsla\(|^#(?:[0-9a-f]{4}|[0-9a-f]{8})$/i.test(v)) return null
  /* AN OPAQUE rgb() IS A COLOUR. The refusal above is about ALPHA — a value we
     cannot carry a relationship through — and it used to catch every rgb() with
     it. Bootstrap's Sass writes its shades as rgb() with PERCENTAGES
     (rgb(3.67%, 36.67%, 46%) is its 15% shade of your brand), so the one kit
     whose own arithmetic we most wanted to read published it in the one form
     this function refused. */
  const rgb = /^rgb\(\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*\)$/i.exec(v)
  const ch = (x) => {
    const n = parseFloat(x)
    return Math.max(0, Math.min(255, Math.round(x.endsWith('%') ? (n / 100) * 255 : n)))
  }
  const hex = rgb ? '#' + [rgb[1], rgb[2], rgb[3]].map((x) => ch(x).toString(16).padStart(2, '0')).join('')
    : /^#[0-9a-f]{6}$/i.test(v) ? v
    : /^#[0-9a-f]{3}$/i.test(v) ? '#' + v.slice(1).split('').map((c) => c + c).join('')
    : v.startsWith('oklch') ? oklchStrToHex(v) : null
  return hex ? hexToOklch(hex) : null
}

/**
 * A SIBLING colour, written the way the kit itself relates it to its base.
 *
 * Bootstrap does not repeat --bs-success in --bs-success-bg-subtle; it publishes
 * a much lighter, much less saturated relative of it. daisyUI's -content is a
 * dark ink of the same hue. Material's error-container is a tonal step. Copy the
 * base into any of those and the subtle background becomes fully saturated and
 * the readable ink stops being readable.
 *
 * So the same rule the length scale already uses applies to colour: read the
 * kit's OWN published pair, take the relationship out of it, and put the new
 * value through it. Nothing here is a shade we invented — it is their shade
 * arithmetic, applied to your colour.
 */
export function relative(want, base, sibling) {
  const w = asOklch(want), b = asOklch(base), s = asOklch(sibling)
  if (!w || !b || !s) return null
  const dL = s[0] - b[0]
  /* An achromatic pair states nothing about chroma. shadcn's neutral registry
     has --primary at oklch(0.205 0 0) light and oklch(0.922 0 0) dark: taking
     0/0 as "remove all chroma" turned a teal brand into grey in dark mode. When
     they have no chroma to compare, yours is left alone. */
  const cRatio = b[1] > 0.01 ? s[1] / b[1] : 1
  /* hue follows the value you chose, not the hue their green happened to be */
  return inGamut(Math.min(1, Math.max(0, w[0] + dL)), Math.max(0, w[1] * cRatio), w[2])
}

/**
 * The same colour, but one sRGB can actually show.
 *
 * A teal pushed to shadcn's dark lightness sits outside sRGB, and converting it
 * anyway clips the channels — which does not dim the colour, it TURNS it: a
 * 224° teal came back at 196°, a hue nobody asked for. So chroma is walked down
 * until the colour fits and the hue survives. Lightness and hue are what was
 * asked for; chroma is the only part with room to give.
 */
function inGamut(l, c, h) {
  for (let i = 0; i <= 24; i++) {
    const kept = 1 - i / 24
    const hex = oklchToHex(l, c * kept, h)
    const back = hexToOklch(hex)
    let d = Math.abs(back[2] - h) % 360
    if (d > 180) d = 360 - d
    if (d < 2 || c * kept < 0.01) return { hex, kept: c < 0.01 ? 1 : kept }
  }
  return { hex: oklchToHex(l, 0, h), kept: 0 }
}

/** an alpha, scaled and kept inside the range it has to live in */
const alpha = (n, f) => String(Number(Math.min(1, Math.max(0, Number(n) * f)).toFixed(4)))

/** "r, g, b" — Bootstrap keeps a second copy in that format for rgba(). */
function asRgbTriple(value) {
  const hex = /^#[0-9a-f]{6}$/i.test(String(value)) ? String(value)
    : String(value).startsWith('oklch') ? oklchStrToHex(String(value)) : null
  if (!hex) return null
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')
}

/**
 * A starting value for a role, taken from the first kit that publishes one.
 *
 * The knobs have to open on something, and "something" must not be a colour we
 * chose. Every kit that has a success colour publishes it; this returns that
 * value and the name of the kit it came from, so the page can say so.
 */
export function seedFrom(roleId, kits, ids = Object.keys(kits)) {
  /* A colour comes back as hex because every knob downstream speaks hex. Every
     other kind comes back as the kit published it — a font stack, a length, a
     number — which is the only reason this works for the two font roles, and
     they need it: Tailwind compiles a utility only for a theme entry that
     exists, so a build with no --font-heading ships no .font-heading rule and
     that knob can never take effect however the page sets the variable later. */
  const colour = ROLES.find((x) => x.id === roleId)?.kind === 'colour'
  for (const id of ids) {
    const target = MAP[id]?.[roleId]
    if (!target?.var) continue
    const raw = kits[id]?.modes?.light?.[target.var]
    if (raw == null || raw === '') continue
    /* a kit that defines a role in terms of another of its own variables has
       published a POINTER, not a value; Material's heading face is
       var(--md-ref-typeface-plain), which means nothing outside Material. */
    if (String(raw).includes('var(')) continue
    if (!colour) return { value: raw, from: kits[id].name, variable: target.var }
    const hex = asOklch(raw) ? oklchToHex(...asOklch(raw)) : null
    if (hex) return { value: hex, from: kits[id].name, variable: target.var }
  }
  return null
}

/**
 * THE SAME VALUES, IN THE DARK.
 *
 * Nobody is going to set twenty colours twice, and inventing a dark palette
 * from a light one is the one thing this tool is not allowed to do. But every
 * kit here except Tailwind publishes BOTH modes, which means every kit has
 * already stated, variable by variable, what it does when the lights go out.
 *
 * So it is the rule this project keeps arriving at, a third time: read the
 * kit's own published pair, take the relationship out of it, and put your value
 * through it. shadcn turns a white --background into oklch(0.145 0 0); your
 * page colour gets the same treatment. A variable their dark block does not
 * mention is one they do not change, and it is left alone.
 *
 * A kit with no dark mode of its own gets no dark block, and the manifest says
 * which — guessing on its behalf would be exactly the invention we refuse.
 */
export function darken(routed, kits) {
  /* Mantine publishes half its pairs as POINTERS (--primary-color-light is
     var(--mantine-color-blue-light), three hops from a hex). A pointer pair
     reads as "not a colour", the dark set then carried their FACTORY pointer,
     our dark write never named those variables with real colours, and the
     baked light tints (the seed's violet) showed through every dark frame —
     which is exactly what the dark sweep caught on the rail. Resolve pointers
     inside their own mode's map first; only then judge the pair. */
  const solidIn = (map, v, hops = 0) => {
    if (hops > 6 || typeof v !== 'string') return v
    const m = /^var\((--[a-z0-9-]+)\s*(?:,\s*([^)]+))?\)$/i.exec(v.trim())
    if (!m) return v
    const next = map[m[1]] ?? m[2]
    return next == null ? v : solidIn(map, String(next), hops + 1)
  }
  return routed.map((r) => {
    const light = kits[r.kit]?.modes?.light ?? {}
    const dark = kits[r.kit]?.modes?.dark
    if (!dark) return { ...r, dark: null, noDarkMode: true }
    const vars = {}, greyscale = []
    for (const [name, value] of Object.entries(r.vars)) {
      /* absent from their dark block = unchanged by them */
      const theirDark = dark[name] == null ? null : solidIn(dark, dark[name])
      const theirLight = light[name] == null ? light[name] : solidIn(light, light[name])
      if (theirDark == null || theirDark === theirLight) { vars[name] = value; continue }

      /* A GREYSCALE pair says nothing about a colour.
       *
       * shadcn ships no brand colour: --primary is part of its neutral ramp and
       * simply inverts, oklch(0.205 0 0) to oklch(0.922 0 0). Putting a teal
       * through that lands past the top of the space, where no chroma survives
       * and the answer is white. That is not deriving their intent, it is
       * extrapolating from a statement they never made about colour — so the
       * value is carried across unchanged and the manifest says why. */
      const made = relative(value, theirLight, theirDark)
      /* a pair we cannot read as colour — a length, a keyword, a var() chain,
         anything translucent — is carried across as their own dark value
         rather than as our guess */
      if (!made) { vars[name] = theirDark; continue }
      /* And a relationship that does not FIT: if carrying the colour through it
         means giving up most of its chroma to stay inside sRGB, the answer is
         not their intent, it is a washed-out approximation of it. Measured, not
         guessed at with a threshold on how colourful something looks. */
      if (made.kept < 0.5) { vars[name] = value; greyscale.push(name); continue }
      vars[name] = made.hex
    }
    return { ...r, dark: vars, unfit: greyscale, greyscale, noDarkMode: false }
  })
}

export function route(values, kitIds, kits = {}) {
  return kitIds.map((id) => {
    const m = MAP[id]
    if (!m) throw new Error(`no role map for kit "${id}" — add one before listing it`)
    /* LIGHT, not every mode merged. Merging let the dark values win, so
       Bootstrap's own light→bg-subtle relationship was read off its DARK pair
       and every subtle background came out nearly black while every emphasis
       text came out pale — exactly inverted. The preview is light; the
       relationships have to be read from the same mode. */
    const defaults = kits[id]?.modes?.light ?? {}
    const vars = {}, unroutable = [], unscaled = [], chosen = [], attrs = {}, tokens = {}

    for (const role of ROLES) {
      const v = values[role.id]
      if (v == null) continue
      const target = m[role.id]
      if (!target) { unroutable.push(role.id); continue }
      /* A role this kit computes for itself is not ours to write. Setting four
         of Material's forty-seven colour roles and calling it themed is exactly
         the half-applied theme this whole file exists to prevent. */
      /* A RATIO, not a length.
       *
       * Spacing is the one knob that cannot be a number of ours: Tailwind's
       * step is 4px and Mantine's is 16px, so writing 12px into both would give
       * Tailwind a 48px padding where Mantine gets 12. What every kit here does
       * publish is a way to scale its OWN step — Mantine and Radix ship a bare
       * multiplier for exactly this — so the knob is a multiple and each kit
       * applies it to what it published. */
      /* A SHADOW is a composite string and no kit publishes a single number
       * for it. What every published shadow does have is a strength — the alpha
       * of its colour — so the knob is a multiple applied to the alphas in
       * their OWN string. Their shadow, your strength.
       *
       * Radix builds its shadows out of --gray-a5 and colour-mix(), where the
       * alpha lives in a variable rather than in the string; there is nothing
       * to scale, and that is reported instead of half-done. */
      if (target.shadows) {
        const f = parseFloat(v)
        if (!Number.isFinite(f)) { unroutable.push(role.id); continue }
        for (const name of target.shadows) {
          const own = String(defaults[name] ?? '')
          if (!own) { unscaled.push(name); continue }
          let touched = 0
          const made = own
            .replace(/(rgba?\([^)]*?[,/]\s*)([\d.]+)(\s*\))/gi, (_, a, n, b) => { touched++; return a + alpha(n, f) + b })
            .replace(/^([\d.]+)%$/, (_, n) => { touched++; return `${Number((Number(n) * f).toFixed(4))}%` })
          if (touched) vars[name] = made; else unscaled.push(name)
        }
        continue
      }
      if (target.scale) {
        const f = parseFloat(v)
        if (!Number.isFinite(f)) { unroutable.push(role.id); continue }
        for (const name of [target.var, ...(target.also ?? [])]) {
          const own = String(defaults[name] ?? '')
          const len = LEN.exec(own)
          if (len) { vars[name] = `${Number((Number(len[1]) * f).toFixed(4))}${len[2]}`; continue }
          const bare = Number(own)
          if (own.trim() !== '' && Number.isFinite(bare)) { vars[name] = String(Number((bare * f).toFixed(4))); continue }
          unscaled.push(name)
        }
        continue
      }
      /* AN ARGUMENT, NOT A VARIABLE.
         A kit that computes its whole theme from a few inputs takes the value
         at the top of its own pipeline; writing the variable that input lands
         in would set one value and leave everything derived from it behind.
         The variable is still written below, because it is the one the swatch
         names and because agreeing with their generator costs nothing.
         Called `tokens` and not `seeds`, because coverage() already answers a
         different question under that name — which role is derived by whose
         generator — and the spread below quietly won. */
      if (target.seed) {
        const made = target.from ? target.from(v) : v
        /* one role can be more than one seed: a kit that publishes two of its
           inputs at the same value has said they move together */
        if (made != null) for (const name of [target.seed].flat()) tokens[name] = made
      }
      if (target.derives) continue
      /* the layer under this one already answers it — not a gap, and not ours
         to write twice */
      if (target.inherits) continue
      /* the kit publishes a set for this job; take the nearest of what it has */
      if (target.choice) {
        const set = kits[id]?.choices?.[target.choice]
        const pick = nearestChoice(v, set)
        if (!pick) { unroutable.push(role.id); continue }
        /* `tone` means per-element, not per-theme: Radix re-tones one badge
           with data-accent-color on the badge. Writing all four into the theme
           root would have left the last one standing and silently replaced the
           brand accent with the danger one. */
        if (target.attr !== 'tone') attrs[set.attr] = pick.name
        chosen.push({ role: role.id, attr: target.attr === 'tone' ? 'tone' : set.attr,
          picked: pick.name, of: Object.keys(set.of).length,
          asked: v, got: pick.value, distance: pick.distance, why: set.why })
        continue
      }
      if (!target.var) continue            // build-time only; carried in the package, not as a variable
      /* Some roles are published TRANSLUCENT. Bootstrap's focus ring is its
         brand at a quarter — writing an opaque hex there gives a solid slab
         where a soft ring belongs. Their opacity, your colour. */
      if (target.alphaFrom) {
        const a = parseFloat(defaults[target.alphaFrom])
        const t = asRgbTriple(v)
        vars[target.var] = (Number.isFinite(a) && t) ? `rgba(${t}, ${a})` : v
      } else vars[target.var] = v

      /* the same colour in the format a second variable expects — writing a hex
         into --bs-success-rgb would leave every rgba(var(...), .5) invalid */
      for (const name of target.rgb ?? []) {
        const t = asRgbTriple(v)
        if (t) vars[name] = t; else unscaled.push(name)
      }
      /* And the relatives, through the kit's own arithmetic. A default here can
         be a POINTER — Mantine publishes --mantine-primary-color-light as
         var(--mantine-color-blue-light), three hops from a hex — so the chain
         is followed to the literal before the ratio is read. */
      const solid = (name, hops = 0) => {
        const raw = defaults[name]
        if (raw == null || hops > 6) return raw
        const m = /^var\((--[a-z0-9-]+)\)$/i.exec(String(raw).trim())
        return m ? solid(m[1], hops + 1) : raw
      }
      for (const name of target.tint ?? []) {
        const made = relative(v, solid(target.var), solid(name))
        if (made) vars[name] = made.hex; else unscaled.push(name)
      }

      const siblings = target.also ?? []
      /* A COLOUR's siblings must match it exactly; a length's keep their ratio.
       * A bare number — a line height of 1.55, a weight of 700 — is a scale
       * too, and Mantine publishes its five line heights as bare ratios. So the
       * ratio path takes both, and only colour copies. */
      if (KIND[role.id] === 'colour' || KIND[role.id] === 'font') { for (const extra of siblings) vars[extra] = v; continue }

      /* A bare number is a value for a NUMBER role and nothing for a length:
         `radius: '12'` has no unit, and accepting it would write --radius-md: 8
         into a stylesheet, which is not a radius. */
      const bare = KIND[role.id] === 'number'
      const num = (x) => {
        const m = LEN.exec(String(x ?? ''))
        if (m) return [Number(m[1]), m[2]]
        if (!bare) return null
        const t = String(x ?? '').trim()
        const n = Number(t)
        if (t !== '' && Number.isFinite(n)) return [n, '']
        /* Tailwind writes a line height as the division it means:
           calc(1.25 / 0.875). The first number is not the ratio — the quotient
           is — so the two simple calc forms are worked out rather than skipped. */
        const div = /^calc\(\s*([\d.]+)\s*([*/])\s*([\d.]+)\s*\)$/.exec(t)
        if (div) {
          const [, a, op, b] = div
          const v = op === '/' ? Number(a) / Number(b) : Number(a) * Number(b)
          return Number.isFinite(v) ? [Number(v.toFixed(4)), ''] : null
        }
        return null
      }
      const want = num(v)
      const base = num(defaults[target.var])
      for (const extra of siblings) {
        const own = num(defaults[extra])
        /* no published pair to take a ratio from → leave their value alone and
           say so, rather than overwrite a scale with a guess */
        if (!want || !base || !own || base[0] === 0) { unscaled.push(extra); continue }
        const scaled = (own[0] / base[0]) * want[0]
        vars[extra] = `${Number(scaled.toFixed(4))}${want[1]}`
      }
    }
    return { kit: id, vars, attrs, tokens, chosen, unroutable, unscaled, ...coverage(id) }
  })
}
