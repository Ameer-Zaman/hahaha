import mongoose from 'mongoose'

/**
 * The parts of the panel a Super Admin can open or close for each Admin account
 * (Panel → Accounts → Pages). Super Admins can always open everything. Overview and the
 * person's own Account page are always open.
 */
export const PANEL_AREAS = [
  'site',
  'live',
  'announcements',
  'chat',
  'gangs',
  'wars',
  'clubs',
  'events',
  'tdm',
  'staff',
  'creators',
  'store',
  'gallery',
  'rules',
  'media',
  'homeMedia',
  'storyMedia',
]

/**
 * A website account. Roles are website-only and have nothing to do with in-game ranks:
 * 'admin' manages content; 'superadmin' also manages accounts and reads the audit log.
 * There is no public sign-up — accounts are created by a Super Admin.
 */
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
    active: { type: Boolean, default: true },
    /**
     * The panel areas this Admin may open (see PANEL_AREAS). Not set = every area: that is
     * how accounts made before this setting existed keep working until a Super Admin picks.
     */
    access: { type: [String], default: undefined },
    /** Bumped on password change / disable, so existing sessions stop working. */
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
    /**
     * Two-step sign-in. `secret` is set when setup starts and only counts once `enabled`
     * is true, so an abandoned setup locks nobody out. `lastStep` is the 30-second step a
     * code was last accepted for: the same code is refused afterwards, so one seen over a
     * shoulder (or in a proxy log) cannot be used again.
     */
    totp: {
      secret: { type: String, default: '', select: false },
      enabled: { type: Boolean, default: false },
      confirmedAt: { type: Date, default: null },
      lastStep: { type: Number, default: 0, select: false },
    },
    /** Hashes of the one-time recovery codes, for a lost phone. Never the codes themselves. */
    recoveryCodes: {
      type: [{ hash: String, usedAt: { type: Date, default: null } }],
      default: [],
      select: false,
    },
  },
  { timestamps: true },
)

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name,
    role: this.role,
    active: this.active,
    access: Array.isArray(this.access) ? this.access.filter((a) => PANEL_AREAS.includes(a)) : null, // null = every area
    twoFactor: Boolean(this.totp?.enabled),
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  }
}

export const User = mongoose.model('User', userSchema)
