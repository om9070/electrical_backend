const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    status: {
      type: Number,
      enum: [0, 1], // 0 = Inactive, 1 = Active
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);
