const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const Session = require('./lib/session');

const ONE_DEGREE = 111319.9;

dotenv.load();

const token = process.env.TOKEN;

const bot = new TelegramBot(token, { polling: true });

const session = new Session();

const bus_stops = require('./bus_stops.json');

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
  const nearest = findNearest(msg.location, bus_stops);
  bot.sendMessage(msg.chat.id, `Nearest bus stop is ${bus_stops[nearest.index].name}, approximately ${Math.round(nearest.distance * ONE_DEGREE)} metre(s)`);
  const opts = {
    reply_markup: JSON.stringify({
      keyboard: [
        ['UTown'],
        ['SoC', 'BIZ', 'FASS', 'FoE/SDE'],
        ['FoS', 'YLLSM', 'YSTCM'],
        ['YIH', 'CLB/COMCEN', 'Halls'],
        ['PGPR', 'Kent Ridge MRT', 'Misc']
      ],
      resize_keyboard: true
    })
  };
  bot.sendMessage(msg.chat.id, `Which faculty are you going to?`, opts);
  session.set(msg.chat.id, 'from', bus_stops[nearest.index]);
  return session.set(msg.chat.id, 'to', 1);
}

function rowify(list, columnWidth) {
  let result = [];
  for (let i = 0; i < Math.ceil(list.length / columnWidth); i++) {
    result.push(list.slice(i * columnWidth, (i + 1) * columnWidth));
  }
  return result;
}

function findTransit(from, to) {
  function helper(list) {
    const nearest = list[findNearest(from, list).index];
    console.log(list.length);
    const from_common = nearest.buses.filter(bus => from.buses.indexOf(bus) !== -1);
    const to_common = nearest.buses.filter(bus => to.buses.indexOf(bus) !== -1);
    const removed = list.filter(obj => obj.name !== nearest.name);
    if (from_common.length > 0 && to_common.length > 0) {
      return {from_common: from_common, to_common: to_common, transit: nearest};
    } else {
      return helper(removed);
    }
  }
  console.log(from);
  console.log(to);
  return helper(bus_stops.filter(obj => obj.name !== from.name && obj.name !== to.name));
}

function route(msg, from, to) {
  const opts = {
    reply_markup: JSON.stringify({
      remove_keyboard: true
    })
  };
  const common = from.buses.filter(bus => to.buses.indexOf(bus) !== -1);
  let directions = '';
  if (common.length > 0) {
    directions = `You can take ${common.length === 1 ? 'bus' : 'buses'} ${common.join(', ')}`;
  } else {
    const transit = findTransit(from, to);
    directions = `You can take buses ${transit.from_common.join(', ')} from ${from.name} and transit at ${transit.transit.name}, then take buses ${transit.to_common.join(', ')} to ${to.name}`;
  }
  bot.sendMessage(msg.chat.id, directions, opts);
}

function processToLocation(msg) {
  const from = session.get(msg.chat.id, 'from');
  if (session.get(msg.chat.id, 'to') === 1) {
    const filtered = bus_stops.filter(obj => obj.group === msg.text);
    if (filtered.length === 0) {
      bot.sendMessage(msg.chat.id, 'Please use the selections below.');
    } else if (filtered.length === 1) {
      route(msg, from, filtered[0]);
      session.del(msg.chat.id, 'from');
      session.del(msg.chat.id, 'to');
    } else {
      const opts = {
        reply_markup: JSON.stringify({
          keyboard: rowify(filtered.map(obj => obj.name), 3),
          resize_keyboard: true
        })
      }
      bot.sendMessage(msg.chat.id, `Choose one of the ${msg.text} bus stops`, opts);
    }
    session.set(msg.chat.id, 'to', msg.text);
  } else {
    const filtered = bus_stops.filter(obj => obj.name === msg.text);
    if (filtered.length === 1) {
      route(msg, from, filtered[0]);
      session.del(msg.chat.id, 'from');
      session.del(msg.chat.id, 'to');
    } else {
      bot.sendMessage(msg.chat.id, `Please use the selections below.`);
    }
  }
}

bot.on('message', (msg) => {
  try {
    if (Object.prototype.hasOwnProperty.call(msg, 'location')) {
      return processFromLocation(msg);
    }

    if (session.get(msg.chat.id, 'from') !== undefined ) {
      return processToLocation(msg);
    }

    switch (msg.text) {
      case '/start':
        bot.sendMessage(msg.chat.id, 'Welcome! Please send me your location so I can guide you!');
        break;
      case '/about':
        bot.sendMessage(msg.chat.id, 'This bot is created by @indocomsoft and @sciffany during Hack & Roll 2018!');
        break;
      default:
        bot.sendMessage(msg.chat.id, 'Command not recognised');
        break;
    }
    return true;
  } catch (e) {
    console.log(e);
  }


});

