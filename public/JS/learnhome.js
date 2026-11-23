// Initialize Supabase - MUST MATCH login.js credentials!
const SUPABASE_URL = "https://qtsfceqredvwhwukaugu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0c2ZjZXFyZWR2d2h3dWthdWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDE5NjcsImV4cCI6MjA3ODA3Nzk2N30.iJJ4wcah6BHs_ubjhwG-VU9Nj4XueSq5_Ro4sFm8QF8";

// Create Supabase client with localStorage persistence
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
    }
});

console.log("Supabase client initialized");

// -----------------------------
// WORD OF THE DAY FEATURE
// -----------------------------
async function fetchWordOfDay() {
    try {
        console.log("Fetching word of the day from database...");
        
        // Get user's timezone
        const userTimezone = getUserTimezone();
        console.log(`🌍 User timezone: ${userTimezone}`);
        
        // Fetch from backend API endpoint with timezone parameter
        const response = await fetch(`/api/wordofday?timezone=${encodeURIComponent(userTimezone)}`);
        const data = await response.json();
        
        if (data.success && data.word) {
            console.log("✅ Word of day loaded:", data.word.word);
            return data.word;
        } else {
            console.log("No word of the day found for today");
            return null;
        }
    } catch (error) {
        console.error("Error fetching word of the day:", error);
        return null;
    }
}

async function showWordOfDay() {
    const modal = document.getElementById('wordOfDayModal');
    const wordElement = document.getElementById('wordOfDayWord');
    const meaningElement = document.getElementById('wordOfDayMeaning');
    const exampleElement = document.getElementById('wordOfDayExample');
    
    // Fetch word from database
    const wordData = await fetchWordOfDay();
    
    if (wordData) {
        wordElement.textContent = wordData.word;
        meaningElement.textContent = wordData.definition;
        exampleElement.textContent = `"${wordData.example}"`;
    } else {
        // Fallback message if no word is available
        wordElement.textContent = "No Word Available";
        meaningElement.textContent = "Check back tomorrow for a new word!";
        exampleElement.textContent = "";
    }
    
    modal.classList.remove('hidden');
}

function closeWordOfDay() {
    const modal = document.getElementById('wordOfDayModal');
    modal.classList.add('hidden');
}

// Debug: Check session on page load
window.addEventListener('DOMContentLoaded', async () => {
    console.log("Page loaded, checking session...");
    
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
        console.error("Session error on load:", sessionError);
    }
    
    console.log("Session data:", sessionData);
    console.log("User:", sessionData?.session?.user);
    console.log("User email:", sessionData?.session?.user?.email);
    
    // Show word of day after checking session
    setTimeout(showWordOfDay, 500);
});

// -----------------------------
// SAVE USER PATH (STUDENT / PROFESSIONAL)
// -----------------------------
async function selectPath(path) {
    try {
        console.log("=== selectPath called ===");
        console.log("Path:", path);
        
        // Get logged-in user
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        console.log("Session check result:");
        console.log("- sessionData:", sessionData);
        console.log("- sessionError:", sessionError);
        console.log("- session:", sessionData?.session);
        console.log("- user:", sessionData?.session?.user);
        
        if (sessionError) {
            console.error("Session error:", sessionError);
            alert("Session error! Please login again.");
            window.location.href = "login.html";
            return;
        }

        const user = sessionData?.session?.user;
        if (!user) {
            console.error("No user found in session!");
            console.log("Full sessionData:", JSON.stringify(sessionData, null, 2));
            alert("You must be logged in! Redirecting to login page...");
            window.location.href = "login.html";
            return;
        }

        console.log("✅ User authenticated:", user.email);
        console.log("User ID:", user.id);

        // Check existing user_type from user_profiles table
        console.log("Fetching existing profile...");
        const { data: existingProfile, error: fetchError } = await supabase
            .from("user_profiles")
            .select("user_type")
            .eq("id", user.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
            console.error("Error fetching profile:", fetchError);
        } else if (fetchError?.code === 'PGRST116') {
            console.log("No existing profile found (new user)");
        } else {
            console.log("Existing profile:", existingProfile);
        }

        const currentUserType = existingProfile?.user_type;
        let newUserType = path;

        // If user already has a different path selected, mark as 'both'
        if (currentUserType && currentUserType !== path && currentUserType !== 'both') {
            newUserType = 'both';
            console.log(`User switching from ${currentUserType} to both`);
        }

        console.log("Current user_type:", currentUserType);
        console.log("New user_type will be:", newUserType);

        // Save in user_profiles table
        console.log("Saving to user_profiles...");
        const { data: savedData, error: saveError } = await supabase
            .from("user_profiles")
            .upsert({
                id: user.id,
                user_type: newUserType
            }, {
                onConflict: 'id'
            })
            .select();

        if (saveError) {
            console.error("Failed to save user path:", saveError);
            alert("Could not save your selection. Please try again.");
            return;
        }

        console.log("✅ User path saved successfully!");
        console.log("Saved data:", savedData);

        // Redirect based on selected path
        console.log(`Redirecting to ${path}.html...`);
        if (path === "student") {
            window.location.href = "student.html";
        } else if (path === "professional") {
            window.location.href = "professional.html";
        }
    } catch (err) {
        console.error("Unexpected error:", err);
        console.error("Error stack:", err.stack);
        alert("An error occurred. Please try again.");
    }
}

// Helper function to get user's timezone
function getUserTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}