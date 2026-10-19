/**
 * Ant Design's half of the wall, rendered by Ant Design: kits/antd.json `parts`.
 *
 * Ant publishes React and no class list, so what each wall part wears is only a
 * fact once their component has rendered it (antd-tree.mjs). UIcockpit's
 * fetcher kept that render and stayed behind in `dsg/` (SOURCE.md); this is
 * the same step on this side, so a new part on the wall (decision 211) can be
 * rendered instead of typed.
 *
 *   node scripts/kit-antd.mjs            render with the cached bundle
 *   node scripts/kit-antd.mjs --refresh  rebuild the bundle from antd-tree.mjs first
 *
 * The markup does not depend on the tokens (css-var mode, unhashed), so their
 * defaults are rendered; the kit build runs the same bundle again with the
 * values for the CSS.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), '../src/kits/engine')
process.chdir(ENGINE)
const { antdBundle, antdRender } = await import(join(ENGINE, 'antd-render.mjs'))
const { antdNodes } = await import(join(ENGINE, 'antd-nodes.mjs'))
const { SPECIMEN } = await import(join(ENGINE, 'parts.mjs'))
const { SCENES, ICON_NAMES } = await import(join(ENGINE, 'scenes.mjs'))
const { icons } = await import(join(ENGINE, 'icons.mjs'))
const { readIconSets } = await import(join(ENGINE, 'icon-sets.mjs'))

const meta = antdBundle({ refresh: process.argv.includes('--refresh') })
const own = readIconSets(ICON_NAMES)
const nodes = antdNodes(SCENES, SPECIMEN)
const got = antdRender({ nodes, icons: { ...icons(ICON_NAMES).icons, ...(own.sets['antd-icons'] ?? {}) } })

const file = 'kits/antd.json'
const kit = JSON.parse(readFileSync(file, 'utf8'))
const before = Object.keys(kit.parts ?? {}).length
kit.parts = got.parts
kit.classes = got.classes
writeFileSync(file, JSON.stringify(kit, null, 2) + '\n')
console.log(`antd ${meta.version}: ${nodes.length} nodes rendered (${before} before), ${got.classes.length} of their classes`)
