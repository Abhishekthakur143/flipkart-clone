const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter product name'],
      trim: true,
      maxLength: [200, 'Product name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Please enter product description'],
    },
    highlights: [
      {
        type: String,
      },
    ],
    specifications: [
      {
        title: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    price: {
      type: Number,
      required: [true, 'Please enter product price'],
      maxLength: [8, 'Price cannot exceed 8 digits'],
    },
    cuttedPrice: {
      type: Number,
      default: 0,
    },
    images: [
      {
        public_id: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Please enter product category'],
    },
    brand: {
      type: String,
      default: '',
    },
    stock: {
      type: Number,
      required: [true, 'Please enter product stock'],
      maxLength: [5, 'Stock cannot exceed 5 digits'],
      default: 1,
    },
    warranty: {
      type: Number,
      default: 0,
    },
    ratings: {
      type: Number,
      default: 0,
    },
    numOfReviews: {
      type: Number,
      default: 0,
    },
    reviews: [reviewSchema],
    sizes: [
      {
        type: String,
      },
    ],
    colors: [
      {
        type: String,
      },
    ],
    tags: [
      {
        type: String,
      },
    ],
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isTrending: {
      type: Boolean,
      default: false,
    },
    isFlashDeal: {
      type: Boolean,
      default: false,
    },
    flashDealExpiry: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    totalSold: {
      type: Number,
      default: 0,
    },

    // ---- Seller (consignment) fields ----
    // select:false => ye store ka andar ka hisaab hai, public product API me kabhi nahi jaata.
    // Padhne ke liye: Product.find().select('+seller +dealPrice +deal')
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', select: false, index: true },
    dealPrice: { type: Number, select: false }, // seller ko per unit milne wala rate (customer price nahi)
    deal: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', select: false },
  },
  { timestamps: true }
);

// Auto-generate slug
productSchema.pre('save', function (next) {
  this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  next();
});

module.exports = mongoose.model('Product', productSchema);
