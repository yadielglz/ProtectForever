// Configuration file for StoreView
// Edit this file to customize your Google Sheets integration

const CONFIG = {
    // Your Google Sheets URL (CSV export format)
    // Make sure the sheet is set to "Anyone with the link can view"
    GOOGLE_SHEETS_URL: 'https://docs.google.com/spreadsheets/d/1nj6k7ouNzxImks-9CEuYvkSkFQfgOeR43Py2c2XH2eU/export?format=csv&gid=0',
    
    // CORS proxy options (try different proxies if one fails)
    CORS_PROXIES: [
        'https://api.allorigins.win/raw?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://thingproxy.freeboard.io/fetch/',
        'https://corsproxy.io/?'
    ],
    
    // Alternative: Use Google Sheets API v4 (more reliable but requires API key)
    // To use this method:
    // 1. Go to https://console.cloud.google.com/
    // 2. Create a new project or select existing one
    // 3. Enable Google Sheets API
    // 4. Create credentials (API key)
    // 5. Set USE_GOOGLE_API to true and add your API key below
    USE_GOOGLE_API: false,
    GOOGLE_API_KEY: 'YOUR_GOOGLE_API_KEY_HERE',
    
    // Cache settings
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes in milliseconds
    CACHE_KEY: 'storeview_data_cache',
    
    // Schedule Google Sheets URL (single sheet with 3 schedule tables: Week0, Week1, Week2)
    SCHEDULE_SHEETS_URL: 'https://docs.google.com/spreadsheets/d/1RcMXkA2uaQK-ixK9K5EpOnszRAvzM_d3ZXVDsHsvOMw/export?format=csv',
    SCHEDULE_CACHE_KEY: 'storeview_schedule_data_cache',
    SCHEDULE_CACHE_DURATION: 60 * 60 * 1000, // 1 hour in milliseconds (schedules change less frequently)
    
    // App settings
    APP_NAME: 'StoreView',
    APP_VERSION: '1.12.18',
    
    // Security settings
    PASSCODE: '6974',
    INACTIVITY_TIMEOUT: 20 * 1000, // 20 seconds in milliseconds
    
    // Debug mode (shows console logs)
    DEBUG_MODE: true
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
