/**
 * Configuration File
 * Update API_URL with your actual Google Apps Script deployment URL
 */
var CONFIG = {
  // TODO: Replace with your actual GAS deployment URL after deployment
  API_URL: 'https://script.google.com/macros/s/AKfycbxCgq1JLHx3gfVcYVXCpZ3xel5Sfv6vTldJBQG8qP6Xx-XLLMihaGE1Uf4hE7Y7mYXF/exec',

  APP_NAME: 'Layanan Komputasi DTSL FT UGM',
  APP_VERSION: '17.2',
  ENVIRONMENT: 'production'
};
window.CONFIG = CONFIG;

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
