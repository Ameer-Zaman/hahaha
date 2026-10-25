import mongoose from 'mongoose'

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
    /** Bumped on password change / disable, so existing sessions stop working. */
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
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
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  }
}

export const User = mongoose.model('User', userSchema)
