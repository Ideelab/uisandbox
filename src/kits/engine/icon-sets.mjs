/**
 * EVERY KIT'S OWN ICONS, READ FROM ITS OWN COMPANION PACKAGE.
 *
 * The wall rendered lucide glyphs into all nine kits, which was one set of
 * hands in nine kits' gloves: a Bootstrap fan looking at "their" sidebar saw
 * icons Bootstrap has never shipped. Each kit that NAMES an icon set gets that
 * set, read from the package that set publishes, the same way the kits'
 * stylesheets are read:
 *
 *   Tailwind CSS  -> Heroicons          (Tailwind Labs' own)
 *   Bootstrap     -> Bootstrap Icons    (the official set)
 *   shadcn/ui     -> lucide             (its components import lucide-react)
 *   Material 3    -> Material Symbols   (Google's, the outlined style)
 *   Radix Themes  -> Radix Icons        (the 15px set)
 *   Mantine       -> Tabler Icons       (what the Mantine docs and demos use)
 *   Ant Design    -> Ant Design Icons   (@ant-design/icons-svg)
 *
 * daisyUI's docs say "use any icon library you like" and Open Props ships no
 * components at all, so neither names a set: they keep lucide, and that is a
 * documented choice rather than a default nobody made.
 *
 * The scene vocabulary stays lucide's names; each set carries a TRANSLATION
 * table. A translation to a name the package does not contain is an ERROR at
 * build time. Radix Icons is a deliberately small set with no car, coffee,
 * credit-card or shopping-cart: those four fall back to lucide, are listed
 * here rather than discovered, and the build says so out loud.
 */
import { join } from 'node:path'
import { openNpm } from './npm-read.mjs'

/* which set each kit renders with; a kit absent here keeps lucide */
export const KIT_ICON_SETS = {
  tailwind: 'heroicons',
  bootstrap: 'bootstrap-icons',
  material: 'material-symbols',
  radix: 'radix-icons',
  mantine: 'tabler',
  antd: 'antd-icons',
}

/* one entry per scene name, per set. The left side is the page's vocabulary
 * (lucide's names); the right side is the name THE SET gives that glyph.
 * `null` = the set does not draw this concept; lucide fills in and the build
 * reports it. */
export const TRANSLATIONS = {
  heroicons: {
    'archive': 'archive-box', 'arrow-left-right': 'arrows-right-left', 'bell': 'bell',
    'car': 'truck', 'check': 'check', 'chevron-down': 'chevron-down',
    'coffee': 'building-storefront', 'copy': 'document-duplicate', 'credit-card': 'credit-card',
    'ellipsis': 'ellipsis-horizontal', 'file-text': 'document-text', 'inbox': 'inbox',
    'info': 'information-circle', 'layout-dashboard': 'squares-2x2', 'life-buoy': 'lifebuoy',
    'plus': 'plus', 'refresh-cw': 'arrow-path', 'share': 'share', 'shield': 'shield-check',
    'shopping-cart': 'shopping-cart', 'trash-2': 'trash', 'trending-up': 'arrow-trending-up',
    'user': 'user',
  },
  'bootstrap-icons': {
    'archive': 'archive', 'arrow-left-right': 'arrow-left-right', 'bell': 'bell',
    'car': 'car-front', 'check': 'check-lg', 'chevron-down': 'chevron-down',
    'coffee': 'cup-hot', 'copy': 'copy', 'credit-card': 'credit-card',
    'ellipsis': 'three-dots', 'file-text': 'file-text', 'inbox': 'inbox',
    'info': 'info-circle', 'layout-dashboard': 'grid', 'life-buoy': 'life-preserver',
    'plus': 'plus-lg', 'refresh-cw': 'arrow-clockwise', 'share': 'share', 'shield': 'shield',
    'shopping-cart': 'cart3', 'trash-2': 'trash', 'trending-up': 'graph-up-arrow',
    'user': 'person',
  },
  'material-symbols': {
    'archive': 'archive', 'arrow-left-right': 'swap_horiz', 'bell': 'notifications',
    'car': 'directions_car', 'check': 'check', 'chevron-down': 'keyboard_arrow_down',
    'coffee': 'local_cafe', 'copy': 'content_copy', 'credit-card': 'credit_card',
    'ellipsis': 'more_horiz', 'file-text': 'description', 'inbox': 'inbox',
    'info': 'info', 'layout-dashboard': 'dashboard', 'life-buoy': 'support',
    'plus': 'add', 'refresh-cw': 'refresh', 'share': 'share', 'shield': 'shield',
    'shopping-cart': 'shopping_cart', 'trash-2': 'delete', 'trending-up': 'trending_up',
    'user': 'person',
  },
  'radix-icons': {
    'archive': 'archive', 'arrow-left-right': 'width', 'bell': 'bell',
    'car': null, 'check': 'check', 'chevron-down': 'chevron-down',
    'coffee': null, 'copy': 'copy', 'credit-card': null,
    'ellipsis': 'dots-horizontal', 'file-text': 'file-text', 'inbox': 'envelope-closed',
    'info': 'info-circled', 'layout-dashboard': 'dashboard', 'life-buoy': 'question-mark-circled',
    'plus': 'plus', 'refresh-cw': 'update', 'share': 'share-1', 'shield': 'lock-closed',
    'shopping-cart': null, 'trash-2': 'trash', 'trending-up': 'bar-chart',
    'user': 'person',
  },
  tabler: {
    'archive': 'archive', 'arrow-left-right': 'arrows-left-right', 'bell': 'bell',
    'car': 'car', 'check': 'check', 'chevron-down': 'chevron-down',
    'coffee': 'coffee', 'copy': 'copy', 'credit-card': 'credit-card',
    'ellipsis': 'dots', 'file-text': 'file-text', 'inbox': 'inbox',
    'info': 'info-circle', 'layout-dashboard': 'layout-dashboard', 'life-buoy': 'lifebuoy',
    'plus': 'plus', 'refresh-cw': 'refresh', 'share': 'share', 'shield': 'shield',
    'shopping-cart': 'shopping-cart', 'trash-2': 'trash', 'trending-up': 'trending-up',
    'user': 'user',
  },
  'antd-icons': {
    'archive': 'ContainerOutlined', 'arrow-left-right': 'SwapOutlined', 'bell': 'BellOutlined',
    'car': 'CarOutlined', 'check': 'CheckOutlined', 'chevron-down': 'DownOutlined',
    'coffee': 'CoffeeOutlined', 'copy': 'CopyOutlined', 'credit-card': 'CreditCardOutlined',
    'ellipsis': 'EllipsisOutlined', 'file-text': 'FileTextOutlined', 'inbox': 'InboxOutlined',
    'info': 'InfoCircleOutlined', 'layout-dashboard': 'AppstoreOutlined', 'life-buoy': 'QuestionCircleOutlined',
    'plus': 'PlusOutlined', 'refresh-cw': 'ReloadOutlined', 'share': 'ShareAltOutlined',
    'shield': 'SafetyOutlined', 'shopping-cart': 'ShoppingCartOutlined', 'trash-2': 'DeleteOutlined',
    'trending-up': 'RiseOutlined', 'user': 'UserOutlined',
  },
}

/* strip an svg file to its inner markup + its own viewBox */
const inner = (svg) => svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>')).replace(/\s+/g, ' ').trim()
const boxOf = (svg) => /viewBox="([^"]+)"/.exec(svg)?.[1]

/* how each set's files are laid out, and how its glyphs want to be drawn.
 * stroke sets inherit the svg's stroke; fill sets inherit its fill. */
const READERS = {
  heroicons: { pkg: 'heroicons', stroke: 1.5, path: (n) => join('24/outline', n + '.svg') },
  'bootstrap-icons': { pkg: 'bootstrap-icons', stroke: 0, path: (n) => join('icons', n + '.svg') },
  'material-symbols': { pkg: '@material-symbols/svg-400', stroke: 0, path: (n) => join('outlined', n + '.svg') },
  tabler: { pkg: '@tabler/icons', stroke: 2, path: (n) => join('icons/outline', n + '.svg') },
}

/**
 * Radix ships its icons as compiled React components, one module. The path
 * data in that module IS their published artifact, the same way a stylesheet
 * is, so it is read with a pattern and validated hard: an icon that yields no
 * path is an error, never an empty square.
 */
function radixSvg(source, exportName) {
  const at = source.indexOf(exportName + ' =')
  if (at < 0) throw new Error('@radix-ui/react-icons has no export "' + exportName + '"')
  const next = source.indexOf('Icon =', at + exportName.length)
  const block = source.slice(at, next < 0 ? undefined : next)
  const paths = [...block.matchAll(/d:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1])
  if (!paths.length) throw new Error('no path data found for radix icon "' + exportName + '"')
  return paths.map((d) => '<path d="' + d + '" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/>').join('')
}

/** Ant's icons are ASTs in @ant-design/icons-svg, one file per icon. */
function antdSvg(source, name) {
  const box = /["']?viewBox["']?:\s*['"]([^'"]+)['"]/.exec(source)?.[1] ?? '64 64 896 896'
  const paths = [...source.matchAll(/["']?d["']?:\s*['"]((?:[^'"\\]|\\.)*)['"]/g)].map((m) => m[1])
  if (!paths.length) throw new Error('no path data found for antd icon "' + name + '"')
  return { body: paths.map((d) => '<path d="' + d + '"/>').join(''), box }
}

/**
 * Read every set a kit names, translated for the given lucide-named list.
 * Returns { sets: {setId: {name: {body, box, stroke}}}, provenance: [lines],
 * fallbacks: [{set, name}] } — the caller decides which kit points at which
 * set and what fills the gaps.
 */
export function readIconSets(names, only = null) {
  const sets = {}, provenance = [], fallbacks = []
  const wanted = new Set(only ?? Object.values(KIT_ICON_SETS))

  for (const setId of wanted) {
    const table = TRANSLATIONS[setId]
    for (const n of names) {
      if (!(n in table)) throw new Error(setId + ' has no translation for "' + n + '" — add it to TRANSLATIONS in icon-sets.mjs')
    }
    const out = {}
    if (setId === 'radix-icons') {
      const p = openNpm('@radix-ui/react-icons')
      const modFile = p.list('dist').find((f) => f.endsWith('.esm.js') || f.endsWith('.mjs'))
      if (!modFile) throw new Error('@radix-ui/react-icons: no esm module found in dist/')
      const source = p.read(join('dist', modFile))
      for (const n of names) {
        const own = table[n]
        if (!own) { fallbacks.push({ set: setId, name: n }); continue }
        const pascal = own.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('')
        out[n] = { body: radixSvg(source, pascal + 'Icon'), box: '0 0 15 15', stroke: 0 }
      }
      provenance.push(setId + ' ' + p.version + ' · ' + p.license)
    } else if (setId === 'antd-icons') {
      const p = openNpm('@ant-design/icons-svg')
      for (const n of names) {
        const own = table[n]
        const { body, box } = antdSvg(p.read(join('es/asn', own + '.js')), own)
        out[n] = { body, box, stroke: 0 }
      }
      provenance.push(setId + ' ' + p.version + ' · ' + p.license)
    } else {
      const r = READERS[setId]
      const p = openNpm(r.pkg)
      for (const n of names) {
        const own = table[n]
        if (!own) { fallbacks.push({ set: setId, name: n }); continue }
        let file
        try { file = p.read(r.path(own)) } catch {
          throw new Error(r.pkg + ' has no icon called "' + own + '" (for "' + n + '") — check the set\'s own site')
        }
        out[n] = { body: inner(file), box: boxOf(file) ?? '0 0 24 24', stroke: r.stroke }
      }
      provenance.push(setId + ' ' + p.version + ' · ' + p.license)
    }
    sets[setId] = out
  }
  return { sets, provenance, fallbacks }
}
