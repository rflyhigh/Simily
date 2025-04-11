// FILE: /public/js/mod.js
document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const modNav = document.getElementById('mod-nav');
  const postsSection = document.getElementById('posts-section');
  const usersSection = document.getElementById('users-section');
  const noticesSection = document.getElementById('notices-section');
  const commentsSection = document.getElementById('comments-section');
  const reportsSection = document.getElementById('reports-section');
  const linkReportsSection = document.getElementById('link-reports-section');
  const suggestionsSection = document.getElementById('suggestions-section');
  const promoteSection = document.getElementById('promote-section');
  const noticeForm = document.getElementById('notice-form');
  const addNoticeBtn = document.getElementById('add-notice-btn');
  const cancelNoticeBtn = document.getElementById('cancel-notice-btn');
  const noticeFormContainer = document.getElementById('notice-form-container');
  const noticeList = document.getElementById('notice-list');
  const postsList = document.getElementById('posts-list');
  const usersList = document.getElementById('users-list');
  const commentsList = document.getElementById('comments-list');
  const reportsList = document.getElementById('reports-list');
  const linkReportsList = document.getElementById('link-reports-list');
  const suggestionsList = document.getElementById('suggestions-list');
  const promoteUsersList = document.getElementById('promote-users-list');
  const promoteForm = document.getElementById('promote-form');
  const promoteFormContainer = document.getElementById('promote-form-container');
  const cancelPromoteBtn = document.getElementById('cancel-promote-btn');
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
  const linkReportStatusFilter = document.getElementById('link-report-status-filter');
  const suggestionStatusFilter = document.getElementById('suggestion-status-filter');
  const promoteSearch = document.getElementById('promote-search');

  // User data and permissions
  let userData = null;
  let userPermissions = null;

  // Check if user is logged in and is a mod
  const checkModAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        window.location.href = '/mod/login';
        return;
      }
      
      const response = await fetch('/mod/check', {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        localStorage.removeItem('token');
        window.location.href = '/mod/login';
        return;
      }
      
      const data = await response.json();
      
      if (!data.isMod) {
        localStorage.removeItem('token');
        window.location.href = '/mod/login';
        return;
      }
      
      userPermissions = data.permissions;
      
      // Get user data
      const userResponse = await fetch('/api/auth/user', {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      userData = await userResponse.json();
      
      // Setup navigation based on permissions
      setupModNavigation();
      
      return true;
    } catch (error) {
      console.error('Mod auth check error:', error);
      localStorage.removeItem('token');
      window.location.href = '/mod/login';
      return false;
    }
  };

  // Setup mod navigation based on permissions
  const setupModNavigation = () => {
    let navHTML = '';
    
    // Posts section
    if (userPermissions.deletePosts) {
      navHTML += `<button class="nav-btn active" data-section="posts">Manage Posts</button>`;
    }
    
    // Users section
    if (userPermissions.deleteUsers) {
      navHTML += `<button class="nav-btn" data-section="users">Manage Users</button>`;
    }
    
    // Comments section
    if (userPermissions.deleteComments) {
      navHTML += `<button class="nav-btn" data-section="comments">Manage Comments</button>`;
    }
    
    // Reports section
    if (userPermissions.viewReports) {
      navHTML += `<button class="nav-btn" data-section="reports">Review Reports</button>`;
      navHTML += `<button class="nav-btn" data-section="link-reports">Review Link Reports</button>`;
    }
    
    // Suggestions section
    if (userPermissions.editPosts) {
      navHTML += `<button class="nav-btn" data-section="suggestions">Review Suggestions</button>`;
    }
    
    // Notices section (all mods can manage notices)
    navHTML += `<button class="nav-btn" data-section="notices">Manage Notices</button>`;
    
    // Promote section
    if (userPermissions.promoteMods) {
      navHTML += `<button class="nav-btn" data-section="promote">Manage Moderators</button>`;
    }
    
    modNav.innerHTML = navHTML;
    
    // Add event listeners to nav buttons
    document.querySelectorAll('.nav-btn').forEach(button => {
      button.addEventListener('click', () => {
        const section = button.dataset.section;
        
        // Update active button
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Hide all sections
        postsSection.classList.add('hidden');
        usersSection.classList.add('hidden');
        noticesSection.classList.add('hidden');
        commentsSection.classList.add('hidden');
        reportsSection.classList.add('hidden');
        linkReportsSection.classList.add('hidden');
        suggestionsSection.classList.add('hidden');
        promoteSection.classList.add('hidden');
        
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
        } else if (section === 'link-reports') {
          linkReportsSection.classList.remove('hidden');
          fetchLinkReports();
        } else if (section === 'suggestions') {
          suggestionsSection.classList.remove('hidden');
          fetchSuggestions();
        } else if (section === 'promote') {
          promoteSection.classList.remove('hidden');
          fetchUsersForPromotion();
        }
      });
    });
  };

  // Handle logout
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  });

  // Fetch posts list
  const fetchPosts = async () => {
    try {
      const status = postStatusFilter.value;
      const category = postCategoryFilter.value;
      const searchQuery = postSearch.value.trim();
      
      let url = '/mod/api/posts';
      const params = new URLSearchParams();
      
      if (status !== 'all') params.append('status', status);
      if (category !== 'all') params.append('category', category);
      if (searchQuery) params.append('search', searchQuery);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      postsList.innerHTML = '<div class="loading">Loading...</div>';
      
      const response = await fetch(url, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
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
        
        // Check if post author is a mod
        const modBadge = post.author.isMod ? '<span class="mod-badge">MOD</span> ' : '';
        
        postsHTML += `
          <div class="admin-item">
            <div class="admin-item-info">
              <h3 class="admin-item-title">${post.title}</h3>
              <div class="admin-item-meta">
                By: ${modBadge}${post.author.username} | Added: ${date} | Views: ${post.views} | 
                Upvotes: ${post.upvotes} | Downvotes: ${post.downvotes} |
                <span class="status-badge ${statusClass}">${post.status}</span>
              </div>
            </div>
            <div class="admin-item-actions">
              <button class="btn-small" onclick="viewPost('${post._id}')">View</button>
              ${userPermissions.editPosts ? `<button class="btn-small" onclick="editPost('${post._id}')">Edit</button>` : ''}
              ${userPermissions.deletePosts ? 
                (post.status === 'active' ? 
                  `<button class="btn-small" onclick="holdPost('${post._id}')">Hold</button>` : 
                  post.status === 'held' ? 
                  `<button class="btn-small" onclick="approvePost('${post._id}')">Approve</button>` : '') : ''}
              ${userPermissions.deletePosts ? `<button class="delete-btn" onclick="deletePost('${post._id}')">Delete</button>` : ''}
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
      
      let url = '/mod/api/users';
      const params = new URLSearchParams();
      
      if (status !== 'all') params.append('status', status);
      if (searchQuery) params.append('search', searchQuery);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      usersList.innerHTML = '<div class="loading">Loading...</div>';
      
      const response = await fetch(url, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
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
        const modBadge = user.isMod ? '<span class="mod-badge">MOD</span> ' : '';
        
        usersHTML += `
          <div class="admin-item">
            <div class="admin-item-info">
              <h3 class="admin-item-title">${modBadge}${user.username}</h3>
              <div class="admin-item-meta">
                Joined: ${joinDate} | Posts: ${user.postCount} | Comments: ${user.commentCount} | 
                Reputation: ${user.reputation} |
                <span class="status-badge ${statusClass}">${user.status}</span>
              </div>
            </div>
            <div class="admin-item-actions">
              <button class="btn-small" onclick="viewUserProfile('${user.username}')">View Profile</button>
              ${userPermissions.deleteUsers && !user.isMod ? 
                (user.status === 'active' ? 
                  `<button class="btn-small" onclick="blockUser('${user._id}')">Block</button>` : 
                  `<button class="btn-small" onclick="unblockUser('${user._id}')">Unblock</button>`) : ''}
              ${userPermissions.promoteMods && !user.isMod ? 
                `<button class="btn-small" onclick="promoteUser('${user._id}', '${user.username}')">Promote to Mod</button>` : ''}
              ${userPermissions.promoteMods && user.isMod && user._id !== userData._id ? 
                `<button class="btn-small" onclick="demoteUser('${user._id}')">Remove Mod Status</button>` : ''}
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
      
      const response = await fetch('/mod/api/notices', {
        headers: {
          'x-auth-token': localStorage.getItem('token')
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
      const response = await fetch('/mod/api/posts', {
        headers: {
          'x-auth-token': localStorage.getItem('token')
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
      
      let url = '/mod/api/comments';
      const params = new URLSearchParams();
      
      if (status !== 'all') params.append('status', status);
      if (postId) params.append('postId', postId);
      if (searchQuery) params.append('search', searchQuery);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      commentsList.innerHTML = '<div class="loading">Loading...</div>';
      
      const response = await fetch(url, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
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
          
          // Check if comment author is a mod
          const modBadge = comment.userId && comment.userId.isMod ? '<span class="mod-badge">MOD</span> ' : '';
          
          commentsHTML += `
            <div class="admin-item comment-item ${isReply ? 'comment-reply' : ''} ${status !== 'approved' ? 'comment-held' : ''}">
              <div class="comment-checkbox-container">
                <input type="checkbox" class="comment-checkbox" data-id="${comment._id}">
              </div>
              <div class="admin-item-info">
                <div class="admin-item-title">
                  <span class="comment-username">${modBadge}${comment.username}</span>
                  ${isReply ? '<span class="reply-badge">Reply</span>' : ''}
                  <span class="status-badge ${statusClass}">${status}</span>
                </div>
                <div class="admin-item-meta">
                  Posted: ${date} | Upvotes: ${comment.upvotes} | Downvotes: ${comment.downvotes}
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
      
      let url = '/mod/api/reports';
      const params = new URLSearchParams();
      
      if (status !== 'all') params.append('status', status);
      if (type !== 'all') params.append('type', type);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      reportsList.innerHTML = '<div class="loading">Loading...</div>';
      
      const response = await fetch(url, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
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
              ${userPermissions.resolveReports && report.status === 'pending' ? `
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

  const fetchLinkReports = async () => {
    try {
      const status = linkReportStatusFilter.value;
      
      let url = '/mod/api/link-reports';
      const params = new URLSearchParams();
      
      if (status !== 'all') params.append('status', status);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      linkReportsList.innerHTML = '<div class="loading">Loading...</div>';
      
      const response = await fetch(url, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch link reports');
      }
      
      const reports = await response.json();
      
      if (reports.length === 0) {
        linkReportsList.innerHTML = '<div class="empty-state">No link reports found.</div>';
        return;
      }
      
      let reportsHTML = '';
      reports.forEach(report => {
        const date = new Date(report.createdAt).toLocaleDateString();
        const statusClass = `status-${report.status}`;
        
        // Check if post and downloadGroups exist
        const post = report.postId;
        if (!post || !post.downloadGroups || !Array.isArray(post.downloadGroups)) {
          console.warn('Post or downloadGroups missing for report:', report._id);
          return; // Skip this report
        }
        
        // Get group and link information - safely
        const group = post.downloadGroups.length > report.groupIndex ? post.downloadGroups[report.groupIndex] : null;
        const link = group && group.links && group.links.length > report.linkIndex ? group.links[report.linkIndex] : null;
        
        if (!group || !link) {
          console.warn('Group or link not found for report:', report._id);
          return; // Skip this report
        }
        
        reportsHTML += `
          <div class="admin-item">
            <div class="admin-item-info">
              <h3 class="admin-item-title">
                Link Report: ${link.label} in ${group.name}
              </h3>
              <div class="admin-item-meta">
                Post: <a href="/post/${post.slug}" target="_blank">${post.title}</a> | 
                Reported by: ${report.reporter.username} | Date: ${date} |
                <span class="status-badge ${statusClass}">${report.status}</span>
              </div>
              <div class="report-details">
                <p><strong>URL:</strong> <a href="${link.url}" target="_blank">${link.url}</a></p>
                <p><strong>Reason:</strong> ${report.reason}</p>
              </div>
            </div>
            <div class="admin-item-actions">
              <a href="/post/${post.slug}" target="_blank" class="btn-small">View Post</a>
              ${userPermissions.resolveReports && report.status === 'pending' ? `
                <button class="btn-small" onclick="resolveLinkReport('${report._id}')">Resolve</button>
                <button class="btn-small" onclick="dismissLinkReport('${report._id}')">Dismiss</button>
              ` : ''}
            </div>
          </div>
        `;
      });
      
      linkReportsList.innerHTML = reportsHTML || '<div class="empty-state">No valid link reports found.</div>';
    } catch (error) {
      console.error('Error fetching link reports:', error);
      linkReportsList.innerHTML = '<div class="error-message">Failed to load link reports.</div>';
    }
  };

  // Fetch suggestions list
  const fetchSuggestions = async () => {
    try {
      const status = suggestionStatusFilter.value;
      
      let url = '/mod/api/suggestions';
      const params = new URLSearchParams();
      
      if (status !== 'all') params.append('status', status);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      suggestionsList.innerHTML = '<div class="loading">Loading...</div>';
      
      const response = await fetch(url, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      
      const suggestions = await response.json();
      
      if (suggestions.length === 0) {
        suggestionsList.innerHTML = '<div class="empty-state">No suggestions found.</div>';
        return;
      }
      
      let suggestionsHTML = '';
      suggestions.forEach(suggestion => {
        const date = new Date(suggestion.createdAt).toLocaleDateString();
        const statusClass = `status-${suggestion.status}`;
        const post = suggestion.postId;
        
        suggestionsHTML += `
          <div class="admin-item">
            <div class="admin-item-info">
              <h3 class="admin-item-title">
                Suggestion for: <a href="/post/${post.slug}" target="_blank">${post.title}</a>
              </h3>
              <div class="admin-item-meta">
                By: ${suggestion.suggestedBy.username} | Date: ${date} |
                <span class="status-badge ${statusClass}">${suggestion.status}</span> |
                Upvotes: ${suggestion.votes.up} | Downvotes: ${suggestion.votes.down}
              </div>
              <div class="suggestion-message">
                <strong>Message:</strong> ${suggestion.message}
              </div>
            </div>
            <div class="admin-item-actions">
              <a href="/post/${post.slug}" target="_blank" class="btn-small">View Post</a>
              ${userPermissions.editPosts && suggestion.status === 'pending' ? `
                <button class="btn-small" onclick="approveSuggestion('${suggestion._id}')">Approve</button>
                <button class="btn-small" onclick="rejectSuggestion('${suggestion._id}')">Reject</button>
              ` : ''}
            </div>
          </div>
        `;
      });
      
      suggestionsList.innerHTML = suggestionsHTML;
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      suggestionsList.innerHTML = '<div class="error-message">Failed to load suggestions.</div>';
    }
  };

  // Fetch users for promotion
  const fetchUsersForPromotion = async () => {
    try {
      const searchQuery = promoteSearch.value.trim();
      
      let url = '/mod/api/users';
      const params = new URLSearchParams();
      
      params.append('status', 'active'); // Only active users can be promoted
      if (searchQuery) params.append('search', searchQuery);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      promoteUsersList.innerHTML = '<div class="loading">Loading...</div>';
      
      const response = await fetch(url, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const users = await response.json();
      
      if (users.length === 0) {
        promoteUsersList.innerHTML = '<div class="empty-state">No users found.</div>';
        return;
      }
      
      let usersHTML = '';
      users.forEach(user => {
        const joinDate = new Date(user.createdAt).toLocaleDateString();
        const modBadge = user.isMod ? '<span class="mod-badge">MOD</span> ' : '';
        
        usersHTML += `
          <div class="admin-item">
            <div class="admin-item-info">
              <h3 class="admin-item-title">${modBadge}${user.username}</h3>
              <div class="admin-item-meta">
                Joined: ${joinDate} | Posts: ${user.postCount} | Comments: ${user.commentCount} | 
                Reputation: ${user.reputation}
              </div>
            </div>
            <div class="admin-item-actions">
              <button class="btn-small" onclick="viewUserProfile('${user.username}')">View Profile</button>
              ${!user.isMod ? 
                `<button class="btn-small" onclick="promoteUser('${user._id}', '${user.username}')">Promote to Mod</button>` : 
                user._id !== userData._id ? 
                `<button class="btn-small" onclick="demoteUser('${user._id}')">Remove Mod Status</button>` : ''}
            </div>
          </div>
        `;
      });
      
      promoteUsersList.innerHTML = usersHTML;
    } catch (error) {
      console.error('Error fetching users for promotion:', error);
      promoteUsersList.innerHTML = '<div class="error-message">Failed to load users.</div>';
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
      const response = await fetch('/mod/api/comments/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ ids: selectedComments })
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete comments');
      }
      
      showNotification('success', `${selectedComments.length} comments deleted successfully`);
      fetchComments();
    } catch (error) {
      console.error('Error deleting comments:', error);
      showNotification('error', 'Failed to delete comments');
    }
  };

  // Bulk approve comments
  const bulkApproveComments = async () => {
    const selectedComments = Array.from(document.querySelectorAll('.comment-checkbox:checked'))
      .map(checkbox => checkbox.dataset.id);
    
    if (selectedComments.length === 0) return;
    
    try {
      const response = await fetch('/mod/api/comments/bulk-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ 
          ids: selectedComments,
          status: 'approved'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve comments');
      }
      
      showNotification('success', `${selectedComments.length} comments approved successfully`);
      fetchComments();
    } catch (error) {
      console.error('Error approving comments:', error);
      showNotification('error', 'Failed to approve comments');
    }
  };

  // Bulk hold comments
  const bulkHoldComments = async () => {
    const selectedComments = Array.from(document.querySelectorAll('.comment-checkbox:checked'))
      .map(checkbox => checkbox.dataset.id);
    
    if (selectedComments.length === 0) return;
    
    try {
      const response = await fetch('/mod/api/comments/bulk-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ 
          ids: selectedComments,
          status: 'held'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to hold comments');
      }
      
      showNotification('success', `${selectedComments.length} comments held successfully`);
      fetchComments();
    } catch (error) {
      console.error('Error holding comments:', error);
      showNotification('error', 'Failed to hold comments');
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
          response = await fetch(`/mod/api/notices/${noticeId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': localStorage.getItem('token')
            },
            body: JSON.stringify(noticeData)
          });
        } else {
          // Add new notice
          response = await fetch('/mod/api/notices', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': localStorage.getItem('token')
            },
            body: JSON.stringify(noticeData)
          });
        }
        
        if (!response.ok) {
          throw new Error('Failed to save notice');
        }
        
        // Hide form and refresh list
        noticeFormContainer.classList.add('hidden');
        showNotification('success', noticeId ? 'Notice updated successfully' : 'Notice added successfully');
        fetchNotices();
      } catch (error) {
        console.error('Error saving notice:', error);
        showNotification('error', 'Failed to save notice');
      }
    });
  }

  // Show promote user form
  window.promoteUser = function(userId, username) {
    try {
      // Find and click the Manage Moderators tab button
      const promoteTabButton = document.querySelector('.nav-btn[data-section="promote"]');
      if (promoteTabButton) {
        promoteTabButton.click();
        
        // No need to try to find the specific user element - just show a notification
        showNotification('info', `Switched to Manage Moderators tab. Find ${username} in the list and set their permissions.`);
      } else {
        console.error('Manage Moderators tab button not found');
        alert('Could not find the Manage Moderators tab. Please navigate to it manually.');
      }
    } catch (error) {
      console.error('Error switching to Manage Moderators tab:', error);
      alert('An error occurred while trying to switch tabs.');
    }
  };
  

  // Hide promote form
  if (cancelPromoteBtn) {
    cancelPromoteBtn.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent any default action
      const formContainer = document.getElementById('promote-form-container');
      if (formContainer) {
        formContainer.classList.add('hidden');
        formContainer.style.display = 'none';
        console.log('Promotion form hidden'); // Debug log
      } else {
        console.error('Promotion form container not found');
      }
    });
  }

  // Handle promote form submission
  if (promoteForm) {
    promoteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const userId = document.getElementById('promote-user-id').value;
      
      // Get permissions
      const permissions = {
        deleteUsers: document.getElementById('perm-deleteUsers').checked,
        deletePosts: document.getElementById('perm-deletePosts').checked,
        deleteComments: document.getElementById('perm-deleteComments').checked,
        viewReports: document.getElementById('perm-viewReports').checked,
        resolveReports: document.getElementById('perm-resolveReports').checked,
        editPosts: document.getElementById('perm-editPosts').checked,
        promoteMods: document.getElementById('perm-promoteMods').checked
      };
      
      try {
        const response = await fetch(`/mod/api/users/${userId}/promote`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('token')
          },
          body: JSON.stringify({ permissions })
        });
        
        if (!response.ok) {
          throw new Error('Failed to promote user');
        }
        
        // Hide form and refresh list
        promoteFormContainer.classList.add('hidden');
        showNotification('success', 'User promoted to moderator successfully');
        fetchUsersForPromotion();
      } catch (error) {
        console.error('Error promoting user:', error);
        showNotification('error', 'Failed to promote user');
      }
    });
  }

  // Show notification
  const showNotification = (type, message) => {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.mod-notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `mod-notification ${type}`;
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
    document.querySelector('main').prepend(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.remove();
      }
    }, 5000);
  };

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
  if (linkReportStatusFilter) linkReportStatusFilter.addEventListener('change', fetchLinkReports);
  if (suggestionStatusFilter) suggestionStatusFilter.addEventListener('change', fetchSuggestions);
  if (promoteSearch) promoteSearch.addEventListener('input', debounce(fetchUsersForPromotion, 500));

  // Utility function for debouncing
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  window.viewPost = async (id) => {
    try {
      // First, get the post to get its slug
      const response = await fetch(`/mod/api/posts/${id}`, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch post details');
      }
      
      const post = await response.json();
      
      // Use the post slug to navigate to the post
      if (post && post.slug) {
        window.open(`/post/${post.slug}`, '_blank');
      } else {
        throw new Error('Post slug not found');
      }
    } catch (error) {
      console.error('Error viewing post:', error);
      showNotification('error', 'Failed to view post: ' + error.message);
    }
  };

  window.editPost = async (id) => {
    window.open(`/upload?edit=${id}`, '_blank');
  };

  window.holdPost = async (id) => {
    try {
      const response = await fetch(`/mod/api/posts/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ status: 'held' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update post status');
      }
      
      showNotification('success', 'Post has been held for review');
      fetchPosts();
    } catch (error) {
      console.error('Error updating post status:', error);
      showNotification('error', 'Failed to update post status');
    }
  };

  window.approvePost = async (id) => {
    try {
      const response = await fetch(`/mod/api/posts/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ status: 'active' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update post status');
      }
      
      showNotification('success', 'Post has been approved');
      fetchPosts();
    } catch (error) {
      console.error('Error updating post status:', error);
      showNotification('error', 'Failed to update post status');
    }
  };

  window.deletePost = async (id) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/mod/api/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete post');
      }
      
      showNotification('success', 'Post deleted successfully');
      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      showNotification('error', 'Failed to delete post');
    }
  };

  window.viewUserProfile = (username) => {
    window.open(`/user/${username}`, '_blank');
  };

  window.blockUser = async (id) => {
    if (!confirm('Are you sure you want to block this user?')) {
      return;
    }
    
    try {
      const response = await fetch(`/mod/api/users/${id}/block`, {
        method: 'PUT',
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to block user');
      }
      
      showNotification('success', 'User blocked successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error blocking user:', error);
      showNotification('error', 'Failed to block user');
    }
  };

  window.unblockUser = async (id) => {
    try {
      const response = await fetch(`/mod/api/users/${id}/unblock`, {
        method: 'PUT',
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to unblock user');
      }
      
      showNotification('success', 'User unblocked successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error unblocking user:', error);
      showNotification('error', 'Failed to unblock user');
    }
  };

  window.demoteUser = async (id) => {
    if (!confirm('Are you sure you want to remove moderator status from this user?')) {
      return;
    }
    
    try {
      const response = await fetch(`/mod/api/users/${id}/demote`, {
        method: 'PUT',
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to demote moderator');
      }
      
      showNotification('success', 'Moderator status removed successfully');
      fetchUsers();
      fetchUsersForPromotion();
    } catch (error) {
      console.error('Error demoting moderator:', error);
      showNotification('error', 'Failed to remove moderator status');
    }
  };

  window.editNotice = async (id) => {
    try {
      const response = await fetch(`/mod/api/notices`, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
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
      showNotification('error', 'Failed to load notice details');
    }
  };

  window.toggleNotice = async (id, active) => {
    try {
      const response = await fetch(`/mod/api/notices/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ active })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update notice');
      }
      
      showNotification('success', active ? 'Notice activated' : 'Notice deactivated');
      fetchNotices();
    } catch (error) {
      console.error('Error updating notice:', error);
      showNotification('error', 'Failed to update notice');
    }
  };

  window.deleteNotice = async (id) => {
    if (!confirm('Are you sure you want to delete this notice?')) {
      return;
    }
    
    try {
      const response = await fetch(`/mod/api/notices/${id}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete notice');
      }
      
      showNotification('success', 'Notice deleted successfully');
      fetchNotices();
    } catch (error) {
      console.error('Error deleting notice:', error);
      showNotification('error', 'Failed to delete notice');
    }
  };

  window.deleteComment = async (id) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    
    try {
      const response = await fetch(`/mod/api/comments/${id}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }
      
      showNotification('success', 'Comment deleted successfully');
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      showNotification('error', 'Failed to delete comment');
    }
  };

  window.holdComment = async (id) => {
    try {
      const response = await fetch(`/mod/api/comments/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ status: 'held' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to hold comment');
      }
      
      showNotification('success', 'Comment held for review');
      fetchComments();
    } catch (error) {
      console.error('Error holding comment:', error);
      showNotification('error', 'Failed to hold comment');
    }
  };

  window.approveComment = async (id) => {
    try {
      const response = await fetch(`/mod/api/comments/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ status: 'approved' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve comment');
      }
      
      showNotification('success', 'Comment approved');
      fetchComments();
    } catch (error) {
      console.error('Error approving comment:', error);
      showNotification('error', 'Failed to approve comment');
    }
  };

  window.viewReportedItem = async (id, type) => {
    try {
      if (type === 'post') {
        // Fetch the post first to get its slug
        const response = await fetch(`/mod/api/posts/${id}`, {
          headers: {
            'x-auth-token': localStorage.getItem('token')
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
        const response = await fetch(`/mod/api/comments/${id}`, {
          headers: {
            'x-auth-token': localStorage.getItem('token')
          }
        });
        
        if (response.ok) {
          const comment = await response.json();
          // Fetch the post to get its slug
          const postResponse = await fetch(`/mod/api/posts/${comment.postId._id}`, {
            headers: {
              'x-auth-token': localStorage.getItem('token')
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
        const response = await fetch(`/mod/api/users/${id}`, {
          headers: {
            'x-auth-token': localStorage.getItem('token')
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
      showNotification('error', 'Failed to view item: ' + error.message);
    }
  };

  window.resolveReport = async (id) => {
    try {
      const response = await fetch(`/mod/api/reports/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ status: 'resolved' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to resolve report');
      }
      
      showNotification('success', 'Report marked as resolved');
      fetchReports();
    } catch (error) {
      console.error('Error resolving report:', error);
      showNotification('error', 'Failed to resolve report');
    }
  };

  window.dismissReport = async (id) => {
    try {
      const response = await fetch(`/mod/api/reports/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ status: 'dismissed' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to dismiss report');
      }
      
      showNotification('success', 'Report dismissed');
      fetchReports();
    } catch (error) {
      console.error('Error dismissing report:', error);
      showNotification('error', 'Failed to dismiss report');
    }
  };

  window.resolveLinkReport = async (id) => {
    try {
      const response = await fetch(`/mod/api/link-reports/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ status: 'resolved' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to resolve link report');
      }
      
      showNotification('success', 'Link report marked as resolved');
      fetchLinkReports();
    } catch (error) {
      console.error('Error resolving link report:', error);
      showNotification('error', 'Failed to resolve link report');
    }
  };

  window.dismissLinkReport = async (id) => {
    try {
      const response = await fetch(`/mod/api/link-reports/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ status: 'dismissed' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to dismiss link report');
      }
      
      showNotification('success', 'Link report dismissed');
      fetchLinkReports();
    } catch (error) {
      console.error('Error dismissing link report:', error);
      showNotification('error', 'Failed to dismiss link report');
    }
  };

  window.approveSuggestion = async (id) => {
    try {
      const response = await fetch(`/mod/api/suggestions/${id}/approve`, {
        method: 'PUT',
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve suggestion');
      }
      
      showNotification('success', 'Suggestion approved successfully');
      fetchSuggestions();
    } catch (error) {
      console.error('Error approving suggestion:', error);
      showNotification('error', 'Failed to approve suggestion');
    }
  };

  window.rejectSuggestion = async (id) => {
    try {
      const response = await fetch(`/mod/api/suggestions/${id}/reject`, {
        method: 'PUT',
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject suggestion');
      }
      
      showNotification('success', 'Suggestion rejected');
      fetchSuggestions();
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      showNotification('error', 'Failed to reject suggestion');
    }
  };

  // Initialize page
  checkModAuth().then(isAuth => {
    if (isAuth) {
      // Start with posts section if user has permission
      if (userPermissions.deletePosts) {
        fetchPosts();
      } else if (userPermissions.deleteUsers) {
        // Switch to users section if user can't manage posts
        document.querySelector('.nav-btn[data-section="users"]').click();
      } else if (userPermissions.deleteComments) {
        // Switch to comments section if user can't manage posts or users
        document.querySelector('.nav-btn[data-section="comments"]').click();
      } else {
        // Fall back to notices section
        document.querySelector('.nav-btn[data-section="notices"]').click();
      }
    }
  });
});