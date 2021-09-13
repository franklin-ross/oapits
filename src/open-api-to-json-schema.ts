import { JSONSchema } from 'json-schema-to-typescript';
import { Body, OpenAPI3, Operation } from './open-api';
/**
 * Converts an @see OpenAPI3 document into a @see JSONSchema defining the shape
 * of the interface to generate.
 * @param contracts The OpenAPI3 document to convert.
 */
export function openApiToJsonSchema(contracts: OpenAPI3): JSONSchema;

export function openApiToJsonSchema(
  contracts: OpenAPI3 | undefined
): JSONSchema | undefined {
  return objToJsonSchema(contracts?.paths, (methods, path) =>
    objToJsonSchema(methods, (operation, method) =>
      operationToJsonSchema(operation, method, path)
    )
  );
}

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
function operationToJsonSchema(
  operation: Operation | undefined,
  method: string | undefined,
  path: string | undefined
): JSONSchema | undefined {
  if (!operation) return undefined;

  const autoSummary = `${method?.toUpperCase()} ${path}`;
  const pathSchema = {
    requestBody: bodyToJsonSchema(
      operation.requestBody,
      `Request body for ${autoSummary}`
    ),
    headers: paramsToJsonSchema(
      operation.parameters?.filter((qp) => qp.in === 'header'),
      {
        description: `Headers for ${autoSummary}`,
        additionalProperties: true,
      }
    ),
    queryParams: paramsToJsonSchema(
      operation.parameters?.filter((qp) => qp.in === 'query'),
      { description: `Query params for ${autoSummary}` }
    ),
    pathParams: paramsToJsonSchema(
      operation.parameters?.filter((qp) => qp.in === 'path'),
      { description: `Path params for ${autoSummary}` }
    ),
    cookies: paramsToJsonSchema(
      operation.parameters?.filter((qp) => qp.in === 'cookie'),
      { description: `Cookies for ${autoSummary}` }
    ),
    responses: objToJsonSchema(
      operation.responses,
      `Response(s) for ${autoSummary}`,
      (child, statusCode) => {
        return bodyToJsonSchema(
          child,
          `${statusCode} response for ${autoSummary}`
        );
      }
    ),
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
function bodyToJsonSchema(
  body: Body | undefined,
  description: string | undefined = body?.description
): JSONSchema | undefined {
  const schema = body?.content?.['application/json']?.schema;
  if (!schema) return;
  return {
    ...schema,
    description: schema?.description ?? body?.description ?? description,
  };
}

type TransformChildToJsonSchema<TChild> = (
  ch: TChild,
  key?: string
) => JSONSchema | undefined;

/**
 * Convert a plain old JS object to a @see JSONSchema definition.
 * @param obj The object to convert.
 * @param transformer Optional conversion function to apply to each field value.
 * @returns The @see JSONSchema object describing the input, or `undefined` if
 * the input is falsy.
 */
function objToJsonSchema<TChild>(
  obj: Record<string, TChild> | undefined,
  transformer?: TransformChildToJsonSchema<TChild>
): undefined | JSONSchema;

/**
 * Convert a plain old JS object to a @see JSONSchema definition.
 * @param obj The object to convert.
 * @param description The description for the resulting @see JSONSchema.
 * @param transformer Optional conversion function to apply to each field value.
 * @returns The @see JSONSchema object describing the input, or `undefined` if
 * the input is falsy.
 */
function objToJsonSchema<TChild>(
  obj: Record<string, TChild> | undefined,
  description: string,
  transformer?: TransformChildToJsonSchema<TChild>
): undefined | JSONSchema;

function objToJsonSchema<TChild>(
  obj: Record<string, TChild> | undefined,
  description?: string | TransformChildToJsonSchema<TChild>,
  transformer?: TransformChildToJsonSchema<TChild>
): undefined | JSONSchema {
  if (!obj) return undefined;

  if (typeof description === 'function') {
    transformer = description;
    description = undefined;
  }

  if (!transformer) transformer = (x) => x;

  return Object.entries(obj).reduce<JSONSchema>(
    (schema, [key, value]) => {
      const child = transformer!(value, key);
      if (child) {
        (schema.required as string[]).push(key);
        (schema.properties as Record<string, JSONSchema>)[key] = child;
      }
      return schema;
    },
    {
      type: 'object',
      description,
      properties: {},
      required: [],
      additionalProperties: false,
    }
  );
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
function paramsToJsonSchema(
  params: Operation['parameters'] | undefined,
  schemaBaseData?: Pick<JSONSchema, 'description' | 'additionalProperties'>
): undefined | JSONSchema {
  if (!params || params.length === 0) return;

  return params.reduce<JSONSchema>(
    (schema, param) => {
      const key = param.name;

      if (param.required) {
        (schema.required as string[]).push(key);
      }

      const paramSchema =
        param.schema ?? param?.content?.['application/json']?.schema;
      if (paramSchema) {
        const props = schema.properties as Record<string, JSONSchema>;
        props[key] = paramSchema;
      }
      return schema;
    },
    {
      type: 'object',
      description: schemaBaseData?.description,
      properties: {},
      required: [],
      additionalProperties: schemaBaseData?.additionalProperties ?? false,
    }
  );
}
