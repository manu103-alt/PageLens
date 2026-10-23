# Green PDF AI — Android APK & Progressive Web App (PWA)

**Package ID**: `com.greenpdf.ai`  
**Version**: `1.0.0`  
**Technologies**: HTML5, CSS3, JavaScript (ES6+), Capacitor, jsPDF, pdf-lib, pdf.js, Tesseract.js OCR

**Green PDF AI** is a complete, mobile-responsive document utility and AI resume studio built for Android and modern web browsers. Designed around a modern green-and-white theme with dark mode support, it provides 100% client-side document processing for total privacy.

---

## 📱 Features

1. **🖼️ Photos to PDF**: Select multiple images, reorder pages, rotate, configure page margins (None, Small, Normal) and page formats (A4, US Letter, Fit to Image), and compile into high-resolution PDFs.
2. **💼 AI Resume Maker**: ATS-friendly dynamic resume generator with interactive sections (Personal, Career Objective, Work Experience, Education, Technical & Soft Skills, Projects, and Certifications). Includes live synchronized A4 preview and 1-click export to vector PDF.
3. **📷 AI Document Scanner with Real OCR**: Live camera scanner with document framing box, camera flip, B&W document thresholding, Magic Color filter, manual Brightness/Contrast sliders, client-side text recognition with **Tesseract.js OCR**, and AI document summary.
4. **📑 Merge PDF**: Lossless client-side merging of multiple PDF documents using `pdf-lib`.
5. **🛠️ Edit PDF**: High-fidelity page thumbnails via `pdf.js`, rotation, page reordering, extraction of selected pages, and **1-click Undo**.
6. **🗑️ Delete PDF Pages**: Direct deletion workflow with multi-selection and confirmation dialogs.
7. **🗜️ Compress PDF**: Client-side JPEG quantization with configurable presets (Extreme ~75% reduction, Recommended ~50-70%, High Quality ~30%), showing original vs compressed size and savings percentage.
8. **🕒 Recent Documents**: Session history with instant download, printing via isolated iframe, and Web Share API.
9. **📱 Mobile Bottom Navigation Bar**: Quick mobile-first navigation across Home, Photos, Scanner, Resume, and PDF Tools.
10. **⋮ Three-Dot Navigation Menu**: Full navigation drawer with quick access to all tools, settings, direct dark mode toggle, feedback form, sharing, about, and privacy policy.

---

## 📁 Repository Structure

```
pdf resume app/
├── index.html                  # Semantic HTML5 app structure, modals & bottom navigation
├── style.css                   # Green-and-white design system, dark mode & responsive CSS
├── script.js                   # Modular client-side logic (OCR, jsPDF, pdf-lib, PWA)
├── manifest.json               # Progressive Web App (PWA) Manifest
├── sw.js                       # PWA Service Worker for offline caching
├── package.json                # Project dependencies & Capacitor scripts
├── capacitor.config.json       # Capacitor configuration (appId: com.greenpdf.ai)
├── assets/
│   └── icon.svg                # Vector app icon
├── android/                    # Complete Android Capacitor project
│   ├── build.gradle            # Top-level Gradle configuration
│   ├── settings.gradle         # Android settings
│   ├── variables.gradle        # SDK and dependency versions (SDK 34)
│   ├── gradle.properties       # JVM & AndroidX settings
│   └── app/
│       ├── build.gradle        # App module build config (com.greenpdf.ai)
│       └── src/main/
│           ├── AndroidManifest.xml  # Permissions: CAMERA, STORAGE, MEDIA_IMAGES
│           ├── java/com/greenpdf/ai/MainActivity.java
│           └── res/
│               ├── drawable/splash.xml
│               ├── values/colors.xml
│               ├── values/strings.xml
│               ├── values/styles.xml
│               └── xml/file_paths.xml
└── README.md                   # Full documentation & build guides
```

---

## 💻 1. Running the Web App Locally

You do not need a compilation step to run the web app.

### Method A: Instant Local Server (Python 3)
```powershell
# Open terminal in project directory
python -m http.server 8080
```
Open your browser at: `http://localhost:8080`

### Method B: Node.js (npx serve)
```powershell
npx serve .
```

### Method C: VS Code Live Server
1. Open the project folder in VS Code.
2. Right-click `index.html` → **Open with Live Server**.

---

## 🌐 2. Deploying the Web App (PWA)

Because Green PDF AI is a static Progressive Web App, it can be deployed to any static host with zero build configuration:

### Option A: Netlify Drop / CLI
```powershell
npx netlify deploy --prod --dir=.
```
Or drag-and-drop the project folder into [Netlify Drop](https://app.netlify.com/drop).

### Option B: Vercel
```powershell
npx vercel --prod
```

### Option C: GitHub Pages
1. Push the repository to GitHub.
2. Go to **Settings** → **Pages** → Source: **Deploy from a branch** (`main` / root).
3. Your PWA will be live with full offline caching and installability.

---

## 🤖 3. Building the Android APK with Capacitor

The Android project is pre-configured with package ID `com.greenpdf.ai`, camera permissions, and file sharing providers.

### Prerequisites
1. **Node.js** (v18+ recommended)
2. **Android Studio** (Hedgehog, Iguana, Jellyfish, or newer)
3. **Android SDK** (API Level 34 installed via Android Studio SDK Manager)
4. **Java JDK** (JDK 17 or JDK 21)

---

### Step 1: Install Dependencies & Sync Web Assets
In the root directory, run:
```powershell
npm install
npx cap sync android
```
This copies `index.html`, `style.css`, `script.js`, `manifest.json`, and assets into `android/app/src/main/assets/public/`.

---

### Step 2: Open in Android Studio
Run:
```powershell
npx cap open android
```
Alternatively, open Android Studio manually, select **Open**, and choose the `android` directory (`c:\Users\chara\OneDrive\Desktop\pdf resume app\android`).

---

### Step 3: Build Debug APK

#### Option A: Inside Android Studio
1. Wait for Gradle sync to complete.
2. From the top menu, click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.
3. Once completed, a popup will appear saying *"APK(s) generated successfully"*. Click **Locate**.
4. The generated APK will be at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

#### Option B: Via Command Line (Gradle Wrapper)
```powershell
cd android
./gradlew assembleDebug
```
The output file is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

### Step 4: Build a Signed Release APK for Google Play / Sideloading

1. In Android Studio, go to **Build** → **Generate Signed Bundle / APK...**
2. Choose **APK** (or **Android App Bundle** for Google Play Store upload) and click **Next**.
3. Under **Key store path**, click **Create new...** to create your signing key (or select an existing keystore).
4. Fill in:
   - Keystore password
   - Key alias & password
   - Validity (e.g., 25 years)
   - Certificate details (Name, Organization)
5. Select destination folder and choose build variant: **release**.
6. Check **V1 (Jar Signature)** and **V2 (Full APK Signature)**.
7. Click **Finish**.
8. Your signed production APK will be created at:
   `android/app/release/app-release.apk`

---

## 🔒 Security & Privacy Architecture

- **100% Client-Side Processing**: Document conversion, image compression, PDF merging, and OCR execution occur directly on the device using WebAssembly and HTML5 Canvas.
- **Zero Frontend API Keys**: No private API keys are ever stored in client-side files.
- **Backend AI Proxy Point**:
  - The application includes an intelligent **Local Assistant Mode** that applies professional STAR-metric rewrites, career summaries, and skill suggestions offline.
  - To connect a production LLM (Google Gemini, OpenAI, Anthropic), configure your secure HTTPS proxy endpoint in **Settings** (`/api/resume-enhance`).

### Backend Proxy Example (`server.js`):
```javascript
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/resume-enhance', async (req, res) => {
  const { type, text, role } = req.body;
  // Securely call your AI model using process.env.API_KEY on the server
  res.json({ result: "Polished output from your secure backend..." });
});

app.listen(3001, () => console.log('AI Proxy listening on port 3001'));
```

---

## 📦 Third-Party Libraries Used

- [Capacitor](https://capacitorjs.com/) v6 — Native Android runtime & bridge.
- [jsPDF](https://github.com/parallax/jsPDF) v2.5.1 — Client-side vector PDF generation.
- [pdf-lib](https://github.com/Hopding/pdf-lib) v1.17.9 — Lossless PDF merging and page editing.
- [pdf.js](https://mozilla.github.io/pdf.js/) v3.11.174 — High-fidelity PDF rendering for page thumbnails.
- [Tesseract.js](https://tesseract.projectnaptha.com/) v5 — Client-side OCR text extraction.
- [Lucide Icons](https://lucide.dev/) — Modern UI icons.
