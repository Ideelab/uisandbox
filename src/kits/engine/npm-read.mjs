/**
 * READING A PACKAGE.
 *
 * The three ways this project touches somebody else's source: unpack their
 * tarball, take one block out of a stylesheet, take its variables. Separated
 * from fetch-kits.mjs because that file DOES things when it loads — importing
 * it to borrow one function ran the whole fetch.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Unpack an npm tarball once and read as many files out of it as you like.
 * Radix ships one stylesheet per accent colour, so a helper that re-packs the
 * tarball per file would run `npm pack` twenty-five times to answer one
 * question.
 */
export function openNpm(pkg) {
  const dir = mkdtempSync(join(tmpdir(), 'dsg-'))
  const tgz = execFileSync('npm', ['pack', pkg, '--silent', '--pack-destination', dir], { encoding: 'utf8' }).trim().split('\n').pop()
  execFileSync('tar', ['xzf', join(dir, tgz), '-C', dir])
  const meta = JSON.parse(readFileSync(join(dir, 'package', 'package.json'), 'utf8'))
  return {
    version: tgz.replace(/^(.+)-(\d.*)\.tgz$/, '$2'),
    license: typeof meta.license === 'string' ? meta.license : meta.license?.type ?? null,
    npm: meta.name, home: meta.homepage ?? null,
    /* what the package itself says it leans on. The stack model reads behaviour
       out of this rather than out of an opinion: a kit that depends on radix-ui
       brings the Radix behaviour with it, and says so in its own manifest. */
    deps: [...Object.keys(meta.dependencies ?? {}), ...Object.keys(meta.peerDependencies ?? {})],
    /* AND THE PEERS ON THEIR OWN, which is a different question with a
       different answer: a dependency is what a package carries, a PEER is what
       it demands of the app around it. Mantine depends on forty things and
       demands one — React — and that second number is the one that decides
       whether you can use it at all. */
    peers: Object.keys(meta.peerDependencies ?? {}),
    read: (f) => readFileSync(join(dir, 'package', f), 'utf8'),
    list: (sub) => readdirSync(join(dir, 'package', sub)),
    close: () => rmSync(dir, { recursive: true, force: true }),
  }
}

/** Pull one file out of an npm tarball, without installing anything. */
export function fromNpm(pkg, file) {
  const dir = mkdtempSync(join(tmpdir(), 'dsg-'))
  try {
    const tgz = execFileSync('npm', ['pack', pkg, '--silent', '--pack-destination', dir], { encoding: 'utf8' }).trim().split('\n').pop()
    execFileSync('tar', ['xzf', join(dir, tgz), '-C', dir])
    const version = tgz.replace(/^(.+)-(\d.*)\.tgz$/, '$2')
    /* the licence comes out of their package.json too — a licence anyone typed
       from memory is the one thing in a manifest that must never be wrong */
    const meta = JSON.parse(readFileSync(join(dir, 'package', 'package.json'), 'utf8'))
    return { text: readFileSync(join(dir, 'package', file), 'utf8'), version,
      license: typeof meta.license === 'string' ? meta.license : meta.license?.type ?? null,
      npm: meta.name, home: meta.homepage ?? null,
      deps: [...Object.keys(meta.dependencies ?? {}), ...Object.keys(meta.peerDependencies ?? {})],
      peers: Object.keys(meta.peerDependencies ?? {}) }
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

/**
 * The declarations of one CSS block, found by its selector.
 * `cssVars` on a whole file would sweep up component-level overrides and make
 * the map look richer than it is; this takes exactly one block.
 */
export function blockOf(text, selector, { first = false } = {}) {
  /* EVERY block with this selector, merged in source order.
   *
   * Two traps, both hit for real while reading Mantine. A literal string misses
   * `:root,\n:host {`, so the kit read zero variables and still reported
   * success. And taking only the FIRST match misses it again: Mantine's first
   * :root,:host carries one declaration and the 224 variables are in a later
   * one. Reading a kit wrong is worse than not reading it, because nothing
   * downstream can tell the difference. */
  const re = new RegExp(selector instanceof RegExp ? selector.source
    : selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/,\s+/g, ',\\s*'), 'g')
  const out = {}
  for (const at of text.matchAll(re)) {
    const open = text.indexOf('{', at.index)
    if (open < 0) continue
    Object.assign(out, cssVars(text.slice(open, text.indexOf('}', open))))
    if (first) break
  }
  return out
}

/* Merging is the right default and the wrong one exactly once: Radix repeats
 * every colour file's selector inside an @supports block to restate the same
 * scale in display-p3. Merge there and you get color(display-p3 …) where a hex
 * was asked for, which is how the accent list silently went from 31 to 0. */

/** `--name: value;` pairs of a CSS block, in source order. */
export function cssVars(text) {
  const out = {}
  for (const m of text.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+)[;}]/gi)) out[m[1]] = m[2].trim()
  return out
}
