"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const commander_1 = require("commander");
const fs_1 = require("fs");
const util_1 = require("util");
const path_1 = require("path");
const process_1 = require("process");
const url_1 = require("url");
const _1 = (0, tslib_1.__importDefault)(require("."));
const node_fetch_1 = (0, tslib_1.__importDefault)(require("node-fetch"));
const open_api_1 = require("./open-api");
const mkdir = (0, util_1.promisify)(fs_1.mkdir);
const readFile = (0, util_1.promisify)(fs_1.readFile);
const options = commander_1.program
    .description('Generate Typescript definitions from OpenAPI contracts.')
    .option('-o, --output [definitionFile]', 'file to write the output, or stdout by default')
    .option('-cf, --contracts-file [contractsFile]', 'path of the OpenAPI schema document, or stdin by default')
    .option('-cu, --contracts-url [contractsUrl]', 'url of the OpenAPI schema document, or stdin by default')
    .option('-pf, --paths-file [pathsFile]', 'limit which paths to generate based on a JSON file containing an array of strings', undefined)
    .option('-p, --paths [includePaths...]', 'limit which paths to generate with CLI arguments', undefined)
    .parse(process.argv)
    .opts();
/** Gets/opens a writable stream to receive the output. */
const getOutputStream = async (output) => {
    if (output) {
        await mkdir((0, path_1.dirname)(output), { recursive: true });
        return (0, fs_1.createWriteStream)(output, 'utf-8');
    }
    return process_1.stdout;
};
/** Load the OpenAPI Contract document from file or a URL. */
const getContracts = async (contractsFile, contractsUrl) => {
    var _a;
    if (contractsFile && contractsUrl) {
        throw new Error('--contracts-file and --contracts-url are mutually exclusive');
    }
    if (contractsUrl) {
        const uri = (0, url_1.parse)(contractsUrl);
        if (((_a = uri.protocol) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'file:') {
            contractsFile = (0, url_1.fileURLToPath)(contractsUrl);
        }
        else {
            const response = await (0, node_fetch_1.default)(contractsUrl, { compress: true });
            if (response.ok) {
                const contractSource = await response.text();
                return JSON.parse(contractSource);
            }
            throw new Error(`Error downloading contracts: ${response.status} (${response.statusText})`);
        }
    }
    if (contractsFile) {
        const contractSource = await readFile(contractsFile, 'utf-8');
        return JSON.parse(contractSource);
    }
    throw new Error('Either --contracts-file or --contracts-url is required. Piping contracts via stdin is not yet supported.');
};
/** Load the API paths/routes to include in the output. */
const getIncludePaths = async (paths, pathsFile) => {
    const includePaths = [];
    if (paths) {
        includePaths.push(...paths);
    }
    if (pathsFile) {
        const text = await readFile(pathsFile, 'utf-8');
        const loadedPaths = JSON.parse(text);
        if (!Array.isArray(loadedPaths) ||
            !loadedPaths.every((p) => typeof p === 'string')) {
            throw Error(`Expected JSON file with array of strings at root: ${pathsFile}`);
        }
        includePaths.push(...loadedPaths);
    }
    return includePaths;
};
Promise.all([
    getContracts(options.contractsFile, options.contractsUrl),
    getIncludePaths(options.paths, options.pathsFile),
    getOutputStream(options.output),
])
    .then(async ([contracts, includePaths, output]) => {
    if (!(0, open_api_1.validate)(contracts)) {
        throw new Error('Supports OpenAPI 3.x.x documents but found ' + (contracts === null || contracts === void 0 ? void 0 : contracts.openapi));
    }
    const generator = await (0, _1.default)(contracts);
    const compiled = await generator.includePaths(includePaths).compile();
    // await compiled.writeJsonSchemaTo('./json-schema-output.json');
    await compiled.writeTo(output);
})
    .catch(console.error);
