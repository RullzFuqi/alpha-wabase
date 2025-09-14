/*
 * Credit RullzFuqi
*/

import { proto } from '@whiskeysockets/baileys';

/**
 * @lid @jid
 * @param {object} bot 
 * @param {proto.IWebMessageInfo} m 
 * @returns {object}
 */
function smsg(bot, m) {
  if (!m || !m.message) return null;
  
  const { messageTimestamp, key, message, messageStubType } = m;
  const type = Object.keys(message)[0];
  const content = message[type];
  const contextInfo = content?.contextInfo;
  
  /*
   *  Ekstrak teks dari berbagai jenis pesan
  */
  const extractText = () => {
    if (content?.conversation) return content.conversation;
    if (content?.text) return content.text;
    if (content?.extendedTextMessage?.text) return content.extendedTextMessage.text;
    if (content?.buttonsResponseMessage?.selectedButtonId) return content.buttonsResponseMessage.selectedButtonId;
    if (content?.listResponseMessage?.singleSelectReply?.selectedRowId) return content.listResponseMessage.singleSelectReply.selectedRowId;
    if (content?.templateButtonReplyMessage?.selectedId) return content.templateButtonReplyMessage.selectedId;
    if (content?.imageMessage?.caption) return content.imageMessage.caption;
    if (content?.videoMessage?.caption) return content.videoMessage.caption;
    return '';
  };
  
  /*
   * Ekstrak mentioned JID dengan dukungan @lid
  */
  const extractMentionedJid = () => {
    const mentionedJid = [];
    
    if (Array.isArray(content?.extendedTextMessage?.contextInfo?.mentionedJid)) {
      mentionedJid.push(...content.extendedTextMessage.contextInfo.mentionedJid);
    }
    
    if (Array.isArray(contextInfo?.mentionedJid)) {
      mentionedJid.push(...contextInfo.mentionedJid);
    }
    
    if (Array.isArray(content?.buttonsContextInfo?.mentionedJid)) {
      mentionedJid.push(...content.buttonsContextInfo.mentionedJid);
    }
    
    /*
     *  Handle @lid (local ID) dengan mengonversi ke @jid
    */
    return mentionedJid.map(jid => {
      if (jid && jid.includes(':') && jid.includes('@lid')) {
        if (bot.user && bot.user.id) {
          const parts = jid.split(':');
          if (parts.length > 1) {
            return `${parts[0]}@s.whatsapp.net`;
          }
        }
      }
      return jid;
    }).filter(jid => jid);
  };
  
      /*
      * Quoted Message Serialize
     */
  const extractQuoted = () => {
    if (!contextInfo?.quotedMessage) return null;
    
    const q = contextInfo;
    const qm = q.quotedMessage;
    const qtype = Object.keys(qm)[0];
    const qcontent = qm[qtype];
    
    return {
      key: {
        remoteJid: key.remoteJid,
        fromMe: q.participant ? (q.participant === bot.user?.id) : false,
        id: q.stanzaId,
        participant: q.participant
      },
      message: qm,
      type: qtype,
      text: extractQuotedText(qcontent, qtype),
      mentionedJid: Array.isArray(qcontent?.contextInfo?.mentionedJid) 
        ? qcontent.contextInfo.mentionedJid 
        : []
    };
  };
  
  const extractQuotedText = (qcontent, qtype) => {
    if (qcontent?.conversation) return qcontent.conversation;
    if (qcontent?.text) return qcontent.text;
    if (qcontent?.extendedTextMessage?.text) return qcontent.extendedTextMessage.text;
    if (qtype === 'buttonsResponseMessage') return qcontent.selectedButtonId;
    if (qtype === 'listResponseMessage') return qcontent.singleSelectReply?.selectedRowId;
    if (qtype === 'templateButtonReplyMessage') return qcontent.selectedId;
    if (qtype === 'imageMessage') return qcontent.caption;
    if (qtype === 'videoMessage') return qcontent.caption;
    return '';
  };
  
      /*
      * Extract To lid Serialize
      */
  const extractSender = () => {
    if (key.fromMe) return bot.user?.id || '';
    
    if (key.participant) {
      if (key.participant.includes('@lid')) {
        const lidParts = key.participant.split(':');
        if (lidParts.length > 0) {
          return `${lidParts[0]}@s.whatsapp.net`;
        }
      }
      return key.participant;
    }
    
    return key.remoteJid;
  };
  
      /*
      * Hanndle Ephemeral Message Serialize
      */
  const isEphemeral = type === 'ephemeralMessage';
  const actualMessage = isEphemeral ? message.ephemeralMessage.message : message;
  const actualType = isEphemeral ? Object.keys(actualMessage)[0] : type;
  const actualContent = isEphemeral ? actualMessage[actualType] : content;
  
  const msg = {
    key: {
      remoteJid: key.remoteJid,
      fromMe: key.fromMe,
      id: key.id,
      participant: key.participant
    },
    messageTimestamp,
    type: actualType,
    message: actualMessage,
    isGroup: (key.remoteJid || '').endsWith('@g.us'),
    sender: extractSender(),
    senderJid: extractSender(),
    chat: key.remoteJid,
    text: extractText(),
    mentionedJid: extractMentionedJid(),
    quoted: extractQuoted(),
    isEphemeral,
    messageStubType: messageStubType || null,
    status: content?.status || null,
    
        /*
      * Exented Property Serialize Untuk Berbagai Jenis Pesan
        */
    hasMedia: Boolean(
      content?.imageMessage || 
      content?.videoMessage || 
      content?.audioMessage || 
      content?.documentMessage || 
      content?.stickerMessage
    ),
    mediaType: content?.imageMessage ? 'image' : 
              content?.videoMessage ? 'video' : 
              content?.audioMessage ? 'audio' : 
              content?.documentMessage ? 'document' : 
              content?.stickerMessage ? 'sticker' : null,
    
    /*
      * Location Message Serialize
    */
    location: content?.locationMessage ? {
      degreesLatitude: content.locationMessage.degreesLatitude,
      degreesLongitude: content.locationMessage.degreesLongitude,
      name: content.locationMessage.name,
      address: content.locationMessage.address
    } : null,
    
    // Contact message
    contacts: content?.contactsArrayMessage?.contacts || [],
    /*
      * Polling Message Serialize
    */
    poll: content?.pollCreationMessage ? {
      name: content.pollCreationMessage.name,
      options: content.pollCreationMessage.options,
      selectableOptionsCount: content.pollCreationMessage.selectableOptionsCount
    } : null
  };
  
  return msg;
}

export { smsg };