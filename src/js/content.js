// Check if class hasn't been declared yet
if (typeof window.TextCaptureOCR === 'undefined') {
  class TextCaptureOCR {
    constructor() {
      // Pre-initialize properties
      this.isSelecting = false;
      this.startX = 0;
      this.startY = 0;
      this.overlay = null;
      this.selection = null;
      this.controls = null;
      this.loadingIndicator = null;
      this.worker = null;
      this.languages = {
        'eng': 'English',
        'spa': 'Spanish',
        'fra': 'French',
        'deu': 'German',
        'ita': 'Italian',
        'por': 'Portuguese',
        'rus': 'Russian',
        'chi_sim': 'Chinese Simplified',
        'chi_tra': 'Chinese Traditional',
        'jpn': 'Japanese',
        'kor': 'Korean',
        'ara': 'Arabic',
        'hin': 'Hindi'
      };
      this.currentLanguage = 'eng'; // Default language
      
      // Pre-create DOM elements
      this.createOverlay();
      this.createControls();
      this.createLoadingIndicator();
      // Hide them initially
      this.overlay.style.display = 'none';
      this.controls.style.display = 'none';
      this.loadingIndicator.style.display = 'none';
    }

    async initialize() {
      try {
        if (!Tesseract || typeof Tesseract.createWorker !== 'function') {
          throw new Error('Tesseract.js not properly loaded');
        }

        const { createWorker } = Tesseract;
        // Initialize worker with explicit paths and configuration
        this.worker = await createWorker(this.currentLanguage, 1, {
          corePath: chrome.runtime.getURL('src/lib/core.min.js'),
          workerPath: chrome.runtime.getURL('src/lib/worker.min.js'),
          langPath: chrome.runtime.getURL('assets/lang'),
          workerBlobURL: false,
          logger: m => {
            console.log('Tesseract progress:', m);
            if (m.status === 'recognizing text') {
              this.updateProgress(m);
            }
          }
        });

        console.log('Worker created successfully');
        
        // Initialize is handled by createWorker when language is specified
        console.log('Worker initialized successfully');

        // Show overlay only after everything is ready
        this.overlay.style.display = 'block';
      } catch (err) {
        console.error('OCR initialization failed:', err);
        this.showNotification('Failed to initialize OCR. Please try again.', true);
        await this.cleanup();
        window.textCaptureInstance = null;
        chrome.runtime.sendMessage({ action: 'completed' });
      }
    }

    createOverlay() {
      this.overlay = document.createElement('div');
      this.overlay.className = 'screenshot-overlay';
      
      // Prevent default behaviors that might interfere with selection
      this.overlay.addEventListener('selectstart', (e) => e.preventDefault());
      this.overlay.addEventListener('contextmenu', (e) => e.preventDefault());
      
      document.body.appendChild(this.overlay);

      this.selection = document.createElement('div');
      this.selection.className = 'screenshot-selection';
      this.overlay.appendChild(this.selection);

      // Add mouse event listeners
      this.overlay.addEventListener('mousedown', (e) => {
        this.isSelecting = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.selection.style.left = `${this.startX}px`;
        this.selection.style.top = `${this.startY}px`;
        this.selection.style.width = '0';
        this.selection.style.height = '0';
        this.selection.style.display = 'block';
      });

      this.overlay.addEventListener('mousemove', (e) => {
        if (!this.isSelecting) return;
        
        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Constrain coordinates within viewport
        const currentX = Math.min(Math.max(0, e.clientX), viewportWidth);
        const currentY = Math.min(Math.max(0, e.clientY), viewportHeight);
        
        const width = currentX - this.startX;
        const height = currentY - this.startY;
        
        // Calculate constrained dimensions
        const finalLeft = width < 0 ? Math.max(0, currentX) : Math.max(0, this.startX);
        const finalTop = height < 0 ? Math.max(0, currentY) : Math.max(0, this.startY);
        const finalWidth = Math.min(Math.abs(width), viewportWidth - finalLeft);
        const finalHeight = Math.min(Math.abs(height), viewportHeight - finalTop);
        
        // Apply constrained values
        this.selection.style.width = `${finalWidth}px`;
        this.selection.style.height = `${finalHeight}px`;
        this.selection.style.left = `${finalLeft}px`;
        this.selection.style.top = `${finalTop}px`;
      });

      this.overlay.addEventListener('mouseup', () => {
        if (!this.isSelecting) return;
        this.isSelecting = false;
        
        // Only show controls if a selection was actually made
        const rect = this.selection.getBoundingClientRect();
        if (rect.width > 5 && rect.height > 5) {
          // Position controls intelligently
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Calculate optimal position for controls
          let controlsLeft = rect.right + 10;
          let controlsTop = rect.top;
          
          // If controls would go off-screen to the right, place them on the left
          if (controlsLeft + 200 > viewportWidth) { // 200px is approximate controls width
            controlsLeft = Math.max(0, rect.left - 210);
          }
          
          // If controls would go off-screen at the bottom, move them up
          if (controlsTop + 100 > viewportHeight) { // 100px is approximate controls height
            controlsTop = Math.max(0, viewportHeight - 110);
          }
          
          this.controls.style.display = 'flex';
          this.controls.style.left = `${controlsLeft}px`;
          this.controls.style.top = `${controlsTop}px`;
        }
      });
    }

    createLoadingIndicator() {
      this.loadingIndicator = document.createElement('div');
      this.loadingIndicator.className = 'ocr-loading';
      this.loadingIndicator.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">Processing text...</div>
        <div class="loading-progress">0%</div>
      `;
      this.loadingIndicator.style.display = 'none';
      document.body.appendChild(this.loadingIndicator);
    }

    updateProgress(progress) {
      if (this.loadingIndicator) {
        const percent = Math.round(progress.progress * 100);
        this.loadingIndicator.querySelector('.loading-progress').textContent = `${percent}%`;
        this.loadingIndicator.querySelector('.loading-text').textContent = progress.status;
      }
    }

    createControls() {
      this.controls = document.createElement('div');
      this.controls.className = 'screenshot-controls';
      
      // Add language selector
      const langSelect = document.createElement('select');
      langSelect.className = 'language-select';
      Object.entries(this.languages).forEach(([code, name]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        langSelect.appendChild(option);
      });
      langSelect.onchange = (e) => {
        this.currentLanguage = e.target.value;
      };

      const captureBtn = document.createElement('button');
      captureBtn.textContent = 'Extract';
      captureBtn.className = 'extract-btn';
      captureBtn.onclick = () => this.processImage();

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.className = 'cancel-btn';
      cancelBtn.onclick = () => this.cleanup();

      this.controls.appendChild(langSelect);
      this.controls.appendChild(captureBtn);
      this.controls.appendChild(cancelBtn);
      document.body.appendChild(this.controls);
    }

    async processImage() {
      const rect = this.selection.getBoundingClientRect();
      
      // Create a canvas to draw the screenshot
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.width = rect.width;
      canvas.height = rect.height;

      const image = await this.createScreenshot();
      
      context.drawImage(
        image,
        rect.left * window.devicePixelRatio,
        rect.top * window.devicePixelRatio,
        rect.width * window.devicePixelRatio,
        rect.height * window.devicePixelRatio,
        0,
        0,
        rect.width,
        rect.height
      );

      // Show loading indicator
      this.loadingIndicator.style.display = 'flex';
      this.controls.style.display = 'none';

      try {
        // Check if we need to switch language
        if (this.worker.lang !== this.currentLanguage) {
          await this.worker.loadLanguage(this.currentLanguage);
          await this.worker.initialize(this.currentLanguage);
        }
        const result = await this.worker.recognize(canvas);
        const text = result.data.text.trim();

        // Copy to clipboard
        await navigator.clipboard.writeText(text);
        
        // Show success notification
        this.showNotification(`Text copied to clipboard! (${text.length} characters)`);

        // After successful processing, cleanup and reset state
        await this.cleanup();
        window.textCaptureInstance = null;
        // Notify background script that we're done
        chrome.runtime.sendMessage({ action: 'completed' });
      } catch (err) {
        console.error('OCR failed:', err);
        this.showNotification('Failed to process text. Please try again.', true);
        await this.cleanup();
        window.textCaptureInstance = null;
        chrome.runtime.sendMessage({ action: 'completed' });
      }
    }

    showNotification(message, isError = false) {
      const notification = document.createElement('div');
      notification.textContent = message;
      notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${isError ? '#ff4444' : '#333'};
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000000;
        font-family: Arial, sans-serif;
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    }

    createScreenshot() {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "captureTab" }, (response) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = response.dataUrl;
        });
      });
    }

    async cleanup() {
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
      if (this.controls) {
        this.controls.remove();
        this.controls = null;
      }
      if (this.loadingIndicator) {
        this.loadingIndicator.remove();
        this.loadingIndicator = null;
      }
      if (this.worker) {
        await this.worker.terminate();
        this.worker = null;
      }
      // Notify background script that we're cleaning up
      chrome.runtime.sendMessage({ action: 'completed' });
    }
  }

  // Store the class definition globally
  window.TextCaptureOCR = TextCaptureOCR;
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "initializeScreenshot") {
    // Create new instance only if one doesn't exist
    if (!window.textCaptureInstance) {
      window.textCaptureInstance = new window.TextCaptureOCR();
      window.textCaptureInstance.initialize();
    }
  }
}); 