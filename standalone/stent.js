(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.stent = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

// errors
var ERROR_MISSING_MACHINE = exports.ERROR_MISSING_MACHINE = function ERROR_MISSING_MACHINE(name) {
  return 'There\'s no machine with name ' + name;
};
var ERROR_MISSING_STATE = exports.ERROR_MISSING_STATE = 'Configuration error: missing initial "state"';
var ERROR_MISSING_TRANSITIONS = exports.ERROR_MISSING_TRANSITIONS = 'Configuration error: missing "transitions"';
var ERROR_MISSING_ACTION_IN_STATE = exports.ERROR_MISSING_ACTION_IN_STATE = function ERROR_MISSING_ACTION_IN_STATE(action, state) {
  return '"' + action + '" action is not available in "' + state + '" state';
};
var ERROR_WRONG_STATE_FORMAT = exports.ERROR_WRONG_STATE_FORMAT = function ERROR_WRONG_STATE_FORMAT(state) {
  var serialized = (typeof state === 'undefined' ? 'undefined' : _typeof(state)) === 'object' ? JSON.stringify(state, null, 2) : state;

  return 'The state should be an object and it should always have at least "name" property. You passed ' + serialized;
};
var ERROR_UNCOVERED_STATE = exports.ERROR_UNCOVERED_STATE = function ERROR_UNCOVERED_STATE(state) {
  return 'You just transitioned the machine to a state (' + state + ') which is not defined or it has no actions. This means that the machine is stuck.';
};

// other
var WAIT_LISTENERS_STORAGE = exports.WAIT_LISTENERS_STORAGE = '___@wait';
var MIDDLEWARE_STORAGE = exports.MIDDLEWARE_STORAGE = '___@middlewares';
},{}],2:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.registerMethods = registerMethods;
exports.validateConfig = validateConfig;
exports.default = createMachine;

var _toCamelCase = require('./helpers/toCamelCase');

var _toCamelCase2 = _interopRequireDefault(_toCamelCase);

var _constants = require('./constants');

var _handleAction = require('./handleAction');

var _handleAction2 = _interopRequireDefault(_handleAction);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function registerMethods(machine, transitions, dispatch) {
  for (var state in transitions) {

    (function (state) {
      machine[(0, _toCamelCase2.default)('is ' + state)] = function () {
        return machine.state.name === state;
      };
    })(state);

    for (var action in transitions[state]) {
      (function (action) {
        machine[(0, _toCamelCase2.default)(action)] = function (payload) {
          return dispatch(action, payload);
        };
      })(action);
    }
  }
}

function validateConfig(_ref) {
  var state = _ref.state,
      transitions = _ref.transitions;

  if ((typeof state === 'undefined' ? 'undefined' : _typeof(state)) !== 'object') throw new Error(_constants.ERROR_MISSING_STATE);
  if ((typeof transitions === 'undefined' ? 'undefined' : _typeof(transitions)) !== 'object') throw new Error(_constants.ERROR_MISSING_TRANSITIONS);
  return true;
}

function createMachine(name, config, middlewares) {
  var _machine;

  var machine = (_machine = {
    name: name
  }, _machine[_constants.MIDDLEWARE_STORAGE] = middlewares, _machine);
  var initialState = config.state,
      transitions = config.transitions;


  machine.state = initialState;
  machine.transitions = transitions;

  if (validateConfig(config)) {
    registerMethods(machine, transitions, function (action, payload) {
      return (0, _handleAction2.default)(machine, action, payload);
    });
  }

  return machine;
}
},{"./constants":1,"./handleAction":3,"./helpers/toCamelCase":5}],3:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.default = handleAction;

var _constants = require('./constants');

var _validateState = require('./helpers/validateState');

var _validateState2 = _interopRequireDefault(_validateState);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MIDDLEWARE_PROCESS_ACTION = 'onActionDispatched';
var MIDDLEWARE_PROCESS_STATE_CHANGE = 'onStateChange';

function isEmptyObject(obj) {
  var name;
  for (name in obj) {
    if (obj.hasOwnProperty(name)) return false;
  }
  return true;
}

function handleGenerator(machine, generator, done, resultOfPreviousOperation) {
  var iterate = function iterate(result) {
    if (!result.done) {

      // yield call
      if (_typeof(result.value) === 'object' && result.value.__type === 'call') {
        var _result$value;

        var funcResult = (_result$value = result.value).func.apply(_result$value, result.value.args);

        // promise
        if (typeof funcResult.then !== 'undefined') {
          funcResult.then(function (result) {
            return iterate(generator.next(result));
          }, function (error) {
            return iterate(generator.throw(new Error(error)));
          });
          // generator
        } else if (typeof funcResult.next === 'function') {
          handleGenerator(machine, funcResult, function (generatorResult) {
            iterate(generator.next(generatorResult));
          });
        } else {
          iterate(generator.next(funcResult));
        }

        // yield wait
      } else if (_typeof(result.value) === 'object' && result.value.__type === 'wait') {
        waitFor(machine, result.value.actions, function (result) {
          return iterate(generator.next(result));
        });

        // the return statement of the normal function
      } else {
        updateState(machine, result.value);
        iterate(generator.next());
      }

      // the end of the generator (return statement)
    } else {
      done(result.value);
    }
  };

  iterate(generator.next(resultOfPreviousOperation));
}

function waitFor(machine, actions, done) {
  if (!machine[_constants.WAIT_LISTENERS_STORAGE]) machine[_constants.WAIT_LISTENERS_STORAGE] = [];
  machine[_constants.WAIT_LISTENERS_STORAGE].push({ actions: actions, done: done, result: [].concat(actions) });
}

function flushListeners(machine, action, payload) {
  if (!machine[_constants.WAIT_LISTENERS_STORAGE] || machine[_constants.WAIT_LISTENERS_STORAGE].length === 0) return;

  // We register the `done` functions that should be called
  // because this should happen at the very end of the
  // listeners processing.
  var callbacks = [];

  machine[_constants.WAIT_LISTENERS_STORAGE] = machine[_constants.WAIT_LISTENERS_STORAGE].filter(function (_ref) {
    var actions = _ref.actions,
        done = _ref.done,
        result = _ref.result;

    var actionIndex = actions.indexOf(action);

    if (actionIndex === -1) return true;

    result[result.indexOf(action)] = payload;
    actions.splice(actionIndex, 1);
    if (actions.length === 0) {
      result.length === 1 ? callbacks.push(done.bind(null, result[0])) : callbacks.push(done.bind(null, result));
      return false;
    }
    return true;
  });
  callbacks.forEach(function (c) {
    return c();
  });

  // Clean up. There is no need to keep that temporary array
  // if all the listeners are flushed.
  if (machine[_constants.WAIT_LISTENERS_STORAGE].length === 0) delete machine[_constants.WAIT_LISTENERS_STORAGE];
}

function updateState(machine, response) {
  var newState;

  if (typeof response === 'undefined') return;
  if (typeof response === 'string' || typeof response === 'number') {
    newState = { name: response.toString() };
  } else {
    newState = (0, _validateState2.default)(response);
  }

  if (typeof machine.transitions[newState.name] === 'undefined' || isEmptyObject(machine.transitions[newState.name])) {
    throw new Error((0, _constants.ERROR_UNCOVERED_STATE)(newState.name));
  }

  handleMiddleware(function () {
    machine.state = newState;
  }, MIDDLEWARE_PROCESS_STATE_CHANGE, machine);
}

function handleMiddleware(done, hook, machine) {
  for (var _len = arguments.length, args = Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
    args[_key - 3] = arguments[_key];
  }

  if (!machine[_constants.MIDDLEWARE_STORAGE]) return done();

  var middlewares = machine[_constants.MIDDLEWARE_STORAGE];
  var loop = function loop(index, process) {
    return index < middlewares.length - 1 ? process(index + 1) : done();
  };

  (function process(index) {
    var middleware = middlewares[index];

    if (middleware && typeof middleware[hook] !== 'undefined') {
      middleware[hook].apply(machine, [function () {
        return loop(index, process);
      }].concat(args));
    } else {
      loop(index, process);
    }
  })(0);
}

function handleAction(machine, action, payload) {
  var state = machine.state,
      transitions = machine.transitions;


  if (!transitions[state.name]) {
    return false;
  }

  var handler = transitions[state.name][action];

  if (typeof transitions[state.name][action] === 'undefined') {
    throw new Error((0, _constants.ERROR_MISSING_ACTION_IN_STATE)(action, state.name));
  }

  handleMiddleware(function () {
    flushListeners(machine, action, payload);

    // string as a handler
    if (typeof handler === 'string') {
      updateState(machine, _extends({}, state, { name: transitions[state.name][action] }));

      // object as a handler
    } else if ((typeof handler === 'undefined' ? 'undefined' : _typeof(handler)) === 'object') {
      updateState(machine, (0, _validateState2.default)(handler));

      // function as a handler
    } else if (typeof handler === 'function') {
      var response = transitions[state.name][action].apply(machine, [machine.state, payload]);

      if (response && typeof response.next === 'function') {
        handleGenerator(machine, response, function (response) {
          updateState(machine, response);
        });
      } else {
        updateState(machine, response);
      }
    }
  }, MIDDLEWARE_PROCESS_ACTION, machine, action, payload);

  return true;
};
module.exports = exports['default'];
},{"./constants":1,"./helpers/validateState":6}],4:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.default = connect;

var _ = require('../');

var idIndex = 0;
var getId = function getId() {
  return 'm' + ++idIndex;
};

function connect() {
  var mappings = {};

  _.Machine.addMiddleware({
    onStateChange: function onStateChange(next) {
      next();
      for (var id in mappings) {
        var _mappings$id;

        (_mappings$id = mappings[id]).done.apply(_mappings$id, mappings[id].machines);
      }
    }
  });
  var withFunc = function withFunc() {
    for (var _len = arguments.length, names = Array(_len), _key = 0; _key < _len; _key++) {
      names[_key] = arguments[_key];
    }

    var machines = names.map(function (name) {
      return _.Machine.get(name);
    });
    var mapFunc = function mapFunc(done, once) {
      var id = getId();

      !once && (mappings[id] = { done: done, machines: machines });
      done.apply(undefined, machines);

      return function () {
        if (mappings && mappings[id]) delete mappings[id];
      };
    };

    return {
      'map': mapFunc,
      'mapOnce': function mapOnce(done) {
        return mapFunc(done, true);
      }
    };
  };

  return { 'with': withFunc };
}
module.exports = exports['default'];
},{"../":7}],5:[function(require,module,exports){
"use strict";

exports.__esModule = true;

exports.default = function (text) {
  return text.toLowerCase().replace(/\W+(.)/g, function (match, chr) {
    return chr.toUpperCase();
  });
};

module.exports = exports['default'];
},{}],6:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.default = validateState;

var _constants = require('../constants');

function validateState(state) {
  if (state && (typeof state === 'undefined' ? 'undefined' : _typeof(state)) === 'object' && typeof state.name !== 'undefined') return state;
  throw new Error((0, _constants.ERROR_WRONG_STATE_FORMAT)(state));
}
module.exports = exports['default'];
},{"../constants":1}],7:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.Machine = undefined;

var _createMachine = require('./createMachine');

var _createMachine2 = _interopRequireDefault(_createMachine);

var _constants = require('./constants');

var _connect = require('./helpers/connect');

var _connect2 = _interopRequireDefault(_connect);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MachineFactory = function () {
  function MachineFactory() {
    _classCallCheck(this, MachineFactory);

    this.machines = {};
    this.middlewares = [];
    this.connect = _connect2.default;
  }

  MachineFactory.prototype.create = function create(name, config) {
    return this.machines[name] = (0, _createMachine2.default)(name, config, this.middlewares);
  };

  MachineFactory.prototype.get = function get(name) {
    if (this.machines[name]) return this.machines[name];
    throw new Error((0, _constants.ERROR_MISSING_MACHINE)(name));
  };

  MachineFactory.prototype.flush = function flush() {
    this.machines = [];
    this.middlewares = [];
  };

  MachineFactory.prototype.addMiddleware = function addMiddleware(middleware) {
    this.middlewares.push(middleware);
  };

  return MachineFactory;
}();

var factory = new MachineFactory();

exports.Machine = factory;
},{"./constants":1,"./createMachine":2,"./helpers/connect":4}]},{},[7])(7)
});