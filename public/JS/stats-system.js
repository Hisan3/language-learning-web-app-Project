// ============================================
// STATS SYSTEM - USER STATISTICS
// Manages user stats (XP, lessons, pomodoros, etc.)
// ============================================

const StatsSystem = {
    // Get all user stats
    async getUserStats(userId) {
        try {
            if (!userId) {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session || !session.user) {
                    console.log('⚠️ User not logged in');
                    return this.getDefaultStats();
                }
                userId = session.user.id;
            }

            const timezone = TimezoneUtils?.getUserTimezone() || Intl.DateTimeFormat().resolvedOptions().timeZone;
            const response = await fetch(`/api/stats/user/${userId}?timezone=${encodeURIComponent(timezone)}`);
            const result = await response.json();

            if (result.success) {
                console.log('📊 User stats loaded:', result.stats);
                return result.stats;
            } else {
                console.error('❌ Failed to fetch stats:', result.error);
                return this.getDefaultStats();
            }
        } catch (error) {
            console.error('❌ Error fetching stats:', error);
            return this.getDefaultStats();
        }
    },

    // Get daily progress
    async getDailyProgress(userId) {
        try {
            if (!userId) {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session || !session.user) {
                    console.log('⚠️ User not logged in');
                    return this.getDefaultDailyProgress();
                }
                userId = session.user.id;
            }

            const timezone = TimezoneUtils?.getUserTimezone() || Intl.DateTimeFormat().resolvedOptions().timeZone;
            const response = await fetch(`/api/stats/daily-progress/${userId}?timezone=${encodeURIComponent(timezone)}`);
            const result = await response.json();

            if (result.success) {
                console.log('📈 StatsSystem - Daily progress fetched from API:', result.progress);
                return result.progress;
            } else {
                console.error('❌ Failed to fetch daily progress:', result.error);
                return this.getDefaultDailyProgress();
            }
        } catch (error) {
            console.error('❌ Error fetching daily progress:', error);
            return this.getDefaultDailyProgress();
        }
    },

    // Update pomodoro count
    async updatePomodoroCount(userId) {
        try {
            if (!userId) {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session || !session.user) {
                    console.log('⚠️ User not logged in');
                    return false;
                }
                userId = session.user.id;
            }

            const response = await fetch('/api/stats/pomodoro/increment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log(`🍅 Pomodoro count updated: ${result.pomodoro_count}`);
                
                // Check if user earned Time Master badge (50 pomodoros)
                if (result.pomodoro_count === 50) {
                    const stats = await this.getUserStats(userId);
                    await BadgeSystem.checkBadgeEligibility(userId, stats);
                }
                
                return result;
            } else {
                console.error('❌ Failed to update pomodoro count:', result.error);
                return false;
            }
        } catch (error) {
            console.error('❌ Error updating pomodoro count:', error);
            return false;
        }
    },

    // Mark task as completed
    async markTaskCompleted(userId, taskId) {
        try {
            if (!userId) {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session || !session.user) {
                    console.log('⚠️ User not logged in');
                    return false;
                }
                userId = session.user.id;
            }

            const timezone = TimezoneUtils?.getUserTimezone() || Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            const response = await fetch('/api/stats/task/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    task_id: taskId,
                    timezone: timezone
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log(`✅ Task marked as completed`);
                return result;
            } else {
                console.error('❌ Failed to mark task as completed:', result.error);
                return false;
            }
        } catch (error) {
            console.error('❌ Error marking task as completed:', error);
            return false;
        }
    },

    // Default stats structure
    getDefaultStats() {
        return {
            total_xp: 0,
            streak: 0,
            badges_earned: 0,
            lessons_completed: 0,
            practice_completed: 0,
            pomodoros: 0,
            tasks_completed: 0
        };
    },

    // Default daily progress structure
    getDefaultDailyProgress() {
        return {
            lessons_progress: 0,
            practice_progress: 0,
            tasks_progress: 0
        };
    },

    // Format XP display
    formatXP(xp) {
        if (xp >= 1000) {
            return (xp / 1000).toFixed(1) + 'k';
        }
        return xp.toString();
    }
};

// Export to global scope
window.StatsSystem = StatsSystem;