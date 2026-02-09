/**
 * Dashboard Feed Tab - Shows topics and latest posts
 */

import { subscribeToCategories, subscribeToTopics, subscribeToLatestPosts, formatDate } from './community.js';
import { truncate } from './utils.js';

let currentCategoryId = null;
let unsubscribeTopics = null;
let unsubscribeCategories = null;
let unsubscribeLatestPosts = null;

export function initFeedTab(user) {
    const topicsContainer = document.getElementById('topics-container');
    const categoryFilters = document.getElementById('category-filters');
    const latestPostsContainer = document.getElementById('latest-posts-container');

    if (!topicsContainer || !categoryFilters) return;

    // Load categories
    loadCategories(categoryFilters);
    
    // Load topics
    loadTopics(null, topicsContainer);
    
    // Load latest posts
    if (latestPostsContainer) {
        initLatestPosts(user, latestPostsContainer);
    }
}

function loadCategories(container) {
    unsubscribeCategories = subscribeToCategories((categories) => {
        container.innerHTML = '';
        
        // Add "all topics" button
        const allBtn = document.createElement('button');
        allBtn.className = 'btn btn-ghost category-filter active';
        allBtn.dataset.category = '';
        allBtn.style.fontSize = '0.85rem';
        allBtn.textContent = 'all topics';
        allBtn.addEventListener('click', () => {
            document.querySelectorAll('.category-filter').forEach(b => b.classList.remove('active'));
            allBtn.classList.add('active');
            loadTopics(null, document.getElementById('topics-container'));
        });
        container.appendChild(allBtn);
        
        // Add "no category" button
        const noCatBtn = document.createElement('button');
        noCatBtn.className = 'btn btn-ghost category-filter';
        noCatBtn.dataset.category = 'uncategorized';
        noCatBtn.style.fontSize = '0.85rem';
        noCatBtn.textContent = 'no category';
        noCatBtn.addEventListener('click', () => {
            document.querySelectorAll('.category-filter').forEach(b => b.classList.remove('active'));
            noCatBtn.classList.add('active');
            loadTopics('uncategorized', document.getElementById('topics-container'));
        });
        container.appendChild(noCatBtn);
        
        const fallback = [
            { id: 'linux', title: 'linux' },
            { id: 'programming', title: 'programming' },
            { id: 'tech', title: 'tech' }
        ];

        const list = (categories && categories.length) ? categories : fallback;

        // Add category buttons
        list.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-ghost category-filter';
            btn.textContent = category.title;
            btn.dataset.category = category.id;
            btn.style.fontSize = '0.85rem';
            btn.addEventListener('click', () => {
                currentCategoryId = category.id;
                document.querySelectorAll('.category-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadTopics(category.id, document.getElementById('topics-container'));
            });
            container.appendChild(btn);
        });
    });
}

function loadTopics(categoryId, container) {
    if (!container) return;

    // Unsubscribe previous listener
    if (unsubscribeTopics) {
        unsubscribeTopics();
    }

    currentCategoryId = categoryId;
    
    unsubscribeTopics = subscribeToTopics(categoryId, async (topics) => {
        container.innerHTML = '';
        
        if (topics.length === 0) {
            container.innerHTML = '<p class="text-dim text-center">no topics yet. be the first to start a discussion.</p>';
            return;
        }

        // Group pinned topics first
        const pinned = topics.filter(t => t.pinned);
        const unpinned = topics.filter(t => !t.pinned);
        const sortedTopics = [...pinned, ...unpinned];

        // Load reply counts for all topics
        const replyCounts = {};
        const { getPostsByTopic } = await import('./community.js');
        
        for (const topic of sortedTopics) {
            try {
                const posts = await getPostsByTopic(topic.id);
                replyCounts[topic.id] = Math.max(0, posts.length - 1);
            } catch (error) {
                replyCounts[topic.id] = 0;
            }
        }
        
        // Create cards with reply counts
        for (const topic of sortedTopics) {
            const replyCount = replyCounts[topic.id] || 0;
            const card = createTopicCard(topic, replyCount);
            container.appendChild(card);
        }
    });
}

function createTopicCard(topic, replyCount) {
    const div = document.createElement('div');
    div.className = `topic-card ${topic.pinned ? 'pinned' : ''}`;
    
    const dateStr = formatDate(topic.created_at);
    
    div.innerHTML = `
        <div class="flex justify-between align-start gap-md">
            <div style="flex: 1; min-width: 0;">
                <div class="flex align-center gap-sm mb-sm">
                    ${topic.pinned ? '<span class="text-red" style="font-size: 0.75rem;">pinned</span>' : ''}
                    ${topic.locked ? '<span class="text-dim" style="font-size: 0.75rem;">locked</span>' : ''}
                    <a href="topic.html?id=${topic.id}" class="text-white" style="font-weight: 600; text-decoration: none;">
                        ${escapeHtml(topic.title)}
                    </a>
                </div>
                <div class="flex align-center gap-md" style="font-size: 0.85rem;">
                    <span class="text-dim">by ${escapeHtml(topic.author_username)}</span>
                    <span class="text-dim">•</span>
                    <span class="text-dim">${dateStr}</span>
                    ${replyCount > 0 ? `<span class="text-dim">•</span><span class="text-dim">${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}</span>` : ''}
                </div>
            </div>
        </div>
    `;
    
    div.addEventListener('click', (e) => {
        if (!e.target.closest('a')) {
            window.location.href = `topic.html?id=${topic.id}`;
        }
    });
    
    return div;
}

function initLatestPosts(currentUser, container) {
    unsubscribeLatestPosts = subscribeToLatestPosts(25, (posts) => {
        container.innerHTML = '';

        if (!posts.length) {
            container.innerHTML = '<p class="text-dim">no replies yet. once people start talking, you\'ll see the latest responses here.</p>';
            return;
        }

        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'post-card';
            card.style.borderBottom = '1px solid #111';
            card.style.padding = '14px 0';

            const isMine = currentUser && post.author_uid === currentUser.uid;
            const preview = truncate(post.content || '', 180);
            const dateStr = formatDate(post.created_at);

            card.innerHTML = `
                <div class="flex justify-between align-start gap-md">
                    <div style="flex:1; min-width:0;">
                        <div class="flex align-center gap-sm mb-xs">
                            <span class="text-white" style="font-weight:600;">${escapeHtml(post.author_username || 'user')}</span>
                            ${isMine ? '<span class="status-badge">you</span>' : ''}
                        </div>
                        <p class="text-dim" style="font-size:0.85rem; margin-bottom:4px;">${dateStr}</p>
                        <p class="text-dim" style="font-size:0.9rem; line-height:1.5;">${escapeHtml(preview)}</p>
                    </div>
                    <div>
                        <a href="topic.html?id=${post.topic_id}#post-${post.id}" class="text-red" style="font-size:0.8rem; text-decoration:none;">
                            open thread →
                        </a>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });
    });
}

export function cleanupFeedTab() {
    if (unsubscribeTopics) unsubscribeTopics();
    if (unsubscribeCategories) unsubscribeCategories();
    if (unsubscribeLatestPosts) unsubscribeLatestPosts();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
