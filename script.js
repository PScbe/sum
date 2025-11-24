// Google Sheets CSV URLs
const WORKS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLtabZ-6eyDtjEwHsB6AdwBvMbc4ihVNRRUoyCK-HnqRBrNNwBTDNOBK-0cdlCQ0vZ66p_y58fi0qc/pub?output=csv&gid=0';
const EXPENSES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLtabZ-6eyDtjEwHsB6AdwBvMbc4ihVNRRUoyCK-HnqRBrNNwBTDNOBK-0cdlCQ0vZ66p_y58fi0qc/pub?output=csv&gid=1890560582';

// Data storage
let worksData = [];
let expensesData = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    // Set current month name
    const currentDate = new Date();
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('currentMonth').textContent = monthName;

    initializeTabs();
    setupSearch();
    loadData();

    // Auto-refresh every 30 seconds
    setInterval(loadData, 30000);
});

// Load data from Google Sheets
async function loadData() {
    try {
        await Promise.all([
            fetchWorksData(),
            fetchExpensesData()
        ]);

        populateWorksTable(worksData);
        populateExpensesTable(expensesData);
        updateSummary();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Fetch Works data
async function fetchWorksData() {
    try {
        const response = await fetch(WORKS_CSV_URL);
        const csvText = await response.text();
        worksData = parseWorksCSV(csvText);
    } catch (error) {
        console.error('Error fetching works data:', error);
    }
}

// Fetch Expenses data
async function fetchExpensesData() {
    try {
        const response = await fetch(EXPENSES_CSV_URL);
        const csvText = await response.text();
        expensesData = parseExpensesCSV(csvText);
    } catch (error) {
        console.error('Error fetching expenses data:', error);
    }
}

// Parse Works CSV
function parseWorksCSV(csv) {
    const lines = csv.trim().split('\n');
    const data = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        if (values.length >= 5 && values[0]) {
            data.push({
                date: formatDate(values[0]),
                client: values[1] || '',
                work: values[2] || '',
                price: parseFloat(values[3]) || 0,
                note: values[4] || 'Pending'
            });
        }
    }

    return data;
}

// Parse Expenses CSV
function parseExpensesCSV(csv) {
    const lines = csv.trim().split('\n');
    const data = [];
    let summaryValues = {
        totalCredit: 0,
        balance: 0
    };

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        if (values.length >= 3 && values[0]) {
            const credit = parseFloat(values[1]) || 0;
            const debit = parseFloat(values[2]) || 0;

            data.push({
                date: formatDate(values[0]),
                credit: credit,
                debit: debit,
                toFrom: values[3] || '',
                client: values[4] || '',
                balance: parseFloat(values[5]) || 0
            });

            // Extract values from column G (index 6)
            // G2 (i=1): First value for total credit
            // G3 (i=2): Second value for total credit  
            // G5 (i=4): Balance value
            if (values.length > 6) {
                const columnGValue = parseFloat(values[6]) || 0;

                if (i === 1 || i === 2) {
                    // G2 + G3 for total credit
                    summaryValues.totalCredit += columnGValue;
                }
                if (i === 4) {
                    // G5 for balance
                    summaryValues.balance = columnGValue;
                }
            }
        }
    }

    // Store summary values for later use
    data.summaryValues = summaryValues;
    return data;
}

// Parse CSV line handling quoted values
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim());
    return values;
}

// Format date to readable format
function formatDate(dateStr) {
    if (!dateStr) return '';

    // Handle various date formats
    const date = new Date(dateStr);

    // Check if date is valid
    if (isNaN(date.getTime())) {
        return dateStr; // Return original if can't parse
    }

    // Format as "Nov 11, 2024"
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Tab functionality
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// Populate Works Table
function populateWorksTable(data) {
    const tbody = document.getElementById('worksTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">No data available</td></tr>';
        return;
    }

    data.forEach(work => {
        const row = document.createElement('tr');
        // Check if note starts with "Paid" (case-insensitive) or equals "Paid"
        const noteLower = work.note.toLowerCase().trim();
        const statusClass = (noteLower === 'paid' || noteLower.startsWith('paid ')) ? 'status-paid' : 'status-pending';
        const displayStatus = (noteLower === 'paid' || noteLower.startsWith('paid ')) ? 'Paid' : 'Pending';

        row.innerHTML = `
            <td>${work.date}</td>
            <td>${work.client}</td>
            <td>${work.work}</td>
            <td class="amount-positive">₹${work.price.toLocaleString('en-IN')}</td>
            <td><span class="status-badge ${statusClass}">${displayStatus}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Populate Expenses Table
function populateExpensesTable(data) {
    const tbody = document.getElementById('expensesTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--text-secondary);">No data available</td></tr>';
        return;
    }

    data.forEach(expense => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${expense.date}</td>
            <td class="${expense.credit > 0 ? 'amount-positive' : ''}">
                ${expense.credit > 0 ? '₹' + expense.credit.toLocaleString('en-IN') : '-'}
            </td>
            <td class="${expense.debit > 0 ? 'amount-negative' : ''}">
                ${expense.debit > 0 ? '₹' + expense.debit.toLocaleString('en-IN') : '-'}
            </td>
            <td>${expense.toFrom}</td>
        `;
        tbody.appendChild(row);
    });
}

// Update Summary Statistics
function updateSummary() {
    // Calculate totals
    const totalRevenue = worksData.reduce((sum, work) => sum + work.price, 0);

    // Get Total Credit and Balance from the summary values extracted from Google Sheets
    const totalCredit = expensesData.summaryValues ? expensesData.summaryValues.totalCredit : 0;
    const currentBalance = expensesData.summaryValues ? expensesData.summaryValues.balance : 0;

    // Get unique clients
    const uniqueClients = [...new Set(worksData.map(work => work.client).filter(c => c))];
    const totalClients = uniqueClients.length;

    // Update header stats
    document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
    document.getElementById('totalCredit').textContent = `₹${totalCredit.toLocaleString('en-IN')}`;
    document.getElementById('currentBalance').textContent = `₹${currentBalance.toLocaleString('en-IN')}`;

    // Update summary tab
    document.getElementById('summaryRevenue').textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
    document.getElementById('summaryCredit').textContent = `₹${totalCredit.toLocaleString('en-IN')}`;
    document.getElementById('summaryBalance').textContent = `₹${currentBalance.toLocaleString('en-IN')}`;
    document.getElementById('summaryClients').textContent = totalClients;

    // Generate client chart
    generateClientChart(uniqueClients);
}

// Generate Client Revenue Chart
function generateClientChart(clients) {
    const chartContainer = document.getElementById('clientChart');
    chartContainer.innerHTML = '';

    if (clients.length === 0) {
        chartContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No client data available</p>';
        return;
    }

    // Calculate revenue per client
    const clientRevenue = {};
    worksData.forEach(work => {
        if (work.client) {
            if (!clientRevenue[work.client]) {
                clientRevenue[work.client] = 0;
            }
            clientRevenue[work.client] += work.price;
        }
    });

    // Sort clients by revenue
    const sortedClients = Object.entries(clientRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5 clients

    if (sortedClients.length === 0) {
        chartContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No client revenue data available</p>';
        return;
    }

    const maxRevenue = sortedClients[0][1];

    // Create chart bars
    sortedClients.forEach(([client, revenue]) => {
        const percentage = (revenue / maxRevenue) * 100;

        const barElement = document.createElement('div');
        barElement.className = 'chart-bar';
        barElement.innerHTML = `
            <div class="chart-label">${client}</div>
            <div class="chart-bar-container">
                <div class="chart-bar-fill" style="width: ${percentage}%">
                    <span class="chart-value">₹${revenue.toLocaleString('en-IN')}</span>
                </div>
            </div>
        `;
        chartContainer.appendChild(barElement);
    });
}

// Search functionality
function setupSearch() {
    const worksSearch = document.getElementById('searchWorks');
    const expensesSearch = document.getElementById('searchExpenses');

    worksSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = worksData.filter(work =>
            work.client.toLowerCase().includes(searchTerm) ||
            work.work.toLowerCase().includes(searchTerm) ||
            work.note.toLowerCase().includes(searchTerm) ||
            work.date.toLowerCase().includes(searchTerm)
        );
        populateWorksTable(filteredData);
    });

    expensesSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = expensesData.filter(expense =>
            expense.toFrom.toLowerCase().includes(searchTerm) ||
            (expense.client && expense.client.toLowerCase().includes(searchTerm)) ||
            expense.date.toLowerCase().includes(searchTerm)
        );
        populateExpensesTable(filteredData);
    });
}

