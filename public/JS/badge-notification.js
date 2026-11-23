// ============================================
// BADGE SYSTEM - ACHIEVEMENT BADGES
// Manages badge awards and display
// ============================================

const BadgeSystem = {
    // Render badge icon based on icon_type
    renderBadgeIcon(badge, size = 'medium') {
        const iconType = badge.icon_type || 'emoji';
        const icon = badge.icon || '🏆';
        
        // Size configurations
        const sizes = {
            small: { width: '24px', height: '24px', fontSize: '20px' },
            medium: { width: '48px', height: '48px', fontSize: '40px' },
            large: { width: '60px', height: '60px', fontSize: '50px' }
        };
        
        const sizeConfig = sizes[size] || sizes.medium;
        
        if (iconType === 'lucide') {
            // Lucide icon
            return `<i data-lucide="${icon}" style="width: ${sizeConfig.width}; height: ${sizeConfig.height}; stroke-width: 2;"></i>`;
        } else if (iconType === 'image' || iconType === 'link') {
            // Image (uploaded or link)
            const fallbackId = `badge-fallback-${badge.id || Math.random()}`;
            return `
                <img 
                    src="${icon}" 
                    alt="${badge.name || 'Badge'}"
                    style="width: ${sizeConfig.width}; height: ${sizeConfig.height}; object-fit: contain; display: block;"
                    onerror="this.style.display='none'; document.getElementById('${fallbackId}').style.display='block';"
                />
                <span id="${fallbackId}" style="display: none; font-size: ${sizeConfig.fontSize};">🏆</span>
            `;
        } else {
            // Emoji (default)
            return `<span style="font-size: ${sizeConfig.fontSize}; display: block;">${icon}</span>`;
        }
    },

    // Initialize Lucide icons after rendering badges
    initLucideIcons() {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    // Get all available badges from backend
    async getAllBadges() {
        try {
            const response = await fetch('/api/badges/list');
            const result = await response.json();

            if (result.success) {
                return result.badges || [];
            } else {
                console.error('❌ Failed to fetch badges:', result.error);
                return [];
            }
        } catch (error) {
            console.error('❌ Error fetching badges:', error);
            return [];
        }
    },

    // Get user's earned badges
    async getUserBadges(userId) {
        try {
            if (!userId) {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session || !session.user) {
                    console.log('⚠️ User not logged in');
                    return [];
                }
                userId = session.user.id;
            }

            const response = await fetch(`/api/badges/user/${userId}`);
            const result = await response.json();

            if (result.success) {
                console.log(`🏅 User has ${result.badges.length} badge(s)`);
                return result.badges || [];
            } else {
                console.error('❌ Failed to fetch user badges:', result.error);
                return [];
            }
        } catch (error) {
            console.error('❌ Error fetching user badges:', error);
            return [];
        }
    },

    // Check if user should earn any new badges
    async checkBadgeEligibility(userId, stats) {
        try {
            if (!userId) {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session || !session.user) {
                    console.log('⚠️ User not logged in');
                    return;
                }
                userId = session.user.id;
            }

            const response = await fetch('/api/badges/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    total_xp: stats.total_xp || 0,
                    lessons_completed: stats.lessons_completed || 0,
                    streak: stats.streak || 0,
                    pomodoros: stats.pomodoros || 0
                })
            });

            const result = await response.json();

            if (result.success && result.new_badges && result.new_badges.length > 0) {
                console.log(`🎉 New badge(s) earned:`, result.new_badges);
                
                // Show notification for each new badge
                for (const badge of result.new_badges) {
                    this.showBadgeUnlockedNotification(badge);
                }
                
                return result.new_badges;
            }
        } catch (error) {
            console.error('❌ Error checking badge eligibility:', error);
        }
    },

    // Show badge unlocked notification with animation
    showBadgeUnlockedNotification(badge) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'badge-unlock-notification';
        notification.innerHTML = `
            <div class="badge-unlock-content">
                <div class="badge-unlock-animation">
                    <div class="badge-unlock-icon" style="background: ${badge.color || '#8b5cf6'}">
                        ${this.renderBadgeIcon(badge, 'large')}
                    </div>
                    <div class="badge-unlock-sparkles">
                        <span class="sparkle">✨</span>
                        <span class="sparkle">✨</span>
                        <span class="sparkle">✨</span>
                    </div>
                </div>
                <div class="badge-unlock-text">
                    <div class="badge-unlock-title">Badge Unlocked!</div>
                    <div class="badge-unlock-name">${badge.name}</div>
                    <div class="badge-unlock-desc">${badge.description || 'Congratulations!'}</div>
                </div>
            </div>
        `;

        // Add to body
        document.body.appendChild(notification);

        // Initialize Lucide icons for the notification
        this.initLucideIcons();

        // Trigger animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 5000);

        console.log(`🏅 Badge Unlocked: ${badge.name}`);
    },

    // Render badges in a container
    renderBadges(container, badges, allBadges) {
        if (!container) return;

        container.innerHTML = '';

        // Create a map of earned badges for quick lookup
        const earnedBadgeIds = new Set(badges.map(b => b.id));

        // Show all badges (earned and locked)
        allBadges.forEach(badge => {
            const isEarned = earnedBadgeIds.has(badge.id);
            const badgeElement = document.createElement('div');
            badgeElement.className = `badge-item ${isEarned ? 'badge-earned' : 'badge-locked'}`;
            badgeElement.innerHTML = `
                <div class="badge-icon" style="background: ${isEarned ? (badge.color || '#8b5cf6') : '#d1d5db'}">
                    ${this.renderBadgeIcon(badge, 'medium')}
                </div>
                <div class="badge-info">
                    <div class="badge-name">${badge.name}</div>
                    <div class="badge-desc">${badge.description || 'Keep learning!'}</div>
                </div>
                ${isEarned ? '<div class="badge-check">✓</div>' : ''}
            `;

            container.appendChild(badgeElement);
        });

        // If no badges at all
        if (allBadges.length === 0) {
            container.innerHTML = '<p class="no-badges">No badges available yet.</p>';
        }

        // Initialize Lucide icons
        this.initLucideIcons();
    }
};

// Export to global scope
window.BadgeSystem = BadgeSystem;