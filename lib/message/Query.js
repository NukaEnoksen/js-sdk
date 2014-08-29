var Message = require('./Message').Message;
var CommunicationError = require('../error').CommunicationError;

/**
 * Executes an adhoc query
 * Executes an adhoc query and returns a list of matching object identifiers
 * 
 * @class jspa.message.Query
 * @extends jspa.message.Message
 */
exports.Query = Message.inherit(/** @lends jspa.message.Query.prototype */ {

  /**
   * @param bucket {String} The bucket name
   * @param start {number} The offset from where to start from
   * @param count {number} The number of objects to list
   */
  initialize: function(bucket, start, count) {
    this.superCall('POST', '/db/' + bucket + '?' + start + '&' + count + '');
  },

  doReceive: function() {
    if (this.response.statusCode != 200) {
      throw new CommunicationError(this);
    }
  }
});