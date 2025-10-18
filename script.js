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

// Device data - will be loaded from Google Sheets
let deviceData = [];

// Device brand icon mapping
const DEVICE_BRAND_ICONS = {
    'apple': {
        icon: 'fab fa-apple',
        color: '#ffffff',
        background: '#000000'
    },
    'samsung': {
        icon: 'fas fa-mobile-alt',
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
        icon: 'fas fa-mobile-alt',
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
    
    // Format date
    const dateOptions = {
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
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize clock
    updateClock();
    clockInterval = setInterval(updateClock, 1000); // Update every second
    
    // Initialize source status
    initializeSourceStatus();
    
    // Add mobile-specific classes
    if (isMobileDevice()) {
        document.body.classList.add('mobile-device');
    }
    
    if (isTouchDevice()) {
        document.body.classList.add('touch-device');
    }
    
    // Load data from Google Sheets first
    await loadDataFromGoogleSheets();
    
    // Initialize UI after data is loaded
    initializeDeviceFlow();
    setupEventListeners();
    setupMobileFeatures();
});

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Initialize search functionality
function initializeSearch() {
    // Clear search input
    deviceSearch.value = '';
    hideSearchResults();
    
    // Add some popular search suggestions
    const popularDevices = [
        'iPhone 16 Pro Max',
        'iPhone 15 Plus',
        'iPhone 14 Pro Max',
        'iPhone 13 Pro Max',
        'iPhone 12/12Pro'
    ];
    
    // You could add autocomplete suggestions here if needed
    console.log('Search initialized with', deviceData.length, 'devices');
}

// Initialize device flow
function initializeDeviceFlow() {
    // Get unique brands
    const uniqueBrands = [...new Set(deviceData.map(device => device.deviceBrand))];
    
    // Clear existing content
    brandGrid.innerHTML = '';
    
    // Create brand cards
    uniqueBrands.forEach((brand, index) => {
        const brandCard = createBrandCard(brand, index);
        brandGrid.appendChild(brandCard);
    });
    
    console.log('Device flow initialized with', uniqueBrands.length, 'brands');
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
    
    // Count protection options for this device
    const protectionCount = deviceData.filter(d => d.deviceModel === device.deviceModel).length;
    
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
            <span class="protection-count">${protectionCount} Protection${protectionCount !== 1 ? 's' : ''}</span>
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
    
    // Clear model grid
    modelGrid.innerHTML = '';
    
    // Create model cards
    uniqueModels.forEach((device, index) => {
        const modelCard = createModelCard(device, index);
        modelGrid.appendChild(modelCard);
    });
    
    // Switch to model step
    brandStep.classList.remove('active');
    modelStep.classList.add('active');
    
    console.log('Selected brand:', brand, 'with', uniqueModels.length, 'models');
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

// Handle search focus
function handleSearchFocus() {
    const query = deviceSearch.value.trim().toLowerCase();
    if (query.length >= 2) {
        handleSearchInput({ target: deviceSearch });
    }
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
        const protectionCount = deviceData.filter(d => d.deviceModel === device.deviceModel).length;
        
        // Accurate protection count for search results
        const protectionText = protectionCount === 1 ? 
            '1 protection option available' : 
            `${protectionCount} protection options available`;
        
        resultItem.innerHTML = `
            <div class="device-icon-small">
                ${deviceIcon}
            </div>
            <div class="device-info-small">
                <div class="device-name-small">${device.deviceBrand} ${device.deviceModel}</div>
                <div class="device-details-small">${protectionText}</div>
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

// Animate search input when device is selected
function animateSearchInput() {
    deviceSearch.style.transform = 'scale(1.05)';
    deviceSearch.style.boxShadow = '0 0 0 4px rgba(226, 0, 116, 0.3)';
    
    setTimeout(() => {
        deviceSearch.style.transform = '';
        deviceSearch.style.boxShadow = '';
    }, 300);
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
    
    // Add entrance animation to modal
    resultsModal.style.opacity = '0';
    resultsModal.style.transform = 'scale(0.9) translateY(20px)';
    resultsModal.style.display = 'flex';
    
    // Animate modal entrance
    requestAnimationFrame(() => {
        resultsModal.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        resultsModal.style.opacity = '1';
        resultsModal.style.transform = 'scale(1) translateY(0)';
    });
    
    // Update device header with icon
    const deviceIconElement = getDeviceIcon(firstOption.deviceBrand);
    deviceIcon.innerHTML = deviceIconElement;
    
    // Add animation to device icon
    const iconElement = deviceIcon.querySelector('i');
    if (iconElement) {
        iconElement.style.transform = 'scale(0) rotate(180deg)';
        setTimeout(() => {
            iconElement.style.transition = 'transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            iconElement.style.transform = 'scale(1) rotate(0deg)';
        }, 100);
    }
    
    deviceName.textContent = `${firstOption.deviceBrand} ${firstOption.deviceModel}`;
    
    // Accurate protection options count
    if (deviceOptions.length === 1) {
        deviceModel.textContent = `1 protection option available`;
    } else {
        deviceModel.textContent = `${deviceOptions.length} protection options available`;
    }
    
    // Clear previous options
    optionsGrid.innerHTML = '';
    
    // Display protection options with staggered animation
    deviceOptions.forEach((option, index) => {
        const optionElement = createProtectionOptionElement(option);
        
        // Add staggered entrance animation
        optionElement.style.opacity = '0';
        optionElement.style.transform = 'translateY(20px)';
        optionsGrid.appendChild(optionElement);
        
        setTimeout(() => {
            optionElement.style.transition = 'all 0.3s ease-out';
            optionElement.style.opacity = '1';
            optionElement.style.transform = 'translateY(0)';
        }, 100 + (index * 100));
    });
    
    // Store MDN for display
    showMdnBtn.dataset.mdn = firstOption.mdn;
    
    // Show results section
    showResults();
}

// Create protection option element
function createProtectionOptionElement(option) {
    const div = document.createElement('div');
    div.className = 'protection-option';
    
    // Get last 4 digits of UPC
    const lastFourUPC = option.upc.slice(-4);
    const brandLogo = getBrandLogo(option.brand);
    
    div.innerHTML = `
        <div class="option-header">
            <span class="brand-name">
                <span class="brand-logo">${brandLogo}</span>
                ${option.brand}
            </span>
            <span class="protection-type">${option.type}</span>
        </div>
        <div class="upc-display">
            <span class="upc-label">UPC (Last 4):</span>
            <span class="upc-code">${lastFourUPC}</span>
        </div>
        <div class="availability ${option.available ? 'available' : 'unavailable'}">
            <i class="fas ${option.available ? 'fa-check-circle' : 'fa-times-circle'}"></i>
            ${option.available ? 'Available' : 'Unavailable'}
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
    // Clear search input
    deviceSearch.value = '';
    hideSearchResults();
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
    
    // Add focus management for search input
    deviceSearch.addEventListener('focus', function() {
        this.style.outline = '2px solid #e20074';
        this.style.outlineOffset = '2px';
    });
    
    deviceSearch.addEventListener('blur', function() {
        this.style.outline = 'none';
    });
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
        
        // Add touch-friendly search input
        deviceSearch.addEventListener('focus', function() {
            // Scroll to top on mobile when searching
            if (window.innerWidth <= 768) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        
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

// Initialize with validation
document.addEventListener('DOMContentLoaded', function() {
    if (!validateDeviceData()) {
        handleError(new Error('Invalid device data'));
        return;
    }
    
    console.log('Protect Forever application initialized successfully');
});
