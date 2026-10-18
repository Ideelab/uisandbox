/**
 * HOW MUCH OF EACH KIT IS REALLY THEIRS.
 *
 * The claim is not "it looks like daisyUI". The claim is that it IS daisyUI —
 * their classes, their stylesheet, their component. Ninety-nine percent is not
 * a weaker version of that claim, it is a different claim, and one we would not
 * be allowed to make.
 *
 * So this counts. Every class our binding emits for a kit is looked up in that
 * kit's OWN compiled stylesheet. A class their CSS does not define is a class we
 * invented, and every one of them is printed by name.
 *
 * Tailwind is exempt from the component half by construction: it ships
 * utilities, not components, so there is nothing there to be 100% of. That is
 * said out loud rather than scored as a pass.
 *
 *   node fidelity.mjs
 */
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { buildCss } from './build-css.mjs'
import { render, SPECIMEN } from './parts.mjs'
import { WALL, useMantineClasses, useIcons, useShadcnParts, useAntdParts } from './wall-bindings.mjs'
import { SCENES, ICON_NAMES } from './scenes.mjs'
import { icons } from './icons.mjs'
import { materialElements } from './material-elements.mjs'
import { COMPONENT_GAPS, SKILL_VOCAB } from './generate.mjs'

const IDS = ['tailwind', 'daisyui', 'shadcn', 'bootstrap', 'material', 'radix', 'mantine', 'antd']
/* EVERY role, not the seven the first version set.
 *
 * A role left blank writes no variable, so Tailwind never generates the utility
 * that would read it — and the meter then reports our own bg-success as a class
 * we invented. The meter has to compile the same theme the product writes. */
const VALUES = { brand: '#0b6e8a', onBrand: '#ffffff', page: '#ffffff', surface: '#f7f9fa',
  ink: '#16181c', inkMuted: '#5c6b72', line: '#dfe2e7', radius: '10px', baseText: '16px',
  space: '1', elevation: '1', lineHeight: '1.5', letterSpacing: '0em', fontWeight: '600',
  borderWidth: '1px', success: '#2f9e44', warning: '#f08c00', danger: '#e03131', focus: '#0b6e8a',
  fontHeading: 'Fraunces, serif', fontBody: 'Inter, sans-serif' }
const kits = Object.fromEntries(IDS.map((id) => [id, JSON.parse(readFileSync(`kits/${id}.json`, 'utf8'))]))
useMantineClasses(kits.mantine?.classes)
useShadcnParts(kits.shadcn?.parts)
useAntdParts(kits.antd?.parts)
useIcons(icons(ICON_NAMES).icons)

const markup = (id) => SCENES.map((s) => render(s.node, WALL[id])).join('')
export const classesOf = (html) => [...new Set([...html.matchAll(/class="([^"]+)"/g)]
  .flatMap((m) => m[1].split(/\s+/)).filter(Boolean))]

/**
 * Which of the classes in this markup the kit's own stylesheet defines.
 * Exported because the page states the number under the frame: a claim of
 * "these are really their components" is worth nothing unless it is counted
 * where the reader can see it.
 */
export const elementsOf = (html) => [...new Set([...html.matchAll(/<([a-z]+-[a-z0-9-]*)/g)].map((m) => m[1]))]

/**
 * The same question one rung up: how many PARTS are the kit's own?
 *
 * The class count is the precise answer and the part count is the legible one.
 * A part counts as theirs if the markup we emit for it carries at least one
 * class their stylesheet defines, or one custom element their package
 * registers. Everything else is a part we drew from their tokens because they
 * ship nothing for it — and those are named, not totalled away.
 */
export function partOwnage(bind, sheet, render, PARTS, tags = null) {
  const ours = []
  for (const part of PARTS) {
    const fn = bind[part]
    if (typeof fn !== 'function') { ours.push(part); continue }
    const node = SPECIMEN(part)
    let html = ''
    try { html = render(node, bind) } catch { ours.push(part); continue }
    const { theirs, els, elsTheirs } = ownage(html, sheet, tags)
    if (!(theirs > 0 || elsTheirs > 0)) ours.push(part)
  }
  return { parts: PARTS.length, theirs: PARTS.length - ours.length, ours }
}

/**
 * A KIT WHOSE MARKUP WE DID NOT WRITE.
 *
 * The question this file asks is "did we make this class up", and for six kits
 * the only way to answer it is to look the class up in their stylesheet. For a
 * kit whose components produced the markup themselves the answer is already
 * known: if their render emitted it, it is theirs, whether or not their CSS
 * goes on to select it — and Ant Design emits thirty-five such names, from
 * ant-btn-default to anticon-ellipsis. Reported as their own markers, the same
 * finding as Tailwind's group/ names and for the same reason: a name that
 * carries no rule is worth saying out loud, but it is not an invention of ours.
 */
export function ownage(html, sheet, tags = null, emitted = null) {
  const used = classesOf(html)
  const sel = (c) => [...c].map((ch) => (/[A-Za-z0-9_-]/.test(ch) ? ch
    : `\\\\?${ch.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}`)).join('')
  /* A MARKER IS NOT A CLASS THAT CAN HAVE A RULE.
   *
   * `group/switch` and `peer/x` emit nothing of their own — they name a subtree
   * so that `group-data-[state=checked]/switch:` can reach it, and the name only
   * ever appears inside the rule that variant generates. Asking whether the
   * sheet DEFINES one is the wrong question and answers "invented"; asking
   * whether it references it at all is the right one, and a marker nothing
   * references is a real finding of its own: a name we carry whose variants this
   * wall never renders. */
  const marker = (c) => /^(?:group|peer)\//.test(c)
  const own = emitted ? new Set(emitted) : null
  const defined = (c) => new RegExp(`\\.${sel(c)}(?=[\\s,{:.>~+\\[)])`).test(sheet)
  const held = used.filter((c) => (marker(c) ? !new RegExp(`\\.${sel(c)}`).test(sheet)
    : own?.has(c) && !defined(c)))
  const missing = used.filter((c) => !marker(c) && !own?.has(c) && !defined(c))
  /* A kit whose unit is not a class. Material ships custom elements, so the
   * question there is not which classes its stylesheet defines but which
   * elements its package declares AND its bundle really registers — a tag that
   * is theirs by name but absent from the bundle would render as an unknown
   * element and look like a hole in their kit. */
  const els = tags ? elementsOf(html) : []
  const strangers = els.filter((t) => !tags.includes(t))
  return { used: used.length, theirs: used.length - missing.length, missing, held,
    els: els.length, elsTheirs: els.length - strangers.length, strangers,
    inline: (html.match(/style="/g) ?? []).length }
}

/* Guarded, because this file is also imported for `ownage` and `partOwnage`.
 * Without it, importing one function ran the whole meter -- three npm installs
 * and a Tailwind build -- as a side effect. Second time this project has been
 * caught by a module that DOES something when it loads. */
/* pathToFileURL, not string concatenation: this project lives in a directory
 * with a space in its name, so import.meta.url is percent-encoded and
 * `file://${process.argv[1]}` never matched. The guard was silently false and
 * running the file directly printed nothing at all. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  /* The skill's citations ride along as a probe. daisyUI and Tailwind generate
   * classes on demand, so "the sheet defines it" is only answerable for a
   * class the build was ASKED about: a cited class the kit's own compiler
   * produces a rule for is theirs, and one it leaves unstyled is invented.
   * The ownage counts below still run on the wall's own markup, unprobed. */
  const probe = (id) => markup(id)
    + `<i class="${(SKILL_VOCAB[id]?.sheetClasses ?? []).join(' ')}"></i>`
  const css = await buildCss(VALUES, IDS, kits, probe, () => {})
  const mdw = materialElements()
  const TAGS = { material: mdw.bundled }

  console.log('\n  Every class we emit, looked up in the kit that should define it.\n')
  let worst = 0
  for (const id of IDS) {
    const sheet = css[id] ?? ''
    /* Ant Design's classes come out of its own render, so the list of what it
       emitted IS the list of what is theirs — read from its document rather
       than looked up in a stylesheet it only generates on demand. */
    const { used: n, theirs, missing, held, els, elsTheirs, strangers } = ownage(markup(id), sheet, TAGS[id] ?? null, kits[id].parts && id === 'antd' ? kits[id].classes : null)
    const pct = n ? Math.round((theirs / n) * 100) : 100
    worst = Math.max(worst, missing.length)

    /* A kit that emits NO classes scores 100% of nothing, and a meter that
     * reports that as a pass is worse than one that fails. Material renders
     * entirely on inline styles of ours — which is the furthest thing from being
     * its kit, and the number has to say so rather than flatter it. */
    if (TAGS[id]) {
      /* two units, both reported: their elements and their typography classes */
      const pct = els ? Math.round((elsTheirs / els) * 100) : 0
      console.log(`  ${kits[id].name.padEnd(14)} ${String(pct).padStart(3)}%   ${elsTheirs}/${els} elements are theirs, running their code` +
        `\n                        ${theirs}/${n} classes are theirs (their md-typescale stylesheet)`)
      if (strangers.length) { console.log(`                 invented: ${strangers.join(' ')}`); worst = Math.max(worst, strangers.length) }
      if (!els) worst = Math.max(worst, 1)
      for (const [part, why] of COMPONENT_GAPS[id] ?? []) console.log(`                 no component: ${part} — ${why}`)
      continue
    }
    if (!n) {
      console.log(`  ${kits[id].name.padEnd(14)}   ——   nothing of theirs on the page at all`)
      worst = Math.max(worst, 1)
      continue
    }
    const note = id === 'tailwind' ? '  (utilities, not components — nothing here to be 100% of)' : ''
    console.log(`  ${kits[id].name.padEnd(14)} ${String(pct).padStart(3)}%   ${theirs}/${n} classes are theirs${note}`)
    if (held.length) console.log(`                 ${id === 'antd' ? 'names its own components write that its own CSS never selects' : 'markers nothing on this wall reaches for'}: ${held.slice(0, 12).join(' ')}${held.length > 12 ? ` …and ${held.length - 12} more` : ''}`)
    if (missing.length && id !== 'tailwind') {
      console.log(`                 invented: ${missing.slice(0, 12).join(' ')}${missing.length > 12 ? ` …and ${missing.length - 12} more` : ''}`)
    }
  }
  console.log(`\n  ${worst ? 'Not 100%. Everything named above is something we made up.' : 'Every class and every element comes from the kit that defines it.\n  What a kit has no component for is named, not substituted.'}\n`)

  /* ── the skill's citations, held to the same bar as the wall ─────────────
   * SKILL.md tells an agent which of the kit's names to reach for. A name in
   * that table that the kit's own sheet does not define is the same invention
   * as a class on the wall, so it is looked up in the same compiled sheets:
   * classes in the kit's CSS, elements in Material's registry, component
   * names in the class maps Mantine and Ant publish. */
  let madeUp = 0
  const defines = (sheet, c) => new RegExp(`\\.${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`).test(sheet)
  for (const [id, v] of Object.entries(SKILL_VOCAB)) {
    const bad = []
    for (const c of v.sheetClasses ?? []) if (!defines(css[id] ?? '', c)) bad.push(`.${c}`)
    for (const el of v.elements ?? []) if (!mdw.declares.includes(el)) bad.push(`<${el}>`)
    for (const c of v.mantineClasses ?? []) if (!(c in (kits.mantine?.classes ?? {}))) bad.push(`Mantine ${c}`)
    for (const c of v.antdClasses ?? []) if (!(kits.antd?.classes ?? []).includes(c)) bad.push(`.${c}`)
    if (bad.length) { console.log(`  SKILL.md cites names ${kits[id]?.name ?? id} does not define: ${bad.join(' ')}`); madeUp += bad.length }
  }
  console.log(madeUp
    ? `\n  The skill is citing ${madeUp} name${madeUp > 1 ? 's' : ''} nobody defines. Fix SKILL_VOCAB.\n`
    : `  Every name the skill cites is defined by the kit it is cited for.\n`)
  process.exitCode = worst || madeUp ? 1 : 0
}
