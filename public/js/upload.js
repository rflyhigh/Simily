// FILE: /public/js/upload.js
document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const uploadForm = document.getElementById('upload-form');
    const formTitle = document.getElementById('form-title');
    const postIdInput = document.getElementById('post-id');
    const titleInput = document.getElementById('title');
    const descriptionInput = document.getElementById('description');
    const categorySelect = document.getElementById('category');
    const tagsInput = document.getElementById('tags');
    const imageUrlInput = document.getElementById('image-url');
    const downloadGroupsContainer = document.getElementById('download-groups-container');
    const addGroupBtn = document.getElementById('add-group-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const navLinks = document.getElementById('nav-links');
  
    // Check if editing an existing post
    const urlParams = new URLSearchParams(window.location.search);
    const editPostId = urlParams.get('edit');
    
    // User data
    let userData = null;
  
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          // Redirect to login if not logged in
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        
        const response = await fetch('/api/auth/user', {
          headers: {
            'x-auth-token': token
          }
        });
        
        if (!response.ok) {
          localStorage.removeItem('token');
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        
        userData = await response.json();
        updateNavLinks(userData);
        
        // If editing, fetch post details
        if (editPostId) {
          fetchPostDetails(editPostId);
        } else {
          // Add an empty download group
          addDownloadGroup();
        }
      } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    };
  
    // Update navigation links
    const updateNavLinks = (user) => {
      navLinks.innerHTML = `
        <a href="/user/${user.username}" class="nav-link">Profile</a>
        <button id="logout-btn" class="nav-link">Logout</button>
      `;
      
      // Add logout event listener
      document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/';
      });
    };
  
    // Fetch post details for editing
    const fetchPostDetails = async (postId) => {
      try {
        const response = await fetch(`/api/posts/id/${postId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            window.location.href = '/404';
            return;
          }
          throw new Error('Failed to fetch post details');
        }
        
        const post = await response.json();
        
        // Check if current user is the author
        if (userData._id !== post.author._id) {
          alert('You do not have permission to edit this post');
          window.location.href = '/';
          return;
        }
        
        // Update form title
        formTitle.textContent = 'Edit Post';
        
        // Fill form fields
        postIdInput.value = post._id;
        titleInput.value = post.title;
        descriptionInput.value = post.description;
        categorySelect.value = post.category;
        tagsInput.value = post.tags.join(', ');
        imageUrlInput.value = post.imageUrl;
        
        // Clear existing download groups
        downloadGroupsContainer.innerHTML = '';
        
        // Add download groups
        if (post.downloadGroups && post.downloadGroups.length > 0) {
          post.downloadGroups.forEach(group => {
            addDownloadGroup(group.name, group.links);
          });
        } else {
          // No groups - add empty group
          addDownloadGroup();
        }
      } catch (error) {
        console.error('Error fetching post details:', error);
        alert('Failed to load post details');
        window.location.href = '/';
      }
    };
  
    // Add download group
    const addDownloadGroup = (name = '', links = []) => {
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
      
    // FILE: /public/js/upload.js (continued)
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
    };

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

    // Handle URL paste event
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

    // Add event listener to add group button
    if (addGroupBtn) {
    addGroupBtn.addEventListener('click', () => {
        addDownloadGroup();
    });
    }

    // Handle cancel button
    if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        window.location.href = '/';
        }
    });
    }

    // Handle form submission
    if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const postId = postIdInput.value;
        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        const category = categorySelect.value;
        const tagsInput = document.getElementById('tags').value.trim();
        const imageUrl = imageUrlInput.value.trim();
        
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
        
        // Create post object
        const postData = {
        title,
        description,
        category,
        tags,
        imageUrl,
        downloadGroups
        };
        
        try {
        const token = localStorage.getItem('token');
        let response;
        
        if (postId) {
            // Update existing post
            response = await fetch(`/api/posts/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify(postData)
            });
        } else {
            // Add new post
            response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify(postData)
            });
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save post');
        }
        
        const savedPost = await response.json();
        
        // Redirect to post detail page
        window.location.href = `/post/${savedPost.slug}`;
        } catch (error) {
        console.error('Error saving post:', error);
        alert(error.message || 'Failed to save post. Please try again.');
        }
    });
    }

    // Initialize page
    checkAuth();
});