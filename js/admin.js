/**
 * Admin Dashboard Logic untuk GitHub Pages
 * Menghubungkan UI admin.html dengan APIClient
 */

var pendingRequests = [];
var activeUsersList = [];
var currentUser = null;
var sessionToken = localStorage.getItem('adminAuthToken');

// Standardized Configuration (Synced from GAS Sheet Config)
var adminConfig = {
    durationRegular: 30,
    seatExpiration: 14
};

// Modal Objects (Global for access across functions)
var processModalObj = null;
var expiredModalObj = null;
var agendaModalObj = null;

// State management for process modal
var currentRequest = null;
var currentReassignedComputer = null;

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
    // Search filter (Now targeting Active Users, Milestone 18)
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            renderActiveUsersTable(e.target.value);
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

                // --- SMART SORTING (Milestone 18: Urgency + FCFS) ---
                pendingRequests.sort(function (a, b) {
                    var dateA = parseDateIndo(a.mulaiPemakaian);
                    var dateB = parseDateIndo(b.mulaiPemakaian);

                    if (dateA.getTime() !== dateB.getTime()) {
                        return dateA - dateB; // 1. Urgency (Primary: Earlier start date)
                    }
                    // 2. FCFS (Secondary: Earlier timestamp for same start date)
                    return new Date(a.timestamp) - new Date(b.timestamp);
                });

                // Update stats
                if (res.stats) {
                    document.getElementById('count-pending').textContent = (res.stats.pending || 0) + (res.stats.antrean || 0);
                    if (document.getElementById('count-antrean')) {
                        document.getElementById('count-antrean').textContent = res.stats.antrean || 0;
                    }
                    document.getElementById('count-active-users').textContent = res.stats.activeUsers || 0;
                    document.getElementById('count-expired').textContent = res.stats.toRevoke || 0;

                    // New Stats (Synced from GAS)
                    if (document.getElementById('count-maintenance')) {
                        document.getElementById('count-maintenance').textContent = (res.stats.labMaintenance || 0) + (res.stats.licenseMaintenance || 0);
                    }
                    if (document.getElementById('count-total-requests')) {
                        document.getElementById('count-total-requests').textContent =
                            (res.stats.labUsed || 0) + ' / ' + (res.stats.labTotal || 0) + ' PC';
                    }
                }

                // Sync configurations (Milestone 21)
                if (res.config) {
                    adminConfig.durationRegular = res.config.durationRegular || 30;
                    adminConfig.seatExpiration = res.config.seatExpiration || 14;
                }
                if (res.swMap) {
                    adminConfig.swMap = res.swMap;
                }

                renderTable();

                // Render Active Users
                if (res.activeUsers) {
                    activeUsersList = res.activeUsers.sort(function (a, b) {
                        // 1. Sort by Nama (Alphabetical Ascending)
                        var nameA = (a.nama || "").toLowerCase();
                        var nameB = (b.nama || "").toLowerCase();
                        if (nameA < nameB) return -1;
                        if (nameA > nameB) return 1;

                        // 2. Sort by Expired On (Ascending)
                        var dateA = new Date(a.expiredOn || 0).getTime();
                        var dateB = new Date(b.expiredOn || 0).getTime();

                        // If standard parse is successful, compare numerically
                        if (!isNaN(dateA) && !isNaN(dateB)) {
                            return dateA - dateB;
                        }

                        // Fallback: String Compare
                        var strA = a.expiredOn || "";
                        var strB = b.expiredOn || "";
                        if (strA < strB) return -1;
                        if (strA > strB) return 1;
                        return 0;
                    });
                    renderActiveUsersTable();
                } else {
                    activeUsersList = [];
                    renderActiveUsersTable();
                }

                // Load Maintenance if stats show some
                if (res.stats && res.stats.labMaintenance > 0) {
                    // Maintenance managed in maintenance.html
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
        var statusMatch = true;
        var rStatus = (r.status || "").toUpperCase();

        if (filterValue === 'ANTREAN') {
            statusMatch = (rStatus === 'ANTREAN');
        } else if (filterValue === 'PENDING') {
            statusMatch = rStatus.startsWith('PENDING') || rStatus === 'ANTREAN';
        } else if (filterValue) {
            // General text search
            var nama = (r.nama || "").toLowerCase();
            var rid = (r.requestId || "").toLowerCase();
            var nim = (r.nim || "").toLowerCase();
            statusMatch = nama.indexOf(query) !== -1 || rid.indexOf(query) !== -1 || nim.indexOf(query) !== -1;
        } else {
            // Default: Show PENDING and Mitra active workflows for the main view
            statusMatch = rStatus.startsWith('PENDING') || rStatus === 'ANTREAN';
        }
        return statusMatch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5 text-muted">Tidak ada data permohonan baru.</td></tr>';
        return;
    }

    // --- CONFLICT DETECTION: Multiple ANTREAN on same specific computer ---
    var queueComputerCount = {};
    filtered.forEach(function (r) {
        var rStatus = (r.status || '').toUpperCase();
        var pref = (r.preferredComputer || '').trim();
        if (rStatus === 'ANTREAN' && pref && pref !== 'ANTREAN') {
            queueComputerCount[pref] = (queueComputerCount[pref] || 0) + 1;
        }
    });

    filtered.forEach(function (req) {
        var rStatus = (req.status || '').toUpperCase();
        var pref = (req.preferredComputer || '').trim();
        req.hasQueueConflict = (rStatus === 'ANTREAN' && pref && pref !== 'ANTREAN' && queueComputerCount[pref] > 1);
        req.queueConflictCount = queueComputerCount[pref] || 0;

        var tr = document.createElement('tr');
        var statusClass = req.status === 'ANTREAN' ? 'bg-warning text-dark border-warning fw-bold' : 'bg-light text-dark';
        var statusLabel = req.status === 'ANTREAN' ? '⏱️ MENGANTRE' : req.requestType;

        // Urgency Badge Logic
        var startDt = parseDateIndo(req.mulaiPemakaian);
        var today = new Date(); today.setHours(0, 0, 0, 0);
        var tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);

        var urgencyBadge = '';
        if (startDt.getTime() === today.getTime()) urgencyBadge = '<span class="badge bg-danger ms-1" style="font-size:0.6rem;">Hari Ini</span>';
        else if (startDt.getTime() === tomorrow.getTime()) urgencyBadge = '<span class="badge bg-warning text-dark ms-1" style="font-size:0.6rem;">Besok</span>';

        // Queue conflict badge
        var conflictBadge = req.hasQueueConflict
            ? '<span class="badge bg-danger ms-1" style="font-size:0.6rem;" title="' + req.queueConflictCount + ' pengantre untuk unit yang sama">⚠️ Konflik Antrean</span>'
            : '';

        // Preferred computer label for ANTREAN rows
        var queuePrefLabel = '';
        if (rStatus === 'ANTREAN' && pref && pref !== 'ANTREAN') {
            queuePrefLabel = '<div class="extra-small fw-bold" style="color:#dc3545;">🎯 Preferensi: ' + pref + conflictBadge + '</div>';
        } else if (rStatus === 'ANTREAN') {
            queuePrefLabel = '<div class="text-muted extra-small">⚠️ WAITING LIST (Bebas)</div>';
        }

        tr.innerHTML = '<td>' +
            '<div class="fw-bold d-flex align-items-center">' +
            req.nama +
            (req.periodCount > 1 ? '<span class="badge bg-info ms-2" title="Sedang jalan periode ke-' + req.periodCount + '">Period ' + req.periodCount + '</span>' : '') +
            '</div>' +
            '<div class="text-muted extra-small outfit">' + (req.timestamp || "") + '</div>' +
            '<div class="text-muted small">' + req.nim + ' | ID: ' + req.requestId + '</div>' +
            '</td>' +
            '<td>' +
            '<div class="small">' + req.software + '</div>' +
            '<div class="small fw-bold mt-1" style="color:var(--accent-color);">📅 Mulai: ' + formatDateHuman(req.mulaiPemakaian) + urgencyBadge + '</div>' +
            (rStatus === 'ANTREAN' ? queuePrefLabel : '<div class="text-muted extra-small">' + req.roomPreference + '</div>') +
            '</td>' +
            '<td><span class="badge ' + statusClass + ' border">' + statusLabel + '</span></td>' +
            '<td class="text-center">' +
            '<button class="btn btn-primary btn-sm rounded-pill px-3" onclick="openProcessModal(\'' + req.requestId + '\', ' + req.rowIndex + ')">Proses</button>' +
            '</td>';
        tbody.appendChild(tr);
    });
}

function renderActiveUsersTable(filterText) {
    var tbody = document.getElementById('activeUsersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    var query = (filterText || "").toLowerCase();

    // Default to the global list we saved during loadRequests
    var usersToRender = activeUsersList;

    // Apply filter if search input is active
    if (query !== "") {
        usersToRender = usersToRender.filter(function (u) {
            var nama = (u.nama || "").toLowerCase();
            var nim = (u.nim || "").toLowerCase();
            var rid = (u.requestId || "").toLowerCase();
            return nama.indexOf(query) !== -1 || nim.indexOf(query) !== -1 || rid.indexOf(query) !== -1;
        });
    }

    if (!usersToRender || usersToRender.length === 0) {
        if (query !== "") {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">Filter: Tidak ada user aktif yang sesuai dengan "' + filterText + '".</td></tr>';
        } else {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">Tidak ada user aktif.</td></tr>';
        }
        return;
    }

    usersToRender.forEach(function (user) {
        var reqComputer = user.computer || '-';
        var tr = document.createElement('tr');

        // Make row clickable only if they need a computer AND it is assigned
        var hasComputer = user.needsComputer === true && (reqComputer && reqComputer !== '-');
        if (hasComputer) {
            tr.style.cursor = 'pointer';
            tr.onclick = function () { openActiveUserModal(user.nama, user.nim, reqComputer); };
        }

        tr.innerHTML = '<td>' +
            '<div class="fw-bold d-flex align-items-center">' +
            (user.nama || "-") +
            (user.periodCount > 1 ? '<span class="badge bg-info ms-2" style="font-size:0.6rem;">P' + user.periodCount + '</span>' : '') +
            '</div>' +
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
            api.run('apiCompleteLicenseCleanup', { requestId: requestId })
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
window.scrollToActiveUsers = scrollToActiveUsers;
window.handleFinishLicenseCleanup = handleFinishLicenseCleanup;

/**
 * --- REQUEST PROCESSING LOGIC ---
 */

/**
 * Detect which softwares in a request need a Borrow License (Rule-Based)
 */
function getBorrowSoftwares(softwareStr) {
    if (!softwareStr || !adminConfig.swMap) return [];
    var softwares = softwareStr.split(',').map(function (s) { return s.trim(); });
    return softwares.filter(function (sw) {
        var info = adminConfig.swMap[sw];
        if (!info || !info.rules) return false;
        // Check for 'borrow license' rule (case-insensitive)
        return info.rules.some(function (r) { return r.toLowerCase().indexOf('borrow license') !== -1; });
    });
}

/**
 * Render dynamic input fields for Borrow License softwares
 */
function renderBorrowKeyInputs(borrowSoftwares) {
    var container = document.getElementById('activation-key-container');
    if (!container) return;

    // Clear previous dynamic inputs
    var dynamicInputs = container.querySelectorAll('.dynamic-borrow-wrapper');
    dynamicInputs.forEach(function (el) { el.remove(); });

    var singleInput = document.getElementById('activation-key-input');
    var singleLabel = document.getElementById('activation-key-label');

    if (borrowSoftwares.length > 1) {
        // Hide standard single input, show multiple
        if (singleInput) singleInput.classList.add('d-none');
        if (singleLabel) singleLabel.classList.add('d-none');

        borrowSoftwares.forEach(function (sw) {
            var wrapper = document.createElement('div');
            wrapper.className = 'dynamic-borrow-wrapper mb-3';
            wrapper.innerHTML = '<label class="form-label fw-bold small text-primary mb-1">Activation Key: ' + sw + '</label>' +
                '<input type="text" class="form-control dynamic-borrow-key rounded-pill" data-software="' + sw + '" placeholder="Enter key for ' + sw + '...">';
            container.appendChild(wrapper);
        });
    } else {
        // Use standard single input
        if (singleInput) {
            singleInput.classList.remove('d-none');
            singleInput.value = '';
            singleInput.placeholder = borrowSoftwares.length === 1 ? "Enter key for " + borrowSoftwares[0] + "..." : "Enter key from vendor...";
        }
        if (singleLabel) {
            singleLabel.classList.remove('d-none');
            singleLabel.textContent = borrowSoftwares.length === 1 ? "Activation Key: " + borrowSoftwares[0] : "Activation Key / Code";
        }
    }
}

function openProcessModal(requestId, rowIndex) {
    // Priority search by rowIndex for precision in renewals
    var req = pendingRequests.find(function (r) { return r.rowIndex === rowIndex; });

    // Fallback to requestId for safety
    if (!req) {
        req = pendingRequests.find(function (r) { return r.requestId === requestId; });
    }
    if (!req) return;

    if (!processModalObj) {
        processModalObj = new bootstrap.Modal(document.getElementById('processModal'));
    }

    currentRequest = req;
    currentReassignedComputer = null;

    // 1. Set Labels
    document.getElementById('modal-request-id').textContent = requestId;
    document.getElementById('modal-nama').textContent = req.nama || '-';
    document.getElementById('modal-nim').textContent = req.nim || '-';
    document.getElementById('modal-prodi').textContent = req.prodi || '-';

    var isNonUgm = req.prodi && req.prodi.indexOf('Non-UGM') === 0;
    var univContainer = document.getElementById('universitas-container');
    if (univContainer) univContainer.style.display = isNonUgm ? 'block' : 'none';
    var univEl = document.getElementById('modal-universitas');
    if (univEl) univEl.textContent = req.universitas || '-';

    var dosenEl = document.getElementById('modal-dosen');
    if (dosenEl) dosenEl.textContent = req.dosen || '-';

    // Mitra vs Academic View Toggles
    var isMitra = req.sheetName === 'Mitra';
    var prodiContainer = document.getElementById('prodi-container');
    var dosenContainer = document.getElementById('dosen-container');
    var asalInstitusiContainer = document.getElementById('asal-institusi-container');

    // Elements specific to Mitra visibility
    var infoHeader = document.getElementById('modal-info-header');
    var nimRow = document.getElementById('modal-nim-row');
    var nikRow = document.getElementById('modal-nik-row');
    var emailUgmRow = document.getElementById('modal-email-ugm-row');
    var keperluanRow = document.getElementById('modal-keperluan-row');
    var identityLink = document.getElementById('modal-identity-link');

    if (isMitra) {
        if (infoHeader) infoHeader.textContent = 'Informasi Mitra';
        if (nimRow) nimRow.style.display = 'none';
        if (emailUgmRow) emailUgmRow.style.display = 'none';
        if (keperluanRow) keperluanRow.style.display = 'none';

        // Show NIK/NPWP row
        if (nikRow) {
            nikRow.style.display = 'block';
            var nikEl = document.getElementById('modal-nik');
            if (nikEl) nikEl.textContent = req.nikNpwp || '-';
        }

        // Show Identitas KTP/NPWP link if available
        if (identityLink) {
            if (req.identityUrl && req.identityUrl.trim()) {
                identityLink.href = req.identityUrl;
                identityLink.classList.remove('d-none');
            } else {
                identityLink.classList.add('d-none');
            }
        }

        if (prodiContainer) prodiContainer.style.display = 'none';
        if (univContainer) univContainer.style.display = 'none';
        if (dosenContainer) dosenContainer.style.display = 'none';

        if (asalInstitusiContainer) {
            asalInstitusiContainer.style.display = 'block';
            document.getElementById('modal-asal-institusi').textContent = req.asalInstitusi || '-';
        }
    } else {
        if (infoHeader) infoHeader.textContent = 'Informasi Mahasiswa';
        if (nimRow) nimRow.style.display = 'block';
        if (nikRow) nikRow.style.display = 'none';
        if (emailUgmRow) emailUgmRow.style.display = 'block';
        if (keperluanRow) keperluanRow.style.display = 'block';
        if (identityLink) identityLink.classList.add('d-none');

        if (prodiContainer) prodiContainer.style.display = 'block';
        if (dosenContainer) dosenContainer.style.display = 'block';
        if (asalInstitusiContainer) asalInstitusiContainer.style.display = 'none';
        // univContainer is already handled by isNonUgm logic above
    }

    // Renewal Identification & Badge
    var renewalBadge = document.getElementById('modal-renewal-badge');
    if (renewalBadge) {
        if (req.isRenewal) {
            renewalBadge.classList.remove('d-none');
            if (req.periodCount > 1) {
                renewalBadge.innerHTML = '🔄 <strong>Data Perpanjangan (Periode ke-' + req.periodCount + '):</strong> Data telah dimuat.';
            } else {
                renewalBadge.innerHTML = '🔄 <strong>Data Perpanjangan:</strong> Data telah dimuat.';
            }
        } else if (req.status === 'ANTREAN') {
            renewalBadge.classList.remove('d-none');
            renewalBadge.classList.replace('bg-info', 'bg-warning');
            var antreanPref = (req.preferredComputer || '').trim();
            var antreanPrefLabel = (antreanPref && antreanPref !== 'ANTREAN')
                ? 'Preferensi unit: <strong>' + antreanPref + '</strong>'
                : 'Preferensi unit: <strong>Bebas (unit pertama yang tersedia)</strong>';
            var conflictInfo = req.hasQueueConflict
                ? ' &nbsp;<span class="badge bg-danger">&#9888;&#65039; ' + req.queueConflictCount + ' pengantre untuk unit yang sama — Keputusan ada di tangan Admin</span>'
                : '';
            renewalBadge.innerHTML = '&#9203; <strong>USER MENGANTRE:</strong> ' + antreanPrefLabel + conflictInfo;
        } else {
            renewalBadge.classList.add('d-none');
        }
    }

    var topikEl = document.getElementById('modal-topik');
    if (topikEl) topikEl.textContent = req.topik || '-';

    var keperluanEl = document.getElementById('modal-keperluan');
    if (keperluanEl) keperluanEl.textContent = req.keperluan || '-';

    var catatanEl = document.getElementById('modal-catatan');
    if (catatanEl) catatanEl.textContent = req.catatan || '-';

    var typeBadge = document.getElementById('modal-request-type');
    if (typeBadge) {
        if (isMitra && req.requestType === 'Standard') {
            typeBadge.textContent = 'Standard (Mitra)';
        } else {
            typeBadge.textContent = req.requestType || '-';
        }
    }
    document.getElementById('modal-email').textContent = req.email || '-';
    document.getElementById('modal-email-ugm').textContent = req.emailUGM || '-';

    var phoneLink = document.getElementById('modal-phone');
    if (phoneLink) {
        if (req.phone && req.phone.includes('wa.me')) {
            phoneLink.href = req.phone;
        } else {
            phoneLink.href = '#';
            phoneLink.textContent = req.phone || '📱 WhatsApp';
        }
    }

    // Render Software badges
    var swContainer = document.getElementById('modal-software');
    if (swContainer) {
        swContainer.innerHTML = '';
        if (req.software) {
            req.software.split(',').forEach(function (s) {
                var span = document.createElement('span');
                span.className = 'badge bg-light text-dark border small me-1';
                span.textContent = s.trim();
                swContainer.appendChild(span);
            });
        }
    }

    // Renewal Details Visibility
    var renewalInfoContainer = document.getElementById('renewal-details-container');
    if (renewalInfoContainer) {
        var hasProgressData = req.progresSebelumnya || req.targetSelanjutnya || req.kendala;
        if (req.isRenewal || req.hasNimHistory || hasProgressData) {
            renewalInfoContainer.classList.remove('d-none');
            document.getElementById('modal-progres-sebelumnya').textContent = req.progresSebelumnya || '-';
            document.getElementById('modal-target-selanjutnya').textContent = req.targetSelanjutnya || '-';
            document.getElementById('modal-kendala').textContent = req.kendala || '-';

            // If it's a NIM history match but NOT an official renewal, add a note
            if (!req.isRenewal && req.hasNimHistory) {
                var header = renewalInfoContainer.querySelector('h6');
                if (header) header.innerHTML = '🔄 Riwayat NIM Terdeteksi';
            }
        } else {
            renewalInfoContainer.classList.add('d-none');
        }
    }

    var docLink = document.getElementById('modal-doc-link');
    if (docLink) docLink.href = req.fileUrl || '#';

    // 2. Reset UI State & Inputs
    document.getElementById('admin-notes').value = '';
    var keyInput = document.getElementById('activation-key-input');
    var anydeskPasswordInput = document.getElementById('anydesk-password-input');
    if (keyInput) keyInput.value = '';
    if (anydeskPasswordInput) anydeskPasswordInput.value = '';

    // Visibility management
    var keyContainer = document.getElementById('activation-key-container');
    var anydeskPasswordContainer = document.getElementById('anydesk-password-container');
    var specContainer = document.getElementById('computer-specs-container');
    var serverLicenseContainer = document.getElementById('server-license-container');
    var reallocateSelector = document.getElementById('reallocate-selector');
    var specDetails = document.getElementById('spec-details-box');
    var winUserContainer = document.getElementById('check-win-user-container');

    // Default: Hide all optional sections
    if (keyContainer) keyContainer.classList.add('d-none');
    if (anydeskPasswordContainer) anydeskPasswordContainer.classList.add('d-none');
    if (specContainer) specContainer.classList.add('d-none');
    if (serverLicenseContainer) serverLicenseContainer.classList.add('d-none');
    if (reallocateSelector) reallocateSelector.classList.add('d-none');
    if (specDetails) specDetails.classList.remove('d-none');
    document.getElementById('reallocate-btn').innerText = "🔄 Change";

    if (winUserContainer) {
        winUserContainer.classList.add('d-none');
        document.getElementById('id-check-win-user').checked = false;
    }

    // 3. Logic-based Visibility & Content
    // Milestone 17 Fix: Default calculation (will be updated once computer details are loaded)
    calculateAndSetExpirationDate(req.roomPreference);

    // Activation Key / Borrow License (Dynamic Rule-Based Rendering)
    var borrowSoftwares = getBorrowSoftwares(req.software);
    if (req.needsKey || req.requestType === 'Borrow License' || borrowSoftwares.length > 0) {
        if (keyContainer) {
            keyContainer.classList.remove('d-none');
            renderBorrowKeyInputs(borrowSoftwares);
        }
    }

    // AnyDesk (Only for Research Room)
    if (req.roomPreference === 'Ruang Penelitian') {
        if (anydeskPasswordContainer) anydeskPasswordContainer.classList.remove('d-none');
        updateAnydeskPasswordUI();
    }

    // Server License Configuration
    if (serverLicenseContainer) {
        var reqTypeStr = (req.requestType || "");
        var isServerType = reqTypeStr.indexOf('Akses Lisensi Server') !== -1;

        console.log("SERVER LICENSE CHECK:", { reqType: reqTypeStr, isServerType: isServerType, software: req.software });

        if (req.needsServerInfo || isServerType || (req.computerUsername && req.computerHostname)) {
            serverLicenseContainer.classList.remove('d-none');
            var serverConfigInput = document.getElementById('server-license-config');
            var applicantConfigStr = "allow=" + (req.computerUsername || "") + "@" + (req.computerHostname || "");

            if (serverConfigInput) {
                if (isServerType && req.software) {
                    serverConfigInput.value = "Menarik data Dosen & User aktif dari server...";

                    // Fetch active users + dosen rules
                    api.run('admin-active-software-users', { softwareName: req.software })
                        .then(function (res) {
                            if (res.success && res.data && res.data.allowlist) {
                                serverConfigInput.value = res.data.allowlist + "\n" + applicantConfigStr;
                            } else {
                                serverConfigInput.value = applicantConfigStr + "\n(Gagal menarik data list aktif: " + (res.message || "Unknown Error") + ")";
                            }
                        })
                        .catch(function (err) {
                            serverConfigInput.value = applicantConfigStr + "\n(" + err + ")";
                        });
                } else {
                    serverConfigInput.value = applicantConfigStr;
                }
            }
        }
    }

    // Computer Specs (Visibility based on Request Type & Preference)
    var reqType = req.requestType || "";
    var isLaptopPribadi = (req.roomPreference || "").toLowerCase().indexOf("laptop pribadi") !== -1;
    var isPureLicense = reqType.indexOf("Borrow License") !== -1 || reqType.indexOf("Cloud License") !== -1 || reqType.indexOf("Akses Lisensi Server") !== -1;
    var noComputerNeeded = isLaptopPribadi || isPureLicense || (req.needsComputer === false);

    var computerToShow = req.preferredComputer;
    var hasValidComputer = computerToShow && computerToShow !== 'Auto Assign' && computerToShow !== 'Belum Dialokasikan';

    if (hasValidComputer || !noComputerNeeded) {
        specContainer.classList.remove('d-none');

        if (hasValidComputer) {
            document.getElementById('spec-name').textContent = computerToShow;
            api.jsonpRequest('admin-get-computer-details', { computerName: computerToShow })
                .then(function (res) {
                    if (res.success && res.data) {
                        document.getElementById('spec-anydesk').textContent = res.data.anydeskId || '-';
                        document.getElementById('spec-ip').textContent = res.data.ipAddress || '-';
                        document.getElementById('spec-location').textContent = res.data.location || '-';
                        var actualLocation = res.data.location || '';

                        // Milestone Fix: Update Expiration Date based on ACTUAL location
                        calculateAndSetExpirationDate(actualLocation);

                        // Milestone Fix: Toggle AnyDesk visibility based on ACTUAL location of the computer
                        if (actualLocation === 'Ruang Penelitian') {
                            if (anydeskPasswordContainer) anydeskPasswordContainer.classList.remove('d-none');
                            if (anydeskPasswordInput && res.data.anydeskPassword) {
                                anydeskPasswordInput.value = res.data.anydeskPassword;
                            } else {
                                updateAnydeskPasswordUI(); // Fallback to generate if not provided
                            }
                        } else {
                            if (anydeskPasswordContainer) anydeskPasswordContainer.classList.add('d-none');
                        }
                    }
                });
        } else {
            document.getElementById('spec-name').textContent = "Belum Dialokasikan";
            document.getElementById('spec-anydesk').textContent = '-';
            document.getElementById('spec-ip').textContent = '-';
            document.getElementById('spec-location').textContent = '-';
        }
    }

    // Show Windows User check only for Computer access
    if (winUserContainer && !noComputerNeeded) {
        winUserContainer.classList.remove('d-none');
    }

    // --- Mitra Workflow Panel Control ---
    var mitraContainer = document.getElementById('mitra-workflow-container');
    var standardAction = document.getElementById('standard-action-container');
    var panelSurat = document.getElementById('mitra-panel-surat');
    var panelInvoice = document.getElementById('mitra-panel-invoice');
    var panelPayment = document.getElementById('mitra-panel-payment');

    if (mitraContainer && standardAction) {
        if (isMitra) {
            mitraContainer.classList.remove('d-none');

            // Default hide all sub-panels
            panelSurat.classList.add('d-none');
            panelInvoice.classList.add('d-none');
            panelPayment.classList.add('d-none');

            // Reset inputs
            document.getElementById('mitra-upload-surat').value = '';
            document.getElementById('mitra-link-surat').value = '';
            document.getElementById('mitra-upload-invoice').value = '';
            document.getElementById('mitra-link-invoice').value = '';

            var reqStatus = req.status || 'PENDING - APPROVAL';

            if (reqStatus === 'PENDING - IZIN') {
                // Tahap 1: Biro setujui dan upload Surat Kadep
                panelSurat.classList.remove('d-none');
                standardAction.classList.add('d-none'); // Hide Reject/Grant buttons for now
            } else if (reqStatus === 'PENDING - INVOICE') {
                // Tahap 2: Keuangan upload Invoice
                panelInvoice.classList.remove('d-none');
                standardAction.classList.add('d-none');
            } else if (reqStatus === 'PENDING - PAYMENT' || reqStatus === 'PENDING - APPROVAL') {
                // Tahap 3: Mitra upload bukti, Admin/Keuangan cek
                panelPayment.classList.remove('d-none');
                standardAction.classList.remove('d-none'); // Munculkan Reject/Grant untuk finalisasi

                var proofContainer = document.getElementById('mitra-payment-proof-container');
                var proofLink = document.getElementById('mitra-payment-proof-link');
                var statusMsg = document.getElementById('mitra-payment-status-msg');

                if (req.buktiPembayaran && req.buktiPembayaran.trim()) {
                    // Bukti sudah diterima
                    proofContainer.classList.remove('d-none');
                    proofLink.href = req.buktiPembayaran;
                    if (statusMsg) {
                        statusMsg.className = 'alert alert-success small mb-2 p-2';
                        statusMsg.innerHTML = '<i class="bi bi-check-circle"></i> <strong>Bukti Pembayaran sudah diterima.</strong> Silakan verifikasi lalu klik Grant untuk menyelesaikan proses.';
                    }
                } else {
                    // Belum ada bukti
                    proofContainer.classList.add('d-none');
                    if (statusMsg) {
                        statusMsg.className = 'alert alert-warning small mb-2 p-2';
                        statusMsg.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Pending Payment: Menunggu pembayaran dari Mitra.';
                    }
                }
            } else {
                // Jika Granted, dsb.
                mitraContainer.classList.add('d-none');
                standardAction.classList.remove('d-none');
            }
        } else {
            // Not Mitra
            mitraContainer.classList.add('d-none');
            standardAction.classList.remove('d-none');
        }
    }

    processModalObj.show();
}


/**
 * --- MITRA WORKFLOW ACTIONS ---
 */
function submitMitraSurat() {
    if (!currentRequest) return;

    var fileInput = document.getElementById('mitra-upload-surat');
    var linkInput = document.getElementById('mitra-link-surat');

    if (fileInput.files.length === 0 && !linkInput.value.trim()) {
        ui.error("Mohon pilih file atau masukkan link Surat Persetujuan Kadep.");
        return;
    }

    var uploadPromise;
    if (fileInput.files.length > 0) {
        var f = fileInput.files[0];
        if (f.size > 5 * 1024 * 1024) {
            ui.error("Ukuran file maksimal 5 MB.");
            return;
        }
        var reader = new FileReader();
        uploadPromise = new Promise(function (resolve, reject) {
            reader.onload = function (e) {
                var base64 = e.target.result.split(',')[1];
                resolve({
                    fileData: base64,
                    fileName: f.name,
                    mimeType: f.type || 'application/pdf'
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(f);
        });
    } else {
        uploadPromise = Promise.resolve({ suratLink: linkInput.value.trim() });
    }

    showLoading("Menyimpan Surat & Memberitahu Keuangan...");
    uploadPromise.then(function (payload) {
        payload.requestId = currentRequest.requestId;
        payload.token = sessionToken; // Fix: Add auth token for Mitra backend validation
        return api.updateMitraSuratKadep(payload);
    }).then(function (res) {
        if (res.success) {
            ui.success("Surat Persetujuan berhasil disimpan. Email notifikasi dikirim ke Keuangan.");
            processModalObj.hide();
            loadRequests(); // Refresh table
        } else {
            ui.error("Gagal: " + res.message);
        }
    }).catch(function (err) {
        ui.error("Error: " + err);
    }).finally(function () {
        hideLoading();
    });
}

function submitMitraInvoice() {
    if (!currentRequest) return;

    var fileInput = document.getElementById('mitra-upload-invoice');
    var linkInput = document.getElementById('mitra-link-invoice');

    if (fileInput.files.length === 0 && !linkInput.value.trim()) {
        ui.error("Mohon pilih file atau masukkan link Invoice / Kode Bayar.");
        return;
    }

    var uploadPromise;
    if (fileInput.files.length > 0) {
        var f = fileInput.files[0];
        if (f.size > 5 * 1024 * 1024) {
            ui.error("Ukuran file maksimal 5 MB.");
            return;
        }
        var reader = new FileReader();
        uploadPromise = new Promise(function (resolve, reject) {
            reader.onload = function (e) {
                var base64 = e.target.result.split(',')[1];
                resolve({
                    fileData: base64,
                    fileName: f.name,
                    mimeType: f.type || 'application/pdf'
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(f);
        });
    } else {
        uploadPromise = Promise.resolve({ invoiceLink: linkInput.value.trim() });
    }

    showLoading("Menyimpan Invoice & Mengirim Tagihan ke Mitra...");
    uploadPromise.then(function (payload) {
        payload.requestId = currentRequest.requestId;
        payload.token = sessionToken; // Fix: Add auth token for Mitra backend validation
        return api.updateMitraInvoice(payload);
    }).then(function (res) {
        if (res.success) {
            ui.success("Invoice berhasil dikirim. Email tagihan dikirim ke Mitra pemohon.");
            processModalObj.hide();
            loadRequests();
        } else {
            ui.error("Gagal: " + res.message);
        }
    }).catch(function (err) {
        ui.error("Error: " + err);
    }).finally(function () {
        hideLoading();
    });
}

function toggleReallocate() {
    var selector = document.getElementById('reallocate-selector');
    var details = document.getElementById('spec-details-box');
    var btn = document.getElementById('reallocate-btn');

    if (selector.classList.contains('d-none')) {
        selector.classList.remove('d-none');
        details.classList.add('d-none');
        btn.innerText = "✖ Cancel";
        loadAvailableComputers();
    } else {
        selector.classList.add('d-none');
        details.classList.remove('d-none');
        btn.innerText = "🔄 Change";
    }
}

function loadAvailableComputers() {
    var select = document.getElementById('replacement-computer-select');
    select.innerHTML = '<option value="">Memuat...</option>';

    api.getAvailableComputers()
        .then(function (res) {
            select.innerHTML = '<option value="">-- Pilih unit pengganti --</option>';
            if (res.success && res.data) {
                res.data.forEach(function (c) {
                    var opt = document.createElement('option');
                    opt.value = c.name;
                    opt.innerText = c.name + " (" + (c.location || "Lab") + ")";
                    select.appendChild(opt);
                });
            }
        });
}

function applyReallocation() {
    var select = document.getElementById('replacement-computer-select');
    var newComp = select.value;
    if (!newComp) return;

    currentReassignedComputer = newComp;
    document.getElementById('spec-name').textContent = newComp + " (Manual)";

    api.jsonpRequest('admin-get-computer-details', { computerName: newComp })
        .then(function (res) {
            if (res.success && res.data) {
                document.getElementById('spec-anydesk').textContent = res.data.anydeskId || '-';
                document.getElementById('spec-ip').textContent = res.data.ipAddress || '-';
                document.getElementById('spec-location').textContent = res.data.location || '-';
                var actualLocation = res.data.location || '';
                var anydeskPasswordContainer = document.getElementById('anydesk-password-container');

                // Toggle back to details
                toggleReallocate();

                // Milestone Fix: IMMEDIATELY update Preferred_Computer in sheet to prevent race condition
                api.jsonpRequest('admin-update-preferred-computer', {
                    requestId: currentRequest.requestId,
                    newComputer: newComp,
                    sheetName: currentRequest.sheetName
                }).then(function (res) {
                    if (res.success) {
                        console.log("Computer reserved immediately: " + newComp);
                    }
                });

                // Milestone Fix: Update Expiration Date based on NEW location
                calculateAndSetExpirationDate(actualLocation);

                // Milestone Fix: Toggle AnyDesk visibility based on NEW computer's location
                if (actualLocation === 'Ruang Penelitian') {
                    if (anydeskPasswordContainer) anydeskPasswordContainer.classList.remove('d-none');
                    updateAnydeskPasswordUI();
                } else {
                    if (anydeskPasswordContainer) anydeskPasswordContainer.classList.add('d-none');
                }
            }
        });
}

function updateAnydeskPasswordUI() {
    var computerName = currentReassignedComputer || (currentRequest ? currentRequest.preferredComputer : '');
    var timestamp = currentRequest ? currentRequest.timestamp : '';

    if (!computerName || computerName === 'Auto Assign') {
        return;
    }

    api.jsonpRequest('admin-generate-anydesk-password', {
        computerName: computerName,
        dateStr: timestamp
    }).then(function (res) {
        if (res.success) {
            var passInput = document.getElementById('anydesk-password-input');
            if (passInput) passInput.value = res.data;
        }
    });
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

    // Server License Info Validation
    if (currentRequest && currentRequest.needsServerInfo) {
        var isLabPC = currentRequest.requestType === "Lisensi + Komputer" || currentRequest.requestType === "Komputer";
        if (!isLabPC && (!currentRequest.computerUsername || !currentRequest.computerHostname)) {
            ui.error("Data Username dan Hostname wajib diisi oleh mahasiswa untuk lisensi tipe Server (Perangkat Pribadi).", "Data Tidak Lengkap");
            return;
        }
    }

    // Validation for Borrow License Activation Key (Milestone 20)
    // Use the dynamic needsKey property from the backend instead of hardcoded types
    if (currentRequest && currentRequest.needsKey) {
        var dynInputs = document.querySelectorAll('.dynamic-borrow-key');
        var singleInput = document.getElementById('activation-key-input');

        var hasKey = false;
        if (dynInputs.length > 0) {
            dynInputs.forEach(function (inp) {
                if (inp.value.trim()) {
                    hasKey = true;
                    inp.classList.remove('is-invalid');
                } else {
                    inp.classList.add('is-invalid');
                }
            });
        } else if (singleInput) {
            if (singleInput.value.trim()) {
                hasKey = true;
                singleInput.classList.remove('is-invalid');
            } else {
                singleInput.classList.add('is-invalid');
            }
        }

        if (!hasKey) {
            ui.error("Akses ditolak: Mohon isi Activation Key untuk tipe Borrow License.", "Activation Key Kosong");

            var targetInput = dynInputs.length > 0 ? dynInputs[0] : singleInput;
            if (targetInput) {
                targetInput.focus();
                // Add shake effect to the container
                var container = targetInput.closest('.mb-3') || targetInput.parentElement;
                if (container) {
                    container.classList.add('shake-animation');
                    setTimeout(function () { container.classList.remove('shake-animation'); }, 500);
                }
            }
            return;
        }
    }

    var data = {
        requestId: currentRequest.requestId,
        customExpirationDate: document.getElementById('expiration-date-input').value,
        adminNotes: document.getElementById('admin-notes').value,
        activationKey: (function () {
            var dynInputs = document.querySelectorAll('.dynamic-borrow-key');
            if (dynInputs.length > 0) {
                var keys = [];
                dynInputs.forEach(function (inp) {
                    if (inp.value.trim()) {
                        keys.push(inp.getAttribute('data-software') + ": " + inp.value.trim());
                    }
                });
                return keys.join(", ");
            }
            var singleInput = document.getElementById('activation-key-input');
            return singleInput ? singleInput.value : "";
        })(),
        anydeskPassword: document.getElementById('anydesk-password-input') ? document.getElementById('anydesk-password-input').value : "",
        newComputerName: currentReassignedComputer,
        rowIndex: currentRequest.rowIndex,
        sheetName: currentRequest.sheetName
    };

    function attemptApprove() {
        console.log("=== BROWSER DEBUG: SUBMIT APPROVAL ===");
        console.log("Target Software:", currentRequest.software);
        console.log("Full Data Payload:", data);

        showLoading("Memproses Approval...");
        api.jsonpRequest('admin-approve', data)
            .then(function (res) {
                hideLoading();
                if (res.success) {
                    if (res.debugLogs && res.debugLogs.length > 0) {
                        console.log("=== BACKEND DEBUG LOGS ===");
                        console.log(res.debugLogs.join("\n"));
                    }
                    ui.success("Permohonan berhasil disetujui.");
                    processModalObj.hide();

                    // Clear state (Fixed in Milestone 9)
                    var keyInput = document.getElementById('activation-key-input');
                    if (keyInput) keyInput.value = '';
                    var dynWrappers = document.querySelectorAll('.dynamic-borrow-wrapper');
                    dynWrappers.forEach(function (w) { w.remove(); });

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
                hideLoading();
                ui.confirm('Terjadi kesalahan: ' + err.message + '<br><br>Apakah Anda ingin mencoba lagi?', 'Koneksi Bermasalah')
                    .then(function (confirmed) {
                        if (confirmed) {
                            attemptApprove();
                        }
                    });
            });
    }

    attemptApprove();
}

function submitRejection() {
    ui.prompt("Masukkan alasan penolakan:", "Tolak Permohonan")
        .then(function (reason) {
            if (!reason) return;

            function attemptReject() {
                showLoading("Memproses Penolakan...");
                api.jsonpRequest('admin-reject', {
                    requestId: currentRequest.requestId,
                    reason: reason,
                    sheetName: currentRequest.sheetName
                })
                    .then(function (res) {
                        hideLoading();
                        if (res.success) {
                            ui.success("Permohonan telah ditolak.");
                            processModalObj.hide();
                            loadRequests();
                        } else {
                            ui.error("Gagal: " + res.message);
                        }
                    })
                    .catch(function (err) {
                        hideLoading();
                        ui.confirm('Terjadi kesalahan: ' + err.message + '<br><br>Apakah Anda ingin mencoba lagi?', 'Koneksi Bermasalah')
                            .then(function (confirmed) {
                                if (confirmed) {
                                    attemptReject();
                                }
                            });
                    });
            }

            attemptReject();
        });
}

function calculateAndSetExpirationDate(location) {
    if (!currentRequest) return;

    var isRuangPenelitian = (location === 'Ruang Penelitian');
    var daysToAdd = isRuangPenelitian ? adminConfig.seatExpiration : adminConfig.durationRegular;

    // Normalize Today to Midnight Local for calculation base
    var baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);

    // Logic: If renewal, use prevExpirationDate (standard Date parsing)
    if (currentRequest.isRenewal && currentRequest.prevExpirationDate) {
        var prevDate = new Date(currentRequest.prevExpirationDate);
        if (!isNaN(prevDate.getTime())) {
            var normalizedPrev = new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());
            if (normalizedPrev > baseDate) {
                baseDate = normalizedPrev;
            }
        }
    }

    // Final Calculation Result
    var expDate = new Date(baseDate.getTime());
    expDate.setDate(expDate.getDate() + daysToAdd);

    // Format using project-standard method (adhering to local time)
    var tzOffset = expDate.getTimezoneOffset() * 60000; // in ms
    var localExpDate = new Date(expDate.getTime() - tzOffset);
    var inputEl = document.getElementById('expiration-date-input');
    if (inputEl) inputEl.value = localExpDate.toISOString().split('T')[0];
}

window.openProcessModal = openProcessModal;
window.submitApproval = submitApproval;
window.submitRejection = submitRejection;

/**
 * --- EXPIRED USAGE LOGIC ---
 */

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
        var emailDisplay = "";
        var uEmail = (item.emailUgm && item.emailUgm !== "-") ? item.emailUgm : "";
        var pEmail = (item.email && item.email !== "-") ? item.email : "";

        if (uEmail && pEmail && uEmail.toLowerCase() !== pEmail.toLowerCase()) {
            emailDisplay = '<div>' + uEmail + '</div>' +
                '<div class="text-secondary" style="font-size: 0.7rem;">' + pEmail + '</div>';
        } else {
            emailDisplay = '<div>' + (uEmail || pEmail || "-") + '</div>';
        }

        var computerInfo = "";
        if ((item.computer && item.computer !== "-") || (item.room && item.room !== "-")) {
            computerInfo = '<div class="extra-small text-muted">' + (item.computer || "-") + ' (' + (item.room || "-") + ')</div>';
        }

        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' +
            '<div class="fw-bold">' + item.nama + '</div>' +
            '<div class="extra-small text-muted">' + emailDisplay + '</div>' +
            '</td>' +
            '<td>' +
            '<div class="small fw-bold">' + item.software + '</div>' +
            computerInfo +
            '</td>' +
            '<td class="text-danger fw-bold small">' + item.expirationDate + '</td>' +
            '<td class="text-center">' +
            '<button class="btn btn-outline-danger btn-sm" onclick="handleRevoke(\'' + item.requestId + '\', \'' + item.nama + '\', ' + item.rowIndex + ', \'' + item.type + '\', \'' + item.sheetName + '\')">Revoke</button>' +
            '</td>';
        tbody.appendChild(tr);
    });
}

function handleRevoke(requestId, name, rowIndex, requestType, sheetName) {
    var needsComputer = requestType === "Lisensi + Komputer" || requestType === "Komputer";
    var confirmMsg = "Cabut akses untuk " + name + "?";
    if (needsComputer) {
        confirmMsg += " Komputer akan dijadwalkan maintenance.";
    }

    ui.confirm(confirmMsg, "Cabut Akses")
        .then(function (confirmed) {
            if (!confirmed) return;

            function attemptRevoke() {
                showLoading("Mencabut akses...");
                api.jsonpRequest('admin-revoke', { requestId: requestId, rowIndex: rowIndex, sheetName: sheetName })
                    .then(function (res) {
                        hideLoading();
                        if (res.success) {
                            ui.success("Akses berhasil dicabut.");
                            expiredModalObj.hide();
                            loadRequests();
                        } else {
                            ui.error("Gagal: " + res.message);
                        }
                    })
                    .catch(function (err) {
                        hideLoading();
                        ui.confirm('Terjadi kesalahan: ' + err.message + '<br><br>Apakah Anda ingin mencoba lagi?', 'Koneksi Bermasalah')
                            .then(function (confirmed) {
                                if (confirmed) {
                                    attemptRevoke();
                                }
                            });
                    });
            }

            attemptRevoke();
        });
}

window.showExpiredModal = showExpiredModal;
window.handleRevoke = handleRevoke;

/**
 * --- ACTIVE USER DETAIL LOGIC ---
 */

var activeUserModalObj = null;

function openActiveUserModal(nama, nim, computerName) {
    if (!activeUserModalObj) {
        activeUserModalObj = new bootstrap.Modal(document.getElementById('activeUserModal'));
    }

    document.getElementById('active-modal-nama').textContent = nama || '-';
    document.getElementById('active-modal-nim').textContent = nim || '-';
    document.getElementById('active-spec-name').textContent = computerName || '-';
    document.getElementById('active-spec-anydesk').textContent = 'Memuat...';
    document.getElementById('active-spec-ip').textContent = 'Memuat...';
    document.getElementById('active-anydesk-password-input').value = '';

    var hasComputer = (computerName && computerName !== '-' && computerName !== 'Auto Assign' && computerName !== 'Belum Dialokasikan');
    var infoCard = document.getElementById('active-computer-info-card');
    var noComputerCard = document.getElementById('active-no-computer-card');

    if (hasComputer) {
        if (infoCard) infoCard.classList.remove('d-none');
        if (noComputerCard) noComputerCard.classList.add('d-none');
    } else {
        if (infoCard) infoCard.classList.add('d-none');
        if (noComputerCard) noComputerCard.classList.remove('d-none');
        activeUserModalObj.show();
        return;
    }

    activeUserModalObj.show();

    api.jsonpRequest('admin-get-computer-details', { computerName: computerName })
        .then(function (res) {
            if (res.success && res.data) {
                document.getElementById('active-spec-anydesk').textContent = res.data.anydeskId || '-';
                document.getElementById('active-spec-ip').textContent = res.data.ipAddress || '-';
                document.getElementById('active-anydesk-password-input').value = res.data.anydeskPassword || '';
            } else {
                document.getElementById('active-spec-anydesk').textContent = 'Gagal memuat';
                document.getElementById('active-spec-ip').textContent = 'Gagal memuat';
            }
        });
}

function copyActiveAnydeskCommand(type) {
    var pass = document.getElementById('active-anydesk-password-input').value.trim();
    var targetEl = document.getElementById(type === 'id' ? 'active-spec-anydesk' : 'active-spec-ip');
    var target = targetEl ? targetEl.textContent.replace(/\s/g, '') : '';

    if (!target || target === '-') {
        ui.warning("ID AnyDesk atau IP Address tidak ditemukan/belum termuat.");
        return;
    }

    var cmd = 'echo ' + pass + ' | "C:\\Program Files (x86)\\AnyDesk\\AnyDesk.exe" ' + target + ' --with-password';

    if (typeof Utils !== 'undefined' && Utils.copyToClipboard) {
        Utils.copyToClipboard(cmd, "Command AnyDesk berhasil disalin ke clipboard.");
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(cmd).then(function () {
            ui.success("Command CMD berhasil disalin ke clipboard.");
        });
    } else {
        ui.error("Clipboard API tidak didukung di browser ini.");
    }
}

window.openActiveUserModal = openActiveUserModal;
window.copyActiveAnydeskCommand = copyActiveAnydeskCommand;


/**
 * --- AGENDA MANAGEMENT ---
 */

function openAgendaModal() {
    if (!agendaModalObj) {
        agendaModalObj = new bootstrap.Modal(document.getElementById('agendaModal'));

        // Setup 24-hour flatpickr format for agenda times
        if (typeof flatpickr !== 'undefined') {
            flatpickr("#agenda-mulai", {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                time_24hr: true
            });
            flatpickr("#agenda-selesai", {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                time_24hr: true
            });
        }
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
                var kodeBadge = a.kodePeserta ? '<div class="extra-small mt-1"><span class="badge bg-warning-subtle text-dark border-warning border">🔑 ' + a.kodePeserta + '</span></div>' : '';
                return '<tr>' +
                    '<td class="fw-bold text-primary">' + a.ruangan + '</td>' +
                    '<td>' +
                    '<div>' + a.kegiatan + '</div>' +
                    kodeBadge +
                    '</td>' +
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
        deskripsi: document.getElementById('agenda-deskripsi').value,
        kodePeserta: document.getElementById('agenda-kode').value
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

// showLoading and hideLoading are now provided globally by ui-helper.js
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

    var grouped = {};
    licenses.forEach(function (lic) {
        var key = lic.vendor && lic.vendor !== "-" ? lic.vendor + '_' + lic.expiry : lic.name + '_' + lic.expiry;
        if (!grouped[key]) {
            grouped[key] = { vendor: lic.vendor, expiry: lic.expiry, daysLeft: lic.daysLeft, count: 0, names: [] };
        }
        grouped[key].count++;
        grouped[key].names.push(lic.name);
    });

    var html = '<div class="alert alert-warning alert-dismissible fade show shadow-sm border-start border-warning border-5" role="alert" style="border-radius: 12px; margin-bottom: 2rem;">' +
        '<div class="d-flex align-items-center">' +
        '<div class="fs-4 me-3">⚠️</div>' +
        '<div>' +
        '<strong class="outfit">Peringatan Lisensi:</strong> ' + licenses.length + ' software akan berakhir dalam waktu dekat.' +
        '<div class="small mt-1">';

    Object.keys(grouped).forEach(function (key) {
        var g = grouped[key];
        var badgeColor = g.daysLeft < 7 ? 'bg-danger' : 'bg-warning text-dark';
        var displaySoftware = g.count > 1 ? g.vendor + ' Bundle (' + g.count + ' lisensi)' : g.names[0];
        html += '<span class="badge ' + badgeColor + ' me-2 mb-1">' + displaySoftware + ' (' + g.daysLeft + ' hari)</span>';
    });

    html += '</div></div></div>' +
        '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
        '</div>';

    container.innerHTML = html;
}

function copyAnydeskCommand(type) {
    var passInput = document.getElementById('anydesk-password-input');
    var pass = passInput ? passInput.value.trim() : '';
    var targetEl = document.getElementById(type === 'id' ? 'spec-anydesk' : 'spec-ip');
    var target = targetEl ? targetEl.textContent.replace(/\s/g, '') : '';

    if (!target || target === '-') {
        if (typeof Toast !== 'undefined') Toast.warn("Data Kurang", "ID AnyDesk atau IP Address tidak ditemukan.");
        return;
    }

    var cmd = 'echo ' + pass + ' | "C:\\Program Files (x86)\\AnyDesk\\AnyDesk.exe" ' + target + ' --with-password';

    if (typeof Utils !== 'undefined' && Utils.copyToClipboard) {
        Utils.copyToClipboard(cmd, "Command AnyDesk berhasil disalin ke clipboard.");
    } else {
        navigator.clipboard.writeText(cmd).then(function () {
            if (typeof Toast !== 'undefined') Toast.success("Salin Berhasil", "Command disalin ke clipboard.");
        });
    }
}


function copyServerConfig() {
    var configInput = document.getElementById('server-license-config');
    if (configInput && configInput.value) {
        navigator.clipboard.writeText(configInput.value).then(function () {
            if (typeof Toast !== 'undefined') {
                Toast.success("Salin Berhasil", "Konfigurasi lisensi disalin ke clipboard.");
            } else {
                ui.success("Konfigurasi lisensi disalin ke clipboard.");
            }
        });
    }
}

window.copyServerConfig = copyServerConfig;

/**
 * --- UTILS ---
 */
function parseDateIndo(dateStr) {
    if (!dateStr || dateStr === "-") return new Date(9999, 0, 1); // Future for empty

    // Format is dd-MMM-yyyy
    var parts = dateStr.split('-');
    if (parts.length !== 3) return new Date();

    var monthMap = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mei': 4, 'jun': 5,
        'jul': 6, 'agt': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'des': 11,
        'may': 4, 'aug': 7, 'oct': 9, 'dec': 11
    };

    var day = parseInt(parts[0], 10);
    var month = monthMap[parts[1].toLowerCase()] || 0;
    var year = parseInt(parts[2], 10);

    return new Date(year, month, day);
}

function formatDateHuman(dateInput, includeTime) {
    if (!dateInput || dateInput === "-") return "-";

    // Check if it's already in the target format (simple check)
    if (typeof dateInput === 'string' && /^\d{2}-[A-Z][a-z]{2}-\d{4}$/.test(dateInput)) {
        return dateInput;
    }

    var d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput;

    var day = d.getDate();
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    var month = monthNames[d.getMonth()];
    var year = d.getFullYear();

    var datePart = (day < 10 ? '0' + day : day) + '-' + month + '-' + year;

    if (includeTime) {
        var hours = d.getHours();
        var mins = d.getMinutes();
        return datePart + ' ' + (hours < 10 ? '0' + hours : hours) + ':' + (mins < 10 ? '0' + mins : mins);
    }

    return datePart;
}
