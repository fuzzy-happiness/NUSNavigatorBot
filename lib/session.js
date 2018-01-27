const NodeCache = require('node-cache');

class Session {
  constructor(ttl = 300) {
    this.session = new NodeCache();
    this.ttl = ttl;
  }

  get(chatId, key) {
    return this.session.get(`${chatId}-${key}`);
  }

  set(chatId, key, value) {
    return this.session.set(`${chatId}-${key}`, value, this.ttl);
  }
}

module.exports = Session;
