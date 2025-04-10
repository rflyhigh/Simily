document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const adminLoginSection = document.getElementById('admin-login');
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

  // Admin token
  let adminToken = localStorage.getItem('adminToken');

  // Check if admin is logged in
  const checkAuth = () => {
    if (adminToken) {
      adminLoginSection.classList.add('hidden');
      softwareSection.classList.remove('hidden');
      
      // Activate first nav button
      navButtons[0].classList.add('active');
      
      // Load software data
      fetchSoftware();
    } else {
      adminLoginSection.classList.remove('hidden');
      softwareSection.classList.add('hidden');
      noticesSection.classList.add('hidden');
      commentsSection.classList.add('hidden');
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
      }
    });
  });

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
      
      const response = await fetch('/admin/api/comments', {
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
      
      let commentsHTML = '';
      comments.forEach(comment => {
        const date = new Date(comment.createdAt).toLocaleDateString();
        const softwareTitle = comment.softwareId ? comment.softwareId.title : 'Unknown Software';
        
        commentsHTML += `
          <div class="admin-item">
            <div class="admin-item-info">
              <div class="admin-item-title">
                <span class="comment-username">${comment.username}</span> on 
                <span class="comment-software">${softwareTitle}</span>
              </div>
              <div class="admin-item-meta">
                Posted: ${date}
              </div>
              <div class="comment-content">${comment.content}</div>
            </div>
            <div class="admin-item-actions">
              <button class="delete-btn" onclick="deleteComment('${comment._id}')">Delete</button>
            </div>
          </div>
        `;
      });
      
      commentsList.innerHTML = commentsHTML;
    } catch (error) {
      console.error('Error fetching comments:', error);
      commentsList.innerHTML = '<div class="error-message">Failed to load comments.</div>';
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
    
    downloadGroupsContainer.appendChild(groupContainer);
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
      
      console.log('Sending data:', JSON.stringify(softwareData)); // Debug log
      
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

  // Initialize page
  checkAuth();
});