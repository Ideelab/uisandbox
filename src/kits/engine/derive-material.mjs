/**
 * MATERIAL'S OWN GENERATOR, RUN BY US.
 *
 * M3 computes its colour roles from one seed. Approximating that ourselves
 * would be exactly the opinion this project refuses to have, so we call their
 * package — and their package ships extensionless ESM imports that Node will not
 * resolve on its own, which is what the loader hook below is for. Their
 * algorithm, our plumbing.
 *
 * Returns null, loudly, if it cannot run. A scheme we made up would be worse
 * than no scheme.
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const LOADER = `import { register } from 'node:module'
register('data:text/javascript,' + encodeURIComponent([
  "export async function resolve(spec, ctx, next) {",
  "  if (spec.startsWith('.') && !/\\\\.[a-z]+$/i.test(spec)) {",
  "    try { return await next(spec + '.js', ctx) } catch {}",
  "  }",
  "  return next(spec, ctx)",
  "}",
].join('\\n')), import.meta.url)
`

const DERIVE = `import { Hct, SchemeTonalSpot, MaterialDynamicColors, argbFromHex, hexFromArgb } from '@material/material-color-utilities'
/* THE DYNAMIC SCHEME, NOT THE LEGACY ONE.
 *
 * themeFromSourceColor().schemes.light is M3's 2021 Scheme: 29 roles, and
 * surface-container is not among them. @material/web reads the 2023 roles —
 * its menu, its card and its list all draw on surface-container — so those
 * five fell through to the package's own defaults, which are the baseline
 * lavender. A teal seed produced a lavender menu and nothing said why.
 *
 * MaterialDynamicColors over a SchemeTonalSpot is the same generator their
 * theme builder runs, and it answers all 54. */
const src = Hct.fromInt(argbFromHex(process.argv[2]))
const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
const out = {}
for (const mode of ['light', 'dark']) {
  const scheme = new SchemeTonalSpot(src, mode === 'dark', 0)
  out[mode] = {}
  for (const [name, colour] of Object.entries(MaterialDynamicColors)) {
    if (!colour || typeof colour.getArgb !== 'function') continue
    out[mode]['--md-sys-color-' + kebab(name)] = hexFromArgb(colour.getArgb(scheme))
  }
}
console.log(JSON.stringify(out))
`

/** @param seed a hex colour  @param cwd a directory with the package installed */
export function deriveMaterial(seed, cwd) {
  const tmp = mkdtempSync(join(tmpdir(), 'dsg-md-'))
  try {
    writeFileSync(join(cwd, '.dsg-loader.mjs'), LOADER)
    writeFileSync(join(cwd, '.dsg-derive.mjs'), DERIVE)
    const out = execFileSync('node', ['--import', './.dsg-loader.mjs', '.dsg-derive.mjs', seed], { cwd, encoding: 'utf8' })
    return JSON.parse(out)
  } catch (e) {
    return { error: e.message.split('\n')[0] }
  } finally { rmSync(tmp, { recursive: true, force: true }) }
}
