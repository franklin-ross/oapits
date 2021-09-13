"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openApiToJsonSchema = void 0;
function openApiToJsonSchema(contracts) {
    return objToJsonSchema(contracts === null || contracts === void 0 ? void 0 : contracts.paths, (methods, path) => objToJsonSchema(methods, (operation, method) => operationToJsonSchema(operation, method, path)));
}
exports.openApiToJsonSchema = openApiToJsonSchema;
/**
 * Converts an OpenAPI3 @see Operation object into a @see JSONSchema defining
 * the type to be generated for a particular route, including request and
 * response bodies, etc.
 * @param operation The OpenAPI3 @see Operation object to convert.
 * @param method The HTTP method of the operation object. EG get, put, post,
 * etc.
 * @param path The path/route of the operation.
 * @returns The @see JSONSchema object describing the input, or `undefined` if
 * the input is falsy.
 */
function operationToJsonSchema(operation, method, path) {
    var _a, _b, _c, _d;
    if (!operation)
        return undefined;
    const autoSummary = `${method === null || method === void 0 ? void 0 : method.toUpperCase()} ${path}`;
    const pathSchema = {
        requestBody: bodyToJsonSchema(operation.requestBody, `Request body for ${autoSummary}`),
        headers: paramsToJsonSchema((_a = operation.parameters) === null || _a === void 0 ? void 0 : _a.filter((qp) => qp.in === 'header'), {
            description: `Headers for ${autoSummary}`,
            additionalProperties: true,
        }),
        queryParams: paramsToJsonSchema((_b = operation.parameters) === null || _b === void 0 ? void 0 : _b.filter((qp) => qp.in === 'query'), { description: `Query params for ${autoSummary}` }),
        pathParams: paramsToJsonSchema((_c = operation.parameters) === null || _c === void 0 ? void 0 : _c.filter((qp) => qp.in === 'path'), { description: `Path params for ${autoSummary}` }),
        cookies: paramsToJsonSchema((_d = operation.parameters) === null || _d === void 0 ? void 0 : _d.filter((qp) => qp.in === 'cookie'), { description: `Cookies for ${autoSummary}` }),
        responses: objToJsonSchema(operation.responses, `Response(s) for ${autoSummary}`, (child, statusCode) => {
            return bodyToJsonSchema(child, `${statusCode} response for ${autoSummary}`);
        }),
    };
    return objToJsonSchema(pathSchema, operation.description || autoSummary);
}
/**
 * Gets the schema for an OpenAPI3 @see Body object, for the `application/json`
 * media type, or `undefined`. Propagates descriptions from higher in the schema
 * when no more specific description is found.
 * @param body The OpenAPI3 @see Body object to convert.
 * @param description The description to use if the schema doesn't provide one
 * of it's own.
 * @returns The @see JSONSchema object describing the input, or `undefined` if
 * the input is falsy or has no schema for the `application/json` media type.
 */
function bodyToJsonSchema(body, description = body === null || body === void 0 ? void 0 : body.description) {
    var _a, _b, _c, _d;
    const schema = (_b = (_a = body === null || body === void 0 ? void 0 : body.content) === null || _a === void 0 ? void 0 : _a['application/json']) === null || _b === void 0 ? void 0 : _b.schema;
    if (!schema)
        return;
    return {
        ...schema,
        description: (_d = (_c = schema === null || schema === void 0 ? void 0 : schema.description) !== null && _c !== void 0 ? _c : body === null || body === void 0 ? void 0 : body.description) !== null && _d !== void 0 ? _d : description,
    };
}
function objToJsonSchema(obj, description, transformer) {
    if (!obj)
        return undefined;
    if (typeof description === 'function') {
        transformer = description;
        description = undefined;
    }
    if (!transformer)
        transformer = (x) => x;
    return Object.entries(obj).reduce((schema, [key, value]) => {
        const child = transformer(value, key);
        if (child) {
            schema.required.push(key);
            schema.properties[key] = child;
        }
        return schema;
    }, {
        type: 'object',
        description,
        properties: {},
        required: [],
        additionalProperties: false,
    });
}
/**
 * Converts a list of OpenAPI Parameter objects into a @see JSONSchema .
 * @param params The OpenAPI paramater objects. These may be headers, query
 * params, path params, or cookies so the should be filtered to your required
 * set accordingly.
 * @param schemaBaseData Optional configuration data for the resulting
 * JSONSchema object.
 * @returns The @see JSONSchema object describing the input, or undefined if
 * there are no params in the input.
 */
function paramsToJsonSchema(params, schemaBaseData) {
    var _a;
    if (!params || params.length === 0)
        return;
    return params.reduce((schema, param) => {
        var _a, _b, _c;
        const key = param.name;
        if (param.required) {
            schema.required.push(key);
        }
        const paramSchema = (_a = param.schema) !== null && _a !== void 0 ? _a : (_c = (_b = param === null || param === void 0 ? void 0 : param.content) === null || _b === void 0 ? void 0 : _b['application/json']) === null || _c === void 0 ? void 0 : _c.schema;
        if (paramSchema) {
            const props = schema.properties;
            props[key] = paramSchema;
        }
        return schema;
    }, {
        type: 'object',
        description: schemaBaseData === null || schemaBaseData === void 0 ? void 0 : schemaBaseData.description,
        properties: {},
        required: [],
        additionalProperties: (_a = schemaBaseData === null || schemaBaseData === void 0 ? void 0 : schemaBaseData.additionalProperties) !== null && _a !== void 0 ? _a : false,
    });
}
