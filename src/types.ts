/**
 * Represents a function or Promise that can be deferred.
 * @see DeferFunction for detailed behavior explanation.
 */
export type Deferrable = Promise<unknown> | (() => unknown) | (() => Promise<unknown>)

/**
 * A function used to schedule operations to be performed after the main function completes.
 * The behavior differs based on the type of the passed argument:
 *
 * @param deferrable - The operation to be deferred. Can be a Promise or a function (sync or async).
 *
 * @remarks
 * When a Promise is passed:
 * - The resolution of the main function will wait for this Promise to settle.
 * - The main function resolves only after all deferred Promises have settled.
 *
 * When a function is passed:
 * - The function will be executed after the main function completes.
 * - If it's an async function, its Promise will be awaited.
 * - If it's a sync function, it will be executed synchronously after the main function.
 *
 * In both cases, any errors in deferred operations are caught and logged, but do not affect the main function's resolution.
 */
export type DeferFunction = (deferrable: Deferrable) => void

/**
 * Represents a function enhanced with defer capability.
 *
 * @template T - The type of the value that the function ultimately resolves to.
 * @param defer - A function to schedule deferred operations.
 * @returns A promise that resolves to a value of type T.
 */
export type DeferrableFunction<T> = (defer: DeferFunction) => Promise<T>

/**
 * The main provideDefer function type.
 *
 * @template T - The type of the value that the enhanced function resolves to.
 * @param func - The function to be enhanced with defer capability.
 * @returns A promise that resolves to a value of type T.
 */
export type ProvideDeferFunction = <T>(func: DeferrableFunction<T>) => Promise<T>
