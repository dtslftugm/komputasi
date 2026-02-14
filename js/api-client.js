/**
 * API Client - JSONP Wrapper untuk Google Apps Script backend
 * Menggunakan JSONP untuk bypass CORS restrictions
 */
class APIClient {
    constructor() {
        this.baseURL = CONFIG.API_URL;
        this.callbackCounter = 0;
    }

    /**
     * Make JSONP request (bypass CORS)
     * @param {string} path - API endpoint path
     * @param {object} params - Query parameters
     * @returns {Promise} Response data
     */
    async jsonpRequest(path, params = {}) {
        return new Promise((resolve, reject) => {
            // Generate unique callback name
            const callbackName = 'jsonp_callback_' + (++this.callbackCounter) + '_' + Date.now();

            // Create script element
            const script = document.createElement('script');

            // Build URL with callback
            const queryParams = new URLSearchParams({
                path: path,
                callback: callbackName,
                ...params
            });

            script.src = `${this.baseURL}?${queryParams.toString()}`;

            // Define global callback
            window[callbackName] = (response) => {
                // Cleanup
                delete window[callbackName];
                document.body.removeChild(script);

                // API returns { success: true/false, data: {...} } or { success: false, message: "..." }
                // We handle both legacy direct-return and new standard-wrapped formats
                if (response.success) {
                    resolve(response.data !== undefined ? response.data : response);
                } else {
                    reject(new Error(response.message || 'Request failed'));
                }
            };

            // Error handling
            script.onerror = () => {
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error('Script load failed'));
            };

            // Inject script
            document.body.appendChild(script);
        });
    }

    /**
     * Make POST request (using JSONP fallback for reading responses)
     */
    async postRequest(path, data) {
        // Since GAS doesn't support CORS for POST, we use JSONP even for data-sending actions
        // if they are within URL length limits (~2KB). For larger data (files), 
        // we must use standard POST and accept that we might not read the response.
        return this.jsonpRequest(path, data);
    }

    // ==================== PUBLIC ENDPOINTS ====================

    /**
     * Get initial data for form (dropdowns, config, renewal data)
     */
    async getInitialData(renewalId = null) {
        const params = renewalId ? { renewal_id: renewalId } : {};
        return this.jsonpRequest('initial-data', params);
    }

    /**
     * Get available computers for selection
     */
    async getAvailableComputers(room = null) {
        const params = room ? { room: room } : {};
        return this.jsonpRequest('computers-available', params);
    }

    /**
     * Get branding assets (logo, QR)
     */
    async getBranding() {
        return this.jsonpRequest('branding');
    }

    /**
     * Check software access restrictions
     */
    async checkSoftwareRestrictions(softwareListStr) {
        return this.jsonpRequest('check-restrictions', { software: softwareListStr });
    }

    /**
     * Submit new request
     */
    async submitRequest(formData) {
        return this.postRequest('submit-request', formData);
    }

    /**
     * Upload file to Google Drive
     */
    async uploadFile(rowIndex, fileData, fileName, mimeType) {
        return this.postRequest('upload-file', {
            rowIndex,
            fileData,
            fileName,
            mimeType
        });
    }

    // ==================== ADMIN ENDPOINTS ====================

    /**
     * Admin login
     */
    async adminLogin(email, password) {
        return this.postRequest('admin-login', { email, password });
    }

    /**
     * Get admin requests list
     */
    async getAdminRequests(status = 'Pending') {
        return this.postRequest('admin-requests', { status });
    }

    /**
     * Approve a request
     */
    async approveRequest(requestId, expirationDate, adminNotes, activationKey) {
        return this.postRequest('admin-approve', {
            requestId,
            expirationDate,
            adminNotes,
            activationKey
        });
    }

    /**
     * Reject a request
     */
    async rejectRequest(requestId, reason) {
        return this.postRequest('admin-reject', { requestId, reason });
    }

    /**
     * Upload file via simple POST (bypass JSONP URL length limits)
     * Uses simple request (no-cors) to avoid preflight issues
     * @param {object} data - { rowIndex, fileData, mimeType, fileName }
     * @returns {Promise}
     */
    async uploadFile(data) {
        const payload = JSON.stringify({
            path: 'upload-file',
            ...data
        });

        // Use fetch with text/plain to maintain 'Simple Request' status
        return fetch(this.baseURL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: payload
        }).then(() => {
            // mode: 'no-cors' returns opaque response, we can't read content
            // However, reaching here usually means the bytes were sent
            return { success: true, opaque: true };
        });
    }
}

// Create singleton instance
const api = new APIClient();
