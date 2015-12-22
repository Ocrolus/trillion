/*

todo:
immutable.js integration
remove display/raw distinction
range filter
get rid of filter names
any filter
allow setting custom id for headers
fuzzy search
blank cells?
custom filters?
default sort direction per header
tests
readme
eslint

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

//todo: stop using this with paginate.call - need to figure out better mode of privacy
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
  this.options = {};
  this.filters = {};
  this.listeners = [];
  this.sortConfig = null;
  this.currentPage = 1;
  this.totalPages = 1;
  this.totalRows = 0;

  this.options.pageSize = clamp(options.pageSize, 1, 1000) || 100;
  this.options.lazy = !!options.lazy;
  this.options.types = options.types;

  assign(Trillion.types, options.types);

  const tableIndices = indices.map(index => {
    return {
      'visible': typeof index.visible === 'undefined' ? true : index.visible,
      'field': index.field,
      'generator': index.generator,
      'display': index.display,
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

      if (index.generator) {
        raw = index.generator(item);
      }

      let display = raw;

      const indexType = index.type;

      if (indexType && Types[indexType]) {
        if (typeof raw !== 'undefined') {
          raw = Types[indexType].convert(raw);
        }
      }

      if (index.display) {
        display = index.display(raw);
      }

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

  let stack = [];

  const filters = this.filters;
  const filterNames = Object.keys(filters);

  for(let i = 0, l = filterNames.length; i < l; i++) {
    const filter = filters[filterNames[i]];
    stack.push(t.filter(filter));
  }

  const transform = t.compose.apply(null, stack);
  const rows = t.seq(this.data, transform);

  this.rows = rows;

  this.sort();

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

  let sortFn = function (a, b) {
    const x = a[field].raw;
    const y = b[field].raw;
    if (typeof x === 'number' && typeof y === 'number') {
      return Types.number.sort(x, y);
    } else if (typeof x === 'string' && typeof y === 'string') {
      return Types.string.sort(x, y);
    } else {
      return x < y ? -1 : (x === y ? 0 : 1);
    }
  };

  if (sort) {
    sortFn = function (a, b) {
      const x = a[field].raw;
      const y = b[field].raw;

      const sortVal = clamp(sort(x, y, ascending), -1, 1);
      return ascending ? sortVal : 0 - sortVal;
    }
  }

  this.rows = this.rows.sort(sortFn);
};

Trillion.prototype.sortByHeader = function (headerId) {
  let header = null;

  for(let i = 0; i < this.headers.length; i++) {
    if (this.headers[i].id === headerId) {
      header = this.headers[i];
      break;
    }
  }

  if (!header) {
    throw Error('Header not found');
  }

  if (this.sortConfig && header === this.sortConfig.header) {
    this.sortConfig.ascending = !this.sortConfig.ascending;
  } else{
    this.sortConfig = {
      'header': header,
      'ascending': true
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
}

Trillion.prototype.getPageInfo = function () {
  return {
    'currentPage': this.currentPage,
    'totalPages': this.totalPages,
    'totalRows': this.totalRows
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
    throw Error('Invalid page: ' + pageNumber)
  }
}

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

//todo: should cache last notification so new listeners don't need to regenerate the page
Trillion.prototype.notifyListeners = function (view, listeners) {
  const headers = this.headers;
  //todo: this could be bundled into the view, since it's directly related
  const pageInfo = this.getPageInfo();
  const sortInfo = this.getSortInfo();

  if (!listeners) {
    listeners = this.listeners;
  }

  for(let i = 0, l = listeners.length; i < l; i++) {
    if (typeof listeners[i] === 'function') {
      listeners[i](view, headers, pageInfo, sortInfo);
    }
  }
};

Trillion.prototype.getRows = function (query) {
  if (query.field) {
    return this.rows.map(row => {
      return row[query.field];
    });
  } else {
    throw Error('Lookups by non-field properties are not supported');
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
      //todo: replace with a single-listener notification
      this.renderPage();
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

function Trillion2 (options) {
  return (function TrillionEnv () {
    const props = assign({}, options);
    const state = {};

    return {};
  })();
}

export default Trillion;

module.exports = exports.default;