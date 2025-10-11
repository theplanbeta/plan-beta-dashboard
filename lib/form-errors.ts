export type FieldErrors = Record<string, string>

export function parseZodIssues(issues: any[]): FieldErrors {
  const errors: FieldErrors = {}
  for (const issue of issues || []) {
    const path = Array.isArray(issue?.path) ? issue.path.join('.') : ''
    const message = issue?.message || 'Invalid value'
    if (path) errors[path] = message
  }
  return errors
}

