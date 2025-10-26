# ProtectForever App Flow Breakdown

## 🔄 Application Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    APP INITIALIZATION                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. DOM Ready Event Triggered                                    │
│     - cacheDOM() - Cache all DOM elements                       │
│     - setupEventListeners() - Attach event handlers              │
│     - setupInactivityTimeout() - Start security timer           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Check First Load (localStorage check)                       │
│     - If first load: Show splash screen                          │
│     - Else: Skip splash screen                                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                        │
    FIRST LOAD              SUBSEQUENT
         │                        │
         ▼                        ▼
┌─────────────────┐     ┌─────────────────────┐
│  3a. SPLASH     │     │  3b. SKIP SPLASH    │
│  SCREEN         │     │  - Show loading     │
│  (3 seconds)    │     │  - Load data        │
└────────┬────────┘     └──────────┬──────────┘
         │                         │
         └───────────┬─────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. DATA LOADING PHASE                                          │
│     - Check cache validity                                      │
│     - If valid: Use cached data                                 │
│     - Else: Fetch from Google Sheets                           │
│     - Fallback: Use default/offline data                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. SHOW PASSCODE SCREEN                                        │
│     - Display passcode keypad                                   │
│     - Enter: 4-digit passcode (default: 6974)                   │
│     - Timer: 20 seconds inactivity timeout                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. AUTHENTICATION                                              │
│     User inputs: 4 digits                                       │
│     - Valid passcode: Show main app                              │
│     - Invalid passcode: Show error, reset                       │
│     - 20s inactivity: Auto-lock                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   INCORRECT                  CORRECT
        │                         │
        ▼                         ▼
┌─────────────┐         ┌────────────────────────┐
│ RETRY ENTRY │         │  7. MAIN APP            │
│ Show error  │◄────┐   │  UNLOCKED               │
└─────────────┘     │   │  - Start timer display  │
                     │   │  - Initialize device   │
                     │   │    selection flow      │
                     │   └────────────────────────┘
                     │            │
                     │            ▼
                     │   ┌─────────────────────────────────────┐
                     │   │  8. DEVICE SELECTION FLOW           │
                     │   │     STEP 1: Choose Brand            │
                     │   │     - Show available brands         │
                     │   │     - User selects brand            │
                     │   └──────────┬──────────────────────────┘
                     │              │
                     │              ▼
                     │   ┌─────────────────────────────────────┐
                     │   │  9. STEP 2: Choose Model           │
                     │   │     - Filter by selected brand      │
                     │   │     - Show available models         │
                     │   │     - Sort by release order         │
                     │   └──────────┬──────────────────────────┘
                     │              │
                     │              ▼
                     │   ┌─────────────────────────────────────┐
                     │   │  10. SHOW DEVICE MODAL              │
                     │   │      - Display device info         │
                     │   │      - Show protection options       │
                     │   │      - Show UPCs & MDNs             │
                     │   └──────────┬──────────────────────────┘
                     │              │
                     │              ▼
                     │   ┌─────────────────────────────────────┐
                     │   │  11. USER ACTIONS                   │
                     │   │      - Copy UPC/MDN                 │
                     │   │      - Refresh data                 │
                     │   │      - New search                   │
                     │   │      - Back to brand selection      │
                     │   └─────────────────────────────────────┘
                     │
                     ▼
         ┌─────────────────────────────────┐
         │  12. TIMER COUNTDOWN            │
         │     - Every 500ms update       │
         │     - Warn at 10s remaining     │
         │     - Critical at 5s remaining  │
         │     - Auto-lock at 0s           │
         └─────────────────────────────────┘
                     │
                     ▼
         ┌─────────────────────────────────┐
         │  13. INACTIVITY TIMEOUT         │
         │     - User inactive 20s         │
         │     - Lock app                  │
         │     - Return to passcode       │
         └─────────────────────────────────┘
```

## 📱 Screen Flow Breakdown

### **Screen 1: Splash Screen** (First Load Only)
- Duration: 3 seconds
- Shows: App logo, title, loading spinner
- Purpose: Brand introduction
- Animation: Fade in → Float → Fade out

### **Screen 2: Passcode Screen**
- Purpose: Security authentication
- Components:
  - Logo icon with rotation animation
  - App title "Protect"
  - 4 dot passcode indicator
  - 3x4 keypad grid
  - Error message (hidden until error)
- Functionality:
  - Accept digit input
  - Clear button (backspace)
  - Enter button (verify)
  - 20s inactivity timer

### **Screen 3: Main App (Home)**
- Components:
  - Navigation header (logo + time/date)
  - Welcome section
  - Brand selection grid
  - Bottom navigation (Home, Settings, Timer)

### **Screen 4: Model Selection**
- Same layout as Home
- Shows: Selected brand's models
- Features: Back button to brand selection
- Sort order: Oldest to newest

### **Screen 5: Device Modal**
- Shows: Device details, protection options
- Displays: UPC codes, MDN numbers
- Actions: Copy, refresh, new search

### **Screen 6: Settings Menu**
- Slides in from right
- Options: Refresh data, clear cache, reload app
- Background blur effect

## ⚙️ Core Systems Breakdown

### **1. Security System**
```
┌──────────────────────────────────────────────┐
│          PASSCODE SYSTEM                      │
├──────────────────────────────────────────────┤
│ • Code: 6974 (4 digits)                      │
│ • Storage: In-memory only                     │
│ • Timer: 20 seconds inactivity               │
│ • Auto-lock: On timeout                       │
│ • Display: 4 dots (filled/unfilled)          │
└──────────────────────────────────────────────┘
```

### **2. Timer System**
```
┌──────────────────────────────────────────────┐
│          INACTIVITY TIMER                     │
├──────────────────────────────────────────────┤
│ • Duration: 20 seconds                      │
│ • Update: Every 500ms                        │
│ • Reset on: Mouse, touch, scroll, keypress   │
│ • States:                                     │
│   - Normal: Green                             │
│   - Warning: Yellow (10s remaining)           │
│   - Critical: Red + Pulse (5s remaining)      │
│ • Action: Auto-lock app                      │
└──────────────────────────────────────────────┘
```

### **3. Data Flow**
```
┌──────────────────────────────────────────────┐
│          DATA LOADING STRATEGY                │
├──────────────────────────────────────────────┤
│ 1. Check localStorage cache                   │
│    ├─ Valid? (age < 5min)                    │
│    │  └─ Use cached data                     │
│    └─ Invalid or missing?                   │
│       └─ Fetch from source                   │
│                                                 │
│ 2. Fetch from Google Sheets                   │
│    ├─ Try direct fetch                        │
│    ├─ Try CORS proxies (fallback)             │
│    └─ Parse CSV data                          │
│                                                 │
│ 3. Fallback to offline data                   │
│    └─ Use hardcoded default devices            │
└──────────────────────────────────────────────┘
```

### **4. Event Listeners**
```
┌──────────────────────────────────────────────┐
│          EVENT SYSTEM                         │
├──────────────────────────────────────────────┤
│ • Click events: All buttons                    │
│ • Touch events: Mobile keypad                  │
│ • Timer reset: Mouse, touch, scroll, keypress │
│ • Modal close: Backdrop click                 │
│ • Swipe gestures: Modal dismissal             │
└──────────────────────────────────────────────┘
```

## 🎬 Animation Flow

### **Passcode Screen Entry**
```
Timeline: 0ms → 1100ms
├─ 0ms:    Screen fades in
├─ 200ms:  Header animates in
├─ 300ms:  Logo rotates in
├─ 500ms:  Title slides in
├─ 700ms:  Subtitle slides in
├─ 900ms:  Dots animate in
└─ 1100ms: Keypad completes entry
```

### **Main App Entry**
```
Timeline: 0ms → 700ms
├─ 0ms:   Passcode screen hides
├─ 300ms: Navigation fades in from top
├─ 500ms: Content slides up from bottom
└─ 700ms: Bottom nav completes
```

## 🔐 Security Features

1. **Passcode Protection**
   - 4-digit numeric only
   - No storage of attempts
   - Visual feedback on input

2. **Auto-Lock**
   - 20-second inactivity timeout
   - Visible countdown timer
   - Warning states before lock

3. **Session Management**
   - Proper cleanup on lock
   - Timer reset on activity
   - Secure state transitions

## 📊 Performance Optimizations

1. **Timer Optimization**
   - Changed from 100ms to 500ms intervals
   - Saves CPU cycles (80% reduction)

2. **Animation Optimization**
   - Removed duplicate CSS rules
   - Simplified transition timings
   - Better GPU acceleration

3. **Memory Management**
   - Proper interval cleanup
   - Timer null checks
   - Event listener cleanup

4. **Loading Strategy**
   - Cache-first approach
   - 5-minute cache duration
   - Fallback to offline data

## 🎯 User Journey

```
USER OPENS APP
     │
     ├─→ First Time? → Splash → Passcode
     │                          │
     └─→ Returning → Passcode   │
                              │
                    ENTER 4 DIGITS
                              │
                    ┌─────────┴─────────┐
                    │                   │
              INCORRECT             CORRECT
                    │                   │
                TRY AGAIN            SHOW APP
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                    SELECT BRAND          SETTINGS/TIMER
                              │                     │
                       SELECT MODEL          VIEW INFO
                              │                     │
                    SHOW OPTIONS            MODIFY SETTINGS
                              │                     │
                    COPY UPC/MDN           AUTO-LOCK (20s)
                              │                     │
                    NEW SEARCH ←───────────┘
```

---

This flow diagram shows how ProtectForever manages security, data, and user interactions across its screens and states.

