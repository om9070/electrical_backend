const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    warranty: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category is required'],
    },
    price: {
      type: Number,
      min: [0, 'Price must be non-negative'],
    },
    unit: {
      type: String,
      trim: true,
      default: 'piece',
    },
    variants: [
      {
        unit: {
          type: String,
          trim: true,
          required: [true, 'Variant unit is required'],
        },
        price: {
          type: Number,
          required: [true, 'Variant price is required'],
          min: [0, 'Price must be non-negative'],
        },
      },
    ],
    description: {
      type: String,
      trim: true,
      default: '',
    },
    specs: [
      {
        key: { type: String, trim: true },
        value: { type: String, trim: true },
      },
    ],
    images: [
      {
        type: String,
      },
    ],
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

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
