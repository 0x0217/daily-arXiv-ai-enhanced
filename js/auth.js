// Simple client-side authentication system for GitHub Pages
// Note: This is NOT secure and can be easily bypassed. It's just a basic deterrent.

// Configuration
const AUTH_CONFIG = {
  // You can set a simple password here
  // For better security, consider using environment-specific configs
  password: "arxiv2025", // Change this to your desired password, not meant to be secure, just a deterrent
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  maxAttempts: 5,
  lockoutTime: 15 * 60 * 1000, // 15 minutes lockout after max attempts
};

// Check if user is authenticated
function isAuthenticated() {
  const authData = getAuthData();
  if (!authData) return false;

  // Check if session has expired
  if (Date.now() > authData.expiresAt) {
    clearAuthData();
    return false;
  }

  return authData.authenticated === true;
}

// Get authentication data from localStorage
function getAuthData() {
  try {
    const data = localStorage.getItem('arxiv_auth');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error parsing auth data:', error);
    return null;
  }
}

// Set authentication data
function setAuthData(authenticated = false) {
  const authData = {
    authenticated,
    timestamp: Date.now(),
    expiresAt: Date.now() + AUTH_CONFIG.sessionTimeout
  };

  localStorage.setItem('arxiv_auth', JSON.stringify(authData));
}

// Clear authentication data
function clearAuthData() {
  localStorage.removeItem('arxiv_auth');
  localStorage.removeItem('arxiv_attempts');
}

// Get failed attempt data
function getAttemptData() {
  try {
    const data = localStorage.getItem('arxiv_attempts');
    return data ? JSON.parse(data) : { count: 0, lastAttempt: 0 };
  } catch (error) {
    return { count: 0, lastAttempt: 0 };
  }
}

// Set failed attempt data
function setAttemptData(count, lastAttempt = Date.now()) {
  const attemptData = { count, lastAttempt };
  localStorage.setItem('arxiv_attempts', JSON.stringify(attemptData));
}

// Check if user is locked out
function isLockedOut() {
  const attemptData = getAttemptData();
  if (attemptData.count >= AUTH_CONFIG.maxAttempts) {
    const timeSinceLast = Date.now() - attemptData.lastAttempt;
    return timeSinceLast < AUTH_CONFIG.lockoutTime;
  }
  return false;
}

// Get remaining lockout time
function getRemainingLockoutTime() {
  const attemptData = getAttemptData();
  const timeSinceLast = Date.now() - attemptData.lastAttempt;
  const remaining = AUTH_CONFIG.lockoutTime - timeSinceLast;
  return Math.max(0, remaining);
}

// Attempt authentication
function authenticate(password) {
  if (isLockedOut()) {
    const remainingTime = Math.ceil(getRemainingLockoutTime() / 1000 / 60);
    throw new Error(`Account locked. Try again in ${remainingTime} minutes.`);
  }

  if (password === AUTH_CONFIG.password) {
    setAuthData(true);
    // Clear failed attempts on successful login
    localStorage.removeItem('arxiv_attempts');
    return true;
  } else {
    // Increment failed attempts
    const attemptData = getAttemptData();
    setAttemptData(attemptData.count + 1);

    const remainingAttempts = AUTH_CONFIG.maxAttempts - (attemptData.count + 1);
    if (remainingAttempts > 0) {
      throw new Error(`Invalid password. ${remainingAttempts} attempts remaining.`);
    } else {
      throw new Error(`Too many failed attempts. Account locked for ${AUTH_CONFIG.lockoutTime / 1000 / 60} minutes.`);
    }
  }
}

// Logout
function logout() {
  clearAuthData();
  showLoginModal();
}

// Show login modal
function showLoginModal() {
  // Remove existing modal if any
  const existingModal = document.querySelector('.auth-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.className = 'auth-modal';

  const isLocked = isLockedOut();
  const remainingTime = isLocked ? Math.ceil(getRemainingLockoutTime() / 1000 / 60) : 0;
  const attemptData = getAttemptData();
  const remainingAttempts = Math.max(0, AUTH_CONFIG.maxAttempts - attemptData.count);

  modal.innerHTML = `
    <div class="auth-modal-content">
      <div class="auth-header">
        <div class="auth-logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z" fill="#667eea"/>
          </svg>
        </div>
        <h2>Daily arXiv AI Enhanced</h2>
        <p>Please enter the access password</p>
      </div>

      <div class="auth-body">
        ${isLocked ? `
          <div class="lockout-notice">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 7C13.1 7 14 7.9 14 9V10C14.55 10 15 10.45 15 11V16C15 16.55 14.55 17 14 17H10C9.45 17 9 16.55 9 16V11C9 10.45 9.45 10 10 10V9C10 7.9 10.9 7 12 7ZM12 8.2C11.2 8.2 10.8 8.7 10.8 9V10H13.2V9C13.2 8.7 12.8 8.2 12 8.2Z" fill="#ef4444"/>
            </svg>
            <h3>Account Locked</h3>
            <p>Too many failed attempts. Please wait ${remainingTime} minutes before trying again.</p>
          </div>
        ` : `
          <form class="auth-form" id="authForm">
            <div class="form-group">
              <label for="password">Password:</label>
              <input type="password" id="password" name="password" required placeholder="Enter password" ${isLocked ? 'disabled' : ''}>
            </div>

            <div class="auth-info">
              <p class="attempts-info">Attempts remaining: <strong>${remainingAttempts}</strong></p>
              <p class="security-note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L9 7V9C9 10.1 9.9 11 11 11V22H13V11C14.1 11 15 10.1 15 9Z" fill="#f59e0b"/>
                </svg>
                This is basic client-side protection and can be bypassed by technical users.
              </p>
            </div>

            <button type="submit" class="auth-button" ${isLocked ? 'disabled' : ''}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" fill="currentColor"/>
              </svg>
              Access Site
            </button>
          </form>
        `}

        <div class="auth-footer">
          <p>🔐 Repository Owner Access Only</p>
          <small>This page is protected to limit access to authorized users.</small>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Focus on password input if not locked
  if (!isLocked) {
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
      setTimeout(() => passwordInput.focus(), 100);
    }

    // Handle form submission
    const form = document.getElementById('authForm');
    if (form) {
      form.addEventListener('submit', handleAuthSubmit);
    }
  }

  // Update lockout timer if locked
  if (isLocked) {
    const timer = setInterval(() => {
      if (!isLockedOut()) {
        clearInterval(timer);
        showLoginModal(); // Refresh the modal
      } else {
        const remainingTime = Math.ceil(getRemainingLockoutTime() / 1000 / 60);
        const notice = document.querySelector('.lockout-notice p');
        if (notice) {
          notice.textContent = `Too many failed attempts. Please wait ${remainingTime} minutes before trying again.`;
        }
      }
    }, 1000);
  }
}

// Handle authentication form submission
function handleAuthSubmit(event) {
  event.preventDefault();

  const passwordInput = document.getElementById('password');
  const password = passwordInput.value;
  const errorContainer = document.querySelector('.auth-error');

  // Remove existing error
  if (errorContainer) {
    errorContainer.remove();
  }

  try {
    if (authenticate(password)) {
      // Success - hide modal and show success message
      const modal = document.querySelector('.auth-modal');
      if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
          modal.remove();
          showAuthSuccessMessage();
        }, 300);
      }
    }
  } catch (error) {
    // Show error message
    showAuthError(error.message);
    passwordInput.value = '';
    passwordInput.focus();

    // If locked out, refresh modal
    if (isLockedOut()) {
      setTimeout(() => {
        showLoginModal();
      }, 2000);
    }
  }
}

// Show authentication error
function showAuthError(message) {
  const form = document.querySelector('.auth-form');
  if (!form) return;

  const errorDiv = document.createElement('div');
  errorDiv.className = 'auth-error';
  errorDiv.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#ef4444"/>
    </svg>
    ${message}
  `;

  form.insertBefore(errorDiv, form.firstChild);
}

// Show success message
function showAuthSuccessMessage() {
  const successDiv = document.createElement('div');
  successDiv.className = 'auth-success-message';
  successDiv.innerHTML = `
    <div class="success-content">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#10b981"/>
      </svg>
      <h3>Access Granted</h3>
      <p>Welcome to Daily arXiv AI Enhanced!</p>
    </div>
  `;

  document.body.appendChild(successDiv);

  setTimeout(() => {
    successDiv.style.animation = 'fadeOut 0.5s ease';
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.parentNode.removeChild(successDiv);
      }
    }, 500);
  }, 2000);
}

// Initialize authentication
function initAuth() {
  // Only require auth in production (when served from GitHub Pages)
  const isProduction = window.location.hostname.includes('github.io') ||
                      window.location.hostname.includes('githubpages.com') ||
                      window.location.protocol === 'https:';

  // Skip auth in development
  if (!isProduction && window.location.hostname === 'localhost') {
    console.log('Development mode - skipping authentication');
    return;
  }

  if (!isAuthenticated()) {
    showLoginModal();
    return false;
  }

  return true;
}

// Add logout functionality to pages
function addLogoutButton() {
  // Only add logout button if we're in production and authenticated
  const isProduction = window.location.hostname.includes('github.io') ||
                      window.location.hostname.includes('githubpages.com') ||
                      window.location.protocol === 'https:';

  if (!isProduction || !isAuthenticated()) {
    return;
  }

  const headerControls = document.querySelector('.header-controls');
  if (headerControls) {
    const logoutButton = document.createElement('button');
    logoutButton.className = 'icon-button logout-button';
    logoutButton.title = 'Logout';
    logoutButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 7L15.59 8.41 18.17 11H8V13H18.17L15.59 15.59 17 17L22 12L17 7ZM4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z" fill="currentColor"/>
      </svg>
    `;

    logoutButton.addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        logout();
      }
    });

    headerControls.appendChild(logoutButton);
  }
}

// Export functions for use in other files
window.authSystem = {
  initAuth,
  isAuthenticated,
  logout,
  addLogoutButton
};
