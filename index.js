const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const Session = require('./lib/session');

const ONE_DEGREE = 111319.9;

dotenv.load();

const token = process.env.TOKEN;

const bot = new TelegramBot(token, { polling: true });

const session = new Session();

const busStops = require('./bus_stops.json');

function findNearest(loc, list) {
  let min = { distance: Infinity };
  for (let i = 0; i < list.length; i += 1) {
    const distance = Math.sqrt(((loc.latitude - list[i].latitude) ** 2)
        + ((loc.longitude - list[i].longitude) ** 2));
    if (distance < min.distance) {
      min = { distance, index: i };
    }
  }
  return min;
}

function processFromLocation(msg) {
  const nearest = findNearest(msg.location, busStops);
  bot.sendMessage(msg.chat.id, `Nearest bus stop is ${busStops[nearest.index].name}, approximately ${Math.round(nearest.distance * ONE_DEGREE)} metre(s)`);
  const opts = {
    reply_markup: JSON.stringify({
      keyboard: [
        ['UTown'],
        ['SoC', 'BIZ', 'FASS', 'FoE/SDE'],
        ['FoS', 'YLLSM', 'YSTCM'],
        ['YIH', 'CLB/COMCEN', 'Halls'],
        ['PGPR', 'Kent Ridge MRT', 'Misc'],
      ],
      resize_keyboard: true,
    }),
  };
  bot.sendMessage(msg.chat.id, 'Which faculty are you going to? (Or you can type the destination)', opts);
  session.set(msg.chat.id, 'from', busStops[nearest.index]);
  return session.set(msg.chat.id, 'to', 1);
}

function rowify(list, columnWidth) {
  const result = [];
  for (let i = 0; i < Math.ceil(list.length / columnWidth); i += 1) {
    result.push(list.slice(i * columnWidth, (i + 1) * columnWidth));
  }
  return result;
}

function findTransit(from, to) {
  function helper(list) {
    const nearest = list[findNearest(from, list).index];
    const fromCommon = nearest.buses.filter(bus => from.buses.indexOf(bus) !== -1);
    const toCommon = nearest.buses.filter(bus => to.buses.indexOf(bus) !== -1);
    const removed = list.filter(obj => obj.name !== nearest.name);
    if (fromCommon.length > 0 && toCommon.length > 0) {
      return { fromCommon, toCommon, transit: nearest };
    }
    return helper(removed);
  }
  return helper(busStops.filter(obj => obj.name !== from.name && obj.name !== to.name));
}

function route(msg, from, to) {
  const opts = {
    reply_markup: JSON.stringify({
      keyboard: [ [{text: 'Send Location', request_location: true}] ],
      resize_keyboard: true,
    }),
  };
  const common = from.buses.filter(bus => to.buses.indexOf(bus) !== -1);
  let directions = '';
  if (common.length > 0) {
    directions = `You can take ${common.length === 1 ? 'bus' : 'buses'} ${common.join(', ')} from ${from.name} to ${to.name}`;
  } else {
    const transit = findTransit(from, to);
    directions = `You can take buses ${transit.fromCommon.join(', ')} from ${from.name} and transit at ${transit.transit.name}, then take buses ${transit.toCommon.join(', ')} to ${to.name}`;
  }
  bot.sendMessage(msg.chat.id, directions, opts);
}

function processToLocation(msg) {
  const from = session.get(msg.chat.id, 'from');
  if (session.get(msg.chat.id, 'to') === 1) {
    const filtered = busStops.filter(obj => obj.group === msg.text);
    if (filtered.length === 0) {
      session.set(msg.chat.id, 'to', 'search');
      return processToLocation(msg);
    } else if (filtered.length === 1) {
      route(msg, from, filtered[0]);
      session.del(msg.chat.id, 'from');
      session.del(msg.chat.id, 'to');
    } else {
      const opts = {
        reply_markup: JSON.stringify({
          keyboard: rowify(filtered.map(obj => obj.name), 3),
          resize_keyboard: true,
        }),
      };
      bot.sendMessage(msg.chat.id, `Choose one of the ${msg.text} bus stops`, opts);
    }
    session.set(msg.chat.id, 'to', msg.text);
  } else {
    const filtered = busStops.filter(obj => obj.name === msg.text);
    if (filtered.length === 1) {
      route(msg, from, filtered[0]);
      session.del(msg.chat.id, 'from');
      session.del(msg.chat.id, 'to');
    } else {
      if (!processToSearch(msg)) {
        bot.sendMessage(msg.chat.id, 'Please use the selections below.');
      }
    }
  }
}

function processToSearch(msg) {
  const to = msg.text.toLowerCase();
  const result = busStops.filter(obj => obj.name.toLowerCase().includes(to)).map(obj => obj.name);
  console.log(result);
  const opts = {
    reply_markup: JSON.stringify({
      keyboard: rowify(result, 3),
      resize_keyboard: true,
    }),
  };
  bot.sendMessage(msg.chat.id, 'Select which one is your destination', opts);
  return true;
}

bot.on('message', (msg) => {
  try {
    if (Object.prototype.hasOwnProperty.call(msg, 'location')) {
      return processFromLocation(msg);
    }

    const command = msg.text.split(' ')[0];
    const args = msg.text.substr(command.length + 1);

    if (session.get(msg.chat.id, 'from') !== undefined) {
      return processToLocation(msg);
    }




    switch (command) {
      case '/start':
        const opts = {
          reply_markup: JSON.stringify({
            keyboard: [ [{text: 'Send Location', request_location: true}] ],
            resize_keyboard: true,
          }),
        };
        bot.sendMessage(msg.chat.id, 'Welcome! Please send me your location so I can guide you!', opts);
        break;
      case '/about':
        bot.sendMessage(msg.chat.id, 'This bot is created by @indocomsoft and @sciffany during Hack & Roll 2018!');
        break;
      default:
        bot.sendMessage(msg.chat.id, 'Command not recognised');
        break;
    }
  } catch (e) {
    console.log(e);
  }
  return true;
});

