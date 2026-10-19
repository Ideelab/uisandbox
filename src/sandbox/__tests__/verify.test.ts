// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { compareDocuments, inFlatTree, blurDeep } from '../verify'

/* A document with a window: jsdom's createHTMLDocument has no defaultView,
 * an iframe's contentDocument does. */
const doc = (body: string, guard = true) => {
  const f = document.createElement('iframe')
  document.body.appendChild(f)
  const d = f.contentDocument!
  d.head.innerHTML = guard ? '<script id="us-guard"></script>' : ''
  d.body.innerHTML = body
  return d
}

describe('compareDocuments — the control', () => {
  it('refuses a document the sandbox did not serve (no guard): the host index is not their page', () => {
    const r = compareDocuments(doc('<p>x</p>', false), doc('<p>x</p>'))
    expect(r.ok).toBe(false)
    expect(r.refusal).toMatch(/did not serve/)
    expect(r.elements).toBe(0)
  })
  it('pairs by path and passes identical documents', () => {
    const r = compareDocuments(doc('<div><p>a</p><p>b</p></div>'), doc('<div><p>a</p><p>b</p></div>'))
    expect(r.ok).toBe(true)
    expect(r.elements).toBe(3)
  })
})

describe('inFlatTree', () => {
  it('an unslotted light-DOM child of a shadow host is not in the flat tree', () => {
    const d = doc('<x-host><span id="loose">l</span><span id="named" slot="s">n</span></x-host><p id="plain">p</p>')
    const host = d.querySelector('x-host')!
    host.attachShadow({ mode: 'open' }).innerHTML = '<slot name="s"></slot>'
    expect(inFlatTree(d.getElementById('plain')!)).toBe(true)
    expect(inFlatTree(d.getElementById('named')!)).toBe(true)
    expect(inFlatTree(d.getElementById('loose')!)).toBe(false)
  })
})

describe('blurDeep', () => {
  it('takes focus off an element, so neither frame is measured with a focus ring', () => {
    const d = doc('<a id="a" href="#">x</a>')
    d.getElementById('a')!.focus()
    expect(d.activeElement?.id).toBe('a')
    blurDeep(d)
    expect(d.activeElement).toBe(d.body)
  })
  it('reaches into a shadow root', () => {
    const d = doc('<div id="host"></div>')
    const sr = d.getElementById('host')!.attachShadow({ mode: 'open' })
    sr.innerHTML = '<button id="b">x</button>'
    ;(sr.getElementById('b') as HTMLButtonElement).focus()
    expect(sr.activeElement?.id).toBe('b')
    blurDeep(d)
    expect(sr.activeElement).toBe(null)
    expect(d.activeElement).toBe(d.body)
  })
  it('does nothing on a document with nothing focused', () => {
    const d = doc('<p>x</p>')
    blurDeep(d)
    expect(d.activeElement).toBe(d.body)
  })
})

describe('compareDocuments with focus taken off', () => {
  it('still reports a real outline-color difference on the element that had focus', () => {
    const a = doc('<a id="x" href="#" style="outline-color: rgb(255, 0, 0)">x</a>')
    const b = doc('<a id="x" href="#" style="outline-color: rgb(0, 0, 255)">x</a>')
    b.getElementById('x')!.focus()
    const r = compareDocuments(a, b, ['outline-color'])
    expect(r.ok).toBe(false)
    expect(r.mismatches.map((m) => [m.prop, m.raw, m.sandbox])).toEqual([['outline-color', 'rgb(255, 0, 0)', 'rgb(0, 0, 255)']])
  })
})
