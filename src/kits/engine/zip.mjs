/**
 * A ZIP, WRITTEN BY HAND. Store-only, no compression, ~60 lines.
 *
 * "Download your design system" has to be ONE file. Five separate downloads is
 * not a package, it is a mess in someone's Downloads folder — and a library to
 * avoid that would be the first dependency in a project that has none.
 *
 * Store-only is the right trade: a theme is a few kilobytes of text, deflate
 * would save nothing worth a compressor, and every unzip tool on every platform
 * has read stored entries since 1989.
 *
 * Runs in the browser and in node — it only needs TextEncoder and Uint8Array.
 */

const TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/* MS-DOS date and time, which is what a zip carries. A fixed stamp keeps the
   same input producing the same bytes — a package you can diff. */
const DOS_TIME = 0, DOS_DATE = (2026 - 1980) << 9 | 1 << 5 | 1

/** @param files path -> string  @returns Uint8Array */
export function zip(files) {
  const enc = new TextEncoder()
  const locals = [], central = []
  let offset = 0

  for (const [path, text] of Object.entries(files)) {
    const name = enc.encode(path)
    const body = enc.encode(text)
    const sum = crc32(body)

    const local = new Uint8Array(30 + name.length + body.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)          // local file header
    lv.setUint16(4, 20, true)                  // version needed
    lv.setUint16(6, 0x0800, true)              // UTF-8 names
    lv.setUint16(8, 0, true)                   // stored
    lv.setUint16(10, DOS_TIME, true); lv.setUint16(12, DOS_DATE, true)
    lv.setUint32(14, sum, true)
    lv.setUint32(18, body.length, true); lv.setUint32(22, body.length, true)
    lv.setUint16(26, name.length, true); lv.setUint16(28, 0, true)
    local.set(name, 30); local.set(body, 30 + name.length)
    locals.push(local)

    const dir = new Uint8Array(46 + name.length)
    const dv = new DataView(dir.buffer)
    dv.setUint32(0, 0x02014b50, true)          // central directory header
    dv.setUint16(4, 20, true); dv.setUint16(6, 20, true)
    dv.setUint16(8, 0x0800, true); dv.setUint16(10, 0, true)
    dv.setUint16(12, DOS_TIME, true); dv.setUint16(14, DOS_DATE, true)
    dv.setUint32(16, sum, true)
    dv.setUint32(20, body.length, true); dv.setUint32(24, body.length, true)
    dv.setUint16(28, name.length, true)
    dv.setUint32(42, offset, true)             // where its local header sits
    dir.set(name, 46)
    central.push(dir)
    offset += local.length
  }

  const dirSize = central.reduce((n, d) => n + d.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)            // end of central directory
  ev.setUint16(8, central.length, true); ev.setUint16(10, central.length, true)
  ev.setUint32(12, dirSize, true); ev.setUint32(16, offset, true)

  const total = offset + dirSize + 22
  const out = new Uint8Array(total)
  let at = 0
  for (const part of [...locals, ...central, end]) { out.set(part, at); at += part.length }
  return out
}
