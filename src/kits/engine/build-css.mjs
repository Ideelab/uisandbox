/**
 * BUILD EACH KIT'S REAL CSS, ONCE.
 *
 * Shared by the quick preview and by the page, so what you look at while
 * turning a knob is compiled the same way as what you download. Two things here
 * cannot happen in a browser and that is the honest constraint the page is
 * built around: Bootstrap's brand is compiled by Sass, and Material derives its
 * scheme with its own generator. Everything else is custom properties, which a
 * running page CAN change — so the page changes those live and marks the two
 * that need a rebuild.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generate } from './generate.mjs'
import { deriveMaterial } from './derive-material.mjs'
import { materialElements } from './material-elements.mjs'
import { openNpm } from './npm-read.mjs'
import { route } from './roles.mjs'
import { antdRender } from './antd-render.mjs'
import { antdNodes } from './antd-nodes.mjs'
import { SCENES, ICON_NAMES } from './scenes.mjs'
import { SPECIMEN } from './parts.mjs'
import { icons } from './icons.mjs'

/**
 * A stylesheet is read from a file and written into a <style> element, and a
 * byte order mark survives that trip as a character. Stripped for every kit,
 * not just the one that was caught: any of them could ship one tomorrow, and
 * the failure is silent in all of them.
 */
export const noBom = (s) => s.replace(/^\uFEFF/, '')

export async function buildCss(VALUES, IDS, kits, body, log = console.log, extras = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dsg-css-'))
  const css = {}
  try {
/* ── the CSS each kit really needs ────────────────────────────────────────── */
  const files = generate(VALUES, IDS, kits)

  /* Tailwind, daisyUI and shadcn all compile through Tailwind. Their markup is
     scanned so only the utilities actually used are emitted. */
  mkdirSync(join(dir, 'src'), { recursive: true })
  /* shadcn's prelude is not empty: ten of the class names its registry hands us
     are tw-animate-css utilities, which its own globals.css imports. Left out,
     its menu, dialog, popover and tooltip have no entrance at all. */
  const TW = [['tailwind', ''], ['daisyui', '@plugin "daisyui";'],
    ['shadcn', kits.shadcn?.animates ? '@import "tw-animate-css";' : '']].filter(([id]) => IDS.includes(id))
  /* Only the versions of kits that are actually in this build. Naming daisyUI's
     version while building Bootstrap alone read it off a kit that was never
     loaded, and the whole preview died before it compiled anything. */
  const dev = {}
  if (TW.length && !kits.tailwind) {
    /* daisyUI and shadcn are compiled BY Tailwind, so its document is needed
       even when it is not one of the kits being rendered. Saying which is
       missing beats a TypeError three frames down. */
    throw new Error(`${TW.map(([id]) => id).join(' and ')} compile through Tailwind, so kits/tailwind.json has to be loaded too`)
  }
  if (TW.length) {
    dev['@tailwindcss/cli'] = `^${kits.tailwind.version}`
    dev.tailwindcss = `^${kits.tailwind.version}`
    if (kits.daisyui) dev.daisyui = `^${kits.daisyui.version}`
    if (kits.shadcn?.animates) dev[kits.shadcn.animates.npm] = `^${kits.shadcn.animates.version}`
  }
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'p', private: true, type: 'module', devDependencies: dev }))
  for (const [id, plugin] of TW) {
    writeFileSync(join(dir, `src/${id}.html`), body(id))
    /* ONLY this kit's block. Loading the whole theme.css put shadcn's --border
       (a colour) into daisyUI's --border (a width) and every checkbox lost its
       outline — the exact collision the manifest now reports. */
    writeFileSync(join(dir, `src/${id}.css`), `@import "tailwindcss";\n${plugin}\n${files._blocks[id]}`)
  }
  if (TW.length) {
  log('installing the kits the package names…')
  execFileSync('npm', ['install', '--silent', '--no-audit', '--no-fund'], { cwd: dir, stdio: 'pipe' })
  for (const [id] of TW) {
    execFileSync('npx', ['@tailwindcss/cli', '-i', `src/${id}.css`, '-o', `${id}.out.css`, '--content', `src/${id}.html`, '--minify'], { cwd: dir, stdio: 'pipe' })
    css[id] = readFileSync(join(dir, `${id}.out.css`), 'utf8')
  }
  }

  /* Bootstrap's brand is compiled, so the preview COMPILES it. Showing the wall
     in Bootstrap's factory blue while the manifest promises your teal would read
     as a broken tool — the wall has to do what the package says it does. */
  if (IDS.includes('bootstrap')) {
  log('compiling Bootstrap from the Sass entry point the package ships…')
  execFileSync('npm', ['install', '--silent', '--no-audit', '--no-fund', `bootstrap@${kits.bootstrap.version}`, 'sass'], { cwd: dir, stdio: 'pipe' })
  writeFileSync(join(dir, 'custom.scss'), files['_custom.scss'].replace('bootstrap/scss/bootstrap', 'node_modules/bootstrap/scss/bootstrap'))
  try {
    /* --no-charset, and the strip below.
     *
     * In compressed mode dart-sass puts a BYTE ORDER MARK at the top of the
     * file instead of an @charset rule. Read as a file that is invisible; read
     * INTO a <style> element in the middle of a page it is one more character
     * in front of the first selector, and `\uFEFF:root, [data-bs-theme=light]`
     * is not a selector. The browser threw the whole list away — so Bootstrap
     * ran with its ENTIRE :root variable block missing, every default of the
     * five hundred it publishes gone, and only the thirty our own block writes
     * left standing. Its dropdown had no border because the border colour it
     * asks for was one of the casualties.
     *
     * Nothing reported this. The stylesheet compiled, the page rendered, and
     * what was on it was Bootstrap minus its defaults. */
    execFileSync('npx', ['sass', '--no-source-map', '--style=compressed', '--no-charset', '--load-path=.', 'custom.scss', 'bootstrap.out.css'], { cwd: dir, stdio: 'pipe' })
    css.bootstrap = noBom(readFileSync(join(dir, 'bootstrap.out.css'), 'utf8')) + '\n' + files._blocks.bootstrap
  } catch (e) {
    log(`\n  ################  BOOTSTRAP'S SASS BUILD FAILED  ################\n  ✗ the Sass build failed — falling back to their shipped CSS, so the brand will be Bootstrap's own\n    ${String(e.stderr ?? e.message).split('\n').slice(0, 6).join('\n    ')}`)
    const bs = join(dir, 'node_modules/bootstrap/dist/css/bootstrap.min.css')
    css.bootstrap = (existsSync(bs) ? noBom(readFileSync(bs, 'utf8')) : '') + '\n' + files._blocks.bootstrap
  }

  }

  /* Material DERIVES its 47 colour roles from the seed. Setting only --primary
     and leaving the other 46 at Material's factory purple is exactly the
     half-applied theme the manifest warns about — so the preview runs their own
     generator, which is what `derives` was always supposed to mean. */
  if (IDS.includes('material')) {
  log('deriving the Material scheme with its own generator…')
  let mt = Object.entries(kits.material.modes.light).map(([k, v]) => `${k}:${v}`).join(';')
  try {
    execFileSync('npm', ['install', '--silent', '--no-audit', '--no-fund', '@material/material-color-utilities'], { cwd: dir, stdio: 'pipe' })
    const derived = deriveMaterial(VALUES.brand, dir)
    if (derived.error) throw new Error(derived.error)
    mt = `${mt};${Object.entries(derived.light).map(([k, v]) => `${k}:${v}`).join(';')}`
    /* WHICH ROLES THE GENERATOR DID NOT ANSWER.
     *
     * Our line goes after theirs, so anything the generator leaves out keeps
     * the package's own default — which is M3's baseline lavender, whatever
     * seed you gave it. That is not a missing colour, it is a WRONG one, and
     * it is invisible unless it is counted. Five of them shipped this way. */
    const left = Object.keys(kits.material.modes.light)
      .filter((k) => k.startsWith('--md-sys-color-') && !(k in derived.light))
    log(`  ✓ ${Object.keys(derived.light).length} roles derived from ${VALUES.brand} by Material's own generator`)
    if (left.length) log(`  ! ${left.length} colour role(s) their generator does not answer, so these keep Material's own baseline: ${left.join(' ')}`)
  } catch (e) {
    log(`  ✗ could not run Material's generator (${e.message.split('\n')[0]}) — showing its factory scheme instead`)
  }
  /* Their typography stylesheet ships in the package: real md-typescale-*
     classes, so the text on the page is theirs too and not our font sizes. */
  const mdw = materialElements()
  css.material = `:root{${mt}}\n${mdw.typeTokens}\n${mdw.typescale}\n` + files._blocks.material
  }

  /* ANT DESIGN HAS TO BE RUN.
     It publishes no stylesheet at all: 3,056 class rules and 1,289 variables
     that only exist once its own algorithm has been asked for them. So the
     seeds the routing collected are handed to their generator and what comes
     back is their CSS about their tokens. Our block still goes after it, for
     the two roles their API takes no input for. */
  if (IDS.includes('antd')) {
    log("running Ant Design's own components for their CSS…")
    const routed = route(VALUES, ['antd'], kits)[0]
    const got = antdRender({ token: routed.tokens, nodes: antdNodes(SCENES, SPECIMEN), icons: { ...icons(ICON_NAMES).icons, ...(extras.antdIcons ?? {}) } })
    log(`  ✓ ${Object.keys(routed.tokens).length} tokens in, ${(got.css.length / 1024).toFixed(0)} kB of their CSS out`)
    css.antd = got.css + '\n' + (files._blocks.antd ?? '')
  }

  /* Radix, Mantine and Open Props each ship one finished stylesheet: no build
   * step, no plugin, no compile. Read it out of the package and put our block
   * after it, the same shape as everything else here. */
  const SHIPPED = {
    radix: ['@radix-ui/themes', ['styles.css']],
    mantine: ['@mantine/core', ['styles.css']],
    openprops: ['open-props', ['open-props.min.css', 'normalize.light.min.css']],
  }
  for (const [id, [pkg, wanted]] of Object.entries(SHIPPED)) {
    if (!IDS.includes(id)) continue
    log(`reading ${kits[id].name}'s own stylesheet…`)
    const p = openNpm(`${pkg}@${kits[id].version}`)
    try { css[id] = wanted.map((f) => noBom(p.read(f))).join('\n') + '\n' + (files._blocks[id] ?? '') }
    finally { p.close() }
  }

  /* The guard, because the fix above is one call per kit and a kit added later
     is a kit that does not have it. A mark anywhere in a stylesheet that gets
     inlined kills the selector it lands in front of, and kills it quietly. */
  for (const [id, sheet] of Object.entries(css)) {
    const at = sheet.indexOf('\uFEFF')
    if (at >= 0) throw new Error(`${id}'s stylesheet carries a byte order mark at ${at}. Inlined into a <style> element that is a character in front of a selector, and the browser drops the whole rule. Run it through noBom() where it is read.`)
  }

    return css
  } finally { rmSync(dir, { recursive: true, force: true }) }
}
