# Infiniware Deployment Checklist

## Firebase Setup Steps

### 1. Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

Or via Firebase Console:
1. Go to Firestore Database → Rules
2. Copy contents of `firestore.rules`
3. Paste and publish

### 2. Deploy Storage Security Rules

```bash
firebase deploy --only storage
```

Or via Firebase Console:
1. Go to Storage → Rules
2. Copy contents of `storage.rules`
3. Paste and publish

### 3. Enable Authentication Providers

**Email/Password:**
1. Firebase Console → Authentication → Sign-in method
2. Enable "Email/Password"
3. Configure email templates:
   - From: `noreply@infiniware.bid`
   - Customize verification and password reset emails

**GitHub OAuth:**
1. Firebase Console → Authentication → Sign-in method
2. Enable "GitHub"
3. Get OAuth credentials from GitHub:
   - GitHub Settings → Developer settings → OAuth Apps
   - Create new OAuth App
   - Authorization callback URL: `https://infiniware-b3b54.firebaseapp.com/__/auth/handler`
4. Add Client ID and Client Secret to Firebase

### 4. Create Initial Categories

Run this in Firebase Console → Firestore → Data, or use Firebase CLI:

```javascript
// Create these documents in the 'categories' collection:

// Document 1:
{
  title: "general",
  description: "general discussions and announcements",
  created_at: [server timestamp]
}

// Document 2:
{
  title: "development",
  description: "coding, tools, and technical discussions",
  created_at: [server timestamp]
}

// Document 3:
{
  title: "showcase",
  description: "share your projects and work",
  created_at: [server timestamp]
}

// Document 4:
{
  title: "help",
  description: "ask questions and get support",
  created_at: [server timestamp]
}

// Document 5:
{
  title: "feedback",
  description: "suggestions and platform feedback",
  created_at: [server timestamp]
}
```

### 5. Configure Email Templates

Firebase Console → Authentication → Templates:

**Email Verification Template:**
- Subject: "verify your infiniware account"
- Customize with your branding
- Action URL: `https://yourdomain.com/verify-email.html`

**Password Reset Template:**
- Subject: "reset your infiniware password"
- Action URL: `https://yourdomain.com/signin.html`

### 6. Storage Setup

1. Firebase Console → Storage
2. Create bucket if not exists
3. Rules are deployed (step 2)
4. Test upload permissions

### 7. Cloudflare Pages Deployment

1. Connect repository to Cloudflare Pages
2. Build settings:
   - Build command: (leave empty - static files)
   - Output directory: `/`
   - Root directory: `/`
3. Environment variables: (none needed)
4. Deploy

### 8. Domain Configuration (Optional)

1. Add custom domain in Cloudflare Pages
2. Update Firebase Auth authorized domains:
   - Firebase Console → Authentication → Settings → Authorized domains
   - Add your custom domain

### 9. Testing Checklist

- [ ] User registration works
- [ ] Email verification email received
- [ ] Email verification link works
- [ ] Login with email/password works
- [ ] GitHub OAuth login works
- [ ] Password reset email received
- [ ] Password reset flow works
- [ ] Categories display in dashboard
- [ ] Can create topic
- [ ] Can post reply
- [ ] Can edit own post
- [ ] Can delete own post
- [ ] Avatar upload works
- [ ] Profile page displays correctly
- [ ] Settings save correctly
- [ ] Images upload to Storage
- [ ] Security rules prevent unauthorized access

### 10. Production Considerations

**Email Configuration:**
- Verify `noreply@infiniware.bid` domain in Firebase
- Configure SPF/DKIM records if using custom domain
- Test email delivery

**Performance:**
- Enable Firestore indexes for queries
- Monitor Storage usage
- Set up Firebase Analytics (optional)

**Security:**
- Review security rules regularly
- Monitor authentication attempts
- Set up Firebase App Check (optional)

**Monitoring:**
- Firebase Console → Usage and billing
- Set up alerts for quota limits
- Monitor error logs

## Quick Start Commands

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (if needed)
firebase init

# Deploy rules
firebase deploy --only firestore:rules,storage

# Deploy hosting (if using Firebase Hosting instead of Cloudflare)
firebase deploy --only hosting
```

## Troubleshooting

**Rules not deploying:**
- Check Firebase CLI version: `firebase --version`
- Verify project: `firebase use --add`
- Check syntax in rules files

**Authentication not working:**
- Verify authorized domains in Firebase Console
- Check OAuth redirect URLs
- Verify API keys are correct

**Storage uploads failing:**
- Check Storage rules syntax
- Verify file size limits (5MB)
- Check file type restrictions

**Real-time updates not working:**
- Verify Firestore rules allow reads
- Check browser console for errors
- Verify user is authenticated

## Support

For issues:
- Check Firebase Console logs
- Review browser console errors
- Verify security rules syntax
- Test with Firebase emulator (optional)
