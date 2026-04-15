async function submitProfile() {
    const fullName = document.getElementById("full-name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();

    if (!fullName || !phone || !address) {
        alert("Vui lòng nhập đầy đủ thông tin để tiếp tục.");
        return;
    }

    const btn = document.querySelector(".btn-confirm");
    btn.innerText = "ĐANG XỬ LÝ...";
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/users/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ fullName, phone, address })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Cập nhật thất bại");

        // Update local state
        const currentUser = getCurrentUser();
        currentUser.fullName = data.user.fullName;
        currentUser.phone = data.user.phone;
        currentUser.address = data.user.address;
        currentUser.isProfileComplete = true;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));

        alert("Chúc mừng! Hồ sơ của bạn đã hoàn tất.");
        window.location.href = "index.html";
    } catch (err) {
        console.error(err);
        alert("Có lỗi xảy ra: " + err.message);
        btn.innerText = "XÁC NHẬN & MUA SẮM";
        btn.disabled = false;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    document.getElementById("display-name").innerText = user.username.toUpperCase();
});
