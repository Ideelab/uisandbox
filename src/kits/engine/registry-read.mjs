/**
 * SHADCN, READ FROM SHADCN.
 *
 * Every other kit here has its class names read out of the package it ships.
 * shadcn was the exception: its strings were typed into wall-bindings.mjs from
 * a registry snapshot, which made it the one kit in the tool that could go
 * stale — and it had. We were carrying about half of each component's classes,
 * and the half we dropped was always the same one: the STATES. Their button
 * says `focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50
 * aria-invalid:border-destructive`; ours said none of it, so a shadcn button on
 * our wall had no focus ring, no disabled state and no invalid state.
 *
 * shadcn is not an npm package — it is a registry of source files you copy in,
 * which is why `npx shadcn add button` is what the export tells you to run. So
 * the registry is what gets read, and the same thing that lands in your project
 * is the thing on the wall.
 *
 * Their source has three shapes and all are string literals:
 *
 *   cva("base", { variants: { variant: {…}, size: {…} } })   button, badge, alert
 *   data-slot="card-title" className={cn("…", className)}    most parts
 *   useRender({ props: { className: cn("…") }, state: { slot: "breadcrumb-link" } })
 *                                                            Base UI's own render
 *                                                            hook, which writes the
 *                                                            slot as data-slot
 *
 * And a part with no slot at all, drawn by a Base UI primitive through its
 * render prop (`<SelectPrimitive.ItemIndicator render={<span className="…"/>}`),
 * is kept by the primitive's name under `renders`.
 *
 * Nothing here interprets TSX. It finds those two shapes and takes the strings.
 */

/** The style the registry serves, as `shadcn init --defaults` installs it
 *  today: the preset base-nova (Base UI primitives, the nova style, neutral,
 *  Lucide, Geist). It was new-york-v4 until shadcn's CLI made base-nova its
 *  default and its site began rendering it (decision 208). */
export const STYLE = 'base-nova'
export const registryUrl = (name, style = STYLE) => `https://ui.shadcn.com/r/styles/${style}/${name}.json`

/** The text between a bracket and its match, brackets excluded. */
function balanced(src, at, open = '(', close = ')') {
  if (src[at] !== open) return ''
  let depth = 0, quote = null
  for (let i = at; i < src.length; i++) {
    const c = src[i]
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue }
    if (c === open) depth++
    else if (c === close && --depth === 0) return src.slice(at + 1, i)
  }
  return ''
}

/* A string that is the whole value, not one arm of a condition. `cn("a", cond &&
 * "b")` means "b" is a state we cannot be in, and copying it would paint a
 * disabled button as always disabled. */
const plainLiterals = (src) => {
  const out = []
  for (const m of src.matchAll(/(?:^|[^&?:])\s*"((?:[^"\\]|\\.)*)"/g)) {
    const t = m[1].trim()
    if (t && !/^[A-Za-z0-9_-]*$/.test(t) || t.includes(' ') || t.includes('-')) out.push(t)
  }
  return out
}

/** `name: "value"` pairs at the top level of an object body. */
const pairs = (body) => {
  const out = {}
  for (const m of body.matchAll(/(?:^|[,{\s])["']?([A-Za-z][A-Za-z0-9_-]*)["']?:\s*\n?\s*"((?:[^"\\]|\\.)*)"/g)) out[m[1]] = m[2].replace(/\s+/g, ' ').trim()
  return out
}

/** Every JSX element's opening tag: its name, its attribute text, where it
 *  ends, whether it closes itself. Braces and quotes are respected, so a
 *  render={<span className="…" />} inside the attributes stays inside. */
function jsxElements(src) {
  const out = []
  for (const m of src.matchAll(/<([A-Za-z][A-Za-z0-9.]*)(?=[\s>\/])/g)) {
    let depth = 0, quote = null, i = m.index + m[0].length
    for (; i < src.length; i++) {
      const c = src[i]
      if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue }
      if (c === '"' || c === "'" || c === '`') { quote = c; continue }
      if (c === '{') depth++
      else if (c === '}') depth--
      else if (c === '>' && depth === 0) break
    }
    const attrs = src.slice(m.index + m[0].length, i)
    out.push({ tag: m[1], attrs, end: i + 1, selfClosing: attrs.trimEnd().endsWith('/') })
  }
  return out
}

/** The classes in an attribute text's own className (not one nested in a
 *  render prop): a plain string, or the plain literals of its cn(…). */
function classesOf(attrs) {
  let depth = 0, at = -1
  for (let i = 0; i < attrs.length; i++) {
    const c = attrs[i]
    if (c === '{') depth++
    else if (c === '}') depth--
    else if (depth === 0 && attrs.startsWith('className=', i)) { at = i; break }
  }
  if (at < 0) return null
  const after = attrs.slice(at + 'className='.length)
  let classes = null
  if (after[0] === '"') classes = /^"((?:[^"\\]|\\.)*)"/.exec(after)?.[1]
  else if (after[0] === '{') {
    const inner = balanced(after, 0, '{', '}')
    const cnAt = inner.indexOf('cn(')
    classes = cnAt > -1 ? plainLiterals(balanced(inner, inner.indexOf('(', cnAt))).join(' ') : /^\s*"((?:[^"\\]|\\.)*)"\s*$/.exec(inner)?.[1]
  }
  classes = (classes ?? '').replace(/\s+/g, ' ').trim()
  return classes || null
}

/** One component, as the three things we can use from it. */
export function readSource(src) {
  const out = { base: null, variants: {}, cva: {}, slots: {}, renders: {}, inner: {} }

  /* EVERY cva in the file, by the name it is declared under. One file often has
     two — sidebar.tsx declares both the sidebar and its menu button — and taking
     only the first lost the one the wall actually needs. */
  for (const m of src.matchAll(/(?:const|let)\s+([A-Za-z][A-Za-z0-9_]*)\s*=\s*cva\(/g)) {
    const body = balanced(src, src.indexOf('(', m.index + m[0].length - 1))
    const first = /"((?:[^"\\]|\\.)*)"/.exec(body)
    const entry = { base: first ? first[1].replace(/\s+/g, ' ').trim() : null, variants: {} }
    const vAt = body.indexOf('variants:')
    if (vAt > -1) {
      const vBody = balanced(body, body.indexOf('{', vAt), '{', '}')
      for (const g of vBody.matchAll(/([A-Za-z][A-Za-z0-9_]*):\s*\{/g)) {
        const group = balanced(vBody, vBody.indexOf('{', g.index + g[0].length - 1), '{', '}')
        const got = pairs(group)
        if (Object.keys(got).length) entry.variants[g[1]] = got
      }
    }
    if (entry.base) out.cva[m[1]] = entry
  }
  const firstCva = Object.values(out.cva)[0]
  if (firstCva) { out.base = firstCva.base; out.variants = firstCva.variants }

  /* PER ELEMENT, NOT PER ATTRIBUTE. Base UI's parts write className before
     data-slot as often as after it (<ProgressPrimitive.Track className={…}
     data-slot="progress-track">), and reading "the next className after the
     slot" took the NEXT element's classes: the progress track went missing and
     the slider took its Control's. So each JSX element is read whole, its
     attributes in whatever order they come. */
  for (const el of jsxElements(src)) {
    const slot = /(?:^|\s)data-slot="([a-z0-9-]+)"/.exec(el.attrs)?.[1]
    const classes = classesOf(el.attrs)
    if (slot) {
      if (classes && !out.slots[slot]) out.slots[slot] = classes
      /* and what it draws inside, when that is a plain element with classes of
         its own: base-nova's radio indicator is a dot, <span className="…">,
         not an icon, and the wall draws the dot they draw */
      const inner = el.selfClosing ? null : /^\s*<span\s+className="([^"]*)"\s*\/>/.exec(src.slice(el.end))
      if (inner) out.inner[slot] ??= inner[1].replace(/\s+/g, ' ').trim()
    } else {
      /* a primitive with no slot: the slider's Control, the select's item
         indicator (drawn through its render prop). Kept by the primitive's name. */
      const prim = /^[A-Za-z]+Primitive\.([A-Za-z]+)$/.exec(el.tag)?.[1]
      const drawn = classes ?? /render=\{\s*<[a-z]+\s+className="([^"]*)"/.exec(el.attrs)?.[1]?.replace(/\s+/g, ' ').trim()
      if (prim && drawn) out.renders[prim] ??= drawn
    }
  }
  for (const m of src.matchAll(/useRender\(/g)) {
    const body = balanced(src, m.index + m[0].length - 1)
    const slot = /slot:\s*"([a-z0-9-]+)"/.exec(body)?.[1]
    const cnAt = body.indexOf('className: cn(')
    if (!slot || cnAt < 0 || out.slots[slot]) continue
    const classes = plainLiterals(balanced(body, body.indexOf('(', cnAt))).join(' ').replace(/\s+/g, ' ').trim()
    if (classes) out.slots[slot] = classes
  }
  return out
}

/** What a component is built on, from its own imports: the registry's
 *  `dependencies` say only "cn" in base-nova, its source says @base-ui/react. */
const imported = (src) => [...new Set([...src.matchAll(/from\s+"((?:@[a-z0-9-]+\/)?[a-z0-9-]+)[^"]*"/g)].map((m) => m[1]).filter((d) => d !== 'react' && d !== 'cn'))]

/** The whole set as `shadcn add` writes it into a project: the files in
 *  <dir>/<name>.tsx. Since base-nova this is the version to read. The
 *  registry's raw source carries marker classes (cn-font-heading,
 *  cn-menu-target, cn-menu-translucent) that the CLI rewrites on the way in
 *  from the preset's style map, so the registry JSON names classes no project
 *  ever contains (decision 208). */
export function readInstalled(names, dir, readFile) {
  const parts = {}
  for (const name of names) {
    const src = readFile(`${dir}/${name}.tsx`)
    const got = readSource(src)
    if (!got.base && !Object.keys(got.slots).length) throw new Error(`read nothing usable out of ${name}.tsx`)
    if (/\bcn-[a-z]/.test(JSON.stringify(got))) throw new Error(`${name}.tsx still carries a cn- marker the CLI should have rewritten`)
    parts[name] = { ...got, needs: imported(src) }
  }
  return parts
}

/** The whole set, from their registry. Nothing is cached: a build reads today's. */
export async function readParts(names, style = STYLE) {
  const parts = {}
  for (const name of names) {
    const r = await fetch(registryUrl(name, style))
    if (!r.ok) throw new Error(`shadcn's registry has no ${name} in ${style} (${r.status})`)
    const j = await r.json()
    const src = (j.files ?? []).map((f) => f.content ?? '').join('\n')
    const got = readSource(src)
    if (!got.base && !Object.keys(got.slots).length) throw new Error(`read nothing usable out of ${name}`)
    /* their own registry says what a component is built on — every one of these
       declares radix-ui, which is the evidence for where it sits in a stack */
    parts[name] = { ...got, needs: [...new Set([...(j.dependencies ?? []).filter((d) => d !== 'cn'), ...imported(src)])] }
  }
  return parts
}
