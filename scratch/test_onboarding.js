const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5001/api';

async function testOnboardingFlow() {
    const testUser = {
        username: 'testuser_' + Date.now(),
        password: 'password123',
        email: 'test@example.com'
    };

    console.log('1. Registering new user...');
    let res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
    });
    let data = await res.json();
    console.log('Register Response:', data);

    if (data.isProfileComplete !== false) {
        console.error('FAIL: New user should have isProfileComplete: false');
        return;
    }

    console.log('2. Logging in...');
    res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUser.username, password: testUser.password })
    });
    data = await res.json();
    const token = data.token;
    console.log('Login Response: isProfileComplete =', data.isProfileComplete);

    console.log('3. Updating profile (Onboarding)...');
    res = await fetch(`${API_BASE}/users/profile`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            fullName: 'Test User Full name',
            phone: '0987654321',
            address: '123 Test Street, New York'
        })
    });
    data = await res.json();
    console.log('Profile Update Response:', data);

    if (data.user.fullName === 'Test User Full name' && data.message.includes('success')) {
        console.log('SUCCESS: Onboarding flow works on the backend!');
    } else {
        console.log('FAIL: Profile update did not reflect changes.');
    }
}

testOnboardingFlow();
