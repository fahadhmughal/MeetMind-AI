// MeetMind AI Chrome Extension - Service Worker (Background Script)

console.log('[MeetMind Extension] Background Service Worker Initialized');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[MeetMind Extension] Extension Installed');
});

// Listener for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PING') {
    sendResponse({ status: 'PONG', timestamp: new Date().toISOString() });
  }
  return true;
});
