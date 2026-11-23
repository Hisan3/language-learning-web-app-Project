// ============================================
// STUDY TRACKER - SUPABASE EDITION
// ============================================

console.log('📊 Study Tracker v2.0 - Supabase Edition');

// Initialize Supabase client (will be set after window loads)
let supabase = null;
let currentUser = null;

// Initialize Supabase when script loads
function initSupabase() {
  const SUPABASE_URL = "https://qtsfceqredvwhwukaugu.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0c2ZjZXFyZWR2d2h3dWthdWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDE5NjcsImV4cCI6MjA3ODA3Nzk2N30.iJJ4wcah6BHs_ubjhwG-VU9Nj4XueSq5_Ro4sFm8QF8";
  
  if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        storage: localStorage
      }
    });
    console.log('✅ Supabase client initialized for Study Tracker');
  } else {
    console.error('❌ Supabase library not loaded');
  }
}

// ============================================
// STATE MANAGEMENT
// ============================================

// Color Palette
const colorPalette = [
  '#BAE6FD', '#FBB6CE', '#FDE68A', '#A78BFA', '#4338CA', '#581C87',
  '#A7F3D0', '#FED7AA', '#DDD6FE', '#F0ABFC', '#FDA4AF', '#FCA5A5',
  '#6EE7B7', '#86EFAC', '#FCD34D', '#FBBF24', '#FB923C', '#F97316',
];

// State
let currentDate = new Date();
let studyCategories = [];
let studySessions = {};
let editingCategories = [];
let selectedColor = '#BAE6FD';
let editingCategoryIndex = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  await initializeUser();
  await loadData();
  initializeEventListeners();
  setTodayDate();
  renderColorPalettes();
  render();
  initMobileMenu();
});

// Initialize user session
async function initializeUser() {
  try {
    console.log('🔍 Checking for user session...');
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Error getting session:', error);
      throw error;
    }
    
    if (session && session.user) {
      currentUser = session.user;
      console.log('✅ User authenticated:', currentUser.id);
      console.log('📧 User email:', currentUser.email);
      
      // Update UI with user info
      // Google OAuth uses full_name, regular signup uses name
      const userName = currentUser.user_metadata?.full_name || 
                      currentUser.user_metadata?.name || 
                      currentUser.email?.split('@')[0] || 
                      'User';
      
      console.log('👤 Display name:', userName);
      const initial = userName.charAt(0).toUpperCase();
      
      // Update desktop profile
      const topUser = document.getElementById('top-user');
      const profileInitial = document.getElementById('profile-initial');
      
      if (topUser) {
        topUser.textContent = userName;
      }
      if (profileInitial) {
        profileInitial.textContent = initial;
      }
      
      // Update mobile profile
      const mobileUser = document.getElementById('mobile-user');
      const mobileProfileInitial = document.getElementById('mobile-profile-initial');
      
      if (mobileUser) {
        mobileUser.textContent = userName;
      }
      if (mobileProfileInitial) {
        mobileProfileInitial.textContent = initial;
      }
      
      // Make desktop profile clickable
      const profilePill = document.querySelector('.profile-pill');
      if (profilePill) {
        profilePill.style.cursor = 'pointer';
        profilePill.onclick = () => {
          window.location.href = 'profile.html';
        };
      }
      
      // Make mobile profile clickable
      const mobileProfilePill = document.querySelector('.mobile-profile-pill');
      if (mobileProfilePill) {
        mobileProfilePill.style.cursor = 'pointer';
        mobileProfilePill.onclick = () => {
          window.location.href = 'profile.html';
        };
      }
    } else {
      console.log('⚠️ No user session found');
      console.log('ℹ️ User needs to log in to use Study Tracker');
      // Show guest state but don't force redirect
      document.getElementById('top-user').textContent = 'Guest';
      document.getElementById('profile-initial').textContent = 'G';
      
      // Update mobile profile if exists
      const mobileUser = document.getElementById('mobile-user');
      const mobileProfileInitial = document.getElementById('mobile-profile-initial');
      if (mobileUser) mobileUser.textContent = 'Guest';
      if (mobileProfileInitial) mobileProfileInitial.textContent = 'G';
    }
  } catch (error) {
    console.error('❌ Error initializing user:', error);
    // Show guest state on error
    document.getElementById('top-user').textContent = 'Guest';
    document.getElementById('profile-initial').textContent = 'G';
    
    // Update mobile profile if exists
    const mobileUser = document.getElementById('mobile-user');
    const mobileProfileInitial = document.getElementById('mobile-profile-initial');
    if (mobileUser) mobileUser.textContent = 'Guest';
    if (mobileProfileInitial) mobileProfileInitial.textContent = 'G';
  }
}

// Load data from Supabase
async function loadData() {
  if (!currentUser) {
    console.log('⚠️ No user - skipping data load');
    return;
  }
  
  try {
    console.log('📥 Loading study tracker data from Supabase...');
    
    // Load categories
    const { data: categories, error: catError } = await supabase
      .from('study_categories')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true });
    
    if (catError) throw catError;
    
    studyCategories = (categories || []).map(cat => ({
      id: cat.id,
      name: cat.name,
      color: cat.color
    }));
    
    console.log(`✅ Loaded ${studyCategories.length} categories`);
    
    // Load sessions
    const { data: sessions, error: sessError } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', currentUser.id);
    
    if (sessError) throw sessError;
    
    // Group sessions by date
    studySessions = {};
    (sessions || []).forEach(session => {
      const date = session.date;
      if (!studySessions[date]) {
        studySessions[date] = [];
      }
      studySessions[date].push({
        id: session.id,
        category: session.category,
        duration: session.duration,
        date: session.date
      });
    });
    
    console.log(`✅ Loaded ${sessions?.length || 0} sessions`);
    
  } catch (error) {
    console.error('❌ Error loading data:', error);
    alert('Error loading study tracker data. Please refresh the page.');
  }
}

// Save data is no longer needed - we save directly to Supabase
// But keep a placeholder for backward compatibility
function saveData() {
  console.log('ℹ️ Using Supabase - no need for localStorage save');
}

// Mobile menu toggle
function initMobileMenu() {
    const menuBtn = document.getElementById('menu-btn');
    const mobileNav = document.getElementById('mobile-nav');
    const menuIcon = document.getElementById('menu-icon');

    if (menuBtn && mobileNav) {
        menuBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('show');

            // Toggle between menu and close icon
            if (mobileNav.classList.contains('show')) {
                menuIcon.innerHTML = `
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                `;
            } else {
                menuIcon.innerHTML = `
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                `;
            }
        });
    }
}

// Event Listeners
function initializeEventListeners() {
  // Add Session Modal
  document.getElementById('btnAddSession').addEventListener('click', openAddSessionModal);
  document.getElementById('btnCloseAddSession').addEventListener('click', closeAddSessionModal);
  document.getElementById('btnSubmitSession').addEventListener('click', addStudySession);

  // Manage Categories Modal
  document.getElementById('btnManageCategories').addEventListener('click', openManageCategoriesModal);
  document.getElementById('btnCloseManageCategories').addEventListener('click', closeManageCategoriesModal);
  document.getElementById('btnAddCategory').addEventListener('click', addCategory);
  document.getElementById('btnSaveCategories').addEventListener('click', saveCategories);

  // Color Picker Modal
  document.getElementById('btnCloseColorPicker').addEventListener('click', closeColorPickerModal);

  // Calendar Navigation
  document.getElementById('btnPrevMonth').addEventListener('click', () => navigateMonth('prev'));
  document.getElementById('btnNextMonth').addEventListener('click', () => navigateMonth('next'));

  // Close modal on outside click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  // Enter key for adding category
  document.getElementById('inputNewCategoryName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addCategory();
    }
  });
}

function setTodayDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('inputSessionDate').value = today;
}

// Render
function render() {
  renderStats();
  renderCategoryBreakdown();
  renderCalendar();
  renderLegend();
}

function renderStats() {
  const monthData = getMonthData();
  const totalMonthMinutes = monthData.reduce((sum, day) => sum + day.totalMinutes, 0);
  const totalMonthHours = Math.floor(totalMonthMinutes / 60);
  const studyDaysCount = monthData.filter(d => d.sessions.length > 0).length;

  document.getElementById('totalMonthHours').textContent = `${totalMonthHours}h`;
  document.getElementById('studyDaysCount').textContent = studyDaysCount;
  document.getElementById('categoriesCount').textContent = studyCategories.length;
}

function renderCategoryBreakdown() {
  const categoryStatsList = document.getElementById('categoryStatsList');
  const categoryBreakdown = document.getElementById('categoryBreakdown');
  
  // Calculate category stats for all time
  const categoryStats = studyCategories.map(cat => {
    let totalMinutes = 0;
    Object.values(studySessions).forEach(daySessions => {
      daySessions.forEach(session => {
        if (session.category === cat.name) {
          totalMinutes += session.duration;
        }
      });
    });
    return { 
      name: cat.name, 
      color: cat.color, 
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes 
    };
  }).filter(stat => stat.minutes > 0).sort((a, b) => b.minutes - a.minutes);

  if (categoryStats.length === 0) {
    categoryBreakdown.style.display = 'none';
    return;
  }

  categoryBreakdown.style.display = 'block';
  
  const totalMinutes = categoryStats.reduce((sum, stat) => sum + stat.minutes, 0);
  
  categoryStatsList.innerHTML = categoryStats.map(stat => `
    <div class="category-stat">
      <div class="category-stat-header">
        <div class="category-stat-name">
          <div class="category-color" style="background-color: ${stat.color}"></div>
          <span>${stat.name}</span>
        </div>
        <div class="badge">${stat.hours}h</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="background-color: ${stat.color}; width: ${(stat.minutes / totalMinutes) * 100}%"></div>
      </div>
    </div>
  `).join('');
}

function renderCalendar() {
  const monthData = getMonthData();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  document.getElementById('monthName').textContent = monthName;
  
  const calendarGrid = document.getElementById('calendarGrid');
  
  // Empty cells for offset
  let gridHTML = Array(firstDayOfWeek).fill('<div class="calendar-day empty"></div>').join('');
  
  // Actual days
  gridHTML += monthData.map(dayData => {
    const isToday = dayData.date === new Date().toISOString().split('T')[0];
    const todayClass = isToday ? 'today' : '';
    
    let sessionsHTML = '';
    if (dayData.sessions.length > 0) {
      sessionsHTML = '<div class="day-sessions">';
      sessionsHTML += dayData.sessions.slice(0, 3).map(session => {
        const category = studyCategories.find(c => c.name === session.category);
        return `<div class="session-bar" style="background-color: ${category?.color || '#BAE6FD'}" title="${session.category}: ${session.duration}m"></div>`;
      }).join('');
      if (dayData.sessions.length > 3) {
        sessionsHTML += `<div class="more-sessions">+${dayData.sessions.length - 3}</div>`;
      }
      sessionsHTML += '</div>';
    }
    
    const totalTimeHTML = dayData.totalTime ? `<div class="day-total">${dayData.totalTime}</div>` : '';
    
    return `
      <div class="calendar-day ${todayClass}">
        <div class="day-number">${dayData.day}</div>
        ${sessionsHTML}
        ${totalTimeHTML}
      </div>
    `;
  }).join('');
  
  calendarGrid.innerHTML = gridHTML;
}

function renderLegend() {
  const legendCard = document.getElementById('legendCard');
  const legendGrid = document.getElementById('legendGrid');
  
  if (studyCategories.length === 0) {
    legendCard.style.display = 'none';
    return;
  }
  
  legendCard.style.display = 'block';
  
  legendGrid.innerHTML = studyCategories.map(cat => `
    <div class="legend-item">
      <div class="legend-color" style="background-color: ${cat.color}"></div>
      <span>${cat.name}</span>
    </div>
  `).join('');
}

function renderColorPalettes() {
  // New category color palette
  const colorPaletteEl = document.getElementById('colorPalette');
  colorPaletteEl.innerHTML = colorPalette.map(color => `
    <button class="color-option ${color === selectedColor ? 'selected' : ''}" 
            style="background-color: ${color}" 
            data-color="${color}"></button>
  `).join('');
  
  colorPaletteEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('color-option')) {
      selectedColor = e.target.dataset.color;
      document.getElementById('selectedColorPreview').style.backgroundColor = selectedColor;
      colorPaletteEl.querySelectorAll('.color-option').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.color === selectedColor);
      });
    }
  });
  
  document.getElementById('selectedColorPreview').style.backgroundColor = selectedColor;
  
  // Edit category color palette
  const editColorPaletteEl = document.getElementById('editColorPalette');
  editColorPaletteEl.innerHTML = colorPalette.map(color => `
    <button class="color-option" 
            style="background-color: ${color}" 
            data-color="${color}"></button>
  `).join('');
  
  editColorPaletteEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('color-option')) {
      const color = e.target.dataset.color;
      if (editingCategoryIndex !== null) {
        editingCategories[editingCategoryIndex].color = color;
        renderCategoriesList();
        closeColorPickerModal();
      }
    }
  });
}

// Month Data
function getMonthData() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const dateKey = date.toISOString().split('T')[0];
    const sessions = studySessions[dateKey] || [];
    
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    days.push({
      day: i,
      date: dateKey,
      sessions,
      totalTime: totalMinutes > 0 ? `${hours}h ${mins}m` : '',
      totalMinutes,
    });
  }
  
  return days;
}

function navigateMonth(direction) {
  if (direction === 'prev') {
    currentDate.setMonth(currentDate.getMonth() - 1);
  } else {
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  render();
}

// Add Session Modal
function openAddSessionModal() {
  if (studyCategories.length === 0) {
    alert('Please add some study categories first!');
    openManageCategoriesModal();
    return;
  }
  
  const select = document.getElementById('inputSessionCategory');
  select.innerHTML = '<option value="">Select subject</option>' + 
    studyCategories.map(cat => `
      <option value="${cat.name}">${cat.name}</option>
    `).join('');
  
  document.getElementById('modalAddSession').classList.add('active');
}

function closeAddSessionModal() {
  document.getElementById('modalAddSession').classList.remove('active');
  document.getElementById('inputSessionCategory').value = '';
  document.getElementById('inputSessionDuration').value = '';
  setTodayDate();
}

async function addStudySession() {
  if (!currentUser) {
    alert('Please log in to add study sessions');
    return;
  }
  
  const category = document.getElementById('inputSessionCategory').value;
  const duration = parseInt(document.getElementById('inputSessionDuration').value);
  const date = document.getElementById('inputSessionDate').value;
  
  if (!category || !duration || !date) {
    alert('Please fill all fields');
    return;
  }
  
  try {
    console.log('💾 Saving study session to Supabase...');
    
    // Save to Supabase
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: currentUser.id,
        category,
        duration,
        date
      })
      .select();
    
    if (error) throw error;
    
    // Add to local state
    if (!studySessions[date]) {
      studySessions[date] = [];
    }
    
    studySessions[date].push({
      id: data[0].id,
      category,
      duration,
      date
    });
    
    console.log('✅ Session saved successfully');
    
    render();
    closeAddSessionModal();
    
  } catch (error) {
    console.error('❌ Error saving session:', error);
    alert('Error saving study session. Please try again.');
  }
}

// Manage Categories Modal
function openManageCategoriesModal() {
  editingCategories = JSON.parse(JSON.stringify(studyCategories));
  renderCategoriesList();
  document.getElementById('modalManageCategories').classList.add('active');
}

function closeManageCategoriesModal() {
  document.getElementById('modalManageCategories').classList.remove('active');
  document.getElementById('inputNewCategoryName').value = '';
  selectedColor = '#BAE6FD';
  document.getElementById('selectedColorPreview').style.backgroundColor = selectedColor;
}

function addCategory() {
  const name = document.getElementById('inputNewCategoryName').value.trim();
  
  if (!name) {
    return;
  }
  
  editingCategories.push({
    name,
    color: selectedColor
  });
  
  document.getElementById('inputNewCategoryName').value = '';
  selectedColor = '#BAE6FD';
  document.getElementById('selectedColorPreview').style.backgroundColor = selectedColor;
  document.getElementById('colorPalette').querySelectorAll('.color-option').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.color === selectedColor);
  });
  
  renderCategoriesList();
}

function renderCategoriesList() {
  const categoriesList = document.getElementById('categoriesList');
  
  if (editingCategories.length === 0) {
    categoriesList.innerHTML = '<p class="empty-message">No categories yet. Add one above!</p>';
    return;
  }
  
  categoriesList.innerHTML = editingCategories.map((cat, index) => `
    <div class="category-item">
      <div class="category-item-color" style="background-color: ${cat.color}"></div>
      <input type="text" class="input" value="${cat.name}" data-index="${index}">
      <div class="category-actions">
        <button class="btn-icon palette" data-index="${index}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="13.5" cy="6.5" r=".5"></circle>
            <circle cx="17.5" cy="10.5" r=".5"></circle>
            <circle cx="8.5" cy="7.5" r=".5"></circle>
            <circle cx="6.5" cy="12.5" r=".5"></circle>
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
          </svg>
        </button>
        <button class="btn-icon delete" data-index="${index}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners
  categoriesList.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      editingCategories[index].name = e.target.value;
    });
  });
  
  categoriesList.querySelectorAll('.palette').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      editingCategoryIndex = index;
      document.getElementById('modalColorPicker').classList.add('active');
    });
  });
  
  categoriesList.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      const category = editingCategories[index];
      
      // If category has an ID, delete from Supabase
      if (category.id) {
        try {
          const { error } = await supabase
            .from('study_categories')
            .delete()
            .eq('id', category.id);
          
          if (error) throw error;
          console.log('✅ Category deleted from Supabase');
        } catch (error) {
          console.error('❌ Error deleting category:', error);
          alert('Error deleting category');
          return;
        }
      }
      
      editingCategories.splice(index, 1);
      renderCategoriesList();
    });
  });
}

async function saveCategories() {
  if (!currentUser) {
    alert('Please log in to save categories');
    return;
  }
  
  try {
    console.log('💾 Saving categories to Supabase...');
    
    // Find new categories (ones without ID)
    const newCategories = editingCategories.filter(cat => !cat.id);
    
    // Insert new categories
    if (newCategories.length > 0) {
      const { data, error } = await supabase
        .from('study_categories')
        .insert(
          newCategories.map(cat => ({
            user_id: currentUser.id,
            name: cat.name,
            color: cat.color
          }))
        )
        .select();
      
      if (error) throw error;
      
      // Update IDs in editingCategories
      let newIndex = 0;
      editingCategories.forEach(cat => {
        if (!cat.id) {
          cat.id = data[newIndex].id;
          newIndex++;
        }
      });
    }
    
    // Update existing categories
    const existingCategories = editingCategories.filter(cat => cat.id);
    for (const cat of existingCategories) {
      const { error } = await supabase
        .from('study_categories')
        .update({
          name: cat.name,
          color: cat.color
        })
        .eq('id', cat.id);
      
      if (error) throw error;
    }
    
    console.log('✅ Categories saved successfully');
    
    studyCategories = JSON.parse(JSON.stringify(editingCategories));
    render();
    closeManageCategoriesModal();
    
  } catch (error) {
    console.error('❌ Error saving categories:', error);
    alert('Error saving categories. Please try again.');
  }
}

// Color Picker Modal
function closeColorPickerModal() {
  document.getElementById('modalColorPicker').classList.remove('active');
  editingCategoryIndex = null;
}