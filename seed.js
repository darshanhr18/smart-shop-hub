const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  await db.connectDB();

  console.log('Clearing database/JSON files...');
  if (db.isMongo()) {
    const mongoose = require('mongoose');
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    console.log('MongoDB collections cleared.');
  } else {
    const fs = require('fs');
    const path = require('path');
    const DATA_DIR = path.join(__dirname, 'data');
    if (fs.existsSync(DATA_DIR)) {
      const files = ['customers.json', 'owners.json', 'shops.json', 'products.json', 'stocks.json', 'discounts.json', 'reviews.json'];
      files.forEach(f => {
        fs.writeFileSync(path.join(DATA_DIR, f), JSON.stringify([], null, 2));
      });
    }
    console.log('Local JSON data cleared.');
  }

  const commonPasswordHash = await bcrypt.hash('owner123', 10);
  const bobPasswordHash = await bcrypt.hash('bob123', 10);
  const alicePasswordHash = await bcrypt.hash('alice123', 10);
  const charliePasswordHash = await bcrypt.hash('charlie123', 10);

  console.log('Seeding Customers...');
  const customerPasswordHash = await bcrypt.hash('darsh123', 10);
  await db.customers.create({
    name: 'Darsh H',
    mobile: '9876543210',
    email: 'darshh@example.com',
    password: customerPasswordHash
  });

  console.log('Seeding Shop Owners & Shops for all 10 Categories...');

  const shopsToSeed = [
    {
      category: "Grocery",
      shop_name: "Fresh Mart",
      description: "Organic fresh produce, grains, pulses, dairy, and household items.",
      address: "Koramangala, Bengaluru",
      contact_number: "8888888888",
      shop_photo: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400",
      opening_time: "07:00 AM",
      closing_time: "10:00 PM",
      status: "Open",
      owner: { name: 'Bob', mobile: '8888888888', email: 'bob@example.com', pass: bobPasswordHash, approved: true },
      products: [
        { name: "Milk", price: 30.00, qty: 30, unit: "Litre", img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=200", desc: "Fresh pasteurized whole milk - 1L packet" },
        { name: "Rice", price: 50.00, qty: 5, unit: "Kg", img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=200", desc: "Premium Basmati Rice - 1 Kg packet" },
        { name: "Sunflower Oil", price: 160.00, qty: 12, unit: "Litre", img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=200", desc: "Pure refined sunflower oil - 1L bottle" }
      ]
    },
    {
      category: "Medical",
      shop_name: "MedPlus Pharmacy",
      description: "Prescription medicines, health supplements, hygiene supplies, and first aid.",
      address: "Brigade Road, Bengaluru",
      contact_number: "7777777777",
      shop_photo: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400",
      opening_time: "08:00 AM",
      closing_time: "11:00 PM",
      status: "Open",
      owner: { name: 'Alice', mobile: '7777777777', email: 'alice@example.com', pass: alicePasswordHash, approved: true },
      products: [
        { name: "Vitamin C Tablets", price: 250.00, qty: 45, unit: "Piece", img: "https://images.unsplash.com/photo-1616671276441-2f4c17600b4a?auto=format&fit=crop&q=80&w=200", desc: "Immunity booster capsules - 60 counts" },
        { name: "Emergency First Aid Kit", price: 490.00, qty: 4, unit: "Piece", img: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&q=80&w=200", desc: "Compact travel emergency kit" }
      ]
    },
    {
      category: "Bakery",
      shop_name: "Sweet Treats Bakery",
      description: "Freshly baked cakes, croissants, pastries, artisanal sourdough, and cookies.",
      address: "Indiranagar, Bengaluru",
      contact_number: "8881112222",
      shop_photo: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400",
      opening_time: "07:30 AM",
      closing_time: "09:30 PM",
      status: "Open",
      owner: { name: 'Sarah', mobile: '8881112222', email: 'sarah@example.com', pass: commonPasswordHash, approved: true },
      products: [
        { name: "Sourdough Bread", price: 90.00, qty: 15, unit: "Piece", img: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&q=80&w=200", desc: "Artisanal crusty sourdough loaf" },
        { name: "Chocolate Croissant", price: 65.00, qty: 20, unit: "Piece", img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=200", desc: "Flaky puff pastry stuffed with dark chocolate" }
      ]
    },
    {
      category: "Electronics",
      shop_name: "Charlie's Tech Corner",
      description: "Premium headphones, smartwatches, computer cables, and repair services.",
      address: "Richmond Town, Bengaluru",
      contact_number: "6666666666",
      shop_photo: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400",
      opening_time: "10:00 AM",
      closing_time: "09:00 PM",
      status: "Closed",
      owner: { name: 'Charlie', mobile: '6666666666', email: 'charlie@example.com', pass: charliePasswordHash, approved: false }, // Pending approval!
      products: [
        { name: "Wireless Headphones", price: 2999.00, qty: 8, unit: "Piece", img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=200", desc: "Active Noise Cancelling Bluetooth headphones" },
        { name: "Smart Fitness Band", price: 1999.00, qty: 12, unit: "Piece", img: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&q=80&w=200", desc: "Daily step tracker with heart rate monitor" }
      ]
    },
    {
      category: "Clothing",
      shop_name: "Fashion Hub Boutique",
      description: "Modern clothing, denims, casual wear, and traditional outfits.",
      address: "Commercial Street, Bengaluru",
      contact_number: "8882223333",
      shop_photo: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&q=80&w=400",
      opening_time: "10:30 AM",
      closing_time: "09:30 PM",
      status: "Open",
      owner: { name: 'David', mobile: '8882223333', email: 'david@example.com', pass: commonPasswordHash, approved: true },
      products: [
        { name: "Casual Cotton T-Shirt", price: 599.00, qty: 40, unit: "Piece", img: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=200", desc: "100% breathable organic cotton tee" },
        { name: "Slim Fit Blue Jeans", price: 1499.00, qty: 25, unit: "Piece", img: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=200", desc: "Stretchable indigo blue denim jeans" }
      ]
    },
    {
      category: "Hardware",
      shop_name: "Tools & Hardware Supplies",
      description: "Construction materials, power tools, plumbing fixtures, and locks.",
      address: "Peenya Industrial Area, Bengaluru",
      contact_number: "8883334444",
      shop_photo: "https://images.unsplash.com/photo-1581244904349-634281ec06eb?auto=format&fit=crop&q=80&w=400",
      opening_time: "08:30 AM",
      closing_time: "08:00 PM",
      status: "Open",
      owner: { name: 'George', mobile: '8883334444', email: 'george@example.com', pass: commonPasswordHash, approved: true },
      products: [
        { name: "Steel Hammer", price: 280.00, qty: 15, unit: "Piece", img: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&q=80&w=200", desc: "Heavy duty drop-forged steel claw hammer" },
        { name: "Screwdriver 6-Piece Set", price: 450.00, qty: 20, unit: "Piece", img: "https://images.unsplash.com/photo-1530124560672-99988549dec5?auto=format&fit=crop&q=80&w=200", desc: "Multi-bit magnetic screwdriver tool set" }
      ]
    },
    {
      category: "Stationery",
      shop_name: "Pencils & Paper Stationery",
      description: "Notebooks, printing paper, design markers, school bags, and planners.",
      address: "Jayanagar, Bengaluru",
      contact_number: "8884445555",
      shop_photo: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=400",
      opening_time: "09:00 AM",
      closing_time: "09:00 PM",
      status: "Open",
      owner: { name: 'Emily', mobile: '8884445555', email: 'emily@example.com', pass: commonPasswordHash, approved: true },
      products: [
        { name: "Leather Cover Journal", price: 350.00, qty: 30, unit: "Piece", img: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=200", desc: "A5 lined notebook with vintage leather strap" },
        { name: "Fine Liner Fineline Pens (12 pack)", price: 290.00, qty: 15, unit: "Packet", img: "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&q=80&w=200", desc: "0.4mm colored fine point sketch markers" }
      ]
    },
    {
      category: "Restaurants",
      shop_name: "City Diner Restaurant",
      description: "Quick fast foods, burgers, loaded cheese fries, and milkshakes.",
      address: "Koramangala 5th Block, Bengaluru",
      contact_number: "8885556666",
      shop_photo: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=400",
      opening_time: "11:00 AM",
      closing_time: "11:00 PM",
      status: "Busy",
      owner: { name: 'Chef Max', mobile: '8885556666', email: 'max@example.com', pass: commonPasswordHash, approved: true },
      products: [
        { name: "Double Cheese Chicken Burger", price: 220.00, qty: 50, unit: "Piece", img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=200", desc: "Grilled chicken patties with cheddar slices & fries" },
        { name: "Classic Strawberry Milkshake", price: 140.00, qty: 40, unit: "Piece", img: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&q=80&w=200", desc: "Thick fresh strawberry milkshake with whipped cream" }
      ]
    },
    {
      category: "Fruits & Vegetables",
      shop_name: "Green Grocer Farm Fresh",
      description: "Fresh farm picked fruits, leafy greens, root vegetables, and berries.",
      address: "Malleswaram, Bengaluru",
      contact_number: "8886667777",
      shop_photo: "https://images.unsplash.com/photo-1610348725531-843dff14a9da?auto=format&fit=crop&q=80&w=400",
      opening_time: "06:00 AM",
      closing_time: "08:30 PM",
      status: "Open",
      owner: { name: 'Raju', mobile: '8886667777', email: 'raju@example.com', pass: commonPasswordHash, approved: true },
      products: [
        { name: "Crisp Red Apples", price: 180.00, qty: 3, unit: "Kg", img: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=200", desc: "Sweet organic apples directly from Shimla orchard" },
        { name: "Fresh Broccoli", price: 90.00, qty: 15, unit: "Kg", img: "https://images.unsplash.com/photo-1515671981137-778d067a118a?auto=format&fit=crop&q=80&w=200", desc: "Freshly harvested green broccoli crowns" }
      ]
    },
    {
      category: "Other",
      shop_name: "General Convenience Shop",
      description: "Utility items, batteries, beverages, chocolates, and daily papers.",
      address: "Ulsoor, Bengaluru",
      contact_number: "8887779999",
      shop_photo: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=400",
      opening_time: "08:00 AM",
      closing_time: "10:30 PM",
      status: "Open",
      owner: { name: 'Karan', mobile: '8887779999', email: 'karan@example.com', pass: commonPasswordHash, approved: true },
      products: [
        { name: "AA Alkaline Batteries (4 Pack)", price: 120.00, qty: 50, unit: "Packet", img: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=200", desc: "Long-lasting daily utility batteries" }
      ]
    }
  ];

  for (const item of shopsToSeed) {
    console.log(`Seeding: ${item.shop_name} (${item.category})...`);
    
    // 1. Create shop
    const shop = await db.shops.create({
      shop_name: item.shop_name,
      category: item.category,
      description: item.description,
      address: item.address,
      contact_number: item.contact_number,
      shop_photo: item.shop_photo,
      shop_photos: item.shop_photos || [],
      opening_time: item.opening_time,
      closing_time: item.closing_time,
      shop_status: item.status
    });

    // 2. Create owner
    await db.owners.create({
      owner_name: item.owner.name,
      mobile: item.owner.mobile,
      email: item.owner.email,
      password: item.owner.pass,
      shop_id: shop._id,
      approved: item.owner.approved
    });

    // 3. Create products & stock
    for (const p of item.products) {
      const prod = await db.products.create({
        shop_id: shop._id,
        product_name: p.name,
        category: item.category,
        price: p.price,
        image: p.img,
        description: p.desc
      });

      await db.stocks.create({
        product_id: prod._id,
        available_quantity: p.qty,
        unit: p.unit,
        last_updated: new Date()
      });
    }
  }

  // Seed discounts for Fresh Mart (Bob)
  const freshMart = await db.shops.findOne({ shop_name: "Fresh Mart" });
  await db.discounts.create({
    shop_id: freshMart._id,
    title: "20% OFF On all Grocery Items",
    percentage: 20,
    description: "Festival Discount Campaign applied to your grocery catalog.",
    start_date: new Date(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

  // Seed reviews for Fresh Mart
  const reviews = [
    {
      shop_id: freshMart._id,
      customer_name: "Rohit Sharma",
      rating: 5,
      review: "Very good shop. All items are available at a reasonable price.",
      review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      shop_id: freshMart._id,
      customer_name: "Ananya Reddy",
      rating: 4,
      review: "Good quality products and friendly staff.",
      review_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      shop_id: freshMart._id,
      customer_name: "Karthik P",
      rating: 5,
      review: "My go to place for groceries.",
      review_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
  ];

  for (const r of reviews) {
    await db.reviews.create(r);
  }

  console.log('\n=========================================');
  console.log('Seeding completed successfully!');
  console.log(`Customer Account: Darsh H (Mobile: 9876543210 / Password: darsh123)`);
  console.log(`Pre-seeded owner accounts are configured with password 'owner123'`);
  console.log(`Except Bob (bob123), Alice (alice123), and Charlie (charlie123)`);
  console.log('=========================================\n');

  if (db.isMongo()) {
    const mongoose = require('mongoose');
    await mongoose.connection.close();
  }
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
