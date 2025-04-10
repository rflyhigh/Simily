document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const noticesSection = document.getElementById('notices');
  const recentSoftwareGrid = document.getElementById('recent-software');
  const popularSoftwareGrid = document.getElementById('popular-software');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');

  // Current filter period for popular software
  let currentPeriod = 'all';

  // Add animation to elements when they come into view
  const animateOnScroll = () => {
    const elements = document.querySelectorAll('.software-card, .section-header, .notice');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    elements.forEach(element => {
      element.style.opacity = '0';
      element.style.transform = 'translateY(20px)';
      element.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
      observer.observe(element);
    });
  };

  // Fetch and display notices
  const fetchNotices = async () => {
    try {
      const response = await fetch('/api/notices');
      const notices = await response.json();

      if (notices.length === 0) {
        noticesSection.style.display = 'none';
        return;
      }

      let noticesHTML = '';
      notices.forEach(notice => {
        noticesHTML += `
          <div class="notice">
            <p>${notice.content}</p>
          </div>
        `;
      });

      noticesSection.innerHTML = noticesHTML;
      animateOnScroll();
    } catch (error) {
      console.error('Error fetching notices:', error);
      noticesSection.style.display = 'none';
    }
  };

  // Fetch and display recent software
  const fetchRecentSoftware = async () => {
    try {
      recentSoftwareGrid.innerHTML = '<div class="loading">Loading recent software...</div>';
      
      const response = await fetch('/api/software/recent');
      const software = await response.json();

      if (software.length === 0) {
        recentSoftwareGrid.innerHTML = '<div class="empty-state">No software available yet.</div>';
        return;
      }

      let softwareHTML = '';
      software.forEach(item => {
        softwareHTML += createSoftwareCard(item);
      });

      recentSoftwareGrid.innerHTML = softwareHTML;
      animateOnScroll();
    } catch (error) {
      console.error('Error fetching recent software:', error);
      recentSoftwareGrid.innerHTML = '<div class="error-message">Failed to load recent software.</div>';
    }
  };

  // Fetch and display popular software
  const fetchPopularSoftware = async (period = 'all') => {
    try {
      popularSoftwareGrid.innerHTML = '<div class="loading">Loading popular software...</div>';
      
      const response = await fetch(`/api/software/popular?period=${period}`);
      const software = await response.json();

      if (software.length === 0) {
        popularSoftwareGrid.innerHTML = '<div class="empty-state">No software available yet.</div>';
        return;
      }

      let softwareHTML = '';
      software.forEach(item => {
        softwareHTML += createSoftwareCard(item);
      });

      popularSoftwareGrid.innerHTML = softwareHTML;
      animateOnScroll();
    } catch (error) {
      console.error('Error fetching popular software:', error);
      popularSoftwareGrid.innerHTML = '<div class="error-message">Failed to load popular software.</div>';
    }
  };

  // Create HTML for a software card
  const createSoftwareCard = (software) => {
    const tags = software.tags.slice(0, 3).map(tag => 
      `<span class="tag">${tag}</span>`
    ).join('');

    return `
      <div class="software-card">
        <img src="${software.imageUrl}" alt="${software.title}" class="software-image">
        <div class="software-info">
          <h3 class="software-title">${software.title}</h3>
          <p class="software-description">${truncateText(software.description, 100)}</p>
          <div class="software-tags">
            ${tags}
          </div>
          <a href="/software/${software._id}" class="view-btn">View Details</a>
        </div>
      </div>
    `;
  };

  // Helper function to truncate text
  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Handle filter button clicks with animation
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const period = button.dataset.period;
      
      // Update active button with animation
      filterButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.style.transform = '';
      });
      
      button.classList.add('active');
      button.style.transform = 'scale(1.05)';
      setTimeout(() => {
        button.style.transform = '';
      }, 300);
      
      // Update current period and fetch data
      currentPeriod = period;
      fetchPopularSoftware(period);
    });
  });

  // Handle search with animation
  searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
      searchButton.classList.add('searching');
      setTimeout(() => {
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
      }, 300);
    }
  });

  // Allow search on Enter key
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchButton.click();
    }
  });

  // Add focus animation to search input
  searchInput.addEventListener('focus', () => {
    searchInput.parentElement.classList.add('focused');
  });

  searchInput.addEventListener('blur', () => {
    searchInput.parentElement.classList.remove('focused');
  });

  // Initialize page
  fetchNotices();
  fetchRecentSoftware();
  fetchPopularSoftware(currentPeriod);
});