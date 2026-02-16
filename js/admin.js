/**
 * Admin Dashboard Logic for GitHub Pages
 * Menghubungkan UI admin.html dengan APIClient
 */

var pendingRequests = [];
var currentUser = null;
var sessionToken = localStorage.getItem('adminAuthToken');

// Modal Objects (Global for access across functions)
var processModalObj = null;
var expiredModalObj = null;
var agendaModalObj = null;

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    setupUI();
    validateSession();
    loadAppBranding(); // Milestone 11 Branding

    // Login Form Handler
    var loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

function setupUI() {
    // Search filter
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            renderTable(e.target.value);
        });
    }
}

function validateSession() {
    if (!sessionToken) {
        showLogin();
        return;
    }

    api.checkAuth(sessionToken)
        .then(function (res) {
            if (res.success && res.data && res.data.authenticated) {
                currentUser = res.data.user;
                showDashboard();
            } else {
                handleLogoutAction();
            }
        })
        .catch(function (err) {
            console.error("Auth check failed:", err);
            showLogin();
        });
}

function handleLogin(e) {
    if (e.preventDefault) e.preventDefault();
    var email = document.getElementById('login-email').value;
    var pass = document.getElementById('login-password').value;

    showLoading("Autentikasi...");
    api.adminLogin(email, pass)
        .then(function (res) {
            if (res.success && res.data) {
                localStorage.setItem('adminAuthToken', res.data.token);
                sessionToken = res.data.token;
                currentUser = res.data.user;
                showDashboard();
            } else {
                ui.error("Login Gagal: " + (res.message || "Email atau password salah"), "Login Error");
            }
        })
        .catch(function (err) {
            ui.error("Error: " + err.message, "System Error");
        })
        .finally(function () {
            hideLoading();
        });
}

function showDashboard() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('dashboard-app').style.display = 'block';
    document.getElementById('user-display-name').textContent = currentUser.nama;
    loadRequests();
    checkExpiringLicenses(); // Milestone 10
}

function showLogin() {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('dashboard-app').style.display = 'none';
}

function handleLogout() {
    ui.confirm("Logout dari dashboard?", "Konfirmasi Logout")
        .then(function (confirmed) {
            if (confirmed) {
                handleLogoutAction();
            }
        });
}

function handleLogoutAction() {
    localStorage.removeItem('adminAuthToken');
    sessionToken = null;
    showLogin();
}

function loadRequests() {
    showLoading("Memuat data...");
    api.getAdminRequests()
        .then(function (res) {
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
                            (res.stats.labUsed || 0) + ' / ' + (res.stats.labTotal || 0) + ' PC';
                    }
                }

                renderTable();

                // Render Active Users
                if (res.activeUsers) {
                    renderActiveUsersTable(res.activeUsers);
                }

                // Load Maintenance if stats show some
                if (res.stats && res.stats.labMaintenance > 0) {
                    loadMaintenanceList();
                }
            }
        })
        .catch(function (err) {
            console.error("Load requests failed:", err);
        })
        .finally(function () {
            hideLoading();
        });
}

function renderTable(filter) {
    var filterValue = filter || '';
    var tbody = document.getElementById('requestTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    var query = filterValue.toLowerCase();
    var filtered = pendingRequests.filter(function (r) {
        var nama = (r.nama || "").toLowerCase();
        var rid = (r.requestId || "").toLowerCase();
        var nim = (r.nim || "").toLowerCase();
        return nama.indexOf(query) !== -1 || rid.indexOf(query) !== -1 || nim.indexOf(query) !== -1;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5 text-muted">Tidak ada data permohonan baru.</td></tr>';
        return;
    }

    filtered.forEach(function (req) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' +
            '<div class="fw-bold">' + req.nama + '</div>' +
            '<div class="text-muted small">' + req.nim + ' | ID: ' + req.requestId + '</div>' +
            '</td>' +
            '<td>' +
            '<div class="small">' + req.software + '</div>' +
            '<div class="text-muted extra-small">' + req.roomPreference + '</div>' +
            '</td>' +
            '<td><span class="badge bg-light text-dark border">' + req.requestType + '</span></td>' +
            '<td class="text-center">' +
            '<button class="btn btn-primary btn-sm rounded-pill px-3" onclick="openProcessModal(\'' + req.requestId + '\')">Proses</button>' +
            '</td>';
        tbody.appendChild(tr);
    });
}

function renderActiveUsersTable(users) {
    var tbody = document.getElementById('activeUsersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">Tidak ada user aktif.</td></tr>';
        return;
    }

    users.forEach(function (user) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' +
            '<div class="fw-bold">' + (user.nama || "-") + '</div>' +
            '<div class="text-muted small">' + (user.nim || "-") + '</div>' +
            '<div class="text-muted extra-small">' + (user.email || "-") + '</div>' +
            '</td>' +
            '<td>' +
            '<div class="small fw-bold text-primary">' + (user.software || '-') + '</div>' +
            '<div class="text-muted small"><i class="bi bi-geo-alt"></i> ' + (user.room || '-') + '</div>' +
            '<div class="text-muted extra-small"><i class="bi bi-pc-display"></i> ' + (user.computer || '-') + '</div>' +
            '</td>' +
            '<td>' +
            '<div class="fw-bold small">' + (user.requestId || '-') + '</div>' +
            '<div class="text-danger extra-small">Berakhir: ' + (user.expiredOn || '-') + '</div>' +
            '</td>';
        tbody.appendChild(tr);
    });
}

function scrollToActiveUsers() {
    var section = document.getElementById('active-users-section');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * --- MAINTENANCE LOGIC ---
 */
function loadMaintenanceList() {
    var tbody = document.getElementById('maintenanceSectionBody');
    if (!tbody) return;

    api.jsonpRequest('admin-maintenance-list')
        .then(function (res) {
            if (res.success && res.data) {
                renderMaintenanceTable(res.data);
                document.getElementById('maintenance-container').classList.remove('d-none');
            } else {
                document.getElementById('maintenance-container').classList.add('d-none');
            }
        })
        .catch(function (err) {
            console.warn("Failed to load maintenance list:", err);
        });
}

function renderMaintenanceTable(data) {
    var tbody = document.getElementById('maintenanceSectionBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Tidak ada data maintenance.</td></tr>';
        return;
    }

    data.forEach(function (item) {
        var checklistHtml = '';
        var actionBtn = '';

        if (item.type === 'PC') {
            checklistHtml = '<div class="form-check small mb-1">' +
                '<input class="form-check-input" type="checkbox" id="check-storage-' + item.targetName + '">' +
                '<label class="form-check-label" for="check-storage-' + item.targetName + '">Cek Sisa Storage</label>' +
                '</div>' +
                '<div class="form-check small mb-1">' +
                '<input class="form-check-input" type="checkbox" id="check-junk-' + item.targetName + '">' +
                '<label class="form-check-label" for="check-junk-' + item.targetName + '">Bersihkan File Sampah</label>' +
                '</div>';
            actionBtn = '<button class="btn btn-primary btn-sm rounded-pill px-3" onclick="handleFinishPCMaintenance(\'' + item.targetName + '\')">PC OK</button>';
        } else {
            checklistHtml = '<div class="form-check small fw-bold text-info">' +
                '<input class="form-check-input border-info" type="checkbox" id="check-license-' + item.requestId + '">' +
                '<label class="form-check-label" for="check-license-' + item.requestId + '">Hapus dari Cloud Vendor Dashboard</label>' +
                '</div>';
            actionBtn = '<button class="btn btn-info btn-sm rounded-pill px-3 text-white" onclick="handleFinishLicenseCleanup(\'' + item.requestId + '\')">Lisensi OK</button>';
        }

        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' +
            '<span class="badge ' + (item.type === 'PC' ? 'bg-warning text-dark' : 'bg-info text-white') + ' me-2">' + item.type + '</span>' +
            '<span class="fw-bold">' + item.targetName + '</span>' +
            '</td>' +
            '<td>' +
            '<div class="small fw-bold">' + (item.lastUser || '-') + '</div>' +
            '<div class="text-muted extra-small">ID: ' + (item.requestId || '-') + '</div>' +
            '</td>' +
            '<td>' +
            '<div class="small">' + (item.dateRef || '-') + '</div>' +
            '<div class="extra-small text-danger">' + (item.daysAgo || 0) + ' hari lalu</div>' +
            '</td>' +
            '<td>' + checklistHtml + '</td>' +
            '<td class="text-center">' + actionBtn + '</td>';

        tbody.appendChild(tr);
    });
}

function scrollToMaintenance() {
    var section = document.getElementById('maintenance-container');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function handleFinishPCMaintenance(computerName) {
    var checkStorage = document.getElementById('check-storage-' + computerName);
    var checkJunk = document.getElementById('check-junk-' + computerName);

    if (!checkStorage || !checkJunk || !checkStorage.checked || !checkJunk.checked) {
        ui.warning("Berikan tanda centang pada seluruh tugas (Storage & Junk) yang sudah dikerjakan.", "Ceklis Diperlukan");
        return;
    }

    ui.confirm("Status PC " + computerName + " akan diatur menjadi Available. Lanjutkan?", "Selesaikan Maintenance")
        .then(function (confirmed) {
            if (!confirmed) return;

            showLoading("Memproses...");
            api.jsonpRequest('admin-maintenance-complete', { computerName: computerName })
                .then(function (res) {
                    if (res.success) {
                        ui.success("Berhasil: PC sudah tersedia kembali.");
                        loadRequests();
                    } else {
                        ui.error("Gagal: " + res.message);
                    }
                })
                .catch(function (err) {
                    ui.error("Error: " + err.message);
                })
                .finally(function () {
                    hideLoading();
                });
        });
}

function handleFinishLicenseCleanup(requestId) {
    var checkLicense = document.getElementById('check-license-' + requestId);

    if (!checkLicense || !checkLicense.checked) {
        ui.warning("Konfirmasi bahwa user telah dihapus dari vendor dashboard.", "Ceklis Diperlukan");
        return;
    }

    ui.confirm("Selesaikan tugas cleanup untuk ID " + requestId + "?", "Selesaikan Cleanup")
        .then(function (confirmed) {
            if (!confirmed) return;

            showLoading("Memproses...");
            api.jsonpRequest('admin-license-cleanup', { requestId: requestId })
                .then(function (res) {
                    if (res.success) {
                        ui.success("Berhasil: Tugas cleanup selesai.");
                        loadRequests();
                    } else {
                        ui.error("Gagal: " + res.message);
                    }
                })
                .catch(function (err) {
                    ui.error("Error: " + err.message);
                })
                .finally(function () {
                    hideLoading();
                });
        });
}

// Global functions for UI
window.loadRequests = loadRequests;
window.showSection = function (sectionId) {
    console.log("Switching to section:", sectionId);
};
window.scrollToMaintenance = scrollToMaintenance;
window.handleFinishPCMaintenance = handleFinishPCMaintenance;
window.handleFinishLicenseCleanup = handleFinishLicenseCleanup;

/**
 * --- REQUEST PROCESSING LOGIC ---
 */
var currentRequest = null;
var processModalObj = null;

function openProcessModal(requestId) {
    var req = null;
    for (var i = 0; i < pendingRequests.length; i++) {
        if (pendingRequests[i].requestId === requestId) {
            req = pendingRequests[i];
            break;
        }
    }
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
    var swContainer = document.getElementById('modal-software');
    swContainer.innerHTML = '';
    if (req.software) {
        req.software.split(',').forEach(function (s) {
            var span = document.createElement('span');
            span.className = 'badge bg-light text-dark border small';
            span.textContent = s.trim();
            swContainer.appendChild(span);
        });
    }

    // Default Expiration (14 days for Research, 30 for others)
    var days = (req.roomPreference === 'Ruang Penelitian') ? 14 : 30;
    var expDate = new Date();
    expDate.setDate(expDate.getDate() + days);
    document.getElementById('expiration-date-input').value = expDate.toISOString().split('T')[0];

    // Room Preference logic
    var activationKeyContainer = document.getElementById('activation-key-container');
    var activationKeyLabel = document.getElementById('activation-key-label');
    var anydeskPasswordContainer = document.getElementById('anydesk-password-container');
    var anydeskPasswordInput = document.getElementById('anydesk-password-input');

    if (activationKeyContainer) activationKeyContainer.classList.add('d-none');
    if (anydeskPasswordContainer) anydeskPasswordContainer.classList.add('d-none');
    if (anydeskPasswordInput) anydeskPasswordInput.value = '';

    if (req.needsKey) {
        if (activationKeyContainer) activationKeyContainer.classList.remove('d-none');
        if (activationKeyLabel) activationKeyLabel.textContent = "Borrow License Filter / Code";
    }

    if (req.roomPreference === 'Ruang Penelitian') {
        if (anydeskPasswordContainer) anydeskPasswordContainer.classList.remove('d-none');
    }

    // Load Computer Specs if assigned
    var specContainer = document.getElementById('computer-specs-container');
    var winUserContainer = document.getElementById('check-win-user-container');

    specContainer.classList.add('d-none');
    if (winUserContainer) {
        winUserContainer.classList.add('d-none');
        document.getElementById('id-check-win-user').checked = false;
    }

    if (req.preferredComputer && req.preferredComputer !== 'Auto Assign') {
        specContainer.classList.remove('d-none');
        if (winUserContainer && (req.requestType && req.requestType.includes('Komputer'))) {
            winUserContainer.classList.remove('d-none');
        }
        document.getElementById('spec-name').textContent = req.preferredComputer;

        api.jsonpRequest('admin-get-computer-details', { computerName: req.preferredComputer })
            .then(function (res) {
                if (res.success && res.data) {
                    document.getElementById('spec-anydesk').textContent = res.data.anydeskId || '-';
                    document.getElementById('spec-ip').textContent = res.data.ipAddress || '-';
                    document.getElementById('spec-location').textContent = res.data.location || '-';

                    // Auto-populate password if it's for Ruang Penelitian
                    if (req.roomPreference === 'Ruang Penelitian' && anydeskPasswordInput) {
                        anydeskPasswordInput.value = res.data.anydeskPassword || '';

                        // If password is empty in sheet, suggest generating one
                        if (!anydeskPasswordInput.value) {
                            api.jsonpRequest('admin-generate-anydesk-password', {
                                computerName: req.preferredComputer,
                                dateStr: req.timestamp
                            })
                                .then(function (pRes) {
                                    if (pRes.success && !anydeskPasswordInput.value) {
                                        anydeskPasswordInput.value = pRes.data;
                                    }
                                });
                        }
                    }
                }
            })
            .catch(function (e) {
                console.warn("Failed to load computer details:", e);
            });
    }

    processModalObj.show();
}

function submitApproval() {
    if (!document.getElementById('check-doc').checked) {
        ui.warning("Mohon verifikasi kelengkapan dokumen terlebih dahulu.", "Verifikasi Dokumen");
        return;
    }

    var winUserContainer = document.getElementById('check-win-user-container');
    if (winUserContainer && !winUserContainer.classList.contains('d-none')) {
        if (!document.getElementById('id-check-win-user').checked) {
            ui.warning("Mohon verifikasi pembuatan Windows User terlebih dahulu.", "Verifikasi User");
            return;
        }
    }

    var data = {
        requestId: currentRequest.requestId,
        customExpirationDate: document.getElementById('expiration-date-input').value,
        adminNotes: document.getElementById('admin-notes').value,
        activationKey: document.getElementById('activation-key-input').value,
        anydeskPassword: document.getElementById('anydesk-password-input') ? document.getElementById('anydesk-password-input').value : ""
    };

    showLoading("Memproses Approval...");
    api.jsonpRequest('admin-approve', data)
        .then(function (res) {
            if (res.success) {
                ui.success("Permohonan berhasil disetujui.");
                processModalObj.hide();

                // Clear state (Fixed in Milestone 9)
                var keyInput = document.getElementById('activation-key-input');
                if (keyInput) keyInput.value = '';

                var notesInput = document.getElementById('admin-notes');
                if (notesInput) notesInput.value = '';

                var docCheck = document.getElementById('check-doc');
                if (docCheck) docCheck.checked = false;

                var winUserCheck = document.getElementById('id-check-win-user');
                if (winUserCheck) winUserCheck.checked = false;

                loadRequests();
            } else {
                ui.error("Gagal: " + res.message);
            }
        })
        .catch(function (err) {
            ui.error("Error: " + err.message);
        })
        .finally(function () {
            hideLoading();
        });
}

function submitRejection() {
    ui.prompt("Masukkan alasan penolakan:", "Tolak Permohonan")
        .then(function (reason) {
            if (!reason) return;

            showLoading("Memproses Penolakan...");
            api.jsonpRequest('admin-reject', {
                requestId: currentRequest.requestId,
                reason: reason
            })
                .then(function (res) {
                    if (res.success) {
                        ui.success("Permohonan telah ditolak.");
                        processModalObj.hide();
                        loadRequests();
                    } else {
                        ui.error("Gagal: " + res.message);
                    }
                })
                .catch(function (err) {
                    ui.error("Error: " + err.message);
                })
                .finally(function () {
                    hideLoading();
                });
        });
}

window.openProcessModal = openProcessModal;
window.submitApproval = submitApproval;
window.submitRejection = submitRejection;

/**
 * --- EXPIRED USAGE LOGIC ---
 */
var expiredModalObj = null;

function showExpiredModal() {
    if (!expiredModalObj) {
        expiredModalObj = new bootstrap.Modal(document.getElementById('expiredModal'));
    }
    expiredModalObj.show();
    loadExpiredUsage();
}

function loadExpiredUsage() {
    var tbody = document.getElementById('expiredTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3">Memuat data...</td></tr>';

    api.jsonpRequest('admin-expired-usage')
        .then(function (res) {
            if (res.success && res.data) {
                renderExpiredTable(res.data);
            } else {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3">Tidak ada data expired.</td></tr>';
            }
        })
        .catch(function (err) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-3">Gagal memuat data.</td></tr>';
        });
}

function renderExpiredTable(data) {
    var tbody = document.getElementById('expiredTableBody');
    tbody.innerHTML = '';

    data.forEach(function (item) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' +
            '<div class="fw-bold">' + item.nama + '</div>' +
            '<div class="extra-small text-muted">' + item.email + '</div>' +
            '</td>' +
            '<td>' +
            '<div class="small fw-bold">' + item.software + '</div>' +
            '<div class="extra-small text-muted">' + item.computer + ' (' + item.room + ')</div>' +
            '</td>' +
            '<td class="text-danger fw-bold small">' + item.expirationDate + '</td>' +
            '<td class="text-center">' +
            '<button class="btn btn-outline-danger btn-sm" onclick="handleRevoke(\'' + item.requestId + '\', \'' + item.nama + '\', ' + item.rowIndex + ')">Revoke</button>' +
            '</td>';
        tbody.appendChild(tr);
    });
}

function handleRevoke(requestId, name, rowIndex) {
    ui.confirm("Cabut akses untuk " + name + "? Komputer akan dijadwalkan maintenance.", "Cabut Akses")
        .then(function (confirmed) {
            if (!confirmed) return;

            showLoading("Mencabut akses...");
            api.jsonpRequest('admin-revoke', { requestId: requestId, rowIndex: rowIndex })
                .then(function (res) {
                    if (res.success) {
                        ui.success("Akses berhasil dicabut.");
                        expiredModalObj.hide();
                        loadRequests();
                    } else {
                        ui.error("Gagal: " + res.message);
                    }
                })
                .catch(function (err) {
                    ui.error("Error: " + err.message);
                })
                .finally(function () {
                    hideLoading();
                });
        });
}

window.showExpiredModal = showExpiredModal;
window.handleRevoke = handleRevoke;

/**
 * --- AGENDA MANAGEMENT ---
 */
var agendaModalObj = null;

function openAgendaModal() {
    if (!agendaModalObj) {
        agendaModalObj = new bootstrap.Modal(document.getElementById('agendaModal'));
    }
    refreshAgendaList();
    agendaModalObj.show();
}

function refreshAgendaList() {
    var tbody = document.getElementById('agenda-list');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3 small">Memuat data agenda...</td></tr>';

    api.jsonpRequest('admin-agendas')
        .then(function (res) {
            if (!tbody) return;
            var agendas = res.data || [];

            if (agendas.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3 small">Tidak ada agenda mendatang</td></tr>';
                return;
            }

            tbody.innerHTML = agendas.map(function (a) {
                return '<tr>' +
                    '<td class="fw-bold text-primary">' + a.ruangan + '</td>' +
                    '<td>' + a.kegiatan + '</td>' +
                    '<td><div class="small">' + a.mulai + ' - ' + a.selesai + '</div></td>' +
                    '<td class="text-center">' +
                    '<div class="d-flex justify-content-center gap-1">' +
                    '<button class="btn btn-outline-danger btn-sm rounded-circle p-1" style="width:24px; height:24px; display:flex; align-items:center; justify-content:center;" onclick="handleHapusAgenda(' + a.rowIndex + ')" title="Hapus">❌</button>' +
                    '<button class="btn btn-outline-warning btn-sm rounded-circle p-1" style="width:24px; height:24px; display:flex; align-items:center; justify-content:center;" onclick="handleBroadcastAgenda(' + a.rowIndex + ')" title="Siarkan Pengingat">📢</button>' +
                    '</div>' +
                    '</td>' +
                    '</tr>';
            }).join('');
        })
        .catch(function (err) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-3 small">Error memuat data</td></tr>';
        });
}

function handleSimpanAgenda() {
    var data = {
        ruangan: document.getElementById('agenda-ruangan').value,
        kegiatan: document.getElementById('agenda-kegiatan').value,
        mulai: document.getElementById('agenda-mulai').value,
        selesai: document.getElementById('agenda-selesai').value,
        deskripsi: document.getElementById('agenda-deskripsi').value
    };

    showLoading("Menyimpan Agenda...");
    api.jsonpRequest('admin-save-agenda', data)
        .then(function (res) {
            if (res.success) {
                ui.success("Agenda berhasil disimpan.");
                document.getElementById('agendaForm').reset();
                refreshAgendaList();
            } else {
                ui.error("Gagal: " + res.message);
            }
        })
        .catch(function (err) {
            ui.error("Error: " + err.message);
        })
        .finally(function () {
            hideLoading();
        });
}

function handleHapusAgenda(rowIndex) {
    ui.confirm("Hapus agenda ini?", "Hapus Agenda")
        .then(function (confirmed) {
            if (!confirmed) return;

            showLoading("Menghapus...");
            api.jsonpRequest('admin-delete-agenda', { rowIndex: rowIndex })
                .then(function (res) {
                    if (res.success) {
                        ui.success("Agenda dihapus.");
                        refreshAgendaList();
                    } else {
                        ui.error("Gagal: " + res.message);
                    }
                })
                .catch(function (err) {
                    ui.error("Error: " + err.message);
                })
                .finally(function () {
                    hideLoading();
                });
        });
}

function handleBroadcastAgenda(rowIndex) {
    ui.confirm("Siarkan pengingat agenda ke pengguna terkait?", "Broadcast Agenda")
        .then(function (confirmed) {
            if (!confirmed) return;

            showLoading("Menyiarkan...");
            api.jsonpRequest('admin-broadcast-agenda', { rowIndex: rowIndex })
                .then(function (res) {
                    if (res.success) {
                        ui.success("Broadcast terkirim ke " + res.count + " pengguna.");
                    } else {
                        ui.error("Gagal: " + res.message);
                    }
                })
                .catch(function (err) {
                    ui.error("Error: " + err.message);
                })
                .finally(function () {
                    hideLoading();
                });
        });
}

window.openAgendaModal = openAgendaModal;
window.handleSimpanAgenda = handleSimpanAgenda;
window.handleHapusAgenda = handleHapusAgenda;
window.handleBroadcastAgenda = handleBroadcastAgenda;

/**
 * --- BRANDING LOGIC (Milestone 11) ---
 */
function loadAppBranding() {
    api.getBranding()
        .then(function (res) {
            if (res.success && res.data) {
                setupBranding(res.data);
            }
        })
        .catch(function (e) {
            console.warn('Error loading branding:', e);
        });
}

function setupBranding(data) {
    if (!data) return;

    var logoEls = document.querySelectorAll('#app-logo, #login-logo');
    if (data.logo) {
        var logoSrc = data.logo;
        if (logoSrc.trim() && logoSrc.indexOf('http') !== 0 && logoSrc.indexOf('data:') !== 0) {
            logoSrc = 'data:image/png;base64,' + logoSrc;
        }
        for (var i = 0; i < logoEls.length; i++) {
            logoEls[i].src = logoSrc;
        }
    }

    var qrEl = document.getElementById('app-qr');
    if (data.qr && qrEl) {
        var qrSrc = data.qr;
        if (qrSrc.trim() && qrSrc.indexOf('http') !== 0 && qrSrc.indexOf('data:') !== 0) {
            qrSrc = 'data:image/png;base64,' + qrSrc;
        }
        qrEl.src = qrSrc;
    }
}

// Loading UI Helpers
function showLoading(text) {
    var overlay = document.getElementById('loading-overlay');
    var textEl = document.getElementById('loading-text');
    if (overlay) overlay.style.display = 'flex';
    if (textEl) textEl.textContent = text;
}

function hideLoading() {
    var overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}
/**
 * LICENSE EXPIRATION MONITORING (Milestone 10)
 */
function checkExpiringLicenses() {
    api.jsonpRequest('admin-expiring-licenses')
        .then(function (res) {
            if (res.success && res.data && res.data.length > 0) {
                renderExpirationBanner(res.data);
            }
        })
        .catch(function (err) {
            console.warn("Failed to check expiring licenses:", err);
        });
}

function renderExpirationBanner(licenses) {
    var container = document.getElementById('license-banner-container');
    if (!container) return;

    var html = '<div class="alert alert-warning alert-dismissible fade show shadow-sm border-start border-warning border-5" role="alert" style="border-radius: 12px; margin-bottom: 2rem;">' +
        '<div class="d-flex align-items-center">' +
        '<div class="fs-4 me-3">⚠️</div>' +
        '<div>' +
        '<strong class="outfit">Peringatan Lisensi:</strong> ' + licenses.length + ' software akan berakhir dalam waktu dekat.' +
        '<div class="small mt-1">';

    licenses.forEach(function (lic, idx) {
        var badgeColor = lic.daysLeft < 7 ? 'bg-danger' : 'bg-warning text-dark';
        html += '<span class="badge ' + badgeColor + ' me-2 mb-1">' + lic.name + ' (' + lic.daysLeft + ' hari)</span>';
    });

    html += '</div></div></div>' +
        '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
        '</div>';

    container.innerHTML = html;
}
