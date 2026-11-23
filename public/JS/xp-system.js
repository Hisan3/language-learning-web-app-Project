// ============================================
// XP SYSTEM FOR PRACTICE SECTIONS
// Awards XP for completing practice activities
// ============================================

// XP Rewards Configuration
const XP_REWARDS = {
    FLASHCARD: 10,           // Per flashcard completed
    QUIZ_CORRECT: 10,        // Per correct quiz answer  
    EXERCISE: 10,            // Per correct exercise completed
    FILL_BLANK: 10,          // Per correct fill-in-blank completed
    DAILY_BONUS: 50          // Bonus for completing all daily sets
};

// Show XP notification with animation
function showXPNotification(xpAmount, message = '') {
    // Remove any existing notifications
    const existing = document.querySelector('.xp-notification');
    if (existing) {
        existing.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'xp-notification';
    notification.innerHTML = `
        <div class="xp-notification-content">
            <div class="xp-icon">⭐</div>
            <div class="xp-text">
                <div class="xp-amount">+${xpAmount} XP</div>
                ${message ? `<div class="xp-message">${message}</div>` : ''}
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

    // Log XP award
    console.log(`✨ +${xpAmount} XP Earned! ${message}`);
}

// Award XP and save to database
async function awardXP(xpAmount, activityType, activityData = {}) {
    try {
        // Get user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !session.user) {
            console.log('⚠️ User not logged in, XP not saved');
            showXPNotification(xpAmount);
            return false;
        }

        const userId = session.user.id;
        const userEmail = session.user.email;

        // Save activity to database (server will calculate XP)
        const timezone = TimezoneUtils.getUserTimezone();
        
        // Log what we're sending to debug 0 score issues
        console.log(`📤 [XP] Sending to server:`, {
            activity_type: activityType,
            score: activityData.score !== undefined ? activityData.score : 100,
            total_questions: activityData.total_questions !== undefined ? activityData.total_questions : 1,
            correct_answers: activityData.correct_answers !== undefined ? activityData.correct_answers : 1
        });
        
        const response = await fetch('/api/practice/save-activity', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                user_email: userEmail,
                activity_type: activityType,
                set_id: activityData.set_id || '00000000-0000-0000-0000-000000000000',
                score: activityData.score !== undefined ? activityData.score : 100,
                total_questions: activityData.total_questions !== undefined ? activityData.total_questions : 1,
                correct_answers: activityData.correct_answers !== undefined ? activityData.correct_answers : 1
                // xp_earned removed - server will calculate based on first/repeat attempt
            })
        });

        const result = await response.json();

        if (result.success) {
            // Use server-calculated XP amount
            const earnedXP = result.xp_earned || 0;
            const isRepeat = result.is_repeat || false;
            
            console.log(`✅ XP Awarded and Saved: +${earnedXP} XP for ${activityType}${isRepeat ? ' (Repeat)' : ''}`);
            
            // Show notification with correct XP and repeat label
            const message = isRepeat ? `${activityType} (Repeat Attempt)` : activityType;
            showXPNotification(earnedXP, message);

            // Check if user completed all daily sets for bonus
            await checkDailyCompletion(userId, timezone);
            
            return true;
        } else {
            console.error('❌ Failed to save XP:', result.error);
            // Still show notification even if save failed
            showXPNotification(xpAmount, activityType);
            return false;
        }
    } catch (error) {
        console.error('❌ Error awarding XP:', error);
        // Still show notification
        showXPNotification(xpAmount);
        return false;
    }
}

// Check if user completed all daily practice sets
async function checkDailyCompletion(userId, timezone) {
    try {
        const response = await fetch(`/api/practice/daily-completion-status?user_id=${userId}&timezone=${encodeURIComponent(timezone)}`);
        const result = await response.json();

        if (result.success && result.completed && !result.bonus_claimed) {
            console.log('🎉 User completed all daily practice sets! Awarding bonus XP...');
            
            // Claim daily bonus
            await claimDailyBonus(userId, timezone);
        }
    } catch (error) {
        console.error('❌ Error checking daily completion:', error);
    }
}

// Claim daily bonus XP
async function claimDailyBonus(userId, timezone) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userEmail = session?.user?.email;

        const response = await fetch('/api/practice/claim-daily-bonus', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                user_email: userEmail,
                timezone: timezone
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log('🎉 Daily Bonus Claimed: +' + result.xp_earned + ' XP');
            
            // Show special bonus notification
            showBonusNotification(result.xp_earned);
        }
    } catch (error) {
        console.error('❌ Error claiming daily bonus:', error);
    }
}

// Show special bonus notification
function showBonusNotification(xpAmount) {
    // Remove any existing notifications
    const existing = document.querySelector('.xp-notification, .xp-bonus-notification');
    if (existing) {
        existing.remove();
    }

    // Create bonus notification
    const notification = document.createElement('div');
    notification.className = 'xp-bonus-notification';
    notification.innerHTML = `
        <div class="xp-bonus-content">
            <div class="xp-bonus-icon">🎉</div>
            <div class="xp-bonus-text">
                <div class="xp-bonus-title">Daily Challenge Complete!</div>
                <div class="xp-bonus-amount">+${xpAmount} XP BONUS</div>
                <div class="xp-bonus-message">You completed all practice sets today!</div>
            </div>
        </div>
    `;

    // Add to body
    document.body.appendChild(notification);

    // Trigger animation
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });

    // Auto-remove after 5 seconds (longer for bonus)
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// Helper function to calculate Quiz XP based on correct answers
function calculateQuizXP(correctAnswers) {
    return correctAnswers * XP_REWARDS.QUIZ_CORRECT;
}

// Export functions for global use
window.XPSystem = {
    showXPNotification,
    awardXP,
    XP_REWARDS,
    calculateQuizXP,
    checkDailyCompletion
};