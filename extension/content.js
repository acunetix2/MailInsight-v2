// MailInsight Gmail Content Script
console.log('MailInsight: Content script loaded');

let sidebarInjected = false;
let currentEmailData = null;
let supabaseUrl = '';
let supabaseKey = '';
let userToken = '';

// Load configuration from storage
chrome.storage.sync.get(['supab