import { JSONSchema } from 'json-schema-to-typescript';
import { OpenAPI3 } from './open-api';
/**
 * Converts an @see OpenAPI3 document into a @see JSONSchema defining the shape
 * of the interface to generate.
 * @param contracts The OpenAPI3 document to convert.
 */
export declare function openApiToJsonSchema(contracts: OpenAPI3): JSONSchema;
