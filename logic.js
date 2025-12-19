let data = { workers: [], trucks: [], payments: [], payCycles: [], workerPins: {} };
let chart;
let comparisonChart;

const financialTips = [
    {
        title: "Start Small Savings",
        summary: "Save at least 50 shillings daily. Even small amounts add up over time and help build an emergency fund.",
        link: "https://www.centralbank.go.ke/"
    },
    {
        title: "Use M-Pesa Wisely",
        summary: "M-Pesa is good for quick transfers, but avoid using it for loans. Save your M-Pesa balance for real needs.",
        link: "https://www.safaricom.co.ke/personal/m-pesa"
    },
    {
        title: "Avoid High-Interest Loans",
        summary: "Loans from informal lenders can trap you in debt. Look for better options or save to avoid borrowing.",
        link: "https://www.centralbank.go.ke/financial-education/"
    },
    {
        title: "Plan for Irregular Income",
        summary: "With daily work, income varies. Set aside a portion of good days for slower days.",
        link: "https://www.fsdkenya.org/"
    },
    {
        title: "Track Your Spending",
        summary: "Keep a simple note of daily expenses. Knowing where money goes helps you spend wisely.",
        link: "https://www.centralbank.go.ke/"
    },
    {
        title: "Build Good Credit",
        summary: "Pay bills on time and avoid defaults. Good credit helps when you need loans for important things.",
        link: "https://www.metropol.co.ke/"
    },
    {
        title: "Emergency Fund",
        summary: "Aim to save 1-2 months of basic expenses. This protects you from unexpected problems.",
        link: "https://www.centralbank.go.ke/financial-education/"
    }
];

function getAllGroupsData() {
    const allData = {};
    const groups = ['ELITE', 'NGORONYO', 'SHERIF', 'SCORPION', 'ACHIEVERS', 'MWEA'];
    groups.forEach(g => {
        const key = 'kimoja_' + g + '_data';
        const stored = localStorage.getItem(key);
        if (stored) {
            allData[g] = JSON.parse(stored);
        }
    });
    return allData;
}

function login() {
    const group = document.getElementById('loginGroup').value.trim().toUpperCase();
    const worker = document.getElementById('loginWorker').value.trim();
    if (!group) return;
    const role = worker ? 'worker' : 'admin';
    if (role === 'worker') {
        // Load data for the group
        window.group = group;
        loadData();
        if (!data.workers.includes(worker)) {
            alert('Worker not found in this group.');
            return;
        }
        const pin = data.workerPins[worker];
        if (!pin) {
            // Set PIN
            const newPin = prompt('Set your 4-digit PIN:');
            const confirmPin = prompt('Confirm your PIN:');
            if (!newPin || !confirmPin || newPin !== confirmPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
                alert('PIN must be 4 digits and match confirmation.');
                return;
            }
            data.workerPins[worker] = newPin;
            saveData();
        } else {
            // Verify PIN
            const enteredPin = prompt('Enter your PIN:');
            if (enteredPin !== pin) {
                alert('Incorrect PIN.');
                return;
            }
        }
    }
    sessionStorage.setItem('user', JSON.stringify({group, worker, role}));
    if (role === 'worker') {
        window.location.href = 'worker-dashboard.html';
    } else {
        // Admin
        document.getElementById('loginForm').style.display = 'none';
        document.querySelector('nav').style.display = 'block';
        document.getElementById('adminLink').style.display = 'block';
    }
}

function logout() {
    sessionStorage.removeItem('user');
    window.location.href = 'homepage.html';
}

function checkLogin() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (!user) {
        window.location.href = 'homepage.html';
    }
    return user;
}

function formatDate(d) {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

function getStorageKey() {
    return 'kimoja_' + group + '_data';
}

function loadData() {
    const stored = localStorage.getItem(getStorageKey());
    if (stored) {
        data = JSON.parse(stored);
        // Ensure all arrays exist for backward compatibility
        if (!data.payCycles) data.payCycles = [];
        if (!data.trucks) data.trucks = [];
        if (!data.workers) data.workers = [];
        if (!data.payments) data.payments = [];
        if (!data.workerPins) data.workerPins = {};
        // Migrate existing trucks to have cycleId
        data.trucks.forEach(truck => {
            if (!truck.cycleId) {
                const date = new Date(truck.date);
                const cycle = getCycleForDate(date);
                truck.cycleId = cycle.id;
            }
        });
        saveData(); // Save migrated data
    }
    renderAll();
}

function saveData() {
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
}

function renderAll() {
    renderWorkers();
    renderAllTrucks();
    renderPayments();
    updateComparisonGraph();
    updateGroupDailyChart();
}

function addWorker() {
    const name = document.getElementById('newWorker').value.trim();
    if (name && !data.workers.includes(name)) {
        data.workers.push(name);
        data.workerPins[name] = null;
        saveData();
        renderAll();
        document.getElementById('newWorker').value = '';
    }
}

function addTruck(event) {
    event.preventDefault();
    const plate = document.getElementById('plate').value.trim();
    const tonnage = parseFloat(document.getElementById('tonnage').value);
    const totalPay = parseFloat(document.getElementById('totalPay').value);
    if (plate && tonnage > 0 && totalPay > 0) {
        const date = new Date().toISOString().split('T')[0];
        const cycle = getCycleForDate(new Date(date));
        const truck = {
            id: Date.now(),
            date: date,
            plate,
            tonnage,
            totalPay,
            attendance: [],
            cycleId: cycle.id
        };
        data.trucks.push(truck);
        saveData();
        addTruckToDOM(truck);
        if (document.getElementById('workerSelect').value) updateGraph();
        updateComparisonGraph();
        document.getElementById('addTruckForm').reset();
    }
}

function toggleAttendance(truckId, worker) {
    const truck = data.trucks.find(t => t.id === truckId);
    if (truck) {
        const cycle = data.payCycles.find(c => c.id === truck.cycleId);
        if (cycle && cycle.closed) {
            alert('Cannot edit attendance for a closed pay cycle.');
            return;
        }
        const index = truck.attendance.indexOf(worker);
        if (index > -1) {
            truck.attendance.splice(index, 1);
        } else {
            truck.attendance.push(worker);
        }
        saveData();
        renderPayments();
        if (document.getElementById('workerSelect').value) updateGraph();
        updateComparisonGraph();
    }
}

function calculateUnpaid() {
    const totals = {};
    data.workers.forEach(worker => totals[worker] = 0);
    data.trucks.forEach(truck => {
        if (truck.attendance.length > 0) {
            const payPerWorker = truck.totalPay / truck.attendance.length;
            truck.attendance.forEach(worker => {
                if (totals[worker] !== undefined) {
                    totals[worker] += payPerWorker;
                }
            });
        }
    });
    data.payments.forEach(payment => {
        if (totals[payment.worker] !== undefined) {
            totals[payment.worker] -= payment.amount;
        }
    });
    return totals;
}

function payWorkers() {
    const totals = calculateUnpaid();
    const today = new Date().toISOString().split('T')[0];
    data.workers.forEach(worker => {
        const amount = totals[worker];
        if (amount > 0) {
            data.payments.push({ date: today, worker, amount });
        }
    });
    saveData();
    renderPayments();
    updateComparisonGraph();
}

function renderWorkers() {
    const list = document.getElementById('workerList');
    if (list) {
        list.innerHTML = '';
        data.workers.forEach(worker => {
            const li = document.createElement('li');
            li.textContent = worker;
            list.appendChild(li);
        });
    }
    const select = document.getElementById('workerSelect');
    if (select) {
        select.innerHTML = '';
        data.workers.forEach(worker => {
            const option = document.createElement('option');
            option.value = worker;
            option.textContent = worker;
            select.appendChild(option);
        });
        if (data.workers.length > 0 && !select.value) {
            select.value = data.workers[0];
            if (typeof updateDashboard === 'function') {
                updateDashboard();
            } else {
                updateGraph();
            }
        }
    }
}

function renderAllTrucks() {
    const container = document.getElementById('truckList');
    if (container) {
        container.innerHTML = '';
        data.trucks.forEach(truck => {
            addTruckToDOM(truck);
        });
    }
}

function addTruckToDOM(truck) {
    const container = document.getElementById('truckList');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'truck';
    div.innerHTML = `
        <h3>Truck: ${truck.plate} - ${truck.date}</h3>
        <p>Tonnage: ${truck.tonnage}, Total Pay: ${truck.totalPay}</p>
        <div class="attendance">
            <h4>Attendance:</h4>
            ${data.workers.map(worker => `
                <label>
                    <input type="checkbox" ${truck.attendance.includes(worker) ? 'checked' : ''} onchange="toggleAttendance(${truck.id}, '${worker}')">
                    ${worker}
                </label>
            `).join('')}
        </div>
    `;
    container.appendChild(div);
}

function renderPayments() {
    const unpaidDiv = document.getElementById('unpaidTotals');
    if (unpaidDiv) {
        unpaidDiv.innerHTML = '<h3>Unpaid Totals</h3>';
        data.workers.forEach(worker => {
            const div = document.createElement('div');
            div.className = 'worker-total';
            div.innerHTML = `<span>${worker}</span><span>${calculateUnpaid()[worker].toFixed(2)}</span>`;
            unpaidDiv.appendChild(div);
        });
    }

    const historyList = document.getElementById('paymentHistory');
    if (historyList) {
        historyList.innerHTML = '';
        data.payments.forEach(payment => {
            const li = document.createElement('li');
            li.textContent = `${payment.date}: ${payment.worker} - ${payment.amount.toFixed(2)}`;
            historyList.appendChild(li);
        });
    }
}

function prepareGraphData(workerName) {
    const dailyEarnings = getDailyEarnings();
    const workerDates = Object.keys(dailyEarnings).filter(date => dailyEarnings[date][workerName] > 0);
    if (workerDates.length === 0) return { labels: [], values: [] };
    const minDate = new Date(Math.min(...workerDates.map(d => new Date(d))));
    const maxDate = new Date(Math.max(...workerDates.map(d => new Date(d))));
    const dates = [];
    for (let dt = new Date(minDate); dt <= maxDate; dt.setDate(dt.getDate() + 1)) {
        dates.push(new Date(dt).toISOString().split('T')[0]);
    }
    const labels = dates.map(d => d.split('-')[2]);
    const values = dates.map(d => dailyEarnings[d] ? (dailyEarnings[d][workerName] || 0) : 0);
    return { labels, values };
}

function getDailyEarnings() {
    const earnings = {};
    data.trucks.forEach(truck => {
        if (truck.attendance.length > 0) {
            const payPerWorker = truck.totalPay / truck.attendance.length;
            truck.attendance.forEach(worker => {
                if (!earnings[truck.date]) earnings[truck.date] = {};
                if (!earnings[truck.date][worker]) earnings[truck.date][worker] = 0;
                earnings[truck.date][worker] += payPerWorker;
            });
        }
    });
    return earnings;
}

function updateGraph() {
    const worker = document.getElementById('workerSelect').value;
    if (!worker) return;
    const { labels, values } = prepareGraphData(worker);
    try { if (chart) chart.destroy(); } catch (e) {}
    const ctx = document.getElementById('earningsChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: worker + ' Daily Earnings',
                data: values,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: worker + ' Daily Earnings',
                    color: '#e5e7eb'
                },
                legend: {
                    labels: {
                        color: '#9ca3af'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9ca3af'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
                    },
                    ticks: {
                        color: '#9ca3af'
                    }
                }
            },
            elements: {
                line: {
                    borderWidth: 3,
                    tension: 0.4
                }
            }
        }
    });
}

function prepareComparisonData() {
    const totals = {};
    data.workers.forEach(w => totals[w] = 0);
    data.trucks.forEach(truck => {
        if (truck.attendance.length > 0) {
            const payPer = truck.totalPay / truck.attendance.length;
            truck.attendance.forEach(worker => {
                if (totals[worker] !== undefined) totals[worker] += payPer;
            });
        }
    });
    data.payments.forEach(p => {
        if (totals[p.worker] !== undefined) totals[p.worker] -= p.amount;
    });
    const labels = Object.keys(totals);
    const values = labels.map(l => parseFloat(totals[l].toFixed(2)));
    return { labels, values };
}

function updateComparisonGraph() {
    const canvas = document.getElementById('comparisonChart');
    if (!canvas) return;
    try { if (comparisonChart) comparisonChart.destroy(); } catch (e) {}
    const ctx = canvas.getContext('2d');
    const { labels, values } = prepareComparisonData();
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Earnings',
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.4)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Total Earnings per Worker',
                    color: '#e5e7eb'
                },
                legend: {
                    labels: {
                        color: '#9ca3af'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9ca3af'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
                    },
                    ticks: {
                        color: '#9ca3af'
                    }
                }
            }
        }
    });
}

function prepareGroupDailyData() {
    // Build a continuous date range from earliest to latest truck, summing totalPay per day (only trucks with attendance)
    const daily = {};
    if (data.trucks.length === 0) return { labels: [], values: [] };

    // collect all truck dates and initialize sums
    data.trucks.forEach(truck => {
        const date = truck.date; // 'YYYY-MM-DD'
        if (!daily[date]) daily[date] = 0;
        if (truck.attendance && truck.attendance.length > 0) {
            // count the whole truck.totalPay as group productivity for that day
            daily[date] += truck.totalPay;
        }
    });

    // Determine full date range (inclusive)
    const allDates = Object.keys(daily).sort();
    const minDate = new Date(allDates[0]);
    const maxDate = new Date(allDates[allDates.length - 1]);

    const dates = [];
    for (let dt = new Date(minDate); dt <= maxDate; dt.setDate(dt.getDate() + 1)) {
        dates.push(formatDate(new Date(dt)));
    }

    // Prepare labels as day numbers (DD) and values with zeros for missing days
    const labels = dates.map(d => d.split('-')[2]);
    const values = dates.map(d => parseFloat((daily[d] || 0).toFixed(2)));
    return { labels, values };
}

function updateGroupDailyChart() {
    const canvas = document.getElementById('groupDailyChart');
    if (!canvas) return; // don't touch pages without the canvas
    try { if (window.groupDailyChart) window.groupDailyChart.destroy(); } catch (e) {}
    const ctx = canvas.getContext('2d');
    const { labels, values } = prepareGroupDailyData();
    window.groupDailyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Group Daily Total',
                data: values,
                backgroundColor: 'rgba(255, 159, 64, 0.4)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Group Daily Earnings (Total)', color: '#e5e7eb' },
                legend: {
                    labels: {
                        color: '#9ca3af'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9ca3af'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
                    },
                    ticks: {
                        color: '#9ca3af'
                    }
                }
            }
        }
    });
}

function exportData() {
    const dataStr = JSON.stringify(getDailyEarnings(), null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = group + '_daily_earnings.json';
    a.click();
}

function getWorkerTodaySummary(worker) {
    const today = new Date().toISOString().split('T')[0];
    let present = false;
    let trucksCount = 0;
    let earnings = 0;
    data.trucks.forEach(truck => {
        if (truck.date === today && truck.attendance.includes(worker)) {
            present = true;
            trucksCount++;
            earnings += truck.totalPay / truck.attendance.length;
        }
    });
    return { present, trucksCount, earnings: parseFloat(earnings.toFixed(2)) };
}

function getWorkerDailyEarnings(worker) {
    return prepareGraphData(worker);
}

function getWorkerCumulativeEarnings(worker) {
    const { labels, values } = prepareGraphData(worker);
    const cumulative = [];
    let sum = 0;
    values.forEach(v => {
        sum += v;
        cumulative.push(parseFloat(sum.toFixed(2)));
    });
    return { labels, values: cumulative };
}

function getWorkerPaymentStatus(worker) {
    const totals = calculateUnpaid();
    const unpaid = totals[worker] || 0;
    const paid = data.payments.filter(p => p.worker === worker).reduce((sum, p) => sum + p.amount, 0);
    const lastPayment = data.payments.filter(p => p.worker === worker).sort((a,b) => b.date.localeCompare(a.date))[0];
    const lastPaymentDate = lastPayment ? lastPayment.date : 'None';
    return { unpaid: parseFloat(unpaid.toFixed(2)), paid: parseFloat(paid.toFixed(2)), lastPaymentDate };
}

function getWorkerWorkHistory(worker) {
    const history = [];
    const paidTotal = data.payments.filter(p => p.worker === worker).reduce((sum, p) => sum + p.amount, 0);
    let cumulativeEarned = 0;
    data.trucks.filter(truck => truck.attendance.includes(worker)).sort((a,b) => a.date.localeCompare(b.date)).forEach(truck => {
        const amount = truck.totalPay / truck.attendance.length;
        cumulativeEarned += amount;
        const status = cumulativeEarned <= paidTotal ? 'Paid' : 'Unpaid';
        history.push({
            date: truck.date,
            plate: truck.plate,
            amount: parseFloat(amount.toFixed(2)),
            status
        });
    });
    return history;
}

function updateDashboard() {
    const worker = document.getElementById('workerSelect').value;
    if (!worker) return;

    // Header
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('workerInfo').textContent = `Worker: ${worker}, Group: ${group}, Date: ${today}`;

    // Today Summary
    const todaySummary = getWorkerTodaySummary(worker);
    document.getElementById('todayInfo').textContent = `Present Today: ${todaySummary.present ? 'Yes' : 'No'}, Trucks Worked: ${todaySummary.trucksCount}, Earnings Today: ${todaySummary.earnings}`;

    // Current Cycle
    const cycleInfo = getWorkerCurrentCycleInfo(worker);
    document.getElementById('cycleInfo').textContent = `Current Cycle Earnings: ${cycleInfo.earnings}, Status: ${cycleInfo.status}, Payday: ${cycleInfo.payday}`;

    // Earnings Graphs
    const daily = getWorkerDailyEarnings(worker);
    const cumulative = getWorkerCumulativeEarnings(worker);

    // Daily Chart
    const dailyMsg = document.getElementById('dailyMessage');
    if (daily.labels.length === 0) {
        dailyMsg.textContent = 'No earnings data for daily chart';
        try { if (window.dailyChart) window.dailyChart.destroy(); } catch (e) {}
    } else {
        dailyMsg.textContent = '';
        try { if (window.dailyChart) window.dailyChart.destroy(); } catch (e) {}
        const dailyCtx = document.getElementById('dailyChart').getContext('2d');
        window.dailyChart = new Chart(dailyCtx, {
            type: 'line',
            data: {
                labels: daily.labels,
                datasets: [{
                    label: 'Daily Earnings',
                    data: daily.values,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    fill: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Daily Earnings', color: '#e5e7eb' },
                    legend: {
                        labels: {
                            color: '#9ca3af'
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255,255,255,0.1)'
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    }
                },
                elements: {
                    line: {
                        borderWidth: 3,
                        tension: 0.4
                    }
                }
            }
        });
    }

    // Cumulative Chart
    const cumMsg = document.getElementById('cumulativeMessage');
    if (cumulative.labels.length === 0) {
        cumMsg.textContent = 'No earnings data for cumulative chart';
        try { if (window.cumulativeChart) window.cumulativeChart.destroy(); } catch (e) {}
    } else {
        cumMsg.textContent = '';
        try { if (window.cumulativeChart) window.cumulativeChart.destroy(); } catch (e) {}
        const cumCtx = document.getElementById('cumulativeChart').getContext('2d');
        window.cumulativeChart = new Chart(cumCtx, {
            type: 'line',
            data: {
                labels: cumulative.labels,
                datasets: [{
                    label: 'Cumulative Earnings',
                    data: cumulative.values,
                    borderColor: 'rgba(153, 102, 255, 1)',
                    fill: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Cumulative Earnings', color: '#e5e7eb' },
                    legend: {
                        labels: {
                            color: '#9ca3af'
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255,255,255,0.1)'
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    }
                },
                elements: {
                    line: {
                        borderWidth: 3,
                        tension: 0.4
                    }
                }
            }
        });
    }

    // Payment Status
    const paymentStatus = getWorkerPaymentStatus(worker);
    document.getElementById('paymentInfo').textContent = `Total Unpaid: ${paymentStatus.unpaid}, Total Paid: ${paymentStatus.paid}, Last Payment Date: ${paymentStatus.lastPaymentDate}`;

    // Work History
    const history = getWorkerWorkHistory(worker);
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';
    if (history.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="4">No work history</td>';
        tbody.appendChild(tr);
    } else {
        history.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${row.date}</td><td>${row.plate}</td><td>${row.amount}</td><td>${row.status}</td>`;
            tbody.appendChild(tr);
        });
    }

    // Financial Tip
    const tipElement = document.getElementById('tipContent');
    if (tipElement) {
        const tip = getDailyFinancialTip();
        tipElement.innerHTML = `
            <h3>${tip.title}</h3>
            <p>${tip.summary}</p>
            <p><a href="${tip.link}" target="_blank">Learn more</a></p>
        `;
    }
}

// Pay Cycle Functions
function getPayday(date) {
    const day = date.getDay(); // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
    const payday = new Date(date);
    if (day === 6 || day === 0 || day === 1 || day === 2) { // Sat, Sun, Mon, Tue -> Wed
        const diff = (3 - day + 7) % 7;
        payday.setDate(date.getDate() + diff);
    } else { // Wed, Thu, Fri -> Sat
        const diff = (6 - day + 7) % 7;
        payday.setDate(date.getDate() + diff);
    }
    return payday;
}

function getPreviousPayday(payday) {
    const day = payday.getDay();
    const prev = new Date(payday);
    if (day === 3) { // Wed, previous Sat
        prev.setDate(payday.getDate() - 4);
    } else { // Sat, previous Wed
        prev.setDate(payday.getDate() - 3);
    }
    return prev;
}

function getCycleForDate(date) {
    if (!data.payCycles) data.payCycles = [];
    const payday = getPayday(date);
    const pid = formatDate(payday);
    let cycle = data.payCycles.find(c => c.id === pid);
    if (!cycle) {
        const prevPayday = getPreviousPayday(payday);
        const start = new Date(prevPayday);
        start.setDate(start.getDate() + 1);
        cycle = {
            id: pid,
            startDate: formatDate(start),
            endDate: formatDate(payday),
            payday: formatDate(payday),
            closed: false
        };
        data.payCycles.push(cycle);
        saveData();
    }
    return cycle;
}

function getCurrentCycle() {
    const today = new Date();
    return getCycleForDate(today);
}

function payCurrentCycle() {
    const cycle = getCurrentCycle();
    if (cycle.closed) {
        alert('Current cycle is already paid.');
        return;
    }
    const workers = {};
    data.trucks.forEach(truck => {
        if (truck.cycleId === cycle.id) {
            truck.attendance.forEach(w => {
                if (!workers[w]) workers[w] = 0;
                const payPerWorker = truck.totalPay / truck.attendance.length;
                workers[w] += payPerWorker;
            });
        }
    });
    const today = formatDate(new Date());
    Object.keys(workers).forEach(worker => {
        const amount = workers[worker];
        if (amount > 0) {
            data.payments.push({
                worker: worker,
                amount: parseFloat(amount.toFixed(2)),
                date: today,
                paid: true,
                cycleId: cycle.id
            });
        }
    });
    cycle.closed = true;
    saveData();
    renderAll();
    alert('Current cycle paid successfully.');
}

function payWednesdayCycle() {
    const today = new Date().getDay();
    if (today !== 3) {
        alert('Wednesday payments can only be processed on Wednesdays.');
        return;
    }
    payCurrentCycle();
}

function paySaturdayCycle() {
    const today = new Date().getDay();
    if (today !== 6) {
        alert('Saturday payments can only be processed on Saturdays.');
        return;
    }
    payCurrentCycle();
}

function getWorkerCycleEarnings(worker, cycleId) {
    let earnings = 0;
    data.trucks.forEach(truck => {
        if (truck.cycleId === cycleId && truck.attendance.includes(worker)) {
            earnings += truck.totalPay / truck.attendance.length;
        }
    });
    let paid = 0;
    data.payments.forEach(payment => {
        if (payment.worker === worker && payment.cycleId === cycleId && payment.paid) {
            paid += payment.amount;
        }
    });
    return parseFloat((earnings - paid).toFixed(2));
}

function getDailyFinancialTip() {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const index = dayOfYear % financialTips.length;
    return financialTips[index];
}
function getWorkerCurrentCycleInfo(worker) {
    const cycle = getCurrentCycle();
    const earnings = getWorkerCycleEarnings(worker, cycle.id);
    return {
        earnings: earnings,
        status: cycle.closed ? 'Paid' : 'Open',
        payday: cycle.payday
    };
}

function updateAdminDashboard() {
    const today = formatDate(new Date());

    // Today Snapshot
    const todayTrucks = data.trucks.filter(t => t.date === today);
    const totalAmount = todayTrucks.reduce((sum, t) => sum + t.totalPay, 0);
    const activeWorkers = new Set();
    todayTrucks.forEach(t => t.attendance.forEach(w => activeWorkers.add(w)));
    document.getElementById('todayInfo').textContent = `Trucks: ${todayTrucks.length}, Total Amount: ${totalAmount.toFixed(2)}, Active Workers: ${activeWorkers.size}`;

    // Cycle Summaries
    const wedCycle = getCurrentCycle();

    // Wednesday Cycle
    const wedTrucks = data.trucks.filter(t => t.cycleId === wedCycle.id);
    const wedWorkers = new Set();
    wedTrucks.forEach(t => t.attendance.forEach(w => wedWorkers.add(w)));
    let wedUnpaid = 0;
    wedWorkers.forEach(w => wedUnpaid += getWorkerCycleEarnings(w, wedCycle.id));
    document.getElementById('wednesdayInfo').textContent = `Unpaid Total: ${wedUnpaid.toFixed(2)}, Trucks: ${wedTrucks.length}, Workers: ${wedWorkers.size}`;

    // Saturday Cycle
    const satCycle = data.payCycles.find(c => c.id !== wedCycle.id && !c.closed);
    const satTrucks = satCycle ? data.trucks.filter(t => t.cycleId === satCycle.id) : [];
    const satWorkers = new Set();
    satTrucks.forEach(t => t.attendance.forEach(w => satWorkers.add(w)));
    let satUnpaid = 0;
    satWorkers.forEach(w => satUnpaid += getWorkerCycleEarnings(w, satCycle ? satCycle.id : ''));
    document.getElementById('saturdayInfo').textContent = `Unpaid Total: ${satUnpaid.toFixed(2)}, Trucks: ${satTrucks.length}, Workers: ${satWorkers.size}`;

    // Group Comparison Chart
    const allData = getAllGroupsData();
    const labels = Object.keys(allData);
    const values = labels.map(g => {
        const gData = allData[g];
        return gData.trucks ? gData.trucks.length : 0; // Example: number of trucks
    });
    const ctx = document.getElementById('groupChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Trucks',
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.4)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Group Performance Comparison', color: '#e5e7eb' },
                legend: {
                    labels: {
                        color: '#9ca3af'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9ca3af'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
                    },
                    ticks: {
                        color: '#9ca3af'
                    }
                }
            }
        }
    });

    // Alerts
    const alerts = [];
    // Trucks with zero attendance
    data.trucks.forEach(t => {
        if (t.attendance.length === 0) {
            alerts.push(`Truck ${t.plate} has zero attendance.`);
        }
    });
    // Workers inactive for 3+ days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const cutoff = formatDate(threeDaysAgo);
    data.workers.forEach(w => {
        const lastTruck = data.trucks.filter(t => t.attendance.includes(w)).sort((a,b) => b.date.localeCompare(a.date))[0];
        if (!lastTruck || lastTruck.date < cutoff) {
            alerts.push(`Worker ${w} inactive for 3+ days.`);
        }
    });
    document.getElementById('alertsList').innerHTML = alerts.map(a => `<p>${a}</p>`).join('');
}

