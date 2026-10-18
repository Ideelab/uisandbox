import { describe, it, expect } from 'vitest'
import { pinToBuild, lightDeclarations } from '../pin'

const THEME = `/* YOUR DESIGN SYSTEM */

:root, [data-bs-theme=light] {
  --bs-primary: #0d6efd;
  --bs-secondary-bg: #ececec;
  --bs-emphasis-color: #212529;
  --bs-new-thing: 4px;
}

[data-bs-theme=dark] {
  --bs-secondary-bg: #2f2f30;
}
`

describe("a build's own variables win over what the engine derives", () => {
  const page = { '--bs-primary': '#0d6efd', '--bs-secondary-bg': '#e9ecef', '--bs-emphasis-color': '#000000' }
  const { css, pinned } = pinToBuild(THEME, page)

  it('pins every declaration the page already sets to what the page has', () => {
    expect(css).toMatch(/--bs-secondary-bg: #e9ecef;/)
    expect(css).toMatch(/--bs-emphasis-color: #000000;/)
    expect(pinned).toEqual(['--bs-secondary-bg', '--bs-emphasis-color'])
  })

  it('leaves what already agrees, and what the build does not define', () => {
    expect(css).toMatch(/--bs-primary: #0d6efd;/)
    expect(css).toMatch(/--bs-new-thing: 4px;/)   // derivation fills what no build defines
  })

  it('does not touch the dark block, and says so', () => {
    expect(css).toMatch(/\[data-bs-theme=dark\] \{\n  --bs-secondary-bg: #2f2f30;/)
    expect(css).toMatch(/The dark block below is still derived/)
  })

  it('reads the light block\'s names, so the page is asked for exactly those', () => {
    expect(lightDeclarations(THEME)).toEqual(['--bs-primary', '--bs-secondary-bg', '--bs-emphasis-color', '--bs-new-thing'])
  })

  it('is a no-op on a theme the page already agrees with', () => {
    const same = pinToBuild(THEME, { '--bs-primary': '#0d6efd', '--bs-secondary-bg': '#ececec', '--bs-emphasis-color': '#212529' })
    expect(same.pinned).toEqual([])
    expect(same.css).toBe(THEME)
  })
})
