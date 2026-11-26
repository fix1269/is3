/* imgsfix — profile-picture.js
   100% client-side Avatar & Social Identity Studio (PFP Maker):
   - Local AI background removal (@imgly/background-removal, isnet_fp16, GPU->CPU fallback, silent preload)
   - Restore / Erase Edge Refine Brush with MAX_UNDO = 20 Undo/Redo history stack
   - 46 Curated Backdrops (12 Solids, 14 Gradients, 12 Halos/Patterns, 8 Smart Original Bokeh/Color-Pop & Scenes)
   - 6 Frame Mask Shapes + 18 Ring & Border Styles (including 3D Pop-Out Top Effect)
   - Curved Status Badges (#OPENTOWORK, #HIRING, Verified, Star, Custom) + Curved Ring Text (24 EN/AR Fonts)
   - Interactive Live Social Platform Preview (LinkedIn, Instagram/WhatsApp, X, YouTube, Discord)
   - 1080x1080 Transparent PNG, High-Quality JPG & 4-Platform Social Pack (.ZIP via jszip)
*/
'use strict';

import { removeBackground, preload } from '@imgly/background-removal';
import JSZip from 'jszip';

(function () {
  var I = window.imgsfix || {};
  var $ = I.$ || function (s, r) { return (r || document).querySelector(s); };
  var $$ = I.$$ || function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var t = I.t || function (k) { return k; };
  var toast = I.toast || function () {};

  /* ----- Constants ----- */
  var EXPORT_SIZE = 1080;
  var PREVIEW_SIZE = 640;
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

  /* Unified 24-Font Library (12 Arabic + 12 English) */
  var FONT_LIBRARY = [
    { id: 'cairo',      group: 'ar', label: 'Cairo',                family: 'Cairo',                weight: '900', css: '"Cairo", system-ui, sans-serif',              sample: 'مصمم مبدع' },
    { id: 'tajawal',    group: 'ar', label: 'Tajawal',              family: 'Tajawal',              weight: '800', css: '"Tajawal", "Cairo", sans-serif',              sample: 'مصمم مبدع' },
    { id: 'changa',     group: 'ar', label: 'Changa',               family: 'Changa',               weight: '800', css: '"Changa", "Cairo", sans-serif',               sample: 'مصمم مبدع' },
    { id: 'almarai',    group: 'ar', label: 'Almarai',              family: 'Almarai',              weight: '800', css: '"Almarai", "Cairo", sans-serif',              sample: 'مصمم مبدع' },
    { id: 'ibm_ar',     group: 'ar', label: 'IBM Plex Sans Arabic', family: 'IBM Plex Sans Arabic', weight: '700', css: '"IBM Plex Sans Arabic", "Cairo", sans-serif', sample: 'مصمم مبدع' },
    { id: 'readex',     group: 'ar', label: 'Readex Pro',           family: 'Readex Pro',           weight: '700', css: '"Readex Pro", "Cairo", sans-serif',           sample: 'مصمم مبدع' },
    { id: 'amiri',      group: 'ar', label: 'Amiri',                family: 'Amiri',                weight: '700', css: '"Amiri", Georgia, serif',                     sample: 'مصمم مبدع' },
    { id: 'aref_ruqaa', group: 'ar', label: 'Aref Ruqaa',           family: 'Aref Ruqaa',           weight: '700', css: '"Aref Ruqaa", "Amiri", serif',                sample: 'مصمم مبدع' },
    { id: 'lalezar',    group: 'ar', label: 'Lalezar',              family: 'Lalezar',              weight: '400', css: '"Lalezar", "Cairo", sans-serif',              sample: 'مصمم مبدع' },
    { id: 'reem_kufi',  group: 'ar', label: 'Reem Kufi',            family: 'Reem Kufi',            weight: '700', css: '"Reem Kufi", "Cairo", sans-serif',            sample: 'مصمم مبدع' },
    { id: 'el_messiri', group: 'ar', label: 'El Messiri',           family: 'El Messiri',           weight: '700', css: '"El Messiri", "Cairo", sans-serif',           sample: 'مصمم مبدع' },
    { id: 'lemonada',   group: 'ar', label: 'Lemonada',             family: 'Lemonada',             weight: '700', css: '"Lemonada", "Cairo", sans-serif',             sample: 'مصمم مبدع' },
    { id: 'impact',     group: 'en', label: 'Impact',           family: 'Impact',           weight: '900', css: 'Impact, "Arial Black", sans-serif',       sample: 'CREATIVE PRO' },
    { id: 'anton',      group: 'en', label: 'Anton',            family: 'Anton',            weight: '400', css: '"Anton", Impact, sans-serif',             sample: 'CREATIVE PRO' },
    { id: 'bebas',      group: 'en', label: 'Bebas Neue',       family: 'Bebas Neue',       weight: '400', css: '"Bebas Neue", Impact, sans-serif',        sample: 'CREATIVE PRO' },
    { id: 'montserrat', group: 'en', label: 'Montserrat',       family: 'Montserrat',       weight: '900', css: '"Montserrat", system-ui, sans-serif',     sample: 'CREATIVE PRO' },
    { id: 'oswald',     group: 'en', label: 'Oswald',           family: 'Oswald',           weight: '700', css: '"Oswald", Impact, sans-serif',            sample: 'CREATIVE PRO' },
    { id: 'poppins',    group: 'en', label: 'Poppins',          family: 'Poppins',          weight: '800', css: '"Poppins", system-ui, sans-serif',        sample: 'CREATIVE PRO' },
    { id: 'roboto',     group: 'en', label: 'Roboto',           family: 'Roboto',           weight: '900', css: '"Roboto", system-ui, sans-serif',         sample: 'CREATIVE PRO' },
    { id: 'luckiest',   group: 'en', label: 'Luckiest Guy',     family: 'Luckiest Guy',     weight: '400', css: '"Luckiest Guy", Impact, sans-serif',      sample: 'CREATIVE PRO' },
    { id: 'bangers',    group: 'en', label: 'Bangers',          family: 'Bangers',          weight: '400', css: '"Bangers", Impact, sans-serif',           sample: 'CREATIVE PRO' },
    { id: 'playfair',   group: 'en', label: 'Playfair Display', family: 'Playfair Display', weight: '900', css: '"Playfair Display", Georgia, serif',      sample: 'Creative Pro' },
    { id: 'pacifico',   group: 'en', label: 'Pacifico',         family: 'Pacifico',         weight: '400', css: '"Pacifico", Georgia, cursive',            sample: 'Creative Pro' },
    { id: 'marker',     group: 'en', label: 'Permanent Marker', family: 'Permanent Marker', weight: '400', css: '"Permanent Marker", Impact, cursive',     sample: 'CREATIVE PRO' },
  ];
  var loadedFonts = new Set();

  /* 46 Curated Backdrops (12 Solid + 14 Gradient + 12 Pattern + 8 Smart/Scenes) */
  var BG_PRESETS = [
    /* Category A — Studio Solid Colors (12) */
    { id: 'sol_white',    cat: 'solid', key: 'pfp_bg_sol_white',    colors: ['#FFFFFF'] },
    { id: 'sol_gray',     cat: 'solid', key: 'pfp_bg_sol_gray',     colors: ['#E5E7EB'] },
    { id: 'sol_blue',     cat: 'solid', key: 'pfp_bg_sol_blue',     colors: ['#1D4ED8'] },
    { id: 'sol_navy',     cat: 'solid', key: 'pfp_bg_sol_navy',     colors: ['#0F172A'] },
    { id: 'sol_mustard',  cat: 'solid', key: 'pfp_bg_sol_mustard',  colors: ['#D97706'] },
    { id: 'sol_emerald',  cat: 'solid', key: 'pfp_bg_sol_emerald',  colors: ['#059669'] },
    { id: 'sol_coral',    cat: 'solid', key: 'pfp_bg_sol_coral',    colors: ['#FB7185'] },
    { id: 'sol_lavender', cat: 'solid', key: 'pfp_bg_sol_lavender', colors: ['#C4B5FD'] },
    { id: 'sol_sand',     cat: 'solid', key: 'pfp_bg_sol_sand',     colors: ['#E7D3B8'] },
    { id: 'sol_charcoal', cat: 'solid', key: 'pfp_bg_sol_charcoal', colors: ['#27272A'] },
    { id: 'sol_rose',     cat: 'solid', key: 'pfp_bg_sol_rose',     colors: ['#FBCFE8'] },
    { id: 'sol_sky',      cat: 'solid', key: 'pfp_bg_sol_sky',      colors: ['#38BDF8'] },

    /* Category B — Modern & Executive Gradients (14) */
    { id: 'grd_sunrise',  cat: 'gradient', key: 'pfp_bg_grd_sunrise',  colors: ['#F59E0B', '#FDE68A'] },
    { id: 'grd_cali',     cat: 'gradient', key: 'pfp_bg_grd_cali',     colors: ['#7C3AED', '#F43F5E', '#FB923C'] },
    { id: 'grd_aurora',   cat: 'gradient', key: 'pfp_bg_grd_aurora',   colors: ['#0F172A', '#0D9488', '#34D399'] },
    { id: 'grd_cyber',    cat: 'gradient', key: 'pfp_bg_grd_cyber',    colors: ['#0284C7', '#06B6D4', '#22D3EE'] },
    { id: 'grd_gold',     cat: 'gradient', key: 'pfp_bg_grd_gold',     colors: ['#1E293B', '#B45309', '#FDE047'] },
    { id: 'grd_ocean',    cat: 'gradient', key: 'pfp_bg_grd_ocean',    colors: ['#042F2E', '#0F766E', '#38BDF8'] },
    { id: 'grd_mint',     cat: 'gradient', key: 'pfp_bg_grd_mint',     colors: ['#065F46', '#10B981', '#A7F3D0'] },
    { id: 'grd_burgundy', cat: 'gradient', key: 'pfp_bg_grd_burgundy', colors: ['#4C0519', '#881337', '#E11D48'] },
    { id: 'grd_sapphire', cat: 'gradient', key: 'pfp_bg_grd_sapphire', colors: ['#020617', '#1E3A8A', '#3B82F6'] },
    { id: 'grd_silver',   cat: 'gradient', key: 'pfp_bg_grd_silver',   colors: ['#334155', '#94A3B8', '#F1F5F9'] },
    { id: 'grd_peach',    cat: 'gradient', key: 'pfp_bg_grd_peach',    colors: ['#EA580C', '#FDBA74', '#FFF7ED'] },
    { id: 'grd_ice',      cat: 'gradient', key: 'pfp_bg_grd_ice',      colors: ['#0369A1', '#7DD3FC', '#F0F9FF'] },
    { id: 'grd_forest',   cat: 'gradient', key: 'pfp_bg_grd_forest',   colors: ['#022C22', '#047857', '#6EE7B7'] },
    { id: 'grd_twilight', cat: 'gradient', key: 'pfp_bg_grd_twilight', colors: ['#1E1B4B', '#4338CA', '#A5B4FC'] },

    /* Category C — Geometric Halos & Patterns (12) */
    { id: 'pat_spotlight', cat: 'pattern', key: 'pfp_bg_pat_spotlight', colors: ['#0F172A', '#3B82F6'] },
    { id: 'pat_sunburst',  cat: 'pattern', key: 'pfp_bg_pat_sunburst',  colors: ['#1E1B4B', '#F59E0B'] },
    { id: 'pat_halftone',  cat: 'pattern', key: 'pfp_bg_pat_halftone',  colors: ['#EFF6FF', '#2563EB'] },
    { id: 'pat_stripes',   cat: 'pattern', key: 'pfp_bg_pat_stripes',   colors: ['#0F172A', '#1E293B', '#38BDF8'] },
    { id: 'pat_ripples',   cat: 'pattern', key: 'pfp_bg_pat_ripples',   colors: ['#042F2E', '#14B8A6'] },
    { id: 'pat_starfield', cat: 'pattern', key: 'pfp_bg_pat_starfield', colors: ['#020617', '#60A5FA', '#FFFFFF'] },
    { id: 'pat_waves',     cat: 'pattern', key: 'pfp_bg_pat_waves',     colors: ['#1E3A8A', '#2563EB', '#93C5FD'] },
    { id: 'pat_hex',       cat: 'pattern', key: 'pfp_bg_pat_hex',       colors: ['#09090B', '#18181B', '#06B6D4'] },
    { id: 'pat_grid',      cat: 'pattern', key: 'pfp_bg_pat_grid',      colors: ['#F8FAFC', '#CBD5E1'] },
    { id: 'pat_marble',    cat: 'pattern', key: 'pfp_bg_pat_marble',    colors: ['#F8FAFC', '#E2E8F0', '#94A3B8'] },
    { id: 'pat_bokeh',     cat: 'pattern', key: 'pfp_bg_pat_bokeh',     colors: ['#1E1B4B', '#8B5CF6', '#38BDF8'] },
    { id: 'pat_vignette',  cat: 'pattern', key: 'pfp_bg_pat_vignette',  colors: ['#334155', '#09090B'] },

    /* Category D — Smart Original Backdrop & Scenes (8) */
    { id: 'smt_bokeh_l',   cat: 'smart', key: 'pfp_bg_smt_bokeh_l',   colors: ['#64748B', '#CBD5E1'] },
    { id: 'smt_bokeh_m',   cat: 'smart', key: 'pfp_bg_smt_bokeh_m',   colors: ['#475569', '#94A3B8'] },
    { id: 'smt_bokeh_s',   cat: 'smart', key: 'pfp_bg_smt_bokeh_s',   colors: ['#334155', '#64748B'] },
    { id: 'smt_colorpop',  cat: 'smart', key: 'pfp_bg_smt_colorpop',  colors: ['#27272A', '#D4D4D8'] },
    { id: 'scn_sunset',    cat: 'smart', key: 'pfp_bg_scn_sunset',    colors: ['#4C1D95', '#F43F5E', '#FDBA74'] },
    { id: 'scn_night',     cat: 'smart', key: 'pfp_bg_scn_night',     colors: ['#020617', '#1E3A8A', '#E0F2FE'] },
    { id: 'scn_horizon',   cat: 'smart', key: 'pfp_bg_scn_horizon',   colors: ['#7C2D12', '#EA580C', '#FEF3C7'] },
    { id: 'scn_city',      cat: 'smart', key: 'pfp_bg_scn_city',      colors: ['#0F172A', '#312E81', '#FBBF24'] },
  ];

  /* 6 Frame Mask Shapes */
  var SHAPE_KEYS = {
    circle: 'pfp_shape_circle',
    squircle: 'pfp_shape_squircle',
    hexagon: 'pfp_shape_hexagon',
    shield: 'pfp_shape_shield',
    badge: 'pfp_shape_badge',
    square: 'pfp_shape_square',
  };

  /* 18 Ring & Border Styles */
  var RING_STYLES = [
    { id: 'story_grad',      key: 'pfp_ring_story_grad' },
    { id: 'verified_glow',   key: 'pfp_ring_verified_glow' },
    { id: 'royal_gold',      key: 'pfp_ring_royal_gold' },
    { id: 'cyber_neon',      key: 'pfp_ring_cyber_neon' },
    { id: 'exec_dual',       key: 'pfp_ring_exec_dual' },
    { id: 'metallic_silver', key: 'pfp_ring_metallic_silver' },
    { id: 'double_sep',      key: 'pfp_ring_double_sep' },
    { id: 'dashed_tech',     key: 'pfp_ring_dashed_tech' },
    { id: 'dotted',          key: 'pfp_ring_dotted' },
    { id: 'arc_4seg',        key: 'pfp_ring_arc_4seg' },
    { id: 'angled_sweep',    key: 'pfp_ring_angled_sweep' },
    { id: 'inner_white',     key: 'pfp_ring_inner_white' },
    { id: 'popout_3d',       key: 'pfp_ring_popout_3d' },
    { id: 'popout_glow',     key: 'pfp_ring_popout_glow' },
    { id: 'glass_frost',     key: 'pfp_ring_glass_frost' },
    { id: 'float_shadow',    key: 'pfp_ring_float_shadow' },
    { id: 'inner_depth',     key: 'pfp_ring_inner_depth' },
    { id: 'rim_light',       key: 'pfp_ring_rim_light' },
  ];

  /* ----- DOM References ----- */
  var pfpShapeBadge = $('#pfpShapeBadge');
  var pfpSpecMeta = $('#pfpSpecMeta');
  var btnOpenSocialModal = $('#btnOpenSocialModal');
  var btnReplacePhoto = $('#btnReplacePhoto');
  var btnOpenExportModal = $('#btnOpenExportModal');

  var pfpViewport = $('#pfpViewport');
  var pfpFileInput = $('#pfpFileInput');
  var pfpEmptyState = $('#pfpEmptyState');
  var btnUploadEmpty = $('#btnUploadEmpty');

  var pfpCanvasWrap = $('#pfpCanvasWrap');
  var pfpPreviewCanvas = $('#pfpPreviewCanvas');
  var pfpOrigPeekCanvas = $('#pfpOrigPeekCanvas');
  var pfpBrushCursor = $('#pfpBrushCursor');
  var pfpAiOverlay = $('#pfpAiOverlay');
  var pfpAiStatusText = $('#pfpAiStatusText');

  var btnMqExport = $('#btnMqExport');
  var btnMqSocial = $('#btnMqSocial');
  var btnMqCenter = $('#btnMqCenter');
  var btnMqUndo = $('#btnMqUndo');

  var btnStagePeek = $('#btnStagePeek');
  var btnStageCenter = $('#btnStageCenter');
  var btnResetFraming = $('#btnResetFraming');
  var btnClearAll = $('#btnClearAll');

  var dockTabs = $$('.pfp-dock-tab');
  var dockPanes = $$('.pfp-step-pane');

  var btnAutoCutout = $('#btnAutoCutout');
  var btnKeepOriginalBg = $('#btnKeepOriginalBg');
  var pfpBrushHint = $('#pfpBrushHint');
  var btnToolPan = $('#btnToolPan');
  var btnBrushRestore = $('#btnBrushRestore');
  var btnBrushErase = $('#btnBrushErase');
  var pfpBrushSize = $('#pfpBrushSize');
  var pfpBrushSizeVal = $('#pfpBrushSizeVal');
  var btnUndoMask = $('#btnUndoMask');
  var btnRedoMask = $('#btnRedoMask');

  var btnAutoCenter = $('#btnAutoCenter');
  var pfpZoom = $('#pfpZoom');
  var pfpZoomVal = $('#pfpZoomVal');
  var pfpTilt = $('#pfpTilt');
  var pfpTiltVal = $('#pfpTiltVal');
  var btnRot90 = $('#btnRot90');
  var btnFlipH = $('#btnFlipH');
  var pfpBrightness = $('#pfpBrightness');
  var pfpBrightnessVal = $('#pfpBrightnessVal');
  var pfpContrast = $('#pfpContrast');
  var pfpContrastVal = $('#pfpContrastVal');
  var pfpWarmth = $('#pfpWarmth');
  var pfpWarmthVal = $('#pfpWarmthVal');
  var pfpBwToggle = $('#pfpBwToggle');

  var bgCatBtns = $$('.pfp-chip-btn[data-cat]', $('#pfpBgCatRow'));
  var pfpBgGrid = $('#pfpBgGrid');
  var pfpGradAngle = $('#pfpGradAngle');
  var pfpGradAngleVal = $('#pfpGradAngleVal');
  var pfpBgColor1 = $('#pfpBgColor1');
  var pfpBgColor2 = $('#pfpBgColor2');
  var btnApplyCustomBg = $('#btnApplyCustomBg');

  var shapeBtns = $$('.pfp-shape-btn[data-shape]', $('#pfpShapeGrid'));
  var pfpRingGrid = $('#pfpRingGrid');
  var pfpRingThickness = $('#pfpRingThickness');
  var pfpRingThicknessVal = $('#pfpRingThicknessVal');
  var pfpDropShadow = $('#pfpDropShadow');
  var pfpDropShadowVal = $('#pfpDropShadowVal');
  var pfpInnerShadow = $('#pfpInnerShadow');
  var pfpInnerShadowVal = $('#pfpInnerShadowVal');
  var pfpOuterGlow = $('#pfpOuterGlow');
  var pfpOuterGlowVal = $('#pfpOuterGlowVal');
  var pfpRingCol1 = $('#pfpRingCol1');
  var pfpRingCol2 = $('#pfpRingCol2');

  var badgeBtns = $$('.pfp-chip-btn[data-badge]', $('#pfpBadgeRow'));
  var pfpCustomBadgeBox = $('#pfpCustomBadgeBox');
  var pfpCustomBadgeText = $('#pfpCustomBadgeText');
  var pfpCustomBadgeCol = $('#pfpCustomBadgeCol');

  var pfpCurvedText = $('#pfpCurvedText');
  var btnPickFont = $('#btnPickFont');
  var pfpFontName = $('#pfpFontName');
  var pfpCurvedTextColor = $('#pfpCurvedTextColor');
  var curvedPosBtns = $$('.pfp-chip-btn[data-pos]', $('#pfpCurvedPosRow'));

  var pfpFontModal = $('#pfpFontModal');
  var btnCloseFontModal = $('#btnCloseFontModal');
  var pfpFontList = $('#pfpFontList');

  var pfpSocialModal = $('#pfpSocialModal');
  var btnCloseSocialModal = $('#btnCloseSocialModal');
  var btnSocialThemeToggle = $('#btnSocialThemeToggle');
  var pfpSocialStage = $('#pfpSocialStage');

  var pfpExportModal = $('#pfpExportModal');
  var btnCloseExportModal = $('#btnCloseExportModal');
  var pfpExportSummary = $('#pfpExportSummary');
  var btnExportPng = $('#btnExportPng');
  var btnExportJpg = $('#btnExportJpg');
  var btnExportZip = $('#btnExportZip');

  /* ----- Offscreen Canvases ----- */
  var subjectCanvas = document.createElement('canvas');
  var subjectCtx = subjectCanvas.getContext('2d');
  var fgTempCanvas = document.createElement('canvas');
  var bgBlurCanvas = document.createElement('canvas');

  /* ----- State ----- */
  var state = {
    currentFile: null,
    currentFileName: 'profile-avatar',
    objectURL: null,
    originalImage: null,
    origWidth: 0,
    origHeight: 0,
    origImageData: null,
    loadGen: 0,

    hasCutout: false,
    useCutoutBg: true,
    maskAlpha: null,
    isProcessingAi: false,

    brushMode: null, /* null | 'restore' | 'erase' */
    brushSizePx: 28,
    isPainting: false,
    lastPaintX: 0,
    lastPaintY: 0,
    preStrokeMask: null,
    strokeDirty: false,

    panX: 0,
    panY: 0,
    zoomPct: 108,
    tiltDeg: 0,
    rot90: 0,
    flipH: false,

    brightness: 0,
    contrast: 0,
    warmth: 0,
    bw: false,

    bgCat: 'all',
    bgId: 'grd_sapphire',
    gradAngle: 135,
    customBg1: '#1D4ED8',
    customBg2: '#06B6D4',

    shape: 'circle',
    ringStyle: 'verified_glow',
    ringThickness: 12,
    dropShadow: 25,
    innerShadow: 15,
    outerGlow: 20,
    ringCol1: '#1D4ED8',
    ringCol2: '#06B6D4',

    badge: 'none',
    customBadgeText: '#AVAILABLE',
    customBadgeCol: '#16A34A',

    curvedText: '',
    curvedFontId: 'cairo',
    curvedTextColor: '#FFFFFF',
    curvedPos: 'top',

    isPeeking: false,
    socialDark: false,
  };

  var undoStack = [];
  var redoStack = [];
  var activePointers = new Map();
  var isPanning = false;
  var panStartX = 0;
  var panStartY = 0;
  var panOrigX = 0;
  var panOrigY = 0;
  var pinchStartDist = 0;
  var pinchStartZoom = 100;
  var rafId = 0;
  var activeDevice = 'cpu';
  var preloadPromise = null;

  /* ----- Helpers ----- */
  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function sanitizeHex(hex, fallback) {
    var s = String(hex || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : (fallback || '#1D4ED8');
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

  function sanitizeFilenameBase(name) {
    var base = String(name || 'profile-avatar').replace(/\.[^.]+$/, '');
    base = base.replace(/[\/\\:*?"<>|\x00-\x1F]+/g, '_').replace(/^\.+|\.+$/g, '').trim();
    return base || 'profile-avatar';
  }

  function revokeObjectUrl() {
    if (state.objectURL) {
      try { URL.revokeObjectURL(state.objectURL); } catch (_e) {}
      state.objectURL = null;
    }
  }

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
        var aName = (attrs[j].name || '');
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
          resolve(URL.createObjectURL(blob));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function () { reject(new Error('Failed to read SVG file')); };
      reader.readAsText(file, 'UTF-8');
    });
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
    document.title = t('t_pfp_t') + ' — imgsfix';
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', t('pfp_meta_desc'));
  }

  /* ----- Snapshot / Undo & Redo (MAX_UNDO = 20) ----- */
  function createSnapshot(includeMask) {
    return {
      hasCutout: state.hasCutout,
      useCutoutBg: state.useCutoutBg,
      maskAlpha: includeMask && state.maskAlpha ? new Uint8ClampedArray(state.maskAlpha) : null,
      panX: state.panX,
      panY: state.panY,
      zoomPct: state.zoomPct,
      tiltDeg: state.tiltDeg,
      rot90: state.rot90,
      flipH: state.flipH,
      brightness: state.brightness,
      contrast: state.contrast,
      warmth: state.warmth,
      bw: state.bw,
      bgId: state.bgId,
      gradAngle: state.gradAngle,
      customBg1: state.customBg1,
      customBg2: state.customBg2,
      shape: state.shape,
      ringStyle: state.ringStyle,
      ringThickness: state.ringThickness,
      dropShadow: state.dropShadow,
      innerShadow: state.innerShadow,
      outerGlow: state.outerGlow,
      ringCol1: state.ringCol1,
      ringCol2: state.ringCol2,
      badge: state.badge,
      customBadgeText: state.customBadgeText,
      customBadgeCol: state.customBadgeCol,
      curvedText: state.curvedText,
      curvedFontId: state.curvedFontId,
      curvedTextColor: state.curvedTextColor,
      curvedPos: state.curvedPos,
    };
  }

  function pushUndo(includeMask, prebuiltMask) {
    var snap = createSnapshot(false);
    if (includeMask) {
      snap.maskAlpha = prebuiltMask ? prebuiltMask : (state.maskAlpha ? new Uint8ClampedArray(state.maskAlpha) : null);
    }
    undoStack.push(snap);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
    syncUndoButtons();
  }

  function applySnapshot(snap) {
    if (!snap) return;
    state.hasCutout = snap.hasCutout;
    state.useCutoutBg = snap.useCutoutBg;
    if (snap.maskAlpha) {
      state.maskAlpha = new Uint8ClampedArray(snap.maskAlpha);
      rebuildSubjectCanvasFromMask();
    }
    state.panX = snap.panX;
    state.panY = snap.panY;
    state.zoomPct = snap.zoomPct;
    state.tiltDeg = snap.tiltDeg;
    state.rot90 = snap.rot90;
    state.flipH = snap.flipH;
    state.brightness = snap.brightness;
    state.contrast = snap.contrast;
    state.warmth = snap.warmth;
    state.bw = snap.bw;
    state.bgId = snap.bgId;
    state.gradAngle = snap.gradAngle;
    state.customBg1 = snap.customBg1;
    state.customBg2 = snap.customBg2;
    state.shape = snap.shape;
    state.ringStyle = snap.ringStyle;
    state.ringThickness = snap.ringThickness;
    state.dropShadow = snap.dropShadow;
    state.innerShadow = snap.innerShadow;
    state.outerGlow = snap.outerGlow;
    state.ringCol1 = snap.ringCol1;
    state.ringCol2 = snap.ringCol2;
    state.badge = snap.badge;
    state.customBadgeText = snap.customBadgeText;
    state.customBadgeCol = snap.customBadgeCol;
    state.curvedText = snap.curvedText;
    state.curvedFontId = snap.curvedFontId;
    state.curvedTextColor = snap.curvedTextColor;
    state.curvedPos = snap.curvedPos;
    syncAllUI();
    scheduleRender();
  }

  function handleUndo() {
    if (!undoStack.length) return;
    var top = undoStack.pop();
    var redoSnap = createSnapshot(Boolean(top.maskAlpha));
    redoStack.push(redoSnap);
    if (redoStack.length > MAX_UNDO) redoStack.shift();
    applySnapshot(top);
    syncUndoButtons();
  }

  function handleRedo() {
    if (!redoStack.length) return;
    var top = redoStack.pop();
    var undoSnap = createSnapshot(Boolean(top.maskAlpha));
    undoStack.push(undoSnap);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    applySnapshot(top);
    syncUndoButtons();
  }

  function syncUndoButtons() {
    var canUndo = undoStack.length > 0;
    var canRedo = redoStack.length > 0;
    if (btnUndoMask) btnUndoMask.disabled = !canUndo;
    if (btnMqUndo) btnMqUndo.disabled = !canUndo;
    if (btnRedoMask) btnRedoMask.disabled = !canRedo;
  }

  /* ----- @imgly/background-removal Setup & Preload ----- */
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
      var img = new Image();
      img.onload = function () {
        try { URL.revokeObjectURL(tempUrl); } catch (_e) {}
        resolve(img);
      };
      img.onerror = function () {
        try { URL.revokeObjectURL(tempUrl); } catch (_e) {}
        reject(new Error('Failed to decode AI output'));
      };
      img.src = tempUrl;
    });
  }

  function extractAndRefineMask(aiImg, w, h) {
    var maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    var mctx = maskCanvas.getContext('2d');
    mctx.imageSmoothingEnabled = true;
    mctx.imageSmoothingQuality = 'high';
    mctx.clearRect(0, 0, w, h);
    mctx.drawImage(aiImg, 0, 0, w, h);

    var rawPixels = mctx.getImageData(0, 0, w, h).data;
    cleanupCanvas(maskCanvas);

    var total = w * h;
    var rawAlpha = new Uint8ClampedArray(total);
    for (var i = 0; i < total; i++) {
      rawAlpha[i] = rawPixels[i * 4 + 3];
    }

    var outAlpha = new Uint8ClampedArray(total);
    for (var y = 0; y < h; y++) {
      var yPrev = y > 0 ? y - 1 : 0;
      var yNext = y < h - 1 ? y + 1 : h - 1;
      var row = y * w;
      var rowPrev = yPrev * w;
      var rowNext = yNext * w;

      for (var x = 0; x < w; x++) {
        var c = rawAlpha[row + x];
        if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
          if (c === 255 && rawAlpha[row + x - 1] === 255 && rawAlpha[row + x + 1] === 255 && rawAlpha[rowPrev + x] === 255 && rawAlpha[rowNext + x] === 255) {
            outAlpha[row + x] = 255;
            continue;
          }
          if (c === 0 && rawAlpha[row + x - 1] === 0 && rawAlpha[row + x + 1] === 0 && rawAlpha[rowPrev + x] === 0 && rawAlpha[rowNext + x] === 0) {
            outAlpha[row + x] = 0;
            continue;
          }
        }
        var xPrev = x > 0 ? x - 1 : 0;
        var xNext = x < w - 1 ? x + 1 : w - 1;
        var smooth = (
          c * 4 +
          (rawAlpha[row + xPrev] + rawAlpha[row + xNext] + rawAlpha[rowPrev + x] + rawAlpha[rowNext + x]) * 2 +
          (rawAlpha[rowPrev + xPrev] + rawAlpha[rowPrev + xNext] + rawAlpha[rowNext + xPrev] + rawAlpha[rowNext + xNext])
        ) * 0.0625;
        if (smooth < 18) smooth = 0;
        else if (smooth > 246) smooth = 255;
        outAlpha[row + x] = smooth;
      }
    }
    return outAlpha;
  }

  function rebuildSubjectCanvasFromMask() {
    if (!state.origImageData || !state.origWidth) return;
    var w = state.origWidth;
    var h = state.origHeight;
    if (subjectCanvas.width !== w || subjectCanvas.height !== h) {
      subjectCanvas.width = w;
      subjectCanvas.height = h;
    }
    var outData = new ImageData(new Uint8ClampedArray(state.origImageData.data), w, h);
    if (state.hasCutout && state.useCutoutBg && state.maskAlpha) {
      var d = outData.data;
      var total = w * h;
      for (var i = 0; i < total; i++) {
        d[i * 4 + 3] = Math.round((d[i * 4 + 3] * state.maskAlpha[i]) / 255);
      }
    }
    subjectCtx.putImageData(outData, 0, 0);
  }

  async function runAiCutout() {
    if (!state.originalImage || state.isProcessingAi) return;
    state.isProcessingAi = true;
    if (pfpAiOverlay) pfpAiOverlay.classList.remove('hide');
    if (pfpAiStatusText) pfpAiStatusText.textContent = t('pfp_ai_running');
    if (btnAutoCutout) btnAutoCutout.disabled = true;

    try {
      await startSilentPreload();
      var sourceInput = state.currentFile || state.originalImage.src;
      var blob;
      try {
        blob = await removeBackground(sourceInput, getImglyConfig(activeDevice));
      } catch (_gpuErr) {
        if (activeDevice === 'gpu') {
          activeDevice = 'cpu';
          blob = await removeBackground(sourceInput, getImglyConfig('cpu'));
        } else {
          throw _gpuErr;
        }
      }

      var aiImg = await decodeBlobToImage(blob);
      pushUndo(true);
      state.maskAlpha = extractAndRefineMask(aiImg, state.origWidth, state.origHeight);
      state.hasCutout = true;
      state.useCutoutBg = true;
      rebuildSubjectCanvasFromMask();
      syncAllUI();
      scheduleRender();
      toast(t('pfp_ai_done'), 'ok');
    } catch (err) {
      console.error('AI Cutout Error:', err);
      toast(t('pfp_ai_err'), 'err');
    } finally {
      state.isProcessingAi = false;
      if (pfpAiOverlay) pfpAiOverlay.classList.add('hide');
      if (btnAutoCutout) btnAutoCutout.disabled = false;
    }
  }

  /* ----- Frame Mask Path Builders ----- */
  function traceFramePath(ctx, cx, cy, r, shape) {
    ctx.beginPath();
    if (shape === 'square') {
      var rad = r * 0.14;
      var x = cx - r, y = cy - r, s = r * 2;
      ctx.moveTo(x + rad, y);
      ctx.lineTo(x + s - rad, y);
      ctx.quadraticCurveTo(x + s, y, x + s, y + rad);
      ctx.lineTo(x + s, y + s - rad);
      ctx.quadraticCurveTo(x + s, y + s, x + s - rad, y + s);
      ctx.lineTo(x + rad, y + s);
      ctx.quadraticCurveTo(x, y + s, x, y + s - rad);
      ctx.lineTo(x, y + rad);
      ctx.quadraticCurveTo(x, y, x + rad, y);
      ctx.closePath();
    } else if (shape === 'squircle') {
      var k = r * 0.88;
      ctx.moveTo(cx, cy - r);
      ctx.bezierCurveTo(cx + k, cy - r, cx + r, cy - k, cx + r, cy);
      ctx.bezierCurveTo(cx + r, cy + k, cx + k, cy + r, cx, cy + r);
      ctx.bezierCurveTo(cx - k, cy + r, cx - r, cy + k, cx - r, cy);
      ctx.bezierCurveTo(cx - r, cy - k, cx - k, cy - r, cx, cy - r);
      ctx.closePath();
    } else if (shape === 'hexagon') {
      for (var i = 0; i < 6; i++) {
        var ang = (Math.PI / 3) * i - Math.PI / 2;
        var px = cx + Math.cos(ang) * r;
        var py = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (shape === 'shield') {
      ctx.moveTo(cx, cy - r * 0.98);
      ctx.quadraticCurveTo(cx + r * 0.92, cy - r * 0.86, cx + r * 0.92, cy - r * 0.18);
      ctx.bezierCurveTo(cx + r * 0.92, cy + r * 0.48, cx + r * 0.42, cy + r * 0.82, cx, cy + r * 1.02);
      ctx.bezierCurveTo(cx - r * 0.42, cy + r * 0.82, cx - r * 0.92, cy + r * 0.48, cx - r * 0.92, cy - r * 0.18);
      ctx.quadraticCurveTo(cx - r * 0.92, cy - r * 0.86, cx, cy - r * 0.98);
      ctx.closePath();
    } else if (shape === 'badge') {
      var lobes = 14;
      var steps = lobes * 10;
      for (var j = 0; j <= steps; j++) {
        var th = (j / steps) * Math.PI * 2;
        var radMod = r * (0.94 + 0.06 * Math.cos(th * lobes));
        var bx = cx + Math.cos(th) * radMod;
        var by = cy + Math.sin(th) * radMod;
        if (j === 0) ctx.moveTo(bx, by);
        else ctx.lineTo(bx, by);
      }
      ctx.closePath();
    } else {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
  }

  /* ----- Backdrop Renderer (46 Curated Presets + Smart Bokeh & Color-Pop) ----- */
  function getPresetObj(id) {
    for (var i = 0; i < BG_PRESETS.length; i++) {
      if (BG_PRESETS[i].id === id) return BG_PRESETS[i];
    }
    return BG_PRESETS[12];
  }

  function makeLinearGrad(ctx, S, colors, angleDeg) {
    var rad = (angleDeg * Math.PI) / 180;
    var dx = Math.cos(rad) * S * 0.5;
    var dy = Math.sin(rad) * S * 0.5;
    var g = ctx.createLinearGradient(S * 0.5 - dx, S * 0.5 - dy, S * 0.5 + dx, S * 0.5 + dy);
    for (var i = 0; i < colors.length; i++) {
      g.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), colors[i]);
    }
    return g;
  }

  function drawTransformedOriginal(ctx, S, blurPx, grayscale) {
    if (!state.originalImage || !state.origWidth) return false;
    var scale = getBaseCoverScale(S) * (state.zoomPct / 100);
    if (bgBlurCanvas.width !== S || bgBlurCanvas.height !== S) {
      bgBlurCanvas.width = S;
      bgBlurCanvas.height = S;
    }
    var bctx = bgBlurCanvas.getContext('2d');
    bctx.clearRect(0, 0, S, S);
    bctx.save();
    var filters = [];
    if (blurPx > 0) filters.push('blur(' + Math.max(1, (blurPx / 640) * S).toFixed(1) + 'px)');
    if (grayscale) filters.push('grayscale(100%) contrast(108%)');
    bctx.filter = filters.length ? filters.join(' ') : 'none';

    bctx.translate(S * 0.5 + (state.panX / 640) * S, S * 0.5 + (state.panY / 640) * S);
    bctx.rotate((state.tiltDeg * Math.PI) / 180);
    bctx.scale(scale * (state.flipH ? -1 : 1), scale);
    bctx.rotate((state.rot90 * Math.PI) / 180);
    bctx.drawImage(state.originalImage, -state.origWidth * 0.5, -state.origHeight * 0.5);
    bctx.restore();
    bctx.filter = 'none';

    ctx.drawImage(bgBlurCanvas, 0, 0);
    return true;
  }

  function renderBackdrop(ctx, S) {
    var preset = state.bgId === 'custom'
      ? { id: 'custom', cat: 'gradient', colors: [sanitizeHex(state.customBg1), sanitizeHex(state.customBg2)] }
      : getPresetObj(state.bgId);
    var cols = preset.colors;

    if (preset.cat === 'solid') {
      ctx.fillStyle = cols[0];
      ctx.fillRect(0, 0, S, S);
      return;
    }

    if (preset.cat === 'gradient') {
      ctx.fillStyle = makeLinearGrad(ctx, S, cols, state.gradAngle);
      ctx.fillRect(0, 0, S, S);
      return;
    }

    if (preset.id === 'smt_bokeh_l' || preset.id === 'smt_bokeh_m' || preset.id === 'smt_bokeh_s' || preset.id === 'smt_colorpop') {
      var blurAmt = preset.id === 'smt_bokeh_l' ? 8 : (preset.id === 'smt_bokeh_m' ? 18 : (preset.id === 'smt_bokeh_s' ? 32 : 2));
      var drawn = drawTransformedOriginal(ctx, S, blurAmt, preset.id === 'smt_colorpop');
      if (!drawn) {
        ctx.fillStyle = makeLinearGrad(ctx, S, cols, state.gradAngle);
        ctx.fillRect(0, 0, S, S);
      }
      return;
    }

    if (preset.id === 'scn_sunset' || preset.id === 'scn_night' || preset.id === 'scn_horizon' || preset.id === 'scn_city') {
      ctx.fillStyle = makeLinearGrad(ctx, S, cols, 180);
      ctx.fillRect(0, 0, S, S);
      if (preset.id === 'scn_night') {
        for (var st = 0; st < 48; st++) {
          var sx = ((st * 197 + 41) % 100) * 0.01 * S;
          var sy = ((st * 313 + 17) % 68) * 0.01 * S;
          ctx.fillStyle = rgbaStr('#FFFFFF', 0.35 + (st % 4) * 0.16);
          ctx.beginPath();
          ctx.arc(sx, sy, S * (0.002 + (st % 3) * 0.0012), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      var orbY = preset.id === 'scn_night' ? S * 0.28 : S * 0.56;
      var orbG = ctx.createRadialGradient(S * 0.5, orbY, 0, S * 0.5, orbY, S * 0.32);
      orbG.addColorStop(0, rgbaStr(cols[cols.length - 1], 0.85));
      orbG.addColorStop(0.5, rgbaStr(cols[cols.length - 1], 0.25));
      orbG.addColorStop(1, rgbaStr(cols[cols.length - 1], 0));
      ctx.fillStyle = orbG;
      ctx.beginPath();
      ctx.arc(S * 0.5, orbY, S * 0.32, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = rgbaStr(cols[0], 0.85);
      ctx.beginPath();
      ctx.moveTo(0, S);
      ctx.lineTo(0, S * 0.72);
      ctx.lineTo(S * 0.24, S * 0.62);
      ctx.lineTo(S * 0.48, S * 0.71);
      ctx.lineTo(S * 0.74, S * 0.6);
      ctx.lineTo(S, S * 0.7);
      ctx.lineTo(S, S);
      ctx.closePath();
      ctx.fill();

      if (preset.id === 'scn_city') {
        for (var bc = 0; bc < 18; bc++) {
          var bx = ((bc * 137) % 90 + 5) * 0.01 * S;
          var by = ((bc * 229) % 24 + 72) * 0.01 * S;
          ctx.fillStyle = rgbaStr('#FBBF24', 0.45);
          ctx.beginPath();
          ctx.arc(bx, by, S * (0.012 + (bc % 4) * 0.008), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return;
    }

    /* Category C — Geometric Halos & Patterns */
    ctx.fillStyle = cols[0];
    ctx.fillRect(0, 0, S, S);
    var c2 = cols[1] || '#3B82F6';
    var c3 = cols[2] || c2;

    if (preset.id === 'pat_spotlight') {
      var sg = ctx.createRadialGradient(S * 0.5, S * 0.44, 0, S * 0.5, S * 0.44, S * 0.48);
      sg.addColorStop(0, rgbaStr(c2, 0.92));
      sg.addColorStop(0.55, rgbaStr(c2, 0.32));
      sg.addColorStop(1, rgbaStr(cols[0], 0));
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, S, S);
    } else if (preset.id === 'pat_sunburst') {
      var rays = 18;
      ctx.save();
      ctx.translate(S * 0.5, S * 0.5);
      for (var r = 0; r < rays; r++) {
        ctx.rotate((Math.PI * 2) / rays);
        ctx.fillStyle = rgbaStr(c2, r % 2 === 0 ? 0.24 : 0.05);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-S * 0.14, -S);
        ctx.lineTo(S * 0.14, -S);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else if (preset.id === 'pat_halftone') {
      var stepH = S * 0.06;
      ctx.fillStyle = rgbaStr(c2, 0.28);
      for (var y = stepH * 0.5; y < S; y += stepH) {
        var frac = y / S;
        var dotR = stepH * (0.1 + frac * 0.26);
        for (var x = stepH * 0.5; x < S; x += stepH) {
          ctx.beginPath();
          ctx.arc(x, y, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (preset.id === 'pat_stripes') {
      ctx.save();
      ctx.translate(S * 0.5, S * 0.5);
      ctx.rotate(-Math.PI / 4);
      var sw = S * 0.065;
      for (var sx = -S; sx < S; sx += sw * 2) {
        ctx.fillStyle = rgbaStr(c2, 0.65);
        ctx.fillRect(sx, -S, sw, S * 2);
      }
      ctx.fillStyle = rgbaStr(c3, 0.22);
      ctx.fillRect(-S, -sw * 0.5, S * 2, sw * 0.6);
      ctx.restore();
    } else if (preset.id === 'pat_ripples') {
      for (var rp = 1; rp <= 7; rp++) {
        ctx.strokeStyle = rgbaStr(c2, 0.45 - rp * 0.04);
        ctx.lineWidth = Math.max(1.5, S * 0.008);
        ctx.beginPath();
        ctx.arc(S * 0.5, S * 0.46, S * 0.075 * rp, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (preset.id === 'pat_starfield') {
      var gStar = ctx.createRadialGradient(S * 0.5, S * 0.4, 0, S * 0.5, S * 0.4, S * 0.65);
      gStar.addColorStop(0, rgbaStr(c2, 0.28));
      gStar.addColorStop(1, rgbaStr(cols[0], 0));
      ctx.fillStyle = gStar;
      ctx.fillRect(0, 0, S, S);
      for (var k = 0; k < 65; k++) {
        var px = ((k * 173 + 19) % 98 + 1) * 0.01 * S;
        var py = ((k * 271 + 37) % 98 + 1) * 0.01 * S;
        ctx.fillStyle = rgbaStr(c3, 0.35 + (k % 5) * 0.13);
        ctx.beginPath();
        ctx.arc(px, py, S * (0.002 + (k % 3) * 0.0016), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (preset.id === 'pat_waves') {
      for (var w = 0; w < 5; w++) {
        var baseY = S * (0.3 + w * 0.15);
        ctx.fillStyle = rgbaStr(w % 2 === 0 ? c2 : c3, 0.45);
        ctx.beginPath();
        ctx.moveTo(0, S);
        ctx.lineTo(0, baseY);
        ctx.bezierCurveTo(S * 0.3, baseY - S * 0.1, S * 0.7, baseY + S * 0.1, S, baseY - S * 0.03);
        ctx.lineTo(S, S);
        ctx.closePath();
        ctx.fill();
      }
    } else if (preset.id === 'pat_hex') {
      var hr = S * 0.095;
      var hStepX = hr * 1.65;
      var hStepY = hr * 1.44;
      ctx.strokeStyle = rgbaStr(c3, 0.34);
      ctx.lineWidth = Math.max(1.2, S * 0.004);
      for (var hy = -hr; hy < S + hr; hy += hStepY) {
        var rowIdx = Math.round(hy / hStepY);
        for (var hx = -hr; hx < S + hr; hx += hStepX) {
          var ox = hx + (rowIdx % 2 === 0 ? 0 : hStepX * 0.5);
          ctx.beginPath();
          for (var s = 0; s < 6; s++) {
            var a = (Math.PI / 3) * s;
            var pxH = ox + Math.cos(a) * hr * 0.88;
            var pyH = hy + Math.sin(a) * hr * 0.88;
            if (s === 0) ctx.moveTo(pxH, pyH);
            else ctx.lineTo(pxH, pyH);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
    } else if (preset.id === 'pat_grid') {
      var gStep = S * 0.085;
      ctx.strokeStyle = rgbaStr(c2, 0.55);
      ctx.lineWidth = Math.max(1, S * 0.003);
      for (var gx = gStep; gx < S; gx += gStep) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, S); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, gx); ctx.lineTo(S, gx); ctx.stroke();
      }
    } else if (preset.id === 'pat_marble') {
      for (var mb = 0; mb < 5; mb++) {
        var mg = ctx.createRadialGradient(
          S * (0.2 + ((mb * 37) % 60) * 0.01),
          S * (0.2 + ((mb * 53) % 60) * 0.01),
          0,
          S * 0.5,
          S * 0.5,
          S * 0.65
        );
        mg.addColorStop(0, rgbaStr(mb % 2 === 0 ? c2 : c3, 0.32));
        mg.addColorStop(1, rgbaStr(cols[0], 0));
        ctx.fillStyle = mg;
        ctx.fillRect(0, 0, S, S);
      }
    } else if (preset.id === 'pat_bokeh') {
      for (var bk = 0; bk < 18; bk++) {
        var bx = ((bk * 179 + 29) % 92 + 4) * 0.01 * S;
        var by = ((bk * 257 + 13) % 92 + 4) * 0.01 * S;
        var br = S * (0.04 + (bk % 4) * 0.025);
        var bCol = bk % 2 === 0 ? c2 : c3;
        var bgG = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        bgG.addColorStop(0, rgbaStr(bCol, 0.35));
        bgG.addColorStop(0.85, rgbaStr(bCol, 0.22));
        bgG.addColorStop(1, rgbaStr(bCol, 0));
        ctx.fillStyle = bgG;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      /* Studio Vignette */
      var vg = ctx.createRadialGradient(S * 0.5, S * 0.45, S * 0.05, S * 0.5, S * 0.5, S * 0.58);
      vg.addColorStop(0, cols[0]);
      vg.addColorStop(1, c2);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, S, S);
    }
  }

  /* ----- Foreground Portrait Transform & Retouch ----- */
  function getEffectiveRotDims() {
    if (!state.origWidth || !state.origHeight) return { w: 1, h: 1 };
    var swapped = (state.rot90 % 180) !== 0;
    return {
      w: swapped ? state.origHeight : state.origWidth,
      h: swapped ? state.origWidth : state.origHeight,
    };
  }

  function getBaseCoverScale(S) {
    var dims = getEffectiveRotDims();
    return Math.max(S / dims.w, S / dims.h);
  }

  function applyPortraitRetouch(imgData) {
    var bVal = state.brightness;
    var cVal = state.contrast;
    var wVal = state.warmth;
    var isBw = state.bw;
    if (bVal === 0 && cVal === 0 && wVal === 0 && !isBw) return;

    var data = imgData.data;
    var len = imgData.width * imgData.height;
    var bShift = bVal * 1.4;
    var cFactor = (259 * (cVal * 1.45 + 255)) / (255 * (259 - cVal * 1.45));
    var rWarm = wVal * 0.85;
    var gWarm = wVal * 0.12;
    var bWarm = -wVal * 0.85;

    for (var i = 0; i < len; i++) {
      var idx = i * 4;
      if (data[idx + 3] === 0) continue;
      var r = data[idx] + bShift + rWarm;
      var g = data[idx + 1] + bShift + gWarm;
      var b = data[idx + 2] + bShift + bWarm;
      if (cVal !== 0) {
        r = cFactor * (r - 128) + 128;
        g = cFactor * (g - 128) + 128;
        b = cFactor * (b - 128) + 128;
      }
      if (isBw) {
        var lum = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = lum;
      }
      data[idx] = r < 0 ? 0 : (r > 255 ? 255 : r);
      data[idx + 1] = g < 0 ? 0 : (g > 255 ? 255 : g);
      data[idx + 2] = b < 0 ? 0 : (b > 255 ? 255 : b);
    }
  }

  function renderTransformedSubject(S) {
    if (!state.originalImage || !state.origWidth) return false;
    if (fgTempCanvas.width !== S || fgTempCanvas.height !== S) {
      fgTempCanvas.width = S;
      fgTempCanvas.height = S;
    }
    var fctx = fgTempCanvas.getContext('2d');
    fctx.clearRect(0, 0, S, S);
    fctx.imageSmoothingEnabled = true;
    fctx.imageSmoothingQuality = 'high';

    var scale = getBaseCoverScale(S) * (state.zoomPct / 100);
    fctx.save();
    fctx.translate(S * 0.5 + (state.panX / 640) * S, S * 0.5 + (state.panY / 640) * S);
    fctx.rotate((state.tiltDeg * Math.PI) / 180);
    fctx.scale(scale * (state.flipH ? -1 : 1), scale);
    fctx.rotate((state.rot90 * Math.PI) / 180);
    var src = (state.hasCutout && state.useCutoutBg) ? subjectCanvas : state.originalImage;
    fctx.drawImage(src, -state.origWidth * 0.5, -state.origHeight * 0.5);
    fctx.restore();

    if (state.brightness !== 0 || state.contrast !== 0 || state.warmth !== 0 || state.bw) {
      var fgData = fctx.getImageData(0, 0, S, S);
      applyPortraitRetouch(fgData);
      fctx.putImageData(fgData, 0, 0);
    }
    return true;
  }

  /* ----- Ring & Border Styles Renderer (All 18 Styles) ----- */
  function drawRingStyle(ctx, cx, cy, r, S) {
    var thick = (state.ringThickness / 1080) * S;
    var c1 = sanitizeHex(state.ringCol1, '#1D4ED8');
    var c2 = sanitizeHex(state.ringCol2, '#06B6D4');
    var style = state.ringStyle;

    /* Inner Shadow Depth */
    if (state.innerShadow > 0 || style === 'inner_depth') {
      var depthAlpha = Math.max(state.innerShadow / 100, style === 'inner_depth' ? 0.55 : 0) * 0.55;
      ctx.save();
      traceFramePath(ctx, cx, cy, r, state.shape);
      ctx.clip();
      var inG = ctx.createRadialGradient(cx, cy, r * 0.65, cx, cy, r);
      inG.addColorStop(0, 'rgba(0,0,0,0)');
      inG.addColorStop(1, 'rgba(2,6,23,' + depthAlpha.toFixed(3) + ')');
      ctx.fillStyle = inG;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
    }

    if (thick <= 0 && style !== 'rim_light' && style !== 'glass_frost') return;

    ctx.save();
    var ringGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    ringGrad.addColorStop(0, c1);
    ringGrad.addColorStop(1, c2);

    if (style === 'story_grad') {
      var sg = ctx.createLinearGradient(cx - r, cy + r, cx + r, cy - r);
      sg.addColorStop(0, '#F59E0B');
      sg.addColorStop(0.5, '#EC4899');
      sg.addColorStop(1, '#7C3AED');
      ctx.strokeStyle = sg;
      ctx.lineWidth = thick;
      traceFramePath(ctx, cx, cy, r, state.shape);
      ctx.stroke();
    } else if (style === 'verified_glow') {
      ctx.shadowColor = rgbaStr('#3B82F6', 0.65);
      ctx.shadowBlur = Math.max(8, thick * 1.4);
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = thick;
      traceFramePath(ctx, cx, cy, r, state.shape);
      ctx.stroke();
    } else if (style === 'royal_gold') {
      var gg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      gg.addColorStop(0, '#FEF08A');
      gg.addColorStop(0.5, '#D97706');
      gg.addColorStop(1, '#FDE047');
      ctx.strokeStyle = gg;
      ctx.lineWidth = thick;
      traceFramePath(ctx, cx, cy, r, state.shape);
      ctx.stroke();
    } else if (style === 'cyber_neon') {
      ctx.shadowColor = rgbaStr(c2, 0.75);
      ctx.shadowBlur = Math.max(10, thick * 1.6);
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = thick;
      traceFramePath(ctx, cx, cy, r, state.shape);
      ctx.stroke();
    } else if (style === 'exec_dual') {
      ctx.strokeStyle = c1;
      ctx.lineWidth = thick;
      traceFramePath(ctx, cx, cy, r, state.shape);
      ctx.stroke();
      ctx.strokeStyle = c2;
      ctx.lineWidth = Math.max(2, thick * 0.35);
      traceFramePath(ctx, cx, cy, r - thick * 0.72, state.shape);
      ctx.stroke();
    } else if (style === 'metallic_silver') {
      var mg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      mg.addColorStop(0, '#F8FAFC');
      mg.addColorStop(0.45, '#64748B');
      mg.addColorStop(1, '#E2E8F0');
      ctx.strokeStyle = mg;
      ctx.lineWidth = thick;
      traceFramePath(ctx, cx, cy, r, state.shape);
      ctx.stroke();
    } else if (style === 'double_sep') {
      ctx.strokeStyle = c1;
      ctx.lineWidth = Math.max(2, thick * 0.45);
      traceFramePath(ctx, cx, cy, r + thick * 0.35, state.shape);
      ctx.stroke();
      ctx.strokeStyle = c2;
      traceFramePath(ctx, cx, cy, r - thick * 0.45, state.shape);
      ctx.stroke();
    } else if (style === 'dashed_tech') {
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = thick;
      ctx.setLineDash([thick * 2.2, thick * 1.2]);
      traceFramePath(ctx, cx, cy, r, state.shape);
      ctx.stroke();
    } else if (style === 'dotted') {
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = thick;
      ctx.lineCap = 'round';
      ctx.setLineDash([1, thick * 1.8]);
      traceFramePath(ctx, cx, cy, r, state.shape);
      ctx.stroke();
    } else if (style === 'arc_4seg') {
      ctx.lineWidth = thick;
      ctx.lineCap = 'round';
      for (var q = 0; q < 4; q++) {
        ctx.beginPath();
        ctx.strokeStyle = q % 2 === 0 ? c1 : c2;
        var a0 = q * (Math.PI * 0.5) + 0.14;
        var a1 = (q + 1) * (Math.PI * 0.5) - 0.14;
        ctx.arc(cx, cy, r, a0, a1);
        ctx.stroke();
      }
    } else if (style === 'angled_sweep') {
      var swg = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      swg.addColorStop(0, rgbaStr(c1, 0));
      swg.addColorStop(0.5, c1);
      swg.addColorStop(1, c2);
      ctx.strokeStyle = swg;
      ctx.lineWidth = thick;
      traceFramePath(ctx, cx, cy, r, state.shape);
      ctx.stroke();
    } else if (style === 'inner_white') {
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = thick;
      traceFramePath(ctx, cx, cy, r, state.shape);
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(2, thick * 0.4);
      traceFramePath(ctx, cx, cy, r - thick * 0.72, state.shape);
      ctx.stroke();
    } else if (style === 'glass_frost') {
      ctx.strokeStyle = 'rgba(255,255,255,0.58)';
      ctx.lineWidth = Math.max(4, thick * 1.15);
      traceFramePath(ctx, cx, cy, r, state.shape);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 2;
      traceFramePath(ctx, cx, cy, r - thick * 0.65, state.shape);
      ctx.stroke();
    } else if (style === 'rim_light') {
      ctx.shadowColor = rgbaStr(c2, 0.8);
      ctx.shadowBlur = Math.max(12, S * 0.025);
      ctx.strokeStyle = rgbaStr(c2, 0.9);
      ctx.lineWidth = Math.max(3, thick * 0.5);
      traceFramePath(ctx, cx, cy, r, state.shape);
      ctx.stroke();
    } else {
      /* popout_3d, popout_glow, float_shadow, inner_depth */
      if (style === 'popout_glow') {
        ctx.shadowColor = rgbaStr(c2, 0.75);
        ctx.shadowBlur = Math.max(12, S * 0.025);
      }
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = thick;
      traceFramePath(ctx, cx, cy, r, state.shape);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ----- Curved Text & Status Badges ----- */
  function drawCurvedTextArc(ctx, textStr, cx, cy, radius, pos, color, fontId, S, scalePx) {
    if (!textStr) return;
    var fontObj = getFontObj(fontId);
    ensureFontLoaded(fontObj);
    var isArabic = /[\u0600-\u06FF]/.test(textStr);
    var fontSize = Math.round((scalePx / 1080) * S);

    ctx.save();
    ctx.font = fontObj.weight + ' ' + fontSize + 'px ' + fontObj.css;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(2, 6, 23, 0.5)';
    ctx.shadowBlur = Math.max(2, fontSize * 0.14);

    if (isArabic) {
      /* Split by words so Arabic cursive ligatures stay connected along the arc */
      var words = textStr.trim().split(/\s+/).reverse();
      var totalW = words.reduce(function (acc, w, idx) {
        return acc + ctx.measureText(w).width + (idx < words.length - 1 ? fontSize * 0.35 : 0);
      }, 0);
      var totalAngle = Math.min(Math.PI * 0.85, totalW / radius);
      var startAngle = pos === 'bottom' ? (Math.PI * 0.5 + totalAngle * 0.5) : (-Math.PI * 0.5 - totalAngle * 0.5);
      var curAngle = startAngle;

      words.forEach(function (word, wi) {
        var ww = ctx.measureText(word).width + (wi < words.length - 1 ? fontSize * 0.35 : 0);
        var wAng = (ww / totalW) * totalAngle;
        var midAng = pos === 'bottom' ? (curAngle - wAng * 0.5) : (curAngle + wAng * 0.5);
        ctx.save();
        ctx.translate(cx + Math.cos(midAng) * radius, cy + Math.sin(midAng) * radius);
        ctx.rotate(pos === 'bottom' ? (midAng - Math.PI * 0.5) : (midAng + Math.PI * 0.5));
        ctx.fillText(word, 0, 0);
        ctx.restore();
        curAngle += (pos === 'bottom' ? -wAng : wAng);
      });
    } else {
      var chars = textStr.split('');
      var widths = chars.map(function (ch) { return Math.max(fontSize * 0.28, ctx.measureText(ch).width + fontSize * 0.08); });
      var totalW2 = widths.reduce(function (a, b) { return a + b; }, 0);
      var totalAng2 = Math.min(Math.PI * 0.92, totalW2 / radius);
      var curA = pos === 'bottom' ? (Math.PI * 0.5 + totalAng2 * 0.5) : (-Math.PI * 0.5 - totalAng2 * 0.5);

      chars.forEach(function (ch, idx) {
        var cAng = (widths[idx] / totalW2) * totalAng2;
        var mAng = pos === 'bottom' ? (curA - cAng * 0.5) : (curA + cAng * 0.5);
        ctx.save();
        ctx.translate(cx + Math.cos(mAng) * radius, cy + Math.sin(mAng) * radius);
        ctx.rotate(pos === 'bottom' ? (mAng - Math.PI * 0.5) : (mAng + Math.PI * 0.5));
        ctx.fillText(ch, 0, 0);
        ctx.restore();
        curA += (pos === 'bottom' ? -cAng : cAng);
      });
    }
    ctx.restore();
  }

  function drawStatusBadge(ctx, cx, cy, r, S) {
    if (state.badge === 'none') return;

    if (state.badge === 'opentowork' || state.badge === 'hiring' || state.badge === 'custom') {
      var col = state.badge === 'opentowork' ? '#16A34A' : (state.badge === 'hiring' ? '#7C3AED' : sanitizeHex(state.customBadgeCol, '#16A34A'));
      var label = state.badge === 'opentowork' ? '#OPENTOWORK' : (state.badge === 'hiring' ? '#HIRING' : (state.customBadgeText || '#AVAILABLE').trim());
      if (!label) return;

      var bandW = S * 0.092;
      var bandR = r - bandW * 0.5;
      ctx.save();
      traceFramePath(ctx, cx, cy, r, state.shape);
      ctx.clip();

      var startA = Math.PI * 0.16;
      var endA = Math.PI * 0.84;
      var grad = ctx.createLinearGradient(cx - r * 0.82, cy, cx + r * 0.82, cy);
      grad.addColorStop(0, rgbaStr(col, 0));
      grad.addColorStop(0.18, col);
      grad.addColorStop(0.82, col);
      grad.addColorStop(1, rgbaStr(col, 0));

      ctx.strokeStyle = grad;
      ctx.lineWidth = bandW;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, bandR, startA, endA);
      ctx.stroke();
      ctx.restore();

      drawCurvedTextArc(ctx, label, cx, cy, bandR, 'bottom', '#FFFFFF', 'montserrat', S, 46);
      return;
    }

    /* Corner Verified Check or Creator Star Badge */
    var bx = cx + r * 0.72;
    var by = cy + r * 0.72;
    var br = S * 0.088;
    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, 0.35)';
    ctx.shadowBlur = S * 0.018;
    ctx.fillStyle = state.badge === 'verified' ? '#1D9BF0' : '#F59E0B';

    /* 8-point Scalloped Seal */
    ctx.beginPath();
    var spikes = 8;
    for (var i = 0; i < spikes * 2; i++) {
      var a = (i / (spikes * 2)) * Math.PI * 2;
      var radS = i % 2 === 0 ? br : br * 0.82;
      var px = bx + Math.cos(a) * radS;
      var py = by + Math.sin(a) * radS;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = Math.max(2, S * 0.008);
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    if (state.badge === 'verified') {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(3, S * 0.015);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(bx - br * 0.36, by + br * 0.02);
      ctx.lineTo(bx - br * 0.08, by + br * 0.30);
      ctx.lineTo(bx + br * 0.40, by - br * 0.28);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      for (var st = 0; st < 10; st++) {
        var sa = (st / 10) * Math.PI * 2 - Math.PI / 2;
        var sr = st % 2 === 0 ? br * 0.48 : br * 0.22;
        var sx = bx + Math.cos(sa) * sr;
        var sy = by + Math.sin(sa) * sr;
        if (st === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /* ----- Master Avatar Composition Renderer (Preview & 1080px Export) ----- */
  function renderAvatarToCanvas(canvas, targetS, transparentOuter) {
    if (!canvas) return;
    if (canvas.width !== targetS || canvas.height !== targetS) {
      canvas.width = targetS;
      canvas.height = targetS;
    }
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, targetS, targetS);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (!transparentOuter) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetS, targetS);
    }

    var cx = targetS * 0.5;
    var cy = targetS * 0.5;
    var margin = targetS * 0.092;
    var r = targetS * 0.5 - margin;

    /* 1. Outer Drop Shadow & Outer Glow */
    var dropAmt = state.dropShadow / 100;
    var glowAmt = state.outerGlow / 100;
    if (state.ringStyle === 'float_shadow') dropAmt = Math.max(dropAmt, 0.6);

    if (glowAmt > 0) {
      ctx.save();
      ctx.shadowColor = rgbaStr(sanitizeHex(state.ringCol2, '#06B6D4'), glowAmt * 0.78);
      ctx.shadowBlur = targetS * (0.04 + glowAmt * 0.07);
      ctx.fillStyle = rgbaStr(sanitizeHex(state.ringCol1, '#1D4ED8'), 0.25);
      traceFramePath(ctx, cx, cy, r, state.shape);
      ctx.fill();
      ctx.restore();
    }

    if (dropAmt > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(2, 6, 23, ' + (dropAmt * 0.55).toFixed(3) + ')';
      ctx.shadowBlur = targetS * (0.02 + dropAmt * 0.055);
      ctx.shadowOffsetY = targetS * (0.01 + dropAmt * 0.022);
      ctx.fillStyle = '#0F172A';
      traceFramePath(ctx, cx, cy, r, state.shape);
      ctx.fill();
      ctx.restore();
    }

    /* Prepare Transformed Foreground */
    var hasSubject = renderTransformedSubject(targetS);

    /* 2. Clipped Interior (Backdrop + Optional Backlight + Subject) */
    ctx.save();
    traceFramePath(ctx, cx, cy, r, state.shape);
    ctx.clip();

    renderBackdrop(ctx, targetS);

    if (state.ringStyle === 'popout_glow' && hasSubject) {
      var bgGlow = ctx.createRadialGradient(cx, cy * 0.85, 0, cx, cy * 0.85, r * 0.92);
      bgGlow.addColorStop(0, rgbaStr(sanitizeHex(state.ringCol2, '#06B6D4'), 0.65));
      bgGlow.addColorStop(1, rgbaStr(sanitizeHex(state.ringCol1, '#1D4ED8'), 0));
      ctx.fillStyle = bgGlow;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    if (hasSubject) {
      ctx.drawImage(fgTempCanvas, 0, 0);
    }
    ctx.restore();

    /* 3. Ring / Border Style */
    drawRingStyle(ctx, cx, cy, r, targetS);

    /* 4. 3D Pop-Out Top Layer (head pops cleanly above top arc while torso stays inside) */
    if ((state.ringStyle === 'popout_3d' || state.ringStyle === 'popout_glow') && hasSubject && state.hasCutout && state.useCutoutBg) {
      var innerR = Math.max(10, r - ((state.ringThickness / 1080) * targetS) * 0.52);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - innerR, cy);
      ctx.lineTo(cx - innerR, 0);
      ctx.lineTo(cx + innerR, 0);
      ctx.lineTo(cx + innerR, cy);
      ctx.arc(cx, cy, innerR, 0, Math.PI, false);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(fgTempCanvas, 0, 0);
      ctx.restore();
    }

    /* 5. Status Badges & Curved Text */
    drawStatusBadge(ctx, cx, cy, r, targetS);
    if (state.curvedText && state.curvedText.trim()) {
      var textR = r + Math.max(targetS * 0.036, ((state.ringThickness / 1080) * targetS) * 0.9);
      drawCurvedTextArc(ctx, state.curvedText.trim(), cx, cy, textR, state.curvedPos, sanitizeHex(state.curvedTextColor, '#FFFFFF'), state.curvedFontId, targetS, 42);
    }
  }

  function renderPreview() {
    if (!pfpPreviewCanvas || !state.originalImage) return;
    renderAvatarToCanvas(pfpPreviewCanvas, PREVIEW_SIZE, true);
    if (state.isPeeking && pfpOrigPeekCanvas) {
      var pctx = pfpOrigPeekCanvas.getContext('2d');
      pctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
      var scale = getBaseCoverScale(PREVIEW_SIZE) * (state.zoomPct / 100);
      pctx.save();
      pctx.translate(PREVIEW_SIZE * 0.5 + state.panX, PREVIEW_SIZE * 0.5 + state.panY);
      pctx.rotate((state.tiltDeg * Math.PI) / 180);
      pctx.scale(scale * (state.flipH ? -1 : 1), scale);
      pctx.rotate((state.rot90 * Math.PI) / 180);
      pctx.drawImage(state.originalImage, -state.origWidth * 0.5, -state.origHeight * 0.5);
      pctx.restore();
    }
  }

  function scheduleRender() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      renderPreview();
    });
  }

  /* ----- Edge Refine Brush Painting ----- */
  function canvasPointToImagePoint(clientX, clientY) {
    if (!pfpPreviewCanvas || !state.origWidth) return null;
    var rect = pfpPreviewCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    var cx = ((clientX - rect.left) / rect.width) * PREVIEW_SIZE;
    var cy = ((clientY - rect.top) / rect.height) * PREVIEW_SIZE;

    var scale = getBaseCoverScale(PREVIEW_SIZE) * (state.zoomPct / 100);
    var dx = cx - (PREVIEW_SIZE * 0.5 + state.panX);
    var dy = cy - (PREVIEW_SIZE * 0.5 + state.panY);

    var tiltR = -(state.tiltDeg * Math.PI) / 180;
    var tx = dx * Math.cos(tiltR) - dy * Math.sin(tiltR);
    var ty = dx * Math.sin(tiltR) + dy * Math.cos(tiltR);

    tx /= scale * (state.flipH ? -1 : 1);
    ty /= scale;

    var rotR = -(state.rot90 * Math.PI) / 180;
    var rx = tx * Math.cos(rotR) - ty * Math.sin(rotR);
    var ry = tx * Math.sin(rotR) + ty * Math.cos(rotR);

    return {
      ix: rx + state.origWidth * 0.5,
      iy: ry + state.origHeight * 0.5,
      radiusOrig: Math.max(2, (state.brushSizePx * 0.5) / scale),
    };
  }

  function paintMaskAt(ix, iy, radiusOrig, mode) {
    if (!state.maskAlpha || !state.origImageData) return;
    var w = state.origWidth;
    var h = state.origHeight;
    var rCeil = Math.ceil(radiusOrig);
    var x0 = Math.max(0, Math.floor(ix - rCeil));
    var x1 = Math.min(w - 1, Math.ceil(ix + rCeil));
    var y0 = Math.max(0, Math.floor(iy - rCeil));
    var y1 = Math.min(h - 1, Math.ceil(iy + rCeil));
    var r2 = radiusOrig * radiusOrig;
    var softStart = radiusOrig * 0.55;

    var sData = subjectCtx.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    var sPix = sData.data;
    var oPix = state.origImageData.data;
    var sw = x1 - x0 + 1;

    for (var py = y0; py <= y1; py++) {
      var dy = py - iy;
      for (var px = x0; px <= x1; px++) {
        var dx = px - ix;
        var dist2 = dx * dx + dy * dy;
        if (dist2 > r2) continue;
        var dist = Math.sqrt(dist2);
        var strength = dist <= softStart ? 1 : clamp(1 - (dist - softStart) / Math.max(1, radiusOrig - softStart), 0, 1);
        var mIdx = py * w + px;
        var curA = state.maskAlpha[mIdx];
        var nextA = mode === 'restore'
          ? Math.max(curA, Math.round(curA + (255 - curA) * strength))
          : Math.min(curA, Math.round(curA * (1 - strength)));
        state.maskAlpha[mIdx] = nextA;

        var lp4 = ((py - y0) * sw + (px - x0)) * 4;
        var op4 = mIdx * 4;
        sPix[lp4 + 3] = Math.round((oPix[op4 + 3] * nextA) / 255);
      }
    }
    subjectCtx.putImageData(sData, x0, y0);
  }

  function paintLine(x0, y0, x1, y1, rOrig, mode) {
    var dist = Math.hypot(x1 - x0, y1 - y0);
    var step = Math.max(1, rOrig * 0.28);
    var steps = Math.max(1, Math.ceil(dist / step));
    for (var s = 0; s <= steps; s++) {
      var f = s / steps;
      paintMaskAt(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, rOrig, mode);
    }
  }

  /* ----- Dynamic Preset Grids & Font Picker ----- */
  function drawBgSwatchPreview(el, preset) {
    if (preset.cat === 'solid') {
      el.style.background = preset.colors[0];
    } else if (preset.cat === 'gradient') {
      el.style.background = 'linear-gradient(135deg, ' + preset.colors.join(', ') + ')';
    } else if (preset.colors.length >= 2) {
      el.style.background = 'radial-gradient(circle at 35% 35%, ' + preset.colors[1] + ', ' + preset.colors[0] + ')';
    }
  }

  function renderBgGrid() {
    if (!pfpBgGrid) return;
    while (pfpBgGrid.firstChild) pfpBgGrid.removeChild(pfpBgGrid.firstChild);

    BG_PRESETS.filter(function (p) {
      return state.bgCat === 'all' || p.cat === state.bgCat;
    }).forEach(function (preset) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pfp-bg-item' + (state.bgId === preset.id ? ' active' : '');
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', state.bgId === preset.id ? 'true' : 'false');
      btn.setAttribute('title', t(preset.key));

      var swatch = document.createElement('span');
      swatch.className = 'pfp-bg-swatch';
      drawBgSwatchPreview(swatch, preset);

      var lbl = document.createElement('span');
      lbl.className = 'pfp-bg-name';
      lbl.textContent = t(preset.key);

      btn.appendChild(swatch);
      btn.appendChild(lbl);

      btn.addEventListener('click', function () {
        pushUndo(false);
        state.bgId = preset.id;
        renderBgGrid();
        scheduleRender();
      });

      pfpBgGrid.appendChild(btn);
    });
  }

  function renderRingGrid() {
    if (!pfpRingGrid) return;
    while (pfpRingGrid.firstChild) pfpRingGrid.removeChild(pfpRingGrid.firstChild);

    RING_STYLES.forEach(function (rs) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pfp-ring-btn' + (state.ringStyle === rs.id ? ' active' : '');
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', state.ringStyle === rs.id ? 'true' : 'false');
      btn.textContent = t(rs.key);
      btn.addEventListener('click', function () {
        pushUndo(false);
        state.ringStyle = rs.id;
        renderRingGrid();
        scheduleRender();
      });
      pfpRingGrid.appendChild(btn);
    });
  }

  function renderFontModalList() {
    if (!pfpFontList) return;
    while (pfpFontList.firstChild) pfpFontList.removeChild(pfpFontList.firstChild);

    var groups = [
      { key: 'ar', titleKey: 'pfp_fonts_ar' },
      { key: 'en', titleKey: 'pfp_fonts_en' },
    ];
    groups.forEach(function (grp) {
      var hdr = document.createElement('div');
      hdr.className = 'pfp-font-group-title';
      hdr.textContent = t(grp.titleKey);
      pfpFontList.appendChild(hdr);

      var grid = document.createElement('div');
      grid.className = 'pfp-font-grid';
      FONT_LIBRARY.filter(function (f) { return f.group === grp.key; }).forEach(function (f) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pfp-font-card' + (state.curvedFontId === f.id ? ' active' : '');

        var name = document.createElement('span');
        name.className = 'pfp-font-card-name';
        name.textContent = f.label;

        var sample = document.createElement('span');
        sample.className = 'pfp-font-card-sample';
        sample.style.fontFamily = f.css;
        sample.style.fontWeight = f.weight;
        sample.textContent = f.sample;

        btn.appendChild(sample);
        btn.appendChild(name);
        btn.addEventListener('click', function () {
          pushUndo(false);
          state.curvedFontId = f.id;
          ensureFontLoaded(f);
          if (pfpFontName) pfpFontName.textContent = f.label;
          closeFontModal();
          scheduleRender();
        });
        grid.appendChild(btn);
      });
      pfpFontList.appendChild(grid);
    });
  }

  /* ----- Sync All UI ----- */
  function syncAllUI() {
    var hasImg = Boolean(state.originalImage);
    if (pfpEmptyState) pfpEmptyState.classList.toggle('hide', hasImg);
    if (pfpCanvasWrap) pfpCanvasWrap.classList.toggle('hide', !hasImg);
    if (btnReplacePhoto) btnReplacePhoto.classList.toggle('hide', !hasImg);

    var shapeKey = SHAPE_KEYS[state.shape] || 'pfp_shape_circle';
    if (pfpShapeBadge) {
      pfpShapeBadge.setAttribute('data-i18n', shapeKey);
      pfpShapeBadge.textContent = t(shapeKey);
    }
    if (pfpExportSummary) {
      pfpExportSummary.textContent = EXPORT_SIZE + ' × ' + EXPORT_SIZE + ' px · ' + t(shapeKey);
    }

    var canBrush = hasImg && state.hasCutout && state.useCutoutBg;
    if (btnBrushRestore) btnBrushRestore.disabled = !canBrush;
    if (btnBrushErase) btnBrushErase.disabled = !canBrush;
    if (!canBrush && state.brushMode) state.brushMode = null;

    if (btnToolPan) btnToolPan.classList.toggle('active', !state.brushMode);
    if (btnBrushRestore) btnBrushRestore.classList.toggle('active', state.brushMode === 'restore');
    if (btnBrushErase) btnBrushErase.classList.toggle('active', state.brushMode === 'erase');
    if (pfpCanvasWrap) {
      pfpCanvasWrap.style.cursor = state.brushMode ? 'crosshair' : 'grab';
    }

    if (pfpBrushSize) pfpBrushSize.value = String(state.brushSizePx);
    if (pfpBrushSizeVal) pfpBrushSizeVal.textContent = state.brushSizePx + ' px';
    if (pfpZoom) pfpZoom.value = String(state.zoomPct);
    if (pfpZoomVal) pfpZoomVal.textContent = state.zoomPct + '%';
    if (pfpTilt) pfpTilt.value = String(state.tiltDeg);
    if (pfpTiltVal) pfpTiltVal.textContent = state.tiltDeg + '°';
    if (pfpBrightness) pfpBrightness.value = String(state.brightness);
    if (pfpBrightnessVal) pfpBrightnessVal.textContent = String(state.brightness);
    if (pfpContrast) pfpContrast.value = String(state.contrast);
    if (pfpContrastVal) pfpContrastVal.textContent = String(state.contrast);
    if (pfpWarmth) pfpWarmth.value = String(state.warmth);
    if (pfpWarmthVal) pfpWarmthVal.textContent = String(state.warmth);
    if (pfpBwToggle) pfpBwToggle.checked = Boolean(state.bw);

    if (pfpGradAngle) pfpGradAngle.value = String(state.gradAngle);
    if (pfpGradAngleVal) pfpGradAngleVal.textContent = state.gradAngle + '°';
    if (pfpBgColor1) pfpBgColor1.value = sanitizeHex(state.customBg1, '#1D4ED8');
    if (pfpBgColor2) pfpBgColor2.value = sanitizeHex(state.customBg2, '#06B6D4');

    shapeBtns.forEach(function (b) {
      var active = b.getAttribute('data-shape') === state.shape;
      b.classList.toggle('active', active);
      b.setAttribute('aria-checked', active ? 'true' : 'false');
    });

    if (pfpRingThickness) pfpRingThickness.value = String(state.ringThickness);
    if (pfpRingThicknessVal) pfpRingThicknessVal.textContent = state.ringThickness + ' px';
    if (pfpDropShadow) pfpDropShadow.value = String(state.dropShadow);
    if (pfpDropShadowVal) pfpDropShadowVal.textContent = state.dropShadow + '%';
    if (pfpInnerShadow) pfpInnerShadow.value = String(state.innerShadow);
    if (pfpInnerShadowVal) pfpInnerShadowVal.textContent = state.innerShadow + '%';
    if (pfpOuterGlow) pfpOuterGlow.value = String(state.outerGlow);
    if (pfpOuterGlowVal) pfpOuterGlowVal.textContent = state.outerGlow + '%';
    if (pfpRingCol1) pfpRingCol1.value = sanitizeHex(state.ringCol1, '#1D4ED8');
    if (pfpRingCol2) pfpRingCol2.value = sanitizeHex(state.ringCol2, '#06B6D4');

    badgeBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-badge') === state.badge);
    });
    if (pfpCustomBadgeBox) pfpCustomBadgeBox.classList.toggle('hide', state.badge !== 'custom');

    var fontObj = getFontObj(state.curvedFontId);
    if (pfpFontName) pfpFontName.textContent = fontObj.label;
    curvedPosBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-pos') === state.curvedPos);
    });

    renderBgGrid();
    renderRingGrid();
    syncUndoButtons();
  }

  /* ----- File Validation & Upload ----- */
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

  function isValidImageFile(file) {
    if (!file) return false;
    var type = resolveImageMime(file);
    if (!ALLOWED_MIMES[type]) {
      toast(t('pfp_err_type'), 'err');
      return false;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast(t('pfp_err_size'), 'err');
      return false;
    }
    return type;
  }

  function loadImageFromObjectUrl(file, url, gen) {
    state.objectURL = url;
    var img = new Image();
    img.onload = function () {
      if (gen !== state.loadGen) {
        try { URL.revokeObjectURL(url); } catch (_e) {}
        return;
      }
      var nw = img.naturalWidth || img.width;
      var nh = img.naturalHeight || img.height;
      if (!nw || !nh || nw > MAX_IMAGE_DIM || nh > MAX_IMAGE_DIM) {
        revokeObjectUrl();
        toast(t('pfp_err_dims'), 'err');
        return;
      }

      state.currentFile = file;
      state.currentFileName = sanitizeFilenameBase(file.name);
      state.originalImage = img;
      state.origWidth = nw;
      state.origHeight = nh;

      subjectCanvas.width = nw;
      subjectCanvas.height = nh;
      subjectCtx.clearRect(0, 0, nw, nh);
      subjectCtx.drawImage(img, 0, 0, nw, nh);
      state.origImageData = subjectCtx.getImageData(0, 0, nw, nh);

      state.hasCutout = false;
      state.useCutoutBg = true;
      state.maskAlpha = null;
      state.brushMode = null;
      state.panX = 0;
      state.panY = 0;
      state.zoomPct = 108;
      state.tiltDeg = 0;
      state.rot90 = 0;
      state.flipH = false;
      undoStack.length = 0;
      redoStack.length = 0;

      revokeObjectUrl();
      syncAllUI();
      scheduleRender();
      startSilentPreload();
      toast(t('pfp_loaded_ok'), 'ok');
    };
    img.onerror = function () {
      try { URL.revokeObjectURL(url); } catch (_e) {}
      if (gen === state.loadGen) state.objectURL = null;
      toast(t('pfp_err_type'), 'err');
    };
    img.src = url;
  }

  function handleFileSelected(file) {
    var mime = isValidImageFile(file);
    if (!mime) return;
    var gen = ++state.loadGen;
    revokeObjectUrl();

    if (mime === 'image/svg+xml') {
      sanitizeSvgFileToBlobUrl(file).then(function (safeUrl) {
        if (gen !== state.loadGen) {
          try { URL.revokeObjectURL(safeUrl); } catch (_e) {}
          return;
        }
        loadImageFromObjectUrl(file, safeUrl, gen);
      }).catch(function () {
        if (gen === state.loadGen) toast(t('pfp_err_type'), 'err');
      });
      return;
    }

    var url = URL.createObjectURL(file);
    loadImageFromObjectUrl(file, url, gen);
  }

  function clearWorkspace() {
    state.loadGen++;
    revokeObjectUrl();
    state.currentFile = null;
    state.originalImage = null;
    state.origWidth = 0;
    state.origHeight = 0;
    state.origImageData = null;
    state.hasCutout = false;
    state.maskAlpha = null;
    state.brushMode = null;
    undoStack.length = 0;
    redoStack.length = 0;
    cleanupCanvas(subjectCanvas);
    cleanupCanvas(fgTempCanvas);
    cleanupCanvas(bgBlurCanvas);
    if (pfpFileInput) pfpFileInput.value = '';
    syncAllUI();
  }

  /* ----- Modals & Social Preview ----- */
  function openFontModal() {
    renderFontModalList();
    if (pfpFontModal) pfpFontModal.classList.remove('hide');
  }

  function closeFontModal() {
    if (pfpFontModal) pfpFontModal.classList.add('hide');
  }

  function openSocialModal() {
    if (!state.originalImage) {
      toast(t('pfp_err_no_photo'), 'err');
      return;
    }
    var snapCanvas = document.createElement('canvas');
    renderAvatarToCanvas(snapCanvas, 512, false);
    var dataUrl = snapCanvas.toDataURL('image/png');
    cleanupCanvas(snapCanvas);

    $$('.pfp-soc-avatar', pfpSocialStage).forEach(function (im) {
      im.src = dataUrl;
    });
    if (pfpSocialStage) pfpSocialStage.classList.toggle('is-dark', state.socialDark);
    if (pfpSocialModal) pfpSocialModal.classList.remove('hide');
  }

  function closeSocialModal() {
    if (pfpSocialModal) pfpSocialModal.classList.add('hide');
  }

  function openExportModal() {
    if (!state.originalImage) {
      toast(t('pfp_err_no_photo'), 'err');
      return;
    }
    syncAllUI();
    if (pfpExportModal) pfpExportModal.classList.remove('hide');
  }

  function closeExportModal() {
    if (pfpExportModal) pfpExportModal.classList.add('hide');
  }

  function canvasToBlobAsync(c, mime, q) {
    return new Promise(function (resolve) {
      c.toBlob(function (blob) { resolve(blob); }, mime, q);
    });
  }

  function downloadBlobSafe(blob, filename) {
    if (typeof I.triggerDownload === 'function') {
      I.triggerDownload(blob, filename);
      return;
    }
    var u = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = u;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      if (a.parentNode) a.parentNode.removeChild(a);
      try { URL.revokeObjectURL(u); } catch (_e) {}
    }, 2500);
  }

  async function handleExport(format) {
    if (!state.originalImage) {
      toast(t('pfp_err_no_photo'), 'err');
      return;
    }
    var base = sanitizeFilenameBase(state.currentFileName) + '-imgsfix-pfp';

    if (format === 'zip') {
      var zipCanvas = document.createElement('canvas');
      try {
        var zip = new JSZip();
        var targets = [
          { name: 'Facebook_800x800.png', size: 800 },
          { name: 'TikTok_800x800.png', size: 800 },
          { name: 'WhatsApp_512x512.png', size: 512 },
          { name: 'Telegram_512x512.png', size: 512 },
          { name: 'Snapchat_512x512.png', size: 512 },
          { name: 'Instagram_512x512.png', size: 512 },
          { name: 'LinkedIn_800x800.png', size: 800 },
          { name: 'X_Twitter_400x400.png', size: 400 },
          { name: 'YouTube_800x800.png', size: 800 },
          { name: 'Discord_512x512.png', size: 512 },
        ];
        for (var i = 0; i < targets.length; i++) {
          renderAvatarToCanvas(zipCanvas, targets[i].size, true);
          var blobItem = await canvasToBlobAsync(zipCanvas, 'image/png', 1.0);
          if (blobItem) zip.file(targets[i].name, blobItem);
        }
        cleanupCanvas(zipCanvas);
        var zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlobSafe(zipBlob, base + '-social-pack.zip');
        toast(t('pfp_export_ok'), 'ok');
      } catch (err) {
        cleanupCanvas(zipCanvas);
        console.error('ZIP export error:', err);
        toast(t('pfp_export_err'), 'err');
      }
      return;
    }

    var outCanvas = document.createElement('canvas');
    try {
      var isPng = format === 'png';
      renderAvatarToCanvas(outCanvas, EXPORT_SIZE, isPng);
      var mime = isPng ? 'image/png' : 'image/jpeg';
      var ext = isPng ? 'png' : 'jpg';
      var blobOut = await canvasToBlobAsync(outCanvas, mime, isPng ? 1.0 : 0.95);
      cleanupCanvas(outCanvas);
      if (!blobOut) {
        toast(t('pfp_export_err'), 'err');
        return;
      }
      downloadBlobSafe(blobOut, base + '-1080px.' + ext);
      toast(t('pfp_export_ok'), 'ok');
    } catch (err) {
      cleanupCanvas(outCanvas);
      console.error('PFP export error:', err);
      toast(t('pfp_export_err'), 'err');
    }
  }

  /* ----- Auto-Center & Peek ----- */
  function autoCenterAvatar() {
    if (!state.originalImage) return;
    pushUndo(false);
    state.panX = 0;
    state.panY = state.hasCutout ? 18 : 0;
    state.zoomPct = 108;
    state.tiltDeg = 0;
    syncAllUI();
    scheduleRender();
  }

  function setPeek(active) {
    if (!state.originalImage) return;
    state.isPeeking = active;
    if (pfpOrigPeekCanvas) pfpOrigPeekCanvas.classList.toggle('hide', !active);
    scheduleRender();
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

  if (btnUploadEmpty && pfpFileInput) btnUploadEmpty.addEventListener('click', function () { pfpFileInput.click(); });
  if (btnReplacePhoto && pfpFileInput) btnReplacePhoto.addEventListener('click', function () { pfpFileInput.click(); });
  if (pfpFileInput) {
    pfpFileInput.addEventListener('change', function () {
      if (pfpFileInput.files && pfpFileInput.files[0]) handleFileSelected(pfpFileInput.files[0]);
    });
  }
  if (pfpViewport) {
    pfpViewport.addEventListener('dragover', function (e) {
      e.preventDefault();
      pfpViewport.classList.add('is-dragover');
    });
    pfpViewport.addEventListener('dragleave', function () {
      pfpViewport.classList.remove('is-dragover');
    });
    pfpViewport.addEventListener('drop', function (e) {
      e.preventDefault();
      pfpViewport.classList.remove('is-dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    });
  }

  /* Canvas Pointer Gestures: Pan, Pinch-Zoom, Restore/Erase Brush */
  if (pfpCanvasWrap) {
    pfpCanvasWrap.addEventListener('pointerdown', function (e) {
      if (!state.originalImage) return;
      pfpCanvasWrap.setPointerCapture(e.pointerId);
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 2) {
        isPanning = false;
        state.isPainting = false;
        var pts = Array.from(activePointers.values());
        pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        pinchStartZoom = state.zoomPct;
        return;
      }

      if (state.brushMode && state.hasCutout && state.useCutoutBg) {
        var pt = canvasPointToImagePoint(e.clientX, e.clientY);
        if (!pt) return;
        state.isPainting = true;
        state.preStrokeMask = state.maskAlpha ? new Uint8ClampedArray(state.maskAlpha) : null;
        state.strokeDirty = true;
        state.lastPaintX = pt.ix;
        state.lastPaintY = pt.iy;
        paintMaskAt(pt.ix, pt.iy, pt.radiusOrig, state.brushMode);
        scheduleRender();
      } else {
        pushUndo(false);
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panOrigX = state.panX;
        panOrigY = state.panY;
        pfpCanvasWrap.style.cursor = 'grabbing';
      }
    });

    pfpCanvasWrap.addEventListener('pointermove', function (e) {
      if (pfpBrushCursor && state.brushMode && state.hasCutout && state.useCutoutBg) {
        var rect = pfpCanvasWrap.getBoundingClientRect();
        var dispDiameter = Math.max(8, (state.brushSizePx / PREVIEW_SIZE) * rect.width);
        pfpBrushCursor.style.width = dispDiameter + 'px';
        pfpBrushCursor.style.height = dispDiameter + 'px';
        pfpBrushCursor.style.left = (e.clientX - rect.left) + 'px';
        pfpBrushCursor.style.top = (e.clientY - rect.top) + 'px';
        pfpBrushCursor.classList.remove('hide');
      } else if (pfpBrushCursor) {
        pfpBrushCursor.classList.add('hide');
      }

      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 2 && pinchStartDist > 0) {
        var pts = Array.from(activePointers.values());
        var curDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        state.zoomPct = Math.round(clamp(pinchStartZoom * (curDist / pinchStartDist), 50, 260));
        if (pfpZoom) pfpZoom.value = String(state.zoomPct);
        if (pfpZoomVal) pfpZoomVal.textContent = state.zoomPct + '%';
        scheduleRender();
        return;
      }

      if (state.isPainting && state.brushMode) {
        var pt = canvasPointToImagePoint(e.clientX, e.clientY);
        if (!pt) return;
        paintLine(state.lastPaintX, state.lastPaintY, pt.ix, pt.iy, pt.radiusOrig, state.brushMode);
        state.lastPaintX = pt.ix;
        state.lastPaintY = pt.iy;
        scheduleRender();
      } else if (isPanning) {
        var rC = pfpCanvasWrap.getBoundingClientRect();
        var ratio = PREVIEW_SIZE / Math.max(100, rC.width);
        state.panX = Math.round(clamp(panOrigX + (e.clientX - panStartX) * ratio, -360, 360));
        state.panY = Math.round(clamp(panOrigY + (e.clientY - panStartY) * ratio, -360, 360));
        scheduleRender();
      }
    });

    function finishPointer(e) {
      activePointers.delete(e.pointerId);
      if (state.isPainting) {
        state.isPainting = false;
        if (state.strokeDirty && state.preStrokeMask) {
          pushUndo(true, state.preStrokeMask);
        }
        state.preStrokeMask = null;
        state.strokeDirty = false;
      }
      if (isPanning && activePointers.size === 0) {
        isPanning = false;
        pfpCanvasWrap.style.cursor = state.brushMode ? 'crosshair' : 'grab';
      }
      if (activePointers.size < 2) pinchStartDist = 0;
    }

    pfpCanvasWrap.addEventListener('pointerup', finishPointer);
    pfpCanvasWrap.addEventListener('pointercancel', finishPointer);
    pfpCanvasWrap.addEventListener('pointerleave', function () {
      if (pfpBrushCursor) pfpBrushCursor.classList.add('hide');
    });
    pfpCanvasWrap.addEventListener('wheel', function (e) {
      if (!state.originalImage) return;
      e.preventDefault();
      var delta = e.deltaY < 0 ? 6 : -6;
      state.zoomPct = clamp(state.zoomPct + delta, 50, 260);
      if (pfpZoom) pfpZoom.value = String(state.zoomPct);
      if (pfpZoomVal) pfpZoomVal.textContent = state.zoomPct + '%';
      scheduleRender();
    }, { passive: false });
  }

  /* AI Cutout & Brush Buttons */
  if (btnAutoCutout) btnAutoCutout.addEventListener('click', runAiCutout);
  if (btnKeepOriginalBg) {
    btnKeepOriginalBg.addEventListener('click', function () {
      if (!state.originalImage) return;
      pushUndo(false);
      state.useCutoutBg = false;
      state.brushMode = null;
      rebuildSubjectCanvasFromMask();
      syncAllUI();
      scheduleRender();
    });
  }
  if (btnToolPan) btnToolPan.addEventListener('click', function () { state.brushMode = null; syncAllUI(); });
  if (btnBrushRestore) btnBrushRestore.addEventListener('click', function () { if (!btnBrushRestore.disabled) { state.brushMode = 'restore'; syncAllUI(); } });
  if (btnBrushErase) btnBrushErase.addEventListener('click', function () { if (!btnBrushErase.disabled) { state.brushMode = 'erase'; syncAllUI(); } });

  if (btnUndoMask) btnUndoMask.addEventListener('click', handleUndo);
  if (btnMqUndo) btnMqUndo.addEventListener('click', handleUndo);
  if (btnRedoMask) btnRedoMask.addEventListener('click', handleRedo);

  function bindRange(el, valEl, key, suffix) {
    if (!el) return;
    var pushed = false;
    el.addEventListener('input', function () {
      if (!pushed) { pushUndo(false); pushed = true; }
      var v = parseInt(el.value, 10) || 0;
      state[key] = v;
      if (valEl) valEl.textContent = suffix ? (v + suffix) : String(v);
      scheduleRender();
    });
    el.addEventListener('change', function () { pushed = false; });
  }
  bindRange(pfpBrushSize, pfpBrushSizeVal, 'brushSizePx', ' px');
  bindRange(pfpZoom, pfpZoomVal, 'zoomPct', '%');
  bindRange(pfpTilt, pfpTiltVal, 'tiltDeg', '°');
  bindRange(pfpBrightness, pfpBrightnessVal, 'brightness', '');
  bindRange(pfpContrast, pfpContrastVal, 'contrast', '');
  bindRange(pfpWarmth, pfpWarmthVal, 'warmth', '');
  bindRange(pfpGradAngle, pfpGradAngleVal, 'gradAngle', '°');
  bindRange(pfpRingThickness, pfpRingThicknessVal, 'ringThickness', ' px');
  bindRange(pfpDropShadow, pfpDropShadowVal, 'dropShadow', '%');
  bindRange(pfpInnerShadow, pfpInnerShadowVal, 'innerShadow', '%');
  bindRange(pfpOuterGlow, pfpOuterGlowVal, 'outerGlow', '%');

  if (btnRot90) {
    btnRot90.addEventListener('click', function () {
      pushUndo(false);
      state.rot90 = (state.rot90 + 90) % 360;
      scheduleRender();
    });
  }
  if (btnFlipH) {
    btnFlipH.addEventListener('click', function () {
      pushUndo(false);
      state.flipH = !state.flipH;
      scheduleRender();
    });
  }
  if (pfpBwToggle) {
    pfpBwToggle.addEventListener('change', function () {
      pushUndo(false);
      state.bw = Boolean(pfpBwToggle.checked);
      scheduleRender();
    });
  }

  /* Backgrounds & Custom Colors */
  bgCatBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.bgCat = b.getAttribute('data-cat') || 'all';
      bgCatBtns.forEach(function (btn) { btn.classList.toggle('active', btn === b); });
      renderBgGrid();
    });
  });
  if (btnApplyCustomBg) {
    btnApplyCustomBg.addEventListener('click', function () {
      pushUndo(false);
      state.customBg1 = sanitizeHex(pfpBgColor1 ? pfpBgColor1.value : '#1D4ED8');
      state.customBg2 = sanitizeHex(pfpBgColor2 ? pfpBgColor2.value : '#06B6D4');
      state.bgId = 'custom';
      renderBgGrid();
      scheduleRender();
    });
  }
  [pfpBgColor1, pfpBgColor2].forEach(function (el, idx) {
    if (!el) return;
    el.addEventListener('input', function () {
      if (idx === 0) state.customBg1 = sanitizeHex(el.value);
      else state.customBg2 = sanitizeHex(el.value);
      if (state.bgId === 'custom') scheduleRender();
    });
  });

  /* Shapes, Rings & Badges */
  shapeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var sh = btn.getAttribute('data-shape');
      if (!sh || state.shape === sh) return;
      pushUndo(false);
      state.shape = sh;
      syncAllUI();
      scheduleRender();
    });
  });

  [pfpRingCol1, pfpRingCol2].forEach(function (el, idx) {
    if (!el) return;
    var pushed = false;
    el.addEventListener('input', function () {
      if (!pushed) { pushUndo(false); pushed = true; }
      if (idx === 0) state.ringCol1 = sanitizeHex(el.value);
      else state.ringCol2 = sanitizeHex(el.value);
      scheduleRender();
    });
    el.addEventListener('change', function () { pushed = false; });
  });

  badgeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var bg = btn.getAttribute('data-badge');
      if (!bg || state.badge === bg) return;
      pushUndo(false);
      state.badge = bg;
      syncAllUI();
      scheduleRender();
    });
  });
  if (pfpCustomBadgeText) {
    pfpCustomBadgeText.addEventListener('input', function () {
      state.customBadgeText = pfpCustomBadgeText.value;
      scheduleRender();
    });
  }
  if (pfpCustomBadgeCol) {
    pfpCustomBadgeCol.addEventListener('input', function () {
      state.customBadgeCol = sanitizeHex(pfpCustomBadgeCol.value, '#16A34A');
      scheduleRender();
    });
  }

  /* Curved Ring Text & 24-Font Picker */
  if (pfpCurvedText) {
    pfpCurvedText.addEventListener('input', function () {
      state.curvedText = pfpCurvedText.value;
      scheduleRender();
    });
  }
  if (pfpCurvedTextColor) {
    pfpCurvedTextColor.addEventListener('input', function () {
      state.curvedTextColor = sanitizeHex(pfpCurvedTextColor.value, '#FFFFFF');
      scheduleRender();
    });
  }
  curvedPosBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pos = btn.getAttribute('data-pos');
      if (!pos || state.curvedPos === pos) return;
      pushUndo(false);
      state.curvedPos = pos;
      syncAllUI();
      scheduleRender();
    });
  });

  if (btnPickFont) btnPickFont.addEventListener('click', openFontModal);
  if (btnCloseFontModal) btnCloseFontModal.addEventListener('click', closeFontModal);
  if (pfpFontModal) pfpFontModal.addEventListener('click', function (e) { if (e.target === pfpFontModal) closeFontModal(); });

  /* Stage Actions & Quickbar */
  if (btnAutoCenter) btnAutoCenter.addEventListener('click', autoCenterAvatar);
  if (btnStageCenter) btnStageCenter.addEventListener('click', autoCenterAvatar);
  if (btnMqCenter) btnMqCenter.addEventListener('click', autoCenterAvatar);

  if (btnResetFraming) {
    btnResetFraming.addEventListener('click', function () {
      if (!state.originalImage) return;
      pushUndo(false);
      state.panX = 0;
      state.panY = 0;
      state.zoomPct = 108;
      state.tiltDeg = 0;
      state.rot90 = 0;
      state.flipH = false;
      state.brightness = 0;
      state.contrast = 0;
      state.warmth = 0;
      state.bw = false;
      syncAllUI();
      scheduleRender();
    });
  }
  if (btnClearAll) btnClearAll.addEventListener('click', clearWorkspace);

  if (btnStagePeek) {
    btnStagePeek.addEventListener('pointerdown', function () { setPeek(true); });
    btnStagePeek.addEventListener('pointerup', function () { setPeek(false); });
    btnStagePeek.addEventListener('pointerleave', function () { setPeek(false); });
    btnStagePeek.addEventListener('pointercancel', function () { setPeek(false); });
  }

  /* Social Preview & Export Modals */
  if (btnOpenSocialModal) btnOpenSocialModal.addEventListener('click', openSocialModal);
  if (btnMqSocial) btnMqSocial.addEventListener('click', openSocialModal);
  if (btnCloseSocialModal) btnCloseSocialModal.addEventListener('click', closeSocialModal);
  if (pfpSocialModal) pfpSocialModal.addEventListener('click', function (e) { if (e.target === pfpSocialModal) closeSocialModal(); });
  if (btnSocialThemeToggle) {
    btnSocialThemeToggle.addEventListener('click', function () {
      state.socialDark = !state.socialDark;
      if (pfpSocialStage) pfpSocialStage.classList.toggle('is-dark', state.socialDark);
    });
  }

  if (btnOpenExportModal) btnOpenExportModal.addEventListener('click', openExportModal);
  if (btnMqExport) btnMqExport.addEventListener('click', openExportModal);
  if (btnCloseExportModal) btnCloseExportModal.addEventListener('click', closeExportModal);
  if (pfpExportModal) pfpExportModal.addEventListener('click', function (e) { if (e.target === pfpExportModal) closeExportModal(); });

  if (btnExportPng) btnExportPng.addEventListener('click', function () { handleExport('png'); });
  if (btnExportJpg) btnExportJpg.addEventListener('click', function () { handleExport('jpg'); });
  if (btnExportZip) btnExportZip.addEventListener('click', function () { handleExport('zip'); });

  /* ----- Keyboard Shortcuts ----- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeFontModal();
      closeSocialModal();
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
      if (state.originalImage) {
        e.preventDefault();
        if (!e.repeat) setPeek(true);
      }
      return;
    }
    if (!mod && (lower === 'c' || code === 'KeyC')) {
      e.preventDefault();
      autoCenterAvatar();
      return;
    }
    if (!mod && (lower === 'p' || code === 'KeyP')) {
      e.preventDefault();
      if (pfpSocialModal && !pfpSocialModal.classList.contains('hide')) closeSocialModal();
      else openSocialModal();
      return;
    }
    if (!mod && state.originalImage) {
      var step = e.shiftKey ? 12 : 4;
      if (e.key === 'ArrowLeft') { e.preventDefault(); state.panX = clamp(state.panX - step, -360, 360); scheduleRender(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); state.panX = clamp(state.panX + step, -360, 360); scheduleRender(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); state.panY = clamp(state.panY - step, -360, 360); scheduleRender(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); state.panY = clamp(state.panY + step, -360, 360); scheduleRender(); return; }
      if (e.key === '+' || e.key === '=' || code === 'NumpadAdd') {
        e.preventDefault();
        state.zoomPct = clamp(state.zoomPct + 8, 50, 260);
        syncAllUI();
        scheduleRender();
        return;
      }
      if (e.key === '-' || code === 'NumpadSubtract') {
        e.preventDefault();
        state.zoomPct = clamp(state.zoomPct - 8, 50, 260);
        syncAllUI();
        scheduleRender();
      }
    }
  });

  document.addEventListener('keyup', function (e) {
    if (e.code === 'Space' || e.key === ' ') {
      if (state.isPeeking) setPeek(false);
    }
  });

  /* ----- Language & Cleanup ----- */
  document.addEventListener('imgsfix:langchange', function () {
    syncDocumentMeta();
    syncAllUI();
  });

  window.addEventListener('beforeunload', function () {
    revokeObjectUrl();
    cleanupCanvas(subjectCanvas);
    cleanupCanvas(fgTempCanvas);
    cleanupCanvas(bgBlurCanvas);
    cleanupCanvas(pfpPreviewCanvas);
    cleanupCanvas(pfpOrigPeekCanvas);
  });

  /* ----- Boot ----- */
  syncDocumentMeta();
  syncAllUI();
})();
