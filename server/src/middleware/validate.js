/** Validates req.body against a zod schema; replaces it with the parsed (clean) value. */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {})
    if (!result.success) {
      const issue = result.error.issues[0]
      const field = issue?.path?.join('.') || 'request'
      return res.status(400).json({ message: `${field}: ${issue?.message ?? 'invalid value'}`, issues: result.error.issues })
    }
    req.body = result.data
    next()
  }
}
