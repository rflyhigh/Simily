// FILE: /public/js/login.js
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');

  // Check if already logged in
  if (localStorage.getItem('token')) {
    window.location.href = '/';
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
      
      // Store token and redirect
      localStorage.setItem('token', data.token);
      
      // Redirect to home page or previous page
      const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/';
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Login error:', error);
      showError(error.message || 'Login failed. Please try again.');
    }
  });

  // Show error message
  function showError(message) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
  }
});