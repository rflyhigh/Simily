// FILE: /public/js/search.js
document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const searchTitle = document.getElementById('search-title');
  const searchResults = document.getElementById('search-results');
  const tagFilters = document.getElementById('tag-filters');
  const pagination = document.getElementById('pagination');
  const categoryFilter = document.getElementById('category-filter');
  const sortSelect = document.getElementById('sort-select');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const navLinks = document.getElementById('nav-links');
  const uploadLink = document.getElementById('upload-link');

  // Get query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q');
  const tag = urlParams.get('tag');
  const category = urlParams.get('category');
  const page = parseInt(urlParams.get('page')) || 1;
  const sort = urlParams.get('sort') || 'newest';

  // Set initial sort value
  if (sortSelect) {
    sortSelect.value = sort;
  }

  // Set initial category filter value
  if (categoryFilter && category) {
    categoryFilter.value = category;
  }

  // Update search input with query
  if (query && searchInput) {
    searchInput.value = query;
  }

  // Check if user is logged in
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        updateNavLinks(false);
        return;
      }
      
      const response = await fetch('/api/auth/user', {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        localStorage.removeItem('token');
        updateNavLinks(false);
        return;
      }
      
      const userData = await response.json();
      updateNavLinks(true, userData);
    } catch (error) {
      console.error('Auth check error:', error);
      updateNavLinks(false);
    }
  };

  // Update navigation links based on auth status
  const updateNavLinks = (isLoggedIn, user = null) => {
    if (isLoggedIn && user) {
      navLinks.innerHTML = `
        <a href="/upload" class="nav-link">Upload</a>
        <a href="/user/${user.username}" class="nav-link">Profile</a>
        <button id="logout-btn" class="nav-link">Logout</button>
      `;
      
      // Add logout event listener
      document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.reload();
      });
    } else {
      navLinks.innerHTML = `
        <a href="/login" class="nav-link">Login</a>
        <a href="/register" class="nav-link">Register</a>
      `;
    }
  };

  // Update page title based on search type
  if (query) {
    searchTitle.textContent = `Search Results for "${query}"`;
    document.title = `Search: ${query} - Simily`;
  } else if (tag) {
    searchTitle.textContent = `Posts Tagged with "${tag}"`;
    document.title = `Tag: ${tag} - Simily`;
  } else if (category) {
    searchTitle.textContent = `${category} Posts`;
    document.title = `${category} - Simily`;
  }

  // Fetch categories for filter
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const categories = await response.json();
      
      let options = '<option value="all">All Categories</option>';
      categories.forEach(cat => {
        options += `<option value="${cat.name}" ${category === cat.name ? 'selected' : ''}>${cat.name}</option>`;
      });
      
      categoryFilter.innerHTML = options;
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch search results
  const fetchSearchResults = async () => {
    try {
      searchResults.innerHTML = '<div class="loading">Loading...</div>';
      
      let url;
      const params = new URLSearchParams();
      
      if (query) {
        params.append('q', query);
      } else if (tag) {
        params.append('tag', tag);
      } else if (category && category !== 'all') {
        params.append('category', category);
      }
      
      params.append('page', page);
      params.append('sort', sort);
      
      url = `/api/posts/search?${params.toString()}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      const posts = data.posts || [];
      const totalPages = data.totalPages || 1;
      const currentPage = data.currentPage || 1;
      
      if (posts.length === 0) {
        searchResults.innerHTML = '<div class="empty-state">No posts found matching your criteria.</div>';
        return;
      }
      
      // Render results
      let resultsHTML = '';
      posts.forEach(post => {
        resultsHTML += createPostCard(post);
      });
      
      searchResults.innerHTML = resultsHTML;
      
      // Render pagination if needed
      if (totalPages > 1) {
        renderPagination(currentPage, totalPages);
      } else {
        pagination.innerHTML = '';
      }
      
      // Extract and display unique tags for filtering
      if (!tag) {
        renderTagFilters(posts);
      }
    } catch (error) {
      console.error('Error fetching search results:', error);
      searchResults.innerHTML = '<div class="error-message">Failed to load search results.</div>';
    }
  };

  // Create HTML for a post card
  const createPostCard = (post) => {
    const tags = post.tags.slice(0, 3).map(tag => 
      `<span class="tag">${tag}</span>`
    ).join('');

    return `
      <div class="post-card">
        <div class="post-votes">
          <span class="vote-count">${post.upvotes - post.downvotes}</span>
        </div>
        <img src="${post.imageUrl}" alt="${post.title}" class="post-image">
        <div class="post-info">
          <div class="post-meta">
            <span class="post-category">${post.category}</span>
            <span class="post-author">by ${post.author.username}</span>
          </div>
          <h3 class="post-title">${post.title}</h3>
          <p class="post-description">${truncateText(post.description, 100)}</p>
          <div class="post-tags">
            ${tags}
          </div>
          <a href="/post/${post.slug}" class="view-btn">View Details</a>
        </div>
      </div>
    `;
  };

  // Helper function to truncate text
  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Render pagination controls
  const renderPagination = (currentPage, totalPages) => {
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
      <button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" 
        ${currentPage === 1 ? 'disabled' : `onclick="changePage(${currentPage - 1})"`}>
        Previous
      </button>
    `;
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <button class="page-btn ${i === currentPage ? 'active' : ''}" 
          onclick="changePage(${i})">
          ${i}
        </button>
      `;
    }
    
    // Next button
    paginationHTML += `
      <button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" 
        ${currentPage === totalPages ? 'disabled' : `onclick="changePage(${currentPage + 1})"`}>
        Next
      </button>
    `;
    
    pagination.innerHTML = paginationHTML;
    
    // Add page change function to window
    window.changePage = (page) => {
      const url = new URL(window.location);
      url.searchParams.set('page', page);
      window.location.href = url.toString();
    };
  };

  // Render tag filters
  const renderTagFilters = (posts) => {
    // Extract unique tags
    const allTags = posts.flatMap(post => post.tags);
    const uniqueTags = [...new Set(allTags)].slice(0, 15); // Limit to 15 tags
    
    if (uniqueTags.length === 0) {
      tagFilters.style.display = 'none';
      return;
    }
    
    let tagsHTML = '<div class="tag-filter-list">';
    uniqueTags.forEach(tag => {
      tagsHTML += `<a href="/search?tag=${encodeURIComponent(tag)}" class="tag">${tag}</a>`;
    });
    tagsHTML += '</div>';
    
    tagFilters.innerHTML = tagsHTML;
  };

  // Handle category filter change
  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      const url = new URL(window.location);
      
      if (categoryFilter.value === 'all') {
        url.searchParams.delete('category');
      } else {
        url.searchParams.set('category', categoryFilter.value);
      }
      
      url.searchParams.delete('page'); // Reset to page 1
      window.location.href = url.toString();
    });
  }

  // Handle sort change
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const url = new URL(window.location);
      url.searchParams.set('sort', sortSelect.value);
      url.searchParams.delete('page'); // Reset to page 1
      window.location.href = url.toString();
    });
  }

  // Handle search
  searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
      window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
  });

  // Allow search on Enter key
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchButton.click();
    }
  });

  // Initialize page
  checkAuth();
  if (categoryFilter) fetchCategories();
  fetchSearchResults();
});