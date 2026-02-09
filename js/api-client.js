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
                if (response.success) {
                    resolve(response.data);
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
     * Make POST request using form submission trick
     */
    async postRequest(path, data) {
        // For POST, we'll use fetch with no-cors mode as fallback
        // Or we can create an iframe approach
        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, ...data })
            });

            // no-cors mode doesn't allow reading response
            // Assume success if no error thrown
            return { success: true };
        } catch (error) {
            throw new Error('POST request failed: ' + error.message);
        }
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
     * Get software access rules
     */
    async getSoftwareRules() {
        return this.jsonpRequest('software-rules');
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
}

// Create singleton instance
const api = new APIClient();
