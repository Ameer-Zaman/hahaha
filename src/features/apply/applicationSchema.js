/**
 * Application fields and validation rules.
 *
 * The field list is a starting point — the team will finalise it. Keep the same rules on the
 * server when the backend is built: client-side validation is for the visitor's convenience,
 * never a security boundary.
 */

export const fields = [
  {
    name: 'discord',
    label: 'Discord username',
    requiredMessage: 'Enter your Discord username.',
    type: 'text',
    autoComplete: 'username',
    hint: 'So the team can contact you about your application.',
    required: true,
    minLength: 2,
    maxLength: 32,
    pattern: /^[a-z0-9_.]{2,32}$/i,
    patternMessage: 'Use letters, numbers, underscores or full stops only.',
  },
  {
    name: 'email',
    label: 'Email (optional)',
    type: 'email',
    autoComplete: 'email',
    hint: 'A backup way to reach you.',
    required: false,
    maxLength: 254,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternMessage: 'Enter an email address like name@example.com.',
  },
  {
    name: 'characterName',
    label: 'Character name',
    requiredMessage: 'Enter your character’s name.',
    type: 'text',
    autoComplete: 'off',
    hint: 'The first and last name of the character you want to play.',
    required: true,
    minLength: 3,
    maxLength: 60,
  },
  {
    name: 'experience',
    label: 'Roleplay experience',
    requiredMessage: 'Choose your roleplay experience.',
    type: 'select',
    required: true,
    options: [
      { value: '', label: 'Choose one' },
      { value: 'new', label: 'New to roleplay' },
      { value: 'some', label: 'Some experience' },
      { value: 'experienced', label: 'Experienced on other servers' },
    ],
  },
  {
    name: 'backstory',
    label: 'Character backstory',
    requiredMessage: 'Write your character’s backstory.',
    type: 'textarea',
    hint: 'Who is your character and what brings them to the city? At least 150 characters.',
    required: true,
    minLength: 150,
    maxLength: 3000,
    rows: 8,
  },
  {
    name: 'motivation',
    label: 'Why do you want to join?',
    requiredMessage: 'Tell us why you want to join.',
    type: 'textarea',
    hint: 'At least 50 characters.',
    required: true,
    minLength: 50,
    maxLength: 1500,
    rows: 5,
  },
  {
    name: 'rulesAccepted',
    label: 'I have read the rules and agree to follow them.',
    type: 'checkbox',
    required: true,
    requiredMessage: 'You need to read and agree to the rules to apply.',
  },
]

export const initialValues = Object.fromEntries(
  fields.map((f) => [f.name, f.type === 'checkbox' ? false : '']),
)

/** Returns an error message for one field, or '' when it is valid. */
export function validateField(field, rawValue) {
  if (field.type === 'checkbox') {
    return field.required && !rawValue ? field.requiredMessage : ''
  }
  const value = String(rawValue ?? '').trim()
  if (!value) {
    return field.required ? field.requiredMessage : ''
  }
  if (field.minLength && value.length < field.minLength) {
    return `Write at least ${field.minLength} characters (${value.length} so far).`
  }
  if (field.maxLength && value.length > field.maxLength) {
    return `Keep this under ${field.maxLength} characters.`
  }
  if (field.pattern && !field.pattern.test(value)) {
    return field.patternMessage
  }
  return ''
}

export function validateAll(values) {
  const errors = {}
  for (const field of fields) {
    const message = validateField(field, values[field.name])
    if (message) errors[field.name] = message
  }
  return errors
}

/** Trimmed copy of the values, safe to send. */
export function toPayload(values) {
  return Object.fromEntries(
    fields.map((f) => [f.name, f.type === 'checkbox' ? Boolean(values[f.name]) : String(values[f.name]).trim()]),
  )
}
