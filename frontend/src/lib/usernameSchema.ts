import { z } from 'zod'
import { normalizeUsername, usernameProblem, type UsernameProblem } from './validation'

export type UsernameSchemaMessages = Record<UsernameProblem, string>

/**
 * A zod string that normalises the username (trim + lowercase) and applies the shared username
 * rules, so every form that collects one reports the same messages the availability indicator uses.
 */
export function buildUsernameSchema(messages: UsernameSchemaMessages) {
  return z
    .string()
    .transform(normalizeUsername)
    .superRefine((username, ctx) => {
      const problem = usernameProblem(username)
      if (problem) {
        ctx.addIssue({ code: 'custom', message: messages[problem] })
      }
    })
}
