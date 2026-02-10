/**
 * Dashboard Settings Tab - Account settings with Firestore persistence
 */

import { getUserProfile } from './community.js';
import { updateDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { db, storage } from './firebase-init.js';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js";
import { validateImageFile, createImagePreview } from './utils.js';

let selectedAvatarFile = null;

export async function initSettingsTab(user) {
    await loadSettingsForm(user);
}

async function loadSettingsForm(user) {
    try {
        const profile = await getUserProfile(user.uid);
        if (!profile) {
            console.error("Profile not found");
            return;
        }
        
        // Populate form fields
        document.getElementById('set-username').value = profile.username || '';
        document.getElementById('set-bio').value = profile.bio || '';
        document.getElementById('set-website').value = profile.website || '';
        document.getElementById('set-location').value = profile.location || '';
        
        // Populate social links
        const socialLinks = profile.social_links || {};
        document.getElementById('set-github').value = socialLinks.github || '';
        document.getElementById('set-twitter').value = socialLinks.twitter || '';
        document.getElementById('set-linkedin').value = socialLinks.linkedin || '';
        
        // Setup avatar preview
        const avatarPreview = document.getElementById('avatar-preview');
        const avatarInput = document.getElementById('avatar-input');
        const avatarUploadBtn = document.getElementById('avatar-upload-btn');
        const avatarRemoveBtn = document.getElementById('avatar-remove-btn');
        
        if (profile.avatar_url) {
            avatarPreview.innerHTML = `<img src="${profile.avatar_url}" style="width:100%; height:100%; object-fit:cover;">`;
            avatarRemoveBtn.style.display = 'block';
        } else {
            const initial = (profile.username || 'U')[0].toUpperCase();
            avatarPreview.innerHTML = `<span style="opacity:0.5; font-size:2rem;">${initial}</span>`;
        }
        
        avatarUploadBtn.addEventListener('click', () => avatarInput.click());
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const validation = validateImageFile(file);
            if (!validation.valid) {
                const errorMsg = document.getElementById('settings-error-msg');
                errorMsg.textContent = validation.error;
                errorMsg.style.display = 'block';
                return;
            }
            
            selectedAvatarFile = file;
            createImagePreview(file, (previewUrl) => {
                if (previewUrl) {
                    avatarPreview.innerHTML = `<img src="${previewUrl}" style="width:100%; height:100%; object-fit:cover;">`;
                    avatarRemoveBtn.style.display = 'block';
                }
            });
        });
        
        avatarRemoveBtn.addEventListener('click', () => {
            selectedAvatarFile = null;
            avatarInput.value = '';
            const initial = (document.getElementById('set-username').value || 'U')[0].toUpperCase();
            avatarPreview.innerHTML = `<span style="opacity:0.5; font-size:2rem;">${initial}</span>`;
            avatarRemoveBtn.style.display = 'none';
        });
        
        // Form submission
        const form = document.getElementById('settings-form');
        const errorMsg = document.getElementById('settings-error-msg');
        const saveBtn = document.getElementById('save-settings-btn');
        
        form.onsubmit = async (e) => {
            e.preventDefault();
            errorMsg.style.display = 'none';
            
            const username = document.getElementById('set-username').value.trim().toLowerCase();
            if (username.length < 3) {
                errorMsg.textContent = "username must be at least 3 characters.";
                errorMsg.style.display = 'block';
                return;
            }
            
            saveBtn.textContent = 'saving...';
            saveBtn.disabled = true;
            
            try {
                let avatarUrl = profile.avatar_url || null;
                
                // Upload avatar if selected
                if (selectedAvatarFile) {
                    const storageRef = ref(storage, `users/${user.uid}/avatar/${Date.now()}_${selectedAvatarFile.name}`);
                    await uploadBytes(storageRef, selectedAvatarFile);
                    avatarUrl = await getDownloadURL(storageRef);
                } else if (avatarRemoveBtn.style.display === 'none' && profile.avatar_url) {
                    // Avatar was removed
                    avatarUrl = null;
                }
                
                // Build social links object
                const socialLinks = {};
                const github = document.getElementById('set-github').value.trim();
                const twitter = document.getElementById('set-twitter').value.trim();
                const linkedin = document.getElementById('set-linkedin').value.trim();
                if (github) socialLinks.github = github;
                if (twitter) socialLinks.twitter = twitter;
                if (linkedin) socialLinks.linkedin = linkedin;
                
                // Update Firestore
                const userRef = doc(db, "users", user.uid);
                const updateData = {
                    username: username,
                    bio: document.getElementById('set-bio').value.trim(),
                    website: document.getElementById('set-website').value.trim(),
                    location: document.getElementById('set-location').value.trim(),
                    social_links: socialLinks,
                    updated_at: serverTimestamp()
                };
                
                if (avatarUrl !== undefined) {
                    updateData.avatar_url = avatarUrl;
                }
                
                await updateDoc(userRef, updateData);
                
                saveBtn.textContent = 'saved!';
                setTimeout(() => {
                    saveBtn.textContent = 'save changes';
                    saveBtn.disabled = false;
                }, 2000);
                
                // Reload user profile in header
                // Import loadUserProfile from dashboard-logic
                const dashboardLogic = await import('./dashboard-logic.js');
                if (dashboardLogic && dashboardLogic.loadUserProfile) {
                    await dashboardLogic.loadUserProfile(user.uid);
                } else {
                    // Fallback: reload page to show updated profile
                    setTimeout(() => window.location.reload(), 2000);
                }
                
            } catch (error) {
                console.error("Error saving settings:", error);
                errorMsg.textContent = "failed to save settings. please try again.";
                errorMsg.style.display = 'block';
                saveBtn.textContent = 'save changes';
                saveBtn.disabled = false;
            }
        };
        
        // Delete account handler
        const deleteBtn = document.getElementById('delete-account-btn');
        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                if (confirm('are you sure? this cannot be undone. all your posts and topics will be anonymized.')) {
                    const { logout } = await import('./auth.js');
                    await logout();
                }
            };
        }
    } catch (error) {
        console.error("Error loading settings:", error);
    }
}
