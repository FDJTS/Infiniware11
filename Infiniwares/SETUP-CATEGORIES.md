# Setup Categories in Firestore

To add the three categories (linux, programming, tech) to your Firestore database:

## Option 1: Firebase Console (Manual)

1. Go to Firebase Console → Firestore Database
2. Click "Start collection" or select the `categories` collection
3. Add these documents:

**Document 1:**
- Collection: `categories`
- Document ID: (auto-generated)
- Fields:
  - `title`: "linux"
  - `description`: "linux discussions, distributions, and system administration"
  - `created_at`: (timestamp - use server timestamp)

**Document 2:**
- Collection: `categories`
- Document ID: (auto-generated)
- Fields:
  - `title`: "programming"
  - `description`: "coding, languages, frameworks, and development tools"
  - `created_at`: (timestamp)

**Document 3:**
- Collection: `categories`
- Document ID: (auto-generated)
- Fields:
  - `title`: "tech"
  - `description`: "technology news, hardware, software, and general tech discussions"
  - `created_at`: (timestamp)

## Option 2: Run Script (Browser Console)

Open your browser console on the dashboard page and run:

```javascript
import('./init-categories.js').then(m => m.initializeCategories());
```

Note: This requires admin privileges in Firestore rules. If you get permission errors, use Option 1 instead.

## "No Category" Option

Topics can be created with `category_id: "uncategorized"` when users select "no category" in the dropdown. These will appear under the "no category" filter in the dashboard.
