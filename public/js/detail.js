// FILE: /public/js/detail.js
document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const postDetailSection = document.getElementById('post-detail');
  const commentFormContainer = document.getElementById('comment-form-container');
  const commentsList = document.getElementById('comments-list');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const navLinks = document.getElementById('nav-links');

  // Get post ID from URL
  const postId = window.location.pathname.split('/').pop();
  
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

  // Update meta tags with post information
  const updateMetaTags = (post) => {
    // Update page title
    document.title = `${post.title} - Simily`;
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', truncateText(post.description, 160));
    
    // Update canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', `https://simily.onrender.com/post/${post.slug}`);
    
    // Update Open Graph tags
    updateOpenGraphTag('og:url', `https://simily.onrender.com/post/${post.slug}`);
    updateOpenGraphTag('og:title', `${post.title} - Simily`);
    updateOpenGraphTag('og:description', truncateText(post.description, 160));
    updateOpenGraphTag('og:image', post.imageUrl);
    
    // Update Twitter tags
    updateOpenGraphTag('twitter:url', `https://simily.onrender.com/post/${post.slug}`);
    updateOpenGraphTag('twitter:title', `${post.title} - Simily`);
    updateOpenGraphTag('twitter:description', truncateText(post.description, 160));
    updateOpenGraphTag('twitter:image', post.imageUrl);
  };

  // Helper function to update Open Graph and Twitter tags
  const updateOpenGraphTag = (property, content) => {
    let tag = document.querySelector(`meta[property="${property}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('property', property);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  // Fetch and display post details
  const fetchPostDetails = async () => {
    try {
      postDetailSection.innerHTML = '<div class="loading">Loading...</div>';
      
      const response = await fetch(`/api/posts/${postId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          window.location.href = '/404';
          return;
        }
        throw new Error('Failed to fetch post details');
      }
      
      const post = await response.json();
      
      // Update meta tags for SEO
      updateMetaTags(post);
      
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
          ${post.downloadGroups.map((group, index) => {
            // Create a string of all URLs for copy functionality
            const allUrls = group.links.map(link => link.url).join('\n');
            
            return `
            <div class="download-group" data-group-id="${index}">
              <div class="group-header" onclick="toggleGroup(${index})">
                <h4 class="download-group-name">${group.name}</h4>
                <button class="group-toggle" aria-label="Toggle group">▼</button>
              </div>
              <div class="download-links-container" id="group-${index}-links">
                <button class="copy-all-btn" onclick="copyAllLinks('${encodeURIComponent(allUrls)}', this)">
                  Copy all links to clipboard
                </button>
                <div class="download-links">
                  ${group.links.map(link => `
                    <a href="${link.url}" class="download-link" target="_blank" rel="noopener noreferrer" 
                    onclick="recordView('${post._id}')">${link.label}</a>
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
      const authorActionsHTML = isAuthor ? `
        <div class="author-actions">
          <a href="/upload?edit=${post._id}" class="edit-btn">Edit</a>
          <button class="delete-btn" onclick="deletePost('${post._id}')">Delete</button>
        </div>
      ` : '';
      
      // Create report button HTML
      const reportButtonHTML = userData && !isAuthor ? `
        <button class="report-btn" onclick="reportPost('${post._id}')">Report</button>
      ` : '';
      
      // Render post details with new layout
      postDetailSection.innerHTML = `
        <div class="detail-image-container">
          <img src="${post.imageUrl}" alt="${post.title}" class="detail-image">
        </div>
        <div class="detail-content">
          <div class="detail-header">
            <h1 class="detail-title">${post.title}</h1>
            <div class="post-meta">
              <span class="post-author">Posted by: <a href="/user/${post.author.username}">${post.author.username}</a></span>
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
    } catch (error) {
      console.error('Error fetching post details:', error);
      postDetailSection.innerHTML = '<div class="error-message">Failed to load post details.</div>';
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
      // Get post ID from URL
      const postId = window.location.pathname.split('/').pop();
      
      // First try to fetch comments using the slug/identifier from the URL
      let response = await fetch(`/api/posts/${postId}/comments`);
      
      // If that fails, it might be because we need the actual post ID
      if (!response.ok) {
        // Try to get the post first to get its ID
        const postResponse = await fetch(`/api/posts/${postId}`);
        if (postResponse.ok) {
          const post = await postResponse.json();
          // Now fetch comments with the actual post ID
          response = await fetch(`/api/posts/${post._id}/comments`);
        }
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
    
    // Create author actions HTML
    const authorActionsHTML = isAuthor ? `
      <button class="delete-comment-btn" onclick="deleteComment('${comment._id}')">Delete</button>
    ` : '';
    
    // Create report button HTML
    const reportButtonHTML = userData && !isAuthor ? `
      <button class="report-btn" onclick="reportComment('${comment._id}')">Report</button>
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
            <span class="comment-username"><a href="/user/${comment.username}">${comment.username}</a></span>
            <span class="comment-date">${date}</span>
          </div>
          <div class="comment-content">
            ${comment.content}
          </div>
          <div class="comment-actions">
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
    
    // Create author actions HTML
    const authorActionsHTML = isAuthor ? `
      <button class="delete-comment-btn" onclick="deleteComment('${reply._id}')">Delete</button>
    ` : '';
    
    // Create report button HTML
    const reportButtonHTML = userData && !isAuthor ? `
      <button class="report-btn" onclick="reportComment('${reply._id}')">Report</button>
    ` : '';
    
    return `
      <div class="reply" id="comment-${reply._id}">
        <div class="comment">
          <div class="comment-header">
            <span class="comment-username"><a href="/user/${reply.username}">${reply.username}</a></span>
            <span class="comment-date">${date}</span>
          </div>
          <div class="comment-content">
            ${reply.content}
          </div>
          <div class="comment-actions">
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
      
      const response = await fetch(`/api/posts/${postId}/comments`, {
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
      
      const response = await fetch(`/api/posts/${postId}/comments`, {
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

  // Report post
  window.reportPost = async (id) => {
    const reason = prompt('Please provide a reason for reporting this post:');
    
    if (!reason) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          targetId: id,
          type: 'post',
          reason
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit report');
      }
      
      alert('Report submitted successfully. Thank you for helping keep Simily safe.');
    } catch (error) {
      console.error('Error reporting post:', error);
      alert('Failed to submit report. Please try again.');
    }
  };

  // Report comment
  window.reportComment = async (id) => {
    const reason = prompt('Please provide a reason for reporting this comment:');
    
    if (!reason) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          targetId: id,
          type: 'comment',
          reason
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit report');
      }
      
      alert('Report submitted successfully. Thank you for helping keep Simily safe.');
    } catch (error) {
      console.error('Error reporting comment:', error);
      alert('Failed to submit report. Please try again.');
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

  // Helper function to truncate text for meta descriptions
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  // Initialize page
  const init = async () => {
    const isLoggedIn = await checkAuth();
    prepareCommentForm(isLoggedIn);
    await fetchPostDetails();
    await fetchComments();
    handleCommentHighlighting(); // Handle comment highlighting after comments are loaded
  };

  init();
});