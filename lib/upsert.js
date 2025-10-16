import set from './config.js'
import logger from '#lib/logger.js'
import crypto from 'crypto'
import JSONdb from '#lib/utils/core.js'
import { db, RPG } from '#lib/rpgdb.js'
import { createLevelUpCard } from '#lib/napicanvas.js'
import {
  sleep,
  runtime,
  fmt,
  randomId,
  isUrl,
  extractUrls,
  parseCommand,
  getBuffer,
  fetchJson,
  detectFileType,
  FileCache,
  RateLimiter,
  streamToFile,
  BaileysMediaDownloader,
  retry,
  formatBytes,
  formatTime,
  capitalize,
  shuffleArray,
  chunkArray,
  uniqueArray,
  escapeRegex,
  generateProgressBar,
  generateRandomString,
  isValidUrl,
  parseDuration,
  formatNumber,
  truncateText,
  getTimestamp,
  debounce,
  throttle,
} from './lib/core/handler.js'
import util from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default async function upsert(conn, m, msg) {
  try {
    const bodyraw = typeof m.text === 'string' ? m.text : ''
    const parts = m.body.trim().split(' ').filter(Boolean)
    const args = m.body.trim().split(/ +/).slice(1)
    const upsertcmd = bodyraw?.startsWith(set.config.prefix)
      ? (parts[0] || '').slice(set.config.prefix.length).toLowerCase()
      : ''
    let text = m.text

    let exformat = param => {
      return `*Penggunaan Salah!*\nContoh: `
    }

    let msgreply = message => {
      conn.sendMessage(
        m.chat,
        {
          text: message,
          contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: `${set.config.newsletterJid}`,
              newsletterName: '© Yuki - Whatsapp Bot 2025',
            },
            externalAdReply: {
              title: '© RullzFuqi - Yuki Wabot',
              body: 'Simple whatsapp bot assistant',
              thumbnailUrl: `${set.media.iconUrl}`,
              sourceUrl: 'https://www.github.com/RullzFuqi/yuki-wbot',
              renderLargerThumbnail: false,
              showAdAttribution: true,
              mediaType: 1,
            },
          },
        },
        { quoted: m },
      )
    }

    /*
if (upsertcmd) {
  let db = new JSONdb(path.join(__dirname, 'database', 'upsert.json'))
  if (!db.has('hits')) db.set('hits', [])

  let hits = db.get('hits')
  let existing = hits.find(v => v.name === upsertcmd)

  if (existing) {
    existing.count++
  } else {
    hits.push({ name: upsertcmd, count: 1 })
  }

  db.set('hits', hits)
  console.log("Ada Hits Baru", hits)
}
*/

    if (m.body.startsWith('.daftar')) {
      let nama = args[0]
      let site = args[1]
      let number = m.sender
      let ignoreusr = await RPG.isValidUsr(number)
      if (ignoreusr) return msgreply('*Kamu sudah terdaftar!*')
      if (!nama || !site)
        return msgreply(`*Penggunaan Salah!*\nContoh: .${upsertcmd} <nama> <site>`)

      let siteNorm = site.toLowerCase()
      if (!['pirate'].includes(siteNorm))
        return msgreply('*Site tidak valid. Hanya menerima: Pirate!*')

      let targetJid = m.mentionedJid?.[0] || m.msg?.contextInfo?.mentionedJid?.[0] || m.sender
      let ppUrl
      try {
        ppUrl = await conn.profilePictureUrl(targetJid, 'image')
      } catch {
        ppUrl = 'https://telegra.ph/file/04d85ec56ed79b8b8df6c.jpg'
      }
      let id =
        crypto.randomBytes(4).toString('hex') + '_' + (m.sender?.split?.('@')?.[0] || 'unknown')
      try {
        await RPG.addUser(id, nama, siteNorm === 'pirate', number)
        await db.read()
        let user = db.data.players.find(u => u.number === number)
        let profileimg = await createLevelUpCard(
          ppUrl,
          user.exp,
          100,
          user.level,
          `${m.pushName}`,
          'Tidak Memakan Buah',
          user.bounty || 0,
        )
        await conn.sendMessage(
          m.chat,
          {
            image: profileimg,
            caption: `\`🎉 @${m.sender.split('@')[0]} berhasil mendaftar!\`\n
🆔 *ID:* ${user.id}
🏷️ *Nama:* ${user.name}
🚩 *Site:* ${user.site}
⭐ *Level:*$ {user.level}
⚡ *Energy:* ${user.energy}
💰 *Beli:* ${user.beli}
❤️ *HP:* ${user.hp}
*Ketik .profile atau .inventory untuk melihat profile dan inventaris.*`,
            contextInfo: {
              isForwarded: false,
              mentionedJid: [m.sender],
              externalAdReply: {
                showAdAttribution: true,
                title: 'Yuki - Whatsapp Bot 2025',
                body: 'Simple Whatsapp Bot',
                thumbnailUrl: set.media.iconUrl,
                sourceUrl: 'https://www.github.com/RullzFuqi/yuki-wbot',
              },
            },
            buttons: [
              {
                buttonId: '.inv',
                buttonText: {
                  displayText: 'Inventory',
                },
                type: 1,
              },
              {
                buttonId: '.profile',
                buttonText: {
                  displayText: 'Profile',
                },
                type: 1,
              },
            ],
          },
          { quoted: m },
        )
      } catch (err) {
        console.error(err)
        msgreply('❌ Gagal mendaftar. Silakan coba lagi.')
      }
    }

    switch (upsertcmd) {
      case 'menu':
        {
          m.reply('bentar')
          conn.sendMessage(
            m.chat,
            {
              video: fs.readFileSync(path.join(__dirname, './src/media/kaito.mp4')),
              gifPlayback: true,
              caption: 'D',
              contextInfo: {
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: `${set.config.newsletterJid}`,
                },
                externalAdReply: {
                  title: `${m.pushName}`,
                  body: 'Kaito Kid Silence Whatsapp Bot',
                  thumbnail: fs.readFileSync(path.join(__dirname, './src/media/menu.jpg')),
                  sourceUrl: 'https://www.github.com/RullzFuqi/Kaito-Silence',
                  showAdAttribution: true,
                  renderLargerThumbnail: true,
                },
              },
            },
            { quoted: m },
          )
          /*
          await conn.sendMessage(
            m.chat,
            {
              audio: { url: 'https://files.catbox.moe/op8t77.ogg' },
              mimetype: 'audio/ogg; codecs=opus',
              ptt: true,
            },
            { quoted: m },
          )
          */
        }
        break
      case 'profile':
        {
          await db.read()
          let user = db.data.players.find(u => u.number === m.sender)
          let targetJid = m.mentionedJid?.[0] || m.msg?.contextInfo?.mentionedJid?.[0] || m.sender
          let ppUrl
          try {
            ppUrl = await conn.profilePictureUrl(targetJid, 'image')
          } catch {
            ppUrl = 'https://telegra.ph/file/04d85ec56ed79b8b8df6c.jpg'
          }
          var mai = await createLevelUpCard(
            ppUrl,
            user.exp,
            100,
            user.level,
            `${m.pushName}`,
            'Tidak Memakan Buah',
            user.bounty || 0,
          )
        }
        await conn.sendMessage(
          m.chat,
          {
            image: mai,
            caption: 'None',
          },
          { quoted: m },
        )
        break
      default:
        break
    }
  } catch (err) {
    console.log('MSG UPSERT ERROR: ', err)
    m.reply('Terjadi Kesalahan', util.format(err))
  }
}
