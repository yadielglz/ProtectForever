// Modern Mobile-First PWA JavaScript
class ProtectApp {
    constructor() {
        this.config = CONFIG;
        this.deviceData = [];
        this.scheduleData = []; // All schedule shifts in one array
        this.scheduleWeeks = []; // Organized by week (calculated from dates)
        this.scheduleByDate = new Map(); // Organized by day for fast lookup
        this.currentPasscode = '';
        this.selectedBrand = null;
        this.selectedModel = null;
        this.inactivityTimer = null;
        this.isAuthenticated = false;
        this.currentTab = 'home';
        this.currentScheduleView = 'daily';
        this.currentWeekIndex = 0; // Index into scheduleWeeks array
        this.currentSelectedDate = new Date(); // Selected date for daily view
        this.storeHours = this.config.STORE_HOURS;
        this.homeTimers = {
            storeHours: null
        };
        this.weatherState = {
            lastUpdate: null,
            coords: null,
            locationName: null,
            reverseLookupPending: false
        };
        this.promos = [];
        this.promosLoaded = false;
        this.promoFilter = 'all';
        this.pulseData = [];
        this.pulseLoaded = false;
        this.pulseUpdatedAt = null;
        this.refreshInFlight = false;
        this.autoRefreshInterval = null;
        this.lastDataSource = 'Unknown';
        
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
            this.applyVersionInfo();
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
            
            // Force fresh data each start
            localStorage.removeItem(this.config.CACHE_KEY);
            localStorage.removeItem('lastDataUpdate');
            localStorage.removeItem(this.config.SCHEDULE_CACHE_KEY);
            localStorage.removeItem('lastScheduleUpdate');

            // Nudge service worker to update if present
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(regs => {
                    regs.forEach(reg => reg.update().catch(() => {}));
                });
            }
            
            await Promise.all([
                this.loadData({ force: true }),
                this.loadScheduleData(true),
                this.loadPromos(true),
                this.loadPulseData(true)
            ]);
            this.updateDataStatusUI();
            this.startAutoRefreshLoop();
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
        this.elements.passcodeInput = document.getElementById('passcodeInput');
        
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
        this.elements.pulseTabBtn = document.getElementById('pulseTabBtn');
        this.elements.scheduleTabBtn = document.getElementById('scheduleTabBtn');
        this.elements.protectTabBtn = document.getElementById('protectTabBtn');
        this.elements.settingsTabBtn = document.getElementById('settingsTabBtn');
        this.elements.promoTabBtn = document.getElementById('promoTabBtn');
        
        // Tab content
        this.elements.homeTab = document.getElementById('homeTab');
        this.elements.pulseTab = document.getElementById('pulseTab');
        this.elements.scheduleTab = document.getElementById('scheduleTab');
        this.elements.protectTab = document.getElementById('protectTab');
        this.elements.promoTab = document.getElementById('promoTab');
        this.elements.promoList = document.getElementById('promoList');
        this.elements.promoStatus = document.getElementById('promoStatus');
        this.elements.promoEmpty = document.getElementById('promoEmpty');
        this.elements.promoRefreshBtn = document.getElementById('promoRefreshBtn');
        this.elements.promoFilters = document.querySelector('.promo-filters');
        this.elements.pulseGrid = document.getElementById('pulseGrid');
        this.elements.pulseStatus = document.getElementById('pulseStatus');
        this.elements.pulseRefreshBtn = document.getElementById('pulseRefreshBtn');
        this.elements.pulseUpdatedAt = document.getElementById('pulseUpdatedAt');
        this.elements.maintenanceToggle = document.getElementById('maintenanceToggle');
        this.elements.maintenanceBody = document.getElementById('maintenanceBody');
        this.elements.helpdeskToggle = document.getElementById('helpdeskToggle');
        this.elements.helpdeskBody = document.getElementById('helpdeskBody');
        this.elements.networkStatus = document.getElementById('networkStatus');
        this.elements.networkLabel = document.getElementById('networkLabel');
        this.elements.networkSub = document.getElementById('networkSub');
        this.elements.timerNavBtn = document.getElementById('timerNavBtn');
        this.elements.timerNavLabel = document.getElementById('timerNavLabel');
        
        // Home tab elements
        this.elements.homeClock = document.getElementById('homeClock');
        this.elements.clockTime = document.getElementById('clockTime');
        this.elements.clockPeriod = document.getElementById('clockPeriod');
        this.elements.homeDate = document.getElementById('homeDate');
        this.elements.weatherWidget = document.getElementById('weatherWidget');
        this.elements.weatherTemp = document.getElementById('weatherTemp');
        this.elements.weatherDesc = document.getElementById('weatherDesc');
        this.elements.weatherUpdated = document.getElementById('weatherUpdated');
        this.elements.weatherLocation = document.getElementById('weatherLocation');
        this.elements.weatherForecast = document.getElementById('weatherForecast');
        this.elements.weatherForecastHours = document.getElementById('weatherForecastHours');
        this.elements.weatherForecastDays = document.getElementById('weatherForecastDays');
        // Header weather elements
        this.elements.headerWeather = document.getElementById('headerWeather');
        this.elements.headerWeatherTemp = document.getElementById('headerWeatherTemp');
        this.elements.headerWeatherDesc = document.getElementById('headerWeatherDesc');
        this.elements.headerWeatherLocation = document.getElementById('headerWeatherLocation');
        this.elements.storeHoursRange = document.getElementById('storeHoursRange');
        this.elements.storeProgressBar = document.getElementById('storeProgressBar');
        this.elements.storeStatus = document.getElementById('storeStatus');
        this.elements.storeProgressLabel = document.getElementById('storeProgressLabel');
        this.elements.weatherZipInput = document.getElementById('weatherZipInput');
        this.elements.weatherZipSave = document.getElementById('weatherZipSave');
        this.elements.weatherUnitF = document.getElementById('weatherUnitF');
        this.elements.weatherUnitC = document.getElementById('weatherUnitC');
        this.elements.weatherToggle = document.getElementById('weatherToggle');
        this.elements.weatherBody = document.getElementById('weatherBody');
        this.elements.weatherRefreshBtn = document.getElementById('weatherRefreshBtn');
        
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
        this.elements.shiftTrackList = document.getElementById('shiftTrackList');
        this.elements.shiftTrackEmpty = document.getElementById('shiftTrackEmpty');
        this.elements.shiftTrackSubtitle = document.getElementById('shiftTrackSubtitle');
        this.elements.refreshShiftTrackBtn = document.getElementById('refreshShiftTrackBtn');
        this.elements.shiftTrackSection = document.getElementById('shiftTrackSection');
        this.elements.shiftTrackToggle = document.getElementById('shiftTrackToggle');
        this.elements.shiftTrackBody = document.getElementById('shiftTrackBody');
        
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
        this.elements.settingsNavBtn = this.elements.settingsTabBtn;
        this.elements.refreshDataBtn = document.getElementById('refreshDataBtn');
        this.elements.updateAppBtn = document.getElementById('updateAppBtn');
        this.elements.clearCacheBtn = document.getElementById('clearCacheBtn');
        this.elements.reloadAppBtn = document.getElementById('reloadAppBtn');
        this.elements.appVersionText = document.getElementById('appVersionText');
        this.elements.settingsTimerValue = document.getElementById('settingsTimerValue');
        this.elements.settingsTimerBar = document.getElementById('settingsTimerBar');
        this.elements.settingsTimerCard = document.getElementById('settingsTimerCard');
        this.elements.showTimerInfoBtn = document.getElementById('showTimerInfoBtn');
        this.elements.dataSourcesToggle = document.getElementById('dataSourcesToggle');
        this.elements.dataSourcesBody = document.getElementById('dataSourcesBody');
        this.elements.dataProtectSource = document.getElementById('dataProtectSource');
        this.elements.dataProtectUpdated = document.getElementById('dataProtectUpdated');
        this.elements.dataScheduleSource = document.getElementById('dataScheduleSource');
        this.elements.dataScheduleUpdated = document.getElementById('dataScheduleUpdated');
        this.elements.dataPromoSource = document.getElementById('dataPromoSource');
        this.elements.dataPromoUpdated = document.getElementById('dataPromoUpdated');
        
        // Toast and loading
        this.elements.toastContainer = document.getElementById('toastContainer');
        this.elements.loadingOverlay = document.getElementById('loadingOverlay');
    }
    
    setupEventListeners() {
        // Passcode input
        if (this.elements.passcodeInput) {
            this.elements.passcodeInput.addEventListener('input', (e) => {
                const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
                this.currentPasscode = raw;
                e.target.value = raw;
                this.updatePasscodeDisplay();
                if (raw.length === 4) {
                    this.verifyPasscode();
                }
            });
            this.elements.passcodeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.verifyPasscode();
                }
            });
        }
        
        // Settings
        this.elements.closeSettings.addEventListener('click', () => this.closeSettings());
        
        // Bottom navigation - Tab switching
        this.elements.homeTabBtn.addEventListener('click', () => this.switchTab('home'));
        if (this.elements.pulseTabBtn) {
            this.elements.pulseTabBtn.addEventListener('click', () => this.switchTab('pulse'));
        }
        this.elements.scheduleTabBtn.addEventListener('click', () => this.switchTab('schedule'));
        this.elements.protectTabBtn.addEventListener('click', () => this.switchTab('protect'));
        if (this.elements.promoTabBtn) {
            this.elements.promoTabBtn.addEventListener('click', () => this.switchTab('promo'));
        }
        if (this.elements.settingsTabBtn) {
            this.elements.settingsTabBtn.addEventListener('click', () => this.toggleSettings());
        }
        if (this.elements.timerNavBtn) {
            this.elements.timerNavBtn.addEventListener('click', () => this.showTimerInfo());
        }
        if (this.elements.showTimerInfoBtn) {
            this.elements.showTimerInfoBtn.addEventListener('click', () => this.showTimerInfo());
        }
        if (this.elements.dataSourcesToggle) {
            this.elements.dataSourcesToggle.addEventListener('click', () => this.toggleDataSources());
        }
        if (this.elements.settingsTimerCard) {
            this.elements.settingsTimerCard.addEventListener('click', () => this.showTimerInfo());
        }
        if (this.elements.pulseRefreshBtn) {
            this.elements.pulseRefreshBtn.addEventListener('click', () => this.loadPulseData(true));
        }
        if (this.elements.pulseGrid) {
            this.elements.pulseGrid.addEventListener('click', (e) => {
                const header = e.target.closest('.pulse-card-header');
                if (!header) return;
                const card = header.closest('.pulse-card');
                if (!card) return;
                const isCollapsed = card.classList.toggle('collapsed');
                header.setAttribute('aria-expanded', (!isCollapsed).toString());
            });
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
        if (this.elements.refreshShiftTrackBtn) {
            this.elements.refreshShiftTrackBtn.addEventListener('click', () => this.refreshShiftTrack());
        }
        if (this.elements.shiftTrackToggle) {
            this.elements.shiftTrackToggle.addEventListener('click', () => this.toggleShiftTrackCollapse());
        }
        
        // Settings options
        this.elements.refreshDataBtn.addEventListener('click', () => this.refreshData());
        this.elements.updateAppBtn.addEventListener('click', () => this.updateApp());
        this.elements.clearCacheBtn.addEventListener('click', () => this.clearCache());
        this.elements.reloadAppBtn.addEventListener('click', () => this.reloadApp());
        if (this.elements.weatherZipSave) {
            this.elements.weatherZipSave.addEventListener('click', () => this.saveWeatherZip());
        }
        if (this.elements.weatherZipInput) {
            this.elements.weatherZipInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.saveWeatherZip();
                }
            });
        }
        if (this.elements.weatherRefreshBtn) {
            this.elements.weatherRefreshBtn.addEventListener('click', () => this.requestWeather());
        }
        if (this.elements.weatherToggle) {
            this.elements.weatherToggle.addEventListener('click', () => this.toggleWeatherSettings());
        }
        if (this.elements.weatherUnitF) {
            this.elements.weatherUnitF.addEventListener('click', () => this.setWeatherUnit('fahrenheit'));
        }
        if (this.elements.weatherUnitC) {
            this.elements.weatherUnitC.addEventListener('click', () => this.setWeatherUnit('celsius'));
        }
        if (this.elements.promoRefreshBtn) {
            this.elements.promoRefreshBtn.addEventListener('click', () => this.loadPromos(true));
        }
        if (this.elements.maintenanceToggle) {
            this.elements.maintenanceToggle.addEventListener('click', () => this.toggleMaintenance());
        }
        if (this.elements.helpdeskToggle) {
            this.elements.helpdeskToggle.addEventListener('click', () => this.toggleHelpdesk());
        }
        window.addEventListener('online', () => this.updateNetworkStatus());
        window.addEventListener('offline', () => this.updateNetworkStatus());
        if (this.elements.promoFilters) {
            this.elements.promoFilters.addEventListener('click', (e) => {
                const btn = e.target.closest('.promo-filter-btn');
                if (!btn) return;
                const filter = btn.dataset.filter || 'all';
                this.setPromoFilter(filter);
            });
        }
        
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
        const remainingTime = this.getRemainingTime();
        const seconds = Math.floor(remainingTime / 1000);
        const percentRemaining = Math.max(0, Math.min(100, (remainingTime / this.config.INACTIVITY_TIMEOUT) * 100));
        
        // Header timer (if present)
        if (this.elements.timerNavLabel) {
            this.elements.timerNavLabel.textContent = `${seconds.toString().padStart(2, '0')}`;
        }
        if (this.elements.timerNavBtn) {
            const timerBtn = this.elements.timerNavBtn;
            timerBtn.classList.remove('warning', 'critical');
            
            if (remainingTime <= 5000) { // 5 seconds or less
                timerBtn.classList.add('critical');
            } else if (remainingTime <= 10000) { // 10 seconds or less
                timerBtn.classList.add('warning');
            }
        }
        
        // Settings session card
        if (this.elements.settingsTimerValue) {
            this.elements.settingsTimerValue.textContent = `${seconds}s`;
        }
        if (this.elements.settingsTimerBar) {
            this.elements.settingsTimerBar.style.width = `${percentRemaining}%`;
        }
        if (this.elements.settingsTimerCard) {
            this.elements.settingsTimerCard.classList.remove('warning', 'critical');
            if (remainingTime <= 5000) {
                this.elements.settingsTimerCard.classList.add('critical');
            } else if (remainingTime <= 10000) {
                this.elements.settingsTimerCard.classList.add('warning');
            }
        }
    }
    
    getRemainingTime() {
        if (!this.timerStartTime) return this.config.INACTIVITY_TIMEOUT;
        
        const now = Date.now();
        const elapsed = now - this.timerStartTime;
        const remaining = this.config.INACTIVITY_TIMEOUT - elapsed;
        
        return Math.max(0, remaining);
    }
    
    async loadData(options = {}) {
        const { force = false, silent = false } = options;
        try {
            if (this.config.DEBUG_MODE) console.log('Starting data load...', { force, silent });
            if (!silent) this.showLoading('Loading device data...');
            
            let useCache = !force;
            const cachedData = this.getCachedData();
            
            if (cachedData && this.isCacheValid() && useCache) {
                this.deviceData = cachedData;
                this.updateDataStatusUI();
                if (!silent) this.hideLoading();
                return;
            }
            
            await this.loadFromGoogleSheets();
            if (!silent) this.hideLoading();
        } catch (error) {
            console.error('Failed to load data:', error);
            if (!silent) this.hideLoading();
            this.deviceData = this.getCachedData() || this.getFallbackData();
            this.recordDataUpdate('Offline fallback');
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
            const sourceLabel = response.url ? `Protect · ${new URL(response.url).hostname}` : 'Protect · Google Sheets';
            this.cacheData(this.deviceData, sourceLabel, 'protect');
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

    cacheData(data, sourceLabel = 'Google Sheets', sourceKey = 'protect') {
        try {
            localStorage.setItem(this.config.CACHE_KEY, JSON.stringify(data));
            this.recordDataUpdate(sourceKey, sourceLabel);
        } catch (error) {
            console.error('Failed to cache data:', error);
        }
    }

    isCacheValid() {
        try {
            const map = this.getDataUpdateMap();
            const protectEntry = map.protect;
            if (!protectEntry) return false;
            const cacheAge = Date.now() - protectEntry.ts;
            return cacheAge < this.config.CACHE_DURATION;
        } catch (error) {
            return false;
        }
    }

    getDataUpdateMap() {
        try {
            const raw = localStorage.getItem('lastDataUpdates');
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            return {};
        }
    }

    setDataUpdateMap(map) {
        try {
            localStorage.setItem('lastDataUpdates', JSON.stringify(map));
        } catch (error) {
            console.error('Failed to persist data update map', error);
        }
    }

    recordDataUpdate(sourceKey, sourceLabel = 'Google Sheets') {
        try {
            const now = Date.now();
            const map = this.getDataUpdateMap();
            map[sourceKey] = { ts: now, source: sourceLabel };
            this.setDataUpdateMap(map);
            this.lastDataSource = sourceLabel;
            this.updateDataStatusUI();
        } catch (error) {
            console.error('Failed to record data update', error);
        }
    }

    updateDataStatusUI() {
        const map = this.getDataUpdateMap();
        const entries = [
            { key: 'protect', sourceEl: this.elements.dataProtectSource, timeEl: this.elements.dataProtectUpdated, label: 'Protect data' },
            { key: 'schedule', sourceEl: this.elements.dataScheduleSource, timeEl: this.elements.dataScheduleUpdated, label: 'Schedule data' },
            { key: 'promos', sourceEl: this.elements.dataPromoSource, timeEl: this.elements.dataPromoUpdated, label: 'Promotions' },
        ];
        entries.forEach(entry => {
            if (!entry.sourceEl || !entry.timeEl) return;
            const rec = map[entry.key];
            if (rec && rec.ts) {
                entry.sourceEl.textContent = rec.source || entry.label;
                entry.timeEl.textContent = `Last updated: ${this.formatTimeAgo(rec.ts)}`;
            } else {
                entry.sourceEl.textContent = '—';
                entry.timeEl.textContent = 'Last updated: --';
            }
        });
    }

    formatTimeAgo(timestamp) {
        const diffMs = Date.now() - timestamp;
        if (diffMs < 0) return 'just now';
        const seconds = Math.floor(diffMs / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
        const days = Math.floor(hours / 24);
        return `${days} day${days === 1 ? '' : 's'} ago`;
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
    
    async loadScheduleData(force = false) {
        try {
            if (this.config.DEBUG_MODE) console.log('Starting schedule data load...');
            
            // Clear old cache format to avoid conflicts
            const cachedData = this.getCachedScheduleData();
            
            if (cachedData && this.isScheduleCacheValid() && !force) {
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
            const sourceLabel = response && response.url ? `Schedule · ${new URL(response.url).hostname}` : 'Schedule · Google Sheets';
            this.cacheScheduleData(this.scheduleData, sourceLabel);
            
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
        
        this.scheduleByDate = new Map();

        // Group all shifts by week (Thursday to Wednesday)
        const weekMap = new Map();
        
        this.scheduleData.forEach(shift => {
            const date = new Date(shift.date);
            date.setHours(0, 0, 0, 0);

            const dateKey = this.getDateKey(date);
            if (!this.scheduleByDate.has(dateKey)) {
                this.scheduleByDate.set(dateKey, []);
            }
            this.scheduleByDate.get(dateKey).push(shift);

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
    
    cacheScheduleData(data, sourceLabel = 'Schedule') {
        try {
            localStorage.setItem(this.config.SCHEDULE_CACHE_KEY, JSON.stringify(data));
            this.recordDataUpdate('schedule', sourceLabel);
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

    getDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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
        const dateKey = this.getDateKey(targetDate);
        
        if (this.scheduleByDate && this.scheduleByDate.size > 0) {
            return this.scheduleByDate.get(dateKey) || [];
        }

        return this.scheduleData.filter(shift => {
            const shiftDate = new Date(shift.date);
            shiftDate.setHours(0, 0, 0, 0);
            return this.getDateKey(shiftDate) === dateKey;
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
            this.timerStartTime = Date.now();
            this.startTimeDateDisplay();
            this.startHomeClock();
            this.updateTimerDisplay();
            this.startTimerCountdown();
            // Show Home tab by default
            this.switchTab('home');
            this.initHomeWidgets();
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
        if (this.elements.passcodeInput) {
            this.elements.passcodeInput.value = '';
        }
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
            <button 
                class="show-mdn-btn-modern mdn-hold-button" 
                data-brand="${group.brand}" 
                data-type="${group.type}" 
                data-device="${deviceModel}"
                aria-label="Press and hold to reveal verified MDNs"
            >
                <i class="fas fa-phone-alt"></i>
                <span>Hold to reveal MDN${verifiedMdns.length > 1 ? 's' : ''}</span>
                <span class="mdn-count-badge">${verifiedMdns.length}</span>
            </button>
            ` : ''}
        `;
    
        // Attach long-press handler for MDN reveal
        if (showMdnButton) {
            const mdnButton = card.querySelector('.mdn-hold-button');
            if (mdnButton) {
                this.attachMdnHoldHandlers(mdnButton, group.brand, group.type, deviceModel);
            }
        }

        return card;
    }
    
    closeDeviceModal() {
        this.elements.deviceModal.classList.remove('show');
    }
    
    attachMdnHoldHandlers(button, brand, type, deviceModel) {
        const holdThreshold = 650;
        let holdTimer = null;

        const startHold = () => {
            button.classList.add('mdn-hold-arming');
            holdTimer = setTimeout(() => {
                button.classList.remove('mdn-hold-arming');
                button.classList.add('mdn-hold-success');
                this.showMdnForGroup(brand, type, deviceModel);
                setTimeout(() => button.classList.remove('mdn-hold-success'), 800);
            }, holdThreshold);
        };

        const cancelHold = () => {
            if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
            }
            button.classList.remove('mdn-hold-arming');
        };

        const preventClick = (e) => {
            // Prevent accidental immediate click reveal; use hold only
            e.preventDefault();
            e.stopPropagation();
        };

        button.addEventListener('pointerdown', startHold);
        button.addEventListener('pointerup', cancelHold);
        button.addEventListener('pointerleave', cancelHold);
        button.addEventListener('pointercancel', cancelHold);
        button.addEventListener('click', preventClick);
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
        this.loadData({ force: true, silent: true }).then(() => {
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
        if (this.elements.pulseTab) this.elements.pulseTab.classList.remove('active');
        if (this.elements.scheduleTab) this.elements.scheduleTab.classList.remove('active');
        if (this.elements.protectTab) this.elements.protectTab.classList.remove('active');
        if (this.elements.promoTab) this.elements.promoTab.classList.remove('active');
        
        // Remove active class from all nav items
        if (this.elements.homeTabBtn) this.elements.homeTabBtn.classList.remove('active');
        if (this.elements.pulseTabBtn) this.elements.pulseTabBtn.classList.remove('active');
        if (this.elements.scheduleTabBtn) this.elements.scheduleTabBtn.classList.remove('active');
        if (this.elements.protectTabBtn) this.elements.protectTabBtn.classList.remove('active');
        if (this.elements.promoTabBtn) this.elements.promoTabBtn.classList.remove('active');
        
        // Show selected tab and activate nav button
        switch(tabName) {
            case 'home':
                this.showHomeTab();
                break;
            case 'pulse':
                this.showPulseTab();
                break;
            case 'schedule':
                this.showScheduleTab();
                break;
            case 'protect':
                this.showProtectTab();
                break;
            case 'promo':
                this.showPromoTab();
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
        this.toggleHeaderStatus(true);
    }

    showPulseTab() {
        if (this.elements.pulseTab) {
            this.elements.pulseTab.classList.add('active');
        }
        if (this.elements.pulseTabBtn) {
            this.elements.pulseTabBtn.classList.add('active');
        }
        this.toggleHeaderStatus(false);
        this.loadPulseData(false);
    }

    showScheduleTab() {
        if (this.elements.scheduleTab) {
            this.elements.scheduleTab.classList.add('active');
        }
        if (this.elements.scheduleTabBtn) {
            this.elements.scheduleTabBtn.classList.add('active');
        }
        this.toggleHeaderStatus(false);
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
        this.toggleHeaderStatus(false);
        
        // Initialize device flow if not already done
        if (!this.allBrands || this.allBrands.length === 0) {
            this.initializeDeviceFlow();
        }
    }

    showPromoTab() {
        if (this.elements.promoTab) {
            this.elements.promoTab.classList.add('active');
        }
        if (this.elements.promoTabBtn) {
            this.elements.promoTabBtn.classList.add('active');
        }
        this.toggleHeaderStatus(false);
        if (!this.promosLoaded) {
            this.loadPromos(false);
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

    // ========== HOME WIDGETS ==========
    initHomeWidgets() {
        this.updateStoreHours();
        if (this.homeTimers.storeHours) clearInterval(this.homeTimers.storeHours);
        this.homeTimers.storeHours = setInterval(() => this.updateStoreHours(), 60000);
        this.applyStoredWeatherUnitToUI();
        this.populateWeatherZipInput();
        // Ensure collapsibles default closed
        if (this.elements.weatherBody) {
            this.elements.weatherBody.classList.remove('show');
            this.elements.weatherBody.setAttribute('aria-hidden', 'true');
            this.elements.weatherToggle?.setAttribute('aria-expanded', 'false');
        }
        this.requestWeather();
    }

    updateStoreHours() {
        if (!this.elements.storeHoursRange || !this.elements.storeProgressBar || !this.elements.storeStatus || !this.elements.storeProgressLabel) return;

        const now = new Date();
        const todayHours = this.getTodayHours(now);

        if (todayHours.closed) {
            this.elements.storeHoursRange.textContent = todayHours.label || 'Closed today';
            this.elements.storeProgressBar.style.width = '0%';
            this.elements.storeStatus.textContent = 'Closed';
            this.elements.storeStatus.classList.remove('open');
            this.elements.storeStatus.classList.add('closed');
            this.elements.storeProgressLabel.textContent = '0%';
            return;
        }

        const open = todayHours.open;
        const close = todayHours.close;

        const rangeLabel = `${this.formatTime(open)} - ${this.formatTime(close)}${todayHours.label ? ` (${todayHours.label})` : ''}`;
        this.elements.storeHoursRange.textContent = rangeLabel;

        let status = 'Closed';
        let progress = 0;

        if (now >= open && now <= close) {
            status = 'Open';
            const total = close.getTime() - open.getTime();
            const elapsed = now.getTime() - open.getTime();
            progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
        } else if (now < open) {
            status = 'Closed';
            progress = 0;
        } else {
            status = 'Closed';
            progress = 100;
        }

        this.elements.storeProgressBar.style.width = `${progress}%`;
        this.elements.storeStatus.textContent = status;
        this.elements.storeStatus.classList.toggle('open', status === 'Open');
        this.elements.storeStatus.classList.toggle('closed', status !== 'Open');
        this.elements.storeProgressLabel.textContent = `${progress}%`;
    }

    formatTime(dateObj) {
        return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    getTodayHours(now = new Date()) {
        const month = `${now.getMonth() + 1}`.padStart(2, '0');
        const day = `${now.getDate()}`.padStart(2, '0');
        const mmdd = `${month}-${day}`;

        // Exceptions first
        const exceptions = this.storeHours?.EXCEPTIONS || [];
        const match = exceptions.find(e => (e.DATE || '').trim() === mmdd);
        if (match) {
            if (match.CLOSED) {
                return { closed: true, label: match.LABEL || 'Closed' };
            }
            const openDate = new Date(now);
            const closeDate = new Date(now);
            const [oh, om] = (match.OPEN || '00:00').split(':').map(Number);
            const [ch, cm] = (match.CLOSE || '00:00').split(':').map(Number);
            openDate.setHours(oh || 0, om || 0, 0, 0);
            closeDate.setHours(ch || 0, cm || 0, 0, 0);
            return { open: openDate, close: closeDate, closed: false, label: match.LABEL || 'Special hours' };
        }

        // Defaults
        const isSunday = now.getDay() === 0;
        const defaults = this.storeHours?.DEFAULT || {};
        const hoursObj = isSunday ? defaults.SUNDAY || {} : defaults.MON_SAT || {};
        const [oh, om] = (hoursObj.OPEN || '10:00').split(':').map(Number);
        const [ch, cm] = (hoursObj.CLOSE || '21:00').split(':').map(Number);
        const openDate = new Date(now);
        const closeDate = new Date(now);
        openDate.setHours(oh || 0, om || 0, 0, 0);
        closeDate.setHours(ch || 0, cm || 0, 0, 0);
        return { open: openDate, close: closeDate, closed: false, label: '' };
    }

    requestWeather() {
        if (!this.elements.weatherWidget) return;

        // Always load default/saved zip first for immediate data
        const zip = this.getStoredZip();
        if (zip) {
            this.requestWeatherByZip(zip, { silent: true });
        }

        if (!navigator.geolocation) {
            if (!zip) {
                this.renderWeatherError('Location unavailable');
            }
            return;
        }

        this.elements.weatherLocation.textContent = 'Requesting location...';
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                this.weatherState.coords = { latitude, longitude };
                this.fetchWeather(latitude, longitude);
            },
            (err) => {
                console.warn('Geo error', err);
                if (!zip) {
                    this.renderWeatherError('Location denied');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 10 * 60 * 1000
            }
        );
    }

    async requestWeatherByZip(zip, options = {}) {
        if (!zip) {
            this.renderWeatherError('ZIP not set');
            return;
        }
        try {
            if (!options.silent) {
                this.elements.weatherLocation.textContent = `ZIP ${zip}`;
            }
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(zip)}&count=1&language=en&format=json`;
            const res = await fetch(geoUrl);
            if (!res.ok) throw new Error('Geo lookup failed');
            const data = await res.json();
            const first = data?.results?.[0];
            if (!first) throw new Error('ZIP not found');
            const { latitude, longitude, name, admin1 } = first;
            this.weatherState.coords = { latitude, longitude };
            const locName = `${name || zip}${admin1 ? ', ' + admin1 : ''}`;
            this.weatherState.locationName = locName;
            this.elements.weatherLocation.textContent = locName;
            // Update header weather location
            if (this.elements.headerWeatherLocation) {
                this.elements.headerWeatherLocation.textContent = locName;
            }
            await this.fetchWeather(latitude, longitude);
        } catch (error) {
            console.error(error);
            this.renderWeatherError('ZIP lookup failed');
        }
    }

    async fetchWeather(lat, lon) {
        try {
            this.elements.weatherLocation.textContent = 'Updating...';
            const params = new URLSearchParams({
                latitude: lat,
                longitude: lon,
                current: 'temperature_2m,apparent_temperature,weather_code,precipitation',
                hourly: 'temperature_2m,weather_code,precipitation_probability',
                daily: 'temperature_2m_max,temperature_2m_min,weather_code',
                forecast_days: '7',
                timezone: 'auto',
                temperature_unit: this.getWeatherUnitParam()
            });
            const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
            const data = await res.json();
            this.renderWeather(data);
        } catch (error) {
            console.error(error);
            this.renderWeatherError('Weather unavailable');
        }
    }

    renderWeather(data) {
        const { current, hourly, daily } = data || {};
        if (!current || !hourly) {
            this.renderWeatherError('Weather unavailable');
            return;
        }

        const temp = Math.round(current.temperature_2m);
        const code = current.weather_code;
        const desc = this.getWeatherLabel(code);
        this.elements.weatherTemp.textContent = temp;
        this.elements.weatherDesc.textContent = desc;
        this.elements.weatherUpdated.textContent = 'Updated just now';
        const coords = this.weatherState.coords;
        let locationText = '';
        if (this.weatherState.locationName) {
            locationText = this.weatherState.locationName;
            this.elements.weatherLocation.textContent = locationText;
        } else if (coords) {
            this.elements.weatherLocation.textContent = 'Fetching location...';
            locationText = 'Fetching location...';
            this.fetchLocationName(coords);
        } else {
            locationText = 'Current location';
            this.elements.weatherLocation.textContent = locationText;
        }
        
        // Update header weather
        this.updateHeaderWeather(temp, desc, locationText);

        this.renderHourlyForecast(hourly);
        this.renderDailyForecast(daily);
    }

    renderWeatherError(message) {
        if (!this.elements.weatherWidget) return;
        this.elements.weatherTemp.textContent = '--';
        this.elements.weatherDesc.textContent = message || 'Weather unavailable';
        this.elements.weatherUpdated.textContent = '—';
        this.elements.weatherLocation.textContent = '—';
        
        // Update header weather with error
        this.updateHeaderWeather('--', message || 'Weather unavailable', '—');
        if (this.elements.weatherForecastHours) this.elements.weatherForecastHours.innerHTML = '';
        if (this.elements.weatherForecastDays) this.elements.weatherForecastDays.innerHTML = '';
    }

    saveWeatherZip() {
        if (!this.elements.weatherZipInput) return;
        const zip = (this.elements.weatherZipInput.value || '').trim();
        if (!zip) {
            this.showToast('Please enter a ZIP', 'warning');
            return;
        }
        localStorage.setItem('weatherZip', zip);
        this.showToast('ZIP saved. Updating weather...', 'success');
        this.requestWeatherByZip(zip);
    }

    getStoredZip() {
        try {
            const stored = localStorage.getItem('weatherZip');
            if (stored && stored.trim()) return stored.trim();
            if (this.config.WEATHER_DEFAULT_ZIP) return this.config.WEATHER_DEFAULT_ZIP;
            return '';
        } catch (e) {
            return this.config.WEATHER_DEFAULT_ZIP || '';
        }
    }

    setWeatherUnit(unit) {
        const normalized = unit === 'celsius' ? 'celsius' : 'fahrenheit';
        localStorage.setItem('weatherUnit', normalized);
        this.applyStoredWeatherUnitToUI();
        // Re-fetch with preferred unit
        if (this.weatherState.coords) {
            this.fetchWeather(this.weatherState.coords.latitude, this.weatherState.coords.longitude);
        } else {
            const zip = this.getStoredZip();
            if (zip) {
                this.requestWeatherByZip(zip);
            } else {
                this.requestWeather();
            }
        }
    }

    getStoredWeatherUnit() {
        try {
            return localStorage.getItem('weatherUnit') || 'fahrenheit';
        } catch (e) {
            return 'fahrenheit';
        }
    }

    applyStoredWeatherUnitToUI() {
        const unit = this.getStoredWeatherUnit();
        const isF = unit === 'fahrenheit';
        if (this.elements.weatherUnitF && this.elements.weatherUnitC) {
            this.elements.weatherUnitF.classList.toggle('active', isF);
            this.elements.weatherUnitC.classList.toggle('active', !isF);
        }
        // Update unit badge in UI (degree symbol stays, unit impacts fetched values)
    }

    populateWeatherZipInput() {
        if (!this.elements.weatherZipInput) return;
        const zip = this.getStoredZip();
        this.elements.weatherZipInput.value = zip;
    }

    getWeatherUnitParam() {
        const unit = this.getStoredWeatherUnit();
        return unit === 'celsius' ? 'celsius' : 'fahrenheit';
    }

    applyVersionInfo() {
        if (this.elements.appVersionText) {
            const versionLabel = this.config.APP_VERSION || 'Unknown';
            this.elements.appVersionText.textContent = `Version ${versionLabel}`;
        }
    }

    toggleHelpdesk() {
        if (!this.elements.helpdeskToggle || !this.elements.helpdeskBody) return;
        const expanded = this.elements.helpdeskToggle.getAttribute('aria-expanded') === 'true';
        this.elements.helpdeskToggle.setAttribute('aria-expanded', (!expanded).toString());
        this.elements.helpdeskBody.classList.toggle('show', !expanded);
        this.elements.helpdeskBody.setAttribute('aria-hidden', expanded ? 'true' : 'false');
    }

    toggleMaintenance() {
        if (!this.elements.maintenanceToggle || !this.elements.maintenanceBody) return;
        const expanded = this.elements.maintenanceToggle.getAttribute('aria-expanded') === 'true';
        this.elements.maintenanceToggle.setAttribute('aria-expanded', (!expanded).toString());
        this.elements.maintenanceBody.classList.toggle('show', !expanded);
        this.elements.maintenanceBody.setAttribute('aria-hidden', expanded ? 'true' : 'false');
    }

    toggleDataSources() {
        if (!this.elements.dataSourcesToggle || !this.elements.dataSourcesBody) return;
        const expanded = this.elements.dataSourcesToggle.getAttribute('aria-expanded') === 'true';
        this.elements.dataSourcesToggle.setAttribute('aria-expanded', (!expanded).toString());
        this.elements.dataSourcesBody.classList.toggle('show', !expanded);
        this.elements.dataSourcesBody.setAttribute('aria-hidden', expanded ? 'true' : 'false');
    }

    updateHeaderWeather(temp, desc, location) {
        if (!this.elements.headerWeather || !this.elements.headerWeatherTemp || 
            !this.elements.headerWeatherDesc || !this.elements.headerWeatherLocation) return;
        
        if (this.elements.headerWeatherTemp) {
            this.elements.headerWeatherTemp.textContent = temp;
        }
        if (this.elements.headerWeatherDesc) {
            this.elements.headerWeatherDesc.textContent = desc;
        }
        if (this.elements.headerWeatherLocation) {
            this.elements.headerWeatherLocation.textContent = location;
        }
    }
    
    toggleHeaderStatus(isHome) {
        // Show/hide header weather based on tab
        if (this.elements.headerWeather) {
            if (isHome) {
                this.elements.headerWeather.style.display = 'none';
            } else {
                this.elements.headerWeather.style.display = 'flex';
            }
        }
        if (!this.elements.networkStatus || !this.elements.timeDateDisplay) return;
        if (isHome) {
            this.elements.networkStatus.style.display = 'flex';
            this.elements.timeDateDisplay.style.display = 'none';
            this.updateNetworkStatus();
        } else {
            this.elements.networkStatus.style.display = 'none';
            this.elements.timeDateDisplay.style.display = 'flex';
        }
    }

    updateNetworkStatus() {
        if (!this.elements.networkStatus || !this.elements.networkLabel || !this.elements.networkSub) return;
        const online = navigator.onLine;
        this.elements.networkStatus.classList.toggle('offline', !online);
        this.elements.networkLabel.textContent = online ? 'T-Mobile US' : 'Offline';
        this.elements.networkSub.textContent = online ? 'Connected' : 'Tap to retry';
    }

    toggleWeatherSettings() {
        if (!this.elements.weatherToggle || !this.elements.weatherBody) return;
        const expanded = this.elements.weatherToggle.getAttribute('aria-expanded') === 'true';
        this.elements.weatherToggle.setAttribute('aria-expanded', (!expanded).toString());
        this.elements.weatherBody.classList.toggle('show', !expanded);
        this.elements.weatherBody.setAttribute('aria-hidden', expanded ? 'true' : 'false');
    }

    async fetchLocationName(coords) {
        if (!coords || !coords.latitude || !coords.longitude) return;
        if (this.weatherState.reverseLookupPending) return;
        this.weatherState.reverseLookupPending = true;
        try {
            const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${coords.latitude}&longitude=${coords.longitude}&count=1&language=en&format=json`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Reverse geocode failed');
            const data = await res.json();
            const first = data?.results?.[0];
            if (first) {
                const locName = `${first.name || 'Current location'}${first.admin1 ? ', ' + first.admin1 : ''}`;
                this.weatherState.locationName = locName;
                if (this.elements.weatherLocation) {
                    this.elements.weatherLocation.textContent = locName;
                }
                // Update header weather location
                if (this.elements.headerWeatherLocation) {
                    this.elements.headerWeatherLocation.textContent = locName;
                }
            }
        } catch (e) {
            if (this.config.DEBUG_MODE) console.warn('Reverse geocode failed', e);
        } finally {
            this.weatherState.reverseLookupPending = false;
        }
    }

    // ========== PULSE DASHBOARD ==========
    async loadPulseData(forceRefresh = false) {
        if (!this.elements.pulseGrid || !this.elements.pulseStatus) return;

        if (this.pulseLoaded && !forceRefresh) {
            this.renderPulseDashboard();
            return;
        }

        this.elements.pulseStatus.textContent = 'Loading pulse data...';
        this.elements.pulseStatus.style.display = 'block';
        this.elements.pulseGrid.innerHTML = '';

        try {
            const url = this.config.PULSE_SHEET_URL;
            if (!url) throw new Error('Pulse sheet URL missing');
            let res;
            try {
                res = await fetch(url, { cache: 'no-store' });
            } catch (directError) {
                for (const proxy of this.config.CORS_PROXIES || []) {
                    try {
                        res = await fetch(proxy + encodeURIComponent(url), { cache: 'no-store' });
                        if (res && res.ok) break;
                    } catch (proxyError) {
                        continue;
                    }
                }
            }

            if (!res || !res.ok) throw new Error(`HTTP ${res ? res.status : 'No response'}`);

            const csvText = await res.text();
            this.pulseData = this.parsePulseCSV(csvText);
            this.pulseLoaded = true;
            this.pulseUpdatedAt = new Date();
            this.renderPulseDashboard();
        } catch (error) {
            console.error('Failed to load pulse data:', error);
            this.pulseLoaded = false;
            this.elements.pulseStatus.textContent = 'Unable to load pulse data';
            this.elements.pulseStatus.style.display = 'block';
            if (this.elements.pulseUpdatedAt) {
                this.elements.pulseUpdatedAt.textContent = 'Refresh to retry';
            }
        }
    }

    parsePulseCSV(csvText) {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) return [];
        const rows = lines.map(line => this.parseCSVLine(line));
        const entries = [];

        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i];
            const store = (cells[1] || '').trim();
            if (!store) continue;

            const entry = {
                store,
                traffic: this.parseNumeric(cells[2]),
                postpaidGoal: this.parseNumeric(cells[4]),
                postpaidAttainmentText: this.parsePercentValue(cells[5]),
                postRate: this.parsePercentValue(cells[7]),
                btsRate: this.parsePercentValue(cells[8]),
                t4bRate: this.parsePercentValue(cells[9]),
                vlGoal: this.parseNumeric(cells[10]),
                btsGoal: this.parseNumeric(cells[11]),
                hsiGoal: this.parseNumeric(cells[12]),
                postpaidActual: this.parseNumeric(cells[13]),
                netRevGoal: this.parseNumeric(cells[14]),
                netRevActual: this.parseNumeric(cells[15]),
                vlActual: this.parseNumeric(cells[16]),
                btsActual: this.parseNumeric(cells[17]),
                hsiActual: this.parseNumeric(cells[18]),
                t4bActual: this.parseNumeric(cells[19]),
                netRevenue: this.parseNumeric(cells[20]),
                p360: this.parseNumeric(cells[21]),
                accActual: this.parseNumeric(cells[22]),
                accGoal: this.parseNumeric(cells[23]),
                accAttainmentText: this.parsePercentValue(cells[24]),
                dailyGoal: this.parseNumeric(cells[25]),
                gap: this.parseNumeric(cells[27])
            };

            entry.postpaidAttainment = this.computeAttainment(entry.postpaidActual, entry.postpaidGoal, entry.postpaidAttainmentText);
            entry.accAttainment = this.computeAttainment(entry.accActual, entry.accGoal, entry.accAttainmentText);

            const hasValues = entry.postpaidActual !== null || entry.postpaidGoal !== null || entry.accActual !== null;
            if (hasValues) {
                entries.push(entry);
            }
        }

        return entries;
    }

    parseNumeric(value) {
        if (value === undefined || value === null) return null;
        const cleaned = value.toString().replace(/[^0-9.-]/g, '');
        if (!cleaned) return null;
        const num = parseFloat(cleaned);
        return Number.isFinite(num) ? num : null;
    }

    parsePercentValue(value) {
        const num = this.parseNumeric(value);
        return num === null ? null : num;
    }

    computeAttainment(actual, goal, pctFromSheet) {
        if (Number.isFinite(pctFromSheet)) return pctFromSheet;
        if (Number.isFinite(goal) && goal > 0 && Number.isFinite(actual)) {
            const pct = (actual / goal) * 100;
            return Number.isFinite(pct) ? pct : null;
        }
        return null;
    }

    renderPulseDashboard() {
        if (!this.elements.pulseGrid || !this.elements.pulseStatus) return;

        if (!this.pulseData || this.pulseData.length === 0) {
            this.elements.pulseStatus.textContent = 'No pulse data available';
            this.elements.pulseStatus.style.display = 'block';
            this.elements.pulseGrid.innerHTML = '';
            return;
        }

        this.elements.pulseStatus.style.display = 'none';

        const cards = [];
        const dataCopy = [...this.pulseData];
        const totalIdx = dataCopy.findIndex(item => item.store.toLowerCase() === 'total');
        if (totalIdx >= 0) {
            const [totalEntry] = dataCopy.splice(totalIdx, 1);
            cards.push(this.renderPulseCard(totalEntry, true));
        }

        dataCopy
            .filter(item => item.store.toLowerCase() !== 'hu$tler$')
            .forEach((entry, idx) => cards.push(this.renderPulseCard(entry, false, idx)));

        this.elements.pulseGrid.innerHTML = cards.join('');

        if (this.elements.pulseUpdatedAt && this.pulseUpdatedAt) {
            const ts = this.pulseUpdatedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            this.elements.pulseUpdatedAt.textContent = `Updated ${ts}`;
        }
    }

    renderPulseCard(entry, isTotal = false, idx = 0) {
        const attainmentClass = this.getAttainmentClass(entry.postpaidAttainment);
        const pctLabel = this.formatPercent(entry.postpaidAttainment);
        const traffic = entry.traffic ? `<div class="pulse-traffic">Traffic ${this.formatNumber(entry.traffic)}</div>` : '';
        const collapsedClass = isTotal ? '' : 'collapsed';
        return `
            <div class="pulse-card ${isTotal ? 'pulse-card-total' : ''} ${collapsedClass}" data-pulse-card="${idx}">
                <button class="pulse-card-header" type="button" aria-expanded="${!collapsedClass}">
                    <div class="pulse-card-title">
                        <div class="pulse-store">${entry.store}</div>
                        ${traffic}
                    </div>
                    <div class="pulse-header-right">
                        ${pctLabel ? `<div class="pulse-chip ${attainmentClass}">${pctLabel}</div>` : '<div class="pulse-chip muted">--</div>'}
                        <span class="pulse-caret"><i class="fas fa-chevron-down"></i></span>
                    </div>
                </button>
                <div class="pulse-card-body">
                    ${this.renderPulseSummary(entry)}
                    <div class="pulse-kpi-grid">
                        ${this.renderPulseKpi('VL', entry.vlActual, entry.vlGoal)}
                        ${this.renderPulseKpi('BTS', entry.btsActual, entry.btsGoal)}
                        ${this.renderPulseKpi('HSI', entry.hsiActual, entry.hsiGoal)}
                        ${this.renderPulseKpi('Acc', entry.accActual, entry.accGoal, entry.accAttainment, { currency: true })}
                    </div>
                </div>
            </div>
        `;
    }

    renderPulseSummary(entry) {
        const actualLabel = this.formatNumber(entry.postpaidActual);
        const goalLabel = entry.postpaidGoal ? this.formatNumber(entry.postpaidGoal) : '—';
        const pctLabel = this.formatPercent(entry.postpaidAttainment);
        const attainmentClass = this.getAttainmentClass(entry.postpaidAttainment);
        const gapLabel = Number.isFinite(entry.gap) ? ` · Gap ${this.formatNumber(entry.gap)}` : '';
        return `
            <div class="pulse-metric primary">
                <div>
                    <div class="pulse-metric-label">Total Postpaid</div>
                    <div class="pulse-metric-sub">${goalLabel !== '—' ? `Goal ${goalLabel}` : 'Goal —'}${gapLabel}</div>
                </div>
                <div class="pulse-metric-value-group">
                    <div class="pulse-metric-value">${actualLabel}</div>
                    ${pctLabel ? `<div class="pulse-chip ${attainmentClass}">${pctLabel}</div>` : ''}
                </div>
            </div>
        `;
    }

    renderPulseKpi(label, actual, goal, attainment = null, options = {}) {
        const isCurrency = options.currency || false;
        const actualLabel = this.formatDisplayValue(actual, { currency: isCurrency });
        const goalLabel = goal ? this.formatDisplayValue(goal, { currency: isCurrency }) : '—';
        const pct = attainment ?? this.computeAttainment(actual, goal, null);
        const pctLabel = this.formatPercent(pct);
        const chipClass = this.getAttainmentClass(pct);
        return `
            <div class="pulse-kpi">
                <div class="pulse-kpi-header">
                    <span>${label}</span>
                    ${pctLabel ? `<span class="pulse-chip mini ${chipClass}">${pctLabel}</span>` : ''}
                </div>
                <div class="pulse-kpi-value">${actualLabel}</div>
                <div class="pulse-kpi-sub">${goalLabel !== '—' ? `Goal ${goalLabel}` : 'Goal —'}</div>
            </div>
        `;
    }

    formatDisplayValue(value, { currency = false } = {}) {
        if (!Number.isFinite(value)) return '--';
        return currency ? this.formatCurrency(value) : this.formatNumber(value);
    }

    formatNumber(value) {
        if (!Number.isFinite(value)) return '--';
        return Number(value).toLocaleString('en-US');
    }

    formatCurrency(value) {
        if (!Number.isFinite(value)) return '--';
        return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    }

    formatPercent(value) {
        if (!Number.isFinite(value)) return '';
        if (Math.abs(value) >= 100) {
            return `${Math.round(value)}%`;
        }
        if (Math.abs(value) >= 10) {
            return `${value.toFixed(0)}%`;
        }
        return `${value.toFixed(1)}%`;
    }

    getAttainmentClass(value) {
        if (!Number.isFinite(value)) return 'muted';
        if (value >= 100) return 'success';
        if (value >= 85) return 'warn';
        return 'alert';
    }

    // ========== PROMOTIONS ==========
    async loadPromos(forceRefresh = false) {
        if (!this.elements.promoList || !this.elements.promoStatus) return;

        if (this.promosLoaded && !forceRefresh) return;

        this.elements.promoStatus.textContent = 'Loading promotions...';
        this.elements.promoStatus.style.display = 'block';
        this.elements.promoEmpty.style.display = 'none';
        this.elements.promoList.innerHTML = '';

        try {
            const res = await fetch(this.config.PROMO_SHEET_URL, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const csvText = await res.text();
            this.promos = this.parsePromoCSV(csvText);
            this.promosLoaded = true;
            const sourceLabel = res.url ? `Promos · ${new URL(res.url).hostname}` : 'Promos · Google Sheets';
            this.recordDataUpdate('promos', sourceLabel);
            this.renderPromos();
        } catch (error) {
            console.error('Failed to load promos:', error);
            this.elements.promoStatus.textContent = 'Failed to load promotions';
        }
    }

    parsePromoCSV(csvText) {
        const lines = csvText.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) return [];
        const headers = this.parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
        const promos = [];
        for (let i = 1; i < lines.length; i++) {
            const row = this.parseCSVLine(lines[i]);
            if (!row.length) continue;
            const obj = {};
            headers.forEach((h, idx) => {
                obj[h] = row[idx] || '';
            });
            // Basic required fields - check for new column names
            if (obj['promo name'] || obj['promo id']) {
                // Determine promo type from Activation Type field
                obj.__type = this.getPromoType(obj['activation type'] || '');
                promos.push(obj);
            }
        }
        return promos;
    }

    renderPromos() {
        const listEl = this.elements.promoList;
        const statusEl = this.elements.promoStatus;
        const emptyEl = this.elements.promoEmpty;
        if (!listEl || !statusEl || !emptyEl) return;

        const filtered = (this.promos || []).filter(p => {
            if (this.promoFilter === 'all') return true;
            return p.__type === this.promoFilter;
        });

        if (!filtered || filtered.length === 0) {
            statusEl.style.display = 'none';
            emptyEl.style.display = 'block';
            listEl.innerHTML = '';
            return;
        }

        statusEl.style.display = 'none';
        emptyEl.style.display = 'none';

        const cards = filtered.map(promo => {
            const name = promo['promo name'] || 'Unnamed Promo';
            const category = promo['category'] || '—';
            const subcategory = promo['subcategory'] || '';
            const device = promo['device'] || 'Devices vary';
            const activationType = promo['activation type'] || '—';
            const tradeRequired = promo['trade required'] || '—';
            const tradeCondition = promo['trade condition'] || '';
            const maxPromoValue = promo['max promo value'] || 'See details';
            const tierValues = promo['tier values'] || '';
            const ratePlanReq = promo['rate plan requirement'] || '—';
            const eligibleSegments = promo['eligible segments'] || '—';
            const stackableNotes = promo['stackable notes'] || '';
            const promoStart = promo['promo start'] || '';
            const promoEnd = promo['promo end'] || '';
            const promoId = promo['promo id'] || '';
            const typeLabel = this.getPromoTypeLabel(promo.__type);
            
            // Build date range string
            const dateRange = promoStart && promoEnd ? `${promoStart} - ${promoEnd}` : 
                             promoStart ? `Starts: ${promoStart}` : 
                             promoEnd ? `Ends: ${promoEnd}` : '—';

            return `
                <div class="promo-card">
                    <div class="promo-card-header">
                        <div class="promo-name">${name}</div>
                        <div class="promo-chip">${typeLabel}</div>
                    </div>
                    <div class="promo-meta">
                        <div><strong>Promo ID</strong>${promoId}</div>
                        <div><strong>Category</strong>${category}${subcategory ? ` - ${subcategory}` : ''}</div>
                        <div><strong>Device</strong>${device}</div>
                        <div><strong>Activation Type</strong>${activationType}</div>
                        <div><strong>Max Promo Value</strong>${maxPromoValue}${tierValues ? ` (${tierValues})` : ''}</div>
                        <div><strong>Trade Required</strong>${tradeRequired}${tradeCondition ? ` - ${tradeCondition}` : ''}</div>
                        <div><strong>Rate Plan Requirement</strong>${ratePlanReq}</div>
                        <div><strong>Eligible Segments</strong>${eligibleSegments}</div>
                        <div><strong>Promo Period</strong>${dateRange}</div>
                    </div>
                    ${stackableNotes ? `<div class="promo-notes"><strong>Notes:</strong> ${stackableNotes}</div>` : ''}
                </div>
            `;
        }).join('');

        listEl.innerHTML = cards;
        this.updatePromoFilterUI();
    }

    setPromoFilter(filter) {
        this.promoFilter = filter || 'all';
        this.renderPromos();
    }

    updatePromoFilterUI() {
        if (!this.elements.promoFilters) return;
        const buttons = this.elements.promoFilters.querySelectorAll('.promo-filter-btn');
        buttons.forEach(btn => {
            const f = btn.dataset.filter || 'all';
            btn.classList.toggle('active', f === this.promoFilter);
        });
    }

    getPromoType(activationType) {
        const text = (activationType || '').toLowerCase();
        const hasPort = text.includes('port');
        const hasNew = text.includes('new line') || text.includes('new-line') || text.includes('new') || text.includes('(y)');
        const hasUpgrade = text.includes('upgrade');

        if (hasUpgrade) return 'upgrade';
        if (hasNew && hasPort) return 'new-port';
        if (hasNew) return 'new';
        return 'other';
    }

    getPromoTypeLabel(type) {
        if (type === 'upgrade') return 'Upgrade';
        if (type === 'new-port') return 'New line + port';
        if (type === 'new') return 'New line';
        return 'Promo';
    }

    getWeatherLabel(code) {
        const map = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Fog',
            48: 'Fog',
            51: 'Light drizzle',
            53: 'Drizzle',
            55: 'Dense drizzle',
            61: 'Light rain',
            63: 'Rain',
            65: 'Heavy rain',
            71: 'Snow',
            80: 'Showers',
            95: 'Thunderstorms'
        };
        return map[code] || 'Weather';
    }

    getWeatherIcon(code) {
        if (code === 0) return '<i class="fas fa-sun"></i>';
        if ([1, 2].includes(code)) return '<i class="fas fa-cloud-sun"></i>';
        if (code === 3) return '<i class="fas fa-cloud"></i>';
        if ([45, 48].includes(code)) return '<i class="fas fa-smog"></i>';
        if ([51, 53, 55, 61, 63, 65, 80].includes(code)) return '<i class="fas fa-cloud-rain"></i>';
        if (code === 71) return '<i class="fas fa-snowflake"></i>';
        if (code === 95) return '<i class="fas fa-bolt"></i>';
        return '<i class="fas fa-cloud"></i>';
    }

    renderHourlyForecast(hourly) {
        if (!this.elements.weatherForecastHours) return;
        const now = new Date();
        const hours = hourly?.time || [];
        const temps = hourly?.temperature_2m || [];
        const codes = hourly?.weather_code || [];
        const items = [];
        for (let i = 0; i < hours.length && items.length < 3; i++) {
            const ts = new Date(hours[i]);
            if (ts <= now) continue;
            const hourLabel = ts.toLocaleTimeString('en-US', { hour: 'numeric' });
            const fTemp = Math.round(temps[i]);
            const fCode = codes[i];
            const icon = this.getWeatherIcon(fCode);
            items.push(`
                <div class="forecast-pill">
                    <div class="forecast-icon">${icon}</div>
                    <div class="forecast-meta">
                        <div class="forecast-hour">${hourLabel}</div>
                        <div class="forecast-temp">${fTemp}°</div>
                    </div>
                </div>
            `);
        }
        this.elements.weatherForecastHours.innerHTML = items.join('') || '<div class="forecast-pill"><div class="forecast-meta">No hourly data</div></div>';
    }

    renderDailyForecast(daily) {
        if (!this.elements.weatherForecastDays) return;
        const times = daily?.time || [];
        const maxes = daily?.temperature_2m_max || [];
        const mins = daily?.temperature_2m_min || [];
        const codes = daily?.weather_code || [];
        const items = [];
        const now = new Date();
        const seventyTwoHours = 72 * 60 * 60 * 1000;

        // Collect daily forecasts within the next 72 hours (beyond now)
        const future = [];
        for (let i = 0; i < times.length; i++) {
            const ts = new Date(times[i]);
            const diff = ts.getTime() - now.getTime();
            if (diff <= 0) continue; // skip past or current day
            if (diff <= seventyTwoHours) {
                future.push({
                    ts,
                    hi: Math.round(maxes[i]),
                    lo: Math.round(mins[i]),
                    code: codes[i]
                });
            }
        }

        // If fewer than 3 entries, fall back to the first future days even if beyond 72h
        if (future.length < 3) {
            for (let i = 0; i < times.length && future.length < 3; i++) {
                const ts = new Date(times[i]);
                if (ts.getTime() <= now.getTime()) continue;
                // avoid duplicates
                if (future.some(f => f.ts.getTime() === ts.getTime())) continue;
                future.push({
                    ts,
                    hi: Math.round(maxes[i]),
                    lo: Math.round(mins[i]),
                    code: codes[i]
                });
            }
        }

        const selected = future.slice(0, 3);

        selected.forEach(d => {
            const dayLabel = d.ts.toLocaleDateString('en-US', { weekday: 'short' });
            const icon = this.getWeatherIcon(d.code);
            items.push(`
                <div class="forecast-pill">
                    <div class="forecast-icon">${icon}</div>
                    <div class="forecast-meta">
                        <div class="forecast-hour">${dayLabel}</div>
                        <div class="forecast-temp">H ${d.hi}° / L ${d.lo}°</div>
                    </div>
                </div>
            `);
        });
        this.elements.weatherForecastDays.innerHTML = items.join('') || '<div class="forecast-pill"><div class="forecast-meta">No daily data</div></div>';
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
        if (!this.scheduleWeeks || this.scheduleWeeks.length === 0) return;
        const total = this.scheduleWeeks.length;
        this.currentWeekIndex = (this.currentWeekIndex + direction + total) % total;
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
        this.renderShiftTrack();
        this.updateShiftTrackVisibility();
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
        
        // Group by employee and day, and collect dates
        const employeeSchedule = {};
        const days = ['THU', 'FRI', 'SAT', 'SUN', 'MON', 'TUE', 'WED'];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Pre-fill dayDateMap from the week's start date so date labels always render
        const dayDateMap = {};
        if (currentWeek?.startDate) {
            const weekStart = new Date(currentWeek.startDate);
            days.forEach((day, idx) => {
                const d = new Date(weekStart);
                d.setDate(weekStart.getDate() + idx);
                dayDateMap[day] = {
                    date: d,
                    dateStr: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
                };
            });
        }
        
        // Fill schedules and override with actual shift dates if present
        weekData.forEach(shift => {
            if (!employeeSchedule[shift.employee]) {
                employeeSchedule[shift.employee] = {};
            }
            employeeSchedule[shift.employee][shift.day] = shift;
            
            dayDateMap[shift.day] = {
                date: new Date(shift.date),
                dateStr: shift.dateStr
            };
        });
        
        // Create table
        let tableHTML = '<table class="schedule-table responsive-table"><thead><tr><th>Employee</th>';
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
            tableHTML += `<tr><td class="employee-cell" data-employee="${employee}">${employee}</td>`;
            days.forEach(day => {
                const shift = employeeSchedule[employee][day];
                const dayData = dayDateMap[day];
                const dateStr = dayData ? dayData.dateStr : '';
                if (shift) {
                    tableHTML += `<td class="schedule-cell" data-day="${day}" data-date="${dateStr}" data-employee="${employee}" data-time="${shift.timeRange}"><div class="schedule-time">${shift.timeRange}</div></td>`;
                } else {
                    tableHTML += `<td class="schedule-cell empty" data-day="${day}" data-date="${dateStr}" data-employee="${employee}" data-time="Off"><div class="schedule-time">Off</div></td>`;
                }
            });
            tableHTML += '</tr>';
        });
        
        tableHTML += '</tbody></table>';
        this.elements.weeklyScheduleTable.innerHTML = tableHTML;
    }


    parseShiftTime(timeStr, baseDate) {
        if (!timeStr) return null;
        const normalized = timeStr.toString().trim().toLowerCase().replace(/\s+/g, '');
        const date = new Date(baseDate);
        let hours = null;
        let minutes = 0;
        
        // Matches 9a, 9am, 9:30a, 09:30pm etc.
        const amPmMatch = normalized.match(/(\d{1,2})(?::?(\d{2}))?(am|pm|a|p)$/);
        const twentyFourMatch = normalized.match(/(\d{1,2}):(\d{2})$/);
        
        if (amPmMatch) {
            hours = parseInt(amPmMatch[1], 10);
            minutes = parseInt(amPmMatch[2] || '0', 10);
            const suffix = amPmMatch[3];
            if (suffix.startsWith('p') && hours < 12) hours += 12;
            if (suffix.startsWith('a') && hours === 12) hours = 0;
        } else if (twentyFourMatch) {
            hours = parseInt(twentyFourMatch[1], 10);
            minutes = parseInt(twentyFourMatch[2], 10);
        }
        
        if (hours === null || isNaN(hours) || isNaN(minutes)) return null;
        
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    formatShiftTime(dateObj, fallback = '--') {
        if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return fallback;
        return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    renderShiftTrack() {
        if (!this.elements.shiftTrackList || !this.elements.shiftTrackSubtitle) return;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Subtitle showing today's date
        this.elements.shiftTrackSubtitle.textContent = today.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
        
        const todayShifts = this.getScheduleForDate(today);
        this.elements.shiftTrackList.innerHTML = '';
        
        if (!todayShifts || todayShifts.length === 0) {
            if (this.elements.shiftTrackEmpty) {
                this.elements.shiftTrackEmpty.style.display = 'block';
            }
            return;
        }
        
        if (this.elements.shiftTrackEmpty) {
            this.elements.shiftTrackEmpty.style.display = 'none';
        }
        
        const now = new Date();
        const sortedShifts = [...todayShifts].sort((a, b) => {
            const startA = this.parseShiftTime(a.startTime, today);
            const startB = this.parseShiftTime(b.startTime, today);
            return (startA?.getTime() || 0) - (startB?.getTime() || 0);
        });
        
        sortedShifts.forEach(shift => {
            const start = this.parseShiftTime(shift.startTime, today);
            const end = this.parseShiftTime(shift.endTime, today);
            
            let status = 'upcoming';
            let statusLabel = 'Not started';
            let statusIcon = 'fa-clock';
            let progress = 0;
            
            if (start && end) {
                if (now >= end) {
                    status = 'done';
                    statusLabel = 'Completed';
                    statusIcon = 'fa-check';
                    progress = 100;
                } else if (now >= start) {
                    status = 'live';
                    statusLabel = 'On shift';
                    statusIcon = 'fa-play';
                    const duration = end.getTime() - start.getTime();
                    const elapsed = now.getTime() - start.getTime();
                    progress = Math.max(0, Math.min(100, (elapsed / duration) * 100));
                }
            }
            
            const startLabel = this.formatShiftTime(start, shift.startTime || '--');
            const endLabel = this.formatShiftTime(end, shift.endTime || '--');
            const timeLabel = `${startLabel} - ${endLabel}`;
            
            const card = document.createElement('div');
            card.className = 'shift-card';
            card.innerHTML = `
                <div class="shift-card-header">
                    <div>
                        <div class="shift-employee">${shift.employee}</div>
                        <div class="shift-time">${timeLabel}</div>
                    </div>
                    <div class="shift-status ${status}">
                        <i class="fas ${statusIcon}"></i>
                        <span>${statusLabel}</span>
                    </div>
                </div>
                <div class="shift-progress-track">
                    <div class="shift-progress-bar" style="width: ${progress}%;"></div>
                </div>
                <div class="shift-progress-meta">
                    <span>${startLabel}</span>
                    <span>${endLabel}</span>
                </div>
            `;
            
            this.elements.shiftTrackList.appendChild(card);
        });
    }

    async refreshShiftTrack() {
        try {
            await this.loadScheduleData();
            this.renderShiftTrack();
            this.showToast('Shift track updated', 'success');
        } catch (error) {
            console.error('Failed to refresh shift track:', error);
            this.showToast('Could not refresh shifts', 'error');
        }
    }

    toggleShiftTrackCollapse() {
        if (!this.elements.shiftTrackBody || !this.elements.shiftTrackToggle) return;
        const isExpanded = this.elements.shiftTrackToggle.getAttribute('aria-expanded') === 'true';
        this.elements.shiftTrackToggle.setAttribute('aria-expanded', String(!isExpanded));
        if (isExpanded) {
            this.elements.shiftTrackBody.classList.add('collapsed');
        } else {
            this.elements.shiftTrackBody.classList.remove('collapsed');
        }
    }

    updateShiftTrackVisibility() {
        if (!this.elements.shiftTrackSection) return;
        this.elements.shiftTrackSection.style.display = '';
        if (this.elements.shiftTrackBody) {
            this.elements.shiftTrackBody.classList.remove('collapsed');
        }
        if (this.elements.shiftTrackToggle) {
            this.elements.shiftTrackToggle.setAttribute('aria-expanded', 'true');
        }
    }
    
    clearDataCaches() {
        localStorage.removeItem(this.config.CACHE_KEY);
        localStorage.removeItem('lastDataUpdate');
        localStorage.removeItem('lastDataSource');
        localStorage.removeItem('lastDataUpdates');
        localStorage.removeItem(this.config.SCHEDULE_CACHE_KEY);
        localStorage.removeItem('lastScheduleUpdate');
    }

    async refreshAllData({ force = false, silent = false, reason = 'manual' } = {}) {
        if (this.refreshInFlight) {
            if (this.config.DEBUG_MODE) console.log('Refresh skipped, already running');
            return;
        }
        this.refreshInFlight = true;
        if (!silent) this.showLoading('Refreshing data...');
        if (force) this.clearDataCaches();
        try {
            await Promise.all([
                this.loadData({ force: true, silent: true }),
                this.loadScheduleData(true),
                this.loadPromos(true),
                this.loadPulseData(true)
            ]);
            this.updateDataStatusUI();
            if (!silent) this.showToast('Data refreshed successfully', 'success');
            this.initializeDeviceFlow();
        } catch (error) {
            console.error('Failed to refresh data:', error);
            if (!silent) this.showToast('Failed to refresh data', 'error');
        } finally {
            if (!silent) this.hideLoading();
            this.refreshInFlight = false;
            if (this.config.DEBUG_MODE) console.log('Refresh completed', { reason });
        }
    }

    startAutoRefreshLoop() {
        const interval = this.config.AUTO_REFRESH_INTERVAL_MS || 150000;
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        this.autoRefreshInterval = setInterval(() => {
            this.refreshAllData({ force: true, silent: true, reason: 'auto-interval' });
        }, interval);
    }

    async refreshData() {
        await this.refreshAllData({ force: true, silent: false, reason: 'manual' });
        this.closeSettings();
    }
    
    async clearCachesAndStorage() {
        // Clear all localStorage
        localStorage.clear();
        // Clear caches
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        // Unregister service workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));
        }
    }

    async forceUpdateReload() {
        try {
            await this.clearCachesAndStorage();
        } catch (error) {
            console.error('Failed to clear caches before reload', error);
        }
        // Force hard reload with cache bypass to get latest version
        window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
        setTimeout(() => window.location.reload(true), 500);
    }

    async handleServiceWorkerUpdate() {
        if (this.config.DEBUG_MODE) console.log('Service worker update detected');
        this.showToast('App update found. Reloading...', 'info');
        await this.forceUpdateReload();
    }

    async updateApp() {
        try {
            this.showLoading('Updating app to latest version...');
            await this.clearCachesAndStorage();
            this.hideLoading();
            this.showToast('App updated. Reloading...', 'success');
            this.closeSettings();
            setTimeout(() => this.forceUpdateReload(), 500);
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
                                // New service worker available, force reload after clearing caches
                                if (window.app && typeof window.app.handleServiceWorkerUpdate === 'function') {
                                    window.app.handleServiceWorkerUpdate();
                                } else {
                                    window.location.reload();
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