// API_BASE is declared in auth.js

function goHome() {
    window.location.href = "index.html";
}

function toggleQR(orderId) {
    const el = document.getElementById(`qr-${orderId}`);
    if (el) {
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
}

async function loadOrderHistory() {
    checkLogin();
    try {
        const token = getAuthToken();
        const res = await fetch(`${API_BASE}/orders/my`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const data = await res.json();

        const container = document.getElementById("orders-list");
        if (!res.ok) {
            container.innerHTML = `<div class="empty-state"><p>${data.message || 'Không thể tải lịch sử đơn hàng.'}</p></div>`;
            return;
        }

        if (!data.length) {
            container.innerHTML = `<div class="empty-state"><p>Bạn chưa có đơn hàng nào.</p></div>`;
            return;
        }

        container.innerHTML = data.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <h3>Đơn #${order._id.slice(-6).toUpperCase()}</h3>
                        <p>${new Date(order.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                    </div>
                    <span class="status-pill status-${order.status || 'pending'}">${order.status === 'completed' ? 'Thành công' : order.status === 'shipping' ? 'Đang giao' : 'Chờ xử lý'}</span>
                </div>
                <div class="order-summary">
                    <p>Sản phẩm: ${order.items.length}</p>
                    <p>Tổng: ${order.total.toLocaleString()} VNĐ</p>
                </div>
                <div class="order-footer">
                   ${order.status === 'pending' || !order.status ? 
                    `<button class="btn-primary" onclick="toggleQR('${order._id}')">💳 Thanh toán ngay</button>` : ''}
                </div>
                <div id="qr-${order._id}" class="qr-payment-box" style="display:none; text-align:center; padding: 20px 0;">
                    <p style="margin-bottom:10px; font-weight:600;">Quét mã VietQR để thanh toán</p>
                    <img src="${order.paymentQR}" alt="VietQR" style="max-width:240px; border-radius:12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                    <p style="font-size: 0.8rem; color: #666; margin-top:10px;">Chủ TK: NGUYEN VAN VUNG | STK: 100872584135</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error(error);
        document.getElementById("orders-list").innerHTML = `<div class="empty-state"><p>Lỗi tải dữ liệu. Vui lòng thử lại.</p></div>`;
    }
}

loadOrderHistory();
