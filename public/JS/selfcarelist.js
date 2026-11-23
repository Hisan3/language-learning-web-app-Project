// Self-Care List JavaScript with Supabase Integration
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
// DEFAULT SELF-CARE ITEMS
// ============================================
const DEFAULT_ITEMS = [
  { item_id: '1', label: 'Drink 8 glasses of water', emoji: '💧', sort_order: 1 },
  { item_id: '2', label: 'Get 7-8 hours of sleep', emoji: '😴', sort_order: 2 },
  { item_id: '3', label: 'Exercise for 30 minutes', emoji: '🏃‍♀️', sort_order: 3 },
  { item_id: '4', label: 'Eat healthy meals', emoji: '🥗', sort_order: 4 },
  { item_id: '5', label: 'Take breaks from screens', emoji: '📱', sort_order: 5 },
  { item_id: '6', label: 'Connect with loved ones', emoji: '💕', sort_order: 6 },
  { item_id: '7', label: 'Practice gratitude', emoji: '🙏', sort_order: 7 },
  { item_id: '8', label: 'Spend time in nature', emoji: '🌳', sort_order: 8 },
];

// ============================================
// STATE VARIABLES
// ============================================
let currentUser = null;
let checklistItems = [];
let editingTaskId = null;

// ============================================
// USER SESSION & PROFILE
// ============================================

// Load user data from Supabase session
async function loadUserProfile() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (user) {
      currentUser = user;
      
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
      currentUser = null;
      setGuestProfile();
      return null;
    }
  } catch (error) {
    console.error('❌ Error loading user profile:', error);
    currentUser = null;
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
// TOAST NOTIFICATION
// ============================================

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================
// SUPABASE DATA OPERATIONS
// ============================================

// Load user's self-care items from Supabase
async function loadSelfCareItems() {
  if (!currentUser) {
    console.log('⚠️ No user logged in, loading default items');
    checklistItems = DEFAULT_ITEMS.map(item => ({
      ...item,
      checked: false,
      is_custom: false
    }));
    renderChecklist();
    return;
  }

  try {
    console.log('📥 Loading self-care items from Supabase...');
    
    // Get user's items from Supabase
    const { data: userItems, error } = await supabase
      .from('self_care_items')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('is_deleted', false)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('❌ Error loading items:', error);
      throw error;
    }

    if (!userItems || userItems.length === 0) {
      // First time user - initialize with default items
      console.log('🆕 First time user, initializing with defaults...');
      await initializeDefaultItems();
      return;
    }

    // Convert database items to checklist format
    checklistItems = userItems.map(item => ({
      id: item.id.toString(),
      item_id: item.item_id,
      label: item.label,
      emoji: item.emoji,
      checked: item.checked,
      is_custom: item.is_custom,
      sort_order: item.sort_order
    }));

    console.log(`✅ Loaded ${checklistItems.length} items from Supabase`);
    renderChecklist();

  } catch (error) {
    console.error('❌ Error in loadSelfCareItems:', error);
    showToast('Error loading your self-care list', 'error');
    
    // Fallback to default items
    checklistItems = DEFAULT_ITEMS.map(item => ({
      ...item,
      checked: false,
      is_custom: false
    }));
    renderChecklist();
  }
}

// Initialize default items for new user
async function initializeDefaultItems() {
  if (!currentUser) return;

  try {
    const itemsToInsert = DEFAULT_ITEMS.map(item => ({
      user_id: currentUser.id,
      item_id: item.item_id,
      label: item.label,
      emoji: item.emoji,
      checked: false,
      is_custom: false,
      is_deleted: false,
      sort_order: item.sort_order
    }));

    const { data, error } = await supabase
      .from('self_care_items')
      .insert(itemsToInsert)
      .select();

    if (error) {
      console.error('❌ Error initializing defaults:', error);
      throw error;
    }

    console.log('✅ Default items initialized');
    await loadSelfCareItems();

  } catch (error) {
    console.error('❌ Error in initializeDefaultItems:', error);
    showToast('Error initializing self-care list', 'error');
  }
}

// Update item checked status in Supabase
async function updateItemChecked(itemId, checked) {
  if (!currentUser) return;

  try {
    const { error } = await supabase
      .from('self_care_items')
      .update({ checked: checked })
      .eq('id', itemId)
      .eq('user_id', currentUser.id);

    if (error) {
      console.error('❌ Error updating checked status:', error);
      throw error;
    }

    console.log(`✅ Updated item ${itemId} checked status: ${checked}`);

  } catch (error) {
    console.error('❌ Error in updateItemChecked:', error);
    showToast('Error updating task', 'error');
  }
}

// Save new custom task to Supabase
async function saveNewTask(label, emoji) {
  if (!currentUser) {
    showToast('Please log in to add custom tasks', 'error');
    return false;
  }

  try {
    const maxSortOrder = checklistItems.reduce((max, item) => 
      Math.max(max, item.sort_order || 0), 0);

    const newItem = {
      user_id: currentUser.id,
      item_id: Date.now().toString(), // Unique timestamp ID for custom items
      label: label,
      emoji: emoji,
      checked: false,
      is_custom: true,
      is_deleted: false,
      sort_order: maxSortOrder + 1
    };

    const { data, error } = await supabase
      .from('self_care_items')
      .insert([newItem])
      .select();

    if (error) {
      console.error('❌ Error saving new task:', error);
      throw error;
    }

    console.log('✅ New task saved to Supabase');
    await loadSelfCareItems();
    return true;

  } catch (error) {
    console.error('❌ Error in saveNewTask:', error);
    showToast('Error adding task', 'error');
    return false;
  }
}

// Update existing task in Supabase
async function updateTask(itemId, label, emoji) {
  if (!currentUser) return false;

  try {
    const { error } = await supabase
      .from('self_care_items')
      .update({ 
        label: label,
        emoji: emoji
      })
      .eq('id', itemId)
      .eq('user_id', currentUser.id);

    if (error) {
      console.error('❌ Error updating task:', error);
      throw error;
    }

    console.log('✅ Task updated in Supabase');
    await loadSelfCareItems();
    return true;

  } catch (error) {
    console.error('❌ Error in updateTask:', error);
    showToast('Error updating task', 'error');
    return false;
  }
}

// Delete task from Supabase (soft delete for default items)
async function deleteTaskFromDB(itemId) {
  if (!currentUser) return false;

  try {
    const item = checklistItems.find(i => i.id === itemId);
    
    if (item.is_custom) {
      // Custom items: hard delete
      const { error } = await supabase
        .from('self_care_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', currentUser.id);

      if (error) throw error;
      console.log('✅ Custom task deleted (hard delete)');
    } else {
      // Default items: soft delete
      const { error } = await supabase
        .from('self_care_items')
        .update({ is_deleted: true })
        .eq('id', itemId)
        .eq('user_id', currentUser.id);

      if (error) throw error;
      console.log('✅ Default task deleted (soft delete)');
    }

    await loadSelfCareItems();
    return true;

  } catch (error) {
    console.error('❌ Error in deleteTaskFromDB:', error);
    showToast('Error deleting task', 'error');
    return false;
  }
}

// ============================================
// CHECKLIST RENDERING
// ============================================

function renderChecklist() {
  const container = document.getElementById('checklistItems');
  
  if (checklistItems.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No tasks yet. Add your first self-care task! 💖</p>';
    updateProgress();
    return;
  }

  container.innerHTML = checklistItems.map(item => `
    <div class="checklist-item ${item.checked ? 'checked' : ''}" data-id="${item.id || item.item_id}">
      <input type="checkbox" class="item-checkbox" ${item.checked ? 'checked' : ''} data-item-id="${item.id || item.item_id}" />
      <span class="item-text">${item.label}</span>
      <span class="item-emoji">${item.emoji}</span>
      ${item.checked ? '<i data-lucide="check-circle" class="check-icon"></i>' : ''}
      <div class="item-actions">
        <button class="icon-button edit-button" data-id="${item.id || item.item_id}" aria-label="Edit task">
          <i data-lucide="edit-2"></i>
        </button>
        <button class="icon-button delete delete-button" data-id="${item.id || item.item_id}" aria-label="Delete task">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners for checkboxes
  container.querySelectorAll('.item-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', async () => {
      const itemId = checkbox.getAttribute('data-item-id');
      const checked = checkbox.checked;
      
      // Update local state
      const item = checklistItems.find(i => (i.id || i.item_id) === itemId);
      if (item) {
        item.checked = checked;
      }
      
      // Update in Supabase
      await updateItemChecked(itemId, checked);
      
      // Re-render to show check icon
      renderChecklist();
      lucide.createIcons();
    });
  });
  
  // Add event listeners for edit buttons
  container.querySelectorAll('.edit-button').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      openEditModal(id);
    });
  });
  
  // Add event listeners for delete buttons
  container.querySelectorAll('.delete-button').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      deleteTask(id);
    });
  });
  
  lucide.createIcons();
  updateProgress();
}

function updateProgress() {
  const completedCount = checklistItems.filter(item => item.checked).length;
  const total = checklistItems.length;
  const percentage = total > 0 ? (completedCount / total) * 100 : 0;
  
  document.getElementById('progressText').textContent = `${completedCount}/${total}`;
  document.getElementById('progressFill').style.width = `${percentage}%`;
  
  const completionMessage = document.getElementById('completionMessage');
  if (percentage === 100 && total > 0) {
    completionMessage.style.display = 'block';
  } else {
    completionMessage.style.display = 'none';
  }
}

// ============================================
// ADD TASK MODAL
// ============================================

const addTaskButton = document.getElementById('addTaskButton');
const addTaskModal = document.getElementById('addTaskModal');
const closeModal = document.getElementById('closeModal');
const cancelButton = document.getElementById('cancelButton');
const saveTaskButton = document.getElementById('saveTaskButton');
const taskNameInput = document.getElementById('taskName');
const taskEmojiInput = document.getElementById('taskEmoji');

addTaskButton.addEventListener('click', () => {
  if (!currentUser) {
    showToast('Please log in to add custom tasks', 'error');
    return;
  }
  addTaskModal.classList.add('active');
  taskNameInput.value = '';
  taskEmojiInput.value = '';
  taskNameInput.focus();
});

closeModal.addEventListener('click', () => {
  addTaskModal.classList.remove('active');
});

cancelButton.addEventListener('click', () => {
  addTaskModal.classList.remove('active');
});

saveTaskButton.addEventListener('click', async () => {
  const name = taskNameInput.value.trim();
  const emoji = taskEmojiInput.value.trim() || '✨';
  
  if (!name) {
    showToast('Please enter a task name', 'error');
    return;
  }
  
  const success = await saveNewTask(name, emoji);
  
  if (success) {
    addTaskModal.classList.remove('active');
    showToast('Task added successfully!', 'success');
  }
});

// ============================================
// EDIT TASK MODAL
// ============================================

const editTaskModal = document.getElementById('editTaskModal');
const closeEditModal = document.getElementById('closeEditModal');
const cancelEditButton = document.getElementById('cancelEditButton');
const saveEditButton = document.getElementById('saveEditButton');
const editTaskNameInput = document.getElementById('editTaskName');
const editTaskEmojiInput = document.getElementById('editTaskEmoji');

closeEditModal.addEventListener('click', () => {
  editTaskModal.classList.remove('active');
});

cancelEditButton.addEventListener('click', () => {
  editTaskModal.classList.remove('active');
});

saveEditButton.addEventListener('click', async () => {
  const name = editTaskNameInput.value.trim();
  const emoji = editTaskEmojiInput.value.trim() || '✨';
  
  if (!name) {
    showToast('Please enter a task name', 'error');
    return;
  }
  
  const success = await updateTask(editingTaskId, name, emoji);
  
  if (success) {
    editTaskModal.classList.remove('active');
    showToast('Task updated successfully!', 'success');
    editingTaskId = null;
  }
});

function openEditModal(id) {
  if (!currentUser) {
    showToast('Please log in to edit tasks', 'error');
    return;
  }

  const task = checklistItems.find(t => (t.id || t.item_id) === id);
  if (task) {
    editingTaskId = id;
    editTaskNameInput.value = task.label;
    editTaskEmojiInput.value = task.emoji;
    editTaskModal.classList.add('active');
    editTaskNameInput.focus();
  }
}

async function deleteTask(id) {
  if (!currentUser) {
    showToast('Please log in to delete tasks', 'error');
    return;
  }

  if (confirm('Are you sure you want to delete this task?')) {
    const success = await deleteTaskFromDB(id);
    
    if (success) {
      showToast('Task deleted successfully!', 'success');
    }
  }
}

// ============================================
// MODAL OUTSIDE CLICK HANDLER
// ============================================

window.addEventListener('click', (e) => {
  if (e.target === addTaskModal) {
    addTaskModal.classList.remove('active');
  }
  if (e.target === editTaskModal) {
    editTaskModal.classList.remove('active');
  }
});

// Keyboard accessibility for modals
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (addTaskModal.classList.contains('active')) {
      addTaskModal.classList.remove('active');
    }
    if (editTaskModal.classList.contains('active')) {
      editTaskModal.classList.remove('active');
    }
  }
});

// ============================================
// INITIALIZATION
// ============================================

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initializing Self-Care List...');
  
  // Load user profile from Supabase
  await loadUserProfile();
  
  // Load self-care items (from Supabase if logged in, defaults if not)
  await loadSelfCareItems();
  
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  console.log('✅ Self-Care Checklist initialized successfully');
});

// Re-initialize Lucide icons after dynamic updates
function refreshIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}
