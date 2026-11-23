// ============================================
// STREAK SYSTEM - GLOBAL ACROSS ALL PATHS
// Tracks continuous learning activity
// ============================================

const StreakSystem = {
    // Check and update streak
    async checkStreak() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session || !session.user) {
                console.log('⚠️ User not logged in');
                return { streak: 0, lastActive: null };
            }

            const userId = session.user.id;
            const timezone = TimezoneUtils?.getUserTimezone() || Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            const response = await fetch(`/api/streak/check?user_id=${userId}&timezone=${encodeURIComponent(timezone)}`);
            const result = await response.json();

            if (result.success) {
                console.log(`🔥 Current streak: ${result.streak} days`);
                return result;
            } else {
                console.error('❌ Failed to check streak:', result.error);
                return { streak: 0, lastActive: null };
            }
        } catch (error) {
            console.error('❌ Error checking streak:', error);
            return { streak: 0, lastActive: null };
        }
    },

    // Update streak when user completes an activity
    async updateStreak(activityType = 'general') {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session || !session.user) {
                console.log('⚠️ User not logged in');
                return false;
            }

            const userId = session.user.id;
            const timezone = TimezoneUtils?.getUserTimezone() || Intl.DateTimeFormat().resolvedOptions().timeZone;

            const response = await fetch('/api/streak/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    activity_type: activityType,
                    timezone: timezone
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log(`🔥 Streak updated: ${result.streak} days ${result.streak_increased ? '(+1 day!)' : ''}`);
                
                // Show notification if streak increased
                if (result.streak_increased) {
                    this.showStreakNotification(result.streak);
                }
                
                return result;
            } else {
                console.error('❌ Failed to update streak:', result.error);
                return false;
            }
        } catch (error) {
            console.error('❌ Error updating streak:', error);
            return false;
        }
    },

    // Show streak notification
    showStreakNotification(streak) {
        // Remove any existing notifications
        const existing = document.querySelector('.streak-notification');
        if (existing) {
            existing.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'streak-notification';
        notification.innerHTML = `
            <div class="streak-notification-content">
                <div class="streak-icon">🔥</div>
                <div class="streak-text">
                    <div class="streak-title">Streak Extended!</div>
                    <div class="streak-count">${streak} Day${streak !== 1 ? 's' : ''}</div>
                </div>
            </div>
        `;

        // Add to body
        document.body.appendChild(notification);

        // Trigger animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    },

    // Get streak display string
    formatStreak(streak) {
        if (streak === 0) return '0 days';
        if (streak === 1) return '1 day';
        return `${streak} days`;
    }
};

// Export to global scope
window.StreakSystem = StreakSystem;
