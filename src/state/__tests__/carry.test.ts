import { describe, it, expect } from 'vitest'
import { carryOver } from '../carry'
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
