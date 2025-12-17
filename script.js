// Modern Mobile-First PWA JavaScript
class ProtectApp {
    constructor() {
        this.config = CONFIG;
        this.deviceData = [];
        this.scheduleData = []; // All schedule shifts in one array
        this.scheduleWeeks = []; // Organized by week (calculated from dates)
        this.currentPasscode = '';
        this.selectedBrand = null;
        this.selectedModel = null;
        this.inactivityTimer = null;
        this.isAuthenticated = false;
        this.currentTab = 'home';
        this.currentScheduleView = 'daily';
        this.currentWeekIndex = 0; // Index into scheduleWeeks array
        this.currentSelectedDate = new Date(); // Selected date for daily view
        
        // DOM Elements
        this.elements = {};
        
        // Device model sorting order (numbers represent release order: 1=oldest, higher=newer)
        this.deviceModelOrder = {
            'Apple': {
                'iPhone 7': 1,
                'iPhone 7 Plus': 2,
                'iPhone 8': 3,
                'iPhone 8 Plus': 4,
                'iPhone X': 5,
                'iPhone XR': 6,
                'iPhone XS': 7,
                'iPhone XS Max': 8,
                'iPhone 11': 9,
                'iPhone 11 Pro': 10,
                'iPhone 11 Pro Max': 11,
                'iPhone SE (2nd generation)': 12,
                'iPhone SE (2020)': 12,
                'iPhone SE 2nd gen': 12,
                'iPhone 12': 13,
                'iPhone 12 mini': 14,
                'iPhone 12 Pro': 15,
                'iPhone 12 Pro Max': 16,
                'iPhone 13': 17,
                'iPhone 13 mini': 18,
                'iPhone 13 Pro': 19,
                'iPhone 13 Pro Max': 20,
                'iPhone 14': 21,
                'iPhone 14 Plus': 22,
                'iPhone 14 Pro': 23,
                'iPhone 14 Pro Max': 24,
                'iPhone 15': 25,
                'iPhone 15 Plus': 26,
                'iPhone 15 Pro': 27,
                'iPhone 15 Pro Max': 28,
                'iPhone 16': 29,
                'iPhone 16 Plus': 30,
                'iPhone 16 Pro': 31,
                'iPhone 16 Pro Max': 32,
                'iPhone 16e': 33,
                'iPhone 17': 34,
                'iPhone 17 Plus': 35,
                'iPhone 17 Pro': 36,
                'iPhone 17 Pro Max': 37
            },
            'Samsung': {
                'Galaxy S21': 1,
                'Galaxy S21+': 2,
                'Galaxy S21 Ultra': 3,
                'Galaxy S22': 4,
                'Galaxy S22+': 5,
                'Galaxy S22 Ultra': 6,
                'Galaxy S23': 7,
                'Galaxy S23+': 8,
                'Galaxy S23 Ultra': 9,
                'Galaxy S24': 10,
                'Galaxy S24+': 11,
                'Galaxy S24 Ultra': 12,
                'Galaxy S25': 13,
                'Galaxy S25+': 14,
                'Galaxy S25 Ultra': 15,
                'Galaxy Note 20': 1,
                'Galaxy Note 20 Ultra': 2,
                'Galaxy Z Fold 3': 1,
                'Galaxy Z Fold 4': 2,
                'Galaxy Z Fold 5': 3,
                'Galaxy Z Flip 3': 1,
                'Galaxy Z Flip 4': 2,
                'Galaxy Z Flip 5': 3
            },
            'Google': {
                'Pixel 6': 1,
                'Pixel 6 Pro': 2,
                'Pixel 6a': 3,
                'Pixel 7': 4,
                'Pixel 7 Pro': 5,
                'Pixel 7a': 6,
                'Pixel 8': 7,
                'Pixel 8 Pro': 8,
                'Pixel 8a': 9
            },
            'Motorola': {
                'Moto G Power (2021)': 1,
                'Moto G Stylus (2021)': 2,
                'Moto G Power (2022)': 3,
                'Moto G Stylus (2022)': 4,
                'Moto G Power (2023)': 5,
                'Moto G Stylus (2023)': 6,
                'Moto G Power (2024)': 7,
                'Moto G Stylus (2024)': 8,
                'Edge 30': 1,
                'Edge 30 Pro': 2,
                'Edge 40': 3,
                'Edge 40 Pro': 4,
                'Edge 50': 5,
                'Edge 50 Pro': 6
            },
            'T-Mobile': {
                'REVVL 6': 1,
                'REVVL 6 Pro': 2,
                'REVVL 6x': 3,
                'REVVL 7': 4,
                'REVVL 7 Pro': 5,
                'REVVL 7x': 6
            }
        };
        
        // Initialize the app
        this.init();
    }
    
    // Helper method to get field value with fallback column names
    getField(item, possibleNames) {
        for (const name of possibleNames) {
            if (item[name]) return item[name];
        }
        return '';
    }
    
    // Helper method to check if MDN is verified for UPC (Availability = verified)
    isMdnVerified(entry) {
        const availableValue = this.getField(entry, ['Available', 'AVAILABLE', 'available', 'Availability', 'In Stock', 'in_stock', 'Status', 'status']);
        if (!availableValue) return false; // Default to not verified if unclear
        
        const normalized = availableValue.toString().toLowerCase().trim();
        const positiveIndicators = ['yes', 'y', 'true', '1', 'available', 'in stock', 'verified', 'verify', '✅', '✓', '✔'];
        const negativeIndicators = ['no', 'n', 'false', '0', 'unavailable', 'out of stock', 'discontinued', 'unverified', 'not verified', '❌', '✗', '×'];
        
        if (positiveIndicators.some(indicator => normalized === indicator || normalized.includes(indicator))) {
            return true; // MDN is verified
        } else if (negativeIndicators.some(indicator => normalized === indicator || normalized.includes(indicator))) {
            return false; // MDN is not verified
        }
        
        return false; // Default to not verified if unclear
    }
    
    async init() {
        try {
            this.cacheDOM();
            this.setupEventListeners();
            this.setupInactivityTimeout();
            
            // Check if this is the first time loading the app
            const isFirstLoad = !localStorage.getItem('appHasLoaded');
            
            if (isFirstLoad) {
            this.showSplashScreen();
            await new Promise(resolve => setTimeout(resolve, 3000));
            this.hideSplashScreen();
            await new Promise(resolve => setTimeout(resolve, 600));
            localStorage.setItem('appHasLoaded', 'true');
        }
        
        this.showLoading('Initializing StoreView...');
            
            localStorage.removeItem(this.config.CACHE_KEY);
            localStorage.removeItem('lastDataUpdate');
            
            await Promise.all([
                this.loadData(),
                this.loadScheduleData()
            ]);
            this.hideLoading();
            setTimeout(() => {
                this.startTimeDateDisplay();
                this.startHomeClock();
                this.showPasscodeScreen();
            }, 300);
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.hideLoading();
            this.showError('Failed to initialize app');
        }
    }
    
    cacheDOM() {
        // Splash screen
        this.elements.splashScreen = document.getElementById('splashScreen');
        
        // Passcode screen
        this.elements.passcodeScreen = document.getElementById('passcodeScreen');
        this.elements.passcodeDots = document.querySelectorAll('.dot-modern');
        this.elements.passcodeError = document.getElementById('passcodeError');
        this.elements.keypadKeys = document.querySelectorAll('.keypad-key-modern');
        
        // Main app
        this.elements.mainApp = document.getElementById('mainApp');
        this.elements.settingsMenu = document.getElementById('settingsMenu');
        this.elements.closeSettings = document.getElementById('closeSettings');
        
        // Time and date display
        this.elements.timeDateDisplay = document.getElementById('timeDateDisplay');
        this.elements.currentTime = document.getElementById('currentTime');
        this.elements.currentDate = document.getElementById('currentDate');
        
        // Bottom navigation
        this.elements.homeTabBtn = document.getElementById('homeTabBtn');
        this.elements.scheduleTabBtn = document.getElementById('scheduleTabBtn');
        this.elements.protectTabBtn = document.getElementById('protectTabBtn');
        this.elements.headerSettingsBtn = document.getElementById('headerSettingsBtn');
        
        // Tab content
        this.elements.homeTab = document.getElementById('homeTab');
        this.elements.scheduleTab = document.getElementById('scheduleTab');
        this.elements.protectTab = document.getElementById('protectTab');
        
        // Home tab elements
        this.elements.homeClock = document.getElementById('homeClock');
        this.elements.clockTime = document.getElementById('clockTime');
        this.elements.clockPeriod = document.getElementById('clockPeriod');
        this.elements.homeDate = document.getElementById('homeDate');
        
        // Schedule tab elements
        this.elements.dailyViewBtn = document.getElementById('dailyViewBtn');
        this.elements.weeklyViewBtn = document.getElementById('weeklyViewBtn');
        this.elements.dailyScheduleView = document.getElementById('dailyScheduleView');
        this.elements.weeklyScheduleView = document.getElementById('weeklyScheduleView');
        this.elements.dailyScheduleList = document.getElementById('dailyScheduleList');
        this.elements.weeklyScheduleTable = document.getElementById('weeklyScheduleTable');
        this.elements.dailyDate = document.getElementById('dailyDate');
        this.elements.weekLabel = document.getElementById('weekLabel');
        this.elements.prevWeekBtn = document.getElementById('prevWeekBtn');
        this.elements.nextWeekBtn = document.getElementById('nextWeekBtn');
        this.elements.dailyEmptyState = document.getElementById('dailyEmptyState');
        this.elements.weeklyEmptyState = document.getElementById('weeklyEmptyState');
        
        // Device flow
        this.elements.brandStep = document.getElementById('brandStep');
        this.elements.modelStep = document.getElementById('modelStep');
        this.elements.brandGrid = document.getElementById('brandGrid');
        this.elements.modelGrid = document.getElementById('modelGrid');
        this.elements.backToBrands = document.getElementById('backToBrands');
        this.elements.brandSearch = document.getElementById('brandSearch');
        this.elements.modelSearch = document.getElementById('modelSearch');
        this.elements.clearBrandSearch = document.getElementById('clearBrandSearch');
        this.elements.clearModelSearch = document.getElementById('clearModelSearch');
        this.elements.brandEmptyState = document.getElementById('brandEmptyState');
        this.elements.modelEmptyState = document.getElementById('modelEmptyState');
        
        // Store original brand and model lists for filtering
        this.allBrands = [];
        this.allModels = [];
        
        // Device modal
        this.elements.deviceModal = document.getElementById('deviceModal');
        this.elements.closeModal = document.getElementById('closeModal');
        this.elements.deviceIcon = document.getElementById('deviceIcon');
        this.elements.deviceName = document.getElementById('deviceName');
        this.elements.deviceModel = document.getElementById('deviceModel');
        this.elements.optionsList = document.getElementById('optionsList');
        this.elements.optionsCount = document.getElementById('optionsCount');
        this.elements.refreshBtn = document.getElementById('refreshBtn');
        this.elements.newSearchBtn = document.getElementById('newSearchBtn');
        
        // Settings
        this.elements.settingsNavBtn = this.elements.headerSettingsBtn; // Use header button
        this.elements.refreshDataBtn = document.getElementById('refreshDataBtn');
        this.elements.updateAppBtn = document.getElementById('updateAppBtn');
        this.elements.clearCacheBtn = document.getElementById('clearCacheBtn');
        this.elements.reloadAppBtn = document.getElementById('reloadAppBtn');
        
        // Toast and loading
        this.elements.toastContainer = document.getElementById('toastContainer');
        this.elements.loadingOverlay = document.getElementById('loadingOverlay');
    }
    
    setupEventListeners() {
        // Passcode keypad
        this.elements.keypadKeys.forEach(key => {
            key.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleKeypadInput(e.currentTarget.dataset.key, e.currentTarget);
            });
            
            key.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleKeypadInput(e.currentTarget.dataset.key, e.currentTarget);
            });
        });
        
        // Settings
        this.elements.closeSettings.addEventListener('click', () => this.closeSettings());
        
        // Bottom navigation - Tab switching
        this.elements.homeTabBtn.addEventListener('click', () => this.switchTab('home'));
        this.elements.scheduleTabBtn.addEventListener('click', () => this.switchTab('schedule'));
        this.elements.protectTabBtn.addEventListener('click', () => this.switchTab('protect'));
        
        // Header settings button
        if (this.elements.headerSettingsBtn) {
            this.elements.headerSettingsBtn.addEventListener('click', () => this.toggleSettings());
        }
        
        // Schedule view toggles
        if (this.elements.dailyViewBtn) {
            this.elements.dailyViewBtn.addEventListener('click', () => this.switchScheduleView('daily'));
        }
        if (this.elements.weeklyViewBtn) {
            this.elements.weeklyViewBtn.addEventListener('click', () => this.switchScheduleView('weekly'));
        }
        
        // Week/Day navigation
        if (this.elements.prevWeekBtn) {
            this.elements.prevWeekBtn.addEventListener('click', () => {
                if (this.currentScheduleView === 'daily') {
                    this.changeDay(-1);
                } else {
                    this.changeWeek(-1);
                }
            });
        }
        if (this.elements.nextWeekBtn) {
            this.elements.nextWeekBtn.addEventListener('click', () => {
                if (this.currentScheduleView === 'daily') {
                    this.changeDay(1);
                } else {
                    this.changeWeek(1);
                }
            });
        }
        
        // Settings options
        this.elements.refreshDataBtn.addEventListener('click', () => this.refreshData());
        this.elements.updateAppBtn.addEventListener('click', () => this.updateApp());
        this.elements.clearCacheBtn.addEventListener('click', () => this.clearCache());
        this.elements.reloadAppBtn.addEventListener('click', () => this.reloadApp());
        
        // Device flow
        this.elements.backToBrands.addEventListener('click', () => this.showBrandStep());
        
        // Search functionality
        this.elements.brandSearch.addEventListener('input', (e) => this.filterBrands(e.target.value));
        this.elements.modelSearch.addEventListener('input', (e) => this.filterModels(e.target.value));
        this.elements.clearBrandSearch.addEventListener('click', () => {
            this.elements.brandSearch.value = '';
            this.filterBrands('');
        });
        this.elements.clearModelSearch.addEventListener('click', () => {
            this.elements.modelSearch.value = '';
            this.filterModels('');
        });
        
        // Keyboard navigation
        this.setupKeyboardNavigation();
        
        // Device modal
        this.elements.closeModal.addEventListener('click', () => this.closeDeviceModal());
        this.elements.refreshBtn.addEventListener('click', () => this.refreshDeviceData());
        this.elements.newSearchBtn.addEventListener('click', () => this.startNewSearch());
        
        // Modal backdrop
        this.elements.deviceModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeDeviceModal();
            }
        });
        
        // Settings backdrop
        this.elements.settingsMenu.addEventListener('click', (e) => {
            if (e.target.classList.contains('settings-menu')) {
                this.closeSettings();
            }
        });
        
        // Touch gestures for mobile
        this.setupTouchGestures();
    }
    
    setupTouchGestures() {
        let startY = 0;
        let startX = 0;
        
        document.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startX = e.touches[0].clientX;
        });
        
        document.addEventListener('touchend', (e) => {
            const endY = e.changedTouches[0].clientY;
            const endX = e.changedTouches[0].clientX;
            const diffY = startY - endY;
            const diffX = startX - endX;
            
            // Swipe down to close modals
            if (Math.abs(diffY) > Math.abs(diffX) && diffY < -50) {
                if (this.elements.deviceModal.classList.contains('show')) {
                    this.closeDeviceModal();
                }
                if (this.elements.settingsMenu.classList.contains('show')) {
                    this.closeSettings();
                }
            }
        });
    }
    
    setupInactivityTimeout() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        const resetTimer = () => {
            clearTimeout(this.inactivityTimer);
            
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            
            this.timerStartTime = Date.now();
            this.updateTimerDisplay();
            
            // Start the inactivity timer
            this.inactivityTimer = setTimeout(() => {
                this.lockApp();
            }, this.config.INACTIVITY_TIMEOUT);
            
            // Start real-time countdown display only if authenticated
            if (this.isAuthenticated) {
                this.startTimerCountdown();
            }
        };
        
        events.forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });
        
        resetTimer();
    }
    
    startTimerCountdown() {
        // Clear any existing interval first
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        this.timerInterval = setInterval(() => {
            this.updateTimerDisplay();
        }, 500); // Update every 500ms for better performance
    }
    
    updateTimerDisplay() {
        if (!this.elements.timerNavLabel) return;
        
        const remainingTime = this.getRemainingTime();
        const seconds = Math.floor(remainingTime / 1000);
        
        // Display as SS format (e.g., 20, 19, 18...)
        this.elements.timerNavLabel.textContent = `${seconds.toString().padStart(2, '0')}`;
        
        // Update timer button styling based on remaining time
        const timerBtn = this.elements.timerNavBtn;
        timerBtn.classList.remove('warning', 'critical');
        
        if (remainingTime <= 5000) { // 5 seconds or less
            timerBtn.classList.add('critical');
        } else if (remainingTime <= 10000) { // 10 seconds or less
            timerBtn.classList.add('warning');
        }
    }
    
    getRemainingTime() {
        if (!this.timerStartTime) return this.config.INACTIVITY_TIMEOUT;
        
        const now = Date.now();
        const elapsed = now - this.timerStartTime;
        const remaining = this.config.INACTIVITY_TIMEOUT - elapsed;
        
        return Math.max(0, remaining);
    }
    
    async loadData() {
        try {
            if (this.config.DEBUG_MODE) console.log('Starting data load...');
            this.showLoading('Loading device data...');
            
            const cachedData = this.getCachedData();
            
            if (cachedData && this.isCacheValid()) {
                this.deviceData = cachedData;
                this.hideLoading();
                return;
            }
            
            await this.loadFromGoogleSheets();
            this.hideLoading();
        } catch (error) {
            console.error('Failed to load data:', error);
            this.hideLoading();
            this.deviceData = this.getCachedData() || this.getFallbackData();
            this.showToast('Using offline data', 'warning');
        }
    }
    
    async loadFromGoogleSheets() {
        try {
            let response;
            try {
                response = await fetch(this.config.GOOGLE_SHEETS_URL);
            } catch (directError) {
                if (this.config.DEBUG_MODE) console.log('Direct fetch failed, trying CORS proxies...');
                
                for (const proxy of this.config.CORS_PROXIES) {
                    try {
                        response = await fetch(proxy + encodeURIComponent(this.config.GOOGLE_SHEETS_URL));
                        if (response && response.ok) break;
                    } catch (proxyError) {
                        if (this.config.DEBUG_MODE) console.log('Proxy failed:', proxy);
                        continue;
                    }
                }
            }
            
            if (!response || !response.ok) {
                throw new Error(`HTTP error! status: ${response ? response.status : 'No response'}`);
            }
            
            const csvText = await response.text();
            this.deviceData = this.parseCSVData(csvText);
            this.cacheData(this.deviceData);
        } catch (error) {
            console.error('Failed to load from Google Sheets:', error);
            throw error;
        }
    }
    
    parseCSVData(csvText) {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length === 0) {
            console.error('No data in CSV');
            return [];
        }
        
        const headers = this.parseCSVLine(lines[0]);
        const parsedData = lines.slice(1).map((line) => {
            const values = this.parseCSVLine(line);
            const device = {};
            
            headers.forEach((header, colIndex) => {
                device[header] = (values[colIndex] || '').trim();
            });
            
            return device;
        }).filter(row => Object.values(row).some(val => val && val.trim()));
        
        if (this.config.DEBUG_MODE) {
            console.log('Parsed CSV:', parsedData.length, 'rows, columns:', headers);
            if (parsedData.length > 0) console.log('Sample row:', parsedData[0]);
        }
        
        return parsedData;
    }
    
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let insideQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }
    
    getCachedData() {
        try {
            const cached = localStorage.getItem(this.config.CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Failed to parse cached data:', error);
            return null;
        }
    }

    cacheData(data) {
        try {
            localStorage.setItem(this.config.CACHE_KEY, JSON.stringify(data));
            localStorage.setItem('lastDataUpdate', Date.now().toString());
    } catch (error) {
            console.error('Failed to cache data:', error);
        }
    }
    
    isCacheValid() {
        try {
            const lastUpdate = localStorage.getItem('lastDataUpdate');
            if (!lastUpdate) return false;
            
            const cacheAge = Date.now() - parseInt(lastUpdate);
            return cacheAge < this.config.CACHE_DURATION;
        } catch (error) {
            return false;
        }
    }
    
    getFallbackData() {
        return [
            {
                Brand: 'Samsung',
                Model: 'Galaxy S24',
                UPC: '123456789012',
                MDN: '5551234567',
                Protection: 'Premium Protection',
                Available: 'Yes'
            },
            {
                Brand: 'Apple',
                Model: 'iPhone 15',
                UPC: '234567890123',
                MDN: '5552345678',
                Protection: 'AppleCare+',
                Available: 'Yes'
            }
        ];
    }
    
    // ========== SCHEDULE DATA LOADING ==========
    
    async loadScheduleData() {
        try {
            if (this.config.DEBUG_MODE) console.log('Starting schedule data load...');
            
            // Clear old cache format to avoid conflicts
            const cachedData = this.getCachedScheduleData();
            
            if (cachedData && this.isScheduleCacheValid()) {
                // Handle both old format (object) and new format (array)
                if (Array.isArray(cachedData)) {
                    this.scheduleData = cachedData;
                } else if (cachedData && typeof cachedData === 'object' && (cachedData.currentWeek || cachedData.nextWeek || cachedData.weekAfterNext)) {
                    // Old format - convert to array and clear cache
                    this.scheduleData = [
                        ...(cachedData.currentWeek || []),
                        ...(cachedData.nextWeek || []),
                        ...(cachedData.weekAfterNext || [])
                    ];
                    // Clear old cache format
                    localStorage.removeItem(this.config.SCHEDULE_CACHE_KEY);
                } else {
                    this.scheduleData = [];
                }
                
                if (Array.isArray(this.scheduleData) && this.scheduleData.length > 0) {
                    this.organizeScheduleByWeeks();
                    if (this.config.DEBUG_MODE) console.log('Using cached schedule data');
                    return;
                }
            }
            
            // Load fresh data
            await this.loadScheduleFromGoogleSheets();
            this.organizeScheduleByWeeks();
        } catch (error) {
            console.error('Failed to load schedule data:', error);
            this.scheduleData = [];
            this.scheduleWeeks = [];
            this.showToast('Using offline schedule data', 'warning');
        }
    }
    
    async loadScheduleFromGoogleSheets() {
        try {
            // Remove any gid parameter from URL (we load single sheet now)
            let url = this.config.SCHEDULE_SHEETS_URL;
            url = url.split('&gid=')[0].split('?gid=')[0];
            if (!url.includes('?')) {
                url += '?format=csv';
            } else if (!url.includes('format=csv')) {
                url += '&format=csv';
            }
            
            let response = null;
            let csvText = null;
            
            // Try direct fetch first
            try {
                response = await fetch(url);
                if (response && response.ok) {
                    csvText = await response.text();
                    // Check if we got actual CSV data (not an error page)
                    if (csvText && csvText.length > 0 && !csvText.includes('<html') && !csvText.includes('<!DOCTYPE')) {
                        if (this.config.DEBUG_MODE) {
                            console.log('Successfully loaded schedule sheet directly');
                        }
                    } else {
                        csvText = null;
                    }
                }
            } catch (directError) {
                if (this.config.DEBUG_MODE) console.log('Direct fetch failed, trying CORS proxies...');
            }
            
            // Try CORS proxies if direct fetch failed
            if (!csvText) {
                for (const proxy of this.config.CORS_PROXIES) {
                    try {
                        const proxyUrl = proxy + encodeURIComponent(url);
                        response = await fetch(proxyUrl);
                        if (response && response.ok) {
                            csvText = await response.text();
                            // Check if we got actual CSV data (not an error page)
                            if (csvText && csvText.length > 0 && !csvText.includes('<html') && !csvText.includes('<!DOCTYPE')) {
                                if (this.config.DEBUG_MODE) {
                                    console.log(`Successfully loaded schedule sheet using proxy: ${proxy.substring(0, 30)}...`);
                                }
                                break;
                            } else {
                                csvText = null;
                            }
                        }
                    } catch (proxyError) {
                        if (this.config.DEBUG_MODE) console.log(`Proxy ${proxy} failed`);
                        continue;
                    }
                }
            }
            
            if (!csvText) {
                throw new Error('Failed to load schedule data from all sources');
            }
            
            // Parse the single CSV - get all schedule data
            this.scheduleData = this.parseScheduleCSV(csvText);
            
            this.cacheScheduleData(this.scheduleData);
            
            if (this.config.DEBUG_MODE) {
                console.log('Schedule data loaded:', this.scheduleData.length, 'shifts');
            }
            
            // Show warning if no schedule data was loaded
            if (this.scheduleData.length === 0) {
                this.showToast('Schedule data could not be parsed. Check console for details.', 'warning');
            }
        } catch (error) {
            console.error('Failed to load from Google Sheets:', error);
            // Don't throw - allow app to continue with empty schedule data
            this.showToast('Schedule data loading failed. Using cached data if available.', 'warning');
        }
    }
    
    organizeScheduleByWeeks() {
        // Ensure scheduleData is an array
        if (!Array.isArray(this.scheduleData)) {
            console.error('scheduleData is not an array:', this.scheduleData);
            this.scheduleData = [];
            this.scheduleWeeks = [];
            return;
        }
        
        // Group all shifts by week (Thursday to Wednesday)
        const weekMap = new Map();
        
        this.scheduleData.forEach(shift => {
            const date = new Date(shift.date);
            // Get the Thursday of the week (week starts on Thursday)
            // Day 0 = Sunday, Day 4 = Thursday
            const dayOfWeek = date.getDay();
            const daysFromThursday = dayOfWeek >= 4 ? dayOfWeek - 4 : dayOfWeek + 3;
            const thursday = new Date(date);
            thursday.setDate(date.getDate() - daysFromThursday);
            thursday.setHours(0, 0, 0, 0);
            
            const weekKey = thursday.getTime();
            if (!weekMap.has(weekKey)) {
                weekMap.set(weekKey, {
                    startDate: new Date(thursday),
                    shifts: []
                });
            }
            weekMap.get(weekKey).shifts.push(shift);
        });
        
        // Convert to array and sort by date
        this.scheduleWeeks = Array.from(weekMap.values())
            .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
            .map((week, index) => ({
                ...week,
                index,
                label: this.getWeekLabel(week.startDate)
            }));
        
        // Set current week to the one containing today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayOfWeek = today.getDay();
        const daysFromThursday = dayOfWeek >= 4 ? dayOfWeek - 4 : dayOfWeek + 3;
        const todayThursday = new Date(today);
        todayThursday.setDate(today.getDate() - daysFromThursday);
        todayThursday.setHours(0, 0, 0, 0);
        
        const currentWeekIndex = this.scheduleWeeks.findIndex(week => 
            week.startDate.getTime() === todayThursday.getTime()
        );
        
        this.currentWeekIndex = currentWeekIndex >= 0 ? currentWeekIndex : 0;
        
        if (this.config.DEBUG_MODE) {
            console.log('Organized schedule into', this.scheduleWeeks.length, 'weeks (Thu-Wed)');
            this.scheduleWeeks.forEach((week, i) => {
                const endDate = new Date(week.startDate);
                endDate.setDate(week.startDate.getDate() + 6);
                console.log(`Week ${i}: ${week.startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()} (${week.shifts.length} shifts)`);
            });
        }
    }
    
    getWeekLabel(startDate) {
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // Thursday + 6 days = Wednesday
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Check if this week contains today (Thursday to Wednesday)
        if (startDate.getTime() <= today.getTime() && today.getTime() <= endDate.getTime()) {
            return 'This Week';
        }
        
        // Check if it's next week (next Thursday)
        const dayOfWeek = today.getDay();
        const daysFromThursday = dayOfWeek >= 4 ? dayOfWeek - 4 : dayOfWeek + 3;
        const nextWeekStart = new Date(today);
        nextWeekStart.setDate(today.getDate() + (7 - daysFromThursday));
        nextWeekStart.setHours(0, 0, 0, 0);
        
        if (startDate.getTime() === nextWeekStart.getTime()) {
            return 'Next Week';
        }
        
        // Otherwise show date range (Thu - Wed)
        const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${startStr} - ${endStr}`;
    }
    
    parseScheduleCSV(csvText) {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length < 3) {
            console.error('Invalid schedule CSV format');
            return [];
        }
        
        const parsedData = [];
        
        // Parse header row (day names)
        const headerLine = this.parseCSVLine(lines[0]);
        const dayHeaders = headerLine.slice(1); // Skip "Employee" column
        
        // Parse date row (skip first cell which is empty or label)
        const dateLine = this.parseCSVLine(lines[1]);
        const dates = dateLine.length > 1 ? dateLine.slice(1) : dateLine; // Skip first cell if present
        
        // Parse employee rows (every 2 rows: name + end times)
        for (let i = 2; i < lines.length; i += 2) {
            const nameLine = this.parseCSVLine(lines[i]);
            const employeeName = nameLine[0]?.trim();
            
            if (!employeeName) continue; // Skip empty rows
            
            // Get end times from next line if it exists
            const endTimeLine = i + 1 < lines.length ? this.parseCSVLine(lines[i + 1]) : [];
            
            // Process each day
            dayHeaders.forEach((dayHeader, dayIndex) => {
                const startTime = nameLine[dayIndex + 1]?.trim();
                const endTime = endTimeLine[dayIndex + 1]?.trim();
                const dateStr = dates[dayIndex]?.trim();
                
                if (startTime && endTime && dateStr) {
                    try {
                        // Parse date (MM/DD format)
                        const dateParts = dateStr.split('/');
                        if (dateParts.length === 2) {
                            const month = parseInt(dateParts[0], 10);
                            const day = parseInt(dateParts[1], 10);
                            const currentYear = new Date().getFullYear();
                            const scheduleDate = new Date(currentYear, month - 1, day);
                            
                            // Validate date
                            if (!isNaN(scheduleDate.getTime())) {
                                parsedData.push({
                                    employee: employeeName,
                                    date: scheduleDate,
                                    dateStr: dateStr,
                                    day: dayHeader,
                                    startTime: startTime,
                                    endTime: endTime,
                                    timeRange: `${startTime} - ${endTime}`
                                });
                            }
                        }
                    } catch (error) {
                        if (this.config.DEBUG_MODE) {
                            console.warn(`Failed to parse date ${dateStr} for ${employeeName}:`, error);
                        }
                    }
                }
            });
        }
        
        return parsedData;
    }
    
    getCachedScheduleData() {
        try {
            const cached = localStorage.getItem(this.config.SCHEDULE_CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Failed to parse cached schedule data:', error);
            return null;
        }
    }
    
    cacheScheduleData(data) {
        try {
            localStorage.setItem(this.config.SCHEDULE_CACHE_KEY, JSON.stringify(data));
            localStorage.setItem('lastScheduleUpdate', Date.now().toString());
        } catch (error) {
            console.error('Failed to cache schedule data:', error);
        }
    }
    
    parseScheduleCSV(csvText) {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length < 3) {
            console.error('Invalid schedule CSV format');
            return [];
        }
        
        const parsedData = [];
        let currentTableStart = -1;
        
        // Find all schedule tables in the CSV
        for (let i = 0; i < lines.length; i++) {
            const parsedLine = this.parseCSVLine(lines[i]);
            const firstCell = parsedLine[0]?.trim().toLowerCase();
            
            // Check if this is a table header row (starts with "Employee")
            if (firstCell === 'employee') {
                const headerLine = parsedLine;
                const dayHeaders = headerLine.slice(1); // Skip "Employee" column
                
                // Get date row (next line)
                if (i + 1 < lines.length) {
                    const dateLine = this.parseCSVLine(lines[i + 1]);
                    const dates = dateLine.length > 1 ? dateLine.slice(1) : dateLine;
                    
                    // Parse employee rows (every 2 rows: name + end times)
                    for (let j = i + 2; j < lines.length; j += 2) {
                        const nameLine = this.parseCSVLine(lines[j]);
                        const employeeName = nameLine[0]?.trim();
                        
                        // Check if we've hit the next table (empty row, new header, or week label)
                        if (!employeeName || employeeName.toLowerCase().startsWith('week') || employeeName.toLowerCase() === 'employee') {
                            break;
                        }
                        
                        // Get end times from next line if it exists
                        const endTimeLine = j + 1 < lines.length ? this.parseCSVLine(lines[j + 1]) : [];
                        
                        // Check if end time line is actually employee data or next table
                        if (endTimeLine[0] && endTimeLine[0].trim() && 
                            !endTimeLine[0].trim().match(/^\d{1,2}:\d{2}\s*(AM|PM)$/i) &&
                            endTimeLine[0].trim().toLowerCase() !== 'employee') {
                            // This might be the next employee or table, skip
                            j -= 1; // Adjust to process this line as employee name
                            continue;
                        }
                        
                        // Process each day
                        dayHeaders.forEach((dayHeader, dayIndex) => {
                            const startTime = nameLine[dayIndex + 1]?.trim();
                            const endTime = endTimeLine[dayIndex + 1]?.trim();
                            const dateStr = dates[dayIndex]?.trim();
                            
                            if (startTime && endTime && dateStr) {
                                try {
                                    // Parse date (MM/DD format)
                                    const dateParts = dateStr.split('/');
                                    if (dateParts.length === 2) {
                                        const month = parseInt(dateParts[0], 10);
                                        const day = parseInt(dateParts[1], 10);
                                        const currentYear = new Date().getFullYear();
                                        const scheduleDate = new Date(currentYear, month - 1, day);
                                        
                                        // Validate date
                                        if (!isNaN(scheduleDate.getTime())) {
                                            parsedData.push({
                                                employee: employeeName,
                                                date: scheduleDate,
                                                dateStr: dateStr,
                                                day: dayHeader,
                                                startTime: startTime,
                                                endTime: endTime,
                                                timeRange: `${startTime} - ${endTime}`
                                            });
                                        }
                                    }
                                } catch (error) {
                                    if (this.config.DEBUG_MODE) {
                                        console.warn(`Failed to parse date ${dateStr} for ${employeeName}:`, error);
                                    }
                                }
                            }
                        });
                    }
                }
            }
        }
        
        return parsedData;
    }
    
    isScheduleCacheValid() {
        try {
            const lastUpdate = localStorage.getItem('lastScheduleUpdate');
            if (!lastUpdate) return false;
            
            const cacheAge = Date.now() - parseInt(lastUpdate);
            return cacheAge < this.config.SCHEDULE_CACHE_DURATION;
        } catch (error) {
            return false;
        }
    }
    
    getScheduleForWeek(weekIndex) {
        if (weekIndex >= 0 && weekIndex < this.scheduleWeeks.length) {
            return this.scheduleWeeks[weekIndex].shifts || [];
        }
        return [];
    }
    
    getScheduleForDate(date) {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        
        return this.scheduleData.filter(shift => {
            const shiftDate = new Date(shift.date);
            shiftDate.setHours(0, 0, 0, 0);
            return shiftDate.getTime() === targetDate.getTime();
        });
    }
    
    showSplashScreen() {
        if (this.elements.splashScreen) {
            this.elements.splashScreen.style.display = 'flex';
            this.elements.splashScreen.classList.add('show');
            this.elements.splashScreen.classList.remove('hide');
        }
    }
    
    hideSplashScreen() {
        if (this.elements.splashScreen) {
            this.elements.splashScreen.classList.remove('show');
            this.elements.splashScreen.classList.add('hide');
            
            // Hide splash screen after animation completes
            setTimeout(() => {
                this.elements.splashScreen.style.display = 'none';
                this.elements.splashScreen.classList.remove('hide');
            }, 600);
        }
    }
    
    showPasscodeScreen() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        this.elements.passcodeScreen.style.display = 'flex';
        this.elements.mainApp.style.display = 'none';
        this.isAuthenticated = false;
        
        setTimeout(() => this.elements.passcodeScreen.classList.add('show'), 50);
    }
    
    showMainApp() {
        this.elements.passcodeScreen.classList.remove('show');
        this.elements.passcodeScreen.classList.add('hide');
        
        setTimeout(() => {
            this.elements.passcodeScreen.style.display = 'none';
            this.elements.passcodeScreen.classList.remove('hide');
            this.elements.mainApp.style.display = 'block';
            this.elements.mainApp.classList.add('authenticated');
            this.isAuthenticated = true;
            this.startTimeDateDisplay();
            this.startHomeClock();
            // Show Home tab by default
            this.switchTab('home');
        }, 400);
    }
    
    startTimeDateDisplay() {
        this.updateTimeDate();
        this.timeDateInterval = setInterval(() => this.updateTimeDate(), 1000);
    }
    
    updateTimeDate() {
        if (!this.elements.currentTime || !this.elements.currentDate) return;
        
        const now = new Date();
        this.elements.currentTime.textContent = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        this.elements.currentDate.textContent = now.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    handleKeypadInput(key, keyElement) {
        if (keyElement) {
            keyElement.classList.add('pressed');
            setTimeout(() => keyElement.classList.remove('pressed'), 100);
        }
        
        if (key === 'clear') {
            this.currentPasscode = '';
            this.updatePasscodeDisplay();
        } else if (key === 'enter') {
            this.verifyPasscode();
        } else if (this.currentPasscode.length < 4) {
            this.currentPasscode += key;
            this.updatePasscodeDisplay();
        }
    }
    
    updatePasscodeDisplay() {
        this.elements.passcodeDots.forEach((dot, index) => {
            if (index < this.currentPasscode.length) {
            dot.classList.add('filled');
        } else {
            dot.classList.remove('filled');
        }
    });
        
        this.hidePasscodeError();
    }
    
    verifyPasscode() {
        if (this.currentPasscode === this.config.PASSCODE) {
            this.showMainApp();
    } else {
            this.showPasscodeError();
            this.currentPasscode = '';
            this.updatePasscodeDisplay();
        }
    }
    
    showPasscodeError() {
        if (this.elements.passcodeError) {
            this.elements.passcodeError.classList.add('show');
            setTimeout(() => {
                this.hidePasscodeError();
            }, 2000);
        }
    }
    
    hidePasscodeError() {
        this.elements.passcodeError.classList.remove('show');
    }
    
    lockApp() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        this.showPasscodeScreen();
        this.currentPasscode = '';
        this.updatePasscodeDisplay();
    }
    
    initializeDeviceFlow() {
        if (this.config.DEBUG_MODE) {
            console.log('Initializing device flow, data length:', this.deviceData.length);
        }
        this.populateBrands();
        this.showBrandStep();
    }
    
    populateBrands() {
        const getBrand = (device) => this.getField(device, ['Device Brand', 'Brand', 'DeviceBrand', 'BRAND', 'brand']);
        const brands = [...new Set(this.deviceData.map(getBrand))].filter(Boolean);
        
        if (this.config.DEBUG_MODE && this.deviceData.length > 0) {
            console.log('Available columns:', Object.keys(this.deviceData[0]));
            console.log('Extracted brands:', brands);
        }
        
        this.allBrands = brands.length === 0 ? ['Samsung', 'Apple', 'Google', 'OnePlus'] : brands;
        this.filterBrands(this.elements.brandSearch?.value || '');
    }
    
    filterBrands(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const filtered = term === '' 
            ? this.allBrands 
            : this.allBrands.filter(brand => brand.toLowerCase().includes(term));
        
        this.elements.brandGrid.innerHTML = '';
        
        if (filtered.length === 0) {
            this.elements.brandEmptyState.style.display = 'block';
            this.elements.brandGrid.style.display = 'none';
        } else {
            this.elements.brandEmptyState.style.display = 'none';
            this.elements.brandGrid.style.display = 'grid';
            filtered.forEach(brand => {
                this.elements.brandGrid.appendChild(this.createBrandCard(brand));
            });
        }
        
        // Show/hide clear button
        this.elements.clearBrandSearch.style.display = term ? 'flex' : 'none';
    }
    
    showFallbackBrands() {
        ['Samsung', 'Apple', 'Google', 'OnePlus'].forEach(brand => {
            this.elements.brandGrid.appendChild(this.createBrandCard(brand));
        });
    }
    
    createBrandCard(brand) {
        const card = document.createElement('div');
        card.className = 'brand-card';
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Select ${brand} brand`);
        const logoPath = this.getBrandLogo(brand);
        
        card.innerHTML = `
            <div class="brand-icon">
                <img src="${logoPath}" alt="${brand}" class="brand-logo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="brand-logo-fallback" style="display: none;"><i class="fas fa-mobile-alt"></i></div>
            </div>
            <div class="brand-name">${brand}</div>
        `;
        
        card.addEventListener('click', () => this.selectBrand(brand));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.selectBrand(brand);
            }
        });
        return card;
    }

    getBrandLogo(brand) {
        const logoMap = {
            'Apple': 'apple-logo.png',
            'Samsung': 'samsung-logo.png',
            'Google': 'google-logo.png',
            'Motorola': 'motorola-logo.png',
            'T-Mobile': 'tmobile-logo.png',
            'Revvl': 'revvl-logo.png'
        };
        
        return logoMap[brand] || 'app-icon.png';
    }

    selectBrand(brand) {
        this.selectedBrand = brand;
        this.populateModels(brand);
        this.showModelStep();
        
        const brandCards = document.querySelectorAll('.brand-card');
        brandCards.forEach(card => {
            if (card.querySelector('.brand-name').textContent === brand) {
                card.style.transform = 'scale(0.95)';
                setTimeout(() => card.style.transform = '', 150);
            }
        });
    }
    
    getModelSortOrder(brand, model) {
        // Normalize model name for matching (trim and normalize spacing)
        const normalizedModel = model.trim().replace(/\s+/g, ' ');
        
        // Check explicit order first with exact match
        if (this.deviceModelOrder[brand] && this.deviceModelOrder[brand][normalizedModel]) {
            return this.deviceModelOrder[brand][normalizedModel];
        }
        
        // Check with case-insensitive match
        if (this.deviceModelOrder[brand]) {
            const lowerModel = normalizedModel.toLowerCase();
            for (const [key, value] of Object.entries(this.deviceModelOrder[brand])) {
                if (key.toLowerCase() === lowerModel) {
                    return value;
                }
            }
        }
        
        // For iPhone models, extract the number (e.g., iPhone 17 -> 17)
        if (brand === 'Apple' && model.toLowerCase().includes('iphone')) {
            const iphoneMatch = model.match(/iphone\s*(\d+)/i);
            if (iphoneMatch) {
                const num = parseInt(iphoneMatch[1]);
                // Give higher priority for newer models (multiply by 100 to ensure they sort after known models)
                // Then use variant suffix for sub-ordering
                let baseOrder = num * 100;
                if (model.toLowerCase().includes('pro max')) baseOrder += 3;
                else if (model.toLowerCase().includes('pro')) baseOrder += 2;
                else if (model.toLowerCase().includes('plus')) baseOrder += 1;
                else if (model.toLowerCase().includes('mini')) baseOrder -= 1;
                return baseOrder;
            }
        }
        
        // For Samsung Galaxy S models, extract the number (e.g., Galaxy S25 -> 25)
        if (brand === 'Samsung' && model.toLowerCase().includes('galaxy s')) {
            const galaxyMatch = model.match(/galaxy\s*s(\d+)/i);
            if (galaxyMatch) {
                const num = parseInt(galaxyMatch[1]);
                let baseOrder = num * 100;
                if (model.toLowerCase().includes('ultra')) baseOrder += 2;
                else if (model.toLowerCase().includes('+') || model.toLowerCase().includes('plus')) baseOrder += 1;
                return baseOrder;
            }
        }
        
        // For other models, try to extract year or number
        const yearMatch = model.match(/(\d{4})/);
        if (yearMatch) return parseInt(yearMatch[1]);
        
        const numberMatch = model.match(/(\d+)/);
        if (numberMatch) return parseInt(numberMatch[1]);
        
        // Default to very low priority for unknown devices
        return 0;
    }
    
    populateModels(brand) {
        const getBrand = (d) => this.getField(d, ['Device Brand', 'Brand', 'DeviceBrand', 'BRAND', 'brand']);
        const getModel = (d) => this.getField(d, ['Device Model', 'Model', 'DeviceModel', 'MODEL', 'model']);
        
        // Get all devices for this brand
        const brandDevices = this.deviceData.filter(d => getBrand(d) === brand);
        
        // Filter to only include models that have:
        // 1. A UPC code
        // 2. At least one verified MDN
        const modelsWithUpcAndVerifiedMdns = new Set();
        
        brandDevices.forEach(device => {
            const model = getModel(device);
            if (model) {
                // Check if this device entry has a UPC
                const hasUpc = this.getField(device, ['UPC', 'UPC Code', 'upc', 'UPCCode', 'UPC_CODE', 'BARCODE']);
                
                // Check if this device entry has a verified MDN
                const hasMdn = this.getField(device, ['MDN', 'mdn', 'MDN Number', 'mdn_number', 'phone']);
                const isVerified = hasMdn && this.isMdnVerified(device);
                
                // Only include models that have UPC AND verified MDN
                if (hasUpc && isVerified) {
                    modelsWithUpcAndVerifiedMdns.add(model);
                }
            }
        });
        
        // Only show models that have both UPC and verified MDN
        const models = Array.from(modelsWithUpcAndVerifiedMdns);
        
        const sortedModels = models.sort((a, b) => {
            return this.getModelSortOrder(brand, b) - this.getModelSortOrder(brand, a);
        });
        
        this.allModels = sortedModels;
        this.filterModels(this.elements.modelSearch?.value || '');
    }
    
    filterModels(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const filtered = term === '' 
            ? this.allModels 
            : this.allModels.filter(model => model.toLowerCase().includes(term));
        
        this.elements.modelGrid.innerHTML = '';
        
        if (filtered.length === 0) {
            this.elements.modelEmptyState.style.display = 'block';
            this.elements.modelGrid.style.display = 'none';
        } else {
            this.elements.modelEmptyState.style.display = 'none';
            this.elements.modelGrid.style.display = 'grid';
            filtered.forEach(model => {
                this.elements.modelGrid.appendChild(this.createModelCard(model, this.selectedBrand));
            });
        }
        
        // Show/hide clear button
        this.elements.clearModelSearch.style.display = term ? 'flex' : 'none';
    }
    
    createModelCard(model, brand) {
        const getBrand = (d) => this.getField(d, ['Device Brand', 'Brand', 'DeviceBrand', 'BRAND', 'brand']);
        const getModel = (d) => this.getField(d, ['Device Model', 'Model', 'DeviceModel', 'MODEL', 'model']);
        
        const device = this.deviceData.find(d => 
            getBrand(d) === brand && getModel(d) === model
        );
        
        let isAvailable = true;
        
        if (device) {
            const getAvailable = (d) => this.getField(d, ['Available', 'AVAILABLE', 'available', 'Availability', 'In Stock', 'in_stock', 'Status', 'status']);
            const availableValue = getAvailable(device);
            
            if (availableValue) {
                const normalizedValue = availableValue.toString().toLowerCase().trim();
                
                // Explicitly check for positive values
                const positiveIndicators = ['yes', 'y', 'true', '1', 'available', 'in stock', '✅', '✓', '✔'];
                const negativeIndicators = ['no', 'n', 'false', '0', 'unavailable', 'out of stock', 'discontinued', '❌', '✗', '×'];
                
                if (positiveIndicators.some(indicator => normalizedValue === indicator)) {
                    isAvailable = true;
                } else if (negativeIndicators.some(indicator => normalizedValue === indicator)) {
                    isAvailable = false;
                } else {
                    // Default to available if unclear
                    isAvailable = true;
                }
                
                if (this.config.DEBUG_MODE && this.debugAvailabilityCount < 5) {
                    if (!this.debugAvailabilityCount) this.debugAvailabilityCount = 0;
                    console.log(`Model: ${model}, Brand: ${brand}, Available: "${availableValue}" → ${isAvailable}`);
                    this.debugAvailabilityCount++;
                }
            }
        }
        
        const card = document.createElement('div');
        card.className = 'model-card';
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Select ${model} model`);
        card.innerHTML = `<div class="model-name">${model}</div>`;
        
        card.addEventListener('click', () => this.selectModel(model, brand));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.selectModel(model, brand);
            }
        });
        
        return card;
    }

    selectModel(model, brand) {
        this.selectedModel = model;
        this.selectedBrand = brand;
        this.showDeviceModal();
        
        const modelCards = document.querySelectorAll('.model-card');
        modelCards.forEach(card => {
            if (card.querySelector('.model-name').textContent === model) {
                card.style.transform = 'scale(0.95)';
                setTimeout(() => card.style.transform = '', 150);
            }
        });
    }

    showBrandStep() {
        this.elements.brandStep.classList.add('active');
        this.elements.modelStep.classList.remove('active');
        this.selectedBrand = null;
        this.selectedModel = null;
        
        // Clear model search when going back
        if (this.elements.modelSearch) {
            this.elements.modelSearch.value = '';
            this.elements.clearModelSearch.style.display = 'none';
        }
        
        // Focus brand search if present
        if (this.elements.brandSearch) {
            setTimeout(() => this.elements.brandSearch.focus(), 100);
        }
    }
    
    showModelStep() {
        this.elements.brandStep.classList.remove('active');
        this.elements.modelStep.classList.add('active');
        
        // Focus model search
        if (this.elements.modelSearch) {
            setTimeout(() => this.elements.modelSearch.focus(), 100);
        }
    }
    
    setupKeyboardNavigation() {
        // ESC key to go back or close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.elements.deviceModal?.classList.contains('show')) {
                    this.closeDeviceModal();
                } else if (this.elements.settingsMenu?.classList.contains('show')) {
                    this.closeSettings();
                } else if (this.elements.modelStep?.classList.contains('active')) {
                    this.showBrandStep();
                }
            }
        });
        
        // Keyboard navigation for brand/model cards
        this.elements.brandGrid?.addEventListener('keydown', (e) => {
            this.handleCardNavigation(e, '.brand-card');
        });
        
        this.elements.modelGrid?.addEventListener('keydown', (e) => {
            this.handleCardNavigation(e, '.model-card');
        });
    }
    
    handleCardNavigation(e, cardSelector) {
        const cards = Array.from(document.querySelectorAll(cardSelector));
        const currentIndex = cards.indexOf(e.target);
        
        switch(e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % cards.length;
                cards[nextIndex]?.focus();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = (currentIndex - 1 + cards.length) % cards.length;
                cards[prevIndex]?.focus();
                break;
            case 'Enter':
            case ' ':
                if (e.target.tagName !== 'INPUT') {
                    e.preventDefault();
                    e.target.click();
                }
                break;
        }
    }
    
    showDeviceModal() {
        const device = this.deviceData.find(d => {
            const brand = this.getField(d, ['Device Brand', 'Brand', 'DeviceBrand', 'BRAND', 'brand']);
            const model = this.getField(d, ['Device Model', 'Model', 'DeviceModel', 'MODEL', 'model']);
            return brand === this.selectedBrand && model === this.selectedModel;
        });
        
        if (!device) {
            this.showToast('Device not found', 'error');
        return;
    }
    
        this.populateDeviceModal(device);
        this.elements.deviceModal.classList.add('show');
        setTimeout(() => {
            this.elements.deviceModal.querySelector('.modal-container').style.transform = 'scale(1)';
        }, 10);
    }
    
    populateDeviceModal(device) {
        const deviceBrand = this.getField(device, ['Device Brand', 'Brand', 'DeviceBrand', 'BRAND', 'brand']);
        const deviceModel = this.getField(device, ['Device Model', 'Model', 'DeviceModel', 'MODEL', 'model']);
        
        const getAvailable = (d) => this.getField(d, ['Available', 'AVAILABLE', 'available', 'Availability', 'In Stock', 'in_stock', 'Status', 'status']);
        const availableValue = getAvailable(device);
        
        let isAvailable = true;
        if (availableValue) {
            const normalizedValue = availableValue.toString().toLowerCase().trim();
            const positiveIndicators = ['yes', 'y', 'true', '1', 'available', 'in stock', '✅', '✓', '✔'];
            const negativeIndicators = ['no', 'n', 'false', '0', 'unavailable', 'out of stock', 'discontinued', '❌', '✗', '×'];
            
            if (positiveIndicators.some(indicator => normalizedValue === indicator)) {
                isAvailable = true;
            } else if (negativeIndicators.some(indicator => normalizedValue === indicator)) {
                isAvailable = false;
            }
        }
        
        this.elements.deviceName.textContent = `${deviceBrand} ${deviceModel}`;
        
        // Filter options to only include entries that have a UPC AND a verified MDN
        const options = this.deviceData.filter(d => {
            const dBrand = this.getField(d, ['Device Brand', 'Brand', 'DeviceBrand', 'BRAND', 'brand']);
            const dModel = this.getField(d, ['Device Model', 'Model', 'DeviceModel', 'MODEL', 'model']);
            const hasUpc = this.getField(d, ['UPC', 'UPC Code', 'upc', 'UPCCode', 'UPC_CODE', 'BARCODE']);
            const hasMdn = this.getField(d, ['MDN', 'mdn', 'MDN Number', 'mdn_number', 'phone']);
            const isVerified = hasMdn && this.isMdnVerified(d);
            
            // Only include if brand/model matches AND has a UPC AND verified MDN
            return dBrand === deviceBrand && dModel === deviceModel && hasUpc && isVerified;
        });
        
        // Check if any entries have verified MDNs
        const hasVerifiedMdns = options.some(opt => {
            const hasMdn = this.getField(opt, ['MDN', 'mdn', 'MDN Number', 'mdn_number', 'phone']);
            return hasMdn && this.isMdnVerified(opt);
        });
        
        const availabilityBadge = hasVerifiedMdns 
            ? '<span class="availability-badge available"><i class="fas fa-check-circle"></i> MDN Verified Available</span>'
            : '<span class="availability-badge unavailable"><i class="fas fa-exclamation-circle"></i> MDN Not Verified</span>';
        
        this.elements.deviceModel.innerHTML = `
            <span class="model-text">${deviceModel}</span>
            ${availabilityBadge}
        `;
        
        const groupedOptions = this.groupByProtectionType(options);
        
        this.elements.optionsCount.textContent = `${options.length} UPC option${options.length !== 1 ? 's' : ''}`;
        
        this.elements.optionsList.innerHTML = '';
        groupedOptions.forEach(group => {
            const optionCard = this.createProtectionTypeCard(group, device['Device Model']);
            this.elements.optionsList.appendChild(optionCard);
        });
    }
    
    groupByProtectionType(options) {
        const groups = {};
        
        options.forEach(option => {
            const brand = this.getField(option, ['Brand', 'Device Brand', 'DeviceBrand', 'BRAND', 'brand']) || 'Unknown';
            const type = this.getField(option, ['Type', 'Protection Type', 'ProtectionType', 'TYPE', 'Protection']) || 'Unknown';
            const key = `${brand}-${type}`;
            
            if (!groups[key]) {
                groups[key] = {
                    brand: brand,
                    type: type,
                    entries: [],
                    verifiedMdns: new Set() // Only store verified MDNs
                };
            }
            
            groups[key].entries.push(option);
            
            // Only add MDN if it's verified (Availability = verified)
            const mdn = this.getField(option, ['MDN', 'mdn', 'MDN Number', 'mdn_number', 'phone']);
            if (mdn && this.isMdnVerified(option)) {
                groups[key].verifiedMdns.add(mdn);
            }
        });
        
        return Object.values(groups);
    }
    
    createProtectionTypeCard(group, deviceModel) {
        const card = document.createElement('div');
        card.className = 'protection-card';
        const verifiedMdns = Array.from(group.verifiedMdns);
        
        // Entries in group are pre-filtered to have UPC and verified MDN, so just list unique UPCs
        const verifiedUpcs = [...new Set(group.entries.map(e => {
            return this.getField(e, ['UPC', 'UPC Code', 'upc', 'UPCCode', 'UPC_CODE', 'BARCODE']);
        }).filter(Boolean))];
        
        // Only show MDN button if there are verified MDNs
        const showMdnButton = verifiedUpcs.length > 0 && verifiedMdns.length > 0;
        
        card.innerHTML = `
            <div class="card-header-modern">
                <div class="brand-info-modern">
                    <div class="brand-logo-modern">
                        <span class="brand-initial">${group.brand.charAt(0)}</span>
                    </div>
                    <div class="brand-details">
                        <div class="brand-name-modern">${group.brand}</div>
                        <div class="protection-type-modern">
                            <i class="fas fa-tag"></i>
                            <span>${group.type}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="upc-section-modern">
                <div class="upc-header-modern">
                    <div class="upc-label-group">
                        <i class="fas fa-barcode"></i>
                        <span class="upc-label-text">UPC Codes</span>
                    </div>
                    <div class="upc-badge">${verifiedUpcs.length}</div>
                </div>
                <div class="upc-grid-modern">
                    ${verifiedUpcs.map(upc => `
                        <div class="upc-card-modern upc-verified">
                            <div class="upc-value-modern" onclick="app.copyUPC('${upc}')" title="Click to copy - MDN Verified">
                                ${upc}
                            </div>
                            <div class="upc-verified-badge" title="MDN Verified">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <button class="copy-btn-modern" onclick="app.copyUPC('${upc}')" aria-label="Copy UPC ${upc}">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
                ${verifiedUpcs.length > 1 ? `
                <button class="copy-all-upcs-btn" data-upcs="${verifiedUpcs.join(',')}" onclick="app.copyAllUPCsFromButton(this)" title="Copy all ${verifiedUpcs.length} UPCs">
                    <i class="fas fa-copy"></i>
                    <span>Copy All UPCs</span>
                    <span class="copy-count-badge">${verifiedUpcs.length}</span>
                </button>
                ` : ''}
            </div>
            ${showMdnButton ? `
            <button class="show-mdn-btn-modern" onclick="app.showMdnForGroup('${group.brand}', '${group.type}', '${deviceModel}')">
                <i class="fas fa-phone-alt"></i>
                <span>View Verified MDN${verifiedMdns.length > 1 ? 's' : ''}</span>
                <span class="mdn-count-badge">${verifiedMdns.length}</span>
            </button>
            ` : ''}
        `;
    
        return card;
    }
    
    closeDeviceModal() {
        this.elements.deviceModal.classList.remove('show');
    }
    
    showMdnForGroup(brand, type, deviceModel) {
        const matchingDevices = this.deviceData.filter(d => {
            const deviceBrand = this.getField(d, ['Brand', 'Device Brand', 'DeviceBrand', 'BRAND', 'brand']);
            const deviceType = this.getField(d, ['Type', 'Protection Type', 'ProtectionType', 'TYPE', 'Protection']);
            const deviceModelName = this.getField(d, ['Device Model', 'Model', 'DeviceModel', 'MODEL', 'model']);
            
            return deviceBrand === brand && 
                   deviceType === type && 
                   deviceModelName === deviceModel;
        });
        
        // Only get verified MDNs (where Availability = verified)
        const verifiedDevices = matchingDevices.filter(d => this.isMdnVerified(d));
        const verifiedMdns = [...new Set(verifiedDevices.map(d => {
            return this.getField(d, ['MDN', 'mdn', 'MDN Number', 'mdn_number', 'phone']);
        }).filter(Boolean))];
        
        if (verifiedMdns.length === 0) {
            this.showToast('No verified MDN found for this product', 'warning');
            return;
        }
        
        // Get UPCs from verified entries only
        const verifiedUpcs = [...new Set(verifiedDevices.map(d => {
            return this.getField(d, ['UPC', 'UPC Code', 'upc', 'UPCCode', 'UPC_CODE', 'BARCODE']);
        }).filter(Boolean))];
        
        // Create product label
        const productLabel = `${deviceModel} - ${brand} ${type}`.trim();
        
        // Show verified MDN(s) in a simplified modal
        this.showMdnModal(verifiedUpcs, verifiedMdns, productLabel);
    }
    
    showMdnModal(upcs, mdns, productLabel) {
        // Create a simple modal overlay
        const modal = document.createElement('div');
        modal.className = 'mdn-modal-overlay';
        const upcArray = Array.isArray(upcs) ? upcs : [upcs];
        const upcDisplay = upcArray.join(', ');
        
        modal.innerHTML = `
            <div class="mdn-modal-content">
                <div class="mdn-modal-header">
                    <div>
                        <h3>Verified MDN${mdns.length > 1 ? 's' : ''} for Product</h3>
                        <p class="mdn-product-info">${productLabel}</p>
                        <p class="mdn-upc-info">UPC${upcArray.length > 1 ? 's' : ''}: ${upcDisplay}</p>
                        <p class="mdn-verified-note" style="margin-top: 8px; font-size: 12px; color: var(--success);">
                            <i class="fas fa-check-circle"></i> All MDNs shown are verified
                        </p>
                    </div>
                    <button class="close-mdn-modal" onclick="this.closest('.mdn-modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="mdn-modal-body">
                    ${mdns.map((mdn, index) => {
                        const formattedMdn = this.formatPhoneNumber(mdn);
                        return `
                        <div class="mdn-item">
                            <label>Verified MDN ${mdns.length > 1 ? index + 1 : ''}:</label>
                            <div class="mdn-item-content">
                                <span class="mdn-item-value">${formattedMdn}</span>
                                <button class="copy-button" onclick="app.copyMdn('${mdn}')">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                    `;
                    }).join('')}
                </div>
                ${mdns.length > 1 ? `
                <div class="mdn-modal-footer">
                    <button class="copy-all-mdns-btn" data-mdns="${mdns.join(',')}" onclick="app.copyAllMDNsFromButton(this)">
                        <i class="fas fa-copy"></i>
                        <span>Copy All MDNs</span>
                        <span class="copy-count-badge">${mdns.length}</span>
                    </button>
                </div>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    formatPhoneNumber(phoneNumber) {
        const cleaned = phoneNumber.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        return phoneNumber;
    }
    
    copyMdn(mdn) {
        this.copyToClipboard(mdn, 'MDN copied to clipboard');
    }
    
    copyUPC(upc) {
        this.copyToClipboard(upc, 'UPC copied to clipboard');
    }
    
    copyAllUPCsFromButton(button) {
        const upcs = button.getAttribute('data-upcs').split(',').map(u => u.trim()).filter(Boolean);
        this.copyAllUPCs(upcs);
    }
    
    copyAllMDNsFromButton(button) {
        const mdns = button.getAttribute('data-mdns').split(',').map(m => m.trim()).filter(Boolean);
        this.copyAllMDNs(mdns);
    }
    
    copyAllUPCs(upcs) {
        const upcList = Array.isArray(upcs) ? upcs : [upcs];
        const upcString = upcList.join(', ');
        const count = upcList.length;
        this.copyToClipboard(upcString, `${count} UPC${count !== 1 ? 's' : ''} copied to clipboard`);
    }
    
    copyAllMDNs(mdns) {
        const mdnList = Array.isArray(mdns) ? mdns : [mdns];
        const mdnString = mdnList.join(', ');
        const count = mdnList.length;
        this.copyToClipboard(mdnString, `${count} MDN${count !== 1 ? 's' : ''} copied to clipboard`);
    }
    
    async copyToClipboard(text, message) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast(message, 'success');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showToast('Failed to copy', 'error');
        }
    }
    
    refreshDeviceData() {
        this.closeDeviceModal();
        this.loadData().then(() => {
            this.showToast('Data refreshed', 'success');
        });
    }
    
    startNewSearch() {
        this.closeDeviceModal();
        this.showBrandStep();
    }
    
    toggleSettings() {
        this.elements.settingsMenu.classList.add('show');
    }
    
    closeSettings() {
        this.elements.settingsMenu.classList.remove('show');
    }
    
    showTimerInfo() {
        const remainingTime = this.getRemainingTime();
        const seconds = Math.floor(remainingTime / 1000);
        
        this.showToast(`Inactivity timer: ${seconds}s remaining`, 'info');
    }
    
    goToHome() {
        // Close any open modals
        if (this.elements.deviceModal.classList.contains('show')) {
            this.closeDeviceModal();
        }
        if (this.elements.settingsMenu.classList.contains('show')) {
            this.closeSettings();
        }
        
        // Switch to Home tab
        this.switchTab('home');
    }
    
    // ========== TAB MANAGEMENT ==========
    
    switchTab(tabName) {
        if (this.currentTab === tabName) return;
        
        this.currentTab = tabName;
        
        // Hide all tabs
        if (this.elements.homeTab) this.elements.homeTab.classList.remove('active');
        if (this.elements.scheduleTab) this.elements.scheduleTab.classList.remove('active');
        if (this.elements.protectTab) this.elements.protectTab.classList.remove('active');
        
        // Remove active class from all nav items
        if (this.elements.homeTabBtn) this.elements.homeTabBtn.classList.remove('active');
        if (this.elements.scheduleTabBtn) this.elements.scheduleTabBtn.classList.remove('active');
        if (this.elements.protectTabBtn) this.elements.protectTabBtn.classList.remove('active');
        
        // Show selected tab and activate nav button
        switch(tabName) {
            case 'home':
                this.showHomeTab();
                break;
            case 'schedule':
                this.showScheduleTab();
                break;
            case 'protect':
                this.showProtectTab();
                break;
        }
    }
    
    showHomeTab() {
        if (this.elements.homeTab) {
            this.elements.homeTab.classList.add('active');
        }
        if (this.elements.homeTabBtn) {
            this.elements.homeTabBtn.classList.add('active');
        }
        this.updateHomeClock();
    }
    
    showScheduleTab() {
        if (this.elements.scheduleTab) {
            this.elements.scheduleTab.classList.add('active');
        }
        if (this.elements.scheduleTabBtn) {
            this.elements.scheduleTabBtn.classList.add('active');
        }
        
        // Render schedule with current week
        this.renderSchedule();
    }
    
    showProtectTab() {
        if (this.elements.protectTab) {
            this.elements.protectTab.classList.add('active');
        }
        if (this.elements.protectTabBtn) {
            this.elements.protectTabBtn.classList.add('active');
        }
        
        // Initialize device flow if not already done
        if (!this.allBrands || this.allBrands.length === 0) {
            this.initializeDeviceFlow();
        }
    }
    
    // ========== HOME TAB CLOCK ==========
    
    startHomeClock() {
        this.updateHomeClock();
        if (this.homeClockInterval) {
            clearInterval(this.homeClockInterval);
        }
        this.homeClockInterval = setInterval(() => this.updateHomeClock(), 1000);
    }
    
    updateHomeClock() {
        if (!this.elements.clockTime || !this.elements.clockPeriod || !this.elements.homeDate) return;
        
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        
        this.elements.clockTime.textContent = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        this.elements.clockPeriod.textContent = period;
        
        // Update date
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        this.elements.homeDate.textContent = now.toLocaleDateString('en-US', dateOptions);
    }
    
    // ========== SCHEDULE RENDERING ==========
    
    switchScheduleView(view) {
        this.currentScheduleView = view;
        
        if (view === 'daily') {
            if (this.elements.dailyViewBtn) this.elements.dailyViewBtn.classList.add('active');
            if (this.elements.weeklyViewBtn) this.elements.weeklyViewBtn.classList.remove('active');
            if (this.elements.dailyScheduleView) this.elements.dailyScheduleView.classList.add('active');
            if (this.elements.weeklyScheduleView) this.elements.weeklyScheduleView.classList.remove('active');
            // Reset to today when switching to daily view
            this.currentSelectedDate = new Date();
        } else {
            if (this.elements.dailyViewBtn) this.elements.dailyViewBtn.classList.remove('active');
            if (this.elements.weeklyViewBtn) this.elements.weeklyViewBtn.classList.add('active');
            if (this.elements.dailyScheduleView) this.elements.dailyScheduleView.classList.remove('active');
            if (this.elements.weeklyScheduleView) this.elements.weeklyScheduleView.classList.add('active');
        }
        
        this.renderSchedule();
    }
    
    changeWeek(direction) {
        this.currentWeekIndex = Math.max(0, Math.min(this.scheduleWeeks.length - 1, this.currentWeekIndex + direction));
        this.renderSchedule();
    }
    
    changeDay(direction) {
        const newDate = new Date(this.currentSelectedDate);
        newDate.setDate(newDate.getDate() + direction);
        this.currentSelectedDate = newDate;
        this.renderSchedule();
    }
    
    renderSchedule() {
        if (this.currentScheduleView === 'daily') {
            this.renderDailySchedule();
        } else {
            this.renderWeeklySchedule();
        }
    }
    
    renderDailySchedule() {
        if (!this.elements.dailyScheduleList || !this.elements.dailyDate) return;
        
        const selectedDate = new Date(this.currentSelectedDate);
        selectedDate.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isToday = selectedDate.getTime() === today.getTime();
        
        // Get schedule for selected date
        const daySchedule = this.getScheduleForDate(selectedDate);
        
        // Update date display
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateLabel = isToday 
            ? `Today, ${selectedDate.toLocaleDateString('en-US', dateOptions)}`
            : selectedDate.toLocaleDateString('en-US', dateOptions);
        this.elements.dailyDate.textContent = dateLabel;
        
        // Update navigation label
        if (this.elements.weekLabel) {
            this.elements.weekLabel.textContent = isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        // Update navigation buttons - allow navigation within current week (Thu-Wed)
        if (this.elements.prevWeekBtn && this.elements.nextWeekBtn) {
            // Find which week contains the selected date
            const dayOfWeek = selectedDate.getDay();
            const daysFromThursday = dayOfWeek >= 4 ? dayOfWeek - 4 : dayOfWeek + 3;
            const weekThursday = new Date(selectedDate);
            weekThursday.setDate(selectedDate.getDate() - daysFromThursday);
            weekThursday.setHours(0, 0, 0, 0);
            
            // Check if we can go back (not before Thursday of current week)
            const weekStart = new Date(weekThursday);
            const canGoBack = selectedDate.getTime() > weekStart.getTime();
            
            // Check if we can go forward (not after Wednesday of current week)
            const weekEnd = new Date(weekThursday);
            weekEnd.setDate(weekThursday.getDate() + 6);
            const canGoForward = selectedDate.getTime() < weekEnd.getTime();
            
            this.elements.prevWeekBtn.disabled = !canGoBack;
            this.elements.nextWeekBtn.disabled = !canGoForward;
        }
        
        // Clear and render
        this.elements.dailyScheduleList.innerHTML = '';
        
        if (daySchedule.length === 0) {
            if (this.elements.dailyEmptyState) {
                this.elements.dailyEmptyState.style.display = 'block';
            }
            return;
        }
        
        if (this.elements.dailyEmptyState) {
            this.elements.dailyEmptyState.style.display = 'none';
        }
        
        // Group by employee (in case of multiple shifts)
        const employeeShifts = {};
        daySchedule.forEach(shift => {
            if (!employeeShifts[shift.employee]) {
                employeeShifts[shift.employee] = [];
            }
            employeeShifts[shift.employee].push(shift);
        });
        
        // Render employee cards
        Object.keys(employeeShifts).sort().forEach(employee => {
            const shifts = employeeShifts[employee];
            const card = document.createElement('div');
            card.className = 'schedule-employee-card';
            
            const timeRanges = shifts.map(s => s.timeRange).join(', ');
            card.innerHTML = `
                <div class="employee-name">${employee}</div>
                <div class="employee-shift">${timeRanges}</div>
            `;
            
            this.elements.dailyScheduleList.appendChild(card);
        });
    }
    
    renderWeeklySchedule() {
        if (!this.elements.weeklyScheduleTable) return;
        
        const weekData = this.getScheduleForWeek(this.currentWeekIndex);
        const currentWeek = this.scheduleWeeks[this.currentWeekIndex];
        
        // Update week label
        if (this.elements.weekLabel && currentWeek) {
            this.elements.weekLabel.textContent = currentWeek.label;
        }
        
        // Update navigation buttons
        if (this.elements.prevWeekBtn) {
            this.elements.prevWeekBtn.disabled = this.currentWeekIndex === 0;
        }
        if (this.elements.nextWeekBtn) {
            this.elements.nextWeekBtn.disabled = this.currentWeekIndex >= this.scheduleWeeks.length - 1;
        }
        
        if (weekData.length === 0) {
            if (this.elements.weeklyEmptyState) {
                this.elements.weeklyEmptyState.style.display = 'block';
            }
            this.elements.weeklyScheduleTable.innerHTML = '';
            return;
        }
        
        if (this.elements.weeklyEmptyState) {
            this.elements.weeklyEmptyState.style.display = 'none';
        }
        
        // Group by employee and day, and collect actual dates from data
        const employeeSchedule = {};
        const days = ['THU', 'FRI', 'SAT', 'SUN', 'MON', 'TUE', 'WED'];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Map to store actual dates for each day from the schedule data
        const dayDateMap = {};
        
        weekData.forEach(shift => {
            if (!employeeSchedule[shift.employee]) {
                employeeSchedule[shift.employee] = {};
            }
            employeeSchedule[shift.employee][shift.day] = shift;
            
            // Store the actual date for this day
            if (!dayDateMap[shift.day]) {
                dayDateMap[shift.day] = {
                    date: new Date(shift.date),
                    dateStr: shift.dateStr
                };
            }
        });
        
        // Create table
        let tableHTML = '<table class="schedule-table"><thead><tr><th>Employee</th>';
        days.forEach((day) => {
            const dayData = dayDateMap[day];
            const dateStr = dayData ? dayData.dateStr : '';
            const dateForDay = dayData ? dayData.date : null;
            const isToday = dateForDay && dateForDay.getTime() === today.getTime();
            tableHTML += `<th class="${isToday ? 'today' : ''}">${day}<br><span class="date-label">${dateStr}</span></th>`;
        });
        tableHTML += '</tr></thead><tbody>';
        
        // Add employee rows
        Object.keys(employeeSchedule).sort().forEach(employee => {
            tableHTML += `<tr><td class="employee-cell">${employee}</td>`;
            days.forEach(day => {
                const shift = employeeSchedule[employee][day];
                if (shift) {
                    tableHTML += `<td class="schedule-cell"><div class="schedule-time">${shift.timeRange}</div></td>`;
                } else {
                    tableHTML += '<td class="schedule-cell empty"></td>';
                }
            });
            tableHTML += '</tr>';
        });
        
        tableHTML += '</tbody></table>';
        this.elements.weeklyScheduleTable.innerHTML = tableHTML;
    }
    
    async refreshData() {
        try {
            this.showLoading('Refreshing data...');
            localStorage.removeItem(this.config.CACHE_KEY);
            localStorage.removeItem('lastDataUpdate');
            await this.loadFromGoogleSheets();
            this.hideLoading();
            this.initializeDeviceFlow();
            this.showToast('Data refreshed successfully', 'success');
            this.closeSettings();
        } catch (error) {
            this.hideLoading();
            this.showToast('Failed to refresh data', 'error');
        }
    }
    
    async updateApp() {
        try {
            this.showLoading('Updating app to latest version...');
            
            // Clear all localStorage
            localStorage.clear();
            
            // Clear all caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            
            // Unregister all service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
            }
            
            this.hideLoading();
            this.showToast('App updated. Reloading...', 'success');
            this.closeSettings();
            
            // Force hard reload with cache bypass to get latest version
            setTimeout(() => {
                // Use location.reload with forced reload or navigate to force refresh
                window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
                // Fallback if above doesn't work
                setTimeout(() => {
                    window.location.reload(true);
                }, 500);
            }, 1000);
        } catch (error) {
            console.error('Failed to update app:', error);
            this.hideLoading();
            this.showToast('Failed to update app', 'error');
        }
    }
    
    async clearCache() {
        try {
            localStorage.clear();
            
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
            }
            
            this.showToast('All cache cleared successfully', 'success');
            this.closeSettings();
            setTimeout(() => window.location.reload(true), 1000);
        } catch (error) {
            console.error('Failed to clear cache:', error);
            this.showToast('Failed to clear cache', 'error');
        }
    }
    
    reloadApp() {
        window.location.reload(true);
    }
    
    showLoading(message = 'Loading...') {
        this.elements.loadingOverlay.querySelector('.loading-text').textContent = message;
        this.elements.loadingOverlay.classList.add('show');
    }
    
    hideLoading() {
        this.elements.loadingOverlay.classList.remove('show');
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    <i class="fas fa-${this.getToastIcon(type)}"></i>
                </div>
                <div class="toast-message">${message}</div>
        </div>
    `;
    
        this.elements.toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    showError(message) {
        this.showToast(message, 'error');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ProtectApp();
});

// Service Worker Registration with Update Checking
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
                
                // Check for updates every time the page loads
                registration.update();
                
                // Force update check on focus
                window.addEventListener('focus', () => {
                    registration.update();
                });
                
                // Listen for service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New service worker available, prompt user to reload
                                if (window.app) {
                                    window.app.showToast('App update available. Reloading...', 'info');
                                    setTimeout(() => {
                                        window.location.reload();
                                    }, 1000);
                                }
                            }
                        });
                    }
                });
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
        
        // Also unregister old service workers on update
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => {
                if (registration.scope === window.location.origin + '/' && 
                    registration.active?.scriptURL && 
                    registration.active.scriptURL.includes('sw.js')) {
                    // Check if there's an update
                    registration.update();
                }
            });
        });
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data && event.data.type === 'SW_UPDATED') {
                // Force refresh icons and manifest
                const icons = document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]');
                icons.forEach(icon => {
                    const href = icon.getAttribute('href');
                    if (href && !href.includes('?')) {
                        icon.setAttribute('href', href + '?v=' + Date.now());
                    } else if (href && href.includes('?')) {
                        icon.setAttribute('href', href.split('?')[0] + '?v=' + Date.now());
                    }
                });
                
                // Reload manifest
                const manifestLink = document.querySelector('link[rel="manifest"]');
                if (manifestLink) {
                    manifestLink.setAttribute('href', 'manifest.json?v=' + Date.now());
                }
            }
        });
    });
}