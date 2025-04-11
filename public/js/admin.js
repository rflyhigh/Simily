// FILE: admin.js
document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const adminNav = document.querySelector('.admin-nav');
  const postsSection = document.getElementById('posts-section');
  const usersSection = document.getElementById('users-section');
  const noticesSection = document.getElementById('notices-section');
  const commentsSection = document.getElementById('comments-section');
  const reportsSection = document.getElementById('reports-section');
  const navButtons = document.querySelectorAll('.nav-btn');
  const noticeForm = document.getElementById('notice-form');
  const addNoticeBtn = document.getElementById('add-notice-btn');
  const cancelNoticeBtn = document.getElementById('cancel-notice-btn');
  const noticeFormContainer = document.getElementById('notice-form-container');
  const noticeList = document.getElementById('notice-list');
  const postsList = document.getElementById('posts-list');
  const usersList = document.getElementById('users-list');
  const commentsList = document.getElementById('comments-list');
  const reportsList = document.getElementById('reports-list');
  const logoutBtn = document.getElementById('logout-btn');
  const postStatusFilter = document.getElementById('post-status-filter');
  const postCategoryFilter = document.getElementById('post-category-filter');
  const postSearch = document.getElementById('post-search');
  const userStatusFilter = document.getElementById('user-status-filter');
  const userSearch = document.getElementById('user-search');
  const commentStatusFilter = document.getElementById('comment-status-filter');
  const commentPostFilter = document.getElementById('comment-post-filter');
  const commentSearch = document.getElementById('comment-search');
  const reportStatusFilter = document.getElementById('report-status-filter');
  const reportTypeFilter = document.getElementById('report-type-filter');

  // Admin token
  let adminToken = localStorage.getItem('adminToken');

  // Check if admin is logged in
  if (!adminToken) {
    window.location.href = '/admin/login';
    return;
  }

// FILE: /public/js/admin.js (continued)
  // Handle logout
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login';
  });

  // Handle navigation between sections
  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const section = button.dataset.section;
      
      // Update active button
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Hide all sections
      postsSection.classList.add('hidden');
      usersSection.classList.add('hidden');
      noticesSection.classList.add('hidden');
      commentsSection.classList.add('hidden');
      reportsSection.classList.add('hidden');
      
      // Show selected section
      if (section === 'posts') {
        postsSection.classList.remove('hidden');
        fetchPosts();
      } else if (section === 'users') {
        usersSection.classList.remove('hidden');
        fetchUsers();
      } else if (section === 'notices') {
        noticesSection.classList.remove('hidden');
        fetchNotices();
      } else if (section === 'comments') {
        commentsSection.classList.remove('hidden');
        fetchComments();
        fetchPostsForCommentFilter();
      } else if (section === 'reports') {
        reportsSection.classList.remove('hidden');
        fetchReports();
      }
    });
  });

  // Fetch posts list
  const fetchPosts = async () => {
    try {
      const status = postStatusFilter.value;
      const category = postCategoryFilter.value;
      const searchQuery = postSearch.value.trim();
      
      let url = '/admin/api/posts';
      const params = new URLSearchParams();
      
      if (status !== 'all') params.append('status', status);
      if (category !== 'all') params.append('category', category);
      if (searchQuery) params.append('search', searchQuery);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      postsList.innerHTML = '<div class="loading">Loading...</div>';
      
      const response = await fetch(url, {
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      const posts = await response.json();
      
      if (posts.length === 0) {
        postsList.innerHTML = '<div class="empty-state">No posts found.</div>';
        return;
      }
      
      let postsHTML = '';
      posts.forEach(post => {
        const date = new Date(post.createdAt).toLocaleDateString();
        const statusClass = post.status === 'active' ? 'status-active' : 
                           post.status === 'held' ? 'status-held' : 'status-deleted';
        
        postsHTML += `
          <div class="admin-item">
            <div class="admin-item-info">
              <h3 class="admin-item-title">${post.title}</h3>
              <div class="admin-item-meta">
                By: ${post.author.username} | Added: ${date} | Views: ${post.views} | 
                Upvotes: ${post.upvotes} | Downvotes: ${post.downvotes} |
                <span class="status-badge ${statusClass}">${post.status}</span>
              </div>
            </div>
            <div class="admin-item-actions">
              <button class="btn-small" onclick="viewPost('${post._id}')">View</button>
              ${post.status === 'active' ? 
                `<button class="btn-small" onclick="holdPost('${post._id}')">Hold</button>` : 
                post.status === 'held' ? 
                `<button class="btn-small" onclick="approvePost('${post._id}')">Approve</button>` : ''}
              <button class="delete-btn" onclick="deletePost('${post._id}')">Delete</button>
            </div>
          </div>
        `;
      });
      
      postsList.innerHTML = postsHTML;
    } catch (error) {
      console.error('Error fetching posts:', error);
      postsList.innerHTML = '<div class="error-message">Failed to load posts.</div>';
    }
  };

  // Fetch users list
  const fetchUsers = async () => {
    try {
      const status = userStatusFilter.value;
      const searchQuery = userSearch.value.trim();
      
      let url = '/admin/api/users';
      const params = new URLSearchParams();
      
      if (status !== 'all') params.append('status', status);
      if (searchQuery) params.append('search', searchQuery);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      usersList.innerHTML = '<div class="loading">Loading...</div>';
      
      const response = await fetch(url, {
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const users = await response.json();
      
      if (users.length === 0) {
        usersList.innerHTML = '<div class="empty-state">No users found.</div>';
        return;
      }
      
      let usersHTML = '';
      users.forEach(user => {
        const joinDate = new Date(user.createdAt).toLocaleDateString();
        const statusClass = user.status === 'active' ? 'status-active' : 'status-blocked';
        
        usersHTML += `
          <div class="admin-item">
            <div class="admin-item-info">
              <h3 class="admin-item-title">${user.username}</h3>
              <div class="admin-item-meta">
                Joined: ${joinDate} | Posts: ${user.postCount} | Comments: ${user.commentCount} | 
                Reputation: ${user.reputation} |
                <span class="status-badge ${statusClass}">${user.status}</span>
              </div>
            </div>
            <div class="admin-item-actions">
              <button class="btn-small" onclick="viewUserProfile('${user._id}')">View Profile</button>
              ${user.status === 'active' ? 
                `<button class="btn-small" onclick="blockUser('${user._id}')">Block</button>` : 
                `<button class="btn-small" onclick="unblockUser('${user._id}')">Unblock</button>`}
            </div>
          </div>
        `;
      });
      
      usersList.innerHTML = usersHTML;
    } catch (error) {
      console.error('Error fetching users:', error);
      usersList.innerHTML = '<div class="error-message">Failed to load users.</div>';
    }
  };

  // Fetch notices list
  const fetchNotices = async () => {
    try {
      noticeList.innerHTML = '<div class="loading">Loading...</div>';
      
      const response = await fetch('/admin/api/notices', {
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notices');
      }
      
      const notices = await response.json();
      
      if (notices.length === 0) {
        noticeList.innerHTML = '<div class="empty-state">No notices available yet.</div>';
        return;
      }
      
      let noticesHTML = '';
      notices.forEach(notice => {
        const date = new Date(notice.createdAt).toLocaleDateString();
        noticesHTML += `
          <div class="admin-item">
            <div class="admin-item-info">
              <div class="admin-item-title">${notice.content}</div>
              <div class="admin-item-meta">Added: ${date}</div>
            </div>
            <div class="admin-item-actions">
              <button class="toggle-btn ${notice.active ? 'active' : 'inactive'}" 
                onclick="toggleNotice('${notice._id}', ${!notice.active})">
                ${notice.active ? 'Active' : 'Inactive'}
              </button>
              <button class="edit-btn" onclick="editNotice('${notice._id}')">Edit</button>
              <button class="delete-btn" onclick="deleteNotice('${notice._id}')">Delete</button>
            </div>
          </div>
        `;
      });
      
      noticeList.innerHTML = noticesHTML;
    } catch (error) {
      console.error('Error fetching notices:', error);
      noticeList.innerHTML = '<div class="error-message">Failed to load notices.</div>';
    }
  };

  // Fetch posts for comment filter
  const fetchPostsForCommentFilter = async () => {
    try {
      const response = await fetch('/admin/api/posts', {
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      const posts = await response.json();
      
      let options = '<option value="">All Posts</option>';
      posts.forEach(post => {
        options += `<option value="${post._id}">${post.title}</option>`;
      });
      
      commentPostFilter.innerHTML = options;
    } catch (error) {
      console.error('Error fetching posts for filter:', error);
    }
  };

  // Fetch comments list
  const fetchComments = async () => {
    try {
      const status = commentStatusFilter.value;
      const postId = commentPostFilter.value;
      const searchQuery = commentSearch.value.trim();
      
      let url = '/admin/api/comments';
      const params = new URLSearchParams();
      
      if (status !== 'all') params.append('status', status);
      if (postId) params.append('postId', postId);
      if (searchQuery) params.append('search', searchQuery);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      commentsList.innerHTML = '<div class="loading">Loading...</div>';
      
      const response = await fetch(url, {
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      
      const comments = await response.json();
      
      if (comments.length === 0) {
        commentsList.innerHTML = '<div class="empty-state">No comments found.</div>';
        return;
      }
      
      // Group comments by post
      const commentsByPost = {};
      comments.forEach(comment => {
        const postId = comment.postId ? comment.postId._id : 'unknown';
        const postTitle = comment.postId ? comment.postId.title : 'Unknown Post';
        
        if (!commentsByPost[postId]) {
          commentsByPost[postId] = {
            title: postTitle,
            comments: []
          };
        }
        
        commentsByPost[postId].comments.push(comment);
      });
      
      let commentsHTML = '';
      
      // Add bulk actions section
      commentsHTML += `
        <div class="bulk-actions">
          <button id="select-all-comments" class="btn-small">Select All</button>
          <button id="deselect-all-comments" class="btn-small">Deselect All</button>
          <button id="bulk-delete-comments" class="delete-btn" disabled>Delete Selected</button>
          <button id="bulk-approve-comments" class="btn-small" disabled>Approve Selected</button>
          <button id="bulk-hold-comments" class="btn-small" disabled>Hold Selected</button>
        </div>
      `;
      
      // Render comments by post
      Object.keys(commentsByPost).forEach(postId => {
        const postData = commentsByPost[postId];
        
        commentsHTML += `
          <div class="comment-post-section">
            <h3 class="comment-post-title">${postData.title}</h3>
            <div class="comment-list">
        `;
        
        postData.comments.forEach(comment => {
          const date = new Date(comment.createdAt).toLocaleDateString();
          const isReply = comment.parentId ? true : false;
          const status = comment.status || 'approved';
          const statusClass = `status-${status}`;
          
          commentsHTML += `
            <div class="admin-item comment-item ${isReply ? 'comment-reply' : ''} ${status !== 'approved' ? 'comment-held' : ''}">
              <div class="comment-checkbox-container">
                <input type="checkbox" class="comment-checkbox" data-id="${comment._id}">
              </div>
              <div class="admin-item-info">
                <div class="admin-item-title">
                  <span class="comment-username">${comment.username}</span>
                  ${isReply ? '<span class="reply-badge">Reply</span>' : ''}
                  <span class="status-badge ${statusClass}">${status}</span>
                </div>
                <div class="admin-item-meta">
                  Posted: ${date}
                </div>
                <div class="comment-content">${comment.content}</div>
              </div>
              <div class="admin-item-actions">
                ${status === 'approved' ? 
                  `<button class="btn-small" onclick="holdComment('${comment._id}')">Hold</button>` : 
                  `<button class="btn-small" onclick="approveComment('${comment._id}')">Approve</button>`
                }
                <button class="btn-small" onclick="blockUser('${comment.userId}')">Block User</button>
                <button class="delete-btn" onclick="deleteComment('${comment._id}')">Delete</button>
              </div>
            </div>
          `;
        });
        
        commentsHTML += `
            </div>
          </div>
        `;
      });
      
      commentsList.innerHTML = commentsHTML;
      
      // Add event listeners for bulk actions
      document.getElementById('select-all-comments').addEventListener('click', selectAllComments);
      document.getElementById('deselect-all-comments').addEventListener('click', deselectAllComments);
      document.getElementById('bulk-delete-comments').addEventListener('click', bulkDeleteComments);
      document.getElementById('bulk-approve-comments').addEventListener('click', bulkApproveComments);
      document.getElementById('bulk-hold-comments').addEventListener('click', bulkHoldComments);
      
      // Add event listeners for checkboxes
      document.querySelectorAll('.comment-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateBulkActionButtons);
      });
    } catch (error) {
      console.error('Error fetching comments:', error);
      commentsList.innerHTML = '<div class="error-message">Failed to load comments.</div>';
    }
  };

  // Fetch reports list
  const fetchReports = async () => {
    try {
      const status = reportStatusFilter.value;
      const type = reportTypeFilter.value;
      
      let url = '/admin/api/reports';
      const params = new URLSearchParams();
      
      if (status !== 'all') params.append('status', status);
      if (type !== 'all') params.append('type', type);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      reportsList.innerHTML = '<div class="loading">Loading...</div>';
      
      const response = await fetch(url, {
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      
      const reports = await response.json();
      
      if (reports.length === 0) {
        reportsList.innerHTML = '<div class="empty-state">No reports found.</div>';
        return;
      }
      
      let reportsHTML = '';
      reports.forEach(report => {
        const date = new Date(report.createdAt).toLocaleDateString();
        const statusClass = `status-${report.status}`;
        
        reportsHTML += `
          <div class="admin-item">
            <div class="admin-item-info">
              <h3 class="admin-item-title">
                ${report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report: 
                ${report.targetTitle}
              </h3>
              <div class="admin-item-meta">
                Reported by: ${report.reporter.username} | Date: ${date} |
                <span class="status-badge ${statusClass}">${report.status}</span>
              </div>
              <div class="report-reason">
                <strong>Reason:</strong> ${report.reason}
              </div>
            </div>
            <div class="admin-item-actions">
              <button class="btn-small" onclick="viewReportedItem('${report.targetId}', '${report.type}')">View Item</button>
              ${report.status === 'pending' ? `
                <button class="btn-small" onclick="resolveReport('${report._id}')">Resolve</button>
                <button class="btn-small" onclick="dismissReport('${report._id}')">Dismiss</button>
              ` : ''}
            </div>
          </div>
        `;
      });
      
      reportsList.innerHTML = reportsHTML;
    } catch (error) {
      console.error('Error fetching reports:', error);
      reportsList.innerHTML = '<div class="error-message">Failed to load reports.</div>';
    }
  };

  // Select all comments
  const selectAllComments = () => {
    document.querySelectorAll('.comment-checkbox').forEach(checkbox => {
      checkbox.checked = true;
    });
    updateBulkActionButtons();
  };

  // Deselect all comments
  const deselectAllComments = () => {
    document.querySelectorAll('.comment-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
    updateBulkActionButtons();
  };

  // Update bulk action buttons based on selection
  const updateBulkActionButtons = () => {
    const selectedCount = document.querySelectorAll('.comment-checkbox:checked').length;
    const bulkDeleteBtn = document.getElementById('bulk-delete-comments');
    const bulkApproveBtn = document.getElementById('bulk-approve-comments');
    const bulkHoldBtn = document.getElementById('bulk-hold-comments');
    
    if (selectedCount > 0) {
      bulkDeleteBtn.removeAttribute('disabled');
      bulkApproveBtn.removeAttribute('disabled');
      bulkHoldBtn.removeAttribute('disabled');
    } else {
      bulkDeleteBtn.setAttribute('disabled', 'disabled');
      bulkApproveBtn.setAttribute('disabled', 'disabled');
      bulkHoldBtn.setAttribute('disabled', 'disabled');
    }
  };

  // Bulk delete comments
  const bulkDeleteComments = async () => {
    const selectedComments = Array.from(document.querySelectorAll('.comment-checkbox:checked'))
      .map(checkbox => checkbox.dataset.id);
    
    if (selectedComments.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedComments.length} comments? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch('/admin/api/comments/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': adminToken
        },
        body: JSON.stringify({ ids: selectedComments })
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete comments');
      }
      
      fetchComments();
    } catch (error) {
      console.error('Error deleting comments:', error);
      alert('Failed to delete comments');
    }
  };

  // Bulk approve comments
  const bulkApproveComments = async () => {
    const selectedComments = Array.from(document.querySelectorAll('.comment-checkbox:checked'))
      .map(checkbox => checkbox.dataset.id);
    
    if (selectedComments.length === 0) return;
    
    try {
      const response = await fetch('/admin/api/comments/bulk-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': adminToken
        },
        body: JSON.stringify({ 
          ids: selectedComments,
          status: 'approved'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve comments');
      }
      
      fetchComments();
    } catch (error) {
      console.error('Error approving comments:', error);
      alert('Failed to approve comments');
    }
  };

  // Bulk hold comments
  const bulkHoldComments = async () => {
    const selectedComments = Array.from(document.querySelectorAll('.comment-checkbox:checked'))
      .map(checkbox => checkbox.dataset.id);
    
    if (selectedComments.length === 0) return;
    
    try {
      const response = await fetch('/admin/api/comments/bulk-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': adminToken
        },
        body: JSON.stringify({ 
          ids: selectedComments,
          status: 'held'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to hold comments');
      }
      
      fetchComments();
    } catch (error) {
      console.error('Error holding comments:', error);
      alert('Failed to hold comments');
    }
  };

  // Show add notice form
  if (addNoticeBtn) {
    addNoticeBtn.addEventListener('click', () => {
      document.getElementById('notice-form-title').textContent = 'Add New Notice';
      document.getElementById('notice-id').value = '';
      noticeForm.reset();
      document.getElementById('notice-active').checked = true;
      noticeFormContainer.classList.remove('hidden');
    });
  }

  // Hide notice form
  if (cancelNoticeBtn) {
    cancelNoticeBtn.addEventListener('click', () => {
      noticeFormContainer.classList.add('hidden');
    });
  }

  // Handle notice form submission
  if (noticeForm) {
    noticeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const noticeId = document.getElementById('notice-id').value;
      const content = document.getElementById('notice-content').value.trim();
      const active = document.getElementById('notice-active').checked;
      
      // Create notice object
      const noticeData = {
        content,
        active
      };
      
      try {
        let response;
        
        if (noticeId) {
          // Update existing notice
          response = await fetch(`/admin/api/notices/${noticeId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': adminToken
            },
            body: JSON.stringify(noticeData)
          });
        } else {
          // Add new notice
          response = await fetch('/admin/api/notices', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': adminToken
            },
            body: JSON.stringify(noticeData)
          });
        }
        
        if (!response.ok) {
          throw new Error('Failed to save notice');
        }
        
        // Hide form and refresh list
        noticeFormContainer.classList.add('hidden');
        fetchNotices();
      } catch (error) {
        console.error('Error saving notice:', error);
        alert('Failed to save notice. Please try again.');
      }
    });
  }

  // Filter event listeners
  if (postStatusFilter) postStatusFilter.addEventListener('change', fetchPosts);
  if (postCategoryFilter) postCategoryFilter.addEventListener('change', fetchPosts);
  if (postSearch) postSearch.addEventListener('input', debounce(fetchPosts, 500));
  if (userStatusFilter) userStatusFilter.addEventListener('change', fetchUsers);
  if (userSearch) userSearch.addEventListener('input', debounce(fetchUsers, 500));
  if (commentStatusFilter) commentStatusFilter.addEventListener('change', fetchComments);
  if (commentPostFilter) commentPostFilter.addEventListener('change', fetchComments);
  if (commentSearch) commentSearch.addEventListener('input', debounce(fetchComments, 500));
  if (reportStatusFilter) reportStatusFilter.addEventListener('change', fetchReports);
  if (reportTypeFilter) reportTypeFilter.addEventListener('change', fetchReports);

  // Utility function for debouncing
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  // Admin action functions
  window.viewPost = async (id) => {
    try {
      const response = await fetch(`/admin/api/posts/${id}`, {
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch post details');
      }
      
      const post = await response.json();
      window.open(`/post/${post.slug}`, '_blank');
    } catch (error) {
      console.error('Error viewing post:', error);
      alert('Failed to open post');
    }
  };

  window.holdPost = async (id) => {
    try {
      const response = await fetch(`/admin/api/posts/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': adminToken
        },
        body: JSON.stringify({ status: 'held' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update post status');
      }
      
      fetchPosts();
    } catch (error) {
      console.error('Error updating post status:', error);
      alert('Failed to update post status');
    }
  };

  window.approvePost = async (id) => {
    try {
      const response = await fetch(`/admin/api/posts/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': adminToken
        },
        body: JSON.stringify({ status: 'active' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update post status');
      }
      
      fetchPosts();
    } catch (error) {
      console.error('Error updating post status:', error);
      alert('Failed to update post status');
    }
  };

  window.deletePost = async (id) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/admin/api/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete post');
      }
      
      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };


  // And replace it with:
  window.viewUserProfile = async (id) => {
    try {
      // Fetch the user's username first
      const response = await fetch(`/admin/api/users/${id}`, {
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }
      
      const user = await response.json();
      window.open(`/user/${user.username}`, '_blank');
    } catch (error) {
      console.error('Error viewing user profile:', error);
      alert('Failed to open user profile');
    }
  };
  window.blockUser = async (id) => {
    if (!confirm('Are you sure you want to block this user?')) {
      return;
    }
    
    try {
      const response = await fetch(`/admin/api/users/${id}/block`, {
        method: 'PUT',
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to block user');
      }
      
      fetchUsers();
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Failed to block user');
    }
  };

  window.unblockUser = async (id) => {
    try {
      const response = await fetch(`/admin/api/users/${id}/unblock`, {
        method: 'PUT',
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to unblock user');
      }
      
      fetchUsers();
    } catch (error) {
      console.error('Error unblocking user:', error);
      alert('Failed to unblock user');
    }
  };

  window.editNotice = async (id) => {
    try {
      const response = await fetch(`/admin/api/notices`, {
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      const notices = await response.json();
      const notice = notices.find(n => n._id === id);
      
      if (!notice) {
        throw new Error('Notice not found');
      }
      
      // Set form title
      document.getElementById('notice-form-title').textContent = 'Edit Notice';
      
      // Fill form fields
      document.getElementById('notice-id').value = notice._id;
      document.getElementById('notice-content').value = notice.content;
      document.getElementById('notice-active').checked = notice.active;
      
      // Show form
      noticeFormContainer.classList.remove('hidden');
    } catch (error) {
      console.error('Error fetching notice details:', error);
      alert('Failed to load notice details');
    }
  };

  window.toggleNotice = async (id, active) => {
    try {
      const response = await fetch(`/admin/api/notices/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': adminToken
        },
        body: JSON.stringify({ active })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update notice');
      }
      
      fetchNotices();
    } catch (error) {
      console.error('Error updating notice:', error);
      alert('Failed to update notice');
    }
  };

  window.deleteNotice = async (id) => {
    if (!confirm('Are you sure you want to delete this notice?')) {
      return;
    }
    
    try {
      const response = await fetch(`/admin/api/notices/${id}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete notice');
      }
      
      fetchNotices();
    } catch (error) {
      console.error('Error deleting notice:', error);
      alert('Failed to delete notice');
    }
  };

  window.deleteComment = async (id) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    
    try {
      const response = await fetch(`/admin/api/comments/${id}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }
      
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
  };


  window.holdComment = async (id) => {
    try {
      const response = await fetch(`/admin/api/comments/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': adminToken
        },
        body: JSON.stringify({ status: 'held' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to hold comment');
      }
      
      fetchComments();
    } catch (error) {
      console.error('Error holding comment:', error);
      alert('Failed to hold comment');
    }
  };

  window.approveComment = async (id) => {
    try {
      const response = await fetch(`/admin/api/comments/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': adminToken
        },
        body: JSON.stringify({ status: 'approved' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve comment');
      }
      
      fetchComments();
    } catch (error) {
      console.error('Error approving comment:', error);
      alert('Failed to approve comment');
    }
  };

  window.viewReportedItem = async (id, type) => {
    try {
      if (type === 'post') {
        // Fetch the post first to get its slug
        const response = await fetch(`/admin/api/posts/${id}`, {
          headers: {
            'x-auth-token': adminToken
          }
        });
        
        if (response.ok) {
          const post = await response.json();
          window.open(`/post/${post.slug}`, '_blank');
        } else {
          throw new Error('Failed to fetch post');
        }
      } else if (type === 'comment') {
        // Fetch the comment to get its post ID
        const response = await fetch(`/admin/api/comments/${id}`, {
          headers: {
            'x-auth-token': adminToken
          }
        });
        
        if (response.ok) {
          const comment = await response.json();
          // Fetch the post to get its slug
          const postResponse = await fetch(`/admin/api/posts/${comment.postId._id}`, {
            headers: {
              'x-auth-token': adminToken
            }
          });
          
          if (postResponse.ok) {
            const post = await postResponse.json();
            window.open(`/post/${post.slug}#comment-${id}`, '_blank');
          } else {
            throw new Error('Failed to fetch post for comment');
          }
        } else {
          throw new Error('Failed to fetch comment');
        }
      } else if (type === 'user') {
        // Fetch the user to get their username
        const response = await fetch(`/admin/api/users/${id}`, {
          headers: {
            'x-auth-token': adminToken
          }
        });
        
        if (response.ok) {
          const user = await response.json();
          window.open(`/user/${user.username}`, '_blank');
        } else {
          throw new Error('Failed to fetch user');
        }
      }
    } catch (error) {
      console.error('Error viewing reported item:', error);
      alert('Failed to view item: ' + error.message);
    }
  };

  window.resolveReport = async (id) => {
    try {
      const response = await fetch(`/admin/api/reports/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': adminToken
        },
        body: JSON.stringify({ status: 'resolved' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to resolve report');
      }
      
      fetchReports();
    } catch (error) {
      console.error('Error resolving report:', error);
      alert('Failed to resolve report');
    }
  };

  window.dismissReport = async (id) => {
    try {
      const response = await fetch(`/admin/api/reports/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': adminToken
        },
        body: JSON.stringify({ status: 'dismissed' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to dismiss report');
      }
      
      fetchReports();
    } catch (error) {
      console.error('Error dismissing report:', error);
      alert('Failed to dismiss report');
    }
  };

  // Initialize page - start with posts section
  fetchPosts();
});