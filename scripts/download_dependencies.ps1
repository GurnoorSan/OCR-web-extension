# Create directories if they don't exist
New-Item -ItemType Directory -Force -Path "src/lib"
New-Item -ItemType Directory -Force -Path "assets/lang"

# Download Tesseract.js files
Invoke-WebRequest -Uri "https://unpkg.com/tesseract.js@4.1.1/dist/tesseract.min.js" -OutFile "src/lib/tesseract.min.js"
Invoke-WebRequest -Uri "https://unpkg.com/tesseract.js@4.1.1/dist/worker.min.js" -OutFile "src/lib/worker.min.js"
Invoke-WebRequest -Uri "https://unpkg.com/tesseract.js-core@4.0.4/tesseract-core.wasm.js" -OutFile "src/lib/core.min.js"
Invoke-WebRequest -Uri "https://unpkg.com/tesseract.js-core@4.0.4/tesseract-core.wasm" -OutFile "src/lib/tesseract-core.wasm"

# Download English language data
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0/eng.traineddata.gz" -OutFile "assets/lang/eng.traineddata.gz"

