/**
 * A BUILD'S OWN VARIABLES WIN; derivation fills only what no build defines.
 *
 * The kit engine was made for a door with no build behind it: pick one
 * colour and it derives the rest — tints, secondary greys, emphasis — with
 * its own formulas. Fed a real build, those formulas disagree with what the
 * build already has. On AdminLTE, 11 of the 35 variables theme.css writes
 * came out different from the page (--bs-secondary-bg #ececec against
 * #e9ecef, --bs-emphasis-color #212529 against #000000), so applying the
 * "faithful" export to the untouched build would have moved a third of it.
 *
 * The sandbox already has the right answer for every variable the build
 * defines: the page computes it, and since every literal is tokenised, that
 * value has every turned knob in it. So each declaration in theme.css's light
 * block that the page also sets is pinned to what the page computes. The
 * result is a no-op on the untouched build and, after knobs, exactly the
 * screen the person approved — which is what "Export: exactly what is in the
 * sandbox" promised in the first place.
 *
 * Only theme.css carries derived variables; DESIGN.md and tokens.json carry
 * role values, which already come off the page (fromPage.ts), so the three
 * files still agree.
 *
 * The DARK block is left as the engine wrote it. The build's own dark values
 * exist only while its dark switch is on, and reading them means switching
 * the frame. Not done yet, and said so in the file.
 */

/** The declarations of the first block: the light theme. */
export function lightDeclarations(css: string): string[] {
  const i = css.indexOf('{'), j = css.indexOf('}', i)
  if (i < 0 || j < 0) return []
  return [...css.slice(i + 1, j).matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]!)
}

export function pinToBuild(css: string, page: Record<string, string>): { css: string; pinned: string[] } {
  const i = css.indexOf('{'), j = css.indexOf('}', i)
  if (i < 0 || j < 0) return { css, pinned: [] }
  const pinned: string[] = []
  const block = css.slice(i + 1, j).replace(/(--[\w-]+)(\s*:\s*)([^;]+);/g, (whole, name: string, sep: string, value: string) => {
    const have = page[name]?.trim()
    if (!have || have === value.trim()) return whole
    pinned.push(name)
    return `${name}${sep}${have};`
  })
  const note = pinned.length
    ? `\n/* ${pinned.length} of these are pinned to the value your build already has, so this
 * block changes nothing you did not turn. The engine would have derived them;
 * your build's own variables win. The dark block below is still derived. */\n`
    : ''
  return { css: css.slice(0, i) + '{' + block + '}' + note + css.slice(j + 1), pinned }
}
