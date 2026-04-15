// API_BASE logic để hỗ trợ cả Local và Production (Google/Vercel)
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "https://shopthoitrang-backend.onrender.com/api"; // Thay link này khi bạn deploy backend thực tế

async function register() {
    const mode = document.body.dataset.authMode || 'login';
    const username = mode === 'register'
        ? document.getElementById("register-user").value.trim()
        : document.getElementById("user").value.trim();

    const password = mode === 'register'
        ? document.getElementById("register-pass").value
        : document.getElementById("pass").value;

    const confirmPassword = document.getElementById("confirm-pass")?.value;

    if (!username || !password) {
        alert("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
        return;
    }

    if (mode === 'register' && confirmPassword !== undefined && password !== confirmPassword) {
        alert("Mật khẩu xác nhận không khớp.");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "Đăng ký thất bại.");
            return;
        }

        alert("Đăng ký thành công! Vui lòng đăng nhập.");
        const loginTab = document.querySelector('[data-mode="login"]');
        if (loginTab) loginTab.click();
    } catch (error) {
        console.error(error);
        alert("Lỗi kết nối server. Vui lòng thử lại.");
    }
}

async function login() {
    const username = document.getElementById("user").value.trim();
    const password = document.getElementById("pass").value;

    if (!username || !password) {
        alert("Vui lòng nhập tên đăng nhập và mật khẩu.");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "Đăng nhập thất bại.");
            return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("currentUser", JSON.stringify({ username, role: data.role }));
        localStorage.setItem("isLogin", "true");

        handleAuthRedirect(data);
    } catch (error) {
        console.error(error);
        alert("Lỗi kết nối server. Vui lòng thử lại.");
    }
}

function handleAuthRedirect(data) {
    if (data.isProfileComplete === false) {
        window.location.href = "onboarding.html";
        return;
    }

    if (data.role === "admin" || data.role === "super_admin") {
        window.location.href = "admin.html";
    } else {
        window.location.href = "index.html";
    }
}

function logout() {
    localStorage.removeItem("isLogin");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    window.location.href = "login.html";
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem("currentUser"));
}

function getAuthToken() {
    return localStorage.getItem("token");
}

function checkLogin() {
    if (!localStorage.getItem("isLogin") || !getAuthToken()) {
        window.location.href = "login.html";
    }
}

function checkRole() {
    const user = getCurrentUser();
    const isStaff = user && (user.role === 'admin' || user.role === 'super_admin');
    if (!isStaff) {
        window.location.href = "login.html";
    }
}

// ============================================
// REAL FIREBASE SOCIAL LOGIN
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyD5r8FyO0KwbGABgRHrNWnQqabC_aE2QN4",
    authDomain: "shopthoitrang-8378a.firebaseapp.com",
    projectId: "shopthoitrang-8378a",
    storageBucket: "shopthoitrang-8378a.firebasestorage.app",
    messagingSenderId: "354567330777",
    appId: "1:354567330777:web:15eae99b1c1b9c6480d7c8",
    measurementId: "G-FJ94R31TH8"
};

// Khởi tạo Firebase (chỉ nếu thư viện đã được load)
if (typeof firebase !== 'undefined') {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
    } catch (e) {
        console.error("Firebase init error:", e);
    }
}

async function socialLogin(providerName) {
    try {
        if (typeof firebase === 'undefined') {
            alert("Thư viện Firebase chưa được tải. Tính năng này chỉ dùng trên trang có mạng internet và kịch bản đã lưu.");
            return;
        }

        if (typeof firebase.auth !== 'function') {
            alert("Thư viện Firebase Auth chưa tải xong hoặc bị chặn.");
            return;
        }

        const auth = firebase.auth();
        let provider;

        if (providerName === 'google') {
            provider = new firebase.auth.GoogleAuthProvider();
        } else if (providerName === 'facebook') {
            provider = new firebase.auth.FacebookAuthProvider();
        }

        console.log(`Đang mở popup đăng nhập ${providerName}...`);
        const result = await auth.signInWithPopup(provider);
        const user = result.user;

        console.log("Firebase Auth thành công:", user.email);

        // Gửi thông tin user thật về Backend Node.js của chúng ta
        const firebaseUserObj = {
            email: user.email,
            displayName: user.displayName,
            provider: providerName
        };

        const res = await fetch(`${API_BASE}/auth/social-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(firebaseUserObj)
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "Đăng nhập Backend thất bại.");
            return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("currentUser", JSON.stringify({ username: data.username, role: data.role }));
        localStorage.setItem("isLogin", "true");

        handleAuthRedirect(data);

    } catch (error) {
        console.error("Lỗi Firebase Auth:", error);
        if (error.code === 'auth/operation-not-allowed') {
            alert(`Lỗi: Bạn chưa bật phương thức đăng nhập ${providerName} trên Firebase Console. Vui lòng bật nó lên!`);
        } else if (error.code === 'auth/popup-closed-by-user') {
            console.log("Người dùng tắt popup.");
        } else {
            alert("Lỗi kết nối khi đăng nhập Mạng Xã Hội: " + error.message);
        }
    }
}
