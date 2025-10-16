import axios from 'axios'
const urls = Array.from({ length: 100 }, (_, i) => `https://rijalganzz.web.id/game/tebaklirik`)
let i = 0
const intervalMs = 200 // jeda antar request

const id = setInterval(async () => {
  if (i >= urls.length) {
    clearInterval(id)
    return
  }
  try {
    await axios.get(urls[i])
    console.log('sent', i)
  } catch (e) {
    console.error('err', i, e.message)
  }
  i++
}, intervalMs)
