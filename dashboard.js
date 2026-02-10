/**
 * dashboard.js — Infiniware Community Dashboard
 * Fetches discussions from GitHub Issues API (Utterances backend)
 * Settings handled via Firebase
 */

import { auth, db, storage, githubProvider } from './firebase-init.js';
import { initAuthListener, logout, signInWithGithub } from './auth.js';
import {
    doc, getDoc, setDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import {
    ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js";
import { linkWithPopup, GithubAuthProvider } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";

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

// New Modal DOM
const newDiscussionBtn = document.getElementById('new-discussion-btn');
const newDiscussionModal = document.getElementById('new-discussion-modal');
const closeDiscussionModal = document.getElementById('close-discussion-modal');
const newDiscussionForm = document.getElementById('new-discussion-form');
const discussionTitle = document.getElementById('discussion-title');
const discussionBody = document.getElementById('discussion-body');
const submitDiscussionBtn = document.getElementById('submit-discussion-btn');
const discussionMsg = document.getElementById('discussion-msg');

let currentUser = null;
let githubToken = sessionStorage.getItem('gh_token'); // Try to restore from session

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

    // Show content immediately (optimistic render)
    dashLoading.style.display = 'none';
    dashContent.style.display = 'block';

    // Load data in parallel (non-blocking)
    loadUserBar(user);
    loadDiscussions();
}

// ─── User Bar ────────────────────────────────────────────────────────────────

async function loadUserBar(user) {
    userEmail.textContent = user.email;

    try {
        const userDoc = await getDoc(doc(db, COLLECTION_USERS, user.uid));
        const data = userDoc.exists() ? userDoc.data() : {};

        // Prioritize: Firestore username > Auth displayName > Email handle
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
        const fallbackName = user.email.split('@')[0];
        userGreeting.textContent = `hello, ${fallbackName}`;
        userInitial.textContent = fallbackName[0].toUpperCase();
    }
}

// ─── Settings ────────────────────────────────────────────────────────────────

// ─── Settings ────────────────────────────────────────────────────────────────

settingsToggle.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent triggering the profile click
    const isOpen = settingsPanel.style.display !== 'none';
    settingsPanel.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) settingsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

settingsClose.addEventListener('click', () => {
    settingsPanel.style.display = 'none';
});

// Navigate to Profile on User Bar Click
document.querySelector('.user-bar').addEventListener('click', (e) => {
    // Don't trigger if clicking buttons inside the bar
    if (e.target.closest('button') || e.target.closest('a')) return;

    if (currentUser && currentUser.uid) {
        window.open(`profile.html?uid=${currentUser.uid}`, '_blank');
    }
});

settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-settings-btn');
    btn.textContent = 'saving...';
    btn.disabled = true;
    settingsMsg.textContent = 'uploading & saving...';
    settingsMsg.className = 'text-dim';

    console.log("Starting profile save...");

    // Create a timeout promise
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out. Check your connection.")), 15000)
    );

    const saveOperation = async () => {
        const updates = {
            uid: currentUser.uid,
            email: currentUser.email || '', // Fallback if email is private/null
            username: document.getElementById('set-username').value.trim().toLowerCase() || currentUser.displayName || 'user',
            bio: document.getElementById('set-bio').value.trim(),
            location: document.getElementById('set-location').value.trim(),
            website: document.getElementById('set-website').value.trim(),
            updated_at: serverTimestamp()
        };

        console.log("Updates prepared:", updates);

        const avatarFile = document.getElementById('set-avatar').files[0];
        if (avatarFile) {
            console.log("Avatar selected, uploading...");
            try {
                // Path must match storage.rules: /users/{userId}/avatar/{fileName}
                const storageRef = ref(storage, `users/${currentUser.uid}/avatar/${Date.now()}_${avatarFile.name}`);
                await uploadBytes(storageRef, avatarFile);
                updates.avatar_url = await getDownloadURL(storageRef);
                console.log("Avatar uploaded, URL:", updates.avatar_url);
            } catch (uploadErr) {
                console.error("Avatar upload failed:", uploadErr);
                throw new Error("Failed to upload image. " + uploadErr.message);
            }
        }

        console.log("Writing to Firestore...");
        await setDoc(doc(db, COLLECTION_USERS, currentUser.uid), updates, { merge: true });
        console.log("Firestore write complete.");
    };

    try {
        // Race the save operation against the timeout
        await Promise.race([saveOperation(), timeout]);

        settingsMsg.textContent = 'saved!';
        settingsMsg.className = 'text-green';

        await loadUserBar(currentUser);

        setTimeout(() => {
            if (settingsMsg.textContent === 'saved!') settingsMsg.textContent = '';
        }, 3000);
    } catch (err) {
        console.error('Failed to save settings:', err);
        settingsMsg.textContent = `failed: ${err.message}`;
        settingsMsg.className = 'text-red';
    } finally {
        btn.textContent = 'save changes';
        btn.disabled = false;
    }
});

// ─── New Discussion Modal ────────────────────────────────────────────────────

if (newDiscussionBtn) {
    newDiscussionBtn.addEventListener('click', () => {
        newDiscussionModal.style.display = 'flex';
        discussionTitle.focus();
    });
}

if (closeDiscussionModal) {
    closeDiscussionModal.addEventListener('click', () => {
        newDiscussionModal.style.display = 'none';
    });
}

// Close on outside click
window.addEventListener('click', (e) => {
    if (e.target === newDiscussionModal) {
        newDiscussionModal.style.display = 'none';
    }
});

// Capture token on sign-in/up (if user just logged in via github)
// Note: This only works if we redirect from the sign-in page, but normally we are already here.
// Best approach: verify token presence when user tries to post.

newDiscussionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    discussionMsg.textContent = '';
    discussionMsg.className = 'text-dim';
    submitDiscussionBtn.disabled = true;
    submitDiscussionBtn.textContent = 'posting...';

    const title = discussionTitle.value.trim();
    const body = discussionBody.value.trim();

    if (!title || !body) {
        discussionMsg.textContent = 'please fill in all fields.';
        discussionMsg.className = 'text-red';
        submitDiscussionBtn.disabled = false;
        submitDiscussionBtn.textContent = 'post discussion';
        return;
    }

    try {
        await createGitHubIssue(title, body);

        // Success
        discussionMsg.textContent = 'posted successfully!';
        discussionMsg.className = 'text-green';
        discussionTitle.value = '';
        discussionBody.value = '';

        // Refresh feed
        loadDiscussions();

        setTimeout(() => {
            newDiscussionModal.style.display = 'none';
            discussionMsg.textContent = '';
            submitDiscussionBtn.textContent = 'post discussion';
            submitDiscussionBtn.disabled = false;
        }, 1500);

    } catch (error) {
        console.error("Post Error:", error);
        discussionMsg.textContent = `failed: ${error.message}`;
        discussionMsg.className = 'text-red';
        submitDiscussionBtn.textContent = 'post discussion';
        submitDiscussionBtn.disabled = false;
    }
});

async function createGitHubIssue(title, body, retryWithAuth = true) {
    if (!githubToken) {
        if (retryWithAuth) {
            discussionMsg.textContent = 'authorizing with github...';
            await authorizeGitHub();
            return createGitHubIssue(title, body, false);
        }
        throw new Error("GitHub authorization required.");
    }

    const res = await fetch(ISSUES_API, {
        method: 'POST',
        headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, body })
    });

    if (res.status === 401) {
        // Token expired or invalid
        if (retryWithAuth) {
            discussionMsg.textContent = 're-authorizing...';
            githubToken = null;
            sessionStorage.removeItem('gh_token');
            await authorizeGitHub();
            return createGitHubIssue(title, body, false);
        }
    }

    if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || `GitHub Error ${res.status}`);
    }

    return await res.json();
}

async function authorizeGitHub() {
    console.log("Authorizing with GitHub...");
    try {
        const result = await signInWithGithub();
        const credential = GithubAuthProvider.credentialFromResult(result);
        if (credential && credential.accessToken) {
            githubToken = credential.accessToken;
            sessionStorage.setItem('gh_token', githubToken);
            return githubToken;
        }
        throw new Error("No access token received.");
    } catch (err) {
        console.error("GitHub Auth Error:", err);
        if (err.code === 'auth/popup-blocked') {
            throw new Error("Popup blocked! Allow popups for this site.");
        }
        if (err.code === 'auth/unauthorized-domain') {
            throw new Error("Domain not authorized. Add it in Firebase Console > Auth > Settings.");
        }
        throw new Error("GitHub auth failed: " + err.message);
    }
}


// ─── GitHub Issues Feed ──────────────────────────────────────────────────────

async function loadDiscussions() {
    // Show spinner if empty, otherwise keep old content while refreshing
    if (issuesFeed.innerHTML.trim() === '') {
        issuesFeed.innerHTML = '<div class="loading-spinner"></div>';
    }
    feedEmpty.style.display = 'none';
    feedError.style.display = 'none';

    try {
        const res = await fetch(`${ISSUES_API}?state=open&sort=updated&direction=desc&per_page=30`, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });

        if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);

        const issues = await res.json();

        // Filter out PRs
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
        // Only show error if we have no content
        if (issuesFeed.children.length === 0 || issuesFeed.querySelector('.loading-spinner')) {
            issuesFeed.innerHTML = '';
            feedError.style.display = 'block';
        }
    }
}

function createIssueCard(issue) {
    const card = document.createElement('a');
    card.className = 'issue-card';
    card.href = issue.html_url; // Still opens in GitHub for viewing/commenting
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

logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('gh_token');
    logout();
});

if (retryBtn) {
    retryBtn.addEventListener('click', () => loadDiscussions());
}
