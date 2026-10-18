#!/usr/bin/env node
/**
 * THE KIT DOOR: a build we make for you, per kit, so UISandbox can open it
 * like any other.
 *
 *   node scripts/kit-builds.mjs                 all eight that render
 *   node scripts/kit-builds.mjs bootstrap       one
 *
 * Writes public/kits/<id>.zip: the six screens as six pages, each kit's own
 * classes and elements on them, and that kit's REAL compiled CSS beside them.
 *
 * Why a build and not a special mode of the stage: the door then gets the
 * whole spine for nothing. The sandbox tokenises the kit's CSS like anyone's,
 * so the knobs, Check 1:1, the reach meter, the export and the MCP all work on
 * it unchanged, and `×1 = as in your code` reads, correctly, as "as the kit
 * ships it" — because the code IS what the kit ships. UIcockpit needed sixty
 * lines of `bootstrapLive` to make Bootstrap's compiled brand move; the
 * tokeniser does that for every kit and every literal.
 *
 * VALUES. Each kit is built with ITS OWN published defaults (kitDefaults: read
 * from the package, never typed, and it throws if a package stops publishing
 * one). Not UIcockpit's purple seed: the doctrine is "switch a kit on and you
 * get its values". UIcockpit bakes every kit with one shared seed because it
 * swaps values live and a frame must not open teal and turn violet; the
 * sandbox does not swap that way, so that constraint does not carry over.
 *
 * The preparation follows build-page.mjs in Ideelab/uicockpit at 37ed9bc step
 * for step — Mantine's hashed classes, shadcn's registry parts, Ant's
 * pre-render, Radix's tones, the icons and each kit's own icon set — because
 * WALL renders nothing faithful without them.
 *
 * Needs the network on a cold run: build-css installs each kit, pinned to the
 * version in kits/<id>.json, into a throwaway directory. None of it becomes a
 * dependency of UISandbox.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENGINE = join(root, 'src/kits/engine')
const OUT = join(root, 'public/kits')

// The engine reads kits/<id>.json relative to the working directory, as its
// tests do; run from there rather than editing a path in it.
process.chdir(ENGINE)
const { icons } = await import(join(ENGINE, 'icons.mjs'))
const { route } = await import(join(ENGINE, 'roles.mjs'))
const { buildCss } = await import(join(ENGINE, 'build-css.mjs'))
const { WALL, useMantineClasses, useRadixTones, useIcons, useIconSets, iconKit, useShadcnParts, useAntdParts } = await import(join(ENGINE, 'wall-bindings.mjs'))
const { ICON_NAMES, SCREENS, wallMarkup } = await import(join(ENGINE, 'scenes.mjs'))
const { readIconSets, KIT_ICON_SETS } = await import(join(ENGINE, 'icon-sets.mjs'))
const { kitDefaults } = await import(join(ENGINE, 'kit-defaults.mjs'))
const { ROOT } = await import(join(ENGINE, 'kit-root.mjs'))
const { zip } = await import(join(ENGINE, 'zip.mjs'))
const { materialElements } = await import(join(ENGINE, 'material-elements.mjs'))

const ALL = ['tailwind', 'daisyui', 'shadcn', 'bootstrap', 'material', 'radix', 'mantine', 'antd', 'openprops']
const kits = Object.fromEntries(ALL.map((id) => [id, JSON.parse(readFileSync(`kits/${id}.json`, 'utf8'))]))
// Open Props publishes variables, not components: it renders nothing alone.
const RENDERS = ALL.filter((id) => kits[id].layer !== 'tokens')
const want = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const IDS = want.length ? want : RENDERS
for (const id of IDS) if (!RENDERS.includes(id)) throw new Error(`${id} does not render on its own (layer: ${kits[id]?.layer})`)

useMantineClasses(kits.mantine?.classes)
useShadcnParts(kits.shadcn?.parts)
useAntdParts(kits.antd?.parts)
const DEFAULTS = kitDefaults(kits, RENDERS)

console.log('reading the icons…')
useIcons(icons([...new Set(ICON_NAMES)]).icons)
const own = readIconSets(ICON_NAMES)
useIconSets(own.sets)

/* A page for one screen. The wall's furniture <style> stays, it lays out the
 * board; the wall's <script> goes. That script is UIcockpit's own canvas — a
 * wheel that pans sideways, a drag that pans like a map, Exposé — and in the
 * sandbox the screens are pages and the screen picker is how you move. */
const SCRIPT = /<script\b[^>]*>[\s\S]*?<\/script>/gi
/* A kit that takes CHOICES rather than values — Radix: its accent and its grey
 * are named scales, set as attributes on the theme root — gets the choices the
 * engine made (route().chosen), written onto <html>. UIcockpit's page sets
 * these while it runs; a static build has to carry them, or every rule that
 * reads var(--accent-9) reads nothing and Radix renders as bare text. The
 * 1:1 check could not see that: untouched and tokenised were equally bare. */
const choicesOf = (id, values) => {
  if (id === 'radix') return radixTheme()
  return (route(values, [id], kits)[0]?.chosen ?? [])
    .filter((c) => /^data-/.test(c.attr) && c.picked).map((c) => ` ${c.attr}="${c.picked}"`).join('')
}

/* RADIX, AS IT SHIPS: what its own <Theme> sets when you pass it nothing.
 *
 * Not the engine's route().chosen, which maps a person's COLOUR onto the
 * nearest named scale — the right question in the generator and the wrong one
 * at a door with no colour behind it. For ink #202020 it picked "sand",
 * because Radix's own grey is the default and so has no data-gray-color
 * selector for fetch-kits to read: "gray" is not even among the options it
 * found.
 *
 * TYPED, NOT READ — the one place in the kit door that is. kits/radix.json
 * publishes each choice's options and not its default, so these four are
 * Radix Themes' themePropDefs defaults, copied from its source. They are read
 * from `choices[role].default` first, so the day fetch-kits.mjs learns to read
 * themePropDefs this table stops being used, which is the fix. Without
 * data-radius and data-scaling every --radius-* and --space-* resolves to
 * nothing: buttons with no padding and square corners, measured. */
const RADIX_THEME = { brand: 'indigo', ink: 'slate', radius: 'medium', baseText: '100%' }   // grayColor "auto" is slate for indigo
const radixTheme = () => Object.entries(kits.radix.choices ?? {})
  .map(([role, c]) => [c.attr, c.default ?? RADIX_THEME[role]]).filter(([a, v]) => a && v)
  .map(([a, v]) => ` ${a}="${v}"`).join('')
const rootOf = (id, values) => `${ROOT[id] ?? ''}${choicesOf(id, values)}`

const page = (id, screen, values) => `<!doctype html>
<html${rootOf(id, values)}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${screen.title ?? screen.id} · ${kits[id].name}</title>
<link rel="stylesheet" href="kit.css">${id === 'material' ? `
<script type="module" src="material.js"></script>` : ''}
<style>
/* One screen per page here, so it is shown, at its own size. The wall hides a
   screen board on its strip (#strip > .board[data-shot]{display:none}) and
   only shows it in its grid mode, scaled down by the script this page leaves
   out. This undoes the hiding, and it has to out-specify it: one selector
   short and it loses the tie, the lesson UIcockpit paid for once already. It
   addresses the furniture by data- attribute and path, never by class name,
   because .card and .col are also Bootstrap's and daisyUI's. (1,2,1) > (1,2,0). */
html #strip > [data-board][data-shot] { display: flex }
</style>
</head>
<body>
${wallMarkup(WALL[id], [screen]).replace(SCRIPT, '')}
</body>
</html>
`

mkdirSync(OUT, { recursive: true })

/* The door's list, DERIVED from the kit data rather than typed into the UI:
 * a list somebody maintains by hand is the first thing to disagree with what
 * was actually built. Open Props is in it as what it is, a layer of variables
 * that renders nothing on its own. */
writeFileSync(join(root, 'src/kits/door.json'), JSON.stringify(ALL.map((id) => ({
  id, name: kits[id].name, version: kits[id].version, renders: RENDERS.includes(id),
})), null, 1) + '\n')
for (const id of IDS) {
  const values = DEFAULTS[id]?.values
  if (!values) throw new Error(`no published defaults for ${id}`)
  iconKit(KIT_ICON_SETS[id] ?? null)
  useRadixTones(Object.fromEntries((route(values, ['radix'], kits)[0]?.chosen ?? [])
    .filter((c) => c.attr === 'tone').map((c) => [c.role, c.picked])))
  console.log(`\n${kits[id].name} ${kits[id].version}`)
  // What Tailwind scans: every screen this kit will show, so no class a page
  // uses is one the stylesheet never saw.
  const all = `<html${rootOf(id, values)}>${wallMarkup(WALL[id], SCREENS)}`
  const css = await buildCss(values, [id], kits, () => all, (s) => console.log('  ' + s), { antdIcons: own.sets['antd-icons'] })
  if (!css[id]) throw new Error(`build-css produced no stylesheet for ${id}`)
  const files = { [`${id}/kit.css`]: css[id] }
  // Material's components are custom elements, not classes: without Google's
  // own @material/web running, an <md-filled-button> is an unknown tag with no
  // style and no behaviour. Shipped as a FILE, never inline: a literal
  // closing script tag inside an inline module ends it where it stands.
  if (id === 'material') {
    const mdw = materialElements()
    files[`${id}/material.js`] = mdw.js
    console.log(`  · @material/web ${mdw.version}: ${mdw.bundled.length} real elements, ${Math.round(mdw.js.length / 1024)} KB`)
  }
  SCREENS.forEach((s, i) => { files[`${id}/${i === 0 ? 'index' : s.id}.html`] = page(id, s, values) })
  const bytes = zip(files)
  writeFileSync(join(OUT, `${id}.zip`), bytes)
  console.log(`  → public/kits/${id}.zip · ${SCREENS.length} screens · ${Math.round(css[id].length / 1024)} KB of CSS · ${Math.round(bytes.length / 1024)} KB`)
}
