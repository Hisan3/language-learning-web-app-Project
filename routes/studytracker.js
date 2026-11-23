// routes/studytracker.js
const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// ============================================
// STUDY TRACKER API ROUTES
// ============================================

// Get all users who are using the study tracker with their monthly stats
router.get('/stats/monthly', async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Get the first and last day of current month
    const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month, 0).toISOString().split('T')[0];
    
    console.log(`[Study Tracker API] Fetching monthly stats for ${year}-${month.toString().padStart(2, '0')}`);
    console.log(`[Study Tracker API] Date range: ${firstDay} to ${lastDay}`);
    
    // Get all users who have study sessions in the current month
    const { data: sessions, error: sessionsError } = await supabase
      .from('study_sessions')
      .select('user_id, duration, date')
      .gte('date', firstDay)
      .lte('date', lastDay)
      .order('user_id');
    
    if (sessionsError) {
      console.error('[Study Tracker API] Error fetching sessions:', sessionsError);
      throw sessionsError;
    }
    
    console.log(`[Study Tracker API] Found ${sessions?.length || 0} sessions`);
    
    // Group sessions by user
    const userStats = {};
    
    if (sessions && sessions.length > 0) {
      sessions.forEach(session => {
        const userId = session.user_id;
        
        if (!userStats[userId]) {
          userStats[userId] = {
            user_id: userId,
            total_minutes: 0,
            study_days: new Set()
          };
        }
        
        userStats[userId].total_minutes += session.duration || 0;
        userStats[userId].study_days.add(session.date);
      });
    }
    
    // Convert to array and get user details
    const userStatsArray = Object.values(userStats).map(stats => ({
      user_id: stats.user_id,
      total_hours: Math.floor(stats.total_minutes / 60),
      total_minutes: stats.total_minutes % 60,
      study_days_count: stats.study_days.size
    }));
    
    // Get user details for each user
    const userIds = userStatsArray.map(stat => stat.user_id);
    
    if (userIds.length > 0) {
      // Get user details from Supabase Auth (using Service Role key for admin access)
      const enrichedStats = [];
      
      for (const stat of userStatsArray) {
        try {
          // Fetch user details from Supabase Auth
          const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(stat.user_id);
          
          if (userError) {
            console.error(`[Study Tracker API] Error fetching user ${stat.user_id}:`, userError);
          }
          
          const userName = user?.user_metadata?.full_name || 
                          user?.user_metadata?.name || 
                          user?.email?.split('@')[0] || 
                          'Unknown User';
          
          enrichedStats.push({
            ...stat,
            user_email: user?.email || 'Unknown',
            user_name: userName,
            user_joined: user?.created_at
          });
        } catch (error) {
          console.error(`[Study Tracker API] Error processing user ${stat.user_id}:`, error);
          // Add with unknown data
          enrichedStats.push({
            ...stat,
            user_email: 'Unknown',
            user_name: 'Unknown User',
            user_joined: null
          });
        }
      }
      
      // Sort by total hours descending
      enrichedStats.sort((a, b) => {
        const totalA = a.total_hours * 60 + a.total_minutes;
        const totalB = b.total_hours * 60 + b.total_minutes;
        return totalB - totalA;
      });
      
      console.log(`[Study Tracker API] Returning stats for ${enrichedStats.length} users`);
      
      res.json({
        success: true,
        month: `${year}-${month.toString().padStart(2, '0')}`,
        users: enrichedStats
      });
    } else {
      console.log('[Study Tracker API] No users found with study sessions');
      res.json({
        success: true,
        month: `${year}-${month.toString().padStart(2, '0')}`,
        users: []
      });
    }
    
  } catch (error) {
    console.error('[Study Tracker API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Save study session (for frontend)
router.post('/sessions', async (req, res) => {
  try {
    const { user_id, category, duration, date } = req.body;
    
    if (!user_id || !category || !duration || !date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, category, duration, date'
      });
    }
    
    console.log(`[Study Tracker API] Saving session for user ${user_id}`);
    
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id,
        category,
        duration,
        date
      })
      .select();
    
    if (error) throw error;
    
    console.log('[Study Tracker API] Session saved successfully');
    
    res.json({
      success: true,
      session: data[0]
    });
    
  } catch (error) {
    console.error('[Study Tracker API] Error saving session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's study sessions
router.get('/sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`[Study Tracker API] Fetching sessions for user ${userId}`);
    
    const { data: sessions, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    console.log(`[Study Tracker API] Found ${sessions?.length || 0} sessions`);
    
    res.json({
      success: true,
      sessions: sessions || []
    });
    
  } catch (error) {
    console.error('[Study Tracker API] Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Save study category (for frontend)
router.post('/categories', async (req, res) => {
  try {
    const { user_id, name, color } = req.body;
    
    if (!user_id || !name || !color) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, name, color'
      });
    }
    
    console.log(`[Study Tracker API] Saving category for user ${user_id}`);
    
    const { data, error } = await supabase
      .from('study_categories')
      .insert({
        user_id,
        name,
        color
      })
      .select();
    
    if (error) throw error;
    
    console.log('[Study Tracker API] Category saved successfully');
    
    res.json({
      success: true,
      category: data[0]
    });
    
  } catch (error) {
    console.error('[Study Tracker API] Error saving category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's study categories
router.get('/categories/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`[Study Tracker API] Fetching categories for user ${userId}`);
    
    const { data: categories, error } = await supabase
      .from('study_categories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    console.log(`[Study Tracker API] Found ${categories?.length || 0} categories`);
    
    res.json({
      success: true,
      categories: categories || []
    });
    
  } catch (error) {
    console.error('[Study Tracker API] Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete study category
router.delete('/categories/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    console.log(`[Study Tracker API] Deleting category ${categoryId}`);
    
    const { error } = await supabase
      .from('study_categories')
      .delete()
      .eq('id', categoryId);
    
    if (error) throw error;
    
    console.log('[Study Tracker API] Category deleted successfully');
    
    res.json({
      success: true
    });
    
  } catch (error) {
    console.error('[Study Tracker API] Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;