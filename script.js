// API_BASE is declared in auth.js
let products = [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let activeCategory = "Tất cả";
let currentSearch = "";
let currentModalProductId = null;
let selectedSize = null;
let selectedColor = null;

// Sandbox Filter States
let activeColorFilter = "";
let activeFitFilter = "";
let activeSort = "default";
let activeMinPrice = null;
let activeMaxPrice = null;

// --- PREMIUM FILTER DRAWER LOGIC ---
function toggleFilterDrawer() {
    const drawer = document.getElementById('filter-drawer');
    const overlay = document.getElementById('filter-overlay');
    if (!drawer || !overlay) return;
    drawer.classList.toggle('open');
    overlay.classList.toggle('open');
    if (drawer.classList.contains('open')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

function selectFilterChip(el) {
    const type = el.getAttribute('data-type');
    const value = el.getAttribute('data-value');
    
    // Deactivate others in the same group
    const parent = el.parentElement;
    parent.querySelectorAll('.chip, .pill, .color-chip').forEach(c => c.classList.remove('active'));
    
    // Activate current
    el.classList.add('active');
    
    // Update state
    if (type === 'category') activeCategory = value;
    if (type === 'color') activeColorFilter = value;
    if (type === 'sort') activeSort = value;
}

function applyFiltersFromDrawer() {
    activeMinPrice = document.getElementById('drawer-min-price').value ? parseInt(document.getElementById('drawer-min-price').value) : null;
    activeMaxPrice = document.getElementById('drawer-max-price').value ? parseInt(document.getElementById('drawer-max-price').value) : null;
    
    renderProducts();
    toggleFilterDrawer();
    
    // Show active filter bar if search/filter is active
    updateActiveFilterBar();
}

function resetAllFilters() {
    activeCategory = "Tất cả";
    activeColorFilter = "";
    activeMinPrice = null;
    activeMaxPrice = null;
    activeSort = "default";
    
    // Reset UI
    document.querySelectorAll('.filter-drawer .active').forEach(el => el.classList.remove('active'));
    document.querySelector('[data-value="Tất cả"]').classList.add('active');
    document.querySelector('[data-value="default"]').classList.add('active');
    document.getElementById('drawer-min-price').value = '';
    document.getElementById('drawer-max-price').value = '';
    
    renderProducts();
    updateActiveFilterBar();
}

function updateActiveFilterBar() {
    const bar = document.getElementById('active-filters-display');
    if (!bar) return;
    
    if (activeCategory === "Tất cả" && !activeColorFilter && !activeMinPrice && !activeMaxPrice && activeSort === "default") {
        bar.style.display = 'none';
        return;
    }
    
    bar.style.display = 'flex';
    bar.innerHTML = `
        <span style="font-size: 0.8rem; font-weight: 700; color: #888; text-transform: uppercase;">Bộ lọc đang áp dụng:</span>
        ${activeCategory !== "Tất cả" ? `<button class="chip" onclick="resetSingleFilter('category')">${activeCategory} <i class="fas fa-times"></i></button>` : ''}
        ${activeColorFilter ? `<button class="chip" onclick="resetSingleFilter('color')">Màu: ${activeColorFilter} <i class="fas fa-times"></i></button>` : ''}
        <button class="chip" onclick="resetAllFilters()" style="background:transparent; border:1px dashed #ddd; color:#888;">Xóa hết</button>
    `;
}

function resetSingleFilter(type) {
    if (type === 'category') activeCategory = "Tất cả";
    if (type === 'color') activeColorFilter = "";
    renderProducts();
    updateActiveFilterBar();
}

// --- SEARCH OVERLAY LOGIC (OWEN STYLE) ---
function toggleSearchOverlay() {
    const overlay = document.getElementById('search-overlay');
    if (!overlay) return;
    
    overlay.classList.toggle('open');
    if (overlay.classList.contains('open')) {
        document.getElementById('global-search-input').focus();
        renderRecentSearches();
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

function handleSearch(term) {
    const clearBtn = document.getElementById('clear-search-btn');
    const recent = document.getElementById('recent-searches-container');
    const results = document.getElementById('search-results-container');
    
    if (term.length > 0) {
        clearBtn.style.display = 'block';
        recent.style.display = 'none';
        results.style.display = 'block';
        renderSearchResults(term);
    } else {
        clearBtn.style.display = 'none';
        recent.style.display = 'block';
        results.style.display = 'none';
    }
}

function clearSearch() {
    const input = document.getElementById('global-search-input');
    input.value = '';
    input.focus();
    handleSearch('');
}

function renderRecentSearches() {
    const container = document.getElementById('recent-search-pills');
    const recents = JSON.parse(localStorage.getItem('recentSearches')) || ['Áo sơ mi', 'Quần tây', 'Polo', 'Mẫu mới'];
    
    container.innerHTML = recents.map(r => `
        <button class="search-pill" onclick="executeSearch('${r}')">${r}</button>
    `).join('');
}

function executeSearch(term) {
    // Save to recent
    let recents = JSON.parse(localStorage.getItem('recentSearches')) || ['Áo sơ mi', 'Quần tây', 'Polo', 'Mẫu mới'];
    recents = [term, ...recents.filter(x => x !== term)].slice(0, 8);
    localStorage.setItem('recentSearches', JSON.stringify(recents));
    
    currentSearch = term.toLowerCase();
    loadProducts();
    toggleSearchOverlay();
}

function renderSearchResults(term) {
    const grid = document.getElementById('global-search-results');
    const filtered = products.filter(p => p.name.toLowerCase().includes(term.toLowerCase())).slice(0, 5);
    
    if (filtered.length === 0) {
        grid.innerHTML = '<p style="color:#aaa; font-style:italic;">Không tìm thấy sản phẩm phù hợp.</p>';
        return;
    }
    
    grid.innerHTML = filtered.map(p => `
        <div class="search-result-item" onclick="executeSearch('${p.name}')">
            <img src="${p.img}" alt="${p.name}">
            <div class="res-info">
                <h5>${p.name}</h5>
                <p>${p.price.toLocaleString()} đ</p>
            </div>
        </div>
    `).join('');
}

// --- MOBILE MENU TAB LOGIC ---
function switchMobileMenuTab(tab) {
    document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById(`content-${tab}`).classList.add('active');
    
    if (tab === 'account') renderMobileAccountView();
}

function renderMobileAccountView() {
    const user = getCurrentUser();
    const container = document.getElementById('mobile-user-card');
    
    if (!user) {
        container.innerHTML = `
            <div style="text-align:center;">
                <p style="margin-bottom:15px; color:#666;">Bạn chưa đăng nhập</p>
                <button class="btn-primary" onclick="location.href='login.html'" style="padding: 10px 30px; border-radius: 99px;">ĐĂNG NHẬP / ĐĂNG KÝ</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="brief-info" style="display:flex; align-items:center; gap:15px;">
                <div style="width:50px; height:50px; background:#f0f0f0; border-radius:50%; display:grid; place-items:center; font-size:1.5rem;">👤</div>
                <div>
                    <h3 style="margin:0;">Chào, ${user.username}!</h3>
                    <p style="margin:0; font-size:0.8rem; color:var(--primary-gold);">Khách hàng thân thiết</p>
                </div>
            </div>
        `;
    }
}


let globalFreeShipThreshold = 500000;

const COLOR_MAP = {
  'Den': '#111111', 'Trang': '#f5f5f5', 'Xam': '#9ca3af', 'Nau': '#92400e',
  'Xanh Navy': '#1e3a5f', 'Xanh Duong': '#3b82f6', 'Xanh La': '#10b981',
  'Do': '#ef4444', 'Vang': '#f59e0b', 'Hong': '#ec4899', 'Tim': '#8b5cf6', 'Cam': '#f97316'
};

const fallbackProducts = [
  { id: "owen-1", name: "Áo Polo - APV23620", price: 399000, img: "assets/polo.png", category: "ÁO", rating: 5, colors: ['#000', '#333', '#fff'], sizes: ['S','M','L','XL'], isHot: true, isOnlineOnly: true },
  { id: "owen-2", name: "Áo sơ mi - AS230913T", price: 550000, img: "assets/shirt.png", category: "ÁO", rating: 4.5, colors: ['#fff', '#e5e7eb'], sizes: ['M','L','XL','XXL'], isNew: true },
  { id: "owen-3", name: "Quần Short - QS230101", price: 350000, img: "assets/belt_shorts.png", category: "QUẦN", rating: 4, colors: ['#1e40af', '#334155'], sizes: ['29','30','31','32'] },
  { id: "owen-4", name: "Quần Tây - QT230801", price: 650000, img: "assets/trousers.png", category: "QUẦN", rating: 4.8, colors: ['#111', '#1f2937'], sizes: ['30','31','32','33'], isHot: true },
  { id: "owen-5", name: "Thắt lưng da - TL2301", price: 450000, img: "assets/belt_shorts.png", category: "PHỤ KIỆN", rating: 5, colors: ['#000'], sizes: ['F'] },
  { id: "owen-6", name: "Áo khoác Blazer - AK2305", price: 1250000, img: "assets/blazer.png", category: "ÁO", rating: 4.9, colors: ['#000', '#111'], sizes: ['L','XL'], isNew: true }
];


let quantity = 1;

function getQueryString() {
  const params = new URLSearchParams();
  if (activeCategory !== "Tất cả") params.set("category", activeCategory);
  if (currentSearch) params.set("search", currentSearch);
  return params.toString();
}

function renderSkeletons() {
  const list = document.getElementById("product-list");
  if (!list) return;
  document.getElementById("product-count").innerText = "Đang tải...";
  list.innerHTML = Array.from({ length: 6 }).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-block" style="height: 220px; border-radius: 20px;"></div>
      <div class="skeleton-block"></div>
      <div class="skeleton-block short"></div>
      <div class="skeleton-block"></div>
    </div>
  `).join("");
}

async function loadProducts(isSilent = false) {
  // --- KIỂM TRA CHẾ ĐỘ BẢO TRÌ & SETTINGS TOÀN CỤC ---
  try {
    const sRes = await fetch(`${API_BASE}/settings`);
    const settings = await sRes.json();
    
    // Update global threshold & Announcement bar
    if (settings.freeShipThreshold) {
        globalFreeShipThreshold = settings.freeShipThreshold;
        const announceEl = document.getElementById('announce-threshold');
        if (announceEl) announceEl.innerText = globalFreeShipThreshold.toLocaleString() + 'đ';
    }

    if (settings.maintenanceMode && (!getCurrentUser() || getCurrentUser().username.toLowerCase() !== 'vung1602')) {
        showMaintenanceOverlay();
        return; 
    }
  } catch(e) { console.warn("Could not load settings", e); }

  if (!isSilent) renderSkeletons();
  try {
    const query = getQueryString();
    const res = await fetch(`${API_BASE}/products${query ? `?${query}` : ""}`);
    if (!res.ok) throw new Error("API base returned error");
    const data = await res.json();
    
    // Convert data
    const newProducts = Array.isArray(data)
      ? data.map(product => ({
          id: product._id || product.id,
          name: product.name,
          price: product.price,
          img: product.image || product.img,
          category: product.category || "Khác",
          description: product.description || "Sản phẩm thời trang cao cấp, chất liệu êm ái và thiết kế tối giản.",
          features: product.features || [],
          sizes: product.sizes || [],
          colors: product.colors || [],
          variants: product.variants || [],
          rating: product.rating || 4.8
        }))
      : [];

    // Check for NEW products during silent reload (only if not searching/filtering)
    if (isSilent && products.length > 0 && !query) {
       const oldIds = new Set(products.map(p => p.id));
       const hasNew = newProducts.some(p => !oldIds.has(p.id));
       if (hasNew) {
           showToast("Có sản phẩm mới vừa về! [Tải lại]", "info");
           // We don't force render here, let the user decide or wait for next focus
       }
    }

    products = newProducts;
    
    if (products.length === 0 && !query) {
       products = fallbackProducts;
    }
  } catch (error) {
    console.error("Không tải được sản phẩm từ API, sử dụng dữ liệu mẫu:", error);
    if (!isSilent) products = fallbackProducts;
  }

  renderCategories();
  renderProducts();
  renderCart();
}

async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) return;
    const cats = await res.json();
    
    const nav = document.querySelector('.yame-nav');
    if (!nav) return;
    
    let html = '';
    cats.forEach(c => {
      let subHtml = '';
      if (c.subcategories && c.subcategories.length > 0) {
        subHtml = `<div class="mega-menu"><div class="mega-col"><h4>DANH MỤC</h4>`;
        c.subcategories.forEach(sub => subHtml += `<a href="#" onclick="filterCategory('${sub}')">${sub}</a>`);
        subHtml += `</div></div>`;
      }
      
      html += `
        <div class="nav-item">
            <a href="#" onclick="filterCategory('${c.name}')">${c.name.toUpperCase()}</a>
            ${subHtml}
        </div>
      `;
    });
    
    html += `<div class="nav-item"><a href="#">MỤC KHÁC</a></div>`;
    nav.innerHTML = html;
  } catch(e) {
    console.error("Lỗi load danh mục:", e);
  }
}

function renderCategories() {
  const container = document.getElementById("category-pills");
  if (!container) return;
  
  const categories = ["Tất cả", "HÀNG MỚI VỀ", "BỘ SƯU TẬP", "ÁO", "QUẦN", "PHỤ KIỆN", "GIÁ TỐT"];

  container.innerHTML = categories
    .map(category => `
        <button class="category-pill ${category === activeCategory ? 'active' : ''}" onclick="filterCategory('${category}')">
          ${category}
        </button>
      `)
    .join("");
}



function filterCategory(category) {
  activeCategory = category;
  loadProducts();
}

function searchProducts() {
  currentSearch = document.getElementById("search-input")?.value.trim().toLowerCase() || "";
  loadProducts();
}

function applyFilters() {
  activeColorFilter = document.getElementById("user-color-filter")?.value || "";
  activeFitFilter = document.getElementById("user-fit-filter")?.value || "";
  activeSort = document.getElementById("user-sort")?.value || "default";
  
  const minV = document.getElementById("user-min-price")?.value;
  const maxV = document.getElementById("user-max-price")?.value;
  activeMinPrice = minV ? parseInt(minV, 10) : null;
  activeMaxPrice = maxV ? parseInt(maxV, 10) : null;

  renderProducts();
}

function renderProducts() {
  const list = document.getElementById("product-list");
  if (!list) return;

  // Sandbox: Xử lý dữ liệu mảng (Data Array)
  let displayProducts = [...products];

  // Lọc: Màu sắc
  if (activeColorFilter) {
      displayProducts = displayProducts.filter(p => {
          if (!p.colors) return false;
          return p.colors.some(c => c.toLowerCase() === activeColorFilter.toLowerCase());
      });
  }

  // Lọc: Phom dáng
  if (activeFitFilter) {
      displayProducts = displayProducts.filter(p => {
          if (!p.features) return false;
          const isOm = activeFitFilter === 'Ôm' && p.features.some(f => f.toLowerCase().includes('tôn dáng') || f.toLowerCase().includes('ôm') || f.toLowerCase().includes('slim'));
          const isRong = activeFitFilter === 'Rộng' && p.features.some(f => f.toLowerCase().includes('rộng') || f.toLowerCase().includes('oversize'));
          const isVua = activeFitFilter === 'Vừa vặn' && p.features.some(f => f.toLowerCase().includes('regular') || f.toLowerCase().includes('vừa'));

          if (activeFitFilter === 'Ôm') return isOm;
          if (activeFitFilter === 'Rộng') return isRong;
          if (activeFitFilter === 'Vừa vặn') return isVua;
          
          return false;
      });
  }

  // Lọc: Khoảng Giá (Min - Max)
  if (activeMinPrice !== null) {
      displayProducts = displayProducts.filter(p => p.price >= activeMinPrice);
  }
  if (activeMaxPrice !== null) {
      displayProducts = displayProducts.filter(p => p.price <= activeMaxPrice);
  }

  // Sắp xếp: Giá
  if (activeSort === 'price-asc') {
      displayProducts.sort((a, b) => a.price - b.price);
  } else if (activeSort === 'price-desc') {
      displayProducts.sort((a, b) => b.price - a.price);
  }

  document.getElementById("product-count").innerText = `${displayProducts.length} sản phẩm`;

  if (!displayProducts.length) {
    list.innerHTML = `<div class="empty-state"><p>Không tìm thấy sản phẩm hoặc chưa thỏa mãn điều kiện lọc.</p></div>`;
    return;
  }

  list.innerHTML = displayProducts
    .map(p => {
        return `
        <div class="product-card">
            <div class="img-wrapper">
                <img src="${p.img}" alt="${p.name}" loading="lazy" onerror="this.src='https://placehold.co/400x400?text=No+Image'">
            </div>
            <div class="card-info">
                <h3>${p.name}</h3>
                <p class="price">${p.price.toLocaleString()}đ</p>
            </div>
            <div class="card-actions">
                <button class="btn-card-add" onclick="event.stopPropagation(); addToCart('${p.id}', this)">Thêm vào giỏ</button>
                <button class="btn-card-detail" onclick="openProductModal('${p.id}')">Chi tiết</button>
            </div>
        </div>
        `;
    })
    .join("");
}

function openQuickSizes(productId) {
    buyNowMode = true;
    openProductModal(productId);
}

function toggleWishlist(id) {
    showToast("Thêm vào danh sách yêu thích!", "success");
}

function quickAdd(productId, size) {
    const product = products.find(p => p.id == productId);
    if (!product) return;
    
    const cartItem = {
        ...product,
        selectedSize: size,
        selectedColor: product.colors ? product.colors[0] : "Phối màu",
        qty: 1
    };
    
    cart.push(cartItem);
    updateCartState();
    showToast(`Đã thêm Size ${size} vào giỏ!`, "success");
}


function updateCartState() {
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

// buyNowMode: neu true, sau khi them gio se chuyen thang checkout
let buyNowMode = false;

function addToCart(id, button) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  // Neu co sizes -> mo modal chon size
  if (product.sizes && product.sizes.length > 0) {
    openProductModal(id);
    return;
  }

  // Khong co sizes -> them thang
  const cartItem = { ...product, selectedSize: 'Free Size' };
  cart.push(cartItem);
  updateCartState();
  showToast(`Đã thêm "${product.name}" vào giỏ`, "success");
  if (button) flyToCart(button);
}

function buyNow(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  if (product.sizes && product.sizes.length > 0) {
    // Mo modal, sau khi chon size se chuyen checkout
    buyNowMode = true;
    openProductModal(id);
    return;
  }

  cart = [{ ...product, selectedSize: 'Free Size' }];
  updateCartState();
  showToast(`Đã chọn mua: ${product.name}`, "success");
  window.location.href = "checkout.html";
}

function renderCart() {
  const itemsContainer = document.getElementById("cart-items");
  const countEl = document.getElementById("cart-count");
  const totalEl = document.getElementById("total");

  if (!itemsContainer || !countEl || !totalEl) return;

  if (cart.length === 0) {
    itemsContainer.innerHTML = '';
    document.getElementById('empty-cart-state').style.display = 'flex';
    countEl.innerText = "0";
    totalEl.innerText = "0";
    updateFreeshipMeter(0);
    return;
  }
  
  document.getElementById('empty-cart-state').style.display = 'none';

  let totalValue = 0;
  itemsContainer.innerHTML = cart.map((item, index) => {
    totalValue += (item.price * (item.qty || 1));
    const thumb = item.img || item.image || "https://images.unsplash.com/photo-1512374382149-4332c6c02151?auto=format&fit=crop&w=400&q=80";
    
    return `
      <div class="cart-item-modern">
        <div class="cart-thumb">
          <img src="${thumb}" alt="${item.name}">
        </div>
        <div class="cart-info">
          <h4>${item.name}</h4>
          <div class="cart-variant">
            ${item.selectedColor ? `Màu: ${item.selectedColor}` : ''} 
            ${item.selectedSize ? `• Size: ${item.selectedSize}` : ''}
          </div>
          <div class="cart-price-row">
            <div class="cart-qty-ctrl">
              <button onclick="changeCartQty(${index}, -1)">−</button>
              <span>${item.qty || 1}</span>
              <button onclick="changeCartQty(${index}, 1)">+</button>
            </div>
            <div class="item-price">${(item.price * (item.qty || 1)).toLocaleString()} VNĐ</div>
          </div>
          <button class="delete-btn" style="margin-top:10px; text-align:left;" onclick="removeFromCart(${index})">Xóa món này</button>
        </div>
      </div>
    `;
  }).join('');

  countEl.innerText = cart.length;
  totalEl.innerText = totalValue.toLocaleString();
  updateFreeshipMeter(totalValue);
}

function changeCartQty(index, delta) {
  if (!cart[index]) return;
  cart[index].qty = (cart[index].qty || 1) + delta;
  
  if (cart[index].qty <= 0) {
    removeFromCart(index);
  } else {
    cart[index].totalPrice = cart[index].qty * cart[index].price;
    updateCartState();
  }
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartState();
  showToast("Đã xóa sản phẩm khỏi giỏ hàng", "info");
}

function updateFreeshipMeter(subtotal) {
  const meterProgress = document.getElementById('meter-progress');
  const meterRemaining = document.getElementById('meter-remaining');
  const meterText = document.getElementById('meter-text');
  
  if (!meterProgress || !meterRemaining || !meterText) return;

  const threshold = globalFreeShipThreshold; // 500,000
  const percent = Math.min((subtotal / threshold) * 100, 100);
  
  meterProgress.style.width = `${percent}%`;

  if (percent >= 100) {
    meterText.innerHTML = "🎉 Chúc mừng! Bạn đã được <b>Miễn phí giao hàng</b>";
    meterProgress.style.background = "#10b981";
  } else {
    const remaining = threshold - subtotal;
    meterText.innerHTML = `Mua thêm <span style="color: #ff424e;">${remaining.toLocaleString()} VNĐ</span> để được <b>FREESHIP</b>`;
    meterProgress.style.background = "linear-gradient(90deg, #10b981, #34d399)";
  }
}

function checkout() {
  if (cart.length === 0) {
    showToast("Giỏ hàng đang trống.", "error");
    return;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    showToast("Vui lòng đăng nhập để tiếp tục thanh toán.", "info");
    // Luôn chuyển hướng để người dùng hoàn tất quy trình
    window.location.href = "login.html?redirect=checkout.html";
    return;
  }

  // Chuyển sang trang Checkout để người dùng chọn địa chỉ, mã giảm giá và thanh toán thực tế
  window.location.href = "checkout.html";
}

function toggleAccordion(header) {
  const item = header.parentElement;
  const icon = header.querySelector('i');
  
  // Close other accordions in the same section
  const section = item.parentElement;
  section.querySelectorAll('.accordion-item').forEach(el => {
    if (el !== item) {
      el.classList.remove('active');
      const otherIcon = el.querySelector('.accordion-header i');
      if (otherIcon) {
        otherIcon.classList.remove('bi-dash');
        otherIcon.classList.add('bi-plus');
      }
    }
  });

  // Toggle current
  const isActive = item.classList.toggle('active');
  if (icon) {
    icon.classList.toggle('bi-plus', !isActive);
    icon.classList.toggle('bi-dash', isActive);
  }
}

function renderRelatedProducts(category, excludeId) {
  const container = document.getElementById("modal-related-list");
  if (!container) return;

  const related = products
    .filter(p => p.category === category && p.id !== excludeId)
    .slice(0, 4);

  if (related.length === 0) {
    container.innerHTML = `<p style="color:#94a3b8; font-size:0.8rem;">Đang cập nhật sản phẩm liên quan...</p>`;
    return;
  }

  container.innerHTML = related.map(p => `
    <div class="related-item" onclick="openProductModal('${p.id}')" style="cursor:pointer;">
      <img src="${p.img}" alt="${p.name}">
      <h5>${p.name}</h5>
      <p>${p.price.toLocaleString()}đ</p>
    </div>
  `).join('');
}

function openProductModal(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  // Track event: View Item Detail (GA4)
  if (typeof gtag === 'function') {
    gtag('event', 'view_item', {
      currency: 'VND',
      value: product.price,
      items: [{
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        item_category: product.category
      }]
    });
  }

  currentModalProductId = id;
  selectedSize = null; // reset — khach phai chon lai

  const modalImg = document.getElementById("modal-img");
  if (modalImg) {
    modalImg.src = product.img;
    modalImg.alt = product.name;
    modalImg.onerror = () => { modalImg.src = "https://via.placeholder.com/600x450?text=Fashion+Modern"; };
  }

  document.getElementById("modal-name").innerText = product.name;
  const skuElem = document.getElementById("modal-sku");
  if (skuElem) skuElem.innerText = product.id;

  const breadCat = document.getElementById("modal-breadcrumb-cat");
  if (breadCat) breadCat.innerText = (product.category || 'ÁO').toUpperCase();
  document.getElementById("modal-description").innerText = product.description || 'Sản phẩm kiểu dáng hiện đại, tôn dáng người mặc. Màu sắc trung tính, dễ phối đồ. Chất liệu cao cấp, mềm mát và bền màu.';
  document.getElementById("modal-price").innerText = `${product.price.toLocaleString()}đ`;
  quantity = 1;
  document.getElementById("modal-qty").innerText = quantity;

  // Render sizes dynamically
  const sizesBox = document.getElementById("modal-sizes-box");
  if (sizesBox) {
    const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : ['S', 'M', 'L', 'XL', '2XL'];
    sizesBox.innerHTML = sizes.map(sz => `
      <div class="size-box" onclick="selectSize(this, '${sz}')">${sz}</div>
    `).join('');
  }

  // Render colors dynamically
  const colorsBox = document.getElementById("modal-colors-box");
  if (colorsBox) {
    const colors = product.colors && product.colors.length > 0 ? product.colors : ['Đen'];
    selectedColor = null;

    colorsBox.innerHTML = colors.map(c => {
      const hex = COLOR_MAP[c] || '#111';
      const isWhite = c === 'Trang';
      return `
        <button class="color-pill" onclick="selectColor(this, '${c}')" title="${c}"
          style="width:38px; height:38px; border-radius:50%; background:${hex}; border: 1px solid ${isWhite ? '#ccc' : hex}; cursor:pointer; transition:0.2s; position:relative; padding: 2px;">
          <div class="color-inner" style="width:100%; height:100%; border-radius:50%; background:${hex};"></div>
          <span class="check-mark" style="display:none; position:absolute; inset:0; align-items:center; justify-content:center; color:${isWhite?'#333':'#fff'}; font-size:1rem; font-weight: bold;">✓</span>
        </button>
      `;
    }).join('');
    
    // Auto select if only 1 color
    if (colors.length === 1) {
       const firstBtn = colorsBox.querySelector('.color-pill');
       if (firstBtn) selectColor(firstBtn, colors[0]);
    }
  }

  // Related Products
  renderRelatedProducts(product.category, product.id);

  // Reviews integration
  checkReviewEligibility(id, product.reviews || []);

  updateAddBtn();
  const modal = document.getElementById("product-modal");
  if (modal) {
    modal.hidden = false;
    document.body.style.overflow = 'hidden'; 
    
    // Reset Accordion to default (Mô tả mở)
    const accordions = modal.querySelectorAll('.accordion-item');
    accordions.forEach((acc, idx) => {
       if (idx === 0) acc.classList.add('active');
       else acc.classList.remove('active');
       
       const ico = acc.querySelector('.accordion-header i');
       if (ico) {
         ico.classList.toggle('bi-dash', idx === 0);
         ico.classList.toggle('bi-plus', idx !== 0);
       }
    });
  }
}

function closeProductModal() {
  const modal = document.getElementById("product-modal");
  if (modal) modal.hidden = true;
  document.body.style.overflow = ''; // Cho phép cuộn lại
  selectedSize = null;
  selectedColor = null;
}

// --- REVIEW (ĐÁNH GIÁ THỰC TẾ) LOGIC ---
function renderReviewsList(reviews) {
    const list = document.getElementById("modal-reviews-list");
    if (!reviews || reviews.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding: 20px; color:#888; font-size: 0.9rem;">Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên trải nghiệm!</div>`;
        return;
    }
    list.innerHTML = reviews.map(r => `
        <div style="padding: 12px; border-radius: 8px; background: #fff; border: 1px solid #eee;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <div>
                    <span style="font-weight:700;">${r.user}</span>
                    ${r.verified ? `<span style="background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; margin-left: 6px;">✓ Đã mua hàng</span>` : ''}
                </div>
                <div style="color: #f59e0b; font-size: 0.85rem;">${'⭐'.repeat(r.rating || 5)}</div>
            </div>
            <div style="font-size:0.9rem; color:#444;">${r.text}</div>
            <div style="font-size:0.75rem; color:#aaa; margin-top:6px;">${new Date(r.date).toLocaleDateString('vi-VN')}</div>
        </div>
    `).join("");
}

async function checkReviewEligibility(productId, reviews) {
    renderReviewsList(reviews);
    
    const container = document.getElementById("review-input-container");
    const user = getCurrentUser();

    // Mẫu hiển thị KHÓA thân thiện (UX)
    const lockedHTML = (msg) => `
        <div class="review-lock-box">
            <div class="lock-icon-container">
                <i class="bi bi-lock-fill"></i>
            </div>
            <p style="color: #111; font-weight: 700; font-size: 1rem; margin-bottom: 8px;">${msg}</p>
            <p class="review-lock-text">Chúng tôi chỉ cho phép đánh giá từ người dùng đã trải nghiệm thực tế để đảm bảo chất lượng phản hồi luôn chính xác nhất.</p>
        </div>
    `;

    // Vòng 1: Đăng nhập
    if (!user) {
        container.innerHTML = lockedHTML("Bạn cần Đăng nhập để mở khóa tính năng đánh giá nhé!");
        return;
    }

    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/orders/my`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const orders = await res.json();

        // Vòng 2 & 3: Lập lệnh kiểm duyệt Mua hàng và Trạng thái hoàn tất
        const hasBoughtAndDelivered = orders.some(o => 
            (o.status === 'completed' || o.status === 'delivered') &&
            o.items.some(i => i.id === productId || i.productId === productId)
        );

        if (!hasBoughtAndDelivered) {
             container.innerHTML = lockedHTML("Bạn cần nhận hàng thành công để mở khóa tính năng đánh giá nhé!");
             return;
        }

        // Vượt 3 Vòng -> MỞ KHÓA UI
        container.innerHTML = `
            <h4 style="margin: 0 0 10px; font-size: 0.95rem;">Viết đánh giá của bạn</h4>
            <div style="display:flex; gap: 4px; margin-bottom: 12px; font-size: 1.2rem; cursor: pointer;">
                <span style="color:#f59e0b">⭐</span><span style="color:#f59e0b">⭐</span><span style="color:#f59e0b">⭐</span><span style="color:#f59e0b">⭐</span><span style="color:#f59e0b">⭐</span>
            </div>
            <textarea id="review-text-input" placeholder="Sản phẩm này có làm bạn hài lòng không?" class="dark-input" style="width: 100%; height: 80px; padding: 12px; border-radius: 8px; border: 1px solid #ddd; background: #fff; color: #111; margin-bottom: 10px; resize: none; font-family: inherit; font-size: 0.9rem; box-sizing: border-box;"></textarea>
            <div style="display:flex; justify-content: flex-end;">
                <button onclick="submitReview('${productId}')" class="btn-primary" style="padding: 10px 24px; border-radius: 8px; font-weight: 700;">Gửi đánh giá</button>
            </div>
        `;

    } catch(e) {
        container.innerHTML = lockedHTML("Hệ thống kiểm tra đơn hàng đang bận. Vui lòng thử lại sau.");
    }
}

async function submitReview(productId) {
    const text = document.getElementById("review-text-input").value.trim();
    if (!text) {
        showToast("Vui lòng điền đánh giá của bạn", "error");
        return;
    }

    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/products/${productId}/reviews`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ text, rating: 5 })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message);
        
        showToast("Cảm ơn bạn đã phản hồi!", "success");
        
        // Cập nhật sản phẩm local ngay lập tức để Modal phản chiếu UX không giật lag
        const product = products.find(p => p.id === productId);
        if (product) {
            if (!product.reviews) product.reviews = [];
            product.reviews.unshift(data.review);
            renderReviewsList(product.reviews);
            document.getElementById("review-text-input").value = "";
        }
    } catch(e) {
        showToast(e.message || "Lỗi gửi đánh giá, vui lòng thử lại.", "error");
    }
}

function selectSize(element, sz) {
  if (element.classList.contains('out-of-stock')) return;
  selectedSize = sz;
  document.querySelectorAll(".size-box").forEach(p => p.classList.remove('active'));
  element.classList.add('active');
  const hint = document.getElementById("size-required-hint");
  if (hint) hint.style.display = 'none';
  updateAvailability();
  updateAddBtn();
}

function selectColor(element, c) {
  if (element.classList.contains('out-of-stock')) return;
  selectedColor = c;
  document.querySelectorAll(".color-pill").forEach(p => p.classList.remove('active'));
  element.classList.add('active');
  const hint = document.getElementById("color-required-hint");
  if (hint) hint.style.display = 'none';
  updateAvailability();
  updateAddBtn();
}

function updateAvailability() {
  const modalName = document.getElementById("modal-name").innerText;
  const currentProduct = products.find(p => p.name === modalName);
  if (!currentProduct || !currentProduct.variants) return;

  const variants = currentProduct.variants;

  // 1. If color is selected, update size buttons
  if (selectedColor) {
    document.querySelectorAll('.size-box').forEach(btn => {
      const sz = btn.innerText.trim();
      const variant = variants.find(v => v.color === selectedColor && v.size === sz);
      if (variant && !variant.inStock) {
        btn.classList.add('out-of-stock');
      } else {
        btn.classList.remove('out-of-stock');
      }
    });
  } else {
    document.querySelectorAll('.size-box').forEach(btn => btn.classList.remove('out-of-stock'));
  }

  // 2. If size is selected, update color buttons
  if (selectedSize) {
    document.querySelectorAll('.color-pill').forEach(btn => {
      const c = btn.getAttribute('title');
      const variant = variants.find(v => v.color === c && v.size === selectedSize);
      if (variant && !variant.inStock) {
        btn.classList.add('out-of-stock');
      } else {
        btn.classList.remove('out-of-stock');
      }
    });
  } else {
    document.querySelectorAll('.color-pill').forEach(btn => btn.classList.remove('out-of-stock'));
  }
}

function updateAddBtn() {
  const addBtn = document.getElementById("modal-add-btn");
  const buyBtn = document.getElementById("modal-buy-btn");
  if (!addBtn || !buyBtn) return;
  
  const isReady = selectedSize && selectedColor;
  if (isReady) {
    addBtn.disabled = false;
    addBtn.style.opacity = '1';
    addBtn.style.cursor = 'pointer';
    buyBtn.disabled = false;
    buyBtn.style.opacity = '1';
    buyBtn.style.cursor = 'pointer';
    addBtn.innerText = "Thêm vào giỏ";
    buyBtn.innerText = "Mua ngay";
  } else {
    addBtn.disabled = true;
    addBtn.style.opacity = '0.5';
    addBtn.style.cursor = 'not-allowed';
    buyBtn.disabled = true;
    buyBtn.style.opacity = '0.5';
    buyBtn.style.cursor = 'not-allowed';
    
    addBtn.innerText = "Chọn Size & Màu";
    buyBtn.innerText = "Chọn Size & Màu";
  }
}

function addToCartWithSize(id, button) {
  if (!selectedSize || !selectedColor) {
    showToast("Vui lòng chọn Size và Màu sắc trước!", "error");
    return;
  }
  
  const product = products.find(p => p.id === id);
  if (!product) return;

  let finalName = product.name;
  if (selectedSize !== 'Free Size') finalName += ` (${selectedSize})`;
  if (selectedColor !== 'Default') finalName += ` [${selectedColor}]`;

  // Create cart items based on quantity
  // VERIFY SKU IN MATRIX
  if (product.variants && product.variants.length > 0) {
    const sku = product.variants.find(v => v.color === selectedColor && v.size === selectedSize);
    if (sku && !sku.inStock) {
      alert("Rất tiếc, biến thể này đã hết hàng!");
      return;
    }
  }

  const cartItem = { 
    ...product, 
    selectedSize, 
    selectedColor, 
    name: finalName,
    qty: quantity,
    totalPrice: product.price * quantity
  };

  // Track event: Add to Cart (GA4)
  if (typeof gtag === 'function') {
    gtag('event', 'add_to_cart', {
      currency: 'VND',
      value: product.price * quantity,
      items: [{
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        item_category: product.category,
        quantity: quantity,
        item_variant: `${selectedColor} - ${selectedSize}`
      }]
    });
  }

  const existing = cart.find(item => item.id === product.id && item.selectedSize === selectedSize && item.selectedColor === selectedColor);
  if (existing) {
    existing.qty = (existing.qty || 1) + quantity;
    existing.totalPrice = existing.qty * existing.price;
  } else {
    cart.push(cartItem);
  }
  
  updateCartState();
  showToast(buyNowMode ? `Đang chuyển đến thanh toán...` : `Thêm vào giỏ hàng thành công!`, "success");

  if (buyNowMode) {
    buyNowMode = false;
    closeProductModal();
    window.location.href = "checkout.html";
  } else {
    if (button) flyToCart(button);
    closeProductModal();
  }
}

function buyNowFromModal(id) {
    buyNowMode = true;
    addToCartWithSize(id, document.getElementById('modal-buy-btn'));
}

function closeProductModal() {
  const modal = document.getElementById("product-modal");
  if (modal) modal.hidden = true;
  selectedSize = null;
  selectedColor = null;
  buyNowMode = false;
  // Reset add button
  const addBtn = document.getElementById("modal-add-btn");
  if (addBtn) {
    addBtn.innerText = 'CHỌN SIZE';
    buyBtn.innerText = 'CHỌN MÀU';
  }
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    toast.addEventListener("transitionend", () => toast.remove());
  }, 2800);
}

function flyToCart(element) {
  const cartIcon = document.getElementById("cart-icon");
  if (!element || !cartIcon) return;
  const image = element.closest(".product-card")?.querySelector("img");
  if (!image) return;
  const clone = image.cloneNode(true);
  const rect = image.getBoundingClientRect();
  clone.style.position = "fixed";
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.transition = "all 0.8s ease-in-out";
  clone.style.zIndex = 200;
  clone.style.borderRadius = "20px";
  document.body.appendChild(clone);
  const targetRect = cartIcon.getBoundingClientRect();
  requestAnimationFrame(() => {
    clone.style.left = `${targetRect.left}px`;
    clone.style.top = `${targetRect.top}px`;
    clone.style.width = "24px";
    clone.style.height = "24px";
    clone.style.opacity = "0.3";
  });
  setTimeout(() => clone.remove(), 850);
}

function initScrollHeader() {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
      topbar.classList.add("sticky");
    } else {
      topbar.classList.remove("sticky");
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  loadCategories();
  loadProducts();
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentSearch = searchInput.value.trim().toLowerCase();
      loadProducts();
    });
  }
  initScrollHeader();

  // GIẢI PHÁP DUNG HÒA:
  // 1. Tự động cập nhật khi khách hàng quay lại tab (Focus)
  window.addEventListener("focus", () => {
    loadProducts(true); // Silent reload
  });

  // 2. Kiểm tra ngầm mỗi 2 phút (thay vì 3 giây như cũ)
  setInterval(() => {
    loadProducts(true);
  }, 120000); 
});
function changeQuantity(val) {
  quantity = Math.max(1, quantity + val);
  const qtyEl = document.getElementById("modal-qty");
  if (qtyEl) qtyEl.innerText = quantity;
}
function showMaintenanceOverlay() {
    if (document.getElementById('maintenance-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'maintenance-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        background: #050505; color: #fff;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        text-align: center; font-family: 'Inter', sans-serif;
        padding: 20px;
    `;
    overlay.innerHTML = `
        <div style="max-width: 500px; padding: 40px; border-radius: 40px; border: 1px solid rgba(255,255,255,0.05); background: rgba(10,10,10,0.8); backdrop-filter: blur(20px);">
            <div style="font-size: 4rem; margin-bottom: 24px;">⚙️</div>
            <h1 style="font-size: 2rem; font-weight: 800; text-transform: uppercase; margin-bottom: 16px; background: linear-gradient(to right, #fff, #555); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Nâng cấp hệ thống</h1>
            <p style="color: #666; line-height: 1.6; margin-bottom: 32px;">Chúng tôi đang thực hiện một số cải tiến quan trọng để mang lại trải nghiệm mua sắm tốt hơn. Vui lòng quay lại sau ít phút!</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: #333; animation: pulse 1s infinite alternate;"></div>
                <div style="width: 8px; height: 8px; border-radius: 50%; background: #333; animation: pulse 1s infinite alternate 0.3s;"></div>
                <div style="width: 8px; height: 8px; border-radius: 50%; background: #333; animation: pulse 1s infinite alternate 0.6s;"></div>
            </div>
            <style>
                @keyframes pulse { from { opacity: 0.3; transform: scale(1); } to { opacity: 1; transform: scale(1.5); background: #f59e0b; } }
            </style>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// --- VOUCHER SYSTEM LOGIC ---
async function loadVoucherBanner() {
    const list = document.getElementById('voucher-list-homepage');
    if (!list) return;

    try {
        const res = await fetch(`${API_BASE}/vouchers/public`);
        const vouchers = await res.json();

        if (!vouchers || vouchers.length === 0) {
            // Hiển thị Voucher mẫu (Dummy) nếu chưa có mã thực tế
            list.innerHTML = `
                <div class="voucher-ticket dummy">
                    <div class="v-content">
                        <h4>GIẢM 50K</h4>
                        <p>Cho đơn hàng đầu tiên từ 500k</p>
                    </div>
                    <div class="v-action">
                        <button class="btn-save-voucher" onclick="location.href='#products'">Mua ngay</button>
                    </div>
                </div>
                <div class="voucher-ticket dummy">
                    <div class="v-content">
                        <h4>FREESHIP 0đ</h4>
                        <p>Đặc quyền nội ô Quận Ninh Kiều</p>
                    </div>
                    <div class="v-action">
                        <button class="btn-save-voucher" onclick="location.href='#products'">Mua ngay</button>
                    </div>
                </div>
            `;
            return;
        }

        // Nếu đã đăng nhập, lấy danh sách ví để biết mã nào đã lưu
        let savedCodes = [];
        const user = getCurrentUser();
        if (user) {
            const myRes = await fetch(`${API_BASE}/vouchers/my`, {
                headers: { Authorization: `Bearer ${getAuthToken()}` }
            });
            const myVouchers = await myRes.json();
            savedCodes = myVouchers.map(v => v.code);
        }

        list.innerHTML = vouchers.map((v, index) => {
            const isSaved = savedCodes.includes(v.code);
            return `
                <div class="voucher-ticket" style="animation: slideInUp 0.6s ease forwards ${index * 0.15}s; opacity:0; transform:translateY(30px);">
                    <div class="v-content">
                        <h4>${v.code}</h4>
                        <p>${v.description}</p>
                    </div>
                    <div class="v-action">
                        <button class="btn-save-voucher ${isSaved ? 'saved' : ''}" 
                                onclick="saveVoucher('${v.code}', this)"
                                ${isSaved ? 'disabled' : ''}>
                            ${isSaved ? 'Đã lưu' : 'Lưu mã'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.warn("Voucher banner error", e);
        list.innerHTML = '<div class="voucher-placeholder">Ưu đãi đang chờ bạn...</div>';
    }
}

async function saveVoucher(code, btn) {
    const user = getCurrentUser();
    if (!user) {
        showToast("⚠️ Vui lòng đăng nhập để lưu mã ưu đãi!", "error");
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/vouchers/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ code })
        });

        const data = await res.json();
        if (res.ok) {
            showToast("✅ " + data.message, "success");
            btn.innerText = "Đã lưu";
            btn.classList.add("saved");
            btn.disabled = true;
        } else {
            showToast("❌ " + data.message, "error");
        }
    } catch (e) {
        showToast("❌ Lỗi hệ thống, vui lòng thử lại.", "error");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadVoucherBanner();
});
