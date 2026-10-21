import { describe, it, expect } from 'vitest'
import { carryOver, carryToken, readCarryToken, withKeys } from '../carry'
import { DEFAULT_CONFIG } from '../../tokens/defaults'
import type { Config } from '../../tokens/types'

const kitBase: Config = { ...DEFAULT_CONFIG, cPrimary: '#171717' as Config['cPrimary'], fontBody: 'System' }
const appBase: Config = { ...DEFAULT_CONFIG, cPrimary: '#4e73df' as Config['cPrimary'], fontBody: 'Custom: Nunito', sb: { ...DEFAULT_CONFIG.sb, space: 1 } }

describe('carryOver', () => {
  it('carries what was turned, and only that', () => {
    const turned: Config = { ...kitBase, cPrimary: '#e11d48' as Config['cPrimary'], sb: { ...kitBase.sb, radius: 2 } }
    const r = carryOver(kitBase, turned, appBase)
    expect(r.keys.sort()).toEqual(['cPrimary', 'sb.radius'])
    expect(r.cfg.cPrimary).toBe('#e11d48')
    expect(r.cfg.sb.radius).toBe(2)
    // what was left alone starts where the app's own code puts it
    expect(r.cfg.fontBody).toBe('Custom: Nunito')
    expect(r.cfg.sb.space).toBe(1)
  })
  it('keeps the radius dial apart from the radius style of the same name', () => {
    const turned: Config = { ...kitBase, sb: { ...kitBase.sb, radius: 2 } }
    const r = carryOver(kitBase, turned, { ...appBase, radius: 'round' as Config['radius'] })
    expect(r.cfg.sb.radius).toBe(2)
    expect(r.cfg.radius).toBe('round')
  })
  it('carries nothing when nothing was turned', () => {
    const r = carryOver(kitBase, kitBase, appBase)
    expect(r.keys).toEqual([])
    expect(r.cfg).toEqual(appBase)
  })
})

describe('the carry token on the command line', () => {
  it('takes what was turned on a kit to the app the line opens', () => {
    const turned: Config = { ...kitBase, cPrimary: '#e11d48' as Config['cPrimary'], fontBody: 'Figtree', sb: { ...kitBase.sb, radius: 1.8 } }
    const t = carryToken('shadcn/ui', kitBase, turned)!
    // safe in any shell: no $, no quotes, no spaces, no + or /
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/)
    const r = readCarryToken(t)!
    expect(r.name).toBe('shadcn/ui')
    expect(r.keys.sort()).toEqual(['cPrimary', 'fontBody', 'sb.radius'])
    const onApp = withKeys(appBase, r.cfg, r.keys)
    expect(onApp).toEqual(carryOver(kitBase, turned, appBase).cfg)
  })
  it('has nothing to carry from an untouched kit, and refuses a broken token', () => {
    expect(carryToken('shadcn/ui', kitBase, kitBase)).toBeNull()
    expect(readCarryToken('not-a-token')).toBeNull()
    expect(readCarryToken('')).toBeNull()
  })
})
