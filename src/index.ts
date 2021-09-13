import { compile, JSONSchema } from 'json-schema-to-typescript';
import $RefParser from '@apidevtools/json-schema-ref-parser';

import { dirname, join } from 'path';
import {
  createWriteStream,
  mkdir as mkdirCb,
  readFile as readFileCb,
} from 'fs';
import { promisify } from 'util';

import { openApiToJsonSchema } from './open-api-to-json-schema';
import type { OpenAPI3 } from './open-api';

const readFile = promisify(readFileCb);
const mkdir = promisify(mkdirCb);

/** A function for filtering OpenAPI path definitions. */
export type FilterPath = (
  path: string,
  pathData: OpenAPI3['paths']['method']
) => boolean;

class TypeGenerator {
  constructor(protected readonly contracts: OpenAPI3) {}

  /**
   * Prunes the output of the generator by selecting paths to include. Any
   * `$ref`s in the contract document will be dereferenced into raw JSON at this
   * point, so the contracts are safe to traverse.
   * @param keepPaths List of filters specifying which paths to keep. Each entry
   * may be a string for an exact path match, a regular expression, or a
   * function.
   * @returns A new generator object with the changes.
   */
  includePaths(
    keepPaths: FilterPath | ReadonlyArray<string | RegExp>
  ): TypeGenerator {
    if (!keepPaths || keepPaths.length === 0) return this;

    const paths = this.contracts.paths;

    const keepPath: FilterPath =
      typeof keepPaths === 'function'
        ? keepPaths
        : (key) => {
            for (const filter of keepPaths) {
              if (filter === key) {
                return true;
              } else if (filter instanceof RegExp && filter.test(key)) {
                return true;
              }
            }
            return false;
          };

    return new TypeGenerator({
      ...this.contracts,
      paths: Object.keys(paths)
        .filter((key) => keepPath(key, paths[key]))
        .reduce<Partial<OpenAPI3['paths']>>((result, key) => {
          result[key] = paths[key];
          return result;
        }, {}),
    });
  }

  /** Compiles the filtered contract into Typescript. */
  async compile(): Promise<CompiledTypeGenerator> {
    if (this instanceof CompiledTypeGenerator) return this;

    const jsonSchema = openApiToJsonSchema(this.contracts);
    const compiled = await compile(jsonSchema, 'Paths', {
      // Reduces the size of the output by generating unbounded array types
      // rather than tuples when min/max number of items are defined in the
      // contracts.
      ignoreMinAndMaxItems: true,
    }).then(appendHelpers);

    return new CompiledTypeGenerator(this.contracts, jsonSchema, compiled);
  }
}

class CompiledTypeGenerator extends TypeGenerator {
  constructor(
    contracts: OpenAPI3,
    protected readonly jsonSchema: JSONSchema,
    protected readonly compiled: string
  ) {
    super(contracts);
  }

  /** Write the generated JSONSchema to an output file, overwriting whatever is
   * already there. */
  writeJsonSchemaTo(
    outputFile: string,
    space?: Parameters<typeof JSON.stringify>[2]
  ): Promise<void>;
  /** Write the generated JSONSchema to an output stream. */
  writeJsonSchemaTo(
    outputStream: NodeJS.WritableStream,
    space?: Parameters<typeof JSON.stringify>[2]
  ): Promise<void>;

  writeJsonSchemaTo(
    output: string | NodeJS.WritableStream,
    space: Parameters<typeof JSON.stringify>[2] = 2
  ): Promise<void> {
    return writeTextTo(
      JSON.stringify(this.jsonSchema, undefined, space),
      output
    );
  }

  /** Write the compiled Typescript to an output file, overwriting whatever is
   * already there. */
  writeTo(outputFile: string): Promise<void>;
  /** Write the compiled Typescript to an output stream. */
  writeTo(outputStream: NodeJS.WritableStream): Promise<void>;

  writeTo(output: string | NodeJS.WritableStream): Promise<void> {
    return writeTextTo(this.compiled, output);
  }
}

async function appendHelpers(source: undefined): Promise<undefined>;
/** Appends the contract type helpers to the end of the generated source. */
async function appendHelpers(source: string): Promise<string>;
async function appendHelpers(
  source: undefined | string
): Promise<undefined | string> {
  if (!source) return undefined;

  const helpers = await readFile(
    join(__dirname, '../templates/contract-helpers.ts')
  );

  return source + '\n\n' + helpers;
}

/** Writes text to a file or stream. */
async function writeTextTo(
  text: string | Buffer,
  output: string | NodeJS.WritableStream
): Promise<void> {
  if (typeof output === 'string') {
    await mkdir(dirname(output), { recursive: true });
    const outStream = createWriteStream(output, 'utf-8');
    try {
      return await writeTextTo(text, outStream);
    } finally {
      outStream.close();
    }
  }

  return new Promise<void>(async (resolve, reject) => {
    output.write(text, (err: unknown) => (err ? reject(err) : resolve()));
  });
}

/** Build a Typescript generator for an @see OpenAPI3 document. */
export default async (openApiDocument: OpenAPI3) => {
  // Dereference any `$ref` values early so the rest can safely work with raw
  // JS objects. This can load local or remote files.
  const flatContracts = await $RefParser.dereference(openApiDocument);
  return new TypeGenerator(flatContracts as OpenAPI3);
};
