/**
 * dashboard.js — Infiniware Community Dashboard
 * Fetches discussions from GitHub Issues API (Utterances backend)
 * Settings handled via Firebase
 */

import { auth, db, storage } from './firebase-init.js';
import { initAuthListener, logout } from './auth.js';
import {
    doc, getDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import {
    ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js";

// Config
const GITHUB_REPO = 'FDJTS/Infiniware11';
const ISSUES_API = `https://api.github.com/repos/${GITHUB_REPO}/issues`;
const COLLECTION_USERS = 'users';

// DOM
const dashLoading = document.getElementById('dash-loading');
const dashContent = document.getElementById('dash-content');
const userAvatar = document.getElementById('user-avatar');
const userInitial = document.getElementById('user-initial');
const userGreeting = document.getElementById('user-greeting');
const userEmail = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const settingsToggle = document.getElementById('settings-toggle');
const settingsPanel = document.getElementById('settings-panel');
const settingsClose = document.getElementById('settings-close');
const settingsForm = document.getElementById('settings-form');
const settingsMsg = document.getElementById('settings-msg');
const issuesFeed = document.getElementById('issues-feed');
const feedEmpty = document.getElementById('feed-empty');
const feedError = document.getElementById('feed-error');
const retryBtn = document.getElementById('retry-btn');

let currentUser = null;

// ─── Auth ────────────────────────────────────────────────────────────────────

initAuthListener(async (user) => {
    if (!user) {
        window.location.href = 'signin.html';
        return;
    }
    if (!user.emailVerified) {
        window.location.href = 'verify-email.html';
        return;
    }
    currentUser = user;
    await initDashboard(user);
});

async function initDashboard(user) {
    // Check ban status
    if (typeof checkGuardianBan === 'function') {
        const isBanned = await checkGuardianBan(user);
        if (isBanned) {
            document.getElementById('banned-overlay').style.display = 'flex';
            dashLoading.style.display = 'none';
            return;
        }
    }

    // Load user info
    await loadUserBar(user);

    // Show content
    dashLoading.style.display = 'none';
    dashContent.style.display = 'block';

    // Fetch discussions
    await loadDiscussions();
}

// ─── User Bar ────────────────────────────────────────────────────────────────

async function loadUserBar(user) {
    // Set email
    userEmail.textContent = user.email;

    // Get profile from Firestore
    try {
        const userDoc = await getDoc(doc(db, COLLECTION_USERS, user.uid));
        const data = userDoc.exists() ? userDoc.data() : {};
        const username = data.username || user.displayName || user.email.split('@')[0];

        userGreeting.textContent = `hello, ${username}`;

        if (data.avatar_url) {
            userAvatar.innerHTML = `<img src="${data.avatar_url}" alt="avatar" class="user-bar-avatar-img">`;
        } else {
            userInitial.textContent = username[0].toUpperCase();
        }

        // Pre-fill settings
        document.getElementById('set-username').value = data.username || '';
        document.getElementById('set-bio').value = data.bio || '';
        document.getElementById('set-location').value = data.location || '';
        document.getElementById('set-website').value = data.website || '';
    } catch (err) {
        console.error('Failed to load profile:', err);
        userGreeting.textContent = `hello, ${user.email.split('@')[0]}`;
        userInitial.textContent = user.email[0].toUpperCase();
    }
}

// ─── Settings ────────────────────────────────────────────────────────────────

settingsToggle.addEventListener('click', () => {
    const isOpen = settingsPanel.style.display !== 'none';
    settingsPanel.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) settingsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

settingsClose.addEventListener('click', () => {
    settingsPanel.style.display = 'none';
});

settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-settings-btn');
    btn.textContent = 'saving...';
    btn.disabled = true;
    settingsMsg.textContent = '';

    try {
        const updates = {
            username: document.getElementById('set-username').value.trim().toLowerCase(),
            bio: document.getElementById('set-bio').value.trim(),
            location: document.getElementById('set-location').value.trim(),
            website: document.getElementById('set-website').value.trim(),
            updated_at: serverTimestamp()
        };

        // Handle avatar upload
        const avatarFile = document.getElementById('set-avatar').files[0];
        if (avatarFile) {
            const storageRef = ref(storage, `avatars/${currentUser.uid}/${Date.now()}_${avatarFile.name}`);
            await uploadBytes(storageRef, avatarFile);
            updates.avatar_url = await getDownloadURL(storageRef);
        }

        await updateDoc(doc(db, COLLECTION_USERS, currentUser.uid), updates);

        settingsMsg.textContent = 'saved!';
        settingsMsg.className = 'text-green';

        // Refresh user bar
        await loadUserBar(currentUser);

        setTimeout(() => {
            settingsMsg.textContent = '';
        }, 3000);
    } catch (err) {
        console.error('Failed to save settings:', err);
        settingsMsg.textContent = 'failed to save. try again.';
        settingsMsg.className = 'text-red';
    } finally {
        btn.textContent = 'save changes';
        btn.disabled = false;
    }
});

// ─── GitHub Issues Feed ──────────────────────────────────────────────────────

async function loadDiscussions() {
    issuesFeed.innerHTML = '<div class="loading-spinner"></div>';
    feedEmpty.style.display = 'none';
    feedError.style.display = 'none';

    try {
        const res = await fetch(`${ISSUES_API}?state=open&sort=updated&direction=desc&per_page=30`, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });

        if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);

        const issues = await res.json();

        // Filter out pull requests
        const discussions = issues.filter(i => !i.pull_request);

        if (discussions.length === 0) {
            issuesFeed.innerHTML = '';
            feedEmpty.style.display = 'block';
            return;
        }

        issuesFeed.innerHTML = '';
        discussions.forEach(issue => {
            issuesFeed.appendChild(createIssueCard(issue));
        });

    } catch (err) {
        console.error('Failed to load discussions:', err);
        issuesFeed.innerHTML = '';
        feedError.style.display = 'block';
    }
}

function createIssueCard(issue) {
    const card = document.createElement('a');
    card.className = 'issue-card';
    card.href = issue.html_url;
    card.target = '_blank';
    card.rel = 'noopener';

    const date = new Date(issue.updated_at);
    const timeAgo = getTimeAgo(date);

    const labelsHtml = issue.labels.map(l =>
        `<span class="label-tag" style="background: #${l.color}20; color: #${l.color}; border: 1px solid #${l.color}40;">${escapeHtml(l.name)}</span>`
    ).join('');

    card.innerHTML = `
        <div class="issue-card-inner">
            <div class="issue-avatar">
                <img src="${issue.user.avatar_url}" alt="${escapeHtml(issue.user.login)}" loading="lazy">
            </div>
            <div class="issue-body">
                <div class="issue-title">${escapeHtml(issue.title)}</div>
                <div class="issue-meta">
                    <span class="text-white" style="font-weight: 500;">${escapeHtml(issue.user.login)}</span>
                    <span class="issue-dot">·</span>
                    <span>${timeAgo}</span>
                    <span class="issue-dot">·</span>
                    <span>${issue.comments} ${issue.comments === 1 ? 'comment' : 'comments'}</span>
                </div>
                ${labelsHtml ? `<div class="issue-labels">${labelsHtml}</div>` : ''}
            </div>
            <div class="issue-arrow">→</div>
        </div>
    `;

    return card;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function getTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// ─── Event Listeners ─────────────────────────────────────────────────────────

logoutBtn.addEventListener('click', () => logout());

if (retryBtn) {
    retryBtn.addEventListener('click', () => loadDiscussions());
}
