import {
  getContentType,
  downloadMediaMessage,
  jidNormalizedUser,
  extractMessageContent,
  jidDecode,
  areJidsSameUser,
  generateMessageIDV2,
} from 'baileys'

export const createSerializer = socket => {
  return async function serialize(m) {
    if (!m) return m
    if (m.key && m.key.remoteJid === 'status@broadcast') return null

    m.type = getContentType(m.message)
    const content = extractMessageContent(m.message)
    m.mediaType =
      m.type === 'imageMessage' || m.type === 'videoMessage' ? m.type.replace('Message', '') : null
    m.msg =
      (m.mtype == 'viewOnceMessage'
        ? m.message[m.mtype]?.message?.[getContentType(m.message[m.mtype]?.message)]
        : m.message[m.mtype]) || {}
    m.body =
      m.message?.conversation ||
      m.msg?.text ||
      m.msg?.caption ||
      m.msg?.contentText ||
      m.msg?.selectedDisplayText ||
      m.msg?.hydratedTemplate?.hydratedContentText ||
      (m.mtype === 'buttonsResponseMessage' && m.msg?.selectedButtonId) ||
      (m.mtype === 'buttonsResponseMessageV2' && m.msg?.selectedButtonId) ||
      (m.mtype === 'buttonsResponseMessageV3' && m.msg?.selectedButtonId) ||
      (m.mtype === 'listResponseMessage' && m.msg?.singleSelectReply?.selectedRowId) ||
      (m.mtype === 'templateButtonReplyMessage' && m.msg?.selectedId) ||
      (m.mtype === 'interactiveResponseMessage' &&
        JSON.parse(m.msg?.nativeFlowResponseMessage?.paramsJson || '{}')?.id) ||
      (m.mtype === 'viewOnceMessage' && m.msg?.caption) ||
      ''
    m.text =
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      m.message?.imageMessage?.caption ||
      m.message?.videoMessage?.caption ||
      m.message?.buttonsResponseMessage?.selectedButtonId ||
      m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
      m.message?.templateButtonReplyMessage?.selectedId ||
      m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
      ''
    m.chat = jidNormalizedUser(m.key.remoteJid)
    m.isGroup = m.chat.endsWith('@g.us')
    let senderJid = m.key.fromMe
      ? socket.user?.id
      : m.key.participantAlt || m.key.participant || m.chat
    if (senderJid.endsWith('@lid')) {
      const decoded = jidDecode(senderJid)
      if (decoded?.user) senderJid = `${decoded.user}@s.whatsapp.net`
    }
    m.sender = jidNormalizedUser(senderJid)
    m.fromMe = m.key.fromMe
    m.fromBot = m.key.id.startsWith(generateMessageIDV2().slice(0, 4))
    m.mentionedJid = content?.contextInfo?.mentionedJid || []
    m.quoted = null

    if (content?.contextInfo?.quotedMessage) {
      const quotedContent = extractMessageContent(content.contextInfo.quotedMessage)
      const quotedType = getContentType(content.contextInfo.quotedMessage)

      m.quoted = {
        key: {
          remoteJid: m.chat,
          id: content.contextInfo.stanzaId,
          fromMe:
            jidNormalizedUser(content.contextInfo.participant) ===
            jidNormalizedUser(socket.user?.id),
          participant: content.contextInfo.participant,
        },
        message: content.contextInfo.quotedMessage,
        type: quotedType,
        text:
          quotedContent?.conversation ||
          quotedContent?.extendedTextMessage?.text ||
          quotedContent?.imageMessage?.caption ||
          quotedContent?.videoMessage?.caption ||
          '',
        sender: jidNormalizedUser(content.contextInfo.participant),
        download: async () => {
          return await downloadMediaMessage(
            { message: { [quotedType]: quotedContent } },
            'buffer',
            {},
            { reuploadRequest: socket.updateMediaMessage, logger: console },
          )
        },
      }
    }

    m.reply = (content, options = {}) => {
      const payload = typeof content === 'string' ? { text: content } : content
      return socket.sendMessage(m.chat, payload, { quoted: m, ...options })
    }

    m.react = emoji => {
      return socket.sendMessage(m.chat, { react: { text: emoji, key: m.key } })
    }

    m.edit = newText => {
      if (!m.key.fromMe) throw new Error('Cannot edit a message that was not sent by the bot.')
      return socket.sendMessage(m.chat, { text: newText, edit: m.key })
    }

    m.delete = () => {
      return socket.sendMessage(m.chat, { delete: m.key })
    }

    m.download = async () => {
      return await downloadMediaMessage(
        m,
        'buffer',
        {},
        { reuploadRequest: socket.updateMediaMessage, logger: console },
      )
    }

    return m
  }
}
