// Modern Mobile-First PWA JavaScript
class ProtectApp {
    constructor() {
        this.config = CONFIG;
        this.deviceData = [];
        this.currentPasscode = '';
        this.selectedBrand = null;
        this.selectedModel = null;
        this.inactivityTimer = null;
        this.isAuthenticated = false;
        
        // DOM Elements
        this.elements = {};
        
        // Device model sorting order (oldest to newest)
        this.deviceModelOrder = {
            'Apple': {
                'iPhone 12': 1,
                'iPhone 12 mini': 2,
                'iPhone 12 Pro': 3,
                'iPhone 12 Pro Max': 4,
                'iPhone 13': 5,
                'iPhone 13 mini': 6,
                'iPhone 13 Pro': 7,
                'iPhone 13 Pro Max': 8,
                'iPhone 14': 9,
                'iPhone 14 Plus': 10,
                'iPhone 14 Pro': 11,
                'iPhone 14 Pro Max': 12,
                'iPhone 15': 13,
                'iPhone 15 Plus': 14,
                'iPhone 15 Pro': 15,
                'iPhone 15 Pro Max': 16,
                'iPhone 16': 17,
                'iPhone 16 Plus': 18,
                'iPhone 16 Pro': 19,
                'iPhone 16 Pro Max': 20
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
        
        this.showLoading('Initializing Protect...');
            
            localStorage.removeItem(this.config.CACHE_KEY);
            localStorage.removeItem('lastDataUpdate');
            
            await this.loadData();
            this.hideLoading();
            setTimeout(() => {
                this.startTimeDateDisplay();
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
        this.elements.passcodeDots = document.querySelectorAll('.dot');
        this.elements.passcodeError = document.getElementById('passcodeError');
        this.elements.keypadKeys = document.querySelectorAll('.keypad-key');
        
        // Main app
        this.elements.mainApp = document.getElementById('mainApp');
        this.elements.settingsMenu = document.getElementById('settingsMenu');
        this.elements.closeSettings = document.getElementById('closeSettings');
        
        // Time and date display
        this.elements.timeDateDisplay = document.getElementById('timeDateDisplay');
        this.elements.currentTime = document.getElementById('currentTime');
        this.elements.currentDate = document.getElementById('currentDate');
        
        // Bottom navigation
        this.elements.settingsNavBtn = document.getElementById('settingsNavBtn');
        this.elements.timerNavBtn = document.getElementById('timerNavBtn');
        this.elements.timerNavLabel = document.getElementById('timerNavLabel');
        
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
        this.elements.refreshDataBtn = document.getElementById('refreshDataBtn');
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
        
        // Bottom navigation
        this.elements.settingsNavBtn.addEventListener('click', () => this.toggleSettings());
        this.elements.timerNavBtn.addEventListener('click', () => this.showTimerInfo());
        
        // Settings options
        this.elements.refreshDataBtn.addEventListener('click', () => this.refreshData());
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
            this.initializeDeviceFlow();
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
        this.elements.passcodeError.classList.add('show');
    setTimeout(() => {
            this.hidePasscodeError();
        }, 2000);
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
        if (this.deviceModelOrder[brand] && this.deviceModelOrder[brand][model]) {
            return this.deviceModelOrder[brand][model];
        }
        
        const yearMatch = model.match(/(\d{4})/);
        if (yearMatch) return parseInt(yearMatch[1]);
        
        const numberMatch = model.match(/(\d+)/);
        if (numberMatch) return parseInt(numberMatch[1]);
        
        return 9999;
    }
    
    populateModels(brand) {
        const getBrand = (d) => this.getField(d, ['Device Brand', 'Brand', 'DeviceBrand', 'BRAND', 'brand']);
        const getModel = (d) => this.getField(d, ['Device Model', 'Model', 'DeviceModel', 'MODEL', 'model']);
        
        const models = this.deviceData
            .filter(d => getBrand(d) === brand)
            .map(getModel)
            .filter(Boolean);
        
        const sortedModels = [...new Set(models)].sort((a, b) => {
            return this.getModelSortOrder(brand, a) - this.getModelSortOrder(brand, b);
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
        
        const availabilityBadge = isAvailable 
            ? '<span class="availability-badge available"><i class="fas fa-check-circle"></i> Available</span>'
            : '<span class="availability-badge unavailable"><i class="fas fa-times-circle"></i> Unavailable</span>';
        
        this.elements.deviceModel.innerHTML = `${deviceModel} ${availabilityBadge}`;
        
        const options = this.deviceData.filter(d => {
            const dBrand = this.getField(d, ['Device Brand', 'Brand', 'DeviceBrand', 'BRAND', 'brand']);
            const dModel = this.getField(d, ['Device Model', 'Model', 'DeviceModel', 'MODEL', 'model']);
            return dBrand === deviceBrand && dModel === deviceModel;
        });
        
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
                    mdns: new Set()
                };
            }
            
            groups[key].entries.push(option);
            
            const mdn = this.getField(option, ['MDN', 'mdn', 'MDN Number', 'mdn_number', 'phone']);
            if (mdn) {
                groups[key].mdns.add(mdn);
            }
        });
        
        return Object.values(groups);
    }
    
    createProtectionTypeCard(group, deviceModel) {
        const card = document.createElement('div');
        card.className = 'protection-card';
        const mdns = Array.from(group.mdns);
        
        const upcs = [...new Set(group.entries.map(e => {
            return this.getField(e, ['UPC', 'UPC Code', 'upc', 'UPCCode', 'UPC_CODE', 'BARCODE']);
        }).filter(Boolean))];
        
        card.innerHTML = `
            <div class="card-header">
                <div class="brand-info">
                    <div class="brand-logo">${group.brand.charAt(0)}</div>
                    <div class="brand-name">${group.brand}</div>
                </div>
                <div class="protection-type">${group.type}</div>
            </div>
            <div class="upc-info-section">
                <div class="upc-count">
                    <i class="fas fa-barcode"></i>
                    <span>${upcs.length} UPC${upcs.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="upc-list">
                    ${upcs.map(upc => `
                        <div class="upc-item">
                            <span class="upc-value">${upc}</span>
                            <button class="copy-button-small" onclick="app.copyUPC('${upc}')">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
            <button class="show-mdn-btn" onclick="app.showMdnForGroup('${group.brand}', '${group.type}', '${deviceModel}')">
                <i class="fas fa-eye"></i>
                <span>Show MDN${mdns.length > 1 ? 's' : ''} (${mdns.length})</span>
            </button>
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
        
        const mdns = [...new Set(matchingDevices.map(d => {
            return this.getField(d, ['MDN', 'mdn', 'MDN Number', 'mdn_number', 'phone']);
        }).filter(Boolean))];
        
        if (mdns.length === 0) {
            this.showToast('No MDN found for this product', 'warning');
            return;
        }
        
        const upcs = [...new Set(matchingDevices.map(d => {
            return this.getField(d, ['UPC', 'UPC Code', 'upc', 'UPCCode', 'UPC_CODE', 'BARCODE']);
        }).filter(Boolean))];
        
        // Create product label
        const productLabel = `${deviceModel} - ${brand} ${type}`.trim();
        
        // Show MDN(s) in a simplified modal
        this.showMdnModal(upcs, mdns, productLabel);
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
                        <h3>MDN(s) for Product</h3>
                        <p class="mdn-product-info">${productLabel}</p>
                        <p class="mdn-upc-info">UPC${upcArray.length > 1 ? 's' : ''}: ${upcDisplay}</p>
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
                            <label>MDN ${mdns.length > 1 ? index + 1 : ''}:</label>
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