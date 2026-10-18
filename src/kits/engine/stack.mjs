/**
 * WHAT SITS ON WHAT.
 *
 * Five kits in a row is a lie about how they are used. Nobody picks Tailwind
 * AND shadcn as two things — shadcn IS Tailwind, with components on top. And
 * nobody puts Bootstrap next to either: it brings its own everything.
 *
 * So there is a base and there are layers, and the rule is not typed here —
 * it is read from what each kit says about itself in kits/<id>.json:
 *
 *   layer: 'tokens'       variables and nothing else     → sits UNDER anything
 *   layer: 'utility'      no components, just the theme  → can carry others
 *   standalone: true      brings its own base            → IS the whole stack
 *   standalone: false     needs the utility base under it → a layer
 *
 * A tokens layer is the odd one and the reason this is read rather than typed.
 * Open Props ships no components at all, so it never renders anything — it sits
 * under whatever does, and your own CSS then agrees with the kit above it.
 *
 * Add a kit tomorrow and it sorts itself, because the fields come from the
 * kit's own package, not from an opinion of ours.
 */

const isTokens = (k) => k.layer === 'tokens'
const isFoundation = (k) => k.layer === 'utility'
const isWholeStack = (k) => k.standalone === true
const isLayer = (k) => !k.standalone && k.layer === 'components'

/** The one kit everything else can sit on, if there is one. */
export const foundationOf = (kits) => Object.keys(kits).find((id) => isFoundation(kits[id]))

/**
 * Turn a loose set of chosen ids into a real stack: one base, layers over it,
 * bottom-first. A standalone kit wins the base and pushes the layers off,
 * because there is nothing left for them to attach to.
 */
export function stack(chosen, kits) {
  const sel = [...chosen].filter((id) => kits[id])
  const under = sel.filter((id) => isTokens(kits[id]))
  const whole = sel.find((id) => isWholeStack(kits[id]))
  if (whole) {
    return { base: whole, under, layers: [], order: [...under, whole],
      dropped: sel.filter((id) => id !== whole && !under.includes(id)) }
  }
  const base = foundationOf(kits)
  const layers = sel.filter((id) => isLayer(kits[id]))
  if (!base) {
    const only = layers[0] ?? sel.find((id) => !under.includes(id)) ?? null
    return { base: only, under, layers: [], order: [...under, only].filter(Boolean),
      dropped: sel.filter((id) => id !== only && !under.includes(id)) }
  }
  return { base, under, layers, order: [...under, base, ...layers], dropped: [] }
}

/**
 * THE FOUR BANDS A STACK IS REALLY MADE OF.
 *
 * "A base and some layers" was too few words for what people build. shadcn is
 * the case that shows it: it is not a layer ON Tailwind, it is a set of files
 * that BRING the Radix behaviour package, sit on the Tailwind engine, carry
 * their own tokens and give you components. Four different things, and the old
 * card called it one.
 *
 * Nothing here is decided: each kit's bands are read from its own package by
 * fetch-kits — what brings behaviour is what the package says it depends on.
 * Two kits in this tool declare the same one, which is the fact worth showing:
 * shadcn and Radix Themes both sit on radix-ui.
 */
export const BANDS = [
  { id: 'behaviour', label: 'Behaviour', what: 'focus, keyboard and ARIA — the part with no look' },
  { id: 'engine', label: 'Engine', what: 'how the styles are written and compiled' },
  { id: 'tokens', label: 'Tokens', what: 'the named values everything else reads' },
  { id: 'components', label: 'Components', what: 'the styled parts you see' },
]

/** Which kit fills each band, for the stack you have. */
export function bandsOf(st, kits) {
  const order = st.order ?? []
  const topmost = (fn) => [...order].reverse().find((id) => fn(kits[id] ?? {}))
  const nameOf = (id) => kits[id]?.name ?? id

  const bKit = topmost((k) => k.bands?.behaviour)
  const eKit = topmost((k) => k.bands?.engine === 'own')
  const tKits = order.filter((id) => (kits[id]?.bands?.tokens ?? 0) > 0)
  const cKit = showing(st)

  return [
    { ...BANDS[0], by: bKit ?? null,
      name: bKit ? kits[bKit].bands.behaviour.by : null,
      via: bKit && kits[bKit].bands.behaviour.by !== nameOf(bKit) ? nameOf(bKit) : null,
      note: bKit ? kits[bKit].bands.behaviour.what
        : 'nothing in this stack brings any — these are classes, so the keyboard and the focus order are yours to write' },
    { ...BANDS[1], by: eKit ?? null, name: eKit ? nameOf(eKit) : null, via: null,
      note: eKit ? (kits[eKit].layer === 'utility' ? 'utilities, compiled from what your markup uses' : 'its own stylesheet, shipped ready')
        : 'nothing here writes styles — this stack needs one' },
    { ...BANDS[2], by: tKits.at(-1) ?? null, name: tKits.length ? nameOf(tKits.at(-1)) : null, via: null,
      over: tKits.slice(0, -1).map(nameOf),
      note: `${(kits[tKits.at(-1)]?.bands?.tokens ?? 0)} named values, and yours over them` },
    /* NAMED ONLY IF IT SHIPS THEM. The top layer used to be printed here
       whatever it was, so a Tailwind-only stack read "COMPONENTS: Tailwind CSS"
       — a kit that ships no components, credited with all of them. */
    { ...BANDS[3], by: cKit ?? null,
      name: cKit && kits[cKit].bands?.components ? nameOf(cKit) : null, via: null,
      note: cKit && !kits[cKit].bands?.components ? 'nothing in this stack ships components — the parts on the wall are composed from its utilities'
        : 'the parts on the wall' },
  ]
}

/** The layer whose components you actually SEE — the last one added. A tokens
 *  layer is never it: it has no components to show. */
export const showing = (st) => st.layers.at(-1) ?? st.base

/**
 * Every kit, and what clicking it would do to the stack you have. The `why`
 * is the sentence shown to the reader, so it says what happens, not what is
 * forbidden — the choice is never taken away, it is explained.
 */
export function options(chosen, kits) {
  const st = stack(chosen, kits)
  const carrier = foundationOf(kits)
  return Object.keys(kits).map((id) => {
    const k = kits[id]
    const on = st.order.includes(id)
    if (isTokens(k)) {
      return { id, role: 'under', on, locked: false,
        why: on ? 'variables under the whole stack — it renders nothing itself'
          : 'adds its variables under whatever is rendering, so your own CSS agrees with the kit' }
    }
    if (isFoundation(k)) {
      return { id, role: 'base', on, locked: st.layers.length > 0,
        why: st.layers.length ? `${st.layers.map((l) => kits[l].name).join(' and ')} sits on it` : 'the base — theme only, no components' }
    }
    if (isWholeStack(k)) return { id, role: 'whole', on, locked: false,
      why: on ? 'the whole stack — nothing else is loaded' : `replaces the stack; ${k.name} brings its own base` }
    return { id, role: 'layer', on, locked: false,
      why: on ? `components, over ${kits[carrier]?.name ?? 'the base'}` : `adds its components over ${kits[carrier]?.name ?? 'the base'}` }
  })
}

/** Clicking a kit: what the new selection becomes. */
export function toggle(chosen, id, kits) {
  const k = kits[id]; if (!k) return new Set(chosen)
  const st = stack(chosen, kits)
  /* a tokens layer disturbs nothing above it */
  if (isTokens(k)) {
    const next = new Set(st.order)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  }
  if (isWholeStack(k)) return new Set([...st.under, st.base === id ? foundationOf(kits) ?? id : id])
  if (isFoundation(k)) {
    if (st.base !== id) return new Set([...st.under, id])   /* coming back from a standalone kit */
    return new Set(st.order)                                /* the base cannot be removed from under its layers */
  }
  const next = new Set(st.base === foundationOf(kits) ? st.order : [...st.under, foundationOf(kits)])
  next.has(id) ? next.delete(id) : next.add(id)
  return next
}

/** One sentence naming the stack, for the receipt and the wall note. */
export const describe = (st, kits) => st.order.map((id) => kits[id].name).join(' + ')
