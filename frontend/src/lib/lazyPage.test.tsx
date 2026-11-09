import { Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { lazyPage, reloadOnStaleChunks } from './lazyPage'

describe('lazyPage', () => {
  it('renders a named export once its module has loaded', async () => {
    const Page = lazyPage(
      () => Promise.resolve({ GreetingPage: () => <h1>Hello</h1> }),
      'GreetingPage',
    )

    render(
      <Suspense fallback={<p>Loading</p>}>
        <Page />
      </Suspense>,
    )

    expect(await screen.findByRole('heading', { name: 'Hello' })).toBeInTheDocument()
  })
})

describe('reloadOnStaleChunks', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  function fakeWindow() {
    const target = new EventTarget() as EventTarget & Pick<Window, 'location' | 'sessionStorage'>
    const reload = vi.fn()
    const store = new Map<string, string>()
    Object.assign(target, {
      location: { reload },
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
    })
    reloadOnStaleChunks(target as unknown as Window)
    const fire = () => {
      const event = new Event('vite:preloadError', { cancelable: true })
      target.dispatchEvent(event)
      return event.defaultPrevented
    }
    return { reload, fire }
  }

  it('reloads once to pick up the new deploy, and not again straight after', () => {
    vi.useFakeTimers({ now: 1_000_000 })
    const { reload, fire } = fakeWindow()

    expect(fire()).toBe(true)
    vi.advanceTimersByTime(2_000)
    // Still failing right after a reload: probably offline, so let the error page show instead.
    expect(fire()).toBe(false)

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads again once the cooldown has passed', () => {
    vi.useFakeTimers({ now: 1_000_000 })
    const { reload, fire } = fakeWindow()

    fire()
    vi.advanceTimersByTime(60_000)
    fire()

    expect(reload).toHaveBeenCalledTimes(2)
  })
})
