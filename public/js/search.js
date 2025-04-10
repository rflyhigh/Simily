document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const searchTitle = document.getElementById('search-title');
  const searchResults = document.getElementById('search-results');
  const tagFilters = document.getElementById('tag-filters');
  const pagination = document.getElementById('pagination');
  const sortSelect = document.getElementById('sort-select');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');

  // Get query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q');
  const tag = urlParams.get('tag');
  const page = parseInt(urlParams.get('page')) || 1;
  const sort = urlParams.get('sort') || 'newest';

  // Set initial sort value
  if (sortSelect) {
    sortSelect.value = sort;
  }

  // Update search input with query
  if (query && searchInput) {
    searchInput.value = query;
  }

  // Update page title based on search type
  if (query) {
    searchTitle.textContent = `Search Results for "${query}"`;
    document.title = `Search: ${query} - Simily`;
  } else if (tag) {
    searchTitle.textContent = `Software Tagged with "${tag}"`;
    document.title = `Tag: ${tag} - Simily`;
  }

  // Fetch search results
  const fetchSearchResults = async () => {
    try {
      searchResults.innerHTML = '<div class="loading">Loading...</div>';
      
      let url;
      if (query) {
        url = `/api/search?q=${encodeURIComponent(query)}`;
      } else if (tag) {
        url = `/api/search?tag=${encodeURIComponent(tag)}`;
      } else {
        url = `/api/software?page=${page}&limit=12`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      let software;
      let totalPages = 1;
      let currentPage = 1;
      
      if (data.software) {
        // Paginated response
        software = data.software;
        totalPages = data.totalPages;
        currentPage = data.currentPage;
      } else {
        // Search results
        software = data;
      }
      
      if (software.length === 0) {
        searchResults.innerHTML = '<div class="empty-state">No software found matching your criteria.</div>';
        return;
      }
      
      // Sort results if needed
      if (sort === 'popular') {
        software.sort((a, b) => b.downloads - a.downloads);
      } else {
        software.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      
      // Render results
      let resultsHTML = '';
      software.forEach(item => {
        resultsHTML += createSoftwareCard(item);
      });
      
      searchResults.innerHTML = resultsHTML;
      
      // Render pagination if needed
      if (!query && !tag && totalPages > 1) {
        renderPagination(currentPage, totalPages);
      } else {
        pagination.innerHTML = '';
      }
      
      // Extract and display unique tags for filtering
      if (!tag) {
        renderTagFilters(software);
      }
    } catch (error) {
      console.error('Error fetching search results:', error);
      searchResults.innerHTML = '<div class="error-message">Failed to load search results.</div>';
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

  // Render pagination controls
  const renderPagination = (currentPage, totalPages) => {
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
      <button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" 
        ${currentPage === 1 ? 'disabled' : `onclick="changePage(${currentPage - 1})"`}>
        Previous
      </button>
    `;
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <button class="page-btn ${i === currentPage ? 'active' : ''}" 
          onclick="changePage(${i})">
          ${i}
        </button>
      `;
    }
    
    // Next button
    paginationHTML += `
      <button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" 
        ${currentPage === totalPages ? 'disabled' : `onclick="changePage(${currentPage + 1})"`}>
        Next
      </button>
    `;
    
    pagination.innerHTML = paginationHTML;
    
    // Add page change function to window
    window.changePage = (page) => {
      const url = new URL(window.location);
      url.searchParams.set('page', page);
      window.location.href = url.toString();
    };
  };

  // Render tag filters
  const renderTagFilters = (software) => {
    // Extract unique tags
    const allTags = software.flatMap(item => item.tags);
    const uniqueTags = [...new Set(allTags)].slice(0, 15); // Limit to 15 tags
    
    if (uniqueTags.length === 0) {
      tagFilters.style.display = 'none';
      return;
    }
    
    let tagsHTML = '<div class="tag-filter-list">';
    uniqueTags.forEach(tag => {
      tagsHTML += `<a href="/search?tag=${encodeURIComponent(tag)}" class="tag">${tag}</a>`;
    });
    tagsHTML += '</div>';
    
    tagFilters.innerHTML = tagsHTML;
  };

  // Handle sort change
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const url = new URL(window.location);
      url.searchParams.set('sort', sortSelect.value);
      window.location.href = url.toString();
    });
  }

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
  fetchSearchResults();
});