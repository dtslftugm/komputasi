/**
 * Admin Dashboard Logic for GitHub Pages
 * Menghubungkan UI admin.html dengan APIClient
 */

let pendingRequests = [];
let currentUser = null;
let sessionToken = localStorage.getItem('adminAuthToken');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    validateSession();
    loadAppBranding(); // Milestone 11 Branding

    // Login Form Handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

function setupUI() {
    // Search filter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => renderTable(e.target.value));
    }
}

async function validateSession() {
    if (!sessionToken) {
        showLogin();
        return;
    }

    try {
        const res = await api.checkAuth(sessionToken); // Gunakan method yang sesuai
        if (res.success && res.data && res.data.authenticated) {
            currentUser = res.data.user;
            showDashboard();
        } else {
            handleLogoutAction();
        }
    } catch (err) {
        console.error("Auth check failed:", err);
        showLogin();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;

    showLoading("Autentikasi...");
    try {
        const res = await api.adminLogin(email, pass);
        if (res.success && res.data) {
            localStorage.setItem('adminAuthToken', res.data.token);
            sessionToken = res.data.token;
            currentUser = res.data.user;
            showDashboard();
        } else {
            alert("Login Gagal: " + (res.message || "Email atau password salah"));
        }
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        hideLoading();
    }
}

function showDashboard() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('dashboard-app').style.display = 'block';
    document.getElementById('user-display-name').textContent = currentUser.nama;
    loadRequests();
}

function showLogin() {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('dashboard-app').style.display = 'none';
}

function handleLogout() {
    if (confirm("Keluar dari dashboard?")) {
        handleLogoutAction();
    }
}

function handleLogoutAction() {
    localStorage.removeItem('adminAuthToken');
    sessionToken = null;
    showLogin();
}

async function loadRequests() {
    showLoading("Memuat data...");
    try {
        const res = await api.getAdminRequests();
        if (res.success) {
            pendingRequests = res.data || [];

            // Update stats
            if (res.stats) {
                document.getElementById('count-pending').textContent = res.stats.pending || 0;
                document.getElementById('count-active-users').textContent = res.stats.activeUsers || 0;
                document.getElementById('count-expired').textContent = res.stats.toRevoke || 0;

                // New Stats (Synced from GAS)
                if (document.getElementById('count-maintenance')) {
                    document.getElementById('count-maintenance').textContent = res.stats.labMaintenance || 0;
                }
                if (document.getElementById('count-total-requests')) {
                    document.getElementById('count-total-requests').textContent =
                        `${res.stats.labUsed || 0} / ${res.stats.labTotal || 0} PC`;
                }
            }

            renderTable();

            // Load Maintenance if stats show some
            if (res.stats && res.stats.labMaintenance > 0) {
                loadMaintenanceList();
            }
        }
    } catch (err) {
        console.error("Load requests failed:", err);
    } finally {
        hideLoading();
    }
}

function renderTable(filter = '') {
    const tbody = document.getElementById('requestTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const query = filter.toLowerCase();
    const filtered = pendingRequests.filter(r =>
        (r.nama || "").toLowerCase().includes(query) ||
        (r.requestId || "").toLowerCase().includes(query) ||
        (r.nim || "").toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5 text-muted">Tidak ada data permohonan baru.</td></tr>';
        return;
    }

    filtered.forEach(req => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="fw-bold">${req.nama}</div>
                <div class="text-muted small">${req.nim} | ID: ${req.requestId}</div>
            </td>
            <td>
                <div class="small">${req.software}</div>
                <div class="text-muted extra-small">${req.roomPreference}</div>
            </td>
            <td><span class="badge bg-light text-dark border">${req.requestType}</span></td>
            <td class="text-center">
                <button class="btn btn-primary btn-sm rounded-pill px-3" onclick="openProcessModal('${req.requestId}')">Proses</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * --- MAINTENANCE LOGIC ---
 */
async function loadMaintenanceList() {
    const tbody = document.getElementById('maintenanceSectionBody');
    if (!tbody) return;

    try {
        const res = await api.jsonpRequest('admin-maintenance-list');
        if (res.success && res.data) {
            renderMaintenanceTable(res.data);
            document.getElementById('maintenance-container').classList.remove('d-none');
        } else {
            document.getElementById('maintenance-container').classList.add('d-none');
        }
    } catch (err) {
        console.warn("Failed to load maintenance list:", err);
    }
}

function renderMaintenanceTable(data) {
    const tbody = document.getElementById('maintenanceSectionBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Tidak ada data maintenance.</td></tr>';
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');

        let checklistHtml = '';
        let actionBtn = '';

        if (item.type === 'PC') {
            checklistHtml = `
                <div class="form-check small mb-1">
                    <input class="form-check-input" type="checkbox" id="check-storage-${item.targetName}">
                    <label class="form-check-label" for="check-storage-${item.targetName}">Cek Sisa Storage</label>
                </div>
                <div class="form-check small mb-1">
                    <input class="form-check-input" type="checkbox" id="check-junk-${item.targetName}">
                    <label class="form-check-label" for="check-junk-${item.targetName}">Bersihkan File Sampah</label>
                </div>
            `;
            actionBtn = `<button class="btn btn-primary btn-sm rounded-pill px-3" onclick="handleFinishPCMaintenance('${item.targetName}')">PC OK</button>`;
        } else {
            checklistHtml = `
                <div class="form-check small fw-bold text-info">
                    <input class="form-check-input border-info" type="checkbox" id="check-license-${item.requestId}">
                    <label class="form-check-label" for="check-license-${item.requestId}">Hapus dari Cloud Vendor Dashboard</label>
                </div>
            `;
            actionBtn = `<button class="btn btn-info btn-sm rounded-pill px-3 text-white" onclick="handleFinishLicenseCleanup('${item.requestId}', ${item.rowIndex})">Lisensi OK</button>`;
        }

        tr.innerHTML = `
            <td>
                <span class="badge ${item.type === 'PC' ? 'bg-warning text-dark' : 'bg-info text-white'} me-2">${item.type}</span>
                <span class="fw-bold">${item.targetName}</span>
            </td>
            <td>
                <div class="small fw-bold">${item.lastUser || '-'}</div>
                <div class="text-muted extra-small">ID: ${item.requestId || '-'}</div>
            </td>
            <td>
                <div class="small">${item.dateRef || '-'}</div>
                <div class="extra-small text-danger">${item.daysAgo || 0} hari lalu</div>
            </td>
            <td>${checklistHtml}</td>
            <td class="text-center">${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

function showMaintenanceModal() {
    const modal = new bootstrap.Modal(document.getElementById('maintenanceModal'));
    loadMaintenanceList('maintenanceTableBody');
    modal.show();
}

async function handleFinishPCMaintenance(computerName) {
    const storageCheck = document.getElementById(`check-storage-${computerName}`).checked;
    const junkCheck = document.getElementById(`check-junk-${computerName}`).checked;

    if (!storageCheck || !junkCheck) {
        alert("Berikan tanda centang pada tugas yang sudah dikerjakan.");
        return;
    }

    if (!confirm(`Status PC ${computerName} akan diatur menjadi Available. Lanjutkan?`)) return;

    showLoading("Memproses...");
    try {
        const res = await api.jsonpRequest('admin-complete-maintenance', { computerName: computerName });
        if (res.success) {
            alert("Berhasil: PC sudah tersedia kembali.");
            loadRequests();
        } else {
            alert("Gagal: " + res.message);
        }
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        hideLoading();
    }
}

async function handleFinishLicenseCleanup(requestId, rowIndex) {
    if (!document.getElementById(`check-license-${requestId}`).checked) {
        alert("Konfirmasi bahwa user telah dihapus dari vendor dashboard.");
        return;
    }

    if (!confirm(`Selesaikan tugas cleanup untuk ID ${requestId}?`)) return;

    showLoading("Memproses...");
    try {
        const res = await api.jsonpRequest('admin-complete-license-cleanup', { requestId, rowIndex });
        if (res.success) {
            alert("Berhasil: Tugas cleanup selesai.");
            loadRequests();
        } else {
            alert("Gagal: " + res.message);
        }
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        hideLoading();
    }
}

// Global functions for UI
window.loadRequests = loadRequests;
window.showSection = (sectionId) => {
    console.log("Switching to section:", sectionId);
};
window.showMaintenanceModal = showMaintenanceModal;
window.handleFinishPCMaintenance = handleFinishPCMaintenance;
window.handleFinishLicenseCleanup = handleFinishLicenseCleanup;

/**
 * --- REQUEST PROCESSING LOGIC ---
 */
let currentRequest = null;
let processModalObj = null;

async function openProcessModal(requestId) {
    const req = pendingRequests.find(r => r.requestId === requestId);
    if (!req) return;

    currentRequest = req;
    if (!processModalObj) {
        processModalObj = new bootstrap.Modal(document.getElementById('processModal'));
    }

    // Set UI Details
    document.getElementById('modal-request-id').textContent = requestId;
    document.getElementById('modal-nama').textContent = req.nama;
    document.getElementById('modal-nim').textContent = req.nim;
    document.getElementById('modal-prodi').textContent = req.prodi;
    document.getElementById('modal-email').textContent = req.email || '-';
    document.getElementById('modal-doc-link').href = req.fileUrl;
    document.getElementById('admin-notes').value = '';

    // Handle Software Badges
    const swContainer = document.getElementById('modal-software');
    swContainer.innerHTML = '';
    if (req.software) {
        req.software.split(',').forEach(s => {
            const span = document.createElement('span');
            span.className = 'badge bg-light text-dark border small';
            span.textContent = s.trim();
            swContainer.appendChild(span);
        });
    }

    // Default Expiration (14 days for Research, 30 for others)
    const days = (req.roomPreference === 'Ruang Penelitian') ? 14 : 30;
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + days);
    document.getElementById('expiration-date-input').value = expDate.toISOString().split('T')[0];

    // Activation Key handling (simplified for now)
    const keyContainer = document.getElementById('activation-key-container');
    keyContainer.classList.add('d-none');
    if (req.requestType === 'Borrow License') {
        keyContainer.classList.remove('d-none');
    }

    // Load Computer Specs if assigned
    const specContainer = document.getElementById('computer-specs-container');
    specContainer.classList.add('d-none');
    if (req.preferredComputer && req.preferredComputer !== 'Auto Assign') {
        specContainer.classList.remove('d-none');
        document.getElementById('spec-name').textContent = req.preferredComputer;

        try {
            const res = await api.jsonpRequest('admin-computer-details', { computerName: req.preferredComputer });
            if (res.success && res.data) {
                document.getElementById('spec-anydesk').textContent = res.data.anydeskId || '-';
                document.getElementById('spec-ip').textContent = res.data.ipAddress || '-';
                document.getElementById('spec-location').textContent = res.data.location || '-';
            }
        } catch (e) {
            console.warn("Failed to load computer details:", e);
        }
    }

    processModalObj.show();
}

async function submitApproval() {
    if (!document.getElementById('check-doc').checked) {
        alert("Mohon verifikasi kelengkapan dokumen terlebih dahulu.");
        return;
    }

    const data = {
        requestId: currentRequest.requestId,
        expirationDate: document.getElementById('expiration-date-input').value,
        adminNotes: document.getElementById('admin-notes').value,
        activationKey: document.getElementById('activation-key-input').value
    };

    showLoading("Memproses Approval...");
    try {
        const res = await api.jsonpRequest('admin-approve', data);
        if (res.success) {
            alert("Permohonan berhasil disetujui.");
            processModalObj.hide();
            loadRequests();
        } else {
            alert("Gagal: " + res.message);
        }
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        hideLoading();
    }
}

async function submitRejection() {
    const reason = prompt("Masukkan alasan penolakan:");
    if (!reason) return;

    showLoading("Memproses Penolakan...");
    try {
        const res = await api.jsonpRequest('admin-reject', {
            requestId: currentRequest.requestId,
            reason: reason
        });
        if (res.success) {
            alert("Permohonan telah ditolak.");
            processModalObj.hide();
            loadRequests();
        } else {
            alert("Gagal: " + res.message);
        }
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        hideLoading();
    }
}

window.openProcessModal = openProcessModal;
window.submitApproval = submitApproval;
window.submitRejection = submitRejection;

/**
 * --- EXPIRED USAGE LOGIC ---
 */
let expiredModalObj = null;

async function showExpiredModal() {
    if (!expiredModalObj) {
        expiredModalObj = new bootstrap.Modal(document.getElementById('expiredModal'));
    }
    expiredModalObj.show();
    loadExpiredUsage();
}

async function loadExpiredUsage() {
    const tbody = document.getElementById('expiredTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3">Memuat data...</td></tr>';

    try {
        const res = await api.jsonpRequest('admin-expired-usage');
        if (res.success && res.data) {
            renderExpiredTable(res.data);
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3">Tidak ada data expired.</td></tr>';
        }
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-3">Gagal memuat data.</td></tr>';
    }
}

function renderExpiredTable(data) {
    const tbody = document.getElementById('expiredTableBody');
    tbody.innerHTML = '';

    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="fw-bold">${item.nama}</div>
                <div class="extra-small text-muted">${item.email}</div>
            </td>
            <td>
                <div class="small fw-bold">${item.software}</div>
                <div class="extra-small text-muted">${item.computer} (${item.room})</div>
            </td>
            <td class="text-danger fw-bold small">${item.expirationDate}</td>
            <td class="text-center">
                <button class="btn btn-outline-danger btn-sm" onclick="handleRevoke('${item.requestId}', '${item.nama}', ${item.rowIndex})">Revoke</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function handleRevoke(requestId, name, rowIndex) {
    if (!confirm(`Cabut akses untuk ${name}? Komputer akan dijadwalkan maintenance.`)) return;

    showLoading("Revoking Access...");
    try {
        const res = await api.jsonpRequest('admin-revoke', { requestId, rowIndex });
        if (res.success) {
            alert("Akses berhasil dicabut.");
            loadExpiredUsage();
            loadRequests();
        } else {
            alert("Gagal: " + res.message);
        }
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        hideLoading();
    }
}

window.showExpiredModal = showExpiredModal;
window.handleRevoke = handleRevoke;

/**
 * --- AGENDA MANAGEMENT ---
 */
let agendaModalObj = null;

async function openAgendaModal() {
    if (!agendaModalObj) {
        agendaModalObj = new bootstrap.Modal(document.getElementById('agendaModal'));
    }
    refreshAgendaList();
    agendaModalObj.show();
}

async function refreshAgendaList() {
    const tbody = document.getElementById('agenda-list');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3 small">Memuat data agenda...</td></tr>';

    try {
        const res = await api.jsonpRequest('admin-agendas');
        if (!tbody) return;
        const agendas = res.data || [];

        if (agendas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3 small">Tidak ada agenda mendatang</td></tr>';
            return;
        }

        tbody.innerHTML = agendas.map(a => {
            return `
                <tr>
                    <td class="fw-bold text-primary">${a.ruangan}</td>
                    <td>${a.kegiatan}</td>
                    <td><div class="small">${a.mulai} - ${a.selesai}</div></td>
                    <td class="text-center">
                        <div class="d-flex justify-content-center gap-1">
                            <button class="btn btn-outline-danger btn-sm rounded-circle p-1" style="width:24px; height:24px; display:flex; align-items:center; justify-content:center;" onclick="handleHapusAgenda(${a.rowIndex})" title="Hapus">❌</button>
                            <button class="btn btn-outline-warning btn-sm rounded-circle p-1" style="width:24px; height:24px; display:flex; align-items:center; justify-content:center;" onclick="handleBroadcastAgenda(${a.rowIndex})" title="Siarkan Pengingat">📢</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-3 small">Error memuat data</td></tr>';
    }
}

async function handleSimpanAgenda() {
    const data = {
        ruangan: document.getElementById('agenda-ruangan').value,
        kegiatan: document.getElementById('agenda-kegiatan').value,
        mulai: document.getElementById('agenda-mulai').value,
        selesai: document.getElementById('agenda-selesai').value,
        deskripsi: document.getElementById('agenda-deskripsi').value
    };

    showLoading("Menyimpan Agenda...");
    try {
        const res = await api.jsonpRequest('admin-save-agenda', data);
        if (res.success) {
            alert("Agenda berhasil disimpan.");
            document.getElementById('agendaForm').reset();
            refreshAgendaList();
        } else {
            alert("Gagal: " + res.message);
        }
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        hideLoading();
    }
}

async function handleHapusAgenda(rowIndex) {
    if (!confirm("Hapus agenda ini?")) return;

    showLoading("Menghapus...");
    try {
        const res = await api.jsonpRequest('admin-delete-agenda', { rowIndex: rowIndex });
        if (res.success) {
            refreshAgendaList();
        } else {
            alert("Gagal: " + res.message);
        }
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        hideLoading();
    }
}

async function handleBroadcastAgenda(rowIndex) {
    if (!confirm("Siarkan pengingat agenda ke pengguna terkait?")) return;

    showLoading("Broadcasting...");
    try {
        const res = await api.jsonpRequest('admin-broadcast-agenda', { rowIndex: rowIndex });
        if (res.success) {
            alert(`Broadcast terkirim ke ${res.count} pengguna.`);
        } else {
            alert("Gagal: " + res.message);
        }
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        hideLoading();
    }
}

window.openAgendaModal = openAgendaModal;
window.handleSimpanAgenda = handleSimpanAgenda;
window.handleHapusAgenda = handleHapusAgenda;
window.handleBroadcastAgenda = handleBroadcastAgenda;

/**
 * --- BRANDING LOGIC (Milestone 11) ---
 */
async function loadAppBranding() {
    try {
        const res = await api.getBranding();
        if (res.success && res.data) {
            setupBranding(res.data);
        }
    } catch (e) {
        console.warn('Error loading branding:', e);
    }
}

function setupBranding(data) {
    if (!data) return;

    // Set logos
    const logoEls = document.querySelectorAll('#app-logo, #login-logo');
    if (data.logo) {
        let logoSrc = data.logo;
        if (logoSrc.trim() && !logoSrc.startsWith('http') && !logoSrc.startsWith('data:')) {
            logoSrc = 'data:image/png;base64,' + logoSrc;
        }
        logoEls.forEach(el => { el.src = logoSrc; });
    }

    // Set QR code (optional for admin but kept for consistency)
    const qrEl = document.getElementById('app-qr');
    if (data.qr && qrEl) {
        let qrSrc = data.qr;
        if (qrSrc.trim() && !qrSrc.startsWith('http') && !qrSrc.startsWith('data:')) {
            qrSrc = 'data:image/png;base64,' + qrSrc;
        }
        qrEl.src = qrSrc;
    }
}

// Loading UI Helpers
function showLoading(text) {
    const overlay = document.getElementById('loading-overlay');
    const textEl = document.getElementById('loading-text');
    if (overlay) overlay.style.display = 'flex';
    if (textEl) textEl.textContent = text;
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}
