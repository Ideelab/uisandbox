/** A folder → a zip (stored, no compression) in memory, for the CLI. */
import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
const crc32 = (b: Uint8Array) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]!) & 0xff]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }

export async function zipFolder(dir: string): Promise<Uint8Array<ArrayBuffer>> {
  const files: string[] = []
  // A build is a few thousand files at most. Past that it is a home folder or a
  // disk (`open` typed where no app runs), and reading on would take minutes.
  const MAX_FILES = 20000, MAX_BYTES = 500 * 2 ** 20
  let bytes = 0
  const walk = (d: string) => {
    let entries: string[]
    try { entries = readdirSync(d) } catch { return } // a folder it may not read is not part of a build
    for (const e of entries) {
      if (e === 'node_modules' || e === '.git' || e === '.DS_Store' || e === '.cache') continue
      const f = join(d, e), st = lstatSync(f)
      if (st.isSymbolicLink()) continue
      if (st.isDirectory()) { walk(f); continue }
      files.push(f); bytes += st.size
      if (files.length > MAX_FILES || bytes > MAX_BYTES) throw new Error(`${dir} is too big to be a build (over ${files.length > MAX_FILES ? `${MAX_FILES} files` : '500 MB'}). Start your dev server and run this again, or name the build folder (dist/, build/, out/).`)
    }
  }
  walk(dir)
  const enc = new TextEncoder()
  const locals: Uint8Array[] = [], centrals: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const data = new Uint8Array(readFileSync(f))
    const name = enc.encode(relative(dir, f).split('\\').join('/'))
    const crc = crc32(data)
    const local = new Uint8Array(30 + name.length + data.length); const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true); lv.setUint16(8, 0, true); lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true); lv.setUint16(26, name.length, true)
    local.set(name, 30); local.set(data, 30 + name.length)
    const central = new Uint8Array(46 + name.length); const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true); cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true)
    central.set(name, 46)
    locals.push(local); centrals.push(central); offset += local.length
  }
  const cdSize = centrals.reduce((n, c) => n + c.length, 0)
  const end = new Uint8Array(22); const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true)
  const total = offset + cdSize + 22
  const out = new Uint8Array(new ArrayBuffer(total)); let p = 0
  for (const l of locals) { out.set(l, p); p += l.length }
  for (const c of centrals) { out.set(c, p); p += c.length }
  out.set(end, p)
  return out
}
