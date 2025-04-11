// FILE: /public/js/main.js
document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const noticesSection = document.getElementById('notices');
  const recentPostsGrid = document.getElementById('recent-posts');
  const popularPostsGrid = document.getElementById('popular-posts');
  const categoriesList = document.getElementById('categories-list');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const navLinks = document.getElementById('nav-links');
  const uploadLink = document.getElementById('upload-link');

  // Current filter period for popular posts
  let currentPeriod = 'all';

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
      // Check for unread notifications
      fetch('/api/auth/notifications/count', {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      })
      .then(res => res.json())
      .then(data => {
        const notificationBadge = data.count > 0 ? 
          `<span class="notification-badge">${data.count}</span>` : '';
        
        navLinks.innerHTML = `
          <a href="/upload" class="nav-link">Upload</a>
          <a href="/notifications" class="nav-link">Notifications${notificationBadge}</a>
          <a href="/user/${user.username}" class="nav-link">${user.isMod ? '<span class="mod-badge">MOD</span> ' : ''}Profile</a>
          <button id="logout-btn" class="nav-link">Logout</button>
        `;
        
        // Add logout event listener
        document.getElementById('logout-btn').addEventListener('click', () => {
          localStorage.removeItem('token');
          window.location.reload();
        });
      })
      .catch(err => {
        console.error('Error fetching notification count:', err);
        navLinks.innerHTML = `
          <a href="/upload" class="nav-link">Upload</a>
          <a href="/notifications" class="nav-link">Notifications</a>
          <a href="/user/${user.username}" class="nav-link">${user.isMod ? '<span class="mod-badge">MOD</span> ' : ''}Profile</a>
          <button id="logout-btn" class="nav-link">Logout</button>
        `;
        
        // Add logout event listener
        document.getElementById('logout-btn').addEventListener('click', () => {
          localStorage.removeItem('token');
          window.location.reload();
        });
      });
    } else {
      navLinks.innerHTML = `
        <a href="/login" class="nav-link">Login</a>
        <a href="/register" class="nav-link">Register</a>
      `;
    }
  };

  // Add animation to elements when they come into view
  const animateOnScroll = () => {
    const elements = document.querySelectorAll('.post-card, .section-header, .notice, .category-item');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    elements.forEach(element => {
      element.style.opacity = '0';
      element.style.transform = 'translateY(20px)';
      element.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
      observer.observe(element);
    });
  };

  // Fetch and display notices
  const fetchNotices = async () => {
    try {
      const response = await fetch('/api/notices');
      const notices = await response.json();

      if (notices.length === 0) {
        noticesSection.style.display = 'none';
        return;
      }

      let noticesHTML = '';
      notices.forEach(notice => {
        noticesHTML += `
          <div class="notice">
            <p>${notice.content}</p>
          </div>
        `;
      });

      noticesSection.innerHTML = noticesHTML;
      animateOnScroll();
    } catch (error) {
      console.error('Error fetching notices:', error);
      noticesSection.style.display = 'none';
    }
  };

  // Fetch and display recent posts
  const fetchRecentPosts = async () => {
    try {
      recentPostsGrid.innerHTML = '<div class="loading">Loading recent posts...</div>';
      
      const response = await fetch('/api/posts/recent');
      const posts = await response.json();

      if (posts.length === 0) {
        recentPostsGrid.innerHTML = '<div class="empty-state">No posts available yet.</div>';
        return;
      }

      let postsHTML = '';
      posts.forEach(post => {
        postsHTML += createPostCard(post);
      });

      recentPostsGrid.innerHTML = postsHTML;
      animateOnScroll();
    } catch (error) {
      console.error('Error fetching recent posts:', error);
      recentPostsGrid.innerHTML = '<div class="error-message">Failed to load recent posts.</div>';
    }
  };

  // Fetch and display popular posts
  const fetchPopularPosts = async (period = 'all') => {
    try {
      popularPostsGrid.innerHTML = '<div class="loading">Loading popular posts...</div>';
      
      const response = await fetch(`/api/posts/popular?period=${period}`);
      const posts = await response.json();

      if (posts.length === 0) {
        popularPostsGrid.innerHTML = '<div class="empty-state">No posts available yet.</div>';
        return;
      }

      let postsHTML = '';
      posts.forEach(post => {
        postsHTML += createPostCard(post);
      });

      popularPostsGrid.innerHTML = postsHTML;
      animateOnScroll();
    } catch (error) {
      console.error('Error fetching popular posts:', error);
      popularPostsGrid.innerHTML = '<div class="error-message">Failed to load popular posts.</div>';
    }
  };

  // Fetch and display categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const categories = await response.json();

      if (categories.length === 0) {
        categoriesList.innerHTML = '<div class="empty-state">No categories available yet.</div>';
        return;
      }

      let categoriesHTML = '';
      categories.forEach(category => {
        categoriesHTML += `
          <a href="/search?category=${encodeURIComponent(category.name)}" class="category-item">
            <div class="category-icon">${getCategoryIcon(category.name)}</div>
            <div class="category-info">
              <h3 class="category-name">${category.name}</h3>
              <span class="category-count">${category.count} posts</span>
            </div>
          </a>
        `;
      });

      categoriesList.innerHTML = categoriesHTML;
      animateOnScroll();
    } catch (error) {
      console.error('Error fetching categories:', error);
      categoriesList.innerHTML = '<div class="error-message">Failed to load categories.</div>';
    }
  };

  // Get icon for category
  const getCategoryIcon = (category) => {
    const icons = {
      'software': '💻',
      'game': '🎮',
      'movie': '🎬',
      'music': '🎵',
      'book': '📚',
      'tutorial': '📝',
      'other': '📦'
    };
    
    return icons[category.toLowerCase()] || '📦';
  };

  const createPostCard = (post) => {
    const tags = post.tags.slice(0, 3).map(tag => 
      `<span class="tag">${tag}</span>`
    ).join('');

    // Check if author is a mod
    const modBadge = post.author && post.author.isMod ? '<span class="mod-badge">MOD</span> ' : '';

    return `
      <div class="post-card">
        <div class="post-votes">
          <span class="vote-count">${post.upvotes - post.downvotes}</span>
        </div>
        <img src="${post.imageUrl}" alt="${post.title}" class="post-image">
        <div class="post-info">
          <div class="post-meta">
            <span class="post-category">${post.category}</span>
            <span class="post-author">by ${modBadge}${post.author ? post.author.username : 'Unknown'}</span>
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

  // Handle filter button clicks with animation
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const period = button.dataset.period;
      
      // Update active button with animation
      filterButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.style.transform = '';
      });
      
      button.classList.add('active');
      button.style.transform = 'scale(1.05)';
      setTimeout(() => {
        button.style.transform = '';
      }, 300);
      
      // Update current period and fetch data
      currentPeriod = period;
      fetchPopularPosts(period);
    });
  });

  // Handle search with animation
  searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
      searchButton.classList.add('searching');
      setTimeout(() => {
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
      }, 300);
    }
  });

  // Allow search on Enter key
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchButton.click();
    }
  });

  // Add focus animation to search input
  searchInput.addEventListener('focus', () => {
    searchInput.parentElement.classList.add('focused');
  });

  searchInput.addEventListener('blur', () => {
    searchInput.parentElement.classList.remove('focused');
  });

  // Initialize page
  checkAuth();
  fetchNotices();
  fetchRecentPosts();
  fetchPopularPosts(currentPeriod);
  fetchCategories();
});