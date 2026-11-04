// Preview builds run fully offline on built-in demo data. Set to false to use the real API below.
export const USE_MOCK = true;

// Address of the Meyra API. On a phone this must be reachable over the network:
// the dev machine's LAN IP while testing, the public HTTPS URL once deployed.
export const API_URL = 'http://192.168.29.94:4000/api';

// Public website: seller/admin portal plus the Privacy Policy and Terms pages.
export const SITE_URL = 'http://192.168.29.94:5175';
export const PARTNER_URL = `${SITE_URL}/login`;
export const SUPPORT_EMAIL = 'support@meyraglory.com';
