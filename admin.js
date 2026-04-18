checkLogin();
checkRole('admin');

// API_BASE is declared in auth.js
let products = [];

// Dữ liệu đơn hàng thực tế
let ordersAdmin = [];

// Dữ liệu khách hàng thực tế
let usersAdmin = [];

// Dữ liệu danh mục
let categoriesAdmin = [];

let currentOrderFilter = 'Tất cả';
let currentChartView = 'revenue'; // 'revenue' or 'profit'
let adminSettings = {};

/**
 * Hàm helper gọi API an toàn, xử lý các lỗi Unexpected token < (HTML response)
 * @param {string} url 
 * @param {object} options 
 * @returns {Promise<any>}
 */
async function apiCall(url, options = {}) {
    try {
        const res = await fetch(url, options);
        const contentType = res.headers.get("content-type");
        
        if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || `Lỗi server (${res.status})`);
            }
            return data;
        } else {
            // Server trả về HTML (Lỗ 404, 500 hoặc trang Render đang khởi động)
            const text = await res.text();
            if (text.includes("<!DOCTYPE") || text.includes("<html")) {
                throw new Error("SERVER_STARTING");
            }
            throw new Error(`Server phản hồi không đúng định dạng (${res.status})`);
        }
    } catch (err) {
        if (err.message === "SERVER_STARTING") {
            alert("⏳ Hệ thống đang khởi động (Cold Start trên Render). Vui lòng đợi khoảng 30-60 giây và tải lại trang (F5).");
        } else if (err.message.includes("Unexpected token '<'")) {
            alert("⏳ Phản hồi từ Server bị lỗi định dạng. Có thể Server đang quá tải hoặc đang khởi động lại. Vui lòng thử lại sau ít phút.");
        } else {
            console.error("API Call Error:", err);
            throw err;
        }
    }
}

async function loadProductsAdmin() {
    try {
        products = await apiCall(`${API_BASE}/products`);
        renderProductTable();
        renderStockAlerts();
        renderDashboardStats(); 
    } catch (err) {
        console.error("Lỗi tải sản phẩm cho admin:", err);
    }
}

async function loadOrdersAdmin() {
    try {
        ordersAdmin = await apiCall(`${API_BASE}/orders`, {
            headers: {
                Authorization: `Bearer ${getAuthToken()}`
            }
        });
        renderOrderTable();
        renderDashboardStats(); 
    } catch (err) {
        console.error("Lỗi tải đơn hàng:", err);
    }
}

async function loadUsersAdmin() {
    try {
        usersAdmin = await apiCall(`${API_BASE}/users`, {
            headers: {
                Authorization: `Bearer ${getAuthToken()}`
            }
        });
        renderUserTable();
        renderDashboardStats(); 
    } catch (err) {
        console.error("Lỗi tải khách hàng:", err);
    }
}

// --- NEW DYNAMIC PRODUCT UTILS ---
function previewMultipleUpload(input, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    if (input.files) {
        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '60px'; img.style.height = '60px';
                img.style.objectFit = 'cover'; img.style.borderRadius = '8px';
                img.style.border = '1px solid #333'; img.style.margin = '4px';
                container.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    }
}

function addHighlightRow(data = { icon: '', title: '', text: '' }) {
    const container = document.getElementById('highlights-container');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'highlight-input-group';
    div.style.display = 'flex'; div.style.gap = '8px';
    div.style.alignItems = 'flex-start'; div.style.marginBottom = '8px';
    
    div.innerHTML = `
        <input class="dark-input hl-icon" placeholder="Icon" style="width:70px;" value="${data.icon || ''}">
        <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
            <input class="dark-input hl-title" placeholder="Tiêu đề" value="${data.title || ''}">
            <input class="dark-input hl-text" placeholder="Mô tả" value="${data.text || ''}">
        </div>
        <button onclick="this.parentElement.remove()" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size: 1.2rem;">&times;</button>
    `;
    container.appendChild(div);
}

async function uploadMultipleFiles(files) {
    if (!files || files.length === 0) return [];
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
    }
    const res = await fetch(`${API_BASE}/upload/multiple`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAuthToken()}` },
        body: formData
    });
    if (!res.ok) throw new Error("Lỗi tải lên nhiều ảnh");
    const data = await res.json();
    return data.urls || [];
}

function renderProductTable() {
  const body = document.getElementById('product-table-body');
  if (!body) return;
  
  const user = getCurrentUser();
  const isSuper = user && user.role === 'super_admin';

  // Tính toán số liệu kho hàng
  const totalProducts = products.length;
  let totalValue = 0;
  products.forEach(p => totalValue += (p.price * (p.stock || 10)));
  
  const totalPending = ordersAdmin.filter(o => o.status === 'pending').length;

  // Cập nhật DOM
  const elTotal = document.getElementById('m-stat-total');
  const elValue = document.getElementById('m-stat-value');
  const elPending = document.getElementById('m-stat-pending');

  if(elTotal) elTotal.innerText = totalProducts;
  if(elValue) elValue.innerText = `${totalValue.toLocaleString()} VNĐ`;
  if(elPending) elPending.innerText = totalPending;

  body.innerHTML = products.map(item => {
    const szCount = (item.sizes || []).length;
    const clCount = (item.colors || []).length;
    return `
    <tr>
      <td><img src="${item.img || item.image}" alt="${item.name}" style="width:58px; height:58px; object-fit:cover; border-radius:10px; border:1px solid #333;"></td>
      <td style="font-weight: 500;">${item.name}</td>
      <td class="text-warning" style="font-weight: 600; color: #ffb74d;">${item.price.toLocaleString()} VNĐ</td>
      ${isSuper ? `<td style="color: #10b981; font-weight:600;">${(item.cost || 0).toLocaleString()} VNĐ</td>` : ''}
      <td style="font-size: 0.82rem; color: #aaa;">
        ${szCount > 0 ? `<div style='margin-bottom:4px;'>📐 ${szCount} Size</div>` : ''}
        ${clCount > 0 ? `<div>🎨 ${clCount} Màu</div>` : ''}
        ${(!szCount && !clCount) ? 'Free Size' : ''}
      </td>
      <td class="${(item.stock || 0) < 5 ? 'stock-warning' : ''}" style="font-weight:700;">${item.stock || 0}</td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn-icon" style="background: rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.3); color: #3b82f6; border-radius:8px; padding:6px 10px; cursor:pointer;" onclick="editProduct('${item.id || item._id}')" title="Sửa">✏️</button> 
          <button class="btn-icon delete" style="background: rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color: #ef4444; border-radius:8px; padding:6px 10px; cursor:pointer;" onclick="deleteProduct('${item.id || item._id}')" title="Xóa">🗑️</button>
        </div>
      </td>
    </tr>
    `;
  }).join('');
}

const orderStatusMap = {
  'pending':    'Chờ xác nhận',
  'processing': 'Đang chuẩn bị',
  'shipping':   'Đang giao',
  'completed':  'Hoàn thành',
  'cancelled':  'Đã hủy'
};

function getDisplayStatus(status) {
   return orderStatusMap[status] || status;
}

function getBadgeStyle(statusText) {
  const styles = {
    'Chờ xác nhận': 'background:rgba(250,204,21,0.15); color:#facc15; border:1px solid rgba(250,204,21,0.3);',
    'Đang chuẩn bị':  'background:rgba(168,85,247,0.15); color:#a855f7; border:1px solid rgba(168,85,247,0.3);',
    'Đang giao':    'background:rgba(59,130,246,0.15);  color:#3b82f6; border:1px solid rgba(59,130,246,0.3);',
    'Hoàn thành':   'background:rgba(16,185,129,0.15);  color:#10b981; border:1px solid rgba(16,185,129,0.3);',
    'Đã hủy':       'background:rgba(239,68,68,0.15);   color:#ef4444; border:1px solid rgba(239,68,68,0.3);',
  };
  const base = 'padding:5px 11px; border-radius:99px; font-weight:700; font-size:0.75rem; white-space:nowrap;';
  return (styles[statusText] || 'background:#333; color:#aaa; border:1px solid #444;') + base;
}

function renderOrderFilters() {
  const el = document.getElementById('order-filters');
  if(!el) return;
  const filters = ['Tất cả', 'Chờ xác nhận', 'Đang chuẩn bị', 'Đang giao', 'Hoàn thành', 'Đã hủy'];
  el.innerHTML = filters.map(status => `
    <button style="background: ${currentOrderFilter === status ? '#10b981' : 'rgba(255,255,255,0.04)'}; color: ${currentOrderFilter === status ? '#fff' : '#a0a0a0'}; border: 1px solid ${currentOrderFilter === status ? '#10b981' : '#333'}; padding: 6px 14px; border-radius: 8px; cursor: pointer; transition: 0.2s; font-weight: 500; font-size:0.85rem;" onclick="setOrderFilter('${status}')">
        ${status === 'Chờ xác nhận' ? '🟠 ' : status === 'Đang chuẩn bị' ? '🟣 ' : status === 'Đang giao' ? '🔵 ' : status === 'Hoàn thành' ? '🟢 ' : status === 'Đã hủy' ? '🔴 ' : ''}${status}
    </button>
  `).join('');
}

function setOrderFilter(status) {
  currentOrderFilter = status;
  renderOrderFilters();
  renderOrderTable();
}

function renderOrderTable() {
  const body = document.getElementById('order-table-body');
  if (!body) return;

  const payMap = { cod: 'COD', bank: 'Bank', ewallet: 'MoMo' };
  const shipMap = { self: 'Tự giao', ghn: 'GHN' };

  body.innerHTML = ordersAdmin
    .filter(order => {
      if (!currentOrderFilter || currentOrderFilter === 'Tất cả') return true;
      return getDisplayStatus(order.status) === currentOrderFilter;
    })
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(order => {
        const d_status = getDisplayStatus(order.status);
        return `
          <tr class="order-row" id="orow-${order._id}" onclick="viewOrder('${order._id}')" style="cursor:pointer; transition:0.2s;">
            <td style="font-weight: 600; color:#a0c4ff;">#${order._id.slice(-6).toUpperCase()}</td>
            <td>
              <div style="font-weight:500;">${order.customerName || 'Khách hàng'}</div>
              <div style="font-size:0.75rem; color:#888;">${order.customerPhone || ''}</div>
            </td>
            <td style="color: #ffb74d; font-weight: 700;">${(order.total||0).toLocaleString()}<br><span style="font-size:0.72rem; color:#666; font-weight:400;">VND</span></td>
            <td>
              <span style="${getBadgeStyle(d_status)}">${d_status}</span>
            </td>
            <td>
              <div style="font-size:0.8rem; color:#a0a0a0;">💳 ${payMap[order.paymentMethod] || 'COD'}</div>
              <div style="font-weight:600; font-size:0.75rem; color: ${order.paymentStatus === 'paid' ? '#10b981' : '#facc15'}">
                ${order.paymentStatus === 'paid' ? '● Đã thanh toán' : '○ Chờ thanh toán'}
              </div>
              <div style="font-weight:600; color:#fff; font-size:0.8rem;">🚚 ${shipMap[order.shippingMethod] || 'Chưa chọn'}</div>
            </td>
          </tr>
        `;
    }).join('');
}

let activeOrderId = null;

function viewOrder(orderId) {
  activeOrderId = orderId;
  const order = ordersAdmin.find(o => o._id === orderId);
  if (!order) return;

  // Highlight selected row
  document.querySelectorAll('.order-row').forEach(row => row.classList.remove('order-row-active'));
  const row = document.getElementById('orow-' + orderId);
  if (row) row.classList.add('order-row-active');

  const panel = document.getElementById('master-detail-panel');
  panel.style.display = 'flex';

  const itemsHtml = (order.items || []).map(item => `
    <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #2a2a2a;">
      <img src="${item.img || item.image || ''}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;background:#2a2a2a;">
      <div style="flex:1;">
        <div style="color:#fff;font-weight:500;font-size:0.9rem;">${item.name}</div>
        <div style="color:#555;font-size:0.75rem;">SKU: ${item.id}</div>
      </div>
      <div style="text-align:right;">
        <div style="color:#ffb74d;font-weight:700;">${((item.price||0)*(item.quantity||1)).toLocaleString()} VND</div>
        <div style="color:#888;font-size:0.8rem;">SL: ${item.quantity || 1}</div>
      </div>
    </div>
  `).join('');

  const d_status = getDisplayStatus(order.status);
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '';

  // Render History Audit Logs
  let auditHtml = '';
  if (order.auditLog && order.auditLog.length > 0) {
      auditHtml = `<div style="margin-top:14px; padding-top:14px; border-top:1px dashed #333;">
        <div style="font-size:0.75rem; color:#888; text-transform:uppercase; margin-bottom:8px;">Lịch sử thao tác (Audit Log)</div>
        ${order.auditLog.map(log => `
            <div style="font-size: 0.8rem; color:#a0a0a0; margin-bottom:4px;">
              <strong style="color:#3b82f6">${log.handledBy}</strong> [${new Date(log.timestamp).toLocaleTimeString()}]: ${log.action}
            </div>
        `).join('')}
      </div>`;
  }

  document.getElementById('order-detail-content').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
        <div>
            <div style="color:#888; font-size:0.8rem;">Mã đơn hàng</div>
            <div style="color:#fff; font-size:1.3rem; font-weight:800;">#${order._id.slice(-6).toUpperCase()}</div>
            <div style="color:#555; font-size:0.75rem; margin-top:2px;">${dateStr}</div>
        </div>
        <div>
            <span style="${getBadgeStyle(d_status)}; font-size: 0.85rem;">${d_status}</span>
        </div>
    </div>

    <div style="background:#111; border-radius:12px; padding:16px; margin-bottom:12px; border:1px solid #222;">
        <div style="font-size:0.78rem; color:#888; text-transform:uppercase; font-weight:600; margin-bottom:10px;">Thông tin giao hàng</div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span style="color:#a0a0a0;">Người nhận:</span>
            <strong style="color:#fff;">${order.customerName || 'Khách hàng'}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span style="color:#a0a0a0;">Điện thoại:</span>
            <strong style="color:#fff;">${order.customerPhone || 'Chưa có'}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span style="color:#a0a0a0;">Địa chỉ:</span>
            <span style="color:#fff; text-align:right; max-width:60%;">${order.address || 'Chưa có địa chỉ'}</span>
        </div>
        ${order.note ? `<div style="margin-top:8px; padding-top:8px; border-top:1px solid #222; color:#eab308; font-size:0.85rem; font-style:italic;">Ghi chú: "${order.note}"</div>` : ''}
    </div>

    <div style="background:#111; border-radius:12px; padding:16px; margin-bottom:12px; border:1px solid #222;">
        <div style="font-size:0.78rem; color:#888; text-transform:uppercase; font-weight:600; margin-bottom:10px;">Thanh toán & Vận chuyển</div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span style="color:#a0a0a0;">Hình thức:</span>
            <strong style="color:#fff;">${order.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản'}</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
            <span style="color:#a0a0a0;">Trạng thái:</span>
            <strong style="color:${order.paymentStatus === 'paid' ? '#10b981' : '#facc15'}; text-transform:uppercase;">
                ${order.paymentStatus === 'paid' ? 'Đã thanh toán (Webhook)' : 'Chờ chuyển khoản'}
            </strong>
        </div>
    </div>

    <div style="background:#111; border-radius:12px; padding:16px; border:1px solid #222;">
        <div style="font-size:0.78rem; color:#888; text-transform:uppercase; font-weight:600; margin-bottom:8px;">Chi tiết sản phẩm (${(order.items||[]).length})</div>
        ${itemsHtml || '<div style="color:#666;">Kho hàng trống</div>'}
        <div style="display:flex; justify-content:space-between; padding:12px 0 0; margin-top:8px; border-top:1px solid #333;">
            <span style="color:#888;">Tổng thanh toán</span>
            <span style="color:#ffb74d; font-size:1.15rem; font-weight:800;">${(order.total||0).toLocaleString()} VND</span>
        </div>
        ${auditHtml}
    </div>
  `;

  // --- SMART ACTION BAR RENDER LOGIC ---
  const actionDiv = document.getElementById('order-smart-actions');
  actionDiv.innerHTML = ''; 

  const state = order.status || 'pending';
  
  if (state === 'pending') {
      actionDiv.innerHTML = `
        ${(order.paymentMethod === 'bank' && order.paymentStatus !== 'paid') ? `
            <button class="order-detail-btn" onclick="simulateWebhook('${order.readableId}', ${order.total})" style="background:linear-gradient(90deg, #4f46e5, #3b82f6); color:#fff; font-weight:800; border:none; margin-bottom:10px;">⚡ GIẢ LẬP WEBHOOK (TIỀN VỀ)</button>
        ` : ''}
        <button class="order-detail-btn btn-status-confirm" onclick="updateOrderStatus('${orderId}', 'processing')">✅ Xác nhận đơn hàng</button>
        <button class="order-detail-btn btn-status-cancel" onclick="updateOrderStatus('${orderId}', 'cancelled')">❌ Hủy đơn hàng</button>
      `;
  } else if (state === 'processing') {
      actionDiv.innerHTML = `
        <button class="order-detail-btn btn-status-print" onclick="printInvoice('${orderId}')">🖨️ In hóa đơn (K80 thermal)</button>
        <button class="order-detail-btn btn-status-ship" onclick="updateOrderStatus('${orderId}', 'shipping')">📦 Giao cho Shipper</button>
        <button class="order-detail-btn btn-status-cancel" onclick="updateOrderStatus('${orderId}', 'cancelled')">❌ Hủy đơn hàng</button>
      `;
  } else if (state === 'shipping') {
      actionDiv.innerHTML = `
        <button class="order-detail-btn btn-status-complete" onclick="updateOrderStatus('${orderId}', 'completed')">⭐ Giao hàng thành công</button>
        <button class="order-detail-btn btn-status-cancel" onclick="updateOrderStatus('${orderId}', 'cancelled')">🔙 Khách không nhận / Hoàn hàng</button>
      `;
  } else if (state === 'completed' || state === 'cancelled') {
      actionDiv.innerHTML = `
        <div style="text-align:center; color:#888; padding:10px;">Đơn hàng đã khép vòng đời.</div>
        ${state === 'completed' ? `<button class="order-detail-btn btn-status-print" onclick="printInvoice('${orderId}')" style="margin-top:10px;">🖨️ In lại hóa đơn</button>` : ''}
      `;
  }
}

// ── PRINT INVOICE ──
function printInvoice(orderId) {
    const order = ordersAdmin.find(o => o._id === orderId);
    if (!order) return;

    const printArea = document.getElementById('invoice-print-area');
    
    // Tao layout hoa don don sac
    let itemsStr = '';
    (order.items || []).forEach(item => {
        itemsStr += `
            <div class="print-item-row">
                <div class="print-item-name">${item.quantity || 1}x ${item.name}</div>
                <div class="print-item-price">${((item.price||0)*(item.quantity||1)).toLocaleString()}</div>
            </div>
        `;
    });

    printArea.innerHTML = `
        <h2>FASHION MODERN</h2>
        <div style="text-align:center;font-size:11px;margin-bottom:10px;">Phiếu Giao Hàng (Bản sao)</div>
        <div>Mã đơn: <b>#${order._id.slice(-8).toUpperCase()}</b></div>
        <div>Ngày in: ${new Date().toLocaleString('vi-VN')}</div>
        <div class="print-divider"></div>
        <div>Khách hàng: <b>${order.customerName}</b></div>
        <div>SĐT: <b>${order.customerPhone}</b></div>
        <div>Đ/c: ${order.address}</div>
        ${order.note ? `<div>* Ghi chú: ${order.note}</div>` : ''}
        <div class="print-divider"></div>
        <div><b>SẢN PHẨM:</b></div>
        ${itemsStr}
        <div class="print-divider"></div>
        <div class="print-item-row">
            <div><b>TỔNG THANH TOÁN:</b></div>
            <div><b>${(order.total||0).toLocaleString()} VND</b></div>
        </div>
        <div style="margin-top:8px; font-weight:bold; font-size:14px;">(${order.paymentMethod === 'cod' ? 'THU TIỀN MẶT' : 'ĐÃ CHUYỂN KHOẢN'})</div>
        <div class="print-divider"></div>
        <div style="text-align:center;font-size:11px;margin-top:14px;">Cảm ơn bạn đã đồng hành mang sản phẩm đến khách hàng!</div>
    `;

    // Gọi lệnh in trình duyệt
    window.print();
}

async function updateOrderStatus(orderId, newStatus) {
  if (!newStatus) return;
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errBody = await res.json();
        errMsg = errBody.message || errMsg;
      } catch(_) {}
      throw new Error(errMsg);
    }

    // Tự động tải lại và cập nhật panel
    await loadOrdersAdmin();
    viewOrder(orderId);
  } catch(e) {
    alert('Loi cap nhat trang thai: ' + e.message);
  }
}


// -----------------------
// QUẢN LÝ DANH MỤC (CATEGORY)
// -----------------------
async function loadCategoriesAdmin() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error("API error");
    categoriesAdmin = await res.json();
    renderCategoryTable();
    updateCategorySelects();
  } catch(e) {
    console.error("Lỗi tải danh mục:", e);
  }
}

function renderCategoryTable() {
  const body = document.getElementById('category-table-body');
  if(!body) return;
  body.innerHTML = categoriesAdmin.map(c => `
    <tr>
        <td style="font-weight: bold;">${c.name}</td>
        <td style="color: #a0a0a0;">${c.subcategories ? c.subcategories.join(', ') : ''}</td>
        <td>
           <button class="btn-icon delete" style="background: rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color: #ef4444; border-radius:8px; padding:8px 12px; cursor:pointer;" onclick="deleteCategory('${c.id}')">🗑️</button>
        </td>
    </tr>
  `).join('');
}

function updateCategorySelects() {
  const select = document.getElementById('new-category');
  if(!select) return;
  let html = '';
  categoriesAdmin.forEach(c => {
    html += `<option value="${c.name}">${c.name}</option>`;
    if (c.subcategories && c.subcategories.length > 0) {
       c.subcategories.forEach(sub => {
          html += `<option value="${sub}">-- ${sub}</option>`;
       });
    }
  });
  if (html === '') html = '<option value="Khác">Khác</option>';
  select.innerHTML = html;
}

async function addCategory() {
  const name = document.getElementById('new-cat-name').value.trim();
  const subs = document.getElementById('new-cat-subs').value.trim();
  if(!name) return alert("Vui lòng nhập tên danh mục chính");
  
  const subArr = subs ? subs.split(',').map(s=>s.trim()).filter(s=>s) : [];
  
  try {
    const res = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ name, subcategories: subArr })
    });
    if(!res.ok) throw new Error("Chưa lưu được danh mục");
    document.getElementById('new-cat-name').value = '';
    document.getElementById('new-cat-subs').value = '';
    loadCategoriesAdmin();
  } catch(e) {
    alert("Lỗi: " + e.message);
  }
}

async function deleteCategory(id) {
  if(!confirm("Bạn có chắc muốn xóa danh mục này?")) return;
  try {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getAuthToken()}` }
    });
    if(!res.ok) throw new Error("Không thể xóa");
    loadCategoriesAdmin();
  } catch(e) {
    alert(e.message);
  }
}

function renderUserTable() {
  const body = document.getElementById('rbac-user-table-body');
  if (!body) return;

  const currentUser = getCurrentUser();
  const isSuper = currentUser && currentUser.role === 'super_admin';

  // Cập nhật thống kê mini
  const totalUsers = usersAdmin.length;
  const totalAdmins = usersAdmin.filter(u => u.role === 'admin' || u.role === 'super_admin').length;
  
  const totalUsersEl = document.getElementById('rbac-total-users');
  const totalAdminsEl = document.getElementById('rbac-total-admins');
  if (totalUsersEl) totalUsersEl.innerText = totalUsers;
  if (totalAdminsEl) totalAdminsEl.innerText = totalAdmins;

  body.innerHTML = usersAdmin.map(user => {
    const isTargetSuper = user.role === 'super_admin';
    const isTargetAdmin = user.role === 'admin';
    
    let roleBadge = '';
    if (isTargetSuper) roleBadge = '<span class="badge-role super_admin">Quản trị tối cao</span>';
    else if (isTargetAdmin) roleBadge = '<span class="badge-role admin">Admin</span>';
    else roleBadge = '<span class="badge-role user">Người dùng</span>';

    // Logic nút hành động
    let actionBtn = '';
    if (isTargetSuper) {
        actionBtn = '<button class="btn-action disabled" disabled>Toi cao</button>';
    } else if (!isSuper) {
        // Nếu không phải Super Admin thì không được làm gì cả
        actionBtn = '<button class="btn-action disabled" disabled>🔒 Limited</button>';
    } else {
        // Super Admin đang xem Admin hoặc User
        if (isTargetAdmin) {
            actionBtn = `<button class="btn-action" onclick="changeUserRole('${user.id}', 'user')">Ha quyen</button>`;
        } else {
            actionBtn = `<button class="btn-action" onclick="changeUserRole('${user.id}', 'admin')">Nang quyen</button>`;
        }
    }

    return `
      <tr>
        <td>
          <div class="user-row">
            <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
            <div style="font-weight:600;">${user.username}</div>
          </div>
        </td>
        <td style="color:#666;">${user.email}</td>
        <td>${roleBadge}</td>
        <td>${actionBtn}</td>
      </tr>
    `;
  }).join('');
}

async function changeUserRole(userId, newRole) {
  if (!confirm(`Bạn có chắc muốn đổi quyền của người dùng này thành ${newRole}?`)) return;

  try {
    const res = await fetch(`${API_BASE}/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ role: newRole })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Lỗi cập nhật quyền");

    alert(data.message);
    loadUsersAdmin(); // Reload list
  } catch (err) {
    alert("Lỗi: " + err.message);
  }
}

function renderStockAlerts() {
  const container = document.getElementById('stock-alerts');
  if (!container) return;
  const lowStock = products.filter(item => (item.stock || 10) < 5);
  container.innerHTML = lowStock.length ? lowStock.map(item => `
    <div class="low-stock-alert">
      <div>
        <strong>${item.name}</strong>
        <div>Chỉ còn ${item.stock || 10} sản phẩm trong kho.</div>
      </div>
      <span class="stock-warning">Cảnh báo</span>
    </div>
  `).join('') : '<div class="low-stock-alert">Tất cả sản phẩm đều ổn định trong kho.</div>';
}

function switchSection(section, btn) {
  document.querySelectorAll('.admin-menu button').forEach(el => el.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.admin-section').forEach(sec => sec.style.display = sec.id === section ? 'block' : 'none');
  
  // Tự động reload dữ liệu tương ứng khi chuyển tab
  if (section === 'users') loadUsersAdmin();
  if (section === 'products') loadProductsAdmin();
  if (section === 'orders') loadOrdersAdmin();
  if (section === 'categories') loadCategoriesAdmin();
  if (section === 'dashboard') renderDashboardStats();
  if (section === 'vouchers') loadVouchersAdmin();
  if (section === 'settings') loadSettingsAdmin();
}

// -----------------------
// QUẢN LÝ VOUCHER (PRO CRUD)
// -----------------------
let vouchersAdmin = [];
async function loadVouchersAdmin() {
  try {
    const url = `${API_BASE}/vouchers/admin`;
    vouchersAdmin = await apiCall(url, {
      headers: { Authorization: `Bearer ${getAuthToken()}` }
    });
    
    if (!vouchersAdmin) return; // Silent return if html alert already shown in apiCall

    renderVoucherTable();
    
    // Cập nhật stats
    const total = vouchersAdmin.length;
    const active = vouchersAdmin.filter(v => v.active).length;
    if (document.getElementById('v-stat-total')) document.getElementById('v-stat-total').innerText = total;
    if (document.getElementById('v-stat-active')) document.getElementById('v-stat-active').innerText = active;
  } catch(e) {
    console.error("Lỗi tải voucher:", e);
    // Thông báo lỗi thô nếu không phải lỗi SERVER_STARTING đã được xử lý trong apiCall
    if (!e.message.includes("SERVER_STARTING")) {
        alert("Lỗi tải Voucher: " + e.message);
    }
  }
}

function renderVoucherTable() {
  const body = document.getElementById('voucher-table-body');
  if(!body) return;
  body.innerHTML = vouchersAdmin.map(v => `
    <tr>
        <td style="font-weight: bold; color: #a0c4ff;">${v.code}</td>
        <td style="padding: 12px;">
            <div style="font-weight:600; font-size:0.9rem;">${v.description}</div>
            <div style="font-size:0.75rem; color:#666;">
              Loại: ${v.type === 'fixed' ? 'Giảm tiền' : v.type === 'percent' ? 'Giảm %' : 'Freeship'} 
              ${v.isPublic ? '<span style="color:#facc15; font-weight:bold; margin-left:8px;">★ Hiện trang chủ</span>' : ''}
            </div>
        </td>
        <td style="font-size: 0.9rem; color: #888;">${v.minOrder.toLocaleString()} VNĐ</td>
        <td>
           <span style="${v.active ? 'background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.3);' : 'background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.3);'} padding:5px 12px; border-radius:99px; font-size:0.7rem; font-weight:700;">
             ${v.active ? 'ĐANG HOẠT ĐỘNG' : 'ĐÃ KHÓA'}
           </span>
        </td>
        <td>
           <div style="display:flex; gap:8px;">
               <button class="btn-outline" style="padding: 6px 14px; font-size: 0.7rem; border-color: ${v.active ? '#f59e0b' : '#3b82f6'}; color: ${v.active ? '#f59e0b' : '#3b82f6'};" onclick="toggleVoucherAdmin('${v.code}')">
                 ${v.active ? 'Khóa mã' : 'Mở khóa'}
               </button>
               <button class="btn-icon delete" style="background: rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color: #ef4444; border-radius:8px; padding:6px 12px; cursor:pointer;" onclick="deleteVoucherAdmin('${v.code}')">🗑️</button>
           </div>
        </td>
    </tr>
  `).join('');
}

async function saveVoucherAdmin(e) {
  e.preventDefault();
  const formData = {
    code: document.getElementById('v-code').value.trim(),
    type: document.getElementById('v-type').value,
    value: document.getElementById('v-value').value,
    minOrder: document.getElementById('v-min').value,
    description: document.getElementById('v-desc').value.trim(),
    isPublic: document.getElementById('v-is-public').checked
  };

  try {
    const data = await apiCall(`${API_BASE}/vouchers/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(formData)
    });
    
    if (!data) return;
    
    alert("✅ " + data.message);
    document.getElementById('voucher-form').reset();
    loadVouchersAdmin();
  } catch(e) {
    alert("❌ Lỗi: " + e.message);
  }
}

async function toggleVoucherAdmin(code) {
  try {
    const res = await fetch(`${API_BASE}/vouchers/${code}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${getAuthToken()}` }
    });
    if (!res.ok) throw new Error("Không thể cập nhật trạng thái");
    loadVouchersAdmin();
  } catch(e) {
    alert("Lỗi: " + e.message);
  }
}

async function deleteVoucherAdmin(code) {
  if (!confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN mã ${code}? Hành động này không thể hoàn tác.`)) return;
  try {
    const res = await fetch(`${API_BASE}/vouchers/${code}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getAuthToken()}` }
    });
    const data = await res.json();
    alert(data.message);
    loadVouchersAdmin();
  } catch(e) {
    alert("Lỗi: " + e.message);
  }
}

async function addProduct() {
  const name = document.getElementById('new-name').value.trim();
  const price = Number(document.getElementById('new-price').value);
  const imageFile = document.getElementById('new-image-file').files[0];
  const stock = Number(document.getElementById('new-stock').value);
  const category = document.getElementById('new-category').value;
  const sizes = [...selectedSizes];
  const colors = [...selectedColors];
  const description = document.getElementById('new-description').value.trim();
  const features = document.getElementById('new-features').value.trim().split('\n').filter(f => f.trim());
  
  // Collect matrix data
  const variants = [];
  selectedColors.forEach(c => {
    selectedSizes.forEach(s => {
      const sku = `${c}-${s}`;
      if (currentMatrixData[sku]) {
        variants.push({ color: c, size: s, ...currentMatrixData[sku] });
      }
    });
  });

  if (!name || !price || !stock || !category) {
    alert('Vui long nhap day du thong tin: Ten, Gia, Ton kho và Danh muc.');
    return;
  }

  // Only require image for NEW product creation
  if (!imageFile && !editingProductId) {
    alert('Vui long chon anh cho san pham moi.');
    return;
  }
  // Thu thập Highlights
  const highlightItems = [];
  document.querySelectorAll('.highlight-input-group').forEach(group => {
    const icon = group.querySelector('.hl-icon').value.trim();
    const title = group.querySelector('.hl-title').value.trim();
    const text = group.querySelector('.hl-text').value.trim();
    if (title) highlightItems.push({ icon, title, text });
  });

  try {
      let imageUrl = 'https://via.placeholder.com/600x800?text=No+Image';
      
      if (imageFile) {
          const formData = new FormData();
          formData.append('image', imageFile);
          const uploadRes = await fetch(`${API_BASE}/upload`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${getAuthToken()}` },
              body: formData
          });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok) throw new Error(uploadData.message || "Khong the upload anh.");
          imageUrl = uploadData.url;
      }

      // Tải ảnh Thumbnails
      let thumbnailUrlList = [];
      const thumbInput = document.getElementById('new-thumbnails-files');
      if (thumbInput.files.length > 0) {
          thumbnailUrlList = await uploadMultipleFiles(thumbInput.files);
      }

      // Tải ảnh UGC
      let ugcUrlList = [];
      const ugcInput = document.getElementById('new-ugc-files');
      if (ugcInput.files.length > 0) {
          ugcUrlList = await uploadMultipleFiles(ugcInput.files);
      }

      const productData = { 
        name, 
        price, 
        cost: Number(document.getElementById('new-cost').value) || Math.floor(price * 0.7),
        image: imageUrl, 
        thumbnails: thumbnailUrlList,
        ugcPhotos: ugcUrlList,
        highlights: highlightItems,
        stock, 
        category, 
        sizes, 
        colors, 
        features, 
        description, 
        variants 
      };

      const res = await fetch(`${API_BASE}/products`, {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              Authorization: `Bearer ${getAuthToken()}`
          },
          body: JSON.stringify(productData)
      });
      if (!res.ok) throw new Error("Khong the them san pham.");
      
      alert('Them san pham thanh cong!');
      loadProductsAdmin();
      
      // Reset form
      document.getElementById('new-name').value = '';
      document.getElementById('new-price').value = '';
      if(document.getElementById('new-cost')) document.getElementById('new-cost').value = '';
      document.getElementById('new-image-file').value = '';
      document.getElementById('new-stock').value = '';
      document.getElementById('new-features').value = '';
      currentMatrixData = {};
      // Reset variant pickers
      resetVariantPickers();
      editingProductId = null;
      document.querySelector('.banner-title').innerText = "Thêm sản phẩm mới";
  } catch (err) {
      console.error(err);
      alert('Loi: ' + err.message);
  }
}

// =============================
// VARIANT PICKER (SIZE + COLOR)
// =============================
const PRESET_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size'];
const PRESET_COLORS = [
  { name: 'Den',    hex: '#111111' },
  { name: 'Trang',  hex: '#f5f5f5' },
  { name: 'Xam',    hex: '#9ca3af' },
  { name: 'Nau',    hex: '#92400e' },
  { name: 'Xanh Navy', hex: '#1e3a5f' },
  { name: 'Xanh Duong', hex: '#3b82f6' },
  { name: 'Xanh La', hex: '#10b981' },
  { name: 'Do',     hex: '#ef4444' },
  { name: 'Vang',   hex: '#f59e0b' },
  { name: 'Hong',   hex: '#ec4899' },
  { name: 'Tim',    hex: '#8b5cf6' },
  { name: 'Cam',    hex: '#f97316' },
];

let selectedSizes = new Set();
let selectedColors = new Set();

// Expose to global scope for HTML onclick access
window.PRESET_SIZES = PRESET_SIZES;
window.PRESET_COLORS = PRESET_COLORS;
window.selectedSizes = selectedSizes;
window.selectedColors = selectedColors;
window.renderSizePicker = renderSizePicker;
window.renderColorPicker = renderColorPicker;
window.toggleSize = toggleSize;
window.toggleColor = toggleColor;

window.selectAllSizes = function() {
  selectedSizes.clear();
  PRESET_SIZES.forEach(sz => selectedSizes.add(sz));
  renderSizePicker();
};

window.clearAllSizes = function() {
  selectedSizes.clear();
  renderSizePicker();
};

window.selectAllColors = function() {
  selectedColors.clear();
  PRESET_COLORS.forEach(c => selectedColors.add(c.name));
  renderColorPicker();
};

window.clearAllColors = function() {
  selectedColors.clear();
  renderColorPicker();
};

let currentMatrixData = {}; // Stores { 'Den-S': { stock: 10, inStock: true } }

function initVariantPickers() {
  renderSizePicker();
  renderColorPicker();
}

function renderSizePicker() {
  const box = document.getElementById('size-picker');
  if (!box) return;
  box.innerHTML = PRESET_SIZES.map(sz => {
    const isActive = selectedSizes.has(sz);
    return `
      <button type="button" onclick="toggleSize('${sz}')"
        style="
          padding: 10px 18px;
          border-radius: 10px;
          border: 2px solid ${isActive ? '#3b82f6' : '#333'};
          background: ${isActive ? '#3b82f6' : '#1a1a1a'};
          color: ${isActive ? '#fff' : '#a0a0a0'};
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.15s ease;
          position: relative;
        "
      >
        ${sz}
        ${isActive ? '<span style="position:absolute;top:-5px;right:-5px;width:16px;height:16px;background:#10b981;border-radius:50%;font-size:0.65rem;display:grid;place-items:center;color:#fff;">✓</span>' : ''}
      </button>
    `;
  }).join('');
  renderInventoryMatrix();
}

function renderColorPicker() {
  const box = document.getElementById('color-picker');
  if (!box) return;
  box.innerHTML = PRESET_COLORS.map(c => {
    const isActive = selectedColors.has(c.name);
    const isLight = ['Trang', 'Vang'].includes(c.name);
    return `
      <button type="button" onclick="toggleColor('${c.name}')"
        title="${c.name}"
        style="
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: ${c.hex};
          border: 3px solid ${isActive ? '#fff' : 'transparent'};
          box-shadow: ${isActive ? '0 0 0 2px #3b82f6' : '0 0 0 1px #444'};
          cursor: pointer;
          position: relative;
          transition: all 0.15s;
          flex-shrink: 0;
        "
      >
        ${isActive ? `<span style="position:absolute;inset:0;display:grid;place-items:center;font-size:1rem;color:${isLight ? '#333' : '#fff'};">✓</span>` : ''}
      </button>
    `;
  }).join('');

  // Show selected color names
  const names = [...selectedColors];
  const hint = document.getElementById('color-selected-hint');
  if (hint) hint.innerText = names.length ? 'Đã chọn: ' + names.join(', ') : '';
  renderInventoryMatrix();
}

function renderInventoryMatrix() {
  const container = document.getElementById('inventory-matrix-container');
  const section = document.getElementById('inventory-matrix-section');
  if (!container || !section) return;

  const sizes = [...selectedSizes];
  const colors = [...selectedColors];

  if (sizes.length === 0 || colors.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  let html = `
    <table style="width:100%; border-collapse: collapse; background:#111; border-radius:12px; overflow:hidden;">
      <thead style="background:#222; text-align:left;">
        <tr>
          <th style="padding:12px; color:#888; font-size:0.8rem;">BIEN THE (Màu - Size)</th>
          <th style="padding:12px; color:#888; font-size:0.8rem;">TON KHO</th>
          <th style="padding:12px; color:#888; font-size:0.8rem;">TRANG THAI</th>
        </tr>
      </thead>
      <tbody>
  `;

  colors.forEach(c => {
    sizes.forEach(s => {
      const sku = `${c}-${s}`;
      const data = currentMatrixData[sku] || { stock: 10, inStock: true };
      
      // Update the matrix reference
      currentMatrixData[sku] = data;

      html += `
        <tr style="border-top:1px solid #222;">
          <td style="padding:12px; font-weight:600; color:#eee;">${sku}</td>
          <td style="padding:12px;">
            <input type="number" value="${data.stock}" 
              onchange="updateMatrixItem('${sku}', 'stock', this.value)"
              style="width:70px; background:#222; border:1px solid #333; color:#fff; padding:6px; border-radius:6px; outline:none;">
          </td>
          <td style="padding:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" ${data.inStock ? 'checked' : ''} 
                onchange="updateMatrixItem('${sku}', 'inStock', this.checked)"
                id="stock-toggle-${sku}" style="cursor:pointer;">
              <label for="stock-toggle-${sku}" style="font-size:0.85rem; color:${data.inStock ? '#10b981' : '#ef4444'};">
                ${data.inStock ? 'Con hang' : 'Het hang'}
              </label>
            </div>
          </td>
        </tr>
      `;
    });
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

window.updateMatrixItem = function(sku, key, value) {
  if (!currentMatrixData[sku]) currentMatrixData[sku] = { stock: 0, inStock: true };
  if (key === 'stock') currentMatrixData[sku].stock = Number(value);
  if (key === 'inStock') currentMatrixData[sku].inStock = value;
  renderInventoryMatrix();
};

function toggleSize(sz) {
  if (selectedSizes.has(sz)) selectedSizes.delete(sz);
  else selectedSizes.add(sz);
  renderSizePicker();
}

function toggleColor(name) {
  if (selectedColors.has(name)) selectedColors.delete(name);
  else selectedColors.add(name);
  renderColorPicker();
}

function resetVariantPickers() {
  selectedSizes.clear();
  selectedColors.clear();
  renderSizePicker();
  renderColorPicker();
}

// Legacy compat — keep so old references don't break
let currentSizeTags = [];
function addSizeTag() {}
function removeSize() {}
function renderSizeTags() {}

// UNIFIED EDIT MODE
let editingProductId = null;

function editProduct(id) {
  const p = products.find(prod => (prod.id === id || prod._id === id));
  if (!p) return;

  editingProductId = id;
  const banner = document.querySelector('.banner-title');
  if (banner) banner.innerText = "Chỉnh sửa: " + p.name;
  
  // Fill form
  document.getElementById('new-name').value = p.name;
  document.getElementById('new-price').value = p.price;
  if(document.getElementById('new-cost')) document.getElementById('new-cost').value = p.cost || 0;
  document.getElementById('new-stock').value = p.stock || 0;
  document.getElementById('new-category').value = p.category || 'Ao';
  document.getElementById('new-description').value = p.description || '';
  document.getElementById('new-features').value = (p.features || []).join('\n');

  // Fill matrix
  currentMatrixData = {};
  if (p.variants) {
    p.variants.forEach(v => {
      currentMatrixData[`${v.color}-${v.size}`] = { stock: v.stock, inStock: v.inStock };
    });
  }

  // Fill variants
  selectedSizes.clear();
  (p.sizes || []).forEach(s => selectedSizes.add(s));
  
  selectedColors.clear();
  (p.colors || []).forEach(c => selectedColors.add(c));
  
  renderSizePicker();
  renderColorPicker();

  // --- HIỂN THỊ DỮ LIỆU ĐỘNG KIỂU YAME ---
  // Hiển thị ảnh bìa hiện tại
  const previewBox = document.getElementById('upload-preview-box');
  if (previewBox) {
    previewBox.innerHTML = `<img src="${p.image || p.img}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
    document.getElementById('upload-text').innerText = "Thay đổi ảnh bìa";
  }

  // Hiển thị Thumbnails hiện tại
  const thumbContainer = document.getElementById('thumb-preview-container');
  if (thumbContainer) {
    thumbContainer.innerHTML = (p.thumbnails || []).map(url => `
        <img src="${url}" style="width:50px; height:50px; object-fit:cover; border-radius:6px; border:1px solid #333; margin:2px;">
    `).join('');
  }

  // Hiển thị UGC hiện tại
  const ugcContainer = document.getElementById('ugc-preview-container');
  if (ugcContainer) {
    ugcContainer.innerHTML = (p.ugcPhotos || []).map(url => `
        <img src="${url}" style="width:50px; height:50px; object-fit:cover; border-radius:6px; border:1px solid #333; margin:2px;">
    `).join('');
  }

  // Hiển thị Highlights hiện tại
  const hlContainer = document.getElementById('highlights-container');
  if (hlContainer) {
    hlContainer.innerHTML = '';
    const highlights = p.highlights || [];
    if (highlights.length === 0) {
        addHighlightRow();
    } else {
        highlights.forEach(h => addHighlightRow(h));
    }
  }

  // Scroll to form
  const card = document.querySelector('.product-add-card');
  if (card) card.scrollIntoView({ behavior: 'smooth' });

  // UI Change: update save button text
  const saveBtn = document.querySelector('.product-add-card .btn-primary');
  if (saveBtn) saveBtn.innerText = "Cập nhật sản phẩm";
}

async function saveProduct() {
  if (editingProductId) {
    // Logic for Update (PUT)
    const name = document.getElementById('new-name').value.trim();
    const price = Number(document.getElementById('new-price').value);
    const stock = Number(document.getElementById('new-stock').value);
    const category = document.getElementById('new-category').value;
    const description = document.getElementById('new-description').value.trim();
    const features = document.getElementById('new-features').value.trim().split('\n').filter(f => f.trim());
    const sizes = [...selectedSizeValues];
    const colors = [...selectedColorValues];

    // Thu thập Highlights
    const highlightItems = [];
    document.querySelectorAll('.highlight-input-group').forEach(group => {
        const icon = group.querySelector('.hl-icon').value.trim();
        const title = group.querySelector('.hl-title').value.trim();
        const text = group.querySelector('.hl-text').value.trim();
        if (title) highlightItems.push({ icon, title, text });
    });

    try {
      const product = products.find(p => p.id === editingProductId || p._id === editingProductId);
      
      // Handle Main Image Update
      let imgUrl = product.image || product.img;
      const fileInput = document.getElementById('new-image-file');
      if (fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        const upRes = await fetch(`${API_BASE}/upload`, { 
            method: 'POST', 
            headers: { Authorization: `Bearer ${getAuthToken()}` },
            body: formData 
        });
        const upData = await upRes.json();
        imgUrl = upData.url;
      }

      // Handle Thumbnails Update
      let thumbnailUrlList = product.thumbnails || [];
      const thumbInput = document.getElementById('new-thumbnails-files');
      if (thumbInput.files.length > 0) {
          thumbnailUrlList = await uploadMultipleFiles(thumbInput.files);
      }

      // Handle UGC Update
      let ugcUrlList = product.ugcPhotos || [];
      const ugcInput = document.getElementById('new-ugc-files');
      if (ugcInput.files.length > 0) {
          ugcUrlList = await uploadMultipleFiles(ugcInput.files);
      }

      const cost = document.getElementById('new-cost') ? Number(document.getElementById('new-cost').value) : null;
      const payload = { 
        name, price, cost, stock, category, description, features, 
        sizes, colors, variants, 
        image: imgUrl,
        thumbnails: thumbnailUrlList,
        ugcPhotos: ugcUrlList,
        highlights: highlightItems
      };
      // Note: if image changed, we'd handle file upload here, but standard PUT skips img update unless refined
      
      const res = await fetch(`${API_BASE}/products/${editingProductId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${getAuthToken()}` 
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Chỉnh sửa thất bại.");
      alert("Đã cập nhật sản phẩm thành công!");
      cancelEdit();
      loadProductsAdmin();
    } catch(err) { 
      alert(err.message); 
    }
  } else {
    addProduct();
  }
}

function cancelEdit() {
  editingProductId = null;
  const banner = document.querySelector('.banner-title');
  if (banner) banner.innerText = "Thêm sản phẩm mới";
  
  const saveBtn = document.querySelector('.product-add-card .btn-primary');
  if (saveBtn) saveBtn.innerText = "Lưu";

  document.getElementById('new-name').value = '';
  document.getElementById('new-price').value = '';
  if(document.getElementById('new-cost')) document.getElementById('new-cost').value = '';
  document.getElementById('new-stock').value = '';
  document.getElementById('new-description').value = '';
  document.getElementById('new-features').value = '';
  resetVariantPickers();
}

async function deleteProduct(id) {
  if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;
  try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
          method: 'DELETE',
          headers: {
              Authorization: `Bearer ${getAuthToken()}`
          }
      });
      if (!res.ok) throw new Error("Xóa thất bại");
      alert("Đã xóa sản phẩm.");
      loadProductsAdmin();
  } catch (err) {
      alert("Lỗi: " + err.message);
  }
}

function toggleRole(name) {
  // Logic này đã được thay thế bởi changeUserRole(userId, newRole)
}

let revenueChartInstance = null;

window.setChartView = function(view) {
    currentChartView = view;
    renderDashboardStats();
};

function renderDashboardStats() {
    const user = getCurrentUser();
    const isSuper = user && user.role === 'super_admin';

    // Toggle visibility of super admin elements
    document.querySelectorAll('.super-admin-only').forEach(el => {
        el.style.display = isSuper ? 'block' : 'none';
        // handle tablerows specifically if needed, but 'block' usually breaks tables
        if (el.tagName === 'TH' || el.tagName === 'TD') el.style.display = isSuper ? 'table-cell' : 'none';
    });

    const totalOrders = ordersAdmin.length;
    let totalRevenue = 0;
    let totalProfit = 0;
    
    // Get fee from settings
    const pkgFee = adminSettings.packagingFee || 5000;

    ordersAdmin.forEach(order => {
        totalRevenue += order.total;
        
        // Calculate Profit for this order
        let orderCost = 0;
        (order.items || []).forEach(it => {
            orderCost += (it.cost || 0) * (it.quantity || 1);
        });
        
        // Profit = Sales - Costs - Operational Fee
        if (order.status === 'completed') {
            totalProfit += (order.total - orderCost - pkgFee);
        }
    });
    
    const totalUsers = usersAdmin.length;
    const totalProducts = products.length;

    // Cập nhật lên thẻ HTML Dashboard
    document.getElementById('stat-revenue').innerText = `${totalRevenue.toLocaleString()} VNĐ`;
    document.getElementById('stat-orders').innerText = `${totalOrders} đơn`;
    document.getElementById('stat-users').innerText = `${totalUsers} người`;
    document.getElementById('stat-products').innerText = `${totalProducts} mặt hàng`;
    
    if (isSuper && document.getElementById('stat-profit')) {
        document.getElementById('stat-profit').innerText = `${totalProfit.toLocaleString()} VNĐ`;
    }

    // Giả lập xu hướng bằng màu sắc động
    const rTrend = document.getElementById('trend-revenue');
    const oTrend = document.getElementById('trend-orders');
    
    if (totalRevenue > 0) { 
        if(rTrend) { rTrend.innerText = '↑ Có doanh thu'; rTrend.className = 'trend positive'; }
        if(oTrend) { oTrend.innerText = '↑ Khách đang mua'; oTrend.className = 'trend positive'; }
    }

    // Khởi tạo Chart bằng Chart.js
    const ctx = document.getElementById('revenueChart');
    if (ctx && typeof Chart !== 'undefined') {
        if (revenueChartInstance) {
            revenueChartInstance.destroy();
        }

        // Prepare data based on view
        const chartLabel = currentChartView === 'revenue' ? 'Doanh thu thực (VNĐ)' : 'Lợi nhuận ròng (VNĐ)';
        const chartData = currentChartView === 'revenue' ? totalRevenue : totalProfit;
        const chartColor = currentChartView === 'revenue' ? '#8da4cd' : '#10b981';
        
        if(document.getElementById('chart-title')) {
            document.getElementById('chart-title').innerText = currentChartView === 'revenue' ? 'Doanh thu theo tháng' : 'Lợi nhuận ròng (Đã trừ phí)';
        }

        // Toggle button active state
        if (isSuper) {
            const btnRev = document.getElementById('toggle-revenue');
            const btnProf = document.getElementById('toggle-profit');
            if (btnRev && btnProf) {
                btnRev.className = currentChartView === 'revenue' ? 'active' : '';
                btnRev.style.background = currentChartView === 'revenue' ? '#3b82f6' : 'transparent';
                btnProf.className = currentChartView === 'profit' ? 'active' : '';
                btnProf.style.background = currentChartView === 'profit' ? '#10b981' : 'transparent';
                btnProf.style.color = currentChartView === 'profit' ? '#fff' : '#888';
            }
        }

        revenueChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Hiện tại'],
                datasets: [{
                    label: chartLabel,
                    data: [0, 0, 0, 0, 0, chartData],
                    backgroundColor: chartColor,
                    borderRadius: 6,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#888' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#888' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

loadProductsAdmin();
loadOrdersAdmin();
loadUsersAdmin();
loadCategoriesAdmin();
initVariantPickers();
loadSettingsAdmin();
// --- SETTINGS LOGIC ---
async function loadSettingsAdmin() {
    try {
        const res = await fetch(`${API_BASE}/settings`);
        const settings = await res.json();
        adminSettings = settings;
        
        document.getElementById('set-store-name').value = settings.storeName || '';
        document.getElementById('set-hotline').value = settings.hotline || '';
        document.getElementById('set-address').value = settings.address || '';
        document.getElementById('set-freeship').value = settings.freeShipThreshold || 0;
        if(document.getElementById('set-packaging-fee')) {
            document.getElementById('set-packaging-fee').value = settings.packagingFee || 5000;
        }
        
        const mainSw = document.getElementById('set-maintenance');
        mainSw.checked = settings.maintenanceMode || false;
        toggleMaintenanceText(mainSw);

        // Payments
        document.getElementById('set-pay-momo').checked = settings.payments?.momo?.enabled || false;
        document.getElementById('set-momo-phone').value = settings.payments?.momo?.phone || '';
        
        document.getElementById('set-pay-bank').checked = settings.payments?.bank?.enabled || false;
        document.getElementById('set-bank-number').value = settings.payments?.bank?.accountNumber || '';
        document.getElementById('set-bank-name').value = settings.payments?.bank?.bankName || 'MB Bank';
        document.getElementById('set-bank-user').value = settings.payments?.bank?.accountName || 'NGUYEN VAN VUNG';
        
        document.getElementById('set-pay-cod').checked = settings.payments?.cod?.enabled || false;
    } catch (err) {
        console.error("Lỗi tải cài đặt:", err);
    }
}

function toggleMaintenanceText(checkbox) {
    const text = document.getElementById('maintenance-text');
    const label = document.getElementById('sys-status-label');
    if (checkbox.checked) {
        text.innerText = "ĐANG BẢO TRÌ";
        text.style.color = "#ef4444";
        label.innerText = "Maintenance";
        label.style.color = "#f59e0b";
    } else {
        text.innerText = "ĐANG HOẠT ĐỘNG";
        text.style.color = "#fff";
        label.innerText = "Online";
        label.style.color = "#10b981";
    }
}

async function saveSettingsAdmin() {
    const settings = {
        storeName: document.getElementById('set-store-name').value.trim(),
        hotline: document.getElementById('set-hotline').value.trim(),
        address: document.getElementById('set-address').value.trim(),
        freeShipThreshold: parseInt(document.getElementById('set-freeship').value),
        packagingFee: document.getElementById('set-packaging-fee') ? parseInt(document.getElementById('set-packaging-fee').value) : (adminSettings.packagingFee || 5000),
        maintenanceMode: document.getElementById('set-maintenance').checked,
        payments: {
            momo: {
                enabled: document.getElementById('set-pay-momo').checked,
                phone: document.getElementById('set-momo-phone').value.trim(),
                label: "Ví MoMo",
                accountName: "NGUYEN VAN VUNG"
            },
            bank: {
                enabled: document.getElementById('set-pay-bank').checked,
                accountNumber: document.getElementById('set-bank-number').value.trim(),
                label: "Chuyển khoản ngân hàng",
                bankName: document.getElementById('set-bank-name').value.trim() || "MB Bank",
                accountName: document.getElementById('set-bank-user').value.trim() || "NGUYEN VAN VUNG"
            },
            cod: {
                enabled: document.getElementById('set-pay-cod').checked,
                label: "Thanh toán khi nhận hàng (COD)"
            }
        }
    };

    try {
        const res = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(settings)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Lỗi lưu cài đặt");

        alert("Thành công: " + data.message);
    } catch (err) {
        alert("Lỗi: " + err.message);
    }
}

function checkSettingsAccess() {
    const user = getCurrentUser();
    const settingsBtn = document.querySelector('[data-section="settings"]');
    if (user && user.username.toLowerCase() !== 'vung1602') {
        if (settingsBtn) settingsBtn.style.display = 'none';
        // Nếu lỡ đang ở tab settings mà không có quyền thì đá về dashboard
        const activeSection = document.querySelector('.admin-section[style*="block"]');
        if (activeSection && activeSection.id === 'settings') {
            switchSection('dashboard', document.querySelector('[data-section="dashboard"]'));
        }
    }
}

// Chạy check quyền khi load
// --- WEBHOOK SIMULATION TOOL ---
async function simulateWebhook(readableId, amount) {
    if (!confirm(`Bạn muốn giả lập tín hiệu ngân hàng báo có tiền cho đơn ${readableId}?`)) return;
    
    try {
        const res = await fetch(`${API_BASE}/payment/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `Thanh toan don ${readableId} vung1602`,
                amount: amount
            })
        });
        const data = await res.json();
        if (res.ok) {
            alert("🚀 [Simulation] " + data.message);
            loadOrdersAdmin();
            if (typeof viewOrder === 'function') viewOrder(activeOrderId);
        } else {
            alert("❌ " + data.message);
        }
    } catch(err) {
        alert("Lỗi kết nối: " + err.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    wakeUpServer(); // Đánh thức server khi vào dashboard
    checkSettingsAccess();
});

