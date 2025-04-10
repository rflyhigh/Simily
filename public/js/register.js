// FILE: /public/js/register.js
document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('register-form');
  const registerError = document.getElementById('register-error');

  // Check if already logged in
  if (localStorage.getItem('token')) {
    window.location.href = '/';
  }

  // Handle register form submission
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();
    
    if (!username || !password || !confirmPassword) {
      showError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }
      
      const data = await response.json();
      
      // Store token and redirect
      localStorage.setItem('token', data.token);
      window.location.href = '/';
    } catch (error) {
      console.error('Registration error:', error);
      showError(error.message || 'Registration failed. Please try again.');
    }
  });

  // Show error message
  function showError(message) {
    registerError.textContent = message;
    registerError.classList.remove('hidden');
  }
});