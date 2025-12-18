let data = { workers: [], trucks: [], payments: [] };
let chart;

function getStorageKey() {
    return 'kimoja_' + group + '_data';
}

function loadData() {
    const stored = localStorage.getItem(getStorageKey());
    if (stored) {
        data = JSON.parse(stored);
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
}

function addWorker() {
    const name = document.getElementById('newWorker').value.trim();
    if (name && !data.workers.includes(name)) {
        data.workers.push(name);
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
        const truck = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            plate,
            tonnage,
            totalPay,
            attendance: []
        };
        data.trucks.push(truck);
        saveData();
        addTruckToDOM(truck);
        if (document.getElementById('workerSelect').value) updateGraph();
        document.getElementById('addTruckForm').reset();
    }
}

function toggleAttendance(truckId, worker) {
    const truck = data.trucks.find(t => t.id === truckId);
    if (truck) {
        const index = truck.attendance.indexOf(worker);
        if (index > -1) {
            truck.attendance.splice(index, 1);
        } else {
            truck.attendance.push(worker);
        }
        saveData();
        renderPayments();
        if (document.getElementById('workerSelect').value) updateGraph();
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
}

function renderWorkers() {
    const list = document.getElementById('workerList');
    list.innerHTML = '';
    data.workers.forEach(worker => {
        const li = document.createElement('li');
        li.textContent = worker;
        list.appendChild(li);
    });
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
            updateGraph();
        }
    }
}

function renderAllTrucks() {
    const container = document.getElementById('truckList');
    container.innerHTML = '';
    data.trucks.forEach(truck => {
        addTruckToDOM(truck);
    });
}

function addTruckToDOM(truck) {
    const container = document.getElementById('truckList');
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
    const totals = calculateUnpaid();
    const unpaidDiv = document.getElementById('unpaidTotals');
    unpaidDiv.innerHTML = '<h3>Unpaid Totals</h3>';
    data.workers.forEach(worker => {
        const div = document.createElement('div');
        div.className = 'worker-total';
        div.innerHTML = `<span>${worker}</span><span>${totals[worker].toFixed(2)}</span>`;
        unpaidDiv.appendChild(div);
    });

    const historyList = document.getElementById('paymentHistory');
    historyList.innerHTML = '';
    data.payments.forEach(payment => {
        const li = document.createElement('li');
        li.textContent = `${payment.date}: ${payment.worker} - ${payment.amount.toFixed(2)}`;
        historyList.appendChild(li);
    });
}

function prepareGraphData(workerName) {
    const dailyEarnings = getDailyEarnings();
    const allDates = Object.keys(dailyEarnings).sort();
    const labels = allDates;
    const values = allDates.map(date => dailyEarnings[date][workerName] || 0);
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
    if (chart) chart.destroy();
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
                    text: worker + ' Daily Earnings'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
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

