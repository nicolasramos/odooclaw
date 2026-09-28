"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnexpectedStateError = void 0;
class UnexpectedStateError extends Error {
    constructor(message, code = 'UNEXPECTED_STATE_ERROR') {
        super(message);
        this.code = code;
    }
}
exports.UnexpectedStateError = UnexpectedStateError;
