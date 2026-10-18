/**
 * ANT DESIGN, RENDERED BY ANT DESIGN.
 *
 * Every other kit in here publishes CSS you can read: a stylesheet, a theme
 * file, a registry of class strings. Ant Design publishes none of that. Its
 * styles are generated at runtime by its own React components, out of a token
 * pipeline that turns one seed into 443 map tokens, then into alias tokens,
 * then into a per-component token set for every component you actually use.
 * There is no file to read and no class list to copy — and copying its class
 * names by hand is exactly the imitation this project refuses to ship.
 *
 * So this runs it. React renders their real components into a real DOM, their
 * own extractStyle hands back the CSS that render produced, and what the wall
 * shows is markup Ant Design wrote about tokens Ant Design derived. It is the
 * same move as Material — call their generator rather than approximate it —
 * carried one step further, because Material at least ships elements.
 *
 * A REAL DOM, not a server render. renderToStaticMarkup returns the closed
 * state of everything: no open menu, no open select, no tab ink bar, because
 * every one of those is a portal that only exists once the component has
 * mounted. The wall is a page of components caught doing their job, so the
 * render happens in jsdom and the portals materialise.
 *
 * This file is BUNDLED — antd, React and jsdom go into one file with esbuild
 * and that file is what the build runs. It is never imported by the rest of
 * the project.
 *
 *   node antd-tree.mjs '<json>'    (or piped on stdin)
 *   { token, dark, nodes, icons } → { css, parts, classes }
 */
import { Window } from 'happy-dom'

/* ── a browser, before anything else imports React ────────────────────────
 * antd's own libraries read window, document and SVGElement while they LOAD,
 * not while they render, so the DOM has to exist before the imports below —
 * which is why those are dynamic imports and this one is not.
 *
 * happy-dom rather than jsdom, for one reason that only shows up when this
 * file is bundled: jsdom reads its default stylesheet off disk relative to its
 * own __dirname, and a bundle has no such directory. It went looking two
 * folders above the repository. happy-dom is all code and no assets, and
 * renders antd's portals identically. */
const win = new Window({ url: 'http://localhost' })
for (const k of Object.getOwnPropertyNames(win)) {
  if (k in globalThis) continue
  try { globalThis[k] = win[k] } catch { /* a getter-only global is one node already has */ }
}
globalThis.window = win
globalThis.document = win.document
Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true })
/* neither of these is in a headless DOM, and rc-* asks for both on mount */
globalThis.ResizeObserver = globalThis.ResizeObserver
  || class { observe() {} unobserve() {} disconnect() {} }
globalThis.matchMedia = win.matchMedia ? win.matchMedia.bind(win) : ((q) => ({
  matches: false, media: q, onchange: null,
  addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  dispatchEvent() { return false },
}))

const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { StyleProvider, createCache, extractStyle } = await import('@ant-design/cssinjs')
const antd = await import('antd')
const {
  ConfigProvider, Button, Input, Select, Checkbox, Radio, Switch, Slider, Tag, Alert, Statistic,
  Progress, Table, List, Descriptions, Avatar, Empty, Tabs, Layout, Menu, Breadcrumb, Dropdown,
  Card, Typography, Flex, Space, Divider,
} = antd

const e = React.createElement
const list = (v) => (Array.isArray(v) ? v : [])
const text = (v) => (v == null ? '' : String(v))

/* ── icons ────────────────────────────────────────────────────────────────
 * Handed in by the caller. A map value is either a lucide BODY (a string,
 * the old shape) or a whole glyph {body, box, stroke} from icon-sets.mjs —
 * which for Ant means Ant Design's own icons, read from @ant-design/icons-svg,
 * because a kit's own icons are part of what the kit looks like.
 *
 * React only gets a marker. The glyph is parsed as SVG and put in through the
 * DOM afterwards, in the same pass that settles the popups. */
let ICONS = {}
const icon = (name, size = 16) => (ICONS[name]
  ? e('span', { 'data-lucide': name, 'data-size': size, style: { display: 'inline-flex', width: size, height: size } })
  : null)

const parser = new win.DOMParser()
/* lucide hands over the BODY of an icon — the paths and circles — not a whole
   <svg>. The wall's own helper wraps it, and so does this, in the same wrapper
   with the same stroke, or antd's icons would be a different weight from every
   other kit's. (Read as a full document first, which parsed the body and threw
   the wrapper away: a chevron came out as a bare <path> and rendered nothing.) */
function drawIcons(root) {
  for (const slot of [...root.querySelectorAll('[data-lucide]')]) {
    const body = ICONS[slot.getAttribute('data-lucide')]
    if (!body) continue
    const size = slot.getAttribute('data-size') || '16'
    const g = typeof body === 'string' ? { body, box: '0 0 24 24', stroke: 1.75 } : body
    const paint = g.stroke
      ? ` fill="none" stroke="currentColor" stroke-width="${g.stroke}" stroke-linecap="round" stroke-linejoin="round"`
      : ' fill="currentColor"'
    const svg = `<svg width="${size}" height="${size}" viewBox="${g.box}"${paint} aria-hidden="true">${g.body}</svg>`
    const el = parser.parseFromString(svg, 'text/html').body.firstElementChild
    if (!el) continue
    slot.replaceChildren(document.importNode(el, true))
    slot.removeAttribute('data-size')
  }
}

/* Their tones, by their own names. `danger` is a property of a Button and a
   colour of a Tag, so the two tables are not the same table. */
const BTN = { brand: { type: 'primary' }, secondary: { type: 'default' },
  ghost: { type: 'text' }, danger: { type: 'primary', danger: true } }
const TAG = { neutral: 'default', brand: 'processing', success: 'success', warning: 'warning', danger: 'error' }
const ALERT = { neutral: 'info', brand: 'info', success: 'success', warning: 'warning', danger: 'error' }

/* ── the parts ────────────────────────────────────────────────────────────
 * Only what Ant Design actually ships. A stack, a row, a grid and the four
 * token specimens are not components of theirs and are not pretended to be:
 * they stay in the binding table as their variables on plain markup, which is
 * what the manifest says about them. */
const PART = {
  /* A panel is a Card and a rule is a Divider — both are components of theirs,
     so both are rendered rather than written. Hand-writing ant-card meant four
     class names in the markup that their own stylesheet had never been asked
     to produce, which the meter reported as ours, correctly.
     A CARD LEAVES A SLOT. It is the one part here that wraps anything at all,
     including the four token specimens that are not components of theirs — and
     a Card that rendered its own children swallowed a whole card of shapes and
     left an empty box. So it renders with a marker in it and the wall puts the
     children back. */
  panel: () => e(Card, null, e('div', { 'data-antd-kids': '' })),
  divider: () => e(Divider, { style: { margin: 0 } }),

  heading: (n) => e(Typography.Title, { level: n.level === 2 ? 3 : 5, style: { margin: 0 } }, text(n.text)),
  text: (n) => e(Typography.Paragraph, { style: { margin: 0 } }, text(n.text)),
  muted: (n) => e(Typography.Paragraph, { type: 'secondary', style: { margin: 0 } }, text(n.text)),
  label: (n) => e(Typography.Text, { strong: true }, text(n.text)),

  button: (n) => e(Button, BTN[n.tone ?? 'brand'], text(n.text)),
  iconrow: (n) => e(Space, { size: 4, wrap: true },
    ...list(n.items).map((i, k) => e(Button, { key: k, type: 'text', 'aria-label': i, icon: icon(i) }))),
  input: (n) => e(Input, { defaultValue: text(n.value), placeholder: text(n.placeholder) }),
  textarea: (n) => e(Input.TextArea, { rows: 3, defaultValue: text(n.value), placeholder: text(n.placeholder) }),
  select: (n) => e(Select, { open: true, defaultValue: list(n.options)[0], style: { width: '100%' },
    getPopupContainer: (t) => t.parentElement,
    options: list(n.options).map((o) => ({ value: o, label: o })) }),
  checkbox: (n) => e(Checkbox, { defaultChecked: !!n.on }, text(n.text)),
  radio: (n) => e(Radio.Group, { defaultValue: list(n.items)[n.on ?? 0] },
    e(Space, { direction: 'vertical' }, ...list(n.items).map((t, k) => e(Radio, { key: k, value: t }, t)))),
  switch: (n) => e(Flex, { align: 'center', gap: 8 },
    e(Switch, { defaultChecked: !!n.on }), e(Typography.Text, null, text(n.text))),
  slider: (n) => e(Slider, { defaultValue: n.value ?? 60, style: { margin: '8px 0' } }),

  badge: (n) => e(Tag, { color: TAG[n.tone ?? 'neutral'] }, text(n.text)),
  alert: (n) => e(Alert, { type: ALERT[n.tone ?? 'neutral'], title: text(n.text) }),
  stat: (n) => e(Card, { size: 'small' }, e(Statistic, { title: text(n.label), value: text(n.value) })),
  progress: (n) => e(Progress, { percent: n.value ?? 60 }),
  table: (n) => e(Table, {
    size: 'small', pagination: false,
    columns: list(n.cols).map((c, i) => ({ title: c, dataIndex: String(i), key: String(i) })),
    dataSource: list(n.rows).map((r, i) => Object.assign({ key: String(i) }, ...list(r).map((c, j) => ({ [j]: c })))),
  }),
  list: (n) => e(List, { itemLayout: 'horizontal',
    dataSource: list(n.rows),
    renderItem: (r, i) => e(List.Item, { key: i, extra: e(Typography.Text, { type: 'secondary' }, text(r.meta)) },
      e(List.Item.Meta, { avatar: icon(r.icon, 18), title: text(r.title), description: text(r.sub) })) }),
  kv: (n) => e(Descriptions, { column: 1, size: 'small', bordered: true,
    items: list(n.rows).map(([k, v], i) => ({ key: String(i), label: e(Typography.Text, { code: true }, k), children: v })) }),
  avatar: (n) => e(Avatar, null, text(n.text)),
  empty: (n, kids) => e(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE,
    description: e('span', null,
      e(Typography.Text, { strong: true, style: { display: 'block' } }, text(n.title)),
      e(Typography.Text, { type: 'secondary' }, text(n.text))) }, kids),
  tabs: (n) => e(Tabs, { defaultActiveKey: '0',
    items: list(n.items).map((t, i) => ({ key: String(i), label: t })) }),

  navbar: (n, kids) => e(Layout.Header, { style: { display: 'flex', alignItems: 'center', gap: 24 } },
    e(Typography.Text, { strong: true, style: { color: 'inherit' } }, text(n.brand)),
    e(Menu, { theme: 'dark', mode: 'horizontal', defaultSelectedKeys: ['0'], style: { flex: 1, minWidth: 0 },
      items: list(n.items).map((t, i) => ({ key: String(i), label: t })) }),
    e('span', { style: { display: 'flex', gap: 8 } }, kids)),
  sidenav: (n) => e(Menu, { mode: 'inline', defaultSelectedKeys: ['on'], style: { border: 0, background: 'transparent' },
    items: list(n.groups).map((g, gi) => ({ key: 'g' + gi, type: 'group', label: g.title,
      children: list(g.items).map((it, i) => ({
        key: it.on ? 'on' : gi + '-' + i, icon: icon(it.icon),
        label: it.count
          ? e('span', { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } },
            e('span', null, it.text), e(Tag, { color: TAG.brand, style: { marginInlineEnd: 0 } }, it.count))
          : it.text,
      })) })) }),
  breadcrumb: (n) => e(Breadcrumb, { items: list(n.items).map((t) => ({ title: t })) }),
  /* the wrapper reserves the room the open panel takes, counted off their own
     32px item height — their dropdown is out of flow, so without it the card
     collapsed behind it, the same as every other kit's menu on this wall */
  menu: (n) => e('div', { style: { minHeight: (list(n.items).length + 2) * 32 + (n.label ? 30 : 0) + 44 } },
  e(Dropdown, { open: true, autoAdjustOverflow: false, getPopupContainer: (t) => t.parentElement,
    menu: { items: [
      ...(n.label ? [{ key: 'h', type: 'group', label: n.label }] : []),
      ...list(n.items).map((t, i) => ({ key: String(i), label: t })),
      { type: 'divider' },
      { key: 'danger', label: text(n.danger ?? 'Delete'), danger: true },
    ] } },
  e(Button, { icon: icon('chevron-down', 14), iconPosition: 'end' }, text(n.trigger ?? 'Actions')))),
  mediacard: (n) => e(Card, {
    cover: e('div', { 'data-photo': '1', style: { aspectRatio: '16 / 9', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--ant-color-fill-quaternary)', color: 'var(--ant-color-text-quaternary)' } }),
  }, e(Card.Meta, { title: text(n.title), description: text(n.text) }),
  e(Typography.Link, { href: '#', style: { display: 'inline-block', marginTop: 12 } }, text(n.action ?? 'Read on'))),
  footer: (n) => e(Layout.Footer, null,
    e('div', { style: { display: 'grid', gap: 24, gridTemplateColumns: `repeat(${list(n.groups).length || 1},minmax(0,1fr))` } },
      ...list(n.groups).map((g, i) => e('div', { key: i, style: { display: 'flex', flexDirection: 'column', gap: 8 } },
        e(Typography.Text, { strong: true }, g.title),
        ...list(g.items).map((t, j) => e(Typography.Link, { key: j, href: '#' }, t))))),
    e(Typography.Text, { type: 'secondary', style: { display: 'block', marginTop: 24 } }, text(n.note))),
}

/** Which parts this file answers. The caller renders the rest. */
export const OWNS = Object.keys(PART)

/* ── rendering ────────────────────────────────────────────────────────────
 * Every node whose part Ant Design ships is rendered whole, kids and all;
 * anything else is left to the binding table. Keyed on the node itself, so a
 * card that changes is a key that changes and a stale answer cannot be served.
 */
const element = (node, i) => {
  if (node == null) return null
  if (typeof node === 'string') return node
  const fn = PART[node.p]
  const kids = list(node.kids).map(element)
  if (!fn) return e('div', { key: i, 'data-not-antd': node.p }, ...kids)
  return e(React.Fragment, { key: i }, fn(node, kids))
}

/**
 * THE POPUP GOES BACK NEXT TO ITS TRIGGER.
 *
 * A menu and a select panel are portals their trigger positions at runtime by
 * measuring the page. jsdom measures everything as zero, so what comes out is
 * `left:-1000vw` — rc-trigger's "not placed yet" — plus the entrance-animation
 * classes it has not run. Both are a running browser's business and neither
 * survives being written to a file.
 *
 * So the panel is moved to sit right after the element that carries
 * aria-expanded, its placeholder position dropped and its motion classes with
 * it. That is the same normalisation every other kit on this wall gets — none
 * of them can position a popup here either — and it is the only thing in this
 * file that is not exactly what Ant Design emitted.
 */
function settle(root) {
  for (const pop of [...root.querySelectorAll('.ant-dropdown, .ant-select-dropdown')]) {
    const isSelect = pop.classList.contains('ant-select-dropdown')
    pop.className = pop.className.split(/\s+/).filter((c) => !/^ant-(slide|zoom|move|fade)/.test(c)).join(' ')
    pop.removeAttribute('style')
    const before = pop.previousElementSibling
    const trigger = before && (before.matches('[aria-expanded]') ? before : before.querySelector('[aria-expanded]'))
    if (trigger) {
      /* a menu is drawn open, a select is drawn as it really sits: closed */
      trigger.setAttribute('aria-expanded', String(!isSelect))
      pop.hidden = isSelect
      /* and the control agrees with its own panel. Their root keeps
         ant-select-open, which their CSS turns the arrow with — left on a
         closed select it pointed up at nothing. */
      if (isSelect) trigger.closest('.ant-select')?.classList.remove('ant-select-open')
      /* after the TRIGGER, not after the whole control, so the wall's one rule
         for "a thing that says it is expanded" finds it without knowing whose */
      trigger.after(pop)
    }
    /* top, explicitly. Their stylesheet parks an unplaced dropdown at
       top:-9999px and waits for the trigger to measure the page; with the
       inline placeholder gone that rule took over and the panel opened ten
       thousand pixels above the field. */
    pop.style.position = 'absolute'
    pop.style.insetBlockStart = 'calc(100% + 4px)'
    pop.style.insetInlineStart = '0'
    pop.style.minWidth = '100%'
    pop.style.zIndex = '3'
    const box = pop.parentElement
    if (box && !box.style.position) box.style.position = 'relative'
  }
}

/* React schedules its work; nothing here can ask it to hurry. `act` would,
   but act is a development-only export and this bundle is built against the
   production React — asking for it got `act is not a function`, five frames
   deep in minified code. So the loop simply yields until the queue is empty,
   which is what act does anyway. */
const settled = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 0)) }

async function renderAll({ token = {}, dark = false, nodes = [], icons = {} }) {
  ICONS = icons
  const cache = createCache()
  const parts = {}
  const algorithm = dark ? antd.theme.darkAlgorithm : antd.theme.defaultAlgorithm
  for (const node of nodes) {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    root.render(e(StyleProvider, { cache, container: document.head },
      e(ConfigProvider, { theme: { cssVar: { key: 'antd' }, hashed: false, algorithm, token } },
        element(node, 0))))
    /* eslint-disable-next-line no-await-in-loop */
    await settled()
    settle(host)
    drawIcons(host)
    parts[JSON.stringify(node)] = host.innerHTML
    /* NOTHING IS UNMOUNTED UNTIL THE CSS IS OUT.
       Their cache is reference-counted: unmounting the last component that
       uses a style takes that style back out of it, so a loop that tidied up
       after each node ended with a full set of markup and an empty
       stylesheet — no error, no warning, nought kilobytes. */
  }
  const css = extractStyle(cache, true)
  const classes = [...new Set([...Object.values(parts).join(' ').matchAll(/class="([^"]+)"/g)]
    .flatMap((m) => m[1].split(/\s+/)).filter(Boolean))].sort()
  return { css, parts, classes }
}

/* ── the program ──────────────────────────────────────────────────────────*/
const read = () => new Promise((resolve) => {
  if (process.argv[2]) return resolve(process.argv[2])
  let s = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (d) => { s += d })
  process.stdin.on('end', () => resolve(s))
})

const input = JSON.parse((await read()) || '{}')
process.stdout.write(JSON.stringify(await renderAll(input)))
