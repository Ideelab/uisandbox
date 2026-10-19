import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { kitPage, indexPage, siteCss } from '../../../scripts/kit-pages.mjs'
import DOOR from '../door.json'

const pub = (p: string) => new URL(`../../../public/${p}`, import.meta.url)

describe('the kit pages (rerun scripts/kit-pages.mjs when this fails)', () => {
  for (const d of DOOR.filter((k) => k.renders)) {
    it(`/kits/${d.id}/ is what the kit data and the links say, with its screenshot`, () => {
      expect(readFileSync(pub(`kits/${d.id}/index.html`), 'utf8')).toBe(kitPage(d))
      expect(existsSync(pub(`kits/${d.id}.jpg`))).toBe(true)
    })
  }
  it('/kits/ and site.css are current', () => {
    expect(readFileSync(pub('kits/index.html'), 'utf8')).toBe(indexPage())
    expect(readFileSync(pub('site.css'), 'utf8')).toBe(siteCss())
  })
  it('the pages carry no em-dash (the copy rule)', () => {
    for (const d of DOOR.filter((k) => k.renders)) expect(kitPage(d)).not.toMatch(/—/)
    expect(indexPage()).not.toMatch(/—/)
  })
})
