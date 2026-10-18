/**
 * WHICH NODES ANT DESIGN ANSWERS.
 *
 * Ant Design's markup cannot be written down; it has to be produced by running
 * their components. So the wall's scenes are walked once and every node whose
 * part they ship is handed over WHOLE — kids and all, because a Card that
 * renders its own children is not a Card you can assemble from the outside.
 *
 * Everything else stops the walk from descending: a stack, a row, a divider and
 * the four token specimens are not components of theirs, and the binding table
 * draws those from their variables like every other composed part on this wall.
 *
 * One list, used by the fetch that renders them and by the binding that looks
 * them up, so the two can never disagree about which is which.
 *
 * The scenes are PASSED IN rather than imported. wall-bindings needs the part
 * list from here, scenes needs the icon list from wall-bindings, and importing
 * the scenes here closed that ring — every entry point died on
 * "cannot access BINDING_ICONS before initialization", which names the last
 * link of the cycle and none of the others.
 */
/** The parts Ant Design ships a component for. Anything not here is composed. */
export const ANTD_OWNS = new Set([
  'panel', 'divider',
  'heading', 'text', 'muted', 'label',
  'button', 'iconrow', 'input', 'textarea', 'select',
  'checkbox', 'radio', 'switch', 'slider',
  'badge', 'alert', 'stat', 'progress', 'table', 'list', 'kv', 'avatar', 'empty', 'tabs',
  'navbar', 'sidenav', 'breadcrumb', 'menu', 'mediacard', 'footer',
])

/**
 * The parts of theirs that WRAP anything, and so leave their children to the
 * wall. Their Card is the only one: everything else they ship takes typed
 * content it renders itself. A slotting part is emitted AND walked through —
 * missing the second half stopped the walk at every card on the wall and left
 * every paragraph inside one unrendered.
 */
export const ANTD_SLOTS = new Set(['panel'])

/** The key a rendered node is filed under. Both sides call this one function. */
export const antdKey = (node) => JSON.stringify(node)

/** Every node on the wall that Ant Design has to render for itself. */
export function antdNodes(scenes, specimen = null) {
  const out = []
  const seen = new Set()
  /* AND THE METER'S OWN NODE. fidelity renders one specimen per part to ask
     whether the answer is really that kit's; for every other kit that is a
     function call, and for this one it is a render that has to have happened
     already. Left out, Ant Design scored nought parts of its own. */
  if (specimen) for (const part of ANTD_OWNS) {
    const n = specimen(part)
    const k = antdKey(n)
    if (!seen.has(k)) { seen.add(k); out.push(n) }
  }
  const walk = (n) => {
    if (!n || typeof n !== 'object') return
    if (ANTD_OWNS.has(n.p)) {
      const k = antdKey(n)
      if (!seen.has(k)) { seen.add(k); out.push(n) }
      if (!ANTD_SLOTS.has(n.p)) return
    }
    for (const kid of Array.isArray(n.kids) ? n.kids : []) walk(kid)
  }
  scenes.forEach((s) => walk(s.node))
  return out
}
