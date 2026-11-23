// Login page JavaScript
// INIT SUPABASE
const SUPABASE_URL = "https://qtsfceqredvwhwukaugu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0c2ZjZXFyZWR2d2h3dWthdWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDE5NjcsImV4cCI6MjA3ODA3Nzk2N30.iJJ4wcah6BHs_ubjhwG-VU9Nj4XueSq5_Ro4sFm8QF8";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storage: localStorage
  }
});

// Toast
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// LOGIN HANDLER
document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const submit = document.getElementById("submitButton");

  submit.disabled = true;
  submit.textContent = "Signing in...";

  // REAL SUPABASE LOGIN
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showToast(error.message, "error");
    submit.disabled = false;
    submit.textContent = "Sign In";
    return;
  }

  const user = data.user;
  const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "User";

  // SAVE USER LOCALLY
  localStorage.setItem("user", JSON.stringify(user));

  // Load existing profile data or create new
  let profileData = localStorage.getItem("productivity_hub_user_data");
  if (!profileData) {
    profileData = {
      name: userName,
      bio: "Keep up the amazing work! 🌟",
      avatarColor: 0,
      profilePicture: null,
      streak: 0,
      badges: [],
      xp: 0,
      pomodoroCount: 0
    };
    localStorage.setItem("productivity_hub_user_data", JSON.stringify(profileData));
  } else {
    // Update name if it exists in user metadata
    const parsed = JSON.parse(profileData);
    parsed.name = user.user_metadata?.name || parsed.name;
    localStorage.setItem("productivity_hub_user_data", JSON.stringify(parsed));
  }

  // Load or create learning state
  let learningState = localStorage.getItem('englishLearningState');
  if (!learningState) {
    learningState = {
      name: userName,
      streak: 0,
      badges: [],
      xp: 0,
      todayProgress: {
        learning: 0,
        tasks: 0,
        mindcare: 0
      }
    };
    localStorage.setItem('englishLearningState', JSON.stringify(learningState));
  }

  showToast("Welcome back! ✨", "success");

  // REDIRECT
  setTimeout(() => {
    window.location.href = "home.html";
  }, 1500);
});

// GOOGLE SIGN-IN HANDLER
document.getElementById("googleSignIn").addEventListener("click", async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + '/home.html'
    }
  });
  if (error) {
    console.error("Google sign-in error:", error);
    showToast("Google sign-in failed: " + error.message, "error");
  }
});

// AUTH STATE LISTENER for Google OAuth
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    const user = session.user;
    localStorage.setItem("user", JSON.stringify(user));
    
    // Initialize profile data if not exists
    if (!localStorage.getItem("productivity_hub_user_data")) {
      // Google OAuth uses full_name, regular signup uses name
      const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
      localStorage.setItem("productivity_hub_user_data", JSON.stringify({
        name: userName,
        bio: "Keep up the amazing work! 🌟",
        avatarColor: 0,
        profilePicture: null,
        streak: 0,
        badges: [],
        xp: 0,
        pomodoroCount: 0
      }));

      localStorage.setItem('englishLearningState', JSON.stringify({
        name: userName,
        streak: 0,
        badges: [],
        xp: 0,
        todayProgress: {
          learning: 0,
          tasks: 0,
          mindcare: 0
        }
      }));
    }
  }
});