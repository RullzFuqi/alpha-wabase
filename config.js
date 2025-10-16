import moment from 'moment-timezone'

let timezones = {
  WIB: 'Asia/Jakarta',
  WITA: 'Asia/Makassar',
  WIT: 'Asia/Jayapura',
}

function fromZone(zone) {
  const tz = timezones[zone.toUpperCase()]
  if (!tz) throw new Error(`Zona tidak valid: ${zone}`)
  return moment().tz(tz).format('HH:mm:ss')
}

let cfg = {
  global: {
    owner: [''],
    botnumber: '',
    botname: 'Zephyr',
    packname: 'Zephyr',
    author: 'RullzFuqi',
  },
  setup: {
    prefix: '.',
    sessionname: 'session',
    public: true,
    timezone: {
      wib: fromZone('WIB'),
      wita: fromZone('WITA'),
      wit: fromZone('WIT'),
    },
  },
}

export default cfg
