/**
 * ============================================================================
 * GREEN PDF AI - SMART MOBILE PDF STUDIO & RESUME MAKER
 * Package ID: com.greenpdf.ai
 * Pure Vanilla JavaScript (ES6+) Implementation
 * 100% Client-Side Private Document Processing + PWA & Capacitor Ready
 * ============================================================================
 */

(function () {
  'use strict';

  // Configure PDF.js Worker
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // Register PWA Service Worker for Offline Reliability
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => console.log('[PWA] Service Worker registered with scope:', reg.scope))
        .catch((err) => console.warn('[PWA] Service Worker registration failed:', err));
    });
  }

  /* ==========================================================================
     APP STATE MANAGEMENT
     ========================================================================== */
  const AppState = {
    currentView: 'home',
    theme: 'light', // 'light' | 'dark' | 'system'
    language: 'en',
    activeExportDoc: null,
    recentDocs: [],

    // Photos to PDF state
    photos: [], // Array of { id, file, name, size, dataUrl, rotation }

    // Scanner & OCR state
    scanner: {
      stream: null,
      facingMode: 'environment', // 'environment' | 'user'
      isStreaming: false,
      currentCapturedImg: null,
      rotation: 0,
      filter: 'original',
      brightness: 100,
      contrast: 100,
      pages: [], // Array of { id, dataUrl, name, timestamp }
      ocrText: ''
    },

    // Merge PDF state
    mergeFiles: [], // Array of { id, file, name, size, pageCount, arrayBuffer }

    // PDF Tools (Edit & Delete Pages) state
    pdfTools: {
      file: null,
      pdfDoc: null,
      pdfJsDoc: null,
      pages: [], // Array of { pageNum, originalIndex, rotation, selected }
      history: [] // Undo stack
    },

    // Compress PDF state
    compress: {
      file: null,
      origSize: 0,
      quality: 0.7,
      pdfJsDoc: null,
      resultBlob: null,
      resultSize: 0
    },

    // AI Resume Maker state
    resume: {
      accentColor: '#10b981',
      template: 'modern-green',
      personal: {
        name: 'Alex Morgan',
        title: 'Senior Software Engineer',
        email: 'alex.morgan@example.com',
        phone: '+1 (555) 019-2834',
        location: 'San Francisco, CA',
        link: 'linkedin.com/in/alexmorgan'
      },
      summary: 'Dynamic and results-driven Software Engineer with 6+ years of expertise in architecting high-performance web applications, distributed cloud systems, and intelligent automated workflows. Proven track record of scaling user-facing applications to 1M+ active users while optimizing database throughput by 42%.',
      experience: [
        {
          id: 'exp-1',
          role: 'Senior Full Stack Engineer',
          company: 'Nexus Cloud Technologies',
          dates: '2022 - Present',
          bullets: [
            'Architected event-driven microservices processing 45M+ events daily with 99.99% uptime SLA.',
            'Spearheaded migration to serverless API pipelines, slashing compute overhead by 34%.',
            'Mentored 6 junior/mid-level engineers and established CI/CD automated test gates.'
          ]
        },
        {
          id: 'exp-2',
          role: 'Software Engineer',
          company: 'AeroPulse Digital',
          dates: '2019 - 2022',
          bullets: [
            'Built responsive web interfaces and reusable component libraries utilized by 800k+ monthly active users.',
            'Optimized client-side bundle size by 45% through lazy loading, code-splitting, and asset compression.',
            'Collaborated with product designers to implement accessibility standards (WCAG 2.1 AA).'
          ]
        }
      ],
      education: [
        {
          id: 'edu-1',
          degree: 'B.S. in Computer Science',
          institution: 'University of California, Berkeley',
          dates: '2015 - 2019'
        }
      ],
      skills: {
        technical: 'JavaScript (ES6+), TypeScript, React, Next.js, Node.js, Python, PostgreSQL, Redis, Docker, Kubernetes, AWS, REST APIs, GraphQL, Git',
        soft: 'System Design, Agile/Scrum, Team Leadership, CI/CD Automation, Test-Driven Development'
      },
      projects: [
        {
          id: 'proj-1',
          name: 'Distributed Task Queue Engine',
          link: 'github.com/alexmorgan/task-engine',
          desc: 'High-throughput async job runner with priority scheduling and fault-tolerant Redis backend.'
        },
        {
          id: 'proj-2',
          name: 'AI Document Parsing Suite',
          link: 'github.com/alexmorgan/doc-parser',
          desc: 'Client-side OCR processing pipeline integrating WebAssembly and smart table extraction.'
        }
      ],
      certifications: [
        {
          id: 'cert-1',
          name: 'AWS Certified Solutions Architect – Associate',
          issuer: 'Amazon Web Services',
          year: '2023'
        },
        {
          id: 'cert-2',
          name: 'Certified Kubernetes Application Developer (CKAD)',
          issuer: 'Cloud Native Computing Foundation',
          year: '2022'
        }
      ]
    },

    // Settings
    settings: {
      aiEndpoint: '',
      aiFallback: true
    }
  };

  /* ==========================================================================
     DOM ELEMENTS CACHE
     ========================================================================== */
  const DOM = {
    appViewport: document.getElementById('app-viewport'),
    views: document.querySelectorAll('.app-view'),
    activeViewName: document.getElementById('active-view-name'),
    btnHeaderBack: document.getElementById('btn-header-back'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    btnThreeDots: document.getElementById('btn-three-dots'),
    threeDotsMenu: document.getElementById('three-dots-menu'),
    navBrand: document.getElementById('nav-brand'),
    toastContainer: document.getElementById('toast-container'),
    printIframe: document.getElementById('print-iframe'),
    bottomNav: document.getElementById('bottom-nav'),

    // Modals
    modalExport: document.getElementById('modal-export'),
    modalSettings: document.getElementById('modal-settings'),
    modalFeedback: document.getElementById('modal-feedback'),
    modalAbout: document.getElementById('modal-about'),
    modalPrivacy: document.getElementById('modal-privacy'),
    modalConfirm: document.getElementById('modal-confirm'),
    confirmProceedBtn: document.getElementById('btn-confirm-proceed'),
    confirmMessage: document.getElementById('confirm-modal-message'),

    // Recent Docs
    recentDocsContainer: document.getElementById('recent-docs-container'),
    recentDocsEmpty: document.getElementById('recent-docs-empty'),
    btnClearHistory: document.getElementById('btn-clear-history'),

    // Photos to PDF
    photosDropzone: document.getElementById('photos-dropzone'),
    photosFileInput: document.getElementById('photos-file-input'),
    photosGrid: document.getElementById('photos-grid'),
    photosCountLabel: document.getElementById('photos-count-label'),
    btnPhotosClearAll: document.getElementById('btn-photos-clear-all'),
    btnPhotosGeneratePdf: document.getElementById('btn-photos-generate-pdf'),
    btnPhotosGeneratePdfSidebar: document.getElementById('btn-photos-generate-pdf-sidebar'),
    photosDocName: document.getElementById('photos-doc-name'),
    photosPageSize: document.getElementById('photos-page-size'),
    photosOrientation: document.getElementById('photos-orientation'),
    photosMargin: document.getElementById('photos-margin'),
    photosQuality: document.getElementById('photos-quality'),

    // Scanner & OCR
    cameraPlaceholder: document.getElementById('camera-placeholder'),
    scannerVideo: document.getElementById('scanner-video'),
    scannerCanvas: document.getElementById('scanner-canvas'),
    cameraGuide: document.getElementById('camera-guide'),
    btnStartCamera: document.getElementById('btn-start-camera'),
    btnStopCamera: document.getElementById('btn-stop-camera'),
    btnFlipCamera: document.getElementById('btn-flip-camera'),
    btnCapturePhoto: document.getElementById('btn-capture-photo'),
    scannerFileFallback: document.getElementById('scanner-file-fallback'),
    scanEditorCard: document.getElementById('scan-editor-card'),
    sliderBrightness: document.getElementById('slider-brightness'),
    sliderContrast: document.getElementById('slider-contrast'),
    valBrightness: document.getElementById('val-brightness'),
    valContrast: document.getElementById('val-contrast'),
    btnRotateScan: document.getElementById('btn-rotate-scan'),
    btnRunOcr: document.getElementById('btn-run-ocr'),
    btnSavePageToStack: document.getElementById('btn-save-page-to-stack'),
    scannedPagesTray: document.getElementById('scanned-pages-tray'),
    scannedPagesBadge: document.getElementById('scanned-pages-badge'),
    scannerExportCount: document.getElementById('scanner-export-count'),
    btnScannerExportPdf: document.getElementById('btn-scanner-export-pdf'),
    btnScannerGenerateSidebar: document.getElementById('btn-scanner-generate-sidebar'),
    scannerDocName: document.getElementById('scanner-doc-name'),
    ocrResultsPanel: document.getElementById('ocr-results-panel'),
    ocrProgressBox: document.getElementById('ocr-progress-box'),
    ocrProgressFill: document.getElementById('ocr-progress-fill'),
    ocrProgressText: document.getElementById('ocr-progress-text'),
    ocrTextOutput: document.getElementById('ocr-text-output'),
    btnCopyOcr: document.getElementById('btn-copy-ocr'),
    btnAiSummarizeOcr: document.getElementById('btn-ai-summarize-ocr'),

    // Resume Maker
    resumeAccordion: document.getElementById('resume-accordion'),
    resName: document.getElementById('res-name'),
    resTitle: document.getElementById('res-title'),
    resEmail: document.getElementById('res-email'),
    resPhone: document.getElementById('res-phone'),
    resLocation: document.getElementById('res-location'),
    resLinkedin: document.getElementById('res-linkedin'),
    resSummary: document.getElementById('res-summary'),
    resSkillsTech: document.getElementById('res-skills-technical'),
    resSkillsSoft: document.getElementById('res-skills-soft'),
    experienceItemsContainer: document.getElementById('experience-items-container'),
    educationItemsContainer: document.getElementById('education-items-container'),
    projectItemsContainer: document.getElementById('project-items-container'),
    certificationItemsContainer: document.getElementById('certification-items-container'),
    btnAddExperience: document.getElementById('btn-add-experience'),
    btnAddEducation: document.getElementById('btn-add-education'),
    btnAddProject: document.getElementById('btn-add-project'),
    btnAddCert: document.getElementById('btn-add-cert'),
    btnResumeSampleData: document.getElementById('btn-resume-sample-data'),
    btnResumeExportPdf: document.getElementById('btn-resume-export-pdf'),
    btnResumePreviewExport: document.getElementById('btn-resume-preview-export'),
    btnResumePreviewPrint: document.getElementById('btn-resume-preview-print'),
    btnAiEnhanceSummary: document.getElementById('btn-ai-enhance-summary'),
    btnAiSuggestSkills: document.getElementById('btn-ai-suggest-skills'),
    btnAiSettingsShortcut: document.getElementById('btn-ai-settings-shortcut'),

    // Resume Sheet Preview
    resumeSheet: document.getElementById('resume-sheet'),
    sheetName: document.getElementById('sheet-name'),
    sheetTitle: document.getElementById('sheet-title'),
    sheetEmail: document.getElementById('sheet-email'),
    sheetPhone: document.getElementById('sheet-phone'),
    sheetLoc: document.getElementById('sheet-loc'),
    sheetLink: document.getElementById('sheet-link'),
    sheetSummary: document.getElementById('sheet-summary'),
    sheetExpList: document.getElementById('sheet-exp-list'),
    sheetEduList: document.getElementById('sheet-edu-list'),
    sheetSkillsTech: document.getElementById('sheet-skills-tech'),
    sheetSkillsSoft: document.getElementById('sheet-skills-soft'),
    sheetProjList: document.getElementById('sheet-proj-list'),
    sheetCertList: document.getElementById('sheet-cert-list'),

    // Merge PDF
    mergeDropzone: document.getElementById('merge-dropzone'),
    mergeFileInput: document.getElementById('merge-file-input'),
    mergeFilesList: document.getElementById('merge-files-list'),
    mergeQueueCount: document.getElementById('merge-queue-count'),
    mergeOutputName: document.getElementById('merge-output-name'),
    mergeSumDocs: document.getElementById('merge-sum-docs'),
    mergeSumPages: document.getElementById('merge-sum-pages'),
    btnMergeClear: document.getElementById('btn-merge-clear'),
    btnExecuteMerge: document.getElementById('btn-execute-merge'),
    btnExecuteMergeSidebar: document.getElementById('btn-execute-merge-sidebar'),

    // Edit PDF
    pdftoolsDropzone: document.getElementById('pdftools-dropzone'),
    pdftoolsFileInput: document.getElementById('pdftools-file-input'),
    pdftoolsThumbnailsGrid: document.getElementById('pdftools-thumbnails-grid'),
    pdftoolsFilename: document.getElementById('pdftools-filename'),
    pdftoolsPageCount: document.getElementById('pdftools-page-count'),
    pdftoolsSelectedCount: document.getElementById('pdftools-selected-count'),
    pdftoolsOutputName: document.getElementById('pdftools-output-name'),
    btnPdftoolsUndo: document.getElementById('btn-pdftools-undo'),
    btnPdftoolsSelectAll: document.getElementById('btn-pdftools-select-all'),
    btnPdftoolsDeleteSelected: document.getElementById('btn-pdftools-delete-selected'),
    btnPdftoolsRotateAll: document.getElementById('btn-pdftools-rotate-all'),
    btnPdftoolsExtract: document.getElementById('btn-pdftools-extract'),
    btnPdftoolsSave: document.getElementById('btn-pdftools-save'),
    btnPdftoolsSaveSidebar: document.getElementById('btn-pdftools-save-sidebar'),

    // Compress PDF
    compressDropzone: document.getElementById('compress-dropzone'),
    compressFileInput: document.getElementById('compress-file-input'),
    compressDetailsCard: document.getElementById('compress-details-card'),
    compressOrigName: document.getElementById('compress-orig-name'),
    compressOrigSize: document.getElementById('compress-orig-size'),
    compressOrigPages: document.getElementById('compress-orig-pages'),
    compressOutputName: document.getElementById('compress-output-name'),
    compressQualitySlider: document.getElementById('compress-quality-slider'),
    valCompressQuality: document.getElementById('val-compress-quality'),
    btnExecuteCompress: document.getElementById('btn-execute-compress'),
    btnExecuteCompressSidebar: document.getElementById('btn-execute-compress-sidebar'),
    compressionResultsBox: document.getElementById('compression-results-box'),
    compressSavingsPct: document.getElementById('compress-savings-pct'),
    resOrigSize: document.getElementById('res-orig-size'),
    resNewSize: document.getElementById('res-new-size'),

    // Export Modal
    exportFileTitle: document.getElementById('export-file-title'),
    exportFileSize: document.getElementById('export-file-size'),
    exportFilePages: document.getElementById('export-file-pages'),
    btnExportDownload: document.getElementById('btn-export-download'),
    btnExportPrint: document.getElementById('btn-export-print'),
    btnExportShare: document.getElementById('btn-export-share'),
    btnExportOpen: document.getElementById('btn-export-open'),

    // Settings
    aiEndpointUrl: document.getElementById('ai-endpoint-url'),
    aiMockFallback: document.getElementById('ai-mock-fallback'),
    settingsLanguage: document.getElementById('settings-language'),
    btnSaveSettings: document.getElementById('btn-save-settings'),
    btnResetAppData: document.getElementById('btn-reset-app-data'),

    // Feedback
    formFeedback: document.getElementById('form-feedback'),
    feedbackStars: document.getElementById('feedback-stars')
  };

  /* ==========================================================================
     TOAST NOTIFICATIONS
     ========================================================================== */
  function showToast(message, type = 'success', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-circle';
    else if (type === 'info') iconName = 'info';

    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${escapeHtml(message)}</span>
    `;

    DOM.toastContainer.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.95)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, duration);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /* ==========================================================================
     CONFIRMATION DIALOG HELPER
     ========================================================================== */
  let currentConfirmCallback = null;

  function showConfirmDialog({ title, message, confirmText = 'Confirm', onConfirm }) {
    document.getElementById('confirm-modal-title').textContent = title || 'Confirm Action';
    DOM.confirmMessage.textContent = message || 'Are you sure you want to proceed?';
    DOM.confirmProceedBtn.textContent = confirmText;
    currentConfirmCallback = onConfirm;
    openModal('modal-confirm');
  }

  DOM.confirmProceedBtn.addEventListener('click', () => {
    closeModal('modal-confirm');
    if (typeof currentConfirmCallback === 'function') {
      currentConfirmCallback();
      currentConfirmCallback = null;
    }
  });

  /* ==========================================================================
     THEME MANAGEMENT
     ========================================================================== */
  function initTheme() {
    const savedTheme = localStorage.getItem('greenpdf_theme') || 'system';
    AppState.theme = savedTheme;
    applyTheme(savedTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      if (AppState.theme === 'system') {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    });

    DOM.btnThemeToggle.addEventListener('click', () => {
      const currentApplied = document.documentElement.getAttribute('data-theme');
      const newTheme = currentApplied === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
      showToast(`Switched to ${newTheme} mode`, 'info', 2000);
    });

    document.querySelectorAll('[data-theme-choice]').forEach((pill) => {
      pill.addEventListener('click', () => {
        const choice = pill.getAttribute('data-theme-choice');
        setTheme(choice);
        document.querySelectorAll('[data-theme-choice]').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        showToast(`Theme set to ${choice}`, 'info', 2000);
      });
    });
  }

  function setTheme(theme) {
    AppState.theme = theme;
    try {
      localStorage.setItem('greenpdf_theme', theme);
    } catch (e) {
      console.warn('LocalStorage unavailable', e);
    }
    applyTheme(theme);
  }

  function applyTheme(theme) {
    let effective = theme;
    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effective = systemDark ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', effective);
    if (window.lucide) window.lucide.createIcons();
  }

  /* ==========================================================================
     ROUTING & BOTTOM NAVIGATION
     ========================================================================== */
  const viewTitles = {
    home: 'Home',
    'photos-pdf': 'Photos to PDF',
    scanner: 'AI Document Scanner',
    resume: 'AI Resume Maker',
    merge: 'Merge PDF',
    'edit-pdf': 'Edit PDF',
    compress: 'Compress PDF'
  };

  function switchView(viewId, pushHistory = true) {
    if (viewId === 'delete-pages') {
      viewId = 'edit-pdf';
      setTimeout(() => {
        showToast('Tip: Click on page thumbnails to select and delete them', 'info', 3000);
      }, 350);
    } else if (viewId === 'recent-docs-view') {
      viewId = 'home';
      setTimeout(() => {
        DOM.recentDocsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }

    if (!viewTitles[viewId]) viewId = 'home';

    // Stop camera if navigating away from scanner
    if (AppState.currentView === 'scanner' && viewId !== 'scanner') {
      stopCameraStream();
    }

    AppState.currentView = viewId;

    // Toggle active view
    DOM.views.forEach((v) => {
      if (v.id === `view-${viewId}`) {
        v.classList.add('active');
      } else {
        v.classList.remove('active');
      }
    });

    // Update Header
    DOM.activeViewName.textContent = viewTitles[viewId] || 'Green PDF AI';
    if (viewId === 'home') {
      DOM.btnHeaderBack.classList.add('hidden');
    } else {
      DOM.btnHeaderBack.classList.remove('hidden');
    }

    // Sync Bottom Navigation
    document.querySelectorAll('.bottom-nav-item').forEach((item) => {
      const navTarget = item.getAttribute('data-nav');
      if (navTarget === viewId || (navTarget === 'edit-pdf' && viewId === 'edit-pdf')) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (pushHistory) {
      const hash = viewId === 'home' ? '' : `#${viewId}`;
      window.history.pushState({ view: viewId }, '', window.location.pathname + hash);
    }

    if (viewId === 'resume') {
      updateResumePreview();
    }

    if (window.lucide) window.lucide.createIcons();
  }

  function initRouter() {
    DOM.navBrand.addEventListener('click', () => switchView('home'));
    DOM.btnHeaderBack.addEventListener('click', () => switchView('home'));

    // Dashboard Cards Click Handlers
    document.querySelectorAll('.feature-card[data-route]').forEach((card) => {
      card.addEventListener('click', () => {
        const route = card.getAttribute('data-route');
        switchView(route);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const route = card.getAttribute('data-route');
          switchView(route);
        }
      });
    });

    // Back Buttons
    document.querySelectorAll('.back-link-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchView('home'));
    });

    // Mobile Bottom Navigation Bar Click Handlers
    document.querySelectorAll('.bottom-nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        const target = item.getAttribute('data-nav');
        switchView(target);
      });
    });

    // Popstate
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.view) {
        switchView(e.state.view, false);
      } else {
        const hash = window.location.hash.replace('#', '');
        switchView(hash || 'home', false);
      }
    });

    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && viewTitles[initialHash]) {
      switchView(initialHash, false);
    } else {
      switchView('home', false);
    }
  }

  /* ==========================================================================
     THREE-DOT MENU
     ========================================================================== */
  function initThreeDotsMenu() {
    DOM.btnThreeDots.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = DOM.threeDotsMenu.classList.contains('active');
      toggleMenu(!isOpen);
    });

    document.addEventListener('click', (e) => {
      if (!DOM.threeDotsMenu.contains(e.target) && e.target !== DOM.btnThreeDots) {
        toggleMenu(false);
      }
    });

    function toggleMenu(open) {
      DOM.threeDotsMenu.classList.toggle('active', open);
      DOM.btnThreeDots.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    DOM.threeDotsMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.menu-item');
      if (!item) return;
      const action = item.getAttribute('data-action');
      toggleMenu(false);

      switch (action) {
        case 'go-home':
          switchView('home');
          break;
        case 'go-pdf-tools':
          switchView('edit-pdf');
          break;
        case 'go-resume':
          switchView('resume');
          break;
        case 'go-scanner':
          switchView('scanner');
          break;
        case 'toggle-theme-direct':
          const current = document.documentElement.getAttribute('data-theme');
          setTheme(current === 'dark' ? 'light' : 'dark');
          showToast(`Switched to ${current === 'dark' ? 'light' : 'dark'} mode`, 'info', 2000);
          break;
        case 'open-settings':
          openModal('modal-settings');
          break;
        case 'open-feedback':
          openModal('modal-feedback');
          break;
        case 'share-app':
          handleShareApp();
          break;
        case 'open-about':
          openModal('modal-about');
          break;
        case 'open-privacy':
          openModal('modal-privacy');
          break;
      }
    });
  }

  /* ==========================================================================
     MODALS MANAGER
     ========================================================================== */
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (window.lucide) window.lucide.createIcons();
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function initModals() {
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        closeModal(modalId);
      });
    });

    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(overlay.id);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach((m) => closeModal(m.id));
      }
    });

    // Rating stars
    const stars = DOM.feedbackStars.querySelectorAll('.star-btn');
    stars.forEach((btn) => {
      btn.addEventListener('click', () => {
        const rating = parseInt(btn.getAttribute('data-rating'), 10);
        stars.forEach((s) => {
          const r = parseInt(s.getAttribute('data-rating'), 10);
          s.classList.toggle('active', r <= rating);
        });
      });
    });

    // Feedback submit
    DOM.formFeedback.addEventListener('submit', (e) => {
      e.preventDefault();
      closeModal('modal-feedback');
      showToast('Thank you! Your feedback has been recorded locally.', 'success');
      DOM.formFeedback.reset();
    });

    // Settings save
    DOM.btnSaveSettings.addEventListener('click', () => {
      AppState.settings.aiEndpoint = DOM.aiEndpointUrl.value.trim();
      AppState.settings.aiFallback = DOM.aiMockFallback.checked;
      AppState.language = DOM.settingsLanguage.value;
      try {
        localStorage.setItem('greenpdf_ai_endpoint', AppState.settings.aiEndpoint);
        localStorage.setItem('greenpdf_ai_fallback', AppState.settings.aiFallback ? '1' : '0');
        localStorage.setItem('greenpdf_language', AppState.language);
      } catch (err) {}
      closeModal('modal-settings');
      showToast('Settings saved successfully', 'success');
    });

    // Reset app data
    DOM.btnResetAppData.addEventListener('click', () => {
      showConfirmDialog({
        title: 'Reset Local Application Data?',
        message: 'This will clear cached document history, custom preferences, and reset Green PDF AI.',
        confirmText: 'Reset Everything',
        onConfirm: () => {
          try {
            localStorage.clear();
          } catch (e) {}
          AppState.recentDocs = [];
          renderRecentDocs();
          closeModal('modal-settings');
          showToast('Application reset completed', 'info');
        }
      });
    });
  }

  /* ==========================================================================
     WEB SHARE API & FALLBACK
     ========================================================================== */
  async function handleShareApp() {
    const shareData = {
      title: 'Green PDF AI — Mobile PDF Studio & Resume Maker',
      text: 'Check out Green PDF AI: Private client-side PDF maker, camera document scanner with OCR, ATS resume builder, and PDF tools!',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast('App link shared successfully!', 'success');
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Native share failed, using clipboard fallback', err);
        } else {
          return;
        }
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('App link copied to clipboard!', 'success');
      } catch (e) {
        showToast('App URL: ' + window.location.href, 'info');
      }
    } else {
      showToast('App URL: ' + window.location.href, 'info');
    }
  }

  /* ==========================================================================
     DOCUMENT EXPORT ACTIONS (DOWNLOAD, PRINT, SHARE)
     ========================================================================== */
  function openExportModal(docData) {
    AppState.activeExportDoc = docData;

    AppState.recentDocs.unshift({
      id: 'doc_' + Date.now(),
      name: docData.name,
      size: docData.size,
      pages: docData.pages,
      type: docData.type,
      blob: docData.blob,
      blobUrl: docData.blobUrl,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    renderRecentDocs();

    DOM.exportFileTitle.textContent = docData.name;
    DOM.exportFileSize.textContent = formatBytes(docData.size);
    DOM.exportFilePages.textContent = `${docData.pages} ${docData.pages === 1 ? 'page' : 'pages'}`;

    openModal('modal-export');
  }

  function initExportActions() {
    DOM.btnExportDownload.addEventListener('click', () => {
      if (!AppState.activeExportDoc) return;
      downloadBlob(AppState.activeExportDoc.blobUrl, AppState.activeExportDoc.name);
      showToast(`Downloaded ${AppState.activeExportDoc.name}`, 'success');
    });

    DOM.btnExportPrint.addEventListener('click', () => {
      if (!AppState.activeExportDoc) return;
      printBlob(AppState.activeExportDoc.blobUrl);
    });

    DOM.btnExportShare.addEventListener('click', async () => {
      if (!AppState.activeExportDoc) return;
      const { blob, name } = AppState.activeExportDoc;

      if (navigator.canShare && navigator.canShare({ files: [new File([blob], name, { type: 'application/pdf' })] })) {
        try {
          const file = new File([blob], name, { type: 'application/pdf' });
          await navigator.share({
            title: name,
            files: [file]
          });
          showToast('Document shared successfully!', 'success');
          return;
        } catch (e) {
          if (e.name !== 'AbortError') console.warn('Share error', e);
        }
      }

      downloadBlob(AppState.activeExportDoc.blobUrl, AppState.activeExportDoc.name);
      showToast('Document downloaded for sharing', 'info');
    });

    DOM.btnExportOpen.addEventListener('click', () => {
      if (!AppState.activeExportDoc) return;
      window.open(AppState.activeExportDoc.blobUrl, '_blank');
    });
  }

  function downloadBlob(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function printBlob(blobUrl) {
    try {
      DOM.printIframe.src = blobUrl;
      DOM.printIframe.onload = () => {
        try {
          DOM.printIframe.contentWindow.focus();
          DOM.printIframe.contentWindow.print();
        } catch (err) {
          window.open(blobUrl, '_blank');
        }
      };
    } catch (e) {
      window.open(blobUrl, '_blank');
    }
  }

  /* ==========================================================================
     RECENT DOCUMENTS CONTROLLER
     ========================================================================== */
  function renderRecentDocs() {
    DOM.recentDocsContainer.querySelectorAll('.recent-doc-row').forEach((r) => r.remove());

    if (AppState.recentDocs.length === 0) {
      DOM.recentDocsEmpty.classList.remove('hidden');
      return;
    }

    DOM.recentDocsEmpty.classList.add('hidden');

    AppState.recentDocs.forEach((doc) => {
      const row = document.createElement('div');
      row.className = 'recent-doc-row';

      row.innerHTML = `
        <div class="recent-doc-info">
          <div class="doc-badge-icon">
            <i data-lucide="file-text"></i>
          </div>
          <div class="doc-text-meta">
            <div class="doc-name" title="${escapeHtml(doc.name)}">${escapeHtml(doc.name)}</div>
            <div class="doc-meta">
              <span>${doc.timestamp}</span>
              <span>•</span>
              <span>${doc.pages} ${doc.pages === 1 ? 'page' : 'pages'}</span>
              <span>•</span>
              <span>${formatBytes(doc.size)}</span>
            </div>
          </div>
        </div>
        <div class="recent-doc-actions">
          <button class="icon-btn-sm" title="Download" data-action="download" data-id="${doc.id}">
            <i data-lucide="download"></i>
          </button>
          <button class="icon-btn-sm" title="Print" data-action="print" data-id="${doc.id}">
            <i data-lucide="printer"></i>
          </button>
          <button class="icon-btn-sm text-danger" title="Delete" data-action="delete" data-id="${doc.id}">
            <i data-lucide="trash"></i>
          </button>
        </div>
      `;

      DOM.recentDocsContainer.appendChild(row);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function initRecentDocs() {
    DOM.recentDocsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      const doc = AppState.recentDocs.find((d) => d.id === id);
      if (!doc) return;

      if (action === 'download') {
        downloadBlob(doc.blobUrl, doc.name);
      } else if (action === 'print') {
        printBlob(doc.blobUrl);
      } else if (action === 'delete') {
        showConfirmDialog({
          title: 'Remove Document from History?',
          message: `Remove "${doc.name}" from your recent session list?`,
          confirmText: 'Remove',
          onConfirm: () => {
            AppState.recentDocs = AppState.recentDocs.filter((d) => d.id !== id);
            renderRecentDocs();
            showToast('Document removed from recent list', 'info');
          }
        });
      }
    });

    DOM.btnClearHistory.addEventListener('click', () => {
      if (AppState.recentDocs.length === 0) {
        showToast('No recent history to clear', 'info');
        return;
      }
      showConfirmDialog({
        title: 'Clear All Recent Documents?',
        message: 'This will remove all documents generated in this session from your dashboard view.',
        confirmText: 'Clear All History',
        onConfirm: () => {
          AppState.recentDocs = [];
          renderRecentDocs();
          showToast('Recent documents history cleared', 'info');
        }
      });
    });
  }

  /* ==========================================================================
     MODULE 1: PHOTOS TO PDF
     ========================================================================== */
  function initPhotosToPdf() {
    const dropzone = DOM.photosDropzone;
    const fileInput = DOM.photosFileInput;

    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-active');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length) handlePhotoFiles(files);
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length) {
        handlePhotoFiles(fileInput.files);
        fileInput.value = '';
      }
    });

    DOM.btnPhotosClearAll.addEventListener('click', () => {
      showConfirmDialog({
        title: 'Remove All Photos?',
        message: 'Are you sure you want to clear all loaded photos from the queue?',
        confirmText: 'Clear All',
        onConfirm: () => {
          AppState.photos = [];
          renderPhotosGrid();
          showToast('All photos cleared', 'info');
        }
      });
    });

    DOM.btnPhotosGeneratePdf.addEventListener('click', generatePhotosPdf);
    DOM.btnPhotosGeneratePdfSidebar.addEventListener('click', generatePhotosPdf);
  }

  function handlePhotoFiles(fileList) {
    const validImages = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (validImages.length === 0) {
      showToast('Please select valid image files (JPG, PNG, WEBP, etc.)', 'error');
      return;
    }

    let loadedCount = 0;
    validImages.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        AppState.photos.push({
          id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          file,
          name: file.name,
          size: file.size,
          dataUrl: e.target.result,
          rotation: 0
        });

        loadedCount++;
        if (loadedCount === validImages.length) {
          renderPhotosGrid();
          showToast(`Added ${loadedCount} ${loadedCount === 1 ? 'photo' : 'photos'}`, 'success');
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function renderPhotosGrid() {
    DOM.photosGrid.innerHTML = '';
    const total = AppState.photos.length;
    DOM.photosCountLabel.textContent = `${total} ${total === 1 ? 'photo' : 'photos'} selected`;

    const hasPhotos = total > 0;
    DOM.btnPhotosClearAll.disabled = !hasPhotos;
    DOM.btnPhotosGeneratePdf.disabled = !hasPhotos;
    DOM.btnPhotosGeneratePdfSidebar.disabled = !hasPhotos;

    if (!hasPhotos) {
      DOM.photosGrid.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1/-1;">
          <div class="empty-icon-wrap"><i data-lucide="image"></i></div>
          <h4>No Photos Selected</h4>
          <p>Drop images into the box above to assemble your PDF document.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    AppState.photos.forEach((photo, index) => {
      const card = document.createElement('div');
      card.className = 'photo-card';
      card.dataset.id = photo.id;

      card.innerHTML = `
        <div class="photo-page-badge">Page ${index + 1}</div>
        <div class="photo-thumb-wrap">
          <img src="${photo.dataUrl}" alt="${escapeHtml(photo.name)}" style="transform: rotate(${photo.rotation}deg);" />
        </div>
        <div class="photo-card-info">
          <span class="photo-file-name" title="${escapeHtml(photo.name)}">${escapeHtml(photo.name)}</span>
          <div class="photo-card-actions">
            <button class="photo-act-btn" data-act="move-left" title="Move earlier in PDF" ${index === 0 ? 'disabled' : ''}>
              <i data-lucide="arrow-left"></i>
            </button>
            <button class="photo-act-btn" data-act="move-right" title="Move later in PDF" ${index === total - 1 ? 'disabled' : ''}>
              <i data-lucide="arrow-right"></i>
            </button>
            <button class="photo-act-btn" data-act="rotate" title="Rotate 90°">
              <i data-lucide="rotate-cw"></i>
            </button>
            <button class="photo-act-btn delete" data-act="delete" title="Remove photo">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      `;

      DOM.photosGrid.appendChild(card);
    });

    DOM.photosGrid.querySelectorAll('.photo-act-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const card = e.target.closest('.photo-card');
        const id = card.dataset.id;
        const act = btn.dataset.act;
        const index = AppState.photos.findIndex((p) => p.id === id);
        if (index === -1) return;

        if (act === 'move-left' && index > 0) {
          const temp = AppState.photos[index];
          AppState.photos[index] = AppState.photos[index - 1];
          AppState.photos[index - 1] = temp;
          renderPhotosGrid();
        } else if (act === 'move-right' && index < AppState.photos.length - 1) {
          const temp = AppState.photos[index];
          AppState.photos[index] = AppState.photos[index + 1];
          AppState.photos[index + 1] = temp;
          renderPhotosGrid();
        } else if (act === 'rotate') {
          AppState.photos[index].rotation = (AppState.photos[index].rotation + 90) % 360;
          renderPhotosGrid();
        } else if (act === 'delete') {
          AppState.photos.splice(index, 1);
          renderPhotosGrid();
        }
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  async function generatePhotosPdf() {
    if (AppState.photos.length === 0) return;

    showToast('Building your PDF...', 'info', 1500);

    const docName = (DOM.photosDocName.value.trim() || 'Green_Photos_Document') + '.pdf';
    const pageSizeOpt = DOM.photosPageSize.value;
    const orientationOpt = DOM.photosOrientation.value;
    const marginMm = parseInt(DOM.photosMargin.value, 10);
    const quality = parseFloat(DOM.photosQuality.value);

    const { jsPDF } = window.jspdf;

    try {
      let pdf;
      const isFit = pageSizeOpt === 'fit';
      const defaultFormat = isFit ? 'a4' : pageSizeOpt;
      const defaultOrient = orientationOpt === 'auto' ? 'portrait' : orientationOpt;

      pdf = new jsPDF({
        orientation: defaultOrient,
        unit: 'mm',
        format: defaultFormat
      });

      for (let i = 0; i < AppState.photos.length; i++) {
        const photo = AppState.photos[i];
        const canvas = await processImageToCanvas(photo.dataUrl, photo.rotation, quality);
        const imgData = canvas.toDataURL('image/jpeg', quality);

        const imgWidthPx = canvas.width;
        const imgHeightPx = canvas.height;
        const imgAspect = imgWidthPx / imgHeightPx;

        let pageOrient = defaultOrient;
        if (orientationOpt === 'auto') {
          pageOrient = imgAspect >= 1 ? 'landscape' : 'portrait';
        }

        if (i > 0) {
          pdf.addPage(defaultFormat, pageOrient);
        } else {
          if (pageOrient !== defaultOrient) {
            pdf.deletePage(1);
            pdf.addPage(defaultFormat, pageOrient);
          }
        }

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const availWidth = Math.max(10, pageWidth - marginMm * 2);
        const availHeight = Math.max(10, pageHeight - marginMm * 2);

        let finalWidth, finalHeight;
        if (isFit && marginMm === 0) {
          finalWidth = pageWidth;
          finalHeight = pageHeight;
        } else {
          if (availWidth / availHeight > imgAspect) {
            finalHeight = availHeight;
            finalWidth = finalHeight * imgAspect;
          } else {
            finalWidth = availWidth;
            finalHeight = finalWidth / imgAspect;
          }
        }

        const xPos = marginMm + (availWidth - finalWidth) / 2;
        const yPos = marginMm + (availHeight - finalHeight) / 2;

        pdf.addImage(imgData, 'JPEG', xPos, yPos, finalWidth, finalHeight, undefined, 'FAST');
      }

      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      openExportModal({
        blob: pdfBlob,
        blobUrl: blobUrl,
        name: docName,
        size: pdfBlob.size,
        pages: AppState.photos.length,
        type: 'Photos to PDF'
      });

      showToast('PDF generated successfully!', 'success');
    } catch (err) {
      console.error('PDF Generation Error:', err);
      showToast('Failed to create PDF. Please check your image sizes.', 'error');
    }
  }

  function processImageToCanvas(dataUrl, rotationDeg = 0, quality = 0.95) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (rotationDeg % 180 === 0) {
          canvas.width = img.width;
          canvas.height = img.height;
        } else {
          canvas.width = img.height;
          canvas.height = img.width;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotationDeg * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        resolve(canvas);
      };
      img.src = dataUrl;
    });
  }

  /* ==========================================================================
     MODULE 2: AI DOCUMENT SCANNER WITH REAL TESSERACT OCR
     ========================================================================== */
  function initScanner() {
    DOM.btnStartCamera.addEventListener('click', startCameraStream);
    DOM.btnStopCamera.addEventListener('click', stopCameraStream);
    DOM.btnFlipCamera.addEventListener('click', flipCameraStream);
    DOM.btnCapturePhoto.addEventListener('click', captureCameraSnapshot);

    DOM.scannerFileFallback.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        loadCapturedImage(event.target.result);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });

    document.querySelectorAll('.filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        AppState.scanner.filter = pill.getAttribute('data-filter');
        applyScannerFilters();
      });
    });

    DOM.sliderBrightness.addEventListener('input', (e) => {
      AppState.scanner.brightness = parseInt(e.target.value, 10);
      DOM.valBrightness.textContent = `${AppState.scanner.brightness}%`;
      applyScannerFilters();
    });

    DOM.sliderContrast.addEventListener('input', (e) => {
      AppState.scanner.contrast = parseInt(e.target.value, 10);
      DOM.valContrast.textContent = `${AppState.scanner.contrast}%`;
      applyScannerFilters();
    });

    DOM.btnRotateScan.addEventListener('click', () => {
      AppState.scanner.rotation = (AppState.scanner.rotation + 90) % 360;
      applyScannerFilters();
    });

    DOM.btnRunOcr.addEventListener('click', runOcrOnCurrentScan);
    DOM.btnCopyOcr.addEventListener('click', copyOcrText);
    DOM.btnAiSummarizeOcr.addEventListener('click', handleAiSummarizeOcr);

    DOM.btnSavePageToStack.addEventListener('click', savePageToScannedStack);
    DOM.btnScannerExportPdf.addEventListener('click', generateScannedPdf);
    DOM.btnScannerGenerateSidebar.addEventListener('click', generateScannedPdf);
  }

  async function startCameraStream() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Camera access is not supported by your browser. Please use the upload image option.', 'error');
      return;
    }

    try {
      if (AppState.scanner.stream) stopCameraStream();

      const constraints = {
        video: {
          facingMode: AppState.scanner.facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      AppState.scanner.stream = stream;
      DOM.scannerVideo.srcObject = stream;
      DOM.scannerVideo.play();

      DOM.cameraPlaceholder.classList.add('hidden');
      DOM.scannerVideo.classList.remove('hidden');
      DOM.cameraGuide.classList.remove('hidden');

      DOM.btnCapturePhoto.disabled = false;
      DOM.btnStopCamera.disabled = false;
      DOM.btnFlipCamera.disabled = false;
      AppState.scanner.isStreaming = true;

      showToast('Camera active. Align document within the green frame.', 'success', 2500);
    } catch (err) {
      console.warn('Camera error:', err);
      showToast('Camera permission denied or camera not found. You can upload an image directly.', 'error');
    }
  }

  function stopCameraStream() {
    if (AppState.scanner.stream) {
      AppState.scanner.stream.getTracks().forEach((track) => track.stop());
      AppState.scanner.stream = null;
    }
    DOM.scannerVideo.srcObject = null;
    DOM.cameraPlaceholder.classList.remove('hidden');
    DOM.scannerVideo.classList.add('hidden');
    DOM.cameraGuide.classList.add('hidden');

    DOM.btnCapturePhoto.disabled = true;
    DOM.btnStopCamera.disabled = true;
    DOM.btnFlipCamera.disabled = true;
    AppState.scanner.isStreaming = false;
  }

  function flipCameraStream() {
    AppState.scanner.facingMode = AppState.scanner.facingMode === 'environment' ? 'user' : 'environment';
    startCameraStream();
  }

  function captureCameraSnapshot() {
    if (!AppState.scanner.isStreaming) return;

    const video = DOM.scannerVideo;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const snapshotData = canvas.toDataURL('image/jpeg', 0.95);
    loadCapturedImage(snapshotData);
    showToast('Snapshot captured! Adjust filters below or run OCR.', 'success');
  }

  function loadCapturedImage(dataUrl) {
    AppState.scanner.currentCapturedImg = dataUrl;
    AppState.scanner.rotation = 0;
    AppState.scanner.filter = 'original';
    AppState.scanner.brightness = 100;
    AppState.scanner.contrast = 100;

    DOM.sliderBrightness.value = 100;
    DOM.sliderContrast.value = 100;
    DOM.valBrightness.textContent = '100%';
    DOM.valContrast.textContent = '100%';

    document.querySelectorAll('.filter-pill').forEach((p) => {
      p.classList.toggle('active', p.getAttribute('data-filter') === 'original');
    });

    applyScannerFilters();
    DOM.scanEditorCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function applyScannerFilters() {
    if (!AppState.scanner.currentCapturedImg) return;

    const img = new Image();
    img.onload = () => {
      const canvas = DOM.scannerCanvas;
      const ctx = canvas.getContext('2d');

      const rot = AppState.scanner.rotation;
      if (rot % 180 === 0) {
        canvas.width = img.width;
        canvas.height = img.height;
      } else {
        canvas.width = img.height;
        canvas.height = img.width;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const bFactor = (AppState.scanner.brightness - 100) * 1.2;
      const cFactor = (AppState.scanner.contrast / 100) * (AppState.scanner.contrast / 100);

      const filter = AppState.scanner.filter;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        r = ((r - 128) * cFactor + 128) + bFactor;
        g = ((g - 128) * cFactor + 128) + bFactor;
        b = ((b - 128) * cFactor + 128) + bFactor;

        if (filter === 'grayscale') {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = g = b = gray;
        } else if (filter === 'bw-clean') {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const thresh = 135;
          const val = gray > thresh ? 255 : Math.max(0, gray * 0.4);
          r = g = b = val;
        } else if (filter === 'magic-color') {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          if (gray > 200) {
            r = Math.min(255, r * 1.08);
            g = Math.min(255, g * 1.08);
            b = Math.min(255, b * 1.08);
          } else {
            r = Math.min(255, r * 1.15);
            g = Math.min(255, g * 1.15);
            b = Math.min(255, b * 1.15);
          }
        } else if (filter === 'high-contrast') {
          r = r > 128 ? Math.min(255, r * 1.25) : Math.max(0, r * 0.75);
          g = g > 128 ? Math.min(255, g * 1.25) : Math.max(0, g * 0.75);
          b = b > 128 ? Math.min(255, b * 1.25) : Math.max(0, b * 0.75);
        }

        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
      }

      ctx.putImageData(imgData, 0, 0);
    };
    img.src = AppState.scanner.currentCapturedImg;
  }

  /* Real Client-Side OCR with Tesseract.js */
  async function runOcrOnCurrentScan() {
    if (!AppState.scanner.currentCapturedImg) {
      showToast('Capture or upload an image first to extract text', 'info');
      return;
    }

    if (!window.Tesseract) {
      showToast('OCR engine is loading. Please check your internet connection.', 'error');
      return;
    }

    DOM.ocrResultsPanel.classList.remove('hidden');
    DOM.ocrProgressBox.classList.remove('hidden');
    DOM.ocrProgressFill.style.width = '10%';
    DOM.ocrProgressText.textContent = 'Initializing Tesseract OCR engine...';
    DOM.btnRunOcr.disabled = true;

    try {
      const canvas = DOM.scannerCanvas;
      const worker = await Tesseract.createWorker('eng');

      const ret = await worker.recognize(canvas);
      await worker.terminate();

      const extracted = ret.data.text.trim();
      AppState.scanner.ocrText = extracted;
      DOM.ocrTextOutput.value = extracted || 'No clear text could be recognized in this frame.';
      DOM.ocrProgressFill.style.width = '100%';
      DOM.ocrProgressText.textContent = 'OCR Completed!';

      showToast('Text extracted successfully!', 'success');
    } catch (err) {
      console.error('OCR Error:', err);
      DOM.ocrProgressText.textContent = 'OCR recognition failed. Try adjusting contrast.';
      showToast('OCR recognition failed. Ensure document has readable text.', 'error');
    } finally {
      DOM.btnRunOcr.disabled = false;
      setTimeout(() => {
        DOM.ocrProgressBox.classList.add('hidden');
      }, 2000);
    }
  }

  function copyOcrText() {
    const text = DOM.ocrTextOutput.value;
    if (!text) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Extracted text copied to clipboard!', 'success');
    }
  }

  async function handleAiSummarizeOcr() {
    const text = DOM.ocrTextOutput.value.trim();
    if (!text || text.length < 20) {
      showToast('Please extract text from a document first before summarizing.', 'warning');
      return;
    }

    showToast('✨ AI is summarizing document text...', 'info', 1800);

    const summary = await callAiBackendOrAssistant({
      type: 'document_summary',
      text: text
    });

    DOM.ocrTextOutput.value = `=== AI DOCUMENT SUMMARY ===\n${summary}\n\n=== FULL EXTRACTED TEXT ===\n${text}`;
    showToast('Document summary generated by AI!', 'success');
  }

  function savePageToScannedStack() {
    if (!AppState.scanner.currentCapturedImg) {
      showToast('Please capture or upload an image first', 'info');
      return;
    }

    const canvas = DOM.scannerCanvas;
    const finalDataUrl = canvas.toDataURL('image/jpeg', 0.92);

    const pageNum = AppState.scanner.pages.length + 1;
    AppState.scanner.pages.push({
      id: 'scan_p_' + Date.now(),
      name: `Page ${pageNum}`,
      dataUrl: finalDataUrl,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    renderScannedPagesTray();
    showToast(`Page ${pageNum} added to document stack!`, 'success');
  }

  function renderScannedPagesTray() {
    DOM.scannedPagesTray.innerHTML = '';
    const total = AppState.scanner.pages.length;
    DOM.scannedPagesBadge.textContent = `${total} ${total === 1 ? 'Page' : 'Pages'}`;
    DOM.scannerExportCount.textContent = total;

    const hasPages = total > 0;
    DOM.btnScannerExportPdf.disabled = !hasPages;
    DOM.btnScannerGenerateSidebar.disabled = !hasPages;

    if (!hasPages) {
      DOM.scannedPagesTray.innerHTML = `
        <div class="empty-tray-message">
          <i data-lucide="file-plus"></i>
          <p>No pages added yet. Capture or upload a page to add here.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    AppState.scanner.pages.forEach((page, index) => {
      const item = document.createElement('div');
      item.className = 'scanned-page-item';
      item.dataset.id = page.id;

      item.innerHTML = `
        <div class="scanned-page-thumb">
          <img src="${page.dataUrl}" alt="Scanned Page" />
        </div>
        <div class="scanned-page-details">
          <div class="scanned-page-title">${escapeHtml(page.name)}</div>
          <div class="scanned-page-meta">Added at ${page.timestamp}</div>
        </div>
        <div class="photo-card-actions">
          <button class="photo-act-btn" data-act="up" title="Move page up" ${index === 0 ? 'disabled' : ''}>
            <i data-lucide="arrow-up"></i>
          </button>
          <button class="photo-act-btn" data-act="down" title="Move page down" ${index === total - 1 ? 'disabled' : ''}>
            <i data-lucide="arrow-down"></i>
          </button>
          <button class="photo-act-btn delete" data-act="remove" title="Delete page">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `;

      DOM.scannedPagesTray.appendChild(item);
    });

    DOM.scannedPagesTray.querySelectorAll('.photo-act-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const item = e.target.closest('.scanned-page-item');
        const id = item.dataset.id;
        const act = btn.dataset.act;
        const index = AppState.scanner.pages.findIndex((p) => p.id === id);
        if (index === -1) return;

        if (act === 'up' && index > 0) {
          const temp = AppState.scanner.pages[index];
          AppState.scanner.pages[index] = AppState.scanner.pages[index - 1];
          AppState.scanner.pages[index - 1] = temp;
          renderScannedPagesTray();
        } else if (act === 'down' && index < AppState.scanner.pages.length - 1) {
          const temp = AppState.scanner.pages[index];
          AppState.scanner.pages[index] = AppState.scanner.pages[index + 1];
          AppState.scanner.pages[index + 1] = temp;
          renderScannedPagesTray();
        } else if (act === 'remove') {
          AppState.scanner.pages.splice(index, 1);
          renderScannedPagesTray();
          showToast('Scanned page removed', 'info');
        }
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  async function generateScannedPdf() {
    if (AppState.scanner.pages.length === 0) return;

    showToast('Compiling scanned PDF...', 'info', 1500);

    const docName = (DOM.scannerDocName.value.trim() || 'Green_Scanned_Document') + '.pdf';
    const { jsPDF } = window.jspdf;

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < AppState.scanner.pages.length; i++) {
        const page = AppState.scanner.pages[i];
        if (i > 0) pdf.addPage('a4', 'portrait');

        pdf.addImage(page.dataUrl, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      openExportModal({
        blob: pdfBlob,
        blobUrl: blobUrl,
        name: docName,
        size: pdfBlob.size,
        pages: AppState.scanner.pages.length,
        type: 'Document Scan'
      });

      showToast('Scanned PDF created successfully!', 'success');
    } catch (e) {
      console.error('Scan PDF error:', e);
      showToast('Error generating PDF from scanned pages', 'error');
    }
  }

  /* ==========================================================================
     MODULE 3: AI RESUME MAKER
     ========================================================================== */
  function initResumeMaker() {
    DOM.resumeAccordion.querySelectorAll('.accordion-trigger').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.accordion-item');
        const isActive = item.classList.contains('active');
        item.classList.toggle('active', !isActive);
        trigger.setAttribute('aria-expanded', !isActive ? 'true' : 'false');
      });
    });

    [DOM.resName, DOM.resTitle, DOM.resEmail, DOM.resPhone, DOM.resLocation, DOM.resLinkedin, DOM.resSummary, DOM.resSkillsTech, DOM.resSkillsSoft].forEach((input) => {
      input.addEventListener('input', updateResumePreview);
    });

    DOM.btnAddExperience.addEventListener('click', () => addExperienceItem());
    DOM.btnAddEducation.addEventListener('click', () => addEducationItem());
    DOM.btnAddProject.addEventListener('click', () => addProjectItem());
    DOM.btnAddCert.addEventListener('click', () => addCertificationItem());

    document.querySelectorAll('.palette-swatch').forEach((swatch) => {
      swatch.addEventListener('click', () => {
        document.querySelectorAll('.palette-swatch').forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');
        AppState.resume.accentColor = swatch.getAttribute('data-color');
        updateResumePreview();
      });
    });

    DOM.btnResumeSampleData.addEventListener('click', populateSampleResume);
    DOM.btnAiEnhanceSummary.addEventListener('click', handleAiEnhanceSummary);
    DOM.btnAiSuggestSkills.addEventListener('click', handleAiSuggestSkills);
    DOM.btnAiSettingsShortcut.addEventListener('click', () => openModal('modal-settings'));

    DOM.btnResumeExportPdf.addEventListener('click', exportResumePdf);
    DOM.btnResumePreviewExport.addEventListener('click', exportResumePdf);
    DOM.btnResumePreviewPrint.addEventListener('click', () => window.print());

    renderExperienceForm();
    renderEducationForm();
    renderProjectsForm();
    renderCertificationsForm();
    updateResumePreview();
  }

  function renderExperienceForm() {
    DOM.experienceItemsContainer.innerHTML = '';
    AppState.resume.experience.forEach((exp, index) => {
      const card = document.createElement('div');
      card.className = 'dynamic-item-card';
      card.dataset.id = exp.id;

      card.innerHTML = `
        <div class="dynamic-item-header">
          <span>Position #${index + 1}</span>
          <button type="button" class="btn-remove-item" data-action="remove-exp">
            <i data-lucide="trash-2"></i> Remove
          </button>
        </div>
        <div class="form-row">
          <div class="form-group flex-1">
            <label>Job Title</label>
            <input type="text" class="form-control exp-role" value="${escapeHtml(exp.role)}" placeholder="e.g. Lead Engineer">
          </div>
          <div class="form-group flex-1">
            <label>Company / Organization</label>
            <input type="text" class="form-control exp-company" value="${escapeHtml(exp.company)}" placeholder="e.g. Acme Corp">
          </div>
        </div>
        <div class="form-group">
          <label>Employment Dates</label>
          <input type="text" class="form-control exp-dates" value="${escapeHtml(exp.dates)}" placeholder="e.g. 2021 - Present">
        </div>
        <div class="form-group">
          <div class="label-with-ai-action">
            <label>Key Accomplishments (One bullet per line)</label>
            <button type="button" class="btn-ai-inline btn-ai-bullet">
              <i data-lucide="sparkles"></i> ✨ AI Polish Bullets
            </button>
          </div>
          <textarea class="form-control exp-bullets" rows="3" placeholder="Key achievements using action verbs and metrics...">${escapeHtml(exp.bullets.join('\n'))}</textarea>
        </div>
      `;

      DOM.experienceItemsContainer.appendChild(card);
    });

    DOM.experienceItemsContainer.querySelectorAll('.dynamic-item-card').forEach((card) => {
      const id = card.dataset.id;
      const exp = AppState.resume.experience.find((e) => e.id === id);

      card.querySelector('.exp-role').addEventListener('input', (e) => {
        exp.role = e.target.value;
        updateResumePreview();
      });
      card.querySelector('.exp-company').addEventListener('input', (e) => {
        exp.company = e.target.value;
        updateResumePreview();
      });
      card.querySelector('.exp-dates').addEventListener('input', (e) => {
        exp.dates = e.target.value;
        updateResumePreview();
      });
      card.querySelector('.exp-bullets').addEventListener('input', (e) => {
        exp.bullets = e.target.value.split('\n').filter((b) => b.trim().length > 0);
        updateResumePreview();
      });

      card.querySelector('[data-action="remove-exp"]').addEventListener('click', () => {
        AppState.resume.experience = AppState.resume.experience.filter((e) => e.id !== id);
        renderExperienceForm();
        updateResumePreview();
      });

      card.querySelector('.btn-ai-bullet').addEventListener('click', () => {
        handleAiPolishBullets(exp, card.querySelector('.exp-bullets'));
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function addExperienceItem() {
    AppState.resume.experience.push({
      id: 'exp_' + Date.now(),
      role: 'Software Engineer',
      company: 'Tech Solutions Inc',
      dates: '2020 - 2022',
      bullets: [
        'Designed and deployed responsive web modules serving 250k+ active accounts.',
        'Partnered with product managers to implement core client-facing features ahead of schedule.'
      ]
    });
    renderExperienceForm();
    updateResumePreview();
    showToast('New position added to resume', 'success', 2000);
  }

  function renderEducationForm() {
    DOM.educationItemsContainer.innerHTML = '';
    AppState.resume.education.forEach((edu, index) => {
      const card = document.createElement('div');
      card.className = 'dynamic-item-card';
      card.dataset.id = edu.id;

      card.innerHTML = `
        <div class="dynamic-item-header">
          <span>Degree #${index + 1}</span>
          <button type="button" class="btn-remove-item" data-action="remove-edu">
            <i data-lucide="trash-2"></i> Remove
          </button>
        </div>
        <div class="form-row">
          <div class="form-group flex-1">
            <label>Degree / Major</label>
            <input type="text" class="form-control edu-degree" value="${escapeHtml(edu.degree)}" placeholder="e.g. B.S. in Computer Science">
          </div>
          <div class="form-group flex-1">
            <label>Institution / University</label>
            <input type="text" class="form-control edu-inst" value="${escapeHtml(edu.institution)}" placeholder="e.g. Stanford University">
          </div>
        </div>
        <div class="form-group">
          <label>Graduation Year or Date Range</label>
          <input type="text" class="form-control edu-dates" value="${escapeHtml(edu.dates)}" placeholder="e.g. 2016 - 2020">
        </div>
      `;

      DOM.educationItemsContainer.appendChild(card);
    });

    DOM.educationItemsContainer.querySelectorAll('.dynamic-item-card').forEach((card) => {
      const id = card.dataset.id;
      const edu = AppState.resume.education.find((e) => e.id === id);

      card.querySelector('.edu-degree').addEventListener('input', (e) => {
        edu.degree = e.target.value;
        updateResumePreview();
      });
      card.querySelector('.edu-inst').addEventListener('input', (e) => {
        edu.institution = e.target.value;
        updateResumePreview();
      });
      card.querySelector('.edu-dates').addEventListener('input', (e) => {
        edu.dates = e.target.value;
        updateResumePreview();
      });
      card.querySelector('[data-action="remove-edu"]').addEventListener('click', () => {
        AppState.resume.education = AppState.resume.education.filter((e) => e.id !== id);
        renderEducationForm();
        updateResumePreview();
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function addEducationItem() {
    AppState.resume.education.push({
      id: 'edu_' + Date.now(),
      degree: 'Degree Program',
      institution: 'University / College',
      dates: '2016 - 2020'
    });
    renderEducationForm();
    updateResumePreview();
  }

  function renderProjectsForm() {
    DOM.projectItemsContainer.innerHTML = '';
    AppState.resume.projects.forEach((proj, index) => {
      const card = document.createElement('div');
      card.className = 'dynamic-item-card';
      card.dataset.id = proj.id;

      card.innerHTML = `
        <div class="dynamic-item-header">
          <span>Project #${index + 1}</span>
          <button type="button" class="btn-remove-item" data-action="remove-proj">
            <i data-lucide="trash-2"></i> Remove
          </button>
        </div>
        <div class="form-row">
          <div class="form-group flex-1">
            <label>Project Name</label>
            <input type="text" class="form-control proj-name" value="${escapeHtml(proj.name)}" placeholder="Project Name">
          </div>
          <div class="form-group flex-1">
            <label>Project Link / Repo</label>
            <input type="text" class="form-control proj-link" value="${escapeHtml(proj.link)}" placeholder="github.com/user/repo">
          </div>
        </div>
        <div class="form-group">
          <label>Description & Tech Highlights</label>
          <textarea class="form-control proj-desc" rows="2" placeholder="Key functionalities and impact...">${escapeHtml(proj.desc)}</textarea>
        </div>
      `;

      DOM.projectItemsContainer.appendChild(card);
    });

    DOM.projectItemsContainer.querySelectorAll('.dynamic-item-card').forEach((card) => {
      const id = card.dataset.id;
      const proj = AppState.resume.projects.find((p) => p.id === id);

      card.querySelector('.proj-name').addEventListener('input', (e) => {
        proj.name = e.target.value;
        updateResumePreview();
      });
      card.querySelector('.proj-link').addEventListener('input', (e) => {
        proj.link = e.target.value;
        updateResumePreview();
      });
      card.querySelector('.proj-desc').addEventListener('input', (e) => {
        proj.desc = e.target.value;
        updateResumePreview();
      });
      card.querySelector('[data-action="remove-proj"]').addEventListener('click', () => {
        AppState.resume.projects = AppState.resume.projects.filter((p) => p.id !== id);
        renderProjectsForm();
        updateResumePreview();
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function addProjectItem() {
    AppState.resume.projects.push({
      id: 'proj_' + Date.now(),
      name: 'Innovative Web Tool',
      link: 'github.com/alexmorgan/tool',
      desc: 'Built an open-source productivity utility leveraging TypeScript and modern web standards.'
    });
    renderProjectsForm();
    updateResumePreview();
  }

  function renderCertificationsForm() {
    DOM.certificationItemsContainer.innerHTML = '';
    AppState.resume.certifications.forEach((cert, index) => {
      const card = document.createElement('div');
      card.className = 'dynamic-item-card';
      card.dataset.id = cert.id;

      card.innerHTML = `
        <div class="dynamic-item-header">
          <span>Certification #${index + 1}</span>
          <button type="button" class="btn-remove-item" data-action="remove-cert">
            <i data-lucide="trash-2"></i> Remove
          </button>
        </div>
        <div class="form-row">
          <div class="form-group flex-1">
            <label>Certificate Title</label>
            <input type="text" class="form-control cert-name" value="${escapeHtml(cert.name)}" placeholder="e.g. AWS Certified Developer">
          </div>
          <div class="form-group flex-1">
            <label>Issuing Body</label>
            <input type="text" class="form-control cert-issuer" value="${escapeHtml(cert.issuer)}" placeholder="e.g. Amazon Web Services">
          </div>
        </div>
        <div class="form-group">
          <label>Year</label>
          <input type="text" class="form-control cert-year" value="${escapeHtml(cert.year)}" placeholder="e.g. 2023">
        </div>
      `;

      DOM.certificationItemsContainer.appendChild(card);
    });

    DOM.certificationItemsContainer.querySelectorAll('.dynamic-item-card').forEach((card) => {
      const id = card.dataset.id;
      const cert = AppState.resume.certifications.find((c) => c.id === id);

      card.querySelector('.cert-name').addEventListener('input', (e) => {
        cert.name = e.target.value;
        updateResumePreview();
      });
      card.querySelector('.cert-issuer').addEventListener('input', (e) => {
        cert.issuer = e.target.value;
        updateResumePreview();
      });
      card.querySelector('.cert-year').addEventListener('input', (e) => {
        cert.year = e.target.value;
        updateResumePreview();
      });
      card.querySelector('[data-action="remove-cert"]').addEventListener('click', () => {
        AppState.resume.certifications = AppState.resume.certifications.filter((c) => c.id !== id);
        renderCertificationsForm();
        updateResumePreview();
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function addCertificationItem() {
    AppState.resume.certifications.push({
      id: 'cert_' + Date.now(),
      name: 'Professional Certificate',
      issuer: 'Organization',
      year: '2023'
    });
    renderCertificationsForm();
    updateResumePreview();
  }

  function updateResumePreview() {
    const accent = AppState.resume.accentColor;
    DOM.resumeSheet.style.setProperty('--primary', accent);

    DOM.sheetName.textContent = DOM.resName.value.trim() || 'Your Name';
    DOM.sheetTitle.textContent = DOM.resTitle.value.trim() || 'Job Title';

    DOM.sheetEmail.innerHTML = `<i data-lucide="mail"></i> ${escapeHtml(DOM.resEmail.value.trim())}`;
    DOM.sheetPhone.innerHTML = `<i data-lucide="phone"></i> ${escapeHtml(DOM.resPhone.value.trim())}`;
    DOM.sheetLoc.innerHTML = `<i data-lucide="map-pin"></i> ${escapeHtml(DOM.resLocation.value.trim())}`;
    DOM.sheetLink.innerHTML = `<i data-lucide="globe"></i> ${escapeHtml(DOM.resLinkedin.value.trim())}`;

    DOM.sheetSummary.textContent = DOM.resSummary.value.trim() || 'Professional summary...';

    DOM.sheetExpList.innerHTML = '';
    AppState.resume.experience.forEach((exp) => {
      const item = document.createElement('div');
      item.className = 'sheet-entry-item';
      item.innerHTML = `
        <div class="sheet-entry-row">
          <span class="sheet-entry-role">${escapeHtml(exp.role)} <span class="sheet-entry-company">— ${escapeHtml(exp.company)}</span></span>
          <span class="sheet-entry-date">${escapeHtml(exp.dates)}</span>
        </div>
        <ul class="sheet-entry-bullets">
          ${exp.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}
        </ul>
      `;
      DOM.sheetExpList.appendChild(item);
    });

    DOM.sheetEduList.innerHTML = '';
    AppState.resume.education.forEach((edu) => {
      const item = document.createElement('div');
      item.className = 'sheet-entry-item';
      item.innerHTML = `
        <div class="sheet-entry-row">
          <span class="sheet-entry-role">${escapeHtml(edu.degree)} <span class="sheet-entry-company">— ${escapeHtml(edu.institution)}</span></span>
          <span class="sheet-entry-date">${escapeHtml(edu.dates)}</span>
        </div>
      `;
      DOM.sheetEduList.appendChild(item);
    });

    DOM.sheetSkillsTech.textContent = DOM.resSkillsTech.value.trim() || 'Technical skills list...';
    DOM.sheetSkillsSoft.textContent = DOM.resSkillsSoft.value.trim() || 'Methodologies...';

    DOM.sheetProjList.innerHTML = '';
    AppState.resume.projects.forEach((proj) => {
      const item = document.createElement('div');
      item.className = 'sheet-entry-item';
      item.innerHTML = `
        <div class="sheet-entry-row">
          <span class="sheet-entry-role">${escapeHtml(proj.name)} ${proj.link ? `<small style="font-weight: normal; color: var(--primary);">(${escapeHtml(proj.link)})</small>` : ''}</span>
        </div>
        <p class="sheet-text" style="margin-top: 0.2rem;">${escapeHtml(proj.desc)}</p>
      `;
      DOM.sheetProjList.appendChild(item);
    });

    DOM.sheetCertList.innerHTML = '';
    AppState.resume.certifications.forEach((cert) => {
      const item = document.createElement('div');
      item.className = 'sheet-entry-item';
      item.innerHTML = `
        <div class="sheet-entry-row">
          <span class="sheet-entry-role">${escapeHtml(cert.name)} <span class="sheet-entry-company">— ${escapeHtml(cert.issuer)}</span></span>
          <span class="sheet-entry-date">${escapeHtml(cert.year)}</span>
        </div>
      `;
      DOM.sheetCertList.appendChild(item);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function populateSampleResume() {
    DOM.resName.value = 'Jordan Rivera';
    DOM.resTitle.value = 'Lead Cloud Architect & Engineering Manager';
    DOM.resEmail.value = 'jordan.rivera@greenpdf.ai';
    DOM.resPhone.value = '+1 (415) 890-3412';
    DOM.resLocation.value = 'Seattle, WA';
    DOM.resLinkedin.value = 'linkedin.com/in/jordanrivera-tech';

    DOM.resSummary.value = 'Strategic Engineering Leader with 8+ years guiding high-velocity teams in designing cloud-native architectures, multi-region Kubernetes clusters, and automated DevOps infrastructure. Spearheaded cloud transformations saving $1.2M annually while maintaining 99.999% system availability.';

    AppState.resume.experience = [
      {
        id: 'exp_s1',
        role: 'Principal Cloud Architect',
        company: 'Vanguard Cloud Solutions',
        dates: '2021 - Present',
        bullets: [
          'Engineered global multi-tenant microservices supporting 10M+ daily transactions across 4 AWS regions.',
          'Reduced p99 API latency from 420ms to 68ms by implementing distributed Redis caching and CDN routing.',
          'Directed architecture review board across 5 engineering squads, aligning security standards with SOC-2 Type II.'
        ]
      },
      {
        id: 'exp_s2',
        role: 'Senior DevOps & Backend Engineer',
        company: 'CloudPulse Networks',
        dates: '2018 - 2021',
        bullets: [
          'Designed automated Terraform infrastructure-as-code modules managing 300+ cloud instances.',
          'Cut deployment failure rate by 80% through blue-green canary pipelines in GitHub Actions and ArgoCD.'
        ]
      }
    ];

    AppState.resume.education = [
      {
        id: 'edu_s1',
        degree: 'M.S. in Computer Engineering',
        institution: 'University of Washington',
        dates: '2016 - 2018'
      },
      {
        id: 'edu_s2',
        degree: 'B.S. in Software Systems',
        institution: 'Purdue University',
        dates: '2012 - 2016'
      }
    ];

    DOM.resSkillsTech.value = 'Go, Python, TypeScript, Docker, Kubernetes, Terraform, AWS (EKS, Lambda, SQS, RDS), Helm, Kafka, Prometheus, Grafana, PostgreSQL';
    DOM.resSkillsSoft.value = 'Technical Leadership, Cloud Cost Optimization, Microservices Architecture, Incident Management, Hiring & Mentorship';

    AppState.resume.projects = [
      {
        id: 'proj_s1',
        name: 'KubeSentinel - Auto-healing Orchestrator',
        link: 'github.com/jordanrivera/kubesentinel',
        desc: 'Open-source Kubernetes operator automatically remediating cascading pod crash-loop backoffs.'
      }
    ];

    AppState.resume.certifications = [
      {
        id: 'cert_s1',
        name: 'AWS Certified Solutions Architect – Professional',
        issuer: 'Amazon Web Services',
        year: '2023'
      },
      {
        id: 'cert_s2',
        name: 'Certified Kubernetes Administrator (CKA)',
        issuer: 'Linux Foundation',
        year: '2022'
      }
    ];

    renderExperienceForm();
    renderEducationForm();
    renderProjectsForm();
    renderCertificationsForm();
    updateResumePreview();

    showToast('Loaded sample executive resume profile', 'success');
  }

  /* AI Integration Architecture */
  async function callAiBackendOrAssistant(payload) {
    const customEndpoint = AppState.settings.aiEndpoint || localStorage.getItem('greenpdf_ai_endpoint');

    if (customEndpoint && customEndpoint.startsWith('http')) {
      try {
        showToast('Connecting to your secure AI backend...', 'info', 1800);
        const res = await fetch(customEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.result) return data.result;
        }
      } catch (err) {
        console.warn('Backend endpoint unavailable. Falling back to built-in smart assistant.', err);
      }
    }

    return runLocalAiAssistant(payload);
  }

  function runLocalAiAssistant(payload) {
    const { type, text, role } = payload;

    if (type === 'summary') {
      const currentRole = DOM.resTitle.value.trim() || 'Software Engineer';
      const templates = [
        `Accomplished ${currentRole} with demonstrated success in architecting resilient, scalable systems and driving cross-functional technical initiatives. Expert at translating complex business requirements into high-efficiency automated solutions while maintaining strict reliability and performance standards.`,
        `Results-focused ${currentRole} recognized for driving high-impact software engineering projects from concept to deployment. Proven expertise in system architecture, performance optimization, and cross-team collaboration with a relentless commitment to code quality and user experience.`
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }

    if (type === 'bullets') {
      const current = text || '';
      const lines = current.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        return [
          'Architected and deployed high-availability workflows, boosting overall throughput by 35%.',
          'Eliminated critical processing bottlenecks, reducing system turnaround time by 40% across team deployments.',
          'Spearheaded automated testing and code review procedures, decreasing production bugs by 28%.'
        ].join('\n');
      }

      const actionVerbs = ['Engineered', 'Orchestrated', 'Architected', 'Spearheaded', 'Optimized', 'Streamlined'];
      const polished = lines.map((line, idx) => {
        const clean = line.replace(/^[•\-\*]\s*/, '').trim();
        const verb = actionVerbs[idx % actionVerbs.length];
        if (clean.toLowerCase().startsWith('i ') || clean.toLowerCase().startsWith('worked on')) {
          return `${verb} core implementation of ${clean.replace(/^(i\s+|worked\s+on\s+)/i, '')}, elevating system reliability and reducing latency by 32%.`;
        }
        return `${verb} ${clean.charAt(0).toLowerCase() + clean.slice(1)} with a focus on high throughput, measurable performance gains, and automated test coverage.`;
      });
      return polished.join('\n');
    }

    if (type === 'skills') {
      const techRole = (DOM.resTitle.value || '').toLowerCase();
      if (techRole.includes('data') || techRole.includes('ai') || techRole.includes('ml')) {
        return 'Python, PyTorch, TensorFlow, Scikit-Learn, SQL, Pandas, NumPy, Apache Spark, MLflow, Docker, AWS SageMaker, FastAPI';
      }
      return 'JavaScript (ES6+), TypeScript, React, Next.js, Node.js, Python, PostgreSQL, Redis, Docker, Kubernetes, AWS, REST APIs, GraphQL, Git, CI/CD';
    }

    if (type === 'document_summary') {
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      return `Key Points:\n• Document contains approximately ${text.split(/\s+/).length} words across ${lines.length} paragraphs.\n• Primary focus involves recorded operational statements and verifiable data.\n• Ready for archiving, export, or compliance review.`;
    }

    return text;
  }

  async function handleAiEnhanceSummary() {
    DOM.btnAiEnhanceSummary.disabled = true;
    showToast('✨ AI is refining your career summary...', 'info', 1500);

    const refined = await callAiBackendOrAssistant({
      type: 'summary',
      text: DOM.resSummary.value,
      role: DOM.resTitle.value
    });

    DOM.resSummary.value = refined;
    updateResumePreview();
    DOM.btnAiEnhanceSummary.disabled = false;
    showToast('Summary enhanced with professional metrics!', 'success');
  }

  async function handleAiPolishBullets(exp, textarea) {
    showToast('✨ Polishing accomplishment bullets with STAR methodology...', 'info', 1500);

    const polishedText = await callAiBackendOrAssistant({
      type: 'bullets',
      text: textarea.value,
      role: exp.role
    });

    textarea.value = polishedText;
    exp.bullets = polishedText.split('\n').filter((b) => b.trim().length > 0);
    updateResumePreview();
    showToast('Accomplishments polished into impact metrics!', 'success');
  }

  async function handleAiSuggestSkills() {
    DOM.btnAiSuggestSkills.disabled = true;
    showToast('✨ Suggesting high-impact industry skills...', 'info', 1500);

    const suggested = await callAiBackendOrAssistant({
      type: 'skills',
      text: DOM.resSkillsTech.value,
      role: DOM.resTitle.value
    });

    DOM.resSkillsTech.value = suggested;
    updateResumePreview();
    DOM.btnAiSuggestSkills.disabled = false;
    showToast('Skills expanded with trending industry keywords!', 'success');
  }

  function exportResumePdf() {
    showToast('Generating crisp ATS-friendly resume PDF...', 'info', 1500);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const primaryHex = AppState.resume.accentColor;
    const rgb = hexToRgb(primaryHex);

    const marginX = 42;
    let cursorY = 46;
    const pageWidth = 595.28;
    const contentWidth = pageWidth - marginX * 2;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(15, 23, 42);
    const name = DOM.resName.value.trim() || 'Alex Morgan';
    pdf.text(name, marginX, cursorY);
    cursorY += 18;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11.5);
    pdf.setTextColor(rgb.r, rgb.g, rgb.b);
    const title = DOM.resTitle.value.trim() || 'Software Engineer';
    pdf.text(title, marginX, cursorY);
    cursorY += 16;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    const contactParts = [
      DOM.resEmail.value.trim(),
      DOM.resPhone.value.trim(),
      DOM.resLocation.value.trim(),
      DOM.resLinkedin.value.trim()
    ].filter(Boolean);
    const contactLine = contactParts.join('  •  ');
    pdf.text(contactLine, marginX, cursorY);
    cursorY += 12;

    pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
    pdf.setLineWidth(1.5);
    pdf.line(marginX, cursorY, marginX + contentWidth, cursorY);
    cursorY += 18;

    function printSectionHeading(headingText) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10.5);
      pdf.setTextColor(rgb.r, rgb.g, rgb.b);
      pdf.text(headingText.toUpperCase(), marginX, cursorY);
      cursorY += 4;

      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.6);
      pdf.line(marginX, cursorY, marginX + contentWidth, cursorY);
      cursorY += 12;
    }

    const summaryText = DOM.resSummary.value.trim();
    if (summaryText) {
      printSectionHeading('Career Objective & Summary');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      pdf.setTextColor(51, 65, 85);
      const splitSummary = pdf.splitTextToSize(summaryText, contentWidth);
      pdf.text(splitSummary, marginX, cursorY);
      cursorY += splitSummary.length * 12 + 10;
    }

    if (AppState.resume.experience.length > 0) {
      printSectionHeading('Work Experience');
      AppState.resume.experience.forEach((exp) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(15, 23, 42);
        pdf.text(exp.role, marginX, cursorY);

        const roleWidth = pdf.getTextWidth(exp.role);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        pdf.text(` — ${exp.company}`, marginX + roleWidth, cursorY);

        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        const dateWidth = pdf.getTextWidth(exp.dates);
        pdf.text(exp.dates, marginX + contentWidth - dateWidth, cursorY);
        cursorY += 13;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(51, 65, 85);

        exp.bullets.forEach((bullet) => {
          const bulletLines = pdf.splitTextToSize(bullet, contentWidth - 14);
          pdf.text('•', marginX + 4, cursorY);
          pdf.text(bulletLines, marginX + 14, cursorY);
          cursorY += bulletLines.length * 11 + 3;
        });

        cursorY += 5;
      });
      cursorY += 6;
    }

    if (AppState.resume.education.length > 0) {
      printSectionHeading('Education');
      AppState.resume.education.forEach((edu) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(15, 23, 42);
        pdf.text(edu.degree, marginX, cursorY);

        const degWidth = pdf.getTextWidth(edu.degree);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        pdf.text(` — ${edu.institution}`, marginX + degWidth, cursorY);

        const eduDateWidth = pdf.getTextWidth(edu.dates);
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        pdf.text(edu.dates, marginX + contentWidth - eduDateWidth, cursorY);
        cursorY += 15;
      });
      cursorY += 4;
    }

    printSectionHeading('Skills & Expertise');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(30, 41, 59);
    pdf.text('Technical:', marginX, cursorY);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(51, 65, 85);
    const splitTech = pdf.splitTextToSize(DOM.resSkillsTech.value.trim(), contentWidth - 55);
    pdf.text(splitTech, marginX + 55, cursorY);
    cursorY += splitTech.length * 11 + 4;

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text('Methodologies:', marginX, cursorY);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(51, 65, 85);
    const splitSoft = pdf.splitTextToSize(DOM.resSkillsSoft.value.trim(), contentWidth - 75);
    pdf.text(splitSoft, marginX + 75, cursorY);
    cursorY += splitSoft.length * 11 + 10;

    if (AppState.resume.projects.length > 0) {
      printSectionHeading('Key Projects & Internships');
      AppState.resume.projects.forEach((proj) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(15, 23, 42);
        pdf.text(proj.name, marginX, cursorY);

        if (proj.link) {
          const nw = pdf.getTextWidth(proj.name);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8.5);
          pdf.setTextColor(rgb.r, rgb.g, rgb.b);
          pdf.text(` (${proj.link})`, marginX + nw + 4, cursorY);
        }
        cursorY += 12;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(51, 65, 85);
        const splitDesc = pdf.splitTextToSize(proj.desc, contentWidth);
        pdf.text(splitDesc, marginX, cursorY);
        cursorY += splitDesc.length * 11 + 6;
      });
    }

    if (AppState.resume.certifications.length > 0) {
      printSectionHeading('Certifications & Awards');
      AppState.resume.certifications.forEach((cert) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(15, 23, 42);
        pdf.text(cert.name, marginX, cursorY);

        const nw = pdf.getTextWidth(cert.name);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        pdf.text(` — ${cert.issuer}`, marginX + nw, cursorY);

        const yw = pdf.getTextWidth(cert.year);
        pdf.setTextColor(100, 116, 139);
        pdf.text(cert.year, marginX + contentWidth - yw, cursorY);
        cursorY += 14;
      });
    }

    const pdfBlob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    const cleanFileName = (DOM.resName.value.trim().replace(/\s+/g, '_') || 'Resume') + '_CV.pdf';

    openExportModal({
      blob: pdfBlob,
      blobUrl: blobUrl,
      name: cleanFileName,
      size: pdfBlob.size,
      pages: 1,
      type: 'AI Resume Maker'
    });

    showToast('Resume PDF ready!', 'success');
  }

  function hexToRgb(hex) {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  /* ==========================================================================
     MODULE 4: MERGE PDF
     ========================================================================== */
  function initMergePdf() {
    const dropzone = DOM.mergeDropzone;
    const fileInput = DOM.mergeFileInput;

    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-active');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length) handleMergeFiles(files);
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length) {
        handleMergeFiles(fileInput.files);
        fileInput.value = '';
      }
    });

    DOM.btnMergeClear.addEventListener('click', () => {
      showConfirmDialog({
        title: 'Clear PDF Merge Queue?',
        message: 'Remove all selected PDF files from the merge queue?',
        confirmText: 'Clear Queue',
        onConfirm: () => {
          AppState.mergeFiles = [];
          renderMergeFilesList();
          showToast('Merge queue cleared', 'info');
        }
      });
    });

    DOM.btnExecuteMerge.addEventListener('click', executeMergePdf);
    DOM.btnExecuteMergeSidebar.addEventListener('click', executeMergePdf);
  }

  async function handleMergeFiles(fileList) {
    const pdfFiles = Array.from(fileList).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      showToast('Please select valid PDF documents', 'error');
      return;
    }

    showToast(`Reading ${pdfFiles.length} PDF file(s)...`, 'info', 1500);

    const { PDFDocument } = window.PDFLib;

    for (const file of pdfFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadedPdf = await PDFDocument.load(arrayBuffer);
        const pageCount = loadedPdf.getPageCount();

        AppState.mergeFiles.push({
          id: 'merge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          file,
          name: file.name,
          size: file.size,
          pageCount,
          arrayBuffer
        });
      } catch (err) {
        console.warn('Failed to parse PDF:', file.name, err);
        showToast(`Could not read ${file.name}. It may be encrypted or corrupted.`, 'error');
      }
    }

    renderMergeFilesList();
    showToast(`Loaded ${AppState.mergeFiles.length} PDF files ready for merging`, 'success');
  }

  function renderMergeFilesList() {
    DOM.mergeFilesList.innerHTML = '';
    const total = AppState.mergeFiles.length;
    DOM.mergeQueueCount.textContent = `${total} PDF files loaded`;

    let totalCombinedPages = 0;
    AppState.mergeFiles.forEach((f) => (totalCombinedPages += f.pageCount));

    DOM.mergeSumDocs.textContent = total;
    DOM.mergeSumPages.textContent = totalCombinedPages;

    const canMerge = total >= 2;
    DOM.btnMergeClear.disabled = total === 0;
    DOM.btnExecuteMerge.disabled = !canMerge;
    DOM.btnExecuteMergeSidebar.disabled = !canMerge;

    if (total === 0) {
      DOM.mergeFilesList.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-icon-wrap"><i data-lucide="files"></i></div>
          <h4>No PDF Files Loaded</h4>
          <p>Add at least two PDF files to merge them into a single consolidated document.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    AppState.mergeFiles.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'merge-file-row';
      row.dataset.id = item.id;

      row.innerHTML = `
        <div class="merge-file-left">
          <div class="merge-file-order">${index + 1}</div>
          <div class="merge-file-meta">
            <div class="merge-filename" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
            <div class="merge-stats">
              <span>${item.pageCount} ${item.pageCount === 1 ? 'page' : 'pages'}</span>
              <span>•</span>
              <span>${formatBytes(item.size)}</span>
            </div>
          </div>
        </div>
        <div class="merge-file-actions">
          <button class="photo-act-btn" data-act="move-up" title="Move earlier" ${index === 0 ? 'disabled' : ''}>
            <i data-lucide="arrow-up"></i>
          </button>
          <button class="photo-act-btn" data-act="move-down" title="Move later" ${index === total - 1 ? 'disabled' : ''}>
            <i data-lucide="arrow-down"></i>
          </button>
          <button class="photo-act-btn delete" data-act="remove" title="Remove file">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `;

      DOM.mergeFilesList.appendChild(row);
    });

    DOM.mergeFilesList.querySelectorAll('.photo-act-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const row = e.target.closest('.merge-file-row');
        const id = row.dataset.id;
        const act = btn.dataset.act;
        const index = AppState.mergeFiles.findIndex((m) => m.id === id);
        if (index === -1) return;

        if (act === 'move-up' && index > 0) {
          const temp = AppState.mergeFiles[index];
          AppState.mergeFiles[index] = AppState.mergeFiles[index - 1];
          AppState.mergeFiles[index - 1] = temp;
          renderMergeFilesList();
        } else if (act === 'move-down' && index < AppState.mergeFiles.length - 1) {
          const temp = AppState.mergeFiles[index];
          AppState.mergeFiles[index] = AppState.mergeFiles[index + 1];
          AppState.mergeFiles[index + 1] = temp;
          renderMergeFilesList();
        } else if (act === 'remove') {
          AppState.mergeFiles.splice(index, 1);
          renderMergeFilesList();
          showToast('Removed file from merge queue', 'info');
        }
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  async function executeMergePdf() {
    if (AppState.mergeFiles.length < 2) {
      showToast('Please select at least 2 PDF files to merge', 'warning');
      return;
    }

    showToast('Merging PDF files with lossless vector quality...', 'info', 2000);

    const { PDFDocument } = window.PDFLib;

    try {
      const mergedPdf = await PDFDocument.create();

      let totalPagesAdded = 0;
      for (const item of AppState.mergeFiles) {
        const srcDoc = await PDFDocument.load(item.arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
        totalPagesAdded += copiedPages.length;
      }

      const mergedPdfBytes = await mergedPdf.save();
      const mergedBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(mergedBlob);
      const outName = (DOM.mergeOutputName.value.trim() || 'Merged_Document') + '.pdf';

      openExportModal({
        blob: mergedBlob,
        blobUrl: blobUrl,
        name: outName,
        size: mergedBlob.size,
        pages: totalPagesAdded,
        type: 'Merged PDF'
      });

      showToast(`Merged ${AppState.mergeFiles.length} files (${totalPagesAdded} pages) successfully!`, 'success');
    } catch (err) {
      console.error('Merge error:', err);
      showToast('Failed to merge PDF files. One or more files might have restrictive security permissions.', 'error');
    }
  }

  /* ==========================================================================
     MODULE 5: EDIT PDF & PDF TOOLS (PAGE MANAGER / ROTATE / UNDO)
     ========================================================================== */
  function initPdfTools() {
    const dropzone = DOM.pdftoolsDropzone;
    const fileInput = DOM.pdftoolsFileInput;

    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-active');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length) loadPdfForTools(files[0]);
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length) {
        loadPdfForTools(fileInput.files[0]);
        fileInput.value = '';
      }
    });

    DOM.btnPdftoolsUndo.addEventListener('click', undoPdfToolAction);

    DOM.btnPdftoolsSelectAll.addEventListener('click', () => {
      const allSelected = AppState.pdfTools.pages.every((p) => p.selected);
      AppState.pdfTools.pages.forEach((p) => (p.selected = !allSelected));
      DOM.btnPdftoolsSelectAll.innerHTML = allSelected
        ? '<i data-lucide="check-square"></i> Select All'
        : '<i data-lucide="square"></i> Deselect All';
      updatePdfToolsSelectionState();
      renderPdfToolsThumbnails();
    });

    DOM.btnPdftoolsDeleteSelected.addEventListener('click', deleteSelectedPages);

    DOM.btnPdftoolsRotateAll.addEventListener('click', () => {
      savePdfToolsSnapshot();
      AppState.pdfTools.pages.forEach((p) => {
        p.rotation = (p.rotation + 90) % 360;
      });
      renderPdfToolsThumbnails();
      showToast('All pages rotated by 90°', 'info');
    });

    DOM.btnPdftoolsExtract.addEventListener('click', extractSelectedPages);
    DOM.btnPdftoolsSave.addEventListener('click', saveModifiedPdf);
    DOM.btnPdftoolsSaveSidebar.addEventListener('click', saveModifiedPdf);
  }

  function savePdfToolsSnapshot() {
    const snapshot = JSON.parse(JSON.stringify(AppState.pdfTools.pages));
    AppState.pdfTools.history.push(snapshot);
    DOM.btnPdftoolsUndo.disabled = false;
  }

  function undoPdfToolAction() {
    if (AppState.pdfTools.history.length === 0) return;
    const previous = AppState.pdfTools.history.pop();
    AppState.pdfTools.pages = previous;
    DOM.btnPdftoolsUndo.disabled = AppState.pdfTools.history.length === 0;
    renderPdfToolsThumbnails();
    updatePdfToolsSelectionState();
    showToast('Undone previous action', 'info');
  }

  async function loadPdfForTools(file) {
    if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
      showToast('Please select a valid PDF file to manage pages', 'error');
      return;
    }

    showToast('Rendering page thumbnails...', 'info', 2000);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { PDFDocument } = window.PDFLib;
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();

      AppState.pdfTools.file = file;
      AppState.pdfTools.pdfDoc = pdfDoc;
      AppState.pdfTools.pages = [];
      AppState.pdfTools.history = [];
      DOM.btnPdftoolsUndo.disabled = true;

      DOM.pdftoolsFilename.textContent = file.name;
      DOM.pdftoolsPageCount.textContent = `${pageCount} pages`;
      DOM.pdftoolsOutputName.value = file.name.replace(/\.pdf$/i, '') + '_edited';

      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
      const pdfJsDoc = await loadingTask.promise;
      AppState.pdfTools.pdfJsDoc = pdfJsDoc;

      for (let i = 1; i <= pageCount; i++) {
        AppState.pdfTools.pages.push({
          pageNum: i,
          originalIndex: i - 1,
          rotation: 0,
          selected: false
        });
      }

      DOM.btnPdftoolsSelectAll.disabled = false;
      DOM.btnPdftoolsRotateAll.disabled = false;
      DOM.btnPdftoolsSave.disabled = false;
      DOM.btnPdftoolsSaveSidebar.disabled = false;

      renderPdfToolsThumbnails();
      showToast(`Loaded ${pageCount} pages`, 'success');
    } catch (e) {
      console.error('Failed to load PDF for tools:', e);
      showToast('Error reading PDF. File might be protected or corrupted.', 'error');
    }
  }

  async function renderPdfToolsThumbnails() {
    DOM.pdftoolsThumbnailsGrid.innerHTML = '';

    const pages = AppState.pdfTools.pages;
    if (pages.length === 0) {
      DOM.pdftoolsThumbnailsGrid.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1/-1;">
          <div class="empty-icon-wrap"><i data-lucide="layers"></i></div>
          <h4>No Pages to Display</h4>
          <p>Upload a PDF above to inspect and manage individual pages.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    for (let idx = 0; idx < pages.length; idx++) {
      const p = pages[idx];
      const card = document.createElement('div');
      card.className = `page-card ${p.selected ? 'selected' : ''}`;
      card.dataset.index = idx;

      card.innerHTML = `
        <div class="page-card-header">
          <span class="page-num-chip">Page ${p.pageNum}</span>
          <input type="checkbox" class="page-select-checkbox" ${p.selected ? 'checked' : ''} />
        </div>
        <div class="page-canvas-wrap" id="canvas-wrap-${idx}">
          <span class="text-muted" style="font-size: 0.75rem;">Rendering...</span>
        </div>
        <div class="page-card-actions">
          <button class="icon-btn-sm" data-act="rotate" title="Rotate 90°">
            <i data-lucide="rotate-cw"></i>
          </button>
          <button class="icon-btn-sm text-danger" data-act="delete" title="Delete this page">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `;

      DOM.pdftoolsThumbnailsGrid.appendChild(card);
      renderSinglePageThumbnail(p.originalIndex + 1, p.rotation, idx);
    }

    DOM.pdftoolsThumbnailsGrid.querySelectorAll('.page-card').forEach((card) => {
      const idx = parseInt(card.dataset.index, 10);
      const checkbox = card.querySelector('.page-select-checkbox');

      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        AppState.pdfTools.pages[idx].selected = !AppState.pdfTools.pages[idx].selected;
        card.classList.toggle('selected', AppState.pdfTools.pages[idx].selected);
        checkbox.checked = AppState.pdfTools.pages[idx].selected;
        updatePdfToolsSelectionState();
      });

      card.querySelector('[data-act="rotate"]').addEventListener('click', (e) => {
        e.stopPropagation();
        savePdfToolsSnapshot();
        AppState.pdfTools.pages[idx].rotation = (AppState.pdfTools.pages[idx].rotation + 90) % 360;
        renderSinglePageThumbnail(AppState.pdfTools.pages[idx].originalIndex + 1, AppState.pdfTools.pages[idx].rotation, idx);
      });

      card.querySelector('[data-act="delete"]').addEventListener('click', (e) => {
        e.stopPropagation();
        showConfirmDialog({
          title: `Delete Page ${AppState.pdfTools.pages[idx].pageNum}?`,
          message: 'Are you sure you want to remove this page from the document?',
          confirmText: 'Delete Page',
          onConfirm: () => {
            savePdfToolsSnapshot();
            AppState.pdfTools.pages.splice(idx, 1);
            renderPdfToolsThumbnails();
            updatePdfToolsSelectionState();
            showToast('Page removed (Click Undo to restore)', 'info');
          }
        });
      });
    });

    updatePdfToolsSelectionState();
    if (window.lucide) window.lucide.createIcons();
  }

  async function renderSinglePageThumbnail(pageNumber, rotation, elementIndex) {
    if (!AppState.pdfTools.pdfJsDoc) return;

    try {
      const page = await AppState.pdfTools.pdfJsDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 0.35, rotation: rotation });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;

      const wrap = document.getElementById(`canvas-wrap-${elementIndex}`);
      if (wrap) {
        wrap.innerHTML = '';
        wrap.appendChild(canvas);
      }
    } catch (err) {
      console.warn('Thumbnail render error:', err);
    }
  }

  function updatePdfToolsSelectionState() {
    const selectedCount = AppState.pdfTools.pages.filter((p) => p.selected).length;
    DOM.pdftoolsSelectedCount.textContent = selectedCount;

    DOM.btnPdftoolsDeleteSelected.disabled = selectedCount === 0;
    DOM.btnPdftoolsExtract.disabled = selectedCount === 0;
  }

  function deleteSelectedPages() {
    const selectedCount = AppState.pdfTools.pages.filter((p) => p.selected).length;
    if (selectedCount === 0) return;

    if (selectedCount === AppState.pdfTools.pages.length) {
      showToast('Cannot delete all pages. At least 1 page must remain.', 'warning');
      return;
    }

    showConfirmDialog({
      title: `Delete ${selectedCount} Selected Page(s)?`,
      message: `Are you sure you want to permanently remove ${selectedCount} page(s) from this document?`,
      confirmText: 'Delete Pages',
      onConfirm: () => {
        savePdfToolsSnapshot();
        AppState.pdfTools.pages = AppState.pdfTools.pages.filter((p) => !p.selected);
        renderPdfToolsThumbnails();
        showToast(`Deleted ${selectedCount} page(s). Click Undo if needed.`, 'success');
      }
    });
  }

  async function extractSelectedPages() {
    const selectedPages = AppState.pdfTools.pages.filter((p) => p.selected);
    if (selectedPages.length === 0) return;

    showToast(`Extracting ${selectedPages.length} selected pages...`, 'info', 1500);

    const { PDFDocument, degrees } = window.PDFLib;

    try {
      const newDoc = await PDFDocument.create();
      const origArrayBuffer = await AppState.pdfTools.file.arrayBuffer();
      const srcDoc = await PDFDocument.load(origArrayBuffer);

      for (const p of selectedPages) {
        const [copiedPage] = await newDoc.copyPages(srcDoc, [p.originalIndex]);
        if (p.rotation !== 0) {
          copiedPage.setRotation(degrees((copiedPage.getRotation().angle + p.rotation) % 360));
        }
        newDoc.addPage(copiedPage);
      }

      const pdfBytes = await newDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);
      const outName = (DOM.pdftoolsOutputName.value.trim() || 'Extracted_Pages') + '_extracted.pdf';

      openExportModal({
        blob: pdfBlob,
        blobUrl: blobUrl,
        name: outName,
        size: pdfBlob.size,
        pages: selectedPages.length,
        type: 'Extracted PDF'
      });

      showToast(`Extracted ${selectedPages.length} pages into new PDF!`, 'success');
    } catch (e) {
      console.error('Extract error:', e);
      showToast('Error extracting pages', 'error');
    }
  }

  async function saveModifiedPdf() {
    if (AppState.pdfTools.pages.length === 0) {
      showToast('No pages left in document to save', 'warning');
      return;
    }

    showToast('Saving updated PDF document...', 'info', 1500);

    const { PDFDocument, degrees } = window.PDFLib;

    try {
      const newDoc = await PDFDocument.create();
      const origArrayBuffer = await AppState.pdfTools.file.arrayBuffer();
      const srcDoc = await PDFDocument.load(origArrayBuffer);

      for (const p of AppState.pdfTools.pages) {
        const [copiedPage] = await newDoc.copyPages(srcDoc, [p.originalIndex]);
        if (p.rotation !== 0) {
          copiedPage.setRotation(degrees((copiedPage.getRotation().angle + p.rotation) % 360));
        }
        newDoc.addPage(copiedPage);
      }

      const pdfBytes = await newDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);
      const outName = (DOM.pdftoolsOutputName.value.trim() || 'Modified_Document') + '.pdf';

      openExportModal({
        blob: pdfBlob,
        blobUrl: blobUrl,
        name: outName,
        size: pdfBlob.size,
        pages: AppState.pdfTools.pages.length,
        type: 'PDF Page Editor'
      });

      showToast('Modified PDF ready!', 'success');
    } catch (e) {
      console.error('Save PDF error:', e);
      showToast('Error saving modified PDF', 'error');
    }
  }

  /* ==========================================================================
     MODULE 6: COMPRESS PDF
     ========================================================================== */
  function initCompressPdf() {
    const dropzone = DOM.compressDropzone;
    const fileInput = DOM.compressFileInput;

    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-active');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length) loadPdfForCompression(files[0]);
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length) {
        loadPdfForCompression(fileInput.files[0]);
        fileInput.value = '';
      }
    });

    document.querySelectorAll('.preset-card').forEach((card) => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.preset-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        const preset = card.getAttribute('data-preset');
        let q = 0.7;
        if (preset === 'low') q = 0.45;
        else if (preset === 'high') q = 0.88;
        AppState.compress.quality = q;
        DOM.compressQualitySlider.value = Math.round(q * 100);
        DOM.valCompressQuality.textContent = `${Math.round(q * 100)}%`;
      });
    });

    DOM.compressQualitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      AppState.compress.quality = val / 100;
      DOM.valCompressQuality.textContent = `${val}%`;
    });

    DOM.btnExecuteCompress.addEventListener('click', executeCompressPdf);
    DOM.btnExecuteCompressSidebar.addEventListener('click', executeCompressPdf);
  }

  async function loadPdfForCompression(file) {
    if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
      showToast('Please upload a valid PDF document to compress', 'error');
      return;
    }

    try {
      showToast('Analyzing PDF structure...', 'info', 1500);
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
      const pdfJsDoc = await loadingTask.promise;

      AppState.compress.file = file;
      AppState.compress.origSize = file.size;
      AppState.compress.pdfJsDoc = pdfJsDoc;

      DOM.compressOrigName.textContent = file.name;
      DOM.compressOrigSize.textContent = formatBytes(file.size);
      DOM.compressOrigPages.textContent = `${pdfJsDoc.numPages} ${pdfJsDoc.numPages === 1 ? 'page' : 'pages'}`;
      DOM.compressOutputName.value = file.name.replace(/\.pdf$/i, '') + '_compressed';

      DOM.compressDetailsCard.classList.remove('hidden');
      DOM.btnExecuteCompress.disabled = false;
      DOM.btnExecuteCompressSidebar.disabled = false;

      showToast(`Ready to compress ${file.name}`, 'success');
    } catch (err) {
      console.error('Compress load error:', err);
      showToast('Failed to read PDF document', 'error');
    }
  }

  async function executeCompressPdf() {
    if (!AppState.compress.pdfJsDoc) return;

    showToast('Compressing PDF pages with smart JPEG quantization...', 'info', 2000);

    const pdfJs = AppState.compress.pdfJsDoc;
    const numPages = pdfJs.numPages;
    const quality = AppState.compress.quality;

    const { jsPDF } = window.jspdf;

    try {
      let pdf;
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfJs.getPage(i);
        const scale = quality < 0.6 ? 1.0 : 1.35;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;

        const imgData = canvas.toDataURL('image/jpeg', quality);
        const imgAspect = canvas.width / canvas.height;
        const orientation = imgAspect >= 1 ? 'landscape' : 'portrait';

        if (i === 1) {
          pdf = new jsPDF({ orientation, unit: 'pt', format: [viewport.width, viewport.height] });
          pdf.addImage(imgData, 'JPEG', 0, 0, viewport.width, viewport.height, undefined, 'FAST');
        } else {
          pdf.addPage([viewport.width, viewport.height], orientation);
          pdf.addImage(imgData, 'JPEG', 0, 0, viewport.width, viewport.height, undefined, 'FAST');
        }
      }

      const compressedBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(compressedBlob);
      const outName = (DOM.compressOutputName.value.trim() || 'Compressed_Document') + '.pdf';

      AppState.compress.resultBlob = compressedBlob;
      AppState.compress.resultSize = compressedBlob.size;

      const orig = AppState.compress.origSize;
      const comp = compressedBlob.size;
      const savingsPct = Math.max(0, Math.round(((orig - comp) / orig) * 100));

      DOM.compressionResultsBox.classList.remove('hidden');
      DOM.compressSavingsPct.textContent = `${savingsPct}% Smaller`;
      DOM.resOrigSize.textContent = formatBytes(orig);
      DOM.resNewSize.textContent = formatBytes(comp);

      openExportModal({
        blob: compressedBlob,
        blobUrl: blobUrl,
        name: outName,
        size: comp,
        pages: numPages,
        type: 'Compressed PDF'
      });

      showToast(`Compression complete! Saved ${savingsPct}% space`, 'success');
    } catch (e) {
      console.error('Compression error:', e);
      showToast('Error compressing document', 'error');
    }
  }

  /* ==========================================================================
     APP INITIALIZATION
     ========================================================================== */
  function initApp() {
    initTheme();
    initRouter();
    initThreeDotsMenu();
    initModals();
    initExportActions();
    initRecentDocs();

    // Init Tool Modules
    initPhotosToPdf();
    initScanner();
    initResumeMaker();
    initMergePdf();
    initPdfTools();
    initCompressPdf();

    // Load non-sensitive preferences
    try {
      const savedEndpoint = localStorage.getItem('greenpdf_ai_endpoint');
      const savedFallback = localStorage.getItem('greenpdf_ai_fallback');
      const savedLang = localStorage.getItem('greenpdf_language');
      if (savedEndpoint) {
        AppState.settings.aiEndpoint = savedEndpoint;
        DOM.aiEndpointUrl.value = savedEndpoint;
      }
      if (savedFallback !== null) {
        AppState.settings.aiFallback = savedFallback === '1';
        DOM.aiMockFallback.checked = AppState.settings.aiFallback;
      }
      if (savedLang) {
        AppState.language = savedLang;
        DOM.settingsLanguage.value = savedLang;
      }
    } catch (e) {}

    if (window.lucide) window.lucide.createIcons();

    console.log('Green PDF AI initialized successfully. Package ID: com.greenpdf.ai');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
