// --- CUSTOMER APP LOGIC ---

let token = localStorage.getItem('customer_token') || null;
let currentUser = null;
let activeTab = 'home';
let allShops = [];
let allProducts = [];
let currentCategory = 'All';
let selectedShopId = null;
let selectedShopData = null; // detailed shop payload
let reviewRating = 0; // selected rating for reviews form

// Category data mapping matching provided UI specifications
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
});

// App Startup Flow
async function initAppFlow() {
  if (token) {
    const verified = await verifyToken();
    if (verified) {
      showDashboard();
    } else {
      goToCustomerAuth();
    }
  } else {
    // Show splash screen initially (role gateway)
    showScreen('splash');
  }
}

// Token Verification
async function verifyToken() {
  try {
    const res = await fetch('/api/auth/customer/me', {
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

// Navigations
function showScreen(screenId) {
  document.querySelectorAll('.screen-view').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${screenId}`).classList.add('active');
  
  // Hide nav bar on Splash/Auth/Detail screens
  const navBar = document.getElementById('app-nav-bar');
  if (screenId === 'splash' || screenId === 'auth' || screenId === 'shop-detail') {
    navBar.style.display = 'none';
  } else {
    navBar.style.display = 'flex';
  }
}

function goToCustomerAuth() {
  showScreen('auth');
  toggleAuthMode(true); // default login
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
  document.getElementById('app-nav-bar').style.display = 'flex';
  switchTab('home');
}

// Tab switcher
function switchTab(tabId) {
  activeTab = tabId;
  
  // Update nav buttons active state
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const activeBtn = document.getElementById(`nav-btn-${tabId}`);
  if (activeBtn) activeBtn.classList.add('active');

  showScreen(tabId);

  // Load screen data
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
    // 1. Categories Slider
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

    // 2. Fetch Shops
    const res = await fetch('/api/customer/shops');
    allShops = await res.json();

    // 3. Offers Promo Banner Setup
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

    // 4. Render Shops List
    const homeShopsBox = document.getElementById('home-shops-box');
    homeShopsBox.innerHTML = '';
    allShops.forEach(shop => {
      const card = document.createElement('div');
      card.className = 'glass-shop-card';
      card.onclick = () => viewShopDetails(shop._id);
      
      const photo = shop.shop_photo || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200";
      const discountTag = shop.active_discount ? `<span class="card-discount-tag">${shop.active_discount.percentage}% OFF</span>` : '';
      
      let statusClass = 'open';
      if (shop.shop_status === 'Closed') statusClass = 'closed';
      else if (shop.shop_status === 'Busy') statusClass = 'busy';

      card.innerHTML = `
        <img src="${photo}" class="shop-card-img" alt="${shop.shop_name}">
        ${discountTag}
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
            <div class="shop-card-timing">Open: ${shop.opening_time} - ${shop.closing_time}</div>
            <span class="card-status-badge ${statusClass}">${shop.shop_status}</span>
          </div>
        </div>
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
    
    // Accumulate all products across all stores
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
    card.onclick = () => viewProductDetails(p._id);
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
  if (!currentUser) return;
  document.getElementById('profile-name').innerText = currentUser.name;
  document.getElementById('profile-email').innerText = currentUser.email;
  document.getElementById('profile-avatar').innerText = currentUser.name.charAt(0).toUpperCase();
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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

// --- SHOP DETAILS PROFILE SCREEN ---

async function viewShopDetails(shopId) {
  selectedShopId = shopId;
  
  try {
    const res = await fetch(`/api/customer/shops/${shopId}`);
    selectedShopData = await res.json();
    
    const shop = selectedShopData.shop;
    document.getElementById('shop-detail-name').innerText = shop.shop_name;
    document.getElementById('shop-detail-category').innerText = shop.category;
    document.getElementById('shop-detail-rating').innerHTML = `<i class="fa-solid fa-star"></i> ${selectedShopData.avg_rating}`;
    document.getElementById('shop-detail-desc').innerText = shop.description || 'No description listed.';
    document.getElementById('shop-detail-address').innerText = shop.address;
    document.getElementById('shop-detail-timings').innerText = `Opening: ${shop.opening_time} | Closing: ${shop.closing_time}`;

    const photo = shop.shop_photo || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600";
    document.getElementById('shop-detail-banner').style.backgroundImage = `url('${photo}')`;

    let statusClass = 'open';
    if (shop.shop_status === 'Closed') statusClass = 'closed';
    else if (shop.shop_status === 'Busy') statusClass = 'busy';
    const statusB = document.getElementById('shop-detail-status-badge');
    statusB.className = `card-status-badge ${statusClass}`;
    statusB.innerText = shop.shop_status;

    const discBanner = document.getElementById('shop-detail-offer-banner');
    if (selectedShopData.active_discount) {
      document.getElementById('shop-detail-offer-percent').innerText = `${selectedShopData.active_discount.percentage}% OFF`;
      document.getElementById('shop-detail-offer-title').innerText = selectedShopData.active_discount.title;
      discBanner.style.display = 'flex';
    } else {
      discBanner.style.display = 'none';
    }

    const favs = getFavorites();
    const isFav = favs.includes(shopId);
    document.getElementById('shop-detail-fav-icon').className = isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart';

    switchDetailTab('products');
    showScreen('shop-detail');

  } catch (err) {
    console.error('Error loading shop profile:', err);
  }
}

function closeShopDetails() {
  switchTab(activeTab);
}

function switchDetailTab(tabName) {
  document.querySelectorAll('.detail-tab-item').forEach(item => item.classList.remove('active'));
  document.getElementById(`detail-tab-${tabName}`).classList.add('active');

  document.querySelectorAll('.tab-detail-content').forEach(c => c.style.display = 'none');
  document.getElementById(`detail-content-${tabName}`).style.display = 'block';

  if (tabName === 'products') {
    renderShopProductsList();
  } else if (tabName === 'reviews') {
    renderShopReviewsList();
  }
}

function renderShopProductsList() {
  const container = document.getElementById('detail-products-list');
  container.innerHTML = '';
  
  const searchQ = document.getElementById('shop-product-search').value.toLowerCase();
  let products = selectedShopData.products;

  if (searchQ) {
    products = products.filter(p => p.product_name.toLowerCase().includes(searchQ));
  }

  if (products.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">No products in stock.</div>`;
    return;
  }

  products.forEach(p => {
    let statusClass = 'available';
    if (p.availability_status === 'Low Stock') statusClass = 'low-stock';
    else if (p.availability_status === 'Out of Stock') statusClass = 'out-of-stock';

    const photo = p.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200";

    const card = document.createElement('div');
    card.className = 'product-row-item';
    card.style.cursor = 'pointer';
    card.onclick = () => viewProductDetails(p._id);
    card.innerHTML = `
      <img src="${photo}" class="prod-row-img" alt="${p.product_name}">
      <div class="prod-row-info">
        <div class="prod-row-name">${p.product_name}</div>
        <div class="prod-row-price">₹${p.price.toFixed(2)} / ${p.unit || 'Piece'}</div>
        <div class="prod-row-stock ${statusClass}">${p.availability_status} (${p.available_quantity} available)</div>
      </div>
      <button class="add-product-btn-circle" onclick="event.stopPropagation(); addtoCartAlert('${p.product_name}')">+</button>
    `;
    container.appendChild(card);
  });
}

function filterShopProducts() {
  renderShopProductsList();
}

// --- PRODUCT DETAILS MODAL VIEW LOGIC ---

function viewProductDetails(productId) {
  // 1. Find product in local arrays
  let product = null;
  let shopName = 'Local Registered Store';
  let shopId = '';

  // Search in accumulated explore array first
  product = allProducts.find(p => String(p._id) === String(productId));
  if (product) {
    shopName = product.shop_name;
    shopId = product.shop_id;
  } else if (selectedShopData) {
    // Search in current active shop details
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

  // 2. Set modal contents
  document.getElementById('prod-detail-modal-name').innerText = product.product_name;
  document.getElementById('prod-detail-modal-title').innerText = product.product_name;
  document.getElementById('prod-detail-modal-category').innerText = product.category;
  document.getElementById('prod-detail-modal-price').innerText = `₹${product.price.toFixed(2)}`;
  document.getElementById('prod-detail-modal-desc').innerText = product.description || 'No description provided by owner.';
  document.getElementById('prod-detail-modal-img').src = product.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200";

  // Stock details
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

  // Shop association link mapping
  document.getElementById('prod-detail-modal-shop-name').innerText = shopName;
  const shopLink = document.getElementById('prod-detail-shop-link');
  shopLink.onclick = () => {
    closeProductDetailModal();
    viewShopDetails(shopId);
  };

  // Buy button click
  document.getElementById('prod-detail-modal-buy-btn').onclick = () => {
    addtoCartAlert(product.product_name);
  };

  // 3. Open Modal
  document.getElementById('product-detail-modal').style.display = 'flex';
}

function closeProductDetailModal() {
  document.getElementById('product-detail-modal').style.display = 'none';
}

// Render reviews in detail view
function renderShopReviewsList() {
  const container = document.getElementById('detail-reviews-list');
  container.innerHTML = '';

  const reviews = selectedShopData.reviews;

  if (reviews.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">No reviews yet. Be the first to leave one!</div>`;
    return;
  }

  reviews.forEach(r => {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += i <= r.rating ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
    }
    const initial = r.customer_name.charAt(0).toUpperCase();
    const dateStr = new Date(r.review_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    const card = document.createElement('div');
    card.className = 'review-item-card';
    card.innerHTML = `
      <div class="review-item-header">
        <div class="review-item-user">
          <div class="review-item-user-img">${initial}</div>
          <span>${r.customer_name}</span>
        </div>
        <span class="review-item-date">${dateStr}</span>
      </div>
      <div class="stars-row">${stars}</div>
      <p class="review-item-text">${r.review}</p>
    `;
    container.appendChild(card);
  });
}

// Handle Rating Click
function setReviewRating(rating) {
  reviewRating = rating;
  const stars = document.querySelectorAll('.star-rate');
  stars.forEach((star, index) => {
    if (index < rating) {
      star.className = 'fa-solid fa-star star-rate';
    } else {
      star.className = 'fa-regular fa-star star-rate';
    }
  });
}

// Submit a Review
async function submitShopReview(e) {
  e.preventDefault();
  const text = document.getElementById('review-text-input').value;

  if (reviewRating === 0) {
    alert('Please select a star rating first!');
    return;
  }

  try {
    const res = await fetch(`/api/customer/shops/${selectedShopId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ rating: reviewRating, review: text })
    });

    if (res.status === 201) {
      document.getElementById('review-text-input').value = '';
      setReviewRating(0);
      
      const detailsRes = await fetch(`/api/customer/shops/${selectedShopId}`);
      selectedShopData = await detailsRes.json();
      renderShopReviewsList();
      alert('Thank you! Your review has been posted successfully.');
    } else {
      const data = await res.json();
      alert(data.message || 'Failed to submit review.');
    }
  } catch (err) {
    alert('Network error submitting review.');
  }
}

// --- CALL / COPY UTILS ---
function callShop() {
  if (!selectedShopData || !selectedShopData.shop.contact_number) return;
  alert(`Simulating phone dial: Dialing ${selectedShopData.shop.contact_number}...`);
}

function copyShopNumber() {
  if (!selectedShopData || !selectedShopData.shop.contact_number) return;
  navigator.clipboard.writeText(selectedShopData.shop.contact_number);
  alert('Shop contact number copied to clipboard!');
}

// --- GEOLOCATION SIMULATOR MOCKUP ---
function simulateSelectLocation() {
  const loc = prompt("Simulate location update. Enter coordinate label (e.g. Indiranagar, Bengaluru or Koramangala, Bengaluru):", "Koramangala, Bengaluru");
  if (loc) {
    document.getElementById('home-coords-lbl').innerText = loc;
    loadHomeData();
  }
}

// Close popup modals if clicking outside content
window.onclick = function(event) {
  const prodModal = document.getElementById('product-detail-modal');
  const profModal = document.getElementById('profile-edit-modal');
  if (event.target === prodModal) {
    prodModal.style.display = 'none';
  } else if (event.target === profModal) {
    profModal.style.display = 'none';
  }
};
