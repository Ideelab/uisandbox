import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { pages, GUIDES } from '../../../scripts/guide-pages.mjs'
import LINKS from '../../site/links.json'

const pub = (p: string) => new URL(`../../../public/${p}`, import.meta.url)

describe('the guides (rerun scripts/guide-pages.mjs when this fails)', () => {
  for (const [rel, html] of pages()) {
    it(`/${rel} is current and carries no em-dash`, () => {
      expect(readFileSync(pub(rel), 'utf8')).toBe(html)
      expect(html).not.toMatch(/—/)
    })
  }
  it('every guide is in the footer, the sitemap and llms.txt', () => {
    const footer = LINKS.columns.find((c) => c.title === 'Guides')!.links as Array<{ href: string }>
    const sitemap = readFileSync(pub('sitemap.xml'), 'utf8')
    const llms = readFileSync(pub('llms.txt'), 'utf8')
    for (const g of GUIDES) {
      expect(footer.map((l) => l.href)).toContain(`/${g.slug}/`)
      expect(sitemap).toContain(`https://uisandbox.org/${g.slug}/`)
      expect(llms).toContain(`https://uisandbox.org/${g.slug}/`)
    }
  })
})
