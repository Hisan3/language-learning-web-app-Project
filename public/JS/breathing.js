const exercises = [
  {
    name: "4-7-8 Breathing",
    description: "Inhale for 4, hold for 7, exhale for 8",
    inhale: 4,
    hold: 7,
    exhale: 8,
    pause: 1,
    color: "linear-gradient(to right, #60a5fa, #22d3ee)",
    benefits: ["Reduces anxiety", "Improves sleep", "Calms the nervous system"]
  },
  {
    name: "Box Breathing",
    description: "Equal counts for all phases",
    inhale: 4,
    hold: 4,
    exhale: 4,
    pause: 4,
    color: "linear-gradient(to right, #34d399, #10b981)",
    benefits: ["Increases focus", "Reduces stress", "Balances autonomic nervous system"]
  },
  {
    name: "Coherent Breathing",
    description: "Slow, rhythmic breathing",
    inhale: 6,
    hold: 0,
    exhale: 6,
    pause: 0,
    color: "linear-gradient(to right, #a78bfa, #f472b6)",
    benefits: ["Heart rate variability", "Emotional balance", "Mental clarity"]
  }
];

let currentExercise = null;
let isActive = false;
let currentPhase = "inhale";
let timeRemaining = 0;
let cycleCount = 0;
let interval;

// Elements
const exerciseGrid = document.getElementById("exercise-grid");
const nameEl = document.getElementById("exercise-name");
const descEl = document.getElementById("exercise-desc");
const patternEl = document.getElementById("pattern");
const benefitsEl = document.getElementById("benefits");
const emojiEl = document.getElementById("emoji");
const phaseEl = document.getElementById("phase");
const timeEl = document.getElementById("time");
const cyclesEl = document.getElementById("cycles");
const currentPhaseEl = document.getElementById("current-phase");
const circleEl = document.getElementById("breathing-circle");

const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resetBtn = document.getElementById("reset-btn");

// Load exercises
exercises.forEach((ex, i) => {
  const btn = document.createElement("button");
  btn.className = "exercise-card";
  btn.innerHTML = `
    <div class="icon"></div>
    <h3>${ex.name}</h3>
    <p>${ex.description}</p>
    <ul>${ex.benefits.map(b => `<li>${b}</li>`).join("")}</ul>
  `;
  btn.addEventListener("click", () => selectExercise(i));
  exerciseGrid.appendChild(btn);
});

// Select exercise
function selectExercise(i) {
  currentExercise = exercises[i];
  document.querySelectorAll(".exercise-card").forEach((c, idx) => {
    c.classList.toggle("active", idx === i);
  });
  resetExercise();
  updateInfo();
}

// Update UI
function updateInfo() {
  if (!currentExercise) return;
  nameEl.textContent = currentExercise.name;
  descEl.textContent = currentExercise.description;
  benefitsEl.innerHTML = currentExercise.benefits.map(b => `<li>${b}</li>`).join("");
  patternEl.innerHTML = `
    <div><p>Inhale</p><span>${currentExercise.inhale}s</span></div>
    ${currentExercise.hold ? `<div><p>Hold</p><span>${currentExercise.hold}s</span></div>` : ""}
    <div><p>Exhale</p><span>${currentExercise.exhale}s</span></div>
    ${currentExercise.pause ? `<div><p>Pause</p><span>${currentExercise.pause}s</span></div>` : ""}
  `;
  circleEl.style.background = currentExercise.color;
}

// Start
startBtn.addEventListener("click", () => {
  if (!currentExercise) return alert("Select an exercise first");
  isActive = true;
  startBtn.classList.add("hidden");
  pauseBtn.classList.remove("hidden");
  if (timeRemaining === 0) {
    currentPhase = "inhale";
    timeRemaining = currentExercise.inhale;
    sessionStartTime = new Date().toISOString();
  }
  runTimer();
});

// Pause
pauseBtn.addEventListener("click", () => {
  isActive = false;
  clearInterval(interval);
  pauseBtn.classList.add("hidden");
  startBtn.classList.remove("hidden");
});

// Reset
resetBtn.addEventListener("click", () => {
  // Save session before reset if cycles were completed
  if (cycleCount > 0 && sessionStartTime) {
    saveBreathingResult();
  }
  resetExercise();
});

function resetExercise() {
  isActive = false;
  clearInterval(interval);
  cycleCount = 0;
  sessionDuration = 0;
  sessionStartTime = null;
  currentPhase = "inhale";
  timeRemaining = 0;
  updateCircle();
  cyclesEl.textContent = "0";
  currentPhaseEl.textContent = "-";
  startBtn.classList.remove("hidden");
  pauseBtn.classList.add("hidden");
}

// Timer loop
function runTimer() {
  clearInterval(interval);
  interval = setInterval(() => {
    if (!isActive) return;
    sessionDuration++; // Track total duration in seconds
    if (timeRemaining <= 1) {
      switchPhase();
    } else {
      timeRemaining--;
    }
    updateCircle();
  }, 1000);
}

// Get current user from localStorage
const currentUser = JSON.parse(localStorage.getItem("user"));

// Initialize Supabase
const SUPABASE_URL = "https://qtsfceqredvwhwukaugu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0c2ZjZXFyZWR2d2h3dWthdWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDE5NjcsImV4cCI6MjA3ODA3Nzk2N30.iJJ4wcah6BHs_ubjhwG-VU9Nj4XueSq5_Ro4sFm8QF8";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Session tracking variables
let sessionStartTime = null;
let sessionDuration = 0;

// Function to save breathing session
async function saveBreathingResult() {
  // Get current logged-in user from Supabase
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session || !session.user) {
    console.log('⚠️ No user logged in. Breathing session will not be saved.');
    return;
  }

  if (!currentExercise) {
    console.error('❌ No exercise selected');
    return;
  }

  if (cycleCount === 0) {
    console.log('⚠️ No cycles completed. Session will not be saved.');
    return;
  }

  const sessionEndTime = new Date().toISOString();
  
  // Calculate breathing pattern description
  let patternDescription = `Inhale ${currentExercise.inhale}s`;
  if (currentExercise.hold > 0) patternDescription += `, hold ${currentExercise.hold}s`;
  patternDescription += `, exhale ${currentExercise.exhale}s`;
  if (currentExercise.pause > 0) patternDescription += `, pause ${currentExercise.pause}s`;

  const payload = {
    userId: session.user.id,
    exerciseType: currentExercise.name,
    cyclesCompleted: cycleCount,
    durationSeconds: sessionDuration,
    breathingPattern: patternDescription,
    sessionStartTime: sessionStartTime,
    sessionEndTime: sessionEndTime
  };

  console.log('💾 Saving breathing session...', payload);

  try {
    const response = await fetch('/api/breathing/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Breathing session saved successfully!', data);
    } else {
      console.error('❌ Error saving session:', data.error);
    }
  } catch (err) {
    console.error('❌ Error saving breathing session:', err);
  }
}

// Switch phases
const maxCycles = 1;

function switchPhase() {
  if (currentPhase === "inhale") {
    if (currentExercise.hold > 0) {
      currentPhase = "hold";
      timeRemaining = currentExercise.hold;
    } else {
      currentPhase = "exhale";
      timeRemaining = currentExercise.exhale;
    }
  } else if (currentPhase === "hold") {
    currentPhase = "exhale";
    timeRemaining = currentExercise.exhale;
  } else if (currentPhase === "exhale") {
    if (currentExercise.pause > 0) {
      currentPhase = "pause";
      timeRemaining = currentExercise.pause;
    } else {
      // No pause phase - complete cycle here
      currentPhase = "inhale";
      timeRemaining = currentExercise.inhale;
      cycleCount++;
      
      // Check if max cycles reached (for exercises without pause)
      if (cycleCount >= maxCycles) {
        saveBreathingResult();
      }
    }
  } else if (currentPhase === "pause") {
    currentPhase = "inhale";
    timeRemaining = currentExercise.inhale;
    cycleCount++;

    // Check if max cycles reached (for exercises with pause)
    if (cycleCount >= maxCycles) {
      saveBreathingResult();
    }
  }
}

// Update circle UI
function updateCircle() {
  emojiEl.textContent =
    currentPhase === "inhale" ? "🫁" :
    currentPhase === "exhale" ? "💨" : "🧘‍♀️";

  phaseEl.textContent =
    currentPhase === "inhale" ? "Breathe In" :
    currentPhase === "hold" ? "Hold" :
    currentPhase === "exhale" ? "Breathe Out" : "Pause";

  timeEl.textContent = timeRemaining;
  cyclesEl.textContent = cycleCount;
  currentPhaseEl.textContent = phaseEl.textContent;

  const size = currentPhase === "inhale" ? 300 :
               currentPhase === "hold" ? 300 :
               currentPhase === "exhale" ? 200 : 200;
  circleEl.style.width = size + "px";
  circleEl.style.height = size + "px";
}