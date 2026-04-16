/**
 * Logic xử lý cho giao diện Admin trên Mobile
 */

function toggleAdminSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    const overlay = document.getElementById('admin-overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
        
        // Ngăn cuộn trang khi mở menu
        if (sidebar.classList.contains('open')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

// Tự động đóng sidebar khi bấm vào một mục menu (trên mobile)
document.addEventListener('DOMContentLoaded', () => {
    const menuButtons = document.querySelectorAll('.admin-menu button');
    menuButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.innerWidth <= 900) {
                toggleAdminSidebar();
            }
        });
    });
    
    // Cập nhật tiêu đề section trong header
    const sectionMap = {
        'dashboard': { title: 'Dashboard', sub: 'Quản lý sản phẩm, đơn hàng và người dùng.' },
        'products': { title: 'Sản phẩm', sub: 'Danh sách và kho hàng sản phẩm.' },
        'categories': { title: 'Danh mục', sub: 'Phân loại các nhóm hàng hóa.' },
        'orders': { title: 'Đơn hàng', sub: 'Theo dõi và xử lý đơn hàng.' },
        'users': { title: 'Người dùng', sub: 'Phân quyền và quản lý tài khoản.' },
        'vouchers': { title: 'Mã giảm giá', sub: 'Chương trình khuyến mãi toàn cục.' },
        'settings': { title: 'Cài đặt', sub: 'Cấu hình hệ thống và thanh toán.' }
    };
    
    // Lưu hàm gốc của switchSection để thêm logic đổi tiêu đề
    const originalSwitchSection = window.switchSection;
    window.switchSection = function(section, btn) {
        originalSwitchSection(section, btn);
        
        const titleEl = document.getElementById('admin-section-title');
        const subEl = document.getElementById('admin-section-subtitle');
        
        if (sectionMap[section] && titleEl && subEl) {
            titleEl.innerText = sectionMap[section].title;
            subEl.innerText = sectionMap[section].sub;
        }
    };
});
