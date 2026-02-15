/**
 * API Client - Hybrid Wrapper untuk Google Apps Script 
 * Mendukung akses via JSONP (GitHub/External) dan google.script.run (Inside GAS)
 */
class APIClient {
    constructor() {
        // Detect environment
        this.isGAS = typeof google !== 'undefined' && google.script && google.script.run;
        this.baseURL = (typeof CONFIG !== 'undefined' && CONFIG.API_URL) ? CONFIG.API_URL : '';
        this.callbackCounter = 0;

        // Map internal GAS function names to JSONP paths
        this.functionMap = {
            'apiGetInitialData': 'initial-data',
            'apiGetAvailableComputers': 'computers-available',
            'apiGetBranding': 'branding',
            'apiCheckSoftwareRestrictions': 'check-restrictions',
            'apiSubmitRequest': 'submit-request',
            'apiAdminLogin': 'admin-login',
            'apiCheckAuth': 'admin-check-auth',
            'apiGetAdminRequests': 'admin-requests',
            'apiApproveRequest': 'admin-approve',
            'apiRejectRequest': 'admin-reject'
        };
    }

    /**
     * Generic run method that works in both environments
     */
    async run(functionName) {
        const args = Array.prototype.slice.call(arguments, 1);

        if (this.isGAS) {
            return new Promise((resolve, reject) => {
                const runner = google.script.run
                    .withSuccessHandler(resolve)
                    .withFailureHandler(function (err) {
                        console.error("GAS Error (" + functionName + "):", err);
                        reject(err);
                    });
                runner[functionName].apply(runner, args);
            });
        } else {
            // Mapping for External JSONP
            const path = this.functionMap[functionName] || functionName;
            // Convert args to params object (assuming first arg is params for JSONP)
            const params = args[0] || {};
            return this.jsonpRequest(path, params);
        }
    }

    /**
     * Make JSONP request (bypass CORS) - Optimized for compatibility
     */
    async jsonpRequest(path, params) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + (++this.callbackCounter) + '_' + Date.now();
            const script = document.createElement('script');

            // Build URL manually for maximum compatibility (no object spread/URLSearchParams constructor with object)
            const queryParams = new URLSearchParams();
            queryParams.append('path', path);
            queryParams.append('callback', callbackName);

            if (params && typeof params === 'object') {
                for (let key in params) {
                    if (Object.prototype.hasOwnProperty.call(params, key)) {
                        queryParams.append(key, params[key]);
                    }
                }
            }

            script.src = this.baseURL + '?' + queryParams.toString();

            window[callbackName] = (response) => {
                delete window[callbackName];
                if (script.parentNode) script.parentNode.removeChild(script);

                if (response && response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response ? response.message : 'Request failed'));
                }
            };

            script.onerror = () => {
                delete window[callbackName];
                if (script.parentNode) script.parentNode.removeChild(script);
                reject(new Error('Script load failed - Check connectivity or API URL'));
            };

            document.body.appendChild(script);
        });
    }

    // ==================== WRAPPER METHODS (Backward Compatibility) ====================

    async getInitialData(renewalId) {
        return this.run('apiGetInitialData', renewalId ? { renewal_id: renewalId } : {});
    }

    async getAvailableComputers(room) {
        return this.run('apiGetAvailableComputers', room ? { room: room } : {});
    }

    async getBranding() {
        return this.run('apiGetBranding');
    }

    async checkSoftwareRestrictions(softwareListStr) {
        return this.run('apiCheckSoftwareRestrictions', { software: softwareListStr });
    }

    async submitRequest(formData) {
        return this.run('apiSubmitRequest', formData);
    }

    async adminLogin(email, password) {
        return this.run('apiAdminLogin', { email, password });
    }

    async checkAuth(token) {
        return this.run('apiCheckAuth', { token });
    }

    async getAdminRequests(status) {
        return this.run('apiGetAdminRequests', { status: status || 'Pending' });
    }

    async approveRequest(requestId, expirationDate, adminNotes, activationKey) {
        return this.run('apiApproveRequest', {
            requestId,
            expirationDate,
            adminNotes,
            activationKey
        });
    }

    async rejectRequest(requestId, reason) {
        return this.run('apiRejectRequest', { requestId, reason });
    }

    async uploadFile(data) {
        if (this.isGAS) {
            return this.run('apiUploadFile', data);
        }

        const payload = JSON.stringify({
            path: 'upload-file',
            rowIndex: data.rowIndex,
            fileData: data.fileData,
            mimeType: data.mimeType,
            fileName: data.fileName
        });

        return fetch(this.baseURL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: payload
        }).then(() => {
            return { success: true, opaque: true };
        });
    }
}

// Create singleton instance
const api = new APIClient();
const GAS = api; // Alias for backward compatibility in GAS version
