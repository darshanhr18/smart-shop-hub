const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./db');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'smart_shop_hub_super_secret_key';

app.use(cors());
// Support larger payloads (base64 image uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userRole = decoded.role;

    if (decoded.role === 'customer') {
      const customer = await db.customers.findOne({ _id: decoded.id });
      if (!customer) return res.status(404).json({ message: 'Customer account not found.' });
      req.user = customer;
    } else if (decoded.role === 'owner') {
      const owner = await db.owners.findOne({ _id: decoded.id });
      if (!owner) return res.status(404).json({ message: 'Owner account not found.' });
      req.user = owner;
    } else {
      return res.status(403).json({ message: 'Invalid token role.' });
    }
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

// --- CUSTOMER AUTH API ---

app.post('/api/auth/customer/register', async (req, res) => {
  const { name, mobile, email, password } = req.body;
  if (!name || !mobile || !email || !password) {
    return res.status(400).json({ message: 'All registration fields are required.' });
  }
  try {
    const existing = await db.customers.findOne({ mobile });
    if (existing) return res.status(400).json({ message: 'Mobile number already registered.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const customer = await db.customers.create({
      name,
      mobile,
      email,
      password: hashedPassword
    });

    const token = jwt.sign({ id: customer._id, role: 'customer' }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user: { id: customer._id, name: customer.name, email: customer.email, mobile: customer.mobile } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error registering customer.' });
  }
});

app.post('/api/auth/customer/login', async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || !password) {
    return res.status(400).json({ message: 'Mobile and password are required.' });
  }
  try {
    const customer = await db.customers.findOne({ mobile });
    if (!customer) return res.status(400).json({ message: 'Account not found.' });

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

    const token = jwt.sign({ id: customer._id, role: 'customer' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: customer._id, name: customer.name, email: customer.email, mobile: customer.mobile } });
  } catch (err) {
    res.status(500).json({ message: 'Login error.' });
  }
});

app.get('/api/auth/customer/me', authenticateToken, (req, res) => {
  if (req.userRole !== 'customer') return res.status(403).json({ message: 'Not a customer account.' });
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email, mobile: req.user.mobile } });
});

app.put('/api/customer/profile', authenticateToken, async (req, res) => {
  if (req.userRole !== 'customer') return res.status(403).json({ message: 'Unauthorized.' });
  const { name, email, mobile, password } = req.body;
  try {
    const updateData = { name, email, mobile };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    await db.customers.updateOne({ _id: req.user._id }, updateData);
    const updated = await db.customers.findOne({ _id: req.user._id });
    res.json({ user: { id: updated._id, name: updated.name, email: updated.email, mobile: updated.mobile } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile.' });
  }
});


// --- OWNER AUTH API & ADMIN APPROVAL ---

app.post('/api/auth/owner/register', async (req, res) => {
  const { owner_name, mobile, email, password, shop_name, category, address, shop_photo, contact_number, opening_time, closing_time } = req.body;
  if (!owner_name || !mobile || !email || !password || !shop_name || !category || !address) {
    return res.status(400).json({ message: 'All required fields must be filled.' });
  }
  try {
    const existing = await db.owners.findOne({ mobile });
    if (existing) return res.status(400).json({ message: 'Mobile number already registered.' });

    // 1. Create Shop first
    const shop = await db.shops.create({
      shop_name,
      category,
      address,
      description: '',
      contact_number: contact_number || mobile,
      shop_photo: shop_photo || '',
      opening_time: opening_time || '08:00 AM',
      closing_time: closing_time || '09:00 PM',
      shop_status: 'Closed' // starts closed
    });

    // 2. Create Shop Owner linked to Shop ID
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.owners.create({
      owner_name,
      mobile,
      email,
      password: hashedPassword,
      shop_id: shop._id,
      approved: false // requires admin approval
    });

    res.status(201).json({ message: 'Registration submitted successfully. Pending Admin Approval.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error registering shop owner.' });
  }
});

app.post('/api/auth/owner/login', async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || !password) {
    return res.status(400).json({ message: 'Mobile and password are required.' });
  }
  try {
    const owner = await db.owners.findOne({ mobile });
    if (!owner) return res.status(400).json({ message: 'Account not found.' });

    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

    // Admin Approval Check
    if (!owner.approved) {
      return res.status(403).json({ message: 'Your registration is pending admin approval.' });
    }

    const token = jwt.sign({ id: owner._id, role: 'owner' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: owner._id, owner_name: owner.owner_name, email: owner.email, mobile: owner.mobile, shop_id: owner.shop_id } });
  } catch (err) {
    res.status(500).json({ message: 'Login error.' });
  }
});

app.get('/api/auth/owner/me', authenticateToken, (req, res) => {
  if (req.userRole !== 'owner') return res.status(403).json({ message: 'Not an owner account.' });
  res.json({ user: { id: req.user._id, owner_name: req.user.owner_name, email: req.user.email, mobile: req.user.mobile, shop_id: req.user.shop_id } });
});

// Admin Approval bypass endpoints for local testing
app.get('/api/admin/pending', async (req, res) => {
  try {
    const pendings = await db.owners.find({ approved: false });
    res.json(pendings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching pending list.' });
  }
});

app.post('/api/admin/approve/:id', async (req, res) => {
  try {
    await db.owners.updateOne({ _id: req.params.id }, { approved: true });
    res.json({ message: 'Shop owner approved successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Approval failed.' });
  }
});


// --- OWNER DASHBOARD OPERATIONS ---

// 1. Get Shop Details
app.get('/api/owner/shop', authenticateToken, async (req, res) => {
  if (req.userRole !== 'owner') return res.status(403).json({ message: 'Unauthorized.' });
  try {
    const shop = await db.shops.findOne({ _id: req.user.shop_id });
    res.json(shop);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching shop.' });
  }
});

// 2. Update Shop Details (Photo, timings, profile)
app.put('/api/owner/shop', authenticateToken, async (req, res) => {
  if (req.userRole !== 'owner') return res.status(403).json({ message: 'Unauthorized.' });
  const { shop_name, category, description, address, contact_number, shop_photo, opening_time, closing_time, shop_status } = req.body;
  try {
    const updateData = {};
    if (shop_name) updateData.shop_name = shop_name;
    if (category) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (address) updateData.address = address;
    if (contact_number) updateData.contact_number = contact_number;
    if (shop_photo) updateData.shop_photo = shop_photo;
    if (opening_time) updateData.opening_time = opening_time;
    if (closing_time) updateData.closing_time = closing_time;
    if (shop_status) updateData.shop_status = shop_status;

    await db.shops.updateOne({ _id: req.user.shop_id }, updateData);
    const updated = await db.shops.findOne({ _id: req.user.shop_id });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Error updating profile details.' });
  }
});

// 3. Owner Dashboard Statistics
app.get('/api/owner/dashboard/stats', authenticateToken, async (req, res) => {
  if (req.userRole !== 'owner') return res.status(403).json({ message: 'Unauthorized.' });
  try {
    const shopId = req.user.shop_id;
    const products = await db.products.find({ shop_id: shopId });
    const productIds = products.map(p => p._id);

    // Get stock records
    const stocks = await db.stocks.find({ product_id: { $in: productIds } });
    
    let totalProducts = products.length;
    let inStock = 0;
    let lowStock = 0;
    stocks.forEach(s => {
      if (s.available_quantity > 10) inStock++;
      else if (s.available_quantity > 0) lowStock++;
    });

    const activeDiscounts = await db.discounts.find({ shop_id: shopId });
    const shop = await db.shops.findOne({ _id: shopId });
    const reviews = await db.reviews.find({ shop_id: shopId });

    res.json({
      totalProducts,
      inStock,
      lowStock,
      activeDiscounts: activeDiscounts.length,
      shopStatus: shop ? shop.shop_status : 'Closed',
      totalReviews: reviews.length
    });
  } catch (err) {
    res.status(500).json({ message: 'Error calculating dashboard stats.' });
  }
});

// 4. Products Management (CRUD)
app.get('/api/owner/products', authenticateToken, async (req, res) => {
  if (req.userRole !== 'owner') return res.status(403).json({ message: 'Unauthorized.' });
  try {
    const products = await db.products.find({ shop_id: req.user.shop_id });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Error loading products.' });
  }
});

app.post('/api/owner/products', authenticateToken, async (req, res) => {
  if (req.userRole !== 'owner') return res.status(403).json({ message: 'Unauthorized.' });
  const { product_name, category, price, image, description } = req.body;
  if (!product_name || !category || price === undefined) {
    return res.status(400).json({ message: 'Product name, category, and price are required.' });
  }
  try {
    const product = await db.products.create({
      shop_id: req.user.shop_id,
      product_name,
      category,
      price: parseFloat(price),
      image: image || '',
      description: description || ''
    });

    // Create Stock automatically for this product
    await db.stocks.create({
      product_id: product._id,
      available_quantity: 0,
      unit: 'Piece',
      last_updated: new Date()
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Error adding product.' });
  }
});

app.put('/api/owner/products/:id', authenticateToken, async (req, res) => {
  if (req.userRole !== 'owner') return res.status(403).json({ message: 'Unauthorized.' });
  const { product_name, category, price, image, description } = req.body;
  try {
    const product = await db.products.findOne({ _id: req.params.id, shop_id: req.user.shop_id });
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const updateData = {};
    if (product_name) updateData.product_name = product_name;
    if (category) updateData.category = category;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (image) updateData.image = image;
    if (description !== undefined) updateData.description = description;

    await db.products.updateOne({ _id: req.params.id }, updateData);
    const updated = await db.products.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Error editing product.' });
  }
});

app.delete('/api/owner/products/:id', authenticateToken, async (req, res) => {
  if (req.userRole !== 'owner') return res.status(403).json({ message: 'Unauthorized.' });
  try {
    const product = await db.products.findOne({ _id: req.params.id, shop_id: req.user.shop_id });
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    await db.products.deleteOne({ _id: req.params.id });
    // Also delete Stock record
    await db.stocks.deleteOne({ product_id: req.params.id });

    res.json({ message: 'Product and associated stock record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting product.' });
  }
});

// 5. Stock Management (Decoupled CRUD)
app.get('/api/owner/stock', authenticateToken, async (req, res) => {
  if (req.userRole !== 'owner') return res.status(403).json({ message: 'Unauthorized.' });
  try {
    const products = await db.products.find({ shop_id: req.user.shop_id });
    const productIds = products.map(p => p._id);
    const stocks = await db.stocks.find({ product_id: { $in: productIds } });

    // Map product info onto stock objects
    const mappedStocks = stocks.map(stock => {
      const prod = products.find(p => String(p._id) === String(stock.product_id));
      return {
        ...stock,
        product_name: prod ? prod.product_name : 'Unknown Product',
        category: prod ? prod.category : 'General',
        price: prod ? prod.price : 0
      };
    });

    res.json(mappedStocks);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stock inventory.' });
  }
});

app.put('/api/owner/stock/:productId', authenticateToken, async (req, res) => {
  if (req.userRole !== 'owner') return res.status(403).json({ message: 'Unauthorized.' });
  const { available_quantity, unit } = req.body;
  try {
    const product = await db.products.findOne({ _id: req.params.productId, shop_id: req.user.shop_id });
    if (!product) return res.status(404).json({ message: 'Product does not belong to your shop.' });

    const updateData = { last_updated: new Date() };
    if (available_quantity !== undefined) updateData.available_quantity = parseInt(available_quantity);
    if (unit) updateData.unit = unit;

    await db.stocks.updateOne({ product_id: req.params.productId }, updateData);
    const updated = await db.stocks.findOne({ product_id: req.params.productId });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update stock records.' });
  }
});

// 6. Discount Management (CRUD)
app.get('/api/owner/discounts', authenticateToken, async (req, res) => {
  if (req.userRole !== 'owner') return res.status(403).json({ message: 'Unauthorized.' });
  try {
    const discounts = await db.discounts.find({ shop_id: req.user.shop_id });
    res.json(discounts);
  } catch (err) {
    res.status(500).json({ message: 'Error loading discounts.' });
  }
});

app.post('/api/owner/discounts', authenticateToken, async (req, res) => {
  if (req.userRole !== 'owner') return res.status(403).json({ message: 'Unauthorized.' });
  const { title, percentage, description, start_date, end_date } = req.body;
  if (!title || percentage === undefined) {
    return res.status(400).json({ message: 'Title and percentage are required.' });
  }
  try {
    const discount = await db.discounts.create({
      shop_id: req.user.shop_id,
      title,
      percentage: parseInt(percentage),
      description: description || '',
      start_date: start_date || new Date(),
      end_date: end_date || null
    });
    res.status(201).json(discount);
  } catch (err) {
    res.status(500).json({ message: 'Error adding discount.' });
  }
});

app.delete('/api/owner/discounts/:id', authenticateToken, async (req, res) => {
  if (req.userRole !== 'owner') return res.status(403).json({ message: 'Unauthorized.' });
  try {
    const discount = await db.discounts.findOne({ _id: req.params.id, shop_id: req.user.shop_id });
    if (!discount) return res.status(404).json({ message: 'Campaign not found.' });

    await db.discounts.deleteOne({ _id: req.params.id });
    res.json({ message: 'Discount deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting discount.' });
  }
});

// 7. Get Owner Reviews
app.get('/api/owner/reviews', authenticateToken, async (req, res) => {
  if (req.userRole !== 'owner') return res.status(403).json({ message: 'Unauthorized.' });
  try {
    const reviews = await db.reviews.find({ shop_id: req.user.shop_id });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Error loading reviews.' });
  }
});


// --- CUSTOMER / USER APIS ---

// 1. Get all shops
app.get('/api/customer/shops', async (req, res) => {
  try {
    const shops = await db.shops.find({});
    // Enrich with discounts and reviews count/average
    const enriched = [];
    for (const shop of shops) {
      const activeDiscount = await db.discounts.findOne({ shop_id: shop._id });
      const reviews = await db.reviews.find({ shop_id: shop._id });
      const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 'N/A';
      
      enriched.push({
        ...shop,
        active_discount: activeDiscount,
        reviews_count: reviews.length,
        avg_rating: avgRating
      });
    }
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load shops.' });
  }
});

// 2. Get single shop profile along with products, stock and discounts
app.get('/api/customer/shops/:id', async (req, res) => {
  try {
    const shop = await db.shops.findOne({ _id: req.params.id });
    if (!shop) return res.status(404).json({ message: 'Shop not found.' });

    const activeDiscount = await db.discounts.findOne({ shop_id: shop._id });
    const products = await db.products.find({ shop_id: shop._id });
    
    // Map stock status onto products
    const productIds = products.map(p => p._id);
    const stocks = await db.stocks.find({ product_id: { $in: productIds } });
    
    const enrichedProducts = products.map(p => {
      const stk = stocks.find(s => String(s.product_id) === String(p._id));
      let status = 'Out of Stock';
      let qty = 0;
      let unit = 'Piece';
      if (stk) {
        qty = stk.available_quantity;
        unit = stk.unit;
        if (qty > 10) status = 'Available';
        else if (qty > 0) status = 'Low Stock';
      }
      return {
        ...p,
        available_quantity: qty,
        unit,
        availability_status: status
      };
    });

    const reviews = await db.reviews.find({ shop_id: shop._id });
    const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 'N/A';

    res.json({
      shop,
      active_discount: activeDiscount,
      products: enrichedProducts,
      reviews,
      avg_rating: avgRating
    });
  } catch (err) {
    res.status(500).json({ message: 'Error loading shop detail profile.' });
  }
});

// 3. Customer Leave a Review
app.post('/api/customer/shops/:id/reviews', authenticateToken, async (req, res) => {
  if (req.userRole !== 'customer') return res.status(403).json({ message: 'Only logged-in customers can leave reviews.' });
  const { rating, review } = req.body;
  if (!rating || !review) {
    return res.status(400).json({ message: 'Rating and review message are required.' });
  }
  try {
    const newReview = await db.reviews.create({
      shop_id: req.params.id,
      customer_name: req.user.name,
      rating: parseInt(rating),
      review,
      review_date: new Date()
    });
    res.status(201).json(newReview);
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit review.' });
  }
});


// Start server and connect DB
const startServer = async () => {
  await db.connectDB();
  app.listen(PORT, () => {
    console.log(`Smart Shop Hub running on port ${PORT}`);
  });
};

startServer();
