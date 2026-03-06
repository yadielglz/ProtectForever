// Configuration for StoreView / ProtectForever
export const CONFIG = {
  GOOGLE_SHEETS_URL: 'https://docs.google.com/spreadsheets/d/1nj6k7ouNzxImks-9CEuYvkSkFQfgOeR43Py2c2XH2eU/export?format=csv&gid=0',
  CORS_PROXIES: [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://thingproxy.freeboard.io/fetch/',
  ],
  USE_GOOGLE_API: false,
  GOOGLE_API_KEY: 'YOUR_GOOGLE_API_KEY_HERE',
  CACHE_DURATION: 5 * 60 * 1000,
  CACHE_KEY: 'storeview_data_cache',
  APP_NAME: 'StoreView',
  APP_VERSION: '4.0 Build Z0305',
  STORE_HOURS: {
    DEFAULT: {
      MON_SAT: { OPEN: '10:00', CLOSE: '21:00' },
      SUNDAY: { OPEN: '12:00', CLOSE: '18:00' },
    },
    EXCEPTIONS: [
      { DATE: '12-21', OPEN: '10:00', CLOSE: '21:00', LABEL: 'Extended Hours' },
      { DATE: '12-24', OPEN: '10:00', CLOSE: '17:00', LABEL: 'Christmas Eve' },
      { DATE: '12-25', CLOSED: true, LABEL: 'Christmas Day' },
      { DATE: '12-31', OPEN: '10:00', CLOSE: '18:00', LABEL: "New Year's Eve" },
      { DATE: '01-01', OPEN: '12:00', CLOSE: '18:00', LABEL: "New Year's Day" },
    ],
  },
  WEATHER_DEFAULT_ZIP: '34759',
  PASSCODE: '6974',
  INACTIVITY_TIMEOUT: 20 * 1000,
  AUTO_REFRESH_INTERVAL_MS: 150 * 1000,
  DEBUG_MODE: true,
};
