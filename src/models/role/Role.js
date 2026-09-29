const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const roleSchema = new mongoose.Schema(
  {
    roleName: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
    },
    roleTitle: {
      type: String,
      trim: true,
      default: 'Ravi Electricals Staff',
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
    },
    mobile: {
      type: String,
      trim: true,
      default: '',
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    rawPassword: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: Number,
      enum: [0, 1], // 0 = Block, 1 = Unblock / Active
      default: 1,
    },
    isFirstLogin: {
      type: Boolean,
      default: true,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    permissions: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual alias 'name' -> 'roleName'
roleSchema.virtual('name')
  .get(function () { return this.roleName; })
  .set(function (v) { this.roleName = v; });

// Virtual alias 'personName' -> 'roleTitle'
roleSchema.virtual('personName')
  .get(function () { return this.roleTitle; })
  .set(function (v) { this.roleTitle = v; });


// Encrypt password using bcrypt before saving if modified
roleSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match user entered password to hashed password in database
roleSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);

// Drop legacy index 'name_1' if it exists to prevent duplicate key errors
Role.collection.dropIndex('name_1').catch(() => {});

module.exports = Role;

