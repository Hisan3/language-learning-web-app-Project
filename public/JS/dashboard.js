
// Mood Dashboard JavaScript with Supabase Integration

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
let currentUser = null;
let dashboardData = null;
let moodResultsData = [];

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
      return user;
    } else {
      console.log('⚠️ No user session found');
      // Redirect to login if needed
      // window.location.href = 'login.html';
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting user session:', error);
    return null;
  }
}

// ============================================
// FETCH MOOD RESULTS FROM SUPABASE
// ============================================
async function fetchMoodResults() {
  try {
    if (!currentUser) return [];

    console.log('🔄 Fetching mood results from Supabase...');

    const { data, error } = await supabase
      .from('mood_results')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('completed_at', { ascending: true });

    if (error) throw error;

    console.log('✅ Fetched mood results:', data);
    
    // Map to include percentage
    return data.map(entry => ({
      ...entry,
      date: entry.completed_at,
      percentage: entry.max_score > 0 ? (entry.total_score / entry.max_score) * 100 : 0
    }));
  } catch (error) {
    console.error('❌ Error fetching mood results:', error);
    return [];
  }
}

// ============================================
// FETCH OR CREATE DASHBOARD DATA
// ============================================
async function fetchOrCreateDashboard() {
  try {
    if (!currentUser) return null;

    console.log('🔄 Fetching dashboard data from Supabase...');

    // Try to fetch existing dashboard
    const { data: existingDashboard, error: fetchError } = await supabase
      .from('mood_dashboard')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine (first time user)
      throw fetchError;
    }

    if (existingDashboard) {
      console.log('✅ Dashboard found:', existingDashboard);
      return existingDashboard;
    }

    // Create new dashboard for first-time user
    console.log('📝 Creating new dashboard for user...');

    const { data: newDashboard, error: insertError } = await supabase
      .from('mood_dashboard')
      .insert([
        {
          user_id: currentUser.id,
          current_mood: 'No data',
          current_score: 0,
          current_max_score: 0,
          current_percentage: 0,
          weekly_average: 0,
          total_checkins: 0,
          mood_trend_data: [],
          week_chart_data: [],
          last_checkin_date: null
        }
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('✅ Dashboard created:', newDashboard);
    return newDashboard;
  } catch (error) {
    console.error('❌ Error fetching/creating dashboard:', error);
    return null;
  }
}

// ============================================
// UPDATE DASHBOARD DATA
// ============================================
async function updateDashboardData() {
  try {
    if (!currentUser || moodResultsData.length === 0) {
      console.log('⚠️ No mood results to update dashboard');
      return;
    }

    // Calculate latest mood
    const latest = moodResultsData[moodResultsData.length - 1];
    const latestPercentage = latest.percentage;
    
    let moodStatus = 'No data';
    if (latestPercentage >= 75) moodStatus = 'Excellent';
    else if (latestPercentage >= 50) moodStatus = 'Good';
    else if (latestPercentage >= 35) moodStatus = 'Fair';
    else moodStatus = 'Needs Attention';

    // Calculate weekly average (last 7 entries)
    const recent = moodResultsData.slice(-7);
    const weeklyAvg = recent.reduce((sum, d) => sum + d.percentage, 0) / recent.length;

    // Prepare mood trend data (all results)
    const moodTrendData = moodResultsData.map(d => ({
      date: d.completed_at || d.date,
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
      
      const found = moodResultsData.find(m => {
        const mDate = new Date(m.completed_at || m.date);
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

    console.log('💾 Updating dashboard in Supabase...');

    const { data, error } = await supabase
      .from('mood_dashboard')
      .update({
        current_mood: moodStatus,
        current_score: latest.total_score,
        current_max_score: latest.max_score,
        current_percentage: latestPercentage,
        weekly_average: weeklyAvg,
        total_checkins: moodResultsData.length,
        mood_trend_data: moodTrendData,
        week_chart_data: weekChartData,
        last_checkin_date: latest.completed_at || latest.date
      })
      .eq('user_id', currentUser.id)
      .select();

    if (error) throw error;

    console.log('✅ Dashboard updated:', data);
    dashboardData = data[0];
  } catch (error) {
    console.error('❌ Error updating dashboard:', error);
  }
}

// ============================================
// DISPLAY DASHBOARD STATS
// ============================================
function displayDashboardStats() {
  if (!dashboardData) {
    console.log('⚠️ No dashboard data to display');
    return;
  }

  // Update current mood
  const latestStatus = document.getElementById('latest-status');
  const latestScore = document.getElementById('latest-score');
  
  latestStatus.textContent = dashboardData.current_mood;
  latestScore.textContent = `Score: ${dashboardData.current_score}/${dashboardData.current_max_score}`;

  // Set mood color
  const moodColors = {
    'Excellent': 'green',
    'Good': 'blue',
    'Fair': 'goldenrod',
    'Needs Attention': 'red',
    'No data': 'gray'
  };
  latestStatus.style.color = moodColors[dashboardData.current_mood] || 'gray';

  // Update weekly average
  document.getElementById('weekly-average-score').textContent = 
    `${dashboardData.weekly_average.toFixed(1)}%`;

  // Update total check-ins
  document.getElementById('total-checkins').textContent = dashboardData.total_checkins;

  console.log('✅ Dashboard stats displayed');
}

// ============================================
// UPDATE BACKGROUND BASED ON MOOD
// ============================================
function updateMoodBackground() {
  if (!dashboardData) return;

  const body = document.body;
  
  switch (dashboardData.current_mood) {
    case 'Excellent':
      body.style.background = 'linear-gradient(to right, #d0fbdfff, #b4efdcff)';
      break;
    case 'Good':
      body.style.background = 'linear-gradient(to right, #b6d6fcff, #c2f0f8ff)';
      break;
    case 'Fair':
      body.style.background = 'linear-gradient(to right, #f6ecc7ff, #eddbceff)';
      break;
    case 'Needs Attention':
      body.style.background = 'linear-gradient(to right, #f49552ff, #fdd6d6ff)';
      break;
    default:
      body.style.background = '#fff';
  }
}

// ============================================
// RENDER CHARTS
// ============================================
function renderCharts() {
  if (!dashboardData) {
    console.log('⚠️ No dashboard data to render charts');
    return;
  }

  const moodTrendData = dashboardData.mood_trend_data || [];
  const weekChartData = dashboardData.week_chart_data || [];

  // Mood Trend Line Chart
  const ctx1 = document.getElementById('moodLineChart').getContext('2d');
  const gradient = ctx1.createLinearGradient(0, 0, 400, 0);
  gradient.addColorStop(0, '#8b5cf6');
  gradient.addColorStop(1, '#ec4899');

  new Chart(ctx1, {
    type: 'line',
    data: {
      labels: moodTrendData.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        data: moodTrendData.map(d => d.percentage),
        borderColor: gradient,
        borderWidth: 3,
        fill: false,
        pointBackgroundColor: '#8b5cf6',
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
      scales: {
        y: { 
          min: 0, 
          max: 100, 
          ticks: { callback: value => value + '%' } 
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              const entry = moodTrendData[context.dataIndex];
              return entry
                ? `Score: ${entry.totalScore}/${entry.maxScore} (${entry.percentage.toFixed(1)}%)`
                : 'No data';
            }
          }
        }
      }
    }
  });

  // Weekly Bar Chart
  const ctx2 = document.getElementById('weeklyBarChart').getContext('2d');
  const barGradient = ctx2.createLinearGradient(0, 0, 0, 300);
  barGradient.addColorStop(0, '#8b5cf6');
  barGradient.addColorStop(1, '#ec4899');

  new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: weekChartData.map(d => d.day),
      datasets: [{
        data: weekChartData.map(d => d.percentage),
        backgroundColor: barGradient,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
      scales: {
        y: { 
          min: 0, 
          max: 100, 
          ticks: { callback: value => value + '%' } 
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              const entry = weekChartData[context.dataIndex];
              return entry && entry.percentage > 0
                ? `Score: ${entry.totalScore}/${entry.maxScore} (${entry.percentage.toFixed(1)}%)`
                : 'No data';
            }
          }
        }
      }
    }
  });

  console.log('✅ Charts rendered');
}

// ============================================
// MOTIVATIONAL QUOTES
// ============================================
const motivationalQuotes = [
  { text: "You are stronger than you think and more resilient than you know.", author: "Unknown" },
  { text: "Your mental health is just as important as your physical health.", author: "Anonymous" },
  { text: "Healing isn't linear, and that's okay. Take it one day at a time.", author: "Self-Care Wisdom" },
  { text: "You have survived 100% of your difficult days. You're doing great.", author: "Motivational" },
  { text: "Be gentle with yourself. You're doing the best you can.", author: "Self-Compassion" },
  { text: "Your journey to wellness is unique and valuable.", author: "Mindful Living" }
];

let currentQuote = 0;

function rotateQuote() {
  const q = motivationalQuotes[currentQuote];
  document.getElementById('quote-text').textContent = q.text;
  document.getElementById('quote-author').textContent = `— ${q.author}`;
  currentQuote = (currentQuote + 1) % motivationalQuotes.length;
}

// ============================================
// INITIALIZE DASHBOARD
// ============================================
async function initializeDashboard() {
  try {
    console.log('🚀 Initializing Mood Dashboard...');

    // Get current user
    await getCurrentUser();

    if (!currentUser) {
      console.log('⚠️ User not logged in');
      // Show guest message or redirect
      document.getElementById('latest-status').textContent = 'Please login';
      return;
    }

    // Fetch mood results
    moodResultsData = await fetchMoodResults();

    // Fetch or create dashboard
    dashboardData = await fetchOrCreateDashboard();

    // If user has mood results, update dashboard data
    if (moodResultsData.length > 0) {
      await updateDashboardData();
      // Refresh dashboard data after update
      dashboardData = await fetchOrCreateDashboard();
    }

    // Display stats
    displayDashboardStats();

    // Update background
    updateMoodBackground();

    // Render charts
    renderCharts();

    // Start quote rotation
    rotateQuote();
    setInterval(rotateQuote, 10000);

    console.log('✅ Mood Dashboard initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing dashboard:', error);
  }
}

// ============================================
// START DASHBOARD
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard();
});
