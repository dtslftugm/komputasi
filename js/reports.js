/**
 * Logic for Reports & Statistics Dashboard (GitHub Pages Version)
 */

window.appState = {
    sessionToken: localStorage.getItem('adminAuthToken'),
    currentUser: null,

    init: function () {
        this.validateSession();
        this.loadAppBranding();
    },

    validateSession: function () {
        if (!this.sessionToken) {
            this.showLogin();
            return;
        }

        // Use Global UI Helper loading
        if (window.ui) ui.loading("Memverifikasi Sesi...");

        api.checkAuth(this.sessionToken)
            .then(function (res) {
                if (window.ui) ui.hideLoading();
                if (res && res.authenticated) {
                    window.appState.currentUser = res.user;
                    window.appState.showReportApp();
                } else {
                    localStorage.removeItem('adminAuthToken');
                    window.appState.showLogin();
                }
            })
            .catch(function (err) {
                if (window.ui) ui.hideLoading();
                console.error("Auth error:", err);
                window.appState.showLogin();
            });
    },

    handleLogin: function () {
        var email = document.getElementById('login-email').value;
        var pass = document.getElementById('login-password').value;

        if (!email || !pass) {
            if (window.ui) ui.error("Admin Email dan Password diperlukan.");
            return;
        }

        if (window.ui) ui.loading("Memverifikasi Login...");

        api.adminLogin(email, pass)
            .then(function (res) {
                if (window.ui) ui.hideLoading();
                if (res && res.success) {
                    localStorage.setItem('adminAuthToken', res.token);
                    window.appState.sessionToken = res.token;
                    window.appState.currentUser = res.user;
                    window.appState.showReportApp();
                } else {
                    if (window.ui) ui.error(res.message || "Email atau password salah", "Login Gagal");
                }
            })
            .catch(function (err) {
                if (window.ui) ui.hideLoading();
                if (window.ui) ui.error("Gagal menghubungi server: " + err.message, "Error");
            });
    },

    handleLogout: function () {
        if (window.ui) ui.loading("Keluar...");
        api.run('apiLogout', { token: this.sessionToken })
            .then(function () {
                localStorage.removeItem('adminAuthToken');
                window.location.reload();
            })
            .catch(function (err) {
                localStorage.removeItem('adminAuthToken');
                window.location.reload();
            });
    },

    showLogin: function () {
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('report-app').style.display = 'none';
    },

    showReportApp: function () {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('report-app').style.display = 'block';
        this.loadFilters();
        this.refreshReport();
    },

    loadFilters: function () {
        api.getReportingFilters()
            .then(function (res) {
                if (res && res.success) {
                    var pSel = document.getElementById('filter-prodi');
                    // Reset options safely
                    pSel.innerHTML = '<option value="Semua">Semua Prodi</option>';
                    if (res.prodiList) {
                        res.prodiList.forEach(function (p) {
                            var opt = document.createElement('option');
                            opt.value = p; opt.innerText = p;
                            pSel.appendChild(opt);
                        });
                    }

                    var sSel = document.getElementById('filter-software');
                    sSel.innerHTML = '<option value="Semua">Semua Software</option>';
                    if (res.softwareList) {
                        res.softwareList.forEach(function (s) {
                            var opt = document.createElement('option');
                            opt.value = s; opt.innerText = s;
                            sSel.appendChild(opt);
                        });
                    }

                    var ySel = document.getElementById('filter-year');
                    ySel.innerHTML = '<option value="Semua">Semua Tahun</option>';
                    if (res.yearList) {
                        res.yearList.forEach(function (y) {
                            var opt = document.createElement('option');
                            opt.value = y; opt.innerText = y;
                            ySel.appendChild(opt);
                        });
                    }
                }
            })
            .catch(function (err) {
                console.error("Error loading filters:", err);
            });
    },

    refreshReport: function () {
        var filters = {
            prodi: document.getElementById('filter-prodi').value,
            software: document.getElementById('filter-software').value,
            year: document.getElementById('filter-year').value,
            semester: document.getElementById('filter-semester').value
        };

        if (window.ui) ui.loading("Menganalisis Data...");

        api.getStatisticsData(filters)
            .then(function (res) {
                if (window.ui) ui.hideLoading();
                if (res && res.success) {
                    window.appState.renderStats(res);
                } else {
                    if (window.ui) ui.error(res.message || "Gagal menarik data", "Error");
                }
            })
            .catch(function (err) {
                if (window.ui) ui.hideLoading();
                if (window.ui) ui.error("Gagal memproses data: " + err.message, "Error");
                console.error("Stats fetch error:", err);
            });
    },

    renderStats: function (res) {
        document.getElementById('total-req-display').textContent = res.totalRequests || 0;
        
        // --- 1. Render Software Table ---
        var tbody = document.getElementById('report-table-body');
        tbody.innerHTML = '';

        if (!res.data || res.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-5">Tidak ada data software untuk filter ini.</td></tr>';
        } else {
            var maxCount = 0;
            res.data.forEach(function (d) {
                if (d.count > maxCount) maxCount = d.count;
            });

            var totalUnits = res.totalRequests || 1; 

            res.data.forEach(function (item) {
                var percent = (item.count / maxCount) * 100;
                var ratio = Math.round((item.count / totalUnits) * 100);

                var tr = document.createElement('tr');
                tr.innerHTML =
                    '<td class="fw-bold">' + item.software + '</td>' +
                    '<td class="text-center fw-bold text-primary">' + item.count + '</td>' +
                    '<td>' +
                    '<div class="extra-small text-muted mb-1 text-end">' + ratio + '% dari lisensi terpakai</div>' +
                    '<div class="bar-container">' +
                    '<div class="bar-fill" style="width: ' + percent + '%"></div>' +
                    '</div>' +
                    '</td>';
                tbody.appendChild(tr);
            });
        }

        // --- 2. Render Prodi Distribution Table ---
        var pbody = document.getElementById('prodi-table-body');
        pbody.innerHTML = '';
        
        if (!res.prodiBreakdown || res.prodiBreakdown.length === 0) {
            pbody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-muted">Tidak ada data prodi.</td></tr>';
        } else {
            res.prodiBreakdown.forEach(function(pitem) {
                var ptr = document.createElement('tr');
                ptr.innerHTML = 
                    '<td>' + pitem.prodi + '</td>' +
                    '<td class="text-center fw-bold text-success">' + pitem.count + ' <span class="text-muted small fw-normal">unit</span></td>';
                pbody.appendChild(ptr);
            });
        }

        // Set print text
        var f = {
            p: document.getElementById('filter-prodi').value,
            s: document.getElementById('filter-software').value,
            y: document.getElementById('filter-year').value,
            sem: document.getElementById('filter-semester').value
        };
        document.getElementById('print-period-label').innerText = 'Filter: Prodi ' + f.p + ', Software ' + f.s + ', Tahun ' + f.y + ', Semester ' + f.sem;
    },

    loadAppBranding: function () {
        api.getBranding()
            .then(function (res) {
                if (res.success && res.data) {
                    window.appState.setupBranding(res.data);
                }
            })
            .catch(function (e) {
                console.warn('Error loading branding:', e);
            });
    },

    setupBranding: function (data) {
        if (!data) return;

        var logoEls = document.querySelectorAll('#app-logo, #login-logo');
        if (data.logo) {
            var logoSrc = data.logo;
            // Add prefix if missing and it's likely base64
            if (logoSrc.trim() && logoSrc.indexOf('http') !== 0 && logoSrc.indexOf('data:') !== 0) {
                logoSrc = 'data:image/png;base64,' + logoSrc;
            }
            for (var i = 0; i < logoEls.length; i++) {
                logoEls[i].src = logoSrc;
            }
        }
    }
};

// Initialize Application on Load
document.addEventListener('DOMContentLoaded', function () {
    window.appState.init();
});
