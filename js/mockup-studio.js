/* imgsfix — mockup-studio.js
   100% client-side Product, Branding & UI Showcase Studio:
   - 0 KB external dependencies: pure Vanilla JS + HTML5 Canvas 2D API (up to 3000px export)
   - 33 Studio-Shaded Mockups across 3 categories (14 Devices/Screens, 8 Frames/Print, 11 Products/Storefront Signs)
   - One-click in-browser AI Background Removal (@imgly/background-removal isnet_fp16) for logos & product photos
   - True Cylindrical Mug/Cup Strip-Warp + Perspective Quad Warp for Isometric/3D Devices, Books, Packaging & Bags
   - Multi-Device dual-screenshot scenes (MacBook + iPhone, Dual Phones)
   - 36+ Studio Backgrounds (Solids, Gradients, Architectural Walls/Desks, Dark Showcases) + Transparent PNG + Custom BG Upload
   - Strict SVG Sanitizer, 24 EN/AR Fonts, Contact Shadow & Specular Glass Reflection Controls, Keyboard Shortcuts
*/
import { removeBackground, preload } from '@imgly/background-removal';

(function () {
  var I = window.imgsfix || {};
  var $ = I.$ || function (s, r) { return (r || document).querySelector(s); };
  var $$ = I.$$ || function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var t = I.t || function (k) { return k; };
  var toast = I.toast || function () {};

  /* ----- Constants ----- */
  var MAX_FILE_BYTES = 30 * 1024 * 1024;
  var MAX_IMAGE_DIM = 12000;
  var MAX_UNDO = 20;
  var ALLOWED_MIMES = {
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'image/bmp': true,
    'image/gif': true,
    'image/svg+xml': true,
  };
  var DANGEROUS_SVG_TAGS = {
    script: true,
    foreignobject: true,
    iframe: true,
    object: true,
    embed: true,
    link: true,
    meta: true,
    base: true,
    audio: true,
    video: true,
    canvas: true,
    frame: true,
    frameset: true,
  };

  var ASPECT_SPECS = {
    '16:9': { id: '16:9', w: 1000, h: 563 },
    '1:1':  { id: '1:1',  w: 800,  h: 800 },
    '4:5':  { id: '4:5',  w: 800,  h: 1000 },
    '9:16': { id: '9:16', w: 563,  h: 1000 },
  };

  /* Unified 24-Font Library (12 Arabic + 12 English) */
  var FONT_LIBRARY = [
    { id: 'cairo',      group: 'ar', label: 'Cairo',                family: 'Cairo',                weight: '900', css: '"Cairo", system-ui, sans-serif',              sample: 'منتج احترافي' },
    { id: 'tajawal',    group: 'ar', label: 'Tajawal',              family: 'Tajawal',              weight: '800', css: '"Tajawal", "Cairo", sans-serif',              sample: 'منتج احترافي' },
    { id: 'changa',     group: 'ar', label: 'Changa',               family: 'Changa',               weight: '800', css: '"Changa", "Cairo", sans-serif',               sample: 'منتج احترافي' },
    { id: 'almarai',    group: 'ar', label: 'Almarai',              family: 'Almarai',              weight: '800', css: '"Almarai", "Cairo", sans-serif',              sample: 'منتج احترافي' },
    { id: 'ibm_ar',     group: 'ar', label: 'IBM Plex Sans Arabic', family: 'IBM Plex Sans Arabic', weight: '700', css: '"IBM Plex Sans Arabic", "Cairo", sans-serif', sample: 'منتج احترافي' },
    { id: 'readex',     group: 'ar', label: 'Readex Pro',           family: 'Readex Pro',           weight: '700', css: '"Readex Pro", "Cairo", sans-serif',           sample: 'منتج احترافي' },
    { id: 'amiri',      group: 'ar', label: 'Amiri',                family: 'Amiri',                weight: '700', css: '"Amiri", Georgia, serif',                     sample: 'منتج احترافي' },
    { id: 'aref_ruqaa', group: 'ar', label: 'Aref Ruqaa',           family: 'Aref Ruqaa',           weight: '700', css: '"Aref Ruqaa", "Amiri", serif',                sample: 'منتج احترافي' },
    { id: 'lalezar',    group: 'ar', label: 'Lalezar',              family: 'Lalezar',              weight: '400', css: '"Lalezar", "Cairo", sans-serif',              sample: 'منتج احترافي' },
    { id: 'reem_kufi',  group: 'ar', label: 'Reem Kufi',            family: 'Reem Kufi',            weight: '700', css: '"Reem Kufi", "Cairo", sans-serif',            sample: 'منتج احترافي' },
    { id: 'el_messiri', group: 'ar', label: 'El Messiri',           family: 'El Messiri',           weight: '700', css: '"El Messiri", "Cairo", sans-serif',           sample: 'منتج احترافي' },
    { id: 'lemonada',   group: 'ar', label: 'Lemonada',             family: 'Lemonada',             weight: '700', css: '"Lemonada", "Cairo", sans-serif',             sample: 'منتج احترافي' },
    { id: 'impact',     group: 'en', label: 'Impact',           family: 'Impact',           weight: '900', css: 'Impact, "Arial Black", sans-serif',       sample: 'STUDIO LAUNCH' },
    { id: 'anton',      group: 'en', label: 'Anton',            family: 'Anton',            weight: '400', css: '"Anton", Impact, sans-serif',             sample: 'STUDIO LAUNCH' },
    { id: 'bebas',      group: 'en', label: 'Bebas Neue',       family: 'Bebas Neue',       weight: '400', css: '"Bebas Neue", Impact, sans-serif',        sample: 'STUDIO LAUNCH' },
    { id: 'montserrat', group: 'en', label: 'Montserrat',       family: 'Montserrat',       weight: '900', css: '"Montserrat", system-ui, sans-serif',     sample: 'Studio Launch' },
    { id: 'oswald',     group: 'en', label: 'Oswald',           family: 'Oswald',           weight: '700', css: '"Oswald", Impact, sans-serif',            sample: 'STUDIO LAUNCH' },
    { id: 'poppins',    group: 'en', label: 'Poppins',          family: 'Poppins',          weight: '800', css: '"Poppins", system-ui, sans-serif',        sample: 'Studio Launch' },
    { id: 'roboto',     group: 'en', label: 'Roboto',           family: 'Roboto',           weight: '900', css: '"Roboto", system-ui, sans-serif',         sample: 'Studio Launch' },
    { id: 'luckiest',   group: 'en', label: 'Luckiest Guy',     family: 'Luckiest Guy',     weight: '400', css: '"Luckiest Guy", Impact, sans-serif',      sample: 'Studio Launch' },
    { id: 'bangers',    group: 'en', label: 'Bangers',          family: 'Bangers',          weight: '400', css: '"Bangers", Impact, sans-serif',           sample: 'STUDIO LAUNCH' },
    { id: 'playfair',   group: 'en', label: 'Playfair Display', family: 'Playfair Display', weight: '900', css: '"Playfair Display", Georgia, serif',      sample: 'Studio Launch' },
    { id: 'pacifico',   group: 'en', label: 'Pacifico',         family: 'Pacifico',         weight: '400', css: '"Pacifico", cursive',                     sample: 'Studio Launch' },
    { id: 'permanent',  group: 'en', label: 'Permanent Marker', family: 'Permanent Marker', weight: '400', css: '"Permanent Marker", cursive',             sample: 'Studio Launch' },
  ];

  /* 33 Studio-Shaded Mockup Templates */
  var TEMPLATES = [
    /* Category A — Devices, Screens & Smartwatches (14) */
    { id: 'iphone16',       cat: 'devices', key: 'ms_tpl_iphone16',       swatches: ['#B8B3AA', '#232428', '#E5E7EB', '#D8BEA2'], icon: 'phone' },
    { id: 's24ultra',       cat: 'devices', key: 'ms_tpl_s24ultra',       swatches: ['#8A8A86', '#1C1D20', '#4C4766'],            icon: 'phone' },
    { id: 'frameless_phone',cat: 'devices', key: 'ms_tpl_frameless',      swatches: ['#18181B', '#E2E8F0', '#1D4ED8'],            icon: 'phone' },
    { id: 'iso_phone',      cat: 'devices', key: 'ms_tpl_isophone',       swatches: ['#27272A', '#B8B3AA', '#1E3A8A'],            icon: 'phone' },
    { id: 'watch_ultra',    cat: 'devices', key: 'ms_tpl_watch',          swatches: ['#1E293B', '#E2DFD7', '#EA580C'],            icon: 'watch' },
    { id: 'ipad_portrait',  cat: 'devices', key: 'ms_tpl_ipad_p',         swatches: ['#1F2937', '#D1D5DB'],                       icon: 'tablet' },
    { id: 'ipad_landscape', cat: 'devices', key: 'ms_tpl_ipad_l',         swatches: ['#1F2937', '#D1D5DB'],                       icon: 'tablet' },
    { id: 'macbook_pro',    cat: 'devices', key: 'ms_tpl_mb_pro',         swatches: ['#1E2024', '#475569'],                       icon: 'laptop' },
    { id: 'macbook_air',    cat: 'devices', key: 'ms_tpl_mb_air',         swatches: ['#D8DCE2', '#9CA3AF', '#374151'],            icon: 'laptop' },
    { id: 'studio_display', cat: 'devices', key: 'ms_tpl_imac',           swatches: ['#D1D5DB', '#1E293B', '#2563EB'],            icon: 'monitor' },
    { id: 'browser_light',  cat: 'devices', key: 'ms_tpl_browser_l',      swatches: ['#FFFFFF', '#F1F5F9'],                       icon: 'browser' },
    { id: 'browser_dark',   cat: 'devices', key: 'ms_tpl_browser_d',      swatches: ['#0F172A', '#1E1B4B'],                       icon: 'browser' },
    { id: 'mb_iphone',      cat: 'devices', key: 'ms_tpl_mb_iphone',      swatches: ['#1E2024', '#CBD5E1'],                       icon: 'dual', dual: true },
    { id: 'dual_phones',    cat: 'devices', key: 'ms_tpl_dual_phones',    swatches: ['#18181B', '#B8B3AA', '#1D4ED8'],            icon: 'dual', dual: true },
    /* Category B — Wall Art Frames & Print Publications (8) */
    { id: 'oak_frame',      cat: 'print',   key: 'ms_tpl_oak_frame',      swatches: ['#B58453', '#8C5E35', '#D4A876'],            icon: 'frame' },
    { id: 'black_frame',    cat: 'print',   key: 'ms_tpl_black_frame',    swatches: ['#18181B', '#334155'],                       icon: 'frame' },
    { id: 'gold_frame',     cat: 'print',   key: 'ms_tpl_gold_frame',     swatches: ['#D4AF37', '#B8860B', '#E5C158'],            icon: 'frame' },
    { id: 'canvas_wrap',    cat: 'print',   key: 'ms_tpl_canvas_wrap',    swatches: ['#F8FAFC', '#E2E8F0'],                       icon: 'frame' },
    { id: 'hardcover_book', cat: 'print',   key: 'ms_tpl_book',           swatches: ['#1E3A8A', '#0F172A', '#991B1B', '#065F46'], icon: 'book' },
    { id: 'open_magazine',  cat: 'print',   key: 'ms_tpl_magazine',       swatches: ['#F8FAFC', '#F1F5F9'],                       icon: 'book' },
    { id: 'business_card',  cat: 'print',   key: 'ms_tpl_bcard',          swatches: ['#FFFFFF', '#111827', '#FEF3C7'],            icon: 'card' },
    { id: 'wall_poster',    cat: 'print',   key: 'ms_tpl_poster',         swatches: ['#FFFFFF', '#F5F2EB'],                       icon: 'frame' },
    /* Category C — E-Commerce Products & Storefront Branding (11) */
    { id: 'coffee_mug',     cat: 'products',key: 'ms_tpl_mug',            swatches: ['#FFFFFF', '#1E293B', '#0F766E', '#DC2626'], icon: 'mug' },
    { id: 'paper_cup',      cat: 'products',key: 'ms_tpl_cup',            swatches: ['#FAF7F2', '#18181B', '#D2B48C'],            icon: 'mug' },
    { id: 'tshirt',         cat: 'products',key: 'ms_tpl_tshirt',         swatches: ['#F8FAFC', '#18181B', '#CBD5E1', '#1E3A8A', '#14532D', '#C2410C'], icon: 'shirt' },
    { id: 'hoodie',         cat: 'products',key: 'ms_tpl_hoodie',         swatches: ['#1E293B', '#CBD5E1', '#F8FAFC', '#312E81', '#7F1D1D'], icon: 'shirt' },
    { id: 'polo_shirt',     cat: 'products',key: 'ms_tpl_polo',           swatches: ['#0F172A', '#FFFFFF', '#1E3A8A', '#065F46', '#7F1D1D', '#CBD5E1'], icon: 'shirt' },
    { id: 'tote_bag',       cat: 'products',key: 'ms_tpl_tote',           swatches: ['#F4EFE6', '#1E293B', '#6B8E78'],            icon: 'bag' },
    { id: 'product_box',    cat: 'products',key: 'ms_tpl_box',            swatches: ['#F8FAFC', '#1E293B', '#C9A679', '#1D4ED8'], icon: 'box' },
    { id: 'kraft_bag',      cat: 'products',key: 'ms_tpl_kraft',          swatches: ['#C9A679', '#18181B', '#F8FAFC', '#0F766E'], icon: 'bag' },
    { id: 'storefront_sign',cat: 'products',key: 'ms_tpl_sign',           swatches: ['#1E293B', '#F8FAFC', '#7C2D12', '#064E3B'], icon: 'sign' },
    { id: 'blade_sign',     cat: 'products',key: 'ms_tpl_blade_sign',     swatches: ['#1E293B', '#F8FAFC', '#B45309', '#064E3B'], icon: 'sign' },
    { id: 'glass_storefront',cat:'products',key: 'ms_tpl_glass_door',     swatches: ['#1E293B', '#334155', '#78350F', '#0F172A'], icon: 'sign' },
  ];

  /* 36 Studio Backgrounds across 4 Curated Groups */
  var BACKGROUNDS = [
    /* 8 Minimalist Studio Solids */
    { id: 'sol_white',     cat: 'solid',    key: 'ms_bg_sol_white',    c1: '#FFFFFF' },
    { id: 'sol_alabaster', cat: 'solid',    key: 'ms_bg_sol_alab',     c1: '#F8FAFC' },
    { id: 'sol_gray',      cat: 'solid',    key: 'ms_bg_sol_gray',     c1: '#E2E8F0' },
    { id: 'sol_sand',      cat: 'solid',    key: 'ms_bg_sol_sand',     c1: '#F3EDE2' },
    { id: 'sol_sage',      cat: 'solid',    key: 'ms_bg_sol_sage',     c1: '#E6EFEA' },
    { id: 'sol_blush',     cat: 'solid',    key: 'ms_bg_sol_blush',    c1: '#FDF2F2' },
    { id: 'sol_slate',     cat: 'solid',    key: 'ms_bg_sol_slate',    c1: '#CBD5E1' },
    { id: 'sol_charcoal',  cat: 'solid',    key: 'ms_bg_sol_charcoal', c1: '#1E293B', dark: true },
    /* 10 Soft Mesh & Aurora Gradients */
    { id: 'grd_nordic',    cat: 'gradient', key: 'ms_bg_grd_nordic',   c1: '#E0F2FE', c2: '#F8FAFC', c3: '#C7D2FE' },
    { id: 'grd_sunrise',   cat: 'gradient', key: 'ms_bg_grd_sunrise',  c1: '#FEF3C7', c2: '#FDE68A', c3: '#FDBA74' },
    { id: 'grd_lavender',  cat: 'gradient', key: 'ms_bg_grd_lavender', c1: '#EDE9FE', c2: '#FAE8FF', c3: '#DBEAFE' },
    { id: 'grd_mint',      cat: 'gradient', key: 'ms_bg_grd_mint',     c1: '#D1FAE5', c2: '#ECFEFF', c3: '#A7F3D0' },
    { id: 'grd_peach',     cat: 'gradient', key: 'ms_bg_grd_peach',    c1: '#FFEDD5', c2: '#FFE4E6', c3: '#FED7AA' },
    { id: 'grd_ocean',     cat: 'gradient', key: 'ms_bg_grd_ocean',    c1: '#BAE6FD', c2: '#E0F2FE', c3: '#67E8F9' },
    { id: 'grd_rose',      cat: 'gradient', key: 'ms_bg_grd_rose',     c1: '#FFE4E6', c2: '#FFF1F2', c3: '#FBCFE8' },
    { id: 'grd_champagne', cat: 'gradient', key: 'ms_bg_grd_champ',    c1: '#FAF5EC', c2: '#F3E8D2', c3: '#E7D4B5' },
    { id: 'grd_indigo',    cat: 'gradient', key: 'ms_bg_grd_indigo',   c1: '#3B82F6', c2: '#6366F1', c3: '#06B6D4', dark: true },
    { id: 'grd_emerald',   cat: 'gradient', key: 'ms_bg_grd_emerald',  c1: '#059669', c2: '#0D9488', c3: '#34D399', dark: true },
    /* 8 Architectural Wall & Desk Surfaces */
    { id: 'srf_plaster',   cat: 'surface',  key: 'ms_bg_srf_plaster',  kind: 'plaster',  c1: '#EDE9E1', c2: '#DCD6CA' },
    { id: 'srf_concrete',  cat: 'surface',  key: 'ms_bg_srf_concrete', kind: 'concrete', c1: '#CBD5E1', c2: '#94A3B8' },
    { id: 'srf_oak',       cat: 'surface',  key: 'ms_bg_srf_oak',      kind: 'wood',     c1: '#D4A876', c2: '#A87746' },
    { id: 'srf_marble',    cat: 'surface',  key: 'ms_bg_srf_marble',   kind: 'marble',   c1: '#F8FAFC', c2: '#CBD5E1' },
    { id: 'srf_terrazzo',  cat: 'surface',  key: 'ms_bg_srf_terrazzo', kind: 'terrazzo', c1: '#F6F4EF', c2: '#E2DDD3' },
    { id: 'srf_linen',     cat: 'surface',  key: 'ms_bg_srf_linen',    kind: 'linen',    c1: '#EAE4D8', c2: '#D8CFC0' },
    { id: 'srf_archgrid',  cat: 'surface',  key: 'ms_bg_srf_grid',     kind: 'grid',     c1: '#F1F5F9', c2: '#CBD5E1' },
    { id: 'srf_sunlit',    cat: 'surface',  key: 'ms_bg_srf_sunlit',   kind: 'sunlit',   c1: '#FAF7F0', c2: '#E7DFD1' },
    /* 10 Dark Mode Showcase Gradients */
    { id: 'drk_obsidian',  cat: 'dark',     key: 'ms_bg_drk_obsidian', c1: '#09090B', c2: '#18181B', c3: '#27272A', dark: true },
    { id: 'drk_indigo',    cat: 'dark',     key: 'ms_bg_drk_indigo',   c1: '#0B1026', c2: '#1E3A8A', c3: '#312E81', dark: true },
    { id: 'drk_cyber',     cat: 'dark',     key: 'ms_bg_drk_cyber',    c1: '#042F2E', c2: '#0F172A', c3: '#06B6D4', dark: true },
    { id: 'drk_carbon',    cat: 'dark',     key: 'ms_bg_drk_carbon',   c1: '#111827', c2: '#1F2937', c3: '#374151', dark: true },
    { id: 'drk_violet',    cat: 'dark',     key: 'ms_bg_drk_violet',   c1: '#1E1B4B', c2: '#4C1D95', c3: '#7C3AED', dark: true },
    { id: 'drk_emerald',   cat: 'dark',     key: 'ms_bg_drk_emerald',  c1: '#022C22', c2: '#064E3B', c3: '#10B981', dark: true },
    { id: 'drk_bronze',    cat: 'dark',     key: 'ms_bg_drk_bronze',   c1: '#1C1917', c2: '#451A03', c3: '#B45309', dark: true },
    { id: 'drk_navy',      cat: 'dark',     key: 'ms_bg_drk_navy',     c1: '#020617', c2: '#0F172A', c3: '#1D4ED8', dark: true },
    { id: 'drk_crimson',   cat: 'dark',     key: 'ms_bg_drk_crimson',  c1: '#1F070D', c2: '#4C0519', c3: '#9F1239', dark: true },
    { id: 'drk_pitch',     cat: 'dark',     key: 'ms_bg_drk_pitch',    c1: '#030712', c2: '#0F172A', c3: '#1E293B', dark: true },
  ];

  /* ----- DOM References ----- */
  var msActiveTplLabel = $('#msActiveTplLabel');
  var msSpecMeta = $('#msSpecMeta');
  var btnTopUpload = $('#btnTopUpload');
  var btnOpenExportModal = $('#btnOpenExportModal');
  var aspectBtns = $$('.ms-aspect-btn[data-aspect]', $('#msAspectBar'));
  var btnQuickTransparent = $('#btnQuickTransparent');

  var msDesignInput = $('#msDesignInput');
  var msDesign2Input = $('#msDesign2Input');
  var msCustomBgInput = $('#msCustomBgInput');

  var msViewport = $('#msViewport');
  var msCanvasWrap = $('#msCanvasWrap');
  var msPreviewCanvas = $('#msPreviewCanvas');
  var msPeekCanvas = $('#msPeekCanvas');

  var btnMqExport = $('#btnMqExport');
  var btnMqUpload = $('#btnMqUpload');
  var btnMqCenter = $('#btnMqCenter');
  var btnMqUndo = $('#btnMqUndo');

  var btnStageCenter = $('#btnStageCenter');
  var btnStagePeek = $('#btnStagePeek');
  var btnStageUndo = $('#btnStageUndo');
  var btnStageRedo = $('#btnStageRedo');
  var btnResetDesign = $('#btnResetDesign');

  var dockTabs = $$('.ms-dock-tab');
  var dockPanes = $$('.ms-step-pane');

  var tplCatBtns = $$('.ms-chip-btn[data-cat]', $('#msTplCatRow'));
  var msTemplateGrid = $('#msTemplateGrid');
  var btnDockUpload = $('#btnDockUpload');
  var btnUseDemoArt = $('#btnUseDemoArt');
  var btnClearDesign1 = $('#btnClearDesign1');
  var msAiRow = $('#msAiRow');
  var btnAiRemoveBg = $('#btnAiRemoveBg');
  var btnAiRestoreOrig = $('#btnAiRestoreOrig');
  var msAiOverlay = $('#msAiOverlay');
  var msAiStatusText = $('#msAiStatusText');
  var msSlot2Box = $('#msSlot2Box');
  var btnDockUpload2 = $('#btnDockUpload2');
  var btnClearDesign2 = $('#btnClearDesign2');

  var fitModeBtns = $$('.ms-chip-btn[data-fit]', $('#msFitModeRow'));
  var msOrientationGroup = $('#msOrientationGroup');
  var orientBtns = $$('.ms-chip-btn[data-orient]', $('#msOrientationRow'));
  var msFitModeBadge = $('#msFitModeBadge');
  var btnDockCenter = $('#btnDockCenter');
  var btnDockReset = $('#btnDockReset');
  var msDesignZoom = $('#msDesignZoom');
  var msDesignZoomVal = $('#msDesignZoomVal');
  var msPanX = $('#msPanX');
  var msPanXVal = $('#msPanXVal');
  var msPanY = $('#msPanY');
  var msPanYVal = $('#msPanYVal');
  var msDesignRot = $('#msDesignRot');
  var msDesignRotVal = $('#msDesignRotVal');

  var msColorSwatches = $('#msColorSwatches');
  var msProductColorPicker = $('#msProductColorPicker');
  var btnToggleTransparent = $('#btnToggleTransparent');
  var bgCatBtns = $$('.ms-chip-btn[data-bgcat]', $('#msBgCatRow'));
  var msBgGrid = $('#msBgGrid');
  var btnUploadCustomBg = $('#btnUploadCustomBg');
  var btnClearCustomBg = $('#btnClearCustomBg');

  var msShadowIntensity = $('#msShadowIntensity');
  var msShadowVal = $('#msShadowVal');
  var msSheenToggle = $('#msSheenToggle');
  var msSheenIntensity = $('#msSheenIntensity');
  var msSheenVal = $('#msSheenVal');

  var hPosBtns = $$('.ms-chip-btn[data-hpos]', $('#msHeadlinePosRow'));
  var msHeadlineInput = $('#msHeadlineInput');
  var msSublineInput = $('#msSublineInput');
  var btnPickFont = $('#btnPickFont');
  var msFontName = $('#msFontName');
  var msTextColor = $('#msTextColor');

  var msFontModal = $('#msFontModal');
  var btnCloseFontModal = $('#btnCloseFontModal');
  var msFontList = $('#msFontList');

  var msExportModal = $('#msExportModal');
  var btnCloseExportModal = $('#btnCloseExportModal');
  var scaleBtns = $$('.ms-chip-btn[data-scale]', $('#msScaleRow'));
  var msExportSummary = $('#msExportSummary');
  var btnExportPng = $('#btnExportPng');
  var btnExportJpg = $('#btnExportJpg');

  /* ----- Offscreen Canvases ----- */
  var slot1DemoCanvas = document.createElement('canvas');
  var slot2DemoCanvas = document.createElement('canvas');
  var slotRenderCanvas = document.createElement('canvas');
  var slot2RenderCanvas = document.createElement('canvas');

  var ORIENTABLE_FRAMES = {
    oak_frame: true,
    black_frame: true,
    gold_frame: true,
    canvas_wrap: true,
    wall_poster: true,
  };

  /* ----- State ----- */
  var state = {
    tplCat: 'all',
    templateId: 'iphone16',
    frameOrientation: 'portrait',
    productColor: '#B8B3AA',
    aspect: '16:9',
    exportScale: 2,

    design1Img: null,
    design1OriginalImg: null,
    design1AiImg: null,
    design1File: null,
    design1IsCutout: false,
    design1Name: 'mockup-showcase',
    design2Img: null,
    customBgImg: null,
    aiBusy: false,

    fitMode: 'cover',
    autoFitActive: true,
    zoomPct: 100,
    panX: 0,
    panY: 0,
    rotDeg: 0,

    bgCat: 'all',
    bgId: 'grd_nordic',
    transparentBg: false,

    shadowIntensity: 70,
    sheenEnabled: true,
    sheenIntensity: 48,

    headlinePos: 'none',
    headline: '',
    subline: '',
    fontId: 'cairo',
    textColor: '#0F172A',

    isPeeking: false,
    loadGen1: 0,
    loadGen2: 0,
    loadGenBg: 0,
  };

  var activeObjectUrls = new Set();
  var loadedFonts = new Set();
  var activeDevice = 'cpu';
  var preloadPromise = null;
  var undoStack = [];
  var redoStack = [];
  var renderRaf = 0;
  var activePointers = new Map();
  var isPanning = false;
  var panStartClient = { x: 0, y: 0 };
  var panStartValues = { x: 0, y: 0 };
  var pinchStartDist = 0;
  var pinchStartZoom = 100;
  var dragUndoPushed = false;
  var wheelUndoTimer = 0;

  /* ----- Utilities ----- */
  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function sanitizeHex(hex, fallback) {
    var s = String(hex || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : (fallback || '#1A5FFF');
  }

  function sanitizeFilenameBase(name) {
    var base = String(name || 'mockup-showcase').replace(/\.[^.]+$/, '');
    base = base.replace(/[\/\\:*?"<>|\x00-\x1F]+/g, '_').replace(/^\.+|\.+$/g, '').trim();
    return base || 'mockup-showcase';
  }

  function hexToRgb(hex) {
    var c = sanitizeHex(hex);
    return {
      r: parseInt(c.slice(1, 3), 16),
      g: parseInt(c.slice(3, 5), 16),
      b: parseInt(c.slice(5, 7), 16),
    };
  }

  function rgbaStr(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + clamp(a, 0, 1).toFixed(3) + ')';
  }

  function shadeHex(hex, amt) {
    var c = hexToRgb(hex);
    var r = clamp(Math.round(c.r + amt), 0, 255);
    var g = clamp(Math.round(c.g + amt), 0, 255);
    var b = clamp(Math.round(c.b + amt), 0, 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function isColorDark(hex) {
    var c = hexToRgb(hex);
    return (c.r * 0.299 + c.g * 0.587 + c.b * 0.114) < 128;
  }

  function cleanupCanvas(c) {
    if (!c) return;
    try {
      var ctx = c.getContext('2d');
      if (ctx && c.width && c.height) ctx.clearRect(0, 0, c.width, c.height);
      c.width = 0;
      c.height = 0;
    } catch (_e) {}
  }

  function revokeUrl(url) {
    if (!url) return;
    try { URL.revokeObjectURL(url); } catch (_e) {}
    activeObjectUrls.delete(url);
  }

  function revokeAllObjectUrls() {
    activeObjectUrls.forEach(function (u) {
      try { URL.revokeObjectURL(u); } catch (_e) {}
    });
    activeObjectUrls.clear();
  }

  function getTemplateObj(id) {
    for (var i = 0; i < TEMPLATES.length; i++) {
      if (TEMPLATES[i].id === id) return TEMPLATES[i];
    }
    return TEMPLATES[0];
  }

  function getBgObj(id) {
    for (var i = 0; i < BACKGROUNDS.length; i++) {
      if (BACKGROUNDS[i].id === id) return BACKGROUNDS[i];
    }
    return BACKGROUNDS[0];
  }

  function getFontObj(id) {
    for (var i = 0; i < FONT_LIBRARY.length; i++) {
      if (FONT_LIBRARY[i].id === id) return FONT_LIBRARY[i];
    }
    return FONT_LIBRARY[0];
  }

  function ensureFontLoaded(fontObj) {
    if (!fontObj || loadedFonts.has(fontObj.id) || !document.fonts || !document.fonts.load) return;
    loadedFonts.add(fontObj.id);
    try {
      document.fonts.load(fontObj.weight + ' 32px "' + fontObj.family + '"').then(function () {
        scheduleRender();
      }).catch(function () {});
    } catch (_e) {}
  }

  function syncDocumentMeta() {
    document.title = t('t_mockup_t') + ' — imgsfix';
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', t('ms_meta_desc'));
  }

  /* ----- Strict SVG Sanitizer ----- */
  function isUnsafeSvgUri(val, allowRasterData) {
    var clean = String(val || '').replace(/[\u0000-\u0020\u007F-\u009F]+/g, '').trim();
    if (!clean) return false;
    var low = clean.toLowerCase();
    if (
      low.indexOf('javascript:') === 0 ||
      low.indexOf('vbscript:') === 0 ||
      low.indexOf('data:text/html') === 0 ||
      low.indexOf('data:image/svg') === 0 ||
      low.indexOf('http://') === 0 ||
      low.indexOf('https://') === 0 ||
      low.indexOf('//') === 0 ||
      low.indexOf('ftp:') === 0 ||
      low.indexOf('file:') === 0
    ) {
      return true;
    }
    if (low.indexOf('data:') === 0) {
      if (!allowRasterData) return true;
      return !/^data:image\/(png|jpeg|jpg|webp|gif|bmp);base64,[a-z0-9+/=]+$/i.test(clean);
    }
    return clean.charAt(0) !== '#';
  }

  function hasUnsafeSvgCss(cssText) {
    var s = String(cssText || '');
    if (/@import|expression\s*\(|javascript:|vbscript:|data:text\/html|data:image\/svg|https?:|\/\//i.test(s)) {
      return true;
    }
    var urlMatches = s.match(/url\s*\([^)]*\)/gi);
    if (urlMatches) {
      for (var i = 0; i < urlMatches.length; i++) {
        var inner = urlMatches[i].replace(/^url\s*\(\s*['"]?|['"]?\s*\)$/gi, '').trim();
        if (inner && inner.charAt(0) !== '#') return true;
      }
    }
    return false;
  }

  function sanitizeSvgNode(el) {
    var kids = Array.prototype.slice.call(el.childNodes || []);
    for (var i = 0; i < kids.length; i++) {
      var child = kids[i];
      if (child.nodeType !== 1) continue;
      var tag = (child.localName || child.nodeName || '').toLowerCase();
      if (DANGEROUS_SVG_TAGS[tag]) {
        el.removeChild(child);
        continue;
      }
      if (tag === 'style' && hasUnsafeSvgCss(child.textContent)) {
        el.removeChild(child);
        continue;
      }
      var attrs = Array.prototype.slice.call(child.attributes || []);
      for (var j = 0; j < attrs.length; j++) {
        var aName = attrs[j].name || '';
        var aLocal = (attrs[j].localName || aName).toLowerCase();
        var aVal = attrs[j].value || '';
        if (/^on/i.test(aLocal)) {
          child.removeAttribute(aName);
          continue;
        }
        if (aLocal === 'style' && hasUnsafeSvgCss(aVal)) {
          child.removeAttribute(aName);
          continue;
        }
        if (aLocal === 'href' || aLocal === 'src' || aLocal === 'action' || aLocal === 'formaction' || aLocal === 'poster' || aLocal === 'data' || aLocal === 'codebase') {
          var allowRaster = tag === 'image' || tag === 'feimage';
          if (isUnsafeSvgUri(aVal, allowRaster)) {
            child.removeAttribute(aName);
          }
        }
      }
      sanitizeSvgNode(child);
    }
  }

  function sanitizeSvgFileToBlobUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var text = typeof reader.result === 'string' ? reader.result : '';
          var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
          if (!doc || doc.querySelector('parsererror')) {
            reject(new Error('Invalid SVG markup'));
            return;
          }
          var root = doc.documentElement;
          if (!root || (root.localName || root.nodeName || '').toLowerCase() !== 'svg') {
            reject(new Error('Missing SVG root'));
            return;
          }
          var rootAttrs = Array.prototype.slice.call(root.attributes || []);
          for (var i = 0; i < rootAttrs.length; i++) {
            var rn = (rootAttrs[i].localName || rootAttrs[i].name || '').toLowerCase();
            if (/^on/i.test(rn) || (rn === 'style' && hasUnsafeSvgCss(rootAttrs[i].value))) {
              root.removeAttribute(rootAttrs[i].name);
            }
          }
          sanitizeSvgNode(root);

          var rawW = root.getAttribute('width') || '';
          var rawH = root.getAttribute('height') || '';
          var pw = /%/.test(rawW) ? 0 : parseFloat(rawW);
          var ph = /%/.test(rawH) ? 0 : parseFloat(rawH);
          if ((pw > MAX_IMAGE_DIM) || (ph > MAX_IMAGE_DIM)) {
            reject(new Error('SVG dimensions exceed limit'));
            return;
          }
          if (!(pw > 0 && ph > 0)) {
            var vb = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/);
            var vw = vb.length === 4 ? parseFloat(vb[2]) : 0;
            var vh = vb.length === 4 ? parseFloat(vb[3]) : 0;
            if (vw > 0 && vh > 0) {
              var scale = Math.max(vw, vh) < 512 ? (1024 / Math.max(vw, vh)) : (Math.max(vw, vh) > 2048 ? (2048 / Math.max(vw, vh)) : 1);
              pw = clamp(Math.round(vw * scale), 64, 4096);
              ph = clamp(Math.round(vh * scale), 64, 4096);
            } else {
              pw = 1024;
              ph = 1024;
            }
            root.setAttribute('width', String(pw));
            root.setAttribute('height', String(ph));
          }

          var serialized = new XMLSerializer().serializeToString(root);
          var blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          activeObjectUrls.add(url);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function () { reject(new Error('Failed to read SVG file')); };
      reader.readAsText(file, 'UTF-8');
    });
  }

  function resolveImageMime(file) {
    if (!file) return '';
    var type = (file.type || '').toLowerCase().split(';')[0].trim();
    if ((!type || type === 'application/octet-stream') && file.name) {
      var m = file.name.toLowerCase().match(/\.(jpe?g|png|webp|bmp|gif|svg)$/);
      if (m) {
        if (m[1] === 'svg') type = 'image/svg+xml';
        else if (m[1] === 'jpg' || m[1] === 'jpeg') type = 'image/jpeg';
        else type = 'image/' + m[1];
      }
    }
    return type;
  }

  function loadSafeImageFile(file, genKey, onSuccess) {
    if (!file) return;
    var mime = resolveImageMime(file);
    if (!ALLOWED_MIMES[mime]) {
      toast(t('ms_err_type'), 'err');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast(t('ms_err_size'), 'err');
      return;
    }

    var gen = ++state[genKey];

    function decodeUrl(url) {
      activeObjectUrls.add(url);
      var img = new Image();
      img.onload = function () {
        revokeUrl(url);
        if (gen !== state[genKey]) return;
        var nw = img.naturalWidth || img.width;
        var nh = img.naturalHeight || img.height;
        if (!nw || !nh || nw > MAX_IMAGE_DIM || nh > MAX_IMAGE_DIM) {
          toast(t('ms_err_dims'), 'err');
          return;
        }
        onSuccess(img, nw, nh);
      };
      img.onerror = function () {
        revokeUrl(url);
        toast(t('ms_err_type'), 'err');
      };
      img.src = url;
    }

    if (mime === 'image/svg+xml') {
      sanitizeSvgFileToBlobUrl(file).then(function (safeUrl) {
        if (gen !== state[genKey]) {
          revokeUrl(safeUrl);
          return;
        }
        decodeUrl(safeUrl);
      }).catch(function () {
        if (gen === state[genKey]) toast(t('ms_err_type'), 'err');
      });
    } else {
      decodeUrl(URL.createObjectURL(file));
    }
  }

  /* ----- Snapshot / Undo & Redo ----- */
  function captureSnapshot() {
    return {
      templateId: state.templateId,
      frameOrientation: state.frameOrientation,
      productColor: state.productColor,
      aspect: state.aspect,
      fitMode: state.fitMode,
      autoFitActive: state.autoFitActive,
      zoomPct: state.zoomPct,
      panX: state.panX,
      panY: state.panY,
      rotDeg: state.rotDeg,
      bgId: state.bgId,
      transparentBg: state.transparentBg,
      shadowIntensity: state.shadowIntensity,
      sheenEnabled: state.sheenEnabled,
      sheenIntensity: state.sheenIntensity,
      headlinePos: state.headlinePos,
      headline: state.headline,
      subline: state.subline,
      fontId: state.fontId,
      textColor: state.textColor,
      design1IsCutout: state.design1IsCutout,
    };
  }

  function applySnapshot(snap) {
    if (!snap) return;
    Object.keys(snap).forEach(function (k) {
      state[k] = snap[k];
    });
    if (state.design1OriginalImg) {
      state.design1Img = (state.design1IsCutout && state.design1AiImg)
        ? state.design1AiImg
        : state.design1OriginalImg;
    }
    syncAllUI();
    scheduleRender();
  }

  function pushUndo() {
    undoStack.push(captureSnapshot());
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
    syncUndoButtons();
  }

  function handleUndo() {
    if (!undoStack.length) return;
    redoStack.push(captureSnapshot());
    applySnapshot(undoStack.pop());
  }

  function handleRedo() {
    if (!redoStack.length) return;
    undoStack.push(captureSnapshot());
    applySnapshot(redoStack.pop());
  }

  function syncUndoButtons() {
    var canUndo = undoStack.length > 0;
    var canRedo = redoStack.length > 0;
    if (btnStageUndo) btnStageUndo.disabled = !canUndo;
    if (btnMqUndo) btnMqUndo.disabled = !canUndo;
    if (btnStageRedo) btnStageRedo.disabled = !canRedo;
  }

  /* ----- Built-In Crisp Sample UI Showcase Cards (Instant Live Demo) ----- */
  function ensureDemoArtCanvases() {
    if (!slot1DemoCanvas.width) {
      var W = 900, H = 1200;
      slot1DemoCanvas.width = W;
      slot1DemoCanvas.height = H;
      var c = slot1DemoCanvas.getContext('2d');
      var bg = c.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#0F172A');
      bg.addColorStop(0.55, '#1E3A8A');
      bg.addColorStop(1, '#0891B2');
      c.fillStyle = bg;
      c.fillRect(0, 0, W, H);

      /* Ambient highlight circles */
      var r1 = c.createRadialGradient(W * 0.2, H * 0.2, 10, W * 0.2, H * 0.2, 420);
      r1.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      r1.addColorStop(1, 'rgba(56, 189, 248, 0)');
      c.fillStyle = r1;
      c.fillRect(0, 0, W, H);

      /* Top status pills */
      c.fillStyle = 'rgba(255,255,255,0.14)';
      drawRoundedRectPath(c, 72, 100, 260, 46, 23);
      c.fill();
      c.fillStyle = '#E0F2FE';
      c.font = '700 22px system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('IMGSFIX STUDIO', 202, 124);

      /* Hero card title */
      c.textAlign = 'left';
      c.fillStyle = '#FFFFFF';
      c.font = '800 72px system-ui, sans-serif';
      c.fillText('Design Smarter.', 72, 245);
      c.fillStyle = '#7DD3FC';
      c.fillText('Ship Faster.', 72, 330);

      /* Glassmorphism Analytics Card */
      c.fillStyle = 'rgba(255, 255, 255, 0.12)';
      c.strokeStyle = 'rgba(255, 255, 255, 0.24)';
      c.lineWidth = 2;
      drawRoundedRectPath(c, 72, 420, 756, 410, 34);
      c.fill();
      c.stroke();

      /* Chart bars */
      var bars = [0.35, 0.58, 0.46, 0.78, 0.66, 0.94, 0.85];
      for (var i = 0; i < bars.length; i++) {
        var bx = 128 + i * 94;
        var bh = bars[i] * 240;
        var by = 760 - bh;
        var barG = c.createLinearGradient(0, by, 0, 760);
        barG.addColorStop(0, '#38BDF8');
        barG.addColorStop(1, '#2563EB');
        c.fillStyle = barG;
        drawRoundedRectPath(c, bx, by, 54, bh, 14);
        c.fill();
      }
      c.fillStyle = '#E2E8F0';
      c.font = '700 28px system-ui, sans-serif';
      c.fillText('Monthly Conversion Rate  +42.8%', 124, 480);

      /* Bottom CTA card */
      c.fillStyle = '#FFFFFF';
      drawRoundedRectPath(c, 72, 890, 756, 170, 28);
      c.fill();
      c.fillStyle = '#0F172A';
      c.font = '800 38px system-ui, sans-serif';
      c.fillText('Drop Your Screenshot Here', 112, 955);
      c.fillStyle = '#475569';
      c.font = '600 24px system-ui, sans-serif';
      c.fillText('Supports PNG, JPG, WebP & Clean SVG', 112, 1008);
    }

    if (!slot2DemoCanvas.width) {
      var W2 = 750, H2 = 1334;
      slot2DemoCanvas.width = W2;
      slot2DemoCanvas.height = H2;
      var c2 = slot2DemoCanvas.getContext('2d');
      var bg2 = c2.createLinearGradient(0, 0, W2, H2);
      bg2.addColorStop(0, '#111827');
      bg2.addColorStop(1, '#312E81');
      c2.fillStyle = bg2;
      c2.fillRect(0, 0, W2, H2);

      c2.fillStyle = 'rgba(255,255,255,0.12)';
      drawRoundedRectPath(c2, 60, 140, 630, 300, 36);
      c2.fill();
      c2.fillStyle = '#F8FAFC';
      c2.font = '800 54px system-ui, sans-serif';
      c2.fillText('Mobile Ready', 100, 240);
      c2.fillStyle = '#A5B4FC';
      c2.font = '600 30px system-ui, sans-serif';
      c2.fillText('Upload Screen 2 in Dock', 100, 310);

      c2.fillStyle = '#38BDF8';
      drawRoundedRectPath(c2, 60, 510, 630, 110, 28);
      c2.fill();
      c2.fillStyle = '#0F172A';
      c2.font = '800 34px system-ui, sans-serif';
      c2.textAlign = 'center';
      c2.textBaseline = 'middle';
      c2.fillText('Live Multi-Device Sync', 375, 565);

      c2.textAlign = 'left';
      for (var j = 0; j < 3; j++) {
        c2.fillStyle = 'rgba(255,255,255,0.09)';
        drawRoundedRectPath(c2, 60, 690 + j * 165, 630, 130, 26);
        c2.fill();
        c2.fillStyle = '#E2E8F0';
        c2.font = '700 28px system-ui, sans-serif';
        c2.fillText('Studio Component #' + (j + 1), 100, 755 + j * 165);
      }
    }
  }

  /* ----- Canvas Geometry & Warp Primitives ----- */
  function drawRoundedRectPath(ctx, x, y, w, h, r) {
    var rad = clamp(r, 0, Math.min(w, h) * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }

  function isOrientableFrame(tplId) {
    return Boolean(ORIENTABLE_FRAMES[tplId]);
  }

  function getSlotDimensions(tplId, slotNum) {
    if (slotNum === 2) {
      return { w: 530, h: 1200, bgFallback: '#FFFFFF' };
    }
    if (tplId === 'iphone16') return { w: 530, h: 1200, bgFallback: '#FFFFFF' };
    if (tplId === 's24ultra') return { w: 516, h: 1200, bgFallback: '#FFFFFF' };
    if (tplId === 'frameless_phone' || tplId === 'dual_phones') return { w: 552, h: 1200, bgFallback: '#FFFFFF' };
    if (tplId === 'iso_phone') return { w: 600, h: 1200, bgFallback: '#FFFFFF' };
    if (tplId === 'watch_ultra') return { w: 780, h: 1000, bgFallback: '#FFFFFF' };
    if (tplId === 'ipad_portrait') return { w: 850, h: 1200, bgFallback: '#FFFFFF' };
    if (tplId === 'ipad_landscape') return { w: 1260, h: 900, bgFallback: '#FFFFFF' };
    if (tplId === 'macbook_pro' || tplId === 'macbook_air' || tplId === 'mb_iphone') return { w: 1300, h: 800, bgFallback: '#FFFFFF' };
    if (tplId === 'studio_display') return { w: 1420, h: 800, bgFallback: '#FFFFFF' };
    if (tplId === 'browser_light') return { w: 1380, h: 800, bgFallback: '#FFFFFF' };
    if (tplId === 'browser_dark') return { w: 1380, h: 800, bgFallback: '#0F172A' };
    if (isOrientableFrame(tplId)) {
      return state.frameOrientation === 'landscape'
        ? { w: 1080, h: 800, bgFallback: '#FFFFFF' }
        : { w: 800, h: 1000, bgFallback: '#FFFFFF' };
    }
    if (tplId === 'open_magazine') return { w: 1200, h: 816, bgFallback: '#FFFFFF' };
    if (tplId === 'hardcover_book') return { w: 720, h: 1000, bgFallback: null };
    if (tplId === 'business_card') return { w: 1200, h: 684, bgFallback: null };
    if (tplId === 'coffee_mug') return { w: 1080, h: 800, bgFallback: null };
    if (tplId === 'paper_cup') return { w: 900, h: 860, bgFallback: null };
    if (tplId === 'tshirt' || tplId === 'hoodie' || tplId === 'polo_shirt') return { w: 940, h: 990, bgFallback: null };
    if (tplId === 'tote_bag' || tplId === 'kraft_bag') return { w: 920, h: 960, bgFallback: null };
    if (tplId === 'product_box') return { w: 690, h: 1000, bgFallback: null };
    if (tplId === 'storefront_sign') return { w: 1380, h: 500, bgFallback: null };
    if (tplId === 'blade_sign') return { w: 900, h: 900, bgFallback: null };
    if (tplId === 'glass_storefront') return { w: 1000, h: 1120, bgFallback: null };
    return { w: 900, h: 1200, bgFallback: '#FFFFFF' };
  }

  function computeSmartFitMode(tplId, imgSrc) {
    var tpl = getTemplateObj(tplId);
    if (tpl.cat === 'print' || tpl.cat === 'products') {
      return 'contain';
    }
    if (!imgSrc) {
      return 'cover';
    }
    var slot = getSlotDimensions(tplId, 1);
    var slotAspect = slot.w / Math.max(1, slot.h);
    var sw = imgSrc.naturalWidth || imgSrc.width || slot.w;
    var sh = imgSrc.naturalHeight || imgSrc.height || slot.h;
    var imgAspect = sw / Math.max(1, sh);
    var ratioDiff = Math.max(imgAspect / slotAspect, slotAspect / imgAspect);
    var oppositeOrient = (slotAspect < 0.85 && imgAspect > 1.08) || (slotAspect > 1.15 && imgAspect < 0.92);
    if (ratioDiff > 1.45 || oppositeOrient) {
      return 'contain';
    }
    return 'cover';
  }

  function renderDesignIntoBuffer(bufCanvas, targetW, targetH, imgSource, fillFallback, fitOverride) {
    var w = Math.max(32, Math.round(targetW));
    var h = Math.max(32, Math.round(targetH));
    if (bufCanvas.width !== w || bufCanvas.height !== h) {
      bufCanvas.width = w;
      bufCanvas.height = h;
    }
    var ctx = bufCanvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    if (fillFallback) {
      ctx.fillStyle = fillFallback;
      ctx.fillRect(0, 0, w, h);
    }

    var src = imgSource;
    if (!src) return;
    var sw = src.naturalWidth || src.width || w;
    var sh = src.naturalHeight || src.height || h;
    if (!sw || !sh) return;

    var activeFit = fitOverride || state.fitMode;
    /* Clean 12% inner padding margin when fitting entire logo/design cleanly inside slot */
    var baseScale = activeFit === 'contain'
      ? Math.min((w * 0.88) / sw, (h * 0.88) / sh)
      : Math.max(w / sw, h / sh);
    var scale = baseScale * (state.zoomPct / 100);
    var drawW = sw * scale;
    var drawH = sh * scale;

    ctx.save();
    ctx.translate(w * 0.5 + (state.panX / 100) * w * 0.5, h * 0.5 + (state.panY / 100) * h * 0.5);
    if (state.rotDeg !== 0) {
      ctx.rotate((state.rotDeg * Math.PI) / 180);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
    ctx.restore();
  }

  /* Perspective Quad Warp via bilinear triangle grid (zero external deps) */
  function drawTexturedTriangle(ctx, img, sx0, sy0, sx1, sy1, sx2, sy2, dx0, dy0, dx1, dy1, dx2, dy2) {
    var denom = sx0 * (sy2 - sy1) - sx1 * sy2 + sx2 * sy1 + (sx1 - sx2) * sy0;
    if (Math.abs(denom) < 1e-6) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dx0, dy0);
    ctx.lineTo(dx1, dy1);
    ctx.lineTo(dx2, dy2);
    ctx.closePath();
    ctx.clip();

    var m11 = -(sy0 * (dx2 - dx1) - sy1 * dx2 + sy2 * dx1 + (sy1 - sy2) * dx0) / denom;
    var m12 = (sy1 * dy2 + sy0 * (dy1 - dy2) - sy2 * dy1 + (sy2 - sy1) * dy0) / denom;
    var m21 = (sx0 * (dx2 - dx1) - sx1 * dx2 + sx2 * dx1 + (sx1 - sx2) * dx0) / denom;
    var m22 = -(sx1 * dy2 + sx0 * (dy1 - dy2) - sx2 * dy1 + (sx2 - sx1) * dy0) / denom;
    var dx = (sx0 * (sy2 * dx1 - sy1 * dx2) + sy0 * (sx1 * dx2 - sx2 * dx1) + (sx2 * sy1 - sx1 * sy2) * dx0) / denom;
    var dy = (sx0 * (sy2 * dy1 - sy1 * dy2) + sy0 * (sx1 * dy2 - sx2 * dy1) + (sx2 * sy1 - sx1 * sy2) * dy0) / denom;

    ctx.transform(m11, m12, m21, m22, dx, dy);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  function drawQuadWarpedBuffer(ctx, buf, tl, tr, br, bl, steps) {
    var n = steps || 8;
    var w = buf.width;
    var h = buf.height;
    function lerpPt(a, b, f) {
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
    for (var iy = 0; iy < n; iy++) {
      var v0 = iy / n;
      var v1 = (iy + 1) / n;
      var l0 = lerpPt(tl, bl, v0);
      var r0 = lerpPt(tr, br, v0);
      var l1 = lerpPt(tl, bl, v1);
      var r1 = lerpPt(tr, br, v1);
      for (var ix = 0; ix < n; ix++) {
        var u0 = ix / n;
        var u1 = (ix + 1) / n;
        var p00 = lerpPt(l0, r0, u0);
        var p10 = lerpPt(l0, r0, u1);
        var p01 = lerpPt(l1, r1, u0);
        var p11 = lerpPt(l1, r1, u1);

        var sx0 = u0 * w, sy0 = v0 * h;
        var sx1 = u1 * w, sy1 = v1 * h;
        drawTexturedTriangle(ctx, buf, sx0, sy0, sx1, sy0, sx1, sy1, p00.x, p00.y, p10.x, p10.y, p11.x, p11.y);
        drawTexturedTriangle(ctx, buf, sx0, sy0, sx1, sy1, sx0, sy1, p00.x, p00.y, p11.x, p11.y, p01.x, p01.y);
      }
    }
  }

  /* Cylindrical Horizontal Strip Warp for Ceramic Mug & Paper Cup */
  function drawCylinderWarpedBuffer(ctx, buf, x, y, w, h, curveDrop) {
    var slices = 44;
    var bw = buf.width;
    var bh = buf.height;
    var sliceSrcW = bw / slices;
    for (var i = 0; i < slices; i++) {
      var t0 = i / slices;
      var t1 = (i + 1) / slices;
      /* Map flat [0..1] across cylinder angle [-pi/2 .. +pi/2] */
      var a0 = (t0 - 0.5) * Math.PI * 0.92;
      var a1 = (t1 - 0.5) * Math.PI * 0.92;
      var nx0 = (Math.sin(a0) / Math.sin(0.46 * Math.PI) + 1) * 0.5;
      var nx1 = (Math.sin(a1) / Math.sin(0.46 * Math.PI) + 1) * 0.5;
      var dx = x + nx0 * w;
      var dw = Math.max(1, (nx1 - nx0) * w + 0.7);
      var sag = Math.cos(a0) * curveDrop;
      ctx.drawImage(buf, i * sliceSrcW, 0, sliceSrcW + 0.5, bh, dx, y + sag, dw, h);
    }
  }

  function drawGlassSheen(ctx, x, y, w, h, radius) {
    if (!state.sheenEnabled || state.sheenIntensity <= 0) return;
    var alpha = (state.sheenIntensity / 100) * 0.34;
    ctx.save();
    drawRoundedRectPath(ctx, x, y, w, h, radius);
    ctx.clip();
    var g = ctx.createLinearGradient(x, y, x + w * 0.85, y + h * 0.75);
    g.addColorStop(0, 'rgba(255,255,255,' + (alpha * 1.1).toFixed(3) + ')');
    g.addColorStop(0.32, 'rgba(255,255,255,' + (alpha * 0.25).toFixed(3) + ')');
    g.addColorStop(0.36, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    /* Subtle angled diagonal glare band */
    ctx.beginPath();
    ctx.moveTo(x - w * 0.1, y + h * 0.15);
    ctx.lineTo(x + w * 0.55, y - h * 0.1);
    ctx.lineTo(x + w * 0.85, y - h * 0.1);
    ctx.lineTo(x - w * 0.1, y + h * 0.45);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.35).toFixed(3) + ')';
    ctx.fill();
    ctx.restore();
  }

  function drawContactShadow(ctx, cx, cy, rx, ry) {
    var s = state.shadowIntensity / 100;
    if (s <= 0.01) return;
    /* Outer wide ambient studio shadow */
    ctx.save();
    ctx.translate(cx, cy + ry * 0.14);
    ctx.scale(1, (ry * 1.15) / Math.max(1, rx * 1.12));
    var gAmb = ctx.createRadialGradient(0, 0, rx * 0.05, 0, 0, rx * 1.12);
    gAmb.addColorStop(0, 'rgba(2, 6, 23, ' + (0.28 * s).toFixed(3) + ')');
    gAmb.addColorStop(0.55, 'rgba(2, 6, 23, ' + (0.12 * s).toFixed(3) + ')');
    gAmb.addColorStop(1, 'rgba(2, 6, 23, 0)');
    ctx.fillStyle = gAmb;
    ctx.beginPath();
    ctx.arc(0, 0, rx * 1.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* Tight dark contact shadow core right under base */
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, (ry * 0.56) / Math.max(1, rx * 0.78));
    var gCore = ctx.createRadialGradient(0, 0, rx * 0.06, 0, 0, rx * 0.78);
    gCore.addColorStop(0, 'rgba(2, 6, 23, ' + (0.52 * s).toFixed(3) + ')');
    gCore.addColorStop(0.55, 'rgba(2, 6, 23, ' + (0.22 * s).toFixed(3) + ')');
    gCore.addColorStop(1, 'rgba(2, 6, 23, 0)');
    ctx.fillStyle = gCore;
    ctx.beginPath();
    ctx.arc(0, 0, rx * 0.78, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ----- Background Renderer (36 Curated + Transparent + Custom Photo) ----- */
  function renderStudioBackground(ctx, W, H) {
    if (state.transparentBg) {
      ctx.clearRect(0, 0, W, H);
      return;
    }

    if (state.customBgImg) {
      var iw = state.customBgImg.naturalWidth || state.customBgImg.width || W;
      var ih = state.customBgImg.naturalHeight || state.customBgImg.height || H;
      var sc = Math.max(W / iw, H / ih);
      var dw = iw * sc;
      var dh = ih * sc;
      ctx.drawImage(state.customBgImg, (W - dw) * 0.5, (H - dh) * 0.5, dw, dh);
      return;
    }

    var bg = getBgObj(state.bgId);
    if (bg.cat === 'solid') {
      ctx.fillStyle = bg.c1;
      ctx.fillRect(0, 0, W, H);
      var vig = ctx.createRadialGradient(W * 0.5, H * 0.45, Math.min(W, H) * 0.1, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
      vig.addColorStop(0, 'rgba(255,255,255,0.08)');
      vig.addColorStop(1, 'rgba(15,23,42,0.08)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);
      return;
    }

    if (bg.cat === 'gradient' || bg.cat === 'dark') {
      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, bg.c1);
      g.addColorStop(0.55, bg.c2);
      g.addColorStop(1, bg.c3);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      /* Soft studio spotlight bloom */
      var spot = ctx.createRadialGradient(W * 0.5, H * 0.42, 10, W * 0.5, H * 0.45, Math.max(W, H) * 0.65);
      spot.addColorStop(0, bg.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.45)');
      spot.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, W, H);
      return;
    }

    /* Architectural Walls & Desks */
    var sg = ctx.createLinearGradient(0, 0, 0, H);
    sg.addColorStop(0, bg.c1);
    sg.addColorStop(1, bg.c2);
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    if (bg.kind === 'wood') {
      ctx.strokeStyle = 'rgba(120, 68, 28, 0.14)';
      ctx.lineWidth = Math.max(1, W * 0.002);
      for (var y = 0; y < H; y += H * 0.055) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(W * 0.35, y + H * 0.015, W * 0.65, y - H * 0.015, W, y + H * 0.005);
        ctx.stroke();
      }
    } else if (bg.kind === 'marble') {
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.16)';
      ctx.lineWidth = Math.max(1.2, W * 0.003);
      for (var m = 0; m < 6; m++) {
        ctx.beginPath();
        ctx.moveTo(W * (m * 0.2 - 0.1), 0);
        ctx.bezierCurveTo(W * (m * 0.2 + 0.1), H * 0.4, W * (m * 0.2 - 0.05), H * 0.7, W * (m * 0.2 + 0.18), H);
        ctx.stroke();
      }
    } else if (bg.kind === 'grid') {
      var step = Math.max(24, Math.round(Math.min(W, H) * 0.065));
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.07)';
      ctx.lineWidth = 1;
      for (var gx = 0; gx < W; gx += step) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (var gy = 0; gy < H; gy += step) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }
    } else if (bg.kind === 'sunlit') {
      /* Warm diagonal window gobo shadow */
      ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W * 0.58, 0);
      ctx.lineTo(W * 0.22, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.06)';
      ctx.fillRect(W * 0.26, 0, W * 0.02, H);
      ctx.fillRect(0, H * 0.45, W, H * 0.025);
    } else if (bg.kind === 'terrazzo') {
      var dots = [
        [0.14, 0.2, '#C2410C', 0.015], [0.28, 0.72, '#0F766E', 0.018],
        [0.72, 0.18, '#1E293B', 0.016], [0.85, 0.65, '#B45309', 0.02],
        [0.45, 0.14, '#94A3B8', 0.014], [0.62, 0.84, '#BE123C', 0.013],
        [0.18, 0.88, '#334155', 0.017], [0.88, 0.32, '#0284C7', 0.015],
      ];
      dots.forEach(function (d) {
        ctx.fillStyle = d[2];
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        ctx.arc(d[0] * W, d[1] * H, Math.min(W, H) * d[3], 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      /* Plaster / Concrete / Linen subtle floor horizon */
      ctx.fillStyle = 'rgba(15, 23, 42, 0.06)';
      ctx.fillRect(0, H * 0.72, W, H * 0.28);
    }
    ctx.restore();
  }

  /* ----- Individual Studio Device & Product Renderers ----- */
  function drawPhoneDevice(ctx, cx, cy, phoneH, variant, bufCanvas) {
    var aspect = variant === 's24ultra' ? 0.47 : 0.485;
    var pw = phoneH * aspect;
    var ph = phoneH;
    var x = cx - pw * 0.5;
    var y = cy - ph * 0.5;
    var outerR = variant === 's24ultra' ? pw * 0.045 : pw * 0.16;
    var bezel = variant === 'frameless_phone' ? pw * 0.022 : pw * 0.048;
    var frameCol = sanitizeHex(state.productColor, '#B8B3AA');

    drawContactShadow(ctx, cx, cy + ph * 0.52, pw * 0.66, ph * 0.055);

    /* Titanium / Aluminum Outer Chassis */
    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, ' + (0.34 * (state.shadowIntensity / 100)).toFixed(3) + ')';
    ctx.shadowBlur = ph * 0.06;
    ctx.shadowOffsetY = ph * 0.025;
    var fGrad = ctx.createLinearGradient(x, y, x + pw, y + ph);
    fGrad.addColorStop(0, shadeHex(frameCol, 28));
    fGrad.addColorStop(0.5, frameCol);
    fGrad.addColorStop(1, shadeHex(frameCol, -34));
    ctx.fillStyle = fGrad;
    drawRoundedRectPath(ctx, x, y, pw, ph, outerR);
    ctx.fill();
    ctx.restore();

    /* Side hardware buttons */
    ctx.fillStyle = shadeHex(frameCol, -18);
    ctx.fillRect(x + pw, y + ph * 0.26, pw * 0.015, ph * 0.11);
    ctx.fillRect(x - pw * 0.015, y + ph * 0.22, pw * 0.015, ph * 0.075);
    ctx.fillRect(x - pw * 0.015, y + ph * 0.32, pw * 0.015, ph * 0.075);

    /* Inner Dark Display Bezel */
    var bx = x + pw * 0.016, by = y + pw * 0.016, bw = pw - pw * 0.032, bh = ph - pw * 0.032;
    ctx.fillStyle = '#090A0D';
    drawRoundedRectPath(ctx, bx, by, bw, bh, Math.max(4, outerR - pw * 0.016));
    ctx.fill();

    /* Screen Area */
    var sx = x + bezel, sy = y + bezel, sw = pw - bezel * 2, sh = ph - bezel * 2;
    var sr = Math.max(4, outerR - bezel * 0.9);
    ctx.save();
    drawRoundedRectPath(ctx, sx, sy, sw, sh, sr);
    ctx.clip();
    ctx.drawImage(bufCanvas, sx, sy, sw, sh);
    ctx.restore();

    /* Dynamic Island or Punch-Hole Camera */
    if (variant === 'iphone16' || variant === 'dual_phones') {
      var diW = sw * 0.29, diH = sh * 0.029;
      ctx.fillStyle = '#050608';
      drawRoundedRectPath(ctx, cx - diW * 0.5, sy + sh * 0.018, diW, diH, diH * 0.5);
      ctx.fill();
    } else if (variant === 's24ultra') {
      ctx.fillStyle = '#050608';
      ctx.beginPath();
      ctx.arc(cx, sy + sh * 0.025, sw * 0.022, 0, Math.PI * 2);
      ctx.fill();
    }

    drawGlassSheen(ctx, sx, sy, sw, sh, sr);

    /* Subtle metallic specular rim catchlight */
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.lineWidth = Math.max(1, pw * 0.008);
    drawRoundedRectPath(ctx, x + 0.5, y + 0.5, pw - 1, ph - 1, outerR);
    ctx.stroke();
  }

  function drawIsoPhone(ctx, cx, cy, size, bufCanvas) {
    var col = sanitizeHex(state.productColor, '#27272A');
    var pw = size * 0.44;
    var ph = size * 0.88;

    drawContactShadow(ctx, cx + size * 0.04, cy + ph * 0.5, pw * 0.85, ph * 0.08);

    /* Isometric tilted quad coordinates */
    var tl = { x: cx - pw * 0.65, y: cy - ph * 0.44 };
    var tr = { x: cx + pw * 0.35, y: cy - ph * 0.52 };
    var br = { x: cx + pw * 0.65, y: cy + ph * 0.42 };
    var bl = { x: cx - pw * 0.35, y: cy + ph * 0.50 };
    var depthX = size * 0.028;
    var depthY = size * 0.018;

    /* 3D Extruded Edge Thickness */
    ctx.fillStyle = shadeHex(col, -28);
    ctx.beginPath();
    ctx.moveTo(tr.x, tr.y);
    ctx.lineTo(tr.x + depthX, tr.y + depthY);
    ctx.lineTo(br.x + depthX, br.y + depthY);
    ctx.lineTo(bl.x + depthX, bl.y + depthY);
    ctx.lineTo(bl.x, bl.y);
    ctx.lineTo(br.x, br.y);
    ctx.closePath();
    ctx.fill();

    /* Main Chassis Face */
    var fg = ctx.createLinearGradient(tl.x, tl.y, br.x, br.y);
    fg.addColorStop(0, shadeHex(col, 24));
    fg.addColorStop(1, shadeHex(col, -16));
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.fill();

    /* Inset Screen Quad */
    function insetPt(p, c, k) {
      return { x: p.x + (c.x - p.x) * k, y: p.y + (c.y - p.y) * k };
    }
    var center = { x: cx, y: cy };
    var stl = insetPt(tl, center, 0.065);
    var str = insetPt(tr, center, 0.065);
    var sbr = insetPt(br, center, 0.065);
    var sbl = insetPt(bl, center, 0.065);

    drawQuadWarpedBuffer(ctx, bufCanvas, stl, str, sbr, sbl, 8);

    if (state.sheenEnabled && state.sheenIntensity > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(stl.x, stl.y); ctx.lineTo(str.x, str.y);
      ctx.lineTo(sbr.x, sbr.y); ctx.lineTo(sbl.x, sbl.y);
      ctx.closePath();
      ctx.clip();
      var sg = ctx.createLinearGradient(stl.x, stl.y, sbr.x, sbr.y);
      sg.addColorStop(0, 'rgba(255,255,255,' + ((state.sheenIntensity / 100) * 0.36).toFixed(3) + ')');
      sg.addColorStop(0.45, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(cx - size, cy - size, size * 2, size * 2);
      ctx.restore();
    }
  }

  function drawWatchUltra(ctx, cx, cy, size, bufCanvas) {
    var bandCol = sanitizeHex(state.productColor, '#EA580C');
    var cw = size * 0.44;
    var ch = size * 0.54;

    drawContactShadow(ctx, cx, cy + size * 0.46, cw * 0.72, size * 0.05);

    /* Alpine Loop Top & Bottom Straps */
    var strapW = cw * 0.62;
    var strapH = size * 0.24;
    var sg = ctx.createLinearGradient(cx - strapW * 0.5, 0, cx + strapW * 0.5, 0);
    sg.addColorStop(0, shadeHex(bandCol, -28));
    sg.addColorStop(0.5, bandCol);
    sg.addColorStop(1, shadeHex(bandCol, -24));
    ctx.fillStyle = sg;
    drawRoundedRectPath(ctx, cx - strapW * 0.5, cy - ch * 0.48 - strapH, strapW, strapH + 20, strapW * 0.14);
    ctx.fill();
    drawRoundedRectPath(ctx, cx - strapW * 0.5, cy + ch * 0.48 - 20, strapW, strapH + 20, strapW * 0.14);
    ctx.fill();

    /* Watch Titanium Chassis */
    var x = cx - cw * 0.5, y = cy - ch * 0.5;
    var tg = ctx.createLinearGradient(x, y, x + cw, y + ch);
    tg.addColorStop(0, '#D4CFC7');
    tg.addColorStop(0.5, '#A7A198');
    tg.addColorStop(1, '#787269');
    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, ' + (0.35 * (state.shadowIntensity / 100)).toFixed(3) + ')';
    ctx.shadowBlur = size * 0.05;
    ctx.shadowOffsetY = size * 0.02;
    ctx.fillStyle = tg;
    drawRoundedRectPath(ctx, x, y, cw, ch, cw * 0.24);
    ctx.fill();
    ctx.restore();

    /* Digital Crown & Side Guard */
    ctx.fillStyle = '#9C968D';
    drawRoundedRectPath(ctx, x + cw - 2, cy - ch * 0.24, cw * 0.10, ch * 0.22, 4);
    ctx.fill();
    ctx.fillStyle = '#EA580C';
    ctx.fillRect(x - cw * 0.04, cy - ch * 0.12, cw * 0.04, ch * 0.24);

    /* Display Bezel & Screen */
    var bezel = cw * 0.095;
    ctx.fillStyle = '#09090B';
    drawRoundedRectPath(ctx, x + bezel * 0.65, y + bezel * 0.65, cw - bezel * 1.3, ch - bezel * 1.3, cw * 0.18);
    ctx.fill();

    var sx = x + bezel * 1.15, sy = y + bezel * 1.15, sw = cw - bezel * 2.3, sh = ch - bezel * 2.3;
    ctx.save();
    drawRoundedRectPath(ctx, sx, sy, sw, sh, cw * 0.14);
    ctx.clip();
    ctx.drawImage(bufCanvas, sx, sy, sw, sh);
    ctx.restore();
    drawGlassSheen(ctx, sx, sy, sw, sh, cw * 0.14);
  }

  function drawTabletDevice(ctx, cx, cy, size, landscape, bufCanvas) {
    var col = sanitizeHex(state.productColor, '#1F2937');
    var tw = landscape ? size * 0.94 : size * 0.68;
    var th = landscape ? size * 0.68 : size * 0.94;
    var x = cx - tw * 0.5, y = cy - th * 0.5;
    var r = Math.min(tw, th) * 0.055;
    var bezel = Math.min(tw, th) * 0.045;

    drawContactShadow(ctx, cx, cy + th * 0.52, tw * 0.58, size * 0.045);

    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, ' + (0.32 * (state.shadowIntensity / 100)).toFixed(3) + ')';
    ctx.shadowBlur = size * 0.055;
    ctx.shadowOffsetY = size * 0.02;
    ctx.fillStyle = col;
    drawRoundedRectPath(ctx, x, y, tw, th, r);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#090A0E';
    drawRoundedRectPath(ctx, x + 3, y + 3, tw - 6, th - 6, r - 2);
    ctx.fill();

    var sx = x + bezel, sy = y + bezel, sw = tw - bezel * 2, sh = th - bezel * 2;
    ctx.save();
    drawRoundedRectPath(ctx, sx, sy, sw, sh, r * 0.5);
    ctx.clip();
    ctx.drawImage(bufCanvas, sx, sy, sw, sh);
    ctx.restore();

    /* Camera dot */
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(cx, y + bezel * 0.5, Math.min(tw, th) * 0.009, 0, Math.PI * 2);
    ctx.fill();

    drawGlassSheen(ctx, sx, sy, sw, sh, r * 0.5);
  }

  function drawLaptopDevice(ctx, cx, cy, width, isPro, bufCanvas) {
    var col = sanitizeHex(state.productColor, isPro ? '#1E2024' : '#D8DCE2');
    var lidW = width * 0.80;
    var lidH = lidW * 0.63;
    var baseW = width;
    var baseH = lidW * 0.042;
    var lx = cx - lidW * 0.5;
    var ly = cy - (lidH + baseH) * 0.5;

    drawContactShadow(ctx, cx, ly + lidH + baseH * 1.15, baseW * 0.55, lidH * 0.075);

    /* Lid Frame */
    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, ' + (0.30 * (state.shadowIntensity / 100)).toFixed(3) + ')';
    ctx.shadowBlur = width * 0.04;
    ctx.shadowOffsetY = width * 0.015;
    ctx.fillStyle = col;
    drawRoundedRectPath(ctx, lx, ly, lidW, lidH, lidW * 0.025);
    ctx.fill();
    ctx.restore();

    /* Dark Display Area */
    var bezel = lidW * 0.024;
    ctx.fillStyle = '#07080B';
    drawRoundedRectPath(ctx, lx + 2, ly + 2, lidW - 4, lidH - 4, lidW * 0.02);
    ctx.fill();

    var sx = lx + bezel, sy = ly + bezel, sw = lidW - bezel * 2, sh = lidH - bezel * 1.9;
    ctx.save();
    drawRoundedRectPath(ctx, sx, sy, sw, sh, lidW * 0.01);
    ctx.clip();
    ctx.drawImage(bufCanvas, sx, sy, sw, sh);
    ctx.restore();

    /* Camera Notch */
    if (isPro) {
      var nw = lidW * 0.12, nh = lidH * 0.036;
      ctx.fillStyle = '#07080B';
      drawRoundedRectPath(ctx, cx - nw * 0.5, sy - 1, nw, nh, 4);
      ctx.fill();
    }

    drawGlassSheen(ctx, sx, sy, sw, sh, lidW * 0.01);

    /* Lower Aluminum Deck & Hinge Notch */
    var by = ly + lidH - 2;
    var bx = cx - baseW * 0.5;
    var bg = ctx.createLinearGradient(bx, by, bx + baseW, by);
    bg.addColorStop(0, shadeHex(col, -24));
    bg.addColorStop(0.15, shadeHex(col, 20));
    bg.addColorStop(0.5, shadeHex(col, 32));
    bg.addColorStop(0.85, shadeHex(col, 20));
    bg.addColorStop(1, shadeHex(col, -24));
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + baseW, by);
    ctx.lineTo(bx + baseW * 0.985, by + baseH);
    ctx.lineTo(bx + baseW * 0.015, by + baseH);
    ctx.closePath();
    ctx.fill();

    /* Thumb cutout indentation */
    ctx.fillStyle = shadeHex(col, -36);
    drawRoundedRectPath(ctx, cx - baseW * 0.075, by, baseW * 0.15, baseH * 0.36, 4);
    ctx.fill();
  }

  function drawStudioDisplay(ctx, cx, cy, width, bufCanvas) {
    var col = sanitizeHex(state.productColor, '#D1D5DB');
    var mw = width * 0.94;
    var mh = mw * 0.57;
    var chinH = mh * 0.115;
    var standW = mw * 0.22;
    var standH = mh * 0.20;
    var totalH = mh + chinH + standH;
    var mx = cx - mw * 0.5;
    var my = cy - totalH * 0.5;

    drawContactShadow(ctx, cx, my + totalH + 4, mw * 0.42, mh * 0.06);

    /* Aluminum Stand Neck & Foot */
    var stGrad = ctx.createLinearGradient(0, my + mh + chinH, 0, my + totalH);
    stGrad.addColorStop(0, shadeHex(col, -34));
    stGrad.addColorStop(0.5, col);
    stGrad.addColorStop(1, shadeHex(col, 22));
    ctx.fillStyle = stGrad;
    ctx.beginPath();
    ctx.moveTo(cx - standW * 0.45, my + mh + chinH - 2);
    ctx.lineTo(cx + standW * 0.45, my + mh + chinH - 2);
    ctx.lineTo(cx + standW * 0.62, my + totalH);
    ctx.lineTo(cx - standW * 0.62, my + totalH);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = shadeHex(col, 14);
    drawRoundedRectPath(ctx, cx - standW * 0.72, my + totalH - 6, standW * 1.44, 7, 3);
    ctx.fill();

    /* Monitor Body */
    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, ' + (0.28 * (state.shadowIntensity / 100)).toFixed(3) + ')';
    ctx.shadowBlur = mw * 0.04;
    ctx.shadowOffsetY = mw * 0.015;
    ctx.fillStyle = '#090A0E';
    drawRoundedRectPath(ctx, mx, my, mw, mh + chinH, mw * 0.02);
    ctx.fill();
    ctx.restore();

    /* Lower Chin */
    ctx.fillStyle = col;
    drawRoundedRectPath(ctx, mx, my + mh, mw, chinH, mw * 0.015);
    ctx.fill();
    ctx.fillRect(mx, my + mh, mw, chinH * 0.5);

    var bezel = mw * 0.02;
    var sx = mx + bezel, sy = my + bezel, sw = mw - bezel * 2, sh = mh - bezel * 1.5;
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, sy, sw, sh);
    ctx.clip();
    ctx.drawImage(bufCanvas, sx, sy, sw, sh);
    ctx.restore();
    drawGlassSheen(ctx, sx, sy, sw, sh, 2);
  }

  function drawBrowserWindow(ctx, cx, cy, width, isDark, bufCanvas) {
    var bw = width * 0.94;
    var barH = Math.max(26, bw * 0.056);
    var sh = bw * 0.58;
    var bh = barH + sh;
    var bx = cx - bw * 0.5, by = cy - bh * 0.5;
    var chromeBg = sanitizeHex(state.productColor, isDark ? '#0F172A' : '#FFFFFF');

    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, ' + (0.34 * (state.shadowIntensity / 100)).toFixed(3) + ')';
    ctx.shadowBlur = bw * 0.055;
    ctx.shadowOffsetY = bw * 0.025;
    ctx.fillStyle = chromeBg;
    drawRoundedRectPath(ctx, bx, by, bw, bh, bw * 0.022);
    ctx.fill();
    ctx.restore();

    /* Window Titlebar & Traffic Light Dots */
    var dotR = Math.max(4, barH * 0.17);
    var dotY = by + barH * 0.5;
    var cols = ['#FF5F56', '#FFBD2E', '#27C93F'];
    for (var i = 0; i < 3; i++) {
      ctx.fillStyle = cols[i];
      ctx.beginPath();
      ctx.arc(bx + barH * 0.55 + i * dotR * 3.1, dotY, dotR, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Address Bar */
    var urlW = bw * 0.44, urlH = barH * 0.56;
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)';
    drawRoundedRectPath(ctx, cx - urlW * 0.5, by + (barH - urlH) * 0.5, urlW, urlH, urlH * 0.5);
    ctx.fill();
    ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
    ctx.font = '600 ' + Math.round(urlH * 0.52) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('imgsfix.app/showcase', cx, dotY + 1);

    /* Content Viewport */
    ctx.save();
    drawRoundedRectPath(ctx, bx, by + barH, bw, sh, bw * 0.018);
    ctx.clip();
    ctx.fillRect(bx, by + barH, bw, barH * 0.4);
    ctx.drawImage(bufCanvas, bx, by + barH, bw, sh);
    ctx.restore();

    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.10)';
    ctx.lineWidth = 1.5;
    drawRoundedRectPath(ctx, bx, by, bw, bh, bw * 0.022);
    ctx.stroke();
  }

  function drawWallFrame(ctx, cx, cy, stageW, stageH, styleKind, bufCanvas) {
    var isLand = state.frameOrientation === 'landscape';
    var fw, fh;
    if (isLand) {
      fw = Math.min(stageW * 0.84, stageH * 1.15);
      fh = fw * 0.74;
      if (fh > stageH * 0.84) {
        fh = stageH * 0.84;
        fw = fh / 0.74;
      }
    } else {
      fh = Math.min(stageH * 0.86, stageW * 1.05);
      fw = fh * 0.80;
      if (fw > stageW * 0.84) {
        fw = stageW * 0.84;
        fh = fw / 0.80;
      }
    }
    var minDim = Math.min(fw, fh);
    var x = cx - fw * 0.5, y = cy - fh * 0.5;
    var frameCol = sanitizeHex(state.productColor, styleKind === 'gold' ? '#D4AF37' : (styleKind === 'oak' ? '#B58453' : '#18181B'));

    if (styleKind === 'canvas_wrap') {
      var sideD = minDim * 0.068;
      drawContactShadow(ctx, cx + sideD * 0.5, cy + fh * 0.52, fw * 0.56, minDim * 0.055);

      ctx.save();
      ctx.shadowColor = 'rgba(2, 6, 23, ' + (0.34 * (state.shadowIntensity / 100)).toFixed(3) + ')';
      ctx.shadowBlur = minDim * 0.06;
      ctx.shadowOffsetX = minDim * 0.025;
      ctx.shadowOffsetY = minDim * 0.035;

      /* Right & bottom 3D wrapped edge */
      ctx.fillStyle = shadeHex(frameCol, -28);
      ctx.beginPath();
      ctx.moveTo(x + fw, y);
      ctx.lineTo(x + fw + sideD, y + sideD * 0.7);
      ctx.lineTo(x + fw + sideD, y + fh + sideD * 0.7);
      ctx.lineTo(x + sideD, y + fh + sideD * 0.7);
      ctx.lineTo(x, y + fh);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.rect(x, y, fw, fh);
      ctx.clip();
      ctx.drawImage(bufCanvas, x, y, fw, fh);
      ctx.restore();

      /* Subtle linen weave lines */
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (var ly = y; ly < y + fh; ly += 8) {
        ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + fw, ly); ctx.stroke();
      }
      return;
    }

    if (styleKind === 'poster') {
      drawContactShadow(ctx, cx, cy + fh * 0.51, fw * 0.52, minDim * 0.048);
      ctx.save();
      ctx.shadowColor = 'rgba(2, 6, 23, ' + (0.28 * (state.shadowIntensity / 100)).toFixed(3) + ')';
      ctx.shadowBlur = minDim * 0.055;
      ctx.shadowOffsetY = minDim * 0.026;
      ctx.fillStyle = frameCol;
      ctx.fillRect(x, y, fw, fh);
      ctx.restore();

      var pPad = minDim * 0.048;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + pPad, y + pPad, fw - pPad * 2, fh - pPad * 2);
      ctx.clip();
      ctx.drawImage(bufCanvas, x + pPad, y + pPad, fw - pPad * 2, fh - pPad * 2);
      ctx.restore();
      return;
    }

    /* Framed Art (Oak, Black, Gold) with Mitered Frame + Cream Matboard */
    drawContactShadow(ctx, cx, cy + fh * 0.52, fw * 0.56, minDim * 0.058);
    var border = minDim * 0.075;
    var mat = minDim * 0.095;

    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, ' + (0.36 * (state.shadowIntensity / 100)).toFixed(3) + ')';
    ctx.shadowBlur = minDim * 0.065;
    ctx.shadowOffsetY = minDim * 0.03;
    var fg = ctx.createLinearGradient(x, y, x + fw, y + fh);
    fg.addColorStop(0, shadeHex(frameCol, 22));
    fg.addColorStop(0.5, frameCol);
    fg.addColorStop(1, shadeHex(frameCol, -26));
    ctx.fillStyle = fg;
    ctx.fillRect(x, y, fw, fh);
    ctx.restore();

    /* Matboard */
    ctx.fillStyle = '#FAF8F4';
    ctx.fillRect(x + border, y + border, fw - border * 2, fh - border * 2);

    /* Inner Mat Bevel Shadow & Clipped Art */
    var ax = x + border + mat, ay = y + border + mat;
    var aw = fw - (border + mat) * 2, ah = fh - (border + mat) * 2;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
    ctx.fillRect(ax - 2, ay - 2, aw + 4, ah + 4);

    ctx.save();
    ctx.beginPath();
    ctx.rect(ax, ay, aw, ah);
    ctx.clip();
    ctx.drawImage(bufCanvas, ax, ay, aw, ah);
    ctx.restore();

    drawGlassSheen(ctx, x + border, y + border, fw - border * 2, fh - border * 2, 0);
  }

  function drawHardcoverBook(ctx, cx, cy, size, bufCanvas) {
    var col = sanitizeHex(state.productColor, '#1E3A8A');
    var bw = size * 0.56;
    var bh = size * 0.78;
    var x = cx - bw * 0.45, y = cy - bh * 0.5;

    drawContactShadow(ctx, cx + bw * 0.05, cy + bh * 0.53, bw * 0.65, bh * 0.06);

    /* Page Block Edge (right & bottom stacked cream paper) */
    var pThick = bw * 0.085;
    ctx.fillStyle = '#F3EFE6';
    ctx.beginPath();
    ctx.moveTo(x + bw, y + bh * 0.03);
    ctx.lineTo(x + bw + pThick, y + bh * 0.06);
    ctx.lineTo(x + bw + pThick, y + bh - bh * 0.02);
    ctx.lineTo(x + bw, y + bh);
    ctx.closePath();
    ctx.fill();

    /* Spine Depth on Left */
    var spineW = bw * 0.11;
    var spGrad = ctx.createLinearGradient(x - spineW, 0, x, 0);
    spGrad.addColorStop(0, shadeHex(col, -36));
    spGrad.addColorStop(0.6, col);
    spGrad.addColorStop(1, shadeHex(col, -28));
    ctx.fillStyle = spGrad;
    drawRoundedRectPath(ctx, x - spineW, y, spineW + 6, bh, 6);
    ctx.fill();

    /* Front Cover */
    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, ' + (0.34 * (state.shadowIntensity / 100)).toFixed(3) + ')';
    ctx.shadowBlur = size * 0.045;
    ctx.shadowOffsetY = size * 0.02;
    ctx.fillStyle = col;
    drawRoundedRectPath(ctx, x, y, bw, bh, 6);
    ctx.fill();
    ctx.restore();

    /* Cover Artwork + Spine Hinge Crease Lighting */
    ctx.save();
    drawRoundedRectPath(ctx, x, y, bw, bh, 6);
    ctx.clip();
    ctx.drawImage(bufCanvas, x, y, bw, bh);
    var crease = ctx.createLinearGradient(x, 0, x + bw * 0.11, 0);
    crease.addColorStop(0, 'rgba(0,0,0,0.28)');
    crease.addColorStop(0.35, 'rgba(255,255,255,0.22)');
    crease.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = crease;
    ctx.fillRect(x, y, bw * 0.12, bh);
    ctx.restore();
  }

  function drawOpenMagazine(ctx, cx, cy, size, bufCanvas) {
    var mw = size * 0.90;
    var mh = mw * 0.68;
    var x = cx - mw * 0.5, y = cy - mh * 0.5;

    drawContactShadow(ctx, cx, cy + mh * 0.52, mw * 0.54, mh * 0.055);

    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, ' + (0.32 * (state.shadowIntensity / 100)).toFixed(3) + ')';
    ctx.shadowBlur = size * 0.05;
    ctx.shadowOffsetY = size * 0.025;
    ctx.fillStyle = sanitizeHex(state.productColor, '#F8FAFC');
    ctx.fillRect(x, y, mw, mh);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 4, y + 4, mw - 8, mh - 8);
    ctx.clip();
    ctx.drawImage(bufCanvas, x + 4, y + 4, mw - 8, mh - 8);
    ctx.restore();

    /* Center Spine Gutter Fold Shading */
    var gutter = ctx.createLinearGradient(cx - mw * 0.08, 0, cx + mw * 0.08, 0);
    gutter.addColorStop(0, 'rgba(15,23,42,0)');
    gutter.addColorStop(0.45, 'rgba(15,23,42,0.26)');
    gutter.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    gutter.addColorStop(0.55, 'rgba(15,23,42,0.22)');
    gutter.addColorStop(1, 'rgba(15,23,42,0)');
    ctx.fillStyle = gutter;
    ctx.fillRect(cx - mw * 0.08, y, mw * 0.16, mh);
  }

  function drawBusinessCard(ctx, cx, cy, size, bufCanvas) {
    var col = sanitizeHex(state.productColor, '#FFFFFF');
    var cw = size * 0.80;
    var ch = cw * 0.57;

    drawContactShadow(ctx, cx + size * 0.02, cy + ch * 0.54, cw * 0.58, ch * 0.10);

    var tl = { x: cx - cw * 0.52, y: cy - ch * 0.42 };
    var tr = { x: cx + cw * 0.46, y: cy - ch * 0.56 };
    var br = { x: cx + cw * 0.52, y: cy + ch * 0.42 };
    var bl = { x: cx - cw * 0.46, y: cy + ch * 0.56 };
    var thick = size * 0.015;

    /* Thick card edge */
    ctx.fillStyle = shadeHex(col, -28);
    ctx.beginPath();
    ctx.moveTo(bl.x, bl.y);
    ctx.lineTo(bl.x, bl.y + thick);
    ctx.lineTo(br.x, br.y + thick);
    ctx.lineTo(tr.x, tr.y + thick);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.closePath();
    ctx.fill();

    drawQuadWarpedBuffer(ctx, bufCanvas, tl, tr, br, bl, 8);
  }

  function drawCoffeeMug(ctx, cx, cy, size, bufCanvas) {
    var col = sanitizeHex(state.productColor, '#FFFFFF');
    var mw = size * 0.48;
    var mh = size * 0.54;
    var mx = cx - mw * 0.56;
    var my = cy - mh * 0.48;

    drawContactShadow(ctx, cx - mw * 0.04, my + mh + mh * 0.04, mw * 0.78, mh * 0.09);

    /* Ceramic Handle on Right */
    ctx.save();
    ctx.strokeStyle = shadeHex(col, -12);
    ctx.lineWidth = mw * 0.12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(mx + mw * 0.96, my + mh * 0.48, mh * 0.28, -Math.PI * 0.48, Math.PI * 0.48);
    ctx.stroke();
    ctx.restore();

    /* Mug Body Cylinder */
    var mg = ctx.createLinearGradient(mx, 0, mx + mw, 0);
    mg.addColorStop(0, shadeHex(col, -26));
    mg.addColorStop(0.28, shadeHex(col, 14));
    mg.addColorStop(0.65, col);
    mg.addColorStop(1, shadeHex(col, -36));

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx + mw, my);
    ctx.lineTo(mx + mw, my + mh * 0.90);
    ctx.ellipse(mx + mw * 0.5, my + mh * 0.90, mw * 0.5, mh * 0.10, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = mg;
    ctx.fill();
    ctx.clip();

    /* Cylindrical Wrapped Logo / Art */
    drawCylinderWarpedBuffer(ctx, bufCanvas, mx + mw * 0.06, my + mh * 0.16, mw * 0.88, mh * 0.66, mh * 0.035);

    /* Cylindrical Shading Overlay & Specular Gloss Strip */
    var cg = ctx.createLinearGradient(mx, 0, mx + mw, 0);
    cg.addColorStop(0, 'rgba(2, 6, 23, 0.30)');
    cg.addColorStop(0.18, 'rgba(255, 255, 255, 0.24)');
    cg.addColorStop(0.45, 'rgba(255, 255, 255, 0.04)');
    cg.addColorStop(0.78, 'rgba(2, 6, 23, 0.14)');
    cg.addColorStop(1, 'rgba(2, 6, 23, 0.36)');
    ctx.fillStyle = cg;
    ctx.fillRect(mx, my, mw, mh);

    if (state.sheenEnabled && state.sheenIntensity > 0) {
      var sg = ctx.createLinearGradient(mx + mw * 0.14, 0, mx + mw * 0.30, 0);
      var sa = (state.sheenIntensity / 100) * 0.42;
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(0.45, 'rgba(255,255,255,' + sa.toFixed(3) + ')');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(mx + mw * 0.14, my, mw * 0.16, mh);
    }
    ctx.restore();

    /* Top Rim Opening + Specular Porcelain Rim Highlight */
    ctx.fillStyle = shadeHex(col, -16);
    ctx.beginPath();
    ctx.ellipse(mx + mw * 0.5, my, mw * 0.5, mh * 0.085, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = Math.max(1.2, mw * 0.012);
    ctx.beginPath();
    ctx.ellipse(mx + mw * 0.5, my, mw * 0.48, mh * 0.08, 0, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
    ctx.fillStyle = '#3B2314';
    ctx.beginPath();
    ctx.ellipse(mx + mw * 0.5, my + mh * 0.015, mw * 0.44, mh * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPaperCup(ctx, cx, cy, size, bufCanvas) {
    var col = sanitizeHex(state.productColor, '#FAF7F2');
    var topW = size * 0.44;
    var botW = size * 0.30;
    var ch = size * 0.68;
    var topY = cy - ch * 0.42;

    drawContactShadow(ctx, cx, topY + ch + size * 0.03, botW * 0.85, size * 0.055);

    /* Tapered Cup Body */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - topW * 0.5, topY);
    ctx.lineTo(cx + topW * 0.5, topY);
    ctx.lineTo(cx + botW * 0.5, topY + ch);
    ctx.lineTo(cx - botW * 0.5, topY + ch);
    ctx.closePath();
    var cg = ctx.createLinearGradient(cx - topW * 0.5, 0, cx + topW * 0.5, 0);
    cg.addColorStop(0, shadeHex(col, -24));
    cg.addColorStop(0.32, shadeHex(col, 14));
    cg.addColorStop(1, shadeHex(col, -32));
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.clip();

    drawCylinderWarpedBuffer(ctx, bufCanvas, cx - topW * 0.44, topY + ch * 0.18, topW * 0.88, ch * 0.58, ch * 0.025);

    var shad = ctx.createLinearGradient(cx - topW * 0.5, 0, cx + topW * 0.5, 0);
    shad.addColorStop(0, 'rgba(2, 6, 23, 0.22)');
    shad.addColorStop(0.3, 'rgba(255, 255, 255, 0.22)');
    shad.addColorStop(1, 'rgba(2, 6, 23, 0.28)');
    ctx.fillStyle = shad;
    ctx.fillRect(cx - topW * 0.5, topY, topW, ch);
    ctx.restore();

    /* Snap-On Molded Lid */
    var lidW = topW * 1.08;
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRectPath(ctx, cx - lidW * 0.5, topY - ch * 0.09, lidW, ch * 0.10, 6);
    ctx.fill();
    ctx.fillStyle = '#E2E8F0';
    drawRoundedRectPath(ctx, cx - lidW * 0.44, topY - ch * 0.145, lidW * 0.88, ch * 0.065, 5);
    ctx.fill();
  }

  function drawApparel(ctx, cx, cy, size, isHoodie, bufCanvas) {
    var col = sanitizeHex(state.productColor, isHoodie ? '#1E293B' : '#F8FAFC');
    var tw = size * 0.52;
    var th = size * 0.78;
    var tx = cx - tw * 0.5, ty = cy - th * 0.46;

    drawContactShadow(ctx, cx, ty + th + size * 0.03, tw * 0.65, size * 0.05);

    /* Garment Silhouette (Sleeves + Torso + Collar/Hood) */
    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, ' + (0.28 * (state.shadowIntensity / 100)).toFixed(3) + ')';
    ctx.shadowBlur = size * 0.045;
    ctx.shadowOffsetY = size * 0.02;

    var fg = ctx.createLinearGradient(tx - tw * 0.35, ty, tx + tw * 1.35, ty + th);
    fg.addColorStop(0, shadeHex(col, 16));
    fg.addColorStop(0.5, col);
    fg.addColorStop(1, shadeHex(col, -28));
    ctx.fillStyle = fg;

    ctx.beginPath();
    ctx.moveTo(cx - tw * 0.18, ty);
    ctx.lineTo(tx - tw * 0.04, ty + th * 0.06);
    ctx.lineTo(tx - tw * 0.38, ty + (isHoodie ? th * 0.46 : th * 0.34));
    ctx.lineTo(tx - tw * 0.24, ty + (isHoodie ? th * 0.52 : th * 0.42));
    ctx.lineTo(tx, ty + th * 0.30);
    ctx.lineTo(tx, ty + th);
    ctx.lineTo(tx + tw, ty + th);
    ctx.lineTo(tx + tw, ty + th * 0.30);
    ctx.lineTo(tx + tw + tw * 0.24, ty + (isHoodie ? th * 0.52 : th * 0.42));
    ctx.lineTo(tx + tw + tw * 0.38, ty + (isHoodie ? th * 0.46 : th * 0.34));
    ctx.lineTo(tx + tw + tw * 0.04, ty + th * 0.06);
    ctx.lineTo(cx + tw * 0.18, ty);
    ctx.quadraticCurveTo(cx, ty + th * 0.09, cx - tw * 0.18, ty);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (isHoodie) {
      /* Hood + Drawstrings + Kangaroo Pocket */
      ctx.fillStyle = shadeHex(col, -16);
      drawRoundedRectPath(ctx, cx - tw * 0.24, ty - th * 0.14, tw * 0.48, th * 0.22, tw * 0.18);
      ctx.fill();
      ctx.strokeStyle = isColorDark(col) ? 'rgba(255,255,255,0.55)' : 'rgba(15,23,42,0.4)';
      ctx.lineWidth = Math.max(2, tw * 0.018);
      ctx.beginPath();
      ctx.moveTo(cx - tw * 0.06, ty + th * 0.07);
      ctx.lineTo(cx - tw * 0.07, ty + th * 0.24);
      ctx.moveTo(cx + tw * 0.06, ty + th * 0.07);
      ctx.lineTo(cx + tw * 0.07, ty + th * 0.24);
      ctx.stroke();

      /* Kangaroo pocket */
      ctx.fillStyle = shadeHex(col, -12);
      ctx.beginPath();
      ctx.moveTo(cx - tw * 0.28, ty + th * 0.72);
      ctx.lineTo(cx + tw * 0.28, ty + th * 0.72);
      ctx.lineTo(cx + tw * 0.36, ty + th * 0.93);
      ctx.lineTo(cx - tw * 0.36, ty + th * 0.93);
      ctx.closePath();
      ctx.fill();
    } else {
      /* Ribbed Crewneck Collar */
      ctx.strokeStyle = shadeHex(col, -24);
      ctx.lineWidth = Math.max(3, tw * 0.032);
      ctx.beginPath();
      ctx.moveTo(cx - tw * 0.17, ty);
      ctx.quadraticCurveTo(cx, ty + th * 0.10, cx + tw * 0.17, ty);
      ctx.stroke();
    }

    /* Chest Print Area + Fabric Fold Shading Blend */
    var aw = tw * 0.68, ah = aw * 1.05;
    var ax = cx - aw * 0.5, ay = ty + th * 0.19;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ax, ay, aw, ah);
    ctx.clip();
    ctx.globalCompositeOperation = isColorDark(col) ? 'source-over' : 'multiply';
    ctx.drawImage(bufCanvas, ax, ay, aw, ah);
    ctx.restore();

    /* Subtle cotton fold shadows across torso */
    var fold = ctx.createLinearGradient(tx, 0, tx + tw, 0);
    fold.addColorStop(0, 'rgba(0,0,0,0.08)');
    fold.addColorStop(0.28, 'rgba(255,255,255,0.07)');
    fold.addColorStop(0.5, 'rgba(0,0,0,0.04)');
    fold.addColorStop(0.74, 'rgba(255,255,255,0.06)');
    fold.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = fold;
    ctx.fillRect(ax, ay, aw, ah);
  }

  function drawToteOrKraftBag(ctx, cx, cy, size, isKraft, bufCanvas) {
    var col = sanitizeHex(state.productColor, isKraft ? '#C9A679' : '#F4EFE6');
    var bw = size * 0.56;
    var bh = size * 0.62;
    var x = cx - bw * 0.5, y = cy - bh * 0.35;

    drawContactShadow(ctx, cx, y + bh + size * 0.03, bw * 0.72, size * 0.055);

    /* Handles */
    ctx.strokeStyle = shadeHex(col, -22);
    ctx.lineWidth = Math.max(4, bw * 0.045);
    ctx.beginPath();
    ctx.ellipse(cx, y + bh * 0.04, bw * 0.22, bh * 0.28, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    /* Bag Body */
    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, ' + (0.28 * (state.shadowIntensity / 100)).toFixed(3) + ')';
    ctx.shadowBlur = size * 0.045;
    ctx.shadowOffsetY = size * 0.02;
    ctx.fillStyle = col;
    if (isKraft) {
      var sideW = bw * 0.16;
      ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = shadeHex(col, -22);
      ctx.fillRect(x + bw, y + 6, sideW, bh - 6);
    } else {
      drawRoundedRectPath(ctx, x, y, bw, bh, bw * 0.04);
      ctx.fill();
    }
    ctx.restore();

    /* Center Artwork Clipped to Bag Printable Area */
    var aw = bw * 0.68, ah = bh * 0.64;
    var ax = cx - aw * 0.5, ay = y + bh * 0.21;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ax, ay, aw, ah);
    ctx.clip();
    ctx.globalCompositeOperation = isColorDark(col) ? 'source-over' : 'multiply';
    ctx.drawImage(bufCanvas, ax, ay, aw, ah);
    ctx.restore();
  }

  function drawProductBox(ctx, cx, cy, size, bufCanvas) {
    var col = sanitizeHex(state.productColor, '#F8FAFC');
    var bw = size * 0.44;
    var bh = size * 0.64;
    var depthX = bw * 0.46;
    var depthY = bh * 0.15;

    drawContactShadow(ctx, cx, cy + bh * 0.56, bw * 1.1, size * 0.065);

    var fl = cx - bw * 0.66;
    var fr = fl + bw;
    var topY = cy - bh * 0.44;

    /* Left Front Face Quad */
    var tl = { x: fl, y: topY };
    var tr = { x: fr, y: topY + depthY };
    var br = { x: fr, y: topY + depthY + bh };
    var bl = { x: fl, y: topY + bh };

    /* Top Lid Face */
    ctx.fillStyle = shadeHex(col, 14);
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tl.x + depthX, tl.y - depthY);
    ctx.lineTo(tr.x + depthX, tr.y - depthY);
    ctx.lineTo(tr.x, tr.y);
    ctx.closePath();
    ctx.fill();

    /* Right Side Face */
    ctx.fillStyle = shadeHex(col, -28);
    ctx.beginPath();
    ctx.moveTo(tr.x, tr.y);
    ctx.lineTo(tr.x + depthX, tr.y - depthY);
    ctx.lineTo(br.x + depthX, br.y - depthY);
    ctx.lineTo(br.x, br.y);
    ctx.closePath();
    ctx.fill();

    /* Front Face + Perspective Artwork */
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.fill();

    drawQuadWarpedBuffer(ctx, bufCanvas, tl, tr, br, bl, 8);
  }

  function drawStorefrontSign(ctx, cx, cy, width, bufCanvas) {
    var col = sanitizeHex(state.productColor, '#1E293B');
    var sw = width * 0.88;
    var sh = sw * 0.36;
    var x = cx - sw * 0.5, y = cy - sh * 0.5;

    /* Architectural Wall Bricks / Panel Background Hint */
    ctx.save();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
    ctx.lineWidth = 1.5;
    for (var wy = cy - sh; wy < cy + sh; wy += sh * 0.25) {
      ctx.beginPath(); ctx.moveTo(cx - sw * 0.6, wy); ctx.lineTo(cx + sw * 0.6, wy); ctx.stroke();
    }
    ctx.restore();

    /* LED Halo Backglow + Deep Wall Shadow */
    ctx.save();
    ctx.shadowColor = state.sheenEnabled
      ? 'rgba(56, 189, 248, ' + (0.48 * (state.sheenIntensity / 100)).toFixed(3) + ')'
      : 'rgba(2, 6, 23, ' + (0.45 * (state.shadowIntensity / 100)).toFixed(3) + ')';
    ctx.shadowBlur = sw * 0.065;
    ctx.shadowOffsetY = sw * 0.025;
    ctx.fillStyle = col;
    drawRoundedRectPath(ctx, x, y, sw, sh, sw * 0.025);
    ctx.fill();
    ctx.restore();

    /* Aluminum Fascia Rim + Standoff Bolts */
    var pad = sw * 0.032;
    ctx.save();
    drawRoundedRectPath(ctx, x + pad, y + pad, sw - pad * 2, sh - pad * 2, sw * 0.015);
    ctx.clip();
    ctx.drawImage(bufCanvas, x + pad, y + pad, sw - pad * 2, sh - pad * 2);
    ctx.restore();

    /* Corner Mounting Bolts */
    var bolts = [
      [x + pad * 0.5, y + pad * 0.5], [x + sw - pad * 0.5, y + pad * 0.5],
      [x + pad * 0.5, y + sh - pad * 0.5], [x + sw - pad * 0.5, y + sh - pad * 0.5],
    ];
    ctx.fillStyle = '#CBD5E1';
    bolts.forEach(function (b) {
      ctx.beginPath(); ctx.arc(b[0], b[1], pad * 0.24, 0, Math.PI * 2); ctx.fill();
    });

    drawGlassSheen(ctx, x + pad, y + pad, sw - pad * 2, sh - pad * 2, sw * 0.015);
  }

  /* Template 31: Polo / Button-Up Collared Shirt */
  function drawPoloShirt(ctx, cx, cy, size, bufCanvas) {
    var col = sanitizeHex(state.productColor, '#0F172A');
    var dark = isColorDark(col);
    var tw = size * 0.54;
    var th = size * 0.78;
    var tx = cx - tw * 0.5;
    var ty = cy - th * 0.44;

    drawContactShadow(ctx, cx, ty + th + size * 0.03, tw * 0.68, size * 0.052);

    /* Garment Body & Short Hemmed Sleeves */
    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, ' + (0.30 * (state.shadowIntensity / 100)).toFixed(3) + ')';
    ctx.shadowBlur = size * 0.048;
    ctx.shadowOffsetY = size * 0.022;

    var fg = ctx.createLinearGradient(tx - tw * 0.35, ty, tx + tw * 1.35, ty + th);
    fg.addColorStop(0, shadeHex(col, 16));
    fg.addColorStop(0.5, col);
    fg.addColorStop(1, shadeHex(col, -28));
    ctx.fillStyle = fg;

    ctx.beginPath();
    ctx.moveTo(cx - tw * 0.19, ty);
    ctx.lineTo(tx - tw * 0.03, ty + th * 0.06);
    ctx.lineTo(tx - tw * 0.37, ty + th * 0.35);
    ctx.lineTo(tx - tw * 0.23, ty + th * 0.43);
    ctx.lineTo(tx, ty + th * 0.31);
    ctx.lineTo(tx, ty + th);
    ctx.lineTo(tx + tw, ty + th);
    ctx.lineTo(tx + tw, ty + th * 0.31);
    ctx.lineTo(tx + tw + tw * 0.23, ty + th * 0.43);
    ctx.lineTo(tx + tw + tw * 0.37, ty + th * 0.35);
    ctx.lineTo(tx + tw + tw * 0.03, ty + th * 0.06);
    ctx.lineTo(cx + tw * 0.19, ty);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    /* Ribbed Sleeve Cuffs & Subtle Shoulder Seams */
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.16)';
    ctx.lineWidth = Math.max(1.5, tw * 0.008);
    ctx.beginPath();
    ctx.moveTo(cx - tw * 0.19, ty);
    ctx.lineTo(tx - tw * 0.03, ty + th * 0.06);
    ctx.moveTo(cx + tw * 0.19, ty);
    ctx.lineTo(tx + tw + tw * 0.03, ty + th * 0.06);
    ctx.stroke();

    /* Structured Button Placket */
    var plW = tw * 0.095;
    var plH = th * 0.23;
    var plX = cx - plW * 0.5;
    var plY = ty + th * 0.035;
    ctx.fillStyle = shadeHex(col, dark ? 14 : -14);
    drawRoundedRectPath(ctx, plX, plY, plW, plH, 4);
    ctx.fill();
    ctx.strokeStyle = dark ? 'rgba(0,0,0,0.45)' : 'rgba(15,23,42,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();

    /* 2 Mother-of-Pearl Stitched Buttons */
    [plY + plH * 0.38, plY + plH * 0.74].forEach(function (by) {
      ctx.fillStyle = dark ? '#CBD5E1' : '#F8FAFC';
      ctx.beginPath();
      ctx.arc(cx, by, plW * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,23,42,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    /* Folded Left & Right Collar Lapels */
    ctx.fillStyle = shadeHex(col, dark ? -18 : -10);
    ctx.beginPath();
    ctx.moveTo(cx - tw * 0.19, ty);
    ctx.lineTo(cx, ty + th * 0.045);
    ctx.lineTo(cx + tw * 0.19, ty);
    ctx.quadraticCurveTo(cx, ty - th * 0.045, cx - tw * 0.19, ty);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = shadeHex(col, 14);
    /* Left Lapel */
    ctx.beginPath();
    ctx.moveTo(cx - tw * 0.19, ty);
    ctx.lineTo(cx - tw * 0.02, ty + th * 0.04);
    ctx.lineTo(cx - tw * 0.14, ty + th * 0.135);
    ctx.lineTo(cx - tw * 0.22, ty + th * 0.045);
    ctx.closePath();
    ctx.fill();
    /* Right Lapel */
    ctx.beginPath();
    ctx.moveTo(cx + tw * 0.19, ty);
    ctx.lineTo(cx + tw * 0.02, ty + th * 0.04);
    ctx.lineTo(cx + tw * 0.14, ty + th * 0.135);
    ctx.lineTo(cx + tw * 0.22, ty + th * 0.045);
    ctx.closePath();
    ctx.fill();

    /* Center-Chest Print Area (Cleanly below placket) */
    var aw = tw * 0.58, ah = aw * 0.96;
    var ax = cx - aw * 0.5, ay = ty + th * 0.29;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ax, ay, aw, ah);
    ctx.clip();
    ctx.globalCompositeOperation = dark ? 'source-over' : 'multiply';
    ctx.drawImage(bufCanvas, ax, ay, aw, ah);
    ctx.restore();

    /* Natural Cotton Fold & Ribbed Shading */
    var fold = ctx.createLinearGradient(tx, 0, tx + tw, 0);
    fold.addColorStop(0, 'rgba(0,0,0,0.09)');
    fold.addColorStop(0.28, 'rgba(255,255,255,0.08)');
    fold.addColorStop(0.52, 'rgba(0,0,0,0.04)');
    fold.addColorStop(0.75, 'rgba(255,255,255,0.06)');
    fold.addColorStop(1, 'rgba(0,0,0,0.13)');
    ctx.fillStyle = fold;
    ctx.fillRect(ax, ay, aw, ah);
  }

  /* Template 32: 3D Hanging Circular Blade Storefront Sign */
  function drawBladeSign(ctx, cx, cy, size, bufCanvas) {
    var col = sanitizeHex(state.productColor, '#1E293B');
    var r = size * 0.34;
    var signCx = cx + size * 0.08;
    var signCy = cy + size * 0.03;
    var wallX = signCx - r * 1.38;

    /* Architectural Facade Wall Strip on Left */
    var wg = ctx.createLinearGradient(wallX - size * 0.22, 0, wallX, 0);
    wg.addColorStop(0, '#94A3B8');
    wg.addColorStop(0.85, '#CBD5E1');
    wg.addColorStop(1, '#64748B');
    ctx.fillStyle = wg;
    ctx.fillRect(wallX - size * 0.22, cy - size * 0.48, size * 0.22, size * 0.96);

    /* Subtle facade stone seams */
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.14)';
    ctx.lineWidth = 1.2;
    for (var sy = cy - size * 0.42; sy < cy + size * 0.46; sy += size * 0.14) {
      ctx.beginPath();
      ctx.moveTo(wallX - size * 0.22, sy);
      ctx.lineTo(wallX, sy);
      ctx.stroke();
    }

    /* Wall Shadow Cast Behind Sign & Bracket */
    var shAlpha = 0.36 * (state.shadowIntensity / 100);
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, ' + shAlpha.toFixed(3) + ')';
    ctx.filter = 'blur(' + Math.max(4, Math.round(size * 0.025)) + 'px)';
    ctx.beginPath();
    ctx.arc(signCx + size * 0.035, signCy + size * 0.045, r * 1.02, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* Matte Black Steel Wall Mounting Plate + Top/Bottom Cantilever Bracket */
    var plateW = size * 0.045;
    var plateH = r * 1.15;
    ctx.fillStyle = '#0F172A';
    drawRoundedRectPath(ctx, wallX - plateW * 0.3, signCy - plateH * 0.5, plateW, plateH, 5);
    ctx.fill();

    /* Horizontal Steel Arm Bars */
    var armH = Math.max(5, r * 0.07);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(wallX + plateW * 0.5, signCy - r * 0.42, (signCx - wallX) - r * 0.72, armH);
    ctx.fillRect(wallX + plateW * 0.5, signCy + r * 0.42 - armH, (signCx - wallX) - r * 0.72, armH);

    /* 3D Extruded Sign Rim Thickness (Side Cylinder Lip) */
    var depthX = size * 0.036;
    ctx.fillStyle = shadeHex(col, -30);
    ctx.beginPath();
    ctx.arc(signCx - depthX, signCy, r * 1.02, 0, Math.PI * 2);
    ctx.fill();

    /* Main Circular Enamel Face Rim */
    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, ' + (0.40 * (state.shadowIntensity / 100)).toFixed(3) + ')';
    ctx.shadowBlur = size * 0.05;
    ctx.shadowOffsetX = size * 0.018;
    ctx.shadowOffsetY = size * 0.025;
    var rimGrad = ctx.createLinearGradient(signCx - r, signCy - r, signCx + r, signCy + r);
    rimGrad.addColorStop(0, shadeHex(col, 24));
    rimGrad.addColorStop(0.5, col);
    rimGrad.addColorStop(1, shadeHex(col, -28));
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(signCx, signCy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* Inner Printed Sign Graphic */
    var innerR = r * 0.90;
    ctx.save();
    ctx.beginPath();
    ctx.arc(signCx, signCy, innerR, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = col;
    ctx.fillRect(signCx - innerR, signCy - innerR, innerR * 2, innerR * 2);
    ctx.drawImage(bufCanvas, signCx - innerR, signCy - innerR, innerR * 2, innerR * 2);
    ctx.restore();

    /* Specular Enamel Glare */
    if (state.sheenEnabled && state.sheenIntensity > 0) {
      var ga = (state.sheenIntensity / 100) * 0.28;
      ctx.save();
      ctx.beginPath();
      ctx.arc(signCx, signCy, innerR, 0, Math.PI * 2);
      ctx.clip();
      var sg = ctx.createLinearGradient(signCx - innerR, signCy - innerR, signCx + innerR * 0.6, signCy + innerR * 0.4);
      sg.addColorStop(0, 'rgba(255,255,255,' + ga.toFixed(3) + ')');
      sg.addColorStop(0.42, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(signCx - innerR, signCy - innerR, innerR * 2, innerR * 2);
      ctx.restore();
    }
  }

  /* Template 33: Storefront Glass Door & Window Decal */
  function drawGlassStorefront(ctx, cx, cy, size, bufCanvas) {
    var frameCol = sanitizeHex(state.productColor, '#1E293B');
    var sw = size * 0.90;
    var sh = size * 0.86;
    var x = cx - sw * 0.5;
    var y = cy - sh * 0.5;

    drawContactShadow(ctx, cx, y + sh + size * 0.028, sw * 0.54, size * 0.045);

    /* Outer Architectural Storefront Frame */
    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, ' + (0.34 * (state.shadowIntensity / 100)).toFixed(3) + ')';
    ctx.shadowBlur = size * 0.05;
    ctx.shadowOffsetY = size * 0.025;
    ctx.fillStyle = frameCol;
    drawRoundedRectPath(ctx, x, y, sw, sh, sw * 0.015);
    ctx.fill();
    ctx.restore();

    var pad = sw * 0.045;
    var innerX = x + pad;
    var innerY = y + pad;
    var innerW = sw - pad * 2;
    var innerH = sh - pad * 1.4;

    /* Blurred Boutique Interior Depth Behind Glass */
    var intGrad = ctx.createLinearGradient(innerX, innerY, innerX + innerW, innerY + innerH);
    intGrad.addColorStop(0, '#1E293B');
    intGrad.addColorStop(0.55, '#334155');
    intGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = intGrad;
    ctx.fillRect(innerX, innerY, innerW, innerH);

    /* Warm Boutique Interior Pendant Glows & Floor Sill */
    var warm1 = ctx.createRadialGradient(cx - innerW * 0.22, innerY + innerH * 0.25, 4, cx - innerW * 0.22, innerY + innerH * 0.25, innerW * 0.45);
    warm1.addColorStop(0, 'rgba(253, 224, 71, 0.24)');
    warm1.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = warm1;
    ctx.fillRect(innerX, innerY, innerW, innerH);

    /* Transom Horizontal Mullion & Door Vertical Mullion */
    var doorW = innerW * 0.62;
    var doorX = innerX;
    var transH = innerH * 0.16;
    var paneY = innerY + transH + pad * 0.55;
    var paneH = innerH - transH - pad * 0.55;

    ctx.fillStyle = frameCol;
    ctx.fillRect(innerX, innerY + transH, innerW, pad * 0.55);
    ctx.fillRect(innerX + doorW, innerY, pad * 0.5, innerH);

    /* Vinyl Decal Logo Applied to Main Glass Door Pane */
    var logoPad = doorW * 0.12;
    var lx = doorX + logoPad;
    var ly = paneY + paneH * 0.14;
    var lw = doorW - logoPad * 2;
    var lh = paneH * 0.58;
    ctx.save();
    ctx.beginPath();
    ctx.rect(doorX + 2, paneY + 2, doorW - 4, paneH - 4);
    ctx.clip();
    ctx.drawImage(bufCanvas, lx, ly, lw, lh);
    ctx.restore();

    /* Stainless Steel Door Pull Handle */
    var hndX = doorX + doorW - doorW * 0.11;
    var hndY = paneY + paneH * 0.42;
    var hndH = paneH * 0.24;
    ctx.fillStyle = '#E2E8F0';
    drawRoundedRectPath(ctx, hndX, hndY, Math.max(5, doorW * 0.028), hndH, 4);
    ctx.fill();

    /* Realistic Diagonal Architectural Glass Reflections */
    if (state.sheenEnabled && state.sheenIntensity > 0) {
      var ga2 = (state.sheenIntensity / 100) * 0.34;
      ctx.save();
      ctx.beginPath();
      ctx.rect(innerX, innerY, innerW, innerH);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,' + ga2.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(innerX + innerW * 0.38, innerY);
      ctx.lineTo(innerX + innerW * 0.08, innerY + innerH);
      ctx.lineTo(innerX, innerY + innerH);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,' + (ga2 * 0.55).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(innerX + innerW * 0.48, innerY);
      ctx.lineTo(innerX + innerW * 0.62, innerY);
      ctx.lineTo(innerX + innerW * 0.32, innerY + innerH);
      ctx.lineTo(innerX + innerW * 0.18, innerY + innerH);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  /* ----- Headline Text Overlay Renderer ----- */
  function drawHeadlineOverlay(ctx, W, H, areaTop, areaLeft, areaWidth, areaHeight) {
    if (state.headlinePos === 'none') return;
    var hl = (state.headline || '').trim();
    var sub = (state.subline || '').trim();
    if (!hl && !sub) return;

    var fontObj = getFontObj(state.fontId);
    ensureFontLoaded(fontObj);
    var col = sanitizeHex(state.textColor, '#0F172A');

    ctx.save();
    ctx.fillStyle = col;
    if (state.headlinePos === 'top') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var hlSize = Math.round(clamp(Math.min(W, H) * 0.056, 22, 64));
      ctx.font = fontObj.weight + ' ' + hlSize + 'px ' + fontObj.css;
      if (hl) ctx.fillText(hl, W * 0.5, areaTop * 0.45, W * 0.88);
      if (sub) {
        ctx.globalAlpha = 0.78;
        ctx.font = '600 ' + Math.round(hlSize * 0.46) + 'px ' + fontObj.css;
        ctx.fillText(sub, W * 0.5, areaTop * 0.78, W * 0.84);
      }
    } else if (state.headlinePos === 'side') {
      var isRtl = document.documentElement.getAttribute('dir') === 'rtl';
      ctx.textAlign = isRtl ? 'right' : 'left';
      ctx.textBaseline = 'top';
      var tx = isRtl ? (areaLeft + areaWidth * 0.92) : (areaLeft + areaWidth * 0.08);
      var ty = H * 0.34;
      var maxW = areaWidth * 0.84;
      var sSize = Math.round(clamp(Math.min(W, H) * 0.052, 20, 56));
      ctx.font = fontObj.weight + ' ' + sSize + 'px ' + fontObj.css;
      if (hl) {
        var words = hl.split(/\s+/);
        var line = '';
        var ly = ty;
        for (var i = 0; i < words.length; i++) {
          var test = line ? (line + ' ' + words[i]) : words[i];
          if (ctx.measureText(test).width > maxW && line) {
            ctx.fillText(line, tx, ly);
            line = words[i];
            ly += sSize * 1.15;
          } else {
            line = test;
          }
        }
        if (line) {
          ctx.fillText(line, tx, ly);
          ly += sSize * 1.25;
        }
        if (sub) {
          ctx.globalAlpha = 0.78;
          ctx.font = '600 ' + Math.round(sSize * 0.48) + 'px ' + fontObj.css;
          ctx.fillText(sub, tx, ly, maxW);
        }
      } else if (sub) {
        ctx.font = '600 ' + Math.round(sSize * 0.52) + 'px ' + fontObj.css;
        ctx.fillText(sub, tx, ty, maxW);
      }
    }
    ctx.restore();
  }

  /* ----- Master Composite Renderer ----- */
  function renderMockupToCanvas(targetCanvas, targetW, targetH) {
    if (!targetCanvas) return;
    if (targetCanvas.width !== targetW || targetCanvas.height !== targetH) {
      targetCanvas.width = targetW;
      targetCanvas.height = targetH;
    }
    var ctx = targetCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ensureDemoArtCanvases();
    renderStudioBackground(ctx, targetW, targetH);

    var src1 = state.design1Img || slot1DemoCanvas;
    var src2 = state.design2Img || slot2DemoCanvas;
    var slot1 = getSlotDimensions(state.templateId, 1);
    var slot2 = getSlotDimensions(state.templateId, 2);
    renderDesignIntoBuffer(slotRenderCanvas, slot1.w, slot1.h, src1, slot1.bgFallback);
    renderDesignIntoBuffer(slot2RenderCanvas, slot2.w, slot2.h, src2, slot2.bgFallback, state.design2Img ? undefined : 'cover');

    /* Reserve stage space when Top or Side Marketing Headline is active */
    var hasText = (state.headlinePos !== 'none') && Boolean((state.headline || '').trim() || (state.subline || '').trim());
    var stageX = 0, stageY = 0, stageW = targetW, stageH = targetH;
    if (hasText && state.headlinePos === 'top') {
      var topPad = targetH * 0.21;
      stageY = topPad;
      stageH = targetH - topPad;
    } else if (hasText && state.headlinePos === 'side') {
      var sideW = targetW * 0.38;
      var isRtl = document.documentElement.getAttribute('dir') === 'rtl';
      if (isRtl) {
        stageX = 0;
        stageW = targetW - sideW;
        drawHeadlineOverlay(ctx, targetW, targetH, 0, targetW - sideW, sideW, targetH);
      } else {
        stageX = sideW;
        stageW = targetW - sideW;
        drawHeadlineOverlay(ctx, targetW, targetH, 0, 0, sideW, targetH);
      }
    }
    if (hasText && state.headlinePos === 'top') {
      drawHeadlineOverlay(ctx, targetW, targetH, targetH * 0.21, 0, targetW, targetH);
    }

    var cx = stageX + stageW * 0.5;
    var cy = stageY + stageH * 0.5;
    var fit = Math.min(stageW * 0.84, stageH * 0.86);
    var tplId = state.templateId;

    if (tplId === 'iphone16' || tplId === 's24ultra' || tplId === 'frameless_phone') {
      drawPhoneDevice(ctx, cx, cy, Math.min(stageH * 0.86, stageW * 1.4), tplId, slotRenderCanvas);
    } else if (tplId === 'iso_phone') {
      drawIsoPhone(ctx, cx, cy, Math.min(stageH * 0.88, stageW * 0.96), slotRenderCanvas);
    } else if (tplId === 'watch_ultra') {
      drawWatchUltra(ctx, cx, cy, Math.min(stageH * 0.86, stageW * 0.96), slotRenderCanvas);
    } else if (tplId === 'ipad_portrait') {
      drawTabletDevice(ctx, cx, cy, Math.min(stageH * 0.86, stageW * 0.95), false, slotRenderCanvas);
    } else if (tplId === 'ipad_landscape') {
      drawTabletDevice(ctx, cx, cy, Math.min(stageW * 0.86, stageH * 0.98), true, slotRenderCanvas);
    } else if (tplId === 'macbook_pro') {
      drawLaptopDevice(ctx, cx, cy, Math.min(stageW * 0.86, stageH * 1.25), true, slotRenderCanvas);
    } else if (tplId === 'macbook_air') {
      drawLaptopDevice(ctx, cx, cy, Math.min(stageW * 0.86, stageH * 1.25), false, slotRenderCanvas);
    } else if (tplId === 'studio_display') {
      drawStudioDisplay(ctx, cx, cy, Math.min(stageW * 0.84, stageH * 1.1), slotRenderCanvas);
    } else if (tplId === 'browser_light') {
      drawBrowserWindow(ctx, cx, cy, Math.min(stageW * 0.86, stageH * 1.22), false, slotRenderCanvas);
    } else if (tplId === 'browser_dark') {
      drawBrowserWindow(ctx, cx, cy, Math.min(stageW * 0.86, stageH * 1.22), true, slotRenderCanvas);
    } else if (tplId === 'mb_iphone') {
      var lapW = Math.min(stageW * 0.72, stageH * 1.05);
      drawLaptopDevice(ctx, cx - stageW * 0.08, cy, lapW, true, slotRenderCanvas);
      drawPhoneDevice(ctx, cx + lapW * 0.34, cy + lapW * 0.08, lapW * 0.56, 'iphone16', slot2RenderCanvas);
    } else if (tplId === 'dual_phones') {
      var ph = Math.min(stageH * 0.80, stageW * 0.88);
      drawPhoneDevice(ctx, cx - ph * 0.24, cy - ph * 0.04, ph * 0.92, 'iphone16', slotRenderCanvas);
      drawPhoneDevice(ctx, cx + ph * 0.22, cy + ph * 0.04, ph * 0.98, 'iphone16', slot2RenderCanvas);
    } else if (tplId === 'oak_frame') {
      drawWallFrame(ctx, cx, cy, stageW, stageH, 'oak', slotRenderCanvas);
    } else if (tplId === 'black_frame') {
      drawWallFrame(ctx, cx, cy, stageW, stageH, 'black', slotRenderCanvas);
    } else if (tplId === 'gold_frame') {
      drawWallFrame(ctx, cx, cy, stageW, stageH, 'gold', slotRenderCanvas);
    } else if (tplId === 'canvas_wrap') {
      drawWallFrame(ctx, cx, cy, stageW, stageH, 'canvas_wrap', slotRenderCanvas);
    } else if (tplId === 'wall_poster') {
      drawWallFrame(ctx, cx, cy, stageW, stageH, 'poster', slotRenderCanvas);
    } else if (tplId === 'hardcover_book') {
      drawHardcoverBook(ctx, cx, cy, fit, slotRenderCanvas);
    } else if (tplId === 'open_magazine') {
      drawOpenMagazine(ctx, cx, cy, Math.min(stageW * 0.88, stageH * 1.15), slotRenderCanvas);
    } else if (tplId === 'business_card') {
      drawBusinessCard(ctx, cx, cy, Math.min(stageW * 0.84, stageH * 1.15), slotRenderCanvas);
    } else if (tplId === 'coffee_mug') {
      drawCoffeeMug(ctx, cx, cy, Math.min(stageW, stageH) * 0.88, slotRenderCanvas);
    } else if (tplId === 'paper_cup') {
      drawPaperCup(ctx, cx, cy, Math.min(stageW, stageH) * 0.88, slotRenderCanvas);
    } else if (tplId === 'tshirt') {
      drawApparel(ctx, cx, cy, fit, false, slotRenderCanvas);
    } else if (tplId === 'hoodie') {
      drawApparel(ctx, cx, cy, fit, true, slotRenderCanvas);
    } else if (tplId === 'polo_shirt') {
      drawPoloShirt(ctx, cx, cy, fit, slotRenderCanvas);
    } else if (tplId === 'tote_bag') {
      drawToteOrKraftBag(ctx, cx, cy, fit, false, slotRenderCanvas);
    } else if (tplId === 'kraft_bag') {
      drawToteOrKraftBag(ctx, cx, cy, fit, true, slotRenderCanvas);
    } else if (tplId === 'product_box') {
      drawProductBox(ctx, cx, cy, fit, slotRenderCanvas);
    } else if (tplId === 'storefront_sign') {
      drawStorefrontSign(ctx, cx, cy, Math.min(stageW * 0.88, stageH * 1.65), slotRenderCanvas);
    } else if (tplId === 'blade_sign') {
      drawBladeSign(ctx, cx, cy, Math.min(stageW, stageH) * 0.92, slotRenderCanvas);
    } else if (tplId === 'glass_storefront') {
      drawGlassStorefront(ctx, cx, cy, Math.min(stageW, stageH) * 0.94, slotRenderCanvas);
    }
  }

  function renderPreview() {
    var asp = ASPECT_SPECS[state.aspect] || ASPECT_SPECS['16:9'];
    renderMockupToCanvas(msPreviewCanvas, asp.w, asp.h);
    if (state.isPeeking && msPeekCanvas) {
      ensureDemoArtCanvases();
      var src = state.design1Img || slot1DemoCanvas;
      var sw = src.naturalWidth || src.width || 600;
      var sh = src.naturalHeight || src.height || 600;
      var sc = Math.min(asp.w / sw, asp.h / sh);
      msPeekCanvas.width = asp.w;
      msPeekCanvas.height = asp.h;
      var pctx = msPeekCanvas.getContext('2d');
      pctx.clearRect(0, 0, asp.w, asp.h);
      pctx.drawImage(src, (asp.w - sw * sc) * 0.5, (asp.h - sh * sc) * 0.5, sw * sc, sh * sc);
    }
  }

  function scheduleRender() {
    if (renderRaf) return;
    renderRaf = requestAnimationFrame(function () {
      renderRaf = 0;
      renderPreview();
    });
  }

  /* ----- Dynamic UI Builders (Zero innerHTML) ----- */
  function createTplMiniSvg(iconKind) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '15');
    svg.setAttribute('height', '15');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    var d = 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z';
    if (iconKind === 'laptop' || iconKind === 'monitor' || iconKind === 'browser') {
      d = 'M3 5h18v12H3z M2 20h20';
    } else if (iconKind === 'watch') {
      d = 'M9 3h6v3H9z M7 6h10v12H7z M9 18h6v3H9z';
    } else if (iconKind === 'frame' || iconKind === 'card') {
      d = 'M4 4h16v16H4z M8 8h8v8H8z';
    } else if (iconKind === 'book') {
      d = 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z';
    } else if (iconKind === 'mug') {
      d = 'M5 6h11v12a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6z M16 8h2a3 3 0 0 1 0 6h-2';
    } else if (iconKind === 'shirt' || iconKind === 'bag') {
      d = 'M6 4l3-2h6l3 2 3 4-3 2v10H6V10L3 8z';
    } else if (iconKind === 'box' || iconKind === 'sign') {
      d = 'M3 7l9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7';
    } else if (iconKind === 'dual') {
      d = 'M2 5h12v10H2z M15 8h7v12h-7z';
    }
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
    return svg;
  }

  function renderTemplateGrid() {
    if (!msTemplateGrid) return;
    while (msTemplateGrid.firstChild) msTemplateGrid.removeChild(msTemplateGrid.firstChild);

    TEMPLATES.filter(function (tpl) {
      return state.tplCat === 'all' || tpl.cat === state.tplCat;
    }).forEach(function (tpl) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ms-tpl-card' + (state.templateId === tpl.id ? ' active' : '');
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', state.templateId === tpl.id ? 'true' : 'false');

      var thumb = document.createElement('span');
      thumb.className = 'ms-tpl-thumb';
      thumb.appendChild(createTplMiniSvg(tpl.icon));

      var meta = document.createElement('span');
      meta.className = 'ms-tpl-meta';

      var nameEl = document.createElement('span');
      nameEl.className = 'ms-tpl-name';
      nameEl.textContent = t(tpl.key);

      meta.appendChild(nameEl);
      if (tpl.dual) {
        var subEl = document.createElement('span');
        subEl.className = 'ms-tpl-sub';
        subEl.textContent = t('ms_dual_tag');
        meta.appendChild(subEl);
      }

      btn.appendChild(thumb);
      btn.appendChild(meta);

      btn.addEventListener('click', function () {
        if (state.templateId === tpl.id) return;
        pushUndo();
        state.templateId = tpl.id;
        state.productColor = tpl.swatches[0] || '#1E293B';
        state.panX = 0;
        state.panY = 0;
        state.zoomPct = 100;
        state.rotDeg = 0;
        state.fitMode = computeSmartFitMode(tpl.id, state.design1Img);
        state.autoFitActive = true;
        syncAllUI();
        scheduleRender();
      });

      msTemplateGrid.appendChild(btn);
    });
  }

  function renderProductSwatches() {
    if (!msColorSwatches) return;
    while (msColorSwatches.firstChild) msColorSwatches.removeChild(msColorSwatches.firstChild);
    var tpl = getTemplateObj(state.templateId);
    tpl.swatches.forEach(function (hex) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ms-swatch-btn' + (sanitizeHex(state.productColor) === sanitizeHex(hex) ? ' active' : '');
      btn.style.backgroundColor = hex;
      btn.setAttribute('aria-label', hex);
      btn.addEventListener('click', function () {
        pushUndo();
        state.productColor = sanitizeHex(hex);
        syncAllUI();
        scheduleRender();
      });
      msColorSwatches.appendChild(btn);
    });
  }

  function renderBgGrid() {
    if (!msBgGrid) return;
    while (msBgGrid.firstChild) msBgGrid.removeChild(msBgGrid.firstChild);

    BACKGROUNDS.filter(function (bg) {
      return state.bgCat === 'all' || bg.cat === state.bgCat;
    }).forEach(function (bg) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ms-bg-item' + (!state.transparentBg && !state.customBgImg && state.bgId === bg.id ? ' active' : '');
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', (!state.transparentBg && !state.customBgImg && state.bgId === bg.id) ? 'true' : 'false');

      var sw = document.createElement('span');
      sw.className = 'ms-bg-swatch';
      if (bg.c3) {
        sw.style.background = 'linear-gradient(135deg, ' + bg.c1 + ', ' + bg.c2 + ', ' + bg.c3 + ')';
      } else if (bg.c2) {
        sw.style.background = 'linear-gradient(180deg, ' + bg.c1 + ', ' + bg.c2 + ')';
      } else {
        sw.style.backgroundColor = bg.c1;
      }

      var lbl = document.createElement('span');
      lbl.className = 'ms-bg-name';
      lbl.textContent = t(bg.key);

      btn.appendChild(sw);
      btn.appendChild(lbl);

      btn.addEventListener('click', function () {
        pushUndo();
        state.bgId = bg.id;
        state.transparentBg = false;
        state.customBgImg = null;
        if (bg.dark && sanitizeHex(state.textColor) === '#0F172A') {
          state.textColor = '#F8FAFC';
        } else if (!bg.dark && sanitizeHex(state.textColor) === '#F8FAFC') {
          state.textColor = '#0F172A';
        }
        syncAllUI();
        scheduleRender();
      });

      msBgGrid.appendChild(btn);
    });
  }

  function renderFontModalList() {
    if (!msFontList) return;
    while (msFontList.firstChild) msFontList.removeChild(msFontList.firstChild);
    [{ key: 'ar', label: 'ms_fonts_ar' }, { key: 'en', label: 'ms_fonts_en' }].forEach(function (grp) {
      var hdr = document.createElement('div');
      hdr.className = 'ms-font-group-title';
      hdr.textContent = t(grp.label);
      msFontList.appendChild(hdr);

      var grid = document.createElement('div');
      grid.className = 'ms-font-grid';
      FONT_LIBRARY.filter(function (f) { return f.group === grp.key; }).forEach(function (f) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ms-font-card' + (state.fontId === f.id ? ' active' : '');

        var sample = document.createElement('span');
        sample.className = 'ms-font-card-sample';
        sample.style.fontFamily = f.css;
        sample.style.fontWeight = f.weight;
        sample.textContent = f.sample;

        var nm = document.createElement('span');
        nm.className = 'ms-font-card-name';
        nm.textContent = f.label;

        btn.appendChild(sample);
        btn.appendChild(nm);
        btn.addEventListener('click', function () {
          pushUndo();
          state.fontId = f.id;
          ensureFontLoaded(f);
          if (msFontName) msFontName.textContent = f.label;
          closeFontModal();
          scheduleRender();
        });
        grid.appendChild(btn);
      });
      msFontList.appendChild(grid);
    });
  }

  function syncAllUI() {
    var tpl = getTemplateObj(state.templateId);
    var asp = ASPECT_SPECS[state.aspect] || ASPECT_SPECS['16:9'];
    var outW = Math.min(3000, asp.w * state.exportScale);
    var outH = Math.min(3000, asp.h * state.exportScale);

    if (msActiveTplLabel) {
      msActiveTplLabel.setAttribute('data-i18n', tpl.key);
      msActiveTplLabel.textContent = t(tpl.key);
    }
    if (msSpecMeta) {
      msSpecMeta.textContent = asp.id + ' · ' + outW + ' × ' + outH + ' px';
    }
    if (msExportSummary) {
      var transTxt = state.transparentBg ? (' · ' + t('ms_btn_trans_short')) : '';
      msExportSummary.textContent = outW + ' × ' + outH + ' px (' + state.exportScale + 'x)' + transTxt;
    }

    aspectBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-aspect') === state.aspect);
    });
    if (btnQuickTransparent) {
      btnQuickTransparent.classList.toggle('is-on', state.transparentBg);
      btnQuickTransparent.setAttribute('aria-pressed', state.transparentBg ? 'true' : 'false');
    }
    if (btnToggleTransparent) {
      btnToggleTransparent.classList.toggle('btn-primary', state.transparentBg);
      btnToggleTransparent.classList.toggle('btn-secondary', !state.transparentBg);
    }

    tplCatBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-cat') === state.tplCat);
    });
    bgCatBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-bgcat') === state.bgCat);
    });
    fitModeBtns.forEach(function (b) {
      var active = b.getAttribute('data-fit') === state.fitMode;
      b.classList.toggle('active', active);
      b.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    if (msFitModeBadge) {
      msFitModeBadge.classList.toggle('hide', !state.autoFitActive);
    }
    if (msOrientationGroup) {
      msOrientationGroup.classList.toggle('hide', !isOrientableFrame(state.templateId));
    }
    orientBtns.forEach(function (b) {
      var active = b.getAttribute('data-orient') === state.frameOrientation;
      b.classList.toggle('active', active);
      b.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    hPosBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-hpos') === state.headlinePos);
    });
    scaleBtns.forEach(function (b) {
      b.classList.toggle('active', parseInt(b.getAttribute('data-scale'), 10) === state.exportScale);
    });

    if (msCanvasWrap) msCanvasWrap.classList.toggle('is-transparent', Boolean(state.transparentBg));
    if (msSlot2Box) msSlot2Box.classList.toggle('hide', !tpl.dual);
    if (btnClearDesign1) btnClearDesign1.classList.toggle('hide', !state.design1Img);
    if (btnUseDemoArt) btnUseDemoArt.classList.toggle('hide', !state.design1Img);
    if (msAiRow) msAiRow.classList.toggle('hide', !state.design1OriginalImg);
    if (btnAiRemoveBg) btnAiRemoveBg.disabled = Boolean(state.aiBusy || state.design1IsCutout);
    if (btnAiRestoreOrig) btnAiRestoreOrig.classList.toggle('hide', !(state.design1IsCutout && state.design1OriginalImg));
    if (msAiOverlay) msAiOverlay.classList.toggle('hide', !state.aiBusy);
    if (btnClearDesign2) btnClearDesign2.classList.toggle('hide', !state.design2Img);
    if (btnClearCustomBg) btnClearCustomBg.classList.toggle('hide', !state.customBgImg);

    if (msDesignZoom) msDesignZoom.value = String(state.zoomPct);
    if (msDesignZoomVal) msDesignZoomVal.textContent = state.zoomPct + '%';
    if (msPanX) msPanX.value = String(state.panX);
    if (msPanXVal) msPanXVal.textContent = state.panX + '%';
    if (msPanY) msPanY.value = String(state.panY);
    if (msPanYVal) msPanYVal.textContent = state.panY + '%';
    if (msDesignRot) msDesignRot.value = String(state.rotDeg);
    if (msDesignRotVal) msDesignRotVal.textContent = state.rotDeg + '°';

    if (msProductColorPicker) msProductColorPicker.value = sanitizeHex(state.productColor, '#B8B3AA');
    if (msShadowIntensity) msShadowIntensity.value = String(state.shadowIntensity);
    if (msShadowVal) msShadowVal.textContent = state.shadowIntensity + '%';
    if (msSheenToggle) msSheenToggle.checked = Boolean(state.sheenEnabled);
    if (msSheenIntensity) msSheenIntensity.value = String(state.sheenIntensity);
    if (msSheenVal) msSheenVal.textContent = state.sheenIntensity + '%';

    var fontObj = getFontObj(state.fontId);
    if (msFontName) msFontName.textContent = fontObj.label;
    if (msTextColor) msTextColor.value = sanitizeHex(state.textColor, '#0F172A');

    renderTemplateGrid();
    renderProductSwatches();
    renderBgGrid();
    syncUndoButtons();
  }

  /* ----- Modals & Export ----- */
  function openFontModal() {
    renderFontModalList();
    if (msFontModal) msFontModal.classList.remove('hide');
  }
  function closeFontModal() {
    if (msFontModal) msFontModal.classList.add('hide');
  }
  function openExportModal() {
    syncAllUI();
    if (msExportModal) msExportModal.classList.remove('hide');
  }
  function closeExportModal() {
    if (msExportModal) msExportModal.classList.add('hide');
  }

  function handleExport(format) {
    var asp = ASPECT_SPECS[state.aspect] || ASPECT_SPECS['16:9'];
    var rawW = asp.w * state.exportScale;
    var rawH = asp.h * state.exportScale;
    var scaleDown = Math.max(rawW, rawH) > 3000 ? (3000 / Math.max(rawW, rawH)) : 1;
    var outW = Math.round(rawW * scaleDown);
    var outH = Math.round(rawH * scaleDown);

    var outCanvas = document.createElement('canvas');
    try {
      var prevTransparent = state.transparentBg;
      if (format === 'jpg' && state.transparentBg) {
        state.transparentBg = false;
      }
      renderMockupToCanvas(outCanvas, outW, outH);
      state.transparentBg = prevTransparent;

      var mime = format === 'png' ? 'image/png' : 'image/jpeg';
      var ext = format === 'png' ? 'png' : 'jpg';
      var fname = sanitizeFilenameBase(state.design1Name) + '-imgsfix-' + state.templateId + '-' + outW + 'x' + outH + '.' + ext;

      outCanvas.toBlob(function (blob) {
        cleanupCanvas(outCanvas);
        if (!blob) {
          toast(t('ms_export_err'), 'err');
          return;
        }
        if (typeof I.triggerDownload === 'function') {
          I.triggerDownload(blob, fname);
        } else {
          var u = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = u;
          a.download = fname;
          document.body.appendChild(a);
          a.click();
          setTimeout(function () {
            if (a.parentNode) a.parentNode.removeChild(a);
            try { URL.revokeObjectURL(u); } catch (_e) {}
          }, 2500);
        }
        toast(t('ms_export_ok'), 'ok');
      }, mime, format === 'png' ? 1.0 : 0.95);
    } catch (err) {
      cleanupCanvas(outCanvas);
      console.error('Mockup export error:', err);
      toast(t('ms_export_err'), 'err');
    }
  }

  /* ----- Design Actions & Peek ----- */
  function centerDesign() {
    pushUndo();
    state.panX = 0;
    state.panY = 0;
    syncAllUI();
    scheduleRender();
  }

  function resetPlacement() {
    pushUndo();
    state.panX = 0;
    state.panY = 0;
    state.zoomPct = 100;
    state.rotDeg = 0;
    state.fitMode = computeSmartFitMode(state.templateId, state.design1Img);
    state.autoFitActive = true;
    syncAllUI();
    scheduleRender();
  }

  function setPeek(active) {
    state.isPeeking = active;
    if (msPeekCanvas) msPeekCanvas.classList.toggle('hide', !active);
    scheduleRender();
  }

  /* ----- AI Background Removal (@imgly/background-removal) ----- */
  async function detectPreferredDevice() {
    try {
      if (typeof navigator !== 'undefined' && navigator.gpu && typeof navigator.gpu.requestAdapter === 'function') {
        var adapter = await navigator.gpu.requestAdapter();
        if (adapter) return 'gpu';
      }
    } catch (_err) {}
    return 'cpu';
  }

  function getImglyConfig(device) {
    return {
      model: 'isnet_fp16',
      device: device || activeDevice,
      proxyToWorker: false,
      rescale: true,
      fetchArgs: { cache: 'force-cache' },
      output: { format: 'image/png', quality: 1.0 },
    };
  }

  function startSilentPreload() {
    if (preloadPromise) return preloadPromise;
    preloadPromise = (async function () {
      activeDevice = await detectPreferredDevice();
      try {
        await preload(getImglyConfig(activeDevice));
      } catch (_gpuErr) {
        if (activeDevice === 'gpu') {
          activeDevice = 'cpu';
          await preload(getImglyConfig('cpu'));
        }
      }
    })().catch(function () {
      preloadPromise = null;
    });
    return preloadPromise;
  }

  function decodeBlobToImage(blob) {
    return new Promise(function (resolve, reject) {
      var tempUrl = URL.createObjectURL(blob);
      activeObjectUrls.add(tempUrl);
      var img = new Image();
      img.onload = function () {
        revokeUrl(tempUrl);
        resolve(img);
      };
      img.onerror = function () {
        revokeUrl(tempUrl);
        reject(new Error('Failed to decode AI output'));
      };
      img.src = tempUrl;
    });
  }

  function imgToPngBlob(img) {
    return new Promise(function (resolve, reject) {
      var w = img.naturalWidth || img.width || 512;
      var h = img.naturalHeight || img.height || 512;
      var maxSide = 2048;
      var scale = Math.max(w, h) > maxSide ? (maxSide / Math.max(w, h)) : 1;
      var cw = Math.max(1, Math.round(w * scale));
      var ch = Math.max(1, Math.round(h * scale));
      var tmp = document.createElement('canvas');
      tmp.width = cw;
      tmp.height = ch;
      try {
        var ctx = tmp.getContext('2d');
        ctx.drawImage(img, 0, 0, cw, ch);
        tmp.toBlob(function (blob) {
          cleanupCanvas(tmp);
          if (blob) resolve(blob);
          else reject(new Error('Canvas encode error'));
        }, 'image/png', 1.0);
      } catch (err) {
        cleanupCanvas(tmp);
        reject(err);
      }
    });
  }

  async function runAiCutout() {
    if (state.aiBusy || !state.design1OriginalImg) return;
    if (state.design1AiImg) {
      pushUndo();
      state.design1Img = state.design1AiImg;
      state.design1IsCutout = true;
      syncAllUI();
      scheduleRender();
      toast(t('ms_ai_done'), 'ok');
      return;
    }

    var startGen = state.loadGen1;
    state.aiBusy = true;
    if (msAiStatusText) msAiStatusText.textContent = t('ms_ai_wait');
    syncAllUI();

    try {
      activeDevice = await detectPreferredDevice();
      var srcBlob = (state.design1File && state.design1File.type && state.design1File.type !== 'image/svg+xml')
        ? state.design1File
        : await imgToPngBlob(state.design1OriginalImg);

      var outBlob;
      try {
        outBlob = await removeBackground(srcBlob, getImglyConfig(activeDevice));
      } catch (_gpuErr) {
        if (activeDevice === 'gpu') {
          activeDevice = 'cpu';
          outBlob = await removeBackground(srcBlob, getImglyConfig('cpu'));
        } else {
          throw _gpuErr;
        }
      }

      if (startGen !== state.loadGen1) return;
      var cutoutImg = await decodeBlobToImage(outBlob);
      if (startGen !== state.loadGen1) return;

      pushUndo();
      state.design1AiImg = cutoutImg;
      state.design1Img = cutoutImg;
      state.design1IsCutout = true;
      toast(t('ms_ai_done'), 'ok');
    } catch (err) {
      console.error('Mockup Studio AI cutout error:', err);
      toast(t('ms_ai_err'), 'err');
    } finally {
      state.aiBusy = false;
      syncAllUI();
      scheduleRender();
    }
  }

  function restoreOriginalArt() {
    if (!state.design1OriginalImg || !state.design1IsCutout) return;
    pushUndo();
    state.design1Img = state.design1OriginalImg;
    state.design1IsCutout = false;
    syncAllUI();
    scheduleRender();
    toast(t('ms_ai_restored'), 'ok');
  }

  function applyDesign1File(file) {
    loadSafeImageFile(file, 'loadGen1', function (img) {
      pushUndo();
      state.design1Img = img;
      state.design1OriginalImg = img;
      state.design1AiImg = null;
      state.design1File = file;
      state.design1IsCutout = false;
      state.design1Name = sanitizeFilenameBase(file.name);
      state.panX = 0;
      state.panY = 0;
      state.zoomPct = 100;
      state.rotDeg = 0;
      state.fitMode = computeSmartFitMode(state.templateId, img);
      state.autoFitActive = true;
      syncAllUI();
      scheduleRender();
      startSilentPreload();
      toast(t('ms_loaded_ok'), 'ok');
    });
  }

  /* ----- Event Wiring ----- */
  dockTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.getAttribute('data-tab');
      dockTabs.forEach(function (tb) {
        var active = tb === tab;
        tb.classList.toggle('active', active);
        tb.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      dockPanes.forEach(function (pane) {
        pane.classList.toggle('active', pane.getAttribute('data-pane') === target);
      });
    });
  });

  aspectBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var asp = btn.getAttribute('data-aspect');
      if (!asp || state.aspect === asp) return;
      pushUndo();
      state.aspect = asp;
      syncAllUI();
      scheduleRender();
    });
  });

  function toggleTransparentBg() {
    pushUndo();
    state.transparentBg = !state.transparentBg;
    if (state.transparentBg) state.customBgImg = null;
    syncAllUI();
    scheduleRender();
  }
  if (btnQuickTransparent) btnQuickTransparent.addEventListener('click', toggleTransparentBg);
  if (btnToggleTransparent) btnToggleTransparent.addEventListener('click', toggleTransparentBg);

  tplCatBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cat = btn.getAttribute('data-cat');
      if (!cat || state.tplCat === cat) return;
      state.tplCat = cat;
      syncAllUI();
    });
  });

  bgCatBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cat = btn.getAttribute('data-bgcat');
      if (!cat || state.bgCat === cat) return;
      state.bgCat = cat;
      syncAllUI();
    });
  });

  /* Upload Buttons & Drag/Drop & Clipboard Ctrl+V */
  [btnTopUpload, btnDockUpload, btnMqUpload].forEach(function (b) {
    if (b && msDesignInput) b.addEventListener('click', function () { msDesignInput.click(); });
  });
  if (msDesignInput) {
    msDesignInput.addEventListener('change', function () {
      if (msDesignInput.files && msDesignInput.files[0]) applyDesign1File(msDesignInput.files[0]);
      msDesignInput.value = '';
    });
  }
  if (btnDockUpload2 && msDesign2Input) {
    btnDockUpload2.addEventListener('click', function () { msDesign2Input.click(); });
    msDesign2Input.addEventListener('change', function () {
      if (msDesign2Input.files && msDesign2Input.files[0]) {
        var f = msDesign2Input.files[0];
        loadSafeImageFile(f, 'loadGen2', function (img) {
          state.design2Img = img;
          syncAllUI();
          scheduleRender();
          toast(t('ms_loaded_ok'), 'ok');
        });
      }
      msDesign2Input.value = '';
    });
  }
  if (btnUploadCustomBg && msCustomBgInput) {
    btnUploadCustomBg.addEventListener('click', function () { msCustomBgInput.click(); });
    msCustomBgInput.addEventListener('change', function () {
      if (msCustomBgInput.files && msCustomBgInput.files[0]) {
        loadSafeImageFile(msCustomBgInput.files[0], 'loadGenBg', function (img) {
          pushUndo();
          state.customBgImg = img;
          state.transparentBg = false;
          syncAllUI();
          scheduleRender();
        });
      }
      msCustomBgInput.value = '';
    });
  }

  function clearDesign1() {
    pushUndo();
    state.loadGen1++;
    state.aiBusy = false;
    state.design1Img = null;
    state.design1OriginalImg = null;
    state.design1AiImg = null;
    state.design1File = null;
    state.design1IsCutout = false;
    state.design1Name = 'mockup-showcase';
    state.panX = 0;
    state.panY = 0;
    state.zoomPct = 100;
    state.rotDeg = 0;
    state.fitMode = computeSmartFitMode(state.templateId, null);
    state.autoFitActive = true;
    syncAllUI();
    scheduleRender();
  }
  if (btnClearDesign1) btnClearDesign1.addEventListener('click', clearDesign1);
  if (btnUseDemoArt) btnUseDemoArt.addEventListener('click', clearDesign1);
  if (btnAiRemoveBg) btnAiRemoveBg.addEventListener('click', runAiCutout);
  if (btnAiRestoreOrig) btnAiRestoreOrig.addEventListener('click', restoreOriginalArt);
  if (btnClearDesign2) {
    btnClearDesign2.addEventListener('click', function () {
      state.loadGen2++;
      state.design2Img = null;
      syncAllUI();
      scheduleRender();
    });
  }
  if (btnClearCustomBg) {
    btnClearCustomBg.addEventListener('click', function () {
      state.loadGenBg++;
      state.customBgImg = null;
      syncAllUI();
      scheduleRender();
    });
  }

  if (msViewport) {
    msViewport.addEventListener('dragover', function (e) {
      e.preventDefault();
      msViewport.classList.add('is-dragover');
    });
    msViewport.addEventListener('dragleave', function () {
      msViewport.classList.remove('is-dragover');
    });
    msViewport.addEventListener('drop', function (e) {
      e.preventDefault();
      msViewport.classList.remove('is-dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        applyDesign1File(e.dataTransfer.files[0]);
      }
    });
  }

  document.addEventListener('paste', function (e) {
    var items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf('image/') === 0) {
        var f = items[i].getAsFile();
        if (f) {
          applyDesign1File(f);
          break;
        }
      }
    }
  });

  /* Canvas Interactive Pan & Pinch-Zoom & Wheel */
  if (msCanvasWrap) {
    msCanvasWrap.addEventListener('pointerdown', function (e) {
      msCanvasWrap.setPointerCapture(e.pointerId);
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragUndoPushed = false;
      if (activePointers.size === 2) {
        isPanning = false;
        var pts = Array.from(activePointers.values());
        pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        pinchStartZoom = state.zoomPct;
        return;
      }
      isPanning = true;
      panStartClient = { x: e.clientX, y: e.clientY };
      panStartValues = { x: state.panX, y: state.panY };
    });
    msCanvasWrap.addEventListener('pointermove', function (e) {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointers.size === 2) {
        var pts = Array.from(activePointers.values());
        var dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        if (pinchStartDist > 0) {
          if (!dragUndoPushed) { pushUndo(); dragUndoPushed = true; }
          state.zoomPct = clamp(Math.round(pinchStartZoom * (dist / pinchStartDist)), 15, 250);
          if (msDesignZoom) msDesignZoom.value = String(state.zoomPct);
          if (msDesignZoomVal) msDesignZoomVal.textContent = state.zoomPct + '%';
          scheduleRender();
        }
        return;
      }
      if (!isPanning) return;
      var moveDist = Math.hypot(e.clientX - panStartClient.x, e.clientY - panStartClient.y);
      if (moveDist > 2 && !dragUndoPushed) {
        pushUndo();
        dragUndoPushed = true;
      }
      var rect = msCanvasWrap.getBoundingClientRect();
      var dxPct = ((e.clientX - panStartClient.x) / Math.max(120, rect.width)) * 180;
      var dyPct = ((e.clientY - panStartClient.y) / Math.max(120, rect.height)) * 180;
      state.panX = clamp(Math.round(panStartValues.x + dxPct), -100, 100);
      state.panY = clamp(Math.round(panStartValues.y + dyPct), -100, 100);
      if (msPanX) msPanX.value = String(state.panX);
      if (msPanXVal) msPanXVal.textContent = state.panX + '%';
      if (msPanY) msPanY.value = String(state.panY);
      if (msPanYVal) msPanYVal.textContent = state.panY + '%';
      scheduleRender();
    });
    ['pointerup', 'pointercancel'].forEach(function (evt) {
      msCanvasWrap.addEventListener(evt, function (e) {
        activePointers.delete(e.pointerId);
        if (activePointers.size < 2) pinchStartDist = 0;
        isPanning = false;
        dragUndoPushed = false;
      });
    });
    msCanvasWrap.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (!wheelUndoTimer) pushUndo();
      clearTimeout(wheelUndoTimer);
      wheelUndoTimer = setTimeout(function () { wheelUndoTimer = 0; }, 350);
      state.zoomPct = clamp(state.zoomPct + (e.deltaY < 0 ? 5 : -5), 15, 250);
      if (msDesignZoom) msDesignZoom.value = String(state.zoomPct);
      if (msDesignZoomVal) msDesignZoomVal.textContent = state.zoomPct + '%';
      scheduleRender();
    }, { passive: false });
  }

  /* Sliders & Controls */
  orientBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var orient = b.getAttribute('data-orient');
      if (!orient || state.frameOrientation === orient) return;
      pushUndo();
      state.frameOrientation = orient;
      if (state.autoFitActive) {
        state.fitMode = computeSmartFitMode(state.templateId, state.design1Img);
      }
      syncAllUI();
      scheduleRender();
    });
  });

  fitModeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var fit = b.getAttribute('data-fit');
      if (!fit || state.fitMode === fit) return;
      pushUndo();
      state.fitMode = fit;
      state.autoFitActive = false;
      syncAllUI();
      scheduleRender();
    });
  });

  function bindSlider(el, valEl, key, suffix) {
    if (!el) return;
    var pushed = false;
    el.addEventListener('input', function () {
      if (!pushed) { pushUndo(); pushed = true; }
      state[key] = parseInt(el.value, 10) || 0;
      if (valEl) valEl.textContent = state[key] + suffix;
      scheduleRender();
    });
    el.addEventListener('change', function () { pushed = false; });
  }
  bindSlider(msDesignZoom, msDesignZoomVal, 'zoomPct', '%');
  bindSlider(msPanX, msPanXVal, 'panX', '%');
  bindSlider(msPanY, msPanYVal, 'panY', '%');
  bindSlider(msDesignRot, msDesignRotVal, 'rotDeg', '°');
  bindSlider(msShadowIntensity, msShadowVal, 'shadowIntensity', '%');
  bindSlider(msSheenIntensity, msSheenVal, 'sheenIntensity', '%');

  if (msSheenToggle) {
    msSheenToggle.addEventListener('change', function () {
      pushUndo();
      state.sheenEnabled = Boolean(msSheenToggle.checked);
      scheduleRender();
    });
  }

  if (msProductColorPicker) {
    var prodColPushed = false;
    msProductColorPicker.addEventListener('input', function () {
      if (!prodColPushed) { pushUndo(); prodColPushed = true; }
      state.productColor = sanitizeHex(msProductColorPicker.value, '#B8B3AA');
      renderProductSwatches();
      scheduleRender();
    });
    msProductColorPicker.addEventListener('change', function () { prodColPushed = false; });
  }

  hPosBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var pos = b.getAttribute('data-hpos');
      if (!pos || state.headlinePos === pos) return;
      pushUndo();
      state.headlinePos = pos;
      syncAllUI();
      scheduleRender();
    });
  });
  if (msHeadlineInput) {
    msHeadlineInput.addEventListener('input', function () {
      state.headline = msHeadlineInput.value;
      if (state.headlinePos === 'none' && state.headline.trim()) {
        state.headlinePos = 'top';
        syncAllUI();
      }
      scheduleRender();
    });
  }
  if (msSublineInput) {
    msSublineInput.addEventListener('input', function () {
      state.subline = msSublineInput.value;
      scheduleRender();
    });
  }
  if (msTextColor) {
    msTextColor.addEventListener('input', function () {
      state.textColor = sanitizeHex(msTextColor.value, '#0F172A');
      scheduleRender();
    });
  }

  /* Stage Actions & Modals */
  if (btnStageCenter) btnStageCenter.addEventListener('click', centerDesign);
  if (btnMqCenter) btnMqCenter.addEventListener('click', centerDesign);
  if (btnDockCenter) btnDockCenter.addEventListener('click', centerDesign);
  if (btnResetDesign) btnResetDesign.addEventListener('click', resetPlacement);
  if (btnDockReset) btnDockReset.addEventListener('click', resetPlacement);
  if (btnStageUndo) btnStageUndo.addEventListener('click', handleUndo);
  if (btnMqUndo) btnMqUndo.addEventListener('click', handleUndo);
  if (btnStageRedo) btnStageRedo.addEventListener('click', handleRedo);

  if (btnStagePeek) {
    btnStagePeek.addEventListener('pointerdown', function () { setPeek(true); });
    btnStagePeek.addEventListener('pointerup', function () { setPeek(false); });
    btnStagePeek.addEventListener('pointerleave', function () { setPeek(false); });
    btnStagePeek.addEventListener('pointercancel', function () { setPeek(false); });
  }

  if (btnPickFont) btnPickFont.addEventListener('click', openFontModal);
  if (btnCloseFontModal) btnCloseFontModal.addEventListener('click', closeFontModal);
  if (msFontModal) msFontModal.addEventListener('click', function (e) { if (e.target === msFontModal) closeFontModal(); });

  if (btnOpenExportModal) btnOpenExportModal.addEventListener('click', openExportModal);
  if (btnMqExport) btnMqExport.addEventListener('click', openExportModal);
  if (btnCloseExportModal) btnCloseExportModal.addEventListener('click', closeExportModal);
  if (msExportModal) msExportModal.addEventListener('click', function (e) { if (e.target === msExportModal) closeExportModal(); });

  scaleBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.exportScale = clamp(parseInt(b.getAttribute('data-scale'), 10) || 2, 1, 3);
      syncAllUI();
    });
  });
  if (btnExportPng) btnExportPng.addEventListener('click', function () { handleExport('png'); });
  if (btnExportJpg) btnExportJpg.addEventListener('click', function () { handleExport('jpg'); });

  /* ----- Keyboard Shortcuts (Layout-Independent via e.code) ----- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeFontModal();
      closeExportModal();
      return;
    }

    var tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
    var isRange = tag === 'input' && e.target.type === 'range';
    var isTyping = (tag === 'input' && !isRange) || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable);
    if (isTyping) return;

    var mod = e.ctrlKey || e.metaKey;
    var lower = e.key ? e.key.toLowerCase() : '';
    var code = e.code || '';

    if (mod && (lower === 's' || code === 'KeyS')) {
      e.preventDefault();
      openExportModal();
      return;
    }
    if (mod && (lower === 'y' || code === 'KeyY' || (e.shiftKey && (lower === 'z' || code === 'KeyZ')))) {
      e.preventDefault();
      handleRedo();
      return;
    }
    if (mod && (lower === 'z' || code === 'KeyZ')) {
      e.preventDefault();
      handleUndo();
      return;
    }
    if (code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) setPeek(true);
      return;
    }
    if (!mod && (lower === 'c' || code === 'KeyC')) {
      e.preventDefault();
      centerDesign();
      return;
    }
    if (!mod) {
      var step = e.shiftKey ? 10 : 3;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); state.panX = clamp(state.panX - step, -100, 100); syncAllUI(); scheduleRender(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); state.panX = clamp(state.panX + step, -100, 100); syncAllUI(); scheduleRender(); return; }
      if (e.key === 'ArrowUp')    { e.preventDefault(); state.panY = clamp(state.panY - step, -100, 100); syncAllUI(); scheduleRender(); return; }
      if (e.key === 'ArrowDown')  { e.preventDefault(); state.panY = clamp(state.panY + step, -100, 100); syncAllUI(); scheduleRender(); return; }
      if (e.key === '+' || e.key === '=' || code === 'NumpadAdd') {
        e.preventDefault();
        state.zoomPct = clamp(state.zoomPct + 8, 15, 250);
        syncAllUI();
        scheduleRender();
        return;
      }
      if (e.key === '-' || code === 'NumpadSubtract') {
        e.preventDefault();
        state.zoomPct = clamp(state.zoomPct - 8, 15, 250);
        syncAllUI();
        scheduleRender();
      }
    }
  });

  document.addEventListener('keyup', function (e) {
    if ((e.code === 'Space' || e.key === ' ') && state.isPeeking) {
      setPeek(false);
    }
  });

  /* ----- Language & Memory Cleanup ----- */
  document.addEventListener('imgsfix:langchange', function () {
    syncDocumentMeta();
    syncAllUI();
    scheduleRender();
  });

  window.addEventListener('beforeunload', function () {
    revokeAllObjectUrls();
    cleanupCanvas(slot1DemoCanvas);
    cleanupCanvas(slot2DemoCanvas);
    cleanupCanvas(slotRenderCanvas);
    cleanupCanvas(slot2RenderCanvas);
    cleanupCanvas(msPreviewCanvas);
    cleanupCanvas(msPeekCanvas);
  });

  /* ----- Boot ----- */
  syncDocumentMeta();
  syncAllUI();
  renderPreview();
})();
