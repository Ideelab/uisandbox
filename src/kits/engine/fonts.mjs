/**
 * THE FONTS YOU CAN CHOOSE FROM — read, not curated.
 *
 * A design system generator with no opinion of its own cannot ship a list of
 * "good fonts". So it does not. There are exactly two published sources here:
 *
 *   · the families the kits themselves publish — every kit names a default
 *     stack, and Open Props publishes fifty-six of them (transitional, humanist,
 *     old-style, industrial …). These are system stacks: nothing to download.
 *   · Google Fonts, from Google's own metadata endpoint. 1900-odd families with
 *     their category and popularity, no key, no curation by us. A family from
 *     here is a download, and the export says so.
 *
 * Cached in kits/fonts.json because it is a 2.7 MB fetch; --refresh re-reads it.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const CACHE = 'kits/fonts.json'
const SOURCE = 'https://fonts.google.com/metadata/fonts'

export async function googleFonts({ refresh = false } = {}) {
  if (!refresh && existsSync(CACHE)) return JSON.parse(readFileSync(CACHE, 'utf8'))
  const r = await fetch(SOURCE)
  if (!r.ok) throw new Error(`Google Fonts metadata answered ${r.status}`)
  const d = await r.json()
  const list = (d.familyMetadataList ?? [])
    /* latin only, because a specimen nobody can read is not a choice.
       `subsets` is an ARRAY of names, not an object — reading it as one
       filtered every family out and the list came back empty. */
    .filter((f) => (f.subsets ?? []).includes('latin'))
    .map((f) => ({
      family: f.family,
      category: f.category,
      /* Google's own popularity rank, kept so the list can be ordered by
         something they publish rather than by what we happen to like. */
      rank: f.popularity ?? 9999,
      /* a variable font is one download for every weight */
      variable: (f.axes ?? []).length > 0,
      /* Google's OWN classification. A face it calls Display or Handwriting is
         not a body face, and this is the published fact that says so — the
         alternative was a judgement of ours about which faces read well. */
      tags: f.classifications ?? [],
    }))
    .sort((a, b) => a.rank - b.rank)
  const out = { source: SOURCE, read: list.length, families: list }
  writeFileSync(CACHE, JSON.stringify(out))
  return out
}

/**
 * Every family a kit publishes, as choices that need no download.
 * Open Props names its stacks (--font-humanist, --font-old-style); the others
 * publish one or two. The LABEL is the kit's own variable name, so nothing here
 * is a name we made up.
 */
/* A system stack has no font NAME — its first entry is `-apple-system`, which
 * is not something to put on a card. The kit's own variable is the name: Open
 * Props publishes humanist, transitional, industrial and antique, and the rest
 * publish one default each. */
function prettyName(varName, kitName) {
  const t = varName.replace(/^--/, '').replace(/^(mantine|bs|md-ref-typeface)-/, '')
    .replace(/-?font(-family)?-?/, '').replace(/^default$|^$/, '')
  return t ? t[0].toUpperCase() + t.slice(1).replace(/-/g, ' ') : `${kitName} default`
}

export function kitFonts(kits) {
  const seen = new Map()
  for (const kit of Object.values(kits)) {
    for (const [name, value] of Object.entries(kit.modes?.light ?? {})) {
      if (!/font(-family)?(-[a-z]+)?$/.test(name)) continue
      if (/style|weight|size|smoothing|feature|mono|code|em-|strong-|quote-/.test(name)) continue
      if (typeof value !== 'string') continue
      /* a real stack, not a pointer at one: `normal` and `--theme(--font-sans)`
         both matched the name pattern and neither is a family */
      if (!/[,'"]/.test(value) || value.includes('var(') || value.includes('--theme(')) continue
      const key = value.replace(/['"\s]/g, '').toLowerCase()
      const at = seen.get(key)
      if (at) { if (!at.from.includes(kit.name)) at.from.push(kit.name); continue }
      seen.set(key, { family: value, name: prettyName(name, kit.name), from: [kit.name],
        label: name.replace(/^--/, ''), stack: true })
    }
  }
  return [...seen.values()]
}

/* pathToFileURL, not string concatenation: this project lives in a directory
 * with a space in its name, so import.meta.url is percent-encoded and
 * `file://${process.argv[1]}` never matched. The guard was silently false and
 * running the file directly printed nothing at all. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const g = await googleFonts({ refresh: process.argv.includes('--refresh') })
  console.log(`\n  ${g.read} families read from ${g.source}`)
  console.log(`  most popular: ${g.families.slice(0, 8).map((f) => f.family).join(', ')}`)
  const cats = {}
  for (const f of g.families) cats[f.category] = (cats[f.category] ?? 0) + 1
  console.log(`  ${Object.entries(cats).map(([c, n]) => `${c} ${n}`).join(' · ')}`)
  console.log(`  ${g.families.filter((f) => f.variable).length} variable\n`)
}
