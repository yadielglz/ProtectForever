// Passcode Configuration
const PASSCODE = '6974';
let currentPasscode = '';
let isAuthenticated = false;

// Inactivity timeout variables
let inactivityTimeout;
let warningTimeout;
const INACTIVITY_TIMEOUT = 20000; // 20 seconds of inactivity
const WARNING_TIME = 5000; // Show warning 5 seconds before timeout
let lastActivityTime = Date.now();

// Passcode Screen Elements
const passcodeScreen = document.getElementById('passcodeScreen');
const mainApp = document.getElementById('mainApp');
const passcodeDate = document.getElementById('passcodeDate');
const passcodeDots = document.querySelectorAll('.passcode-dot');
const passcodeKeys = document.querySelectorAll('.passcode-key');
const passcodeError = document.getElementById('passcodeError');

// Configuration - loaded from config.js
const CONFIG = typeof PROTECT_SERVE_CONFIG !== 'undefined' ? PROTECT_SERVE_CONFIG : {
    // Fallback configuration if config.js is not loaded
    GOOGLE_SHEETS_URL: 'https://docs.google.com/spreadsheets/d/1nj6k7ouNzxImks-9CEuYvkSkFQfgOeR43Py2c2XH2eU/edit?usp=sharing',
    CORS_PROXIES: [
        'https://api.allorigins.win/raw?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://thingproxy.freeboard.io/fetch/',
        'https://corsproxy.io/?'
    ],
    USE_GOOGLE_API: false,
    GOOGLE_API_KEY: 'YOUR_GOOGLE_API_KEY_HERE',
    CACHE_DURATION: 5 * 60 * 1000,
    CACHE_KEY: 'protect_serve_data_cache',
    DEBUG_MODE: true
};

// Brand priority for sorting (most popular first)
const BRAND_PRIORITY = {
    'Apple': 1,
    'Samsung': 2,
    'Google': 3,
    'Pixel': 3, // Same as Google
    'Motorola': 4,
    'OnePlus': 5,
    'Huawei': 6,
    'Xiaomi': 7,
    'Oppo': 8,
    'Vivo': 9,
    'LG': 10,
    'Sony': 11,
    'Nokia': 12,
    'BlackBerry': 13,
    'Revvl': 14
};

// Sort brands by priority and popularity
function sortBrands(brands) {
    return brands.sort((a, b) => {
        const priorityA = BRAND_PRIORITY[a] || 999;
        const priorityB = BRAND_PRIORITY[b] || 999;
        
        // First sort by priority
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        
        // Then sort alphabetically for brands with same priority
        return a.localeCompare(b);
    });
}

// Sort models alphabetically within a brand
function sortModels(models) {
    return models.sort((a, b) => {
        // Extract model numbers for better sorting
        const modelA = a.deviceModel.toLowerCase();
        const modelB = b.deviceModel.toLowerCase();
        
        // Try to extract numbers for numeric sorting
        const numA = modelA.match(/\d+/);
        const numB = modelB.match(/\d+/);
        
        if (numA && numB) {
            const numAVal = parseInt(numA[0]);
            const numBVal = parseInt(numB[0]);
            
            // If numbers are different, sort by number (descending for newer models first)
            if (numAVal !== numBVal) {
                return numBVal - numAVal;
            }
        }
        
        // Otherwise sort alphabetically
        return modelA.localeCompare(modelB);
    });
}

// Device brand icon mapping
const DEVICE_BRAND_ICONS = {
    'apple': {
        icon: 'fab fa-apple',
        color: '#ffffff',
        background: '#000000'
    },
    'samsung': {
        icon: 'fas fa-tablet-alt',
        color: '#ffffff',
        background: '#1428a0'
    },
    'google': {
        icon: 'fab fa-google',
        color: '#ffffff',
        background: '#4285f4'
    },
    'pixel': {
        icon: 'fab fa-google',
        color: '#ffffff',
        background: '#4285f4'
    },
    'motorola': {
        icon: 'fas fa-broadcast-tower',
        color: '#ffffff',
        background: '#5c92fa'
    },
    'revvl': {
        icon: 'fas fa-mobile-alt',
        color: '#ffffff',
        background: '#e20074'
    },
    'oneplus': {
        icon: 'fas fa-mobile-alt',
        color: '#ffffff',
        background: '#f5010c'
    },
    'huawei': {
        icon: 'fas fa-mobile-alt',
        color: '#ffffff',
        background: '#ff6900'
    },
    'xiaomi': {
        icon: 'fas fa-mobile-alt',
        color: '#ffffff',
        background: '#ff6900'
    },
    'oppo': {
        icon: 'fas fa-mobile-alt',
        color: '#ffffff',
        background: '#0088ff'
    },
    'vivo': {
        icon: 'fas fa-mobile-alt',
        color: '#ffffff',
        background: '#5c2d91'
    },
    'lg': {
        icon: 'fas fa-mobile-alt',
        color: '#ffffff',
        background: '#a50034'
    },
    'sony': {
        icon: 'fas fa-mobile-alt',
        color: '#ffffff',
        background: '#000000'
    },
    'nokia': {
        icon: 'fas fa-mobile-alt',
        color: '#ffffff',
        background: '#124191'
    },
    'blackberry': {
        icon: 'fas fa-mobile-alt',
        color: '#ffffff',
        background: '#000000'
    }
};

// Brand logo mapping
const BRAND_LOGOS = {
    'goto': 'GT',
    'zagg': 'ZG',
    'is gls': 'IG',
    'spigen': 'SP',
    'otterbox': 'OB',
    'caseology': 'CS',
    'tech21': 'T21',
    'incipio': 'IN',
    'lifeproof': 'LP',
    'mous': 'MS'
};

// Current search state
let currentSearchResults = [];
let selectedDeviceIndex = -1;

// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Fallback data in case Google Sheets is unavailable
const fallbackData = [
    {
        mdn: "7869913289",
        deviceBrand: "Apple",
        deviceModel: "iPhone 16 Pro Max",
        brand: "GoTo",
        type: "Clear",
        upc: "2161",
        available: true
    },
    {
        mdn: "7869913289",
        deviceBrand: "Apple",
        deviceModel: "iPhone 16 Pro Max",
        brand: "ZAGG",
        type: "Privacy",
        upc: "8091",
        available: true
    },
    {
        mdn: "7869913289",
        deviceBrand: "Apple",
        deviceModel: "iPhone 12/12Pro",
        brand: "GoTo",
        type: "Clear",
        upc: "76",
        available: true
    },
    {
        mdn: "7879638400",
        deviceBrand: "Apple",
        deviceModel: "iPhone 15 Plus",
        brand: "GoTo",
        type: "Clear",
        upc: "8737",
        available: true
    },
    {
        mdn: "7879638400",
        deviceBrand: "Apple",
        deviceModel: "iPhone 16 Plus",
        brand: "GoTo",
        type: "Clear",
        upc: "2147",
        available: true
    },
    {
        mdn: "7879638400",
        deviceBrand: "Apple",
        deviceModel: "iPhone 15 Pro Max",
        brand: "GoTo",
        type: "Clear",
        upc: "8744",
        available: true
    },
    {
        mdn: "7876192300",
        deviceBrand: "Apple",
        deviceModel: "iPhone 16",
        brand: "ZAGG",
        type: "Privacy",
        upc: "8107",
        available: true
    },
    {
        mdn: "4076248654",
        deviceBrand: "Apple",
        deviceModel: "iPhone 14 Plus",
        brand: "IS GLS",
        type: "Privacy",
        upc: "7997",
        available: true
    },
    {
        mdn: "4076248654",
        deviceBrand: "Apple",
        deviceModel: "iPhone 11/XR",
        brand: "ZAGG",
        type: "VG",
        upc: "5591",
        available: true
    },
    {
        mdn: "3214247089",
        deviceBrand: "Apple",
        deviceModel: "iPhone 13 Pro Max",
        brand: "GoTo",
        type: "Clear",
        upc: "724",
        available: true
    },
    {
        mdn: "3214247089",
        deviceBrand: "Apple",
        deviceModel: "iPhone 14 Pro Max",
        brand: "GoTo",
        type: "Clear",
        upc: "6757",
        available: true
    },
    {
        mdn: "3214247089",
        deviceBrand: "Apple",
        deviceModel: "iPhone 7 Plus/8 Plus",
        brand: "GoTo",
        type: "Clear",
        upc: "1975",
        available: true
    },
    {
        mdn: "3214247089",
        deviceBrand: "Apple",
        deviceModel: "iPhone 11/XR",
        brand: "GoTo",
        type: "Clear",
        upc: "21",
        available: true
    },
    {
        mdn: "4847259509",
        deviceBrand: "Apple",
        deviceModel: "iPhone 16 Pro",
        brand: "GoTo",
        type: "Clear",
        upc: "2154",
        available: true
    },
    {
        mdn: "8632429037",
        deviceBrand: "Apple",
        deviceModel: "iPhone 13/ 13 Pro/ 14/ 14 Pro/16e",
        brand: "GoTo",
        type: "Clear",
        upc: "6764",
        available: true
    }
];

// DOM elements
const brandStep = document.getElementById('brandStep');
const modelStep = document.getElementById('modelStep');
const brandGrid = document.getElementById('brandGrid');
const modelGrid = document.getElementById('modelGrid');
const backToBrands = document.getElementById('backToBrands');
const settingsButton = document.getElementById('settingsButton');
const settingsMenu = document.getElementById('settingsMenu');
const resultsModal = document.getElementById('resultsModal');
const closeModal = document.getElementById('closeModal');
const emptyState = document.getElementById('emptyState');
const deviceName = document.getElementById('deviceName');
const deviceModel = document.getElementById('deviceModel');
const deviceIcon = document.querySelector('.device-icon');
const optionsGrid = document.getElementById('optionsGrid');
const showMdnBtn = document.getElementById('showMdnBtn');
const mdnDisplay = document.getElementById('mdnDisplay');
const mdnValue = document.getElementById('mdnValue');
const dataStatus = document.getElementById('dataStatus');
const statusText = document.getElementById('statusText');
const refreshButton = document.getElementById('refreshButton');
const reloadButton = document.getElementById('reloadButton');
const currentTime = document.getElementById('currentTime');
const currentDate = document.getElementById('currentDate');
const lastUpdated = document.getElementById('lastUpdated');
const dataSource = document.getElementById('dataSource');

// Google Sheets integration functions
async function loadDataFromGoogleSheets() {
    try {
        // Check cache first
        const cachedData = getCachedData();
        if (cachedData) {
            console.log('Using cached data');
            deviceData = cachedData;
            hideLoadingState(); // Hide loading state when using cached data
            return;
        }
        
        // Use requestIdleCallback for non-critical data loading
        if ('requestIdleCallback' in window) {
            return new Promise((resolve) => {
                requestIdleCallback(async () => {
                    await performDataLoad();
                    resolve();
                });
            });
        } else {
            await performDataLoad();
        }
    } catch (error) {
        console.error('Error loading data from Google Sheets:', error);
        console.log('Falling back to local data');
        deviceData = fallbackData;
        showErrorMessage('Could not load data from Google Sheets. Using local data.');
        showDataStatus('Using offline data', 'offline');
        
        // Update source status
        updateSourceStatus('Vault (Offline)', null);
        
        // Hide status after 5 seconds
        setTimeout(() => {
            hideDataStatus();
        }, 5000);
    } finally {
        hideLoadingState();
    }
}

async function performDataLoad() {
    // Show loading state
    showLoadingState();
    showDataStatus('Getting info from vault...', 'offline');

    let response;
    
    // Try Google Sheets API v4 first if configured
    if (CONFIG.USE_GOOGLE_API && CONFIG.GOOGLE_API_KEY !== 'YOUR_GOOGLE_API_KEY_HERE') {
        try {
            response = await fetchFromGoogleSheetsAPI();
        } catch (error) {
            console.warn('Google Sheets API failed, trying CORS proxies:', error.message);
            // Fall back to CORS proxies
            const csvUrl = convertToCsvUrl(CONFIG.GOOGLE_SHEETS_URL);
            response = await fetchWithCorsProxies(csvUrl);
        }
    } else {
        // Use CORS proxies
        const csvUrl = convertToCsvUrl(CONFIG.GOOGLE_SHEETS_URL);
        response = await fetchWithCorsProxies(csvUrl);
    }
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    const parsedData = parseCsvData(csvText);
    
    if (parsedData.length > 0) {
        deviceData = parsedData;
        // Cache the data
        cacheData(deviceData);
        console.log(`Loaded ${deviceData.length} devices from Google Sheets`);
        showDataStatus(`Loaded ${deviceData.length} devices`, 'online');
        
        // Update source status
        updateSourceStatus('Vault', new Date());
        
        // Hide status after 3 seconds
        setTimeout(() => {
            hideDataStatus();
        }, 3000);
    } else {
        throw new Error('No data found in Google Sheets');
    }
}

// Convert Google Sheets URL to CSV export URL
function convertToCsvUrl(sheetsUrl) {
    // Extract sheet ID from the URL
    const sheetIdMatch = sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    
    if (!sheetIdMatch) {
        throw new Error('Invalid Google Sheets URL format');
    }
    
    const sheetId = sheetIdMatch[1];
    
    // Return CSV export URL
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
}

// Fetch data using CORS proxies with fallback
async function fetchWithCorsProxies(url) {
    let lastError = null;
    
    // Try each CORS proxy
    for (let i = 0; i < CONFIG.CORS_PROXIES.length; i++) {
        const proxy = CONFIG.CORS_PROXIES[i];
        
        try {
            if (CONFIG.DEBUG_MODE) {
                console.log(`Trying CORS proxy ${i + 1}/${CONFIG.CORS_PROXIES.length}: ${proxy}`);
            }
            
            let proxyUrl;
            if (proxy.includes('allorigins.win')) {
                proxyUrl = proxy + encodeURIComponent(url);
            } else if (proxy.includes('corsproxy.io')) {
                proxyUrl = proxy + encodeURIComponent(url);
            } else {
                proxyUrl = proxy + url;
            }
            
            // Update status for user feedback
            updateDataStatus(`Trying connection ${i + 1}/${CONFIG.CORS_PROXIES.length}...`, 'offline');
            
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/csv,text/plain,*/*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (response.ok) {
                if (CONFIG.DEBUG_MODE) {
                    console.log(`Successfully fetched data using proxy ${i + 1}`);
                }
                return response;
            } else {
                throw new Error(`Proxy ${i + 1} returned status ${response.status}`);
            }
            
        } catch (error) {
            if (CONFIG.DEBUG_MODE) {
                console.warn(`CORS proxy ${i + 1} failed:`, error.message);
            }
            lastError = error;
            continue;
        }
    }
    
    // If all proxies fail, try direct access (might work in some browsers)
    try {
        console.log('Trying direct access as last resort...');
        const response = await fetch(url);
        if (response.ok) {
            console.log('Direct access succeeded');
            return response;
        }
    } catch (error) {
        console.warn('Direct access also failed:', error.message);
    }
    
    // If everything fails, throw the last error
    throw new Error(`All CORS proxies failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// Fetch data using Google Sheets API v4
async function fetchFromGoogleSheetsAPI() {
    const sheetId = CONFIG.GOOGLE_SHEETS_URL.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)[1];
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1?key=${CONFIG.GOOGLE_API_KEY}`;
    
    console.log('Fetching data using Google Sheets API v4...');
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
        throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.values || data.values.length === 0) {
        throw new Error('No data found in Google Sheets');
    }
    
    // Convert API response to CSV-like format for parsing
    const csvText = data.values.map(row => row.join(',')).join('\n');
    
    // Create a mock response object
    return {
        ok: true,
        text: () => Promise.resolve(csvText)
    };
}

// Parse CSV data into device objects
function parseCsvData(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
        throw new Error('CSV file must have at least a header and one data row');
    }
    
    // Parse header
    const headers = parseCsvLine(lines[0]);
    const expectedHeaders = ['MDN', 'Device Brand', 'Device Model', 'Brand', 'Type', 'UPC', 'Available'];
    
    // Validate headers
    const headerMap = {};
    expectedHeaders.forEach(header => {
        const index = headers.findIndex(h => h.toLowerCase().includes(header.toLowerCase()));
        if (index === -1) {
            throw new Error(`Missing required column: ${header}`);
        }
        headerMap[header] = index;
    });
    
    // Parse data rows
    const devices = [];
    for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(lines[i]);
        
        if (row.length < expectedHeaders.length) {
            console.warn(`Skipping incomplete row ${i + 1}`);
            continue;
        }
        
        try {
            const device = {
                mdn: row[headerMap['MDN']]?.trim() || '',
                deviceBrand: row[headerMap['Device Brand']]?.trim() || '',
                deviceModel: row[headerMap['Device Model']]?.trim() || '',
                brand: row[headerMap['Brand']]?.trim() || '',
                type: row[headerMap['Type']]?.trim() || '',
                upc: row[headerMap['UPC']]?.trim() || '',
                available: parseAvailability(row[headerMap['Available']]?.trim() || '')
            };
            
            // Validate required fields
            if (device.mdn && device.deviceBrand && device.deviceModel && device.brand && device.type && device.upc) {
                devices.push(device);
            } else {
                console.warn(`Skipping row ${i + 1} due to missing required fields`);
            }
        } catch (error) {
            console.warn(`Error parsing row ${i + 1}:`, error);
        }
    }
    
    return devices;
}

// Parse a single CSV line handling quoted fields
function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// Parse availability status
function parseAvailability(availability) {
    const available = availability.toLowerCase();
    return available === 'true' || available === 'yes' || available === '✅' || available === 'available';
}

// Cache management
function getCachedData() {
    try {
        const cached = localStorage.getItem(CONFIG.CACHE_KEY);
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        
        // Check if cache is still valid
        if (Date.now() - timestamp > CONFIG.CACHE_DURATION) {
            localStorage.removeItem(CONFIG.CACHE_KEY);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Error reading cache:', error);
        return null;
    }
}

function cacheData(data) {
    try {
        const cacheObject = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(cacheObject));
    } catch (error) {
        console.error('Error caching data:', error);
    }
}

// Loading and error states
function showLoadingState() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingState';
    loadingDiv.className = 'loading-state';
    loadingDiv.innerHTML = `
        <div class="loading-content">
            <i class="fas fa-spinner fa-spin loading-icon"></i>
            <h3>Loading Device Data</h3>
            <p>Getting info from vault...</p>
        </div>
    `;
    
    // Hide other content
    resultsModal.style.display = 'none';
    emptyState.style.display = 'none';
    
    // Show loading
    document.querySelector('.main-content').appendChild(loadingDiv);
}

function hideLoadingState() {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.remove();
    }
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-triangle error-icon"></i>
            <h3>Connection Issue</h3>
            <p>${message}</p>
            <button onclick="location.reload()" class="retry-button">
                <i class="fas fa-refresh"></i> Retry
            </button>
        </div>
    `;
    
    // Hide other content
    resultsModal.style.display = 'none';
    emptyState.style.display = 'none';
    
    // Show error
    document.querySelector('.main-content').appendChild(errorDiv);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
            emptyState.style.display = 'block';
        }
    }, 5000);
}

// Clock functionality
function updateClock() {
    const now = new Date();
    
    // Format time in AM/PM
    const timeOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    const timeString = now.toLocaleTimeString('en-US', timeOptions);
    
    // Format date - compact for mobile
    const isMobile = window.innerWidth <= 768;
    const dateOptions = isMobile ? {
        month: 'short',
        day: 'numeric'
    } : {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    };
    const dateString = now.toLocaleDateString('en-US', dateOptions);
    
    currentTime.textContent = timeString;
    currentDate.textContent = dateString;
}

// Source status functionality
function updateSourceStatus(source, timestamp) {
    const now = new Date();
    
    // Update data source
    dataSource.textContent = `Source: ${source}`;
    
    // Update last updated time
    if (timestamp) {
        const timeDiff = now - timestamp;
        const minutesAgo = Math.floor(timeDiff / (1000 * 60));
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        
        let timeString;
        if (minutesAgo < 1) {
            timeString = 'Just now';
        } else if (minutesAgo < 60) {
            timeString = `${minutesAgo}m ago`;
        } else if (hoursAgo < 24) {
            timeString = `${hoursAgo}h ago`;
        } else {
            const daysAgo = Math.floor(hoursAgo / 24);
            timeString = `${daysAgo}d ago`;
        }
        
        lastUpdated.textContent = `Last updated: ${timeString}`;
    } else {
        lastUpdated.textContent = 'Last updated: Never';
    }
}

// Initialize source status
function initializeSourceStatus() {
    const cached = localStorage.getItem(CONFIG.CACHE_KEY);
    if (cached) {
        try {
            const { timestamp } = JSON.parse(cached);
            updateSourceStatus('Vault (Cached)', new Date(timestamp));
        } catch (error) {
            updateSourceStatus('Vault', null);
        }
    } else {
        updateSourceStatus('Vault', null);
    }
}

// Mobile-specific features
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768;
}

function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Application state management
let clockInterval = null;
let cleanupFunctions = [];

// Cleanup function to prevent memory leaks
function addCleanupFunction(fn) {
    cleanupFunctions.push(fn);
}

function cleanup() {
    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions = [];
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
    
    // Clear inactivity timeouts
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = null;
    }
    if (warningTimeout) {
        clearTimeout(warningTimeout);
        warningTimeout = null;
    }
}

// Initialize the application
// Clear all loading states
function clearAllLoadingStates() {
    console.log('Clearing all loading states...');
    
    hideLoadingState();
    hideDataStatus();
    
    // Also clear any generic loading elements
    const genericLoading = document.querySelector('.loading');
    if (genericLoading) {
        console.log('Removing generic loading element');
        genericLoading.remove();
    }
    
    // Clear any loading spinners
    const spinners = document.querySelectorAll('.fa-spinner');
    spinners.forEach(spinner => {
        if (spinner.classList.contains('fa-spin')) {
            console.log('Removing spinning icon');
            spinner.parentElement.remove();
        }
    });
    
    // Clear any loading-state elements
    const loadingStates = document.querySelectorAll('.loading-state');
    loadingStates.forEach(state => {
        console.log('Removing loading state element');
        state.remove();
    });
    
    console.log('All loading states cleared');
}

document.addEventListener('DOMContentLoaded', async function() {
    // Clear any existing loading states first
    clearAllLoadingStates();
    
    // Ensure passcode screen is visible
    passcodeScreen.style.display = 'flex';
    mainApp.style.display = 'none';
    
    // Initialize passcode screen
    setupPasscodeEventListeners();
    
    // Register Service Worker for PWA functionality
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered successfully');
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    }
    
    console.log('PIN screen initialized. Waiting for authentication...');
    
    // Setup inactivity timeout tracking
    setupInactivityTracking();
    
    // Debug: Add manual show main app function to window for testing
    window.showMainApp = function() {
        console.log('Manually showing main app...');
        passcodeScreen.style.display = 'none';
        mainApp.style.display = 'block';
        mainApp.style.visibility = 'visible';
        mainApp.style.opacity = '1';
        console.log('Main app should now be visible');
    };
});

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// PIN Functions

function updatePasscodeDots() {
    passcodeDots.forEach((dot, index) => {
        if (index < currentPasscode.length) {
            dot.classList.add('filled');
        } else {
            dot.classList.remove('filled');
        }
    });
}

function addPasscodeDigit(digit) {
    if (currentPasscode.length < 4) {
        currentPasscode += digit;
        updatePasscodeDots();
        hidePasscodeError();
        
        // Auto-submit when 4 digits are entered
        if (currentPasscode.length === 4) {
            setTimeout(() => {
                verifyPasscode();
            }, 300);
        }
    }
}

function clearPasscode() {
    currentPasscode = '';
    updatePasscodeDots();
    hidePasscodeError();
}

function verifyPasscode() {
    console.log('Verifying passcode:', currentPasscode, 'Expected:', PASSCODE);
    
    if (currentPasscode === PASSCODE) {
        console.log('PIN correct - transitioning to main app');
        // Correct passcode - show main app
        isAuthenticated = true;
        
        // Force hide passcode screen
        passcodeScreen.style.display = 'none';
        passcodeScreen.style.visibility = 'hidden';
        
        // Use setTimeout to ensure DOM updates
        setTimeout(() => {
            // Add authenticated class to body for CSS targeting
            document.body.classList.add('authenticated');
            
            // Force show main app with multiple methods
            mainApp.style.display = 'block';
            mainApp.style.visibility = 'visible';
            mainApp.style.opacity = '1';
            mainApp.classList.remove('hidden');
            
            console.log('Main app display:', mainApp.style.display);
            console.log('Main app visibility:', mainApp.style.visibility);
            console.log('Main app offsetParent:', mainApp.offsetParent);
            console.log('Body has authenticated class:', document.body.classList.contains('authenticated'));
            
            // Initialize the main app
            initializeMainApp();
            
            // Start inactivity timeout
            resetInactivityTimeout();
        }, 100);
    } else {
        console.log('PIN incorrect - showing error');
        // Wrong passcode - show error and clear
        showPasscodeError();
        setTimeout(() => {
            clearPasscode();
        }, 1000);
    }
}

function showPasscodeError() {
    passcodeError.classList.add('show');
}

function hidePasscodeError() {
    passcodeError.classList.remove('show');
}

// Inactivity Timeout Functions
function resetInactivityTimeout() {
    lastActivityTime = Date.now();
    
    // Clear existing timeouts
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
    }
    if (warningTimeout) {
        clearTimeout(warningTimeout);
    }
    
    // Only set timeout if user is authenticated
    if (isAuthenticated) {
        // Set warning timeout (5 seconds before main timeout)
        warningTimeout = setTimeout(() => {
            showInactivityWarning();
        }, INACTIVITY_TIMEOUT - WARNING_TIME);
        
        // Set main timeout
        inactivityTimeout = setTimeout(() => {
            lockApp();
        }, INACTIVITY_TIMEOUT);
    }
}

function showInactivityWarning() {
    console.log('Showing inactivity warning');
    
    // Create or show warning notification
    let warningDiv = document.getElementById('inactivityWarning');
    if (!warningDiv) {
        warningDiv = document.createElement('div');
        warningDiv.id = 'inactivityWarning';
        warningDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff6b35;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: 'Google Sans', sans-serif;
            font-size: 14px;
            font-weight: 500;
            animation: slideDown 0.3s ease-out;
        `;
        document.body.appendChild(warningDiv);
    }
    
    warningDiv.textContent = 'App will lock in 5 seconds due to inactivity';
    warningDiv.style.display = 'block';
    
    // Auto-hide warning after 5 seconds
    setTimeout(() => {
        if (warningDiv) {
            warningDiv.style.display = 'none';
        }
    }, WARNING_TIME);
}

function lockApp() {
    console.log('App locked due to inactivity');
    
    // Reset authentication
    isAuthenticated = false;
    
    // Clear timeouts
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = null;
    }
    if (warningTimeout) {
        clearTimeout(warningTimeout);
        warningTimeout = null;
    }
    
    // Hide warning if visible
    const warningDiv = document.getElementById('inactivityWarning');
    if (warningDiv) {
        warningDiv.style.display = 'none';
    }
    
    // Show PIN screen
    passcodeScreen.style.display = 'flex';
    passcodeScreen.style.visibility = 'visible';
    
    // Hide main app
    mainApp.style.display = 'none';
    mainApp.style.visibility = 'hidden';
    
    // Remove authenticated class from body
    document.body.classList.remove('authenticated');
    
    // Clear current passcode
    currentPasscode = '';
    updatePasscodeDots();
    hidePasscodeError();
    
    // Reset activity time
    lastActivityTime = Date.now();
}

function trackUserActivity() {
    lastActivityTime = Date.now();
    resetInactivityTimeout();
}

function setupInactivityTracking() {
    // Events that indicate user activity
    const activityEvents = [
        'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'
    ];
    
    // Add event listeners to track user activity
    activityEvents.forEach(event => {
        document.addEventListener(event, trackUserActivity, true);
    });
    
    // Also track visibility changes (when user switches tabs/apps)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // User switched away - don't reset timeout
            console.log('App hidden - timeout continues');
        } else {
            // User returned - reset timeout
            console.log('App visible - resetting timeout');
            trackUserActivity();
        }
    });
    
    console.log('Inactivity tracking setup complete');
}

function initializeMainApp() {
    // Initialize clock for main app
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
    
    // Initialize source status
    initializeSourceStatus();
    
    // Add mobile-specific classes
    if (isMobileDevice()) {
        document.body.classList.add('mobile-device');
    }
    
    if (isTouchDevice()) {
        document.body.classList.add('touch-device');
    }
    
    // Load data from Google Sheets
    loadDataFromGoogleSheets().then(() => {
        // Validate data before initializing UI
        if (!validateDeviceData()) {
            console.error('Invalid device data after loading');
            return;
        }
        
        // Initialize UI after data is loaded and validated
        initializeDeviceFlow();
        setupEventListeners();
        setupMobileFeatures();
        
        // Ensure loading states are hidden
        clearAllLoadingStates();
        
        console.log('Main app initialized successfully');
    }).catch(error => {
        console.error('Failed to load device data:', error);
        handleError(error);
    });
}

function setupPasscodeEventListeners() {
    // Keypad event listeners
    passcodeKeys.forEach(key => {
        key.addEventListener('click', () => {
            const keyValue = key.dataset.key;
            
            if (keyValue === 'clear') {
                clearPasscode();
            } else if (keyValue === 'enter') {
                verifyPasscode();
            } else if (keyValue >= '0' && keyValue <= '9') {
                addPasscodeDigit(keyValue);
            }
        });
    });
    
    // Keyboard support
    document.addEventListener('keydown', (e) => {
        // Only handle keys when passcode screen is visible
        if (passcodeScreen.style.display !== 'none') {
            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                addPasscodeDigit(e.key);
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                clearPasscode();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                verifyPasscode();
            }
        }
    });
}

// Initialize search functionality (replaced with device flow)
function initializeSearch() {
    console.log('Search functionality replaced with device flow');
}

// Initialize device flow
function initializeDeviceFlow() {
    // Get unique brands and sort them
    const uniqueBrands = [...new Set(deviceData.map(device => device.deviceBrand))];
    const sortedBrands = sortBrands(uniqueBrands);
    
    // Clear existing content
    brandGrid.innerHTML = '';
    
    // Create brand cards in sorted order
    sortedBrands.forEach((brand, index) => {
        const brandCard = createBrandCard(brand, index);
        brandGrid.appendChild(brandCard);
    });
    
    console.log('Device flow initialized with', sortedBrands.length, 'brands (sorted by popularity)');
}

// Create brand card element
function createBrandCard(brand, index) {
    const card = document.createElement('div');
    card.className = 'brand-card';
    card.dataset.brand = brand;
    
    // Count devices for this brand
    const deviceCount = deviceData.filter(d => d.deviceBrand === brand).length;
    
    // Get brand icon
    const brandIcon = getDeviceIcon(brand);
    
    card.innerHTML = `
        <div class="brand-card-icon">
            ${brandIcon}
        </div>
        <div class="brand-card-info">
            <h3>${brand}</h3>
            <p>${deviceCount} Device${deviceCount !== 1 ? 's' : ''}</p>
        </div>
    `;
    
    // Add click handler
    card.addEventListener('click', () => selectBrand(brand));
    
    // Add entrance animation
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        card.style.transition = 'all 0.3s ease-out';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
    }, index * 100);
    
    return card;
}

// Create model card element
function createModelCard(device, index) {
    const card = document.createElement('div');
    card.className = 'model-card';
    card.dataset.deviceModel = device.deviceModel;
    
    // Count units for this device
    const unitCount = deviceData.filter(d => d.deviceModel === device.deviceModel).length;
    
    // Check if any protection options are available
    const hasAvailableOptions = deviceData.some(d => d.deviceModel === device.deviceModel && d.available);
    
    // Simple availability status
    const availabilityStatus = hasAvailableOptions ? 'Available' : 'Unavailable';
    const availabilityClass = hasAvailableOptions ? 'available' : 'unavailable';
    const availabilityIcon = hasAvailableOptions ? 'fas fa-check-circle' : 'fas fa-times-circle';
    
    // Get device icon
    const deviceIcon = getDeviceIcon(device.deviceBrand);
    
    card.innerHTML = `
        <div class="model-card-header">
            <div class="model-card-icon">
                ${deviceIcon}
            </div>
            <div class="model-card-info">
                <h3>${device.deviceModel}</h3>
                <p>${device.deviceBrand} Device</p>
            </div>
        </div>
        <div class="model-card-footer">
            <div class="availability-info">
                <div class="availability-status ${availabilityClass}">
                    <i class="${availabilityIcon}"></i>
                    <span>${availabilityStatus}</span>
                </div>
                <div class="availability-details">
                    <span class="unit-count">${unitCount} Unit${unitCount !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <span class="device-brand">${device.deviceBrand}</span>
        </div>
    `;
    
    // Add click handler
    card.addEventListener('click', () => selectDevice(device));
    
    // Add entrance animation
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        card.style.transition = 'all 0.3s ease-out';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
    }, index * 100);
    
    return card;
}

// Select brand and show models
function selectBrand(brand) {
    // Get models for this brand
    const brandDevices = deviceData.filter(device => device.deviceBrand === brand);
    const uniqueModels = [...new Map(brandDevices.map(device => [device.deviceModel, device])).values()];
    
    // Sort models by name and number
    const sortedModels = sortModels(uniqueModels);
    
    // Clear model grid
    modelGrid.innerHTML = '';
    
    // Create model cards in sorted order
    sortedModels.forEach((device, index) => {
        const modelCard = createModelCard(device, index);
        modelGrid.appendChild(modelCard);
    });
    
    // Switch to model step
    brandStep.classList.remove('active');
    modelStep.classList.add('active');
    
    console.log('Selected brand:', brand, 'with', sortedModels.length, 'models (sorted)');
}

// Go back to brand selection
function goBackToBrands() {
    modelStep.classList.remove('active');
    brandStep.classList.add('active');
}

// Toggle settings menu
function toggleSettingsMenu() {
    settingsMenu.classList.toggle('active');
}

// Close settings menu when clicking outside
function closeSettingsMenu(event) {
    if (!settingsButton.contains(event.target) && !settingsMenu.contains(event.target)) {
        settingsMenu.classList.remove('active');
    }
}

// Setup event listeners
function setupEventListeners() {
    showMdnBtn.addEventListener('click', toggleMdnDisplay);
    refreshButton.addEventListener('click', handleRefresh);
    reloadButton.addEventListener('click', function() {
        window.location.reload();
    });
    backToBrands.addEventListener('click', goBackToBrands);
    settingsButton.addEventListener('click', toggleSettingsMenu);
    document.addEventListener('click', closeSettingsMenu);
    closeModal.addEventListener('click', closeModalWindow);
    
    // Close modal when clicking outside
    resultsModal.addEventListener('click', function(e) {
        if (e.target === resultsModal) {
            closeModalWindow();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && resultsModal.style.display !== 'none') {
            closeModalWindow();
        }
    });
}

// Handle search input
function handleSearchInput(e) {
    const query = e.target.value.trim().toLowerCase();
    
    if (query.length < 2) {
        hideSearchResults();
        return;
    }
    
    // Search through device data
    const results = deviceData.filter(device => {
        const deviceModel = device.deviceModel.toLowerCase();
        const deviceBrand = device.deviceBrand.toLowerCase();
        return deviceModel.includes(query) || deviceBrand.includes(query);
    });
    
    // Get unique devices
    const uniqueDevices = [...new Map(results.map(device => [device.deviceModel, device])).values()];
    
    currentSearchResults = uniqueDevices;
    selectedDeviceIndex = -1;
    
    if (uniqueDevices.length > 0) {
        displaySearchResults(uniqueDevices);
    } else {
        showNoResults();
    }
}

// Handle search focus (replaced with device flow)
function handleSearchFocus() {
    console.log('Search focus handling replaced with device flow');
}

// Handle search keyboard navigation
function handleSearchKeydown(e) {
    if (!searchResults.style.display || searchResults.style.display === 'none') {
        return;
    }
    
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedDeviceIndex = Math.min(selectedDeviceIndex + 1, currentSearchResults.length - 1);
            updateSelectedItem();
            break;
        case 'ArrowUp':
            e.preventDefault();
            selectedDeviceIndex = Math.max(selectedDeviceIndex - 1, -1);
            updateSelectedItem();
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedDeviceIndex >= 0 && currentSearchResults[selectedDeviceIndex]) {
                selectDevice(currentSearchResults[selectedDeviceIndex]);
            }
            break;
        case 'Escape':
            hideSearchResults();
            break;
    }
}

// Display search results
function displaySearchResults(devices) {
    searchResults.innerHTML = '';
    
    devices.forEach((device, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.dataset.index = index;
        resultItem.dataset.deviceModel = device.deviceModel;
        
        const deviceIcon = getDeviceIcon(device.deviceBrand);
        const unitCount = deviceData.filter(d => d.deviceModel === device.deviceModel).length;
        
        // Accurate unit count for search results
        const unitText = unitCount === 1 ? 
            '1 unit available' : 
            `${unitCount} units available`;
        
        resultItem.innerHTML = `
            <div class="device-icon-small">
                ${deviceIcon}
            </div>
            <div class="device-info-small">
                <div class="device-name-small">${device.deviceBrand} ${device.deviceModel}</div>
                <div class="device-details-small">${unitText}</div>
            </div>
        `;
        
        // Add staggered entrance animation
        resultItem.style.opacity = '0';
        resultItem.style.transform = 'translateX(-20px)';
        searchResults.appendChild(resultItem);
        
        setTimeout(() => {
            resultItem.style.transition = 'all 0.3s ease-out';
            resultItem.style.opacity = '1';
            resultItem.style.transform = 'translateX(0)';
        }, index * 50);
    });
    
    searchResults.style.display = 'block';
}

// Show no results message
function showNoResults() {
    searchResults.innerHTML = `
        <div class="no-results">
            <i class="fas fa-search"></i>
            <p>No devices found matching your search</p>
        </div>
    `;
    searchResults.style.display = 'block';
}

// Hide search results
function hideSearchResults() {
    searchResults.style.display = 'none';
    selectedDeviceIndex = -1;
}

// Update selected item in search results
function updateSelectedItem() {
    const items = searchResults.querySelectorAll('.search-result-item');
    items.forEach((item, index) => {
        if (index === selectedDeviceIndex) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

// Select a device from device selector
function selectDevice(device) {
    // Add visual feedback for selection
    const selectedCard = document.querySelector(`[data-device-model="${device.deviceModel}"]`);
    if (selectedCard) {
        selectedCard.style.transform = 'scale(0.95)';
        selectedCard.style.opacity = '0.8';
        
        // Add selection animation
        setTimeout(() => {
            selectedCard.style.transform = '';
            selectedCard.style.opacity = '';
        }, 150);
    }
    
    // Filter data for selected device
    const deviceOptions = deviceData.filter(d => d.deviceModel === device.deviceModel);
    
    if (deviceOptions.length > 0) {
        // Add delay for smooth transition
        setTimeout(() => {
            displayDeviceInfo(deviceOptions);
        }, 200);
    } else {
        showEmptyState();
    }
}

// Animate search input when device is selected (replaced with device flow)
function animateSearchInput() {
    console.log('Search input animation replaced with device flow');
}

// Get device icon based on brand
function getDeviceIcon(brand) {
    const brandLower = brand.toLowerCase();
    
    // Debug: Log the brand to see what we're getting
    if (CONFIG.DEBUG_MODE) {
        console.log('Device brand detected:', brand, '->', brandLower);
    }
    
    // Check for specific device types first
    if (brandLower.includes('iphone') || brandLower.includes('ipad') || brandLower.includes('apple')) {
        return createBrandIcon('apple');
    }
    if (brandLower.includes('samsung')) {
        return createBrandIcon('samsung');
    }
    if (brandLower.includes('pixel')) {
        return createBrandIcon('pixel');
    }
    if (brandLower.includes('google')) {
        return createBrandIcon('google');
    }
    if (brandLower.includes('motorola')) {
        return createBrandIcon('motorola');
    }
    if (brandLower.includes('revvl')) {
        return createBrandIcon('revvl');
    }
    if (brandLower.includes('oneplus')) {
        return createBrandIcon('oneplus');
    }
    if (brandLower.includes('huawei')) {
        return createBrandIcon('huawei');
    }
    if (brandLower.includes('xiaomi')) {
        return createBrandIcon('xiaomi');
    }
    if (brandLower.includes('oppo')) {
        return createBrandIcon('oppo');
    }
    if (brandLower.includes('vivo')) {
        return createBrandIcon('vivo');
    }
    if (brandLower.includes('lg')) {
        return createBrandIcon('lg');
    }
    if (brandLower.includes('sony')) {
        return createBrandIcon('sony');
    }
    if (brandLower.includes('nokia')) {
        return createBrandIcon('nokia');
    }
    if (brandLower.includes('blackberry')) {
        return createBrandIcon('blackberry');
    }
    
    // Default to a generic mobile icon instead of Apple
    if (CONFIG.DEBUG_MODE) {
        console.log('Using default Samsung icon for brand:', brand);
    }
    return createBrandIcon('samsung'); // Default to Samsung (generic mobile icon)
}

// Create brand icon element
function createBrandIcon(brandKey) {
    const brandInfo = DEVICE_BRAND_ICONS[brandKey] || DEVICE_BRAND_ICONS['samsung'];
    
    // Use custom logo images instead of Font Awesome icons
    const logoMap = {
        'apple': 'apple-logo.png',
        'samsung': 'samsung-logo.png',
        'motorola': 'motorola-logo.png',
        'google': 'google-logo.png',
        'pixel': 'google-logo.png',
        'revvl': 'revvl-logo.png'
    };
    
    if (logoMap[brandKey]) {
        return `<img src="${logoMap[brandKey]}" alt="${brandKey}" class="brand-icon-image">`;
    }
    
    return `<i class="${brandInfo.icon}"></i>`;
}

// Get brand logo
function getBrandLogo(brand) {
    const brandLower = brand.toLowerCase();
    return BRAND_LOGOS[brandLower] || brand.substring(0, 2).toUpperCase();
}

// Display device information
function displayDeviceInfo(deviceOptions) {
    const firstOption = deviceOptions[0];
    
    // Simple modal display
    resultsModal.style.display = 'flex';
    resultsModal.style.opacity = '1';
    
    // Update device info with logo
    const deviceIconElement = createBrandIcon(firstOption.deviceBrand.toLowerCase());
    deviceName.innerHTML = `
        <span class="device-logo">${deviceIconElement}</span>
        <span class="device-name-text">${firstOption.deviceBrand} ${firstOption.deviceModel}</span>
    `;
    deviceModel.textContent = `${deviceOptions.length} unit${deviceOptions.length !== 1 ? 's' : ''} available`;
    
    // Clear and populate options
    optionsGrid.innerHTML = '';
    deviceOptions.forEach(option => {
        const optionElement = createSimpleOptionElement(option);
        optionsGrid.appendChild(optionElement);
    });
    
    // Store MDN for display
    showMdnBtn.dataset.mdn = firstOption.mdn;
    
    // Show results section
    showResults();
}

// Create simple option element
function createSimpleOptionElement(option) {
    const div = document.createElement('div');
    div.className = 'simple-option';
    
    const lastFourUPC = option.upc.slice(-4);
    const availabilityClass = option.available ? 'available' : 'unavailable';
    const availabilityText = option.available ? 'Available' : 'Unavailable';
    
    div.innerHTML = `
        <div class="option-row">
            <span class="brand-text">${option.brand}</span>
            <span class="type-text">${option.type}</span>
        </div>
        <div class="upc-row">
            <span class="upc-text">UPC: ${lastFourUPC}</span>
            <span class="status-text ${availabilityClass}">${availabilityText}</span>
        </div>
    `;
    
    return div;
}

// Toggle MDN display
function toggleMdnDisplay() {
    const mdn = showMdnBtn.dataset.mdn;
    
    if (mdnDisplay.style.display === 'none' || mdnDisplay.style.display === '') {
        // Show MDN with animation
        mdnValue.textContent = mdn;
        mdnDisplay.style.display = 'block';
        mdnDisplay.style.opacity = '0';
        mdnDisplay.style.transform = 'scale(0.8) translateY(-10px)';
        
        // Animate MDN display entrance
        requestAnimationFrame(() => {
            mdnDisplay.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            mdnDisplay.style.opacity = '1';
            mdnDisplay.style.transform = 'scale(1) translateY(0)';
        });
        
        showMdnBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide MDN';
        
        // Add button animation
        showMdnBtn.style.transform = 'scale(1.1)';
        setTimeout(() => {
            showMdnBtn.style.transform = '';
        }, 200);
    } else {
        // Hide MDN with animation
        mdnDisplay.style.transition = 'all 0.2s ease-in';
        mdnDisplay.style.opacity = '0';
        mdnDisplay.style.transform = 'scale(0.8) translateY(-10px)';
        
        setTimeout(() => {
            mdnDisplay.style.display = 'none';
        }, 200);
        
        showMdnBtn.innerHTML = '<i class="fas fa-eye"></i> Show MDN';
        
        // Add button animation
        showMdnBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            showMdnBtn.style.transform = '';
        }, 150);
    }
}

// Show results modal
function showResults() {
    emptyState.style.display = 'none';
    resultsModal.style.display = 'flex';
    
    // Reset MDN display
    mdnDisplay.style.display = 'none';
    showMdnBtn.innerHTML = '<i class="fas fa-eye"></i> Show MDN';
}

// Close modal window
function closeModalWindow() {
    resultsModal.style.display = 'none';
    // Search functionality replaced with device flow
}

// Show empty state
function showEmptyState() {
    resultsModal.style.display = 'none';
    emptyState.style.display = 'block';
}

// Add some interactive effects
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects to protection options
    document.addEventListener('mouseover', function(e) {
        if (e.target.closest('.protection-option')) {
            e.target.closest('.protection-option').style.transform = 'translateY(-2px)';
        }
    });
    
    document.addEventListener('mouseout', function(e) {
        if (e.target.closest('.protection-option')) {
            e.target.closest('.protection-option').style.transform = 'translateY(0)';
        }
    });
    
    // Add click effect to MDN button
    showMdnBtn.addEventListener('mousedown', function() {
        this.style.transform = 'translateY(0)';
    });
    
    showMdnBtn.addEventListener('mouseup', function() {
        this.style.transform = 'translateY(-2px)';
    });
});

// Add keyboard navigation support
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
        if (document.activeElement === showMdnBtn) {
            e.preventDefault();
            toggleMdnDisplay();
        }
    }
});

// Add loading animation for better UX
function showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    document.querySelector('.main-content').appendChild(loadingDiv);
}

function hideLoading() {
    const loading = document.querySelector('.loading');
    if (loading) {
        loading.remove();
    }
}

// Enhanced device selection with search functionality
function enhanceDeviceSelect() {
    // This function is no longer needed as we use the search input directly
    console.log('Search functionality is already implemented');
}

// Initialize enhanced features
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
});

// Add error handling
function handleError(error) {
    console.error('Application error:', error);
    
    // Show user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-triangle error-icon"></i>
            <h3>Application Error</h3>
            <p>Something went wrong. Please try again.</p>
            <button onclick="location.reload()" class="retry-button">
                <i class="fas fa-refresh"></i> Retry
            </button>
        </div>
    `;
    
    // Show error in main content
    document.querySelector('.main-content').appendChild(errorDiv);
}

// Add data validation
function validateDeviceData() {
    if (!deviceData || deviceData.length === 0) {
        console.log('Device data not yet loaded');
        return false;
    }
    
    return deviceData.every(device => {
        return device.mdn && 
               device.deviceBrand && 
               device.deviceModel && 
               device.brand && 
               device.type && 
               device.upc;
    });
}

// Handle refresh button click
async function handleRefresh() {
    // Clear cache to force fresh data
    localStorage.removeItem(CONFIG.CACHE_KEY);
    
    // Show loading state
    refreshButton.classList.add('loading');
        showDataStatus('Getting info from vault...', 'offline');
    
    try {
        // Reload data from Google Sheets
        await loadDataFromGoogleSheets();
        
        // Reinitialize device selector with new data
        initializeDeviceFlow();
        
        // Show success status
        showDataStatus('Data refreshed successfully', 'online');
        
        // Hide status after 3 seconds
        setTimeout(() => {
            hideDataStatus();
        }, 3000);
        
    } catch (error) {
        console.error('Error refreshing data:', error);
        showDataStatus('Failed to refresh data', 'error');
        
        // Hide status after 5 seconds
        setTimeout(() => {
            hideDataStatus();
        }, 5000);
    } finally {
        refreshButton.classList.remove('loading');
    }
}

// Data status management
function showDataStatus(message, type) {
    statusText.textContent = message;
    dataStatus.className = `data-status ${type}`;
    dataStatus.style.display = 'block';
}

function hideDataStatus() {
    dataStatus.style.display = 'none';
}

// Update data status during loading
function updateDataStatus(message, type) {
    if (dataStatus.style.display !== 'none') {
        showDataStatus(message, type);
    }
}

// Setup mobile-specific features
function setupMobileFeatures() {
    // Prevent zoom on input focus (iOS)
    if (isMobileDevice()) {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }
        
        // Mobile optimizations complete
        
        // Add swipe gestures for modal (optional)
        let startY = 0;
        let currentY = 0;
        
        resultsModal.addEventListener('touchstart', function(e) {
            startY = e.touches[0].clientY;
        });
        
        resultsModal.addEventListener('touchmove', function(e) {
            currentY = e.touches[0].clientY;
        });
        
        resultsModal.addEventListener('touchend', function(e) {
            const deltaY = currentY - startY;
            
            // Swipe down to close modal (if swiped down more than 100px)
            if (deltaY > 100) {
                closeModalWindow();
            }
        });
    }
    
    // Add haptic feedback for supported devices
    function hapticFeedback() {
        if ('vibrate' in navigator) {
            navigator.vibrate(50); // 50ms vibration
        }
    }
    
    // Add haptic feedback to buttons
    const buttons = document.querySelectorAll('button, .protection-option, .search-result-item');
    buttons.forEach(button => {
        button.addEventListener('click', hapticFeedback);
    });
    
    // Optimize for mobile performance
    if (isMobileDevice()) {
        // Reduce animation duration on mobile for better performance
        document.documentElement.style.setProperty('--animation-duration', '0.2s');
        
        // Add mobile-specific optimizations
        document.body.style.webkitTapHighlightColor = 'rgba(226, 0, 116, 0.2)';
    }
}

