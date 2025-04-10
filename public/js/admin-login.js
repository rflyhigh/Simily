// FILE: admin-login.js
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('admin-login-form');
  const loginError = document.getElementById('login-error');

  // Check if already logged in
  if (localStorage.getItem('adminToken')) {
    window.location.href = '/admin';
  }

  // Handle login form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = document.getElementById('admin-token').value.trim();
    
    if (!token) {
      showError('Please enter admin token');
      return;
    }
    
    try {
      // Test the token with a simple API call
      const response = await fetch('/admin/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });
      
      if (!response.ok) {
        throw new Error('Invalid token');
      }
      
      // Store token and redirect
      localStorage.setItem('adminToken', token);
      window.location.href = '/admin';
    } catch (error) {
      console.error('Login error:', error);
      showError('Invalid admin token');
    }
  });

  // Show error message
  function showError(message) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
  }
});