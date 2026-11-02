// Preview builds run fully offline on built-in demo data. Set to false to use the real API below.
export const USE_MOCK = true;

// Address of the Meyra API. On a phone this must be reachable over the network:
// the dev machine's LAN IP while testing, the public HTTPS URL once deployed.
export const API_URL = 'http://192.168.29.94:4000/api';

// Seller & admin web portal (opened from the "Sell on Meyra" flow).
export const PARTNER_URL = 'http://192.168.29.94:5175/login';
