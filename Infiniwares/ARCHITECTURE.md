# Infiniware Platform Architecture

## Overview

Infiniware is a developer-centric community forum platform built with vanilla JavaScript, Firebase, and Cloudflare Pages. The platform emphasizes privacy, structural clarity, and user-focused design.

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6 modules)
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Hosting**: Cloudflare Pages (static hosting)
- **Email**: Firebase Authentication (noreply@infiniware.bid)

## Project Structure

```
infiniware/
├── index.html              # Landing page
├── signup.html             # User registration
├── signin.html             # User login
├── verify-email.html        # Email verification flow
├── forgot-password.html    # Password reset
├── dashboard.html          # Community dashboard (main forum view)
├── create-topic.html       # Create new topic
├── topic.html              # View topic and posts
├── profile.html            # Public user profile
├── blog.html               # Blog/development logs
├── docs.html               # Documentation
├── style.css               # Global stylesheet
├── firebase-init.js        # Firebase configuration
├── auth.js                 # Authentication logic
├── community.js            # Forum/community logic
├── dashboard-logic.js      # Dashboard UI logic
├── utils.js                # Utility functions
├── guardian.js             # Content moderation (optional)
├── firestore.rules         # Firestore security rules
└── storage.rules           # Firebase Storage security rules
```

## Database Schema (Firestore)

### Collections

#### 1. `users`
User profile documents.

```javascript
{
  uid: string,                    // Firebase Auth UID (document ID)
  username: string,               // Lowercase username
  email: string,                  // User email
  avatar_url: string | null,     // Avatar image URL
  bio: string,                    // User bio/description
  website: string,                // Personal website
  location: string,               // Location
  social_links: {                 // Social media links
    github?: string,
    twitter?: string,
    linkedin?: string
  },
  created_at: Timestamp,
  updated_at: Timestamp
}
```

#### 2. `categories`
Forum categories.

```javascript
{
  id: string,                     // Document ID
  title: string,                  // Category name
  description: string,            // Category description
  created_at: Timestamp
}
```

#### 3. `topics`
Forum topics/threads.

```javascript
{
  id: string,                     // Document ID
  category_id: string,            // Reference to category
  title: string,                  // Topic title
  author_uid: string,             // User UID
  author_username: string,        // Cached username
  created_at: Timestamp,
  updated_at: Timestamp,
  pinned: boolean,                // Pinned topics appear first
  locked: boolean                 // Locked topics can't be replied to
}
```

#### 4. `posts`
Posts/replies within topics.

```javascript
{
  id: string,                     // Document ID
  topic_id: string,               // Reference to topic
  parent_post_id: string | null,  // For nested replies (future)
  author_uid: string,             // User UID
  author_username: string,         // Cached username
  content: string,                 // Post content (markdown-like)
  media_urls: string[],           // Array of image URLs
  created_at: Timestamp,
  updated_at: Timestamp
}
```

## Authentication Flow

### Registration
1. User enters username, email, password
2. Firebase Auth creates account
3. Firestore user document created
4. Verification email sent
5. Redirect to verification page

### Email Verification
1. User clicks link in email
2. Firebase verifies email
3. User redirected to dashboard
4. Real-time polling checks verification status

### Login
1. Email/password or GitHub OAuth
2. Check email verification status
3. If verified → dashboard
4. If not verified → verification page

### Password Reset
1. User enters email
2. Firebase sends reset link
3. User clicks link and sets new password
4. Redirect to sign in

## Security Rules

### Firestore Rules
- **Users**: Authenticated users can read all profiles, only edit their own
- **Categories**: All authenticated users can read, only admins can write
- **Topics**: Authenticated users can read/create, owners/admins can edit/delete
- **Posts**: Authenticated users can read/create, owners/admins can edit/delete

### Storage Rules
- **User avatars**: Public read, owner write (max 5MB, images only)
- **Post media**: Public read, authenticated users can upload (max 5MB, images only)

## Key Features

### Forum System
- Categories for organizing topics
- Topics/threads with titles and initial posts
- Posts/replies with markdown-like formatting
- Image attachments (Firebase Storage)
- Real-time updates via Firestore listeners
- Post editing and deletion (owners only)

### User Profiles
- Public profiles with avatar, bio, location, website
- Social links (GitHub, Twitter, LinkedIn)
- Lists of user's topics and posts
- Profile pages accessible via `/profile.html?uid={uid}`

### Content Formatting
- Markdown-like syntax:
  - `**bold**` → **bold**
  - `*italic*` → *italic*
  - `` `code` `` → inline code
  - ` ```code``` ` → code blocks
  - `[text](url)` → links
  - Auto-link URLs

### Image Handling
- Upload via file input
- Validation (type, size)
- Preview before upload
- Firebase Storage integration
- Display in posts

## UI/UX Design Principles

### Brand Identity
- **Colors**: Black, white, gray, red (accent only)
- **Typography**: Ubuntu (headings/logo), Inter (UI/content)
- **Logo**: SVG text, "I" in red, rest in white
- **Style**: Lowercase text (except logo "I")

### Layout
- Responsive design
- Clean, minimal interface
- Developer-oriented aesthetic
- Forum-style organization
- Subtle transitions only

## File Descriptions

### Core Files

**firebase-init.js**
- Firebase app initialization
- Exports auth, db, storage instances
- Configures providers (GitHub OAuth)

**auth.js**
- User registration (`signUp`)
- Login (`signIn`, `signInWithGithub`)
- Logout (`logout`)
- Password reset (`resetPassword`)
- Email verification helpers
- Auth state listener

**community.js**
- Category management
- Topic CRUD operations
- Post CRUD operations
- Real-time subscriptions
- User profile queries
- Date formatting utilities

**dashboard-logic.js**
- Dashboard UI management
- Navigation between views (feed/profile/settings)
- Category filtering
- Topic display and interaction
- Settings form handling
- Avatar upload

**utils.js**
- Markdown-like content rendering
- Image validation
- File size formatting
- HTML escaping (XSS prevention)
- Debounce utility

### Pages

**dashboard.html**
- Main community forum view
- Shows categories and topics
- Filter by category
- Create topic button
- User profile view
- Account settings

**create-topic.html**
- Topic creation form
- Category selection
- Title and content input
- Image attachments
- Markdown support

**topic.html**
- Topic display
- All posts/replies
- Reply form
- Post editing/deletion
- Real-time updates

**profile.html**
- Public user profile
- Avatar, bio, location, website
- Social links
- User's topics and posts

## Deployment

### Cloudflare Pages
1. Connect repository
2. Build command: (none, static files)
3. Output directory: `/`
4. Environment variables: (none required, Firebase config in code)

### Firebase Setup
1. Create Firebase project
2. Enable Authentication (Email/Password, GitHub)
3. Create Firestore database
4. Create Storage bucket
5. Deploy security rules:
   - `firestore.rules`
   - `storage.rules`
6. Configure email templates (noreply@infiniware.bid)
7. Set up GitHub OAuth provider

### Initial Data
Create default categories manually or via admin:
- general
- development
- showcase
- help
- feedback

## Privacy & User Rights

- No user data sold
- Open-source commitment
- User data deletion support
- Transparent privacy policy
- Minimal data collection
- User-focused design

## Future Enhancements

- Nested replies (parent_post_id support)
- Topic locking/pinning (admin)
- User roles and permissions
- Search functionality
- Notifications
- Rich text editor
- Code syntax highlighting
- Topic subscriptions
- User mentions (@username)

## Notes

- All code is vanilla JavaScript (no frameworks)
- Real-time updates via Firestore listeners
- Client-side rendering
- No server-side code (except Firebase)
- Static hosting compatible
- Privacy-first architecture
