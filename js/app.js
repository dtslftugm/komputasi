/**
 * Main Application Logic - Layanan Komputasi DTSL
 * GitHub Pages Version with JSONP API Integration
 */

// ===== GLOBAL STATE =====
let initialData = null;
let dosenList = [];
let softwareRules = {};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('App initialized');

    // Show loading
    showLoading('Memuat data awal...');

    try {
        // Load initial data from API
        initialData = await api.getInitialData();
        console.log('Initial Data received:', initialData);
        console.log('Has logoUrl?', initialData?.logoUrl !== undefined);
        console.log('Has qrUrl?', initialData?.qrUrl !== undefined);
        console.log('Has prodiList?', initialData?.prodiList !== undefined);

        // Setup UI Components
        setupThemeToggle();
        setupBranding();
        setupProdiDropdown();
        setupDosenDropdown();
        setupSoftwareSelect();
        setupFormHandlers();
        setupUploadMethodToggle();
        setupComputerToggle();

        // Attach event listener for software change
        $('#software').on('change', handleSoftwareChange);

        // Show announcement if exists
        showAnnouncement();

        hideLoading();
    } catch (error) {
        console.error('Initialization error:', error);
        console.error('Error stack:', error.stack);
        hideLoading();
        alert('Gagal memuat data. Silakan refresh halaman.');
    }
});

// ===== BRANDING =====
function setupBranding() {
    // Defensive check - if initialData is null/undefined, skip
    if (!initialData) {
        console.warn('setupBranding: initialData is not available');
        return;
    }

    console.log('setupBranding called');
    console.log('logoUrl:', initialData.logoUrl ? 'present (length: ' + initialData.logoUrl.length + ')' : 'EMPTY');
    console.log('qrUrl:', initialData.qrUrl ? 'present (length: ' + initialData.qrUrl.length + ')' : 'EMPTY');

    // Set logo
    const logo = document.getElementById('app-logo');
    if (logo) {
        let logoSrc = initialData.logoUrl || initialData.logo || '';
        if (logoSrc.trim()) {
            // Add prefix if missing and it's likely base64 (doesn't start with http or data:)
            if (!logoSrc.startsWith('http') && !logoSrc.startsWith('data:')) {
                logoSrc = 'data:image/png;base64,' + logoSrc;
            }
            logo.src = logoSrc;
            console.log('✅ Logo set successfully');
        } else {
            console.warn('⚠️ Logo URL/Data is empty');
        }
    }

    // Set QR code
    const qr = document.getElementById('app-qr');
    if (qr) {
        let qrSrc = initialData.qrUrl || initialData.qr || '';
        if (qrSrc.trim()) {
            // Add prefix if missing
            if (!qrSrc.startsWith('http') && !qrSrc.startsWith('data:')) {
                qrSrc = 'data:image/png;base64,' + qrSrc;
            }
            qr.src = qrSrc;
            console.log('✅ QR set successfully');
        } else {
            console.warn('⚠️ QR URL/Data is empty');
        }
    }
}

// ===== ANNOUNCEMENT =====
function showAnnouncement() {
    if (!initialData || !initialData.announcementText) return;

    const alertEl = document.getElementById('announcement-alert');
    const textEl = document.getElementById('announcement-text');
    const headerEl = document.getElementById('announcement-header');
    const bodyEl = document.getElementById('announcement-body');
    const chevronEl = document.getElementById('announcement-chevron');
    const statusEl = document.getElementById('announcement-status-text');

    if (initialData.announcementText.trim()) {
        textEl.innerHTML = initialData.announcementText;
        alertEl.classList.remove('d-none');

        // Toggle logic
        let isExpanded = false;
        headerEl.addEventListener('click', () => {
            isExpanded = !isExpanded;
            $(bodyEl).slideToggle();
            chevronEl.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
            statusEl.textContent = isExpanded ? '- Klik untuk menutup' : '- Klik untuk detail';
        });

        // Auto-collapse timer (optional, like original)
        setTimeout(() => {
            if (!isExpanded) {
            }
        }, 5000);
    }
}

// ===== THEME TOGGLE =====
function setupThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    const body = document.body;

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        body.classList.remove('light-mode');
        toggle.innerHTML = '☀️ Light Mode';
    }

    toggle.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        const isLight = body.classList.contains('light-mode');
        toggle.innerHTML = isLight ? '🌙 Dark Mode' : '☀️ Light Mode';
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
}

// ===== PRODI DROPDOWN =====
function setupProdiDropdown() {
    if (!initialData || !initialData.prodiList) return;

    const select = document.getElementById('prodi');
    select.innerHTML = '<option value="">-- Pilih Prodi --</option>';

    initialData.prodiList.forEach(prodi => {
        const option = document.createElement('option');
        option.value = prodi;
        option.textContent = prodi;
        select.appendChild(option);
    });

    // Handle change
    select.addEventListener('change', handleProdiChange);
}

function handleProdiChange() {
    const prodi = document.getElementById('prodi').value;
    const universitasContainer = document.getElementById('universitas-container');
    const dosenSelect = document.getElementById('dosenPembimbing');
    const dosenManual = document.getElementById('dosenPembimbingManual');
    const select2Container = $(dosenSelect).next('.select2-container');

    if (prodi === 'Non-UGM') {
        // Show universitas field, use manual dosen input
        universitasContainer.style.display = 'block';
        if (select2Container.length) select2Container.hide();
        else dosenSelect.style.display = 'none';
        dosenManual.style.display = 'block';
        dosenManual.required = true;
    } else if (prodi) {
        // Hide universitas, show dosen dropdown
        universitasContainer.style.display = 'none';
        if (select2Container.length) select2Container.show();
        else dosenSelect.style.display = 'block';
        dosenManual.style.display = 'none';
        dosenManual.required = false;
        dosenSelect.disabled = false;
    } else {
        // No prodi selected
        universitasContainer.style.display = 'none';
        dosenSelect.disabled = false;
    }
}

// ===== DOSEN DROPDOWN =====
async function setupDosenDropdown() {
    try {
        if (initialData && (initialData.dosenListDetailed || initialData.dosenList)) {
            dosenList = initialData.dosenListDetailed || initialData.dosenList;

            const selectEl = document.getElementById('dosenPembimbing');
            selectEl.innerHTML = '<option value="">-- Pilih Dosen --</option>';

            dosenList.forEach(dosen => {
                const opt = document.createElement('option');
                if (typeof dosen === 'object' && dosen.nama && dosen.inisial) {
                    opt.value = dosen.inisial;
                    opt.textContent = dosen.nama;
                } else {
                    opt.value = dosen;
                    opt.textContent = dosen;
                }
                selectEl.appendChild(opt);
            });

            // Enable element
            selectEl.disabled = false;

            // Initialize Select2 with a slight delay to ensure container width is available
            setTimeout(() => {
                $('#dosenPembimbing').select2({
                    placeholder: 'Pilih Dosen Pembimbing / Pengampu',
                    allowClear: true,
                    width: '100%',
                    dropdownParent: $('#dosenPembimbing').parent()
                });
            }, 100);
        } else {
            console.warn('Dosen list missing in initialData');
            document.getElementById('dosenPembimbing').innerHTML = '<option value="">-- Dosen Tidak Ditemukan --</option>';
        }
    } catch (error) {
        console.error('Error loading dosen list:', error);
    }
}

// ===== SOFTWARE MULTI-SELECT =====
async function setupSoftwareSelect() {
    try {
        if (initialData && initialData.softwareList) {
            const softwareList = initialData.softwareList;
            softwareRules = initialData.softwareRules || {};

            const selectEl = document.getElementById('software');
            selectEl.innerHTML = ''; // Start empty for multi-select

            softwareList.forEach(sw => {
                const opt = document.createElement('option');
                opt.value = sw;
                opt.textContent = sw;
                selectEl.appendChild(opt);
            });

            setTimeout(() => {
                $('#software').select2({
                    placeholder: 'Pilih Software (boleh lebih > 1)',
                    allowClear: true,
                    width: '100%',
                    dropdownParent: $('#software').parent()
                });
            }, 100);
        } else {
            console.warn('Software list missing in initialData');
        }
    } catch (error) {
        console.error('Error loading software list:', error);
    }
}

// ===== SOFTWARE RESTRICIONS LOGIC (Client-side for 0 Latency) =====
function checkSoftwareRestrictionsClient(softwareStr) {
    if (!softwareStr) return { requiresLab: false, requiresNetwork: false, needsBorrowKey: false, allowedRooms: [], success: true };

    // softwareRules is already a global variable in app.js
    const rules = softwareRules || {};
    const softwareArray = softwareStr.split(',').map(s => s.trim());
    const physicalRooms = ['Ruang Penelitian', 'Ruang Komputer 1', 'Ruang Komputer 2'];

    let requiresLabTotal = false;
    let requiresNetworkTotal = false;
    let needsBorrowKey = false;
    let commonAllowedRooms = [...physicalRooms];
    let isRestricted = false;

    softwareArray.forEach(swName => {
        let swRules = null;
        if (rules[swName]) {
            swRules = rules[swName];
        } else {
            const lowerSwName = swName.toLowerCase();
            for (const [key, allowedTypes] of Object.entries(rules)) {
                const lowerKey = key.toLowerCase();
                if (lowerSwName.includes(lowerKey) || lowerKey.includes(lowerSwName)) {
                    swRules = allowedTypes;
                    break;
                }
            }
        }

        if (swRules) {
            const hasCloud = swRules.some(type => type.toLowerCase().includes('cloud license'));
            const hasServer = swRules.some(type => type.toLowerCase().includes('lisensi server'));
            const hasBorrow = swRules.some(type => type.toLowerCase().includes('borrow license'));

            if (hasBorrow) needsBorrowKey = true;

            if (!hasCloud && !hasServer && !hasBorrow) {
                requiresLabTotal = true;
            }
            if (!hasCloud && !hasBorrow && hasServer) {
                requiresNetworkTotal = true;
            }

            const swPhysicalRooms = swRules.filter(t =>
                physicalRooms.some(pr => t.toLowerCase().includes(pr.toLowerCase()))
            );

            if (swPhysicalRooms.length > 0) {
                isRestricted = true;
                commonAllowedRooms = commonAllowedRooms.filter(r =>
                    swPhysicalRooms.some(spr => spr.toLowerCase().includes(r.toLowerCase()))
                );
            }
        }
    });

    return {
        requiresLab: requiresLabTotal,
        requiresNetwork: requiresNetworkTotal,
        needsBorrowKey: needsBorrowKey,
        allowedRooms: isRestricted ? commonAllowedRooms : physicalRooms,
        success: commonAllowedRooms.length > 0
    };
}

async function handleSoftwareChange() {
    const selectedSoftware = $('#software').val() || [];
    const warningDiv = document.getElementById('labOnlyWarning');
    const warningText = document.getElementById('labOnlyWarningText');
    const roomSelect = document.getElementById('roomPreference');

    if (selectedSoftware.length > 0) {
        // Perform Instant Check locally (Zero Latency)
        const result = checkSoftwareRestrictionsClient(selectedSoftware.join(', '));
        const { requiresLab, requiresNetwork, allowedRooms = [] } = result;

        if (requiresLab) {
            warningDiv.classList.remove('d-none');
            warningText.innerHTML = `<strong>Wajib di Lab:</strong> Software ini hanya tersedia di komputer laboratorium DTSL. Anda wajib memilih unit komputer di bawah ini.`;

            const needsComputerYes = document.getElementById('needsComputerYes');
            const needsComputerNo = document.getElementById('needsComputerNo');

            if (needsComputerYes) needsComputerYes.checked = true;
            if (needsComputerNo) needsComputerNo.disabled = true;

            const computerSection = document.getElementById('computer-section');
            if (computerSection) computerSection.style.display = 'block';

        } else if (result.needsBorrowKey) {
            warningDiv.classList.remove('d-none');
            warningText.innerHTML = `<strong>Borrow License:</strong> Software ini dapat diinstal di laptop pribadi, namun Anda memerlukan Borrow Key yang akan dikirim via email.`;
            document.getElementById('needsComputerNo').disabled = false;
        } else if (requiresNetwork) {
            warningDiv.classList.remove('d-none');
            warningText.innerHTML = `<strong>Info Jaringan:</strong> Gunakan VPN UGM atau koneksi internal UGM untuk mengaktifkan lisensi software ini di laptop pribadi.`;
            document.getElementById('needsComputerNo').disabled = false;
        } else {
            warningDiv.classList.add('d-none');
            document.getElementById('needsComputerNo').disabled = false;
        }

        Array.from(roomSelect.options).forEach(opt => {
            if (opt.value === '') return;
            opt.disabled = allowedRooms.length > 0 && !allowedRooms.includes(opt.value);
        });
        if (result.success === false) {
            alert('Peringatan: Software yang Anda pilih memiliki batasan akses yang tidak kompatibel.');
        }

        // Calibrate Tipe Akses
        autoSetTipeAkses();

    } else {
        warningDiv.classList.add('d-none');
        Array.from(roomSelect.options).forEach(opt => opt.disabled = false);
        document.getElementById('tipeAkses').value = '';
    }
}

function autoSetTipeAkses() {
    const selectedSoftware = $('#software').val() || [];
    const needsComputer = document.getElementById('needsComputerYes').checked;
    const selectedRoom = document.getElementById('roomPreference').value;

    if (selectedSoftware.length === 0) {
        document.getElementById('tipeAkses').value = '';
        handleTipeAksesChange();
        return;
    }

    let hasAnyServerRule = false;
    selectedSoftware.forEach(swName => {
        const lowerSwName = swName.toLowerCase();
        let swRules = [];
        for (const [key, allowedTypes] of Object.entries(softwareRules)) {
            const lowerKey = key.toLowerCase();
            if (lowerSwName.includes(lowerKey) || lowerKey.includes(lowerSwName)) {
                swRules = allowedTypes;
                break;
            }
        }
        if (swRules.some(t => t.toLowerCase().includes('lisensi server'))) {
            hasAnyServerRule = true;
        }
    });

    let accessType = '';
    if (needsComputer && selectedRoom) {
        accessType = selectedRoom;
    } else if (hasAnyServerRule && !needsComputer) {
        accessType = 'Akses Lisensi Server';
    } else {
        // Fallback or generic logic
        accessType = 'Lisensi / Cloud';
    }

    document.getElementById('tipeAkses').value = accessType;
    handleTipeAksesChange();
}

function handleTipeAksesChange() {
    const tipeAkses = document.getElementById('tipeAkses').value;
    const isServer = tipeAkses === 'Akses Lisensi Server';
    const serverFields = document.getElementById('serverAccessFields');
    if (serverFields) {
        serverFields.style.display = isServer ? 'block' : 'none';
        document.getElementById('computerUserName').required = isServer;
        document.getElementById('computerHostname').required = isServer;
    }
}

// ===== UPLOAD METHOD TOGGLE =====
function setupUploadMethodToggle() {
    const methodUpload = document.getElementById('methodUpload');
    const methodLink = document.getElementById('methodLink');
    const uploadContainer = document.getElementById('inputUploadContainer');
    const linkContainer = document.getElementById('inputLinkContainer');
    const uploadInput = document.getElementById('uploadSurat');
    const linkInput = document.getElementById('linkSurat');

    function toggleMode() {
        if (methodUpload.checked) {
            uploadContainer.style.display = 'block';
            linkContainer.style.display = 'none';
            uploadInput.required = true;
            linkInput.required = false;
        } else {
            uploadContainer.style.display = 'none';
            linkContainer.style.display = 'block';
            uploadInput.required = false;
            linkInput.required = true;
        }
    }

    methodUpload.addEventListener('change', toggleMode);
    methodLink.addEventListener('change', toggleMode);
}

// ===== COMPUTER LAB TOGGLE =====
let availableComputers = [];
let filteredComputers = [];
let selectedComputer = null;
let currentPage = 1;
const itemsPerPage = 6;

function setupComputerToggle() {
    const needsComputerYes = document.getElementById('needsComputerYes');
    const needsComputerNo = document.getElementById('needsComputerNo');
    const computerSection = document.getElementById('computer-section');
    const roomPreference = document.getElementById('roomPreference');
    const computerSearch = document.getElementById('computer-search');

    function toggleComputer() {
        if (needsComputerYes.checked) {
            computerSection.style.display = 'block';
            if (roomPreference.value) loadAvailableComputers();
        } else {
            computerSection.style.display = 'none';
            selectedComputer = null;
        }
    }

    needsComputerYes.addEventListener('change', () => {
        toggleComputer();
        autoSetTipeAkses();
    });
    needsComputerNo.addEventListener('change', () => {
        toggleComputer();
        autoSetTipeAkses();
    });

    // Room change listener
    roomPreference.addEventListener('change', () => {
        loadAvailableComputers();
        autoSetTipeAkses();
    });

    // Search listener
    computerSearch.addEventListener('input', filterComputers);

    // Pagination listeners
    document.getElementById('prev-page').addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            renderComputerPage();
        }
    });

    document.getElementById('next-page').addEventListener('click', (e) => {
        e.preventDefault();
        const totalPages = Math.ceil(filteredComputers.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderComputerPage();
        }
    });
}

async function loadAvailableComputers() {
    const room = document.getElementById('roomPreference').value;
    const container = document.getElementById('computer-selection-container');
    const loading = document.getElementById('computer-loading');
    const list = document.getElementById('computer-list');
    const noComputers = document.getElementById('no-computers');
    const pagination = document.getElementById('computer-pagination');

    if (!room) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    loading.style.display = 'block';
    list.innerHTML = '';
    noComputers.classList.add('d-none');
    pagination.classList.add('d-none');

    try {
        const computers = await api.getAvailableComputers(room);
        availableComputers = computers || [];
        filterComputers();
    } catch (error) {
        console.error('Error loading computers:', error);
        loading.style.display = 'none';
        alert('Gagal memuat daftar komputer.');
    }
}

function filterComputers() {
    const searchTerm = document.getElementById('computer-search').value.toLowerCase();

    filteredComputers = availableComputers.filter(comp => {
        const name = (comp.name || '').toLowerCase();
        const sw = (comp.softwareInstalled || '').toLowerCase();
        return name.includes(searchTerm) || sw.includes(searchTerm);
    });

    currentPage = 1;
    renderComputerPage();
}

function renderComputerPage() {
    const loading = document.getElementById('computer-loading');
    const list = document.getElementById('computer-list');
    const noComputers = document.getElementById('no-computers');
    const pagination = document.getElementById('computer-pagination');
    const pageInfo = document.getElementById('page-info');

    loading.style.display = 'none';
    list.innerHTML = '';

    if (filteredComputers.length === 0) {
        noComputers.classList.remove('d-none');
        pagination.classList.add('d-none');
        return;
    }

    noComputers.classList.add('d-none');

    // Calculate pagination
    const totalPages = Math.ceil(filteredComputers.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const items = filteredComputers.slice(start, end);

    items.forEach(comp => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';

        const isSelected = selectedComputer && selectedComputer.name === comp.name;

        col.innerHTML = `
            <div class="card h-100 computer-card ${isSelected ? 'selected' : ''}" style="cursor: pointer; transition: all 0.2s;">
                <div class="card-body p-3">
                    <h6 class="card-title fw-bold mb-1">${comp.name}</h6>
                    <div class="small text-muted mb-2">📍 ${comp.location || '-'}</div>
                    <div class="small mb-2" style="font-size: 0.75rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                        <strong>💾:</strong> ${comp.softwareInstalled || '-'}
                    </div>
                </div>
            </div>
        `;

        col.querySelector('.card').addEventListener('click', () => {
            selectedComputer = comp;
            renderComputerPage();
        });

        list.appendChild(col);
    });

    if (totalPages > 1) {
        pagination.classList.remove('d-none');
        pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
        document.getElementById('prev-page').parentElement.classList.toggle('disabled', currentPage === 1);
        document.getElementById('next-page').parentElement.classList.toggle('disabled', currentPage === totalPages);
    } else {
        pagination.classList.add('d-none');
    }
}

// ===== FORM SUBMISSION =====
function setupFormHandlers() {
    const form = document.getElementById('submission-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Show loading
        showLoading('Menyimpan data...');

        try {
            // Collect form data
            const formData = collectFormData();

            // Validate
            if (!validateFormData(formData)) {
                hideLoading();
                return;
            }

            // Submit via API
            const result = await api.submitRequest(formData);

            hideLoading();

            if (result.success) {
                showSuccessModal(result.requestId || 'Berhasil');
                resetForm();
            } else {
                alert('Gagal menyimpan: ' + (result.message || 'Unknown error'));
            }

        } catch (error) {
            hideLoading();
            console.error('Submission error:', error);
            alert('Terjadi kesalahan: ' + error.message);
        }
    });
}

function collectFormData() {
    // Get keperluan (radio buttons)
    const keperluan = document.querySelector('input[name="keperluan"]:checked');

    // Clean and format phone number
    let rawPhone = document.getElementById('phone').value.replace(/\D/g, '');
    if (rawPhone.startsWith('0')) rawPhone = rawPhone.substring(1);
    else if (rawPhone.startsWith('62')) rawPhone = rawPhone.substring(2);
    const formattedPhone = 'https://wa.me/+62' + rawPhone;

    // Get software values (Select2 multi-select)
    const softwareValues = $('#software').val() || [];

    return {
        keperluanPenggunaan: keperluan ? keperluan.value : '',
        emailAddress: document.getElementById('email').value,
        nama: document.getElementById('nama').value,
        phone: formattedPhone,
        nim: document.getElementById('nim').value,
        emailUGM: document.getElementById('emailUGM').value,
        prodi: document.getElementById('prodi').value,
        dosenPembimbing: getDosenValue(),
        universitas: document.getElementById('universitas').value,
        topikJudul: document.getElementById('topik').value,
        software: softwareValues.join(', '),
        needsComputer: document.querySelector('input[name="needsComputer"]:checked')?.value === 'yes',
        computerRoomPreference: document.getElementById('roomPreference').value,
        preferredComputer: selectedComputer ? selectedComputer.name : '',
        mulaiPemakaian: document.getElementById('mulai').value,
        akhirPemakaian: document.getElementById('akhir').value,
        catatan: document.getElementById('catatan').value,
        uploadMethod: document.querySelector('input[name="uploadMethod"]:checked')?.value,
        linkSurat: document.getElementById('linkSurat').value,
        tipeAkses: document.getElementById('tipeAkses').value,
        computerUserName: document.getElementById('computerUserName')?.value || '',
        computerHostname: document.getElementById('computerHostname')?.value || '',
        isRenewal: false,
        previousRequestId: ""
    };
}

function getDosenValue() {
    const prodi = document.getElementById('prodi').value;
    if (prodi === 'Non-UGM') {
        return document.getElementById('dosenPembimbingManual').value;
    } else {
        return $('#dosenPembimbing').val();
    }
}

function validateFormData(data) {
    if (!data.keperluanPenggunaan) {
        alert('Pilih keperluan penggunaan');
        return false;
    }

    if (!data.emailAddress || !data.nama || !data.nim) {
        alert('Lengkapi data personal');
        return false;
    }

    if (!data.prodi) {
        alert('Pilih program studi');
        return false;
    }

    if (!data.topikJudul) {
        alert('Isi topik/judul');
        return false;
    }

    if (!data.software || data.software === '') {
        alert('Pilih minimal 1 software');
        return false;
    }

    if (!data.mulaiPemakaian) {
        alert('Tentukan tanggal mulai');
        return false;
    }

    // Check upload method
    if (data.uploadMethod === 'upload') {
        const file = document.getElementById('uploadSurat').files[0];
        if (!file) {
            alert('Upload file surat keterangan');
            return false;
        }
        if (file.size > 3 * 1024 * 1024) {
            alert('File terlalu besar (max 3MB)');
            return false;
        }
    } else if (data.uploadMethod === 'link') {
        if (!data.linkSurat) {
            alert('Sertakan link surat keterangan');
            return false;
        }
    }

    return true;
}

// ===== SUCCESS MODAL =====
function showSuccessModal(requestId) {
    const modalEl = document.getElementById('success-modal');
    if (!modalEl) return;

    const message = document.getElementById('success-message');
    if (message) {
        message.textContent = `Permohonan berhasil disubmit! Request ID: ${requestId}. Email konfirmasi telah dikirim.`;
    }

    // Get or create instance to avoid duplicate objects
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);

    // Fix ARIA Warning: remove aria-hidden before showing
    modalEl.removeAttribute('aria-hidden');

    // Add hidden listener to ensure focus is moved properly when closed
    modalEl.addEventListener('hide.bs.modal', function () {
        // Blur any focused element inside to prevent "Blocked aria-hidden"
        if (document.activeElement && modalEl.contains(document.activeElement)) {
            document.activeElement.blur();
        }
    }, { once: true });

    modalInstance.show();
}

// ===== LOADING OVERLAY =====
function showLoading(message = 'Memuat...') {
    const overlay = document.getElementById('loading-overlay');
    const messageEl = document.getElementById('loading-message');
    if (messageEl) messageEl.textContent = message;
    overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.remove('active');
}

// ===== COMPREHENSIVE RESET =====
function resetForm() {
    const form = document.getElementById('submission-form');
    if (!form) return;

    // 1. Reset standard HTML fields
    form.reset();

    // 2. Reset Select2 (Software & Dosen)
    $('#software').val(null).trigger('change');
    $('#dosenPembimbing').val(null).trigger('change');

    // 3. Reset Computer Selection State
    selectedComputer = null;
    availableComputers = [];
    filteredComputers = [];
    currentPage = 1;

    // 4. Reset UI Sections & Warnings
    document.getElementById('computer-section').style.display = 'none';
    const serverFields = document.getElementById('serverAccessFields');
    if (serverFields) serverFields.style.display = 'none';

    const warningDiv = document.getElementById('labOnlyWarning');
    if (warningDiv) warningDiv.classList.add('d-none');

    const roomSelect = document.getElementById('roomPreference');
    if (roomSelect) {
        Array.from(roomSelect.options).forEach(opt => opt.disabled = false);
    }

    const computerList = document.getElementById('computer-list');
    if (computerList) computerList.innerHTML = '';

    const computerPagination = document.getElementById('computer-pagination');
    if (computerPagination) computerPagination.classList.add('d-none');

    const universitasContainer = document.getElementById('universitas-container');
    if (universitasContainer) universitasContainer.style.display = 'none';

    const dosenManual = document.getElementById('dosenPembimbingManual');
    if (dosenManual) dosenManual.style.display = 'none';

    console.log('Form reset completed');
}
