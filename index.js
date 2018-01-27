const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const Session = require('./lib/session');

dotenv.load();

const token = process.env.TOKEN;

const bot = new TelegramBot(token, { polling: true });

const session = new Session();

bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  if (Object.prototype.hasOwnProperty.call(msg, 'location')) {
    processFromLocation(msg);
  }

  switch (msg.text) {
    case '/start':
      bot.sendMessage(chatId, 'Welcome! Please send me your location so I can guide you!');
      break;
    case '/about':
      bot.sendMessage(chatId, 'This bot is created by @indocomsoft and @sciffany during Hack & Roll 2018!');
      break;
    default:
      bot.sendMessage(chatId, 'Command not recognised');
      break;
  }
});

