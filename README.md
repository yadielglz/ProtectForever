# StoreView / ProtectForever

A modern React PWA for looking up device protection UPC codes and MDN numbers from Google Sheets data. Dark theme, passcode lock, clock & weather.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
npm run preview   # Local test of production build
```

## Deploy (GitHub Pages)

Pushes to `main` trigger an automatic build and deploy via GitHub Actions.

1. In the repo: **Settings → Pages** → Source: **GitHub Actions**.
2. Push to `main` (or run the "Deploy to GitHub Pages" workflow manually).
3. Live site: **https://yadielglz.github.io/ProtectForever/**

## 🚀 Features

- **Live Google Sheets Integration** - Automatically syncs with your Google Sheets
- **CORS Proxy Support** - Multiple fallback methods for reliable data access
- **Smart Caching** - Reduces API calls and improves performance
- **Real-time Status** - Shows connection status and data loading progress
- **Mobile Responsive** - Works perfectly on all devices
- **Offline Support** - Falls back to local data when needed

## 📋 Setup Instructions

### Method 1: CORS Proxies (Recommended - No API Key Required)

1. **Open `config.js`** and verify your Google Sheets URL is correct
2. **Make sure your Google Sheet is set to "Anyone with the link can view"**
3. **Run `npm run dev`** and open http://localhost:5173

The app will automatically try multiple CORS proxies to fetch your data.

### Method 2: Google Sheets API v4 (More Reliable)

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project** or select an existing one
3. **Enable the Google Sheets API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. **Create an API Key**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your API key
5. **Update `config.js`**:
   ```javascript
   USE_GOOGLE_API: true,
   GOOGLE_API_KEY: 'your-actual-api-key-here'
   ```

## 📊 Google Sheets Format

Your Google Sheet should have these columns:

| Column | Description | Example |
|--------|-------------|---------|
| MDN | Mobile Directory Number | 7869913289 |
| Device Brand | Device manufacturer | Apple |
| Device Model | Specific device model | iPhone 16 Pro Max |
| Brand | Protection brand | GoTo, ZAGG, IS GLS |
| Type | Protection type | Clear, Privacy, VG |
| UPC | Universal Product Code | 2161 |
| Available | Availability status | ✅, true, yes |

## 🔧 Configuration

Edit `src/config.js` to customize:

```javascript
// In src/config.js
export const CONFIG = {
    // Your Google Sheets URL
    GOOGLE_SHEETS_URL: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit?usp=sharing',
    
    // Use Google Sheets API (more reliable)
    USE_GOOGLE_API: false,
    GOOGLE_API_KEY: 'YOUR_GOOGLE_API_KEY_HERE',
    
    // Cache duration (5 minutes)
    CACHE_DURATION: 5 * 60 * 1000,
    
    // Debug mode
    DEBUG_MODE: true
};
```

## 🛠️ Troubleshooting

### CORS Errors
If you see CORS errors in the console:
1. **Try the refresh button** - it will attempt different proxies
2. **Enable Google Sheets API** - more reliable than CORS proxies
3. **Check your sheet permissions** - must be "Anyone with the link can view"

### No Data Loading
1. **Check the console** for error messages
2. **Verify your Google Sheets URL** in `config.js`
3. **Make sure your sheet has the correct column headers**
4. **Try the refresh button** to force a new data fetch

### API Key Issues
1. **Make sure Google Sheets API is enabled** in Google Cloud Console
2. **Check your API key** is correct in `config.js`
3. **Verify API key permissions** allow reading public sheets

## 📱 Usage

1. **Select a device** from the dropdown menu
2. **View protection options** with UPC codes (last 4 digits)
3. **Click "Show MDN"** to reveal the MDN number
4. **Use the refresh button** to get latest data from Google Sheets

## 🔄 Data Updates

- **Automatic**: Data refreshes when you reload the page
- **Manual**: Click the refresh button in the bottom-right corner
- **Cached**: Data is cached for 5 minutes to improve performance

## 🎨 Customization

- **Colors**: Edit the CSS variables in `styles.css`
- **Layout**: Modify the HTML structure in `index.html`
- **Functionality**: Extend the JavaScript in `script.js`

## 📄 Project Structure

- `src/` - React components, hooks, utils
- `src/config.js` - Configuration (passcode, sheets URL, weather ZIP)
- `src/components/` - PasscodeScreen, ProtectApp, Topbar, Settings, etc.
- `public/` - Static assets (logo.svg)
- `index.html` - Entry point

## 🔒 Privacy & Security

- **No data is stored** on external servers
- **All data processing** happens in your browser
- **Google Sheets API key** is only used to read your public sheet
- **CORS proxies** are used only for data fetching

## 🆘 Support

If you encounter issues:
1. **Check the browser console** for error messages
2. **Verify your Google Sheets setup** matches the requirements
3. **Try different browsers** to rule out browser-specific issues
4. **Enable debug mode** in `config.js` for detailed logging

## 📝 License

This project is open source and available under the MIT License.
