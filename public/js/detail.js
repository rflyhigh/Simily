// FILE: /public/js/detail.js
document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const postDetailSection = document.getElementById('post-detail');
  const postLogsSection = document.getElementById('post-logs-section');
  const commentFormContainer = document.getElementById('comment-form-container');
  const commentsList = document.getElementById('comments-list');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const navLinks = document.getElementById('nav-links');
  const pendingSuggestions = document.getElementById('pending-suggestions');
  const approvedSuggestions = document.getElementById('approved-suggestions');
  
  // Get post ID from URL
  const postSlug = window.location.pathname.split('/').pop();
  let postId = null;
  
  // User data
  let userData = null;
  
  // Track if we're replying to a comment
  let replyingToId = null;

  // Check if user is logged in
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        updateNavLinks(false);
        return false;
      }
      
      const response = await fetch('/api/auth/user', {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        localStorage.removeItem('token');
        updateNavLinks(false);
        return false;
      }
      
      userData = await response.json();
      updateNavLinks(true, userData);
      return true;
    } catch (error) {
      console.error('Auth check error:', error);
      updateNavLinks(false);
      return false;
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

  // Fetch and display post details
  const fetchPostDetails = async () => {
    try {
      postDetailSection.innerHTML = '<div class="loading">Loading...</div>';
      
      const response = await fetch(`/api/posts/${postSlug}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          window.location.href = '/404';
          return;
        }
        throw new Error('Failed to fetch post details');
      }
      
      const post = await response.json();
      postId = post._id;
      
      // Format tags
      const tagsHTML = post.tags.map(tag => 
        `<span class="detail-tag">${tag}</span>`
      ).join('');
      
      // Format download groups and links
      let downloadGroupsHTML = '';
      
      if (post.downloadGroups && post.downloadGroups.length > 0) {
        // Format with download groups
        downloadGroupsHTML = `
        <div class="download-groups">
          ${post.downloadGroups.map((group, groupIndex) => {
            // Create a string of all URLs for copy functionality
            const allUrls = group.links.map(link => link.url).join('\n');
            
            return `
            <div class="download-group" data-group-id="${groupIndex}">
              <div class="group-header" onclick="toggleGroup(${groupIndex})">
                <h4 class="download-group-name">${group.name}</h4>
                <button class="group-toggle" aria-label="Toggle group">▼</button>
              </div>
              <div class="download-links-container" id="group-${groupIndex}-links">
                <button class="copy-all-btn" onclick="copyAllLinks('${encodeURIComponent(allUrls)}', this)">
                  Copy all links to clipboard
                </button>
                <div class="download-links">
                  ${group.links.map((link, linkIndex) => `
                    <div class="download-link-container">
                      <a href="${link.url}" class="download-link" target="_blank" rel="noopener noreferrer" 
                      onclick="recordView('${post._id}')">${link.label}</a>
                      <button class="report-link-btn" onclick="reportLink('${post._id}', ${groupIndex}, ${linkIndex}, '${link.label}')" title="Report broken link">⚠️</button>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
            `;
          }).join('')}
        </div>
        `;
      }
      
      // Format date
      const createdDate = new Date(post.createdAt).toLocaleDateString();
      
      // Check if current user is the author
      const isAuthor = userData && post.author._id === userData._id;
      
      // Check if current user is a mod
      const isMod = userData && userData.isMod;
      
      // Create voting HTML
      const votingHTML = `
        <div class="voting-section">
          <button class="vote-btn upvote ${post.userVote === 'up' ? 'voted' : ''}" data-vote="up" onclick="votePost('${post._id}', 'up')">
            <span class="vote-icon">▲</span>
            <span class="vote-count">${post.upvotes}</span>
          </button>
          <button class="vote-btn downvote ${post.userVote === 'down' ? 'voted' : ''}" data-vote="down" onclick="votePost('${post._id}', 'down')">
            <span class="vote-icon">▼</span>
            <span class="vote-count">${post.downvotes}</span>
          </button>
        </div>
      `;
      
      // Create author actions HTML
      const authorActionsHTML = isAuthor || isMod ? `
        <div class="author-actions">
          <a href="/upload?edit=${post._id}" class="edit-btn">Edit</a>
          ${isAuthor ? `<button class="delete-btn" onclick="deletePost('${post._id}')">Delete</button>` : ''}
        </div>
      ` : '';
      
      // Create report button HTML
      const reportButtonHTML = userData && !isAuthor ? `
        <button class="report-btn" onclick="reportPost('${post._id}')">Report</button>
      ` : '';
      
      // Create suggest changes button HTML
      const suggestButtonHTML = userData && !isAuthor ? `
        <button class="suggest-btn" onclick="suggestChanges('${post._id}')">Suggest Changes</button>
      ` : '';
      
      // Create view logs button HTML
      const viewLogsButtonHTML = `
        <button class="view-logs-btn" onclick="togglePostLogs()">View Change Logs</button>
      `;
      
      // Show mod badge if author is a mod
      const modBadge = post.author.isMod ? '<span class="mod-badge">MOD</span> ' : '';
      
      // Render post details with new layout
      postDetailSection.innerHTML = `
        <div class="detail-image-container">
          <img src="${post.imageUrl}" alt="${post.title}" class="detail-image">
        </div>
        <div class="detail-content">
          <div class="detail-header">
            <h1 class="detail-title">${post.title}</h1>
            <div class="post-meta">
              <span class="post-author">Posted by: ${modBadge}<a href="/user/${post.author.username}">${post.author.username}</a></span>
              <span class="post-category">Category: ${post.category}</span>
            </div>
            <div class="detail-tags">
              ${tagsHTML}
            </div>
          </div>
          
          <div class="detail-actions">
            ${votingHTML}
            ${authorActionsHTML}
            ${reportButtonHTML}
            ${suggestButtonHTML}
            ${viewLogsButtonHTML}
          </div>
          
          <div class="detail-description">
            ${post.description}
          </div>
          
          <div class="download-section">
            <h3>Download Links</h3>
            ${downloadGroupsHTML}
            <div class="stats">
              <span>${post.views} views</span>
              <span>${post.upvotes - post.downvotes} points (${Math.round((post.upvotes / (post.upvotes + post.downvotes || 1)) * 100)}% upvoted)</span>
              <span>Added on ${createdDate}</span>
            </div>
          </div>
        </div>
      `;
      
      // Fetch post suggestions
      if (postId) {
        fetchPostSuggestions(postId);
      }
    } catch (error) {
      console.error('Error fetching post details:', error);
      postDetailSection.innerHTML = '<div class="error-message">Failed to load post details.</div>';
    }
  };

  // Fetch post suggestions
  const fetchPostSuggestions = async (postId) => {
    try {
      if (!userData) return; // Only fetch if user is logged in
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/suggestions/post/${postId}`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch post suggestions');
      }
      
      const suggestions = await response.json();
      
      // Render pending suggestions
      const pendingSugs = suggestions.filter(s => s.status === 'pending');
      if (pendingSugs.length > 0) {
        let pendingHTML = '';
        pendingSugs.forEach(suggestion => {
          const date = new Date(suggestion.createdAt).toLocaleDateString();
          
          pendingHTML += `
            <div class="suggestion-item">
              <div class="suggestion-header">
                <div class="suggestion-info">
                  <span class="suggestion-author">Suggested by: <a href="/user/${suggestion.suggestedBy.username}">${suggestion.suggestedBy.username}</a></span>
                  <span class="suggestion-date">Date: ${date}</span>
                </div>
                <div class="suggestion-votes">
                  <button class="vote-btn upvote" onclick="voteSuggestion('${suggestion._id}', 'up')">
                    <span class="vote-icon">▲</span>
                    <span class="vote-count">${suggestion.votes.up}</span>
                  </button>
                  <button class="vote-btn downvote" onclick="voteSuggestion('${suggestion._id}', 'down')">
                    <span class="vote-icon">▼</span>
                    <span class="vote-count">${suggestion.votes.down}</span>
                  </button>
                </div>
              </div>
              <div class="suggestion-message">
                <strong>Message:</strong> ${suggestion.message}
              </div>
              <div class="suggestion-changes">
                <h4>Changes:</h4>
                <ul>
                  ${suggestion.title !== post.title ? `<li><strong>Title:</strong> ${suggestion.title}</li>` : ''}
                  ${suggestion.category !== post.category ? `<li><strong>Category:</strong> ${suggestion.category}</li>` : ''}
                  ${suggestion.imageUrl !== post.imageUrl ? `<li><strong>Image URL:</strong> ${suggestion.imageUrl}</li>` : ''}
                  ${suggestion.tags.join(',') !== post.tags.join(',') ? `<li><strong>Tags:</strong> ${suggestion.tags.join(', ')}</li>` : ''}
                  ${suggestion.description !== post.description ? `<li><strong>Description:</strong> <span class="description-change">${suggestion.description}</span></li>` : ''}
                  <li><strong>Download Groups:</strong> ${suggestion.downloadGroups.length} groups with ${suggestion.downloadGroups.reduce((total, group) => total + group.links.length, 0)} links</li>
                </ul>
              </div>
              ${isAuthor || (userData && userData.isMod) ? `
                <div class="suggestion-actions">
                  <button class="approve-btn" onclick="approveSuggestion('${suggestion._id}')">Approve</button>
                  <button class="reject-btn" onclick="rejectSuggestion('${suggestion._id}')">Reject</button>
                </div>
              ` : ''}
            </div>
          `;
        });
        
        pendingSuggestions.innerHTML = pendingHTML;
      } else {
        pendingSuggestions.innerHTML = '<div class="empty-state">No pending suggestions for this post.</div>';
      }
      
      // Render approved suggestions
      const approvedSugs = suggestions.filter(s => s.status === 'approved');
      if (approvedSugs.length > 0) {
        let approvedHTML = '';
        approvedSugs.forEach(suggestion => {
          const date = new Date(suggestion.createdAt).toLocaleDateString();
          
          approvedHTML += `
            <div class="suggestion-item">
              <div class="suggestion-header">
                <div class="suggestion-info">
                  <span class="suggestion-author">Suggested by: <a href="/user/${suggestion.suggestedBy.username}">${suggestion.suggestedBy.username}</a></span>
                  <span class="suggestion-date">Date: ${date}</span>
                </div>
              </div>
              <div class="suggestion-message">
                <strong>Message:</strong> ${suggestion.message}
              </div>
              <div class="suggestion-changes">
                <h4>Changes:</h4>
                <ul>
                  ${suggestion.title !== post.title ? `<li><strong>Title:</strong> ${suggestion.title}</li>` : ''}
                  ${suggestion.category !== post.category ? `<li><strong>Category:</strong> ${suggestion.category}</li>` : ''}
                  ${suggestion.imageUrl !== post.imageUrl ? `<li><strong>Image URL:</strong> ${suggestion.imageUrl}</li>` : ''}
                  ${suggestion.tags.join(',') !== post.tags.join(',') ? `<li><strong>Tags:</strong> ${suggestion.tags.join(', ')}</li>` : ''}
                  ${suggestion.description !== post.description ? `<li><strong>Description:</strong> <span class="description-change">${suggestion.description}</span></li>` : ''}
                  <li><strong>Download Groups:</strong> ${suggestion.downloadGroups.length} groups with ${suggestion.downloadGroups.reduce((total, group) => total + group.links.length, 0)} links</li>
                </ul>
              </div>
            </div>
          `;
        });
        
        approvedSuggestions.innerHTML = approvedHTML;
      } else {
        approvedSuggestions.innerHTML = '<div class="empty-state">No approved changes for this post.</div>';
      }
      
      // Show logs section if there are any suggestions
      if (suggestions.length > 0) {
        postLogsSection.classList.remove('hidden');
      }
    } catch (error) {
      console.error('Error fetching post suggestions:', error);
    }
  };

  // Prepare comment form based on auth status
  const prepareCommentForm = (isLoggedIn) => {
    if (isLoggedIn) {
      commentFormContainer.innerHTML = `
        <div class="comment-form">
          <h3>Add a Comment</h3>
          <form id="comment-form">
            <div class="form-group">
              <label for="content">Comment</label>
              <textarea id="content" name="content" rows="4" required></textarea>
            </div>
            <button type="submit" class="btn">Post Comment</button>
          </form>
        </div>
      `;
      
      // Add event listener to comment form
      document.getElementById('comment-form').addEventListener('submit', handleCommentSubmit);
    } else {
      commentFormContainer.innerHTML = `
        <div class="login-to-comment">
          <p>Please <a href="/login">login</a> or <a href="/register">register</a> to comment.</p>
        </div>
      `;
    }
  };

  // Fetch comments
  const fetchComments = async () => {
    try {
      // First try to fetch comments using the slug/identifier from the URL
      let response = await fetch(`/api/posts/${postSlug}/comments`);
      
      // If that fails, it might be because we need the actual post ID
      if (!response.ok && postId) {
        // Try to get comments with the actual post ID
        response = await fetch(`/api/posts/${postId}/comments`);
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      
      const comments = await response.json();
      
      if (comments.length === 0) {
        commentsList.innerHTML = '<div class="empty-state">No comments yet. Be the first to comment!</div>';
        return;
      }
      
      let commentsHTML = '';
      
      // Render comments in Reddit-style threads
      comments.forEach(comment => {
        commentsHTML += renderCommentThread(comment);
      });
      
      commentsList.innerHTML = commentsHTML;
      
      // Add event listeners to reply buttons
      document.querySelectorAll('.reply-btn').forEach(button => {
        button.addEventListener('click', handleReplyButtonClick);
      });
      
      // Add event listeners to vote buttons
      document.querySelectorAll('.comment-vote-btn').forEach(button => {
        button.addEventListener('click', handleCommentVote);
      });
    } catch (error) {
      console.error('Error fetching comments:', error);
      commentsList.innerHTML = '<div class="error-message">Failed to load comments.</div>';
    }
  };
  
  // Render a comment thread (comment + its replies)
  const renderCommentThread = (comment) => {
    const date = new Date(comment.createdAt).toLocaleDateString();
    
    // Check if current user is the author
    const isAuthor = userData && comment.userId === userData._id;
    
    // Check if current user is a mod
    const isMod = userData && userData.isMod;
    
    // Create author actions HTML
    const authorActionsHTML = isAuthor || isMod ? `
      <button class="delete-comment-btn" onclick="deleteComment('${comment._id}')">Delete</button>
    ` : '';
    
    // Create report button HTML
    const reportButtonHTML = userData && !isAuthor ? `
      <button class="report-btn" onclick="reportComment('${comment._id}')">Report</button>
    ` : '';
    
    // Check if comment author is a mod
    const modBadge = comment.userId && comment.userId.isMod ? '<span class="mod-badge">MOD</span> ' : '';
    
    // Create voting HTML
    const votingHTML = userData ? `
      <div class="comment-voting">
        <button class="comment-vote-btn upvote ${comment.userVote === 'up' ? 'voted' : ''}" data-comment-id="${comment._id}" data-vote="up">
          <span class="vote-icon">▲</span>
        </button>
        <span class="vote-score">${comment.upvotes - comment.downvotes}</span>
        <button class="comment-vote-btn downvote ${comment.userVote === 'down' ? 'voted' : ''}" data-comment-id="${comment._id}" data-vote="down">
          <span class="vote-icon">▼</span>
        </button>
      </div>
    ` : '';
    
    let repliesHTML = '';
    if (comment.replies && comment.replies.length > 0) {
      repliesHTML = `
        <div class="replies">
          ${comment.replies.map(reply => renderReply(reply)).join('')}
        </div>
      `;
    }
    
    return `
      <div class="comment-thread" id="comment-${comment._id}">
        <div class="comment">
          <div class="comment-header">
            <span class="comment-username">${modBadge}<a href="/user/${comment.username}">${comment.username}</a></span>
            <span class="comment-date">${date}</span>
          </div>
          <div class="comment-content">
            ${comment.content}
          </div>
          <div class="comment-actions">
            ${votingHTML}
            ${userData ? `<button class="reply-btn" data-comment-id="${comment._id}">Reply</button>` : ''}
            ${authorActionsHTML}
            ${reportButtonHTML}
          </div>
          <div class="reply-form-container" id="reply-form-${comment._id}"></div>
        </div>
        ${repliesHTML}
      </div>
    `;
  };
  
  // Render a reply
  const renderReply = (reply) => {
    const date = new Date(reply.createdAt).toLocaleDateString();
    
    // Check if current user is the author
    const isAuthor = userData && reply.userId === userData._id;
    
    // Check if current user is a mod
    const isMod = userData && userData.isMod;
    
    // Create author actions HTML
    const authorActionsHTML = isAuthor || isMod ? `
      <button class="delete-comment-btn" onclick="deleteComment('${reply._id}')">Delete</button>
    ` : '';
    
    // Create report button HTML
    const reportButtonHTML = userData && !isAuthor ? `
      <button class="report-btn" onclick="reportComment('${reply._id}')">Report</button>
    ` : '';
    
    // Check if reply author is a mod
    const modBadge = reply.userId && reply.userId.isMod ? '<span class="mod-badge">MOD</span> ' : '';
    
    // Create voting HTML
    const votingHTML = userData ? `
      <div class="comment-voting">
        <button class="comment-vote-btn upvote ${reply.userVote === 'up' ? 'voted' : ''}" data-comment-id="${reply._id}" data-vote="up">
          <span class="vote-icon">▲</span>
        </button>
        <span class="vote-score">${reply.upvotes - reply.downvotes}</span>
        <button class="comment-vote-btn downvote ${reply.userVote === 'down' ? 'voted' : ''}" data-comment-id="${reply._id}" data-vote="down">
          <span class="vote-icon">▼</span>
        </button>
      </div>
    ` : '';
    
    return `
      <div class="reply" id="comment-${reply._id}">
        <div class="comment">
          <div class="comment-header">
            <span class="comment-username">${modBadge}<a href="/user/${reply.username}">${reply.username}</a></span>
            <span class="comment-date">${date}</span>
          </div>
          <div class="comment-content">
            ${reply.content}
          </div>
          <div class="comment-actions">
            ${votingHTML}
            ${userData ? `<button class="reply-btn" data-comment-id="${reply.parentId}">Reply</button>` : ''}
            ${authorActionsHTML}
            ${reportButtonHTML}
          </div>
        </div>
      </div>
    `;
  };
  
  // Handle reply button click
  const handleReplyButtonClick = (e) => {
    const commentId = e.target.dataset.commentId;
    const replyFormContainer = document.getElementById(`reply-form-${commentId}`);
    
    // If already replying to this comment, just toggle the form visibility
    if (replyFormContainer.innerHTML !== '') {
      replyFormContainer.innerHTML = '';
      replyingToId = null;
      return;
    }
    
    // Close any other open reply forms
    document.querySelectorAll('.reply-form-container').forEach(container => {
      container.innerHTML = '';
    });
    
    // Create and show the reply form
    replyFormContainer.innerHTML = `
      <div class="reply-form">
        <h4>Reply to comment</h4>
        <form id="reply-form-${commentId}">
          <div class="form-group">
            <label for="reply-content-${commentId}">Comment</label>
            <textarea id="reply-content-${commentId}" name="content" rows="3" required></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn">Post Reply</button>
            <button type="button" class="btn btn-secondary cancel-reply-btn">Cancel</button>
          </div>
        </form>
      </div>
    `;
    
    // Set current replying comment ID
    replyingToId = commentId;
    
    // Add event listeners to the new form
    const replyForm = document.getElementById(`reply-form-${commentId}`);
    replyForm.addEventListener('submit', handleReplySubmit);
    
    // Add cancel button event listener
    replyFormContainer.querySelector('.cancel-reply-btn').addEventListener('click', () => {
      replyFormContainer.innerHTML = '';
      replyingToId = null;
    });
  };

  // Handle comment vote
  const handleCommentVote = async (e) => {
    if (!userData) {
      alert('Please login to vote on comments');
      return;
    }
    
    const commentId = e.target.dataset.commentId || e.target.parentElement.dataset.commentId;
    const vote = e.target.dataset.vote || e.target.parentElement.dataset.vote;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/comments/${commentId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ vote })
      });
      
      if (!response.ok) {
        throw new Error('Failed to vote on comment');
      }
      
      const data = await response.json();
      
      // Update UI
      const commentVoting = e.target.closest('.comment-voting');
      const upvoteBtn = commentVoting.querySelector('.upvote');
      const downvoteBtn = commentVoting.querySelector('.downvote');
      const scoreSpan = commentVoting.querySelector('.vote-score');
      
      // Update vote buttons
      upvoteBtn.classList.remove('voted');
      downvoteBtn.classList.remove('voted');
      
      if (data.userVote === 'up') {
        upvoteBtn.classList.add('voted');
      } else if (data.userVote === 'down') {
        downvoteBtn.classList.add('voted');
      }
      
      // Update score
      scoreSpan.textContent = data.upvotes - data.downvotes;
      
    } catch (error) {
      console.error('Error voting on comment:', error);
      alert('Failed to vote on comment');
    }
  };

  // Handle reply form submission
  const handleReplySubmit = async (e) => {
    e.preventDefault();
    
    if (!replyingToId) return;
    
    const content = document.getElementById(`reply-content-${replyingToId}`).value.trim();
    
    if (!content) {
      alert('Please enter your comment');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/posts/${postId || postSlug}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ 
          content,
          parentId: replyingToId
        })
      });
      
      if (response.status === 403) {
        // User is blocked
        const errorData = await response.json();
        showCommentNotification('error', errorData.error || 'Your account has been blocked from commenting.');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to post reply');
      }
      
      const commentData = await response.json();
      
      // Clear form and reset state
      document.getElementById(`reply-form-${replyingToId}`).innerHTML = '';
      replyingToId = null;
      
      // Show success message based on comment status
      if (commentData.status === 'approved') {
        showCommentNotification('success', 'Your reply has been posted!');
        // Refresh comments to show the new reply
        fetchComments();
      } else {
        showCommentNotification('info', 'Your reply has been submitted and is awaiting approval.');
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      alert('Failed to post reply. Please try again.');
    }
  };

  // Handle main comment form submission
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    
    const content = document.getElementById('content').value.trim();
    
    if (!content) {
      alert('Please enter your comment');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/posts/${postId || postSlug}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ content })
      });
      
      if (response.status === 403) {
        // User is blocked
        const errorData = await response.json();
        showCommentNotification('error', errorData.error || 'Your account has been blocked from commenting.');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to post comment');
      }
      
      const commentData = await response.json();
      
      // Clear form
      document.getElementById('content').value = '';
      
      // Show success message based on comment status
      if (commentData.status === 'approved') {
        showCommentNotification('success', 'Your comment has been posted!');
        // Refresh comments to show the new comment
        fetchComments();
      } else {
        showCommentNotification('info', 'Your comment has been submitted and is awaiting approval.');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment. Please try again.');
    }
  };

  // Show notification for comment status
  const showCommentNotification = (type, message) => {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.comment-notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `comment-notification ${type}`;
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
    document.querySelector('.comments-section').prepend(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.remove();
      }
    }, 5000);
  };

  // Function to handle comment highlighting and scrolling
  const handleCommentHighlighting = () => {
    // Check if URL has a comment hash
    if (window.location.hash && window.location.hash.startsWith('#comment-')) {
      const commentId = window.location.hash.substring(9); // Remove '#comment-' prefix
      
      // Wait for comments to load
      setTimeout(() => {
        const commentElement = document.getElementById(`comment-${commentId}`);
        if (commentElement) {
          // Scroll to the comment
          commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Add highlight effect
          commentElement.classList.add('highlighted-comment');
          
          // Remove highlight after 5 seconds
          setTimeout(() => {
            commentElement.classList.remove('highlighted-comment');
          }, 5000);
        }
      }, 1000); // Wait 1 second for comments to load
    }
  };

  // Record view
  window.recordView = async (id) => {
    try {
      await fetch(`/api/posts/${id}/view`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  // Toggle post logs section
  window.togglePostLogs = () => {
    if (postLogsSection.classList.contains('hidden')) {
      postLogsSection.classList.remove('hidden');
    } else {
      postLogsSection.classList.add('hidden');
    }
  };

  // Handle tab switching in post logs
  document.querySelectorAll('.post-logs-section .tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      
      // Update active button
      document.querySelectorAll('.post-logs-section .tab-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      button.classList.add('active');
      
      // Hide all tab contents
      document.querySelectorAll('.post-logs-section .tab-content').forEach(content => {
        content.classList.add('hidden');
      });
      
      // Show selected tab content
      document.getElementById(tab).classList.remove('hidden');
    });
  });

  // Vote on post without reloading page
  window.votePost = async (id, voteType) => {
    try {
      if (!userData) {
        alert('Please login to vote');
        return;
      }
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/posts/${id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ vote: voteType })
      });
      
      if (!response.ok) {
        throw new Error('Failed to vote');
      }
      
      // Update vote counts without reloading page
      const upvoteBtn = document.querySelector('.vote-btn.upvote');
      const downvoteBtn = document.querySelector('.vote-btn.downvote');
      const upvoteCount = upvoteBtn.querySelector('.vote-count');
      const downvoteCount = downvoteBtn.querySelector('.vote-count');
      
      // Get current counts
      let upvotes = parseInt(upvoteCount.textContent);
      let downvotes = parseInt(downvoteCount.textContent);
      
      // Update UI based on vote type
      if (voteType === 'up') {
        if (upvoteBtn.classList.contains('voted')) {
          // Remove upvote
          upvoteBtn.classList.remove('voted');
          upvoteCount.textContent = upvotes - 1;
        } else {
          // Add upvote
          upvoteBtn.classList.add('voted');
          upvoteCount.textContent = upvotes + 1;
          
          // Remove downvote if exists
          if (downvoteBtn.classList.contains('voted')) {
            downvoteBtn.classList.remove('voted');
            downvoteCount.textContent = downvotes - 1;
          }
        }
      } else if (voteType === 'down') {
        if (downvoteBtn.classList.contains('voted')) {
          // Remove downvote
          downvoteBtn.classList.remove('voted');
          downvoteCount.textContent = downvotes - 1;
        } else {
          // Add downvote
          downvoteBtn.classList.add('voted');
          downvoteCount.textContent = downvotes + 1;
          
          // Remove upvote if exists
          if (upvoteBtn.classList.contains('voted')) {
            upvoteBtn.classList.remove('voted');
            upvoteCount.textContent = upvotes - 1;
          }
        }
      }
      
      // Update stats section
      const statsSection = document.querySelector('.stats');
      if (statsSection) {
        const newUpvotes = parseInt(upvoteCount.textContent);
        const newDownvotes = parseInt(downvoteCount.textContent);
        const totalVotes = newUpvotes + newDownvotes;
        const percentage = totalVotes > 0 ? Math.round((newUpvotes / totalVotes) * 100) : 0;
        
        const pointsSpan = statsSection.querySelector('span:nth-child(2)');
        if (pointsSpan) {
          pointsSpan.textContent = `${newUpvotes - newDownvotes} points (${percentage}% upvoted)`;
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to vote. Please try again.');
    }
  };

  // Vote on a suggestion
  window.voteSuggestion = async (id, voteType) => {
    try {
      if (!userData) {
        alert('Please login to vote');
        return;
      }
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/suggestions/${id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ vote: voteType })
      });
      
      if (!response.ok) {
        throw new Error('Failed to vote on suggestion');
      }
      
      // Refresh suggestions
      if (postId) {
        fetchPostSuggestions(postId);
      }
    } catch (error) {
      console.error('Error voting on suggestion:', error);
      alert('Failed to vote on suggestion. Please try again.');
    }
  };

  // Approve a suggestion
  window.approveSuggestion = async (id) => {
    try {
      if (!userData) {
        alert('Please login to approve suggestions');
        return;
      }
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/suggestions/${id}/approve`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve suggestion');
      }
      
      showCommentNotification('success', 'Suggestion approved successfully!');
      
      // Refresh page after brief delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error approving suggestion:', error);
      alert(error.message || 'Failed to approve suggestion. Please try again.');
    }
  };

  // Reject a suggestion
  window.rejectSuggestion = async (id) => {
    try {
      if (!userData) {
        alert('Please login to reject suggestions');
        return;
      }
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/suggestions/${id}/reject`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject suggestion');
      }
      
      showCommentNotification('success', 'Suggestion rejected successfully!');
      
      // Refresh suggestions
      if (postId) {
        fetchPostSuggestions(postId);
      }
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      alert(error.message || 'Failed to reject suggestion. Please try again.');
    }
  };

  // Delete post
  window.deletePost = async (id) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete post');
      }
      
      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    }
  };

  // Delete comment
  window.deleteComment = async (id) => {
    if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/comments/${id}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }
      
      // Refresh comments
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
    }
  };

  // Open the report modal for a post
  window.reportPost = (id) => {
    const reportModal = document.getElementById('report-modal');
    const reportTargetId = document.getElementById('report-target-id');
    const reportType = document.getElementById('report-type');
    const reportReason = document.getElementById('report-reason');
    
    // Set the report details
    reportTargetId.value = id;
    reportType.value = 'post';
    reportReason.value = '';
    
    // Show the modal
    reportModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
    
    // Focus on the reason textarea
    reportReason.focus();
  };

  // Open the report modal for a comment
  window.reportComment = (id) => {
    const reportModal = document.getElementById('report-modal');
    const reportTargetId = document.getElementById('report-target-id');
    const reportType = document.getElementById('report-type');
    const reportReason = document.getElementById('report-reason');
    
    // Set the report details
    reportTargetId.value = id;
    reportType.value = 'comment';
    reportReason.value = '';
    
    // Show the modal
    reportModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
    
    // Focus on the reason textarea
    reportReason.focus();
  };

  // Open the report modal for a link
  window.reportLink = (postId, groupIndex, linkIndex, linkLabel) => {
    const linkReportModal = document.getElementById('link-report-modal');
    const linkReportPostId = document.getElementById('link-report-post-id');
    const linkReportGroupIndex = document.getElementById('link-report-group-index');
    const linkReportLinkIndex = document.getElementById('link-report-link-index');
    const linkReportReason = document.getElementById('link-report-reason');
    
    // Set the report details
    linkReportPostId.value = postId;
    linkReportGroupIndex.value = groupIndex;
    linkReportLinkIndex.value = linkIndex;
    linkReportReason.value = '';
    
    // Update modal title
    const modalTitle = linkReportModal.querySelector('.modal-header h3');
    modalTitle.textContent = `Report Link: ${linkLabel}`;
    
    // Show the modal
    linkReportModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
    
    // Focus on the reason textarea
    linkReportReason.focus();
  };

  // Open the suggest changes modal
  window.suggestChanges = async (postId) => {
    if (!userData) {
      alert('Please login to suggest changes');
      return;
    }
    
    try {
      // Fetch current post data
      const response = await fetch(`/api/posts/id/${postId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch post details');
      }
      
      const post = await response.json();
      
      // Set form values
      const suggestModal = document.getElementById('suggest-modal');
      const suggestPostId = document.getElementById('suggest-post-id');
      const suggestTitle = document.getElementById('suggest-title');
      const suggestDescription = document.getElementById('suggest-description');
      const suggestCategory = document.getElementById('suggest-category');
      const suggestTags = document.getElementById('suggest-tags');
      const suggestImageUrl = document.getElementById('suggest-image-url');
      const downloadGroupsContainer = document.getElementById('suggest-download-groups-container');
      
      suggestPostId.value = postId;
      suggestTitle.value = post.title;
      suggestDescription.value = post.description;
      suggestCategory.value = post.category;
      suggestTags.value = post.tags.join(', ');
      suggestImageUrl.value = post.imageUrl;
      
      // Clear existing download groups
      downloadGroupsContainer.innerHTML = '';
      
      // Add download groups
      if (post.downloadGroups && post.downloadGroups.length > 0) {
        post.downloadGroups.forEach((group, groupIndex) => {
          addSuggestDownloadGroup(group.name, group.links);
        });
      } else {
        // Add empty group if none exist
        addSuggestDownloadGroup();
      }
      
      // Show the modal
      suggestModal.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    } catch (error) {
      console.error('Error loading post for suggestion:', error);
      alert('Failed to load post details for suggestion. Please try again.');
    }
  };

  // Add download group to suggestion form
  function addSuggestDownloadGroup(name = '', links = []) {
    const groupId = Date.now(); // Unique ID for this group
    const groupContainer = document.createElement('div');
    groupContainer.className = 'download-group-container';
    groupContainer.innerHTML = `
      <div class="group-header">
        <input type="text" class="group-name" placeholder="Group Name" value="${name}" required>
        <button type="button" class="remove-group-btn">Remove Group</button>
      </div>
      <div class="download-links-container" id="suggest-group-${groupId}-links">
        ${links.length > 0 ? links.map(link => `
          <div class="download-link-row">
            <input type="text" name="link-label[]" placeholder="Label" value="${link.label}" required>
            <input type="url" name="link-url[]" placeholder="URL" value="${link.url}" required>
            <button type="button" class="remove-link-btn">Remove</button>
          </div>
        `).join('') : `
          <div class="download-link-row">
            <input type="text" name="link-label[]" placeholder="Label" required>
            <input type="url" name="link-url[]" placeholder="URL" required>
            <button type="button" class="remove-link-btn">Remove</button>
          </div>
        `}
      </div>
      <button type="button" class="add-link-btn" data-group-id="${groupId}">Add Link</button>
    `;
    
    // Add event listeners
    groupContainer.querySelector('.remove-group-btn').addEventListener('click', function() {
      if (document.querySelectorAll('#suggest-download-groups-container .download-group-container').length > 1 || 
          confirm('Are you sure you want to remove the only download group?')) {
        groupContainer.remove();
      }
    });
    
    groupContainer.querySelector('.add-link-btn').addEventListener('click', function() {
      const groupId = this.getAttribute('data-group-id');
      addSuggestDownloadLinkToGroup(groupId);
    });
    
    // Add event listeners to remove buttons for existing links
    groupContainer.querySelectorAll('.remove-link-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const linksContainer = document.getElementById(`suggest-group-${groupId}-links`);
        if (linksContainer.children.length > 1) {
          btn.closest('.download-link-row').remove();
        } else {
          alert('Each group must have at least one download link');
        }
      });
    });
    
    document.getElementById('suggest-download-groups-container').appendChild(groupContainer);
  }

  // Add download link to a specific group in suggestion form
  function addSuggestDownloadLinkToGroup(groupId) {
    const linksContainer = document.getElementById(`suggest-group-${groupId}-links`);
    if (!linksContainer) return;
    
    const row = document.createElement('div');
    row.className = 'download-link-row';
    row.innerHTML = `
      <input type="text" name="link-label[]" placeholder="Label" required>
      <input type="url" name="link-url[]" placeholder="URL" required>
      <button type="button" class="remove-link-btn">Remove</button>
    `;
    
    // Add event listener to remove button
    row.querySelector('.remove-link-btn').addEventListener('click', function() {
      if (linksContainer.children.length > 1) {
        row.remove();
      } else {
        alert('Each group must have at least one download link');
      }
    });
    
    linksContainer.appendChild(row);
  }

  // Close the report modal
  const closeReportModal = () => {
    const reportModal = document.getElementById('report-modal');
    reportModal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
  };

  // Close the link report modal
  const closeLinkReportModal = () => {
    const linkReportModal = document.getElementById('link-report-modal');
    linkReportModal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
  };

  // Close the suggest changes modal
  const closeSuggestModal = () => {
    const suggestModal = document.getElementById('suggest-modal');
    suggestModal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
  };

  // Submit the report
  const submitReport = async (e) => {
    e.preventDefault();
    
    const reportTargetId = document.getElementById('report-target-id').value;
    const reportType = document.getElementById('report-type').value;
    const reportReason = document.getElementById('report-reason').value.trim();
    
    if (!reportReason) {
      alert('Please provide a reason for reporting');
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
          targetId: reportTargetId,
          type: reportType,
          reason: reportReason
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit report');
      }
      
      // Close the modal
      closeReportModal();
      
      // Show success message
      showCommentNotification('success', 'Report submitted successfully. Thank you for helping keep Simily safe.');
    } catch (error) {
      console.error('Error reporting content:', error);
      alert('Failed to submit report. Please try again.');
    }
  };

  // Submit the link report
  const submitLinkReport = async (e) => {
    e.preventDefault();
    
    const postId = document.getElementById('link-report-post-id').value;
    const groupIndex = document.getElementById('link-report-group-index').value;
    const linkIndex = document.getElementById('link-report-link-index').value;
    const reason = document.getElementById('link-report-reason').value.trim();
    
    if (!reason) {
      alert('Please provide a reason for reporting this link');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/linkreports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          postId,
          groupIndex,
          linkIndex,
          reason
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit link report');
      }
      
      // Close the modal
      closeLinkReportModal();
      
      // Show success message
      showCommentNotification('success', 'Link report submitted successfully. The post author will be notified.');
    } catch (error) {
      console.error('Error reporting link:', error);
      alert('Failed to submit link report. Please try again.');
    }
  };

  // Submit the suggestion form
  const submitSuggestion = async (e) => {
    e.preventDefault();
    
    const postId = document.getElementById('suggest-post-id').value;
    const title = document.getElementById('suggest-title').value.trim();
    const description = document.getElementById('suggest-description').value.trim();
    const category = document.getElementById('suggest-category').value;
    const tagsInput = document.getElementById('suggest-tags').value.trim();
    const imageUrl = document.getElementById('suggest-image-url').value.trim();
    const message = document.getElementById('suggest-message').value.trim();
    
    // Validate required fields
    if (!title) {
      alert('Title is required');
      return;
    }
    
    if (!description) {
      alert('Description is required');
      return;
    }
    
    if (!category) {
      alert('Category is required');
      return;
    }
    
    if (!imageUrl) {
      alert('Image URL is required');
      return;
    }
    
    if (!message) {
      alert('Please explain why you are suggesting these changes');
      return;
    }
    
    // Get download groups
    const downloadGroups = [];
    const groupContainers = document.querySelectorAll('#suggest-download-groups-container .download-group-container');
    
    if (groupContainers.length === 0) {
      alert('At least one download group with links is required');
      return;
    }
    
    groupContainers.forEach(container => {
      const groupNameInput = container.querySelector('.group-name');
      if (!groupNameInput) {
        alert('Group name input not found');
        return;
      }
      
      const groupName = groupNameInput.value.trim();
      if (!groupName) {
        alert('Each download group must have a name');
        return;
      }
      
      const linkRows = container.querySelectorAll('.download-link-row');
      if (linkRows.length === 0) {
        alert(`Download group "${groupName}" must have at least one link`);
        return;
      }
      
      const links = [];
      linkRows.forEach(row => {
        const labelInput = row.querySelector('input[name="link-label[]"]');
        const urlInput = row.querySelector('input[name="link-url[]"]');
        
        if (!labelInput || !urlInput) {
          alert('Link inputs not found');
          return;
        }
        
        const label = labelInput.value.trim();
        const url = urlInput.value.trim();
        
        if (!label) {
          alert(`Each link in group "${groupName}" must have a label`);
          return;
        }
        
        if (!url) {
          alert(`Each link in group "${groupName}" must have a URL`);
          return;
        }
        
        links.push({ label, url });
      });
      
      if (links.length > 0) {
        downloadGroups.push({
          name: groupName,
          links
        });
      }
    });
    
    // Validate download groups
    if (downloadGroups.length === 0) {
      alert('At least one download group with links is required');
      return;
    }
    
    // Parse tags
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          postId,
          title,
          description,
          category,
          tags,
          imageUrl,
          downloadGroups,
          message
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit suggestion');
      }
      
      // Close the modal
      closeSuggestModal();
      
      // Show success message
      showCommentNotification('success', 'Your suggestion has been submitted and is pending approval.');
      
      // Refresh suggestions
      fetchPostSuggestions(postId);
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      alert('Failed to submit suggestion. Please try again.');
    }
  };

  // Toggle download group
  window.toggleGroup = (groupId) => {
    const linksContainer = document.getElementById(`group-${groupId}-links`);
    const groupElement = document.querySelector(`[data-group-id="${groupId}"]`);
    const toggleButton = groupElement.querySelector('.group-toggle');
    
    if (linksContainer.classList.contains('active')) {
      linksContainer.classList.remove('active');
      toggleButton.textContent = '▼';
    } else {
      linksContainer.classList.add('active');
      toggleButton.textContent = '▲';
    }
  };

  // Copy all links to clipboard
  window.copyAllLinks = (encodedUrls, buttonElement) => {
    const urls = decodeURIComponent(encodedUrls);
    navigator.clipboard.writeText(urls).then(() => {
      const originalText = buttonElement.textContent;
      buttonElement.textContent = '✓ Links copied to clipboard!';
      buttonElement.classList.add('copy-success');
      
      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.classList.remove('copy-success');
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy links: ', err);
      alert('Failed to copy links. Please try again.');
    });
  };

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
  const init = async () => {
    const isLoggedIn = await checkAuth();
    prepareCommentForm(isLoggedIn);
    await fetchPostDetails();
    await fetchComments();
    handleCommentHighlighting(); // Handle comment highlighting after comments are loaded
    
    // Set up report modal event listeners
    const reportModal = document.getElementById('report-modal');
    const reportForm = document.getElementById('report-form');
    const modalClose = document.querySelector('#report-modal .modal-close');
    const cancelReport = document.getElementById('cancel-report');
    
    reportForm.addEventListener('submit', submitReport);
    modalClose.addEventListener('click', closeReportModal);
    cancelReport.addEventListener('click', closeReportModal);
    
    // Set up link report modal event listeners
    const linkReportModal = document.getElementById('link-report-modal');
    const linkReportForm = document.getElementById('link-report-form');
    const linkModalClose = document.querySelector('#link-report-modal .modal-close');
    const cancelLinkReport = document.getElementById('cancel-link-report');
    
    linkReportForm.addEventListener('submit', submitLinkReport);
    linkModalClose.addEventListener('click', closeLinkReportModal);
    cancelLinkReport.addEventListener('click', closeLinkReportModal);
    
    // Set up suggest changes modal event listeners
    const suggestModal = document.getElementById('suggest-modal');
    const suggestForm = document.getElementById('suggest-form');
    const suggestModalClose = document.querySelector('#suggest-modal .modal-close');
    const cancelSuggest = document.getElementById('cancel-suggest-btn');
    const suggestAddGroupBtn = document.getElementById('suggest-add-group-btn');
    
    suggestForm.addEventListener('submit', submitSuggestion);
    suggestModalClose.addEventListener('click', closeSuggestModal);
    cancelSuggest.addEventListener('click', closeSuggestModal);
    
    if (suggestAddGroupBtn) {
      suggestAddGroupBtn.addEventListener('click', () => {
        addSuggestDownloadGroup();
      });
    }
    
    // Close modals when clicking outside of them
    reportModal.addEventListener('click', (e) => {
      if (e.target === reportModal) {
        closeReportModal();
      }
    });
    
    linkReportModal.addEventListener('click', (e) => {
      if (e.target === linkReportModal) {
        closeLinkReportModal();
      }
    });
    
    suggestModal.addEventListener('click', (e) => {
      if (e.target === suggestModal) {
        closeSuggestModal();
      }
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (reportModal.classList.contains('active')) {
          closeReportModal();
        }
        if (linkReportModal.classList.contains('active')) {
          closeLinkReportModal();
        }
        if (suggestModal.classList.contains('active')) {
          closeSuggestModal();
        }
      }
    });
  };
  
  init();
});