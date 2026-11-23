// Mood Quiz JavaScript with Supabase Integration

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
// STATE MANAGEMENT
// ============================================
let questions = [];
let currentQuestion = 0;
let answers = {};
let currentUser = null;

// DOM Elements
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const progressFill = document.getElementById('progress-fill');
const questionCount = document.getElementById('question-count');
const progressPercent = document.getElementById('progress-percent');
const completionModal = document.getElementById('completion-modal');
const moodText = document.getElementById('mood-text');
const averageScoreText = document.getElementById('average-score');

// ============================================
// FETCH QUIZ QUESTIONS FROM SUPABASE
// ============================================
async function fetchQuizQuestions() {
  try {
    console.log('🔄 Fetching mood quiz questions from Supabase...');
    
    const { data: quizzes, error } = await supabase
      .from('moodquizlist')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) throw error;

    console.log('✅ Fetched quizzes:', quizzes);

    // Parse options from JSON string and format questions
    questions = quizzes.map(quiz => ({
      id: quiz.id,
      question: quiz.question,
      icon_type: quiz.icon_type,
      icon_value: quiz.icon_value,
      icon_color: quiz.icon_color,
      options: typeof quiz.options === 'string' ? JSON.parse(quiz.options) : quiz.options
    }));

    console.log('✅ Parsed questions:', questions);

    if (questions.length > 0) {
      renderQuestion();
    } else {
      questionText.textContent = 'No quiz questions available at the moment.';
      console.log('⚠️ No quiz questions found');
    }

  } catch (error) {
    console.error('❌ Error fetching quiz questions:', error);
    questionText.textContent = 'Error loading quiz. Please try again later.';
  }
}

// ============================================
// GET CURRENT USER SESSION
// ============================================
async function getCurrentUser() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (user) {
      currentUser = user;
      console.log('✅ User logged in:', user.email);
      
      // Update UI to show logged in status
      const userStatus = document.getElementById('user-status');
      if (userStatus) {
        userStatus.textContent = `Logged in as: ${user.email}`;
        userStatus.style.color = '#4ade80';
      }
      
      return user;
    } else {
      console.log('⚠️ No user session found');
      
      // Update UI to show not logged in
      const userStatus = document.getElementById('user-status');
      if (userStatus) {
        userStatus.textContent = 'Not logged in (results will be saved as Guest)';
        userStatus.style.color = '#f97316';
      }
      
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting user session:', error);
    return null;
  }
}

// ============================================
// RENDER QUESTION
// ============================================
function renderQuestion() {
  if (questions.length === 0) return;

  const q = questions[currentQuestion];
  questionText.textContent = q.question;
  optionsContainer.innerHTML = '';

  q.options.forEach(opt => {
    const btn = document.createElement('div');
    btn.className = 'option-btn';
    if (answers[currentQuestion] === opt.value) btn.classList.add('selected');

    // Icon/Image
    const icon = document.createElement('div');
    icon.className = 'option-icon';
    
    // Use gradient color if provided, otherwise use default
    if (opt.color) {
      icon.style.background = opt.color;
    } else {
      icon.style.background = getColorForValue(opt.value);
    }

    // Display emoji or image
    if (opt.image) {
      const img = document.createElement('img');
      img.src = opt.image;
      img.alt = opt.text;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '8px';
      icon.appendChild(img);
    } else if (opt.lucide) {
      // Lucide icon
      const lucideIcon = document.createElement('i');
      lucideIcon.setAttribute('data-lucide', opt.lucide);
      lucideIcon.style.width = '24px';
      lucideIcon.style.height = '24px';
      lucideIcon.style.color = 'white';
      icon.appendChild(lucideIcon);
      // Initialize the lucide icon
      setTimeout(() => lucide.createIcons(), 0);
    } else {
      icon.textContent = opt.emoji || '😊';
    }

    const text = document.createElement('span');
    text.textContent = opt.text;

    btn.appendChild(icon);
    btn.appendChild(text);

    if (answers[currentQuestion] === opt.value) {
      const check = document.createElement('div');
      check.className = 'option-check';
      check.textContent = '✓';
      btn.appendChild(check);
    }

    btn.addEventListener('click', () => {
      answers[currentQuestion] = opt.value;
      renderQuestion();
      nextBtn.classList.remove('disabled');
    });

    optionsContainer.appendChild(btn);
  });

  prevBtn.classList.toggle('disabled', currentQuestion === 0);
  nextBtn.classList.toggle('disabled', answers[currentQuestion] === undefined);

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  progressFill.style.width = progress + '%';
  questionCount.textContent = `Question ${currentQuestion + 1} of ${questions.length}`;
  progressPercent.textContent = `${Math.round(progress)}% Complete`;
}

// ============================================
// COLOR HELPER FOR DEFAULT GRADIENTS
// ============================================
function getColorForValue(value) {
  switch (value) {
    case 5: return "linear-gradient(to right, #4ade80, #10b981)";
    case 4: return "linear-gradient(to right, #60a5fa, #06b6d4)";
    case 3: return "linear-gradient(to right, #facc15, #f97316)";
    case 2: return "linear-gradient(to right, #f97316, #ef4444)";
    case 1: return "linear-gradient(to right, #ef4444, #ec4899)";
    default: return "#ccc";
  }
}

// ============================================
// NAVIGATION BUTTONS
// ============================================
prevBtn.addEventListener('click', () => {
  if (currentQuestion > 0) {
    currentQuestion--;
    renderQuestion();
  }
});

nextBtn.addEventListener('click', async () => {
  if (answers[currentQuestion] === undefined) return;

  if (currentQuestion < questions.length - 1) {
    currentQuestion++;
    renderQuestion();
  } else {
    // Quiz completed
    const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
    const maxScore = questions.length * 5;
    const percentage = (totalScore / maxScore) * 100;

    const result = { 
      date: new Date().toISOString(), 
      answers, 
      totalScore, 
      maxScore, 
      percentage, 
      userId: currentUser?.id || null 
    };

    // Save to localStorage as backup
    const existingResults = JSON.parse(localStorage.getItem('moodResults') || '[]');
    existingResults.push(result);
    localStorage.setItem('moodResults', JSON.stringify(existingResults));

    // Save to Supabase
    await saveMoodResult(result);

    // Show completion modal
    showCompletion(result);
  }
});

// ============================================
// SAVE MOOD RESULT TO SUPABASE
// ============================================
async function saveMoodResult(result) {
  try {
    console.log('💾 Saving mood result...');
    
    // Re-fetch user session to ensure we have the latest data
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (user) {
      currentUser = user;
      console.log('✅ Refreshed user session:', user.email);
    }
    
    console.log('Current User:', currentUser);
    console.log('User Email:', currentUser?.email);
    console.log('User ID:', currentUser?.id);
    
    const { data, error } = await supabase
      .from('mood_results')
      .insert([
        {
          user_id: result.userId || currentUser?.id || null,
          user_email: currentUser?.email || null,
          total_score: result.totalScore,
          max_score: result.maxScore,
          percentage: result.percentage,
          answers: JSON.stringify(result.answers),
          completed_at: result.date
        }
      ])
      .select();

    if (error) throw error;

    console.log('✅ Mood result saved to Supabase:', data);
    console.log('📧 Saved email:', data[0]?.user_email);
    console.log('🆔 Saved user_id:', data[0]?.user_id);

    // Update dashboard after saving result
    if (currentUser) {
      await updateMoodDashboard(currentUser.id);
    }
  } catch (error) {
    console.error('❌ Error saving mood result:', error);
    // Don't show error to user, localStorage backup exists
  }
}

// ============================================
// UPDATE MOOD DASHBOARD
// ============================================
async function updateMoodDashboard(userId) {
  try {
    console.log('📊 Updating mood dashboard...');

    // Fetch all mood results for this user
    const { data: moodResults, error: fetchError } = await supabase
      .from('mood_results')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: true });

    if (fetchError) throw fetchError;

    if (!moodResults || moodResults.length === 0) {
      console.log('⚠️ No mood results found');
      return;
    }

    // Map to include percentage
    const moodData = moodResults.map(entry => ({
      ...entry,
      percentage: entry.max_score > 0 ? (entry.total_score / entry.max_score) * 100 : 0
    }));

    // Calculate latest mood
    const latest = moodData[moodData.length - 1];
    const latestPercentage = latest.percentage;
    
    let moodStatus = 'No data';
    if (latestPercentage >= 75) moodStatus = 'Excellent';
    else if (latestPercentage >= 50) moodStatus = 'Good';
    else if (latestPercentage >= 35) moodStatus = 'Fair';
    else moodStatus = 'Needs Attention';

    // Calculate weekly average (last 7 entries)
    const recent = moodData.slice(-7);
    const weeklyAvg = recent.reduce((sum, d) => sum + d.percentage, 0) / recent.length;

    // Prepare mood trend data (all results)
    const moodTrendData = moodData.map(d => ({
      date: d.completed_at,
      percentage: d.percentage,
      totalScore: d.total_score,
      maxScore: d.max_score
    }));

    // Prepare weekly chart data (last 7 days)
    const weekChartData = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = d.toISOString().split('T')[0];
      
      const found = moodData.find(m => {
        const mDate = new Date(m.completed_at);
        return mDate.toISOString().split('T')[0] === dateStr;
      });

      weekChartData.push({
        day: dayName,
        date: dateStr,
        percentage: found ? found.percentage : 0,
        totalScore: found ? found.total_score : 0,
        maxScore: found ? found.max_score : 0
      });
    }

    // Check if dashboard exists
    const { data: existingDashboard, error: checkError } = await supabase
      .from('mood_dashboard')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    const dashboardUpdate = {
      user_id: userId,
      current_mood: moodStatus,
      current_score: latest.total_score,
      current_max_score: latest.max_score,
      current_percentage: latestPercentage,
      weekly_average: weeklyAvg,
      total_checkins: moodData.length,
      mood_trend_data: moodTrendData,
      week_chart_data: weekChartData,
      last_checkin_date: latest.completed_at
    };

    if (existingDashboard) {
      // Update existing dashboard
      const { data, error } = await supabase
        .from('mood_dashboard')
        .update(dashboardUpdate)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      console.log('✅ Dashboard updated:', data);
    } else {
      // Create new dashboard
      const { data, error } = await supabase
        .from('mood_dashboard')
        .insert([dashboardUpdate])
        .select();

      if (error) throw error;
      console.log('✅ Dashboard created:', data);
    }
  } catch (error) {
    console.error('❌ Error updating mood dashboard:', error);
  }
}

// ============================================
// SHOW COMPLETION MODAL
// ============================================
function showCompletion(result) {
  const { totalScore, maxScore, percentage } = result;

  let mood = '';
  let color = '';

  if (percentage >= 75) {
    mood = 'Great! 😊';
    color = '#4ade80';
  } else if (percentage >= 50) {
    mood = 'Good 🙂';
    color = '#60a5fa';
  } else if (percentage >= 35) {
    mood = 'Okay 😐';
    color = '#facc15';
  } else {
    mood = 'Needs attention 😔';
    color = '#ef4444';
  }

  moodText.textContent = mood;
  averageScoreText.textContent = `Score: ${totalScore}/${maxScore} (${Math.round(percentage)}%)`;
  moodText.style.color = color;

  completionModal.classList.remove('hidden');
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================
function startBreathing() {
  window.location.href = 'breathing.html';
}

function goToDashboard() {
  window.location.href = 'dashboard.html';
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Mood Quiz initializing...');
  
  // Get current user
  await getCurrentUser();
  
  // Fetch quiz questions from Supabase
  await fetchQuizQuestions();
  
  console.log('✅ Mood Quiz initialized successfully');
});