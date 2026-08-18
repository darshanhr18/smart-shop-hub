// --- SHOP OWNER APP LOGIC ---

let token = localStorage.getItem('owner_token') || null;
let currentUser = null;
let currentShop = null;
let activeTab = 'dashboard';
let allProducts = [];
let allStocks = [];
let allDiscounts = [];
let allReviews = [];
let pendingOwners = [];
let activeUploadedBase64 = {}; // holds base64 file buffers
let selectedShopPhotos = []; // photos selected in the Shop Photos screen

function authHeaders(includeJson = false) {
  const headers = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

document.addEventListener('DOMContentLoaded', () => {
  initAppFlow();
});

// App Startup Flow
async function initAppFlow() {
  if (token) {
    const verified = await verifyToken();
    if (verified) {
      showDashboard();
    } else {
      goToAuthScreen();
    }
  } else {
    goToAuthScreen();
  }
}

// Token Verification
async function verifyToken() {
  try {
    const res = await fetch('/api/auth/owner/me', {
      headers: authHeaders()
    });
    if (res.status === 200) {
      const data = await res.json();
      currentUser = data.user;
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

function showScreen(screenId) {
  document.querySelectorAll('.screen-view').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${screenId}`).classList.add('active');

  const navBar = document.getElementById('app-nav-bar');
  if (screenId === 'auth') {
    navBar.style.display = 'none';
  } else {
    navBar.style.display = 'flex';
  }
}

function goToAuthScreen() {
  showScreen('auth');
  switchAuthTab('login');
}

function showDashboard() {
  document.getElementById('app-nav-bar').style.display = 'flex';
  switchDashboardTab('dashboard');
}

// Auth Tab switching
function switchAuthTab(tab) {
  document.getElementById('auth-error').style.display = 'none';
  
  if (tab === 'login') {
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-register').classList.remove('active');
    document.getElementById('owner-login-form').style.display = 'block';
    document.getElementById('owner-register-form').style.display = 'none';
  } else {
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-register').classList.add('active');
    document.getElementById('owner-login-form').style.display = 'none';
    document.getElementById('owner-register-form').style.display = 'block';
  }
}

// Image File Upload Base64 Converter Utility
function triggerFileInput(fileInputId) {
  document.getElementById(fileInputId).click();
}

function handleImageUpload(inputElement, previewImgId) {
  const file = inputElement.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Str = e.target.result;
    document.getElementById(previewImgId).src = base64Str;
    activeUploadedBase64[previewImgId] = base64Str; // cache base64
  };
  reader.readAsDataURL(file);
}

// --- AUTH SUBMISSIONS ---

async function handleOwnerLogin(e) {
  e.preventDefault();
  const mobile = document.getElementById('login-mobile').value;
  const pass = document.getElementById('login-pass').value;
  const errBox = document.getElementById('auth-error');

  try {
    const res = await fetch('/api/auth/owner/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, password: pass })
    });
    const data = await res.json();

    if (res.status === 200) {
      token = data.token;
      currentUser = data.user;
      localStorage.setItem('owner_token', token);
      showDashboard();
    } else {
      errBox.innerText = data.message || 'Login failed.';
      errBox.style.display = 'block';
    }
  } catch (err) {
    errBox.innerText = 'Connection error.';
    errBox.style.display = 'block';
  }
}

async function handleOwnerRegister(e) {
  e.preventDefault();
  const owner_name = document.getElementById('reg-owner-name').value;
  const mobile = document.getElementById('reg-mobile').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-pass').value;
  const confirmPassword = document.getElementById('reg-pass-confirm').value;
  const shop_name = document.getElementById('reg-shop-name').value;
  const category = document.getElementById('reg-category').value;
  const address = document.getElementById('reg-address').value;
  const shop_photo = activeUploadedBase64['reg-photo-preview'] || '';
  const errBox = document.getElementById('auth-error');

  if (password !== confirmPassword) {
    errBox.innerText = 'Passwords do not match.';
    errBox.style.display = 'block';
    return;
  }

  try {
    const res = await fetch('/api/auth/owner/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_name,
        mobile,
        email,
        password,
        shop_name,
        category,
        address,
        shop_photo
      })
    });
    const data = await res.json();
    if (res.status === 201) {
      alert('Registration request submitted! Please approve using the Admin Console panel on top to log in.');
      switchAuthTab('login');
      // Pre-fill login mobile
      document.getElementById('login-mobile').value = mobile;
    } else {
      errBox.innerText = data.message || 'Registration failed.';
      errBox.style.display = 'block';
    }
  } catch (err) {
    errBox.innerText = 'Connection error.';
    errBox.style.display = 'block';
  }
}

function handleOwnerLogout() {
  token = null;
  currentUser = null;
  currentShop = null;
  localStorage.removeItem('owner_token');
  goToAuthScreen();
}

// --- ADMIN BYPASS PANEL ---

async function openAdminConsole() {
  try {
    const res = await fetch('/api/admin/pending');
    pendingOwners = await res.json();
    
    const container = document.getElementById('admin-pending-list');
    container.innerHTML = '';

    if (pendingOwners.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:20px;">No pending owners to approve.</div>`;
    } else {
      pendingOwners.forEach(owner => {
        const row = document.createElement('div');
        row.className = 'glass-shop-card';
        row.style.padding = '10px';
        row.innerHTML = `
          <div style="flex:1; font-size:12px;">
            <strong>${owner.owner_name}</strong> (${owner.mobile})<br>
            <span style="color:var(--text-muted);">Status: Pending</span>
          </div>
          <button class="btn-theme btn-small" style="padding:4px 8px; font-size:11px; border-radius:6px; background:#10b981;" onclick="approveOwner('${owner._id}')">Approve</button>
        `;
        container.appendChild(row);
      });
    }

    document.getElementById('admin-modal').style.display = 'flex';
  } catch (err) {
    alert('Failed to load pending registrations.');
  }
}

function closeAdminConsole() {
  document.getElementById('admin-modal').style.display = 'none';
}

async function approveOwner(ownerId) {
  try {
    const res = await fetch(`/api/admin/approve/${ownerId}`, {
      method: 'POST'
    });
    if (res.status === 200) {
      alert('Owner approved successfully! They can log in now.');
      openAdminConsole(); // refresh list
    }
  } catch (err) {
    alert('Approval submission error.');
  }
}

// --- DASHBOARD TAB CHANGER ---

function switchDashboardTab(tabId) {
  activeTab = tabId;
  
  // Bottom menu highlight updates
  document.querySelectorAll('.phone-nav-bar .nav-item').forEach(item => item.classList.remove('active'));
  const btn = document.getElementById(`nav-btn-${tabId}`);
  if (btn) btn.classList.add('active');

  // Activate screen view
  showScreen(tabId);

  // Trigger data loaders
  if (tabId === 'dashboard') loadDashboardData();
  else if (tabId === 'orders') loadOrdersData();
  else if (tabId === 'stock') loadStockData();
  else if (tabId === 'offers') loadOffersData();
  else if (tabId === 'photos') loadPhotosData();
  else if (tabId === 'hours') loadHoursData();
  else if (tabId === 'reviews') loadReviewsData();
  else if (tabId === 'location') loadLocationData();
  else if (tabId === 'profile') loadSettingsData();
}

// Load Home Dashboard Summary Card details
async function loadDashboardData() {
  try {
    // 1. Fetch shop profile
    const shopRes = await fetch('/api/owner/shop', {
      headers: authHeaders()
    });
    currentShop = await shopRes.json();
    const titleEl = document.getElementById('dash-shop-title');
    if (titleEl) titleEl.innerText = currentShop.shop_name || 'Sri Lakshmi Stores';

    const addrEl = document.getElementById('dashboard-shop-address-photo');
    if (addrEl) addrEl.innerText = currentShop.address || 'Sindhanur';

    const statusSelect = document.getElementById('dash-status-select');
    if (statusSelect) statusSelect.value = currentShop.shop_status || 'Open';

    const statusDisp = document.getElementById('dash-status-display');
    if (statusDisp) {
      const status = currentShop.shop_status || 'Open';
      if (status === 'Closed') {
        statusDisp.innerText = '🔴 SHOP CLOSED';
        statusDisp.style.color = '#ef4444';
      } else if (status === 'Busy') {
        statusDisp.innerText = '🟡 LIMITED AVAILABILITY';
        statusDisp.style.color = '#f59e0b';
      } else {
        statusDisp.innerText = '🟢 SHOP OPEN';
        statusDisp.style.color = '#10b981';
      }
    }

    // 2. Fetch dashboard stats
    const statsRes = await fetch('/api/owner/dashboard/stats', {
      headers: authHeaders()
    });
    const stats = await statsRes.json();
    
    const totalProdEl = document.getElementById('stat-total-products');
    if (totalProdEl) totalProdEl.innerText = stats.totalProducts || 0;

    const availProdEl = document.getElementById('stat-available-products');
    if (availProdEl) availProdEl.innerText = stats.inStock || 0;

    // 3. Fetch orders metrics for total orders and total revenue
    const ordersRes = await fetch('/api/owner/orders', { headers: authHeaders() });
    const orders = await ordersRes.json();
    if (Array.isArray(orders)) {
      const totalOrdEl = document.getElementById('stat-total-orders');
      if (totalOrdEl) totalOrdEl.innerText = orders.length;

      const revenue = orders.filter(o => o.order_status !== 'Cancelled').reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const totalRevEl = document.getElementById('stat-total-revenue');
      if (totalRevEl) totalRevEl.innerText = `₹${revenue.toFixed(0)}`;
    }

  } catch (err) {
    console.error(err);
  }
}

async function loadOrdersData() {
  const container = document.getElementById('owner-orders-container');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">Loading incoming orders...</div>`;

  try {
    const res = await fetch('/api/owner/orders', { headers: authHeaders() });
    const orders = await res.json();

    if (!Array.isArray(orders) || orders.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
          <i class="fa-solid fa-receipt" style="font-size:42px; color:var(--border-color); margin-bottom:12px;"></i>
          <h4 style="font-size:16px; font-weight:700; color:var(--text-main); margin-bottom:4px;">No Orders Received Yet</h4>
          <p style="font-size:12px;">Incoming customer orders will appear here in real-time.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = orders.map(ord => {
      const orderIdShort = String(ord._id).slice(-6).toUpperCase();
      const dateStr = new Date(ord.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

      let statusColor = '#3b82f6';
      let statusBg = 'rgba(59,130,246,0.12)';
      if (ord.order_status === 'Pending') { statusColor = '#f59e0b'; statusBg = 'rgba(245,158,11,0.12)'; }
      else if (ord.order_status === 'Accepted' || ord.order_status === 'Preparing') { statusColor = '#3b82f6'; statusBg = 'rgba(59,130,246,0.12)'; }
      else if (ord.order_status === 'Ready' || ord.order_status === 'Completed') { statusColor = '#10b981'; statusBg = 'rgba(16,185,129,0.12)'; }
      else if (ord.order_status === 'Cancelled') { statusColor = '#ef4444'; statusBg = 'rgba(239,68,68,0.12)'; }

      const itemsHtml = ord.items.map(i => `
        <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
          <span>${i.product_name} × ${i.quantity} ${i.unit || 'Piece'}</span>
          <strong>₹${(i.price * i.quantity).toFixed(2)}</strong>
        </div>
      `).join('');

      let actionButtons = '';
      if (ord.order_status === 'Pending') {
        actionButtons = `
          <button class="btn-theme btn-small" style="background:#10b981; color:white; padding:6px 12px; font-size:12px; border-radius:10px; border:none; cursor:pointer;" onclick="updateOrderStatus('${ord._id}', 'Accepted')">Accept Order</button>
          <button class="btn-theme btn-small" style="background:#ef4444; color:white; padding:6px 12px; font-size:12px; border-radius:10px; border:none; cursor:pointer;" onclick="updateOrderStatus('${ord._id}', 'Cancelled')">Reject</button>
        `;
      } else if (ord.order_status === 'Accepted') {
        actionButtons = `
          <button class="btn-theme btn-small" style="background:#3b82f6; color:white; padding:6px 12px; font-size:12px; border-radius:10px; border:none; cursor:pointer;" onclick="updateOrderStatus('${ord._id}', 'Preparing')">Mark Preparing</button>
        `;
      } else if (ord.order_status === 'Preparing') {
        actionButtons = `
          <button class="btn-theme btn-small" style="background:#8b5cf6; color:white; padding:6px 12px; font-size:12px; border-radius:10px; border:none; cursor:pointer;" onclick="updateOrderStatus('${ord._id}', 'Ready')">Mark Ready</button>
        `;
      } else if (ord.order_status === 'Ready') {
        actionButtons = `
          <button class="btn-theme btn-small" style="background:#10b981; color:white; padding:6px 12px; font-size:12px; border-radius:10px; border:none; cursor:pointer;" onclick="updateOrderStatus('${ord._id}', 'Completed')">Complete Order</button>
        `;
      }

      return `
        <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:18px; padding:16px; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div>
              <strong style="font-size:15px; color:var(--text-main);">Order #${orderIdShort}</strong>
              <div style="font-size:11px; color:var(--text-muted);">${dateStr} • ${ord.order_type}</div>
            </div>
            <span style="background:${statusBg}; color:${statusColor}; font-weight:800; font-size:12px; padding:4px 10px; border-radius:12px;">${ord.order_status}</span>
          </div>

          <div style="background:#ffffff; border:1px solid var(--border-color); border-radius:12px; padding:12px; margin-bottom:10px;">
            <div style="font-size:12px; font-weight:700; color:var(--text-muted); margin-bottom:4px;">Customer Details:</div>
            <div style="font-size:13px; font-weight:700; color:var(--text-main);">${ord.customer_name || 'Customer'} (${ord.customer_mobile || 'No Mobile'})</div>
            ${ord.delivery_address ? `<div style="font-size:12px; color:var(--text-muted); margin-top:2px;">📍 ${ord.delivery_address}</div>` : ''}
          </div>

          <div style="border-top:1px dashed var(--border-color); padding-top:10px; margin-bottom:10px;">
            ${itemsHtml}
            <div style="display:flex; justify-content:space-between; font-size:15px; font-weight:800; color:var(--primary-purple); margin-top:8px; border-top:1px solid var(--border-color); padding-top:6px;">
              <span>Total Amount</span>
              <span>₹${Number(ord.total_amount).toFixed(2)}</span>
            </div>
          </div>

          ${actionButtons ? `<div style="display:flex; gap:8px; justify-content:flex-end;">${actionButtons}</div>` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div style="text-align:center; color:#ef4444; padding:20px;">Error loading orders.</div>`;
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    const res = await fetch(`/api/owner/orders/${orderId}/status`, {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify({ status })
    });
    if (res.status === 200) {
      loadOrdersData();
      loadDashboardData();
    } else {
      alert('Failed to update status.');
    }
  } catch (err) {
    alert('Network error updating status.');
  }
}

async function updateShopStatus() {
  const status = document.getElementById('dash-status-select').value;
  try {
    const res = await fetch('/api/owner/shop', {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify({ shop_status: status })
    });
    if (res.status === 200) {
      alert(`Shop status updated to: ${status}`);
      loadDashboardData();
    }
  } catch (err) {
    alert('Failed to update status.');
  }
}

// --- DECOUPLED STOCK LOGIC ---

async function loadStockData() {
  try {
    // Fetch products
    const prodRes = await fetch('/api/owner/products', {
      headers: authHeaders()
    });
    allProducts = await prodRes.json();

    // Fetch decoupled stock items
    const stockRes = await fetch('/api/owner/stock', {
      headers: authHeaders()
    });
    allStocks = await stockRes.json();

    renderStockTable();
  } catch (err) {
    console.error(err);
  }
}

function renderStockTable() {
  const container = document.getElementById('stock-list-container');
  if (!container) return;
  container.innerHTML = '';

  const searchInput = document.getElementById('stock-search-input');
  const searchQ = (searchInput?.value || '').trim().toLowerCase();
  const products = Array.isArray(allProducts) ? allProducts : [];
  const stocks = Array.isArray(allStocks) ? allStocks : [];

  // Calculate summary from the current catalog.
  let availableCount = 0;
  let lowCount = 0;
  let outCount = 0;

  products.forEach(prod => {
    const stock = stocks.find(s => String(s.product_id) === String(prod._id));
    const qty = Number(stock?.available_quantity ?? 0);
    if (qty > 10) availableCount++;
    else if (qty > 0) lowCount++;
    else outCount++;
  });

  const totalEl = document.getElementById('product-stat-total');
  const availableEl = document.getElementById('product-stat-available');
  const lowEl = document.getElementById('product-stat-low');
  const outEl = document.getElementById('product-stat-out');
  if (totalEl) totalEl.textContent = products.length;
  if (availableEl) availableEl.textContent = availableCount;
  if (lowEl) lowEl.textContent = lowCount;
  if (outEl) outEl.textContent = outCount;

  let filteredProducts = products;
  if (searchQ) {
    filteredProducts = products.filter(p =>
      String(p.product_name || '').toLowerCase().includes(searchQ) ||
      String(p.category || '').toLowerCase().includes(searchQ)
    );
  }

  if (filteredProducts.length === 0) {
    container.innerHTML = `
      <div class="product-empty-state">
        <div class="product-empty-icon"><i class="fa-solid fa-box-open"></i></div>
        <h4>${products.length ? 'No products found' : 'No Products Yet'}</h4>
        <p>${products.length ? 'Try another product or category.' : 'Add your first product to your shop catalog.'}</p>
        ${products.length ? '' : '<button class="btn-theme btn-small" onclick="openAddProductModal()"><i class="fa-solid fa-plus"></i> Add Product</button>'}
      </div>`;
    return;
  }

  filteredProducts.forEach(prod => {
    const stock = stocks.find(s => String(s.product_id) === String(prod._id));
    const qty = Number(stock?.available_quantity ?? 0);
    const unit = stock?.unit || 'Piece';
    let statusLabel = 'Out of Stock';
    let statusClass = 'out-of-stock';

    if (qty > 10) {
      statusLabel = 'Available';
      statusClass = 'available';
    } else if (qty > 0) {
      statusLabel = 'Low Stock';
      statusClass = 'low-stock';
    }

    const img = prod.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300';
    const name = String(prod.product_name || 'Unnamed Product');
    const category = String(prod.category || 'General');
    const price = Number(prod.price);
    const safePrice = Number.isFinite(price) ? price.toFixed(2) : '0.00';
    const safeId = String(prod._id || '');

    const item = document.createElement('div');
    item.className = 'product-row-item';
    item.innerHTML = `
      <img src="${img}" class="prod-row-img" alt="${name.replace(/"/g, '&quot;')}">
      <div class="prod-row-info">
        <div class="prod-row-name">${name}</div>
        <div class="prod-row-category">${category}</div>
        <div class="prod-row-price">₹${safePrice}</div>
        <div class="prod-row-stock ${statusClass}">
          <span class="stock-dot"></span> ${statusLabel} · ${qty} ${unit}
        </div>
      </div>
      <div class="product-row-actions">
        <button class="btn-theme btn-small" onclick="openStockEditModal('${safeId}', '${name.replace(/'/g, "\\'")}', ${qty}, '${String(unit).replace(/'/g, "\\'")}')"><i class="fa-solid fa-boxes-stacked"></i> Stock</button>
        <button class="btn-outline btn-small" onclick="openEditProductModal('${safeId}')"><i class="fa-solid fa-pen"></i> Edit</button>
        <button class="btn-outline btn-small delete-product-btn" onclick="deleteProduct('${safeId}')"><i class="fa-solid fa-trash"></i> Delete</button>
      </div>
    `;
    container.appendChild(item);
  });
}

// Stock Editor Modal Actions
function openStockEditModal(productId, productName, currentQty, currentUnit) {
  document.getElementById('stock-prod-id').value = productId;
  document.getElementById('stock-prod-name-lbl').innerText = productName;
  document.getElementById('stock-qty-input').value = currentQty;
  document.getElementById('stock-unit-input').value = currentUnit;
  document.getElementById('stock-edit-modal').style.display = 'flex';
}

function closeStockEditModal() {
  document.getElementById('stock-edit-modal').style.display = 'none';
}

function adjustStockVal(val) {
  const input = document.getElementById('stock-qty-input');
  let current = parseInt(input.value) || 0;
  input.value = Math.max(0, current + val);
}

async function handleStockUpdateSubmit(e) {
  e.preventDefault();
  const productId = document.getElementById('stock-prod-id').value;
  const qty = document.getElementById('stock-qty-input').value;
  const unit = document.getElementById('stock-unit-input').value;

  try {
    const res = await fetch(`/api/owner/stock/${productId}`, {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify({ available_quantity: qty, unit })
    });
    if (res.status === 200) {
      closeStockEditModal();
      loadStockData();
      alert('Stock record updated successfully!');
    }
  } catch (err) {
    alert('Stock update error.');
  }
}

// Product CRUD Modal Actions
function openAddProductModal() {
  document.getElementById('product-modal-title').innerText = 'Add New Product';
  document.getElementById('prod-id-input').value = '';
  document.getElementById('prod-name').value = '';
  document.getElementById('prod-cat').value = '';
  document.getElementById('prod-price').value = '';
  document.getElementById('prod-desc').value = '';
  if (document.getElementById('prod-avail-select')) document.getElementById('prod-avail-select').value = 'Available';
  if (document.getElementById('prod-qty-input')) document.getElementById('prod-qty-input').value = '50';
  if (document.getElementById('prod-unit-input')) document.getElementById('prod-unit-input').value = 'kg';
  document.getElementById('prod-photo-preview').src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200";
  activeUploadedBase64['prod-photo-preview'] = '';
  document.getElementById('product-modal').style.display = 'flex';
}

function openEditProductModal(productId) {
  const prod = allProducts.find(p => p._id === productId);
  if (!prod) return;

  document.getElementById('product-modal-title').innerText = 'Edit Product Details';
  document.getElementById('prod-id-input').value = prod._id;
  document.getElementById('prod-name').value = prod.product_name;
  document.getElementById('prod-cat').value = prod.category;
  document.getElementById('prod-price').value = prod.price;
  document.getElementById('prod-desc').value = prod.description || '';

  const stock = allStocks.find(s => String(s.product_id) === String(prod._id));
  const qty = Number(stock?.available_quantity ?? 50);
  const unit = stock?.unit || 'kg';

  if (document.getElementById('prod-qty-input')) document.getElementById('prod-qty-input').value = qty;
  if (document.getElementById('prod-unit-input')) document.getElementById('prod-unit-input').value = unit;
  
  if (document.getElementById('prod-avail-select')) {
    if (qty === 0) document.getElementById('prod-avail-select').value = 'Out of Stock';
    else if (qty <= 10) document.getElementById('prod-avail-select').value = 'Limited';
    else document.getElementById('prod-avail-select').value = 'Available';
  }
  
  const img = prod.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200";
  document.getElementById('prod-photo-preview').src = img;
  activeUploadedBase64['prod-photo-preview'] = prod.image || '';

  document.getElementById('product-modal').style.display = 'flex';
}

function closeProductModal() {
  document.getElementById('product-modal').style.display = 'none';
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('prod-id-input').value;
  const name = document.getElementById('prod-name').value;
  const cat = document.getElementById('prod-cat').value;
  const price = document.getElementById('prod-price').value;
  const desc = document.getElementById('prod-desc').value;
  const image = activeUploadedBase64['prod-photo-preview'] || '';

  const url = id ? `/api/owner/products/${id}` : '/api/owner/products';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: authHeaders(true),
      body: JSON.stringify({ product_name: name, category: cat, price, description: desc, image })
    });
    if (res.status === 200 || res.status === 201) {
      const savedProd = await res.json();
      const targetProdId = id || savedProd._id;

      // Update Stock Status & Quantity
      if (targetProdId) {
        const availVal = document.getElementById('prod-avail-select')?.value || 'Available';
        let qtyVal = parseInt(document.getElementById('prod-qty-input')?.value || '50');
        if (availVal === 'Out of Stock') qtyVal = 0;
        else if (availVal === 'Limited' && qtyVal > 10) qtyVal = 5;
        else if (availVal === 'Available' && qtyVal <= 5) qtyVal = 50;

        const unitVal = document.getElementById('prod-unit-input')?.value || 'kg';

        await fetch(`/api/owner/stock/${targetProdId}`, {
          method: 'PUT',
          headers: authHeaders(true),
          body: JSON.stringify({ available_quantity: qtyVal, unit: unitVal })
        });
      }

      closeProductModal();
      loadStockData();
      alert('Product saved successfully!');
    } else {
      const data = await res.json();
      alert(data.message || 'Error processing product.');
    }
  } catch (err) {
    alert('Product operation error.');
  }
}

async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product? This will also remove its associated stock logs.')) return;
  try {
    const res = await fetch(`/api/owner/products/${productId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (res.status === 200) {
      loadStockData();
    }
  } catch (err) {
    alert('Delete product error.');
  }
}

// --- DISCOUNT MANAGEMENT ---

async function loadOffersData() {
  try {
    const res = await fetch('/api/owner/discounts', {
      headers: authHeaders()
    });
    allDiscounts = await res.json();

    const container = document.getElementById('offers-list-container');
    container.innerHTML = '';

    if (allDiscounts.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:30px; font-size:12px;">No active campaigns cataloged.</div>`;
      return;
    }

    allDiscounts.forEach(o => {
      const card = document.createElement('div');
      card.className = 'glass-shop-card';
      card.style.flexDirection = 'column';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h4 style="font-size:16px; font-weight:800; color:#ef4444;">${o.percentage}% OFF</h4>
            <div style="font-weight:700; font-size:14px; margin-top:2px;">${o.title}</div>
          </div>
          <button class="btn-outline btn-small" style="color:var(--danger-red); font-size:11px;" onclick="deleteDiscount('${o._id}')">Stop Deal</button>
        </div>
        <p style="font-size:12px; color:var(--text-muted); margin-top:8px;">${o.description}</p>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
  }
}

function openAddOfferModal() {
  document.getElementById('off-title').value = '';
  document.getElementById('off-percent').value = '';
  document.getElementById('off-desc').value = '';
  document.getElementById('offer-modal').style.display = 'flex';
}

function closeOfferModal() {
  document.getElementById('offer-modal').style.display = 'none';
}

async function handleOfferSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('off-title').value;
  const percentage = document.getElementById('off-percent').value;
  const description = document.getElementById('off-desc').value;

  try {
    const res = await fetch('/api/owner/discounts', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ title, percentage, description })
    });
    if (res.status === 201) {
      closeOfferModal();
      loadOffersData();
    }
  } catch (err) {
    alert('Offer save error.');
  }
}

async function deleteDiscount(discountId) {
  if (!confirm('Are you sure you want to stop this discount offer?')) return;
  try {
    const res = await fetch(`/api/owner/discounts/${discountId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (res.status === 200) {
      loadOffersData();
    }
  } catch (err) {
    alert('Delete discount error.');
  }
}

// --- PHOTOS MANAGEMENT ---

function handleMultipleShopPhotos(input) {
  const files = Array.from(input.files || []).filter(file => file.type.startsWith('image/'));
  if (!files.length) return;

  Promise.all(files.map(file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  }))).then(images => {
    selectedShopPhotos = [...selectedShopPhotos, ...images];
    renderSelectedShopPhotos();
    input.value = '';
  }).catch(() => alert('Unable to read one or more photos.'));
}

function removeSelectedShopPhoto(index) {
  selectedShopPhotos.splice(index, 1);
  renderSelectedShopPhotos();
}

function renderSelectedShopPhotos() {
  const gallery = document.getElementById('shop-photo-gallery');
  if (!gallery) return;

  const photos = selectedShopPhotos;

  if (!photos.length) {
    gallery.innerHTML = '<div class="photo-empty">No shop photos added yet.</div>';
    return;
  }

  gallery.innerHTML = photos.map((photo, index) => `
    <div class="gallery-photo">
      <img src="${photo}" alt="Shop photo ${index + 1}">
      <button type="button" class="btn-remove-photo" onclick="removeSelectedShopPhoto(${index})" title="Remove photo">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join('');
}

async function loadPhotosData() {
  if (!currentShop) {
    try {
      const res = await fetch('/api/owner/shop', { headers: authHeaders() });
      currentShop = await res.json();
    } catch (e) {}
  }
  if (!currentShop) return;
  selectedShopPhotos = Array.isArray(currentShop.shop_photos) ? [...currentShop.shop_photos] : [];
  renderSelectedShopPhotos();
}

async function handleSavePhotos(e) {
  e.preventDefault();

  try {
    const res = await fetch('/api/owner/shop', {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify({
        shop_photos: selectedShopPhotos
      })
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 200) {
      alert('Shop photos updated successfully!');
      currentShop = data;
      selectedShopPhotos = Array.isArray(currentShop.shop_photos) ? [...currentShop.shop_photos] : [];
      await loadDashboardData();
      await loadPhotosData();
    } else {
      alert(data.message || 'Photo save error.');
    }
  } catch (err) {
    console.error(err);
    alert('Photo save error.');
  }
}

// --- TIMINGS / OPENING HOURS ---

async function loadHoursData() {
  if (!currentShop) {
    try {
      const res = await fetch('/api/owner/shop', { headers: authHeaders() });
      currentShop = await res.json();
    } catch (e) {}
  }
  if (!currentShop) return;
  
  const openInput = document.getElementById('hours-open');
  const closeInput = document.getElementById('hours-close');
  const toggleSelect = document.getElementById('hours-status-toggle');

  if (openInput) openInput.value = convertTimeTo24h(currentShop.opening_time);
  if (closeInput) closeInput.value = convertTimeTo24h(currentShop.closing_time);
  if (toggleSelect) toggleSelect.value = (currentShop.shop_status || 'Open').toLowerCase();
}

function convertTimeTo24h(timeStr) {
  if (!timeStr) return "08:00";
  const parts = timeStr.split(' ');
  if (parts.length < 2) return timeStr;
  
  let [hours, mins] = parts[0].split(':').map(Number);
  const ampm = parts[1].toUpperCase();

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function convertTimeTo12h(time24) {
  if (!time24) return "08:00 AM";
  let [hours, mins] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${ampm}`;
}

function toggleWeekday(el) {
  el.classList.toggle('active');
}

async function handleSaveHours(e) {
  e.preventDefault();
  const open24 = document.getElementById('hours-open').value;
  const close24 = document.getElementById('hours-close').value;
  const statusVal = document.getElementById('hours-status-toggle').value;

  const opening_time = convertTimeTo12h(open24);
  const closing_time = convertTimeTo12h(close24);
  const shop_status = statusVal === 'open' ? 'Open' : 'Closed';

  try {
    const res = await fetch('/api/owner/shop', {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify({ opening_time, closing_time, shop_status })
    });
    if (res.status === 200) {
      alert('Opening hours details saved successfully!');
      currentShop = await res.json();
      loadDashboardData();
    }
  } catch (err) {
    alert('Hours update error.');
  }
}

// --- REVIEWS LOGIC ---

async function loadReviewsData() {
  try {
    const res = await fetch('/api/owner/reviews', {
      headers: authHeaders()
    });
    allReviews = await res.json();

    const container = document.getElementById('reviews-list-container');
    if (!container) return;
    container.innerHTML = '';

    if (allReviews.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:30px; font-size:12px;">No reviews left by customers.</div>`;
      return;
    }

    allReviews.forEach(r => {
      let stars = '';
      for (let i = 1; i <= 5; i++) {
        stars += i <= r.rating ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
      }
      const initial = r.customer_name ? r.customer_name.charAt(0).toUpperCase() : 'C';

      const item = document.createElement('div');
      item.className = 'review-item-card';
      item.innerHTML = `
        <div class="review-item-header">
          <div class="review-item-user">
            <div class="review-item-user-img">${initial}</div>
            <span>${r.customer_name}</span>
          </div>
          <span class="review-item-date">${new Date(r.review_date).toLocaleDateString()}</span>
        </div>
        <div class="stars-row">${stars}</div>
        <p class="review-item-text">${r.review}</p>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    console.error(err);
  }
}

// --- LOCATION LOGIC ---

async function loadLocationData() {
  if (!currentShop) {
    try {
      const res = await fetch('/api/owner/shop', { headers: authHeaders() });
      currentShop = await res.json();
    } catch (e) {}
  }
  if (!currentShop) return;

  const nameEl = document.getElementById('location-shop-name');
  const addrEl = document.getElementById('location-address');
  if (nameEl) nameEl.innerText = currentShop.shop_name || 'Your Shop';
  if (addrEl) addrEl.innerText = currentShop.address || 'Shop Address';
}

// --- PROFILE SETTINGS ---

async function loadSettingsData() {
  if (!currentShop) {
    try {
      const res = await fetch('/api/owner/shop', { headers: authHeaders() });
      currentShop = await res.json();
    } catch (e) {}
  }
  if (!currentShop) return;

  const nameInput = document.getElementById('set-shop-name');
  const descInput = document.getElementById('set-shop-desc');
  const addrInput = document.getElementById('set-shop-address');
  const contactInput = document.getElementById('set-shop-contact');

  if (nameInput) nameInput.value = currentShop.shop_name || '';
  if (descInput) descInput.value = currentShop.description || '';
  if (addrInput) addrInput.value = currentShop.address || '';
  if (contactInput) contactInput.value = currentShop.contact_number || '';

  const dpPreview = document.getElementById('set-dp-preview');
  if (dpPreview) {
    dpPreview.src = currentShop.shop_photo || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200";
  }
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const shop_name = document.getElementById('set-shop-name').value;
  const description = document.getElementById('set-shop-desc').value;
  const address = document.getElementById('set-shop-address').value;
  const contact_number = document.getElementById('set-shop-contact').value;
  const shop_photo = activeUploadedBase64['set-dp-preview'] || (currentShop ? currentShop.shop_photo : '');

  try {
    const payload = { shop_name, description, address, contact_number };
    if (shop_photo) payload.shop_photo = shop_photo;

    const res = await fetch('/api/owner/shop', {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });
    if (res.status === 200) {
      alert('Profile and shop settings saved successfully!');
      currentShop = await res.json();
      loadDashboardData();
    }
  } catch (err) {
    alert('Settings update error.');
  }
}
function handleOwnerLogout() {
    const confirmLogout = confirm("Are you sure you want to logout?");

    if (!confirmLogout) {
        return;
    }

    localStorage.removeItem("owner_token");
    localStorage.removeItem("owner");
    localStorage.removeItem("ownerData");
    sessionStorage.clear();

    window.location.href = "owner.html";
}
