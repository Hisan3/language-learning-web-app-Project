// Productivity Hub - Vanilla JavaScript

// Initialize Supabase client (will be set after window loads)
let supabase = null;
let currentUserId = null;

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
        console.log('✅ Supabase client initialized');
    } else {
        console.error('❌ Supabase library not loaded');
    }
}

// State Management
let state = {
    tasks: [],
    timerMinutes: 25,
    timerSeconds: 0,
    isTimerRunning: false,
    pomodoroCount: 0,
    timerInterval: null,
    studySessions: {},
    studyCategories: []
};

// Load state from localStorage
function loadState() {
    const savedState = localStorage.getItem('englishLearningState');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            state.tasks = parsed.tasks || [];
            state.pomodoroCount = parsed.pomodoroCount || 0;
            state.studySessions = parsed.studySessions || {};
            state.studyCategories = parsed.studyCategories || [];
        } catch (e) {
            console.error('Error loading state:', e);
        }
    }
}

// Save state to localStorage
function saveState() {
    try {
        const currentData = localStorage.getItem('englishLearningState');
        const parsed = currentData ? JSON.parse(currentData) : {};
        
        const updatedData = {
            ...parsed,
            tasks: state.tasks,
            pomodoroCount: state.pomodoroCount,
            studySessions: state.studySessions,
            studyCategories: state.studyCategories
        };
        
        localStorage.setItem('englishLearningState', JSON.stringify(updatedData));
    } catch (e) {
        console.error('Error saving state:', e);
    }
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

// Update profile initial based on user name
async function updateProfileInitial() {
    // First try to get from Supabase session
    try {
        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && session.user) {
                const userName = session.user.user_metadata?.full_name || 
                               session.user.user_metadata?.name || 
                               session.user.email?.split('@')[0] || 'User';
                const initial = userName.charAt(0).toUpperCase();
                
                // Update desktop profile
                const profileInitial = document.getElementById('profile-initial');
                const topUser = document.getElementById('top-user');
                
                if (profileInitial) {
                    profileInitial.textContent = initial;
                }
                if (topUser) {
                    topUser.textContent = userName;
                }
                
                // Update mobile profile
                const mobileProfileInitial = document.getElementById('mobile-profile-initial');
                const mobileUser = document.getElementById('mobile-user');
                
                if (mobileProfileInitial) {
                    mobileProfileInitial.textContent = initial;
                }
                if (mobileUser) {
                    mobileUser.textContent = userName;
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
                
                return; // Exit if successful
            }
        }
    } catch (e) {
        console.error('Error getting Supabase session:', e);
    }
    
    // Fallback to localStorage
    const savedState = localStorage.getItem('englishLearningState');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            const initial = parsed.name ? parsed.name.charAt(0).toUpperCase() : 'G';
            const userName = parsed.name || 'Guest';
            
            // Update desktop profile
            const profileInitial = document.getElementById('profile-initial');
            const topUser = document.getElementById('top-user');
            
            if (profileInitial) {
                profileInitial.textContent = initial;
            }
            if (topUser) {
                topUser.textContent = userName;
            }
            
            // Update mobile profile
            const mobileProfileInitial = document.getElementById('mobile-profile-initial');
            const mobileUser = document.getElementById('mobile-user');
            
            if (mobileProfileInitial) {
                mobileProfileInitial.textContent = initial;
            }
            if (mobileUser) {
                mobileUser.textContent = userName;
            }
        } catch (e) {
            console.error('Error updating profile:', e);
        }
    }
}

// Calculate study stats
function updateStudyStats() {
    let totalStudyMinutes = 0;
    
    if (state.studySessions && typeof state.studySessions === 'object') {
        Object.values(state.studySessions).forEach(daySessions => {
            if (Array.isArray(daySessions)) {
                daySessions.forEach(session => {
                    totalStudyMinutes += session.duration || 0;
                });
            }
        });
    }
    
    const totalStudyHours = Math.floor(totalStudyMinutes / 60);
    const categoryCount = (state.studyCategories || []).length;
    
    const studyHoursEl = document.getElementById('totalStudyHours');
    const categoryCountEl = document.getElementById('categoryCount');
    
    if (studyHoursEl) {
        studyHoursEl.textContent = totalStudyHours + 'h';
    }
    if (categoryCountEl) {
        categoryCountEl.textContent = categoryCount;
    }
}

// Update progress display
async function updateProgress() {
    const completedTasks = state.tasks.filter(t => t.completed).length;
    const totalTasks = state.tasks.length;
    const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // Update task progress text
    const taskProgress = document.getElementById('taskProgress');
    if (taskProgress) {
        taskProgress.textContent = `${completedTasks}/${totalTasks}`;
    }
    
    // Update progress bar
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = percentage + '%';
    }
    
    // Update completion percentage
    const completionPercent = document.getElementById('completionPercent');
    if (completionPercent) {
        completionPercent.textContent = Math.round(percentage);
    }
    
    // Update pomodoro count - Load from backend stats for weekly progress
    await loadPomodoroCount();
    
    // Update motivational message
    updateMotivationalMessage(completedTasks, totalTasks);
    
    // Update user data in localStorage with progress
    const savedState = localStorage.getItem('englishLearningState');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            parsed.todayProgress = parsed.todayProgress || {};
            parsed.todayProgress.tasks = percentage;
            localStorage.setItem('englishLearningState', JSON.stringify(parsed));
        } catch (e) {
            console.error('Error updating progress:', e);
        }
    }
}

// Load pomodoro count from backend
async function loadPomodoroCount() {
    try {
        if (!supabase || !window.StatsSystem) {
            // Fallback to local state if backend not available
            const pomodoroCountEl = document.getElementById('pomodoroCount');
            if (pomodoroCountEl) {
                pomodoroCountEl.textContent = state.pomodoroCount;
            }
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !session.user) {
            // Use local state if not logged in
            const pomodoroCountEl = document.getElementById('pomodoroCount');
            if (pomodoroCountEl) {
                pomodoroCountEl.textContent = state.pomodoroCount;
            }
            return;
        }

        // Get weekly pomodoro count from backend
        const stats = await window.StatsSystem.getUserStats(session.user.id);
        
        if (stats && typeof stats.pomodoros !== 'undefined') {
            // Update display with backend data
            const pomodoroCountEl = document.getElementById('pomodoroCount');
            if (pomodoroCountEl) {
                pomodoroCountEl.textContent = stats.pomodoros;
            }
            
            // Sync local state with backend
            state.pomodoroCount = stats.pomodoros;
            console.log(`✅ Pomodoro count loaded from backend: ${stats.pomodoros}`);
        } else {
            // Fallback to local state
            const pomodoroCountEl = document.getElementById('pomodoroCount');
            if (pomodoroCountEl) {
                pomodoroCountEl.textContent = state.pomodoroCount;
            }
        }
    } catch (error) {
        console.error('❌ Error loading pomodoro count:', error);
        // Fallback to local state
        const pomodoroCountEl = document.getElementById('pomodoroCount');
        if (pomodoroCountEl) {
            pomodoroCountEl.textContent = state.pomodoroCount;
        }
    }
}

// Update motivational message
function updateMotivationalMessage(completedTasks, totalTasks) {
    const motivationalMessage = document.getElementById('motivationalMessage');
    const motivationalText = document.getElementById('motivationalText');
    
    if (completedTasks > 0) {
        motivationalMessage.style.display = 'block';
        
        if (completedTasks === totalTasks) {
            motivationalText.textContent = '🎉 Amazing! All tasks completed! You are a star! ⭐';
        } else {
            const remaining = totalTasks - completedTasks;
            motivationalText.textContent = `💪 Keep going! ${remaining} task${remaining > 1 ? 's' : ''} to go!`;
        }
    } else {
        motivationalMessage.style.display = 'none';
    }
}

// Render tasks
function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    
    if (state.tasks.length === 0) {
        tasksList.innerHTML = '<p class="no-tasks">No tasks yet! Add one to get started 🎯</p>';
        return;
    }
    
    tasksList.innerHTML = '';
    
    state.tasks.forEach((task, index) => {
        const taskItem = document.createElement('div');
        taskItem.className = `task-item ${task.completed ? 'task-item-completed' : 'task-item-active'}`;
        taskItem.style.animationDelay = `${index * 0.05}s`;
        
        taskItem.innerHTML = `
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task.id}')"></div>
            <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
            ${task.completed ? '<span class="task-checkmark">✅</span>' : ''}
            <button class="btn-delete" onclick="deleteTask('${task.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        `;
        
        tasksList.appendChild(taskItem);
    });
    
    updateProgress();
}

// Add task
async function addTask() {
    const taskInput = document.getElementById('taskInput');
    const taskText = taskInput.value.trim();
    
    if (!taskText) return;

    // If user is logged in, save to database
    if (currentUserId) {
        try {
            const response = await fetch('/api/productivity/tasks/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: currentUserId,
                    text: taskText
                })
            });

            const result = await response.json();
            
            if (result.success && result.task) {
                const newTask = {
                    id: result.task.id.toString(),
                    text: result.task.text,
                    completed: result.task.completed
                };
                
                state.tasks.push(newTask);
                taskInput.value = '';
                renderTasks();
                console.log('✅ Task saved to database');
            }
        } catch (error) {
            console.error('❌ Error saving task to database:', error);
        }
    } else {
        // Fallback to localStorage for guests
        const newTask = {
            id: Date.now().toString(),
            text: taskText,
            completed: false
        };
        
        state.tasks.push(newTask);
        taskInput.value = '';
        saveState();
        renderTasks();
    }
}

// Toggle task
async function toggleTask(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const newCompletedState = !task.completed;

    // If user is logged in, save to database
    if (currentUserId) {
        try {
            const timezone = window.TimezoneUtils?.getUserTimezone() || Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            const response = await fetch(`/api/productivity/tasks/toggle/${taskId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    completed: newCompletedState,
                    user_id: currentUserId,
                    timezone: timezone
                })
            });

            const result = await response.json();
            
            if (result.success) {
                task.completed = newCompletedState;
                renderTasks();
                
                // If task was completed, update streak
                if (newCompletedState && window.StreakSystem) {
                    await window.StreakSystem.updateStreak('task');
                }
                
                console.log(`✅ Task ${newCompletedState ? 'completed' : 'uncompleted'} in database`);
            }
        } catch (error) {
            console.error('❌ Error toggling task in database:', error);
        }
    } else {
        // Fallback to localStorage for guests
        task.completed = newCompletedState;
        saveState();
        renderTasks();
    }
}

// Delete task
async function deleteTask(taskId) {
    // If user is logged in, delete from database
    if (currentUserId) {
        try {
            const response = await fetch(`/api/productivity/tasks/delete/${taskId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            
            if (result.success) {
                state.tasks = state.tasks.filter(t => t.id !== taskId);
                renderTasks();
                console.log('✅ Task deleted from database');
            }
        } catch (error) {
            console.error('❌ Error deleting task from database:', error);
        }
    } else {
        // Fallback to localStorage for guests
        state.tasks = state.tasks.filter(t => t.id !== taskId);
        saveState();
        renderTasks();
    }
}

// Timer functions
function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timerDisplay');
    const minutes = String(state.timerMinutes).padStart(2, '0');
    const seconds = String(state.timerSeconds).padStart(2, '0');
    timerDisplay.textContent = `${minutes}:${seconds}`;
    
    // Update circle progress
    updateCircleProgress();
}

function updateCircleProgress() {
    const totalSeconds = 25 * 60; // 25 minutes in seconds
    const currentSeconds = state.timerMinutes * 60 + state.timerSeconds;
    const progress = (totalSeconds - currentSeconds) / totalSeconds;
    
    const progressCircle = document.getElementById('progressCircle');
    const circumference = 2 * Math.PI * 88; // 552.92
    const offset = circumference * (1 - progress);
    
    if (progressCircle) {
        progressCircle.style.strokeDashoffset = offset;
    }
}

function toggleTimer() {
    state.isTimerRunning = !state.isTimerRunning;
    
    const timerBtnText = document.getElementById('timerBtnText');
    const playIcon = document.getElementById('playIcon');
    
    if (state.isTimerRunning) {
        timerBtnText.textContent = 'Pause';
        playIcon.innerHTML = `
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
        `;
        
        // Start timer
        state.timerInterval = setInterval(async () => {
            if (state.timerSeconds === 0) {
                if (state.timerMinutes === 0) {
                    // Timer finished
                    clearInterval(state.timerInterval);
                    state.isTimerRunning = false;
                    state.pomodoroCount++;
                    saveState();
                    
                    // Save pomodoro completion to backend
                    await savePomodoroToBackend();
                    
                    updateProgress();
                    
                    // Reset button state
                    timerBtnText.textContent = 'Start';
                    playIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
                    
                    // Show completion message
                    alert('🎉 Pomodoro completed! Great work! Take a break.');
                    resetTimer();
                } else {
                    state.timerMinutes--;
                    state.timerSeconds = 59;
                }
            } else {
                state.timerSeconds--;
            }
            updateTimerDisplay();
        }, 1000);
    } else {
        timerBtnText.textContent = 'Start';
        playIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
        
        // Stop timer
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
        }
    }
}

// Save pomodoro completion to backend
async function savePomodoroToBackend() {
    try {
        // Check if Supabase and StatsSystem are available
        if (!supabase) {
            console.warn('⚠️ Supabase not initialized, cannot save pomodoro');
            return;
        }
        
        if (!window.StatsSystem) {
            console.warn('⚠️ StatsSystem not available');
            return;
        }

        // Increment pomodoro count in backend
        const result = await window.StatsSystem.updatePomodoroCount();
        
        if (result && result.success) {
            console.log('✅ Pomodoro saved to backend. Total count:', result.pomodoro_count);
            
            // Update streak if needed
            if (window.StreakSystem) {
                await window.StreakSystem.updateStreak('pomodoro');
            }
            
            // Update profile if available
            if (window.ProfileAPI && window.ProfileAPI.refreshGamificationData) {
                await window.ProfileAPI.refreshGamificationData();
            }
        }
    } catch (error) {
        console.error('❌ Error saving pomodoro to backend:', error);
    }
}

function resetTimer() {
    // Stop timer if running
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
    }
    
    state.isTimerRunning = false;
    state.timerMinutes = 25;
    state.timerSeconds = 0;
    
    const timerBtnText = document.getElementById('timerBtnText');
    const playIcon = document.getElementById('playIcon');
    
    timerBtnText.textContent = 'Start';
    playIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
    
    updateTimerDisplay();
}

// Get current user ID
async function getCurrentUserId() {
    try {
        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && session.user) {
                return session.user.id;
            }
        }
    } catch (error) {
        console.error('Error getting user ID:', error);
    }
    return null;
}

// Load tasks from database
async function loadTasksFromDatabase() {
    try {
        if (!currentUserId) {
            console.log('⚠️ User not logged in, using localStorage tasks');
            return;
        }

        const response = await fetch(`/api/productivity/tasks/${currentUserId}`);
        const result = await response.json();

        if (result.success && result.tasks) {
            state.tasks = result.tasks.map(task => ({
                id: task.id.toString(),
                text: task.text,
                completed: task.completed
            }));
            console.log(`✅ Loaded ${state.tasks.length} tasks from database`);
            renderTasks();
        }
    } catch (error) {
        console.error('❌ Error loading tasks from database:', error);
    }
}

// Initialize the app
async function init() {
    // Initialize Supabase first
    initSupabase();
    
    // Get current user ID
    currentUserId = await getCurrentUserId();
    
    loadState();
    initMobileMenu();
    await updateProfileInitial(); // Now async
    updateStudyStats();
    
    // Load tasks from database if user is logged in
    if (currentUserId) {
        await loadTasksFromDatabase();
    } else {
        renderTasks();
    }
    
    updateTimerDisplay();
    
    console.log('Productivity Hub initialized', currentUserId ? `for user ${currentUserId}` : '(guest mode)');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Expose functions globally for HTML onclick handlers
window.addTask = addTask;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.toggleTimer = toggleTimer;
window.resetTimer = resetTimer;