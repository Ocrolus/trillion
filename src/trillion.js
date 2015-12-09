/*

todo:
-invisible indices
proxy sorting
index types
money index type
number sorting
pagination UI
filter UI
sorting UI
search UI
fuzzy search
possible crossfilter integration
possible immutable.js integration
tests
readme

*/

import t from 'transducers.js';
import assign from 'object-assign';

import Filters from './filters';
import Types from './types';

//todo: validate types

//https://gist.github.com/jed/982883
function uuid(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,uuid)}

function clamp (value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function paginate () {
  let startIndex = (this.currentPage - 1) * this.options.pageSize;
  let endIndex = Math.min(startIndex + this.options.pageSize, this.rows.length);
  let view = [];
  let rows = this.rows;

  for(let i = startIndex; i < endIndex; i++) {
    view.push(rows[i]);
  }

  this.totalPages = Math.ceil(rows.length / this.options.pageSize);

  return view;
}

const Trillion = function (data, headers, options) {
  if (!(this instanceof Trillion)) {
    return new Trillion(data, headers, options);
  }

  this.initialize(data, headers, options);
};

assign(Trillion.prototype, Filters);

Trillion.types = Types;

Trillion.prototype.initialize = function (input, indices, options) {
  this.filters = {};
  this.options = {};
  this.listeners = [];
  this.sortConfig = null;
  this.currentPage = 1;
  this.totalPages = 1;

  this.options.pageSize = clamp(options.pageSize, 1, 1000) || 100;
  this.options.lazy = !!options.lazy;

  const tableIndices = indices.map(index => {
    return {
      'visible': typeof index.visible === 'undefined' ? true : index.visible,
      'field': index.field,
      'label': index.label,
      'type': index.type,
      'id': uuid(),
      'sort': (index.type && Types[index.type]) ? Types[index.type].sort : null
    };
  });

  const fields = indices.map(index => {
    return index.field;
  });

  const output = [];

  for (let i = 0, l = input.length; i < l; i++) {
    let ret = {};
    let item = input[i];

    for(let index of tableIndices) {
      //todo: clone objects?
      let raw = item[index.field];
      let display = raw;
      const indexType = index.type;

      if (indexType && Types[indexType]) {
        raw = Types[indexType].convert(raw);
      }

      ret[index.field] = {
        'display': display,
        'raw': raw
      };
    }

    output.push(ret);
  }

  this.data = output;
  this.headers = tableIndices;
  this.compute();
};

Trillion.prototype.compute = function () {
  if (this.options.lazy && !this.listeners.length) {
    return;
  } else if (!this.data || !this.data.length) {
    return;
  }

  let stack = [];

  const filters = this.filters;
  const filterNames = Object.keys(filters);

  for(let i = 0, l = filterNames.length; i < l; i++) {
    const filter = filters[filterNames[i]];
    stack.push(t.filter(filter));
  }

  const transform = t.compose.apply(null, stack);
  const rows = t.seq(this.data, transform);

  this.sort();

  this.rows = rows;

  this.renderPage();
};

//todo: probably should be internal
Trillion.prototype.sort = function () {
  if (!this.sortConfig) {
    return;
  }

  let header = this.sortConfig.header;

  let field = header.field;
  let type = header.type;
  let sort = header.sort;
  let ascending = this.sortConfig.ascending;

  if (sort) {
    const sortFn = function (a, b) {
      const x = a[field].raw;
      const y = b[field].raw;

      const sortVal = clamp(sort(x, y), -1, 1);
      return ascending ? 0 - sortVal : sortVal;
    }

    this.rows = this.rows.sort(sortFn);
  }
/*
  if (type === String) {
    this.rows = this.rows.sort(function (a, b) {
      let x = ascending ? a : b;
      let y = ascending ? b : a;
      return x[field].raw.localeCompare(y[field].raw);
    });
  } else {
    this.rows = this.rows.sort(function (a, b) {
      return a[field].raw - b[field].raw;
    });
  }
*/
};

Trillion.prototype.sortByHeader = function (headerIndex) {
  if (headerIndex >= this.headers.length) {
    throw Error('Header index out of bounds');
  }

  let header = this.headers[headerIndex];

  if (this.sortConfig && header === this.sortConfig.header) {
    this.sortConfig.ascending = !this.sortConfig.ascending;
  } else{
    this.sortConfig = {
      'header': header,
      'ascending': false
    };
  }

  this.sort();
  this.renderPage();
};

Trillion.prototype.getSortInfo = function () {
  if (!this.sortConfig) {
    return {};
  }

  return {
    'sortIndex': this.sortConfig.header.name,
    'sortAsc': this.sortConfig.ascending
  };
};

Trillion.prototype.getPageInfo = function () {
  return {
    'currentPage': this.currentPage,
    'totalPages': this.totalPages
  };
};

Trillion.prototype.getNextPage = function () {
  let currentPage = this.currentPage;

  if (currentPage + 1 <= this.totalPages) {
    this.currentPage = currentPage + 1;
  }

  this.renderPage();
};

Trillion.prototype.getPreviousPage = function () {
  let currentPage = this.currentPage;

  if (currentPage - 1 > 0) {
    this.currentPage = currentPage - 1;
  }

  this.renderPage();
};

Trillion.prototype.renderPage = function () {
  const view = paginate.call(this);

  this.notifyListeners(view);
};

Trillion.prototype.notifyListeners = function (view) {
  const headers = this.headers;
  //todo: this could be bundled into the view, since it's directly related
  const pageInfo = this.getPageInfo();
  const sortInfo = this.getSortInfo();

  for(let i = 0, l = this.listeners.length; i < l; i++) {
    if (typeof this.listeners[i] === 'function') {
      this.listeners[i](view, headers, pageInfo, sortInfo);
    }
  }
};

Trillion.prototype.registerListener = function (listener) {
  let newListener = true;

  if (typeof listener !== 'function') {
    throw Error('Listener is not a function');
  }

  for(let i = 0, l = this.listeners.length; i < l; i++) {
    if (listener === this.listeners[i]) {
      newListener = false;
    }
  }

  if (newListener) {
    this.listeners.push(listener);

    if (this.listeners.length === 1 && this.options.lazy) {
      this.compute();
    } else if (this.listeners.length > 1) {
      listener(this.rows, this.headers);
    }
  }
};

Trillion.prototype.unregisterListener = function (listener) {
  let listeners = [];

  if (typeof listener !== 'function') {
    throw Error('Listener is not a function');
  }

  for (let i = 0, l = this.listeners.length; i < l; i++) {
    if (listener !== this.listeners[i]) {
      listeners.push(this.listeners[i]);
    }
  }

  this.listeners = listeners;
};

export default Trillion;

module.exports = exports.default;