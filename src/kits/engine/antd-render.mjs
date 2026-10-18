/**
 * RUNNING ANT DESIGN WITHOUT INSTALLING IT EVERY TIME.
 *
 * antd-tree.mjs needs React, antd, their cssinjs layer and a DOM to run in —
 * about 130 MB of packages and half a minute of npm. Doing that on every
 * preview would make the one kit that needs a build the one kit nobody waits
 * for, so it is done ONCE: esbuild folds the whole thing into a single file,
 * that file is cached beside the kits, and a build just runs it. Same shape as
 * the Material bundle, and for the same reason.
 *
 * The bundle is a build artefact, not source. Delete it or pass --refresh and
 * it is made again from antd-tree.mjs and whatever antd publishes today.
 */
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const BUNDLE = join(HERE, 'kits/antd.render.mjs')
const META = join(HERE, 'kits/antd.render.json')

/* Everything the tree needs, and nothing it does not. A DOM is here because
   their popups only exist once a component has mounted, which a server render
   never does. */
const NEEDS = ['react', 'react-dom', 'antd', '@ant-design/cssinjs', 'happy-dom']

/**
 * Build the bundle, or hand back the one already built.
 * Returns { version, license, home, npm, source } and leaves the bundle on disk.
 */
export function antdBundle({ refresh = false } = {}) {
  if (!refresh && existsSync(BUNDLE) && existsSync(META)) return JSON.parse(readFileSync(META, 'utf8'))

  const dir = mkdtempSync(join(tmpdir(), 'dsg-antd-'))
  try {
    const run = (cmd, args) => execFileSync(cmd, args, { cwd: dir, stdio: 'pipe', encoding: 'utf8' })
    writeFileSync(join(dir, 'package.json'), '{"type":"module","private":true}')
    run('npm', ['install', '--silent', '--no-audit', '--no-fund', ...NEEDS.map((n) => `${n}@latest`)])
    copyFileSync(join(HERE, 'antd-tree.mjs'), join(dir, 'antd-tree.mjs'))

    /* ESM with a require shim, which is the only combination that works.
       Plain ESM fails because react-dom reaches for node's own util through
       require and the bundle answers "Dynamic require is not supported" — a
       bundler's complaint about a package that is perfectly fine. Plain CJS
       fails because antd-tree awaits its imports at the top level, which CJS
       has no way to express. The banner gives an ESM bundle a real require,
       and both halves of the problem go away. */
    const BANNER = 'import{createRequire as __cr}from"node:module";'
      + 'import{fileURLToPath as __f}from"node:url";import{dirname as __d}from"node:path";'
      + 'const require=__cr(import.meta.url),__filename=__f(import.meta.url),__dirname=__d(__filename);'
    run('npx', ['--yes', 'esbuild', 'antd-tree.mjs', '--bundle', '--format=esm', '--platform=node',
      '--minify', `--outfile=${BUNDLE}`, '--log-level=error',
      '--define:process.env.NODE_ENV="production"', `--banner:js=${BANNER}`])

    const pkg = JSON.parse(readFileSync(join(dir, 'node_modules/antd/package.json'), 'utf8'))
    const meta = {
      version: pkg.version,
      license: typeof pkg.license === 'string' ? pkg.license : pkg.license?.type ?? null,
      npm: pkg.name,
      home: pkg.homepage ?? 'https://ant.design',
      source: `npm antd@${pkg.version} · its own components rendered by React, its own extractStyle for the CSS`,
      /* what they declare they lean on, so the stack model reads their
         behaviour layer out of their own manifest like every other kit's */
      deps: [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})],
      /* and what it demands of the app around it, which is the question of
         whether you can use it at all */
      peers: Object.keys(pkg.peerDependencies ?? {}),
      bytes: readFileSync(BUNDLE).length,
    }
    writeFileSync(META, JSON.stringify(meta, null, 2) + '\n')
    return meta
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

/**
 * Render a set of scene nodes with a set of tokens.
 *
 * The markup does not depend on the tokens and the CSS does, so a caller that
 * only wants one of them still gets both — the render is a quarter of a second
 * and splitting it would mean running their pipeline twice.
 *
 * @returns { css, parts, classes }
 */
export function antdRender({ token = {}, dark = false, nodes = [], icons = {} } = {}) {
  if (!existsSync(BUNDLE)) antdBundle()
  const out = execFileSync('node', [BUNDLE], {
    input: JSON.stringify({ token, dark, nodes, icons }),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    /* their libraries warn about a deprecated prop and about act() on stderr;
       neither is ours to fix and both would drown the build log */
    stdio: ['pipe', 'pipe', 'ignore'],
  })
  const got = JSON.parse(out)
  if (!got.css || !Object.keys(got.parts).length) {
    throw new Error('the Ant Design render came back empty — the bundle ran but produced no CSS or no markup')
  }
  return got
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const meta = antdBundle({ refresh: process.argv.includes('--refresh') })
  console.log(`\n  antd ${meta.version} · ${meta.license}`)
  console.log(`  ${(meta.bytes / 1024 / 1024).toFixed(1)} MB bundled — React, their components and a DOM to mount them in`)
  const got = antdRender({ token: { colorPrimary: '#0b6e8a' }, nodes: [{ p: 'button', tone: 'brand', text: 'Start a request' }] })
  console.log(`  a button, to prove it runs: ${(got.css.length / 1024).toFixed(0)} kB of their CSS, ${got.classes.length} of their classes`)
  console.log(`  ${Object.values(got.parts)[0]}\n`)
}
