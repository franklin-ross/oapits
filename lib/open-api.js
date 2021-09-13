"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
/** Checks that an OpenAPI document is the correct version. */
const validate = (contracts) => /^3\.\d+\.\d+$/.test(contracts === null || contracts === void 0 ? void 0 : contracts.openapi);
exports.validate = validate;
