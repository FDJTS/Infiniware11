/**
 * Dashboard Profile Tab - Shows user's own profile
 */

import { getUserProfile, getTopicsByUser, getPostsByUser } from './community.js';
import { formatDate } from './utils.js';

export async function initProfileTab(user) {
    await loadUserProfileView(user);
}

async function loadUserProfileView(user) {
    try {
        const { getUserProfile, getPostsByUser, getTopicsByUser } = await import('./community.js');
        const profile = await getUserProfile(user.uid);
        const posts = await getPostsByUser(user.uid, 20);
        const topics = await getTopicsByUser(user.uid, 20);
        
        if (!profile) {
            const container = document.getElementById('profile-posts-container');
            if (container) container.innerHTML = '<p class="text-dim">profile not found.</p>';
            return;
        }
        
        const avatarEl = document.getElementById('profile-avatar-large');
        const usernameEl = document.getElementById('profile-username');
        const bioEl = document.getElementById('profile-bio');
        const joinedEl = document.getElementById('profile-joined');
        const postsContainer = document.getElementById('profile-posts-container');
        
        if (avatarEl) {
            if (profile.avatar_url) {
                avatarEl.innerHTML = `<img src="${profile.avatar_url}" style="width:100%; height:100%; object-fit:cover;">`;
            } else {
                const initial = (profile.username || 'U')[0].toUpperCase();
                avatarEl.innerHTML = `<span style="opacity:0.5; font-size:2rem;">${initial}</span>`;
            }
        }
        
        if (usernameEl) usernameEl.textContent = profile.username || "user";
        if (bioEl) bioEl.textContent = profile.bio || "no bio yet.";
        
        if (joinedEl && profile.created_at) {
            const date = profile.created_at.toDate ? profile.created_at.toDate() : new Date(profile.created_at);
            joinedEl.textContent = `joined: ${date.toLocaleDateString()}`;
        }
        
        if (postsContainer) {
            postsContainer.innerHTML = '';
            
            if (topics.length === 0 && posts.length === 0) {
                postsContainer.innerHTML = '<p class="text-dim">no topics or posts yet.</p>';
            } else {
                // Show topics
                if (topics.length > 0) {
                    const topicsSection = document.createElement('div');
                    topicsSection.className = 'mb-lg';
                    topicsSection.innerHTML = '<h4 class="mb-sm" style="font-size: 0.9rem; color: var(--clr-gray-dim);">my topics</h4>';
                    
                    topics.forEach(topic => {
                        const div = document.createElement('div');
                        div.className = 'mb-sm pb-sm';
                        div.style.borderBottom = '1px solid var(--clr-gray-dark)';
                        div.innerHTML = `
                            <a href="topic.html?id=${topic.id}" class="text-white" style="text-decoration: none; font-weight: 600; display: block; margin-bottom: 4px;">
                                ${escapeHtml(topic.title)}
                            </a>
                            <span class="text-dim" style="font-size: 0.85rem;">${formatDate(topic.created_at)}</span>
                        `;
                        topicsSection.appendChild(div);
                    });
                    
                    postsContainer.appendChild(topicsSection);
                }
                
                // Show posts
                if (posts.length > 0) {
                    const postsSection = document.createElement('div');
                    postsSection.innerHTML = '<h4 class="mb-sm" style="font-size: 0.9rem; color: var(--clr-gray-dim);">my replies</h4>';
                    
                    posts.forEach(post => {
                        const div = document.createElement('div');
                        div.className = 'mb-sm pb-sm';
                        div.style.borderBottom = '1px solid var(--clr-gray-dark)';
                        div.innerHTML = `
                            <a href="topic.html?id=${post.topic_id}#post-${post.id}" class="text-white" style="text-decoration: none; font-weight: 600; display: block; margin-bottom: 4px;">
                                view in topic →
                            </a>
                            <p class="text-dim" style="font-size: 0.9rem; margin-bottom: 4px;">${escapeHtml(post.content.substring(0, 150))}${post.content.length > 150 ? '...' : ''}</p>
                            <span class="text-dim" style="font-size: 0.85rem;">${formatDate(post.created_at)}</span>
                        `;
                        postsSection.appendChild(div);
                    });
                    
                    postsContainer.appendChild(postsSection);
                }
            }
        }
    } catch (error) {
        console.error("Error loading profile view:", error);
        const container = document.getElementById('profile-posts-container');
        if (container) container.innerHTML = '<p class="text-red">failed to load profile.</p>';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
