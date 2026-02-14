const EMOJI_MAP = {
    1: { icon: '😠', text: 'Sangat Kurang', color: '#ef4444' },
    2: { icon: '☹️', text: 'Kurang Baik', color: '#f97316' },
    3: { icon: '😐', text: 'Cukup', color: '#eab308' },
    4: { icon: '🙂', text: 'Baik', color: '#84cc16' },
    5: { icon: '😍', text: 'Sangat Baik', color: '#22c55e' }
};

document.addEventListener('DOMContentLoaded', () => {
    initQuisioner();
    loadBranding();
});

function initQuisioner() {
    const urlParams = new URLSearchParams(window.location.search);
    const requestId = urlParams.get('id');

    if (requestId) {
        document.getElementById('requestId').value = requestId;
    }

    // Attach slider listeners
    const sliders = document.querySelectorAll('.rating-slider');
    sliders.forEach(slider => {
        slider.addEventListener('input', (e) => {
            updateRatingFeedback(e.target);
        });
        // Set initial state
        updateRatingFeedback(slider);
    });

    const form = document.getElementById('quisioner-form');
    form.addEventListener('submit', handleSubmit);
}

function updateRatingFeedback(slider) {
    const val = slider.value;
    const id = slider.name;
    const feedback = EMOJI_MAP[val];

    const emojiEl = document.getElementById(`emoji-${id}`);
    const textEl = document.getElementById(`text-${id}`);

    if (emojiEl && textEl) {
        emojiEl.textContent = feedback.icon;
        textEl.textContent = feedback.text;
        textEl.style.color = feedback.color;

        // Add pop animation
        emojiEl.classList.remove('bounce');
        void emojiEl.offsetWidth; // trigger reflow
        emojiEl.classList.add('bounce');

        // Update slider accent color
        slider.style.accentColor = feedback.color;
    }
}

async function loadBranding() {
    try {
        const res = await api.getBranding();
        if (res.success && res.data && res.data.logo) {
            let logoSrc = res.data.logo;
            if (!logoSrc.startsWith('http') && !logoSrc.startsWith('data:')) {
                logoSrc = 'data:image/png;base64,' + logoSrc;
            }
            document.getElementById('app-logo').src = logoSrc;
        }
    } catch (e) {
        console.warn('Failed to load branding', e);
    }
}

async function handleSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    const form = e.target;
    const formData = new FormData(form);

    // Map data
    const payload = {
        requestId: formData.get('requestId'),
        komputer: formData.get('komputer'),
        fasilitas: formData.get('fasilitas'),
        kebersihan: formData.get('kebersihan'),
        administrasi: formData.get('administrasi'),
        software: formData.get('software'),
        web_portal: formData.get('web_portal'),
        saran: formData.get('saran')
    };

    // Submit
    submitBtn.disabled = true;
    submitBtn.textContent = "Mengirim...";

    try {
        const res = await api.postRequest('submit-quisioner', payload);
        if (res.success) {
            document.getElementById('form-body').style.display = 'none';
            document.getElementById('success-message').style.display = 'block';
            window.scrollTo(0, 0);
        } else {
            alert("Gagal mengirim quisioner: " + res.message);
            submitBtn.disabled = false;
            submitBtn.textContent = "Kirim Quisioner";
        }
    } catch (err) {
        alert("Terjadi kesalahan koneksi: " + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = "Kirim Quisioner";
    }
}
