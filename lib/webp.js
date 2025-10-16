/**
 *  Source Code By Mhankbarbar & DikaArdnt
 * Remake By RullzFuqi
 */
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'
import { spawn } from 'child_process'
import webp from 'node-webpmux'

const TMPDIR = os.tmpdir()
const mktmp = (ext = '') =>
  path.join(TMPDIR, `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${ext}`)

async function safeWrite(file, data) {
  await fs.writeFile(file, data)
  return file
}
async function safeRead(file) {
  const b = await fs.readFile(file)
  return b
}
async function safeUnlink(file) {
  try {
    await fs.unlink(file)
  } catch (e) {}
}

function ffArgsCommon(output, vf, extra = []) {
  return [
    '-y',
    '-i',
    '-',
    '-vcodec',
    'libwebp',
    '-vf',
    vf,
    '-loop',
    '0',
    '-preset',
    'default',
    '-an',
    '-vsync',
    '0',
    ...extra,
    output,
  ]
}

function runFfmpegWithBuffer(args, inputBuffer, timeout = 25000) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args)
    let stderr = ''
    const to = setTimeout(() => {
      p.kill('SIGKILL')
      reject(new Error('ffmpeg timeout'))
    }, timeout)
    p.stdin.on('error', () => {})
    p.stderr.on('data', d => {
      stderr += d.toString()
    })
    p.on('error', e => {
      clearTimeout(to)
      reject(e)
    })
    p.on('close', code => {
      clearTimeout(to)
      if (code === 0) resolve(Buffer.from(''))
      else reject(new Error('ffmpeg exit ' + code + ' ' + stderr.slice(0, 200)))
    })
    p.stdin.end(inputBuffer)
  })
}

async function execFfmpegToFileFromBuffer(inputBuffer, args, outPath, timeout = 25000) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args)
    let stderr = ''
    const to = setTimeout(() => {
      p.kill('SIGKILL')
      reject(new Error('ffmpeg timeout'))
    }, timeout)
    p.stderr.on('data', d => {
      stderr += d.toString()
    })
    p.on('error', e => {
      clearTimeout(to)
      reject(e)
    })
    p.on('close', async code => {
      clearTimeout(to)
      if (code === 0) {
        try {
          const b = await fs.readFile(outPath)
          resolve(b)
        } catch (e) {
          reject(e)
        }
      } else reject(new Error('ffmpeg exit ' + code + ' ' + stderr.slice(0, 200)))
    })
    p.stdin.end(inputBuffer)
  })
}

async function ffConvertImageBufferToWebpBuffer(buffer, opts = {}) {
  const out = mktmp('.webp')
  const vf =
    "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse"
  const args = [
    '-y',
    '-i',
    'pipe:0',
    '-vcodec',
    'libwebp',
    '-vf',
    vf,
    '-lossless',
    '0',
    '-preset',
    'default',
    '-an',
    '-vsync',
    '0',
    out,
  ]
  await fs.writeFile(out, Buffer.alloc(0))
  await execFfmpegToFileFromBuffer(buffer, args, out, opts.timeout ?? 25000)
  const result = await fs.readFile(out)
  await safeUnlink(out)
  return result
}

async function ffConvertVideoBufferToWebpBuffer(buffer, opts = {}) {
  const out = mktmp('.webp')
  const vf =
    "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse"
  const args = [
    '-y',
    '-i',
    'pipe:0',
    '-vcodec',
    'libwebp',
    '-vf',
    vf,
    '-loop',
    '0',
    '-ss',
    '00:00:00',
    '-t',
    '00:00:05',
    '-preset',
    'default',
    '-an',
    '-vsync',
    '0',
    out,
  ]
  await fs.writeFile(out, Buffer.alloc(0))
  await execFfmpegToFileFromBuffer(buffer, args, out, opts.timeout ?? 30000)
  const result = await fs.readFile(out)
  await safeUnlink(out)
  return result
}

function buildExif({ packname = 'Pack', author = 'Author', emojis = [''], id } = {}) {
  const json = {
    'sticker-pack-id': 'https://github.com/RullzFuqi' ?? crypto.randomBytes(8).toString('hex'),
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    emojis: emojis,
  }
  const jsonBuff = Buffer.from(JSON.stringify(json), 'utf8')
  const exifHeader = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ])
  const exif = Buffer.concat([exifHeader, jsonBuff])
  exif.writeUIntLE(jsonBuff.length, 14, 4)
  return exif
}

async function addExifToWebpBuffer(
  buf,
  meta = { packname: 'Pack', author: 'Author', emojis: [''] },
  opts = {},
) {
  const inF = mktmp('.webp'),
    outF = mktmp('.webp')
  await fs.writeFile(inF, buf)
  const img = new webp.Image()
  await img.load(inF)
  await safeUnlink(inF)
  img.exif = buildExif(meta)
  await img.save(outF)
  const result = await fs.readFile(outF)
  await safeUnlink(outF)
  return result
}

function guessMimeFromBuffer(b) {
  if (!Buffer.isBuffer(b)) return null
  if (b.slice(0, 4).toString('hex').includes('ffd8')) return 'image/jpeg'
  if (b.slice(0, 8).toString('utf8').includes('PNG')) return 'image/png'
  if (b.slice(0, 4).toString('utf8') === 'RIFF' && b.slice(8, 12).toString('utf8') === 'WEBP')
    return 'image/webp'
  if (b.slice(0, 4).toString('utf8') === 'RIFF' && b.slice(8, 12).toString('utf8') === 'AVI ')
    return 'video/avi'
  if (b.slice(0, 4).toString('hex') === '00000018' || b.slice(4, 8).toString('utf8') === 'ftyp')
    return 'video/mp4'
  return null
}

async function bufferToStickerBuffer(
  buffer,
  {
    mimetype = null,
    metadata = { packname: 'Pack', author: 'Author', emojis: [''] },
    opts = {},
  } = {},
) {
  const mime = mimetype ?? guessMimeFromBuffer(buffer)
  if (!mime) throw new Error('unknown mime')
  let webpBuf
  if (mime.startsWith('image') && !mime.includes('webp'))
    webpBuf = await ffConvertImageBufferToWebpBuffer(buffer, opts)
  else if (mime.startsWith('video')) webpBuf = await ffConvertVideoBufferToWebpBuffer(buffer, opts)
  else if (mime.includes('webp')) webpBuf = buffer
  else throw new Error('unsupported mime ' + mime)
  if (!metadata || (!metadata.packname && !metadata.author)) return webpBuf
  return await addExifToWebpBuffer(webpBuf, metadata, opts)
}

async function ensureFfmpegAvailable() {
  return new Promise(res => {
    const p = spawn('ffmpeg', ['-version'])
    p.on('error', () => res(false))
    p.on('close', c => res(c === 0))
  })
}

export {
  mktmp as createTmpPath,
  safeWrite,
  safeRead,
  safeUnlink,
  ffConvertImageBufferToWebpBuffer as imageToWebpBuffer,
  ffConvertVideoBufferToWebpBuffer as videoToWebpBuffer,
  addExifToWebpBuffer,
  bufferToStickerBuffer,
  buildExif,
  guessMimeFromBuffer,
  ensureFfmpegAvailable,
}

export default {
  createTmpPath: mktmp,
  imageToWebpBuffer: ffConvertImageBufferToWebpBuffer,
  videoToWebpBuffer: ffConvertVideoBufferToWebpBuffer,
  addExifToWebpBuffer,
  bufferToStickerBuffer,
  buildExif,
  guessMimeFromBuffer,
  ensureFfmpegAvailable,
}
