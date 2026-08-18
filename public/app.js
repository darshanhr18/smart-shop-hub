// --- CUSTOMER APP LOGIC ---

let token = localStorage.getItem('customer_token') || null;
let currentUser = null;
let activeTab = 'home';

function authHeaders(includeJson = false) {
  const headers = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

let allShops = [];
let allProducts = [];
let currentCategory = 'All';
let selectedShopId = null;
let selectedShopData = null;
let reviewRating = 0;

// PWA Deferred Prompt Handler
let deferredInstallPrompt = null;

const categoryData = [
  { name: 'All', icon: '🔍' },
  { name: 'Grocery', icon: '🏪' },
  { name: 'Medical', icon: '💊' },
  { name: 'Bakery', icon: '🍞' },
  { name: 'Electronics', icon: '🎧' },
  { name: 'Clothing', icon: '👕' },
  { name: 'Hardware', icon: '🔧' },
  { name: 'Stationery', icon: '📚' },
  { name: 'Restaurants', icon: '🍔' },
  { name: 'Fruits & Vegetables', icon: '🍎' }
];

document.addEventListener('DOMContentLoaded', () => {
  initAppFlow();
  initPWA();
});

// PWA Service Worker Registration & Install Trigger
function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('[PWA] Service Worker registered successfully', reg.scope))
      .catch((err) => console.error('[PWA] Service Worker registration failed:', err));
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
      installBtn.onclick = async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log('[PWA] Choice outcome:', outcome);
        deferredInstallPrompt = null;
        installBtn.style.display = 'none';
      };
    }
  });
}

// App Startup Flow
async function initAppFlow() {
  if (token) {
    const verified = await verifyToken();
    if (verified) {
      showDashboard();
    } else {
      enterGuestMode();
    }
  } else {
    enterGuestMode();
  }
}

function enterGuestMode() {
  currentUser = null;
  showDashboard();
  updateGuestUI();
}

function updateGuestUI() {
  const profileAvatarBtn = document.querySelector("button[onclick=\"switchTab('profile')\"]");
  if (profileAvatarBtn) {
    profileAvatarBtn.title = currentUser ? currentUser.name : "Guest Mode - Tap to Login";
  }
}

// Token Verification
async function verifyToken() {
  try {
    const res = await fetch('/api/auth/customer/me', {
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

// Navigations
function showScreen(screenId) {
  document.querySelectorAll('.screen-view').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`screen-${screenId}`);
  if (target) target.classList.add('active');
  
  const navBar = document.getElementById('app-nav-bar');
  const bottomNav = document.getElementById('app-bottom-nav');

  const isAuthOrSplash = (screenId === 'splash' || screenId === 'auth' || screenId === 'shop-detail');

  if (navBar) {
    navBar.style.display = isAuthOrSplash ? 'none' : 'flex';
  }

  if (bottomNav) {
    if (isAuthOrSplash) {
      bottomNav.style.display = 'none';
    } else {
      bottomNav.style.display = ''; // Allows CSS media query to hide on desktop and show on mobile
    }
  }
}

function goToCustomerAuth() {
  showScreen('auth');
  toggleAuthMode(true);
}

function goToOwnerPortal() {
  window.location.href = "owner.html";
}

function toggleAuthMode(isLogin) {
  document.getElementById('auth-error').style.display = 'none';
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const loginForm = document.getElementById('customer-login-form');
  const regForm = document.getElementById('customer-register-form');

  if (isLogin) {
    title.innerText = 'Welcome Back 👋';
    subtitle.innerText = 'Login to continue';
    loginForm.style.display = 'block';
    regForm.style.display = 'none';
  } else {
    title.innerText = 'Create Account 🚀';
    subtitle.innerText = 'Join Shop Finder today';
    loginForm.style.display = 'none';
    regForm.style.display = 'block';
  }
}

function showDashboard() {
  const navBar = document.getElementById('app-nav-bar');
  const bottomNav = document.getElementById('app-bottom-nav');
  if (navBar) navBar.style.display = 'flex';
  if (bottomNav) bottomNav.style.display = '';
  switchTab('home');
}

// Tab switcher
function switchTab(tabId) {
  activeTab = tabId;
  
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const activeBtn = document.getElementById(`nav-btn-${tabId}`);
  if (activeBtn) activeBtn.classList.add('active');

  document.querySelectorAll('.sv-bottom-nav-item').forEach(item => item.classList.remove('active'));
  const activeBnav = document.getElementById(`bnav-${tabId}`);
  if (activeBnav) activeBnav.classList.add('active');

  showScreen(tabId);

  if (tabId === 'home') {
    loadHomeData();
  } else if (tabId === 'explore') {
    loadExploreData();
  } else if (tabId === 'favorites') {
    loadFavoritesData();
  } else if (tabId === 'profile') {
    loadProfileData();
  }
}

function filterEmergencyItem(itemName) {
  switchTab('explore');

  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const activeBtn = document.getElementById('nav-btn-emergency');
  if (activeBtn) activeBtn.classList.add('active');

  document.querySelectorAll('.sv-bottom-nav-item').forEach(item => item.classList.remove('active'));
  const activeBnav = document.getElementById('bnav-emergency');
  if (activeBnav) activeBnav.classList.add('active');

  const searchInput = document.getElementById('explore-search-input');
  if (searchInput) {
    searchInput.value = itemName || '';
    handleSearchFilter();
  }
}

function getDirections() {
  const shopName = selectedShopData?.shop?.shop_name || 'Store';
  const address = selectedShopData?.shop?.address || 'Location';
  alert(`🧭 Navigation Directions:\nCalculating best route to ${shopName} (${address})...\n\nEstimated arrival: 4 mins (0.8 km).`);
}

// --- AUTH HANDLERS ---

async function handleCustomerLogin(e) {
  e.preventDefault();
  const mobile = document.getElementById('login-mobile').value;
  const pass = document.getElementById('login-pass').value;
  const errBox = document.getElementById('auth-error');

  try {
    const res = await fetch('/api/auth/customer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, password: pass })
    });
    const data = await res.json();
    if (res.status === 200) {
      token = data.token;
      currentUser = data.user;
      localStorage.setItem('customer_token', token);
      showDashboard();
    } else {
      errBox.innerText = data.message;
      errBox.style.display = 'block';
    }
  } catch (err) {
    errBox.innerText = 'Connection error.';
    errBox.style.display = 'block';
  }
}

async function handleCustomerRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const mobile = document.getElementById('reg-mobile').value;
  const email = document.getElementById('reg-email').value;
  const pass = document.getElementById('reg-pass').value;
  const passConfirm = document.getElementById('reg-pass-confirm').value;
  const errBox = document.getElementById('auth-error');

  if (pass !== passConfirm) {
    errBox.innerText = 'Passwords do not match.';
    errBox.style.display = 'block';
    return;
  }

  try {
    const res = await fetch('/api/auth/customer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mobile, email, password: pass })
    });
    const data = await res.json();
    if (res.status === 201) {
      token = data.token;
      currentUser = data.user;
      localStorage.setItem('customer_token', token);
      showDashboard();
    } else {
      errBox.innerText = data.message;
      errBox.style.display = 'block';
    }
  } catch (err) {
    errBox.innerText = 'Connection error.';
    errBox.style.display = 'block';
  }
}

function handleCustomerLogout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('customer_token');
  showScreen('splash');
}

// --- HOME TAB DATA LOADERS ---

async function loadHomeData() {
  try {
    const categoriesBox = document.getElementById('home-categories-box');
    categoriesBox.innerHTML = '';
    categoryData.forEach(cat => {
      const card = document.createElement('div');
      card.className = `category-icon-card ${currentCategory === cat.name ? 'active' : ''}`;
      card.onclick = () => {
        currentCategory = cat.name;
        switchTab('explore');
      };
      card.innerHTML = `
        <div class="category-icon-circle">${cat.icon}</div>
        <span class="category-icon-label">${cat.name}</span>
      `;
      categoriesBox.appendChild(card);
    });

    const res = await fetch('/api/customer/shops');
    allShops = await res.json();

    const discountShop = allShops.find(s => s.active_discount);
    const promoBanner = document.getElementById('home-promo-banner');
    if (discountShop && discountShop.active_discount) {
      document.getElementById('promo-percentage').innerText = `${discountShop.active_discount.percentage}% OFF`;
      document.getElementById('promo-title').innerText = discountShop.active_discount.title;
      document.getElementById('promo-shop-name').innerText = discountShop.shop_name;
      promoBanner.onclick = () => viewShopDetails(discountShop._id);
      promoBanner.style.display = 'flex';
    } else {
      promoBanner.style.display = 'none';
    }

    const homeShopsBox = document.getElementById('home-shops-box');
    homeShopsBox.innerHTML = '';
    
    // Distances mock for realistic local experience
    const distances = ['0.5 km', '0.8 km', '1.2 km', '1.5 km', '2.1 km'];

    allShops.forEach((shop, index) => {
      const card = document.createElement('div');
      card.className = 'glass-shop-card';
      card.style.flexDirection = 'column';
      card.style.padding = '20px';
      card.onclick = () => viewShopDetails(shop._id);
      
      const photo = shop.shop_photo || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200";
      
      let statusBadgeHtml = '<span class="card-status-badge open">🟢 OPEN</span>';
      if (shop.shop_status === 'Closed') statusBadgeHtml = '<span class="card-status-badge closed">🔴 CLOSED</span>';
      else if (shop.shop_status === 'Busy') statusBadgeHtml = '<span class="card-status-badge limited">🟡 LIMITED</span>';

      const distance = distances[index % distances.length];
      const closesAt = shop.closing_time ? `Closes at ${shop.closing_time}` : 'Closes at 9:30 PM';
      const prodCount = shop.products_count || (85 - index * 12);

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
          <div style="display:flex; gap:14px; align-items:center;">
            <img src="${photo}" style="width:60px; height:60px; border-radius:16px; object-fit:cover; background:#f1f5f9;">
            <div>
              <h3 style="font-size:18px; font-weight:800; margin:0 0 4px 0; color:var(--text-main);">🏪 ${shop.shop_name}</h3>
              <div style="font-size:13px; color:var(--text-muted); font-weight:600;">📍 ${distance} away</div>
            </div>
          </div>
          <div>${statusBadgeHtml}</div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; background:#f8f7fd; padding:10px 14px; border-radius:14px; margin-bottom:14px;">
          <div style="font-size:12px; color:var(--text-muted); font-weight:600;">⏰ ${closesAt}</div>
          <div style="font-size:13px; font-weight:800; color:var(--primary-purple);">${prodCount} Products Available</div>
        </div>

        <button class="btn-block btn-theme" style="padding:11px;" onclick="event.stopPropagation(); viewShopDetails('${shop._id}')">View Shop</button>
      `;
      homeShopsBox.appendChild(card);
    });
  } catch (err) {
    console.error('Home load error:', err);
  }
}

// --- EXPLORE TAB LOGIC ---

async function loadExploreData() {
  try {
    const res = await fetch('/api/customer/shops');
    allShops = await res.json();
    
    allProducts = [];
    for (const shop of allShops) {
      const detailsRes = await fetch(`/api/customer/shops/${shop._id}`);
      const details = await detailsRes.json();
      
      const shopProducts = details.products.map(p => ({
        ...p,
        shop_name: shop.shop_name,
        shop_status: shop.shop_status,
        active_discount: details.active_discount
      }));
      allProducts.push(...shopProducts);
    }
    
    handleSearchFilter();
  } catch (err) {
    console.error('Explore load error:', err);
  }
}

function handleSearchFilter() {
  const query = document.getElementById('explore-search-input').value.toLowerCase();
  const sortVal = document.getElementById('filter-sort').value;
  const availVal = document.getElementById('filter-avail').value;

  let filtered = [...allProducts];

  if (currentCategory && currentCategory !== 'All') {
    filtered = filtered.filter(p => p.category.toLowerCase() === currentCategory.toLowerCase());
  }

  if (query) {
    filtered = filtered.filter(p => 
      p.product_name.toLowerCase().includes(query) || 
      p.category.toLowerCase().includes(query) ||
      p.shop_name.toLowerCase().includes(query)
    );
  }

  if (availVal === 'available') {
    filtered = filtered.filter(p => p.availability_status !== 'Out of Stock');
  } else if (availVal === 'discount') {
    filtered = filtered.filter(p => p.active_discount);
  }

  if (sortVal === 'low-high') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortVal === 'high-low') {
    filtered.sort((a, b) => b.price - a.price);
  }

  const productsBox = document.getElementById('explore-products-box');
  productsBox.innerHTML = '';

  if (filtered.length === 0) {
    productsBox.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:40px; grid-column:1/-1;">No products match the filters.</div>`;
    return;
  }

  filtered.forEach(p => {
    let statusClass = 'available';
    if (p.availability_status === 'Low Stock') statusClass = 'low-stock';
    else if (p.availability_status === 'Out of Stock') statusClass = 'out-of-stock';

    const photo = p.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200";

    const card = document.createElement('div');
    card.className = 'product-row-item';
    card.style.cursor = 'pointer';
    card.onclick = () => viewShopDetails(p.shop_id);
    card.innerHTML = `
      <img src="${photo}" class="prod-row-img" alt="${p.product_name}">
      <div class="prod-row-info">
        <div class="prod-row-name">${p.product_name}</div>
        <div style="font-size:11px; color:var(--primary-blue); font-weight:700;">${p.shop_name}</div>
        <div class="prod-row-price">₹${p.price.toFixed(2)} / ${p.unit || 'Piece'}</div>
        <div class="prod-row-stock ${statusClass}">${p.availability_status} (${p.available_quantity} available)</div>
      </div>
      <button class="add-product-btn-circle" onclick="event.stopPropagation(); addtoCartAlert('${p.product_name}')">+</button>
    `;
    productsBox.appendChild(card);
  });
}

function addtoCartAlert(name) {
  alert(`Added ${name} to your local shopping basket!`);
}

// --- FAVORITES TAB LOGIC ---

function getFavorites() {
  return JSON.parse(localStorage.getItem('fav_shops') || '[]');
}

function toggleFavoriteShop() {
  if (!selectedShopId) return;
  const favs = getFavorites();
  const index = favs.indexOf(selectedShopId);
  const heartIcon = document.getElementById('shop-detail-fav-icon');

  if (index === -1) {
    favs.push(selectedShopId);
    heartIcon.className = 'fa-solid fa-heart';
    alert('Added store to your favorites list!');
  } else {
    favs.splice(index, 1);
    heartIcon.className = 'fa-regular fa-heart';
    alert('Removed store from your favorites list.');
  }
  localStorage.setItem('fav_shops', JSON.stringify(favs));
}

function loadFavoritesData() {
  const favs = getFavorites();
  const box = document.getElementById('favorites-shops-box');
  box.innerHTML = '';

  const favShops = allShops.filter(s => favs.includes(s._id));

  if (favShops.length === 0) {
    box.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:40px;">No saved stores in your favorites.</div>`;
    return;
  }

  favShops.forEach(shop => {
    const card = document.createElement('div');
    card.className = 'glass-shop-card';
    card.onclick = () => viewShopDetails(shop._id);
    const photo = shop.shop_photo || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200";
    
    let statusClass = 'open';
    if (shop.shop_status === 'Closed') statusClass = 'closed';
    else if (shop.shop_status === 'Busy') statusClass = 'busy';

    card.innerHTML = `
      <img src="${photo}" class="shop-card-img" alt="${shop.shop_name}">
      <div class="shop-card-info">
        <div>
          <div class="shop-card-title">
            <span>${shop.shop_name}</span>
            <span class="shop-card-rating"><i class="fa-solid fa-star"></i> ${shop.avg_rating}</span>
          </div>
          <div class="shop-card-category">${shop.category}</div>
          <div class="shop-card-address">${shop.address}</div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
          <div class="shop-card-timing">Open: ${shop.opening_time}</div>
          <span class="card-status-badge ${statusClass}">${shop.shop_status}</span>
        </div>
      </div>
    `;
    box.appendChild(card);
  });
}

// --- PROFILE LOGIC ---

function loadProfileData() {
  const avatarEl = document.getElementById('profile-avatar');
  const nameEl = document.getElementById('profile-name');
  const emailEl = document.getElementById('profile-email');

  if (!currentUser) {
    if (avatarEl) avatarEl.innerText = 'G';
    if (nameEl) nameEl.innerText = 'Guest Visitor 🌟';
    if (emailEl) emailEl.innerText = 'Browsing Public Customer Portal Mode';

    // Show Guest Login prompt inside settings grid if needed
    return;
  }
  if (nameEl) nameEl.innerText = currentUser.name;
  if (emailEl) emailEl.innerText = currentUser.email;
  if (avatarEl) avatarEl.innerText = currentUser.name.charAt(0).toUpperCase();
}

function openProfileEditModal() {
  if (!currentUser) return;
  document.getElementById('edit-name').value = currentUser.name;
  document.getElementById('edit-email').value = currentUser.email;
  document.getElementById('edit-mobile').value = currentUser.mobile;
  document.getElementById('edit-pass').value = '';
  document.getElementById('profile-edit-modal').style.display = 'flex';
}

function closeProfileEditModal() {
  document.getElementById('profile-edit-modal').style.display = 'none';
}

async function handleSaveProfile(e) {
  e.preventDefault();
  const name = document.getElementById('edit-name').value;
  const email = document.getElementById('edit-email').value;
  const mobile = document.getElementById('edit-mobile').value;
  const password = document.getElementById('edit-pass').value;

  try {
    const res = await fetch('/api/customer/profile', {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify({ name, email, mobile, password: password || undefined })
    });
    if (res.status === 200) {
      const data = await res.json();
      currentUser = data.user;
      closeProfileEditModal();
      loadProfileData();
      alert('Profile details updated successfully!');
    } else {
      const data = await res.json();
      alert(data.message || 'Update failed.');
    }
  } catch (err) {
    alert('Update error.');
  }
}

// --- CUSTOMER SHOP VIEW ---

async function viewShopDetails(shopId) {
  selectedShopId = shopId;
  try {
    const res = await fetch(`/api/customer/shops/${shopId}`);
    if (!res.ok) throw new Error('Shop details could not be loaded.');
    selectedShopData = await res.json();
    const shop = selectedShopData.shop || {};

    const photo = shop.shop_photo || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=85&w=1200";
    const profilePhoto = shop.shop_photo || photo;

    const banner = document.getElementById('shop-detail-banner');
    banner.style.backgroundImage = `url('${photo}')`;
    document.getElementById('shop-detail-profile-photo').src = profilePhoto;
    document.getElementById('shop-detail-profile-photo').alt = shop.shop_name || 'Shop';

    document.getElementById('shop-detail-name').innerText = shop.shop_name || 'Shop';
    document.getElementById('shop-detail-category').innerText = shop.category || 'Store';
    document.getElementById('shop-detail-rating').innerHTML = `<i class="fa-solid fa-star"></i> ${selectedShopData.avg_rating || 'N/A'}`;
    document.getElementById('shop-detail-address').innerText = shop.address || 'Address not available';
    document.getElementById('shop-detail-timings').innerText = `${shop.opening_time || '—'} - ${shop.closing_time || '—'}`;
    document.getElementById('shop-detail-desc').innerText = shop.description || 'This shop has not added a description yet.';

    const status = shop.shop_status || 'Closed';
    const statusBadge = document.getElementById('shop-detail-status-badge');
    statusBadge.className = `shop-hero-status ${status.toLowerCase()}`;
    statusBadge.innerHTML = `<span></span> ${status.toUpperCase()}`;
    if (status === 'Closed') statusBadge.style.color = '#dc2626';
    else if (status === 'Busy') statusBadge.style.color = '#d97706';
    else statusBadge.style.color = '#079447';
    const dot = statusBadge.querySelector('span');
    if (dot) dot.style.background = status === 'Closed' ? '#ef4444' : status === 'Busy' ? '#f59e0b' : '#19c96b';

    const discBanner = document.getElementById('shop-detail-offer-banner');
    if (selectedShopData.active_discount) {
      const discount = selectedShopData.active_discount;
      document.getElementById('shop-detail-offer-percent').innerText = `${discount.percentage || ''}% OFF`;
      document.getElementById('shop-detail-offer-title').innerText = discount.title || 'Special offer available';
      document.getElementById('shop-detail-offer-valid').innerText = discount.valid_until ? `Valid till ${new Date(discount.valid_until).toLocaleDateString()}` : 'Active offer';
      discBanner.style.display = 'flex';
    } else {
      discBanner.style.display = 'none';
    }

    const favs = getFavorites();
    document.getElementById('shop-detail-fav-icon').className = favs.includes(shopId) ? 'fa-solid fa-heart' : 'fa-regular fa-heart';

    renderCustomerShopProducts();
    renderCustomerShopPhotos();
    renderCustomerShopReviews();
    resetShopAbout();
    showScreen('shop-detail');
  } catch (err) {
    console.error('Error loading shop profile:', err);
  }
}

function closeShopDetails() {
  switchTab(activeTab || 'home');
}

function filterShopProducts() {
  renderCustomerShopProducts();
}

function renderCustomerShopProducts() {
  const container = document.getElementById('detail-products-list');
  if (!container || !selectedShopData) return;
  container.innerHTML = '';
  
  const searchInput = document.getElementById('shop-detail-search-input');
  const query = (searchInput?.value || '').trim().toLowerCase();

  let products = Array.isArray(selectedShopData.products) ? selectedShopData.products : [];
  
  if (query) {
    products = products.filter(p => 
      String(p.product_name || '').toLowerCase().includes(query) ||
      String(p.category || '').toLowerCase().includes(query)
    );
  }

  if (!products.length) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:30px; grid-column:1/-1;">No products found matching "${query}".</div>`;
    return;
  }

  products.forEach(p => {
    const photo = p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=85&w=500';
    const svgFallback = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%237c3aed' stroke-width='1.5'><rect width='18' height='18' x='3' y='3' rx='2'/><path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/><circle cx='9' cy='9' r='2'/></svg>";
    
    let statusBadge = '<span class="card-status-badge open">🟢 Available</span>';
    if (p.availability_status === 'Low Stock' || (p.available_quantity > 0 && p.available_quantity <= 5)) {
      statusBadge = '<span class="card-status-badge limited">🟡 Limited</span>';
    } else if (p.availability_status === 'Out of Stock' || p.available_quantity === 0) {
      statusBadge = '<span class="card-status-badge closed">🔴 Out of Stock</span>';
    }

    const card = document.createElement('div');
    card.className = 'product-row-item';
    card.style.cursor = 'pointer';
    card.onclick = () => viewProductDetails(p._id);
    card.innerHTML = `
      <img src="${photo}" class="prod-row-img" alt="${p.product_name || 'Product'}" onerror="this.onerror=null; this.src='${svgFallback}';">
      <div class="prod-row-info">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="prod-row-name" style="font-size:16px; font-weight:800; color:var(--text-main);">${p.product_name || 'Product'}</div>
          ${statusBadge}
        </div>
        <div class="prod-row-price" style="font-weight:700; font-size:14px; color:var(--primary-purple); margin-top:4px;">₹${Number(p.price || 0).toFixed(0)} / ${p.unit || 'kg'}</div>
      </div>
      <button class="add-product-btn-circle" onclick="event.stopPropagation(); addtoCartAlert('${String(p.product_name || 'Product').replace(/'/g, "\\'")}')">+</button>
    `;
    container.appendChild(card);
  });
}

function renderCustomerShopPhotos() {
  const gallery = document.getElementById('shop-detail-photo-gallery');
  if (!gallery || !selectedShopData) return;
  const shop = selectedShopData.shop || {};
  const rawPhotos = shop.shop_photos || shop.photos || shop.gallery || [];
  const photos = Array.isArray(rawPhotos) ? rawPhotos.filter(Boolean) : [];

  if (!photos.length) {
    gallery.innerHTML = '<div class="shop-photo-empty">No shop photos added yet.</div>';
    return;
  }
  gallery.innerHTML = photos.map((src, i) => `<img src="${src}" alt="${shop.shop_name || 'Shop'} photo ${i + 1}" onclick="openShopPhoto('${String(src).replace(/'/g, "\\'")}')">`).join('');
}

function showAllShopPhotos() {
  const gallery = document.getElementById('shop-detail-photo-gallery');
  if (!gallery) return;
  gallery.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function openShopPhoto(src) {
  window.open(src, '_blank', 'noopener,noreferrer');
}

function renderCustomerShopReviews() {
  const reviews = Array.isArray(selectedShopData?.reviews) ? selectedShopData.reviews : [];
  const avg = selectedShopData?.avg_rating || 'N/A';
  document.getElementById('shop-review-score').innerText = avg;
  document.getElementById('shop-review-count').innerText = `${reviews.length} Review${reviews.length === 1 ? '' : 's'}`;
  const starsBox = document.getElementById('shop-review-stars');
  const numeric = Number(avg) || 0;
  starsBox.innerHTML = Array.from({length: 5}, (_, i) => i + 1 <= Math.round(numeric) ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>').join('');

  const container = document.getElementById('detail-reviews-list');
  container.innerHTML = '';
  if (!reviews.length) {
    container.innerHTML = '<div class="shop-photo-empty">No reviews yet. Be the first to review this shop.</div>';
    return;
  }
  reviews.slice(0, 3).forEach(r => {
    const initial = (r.customer_name || 'C').charAt(0).toUpperCase();
    const date = r.review_date ? new Date(r.review_date).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' }) : '';
    const stars = Array.from({length:5}, (_,i) => i + 1 <= Number(r.rating) ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>').join('');
    const card = document.createElement('div');
    card.className = 'shop-review-card';
    card.innerHTML = `<div class="shop-review-user"><div class="shop-review-avatar">${initial}</div><div><span class="shop-review-name">${r.customer_name || 'Customer'}</span><span class="shop-review-date">${date}</span><div class="review-stars">${stars}</div></div></div><p class="shop-review-text">${r.review || ''}</p>`;
    container.appendChild(card);
  });
}

function toggleShopAbout() {
  const text = document.getElementById('shop-detail-desc');
  const button = document.getElementById('shop-about-toggle');
  if (!text || !button) return;
  text.classList.toggle('expanded');
  button.innerText = text.classList.contains('expanded') ? 'Read less' : 'Read more';
}

function resetShopAbout() {
  const text = document.getElementById('shop-detail-desc');
  const button = document.getElementById('shop-about-toggle');
  if (text) text.classList.remove('expanded');
  if (button) button.innerText = 'Read more';
}

function shareShop() {
  if (!selectedShopData?.shop) return;
  const shop = selectedShopData.shop;
  const shareData = { title: shop.shop_name, text: `Check out ${shop.shop_name} on Shop Vista.` };
  if (navigator.share) navigator.share(shareData).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(`${shop.shop_name} - ${shop.address || ''}`).then(() => alert('Shop details copied!'));
}

function openGuestAuthModal(actionMsg) {
  const modal = document.getElementById('guest-auth-modal');
  const msgEl = document.getElementById('guest-modal-msg');
  if (msgEl && actionMsg) {
    msgEl.innerText = `Please log in or create an account to ${actionMsg}.`;
  }
  if (modal) modal.style.display = 'flex';
}

function closeGuestAuthModal() {
  const modal = document.getElementById('guest-auth-modal');
  if (modal) modal.style.display = 'none';
}

function openReviewComposer() {
  if (!token || !currentUser) {
    openGuestAuthModal('write a review for this store');
    return;
  }

  reviewRating = 0;
  const ratingLabel = document.getElementById('selected-rating-label');
  if (ratingLabel) ratingLabel.innerText = 'Tap a star to rate';

  document.querySelectorAll('.modal-star-rate').forEach(star => {
    star.className = 'fa-regular fa-star modal-star-rate';
  });

  const textInput = document.getElementById('review-text-input');
  if (textInput) textInput.value = '';

  const modal = document.getElementById('customer-review-modal');
  if (modal) modal.style.display = 'flex';
}

function closeReviewComposer() {
  const modal = document.getElementById('customer-review-modal');
  if (modal) modal.style.display = 'none';
}

function switchDetailTab(tabName) {
  if (tabName === 'products') renderCustomerShopProducts();
  if (tabName === 'reviews') renderCustomerShopReviews();
}

// Compatibility helpers for existing customer flows.
function renderShopProductsList() { renderCustomerShopProducts(); }
function filterShopProducts() { renderCustomerShopProducts(); }
function renderShopReviewsList() { renderCustomerShopReviews(); }

async function submitShopReview(e) {
  e.preventDefault();
  const text = document.getElementById('review-text-input').value.trim();
  if (reviewRating === 0) { alert('Please select a star rating first!'); return; }
  if (!text) { alert('Please write a review.'); return; }
  try {
    const res = await fetch(`/api/customer/shops/${selectedShopId}/reviews`, {
      method:'POST', headers: authHeaders(true),
      body:JSON.stringify({rating:reviewRating, review:text})
    });
    const data = await res.json();
    if (res.status === 201) {
      document.getElementById('review-text-input').value = '';
      reviewRating = 0;
      document.querySelectorAll('.modal-star-rate').forEach(star => star.className = 'fa-regular fa-star modal-star-rate');
      closeReviewComposer();
      const detailsRes = await fetch(`/api/customer/shops/${selectedShopId}`);
      selectedShopData = await detailsRes.json();
      renderCustomerShopReviews();
      alert('Thank you! Your review has been posted successfully.');
    } else alert(data.message || 'Failed to submit review.');
  } catch (err) { alert('Network error submitting review.'); }
}

function setReviewRating(rating) {
  reviewRating = rating;
  const labels = ['', '1 ★ Poor', '2 ★ Fair', '3 ★ Good', '4 ★ Very Good', '5 ★ Excellent!'];
  const labelEl = document.getElementById('selected-rating-label');
  if (labelEl) labelEl.innerText = labels[rating] || '';

  document.querySelectorAll('.modal-star-rate').forEach((star, index) => {
    star.className = index < rating ? 'fa-solid fa-star modal-star-rate active' : 'fa-regular fa-star modal-star-rate';
  });
}

// --- PRODUCT DETAILS MODAL VIEW LOGIC ---

function viewProductDetails(productId) {
  let product = null;
  let shopName = 'Local Registered Store';
  let shopId = '';

  product = allProducts.find(p => String(p._id) === String(productId));
  if (product) {
    shopName = product.shop_name;
    shopId = product.shop_id;
  } else if (selectedShopData) {
    product = selectedShopData.products.find(p => String(p._id) === String(productId));
    if (product) {
      shopName = selectedShopData.shop.shop_name;
      shopId = selectedShopData.shop._id;
    }
  }

  if (!product) {
    alert('Product details could not be found.');
    return;
  }

  document.getElementById('prod-detail-modal-name').innerText = product.product_name;
  document.getElementById('prod-detail-modal-title').innerText = product.product_name;
  document.getElementById('prod-detail-modal-category').innerText = product.category;
  document.getElementById('prod-detail-modal-price').innerText = `₹${product.price.toFixed(2)}`;
  document.getElementById('prod-detail-modal-desc').innerText = product.description || 'No description provided by owner.';
  document.getElementById('prod-detail-modal-img').src = product.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200";

  const qty = product.available_quantity !== undefined ? product.available_quantity : 0;
  const unit = product.unit || 'Piece';
  const status = product.availability_status || 'Out of Stock';
  
  document.getElementById('prod-detail-modal-stock-lbl').innerText = `${qty} ${qty > 1 ? unit + 's' : unit}`;
  
  const statusBadge = document.getElementById('prod-detail-modal-status-badge');
  let statusClass = 'open';
  if (status === 'Low Stock') statusClass = 'busy';
  else if (status === 'Out of Stock') statusClass = 'closed';
  
  statusBadge.className = `card-status-badge ${statusClass}`;
  statusBadge.innerText = status;

  document.getElementById('prod-detail-modal-shop-name').innerText = shopName;
  const shopLink = document.getElementById('prod-detail-shop-link');
  shopLink.onclick = () => {
    closeProductDetailModal();
    viewShopDetails(shopId);
  };

  document.getElementById('prod-detail-modal-buy-btn').onclick = () => {
    addToCart(product._id);
    closeProductDetailModal();
  };

  document.getElementById('product-detail-modal').style.display = 'flex';
}

function closeProductDetailModal() {
  document.getElementById('product-detail-modal').style.display = 'none';
}

function callShop() {
  if (!selectedShopData || !selectedShopData.shop.contact_number) return;
  showToast(`Dialing ${selectedShopData.shop.contact_number}...`, 'info');
}

function copyShopNumber() {
  if (!selectedShopData || !selectedShopData.shop.contact_number) return;
  navigator.clipboard.writeText(selectedShopData.shop.contact_number);
  showToast('Shop contact number copied to clipboard!', 'success');
}

function simulateSelectLocation() {
  const loc = prompt("Simulate location update. Enter area label:", "Koramangala, Bengaluru");
  if (loc) {
    document.getElementById('home-coords-lbl').innerText = loc;
    showToast(`Location updated to ${loc}`, 'success');
    loadHomeData();
  }
}

// --- TOAST NOTIFICATION HELPER ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `sv-toast ${type}`;
  const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info');
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastSlideIn 0.3s ease reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- CART STATE & DRAWER HANDLERS ---
let cartItems = [];
let activeQuickFilter = 'all';

function addToCart(productId) {
  let product = allProducts.find(p => String(p._id) === String(productId));
  if (!product && selectedShopData && Array.isArray(selectedShopData.products)) {
    product = selectedShopData.products.find(p => String(p._id) === String(productId));
  }

  if (!product) {
    showToast('Product details not found.', 'error');
    return;
  }

  const currentShopId = product.shop_id;
  const currentShopName = product.shop_name || (selectedShopData?.shop?.shop_name) || 'Local Store';

  if (cartItems.length > 0 && String(cartItems[0].shop_id) !== String(currentShopId)) {
    const confirmSwitch = confirm(`Your cart contains items from another shop (${cartItems[0].shop_name}). Would you like to clear cart and start a new order from ${currentShopName}?`);
    if (!confirmSwitch) return;
    cartItems = [];
  }

  const existingIndex = cartItems.findIndex(item => String(item.product_id) === String(product._id));
  if (existingIndex > -1) {
    cartItems[existingIndex].quantity += 1;
  } else {
    cartItems.push({
      product_id: String(product._id),
      product_name: product.product_name,
      price: Number(product.price || 0),
      quantity: 1,
      unit: product.unit || 'Piece',
      image: product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200',
      shop_id: String(currentShopId),
      shop_name: currentShopName
    });
  }

  updateCartUI();
  showToast(`Added ${product.product_name} to cart! 🛒`, 'success');
}

function addtoCartAlert(nameOrId) {
  let product = allProducts.find(p => p.product_name === nameOrId || String(p._id) === String(nameOrId));
  if (!product && selectedShopData && Array.isArray(selectedShopData.products)) {
    product = selectedShopData.products.find(p => p.product_name === nameOrId || String(p._id) === String(nameOrId));
  }

  if (product) {
    addToCart(product._id);
  } else {
    showToast(`Added ${nameOrId} to cart!`, 'success');
  }
}

function updateCartUI() {
  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cart-badge-count');
  const floatingBtn = document.getElementById('floating-cart-btn');

  if (badge) badge.innerText = totalCount;
  if (floatingBtn) {
    floatingBtn.style.display = totalCount > 0 ? 'flex' : 'none';
  }

  renderCartDrawer();
}

function openCartDrawer() {
  const drawer = document.getElementById('cart-drawer-overlay');
  if (drawer) drawer.classList.add('active');
  renderCartDrawer();
}

function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer-overlay');
  if (drawer) drawer.classList.remove('active');
}

function renderCartDrawer() {
  const container = document.getElementById('cart-items-container');
  const footerBox = document.getElementById('cart-footer-box');
  const shopLbl = document.getElementById('cart-shop-name-lbl');
  if (!container || !footerBox) return;

  if (cartItems.length === 0) {
    if (shopLbl) shopLbl.innerText = 'Your cart is empty';
    container.innerHTML = `
      <div style="text-align:center; padding:60px 20px; color:var(--text-muted);">
        <i class="fa-solid fa-cart-shopping" style="font-size:48px; color:var(--border-color); margin-bottom:12px;"></i>
        <h4 style="font-size:16px; font-weight:700; color:var(--text-main); margin-bottom:4px;">Your cart is empty</h4>
        <p style="font-size:12px;">Add items from any shop to place an order.</p>
      </div>
    `;
    footerBox.innerHTML = '';
    return;
  }

  if (shopLbl) shopLbl.innerText = `From ${cartItems[0].shop_name}`;

  container.innerHTML = cartItems.map(item => `
    <div class="cart-item-row">
      <img src="${item.image}" class="cart-item-img" alt="${item.product_name}">
      <div style="flex:1;">
        <strong style="font-size:14px; color:var(--text-main); display:block;">${item.product_name}</strong>
        <span style="font-size:12px; color:var(--primary-purple); font-weight:700;">₹${item.price.toFixed(2)} / ${item.unit}</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <button class="cart-qty-btn" onclick="updateCartItemQty('${item.product_id}', -1)">-</button>
        <span style="font-weight:800; font-size:13px;">${item.quantity}</span>
        <button class="cart-qty-btn" onclick="updateCartItemQty('${item.product_id}', 1)">+</button>
      </div>
    </div>
  `).join('');

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  footerBox.innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:15px; font-weight:800; color:var(--text-main);">
      <span>Subtotal</span>
      <span style="color:var(--primary-purple);">₹${subtotal.toFixed(2)}</span>
    </div>
    <button class="btn-block btn-theme" onclick="openCheckoutModal()">Proceed to Checkout</button>
  `;
}

function updateCartItemQty(productId, delta) {
  const index = cartItems.findIndex(item => String(item.product_id) === String(productId));
  if (index > -1) {
    cartItems[index].quantity += delta;
    if (cartItems[index].quantity <= 0) {
      cartItems.splice(index, 1);
    }
  }
  updateCartUI();
}

function openCheckoutModal() {
  if (!token || !currentUser) {
    showToast('Please log in to your customer account to checkout.', 'info');
    closeCartDrawer();
    goToCustomerAuth();
    return;
  }

  if (cartItems.length === 0) {
    showToast('Your cart is empty!', 'error');
    return;
  }

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  document.getElementById('chk-subtotal').innerText = `₹${subtotal.toFixed(2)}`;
  document.getElementById('chk-discount').innerText = `-₹0.00`;
  document.getElementById('chk-final').innerText = `₹${subtotal.toFixed(2)}`;

  closeCartDrawer();
  const modal = document.getElementById('checkout-modal');
  if (modal) modal.style.display = 'flex';
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkout-modal');
  if (modal) modal.style.display = 'none';
}

function toggleDeliveryAddressField(type) {
  const group = document.getElementById('delivery-address-group');
  const input = document.getElementById('checkout-address');
  if (group && input) {
    if (type === 'Pickup') {
      group.style.display = 'none';
      input.required = false;
    } else {
      group.style.display = 'block';
      input.required = true;
    }
  }
}

async function handlePlaceOrder(e) {
  e.preventDefault();
  if (cartItems.length === 0) {
    showToast('Your cart is empty!', 'error');
    return;
  }

  if (!token || !currentUser) {
    showToast('Please log in to your customer account to place an order.', 'error');
    closeCheckoutModal();
    goToCustomerAuth();
    return;
  }

  const order_type = document.getElementById('checkout-order-type').value;
  const delivery_address = document.getElementById('checkout-address').value;
  const payment_method = document.getElementById('checkout-payment-method').value;

  const shop_id = cartItems[0].shop_id;

  try {
    const res = await fetch('/api/customer/orders', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({
        shop_id,
        items: cartItems,
        order_type,
        delivery_address,
        payment_method
      })
    });

    const data = await res.json().catch(() => null);

    if (res.status === 201 && data) {
      closeCheckoutModal();
      cartItems = [];
      updateCartUI();

      document.getElementById('track-order-id-lbl').innerText = `Order ID: #${String(data._id).slice(-6).toUpperCase()}`;
      document.getElementById('track-shop-name').innerText = data.shop_name || 'Local Store';
      document.getElementById('track-order-status').innerText = `🟢 ${data.order_status}`;
      document.getElementById('track-total-amount').innerText = `₹${Number(data.total_amount).toFixed(2)}`;

      const trackingModal = document.getElementById('order-tracking-modal');
      if (trackingModal) trackingModal.style.display = 'flex';

      showToast('Order placed successfully! 🎉', 'success');
    } else {
      const errMsg = (data && data.message) ? data.message : `Failed to place order (Server error ${res.status}).`;
      showToast(errMsg, 'error');
    }
  } catch (err) {
    console.error('Order error:', err);
    showToast('Network error submitting order.', 'error');
  }
}

function closeOrderTrackingModal() {
  const modal = document.getElementById('order-tracking-modal');
  if (modal) modal.style.display = 'none';
}

function toggleQuickFilter(filterType, btnEl) {
  activeQuickFilter = filterType;
  document.querySelectorAll('#explore-filter-pills .filter-pill').forEach(btn => btn.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  handleSearchFilter();
}

window.onclick = function(event) {
  const prodModal = document.getElementById('product-detail-modal');
  const profModal = document.getElementById('profile-edit-modal');
  if (event.target === prodModal) {
    prodModal.style.display = 'none';
  } else if (event.target === profModal) {
    profModal.style.display = 'none';
  }
};

