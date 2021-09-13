/// <reference types="node" />
import { JSONSchema } from 'json-schema-to-typescript';
import type { OpenAPI3 } from './open-api';
/** A function for filtering OpenAPI path definitions. */
export declare type FilterPath = (path: string, pathData: OpenAPI3['paths']['method']) => boolean;
declare class TypeGenerator {
    protected readonly contracts: OpenAPI3;
    constructor(contracts: OpenAPI3);
    /**
     * Prunes the output of the generator by selecting paths to include. Any
     * `$ref`s in the contract document will be dereferenced into raw JSON at this
     * point, so the contracts are safe to traverse.
     * @param keepPaths List of filters specifying which paths to keep. Each entry
     * may be a string for an exact path match, a regular expression, or a
     * function.
     * @returns A new generator object with the changes.
     */
    includePaths(keepPaths: FilterPath | ReadonlyArray<string | RegExp>): TypeGenerator;
    /** Compiles the filtered contract into Typescript. */
    compile(): Promise<CompiledTypeGenerator>;
}
declare class CompiledTypeGenerator extends TypeGenerator {
    protected readonly jsonSchema: JSONSchema;
    protected readonly compiled: string;
    constructor(contracts: OpenAPI3, jsonSchema: JSONSchema, compiled: string);
    /** Write the generated JSONSchema to an output file, overwriting whatever is
     * already there. */
    writeJsonSchemaTo(outputFile: string, space?: Parameters<typeof JSON.stringify>[2]): Promise<void>;
    /** Write the generated JSONSchema to an output stream. */
    writeJsonSchemaTo(outputStream: NodeJS.WritableStream, space?: Parameters<typeof JSON.stringify>[2]): Promise<void>;
    /** Write the compiled Typescript to an output file, overwriting whatever is
     * already there. */
    writeTo(outputFile: string): Promise<void>;
    /** Write the compiled Typescript to an output stream. */
    writeTo(outputStream: NodeJS.WritableStream): Promise<void>;
}
declare const _default: (openApiDocument: OpenAPI3) => Promise<TypeGenerator>;
/** Build a Typescript generator for an @see OpenAPI3 document. */
export default _default;
