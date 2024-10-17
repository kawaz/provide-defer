# @kawaz/provide-defer

`@kawaz/provide-defer` is a TypeScript utility package that provides a mechanism for deferring the execution of functions or Promises, similar to Go's `defer` statement. It allows you to schedule cleanup or finalization code to run after the main function has completed, regardless of whether it completes normally or throws an error.

## Features

- Defer execution of functions or Promises
- Execute deferred functions in reverse order (LIFO)
- Options for error handling and asynchronous execution
- Aggregates errors from main and deferred functions
- TypeScript support with generic typing
- Support for critical cleanup operations with `alsoOnExit` option

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
type DeferFunction = {
  (fn: FunctionOrPromise<unknown>, options?: DeferOptions): void
  (fn: SyncFunction<unknown>, options: DeferOptions & { alsoOnExit: true }): void
}
```

- `fn`: The function or Promise to be deferred.
- `options`: Optional settings to control the behavior of the deferred function.

### `DeferOptions`

```typescript
type DeferOptions = {
  noThrow?: boolean;
  noWait?: boolean;
  alsoOnExit?: boolean;
}
```

- `noThrow`: If true, errors from this deferred function will be ignored.
- `noWait`: If true, the execution of the deferred function will start as scheduled, but provideDefer will not wait for its completion before resolving. This allows the deferred function to run in the background.
- `alsoOnExit`: If true, the deferred function is guaranteed to run even if the process exits abruptly. Only synchronous functions are fully supported with this option.

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

  defer(async () => {
    console.log('Start of long-running operation');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('End of long-running operation');
  }, { noWait: true });

  console.log('Main function continues immediately');
  return 'Main function result';
});

console.log('provideDefer resolved');

// Output:
// Start of long-running operation
// Main function continues immediately
// provideDefer resolved
// End of long-running operation (after about 5 seconds)
```

### Using `alsoOnExit` Option

```typescript
import { provideDefer } from '@kawaz/provide-defer';

await provideDefer((defer) => {
  defer(() => console.log('This will be executed on normal exit or abrupt process termination'), { alsoOnExit: true });
  // Note: Only synchronous functions are guaranteed to complete when used with alsoOnExit
  return 'Main function result';
});
```

## Important Notes

- When using the `alsoOnExit` option, it's strongly recommended to use only synchronous functions. Asynchronous functions may not complete execution if the process exits abruptly.
- The `alsoOnExit` option ensures that the deferred function runs even in cases of abrupt process termination, making it suitable for critical cleanup operations.

## License

MIT

## Author

Yoshiaki Kawazu

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check [issues page](https://github.com/kawaz/provide-defer/issues).

## Support

If you like this project, please consider supporting it by giving a ⭐️ on GitHub!
