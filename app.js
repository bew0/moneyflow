/* ═══════════ Data & Config ═══════════ */
const CATEGORIES = {
    income: [
        { name: 'เงินเดือน', icon: 'fas fa-briefcase', color: '#22c55e' },
        { name: 'งานฟรีแลนซ์', icon: 'fas fa-laptop-code', color: '#10b981' },
        { name: 'ลงทุน', icon: 'fas fa-chart-line', color: '#14b8a6' },
        { name: 'ขายของ', icon: 'fas fa-store', color: '#06b6d4' },
        { name: 'โบนัส', icon: 'fas fa-gift', color: '#0ea5e9' },
        { name: 'เงินรายวัน', icon: 'fas fa-calendar-day', color: '#34d399' },
        { name: 'อื่นๆ', icon: 'fas fa-ellipsis', color: '#8b5cf6' },
    ],
    expense: [
        { name: 'อาหาร', icon: 'fas fa-utensils', color: '#ef4444' },
        { name: 'เดินทาง', icon: 'fas fa-car', color: '#f97316' },
        { name: 'ช้อปปิ้ง', icon: 'fas fa-bag-shopping', color: '#ec4899' },
        { name: 'บ้าน/ค่าเช่า', icon: 'fas fa-house', color: '#f59e0b' },
        { name: 'ค่าน้ำ/ไฟ', icon: 'fas fa-bolt', color: '#eab308' },
        { name: 'สุขภาพ', icon: 'fas fa-heart-pulse', color: '#e11d48' },
        { name: 'บันเทิง', icon: 'fas fa-gamepad', color: '#a855f7' },
        { name: 'การศึกษา', icon: 'fas fa-graduation-cap', color: '#6366f1' },
        { name: 'โทรศัพท์/เน็ต', icon: 'fas fa-wifi', color: '#0ea5e9' },
        { name: 'อื่นๆ', icon: 'fas fa-ellipsis', color: '#64748b' },
    ]
};

const MONTH_NAMES = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const CHART_COLORS = ['#ef4444', '#f97316', '#ec4899', '#f59e0b', '#eab308', '#e11d48', '#a855f7', '#6366f1', '#0ea5e9', '#64748b', '#22c55e', '#10b981', '#14b8a6', '#06b6d4'];

/* ═══════════ State ═══════════ */
let transactions = JSON.parse(localStorage.getItem('mf_transactions') || '[]');
let currentType = 'income';
let currentFilter = 'all';
let deleteTargetId = null;
let viewDate = new Date();
let pieChart = null;
let barChart = null;
let scriptUrl = localStorage.getItem('mf_script_url') || '';
let isSyncing = false;

/* ═══════════ DOM ═══════════ */
const $ = id => document.getElementById(id);
const form = $('transactionForm');
const btnIncome = $('btnIncome');
const btnExpense = $('btnExpense');
const categorySelect = $('category');
const amountInput = $('amount');
const dateInput = $('date');
const noteInput = $('note');
const txList = $('transactionList');
const deleteModal = $('deleteModal');
const settingsModal = $('settingsModal');
const scriptUrlInput = $('scriptUrl');
const connectionStatus = $('connectionStatus');
const syncBtn = $('syncBtn');
const pullBtn = $('pullBtn');
const syncDot = $('syncDot');

/* ═══════════ Init ═══════════ */
window.addEventListener('DOMContentLoaded', () => {
    dateInput.value = new Date().toISOString().split('T')[0];
    populateCategories();
    updateMonthLabel();
    render();

    // Month nav
    $('prevMonth').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() - 1); updateMonthLabel(); render(); });
    $('nextMonth').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() + 1); updateMonthLabel(); render(); });

    // Type toggle
    btnIncome.addEventListener('click', () => switchType('income'));
    btnExpense.addEventListener('click', () => switchType('expense'));

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTransactions();
        });
    });

    // Form submit
    form.addEventListener('submit', handleSubmit);

    // Delete Modal
    $('cancelDelete').addEventListener('click', () => deleteModal.classList.remove('show'));
    $('confirmDelete').addEventListener('click', confirmDeleteTx);
    deleteModal.addEventListener('click', e => { if (e.target === deleteModal) deleteModal.classList.remove('show'); });

    // Settings
    $('settingsBtn').addEventListener('click', openSettings);
    $('cancelSettings').addEventListener('click', () => settingsModal.classList.remove('show'));
    settingsModal.addEventListener('click', e => { if (e.target === settingsModal) settingsModal.classList.remove('show'); });
    $('testConnection').addEventListener('click', testConnection);
    $('pushToSheet').addEventListener('click', pushToSheet);
    $('pullFromSheet').addEventListener('click', pullFromSheet);

    // Sync buttons
    syncBtn.addEventListener('click', pushToSheet);
    pullBtn.addEventListener('click', pullFromSheet);
    updateSyncDot();
});

/* ═══════════ Functions ═══════════ */
function switchType(type) {
    currentType = type;
    btnIncome.classList.toggle('active', type === 'income');
    btnExpense.classList.toggle('active', type === 'expense');
    populateCategories();
}

function populateCategories() {
    const cats = CATEGORIES[currentType];
    categorySelect.innerHTML = '<option value="">เลือกหมวดหมู่</option>' +
        cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

function updateMonthLabel() {
    $('currentMonth').textContent = `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear() + 543}`;
}

function handleSubmit(e) {
    e.preventDefault();
    const tx = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        type: currentType,
        category: categorySelect.value,
        amount: parseFloat(amountInput.value),
        date: dateInput.value,
        note: noteInput.value.trim()
    };
    transactions.unshift(tx);
    save();
    render();
    // Auto-sync
    if (scriptUrl) autoSync('add', tx);
    // Reset
    amountInput.value = '';
    noteInput.value = '';
    categorySelect.value = '';
    // Pulse submit button
    const btn = $('submitBtn');
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => btn.style.transform = '', 150);
}

function save() {
    localStorage.setItem('mf_transactions', JSON.stringify(transactions));
}

function getMonthTx() {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    return transactions.filter(tx => {
        const d = new Date(tx.date);
        return d.getFullYear() === y && d.getMonth() === m;
    });
}

function render() {
    const monthTx = getMonthTx();
    const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    $('totalIncome').textContent = formatMoney(inc);
    $('totalExpense').textContent = formatMoney(exp);
    $('balance').textContent = formatMoney(inc - exp);
    $('totalCount').textContent = monthTx.length;

    renderTransactions();
    renderPieChart(monthTx);
    renderBarChart();
}

function formatMoney(n) {
    return '฿' + n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCatInfo(type, name) {
    return CATEGORIES[type].find(c => c.name === name) || { icon: 'fas fa-circle', color: '#64748b' };
}

function renderTransactions() {
    let list = getMonthTx();
    if (currentFilter !== 'all') list = list.filter(t => t.type === currentFilter);
    list.sort((a, b) => b.date.localeCompare(a.date));

    if (list.length === 0) {
        txList.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>ยังไม่มีรายการ</p></div>`;
        return;
    }

    txList.innerHTML = list.map(tx => {
        const cat = getCatInfo(tx.type, tx.category);
        const sign = tx.type === 'income' ? '+' : '-';
        return `
        <div class="transaction-item">
            <div class="tx-cat-icon" style="background:${cat.color}20;color:${cat.color}">
                <i class="${cat.icon}"></i>
            </div>
            <div class="tx-details">
                <div class="tx-category">${tx.category}</div>
                <div class="tx-meta">
                    <span><i class="fas fa-calendar-day"></i> ${formatDate(tx.date)}</span>
                    ${tx.note ? `<span><i class="fas fa-pen"></i> ${tx.note}</span>` : ''}
                </div>
            </div>
            <div class="tx-amount ${tx.type}">${sign}${formatMoney(tx.amount)}</div>
            <button class="tx-delete" onclick="promptDelete('${tx.id}')" title="ลบ">
                <i class="fas fa-xmark"></i>
            </button>
        </div>`;
    }).join('');
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear() + 543}`;
}

function promptDelete(id) {
    deleteTargetId = id;
    deleteModal.classList.add('show');
}

function confirmDeleteTx() {
    const delId = deleteTargetId;
    transactions = transactions.filter(t => t.id !== delId);
    save();
    render();
    deleteModal.classList.remove('show');
    // Auto-sync delete
    if (scriptUrl) autoSync('delete', { id: delId });
}

/* ═══════════ Charts ═══════════ */
function renderPieChart(monthTx) {
    const expTx = monthTx.filter(t => t.type === 'expense');
    const catMap = {};
    expTx.forEach(tx => { catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount; });
    const labels = Object.keys(catMap);
    const data = Object.values(catMap);
    const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

    // Legend
    const legendEl = $('pieLegend');
    if (labels.length === 0) {
        legendEl.innerHTML = '';
    } else {
        legendEl.innerHTML = labels.map((l, i) =>
            `<div class="legend-item"><div class="legend-dot" style="background:${colors[i]}"></div>${l} (${((data[i] / data.reduce((a, b) => a + b, 0)) * 100).toFixed(0)}%)</div>`
        ).join('');
    }

    const ctx = $('pieChart').getContext('2d');
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }]
        },
        options: {
            responsive: true,
            cutout: '65%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17,24,39,0.95)',
                    titleColor: '#f1f5f9', bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
                    cornerRadius: 10, padding: 12,
                    callbacks: { label: ctx => ` ฿${ctx.parsed.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` }
                }
            },
            animation: { animateRotate: true, duration: 800 }
        }
    });
}

function renderBarChart() {
    const year = viewDate.getFullYear();
    const incomeData = [], expenseData = [], labels = [];
    for (let m = 0; m < 12; m++) {
        labels.push(MONTH_NAMES[m].slice(0, 3));
        const monthTx = transactions.filter(tx => {
            const d = new Date(tx.date);
            return d.getFullYear() === year && d.getMonth() === m;
        });
        incomeData.push(monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
        expenseData.push(monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
    }

    const ctx = $('barChart').getContext('2d');
    if (barChart) barChart.destroy();
    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'รายรับ', data: incomeData, backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 6, barPercentage: 0.6 },
                { label: 'รายจ่าย', data: expenseData, backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 6, barPercentage: 0.6 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => v >= 1000 ? (v / 1000) + 'k' : v } }
            },
            plugins: {
                legend: { labels: { color: '#94a3b8', usePointStyle: true, pointStyle: 'rectRounded', padding: 16 } },
                tooltip: {
                    backgroundColor: 'rgba(17,24,39,0.95)',
                    titleColor: '#f1f5f9', bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
                    cornerRadius: 10, padding: 12,
                    callbacks: { label: ctx => ` ${ctx.dataset.label}: ฿${ctx.parsed.y.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` }
                }
            },
            animation: { duration: 800 }
        }
    });
}

/* ═══════════ Google Sheets Integration ═══════════ */
function openSettings() {
    scriptUrlInput.value = scriptUrl;
    connectionStatus.className = 'settings-status';
    connectionStatus.textContent = '';
    settingsModal.classList.add('show');
}

function saveScriptUrl(url) {
    scriptUrl = url.trim();
    localStorage.setItem('mf_script_url', scriptUrl);
    updateSyncDot();
}

function updateSyncDot() {
    syncDot.classList.toggle('hidden', !scriptUrl);
}

function showToast(message, type = 'info') {
    const container = $('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'circle-xmark' : 'circle-info'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('out'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function setSyncing(state) {
    isSyncing = state;
    syncBtn.classList.toggle('syncing', state);
}

async function testConnection() {
    const url = scriptUrlInput.value.trim();
    if (!url) { connectionStatus.className = 'settings-status error'; connectionStatus.textContent = 'กรุณาใส่ URL'; return; }
    connectionStatus.className = 'settings-status info';
    connectionStatus.style.display = 'block';
    connectionStatus.textContent = 'กำลังทดสอบ...';
    connectionStatus.style.color = 'var(--text-secondary)';
    connectionStatus.style.background = 'var(--accent-bg)';
    connectionStatus.style.borderColor = 'var(--accent)';
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
            connectionStatus.className = 'settings-status success';
            connectionStatus.textContent = `✅ เชื่อมต่อสำเร็จ! พบ ${data.data.length} รายการใน Sheet`;
            saveScriptUrl(url);
        } else {
            connectionStatus.className = 'settings-status error';
            connectionStatus.textContent = '❌ เชื่อมต่อไม่สำเร็จ: ' + (data.error || 'Unknown error');
        }
    } catch (err) {
        connectionStatus.className = 'settings-status error';
        connectionStatus.textContent = '❌ ไม่สามารถเชื่อมต่อได้: ' + err.message;
    }
}

async function pushToSheet() {
    if (!scriptUrl) { showToast('กรุณาตั้งค่า Google Script URL ก่อน', 'error'); openSettings(); return; }
    if (isSyncing) return;
    setSyncing(true);
    showToast('กำลัง Push ข้อมูลไป Google Sheets...', 'info');
    try {
        const res = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'sync', transactions })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Push สำเร็จ! ${data.message}`, 'success');
        } else {
            showToast('Push ไม่สำเร็จ: ' + data.error, 'error');
        }
    } catch (err) {
        showToast('Push ผิดพลาด: ' + err.message, 'error');
    }
    setSyncing(false);
}

async function pullFromSheet() {
    if (!scriptUrl) { showToast('กรุณาตั้งค่า Google Script URL ก่อน', 'error'); return; }
    if (isSyncing) return;
    setSyncing(true);
    pullBtn.classList.add('syncing');
    showToast('กำลัง Pull ข้อมูลจาก Google Sheets...', 'info');
    try {
        const res = await fetch(scriptUrl);
        const data = await res.json();
        if (data.success) {
            transactions = data.data;
            save();
            render();
            showToast(`Pull สำเร็จ! ได้ ${data.data.length} รายการ`, 'success');
        } else {
            showToast('Pull ไม่สำเร็จ: ' + data.error, 'error');
        }
    } catch (err) {
        showToast('Pull ผิดพลาด: ' + err.message, 'error');
    }
    pullBtn.classList.remove('syncing');
    setSyncing(false);
}

async function autoSync(action, payload) {
    if (!scriptUrl || isSyncing) return;
    try {
        const body = action === 'add'
            ? { action: 'add', transaction: payload }
            : { action: 'delete', id: payload.id };
        await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(body)
        });
    } catch (err) {
        // Silent fail for auto-sync
        console.warn('Auto-sync failed:', err);
    }
}
