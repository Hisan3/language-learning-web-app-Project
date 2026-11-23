// Student Track - English Learning App

// ============ SUPABASE CONFIGURATION ============
const SUPABASE_URL = "https://qtsfceqredvwhwukaugu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0c2ZjZXFyZWR2d2h3dWthdWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDE5NjcsImV4cCI6MjA3ODA3Nzk2N30.iJJ4wcah6BHs_ubjhwG-VU9Nj4XueSq5_Ro4sFm8QF8";

// Initialize Supabase client (available globally via CDN)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Word of the Day - Fetched from database
let wordOfTheDay = null;

// Comprehensive Lesson Data
const studentLessons = {
  // ✅ ALL HARDCODED LESSONS REMOVED
  // Lessons will be loaded from database via fetchLessonsFromDatabase()
};

// State Management
let state = {
  view: 'categories', // categories, lessons, exercise
  selectedCategory: '',
  selectedLesson: null,
  currentExercise: 0,
  selectedAnswer: null,
  score: 0,
  showResult: false,
  writingText: '',
  completedLessons: {},
  xp: 0,
  streak: 0,
  badges: [],
  wordOfTheDay: null,
  lessonIntroShown: false, // Track if lesson intro has been shown
};

// Store for subcategory icons fetched from database
let subcategoryIcons = {};

// Utility Functions
function getCategoryIcon(category) {
  console.log(`🔍 Looking up icon for: "${category}"`);
  console.log(`   Available icons:`, Object.keys(subcategoryIcons));
  
  // Check if we have a custom icon from the database (exact match)
  if (subcategoryIcons[category]) {
    console.log(`   ✅ Found exact match for "${category}"`);
    return renderSubcategoryIcon(subcategoryIcons[category]);
  }
  
  // Try case-insensitive match as fallback
  const categoryLower = category.toLowerCase();
  for (const key in subcategoryIcons) {
    if (key.toLowerCase() === categoryLower) {
      console.log(`   ✅ Found case-insensitive match: "${key}" for "${category}"`);
      return renderSubcategoryIcon(subcategoryIcons[key]);
    }
  }
  
  console.log(`   ❌ No icon found for "${category}", using default`);
  // Default fallback icon
  return '📚';
}

// Helper function to render subcategory icon based on type
function renderSubcategoryIcon(iconData) {
  if (!iconData || !iconData.icon_type) {
    return '📚'; // Default fallback
  }
  
  switch (iconData.icon_type) {
    case 'emoji':
      return `<span class="subcategory-icon emoji-icon">${iconData.icon_value || '📚'}</span>`;
    
    case 'image_url':
    case 'image_upload':
      return `<img class="subcategory-icon image-icon" src="${iconData.icon_value}" alt="Category icon" onerror="this.outerHTML='📚'">`;
    
    case 'lucide':
      // For Lucide icons, create an i element with data-lucide attribute
      // The icon will be initialized after rendering
      return `<i class="subcategory-icon lucide-icon" data-lucide="${iconData.icon_value || 'book'}"></i>`;
    
    default:
      return '📚';
  }
}

function getCategoryName(category) {
  // Return the category as-is, no hardcoded mappings
  return category;
}

function getDifficultyColor(difficulty) {
  const colors = {
    'Beginner': 'badge-green',
    'Intermediate': 'badge-yellow',
    'Advanced': 'badge-red',
  };
  return colors[difficulty] || 'badge-gray';
}

// Render Functions
function render() {
  const mainContent = document.getElementById('mainContent');
  
  switch (state.view) {
    case 'categories':
      mainContent.innerHTML = renderCategories();
      break;
    case 'lessons':
      mainContent.innerHTML = renderLessons();
      break;
    case 'exercise':
      mainContent.innerHTML = renderExercise();
      break;
  }
  
  // Initialize Lucide icons after rendering
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function renderCategories() {
  const categories = Object.keys(studentLessons);
  
  // ✅ FIX: Check if there are any categories at all
  if (categories.length === 0) {
    return `
      <div class="container space-y-6 animate-in">
        <div class="header">
          <div>
            <h1 style="color: white;">Student Path 🎓</h1>
            <p style="color: #e9d5ff;">Choose a category to begin!</p>
          </div>
          <div class="btn-group">
            <button class="btn btn-secondary" onclick="showWordOfDay()" style="border-color: #fef3c7; background: #fefce8;">
              ✨ Word of the Day
            </button>
            <button class="btn btn-secondary" onclick="changePath()">
              Change Path
            </button>
          </div>
        </div>

        <div style="text-align: center; padding: 4rem 2rem; background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #9333ea; margin-bottom: 1rem;">📚 No Lessons Available Yet</h2>
          <p style="color: #64748b; margin-bottom: 2rem;">
            Lessons will appear here once they are added through the admin panel.
          </p>
          <div style="padding: 2rem; background: #faf5ff; border-radius: 12px; margin: 2rem auto; max-width: 500px;">
            <h3 style="color: #7c3aed; margin-bottom: 1rem;">How to add lessons:</h3>
            <ol style="text-align: left; color: #64748b; line-height: 1.8;">
              <li>1. Go to the admin panel</li>
              <li>2. Navigate to "Lessons" section</li>
              <li>3. Click "Add New Lesson"</li>
              <li>4. Fill in the details and save</li>
            </ol>
          </div>
          <button class="btn btn-secondary" onclick="changePath()" style="margin-top: 1rem;">
            ← Back to Home
          </button>
        </div>
      </div>
    `;
  }
  
  let totalLessons = 0;
  categories.forEach(cat => {
    const difficulties = Object.keys(studentLessons[cat]);
    difficulties.forEach(diff => {
      totalLessons += studentLessons[cat][diff].length;
    });
  });
  
  const completedCount = Object.keys(state.completedLessons).length;
  const completionPercentage = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

  let categoriesHTML = '';
  categories.forEach((category, index) => {
    const categoryData = studentLessons[category];
    const difficulties = Object.keys(categoryData);
    let categoryLessons = [];
    difficulties.forEach(diff => {
      categoryLessons = [...categoryLessons, ...categoryData[diff]];
    });
    
    const completedInCategory = categoryLessons.filter(
      lesson => state.completedLessons[lesson.id]
    ).length;

    const diffBadges = difficulties.map(diff => 
      `<span class="badge ${getDifficultyColor(diff)}">${diff}</span>`
    ).join('');

    categoriesHTML += `
      <div class="card card-clickable card-gradient-purple" onclick="selectCategory('${category}')" style="animation-delay: ${index * 0.1}s">
        <div class="text-center space-y-4">
          <div class="category-icon">${getCategoryIcon(category)}</div>
          <h3>${getCategoryName(category)}</h3>
          <p class="text-sm text-gray">${categoryLessons.length} lessons</p>
          <div class="badge-group">
            ${diffBadges}
          </div>
          <div style="padding-top: 0.5rem;">
            <div class="progress">
              <div class="progress-bar" style="width: ${(completedInCategory / categoryLessons.length) * 100}%"></div>
            </div>
            <p class="text-xs text-gray mt-2">
              ${completedInCategory}/${categoryLessons.length} completed
            </p>
          </div>
        </div>
      </div>
    `;
  });

  return `
    <div class="container space-y-6 animate-in">
      <div class="header">
        <div>
          <h1 style="color: white;">Student Path 🎓</h1>
          <p style="color: #e9d5ff;">Choose a category to begin!</p>
        </div>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="showWordOfDay()" style="border-color: #fef3c7; background: #fefce8;">
            ✨ Word of the Day
          </button>
          <button class="btn btn-secondary" onclick="changePath()">
            Change Path
          </button>
        </div>
      </div>

      <div class="stats-card">
        <div class="stats-header">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
            <path d="M4 22h16"></path>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
          </svg>
          <div class="stats-content">
            <h3>Your Progress</h3>
            <p class="text-sm text-gray">${completedCount} of ${totalLessons} lessons completed</p>
          </div>
          <div class="stats-badges">
            <div class="badge stat-badge-fire">
              🔥 ${state.streak}
            </div>
            <div class="badge stat-badge-star">
              ⭐ ${state.xp} XP
            </div>
          </div>
        </div>
        <div class="progress" style="height: 0.75rem;">
          <div class="progress-bar" style="width: ${completionPercentage}%"></div>
        </div>
      </div>

      <div class="grid grid-3">
        ${categoriesHTML}
      </div>
    </div>
  `;
}

function renderLessons() {
  const categoryData = studentLessons[state.selectedCategory];
  
  // ✅ FIX: Check if categoryData exists
  if (!categoryData || typeof categoryData !== 'object') {
    console.warn(`⚠️ No lessons found for category: ${state.selectedCategory}`);
    return `
      <div class="container">
        <button onclick="backToCategories()" class="back-btn">
          <span>←</span> Back to Categories
        </button>
        
        <div class="category-header">
          <h1 class="title-gradient">${getCategoryName(state.selectedCategory)}</h1>
          <p class="subtitle">No lessons available yet</p>
        </div>
        
        <div style="text-align: center; padding: 3rem;">
          <p style="font-size: 1.2rem; color: #6b7280;">No lessons found in this category.</p>
          <p style="color: #9ca3af; margin-top: 1rem;">Lessons will appear here once they are added.</p>
          <button onclick="backToCategories()" class="btn btn-primary" style="margin-top: 2rem;">
            Return to Categories
          </button>
        </div>
      </div>
    `;
  }
  
  const difficulties = Object.keys(categoryData);
  
  // ✅ FIX: Check if there are any difficulties with lessons
  if (difficulties.length === 0) {
    return `
      <div class="container">
        <button onclick="backToCategories()" class="back-btn">
          <span>←</span> Back to Categories
        </button>
        
        <div class="category-header">
          <h1 class="title-gradient">${getCategoryName(state.selectedCategory)}</h1>
          <p class="subtitle">No lessons available yet</p>
        </div>
        
        <div style="text-align: center; padding: 3rem;">
          <p style="font-size: 1.2rem; color: #6b7280;">No lessons found in this category.</p>
          <button onclick="backToCategories()" class="btn btn-primary" style="margin-top: 2rem;">
            Return to Categories
          </button>
        </div>
      </div>
    `;
  }

  let lessonsHTML = '';
  
  difficulties.forEach((difficulty, diffIndex) => {
    const difficultyLessons = categoryData[difficulty];
    
    // ✅ FIX: Skip if no lessons in this difficulty
    if (!difficultyLessons || difficultyLessons.length === 0) {
      return;
    }
    
    let lessonItems = '';
    difficultyLessons.forEach((lesson, index) => {
      const isCompleted = state.completedLessons[lesson.id];
      const previousLesson = index > 0 ? difficultyLessons[index - 1] : 
        (diffIndex > 0 ? categoryData[difficulties[diffIndex - 1]].slice(-1)[0] : null);
      const isLocked = previousLesson && !state.completedLessons[previousLesson.id];

      const lessonNumberClass = isLocked ? 'lesson-number-locked' : 
        (isCompleted ? 'lesson-number-completed' : 'lesson-number-active');

      lessonItems += `
        <div class="card ${isLocked ? 'opacity-50 cursor-not-allowed' : 'card-clickable'}" 
             onclick="${isLocked ? '' : `selectLesson('${lesson.id}')`}"
             style="animation-delay: ${index * 0.1}s; ${isLocked ? '' : 'background: linear-gradient(to right, white, #faf5ff); border: 2px solid #e9d5ff;'}">
          <div class="lesson-item">
            <div class="lesson-number ${lessonNumberClass}">
              ${isLocked ? '🔒' : isCompleted ? '✅' : index + 1}
            </div>
            <div class="lesson-content">
              <h3>${lesson.title}</h3>
              <p class="text-sm text-gray">${lesson.description}</p>
              <div class="lesson-badges">
                <span class="badge badge-purple">${lesson.exercises.length} exercises</span>
                <span class="badge badge-yellow">+${lesson.xp} XP</span>
                ${isCompleted ? '<span class="badge badge-green">✓ Completed</span>' : ''}
              </div>
            </div>
            ${!isLocked ? '<span style="font-size: 1.5rem;">›</span>' : ''}
          </div>
        </div>
      `;
    });

    lessonsHTML += `
      <div class="difficulty-section">
        <div class="difficulty-header">
          <span class="badge ${getDifficultyColor(difficulty)}" style="padding: 0.5rem 1rem;">
            ${difficulty}
          </span>
          <div class="difficulty-line"></div>
        </div>
        <div class="space-y-4">
          ${lessonItems}
        </div>
      </div>
    `;
  });

  return `
    <div class="container-small space-y-6 animate-in">
      <div class="flex items-center gap-4 mb-6">
        <button class="btn btn-secondary" onclick="backToCategories()">
          ← 
        </button>
        <div>
          <h1 style="color: white;">${getCategoryIcon(state.selectedCategory)} ${getCategoryName(state.selectedCategory)}</h1>
          <p style="color: #ffffffff;">Select a lesson to start learning!</p>
        </div>
      </div>

      ${lessonsHTML}
    </div>
  `;
}

function renderLessonIntro() {
  const lesson = state.selectedLesson;
  
  return `
    <div class="container-small space-y-6 animate-in">
      <div class="flex items-center justify-between mb-6">
        <button class="btn btn-secondary" onclick="exitLesson()">
          ← Exit
        </button>
        <span class="badge badge-purple">📚 Lesson Content</span>
      </div>

      <div class="card" style="padding: 2rem;">
        <h1 style="color: #7c3aed; margin-bottom: 1rem;">${lesson.title}</h1>
        <p style="color: #64748b; margin-bottom: 2rem; font-size: 1.1rem;">${lesson.description}</p>
        
        ${lesson.image_url ? `
          <div style="margin-bottom: 2rem; text-align: center;">
            <img src="${lesson.image_url}" alt="${lesson.title}" 
                 style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
          </div>
        ` : ''}
        
        ${lesson.content ? `
          <div class="lesson-content-html" style="line-height: 1.8; color: #334155;">
            ${lesson.content}
          </div>
        ` : ''}
        
        <div style="margin-top: 2rem; padding-top: 2rem; border-top: 2px solid #e9d5ff;">
          <div class="flex items-center justify-between">
            <div>
              <p style="color: #64748b; margin-bottom: 0.5rem;">Ready to practice?</p>
              <p style="color: #9333ea; font-weight: 600;">${lesson.exercises.length} exercises • ${lesson.xp} XP</p>
            </div>
            <button class="btn btn-primary" onclick="startLessonExercises()" style="padding: 1rem 2rem; font-size: 1.1rem;">
              Start Exercises →
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderExercise() {
  if (state.showResult) {
    return renderResult();
  }

  const lesson = state.selectedLesson;
  
  // Show lesson intro/content first if available and not yet shown
  if (!state.lessonIntroShown && (lesson.content || lesson.image_url)) {
    return renderLessonIntro();
  }
  
  const exercise = lesson.exercises[state.currentExercise];
  const progress = ((state.currentExercise + 1) / lesson.exercises.length) * 100;

  let exerciseContent = '';

  // Picture exercises
  if (exercise.type === 'pictureMatch' && exercise.imageUrl) {
    exerciseContent += `
      <img src="${exercise.imageUrl}" alt="Learning image" class="exercise-image" />
    `;
  }

  // Reading exercises
  if (exercise.type === 'reading' && exercise.passage) {
    const passageHTML = exercise.passage.split('**').map((part, i) => {
      if (i % 2 === 1 && exercise.highlightedWords && exercise.highlightedWords[part]) {
        return `<span class="highlighted-word" data-tooltip="${exercise.highlightedWords[part]}">${part}</span>`;
      }
      return part;
    }).join('');

    exerciseContent += `
      <div class="reading-passage">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9333ea" stroke-width="2" style="margin-bottom: 0.75rem;">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        <div>${passageHTML}</div>
      </div>
    `;
  }

  // Flashcard
  if (exercise.type === 'flashcard') {
    exerciseContent += `
      <div class="flashcard">
        <h3 class="flashcard-word">${exercise.word}</h3>
        <p class="text-gray">${exercise.meaning}</p>
        <div class="flashcard-example">
          <p>"${exercise.example}"</p>
        </div>
      </div>
    `;
  }

  // Roleplay scenario
  if (exercise.type === 'roleplay' && exercise.scenario) {
    exerciseContent += `
      <div class="scenario-box" style="padding: 1.5rem; background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%); border-radius: 1rem; margin-bottom: 1.5rem;">
        <h3>Scenario:</h3>
        <p>${exercise.scenario}</p>
      </div>
    `;
  }

  // Dialogue
  if (exercise.type === 'dialogue' && exercise.conversation) {
    const dialogueHTML = exercise.conversation.map(line => `
      <div class="dialogue-box">
        <div class="dialogue-speaker">${line.speaker}:</div>
        <div class="dialogue-text">${line.text}</div>
      </div>
    `).join('');
    
    exerciseContent += `
      <div style="margin-bottom: 1.5rem;">
        ${dialogueHTML}
      </div>
    `;
  }

  // Writing exercise
  if (exercise.type === 'writing') {
    const wordCount = state.writingText.trim().split(/\s+/).filter(w => w).length;
    const tipsHTML = exercise.tips.map(tip => `<li>• ${tip}</li>`).join('');

    exerciseContent += `
      <div class="space-y-4">
        <div class="writing-prompt">
          <h3 style="margin-bottom: 0.75rem;">Writing Prompt:</h3>
          <p style="margin-bottom: 1rem;">${exercise.prompt}</p>
          <div class="writing-tips">
            <h4>💡 Tips:</h4>
            <ul>${tipsHTML}</ul>
          </div>
        </div>
        <textarea 
          class="textarea" 
          placeholder="Start writing here..."
          oninput="updateWritingText(this.value)"
        >${state.writingText}</textarea>
        <div class="flex justify-between items-center">
          <p class="text-sm text-gray">
            Word count: ${wordCount} / ${exercise.minWords} minimum
          </p>
          <button 
            class="btn btn-primary" 
            onclick="submitWriting()"
            ${wordCount < exercise.minWords ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
          >
            ✉️ Submit Writing
          </button>
        </div>
      </div>
    `;
  }

  // Question and options for non-writing exercises
  if (exercise.type !== 'writing') {
    if (exercise.word && !exercise.imageUrl && exercise.type !== 'dialogue') {
      exerciseContent += `
        <div style="text-align: center; margin-bottom: 1.5rem; padding: 1rem; background: rgba(255, 255, 255, 0.5); border-radius: 1rem;">
          <p class="text-sm text-gray mb-2">Word:</p>
          <h3 style="font-size: 2rem; color: #9333ea;">${exercise.word}</h3>
        </div>
      `;
    }

    // Only render question if it exists
    if (exercise.question) {
      exerciseContent += `<h2 style="text-align: center; margin-bottom: 1.5rem;">${exercise.question}</h2>`;
    }

    // Only render options if they exist and are an array
    if (exercise.options && Array.isArray(exercise.options) && exercise.options.length > 0) {
      const optionsHTML = exercise.options.map((option, index) => {
      const isSelected = state.selectedAnswer === index;
      const isCorrect = index === exercise.correct;
      const showFeedback = state.selectedAnswer !== null;

      let btnClass = 'answer-option';
      let emoji = '';
      if (showFeedback && isCorrect) {
        btnClass += ' answer-correct';
        emoji = '<span style="font-size: 1.5rem;">✅</span>';
      } else if (showFeedback && isSelected && !isCorrect) {
        btnClass += ' answer-incorrect';
        emoji = '<span style="font-size: 1.5rem;">❌</span>';
      }

        return `
          <button 
            class="${btnClass}" 
            onclick="handleAnswer(${index})"
            ${showFeedback ? 'disabled' : ''}
          >
            <span>${option}</span>
            ${emoji}
          </button>
        `;
      }).join('');

      exerciseContent += `<div class="space-y-4">${optionsHTML}</div>`;
    }
  }

  // Feedback message
  let feedbackHTML = '';
  if (state.selectedAnswer !== null && exercise.type !== 'writing') {
    const isCorrect = state.selectedAnswer === exercise.correct;
    feedbackHTML = `
      <div class="feedback-message ${isCorrect ? 'feedback-success' : 'feedback-try-again'}">
        <p style="font-size: 1.5rem;">
          ${isCorrect ? '🎉 Excellent! Keep it up!' : '💪 Good try! Keep learning!'}
        </p>
      </div>
    `;
  }

  return `
    <div class="container-small space-y-6 animate-in">
      <div class="flex justify-between items-center">
        <button class="btn btn-secondary" onclick="exitLesson()">
          ← Exit
        </button>
        <span class="badge badge-purple" style="padding: 0.5rem 1rem;">
          ${state.currentExercise + 1} / ${lesson.exercises.length}
        </span>
      </div>

      <div class="progress">
        <div class="progress-bar" style="width: ${progress}%"></div>
      </div>

      <div class="card card-gradient-purple" style="padding: 2rem;">
        <div class="space-y-6">
          ${exerciseContent}
        </div>
      </div>

      ${feedbackHTML}
    </div>
  `;
}

function renderResult() {
  const lesson = state.selectedLesson;
  const percentage = (state.score / lesson.exercises.length) * 100;
  const earnedXP = Math.floor((percentage / 100) * lesson.xp);

  const emoji = percentage === 100 ? '🎉' : percentage >= 70 ? '🌟' : '💪';
  const title = percentage === 100 ? 'Perfect!' : percentage >= 70 ? 'Well Done!' : 'Keep Practicing!';

  return `
    <div class="container-small space-y-6 animate-in">
      <div class="text-center space-y-6">
        <div class="result-emoji">${emoji}</div>
        <h1 style="color: white;">${title}</h1>
        
        <div class="card card-gradient-yellow" style="padding: 2rem;">
          <h2 style="margin-bottom: 1rem;">Lesson Complete! 🎯</h2>
          <div class="space-y-4">
            <div class="result-score">${state.score}/${lesson.exercises.length}</div>
            <div class="progress" style="height: 1rem;">
              <div class="progress-bar" style="width: ${percentage}%"></div>
            </div>
            <p style="font-size: 1.25rem;">${percentage.toFixed(0)}% Correct!</p>
            <div class="badge" style="font-size: 1.125rem; padding: 0.75rem 1.5rem; background: linear-gradient(to right, #fef3c7, #fed7aa);">
              +${earnedXP} XP Earned! ⭐
            </div>
          </div>
        </div>

        <div class="btn-group" style="justify-content: center;">
          <button class="btn btn-primary" onclick="retryLesson()" style="background: linear-gradient(to right, #60a5fa, #a78bfa);">
            🔄 Retry Lesson
          </button>
          <button class="btn btn-primary" onclick="nextLesson()" style="background: linear-gradient(to right, #a78bfa, #ec4899);">
            Next Lesson →
          </button>
        </div>
      </div>
    </div>
  `;
}

// Event Handlers
function selectCategory(category) {
  state.selectedCategory = category;
  state.view = 'lessons';
  saveState();
  render();
}

function backToCategories() {
  state.view = 'categories';
  state.selectedCategory = '';
  state.selectedLesson = null;
  resetLesson();
  saveState();
  render();
}

function selectLesson(lessonId) {
  const categoryData = studentLessons[state.selectedCategory];
  
  let foundLesson = null;
  Object.keys(categoryData).forEach(difficulty => {
    const lesson = categoryData[difficulty].find(l => l.id === lessonId);
    if (lesson) foundLesson = lesson;
  });

  if (foundLesson) {
    state.selectedLesson = foundLesson;
    state.view = 'exercise';
    resetLesson();
    saveState();
    render();
  }
}

function startLessonExercises() {
  state.lessonIntroShown = true;
  saveState();
  render();
}

function exitLesson() {
  state.view = 'lessons';
  state.selectedLesson = null;
  resetLesson();
  saveState();
  render();
}

function handleAnswer(answerIndex) {
  if (state.selectedAnswer !== null) return;

  state.selectedAnswer = answerIndex;
  const exercise = state.selectedLesson.exercises[state.currentExercise];
  const isCorrect = answerIndex === exercise.correct;

  if (isCorrect) {
    state.score++;
  }

  saveState();
  render();

  setTimeout(() => {
    if (state.currentExercise < state.selectedLesson.exercises.length - 1) {
      state.currentExercise++;
      state.selectedAnswer = null;
      state.writingText = '';
      saveState();
      render();
    } else {
      completeLesson(isCorrect);
    }
  }, 1500);
}

function updateWritingText(text) {
  state.writingText = text;
  saveState();
}

function submitWriting() {
  const exercise = state.selectedLesson.exercises[state.currentExercise];
  const wordCount = state.writingText.trim().split(/\s+/).filter(w => w).length;
  
  if (wordCount < exercise.minWords) return;

  state.score++;
  saveState();

  setTimeout(() => {
    if (state.currentExercise < state.selectedLesson.exercises.length - 1) {
      state.currentExercise++;
      state.writingText = '';
      saveState();
      render();
    } else {
      completeLesson(true);
    }
  }, 1000);
}

async function completeLesson(lastAnswerCorrect) {
  state.showResult = true;
  const finalScore = state.score + (lastAnswerCorrect ? 1 : 0);
  const percentage = (finalScore / state.selectedLesson.exercises.length) * 100;
  
  state.completedLessons[state.selectedLesson.id] = true;
  
  if (percentage === 100 && !state.badges.includes('🎯 Perfect Score')) {
    state.badges.push('🎯 Perfect Score');
  }
  
  const earnedXP = Math.floor((percentage / 100) * state.selectedLesson.xp);
  state.xp += earnedXP;
  state.streak++;
  
  // Save to backend
  await saveLessonCompletionToBackend(finalScore, earnedXP);
  
  saveState();
  render();
}

// Save lesson completion to backend
async function saveLessonCompletionToBackend(finalScore, earnedXP) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      console.log('⚠️ User not logged in, lesson completion not saved to backend');
      return;
    }

    const userId = session.user.id;
    
    // FIXED: Get user's timezone to send to backend
    const timezone = window.TimezoneUtils?.getUserTimezone() || Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log(`📅 [Student Lesson Complete] Sending timezone: ${timezone}`);
    
    const response = await fetch('/api/lessons/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        lesson_id: state.selectedLesson.id,
        score: finalScore,
        total_exercises: state.selectedLesson.exercises.length,
        xp_earned: earnedXP,
        category: 'student', // or get from state.selectedCategory
        timezone: timezone // FIXED: Pass user's timezone
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Lesson completion saved to backend:', result);
      
      // Update streak in backend
      if (window.StreakSystem) {
        await window.StreakSystem.updateStreak('lesson');
      }
      
      // Check for new badges
      if (window.BadgeSystem && window.StatsSystem) {
        const stats = await window.StatsSystem.getUserStats(userId);
        await window.BadgeSystem.checkBadgeEligibility(userId, stats);
      }
    } else {
      console.error('❌ Failed to save lesson completion:', result.error);
    }
  } catch (error) {
    console.error('❌ Error saving lesson completion to backend:', error);
  }
}

function resetLesson() {
  state.currentExercise = 0;
  state.selectedAnswer = null;
  state.score = 0;
  state.showResult = false;
  state.writingText = '';
  state.lessonIntroShown = false; // Reset intro flag when lesson resets
}

function retryLesson() {
  resetLesson();
  saveState();
  render();
}

function nextLesson() {
  state.view = 'lessons';
  state.selectedLesson = null;
  resetLesson();
  saveState();
  render();
}

// Local Storage
function saveState() {
  // Get current user ID to make state user-specific
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session && session.user) {
      const userId = session.user.id;
      localStorage.setItem(`studentLearningState_${userId}`, JSON.stringify(state));
    } else {
      // Fallback to non-user-specific storage if not logged in
      localStorage.setItem('studentLearningState', JSON.stringify(state));
    }
  });
}

async function loadState() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session && session.user) {
      const userId = session.user.id;
      const saved = localStorage.getItem(`studentLearningState_${userId}`);
      
      if (saved) {
        const parsed = JSON.parse(saved);
        // Don't load wordOfTheDay from localStorage - always fetch fresh from database
        delete parsed.wordOfTheDay;
        state = { ...state, ...parsed };
        console.log(`✅ Loaded student state for user: ${userId}`);
      } else {
        console.log(`ℹ️ No saved state for user: ${userId}, starting fresh`);
        // Initialize empty completed lessons for this user
        state.completedLessons = {};
      }
    } else {
      // Fallback for non-logged-in users
      const saved = localStorage.getItem('studentLearningState');
      if (saved) {
        const parsed = JSON.parse(saved);
        delete parsed.wordOfTheDay;
        state = { ...state, ...parsed };
      }
    }
  } catch (error) {
    console.error('❌ Error loading state:', error);
  }
}

// Load gamification data from backend
async function loadGamificationData() {
  try {
    if (!window.StatsSystem) {
      console.warn('⚠️ StatsSystem not loaded yet');
      return;
    }

    // Get user stats (includes XP, streak, etc.)
    const stats = await window.StatsSystem.getUserStats();
    
    if (stats) {
      state.xp = stats.total_xp || 0;
      state.streak = stats.streak || 0;
      console.log(`✅ Loaded gamification data - XP: ${state.xp}, Streak: ${state.streak}`);
    }
  } catch (error) {
    console.error('❌ Error loading gamification data:', error);
  }
}

// Add tooltip functionality for highlighted words
document.addEventListener('mouseover', (e) => {
  if (e.target.classList.contains('highlighted-word')) {
    const tooltip = e.target.getAttribute('data-tooltip');
    if (tooltip) {
      const tooltipEl = document.createElement('div');
      tooltipEl.className = 'word-tooltip';
      tooltipEl.textContent = tooltip;
      e.target.appendChild(tooltipEl);
    }
  }
});

document.addEventListener('mouseout', (e) => {
  if (e.target.classList.contains('highlighted-word')) {
    const tooltip = e.target.querySelector('.word-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }
});

// Fetch Word of the Day from database
async function fetchWordOfTheDay() {
  try {
    // Get user's timezone
    const userTimezone = getUserTimezone();
    console.log(`🌍 User timezone: ${userTimezone}`);
    
    const response = await fetch(`/api/wordofday?timezone=${encodeURIComponent(userTimezone)}`);
    const result = await response.json();
    
    if (result.success && result.word) {
      wordOfTheDay = result.word;
      console.log('✅ Word of the Day loaded:', wordOfTheDay.word);
    } else {
      console.log('ℹ️ No word of the day scheduled for today');
      wordOfTheDay = null;
    }
  } catch (error) {
    console.error('⚠️ Error fetching word of the day:', error);
    wordOfTheDay = null;
  }
}

// Word of the Day
function checkAndShowWordOfDay() {
  const today = new Date().toDateString();
  
  // Always update from database, don't trust localStorage
  if (wordOfTheDay) {
    state.wordOfTheDay = { 
      word: wordOfTheDay.word,
      meaning: wordOfTheDay.definition,
      example: wordOfTheDay.example,
      date: today 
    };
    showWordOfDay();
  } else if (!state.wordOfTheDay || state.wordOfTheDay.date !== today) {
    // Clear old word if no new word available
    state.wordOfTheDay = null;
    showWordOfDay();
  }
}

async function showWordOfDay() {
  // If state doesn't have word, try to fetch from database
  if (!state.wordOfTheDay && wordOfTheDay) {
    const today = new Date().toDateString();
    state.wordOfTheDay = { 
      word: wordOfTheDay.word,
      meaning: wordOfTheDay.definition,
      example: wordOfTheDay.example,
      date: today 
    };
  }
  
  // If still no word, fetch from API
  if (!state.wordOfTheDay) {
    await fetchWordOfTheDay();
    if (wordOfTheDay) {
      const today = new Date().toDateString();
      state.wordOfTheDay = { 
        word: wordOfTheDay.word,
        meaning: wordOfTheDay.definition,
        example: wordOfTheDay.example,
        date: today 
      };
    }
  }
  
  // Show modal with word or fallback message
  if (state.wordOfTheDay) {
    document.getElementById('wordOfDayWord').textContent = state.wordOfTheDay.word;
    document.getElementById('wordOfDayMeaning').textContent = state.wordOfTheDay.meaning;
    document.getElementById('wordOfDayExample').textContent = `"${state.wordOfTheDay.example}"`;
  } else {
    // Fallback when no word is available
    document.getElementById('wordOfDayWord').textContent = "No Word Available";
    document.getElementById('wordOfDayMeaning').textContent = "Check back tomorrow for a new word!";
    document.getElementById('wordOfDayExample').textContent = "";
  }
  
  document.getElementById('wordOfDayModal').classList.remove('hidden');
}

function closeWordOfDay() {
  document.getElementById('wordOfDayModal').classList.add('hidden');
}

function changePath() {
  window.location.href = 'learnhome.html';
}

// Initialize App
window.addEventListener('DOMContentLoaded', async () => {
  loadState();
  await fetchLessonsFromDatabase();  // Wait for database lessons to load
  await fetchSubcategoryIcons();  // Fetch subcategory icons from database
  await fetchWordOfTheDay();  // Fetch word of the day from database
  await loadGamificationData();  // Load gamification data from backend
  render();  // Now render with database lessons included
  checkAndShowWordOfDay();
});

// ============ FETCH LESSONS FROM DATABASE ============
async function fetchLessonsFromDatabase() {
  try {
    const response = await fetch('/api/lessons/student');
    const result = await response.json();
    
    if (result.success && result.lessons && result.lessons.length > 0) {
      console.log(`✅ Loaded ${result.lessons.length} lessons from database`);
      
      // Merge database lessons with hardcoded lessons
      mergeDatabaseLessons(result.lessons);
    } else {
      console.log('ℹ️ No lessons found in database, using hardcoded lessons');
    }
  } catch (error) {
    console.error('⚠️ Error fetching lessons from database:', error);
    console.log('ℹ️ Falling back to hardcoded lessons');
  }
}

// ============ FETCH SUBCATEGORY ICONS FROM DATABASE ============
async function fetchSubcategoryIcons() {
  try {
    const response = await fetch('/api/subcategories/student');
    const result = await response.json();
    
    if (result.success && result.subcategories && result.subcategories.length > 0) {
      console.log(`✅ Loaded ${result.subcategories.length} subcategory icons from database`);
      
      // Store subcategory icons by their original name (preserve capitalization)
      result.subcategories.forEach(subcat => {
        subcategoryIcons[subcat.name] = {
          icon_type: subcat.icon_type,
          icon_value: subcat.icon_value
        };
        console.log(`📁 Icon for "${subcat.name}": ${subcat.icon_type} = ${subcat.icon_value}`);
        console.log(`   Full data:`, subcat);
      });
      
      // Debug: Show all available icon keys
      console.log('📋 All subcategory icon keys:', Object.keys(subcategoryIcons));
    } else {
      console.log('ℹ️ No subcategory icons found in database');
    }
  } catch (error) {
    console.error('⚠️ Error fetching subcategory icons:', error);
  }
}

// Convert database lesson to frontend format
function convertDatabaseLesson(dbLesson) {
  // If the lesson already has exercises in the database, use them
  const exercises = dbLesson.exercises && Array.isArray(dbLesson.exercises) && dbLesson.exercises.length > 0
    ? dbLesson.exercises
    : generateDefaultExercises(dbLesson);
  
  return {
    id: dbLesson.id,
    title: dbLesson.title,
    description: dbLesson.description,
    difficulty: capitalizeFirst(dbLesson.difficulty),
    xp: dbLesson.xp || 50,
    exercises: exercises,
    content: dbLesson.content || '',  // Include lesson content
    image_url: dbLesson.image_url || '',  // Include image URL
    fromDatabase: true // Mark as coming from database
  };
}

// Generate default exercises from lesson content if no exercises exist
function generateDefaultExercises(dbLesson) {
  // Create a simple reading comprehension exercise from the content
  return [
    {
      type: 'flashcard',
      word: dbLesson.title,
      meaning: dbLesson.description,
      example: dbLesson.content ? dbLesson.content.substring(0, 200).replace(/<[^>]*>/g, '') : 'Practice this lesson.',
      question: 'How well do you understand this concept?',
      options: ['Understood', 'Need more practice', 'Review again', 'Got it!'],
      correct: 0
    }
  ];
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Merge database lessons into the lesson structure
function mergeDatabaseLessons(dbLessons) {
  console.log(`📚 Merging ${dbLessons.length} lessons from database...`);
  
  dbLessons.forEach(dbLesson => {
    // Use the database subcategory directly (preserve original capitalization)
    const subcategory = dbLesson.subcategory || 'General';
    const difficulty = (dbLesson.difficulty || 'beginner').toLowerCase();
    
    console.log(`  📖 "${dbLesson.title}"`);
    console.log(`     Subcategory: "${subcategory}"`);
    console.log(`     Difficulty: "${difficulty}"`);
    
    // Initialize subcategory if it doesn't exist
    if (!studentLessons[subcategory]) {
      studentLessons[subcategory] = {
        beginner: [],
        intermediate: [],
        advanced: []
      };
      console.log(`     ✨ Created new subcategory: "${subcategory}"`);
    }
    
    // Initialize difficulty array if it doesn't exist
    if (!studentLessons[subcategory][difficulty]) {
      studentLessons[subcategory][difficulty] = [];
    }
    
    // Convert and add the lesson
    const convertedLesson = convertDatabaseLesson(dbLesson);
    
    // Check if lesson already exists (avoid duplicates)
    const existingIndex = studentLessons[subcategory][difficulty].findIndex(
      lesson => lesson.id === convertedLesson.id
    );
    
    if (existingIndex >= 0) {
      // Update existing lesson
      studentLessons[subcategory][difficulty][existingIndex] = convertedLesson;
    } else {
      // Add new lesson
      studentLessons[subcategory][difficulty].push(convertedLesson);
    }
  });
  
  console.log('📚 Lessons merged successfully');
  console.log('📚 Available subcategories:', Object.keys(studentLessons));
  
  // Show lesson counts per subcategory
  Object.keys(studentLessons).forEach(subcat => {
    const total = Object.values(studentLessons[subcat]).flat().length;
    console.log(`   "${subcat}": ${total} lessons`);
  });
}

// Helper function to get user's timezone
function getUserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}