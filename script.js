import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js'
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  deleteUser,
  sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js'
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js'
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-analytics.js'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyB6PPd_kNJkvkSQ9Ilfa9Q6nQ2rGo83zXU',
  authDomain: 'infiniware-b3b54.firebaseapp.com',
  projectId: 'infiniware-b3b54',
  storageBucket: 'infiniware-b3b54.firebasestorage.app',
  messagingSenderId: '815856884778',
  appId: '1:815856884778:web:7ddaab50243fc2b2d1b753',
  measurementId: 'G-8QEQ03JFKK'
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const analytics = getAnalytics(app)

document.addEventListener('DOMContentLoaded', () => {
  initNavigation()
  initScrollReveals()
  initCopyright()
  initPrayerTimes()

  // Logic Dispatcher
  const path = window.location.pathname
  if (path.includes('community.html')) {
    initCommunity()
  } else if (path.includes('dashboard.html')) {
    initDashboard()
  }
})

// --- Logic Shared across Auth Views ---

onAuthStateChanged(auth, async (user) => {
  const isDashboard = window.location.pathname.includes('dashboard.html')
  const isCommunity = window.location.pathname.includes('community.html')

  const dashboardLink = document.getElementById('nav-dashboard')

  if (user) {
    if (dashboardLink) dashboardLink.style.display = 'block'
    if (!user.emailVerified) {
      handleUnverified(user, isDashboard, isCommunity)
    } else {
      // Verified User
      if (isCommunity) {
        // Instant reload to dashboard
        window.location.href = 'dashboard.html'
      }
      if (isDashboard) {
        checkBanStatus(user.uid)
        listenForPosts()
        updateUserUI(user)
      }
    }
  } else {
    // Unauthenticated
    if (dashboardLink) dashboardLink.style.display = 'none'
    if (isDashboard) {
      window.location.href = 'community.html'
    }
  }
})

function handleUnverified(user, isDashboard, isCommunity) {
  console.log('// infiniware ecosystem: pending verification for', user.email)

  if (isCommunity) {
    const notice = document.getElementById('verification-notice')
    const authCard = document.querySelector('.organized-auth')
    if (notice) notice.style.display = 'block'
    if (authCard) authCard.style.display = 'none'
  }

  if (isDashboard) {
    // Dashboard is off-limits for unverified
    window.location.href = 'community.html'
  }

  // Polling for verification status
  const pollInterval = setInterval(async () => {
    await user.reload()
    if (auth.currentUser.emailVerified) {
      clearInterval(pollInterval)
      console.log('// infiniware ecosystem: verification confirmed')
      window.location.href = 'dashboard.html'
    }
  }, 3000)
}

// --- Navigation & Core UI ---

function initNavigation() {
  const links = document.querySelectorAll('.nav-link')
  const currentPath = window.location.pathname.split('/').pop() || 'index.html'

  links.forEach((link) => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active')
    }
  })

  console.log(`// infiniware system: navigation structural check passed`)
}

function initScrollReveals() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1'
          entry.target.style.transform = 'translateY(0)'
        }
      })
    },
    { threshold: 0.1 }
  )

  document.querySelectorAll('.card, .post-card, .post-entry, article').forEach((el) => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(20px)'
    el.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
    observer.observe(el)
  })
}

function initCopyright() {
  const footerBottom = document.querySelector('.footer-bottom span')
  if (footerBottom) {
    const year = new Date().getFullYear()
    footerBottom.textContent = `infiniware © ${year}`
  }
}

// --- Community Page Logic (Public Entrance) ---

function initCommunity() {
  const loginForm = document.getElementById('email-login-form')
  const signupForm = document.getElementById('email-signup-form')
  const toggleSignInBtn = document.getElementById('toggle-signin')
  const toggleSignUpBtn = document.getElementById('toggle-signup')

  if (toggleSignInBtn && toggleSignUpBtn) {
    toggleSignInBtn.addEventListener('click', () => {
      loginForm.style.display = 'flex'
      signupForm.style.display = 'none'
      toggleSignInBtn.classList.add('active')
      toggleSignUpBtn.classList.remove('active')
    })

    toggleSignUpBtn.addEventListener('click', () => {
      loginForm.style.display = 'none'
      signupForm.style.display = 'flex'
      toggleSignInBtn.classList.remove('active')
      toggleSignUpBtn.classList.add('active')
    })
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const email = loginForm.email.value
      const password = loginForm.password.value
      const turnstileResponse = loginForm.querySelector('[name="cf-turnstile-response"]')?.value

      if (!turnstileResponse) {
        alert('Security check required. Please complete the Turnstile challenge.')
        return
      }

      try {
        await signInWithEmailAndPassword(auth, email, password)
      } catch (err) {
        alert(`auth failure: ${err.message}`)
      }
    })
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const username = signupForm.username.value
      const email = signupForm.email.value
      const password = signupForm.password.value
      const turnstileResponse = signupForm.querySelector('[name="cf-turnstile-response"]')?.value

      if (!turnstileResponse) {
        alert('Security check required. Please complete the Turnstile challenge.')
        return
      }

      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password)
        const user = credential.user

        // 1. Send Verification
        await sendEmailVerification(user)

        // 2. Save Profile
        await setDoc(doc(db, 'users', user.uid), {
          username: username,
          email: email,
          isBanned: false,
          role: 'user',
          created_at: new Date()
        })

        alert(
          'Account initialized. Please check your email to verify your identity before dashboard access.'
        )
      } catch (err) {
        alert(`initialization failure: ${err.message}`)
      }
    })
  }

  listenForPosts() // Show public feed
}

// --- Dashboard Page Logic (Private Member View) ---

function initDashboard() {
  const logoutBtn = document.getElementById('btn-logout')
  const deleteBtn = document.getElementById('btn-delete-account')
  const postForm = document.getElementById('post-creation-form')

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      signOut(auth)
    })
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (confirm('permanently delete account and all structural data?')) {
        const user = auth.currentUser
        if (!user) return
        try {
          await deleteDoc(doc(db, 'users', user.uid))
          await deleteUser(user)
        } catch (err) {
          alert(`deletion failed: ${err.message}. you may need to re-authenticate first.`)
        }
      }
    })
  }

  if (postForm) {
    postForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const content = document.getElementById('post-content').value
      const user = auth.currentUser

      if (!user) return

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists() && userDoc.data()?.isBanned) {
          throw new Error('account is banned.')
        }

        await addDoc(collection(db, 'posts'), {
          uid: user.uid,
          username: userDoc.exists() ? userDoc.data().username : user.email.split('@')[0],
          content: content,
          created_at: serverTimestamp()
        })

        document.getElementById('post-content').value = ''
      } catch (err) {
        alert(`guardian alert: ${err.message}`)
      }
    })
  }
}

function updateUserUI(user) {
  const displayUsername = document.getElementById('display-username')
  if (displayUsername) {
    getDoc(doc(db, 'users', user.uid)).then((docSnap) => {
      displayUsername.textContent = docSnap.exists()
        ? docSnap.data().username
        : user.email.split('@')[0]
    })
  }
}

async function checkBanStatus(uid) {
  onSnapshot(doc(db, 'users', uid), (snapshot) => {
    if (snapshot.exists() && snapshot.data().isBanned) {
      alert('Account banned. Access restricted.')
      signOut(auth)
      window.location.href = 'index.html'
    }
  })
}

function listenForPosts() {
  const container = document.getElementById('posts-container')
  if (!container) return

  const q = query(collection(db, 'posts'), orderBy('created_at', 'desc'))
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      container.innerHTML = '<p class="text-dim">no posts yet. be the first to contribute.</p>'
      return
    }

    function escapeHtml(text) {
      if (!text) return ''
      const div = document.createElement('div')
      div.textContent = text
      return div.innerHTML
    }

    container.innerHTML = snapshot.docs
      .map((docSnap) => {
        const post = docSnap.data()
        const safeContent = escapeHtml(post.content || '')
        const safeUsername = escapeHtml(post.username || 'anonymous')
        return `
                <div class="post-card" style="border-bottom: 1px solid #111; padding: 30px 0;">
                    <div class="user-block" style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div style="width: 32px; height: 32px; background: #222; border: 1px solid #333; overflow: hidden;">
                            <div style="width: 100%; height: 100%; background: #444;"></div>
                        </div>
                        <div>
                            <span class="user-name" style="display: block; font-weight: 700;">${safeUsername}</span>
                            <span style="font-size: 0.7rem; color: #444;">${post.created_at ? formatTime(post.created_at) : 'just now'}</span>
                        </div>
                    </div>
                    <p style="color: #aaa; line-height: 1.7;">${safeContent}</p>
                </div>
            `
      })
      .join('')
  })
}

function formatTime(timestamp) {
  const date = timestamp && timestamp.toDate ? timestamp.toDate() : new Date()
  return date
    .toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    .toLowerCase()
}

// --- AlMuslim Prayer Times ---

function initPrayerTimes() {
  const btn = document.getElementById('get-location-btn')
  const list = document.getElementById('prayer-times-list')

  if (!btn || !list) return

  btn.addEventListener('click', () => {
    btn.textContent = 'locating...'
    btn.disabled = true

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude
          const lon = position.coords.longitude
          await fetchPrayerTimes(lat, lon)
          btn.textContent = 'updated'
          setTimeout(() => {
            btn.textContent = 'use my location'
            btn.disabled = false
          }, 5000)
        },
        (err) => {
          list.innerHTML = `<p class="text-red" style="font-size: 0.85rem;">location access denied.</p>`
          btn.textContent = 'use my location'
          btn.disabled = false
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    } else {
      list.innerHTML = `<p class="text-red" style="font-size: 0.85rem;">geolocation not supported.</p>`
    }
  })

  async function fetchPrayerTimes(lat, lon) {
    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const yyyy = today.getFullYear()
    const dateStr = `${dd}-${mm}-${yyyy}`

    const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lon}`

    try {
      const res = await fetch(url)
      const data = await res.json()

      if (data.code === 200) {
        const timings = data.data.timings
        const relevant = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
        list.innerHTML = relevant
          .map((key) => {
            return `
            <div class="prayer-time-item">
              <span class="text-dim" style="font-size: 0.7rem; display: block; margin-bottom: 2px;">${key.toLowerCase()}</span>
              <span class="ui-font" style="font-size: 0.9rem; font-weight: 700;">${timings[key]}</span>
            </div>
          `
          })
          .join('')
      } else {
        throw new Error('API error')
      }
    } catch (err) {
      list.innerHTML = `<p class="text-red" style="font-size: 0.85rem;">failed to fetch times.</p>`
    }
  }
}
