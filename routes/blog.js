// routes/blog.js
// Blog management routes for admin panel and frontend API

const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// ============================================
// FRONTEND API ROUTES (Public Access)
// ============================================

// GET: Fetch all published blog posts (for frontend)
router.get('/api/blog/posts', async (req, res) => {
    try {
        const { category, featured } = req.query;
        
        let query = supabase
            .from('blog_posts')
            .select('*')
            .eq('status', 'published')
            .order('published_at', { ascending: false });
        
        // Filter by category if provided
        if (category && category !== 'All') {
            query = query.eq('category', category);
        }
        
        // Filter by featured if provided
        if (featured === 'true') {
            query = query.eq('featured', true);
        }
        
        const { data: posts, error } = await query;
        
        if (error) throw error;
        
        res.json({
            success: true,
            posts: posts || []
        });
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET: Fetch single blog post by ID
router.get('/api/blog/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: post, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('id', id)
            .eq('status', 'published')
            .single();
        
        if (error) throw error;
        
        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Blog post not found'
            });
        }
        
        res.json({
            success: true,
            post
        });
    } catch (error) {
        console.error('Error fetching blog post:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET: Fetch blog categories
router.get('/api/blog/categories', async (req, res) => {
    try {
        const { data: posts, error } = await supabase
            .from('blog_posts')
            .select('category')
            .eq('status', 'published');
        
        if (error) throw error;
        
        // Get unique categories
        const categories = [...new Set(posts.map(p => p.category))];
        
        res.json({
            success: true,
            categories: ['All', ...categories]
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// ADMIN PANEL ROUTES
// ============================================

// GET: Admin blog management page
router.get('/admin/blog', async (req, res) => {
    try {
        const { data: posts, error } = await supabase
            .from('blog_posts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.render('admin/lessons/blog', {
            pageTitle: 'Blog Management',
            activePage: 'blog',
            posts: posts || [],
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error loading blog admin page:', error);
        res.status(500).send('Error loading blog management page');
    }
});

// POST: Add new blog post
router.post('/admin/blog/add', upload.single('image_file'), async (req, res) => {
    try {
        const {
            title,
            excerpt,
            content,
            category,
            read_time,
            featured,
            status,
            image_url
        } = req.body;
        
        let finalImageUrl = image_url || null;
        
        // If file uploaded, upload to Supabase Storage
        if (req.file) {
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(7);
            const fileExt = req.file.originalname.split('.').pop();
            const fileName = `blog_${timestamp}_${randomString}.${fileExt}`;
            const folder = featured === 'true' ? 'featured' : 'regular';
            const filePath = `${folder}/${fileName}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('blog-images')
                .upload(filePath, req.file.buffer, {
                    contentType: req.file.mimetype,
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (uploadError) {
                console.error('Upload error:', uploadError);
                // Continue without image if upload fails
            } else {
                const { data: publicURL } = supabase.storage
                    .from('blog-images')
                    .getPublicUrl(filePath);
                
                finalImageUrl = publicURL.publicUrl;
            }
        }
        
        // Insert blog post into database
        const { data, error } = await supabase
            .from('blog_posts')
            .insert([{
                title,
                excerpt,
                content,
                image_url: finalImageUrl,
                category,
                read_time: read_time || '5 min read',
                featured: featured === 'true',
                status: status || 'published',
                published_at: status === 'published' ? new Date().toISOString() : null
            }])
            .select();
        
        if (error) throw error;
        
        res.redirect('/admin/blog?success=Blog post created successfully!');
    } catch (error) {
        console.error('Error adding blog post:', error);
        res.redirect('/admin/blog?error=' + encodeURIComponent(error.message));
    }
});

// POST: Update existing blog post
router.post('/admin/blog/edit/:id', upload.single('image_file'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            excerpt,
            content,
            category,
            read_time,
            featured,
            status,
            image_url,
            delete_image
        } = req.body;
        
        // Get existing post
        const { data: existingPost } = await supabase
            .from('blog_posts')
            .select('image_url')
            .eq('id', id)
            .single();
        
        let finalImageUrl = existingPost?.image_url || null;
        
        // Handle image deletion
        if (delete_image === 'true' && existingPost?.image_url) {
            // If it's a Supabase Storage URL, delete the file
            if (existingPost.image_url.includes('blog-images')) {
                const urlParts = existingPost.image_url.split('/blog-images/');
                if (urlParts.length > 1) {
                    const filePath = urlParts[1];
                    await supabase.storage
                        .from('blog-images')
                        .remove([filePath]);
                }
            }
            finalImageUrl = null;
        }
        
        // If new file uploaded
        if (req.file) {
            // Delete old image if it exists
            if (existingPost?.image_url && existingPost.image_url.includes('blog-images')) {
                const urlParts = existingPost.image_url.split('/blog-images/');
                if (urlParts.length > 1) {
                    const filePath = urlParts[1];
                    await supabase.storage
                        .from('blog-images')
                        .remove([filePath]);
                }
            }
            
            // Upload new image
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(7);
            const fileExt = req.file.originalname.split('.').pop();
            const fileName = `blog_${timestamp}_${randomString}.${fileExt}`;
            const folder = featured === 'true' ? 'featured' : 'regular';
            const filePath = `${folder}/${fileName}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('blog-images')
                .upload(filePath, req.file.buffer, {
                    contentType: req.file.mimetype,
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (!uploadError) {
                const { data: publicURL } = supabase.storage
                    .from('blog-images')
                    .getPublicUrl(filePath);
                
                finalImageUrl = publicURL.publicUrl;
            }
        } else if (image_url && image_url !== existingPost?.image_url) {
            // New URL provided
            finalImageUrl = image_url;
        }
        
        // Update blog post
        const updateData = {
            title,
            excerpt,
            content,
            image_url: finalImageUrl,
            category,
            read_time: read_time || '5 min read',
            featured: featured === 'true',
            status: status || 'published'
        };
        
        // Update published_at if changing to published
        if (status === 'published' && existingPost.status !== 'published') {
            updateData.published_at = new Date().toISOString();
        }
        
        const { error } = await supabase
            .from('blog_posts')
            .update(updateData)
            .eq('id', id);
        
        if (error) throw error;
        
        res.redirect('/admin/blog?success=Blog post updated successfully!');
    } catch (error) {
        console.error('Error updating blog post:', error);
        res.redirect('/admin/blog?error=' + encodeURIComponent(error.message));
    }
});

// POST: Delete blog post
router.post('/admin/blog/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get post to check for image
        const { data: post } = await supabase
            .from('blog_posts')
            .select('image_url')
            .eq('id', id)
            .single();
        
        // Delete image from storage if it exists
        if (post?.image_url && post.image_url.includes('blog-images')) {
            const urlParts = post.image_url.split('/blog-images/');
            if (urlParts.length > 1) {
                const filePath = urlParts[1];
                await supabase.storage
                    .from('blog-images')
                    .remove([filePath]);
            }
        }
        
        // Delete blog post
        const { error } = await supabase
            .from('blog_posts')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        res.redirect('/admin/blog?success=Blog post deleted successfully!');
    } catch (error) {
        console.error('Error deleting blog post:', error);
        res.redirect('/admin/blog?error=' + encodeURIComponent(error.message));
    }
});

module.exports = router;
