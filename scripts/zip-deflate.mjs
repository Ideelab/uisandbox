#!/usr/bin/env node
/**
 * Deflated zips for what this site serves itself (the kit doors).
 *
 *   node scripts/zip-deflate.mjs public/kits/*.zip     re-pack in place
 *
 * The kit builds were written by the engine's writer, which only stores (it
 * also makes the export a browser downloads, where that is fine). Served from
 * here they were the slowest part of a first visit: shadcn's door is 866 KB of
 * HTML and CSS, stored, and Cloudflare does not compress a .zip. On a 4G phone
 * it took 4.5 s of the 12 s before the kit showed. Deflated, the same bytes
 * travel in a fraction; the reader in the browser inflates with
 * DecompressionStream, as it does every zip people drop.
 *
 * Same entries, same order, same fixed date as the engine's writer, so the
 * contents are byte for byte what they were and a rebuild diffs cleanly.
 */
import { deflateRawSync, inflateRawSync, crc32 } from 'node:zlib'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const DOS_TIME = 0, DOS_DATE = (2026 - 1980) << 9 | 1 << 5 | 1

/** @param files path -> string or bytes  @returns Uint8Array, every entry deflated (or stored when deflate does not win) */
export function zipDeflate(files) {
  const enc = new TextEncoder()
  const locals = [], central = []
  let offset = 0
  for (const [path, content] of Object.entries(files)) {
    const name = enc.encode(path)
    const raw = content instanceof Uint8Array ? content : enc.encode(content)
    const packed = deflateRawSync(raw, { level: 9 })
    const deflated = packed.length < raw.length
    const body = deflated ? packed : raw
    const sum = crc32(raw) >>> 0
    const local = new Uint8Array(30 + name.length + body.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true)
    lv.setUint16(8, deflated ? 8 : 0, true); lv.setUint16(10, DOS_TIME, true); lv.setUint16(12, DOS_DATE, true)
    lv.setUint32(14, sum, true); lv.setUint32(18, body.length, true); lv.setUint32(22, raw.length, true)
    lv.setUint16(26, name.length, true); lv.setUint16(28, 0, true)
    local.set(name, 30); local.set(body, 30 + name.length)
    locals.push(local)
    const dir = new Uint8Array(46 + name.length)
    const dv = new DataView(dir.buffer)
    dv.setUint32(0, 0x02014b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 20, true)
    dv.setUint16(8, 0x0800, true); dv.setUint16(10, deflated ? 8 : 0, true)
    dv.setUint16(12, DOS_TIME, true); dv.setUint16(14, DOS_DATE, true)
    dv.setUint32(16, sum, true); dv.setUint32(20, body.length, true); dv.setUint32(24, raw.length, true)
    dv.setUint16(28, name.length, true); dv.setUint32(42, offset, true)
    dir.set(name, 46)
    central.push(dir)
    offset += local.length
  }
  const size = central.reduce((n, d) => n + d.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, central.length, true); ev.setUint16(10, central.length, true)
  ev.setUint32(12, size, true); ev.setUint32(16, offset, true)
  const out = new Uint8Array(offset + size + 22)
  let at = 0
  for (const part of [...locals, ...central, end]) { out.set(part, at); at += part.length }
  return out
}

/** The entries of a zip, in order: path -> bytes. */
export function unzipEntries(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = bytes.length - 22
  while (eocd >= 0 && v.getUint32(eocd, true) !== 0x06054b50) eocd--
  const count = v.getUint16(eocd + 10, true)
  let p = v.getUint32(eocd + 16, true)
  const dec = new TextDecoder()
  const out = {}
  for (let i = 0; i < count; i++) {
    const method = v.getUint16(p + 10, true), comp = v.getUint32(p + 20, true)
    const nameLen = v.getUint16(p + 28, true), extraLen = v.getUint16(p + 30, true), commentLen = v.getUint16(p + 32, true)
    const local = v.getUint32(p + 42, true)
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen))
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true)
    const body = bytes.subarray(start, start + comp)
    out[name] = method === 8 ? new Uint8Array(inflateRawSync(body)) : new Uint8Array(body)
    p += 46 + nameLen + extraLen + commentLen
  }
  return out
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const f of process.argv.slice(2)) {
    const before = readFileSync(f)
    const entries = unzipEntries(new Uint8Array(before))
    const after = zipDeflate(entries)
    // the same bytes inside, or nothing is written
    const back = unzipEntries(after)
    const same = Object.keys(entries).every((k) => Buffer.compare(Buffer.from(entries[k]), Buffer.from(back[k])) === 0) && Object.keys(back).length === Object.keys(entries).length
    if (!same) { console.error(`${f}: the re-pack does not hold the same bytes; left as it was`); process.exitCode = 1; continue }
    writeFileSync(f, after)
    console.log(`${f}: ${Math.round(before.length / 1024)} KB → ${Math.round(after.length / 1024)} KB`)
  }
}
