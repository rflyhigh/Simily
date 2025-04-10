document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const adminLoginSection = document.getElementById('admin-login');
  const adminSections = document.querySelectorAll('.admin-section:not(#admin-login)');
  const adminNav = document.querySelector('.admin-nav');
  const softwareSection = document.getElementById('software-section');
  const noticesSection = document.getElementById('notices-section');
  const commentsSection = document.getElementById('comments-section');
  const navButtons = document.querySelectorAll('.nav-btn');
  const loginForm = document.getElementById('login-form');
  const softwareForm = document.getElementById('software-form');
  const noticeForm = document.getElementById('notice-form');
  const addSoftwareBtn = document.getElementById('add-software-btn');
  const cancelSoftwareBtn = document.getElementById('cancel-software-btn');
  const softwareFormContainer = document.getElementById('software-form-container');
  const addNoticeBtn = document.getElementById('add-notice-btn');
  const cancelNoticeBtn = document.getElementById('cancel-notice-btn');
  const noticeFormContainer = document.getElementById('notice-form-container');
  const softwareList = document.getElementById('software-list');
  const noticeList = document.getElementById('notice-list');
  const commentsList = document.getElementById('comments-list');
  const addGroupBtn = document.getElementById('add-group-btn');
  const downloadGroupsContainer = document.getElementById('download-groups-container');
  const commentSearch = document.getElementById('comment-search');
  const bulkDeleteBtn = document.getElementById('bulk-delete-comments');
  const commentSoftwareFilter = document.getElementById('comment-software-filter');
  const adminSearchInput = document.getElementById('admin-search-input');
  const adminSearchButton = document.getElementById('admin-search-button');

  // Admin token
  let adminToken = localStorage.getItem('adminToken');

  // Check if admin is logged in
  const checkAuth = () => {
    if (adminToken) {
      adminLoginSection.classList.add('hidden');
      adminNav.classList.remove('hidden');
      
      // Show first section by default
      softwareSection.classList.remove('hidden');
      
      // Activate first nav button
      navButtons[0].classList.add('active');
      
      // Load software data
      fetchSoftware();
    } else {
      adminLoginSection.classList.remove('hidden');
      adminNav.classList.add('hidden');
      adminSections.forEach(section => {
        if (section.id !== 'admin-login') {
          section.classList.add('hidden');
        }
      });
    }
  };

  // Handle login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const token = document.getElementById('admin-token').value.trim();
      
      if (!token) {
        alert('Please enter admin token');
        return;
      }
      
      try {
        // Test the token with a simple API call
        const response = await fetch('/admin/api/software', {
          headers: {
            'x-auth-token': token
          }
        });
        
        if (!response.ok) {
          throw new Error('Invalid token');
        }
        
        // Store token and update UI
        localStorage.setItem('adminToken', token);
        adminToken = token;
        checkAuth();
      } catch (error) {
        console.error('Login error:', error);
        alert('Invalid admin token');
      }
    });
  }

  // Handle navigation between sections
  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const section = button.dataset.section;
      
      // Update active button
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Hide all sections
      softwareSection.classList.add('hidden');
      noticesSection.classList.add('hidden');
      commentsSection.classList.add('hidden');
      
      // Show selected section
      if (section === 'software') {
        softwareSection.classList.remove('hidden');
        fetchSoftware();
      } else if (section === 'notices') {
        noticesSection.classList.remove('hidden');
        fetchNotices();
      } else if (section === 'comments') {
        commentsSection.classList.remove('hidden');
        fetchComments();
        fetchSoftwareForCommentFilter();
      }
    });
  });

  // Fetch software list for comment filter dropdown
  const fetchSoftwareForCommentFilter = async () => {
    try {
      const response = await fetch('/admin/api/software', {
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch software');
      }
      
      const software = await response.json();
      
      let options = '<option value="">All Software</option>';
      software.forEach(item => {
        options += `<option value="${item._id}">${item.title}</option>`;
      });
      
      if (commentSoftwareFilter) {
        commentSoftwareFilter.innerHTML = options;
      }
    } catch (error) {
      console.error('Error fetching software for filter:', error);
    }
  };

  // Fetch software list
  const fetchSoftware = async () => {
    try {
      softwareList.innerHTML = '<div class="loading">Loading...</div>';
      
      const response = await fetch('/admin/api/software', {
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch software');
      }
      
      const software = await response.json();
      
      if (software.length === 0) {
        softwareList.innerHTML = '<div class="empty-state">No software available yet.</div>';
        return;
      }
      
      let softwareHTML = '';
      software.forEach(item => {
        const date = new Date(item.createdAt).toLocaleDateString();
        softwareHTML += `
          <div class="admin-item">
            <div class="admin-item-info">
              <h3 class="admin-item-title">${item.title}</h3>
              <div class="admin-item-meta">
                Added: ${date} | Views: ${item.views} | Downloads: ${item.downloads}
              </div>
            </div>
            <div class="admin-item-actions">
              <button class="edit-btn" onclick="editSoftware('${item._id}')">Edit</button>
              <button class="delete-btn" onclick="deleteSoftware('${item._id}')">Delete</button>
            </div>
          </div>
        `;
      });
      
      softwareList.innerHTML = softwareHTML;
    } catch (error) {
      console.error('Error fetching software:', error);
      softwareList.innerHTML = '<div class="error-message">Failed to load software.</div>';
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

  // Fetch comments list
  const fetchComments = async () => {
    try {
      commentsList.innerHTML = '<div class="loading">Loading...</div>';
      
      const softwareId = commentSoftwareFilter ? commentSoftwareFilter.value : '';
      const searchQuery = commentSearch ? commentSearch.value.trim() : '';
      
      let url = '/admin/api/comments';
      if (softwareId || searchQuery) {
        url += '?';
        if (softwareId) url += `softwareId=${softwareId}`;
        if (softwareId && searchQuery) url += '&';
        if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}`;
      }
      
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
        commentsList.innerHTML = '<div class="empty-state">No comments available yet.</div>';
        return;
      }
      
      // Group comments by software
      const commentsBySoftware = {};
      comments.forEach(comment => {
        const softwareId = comment.softwareId ? comment.softwareId._id : 'unknown';
        const softwareTitle = comment.softwareId ? comment.softwareId.title : 'Unknown Software';
        
        if (!commentsBySoftware[softwareId]) {
          commentsBySoftware[softwareId] = {
            title: softwareTitle,
            comments: []
          };
        }
        
        commentsBySoftware[softwareId].comments.push(comment);
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
      
      // Render comments by software
      Object.keys(commentsBySoftware).forEach(softwareId => {
        const softwareData = commentsBySoftware[softwareId];
        
        commentsHTML += `
          <div class="comment-software-section">
            <h3 class="comment-software-title">${softwareData.title}</h3>
            <div class="comment-list">
        `;
        
        softwareData.comments.forEach(comment => {
          const date = new Date(comment.createdAt).toLocaleDateString();
          const isReply = comment.parentId ? true : false;
          const status = comment.status || 'approved';
          
          commentsHTML += `
            <div class="admin-item comment-item ${isReply ? 'comment-reply' : ''} ${status !== 'approved' ? 'comment-held' : ''}">
              <div class="comment-checkbox-container">
                <input type="checkbox" class="comment-checkbox" data-id="${comment._id}">
              </div>
              <div class="admin-item-info">
                <div class="admin-item-title">
                  <span class="comment-username">${comment.username}</span>
                  ${isReply ? '<span class="reply-badge">Reply</span>' : ''}
                  <span class="comment-status-badge status-${status}">${status}</span>
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
                <button class="btn-small" onclick="blockUser('${comment.username}')">Block User</button>
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

  // Show add software form
  if (addSoftwareBtn) {
    addSoftwareBtn.addEventListener('click', () => {
      document.getElementById('form-title').textContent = 'Add New Software';
      document.getElementById('software-id').value = '';
      softwareForm.reset();
      
      // Clear download groups and add an empty one
      if (downloadGroupsContainer) {
        downloadGroupsContainer.innerHTML = '';
        addDownloadGroup();
      }
      
      softwareFormContainer.classList.remove('hidden');
    });
  }

  // Hide software form
  if (cancelSoftwareBtn) {
    cancelSoftwareBtn.addEventListener('click', () => {
      softwareFormContainer.classList.add('hidden');
    });
  }

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

  // Add download group
  if (addGroupBtn) {
    addGroupBtn.addEventListener('click', () => {
      addDownloadGroup();
    });
  }

  // Handle comment search
  if (commentSearch) {
    commentSearch.addEventListener('input', debounce(() => {
      fetchComments();
    }, 500));
  }

  // Handle comment software filter
  if (commentSoftwareFilter) {
    commentSoftwareFilter.addEventListener('change', () => {
      fetchComments();
    });
  }

  // Handle admin search
  if (adminSearchButton) {
    adminSearchButton.addEventListener('click', () => {
      const query = adminSearchInput.value.trim();
      if (query) {
        // Determine which section is active
        const activeSection = document.querySelector('.nav-btn.active').dataset.section;
        
        if (activeSection === 'software') {
          // Search software
          searchSoftware(query);
        } else if (activeSection === 'notices') {
          // Search notices
          searchNotices(query);
        } else if (activeSection === 'comments') {
          // Set comment search
          commentSearch.value = query;
          fetchComments();
        }
      }
    });
  }

  // Search software
  const searchSoftware = async (query) => {
    try {
      softwareList.innerHTML = '<div class="loading">Searching...</div>';
      
      const response = await fetch(`/admin/api/software/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to search software');
      }
      
      const software = await response.json();
      
      if (software.length === 0) {
        softwareList.innerHTML = '<div class="empty-state">No software found matching your search.</div>';
        return;
      }
      
      let softwareHTML = '';
      software.forEach(item => {
        const date = new Date(item.createdAt).toLocaleDateString();
        softwareHTML += `
          <div class="admin-item">
            <div class="admin-item-info">
              <h3 class="admin-item-title">${item.title}</h3>
              <div class="admin-item-meta">
                Added: ${date} | Views: ${item.views} | Downloads: ${item.downloads}
              </div>
            </div>
            <div class="admin-item-actions">
              <button class="edit-btn" onclick="editSoftware('${item._id}')">Edit</button>
              <button class="delete-btn" onclick="deleteSoftware('${item._id}')">Delete</button>
            </div>
          </div>
        `;
      });
      
      softwareList.innerHTML = softwareHTML;
    } catch (error) {
      console.error('Error searching software:', error);
      softwareList.innerHTML = '<div class="error-message">Failed to search software.</div>';
    }
  };

  // Search notices
  const searchNotices = async (query) => {
    try {
      noticeList.innerHTML = '<div class="loading">Searching...</div>';
      
      const response = await fetch(`/admin/api/notices/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to search notices');
      }
      
      const notices = await response.json();
      
      if (notices.length === 0) {
        noticeList.innerHTML = '<div class="empty-state">No notices found matching your search.</div>';
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
      console.error('Error searching notices:', error);
      noticeList.innerHTML = '<div class="error-message">Failed to search notices.</div>';
    }
  };

  // Add download group function
  function addDownloadGroup(name = '', links = []) {
    if (!downloadGroupsContainer) return;
    
    const groupId = Date.now(); // Unique ID for this group
    const groupContainer = document.createElement('div');
    groupContainer.className = 'download-group-container';
    groupContainer.innerHTML = `
      <div class="group-header">
        <input type="text" class="group-name" placeholder="Group Name" value="${name}" required>
        <button type="button" class="remove-group-btn">Remove Group</button>
      </div>
      <div class="download-links-container" id="group-${groupId}-links">
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
      <div class="bulk-url-container">
        <label for="bulk-url-${groupId}">Bulk URL Entry:</label>
        <textarea id="bulk-url-${groupId}" class="bulk-url-input" placeholder="Paste multiple URLs (one per line) to auto-fill"></textarea>
        <button type="button" class="process-bulk-btn" data-group-id="${groupId}">Process URLs</button>
      </div>
      <button type="button" class="add-link-btn" data-group-id="${groupId}">Add Link</button>
    `;
    
    // Add event listeners
    groupContainer.querySelector('.remove-group-btn').addEventListener('click', function() {
      if (document.querySelectorAll('.download-group-container').length > 1 || 
          confirm('Are you sure you want to remove the only download group?')) {
        groupContainer.remove();
      }
    });
    
    groupContainer.querySelector('.add-link-btn').addEventListener('click', function() {
      const groupId = this.getAttribute('data-group-id');
      addDownloadLinkToGroup(groupId);
    });
    
    // Add event listener for bulk URL processing
    groupContainer.querySelector('.process-bulk-btn').addEventListener('click', function() {
      const groupId = this.getAttribute('data-group-id');
      processBulkUrls(groupId);
    });
    
    // Add event listeners to remove buttons for existing links
    groupContainer.querySelectorAll('.remove-link-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const linksContainer = document.getElementById(`group-${groupId}-links`);
        if (linksContainer.children.length > 1) {
          btn.closest('.download-link-row').remove();
        } else {
          alert('Each group must have at least one download link');
        }
      });
    });
    
    // Add event listeners for URL fields to detect pasted multiple URLs
    const urlFields = groupContainer.querySelectorAll('input[name="link-url[]"]');
    urlFields.forEach(field => {
      field.addEventListener('paste', handleUrlPaste);
    });
    
    downloadGroupsContainer.appendChild(groupContainer);
  }

  // Process bulk URLs
  function processBulkUrls(groupId) {
    const bulkUrlInput = document.getElementById(`bulk-url-${groupId}`);
    const linksContainer = document.getElementById(`group-${groupId}-links`);
    
    if (!bulkUrlInput || !linksContainer) return;
    
    const urls = bulkUrlInput.value.trim().split('\n').filter(url => url.trim() !== '');
    
    if (urls.length === 0) {
      alert('Please enter at least one URL');
      return;
    }
    
    // Clear existing links except the first one
    while (linksContainer.children.length > 1) {
      linksContainer.removeChild(linksContainer.lastChild);
    }
    
    // Set the first URL and label
    const firstRow = linksContainer.children[0];
    const labelInput = firstRow.querySelector('input[name="link-label[]"]');
    const urlInput = firstRow.querySelector('input[name="link-url[]"]');
    
    labelInput.value = 'PART1';
    urlInput.value = urls[0];
    
    // Add the rest of the URLs
    for (let i = 1; i < urls.length; i++) {
      const row = document.createElement('div');
      row.className = 'download-link-row';
      row.innerHTML = `
        <input type="text" name="link-label[]" placeholder="Label" value="PART${i+1}" required>
        <input type="url" name="link-url[]" placeholder="URL" value="${urls[i]}" required>
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
      
      // Add event listener for URL field to detect pasted multiple URLs
      row.querySelector('input[name="link-url[]"]').addEventListener('paste', handleUrlPaste);
      
      linksContainer.appendChild(row);
    }
    
    // Clear the bulk input
    bulkUrlInput.value = '';
  }

  function handleUrlPaste(e) {
    // Get the pasted text
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text');
    
    // Check if it contains multiple lines (potential multiple URLs)
    if (pastedText.includes('\n')) {
      e.preventDefault(); // Prevent default paste behavior
      
      // Get the URLs from the pasted text
      const urls = pastedText.trim().split('\n').filter(url => url.trim() !== '');
      
      if (urls.length <= 1) {
        // If only one URL, just paste it normally
        e.target.value = urls[0];
        return;
      }
      
      // Find the current group
      const currentRow = e.target.closest('.download-link-row');
      const groupContainer = currentRow.closest('.download-group-container');
      const groupId = groupContainer.querySelector('.add-link-btn').getAttribute('data-group-id');
      const linksContainer = document.getElementById(`group-${groupId}-links`);
      
      // Set the current field
      const labelInput = currentRow.querySelector('input[name="link-label[]"]');
      labelInput.value = 'PART1';
      e.target.value = urls[0];
      
      // Remove existing links except the current one
      Array.from(linksContainer.children).forEach(child => {
        if (child !== currentRow) {
          child.remove();
        }
      });
      
      // Add the rest of the URLs
      for (let i = 1; i < urls.length; i++) {
        const row = document.createElement('div');
        row.className = 'download-link-row';
        row.innerHTML = `
          <input type="text" name="link-label[]" placeholder="Label" value="PART${i+1}" required>
          <input type="url" name="link-url[]" placeholder="URL" value="${urls[i]}" required>
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
        
        // Add event listener for URL field to detect pasted multiple URLs
        row.querySelector('input[name="link-url[]"]').addEventListener('paste', handleUrlPaste);
        
        linksContainer.appendChild(row);
      }
      
      // Focus on the label of the first row to allow user to edit it
      labelInput.focus();
      labelInput.select();
    }
  }

  // Add download link to a specific group
  function addDownloadLinkToGroup(groupId) {
    const linksContainer = document.getElementById(`group-${groupId}-links`);
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
    
    // Add event listener for URL field to detect pasted multiple URLs
    row.querySelector('input[name="link-url[]"]').addEventListener('paste', handleUrlPaste);
    
    linksContainer.appendChild(row);
  }
  
  // Handle software form submission
  if (softwareForm) {
    softwareForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const softwareId = document.getElementById('software-id').value;
      const title = document.getElementById('title').value.trim();
      const description = document.getElementById('description').value.trim();
      const tagsInput = document.getElementById('tags').value.trim();
      const imageUrl = document.getElementById('image-url').value.trim();
      
      // Validate required fields
      if (!title) {
        alert('Title is required');
        return;
      }
      
      if (!description) {
        alert('Description is required');
        return;
      }
      
      if (!imageUrl) {
        alert('Image URL is required');
        return;
      }
      
      // Get download groups
      const downloadGroups = [];
      const groupContainers = document.querySelectorAll('.download-group-container');
      
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
      
      // Create software object
      const softwareData = {
        title,
        description,
        tags,
        imageUrl,
        downloadGroups
      };
      
      try {
        let response;
        
        if (softwareId) {
          // Update existing software
          response = await fetch(`/admin/api/software/${softwareId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': adminToken
            },
            body: JSON.stringify(softwareData)
          });
        } else {
          // Add new software
          response = await fetch('/admin/api/software', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': adminToken
            },
            body: JSON.stringify(softwareData)
          });
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save software');
        }
        
        // Hide form and refresh list
        softwareFormContainer.classList.add('hidden');
        fetchSoftware();
      } catch (error) {
        console.error('Error saving software:', error);
        alert(error.message || 'Failed to save software. Please try again.');
      }
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

  // Edit software
  window.editSoftware = async (id) => {
    try {
      const response = await fetch(`/api/software/${id}`);
      const software = await response.json();
      
      // Set form title
      document.getElementById('form-title').textContent = 'Edit Software';
      
      // Fill form fields
      document.getElementById('software-id').value = software._id;
      document.getElementById('title').value = software.title;
      document.getElementById('description').value = software.description;
      document.getElementById('tags').value = software.tags.join(', ');
      document.getElementById('image-url').value = software.imageUrl;
      
      // Clear existing download groups
      if (downloadGroupsContainer) {
        downloadGroupsContainer.innerHTML = '';
        
        // Add download groups
        if (software.downloadGroups && software.downloadGroups.length > 0) {
          // New format with groups
          software.downloadGroups.forEach(group => {
            addDownloadGroup(group.name, group.links);
          });
        } else if (software.downloadLinks && software.downloadLinks.length > 0) {
          // Legacy format - convert to a single group
          addDownloadGroup('Default', software.downloadLinks);
        } else {
          // No links - add empty group
          addDownloadGroup();
        }
      }
      
      // Show form
      softwareFormContainer.classList.remove('hidden');
    } catch (error) {
      console.error('Error fetching software details:', error);
      alert('Failed to load software details');
    }
  };

  // Delete software
  window.deleteSoftware = async (id) => {
    if (!confirm('Are you sure you want to delete this software? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/admin/api/software/${id}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': adminToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete software');
      }
      
      fetchSoftware();
    } catch (error) {
      console.error('Error deleting software:', error);
      alert('Failed to delete software');
    }
  };

  // Edit notice
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

  // Toggle notice active status
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

  // Delete notice
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

  // Delete comment
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

  // Hold comment
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

  // Approve comment
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

  // Block user
  window.blockUser = async (username) => {
    if (!confirm(`Are you sure you want to block user "${username}"? This will prevent them from posting new comments.`)) {
      return;
    }
    
    try {
      const response = await fetch('/admin/api/blocked-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': adminToken
        },
        body: JSON.stringify({ username })
      });
      
      if (!response.ok) {
        throw new Error('Failed to block user');
      }
      
      alert(`User "${username}" has been blocked from commenting.`);
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Failed to block user');
    }
  };

  // Utility function for debouncing
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  // Initialize page
  checkAuth();
});