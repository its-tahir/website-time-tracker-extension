// self.importScripts('chart.js');

let activeTabId;
let activeURL;
let startTime;
let currentTimer;

chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, tab => {
    activeTabId = tab.id;
    updateCurrentTab(tab.url);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url) {
    updateCurrentTab(changeInfo.url);
  }
});

function updateCurrentTab(url) {
  if (activeURL) {
    updateTimeSpent(activeURL);
  }
  activeURL = new URL(url).hostname;
  startTime = Date.now();
  if (currentTimer) clearInterval(currentTimer);
  currentTimer = setInterval(() => updateTimeSpent(activeURL, true), 1000);
}

function updateTimeSpent(url, isCurrentSite = false) {
  const timeSpent = Math.round((Date.now() - startTime) / 1000);
  const today = new Date().toISOString().split('T')[0];
  const thisWeek = getWeekNumber(new Date());
  const thisMonth = new Date().toISOString().slice(0, 7);

  chrome.storage.local.get([url, 'totalTime'], result => {
    const data = result[url] || { daily: {}, weekly: {}, monthly: {} };
    const totalTime = result.totalTime || { daily: {}, weekly: {}, monthly: {} };
    
    data.daily[today] = (data.daily[today] || 0) + (isCurrentSite ? 1 : timeSpent);
    data.weekly[thisWeek] = (data.weekly[thisWeek] || 0) + (isCurrentSite ? 1 : timeSpent);
    data.monthly[thisMonth] = (data.monthly[thisMonth] || 0) + (isCurrentSite ? 1 : timeSpent);

    totalTime.daily[today] = (totalTime.daily[today] || 0) + (isCurrentSite ? 1 : timeSpent);
    totalTime.weekly[thisWeek] = (totalTime.weekly[thisWeek] || 0) + (isCurrentSite ? 1 : timeSpent);
    totalTime.monthly[thisMonth] = (totalTime.monthly[thisMonth] || 0) + (isCurrentSite ? 1 : timeSpent);

    chrome.storage.local.set({ [url]: data, totalTime: totalTime });
  });
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "removeSite") {
      chrome.storage.local.remove(request.url, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError });
          return;
        }
        chrome.storage.local.get('totalTime', (result) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError });
            return;
          }
          const totalTime = result.totalTime || { daily: {}, weekly: {}, monthly: {} };
          for (const period in totalTime) {
            for (const date in totalTime[period]) {
              if (request.timeData[period] && request.timeData[period][date]) {
                totalTime[period][date] -= request.timeData[period][date];
              }
            }
          }
          chrome.storage.local.set({ totalTime: totalTime }, () => {
            if (chrome.runtime.lastError) {
              sendResponse({ success: false, error: chrome.runtime.lastError });
            } else {
              sendResponse({ success: true });
            }
          });
        });
      });
      return true;
    }
  });