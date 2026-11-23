// server.js
const express = require("express");
const path = require("path");
const supabase = require("./supabaseClient");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Set EJS as view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ============ PUBLIC ROUTES ============
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ============ API ENDPOINTS FOR FRONTEND ============

// Import gamification routes
const gamificationRoutes = require('./routes/gamification');
app.use('/api', gamificationRoutes);

// Import studytracker routes
const studytrackerRoutes = require('./routes/studytracker');
app.use('/api/studytracker', studytrackerRoutes);

// Import blog routes
const blogRoutes = require('./routes/blog');
app.use(blogRoutes);

// Import mood quiz routes
const moodQuizRoutes = require('./routes/moodquiz');
app.use(moodQuizRoutes);

// Import breathing analytics routes
const breathingAnalyticsRoutes = require('./routes/breathinganalytics');
app.use(breathingAnalyticsRoutes);

// Get all published lessons for a specific category
app.get("/api/lessons/:category", async (req, res) => {
  try {
    const { category } = req.params;
    console.log(`[API] Fetching lessons for category: ${category}`);
    
    const { data: lessons, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("category", category)
      .eq("status", "published")
      .order("created_at", { ascending: true });

    if (error) throw error;
    
    console.log(`[API] Found ${lessons?.length || 0} lessons for ${category}`);
    
    // Log image URLs for debugging
    lessons?.forEach(lesson => {
      console.log(`Lesson: ${lesson.title}, Image: ${lesson.image_url}, Content length: ${lesson.content?.length || 0}`);
    });
    
    res.json({ success: true, lessons: lessons || [] });
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all published lessons (both categories)
app.get("/api/lessons", async (req, res) => {
  try {
    const { data: lessons, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: true });

    if (error) throw error;
    
    res.json({ success: true, lessons: lessons || [] });
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get subcategories based on category
app.get("/api/subcategories/:category", async (req, res) => {
  try {
    const { category } = req.params;
    
    console.log(`[API] Fetching subcategories for category: ${category}`);
    
    // First try to get from subcategories table
    const { data: subcategoriesData, error: subcatError } = await supabase
      .from("subcategories")
      .select("*")
      .eq("category", category)
      .order("name");

    if (subcatError) {
      console.log("[API] No subcategories table found or error:", subcatError);
    } else {
      console.log(`[API] Found ${subcategoriesData?.length || 0} subcategories in table`);
      if (subcategoriesData && subcategoriesData.length > 0) {
        console.log("[API] Subcategories data:", subcategoriesData);
      }
    }

    // If we have subcategories table data, use it
    if (subcategoriesData && subcategoriesData.length > 0) {
      return res.json({ success: true, subcategories: subcategoriesData });
    }

    // Fallback: get unique subcategories from lessons
    console.log("[API] Using fallback - fetching from lessons table");
    const { data: lessons, error } = await supabase
      .from("lessons")
      .select("subcategory")
      .eq("category", category)
      .eq("status", "published")
      .not("subcategory", "is", null);

    if (error) throw error;

    // Get unique subcategories
    const subcategories = [...new Set(
      (lessons || [])
        .map(l => l.subcategory)
        .filter(s => s && s.trim() !== '')
    )].sort().map(name => ({
      name,
      icon_type: 'emoji',
      icon_value: '📚'
    }));

    console.log(`[API] Fallback returned ${subcategories.length} subcategories`);
    res.json({ success: true, subcategories });
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ADMIN ROUTES ============

// Admin Dashboard Home
app.get("/admin", async (req, res) => {
  try {
    // Fetch statistics from Supabase Auth
    const { data: authData } = await supabase.auth.admin.listUsers();
    const totalUsers = authData?.users?.length || 0;
    
    const { data: lessons } = await supabase.from("lessons").select("*");
    const { data: quizzes } = await supabase.from("quizzes").select("*");
    const { data: streaks } = await supabase.from("user_streaks").select("*");

    res.render("admin/dashboard", {
      stats: {
        totalUsers: totalUsers,
        activeLessons: lessons?.length || 0,
        totalQuizzes: quizzes?.length || 0,
        activeStreaks: streaks?.length || 0
      }
    });
  } catch (error) {
    console.error("Error loading admin dashboard:", error);
    res.status(500).send("Error loading dashboard");
  }
});

// ============ BADGE MANAGEMENT ============
app.get("/admin/badges", async (req, res) => {
  try {
    res.render("admin/users/badges");
  } catch (error) {
    console.error("Error loading badges page:", error);
    res.status(500).send("Error loading badges page");
  }
});

// Upload badge image to Supabase Storage
app.post("/admin/badges/upload-image", upload.single("image"), async (req, res) => {
  console.log("[UPLOAD] Badge image upload endpoint hit");
  try {
    if (!req.file) {
      console.log("[UPLOAD] No file in request");
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    console.log("[UPLOAD] File received:", req.file.originalname, req.file.size, "bytes");
    
    const file = req.file;
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExt}`;
    const filePath = `badges/${fileName}`;

    console.log("[UPLOAD] Uploading to Supabase Storage:", filePath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("badge-images")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error("[UPLOAD] Supabase Storage error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log("[UPLOAD] Upload successful, getting public URL");

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("badge-images")
      .getPublicUrl(filePath);

    console.log("[UPLOAD] Public URL:", publicUrlData.publicUrl);

    res.json({ 
      success: true, 
      url: publicUrlData.publicUrl,
      path: filePath
    });
  } catch (error) {
    console.error("[UPLOAD] Error uploading badge image:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/admin/badges/create", async (req, res) => {
  try {
    const { name, description, icon, icon_type, color, badge_type, threshold, link } = req.body;
    
    console.log("[BADGE CREATE] Received data:", {
      name,
      icon_type,
      icon: icon ? icon.substring(0, 50) + '...' : 'null'
    });

    const { data, error } = await supabase
      .from("badges")
      .insert({
        name,
        description,
        icon,
        icon_type: icon_type || 'emoji',
        color: color || '#8b5cf6',
        badge_type,
        threshold,
        link: link || null
      })
      .select()
      .single();

    if (error) throw error;
    
    console.log("[BADGE CREATE] Success! Badge ID:", data.id, "Icon Type:", data.icon_type);

    res.json({ success: true, badge: data });
  } catch (error) {
    console.error("Error creating badge:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update badge route
app.post("/admin/badges/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, icon_type, color, badge_type, threshold, link } = req.body;

    const { data, error } = await supabase
      .from("badges")
      .update({
        name,
        description,
        icon,
        icon_type: icon_type || 'emoji',
        color: color || '#8b5cf6',
        badge_type,
        threshold,
        link: link || null
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, badge: data });
  } catch (error) {
    console.error("Error updating badge:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/admin/badges/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("badges")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting badge:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List all badges (API endpoint)
app.get("/api/badges/list", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("badges")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, badges: data });
  } catch (error) {
    console.error("Error fetching badges:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ USERS MANAGEMENT ============
app.get("/admin/users", async (req, res) => {
  try {
    // Get users from Supabase Auth
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error("Error fetching auth users:", error);
      return res.render("admin/users/list", { users: [] });
    }

    const authUsers = data.users || [];

    // Get user_profiles data
    const { data: profiles, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, user_type");

    if (profileError) {
      console.error("Error fetching user profiles:", profileError);
    }

    // Create a map of user profiles for quick lookup
    const profilesMap = {};
    if (profiles) {
      profiles.forEach(profile => {
        profilesMap[profile.id] = profile.user_type;
      });
    }

    // Merge auth users with profile data
    const users = authUsers.map(user => {
      return {
        ...user,
        user_metadata: {
          ...user.user_metadata,
          user_type: profilesMap[user.id] || user.user_metadata?.user_type || 'none'
        }
      };
    });

    console.log("Fetched users with profiles:", users.length);

    res.render("admin/users/list", { users: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.render("admin/users/list", { users: [] });
  }
});

app.post("/admin/users/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete user from Supabase Auth
    const { error } = await supabase.auth.admin.deleteUser(id);
    
    if (error) {
      console.error("Error deleting user:", error);
    }
    
    res.redirect("/admin/users");
  } catch (error) {
    console.error("Error deleting user:", error);
    res.redirect("/admin/users");
  }
});

// ============ GAMIFICATION STATS PAGE ============
app.get("/admin/gamification", async (req, res) => {
  try {
    res.render("admin/users/gamification");
  } catch (error) {
    console.error("Error loading gamification stats page:", error);
    res.status(500).send("Error loading gamification stats page");
  }
});

// API endpoint to get all users' gamification stats
app.get("/admin/gamification/stats", async (req, res) => {
  try {
    // Get all users from auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) throw authError;
    
    const users = authData.users || [];
    const usersStats = [];
    
    // Overview statistics
    let totalXP = 0;
    let totalStreak = 0;
    let totalBadges = 0;
    let totalLessons = 0;
    let totalPomodoros = 0;
    
    // Fetch stats for each user
    for (const user of users) {
      const userId = user.id;
      
      // Get user stats
      const { data: stats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      // Get user streak
      const { data: streak } = await supabase
        .from('user_streaks')
        .select('current_streak, longest_streak')
        .eq('user_id', userId)
        .single();
      
      // Get badges count
      const { count: badgesCount } = await supabase
        .from('user_badges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      const userStats = {
        email: user.email,
        total_xp: stats?.total_xp || 0,
        current_streak: streak?.current_streak || 0,
        longest_streak: streak?.longest_streak || 0,
        badges_earned: badgesCount || 0,
        lessons_completed: stats?.lessons_completed || 0,
        practice_completed: stats?.practice_completed || 0,
        pomodoros_completed: stats?.pomodoros_completed || 0
      };
      
      usersStats.push(userStats);
      
      // Add to totals
      totalXP += userStats.total_xp;
      totalStreak += userStats.current_streak;
      totalBadges += userStats.badges_earned;
      totalLessons += userStats.lessons_completed;
      totalPomodoros += userStats.pomodoros_completed;
    }
    
    const overview = {
      total_users: users.length,
      total_xp: totalXP,
      avg_streak: users.length > 0 ? Math.round(totalStreak / users.length) : 0,
      total_badges: totalBadges,
      total_lessons: totalLessons,
      total_pomodoros: totalPomodoros
    };
    
    res.json({
      success: true,
      users: usersStats,
      overview: overview
    });
    
  } catch (error) {
    console.error('Error fetching gamification stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ STUDY TRACKER MANAGEMENT ============
app.get("/admin/productivity/studytracker", async (req, res) => {
  try {
    res.render("admin/productivity/studytracker");
  } catch (error) {
    console.error("Error loading study tracker page:", error);
    res.status(500).send("Error loading study tracker page");
  }
});

// ============ LESSONS MANAGEMENT ============

// Lessons List (with Add/Edit Modals inside list.ejs)
app.get("/admin/lessons", async (req, res) => {
  try {
    const { data: lessons, error } = await supabase
      .from("lessons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching lessons:", error);
      return res.render("admin/lessons/list", { 
        lessons: [],
        studentSubcategories: [],
        professionalSubcategories: []
      });
    }

    // Get unique subcategories for each category
    const studentSubcategories = [...new Set(
      (lessons || [])
        .filter(l => l.category === 'student' && l.subcategory && l.subcategory.trim() !== '')
        .map(l => l.subcategory.trim())
    )].sort();

    const professionalSubcategories = [...new Set(
      (lessons || [])
        .filter(l => l.category === 'professional' && l.subcategory && l.subcategory.trim() !== '')
        .map(l => l.subcategory.trim())
    )].sort();

    console.log("[Admin] Student subcategories:", studentSubcategories);
    console.log("[Admin] Professional subcategories:", professionalSubcategories);
    console.log("[Admin] Total lessons:", lessons?.length || 0);

    res.render("admin/lessons/list", { 
      lessons: lessons || [],
      studentSubcategories: studentSubcategories,
      professionalSubcategories: professionalSubcategories
    });
  } catch (err) {
    console.error("Error in /admin/lessons route:", err);
    res.render("admin/lessons/list", { 
      lessons: [],
      studentSubcategories: [],
      professionalSubcategories: []
    });
  }
});


// Add Lesson
app.post("/admin/lessons/add", upload.single("image_file"), async (req, res) => {
  try {
    const { title, category, difficulty, description, content, image_url, status, xp, subcategory, exercises } = req.body;

    console.log("========================================");
    console.log("🔍 [Add Lesson] FULL REQUEST BODY:");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("========================================");
    
    console.log("🔍 [Add Lesson] Exercises specifically:");
    console.log("  - Type:", typeof exercises);
    console.log("  - Value:", exercises);
    console.log("  - Length:", exercises?.length || 0);
    console.log("  - First 200 chars:", exercises?.substring(0, 200));

    let finalImageURL = image_url || null;

    // If file uploaded → upload to Supabase storage
    if (req.file) {
      const fileExt = req.file.originalname.split(".").pop();
      const fileName = `lesson_${Date.now()}.${fileExt}`;

      console.log("[Add Lesson] Uploading file:", fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("lessons")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (uploadError) {
        console.error("[Add Lesson] Upload error:", uploadError);
      } else {
        finalImageURL = supabase.storage.from("lessons").getPublicUrl(fileName).data.publicUrl;
        console.log("[Add Lesson] Image uploaded successfully:", finalImageURL);
      }
    }

    // Parse exercises JSON if provided
    let exercisesArray = [];
    if (exercises && exercises.trim() !== '') {
      try {
        exercisesArray = JSON.parse(exercises);
        console.log("✅ [Add Lesson] Successfully parsed exercises:", exercisesArray.length, "exercises");
        console.log("✅ [Add Lesson] Exercises content:", JSON.stringify(exercisesArray, null, 2));
      } catch (parseError) {
        console.error("❌ [Add Lesson] Failed to parse exercises JSON:", parseError.message);
        console.error("❌ [Add Lesson] Raw exercises data:", exercises);
        return res.send("Error: Invalid JSON format for exercises. Please check your JSON syntax. Error: " + parseError.message);
      }
    } else {
      console.log("⚠ [Add Lesson] No exercises provided (empty or null)");
    }

    const lessonData = {
      title,
      category,
      difficulty,
      description,
      content: content || null,
      image_url: finalImageURL,
      status,
      xp: parseInt(xp) || 50,
      subcategory: subcategory && subcategory.trim() !== '' ? subcategory.trim() : null,
      exercises: exercisesArray  // Use parsed exercises or empty array
    };

    console.log("========================================");
    console.log("🔍 [Add Lesson] FINAL LESSON DATA TO INSERT:");
    console.log(JSON.stringify(lessonData, null, 2));
    console.log("========================================");

    const { error } = await supabase.from("lessons").insert(lessonData);

    if (error) {
      console.error("❌ [Add Lesson] Insert error:", error);
      throw error;
    }

    console.log("✅ [Add Lesson] Lesson added successfully");
    res.redirect("/admin/lessons");
  } catch (err) {
    console.error("❌ [Add Lesson] Error:", err);
    res.send("Error saving lesson: " + err.message);
  }
});

// Edit Lesson
app.post("/admin/lessons/edit/:id", upload.single("image_file"), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, difficulty, description, content, image_url, status, xp, subcategory, exercises } = req.body;

    console.log("[Edit Lesson] Updating lesson ID:", id);
    console.log("[Edit Lesson] Received data:", {
      title,
      category,
      subcategory,
      hasFile: !!req.file,
      image_url,
      contentLength: content?.length || 0,
      exercisesLength: exercises?.length || 0
    });

    // First, get the current lesson to preserve the existing image_url and exercises if needed
    const { data: existingLesson } = await supabase
      .from("lessons")
      .select("image_url, exercises")
      .eq("id", id)
      .single();

    let finalImageURL = image_url || existingLesson?.image_url || null;

    // New upload?
    if (req.file) {
      const ext = req.file.originalname.split(".").pop();
      const fileName = `lesson_${id}_${Date.now()}.${ext}`;

      console.log("[Edit Lesson] Uploading new file:", fileName);

      const { data, error } = await supabase.storage
        .from("lessons")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (error) {
        console.error("[Edit Lesson] Upload error:", error);
      } else {
        finalImageURL = supabase.storage.from("lessons").getPublicUrl(fileName).data.publicUrl;
        console.log("[Edit Lesson] New image uploaded:", finalImageURL);
      }
    }

    // Parse exercises JSON if provided, otherwise keep existing
    let exercisesArray = existingLesson?.exercises || [];
    if (exercises && exercises.trim() !== '') {
      try {
        exercisesArray = JSON.parse(exercises);
        console.log("[Edit Lesson] Parsed exercises:", exercisesArray.length, "exercises");
      } catch (parseError) {
        console.error("[Edit Lesson] Failed to parse exercises JSON:", parseError.message);
        return res.send("Error: Invalid JSON format for exercises. Please check your JSON syntax.");
      }
    }

    const updateData = {
      title,
      category,
      difficulty,
      description,
      content: content || null,
      image_url: finalImageURL,
      status,
      xp: parseInt(xp) || 50,
      subcategory: subcategory && subcategory.trim() !== '' ? subcategory.trim() : null,
      exercises: exercisesArray  // Update exercises if provided
    };

    console.log("[Edit Lesson] Updating with data:", updateData);

    const { error: updateError } = await supabase
      .from("lessons")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      console.error("[Edit Lesson] Update error:", updateError);
      throw updateError;
    }

    console.log("[Edit Lesson] Lesson updated successfully");
    res.redirect("/admin/lessons");
  } catch (err) {
    console.error("[Edit Lesson] Error:", err);
    res.send("Error updating lesson: " + err.message);
  }
});

// Delete Lesson
app.post("/admin/lessons/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("[Delete Lesson] Deleting lesson ID:", id);

    await supabase.from("lessons").delete().eq("id", id);

    console.log("[Delete Lesson] Lesson deleted successfully");
    res.redirect("/admin/lessons");
  } catch (err) {
    console.error("[Delete Lesson] Error:", err);
    res.send("Error deleting lesson: " + err.message);
  }
});

// Add Subcategory with icon
app.post("/admin/subcategories/add", upload.single("icon_image"), async (req, res) => {
  try {
    const { name, category, icon_type, icon_value, icon_lucide } = req.body;

    console.log("[Add Subcategory] Received data:", { name, category, icon_type });

    let finalIconValue = icon_value || '';

    // Handle image upload for subcategory icon
    if (req.file && icon_type === 'image_upload') {
      const fileExt = req.file.originalname.split(".").pop();
      const fileName = `subcategory_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("lessons")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (!uploadError) {
        finalIconValue = supabase.storage.from("lessons").getPublicUrl(fileName).data.publicUrl;
      }
    } else if (icon_type === 'lucide') {
      finalIconValue = icon_lucide;
    }

    const { error } = await supabase.from("subcategories").upsert({
      name: name.trim(),
      category,
      icon_type,
      icon_value: finalIconValue
    }, {
      onConflict: 'name,category'
    });

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error("[Add Subcategory] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// UPDATED PRACTICE ROUTES FOR LEARNGLOW
// ============================================
// Replace the existing practice routes in server.js with these updated routes
// These routes work with the new "sets" structure (quiz_sets, flashcard_sets, etc.)
// ============================================

// ============ QUIZ SETS MANAGEMENT ============
app.get("/admin/practice/quizzes", async (req, res) => {
  try {
    const { data: quizSets, error } = await supabase
      .from("quiz_sets")
      .select("*")
      .order("date_scheduled", { ascending: false });

    if (error) throw error;

    res.render("admin/practice/quizzes", { quizSets: quizSets || [] });
  } catch (err) {
    console.error("[Quiz Sets List] Error:", err);
    res.render("admin/practice/quizzes", { quizSets: [] });
  }
});

app.post("/admin/practice/quizzes/add", async (req, res) => {
  try {
    const { title, category, status, date_scheduled } = req.body;
    const questions = req.body['question[]'];
    const option1s = req.body['option1[]'];
    const option2s = req.body['option2[]'];
    const option3s = req.body['option3[]'];
    const option4s = req.body['option4[]'];
    const corrects = req.body['correct[]'];

    // Build questions array
    const questionsArray = [];
    const questionsList = Array.isArray(questions) ? questions : [questions];
    
    for (let i = 0; i < questionsList.length; i++) {
      const options = [
        Array.isArray(option1s) ? option1s[i] : option1s,
        Array.isArray(option2s) ? option2s[i] : option2s,
        Array.isArray(option3s) ? option3s[i] : option3s,
        Array.isArray(option4s) ? option4s[i] : option4s
      ];
      
      const correctIndex = Array.isArray(corrects) ? parseInt(corrects[i]) : parseInt(corrects);
      const correctAnswer = options[correctIndex - 1];
      
      questionsArray.push({
        question: questionsList[i],
        options: options,
        correct: correctAnswer
      });
    }

    const { error } = await supabase.from("quiz_sets").insert({
      title,
      category,
      status,
      date_scheduled,
      questions: questionsArray,
      total_questions: questionsArray.length
    });

    if (error) throw error;

    res.redirect("/admin/practice/quizzes");
  } catch (err) {
    console.error("[Add Quiz Set] Error:", err);
    res.redirect("/admin/practice/quizzes");
  }
});

app.post("/admin/practice/quizzes/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, status, date_scheduled } = req.body;
    // FIX: Access without brackets - Express parses name="question[]" as "question"
    const questions = req.body['question'] || req.body['question[]'];
    const option1s = req.body['option1'] || req.body['option1[]'];
    const option2s = req.body['option2'] || req.body['option2[]'];
    const option3s = req.body['option3'] || req.body['option3[]'];
    const option4s = req.body['option4'] || req.body['option4[]'];
    const corrects = req.body['correct'] || req.body['correct[]'];

    console.log('[Edit Quiz Set] Received data for ID:', id);
    console.log('[Edit Quiz Set] Title:', title);
    console.log('[Edit Quiz Set] Category:', category);
    console.log('[Edit Quiz Set] Status:', status);
    console.log('[Edit Quiz Set] Date:', date_scheduled);
    console.log('[Edit Quiz Set] Questions:', questions);
    console.log('[Edit Quiz Set] Option1s:', option1s);
    console.log('[Edit Quiz Set] Option2s:', option2s);
    console.log('[Edit Quiz Set] Option3s:', option3s);
    console.log('[Edit Quiz Set] Option4s:', option4s);
    console.log('[Edit Quiz Set] Corrects:', corrects);
    console.log('[Edit Quiz Set] Full req.body:', req.body);

    // Validate required fields
    if (!questions || !option1s || !option2s || !option3s || !option4s || !corrects) {
      console.error("[Edit Quiz Set] Missing required fields");
      return res.redirect("/admin/practice/quizzes");
    }

    // Build questions array
    const questionsArray = [];
    const questionsList = Array.isArray(questions) ? questions : [questions];
    
    for (let i = 0; i < questionsList.length; i++) {
      // Skip empty questions
      if (!questionsList[i] || questionsList[i].trim() === '') continue;
      
      const options = [
        Array.isArray(option1s) ? option1s[i] : option1s,
        Array.isArray(option2s) ? option2s[i] : option2s,
        Array.isArray(option3s) ? option3s[i] : option3s,
        Array.isArray(option4s) ? option4s[i] : option4s
      ];
      
      const correctIndex = Array.isArray(corrects) ? parseInt(corrects[i]) : parseInt(corrects);
      const correctAnswer = options[correctIndex - 1];
      
      questionsArray.push({
        question: questionsList[i],
        options: options,
        correct: correctAnswer
      });
    }

    // Ensure we have at least one question
    if (questionsArray.length === 0) {
      console.error("[Edit Quiz Set] No valid questions provided");
      return res.redirect("/admin/practice/quizzes");
    }

    console.log('[Edit Quiz Set] Questions array length:', questionsArray.length);
    console.log('[Edit Quiz Set] Updating quiz set...');

    const { data, error } = await supabase
      .from("quiz_sets")
      .update({
        title,
        category,
        status,
        date_scheduled,
        questions: questionsArray,
        total_questions: questionsArray.length,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error('[Edit Quiz Set] Supabase Error:', error);
      throw error;
    }

    console.log('[Edit Quiz Set] Update successful:', data);
    res.redirect("/admin/practice/quizzes");
  } catch (err) {
    console.error("[Edit Quiz Set] Error:", err);
    res.redirect("/admin/practice/quizzes");
  }
});

app.post("/admin/practice/quizzes/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from("quiz_sets")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.redirect("/admin/practice/quizzes");
  } catch (err) {
    console.error("[Delete Quiz Set] Error:", err);
    res.redirect("/admin/practice/quizzes");
  }
});

// ============ FLASHCARD SETS MANAGEMENT ============
app.get("/admin/practice/flashcards", async (req, res) => {
  try {
    const { data: flashcardSets, error } = await supabase
      .from("flashcard_sets")
      .select("*")
      .order("date_scheduled", { ascending: false });

    if (error) throw error;

    res.render("admin/practice/flashcards", { flashcardSets: flashcardSets || [] });
  } catch (err) {
    console.error("[Flashcard Sets List] Error:", err);
    res.render("admin/practice/flashcards", { flashcardSets: [] });
  }
});

app.post("/admin/practice/flashcards/add", async (req, res) => {
  try {
    const { title, category, status, date_scheduled } = req.body;
    const words = req.body['word[]'];
    const meanings = req.body['meaning[]'];
    const examples = req.body['example[]'];

    // Build cards array
    const cardsArray = [];
    const wordsList = Array.isArray(words) ? words : [words];
    const meaningsList = Array.isArray(meanings) ? meanings : [meanings];
    const examplesList = Array.isArray(examples) ? examples : [examples];
    
    for (let i = 0; i < wordsList.length; i++) {
      cardsArray.push({
        word: wordsList[i],
        meaning: meaningsList[i],
        example: examplesList[i]
      });
    }

    const { error } = await supabase.from("flashcard_sets").insert({
      title,
      category,
      status,
      date_scheduled,
      cards: cardsArray,
      total_questions: cardsArray.length
    });

    if (error) throw error;

    res.redirect("/admin/practice/flashcards");
  } catch (err) {
    console.error("[Add Flashcard Set] Error:", err);
    res.redirect("/admin/practice/flashcards");
  }
});

app.post("/admin/practice/flashcards/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, status, date_scheduled } = req.body;
    // FIX: Access without brackets - Express parses name="word[]" as "word"
    const words = req.body['word'] || req.body['word[]'];
    const meanings = req.body['meaning'] || req.body['meaning[]'];
    const examples = req.body['example'] || req.body['example[]'];

    console.log('[Edit Flashcard Set] Received data for ID:', id);
    console.log('[Edit Flashcard Set] Title:', title);
    console.log('[Edit Flashcard Set] Category:', category);
    console.log('[Edit Flashcard Set] Status:', status);
    console.log('[Edit Flashcard Set] Date:', date_scheduled);
    console.log('[Edit Flashcard Set] Words:', words);
    console.log('[Edit Flashcard Set] Meanings:', meanings);
    console.log('[Edit Flashcard Set] Examples:', examples);
    console.log('[Edit Flashcard Set] Full req.body:', req.body);

    // Validate required fields
    if (!words || !meanings) {
      console.error("[Edit Flashcard Set] Missing required fields");
      return res.redirect("/admin/practice/flashcards");
    }

    // Build cards array
    const cardsArray = [];
    const wordsList = Array.isArray(words) ? words : [words];
    const meaningsList = Array.isArray(meanings) ? meanings : [meanings];
    const examplesList = Array.isArray(examples) ? examples : [examples];
    
    for (let i = 0; i < wordsList.length; i++) {
      // Skip empty cards
      if (!wordsList[i] || wordsList[i].trim() === '') continue;
      
      cardsArray.push({
        word: wordsList[i],
        meaning: meaningsList[i] || '',
        example: examplesList[i] || ''
      });
    }

    // Ensure we have at least one card
    if (cardsArray.length === 0) {
      console.error("[Edit Flashcard Set] No valid cards provided");
      return res.redirect("/admin/practice/flashcards");
    }

    console.log('[Edit Flashcard Set] Cards array length:', cardsArray.length);
    console.log('[Edit Flashcard Set] Updating flashcard set...');

    const { data, error } = await supabase
      .from("flashcard_sets")
      .update({
        title,
        category,
        status,
        date_scheduled,
        cards: cardsArray,
        total_questions: cardsArray.length,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error('[Edit Flashcard Set] Supabase Error:', error);
      throw error;
    }

    console.log('[Edit Flashcard Set] Update successful:', data);
    res.redirect("/admin/practice/flashcards");
  } catch (err) {
    console.error("[Edit Flashcard Set] Error:", err);
    res.redirect("/admin/practice/flashcards");
  }
});

app.post("/admin/practice/flashcards/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from("flashcard_sets")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.redirect("/admin/practice/flashcards");
  } catch (err) {
    console.error("[Delete Flashcard Set] Error:", err);
    res.redirect("/admin/practice/flashcards");
  }
});

// ============ SENTENCE MAKING SETS MANAGEMENT ============
app.get("/admin/practice/sentence-making", async (req, res) => {
  try {
    console.log("[Sentence Making] Fetching sentence sets...");
    const { data: sentenceSets, error } = await supabase
      .from("sentence_sets")
      .select("*")
      .order("date_scheduled", { ascending: false });

    if (error) {
      console.error("[Sentence Making Sets List] Supabase Error:", error);
      return res.render("admin/practice/sentence-making", { sentenceSets: [] });
    }

    console.log("[Sentence Making] Found", sentenceSets?.length || 0, "sets");
    res.render("admin/practice/sentence-making", { sentenceSets: sentenceSets || [] });
  } catch (err) {
    console.error("[Sentence Making Sets List] Error:", err);
    res.render("admin/practice/sentence-making", { sentenceSets: [] });
  }
});

app.post("/admin/practice/sentence-making/add", async (req, res) => {
  try {
    const { title, category, status, date_scheduled } = req.body;
    const wordsSets = req.body['words[]'];
    const corrects = req.body['correct[]'];
    const hints = req.body['hint[]'];

    // Build exercises array
    const exercisesArray = [];
    const wordsSetsList = Array.isArray(wordsSets) ? wordsSets : [wordsSets];
    const correctsList = Array.isArray(corrects) ? corrects : [corrects];
    const hintsList = Array.isArray(hints) ? hints : [hints];
    
    for (let i = 0; i < wordsSetsList.length; i++) {
      // Convert comma-separated words to array
      const wordsArray = wordsSetsList[i].split(',').map(w => w.trim());
      
      exercisesArray.push({
        words: wordsArray,
        correct: correctsList[i],
        hint: hintsList[i] || ''
      });
    }

    const { error } = await supabase.from("sentence_sets").insert({
      title,
      category,
      status,
      date_scheduled,
      exercises: exercisesArray,
      total_questions: exercisesArray.length
    });

    if (error) throw error;

    res.redirect("/admin/practice/sentence-making");
  } catch (err) {
    console.error("[Add Sentence Making Set] Error:", err);
    res.redirect("/admin/practice/sentence-making");
  }
});

app.post("/admin/practice/sentence-making/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, status, date_scheduled } = req.body;
    // FIX: Access without brackets - Express parses name="words[]" as "words"
    const wordsSets = req.body['words'] || req.body['words[]'];
    const corrects = req.body['correct'] || req.body['correct[]'];
    const hints = req.body['hint'] || req.body['hint[]'];

    console.log('[Edit Sentence Making Set] Received data for ID:', id);
    console.log('[Edit Sentence Making Set] Title:', title);
    console.log('[Edit Sentence Making Set] Category:', category);
    console.log('[Edit Sentence Making Set] Status:', status);
    console.log('[Edit Sentence Making Set] Date:', date_scheduled);
    console.log('[Edit Sentence Making Set] Words Sets:', wordsSets);
    console.log('[Edit Sentence Making Set] Corrects:', corrects);
    console.log('[Edit Sentence Making Set] Hints:', hints);
    console.log('[Edit Sentence Making Set] Full req.body:', req.body);

    // Validate required fields
    if (!wordsSets || !corrects) {
      console.error("[Edit Sentence Making Set] Missing required fields");
      return res.redirect("/admin/practice/sentence-making");
    }

    // Build exercises array
    const exercisesArray = [];
    const wordsSetsList = Array.isArray(wordsSets) ? wordsSets : [wordsSets];
    const correctsList = Array.isArray(corrects) ? corrects : [corrects];
    const hintsList = Array.isArray(hints) ? hints : [hints];
    
    for (let i = 0; i < wordsSetsList.length; i++) {
      // Skip if no data for this index
      if (!wordsSetsList[i]) continue;
      
      // Convert comma-separated words to array
      const wordsArray = wordsSetsList[i].split(',').map(w => w.trim());
      
      exercisesArray.push({
        words: wordsArray,
        correct: correctsList[i] || '',
        hint: hintsList[i] || ''
      });
    }

    // Ensure we have at least one exercise
    if (exercisesArray.length === 0) {
      console.error("[Edit Sentence Making Set] No valid exercises provided");
      return res.redirect("/admin/practice/sentence-making");
    }

    console.log('[Edit Sentence Making Set] Exercises array length:', exercisesArray.length);
    console.log('[Edit Sentence Making Set] Updating sentence set...');

    const { data, error } = await supabase
      .from("sentence_sets")
      .update({
        title,
        category,
        status,
        date_scheduled,
        exercises: exercisesArray,
        total_questions: exercisesArray.length,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error('[Edit Sentence Making Set] Supabase Error:', error);
      throw error;
    }

    console.log('[Edit Sentence Making Set] Update successful:', data);
    res.redirect("/admin/practice/sentence-making");
  } catch (err) {
    console.error("[Edit Sentence Making Set] Error:", err);
    res.redirect("/admin/practice/sentence-making");
  }
});

app.post("/admin/practice/sentence-making/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from("sentence_sets")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.redirect("/admin/practice/sentence-making");
  } catch (err) {
    console.error("[Delete Sentence Making Set] Error:", err);
    res.redirect("/admin/practice/sentence-making");
  }
});

// ============ FILL IN THE BLANKS SETS MANAGEMENT ============
app.get("/admin/practice/fill-blanks", async (req, res) => {
  try {
    const { data: fillblankSets, error } = await supabase
      .from("fillblank_sets")
      .select("*")
      .order("date_scheduled", { ascending: false });

    if (error) throw error;

    res.render("admin/practice/fill-blanks", { fillblankSets: fillblankSets || [] });
  } catch (err) {
    console.error("[Fill in the Blanks Sets List] Error:", err);
    res.render("admin/practice/fill-blanks", { fillblankSets: [] });
  }
});

app.post("/admin/practice/fill-blanks/add", async (req, res) => {
  try {
    const { title, category, status, date_scheduled } = req.body;
    const sentences = req.body['sentence[]'];
    const answers = req.body['answer[]'];
    const hints = req.body['hint[]'];

    // Build questions array
    const questionsArray = [];
    const sentencesList = Array.isArray(sentences) ? sentences : [sentences];
    const answersList = Array.isArray(answers) ? answers : [answers];
    const hintsList = Array.isArray(hints) ? hints : [hints];
    
    for (let i = 0; i < sentencesList.length; i++) {
      questionsArray.push({
        sentence: sentencesList[i],
        answer: answersList[i],
        hint: hintsList[i]
      });
    }

    const { error } = await supabase.from("fillblank_sets").insert({
      title,
      category,
      status,
      date_scheduled,
      questions: questionsArray,
      total_questions: questionsArray.length
    });

    if (error) throw error;

    res.redirect("/admin/practice/fill-blanks");
  } catch (err) {
    console.error("[Add Fill in the Blanks Set] Error:", err);
    res.redirect("/admin/practice/fill-blanks");
  }
});

app.post("/admin/practice/fill-blanks/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, status, date_scheduled } = req.body;
    // FIX: Access without brackets - Express parses name="sentence[]" as "sentence"
    const sentences = req.body['sentence'] || req.body['sentence[]'];
    const answers = req.body['answer'] || req.body['answer[]'];
    const hints = req.body['hint'] || req.body['hint[]'];

    console.log('[Edit Fill Blanks Set] Received data for ID:', id);
    console.log('[Edit Fill Blanks Set] Title:', title);
    console.log('[Edit Fill Blanks Set] Category:', category);
    console.log('[Edit Fill Blanks Set] Status:', status);
    console.log('[Edit Fill Blanks Set] Date:', date_scheduled);
    console.log('[Edit Fill Blanks Set] Sentences:', sentences);
    console.log('[Edit Fill Blanks Set] Answers:', answers);
    console.log('[Edit Fill Blanks Set] Hints:', hints);
    console.log('[Edit Fill Blanks Set] Full req.body:', req.body);

    // Validate required fields
    if (!sentences || !answers) {
      console.error("[Edit Fill Blanks Set] Missing required fields");
      return res.redirect("/admin/practice/fill-blanks");
    }

    // Build questions array
    const questionsArray = [];
    const sentencesList = Array.isArray(sentences) ? sentences : [sentences];
    const answersList = Array.isArray(answers) ? answers : [answers];
    const hintsList = Array.isArray(hints) ? hints : [hints];
    
    for (let i = 0; i < sentencesList.length; i++) {
      // Skip empty questions
      if (!sentencesList[i] || sentencesList[i].trim() === '') continue;
      
      questionsArray.push({
        sentence: sentencesList[i],
        answer: answersList[i] || '',
        hint: hintsList[i] || ''
      });
    }

    // Ensure we have at least one question
    if (questionsArray.length === 0) {
      console.error("[Edit Fill Blanks Set] No valid questions provided");
      return res.redirect("/admin/practice/fill-blanks");
    }

    console.log('[Edit Fill Blanks Set] Questions array length:', questionsArray.length);
    console.log('[Edit Fill Blanks Set] Updating fill blanks set...');

    const { data, error } = await supabase
      .from("fillblank_sets")
      .update({
        title,
        category,
        status,
        date_scheduled,
        questions: questionsArray,
        total_questions: questionsArray.length,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error('[Edit Fill Blanks Set] Supabase Error:', error);
      throw error;
    }

    console.log('[Edit Fill Blanks Set] Update successful:', data);
    res.redirect("/admin/practice/fill-blanks");
  } catch (err) {
    console.error("[Edit Fill in the Blanks Set] Error:", err);
    res.redirect("/admin/practice/fill-blanks");
  }
});

app.post("/admin/practice/fill-blanks/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from("fillblank_sets")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.redirect("/admin/practice/fill-blanks");
  } catch (err) {
    console.error("[Delete Fill in the Blanks Set] Error:", err);
    res.redirect("/admin/practice/fill-blanks");
  }
});

// ============ ANALYTICS MANAGEMENT ============
app.get("/admin/practice/analytics", async (req, res) => {
  try {
    // Get today's date range (start and end of day in UTC)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    console.log('[Analytics] Filtering for today:', todayStart.toISOString(), 'to', todayEnd.toISOString());

    // Get ONLY TODAY'S user activity from user_practice_activity table
    const { data: userActivity } = await supabase
      .from("user_practice_activity")
      .select("*")
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString())
      .order("created_at", { ascending: false });

    console.log('[Analytics] Today\'s activities count:', userActivity?.length || 0);

    // Calculate statistics based on TODAY'S USER COMPLETIONS ONLY
    const activityByType = {
      Flashcards: 0,
      Quiz: 0,
      'Sentence Making': 0,
      'Fill in the Blanks': 0
    };

    // Count unique user completions per activity type (TODAY ONLY)
    const userCompletions = {};
    userActivity?.forEach(activity => {
      const key = `${activity.user_email}_${activity.activity_type}`;
      if (!userCompletions[key]) {
        userCompletions[key] = true;
        activityByType[activity.activity_type] = (activityByType[activity.activity_type] || 0) + 1;
      }
    });

    const stats = {
      flashcardsCompleted: activityByType['Flashcards'] || 0,
      quizzesCompleted: activityByType['Quiz'] || 0,
      exercisesCompleted: activityByType['Sentence Making'] || 0,
      fillBlanksCompleted: activityByType['Fill in the Blanks'] || 0
    };

    // Get recent activities (TODAY ONLY)
    const recentActivities = userActivity || [];

    // TOP PERFORMERS BASED ON TODAY'S XP EARNED (NOT TOTAL XP)
    // Group today's activities by user and sum their XP
    const userXpToday = {};
    const userActivityCount = {};
    
    userActivity?.forEach(activity => {
      const userId = activity.user_id;
      const xpEarned = activity.xp_earned || 0;
      
      if (!userXpToday[userId]) {
        userXpToday[userId] = 0;
        userActivityCount[userId] = 0;
      }
      
      userXpToday[userId] += xpEarned;
      userActivityCount[userId]++;
    });

    // Get user emails from auth system
    const { data: authData } = await supabase.auth.admin.listUsers();
    const userEmailMap = {};
    authData?.users?.forEach(user => {
      userEmailMap[user.id] = user.email;
    });

    // Build top performers based on TODAY'S XP ONLY
    const topPerformers = Object.keys(userXpToday)
      .map(userId => {
        const email = userEmailMap[userId] || 'Unknown User';
        
        return {
          user_email: email,
          total_xp: userXpToday[userId],
          total_activities: userActivityCount[userId]
        };
      })
      .filter(p => p.total_xp > 0) // Only show users who earned XP today
      .sort((a, b) => b.total_xp - a.total_xp) // Sort by today's XP (highest first)
      .slice(0, 10); // Top 10 performers

    console.log('[Analytics] Top Performers (Today\'s XP):', topPerformers);

    res.render("admin/practice/analytics", {
      stats,
      recentActivities,
      topPerformers
    });
  } catch (err) {
    console.error("[Analytics] Error:", err);
    res.render("admin/practice/analytics", {
      stats: {
        flashcardsCompleted: 0,
        quizzesCompleted: 0,
        exercisesCompleted: 0,
        fillBlanksCompleted: 0
      },
      recentActivities: [],
      topPerformers: []
    });
  }
});

// ============ API ENDPOINTS FOR FRONTEND PRACTICE ============

// Helper function to get user's local date from timezone
function getUserLocalDate(timezone) {
  try {
    // Get current time in user's timezone
    const now = new Date();
    const userDate = new Date(now.toLocaleString('en-US', { timeZone: timezone || 'UTC' }));
    
    // Format as YYYY-MM-DD
    const year = userDate.getFullYear();
    const month = String(userDate.getMonth() + 1).padStart(2, '0');
    const day = String(userDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    return new Date().toISOString().split('T')[0];
  }
}

// Get all quiz sets (published only for frontend) - TODAY ONLY (User's Local Timezone)
app.get("/api/practice/quizzes", async (req, res) => {
  try {
    // Get user's timezone from query parameter (sent from frontend)
    const userTimezone = req.query.timezone || 'UTC';
    const today = getUserLocalDate(userTimezone);
    
    const { data: quizSets, error } = await supabase
      .from("quiz_sets")
      .select("*")
      .eq("status", "Published")
      .eq("date_scheduled", today) // Fetch sets for user's local TODAY
      .order("created_at", { ascending: true });

    if (error) throw error;

    console.log(`[Quiz API] Fetched ${quizSets?.length || 0} quiz sets for ${today} (timezone: ${userTimezone})`);
    res.json({ success: true, quizSets: quizSets || [] });
  } catch (error) {
    console.error("Error fetching quiz sets:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all flashcard sets (published only for frontend) - TODAY ONLY (User's Local Timezone)
app.get("/api/practice/flashcards", async (req, res) => {
  try {
    // Get user's timezone from query parameter (sent from frontend)
    const userTimezone = req.query.timezone || 'UTC';
    const today = getUserLocalDate(userTimezone);
    
    const { data: flashcardSets, error } = await supabase
      .from("flashcard_sets")
      .select("*")
      .eq("status", "Published")
      .eq("date_scheduled", today) // Fetch sets for user's local TODAY
      .order("created_at", { ascending: true });

    if (error) throw error;

    console.log(`[Flashcard API] Fetched ${flashcardSets?.length || 0} flashcard sets for ${today} (timezone: ${userTimezone})`);
    res.json({ success: true, flashcardSets: flashcardSets || [] });
  } catch (error) {
    console.error("Error fetching flashcard sets:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all sentence making sets (published only for frontend) - TODAY ONLY (User's Local Timezone)
app.get("/api/practice/sentence-making", async (req, res) => {
  try {
    // Get user's timezone from query parameter (sent from frontend)
    const userTimezone = req.query.timezone || 'UTC';
    const today = getUserLocalDate(userTimezone);
    
    const { data: sentenceSets, error } = await supabase
      .from("sentence_sets")
      .select("*")
      .eq("status", "Published")
      .eq("date_scheduled", today) // Fetch sets for user's local TODAY
      .order("created_at", { ascending: true });

    if (error) throw error;

    console.log(`[Sentence API] Fetched ${sentenceSets?.length || 0} sentence sets for ${today} (timezone: ${userTimezone})`);
    res.json({ success: true, sentenceSets: sentenceSets || [] });
  } catch (error) {
    console.error("Error fetching sentence making sets:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all fill in the blanks sets (published only for frontend) - TODAY ONLY (User's Local Timezone)
app.get("/api/practice/fill-blanks", async (req, res) => {
  try {
    // Get user's timezone from query parameter (sent from frontend)
    const userTimezone = req.query.timezone || 'UTC';
    const today = getUserLocalDate(userTimezone);
    
    const { data: fillblankSets, error } = await supabase
      .from("fillblank_sets")
      .select("*")
      .eq("status", "Published")
      .eq("date_scheduled", today) // Fetch sets for user's local TODAY
      .order("created_at", { ascending: true });

    if (error) throw error;

    console.log(`[Fill-Blank API] Fetched ${fillblankSets?.length || 0} fill-blank sets for ${today} (timezone: ${userTimezone})`);
    res.json({ success: true, fillblankSets: fillblankSets || [] });
  } catch (error) {
    console.error("Error fetching fill in the blanks sets:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save user practice activity
app.post("/api/practice/save-activity", async (req, res) => {
  try {
    const { user_id, user_email, activity_type, set_id, score, total_questions, correct_answers, xp_earned, timezone } = req.body;

    // Log incoming data for debugging
    console.log(`📝 [XP] Incoming activity: ${activity_type}, score: ${score}%, correct: ${correct_answers}/${total_questions}, timezone: ${timezone || 'not provided'}`);
    console.log(`📝 [XP] User ID: ${user_id}, User Email: ${user_email}`);
    
    // Validate user_id
    if (!user_id) {
      console.error(`❌ [Practice Activity] user_id is NULL! Cannot update daily progress.`);
      console.error(`   Email: ${user_email}, Activity: ${activity_type}`);
    }

    // ============ NEW XP LOGIC ============
    // Calculate XP based on activity type and whether it's a repeat attempt
    let finalXP = 0;
    
    // FIXED: Check if user already completed this EXACT activity today using USER'S timezone
    const userToday = getUserLocalDate(timezone || 'UTC');
    const todayStart = new Date(userToday + 'T00:00:00');
    const todayEnd = new Date(userToday + 'T23:59:59');
    
    console.log(`🔍 [Repeat Check] User timezone: ${timezone || 'UTC'}, date: ${userToday}`);
    console.log(`🔍 [Repeat Check] Checking for existing attempts between ${todayStart.toISOString()} and ${todayEnd.toISOString()}`);
    
    const { data: existingAttempts } = await supabase
      .from("user_practice_activity")
      .select("*")
      .eq("user_email", user_email)
      .eq("set_id", set_id)
      .eq("activity_type", activity_type)
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString());
    
    const isRepeatAttempt = existingAttempts && existingAttempts.length > 0;
    console.log(`🔍 [Repeat Check] Found ${existingAttempts?.length || 0} existing attempts. isRepeat: ${isRepeatAttempt}`);
    
    // ============ XP CALCULATION WITH 0 CORRECT CHECK ============
    // Use Number() to ensure correct_answers is treated as a number (handles 0, "0", null, undefined)
    const correctAnswersNum = Number(correct_answers) || 0;
    
    if (correctAnswersNum === 0 && activity_type !== 'Flashcards') {
      // If user got 0 correct (and not Flashcards), award 0 XP
      // This applies to both first and repeat attempts
      finalXP = 0;
      console.log(`❌ [XP] ${activity_type} (set ${set_id}): 0 correct answers. Awarding 0 XP.`);
    } else if (isRepeatAttempt) {
      // Repeat attempt: award only 5 XP (if they got at least 1 correct)
      finalXP = 5;
      console.log(`🔁 [XP] Repeat attempt detected for ${activity_type} (set ${set_id}). Awarding 5 XP.`);
    } else {
      // First attempt today: award full XP based on activity type
      // Flashcards: 10 XP per card (total cards in set)
      // Quiz, Fill Blanks, Sentence Making: 10 XP per CORRECT answer
      
      if (activity_type === 'Flashcards') {
        // Flashcards: XP based on total cards (you see all cards)
        finalXP = total_questions * 10;
        console.log(`✨ [XP] First attempt for ${activity_type} (set ${set_id}). Awarding ${finalXP} XP (${total_questions} cards × 10).`);
      } else {
        // Quiz, Fill in the Blanks, Sentence Making: XP based on CORRECT answers
        finalXP = correctAnswersNum * 10;
        console.log(`✨ [XP] First attempt for ${activity_type} (set ${set_id}). Awarding ${finalXP} XP (${correctAnswersNum} correct × 10).`);
      }
    }

    // Insert activity record with calculated XP
    const { error } = await supabase.from("user_practice_activity").insert({
      user_id: user_id || null,
      user_email,
      activity_type,
      set_id,
      score: Number(score) || 0,  // Ensure score is a number
      total_questions: Number(total_questions) || 0,  // Ensure total_questions is a number
      correct_answers: correctAnswersNum,  // Use normalized correct_answers
      xp_earned: finalXP
    });

    if (error) throw error;

    // If user is authenticated, update their XP and daily progress
    if (user_id) {
      // Update XP only if they earned any
      if (finalXP > 0) {
        await updateUserXP(user_id, finalXP, true); // true = isPractice
      }
      
      // FIXED: Update daily progress for ANY first attempt (even if 0 XP earned)
      if (!isRepeatAttempt) {
        const today = getUserLocalDate(timezone || 'UTC'); // FIXED: Use user's timezone instead of hardcoded UTC
        console.log(`📅 [Practice Activity] Updating daily progress for date: ${today} (timezone: ${timezone || 'UTC'})`);
        
        const { data: progress } = await supabase
          .from('daily_progress')
          .select('*')
          .eq('user_id', user_id)
          .eq('progress_date', today)
          .single();

        if (progress) {
          console.log(`📊 [Practice] Found existing progress record. Updating practice_completed from ${progress.practice_completed || 0} to ${(progress.practice_completed || 0) + 1}`);
          const { data: updatedData, error: updateError } = await supabase
            .from('daily_progress')
            .update({
              practice_completed: (progress.practice_completed || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user_id)
            .eq('progress_date', today)
            .select();
          
          if (updateError) {
            console.error('❌ [Practice] Error updating daily progress:', updateError);
          } else {
            console.log(`✅ [Practice] Daily progress updated successfully. New value:`, updatedData);
          }
        } else {
          // Create today's progress record
          console.log(`📊 [Practice] No existing progress record. Creating new one with practice_completed: 1`);
          const { error: insertError } = await supabase
            .from('daily_progress')
            .insert({
              user_id: user_id,
              progress_date: today,
              lessons_completed: 0,
              lessons_total: 5,
              practice_completed: 1,
              practice_total: 4,
              tasks_completed: 0,
              tasks_total: 3,
              timezone: timezone || 'UTC' // FIXED: Store user's timezone
            });
          
          if (insertError) {
            console.error('❌ [Practice] Error creating daily progress:', insertError);
          } else {
            console.log(`✅ [Practice] Daily progress created successfully`);
          }
        }
      }
    }

    res.json({ 
      success: true, 
      message: "Activity saved successfully",
      xp_earned: finalXP,
      is_repeat: isRepeatAttempt
    });
  } catch (error) {
    console.error("Error saving practice activity:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to update user XP in user_profiles AND user_stats
async function updateUserXP(userId, xpToAdd, isPractice = false) {
  try {
    // ============ UPDATE user_profiles (for backward compatibility) ============
    const { data: profile, error: fetchError } = await supabase
      .from("user_profiles")
      .select("total_xp")
      .eq("id", userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Error fetching user profile:", fetchError);
    }

    const currentXP = profile?.total_xp || 0;
    const newXP = currentXP + xpToAdd;

    // Update or insert user profile
    const { error: upsertError } = await supabase
      .from("user_profiles")
      .upsert({
        id: userId,
        total_xp: newXP
      }, {
        onConflict: 'id'
      });

    if (upsertError) {
      console.error("Error updating user XP in user_profiles:", upsertError);
    } else {
      console.log(`✅ Updated user_profiles XP: ${userId} earned +${xpToAdd} XP (total: ${newXP})`);
    }

    // ============ UPDATE user_stats (PRIMARY stats table) ============
    // Get current stats
    const { data: stats, error: statsError } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.error("Error fetching user stats:", statsError);
      return;
    }

    const currentStatsXP = stats?.total_xp || 0;
    const newStatsXP = currentStatsXP + xpToAdd;
    const currentPracticeCompleted = stats?.practice_completed || 0;

    // Update or insert user stats
    const updateData = {
      user_id: userId,
      total_xp: newStatsXP,
      updated_at: new Date().toISOString()
    };

    // If this is practice XP, increment practice_completed count
    if (isPractice) {
      updateData.practice_completed = currentPracticeCompleted + 1;
      console.log(`✅ Incrementing practice_completed: ${currentPracticeCompleted} -> ${currentPracticeCompleted + 1}`);
    }

    const { error: statsUpsertError } = await supabase
      .from("user_stats")
      .upsert(updateData, {
        onConflict: 'user_id'
      });

    if (statsUpsertError) {
      console.error("Error updating user stats:", statsUpsertError);
    } else {
      console.log(`✅ Updated user_stats: XP ${currentStatsXP} -> ${newStatsXP}${isPractice ? ', practice_completed +1' : ''}`);
    }

  } catch (error) {
    console.error("Error in updateUserXP:", error);
  }
}

// Award XP to user (used for instant XP updates)
app.post("/api/practice/award-xp", async (req, res) => {
  try {
    const { user_id, xp_amount, activity_description, is_practice } = req.body;

    if (!user_id || !xp_amount) {
      return res.status(400).json({ 
        success: false, 
        error: "user_id and xp_amount are required" 
      });
    }

    await updateUserXP(user_id, xp_amount, is_practice || false);

    console.log(`✅ XP Awarded: ${xp_amount} XP to user ${user_id} for ${activity_description || 'practice activity'}`);
    
    res.json({ 
      success: true, 
      message: `+${xp_amount} XP awarded!`,
      xp_earned: xp_amount
    });
  } catch (error) {
    console.error("Error awarding XP:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check if user has completed all daily practice sets (for bonus XP)
app.get("/api/practice/daily-completion-status", async (req, res) => {
  try {
    const { user_id, timezone } = req.query;

    if (!user_id) {
      return res.json({ 
        success: true, 
        completed: false,
        bonus_claimed: false
      });
    }

    // Get today's date in user's timezone
    const userTimezone = timezone || 'UTC';
    const today = getUserLocalDate(userTimezone);

    // Check which practice sets are available today
    const [flashcardsRes, quizzesRes, exercisesRes, fillBlanksRes] = await Promise.all([
      supabase.from("flashcard_sets").select("id").eq("status", "Published").eq("date_scheduled", today),
      supabase.from("quiz_sets").select("id").eq("status", "Published").eq("date_scheduled", today),
      supabase.from("sentence_sets").select("id").eq("status", "Published").eq("date_scheduled", today),
      supabase.from("fillblank_sets").select("id").eq("status", "Published").eq("date_scheduled", today)
    ]);

    const availableSets = {
      flashcards: flashcardsRes.data?.length || 0,
      quizzes: quizzesRes.data?.length || 0,
      exercises: exercisesRes.data?.length || 0,
      fillblanks: fillBlanksRes.data?.length || 0
    };

    const totalAvailableSets = Object.values(availableSets).filter(count => count > 0).length;

    if (totalAvailableSets === 0) {
      return res.json({
        success: true,
        completed: false,
        bonus_claimed: false,
        message: "No practice sets available today"
      });
    }

    // Get user's completed activities for today
    const startOfDay = new Date(today + 'T00:00:00Z').toISOString();
    const endOfDay = new Date(today + 'T23:59:59Z').toISOString();

    const { data: activities, error } = await supabase
      .from("user_practice_activity")
      .select("activity_type, xp_earned")
      .eq("user_id", user_id)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    if (error) throw error;

    // Count unique activity types completed
    const completedTypes = new Set();
    let bonusClaimed = false;

    activities?.forEach(activity => {
      completedTypes.add(activity.activity_type);
      // Check if daily bonus was already claimed (50 XP in one go)
      if (activity.xp_earned === 50 && activity.activity_type === 'Daily Bonus') {
        bonusClaimed = true;
      }
    });

    const completedCount = completedTypes.size;
    const allCompleted = completedCount >= totalAvailableSets;

    res.json({
      success: true,
      completed: allCompleted,
      bonus_claimed: bonusClaimed,
      completed_count: completedCount,
      total_sets: totalAvailableSets,
      available_sets: availableSets
    });

  } catch (error) {
    console.error("Error checking daily completion:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Claim daily bonus XP
app.post("/api/practice/claim-daily-bonus", async (req, res) => {
  try {
    const { user_id, user_email, timezone } = req.body;

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        error: "user_id is required" 
      });
    }

    // Get today's date in user's timezone
    const userTimezone = timezone || 'UTC';
    const today = getUserLocalDate(userTimezone);

    // Check if user already claimed bonus today
    const startOfDay = new Date(today + 'T00:00:00Z').toISOString();
    const endOfDay = new Date(today + 'T23:59:59Z').toISOString();

    const { data: existingBonus } = await supabase
      .from("user_practice_activity")
      .select("id")
      .eq("user_id", user_id)
      .eq("activity_type", "Daily Bonus")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .single();

    if (existingBonus) {
      return res.json({
        success: false,
        message: "Daily bonus already claimed"
      });
    }

    // Award 50 XP bonus
    const bonusXP = 50;
    await updateUserXP(user_id, bonusXP);

    // Record the bonus in activity table
    await supabase.from("user_practice_activity").insert({
      user_id: user_id,
      user_email: user_email || 'anonymous@learnglow.com',
      activity_type: "Daily Bonus",
      set_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
      score: 100,
      total_questions: 1,
      correct_answers: 1,
      xp_earned: bonusXP
    });

    console.log(`🎉 Daily Bonus Claimed: ${user_id} earned +${bonusXP} XP`);

    res.json({
      success: true,
      message: `Congratulations! You earned +${bonusXP} XP Daily Bonus!`,
      xp_earned: bonusXP
    });

  } catch (error) {
    console.error("Error claiming daily bonus:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ WORD OF THE DAY MANAGEMENT ============
app.get("/admin/wordofday", async (req, res) => {
  try {
    const { data: words, error } = await supabase
      .from("word_of_day")
      .select("*")
      .order("date_scheduled", { ascending: true });

    if (error) throw error;

    // Get admin's timezone from query parameter (default to UTC if not provided)
    const adminTimezone = req.query.timezone || 'UTC';
    
    // Get today's date in admin's local timezone
    const today = getUserLocalDate(adminTimezone);
    
    console.log(`[Admin Word of Day] Admin timezone: ${adminTimezone}, Local date: ${today}`);
    
    const todayWord = words?.find(w => w.date_scheduled === today) || null;

    res.render("admin/lessons/words", { 
      words: words || [],
      todayWord: todayWord
    });
  } catch (err) {
    console.error("[Word of Day List] Error:", err);
    res.render("admin/lessons/words", { 
      words: [],
      todayWord: null
    });
  }
});

app.post("/admin/wordofday/add", async (req, res) => {
  try {
    const { word, definition, example, date_scheduled, status } = req.body;

    const { error } = await supabase.from("word_of_day").insert({
      word,
      definition,
      example,
      date_scheduled,
      status: status || 'scheduled'
    });

    if (error) throw error;

    res.redirect("/admin/wordofday");
  } catch (err) {
    console.error("[Add Word of Day] Error:", err);
    res.redirect("/admin/wordofday");
  }
});

app.post("/admin/wordofday/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { word, definition, example, date_scheduled, status } = req.body;

    const { error } = await supabase
      .from("word_of_day")
      .update({
        word,
        definition,
        example,
        date_scheduled,
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) throw error;

    res.redirect("/admin/wordofday");
  } catch (err) {
    console.error("[Edit Word of Day] Error:", err);
    res.redirect("/admin/wordofday");
  }
});

app.post("/admin/wordofday/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from("word_of_day")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.redirect("/admin/wordofday");
  } catch (err) {
    console.error("[Delete Word of Day] Error:", err);
    res.redirect("/admin/wordofday");
  }
});

// API endpoint to get word of the day for frontend (User's Local Timezone)
app.get("/api/wordofday", async (req, res) => {
  try {
    // Get user's timezone from query parameter (sent from frontend)
    const userTimezone = req.query.timezone || 'UTC';
    const today = getUserLocalDate(userTimezone);
    
    const { data: word, error } = await supabase
      .from("word_of_day")
      .select("*")
      .eq("date_scheduled", today)
      .eq("status", "scheduled")
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    console.log(`[Word of Day API] Fetched word for ${today} (timezone: ${userTimezone})`);
    res.json({ success: true, word: word || null });
  } catch (error) {
    console.error("Error fetching word of day:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ LESSON COMPLETION API ============
// Save lesson completion and award XP
app.post("/api/lessons/complete", async (req, res) => {
  try {
    const { user_id, lesson_id, score, total_exercises, xp_earned, category, timezone = 'UTC' } = req.body;

    if (!user_id || !lesson_id) {
      return res.status(400).json({ success: false, error: 'user_id and lesson_id required' });
    }

    console.log(`📚 [Lesson Complete] User: ${user_id}, Lesson: ${lesson_id}, Score: ${score}/${total_exercises}, XP: ${xp_earned}, Timezone: ${timezone}`);

    // 1. Save/Update lesson progress
    const { data: existingProgress, error: fetchError } = await supabase
      .from('user_lesson_progress')
      .select('*')
      .eq('user_id', user_id)
      .eq('lesson_id', lesson_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching lesson progress:', fetchError);
    }

    if (existingProgress) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_lesson_progress')
        .update({
          completed: true,
          score: score,
          total_exercises: total_exercises,
          xp_earned: xp_earned,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .eq('lesson_id', lesson_id);

      if (updateError) {
        console.error('Error updating lesson progress:', updateError);
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('user_lesson_progress')
        .insert({
          user_id: user_id,
          lesson_id: lesson_id,
          completed: true,
          score: score,
          total_exercises: total_exercises,
          xp_earned: xp_earned
        });

      if (insertError) {
        console.error('Error inserting lesson progress:', insertError);
      }
    }

    // 2. Update user_stats (XP and lessons_completed)
    const { data: userStats, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.error('Error fetching user stats:', statsError);
    }

    if (userStats) {
      // Update existing stats
      const newTotalXP = (userStats.total_xp || 0) + xp_earned;
      const newLessonsCompleted = (userStats.lessons_completed || 0) + (existingProgress ? 0 : 1);

      const { error: updateStatsError } = await supabase
        .from('user_stats')
        .update({
          total_xp: newTotalXP,
          lessons_completed: newLessonsCompleted,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id);

      if (updateStatsError) {
        console.error('Error updating user stats:', updateStatsError);
      }

      console.log(`✅ Stats updated - Total XP: ${newTotalXP}, Lessons: ${newLessonsCompleted}`);
    } else {
      // Create new stats record
      const { error: insertStatsError } = await supabase
        .from('user_stats')
        .insert({
          user_id: user_id,
          total_xp: xp_earned,
          lessons_completed: 1,
          practice_completed: 0,
          pomodoros_completed: 0,
          tasks_completed: 0
        });

      if (insertStatsError) {
        console.error('Error creating user stats:', insertStatsError);
      }

      console.log(`✅ New stats created - XP: ${xp_earned}, Lessons: 1`);
    }

    // 3. Update daily progress
    const today = getUserLocalDate(timezone); // FIXED: Use user's timezone instead of UTC
    console.log(`📅 [Lesson Complete] Using date: ${today} (timezone: ${timezone})`);
    const { data: dailyProgress, error: dailyError } = await supabase
      .from('daily_progress')
      .select('*')
      .eq('user_id', user_id)
      .eq('progress_date', today)
      .single();

    if (dailyError && dailyError.code !== 'PGRST116') {
      console.error('Error fetching daily progress:', dailyError);
    }

    if (dailyProgress) {
      // Update daily progress
      const { error: updateDailyError } = await supabase
        .from('daily_progress')
        .update({
          lessons_completed: (dailyProgress.lessons_completed || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .eq('progress_date', today);

      if (updateDailyError) {
        console.error('Error updating daily progress:', updateDailyError);
      }
    } else {
      // Create daily progress record
      const { error: insertDailyError } = await supabase
        .from('daily_progress')
        .insert({
          user_id: user_id,
          progress_date: today,
          lessons_completed: 1,
          lessons_total: 5,
          practice_completed: 0,
          practice_total: 4,
          tasks_completed: 0,
          tasks_total: 3,
          timezone: timezone
        });

      if (insertDailyError) {
        console.error('Error creating daily progress:', insertDailyError);
      }
    }

    res.json({
      success: true,
      message: 'Lesson completion saved successfully',
      xp_earned: xp_earned
    });

  } catch (error) {
    console.error('Error saving lesson completion:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// PRODUCTIVITY HUB ENDPOINTS
// ============================================

// Get all tasks for a user
app.get("/api/productivity/tasks/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const { data: tasks, error } = await supabase
      .from("productivity_tasks")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, tasks: tasks || [] });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new task
app.post("/api/productivity/tasks/create", async (req, res) => {
  try {
    const { user_id, text } = req.body;

    if (!user_id || !text) {
      return res.status(400).json({ 
        success: false, 
        error: "user_id and text are required" 
      });
    }

    const { data: task, error } = await supabase
      .from("productivity_tasks")
      .insert({
        user_id,
        text,
        completed: false
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, task });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle task completion
app.post("/api/productivity/tasks/toggle/:task_id", async (req, res) => {
  try {
    const { task_id } = req.params;
    const { completed, user_id, timezone } = req.body;

    // Update task
    const { data: task, error } = await supabase
      .from("productivity_tasks")
      .update({ 
        completed,
        completed_at: completed ? new Date().toISOString() : null
      })
      .eq("id", task_id)
      .select()
      .single();

    if (error) throw error;

    // If task is completed, update daily progress and user stats
    if (completed && user_id) {
      const today = getUserLocalDate(timezone || 'UTC');
      
      // Update daily progress
      const { data: progress } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', user_id)
        .eq('progress_date', today)
        .single();

      if (progress) {
        await supabase
          .from('daily_progress')
          .update({
            tasks_completed: (progress.tasks_completed || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user_id)
          .eq('progress_date', today);
      } else {
        // Create today's progress record
        await supabase
          .from('daily_progress')
          .insert({
            user_id: user_id,
            progress_date: today,
            lessons_completed: 0,
            lessons_total: 5,
            practice_completed: 0,
            practice_total: 4,
            tasks_completed: 1,
            tasks_total: 3,
            timezone: timezone || 'UTC'
          });
      }

      // Update user_stats total tasks completed
      const { data: stats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user_id)
        .single();

      if (stats) {
        await supabase
          .from('user_stats')
          .update({
            tasks_completed: (stats.tasks_completed || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user_id);
      } else {
        await supabase
          .from('user_stats')
          .insert({
            user_id: user_id,
            tasks_completed: 1
          });
      }
    }

    res.json({ success: true, task });
  } catch (error) {
    console.error("Error toggling task:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a task
app.delete("/api/productivity/tasks/delete/:task_id", async (req, res) => {
  try {
    const { task_id } = req.params;

    const { error } = await supabase
      .from("productivity_tasks")
      .delete()
      .eq("id", task_id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get today's completed tasks count
app.get("/api/productivity/tasks/today/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { timezone = 'UTC' } = req.query;
    
    const today = getUserLocalDate(timezone);
    const todayStart = new Date(today + 'T00:00:00');
    const todayEnd = new Date(today + 'T23:59:59');

    const { data: tasks, error } = await supabase
      .from("productivity_tasks")
      .select("*")
      .eq("user_id", user_id)
      .eq("completed", true)
      .gte("completed_at", todayStart.toISOString())
      .lte("completed_at", todayEnd.toISOString());

    if (error) throw error;

    res.json({ 
      success: true, 
      count: tasks?.length || 0,
      tasks: tasks || []
    });
  } catch (error) {
    console.error("Error fetching today's tasks:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
});