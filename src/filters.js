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
  if (needle.constructor === String) {
    needle = needle.split(' ');
  }

  if (needle.filter((n) => haystack.includes(n)).length) {
    return true;
  } 

  return false;
}

//ported from DataTables
function SmartFilter (haystack, needle) {
  haystack = haystack.toLowerCase();
  var needles = needle.toLowerCase().split(',');
  for (var i in needles){
    var needle = needles[i].trim();
    if (needle.length) {
      //todo: this matches exact indexOf matches poorly, hence this early bailout
      if (haystack.indexOf(needle) !== -1) {
        return true;
      }

      const wordRegex = /"[^"]+"|[^ ]+/g;
      const words = needle.match(wordRegex).map(word => {
        return word.replace(/\"/g, '');
      });

      const smartRegexSource = '^(?=.*?' + words.join(')(?=.*?') + ').*$';
      const smartRegex = new RegExp(smartRegexSource, 'i');

      const match = haystack.match(smartRegex);
      if (match) {
        return true;
      }
    }
  }
  return false;
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
  'createFilter': function (type, fields, ...args) {
    fields = fields.split(' ');
    let fn = function () {
      return true;
    };

    if (filters[type]) {
      fn = function (data) {
        //todo: remove .raw
        return fields.some(field => filters[type](data[field].raw, ...args));
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