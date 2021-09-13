import { program } from 'commander';
import {
  createWriteStream,
  mkdir as mkdirCb,
  readFile as readFileCb,
} from 'fs';
import { promisify } from 'util';
import { dirname } from 'path';
import { stdout } from 'process';
import { parse as parseUrl, fileURLToPath } from 'url';
import generate from '.';
import fetch from 'node-fetch';
import { OpenAPI3, validate as validateContracts } from './open-api';

const mkdir = promisify(mkdirCb);
const readFile = promisify(readFileCb);

const options = program
  .description('Generate Typescript definitions from OpenAPI contracts.')
  .option(
    '-o, --output [definitionFile]',
    'file to write the output, or stdout by default'
  )
  .option(
    '-cf, --contracts-file [contractsFile]',
    'path of the OpenAPI schema document, or stdin by default'
  )
  .option(
    '-cu, --contracts-url [contractsUrl]',
    'url of the OpenAPI schema document, or stdin by default'
  )
  .option(
    '-pf, --paths-file [pathsFile]',
    'limit which paths to generate based on a JSON file containing an array of strings',
    undefined
  )
  .option(
    '-p, --paths [includePaths...]',
    'limit which paths to generate with CLI arguments',
    undefined
  )
  .parse(process.argv)
  .opts();

/** Gets/opens a writable stream to receive the output. */
const getOutputStream = async (
  output?: string
): Promise<NodeJS.WritableStream> => {
  if (output) {
    await mkdir(dirname(output), { recursive: true });
    return createWriteStream(output, 'utf-8');
  }
  return stdout;
};

/** Load the OpenAPI Contract document from file or a URL. */
const getContracts = async (
  contractsFile?: string,
  contractsUrl?: string
): Promise<OpenAPI3> => {
  if (contractsFile && contractsUrl) {
    throw new Error(
      '--contracts-file and --contracts-url are mutually exclusive'
    );
  }

  if (contractsUrl) {
    const uri = parseUrl(contractsUrl);
    if (uri.protocol?.toLowerCase() === 'file:') {
      contractsFile = fileURLToPath(contractsUrl);
    } else {
      const response = await fetch(contractsUrl, { compress: true });
      if (response.ok) {
        const contractSource = await response.text();
        return JSON.parse(contractSource);
      }

      throw new Error(
        `Error downloading contracts: ${response.status} (${response.statusText})`
      );
    }
  }

  if (contractsFile) {
    const contractSource = await readFile(contractsFile, 'utf-8');
    return JSON.parse(contractSource);
  }

  throw new Error(
    'Either --contracts-file or --contracts-url is required. Piping contracts via stdin is not yet supported.'
  );
};

/** Load the API paths/routes to include in the output. */
const getIncludePaths = async (
  paths: ReadonlyArray<string>,
  pathsFile?: string
): Promise<string[]> => {
  const includePaths: string[] = [];

  if (paths) {
    includePaths.push(...paths);
  }

  if (pathsFile) {
    const text = await readFile(pathsFile, 'utf-8');
    const loadedPaths = JSON.parse(text);
    if (
      !Array.isArray(loadedPaths) ||
      !loadedPaths.every((p) => typeof p === 'string')
    ) {
      throw Error(
        `Expected JSON file with array of strings at root: ${pathsFile}`
      );
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
    if (!validateContracts(contracts)) {
      throw new Error(
        'Supports OpenAPI 3.x.x documents but found ' + contracts?.openapi
      );
    }
    const generator = await generate(contracts);
    const compiled = await generator.includePaths(includePaths).compile();

    // await compiled.writeJsonSchemaTo('./json-schema-output.json');

    await compiled.writeTo(output);
  })
  .catch(console.error);
