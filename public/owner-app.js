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
      headers: { 'Authorization': `Bearer ${token}` }
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

  // Load parent view screens
  if (tabId === 'dashboard') {
    showScreen('dashboard');
    loadDashboardData();
  } else if (tabId === 'stock') {
    showScreen('stock');
    loadStockData();
  } else if (tabId === 'offers') {
    showScreen('offers');
    loadOffersData();
  } else if (tabId === 'profile') {
    showScreen('profile');
    loadSettingsData();
  } else {
    // Quick actions screens
    showScreen(tabId);
    if (tabId === 'photos') loadPhotosData();
    else if (tabId === 'hours') loadHoursData();
    else if (tabId === 'reviews') loadReviewsData();
  }
}

// Load Home Dashboard Summary Card details
async function loadDashboardData() {
  try {
    // 1. Fetch shop profile
    const shopRes = await fetch('/api/owner/shop', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    currentShop = await shopRes.json();
    document.getElementById('dash-shop-title').innerText = currentShop.shop_name;
    document.getElementById('dash-status-select').value = currentShop.shop_status;

    // 2. Fetch dashboard stats
    const statsRes = await fetch('/api/owner/dashboard/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const stats = await statsRes.json();
    document.getElementById('stat-total-products').innerText = stats.totalProducts;
    document.getElementById('stat-active-offers').innerText = stats.activeDiscounts;
  } catch (err) {
    console.error(err);
  }
}

async function updateShopStatus() {
  const status = document.getElementById('dash-status-select').value;
  try {
    const res = await fetch('/api/owner/shop', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ shop_status: status })
    });
    if (res.status === 200) {
      alert(`Shop status set to: ${status}`);
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
      headers: { 'Authorization': `Bearer ${token}` }
    });
    allProducts = await prodRes.json();

    // Fetch decoupled stock items
    const stockRes = await fetch('/api/owner/stock', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    allStocks = await stockRes.json();

    renderStockTable();
  } catch (err) {
    console.error(err);
  }
}

function renderStockTable() {
  const container = document.getElementById('stock-list-container');
  container.innerHTML = '';

  const searchQ = document.getElementById('stock-search-input').value.toLowerCase();
  
  // Filter products by query
  let filteredProducts = [...allProducts];
  if (searchQ) {
    filteredProducts = filteredProducts.filter(p => p.product_name.toLowerCase().includes(searchQ));
  }

  if (filteredProducts.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:30px; font-size:12px;">No products matching search.</div>`;
    return;
  }

  filteredProducts.forEach(prod => {
    // Match stock record
    const stock = allStocks.find(s => String(s.product_id) === String(prod._id));
    let qty = 0;
    let unit = 'Piece';
    let statusLabel = 'Out of Stock';
    let statusClass = 'out-of-stock';

    if (stock) {
      qty = stock.available_quantity;
      unit = stock.unit;
      if (qty > 10) {
        statusLabel = 'Available';
        statusClass = 'available';
      } else if (qty > 0) {
        statusLabel = 'Low Stock';
        statusClass = 'low-stock';
      }
    }

    const img = prod.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200";

    const item = document.createElement('div');
    item.className = 'product-row-item';
    item.innerHTML = `
      <img src="${img}" class="prod-row-img" alt="${prod.product_name}">
      <div class="prod-row-info">
        <div class="prod-row-name">${prod.product_name}</div>
        <div class="prod-row-price">₹${prod.price.toFixed(2)}</div>
        <div class="prod-row-stock ${statusClass}">
          Status: ${statusLabel} (${qty} ${unit})
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:4px; margin-left:auto;">
        <button class="btn-theme btn-small" style="padding:4px 10px; font-size:11px; border-radius:8px;" onclick="openStockEditModal('${prod._id}', '${prod.product_name}', ${qty}, '${unit}')">Stock</button>
        <button class="btn-outline btn-small" style="padding:4px 10px; font-size:11px; border-radius:8px;" onclick="openEditProductModal('${prod._id}')">Edit</button>
        <button class="btn-outline btn-small" style="padding:4px 10px; font-size:11px; border-radius:8px; color:var(--danger-red); border-color:rgba(239,68,68,0.1);" onclick="deleteProduct('${prod._id}')">Delete</button>
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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
  document.getElementById('prod-photo-preview').src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200";
  activeUploadedBase64['prod-photo-preview'] = '';
  document.getElementById('product-modal').style.display = 'flex';
}

function openEditProductModal(productId) {
  const prod = allProducts.find(p => p._id === productId);
  if (!prod) return;

  document.getElementById('product-modal-title').innerText = 'Edit Product Catalog';
  document.getElementById('prod-id-input').value = prod._id;
  document.getElementById('prod-name').value = prod.product_name;
  document.getElementById('prod-cat').value = prod.category;
  document.getElementById('prod-price').value = prod.price;
  document.getElementById('prod-desc').value = prod.description || '';
  
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ product_name: name, category: cat, price, description: desc, image })
    });
    if (res.status === 200 || res.status === 201) {
      closeProductModal();
      loadStockData();
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
      headers: { 'Authorization': `Bearer ${token}` }
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
      headers: { 'Authorization': `Bearer ${token}` }
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 200) {
      loadOffersData();
    }
  } catch (err) {
    alert('Delete discount error.');
  }
}

// --- PHOTOS MANAGEMENT ---

async function loadPhotosData() {
  if (!currentShop) return;
  document.getElementById('front-photo-preview').src = currentShop.shop_photo || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200";
}

async function handleSavePhotos(e) {
  e.preventDefault();
  const shop_photo = activeUploadedBase64['front-photo-preview'] || '';
  if (!shop_photo) {
    alert('Please upload a photo first!');
    return;
  }
  try {
    const res = await fetch('/api/owner/shop', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ shop_photo })
    });
    if (res.status === 200) {
      alert('Photos updated successfully!');
      loadDashboardData();
    }
  } catch (err) {
    alert('Photo save error.');
  }
}

// --- TIMINGS / OPENING HOURS ---

async function loadHoursData() {
  if (!currentShop) return;
  // Convert 12h format openTime to 24h format for HTML time pickers
  document.getElementById('hours-open').value = convertTimeTo24h(currentShop.opening_time);
  document.getElementById('hours-close').value = convertTimeTo24h(currentShop.closing_time);
  document.getElementById('hours-status-toggle').checked = currentShop.shop_status === 'Open';
}

function convertTimeTo24h(timeStr) {
  if (!timeStr) return "08:00";
  // Expect format "HH:MM AM" or "HH:MM PM"
  const parts = timeStr.split(' ');
  if (parts.length < 2) return timeStr;
  
  let [hours, mins] = parts[0].split(':').map(Number);
  const ampm = parts[1].toUpperCase();

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function convertTimeTo12h(time24) {
  let [hours, mins] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${ampm}`;
}

function toggleWeekday(el) {
  el.classList.toggle('active');
}

async function handleSaveHours(e) {
  e.preventDefault();
  const open24 = document.getElementById('hours-open').value;
  const close24 = document.getElementById('hours-close').value;
  const isOpen = document.getElementById('hours-status-toggle').checked;

  const opening_time = convertTimeTo12h(open24);
  const closing_time = convertTimeTo12h(close24);
  const shop_status = isOpen ? 'Open' : 'Closed';

  try {
    const res = await fetch('/api/owner/shop', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ opening_time, closing_time, shop_status })
    });
    if (res.status === 200) {
      alert('Opening hours details saved successfully!');
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
      headers: { 'Authorization': `Bearer ${token}` }
    });
    allReviews = await res.json();

    const container = document.getElementById('reviews-list-container');
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
      const initial = r.customer_name.charAt(0).toUpperCase();

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

// --- PROFILE SETTINGS ---

function loadSettingsData() {
  if (!currentShop) return;
  document.getElementById('set-shop-name').value = currentShop.shop_name;
  document.getElementById('set-shop-desc').value = currentShop.description || '';
  document.getElementById('set-shop-address').value = currentShop.address;
  document.getElementById('set-shop-contact').value = currentShop.contact_number || '';
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const shop_name = document.getElementById('set-shop-name').value;
  const description = document.getElementById('set-shop-desc').value;
  const address = document.getElementById('set-shop-address').value;
  const contact_number = document.getElementById('set-shop-contact').value;

  try {
    const res = await fetch('/api/owner/shop', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ shop_name, description, address, contact_number })
    });
    if (res.status === 200) {
      alert('Profile and shop settings saved successfully!');
      loadDashboardData();
    }
  } catch (err) {
    alert('Settings update error.');
  }
}
