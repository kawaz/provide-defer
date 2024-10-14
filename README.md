# provide-defer

`provide-defer` is a TypeScript utility that enhances asynchronous functions with defer capability. It allows you to schedule operations to be performed after the main function completes, regardless of whether it resolves or rejects.

## Installation

You can install `provide-defer` using npm:

```bash
npm install @kawaz/provide-defer
```

Or using yarn:

```bash
yarn add @kawaz/provide-defer
```

## Usage

Here's a basic example of how to use `@kawaz/provide-defer`:

```typescript
import { provideDefer } from '@kawaz/provide-defer';

const enhancedFunc = provideDefer(async (defer) => {
  const result = await someAsyncOperation();

  // This will run after the main function completes
  defer(() => {
    console.log('Cleanup operation');
  });

  // The main function will wait for this Promise to resolve
  defer(someAsyncCleanupOperation());

  return result;
});

// Use the enhanced function
const result = await enhancedFunc();
```

## API

### `provideDefer<T>(func: (defer: DeferFunction) => Promise<T>): Promise<T>`

Enhances an asynchronous function with defer capability.

- `func`: The function to be enhanced. It receives a `defer` function as its parameter.
- Returns: A promise that resolves with the result of the original function.

### `DeferFunction`

A function used to schedule operations to be performed after the main function completes.

```typescript
type DeferFunction = (deferrable: Deferrable) => void;
```

- `deferrable`: The operation to be deferred. Can be a Promise or a function (sync or async).

```typescript
type Deferrable = Promise<unknown> | (() => unknown) | (() => Promise<unknown>)
```

#### Behavior

- When a Promise is passed:
  - The resolution of the main function will wait for this Promise to settle.
  - The main function resolves only after all deferred Promises have settled.

- When a function is passed:
  - The function will be executed after the main function completes.
  - If it's an async function, the main function will resolve after its Promise is settled.
  - If it's a sync function, it will be executed synchronously after the main function.

In both cases, any errors in deferred operations are caught and logged, but do not affect the main function's resolution.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

[Yoshiaki Kawazu](https://github.com/kawaz)
