let isActive = false;

// Listen for clicks on the extension icon
chrome.action.onClicked.addListener(async (tab) => {
  // If already active, cleanup and reset
  if (isActive) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          if (window.textCaptureInstance) {
            window.textCaptureInstance.cleanup();
            window.textCaptureInstance = null;
          }
        }
      });
      isActive = false;
      return;
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  // Starting screenshot mode
  try {
    // Check if we can access the tab
    if (!tab || !tab.url || !tab.url.startsWith('http')) {
      console.error('Cannot access this page. The extension only works on web pages.');
      return;
    }

    // Set active before injection
    isActive = true;

    // Inject scripts and initialize
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/lib/tesseract.min.js', 'src/lib/worker.min.js', 'src/lib/core.min.js']
    }).catch(error => {
      console.error('Failed to load Tesseract.js:', error);
      throw new Error(`Failed to load Tesseract.js: ${error.message}`);
    });

    // Increase delay to ensure scripts are properly loaded
    await new Promise(resolve => setTimeout(resolve, 500));

    // Inject content script and CSS
    await Promise.all([
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/js/content.js']
      }),
      chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['src/css/styles.css']
      })
    ]);

    // Initialize OCR with error handling
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        if (typeof Tesseract === 'undefined') {
          throw new Error('Tesseract.js not loaded');
        }
        window.textCaptureInstance = new TextCaptureOCR();
        window.textCaptureInstance.initialize().catch(error => {
          console.error('OCR initialization failed:', error);
          throw error;
        });
      }
    });

  } catch (error) {
    console.error('Extension initialization failed:', error);
    isActive = false;
  }

  // Update the extension icon to reflect the current state
  chrome.action.setIcon({
    path: isActive ? {
      "16": chrome.runtime.getURL("assets/icons/icon_16x16.png"),
      "48": chrome.runtime.getURL("assets/icons/icon_48x48.png"),
      "128": chrome.runtime.getURL("assets/icons/icon_128x128.png")
    } : {
      "16": chrome.runtime.getURL("assets/icons/icon_16x16.png"),
      "48": chrome.runtime.getURL("assets/icons/icon_48x48.png"),
      "128": chrome.runtime.getURL("assets/icons/icon_128x128.png")
    },
    tabId: tab.id
  }).catch(error => {
    console.error('Failed to set icon:', error);
  });
});

// Listen for tab updates to reset state
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    isActive = false;
  }
});

// Listen for tab removal to reset state
chrome.tabs.onRemoved.addListener(() => {
  isActive = false;
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "captureTab") {
    console.log('Received capture request');
    // Capture the current tab
    chrome.tabs.captureVisibleTab(null, { format: 'png' })
      .then(dataUrl => {
        console.log('Screenshot captured successfully');
        sendResponse({ dataUrl: dataUrl });
      })
      .catch(error => {
        console.error('Screenshot capture failed:', error);
        sendResponse({ error: error.message });
      });
    return true; // Required to use sendResponse asynchronously
  }
});

// Add this to the background script
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.action === 'completed') {
    isActive = false;
  }
}); 