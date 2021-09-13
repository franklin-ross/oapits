"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const json_schema_to_typescript_1 = require("json-schema-to-typescript");
const json_schema_ref_parser_1 = (0, tslib_1.__importDefault)(require("@apidevtools/json-schema-ref-parser"));
const path_1 = require("path");
const fs_1 = require("fs");
const util_1 = require("util");
const open_api_to_json_schema_1 = require("./open-api-to-json-schema");
const readFile = (0, util_1.promisify)(fs_1.readFile);
const mkdir = (0, util_1.promisify)(fs_1.mkdir);
class TypeGenerator {
    constructor(contracts) {
        this.contracts = contracts;
    }
    /**
     * Prunes the output of the generator by selecting paths to include. Any
     * `$ref`s in the contract document will be dereferenced into raw JSON at this
     * point, so the contracts are safe to traverse.
     * @param keepPaths List of filters specifying which paths to keep. Each entry
     * may be a string for an exact path match, a regular expression, or a
     * function.
     * @returns A new generator object with the changes.
     */
    includePaths(keepPaths) {
        if (!keepPaths || keepPaths.length === 0)
            return this;
        const paths = this.contracts.paths;
        const keepPath = typeof keepPaths === 'function'
            ? keepPaths
            : (key) => {
                for (const filter of keepPaths) {
                    if (filter === key) {
                        return true;
                    }
                    else if (filter instanceof RegExp && filter.test(key)) {
                        return true;
                    }
                }
                return false;
            };
        return new TypeGenerator({
            ...this.contracts,
            paths: Object.keys(paths)
                .filter((key) => keepPath(key, paths[key]))
                .reduce((result, key) => {
                result[key] = paths[key];
                return result;
            }, {}),
        });
    }
    /** Compiles the filtered contract into Typescript. */
    async compile() {
        if (this instanceof CompiledTypeGenerator)
            return this;
        const jsonSchema = (0, open_api_to_json_schema_1.openApiToJsonSchema)(this.contracts);
        const compiled = await (0, json_schema_to_typescript_1.compile)(jsonSchema, 'Paths', {
            // Reduces the size of the output by generating unbounded array types
            // rather than tuples when min/max number of items are defined in the
            // contracts.
            ignoreMinAndMaxItems: true,
        }).then(appendHelpers);
        return new CompiledTypeGenerator(this.contracts, jsonSchema, compiled);
    }
}
class CompiledTypeGenerator extends TypeGenerator {
    constructor(contracts, jsonSchema, compiled) {
        super(contracts);
        this.jsonSchema = jsonSchema;
        this.compiled = compiled;
    }
    writeJsonSchemaTo(output, space = 2) {
        return writeTextTo(JSON.stringify(this.jsonSchema, undefined, space), output);
    }
    writeTo(output) {
        return writeTextTo(this.compiled, output);
    }
}
async function appendHelpers(source) {
    if (!source)
        return undefined;
    const helpers = await readFile((0, path_1.join)(__dirname, '../templates/contract-helpers.ts'));
    return source + '\n\n' + helpers;
}
/** Writes text to a file or stream. */
async function writeTextTo(text, output) {
    if (typeof output === 'string') {
        await mkdir((0, path_1.dirname)(output), { recursive: true });
        const outStream = (0, fs_1.createWriteStream)(output, 'utf-8');
        try {
            return await writeTextTo(text, outStream);
        }
        finally {
            outStream.close();
        }
    }
    return new Promise(async (resolve, reject) => {
        output.write(text, (err) => (err ? reject(err) : resolve()));
    });
}
/** Build a Typescript generator for an @see OpenAPI3 document. */
exports.default = async (openApiDocument) => {
    // Dereference any `$ref` values early so the rest can safely work with raw
    // JS objects. This can load local or remote files.
    const flatContracts = await json_schema_ref_parser_1.default.dereference(openApiDocument);
    return new TypeGenerator(flatContracts);
};
