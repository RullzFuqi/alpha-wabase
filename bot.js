/** Credit RullzFuqi
jangan dijual memeq udah tau lisensi MIT malah dijual jebe hama jualan bes watsaf bot. Minimal tambah pitur sesuatu jebe hama watsaf. waspada jebe kikir
*/
process.on('uncaughtException', err => console.log(err))
import qrcode from 'qrcode-terminal'
import pino from 'pino'
import chalk from 'chalk'
import { createInterface } from 'readline'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { rmSync, statSync, unlinkSync, existsSync, readFileSync, watch } from 'fs'
import { format } from 'util'
import { Boom } from '@hapi/boom'
import makeWASocket, {
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from 'baileys'
import { createSerializer } from '#lib/serialze.js'
import cfg from './config.js'

function question(text = 'question') {
  return new Promise(resolve => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    rl.question(`\x1b[32;1m?\x1b[0m\x20\x1b[1m${text}\x1b[0m`, answer => {
      rl.close()
      resolve(answer)
    })
  })
}

const __dirname = dirname(fileURLToPath(import.meta.url))
import PluginsLoad from '#core/plugins.js'
const pluginLoader = new PluginsLoad('./core/plugins', {
  debug: true,
  logger: console,
})
await pluginLoader.load({ watch: true })
global.plugins = pluginLoader.plugins
console.log(chalk.bgHex('#4CAF50').white.bold(` ✅ Loaded ${pluginLoader.plugins.size} plugins `))

;(async function startConn() {
  const { state, saveCreds } = await useMultiFileAuthState('session')
  const { version: waVer } = await fetchLatestBaileysVersion()

  let usePairing = false
  if (!state.creds?.registered) {
    console.log(chalk.bgHex('#de2323').white.bold(' Sesi tidak ditemukan silahkan register ulang '))
    const pilihMode = await question(
      'Apakah anda ingin menggunakan metode koneksi pairing? [Y/n]: ',
    )
    usePairing = pilihMode.trim() === '' || pilihMode.trim().toLowerCase() === 'y'
  }

  const socket = makeWASocket({
    printQRInTerminal: !usePairing && !state.creds.registered,
    version: waVer,
    browser: Browsers.ubuntu('FireFox'),
    generateHighQualityLinkPreview: true,
    markOnlineOnConnect: true,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino().child({ level: 'silent', stream: 'store' }),
      ),
    },
    logger: pino({ level: 'silent' }),
  })

  if (usePairing && !socket.authState.creds.registered) {
    try {
      let getNumber = await question('Masukkan Nomor WhatsApp Aktif Dengan Kode Negara: +')
      let requestNumberToCode = await socket.requestPairingCode(getNumber.replace(/\D/g, ''))
      console.log(
        chalk
          .bgHex('#f53d5ddf')
          .white.bold(' Pairing Code Anda: ' + chalk.hex('#b3fc97')(`${requestNumberToCode}`)),
      )
      console.log('\x1b[44;1m\x20Menunggu Koneksi...\x20\x1b[0m\x20')
    } catch (error) {
      console.log(chalk.red('❌ Pairing failed, switching to QR code...'))
    }
  }

  socket.ev.on('connection.update', async update => {
    const { connection, lastDisconnect, qr } = update

    if (qr && !usePairing) {
      console.log(chalk.bgHex('#5e7073df').white.bold(' Scan QrCode Untuk Melanjutkan Koneksi.. '))
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'connecting') {
      console.log(
        chalk.bgHex('#77def5').white.bold(' Welcome To Zephyr Wabot!') +
          ` \x1b[32;1mTime:\x1b[0m\x20\x1b[1m${cfg.setup?.timezone?.wita}\x1b[0m`,
      )
    }

    if (connection === 'open') {
      console.log(
        chalk.bgHex('#f0d42a').white.bold(' Zephyr Bot Connected!') +
          ` \x1b[32;1mTime:\x1b[0m\x20\x1b[1m${cfg.setup?.timezone?.wita}\x1b[0m`,
      )
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      console.log(
        chalk.bgHex('#f0d42a').white.bold(` Zephyr Bot Connection Closed! With Code: ${reason}`) +
          ` \x1b[32;1mTime:\x1b[0m\x20\x1b[1m${cfg.setup?.timezone?.wita}\x1b[0m`,
      )

      const shouldReconnect =
        reason === DisconnectReason.connectionClosed ||
        reason === DisconnectReason.connectionLost ||
        reason === DisconnectReason.restartRequired ||
        reason === DisconnectReason.connectionTimedOut ||
        reason === DisconnectReason.timedOut ||
        reason === DisconnectReason.serviceUnavailable

      if (shouldReconnect && !reconnection) {
        reconnection = true
        console.log(chalk.bgHex('#f0d42a').white.bold(' Zephyr Bot Reconnecting..  '))
        setTimeout(() => startConn(), 2000)
        return
      }

      if (
        reason === DisconnectReason.loggedOut ||
        reason === DisconnectReason.badSession ||
        reason === DisconnectReason.multideviceMismatch
      ) {
        console.log(chalk.bgHex('#f0d42a').white.bold(' Clearing invalid session... '))
        rmSync('./session', { recursive: true, force: true })
        setTimeout(() => startConn(), 2000)
      } else if (reason === DisconnectReason.forbidden) {
        console.log(chalk.bgRed.white.bold(' Account Banned - Please recreate session '))
        process.exit(1)
      } else {
        console.log(
          chalk.bgHex('#ff9800').white.bold(` Unhandled disconnect: ${reason || 'Unknown'} `),
        )
        setTimeout(() => startConn(), 5000)
      }
    }
  })

  socket.ev.on('creds.update', saveCreds)

  socket.ev.on('messages.upsert', async ({ messages }) => {
    const serialze = createSerializer(socket)
    const m = await serialze(messages[0])
    if (!m.key.fromMe && cfg.setup.public === false) return
    if (!m.message) return
    if (m.chat.endsWith('@broadcast') || m.chat.endsWith('@newsletter')) return

    await (await import(`./upsert.js?v=${Date.now()}`)).default(socket, m)
  })
})()

const f = new URL(import.meta.url).pathname
;(await import('chokidar')).default.watch(f).on('change', () => import(f + '?' + Date.now()))
