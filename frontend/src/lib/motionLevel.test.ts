import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOTION_STORAGE_KEY,
  REDUCED_MOTION_QUERY,
  applyMotionLevel,
  readStoredMotionPreference,
  resolveMotionLevel,
  subscribeToSystemMotion,
  writeStoredMotionPreference,
} from './motionLevel'

type ChangeListener = () => void

/** Stands in for the device's reduced-motion setting, and lets a test flip it mid-run. */
function mockReducedMotion(initial: boolean) {
  const listeners = new Set<ChangeListener>()
  let reduce = initial
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        get matches() {
          return query === REDUCED_MOTION_QUERY && reduce
        },
        media: query,
        addEventListener: (_: string, listener: ChangeListener) => listeners.add(listener),
        removeEventListener: (_: string, listener: ChangeListener) => listeners.delete(listener),
      }) as unknown as MediaQueryList,
  )
  return {
    set(value: boolean) {
      reduce = value
      listeners.forEach((listener) => listener())
    },
  }
}

function mockSaveData(saveData: boolean) {
  Object.defineProperty(navigator, 'connection', { value: { saveData }, configurable: true })
}

describe('motion level', () => {
  beforeEach(() => {
    localStorage.clear()
    mockSaveData(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Reflect.deleteProperty(navigator, 'connection')
    delete document.documentElement.dataset.motion
  })

  it('defaults to following the device', () => {
    expect(readStoredMotionPreference()).toBe('system')
  })

  it('remembers an explicit choice and ignores junk in storage', () => {
    writeStoredMotionPreference('lite')
    expect(readStoredMotionPreference()).toBe('lite')

    localStorage.setItem(MOTION_STORAGE_KEY, 'bouncy')
    expect(readStoredMotionPreference()).toBe('system')
  })

  it('resolves "system" to off when the device asks for reduced motion', () => {
    mockReducedMotion(true)
    expect(resolveMotionLevel('system')).toBe('off')
  })

  it('resolves "system" to lite when the browser asks to save data', () => {
    mockReducedMotion(false)
    mockSaveData(true)
    expect(resolveMotionLevel('system')).toBe('lite')
  })

  it('resolves "system" to full otherwise', () => {
    mockReducedMotion(false)
    expect(resolveMotionLevel('system')).toBe('full')
  })

  it('lets an explicit choice win over the device', () => {
    mockReducedMotion(true)
    expect(resolveMotionLevel('full')).toBe('full')
  })

  it('puts the level on <html> for the stylesheet', () => {
    applyMotionLevel('lite')
    expect(document.documentElement.dataset.motion).toBe('lite')
  })

  it('reports when the reduced-motion setting changes, until unsubscribed', () => {
    const device = mockReducedMotion(false)
    const onChange = vi.fn()
    const unsubscribe = subscribeToSystemMotion(onChange)

    device.set(true)
    expect(onChange).toHaveBeenLastCalledWith('off')

    unsubscribe()
    device.set(false)
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
