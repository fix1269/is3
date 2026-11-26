/* imgsfix — editor.js
   Advanced canvas editor powered by Fabric.js 5.3.0.
   True Fabric zoom/pan, magnetic snap alignment guides, Start Screen,
   multi-project localStorage & .project.json export/import, EN/AR Google Fonts,
   layer visibility & lock controls, presets, undo/redo, PNG/JPG/WebP/SVG/PDF export.
*/
import { jsPDF } from 'jspdf';

'use strict';
(function () {
  var I = window.imgsfix;
  var $ = I.$, $$ = I.$$;
  if (typeof fabric === 'undefined') { I.toast('Editor library failed to load', 'err'); return; }

  var PROJECTS_STORAGE_KEY = 'imgsfix_projects_list';
  var LEGACY_PROJECT_KEY = 'imgsfix_project';

  var canvas;
  var undoStack = [], redoStack = [];
  var MAX_UNDO = 60;
  var currentTool = 'select';
  var brushColor = '#1a5fff', brushWidth = 4;
  var bgColor = '#ffffff';
  var isRestoring = false;
  var currentProjectId = null;
  var currentProjectName = '';

  /* True logical canvas size & Fabric zoom state (no CSS transform scaling) */
  var logicalW = 1080;
  var logicalH = 1080;
  var currentZoom = 1;
  var isSpaceDown = false;
  var isPanning = false;
  var activeGuides = [];
  var cropSession = null;

  var SERIALIZE_PROPS = [
    'visible', 'selectable', 'evented',
    'lockMovementX', 'lockMovementY',
    'lockScalingX', 'lockScalingY',
    'lockRotation', 'hasControls',
    '_imgsfixLocked', 'isBackgroundLayer',
    'paintFirst', 'strokeDashArray', '_imgsfixEffects'
  ];

  var PRESETS = {
    ig_post:  { w: 1080, h: 1080, label: 'IG Post 1080²' },
    ig_story: { w: 1080, h: 1920, label: 'IG Story 1080×1920' },
    yt_thumb: { w: 1280, h: 720,  label: 'YT Thumb 1280×720' },
    fb_post:  { w: 1200, h: 630,  label: 'FB Post 1200×630' },
    a4_print: { w: 2480, h: 3508, label: 'A4 Print 2480×3508' },
    custom:   { w: 1920, h: 1080, label: 'Custom 1920×1080' }
  };

  function init() {
    var el = $('#editorCanvas');
    if (!el) return;
    canvas = new fabric.Canvas(el, {
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
      allowTouchScrolling: false,
      targetFindTolerance: 14,
      selectionFullyContained: false,
      selectionKey: ['shiftKey', 'ctrlKey', 'metaKey'],
      uniformScaling: false
    });

    fabric.Object.prototype.set({
      cornerSize: 14,
      cornerStyle: 'circle',
      transparentCorners: false,
      cornerColor: '#ffffff',
      cornerStrokeColor: '#1a5fff',
      borderColor: '#1a5fff',
      borderScaleFactor: 1.5,
      padding: 6,
      borderDashArray: [4, 4],
      uniformScaling: false,
      rotatingPointOffset: 36,
      lockRotation: false,
      snapAngle: 15,
      snapThreshold: 5
    });

    fabric.textureSize = 4096;

    initCanvas(PRESETS.ig_post.w, PRESETS.ig_post.h);
    initToolbar();
    initPresets();
    initTools();
    initLayersDrawer();
    initPopovers();
    initExportPopover();
    initProperties();
    initImageEffects();
    initTextEffects();
    initShapeEffects();
    initCropMode();
    initLayers();
    initZoomAndPan();
    initSmartGuides();
    initBg();
    initAutoSelect();
    initKeyboard();
    initUpload();
    initToolbarUpload();
    initCustomSize();
    initProjectTitle();
    initProjectPrompt();
    initStartScreen();
    fitCanvas();
    updateContextBar();

    window.addEventListener('resize', fitCanvas);
    window.addEventListener('orientationchange', function () { setTimeout(fitCanvas, 300); });
    document.addEventListener('imgsfix:langchange', function () {
      updateProjectTitleUI();
      updateLayers();
      renderRecentProjectsList();
    });

    var cv = $('#editorCanvas');
    if (cv) { cv.style.touchAction = 'none'; }

    setTimeout(saveState, 100);
  }

  function syncPresetSelect(w, h) {
    var sel = $('#ctxPresetSelect');
    if (!sel) return;
    var matched = 'custom';
    Object.keys(PRESETS).forEach(function (k) {
      if (k !== 'custom' && PRESETS[k].w === w && PRESETS[k].h === h) matched = k;
    });
    sel.value = matched;
  }

  function initCanvas(w, h) {
    logicalW = w;
    logicalH = h;
    canvas.setZoom(1);
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.setDimensions({ width: logicalW, height: logicalH });
    canvas.backgroundColor = bgColor;
    canvas.clear();
    canvas.backgroundColor = bgColor;
    var cwInput = $('#customW'), chInput = $('#customH');
    if (cwInput) cwInput.value = logicalW;
    if (chInput) chInput.value = logicalH;
    syncPresetSelect(logicalW, logicalH);
    renderAll();
  }

  function renderAll() {
    canvas.renderAll();
    updateLayers();
    updateContextBar();
  }

  function activeCanvasObjects() {
    return canvas.getActiveObjects().filter(function (o) { return o; });
  }

  function nudgeObjects(dx, dy) {
    var objs = activeCanvasObjects();
    if (!objs.length) return;
    objs.forEach(function (o) {
      if (o._imgsfixLocked) return;
      o.set({ left: o.left + dx, top: o.top + dy });
      o.setCoords();
    });
    renderAll();
    saveState();
  }

  function flipSelected(axis) {
    var o = canvas.getActiveObject();
    if (!o || o._imgsfixLocked) return;
    o.toggle(axis === 'h' ? 'flipX' : 'flipY');
    o.setCoords();
    renderAll();
    saveState();
  }

  /* ----- toolbar ----- */
  function initToolbar() {
    $$('.tool-btn[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.dataset.action;
        if (cropSession) cancelCropMode();
        switch (action) {
          case 'new-project': openStartScreen(); break;
          case 'undo': undo(); break;
          case 'redo': redo(); break;
          case 'select-all': selectAllObjects(); break;
          case 'group': groupSelected(); break;
          case 'ungroup': ungroupSelected(); break;
          case 'duplicate': duplicateSelected(); break;
          case 'delete': deleteSelected(); break;
          case 'flip-h': flipSelected('h'); break;
          case 'flip-v': flipSelected('v'); break;
          case 'bring-forward':
            if (canvas.getActiveObject()) { canvas.bringForward(canvas.getActiveObject()); renderAll(); saveState(); }
            break;
          case 'bring-front':
            if (canvas.getActiveObject()) { canvas.bringToFront(canvas.getActiveObject()); renderAll(); saveState(); }
            break;
          case 'send-backward':
            if (canvas.getActiveObject()) { canvas.sendBackwards(canvas.getActiveObject()); renderAll(); saveState(); }
            break;
          case 'send-back':
            if (canvas.getActiveObject()) { canvas.sendToBack(canvas.getActiveObject()); renderAll(); saveState(); }
            break;
          case 'export': exportImage('png', 1, 1); break;
          case 'save': saveProject(); break;
          case 'save-file': saveProjectFile(); break;
          case 'clear': clearCanvas(); break;
        }
      });
    });
  }

  /* ----- presets ----- */
  function initPresets() {
    var sel = $('#ctxPresetSelect');
    if (sel) {
      sel.addEventListener('change', function () {
        var p = PRESETS[sel.value];
        if (!p) return;
        if (canvas.getObjects().length > 0) {
          I.openModal('Change Canvas Size', 'This will clear the current canvas. Continue?', function () {
            initCanvas(p.w, p.h); saveState(); fitCanvas();
          });
        } else {
          initCanvas(p.w, p.h); saveState(); fitCanvas();
        }
      });
    }
    $$('.preset-btn[data-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.preset-btn[data-preset]').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var p = PRESETS[btn.dataset.preset];
        if (p) {
          if (canvas.getObjects().length > 0) {
            I.openModal('Change Canvas Size', 'This will clear the current canvas. Continue?', function () {
              initCanvas(p.w, p.h); saveState(); fitCanvas();
            });
          } else {
            initCanvas(p.w, p.h); saveState(); fitCanvas();
          }
        }
      });
    });
  }

  /* ----- tools (slim rail) ----- */
  function initTools() {
    $$('.rail-btn[data-tool]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (cropSession) cancelCropMode();
        $$('.rail-btn[data-tool]').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentTool = btn.dataset.tool;
        applyToolMode();
      });
    });
    var railUpload = $('#btnRailUpload');
    if (railUpload) {
      railUpload.addEventListener('click', function () {
        if (cropSession) cancelCropMode();
        var input = $('#editorFileInput');
        if (input) input.click();
      });
    }
  }

  function initLayersDrawer() {
    var btn = $('#btnMobileLayers');
    var drawer = $('#layersDrawer');
    var closeBtn = $('#btnCloseLayersDrawer');
    if (!drawer) return;
    if (btn) {
      btn.addEventListener('click', function () {
        var open = drawer.classList.toggle('open');
        btn.classList.toggle('active', open);
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        drawer.classList.remove('open');
        if (btn) btn.classList.remove('active');
      });
    }
  }

  var POPOVER_PAIRS = [
    { pop: 'shortcutsPopover', btn: 'btnShortcutsToggle' },
    { pop: 'exportPopover', btn: 'btnExportToggle' },
    { pop: 'imgEffectsPopover', btn: 'btnImgEffects' },
    { pop: 'textEffectsPopover', btn: 'btnTextEffects' },
    { pop: 'shapeEffectsPopover', btn: 'btnShapeEffects' }
  ];

  function closeAllPopovers(exceptPopId) {
    POPOVER_PAIRS.forEach(function (pair) {
      if (pair.pop === exceptPopId) return;
      var p = document.getElementById(pair.pop);
      var b = document.getElementById(pair.btn);
      if (p) p.classList.add('hide');
      if (b) b.classList.remove('active');
    });
  }

  function hasOpenPopover() {
    return POPOVER_PAIRS.some(function (pair) {
      var p = document.getElementById(pair.pop);
      return p && !p.classList.contains('hide');
    });
  }

  function togglePopover(popId, triggerId, onOpen) {
    var pop = document.getElementById(popId);
    var btn = document.getElementById(triggerId);
    if (!pop) return;
    var willOpen = pop.classList.contains('hide');
    closeAllPopovers(popId);
    if (willOpen) {
      if (onOpen) onOpen();
      pop.classList.remove('hide');
      if (btn) btn.classList.add('active');
    } else {
      pop.classList.add('hide');
      if (btn) btn.classList.remove('active');
    }
  }

  function initPopovers() {
    var scToggle = $('#btnShortcutsToggle');
    if (scToggle) {
      scToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        togglePopover('shortcutsPopover', 'btnShortcutsToggle');
      });
    }
    var scClose = $('#btnCloseShortcuts');
    if (scClose) {
      scClose.addEventListener('click', function () { closeAllPopovers(); });
    }
    $$('[data-close-popover]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeAllPopovers(); });
    });

    document.addEventListener('click', function (e) {
      for (var i = 0; i < POPOVER_PAIRS.length; i++) {
        var pair = POPOVER_PAIRS[i];
        var pop = document.getElementById(pair.pop);
        var btn = document.getElementById(pair.btn);
        if (pop && !pop.classList.contains('hide')) {
          if (pop.contains(e.target) || (btn && (e.target === btn || btn.contains(e.target)))) {
            return;
          }
        }
      }
      closeAllPopovers();
    });
  }

  function applyToolMode() {
    canvas.isDrawingMode = false;
    canvas.selection = !isSpaceDown;
    switch (currentTool) {
      case 'brush':
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        canvas.isDrawingMode = !isSpaceDown;
        canvas.freeDrawingBrush.color = brushColor;
        canvas.freeDrawingBrush.width = brushWidth;
        break;
      case 'select':
        break;
      case 'text':
        addText(); setCurrentTool('select'); return;
      case 'rect':
        addShape('rect'); setCurrentTool('select'); return;
      case 'circle':
        addShape('circle'); setCurrentTool('select'); return;
      case 'triangle':
        addShape('triangle'); setCurrentTool('select'); return;
      case 'line':
        addLine(); setCurrentTool('select'); return;
      case 'arrow':
        addArrow(); setCurrentTool('select'); return;
    }
    updateContextBar();
  }

  function setCurrentTool(t) {
    currentTool = t;
    $$('.rail-btn[data-tool]').forEach(function (b) { b.classList.toggle('active', b.dataset.tool === t); });
    applyToolMode();
  }

  function addText() {
    var text = new fabric.IText('Double-click to edit', {
      left: Math.max(40, logicalW / 2 - 140),
      top: Math.max(40, logicalH / 2 - 24),
      fontFamily: 'Cairo', fontSize: 40, fill: brushColor,
      stroke: null, strokeWidth: 0
    });
    canvas.add(text); canvas.setActiveObject(text); renderAll(); saveState();
  }

  function addShape(type) {
    var obj;
    var cx = Math.max(40, logicalW / 2 - 90);
    var cy = Math.max(40, logicalH / 2 - 70);
    if (type === 'rect') {
      obj = new fabric.Rect({ left: cx, top: cy, width: 200, height: 140, fill: brushColor, stroke: null, strokeWidth: 0, rx: 8, ry: 8 });
    } else if (type === 'circle') {
      obj = new fabric.Circle({ left: cx, top: cy, radius: 80, fill: brushColor, stroke: null, strokeWidth: 0 });
    } else if (type === 'triangle') {
      obj = new fabric.Triangle({ left: cx, top: cy, width: 160, height: 160, fill: brushColor, stroke: null, strokeWidth: 0 });
    }
    if (obj) { canvas.add(obj); canvas.setActiveObject(obj); renderAll(); saveState(); }
  }

  function addLine() {
    var cx = logicalW / 2;
    var cy = logicalH / 2;
    var line = new fabric.Line([cx - 100, cy, cx + 100, cy], { stroke: brushColor, strokeWidth: brushWidth, fill: 'transparent' });
    canvas.add(line); canvas.setActiveObject(line); renderAll(); saveState();
  }

  function addArrow() {
    var cx = logicalW / 2;
    var cy = logicalH / 2;
    var line = new fabric.Line([cx - 100, cy, cx + 80, cy], { stroke: brushColor, strokeWidth: brushWidth, fill: 'transparent' });
    var head = new fabric.Triangle({ left: cx + 80, top: cy - 8, width: 18, height: 18, fill: brushColor, stroke: null, strokeWidth: 0, angle: 90 });
    var group = new fabric.Group([line, head], { left: cx - 100, top: cy - 9 });
    canvas.add(group); canvas.setActiveObject(group); renderAll(); saveState();
  }

  /* ----- Google font loader helper ----- */
  function ensureFontLoaded(fontFamily, weight, cb) {
    if (!fontFamily) { if (cb) cb(); return; }
    var w = weight === 'bold' ? '700' : '400';
    if (document.fonts && document.fonts.load) {
      Promise.all([
        document.fonts.load(w + ' 24px "' + fontFamily + '"').catch(function () {}),
        document.fonts.ready.catch(function () {})
      ]).then(function () {
        if (fabric.charWidthsCache && fabric.charWidthsCache[fontFamily]) {
          delete fabric.charWidthsCache[fontFamily];
        }
        if (cb) cb();
      });
    } else if (cb) {
      cb();
    }
  }

  /* ----- dynamic contextual bar & properties ----- */
  var _updatePropsFn = null;
  function updateContextBar() {
    if (_updatePropsFn) _updatePropsFn();
  }

  function initProperties() {
    var ctxNone = $('#ctxNone'),
      ctxBrush = $('#ctxBrush'),
      ctxText = $('#ctxText'),
      ctxObject = $('#ctxObject'),
      ctxCrop = $('#ctxCrop');

    var detachBgBtn = $('#btnDetachBgNone');
    if (detachBgBtn) {
      detachBgBtn.addEventListener('click', function () { detachBackground(); });
    }
    var setBgBtn = $('#btnSetAsBg');
    if (setBgBtn) {
      setBgBtn.addEventListener('click', function () {
        var o = canvas.getActiveObject();
        if (o && !o._imgsfixLocked && canvas.getActiveObjects().length === 1) {
          setAsBackground(o);
        }
      });
    }

    var fillEl = $('#propFill'), fillToggle = $('#propFillToggle'),
      strokeEl = $('#propStroke'), strokeToggle = $('#propStrokeToggle'),
      swEl = $('#propStrokeWidth'), swVal = $('#propStrokeWidthVal'),
      opEl = $('#propOpacity'), opVal = $('#propOpacityVal'),
      rotEl = $('#propRotation'), rotVal = $('#propRotationVal'),
      fsEl = $('#propFontSize'), fsVal = $('#propFontSizeVal'),
      ffEl = $('#propFontFamily'),
      textEl = $('#propText'),
      textColorEl = $('#propTextColor'),
      textOpEl = $('#propTextOpacity'), textOpVal = $('#propTextOpacityVal'),
      bBtn = $('#propBold'), iBtn = $('#propItalic'),
      uBtn = $('#propUnderline'),
      alignPanel = $('#alignPanel'), alignMultiPanel = $('#alignMultiPanel');

    function selectedObjects() {
      return canvas.getActiveObjects();
    }

    function updateSelectedObjects(update) {
      selectedObjects().forEach(function (o) {
        update(o);
        o.setCoords();
      });
      renderAll();
      saveState();
    }

    if (fillEl && fillToggle) {
      fillEl.addEventListener('input', function () {
        var o = canvas.getActiveObject();
        if (o && fillToggle.checked) { o.set('fill', fillEl.value); renderAll(); saveState(); }
      });
      fillToggle.addEventListener('change', function () {
        var o = canvas.getActiveObject();
        if (!o) return;
        if (fillToggle.checked) {
          o.set('fill', fillEl.value);
          fillEl.disabled = false;
        } else {
          o.set('fill', 'transparent');
          fillEl.disabled = true;
        }
        renderAll(); saveState();
      });
    }

    if (strokeEl && strokeToggle && swEl && swVal) {
      strokeEl.addEventListener('input', function () {
        if (!strokeToggle.checked) strokeToggle.checked = true;
        updateSelectedObjects(function (o) {
          o.set({ stroke: strokeEl.value, strokeWidth: Math.max(1, +swEl.value || 2) });
        });
      });
      strokeToggle.addEventListener('change', function () {
        updateSelectedObjects(function (o) {
          if (strokeToggle.checked) {
            o.set({ stroke: strokeEl.value, strokeWidth: Math.max(1, +swEl.value || 2) });
          } else {
            o.set({ stroke: null, strokeWidth: 0 });
          }
        });
      });
      swEl.addEventListener('input', function () {
        var width = +swEl.value;
        swVal.textContent = width;
        if (!strokeToggle.checked && width > 0) strokeToggle.checked = true;
        updateSelectedObjects(function (o) {
          if (width > 0) o.set({ stroke: strokeEl.value, strokeWidth: width });
          else o.set({ stroke: null, strokeWidth: 0 });
        });
      });
    }

    if (opEl && opVal) {
      opEl.addEventListener('input', function () {
        var objs = activeCanvasObjects(); if (!objs.length) return;
        objs.forEach(function (o) { o.set('opacity', +opEl.value / 100); });
        opVal.textContent = opEl.value; renderAll();
      });
      opEl.addEventListener('change', function () { saveState(); });
    }

    if (rotEl && rotVal) {
      rotEl.addEventListener('input', function () {
        var objs = activeCanvasObjects(); if (!objs.length) return;
        objs.forEach(function (o) { o.set('angle', +rotEl.value); o.setCoords(); });
        rotVal.textContent = rotEl.value; renderAll();
      });
      rotEl.addEventListener('change', function () { saveState(); });
    }

    /* Text contextual controls */
    if (fsEl && fsVal) {
      fsEl.addEventListener('input', function () {
        var o = canvas.getActiveObject();
        if (o && o.type === 'i-text') { o.set('fontSize', +fsEl.value); fsVal.textContent = fsEl.value; o.initDimensions(); o.setCoords(); renderAll(); }
      });
      fsEl.addEventListener('change', function () { saveState(); });
    }
    if (textEl) {
      textEl.addEventListener('input', function () {
        var o = canvas.getActiveObject();
        if (o && o.type === 'i-text') { o.set('text', textEl.value); o.initDimensions(); o.setCoords(); renderAll(); }
      });
      textEl.addEventListener('change', function () { saveState(); });
    }
    if (textColorEl) {
      textColorEl.addEventListener('input', function () {
        var o = canvas.getActiveObject();
        if (o && o.type === 'i-text') { o.set('fill', textColorEl.value); renderAll(); saveState(); }
      });
    }
    if (textOpEl && textOpVal) {
      textOpEl.addEventListener('input', function () {
        var o = canvas.getActiveObject();
        if (o && o.type === 'i-text') { o.set('opacity', +textOpEl.value / 100); textOpVal.textContent = textOpEl.value; renderAll(); }
      });
      textOpEl.addEventListener('change', function () { saveState(); });
    }
    if (bBtn) {
      bBtn.addEventListener('click', function () {
        var o = canvas.getActiveObject(); if (o && o.type === 'i-text') {
          var nextWeight = o.fontWeight === 'bold' ? 'normal' : 'bold';
          o.set('fontWeight', nextWeight);
          bBtn.classList.toggle('active');
          ensureFontLoaded(o.fontFamily, nextWeight, function () {
            o.initDimensions(); o.setCoords(); canvas.requestRenderAll(); renderAll(); saveState();
          });
        }
      });
    }
    if (iBtn) {
      iBtn.addEventListener('click', function () {
        var o = canvas.getActiveObject(); if (o && o.type === 'i-text') {
          o.set('fontStyle', o.fontStyle === 'italic' ? 'normal' : 'italic');
          iBtn.classList.toggle('active'); o.initDimensions(); o.setCoords(); renderAll(); saveState();
        }
      });
    }
    if (uBtn) {
      uBtn.addEventListener('click', function () {
        var o = canvas.getActiveObject(); if (o && o.type === 'i-text') {
          o.set('underline', !o.underline); uBtn.classList.toggle('active'); renderAll(); saveState();
        }
      });
    }
    if (ffEl) {
      ffEl.addEventListener('change', function () {
        var o = canvas.getActiveObject();
        if (o && o.type === 'i-text') {
          var font = ffEl.value;
          o.set('fontFamily', font);
          canvas.requestRenderAll();
          ensureFontLoaded(font, o.fontWeight, function () {
            if (o.canvas) {
              o.initDimensions();
              o.setCoords();
              canvas.requestRenderAll();
              renderAll();
              saveState();
            }
          });
        }
      });
    }

    /* text alignment buttons */
    $$('.tool-btn[data-talign]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var o = canvas.getActiveObject();
        if (o && o.type === 'i-text') {
          o.set('textAlign', btn.dataset.talign);
          $$('.tool-btn[data-talign]').forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          renderAll(); saveState();
        }
      });
    });

    function objectBounds(o) {
      return o.getBoundingRect(true, true);
    }

    function moveObject(o, dx, dy) {
      o.set({ left: o.left + dx, top: o.top + dy });
      o.setCoords();
    }

    function alignObject(o, action) {
      var bounds = objectBounds(o);
      var dx = 0, dy = 0;
      if (action === 'left') dx = -bounds.left;
      if (action === 'right') dx = logicalW - (bounds.left + bounds.width);
      if (action === 'center-h') dx = logicalW / 2 - (bounds.left + bounds.width / 2);
      if (action === 'top') dy = -bounds.top;
      if (action === 'bottom') dy = logicalH - (bounds.top + bounds.height);
      if (action === 'center-v') dy = logicalH / 2 - (bounds.top + bounds.height / 2);
      moveObject(o, dx, dy);
    }

    function alignObjects(objects, action) {
      var bounds = objects.map(objectBounds);
      var minL = Math.min.apply(null, bounds.map(function (b) { return b.left; }));
      var maxR = Math.max.apply(null, bounds.map(function (b) { return b.left + b.width; }));
      var minT = Math.min.apply(null, bounds.map(function (b) { return b.top; }));
      var maxB = Math.max.apply(null, bounds.map(function (b) { return b.top + b.height; }));
      var targetX = action === 'left' ? minL : action === 'right' ? maxR : (minL + maxR) / 2;
      var targetY = action === 'top' ? minT : action === 'bottom' ? maxB : (minT + maxB) / 2;

      objects.forEach(function (o, i) {
        var b = bounds[i];
        if (action === 'left' || action === 'right' || action === 'center-h') {
          moveObject(o, targetX - (action === 'right' ? b.left + b.width : action === 'center-h' ? b.left + b.width / 2 : b.left), 0);
        } else {
          moveObject(o, 0, targetY - (action === 'bottom' ? b.top + b.height : action === 'center-v' ? b.top + b.height / 2 : b.top));
        }
      });
    }

    function distributeObjects(objects, direction) {
      var sorted = objects.slice().sort(function (a, b) {
        return direction === 'horizontal' ? objectBounds(a).left - objectBounds(b).left : objectBounds(a).top - objectBounds(b).top;
      });
      var bounds = sorted.map(objectBounds);
      var totalSize = bounds.reduce(function (sum, b) { return sum + (direction === 'horizontal' ? b.width : b.height); }, 0);
      var start = direction === 'horizontal' ? bounds[0].left : bounds[0].top;
      var end = direction === 'horizontal' ? bounds[bounds.length - 1].left + bounds[bounds.length - 1].width : bounds[bounds.length - 1].top + bounds[bounds.length - 1].height;
      var gap = (end - start - totalSize) / (sorted.length - 1);
      var cursor = start;
      sorted.forEach(function (o, i) {
        var b = bounds[i];
        if (direction === 'horizontal') moveObject(o, cursor - b.left, 0);
        else moveObject(o, 0, cursor - b.top);
        cursor += (direction === 'horizontal' ? b.width : b.height) + gap;
      });
    }

    Array.prototype.forEach.call(document.querySelectorAll('.tool-btn[data-align]'), function (btn) {
      btn.addEventListener('click', function () {
        var o = canvas.getActiveObject();
        if (!o) return;
        alignObject(o, btn.dataset.align);
        renderAll(); saveState();
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('.tool-btn[data-malign]'), function (btn) {
      btn.addEventListener('click', function () {
        var objects = canvas.getActiveObjects();
        if (objects.length < 2) return;
        var action = btn.dataset.malign;
        if (action === 'dist-h' || action === 'dist-v') {
          if (objects.length < 3) return;
          distributeObjects(objects, action === 'dist-h' ? 'horizontal' : 'vertical');
        } else {
          alignObjects(objects, action);
        }
        renderAll(); saveState();
      });
    });

    // brush color + width
    var bcEl = $('#brushColor'), bwEl = $('#brushWidth'), bwVal = $('#brushWidthVal');
    if (bcEl) bcEl.addEventListener('input', function () { brushColor = bcEl.value; if (canvas.isDrawingMode) canvas.freeDrawingBrush.color = brushColor; });
    if (bwEl && bwVal) bwEl.addEventListener('input', function () { brushWidth = +bwEl.value; bwVal.textContent = brushWidth; if (canvas.isDrawingMode) canvas.freeDrawingBrush.width = brushWidth; });

    canvas.on('selection:created', updateProps);
    canvas.on('selection:updated', updateProps);
    canvas.on('selection:cleared', updateProps);
    canvas.on('object:modified', function () { saveState(); updateProps(); });
    canvas.on('object:scaling', updateProps);
    canvas.on('object:rotating', updateProps);
    canvas.on('text:changed', updateProps);
    canvas.on('path:created', saveState);

    function showOnlyContext(target) {
      [ctxNone, ctxBrush, ctxText, ctxObject, ctxCrop].forEach(function (el) {
        if (el) el.classList.toggle('hide', el !== target);
      });
    }

    function updateProps() {
      if (cropSession) {
        showOnlyContext(ctxCrop);
        closeAllPopovers();
        return;
      }

      var o = canvas.getActiveObject();
      var activeObjs = canvas.getActiveObjects();
      var hasBgLayer = canvas.getObjects().some(function (item) { return !!item.isBackgroundLayer; });
      if (detachBgBtn) detachBgBtn.classList.toggle('hide', !hasBgLayer);

      if (!o) {
        closeAllPopovers('shortcutsPopover');
        if (currentTool === 'brush') {
          showOnlyContext(ctxBrush);
        } else {
          showOnlyContext(ctxNone);
        }
        return;
      }

      if (o.type === 'i-text' && activeObjs.length === 1) {
        showOnlyContext(ctxText);
        if (fsEl && fsVal) { fsEl.value = o.fontSize || 40; fsVal.textContent = Math.round(o.fontSize || 40); }
        if (ffEl) { ffEl.value = o.fontFamily || 'Cairo'; }
        if (textEl && document.activeElement !== textEl) { textEl.value = o.text || ''; }
        if (textColorEl) { textColorEl.value = typeof o.fill === 'string' && /^#[0-9a-fA-F]{6}$/.test(o.fill) ? o.fill : '#1a5fff'; }
        if (textOpEl && textOpVal) {
          var topc = Math.round((o.opacity !== undefined ? o.opacity : 1) * 100);
          textOpEl.value = topc; textOpVal.textContent = topc;
        }
        if (bBtn) bBtn.classList.toggle('active', o.fontWeight === 'bold');
        if (iBtn) iBtn.classList.toggle('active', o.fontStyle === 'italic');
        if (uBtn) uBtn.classList.toggle('active', !!o.underline);
        $$('.tool-btn[data-talign]').forEach(function (b) {
          b.classList.toggle('active', b.dataset.talign === (o.textAlign || 'left'));
        });
        syncTextEffectsUI(o);
        var imgPop = $('#imgEffectsPopover'), shpPop = $('#shapeEffectsPopover');
        if (imgPop) imgPop.classList.add('hide');
        if (shpPop) shpPop.classList.add('hide');
        return;
      }

      showOnlyContext(ctxObject);
      var isSingle = activeObjs.length === 1;
      var isImage = isSingle && o.type === 'image';
      var isShape = isSingle && o.type !== 'image' && o.type !== 'i-text';

      var btnImgFx = $('#btnImgEffects'), btnImgCrop = $('#btnImgCrop'), btnShpFx = $('#btnShapeEffects');
      if (btnImgFx) btnImgFx.classList.toggle('hide', !isImage);
      if (btnImgCrop) btnImgCrop.classList.toggle('hide', !isImage);
      if (btnShpFx) btnShpFx.classList.toggle('hide', !isShape);
      if (setBgBtn) setBgBtn.classList.toggle('hide', !isSingle);

      if (isImage) syncImgEffectsUI(o);
      if (isShape) syncShapeEffectsUI(o);

      if (!isImage) {
        var ip = $('#imgEffectsPopover');
        if (ip) ip.classList.add('hide');
        if (btnImgFx) btnImgFx.classList.remove('active');
      }
      if (!isShape) {
        var sp = $('#shapeEffectsPopover');
        if (sp) sp.classList.add('hide');
        if (btnShpFx) btnShpFx.classList.remove('active');
      }
      var tp = $('#textEffectsPopover'), tBtn = $('#btnTextEffects');
      if (tp) tp.classList.add('hide');
      if (tBtn) tBtn.classList.remove('active');

      if (opEl && opVal) {
        opEl.value = Math.round((o.opacity !== undefined ? o.opacity : 1) * 100);
        opVal.textContent = opEl.value;
      }
      if (rotEl && rotVal) {
        rotEl.value = Math.round(o.angle || 0);
        rotVal.textContent = rotEl.value;
      }

      if (fillEl && fillToggle) {
        var hasFill = o.fill && o.fill !== 'transparent' && o.fill !== 'none';
        fillToggle.checked = !!hasFill;
        fillEl.value = hasFill ? (typeof o.fill === 'string' && /^#[0-9a-fA-F]{6}$/.test(o.fill) ? o.fill : '#1a5fff') : '#1a5fff';
        fillEl.disabled = !hasFill;
      }

      if (strokeEl && strokeToggle && swEl && swVal) {
        var selected = activeObjs.length ? activeObjs : [o];
        var hasStroke = selected.every(function (item) { return item.stroke && item.stroke !== 'transparent' && item.strokeWidth > 0; });
        strokeToggle.checked = hasStroke;
        strokeEl.value = typeof o.stroke === 'string' && /^#[0-9a-fA-F]{6}$/.test(o.stroke) ? o.stroke : '#000000';
        strokeEl.disabled = false;
        swEl.value = o.strokeWidth || 2;
        swVal.textContent = swEl.value;
        swEl.disabled = false;
      }

      if (activeObjs.length >= 2) {
        if (alignPanel) alignPanel.classList.add('hide');
        if (alignMultiPanel) alignMultiPanel.classList.remove('hide');
      } else {
        if (alignPanel) alignPanel.classList.remove('hide');
        if (alignMultiPanel) alignMultiPanel.classList.add('hide');
      }
    }

    _updatePropsFn = updateProps;
  }

  /* ----- Background Attach / Detach ----- */
  function setAsBackground(obj) {
    if (!obj) return;
    canvas.getObjects().forEach(function (item) {
      if (item !== obj && item.isBackgroundLayer) {
        item.isBackgroundLayer = false;
        setObjectLocked(item, false);
      }
    });
    var w = Math.max(1, obj.width || 1);
    var h = Math.max(1, obj.height || 1);
    var scale = Math.max(logicalW / w, logicalH / h);
    obj.set({
      originX: 'center',
      originY: 'center',
      left: logicalW / 2,
      top: logicalH / 2,
      angle: 0,
      scaleX: scale,
      scaleY: scale,
      isBackgroundLayer: true
    });
    setObjectLocked(obj, true);
    canvas.sendToBack(obj);
    canvas.discardActiveObject();
    obj.setCoords();
    renderAll();
    saveState();
    I.toast(I.t('ed_bg_set_ok'), 'ok');
  }

  function detachBackground(targetObj) {
    var obj = targetObj || canvas.getObjects().find(function (item) { return !!item.isBackgroundLayer; });
    if (!obj) return;
    obj.isBackgroundLayer = false;
    setObjectLocked(obj, false);
    canvas.setActiveObject(obj);
    renderAll();
    saveState();
    I.toast(I.t('ed_bg_detached_ok'), 'ok');
  }

  /* ----- Image Effects & Filters (100% Fabric.js) ----- */
  function defaultImgEffects() {
    return { brightness: 0, contrast: 0, saturation: 0, blur: 0, sharpen: false, preset: 'original' };
  }

  function safeApplyFilters(img) {
    try {
      img.applyFilters();
    } catch (e) {
      fabric.filterBackend = new fabric.Canvas2dFilterBackend();
      img.applyFilters();
    }
  }

  function applyImageEffects(img, fx) {
    if (!img || img.type !== 'image') return;
    img._imgsfixEffects = Object.assign(defaultImgEffects(), fx);
    var f = img._imgsfixEffects;
    var filters = [];

    if (f.brightness !== 0) {
      filters.push(new fabric.Image.filters.Brightness({ brightness: f.brightness / 100 }));
    }
    if (f.contrast !== 0) {
      filters.push(new fabric.Image.filters.Contrast({ contrast: f.contrast / 100 }));
    }
    if (f.saturation !== 0) {
      filters.push(new fabric.Image.filters.Saturation({ saturation: f.saturation / 100 }));
    }
    if (f.blur > 0) {
      filters.push(new fabric.Image.filters.Blur({ blur: f.blur / 100 }));
    }
    if (f.sharpen) {
      filters.push(new fabric.Image.filters.Convolute({ matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0] }));
    }

    switch (f.preset) {
      case 'grayscale':
        filters.push(new fabric.Image.filters.Grayscale());
        break;
      case 'sepia':
        filters.push(new fabric.Image.filters.Sepia());
        break;
      case 'vintage':
        filters.push(new fabric.Image.filters.Vintage());
        break;
      case 'invert':
        filters.push(new fabric.Image.filters.Invert());
        break;
      case 'warm':
        filters.push(new fabric.Image.filters.ColorMatrix({
          matrix: [
            1.14, 0, 0, 0, 0.04,
            0, 1.02, 0, 0, 0.01,
            0, 0, 0.86, 0, -0.04,
            0, 0, 0, 1, 0
          ]
        }));
        break;
      case 'cool':
        filters.push(new fabric.Image.filters.ColorMatrix({
          matrix: [
            0.88, 0, 0, 0, -0.03,
            0, 1.0, 0, 0, 0.01,
            0, 0, 1.16, 0, 0.05,
            0, 0, 0, 1, 0
          ]
        }));
        break;
    }

    img.filters = filters;
    safeApplyFilters(img);
    canvas.requestRenderAll();
  }

  function syncImgEffectsUI(img) {
    var f = (img && img._imgsfixEffects) ? Object.assign(defaultImgEffects(), img._imgsfixEffects) : defaultImgEffects();
    var br = $('#fxImgBrightness'), brV = $('#fxImgBrightnessVal'),
      ct = $('#fxImgContrast'), ctV = $('#fxImgContrastVal'),
      st = $('#fxImgSaturation'), stV = $('#fxImgSaturationVal'),
      bl = $('#fxImgBlur'), blV = $('#fxImgBlurVal'),
      sh = $('#fxImgSharpen');

    if (br && brV) { br.value = f.brightness; brV.textContent = f.brightness; }
    if (ct && ctV) { ct.value = f.contrast; ctV.textContent = f.contrast; }
    if (st && stV) { st.value = f.saturation; stV.textContent = f.saturation; }
    if (bl && blV) { bl.value = f.blur; blV.textContent = f.blur; }
    if (sh) sh.checked = !!f.sharpen;
    $$('.fx-preset-btn[data-img-preset]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.imgPreset === (f.preset || 'original'));
    });
  }

  function initImageEffects() {
    var btn = $('#btnImgEffects');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var o = canvas.getActiveObject();
        togglePopover('imgEffectsPopover', 'btnImgEffects', function () {
          if (o && o.type === 'image') syncImgEffectsUI(o);
        });
      });
    }

    var br = $('#fxImgBrightness'), brV = $('#fxImgBrightnessVal'),
      ct = $('#fxImgContrast'), ctV = $('#fxImgContrastVal'),
      st = $('#fxImgSaturation'), stV = $('#fxImgSaturationVal'),
      bl = $('#fxImgBlur'), blV = $('#fxImgBlurVal'),
      sh = $('#fxImgSharpen');

    function readFromUI() {
      return {
        brightness: br ? +br.value : 0,
        contrast: ct ? +ct.value : 0,
        saturation: st ? +st.value : 0,
        blur: bl ? +bl.value : 0,
        sharpen: sh ? !!sh.checked : false,
        preset: (function () {
          var act = $('.fx-preset-btn[data-img-preset].active');
          return act ? act.dataset.imgPreset : 'original';
        })()
      };
    }

    function applyCurrentUI(commit) {
      var o = canvas.getActiveObject();
      if (!o || o.type !== 'image') return;
      var fx = readFromUI();
      if (brV && br) brV.textContent = br.value;
      if (ctV && ct) ctV.textContent = ct.value;
      if (stV && st) stV.textContent = st.value;
      if (blV && bl) blV.textContent = bl.value;
      applyImageEffects(o, fx);
      if (commit) saveState();
    }

    [br, ct, st, bl].forEach(function (el) {
      if (!el) return;
      el.addEventListener('input', function () { applyCurrentUI(false); });
      el.addEventListener('change', function () { applyCurrentUI(true); });
    });
    if (sh) {
      sh.addEventListener('change', function () { applyCurrentUI(true); });
    }

    $$('.fx-preset-btn[data-img-preset]').forEach(function (presetBtn) {
      presetBtn.addEventListener('click', function () {
        var o = canvas.getActiveObject();
        if (!o || o.type !== 'image') return;
        var p = presetBtn.dataset.imgPreset;
        if (p === 'original') {
          var fresh = defaultImgEffects();
          applyImageEffects(o, fresh);
          syncImgEffectsUI(o);
        } else {
          var cur = readFromUI();
          cur.preset = p;
          applyImageEffects(o, cur);
          syncImgEffectsUI(o);
        }
        saveState();
      });
    });
  }

  /* ----- Text Effects (Shadow, Outline w/ paintFirst:'stroke', Highlight, Spacing) ----- */
  function syncTextEffectsUI(o) {
    if (!o || o.type !== 'i-text') return;
    var sh = o.shadow;
    var shToggle = $('#fxTextShadowToggle'), shColor = $('#fxTextShadowColor'),
      shBlur = $('#fxTextShadowBlur'), shBlurV = $('#fxTextShadowBlurVal'),
      shX = $('#fxTextShadowX'), shXV = $('#fxTextShadowXVal'),
      shY = $('#fxTextShadowY'), shYV = $('#fxTextShadowYVal');

    if (shToggle) shToggle.checked = !!sh;
    if (sh && typeof sh === 'object') {
      if (shColor && typeof sh.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(sh.color)) shColor.value = sh.color;
      if (shBlur && shBlurV) { shBlur.value = Math.round(sh.blur || 0); shBlurV.textContent = shBlur.value; }
      if (shX && shXV) { shX.value = Math.round(sh.offsetX || 0); shXV.textContent = shX.value; }
      if (shY && shYV) { shY.value = Math.round(sh.offsetY || 0); shYV.textContent = shY.value; }
    }

    var olToggle = $('#fxTextOutlineToggle'), olColor = $('#fxTextOutlineColor'),
      olW = $('#fxTextOutlineWidth'), olWV = $('#fxTextOutlineWidthVal');
    var hasOutline = !!(o.stroke && o.stroke !== 'transparent' && o.strokeWidth > 0);
    if (olToggle) olToggle.checked = hasOutline;
    if (olColor && typeof o.stroke === 'string' && /^#[0-9a-fA-F]{6}$/.test(o.stroke)) olColor.value = o.stroke;
    if (olW && olWV) { olW.value = hasOutline ? Math.round(o.strokeWidth) : 3; olWV.textContent = olW.value; }

    var bgToggle = $('#fxTextBgToggle'), bgC = $('#fxTextBgColor');
    var hasBg = !!(o.textBackgroundColor && o.textBackgroundColor !== 'transparent');
    if (bgToggle) bgToggle.checked = hasBg;
    if (bgC && hasBg && /^#[0-9a-fA-F]{6}$/.test(o.textBackgroundColor)) bgC.value = o.textBackgroundColor;

    var sp = $('#fxTextSpacing'), spV = $('#fxTextSpacingVal'),
      lh = $('#fxTextLineHeight'), lhV = $('#fxTextLineHeightVal');
    if (sp && spV) { sp.value = Math.round(o.charSpacing || 0); spV.textContent = sp.value; }
    if (lh && lhV) { lh.value = Number(o.lineHeight || 1.16).toFixed(2); lhV.textContent = lh.value; }
  }

  function initTextEffects() {
    var btn = $('#btnTextEffects');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var o = canvas.getActiveObject();
        togglePopover('textEffectsPopover', 'btnTextEffects', function () {
          if (o && o.type === 'i-text') syncTextEffectsUI(o);
        });
      });
    }

    var shToggle = $('#fxTextShadowToggle'), shColor = $('#fxTextShadowColor'),
      shBlur = $('#fxTextShadowBlur'), shBlurV = $('#fxTextShadowBlurVal'),
      shX = $('#fxTextShadowX'), shXV = $('#fxTextShadowXVal'),
      shY = $('#fxTextShadowY'), shYV = $('#fxTextShadowYVal'),
      olToggle = $('#fxTextOutlineToggle'), olColor = $('#fxTextOutlineColor'),
      olW = $('#fxTextOutlineWidth'), olWV = $('#fxTextOutlineWidthVal'),
      bgToggle = $('#fxTextBgToggle'), bgC = $('#fxTextBgColor'),
      sp = $('#fxTextSpacing'), spV = $('#fxTextSpacingVal'),
      lh = $('#fxTextLineHeight'), lhV = $('#fxTextLineHeightVal');

    function updateShadow(commit, autoEnable) {
      var o = canvas.getActiveObject();
      if (!o || o.type !== 'i-text') return;
      if (autoEnable && shToggle && !shToggle.checked) shToggle.checked = true;
      if (shBlurV && shBlur) shBlurV.textContent = shBlur.value;
      if (shXV && shX) shXV.textContent = shX.value;
      if (shYV && shY) shYV.textContent = shY.value;
      if (shToggle && shToggle.checked) {
        o.set('shadow', new fabric.Shadow({
          color: shColor ? shColor.value : '#000000',
          blur: shBlur ? +shBlur.value : 8,
          offsetX: shX ? +shX.value : 2,
          offsetY: shY ? +shY.value : 4
        }));
      } else {
        o.set('shadow', null);
      }
      canvas.requestRenderAll();
      if (commit) saveState();
    }

    if (shToggle) shToggle.addEventListener('change', function () { updateShadow(true, false); });
    if (shColor) {
      shColor.addEventListener('input', function () { updateShadow(false, true); });
      shColor.addEventListener('change', function () { updateShadow(true, true); });
    }
    [shBlur, shX, shY].forEach(function (el) {
      if (!el) return;
      el.addEventListener('input', function () { updateShadow(false, true); });
      el.addEventListener('change', function () { updateShadow(true, true); });
    });

    function updateOutline(commit, autoEnable) {
      var o = canvas.getActiveObject();
      if (!o || o.type !== 'i-text') return;
      if (autoEnable && olToggle && !olToggle.checked) olToggle.checked = true;
      if (olWV && olW) olWV.textContent = olW.value;
      var w = olW ? +olW.value : 0;
      if (olToggle && olToggle.checked && w > 0) {
        o.set({
          stroke: olColor ? olColor.value : '#000000',
          strokeWidth: w,
          paintFirst: 'stroke'
        });
      } else {
        o.set({ stroke: null, strokeWidth: 0, paintFirst: 'fill' });
      }
      o.initDimensions();
      o.setCoords();
      canvas.requestRenderAll();
      if (commit) saveState();
    }

    if (olToggle) olToggle.addEventListener('change', function () { updateOutline(true, false); });
    if (olColor) {
      olColor.addEventListener('input', function () { updateOutline(false, true); });
      olColor.addEventListener('change', function () { updateOutline(true, true); });
    }
    if (olW) {
      olW.addEventListener('input', function () { updateOutline(false, true); });
      olW.addEventListener('change', function () { updateOutline(true, true); });
    }

    function updateBgHighlight(commit, autoEnable) {
      var o = canvas.getActiveObject();
      if (!o || o.type !== 'i-text') return;
      if (autoEnable && bgToggle && !bgToggle.checked) bgToggle.checked = true;
      o.set('textBackgroundColor', (bgToggle && bgToggle.checked) ? (bgC ? bgC.value : '#fef08a') : '');
      canvas.requestRenderAll();
      if (commit) saveState();
    }

    if (bgToggle) bgToggle.addEventListener('change', function () { updateBgHighlight(true, false); });
    if (bgC) {
      bgC.addEventListener('input', function () { updateBgHighlight(false, true); });
      bgC.addEventListener('change', function () { updateBgHighlight(true, true); });
    }

    if (sp) {
      sp.addEventListener('input', function () {
        var o = canvas.getActiveObject();
        if (!o || o.type !== 'i-text') return;
        if (spV) spV.textContent = sp.value;
        o.set('charSpacing', +sp.value);
        o.initDimensions();
        o.setCoords();
        canvas.requestRenderAll();
      });
      sp.addEventListener('change', function () { saveState(); });
    }
    if (lh) {
      lh.addEventListener('input', function () {
        var o = canvas.getActiveObject();
        if (!o || o.type !== 'i-text') return;
        if (lhV) lhV.textContent = Number(lh.value).toFixed(2);
        o.set('lineHeight', +lh.value);
        o.initDimensions();
        o.setCoords();
        canvas.requestRenderAll();
      });
      lh.addEventListener('change', function () { saveState(); });
    }
  }

  /* ----- Shape Effects (Shadow, Corner Radius, Border Style) ----- */
  function syncShapeEffectsUI(o) {
    if (!o) return;
    var sh = o.shadow;
    var shToggle = $('#fxShapeShadowToggle'), shColor = $('#fxShapeShadowColor'),
      shBlur = $('#fxShapeShadowBlur'), shBlurV = $('#fxShapeShadowBlurVal'),
      shX = $('#fxShapeShadowX'), shXV = $('#fxShapeShadowXVal'),
      shY = $('#fxShapeShadowY'), shYV = $('#fxShapeShadowYVal');

    if (shToggle) shToggle.checked = !!sh;
    if (sh && typeof sh === 'object') {
      if (shColor && typeof sh.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(sh.color)) shColor.value = sh.color;
      if (shBlur && shBlurV) { shBlur.value = Math.round(sh.blur || 0); shBlurV.textContent = shBlur.value; }
      if (shX && shXV) { shX.value = Math.round(sh.offsetX || 0); shXV.textContent = shX.value; }
      if (shY && shYV) { shY.value = Math.round(sh.offsetY || 0); shYV.textContent = shY.value; }
    }

    var radRow = $('#fxShapeRadiusRow'), rad = $('#fxShapeRadius'), radV = $('#fxShapeRadiusVal');
    if (radRow) radRow.classList.toggle('hide', o.type !== 'rect');
    if (o.type === 'rect' && rad && radV) {
      rad.value = Math.round(o.rx || 0);
      radV.textContent = rad.value;
    }

    var styleKey = 'solid';
    if (Array.isArray(o.strokeDashArray) && o.strokeDashArray.length >= 2) {
      styleKey = o.strokeDashArray[0] <= 4 ? 'dotted' : 'dashed';
    }
    $$('.fx-pill-btn[data-border-style]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.borderStyle === styleKey);
    });
  }

  function initShapeEffects() {
    var btn = $('#btnShapeEffects');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var o = canvas.getActiveObject();
        togglePopover('shapeEffectsPopover', 'btnShapeEffects', function () {
          if (o) syncShapeEffectsUI(o);
        });
      });
    }

    var shToggle = $('#fxShapeShadowToggle'), shColor = $('#fxShapeShadowColor'),
      shBlur = $('#fxShapeShadowBlur'), shBlurV = $('#fxShapeShadowBlurVal'),
      shX = $('#fxShapeShadowX'), shXV = $('#fxShapeShadowXVal'),
      shY = $('#fxShapeShadowY'), shYV = $('#fxShapeShadowYVal'),
      rad = $('#fxShapeRadius'), radV = $('#fxShapeRadiusVal');

    function updateShadow(commit, autoEnable) {
      var o = canvas.getActiveObject();
      if (!o || o.type === 'image' || o.type === 'i-text') return;
      if (autoEnable && shToggle && !shToggle.checked) shToggle.checked = true;
      if (shBlurV && shBlur) shBlurV.textContent = shBlur.value;
      if (shXV && shX) shXV.textContent = shX.value;
      if (shYV && shY) shYV.textContent = shY.value;
      if (shToggle && shToggle.checked) {
        o.set('shadow', new fabric.Shadow({
          color: shColor ? shColor.value : '#000000',
          blur: shBlur ? +shBlur.value : 10,
          offsetX: shX ? +shX.value : 4,
          offsetY: shY ? +shY.value : 6
        }));
      } else {
        o.set('shadow', null);
      }
      canvas.requestRenderAll();
      if (commit) saveState();
    }

    if (shToggle) shToggle.addEventListener('change', function () { updateShadow(true, false); });
    if (shColor) {
      shColor.addEventListener('input', function () { updateShadow(false, true); });
      shColor.addEventListener('change', function () { updateShadow(true, true); });
    }
    [shBlur, shX, shY].forEach(function (el) {
      if (!el) return;
      el.addEventListener('input', function () { updateShadow(false, true); });
      el.addEventListener('change', function () { updateShadow(true, true); });
    });

    if (rad) {
      rad.addEventListener('input', function () {
        var o = canvas.getActiveObject();
        if (!o || o.type !== 'rect') return;
        var r = +rad.value;
        if (radV) radV.textContent = r;
        o.set({ rx: r, ry: r });
        canvas.requestRenderAll();
      });
      rad.addEventListener('change', function () { saveState(); });
    }

    $$('.fx-pill-btn[data-border-style]').forEach(function (b) {
      b.addEventListener('click', function () {
        var o = canvas.getActiveObject();
        if (!o || o.type === 'image' || o.type === 'i-text') return;
        var st = b.dataset.borderStyle;
        var dash = st === 'dashed' ? [10, 6] : st === 'dotted' ? [2, 5] : null;
        if (dash && (!o.stroke || o.stroke === 'transparent' || !o.strokeWidth)) {
          o.set({ stroke: '#000000', strokeWidth: 2 });
        }
        o.set('strokeDashArray', dash);
        $$('.fx-pill-btn[data-border-style]').forEach(function (p) { p.classList.toggle('active', p === b); });
        updateContextBar();
        canvas.requestRenderAll();
        saveState();
      });
    });
  }

  /* ----- Inline Image Crop Mode ----- */
  function enterCropMode(img) {
    if (!img || img.type !== 'image' || img._imgsfixLocked || cropSession) return;
    closeAllPopovers();

    var lockedStates = [];
    canvas.getObjects().forEach(function (item) {
      lockedStates.push({ obj: item, selectable: item.selectable, evented: item.evented });
      item.set({ selectable: false, evented: false });
    });

    var ib = img.getBoundingRect(true, true);
    var padX = Math.min(ib.width * 0.06, 20);
    var padY = Math.min(ib.height * 0.06, 20);
    var rw = Math.max(24, ib.width - padX * 2);
    var rh = Math.max(24, ib.height - padY * 2);

    var cropRect = new fabric.Rect({
      left: ib.left + (ib.width - rw) / 2,
      top: ib.top + (ib.height - rh) / 2,
      width: rw,
      height: rh,
      fill: 'rgba(26, 95, 255, 0.14)',
      stroke: '#1a5fff',
      strokeWidth: Math.max(1.5, 2 / currentZoom),
      strokeDashArray: [6 / currentZoom, 4 / currentZoom],
      cornerColor: '#ffffff',
      cornerStrokeColor: '#1a5fff',
      borderColor: '#1a5fff',
      transparentCorners: false,
      lockRotation: true,
      hasRotatingPoint: false,
      _isCropOverlay: true
    });
    cropRect.setControlVisible('mtr', false);

    cropSession = {
      img: img,
      rect: cropRect,
      ib: ib,
      ratio: null,
      lockedStates: lockedStates
    };

    $$('[data-crop-ratio]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.cropRatio === 'free');
    });

    canvas.add(cropRect);
    canvas.setActiveObject(cropRect);
    updateContextBar();
    canvas.requestRenderAll();
  }

  function clampCropRect() {
    if (!cropSession || !cropSession.rect) return;
    var r = cropSession.rect;
    var ib = cropSession.ib;
    var minSize = 20;

    var curW = Math.max(minSize, r.width * r.scaleX);
    var curH = Math.max(minSize, r.height * r.scaleY);

    if (curW > ib.width) {
      var sW = ib.width / r.width;
      r.set('scaleX', sW);
      if (cropSession.ratio) r.set('scaleY', (ib.width / cropSession.ratio) / r.height);
      curW = r.width * r.scaleX;
      curH = r.height * r.scaleY;
    }
    if (curH > ib.height) {
      var sH = ib.height / r.height;
      r.set('scaleY', sH);
      if (cropSession.ratio) r.set('scaleX', (ib.height * cropSession.ratio) / r.width);
      curW = r.width * r.scaleX;
      curH = r.height * r.scaleY;
    }

    var left = Math.max(ib.left, Math.min(r.left, ib.left + ib.width - curW));
    var top = Math.max(ib.top, Math.min(r.top, ib.top + ib.height - curH));
    r.set({ left: left, top: top });
    r.setCoords();
  }

  function cancelCropMode() {
    if (!cropSession) return;
    var sess = cropSession;
    cropSession = null;
    if (sess.rect && sess.rect.canvas) canvas.remove(sess.rect);
    sess.lockedStates.forEach(function (st) {
      if (st.obj && st.obj.canvas) {
        st.obj.set({ selectable: st.selectable, evented: st.evented });
        st.obj.setCoords();
      }
    });
    if (sess.img && sess.img.canvas && !sess.img._imgsfixLocked) {
      canvas.setActiveObject(sess.img);
    }
    renderAll();
  }

  function applyCropMode() {
    if (!cropSession || !cropSession.rect || !cropSession.img) return;
    var sess = cropSession;
    var img = sess.img;
    var rb = sess.rect.getBoundingRect(true, true);
    var ib = sess.ib;

    var left = Math.max(ib.left, rb.left);
    var top = Math.max(ib.top, rb.top);
    var right = Math.min(ib.left + ib.width, rb.left + rb.width);
    var bottom = Math.min(ib.top + ib.height, rb.top + rb.height);
    var cw = Math.max(4, right - left);
    var ch = Math.max(4, bottom - top);

    var srcEl = img._originalElement || img.getElement();
    if (!srcEl) { cancelCropMode(); return; }

    var natW = srcEl.naturalWidth || srcEl.width || img.width;
    var natH = srcEl.naturalHeight || srcEl.height || img.height;
    var resScale = Math.max(1, natW / Math.max(1, img.getScaledWidth()), natH / Math.max(1, img.getScaledHeight()));
    var maxOut = 3200;
    if (cw * resScale > maxOut || ch * resScale > maxOut) {
      resScale = Math.min(resScale, maxOut / Math.max(cw, ch));
    }

    var outW = Math.max(1, Math.round(cw * resScale));
    var outH = Math.max(1, Math.round(ch * resScale));
    var off = document.createElement('canvas');
    off.width = outW;
    off.height = outH;
    var ctx = off.getContext('2d');
    if (!ctx) { cancelCropMode(); return; }

    var center = img.getCenterPoint();
    var sx = img.cropX || 0;
    var sy = img.cropY || 0;
    var sw = img.width || natW;
    var sh = img.height || natH;

    ctx.save();
    ctx.scale(resScale, resScale);
    ctx.translate(-left, -top);
    ctx.translate(center.x, center.y);
    ctx.rotate(fabric.util.degreesToRadians(img.angle || 0));
    ctx.scale((img.scaleX || 1) * (img.flipX ? -1 : 1), (img.scaleY || 1) * (img.flipY ? -1 : 1));
    ctx.drawImage(srcEl, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();

    var croppedDataUrl = off.toDataURL('image/png');
    var savedFilters = img.filters ? img.filters.slice() : [];
    var savedFx = img._imgsfixEffects ? Object.assign({}, img._imgsfixEffects) : null;

    cropSession = null;
    if (sess.rect && sess.rect.canvas) canvas.remove(sess.rect);
    sess.lockedStates.forEach(function (st) {
      if (st.obj && st.obj.canvas) {
        st.obj.set({ selectable: st.selectable, evented: st.evented });
        st.obj.setCoords();
      }
    });

    img.setSrc(croppedDataUrl, function () {
      img.set({
        left: left + cw / 2,
        top: top + ch / 2,
        originX: 'center',
        originY: 'center',
        angle: 0,
        flipX: false,
        flipY: false,
        cropX: 0,
        cropY: 0,
        scaleX: cw / Math.max(1, img.width),
        scaleY: ch / Math.max(1, img.height)
      });
      if (savedFilters.length) {
        img.filters = savedFilters;
        safeApplyFilters(img);
      }
      if (savedFx) img._imgsfixEffects = savedFx;
      img.setCoords();
      canvas.setActiveObject(img);
      renderAll();
      saveState();
      I.toast(I.t('ed_crop_applied'), 'ok');
    });
  }

  function initCropMode() {
    var cropBtn = $('#btnImgCrop');
    if (cropBtn) {
      cropBtn.addEventListener('click', function () {
        var o = canvas.getActiveObject();
        if (o && o.type === 'image') enterCropMode(o);
      });
    }
    var applyBtn = $('#btnCropApply');
    if (applyBtn) applyBtn.addEventListener('click', applyCropMode);
    var cancelBtn = $('#btnCropCancel');
    if (cancelBtn) cancelBtn.addEventListener('click', cancelCropMode);

    $$('[data-crop-ratio]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!cropSession || !cropSession.rect) return;
        $$('[data-crop-ratio]').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        var val = b.dataset.cropRatio;
        var ratio = val === 'free' ? null : parseFloat(val);
        cropSession.ratio = ratio;

        var r = cropSession.rect;
        var ib = cropSession.ib;
        if (ratio) {
          var boxW = ib.width * 0.88;
          var boxH = boxW / ratio;
          if (boxH > ib.height * 0.88) {
            boxH = ib.height * 0.88;
            boxW = boxH * ratio;
          }
          r.set({
            width: boxW,
            height: boxH,
            scaleX: 1,
            scaleY: 1,
            left: ib.left + (ib.width - boxW) / 2,
            top: ib.top + (ib.height - boxH) / 2,
            lockUniScaling: true
          });
        } else {
          r.set({ lockUniScaling: false });
        }
        r.setCoords();
        canvas.requestRenderAll();
      });
    });

    canvas.on('object:moving', function (opt) {
      if (cropSession && opt.target === cropSession.rect) clampCropRect();
    });
    canvas.on('object:scaling', function (opt) {
      if (cropSession && opt.target === cropSession.rect) clampCropRect();
    });
  }

  /* ----- Safe SVG icon helper (no innerHTML) ----- */
  function createSvgIcon(paths) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    paths.forEach(function (spec) {
      var node = document.createElementNS(ns, spec.tag);
      Object.keys(spec.attrs).forEach(function (k) { node.setAttribute(k, spec.attrs[k]); });
      svg.appendChild(node);
    });
    return svg;
  }

  function makeEyeIcon(visible) {
    if (visible) {
      return createSvgIcon([
        { tag: 'path', attrs: { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' } },
        { tag: 'circle', attrs: { cx: '12', cy: '12', r: '3' } }
      ]);
    }
    return createSvgIcon([
      { tag: 'path', attrs: { d: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94' } },
      { tag: 'path', attrs: { d: 'M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19' } },
      { tag: 'line', attrs: { x1: '1', y1: '1', x2: '23', y2: '23' } }
    ]);
  }

  function makeLockIcon(locked) {
    if (locked) {
      return createSvgIcon([
        { tag: 'rect', attrs: { x: '3', y: '11', width: '18', height: '11', rx: '2', ry: '2' } },
        { tag: 'path', attrs: { d: 'M7 11V7a5 5 0 0 1 10 0v4' } }
      ]);
    }
    return createSvgIcon([
      { tag: 'rect', attrs: { x: '3', y: '11', width: '18', height: '11', rx: '2', ry: '2' } },
      { tag: 'path', attrs: { d: 'M7 11V7a5 5 0 0 1 9.9-1' } }
    ]);
  }

  /* ----- layers ----- */
  function setLayerSelection(obj, additive, forceSelected) {
    if (obj._imgsfixLocked) return;
    var active = canvas.getActiveObjects();
    var next = additive ? active.slice() : [];
    var index = next.indexOf(obj);
    if (forceSelected === true && index < 0) next.push(obj);
    else if (forceSelected === false && index >= 0) next.splice(index, 1);
    else if (forceSelected === undefined) {
      if (additive && index >= 0) next.splice(index, 1);
      else next.push(obj);
    }

    canvas.discardActiveObject();
    if (next.length === 1) canvas.setActiveObject(next[0]);
    if (next.length > 1) canvas.setActiveObject(new fabric.ActiveSelection(next, { canvas: canvas }));
    renderAll();
  }

  function setObjectLocked(obj, locked) {
    obj._imgsfixLocked = !!locked;
    obj.set({
      lockMovementX: !!locked,
      lockMovementY: !!locked,
      lockScalingX: !!locked,
      lockScalingY: !!locked,
      lockRotation: !!locked,
      hasControls: !locked,
      selectable: !locked,
      evented: !locked
    });
    if (locked && canvas.getActiveObjects().indexOf(obj) >= 0) {
      canvas.discardActiveObject();
    }
    obj.setCoords();
  }

  function initLayers() {
    canvas.on('object:added', updateLayers);
    canvas.on('object:removed', updateLayers);
    canvas.on('object:modified', updateLayers);
  }

  function updateLayers() {
    var list = $('#layerList');
    if (!list) return;
    var objs = canvas.getObjects().filter(function (o) { return !o._isCropOverlay; });
    while (list.firstChild) list.removeChild(list.firstChild);

    if (objs.length === 0) {
      var emptyP = document.createElement('p');
      emptyP.style.cssText = 'font-size:13px;color:var(--text-faint);text-align:center;padding:16px';
      emptyP.textContent = I.t('ed_no_layers');
      list.appendChild(emptyP);
      return;
    }

    var activeObjects = canvas.getActiveObjects();
    objs.slice().reverse().forEach(function (obj, i) {
      var isHidden = obj.visible === false;
      var isLocked = !!obj._imgsfixLocked;
      var isBg = !!obj.isBackgroundLayer;

      var item = document.createElement('div');
      item.className = 'layer-item';
      if (activeObjects.indexOf(obj) >= 0) item.classList.add('selected');
      if (isHidden) item.classList.add('is-hidden');
      if (isLocked) item.classList.add('is-locked');

      var label = obj.type || 'Object';
      if (obj.type === 'i-text') label = obj.text ? '"' + obj.text.substring(0, 18) + '"' : 'Text';
      else if (obj.type === 'group') label = 'Group';
      else if (obj.type === 'image') label = 'Image';
      else if (obj.type === 'path') label = 'Brush';

      var num = document.createElement('span');
      num.style.cssText = 'font-size:11px;opacity:.55;min-width:14px';
      num.textContent = String(i + 1);

      var select = document.createElement('input');
      select.type = 'checkbox';
      select.className = 'layer-select';
      select.title = I.t('ed_layer_select');
      select.disabled = isLocked;
      select.checked = activeObjects.indexOf(obj) >= 0;
      select.addEventListener('click', function (e) { e.stopPropagation(); });
      select.addEventListener('change', function () { setLayerSelection(obj, true, select.checked); });

      var lbl = document.createElement('span');
      lbl.className = 'layer-label';
      lbl.textContent = label;

      var actions = document.createElement('div');
      actions.className = 'layer-actions';

      /* Visibility toggle */
      var visBtn = document.createElement('button');
      visBtn.type = 'button';
      visBtn.className = 'layer-icon-btn layer-vis' + (isHidden ? ' active' : '');
      visBtn.title = isHidden ? I.t('ed_layer_show') : I.t('ed_layer_hide');
      visBtn.setAttribute('aria-label', visBtn.title);
      visBtn.appendChild(makeEyeIcon(!isHidden));
      visBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var nextVis = obj.visible === false;
        obj.set('visible', nextVis);
        if (!nextVis && canvas.getActiveObjects().indexOf(obj) >= 0) {
          canvas.discardActiveObject();
        }
        renderAll();
        saveState();
      });

      /* Lock / Detach Background toggle */
      var lockBtn = document.createElement('button');
      lockBtn.type = 'button';
      lockBtn.className = 'layer-icon-btn layer-lock' + (isLocked ? ' active' : '');
      lockBtn.title = isBg ? I.t('ed_detach_bg') : (isLocked ? I.t('ed_layer_unlock') : I.t('ed_layer_lock'));
      lockBtn.setAttribute('aria-label', lockBtn.title);
      lockBtn.appendChild(makeLockIcon(isLocked));
      lockBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (isBg) {
          detachBackground(obj);
          return;
        }
        setObjectLocked(obj, !isLocked);
        renderAll();
        saveState();
      });

      /* Delete button */
      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'layer-icon-btn layer-del';
      delBtn.title = I.t('ed_layer_delete');
      delBtn.setAttribute('aria-label', delBtn.title);
      delBtn.textContent = '×';
      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        canvas.remove(obj);
        renderAll();
        saveState();
      });

      actions.appendChild(visBtn);
      actions.appendChild(lockBtn);
      actions.appendChild(delBtn);

      item.appendChild(num);
      item.appendChild(select);
      item.appendChild(lbl);
      if (isBg) {
        var bgBadge = document.createElement('span');
        bgBadge.className = 'layer-bg-badge';
        bgBadge.textContent = I.t('ed_bg_layer_badge');
        item.appendChild(bgBadge);
      }
      item.appendChild(actions);

      item.addEventListener('click', function (e) {
        setLayerSelection(obj, e.shiftKey || e.ctrlKey || e.metaKey);
      });

      list.appendChild(item);
    });
  }

  /* ----- Native Fabric.js Zoom & Space+Drag / Mouse Wheel / 2-Finger Pinch+Pan ----- */
  function updateZoomLabel() {
    var txt = Math.round(currentZoom * 100) + '%';
    var lbl = $('#zoomLevelLabel');
    var lblSide = $('#zoomLevelLabelSide');
    if (lbl) lbl.textContent = txt;
    if (lblSide) lblSide.textContent = txt;
  }

  function setZoomLevel(nextZoom, anchorClientPt) {
    var clamped = Math.max(0.1, Math.min(5, nextZoom));
    var wrap = $('.editor-canvas-wrap');
    var container = wrap ? wrap.querySelector('.canvas-container') : null;
    var anchorLogical = null;
    var offsetInWrap = null;

    if (wrap && container && anchorClientPt) {
      var cRect = container.getBoundingClientRect();
      var wRect = wrap.getBoundingClientRect();
      anchorLogical = {
        x: (anchorClientPt.x - cRect.left) / currentZoom,
        y: (anchorClientPt.y - cRect.top) / currentZoom
      };
      offsetInWrap = {
        x: anchorClientPt.x - wRect.left,
        y: anchorClientPt.y - wRect.top
      };
    }

    currentZoom = clamped;
    canvas.setZoom(currentZoom);
    canvas.setDimensions({
      width: Math.max(1, Math.round(logicalW * currentZoom)),
      height: Math.max(1, Math.round(logicalH * currentZoom))
    });
    canvas.calcOffset();
    canvas.requestRenderAll();
    updateZoomLabel();

    if (wrap && container && anchorLogical && offsetInWrap) {
      var newRect = container.getBoundingClientRect();
      var newWrapRect = wrap.getBoundingClientRect();
      var targetScreenX = newRect.left + anchorLogical.x * currentZoom;
      var targetScreenY = newRect.top + anchorLogical.y * currentZoom;
      wrap.scrollLeft += (targetScreenX - newWrapRect.left) - offsetInWrap.x;
      wrap.scrollTop += (targetScreenY - newWrapRect.top) - offsetInWrap.y;
      canvas.calcOffset();
    }
  }

  function fitCanvas() {
    var wrap = $('.editor-canvas-wrap');
    if (!wrap || !canvas || !logicalW || !logicalH) return;
    var availW = Math.max(120, wrap.clientWidth - 32);
    var availH = Math.max(120, wrap.clientHeight - 32);
    var ratio = Math.min(availW / logicalW, availH / logicalH, 1);
    setZoomLevel(Math.max(0.1, ratio));
  }

  function initZoomAndPan() {
    ['#btnZoomIn', '#btnZoomInSide'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener('click', function () { setZoomLevel(currentZoom * 1.2); });
    });
    ['#btnZoomOut', '#btnZoomOutSide'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener('click', function () { setZoomLevel(currentZoom / 1.2); });
    });
    ['#btnZoomFit', '#btnZoomFitSide'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener('click', function () { fitCanvas(); });
    });

    var wrap = $('.editor-canvas-wrap');
    if (!wrap) return;

    /* Smooth desktop Mouse Wheel + Trackpad Zoom to cursor */
    wrap.addEventListener('wheel', function (e) {
      e.preventDefault();
      var delta = Math.max(-120, Math.min(120, e.deltaY));
      var factor = Math.exp(-delta * 0.0018);
      setZoomLevel(currentZoom * factor, { x: e.clientX, y: e.clientY });
    }, { passive: false });

    /* Space + Drag / Middle-click panning inside .editor-canvas-wrap */
    var panStartX = 0, panStartY = 0, panScrollL = 0, panScrollT = 0;

    wrap.addEventListener('mousedown', function (e) {
      if (isSpaceDown || e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panScrollL = wrap.scrollLeft;
        panScrollT = wrap.scrollTop;
        wrap.classList.add('panning');
      }
    }, true);

    window.addEventListener('mousemove', function (e) {
      if (!isPanning) return;
      wrap.scrollLeft = panScrollL - (e.clientX - panStartX);
      wrap.scrollTop = panScrollT - (e.clientY - panStartY);
    });

    window.addEventListener('mouseup', function () {
      if (isPanning) {
        isPanning = false;
        wrap.classList.remove('panning');
        canvas.calcOffset();
      }
    });

    /* Mobile / iPad 2-finger pinch-to-zoom + pan (1 finger untouched for accurate tap/drag/rotate) */
    var pinchActive = false, lastPinchDist = 0, lastPinchMid = null, wasSkipping = false;

    function touchesMidpoint(touches) {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      };
    }

    wrap.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        pinchActive = true;
        lastPinchDist = pinchDistance(e.touches);
        lastPinchMid = touchesMidpoint(e.touches);
        wasSkipping = canvas.skipTargetFind;
        canvas.skipTargetFind = true;
        e.preventDefault();
      }
    }, { passive: false });

    wrap.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && pinchActive) {
        e.preventDefault();
        var d = pinchDistance(e.touches);
        var mid = touchesMidpoint(e.touches);
        if (lastPinchMid) {
          wrap.scrollLeft -= (mid.x - lastPinchMid.x);
          wrap.scrollTop -= (mid.y - lastPinchMid.y);
        }
        if (lastPinchDist > 5 && d > 5) {
          setZoomLevel(currentZoom * (d / lastPinchDist), mid);
        }
        lastPinchDist = d;
        lastPinchMid = mid;
      }
    }, { passive: false });

    function endPinch(e) {
      if (pinchActive && (!e.touches || e.touches.length < 2)) {
        pinchActive = false;
        lastPinchDist = 0;
        lastPinchMid = null;
        canvas.skipTargetFind = wasSkipping;
        canvas.calcOffset();
      }
    }

    wrap.addEventListener('touchend', endPinch, { passive: false });
    wrap.addEventListener('touchcancel', endPinch, { passive: false });
  }

  function pinchDistance(touches) {
    var dx = touches[0].clientX - touches[1].clientX;
    var dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* ----- Smart Magnetic Alignment Guides ----- */
  function initSmartGuides() {
    canvas.on('object:moving', function (opt) {
      var target = opt.target;
      if (!target) return;
      activeGuides = [];

      var threshold = 6 / currentZoom;
      var tb = target.getBoundingRect(true, true);
      var tLeft = tb.left, tCenterX = tb.left + tb.width / 2, tRight = tb.left + tb.width;
      var tTop = tb.top, tCenterY = tb.top + tb.height / 2, tBottom = tb.top + tb.height;

      var xCandidates = [0, logicalW / 2, logicalW];
      var yCandidates = [0, logicalH / 2, logicalH];

      canvas.getObjects().forEach(function (obj) {
        if (obj === target || obj.visible === false) return;
        if (target.type === 'activeSelection' && target.contains(obj)) return;
        var b = obj.getBoundingRect(true, true);
        xCandidates.push(b.left, b.left + b.width / 2, b.left + b.width);
        yCandidates.push(b.top, b.top + b.height / 2, b.top + b.height);
      });

      var bestDx = null, bestXDist = threshold, snapXLine = null;
      var targetXs = [tLeft, tCenterX, tRight];
      xCandidates.forEach(function (cx) {
        targetXs.forEach(function (tx) {
          var diff = cx - tx;
          var dist = Math.abs(diff);
          if (dist < bestXDist) {
            bestXDist = dist;
            bestDx = diff;
            snapXLine = cx;
          }
        });
      });

      var bestDy = null, bestYDist = threshold, snapYLine = null;
      var targetYs = [tTop, tCenterY, tBottom];
      yCandidates.forEach(function (cy) {
        targetYs.forEach(function (ty) {
          var diff = cy - ty;
          var dist = Math.abs(diff);
          if (dist < bestYDist) {
            bestYDist = dist;
            bestDy = diff;
            snapYLine = cy;
          }
        });
      });

      if (bestDx !== null) {
        target.set('left', target.left + bestDx);
        activeGuides.push({ x1: snapXLine, y1: 0, x2: snapXLine, y2: logicalH });
      }
      if (bestDy !== null) {
        target.set('top', target.top + bestDy);
        activeGuides.push({ x1: 0, y1: snapYLine, x2: logicalW, y2: snapYLine });
      }
      if (bestDx !== null || bestDy !== null) {
        target.setCoords();
      }
    });

    function clearGuides() {
      if (activeGuides.length > 0) {
        activeGuides = [];
        canvas.requestRenderAll();
      }
    }

    canvas.on('mouse:up', clearGuides);
    canvas.on('object:modified', clearGuides);
    canvas.on('selection:cleared', clearGuides);

    canvas.on('after:render', function () {
      if (!activeGuides.length) return;
      var ctx = canvas.contextContainer;
      var vpt = canvas.viewportTransform;
      ctx.save();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      activeGuides.forEach(function (g) {
        var p1 = fabric.util.transformPoint(new fabric.Point(g.x1, g.y1), vpt);
        var p2 = fabric.util.transformPoint(new fabric.Point(g.x2, g.y2), vpt);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });
      ctx.restore();
    });
  }

  /* ----- image upload ----- */
  function initUpload() {
    var zone = $('#editorUploadZone');
    var btn = $('#btnEditorUpload');
    var input = $('#editorFileInput');
    var wrap = $('.editor-canvas-wrap');
    if (!zone || !btn || !input) return;

    function handleFile(file) {
      if (!file || !file.type.startsWith('image/')) return;
      var reader = new FileReader();
      reader.onload = function () {
        var dataURL = reader.result;
        fabric.Image.fromURL(dataURL, function (img) {
          var maxW = logicalW * 0.9, maxH = logicalH * 0.9;
          var scale = Math.min(maxW / img.width, maxH / img.height, 1);
          img.set({
            left: logicalW / 2, top: logicalH / 2,
            originX: 'center', originY: 'center',
            scaleX: scale, scaleY: scale
          });
          img.set({ crossOrigin: 'anonymous' });
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
          saveState();
          updateLayers();
          hideUploadZone();
        });
      };
      reader.readAsDataURL(file);
    }

    btn.addEventListener('click', function (e) { e.stopPropagation(); input.click(); });
    zone.addEventListener('click', function (e) {
      if (e.target === btn || e.target.closest('#btnEditorUpload')) return;
      input.click();
    });
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) handleFile(input.files[0]);
      input.value = '';
    });

    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.style.borderColor = 'var(--primary)'; });
    zone.addEventListener('dragleave', function () { zone.style.borderColor = ''; });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.style.borderColor = '';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    if (wrap) {
      wrap.addEventListener('dragover', function (e) { e.preventDefault(); });
      wrap.addEventListener('drop', function (e) {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
      });
    }
  }

  function initToolbarUpload() {
    var btn = $('#btnToolbarUpload');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var input = $('#editorFileInput');
      if (input) input.click();
    });
  }

  function hideUploadZone() {
    var zone = $('#editorUploadZone');
    if (zone) zone.classList.add('hide');
  }

  function initCustomSize() {
    var btn = $('#btnCustomSize');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var wInput = $('#customW'), hInput = $('#customH');
      var w = wInput ? parseInt(wInput.value, 10) : 0;
      var h = hInput ? parseInt(hInput.value, 10) : 0;
      if (!w || !h || w < 50 || h < 50 || w > 8000 || h > 8000) {
        I.toast('Please enter valid dimensions (50-8000px)', 'err');
        return;
      }
      $$('.preset-btn[data-preset]').forEach(function (b) { b.classList.remove('active'); });
      resizeCanvas(w, h);
    });
  }

  function resizeCanvas(w, h) {
    if (canvas.getObjects().length > 0) {
      I.openModal('Change Canvas Size', 'This will clear the current canvas. Continue?', function () {
        initCanvas(w, h); saveState(); fitCanvas();
      });
    } else {
      initCanvas(w, h); saveState(); fitCanvas();
    }
  }

  /* ----- background ----- */
  function initBg() {
    var bgEl = $('#bgColor');
    bgEl.addEventListener('input', function () {
      bgColor = bgEl.value;
      canvas.backgroundColor = bgColor;
      renderAll(); saveState();
    });
  }

  /* ----- serialization / undo / redo / project file ----- */
  function getActiveProjectTitle() {
    return (currentProjectName && currentProjectName.trim()) ? currentProjectName.trim() : I.t('ed_untitled');
  }

  function updateProjectTitleUI() {
    var txt = $('#projectTitleText');
    if (txt) txt.textContent = getActiveProjectTitle();
  }

  function sanitizeFilename(name, fallback) {
    var clean = String(name || '')
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1f]+/g, '')
      .replace(/\s+/g, '_')
      .replace(/^[._]+|[._]+$/g, '');
    return clean || (fallback || 'Untitled_Design');
  }

  function serializeProjectObj(overrideName) {
    return {
      version: 2,
      app: 'imgsfix',
      name: (overrideName && String(overrideName).trim()) ? String(overrideName).trim() : getActiveProjectTitle(),
      updatedAt: new Date().toISOString(),
      logicalW: logicalW,
      logicalH: logicalH,
      bgColor: bgColor,
      canvas: canvas.toJSON(SERIALIZE_PROPS)
    };
  }

  function serializeCanvas() {
    return JSON.stringify(serializeProjectObj());
  }

  function sanitizeDim(v, fallback) {
    var n = parseInt(v, 10);
    if (!isFinite(n) || n < 50 || n > 8000) return fallback;
    return n;
  }

  function sanitizeColor(c, fallback) {
    if (typeof c === 'string' && (/^#[0-9a-fA-F]{3,8}$/.test(c) || c === 'transparent')) return c;
    return fallback;
  }

  function isSafeSrc(src) {
    if (typeof src !== 'string') return false;
    return /^(data:image\/(png|jpeg|jpg|gif|webp|bmp);base64,|blob:|https?:\/\/|\/)/i.test(src);
  }

  function sanitizeCanvasJSON(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj) || !Array.isArray(obj.objects)) {
      return null;
    }
    function cleanNode(node) {
      if (!node || typeof node !== 'object') return null;
      if (node.type === 'image' && node.src && !isSafeSrc(node.src)) return null;
      if (Array.isArray(node.objects)) {
        node.objects = node.objects.map(cleanNode).filter(Boolean);
      }
      return node;
    }
    obj.objects = obj.objects.map(cleanNode).filter(Boolean);
    return obj;
  }

  function parseAndValidateProject(rawInput) {
    try {
      var parsed = typeof rawInput === 'string' ? (rawInput.trim() ? JSON.parse(rawInput) : null) : rawInput;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

      /* v2 format with { version, name, logicalW, logicalH, bgColor, canvas } */
      if (parsed.canvas && typeof parsed.canvas === 'object') {
        var cleanCanvas = sanitizeCanvasJSON(parsed.canvas);
        if (!cleanCanvas) return null;
        return {
          name: typeof parsed.name === 'string' ? parsed.name.trim() : '',
          logicalW: sanitizeDim(parsed.logicalW, 1080),
          logicalH: sanitizeDim(parsed.logicalH, 1080),
          bgColor: sanitizeColor(parsed.bgColor || cleanCanvas.background, '#ffffff'),
          updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
          canvas: cleanCanvas
        };
      }

      /* Legacy v1 plain Fabric JSON */
      var legacyClean = sanitizeCanvasJSON(parsed);
      if (!legacyClean) return null;
      return {
        name: '',
        logicalW: logicalW || 1080,
        logicalH: logicalH || 1080,
        bgColor: sanitizeColor(legacyClean.background, '#ffffff'),
        updatedAt: null,
        canvas: legacyClean
      };
    } catch (e) {
      return null;
    }
  }

  function preloadFontsFromCanvas() {
    var fonts = [];
    canvas.getObjects().forEach(function (obj) {
      if (obj.type === 'i-text' && obj.fontFamily && fonts.indexOf(obj.fontFamily) === -1) {
        fonts.push(obj.fontFamily);
      }
    });
    fonts.forEach(function (f) {
      ensureFontLoaded(f, '400', function () {
        canvas.getObjects().forEach(function (obj) {
          if (obj.type === 'i-text' && obj.fontFamily === f) obj.initDimensions();
        });
        canvas.requestRenderAll();
      });
    });
  }

  function restoreCanvas(stateStr, done) {
    var validated = parseAndValidateProject(stateStr);
    if (!validated) {
      if (done) done(false);
      return;
    }
    cropSession = null;
    isRestoring = true;
    logicalW = validated.logicalW;
    logicalH = validated.logicalH;
    bgColor = validated.bgColor;
    var bgEl = $('#bgColor');
    if (bgEl && /^#[0-9a-fA-F]{6}$/.test(bgColor)) bgEl.value = bgColor;
    var cwInput = $('#customW'), chInput = $('#customH');
    if (cwInput) cwInput.value = logicalW;
    if (chInput) chInput.value = logicalH;
    syncPresetSelect(logicalW, logicalH);

    canvas.loadFromJSON(validated.canvas, function () {
      canvas.backgroundColor = bgColor;
      canvas.getObjects().forEach(function (obj) {
        if (obj._imgsfixLocked || obj.isBackgroundLayer) setObjectLocked(obj, true);
      });
      preloadFontsFromCanvas();
      renderAll();
      updateContextBar();
      isRestoring = false;
      if (done) done(true);
    });
  }

  function saveState() {
    if (isRestoring) return;
    var state = serializeCanvas();
    if (undoStack.length > 0 && undoStack[undoStack.length - 1] === state) return;
    undoStack.push(state);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
  }

  function undo() {
    if (undoStack.length < 2) return;
    redoStack.push(undoStack.pop());
    var state = undoStack[undoStack.length - 1];
    restoreCanvas(state, function () {
      fitCanvas();
      updateLayers();
    });
  }

  function redo() {
    if (redoStack.length === 0) return;
    var state = redoStack.pop();
    undoStack.push(state);
    restoreCanvas(state, function () {
      fitCanvas();
      updateLayers();
    });
  }

  /* ----- actions ----- */
  function duplicateSelected() {
    var o = canvas.getActiveObject();
    if (!o || o._imgsfixLocked) return;
    o.clone(function (cl) {
      cl.set({ left: o.left + 20, top: o.top + 20 });
      cl.setCoords();
      canvas.add(cl);
      canvas.setActiveObject(cl);
      renderAll();
      saveState();
    }, SERIALIZE_PROPS);
  }

  function deleteSelected() {
    var objs = canvas.getActiveObjects();
    var removed = false;
    objs.forEach(function (o) {
      if (!o._imgsfixLocked) {
        canvas.remove(o);
        removed = true;
      }
    });
    if (removed) {
      canvas.discardActiveObject();
      renderAll();
      saveState();
    }
  }

  function clearCanvas() {
    I.openModal('Clear Canvas', 'Remove all objects? This cannot be undone.', function () {
      canvas.clear(); canvas.backgroundColor = bgColor; renderAll(); saveState();
    });
  }

  function triggerBlobDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function exportImage(format, quality, scale, customName) {
    if (cropSession) cancelCropMode();
    var fmt = (format === 'jpeg' || format === 'webp' || format === 'svg' || format === 'pdf') ? format : 'png';
    var q = typeof quality === 'number' ? Math.max(0.1, Math.min(1, quality)) : 0.92;
    var mult = Math.max(1, Math.min(3, scale || 1));
    var rawName = customName !== undefined ? customName : getActiveProjectTitle();
    var baseFile = sanitizeFilename(rawName, 'design');

    var prevZoom = currentZoom;
    var prevBg = canvas.backgroundColor;
    activeGuides = [];
    canvas.discardActiveObject();
    canvas.setZoom(1);
    canvas.setDimensions({ width: logicalW, height: logicalH });

    if (fmt === 'svg') {
      canvas.renderAll();
      var svgMarkup = canvas.toSVG();
      setZoomLevel(prevZoom);
      var svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      triggerBlobDownload(svgBlob, baseFile + '.svg');
      I.toast(I.t('ed_exported'), 'ok');
      return;
    }

    if (fmt === 'pdf') {
      if (!prevBg || prevBg === 'transparent') {
        canvas.backgroundColor = '#ffffff';
      }
      canvas.renderAll();
      var safePdfMult = mult;
      var maxDim = Math.max(logicalW, logicalH);
      if (maxDim * safePdfMult > 4200) {
        safePdfMult = Math.max(1, Math.floor(4200 / maxDim * 10) / 10);
      }
      var pdfImgData = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: safePdfMult
      });
      canvas.backgroundColor = prevBg;
      setZoomLevel(prevZoom);

      var orientation = logicalW >= logicalH ? 'landscape' : 'portrait';
      var pdf = new jsPDF({
        orientation: orientation,
        unit: 'px',
        format: [logicalW, logicalH],
        hotfixes: ['px_scaling']
      });
      pdf.addImage(pdfImgData, 'PNG', 0, 0, logicalW, logicalH, undefined, 'FAST');
      var pdfBlob = pdf.output('blob');
      triggerBlobDownload(pdfBlob, baseFile + '.pdf');
      I.toast(I.t('ed_exported'), 'ok');
      return;
    }

    if (fmt === 'jpeg' && (!prevBg || prevBg === 'transparent')) {
      canvas.backgroundColor = '#ffffff';
    }
    canvas.renderAll();

    var dataURL = canvas.toDataURL({
      format: fmt,
      quality: q,
      multiplier: mult
    });

    canvas.backgroundColor = prevBg;
    setZoomLevel(prevZoom);

    var ext = fmt === 'jpeg' ? 'jpg' : fmt;
    var a = document.createElement('a');
    a.download = baseFile + '.' + ext;
    a.href = dataURL;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    I.toast(I.t('ed_exported'), 'ok');
  }

  function initExportPopover() {
    var toggleBtn = $('#btnExportToggle');
    var nameInput = $('#exportFileName');
    var qRow = $('#exportQualityRow');
    var scaleSec = $('#exportScaleSection');
    var qInput = $('#exportQuality');
    var qVal = $('#exportQualityVal');
    var sizePrev = $('#exportSizePreview');
    var dlBtn = $('#btnExportDownload');

    var expFormat = 'png';
    var expScale = 1;

    function refreshExportPreview() {
      var isLossy = expFormat === 'jpeg' || expFormat === 'webp';
      var isSvg = expFormat === 'svg';
      var isPdf = expFormat === 'pdf';
      if (qRow) qRow.classList.toggle('hide', !isLossy);
      if (scaleSec) scaleSec.classList.toggle('hide', isSvg);
      if (sizePrev) {
        if (isSvg) {
          sizePrev.textContent = I.t('ed_export_vector_hint') + ' · ' + logicalW + ' × ' + logicalH + ' px';
        } else if (isPdf) {
          sizePrev.textContent = logicalW + ' × ' + logicalH + ' px (' + I.t('ed_export_pdf_hint') + ')';
        } else {
          sizePrev.textContent = (logicalW * expScale) + ' × ' + (logicalH * expScale) + ' px';
        }
      }
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        togglePopover('exportPopover', 'btnExportToggle', function () {
          if (nameInput) nameInput.value = getActiveProjectTitle();
          refreshExportPreview();
        });
      });
    }

    $$('.fx-pill-btn[data-exp-format]').forEach(function (b) {
      b.addEventListener('click', function () {
        expFormat = b.dataset.expFormat || 'png';
        $$('.fx-pill-btn[data-exp-format]').forEach(function (x) { x.classList.toggle('active', x === b); });
        refreshExportPreview();
      });
    });

    $$('.fx-pill-btn[data-exp-scale]').forEach(function (b) {
      b.addEventListener('click', function () {
        expScale = parseInt(b.dataset.expScale, 10) || 1;
        $$('.fx-pill-btn[data-exp-scale]').forEach(function (x) { x.classList.toggle('active', x === b); });
        refreshExportPreview();
      });
    });

    if (qInput && qVal) {
      qInput.addEventListener('input', function () { qVal.textContent = qInput.value + '%'; });
    }

    function triggerDownload() {
      var quality = qInput ? (+qInput.value / 100) : 0.92;
      var customName = nameInput ? nameInput.value : undefined;
      closeAllPopovers();
      exportImage(expFormat, quality, expScale, customName);
    }

    if (nameInput) {
      nameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          triggerDownload();
        }
      });
    }

    if (dlBtn) {
      dlBtn.addEventListener('click', triggerDownload);
    }
  }

  /* ----- Multi-Project localStorage & Legacy Migration ----- */
  function generateProjectId() {
    return 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function formatProjectDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    try {
      return d.toLocaleString(I.lang === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return d.toLocaleString();
    }
  }

  function readProjectsList() {
    var list = [];
    try {
      var rawList = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (rawList) {
        var parsedList = JSON.parse(rawList);
        if (Array.isArray(parsedList)) {
          list = parsedList.filter(function (item) {
            return item && typeof item === 'object' && typeof item.id === 'string' && item.data;
          });
        }
      }
    } catch (e) {
      list = [];
    }

    var legacyRaw = localStorage.getItem(LEGACY_PROJECT_KEY);
    if (legacyRaw) {
      var legacyParsed = parseAndValidateProject(legacyRaw);
      if (legacyParsed) {
        var nowIso = new Date().toISOString();
        var migrated = {
          id: generateProjectId(),
          name: legacyParsed.name || I.t('ed_untitled'),
          createdAt: legacyParsed.updatedAt || nowIso,
          updatedAt: legacyParsed.updatedAt || nowIso,
          width: legacyParsed.logicalW,
          height: legacyParsed.logicalH,
          data: {
            version: 2,
            app: 'imgsfix',
            name: legacyParsed.name || I.t('ed_untitled'),
            updatedAt: legacyParsed.updatedAt || nowIso,
            logicalW: legacyParsed.logicalW,
            logicalH: legacyParsed.logicalH,
            bgColor: legacyParsed.bgColor,
            canvas: legacyParsed.canvas
          }
        };
        list.unshift(migrated);
        writeProjectsList(list);
      }
      try { localStorage.removeItem(LEGACY_PROJECT_KEY); } catch (e) {}
    }

    list.sort(function (a, b) {
      return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    });
    return list;
  }

  function writeProjectsList(list) {
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      I.toast('Save failed (storage full?)', 'err');
      return false;
    }
  }

  function setProjectTitle(name, persistIfSaved) {
    var trimmed = typeof name === 'string' ? name.trim() : '';
    currentProjectName = trimmed;
    updateProjectTitleUI();

    if (persistIfSaved && currentProjectId) {
      var list = readProjectsList();
      var idx = list.findIndex(function (p) { return p.id === currentProjectId; });
      if (idx >= 0) {
        var resolved = getActiveProjectTitle();
        list[idx].name = resolved;
        list[idx].updatedAt = new Date().toISOString();
        if (list[idx].data && typeof list[idx].data === 'object') {
          list[idx].data.name = resolved;
          list[idx].data.updatedAt = list[idx].updatedAt;
        }
        writeProjectsList(list);
        renderRecentProjectsList();
      }
    }
  }

  function initProjectTitle() {
    var btn = $('#projectTitleBtn');
    var input = $('#projectTitleInput');
    if (!btn || !input) return;

    function startEdit() {
      btn.classList.add('hide');
      input.classList.remove('hide');
      input.value = getActiveProjectTitle();
      input.focus();
      input.select();
    }

    function commitEdit() {
      if (input.classList.contains('hide')) return;
      var val = input.value.trim();
      input.classList.add('hide');
      btn.classList.remove('hide');
      if (val) {
        setProjectTitle(val, true);
      } else {
        updateProjectTitleUI();
      }
    }

    function cancelEdit() {
      input.classList.add('hide');
      btn.classList.remove('hide');
      updateProjectTitleUI();
    }

    btn.addEventListener('click', startEdit);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelEdit();
      }
    });
    input.addEventListener('blur', commitEdit);
    updateProjectTitleUI();
  }

  /* ----- Prompt Modal (for naming on Save / Renaming) ----- */
  var _promptCallback = null;

  function closeProjectPrompt() {
    var modal = $('#projectPromptModal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.classList.add('hide');
    _promptCallback = null;
  }

  function openProjectPrompt(opts, onConfirm) {
    var modal = $('#projectPromptModal');
    var titleEl = $('#projectPromptTitle');
    var descEl = $('#projectPromptDesc');
    var input = $('#projectPromptInput');
    if (!modal || !input) return;

    if (titleEl && opts.title) titleEl.textContent = opts.title;
    if (descEl && opts.desc) descEl.textContent = opts.desc;
    input.value = opts.initialValue || '';
    _promptCallback = onConfirm;

    modal.classList.remove('hide');
    requestAnimationFrame(function () {
      modal.classList.add('show');
      input.focus();
      input.select();
    });
  }

  function initProjectPrompt() {
    var modal = $('#projectPromptModal');
    var input = $('#projectPromptInput');
    var confirmBtn = $('#btnPromptConfirm');
    var cancelBtn = $('#btnPromptCancel');
    var closeBtn = $('#btnPromptClose');
    if (!modal) return;

    function submit() {
      var val = input ? input.value.trim() : '';
      if (!val) {
        I.toast(I.t('ed_name_required'), 'err');
        if (input) input.focus();
        return;
      }
      var cb = _promptCallback;
      closeProjectPrompt();
      if (cb) cb(val);
    }

    if (confirmBtn) confirmBtn.addEventListener('click', submit);
    if (cancelBtn) cancelBtn.addEventListener('click', closeProjectPrompt);
    if (closeBtn) closeBtn.addEventListener('click', closeProjectPrompt);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeProjectPrompt();
    });
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          submit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          closeProjectPrompt();
        }
      });
    }
  }

  function saveProject() {
    var list = readProjectsList();
    var existingIdx = currentProjectId ? list.findIndex(function (p) { return p.id === currentProjectId; }) : -1;

    if (existingIdx >= 0) {
      var nowIso = new Date().toISOString();
      var title = getActiveProjectTitle();
      list[existingIdx].name = title;
      list[existingIdx].updatedAt = nowIso;
      list[existingIdx].width = logicalW;
      list[existingIdx].height = logicalH;
      list[existingIdx].data = serializeProjectObj(title);
      if (writeProjectsList(list)) {
        renderRecentProjectsList();
        I.toast(I.t('ed_project_saved'), 'ok');
      }
      return;
    }

    openProjectPrompt({
      title: I.t('ed_save_project_title'),
      desc: I.t('ed_save_project_desc'),
      initialValue: getActiveProjectTitle()
    }, function (chosenName) {
      var nowIso = new Date().toISOString();
      var newId = generateProjectId();
      var freshList = readProjectsList();
      freshList.unshift({
        id: newId,
        name: chosenName,
        createdAt: nowIso,
        updatedAt: nowIso,
        width: logicalW,
        height: logicalH,
        data: serializeProjectObj(chosenName)
      });
      if (writeProjectsList(freshList)) {
        currentProjectId = newId;
        setProjectTitle(chosenName, false);
        renderRecentProjectsList();
        I.toast(I.t('ed_project_saved'), 'ok');
      }
    });
  }

  function downloadProjectData(projectName, rawData) {
    try {
      var payloadObj = typeof rawData === 'string' ? JSON.parse(rawData) : Object.assign({}, rawData);
      payloadObj.name = projectName || payloadObj.name || getActiveProjectTitle();
      var json = JSON.stringify(payloadObj);
      var blob = new Blob([json], { type: 'application/json' });
      triggerBlobDownload(blob, sanitizeFilename(payloadObj.name) + '.project.json');
      I.toast(I.t('ed_file_saved'), 'ok');
    } catch (e) {
      I.toast('Save failed', 'err');
    }
  }

  function saveProjectFile() {
    downloadProjectData(getActiveProjectTitle(), serializeProjectObj());
  }

  function loadProjectFromRecord(rec, onDone) {
    if (!rec || !rec.data) {
      I.toast(I.t('ed_file_invalid'), 'err');
      if (onDone) onDone(false);
      return;
    }
    restoreCanvas(rec.data, function (ok) {
      if (!ok) {
        I.toast(I.t('ed_file_invalid'), 'err');
        if (onDone) onDone(false);
        return;
      }
      currentProjectId = rec.id;
      setProjectTitle(rec.name || I.t('ed_untitled'), false);
      undoStack = [serializeCanvas()];
      redoStack = [];
      fitCanvas();
      hideUploadZone();
      I.toast(I.t('ed_file_loaded'), 'ok');
      if (onDone) onDone(true);
    });
  }

  function deriveNameFromFilename(filename) {
    if (!filename) return '';
    return String(filename)
      .replace(/\.project\.json$/i, '')
      .replace(/\.imgsfix\.json$/i, '')
      .replace(/\.(imgsfix|json)$/i, '')
      .replace(/_/g, ' ')
      .trim();
  }

  function loadProjectFromFile(file, onDone) {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      I.toast(I.t('ed_file_invalid'), 'err');
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var text = typeof reader.result === 'string' ? reader.result : '';
      var parsed = parseAndValidateProject(text);
      if (!parsed) {
        I.toast(I.t('ed_file_invalid'), 'err');
        if (onDone) onDone(false);
        return;
      }
      var loadedName = parsed.name || deriveNameFromFilename(file.name) || I.t('ed_untitled');
      restoreCanvas(text, function (ok) {
        if (!ok) {
          I.toast(I.t('ed_file_invalid'), 'err');
          if (onDone) onDone(false);
          return;
        }
        currentProjectId = null;
        setProjectTitle(loadedName, false);
        undoStack = [serializeCanvas()];
        redoStack = [];
        fitCanvas();
        hideUploadZone();
        I.toast(I.t('ed_file_loaded'), 'ok');
        if (onDone) onDone(true);
      });
    };
    reader.onerror = function () {
      I.toast(I.t('ed_file_invalid'), 'err');
    };
    reader.readAsText(file);
  }

  /* ----- Start Screen & Recent Projects Manager ----- */
  function renderRecentProjectsList() {
    var container = $('#recentProjectsList');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    var projects = readProjectsList();
    if (!projects.length) {
      var emptyDiv = document.createElement('div');
      emptyDiv.className = 'recent-projects-empty';
      emptyDiv.textContent = I.t('ed_recent_empty');
      container.appendChild(emptyDiv);
      return;
    }

    projects.forEach(function (rec) {
      var row = document.createElement('div');
      row.className = 'recent-proj-row';

      var top = document.createElement('div');
      top.className = 'recent-proj-top';

      var nameEl = document.createElement('span');
      nameEl.className = 'recent-proj-name';
      nameEl.textContent = rec.name || I.t('ed_untitled');

      var dimsEl = document.createElement('span');
      dimsEl.className = 'recent-proj-dims';
      dimsEl.textContent = (rec.width || 1080) + '×' + (rec.height || 1080) + ' px';

      top.appendChild(nameEl);
      top.appendChild(dimsEl);

      var datesEl = document.createElement('div');
      datesEl.className = 'recent-proj-dates';

      var createdSpan = document.createElement('span');
      createdSpan.textContent = I.t('ed_created_on') + ': ' + formatProjectDate(rec.createdAt);
      var modSpan = document.createElement('span');
      modSpan.textContent = I.t('ed_last_modified') + ': ' + formatProjectDate(rec.updatedAt || rec.createdAt);

      datesEl.appendChild(createdSpan);
      datesEl.appendChild(modSpan);

      var actionsEl = document.createElement('div');
      actionsEl.className = 'recent-proj-actions';

      var openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'recent-proj-btn primary';
      openBtn.textContent = I.t('ed_open');
      openBtn.addEventListener('click', function () {
        loadProjectFromRecord(rec, function (ok) {
          if (ok) closeStartScreen();
        });
      });

      var renameBtn = document.createElement('button');
      renameBtn.type = 'button';
      renameBtn.className = 'recent-proj-btn';
      renameBtn.textContent = I.t('ed_rename');
      renameBtn.addEventListener('click', function () {
        openProjectPrompt({
          title: I.t('ed_rename_title'),
          desc: I.t('ed_rename_desc'),
          initialValue: rec.name || I.t('ed_untitled')
        }, function (newName) {
          var list = readProjectsList();
          var target = list.find(function (p) { return p.id === rec.id; });
          if (!target) return;
          target.name = newName;
          target.updatedAt = new Date().toISOString();
          if (target.data && typeof target.data === 'object') {
            target.data.name = newName;
            target.data.updatedAt = target.updatedAt;
          }
          if (writeProjectsList(list)) {
            if (currentProjectId === rec.id) {
              setProjectTitle(newName, false);
            }
            renderRecentProjectsList();
            I.toast(I.t('ed_project_renamed'), 'ok');
          }
        });
      });

      var dlBtn = document.createElement('button');
      dlBtn.type = 'button';
      dlBtn.className = 'recent-proj-btn';
      dlBtn.textContent = I.t('ed_download_file');
      dlBtn.addEventListener('click', function () {
        downloadProjectData(rec.name || I.t('ed_untitled'), rec.data);
      });

      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'recent-proj-btn danger';
      delBtn.textContent = I.t('ed_delete_project');
      delBtn.addEventListener('click', function () {
        I.openModal(I.t('ed_delete_confirm_title'), I.t('ed_delete_confirm_body'), function () {
          var list = readProjectsList().filter(function (p) { return p.id !== rec.id; });
          if (writeProjectsList(list)) {
            if (currentProjectId === rec.id) {
              currentProjectId = null;
            }
            renderRecentProjectsList();
            I.toast(I.t('ed_project_deleted'), 'ok');
          }
        });
      });

      actionsEl.appendChild(openBtn);
      actionsEl.appendChild(renameBtn);
      actionsEl.appendChild(dlBtn);
      actionsEl.appendChild(delBtn);

      row.appendChild(top);
      row.appendChild(datesEl);
      row.appendChild(actionsEl);
      container.appendChild(row);
    });
  }

  function openStartScreen() {
    if (cropSession) cancelCropMode();
    closeAllPopovers();
    renderRecentProjectsList();
    var overlay = $('#editorStartScreen');
    if (overlay) overlay.classList.remove('hide');
  }

  function closeStartScreen() {
    var overlay = $('#editorStartScreen');
    if (overlay) overlay.classList.add('hide');
    fitCanvas();
  }

  function initStartScreen() {
    var overlay = $('#editorStartScreen');
    if (!overlay) return;

    var wInput = $('#startCustomW'), hInput = $('#startCustomH');
    var selectedPresetKey = 'ig_post';

    $$('#startPresets .preset-btn[data-start-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('#startPresets .preset-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selectedPresetKey = btn.dataset.startPreset;
        var p = PRESETS[selectedPresetKey];
        if (p && wInput && hInput) {
          wInput.value = p.w;
          hInput.value = p.h;
        }
      });
    });

    var createBtn = $('#btnStartCreate');
    if (createBtn) {
      createBtn.addEventListener('click', function () {
        var w = wInput ? parseInt(wInput.value, 10) : 1080;
        var h = hInput ? parseInt(hInput.value, 10) : 1080;
        if (!w || !h || w < 50 || h < 50 || w > 8000 || h > 8000) {
          I.toast('Please enter valid dimensions (50-8000px)', 'err');
          return;
        }
        $$('.preset-btn[data-preset]').forEach(function (b) {
          b.classList.toggle('active', b.dataset.preset === selectedPresetKey);
        });
        currentProjectId = null;
        setProjectTitle('', false);
        initCanvas(w, h);
        undoStack = [serializeCanvas()];
        redoStack = [];
        closeStartScreen();
      });
    }

    var openBtn = $('#btnStartOpenFile');
    var fileInput = $('#projectFileInput');
    if (openBtn && fileInput) {
      openBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files[0]) {
          loadProjectFromFile(fileInput.files[0], function (ok) {
            if (ok) closeStartScreen();
          });
        }
        fileInput.value = '';
      });
    }

    var closeBtn = $('#btnStartClose');
    if (closeBtn) closeBtn.addEventListener('click', closeStartScreen);

    renderRecentProjectsList();

    var transferDataUrl = null;
    var transferName = '';
    try {
      transferDataUrl = sessionStorage.getItem('imgsfix_transfer_image');
      transferName = sessionStorage.getItem('imgsfix_transfer_name') || '';
      if (transferDataUrl) {
        sessionStorage.removeItem('imgsfix_transfer_image');
        sessionStorage.removeItem('imgsfix_transfer_name');
      }
    } catch (_e) {
      transferDataUrl = null;
    }

    if (transferDataUrl && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(transferDataUrl)) {
      fabric.Image.fromURL(transferDataUrl, function (img) {
        if (!img || !img.width || !img.height) {
          openStartScreen();
          return;
        }
        var targetW = Math.max(50, Math.min(8000, Math.round(img.width)));
        var targetH = Math.max(50, Math.min(8000, Math.round(img.height)));
        var scale = Math.min(targetW / img.width, targetH / img.height, 1);

        currentProjectId = null;
        setProjectTitle(transferName || '', false);
        initCanvas(targetW, targetH);
        img.set({
          left: targetW / 2,
          top: targetH / 2,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
          crossOrigin: 'anonymous'
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        undoStack = [serializeCanvas()];
        redoStack = [];
        fitCanvas();
        updateLayers();
        updateContextBar();
        hideUploadZone();
        closeStartScreen();
      });
      return;
    }

    var params = new URLSearchParams(window.location.search);
    var savedList = readProjectsList();
    if (params.get('resume') === '1' && savedList.length > 0) {
      loadProjectFromRecord(savedList[0], function (ok) {
        if (!ok) openStartScreen();
      });
    } else {
      openStartScreen();
    }
  }

  /* ----- auto-select (Illustrator-like: click anywhere on object selects it) ----- */
  function initAutoSelect() {
    canvas.targetFindTolerance = 14;

    canvas.on('mouse:down', function (opt) {
      if (canvas.isDrawingMode || isSpaceDown || isPanning) return;
      var target = opt.target;
      if (target) return;

      var pointer = canvas.getPointer(opt.e);
      var objs = canvas.getObjects().slice().reverse();
      for (var i = 0; i < objs.length; i++) {
        var o = objs[i];
        if (o.visible === false || o._imgsfixLocked || o.selectable === false || o.evented === false) continue;
        if (o.containsPoint(pointer) || isPointNearObject(pointer, o, 8 / currentZoom)) {
          canvas.setActiveObject(o);
          canvas.requestRenderAll();
          return;
        }
      }
    });
  }

  function isPointNearObject(pointer, obj, tolerance) {
    var bounds = obj.getBoundingRect(true, true);
    return pointer.x >= bounds.left - tolerance &&
           pointer.x <= bounds.left + bounds.width + tolerance &&
           pointer.y >= bounds.top - tolerance &&
           pointer.y <= bounds.top + bounds.height + tolerance;
  }

  /* ----- keyboard ----- */
  function selectAllObjects() {
    var objects = canvas.getObjects().filter(function (o) { return !o._imgsfixLocked && o.visible !== false; });
    canvas.discardActiveObject();
    if (objects.length === 1) canvas.setActiveObject(objects[0]);
    if (objects.length > 1) canvas.setActiveObject(new fabric.ActiveSelection(objects, { canvas: canvas }));
    canvas.requestRenderAll();
    updateLayers();
  }

  function copyToClipboard() {
    var o = canvas.getActiveObject();
    if (!o) return;
    o.clone(function (cl) {
      window._imgsfixClipboard = cl;
      I.toast('Copied', 'ok');
    }, SERIALIZE_PROPS);
  }

  function pasteFromClipboard() {
    if (!window._imgsfixClipboard) { I.toast('Nothing to paste', 'err'); return; }
    window._imgsfixClipboard.clone(function (cl) {
      cl.set({ left: cl.left + 30, top: cl.top + 30 });
      setObjectLocked(cl, false);
      cl.setCoords();
      canvas.add(cl); canvas.setActiveObject(cl); renderAll(); saveState();
    }, SERIALIZE_PROPS);
  }

  function attachKeyHandler() {
    var wrap = $('.editor-canvas-wrap');

    var keydownHandler = function (e) {
      var code = e.code || '';
      var key = String(e.key || '').toLowerCase();
      var modifier = e.ctrlKey || e.metaKey;
      var o = canvas.getActiveObject();
      var isEditing = !!(o && o.isEditing);
      var t = e.target;
      var tag = t && t.tagName ? t.tagName.toUpperCase() : '';
      var isFabricTextarea = tag === 'TEXTAREA' && t.hasAttribute && t.hasAttribute('data-fabric-hiddentextarea');
      var inFormControl = tag === 'INPUT' || tag === 'SELECT' || (tag === 'TEXTAREA' && !isFabricTextarea) || (t && t.isContentEditable);

      /* Escape: close prompt modal, popovers, cancel crop, close start screen, exit text edit, or deselect */
      if (code === 'Escape' || key === 'escape') {
        var promptOverlay = $('#projectPromptModal');
        if (promptOverlay && !promptOverlay.classList.contains('hide')) {
          closeProjectPrompt();
          e.preventDefault();
          return;
        }
        if (hasOpenPopover()) {
          closeAllPopovers();
          e.preventDefault();
          return;
        }
        if (cropSession) {
          cancelCropMode();
          e.preventDefault();
          return;
        }
        var startOverlay = $('#editorStartScreen');
        if (startOverlay && !startOverlay.classList.contains('hide')) {
          closeStartScreen(); e.preventDefault(); return;
        }
        if (isEditing) { o.exitEditing(); canvas.requestRenderAll(); updateContextBar(); e.preventDefault(); return; }
        if (o) { canvas.discardActiveObject(); renderAll(); updateContextBar(); e.preventDefault(); }
        return;
      }

      /* Bypass canvas shortcuts while typing in a form field or editing an i-text */
      if (inFormControl || isEditing || cropSession) return;

      /* Space key: pan mode */
      if (code === 'Space' && !modifier) {
        e.preventDefault();
        if (!isSpaceDown) {
          isSpaceDown = true;
          canvas.selection = false;
          canvas.isDrawingMode = false;
          canvas.skipTargetFind = true;
          if (wrap) wrap.classList.add('pan-ready');
        }
        return;
      }

      /* Arrow nudging */
      var nudge = e.shiftKey ? 10 : 1;
      if (code === 'ArrowLeft' || e.key === 'ArrowLeft') { e.preventDefault(); nudgeObjects(-nudge, 0); return; }
      if (code === 'ArrowRight' || e.key === 'ArrowRight') { e.preventDefault(); nudgeObjects(nudge, 0); return; }
      if (code === 'ArrowUp' || e.key === 'ArrowUp') { e.preventDefault(); nudgeObjects(0, -nudge); return; }
      if (code === 'ArrowDown' || e.key === 'ArrowDown') { e.preventDefault(); nudgeObjects(0, nudge); return; }

      /* Delete / Backspace */
      if (!modifier && (code === 'Delete' || code === 'Backspace' || e.key === 'Delete' || e.key === 'Backspace')) {
        if (o) { e.preventDefault(); deleteSelected(); }
        return;
      }

      if (!modifier) return;

      /* Layout-independent modifier shortcuts (e.code works in Arabic & English layouts) */
      if (code === 'KeyA' || key === 'a') { e.preventDefault(); e.stopPropagation(); selectAllObjects(); return; }
      if ((code === 'KeyZ' || key === 'z') && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); undo(); return; }
      if (code === 'KeyY' || key === 'y' || ((code === 'KeyZ' || key === 'z') && e.shiftKey)) { e.preventDefault(); e.stopPropagation(); redo(); return; }
      if (code === 'KeyD' || key === 'd') { e.preventDefault(); e.stopPropagation(); duplicateSelected(); return; }
      if (code === 'KeyS' || key === 's') { e.preventDefault(); e.stopPropagation(); saveProject(); return; }
      if (code === 'KeyC' || key === 'c') { e.preventDefault(); e.stopPropagation(); copyToClipboard(); return; }
      if (code === 'KeyV' || key === 'v') { e.preventDefault(); e.stopPropagation(); pasteFromClipboard(); return; }
      if ((code === 'KeyG' || key === 'g') && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); groupSelected(); return; }
      if ((code === 'KeyG' || code === 'KeyU' || key === 'g' || key === 'u') && e.shiftKey) { e.preventDefault(); e.stopPropagation(); ungroupSelected(); return; }
    };

    var keyupHandler = function (e) {
      if (e.code === 'Space' && isSpaceDown) {
        isSpaceDown = false;
        isPanning = false;
        canvas.skipTargetFind = false;
        applyToolMode();
        if (wrap) {
          wrap.classList.remove('pan-ready');
          wrap.classList.remove('panning');
        }
        canvas.calcOffset();
      }
    };

    document.addEventListener('keydown', keydownHandler, true);
    document.addEventListener('keyup', keyupHandler, true);
    window.addEventListener('blur', function () {
      if (isSpaceDown || isPanning) {
        isSpaceDown = false;
        isPanning = false;
        canvas.skipTargetFind = false;
        applyToolMode();
        if (wrap) {
          wrap.classList.remove('pan-ready');
          wrap.classList.remove('panning');
        }
      }
    });
  }

  function initKeyboard() {
    attachKeyHandler();
  }

  function groupSelected() {
    var objs = canvas.getActiveObjects();
    if (objs.length < 2) return;
    var sel = canvas.getActiveObject();
    if (sel && sel.type === 'activeSelection') {
      sel.toGroup();
      renderAll(); saveState();
    }
  }

  function ungroupSelected() {
    var o = canvas.getActiveObject();
    if (!o || o.type !== 'group') return;
    o.toActiveSelection();
    renderAll(); saveState();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
