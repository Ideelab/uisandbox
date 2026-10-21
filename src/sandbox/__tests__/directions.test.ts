import { describe, expect, it } from 'vitest'
import { DIRECTIONS, applyDirection, firstRoll, reroll } from '../directions'
import { ALL_FONTS } from '../../tokens/fonts'
import { DIALS } from '../dials'
import { DEFAULT_CONFIG } from '../../tokens/defaults'

describe('looks (directions)', () => {
  it('names only fonts the font picker can load', () => {
    for (const d of DIRECTIONS) for (const pair of d.fonts) for (const f of pair) expect(ALL_FONTS).toContain(f)
  })
  it('turns dials only within their own range', () => {
    for (const d of DIRECTIONS) for (const [k, v] of Object.entries(d.sb)) {
      const dial = DIALS.find((x) => x.key === k)!
      expect(dial, k).toBeTruthy()
      expect(v).toBeGreaterThanOrEqual(dial.min)
      expect(v).toBeLessThanOrEqual(dial.max)
    }
  })
  it('stays off the tells it was made to avoid: no Inter, no indigo or violet brand', () => {
    for (const d of DIRECTIONS) {
      expect(d.fonts.flat()).not.toContain('Inter')
      for (const b of d.brands) expect(['#6366f1', '#4f46e5', '#7c3aed', '#8b5cf6']).not.toContain(b.toLowerCase())
    }
  })
  it('every brand carries white text at 4.5:1 or better, on any kit', () => {
    const lum = (h: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! }
    for (const d of DIRECTIONS) for (const b of d.brands) expect(Math.round(1.05 / (lum(b) + 0.05) * 100) / 100, `${d.id} ${b}`).toBeGreaterThanOrEqual(4.5)
  })
  it('keeps the brand and the fonts when they are locked', () => {
    const d = DIRECTIONS[0]!
    const locked = applyDirection(DEFAULT_CONFIG, d, { brand: 1, font: 1 }, { colour: true, font: true })
    expect(locked.cPrimary).toBe(DEFAULT_CONFIG.cPrimary)
    expect(locked.fontBody).toBe(DEFAULT_CONFIG.fontBody)
    expect(locked.sb.radius).toBe(d.sb.radius)
    const free = applyDirection(DEFAULT_CONFIG, d, { brand: 1, font: 1 })
    expect(free.cPrimary).toBe(d.brands[1])
    expect(free.fontDisplay).toBe(d.fonts[1]![0])
  })
  it('a shuffle shows every direction something it did not show before', () => {
    const a = firstRoll()
    const b = reroll(a, () => 0.5)
    for (const d of DIRECTIONS) {
      if (d.brands.length > 1) expect(b[d.id]!.brand).not.toBe(a[d.id]!.brand)
      if (d.fonts.length > 1) expect(b[d.id]!.font).not.toBe(a[d.id]!.font)
    }
  })
})
