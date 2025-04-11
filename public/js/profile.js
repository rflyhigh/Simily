// FILE: /public/js/profile.js
document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const profileInfo = document.getElementById('profile-info');
  const userPosts = document.getElementById('user-posts');
  const userComments = document.getElementById('user-comments');
  const userUpvoted = document.getElementById('user-upvoted');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const navLinks = document.getElementById('nav-links');
  const uploadLink = document.getElementById('upload-link');

  // Get username from URL
  const username = window.location.pathname.split('/').pop();
  
  // Current user data
  let currentUser = null;
  
  // Profile user data
  let profileUser = null;

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
      
      currentUser = await response.json();
      updateNavLinks(true, currentUser);
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

  // Fetch profile data
  const fetchProfileData = async () => {
    try {
      profileInfo.innerHTML = '<div class="loading">Loading profile...</div>';
      
      const response = await fetch(`/api/users/${username}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          window.location.href = '/404';
          return;
        }
        throw new Error('Failed to fetch profile data');
      }
      
      profileUser = await response.json();
      
      // Update page title
      document.title = `${profileUser.username}'s Profile - Simily`;
      
      // Check if this is the current user's profile
      const isOwnProfile = currentUser && currentUser.username === profileUser.username;
      
      // Format join date
      const joinDate = new Date(profileUser.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Add mod badge if user is a moderator
      const modBadge = profileUser.isMod ? '<span class="mod-badge">MOD</span> ' : '';
      
      // Render profile info
      profileInfo.innerHTML = `
      <div class="profile-user">
        <div class="profile-username">${modBadge}${profileUser.username}</div>
        <div class="profile-stats">
          <div class="stat">
            <span class="stat-value">${profileUser.reputation}</span>
            <span class="stat-label">Reputation</span>
          </div>
          <div class="stat">
            <span class="stat-value">${profileUser.postCount}</span>
            <span class="stat-label">Posts</span>
          </div>
          <div class="stat">
            <span class="stat-value">${profileUser.commentCount}</span>
            <span class="stat-label">Comments</span>
          </div>
        </div>
        <div class="profile-meta">
          <span class="join-date">Joined: ${joinDate}</span>
          ${currentUser && !isOwnProfile ? `
            <button class="report-user-btn" onclick="reportUser('${profileUser._id}', '${profileUser.username}')">Report User</button>
          ` : ''}
        </div>
      </div>
      `;
      
      // Fetch initial tab content (posts)
      fetchUserPosts();
    } catch (error) {
      console.error('Error fetching profile data:', error);
      profileInfo.innerHTML = '<div class="error-message">Failed to load profile data.</div>';
    }
  };

  // Fetch user posts
  const fetchUserPosts = async () => {
    try {
      userPosts.innerHTML = '<div class="loading">Loading posts...</div>';
      
      const response = await fetch(`/api/users/${username}/posts`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user posts');
      }
      
      const posts = await response.json();
      
      if (posts.length === 0) {
        userPosts.innerHTML = '<div class="empty-state">No posts yet.</div>';
        return;
      }
      
      let postsHTML = '';
      posts.forEach(post => {
        postsHTML += createPostCard(post);
      });
      
      userPosts.innerHTML = postsHTML;
    } catch (error) {
      console.error('Error fetching user posts:', error);
      userPosts.innerHTML = '<div class="error-message">Failed to load posts.</div>';
    }
  };

  // Fetch user comments
  const fetchUserComments = async () => {
    try {
      userComments.innerHTML = '<div class="loading">Loading comments...</div>';
      
      const response = await fetch(`/api/users/${username}/comments`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user comments');
      }
      
      const comments = await response.json();
      
      if (comments.length === 0) {
        userComments.innerHTML = '<div class="empty-state">No comments yet.</div>';
        return;
      }
      
      let commentsHTML = '';
      comments.forEach(comment => {
        const date = new Date(comment.createdAt).toLocaleDateString();
        
        commentsHTML += `
          <div class="profile-comment">
            <div class="comment-header">
              <a href="/post/${comment.postId.slug}" class="comment-post-title">${comment.postId.title}</a>
              <span class="comment-date">${date}</span>
            </div>
            <div class="comment-content">${comment.content}</div>
          </div>
        `;
      });
      
      userComments.innerHTML = commentsHTML;
    } catch (error) {
      console.error('Error fetching user comments:', error);
      userComments.innerHTML = '<div class="error-message">Failed to load comments.</div>';
    }
  };

  // Fetch user upvoted posts
  const fetchUserUpvoted = async () => {
    try {
      // Only allow viewing own upvoted posts
      if (!currentUser || currentUser.username !== username) {
        userUpvoted.innerHTML = '<div class="error-message">You can only view your own upvoted posts.</div>';
        return;
      }
      
      userUpvoted.innerHTML = '<div class="loading">Loading upvoted posts...</div>';
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/me/upvoted`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch upvoted posts');
      }
      
      const posts = await response.json();
      
      if (posts.length === 0) {
        userUpvoted.innerHTML = '<div class="empty-state">No upvoted posts yet.</div>';
        return;
      }
      
      let postsHTML = '';
      posts.forEach(post => {
        postsHTML += createPostCard(post);
      });
      
      userUpvoted.innerHTML = postsHTML;
    } catch (error) {
      console.error('Error fetching upvoted posts:', error);
      userUpvoted.innerHTML = '<div class="error-message">Failed to load upvoted posts.</div>';
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

  // Handle tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      
      // Update active button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Hide all tab contents
      tabContents.forEach(content => content.classList.add('hidden'));
      
      // Show selected tab content
      const selectedTab = document.getElementById(`${tab}-tab`);
      selectedTab.classList.remove('hidden');
      
      // Fetch content for the selected tab if needed
      if (tab === 'posts') {
        fetchUserPosts();
      } else if (tab === 'comments') {
        fetchUserComments();
      } else if (tab === 'upvoted') {
        fetchUserUpvoted();
      }
    });
  });

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

  // Open the report user modal
  window.reportUser = (userId, username) => {
    const reportModal = document.getElementById('report-user-modal');
    const reportUserId = document.getElementById('report-user-id');
    const reportReason = document.getElementById('report-user-reason');
    
    // Set the report details
    reportUserId.value = userId;
    reportReason.value = '';
    
    // Update modal title to include username
    const modalTitle = reportModal.querySelector('.modal-header h3');
    modalTitle.textContent = `Report User: ${username}`;
    
    // Show the modal
    reportModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
    
    // Focus on the reason textarea
    reportReason.focus();
  };

  // Close the report modal
  const closeReportModal = () => {
    const reportModal = document.getElementById('report-user-modal');
    reportModal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
  };

  // Submit the user report
  const submitUserReport = async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('report-user-id').value;
    const reason = document.getElementById('report-user-reason').value.trim();
    
    if (!reason) {
      alert('Please provide a reason for reporting this user');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          targetId: userId,
          type: 'user',
          reason: reason
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit report');
      }
      
      // Close the modal
      closeReportModal();
      
      // Show success notification
      showProfileNotification('success', 'Report submitted successfully. Thank you for helping keep Simily safe.');
    } catch (error) {
      console.error('Error reporting user:', error);
      showProfileNotification('error', 'Failed to submit report. Please try again.');
    }
  };

  // Show notification for profile actions
  const showProfileNotification = (type, message) => {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.profile-notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `profile-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close">&times;</button>
      </div>
    `;
    
    // Add close button functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.remove();
    });
    
    // Add to page
    document.querySelector('.profile-header').after(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.remove();
      }
    }, 5000);
  };

  // Initialize page
  const init = async () => {
    await checkAuth();
    fetchProfileData();
    
    // Set up report modal event listeners
    const reportModal = document.getElementById('report-user-modal');
    if (reportModal) {
      const reportForm = document.getElementById('report-user-form');
      const modalClose = reportModal.querySelector('.modal-close');
      const cancelReport = document.getElementById('cancel-user-report');
      
      reportForm.addEventListener('submit', submitUserReport);
      modalClose.addEventListener('click', closeReportModal);
      cancelReport.addEventListener('click', closeReportModal);
      
      // Close modal when clicking outside of it
      reportModal.addEventListener('click', (e) => {
        if (e.target === reportModal) {
          closeReportModal();
        }
      });
      
      // Close modal with Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && reportModal.classList.contains('active')) {
          closeReportModal();
        }
      });
    }
  };

  init();
});