// ===========================
// Configuration
// ===========================
const CONFIG = {
    apiKey: 'AIzaSyDJ9pXCdrVBLO6xK-rbr4qf2CIAxLuy8JE',
    spreadsheetId: '1Armz9c9Tr1mXeGWymyhgUOhhw0cA_QvyTAcc2Q6uA9w',
    range: 'Sheet1!A2:F', // Fetching from row 2 onwards (skipping header)
    refreshInterval: 60000 // 60 seconds
};

// ===========================
// State Management
// ===========================
let expenseData = [];
let refreshTimer = null;
let currentFilter = 'all'; // 'all', 'income', 'expense'
let categoryFilter = null; // null means no category filter, string means filter by that category

// ===========================
// DOM Elements
// ===========================
const elements = {
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    dashboard: document.getElementById('dashboard'),
    syncStatus: document.getElementById('syncStatus'),
    lastUpdated: document.getElementById('lastUpdated'),

    // Stats
    totalIncome: document.getElementById('totalIncome'),
    totalExpenses: document.getElementById('totalExpenses'),
    currentBalance: document.getElementById('currentBalance'),
    totalTransactions: document.getElementById('totalTransactions'),

    // Category & Transactions
    categoryBreakdown: document.getElementById('categoryBreakdown'),
    transactionsBody: document.getElementById('transactionsBody')
};

// ===========================
// Google Sheets API Integration
// ===========================
async function fetchExpenseData() {
    try {
        updateSyncStatus('Syncing...', true);

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.spreadsheetId}/values/${CONFIG.range}?key=${CONFIG.apiKey}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.values || data.values.length === 0) {
            throw new Error('No data found in the spreadsheet');
        }

        expenseData = parseExpenseData(data.values);

        renderDashboard();
        hideLoading();
        updateSyncStatus('Synced', false);
        updateLastUpdated();

        return true;
    } catch (error) {
        console.error('Error fetching data:', error);
        showError(error.message);
        updateSyncStatus('Sync failed', false);
        return false;
    }
}

// ===========================
// Data Processing
// ===========================
function parseExpenseData(rows) {
    return rows.map(row => ({
        dateTime: row[0] || '',
        credit: row[1] || '',
        debit: row[2] || '',
        category: row[3] || '',
        amount: parseFloat(row[4]) || 0,
        purpose: row[5] || ''
    }));
}

function calculateAnalytics() {
    const income = expenseData
        .filter(item => item.credit && item.credit.trim() !== '')
        .reduce((sum, item) => sum + item.amount, 0);

    const expenses = expenseData
        .filter(item => item.debit && item.debit.trim() !== '')
        .reduce((sum, item) => sum + item.amount, 0);

    const balance = income - expenses;
    const totalTransactions = expenseData.length;

    return { income, expenses, balance, totalTransactions };
}

function getCategoryBreakdown() {
    const categories = {};
    const totalExpenses = expenseData
        .filter(item => item.debit && item.debit.trim() !== '')
        .reduce((sum, item) => sum + item.amount, 0);

    expenseData.forEach(item => {
        if (item.debit && item.debit.trim() !== '' && item.category) {
            const category = item.category.trim();
            if (!categories[category]) {
                categories[category] = {
                    name: category,
                    total: 0,
                    count: 0
                };
            }
            categories[category].total += item.amount;
            categories[category].count += 1;
        }
    });

    // Calculate percentages and sort by total
    const categoryArray = Object.values(categories).map(cat => ({
        ...cat,
        percentage: totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0
    }));

    return categoryArray.sort((a, b) => b.total - a.total);
}

// ===========================
// Rendering Functions
// ===========================
function renderDashboard() {
    renderAnalytics();
    renderCategoryBreakdown();
    renderTransactionsTable();
}

function renderAnalytics() {
    const { income, expenses, balance, totalTransactions } = calculateAnalytics();

    elements.totalIncome.textContent = formatCurrency(income);
    elements.totalExpenses.textContent = formatCurrency(expenses);
    elements.currentBalance.textContent = formatCurrency(balance);
    elements.totalTransactions.textContent = totalTransactions;

    // Update balance card color based on positive/negative
    const balanceCard = document.querySelector('.balance-card');
    if (balance < 0) {
        balanceCard.style.color = 'var(--color-expense)';
    } else {
        balanceCard.style.color = 'var(--color-balance)';
    }

    // Update mobile sticky summary
    const mobileIncome = document.getElementById('mobile-income');
    const mobileExpenses = document.getElementById('mobile-expenses');
    const mobileBalance = document.getElementById('mobile-balance');

    if (mobileIncome) mobileIncome.textContent = `₹${income.toFixed(0)}`;
    if (mobileExpenses) mobileExpenses.textContent = `₹${expenses.toFixed(0)}`;
    if (mobileBalance) {
        mobileBalance.textContent = `₹${balance.toFixed(0)}`;
        mobileBalance.classList.toggle('negative', balance < 0);
    }
}

function renderCategoryBreakdown() {
    const categories = getCategoryBreakdown();

    if (categories.length === 0) {
        elements.categoryBreakdown.innerHTML = '<p style="color: var(--color-text-muted); text-align: center; grid-column: 1/-1;">No category data available</p>';
        return;
    }

    elements.categoryBreakdown.innerHTML = categories.map(cat => `
        <div class="category-item ${categoryFilter === cat.name ? 'active-category' : ''}" 
             data-category="${escapeHtml(cat.name)}" 
             onclick="setCategoryFilter('${escapeHtml(cat.name).replace(/'/g, "\\'")}')">
            <div class="category-header">
                <span class="category-name">${escapeHtml(cat.name)}</span>
                <span class="category-count">${cat.count} transaction${cat.count !== 1 ? 's' : ''}</span>
            </div>
            <div class="category-amount-row">
                <span class="category-amount">₹${cat.total.toFixed(2)}</span>
                <span class="category-percentage">(${cat.percentage.toFixed(1)}%)</span>
            </div>
            <div class="category-bar">
                <div class="category-bar-fill" style="width: ${cat.percentage}%"></div>
            </div>
        </div>
    `).join('');
}

function renderTransactionsTable() {
    if (expenseData.length === 0) {
        elements.transactionsBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">
                    No transactions found
                </td>
            </tr>
        `;
        return;
    }

    // Sort by date (most recent first) - reverse order
    let sortedData = [...expenseData].reverse();

    // Apply filter based on currentFilter state
    if (currentFilter === 'income') {
        sortedData = sortedData.filter(item => item.credit && item.credit.trim() !== '');
    } else if (currentFilter === 'expense') {
        sortedData = sortedData.filter(item => item.debit && item.debit.trim() !== '');
    }

    // Apply category filter if set
    if (categoryFilter) {
        sortedData = sortedData.filter(item => item.category && item.category.trim() === categoryFilter);
    }

    if (sortedData.length === 0) {
        let filterText = '';
        if (categoryFilter) {
            filterText = `"${categoryFilter}" category`;
        } else if (currentFilter === 'income') {
            filterText = 'income';
        } else if (currentFilter === 'expense') {
            filterText = 'expense';
        }
        elements.transactionsBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">
                    No ${filterText} transactions found
                </td>
            </tr>
        `;
        return;
    }

    elements.transactionsBody.innerHTML = sortedData.map((item, index) => {
        const isIncome = item.credit && item.credit.trim() !== '';
        const amountClass = isIncome ? 'amount-income' : 'amount-expense';

        // Create JSON data for modal
        const transactionData = JSON.stringify(item).replace(/"/g, '&quot;');

        return `
            <tr class="transaction-row" onclick='openTransactionModal(${JSON.stringify(item)})'>
                <td>${escapeHtml(item.dateTime)}</td>
                <td>${escapeHtml(item.credit)}</td>
                <td>${escapeHtml(item.debit)}</td>
                <td>
                    ${item.category ? `<span class="category-badge">${escapeHtml(item.category)}</span>` : ''}
                </td>
                <td class="amount-cell ${amountClass}">₹${item.amount.toFixed(2)}</td>
                <td>${escapeHtml(item.purpose)}</td>
            </tr>
        `;
    }).join('');
}

// ===========================
// UI State Management
// ===========================
function showLoading() {
    elements.loadingState.classList.remove('hidden');
    elements.errorState.classList.add('hidden');
    elements.dashboard.classList.add('hidden');
}

function hideLoading() {
    elements.loadingState.classList.add('hidden');
    elements.dashboard.classList.remove('hidden');
}

function showError(message) {
    elements.loadingState.classList.add('hidden');
    elements.dashboard.classList.add('hidden');
    elements.errorState.classList.remove('hidden');
    elements.errorMessage.textContent = message || 'An unexpected error occurred';
}

function updateSyncStatus(status, isActive) {
    const statusDot = elements.syncStatus.querySelector('.status-dot');
    const statusText = elements.syncStatus.childNodes[2]; // Text node after dot

    if (statusText) {
        statusText.textContent = status;
    }

    if (isActive) {
        statusDot.style.background = 'var(--color-balance)';
    } else if (status === 'Synced') {
        statusDot.style.background = 'var(--color-income)';
    } else {
        statusDot.style.background = 'var(--color-expense)';
    }
}

function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    elements.lastUpdated.textContent = `Last updated: ${timeString}`;
}

// ===========================
// Utility Functions
// ===========================
function formatCurrency(amount) {
    return `₹${amount.toFixed(2)}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===========================
// Auto-Refresh Management
// ===========================
function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }

    refreshTimer = setInterval(async () => {
        await fetchExpenseData();
    }, CONFIG.refreshInterval);
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

// ===========================
// Filter Management
// ===========================
function setFilter(filterType) {
    currentFilter = filterType;
    categoryFilter = null; // Clear category filter when using income/expense filter
    renderCategoryBreakdown(); // Re-render to update active states
    renderTransactionsTable();
    updateFilterUI();
}

function setCategoryFilter(category) {
    if (categoryFilter === category) {
        // Toggle off if clicking same category
        categoryFilter = null;
    } else {
        categoryFilter = category;
    }
    currentFilter = 'all'; // Reset income/expense filter when filtering by category
    renderCategoryBreakdown(); // Re-render to update active states
    renderTransactionsTable();
    updateFilterUI();
}

function updateFilterUI() {
    // Remove active class from all stat cards
    document.querySelectorAll('.stat-card').forEach(card => {
        card.classList.remove('active-filter');
    });

    // Add active class to the clicked card
    if (currentFilter === 'income') {
        document.querySelector('.income-card').classList.add('active-filter');
    } else if (currentFilter === 'expense') {
        document.querySelector('.expense-card').classList.add('active-filter');
    }

    // Update section title to show filter status
    const sectionTitle = document.querySelector('.transactions-section .section-title');
    if (categoryFilter) {
        sectionTitle.innerHTML = `Transaction History <span style="color: var(--color-neutral); font-size: 0.9rem;">(${categoryFilter})</span> <button class="clear-filter-btn" onclick="setCategoryFilter(null)">Show All</button>`;
    } else if (currentFilter === 'all') {
        sectionTitle.innerHTML = 'Transaction History';
    } else if (currentFilter === 'income') {
        sectionTitle.innerHTML = 'Transaction History <span style="color: var(--color-income); font-size: 0.9rem;">(Income Only)</span> <button class="clear-filter-btn" onclick="setFilter(\'all\')">Show All</button>';
    } else if (currentFilter === 'expense') {
        sectionTitle.innerHTML = 'Transaction History <span style="color: var(--color-expense); font-size: 0.9rem;">(Expenses Only)</span> <button class="clear-filter-btn" onclick="setFilter(\'all\')">Show All</button>';
    }
}

function setupFilterListeners() {
    // Income card click
    const incomeCard = document.querySelector('.income-card');
    if (incomeCard) {
        incomeCard.style.cursor = 'pointer';
        incomeCard.addEventListener('click', () => {
            if (currentFilter === 'income') {
                setFilter('all');
            } else {
                setFilter('income');
            }
        });
    }

    // Expense card click
    const expenseCard = document.querySelector('.expense-card');
    if (expenseCard) {
        expenseCard.style.cursor = 'pointer';
        expenseCard.addEventListener('click', () => {
            if (currentFilter === 'expense') {
                setFilter('all');
            } else {
                setFilter('expense');
            }
        });
    }
}

// ===========================
// Initialization
// ===========================
async function init() {
    showLoading();

    const success = await fetchExpenseData();

    if (success) {
        setupFilterListeners();
        startAutoRefresh();
    }
}

// Handle page visibility to pause/resume refresh
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        startAutoRefresh();
        fetchExpenseData(); // Fetch immediately when page becomes visible
    }
});

// ===========================
// Transaction Modal Functions
// ===========================
function openTransactionModal(transaction) {
    const modal = document.getElementById('transactionModal');
    const isIncome = transaction.credit && transaction.credit.trim() !== '';

    // Populate modal with transaction data
    document.getElementById('modal-datetime').textContent = transaction.dateTime || '-';
    document.getElementById('modal-credit').textContent = transaction.credit || '-';
    document.getElementById('modal-debit').textContent = transaction.debit || '-';
    document.getElementById('modal-category').innerHTML = transaction.category
        ? `<span class="category-badge">${escapeHtml(transaction.category)}</span>`
        : '-';

    const amountClass = isIncome ? 'amount-income' : 'amount-expense';
    document.getElementById('modal-amount').innerHTML =
        `<span class="${amountClass}">₹${transaction.amount.toFixed(2)}</span>`;

    document.getElementById('modal-purpose').textContent = transaction.purpose || '-';

    // Show modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeTransactionModal() {
    const modal = document.getElementById('transactionModal');
    modal.classList.add('hidden');
    document.body.style.overflow = ''; // Restore scrolling
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeTransactionModal();
    }
});

// ===========================
// Sticky Analytics Collapse
// ===========================
let lastScrollY = 0;
const analyticsSection = document.querySelector('.analytics-section');

function handleStickyAnalytics() {
    if (!analyticsSection) return;

    const scrollY = window.scrollY;

    // On desktop/tablet, collapse analytics when scrolling down past 100px
    if (window.innerWidth >= 769) {
        if (scrollY > 100) {
            analyticsSection.classList.add('collapsed');
        } else {
            analyticsSection.classList.remove('collapsed');
        }
    }

    lastScrollY = scrollY;
}

// Throttle scroll handler for performance
let scrollTimeout;
window.addEventListener('scroll', () => {
    if (scrollTimeout) {
        window.cancelAnimationFrame(scrollTimeout);
    }
    scrollTimeout = window.requestAnimationFrame(handleStickyAnalytics);
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.innerWidth < 769) {
        analyticsSection?.classList.remove('collapsed');
    }
});

// Start the application
init();
