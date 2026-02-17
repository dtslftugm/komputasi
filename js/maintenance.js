/**
 * Maintenance Management Logic (Standardized)
 */

// Instances are already created in api-client.js and ui-helper.js
// var api = new APIClient(); 
// var ui = (global ui object from ui-helper.js)
var maintenanceList = [];
var processModal;

document.addEventListener('DOMContentLoaded', function () {
    processModal = new bootstrap.Modal(document.getElementById('processMaintenanceModal'));
    loadMaintenanceData();

    // Search listener
    var searchInput = document.getElementById('maintenanceSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            renderMaintenanceTable(e.target.value);
        });
    }

    // Auth check (Optional but recommended)
    var token = localStorage.getItem('adminAuthToken');
    if (!token) {
        window.location.href = 'admin.html';
    }
});

function loadMaintenanceData() {
    ui.loading("Memuat data maintenance...");

    api.run('apiGetMaintenanceList')
        .then(function (res) {
            ui.hideLoading();
            if (res.success) {
                maintenanceList = res.data || [];
                renderMaintenanceTable();
                renderLogTable(res.logs || []); // If backend provides logs
            } else {
                ui.error("Gagal memuat data: " + res.message);
            }
        })
        .catch(function (err) {
            ui.hideLoading();
            ui.error("Error: " + err);
        });
}

function renderMaintenanceTable(query) {
    var tbody = document.getElementById('maintenanceTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    var filter = query || '';
    var filtered = maintenanceList.filter(function (item) {
        var q = filter.toLowerCase();
        return (item.targetName || "").toLowerCase().indexOf(q) !== -1 ||
            (item.requestId || "").toLowerCase().indexOf(q) !== -1;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted">Tidak ada data maintenance ditemukan.</td></tr>';
        return;
    }

    filtered.forEach(function (item) {
        var tr = document.createElement('tr');

        var statusClass = 'bg-secondary';
        var statusText = item.status || 'In Maintenance';

        var cleanStatus = statusText.toLowerCase();
        if (cleanStatus.indexOf('maintenance') !== -1) { statusClass = 'bg-warning text-dark'; }
        else if (cleanStatus.indexOf('repair') !== -1) { statusClass = 'bg-danger'; }
        else if (cleanStatus.indexOf('available') !== -1) { statusClass = 'bg-success'; }

        tr.innerHTML = '<td>' +
            '<span class="badge ' + (item.type === 'PC' ? 'bg-primary' : 'bg-info') + ' mb-1" style="font-size: 10px;">' + item.type + '</span><br>' +
            '<span class="fw-bold">' + item.targetName + '</span>' +
            '</td>' +
            '<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>' +
            '<td>' +
            '<div class="small fw-bold">' + (item.lastUser || '-') + '</div>' +
            '<div class="text-muted extra-small">ID: ' + (item.requestId || '-') + '</div>' +
            '</td>' +
            '<td>' +
            '<div class="small">' + (item.lastMaintenance || '-') + '</div>' +
            '<div class="text-muted extra-small">' + (item.daysAgo || 0) + ' hari lalu</div>' +
            '</td>' +
            '<td class="text-center pe-4">' +
            '<button class="btn btn-primary btn-sm rounded-pill px-3" onclick="openMaintenanceModal(\'' + item.targetName + '\', \'' + item.type + '\')">Proses</button>' +
            '</td>';
        tbody.appendChild(tr);
    });
}

function renderLogTable(logs) {
    var tbody = document.getElementById('logTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // This part depends on backend giving separate logs
    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">Histori belum tersedia.</td></tr>';
        return;
    }
}

function openMaintenanceModal(name, type) {
    var item = maintenanceList.find(function (i) { return i.targetName === name; });
    if (!item) return;

    document.getElementById('m-target-name').textContent = name;
    document.getElementById('m-target-type').value = type;
    document.getElementById('maintenanceForm').reset();

    // Context-aware labels
    var lblStorage = document.querySelector('label[for="check-storage"]');
    var lblJunk = document.querySelector('label[for="check-junk"]');
    var lblAnydesk = document.querySelector('label[for="check-anydesk"]');

    if (type === 'License') {
        lblStorage.textContent = 'Hapus dari Cloud Vendor Dashboard';
        lblJunk.textContent = 'Verifikasi Status Revoked';
        lblAnydesk.textContent = 'Email Konfirmasi (Optional)';
        document.getElementById('m-storage').placeholder = 'ID Lisensi / Key';
    } else {
        lblStorage.textContent = 'Cek Storage';
        lblJunk.textContent = 'Hapus File Sampah';
        lblAnydesk.textContent = 'Cek Koneksi AnyDesk';
        document.getElementById('m-storage').placeholder = 'Misal: 1400GB Free / OK';
    }

    processModal.show();
}

function saveMaintenanceProgress() {
    var name = document.getElementById('m-target-name').textContent;
    var issues = document.getElementById('m-issues').value;

    if (!issues.trim()) {
        ui.warning("Isi bagian 'Masalah Ditemukan' untuk menyimpan sebagai Pending Repair.", "Info Diperlukan");
        return;
    }

    var data = {
        computerName: name,
        issues: issues,
        notes: document.getElementById('m-notes').value,
        storage: document.getElementById('m-storage').value,
        mType: document.getElementById('m-type').value,
        checkStorage: document.getElementById('check-storage').checked,
        checkJunk: document.getElementById('check-junk').checked,
        checkAnydesk: document.getElementById('check-anydesk').checked,
        status: 'Pending Repair'
    };

    updateStatus(data, 'apiUpdateMaintenanceStatus');
}

function completeMaintenance() {
    var name = document.getElementById('m-target-name').textContent;
    var type = document.getElementById('m-target-type').value;

    if (!document.getElementById('check-storage').checked || !document.getElementById('check-junk').checked) {
        ui.warning("Pastikan tugas utama sudah dicentang.", "Ceklis Belum Lengkap");
        return;
    }

    var data = {
        computerName: name,
        issues: document.getElementById('m-issues').value,
        notes: document.getElementById('m-notes').value,
        storage: document.getElementById('m-storage').value,
        mType: document.getElementById('m-type').value,
        checkStorage: document.getElementById('check-storage').checked,
        checkJunk: document.getElementById('check-junk').checked,
        checkAnydesk: document.getElementById('check-anydesk').checked,
        status: 'Available'
    };

    // Use specific API for licenses if needed
    var apiMethod = (type === 'License') ? 'apiCompleteLicenseCleanup' : 'apiCompleteMaintenance';

    // For licenses, we might need requestId instead of computerName
    if (type === 'License') {
        var item = maintenanceList.find(function (i) { return i.targetName === name; });
        data.requestId = item ? item.requestId : "";
    }

    updateStatus(data, apiMethod);
}

function updateStatus(data, apiMethod) {
    ui.loading("Menyimpan data...");

    api.run(apiMethod, data)
        .then(function (res) {
            ui.hideLoading();
            if (res.success) {
                processModal.hide();
                ui.success("Berhasil diupdate.");
                loadMaintenanceData();
            } else {
                ui.error("Gagal: " + res.message);
            }
        })
        .catch(function (err) {
            ui.hideLoading();
            ui.error("Error: " + err);
        });
}
