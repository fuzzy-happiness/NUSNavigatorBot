const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');

dotenv.load();

const token = process.env.TOKEN;

const bot = new TelegramBot(token, { polling: true });
