# @kawaz/provide-defer

`@kawaz/provide-defer` is a TypeScript utility package that provides a mechanism for deferring the execution of functions or Promises, similar to Go's `defer` statement. It allows you to schedule cleanup or finalization code to run after the main function has completed, regardless of whether it completes normally or throws an error.

## Features

- Defer execution of functions or Promises
- Execute deferred functions in reverse order (LIFO)
- Options for error handling and asynchronous execution
- Aggregates errors from main and deferred functions
- TypeScript support with generic typing

## Installation

```bash
npm install @kawaz/provide-defer
```

## Usage

Here's a basic example of how to use `provideDefer`:

```typescript
import { provideDefer } from '@kawaz/provide-defer';

const result = await provideDefer(async (defer) => {
  const resource = await acquireResource();
  defer(() => releaseResource(resource));

  // Use the resource...
  return someOperation(resource);
});
```

## API

### `provideDefer<T>(fn: (defer: DeferFunction) => T | Promise<T>): Promise<T>`

- `fn`: The main function to execute. It receives a `defer` function as an argument.
- Returns a Promise that resolves with the result of the main function.

### `DeferFunction`

```typescript
type DeferFunction = (fn: DeferredFunctionOrPromise, options?: DeferOptions) => void
```

- `fn`: The function or Promise to be deferred.
- `options`: Optional settings to control the behavior of the deferred function.

### `DeferOptions`

```typescript
type DeferOptions = {
  noThrow?: boolean;
  noWait?: boolean;
}
```

- `noThrow`: If true, errors from this deferred function will be ignored.
- `noWait`: If true, the deferred function will be executed immediately without waiting for its completion.

## Error Handling

If any errors occur in the deferred functions (and `noThrow` is not set), or if the main function throws an error, `provideDefer` will throw an `AggregateError` containing all the errors.

## Examples

### Basic Usage

```typescript
import { provideDefer } from '@kawaz/provide-defer';

const result = await provideDefer((defer) => {
  defer(() => console.log('This will be executed last'));
  defer(() => console.log('This will be executed second'));
  console.log('This will be executed first');
  return 'Main function result';
});

console.log(result); // Outputs: "Main function result"
```

### Error Handling

```typescript
import { provideDefer } from '@kawaz/provide-defer';

try {
  await provideDefer((defer) => {
    defer(() => { throw new Error('Deferred error'); });
    throw new Error('Main error');
  });
} catch (error) {
  if (error instanceof AggregateError) {
    console.log(error.message); // Outputs: "Main error and 1 deferred error(s)"
    console.log(error.errors); // Array of all errors
  }
}
```

### Using `noThrow` and `noWait` Options

```typescript
import { provideDefer } from '@kawaz/provide-defer';

await provideDefer((defer) => {
  defer(() => { throw new Error('This error will be ignored'); }, { noThrow: true });
  defer(() => new Promise(resolve => setTimeout(resolve, 1000)), { noWait: true });
  return 'Main function result';
});
```

## License

MIT

## Author

Yoshiaki Kawazu

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check [issues page](https://github.com/kawaz/provide-defer/issues).

## Support

If you like this project, please consider supporting it by giving a ⭐️ on GitHub!
