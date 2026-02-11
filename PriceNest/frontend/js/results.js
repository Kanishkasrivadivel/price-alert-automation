// =====================================================
// RESULTS PAGE - INITIALIZATION
// =====================================================

let currentQuery = '';
let productsData = [];
let storeChart = null;
let trendChart = null;
let trendUnit = "hour"; // hour | day | week

document.addEventListener('DOMContentLoaded', function () {
    // Get search query from URL
    currentQuery = getUrlParam('q');

    if (!currentQuery) {
        window.location.href = 'index.html';
        return;
    }

    // Update page title and search input
    document.getElementById('searchQuery').textContent = `Results for "${currentQuery}"`;
    document.getElementById('searchInput').value = currentQuery;
    document.getElementById('alertProduct').value = currentQuery;

    // Update navigation
    updateNavigation();

    // Initialize tabs
    initializeTabs();

    // Load mock data
    loadProducts();

    // Initialize alert form
    initializeAlertForm();
});

// =====================================================
// NAVIGATION UPDATE
// =====================================================

function updateNavigation() {
    const navButtons = document.getElementById('navButtons');

    if (isLoggedIn()) {
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
    } else {
        navButtons.innerHTML = `
      <a href="login.html"><button class="btn">Login</button></a>
      <a href="signup.html"><button class="btn primary">Sign Up</button></a>
    `;
    }
}

// =====================================================
// TAB FUNCTIONALITY
// =====================================================

function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const targetTab = this.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            // Load analytics when analytics tab is clicked
            if (targetTab === 'analytics' && !storeChart) {
                loadAnalytics();
            }
        });
    });
}

// =====================================================
// SEARCH FUNCTIONALITY
// =====================================================

function handleNewSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();

    if (!query) {
        showNotification('Please enter a product name', 'warning');
        return;
    }

    window.location.href = `results.html?q=${encodeURIComponent(query)}`;
}

// Allow Enter key
document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && document.activeElement.id === 'searchInput') {
        handleNewSearch();
    }
});

// =====================================================
// LOAD PRODUCTS (REAL DATA)
// =====================================================

async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '<div class="spinner"></div>';

    try {
        console.log(`Fetching results for: ${currentQuery}`);

        // Sync wishlist first so isInWishlist works correctly during display
        if (isLoggedIn()) {
            await syncWishlist();
            updateNavigation();
        }

        // Exact match to working compare.js logic
        const response = await fetch(
            `http://127.0.0.1:8000/compare?q=${encodeURIComponent(currentQuery)}`
        );

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        productsData = data.results || [];

        displayProducts(productsData);
    } catch (err) {
        console.error('Failed to load products:', err);
        showNotification('Failed to fetch comparison data from backend', 'error');

        grid.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
            </div>
            <div class="empty-state-title">Backend connection failed</div>
            <div class="empty-state-text">
                Make sure the backend server is running on port 8000.
            </div>
            <button onclick="location.reload()" class="btn primary" style="margin-top:16px;">Try Again</button>
          </div>
        `;
    }
}



function displayProducts(products) {
    const grid = document.getElementById('productsGrid');

    if (products.length === 0) {
        grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
        </div>
        <div class="empty-state-title">No products found</div>
        <div class="empty-state-text">Try searching for something else</div>
      </div>
    `;
        return;
    }

    grid.innerHTML = products.map((product, index) => {
        const productId = product.id || `p-${index}`;
        // backend_scrapper.py returns: title, source, link, price_numeric, price (string), image, store_logo
        // We use price_numeric for calculations/sorting if needed, but display the pre-formatted 'price' or format price_numeric.
        // Let's use price_numeric with toLocaleString to be safe and consistent with the template.

        return `
    <div class="product-card">
      <button class="wishlist-btn ${isInWishlist(productId) ? 'active' : ''}" onclick="toggleWishlist('${productId}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </button>
      
      <img src="${product.image || 'https://via.placeholder.com/300x200?text=No+Image'}" alt="${product.title}" class="product-image" />
      
      <div class="product-store">
        ${product.store_logo ? `<img src="${product.store_logo}" alt="${product.source}" style="width:16px;height:16px;margin-right:4px;vertical-align:middle">` : ''}
        ${product.source}
      </div>
      <div class="product-name" title="${product.title}">${product.title}</div>
      
      <div class="product-price">₹${(product.price_numeric || 0).toLocaleString('en-IN')}</div>
      ${index === 0 ? '<div class="product-discount">Best Price Match</div>' : ''}
      
      <div class="product-actions">
        <a href="${product.link}" target="_blank" class="btn primary">View Deal</a>
      </div>
    </div>
  `;
    }).join('');
}

// =====================================================
// WISHLIST FUNCTIONALITY
// =====================================================

async function toggleWishlist(productId) {
    if (!isLoggedIn()) {
        showNotification('Please login to add to wishlist', 'warning');
        setTimeout(() => {
            window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
        }, 1500);
        return;
    }

    const pid = typeof productId === 'string' ? parseInt(productId) : productId;
    const product = productsData.find(p => p.id === pid);
    if (!product) {
        console.error('Product not found in data for ID:', pid);
        return;
    }

    const btn = event.currentTarget;

    if (isInWishlist(pid)) {
        const success = await removeFromWishlist(pid);
        if (success) btn.classList.remove('active');
    } else {
        const success = await addToWishlist(product);
        if (success) btn.classList.add('active');
    }
}

// =====================================================
// ANALYTICS
// =====================================================

// =====================================================
// ANALYTICS
// =====================================================

function setTrendUnit(unit) {
    trendUnit = unit;
    loadAnalytics();
}

function toggleUnitButtons(unit) {
    const units = ['hour', 'day', 'week'];
    units.forEach(u => {
        const btn = document.getElementById(`unit-${u}`);
        if (btn) {
            if (u === unit) {
                btn.classList.add('primary');
                btn.classList.remove('outline');
            } else {
                btn.classList.add('outline');
                btn.classList.remove('primary');
            }
        }
    });
}

async function loadAnalytics() {
    console.log('Starting loadAnalytics for:', currentQuery);
    try {
        toggleUnitButtons(trendUnit);
        const data = await apiGet('/analytics', { q: currentQuery });
        console.log('Analytics data received:', data);

        if (!data.summary || !data.price_trend || data.price_trend.length === 0) {
            console.warn('Empty analytics data');
            showNotification('No analytics data available for this product', 'info');
            return;
        }

        const summary = data.summary;
        const history = data.price_trend;

        // 1. Update Summary Cards
        try {
            document.querySelector('#lowestPrice .stat-value').textContent = formatCurrency(summary.lowest_price);
            document.querySelector('#avgPrice .stat-value').textContent = formatCurrency(summary.average_price);
            document.querySelector('#priceRange .stat-value').textContent = `${formatCurrency(summary.lowest_price)} - ${formatCurrency(summary.highest_price)}`;
            document.querySelector('#stabilityScore .stat-value').textContent = data.volatility.stability;
            if (document.getElementById('currentBestPrice')) {
                document.getElementById('currentBestPrice').textContent = formatCurrency(summary.lowest_price);
            }
        } catch (cardErr) {
            console.error('Error updating summary cards:', cardErr);
        }

        // 2. Store Chart
        try {
            if (storeChart) storeChart.destroy();
            storeChart = new Chart(document.getElementById("storeChart"), {
                type: "bar",
                data: {
                    labels: Object.keys(data.store_prices),
                    datasets: [{
                        data: Object.values(data.store_prices),
                        backgroundColor: "#6366f1",
                        borderRadius: 6,
                        maxBarThickness: 32,
                        categoryPercentage: 0.7
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: ctx => formatCurrency(ctx.parsed.y) } }
                    },
                    scales: {
                        y: { ticks: { callback: v => formatCurrency(v), color: '#b8c1ec', font: { size: 11 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                        x: { ticks: { color: '#b8c1ec', font: { size: 11 } }, grid: { display: false } }
                    }
                }
            });
        } catch (chart1Err) {
            console.error('Error creating store chart:', chart1Err);
        }

        // 3. Trend Chart
        try {
            const bucketed = {};
            history.forEach(h => {
                const d = new Date(h.timestamp);
                if (trendUnit === "hour") d.setMinutes(0, 0, 0);
                else if (trendUnit === "day") d.setHours(0, 0, 0, 0);
                else if (trendUnit === "week") {
                    const day = d.getDay() || 7;
                    d.setDate(d.getDate() - day + 1);
                    d.setHours(0, 0, 0, 0);
                }
                const key = `${h.store}_${d.toISOString()}`;
                if (!bucketed[key]) bucketed[key] = { store: h.store, time: d, prices: [] };
                bucketed[key].prices.push(h.price);
            });

            const grouped = {};
            Object.values(bucketed).forEach(b => {
                const avgPrice = b.prices.reduce((a, c) => a + c, 0) / b.prices.length;
                if (!grouped[b.store]) grouped[b.store] = [];
                grouped[b.store].push({ x: b.time, y: Math.round(avgPrice) });
            });

            const colors = ["#22c55e", "#3b82f6", "#f97316"];
            const datasets = Object.entries(grouped).map(([store, values], i) => ({
                label: store,
                data: values.sort((a, b) => a.x - b.x),
                borderColor: colors[i % colors.length],
                backgroundColor: colors[i % colors.length],
                showLine: true,
                spanGaps: true,
                fill: false,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: values.length <= 2 ? 5 : 3,
                pointHoverRadius: 6,
                pointBackgroundColor: "#ffffff"
            }));

            if (trendChart) trendChart.destroy();
            trendChart = new Chart(document.getElementById("trendChart"), {
                type: "line",
                data: { datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    parsing: false,
                    plugins: { legend: { position: "top", labels: { color: '#b8c1ec', boxWidth: 16, font: { size: 11 } } } },
                    scales: {
                        x: {
                            type: "time",
                            time: {
                                unit: trendUnit === "week" ? "day" : trendUnit,
                                tooltipFormat: trendUnit === "hour" ? "MMM d, HH:mm" : trendUnit === "day" ? "MMM d" : "'Week of' MMM d"
                            },
                            ticks: { color: '#b8c1ec', font: { size: 11 } },
                            grid: { display: false }
                        },
                        y: { beginAtZero: false, grace: "5%", ticks: { callback: v => formatCurrency(v), color: '#b8c1ec', font: { size: 11 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
                    }
                }
            });
        } catch (chart2Err) {
            console.error('Error creating trend chart:', chart2Err);
        }

        // 4. Best Time-to-Buy
        document.getElementById("buyInsight").innerText = data.best_time_to_buy || "No insight available";

        // 5. Store Consistency
        try {
            const cheapestCount = data.store_consistency || {};
            const tbody = document.querySelector("#storeTable tbody");
            if (tbody) {
                tbody.innerHTML = "";
                Object.entries(cheapestCount).forEach(([store, count]) => {
                    tbody.innerHTML += `
                        <tr>
                            <td>${store}</td>
                            <td>${count}</td>
                        </tr>
                    `;
                });
            }
        } catch (tableErr) {
            console.error('Error updating store table:', tableErr);
        }
    } catch (err) {
        console.error('Failed to load analytics:', err);
        alert('Analytics Error: ' + err.message);
    }
}

// =====================================================
// ALERT FORM
// =====================================================

function initializeAlertForm() {
    const form = document.getElementById('alertForm');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Check if user is logged in
        if (!isLoggedIn()) {
            showNotification('Please login to create alerts', 'warning');
            setTimeout(() => {
                window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
            }, 1500);
            return;
        }

        const product = document.getElementById('alertProduct').value;
        const targetPrice = parseFloat(document.getElementById('alertPrice').value);
        const email = document.getElementById('alertEmail').value;

        if (!targetPrice || targetPrice <= 0) {
            showNotification('Please enter a valid target price', 'error');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;

        try {
            // Create alert
            const alert = {
                product: product,
                targetPrice: targetPrice,
                email: email || getUserData().email
            };

            await addAlert(alert);
            showNotification('Alert created successfully!', 'success');

            // Reset form
            form.reset();
            document.getElementById('alertProduct').value = currentQuery;
        } catch (err) {
            showNotification('Failed to create alert', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}
