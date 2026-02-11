// =====================================================
// PROFILE PAGE - INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', function () {
    // Check authentication
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    // Update navigation
    updateNavigation();

    // Load profile data
    loadProfile();

    // Initialize form
    initializeForm();
});

// =====================================================
// NAVIGATION UPDATE
// =====================================================

function updateNavigation() {
    const navButtons = document.getElementById('navButtons');
    const userData = getUserData();
    const firstName = userData.firstName || 'User';
    const alertsCount = getAlerts().length;
    const wishlistCount = getWishlist().length;

    navButtons.innerHTML = `
    <button class="nav-icon-btn" onclick="window.location.href='alerts.html'" title="Alerts">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      ${alertsCount > 0 ? `<span class="badge">${alertsCount}</span>` : ''}
    </button>
    
    <button class="nav-icon-btn" onclick="window.location.href='wishlist.html'" title="Wishlist">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
      ${wishlistCount > 0 ? `<span class="badge">${wishlistCount}</span>` : ''}
    </button>
    
    <button class="btn primary" onclick="window.location.href='profile.html'">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
      ${firstName}
    </button>
  `;
}

// =====================================================
// LOAD PROFILE DATA
// =====================================================

function loadProfile() {
    const userData = getUserData();

    if (!userData) {
        window.location.href = 'login.html';
        return;
    }

    // Update profile display
    document.getElementById('profileName').textContent =
        `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'User';
    document.getElementById('profileEmail').textContent = userData.email || '';

    // Update stats
    document.getElementById('alertsCount').textContent = getAlerts().length;
    document.getElementById('wishlistCount').textContent = getWishlist().length;

    // Calculate member since
    if (userData.timestamp) {
        const memberDate = new Date(userData.timestamp);
        const monthYear = memberDate.toLocaleDateString('en-IN', {
            month: 'short',
            year: 'numeric'
        });
        document.getElementById('memberSince').textContent = monthYear;
    }

    // Populate form
    document.getElementById('firstName').value = userData.firstName || '';
    document.getElementById('lastName').value = userData.lastName || '';
    document.getElementById('email').value = userData.email || '';
}

// =====================================================
// FORM HANDLING
// =====================================================

function initializeForm() {
    const form = document.getElementById('profileForm');

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const userData = getUserData();

        // Update user data
        userData.firstName = document.getElementById('firstName').value;
        userData.lastName = document.getElementById('lastName').value;
        userData.email = document.getElementById('email').value;

        // Save to storage
        if (localStorage.getItem('userData')) {
            localStorage.setItem('userData', JSON.stringify(userData));
        } else {
            sessionStorage.setItem('userData', JSON.stringify(userData));
        }

        showNotification('Profile updated successfully!', 'success');

        // Reload profile display
        loadProfile();
        updateNavigation();
    });
}

// =====================================================
// LOGOUT
// =====================================================

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        logout();
    }
}
