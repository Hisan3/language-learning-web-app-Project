// ============================================
// JOURNAL APP - MAIN PAGE (journal.html)
// ============================================

// Initialize Supabase
const SUPABASE_URL = "https://qtsfceqredvwhwukaugu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0c2ZjZXFyZWR2d2h3dWthdWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDE5NjcsImV4cCI6MjA3ODA3Nzk2N30.iJJ4wcah6BHs_ubjhwG-VU9Nj4XueSq5_Ro4sFm8QF8";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storage: localStorage
  }
});

console.log('📔 Journal main page initialized');

// State
let currentUser = null;
let currentUserId = null;
let selectedMood = null;

// ============================================
// USER AUTHENTICATION
// ============================================

async function checkUserAuth() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return false;
    }
    
    if (session?.user) {
      currentUser = session.user;
      currentUserId = session.user.id;
      console.log('✅ User authenticated:', currentUser.email);
      return true;
    } else {
      console.log('⚠️ No user session');
      return false;
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✅' : '❌';
  toast.innerHTML = `<span style="font-size: 1.2rem;">${icon}</span> <span>${message}</span>`;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================
// LOADING STATE
// ============================================

function setButtonLoading(buttonId, loading = true) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  
  button.disabled = loading;
  
  if (loading) {
    button.dataset.originalHtml = button.innerHTML;
    button.style.opacity = '0.7';
    button.innerHTML = '<span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> Saving...';
  } else {
    button.style.opacity = '1';
    button.innerHTML = button.dataset.originalHtml || button.innerHTML;
  }
}

// ============================================
// DATE DISPLAY
// ============================================

function displayCurrentDate() {
  const dateDisplay = document.getElementById('currentDate');
  if (!dateDisplay) return;
  
  const now = new Date();
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  dateDisplay.textContent = now.toLocaleDateString('en-US', options);
}

// ============================================
// MOOD SELECTION
// ============================================

function initializeMoodSelector() {
  const moodButtons = document.querySelectorAll('.emotion-btn');
  
  moodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      moodButtons.forEach(b => b.classList.remove('active'));
      
      // Add active class to clicked button
      btn.classList.add('active');
      
      // Store selected mood
      selectedMood = btn.dataset.mood;
      
      console.log('Selected mood:', selectedMood);
    });
  });
}

// ============================================
// SAVE ENTRY
// ============================================

function initializeSaveEntry() {
  const saveButton = document.getElementById('saveEntry');
  if (!saveButton) return;
  
  saveButton.addEventListener('click', async () => {
    // Check authentication
    if (!currentUserId) {
      showToast('Please log in to save entries', 'error');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
      return;
    }
    
    const titleInput = document.getElementById('entryTitle');
    const contentInput = document.getElementById('entryContent');
    
    const title = titleInput?.value.trim() || '';
    const content = contentInput?.value.trim() || '';

    // Validation
    if (!content) {
      showToast('Please write something in your journal', 'error');
      contentInput?.focus();
      return;
    }

    if (!selectedMood) {
      showToast('Please select how you\'re feeling', 'error');
      return;
    }

    // Show loading
    setButtonLoading('saveEntry', true);

    try {
      // Create entry object
      const entryData = {
        user_id: currentUserId,
        mood: selectedMood,
        title: title || 'Untitled Entry',
        content: content
      };

      // Save to Supabase
      const { data, error } = await supabase
        .from('journal_entries')
        .insert([entryData])
        .select();
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('✅ Entry saved:', data);
      showToast('Journal entry saved! 📔', 'success');
      
      // Clear form
      clearEntryForm();
      
    } catch (error) {
      console.error('Error saving entry:', error);
      showToast('Failed to save entry. Please try again.', 'error');
    } finally {
      setButtonLoading('saveEntry', false);
    }
  });
}

// ============================================
// CLEAR ENTRY
// ============================================

function initializeClearEntry() {
  const clearButton = document.getElementById('clearEntry');
  if (!clearButton) return;
  
  clearButton.addEventListener('click', () => {
    const titleInput = document.getElementById('entryTitle');
    const contentInput = document.getElementById('entryContent');
    
    const hasContent = (titleInput?.value || contentInput?.value);
    
    if (hasContent) {
      if (confirm('Are you sure you want to clear this entry?')) {
        clearEntryForm();
        showToast('Entry cleared', 'success');
      }
    } else {
      clearEntryForm();
    }
  });
}

function clearEntryForm() {
  const titleInput = document.getElementById('entryTitle');
  const contentInput = document.getElementById('entryContent');
  
  if (titleInput) titleInput.value = '';
  if (contentInput) contentInput.value = '';
  
  // Clear mood selection
  const moodButtons = document.querySelectorAll('.emotion-btn');
  moodButtons.forEach(btn => btn.classList.remove('active'));
  selectedMood = null;
  
  console.log('Form cleared');
}

// ============================================
// INITIALIZE APP
// ============================================

async function initializeApp() {
  console.log('🚀 Initializing journal main page...');
  
  // Check authentication
  const isAuthenticated = await checkUserAuth();
  
  if (!isAuthenticated) {
    console.log('⚠️ User not authenticated, showing message...');
    
    // Show login message
    const container = document.querySelector('.page-container');
    if (container) {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      `;
      
      overlay.innerHTML = `
        <div style="
          background: white;
          padding: 2.5rem;
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
          text-align: center;
          max-width: 400px;
          width: 100%;
        ">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
          <h2 style="margin-bottom: 1rem; color: #1f2937; font-size: 1.5rem;">Login Required</h2>
          <p style="color: #6b7280; margin-bottom: 2rem; line-height: 1.6;">You need to be logged in to use your private journal.</p>
          <a href="login.html" style="
            display: inline-block;
            padding: 0.875rem 2rem;
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: white;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 1rem;
            box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
          ">Go to Login</a>
        </div>
      `;
      
      document.body.appendChild(overlay);
    }
    
    return;
  }
  
  // Initialize features
  displayCurrentDate();
  initializeMoodSelector();
  initializeSaveEntry();
  initializeClearEntry();
  
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  console.log('✅ Journal main page ready!');
}

// ============================================
// START APP
// ============================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// ============================================
// AUTH STATE CHANGE LISTENER
// ============================================

supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event);
  
  if (event === 'SIGNED_IN' && session?.user) {
    currentUser = session.user;
    currentUserId = session.user.id;
    console.log('✅ User signed in:', currentUser.email);
    
    // Reload page if it was showing login prompt
    if (document.querySelector('[style*="backdrop-filter"]')) {
      window.location.reload();
    }
  } else if (event === 'SIGNED_OUT') {
    currentUser = null;
    currentUserId = null;
    console.log('User signed out');
    window.location.href = 'login.html';
  }
});
