/**
 * infiniware structural engine (v2.2)
 * 100% vanilla js - human made
 */

const API_BASE = '/api/v1';

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollReveals();
    initCopyright();

    // Community Logic
    if (window.location.pathname.includes('community.html')) {
        initCommunity();
    }
});

// --- Navigation & Core UI ---

function initNavigation() {
    const links = document.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    links.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    console.log(`// infiniware system: navigation structural check passed`);
}

function initScrollReveals() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.card, .post-entry, article').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        observer.observe(el);
    });
}

function initCopyright() {
    const footerBottom = document.querySelector('.footer-bottom span');
    if (footerBottom) {
        const year = new Date().getFullYear();
        // keep it lowercase for branding
        footerBottom.textContent = `infiniware © ${year}`;
    }
}

// --- Community & Auth Logic ---

async function initCommunity() {
    const githubBtn = document.getElementById('btn-github-login');
    const loginForm = document.getElementById('email-login-form');
    const signupForm = document.getElementById('email-signup-form');
    const logoutBtn = document.getElementById('btn-logout');
    const deleteBtn = document.getElementById('btn-delete-account');
    const postForm = document.getElementById('post-creation-form');

    const toggleSignInBtn = document.getElementById('toggle-signin');
    const toggleSignUpBtn = document.getElementById('toggle-signup');

    // 1. Check Auth Status
    await checkAuth();

    // 2. Initial Fetch
    fetchPosts();

    // 3. UI Toggles
    if (toggleSignInBtn && toggleSignUpBtn) {
        toggleSignInBtn.addEventListener('click', () => {
            loginForm.style.display = 'flex';
            signupForm.style.display = 'none';
            toggleSignInBtn.classList.add('active');
            toggleSignUpBtn.classList.remove('active');
        });

        toggleSignUpBtn.addEventListener('click', () => {
            loginForm.style.display = 'none';
            signupForm.style.display = 'flex';
            toggleSignInBtn.classList.remove('active');
            toggleSignUpBtn.classList.add('active');
        });
    }

    // 4. Event Listeners
    if (githubBtn) {
        githubBtn.addEventListener('click', () => {
            window.location.href = `${API_BASE}/auth/github`;
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.email.value;
            const password = loginForm.password.value;

            try {
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error);

                window.location.href = '/welcome.html?source=email';
            } catch (err) {
                alert(`auth failure: ${err.message}`);
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = signupForm.username.value;
            const email = signupForm.email.value;
            const password = signupForm.password.value;

            try {
                const res = await fetch(`${API_BASE}/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error);

                alert('account initialized. you can now sign in.');
                toggleSignInBtn.click();
            } catch (err) {
                alert(`initialization failure: ${err.message}`);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
            window.location.reload();
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (confirm('permanently delete account and all structural data?')) {
                await fetch(`${API_BASE}/auth/me`, { method: 'DELETE' });
                window.location.reload();
            }
        });
    }

    if (postForm) {
        postForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const content = document.getElementById('post-content').value;
            try {
                const res = await fetch(`${API_BASE}/community/posts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error);

                document.getElementById('post-content').value = '';
                fetchPosts();
            } catch (err) {
                alert(`guardian alert: ${err.message}`);
            }
        });
    }
}

async function checkAuth() {
    const authSection = document.getElementById('auth-section');
    const userSection = document.getElementById('user-profile-section');
    const displayUsername = document.getElementById('display-username');
    const displayAvatar = document.getElementById('display-avatar');

    try {
        const res = await fetch(`${API_BASE}/auth/me`);
        if (res.ok) {
            const user = await res.json();
            authSection.style.display = 'none';
            userSection.style.display = 'block';
            displayUsername.textContent = user.username;

            if (displayAvatar && user.avatar_url) {
                displayAvatar.innerHTML = `<img src="${user.avatar_url}" style="width:100%; border-radius: 2px;">`;
            }
            return user;
        } else {
            authSection.style.display = 'block';
            userSection.style.display = 'none';
        }
    } catch (err) {
        authSection.style.display = 'block';
        userSection.style.display = 'none';
    }
}

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/community/posts`);
        const posts = await res.json();

        if (posts.length === 0) {
            container.innerHTML = '<p class="text-dim">no posts yet. be the first to contribute.</p>';
            return;
        }

        container.innerHTML = posts.map(post => `
            <div class="post-card" style="border-bottom: 1px solid #111; padding: 30px 0;">
                <div class="user-block" style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <div style="width: 32px; height: 32px; background: #222; border: 1px solid #333; overflow: hidden;">
                        ${post.avatar_url ? `<img src="${post.avatar_url}" style="width:100%;">` : ''}
                    </div>
                    <div>
                        <span class="user-name" style="display: block; font-weight: 700;">${post.username}</span>
                        <span style="font-size: 0.7rem; color: #444;">${formatTime(post.created_at)}</span>
                    </div>
                </div>
                <p style="color: #aaa; line-height: 1.7;">${post.content}</p>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = '<p class="text-dim">failed to fetch structural feed.</p>';
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).toLowerCase();
}
