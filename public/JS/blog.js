// Supabase configuration
const SUPABASE_URL = 'https://qtsfceqredvwhwukaugu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0c2ZjZXFyZWR2d2h3dWthdWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMyMzE0MTQsImV4cCI6MjA0ODgwNzQxNH0.fLe8bLNEoZ67-JIrzWFa4FRhFgBMQQHJwJeZqTiOFys';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Blog posts data - Now fetched from API
let blogPosts = [];
let categories = ['All'];

// State
let searchQuery = '';
let selectedCategory = 'All';
let isLoading = true;

// Helper functions
function getCategoryIcon(category) {
  switch (category) {
    case 'Learning Tips': return 'book-open';
    case 'Productivity': return 'target';
    case 'Well-being': return 'heart';
    default: return 'sparkles';
  }
}

function getCategoryColor(category) {
  switch (category) {
    case 'Learning Tips': return 'badge-learning';
    case 'Productivity': return 'badge-productivity';
    case 'Well-being': return 'badge-wellbeing';
    default: return '';
  }
}

function filterPosts() {
  return blogPosts.filter(post => 
    (selectedCategory === 'All' || post.category === selectedCategory) &&
    (post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()))
  );
}

function createPostCard(post, isFeatured = false) {
  const card = document.createElement('div');
  card.className = isFeatured ? 'card card-featured' : 'card';
  
  const imageContainerClass = isFeatured ? 'card-image-container card-image-container-featured' : 'card-image-container';
  const contentClass = isFeatured ? 'card-content card-content-featured' : 'card-content';
  
  // Format date
  const postDate = post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  }) : 'Recent';
  
  card.innerHTML = `
    <div class="${imageContainerClass}">
      <img 
        src="${post.image_url || 'https://via.placeholder.com/800x600/f3e8ff/9333ea?text=Blog+Post'}" 
        alt="${post.title}"
        class="card-image"
        onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22600%22%3E%3Crect fill=%22%23f3e8ff%22 width=%22800%22 height=%22600%22/%3E%3Ctext fill=%22%239333ea%22 font-family=%22sans-serif%22 font-size=%2224%22 dy=%2210.5%22 font-weight=%22bold%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22%3EBlog Image%3C/text%3E%3C/svg%3E'"
      />
      ${isFeatured ? '<div class="featured-badge">Featured</div>' : ''}
    </div>
    <div class="${contentClass}">
      <div class="card-meta">
        <span class="badge ${getCategoryColor(post.category)}">
          <i data-lucide="${getCategoryIcon(post.category)}"></i>
          ${post.category}
        </span>
        <span class="read-time">
          <i data-lucide="clock"></i>
          ${post.read_time || '5 min read'}
        </span>
      </div>
      <h3>${post.title}</h3>
      <p class="card-excerpt">${post.excerpt}</p>
      <div class="card-footer">
        <span class="card-date">${postDate}</span>
        <button class="read-more-button" data-post-id="${post.id}">Read More →</button>
      </div>
    </div>
  `;
  
  // Add click event to Read More button
  const readMoreBtn = card.querySelector('.read-more-button');
  readMoreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.href = `blog-post.html?id=${post.id}`;
  });

  // Also make the whole card clickable
  card.addEventListener('click', () => {
    window.location.href = `blog-post.html?id=${post.id}`;
  });
  
  return card;
}

function renderCategories() {
  const container = document.getElementById('categoriesContainer');
  container.innerHTML = categories.map(category => `
    <button 
      class="category-button ${selectedCategory === category ? 'active' : ''}"
      data-category="${category}"
    >
      ${category}
    </button>
  `).join('');
  
  // Add event listeners
  container.querySelectorAll('.category-button').forEach(button => {
    button.addEventListener('click', (e) => {
      selectedCategory = e.target.dataset.category;
      render();
    });
  });
}

function renderFeaturedPosts() {
  const featuredSection = document.getElementById('featuredSection');
  const featuredGrid = document.getElementById('featuredGrid');
  
  if (selectedCategory === 'All' && !searchQuery) {
    featuredSection.style.display = 'block';
    featuredGrid.innerHTML = '';
    
    const featuredPosts = blogPosts.filter(post => post.featured);
    
    if (featuredPosts.length > 0) {
      featuredPosts.forEach(post => {
        featuredGrid.appendChild(createPostCard(post, true));
      });
    } else {
      featuredGrid.innerHTML = '<p style="color: #718096; padding: 20px;">No featured posts available.</p>';
    }
    
    // Re-initialize icons
    lucide.createIcons();
  } else {
    featuredSection.style.display = 'none';
  }
}

function renderAllPosts() {
  const sectionTitle = document.getElementById('sectionTitle');
  const postsContainer = document.getElementById('postsContainer');
  
  sectionTitle.textContent = selectedCategory === 'All' ? 'All Articles' : selectedCategory;
  
  const filteredPosts = filterPosts();
  
  if (isLoading) {
    postsContainer.innerHTML = `
      <div class="empty-state">
        <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
        <p>Loading blog posts...</p>
      </div>
    `;
    return;
  }
  
  if (filteredPosts.length === 0) {
    postsContainer.innerHTML = `
      <div class="empty-state">
        <i data-lucide="book-open"></i>
        <p>No articles found. Try a different search or category.</p>
      </div>
    `;
    lucide.createIcons();
  } else {
    const grid = document.createElement('div');
    grid.className = 'posts-grid';
    
    filteredPosts.forEach(post => {
      grid.appendChild(createPostCard(post, false));
    });
    
    postsContainer.innerHTML = '';
    postsContainer.appendChild(grid);
    
    // Re-initialize icons
    lucide.createIcons();
  }
}

function render() {
  renderCategories();
  renderFeaturedPosts();
  renderAllPosts();
}

// Fetch blog posts from API
async function fetchBlogPosts() {
  try {
    isLoading = true;
    render();
    
    const response = await fetch('/api/blog/posts');
    const data = await response.json();
    
    if (data.success) {
      blogPosts = data.posts || [];
      
      // Extract unique categories
      const uniqueCategories = [...new Set(blogPosts.map(p => p.category))];
      categories = ['All', ...uniqueCategories];
      
      console.log(`✅ Loaded ${blogPosts.length} blog posts`);
    } else {
      console.error('❌ Error fetching blog posts:', data.error);
      blogPosts = [];
    }
  } catch (error) {
    console.error('❌ Error fetching blog posts:', error);
    blogPosts = [];
  } finally {
    isLoading = false;
    render();
  }
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', (e) => {
  searchQuery = e.target.value;
  render();
});

// Initial render
document.addEventListener('DOMContentLoaded', async () => {
  await fetchBlogPosts();
});
