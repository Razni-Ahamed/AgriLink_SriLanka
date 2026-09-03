import type { resources } from './config'

/**
 * Types `t()` against the English resources, so a mistyped key or namespace is
 * a compile error rather than a key echoed back at runtime.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: (typeof resources)['en']
  }
}
