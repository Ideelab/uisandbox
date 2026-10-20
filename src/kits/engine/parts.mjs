/**
 * THE PARTS A SCENE IS MADE OF — and nothing more.
 *
 * A scene is written once, as data, and rendered by whichever kit is switched
 * on. That only works if there is a fixed vocabulary both sides agree on: the
 * scene says "a primary button", the kit's table says what a primary button is
 * in ITS classes. Adding a kit is then a table, not a rewrite of every scene —
 * the same reason the A2UI work could reach four stacks from one catalog.
 *
 * The list is deliberately short. Every part here has to be answered by EVERY
 * kit, and a vocabulary that grows faster than the tables can follow is how a
 * wall ends up with holes in it.
 */
export const PARTS = [
  'stack', 'row', 'grid', 'panel', 'divider',                        // layout
  'heading', 'text', 'muted', 'label',                               // content
  'button', 'iconrow', 'input', 'textarea', 'select',                // controls
  'checkbox', 'radio', 'switch', 'slider',                           //   and the rest of them
  'badge', 'alert', 'stat', 'progress', 'table', 'list', 'kv',       // display
  'chart', 'avatar', 'empty', 'tabs',                                //   and the rest of them
  'navbar', 'sidenav', 'breadcrumb', 'menu', 'mediacard', 'footer',  // organisms
  'link', 'pagination', 'segmented',                                 // the screens' controls
  'dialog', 'tooltip', 'toast', 'skeleton', 'spinner',               //   and what floats or waits
  'layer',                                                           // what an app puts over itself
  'field', 'fields',                                                 // a form, as the kit composes one
  'elevation', 'swatches', 'typespec', 'shapes',                     // foundation specimens
]

/**
 * The stand-in for a photograph.
 *
 * A card grid without pictures is not a card grid, and a card grid with stock
 * photographs is a lie about what you are getting. So it is a mark, drawn in
 * currentColor at low opacity, and obviously a placeholder — the same choice
 * every wireframe tool makes and for the same reason.
 */
export const PHOTO = '<svg viewBox="0 0 48 32" width="44" height="30" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" style="opacity:.35">'
  + '<rect x="1" y="1" width="46" height="30" rx="3"/><circle cx="13" cy="11" r="3.5"/><path d="M4 27l11-11 8 8 6-5 15 12"/></svg>'

export const TONES = ['neutral', 'brand', 'success', 'warning', 'danger']

/**
 * The icons a BINDING needs, as opposed to the ones a card names.
 *
 * A menu trigger has a chevron and a chosen option has a tick because that is
 * what those components are, not because a card asked for them. Declared with
 * the vocabulary rather than with the bindings: the page inlines this file and
 * the scenes, and not the binding tables — so naming it there left the page
 * with a reference to nothing and a blank tool, with one line in the console
 * about a constant nobody had heard of.
 */
export const BINDING_ICONS = ['chevron-down', 'check', 'chevron-left', 'chevron-right', 'x', 'loader-circle', 'panel-left', 'ellipsis-vertical', 'trending-up', 'trending-down']

export const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]))
export const list = (v) => (Array.isArray(v) ? v : [])

/**
 * Render one scene tree with one kit's table.
 * A part the table does not answer is a VISIBLE hole, never a silent gap —
 * the same rule the catalog work landed on: a refusal renders as a refusal.
 */
export function render(node, bind) {
  if (node == null) return ''
  if (typeof node === 'string') return esc(node)
  const kids = list(node.kids).map((k) => render(k, bind)).join('')
  /* A KIT WHOSE MARKUP HAD TO BE RUN TO EXIST.
   *
   * Ant Design publishes React, not class names: what a Card or a Table wears
   * only becomes a fact once their component has rendered it. So that one kit
   * arrives pre-rendered, keyed on the node, and the answer is handed back
   * whole — kids included, because a component that renders its own children
   * is not one you can assemble from the outside.
   *
   * Except where it wraps anything at all. Their Card leaves a marker instead
   * of its children, and the kids rendered above go into it — otherwise a card
   * of corner samples, which is not a component of theirs, came back as an
   * empty box. Everything the table still answers falls through unchanged. */
  if (bind._pre) {
    const html = bind._pre[JSON.stringify(node)]
    if (html != null) return html.replace('<div data-antd-kids=""></div>', kids)
  }
  const fn = bind[node.p]
  if (fn) node = inProps(node, bind)
  if (!fn) return `<span data-missing="${esc(node.p)}" style="display:inline-block;padding:4px 8px;border:1px dashed currentColor;opacity:.6;font-size:12px">${esc(node.p)} — not in ${esc(bind._id)}</span>`
  return fn(node, kids)
}

/**
 * A NODE INSIDE A PROP, rendered before the part sees it.
 *
 * A status in a table is a badge, an action in a row is an icon button, a
 * card's head can carry a segmented control (decision 214). The part is handed
 * them as finished markup, `{ html }` in a cell and `asideHtml` beside a
 * title, so a table stays a table of the kit's and its cells stay the kit's
 * own badges. Ant Design renders the same nodes inside its own components.
 */
function inProps(node, bind) {
  const cells = node.p === 'table' && list(node.rows).some((r) => list(r).some((c) => c && typeof c === 'object'))
  if (!cells && !(node.aside && typeof node.aside === 'object')) return node
  return { ...node,
    ...(cells ? { rows: list(node.rows).map((r) => list(r).map((c) => (c && typeof c === 'object' ? { html: render(c, bind) } : c))) } : {}),
    ...(node.aside && typeof node.aside === 'object' ? { asideHtml: render(node.aside, bind) } : {}) }
}
/** A table cell: text, or a node already rendered (inProps). */
export const cellOf = (c) => (c && typeof c === 'object' && c.html != null ? c.html : esc(c))

/**
 * ONE NODE PER PART, with every field a part might read.
 *
 * The meter renders this to ask whether a kit's answer for a part is really
 * that kit's; Ant Design has to render its half in advance, so both sides need
 * the same node or the meter asks about a card that was never made.
 */
export const SPECIMEN = (part) => ({ p: part, text: 'x', title: 'x', label: 'x', value: 'x', brand: 'x',
  note: 'x', items: ['a', 'b'], options: ['a'], cols: ['a'], rows: [['a']],
  groups: [{ title: 'a', items: ['b'] }] })

/** Which parts a kit has no answer for. Run over PARTS, not over the table. */
export function gaps(bind) {
  return PARTS.filter((p) => typeof bind[p] !== 'function')
}
