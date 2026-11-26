# imgsfix — Site Architecture & Expansion Guide

**imgsfix** is a 100% client-side, privacy-first Progressive Web App (PWA) built with Vanilla JavaScript (ES Modules), HTML5, CSS3 design tokens (`css/style.css`), and Vite multi-page bundling (`vite.config.ts`). Every tool runs locally inside the user's browser with zero external server uploads, tracking, or accounts.

---

## 1. Directory & Route Tree

```text
/
├── index.html                        # Homepage: Hero + 6 Category Hub Cards + Global Search
├── manifest.json                     # PWA Web App Manifest
├── sw.js                             # Service Worker (offline asset & page caching)
├── vite.config.ts                    # Vite multi-page bundler (auto-discovers pages/**/*.html)
├── SITE_ARCHITECTURE.md              # Architecture map & developer onboarding guide
├── css/
│   └── style.css                     # Centralized CSS3 tokens, layout, tool & category styles
├── assets/
│   ├── cairo.css                     # Typography stylesheet
│   └── icons/                        # PWA icons
├── js/
│   ├── main.js                       # Shared core: i18n (EN/AR RTL), header/footer, BASE resolver,
│   │                                 # global TOOLS_REGISTRY search, editor bridge, download helpers
│   ├── tool-core.js                  # Legacy shared canvas bootstrap for basic tools
│   ├── enhance.js                    # Smart Image Enhance Studio (ES Module)
│   ├── resize.js                     # Dimension Resize Studio (ES Module)
│   ├── convert.js                    # Multi-Format Converter Studio (ES Module)
│   ├── compress.js                   # Client-side compression module (browser-image-compression + upng-js)
│   ├── remove-bg.js                  # Local in-browser AI background removal (@imgly/background-removal)
│   ├── editor.js                     # Full-viewport Advanced Photo Editor (Fabric.js + jsPDF)
│   ├── qr-reader.js                  # Local camera/image QR & barcode scanner (html5-qrcode)
│   ├── text-summarizer.js            # Smart Text Summarizer & Key Points Extractor (ES Module)
│   ├── word-counter.js               # Word, Character, Reading Time & SEO Keyword Analyzer (ES Module)
│   ├── text-formatter.js             # Text Formatter & Cleaner (ES Module)
│   ├── text-diff.js                  # Text Diff & Compare Tool (LCS Engine ES Module)
│   ├── fancy-text.js                 # Fancy Text & Symbols Generator (Unicode & Kashida ES Module)
│   ├── image-to-text.js              # Image to Text OCR Studio (Tesseract.js ES Module)
│   ├── passport-photo.js             # Biometric Passport & Visa Photo Editor (@imgly/background-removal + jsPDF)
│   ├── thumbnail-maker.js            # YouTube & Social Thumbnail Editor (@imgly/background-removal + Canvas CTR)
│   ├── sticker-studio.js             # 4-in-1 Stickers, Memes & Cards Studio (@imgly/background-removal + jsPDF)
│   ├── coloring-page.js              # Photo to Coloring Page Studio (@imgly/background-removal + Line-Art + jsPDF)
│   ├── wallpaper-generator.js        # 4K Generative Wallpaper & Seamless Pattern Studio (Canvas 2D + SVG, 9 Engines + Blur)
│   ├── profile-picture.js            # Profile Picture (PFP) Maker Studio (@imgly/background-removal + 46 BGs + 3D Rings + ZIP)
│   ├── mockup-studio.js              # Product & Device Mockup Studio (33 Mockups, AI Logo Cutout, Perspective/Cylindrical Warps, 36 BGs, 3000px Export)
│   ├── photo-collage.js              # Smart Photo Collage Maker (60 Layouts, 2-12 Photos, Interactive Pan/Zoom/Swap, 42 BGs, 300 DPI PDF)
│   ├── yt-thumbnail.js               # YouTube Thumbnail & Cover Grabber (MaxRes/SD/HQ/MQ Canvas Export & Thumbnail Maker Handoff)
│   └── video-frame.js                # Pro Video Frame Grabber & Burst Capture Studio (Frame Stepping, Auto-Burst, JSZip & Thumbnail Handoff)
└── pages/
    ├── advanced-editor.html          # Standalone Advanced Photo Editor workspace
    ├── qr-reader.html                # Standalone QR & Barcode Reader
    ├── categories/                   # 6 Standalone Utility Category Hub Pages
    │   ├── images.html               # Images & Design (9 Live Tools)
    │   ├── ai-design.html            # Smart Studio (AI-Powered — 8 Live Tools)
    │   ├── text.html                 # Text & Content (6 Live Tools)
    │   ├── business.html             # Business & E-Commerce (1 Live + 3 Planned)
    │   ├── media.html                # Video & Media (2 Live + 2 Planned Tools)
    │   └── pdf-utils.html            # PDF & Utilities (5 Planned Tools)
    ├── tools/                        # Standalone Single-Purpose Utilities
    │   ├── compress.html             # Image Compressor
    │   ├── resize.html               # Dimension Resizer
    │   ├── convert.html              # Multi-Format Converter (JPG/PNG/WebP/AVIF/ICO/PDF/BMP)
    │   ├── crop.html                 # Interactive Canvas Crop Studio
    │   ├── remove-bg.html            # Local AI Background Remover
    │   ├── cartoon.html              # Cartoon & Illustration Studio
    │   ├── enhance.html              # Smart Image Quality Enhancer
    │   ├── filters.html              # 60fps Photographic Filters Studio
    │   ├── text-summarizer.html      # Smart Text Summarizer & Key Points Extractor
    │   ├── word-counter.html         # Word, Character, Reading Time & SEO Keyword Analyzer
    │   ├── text-formatter.html       # Text Formatter & Cleaner
    │   ├── text-diff.html            # Text Diff & Compare Tool
    │   ├── fancy-text.html           # Fancy Text & Symbols Generator
    │   ├── image-to-text.html        # Image to Text (OCR) Studio
    │   ├── passport-photo.html       # Biometric Passport & Visa Photo Editor
    │   ├── thumbnail-maker.html      # YouTube & Social Thumbnail Editor
    │   ├── sticker-studio.html       # Stickers, Memes & Cards Studio (4-in-1)
    │   ├── coloring-page.html        # Photo to Coloring Page Studio
    │   ├── wallpaper-generator.html  # 4K Generative Wallpaper & Seamless Pattern Studio
    │   ├── profile-picture.html      # Profile Picture (PFP) Maker Studio
    │   ├── mockup-studio.html        # Product & Device Mockup Studio
    │   ├── photo-collage.html        # Smart Photo Collage Maker
    │   ├── yt-thumbnail.html         # YouTube Thumbnail & Cover Grabber
    │   └── video-frame.html          # Pro Video Frame Grabber & Burst Capture Studio
    └── (about, services, faq, contact, privacy-policy, terms, cookies, disclaimer, 404).html
```

---

## 2. Categories & Tool Inventory

### 1. Images & Design (`pages/categories/images.html`) — 9 Live Tools
1. **Compress** (`pages/tools/compress.html`) — `js/compress.js`
2. **Resize Image** (`pages/tools/resize.html`) — `js/resize.js`
3. **Convert Image Format** (`pages/tools/convert.html`) — `js/convert.js`
4. **Crop** (`pages/tools/crop.html`)
5. **Remove BG** (`pages/tools/remove-bg.html`) — `js/remove-bg.js`
6. **Cartoonize** (`pages/tools/cartoon.html`)
7. **Enhance Image Quality** (`pages/tools/enhance.html`) — `js/enhance.js`
8. **Filters** (`pages/tools/filters.html`)
9. **Advanced Photo Editor** (`pages/advanced-editor.html`) — `js/editor.js`

### 2. Smart Studio (AI-Powered) (`pages/categories/ai-design.html`) — 8 Live Tools
- **Passport & Visa Photo Editor** (`pages/tools/passport-photo.html`) — `js/passport-photo.js` *(Live)*
- **YouTube & Social Thumbnail Editor** (`pages/tools/thumbnail-maker.html`) — `js/thumbnail-maker.js` *(Live)*
- **Stickers, Memes & Cards Studio** (`pages/tools/sticker-studio.html`) — `js/sticker-studio.js` *(Live — Die-Cut Sticker Maker · Meme & Comic Maker · Greeting & Quote Cards · Store Promo Badges)*
- **Photo to Coloring Page** (`pages/tools/coloring-page.html`) — `js/coloring-page.js` *(Live)*
- **Wallpaper & Pattern Generator** (`pages/tools/wallpaper-generator.html`) — `js/wallpaper-generator.js` *(Live)*
- **Profile Picture (PFP) Maker** (`pages/tools/profile-picture.html`) — `js/profile-picture.js` *(Live)*
- **Product & Device Mockup Studio** (`pages/tools/mockup-studio.html`) — `js/mockup-studio.js` *(Live)*
- **Smart Photo Collage Maker** (`pages/tools/photo-collage.html`) — `js/photo-collage.js` *(Live)*

### 3. Text & Content (`pages/categories/text.html`) — 6 Live Tools
- **Fancy Text Generator** (`pages/tools/fancy-text.html`) — `js/fancy-text.js` *(Live)*
- **Word & Character Counter** (`pages/tools/word-counter.html`) — `js/word-counter.js` *(Live)*
- **Text Formatter & Cleaner** (`pages/tools/text-formatter.html`) — `js/text-formatter.js` *(Live)*
- **Smart Text Summarizer** (`pages/tools/text-summarizer.html`) — `js/text-summarizer.js` *(Live)*
- **Text Diff & Compare** (`pages/tools/text-diff.html`) — `js/text-diff.js` *(Live)*
- **Image to Text (OCR)** (`pages/tools/image-to-text.html`) — `js/image-to-text.js` *(Live)*

### 4. Business & E-Commerce (`pages/categories/business.html`) — 1 Live + 3 Planned
- **QR & Barcode Reader** (`pages/qr-reader.html`) — *Live*
- Custom QR Code Generator *(Coming Soon)*
- WhatsApp Link Generator *(Coming Soon)*
- Invoice & Receipt Generator *(Coming Soon)*

### 5. Video & Media (`pages/categories/media.html`) — 2 Live + 2 Planned Tools
- **YouTube Thumbnail & Cover Grabber** (`pages/tools/yt-thumbnail.html`) — `js/yt-thumbnail.js` *(Live)*
- **Pro Video Frame Grabber** (`pages/tools/video-frame.html`) — `js/video-frame.js` *(Live)*
- Video to Audio Extractor *(Coming Soon)*
- Audio Trimmer & Studio Booster *(Coming Soon)*

### 6. PDF & Utilities (`pages/categories/pdf-utils.html`) — 5 Planned Tools
- Merge & Split PDF
- Image & PDF Converter
- e-Sign PDF
- Password Generator
- Pomodoro Focus Timer

---

## 3. How to Add & Activate a New Tool

Follow these steps whenever promoting a `"Coming Soon"` tool to a live standalone utility:

1. **Create the Tool Page (`pages/tools/<slug>.html`)**:
   - Include `/assets/cairo.css` and `/css/style.css` in `<head>`.
   - Set `<nav class="breadcrumb">` with `Home` (`../../index.html`), `Tools` (`../../index.html#categories`), `<Category>` (`../categories/<category>.html`), and `<Tool Title>`.
   - Preserve the standardized `.tool-shell` / `.tool-panel` / `.tool-stage` layout (`460px` fixed desktop `.tool-stage-body`, `320px` mobile).
   - Load `/js/main.js` followed by `<script type="module" src="/js/<slug>.js"></script>`.
2. **Create the Tool Module (`js/<slug>.js`)**:
   - Use Vanilla JS (ES Modules) and attach to `window.imgsfix` helpers (`t`, `toast`, `triggerDownload`, `registerEditorBridgeSource` if image-based).
   - Enforce strict file validation, canvas size guards (`16384px` / `64MP`), filename sanitization, `URL.createObjectURL` revocation, and zero unsafe `innerHTML`.
3. **Register I18N Keys & Search Metadata (`js/main.js`)**:
   - Ensure UTF-8 English (`I18N.en`) and Arabic (`I18N.ar`) keys exist for the tool title, description, and UI controls.
   - Update the tool's entry in `TOOLS_REGISTRY` inside `js/main.js`: change `url` to `'pages/tools/<slug>.html'` and `status` to `'live'`.
4. **Activate the Card in `pages/categories/<category>.html`**:
   - Remove `.is-soon` from `.tool-card`, switch `.tool-status-badge` from `is-soon` (`status_soon`) to `is-live` (`status_live`), and add `<a class="btn btn-primary btn-sm" href="../tools/<slug>.html" data-i18n="open_tool">Open Tool</a>`.
   - Update the category meta counter pill (`cat_*_meta` in `js/main.js` and the category page).
5. **Verify Build**:
   - `vite.config.ts` automatically scans `pages/**/*.html`, so run `npm run build` and `tsc --noEmit` to confirm bundling.

---

## 4. Strict Engineering & Security Rules

1. **100% Client-Side PWA**: Zero external APIs, server uploads, tracking scripts, or cloud storage. All processing occurs in-browser via Canvas, Web Workers, WASM, or Web APIs.
2. **Vanilla Stack Only**: Vanilla JavaScript (ES Modules), HTML5, CSS3 variables (`css/style.css`), and Vite. Never introduce React, Vue, Angular, or Tailwind CSS.
3. **XSS & Input Safety**: Always use `textContent` and `document.createElement` / `createElementNS` for dynamic UI rendering. Never pass user-controlled or untrusted strings to `innerHTML`.
4. **Memory & Canvas Hygiene**: Validate file sizes/MIME types/dimensions (`max 50MB / 16,384px / 64MP`), sanitize download filenames, and always revoke `URL.createObjectURL` instances on reload, clear, and `beforeunload`.
5. **Consistent Stage & Bilingual RTL**: Maintain fixed-height `.tool-stage-body`, keep `#btnDownload` directly clickable, preserve `.editor-bridge-bar` for image tools, and support full English (LTR) and Arabic (RTL) switching.
