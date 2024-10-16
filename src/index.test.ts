import { describe, expect, it } from 'bun:test'
import { provideDefer } from './index'

describe('provideDefer', () => {
  describe('Execution Order', () => {
    it('should execute the main function and deferred functions in the correct order', async () => {
      const order: number[] = []
      await provideDefer((defer) => {
        order.push(1)
        defer(() => order.push(5))
        defer(
          () =>
            new Promise((resolve) =>
              setTimeout(() => {
                resolve(order.push(4))
              }, 50),
            ),
        )
        defer(() => order.push(3))
        order.push(2)
        return Promise.resolve()
      })
      expect(order).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe('Error Handling', () => {
    it('should handle errors in deferred functions', async () => {
      const result = provideDefer((defer) => {
        defer(() => {
          throw new Error('Deferred error')
        })
        return Promise.resolve()
      })
      expect(result).rejects.toThrow(AggregateError)
      result.catch((err: AggregateError) => {
        expect(err).toBeInstanceOf(AggregateError)
        expect(err.errors).toHaveLength(1)
        expect(err.errors[0].message).toBe('Deferred error')
      })
    })

    it('should ignore errors in deferred functions with noThrow option', async () => {
      await expect(
        provideDefer((defer) => {
          defer(
            () => {
              throw new Error('Ignored error')
            },
            { noThrow: true },
          )
          return Promise.resolve('Success')
        }),
      ).resolves.toBe('Success')
    })

    it('should combine errors from main function and deferred functions', async () => {
      const result = provideDefer((defer) => {
        defer(() => {
          throw new Error('Deferred error')
        })
        throw new Error('Main error')
      })
      expect(result).rejects.toThrow(AggregateError)
      result.catch((err: AggregateError) => {
        expect(err).toBeInstanceOf(AggregateError)
        expect(err.message).toBe('Main error and 1 deferred error(s).')
        expect(err.errors).toHaveLength(2)
        expect(err.errors[0].message).toBe('Main error')
        expect(err.errors[1].message).toBe('Deferred error')
      })
    })
  })

  describe('Asynchronous Behavior', () => {
    it('should not wait for noWait deferred functions', async () => {
      const start = Date.now()
      await provideDefer((defer) => {
        defer(() => new Promise((resolve) => setTimeout(resolve, 1000)), { noWait: true })
        return Promise.resolve()
      })
      const duration = Date.now() - start
      expect(duration).toBeLessThan(500) // Assuming the test runs in less than 500ms
    })

    it('should handle async deferred functions', async () => {
      const result = await provideDefer(async (defer) => {
        defer(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          return 'Async deferred'
        })
        return 'Main'
      })
      expect(result).toBe('Main')
    })
  })

  describe('Return Value', () => {
    it('should correctly return the value from the main function', async () => {
      const deferredResults: string[] = []
      const result = await provideDefer((defer) => {
        defer(() => deferredResults.push('Deferred function executed'))
        return 'Main function result'
      })
      expect(result).toBe('Main function result')
      expect(deferredResults).toEqual(['Deferred function executed'])
    })

    it('should handle and return resolved promises from the main function', async () => {
      const deferredResults: string[] = []
      const result = await provideDefer(async (defer) => {
        defer(() => deferredResults.push('Deferred function executed'))
        return Promise.resolve('Async main function result')
      })
      expect(result).toBe('Async main function result')
      expect(deferredResults).toEqual(['Deferred function executed'])
    })
  })
})
