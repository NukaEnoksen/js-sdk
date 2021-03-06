"use strict";

const ALLOWED_OPERATIONS = [
  '$add',
  '$and',
  '$currentDate',
  '$dec',
  '$inc',
  '$max',
  '$min',
  '$mul',
  '$or',
  '$pop',
  '$push',
  '$put',
  '$remove',
  '$rename',
  '$replace',
  '$set',
  '$shift',
  '$unshift',
  '$xor',
];

const UpdateOperation = require('./UpdateOperation');

/**
 * @alias partialupdate.PartialUpdateBuilder<T>
 */
class PartialUpdateBuilder {
  /**
   * @param {json} operations
   */
  constructor(operations) {
    /** @type {UpdateOperation[]} */
    this._operations = [];
    if (operations) {
      this._addOperations(operations);
    }
  }

  /**
   * Sets a field to a given value
   *
   * @param {string} field The field to set
   * @param {string|number|Set<*>|Map<string|number, *>|Array<*>} value The value to set to
   * @return {this}
   */
  set(field, value) {
    if (value instanceof Set) {
      value = Array.from(value);
    } else if (value instanceof Map) {
      const newValue = {};
      value.forEach((v, k) => {
        newValue[k] = v;
      });
      value = newValue;
    }

    return this._addOperation(field, '$set', value);
  }

  /**
   * Increments a field by a given value
   *
   * @param {string} field The field to increment
   * @param {number=} by The number to increment by, defaults to 1
   * @return {this}
   */
  inc(field, by) {
    return this._addOperation(field, '$inc', typeof by === 'number' ? by : 1);
  }

  /**
   * Decrements a field by a given value
   *
   * @param {string} field The field to decrement
   * @param {number=} by The number to decrement by, defaults to 1
   * @return {this}
   */
  dec(field, by) {
    return this.increment(field, typeof by === 'number' ? -by : -1);
  }

  /**
   * Multiplies a field by a given number
   *
   * @param {string} field The field to multiply
   * @param {number} multiplicator The number to multiply by
   * @return {this}
   */
  mul(field, multiplicator) {
    if (typeof multiplicator !== 'number') {
      throw new Error('Multiplicator must be a number.');
    }

    return this._addOperation(field, '$mul', multiplicator);
  }

  /**
   * Divides a field by a given number
   *
   * @param {string} field The field to divide
   * @param {number} divisor The number to divide by
   * @return {this}
   */
  div(field, divisor) {
    if (typeof divisor !== 'number') {
      throw new Error('Divisor must be a number.');
    }

    return this._addOperation(field, '$mul', 1 / divisor);
  }

  /**
   * Sets the highest possible value of a field
   *
   * @param {string} field The field to compare with
   * @param {number} value The highest possible value
   * @return {this}
   */
  min(field, value) {
    if (typeof value !== 'number') {
      throw new Error('Value must be a number');
    }

    return this._addOperation(field, '$min', value);
  }

  /**
   * Sets the smallest possible value of a field
   *
   * @param {string} field The field to compare with
   * @param {number} value The smalles possible value
   * @return {this}
   */
  max(field, value) {
    if (typeof value !== 'number') {
      throw new Error('Value must be a number');
    }

    return this._addOperation(field, '$max', value);
  }

  /**
   * Removes an item from an array or map
   *
   * @param {string} field The field to perform the operation on
   * @param {*} item The item to add
   * @return {this}
   */
  remove(field, item) {
    return this._addOperation(field, '$remove', item);
  }

  /**
   * Puts an item from an array or map
   *
   * @param {string} field The field to perform the operation on
   * @param {string|object} key The map key to put the value to or an object of arguments
   * @param {*} [value] The value to put if a key was used
   * @return {this}
   */
  put(field, key, value) {
    const obj = {};
    if (typeof key === 'string' || typeof key === 'number') {
      obj[key] = value;
    } else if (typeof key === 'object') {
      Object.assign(obj, key);
    }

    return this._addOperation(field, '$put', obj);
  }

  /**
   * Pushes an item into a list
   *
   * @param {string} field The field to perform the operation on
   * @param {*} item The item to add
   * @return {this}
   */
  push(field, item) {
    return this._addOperation(field, '$push', item);
  }

  /**
   * Unshifts an item into a list
   *
   * @param {string} field The field to perform the operation on
   * @param {*} item The item to add
   * @return {this}
   */
  unshift(field, item) {
    return this._addOperation(field, '$unshift', item);
  }

  /**
   * Pops the last item out of a list
   *
   * @param {string} field The field to perform the operation on
   * @return {this}
   */
  pop(field) {
    return this._addOperation(field, '$pop');
  }

  /**
   * Shifts the first item out of a list
   *
   * @param {string} field The field to perform the operation on
   * @return {this}
   */
  shift(field) {
    return this._addOperation(field, '$shift');
  }

  /**
   * Adds an item to a set
   *
   * @param {string} field The field to perform the operation on
   * @param {*} item The item to add
   * @return {this}
   */
  add(field, item) {
    return this._addOperation(field, '$add', item);
  }

  /**
   * Replaces an item at a given index
   *
   * @param {string} path The path to perform the operation on
   * @param {number} index The index where the item will be replaced
   * @param {*} item The item to replace with
   * @return {this}
   */
  replace(path, index, item) {
    if (this._hasOperationOnPath(path))
      throw new Error(`You cannot update ${path} multiple times`);

    return this._addOperation(`${path}.${index}`, '$replace', item);
  }

  /**
   * Sets a datetime field to the current moment
   *
   * @param {string} field The field to perform the operation on
   * @return {this}
   */
  currentDate(field) {
    return this._addOperation(field, '$currentDate');
  }

  /**
   * Performs a bitwise AND on a path
   *
   * @param {string} path The path to perform the operation on
   * @param {number} bitmask The bitmask taking part in the operation
   * @return {this}
   */
  and(path, bitmask) {
    return this._addOperation(path, '$and', bitmask);
  }

  /**
   * Performs a bitwise OR on a path
   *
   * @param {string} path The path to perform the operation on
   * @param {number} bitmask The bitmask taking part in the operation
   * @return {this}
   */
  or(path, bitmask) {
    return this._addOperation(path, '$or', bitmask);
  }

  /**
   * Performs a bitwise XOR on a path
   *
   * @param {string} path The path to perform the operation on
   * @param {number} bitmask The bitmask taking part in the operation
   * @return {this}
   */
  xor(path, bitmask) {
    return this._addOperation(path, '$xor', bitmask);
  }

  /**
   * Renames a field
   *
   * @param {string} oldPath The old field name
   * @param {string} newPath The new field name
   * @return {this}
   */
  rename(oldPath, newPath) {
    return this._addOperation(oldPath, '$rename', newPath);
  }

  /**
   * Returns a JSON representation of this partial update
   *
   * @return {json}
   */
  toJSON() {
    return this._operations.reduce((json, operation) => {
      const obj = {};
      obj[operation.path] = operation.value;

      json[operation.name] = Object.assign({}, json[operation.name], obj);

      return json;
    }, {});
  }

  /**
   * Executes the partial update
   *
   * @return {Promise<T>} The promise resolves when the partial update has been executed successfully
   * @abstract
   */
  execute() {
    throw new Error('Cannot call "execute" on abstract PartialUpdateBuilder');
  }

  /**
   * Adds an update operation on the partial update
   *
   * @param {string} path The path which gets modified by the operation
   * @param {string} operator The operator of the operation to add
   * @param {*} [value] The value used to execute the operation
   * @return {this}
   * @private
   */
  _addOperation(path, operator, value) {
    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    if (ALLOWED_OPERATIONS.indexOf(operator) === -1) {
      throw new Error('Operation invalid: ' + operator);
    }

    if (this._hasOperationOnPath(path)) {
      throw new Error(`You cannot update ${path} multiple times`);
    }

    // Add the new operation
    this._operations.push(new UpdateOperation(operator, path, value || null));

    return this;
  }

  /**
   * Adds initial operations
   *
   * @param {json} json
   * @private
   */
  _addOperations(json) {
    Object.keys(json).forEach((key) => {
      const pathValueDictionary = json[key];
      Object.keys(pathValueDictionary).forEach((path) => {
        const value = pathValueDictionary[path];
        this._operations.push(new UpdateOperation(key, path, value));
      });
    });
  }

  /**
   * Checks whether an operation on the field exists already
   *
   * @param {string} path The path where the operation is executed on
   * @return {boolean} True, if the operation does exist
   * @private
   */
  _hasOperationOnPath(path) {
    return this._operations.some(op => op.path === path);
  }
}

// aliases
Object.assign(PartialUpdateBuilder.prototype, /** @lends partialupdate.PartialUpdateBuilder<T>.prototype */ {
  /**
   * Increments a field by a given value
   *
   * @method
   * @param {string} field The field to increment
   * @param {number=} by The number to increment by, defaults to 1
   * @return {this}
   */
  increment: PartialUpdateBuilder.prototype.inc,

  /**
   * Decrements a field by a given value
   *
   * @method
   * @param {string} field The field to decrement
   * @param {number=} by The number to decrement by, defaults to 1
   * @return {this}
   */
  decrement: PartialUpdateBuilder.prototype.dec,

  /**
   * Multiplies a field by a given number
   *
   * @method
   * @param {string} field The field to multiply
   * @param {number} multiplicator The number to multiply by
   * @return {this}
   */
  multiply: PartialUpdateBuilder.prototype.mul,

  /**
   * Divides a field by a given number
   *
   * @method
   * @param {string} field The field to divide
   * @param {number} divisor The number to divide by
   * @return {this}
   */
  divide: PartialUpdateBuilder.prototype.div,

  /**
   * Sets the highest possible value of a field
   *
   * @method
   * @param {string} field The field to compare with
   * @param {number} value The highest possible value
   * @return {this}
   */
  atMost: PartialUpdateBuilder.prototype.min,

  /**
   * Sets the smallest possible value of a field
   *
   * @method
   * @param {string} field The field to compare with
   * @param {number} value The smalles possible value
   * @return {this}
   */
  atLeast: PartialUpdateBuilder.prototype.max,

  /**
   * Sets a datetime field to the current moment
   *
   * @method
   * @param {string} field The field to perform the operation on
   * @return {this}
   */
  toNow: PartialUpdateBuilder.prototype.currentDate,
});

module.exports = PartialUpdateBuilder;
