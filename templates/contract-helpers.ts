export interface Paths {}

/**
 * Lookup the request body or response body type for the POST method.
 * @example
 * type SuccessResponse = Post<"/animals/{animal-id}", "200">;
 * type RequestBody = Post<"/animals/{animal-id}">;
 */
export type Post<
  Path extends keyof Paths,
  StatusCode extends NoStatusCode | StatusCodes<Path, 'post'> = NoStatusCode
> = For<Path, 'post', StatusCode>;

/**
 * Lookup the request body or response body type for the GET method.
 * @example
 * type SuccessResponse = Get<"/animals/{animal-id}", "200">;
 * type RequestBody = Get<"/animals/{animal-id}">;
 */
export type Get<
  Path extends keyof Paths,
  StatusCode extends NoStatusCode | StatusCodes<Path, 'get'> = NoStatusCode
> = For<Path, 'get', StatusCode>;

/**
 * Lookup the request body or response body type for the DELETE method.
 * @example
 * type SuccessResponse = Delete<"/animals/{animal-id}", "200">;
 * type RequestBody = Delete<"/animals/{animal-id}">;
 */
export type Delete<
  Path extends keyof Paths,
  StatusCode extends NoStatusCode | StatusCodes<Path, 'delete'> = NoStatusCode
> = For<Path, 'delete', StatusCode>;

/**
 * Lookup the request body or response body type for the PUT method.
 * @example
 * type SuccessResponse = Put<"/animals/{animal-id}", "200">;
 * type RequestBody = Put<"/animals/{animal-id}">;
 */
export type Put<
  Path extends keyof Paths,
  StatusCode extends NoStatusCode | StatusCodes<Path, 'put'> = NoStatusCode
> = For<Path, 'put', StatusCode>;

/**
 * Lookup the request body or response body type for the PATCH method.
 * @example
 * type SuccessResponse = Patch<"/animals/{animal-id}", "200">;
 * type RequestBody = Patch<"/animals/{animal-id}">;
 */
export type Patch<
  Path extends keyof Paths,
  StatusCode extends NoStatusCode | StatusCodes<Path, 'patch'> = NoStatusCode
> = For<Path, 'patch', StatusCode>;

/**
 * Lookup the request body or response body type for the HEAD method.
 * @example
 * type SuccessResponse = Head<"/animals/{animal-id}", "200">;
 * type RequestBody = Head<"/animals/{animal-id}">;
 */
export type Head<
  Path extends keyof Paths,
  StatusCode extends NoStatusCode | StatusCodes<Path, 'head'> = NoStatusCode
> = For<Path, 'head', StatusCode>;

/**
 * Lookup the request body or response body type for the OPTIONS method.
 * @example
 * type SuccessResponse = Options<"/animals/{animal-id}", "200">;
 * type RequestBody = Options<"/animals/{animal-id}">;
 */
export type Options<
  Path extends keyof Paths,
  StatusCode extends NoStatusCode | StatusCodes<Path, 'options'> = NoStatusCode
> = For<Path, 'options', StatusCode>;

/**
 * Lookup the request body or response body type for the TRACE method.
 * @example
 * type SuccessResponse = Trace<"/animals/{animal-id}", "200">;
 * type RequestBody = Trace<"/animals/{animal-id}">;
 */
export type Trace<
  Path extends keyof Paths,
  StatusCode extends NoStatusCode | StatusCodes<Path, 'trace'> = NoStatusCode
> = For<Path, 'trace', StatusCode>;

/** Lookup the type of the request body for a path and method. */
export type RequestBody<Path extends string, Method extends string> = Elvis<
  Elvis<Elvis<Paths, Path>, Method>,
  'requestBody'
>;

/** Lookup the type of the responses object for a path and method. */
export type Responses<Path extends string, Method extends string> = Elvis<
  Elvis<Elvis<Paths, Path>, Method>,
  'responses'
>;

/** Get a union of possible response status codes for a path and method. */
export type StatusCodes<
  Path extends keyof Paths,
  Method extends string
> = keyof Responses<Path, Method>;

/** Indicate no status code. Provides clearer errors when when there are no
 * responses defined. */
type NoStatusCode = 'no-status-code';

type For<
  Path extends string,
  Method extends string,
  StatusCode extends string | number | symbol
> = StatusCode extends NoStatusCode
  ? RequestBody<Path, Method>
  : Elvis<Responses<Path, Method>, StatusCode>;

type Elvis<T, Key extends string | number | symbol> = T extends Record<
  Key,
  unknown
>
  ? T[Key]
  : never;
