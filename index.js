const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const Session = require('./lib/session');

const ONE_DEGREE = 111319.9;

dotenv.load();

const token = process.env.TOKEN;

const bot = new TelegramBot(token, { polling: true });

const session = new Session();

function findNearest(loc, list) {
  let min = { distance: Infinity };
  for(var i = 0; i < list.length; i++) {
    let distance = Math.sqrt(Math.pow(loc.latitude - list[i].latitude, 2) + Math.pow(loc.longitude - list[i].longitude, 2));
    if (distance < min.distance) {
      min = { distance: distance, index: i };
    }
  }
  return min;
}

function processFromLocation(msg) {
  session.set(msg.chat.id, 'from', { "latitude": msg.location.latitude, "longitude": msg.location.longitude });
  const bus_stops = require('./bus_stops.json');
  const nearest = findNearest(msg.location, bus_stops);
  bot.sendMessage(msg.chat.id, `Nearest bus stop is ${bus_stops[nearest.index].name}, approximately ${Math.round(nearest.distance * ONE_DEGREE)} metre(s)`);
}

bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  if (Object.prototype.hasOwnProperty.call(msg, 'location')) {
    return processFromLocation(msg);
  }

  switch (msg.text) {
    case '/start':
      bot.sendMessage(chatId, 'Welcome! Please send me your location so I can guide you!');
      break;
    case '/about':
      bot.sendMessage(chatId, 'This bot is created by @indocomsoft and @sciffany during Hack & Roll 2018!');
      break;
    case '/to':
      break;
    default:
      bot.sendMessage(chatId, 'Command not recognised');
      break;
  }
  return true;
});

