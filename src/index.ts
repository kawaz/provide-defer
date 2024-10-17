// biome-ignore lint/suspicious/noExplicitAny: For maximum flexibility
export type SyncFunction<T> = (...args: any[]) => T
// biome-ignore lint/suspicious/noExplicitAny: For maximum flexibility
export type AsyncFunction<T> = (...args: any[]) => Promise<T>
export type SyncOrAsyncFunction<T> = SyncFunction<T> | AsyncFunction<T>
export type FunctionOrPromise<T> = SyncOrAsyncFunction<T> | AsyncFunction<T> | Promise<T>

/**
 * Options for controlling the behavior of deferred functions.
 */
export type DeferOptions = {
  /** If true, errors from this deferred function or promise will be ignored. */
  noThrow?: boolean
  /** If true, the result of this deferred function or promise will not be awaited. */
  noWait?: boolean
  /**
   * If true, the delayed function is guaranteed to run when the main function completes
   * or even if the process attempts to terminate before it does.
   * This ensures critical operations are performed regardless of how the process ends.
   *
   * @remarks
   * When using this option, it's strongly recommended to use only synchronous functions.
   * Asynchronous functions may not complete execution if the process exits abruptly.
   * Only the synchronous part of an async function (before the first `await`) is guaranteed to run.
   */
  alsoOnExit?: boolean
}

/**
 * A function for deferring the execution of another function or Promise.
 * @param fn The function or Promise to be deferred.
 * @param options Optional settings to control the behavior of the deferred function.
 */
export type DeferFunction = {
  (fn: FunctionOrPromise<unknown>, options?: DeferOptions): void
  (fn: SyncFunction<unknown>, options: DeferOptions & { alsoOnExit: true }): void
}

/**
 * Provides a mechanism for deferring the execution of functions or Promises, similar to Go's defer statement.
 *
 * @template T The return type of the provided function.
 * @param fn A function that takes a DeferFunction and returns a value or Promise.
 * @returns A Promise that resolves with the result of the provided function.
 * @throws {AggregateError} If any of the deferred functions without the noThrow option specified throw an error.
 *                          This error will also include any error thrown by the main function.
 * @example
 * const result = await provideDefer(async (defer) => {
 *   const resource = await acquireResource();
 *   defer(() => releaseResource(resource));
 *
 *   // Use the resource...
 *   return someOperation(resource);
 * });
 */
export const provideDefer = async <T>(fn: (defer: DeferFunction) => T | Promise<T>): Promise<T> => {
  type DeferredItem = {
    deferred: FunctionOrPromise<unknown>
    options?: DeferOptions
  }
  const deferreds: DeferredItem[] = []
  const defer = (d: FunctionOrPromise<unknown>, options?: DeferOptions) => {
    if (options?.alsoOnExit) {
      let called = false
      const cb = () => {
        if (called) {
          return
        }
        called = true
        process.removeListener('beforeExit', cb)
        process.removeListener('exit', cb)
        deferredToPromise(d)
      }
      process.on('exit', cb)
      process.on('beforeExit', cb)
      deferreds.push({ deferred: cb, options })
    } else {
      deferreds.push({ deferred: d, options })
    }
  }
  // メイン関数を実行して結果を保持する
  const mainResult: { value: T | null; error: unknown; hasError: boolean } = {
    value: null,
    error: null,
    hasError: false,
  }
  try {
    const runMain: SyncOrAsyncFunction<T> = async () => await fn(defer)

    mainResult.value = await executeFunctionToPromise<T>(runMain)
  } catch (err) {
    mainResult.error = err
    mainResult.hasError = true
  }
  // defer で渡された関数は逆順で実行する
  const errors: unknown[] = []
  for (const { deferred, options } of deferreds.reverse()) {
    const promise = options?.noThrow
      ? deferredToPromise(deferred).catch(() => {})
      : deferredToPromise(deferred)
    if (options?.noWait) {
      continue
    }
    try {
      await promise
    } catch (err) {
      if (!options?.noThrow) {
        errors.push(err)
      }
    }
  }
  // defer で渡された関数にエラーが含まれる場合は AggregateError を返す
  if (errors.length > 0) {
    if (mainResult.hasError) {
      const mainError = mainResult.error
      const mainErrorMessage = mainError instanceof Error ? mainError.message : String(mainError)
      throw new AggregateError(
        [mainError, ...errors],
        `${mainErrorMessage} and ${errors.length} deferred error(s).`,
      )
    }
    throw new AggregateError(errors, `${errors.length} deferred error(s).`)
  }
  // メイン関数の結果をそのまま返す
  if (mainResult.hasError) {
    throw mainResult.error
  }
  return mainResult.value as T
}

/**
 * Converts a deferred function or Promise to a Promise.
 * @param deferred The function or Promise to be converted.
 * @returns A Promise that resolves with the result of the deferred function or Promise.
 */
const deferredToPromise = (deferred: FunctionOrPromise<unknown>): Promise<unknown> => {
  if (typeof deferred === 'function') {
    return executeFunctionToPromise(deferred)
  }
  return deferred
}

/**
 * Executes a function and always returns a Promise, regardless of whether
 * the input function is synchronous or asynchronous.
 * @template T The type of the value that the function returns or the Promise resolves to.
 * @param fn The function to execute, which can be synchronous or asynchronous.
 * @returns A Promise that resolves with the return value of the function.
 */
const executeFunctionToPromise = async <T>(fn: SyncOrAsyncFunction<T>): Promise<T> => {
  return await fn()
}
