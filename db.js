const mongoose = require('mongoose');
require('dotenv').config();

let isConnected = false;

// --- MONGOOSE SCHEMAS ---
const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true }
});

const ShopOwnerSchema = new mongoose.Schema({
  owner_name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  shop_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
  approved: { type: Boolean, default: false }
});

const ShopSchema = new mongoose.Schema({
  shop_name: { type: String, required: true },
  category: { type: String, required: true },
  description: String,
  address: { type: String, required: true },
  contact_number: String,
  shop_photo: String,
  shop_photos: { type: [String], default: [] },
  opening_time: { type: String, default: '09:00 AM' },
  closing_time: { type: String, default: '09:00 PM' },
  shop_status: { type: String, enum: ['Open', 'Closed', 'Busy'], default: 'Open' }
});

const ProductSchema = new mongoose.Schema({
  shop_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  product_name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  image: String,
  description: String
});

const StockSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  available_quantity: { type: Number, default: 0 },
  unit: { type: String, default: 'Piece' },
  last_updated: { type: Date, default: Date.now }
});

const DiscountSchema = new mongoose.Schema({
  shop_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  title: { type: String, required: true },
  percentage: { type: Number, required: true },
  description: String,
  start_date: { type: Date, default: Date.now },
  end_date: { type: Date }
});

const ReviewSchema = new mongoose.Schema({
  shop_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  customer_name: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  review: { type: String, required: true },
  review_date: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
  customer_id: { type: String, required: true },
  customer_name: String,
  customer_mobile: String,
  shop_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  shop_name: String,
  items: [{
    product_id: String,
    product_name: String,
    price: Number,
    quantity: Number,
    unit: String,
    image: String
  }],
  subtotal: Number,
  discount_amount: { type: Number, default: 0 },
  total_amount: Number,
  order_type: { type: String, enum: ['Delivery', 'Pickup'], default: 'Delivery' },
  delivery_address: String,
  payment_method: { type: String, default: 'Cash on Delivery' },
  order_status: { type: String, enum: ['Pending', 'Accepted', 'Preparing', 'Ready', 'Completed', 'Cancelled'], default: 'Pending' },
  created_at: { type: Date, default: Date.now }
});

const CustomerModel = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
const ShopOwnerModel = mongoose.models.ShopOwner || mongoose.model('ShopOwner', ShopOwnerSchema);
const ShopModel = mongoose.models.Shop || mongoose.model('Shop', ShopSchema);
const ProductModel = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const StockModel = mongoose.models.Stock || mongoose.model('Stock', StockSchema);
const DiscountModel = mongoose.models.Discount || mongoose.model('Discount', DiscountSchema);
const ReviewModel = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
const OrderModel = mongoose.models.Order || mongoose.model('Order', OrderSchema);

async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartshophub';
  console.log(`Attempting to connect to MongoDB at ${mongoUri}...`);
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000
    });
    isConnected = true;
    console.log('Successfully connected to MongoDB!');
  } catch (err) {
    console.error(`Failed to connect to MongoDB at ${mongoUri}:`, err.message || err);
    throw new Error('MongoDB connection failed. Start MongoDB or set MONGODB_URI and retry.');
  }
}

const db = {
  connectDB,
  isMongo: () => isConnected,

  customers: {
    async find(q) { return CustomerModel.find(q).lean(); },
    async findOne(q) { return CustomerModel.findOne(q).lean(); },
    async create(d) { return (await CustomerModel.create(d)).toObject(); },
    async updateOne(q, u) { return CustomerModel.updateOne(q, u); }
  },

  owners: {
    async find(q) { return ShopOwnerModel.find(q).lean(); },
    async findOne(q) { return ShopOwnerModel.findOne(q).lean(); },
    async create(d) { return (await ShopOwnerModel.create(d)).toObject(); },
    async updateOne(q, u) { return ShopOwnerModel.updateOne(q, u); },
    async deleteOne(q) { return ShopOwnerModel.deleteOne(q); }
  },

  shops: {
    async find(q) { return ShopModel.find(q).lean(); },
    async findOne(q) { return ShopModel.findOne(q).lean(); },
    async create(d) { return (await ShopModel.create(d)).toObject(); },
    async updateOne(q, u) { return ShopModel.updateOne(q, u); },
    async deleteOne(q) { return ShopModel.deleteOne(q); }
  },

  products: {
    async find(q) { return ProductModel.find(q).lean(); },
    async findOne(q) { return ProductModel.findOne(q).lean(); },
    async create(d) { return (await ProductModel.create(d)).toObject(); },
    async updateOne(q, u) { return ProductModel.updateOne(q, u); },
    async deleteOne(q) { return ProductModel.deleteOne(q); },
    async deleteMany(q) { return ProductModel.deleteMany(q); }
  },

  stocks: {
    async find(q) { return StockModel.find(q).lean(); },
    async findOne(q) { return StockModel.findOne(q).lean(); },
    async create(d) { return (await StockModel.create(d)).toObject(); },
    async updateOne(q, u) { return StockModel.updateOne(q, u); },
    async deleteOne(q) { return StockModel.deleteOne(q); },
    async deleteMany(q) { return StockModel.deleteMany(q); }
  },

  discounts: {
    async find(q) { return DiscountModel.find(q).lean(); },
    async findOne(q) { return DiscountModel.findOne(q).lean(); },
    async create(d) { return (await DiscountModel.create(d)).toObject(); },
    async updateOne(q, u) { return DiscountModel.updateOne(q, u); },
    async deleteOne(q) { return DiscountModel.deleteOne(q); },
    async deleteMany(q) { return DiscountModel.deleteMany(q); }
  },

  reviews: {
    async find(q) { return ReviewModel.find(q).lean(); },
    async findOne(q) { return ReviewModel.findOne(q).lean(); },
    async create(d) { return (await ReviewModel.create(d)).toObject(); },
    async deleteMany(q) { return ReviewModel.deleteMany(q); }
  },

  orders: {
    async find(q) { return OrderModel.find(q).sort({ created_at: -1 }).lean(); },
    async findOne(q) { return OrderModel.findOne(q).lean(); },
    async create(d) { return (await OrderModel.create(d)).toObject(); },
    async updateOne(q, u) { return OrderModel.updateOne(q, u); },
    async deleteMany(q) { return OrderModel.deleteMany(q); }
  }
};

module.exports = db;
