// FILE: /public/js/mod-login.js
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('mod-login-form');
  const loginError = document.getElementById('login-error');

  // Function to show error message
  function showError(message) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
  }

  // Check if already logged in
  if (localStorage.getItem('token')) {
    // Check if user is a mod
    fetch('/mod/check', {
      headers: {
        'x-auth-token': localStorage.getItem('token')
      }
    })
    .then(res => {
      if (!res.ok) {
        throw new Error('Failed to verify mod status');
      }
      return res.json();
    })
    .then(data => {
      if (data.isMod) {
        window.location.href = '/mod';
      } else {
        showError('You do not have moderator privileges');
        localStorage.removeItem('token');
      }
    })
    .catch(err => {
      console.error('Mod check error:', err);
      localStorage.removeItem('token');
    });
  }

  // Handle login form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
      showError('Please fill in all fields');
      return;
    }
    
    try {
      // First, try regular login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid credentials');
      }
      
      const data = await response.json();
      
      // Store token
      localStorage.setItem('token', data.token);
      
      // Check if user is a mod
      const modResponse = await fetch('/mod/check', {
        headers: {
          'x-auth-token': data.token
        }
      });
      
      if (!modResponse.ok) {
        localStorage.removeItem('token');
        throw new Error('Failed to verify moderator status');
      }
      
      const modData = await modResponse.json();
      
      if (!modData.isMod) {
        localStorage.removeItem('token');
        throw new Error('You do not have moderator privileges');
      }
      
      // Redirect to mod panel
      window.location.href = '/mod';
    } catch (error) {
      console.error('Login error:', error);
      showError(error.message || 'Login failed. Please try again.');
    }
  });
});