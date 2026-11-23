// routes/moodquiz.js
const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// ============================================
// ADMIN ROUTES - Mood Quiz Management
// ============================================

// Admin page - List all mood quizzes
router.get('/admin/mindcare', async (req, res) => {
  try {
    const { data: quizzes, error } = await supabase
      .from('moodquizlist')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.render('admin/mindcare/moodquiz', { quizzes: quizzes || [] });
  } catch (error) {
    console.error('Error fetching mood quizzes:', error);
    res.render('admin/mindcare/moodquiz', { quizzes: [] });
  }
});

// Admin page - View all mood quiz results
router.get('/admin/mindcare/results', async (req, res) => {
  try {
    // Fetch all results with user information
    const { data: results, error } = await supabase
      .from('mood_results')
      .select('*')
      .order('completed_at', { ascending: false });

    if (error) throw error;

    // Parse answers JSON and use stored email
    const parsedResults = (results || []).map(result => {
      // Use stored user_email, fallback to user_id, then 'Guest'
      const userEmail = result.user_email || result.user_id || 'Guest';
      
      return {
        ...result,
        userEmail: userEmail,
        answers: typeof result.answers === 'string' ? JSON.parse(result.answers) : result.answers
      };
    });

    // Get statistics
    const totalResults = parsedResults.length;
    const avgScore = totalResults > 0 
      ? (parsedResults.reduce((sum, r) => sum + r.total_score, 0) / totalResults).toFixed(1)
      : 0;
    const avgPercentage = totalResults > 0
      ? (parsedResults.reduce((sum, r) => sum + r.percentage, 0) / totalResults).toFixed(1)
      : 0;

    res.render('admin/mindcare/results', { 
      results: parsedResults,
      stats: {
        total: totalResults,
        avgScore,
        avgPercentage
      }
    });
  } catch (error) {
    console.error('Error fetching mood results:', error);
    res.render('admin/mindcare/results', { 
      results: [],
      stats: { total: 0, avgScore: 0, avgPercentage: 0 }
    });
  }
});

// Delete mood quiz result
router.post('/admin/moodquiz/results/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('mood_results')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting mood result:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add new quiz question
router.post('/admin/moodquiz/add', async (req, res) => {
  try {
    const { question, options, status } = req.body;

    // Validate required fields
    if (!question || !options || options.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Question and at least one option are required' 
      });
    }

    const { data, error } = await supabase
      .from('moodquizlist')
      .insert([
        {
          question,
          icon_type: null,
          icon_value: null,
          icon_color: null,
          options: JSON.stringify(options),
          status: status || 'active',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error adding mood quiz:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Edit quiz question
router.post('/admin/moodquiz/edit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { question, options, status } = req.body;

    // Validate required fields
    if (!question || !options || options.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Question and at least one option are required' 
      });
    }

    const { data, error } = await supabase
      .from('moodquizlist')
      .update({
        question,
        icon_type: null,
        icon_value: null,
        icon_color: null,
        options: JSON.stringify(options),
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error editing mood quiz:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete quiz question
router.post('/admin/moodquiz/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('moodquizlist')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting mood quiz:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// FRONTEND API ROUTES - Get Quiz Questions
// ============================================

// Get all active mood quiz questions for frontend
router.get('/api/moodquiz', async (req, res) => {
  try {
    const { data: quizzes, error } = await supabase
      .from('moodquizlist')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Parse options from JSON string
    const parsedQuizzes = quizzes.map(quiz => ({
      ...quiz,
      options: typeof quiz.options === 'string' ? JSON.parse(quiz.options) : quiz.options
    }));

    res.json(parsedQuizzes);
  } catch (error) {
    console.error('Error fetching mood quizzes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save mood quiz results
router.post('/api/moodquiz/results', async (req, res) => {
  try {
    const { userId, userEmail, totalScore, maxScore, percentage, answers } = req.body;

    const { data, error } = await supabase
      .from('mood_results')
      .insert([
        {
          user_id: userId,
          user_email: userEmail || null,
          total_score: totalScore,
          max_score: maxScore,
          percentage: percentage,
          answers: JSON.stringify(answers),
          completed_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error saving mood result:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's mood history
router.get('/api/moodquiz/results/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: results, error } = await supabase
      .from('mood_results')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) throw error;

    res.json(results);
  } catch (error) {
    console.error('Error fetching mood results:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;