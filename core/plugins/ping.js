
export default {
  name: 'ping',
  command: ['ping', 'test', 'speed'],
  run: async (socket, m, ctx) => {
    await socket.sendMessage(
      m.chat,
      {
        text: '🏓 *Pong!*',
      },
      { quoted: m },
    )
  },
}
