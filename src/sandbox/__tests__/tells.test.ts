// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { measureTells } from '../tells'

/** A page with one stylesheet and one heading, built with DOM methods. */
const page = (css: string) => {
  document.head.replaceChildren()
  document.body.replaceChildren()
  const style = document.createElement('style')
  style.textContent = css
  document.head.append(style)
  const h1 = document.createElement('h1')
  h1.textContent = 'Dashboard'
  document.body.append(h1)
  return document
}
const ids = (doc: Document, brand: string) => measureTells(doc, brand).map((t) => t.id).sort()

describe('the AI tells, measured', () => {
  it("names shadcn's defaults and Geist on a page that kept them", () => {
    expect(ids(page('body{font-family:"Geist Variable",sans-serif}'), '#171717')).toEqual(['defaults', 'font'])
  })
  it('names an indigo brand and Inter, also as a variable build', () => {
    expect(ids(page('body{font-family:InterVariable,sans-serif}'), '#6366f1')).toEqual(['accent', 'font'])
  })
  it('names nothing on a page that chose its own', () => {
    expect(ids(page('body{font-family:Newsreader,serif}'), '#1f3a5f')).toEqual([])
  })
  it('says the knobs reach the brand', () => {
    expect(measureTells(page('body{font-family:Newsreader}'), '#6366f1').find((x) => x.id === 'accent')?.knobs).toBe(true)
  })
})
