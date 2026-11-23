// ============================================
// DAILY AFFIRMATIONS ROUTES
// Backend routes for managing quotes and affirmations
// ============================================

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || "https://qtsfceqredvwhwukaugu.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0c2ZjZXFyZWR2d2h3dWthdWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwMTk2NywiZXhwIjoyMDc4MDc3OTY3fQ.Ls9ifC16uDOww8UTZML89U2a2b5t_a7J2VlCGPPX7vI";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// ADMIN PANEL ROUTES
// ============================================

// GET - Admin Affirmations Page
router.get('/', async (req, res) => {
  try {
    // Fetch all quotes
    const { data: quotes, error: quotesError } = await supabase
      .from('daily_quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (quotesError) throw quotesError;

    // Fetch all affirmations
    const { data: affirmations, error: affirmationsError } = await supabase
      .from('daily_affirmations')
      .select('*')
      .order('created_at', { ascending: false });

    if (affirmationsError) throw affirmationsError;

    res.render('admin/mindcare/affirmation', {
      quotes: quotes || [],
      affirmations: affirmations || []
    });
  } catch (error) {
    console.error('Error loading affirmations page:', error);
    res.status(500).render('admin/mindcare/affirmation', {
      quotes: [],
      affirmations: [],
      error: error.message
    });
  }
});

// ============================================
// QUOTES ROUTES
// ============================================

// POST - Add New Quote
router.post('/quotes/add', async (req, res) => {
  try {
    const { text, author, scheduled_date, status } = req.body;

    // Validate required fields
    if (!text) {
      return res.status(400).json({ error: 'Quote text is required' });
    }

    const quoteData = {
      text,
      author: author || null,
      scheduled_date: scheduled_date || null,
      status: status || 'active'
    };

    const { data, error } = await supabase
      .from('daily_quotes')
      .insert([quoteData])
      .select();

    if (error) throw error;

    console.log('✅ Quote added:', data);
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error adding quote:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Edit Quote
router.post('/quotes/edit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, author, scheduled_date, status } = req.body;

    // Validate required fields
    if (!text) {
      return res.status(400).json({ error: 'Quote text is required' });
    }

    const quoteData = {
      text,
      author: author || null,
      scheduled_date: scheduled_date || null,
      status: status || 'active'
    };

    const { data, error } = await supabase
      .from('daily_quotes')
      .update(quoteData)
      .eq('id', id)
      .select();

    if (error) throw error;

    console.log('✅ Quote updated:', data);
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error updating quote:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Delete Quote
router.post('/quotes/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('daily_quotes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('✅ Quote deleted:', id);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting quote:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Get All Quotes (API)
router.get('/quotes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('daily_quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error fetching quotes:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Get Single Quote
router.get('/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('daily_quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error fetching quote:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AFFIRMATIONS ROUTES
// ============================================

// POST - Add New Affirmation
router.post('/affirmations/add', async (req, res) => {
  try {
    const { text, scheduled_date, status } = req.body;

    // Validate required fields
    if (!text) {
      return res.status(400).json({ error: 'Affirmation text is required' });
    }

    const affirmationData = {
      text,
      scheduled_date: scheduled_date || null,
      status: status || 'active'
    };

    const { data, error } = await supabase
      .from('daily_affirmations')
      .insert([affirmationData])
      .select();

    if (error) throw error;

    console.log('✅ Affirmation added:', data);
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error adding affirmation:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Edit Affirmation
router.post('/affirmations/edit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, scheduled_date, status } = req.body;

    // Validate required fields
    if (!text) {
      return res.status(400).json({ error: 'Affirmation text is required' });
    }

    const affirmationData = {
      text,
      scheduled_date: scheduled_date || null,
      status: status || 'active'
    };

    const { data, error } = await supabase
      .from('daily_affirmations')
      .update(affirmationData)
      .eq('id', id)
      .select();

    if (error) throw error;

    console.log('✅ Affirmation updated:', data);
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error updating affirmation:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Delete Affirmation
router.post('/affirmations/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('daily_affirmations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('✅ Affirmation deleted:', id);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting affirmation:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Get All Affirmations (API)
router.get('/affirmations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('daily_affirmations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error fetching affirmations:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Get Single Affirmation
router.get('/affirmations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('daily_affirmations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error fetching affirmation:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STATISTICS ROUTES
// ============================================

// GET - Get Statistics
router.get('/stats', async (req, res) => {
  try {
    // Get quotes count
    const { count: quotesCount, error: quotesError } = await supabase
      .from('daily_quotes')
      .select('*', { count: 'exact', head: true });

    if (quotesError) throw quotesError;

    // Get affirmations count
    const { count: affirmationsCount, error: affirmationsError } = await supabase
      .from('daily_affirmations')
      .select('*', { count: 'exact', head: true });

    if (affirmationsError) throw affirmationsError;

    // Get active items count
    const { count: activeQuotesCount, error: activeQuotesError } = await supabase
      .from('daily_quotes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (activeQuotesError) throw activeQuotesError;

    const { count: activeAffirmationsCount, error: activeAffirmationsError } = await supabase
      .from('daily_affirmations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (activeAffirmationsError) throw activeAffirmationsError;

    // Get scheduled items count
    const { count: scheduledQuotesCount, error: scheduledQuotesError } = await supabase
      .from('daily_quotes')
      .select('*', { count: 'exact', head: true })
      .not('scheduled_date', 'is', null);

    if (scheduledQuotesError) throw scheduledQuotesError;

    const { count: scheduledAffirmationsCount, error: scheduledAffirmationsError } = await supabase
      .from('daily_affirmations')
      .select('*', { count: 'exact', head: true })
      .not('scheduled_date', 'is', null);

    if (scheduledAffirmationsError) throw scheduledAffirmationsError;

    const stats = {
      totalQuotes: quotesCount || 0,
      totalAffirmations: affirmationsCount || 0,
      activeItems: (activeQuotesCount || 0) + (activeAffirmationsCount || 0),
      scheduledItems: (scheduledQuotesCount || 0) + (scheduledAffirmationsCount || 0)
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
