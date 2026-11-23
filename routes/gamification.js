// routes/gamification.js
// API routes for gamification system (streaks, badges, XP, stats)

const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// Helper function to get user's local date
function getUserLocalDate(timezone = 'UTC') {
    const date = new Date();
    const options = { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    return formatter.format(date);
}

// ============================================
// STREAK ROUTES
// ============================================

// GET: Check user's current streak
router.get('/streak/check', async (req, res) => {
    try {
        const { user_id, timezone = 'UTC' } = req.query;
        
        if (!user_id) {
            return res.status(400).json({ success: false, error: 'user_id required' });
        }

        // Get or create user streak record
        let { data: streak, error } = await supabase
            .from('user_streaks')
            .select('*')
            .eq('user_id', user_id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            throw error;
        }

        // If no streak record exists, create one
        if (!streak) {
            const { data: newStreak, error: insertError } = await supabase
                .from('user_streaks')
                .insert({
                    user_id: user_id,
                    current_streak: 0,
                    longest_streak: 0,
                    last_activity_date: null
                })
                .select()
                .single();

            if (insertError) throw insertError;
            streak = newStreak;
        }

        res.json({
            success: true,
            streak: streak.current_streak || 0,
            longest_streak: streak.longest_streak || 0,
            last_active: streak.last_activity_date
        });

    } catch (error) {
        console.error('Error checking streak:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST: Update user's streak
router.post('/streak/update', async (req, res) => {
    try {
        const { user_id, activity_type = 'general', timezone = 'UTC' } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ success: false, error: 'user_id required' });
        }

        const today = getUserLocalDate(timezone);
        
        // Get current streak
        let { data: streak, error: fetchError } = await supabase
            .from('user_streaks')
            .select('*')
            .eq('user_id', user_id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        let currentStreak = 0;
        let longestStreak = 0;
        let streakIncreased = false;

        if (!streak) {
            // First activity ever
            currentStreak = 1;
            longestStreak = 1;
            streakIncreased = true;

            const { error: insertError } = await supabase
                .from('user_streaks')
                .insert({
                    user_id: user_id,
                    current_streak: currentStreak,
                    longest_streak: longestStreak,
                    last_activity_date: today
                });

            if (insertError) throw insertError;

        } else {
            const lastDate = streak.last_activity_date;
            
            if (lastDate === today) {
                // Already active today, no change
                currentStreak = streak.current_streak;
                longestStreak = streak.longest_streak;
            } else {
                // Calculate days difference
                const lastDateTime = new Date(lastDate);
                const todayDateTime = new Date(today);
                const daysDiff = Math.floor((todayDateTime - lastDateTime) / (1000 * 60 * 60 * 24));

                if (daysDiff === 1) {
                    // Consecutive day - increment streak
                    currentStreak = streak.current_streak + 1;
                    longestStreak = Math.max(currentStreak, streak.longest_streak);
                    streakIncreased = true;
                } else if (daysDiff > 1) {
                    // Streak broken - reset to 1
                    currentStreak = 1;
                    longestStreak = streak.longest_streak;
                    streakIncreased = true;
                }

                // Update streak record
                const { error: updateError } = await supabase
                    .from('user_streaks')
                    .update({
                        current_streak: currentStreak,
                        longest_streak: longestStreak,
                        last_activity_date: today,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user_id);

                if (updateError) throw updateError;
            }
        }

        // Log activity
        await supabase
            .from('streak_activities')
            .insert({
                user_id: user_id,
                activity_type: activity_type,
                activity_date: today,
                timezone: timezone
            });

        res.json({
            success: true,
            streak: currentStreak,
            longest_streak: longestStreak,
            streak_increased: streakIncreased
        });

    } catch (error) {
        console.error('Error updating streak:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// STATS ROUTES
// ============================================

// GET: Get user's complete stats
router.get('/stats/user/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const { timezone = 'UTC' } = req.query;

        // Get stats from user_stats table
        let { data: stats, error: statsError } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', user_id)
            .single();

        if (statsError && statsError.code !== 'PGRST116') {
            throw statsError;
        }

        // If no stats exist, create default record
        if (!stats) {
            const { data: newStats, error: insertError } = await supabase
                .from('user_stats')
                .insert({
                    user_id: user_id,
                    total_xp: 0,
                    lessons_completed: 0,
                    practice_completed: 0,
                    pomodoros_completed: 0,
                    tasks_completed: 0
                })
                .select()
                .single();

            if (insertError) throw insertError;
            stats = newStats;
        }

        // Get streak data
        const { data: streak } = await supabase
            .from('user_streaks')
            .select('current_streak, longest_streak')
            .eq('user_id', user_id)
            .single();

        // Get badges count
        const { count: badgesCount } = await supabase
            .from('user_badges')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id);

        res.json({
            success: true,
            stats: {
                total_xp: stats.total_xp || 0,
                lessons_completed: stats.lessons_completed || 0,
                practice_completed: stats.practice_completed || 0,
                pomodoros: stats.pomodoros_completed || 0,
                tasks_completed: stats.tasks_completed || 0,
                streak: streak?.current_streak || 0,
                longest_streak: streak?.longest_streak || 0,
                badges_earned: badgesCount || 0
            }
        });

    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET: Get daily progress
router.get('/stats/daily-progress/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const { timezone = 'UTC' } = req.query;
        const today = getUserLocalDate(timezone);
        const todayStart = new Date(today + 'T00:00:00');
        const todayEnd = new Date(today + 'T23:59:59');

        let { data: progress, error } = await supabase
            .from('daily_progress')
            .select('*')
            .eq('user_id', user_id)
            .eq('progress_date', today)
            .single();

        console.log(`📅 getDailyProgress called for user ${user_id}, date: ${today}`);
        console.log(`📊 Found progress record:`, progress);

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        // Get actual completed tasks from productivity_tasks table for today
        const { data: completedTasks } = await supabase
            .from('productivity_tasks')
            .select('*')
            .eq('user_id', user_id)
            .eq('completed', true)
            .gte('completed_at', todayStart.toISOString())
            .lte('completed_at', todayEnd.toISOString());

        const actualTasksCompleted = completedTasks?.length || 0;

        // If no progress record for today, create one
        if (!progress) {
            console.log(`🆕 No progress record found for today. Creating new one with:`);
            console.log(`   - lessons_completed: 0`);
            console.log(`   - practice_completed: 0`);
            console.log(`   - tasks_completed: ${actualTasksCompleted}`);
            
            const { data: newProgress, error: insertError } = await supabase
                .from('daily_progress')
                .insert({
                    user_id: user_id,
                    progress_date: today,
                    lessons_completed: 0,
                    lessons_total: 5,
                    practice_completed: 0,
                    practice_total: 4,
                    tasks_completed: actualTasksCompleted,
                    tasks_total: 3,
                    timezone: timezone
                })
                .select()
                .single();

            if (insertError) throw insertError;
            progress = newProgress;
            console.log(`✅ Created new progress record:`, progress);
        } else {
            // Update progress with actual tasks completed
            progress.tasks_completed = actualTasksCompleted;
        }

        // Calculate percentages
        const lessonsProgress = progress.lessons_total > 0 
            ? Math.round((progress.lessons_completed / progress.lessons_total) * 100) 
            : 0;
        const practiceProgress = progress.practice_total > 0 
            ? Math.round((progress.practice_completed / progress.practice_total) * 100) 
            : 0;
        const tasksProgress = progress.tasks_total > 0 
            ? Math.round((actualTasksCompleted / progress.tasks_total) * 100) 
            : 0;

        res.json({
            success: true,
            progress: {
                lessons_progress: lessonsProgress,
                practice_progress: practiceProgress,
                tasks_progress: tasksProgress,
                lessons_count: progress.lessons_completed,
                practice_count: progress.practice_completed,
                tasks_count: actualTasksCompleted
            }
        });

    } catch (error) {
        console.error('Error fetching daily progress:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST: Increment pomodoro count
router.post('/stats/pomodoro/increment', async (req, res) => {
    try {
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ success: false, error: 'user_id required' });
        }

        // Get current stats
        let { data: stats, error } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', user_id)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        let pomodoroCount = 1;

        if (!stats) {
            // Create new stats record
            const { data: newStats, error: insertError } = await supabase
                .from('user_stats')
                .insert({
                    user_id: user_id,
                    pomodoros_completed: 1
                })
                .select()
                .single();

            if (insertError) throw insertError;
            pomodoroCount = 1;
        } else {
            // Increment pomodoro count
            pomodoroCount = (stats.pomodoros_completed || 0) + 1;
            
            const { error: updateError } = await supabase
                .from('user_stats')
                .update({
                    pomodoros_completed: pomodoroCount,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user_id);

            if (updateError) throw updateError;
        }

        res.json({
            success: true,
            pomodoro_count: pomodoroCount
        });

    } catch (error) {
        console.error('Error incrementing pomodoro count:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST: Mark task as completed
router.post('/stats/task/complete', async (req, res) => {
    try {
        const { user_id, task_id, timezone = 'UTC' } = req.body;
        const today = getUserLocalDate(timezone);

        // Update daily progress
        const { data: progress } = await supabase
            .from('daily_progress')
            .select('*')
            .eq('user_id', user_id)
            .eq('progress_date', today)
            .single();

        if (progress) {
            await supabase
                .from('daily_progress')
                .update({
                    tasks_completed: (progress.tasks_completed || 0) + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user_id)
                .eq('progress_date', today);
        }

        // Update total tasks in user_stats
        const { data: stats } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', user_id)
            .single();

        if (stats) {
            await supabase
                .from('user_stats')
                .update({
                    tasks_completed: (stats.tasks_completed || 0) + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user_id);
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error marking task as completed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// BADGE ROUTES
// ============================================

// POST: Reset user's progress (lessons, XP, badges, etc.)
router.post('/progress/reset', async (req, res) => {
    try {
        const { user_id, reset_type = 'lessons' } = req.body;
        
        console.log(`\n========================================`);
        console.log(`🔄 RESET PROGRESS CALLED`);
        console.log(`   User ID: ${user_id}`);
        console.log(`   Reset Type: ${reset_type}`);
        console.log(`========================================\n`);
        
        if (!user_id) {
            return res.status(400).json({ success: false, error: 'user_id required' });
        }

        if (reset_type === 'lessons' || reset_type === 'all') {
            // Delete all lesson progress
            await supabase
                .from('user_lesson_progress')
                .delete()
                .eq('user_id', user_id);
            
            // Reset lessons completed count in user_stats
            await supabase
                .from('user_stats')
                .update({
                    lessons_completed: 0,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user_id);
        }

        if (reset_type === 'all') {
            // FIXED: Reset ALL stats (XP, practice, pomodoros, AND tasks)
            await supabase
                .from('user_stats')
                .update({
                    total_xp: 0,
                    practice_completed: 0,
                    pomodoros_completed: 0,
                    tasks_completed: 0,  // FIXED: Also reset tasks_completed
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user_id);

            // Reset streak
            await supabase
                .from('user_streaks')
                .update({
                    current_streak: 0,
                    longest_streak: 0,
                    last_activity_date: null,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user_id);

            // FIXED: Delete all streak activity logs
            await supabase
                .from('streak_activities')
                .delete()
                .eq('user_id', user_id);

            // Remove all badges
            await supabase
                .from('user_badges')
                .delete()
                .eq('user_id', user_id);

            // Reset practice progress
            await supabase
                .from('practice_progress')
                .delete()
                .eq('user_id', user_id);

            // Reset practice activity records
            await supabase
                .from('user_practice_activity')
                .delete()
                .eq('user_id', user_id);

            // FIXED: Reset daily progress to 0% (delete all daily_progress records)
            // First, check what records exist
            const { data: existingProgress } = await supabase
                .from('daily_progress')
                .select('*')
                .eq('user_id', user_id);
            
            console.log('🔍 Existing daily_progress records before delete:', existingProgress);
            
            const { data: deletedRecords, error: dailyProgressError } = await supabase
                .from('daily_progress')
                .delete()
                .eq('user_id', user_id)
                .select();
            
            if (dailyProgressError) {
                console.error('❌ Error deleting daily_progress:', dailyProgressError);
            } else {
                console.log('✅ Daily progress deleted for user:', user_id, '- Deleted records:', deletedRecords);
            }

            // FIXED: Reset all productivity tasks to incomplete (or delete all)
            // Option 1: Delete all completed tasks
            await supabase
                .from('productivity_tasks')
                .delete()
                .eq('user_id', user_id)
                .eq('completed', true);
            
            // Option 2: Or reset all tasks to not completed (uncomment if preferred)
            // await supabase
            //     .from('productivity_tasks')
            //     .update({
            //         completed: false,
            //         completed_at: null,
            //         updated_at: new Date().toISOString()
            //     })
            //     .eq('user_id', user_id);
            
            // FIXED: Reset Study Tracker data
            console.log('🔄 Deleting study tracker sessions...');
            await supabase
                .from('study_sessions')
                .delete()
                .eq('user_id', user_id);
            
            console.log('🔄 Deleting study tracker categories...');
            await supabase
                .from('study_categories')
                .delete()
                .eq('user_id', user_id);
            
            console.log('✅ Study tracker data reset complete');

            // FIXED: Reset Mood Dashboard data
            console.log('🔄 Resetting mood dashboard...');
            
            // Delete all mood quiz results
            const { data: deletedMoodResults, error: moodResultsError } = await supabase
                .from('mood_results')
                .delete()
                .eq('user_id', user_id)
                .select();
            
            if (moodResultsError) {
                console.error('❌ Error deleting mood_results:', moodResultsError);
            } else {
                console.log('✅ Mood results deleted:', deletedMoodResults?.length || 0, 'records');
            }

            // Delete mood dashboard record
            const { data: deletedDashboard, error: dashboardError } = await supabase
                .from('mood_dashboard')
                .delete()
                .eq('user_id', user_id)
                .select();
            
            if (dashboardError) {
                console.error('❌ Error deleting mood_dashboard:', dashboardError);
            } else {
                console.log('✅ Mood dashboard deleted:', deletedDashboard?.length || 0, 'records');
            }
            
            console.log('✅ Mood dashboard reset complete');
            
            // FIXED: Reset Breathing Results
            console.log('🔄 Resetting breathing results...');
            const { data: deletedBreathing, error: breathingError } = await supabase
                .from('breathing_analytics')
                .delete()
                .eq('user_id', user_id)
                .select();
            
            if (breathingError) {
                console.error('❌ Error deleting breathing_analytics:', breathingError);
            } else {
                console.log('✅ Breathing analytics deleted:', deletedBreathing?.length || 0, 'records');
            }
            
            // FIXED: Reset Self-Care Checklist
            console.log('🔄 Resetting self-care checklist...');
            const { data: deletedSelfcare, error: selfcareError } = await supabase
                .from('self_care_items')
                .delete()
                .eq('user_id', user_id)
                .select();
            
            if (selfcareError) {
                console.error('❌ Error deleting self_care_items:', selfcareError);
            } else {
                console.log('✅ Self-care items deleted:', deletedSelfcare?.length || 0, 'records');
            }
            
            // FIXED: Reset Journal Entries
            console.log('🔄 Resetting journal entries...');
            const { data: deletedJournal, error: journalError } = await supabase
                .from('journal_entries')
                .delete()
                .eq('user_id', user_id)
                .select();
            
            if (journalError) {
                console.error('❌ Error deleting journal_entries:', journalError);
            } else {
                console.log('✅ Journal entries deleted:', deletedJournal?.length || 0, 'records');
            }
        }
        
        // INDIVIDUAL RESET: Breathing only
        if (reset_type === 'breathing') {
            console.log('🔄 Resetting breathing results only...');
            const { data: deletedBreathing, error: breathingError } = await supabase
                .from('breathing_analytics')
                .delete()
                .eq('user_id', user_id)
                .select();
            
            if (breathingError) {
                console.error('❌ Error deleting breathing_analytics:', breathingError);
            } else {
                console.log('✅ Breathing analytics deleted:', deletedBreathing?.length || 0, 'records');
            }
        }
        
        // INDIVIDUAL RESET: Self-care only
        if (reset_type === 'selfcare') {
            console.log('🔄 Resetting self-care checklist only...');
            const { data: deletedSelfcare, error: selfcareError } = await supabase
                .from('self_care_items')
                .delete()
                .eq('user_id', user_id)
                .select();
            
            if (selfcareError) {
                console.error('❌ Error deleting self_care_items:', selfcareError);
            } else {
                console.log('✅ Self-care items deleted:', deletedSelfcare?.length || 0, 'records');
            }
        }
        
        // INDIVIDUAL RESET: Journal only
        if (reset_type === 'journal') {
            console.log('🔄 Resetting journal entries only...');
            const { data: deletedJournal, error: journalError } = await supabase
                .from('journal_entries')
                .delete()
                .eq('user_id', user_id)
                .select();
            
            if (journalError) {
                console.error('❌ Error deleting journal_entries:', journalError);
            } else {
                console.log('✅ Journal entries deleted:', deletedJournal?.length || 0, 'records');
            }
        }

        console.log(`\n✅ RESET COMPLETE FOR USER: ${user_id}\n`);
        
        res.json({
            success: true,
            message: `Progress reset successfully (${reset_type})`
        });

    } catch (error) {
        console.error('Error resetting progress:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET: List all available badges
router.get('/badges/list', async (req, res) => {
    try {
        const { data: badges, error } = await supabase
            .from('badges')
            .select('*')
            .order('threshold');

        if (error) throw error;

        res.json({
            success: true,
            badges: badges || []
        });

    } catch (error) {
        console.error('Error fetching badges:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET: Get user's earned badges
router.get('/badges/user/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        const { data: userBadges, error } = await supabase
            .from('user_badges')
            .select(`
                id,
                earned_at,
                badges (*)
            `)
            .eq('user_id', user_id)
            .order('earned_at', { ascending: false });

        if (error) throw error;

        // Flatten the structure
        const badges = userBadges?.map(ub => ({
            ...ub.badges,
            earned_at: ub.earned_at
        })) || [];

        res.json({
            success: true,
            badges: badges
        });

    } catch (error) {
        console.error('Error fetching user badges:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST: Check if user earned any new badges
router.post('/badges/check', async (req, res) => {
    try {
        const { user_id, total_xp, lessons_completed, streak, pomodoros } = req.body;

        if (!user_id) {
            return res.status(400).json({ success: false, error: 'user_id required' });
        }

        // Get all badges
        const { data: allBadges, error: badgesError } = await supabase
            .from('badges')
            .select('*');

        if (badgesError) throw badgesError;

        // Get badges user already has
        const { data: earnedBadges, error: earnedError } = await supabase
            .from('user_badges')
            .select('badge_id')
            .eq('user_id', user_id);

        if (earnedError) throw earnedError;

        const earnedBadgeIds = new Set(earnedBadges?.map(b => b.badge_id) || []);
        const newBadges = [];

        // Check each badge
        for (const badge of allBadges || []) {
            if (earnedBadgeIds.has(badge.id)) continue;

            let earned = false;

            switch (badge.badge_type) {
                case 'xp':
                    earned = total_xp >= badge.threshold;
                    break;
                case 'lessons':
                    earned = lessons_completed >= badge.threshold;
                    break;
                case 'streak':
                    earned = streak >= badge.threshold;
                    break;
                case 'pomodoro':
                    earned = pomodoros >= badge.threshold;
                    break;
            }

            if (earned) {
                // Award badge
                const { error: awardError } = await supabase
                    .from('user_badges')
                    .insert({
                        user_id: user_id,
                        badge_id: badge.id
                    });

                if (!awardError) {
                    newBadges.push(badge);
                }
            }
        }

        res.json({
            success: true,
            new_badges: newBadges
        });

    } catch (error) {
        console.error('Error checking badges:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;