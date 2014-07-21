var Type = require('./Type').Type;
var col = require('../collection');

/**
 * @class jspa.metamodel.ManagedType
 * @extends jspa.metamodel.Type
 */
exports.ManagedType = ManagedType = Type.inherit(
    /**
     * @lends jspa.metamodel.ManagedType.prototype
     */
    {
  AttributeIterator: Object.inherit(col.Iterator, {
    nextAttr: null,
    index: 0,

    initialize: function (type) {
      this.type = type;
      this.next();
    },

    /**
     * @return {jspa.metamodel.Attribute}
     */
    next: function () {
      var attr = this.nextAttr;

      while (this.type.declaredAttributes.length == this.index && (this.type = this.type.supertype)) {
        this.index = 0;
      }

      this.hasNext = this.type != null;
      if (this.hasNext) {
        this.nextAttr = this.type.declaredAttributes[this.index++];
      }

      return attr;
    }
  }),

  /**
   * @type {jspa.metamodel.Attribute[]}
   */
  declaredAttributes: null,

  /**
   * @type {jspa.metamodel.EntityType}
   */
  supertype: null,

  /**
   * @memberOf jspa.metamodel.Type
   * @param {String} identifier
   * @param {Function} typeConstructor
   */
  initialize: function (identifier, typeConstructor) {
    this.superCall(identifier, typeConstructor);

    this.declaredAttributes = [];
  },

  /**
   * @param {jspa.binding.ClassUtil} classUtil
   */
  init: function (classUtil) {
    if (!this.typeConstructor) {
      this.typeConstructor = classUtil.loadClass(this);

      this.superCall(classUtil);
      classUtil.enhance(this, this.typeConstructor);
    } else {
      this.superCall(classUtil);
    }
  },

  /**
   * @return {jspa.metamodel.ManagedType.AttributeIterator}
   */
  attributes: function () {
    return new this.AttributeIterator(this);
  },

  /**
   * @param {!String} name
   * @returns {jspa.metamodel.Attribute}
   */
  getAttribute: function (name) {
    var attr = this.getDeclaredAttribute(name);

    if (!attr && this.supertype) {
      attr = this.supertype.getAttribute(name);
    }

    return attr;
  },

  /**
   * @param {String} name
   * @returns {jspa.metamodel.Attribute}
   */
  getDeclaredAttribute: function (name) {
    for (var i = 0, attr; attr = this.declaredAttributes[i]; ++i) {
      if (attr.name == name) {
        return attr;
      }
    }

    return null;
  },

  /**
   * @param {jspa.util.State} state
   * @param {*} obj
   * @param {Object} value
   * @return {*}
   */
  fromDatabaseValue: function (state, obj, value) {
    if (value && value._objectInfo['class'] == this.identifier) {
      for (var iter = this.attributes(); iter.hasNext;) {
        var attribute = iter.next();

        attribute.setDatabaseValue(state, obj, value[attribute.name]);
      }
    } else {
      obj = null;
    }

    return obj;
  },

  /**
   * @param {jspa.util.State} state
   * @param {*} obj
   * @return {Object}
   */
  toDatabaseValue: function (state, obj) {
    var value = null;

    if (this.typeConstructor.isInstance(obj)) {
      value = {
        _objectInfo: {
          'class': this.identifier
        }
      };

      for (var iter = this.attributes(); iter.hasNext;) {
        var attribute = iter.next();

        value[attribute.name] = attribute.getDatabaseValue(state, obj);
      }
    }

    return value;
  }
});