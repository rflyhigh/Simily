// FILE: /public/js/notifications.js
document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const notificationsList = document.getElementById('notifications-list');
  const markAllReadBtn = document.getElementById('mark-all-read');
  const filterButtons = document.querySelectorAll('.notification-filters .filter-btn');
  const pendingSuggestions = document.getElementById('pending-suggestions');
  const approvedSuggestions = document.getElementById('approved-suggestions');
  const rejectedSuggestions = document.getElementById('rejected-suggestions');
  const pendingReports = document.getElementById('pending-reports');
  const resolvedReports = document.getElementById('resolved-reports');
  const dismissedReports = document.getElementById('dismissed-reports');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const navLinks = document.getElementById('nav-links');
  const postSuggestionsSection = document.getElementById('post-suggestions-section');
  const linkReportsSection = document.getElementById('link-reports-section');
  
  // User data
  let userData = null;
  
  // Current filter
  let currentFilter = 'all';

  // Check if user is logged in
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Redirect to login if not logged in
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return false;
      }
      
      const response = await fetch('/api/auth/user', {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        localStorage.removeItem('token');
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return false;
      }
      
      userData = await response.json();
      updateNavLinks(userData);
      return true;
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('token'); // Clear token on error
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return false;
    }
  };

  // Update navigation links based on auth status
  const updateNavLinks = (user) => {
    if (!user) return; // Safety check
    
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
        <a href="/notifications" class="nav-link active">Notifications${notificationBadge}</a>
        <a href="/user/${user.username}" class="nav-link">${user.isMod ? '<span class="mod-badge">MOD</span> ' : ''}Profile</a>
        <button id="logout-btn" class="nav-link">Logout</button>
      `;
      
      // Add logout event listener
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          localStorage.removeItem('token');
          window.location.href = '/';
        });
      }
    })
    .catch(err => {
      console.error('Error fetching notification count:', err);
      navLinks.innerHTML = `
        <a href="/upload" class="nav-link">Upload</a>
        <a href="/notifications" class="nav-link active">Notifications</a>
        <a href="/user/${user.username}" class="nav-link">${user.isMod ? '<span class="mod-badge">MOD</span> ' : ''}Profile</a>
        <button id="logout-btn" class="nav-link">Logout</button>
      `;
      
      // Add logout event listener
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          localStorage.removeItem('token');
          window.location.href = '/';
        });
      }
    });
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      notificationsList.innerHTML = '<div class="loading">Loading notifications...</div>';
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch('/api/auth/notifications', {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const notifications = await response.json();
      
      if (!notifications || notifications.length === 0) {
        notificationsList.innerHTML = '<div class="empty-state">You have no notifications.</div>';
        return;
      }
      
      // Filter notifications based on current filter
      const filteredNotifications = currentFilter === 'all' ? 
        notifications : 
        notifications.filter(n => n.type === currentFilter);
      
      if (filteredNotifications.length === 0) {
        notificationsList.innerHTML = `<div class="empty-state">You have no ${currentFilter} notifications.</div>`;
        return;
      }
      
      let notificationsHTML = '';
      filteredNotifications.forEach(notification => {
        if (!notification) return; // Skip if notification is null or undefined
        
        const date = new Date(notification.createdAt).toLocaleDateString();
        const isUnread = !notification.read;
        
        notificationsHTML += `
          <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notification._id}">
            <div class="notification-badge notification-${notification.type}"></div>
            <div class="notification-content">
              <div class="notification-message">${notification.message}</div>
              <div class="notification-meta">
                <span class="notification-date">${date}</span>
                <span class="notification-type">${getNotificationType(notification.type)}</span>
              </div>
            </div>
            <div class="notification-actions">
              ${isUnread ? `<button class="mark-read-btn" onclick="markAsRead('${notification._id}')">Mark Read</button>` : ''}
              <a href="${getNotificationLink(notification)}" class="view-btn">View</a>
            </div>
          </div>
        `;
      });
      
      notificationsList.innerHTML = notificationsHTML || '<div class="empty-state">No notifications to display.</div>';
    } catch (error) {
      console.error('Error fetching notifications:', error);
      notificationsList.innerHTML = '<div class="error-message">Failed to load notifications.</div>';
    }
  };

  // Get notification type display name
  const getNotificationType = (type) => {
    if (!type) return 'Unknown';
    
    switch (type) {
      case 'suggestion':
        return 'Suggestion';
      case 'approval':
        return 'Approval';
      case 'report':
        return 'Report';
      case 'promotion':
        return 'System';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // Get link for notification
  const getNotificationLink = (notification) => {
    if (!notification) return '#';
    
    try {
      if (notification.targetType === 'post') {
        return `/post/${notification.postSlug || notification.targetId}`;
      } else if (notification.targetType === 'comment') {
        return `/post/${notification.postSlug || ''}#comment-${notification.targetId}`;
      } else if (notification.targetType === 'user') {
        return `/user/${notification.targetId}`;
      } else if (notification.targetType === 'link') {
        // For link reports, we need to use the post slug if available
        return notification.postSlug ? `/post/${notification.postSlug}` : `/post/${notification.targetId}`;
      }
    } catch (error) {
      console.error('Error generating notification link:', error);
    }
    
    return '#';
  };

  // Fetch post suggestions
  const fetchPostSuggestions = async () => {
    try {
      if (!userData || !userData.username) {
        console.error('User data not available');
        postSuggestionsSection.style.display = 'none';
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        postSuggestionsSection.style.display = 'none';
        return;
      }
      
      // First hide the section until we know if there are suggestions
      postSuggestionsSection.style.display = 'none';
      
      // Fetch user's posts
      const postsResponse = await fetch(`/api/users/${userData.username}/posts`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!postsResponse.ok) {
        throw new Error('Failed to fetch user posts');
      }
      
      const posts = await postsResponse.json();
      
      if (!posts || posts.length === 0) {
        return;
      }
      
      // Fetch suggestions for each post
      let allSuggestions = [];
      
      for (const post of posts) {
        if (!post || !post._id) continue; // Skip invalid posts
        
        try {
          const suggestionsResponse = await fetch(`/api/suggestions/post/${post._id}`, {
            headers: {
              'x-auth-token': token
            }
          });
          
          if (suggestionsResponse.ok) {
            const suggestions = await suggestionsResponse.json();
            if (suggestions && Array.isArray(suggestions)) {
              allSuggestions = [...allSuggestions, ...suggestions];
            }
          }
        } catch (error) {
          console.error(`Error fetching suggestions for post ${post._id}:`, error);
        }
      }
      
      if (allSuggestions.length === 0) {
        return;
      }
      
      // Show the section since we have suggestions
      postSuggestionsSection.style.display = 'block';
      
      // Group suggestions by status
      const pendingSugs = allSuggestions.filter(s => s && s.status === 'pending');
      const approvedSugs = allSuggestions.filter(s => s && s.status === 'approved');
      const rejectedSugs = allSuggestions.filter(s => s && s.status === 'rejected');
      
      // Render pending suggestions
      if (pendingSuggestions) {
        if (pendingSugs.length > 0) {
          let pendingHTML = '';
          pendingSugs.forEach(suggestion => {
            if (!suggestion) return; // Skip invalid suggestions
            
            const post = posts.find(p => p && p._id === suggestion.postId);
            if (!post) return; // Skip if post not found
            
            const date = new Date(suggestion.createdAt).toLocaleDateString();
            const suggestedBy = suggestion.suggestedBy && suggestion.suggestedBy.username ? 
              suggestion.suggestedBy.username : 'Unknown User';
            
            pendingHTML += `
              <div class="suggestion-item">
                <div class="suggestion-header">
                  <div class="suggestion-info">
                    <span class="suggestion-post">Post: <a href="/post/${post.slug}">${post.title}</a></span>
                    <span class="suggestion-author">By: <a href="/user/${suggestedBy}">${suggestedBy}</a></span>
                    <span class="suggestion-date">Date: ${date}</span>
                  </div>
                  <div class="suggestion-votes">
                    <span class="vote-count">Upvotes: ${suggestion.votes?.up || 0}</span>
                    <span class="vote-count">Downvotes: ${suggestion.votes?.down || 0}</span>
                  </div>
                </div>
                <div class="suggestion-message">
                  <strong>Message:</strong> ${suggestion.message || 'No message provided'}
                </div>
                <div class="suggestion-actions">
                  <button class="approve-btn" onclick="approveSuggestion('${suggestion._id}')">Approve</button>
                  <button class="reject-btn" onclick="rejectSuggestion('${suggestion._id}')">Reject</button>
                  <a href="/post/${post.slug}" class="view-btn">View Post</a>
                </div>
              </div>
            `;
          });
          
          pendingSuggestions.innerHTML = pendingHTML || '<div class="empty-state">No pending suggestions for your posts.</div>';
        } else {
          pendingSuggestions.innerHTML = '<div class="empty-state">No pending suggestions for your posts.</div>';
        }
      }
      
      // Render approved suggestions
      if (approvedSuggestions) {
        if (approvedSugs.length > 0) {
          let approvedHTML = '';
          approvedSugs.forEach(suggestion => {
            if (!suggestion) return; // Skip invalid suggestions
            
            const post = posts.find(p => p && p._id === suggestion.postId);
            if (!post) return; // Skip if post not found
            
            const date = new Date(suggestion.createdAt).toLocaleDateString();
            const suggestedBy = suggestion.suggestedBy && suggestion.suggestedBy.username ? 
              suggestion.suggestedBy.username : 'Unknown User';
            
            approvedHTML += `
              <div class="suggestion-item">
                <div class="suggestion-header">
                  <div class="suggestion-info">
                    <span class="suggestion-post">Post: <a href="/post/${post.slug}">${post.title}</a></span>
                    <span class="suggestion-author">By: <a href="/user/${suggestedBy}">${suggestedBy}</a></span>
                    <span class="suggestion-date">Date: ${date}</span>
                  </div>
                </div>
                <div class="suggestion-message">
                  <strong>Message:</strong> ${suggestion.message || 'No message provided'}
                </div>
                <div class="suggestion-actions">
                  <a href="/post/${post.slug}" class="view-btn">View Post</a>
                </div>
              </div>
            `;
          });
          
          approvedSuggestions.innerHTML = approvedHTML || '<div class="empty-state">No approved suggestions for your posts.</div>';
        } else {
          approvedSuggestions.innerHTML = '<div class="empty-state">No approved suggestions for your posts.</div>';
        }
      }
      
      // Render rejected suggestions
      if (rejectedSuggestions) {
        if (rejectedSugs.length > 0) {
          let rejectedHTML = '';
          rejectedSugs.forEach(suggestion => {
            if (!suggestion) return; // Skip invalid suggestions
            
            const post = posts.find(p => p && p._id === suggestion.postId);
            if (!post) return; // Skip if post not found
            
            const date = new Date(suggestion.createdAt).toLocaleDateString();
            const suggestedBy = suggestion.suggestedBy && suggestion.suggestedBy.username ? 
              suggestion.suggestedBy.username : 'Unknown User';
            
            rejectedHTML += `
              <div class="suggestion-item">
                <div class="suggestion-header">
                  <div class="suggestion-info">
                    <span class="suggestion-post">Post: <a href="/post/${post.slug}">${post.title}</a></span>
                    <span class="suggestion-author">By: <a href="/user/${suggestedBy}">${suggestedBy}</a></span>
                    <span class="suggestion-date">Date: ${date}</span>
                  </div>
                </div>
                <div class="suggestion-message">
                  <strong>Message:</strong> ${suggestion.message || 'No message provided'}
                </div>
                <div class="suggestion-actions">
                  <a href="/post/${post.slug}" class="view-btn">View Post</a>
                </div>
              </div>
            `;
          });
          
          rejectedSuggestions.innerHTML = rejectedHTML || '<div class="empty-state">No rejected suggestions for your posts.</div>';
        } else {
          rejectedSuggestions.innerHTML = '<div class="empty-state">No rejected suggestions for your posts.</div>';
        }
      }
    } catch (error) {
      console.error('Error fetching post suggestions:', error);
      postSuggestionsSection.style.display = 'none';
    }
  };

  // Fetch link reports
  const fetchLinkReports = async () => {
    try {
      if (!userData || !userData.username) {
        console.error('User data not available');
        linkReportsSection.style.display = 'none';
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        linkReportsSection.style.display = 'none';
        return;
      }
      
      // First hide the section until we know if there are reports
      linkReportsSection.style.display = 'none';
      
      // Fetch user's posts
      const postsResponse = await fetch(`/api/users/${userData.username}/posts`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!postsResponse.ok) {
        throw new Error('Failed to fetch user posts');
      }
      
      const posts = await postsResponse.json();
      
      if (!posts || posts.length === 0) {
        return;
      }
      
      // Fetch link reports for each post
      let allReports = [];
      
      for (const post of posts) {
        if (!post || !post._id) continue; // Skip invalid posts
        
        try {
          const reportsResponse = await fetch(`/api/linkreports/post/${post._id}`, {
            headers: {
              'x-auth-token': token
            }
          });
          
          if (reportsResponse.ok) {
            const reports = await reportsResponse.json();
            if (reports && Array.isArray(reports)) {
              allReports = [...allReports, ...reports];
            }
          }
        } catch (error) {
          console.error(`Error fetching link reports for post ${post._id}:`, error);
        }
      }
      
      if (allReports.length === 0) {
        return;
      }
      
      // Show the section since we have reports
      linkReportsSection.style.display = 'block';
      
      // Group reports by status
      const pendingReps = allReports.filter(r => r && r.status === 'pending');
      const resolvedReps = allReports.filter(r => r && r.status === 'resolved');
      const dismissedReps = allReports.filter(r => r && r.status === 'dismissed');
      
      // Render pending reports
      if (pendingReports) {
        if (pendingReps.length > 0) {
          let pendingHTML = '';
          pendingReps.forEach(report => {
            if (!report) return; // Skip invalid reports
            
            const post = posts.find(p => p && p._id.toString() === report.postId.toString());
            if (!post) return; // Skip if post not found
            
            const date = new Date(report.createdAt).toLocaleDateString();
            
            // Get link details safely
            let groupName = 'Unknown Group';
            let linkLabel = 'Unknown Link';
            let linkUrl = '#';
            
            try {
              if (post.downloadGroups && Array.isArray(post.downloadGroups) && 
                  report.groupIndex >= 0 && report.groupIndex < post.downloadGroups.length) {
                const group = post.downloadGroups[report.groupIndex];
                if (group) {
                  groupName = group.name || 'Unknown Group';
                  
                  if (group.links && Array.isArray(group.links) && 
                      report.linkIndex >= 0 && report.linkIndex < group.links.length) {
                    const link = group.links[report.linkIndex];
                    if (link) {
                      linkLabel = link.label || 'Unknown Link';
                      linkUrl = link.url || '#';
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error accessing link details:', error);
            }
            
            const reporterUsername = report.reporter && report.reporter.username ? 
              report.reporter.username : 'Unknown User';
            
            pendingHTML += `
              <div class="report-item">
                <div class="report-header">
                  <div class="report-info">
                    <span class="report-post">Post: <a href="/post/${post.slug}">${post.title}</a></span>
                    <span class="report-reporter">Reported by: <a href="/user/${reporterUsername}">${reporterUsername}</a></span>
                    <span class="report-date">Date: ${date}</span>
                  </div>
                </div>
                <div class="report-details">
                  <p><strong>Group:</strong> ${groupName}</p>
                  <p><strong>Link:</strong> ${linkLabel}</p>
                  <p><strong>URL:</strong> <a href="${linkUrl}" target="_blank">${linkUrl}</a></p>
                  <p><strong>Reason:</strong> ${report.reason || 'No reason provided'}</p>
                </div>
                <div class="report-actions">
                  <div class="report-fix-form">
                    <input type="text" id="new-url-${report._id}" placeholder="Enter new URL" value="${linkUrl}">
                    <button class="fix-btn" onclick="updateLink('${report._id}')">Update Link</button>
                  </div>
                  <button class="dismiss-btn" onclick="dismissReport('${report._id}')">Dismiss Report</button>
                  <a href="/post/${post.slug}" class="view-btn">View Post</a>
                </div>
              </div>
            `;
          });
          
          pendingReports.innerHTML = pendingHTML || '<div class="empty-state">No pending link reports for your posts.</div>';
        } else {
          pendingReports.innerHTML = '<div class="empty-state">No pending link reports for your posts.</div>';
        }
      }
      
      // Render resolved reports
      if (resolvedReports) {
        if (resolvedReps.length > 0) {
          let resolvedHTML = '';
          resolvedReps.forEach(report => {
            if (!report) return; // Skip invalid reports
            
            const post = posts.find(p => p && p._id.toString() === report.postId.toString());
            if (!post) return; // Skip if post not found
            
            const date = new Date(report.createdAt).toLocaleDateString();
            
            // Get link details safely
            let groupName = 'Unknown Group';
            let linkLabel = 'Unknown Link';
            let linkUrl = '#';
            
            try {
              if (post.downloadGroups && Array.isArray(post.downloadGroups) && 
                  report.groupIndex >= 0 && report.groupIndex < post.downloadGroups.length) {
                const group = post.downloadGroups[report.groupIndex];
                if (group) {
                  groupName = group.name || 'Unknown Group';
                  
                  if (group.links && Array.isArray(group.links) && 
                      report.linkIndex >= 0 && report.linkIndex < group.links.length) {
                    const link = group.links[report.linkIndex];
                    if (link) {
                      linkLabel = link.label || 'Unknown Link';
                      linkUrl = link.url || '#';
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error accessing link details:', error);
            }
            
            const reporterUsername = report.reporter && report.reporter.username ? 
              report.reporter.username : 'Unknown User';
            
            resolvedHTML += `
              <div class="report-item">
                <div class="report-header">
                  <div class="report-info">
                    <span class="report-post">Post: <a href="/post/${post.slug}">${post.title}</a></span>
                    <span class="report-reporter">Reported by: <a href="/user/${reporterUsername}">${reporterUsername}</a></span>
                    <span class="report-date">Date: ${date}</span>
                  </div>
                </div>
                <div class="report-details">
                  <p><strong>Group:</strong> ${groupName}</p>
                  <p><strong>Link:</strong> ${linkLabel}</p>
                  <p><strong>URL:</strong> <a href="${linkUrl}" target="_blank">${linkUrl}</a></p>
                  <p><strong>Reason:</strong> ${report.reason || 'No reason provided'}</p>
                </div>
                <div class="report-actions">
                  <a href="/post/${post.slug}" class="view-btn">View Post</a>
                </div>
              </div>
            `;
          });
          
          resolvedReports.innerHTML = resolvedHTML || '<div class="empty-state">No resolved link reports for your posts.</div>';
        } else {
          resolvedReports.innerHTML = '<div class="empty-state">No resolved link reports for your posts.</div>';
        }
      }
      
      // Render dismissed reports
      if (dismissedReports) {
        if (dismissedReps.length > 0) {
          let dismissedHTML = '';
          dismissedReps.forEach(report => {
            if (!report) return; // Skip invalid reports
            
            const post = posts.find(p => p && p._id.toString() === report.postId.toString());
            if (!post) return; // Skip if post not found
            
            const date = new Date(report.createdAt).toLocaleDateString();
            
            // Get link details safely
            let groupName = 'Unknown Group';
            let linkLabel = 'Unknown Link';
            let linkUrl = '#';
            
            try {
              if (post.downloadGroups && Array.isArray(post.downloadGroups) && 
                  report.groupIndex >= 0 && report.groupIndex < post.downloadGroups.length) {
                const group = post.downloadGroups[report.groupIndex];
                if (group) {
                  groupName = group.name || 'Unknown Group';
                  
                  if (group.links && Array.isArray(group.links) && 
                      report.linkIndex >= 0 && report.linkIndex < group.links.length) {
                    const link = group.links[report.linkIndex];
                    if (link) {
                      linkLabel = link.label || 'Unknown Link';
                      linkUrl = link.url || '#';
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error accessing link details:', error);
            }
            
            const reporterUsername = report.reporter && report.reporter.username ? 
              report.reporter.username : 'Unknown User';
            
            dismissedHTML += `
              <div class="report-item">
                <div class="report-header">
                  <div class="report-info">
                    <span class="report-post">Post: <a href="/post/${post.slug}">${post.title}</a></span>
                    <span class="report-reporter">Reported by: <a href="/user/${reporterUsername}">${reporterUsername}</a></span>
                    <span class="report-date">Date: ${date}</span>
                  </div>
                </div>
                <div class="report-details">
                  <p><strong>Group:</strong> ${groupName}</p>
                  <p><strong>Link:</strong> ${linkLabel}</p>
                  <p><strong>URL:</strong> <a href="${linkUrl}" target="_blank">${linkUrl}</a></p>
                  <p><strong>Reason:</strong> ${report.reason || 'No reason provided'}</p>
                </div>
                <div class="report-actions">
                  <a href="/post/${post.slug}" class="view-btn">View Post</a>
                </div>
              </div>
            `;
          });
          
          dismissedReports.innerHTML = dismissedHTML || '<div class="empty-state">No dismissed link reports for your posts.</div>';
        } else {
          dismissedReports.innerHTML = '<div class="empty-state">No dismissed link reports for your posts.</div>';
        }
      }
    } catch (error) {
      console.error('Error fetching link reports:', error);
      linkReportsSection.style.display = 'none';
    }
  };

// Mark a notification as read
window.markAsRead = async (notificationId) => {
  if (!notificationId) {
    console.error('Invalid notification ID');
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await fetch(`/api/auth/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'x-auth-token': token
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to mark notification as read');
    }
    
    // Update UI
    const notificationItem = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
    if (notificationItem) {
      notificationItem.classList.remove('unread');
      const markReadBtn = notificationItem.querySelector('.mark-read-btn');
      if (markReadBtn) {
        markReadBtn.remove();
      }
    }
    
    // Update notification badge in nav
    updateNavLinks(userData);
    
    // Show success message
    showNotification('success', 'Notification marked as read');
  } catch (error) {
    console.error('Error marking notification as read:', error);
    showNotification('error', error.message || 'Failed to mark notification as read');
  }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch('/api/auth/notifications/read-all', {
      method: 'PUT',
      headers: {
        'x-auth-token': token
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read');
    }
    
    // Update UI directly instead of just refreshing
    document.querySelectorAll('.notification-item').forEach(item => {
      item.classList.remove('unread');
      const markReadBtn = item.querySelector('.mark-read-btn');
      if (markReadBtn) {
        markReadBtn.remove();
      }
    });
    
    // Update notification badge in nav
    updateNavLinks(userData);
    
    // Show success message
    showNotification('success', 'All notifications marked as read');
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    showNotification('error', 'Failed to mark all notifications as read');
  }
};

// Approve a suggestion
window.approveSuggestion = async (id) => {
  try {
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
    
    // Show success message
    showNotification('success', 'Suggestion approved successfully!');
    
    // Refresh suggestions after a brief delay
    setTimeout(() => {
      fetchPostSuggestions();
    }, 1500);
  } catch (error) {
    console.error('Error approving suggestion:', error);
    showNotification('error', error.message || 'Failed to approve suggestion');
  }
};

// Reject a suggestion
window.rejectSuggestion = async (id) => {
  try {
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
    
    // Show success message
    showNotification('success', 'Suggestion rejected successfully!');
    
    // Refresh suggestions after a brief delay
    setTimeout(() => {
      fetchPostSuggestions();
    }, 1500);
  } catch (error) {
    console.error('Error rejecting suggestion:', error);
    showNotification('error', error.message || 'Failed to reject suggestion');
  }
};

// Update link from report
window.updateLink = async (reportId) => {
  try {
    const newUrl = document.getElementById(`new-url-${reportId}`).value.trim();
    
    if (!newUrl) {
      alert('Please enter a new URL');
      return;
    }
    
    const token = localStorage.getItem('token');
    
    const response = await fetch(`/api/linkreports/${reportId}/update-link`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({ newUrl })
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update link');
    }
    
    // Show success message
    showNotification('success', 'Link updated successfully!');
    
    // Refresh link reports after a brief delay
    setTimeout(() => {
      fetchLinkReports();
    }, 1500);
  } catch (error) {
    console.error('Error updating link:', error);
    showNotification('error', error.message || 'Failed to update link');
  }
};

// Dismiss link report
window.dismissReport = async (reportId) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`/api/linkreports/${reportId}/dismiss`, {
      method: 'PUT',
      headers: {
        'x-auth-token': token
      }
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to dismiss report');
    }
    
    // Show success message
    showNotification('success', 'Report dismissed successfully!');
    
    // Refresh link reports after a brief delay
    setTimeout(() => {
      fetchLinkReports();
    }, 1500);
  } catch (error) {
    console.error('Error dismissing report:', error);
    showNotification('error', error.message || 'Failed to dismiss report');
  }
};

// Show notification
const showNotification = (type, message) => {
  // Remove any existing notifications
  const existingNotification = document.querySelector('.page-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `page-notification ${type}`;
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

// Filter notifications
filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    
    // Update active button
    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Update current filter and refresh notifications
    currentFilter = filter;
    fetchNotifications();
  });
});

// Mark all as read button
markAllReadBtn.addEventListener('click', markAllNotificationsAsRead);

// Handle tab switching in suggestions section
document.querySelectorAll('.suggestions-section .tab-btn').forEach(button => {
  button.addEventListener('click', () => {
    const tab = button.dataset.tab;
    
    // Update active button
    document.querySelectorAll('.suggestions-section .tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    button.classList.add('active');
    
      // Hide all tab contents
      document.querySelectorAll('.suggestions-section .tab-content').forEach(content => {
        content.classList.add('hidden');
      });
      
      // Show selected tab content
      document.getElementById(tab).classList.remove('hidden');
    });
  });

  // Handle tab switching in link reports section
  document.querySelectorAll('.link-reports-section .tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      
      // Update active button
      document.querySelectorAll('.link-reports-section .tab-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      button.classList.add('active');
      
      // Hide all tab contents
      document.querySelectorAll('.link-reports-section .tab-content').forEach(content => {
        content.classList.add('hidden');
      });
      
      // Show selected tab content
      document.getElementById(tab).classList.remove('hidden');
    });
  });

  // Initialize page
  const init = async () => {
    const isLoggedIn = await checkAuth();
    if (isLoggedIn) {
      fetchNotifications();
      
      // Delay these calls slightly to ensure DOM is ready
      setTimeout(() => {
        fetchPostSuggestions();
        fetchLinkReports();
      }, 100);
    }
  };
  
  init();
});