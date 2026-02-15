/**
 * API Client - Hybrid Wrapper untuk Google Apps Script 
 * Mendukung akses via JSONP (GitHub/External) dan google.script.run (Inside GAS)
 */
class APIClient {
    constructor() {
        // Detect environment
        this.isGAS = typeof google !== 'undefined' && google.script && google.script.run;

        // Robust CONFIG detection
        var globalConfig = (typeof CONFIG !== 'undefined') ? CONFIG : (window.CONFIG || {});
        this.baseURL = globalConfig.API_URL || '';
        this.callbackCounter = 0;

        if (!this.isGAS && !this.baseURL) {
            console.error('APIClient: CONFIG.API_URL is missing! Check config.js');
        }

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
        var args = Array.prototype.slice.call(arguments, 1);

        if (this.isGAS) {
            return new Promise((resolve, reject) => {
                var runner = google.script.run
                    .withSuccessHandler(resolve)
                    .withFailureHandler(function (err) {
                        console.error("GAS Error (" + functionName + "):", err);
                        reject(err);
                    });
                runner[functionName].apply(runner, args);
            });
        } else {
            // Mapping for External JSONP
            var path = this.functionMap[functionName] || functionName;
            var params = args[0] || {};
            return this.jsonpRequest(path, params);
        }
    }

    /**
     * Make JSONP request (bypass CORS) - Primitive for maximum compatibility
     */
    async jsonpRequest(path, params) {
        var _this = this;
        return new Promise((resolve, reject) => {
            var cleanBaseURL = (_this.baseURL || '').trim();
            if (!cleanBaseURL) {
                reject(new Error('API URL (CONFIG.API_URL) belum diatur di config.js'));
                return;
            }

            // Simplified callback name (shorter, no special chars)
            var callbackName = 'cb' + (++_this.callbackCounter) + '_' + Date.now();
            var script = document.createElement('script');

            // Manual query string building
            var queryString = 'path=' + encodeURIComponent(path) + '&callback=' + encodeURIComponent(callbackName);

            if (params && typeof params === 'object') {
                for (var key in params) {
                    if (Object.prototype.hasOwnProperty.call(params, key)) {
                        queryString += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
                    }
                }
            }

            var finalURL = cleanBaseURL + (cleanBaseURL.indexOf('?') === -1 ? '?' : '&') + queryString;
            console.log('JSONP Request:', finalURL);
            script.src = finalURL;

            window[callbackName] = function (response) {
                delete window[callbackName];
                if (script.parentNode) script.parentNode.removeChild(script);

                if (response && response.success) {
                    resolve(response);
                } else {
                    var msg = (response && response.message) ? response.message : 'Request failed at backend';
                    reject(new Error(msg));
                }
            };

            script.onerror = function () {
                delete window[callbackName];
                if (script.parentNode) script.parentNode.removeChild(script);
                console.error('Script failed to load:', finalURL);

                // Detailed error for mobile debugging
                var errorMsg = 'Script load failed.\nURL: ' + finalURL;
                reject(new Error(errorMsg));
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
