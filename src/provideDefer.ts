import type { Deferrable, DeferrableFunction, ProvideDeferFunction } from './types'

/**
 * Enhances an asynchronous function with defer capability.
 * This allows for scheduling operations to be performed after the main function completes,
 * regardless of whether it resolves or rejects.
 *
 * @template T
 * @param {DeferrableFunction<T>} func
 *        The async function to be enhanced. It receives a `defer` function as its parameter.
 * @returns {Promise<T>} A promise that resolves with the result of the original function.
 *
 * @example
 * const enhancedFunc = provideDefer(async (defer) => {
 *   const result = await someAsyncOperation();
 *
 *   // This will run after the main function completes
 *   defer(() => {
 *     console.log('Cleanup operation');
 *   });
 *
 *   // The main function will wait for this Promise to resolve
 *   defer(someAsyncCleanupOperation());
 *
 *   return result;
 * });
 *
 * @remarks
 * The `defer` function accepts either a Promise or a function (sync or async).
 * - When a Promise is passed, the main function's resolution will wait for this Promise to settle.
 * - When a function is passed, it will be executed after the main function completes.
 *
 * @throws {Error} If the deferred operations throw an error, it will be logged but not propagated.
 * @see DeferFunction for more details on the behavior of deferred operations.
 */
export const provideDefer: ProvideDeferFunction = async <T>(func: DeferrableFunction<T>) => {
  const deferrables: Deferrable[] = []
  const defer = (deferrable: Deferrable) => {
    deferrables.push(deferrable)
  }
  try {
    return func(defer)
  } finally {
    await Promise.all(
      deferrables.map(async (d) => {
        try {
          return typeof d === 'function' ? d() : d
        } catch (error) {
          console.error('Error in deferred operation:', error)
        }
      }),
    )
  }
}
