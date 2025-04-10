document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const softwareDetailSection = document.getElementById('software-detail');
    const commentForm = document.getElementById('comment-form');
    const commentsList = document.getElementById('comments-list');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
  
    // Get software ID from URL
    const softwareId = window.location.pathname.split('/').pop();
    
    // Track if we're replying to a comment
    let replyingToId = null;
  
    // Fetch and display software details
    const fetchSoftwareDetails = async () => {
        try {
            softwareDetailSection.innerHTML = '<div class="loading">Loading...</div>';
            
            const response = await fetch(`/api/software/${softwareId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    window.location.href = '/404';
                    return;
                }
                throw new Error('Failed to fetch software details');
            }
            
            const software = await response.json();
            
            // Update page title
            document.title = `${software.title} - Simily`;
            
            // Format tags
            const tagsHTML = software.tags.map(tag => 
                `<span class="detail-tag">${tag}</span>`
            ).join('');
            
            // Format download groups and links
            let downloadGroupsHTML = '';
            
            if (software.downloadGroups && software.downloadGroups.length > 0) {
                // New format with download groups
                downloadGroupsHTML = `
                <div class="download-groups">
                    ${software.downloadGroups.map((group, index) => {
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
                                        onclick="recordDownload('${software._id}')">${link.label}</a>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
                `;
            } else if (software.downloadLinks && software.downloadLinks.length > 0) {
                // Legacy format with flat download links
                const allUrls = software.downloadLinks.map(link => link.url).join('\n');
                
                downloadGroupsHTML = `
                <div class="download-groups">
                    <div class="download-group" data-group-id="legacy">
                        <div class="group-header" onclick="toggleGroup('legacy')">
                            <h4 class="download-group-name">Download Links</h4>
                            <button class="group-toggle" aria-label="Toggle group">▼</button>
                        </div>
                        <div class="download-links-container" id="group-legacy-links">
                            <button class="copy-all-btn" onclick="copyAllLinks('${encodeURIComponent(allUrls)}', this)">
                                Copy all links to clipboard
                            </button>
                            <div class="download-links">
                                ${software.downloadLinks.map(link => `
                                    <a href="${link.url}" class="download-link" target="_blank" rel="noopener noreferrer" 
                                    onclick="recordDownload('${software._id}')">${link.label}</a>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }
            
            // Format date
            const createdDate = new Date(software.createdAt).toLocaleDateString();
            
            // Render software details with new layout
            softwareDetailSection.innerHTML = `
                <div class="detail-image-container">
                    <img src="${software.imageUrl}" alt="${software.title}" class="detail-image">
                </div>
                <div class="detail-content">
                    <div class="detail-header">
                        <h1 class="detail-title">${software.title}</h1>
                        <div class="detail-tags">
                            ${tagsHTML}
                        </div>
                    </div>
                    <div class="detail-description">
                        ${software.description}
                    </div>
                    <div class="download-section">
                        <h3>Download Links</h3>
                        ${downloadGroupsHTML}
                        <div class="stats">
                            <span>${software.views} views</span>
                            <span>${software.downloads} downloads</span>
                            <span>Added on ${createdDate}</span>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error fetching software details:', error);
            softwareDetailSection.innerHTML = '<div class="error-message">Failed to load software details.</div>';
        }
    };
  
    // Fetch and display comments
    const fetchComments = async () => {
      try {
        const response = await fetch(`/api/software/${softwareId}/comments`);
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
              <span class="comment-username">${comment.username}</span>
              <span class="comment-date">${date}</span>
            </div>
            <div class="comment-content">
              ${comment.content}
            </div>
            <div class="comment-actions">
              <button class="reply-btn" data-comment-id="${comment._id}">Reply</button>
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
      
      return `
        <div class="reply" id="comment-${reply._id}">
          <div class="comment">
            <div class="comment-header">
              <span class="comment-username">${reply.username}</span>
              <span class="comment-date">${date}</span>
            </div>
            <div class="comment-content">
              ${reply.content}
            </div>
            <div class="comment-actions">
              <button class="reply-btn" data-comment-id="${reply.parentId}">Reply</button>
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
              <label for="reply-username-${commentId}">Username</label>
              <input type="text" id="reply-username-${commentId}" name="username" required>
            </div>
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
      
      const username = document.getElementById(`reply-username-${replyingToId}`).value.trim();
      const content = document.getElementById(`reply-content-${replyingToId}`).value.trim();
      
      if (!username || !content) {
        alert('Please fill in all fields');
        return;
      }
      
      try {
        const response = await fetch(`/api/software/${softwareId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            username, 
            content,
            parentId: replyingToId
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to post reply');
        }
        
        // Clear form and reset state
        document.getElementById(`reply-form-${replyingToId}`).innerHTML = '';
        replyingToId = null;
        
        // Refresh comments
        fetchComments();
      } catch (error) {
        console.error('Error posting reply:', error);
        alert('Failed to post reply. Please try again.');
      }
    };

    // Handle main comment form submission
    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const content = document.getElementById('content').value.trim();
        
        if (!username || !content) {
          alert('Please fill in all fields');
          return;
        }
        
        try {
          const response = await fetch(`/api/software/${softwareId}/comments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, content })
          });
          
          if (!response.ok) {
            throw new Error('Failed to post comment');
          }
          
          // Clear form
          document.getElementById('username').value = '';
          document.getElementById('content').value = '';
          
          // Refresh comments
          fetchComments();
        } catch (error) {
          console.error('Error posting comment:', error);
          alert('Failed to post comment. Please try again.');
        }
      });
    }

    // Record download
    window.recordDownload = async (id) => {
      try {
        await fetch(`/api/software/${id}/download`, {
          method: 'POST'
        });
      } catch (error) {
        console.error('Error recording download:', error);
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
    fetchSoftwareDetails();
    fetchComments();
});