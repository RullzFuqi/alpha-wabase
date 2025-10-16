import chalk from 'chalk'
import cfg from './config.js'
import fs from 'fs'

export default async function messert(socket, m) {
  try {
    const prefix = cfg.global.prefix || '.'
    const text = m.text || m.message?.conversation || ''
    const isCommand = text.trimStart().toLowerCase().startsWith(prefix)
      ? text.trimStart().slice(prefix.length).trim().split(/\s+/)[0].toLowerCase()
      : null

    if (!isCommand) return

    const conn = {
      isOwner: m.sender === cfg.global.owner,
      metadata: {
        jid: m.chat,
        user: m.pushName || 'Unknown',
        isGroup: m.chat.endsWith('@g.us'),
        command: isCommand,
        args: text
          .slice(prefix.length + isCommand.length)
          .trim()
          .split(/\s+/),
      },
      mess: m,
      socket: socket,
      prefix: prefix,
    }

    if (global.plugins && global.plugins.size > 0) {
      let commandExecuted = false

      for (const plugin of global.plugins.values()) {
        try {
          if (plugin.module.command && Array.isArray(plugin.module.command)) {
            const commandMatch = plugin.module.command.find(cmd => cmd.toLowerCase() === isCommand)

            if (commandMatch) {
              await plugin.module.run(socket, m, conn)
              commandExecuted = true

              console.log(
                chalk.bgHex('#0D47A1').white.bold(' Command Executed ') +
                  '\n' +
                  chalk.hex('#00E676')('╭──► ') +
                  chalk.bold('From: ') +
                  chalk.hex('#29B6F6')(`${m.sender}`) +
                  '\n' +
                  chalk.hex('#00E676')('├──► ') +
                  chalk.bold('Time: ') +
                  chalk.bgHex('#1B1B1B').white(` ${cfg.setup?.timezone?.wit} `) +
                  '\n' +
                  chalk.hex('#00E676')('├──► ') +
                  chalk.bold('Plugin: ') +
                  chalk.hex('#FF9800')(`${plugin.name}`) +
                  '\n' +
                  chalk.hex('#00E676')('╰──► ') +
                  chalk.bold('Command: ') +
                  chalk.hex('#FFC107')(`${isCommand}`),
              )
              break
            }
          }
        } catch (error) {
          console.error(chalk.red(`❌ Error in plugin ${plugin.name}:`), error.message)
          await socket.sendMessage(
            m.chat,
            {
              text: `❌ *Error executing ${isCommand}:* ${error.message}`,
            },
            { quoted: m },
          )
        }
      }

      if (!commandExecuted) {
        await handleBuiltinCommands(socket, m, isCommand)
      }
    } else {
      await handleBuiltinCommands(socket, m, isCommand)
    }
  } catch (err) {
    console.error('Handler Error:', err)
  }
}

async function handleBuiltinCommands(socket, m, isCommand) {
  switch (isCommand) {
    //// Isi Pake Case Command
    default: {
      await socket.sendMessage(
        m.chat,
        {
          text: `❌ Command "${isCommand}" not found!\n`,
        },
        { quoted: m },
      )
    }
  }
}

const f = new URL(import.meta.url).pathname
;(await import('chokidar')).default.watch(f).on('change', () => import(f + '?' + Date.now()))
