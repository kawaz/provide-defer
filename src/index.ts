/**
 * Represents a function that can be either synchronous or asynchronous,
 * returning a value of type T or a Promise of T.
 */
export type SyncOrAsyncFunction<T> = (...args: unknown[]) => T | Promise<T>

/**
 * Represents either a synchronous/asynchronous function or a Promise.
 */
export type DeferredFunctionOrPromise = SyncOrAsyncFunction<unknown> | Promise<unknown>

/**
 * Options for controlling the behavior of deferred functions.
 */
export type DeferOptions = {
  /** If true, errors from this deferred function or promise will be ignored. */
  noThrow?: boolean
  /** If true, the result of this deferred function or promise will not be awaited. */
  noWait?: boolean
}

/**
 * A function for deferring the execution of another function or Promise.
 * @param fn The function or Promise to be deferred.
 * @param options Optional settings to control the behavior of the deferred function.
 */
export type DeferFunction = (fn: DeferredFunctionOrPromise, options?: DeferOptions) => void

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
    deferred: DeferredFunctionOrPromise
    options?: DeferOptions
  }
  const deferreds: DeferredItem[] = []
  const defer = (d: DeferredFunctionOrPromise, options?: DeferOptions) => {
    deferreds.push({ deferred: d, options })
  }
  const mainResult: { value: T | null; error: unknown; hasError: boolean } = {
    value: null,
    error: undefined,
    hasError: false,
  }
  try {
    mainResult.value = await executeFunctionToPromise(() => fn(defer))
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
  if (mainResult.hasError) {
    throw mainResult.error
  }
  return mainResult.value as T
}

/**
 * Converts a DeferredFunctionOrPromise to a Promise.
 *
 * @param deferred The function or Promise to be converted.
 * @returns A Promise that resolves with the result of the deferred function or Promise.
 */
const deferredToPromise = (deferred: DeferredFunctionOrPromise): Promise<unknown> => {
  if (typeof deferred === 'function') {
    return executeFunctionToPromise(deferred)
  }
  return deferred
}

/**
 * Executes a function and always returns a Promise, regardless of whether
 * the input function is synchronous or asynchronous.
 *
 * @template T The type of the value that the function returns (or resolves to).
 * @param fn The function to execute, which can be synchronous or asynchronous.
 * @returns A Promise that resolves with the return value of the function,
 *          or rejects if the function throws an error.
 */
const executeFunctionToPromise = <T>(fn: SyncOrAsyncFunction<T>): Promise<T> => {
  try {
    return Promise.resolve(fn())
  } catch (err) {
    return Promise.reject(err)
  }
}
