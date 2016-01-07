function MatchFilter (needle, haystack) {
  return haystack.indexOf(needle) !== -1;
}

function EqualFilter (a, b) {
  return a === b;
}

function MinFilter (a, b) {
  return a >= b;
}

function MaxFilter (a, b) {
  return a <= b;
}

function RangeFilter (value, min, max) {
  return value >= min && value <= max;
}

function AnyFilter (needle, haystack) {
  for(let i = 0, l = haystack.length; i < l; i++) {
    if (haystack[i] === needle) {
      return true;
    }
  }

  return false;
}

//ported from DataTables
function SmartFilter (haystack, needle) {
  //todo: this matches exact indexOf matches poorly, hence this early bailout
  if (haystack.indexOf('needle') !== -1) {
    return true;
  }

  const wordRegex = /"[^"]+"|[^ ]+/g;
  const words = needle.match(wordRegex).map(word => {
    return word.replace(/\"/g, '');
  });

  const smartRegexSource = '^(?=.*?' + words.join(')(?=.*?') + ').*$';
  const smartRegex = new RegExp(smartRegexSource, 'i');

  const match = haystack.match(smartRegex);
  return match;
}

const filters = {
  'match': MatchFilter,
  'equal': EqualFilter,
  'min': MinFilter,
  'max': MaxFilter,
  'range': RangeFilter,
  'any': AnyFilter,
  'smart': SmartFilter
};

export default {
  'createFilter': function (type, field, ...args) {
    let fn = function () {
      return true;
    };

    if (filters[type]) {
      fn = function (data) {
        //todo: remove .raw
        return filters[type](data[field].raw, ...args);
      };
    }

    return fn;
  },

  'addFilter': function (filter) {
    this.resetPagination();

    for(let i = 0, l = this.filters.length; i < l; i++) {
      if (this.filters[i] === filter) {
        return;
      }
    }

    this.filters.unshift(filter);
  },

  'removeFilter': function (filter) {
    this.resetPagination();

    this.filters = this.filters.filter(f => {
      return f !== filter;
    });
  },

  'toggleFilter': function (filter) {

    const foundFilter = this.filters.filter(f => {
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