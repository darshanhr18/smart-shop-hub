const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
  shop_photo: String, // Base64 or URL
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
  unit: { type: String, default: 'Piece' }, // Kg, Litre, Piece, Packet, etc.
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

// Compile Models
let CustomerModel, ShopOwnerModel, ShopModel, ProductModel, StockModel, DiscountModel, ReviewModel;

try {
  CustomerModel = mongoose.model('Customer', CustomerSchema);
  ShopOwnerModel = mongoose.model('ShopOwner', ShopOwnerSchema);
  ShopModel = mongoose.model('Shop', ShopSchema);
  ProductModel = mongoose.model('Product', ProductSchema);
  StockModel = mongoose.model('Stock', StockSchema);
  DiscountModel = mongoose.model('Discount', DiscountSchema);
  ReviewModel = mongoose.model('Review', ReviewSchema);
} catch (e) {
  CustomerModel = mongoose.models.Customer;
  ShopOwnerModel = mongoose.models.ShopOwner;
  ShopModel = mongoose.models.Shop;
  ProductModel = mongoose.models.Product;
  StockModel = mongoose.models.Stock;
  DiscountModel = mongoose.models.Discount;
  ReviewModel = mongoose.models.Review;
}

// --- LOCAL JSON FILE DATABASE ENGINE ---

function readJsonFile(filename) {
  const filePath = path.join(DATA_DIR, `${filename}.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filename}.json, resetting:`, err);
    return [];
  }
}

function writeJsonFile(filename, data) {
  const filePath = path.join(DATA_DIR, `${filename}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function generateId() {
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

// Unified Database Connector
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
    isConnected = false;
    console.warn('\n======================================================');
    console.warn('MongoDB connection failed. Switching to Local JSON Mode.');
    console.warn(`Data will be saved in: ${DATA_DIR}`);
    console.warn('======================================================\n');
  }
}

// Generic CRUD factory for JSON Mode
function createJsonCollection(filename) {
  return {
    async find(query = {}) {
      const items = readJsonFile(filename);
      return items.filter(item => {
        return Object.keys(query).every(key => {
          if (query[key] instanceof RegExp) {
            return query[key].test(item[key]);
          }
          if (typeof query[key] === 'object' && query[key] !== null) {
            if (query[key].$in) {
              return query[key].$in.map(String).includes(String(item[key]));
            }
          }
          return String(item[key]) === String(query[key]);
        });
      });
    },

    async findOne(query = {}) {
      const items = readJsonFile(filename);
      return items.find(item => {
        return Object.keys(query).every(key => {
          return String(item[key]) === String(query[key]);
        });
      }) || null;
    },

    async create(data) {
      const items = readJsonFile(filename);
      const newItem = { _id: generateId(), ...data };
      items.push(newItem);
      writeJsonFile(filename, items);
      return newItem;
    },

    async updateOne(query, updateData) {
      const items = readJsonFile(filename);
      const item = items.find(i => {
        return Object.keys(query).every(key => String(i[key]) === String(query[key]));
      });
      if (item) {
        Object.assign(item, updateData);
        writeJsonFile(filename, items);
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    },

    async deleteOne(query) {
      const items = readJsonFile(filename);
      const index = items.findIndex(i => {
        return Object.keys(query).every(key => String(i[key]) === String(query[key]));
      });
      if (index !== -1) {
        items.splice(index, 1);
        writeJsonFile(filename, items);
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    },

    async deleteMany(query = {}) {
      const items = readJsonFile(filename);
      const filtered = items.filter(i => {
        return !Object.keys(query).every(key => String(i[key]) === String(query[key]));
      });
      const deletedCount = items.length - filtered.length;
      writeJsonFile(filename, filtered);
      return { deletedCount };
    }
  };
}

// Unified db interface exporting identical functions for Mongo and JSON fallback
const db = {
  connectDB,
  isMongo: () => isConnected,

  customers: {
    async find(q) { return isConnected ? CustomerModel.find(q).lean() : createJsonCollection('customers').find(q); },
    async findOne(q) { return isConnected ? CustomerModel.findOne(q).lean() : createJsonCollection('customers').findOne(q); },
    async create(d) { return isConnected ? (await CustomerModel.create(d)).toObject() : createJsonCollection('customers').create(d); },
    async updateOne(q, u) { return isConnected ? CustomerModel.updateOne(q, u) : createJsonCollection('customers').updateOne(q, u); }
  },

  owners: {
    async find(q) { return isConnected ? ShopOwnerModel.find(q).lean() : createJsonCollection('owners').find(q); },
    async findOne(q) { return isConnected ? ShopOwnerModel.findOne(q).lean() : createJsonCollection('owners').findOne(q); },
    async create(d) { return isConnected ? (await ShopOwnerModel.create(d)).toObject() : createJsonCollection('owners').create(d); },
    async updateOne(q, u) { return isConnected ? ShopOwnerModel.updateOne(q, u) : createJsonCollection('owners').updateOne(q, u); },
    async deleteOne(q) { return isConnected ? ShopOwnerModel.deleteOne(q) : createJsonCollection('owners').deleteOne(q); }
  },

  shops: {
    async find(q) { return isConnected ? ShopModel.find(q).lean() : createJsonCollection('shops').find(q); },
    async findOne(q) { return isConnected ? ShopModel.findOne(q).lean() : createJsonCollection('shops').findOne(q); },
    async create(d) { return isConnected ? (await ShopModel.create(d)).toObject() : createJsonCollection('shops').create(d); },
    async updateOne(q, u) { return isConnected ? ShopModel.updateOne(q, u) : createJsonCollection('shops').updateOne(q, u); },
    async deleteOne(q) { return isConnected ? ShopModel.deleteOne(q) : createJsonCollection('shops').deleteOne(q); }
  },

  products: {
    async find(q) { return isConnected ? ProductModel.find(q).lean() : createJsonCollection('products').find(q); },
    async findOne(q) { return isConnected ? ProductModel.findOne(q).lean() : createJsonCollection('products').findOne(q); },
    async create(d) { return isConnected ? (await ProductModel.create(d)).toObject() : createJsonCollection('products').create(d); },
    async updateOne(q, u) { return isConnected ? ProductModel.updateOne(q, u) : createJsonCollection('products').updateOne(q, u); },
    async deleteOne(q) { return isConnected ? ProductModel.deleteOne(q) : createJsonCollection('products').deleteOne(q); },
    async deleteMany(q) { return isConnected ? ProductModel.deleteMany(q) : createJsonCollection('products').deleteMany(q); }
  },

  stocks: {
    async find(q) { return isConnected ? StockModel.find(q).lean() : createJsonCollection('stocks').find(q); },
    async findOne(q) { return isConnected ? StockModel.findOne(q).lean() : createJsonCollection('stocks').findOne(q); },
    async create(d) { return isConnected ? (await StockModel.create(d)).toObject() : createJsonCollection('stocks').create(d); },
    async updateOne(q, u) { return isConnected ? StockModel.updateOne(q, u) : createJsonCollection('stocks').updateOne(q, u); },
    async deleteOne(q) { return isConnected ? StockModel.deleteOne(q) : createJsonCollection('stocks').deleteOne(q); },
    async deleteMany(q) { return isConnected ? StockModel.deleteMany(q) : createJsonCollection('stocks').deleteMany(q); }
  },

  discounts: {
    async find(q) { return isConnected ? DiscountModel.find(q).lean() : createJsonCollection('discounts').find(q); },
    async findOne(q) { return isConnected ? DiscountModel.findOne(q).lean() : createJsonCollection('discounts').findOne(q); },
    async create(d) { return isConnected ? (await DiscountModel.create(d)).toObject() : createJsonCollection('discounts').create(d); },
    async updateOne(q, u) { return isConnected ? DiscountModel.updateOne(q, u) : createJsonCollection('discounts').updateOne(q, u); },
    async deleteOne(q) { return isConnected ? DiscountModel.deleteOne(q) : createJsonCollection('discounts').deleteOne(q); },
    async deleteMany(q) { return isConnected ? DiscountModel.deleteMany(q) : createJsonCollection('discounts').deleteMany(q); }
  },

  reviews: {
    async find(q) { return isConnected ? ReviewModel.find(q).lean() : createJsonCollection('reviews').find(q); },
    async findOne(q) { return isConnected ? ReviewModel.findOne(q).lean() : createJsonCollection('reviews').findOne(q); },
    async create(d) { return isConnected ? (await ReviewModel.create(d)).toObject() : createJsonCollection('reviews').create(d); },
    async deleteMany(q) { return isConnected ? ReviewModel.deleteMany(q) : createJsonCollection('reviews').deleteMany(q); }
  }
};

module.exports = db;
