const http = require('http');

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function makeRequest(url, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : {}
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING VERIFICATION TESTS FOR NEW CUSTOMER & OWNER APIS ---');

  try {
    // 1. Verify Customer Registration & Login
    console.log('\nTesting: POST /api/auth/customer/login');
    const custLoginRes = await makeRequest(`${BASE_URL}/api/auth/customer/login`, 'POST', {
      mobile: '9876543210',
      password: 'darsh123'
    });

    let customerToken = '';
    if (custLoginRes.statusCode === 200 && custLoginRes.body.token) {
      customerToken = custLoginRes.body.token;
      console.log('✓ Customer login successful. Received token.');
    } else {
      throw new Error(`Customer login failed. Status: ${custLoginRes.statusCode}`);
    }

    // 2. Verify Customer Shop Listing
    console.log('\nTesting: GET /api/customer/shops');
    const shopsRes = await makeRequest(`${BASE_URL}/api/customer/shops`);
    let shopId = '';
    if (shopsRes.statusCode === 200 && Array.isArray(shopsRes.body)) {
      console.log(`✓ GET /api/customer/shops returned ${shopsRes.body.length} shops.`);
      shopId = shopsRes.body[0]._id;
    } else {
      throw new Error(`Failed to load customer shops. Status: ${shopsRes.statusCode}`);
    }

    // 3. Verify Customer Shop Detail Profile
    console.log(`\nTesting: GET /api/customer/shops/${shopId}`);
    const shopDetailRes = await makeRequest(`${BASE_URL}/api/customer/shops/${shopId}`);
    if (shopDetailRes.statusCode === 200 && shopDetailRes.body.products) {
      console.log(`✓ GET /api/customer/shops/:id returned details successfully.`);
      console.log(`  Shop: "${shopDetailRes.body.shop.shop_name}"`);
      console.log(`  Avg rating: "${shopDetailRes.body.avg_rating}"`);
      console.log(`  Discounts: "${shopDetailRes.body.active_discount?.title || 'None'}"`);
      console.log(`  Products count: ${shopDetailRes.body.products.length}`);
    } else {
      throw new Error(`Failed to fetch shop details. Status: ${shopDetailRes.statusCode}`);
    }

    // 4. Verify Owner Auth & Approvals Check
    console.log('\nTesting: POST /api/auth/owner/login');
    const ownerLoginRes = await makeRequest(`${BASE_URL}/api/auth/owner/login`, 'POST', {
      mobile: '8888888888',
      password: 'bob123'
    });

    let ownerToken = '';
    if (ownerLoginRes.statusCode === 200 && ownerLoginRes.body.token) {
      ownerToken = ownerLoginRes.body.token;
      console.log('✓ Owner login successful (approved account). Received token.');
    } else {
      throw new Error(`Owner login failed. Status: ${ownerLoginRes.statusCode}`);
    }

    // 5. Verify Owner Dashboard Stats Calculation
    console.log('\nTesting: GET /api/owner/dashboard/stats');
    const statsRes = await makeRequest(`${BASE_URL}/api/owner/dashboard/stats`, 'GET', null, {
      'Authorization': `Bearer ${ownerToken}`
    });
    if (statsRes.statusCode === 200 && statsRes.body.totalProducts !== undefined) {
      console.log('✓ Owner Dashboard Stats loaded successfully.');
      console.log(`  Total Products: ${statsRes.body.totalProducts}`);
      console.log(`  In Stock: ${statsRes.body.inStock}`);
      console.log(`  Low Stock: ${statsRes.body.lowStock}`);
      console.log(`  Shop status: "${statsRes.body.shopStatus}"`);
    } else {
      throw new Error(`Failed to load dashboard stats. Status: ${statsRes.statusCode}`);
    }

    // 6. Verify Stock Management Decoupled API
    console.log('\nTesting: GET /api/owner/stock');
    const stockRes = await makeRequest(`${BASE_URL}/api/owner/stock`, 'GET', null, {
      'Authorization': `Bearer ${ownerToken}`
    });
    if (stockRes.statusCode === 200 && Array.isArray(stockRes.body)) {
      console.log(`✓ Owner decoupled Stock List returned ${stockRes.body.length} stock records.`);
      console.log(`  Record 0: product: "${stockRes.body[0].product_name}", stock: ${stockRes.body[0].available_quantity} ${stockRes.body[0].unit}`);
    } else {
      throw new Error(`Failed to fetch stocks. Status: ${stockRes.statusCode}`);
    }

    console.log('\n=============================================');
    console.log('ALL API ENDPOINTS VERIFIED SUCCESSFULLY!');
    console.log('=============================================');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ VERIFICATION TEST FAILED:', err.message);
    process.exit(1);
  }
}

// Start testing
setTimeout(() => {
  runTests();
}, 2000);
