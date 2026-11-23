// ============================================
// DAILY AFFIRMATIONS - JAVASCRIPT
// Fetch quotes and affirmations from Supabase
// ============================================

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

if (menuBtn && mobileNav) {
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    mobileNav.classList.toggle('active');
    console.log('🔘 Mobile menu toggled:', mobileNav.classList.contains('active'));
  });
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
  if (mobileNav && mobileNav.classList.contains('active')) {
    if (!mobileNav.contains(e.target) && menuBtn && !menuBtn.contains(e.target)) {
      mobileNav.classList.remove('active');
      console.log('🔘 Mobile menu closed (clicked outside)');
    }
  }
});

// Close mobile menu when clicking a link
const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
mobileNavLinks.forEach(link => {
  link.addEventListener('click', () => {
    if (mobileNav) {
      mobileNav.classList.remove('active');
      console.log('🔘 Mobile menu closed (link clicked)');
    }
  });
});

// ============================================
// LOAD QUOTES FROM SUPABASE
// ============================================

async function loadQuoteFromSupabase() {
  try {
    console.log('📖 Loading quote from Supabase...');

    // First, check if there's a scheduled quote for today
    const today = new Date().toISOString().split('T')[0];
    
    const { data: scheduledQuote, error: scheduledError } = await supabase
      .from('daily_quotes')
      .select('*')
      .eq('status', 'active')
      .eq('scheduled_date', today)
      .limit(1);

    if (scheduledError) {
      console.error('Error checking scheduled quote:', scheduledError);
    }

    // If there's a scheduled quote for today, use it
    if (scheduledQuote && scheduledQuote.length > 0) {
      displayQuote(scheduledQuote[0]);
      console.log('✅ Displaying scheduled quote for today');
      return;
    }

    // Otherwise, fetch random active quotes
    const { data: quotes, error } = await supabase
      .from('daily_quotes')
      .select('*')
      .eq('status', 'active');

    if (error) {
      throw error;
    }

    if (quotes && quotes.length > 0) {
      // Pick a random quote
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      displayQuote(randomQuote);
      console.log('✅ Quote loaded from Supabase:', randomQuote);
    } else {
      console.warn('⚠️ No active quotes found in database');
      displayFallbackQuote();
    }
  } catch (error) {
    console.error('❌ Error loading quote:', error);
    displayFallbackQuote();
  }
}

function displayQuote(quote) {
  const quoteText = document.getElementById('quoteText');
  const quoteAuthor = document.getElementById('quoteAuthor');
  
  if (quoteText) {
    quoteText.textContent = `"${quote.text}"`;
  }
  
  if (quoteAuthor) {
    quoteAuthor.textContent = quote.author ? `— ${quote.author}` : '';
  }
}

function displayFallbackQuote() {
  const quoteText = document.getElementById('quoteText');
  const quoteAuthor = document.getElementById('quoteAuthor');
  
  if (quoteText) {
    quoteText.textContent = '"The future belongs to those who believe in the beauty of their dreams."';
  }
  
  if (quoteAuthor) {
    quoteAuthor.textContent = '— Eleanor Roosevelt';
  }
}

// ============================================
// LOAD AFFIRMATIONS FROM SUPABASE
// ============================================

async function loadAffirmationsFromSupabase() {
  try {
    console.log('✨ Loading affirmations from Supabase...');

    // First, check if there are scheduled affirmations for today
    const today = new Date().toISOString().split('T')[0];
    
    const { data: scheduledAffirmations, error: scheduledError } = await supabase
      .from('daily_affirmations')
      .select('*')
      .eq('status', 'active')
      .eq('scheduled_date', today)
      .limit(5);

    if (scheduledError) {
      console.error('Error checking scheduled affirmations:', scheduledError);
    }

    // If there are scheduled affirmations for today, use them
    if (scheduledAffirmations && scheduledAffirmations.length > 0) {
      displayAffirmations(scheduledAffirmations);
      console.log('✅ Displaying scheduled affirmations for today');
      return;
    }

    // Otherwise, fetch random active affirmations
    const { data: affirmations, error } = await supabase
      .from('daily_affirmations')
      .select('*')
      .eq('status', 'active');

    if (error) {
      throw error;
    }

    if (affirmations && affirmations.length > 0) {
      // Shuffle and take 5 random affirmations
      const shuffled = affirmations.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 5);
      
      displayAffirmations(selected);
      console.log('✅ Affirmations loaded from Supabase:', selected);
    } else {
      console.warn('⚠️ No active affirmations found in database');
      displayFallbackAffirmations();
    }
  } catch (error) {
    console.error('❌ Error loading affirmations:', error);
    displayFallbackAffirmations();
  }
}

function displayAffirmations(affirmations) {
  const affirmationsList = document.getElementById('affirmationsList');
  
  if (!affirmationsList) return;

  affirmationsList.innerHTML = affirmations.map((affirmation, index) => `
    <div class="affirmation-item" style="animation-delay: ${index * 0.1}s">
      <i data-lucide="sparkles" class="affirmation-icon"></i>
      <p>${affirmation.text}</p>
    </div>
  `).join('');
  
  // Reinitialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function displayFallbackAffirmations() {
  const fallbackAffirmations = [
    'I am capable of achieving my goals',
    'Every challenge is an opportunity to grow',
    'I believe in my ability to learn and improve',
    'I am worthy of success and happiness',
    'I embrace progress over perfection'
  ];
  
  displayAffirmations(fallbackAffirmations.map(text => ({ text })));
}

// ============================================
// CARD ANIMATIONS
// ============================================

// Add hover animations to cards
function initCardAnimations() {
  const cards = document.querySelectorAll('.card');
  
  cards.forEach((card, index) => {
    // Add ripple effect on click
    card.addEventListener('click', function(e) {
      const ripple = document.createElement('div');
      ripple.style.position = 'absolute';
      ripple.style.borderRadius = '50%';
      ripple.style.background = 'rgba(168, 85, 247, 0.3)';
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
}

// Add ripple animation keyframes
function addRippleAnimation() {
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
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initializing Daily Affirmations...');
  
  try {
    // Load user profile from Supabase
    await loadUserProfile();
    
    // Load quote and affirmations from Supabase
    await loadQuoteFromSupabase();
    await loadAffirmationsFromSupabase();
    
    // Initialize card animations
    initCardAnimations();
    addRippleAnimation();
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    
    console.log('✅ Daily Affirmations initialized successfully');
  } catch (error) {
    console.error('❌ Error during initialization:', error);
  }
});

// Re-initialize Lucide icons after dynamic updates
function refreshIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}