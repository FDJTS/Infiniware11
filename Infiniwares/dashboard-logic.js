/**
 * Dashboard Main Logic - Navigation and user header
 * Tab-specific logic is in separate files: dashboard-feed.js, dashboard-profile.js, dashboard-settings.js
 */

import { auth } from './firebase-init.js';
import { initAuthListener, logout } from './auth.js';
import { getUserProfile } from './community.js';
import { initFeedTab, cleanupFeedTab } from './dashboard-feed.js';
import { initProfileTab } from './dashboard-profile.js';
import { initSettingsTab } from './dashboard-settings.js';

// DOM Elements
const navFeed = document.getElementById('nav-feed');
const navProfile = document.getElementById('nav-profile');
const navSettings = document.getElementById('nav-settings');
const logoutBtn = document.getElementById('logout-btn');
const viewFeed = document.getElementById('view-feed');
const viewProfile = document.getElementById('view-profile');
const viewSettings = document.getElementById('view-settings');
const userDisplay = document.getElementById('user-display');
const welcomeMsg = document.getElementById('welcome-msg');
const currentUserAvatar = document.getElementById('current-user-avatar');

let currentUser = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initAuthListener((user) => {
        if (user) {
            if (!user.emailVerified) {
                window.location.href = 'verify-email.html';
                return;
            }
            initDashboard(user);
        } else {
            window.location.href = 'signin.html';
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => logout());
    }
});

async function initDashboard(user) {
    currentUser = user;
    
    // Check Guardian Status (if guardian.js exists)
    if (typeof checkGuardianBan === 'function') {
        const isBanned = await checkGuardianBan(user);
        if (isBanned) {
            document.getElementById('banned-overlay').style.display = 'flex';
            return;
        }
    }

    // Load user profile in header
    await loadUserProfile(user.uid);
    
    // Setup navigation
    setupNavigation(user);
    
    // Initialize feed tab by default
    if (viewFeed) {
        initFeedTab(user);
    }
}

function setupNavigation(user) {
    const views = {
        'nav-feed': viewFeed,
        'nav-profile': viewProfile,
        'nav-settings': viewSettings
    };

    [navFeed, navProfile, navSettings].forEach(nav => {
        if (!nav) return;
        nav.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Reset active states
            document.querySelectorAll('.nav-link').forEach(link => {
                if (link.id !== 'logout-btn') {
                    link.classList.remove('active');
                }
            });
            Object.values(views).forEach(v => {
                if (v) v.style.display = 'none';
            });

            // Set active
            nav.classList.add('active');
            const targetView = views[nav.id];
            if (targetView) {
                targetView.style.display = 'block';
            }

            // Initialize tab-specific logic
            if (nav.id === 'nav-feed') {
                cleanupFeedTab(); // Cleanup previous subscriptions
                initFeedTab(user);
            } else if (nav.id === 'nav-profile') {
                initProfileTab(user);
            } else if (nav.id === 'nav-settings') {
                initSettingsTab(user);
            }
        });
    });
}


async function loadUserProfile(uid) {
    try {
        const { getUserProfile } = await import('./community.js');
        const profile = await getUserProfile(uid);
        
        if (profile) {
            if (userDisplay) userDisplay.textContent = profile.username || "user";
            if (welcomeMsg) welcomeMsg.textContent = `welcome back, ${profile.username || "user"}.`;
            
            if (currentUserAvatar) {
                if (profile.avatar_url) {
                    currentUserAvatar.innerHTML = `<img src="${profile.avatar_url}" style="width:100%; height:100%; object-fit:cover;">`;
                } else {
                    const initial = (profile.username || 'U')[0].toUpperCase();
                    currentUserAvatar.innerHTML = `<span style="opacity:0.5; font-size:1.2rem;">${initial}</span>`;
                }
            }
        }
    } catch (error) {
        console.error("Error loading user profile:", error);
    }
}

