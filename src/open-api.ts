import type { JSONSchema } from 'json-schema-to-typescript';

/** Hand written OpenAPI3 type. Would be nice to pull these in from somewhere,
 * but this is easy at this point. */
export interface OpenAPI3 {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: {
    [route: string]: undefined | Methods;
  };
  components?: {
    schemas: { [key: string]: undefined | JSONSchema };
  };
}

/** The HTTP methods supported by OpenAPI.
 * {@link https://swagger.io/docs/specification/paths-and-operations/|Documentation}
 */
export type SupportedMethods =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'head'
  | 'options'
  | 'trace';

export type Methods = Partial<Record<SupportedMethods, Operation>>;

export interface Operation {
  description?: string;
  parameters?: Array<Param>;
  requestBody?: Body & { required?: boolean };
  responses: {
    [httpStatusCode: string]: Body;
  };
}

export interface Body {
  description?: string;
  content?: MediaTypeObject;
}

export interface MediaTypeObject {
  [mediaType: string]:
    | undefined
    | {
        schema?: JSONSchema;
      };
}

export interface Param {
  in: 'path' | 'query' | 'header' | 'cookie';
  name: string;
  description?: string;
  required?: boolean;
  schema?: JSONSchema;
  content?: MediaTypeObject;
}

/** Checks that an OpenAPI document is the correct version. */
export const validate = (contracts: OpenAPI3): boolean =>
  /^3\.\d+\.\d+$/.test(contracts?.openapi);
