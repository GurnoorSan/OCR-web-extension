# Text Capture OCR Chrome Extension

A Chrome extension that allows users to capture text from images on web pages using OCR (Optical Character Recognition) technology. The extension uses Tesseract.js for OCR processing and supports multiple languages.

## Features

- Select any area of a webpage to extract text
- Support for multiple languages including:
  - English
  - Spanish
  - French
  - German
  - Italian
  - Portuguese
  - Russian
  - Chinese (Simplified & Traditional)
  - Japanese
  - Korean
  - Arabic
  - Hindi
- Real-time OCR processing
- Progress indicator
- Clipboard integration
- Responsive UI with draggable selection

## Installation

1. Clone this repository:
   ```bash
   git clone 
   ```

2. Download dependencies:
   - For Windows:
     ```powershell
     .\scripts\download_dependencies.ps1
     ```
   - For Linux/Mac:
     ```bash
     ./scripts/download_dependencies.sh
     ```

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension directory

## Usage

1. Click the extension icon in your Chrome toolbar
2. Click and drag to select the area containing text you want to extract
3. Choose the language from the dropdown menu (if needed)
4. Click "Extract" to process the image
5. The extracted text will be automatically copied to your clipboard


## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License

## Credits

- Gurnoor Sandhu