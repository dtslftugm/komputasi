/**
 * Configuration File
 * Update API_URL with your actual Google Apps Script deployment URL
 */
var CONFIG = {
  // URL Beta Tester
//  API_URL: 'https://script.google.com/macros/s/AKfycbxCgq1JLHx3gfVcYVXCpZ3xel5Sfv6vTldJBQG8qP6Xx-XLLMihaGE1Uf4hE7Y7mYXF/exec',
  
  //URL live
  API_URL: 'https://script.google.com/macros/s/AKfycbyPCAs7bebTWcXkWsJ9Qi0paL2o88HT-4z5c-bTNVsQ73n4t_2mTndXsGC7dYIXIyIN/exec',
  APP_NAME: 'Layanan Komputasi DTSL FT UGM',
  APP_VERSION: '17.2',
  ENVIRONMENT: 'production'
};
window.CONFIG = CONFIG;

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}

