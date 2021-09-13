# Open API -> Typescript

Generate ergonomic Typescript definitions from OpenAPI contracts.

It's a work in progress, but is usable. It generates types for request/response bodies, headers, cookies, query/path params, with some type helpers for querying those types by path. It handles [JSON References](https://json-spec.readthedocs.io/reference.html) in the input document.

## Install

To install as a global tool, try one of:

```sh
npm i -g https://github.com/franklin-ross/oapits
```

```sh
npm i -g ssh://git@github.com/franklin-ross/oapits
```

Run the same command again to update.

## Usage

### Generate Type For An OpenAPI Document

```sh
oapits \
  -cu 'https://api.apis.guru/v2/specs/amazonaws.com/amp/2020-08-01/openapi.json' \
  -o ./aws.ts
```

Other options allow you to filter which paths generate types if you require a subset.

### As A Library

You can also install the code as a library and use it directly in your node projects.

```typescript

```

### Consuming The Result

The output file exports a `Paths` type, with nested types for each requested path in the OpenAPI document. Though you can traverse the `Paths` manually, it's often long winded to do so. A number of helper types are also provided, which are shorter and clearer for common cases.

```typescript
import { Paths, Post } from './types';

// Usage with helpers.
type RequestBody = Post<'/animals/{animal-id}'>;
type ResponseBody = Post<'/animals/{animal-id}', '200'>;

// Usage without helpers.
type CreateAnimal = Paths['/animals/{animal-id}']['post'];
let requestBody: CreateAnimal['requestBody'];
let responseBody: CreateAnimal['responses']['200'];
```

### Help

```sh
oapits --help
```

## Notes

- The code handles `$ref`, but doesn't try to be smart about it so potentially generates lots of duplication where the same `$ref` finds repeated use in a document.
- The result is CJS for backwards compatibility, but it would be good to build modules too; they happily coexist.
- I could expose more options for the internal libraries used. Some won't make sense, but many might be interesting.
- The CLI is bare bones and could probably do more for ergonomics.
- There are no tests right now, but I'm keen to add some.
- I've included the lib folder so users can install the tool directly from the Git repo. It'd be better to deploy that separately.
