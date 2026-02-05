/**
 * infiniware structural engine (v3.0)
 * 100% vanilla js - firebase edition
 */

// Firebase Configuration (User must replace with their own config)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase (Check if script is loaded first)
let app, auth, db;
if (typeof firebase !== 'undefined') {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
}

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
        footerBottom.textContent = `infiniware © ${year}`;
    }
}

// --- Community & Firebase Auth Logic ---

async function initCommunity() {
    const loginForm = document.getElementById('email-login-form');
    const signupForm = document.getElementById('email-signup-form');
    const logoutBtn = document.getElementById('btn-logout');
    const deleteBtn = document.getElementById('btn-delete-account');
    const postForm = document.getElementById('post-creation-form');

    const toggleSignInBtn = document.getElementById('toggle-signin');
    const toggleSignUpBtn = document.getElementById('toggle-signup');

    if (!auth || !db) {
        console.error("Firebase not initialized correctly.");
        return;
    }

    // 1. Check Auth Status (Real-time)
    auth.onAuthStateChanged(user => {
        updateAuthUI(user);
        if (user) {
            checkBanStatus(user.uid);
            listenForPosts();
        }
    });

    // 2. UI Toggles
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

    // 3. Event Listeners
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.email.value;
            const password = loginForm.password.value;

            try {
                await auth.signInWithEmailAndPassword(email, password);
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
                const credential = await auth.createUserWithEmailAndPassword(email, password);
                const user = credential.user;

                // Save profile details to Firestore
                await db.collection('users').doc(user.uid).set({
                    username: username,
                    email: email,
                    isBanned: false,
                    role: 'user',
                    created_at: firebase.firestore.FieldValue.serverTimestamp()
                });

                alert('account initialized. welcome to infiniware.');
            } catch (err) {
                alert(`initialization failure: ${err.message}`);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut();
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (confirm('permanently delete account and all structural data?')) {
                const user = auth.currentUser;
                // Note: Real deletion would require re-authentication or a cloud function
                // for this shim, we'll just delete the firestore doc and user
                await db.collection('users').doc(user.uid).delete();
                await user.delete();
                window.location.reload();
            }
        });
    }

    if (postForm) {
        postForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const content = document.getElementById('post-content').value;
            const user = auth.currentUser;

            if (!user) return alert("auth required.");

            try {
                // Check if user is banned before posting (double check)
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.data()?.isBanned) throw new Error("this account is banned from posting.");

                await db.collection('posts').add({
                    uid: user.uid,
                    username: userDoc.data().username,
                    content: content,
                    created_at: firebase.firestore.FieldValue.serverTimestamp()
                });

                document.getElementById('post-content').value = '';
            } catch (err) {
                alert(`guardian alert: ${err.message}`);
            }
        });
    }
}

function updateAuthUI(user) {
    const authSection = document.getElementById('auth-section');
    const userSection = document.getElementById('user-profile-section');
    const displayUsername = document.getElementById('display-username');

    if (user) {
        authSection.style.display = 'none';
        userSection.style.display = 'block';
        // Get username from Firestore if possible, fallback to email
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists) {
                displayUsername.textContent = doc.data().username;
            } else {
                displayUsername.textContent = user.email.split('@')[0];
            }
        });
    } else {
        authSection.style.display = 'block';
        userSection.style.display = 'none';
    }
}

async function checkBanStatus(uid) {
    db.collection('users').doc(uid).onSnapshot(doc => {
        if (doc.exists && doc.data().isBanned) {
            alert("This account has been banned. Access to community features is restricted.");
            auth.signOut();
            window.location.href = '/index.html';
        }
    });
}

function listenForPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    db.collection('posts').orderBy('created_at', 'desc').onSnapshot(snapshot => {
        if (snapshot.empty) {
            container.innerHTML = '<p class="text-dim">no posts yet. be the first to contribute.</p>';
            return;
        }

        container.innerHTML = snapshot.docs.map(doc => {
            const post = doc.data();
            return `
                <div class="post-card" style="border-bottom: 1px solid #111; padding: 30px 0;">
                    <div class="user-block" style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div style="width: 32px; height: 32px; background: #222; border: 1px solid #333; overflow: hidden;">
                            <div style="width: 100%; height: 100%; background: #444;"></div>
                        </div>
                        <div>
                            <span class="user-name" style="display: block; font-weight: 700;">${post.username || 'anonymous'}</span>
                            <span style="font-size: 0.7rem; color: #444;">${post.created_at ? formatTime(post.created_at.toDate()) : 'just now'}</span>
                        </div>
                    </div>
                    <p style="color: #aaa; line-height: 1.7;">${post.content}</p>
                </div>
            `;
        }).join('');
    });
}

function formatTime(date) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).toLowerCase();
}
