// =====================================================
// LOGIN FORM HANDLER
// =====================================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;

    // Form validation
    if (!email || !password) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    // Email validation
    if (!isValidEmail(email)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    // Actual login
    fetch('http://127.0.0.1:8000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || 'Login failed');
        }
        return data;
      })
      .then(data => {
        showNotification('Login successful! Redirecting...', 'success');

        const userData = {
          firstName: data.user.first_name,
          lastName: data.user.last_name,
          email: data.user.email,
          loggedIn: true,
          timestamp: new Date().toISOString()
        };

        if (remember) {
          localStorage.setItem('userData', JSON.stringify(userData));
        } else {
          sessionStorage.setItem('userData', JSON.stringify(userData));
        }

        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
      })
      .catch(error => {
        showNotification(error.message, 'error');
      });
  });
}

// =====================================================
// SIGNUP FORM HANDLER
// =====================================================
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');

  // Password strength checker
  if (passwordInput) {
    passwordInput.addEventListener('input', function () {
      const password = this.value;
      const strength = calculatePasswordStrength(password);

      // Update strength bar
      strengthFill.style.width = strength.percentage + '%';
      strengthFill.style.background = strength.color;
      strengthText.textContent = strength.text;
      strengthText.style.color = strength.color;
    });
  }

  // Form submission
  signupForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms').checked;

    // Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    if (!isValidEmail(email)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    if (password.length < 8) {
      showNotification('Password must be at least 8 characters long', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }

    if (!terms) {
      showNotification('Please accept the terms and privacy policy', 'error');
      return;
    }

    // Actual signup
    fetch('http://127.0.0.1:8000/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email: email,
        password: password
      }),
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || 'Signup failed');
        }
        return data;
      })
      .then(data => {
        showNotification('Account created successfully! Redirecting...', 'success');

        const userData = {
          firstName: data.user.first_name,
          lastName: data.user.last_name,
          email: data.user.email,
          loggedIn: true,
          timestamp: new Date().toISOString()
        };

        localStorage.setItem('userData', JSON.stringify(userData));

        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
      })
      .catch(error => {
        showNotification(error.message, 'error');
      });
  });
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Email validation
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Password strength calculator
function calculatePasswordStrength(password) {
  let strength = 0;

  if (password.length === 0) {
    return {
      percentage: 0,
      text: 'Enter a password',
      color: '#6b7280'
    };
  }

  // Length check
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 15;

  // Contains lowercase
  if (/[a-z]/.test(password)) strength += 15;

  // Contains uppercase
  if (/[A-Z]/.test(password)) strength += 15;

  // Contains numbers
  if (/[0-9]/.test(password)) strength += 15;

  // Contains special characters
  if (/[^a-zA-Z0-9]/.test(password)) strength += 15;

  // Determine strength level
  if (strength < 40) {
    return {
      percentage: strength,
      text: 'Weak password',
      color: '#ef4444'
    };
  } else if (strength < 70) {
    return {
      percentage: strength,
      text: 'Medium password',
      color: '#f59e0b'
    };
  } else {
    return {
      percentage: strength,
      text: 'Strong password',
      color: '#10b981'
    };
  }
}

// Notification system
function showNotification(message, type = 'info') {
  // Remove existing notification if any
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  // Add styles
  const styles = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '16px 24px',
    borderRadius: '12px',
    color: 'white',
    fontWeight: '500',
    fontSize: '14px',
    zIndex: '10000',
    animation: 'slideInRight 0.3s ease-out',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
    maxWidth: '400px'
  };

  Object.assign(notification.style, styles);

  // Set background color based on type
  if (type === 'success') {
    notification.style.background = 'linear-gradient(135deg, #10b981, #059669)';
  } else if (type === 'error') {
    notification.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
  } else {
    notification.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
  }

  // Add animation keyframes if not already added
  if (!document.querySelector('#notification-animations')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'notification-animations';
    styleSheet.textContent = `
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes slideOutRight {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100px);
        }
      }
    `;
    document.head.appendChild(styleSheet);
  }

  // Add to page
  document.body.appendChild(notification);

  // Remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 4000);
}

// =====================================================
// SOCIAL LOGIN HANDLERS (Placeholders)
// =====================================================
const socialButtons = document.querySelectorAll('.btn-social');
socialButtons.forEach(button => {
  button.addEventListener('click', function () {
    const provider = this.textContent.trim();
    showNotification(`${provider} login is not yet implemented`, 'info');
  });
});
