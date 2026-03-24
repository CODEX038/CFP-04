import mongoose from 'mongoose'
import bcrypt   from 'bcryptjs'

const UserSchema = new mongoose.Schema(
  {
    // ── Core Identity ─────────────────────────────────────────────────────────
    name: {
      type:    String,
      trim:    true,
      default: '',
    },
    username: {
      type:    String,
      trim:    true,
      default: '',
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: 6,
      select:    false,
    },
    // ✅ phone has NO unique constraint — duplicates allowed until verified
    phone: {
      type:    String,
      default: '',
      trim:    true,
    },
    dob: {
      type:    String,
      default: '',
    },
    location: {
      type:    String,
      default: '',
    },
    profilePhoto: {
      type:    String,
      default: '',
    },
    document: {
      type: {
        type:    String,
        default: '',
      },
      hash: {
        type:    String,
        default: '',
      },
      url: {
        type:    String,
        default: '',
      },
      status: {
        type:    String,
        enum:    ['', 'pending', 'verified', 'rejected'],
        default: '',
      },
    },
    isAdmin: {
      type:    Boolean,
      default: false,
    },
    isVerified: {
      type:    Boolean,
      default: false,
    },

    // ── OTP Verification Status ───────────────────────────────────────────────
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },

    // ── Email OTP ─────────────────────────────────────────────────────────────
    emailOtp:         { type: String, default: null, select: false },
    emailOtpExpires:  { type: Date,   default: null },
    emailOtpAttempts: { type: Number, default: 0    },
    emailOtpLastSent: { type: Date,   default: null },

    // ── Phone OTP ─────────────────────────────────────────────────────────────
    phoneOtp:         { type: String, default: null, select: false },
    phoneOtpExpires:  { type: Date,   default: null },
    phoneOtpAttempts: { type: Number, default: 0    },
    phoneOtpLastSent: { type: Date,   default: null },
  },
  { timestamps: true }
)

// ── Only email needs a unique index ──────────────────────────────────────────
UserSchema.index({ email: 1 })
// Phone index for fast lookup — NOT unique (unverified duplicates allowed)
UserSchema.index({ phone: 1, phoneVerified: 1 })

// ── Hash password before save ─────────────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  const salt    = await bcrypt.genSalt(12)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

// ── Instance methods ──────────────────────────────────────────────────────────
UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

UserSchema.methods.canCreateCampaign = function () {
  return this.emailVerified && this.phoneVerified
}

UserSchema.methods.canDonate = function () {
  return this.emailVerified
}

export default mongoose.models.User || mongoose.model('User', UserSchema)
