const mongoose = require('mongoose');

const deliveryItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      default: '',
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
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative'],
    },
  },
  { _id: true }
);

const deliverySchema = new mongoose.Schema(
  {
    deliveryNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    roleUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role user is required'],
    },
    customer: {
      customerName: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
      },
      mobile: {
        type: String,
        required: [true, 'Customer mobile number is required'],
        trim: true,
      },
      email: {
        type: String,
        lowercase: true,
        trim: true,
        default: '',
      },
      fullAddress: {
        type: String,
        required: [true, 'Delivery address is required'],
        trim: true,
      },
      landmark: {
        type: String,
        trim: true,
        default: '',
      },
      city: {
        type: String,
        trim: true,
        default: 'Latehar',
      },
      pinCode: {
        type: String,
        trim: true,
        default: '',
      },
    },
    items: {
      type: [deliveryItemSchema],
      validate: [
        function (val) {
          return val.length > 0;
        },
        'Delivery must contain at least one item',
      ],
    },
    deliveryType: {
      type: String,
      enum: ['manual', 'standard', 'express'],
      default: 'manual',
    },
    deliveryPerson: {
      personName: { type: String, trim: true, default: '' },
      contactNumber: { type: String, trim: true, default: '' },
      notes: { type: String, trim: true, default: '' },
    },
    paymentDetails: {
      method: {
        type: String,
        enum: ['cash', 'upi', 'card', 'credit', 'other'],
        default: 'cash',
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'partially_paid'],
        default: 'pending',
      },
      amountPaid: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalAmount: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'pending',
    },
    dispatchDate: {
      type: Date,
      default: null,
    },
    deliveryDate: {
      type: Date,
      default: null,
    },
    manualNotes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Delivery || mongoose.model('Delivery', deliverySchema);
