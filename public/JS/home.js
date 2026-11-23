// Home Page JavaScript
// home.js
// Dashboard - Home Page JavaScript

// Initialize Supabase
const SUPABASE_URL = "https://qtsfceqredvwhwukaugu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0c2ZjZXFyZWR2d2h3dWthdWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDE5NjcsImV4cCI6MjA3ODA3Nzk2N30.iJJ4wcah6BHs_ubjhwG-VU9Nj4XueSq5_Ro4sFm8QF8";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        storage: localStorage
    }
});

// Daily Quotes
const dailyQuotes = [
  "Every day is a fresh start! 🌟",
  "You're doing amazing! Keep going! 💪",
  "Small steps lead to big changes! 🚀",
  "Believe in yourself and shine! ✨",
  "Today is your day to sparkle! 💫",
];

// State Management
let userData = {
  name: '',
  streak: 0,
  badges: [],
  xp: 0,
  todayProgress: {
    learning: 0,
    practice: 0,
    tasks: 0
  }
};

// FIXED: Loading flags to prevent infinite loops
let isLoadingUserData = false;
let isLoadingGamificationData = false;
let isUpdatingLocalStorage = false;

// Get daily quote based on date
function getDailyQuote() {
  const dayOfMonth = new Date().getDate();
  return dailyQuotes[dayOfMonth % dailyQuotes.length];
}

// Load user data from localStorage and Supabase
async function loadUserData() {
  if (isLoadingUserData) return;
  isLoadingUserData = true;
  
  // First, get current user from Supabase session (LIVE DATA)
  let supabaseUserName = null;
  let currentUserEmail = null;
  
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (user) {
      currentUserEmail = user.email;
      // Google OAuth uses full_name, regular signup uses name
      supabaseUserName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0];
      console.log('✅ Supabase user name from session:', supabaseUserName);
      console.log('✅ User email:', currentUserEmail);
      
      // Update localStorage with current user data
      localStorage.setItem('user', JSON.stringify(user));
      
      // IMPORTANT: Always use Supabase name as priority
      userData.name = supabaseUserName;
    }
  } catch (e) {
    console.error('Error getting Supabase session:', e);
  }

  // Try to load from profile storage (but Supabase name has priority)
  const profileData = localStorage.getItem('productivity_hub_user_data');
  if (profileData) {
    try {
      const parsed = JSON.parse(profileData);
      // Only use stored name if no Supabase name
      if (!supabaseUserName) {
        userData.name = parsed.name || 'User';
      }
      userData.streak = parsed.streak || 0;
      userData.badges = parsed.badges || [];
      userData.xp = parsed.xp || 0;
    } catch (e) {
      console.error('Error loading profile data:', e);
    }
  }
  
  // Load progress data from English learning storage
  const savedData = localStorage.getItem('englishLearningState');
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      
      // If the saved email doesn't match current user, clear the old name
      if (parsed.email && currentUserEmail && parsed.email !== currentUserEmail) {
        console.log('⚠️ Email mismatch - clearing old user data');
        // Keep stats but use new name
        userData.streak = parsed.streak || userData.streak || 0;
        userData.badges = parsed.badges || userData.badges || [];
        userData.xp = parsed.xp || userData.xp || 0;
      } else {
        // Only use saved name if no Supabase name
        if (!supabaseUserName) {
          userData.name = parsed.name || 'User';
        }
        userData.streak = parsed.streak || userData.streak || 0;
        userData.badges = parsed.badges || userData.badges || [];
        userData.xp = parsed.xp || userData.xp || 0;
      }
      
      // FIXED: Don't load todayProgress from localStorage - it will be loaded from backend
      // This prevents showing stale data
      userData.todayProgress = {
        learning: 0,
        practice: 0,
        tasks: 0
      };
    } catch (e) {
      console.error('Error loading user data:', e);
    }
  }
  
  // Save updated data with current email
  if (currentUserEmail) {
    saveUserData(currentUserEmail);
  }
  
  isLoadingUserData = false;
}

// Save user data to localStorage
function saveUserData(email = null) {
  if (isUpdatingLocalStorage) return;
  isUpdatingLocalStorage = true;
  
  try {
    const currentData = localStorage.getItem('englishLearningState');
    const parsed = currentData ? JSON.parse(currentData) : {};
    
    const updatedData = {
      ...parsed,
      name: userData.name,
      email: email || parsed.email,
      streak: userData.streak,
      badges: userData.badges,
      xp: userData.xp,
      todayProgress: userData.todayProgress
    };
    
    localStorage.setItem('englishLearningState', JSON.stringify(updatedData));
  } catch (e) {
    console.error('Error saving user data:', e);
  }
  
  isUpdatingLocalStorage = false;
}

// Get display name
function getDisplayName() {
  return userData.name && userData.name.trim() !== '' && userData.name !== 'User' ? userData.name : 'User';
}

// Update the UI with user data
function updateUI() {
  const displayName = getDisplayName();
  
  // Welcome header
  const welcomeTitle = document.getElementById('welcomeTitle');
  if (welcomeTitle) {
    // Get the mascot image element
    const mascotImg = welcomeTitle.querySelector('.mascot-emoji');
    
    if (displayName !== 'User') {
      welcomeTitle.textContent = `Welcome back, ${displayName}! `;
    } else {
      welcomeTitle.textContent = `Welcome back! `;
    }
    
    // Re-append the mascot image after setting text content
    if (mascotImg) {
      welcomeTitle.appendChild(mascotImg);
    }
  }

  // Daily quote
  const dailyQuote = document.getElementById('dailyQuote');
  if (dailyQuote) {
    dailyQuote.textContent = getDailyQuote();
  }

  // Update profile displays
  updateProfileDisplay(displayName);

  // Stats
  const streakValue = document.getElementById('streakValue');
  if (streakValue) {
    streakValue.textContent = `${userData.streak} days`;
  }

  const badgesValue = document.getElementById('badgesValue');
  if (badgesValue) {
    badgesValue.textContent = userData.badges.length;
  }

  const xpValue = document.getElementById('xpValue');
  if (xpValue) {
    xpValue.textContent = userData.xp;
  }

  // FIXED: Progress bars - Only show real backend data
  // NO default values, NO localStorage values
  updateProgressBar('learning', userData.todayProgress.learning || 0);
  updateProgressBar('practice', userData.todayProgress.practice || 0);
  updateProgressBar('tasks', userData.todayProgress.tasks || 0);

  // Badges
  updateBadges();
}

// Update profile displays (navbar and mobile menu)
function updateProfileDisplay(displayName) {
  const initial = displayName.charAt(0).toUpperCase();
  
  // Desktop profile
  const profileInitial = document.getElementById('profile-initial');
  if (profileInitial) {
    profileInitial.textContent = initial;
  }
  
  const topUser = document.getElementById('top-user');
  if (topUser) {
    topUser.textContent = displayName;
  }
  
  // Mobile profile
  const mobileProfileInitial = document.getElementById('mobile-profile-initial');
  if (mobileProfileInitial) {
    mobileProfileInitial.textContent = initial;
  }
  
  const mobileUser = document.getElementById('mobile-user');
  if (mobileUser) {
    mobileUser.textContent = displayName;
  }
}

// Update a progress bar
function updateProgressBar(type, value) {
  const progressText = document.getElementById(`${type}Progress`);
  const progressBar = document.getElementById(`${type}Bar`);

  if (progressText) {
    progressText.textContent = `${Math.round(value)}%`;
  }

  if (progressBar) {
    // FIXED: Set width directly without animation to prevent visual glitches
    // The CSS transition will handle smooth animation
    progressBar.style.width = `${value}%`;
  }
}

// Update badges display
function updateBadges() {
  const badgesContainer = document.getElementById('badgesContainer');
  
  if (!badgesContainer) return;

  if (userData.badges && userData.badges.length > 0) {
    badgesContainer.innerHTML = '';
    
    userData.badges.forEach((badge, index) => {
      const badgeEl = document.createElement('div');
      badgeEl.className = 'badge-item-home';
      badgeEl.style.animationDelay = `${index * 0.1}s`;
      
      // Check if badge is an object or a string
      if (typeof badge === 'object' && badge !== null) {
        const badgeIconHtml = window.BadgeSystem ? window.BadgeSystem.renderBadgeIcon(badge, 'medium') : (badge.icon || '🏆');
        badgeEl.innerHTML = `
          <div class="badge-icon-home">
            ${badgeIconHtml}
          </div>
          <div class="badge-name-home">${badge.name || 'Badge'}</div>
        `;
      } else {
        // Fallback for old string format
        badgeEl.innerHTML = `
          <div class="badge-icon-home">
            🏆
          </div>
          <div class="badge-name-home">${badge}</div>
        `;
      }
      
      badgesContainer.appendChild(badgeEl);
    });
    
    // Initialize Lucide icons after rendering
    if (window.BadgeSystem) {
      window.BadgeSystem.initLucideIcons();
    }
  } else {
    badgesContainer.innerHTML = '<p class="no-badges">Start learning to earn badges! 🎯</p>';
  }
}

// Navigation function
function navigateTo(page) {
  console.log(`Navigating to: ${page}`);
  
  switch(page) {
    case 'learning':
      if (typeof window !== 'undefined') {
        window.location.href = 'learnhome.html';
      }
      break;
    case 'mindcare':
      if (typeof window !== 'undefined') {
        window.location.href = 'breathing.html';
      }
      break;
    default:
      console.log('Unknown page:', page);
  }
}

// Listen for storage changes (if user updates data in another tab)
// FIXED: Only respond to external storage changes, not internal updates
window.addEventListener('storage', async (e) => {
  // Ignore if we're updating localStorage internally
  if (isUpdatingLocalStorage) {
    console.log('⏭️ Ignoring internal localStorage update');
    return;
  }
  
  if (e.key === 'englishLearningState' || e.key === 'productivity_hub_user_data') {
    console.log('🔄 External storage change detected, reloading data...');
    await loadUserData();
    await loadGamificationData();
    updateUI();
  }
});

// FIXED: Refresh data periodically (every 30 seconds)
// But only if not currently loading
setInterval(async () => {
  if (isLoadingUserData || isLoadingGamificationData) {
    console.log('⏭️ Skipping refresh - already loading');
    return;
  }
  
  console.log('🔄 Periodic refresh (30s)');
  await loadUserData();
  await loadGamificationData();
  updateUI();
}, 30000);

// Add animation on scroll (optional enhancement)
function addScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // Observe all cards
  document.querySelectorAll('.stat-card, .progress-card, .badges-card').forEach(card => {
    observer.observe(card);
  });
}

// Update progress based on activities
function updateProgress(type, value) {
  if (userData.todayProgress) {
    userData.todayProgress[type] = Math.min(100, Math.max(0, value));
    saveUserData();
    updateProgressBar(type, userData.todayProgress[type]);
  }
}

// Add a badge
function addBadge(badgeName) {
  if (!userData.badges.includes(badgeName)) {
    userData.badges.push(badgeName);
    saveUserData();
    updateUI();
    
    // Show celebration animation
    showBadgeNotification(badgeName);
  }
}

// Show badge notification
function showBadgeNotification(badgeName) {
  const notification = document.createElement('div');
  notification.className = 'badge-notification';
  notification.innerHTML = `
    <div class="badge-notification-content">
      <h3>New Badge Earned! 🎉</h3>
      <p>${badgeName}</p>
    </div>
  `;
  
  // Add styles for notification
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(to right, #fef3c7, #fed7aa);
    padding: 1.5rem;
    border-radius: 1rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    animation: slideInRight 0.5s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.5s ease-in';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}

// Add CSS for badge notification animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
  
  .badge-notification-content h3 {
    margin-bottom: 0.5rem;
    color: #374151;
  }
  
  .badge-notification-content p {
    color: #6b7280;
    font-size: 1.125rem;
  }
`;
document.head.appendChild(style);

// Mobile menu toggle
function initMobileMenu() {
  const menuBtn = document.getElementById('menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  const menuIcon = document.getElementById('menu-icon');

  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => {
      mobileNav.classList.toggle('show');

      // Re-initialize lucide icons after DOM update
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    });
  }
}

// Initialize the dashboard
async function init() {
  await loadUserData();
  
  // FIXED: Don't update UI until backend data is loaded
  // This prevents showing stale localStorage data
  // updateUI(); // REMOVED - moved to after loadGamificationData
  
  initMobileMenu();
  
  // Add scroll animations
  if ('IntersectionObserver' in window) {
    addScrollAnimations();
  }
  
  // Load real gamification data from backend FIRST
  await loadGamificationData();
  
  // NOW update UI with fresh backend data
  updateUI();
  
  console.log('Dashboard initialized');
  console.log('Current user:', getDisplayName());
}

// Load gamification data (streak, XP, badges, daily progress)
async function loadGamificationData() {
  if (isLoadingGamificationData) return;
  isLoadingGamificationData = true;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      console.log('⚠️ User not logged in, showing default stats');
      // FIXED: Reset to zeros if not logged in
      userData.todayProgress = {
        learning: 0,
        practice: 0,
        tasks: 0
      };
      return;
    }

    const userId = session.user.id;

    // Load stats (XP, streak, lessons, pomodoros)
    const stats = await StatsSystem.getUserStats(userId);
    
    // Update userData
    userData.xp = stats.total_xp || 0;
    userData.streak = stats.streak || 0;
    
    // Load user badges
    const userBadges = await BadgeSystem.getUserBadges(userId);
    const allBadges = await BadgeSystem.getAllBadges();
    
    // Update badges count
    userData.badges = userBadges;
    
    // FIXED: Load daily progress from backend - this is the ONLY source of truth
    const dailyProgress = await StatsSystem.getDailyProgress(userId);
    // IMPORTANT: Correct mapping
    // - learning → lessons_progress (SQL lessons completed)
    // - practice → practice_progress (Practice activities - flashcards, quizzes)
    // - tasks → tasks_progress (Productivity tasks)
    userData.todayProgress = {
      learning: dailyProgress.lessons_progress || 0,
      practice: dailyProgress.practice_progress || 0,
      tasks: dailyProgress.tasks_progress || 0
    };
    
    console.log('📊 Daily progress loaded:', userData.todayProgress);
    
    // FIXED: Update localStorage with flag to prevent infinite loop
    isUpdatingLocalStorage = true;
    const savedData = localStorage.getItem('englishLearningState');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        parsed.todayProgress = userData.todayProgress;
        localStorage.setItem('englishLearningState', JSON.stringify(parsed));
        console.log('💾 localStorage todayProgress synced with backend');
      } catch (e) {
        console.error('Error updating localStorage:', e);
      }
    }
    isUpdatingLocalStorage = false;
    
    // Update UI with loaded data
    updateStatsDisplay(stats, userBadges, allBadges);
    
    // Check for any new badges earned
    await BadgeSystem.checkBadgeEligibility(userId, stats);
    
  } catch (error) {
    console.error('❌ Error loading gamification data:', error);
    // FIXED: Reset to zeros on error
    userData.todayProgress = {
      learning: 0,
      practice: 0,
      tasks: 0
    };
  }
  
  isLoadingGamificationData = false;
}

// Update stats display
function updateStatsDisplay(stats, userBadges, allBadges) {
  // Update streak
  const streakValue = document.getElementById('streakValue');
  if (streakValue) {
    streakValue.textContent = StreakSystem.formatStreak(stats.streak || 0);
  }

  // Update badges count
  const badgesValue = document.getElementById('badgesValue');
  if (badgesValue) {
    badgesValue.textContent = userBadges.length;
  }

  // Update XP
  const xpValue = document.getElementById('xpValue');
  if (xpValue) {
    xpValue.textContent = StatsSystem.formatXP(stats.total_xp || 0);
  }

  // Update progress bars
  const dailyProgress = userData.todayProgress;
  updateProgressBar('learning', dailyProgress.learning || 0);
  updateProgressBar('practice', dailyProgress.practice || 0);
  updateProgressBar('tasks', dailyProgress.tasks || 0);

  // Update badges display
  const badgesContainer = document.getElementById('badgesContainer');
  if (badgesContainer && allBadges.length > 0) {
    if (userBadges.length > 0) {
      badgesContainer.innerHTML = '';
      
      // Show only earned badges on home page
      userBadges.forEach((badge, index) => {
        const badgeEl = document.createElement('div');
        badgeEl.className = 'badge-item-home';
        badgeEl.style.animationDelay = `${index * 0.1}s`;
        const badgeIconHtml = window.BadgeSystem ? window.BadgeSystem.renderBadgeIcon(badge, 'medium') : (badge.icon || '🏆');
        badgeEl.innerHTML = `
          <div class="badge-icon-home">
            ${badgeIconHtml}
          </div>
          <div class="badge-name-home">${badge.name}</div>
        `;
        badgesContainer.appendChild(badgeEl);
      });
      
      // Initialize Lucide icons after rendering
      if (window.BadgeSystem) {
        window.BadgeSystem.initLucideIcons();
      }
    } else {
      badgesContainer.innerHTML = '<p class="no-badges">Start learning to earn badges! 🎯</p>';
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose functions globally for HTML onclick handlers
window.navigateTo = navigateTo;
window.updateProgress = updateProgress;
window.addBadge = addBadge;