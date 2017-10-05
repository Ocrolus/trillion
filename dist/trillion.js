(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["Trillion"] = factory();
	else
		root["Trillion"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _transducers = __webpack_require__(2);

	var _transducers2 = _interopRequireDefault(_transducers);

	var _objectAssign = __webpack_require__(3);

	var _objectAssign2 = _interopRequireDefault(_objectAssign);

	var _filters = __webpack_require__(4);

	var _filters2 = _interopRequireDefault(_filters);

	var _types = __webpack_require__(5);

	var _types2 = _interopRequireDefault(_types);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	//todo: validate types

	//https://gist.github.com/jed/982883
	/*

	todo:
	AGGREGATIONS
	remove display/raw distinction
	edit rows
	tests

	deleted rows and flushing deleted rows
	immutable.js integration
	additive filter application
	reset filters
	fuzzy search
	blank cells?
	custom filters?
	readme
	eslint

	*/

	function uuid(a) {
	  return a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, uuid);
	}

	function clamp(value, min, max) {
	  return Math.min(Math.max(value, min), max);
	}

	//todo: stop using this with paginate.call - need to figure out better mode of privacy
	function paginate() {
	  if (!this.rows) return;

	  if (this.options.pageSize === 0) {
	    return this.rows;
	  }

	  var startIndex = (this.currentPage - 1) * this.options.pageSize;
	  var endIndex = Math.min(startIndex + this.options.pageSize, this.rows.length);
	  var view = [];
	  var rows = this.rows;

	  for (var i = startIndex; i < endIndex; i++) {
	    view.push(rows[i]);
	  }

	  this.totalPages = Math.ceil(rows.length / this.options.pageSize);
	  this.currentRows = view.length;

	  return view;
	}

	var Trillion = function Trillion(data, headers, options) {
	  if (!(this instanceof Trillion)) {
	    return new Trillion(data, headers, options);
	  }

	  this.initialize(data, headers, options);
	};

	(0, _objectAssign2.default)(Trillion.prototype, _filters2.default);

	Trillion.types = _types2.default;

	Trillion.prototype.initialize = function (input, indices, options) {
	  this.options = {};
	  this.filters = [];
	  this.listeners = [];
	  this.sortConfig = [];
	  this.currentPage = 1;
	  this.currentRows = 0;
	  this.visibleRows = 0;
	  this.totalPages = 1;
	  this.totalRows = 0;

	  this.options.pageSize = options.pageSize === 0 ? 0 : clamp(options.pageSize, 1, 1000) || 100;
	  this.options.lazy = !!options.lazy;
	  this.options.types = options.types;

	  (0, _objectAssign2.default)(Trillion.types, options.types);

	  var tableIndices = indices.map(function (index) {
	    return {
	      'visible': typeof index.visible === 'undefined' ? true : index.visible,
	      'field': index.field,
	      'generator': index.generator,
	      'display': index.display,
	      'label': index.label,
	      'type': index.type,
	      'id': uuid(),
	      'sort': index.type && _types2.default[index.type] ? _types2.default[index.type].sort : null,
	      'defaultSortDescending': index.defaultSortDescending
	    };
	  });

	  var fields = indices.map(function (index) {
	    return index.field;
	  });

	  var output = [];

	  for (var i = 0, l = input.length; i < l; i++) {
	    var ret = {};
	    var item = input[i];

	    for (var j = 0; j < tableIndices.length; j++) {
	      var index = tableIndices[j];
	      //todo: clone objects?
	      var raw = item[index.field];

	      if (index.generator) {
	        raw = index.generator(item);
	      }

	      var display = raw;

	      var indexType = index.type;

	      if (indexType && _types2.default[indexType]) {
	        if (typeof raw !== 'undefined') {
	          raw = _types2.default[indexType].convert(raw);
	        }
	      }

	      if (index.display) {
	        display = index.display(raw);
	      }

	      //todo: get rid of this asap
	      ret[index.field] = {
	        'display': display,
	        'raw': raw
	      };
	    }

	    output.push(ret);
	  }

	  this.data = output;

	  this.totalRows = this.data.length;
	  this.headers = tableIndices;
	  this.compute();
	};

	Trillion.prototype.compute = function () {
	  if (this.options.lazy && !this.listeners.length) {
	    return;
	  } else if (!this.data || !this.data.length) {
	    return;
	  }

	  var filters = this.filters.map(function (filter) {
	    return _transducers2.default.filter(filter);
	  });

	  var stack = [];

	  stack = stack.concat(filters);

	  var transform = _transducers2.default.compose.apply(null, stack);
	  var rows = _transducers2.default.seq(this.data, transform);

	  this.visibleRows = rows.length;

	  this.rows = rows;

	  this.sort();

	  this.renderPage();
	};

	//todo: probably should be internal
	Trillion.prototype.sort = function () {
	  if (!Object.keys(this.sortConfig).length) {
	    return;
	  }

	  var sortFnFactory = function sortFnFactory(field) {
	    return function (a, b) {
	      var x = a[field].raw;
	      var y = b[field].raw;
	      if (typeof x === 'number' && typeof y === 'number') {
	        return _types2.default.number.sort(x, y);
	      } else if (typeof x === 'string' && typeof y === 'string') {
	        return _types2.default.text.sort(x, y);
	      } else {
	        return x < y ? -1 : x === y ? 0 : 1;
	      }
	    };
	  };
	  var sortedHeaders = this.sortConfig;

	  var sortFn = function sortFn(a, b) {
	  	var retval = null;
	  	for (var i in sortedHeaders) {
	  	  var headerSortFn = sortFnFactory(sortedHeaders[i]['header'].field);
	  	  if (sortedHeaders[i]['header'].sort) {
			headerSortFn = function headerSortFn(a, b) {
			  var x = a[sortedHeaders[i]['header'].field].raw;
			  var y = b[sortedHeaders[i]['header'].field].raw;

			  var sortVal = clamp(sortedHeaders[i]['header'].sort(x, y, sortedHeaders[i]['ascending']), -1, 1);
			  return sortedHeaders[i]['ascending'] ? sortVal : 0 - sortVal;
			};
		  }
			retval = headerSortFn(a, b);
			if (retval !== 0) {
				break;
			}
	  	}
	  	return retval
	  }

	  this.rows = this.rows.sort(sortFn);
	};

	Trillion.prototype.sortByHeader = function (sortedHeaders) {
	  this.sortConfig = [];
	  for (var id in sortedHeaders) {
	  	this.sortConfig.push({
	  	  'header': sortedHeaders[id],
	  	  'ascending': sortedHeaders[id].defaultSortDescending ? false: true
	  	})
	  }

	  this.sort();
	  this.renderPage();
	};

	Trillion.prototype.getSortInfo = function () {
	  if (!this.sortConfig) {
	    return {};
	  }

	  return {
	    'header': this.sortConfig.header,
	    'ascending': this.sortConfig.ascending
	  };
	};

	Trillion.prototype.setPageSize = function (size) {
	  //be reasonable
	  if (!isNaN(size) && size > 0 && size < 1000000) {
	    this.options.pageSize = size;
	    this.resetPagination();
	    this.renderPage();
	  } else {
	    throw Error('Invalid page size: ' + size);
	  }
	};

	Trillion.prototype.getPageInfo = function () {
	  return {
	    'currentPage': this.currentPage,
	    'currentRows': this.currentRows,
	    'visibleRows': this.visibleRows,
	    'totalPages': this.totalPages,
	    'totalRows': this.totalRows,
	    'pageSize': this.options.pageSize
	  };
	};

	Trillion.prototype.resetPagination = function () {
	  this.currentPage = 1;
	  this.renderPage();
	};

	Trillion.prototype.getPage = function (pageNumber) {
	  if (!isNaN(pageNumber) && pageNumber > 0 && pageNumber <= this.totalPages) {
	    this.currentPage = pageNumber;
	    this.renderPage();
	  } else {
	    throw Error('Invalid page: ' + pageNumber);
	  }
	};

	Trillion.prototype.getNextPage = function () {
	  var currentPage = this.currentPage;

	  if (currentPage + 1 <= this.totalPages) {
	    this.currentPage = currentPage + 1;
	  }

	  this.renderPage();
	};

	Trillion.prototype.getPreviousPage = function () {
	  var currentPage = this.currentPage;

	  if (currentPage - 1 > 0) {
	    this.currentPage = currentPage - 1;
	  }

	  this.renderPage();
	};

	Trillion.prototype.renderPage = function () {
	  var view = paginate.call(this);

	  this.notifyListeners(view);
	};

	//todo: should cache last notification so new listeners don't need to regenerate the page
	Trillion.prototype.notifyListeners = function (view, listeners) {
	  var headers = this.headers;
	  //todo: this could be bundled into the view, since it's directly related
	  var pageInfo = this.getPageInfo();
	  var sortInfo = this.getSortInfo();

	  if (!listeners) {
	    listeners = this.listeners;
	  }

	  for (var i = 0, l = listeners.length; i < l; i++) {
	    if (typeof listeners[i] === 'function') {
	      listeners[i](view, headers, pageInfo, sortInfo);
	    }
	  }
	};

	//todo: replace with aggregations
	Trillion.prototype._getPageRows = function (query) {
	  //todo: don't need to re-paginate, can just use pageInfo to start at the correct index
	  var view = paginate.call(this);

	  if (query.field) {
	    return view.map(function (row) {
	      return row[query.field];
	    });
	  } else {
	    throw Error('Lookups by non-field properties are not supported');
	  }
	};

	//todo: replace with aggregations
	Trillion.prototype._findOriginalRows = function (query) {
	  var _this = this;

	  if (query.field && query.values) {
	    return this.rows.filter(function (row) {
	      return query.values.indexOf(row[query.field].raw) !== -1;
	    }).map(function (row) {
	      var ret = {};
	      _this.headers.forEach(function (header) {
	        ret[header.field] = row[header.field].display;
	      });
	      return ret;
	    });
	  } else {
	    throw Error('Lookups without a field and values are not supported');
	  }
	};

	//todo: replace with aggregations
	Trillion.prototype._findAllOriginalRows = function (query) {
	  var _this2 = this;

	  if (query.field && query.values) {
	    return this.data.filter(function (row) {
	      return query.values.indexOf(row[query.field].raw) !== -1;
	    }).map(function (row) {
	      var ret = {};
	      _this2.headers.forEach(function (header) {
	        ret[header.field] = row[header.field].display;
	      });
	      return ret;
	    });
	  } else {
	    throw Error('Lookups without a field and values are not supported');
	  }
	};

	Trillion.prototype.registerListener = function (listener) {
	  var newListener = true;

	  if (typeof listener !== 'function') {
	    throw Error('Listener is not a function');
	  }

	  for (var i = 0, l = this.listeners.length; i < l; i++) {
	    if (listener === this.listeners[i]) {
	      newListener = false;
	    }
	  }

	  if (newListener) {
	    this.listeners.push(listener);

	    if (this.listeners.length === 1 && this.options.lazy) {
	      this.compute();
	    } else if (this.listeners.length > 1) {
	      //todo: replace with a single-listener notification
	      this.renderPage();
	    }
	  }
	};

	Trillion.prototype.unregisterListener = function (listener) {
	  var listeners = [];

	  if (typeof listener !== 'function') {
	    throw Error('Listener is not a function');
	  }

	  for (var i = 0, l = this.listeners.length; i < l; i++) {
	    if (listener !== this.listeners[i]) {
	      listeners.push(this.listeners[i]);
	    }
	  }

	  this.listeners = listeners;
	};

	exports.default = Trillion;

	module.exports = exports.default;

/***/ },
/* 2 */
/***/ function(module, exports) {

	'use strict';

	// basic protocol helpers

	var symbolExists = typeof Symbol !== 'undefined';

	var protocols = {
	  iterator: symbolExists ? Symbol.iterator : '@@iterator'
	};

	function throwProtocolError(name, coll) {
	  throw new Error("don't know how to " + name + " collection: " + coll);
	}

	function fulfillsProtocol(obj, name) {
	  if (name === 'iterator') {
	    // Accept ill-formed iterators that don't conform to the
	    // protocol by accepting just next()
	    return obj[protocols.iterator] || obj.next;
	  }

	  return obj[protocols[name]];
	}

	function getProtocolProperty(obj, name) {
	  return obj[protocols[name]];
	}

	function iterator(coll) {
	  var iter = getProtocolProperty(coll, 'iterator');
	  if (iter) {
	    return iter.call(coll);
	  } else if (coll.next) {
	    // Basic duck typing to accept an ill-formed iterator that doesn't
	    // conform to the iterator protocol (all iterators should have the
	    // @@iterator method and return themselves, but some engines don't
	    // have that on generators like older v8)
	    return coll;
	  } else if (isArray(coll)) {
	    return new ArrayIterator(coll);
	  } else if (isObject(coll)) {
	    return new ObjectIterator(coll);
	  }
	}

	function ArrayIterator(arr) {
	  this.arr = arr;
	  this.index = 0;
	}

	ArrayIterator.prototype.next = function () {
	  if (this.index < this.arr.length) {
	    return {
	      value: this.arr[this.index++],
	      done: false
	    };
	  }
	  return {
	    done: true
	  };
	};

	function ObjectIterator(obj) {
	  this.obj = obj;
	  this.keys = Object.keys(obj);
	  this.index = 0;
	}

	ObjectIterator.prototype.next = function () {
	  if (this.index < this.keys.length) {
	    var k = this.keys[this.index++];
	    return {
	      value: [k, this.obj[k]],
	      done: false
	    };
	  }
	  return {
	    done: true
	  };
	};

	// helpers

	var toString = Object.prototype.toString;
	var isArray = typeof Array.isArray === 'function' ? Array.isArray : function (obj) {
	  return toString.call(obj) == '[object Array]';
	};

	function isFunction(x) {
	  return typeof x === 'function';
	}

	function isObject(x) {
	  return x instanceof Object && Object.getPrototypeOf(x) === Object.getPrototypeOf({});
	}

	function isNumber(x) {
	  return typeof x === 'number';
	}

	function Reduced(value) {
	  this['@@transducer/reduced'] = true;
	  this['@@transducer/value'] = value;
	}

	function isReduced(x) {
	  return x instanceof Reduced || x && x['@@transducer/reduced'];
	}

	function deref(x) {
	  return x['@@transducer/value'];
	}

	/**
	 * This is for transforms that may call their nested transforms before
	 * Reduced-wrapping the result (e.g. "take"), to avoid nested Reduced.
	 */
	function ensureReduced(val) {
	  if (isReduced(val)) {
	    return val;
	  } else {
	    return new Reduced(val);
	  }
	}

	/**
	 * This is for tranforms that call their nested transforms when
	 * performing completion (like "partition"), to avoid signaling
	 * termination after already completing.
	 */
	function ensureUnreduced(v) {
	  if (isReduced(v)) {
	    return deref(v);
	  } else {
	    return v;
	  }
	}

	function reduce(coll, xform, init) {
	  if (isArray(coll)) {
	    var result = init;
	    var index = -1;
	    var len = coll.length;
	    while (++index < len) {
	      result = xform['@@transducer/step'](result, coll[index]);
	      if (isReduced(result)) {
	        result = deref(result);
	        break;
	      }
	    }
	    return xform['@@transducer/result'](result);
	  } else if (isObject(coll) || fulfillsProtocol(coll, 'iterator')) {
	    var result = init;
	    var iter = iterator(coll);
	    var val = iter.next();
	    while (!val.done) {
	      result = xform['@@transducer/step'](result, val.value);
	      if (isReduced(result)) {
	        result = deref(result);
	        break;
	      }
	      val = iter.next();
	    }
	    return xform['@@transducer/result'](result);
	  }
	  throwProtocolError('iterate', coll);
	}

	function transduce(coll, xform, reducer, init) {
	  xform = xform(reducer);
	  if (init === undefined) {
	    init = xform['@@transducer/init']();
	  }
	  return reduce(coll, xform, init);
	}

	function compose() {
	  var funcs = Array.prototype.slice.call(arguments);
	  return function (r) {
	    var value = r;
	    for (var i = funcs.length - 1; i >= 0; i--) {
	      value = funcs[i](value);
	    }
	    return value;
	  };
	}

	// transformations

	function transformer(f) {
	  var t = {};
	  t['@@transducer/init'] = function () {
	    throw new Error('init value unavailable');
	  };
	  t['@@transducer/result'] = function (v) {
	    return v;
	  };
	  t['@@transducer/step'] = f;
	  return t;
	}

	function bound(f, ctx, count) {
	  count = count != null ? count : 1;

	  if (!ctx) {
	    return f;
	  } else {
	    switch (count) {
	      case 1:
	        return function (x) {
	          return f.call(ctx, x);
	        };
	      case 2:
	        return function (x, y) {
	          return f.call(ctx, x, y);
	        };
	      default:
	        return f.bind(ctx);
	    }
	  }
	}

	function arrayMap(arr, f, ctx) {
	  var index = -1;
	  var length = arr.length;
	  var result = Array(length);
	  f = bound(f, ctx, 2);

	  while (++index < length) {
	    result[index] = f(arr[index], index);
	  }
	  return result;
	}

	function arrayFilter(arr, f, ctx) {
	  var len = arr.length;
	  var result = [];
	  f = bound(f, ctx, 2);

	  for (var i = 0; i < len; i++) {
	    if (f(arr[i], i)) {
	      result.push(arr[i]);
	    }
	  }
	  return result;
	}

	function Map(f, xform) {
	  this.xform = xform;
	  this.f = f;
	}

	Map.prototype['@@transducer/init'] = function () {
	  return this.xform['@@transducer/init']();
	};

	Map.prototype['@@transducer/result'] = function (v) {
	  return this.xform['@@transducer/result'](v);
	};

	Map.prototype['@@transducer/step'] = function (res, input) {
	  return this.xform['@@transducer/step'](res, this.f(input));
	};

	function map(coll, f, ctx) {
	  if (isFunction(coll)) {
	    ctx = f;f = coll;coll = null;
	  }
	  f = bound(f, ctx);

	  if (coll) {
	    if (isArray(coll)) {
	      return arrayMap(coll, f, ctx);
	    }
	    return seq(coll, map(f));
	  }

	  return function (xform) {
	    return new Map(f, xform);
	  };
	}

	function Filter(f, xform) {
	  this.xform = xform;
	  this.f = f;
	}

	Filter.prototype['@@transducer/init'] = function () {
	  return this.xform['@@transducer/init']();
	};

	Filter.prototype['@@transducer/result'] = function (v) {
	  return this.xform['@@transducer/result'](v);
	};

	Filter.prototype['@@transducer/step'] = function (res, input) {
	  if (this.f(input)) {
	    return this.xform['@@transducer/step'](res, input);
	  }
	  return res;
	};

	function filter(coll, f, ctx) {
	  if (isFunction(coll)) {
	    ctx = f;f = coll;coll = null;
	  }
	  f = bound(f, ctx);

	  if (coll) {
	    if (isArray(coll)) {
	      return arrayFilter(coll, f, ctx);
	    }
	    return seq(coll, filter(f));
	  }

	  return function (xform) {
	    return new Filter(f, xform);
	  };
	}

	function remove(coll, f, ctx) {
	  if (isFunction(coll)) {
	    ctx = f;f = coll;coll = null;
	  }
	  f = bound(f, ctx);
	  return filter(coll, function (x) {
	    return !f(x);
	  });
	}

	function keep(coll) {
	  return filter(coll, function (x) {
	    return x != null;
	  });
	}

	function Dedupe(xform) {
	  this.xform = xform;
	  this.last = undefined;
	}

	Dedupe.prototype['@@transducer/init'] = function () {
	  return this.xform['@@transducer/init']();
	};

	Dedupe.prototype['@@transducer/result'] = function (v) {
	  return this.xform['@@transducer/result'](v);
	};

	Dedupe.prototype['@@transducer/step'] = function (result, input) {
	  if (input !== this.last) {
	    this.last = input;
	    return this.xform['@@transducer/step'](result, input);
	  }
	  return result;
	};

	function dedupe(coll) {
	  if (coll) {
	    return seq(coll, dedupe());
	  }

	  return function (xform) {
	    return new Dedupe(xform);
	  };
	}

	function TakeWhile(f, xform) {
	  this.xform = xform;
	  this.f = f;
	}

	TakeWhile.prototype['@@transducer/init'] = function () {
	  return this.xform['@@transducer/init']();
	};

	TakeWhile.prototype['@@transducer/result'] = function (v) {
	  return this.xform['@@transducer/result'](v);
	};

	TakeWhile.prototype['@@transducer/step'] = function (result, input) {
	  if (this.f(input)) {
	    return this.xform['@@transducer/step'](result, input);
	  }
	  return new Reduced(result);
	};

	function takeWhile(coll, f, ctx) {
	  if (isFunction(coll)) {
	    ctx = f;f = coll;coll = null;
	  }
	  f = bound(f, ctx);

	  if (coll) {
	    return seq(coll, takeWhile(f));
	  }

	  return function (xform) {
	    return new TakeWhile(f, xform);
	  };
	}

	function Take(n, xform) {
	  this.n = n;
	  this.i = 0;
	  this.xform = xform;
	}

	Take.prototype['@@transducer/init'] = function () {
	  return this.xform['@@transducer/init']();
	};

	Take.prototype['@@transducer/result'] = function (v) {
	  return this.xform['@@transducer/result'](v);
	};

	Take.prototype['@@transducer/step'] = function (result, input) {
	  if (this.i < this.n) {
	    result = this.xform['@@transducer/step'](result, input);
	    if (this.i + 1 >= this.n) {
	      // Finish reducing on the same step as the final value. TODO:
	      // double-check that this doesn't break any semantics
	      result = ensureReduced(result);
	    }
	  }
	  this.i++;
	  return result;
	};

	function take(coll, n) {
	  if (isNumber(coll)) {
	    n = coll;coll = null;
	  }

	  if (coll) {
	    return seq(coll, take(n));
	  }

	  return function (xform) {
	    return new Take(n, xform);
	  };
	}

	function Drop(n, xform) {
	  this.n = n;
	  this.i = 0;
	  this.xform = xform;
	}

	Drop.prototype['@@transducer/init'] = function () {
	  return this.xform['@@transducer/init']();
	};

	Drop.prototype['@@transducer/result'] = function (v) {
	  return this.xform['@@transducer/result'](v);
	};

	Drop.prototype['@@transducer/step'] = function (result, input) {
	  if (this.i++ < this.n) {
	    return result;
	  }
	  return this.xform['@@transducer/step'](result, input);
	};

	function drop(coll, n) {
	  if (isNumber(coll)) {
	    n = coll;coll = null;
	  }

	  if (coll) {
	    return seq(coll, drop(n));
	  }

	  return function (xform) {
	    return new Drop(n, xform);
	  };
	}

	function DropWhile(f, xform) {
	  this.xform = xform;
	  this.f = f;
	  this.dropping = true;
	}

	DropWhile.prototype['@@transducer/init'] = function () {
	  return this.xform['@@transducer/init']();
	};

	DropWhile.prototype['@@transducer/result'] = function (v) {
	  return this.xform['@@transducer/result'](v);
	};

	DropWhile.prototype['@@transducer/step'] = function (result, input) {
	  if (this.dropping) {
	    if (this.f(input)) {
	      return result;
	    } else {
	      this.dropping = false;
	    }
	  }
	  return this.xform['@@transducer/step'](result, input);
	};

	function dropWhile(coll, f, ctx) {
	  if (isFunction(coll)) {
	    ctx = f;f = coll;coll = null;
	  }
	  f = bound(f, ctx);

	  if (coll) {
	    return seq(coll, dropWhile(f));
	  }

	  return function (xform) {
	    return new DropWhile(f, xform);
	  };
	}

	function Partition(n, xform) {
	  this.n = n;
	  this.i = 0;
	  this.xform = xform;
	  this.part = new Array(n);
	}

	Partition.prototype['@@transducer/init'] = function () {
	  return this.xform['@@transducer/init']();
	};

	Partition.prototype['@@transducer/result'] = function (v) {
	  if (this.i > 0) {
	    return ensureUnreduced(this.xform['@@transducer/step'](v, this.part.slice(0, this.i)));
	  }
	  return this.xform['@@transducer/result'](v);
	};

	Partition.prototype['@@transducer/step'] = function (result, input) {
	  this.part[this.i] = input;
	  this.i += 1;
	  if (this.i === this.n) {
	    var out = this.part.slice(0, this.n);
	    this.part = new Array(this.n);
	    this.i = 0;
	    return this.xform['@@transducer/step'](result, out);
	  }
	  return result;
	};

	function partition(coll, n) {
	  if (isNumber(coll)) {
	    n = coll;coll = null;
	  }

	  if (coll) {
	    return seq(coll, partition(n));
	  }

	  return function (xform) {
	    return new Partition(n, xform);
	  };
	}

	var NOTHING = {};

	function PartitionBy(f, xform) {
	  // TODO: take an "opts" object that allows the user to specify
	  // equality
	  this.f = f;
	  this.xform = xform;
	  this.part = [];
	  this.last = NOTHING;
	}

	PartitionBy.prototype['@@transducer/init'] = function () {
	  return this.xform['@@transducer/init']();
	};

	PartitionBy.prototype['@@transducer/result'] = function (v) {
	  var l = this.part.length;
	  if (l > 0) {
	    return ensureUnreduced(this.xform['@@transducer/step'](v, this.part.slice(0, l)));
	  }
	  return this.xform['@@transducer/result'](v);
	};

	PartitionBy.prototype['@@transducer/step'] = function (result, input) {
	  var current = this.f(input);
	  if (current === this.last || this.last === NOTHING) {
	    this.part.push(input);
	  } else {
	    result = this.xform['@@transducer/step'](result, this.part);
	    this.part = [input];
	  }
	  this.last = current;
	  return result;
	};

	function partitionBy(coll, f, ctx) {
	  if (isFunction(coll)) {
	    ctx = f;f = coll;coll = null;
	  }
	  f = bound(f, ctx);

	  if (coll) {
	    return seq(coll, partitionBy(f));
	  }

	  return function (xform) {
	    return new PartitionBy(f, xform);
	  };
	}

	function Interpose(sep, xform) {
	  this.sep = sep;
	  this.xform = xform;
	  this.started = false;
	}

	Interpose.prototype['@@transducer/init'] = function () {
	  return this.xform['@@transducer/init']();
	};

	Interpose.prototype['@@transducer/result'] = function (v) {
	  return this.xform['@@transducer/result'](v);
	};

	Interpose.prototype['@@transducer/step'] = function (result, input) {
	  if (this.started) {
	    var withSep = this.xform['@@transducer/step'](result, this.sep);
	    if (isReduced(withSep)) {
	      return withSep;
	    } else {
	      return this.xform['@@transducer/step'](withSep, input);
	    }
	  } else {
	    this.started = true;
	    return this.xform['@@transducer/step'](result, input);
	  }
	};

	/**
	 * Returns a new collection containing elements of the given
	 * collection, separated by the specified separator. Returns a
	 * transducer if a collection is not provided.
	 */
	function interpose(coll, separator) {
	  if (arguments.length === 1) {
	    separator = coll;
	    return function (xform) {
	      return new Interpose(separator, xform);
	    };
	  }
	  return seq(coll, interpose(separator));
	}

	function Repeat(n, xform) {
	  this.xform = xform;
	  this.n = n;
	}

	Repeat.prototype['@@transducer/init'] = function () {
	  return this.xform['@@transducer/init']();
	};

	Repeat.prototype['@@transducer/result'] = function (v) {
	  return this.xform['@@transducer/result'](v);
	};

	Repeat.prototype['@@transducer/step'] = function (result, input) {
	  var n = this.n;
	  var r = result;
	  for (var i = 0; i < n; i++) {
	    r = this.xform['@@transducer/step'](r, input);
	    if (isReduced(r)) {
	      break;
	    }
	  }
	  return r;
	};

	/**
	 * Returns a new collection containing elements of the given
	 * collection, each repeated n times. Returns a transducer if a
	 * collection is not provided.
	 */
	function repeat(coll, n) {
	  if (arguments.length === 1) {
	    n = coll;
	    return function (xform) {
	      return new Repeat(n, xform);
	    };
	  }
	  return seq(coll, repeat(n));
	}

	function TakeNth(n, xform) {
	  this.xform = xform;
	  this.n = n;
	  this.i = -1;
	}

	TakeNth.prototype['@@transducer/init'] = function () {
	  return this.xform['@@transducer/init']();
	};

	TakeNth.prototype['@@transducer/result'] = function (v) {
	  return this.xform['@@transducer/result'](v);
	};

	TakeNth.prototype['@@transducer/step'] = function (result, input) {
	  this.i += 1;
	  if (this.i % this.n === 0) {
	    return this.xform['@@transducer/step'](result, input);
	  }
	  return result;
	};

	/**
	 * Returns a new collection of every nth element of the given
	 * collection. Returns a transducer if a collection is not provided.
	 */
	function takeNth(coll, nth) {
	  if (arguments.length === 1) {
	    nth = coll;
	    return function (xform) {
	      return new TakeNth(nth, xform);
	    };
	  }
	  return seq(coll, takeNth(nth));
	}

	// pure transducers (cannot take collections)

	function Cat(xform) {
	  this.xform = xform;
	}

	Cat.prototype['@@transducer/init'] = function () {
	  return this.xform['@@transducer/init']();
	};

	Cat.prototype['@@transducer/result'] = function (v) {
	  return this.xform['@@transducer/result'](v);
	};

	Cat.prototype['@@transducer/step'] = function (result, input) {
	  var xform = this.xform;
	  var newxform = {};
	  newxform['@@transducer/init'] = function () {
	    return xform['@@transducer/init']();
	  };
	  newxform['@@transducer/result'] = function (v) {
	    return v;
	  };
	  newxform['@@transducer/step'] = function (result, input) {
	    var val = xform['@@transducer/step'](result, input);
	    return isReduced(val) ? deref(val) : val;
	  };

	  return reduce(input, newxform, result);
	};

	function cat(xform) {
	  return new Cat(xform);
	}

	function mapcat(f, ctx) {
	  f = bound(f, ctx);
	  return compose(map(f), cat);
	}

	// collection helpers

	function push(arr, x) {
	  arr.push(x);
	  return arr;
	}

	function merge(obj, x) {
	  if (isArray(x) && x.length === 2) {
	    obj[x[0]] = x[1];
	  } else {
	    var keys = Object.keys(x);
	    var len = keys.length;
	    for (var i = 0; i < len; i++) {
	      obj[keys[i]] = x[keys[i]];
	    }
	  }
	  return obj;
	}

	var arrayReducer = {};
	arrayReducer['@@transducer/init'] = function () {
	  return [];
	};
	arrayReducer['@@transducer/result'] = function (v) {
	  return v;
	};
	arrayReducer['@@transducer/step'] = push;

	var objReducer = {};
	objReducer['@@transducer/init'] = function () {
	  return {};
	};
	objReducer['@@transducer/result'] = function (v) {
	  return v;
	};
	objReducer['@@transducer/step'] = merge;

	// building new collections

	function toArray(coll, xform) {
	  if (!xform) {
	    return reduce(coll, arrayReducer, []);
	  }
	  return transduce(coll, xform, arrayReducer, []);
	}

	function toObj(coll, xform) {
	  if (!xform) {
	    return reduce(coll, objReducer, {});
	  }
	  return transduce(coll, xform, objReducer, {});
	}

	function toIter(coll, xform) {
	  if (!xform) {
	    return iterator(coll);
	  }
	  return new LazyTransformer(xform, coll);
	}

	function seq(coll, xform) {
	  if (isArray(coll)) {
	    return transduce(coll, xform, arrayReducer, []);
	  } else if (isObject(coll)) {
	    return transduce(coll, xform, objReducer, {});
	  } else if (coll['@@transducer/step']) {
	    var init;
	    if (coll['@@transducer/init']) {
	      init = coll['@@transducer/init']();
	    } else {
	      init = new coll.constructor();
	    }

	    return transduce(coll, xform, coll, init);
	  } else if (fulfillsProtocol(coll, 'iterator')) {
	    return new LazyTransformer(xform, coll);
	  }
	  throwProtocolError('sequence', coll);
	}

	function into(to, xform, from) {
	  if (isArray(to)) {
	    return transduce(from, xform, arrayReducer, to);
	  } else if (isObject(to)) {
	    return transduce(from, xform, objReducer, to);
	  } else if (to['@@transducer/step']) {
	    return transduce(from, xform, to, to);
	  }
	  throwProtocolError('into', to);
	}

	// laziness

	var stepper = {};
	stepper['@@transducer/result'] = function (v) {
	  return isReduced(v) ? deref(v) : v;
	};
	stepper['@@transducer/step'] = function (lt, x) {
	  lt.items.push(x);
	  return lt.rest;
	};

	function Stepper(xform, iter) {
	  this.xform = xform(stepper);
	  this.iter = iter;
	}

	Stepper.prototype['@@transducer/step'] = function (lt) {
	  var len = lt.items.length;
	  while (lt.items.length === len) {
	    var n = this.iter.next();
	    if (n.done || isReduced(n.value)) {
	      // finalize
	      this.xform['@@transducer/result'](this);
	      break;
	    }

	    // step
	    this.xform['@@transducer/step'](lt, n.value);
	  }
	};

	function LazyTransformer(xform, coll) {
	  this.iter = iterator(coll);
	  this.items = [];
	  this.stepper = new Stepper(xform, iterator(coll));
	}

	LazyTransformer.prototype[protocols.iterator] = function () {
	  return this;
	};

	LazyTransformer.prototype.next = function () {
	  this['@@transducer/step']();

	  if (this.items.length) {
	    return {
	      value: this.items.pop(),
	      done: false
	    };
	  } else {
	    return { done: true };
	  }
	};

	LazyTransformer.prototype['@@transducer/step'] = function () {
	  if (!this.items.length) {
	    this.stepper['@@transducer/step'](this);
	  }
	};

	// util

	function range(n) {
	  var arr = new Array(n);
	  for (var i = 0; i < arr.length; i++) {
	    arr[i] = i;
	  }
	  return arr;
	}

	module.exports = {
	  reduce: reduce,
	  transformer: transformer,
	  Reduced: Reduced,
	  isReduced: isReduced,
	  iterator: iterator,
	  push: push,
	  merge: merge,
	  transduce: transduce,
	  seq: seq,
	  toArray: toArray,
	  toObj: toObj,
	  toIter: toIter,
	  into: into,
	  compose: compose,
	  map: map,
	  filter: filter,
	  remove: remove,
	  cat: cat,
	  mapcat: mapcat,
	  keep: keep,
	  dedupe: dedupe,
	  take: take,
	  takeWhile: takeWhile,
	  takeNth: takeNth,
	  drop: drop,
	  dropWhile: dropWhile,
	  partition: partition,
	  partitionBy: partitionBy,
	  interpose: interpose,
	  repeat: repeat,
	  range: range,

	  LazyTransformer: LazyTransformer
	};

/***/ },
/* 3 */
/***/ function(module, exports) {

	/* eslint-disable no-unused-vars */
	'use strict';

	var hasOwnProperty = Object.prototype.hasOwnProperty;
	var propIsEnumerable = Object.prototype.propertyIsEnumerable;

	function toObject(val) {
		if (val === null || val === undefined) {
			throw new TypeError('Object.assign cannot be called with null or undefined');
		}

		return Object(val);
	}

	module.exports = Object.assign || function (target, source) {
		var from;
		var to = toObject(target);
		var symbols;

		for (var s = 1; s < arguments.length; s++) {
			from = Object(arguments[s]);

			for (var key in from) {
				if (hasOwnProperty.call(from, key)) {
					to[key] = from[key];
				}
			}

			if (Object.getOwnPropertySymbols) {
				symbols = Object.getOwnPropertySymbols(from);
				for (var i = 0; i < symbols.length; i++) {
					if (propIsEnumerable.call(from, symbols[i])) {
						to[symbols[i]] = from[symbols[i]];
					}
				}
			}
		}

		return to;
	};

/***/ },
/* 4 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	function MatchFilter(needle, haystack) {
	  return haystack.indexOf(needle) !== -1;
	}

	function EqualFilter(a, b) {
	  return a === b;
	}

	function MinFilter(a, b) {
	  return a >= b;
	}

	function MaxFilter(a, b) {
	  return a <= b;
	}

	function RangeFilter(value, min, max) {
	  return value >= min && value <= max;
	}

	function AnyFilter(needle, haystack) {
	  if (needle.constructor === String) {
	    needle = needle.split(' ');
	  }

	  if (needle.filter((n) => haystack.includes(n)).length) {
	    return true;
	  } 

	  return false;
	}

	//ported from DataTables
	function SmartFilter(haystack, needle) {
	  haystack = haystack.toLowerCase();
	  needle = needle.toLowerCase();
	  //todo: this matches exact indexOf matches poorly, hence this early bailout
	  if (haystack.indexOf(needle) !== -1) {
	    return true;
	  }

	  var wordRegex = /"[^"]+"|[^ ]+/g;
	  var words = needle.match(wordRegex).map(function (word) {
	    return word.replace(/\"/g, '');
	  });

	  var smartRegexSource = '^(?=.*?' + words.join(')(?=.*?') + ').*$';
	  var smartRegex = new RegExp(smartRegexSource, 'i');

	  var match = haystack.match(smartRegex);
	  return match;
	}

	var filters = {
	  'match': MatchFilter,
	  'equal': EqualFilter,
	  'min': MinFilter,
	  'max': MaxFilter,
	  'range': RangeFilter,
	  'any': AnyFilter,
	  'smart': SmartFilter
	};

	exports.default = {
	  'createFilter': function createFilter(type, fields) {
	    for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
	      args[_key - 2] = arguments[_key];
	    }

	    fields = fields.split(' ');
	    var fn = function fn() {
	      return true;
	    };

	    if (filters[type]) {
	      fn = function fn(data) {
	        //todo: remove .raw
	        return fields.some(function (field) {
	          return filters[type].apply(filters, [data[field].raw].concat(args));
	        });
	      };
	    }

	    return fn;
	  },

	  'addFilter': function addFilter(filter) {
	    this.resetPagination();

	    for (var i = 0, l = this.filters.length; i < l; i++) {
	      if (this.filters[i] === filter) {
	        return;
	      }
	    }

	    this.filters.unshift(filter);
	  },

	  'removeFilter': function removeFilter(filter) {
	    this.resetPagination();

	    this.filters = this.filters.filter(function (f) {
	      return f !== filter;
	    });
	  },

	  'toggleFilter': function toggleFilter(filter) {

	    var foundFilter = this.filters.filter(function (f) {
	      return f === filter;
	    }).length > 0;

	    if (foundFilter) {
	      this.removeFilter(filter);
	    } else {
	      this.addFilter(filter);
	    }
	  },

	  'filters': filters
	};

/***/ },
/* 5 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = {
	  'text': {
	    'convert': function convert(raw) {
	      if (typeof raw === 'string') {
	        return raw;
	      } else {
	        return String(raw);
	      }
	    },
	    'sort': function sort(a, b) {
	      return a.localeCompare(b);
	    }
	  },

	  'boolean': {
	    'convert': function convert(raw) {
	      return !!raw;
	    },
	    'sort': function sort(a, b) {
	      return a > b;
	    }
	  },

	  'number': {
	    'convert': function convert(raw) {
	      if (typeof raw === 'number' && !isNaN(raw)) {
	        return raw;
	      } else {
	        return parseFloat(raw);
	      }
	    },
	    'sort': function sort(a, b) {
	      return a - b;
	    }
	  },

	  'date': {
	    'convert': function convert(raw) {
	      if (raw.constructor === Date) {
	        return raw;
	      } else {
	        return new Date(raw);
	      }
	    },
	    'sort': function sort(a, b) {
	      if (typeof a === 'undefined') {
	        return -1;
	      } else if (typeof b === 'undefined') {
	        return 1;
	      } else {
	        return a - b;
	      }
	    }
	  }
	};

/***/ }
/******/ ])
});
;