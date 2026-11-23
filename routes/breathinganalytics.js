// routes/breathinganalytics.js
const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// ============================================
// ADMIN ROUTES - Breathing Analytics Management
// ============================================

// Admin page - View all breathing analytics
router.get('/admin/mindcare/breathinganalytics', async (req, res) => {
  try {
    // Fetch all breathing sessions
    const { data: sessions, error } = await supabase
      .from('breathing_analytics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate statistics
    const totalSessions = sessions?.length || 0;
    const totalCycles = sessions?.reduce((sum, s) => sum + s.cycles_completed, 0) || 0;
    const totalDuration = sessions?.reduce((sum, s) => sum + s.duration_seconds, 0) || 0;
    const avgDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;
    const avgCycles = totalSessions > 0 ? (totalCycles / totalSessions).toFixed(1) : 0;

    // Count by exercise type
    const exerciseTypeCounts = {};
    sessions?.forEach(session => {
      exerciseTypeCounts[session.exercise_type] = (exerciseTypeCounts[session.exercise_type] || 0) + 1;
    });

    // Most popular exercise
    let mostPopular = 'N/A';
    let maxCount = 0;
    for (const [exercise, count] of Object.entries(exerciseTypeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostPopular = exercise;
      }
    }

    res.render('admin/mindcare/breathinganalytics', { 
      sessions: sessions || [],
      stats: {
        total: totalSessions,
        totalCycles,
        totalDuration,
        avgDuration,
        avgCycles,
        mostPopular,
        exerciseTypeCounts
      }
    });
  } catch (error) {
    console.error('Error fetching breathing analytics:', error);
    res.render('admin/mindcare/breathinganalytics', { 
      sessions: [],
      stats: {
        total: 0,
        totalCycles: 0,
        totalDuration: 0,
        avgDuration: 0,
        avgCycles: 0,
        mostPopular: 'N/A',
        exerciseTypeCounts: {}
      }
    });
  }
});

// Delete breathing session (admin)
router.post('/admin/breathinganalytics/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('breathing_analytics')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting breathing session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// FRONTEND API ROUTES - Breathing Analytics
// ============================================

// Save breathing session result
router.post('/api/breathing/session', async (req, res) => {
  try {
    const { 
      userId, 
      exerciseType, 
      cyclesCompleted, 
      durationSeconds, 
      breathingPattern,
      sessionStartTime,
      sessionEndTime
    } = req.body;

    // Validate required fields
    if (!userId || !exerciseType || cyclesCompleted === undefined || durationSeconds === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    const { data, error } = await supabase
      .from('breathing_analytics')
      .insert([
        {
          user_id: userId,
          exercise_type: exerciseType,
          cycles_completed: cyclesCompleted,
          duration_seconds: durationSeconds,
          breathing_pattern: breathingPattern || '',
          session_start_time: sessionStartTime || new Date().toISOString(),
          session_end_time: sessionEndTime || new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;

    console.log('✅ Breathing session saved:', data);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error saving breathing session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's breathing session history
router.get('/api/breathing/sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const { data: sessions, error } = await supabase
      .from('breathing_analytics')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Error fetching breathing sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's breathing statistics
router.get('/api/breathing/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: sessions, error } = await supabase
      .from('breathing_analytics')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    // Calculate statistics
    const totalSessions = sessions?.length || 0;
    const totalCycles = sessions?.reduce((sum, s) => sum + s.cycles_completed, 0) || 0;
    const totalDuration = sessions?.reduce((sum, s) => sum + s.duration_seconds, 0) || 0;
    const avgCyclesPerSession = totalSessions > 0 ? (totalCycles / totalSessions).toFixed(1) : 0;
    const avgDurationPerSession = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;

    // Count by exercise type
    const exerciseTypeCounts = {};
    sessions?.forEach(session => {
      exerciseTypeCounts[session.exercise_type] = (exerciseTypeCounts[session.exercise_type] || 0) + 1;
    });

    res.json({ 
      success: true, 
      stats: {
        totalSessions,
        totalCycles,
        totalDuration,
        avgCyclesPerSession,
        avgDurationPerSession,
        exerciseTypeCounts
      }
    });
  } catch (error) {
    console.error('Error fetching breathing stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
