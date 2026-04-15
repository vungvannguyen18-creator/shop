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

let globalFreeShipThreshold = 500000;

const COLOR_MAP = {
  'Den': '#111111', 'Trang': '#f5f5f5', 'Xam': '#9ca3af', 'Nau': '#92400e',
  'Xanh Navy': '#1e3a5f', 'Xanh Duong': '#3b82f6', 'Xanh La': '#10b981',
  'Do': '#ef4444', 'Vang': '#f59e0b', 'Hong': '#ec4899', 'Tim': '#8b5cf6', 'Cam': '#f97316'
};

const fallbackProducts = [
  { id: "p1", name: "Áo thun oversize basic", price: 150000, img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80", category: "Áo", rating: 4.8, description: "Chất liệu cotton 100% thoáng mát, form rộng phong cách.", sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['Đen', 'Trắng', 'Xám'], features: ['Cotton 100% mát mịn', 'Không xù lông khi giặt', 'Form rộng oversize trẻ trung'] },
  { id: "p2", name: "Quần jeans xanh Denim", price: 300000, img: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=600&q=80", category: "Quần", rating: 4.7, description: "Vải Denim cao cấp, co giãn nhẹ, tôn dáng.", sizes: ['28', '29', '30', '31', '32'], colors: ['Xanh Dương', 'Đen'], features: ['Denim co giãn 4 chiều', 'Màu bền, không phai', 'Đường may tinh tế'] },
  { id: "p3", name: "Sneaker trắng Modern", price: 650000, img: "https://images.unsplash.com/photo-1512374382149-4332c6c02151?auto=format&fit=crop&w=600&q=80", category: "Giày", rating: 4.9, description: "Thiết kế trẻ trung, đế cao su chống trơn trượt.", sizes: ['38', '39', '40', '41', '42'], colors: ['Trắng', 'Đen'], features: ['Đế cao su chống trơn trượt', 'Lót đệm êm chân', 'Thiết kế dễ phối đồ'] },
  { id: "p4", name: "Áo sơ mi trắng Simple", price: 250000, img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80", category: "Áo", rating: 4.6, description: "Sơ mi basic phù hợp mọi hoàn cảnh.", sizes: ['M', 'L', 'XL'], colors: ['Trắng', 'Xanh Navy'], features: ['Vải ít nhăn, dễ ủi', 'Form regular fit lịch lãm', 'Cổ áo cứng cáp'] }
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
  const container = document.getElementById("category-list");
  if (!container) return;
  const categories = ["Tất cả", ...new Set(products.map(item => item.category))];
  container.innerHTML = categories
    .map(category => `
        <button class="category-pill ${category === activeCategory ? 'active' : ''}" onclick="filterCategory('${category}')">${category}</button>
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
        const rand = Math.random();
        let badgeHtml = '';
        if (rand > 0.85) badgeHtml = '<span class="badge-float hot">Hot</span>';
        else if (rand > 0.7) badgeHtml = '<span class="badge-float new">Mới</span>';
        else if (rand > 0.55) badgeHtml = '<span class="badge-float sale">-10%</span>';

        // Smart Badging: Freeship
        let smartBadgeHtml = '';
        if (p.price >= globalFreeShipThreshold) {
            smartBadgeHtml = `<div style="background: #10b981; color: #fff; font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; display: inline-block; margin-top: 6px;">FREESHIP</div>`;
        }

        const hasSizes = p.sizes && p.sizes.length > 0;
        const addBtnLabel = hasSizes ? 'Chọn Size' : 'Thêm giỏ';

        return `
        <div class="product-card" onclick="openProductModal('${p.id}')">
            ${badgeHtml}
            <div class="img-wrapper">
                <img src="${p.img}" alt="${p.name}">
            </div>
            <div>
                <h3>${p.name}</h3>
                <p class="price">${p.price.toLocaleString()} VND</p>
                ${smartBadgeHtml}
                ${hasSizes ? `<div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:8px;">${p.sizes.slice(0,4).map(s=>`<span style="font-size:0.72rem; padding:2px 7px; border:1px solid #ddd; border-radius:4px; color:#888;">${s}</span>`).join('')}</div>` : ''}
                <div class="rating">⭐ ${p.rating || '4.5'} <span>(${Math.floor(20 + Math.random() * 80)} đánh giá)</span></div>
            </div>
            <div class="actions">
                <button class="btn-outline" onclick="event.stopPropagation(); openProductModal('${p.id}')">${addBtnLabel}</button>
                <button class="btn-primary" onclick="event.stopPropagation(); buyNow('${p.id}')">${hasSizes ? 'Mua ngay' : 'Mua ngay'}</button>
            </div>
        </div>
        `;
    })
    .join("");
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
    itemsContainer.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color:#888;">
        <div style="font-size:3rem; margin-bottom:10px;">🛒</div>
        <p>Giỏ hàng đang trống.</p>
      </div>
    `;
    countEl.innerText = "0";
    totalEl.innerText = "0";
    updateFreeshipMeter(0);
    return;
  }

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
    modalImg.onerror = () => { modalImg.src = "https://via.placeholder.com/600x450?text=Fashion+Modern"; };
  }

  document.getElementById("modal-name").innerText = product.name;
  document.getElementById("modal-description").innerText = product.description || '';
  document.getElementById("modal-price").innerText = `${product.price.toLocaleString()} VNĐ`;
  document.getElementById("modal-category").innerText = product.category || '';
  quantity = 1;
  document.getElementById("modal-qty").innerText = quantity;

  const featList = product.features && product.features.length > 0 ? product.features : [
    "Chất liệu thoáng khí, phù hợp cả ngày",
    "Thiết kế tối giản, dễ mix đồ phong cách",
    "Giao hàng toàn quốc, đổi trả 7 ngày"
  ];
  document.getElementById("modal-features").innerHTML = featList.map(f => `<li>${f}</li>`).join("");

  // Render sizes dynamically
  const sizesBox = document.getElementById("modal-sizes-box");
  const sizesRow = document.getElementById("modal-sizes-row");
  const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : [];
  
  if (sizes.length > 0) {
    sizesRow.style.display = '';
    sizesBox.innerHTML = sizes.map(sz => `
      <button class="size-pill" onclick="selectSize(this, '${sz}')"
        style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: 1.5px solid #ddd; background: #fff; font-weight: 700; cursor: pointer; transition: 0.2s; font-size: 0.95rem; color: #111;">
        ${sz}
      </button>
    `).join('');
  } else {
    sizesRow.style.display = 'none';
    selectedSize = 'Free Size';
  }

  // Render colors dynamically
  const colorsBox = document.getElementById("modal-colors-box");
  const colorsRow = document.getElementById("modal-colors-row");
  const colors = product.colors && product.colors.length > 0 ? product.colors : [];
  selectedColor = null;

  if (colors.length > 0) {
    colorsRow.style.display = '';
    colorsBox.innerHTML = colors.map(c => {
      const hex = COLOR_MAP[c] || '#ddd';
      const isWhite = c === 'Trang';
      return `
        <button class="color-pill" onclick="selectColor(this, '${c}')" title="${c}"
          style="width:42px; height:42px; border-radius:50%; background:${hex}; border: 1px solid ${isWhite ? '#ccc' : hex}; cursor:pointer; transition:0.2s; position:relative; padding: 2px;">
          <div class="color-inner" style="width:100%; height:100%; border-radius:50%; background:${hex}; border: 1px solid rgba(0,0,0,0.1);"></div>
          <span class="check-mark" style="display:none; position:absolute; inset:0; align-items:center; justify-content:center; color:${isWhite?'#333':'#fff'}; font-size:1.1rem; font-weight: bold;">✓</span>
        </button>
      `;
    }).join('');
  } else {
    colorsRow.style.display = 'none';
    selectedColor = 'Default';
  }

  // Cập nhật Reviews (Đánh giá thật)
  checkReviewEligibility(id, product.reviews || []);

  updateAddBtn();
  document.getElementById("product-modal").hidden = false;
}

function closeProductModal() {
  document.getElementById("product-modal").hidden = true;
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
        <div style="text-align: center; padding: 10px;">
            <div style="font-size: 2rem; margin-bottom: 8px; opacity: 0.5;">🔒</div>
            <p style="color: #555; font-size: 0.9rem; margin: 0; font-weight: 600;">${msg}</p>
            <p style="font-size: 0.75rem; color: #888; margin-top: 6px;">Chúng tôi chỉ cho phép đánh giá từ người dùng đã trải nghiệm thực tế để đảm bảo chất lượng phản hồi luôn chính xác nhất.</p>
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
  document.querySelectorAll(".size-pill").forEach(p => p.classList.remove('active'));
  element.classList.add('active');
  document.getElementById("size-required-hint").style.display = 'none';
  updateAvailability();
  updateAddBtn();
}

function selectColor(element, c) {
  if (element.classList.contains('out-of-stock')) return;
  selectedColor = c;
  document.querySelectorAll(".color-pill").forEach(p => p.classList.remove('active'));
  element.classList.add('active');
  document.getElementById("color-required-hint").style.display = 'none';
  updateAvailability();
  updateAddBtn();
}

function updateAvailability() {
  const currentProduct = products.find(p => p.name === document.getElementById("modal-name").innerText);
  if (!currentProduct || !currentProduct.variants) return;

  const variants = currentProduct.variants;

  // 1. If color is selected, update size buttons
  if (selectedColor) {
    document.querySelectorAll('.size-pill').forEach(btn => {
      const sz = btn.innerText.trim();
      const variant = variants.find(v => v.color === selectedColor && v.size === sz);
      if (variant && !variant.inStock) {
        btn.classList.add('out-of-stock');
      } else {
        btn.classList.remove('out-of-stock');
      }
    });
  } else {
    // Reset all sizes to available if no color selected (or based on global availability)
    document.querySelectorAll('.size-pill').forEach(btn => btn.classList.remove('out-of-stock'));
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
  if (!addBtn) return;
  
  const isReady = selectedSize && selectedColor;
  if (isReady) {
    addBtn.disabled = false;
    addBtn.style.opacity = '1';
    addBtn.style.cursor = 'pointer';
    let label = 'Thêm giỏ';
    if (selectedSize !== 'Free Size') label += ` (${selectedSize})`;
    if (selectedColor !== 'Default') label += ` - ${selectedColor}`;
    addBtn.innerText = label;
  } else {
    addBtn.disabled = true;
    addBtn.style.opacity = '0.45';
    addBtn.style.cursor = 'not-allowed';
    let msg = 'Chọn ';
    if (!selectedSize) msg += 'size ';
    if (!selectedSize && !selectedColor) msg += '& ';
    if (!selectedColor) msg += 'màu ';
    msg += 'để thêm giỏ';
    addBtn.innerText = msg;
  }
}

function addToCartWithSize(id, button) {
  if (!selectedSize) {
    document.getElementById("size-required-hint").style.display = 'block';
    return;
  }
  if (!selectedColor) {
    document.getElementById("color-required-hint").style.display = 'block';
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

  if (buyNowMode) {
    cart = [cartItem];
    updateCartState();
    showToast(`Đã chọn mua ${quantity}x ${finalName}`, "success");
    buyNowMode = false;
    closeProductModal();
    window.location.href = "checkout.html";
  } else {
    // Check if same product/size/color exists to increment qty
    const existing = cart.find(item => item.id === product.id && item.selectedSize === selectedSize && item.selectedColor === selectedColor);
    if (existing) {
      existing.qty = (existing.qty || 1) + quantity;
      existing.totalPrice = existing.qty * existing.price;
    } else {
      cart.push(cartItem);
    }
    
    updateCartState();
    showToast(`Đã thêm ${quantity}x "${finalName}" vào giỏ`, "success");
    if (button) flyToCart(button);
    closeProductModal();
  }
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
    addBtn.disabled = true;
    addBtn.style.opacity = '0.45';
    addBtn.style.cursor = 'not-allowed';
    addBtn.innerText = 'Chon size de them gio';
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
  document.getElementById("modal-qty").innerText = quantity;
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

        list.innerHTML = vouchers.map(v => {
            const isSaved = savedCodes.includes(v.code);
            return `
                <div class="voucher-ticket">
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
