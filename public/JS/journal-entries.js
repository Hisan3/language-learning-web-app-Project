// ============================================
// JOURNAL ENTRIES PAGE (journal-entries.html)
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

console.log('📖 Journal entries page initialized');

// State
let currentUser = null;
let currentUserId = null;
let currentFilter = 'all';
let allEntries = [];
let currentViewingEntryId = null;

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

function showEntriesLoading(show = true) {
  const entriesList = document.getElementById('entriesList');
  const emptyState = document.getElementById('emptyState');
  
  if (!entriesList) return;
  
  if (show) {
    if (emptyState) emptyState.classList.remove('active');
    
    entriesList.innerHTML = `
      <div style="
        grid-column: 1 / -1;
        text-align: center;
        padding: 4rem 2rem;
        color: #6b7280;
      ">
        <div style="font-size: 3rem; margin-bottom: 1rem; animation: pulse 2s ease-in-out infinite;">⏳</div>
        <p style="font-size: 1.125rem;">Loading your journal entries...</p>
      </div>
    `;
  }
}

// ============================================
// MOOD EMOJI HELPER
// ============================================

function getMoodEmoji(mood) {
  const moods = {
    'great': '😄',
    'good': '🙂',
    'okay': '😐',
    'sad': '😔',
    'anxious': '😰'
  };
  return moods[mood] || '😐';
}

// ============================================
// ESCAPE HTML HELPER
// ============================================

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ============================================
// LOAD ENTRIES FROM SUPABASE
// ============================================

async function loadEntriesFromSupabase() {
  if (!currentUserId) {
    console.error('No user ID available');
    return [];
  }
  
  try {
    console.log('📡 Loading entries for user:', currentUserId);
    
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log(`✅ Loaded ${data?.length || 0} entries`);
    return data || [];
    
  } catch (error) {
    console.error('Error loading entries:', error);
    showToast('Failed to load entries', 'error');
    return [];
  }
}

// ============================================
// FILTER ENTRIES BY DATE
// ============================================

function filterEntriesByDate(entries) {
  if (!entries || entries.length === 0) return [];
  
  const now = new Date();
  
  if (currentFilter === 'all') {
    return entries;
  }
  
  if (currentFilter === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return entries.filter(entry => {
      const entryDate = new Date(entry.created_at);
      return entryDate >= weekAgo;
    });
  }
  
  if (currentFilter === 'month') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return entries.filter(entry => {
      const entryDate = new Date(entry.created_at);
      return entryDate >= monthAgo;
    });
  }
  
  return entries;
}

// ============================================
// RENDER ENTRIES
// ============================================

async function renderEntries() {
  const entriesList = document.getElementById('entriesList');
  const emptyState = document.getElementById('emptyState');
  
  if (!entriesList || !emptyState) {
    console.error('Required DOM elements not found');
    return;
  }
  
  // Show loading
  showEntriesLoading(true);
  
  // Load entries from Supabase
  allEntries = await loadEntriesFromSupabase();
  
  // Apply filter
  const filteredEntries = filterEntriesByDate(allEntries);
  
  console.log(`Rendering ${filteredEntries.length} entries (filter: ${currentFilter})`);
  
  // Show empty state if no entries
  if (filteredEntries.length === 0) {
    entriesList.innerHTML = '';
    emptyState.classList.add('active');
    return;
  }
  
  // Hide empty state
  emptyState.classList.remove('active');
  
  // Render entries
  entriesList.innerHTML = filteredEntries.map(entry => {
    const date = new Date(entry.created_at);
    const formattedDate = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const title = escapeHtml(entry.title || 'Untitled Entry');
    const preview = escapeHtml(entry.content || '');
    const mood = entry.mood || 'okay';
    
    return `
      <div class="entry-card" onclick="viewEntry('${entry.id}')">
        <div class="entry-header-row">
          <div class="entry-meta">
            <div class="entry-date">${formattedDate}</div>
            <h3 class="entry-title">${title}</h3>
          </div>
          <div class="entry-mood-icon">${getMoodEmoji(mood)}</div>
        </div>
        <p class="entry-preview">${preview}</p>
        <div class="entry-footer">
          <button class="icon-btn" onclick="event.stopPropagation(); viewEntry('${entry.id}')" title="View full entry">
            <i data-lucide="eye" width="18" height="18"></i>
          </button>
          <button class="icon-btn delete-btn" onclick="event.stopPropagation(); confirmDeleteEntry('${entry.id}')" title="Delete entry">
            <i data-lucide="trash-2" width="18" height="18"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // Re-initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// ============================================
// FILTER BUTTONS
// ============================================

function initializeFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  filterButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      // Update active state
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update filter
      currentFilter = btn.dataset.filter;
      console.log('Filter changed to:', currentFilter);
      
      // Re-render with new filter (no need to reload from DB)
      const entriesList = document.getElementById('entriesList');
      const emptyState = document.getElementById('emptyState');
      
      if (!entriesList || !emptyState) return;
      
      const filteredEntries = filterEntriesByDate(allEntries);
      
      if (filteredEntries.length === 0) {
        entriesList.innerHTML = '';
        emptyState.classList.add('active');
        return;
      }
      
      emptyState.classList.remove('active');
      
      entriesList.innerHTML = filteredEntries.map(entry => {
        const date = new Date(entry.created_at);
        const formattedDate = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const title = escapeHtml(entry.title || 'Untitled Entry');
        const preview = escapeHtml(entry.content || '');
        const mood = entry.mood || 'okay';
        
        return `
          <div class="entry-card" onclick="viewEntry('${entry.id}')">
            <div class="entry-header-row">
              <div class="entry-meta">
                <div class="entry-date">${formattedDate}</div>
                <h3 class="entry-title">${title}</h3>
              </div>
              <div class="entry-mood-icon">${getMoodEmoji(mood)}</div>
            </div>
            <p class="entry-preview">${preview}</p>
            <div class="entry-footer">
              <button class="icon-btn" onclick="event.stopPropagation(); viewEntry('${entry.id}')" title="View full entry">
                <i data-lucide="eye" width="18" height="18"></i>
              </button>
              <button class="icon-btn delete-btn" onclick="event.stopPropagation(); confirmDeleteEntry('${entry.id}')" title="Delete entry">
                <i data-lucide="trash-2" width="18" height="18"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
      
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    });
  });
}

// ============================================
// VIEW ENTRY IN MODAL
// ============================================

async function viewEntry(entryId) {
  console.log('Opening entry:', entryId);
  
  // Find entry in current data
  const entry = allEntries.find(e => e.id === entryId);
  
  if (!entry) {
    console.error('Entry not found:', entryId);
    showToast('Entry not found', 'error');
    return;
  }
  
  const modal = document.getElementById('viewModal');
  if (!modal) {
    console.error('Modal element not found');
    return;
  }
  
  // Format date
  const date = new Date(entry.created_at);
  const formattedDate = date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Update modal content
  const modalMood = document.getElementById('modalMood');
  const modalTitle = document.getElementById('modalTitle');
  const modalDate = document.getElementById('modalDate');
  const modalContent = document.getElementById('modalContent');
  
  if (modalMood) modalMood.textContent = getMoodEmoji(entry.mood);
  if (modalTitle) modalTitle.textContent = entry.title || 'Untitled Entry';
  if (modalDate) modalDate.textContent = formattedDate;
  if (modalContent) modalContent.textContent = entry.content || '';
  
  // Store current entry ID
  currentViewingEntryId = entryId;
  
  // Show modal
  modal.classList.add('active');
  
  console.log('Modal opened for entry:', entryId);
}

// Make viewEntry available globally
window.viewEntry = viewEntry;

// ============================================
// DELETE ENTRY
// ============================================

async function confirmDeleteEntry(entryId) {
  if (!confirm('Are you sure you want to delete this journal entry? This action cannot be undone.')) {
    return;
  }
  
  await deleteEntry(entryId);
}

async function deleteEntry(entryId) {
  console.log('Deleting entry:', entryId);
  
  try {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', currentUserId); // Extra safety check
    
    if (error) {
      console.error('Delete error:', error);
      throw error;
    }
    
    console.log('✅ Entry deleted');
    showToast('Entry deleted successfully', 'success');
    
    // Close modal if open
    const modal = document.getElementById('viewModal');
    if (modal) {
      modal.classList.remove('active');
    }
    
    // Reload entries
    await renderEntries();
    
  } catch (error) {
    console.error('Error deleting entry:', error);
    showToast('Failed to delete entry', 'error');
  }
}

// Make functions available globally
window.confirmDeleteEntry = confirmDeleteEntry;
window.deleteEntry = deleteEntry;

// ============================================
// MODAL CONTROLS
// ============================================

function initializeModal() {
  const modal = document.getElementById('viewModal');
  const closeButtons = document.querySelectorAll('#closeModal, #closeModalBtn');
  const overlay = document.querySelector('.modal-overlay');
  const deleteButton = document.getElementById('deleteFromModal');
  
  if (!modal) return;
  
  // Close modal buttons
  closeButtons.forEach(btn => {
    btn?.addEventListener('click', () => {
      modal.classList.remove('active');
      currentViewingEntryId = null;
    });
  });
  
  // Close on overlay click
  overlay?.addEventListener('click', () => {
    modal.classList.remove('active');
    currentViewingEntryId = null;
  });
  
  // Delete from modal
  deleteButton?.addEventListener('click', async () => {
    if (currentViewingEntryId) {
      await confirmDeleteEntry(currentViewingEntryId);
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
      currentViewingEntryId = null;
    }
  });
}

// ============================================
// INITIALIZE APP
// ============================================

async function initializeApp() {
  console.log('🚀 Initializing journal entries page...');
  
  // Check authentication
  const isAuthenticated = await checkUserAuth();
  
  if (!isAuthenticated) {
    console.log('⚠️ User not authenticated, redirecting...');
    
    // Show message and redirect
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
        <p style="color: #6b7280; margin-bottom: 2rem; line-height: 1.6;">You need to be logged in to view your journal entries.</p>
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
    
    return;
  }
  
  // Initialize features
  initializeFilters();
  initializeModal();
  
  // Load and render entries
  await renderEntries();
  
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  console.log('✅ Journal entries page ready!');
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
    
    // Reload if needed
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
