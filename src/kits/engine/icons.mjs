/**
 * LUCIDE, READ FROM LUCIDE.
 *
 * Every icon in this project used to be drawn by hand from memory of what the
 * shape looks like. That is the same mistake as typing a kit's default colour:
 * it is right by luck and stale by their next release. lucide-static ships all
 * 2034 as individual SVG files, ISC-licensed, so the build reads the ones the
 * page names and inlines their geometry.
 *
 * An icon that cannot be read is an ERROR, not a blank square — a control with
 * no glyph is a control nobody can use.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export function icons(names) {
  const dir = mkdtempSync(join(tmpdir(), 'dsg-icons-'))
  try {
    const tgz = execFileSync('npm', ['pack', 'lucide-static@latest', '--silent', '--pack-destination', dir], { encoding: 'utf8' }).trim().split('\n').pop()
    execFileSync('tar', ['xzf', join(dir, tgz), '-C', dir])
    const version = tgz.replace(/^lucide-static-(.+)\.tgz$/, '$1')
    const out = {}
    for (const name of names) {
      const file = join(dir, 'package/icons', `${name}.svg`)
      if (!existsSync(file)) throw new Error(`lucide has no icon called "${name}" — check the name at lucide.dev`)
      /* just the geometry: the wrapper's size, stroke and colour are the page's
         to decide, and baking theirs in would fight every place it is used */
      const svg = readFileSync(file, 'utf8')
      out[name] = svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>')).replace(/\s+/g, ' ').trim()
    }
    return { version, license: 'ISC', icons: out }
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

/** One icon as markup. Stroke and size stay the caller's. */
export const svg = (set, name, size = 16) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${set[name] ?? ''}</svg>`
