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

    // Set logo (use empty if not provided by API)
    const logo = document.getElementById('app-logo');
    if (logo) {
        if (initialData.logoUrl && initialData.logoUrl.trim()) {
            logo.src = initialData.logoUrl;
            console.log('✅ Logo set successfully');
        } else if (initialData.logo && initialData.logo.trim()) {
            // Fallback for different key names
            logo.src = initialData.logo;
            console.log('✅ Logo set successfully (fallback)');
        } else {
            console.warn('⚠️ Logo URL is empty or invalid');
        }
    } else {
        console.error('❌ Logo element #app-logo not found in DOM');
    }

    // Set QR code (use empty if not provided)
    const qr = document.getElementById('app-qr');
    if (qr) {
        if (initialData.qrUrl && initialData.qrUrl.trim()) {
            qr.src = initialData.qrUrl;
            console.log('✅ QR set successfully');
        } else if (initialData.qr && initialData.qr.trim()) {
            // Fallback
            qr.src = initialData.qr;
            console.log('✅ QR set successfully (fallback)');
        } else {
            console.warn('⚠️ QR URL is empty or invalid');
        }
    } else {
        console.error('❌ QR element #app-qr not found in DOM');
    }
}

// ===== ANNOUNCEMENT =====
function showAnnouncement() {
    if (!initialData || !initialData.announcementText) return;

    const alert = document.getElementById('announcement-alert');
    const text = document.getElementById('announcement-text');

    if (initialData.announcementText.trim()) {
        text.innerHTML = initialData.announcementText;
        alert.classList.remove('d-none');
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

    if (prodi === 'Non-UGM') {
        // Show universitas field, use manual dosen input
        universitasContainer.style.display = 'block';
        dosenSelect.style.display = 'none';
        dosenManual.style.display = 'block';
        dosenManual.required = false;
    } else if (prodi) {
        // Hide universitas, show dosen dropdown
        universitasContainer.style.display = 'none';
        dosenSelect.style.display = 'block';
        dosenManual.style.display = 'none';
        dosenSelect.disabled = false;
    } else {
        // No prodi selected
        universitasContainer.style.display = 'none';
        dosenSelect.disabled = true;
    }
}

// ===== DOSEN DROPDOWN =====
async function setupDosenDropdown() {
    try {
        // Get dosen list from initialData
        // Use dosenListDetailed which returns array of {inisial, nama} objects
        if (initialData && initialData.dosenListDetailed) {
            dosenList = initialData.dosenListDetailed;
        } else if (initialData && initialData.dosenList) {
            // Fallback to simple format if detailed not available
            dosenList = initialData.dosenList;
        }

        const select = $('#dosenPembimbing');
        select.empty();
        select.append(new Option('-- Pilih Dosen --', ''));

        // Display nama, but value is inisial
        dosenList.forEach(dosen => {
            if (typeof dosen === 'object' && dosen.nama && dosen.inisial) {
                select.append(new Option(dosen.nama, dosen.inisial));
            } else if (typeof dosen === 'string') {
                // Fallback for old format
                select.append(new Option(dosen, dosen));
            }
        });

        // Initialize Select2
        select.select2({
            placeholder: 'Pilih Dosen Pembimbing / Pengampu',
            allowClear: true,
            width: '100%'
        });

    } catch (error) {
        console.error('Error loading dosen list:', error);
    }
}

// ===== SOFTWARE MULTI-SELECT =====
async function setupSoftwareSelect() {
    try {
        // Get software list and rules from initialData
        if (initialData && initialData.softwareList) {
            const softwareList = initialData.softwareList;
            softwareRules = initialData.softwareRules || {};

            const select = $('#software');
            select.empty();

            softwareList.forEach(sw => {
                select.append(new Option(sw, sw));
            });

            // Initialize Select2
            select.select2({
                placeholder: 'Pilih Software (boleh lebih > 1)',
                allowClear: true,
                width: '100%'
            });
        }
    } catch (error) {
        console.error('Error loading software list:', error);
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
function setupComputerToggle() {
    const needsComputerYes = document.getElementById('needsComputerYes');
    const needsComputerNo = document.getElementById('needsComputerNo');
    const computerSection = document.getElementById('computer-section');

    function toggleComputer() {
        if (needsComputerYes.checked) {
            computerSection.style.display = 'block';
        } else {
            computerSection.style.display = 'none';
        }
    }

    needsComputerYes.addEventListener('change', toggleComputer);
    needsComputerNo.addEventListener('change', toggleComputer);
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
                form.reset();
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

    // Get software values (Select2 multi-select)
    const softwareValues = $('#software').val() || [];

    return {
        keperluanPenggunaan: keperluan ? keperluan.value : '',
        emailAddress: document.getElementById('email').value,
        nama: document.getElementById('nama').value,
        phone: document.getElementById('phone').value,
        nim: document.getElementById('nim').value,
        emailUGM: document.getElementById('emailUGM').value,
        prodi: document.getElementById('prodi').value,
        dosenPembimbing: getDosenValue(),
        universitas: document.getElementById('universitas').value,
        topikJudul: document.getElementById('topik').value,
        software: softwareValues.join(', '),
        needsComputer: document.querySelector('input[name="needsComputer"]:checked')?.value === 'yes',
        computerRoomPreference: document.getElementById('roomPreference').value,
        preferredComputer: 'Auto Assign', // Default for standalone frontend
        mulaiPemakaian: document.getElementById('mulai').value,
        akhirPemakaian: document.getElementById('akhir').value,
        catatan: document.getElementById('catatan').value,
        uploadMethod: document.querySelector('input[name="uploadMethod"]:checked')?.value,
        linkSurat: document.getElementById('linkSurat').value,
        isRenewal: false, // Default for new standalone requests
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
    const modal = new bootstrap.Modal(document.getElementById('success-modal'));
    const message = document.getElementById('success-message');
    message.textContent = `Permohonan berhasil disubmit! Request ID: ${requestId}. Email konfirmasi telah dikirim.`;
    modal.show();
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
