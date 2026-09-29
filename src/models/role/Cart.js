const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
    },
    unit: {
      type: String,
      trim: true,
      default: 'piece',
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price must be non-negative'],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, 'Total price must be non-negative'],
    },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Cart must belong to a Role user'],
      unique: true,
    },
    items: [cartItemSchema],
    cartTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalItems: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Method to recalculate cart totals before saving
cartSchema.methods.calculateTotals = function () {
  let totalAmount = 0;
  let itemCount = 0;

  this.items.forEach((item) => {
    item.totalPrice = item.quantity * item.unitPrice;
    totalAmount += item.totalPrice;
    itemCount += item.quantity;
  });

  this.cartTotal = totalAmount;
  this.totalItems = itemCount;
};

module.exports = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
