import { describe, it, expect } from 'vitest'
import { applyLook, lookFont, looks } from '../looks'
import { looks as fromKits } from '../../../scripts/kit-looks.mjs'
import { DEFAULT_CONFIG } from '../../tokens/defaults'
import { SYSTEM_FONT } from '../../tokens/fonts'

describe('looks', () => {
  it('looks.json is what the kits publish (rerun scripts/kit-looks.mjs)', () => {
    expect(looks).toEqual(fromKits)
  })
  it("Bootstrap's look on a 10px kit: its brand, its system stack, its .375rem corners", () => {
    const bs = looks.find((l) => l.id === 'bootstrap')!
    const out = applyLook(DEFAULT_CONFIG, bs, 10)
    expect(out.cPrimary).toBe('#0d6efd')
    expect(out.fontBody).toBe(SYSTEM_FONT)
    expect(out.sb.radius).toBe(0.6)
    expect(out.sb.cDanger).toBe('#dc3545')
  })
  it('takes the first family the knobs can load, and leaves the font alone when there is none', () => {
    expect(lookFont('Roboto Flex, Roboto, Noto Sans, system-ui, sans-serif')).toBe('Roboto Flex')
    expect(lookFont('"Some House Face", Unheard Sans')).toBe(null)
    const out = applyLook(DEFAULT_CONFIG, { id: 'x', name: 'X', values: { fontBody: 'Unheard Sans' } }, 8)
    expect(out.fontBody).toBe(DEFAULT_CONFIG.fontBody)
  })
  it('leaves the corners alone when there is no radius to measure against', () => {
    const out = applyLook(DEFAULT_CONFIG, looks.find((l) => l.id === 'bootstrap')!, null)
    expect(out.sb.radius).toBe(DEFAULT_CONFIG.sb.radius)
  })
})
