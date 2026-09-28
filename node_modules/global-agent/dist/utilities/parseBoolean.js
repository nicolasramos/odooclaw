"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBoolean = void 0;
const parseBoolean = function (value) {
    switch (Object.prototype.toString.call(value)) {
        case '[object String]':
            return ['true', 't', 'yes', 'y', 'on', '1'].includes(value.trim().toLowerCase());
        case '[object Number]':
            return value.valueOf() === 1;
        case '[object Boolean]':
            return value.valueOf();
        default:
            return false;
    }
};
exports.parseBoolean = parseBoolean;
