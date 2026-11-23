// MindHome JavaScript - MindCare Dashboard

// ============================================
// SUPABASE INITIALIZATION
// ============================================
const SUPABASE_URL = "https://qtsfceqredvwhwukaugu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0c2ZjZXFyZWR2d2h3dWthdWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDE5NjcsImV4cCI6MjA3ODA3Nzk2N30.iJJ4wcah6BHs_ubjhwG-VU9Nj4XueSq5_Ro4sFm8QF8";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storage: localStorage
  }
});

// ============================================
// USER SESSION & PROFILE
// ============================================

// Load user data from Supabase session
async function loadUserProfile() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (user) {
      // Get username from Supabase
      const userName = user.user_metadata?.full_name || 
                       user.user_metadata?.name || 
                       user.email?.split('@')[0] || 
                       'User';
      
      // Get first initial for avatar
      const firstInitial = userName.charAt(0).toUpperCase();
      
      console.log('✅ User logged in:', userName);
      
      // Update desktop profile
      const topUser = document.getElementById('top-user');
      const profileInitial = document.getElementById('profile-initial');
      
      if (topUser) topUser.textContent = userName;
      if (profileInitial) profileInitial.textContent = firstInitial;
      
      // Update mobile profile
      const mobileUser = document.getElementById('mobile-user');
      const mobileInitial = document.getElementById('mobile-profile-initial');
      
      if (mobileUser) mobileUser.textContent = userName;
      if (mobileInitial) mobileInitial.textContent = firstInitial;
      
      return { userName, firstInitial, user };
    } else {
      console.log('⚠️ No user session found');
      setGuestProfile();
      return null;
    }
  } catch (error) {
    console.error('❌ Error loading user profile:', error);
    setGuestProfile();
    return null;
  }
}

// Set guest profile if no user logged in
function setGuestProfile() {
  const topUser = document.getElementById('top-user');
  const profileInitial = document.getElementById('profile-initial');
  const mobileUser = document.getElementById('mobile-user');
  const mobileInitial = document.getElementById('mobile-profile-initial');
  
  if (topUser) topUser.textContent = 'Guest';
  if (profileInitial) profileInitial.textContent = 'G';
  if (mobileUser) mobileUser.textContent = 'Guest';
  if (mobileInitial) mobileInitial.textContent = 'G';
}

// ============================================
// MOBILE MENU TOGGLE
// ============================================

const menuBtn = document.getElementById('menu-btn');
const mobileNav = document.getElementById('mobile-nav');

if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    mobileNav.classList.toggle('active');
  });
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
  if (mobileNav && mobileNav.classList.contains('active')) {
    if (!mobileNav.contains(e.target) && !menuBtn.contains(e.target)) {
      mobileNav.classList.remove('active');
    }
  }
});

// ============================================
// CARD ANIMATIONS
// ============================================

// Add hover animations to cards
const cards = document.querySelectorAll('.card');

cards.forEach((card, index) => {
  // Stagger animation on page load
  card.style.animation = `fadeInUp 0.5s ease-out ${index * 0.1}s both`;
  
  // Add ripple effect on click
  card.addEventListener('click', function(e) {
    const ripple = document.createElement('div');
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.background = 'rgba(255, 255, 255, 0.6)';
    ripple.style.width = '20px';
    ripple.style.height = '20px';
    ripple.style.animation = 'ripple 0.6s ease-out';
    ripple.style.pointerEvents = 'none';
    
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ripple.style.left = x - 10 + 'px';
    ripple.style.top = y - 10 + 'px';
    
    card.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  });
});

// Add ripple animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple {
    to {
      transform: scale(20);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// ============================================
// INITIALIZATION
// ============================================

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Load user profile from Supabase
  await loadUserProfile();
  
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  console.log('✅ MindHome initialized successfully');
});

// Re-initialize Lucide icons after dynamic updates
function refreshIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}
