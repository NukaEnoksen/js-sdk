var crypto = require('crypto');

exports.hmac = function(message, key) {
  return crypto.createHmac('sha1', key)
      .update(message)
      .digest('hex');
};