// profile.js
// Profile page JavaScript - integrated with gamification systems
// Initialize Supabase
const SUPABASE_URL = "https://qtsfceqredvwhwukaugu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0c2ZjZXFyZWR2d2h3dWthdWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDE5NjcsImV4cCI6MjA3ODA3Nzk2N30.iJJ4wcah6BHs_ubjhwG-VU9Nj4XueSq5_Ro4sFm8QF8";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        storage: localStorage
    }
});

// User Data Management
const STORAGE_KEY = 'productivity_hub_user_data';

// Default user data (profile-specific only, not gamification data)
let userData = {
    name: 'User',
    bio: 'Keep up the amazing work! 🌟',
    avatarColor: 0,
    profilePicture: null,
    pomodoroCount: 0,
};

// Gamification data (fetched from gamification systems)
let gamificationData = {
    streak: 0,
    badges: [],
    badgeCount: 0,
    xp: 0
};

// Avatar color classes
const avatarColors = [
    'color-purple-pink',
    'color-blue-cyan',
    'color-pink-rose',
    'color-green-emerald',
    'color-yellow-orange',
    'color-indigo-purple',
];

// Load user data from localStorage and Supabase
async function loadUserData() {
    // First, get current user from Supabase session (LIVE DATA)
    let supabaseUserName = null;
    let currentUserEmail = null;
    let currentUserId = null;
    
    try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        
        if (user) {
            currentUserId = user.id;
            currentUserEmail = user.email;
            // Google OAuth uses full_name, regular signup uses name
            supabaseUserName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0];
            console.log('✅ Supabase user name from session:', supabaseUserName);
            
            // Update localStorage with current user data
            localStorage.setItem('user', JSON.stringify(user));
            
            // IMPORTANT: Always use Supabase name as priority
            userData.name = supabaseUserName;
            
            // FIXED: Load profile data from Supabase user_profiles table
            await loadProfileFromSupabase(currentUserId);
            
            // Load gamification data from the new systems
            await loadGamificationData(currentUserId);
        } else {
            console.warn('⚠️ No active Supabase session');
        }
    } catch (error) {
        console.error('Error getting Supabase session:', error);
    }
    
    renderProfile();
}

// FIXED: Load profile data from Supabase user_profiles table
async function loadProfileFromSupabase(userId) {
    try {
        console.log('🔄 Loading profile from Supabase for user:', userId);
        
        // Get user profile from Supabase
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('profile_picture_url, avatar_color, bio')
            .eq('id', userId)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                // No profile exists yet, create one
                console.log('📝 No profile found, creating new profile...');
                const { data: newProfile, error: insertError } = await supabase
                    .from('user_profiles')
                    .insert({
                        id: userId,
                        profile_picture_url: null,
                        avatar_color: 0,
                        bio: 'Keep up the amazing work! 🌟'
                    })
                    .select()
                    .single();
                
                if (insertError) {
                    console.error('❌ Error creating profile:', insertError);
                } else {
                    console.log('✅ Profile created:', newProfile);
                    userData.profilePicture = null;
                    userData.avatarColor = 0;
                    userData.bio = 'Keep up the amazing work! 🌟';
                }
            } else {
                console.error('❌ Error loading profile:', error);
            }
        } else {
            // Profile found, update userData
            console.log('✅ Profile loaded from Supabase:', profile);
            userData.profilePicture = profile.profile_picture_url;
            userData.avatarColor = profile.avatar_color !== null ? profile.avatar_color : 0;
            userData.bio = profile.bio || 'Keep up the amazing work! 🌟';
        }
    } catch (error) {
        console.error('❌ Error in loadProfileFromSupabase:', error);
    }
}

// Load gamification data from the new systems
async function loadGamificationData(userId) {
    try {
        // Get user stats (includes all data)
        if (window.StatsSystem) {
            const stats = await window.StatsSystem.getUserStats(userId);
            gamificationData.xp = stats.total_xp || 0;
            gamificationData.streak = stats.streak || 0;
            // FIXED: Load pomodoro count from backend stats instead of localStorage
            userData.pomodoroCount = stats.pomodoros || 0;
            console.log('✅ Loaded stats - XP:', gamificationData.xp, 'Streak:', gamificationData.streak, 'Pomodoros:', userData.pomodoroCount);
        }
        
        // Get user badges
        if (window.BadgeSystem) {
            const badgesData = await window.BadgeSystem.getUserBadges(userId);
            gamificationData.badges = badgesData || [];
            gamificationData.badgeCount = badgesData.length;
            console.log('✅ Loaded badges:', gamificationData.badgeCount);
        }
    } catch (error) {
        console.error('Error loading gamification data:', error);
    }
}

// Save user data to localStorage (profile-specific only)
function saveUserData() {
    try {
        // Only save profile-specific data, not gamification data
        const profileData = {
            name: userData.name,
            bio: userData.bio,
            avatarColor: userData.avatarColor,
            profilePicture: userData.profilePicture,
            pomodoroCount: userData.pomodoroCount
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profileData));
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

// Update user data
function updateUserData(updates) {
    userData = { ...userData, ...updates };
    saveUserData();
    
    // FIXED: Also save to Supabase if profile picture, bio, or avatar color changed
    if (updates.profilePicture !== undefined || updates.bio !== undefined || updates.avatarColor !== undefined) {
        saveProfileToSupabase();
    }
    
    renderProfile();
}

// FIXED: Save profile data to Supabase
async function saveProfileToSupabase() {
    try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        
        if (!user) {
            console.warn('⚠️ No user session, cannot save to Supabase');
            return;
        }
        
        console.log('💾 Saving profile to Supabase for user:', user.id);
        
        // Update user profile in Supabase
        const { data, error } = await supabase
            .from('user_profiles')
            .update({
                profile_picture_url: userData.profilePicture,
                avatar_color: userData.avatarColor,
                bio: userData.bio
            })
            .eq('id', user.id)
            .select();
        
        if (error) {
            console.error('❌ Error saving profile to Supabase:', error);
        } else {
            console.log('✅ Profile saved to Supabase:', data);
        }
    } catch (error) {
        console.error('❌ Error in saveProfileToSupabase:', error);
    }
}

// Get initials from name
function getInitials(name) {
    if (!name || name === 'User') return 'U';
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// Render profile
function renderProfile() {
    // Update name with mascot image
    const profileNameElement = document.getElementById('profile-name');
    profileNameElement.innerHTML = `
        ${userData.name || 'User'} 
        <img src="./asset/loginimage.png" alt="✨" class="name-mascot" />
    `;
    
    // Update bio
    document.getElementById('profile-bio').textContent = userData.bio || 'Keep up the amazing work! 🌟';
    
    // Update avatar
    const avatar = document.getElementById('avatar');
    const avatarInitials = document.getElementById('avatar-initials');
    const avatarImage = document.getElementById('avatar-image');
    
    // Remove all color classes
    avatarColors.forEach(color => avatar.classList.remove(color));
    
    // Add current color class
    avatar.classList.add(avatarColors[userData.avatarColor || 0]);
    
    // Update initials
    avatarInitials.textContent = getInitials(userData.name);
    
    // Update profile picture
    if (userData.profilePicture) {
        avatarImage.src = userData.profilePicture;
        avatarImage.style.display = 'block';
        avatarInitials.style.display = 'none';
    } else {
        avatarImage.style.display = 'none';
        avatarInitials.style.display = 'block';
    }
    
    // Update stats with gamification data
    document.getElementById('stat-streak').textContent = gamificationData.streak || 0;
    document.getElementById('stat-badges').textContent = gamificationData.badgeCount || 0;
    document.getElementById('stat-xp').textContent = gamificationData.xp || 0;
    document.getElementById('stat-pomodoros').textContent = userData.pomodoroCount || 0;
    
    // Render badges
    renderBadges();
}

// Render badges
function renderBadges() {
    const badgesContainer = document.getElementById('badges-container');
    const noBadges = document.getElementById('no-badges');
    
    if (gamificationData.badges && gamificationData.badges.length > 0) {
        badgesContainer.innerHTML = '';
        badgesContainer.style.display = 'grid';
        noBadges.style.display = 'none';
        
        gamificationData.badges.forEach((badge, index) => {
            const badgeDiv = document.createElement('div');
            badgeDiv.className = 'badge-item';
            badgeDiv.style.animationDelay = `${index * 0.05}s`;
            
            const badgeIconHtml = window.BadgeSystem ? window.BadgeSystem.renderBadgeIcon(badge, 'large') : (badge.icon || '🏆');
            
            badgeDiv.innerHTML = `
                <div class="badge-emoji">${badgeIconHtml}</div>
                <p class="badge-name">${badge.name}</p>
                <p class="badge-description">${badge.description || ''}</p>
                <p class="badge-date">Earned: ${new Date(badge.earned_at).toLocaleDateString()}</p>
            `;
            
            badgesContainer.appendChild(badgeDiv);
        });
        
        // Initialize Lucide icons after rendering
        if (window.BadgeSystem) {
            window.BadgeSystem.initLucideIcons();
        }
    } else {
        badgesContainer.style.display = 'none';
        noBadges.style.display = 'block';
    }
}

// Edit Profile
function enterEditMode() {
    document.getElementById('view-mode').style.display = 'none';
    document.getElementById('edit-mode').style.display = 'block';
    
    // FIXED: Show camera icon in edit mode
    document.body.classList.add('edit-mode-active');
    
    // Populate form
    document.getElementById('name-input').value = userData.name || '';
    document.getElementById('bio-input').value = userData.bio || '';
    
    // Update color picker
    updateColorPicker();
}

function exitEditMode() {
    document.getElementById('view-mode').style.display = 'block';
    document.getElementById('edit-mode').style.display = 'none';
    
    // FIXED: Hide camera icon when exiting edit mode
    document.body.classList.remove('edit-mode-active');
}

function updateColorPicker() {
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach((option, index) => {
        if (index === userData.avatarColor) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

function saveProfile() {
    const name = document.getElementById('name-input').value.trim();
    const bio = document.getElementById('bio-input').value.trim();
    
    if (!name) {
        alert('Please enter your name! 😊');
        return;
    }
    
    updateUserData({
        name,
        bio: bio || 'Keep up the amazing work! 🌟',
    });
    
    exitEditMode();
}

// Profile Picture Upload
function handleProfilePicture(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file! 📸');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB! 📏');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        updateUserData({
            profilePicture: e.target.result,
        });
    };
    reader.readAsDataURL(file);
    
    // Clear the input so the same file can be selected again
    event.target.value = '';
}

// FIXED: Remove profile picture
function removeProfilePicture() {
    updateUserData({
        profilePicture: null,
    });
}

// Settings
function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    if (panel.style.display === 'none') {
        panel.style.display = 'flex';
    } else {
        panel.style.display = 'none';
    }
}

function resetProgress() {
    if (confirm('⚠️ RESET ALL PROGRESS & GAMIFICATION DATA?\n\nThis will reset EVERYTHING:\n• Total XP (learning paths)\n• Practice XP\n• Streak count\n• All badges (will be locked again)\n• Pomodoro count\n• Daily progress values\n• All completed lessons\n• Practice progress\n• Study Tracker (all sessions & categories)\n• Productivity tasks\n• Mood Dashboard (all check-ins & analytics)\n• Mood Quiz Results (all completed quizzes)\n\nThis cannot be undone! Are you absolutely sure?')) {
        
        // Get current user ID
        supabase.auth.getSession().then(async ({ data: sessionData }) => {
            const user = sessionData?.session?.user;
            if (!user) {
                alert('No user session found!');
                return;
            }
            
            try {
                // FIXED: Call the reset API endpoint with reset_type='all' to reset EVERYTHING
                console.log('🔄 Calling reset API for user:', user.id);
                const response = await fetch('/api/progress/reset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: user.id,
                        reset_type: 'all'  // Reset ALL gamification data
                    })
                });
                
                const result = await response.json();
                console.log('✅ Reset API response:', result);
                
                if (result.success) {
                    // Clear all localStorage data
                    const englishLearningState = localStorage.getItem('englishLearningState');
                    if (englishLearningState) {
                        try {
                            const parsed = JSON.parse(englishLearningState);
                            // Reset all gamification fields
                            parsed.completedLessons = {};
                            parsed.streak = 0;
                            parsed.badges = [];
                            parsed.xp = 0;
                            parsed.todayProgress = {
                                learning: 0,
                                practice: 0,
                                tasks: 0
                            };
                            localStorage.setItem('englishLearningState', JSON.stringify(parsed));
                        } catch (e) {
                            console.error('Error updating localStorage:', e);
                        }
                    }
                    
                    
                    // Clear student and professional localStorage
                    localStorage.removeItem('studentLearningState');
                    localStorage.removeItem('professionalLearningState');
                    
                    // FIXED: Also clear user-specific learning state keys
                    localStorage.removeItem(`studentLearningState_${user.id}`);
                    localStorage.removeItem(`professionalLearningState_${user.id}`);
                    
                    // Clear profile data (keep name and avatar, reset pomodoro)
                    const profileData = localStorage.getItem('productivity_hub_user_data');
                    if (profileData) {
                        try {
                            const parsed = JSON.parse(profileData);
                            parsed.pomodoroCount = 0;
                            parsed.streak = 0;
                            parsed.badges = [];
                            parsed.xp = 0;
                            localStorage.setItem('productivity_hub_user_data', JSON.stringify(parsed));
                        } catch (e) {
                            console.error('Error updating profile data:', e);
                        }
                    }
                    
                    alert('✅ All progress and gamification data has been reset successfully! 🔄\n\nYou can start fresh now.');
                    
                    // Reload gamification data to show zeros
                    await loadGamificationData(user.id);
                    renderProfile();
                    
                    // Reload the page after 2 seconds to ensure everything is refreshed
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    alert('❌ Error resetting progress: ' + result.error);
                }
            } catch (error) {
                console.error('Error resetting progress:', error);
                alert('❌ Failed to reset progress. Please try again.');
            }
        });
    }
}

function resetBreathingData() {
    if (confirm('⚠️ RESET BREATHING DATA?\n\nThis will reset:\n• Breathing sessions\n• Breathing progress\n\nThis cannot be undone! Are you absolutely sure?')) {
        
        // Get current user ID
        supabase.auth.getSession().then(async ({ data: sessionData }) => {
            const user = sessionData?.session?.user;
            if (!user) {
                alert('No user session found!');
                return;
            }
            
            try {
                // Call the reset API endpoint with reset_type='breathing' to reset breathing data
                console.log('🔄 Calling reset API for user:', user.id);
                const response = await fetch('/api/progress/reset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: user.id,
                        reset_type: 'breathing'  // Reset breathing data
                    })
                });
                
                const result = await response.json();
                console.log('✅ Reset API response:', result);
                
                if (result.success) {
                    // Clear breathing data in localStorage
                    const englishLearningState = localStorage.getItem('englishLearningState');
                    if (englishLearningState) {
                        try {
                            const parsed = JSON.parse(englishLearningState);
                            // Reset breathing fields
                            parsed.breathingSessions = 0;
                            parsed.breathingProgress = 0;
                            localStorage.setItem('englishLearningState', JSON.stringify(parsed));
                        } catch (e) {
                            console.error('Error updating localStorage:', e);
                        }
                    }
                    
                    alert('✅ Breathing data has been reset successfully! 🔄\n\nYou can start fresh now.');
                    
                    // Reload gamification data to show zeros
                    await loadGamificationData(user.id);
                    renderProfile();
                    
                    // Reload the page after 2 seconds to ensure everything is refreshed
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    alert('❌ Error resetting progress: ' + result.error);
                }
            } catch (error) {
                console.error('Error resetting progress:', error);
                alert('❌ Failed to reset progress. Please try again.');
            }
        });
    }
}

function resetSelfcareData() {
    if (confirm('⚠️ RESET SELFCARE DATA?\n\nThis will reset:\n• Selfcare sessions\n• Selfcare progress\n\nThis cannot be undone! Are you absolutely sure?')) {
        
        // Get current user ID
        supabase.auth.getSession().then(async ({ data: sessionData }) => {
            const user = sessionData?.session?.user;
            if (!user) {
                alert('No user session found!');
                return;
            }
            
            try {
                // Call the reset API endpoint with reset_type='selfcare' to reset selfcare data
                console.log('🔄 Calling reset API for user:', user.id);
                const response = await fetch('/api/progress/reset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: user.id,
                        reset_type: 'selfcare'  // Reset selfcare data
                    })
                });
                
                const result = await response.json();
                console.log('✅ Reset API response:', result);
                
                if (result.success) {
                    // Clear selfcare data in localStorage
                    const englishLearningState = localStorage.getItem('englishLearningState');
                    if (englishLearningState) {
                        try {
                            const parsed = JSON.parse(englishLearningState);
                            // Reset selfcare fields
                            parsed.selfcareSessions = 0;
                            parsed.selfcareProgress = 0;
                            localStorage.setItem('englishLearningState', JSON.stringify(parsed));
                        } catch (e) {
                            console.error('Error updating localStorage:', e);
                        }
                    }
                    
                    alert('✅ Selfcare data has been reset successfully! 🔄\n\nYou can start fresh now.');
                    
                    // Reload gamification data to show zeros
                    await loadGamificationData(user.id);
                    renderProfile();
                    
                    // Reload the page after 2 seconds to ensure everything is refreshed
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    alert('❌ Error resetting progress: ' + result.error);
                }
            } catch (error) {
                console.error('Error resetting progress:', error);
                alert('❌ Failed to reset progress. Please try again.');
            }
        });
    }
}

function resetJournalData() {
    if (confirm('⚠️ RESET JOURNAL DATA?\n\nThis will reset:\n• Journal entries\n• Journal progress\n\nThis cannot be undone! Are you absolutely sure?')) {
        
        // Get current user ID
        supabase.auth.getSession().then(async ({ data: sessionData }) => {
            const user = sessionData?.session?.user;
            if (!user) {
                alert('No user session found!');
                return;
            }
            
            try {
                // Call the reset API endpoint with reset_type='journal' to reset journal data
                console.log('🔄 Calling reset API for user:', user.id);
                const response = await fetch('/api/progress/reset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: user.id,
                        reset_type: 'journal'  // Reset journal data
                    })
                });
                
                const result = await response.json();
                console.log('✅ Reset API response:', result);
                
                if (result.success) {
                    // Clear journal data in localStorage
                    const englishLearningState = localStorage.getItem('englishLearningState');
                    if (englishLearningState) {
                        try {
                            const parsed = JSON.parse(englishLearningState);
                            // Reset journal fields
                            parsed.journalEntries = [];
                            parsed.journalProgress = 0;
                            localStorage.setItem('englishLearningState', JSON.stringify(parsed));
                        } catch (e) {
                            console.error('Error updating localStorage:', e);
                        }
                    }
                    
                    alert('✅ Journal data has been reset successfully! 🔄\n\nYou can start fresh now.');
                    
                    // Reload gamification data to show zeros
                    await loadGamificationData(user.id);
                    renderProfile();
                    
                    // Reload the page after 2 seconds to ensure everything is refreshed
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    alert('❌ Error resetting progress: ' + result.error);
                }
            } catch (error) {
                console.error('Error resetting progress:', error);
                alert('❌ Failed to reset progress. Please try again.');
            }
        });
    }
}

function logout() {
    if (confirm('Are you sure you want to logout? 👋')) {
        // In a real app, this would redirect to login page
        alert('Logout functionality would redirect to login page! 🚪');
        window.location.href = 'login.html';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async function() {
    // Load initial data
    await loadUserData();
    
    // Set up auto-refresh for gamification data every 30 seconds
    setInterval(async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (user) {
            await loadGamificationData(user.id);
            renderProfile();
        }
    }, 30000);
    
    // Edit profile button
    document.getElementById('edit-profile-btn').addEventListener('click', enterEditMode);
    
    // Save profile button
    document.getElementById('save-profile-btn').addEventListener('click', saveProfile);
    
    // Cancel edit button
    document.getElementById('cancel-edit-btn').addEventListener('click', exitEditMode);
    
    // Color picker
    document.querySelectorAll('.color-option').forEach((option, index) => {
        option.addEventListener('click', function() {
            userData.avatarColor = index;
            updateColorPicker();
        });
    });
    
    // Avatar edit button
    document.getElementById('avatar-edit-btn').addEventListener('click', function() {
        document.getElementById('profile-pic-input').click();
    });
    
    // Profile picture input
    document.getElementById('profile-pic-input').addEventListener('change', handleProfilePicture);
    
    // FIXED: Change profile picture button (in edit mode)
    document.getElementById('change-pic-btn').addEventListener('click', function() {
        document.getElementById('profile-pic-input').click();
    });
    
    // FIXED: Remove profile picture button (in edit mode)
    document.getElementById('remove-pic-btn').addEventListener('click', removeProfilePicture);
    
    // Settings toggle
    document.getElementById('toggle-settings-btn').addEventListener('click', toggleSettings);
    
    // Reset progress
    document.getElementById('reset-progress-btn').addEventListener('click', resetProgress);
    
    // Individual reset buttons
    document.getElementById('reset-breathing-btn').addEventListener('click', resetBreathingData);
    document.getElementById('reset-selfcare-btn').addEventListener('click', resetSelfcareData);
    document.getElementById('reset-journal-btn').addEventListener('click', resetJournalData);
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);
});

// Public API for other pages to update user data
window.ProfileAPI = {
    getUserData: () => ({ ...userData, ...gamificationData }),
    updateUserData: updateUserData,
    refreshGamificationData: async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (user) {
            await loadGamificationData(user.id);
            renderProfile();
        }
    },
    incrementPomodoro: () => {
        userData.pomodoroCount = (userData.pomodoroCount || 0) + 1;
        saveUserData();
        renderProfile();
    },
};