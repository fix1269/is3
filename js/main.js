/* imgsfix — main.js
   Shared logic: i18n (EN/AR), theme, depth-aware BASE,
   header/footer injection, reveal, FAQ, contact form,
   scroll-to-top, modal, toast, search filter, breadcrumbs.
*/
'use strict';

(function () {

  /* ----- BASE path (derived from this script's URL) -----
     main.js always lives at <base>/js/main.js, so the site base
     is its directory with "js/" stripped. This is correct on a
     root domain, a GitHub Pages project subpath (/imgsfix/),
     and from any subpage depth — unlike a pathname-depth guess.
  */
  var BASE = './';
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++) {
    var s = scripts[i].src;
    if (s && /\/js\/main\.js([?#]|$)/.test(s)) {
      BASE = s.replace(/js\/main\.js.*$/, '');
      break;
    }
  }
  function link(p) { return BASE + p; }

  /* ----- selectors ----- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ----- i18n dictionary ----- */
  var I18N = {
    en: {
      // nav
      nav_home: 'Home', nav_tools: 'Tools', nav_editor: 'Editor', nav_qr: 'QR Reader',
      nav_services: 'Services', nav_about: 'About', nav_contact: 'Contact', nav_faq: 'FAQ',
      cta_start: 'Start Editing', cta_browse: 'Browse Tools',
      cta_install: 'Install App',
      // theme
      theme_toggle: 'Toggle theme', light: 'Light', dark: 'Dark',
      // hero
      hero_badge: '100% Client-Side · No Uploads · Private',
      hero_title: 'Fix & Transform Your Images Right in the Browser',
      hero_title_g: 'Right in the Browser',
      hero_lead: 'Compress, resize, convert, crop, enhance, and edit images with zero server round-trips. Your files never leave your device — privacy guaranteed.',
      hero_stat1: '6 Utility Categories', hero_stat2: 'Zero Uploads', hero_stat3: 'Free Forever', hero_stat4: 'No Sign-Up', hero_stat5: 'EN / AR',
      // services
      services_badge: 'What We Do', services_title: 'Three Pillars of imgsfix',
      svc1_t: 'Image Tools', svc1_d: 'Eight focused utilities — compress, resize, convert, crop, remove background, cartoonize, enhance, and apply filters.',
      svc2_t: 'QR & Barcodes', svc2_d: 'Scan QR codes and barcodes from camera or image files instantly, all processed locally on your device.',
      svc3_t: 'Advanced Editor', svc3_d: 'A full-featured canvas editor with shapes, text, layers, presets, undo/redo, and project saving.',
      // categories & tools hub
      tools_badge: 'Utility Hub', tools_title: 'Explore Tools by Category',
      tools_search_ph: 'Search all tools across 6 categories…',
      cat_explore: 'Explore Tools', cat_view: 'View Category',
      status_live: 'Live', status_soon: 'Coming Soon',
      cat_images_t: 'Images & Design', cat_images_d: 'Compress, resize, convert, crop, remove backgrounds, cartoonize, enhance, apply filters, and edit multi-layer designs.', cat_images_meta: '9 Live Tools',
      cat_ai_t: 'Smart Studio', cat_ai_powered: 'AI-Powered', cat_ai_d: 'Create passport & visa photos, edit YouTube & social thumbnails, design die-cut stickers, memes, greeting & quote cards, store promo badges, convert photos into coloring pages, generate 4K wallpapers & seamless patterns, design studio profile pictures (PFP), showcase screenshots & branding in 33+ product & device mockups, and build smart photo collages directly in your browser with maximum privacy.', cat_ai_meta: '8 Live Tools',
      cat_text_t: 'Text & Content', cat_text_d: 'Extract text from images (OCR), generate stylish Unicode fonts, count words & SEO keyword density, clean formatting, compare texts, and summarize text in-browser.', cat_text_meta: '6 Live Tools',
      cat_business_t: 'Business & E-Commerce', cat_business_d: 'Scan QR codes & barcodes offline, create custom QR codes, generate WhatsApp links, and build receipts.', cat_business_meta: '1 Live · 3 Soon',
      cat_media_t: 'Video & Media', cat_media_d: 'Grab MaxRes HD YouTube thumbnails & Shorts covers, capture crisp frame-by-frame video snapshots & bursts, extract audio from video, and trim or boost audio locally.', cat_media_meta: '2 Live · 2 Soon',
      cat_pdf_t: 'PDF & Utilities', cat_pdf_d: 'Merge & split PDFs, convert images & PDFs, e-sign documents, generate strong passwords, and stay focused.', cat_pdf_meta: '5 Tools · Soon',
      // live tools
      t_compress_t: 'Compress', t_compress_d: 'Shrink image file size while keeping quality.',
      t_resize_t: 'Resize Image', t_resize_d: 'Resize image width and height by exact pixels, percentage, or social media presets with crisp quality.',
      t_convert_t: 'Convert Image Format', t_convert_d: 'Convert images between JPG, PNG, WebP, AVIF, ICO, and PDF locally in your browser with smart size optimization.',
      t_crop_t: 'Crop', t_crop_d: 'Trim and frame your image precisely.',
      t_removebg_t: 'Remove BG', t_removebg_d: 'Remove image backgrounds automatically with 100% local in-browser AI.',
      t_cartoon_t: 'Cartoonize', t_cartoon_d: 'Turn photos into cartoon-style art.',
      t_enhance_t: 'Enhance Image Quality', t_enhance_d: 'Automatically boost photo clarity, lighting, and vibrancy in one click with smart denoising and detail recovery.',
      t_filters_t: 'Filters', t_filters_nav: 'Filters', t_filters_d: 'Apply 18 cinematic & photographic color filters with 60fps real-time controls.',
      t_editor_t: 'Advanced Photo Editor', t_editor_d: 'Full-featured canvas editor with shapes, Arabic & English fonts, layers, effects, and project saving.',
      t_qr_t: 'QR & Barcode Reader', t_qr_d: 'Scan QR codes and barcodes from your camera or image files instantly with zero uploads.',
      t_summarizer_t: 'Smart Text Summarizer', t_summarizer_d: 'Summarize articles, study notes, and reports with audience modes, key terms extraction, voice reading, and Word/PDF export.',
      t_diff_t: 'Text Diff & Compare', t_diff_d: 'Compare two texts word-by-word or line-by-line locally in your browser to highlight additions, deletions, and exact edits instantly.',
      t_ocr_t: 'Image to Text (OCR)', t_ocr_d: 'Extract editable Arabic and English text from photos, screenshots, and scanned documents 100% locally inside your browser.',
      t_passport_t: 'Passport & Visa Photo Editor', t_passport_d: 'Create compliant biometric passport and visa photos with local AI background removal, alignment guides, studio lighting, and 300 DPI print sheets.',
      t_thumbnail_t: 'YouTube & Social Thumbnail Editor', t_thumbnail_d: 'Design high-CTR YouTube, Shorts, and social thumbnails locally with starter templates, AI background removal, multi-image layers, bold EN/AR fonts, shapes, arrows, and live YouTube feed preview.',
      t_sticker_studio_t: 'Stickers, Memes & Cards Studio',
      t_sticker_studio_sub: 'Die-Cut Sticker Maker · Meme & Comic Maker · Greeting & Quote Cards · Store Promo Badges',
      t_sticker_studio_d: '4-in-1 local creative studio: make AI die-cut WhatsApp & printable stickers, viral memes, greeting & quote cards, and e-commerce promo badges inside your browser.',
      t_coloring_t: 'Photo to Coloring Page',
      t_coloring_d: 'Turn photos into crisp black-and-white printable coloring sheets locally in your browser with 4 line-art styles, AI background isolation, clean-up eraser, custom title header, and 300 DPI PDF export.',
      t_wallpaper_t: 'Wallpaper & Pattern Generator',
      t_wallpaper_d: 'Create custom 4K wallpapers and seamless patterns locally in your browser with 9 generative engines (Aurora Mesh, Waves, Islamic & Geometric motifs, Low-Poly, Bauhaus, Cosmic Nebula, Mountain Sunset, Night City, Topographic Contours), Base Photo glassmorphism blur, lock-screen preview, and PNG/JPG/SVG export.',
      t_pfp_t: 'Profile Picture (PFP) Maker',
      t_pfp_d: 'Design studio profile avatars locally with AI background cutout, edge refine brush, 46 curated backdrops, 6 frame shapes & 18 rings including 3D pop-out top effect, curved badges, live social platform preview, and multi-platform ZIP export.',
      t_mockup_t: 'Product & Device Mockup Studio',
      t_mockup_d: 'Showcase screenshots, logos, and artwork locally inside 33 realistic devices, print frames, apparel, coffee mugs, packaging boxes, and storefront signs with AI logo background removal, 36+ studio backgrounds, and up to 3000px export.',
      t_collage_t: 'Smart Photo Collage Maker',
      t_collage_d: 'Arrange 2 to 12 photos locally across 60 editorial, Bento, Polaroid, filmstrip, and geometric layouts with interactive pan/zoom/swap, 42 studio backgrounds, typography, and 300 DPI PDF & 3000px export.',
      // planned AI Design Studio tools
      ai_coloring_t: 'Photo to Coloring Page', ai_coloring_d: 'Turn photos and illustrations into crisp black-and-white printable coloring sheets.',
      ai_wallpaper_t: 'Wallpaper & Pattern Generator', ai_wallpaper_d: 'Create custom desktop and mobile wallpapers and seamless patterns matched to your screen.',
      ai_pfp_t: 'Profile Picture (PFP) Maker', ai_pfp_d: 'Design studio profile avatars with clean cutouts, gradient rings, and balanced framing.',
      ai_mockup_t: 'Device Mockup Generator', ai_mockup_d: 'Place app screenshots inside realistic phone, tablet, and laptop frames instantaneously.',
      ai_collage_t: 'Smart Photo Collage Maker', ai_collage_d: 'Arrange photos into balanced multi-frame grids with adjustable spacing and rounded corners.',
      // planned Business & E-Commerce tools
      biz_qrgen_t: 'Custom QR Code Generator', biz_qrgen_d: 'Create branded QR codes with custom colors, logos, Wi-Fi, vCard, and SVG/PNG export.',
      biz_whatsapp_t: 'WhatsApp Link Generator', biz_whatsapp_d: 'Build clean click-to-chat wa.me links with pre-filled messages and QR codes.',
      biz_invoice_t: 'Invoice & Receipt Generator', biz_invoice_d: 'Create clean itemized invoices and receipts and export directly to PDF locally.',
      // planned Text & Content tools
      txt_fancy_t: 'Fancy Text Generator', txt_fancy_d: 'Convert plain text into stylish Unicode fonts, ornate Arabic Kashida calligraphy, gaming tags, and decorative symbols for social bios.',
      txt_counter_t: 'Word & Character Counter', txt_counter_d: 'Count words, characters, sentences, paragraphs, reading & speaking time, social media limits, and top SEO keyword density instantly in-browser.',
      txt_format_t: 'Text Formatter & Cleaner', txt_format_d: 'Clean extra spaces, fix broken PDF line breaks, remove Arabic diacritics, deduplicate or sort lines, strip HTML tags, change case, and extract emails or URLs locally.',
      txt_summary_t: 'AI Text Summarizer', txt_summary_d: 'Extract key takeaways and concise bullet summaries directly inside your browser.',
      // Video & Media tools
      t_yt_thumb_t: 'YouTube Thumbnail & Cover Grabber', t_yt_thumb_d: 'Extract and download official MaxRes HD (1280×720), SD, HQ, and MQ thumbnails from any YouTube video, Shorts, or Live URL as clean JPG or PNG 100% locally in your browser.',
      t_video_frame_t: 'Pro Video Frame Grabber', t_video_frame_d: 'Step through local videos frame-by-frame, run smart auto-burst captures, and export native-resolution PNG, JPG, WebP snapshots or .ZIP packs 100% locally in your browser.',
      media_v2a_t: 'Video to Audio Extractor', media_v2a_d: 'Extract clean MP3/WAV audio tracks from local MP4, WebM, and MOV videos directly inside your browser with zero uploads.',
      med_yt_t: 'YouTube Thumbnail & Cover Grabber', med_yt_d: 'Preview and save public HD & MaxRes thumbnails from any YouTube video URL.',
      med_frame_t: 'Pro Video Frame Grabber', med_frame_d: 'Step through local videos frame-by-frame and export crisp PNG/JPG snapshots.',
      med_audio_t: 'Audio Trimmer & Studio Booster', med_audio_d: 'Cut audio clips, normalize loudness, and convert recordings between WAV and browser-native formats.',
      // planned PDF & Utilities tools
      pdf_merge_t: 'Merge & Split PDF', pdf_merge_d: 'Combine multiple PDFs or extract and reorder pages 100% locally without uploads.',
      pdf_convert_t: 'Image & PDF Converter', pdf_convert_d: 'Convert multi-page PDF documents into images or bundle photos into a clean PDF.',
      pdf_esign_t: 'e-Sign PDF', pdf_esign_d: 'Draw or upload your signature and place it onto PDF pages right in your browser.',
      util_pass_t: 'Password Generator', util_pass_d: 'Generate cryptographically strong, customizable passwords using Web Crypto API.',
      util_pomo_t: 'Pomodoro Focus Timer', util_pomo_d: 'Stay productive with customizable focus intervals, breaks, and gentle local alerts.',
      open_tool: 'Open Tool',
      no_tools: 'No tools match your search.',
      // workflow
      workflow_badge: 'How It Works', workflow_title: 'Three Simple Steps',
      step1_t: 'Pick a Tool', step1_d: 'Browse our 6 utility categories, pick an image tool, scan QR codes, or open the editor.',
      step2_t: 'Drop Your File', step2_d: 'Drag & drop or browse — your image stays on your device, never uploaded.',
      step3_t: 'Download Result', step3_d: 'Process instantly and download the result. No waiting, no accounts.',
      // features
      features_badge: 'Why imgsfix', features_title: 'Built for Privacy & Speed',
      f1_t: '100% Private', f1_d: 'Files never leave your browser. No uploads, no servers.',
      f2_t: 'Lightning Fast', f2_d: 'Instant processing with Canvas API. No queues.',
      f3_t: 'Free Forever', f3_d: 'No subscriptions, no hidden costs, no sign-up required.',
      f4_t: 'Bilingual', f4_d: 'Full English and Arabic support with RTL layout.',
      // cta
      cta_title: 'Ready to Fix Your Images?',
      cta_desc: 'Start using imgsfix now — no downloads, no accounts, just open and go.',
      cta_go: 'Launch Tools', cta_editor: 'Open Editor',
      // footer
      footer_about: 'imgsfix is a privacy-focused, 100% client-side image toolkit. Everything happens in your browser — no uploads, no servers, no tracking.',
      footer_company: 'Company', footer_tools_h: 'Tools', footer_resources: 'Resources',
      footer_privacy: 'Privacy Policy', footer_terms: 'Terms of Use', footer_cookies: 'Cookie Policy', footer_disclaimer: 'Disclaimer',
      footer_rights: 'All rights reserved.', footer_made: 'Made with care for privacy.',
      // scroll top
      scroll_top: 'Back to top',
      // modal
      modal_confirm: 'Confirm', modal_cancel: 'Cancel',
      // tool common
      tc_drop: 'Drop your image here or click to browse', tc_browse: 'Browse Files', tc_supported: 'JPG · PNG · WebP · GIF · BMP',
      tc_download: 'Download', tc_reset: 'Reset', tc_clear: 'Clear', tc_processing: 'Processing…', tc_done: 'Done!',
      tc_original: 'Before', tc_result: 'After', tc_size: 'Size', tc_quality: 'Quality',
      // content nav
      page_about: 'About', page_services: 'Services', page_contact: 'Contact', page_faq: 'FAQ',
      page_privacy: 'Privacy Policy', page_terms: 'Terms', page_cookies: 'Cookies', page_disclaimer: 'Disclaimer',
      page_404: 'Page Not Found', go_home: 'Go Home',
      // breadcrumb
      bc_home: 'Home',
      // upload button
      t_upload: 'Upload Image',
      // tool settings
      tc_compress_settings: 'Compress Settings', tc_max_width: 'Max Width (px)', tc_before: 'Before', tc_after: 'After', tc_saved: 'Saved',
      tc_presets: 'Presets', tc_preset_hq: 'High Quality', tc_preset_balanced: 'Balanced', tc_preset_ultra: 'Ultra Small', tc_recommended: 'Recommended',
      tc_target_size: 'Target Size (KB) — Optional', tc_target_size_ph: 'e.g. 200',
      tc_already_opt: 'Already optimized — kept original size (0% increase)',
      tc_target_reached: 'Target size reached', tc_target_closest: 'Smallest possible size reached',
      tc_png_fallback: 'Saved as lossless PNG for smaller size',
      tc_compress_bomb: 'Image dimensions too large (max 16,384px / 64MP)',
      tc_load_first: 'Load an image first', tc_file_too_large: 'File too large (max 50MB)',
      tc_img_only: 'Supported image formats only', tc_img_load_err: 'Failed to load image', tc_compress_err: 'Compression failed',
      tc_resize_settings: 'Resize Settings', tc_width_px: 'Width (px)', tc_height_px: 'Height (px)', tc_lock_ar: 'Lock aspect ratio', tc_apply: 'Apply',
      tc_resize_by_pixels: 'By Pixels (px)', tc_resize_by_percent: 'By Percentage (%)',
      tc_resize_presets: 'Social & Web Presets',
      tc_preset_ig_post: 'Instagram Post', tc_preset_story: 'Story / TikTok', tc_preset_yt_thumb: 'YouTube Thumbnail', tc_preset_fhd: 'Full HD', tc_preset_fb_cover: 'Facebook Cover',
      tc_percent_scale: 'Scale Percentage', tc_percent_result: 'Output Dimensions',
      tc_no_enlarge: 'Do not enlarge if original is smaller',
      tc_resize_orig_label: 'Original', tc_resize_new_label: 'New',
      tc_resize_invalid: 'Enter valid dimensions (1–16384 px)', tc_resize_export_err: 'Failed to export resized image',
      tc_convert_settings: 'Convert Settings', tc_format: 'Format',
      tc_fmt_jpg_badge: 'Small', tc_fmt_png_badge: 'Transparent', tc_fmt_webp_badge: 'Modern',
      tc_fmt_avif_badge: 'Next-Gen', tc_fmt_ico_badge: 'Favicon', tc_fmt_pdf_badge: 'Document', tc_fmt_bmp_badge: 'Bitmap',
      tc_convert_smart_png: 'Smart PNG Compression (Prevent Size Bloat)',
      tc_convert_bg_fill: 'Transparent Background Fill', tc_convert_bg_white: 'White', tc_convert_bg_black: 'Black', tc_convert_bg_custom: 'Custom',
      tc_convert_ico_size: 'Favicon Icon Size', tc_convert_ico_multi: 'Multi-size (16 / 32 / 48 px)',
      tc_convert_avif_unsupported: 'AVIF encoding is not supported by this browser — please choose WebP or JPG.',
      tc_convert_orig: 'Original', tc_convert_out: 'Converted', tc_convert_err: 'Conversion failed',
      tc_crop_settings: 'Crop Settings', tc_free: 'Free',
      tc_aspect_ratio: 'Aspect Ratio', tc_ratio_portrait: '4:5', tc_ratio_cover: '1.91:1',
      tc_circle_crop: 'Circle / Avatar Crop', tc_custom_crop_size: 'Custom Crop Size (px)',
      tc_transform: 'Transform', tc_rotate_left: 'Rotate -90°', tc_rotate_right: 'Rotate +90°',
      tc_flip_h: 'Flip H', tc_flip_v: 'Flip V', tc_straighten: 'Straighten', tc_reset_angle: '0°',
      tc_selection_size: 'Selection', tc_crop_hint: 'Drag handles or edges to frame your crop',
      tc_crop_fail: 'Crop failed. Please try again.', tc_make_selection: 'Make a selection first',
      tc_redo: 'Redo', tc_undo_tip: 'Undo (Ctrl+Z)', tc_redo_tip: 'Redo (Ctrl+Y)',
      tc_open_editor: 'Open in Editor', tc_transfer_err: 'Could not transfer image to editor',
      tc_crop_again: 'Crop Again',
      tc_open_editor_tip: 'Add text, shapes, arrows, stickers, and filters in the Advanced Editor',
      tc_open_editor_hint: 'Want to add text, arrows, or shapes? Click "Open in Editor" above.',
      tc_crop_shortcuts_hint: 'Shortcuts: Ctrl+Z Undo · Ctrl+Y Redo · Arrows Move · Enter Apply · Esc Reset Box',
      tc_editor_bridge_hint: 'Need to add text, arrows, shapes, stickers, or multi-layer edits?',
      tc_editor_bridge_btn: 'Open in Advanced Editor →',
      tc_removebg_settings: 'Remove BG Settings', tc_output_bg: 'Output Background', tc_transparent: 'Transparent', tc_white: 'White', tc_custom_color: 'Custom Color',
      tc_removebg_auto_btn: 'Auto Remove Background',
      tc_removebg_hint: '100% private in-browser AI. Everything runs locally on your device — no uploads.',
      tc_removebg_scanning: 'Removing background... (may take a few seconds on first use)',
      tc_brush_restore: 'Restore',
      tc_brush_erase: 'Erase',
      tc_brush_size: 'Brush Size',
      tc_undo: 'Undo',
      tc_peek_original: 'Hold to Compare',
      tc_removebg_load_first: 'Load an image first',
      tc_removebg_fail: 'Background removal failed. Please try again.',
      tc_removebg_file_large: 'File too large (max 50MB)',
      tc_removebg_img_only: 'Supported image formats only',
      tc_removebg_img_err: 'Failed to load image',
      tc_removebg_nothing: 'Nothing to download',
      tc_removebg_export_err: 'Export failed',
      tc_cartoon_settings: 'Cartoon Settings', tc_cartoon_styles: 'Cartoon & Art Styles',
      tc_edge_intensity: 'Edge Intensity', tc_detail_intensity: 'Line / Detail', tc_effect_strength: 'Effect Strength', tc_color_levels: 'Color Levels', tc_smoothness: 'Smoothness',
      tc_cs_classic: 'Classic 2D', tc_cs_anime: 'Anime Glow', tc_cs_comic: 'Comic Halftone', tc_cs_soft_toon: '3D Soft Toon',
      tc_cs_pencil: 'Pencil Sketch', tc_cs_color_pencil: 'Colored Pencil', tc_cs_ink_pen: 'Ink & Pen Art', tc_cs_watercolor: 'Watercolor',
      tc_cs_oil_paint: 'Oil Painting', tc_cs_pop_art: 'Pop Art', tc_cs_neon_toon: 'Neon Line-Art', tc_cs_pixel_art: '8-Bit Pixel Art',
      tc_enhance_settings: 'Enhance Settings', tc_brightness: 'Brightness', tc_contrast: 'Contrast', tc_saturation: 'Saturation', tc_sharpness: 'Sharpness',
      tc_auto_enhance: 'Auto Enhance', tc_enhance_modes: 'Smart Modes',
      tc_mode_auto: 'Auto Balance', tc_mode_clarity: 'HD Clarity & Crisp', tc_mode_portrait: 'Portrait Glow', tc_mode_lowlight: 'Low-Light Fix', tc_mode_old_photo: 'Old Photo Clarity',
      tc_vibrance: 'Vibrance / Saturation', tc_clarity: 'Clarity / Sharpness', tc_denoise: 'Denoise',
      tc_auto_applied: 'Smart Auto-Enhance applied', tc_enhance_export_err: 'Failed to export enhanced image',
      tc_filters_settings: 'Filter Presets', tc_filter_adjustments: 'Fine-Tune Adjustments',
      tc_intensity: 'Filter Intensity', tc_vignette: 'Vignette', tc_no_filter: 'Reset Filter & Adjustments',
      tc_fp_original: 'Original', tc_fp_grayscale: 'Grayscale', tc_fp_sepia: 'Sepia', tc_fp_vintage: 'Vintage',
      tc_fp_cool: 'Cool', tc_fp_warm: 'Warm', tc_fp_vivid: 'Vivid', tc_fp_noir: 'Noir',
      tc_fp_faded: 'Faded', tc_fp_invert: 'Invert', tc_fp_blur: 'Blur', tc_fp_sharpen: 'Sharpen',
      tc_fp_golden_hour: 'Golden Hour', tc_fp_teal_orange: 'Teal & Orange', tc_fp_dramatic: 'Dramatic',
      tc_fp_soft_pastel: 'Soft Pastel', tc_fp_retro_film: 'Retro Film', tc_fp_bright_airy: 'Bright & Airy',
      preview_bg_toolbar: 'Change preview backdrop color',
      preview_bg_studio: 'Default studio backdrop',
      preview_bg_white: 'Pure white backdrop',
      preview_bg_dark: 'Dark charcoal backdrop',
      preview_bg_checker: 'Transparency checkerboard',
      preview_bg_custom: 'Custom backdrop color',
      // QR reader
      qr_camera: 'Camera', qr_image_file: 'Image File', qr_start_cam: 'Start Camera', qr_stop: 'Stop',
      qr_drop: 'Drop an image with a QR/barcode or click to browse', qr_detected: 'Detected: ', qr_copy: 'Copy', qr_open_url: 'Open URL', qr_clear: 'Clear',
      qr_scan_desc: 'Scan QR codes and barcodes from your camera or image files — all locally in your browser.',
      // Smart Text Summarizer
      ts_audience_label: 'Audience Mode',
      ts_mode_study: 'Study Notes', ts_mode_executive: 'Executive Summary', ts_mode_article: 'Article Digest', ts_mode_bullets: 'Quick Key Points',
      ts_ratio_label: 'Summary Length',
      ts_ratio_25: 'Concise (25%)', ts_ratio_40: 'Balanced (40%)', ts_ratio_60: 'Detailed (60%)',
      ts_btn_summarize: 'Summarize Now',
      ts_input_title: 'Source Text', ts_output_title: 'Summary & Key Points',
      ts_btn_paste: 'Paste', ts_btn_sample: 'Sample Text', ts_btn_upload: 'Upload Text File', ts_btn_select_all: 'Select All',
      ts_word_pdf_hint: 'Using a Word (.doc/.docx) or PDF file? Copy the text from your document and paste it directly below.',
      ts_input_ph: 'Paste or type your article, study notes, or report here (Arabic or English)…',
      ts_words: 'Words', ts_chars: 'Characters', ts_sentences: 'Sentences',
      ts_file_hint: '.txt · .md · .csv (max 5MB)',
      ts_btn_copy: 'Copy', ts_btn_listen: 'Listen', ts_btn_stop: 'Stop Reading',
      ts_btn_word: 'Word (.doc)', ts_btn_pdf: 'Print / PDF', ts_btn_txt: 'TXT',
      ts_empty_hint: 'Enter or paste text on the left, choose an audience mode, and click Summarize Now.',
      ts_key_terms: 'Key Terms & Concepts',
      ts_orig_words: 'Original', ts_sum_words: 'Summary', ts_reduction: 'Reduction',
      ts_print_title: 'Print / Save as PDF', ts_btn_print_now: 'Print / Save PDF',
      ts_enter_text_first: 'Please enter or paste text first',
      ts_text_too_long: 'Text exceeds maximum length (500,000 characters)',
      ts_clipboard_empty: 'Clipboard is empty', ts_pasted_ok: 'Text pasted',
      ts_paste_fallback: 'Box cleared — press Ctrl+V (or tap Paste) to insert your text',
      ts_file_type_err: 'Please select a .txt, .md, or .csv file',
      ts_file_size_err: 'File too large (max 5MB)',
      ts_file_empty_err: 'Selected file is empty', ts_file_loaded_ok: 'File loaded locally', ts_file_read_err: 'Failed to read file',
      ts_copied_ok: 'Summary copied to clipboard', ts_copy_err: 'Failed to copy text',
      ts_tts_unsupported: 'Speech synthesis is not supported in this browser',
      ts_no_ar_voice: 'No Arabic voice pack is installed in your browser/OS.',
      // Word Counter & SEO Keyword Analyzer
      wc_chars_with: 'Characters (with spaces)',
      wc_chars_no: 'Characters (no spaces)',
      wc_paragraphs: 'Paragraphs',
      wc_read_time: 'Reading Time',
      wc_speak_time: 'Speaking Time',
      wc_input_title: 'Your Text',
      wc_copy_report: 'Copy Stats Report',
      wc_btn_upload: 'Upload .txt / .md',
      wc_btn_copy_text: 'Copy Text',
      wc_input_ph: 'Type or paste your article, post, meta description, or essay here (Arabic or English)…',
      wc_speed_note: '200 WPM reading · 130 WPM speaking · 100% local',
      wc_file_hint: '.txt · .md (max 5MB)',
      wc_limits_title: 'Social Media & SEO Limits',
      wc_limit_meta: 'Google Meta Description',
      wc_limit_x: 'X / Twitter Post',
      wc_limit_ig: 'Instagram Caption',
      wc_status_empty: 'Empty',
      wc_status_ok: 'Within limit',
      wc_status_near: 'Near limit',
      wc_status_over: 'Over limit',
      wc_kw_title: 'Top Keyword Density',
      wc_ngram_1: '1-Word Terms',
      wc_ngram_2: '2-Word Phrases',
      wc_kw_empty: 'Start typing or paste text to analyze top SEO keywords and density.',
      wc_kw_none: 'No significant keywords found yet — enter more content.',
      wc_col_keyword: 'Keyword',
      wc_col_count: 'Count',
      wc_col_density: 'Density %',
      wc_file_type_err: 'Please select a .txt or .md file',
      wc_copied_text_ok: 'Text copied to clipboard',
      wc_report_copied_ok: 'Statistics report copied to clipboard',
      // Text Formatter & Cleaner
      tf_editor_title: 'Text Workspace',
      tf_instant_note: '100% client-side · Instant cleanup',
      tf_btn_copy: 'Copy Result',
      tf_btn_download_txt: 'Download .txt',
      tf_input_ph: 'Paste messy text, PDF paragraphs, HTML snippets, or lists here (Arabic or English)…',
      tf_lines: 'Lines',
      tf_group_a: 'Essential Cleanup (Arabic & English)',
      tf_act_pdf: 'Fix Broken PDF Line Breaks',
      tf_act_spaces: 'Remove Extra Spaces',
      tf_act_empty: 'Remove Empty Lines',
      tf_act_dedupe: 'Remove Duplicate Lines',
      tf_act_tashkeel: 'Remove Arabic Diacritics',
      tf_act_html: 'Strip HTML Tags',
      tf_group_b: 'Case, Lists & Smart Extractors',
      tf_act_sort: 'Sort Lines A → Z',
      tf_act_reverse: 'Reverse Lines',
      tf_act_number: 'Add Line Numbers (1, 2, 3)',
      tf_act_emails: 'Extract Emails',
      tf_act_urls: 'Extract URLs',
      tf_applied_ok: 'Text formatted cleanly',
      tf_extracted_ok: 'Extracted matches cleanly',
      tf_no_changes: 'Text is already clean for this action',
      tf_undone_ok: 'Reverted last formatting step',
      tf_no_emails: 'No email addresses found in text',
      tf_no_urls: 'No website URLs found in text',
      // text diff tool
      td_btn_compare: 'Compare Texts',
      td_btn_swap: 'Swap Texts',
      td_btn_sample: 'Sample Texts',
      td_btn_clear_both: 'Clear Both',
      td_mode_word: 'Word-by-Word',
      td_mode_line: 'Line-by-Line',
      td_opt_ignore_ws: 'Ignore Extra Whitespace',
      td_opt_ignore_case: 'Ignore Case (EN)',
      td_orig_title: 'Original Text',
      td_mod_title: 'Modified Text',
      td_orig_ph: 'Paste or type the original text here (Arabic or English)…',
      td_mod_ph: 'Paste or type the modified text here (Arabic or English)…',
      td_diff_title: 'Comparison Result',
      td_copy_report: 'Copy Diff Report',
      td_stat_additions: 'Additions',
      td_stat_deletions: 'Deletions',
      td_stat_unchanged: 'Unchanged',
      td_identical: 'Texts are 100% identical!',
      td_empty_hint: 'Enter or paste texts above and click Compare Texts (or press Ctrl+Enter) to view differences.',
      td_enter_both: 'Please enter text in at least one box to compare',
      td_swapped_ok: 'Swapped original and modified texts',
      td_report_copied_ok: 'Diff report copied to clipboard',
      // fancy text generator
      ft_input_title: 'Your Text or Name',
      ft_input_ph: 'Type any English or Arabic name, bio, or phrase here…',
      ft_frame_label: 'Quick Prefix / Suffix Frame',
      ft_frame_none: 'None',
      ft_more_plus: 'More +',
      ft_prev: 'Previous',
      ft_next: 'Next',
      ft_tab_all: 'All',
      ft_tab_social: 'Modern Social & Bio',
      ft_tab_arabic: 'Arabic Ornate & Calligraphy',
      ft_tab_gaming: 'Gaming & Clans',
      ft_tab_favs: 'Favorites',
      ft_styles_unit: 'Styles',
      ft_copied_btn: 'Copied ✓',
      ft_copied_ok: 'Styled text copied to clipboard',
      ft_favs_empty: 'No favorite styles saved yet. Click the ★ button on any card to pin it here.',
      ft_toggle_fav: 'Toggle favorite',
      ft_sym_title: 'Quick-Insert Symbols & Emojis',
      ft_sym_hint: 'Click any symbol to insert at cursor and copy to clipboard.',
      ft_sym_mode_copy: 'Copy on Click',
      ft_sym_mode_append: 'Append to Input',
      ft_sym_faces: 'Faces & Emotions',
      ft_sym_hands: 'Hands & Gestures',
      ft_sym_stars: 'Stars & Sparkles',
      ft_sym_brackets: 'Brackets & Dividers',
      ft_sym_gaming: 'Pro Gaming & Badges',
      ft_sym_nature: 'Royal & Celebration',
      ft_sym_minimal: 'Aesthetic & Minimal',
      ft_sym_hearts: 'Hearts & Marks',
      ft_sym_arrows: 'Arrows & Checkmarks',
      ft_sym_copied_ok: 'Symbol copied to clipboard',
      ft_sym_appended_ok: 'Symbol added to your text',
      ft_sym_inserted_copied: 'Symbol inserted & copied to clipboard',
      // about page
      about_intro: 'imgsfix is a privacy-focused image toolkit that runs entirely in your browser — no uploads, no servers, no tracking.',
      about_mission: 'Our Mission',
      about_mission_p1: 'imgsfix exists for one simple reason: you should be able to fix, transform, and edit your images without surrendering them to a stranger\'s server. Every day, millions of people upload personal photos, business documents, and sensitive visuals to online tools that quietly copy, store, and sometimes analyze them. We built imgsfix to break that pattern.',
      about_mission_p2: 'Our mission is to provide a complete, professional-grade image toolkit that never sends a single byte of your files anywhere. Everything — compression, resizing, format conversion, cropping, background removal, cartoonization, enhancement, filters, QR scanning, and full canvas editing — happens right inside your browser, on your own device, using processing power you already have.',
      about_mission_p3: 'We believe privacy is not a premium feature or a marketing slogan. It is the baseline. A tool that respects your data should not need to promise it won\'t misuse it — it should simply never collect it in the first place. That is the standard imgsfix is built to.',
      about_how: 'How It Works', about_team: 'Our Team Philosophy', about_tech: 'Technology We Use',
      about_free: 'Our Commitment to Free Access', about_values: 'Our Privacy Values',
      // services page
      services_intro: 'Three pillars of free, privacy-focused image processing — all running 100% in your browser.',
      services_p1: 'imgsfix is organized around three complementary pillars. Together they cover the full range of everyday image tasks — from a quick resize to a multi-layer design — without ever requiring you to upload a file or create an account. Below is a detailed look at each pillar and the tools within it.',
      svc_tools_title: '🔧 Image Tools', svc_qr_title: '📷 QR & Barcode Reader', svc_editor_title: '🎨 Advanced Editor',
      svc_editor_key: 'Key Capabilities', svc_tie_title: 'What Ties Them Together',
      // faq page
      faq_intro: 'Frequently asked questions about imgsfix — how it works, privacy, supported formats, and more.',
      faq_a1: 'imgsfix is a free, privacy-focused image toolkit that runs entirely in your web browser. It offers eight image tools (compress, resize, convert, crop, remove background, cartoonize, enhance, and filters), a QR & barcode reader, and a full-featured advanced editor. Every operation is performed locally on your device using HTML5 Canvas and JavaScript — no file is ever uploaded to a server.',
      faq_not_found: 'Did not find what you were looking for?', faq_contact: 'Contact Us', faq_view_services: 'View Services',
      // privacy page
      privacy_intro: 'Your privacy is not a feature — it is the foundation. This policy explains exactly what imgsfix does and does not do with your data.',
      privacy_last_updated: 'Last updated: July 2026',
      // terms page
      terms_intro: 'The terms and conditions that govern your use of imgsfix. Please read them carefully.',
      page_terms_full: 'Terms of Use',
      // cookies page
      page_cookies_full: 'Cookie Policy', cookies_intro: 'The good news: imgsfix does not use tracking cookies. Here is exactly what we do and do not store on your device.',
      // disclaimer page
      disclaimer_intro: 'Important information about the nature of imgsfix and the limits of what it provides.',
      disclaimer_last_updated: 'Last updated: July 2026',
      // 404 page
      err404_title: 'Oops! This Page Got Lost',
      err404_desc: 'The page you are looking for might have been moved, renamed, or never existed. But do not worry — your images are safe, and our tools are just a click away.',
      // contact page
      contact_intro: 'Have feedback, a feature request, or a question? We would love to hear from you.',
      contact_desc: 'Whether you found a bug, have an idea for a new tool, or just want to say hello, this is the place. Fill out the form below and we will get back to you as soon as we can.',
      contact_name: 'Name', contact_name_ph: 'Your name',
      contact_email: 'Email', contact_email_ph: 'you@example.com',
      contact_subject: 'Subject', contact_subject_ph: 'What is this about?',
      contact_message: 'Message', contact_message_ph: 'Tell us what is on your mind…',
      contact_send: 'Send Message',
      contact_before_title: 'Before You Write…', contact_before_desc: 'You might find a quick answer in one of these pages. We have put together detailed content covering the most common questions:',
      contact_link_faq: 'Answers to questions about how imgsfix works, privacy, supported formats, browsers, offline use, and more.',
      contact_link_about: 'Our mission, how the tools work, our team philosophy, and the technology behind imgsfix.',
      contact_link_services: 'A full overview of the three pillars: image tools, QR reader, and the advanced editor.',
      contact_link_privacy: 'Detailed explanation of our zero-data-collection approach.',
      contact_link_terms: 'The terms governing your use of imgsfix.',
      contact_include_title: 'What to Include', contact_include_desc: 'To help us respond quickly and usefully, please include as much of the following as relevant:',
      contact_include_1: 'The name of the tool or page where you encountered an issue.',
      contact_include_2: 'Your browser and operating system (e.g., Chrome 120 on Windows, Safari on iPhone).',
      contact_include_3: 'The image format and approximate file size, if your question involves a specific file.',
      contact_include_4: 'Steps to reproduce any bug you are reporting.',
      contact_include_5: 'A description of what you expected to happen versus what actually happened.',
      contact_include_6: 'Feature requests are always welcome. If there is an image tool you wish imgsfix had, tell us about it — we prioritize additions that serve the most users while staying true to our privacy-first, client-side architecture.',
      // editor page
      editor_desc: 'A full-featured canvas editor with shapes, text, layers, presets, and undo/redo — all in your browser.',
      ed_undo: '↶ Undo', ed_redo: '↷ Redo', ed_duplicate: '⎘ Duplicate', ed_delete: '✕ Delete',
      ed_front: '⬆ Front', ed_forward: '↑ Forward', ed_backward: '↓ Backward', ed_back: '⬇ Back',
      ed_export: '📥 Export', ed_save: '💾 Save', ed_save_file: '⬇ Save File', ed_new_project: '✨ New Project', ed_clear: '🗑 Clear',
      ed_presets: 'Presets', ed_width: 'Width', ed_height: 'Height', ed_custom_size: 'Apply', ed_a4_print: 'A4 Print 2480×3508', ed_canvas_size: 'Canvas',
      ed_tools: 'Tools', ed_select: 'Select', ed_brush: 'Brush', ed_text: 'Text',
      ed_rect: 'Rect', ed_circle: 'Circle', ed_triangle: 'Triangle', ed_line: 'Line', ed_arrow: 'Arrow', ed_upload_short: 'Upload',
      ed_brush_settings: 'Brush', ed_color: 'Color',
      ed_properties: 'Properties', ed_fill: 'Fill',
      ed_stroke: 'Frame', ed_stroke_width: 'Frame:', ed_text_align: 'Align',
      ed_align_artboard: 'Artboard', ed_align_multi: 'Align Selection',
      ed_font_family_label: 'Font:', ed_fonts_ar: 'Arabic Fonts', ed_fonts_en: 'English Fonts',
      ed_text_label: 'Text', ed_align_left: 'Left', ed_align_center: 'Center', ed_align_right: 'Right',
      ed_zoom: 'Zoom', ed_fit: 'Fit', ed_background: 'BG', ed_layers: 'Layers', ed_no_layers: 'No layers yet',
      ed_layer_hide: 'Hide layer', ed_layer_show: 'Show layer', ed_layer_lock: 'Lock layer', ed_layer_unlock: 'Unlock layer', ed_layer_delete: 'Delete layer', ed_layer_select: 'Select layer',
      ed_shortcuts: 'Shortcuts', ed_sc_btn: '⌨ Shortcuts',
      ed_sc_del: 'Delete selected object', ed_sc_sel_all: 'Select all objects', ed_sc_multi: 'Multi-select objects',
      ed_sc_nudge: 'Nudge 1px / 10px', ed_sc_pan: 'Pan workspace', ed_sc_wheel: 'Mouse Wheel Zoom to cursor',
      ed_sc_copy_paste: 'Copy / Paste object', ed_sc_group: 'Group / Ungroup', ed_sc_deselect: 'Deselect / Exit edit',
      ed_sc_undo: 'Undo', ed_sc_redo: 'Redo', ed_sc_dup: 'Duplicate object', ed_sc_save: 'Save to browser',
      ed_sc_key_del: 'Del / Backspace', ed_sc_key_multi: 'Shift / Ctrl + Click', ed_sc_key_arrows: 'Arrows / Shift+Arrows', ed_sc_key_pan: 'Space + Drag',
      ed_drop: 'Drop an image here or click to browse',
      ed_start_title: 'Start Your Project', ed_start_subtitle: 'Choose a canvas size or continue working on your previous designs.',
      ed_start_new: 'New Design', ed_start_new_desc: 'Pick a ready-made preset or enter custom pixel dimensions.', ed_start_create: 'Start Designing',
      ed_start_resume: 'Continue Last Design', ed_start_resume_desc: 'Resume your last project saved in this browser.', ed_start_resume_btn: 'Resume Design', ed_start_no_session: 'No saved design found in this browser.',
      ed_start_open: 'Open Project File', ed_start_open_desc: 'Load a previously saved project file from our site to keep editing.', ed_start_browse: 'Browse Files', ed_start_file_hint: 'Supported formats: .project.json / .json',
      ed_file_saved: 'Project file downloaded!', ed_file_loaded: 'Project file loaded!', ed_file_invalid: 'Invalid or corrupted project file',
      ed_sel_all: 'Select All', ed_group: 'Group', ed_ungroup: 'Ungroup',
      ed_effects: '✨ Effects', ed_text_effects: '✨ Text Effects', ed_shape_effects: '✨ Shape Effects',
      ed_flip_h: '⇄ Flip H', ed_flip_v: '⇅ Flip V',
      ed_crop: '✂ Crop', ed_crop_apply: '✓ Apply Crop', ed_crop_cancel: '✕ Cancel', ed_crop_free: 'Free',
      ed_set_bg: '🖼 Set as Background', ed_detach_bg: '🔓 Detach Background', ed_bg_layer_badge: 'Background',
      ed_fx_image_title: 'Image Effects & Filters', ed_fx_brightness: 'Brightness', ed_fx_contrast: 'Contrast',
      ed_fx_saturation: 'Saturation', ed_fx_blur: 'Blur', ed_fx_sharpen: 'Sharpen',
      ed_fx_presets: 'Presets', ed_fx_original: 'Original', ed_fx_grayscale: 'Grayscale',
      ed_fx_sepia: 'Sepia', ed_fx_vintage: 'Vintage', ed_fx_warm: 'Warm', ed_fx_cool: 'Cool', ed_fx_invert: 'Invert',
      ed_fx_text_title: 'Text Effects', ed_fx_shadow: 'Drop Shadow', ed_fx_shadow_color: 'Color',
      ed_fx_shadow_blur: 'Blur', ed_fx_offset_x: 'Offset X', ed_fx_offset_y: 'Offset Y',
      ed_fx_outline: 'Text Outline', ed_fx_outline_width: 'Width', ed_fx_highlight: 'Text Highlight',
      ed_fx_letter_spacing: 'Letter Spacing', ed_fx_line_height: 'Line Height',
      ed_fx_shape_title: 'Shape Effects', ed_fx_corner_radius: 'Corner Radius',
      ed_fx_border_style: 'Border Style', ed_fx_solid: 'Solid', ed_fx_dashed: 'Dashed', ed_fx_dotted: 'Dotted',
      ed_export_title: 'Export Design', ed_export_filename: 'File Name', ed_export_format: 'Format', ed_export_quality: 'Quality',
      ed_export_scale: 'Resolution', ed_export_1x: '1x Standard', ed_export_2x: '2x High HD', ed_export_3x: '3x Print',
      ed_export_download: 'Download', ed_exported: 'Exported!',
      ed_bg_set_ok: 'Set as canvas background', ed_bg_detached_ok: 'Background detached to editable layer', ed_crop_applied: 'Crop applied!',
      ed_untitled: 'Untitled Design', ed_project_name: 'Project Name', ed_rename_project_title: 'Edit Project Name',
      ed_save_project_title: 'Save Project', ed_save_project_desc: 'Enter a name for your design to save it in this browser.',
      ed_rename_title: 'Rename Project', ed_rename_desc: 'Enter a new name for this project.',
      ed_recent_projects: 'Recent Projects', ed_recent_desc: 'Open, rename, download, or manage designs saved in this browser.',
      ed_recent_empty: 'No saved projects yet. Create a design and click Save.',
      ed_open: 'Open', ed_rename: 'Rename', ed_download_file: 'Download File', ed_delete_project: 'Delete',
      ed_delete_confirm_title: 'Delete Project', ed_delete_confirm_body: 'Remove this project from browser storage? This cannot be undone.',
      ed_created_on: 'Created', ed_last_modified: 'Modified',
      ed_project_saved: 'Project saved!', ed_project_renamed: 'Project renamed!', ed_project_deleted: 'Project deleted',
      ed_name_required: 'Please enter a project name',
      ed_export_vector_hint: 'Vector SVG (Scalable)', ed_export_pdf_hint: 'Print-ready PDF',
      // tool labels with dynamic values
      tc_jpeg: 'JPEG', tc_png: 'PNG', tc_webp: 'WebP',
      ed_width_label: 'Size:', ed_opacity_label: 'Opacity:', ed_rotation_label: 'Angle:', ed_font_size_label: 'Size:',
      ed_zoom_out: '\u2212', ed_zoom_in: '+',
      // about page detailed
      about_how_p1: 'When you open a tool on imgsfix and select an image, that file is read directly into your browser\'s memory using the File API. It is then drawn onto an HTML5 <code>&lt;canvas&gt;</code> element, where JavaScript manipulates the pixels in real time. When you are happy with the result, the canvas is exported back into a downloadable image file \u2014 again, entirely on your device.',
      about_how_p2: 'At no point in this process does your image travel over the internet. There is no upload step, no temporary server storage, no background processing queue, and no log of what you edited. If you close the tab, the image is gone from memory. The only copy that ever exists is the one you downloaded.',
      about_how_p3: 'This architecture is sometimes called "client-side" or "zero-knowledge" processing. It means we literally cannot see your files \u2014 not because we choose not to look, but because they are never sent to us in the first place.',
      about_team_p1: 'imgsfix is built by developers who were tired of the trade-off between convenience and privacy. We saw powerful online image editors that demanded account creation, tracked usage patterns, and stored user files indefinitely \u2014 and we asked a simple question: why? Modern browsers are more than capable of handling image processing locally. The server round-trip is unnecessary, and so is the privacy cost that comes with it.',
      about_team_p2: 'Our philosophy can be summed up in three principles:',
      about_team_l1: 'Privacy by architecture, not by promise. We don\'t rely on policies to protect your data \u2014 we rely on the fact that we never receive it.',
      about_team_l2: 'Free access for everyone. Useful tools should not be locked behind paywalls, trials, or sign-up walls. imgsfix is free to use, today and always.',
      about_team_l3: 'Open and transparent. The logic that processes your images runs in your browser where you can inspect it. No black boxes, no hidden behavior.',
      about_tech_p1: 'imgsfix is deliberately built on web standards rather than heavy frameworks. This keeps the site fast, lightweight, and easy to audit. The core technologies include:',
      about_tech_l1: 'HTML5 Canvas API \u2014 the foundation for all image manipulation. Every tool draws your image onto a canvas and reads or modifies the pixel data directly.',
      about_tech_l2: 'Vanilla JavaScript \u2014 no build step, no transpiler, no framework runtime. The code that runs is the code you can read.',
      about_tech_l3: 'File API & FileReader \u2014 lets your browser read selected or dropped files into memory without uploading them.',
      about_tech_l4: 'BarcodeDetector API \u2014 a native browser API used by the QR & barcode reader for fast, local scanning.',
      about_tech_l5: 'Fabric.js \u2014 a lightweight canvas library powering the advanced editor\'s shapes, text, layers, and object manipulation.',
      about_tech_l6: 'localStorage \u2014 used only to remember your theme (light/dark) and language (English/Arabic) preferences. No other data is stored.',
      about_tech_p2: 'We deliberately avoid analytics scripts, advertising trackers, and third-party processing services. The only external resource loaded is the Cairo font from Google Fonts, which is used for typography.',
      about_free_p1: 'imgsfix is free to use for everyone \u2014 individuals, students, freelancers, small businesses, and enterprises alike. There are no subscriptions, no premium tiers, no usage limits, and no watermarks added to your output. You do not need to create an account, provide an email address, or identify yourself in any way.',
      about_free_p2: 'We intend to keep it this way. The tools you see today will remain free, and new tools we add in the future will be free as well. We believe that privacy-respecting software should be accessible to everyone, not just those who can afford to pay for it.',
      about_free_p3: 'If you find imgsfix useful, the best way to support us is simply to share it with others who care about their privacy. Word of mouth is how a tool like this grows \u2014 no ad campaigns, no tracking pixels, just people telling people.',
      about_values_p1: 'Privacy is not a feature we added \u2014 it is the reason imgsfix exists. These are the values that guide every decision we make:',
      about_values_l1: 'No data collection. We do not collect, store, or transmit your images, your editing choices, or your personal information. There is no database of user activity because there is no server receiving it.',
      about_values_l2: 'No tracking. We do not use analytics, advertising pixels, fingerprinting scripts, or any technology that follows you across the web.',
      about_values_l3: 'No cookies. We do not set tracking cookies. The only local storage we use is for your theme and language preferences, which live on your device and never leave it.',
      about_values_l4: 'No accounts. You never need to sign up or log in. Your identity is your own business, and your images are your own property.',
      about_values_l5: 'Offline-friendly. Because processing happens locally, many tools continue to work even if your connection drops mid-session.',
      about_values_l6: 'Your data, your control. You can clear your preferences at any time from your browser. There is nothing to "delete from our servers" because we never had it.',
      about_values_p2: 'We invite you to read our full Privacy Policy and Cookie Policy for the complete picture. If you have questions, our FAQ covers the most common ones, and you can always reach out directly.',
      // services detailed
      svc_tools_p1: 'Our flagship pillar is a collection of eight focused, single-purpose utilities. Each tool does one thing exceptionally well, with a clean interface and real-time preview. Pick the tool that matches your task, drop in your image, adjust the settings, and download the result. No learning curve, no clutter, no uploads.',
      svc_tools_l1: 'Compress \u2014 Reduce the file size of JPG, PNG, and WebP images while keeping visual quality. Adjustable quality slider with a live before/after comparison so you can find the sweet spot between size and clarity.',
      svc_tools_l2: 'Resize \u2014 Change image dimensions to any width and height. Maintain aspect ratio with a single toggle, or set exact pixel dimensions for specific requirements like social media posts or email headers.',
      svc_tools_l3: 'Convert \u2014 Switch between JPG, PNG, and WebP formats instantly. Useful when a platform requires a specific format or when you need a transparent PNG from a JPG source.',
      svc_tools_l4: 'Crop \u2014 Trim and frame your image precisely with an interactive crop region. Drag to define the area, lock to common aspect ratios, and export only the part you need.',
      svc_tools_l5: 'Remove Background \u2014 Erase image backgrounds using color sampling. Click on the background color to remove it, adjust the tolerance for edge precision, and get a clean cutout without manual masking.',
      svc_tools_l6: 'Cartoonize \u2014 Turn photos into cartoon-style artwork. The tool applies edge detection and color quantization locally to produce a stylized, illustrated look from any photograph.',
      svc_tools_l7: 'Enhance \u2014 Adjust brightness, contrast, and sharpness with intuitive sliders. Rescue underexposed shots, punch up flat images, and bring out detail \u2014 all processed in real time on your device.',
      svc_tools_l8: 'Filters \u2014 Apply stylized filters with adjustable intensity. Choose from grayscale, sepia, vintage, cool, warm, and more, then fine-tune how strongly the effect is applied before downloading.',
      svc_tools_p2: 'Every tool above shares the same foundation: your image is loaded into browser memory, processed on an HTML5 canvas, and exported locally. The file never leaves your device at any point in the workflow.',
      svc_qr_p1: 'The second pillar is a fast, fully local QR code and barcode scanner. It supports two modes: live camera scanning and image file scanning. In camera mode, it uses your device\'s camera and the native BarcodeDetector API to detect codes in real time \u2014 point your camera at a QR code and the content appears instantly. In image mode, you can load any image file containing a QR or barcode and the reader will extract the encoded data.',
      svc_qr_p2: 'Supported formats include QR codes, EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, and other common barcode symbologies, depending on your browser\'s capabilities. Detected results can be copied to the clipboard or, if the content is a URL, opened directly in a new tab.',
      svc_qr_p3: 'Just like the image tools, the QR reader processes everything on your device. Camera frames are analyzed locally and never streamed to a server. Image files you scan stay in your browser.',
      svc_qr_open: 'Open QR Reader',
      svc_editor_p1: 'The third pillar is a full-featured canvas editor for when a single-pass tool is not enough. Built on Fabric.js, it provides a professional editing environment with the features you would expect from desktop software \u2014 all running in your browser with zero uploads.',
      svc_editor_l1: 'Drawing tools \u2014 Select, freehand brush, text, rectangle, circle, triangle, line, and arrow.',
      svc_editor_l2: 'Object manipulation \u2014 Move, resize, rotate, duplicate, and delete any object on the canvas.',
      svc_editor_l3: 'Layer management \u2014 Bring forward, send backward, bring to front, and send to back for precise stacking order.',
      svc_editor_l4: 'Text controls \u2014 Editable text objects with font size, bold, italic, underline, and alignment options.',
      svc_editor_l5: 'Property panel \u2014 Adjust fill color, opacity, and rotation for any selected object.',
      svc_editor_l6: 'Preset canvas sizes \u2014 Start from Instagram post (1080\u00d71080), Instagram story (1080\u00d71920), YouTube thumbnail (1280\u00d7720), Facebook post (1200\u00d7630), or a custom size.',
      svc_editor_l7: 'Undo & redo \u2014 Full history navigation with keyboard shortcuts (Ctrl+Z / Ctrl+Y).',
      svc_editor_l8: 'Project saving \u2014 Save your work as a project file and load it later to continue editing.',
      svc_editor_l9: 'PNG export \u2014 Download your finished composition as a high-quality PNG.',
      svc_editor_p2: 'The editor is ideal for creating social media graphics, thumbnails, simple designs, annotations, and collages \u2014 all without installing software or surrendering your content to a cloud service.',
      svc_editor_open: 'Open Advanced Editor',
      svc_tie_p1: 'All three pillars share the same commitments: no uploads, no servers, no accounts, no tracking, and no cost. Whether you are compressing a single photo, scanning a QR code at a conference, or designing a multi-layer graphic, your data stays on your device from start to finish.',
      svc_tie_p2: 'Ready to get started? Browse the image tools, try the QR reader, or launch the advanced editor. If you have questions, our FAQ has answers, and you are always welcome to contact us.',
      // faq detailed
      faq_q1: 'What is imgsfix?', faq_q2: 'Is imgsfix really free?', faq_q3: 'Do you upload my images to a server?', faq_q4: 'What image formats are supported?', faq_q5: 'Does imgsfix work offline?', faq_q6: 'What browsers are supported?', faq_q7: 'How does the advanced editor work?', faq_q8: 'Is my data safe with imgsfix?', faq_q9: 'Can I use imgsfix for commercial purposes?', faq_q10: 'What languages are supported?',
      faq_a2: 'Yes, completely. There are no subscriptions, no premium tiers, no trial periods, no usage limits, and no watermarks on your output. You do not need to create an account or provide any personal information. imgsfix is free for everyone \u2014 individuals, students, freelancers, and businesses \u2014 and we intend to keep it that way.',
      faq_a3: 'No. imgsfix has no server backend for processing images. When you select or drop a file, it is loaded directly into your browser\'s memory using the File API and processed on an HTML5 canvas element. The pixels are manipulated by JavaScript running on your device. When you download the result, the file is generated locally from the canvas. Your image never travels over the internet at any point.',
      faq_a4: 'imgsfix works with the most common web image formats: JPG (JPEG), PNG, and WebP. The convert tool lets you switch between these three formats. Most tools also accept GIF and BMP as input. The advanced editor exports to PNG. Support for a specific format depends on your browser\'s built-in image decoding capabilities, but all modern browsers handle JPG, PNG, and WebP natively.',
      faq_a5: 'Once the page is loaded, most tools continue to work even if your internet connection drops, because all processing happens locally. The image tools, enhance, and filters do not need a network connection after initial load. The QR reader\'s camera mode and the advanced editor also work offline. The only external resource is the Google Fonts stylesheet, which is loaded once for typography \u2014 if it is unavailable, the site falls back to system fonts.',
      faq_a6: 'imgsfix works in all modern browsers that support the HTML5 Canvas API and modern JavaScript. This includes the latest versions of Chrome, Edge, Firefox, Safari, and Brave on desktop, as well as Chrome and Safari on mobile. The QR reader\'s camera scanning uses the native BarcodeDetector API, which is currently available in Chrome and Edge on desktop and Chrome on Android. On browsers without the BarcodeDetector API, you can still scan QR codes from image files.',
      faq_a7: 'The advanced editor is built on Fabric.js, a lightweight JavaScript canvas library. It provides a full editing environment with drawing tools (select, brush, text, rectangle, circle, triangle, line, arrow), object manipulation (move, resize, rotate, duplicate, delete), layer ordering, a property panel for fill and opacity, preset canvas sizes for social media, undo/redo with keyboard shortcuts, and the ability to save and load projects. Everything renders on a canvas in your browser \u2014 no server interaction is involved at any point.',
      faq_a8: 'Yes. Because all processing happens in your browser and no data is transmitted to any server, your images and edits are never stored anywhere outside your device. We do not use analytics, advertising trackers, or third-party data collection. The only thing stored locally is your theme and language preference in your browser\'s localStorage. You can clear this at any time from your browser settings. For the full details, see our Privacy Policy and Cookie Policy.',
      faq_a9: 'Yes. imgsfix is free to use for both personal and commercial projects. There are no licensing restrictions on the images you produce \u2014 the output is yours. You can use compressed, resized, converted, cropped, or edited images in your business materials, websites, social media, client work, or any other context. We do not add watermarks or claim any rights to your content. Please review our Terms of Use for the complete usage terms.',
      faq_a10: 'imgsfix currently supports two languages: English and Arabic. You can switch between them at any time using the language toggle in the header. When Arabic is selected, the entire interface switches to a right-to-left (RTL) layout for a natural reading experience. Your language preference is saved in your browser\'s localStorage so it persists across visits.',
      // privacy detailed
      privacy_short_label: 'The short version:', privacy_short_text: 'imgsfix does not collect, store, or transmit your data. There are no servers processing your images, no analytics tracking your behavior, no advertising cookies following you, and no accounts required. Everything happens in your browser. This is not a promise \u2014 it is a consequence of how the site is built.',
      privacy_h2_1: '1. Overview', privacy_p1_1: 'imgsfix is a privacy-first, client-side image toolkit. "Client-side" means that all processing \u2014 compression, resizing, conversion, cropping, background removal, cartoonization, enhancement, filters, QR scanning, and editing \u2014 takes place entirely within your web browser on your own device. No component of your image, your filename, or your editing activity is ever sent to us or to any third party.',
      privacy_p1_2: 'This privacy policy describes in detail how imgsfix handles (or, more precisely, does not handle) your information. Because the service is designed around the principle of data minimization, most of this document explains what we do not do.',
      privacy_h2_2: '2. No Data Collection', privacy_p2_1: 'We do not collect any personal data. Specifically, we do not collect:',
      privacy_p2_l1: 'Your name, email address, or any other identifying information (no accounts are required).', privacy_p2_l2: 'Your IP address or geographic location.', privacy_p2_l3: 'The images you process \u2014 they never leave your browser.', privacy_p2_l4: 'The filenames of your images.', privacy_p2_l5: 'Your editing choices, tool usage, or browsing behavior on the site.', privacy_p2_l6: 'Device information, browser version, or screen resolution.',
      privacy_p2_2: 'Because there is no server backend that receives or stores user data, there is no database that could be breached, sold, or subpoenaed. We cannot share what we do not have.',
      privacy_h2_3: '3. No Cookies', privacy_p3_1: 'imgsfix does not use tracking cookies. We do not set first-party cookies for analytics, advertising, session management, or any other purpose. We do not use third-party cookies.',
      privacy_p3_2: 'The only storage we use is the browser\'s localStorage API, which is not a cookie and is described in detail in section 5 below. For complete information, please see our separate Cookie Policy.',
      privacy_h2_4: '4. No Servers & Client-Side Processing', privacy_p4_1: 'imgsfix has no application server that receives or processes your files. When you use any tool, the following happens:',
      privacy_p4_l1: 'You select or drop a file, which your browser reads into local memory using the File API.', privacy_p4_l2: 'The image is drawn onto an HTML5 canvas element.', privacy_p4_l3: 'JavaScript running on your device manipulates the pixel data.', privacy_p4_l4: 'The result is exported from the canvas to a downloadable file, generated entirely in your browser.',
      privacy_p4_2: 'At no point is the file transmitted over the network. If you close the browser tab, the in-memory image is discarded. The only copy that persists is the one you choose to download and save on your own device.',
      privacy_h2_5: '5. localStorage Usage', privacy_p5_1: 'imgsfix uses the browser\'s localStorage API to remember two small preferences:',
      privacy_p5_l1: 'Theme preference (imgsfix_theme) \u2014 stores whether you prefer light or dark mode.', privacy_p5_l2: 'Language preference (imgsfix_lang) \u2014 stores whether you have selected English or Arabic.',
      privacy_p5_2: 'These values are stored on your device only. They are never transmitted to us or to any third party. They contain no personal information \u2014 just a short string indicating your preference. You can clear them at any time by clearing your browser\'s site data or localStorage. See our Cookie Policy for instructions on how to do this.',
      privacy_h2_6: '6. No Analytics & No Third-Party Tracking', privacy_p6_1: 'imgsfix does not use any analytics service. We do not embed Google Analytics, Matomo, Mixpanel, Amplitude, or any other measurement tool. We do not know how many people visit the site, which tools they use, or how long they stay.',
      privacy_p6_2: 'We also do not use advertising networks, marketing pixels, social media embeds, or any third-party script that could track your behavior. There are no "share" buttons that leak data to social platforms, and no comment systems that profile visitors.',
      privacy_p6_3: 'The only external resource the site loads is the Cairo font stylesheet from Google Fonts (see section 7).',
      privacy_h2_7: '7. Third-Party Services', privacy_p7_1: 'The only third-party service imgsfix interacts with is Google Fonts. The site loads the Cairo typeface from fonts.googleapis.com and fonts.gstatic.com to provide consistent typography. Google\'s servers may receive a request for the font file and may log standard HTTP information (such as IP address) as part of that request, in accordance with Google\'s own privacy policy.',
      privacy_p7_2: 'If you prefer not to load any external resources, your browser can be configured to block third-party font requests. imgsfix will fall back to your system\'s default fonts and continue to function normally. No functionality is lost \u2014 only the typography changes.',
      privacy_p7_3: 'Aside from Google Fonts, imgsfix loads the Fabric.js library from a CDN (cdnjs) for the advanced editor. This is a static JavaScript file and does not involve any tracking.',
      privacy_h2_8: '8. Your Rights', privacy_p8_1: 'Because imgsfix does not collect or store any personal data, traditional data-subject rights (such as access, correction, deletion, or portability of your data) are effectively already fulfilled \u2014 there is no data about you for us to provide, correct, or delete. However, you retain full control over the following:',
      privacy_p8_l1: 'Local preferences: You can clear your theme and language preferences at any time through your browser settings.', privacy_p8_l2: 'Your images: You decide which images to process and whether to download the results. Nothing is retained by the site.', privacy_p8_l3: 'External resources: You can block Google Fonts or other external resources using browser extensions or content blockers without affecting core functionality.', privacy_p8_l4: 'Use of the service: You may stop using imgsfix at any time. Because no account or data exists, there is nothing to cancel or delete.',
      privacy_h2_9: '9. Children\'s Privacy', privacy_p9_1: 'imgsfix is suitable for users of all ages. Because we collect no personal information and require no account, the service is safe for children to use under adult supervision. We do not knowingly collect any information from children or any other user, and there is no mechanism by which a child could disclose personal data to us through the site.',
      privacy_h2_10: '10. Changes to This Policy', privacy_p10_1: 'If we make material changes to this privacy policy, we will update the "last updated" date at the top of this page. Because the core architecture of imgsfix \u2014 client-side processing with no data collection \u2014 is fundamental to the project, we do not anticipate changes that would alter this approach. Any future changes would be transparently documented here.',
      privacy_h2_11: '11. Contact Information', privacy_p11_1: 'If you have any questions about this privacy policy or imgsfix\'s data practices, please visit our contact page. You can also find quick answers to common privacy questions in our FAQ, and more details about local storage in our Cookie Policy.',
      // terms detailed
      terms_last_updated: 'Last updated: July 2026', terms_welcome: 'Welcome to imgsfix. By accessing or using this website and its tools, you agree to be bound by these Terms of Use. If you do not agree with any part of these terms, please do not use the service. These terms are designed to be clear and fair \u2014 imgsfix is a free, privacy-focused tool, and these terms reflect that simplicity.',
      terms_h2_1: '1. Acceptance of Terms', terms_p1_1: 'By using imgsfix \u2014 including any of the image tools, the QR & barcode reader, or the advanced editor \u2014 you acknowledge that you have read, understood, and agree to these Terms of Use and our Privacy Policy. These terms constitute a legally binding agreement between you and imgsfix. If you are using the service on behalf of an organization, you represent that you have the authority to bind that organization to these terms.',
      terms_p1_2: 'If you do not agree to these terms, you must discontinue use of the service immediately. Because imgsfix requires no account or registration, your use of the tools itself constitutes acceptance.',
      terms_h2_2: '2. Use of the Service', terms_p2_1: 'imgsfix grants you a free, non-exclusive, non-transferable license to use the website and its tools for both personal and commercial purposes. You may use the service to process, edit, and transform images that you own or have the right to use.',
      terms_h3_permitted: 'Permitted Use', terms_permitted_l1: 'Processing images for personal, educational, or commercial projects.', terms_permitted_l2: 'Using the QR reader to scan codes you have the right to access.', terms_permitted_l3: 'Using the advanced editor to create original designs and compositions.', terms_permitted_l4: 'Downloading and using the output files in any context, royalty-free.',
      terms_h3_prohibited: 'Prohibited Use', terms_prohibited_l1: 'Using imgsfix to process images that you do not have the right to use, including copyrighted material you do not own or have permission to use.', terms_prohibited_l2: 'Using the service for any unlawful purpose or in violation of applicable laws.', terms_prohibited_l3: 'Attempting to reverse-engineer, decompile, or otherwise exploit the service for malicious purposes.', terms_prohibited_l4: 'Using automated scripts or bots to access the service in a manner that disrupts its availability for others.', terms_prohibited_l5: 'Using the output of the tools in a way that infringes the rights of third parties.',
      terms_p2_2: 'You are solely responsible for the images you process and the content you create using imgsfix. We do not monitor or review user activity \u2014 because we cannot, as no data reaches us \u2014 but you remain accountable for your own use of the service.',
      terms_h2_3: '3. Intellectual Property', terms_p3_1: 'The imgsfix website, including its design, code, tools, and branding, is the intellectual property of its creators. The software is provided for your use free of charge, but this does not constitute a transfer of ownership. You may not claim the imgsfix brand, logo, or site design as your own.',
      terms_p3_2: 'The images and files you process using imgsfix remain your property. We claim no ownership, license, or rights to any content you create, edit, or download through the service. The output of every tool \u2014 compressed images, resized photos, converted files, cropped pictures, edited designs \u2014 belongs entirely to you. We do not add watermarks, embed metadata claiming authorship, or retain any copy of your work.',
      terms_h2_4: '4. Disclaimer of Warranties', terms_p4_1: 'imgsfix is provided "as is" and "as available" without warranties of any kind, either express or implied. To the fullest extent permitted by applicable law, we disclaim all warranties, including but not limited to:',
      terms_p4_l1: 'Implied warranties of merchantability and fitness for a particular purpose.', terms_p4_l2: 'Warranties that the service will be uninterrupted, error-free, or secure.', terms_p4_l3: 'Warranties regarding the accuracy, reliability, or quality of the results produced by the tools.', terms_p4_l4: 'Warranties that the service will meet your specific requirements or expectations.',
      terms_p4_2: 'Because all processing occurs in your browser using its built-in capabilities, the quality and performance of the tools may vary depending on your device, browser, and the specific image being processed. You use the service at your own risk and are responsible for verifying the suitability of the output for your intended purpose.',
      terms_h2_5: '5. Limitation of Liability', terms_p5_1: 'To the maximum extent permitted by applicable law, imgsfix and its creators shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of, or inability to use, the service. This includes, without limitation:',
      terms_p5_l1: 'Loss of data, images, or profits.', terms_p5_l2: 'Business interruption or loss of business information.', terms_p5_l3: 'Damages resulting from the use of or inability to use the service.', terms_p5_l4: 'Damages resulting from errors, omissions, or inaccuracies in the output produced by the tools.',
      terms_p5_2: 'Because imgsfix is a free service provided without charge, you agree that this limitation of liability is a fair and reasonable allocation of risk. You are encouraged to keep backups of your original images and to verify the results of any processing before relying on them for important purposes.',
      terms_h2_6: '6. Changes to These Terms', terms_p6_1: 'We reserve the right to modify these Terms of Use at any time. When we do, we will update the "last updated" date at the top of this page. Changes take effect immediately upon posting. It is your responsibility to review these terms periodically for updates.',
      terms_p6_2: 'Continued use of imgsfix after changes are posted constitutes your acceptance of the revised terms. If you do not agree to the updated terms, you should stop using the service. Given the fundamental nature of imgsfix \u2014 free, private, client-side \u2014 we do not anticipate significant changes to the core terms.',
      terms_h2_7: '7. Governing Law', terms_p7_1: 'These Terms of Use shall be governed by and construed in accordance with applicable law, without regard to conflict of law principles. Any disputes arising from or relating to your use of imgsfix shall be resolved in the appropriate courts of the jurisdiction in which the service is operated.',
      terms_p7_2: 'If any provision of these terms is found to be unenforceable or invalid by a court of competent jurisdiction, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.',
      terms_h2_8: '8. Contact', terms_p8_1: 'If you have any questions or concerns about these Terms of Use, please visit our contact page. You may also find helpful information in our FAQ, Privacy Policy, and Disclaimer.',
      // cookies detailed
      cookies_last_updated: 'Last updated: July 2026', cookies_short_label: 'The short version:', cookies_short_text: 'imgsfix does not set tracking cookies of any kind. The only local storage we use is two small entries in your browser\'s localStorage to remember your theme (light/dark) and language (English/Arabic). This storage never leaves your device and contains no personal information. You can clear it at any time.',
      cookies_h2_1: '1. No Tracking Cookies', cookies_p1_1: 'imgsfix does not use cookies to track you. We do not set first-party cookies for analytics, advertising, session management, personalization, or any other purpose. We do not place third-party cookies on your device. There is no cookie banner or consent popup on imgsfix because there are no tracking cookies to consent to.',
      cookies_p1_2: 'Many websites use cookies to remember who you are, measure your behavior, serve targeted ads, or follow you across the web. imgsfix does none of this. We have no analytics, no advertising networks, no social media integrations, and no remarketing pixels \u2014 and therefore no need for the cookies that power them.',
      cookies_h2_2: '2. localStorage for Preferences Only', cookies_p2_1: 'Instead of cookies, imgsfix uses the browser\'s localStorage API to remember two small preferences. localStorage is a browser feature that lets a website store small amounts of data on your device. Unlike cookies, localStorage data is not automatically sent to a server with every request \u2014 it stays on your device and is only read by the page that created it.',
      cookies_p2_2: 'The two items we store are:',
      cookies_p2_l1: 'imgsfix_theme \u2014 a single word, either "light" or "dark", recording which visual theme you have selected. This lets the site load in your preferred theme on your next visit.', cookies_p2_l2: 'imgsfix_lang \u2014 a single word, either "en" or "ar", recording whether you have chosen English or Arabic. This lets the site display in your preferred language automatically.',
      cookies_p2_3: 'That is the complete list. These values contain no personal information \u2014 they are short strings that describe a visual preference. They are never transmitted to us or to any third party. They exist solely to make your experience more convenient, and you can delete them at any time without affecting the functionality of any tool.',
      cookies_h2_3: '3. Google Fonts', cookies_p3_1: 'imgsfix loads the Cairo typeface from Google Fonts (fonts.googleapis.com and fonts.gstatic.com). When your browser requests the font stylesheet and font files, Google\'s servers may set cookies on your device in accordance with Google\'s own privacy practices. These cookies are controlled by Google, not by imgsfix, and we have no access to them.',
      cookies_p3_2: 'If you prefer not to receive any cookies from Google, you can:', cookies_p3_l1: 'Block third-party fonts in your browser settings or with a content blocker extension.', cookies_p3_l2: 'Use a browser extension that blocks requests to Google Fonts domains.', cookies_p3_l3: 'Configure your browser to block third-party cookies entirely.',
      cookies_p3_4: 'If Google Fonts is blocked, imgsfix will fall back to your system\'s default fonts. All tools and features will continue to work normally \u2014 only the typography will change.',
      cookies_p3_5: 'For more about Google\'s data practices, please refer to Google\'s Privacy Policy.',
      cookies_h2_4: '4. How to View and Clear localStorage', cookies_p4_1: 'Because your preferences are stored locally on your device, you have full control over them. Here is how to view and clear imgsfix\'s localStorage in popular browsers:',
      cookies_h3_chrome: 'Google Chrome / Microsoft Edge', cookies_chrome_l1: 'Open imgsfix, then press F12 or Ctrl+Shift+I (Cmd+Option+I on Mac) to open Developer Tools.', cookies_chrome_l2: 'Go to the Application tab.', cookies_chrome_l3: 'In the left sidebar, expand Local Storage and select the imgsfix site.', cookies_chrome_l4: 'You will see imgsfix_theme and imgsfix_lang. Right-click and choose Clear to remove them.',
      cookies_h3_firefox: 'Mozilla Firefox', cookies_firefox_l1: 'Open imgsfix, then press F12 or Ctrl+Shift+I (Cmd+Option+I on Mac) to open Developer Tools.', cookies_firefox_l2: 'Go to the Storage tab.', cookies_firefox_l3: 'Expand Local Storage and select the imgsfix site.', cookies_firefox_l4: 'You will see the stored entries. Right-click and choose Delete to remove them.',
      cookies_h3_safari: 'Apple Safari', cookies_safari_l1: 'Open imgsfix, then press Cmd+Option+I to open Web Inspector.', cookies_safari_l2: 'Go to the Storage tab.', cookies_safari_l3: 'Expand Local Storage and select the imgsfix site.', cookies_safari_l4: 'Select the entries and press Delete to remove them.',
      cookies_h3_clearing: 'Clearing All Site Data', cookies_clearing_p1: 'You can also clear all localStorage for every site at once through your browser\'s privacy settings:',
      cookies_clearing_l1: 'Chrome: Settings \u2192 Privacy and security \u2192 Clear browsing data \u2192 Cached images and files / Cookies and site data.', cookies_clearing_l2: 'Firefox: Settings \u2192 Privacy & Security \u2192 Cookies and Site Data \u2192 Clear Data.', cookies_clearing_l3: 'Safari: Preferences \u2192 Privacy \u2192 Manage Website Data \u2192 Remove All.', cookies_clearing_l4: 'Edge: Settings \u2192 Cookies and site permissions \u2192 Manage and delete cookies and site data.',
      cookies_h2_5: '5. Your Control Over Preferences', cookies_p5_1: 'You are always in control of your imgsfix experience. Your theme and language preferences are optional conveniences \u2014 the tools work perfectly without them. If you clear localStorage, the site will simply use its defaults (light theme and your browser\'s detected language) until you choose again.',
      cookies_p5_2: 'There is no account to delete, no data to export, and no tracking history to review, because none of those things exist. Your relationship with imgsfix is as simple as it gets: you use the tools, your images stay on your device, and the only thing the site remembers is how you like it to look.',
      cookies_h2_6: '6. Changes to This Policy', cookies_p6_1: 'If we ever change our cookie or storage practices, we will update this page and revise the "last updated" date. Given that imgsfix\'s core design avoids cookies entirely, we do not anticipate changes that would introduce tracking. Any future change would be clearly documented here.',
      cookies_h2_7: '7. Contact', cookies_p7_1: 'Questions about this Cookie Policy? Visit our contact page to get in touch, or read our full Privacy Policy for the complete picture of how imgsfix handles (or rather, does not handle) your data.',
      // disclaimer detailed
      disclaimer_note_label: 'Please note:', disclaimer_note_text: 'imgsfix is a free tool provided "as is" without warranties of any kind. The information and tools on this site are offered for general use and convenience, not as professional advice. You are responsible for your images and your use of the results.',
      disclaimer_h2_1: 'General Disclaimer', disclaimer_p1_1: 'The information and tools provided by imgsfix are offered as a free, public service for general-purpose image processing. While we strive to make the tools accurate, reliable, and useful, imgsfix is provided on an "as is" and "as available" basis. We make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of the service or the results it produces.',
      disclaimer_p1_2: 'Any reliance you place on imgsfix, its tools, or its output is strictly at your own risk. We will not be liable for any loss or damage of any kind arising from the use of, or reliance on, the service or the images it generates. You are encouraged to verify the results of any processing before using them in contexts where accuracy is critical.',
      disclaimer_h2_2: 'No Guarantee of Results', disclaimer_p2_1: 'imgsfix\'s tools process images using your browser\'s built-in capabilities and the HTML5 Canvas API. Because results depend on factors outside our control \u2014 including your browser, your device\'s processing power, the specific characteristics of your image, and the settings you choose \u2014 we cannot guarantee any particular outcome.',
      disclaimer_p2_l1: 'Compression results vary depending on the image content, format, and quality setting you select.', disclaimer_p2_l2: 'Background removal works best with solid, contrasting backgrounds and may not produce clean results on complex images.', disclaimer_p2_l3: 'Cartoonization and filters are stylistic transformations whose output is subjective.', disclaimer_p2_l4: 'Enhancement adjustments depend on the original image quality and may not fully restore damaged or low-resolution photos.', disclaimer_p2_l5: 'The QR reader\'s accuracy depends on image clarity, lighting, and browser support for the BarcodeDetector API.',
      disclaimer_p2_2: 'We recommend reviewing the output of each tool before relying on it. If a result does not meet your needs, you can adjust the settings and try again \u2014 there is no limit on how many times you use any tool, and no cost involved.',
      disclaimer_h2_3: 'User Responsibility for Images', disclaimer_p3_1: 'You are solely responsible for the images you process using imgsfix. By using the service, you confirm that:',
      disclaimer_p3_l1: 'You own the images you process, or you have obtained the necessary rights and permissions to use and modify them.', disclaimer_p3_l2: 'Your use of the images and the processed output does not infringe on the copyright, trademark, privacy, or other rights of any third party.', disclaimer_p3_l3: 'You will not use imgsfix to process images for any unlawful or fraudulent purpose.',
      disclaimer_p3_2: 'Because all processing happens in your browser and no data is transmitted to us, we have no way of monitoring or reviewing the images you process. This means we also have no way to enforce these responsibilities \u2014 but it also means that your images remain entirely private. The responsibility for lawful and ethical use rests with you.',
      disclaimer_h2_4: 'Not Professional Advice', disclaimer_p4_1: 'The tools and content on imgsfix are provided for general image-processing purposes only. They do not constitute professional advice of any kind. Specifically:',
      disclaimer_p4_l1: 'imgsfix is not a substitute for professional image editing, graphic design, or photography services.', disclaimer_p4_l2: 'The tools do not provide legal, medical, financial, or technical advice.', disclaimer_p4_l3: 'QR code and barcode content should be verified independently \u2014 do not act on scanned URLs or data without confirming they are legitimate and safe.', disclaimer_p4_l4: 'Content on the about, services, FAQ, and policy pages is informational and should not be taken as professional guidance.',
      disclaimer_p4_2: 'If you require professional results or advice for a specific purpose \u2014 such as commercial print production, legal documentation, or critical business materials \u2014 you should consult an appropriate professional. imgsfix is a convenient, free, and private tool, but it is not a replacement for professional services when those are warranted.',
      disclaimer_h2_5: 'Use at Your Own Risk', disclaimer_p5_1: 'Your use of imgsfix is entirely at your own risk. While we work to ensure the service is safe and functional, we cannot guarantee that it will be free of errors, bugs, or interruptions at all times. Browser updates, device limitations, or network conditions may occasionally affect performance.',
      disclaimer_p5_2: 'To protect yourself, we recommend:', disclaimer_p5_l1: 'Keeping backup copies of your original images before processing them.', disclaimer_p5_l2: 'Reviewing downloaded results before deleting or overwriting your originals.', disclaimer_p5_l3: 'Using a supported, up-to-date browser for the best experience.', disclaimer_p5_l4: 'Testing tools on non-critical images first if you are unsure how they will perform.',
      disclaimer_h2_6: 'External Links', disclaimer_p6_1: 'imgsfix may contain links to external websites (such as Google\'s privacy policy) that are not operated by us. We have no control over the content and practices of these third-party sites and cannot accept responsibility for their respective privacy policies or terms of use. You acknowledge that imgsfix is not responsible for the accuracy or reliability of any information, products, or services offered on external sites.',
      disclaimer_h2_7: 'Changes to This Disclaimer', disclaimer_p7_1: 'We reserve the right to update or modify this disclaimer at any time. Any changes will be posted on this page with an updated "last updated" date. Your continued use of imgsfix after changes are posted constitutes your acknowledgment of the revised disclaimer.',
      disclaimer_h2_8: 'Contact', disclaimer_p8_1: 'If you have any questions about this disclaimer, please visit our contact page. You may also find relevant information in our Terms of Use, Privacy Policy, and FAQ.',
      // Image to Text (OCR) Studio
      ocr_panel_input: 'Source Image',
      ocr_btn_upload: 'Upload / Camera',
      ocr_btn_paste: 'Paste Image',
      ocr_rot_left: 'Rotate -90°',
      ocr_rot_right: 'Rotate +90°',
      ocr_btn_crop: 'Area Crop',
      ocr_btn_reset_crop: 'Reset Selection',
      ocr_drop_title: 'Drop an image, choose a photo, or press Ctrl+V',
      ocr_drop_sub: 'JPG, PNG, WebP, BMP, GIF (max 25MB) · 100% private in-browser',
      ocr_btn_browse: 'Choose Image',
      ocr_lang_label: 'Recognition Language',
      ocr_lang_ara_eng: 'Arabic + English (Default)',
      ocr_lang_ara: 'Arabic Only',
      ocr_lang_eng: 'English Only',
      ocr_opt_enhance: 'Smart Contrast Pre-Processing',
      ocr_btn_extract: 'Extract Text',
      ocr_panel_output: 'Extracted Text',
      ocr_btn_copy: 'Copy Text',
      ocr_btn_fix_lines: 'Fix Broken Lines',
      ocr_btn_txt: 'Download .txt',
      ocr_btn_doc: 'Word (.doc)',
      ocr_output_ph: 'Extracted text will appear here for instant proofreading and editing…',
      ocr_entities_title: 'Quick-Extract Contacts & Links',
      ocr_entities_hint: 'Click any item to copy',
      ocr_ent_email: 'Email',
      ocr_ent_phone: 'Phone',
      ocr_ent_url: 'URL',
      ocr_accuracy: 'Accuracy',
      ocr_crop_selected: 'Selected region',
      ocr_crop_drag_hint: 'Drag across the image to select a specific text area',
      ocr_status_init: 'Initializing offline OCR engine…',
      ocr_status_lang: 'Loading & caching language pack in browser…',
      ocr_status_recognizing: 'Recognizing text from image…',
      ocr_status_working: 'Processing image…',
      ocr_status_done: 'Extraction complete',
      ocr_err_size: 'Image too large (max 25MB)',
      ocr_err_type: 'Please choose a JPG, PNG, WebP, BMP, or GIF image',
      ocr_err_decode: 'Could not decode this image file',
      ocr_err_run: 'OCR extraction failed. Please try a clearer image or crop region.',
      ocr_img_loaded: 'Image ready for OCR',
      ocr_done_ok: 'Text extracted locally',
      ocr_done_empty: 'No readable text detected in the selected area',
      ocr_cancelled: 'OCR cancelled',
      ocr_lines_fixed: 'Broken OCR lines merged into paragraphs',
      ocr_paste_hint: 'Press Ctrl+V (or Cmd+V) directly to paste a screenshot',
      ocr_paste_empty: 'No image found in clipboard',
      ocr_dl_txt_ok: 'TXT file downloaded',
      ocr_dl_doc_ok: 'Word (.doc) file downloaded',
      ocr_btn_formatter: 'Open in Text Formatter',
      ocr_note_p1: 'Note: This tool is designed to handle printed text, screenshots, and documents; using clear images is recommended for the best results. It also supports reading handwritten text provided the writing is clear, though recognition accuracy may reach around 50% or less.',
      ocr_note_p2: 'For the highest possible accuracy when extracting Arabic text, selecting the "Arabic Only" option is recommended.',
      // Passport & Visa Photo Studio
      pp_meta_desc: 'Create compliant biometric passport and visa photos 100% locally in your browser with AI background whitening, alignment guides, studio retouching, and 300 DPI printable JPG/PNG/PDF sheets.',
      pp_view_single: 'Single Photo',
      pp_view_sheet: 'Print Sheet',
      pp_btn_replace: 'Change Photo',
      pp_drop_title: 'Drop your portrait photo, browse, or paste (Ctrl+V)',
      pp_drop_sub: 'JPG, PNG, WebP, BMP, GIF (max 30MB · 12,000px) · 100% in-browser',
      pp_ai_working: 'Detecting subject & whitening background locally…',
      pp_quick_peek: 'Peek',
      pp_btn_center: 'Center',
      pp_guide_toggle: 'Biometric Guide',
      pp_shortcuts_legend: 'Arrows Nudge (Shift 10px) · +/- Zoom · [/] Tilt · G Guide · Hold Space Peek · Ctrl+Z/Y Undo/Redo · Ctrl+S Export',
      studio_export_print: 'Export & Print',
      pp_export_modal_d: 'Configure 300 DPI multi-copy print sheet layout or download your single official photo.',
      pp_mq_download: 'Download / Export',
      pp_step_size: 'Size',
      pp_step_bg: 'Background',
      pp_step_align: 'Align & Retouch',
      pp_step_export: 'Print & Export',
      pp_usage_hint: 'How to use: 1. Select your standard document size \u2192 2. Open tab (2) Background and click \x27Auto Remove & Whiten Background\x27 \u2192 3. Align your head inside the guide & adjust lighting \u2192 4. Download single photo or print sheet.',
      pp_presets_title: 'Standard Document Presets (300 DPI)',
      pp_preset_40x60: '4 \u00d7 6 cm \u2014 Standard Passport & Visa',
      pp_preset_35x45: '3.5 \u00d7 4.5 cm \u2014 Standard Biometric Visa Photo',
      pp_preset_51x51: '2 \u00d7 2 in \u2014 Standard Square Visa & Passport',
      pp_preset_50x70: '5 \u00d7 7 cm \u2014 Large Passport & Official Document',
      pp_preset_50x60: '5 \u00d7 6 cm \u2014 Biometric Official Document',
      pp_preset_30x40: '3 \u00d7 4 cm \u2014 Small Official & Visa Photo',
      pp_preset_25x35: '2.5 \u00d7 3.5 cm \u2014 Mini Official Photo',
      pp_preset_custom: 'Custom Size',
      pp_preset_custom_sub: 'mm \u00b7 cm \u00b7 in \u00b7 px',
      pp_custom_dims: 'Custom Dimensions (300 DPI)',
      pp_unit: 'Unit',
      pp_bg_title: 'Smart Background',
      pp_btn_auto_bg: 'Auto Remove & Whiten Background',
      pp_btn_keep_orig: 'Keep Original Background',
      pp_swatches_title: 'Official Background Swatches',
      pp_sw_white: 'Pure White (#FFFFFF)',
      pp_sw_offwhite: 'Off-White (#F8FAFC)',
      pp_sw_sky: 'Sky Blue (#D6ECFA)',
      pp_sw_royal: 'Royal Blue (#1E6FD9)',
      pp_sw_gray: 'Light Gray (#E5E7EB)',
      pp_sw_red: 'Official Red (#D92626)',
      pp_brush_title: 'Edge Refine Brush',
      pp_brush_need_cutout: 'Run AI removal first',
      pp_brush_auto_mode: 'Switch to AI background to refine edges',
      pp_brush_ready: 'Drag on canvas to refine edges',
      pp_tool_pan: 'Move',
      pp_align_title: 'Biometric Alignment',
      pp_btn_auto_center: 'Auto Center',
      pp_retouch_title: 'Portrait Studio Lighting & Retouch',
      pp_btn_auto_light: 'Studio Auto-Light',
      pp_warmth: 'Warmth / White Balance',
      pp_skin_smooth: 'Natural Skin Smoothness',
      pp_sheet_title: 'Print Sheet Layout (300 DPI)',
      pp_copies_unit: 'copies',
      pp_sheet_gap: 'Spacing Gap',
      pp_cut_guides: 'Cutting Guide Marks & Borders',
      pp_export_title: 'Download Ready-to-Print File',
      pp_export_single: 'Single Photo',
      pp_export_sheet: 'Print Sheet',
      pp_export_pdf: 'Print PDF (Exact mm)',
      pp_guide_crown: 'Head Top',
      pp_guide_eyes: 'Eye Line',
      pp_guide_chin: 'Chin',
      pp_err_type: 'Please select a JPG, PNG, WebP, BMP, or GIF image',
      pp_err_size: 'Image too large (max 30MB)',
      pp_err_dims: 'Image dimensions exceed 12,000 × 12,000 px limit',
      pp_err_custom_dim: 'Enter valid width and height values',
      pp_img_loaded: 'Portrait photo ready',
      pp_bg_done: 'Background updated locally',
      pp_auto_light_ok: 'Studio auto-lighting applied',
      pp_size_updated: 'Custom dimensions applied at 300 DPI',
      pp_export_ok: '300 DPI file exported successfully',
      pp_export_err: 'Failed to export passport photo',
      // YouTube & Social Thumbnail Editor
      tm_meta_desc: 'Design high-CTR YouTube, Shorts, Reels, and social media thumbnails 100% locally in your browser with pro starter templates, AI background removal, multi-image layers, EN/AR typography, shapes, arrows, and live YouTube feed preview.',
      tm_usage_hint: 'How to use: 1. Pick a platform size or starter template \u2192 2. Add photos, logos, or cutout images \u2192 3. Style EN/AR headlines, arrows, shapes & stickers \u2192 4. Preview in YouTube Feed & download crisp PNG/JPG.',
      tm_tab_templates: 'Templates',
      tm_tab_bg: 'Background',
      tm_tab_subject: 'Images',
      tm_tab_elements: 'Text & Elements',
      tm_tab_export: 'Export',
      tm_tpl_title: 'Pro Starter Templates',
      tm_tpl_sub: '1-click customizable',
      tm_tpl_tech: 'Tech & Tutorials',
      tm_tpl_gaming: 'Gaming',
      tm_tpl_podcast: 'Podcast / Interview',
      tm_tpl_vs: 'Before vs After / VS',
      tm_tpl_news: 'Breaking News',
      tm_tpl_vlog: 'Vlog & Lifestyle',
      tm_tpl_note_t: 'Starter Layout Behavior',
      tm_tpl_note_d: 'Clicking any template builds an editable composition while keeping your uploaded image layers on canvas.',
      tm_bg_colors: 'Backdrop Gradient & Color',
      tm_bg_c1: 'Color 1',
      tm_bg_c2: 'Color 2',
      tm_bg_angle: 'Gradient Angle',
      tm_bg_image_t: 'Custom Background Image',
      tm_bg_upload: 'Upload Custom Background',
      tm_bg_clear: 'Remove Background Image',
      tm_bg_blur: 'Backdrop Blur',
      tm_bg_vignette: 'Dark Vignette',
      tm_subj_upload_t: 'Photos, Logos & Stickers',
      tm_btn_upload_subj: '+ Add Image / Logo / Sticker Layer',
      tm_img_multi_note: 'Upload unlimited local photos, PNG logos, or stickers. Select any image layer to apply AI background removal, corner radius, border, or shadow.',
      tm_img_editing: 'Editing',
      tm_btn_auto_cutout: 'One-Click Background Removal',
      tm_btn_restore_subj: 'Restore Original Image',
      tm_subj_pop_t: 'Frame, Outline & Rim Glow',
      tm_img_radius: 'Corner Radius',
      tm_subj_outline: 'Border / Die-Cut Outline',
      tm_outline_color: 'Outline Color',
      tm_subj_glow: 'Backlight Rim Glow',
      tm_glow_color: 'Glow Color',
      tm_img_shadow: 'Drop Shadow',
      tm_text_add_t: 'High-CTR Typography',
      tm_btn_add_text: '+ Add Headline Text',
      tm_ctr_arrows_t: 'Arrows & Pointers',
      tm_ctr_arrow_red: 'Curved Red',
      tm_ctr_arrow_yellow: 'Curved Yellow',
      tm_ctr_arrow_straight: 'Straight Arrow',
      tm_ctr_arrow_double: 'Double Arrow',
      tm_ctr_trend_up: 'Trend Up',
      tm_ctr_trend_down: 'Trend Down',
      tm_ctr_shapes_t: 'Shapes & Frames',
      tm_ctr_circle_red: 'Focus Ring',
      tm_shape_box: 'Rounded Card',
      tm_shape_ribbon: 'Slanted Ribbon',
      tm_shape_burst: 'Starburst',
      tm_shape_bubble: 'Speech Bubble',
      tm_shape_neon: 'Neon Frame',
      tm_ctr_badges_t: 'Hook Words & Badges',
      tm_ctr_emojis_t: 'Expressive Stickers & Emojis',
      tm_export_title: 'High-Res Download',
      tm_export_filename: 'Filename',
      tm_btn_download: 'Download Thumbnail',
      tm_btn_copy: 'Copy to Clipboard',
      tm_size_yt_hd: 'YouTube 16:9',
      tm_size_yt_fhd: 'Full HD 1080p',
      tm_size_shorts: 'Shorts / Reels 9:16',
      tm_size_sq: 'Post 1:1',
      tm_size_4_5: 'Portrait 4:5',
      tm_safe_zone: 'Safe Zone',
      tm_btn_feed_preview: 'Preview in YouTube Feed',
      tm_ai_working: 'Removing image background locally\u2026',
      tm_mq_text: 'Add Text',
      tm_mq_photo: 'Add Image',
      tm_mq_feed: 'Feed Preview',
      tm_mq_download: 'Download / Export',
      tm_export_modal_d: 'Choose PNG or JPG resolution, adjust compression quality, or copy directly to clipboard.',
      tm_btn_dup: 'Duplicate',
      tm_btn_delete: 'Delete Layer',
      tm_shortcuts_legend: 'Arrows Nudge (Shift 10px) \u00b7 Del Remove Layer \u00b7 Ctrl+D Duplicate \u00b7 Ctrl+Z/Y Undo/Redo \u00b7 P Feed Preview \u00b7 Hold Space Peek \u00b7 Ctrl+S Export',
      tm_insp_title: 'Layer Properties',
      tm_no_selection: 'Select any layer on the canvas to edit its text, colors, outline, glow, or rotation.',
      tm_prop_text: 'Text Content (EN / AR)',
      tm_prop_font: 'Font Family (AR / EN)',
      tm_fonts_ar_grp: 'Arabic Fonts (12)',
      tm_fonts_en_grp: 'English Fonts (12)',
      tm_prop_size: 'Font Size',
      tm_prop_fill1: 'Fill Color',
      tm_prop_fill2: 'Gradient 2',
      tm_prop_grad_on: 'Enable Text Gradient Fill',
      tm_prop_stroke: 'Contrast Stroke',
      tm_prop_shadow: '3D Drop Shadow',
      tm_prop_banner: 'Slanted Hook Banner Background',
      tm_prop_banner_c: 'Banner Color',
      tm_prop_skew: 'Slant (\u00b0)',
      tm_prop_badge_txt: 'Badge Label',
      tm_prop_accent: 'Accent Color',
      tm_prop_scale: 'Scale',
      tm_prop_rot: 'Rotation',
      tm_prop_opacity: 'Opacity',
      tm_btn_center: 'Center',
      tm_layers_title: 'Layers Manager',
      tm_feed_modal_t: 'Live YouTube Feed Preview',
      tm_feed_modal_d: 'Test readability and visual CTR alongside competing videos in real YouTube feed sizes.',
      tm_feed_desktop: 'Desktop Feed',
      tm_feed_mobile: 'Mobile Feed',
      tm_feed_dark: 'Dark Mode',
      tm_feed_light: 'Light Mode',
      tm_feed_title_ph: 'Test your video title here\u2026',
      tm_feed_chan_ph: 'Channel name',
      tm_ltype_text: 'Text',
      tm_ltype_badge: 'Badge',
      tm_ltype_emoji: 'Emoji',
      tm_ltype_image: 'Image',
      tm_ltype_subject: 'Image',
      tm_ltype_arrow: 'Arrow',
      tm_ltype_shape: 'Shape',
      tm_ltype_spotlight: 'Shape',
      tm_layer_vis: 'Toggle visibility',
      tm_layer_lock: 'Lock/Unlock layer',
      tm_layer_up: 'Move layer up',
      tm_layer_down: 'Move layer down',
      tm_subj_loaded: 'Image layer added to canvas',
      tm_bg_loaded: 'Background photo updated',
      tm_need_subj: 'Select or upload an image layer first',
      tm_cutout_ok: 'Background removed cleanly',
      tm_feed_default_title: 'How to 3X Your Click-Through Rate in 5 Minutes!',
      tm_feed_default_chan: 'Creator Studio',
      tm_feed_yours: 'YOUR THUMBNAIL',
      tm_export_ok: 'Thumbnail downloaded cleanly',
      tm_export_err: 'Failed to export thumbnail',
      tm_copy_ok: 'Thumbnail copied to clipboard',
      tm_copy_unsupported: 'Clipboard image copy is unsupported in this browser',
      // Stickers, Memes & Cards Studio
      ss_meta_desc: '4-in-1 local creative studio: Die-Cut Sticker Maker (WhatsApp 512px & A4 print sheets with AI cutout), Meme & Comic Maker, Greeting & Quote Cards, and Store Promo Badges — 100% client-side in your browser.',
      ss_usage_hint: 'Choose a studio mode above (Die-Cut Stickers, Memes, Greeting & Quote Cards, or Store Promo Badges), customize cutouts, text, and stickers locally, then download PNG, JPG, or printable PDF.',
      ss_mode_sticker_t: 'Die-Cut Stickers',
      ss_mode_sticker_s: 'AI Cutout · WhatsApp 512px · Print Sheets',
      ss_mode_meme_t: 'Meme & Comic Maker',
      ss_mode_meme_s: '18 Templates · Speech Bubbles · Bold Captions',
      ss_mode_card_t: 'Greeting & Quote Cards',
      ss_mode_card_s: 'Cards · Wall Art · Framed Photos · PDF',
      ss_mode_badge_t: 'Store Promo Badges',
      ss_mode_badge_s: '16 Shapes · Product Overlays · Offers',
      ss_st_tab_cutout: 'Cutout & Brush',
      ss_st_tab_outline: 'Outline & Finish',
      ss_st_tab_phrases: 'Phrases & Text',
      ss_st_tab_pack: 'Sticker Pack',
      ss_st_tab_export: 'Export & Print',
      ss_upload_photo_t: 'Photo & AI Background Removal',
      ss_btn_upload_photo: 'Upload Photo (PNG / JPG / WebP)',
      ss_btn_ai_cutout: 'Auto Remove Background (AI)',
      ss_btn_restore_orig: 'Restore Original Photo',
      ss_btn_remove_photo: 'Remove Photo',
      ss_brush_t: 'Edge Touch-Up Brush',
      ss_tool_move: 'Move / Transform',
      ss_tool_restore: 'Restore',
      ss_tool_erase: 'Erase',
      ss_brush_size: 'Brush Size',
      ss_brush_undo: 'Undo Stroke',
      ss_brush_redo: 'Redo Stroke',
      ss_brush_hint_empty: 'Upload a photo above to unlock AI background removal and edge touch-up.',
      ss_brush_hint_run_ai: 'Click "Auto Remove Background (AI)" first, then use Restore/Erase brush for fine edges.',
      ss_brush_hint_ready: 'Switch to Restore or Erase and paint directly on the canvas to refine cutout edges.',
      ss_geom_cutout_t: 'Geometric Shape Mask',
      ss_shape_free: 'Original / Free',
      ss_shape_circle: 'Circle',
      ss_shape_rounded: 'Rounded',
      ss_shape_heart: 'Heart',
      ss_shape_star: 'Star',
      ss_shape_hex: 'Hexagon',
      ss_outline_engine_t: 'Die-Cut Outline Engine',
      ss_outline_w: 'Outline Thickness',
      ss_outline_c: 'Outline Color',
      ss_outline_note: 'Smooth radial contour wraps both the cutout subject and any fused sticker text into one unified die-cut sticker.',
      ss_sticker_finish_t: 'Sticker Finish & Depth',
      ss_drop_shadow: '3D Drop Shadow',
      ss_vinyl_gloss: 'Glossy Vinyl Sheen',
      ss_phrases_t: 'Ready-Made EN/AR Sticker Phrases',
      ss_pcat_greetings: 'Daily Greetings',
      ss_pcat_reactions: 'Chat Reactions',
      ss_pcat_store: 'Store & Offers',
      ss_pcat_occasions: 'Holidays & Occasions',
      ss_btn_add_text: '+ Add Custom Text Layer',
      ss_pack_title: '42 Ready-Made Graphic Stickers',
      ss_pack_note: 'Click any graphic sticker to drop it onto the canvas — move, scale, rotate, or fuse it with your die-cut border.',
      ss_st_export_t: 'Transparent Sticker Export',
      ss_btn_export_wa: 'Download WhatsApp / Telegram Sticker (512×512 PNG)',
      ss_btn_export_full: 'Download Full-Res Transparent PNG',
      ss_btn_chat_preview: 'Preview in WhatsApp / Telegram Chat',
      ss_print_sheet_t: 'Printable Sticker Sheet (300 DPI)',
      ss_sheet_cols: 'Columns',
      ss_sheet_rows: 'Rows',
      ss_btn_sheet_png: 'Download Sheet PNG',
      ss_btn_sheet_pdf: 'Download Print PDF (A4 / 4×6)',
      ss_mm_tab_tpl: 'Templates',
      ss_mm_tab_media: 'Images',
      ss_mm_tab_cap: 'Captions & Bubbles',
      ss_mm_tab_export: 'Export',
      ss_mm_tpl_title: '18 Classic & Modern Meme Layouts',
      ss_mm_custom_img_t: 'Custom Meme Photo & Extra Layers',
      ss_mm_upload_bg: 'Upload Meme Background Photo',
      ss_mm_clear_bg: 'Clear Custom Background',
      ss_btn_add_layer_img: '+ Add Image Overlay Layer',
      ss_mm_quick_cap: 'Quick Top / Bottom Captions',
      ss_mm_top_lbl: 'Top Caption',
      ss_mm_bot_lbl: 'Bottom Caption',
      ss_mm_reset_caps: 'Reset Default Captions',
      ss_mm_bubbles_t: 'Comic & Dialogue Bubbles',
      ss_bubble_speech: 'Speech Bubble',
      ss_bubble_thought: 'Thought Cloud',
      ss_bubble_shout: 'Shout Burst',
      ss_bubble_box: 'Caption Box',
      ss_mm_add_txt: '+ Add Plain Caption Layer',
      ss_mm_export_t: 'Download Meme',
      ss_cd_tab_frames: 'Backdrop & Frame',
      ss_cd_tab_quotes: 'Cards & Quotes',
      ss_cd_tab_photo: 'Insert Photo',
      ss_cd_tab_export: 'Export & Print',
      ss_cd_bg_t: 'Luxury Card Backdrops',
      ss_cd_bg_upload_lbl: 'Upload Custom Card Backdrop',
      ss_cd_clear_bg: 'Use Preset Backdrop',
      ss_cd_border_t: 'Ornate & Minimal Borders',
      ss_cd_accent: 'Border Accent Color',
      ss_cd_library_t: 'Greetings & Inspirational Quotes',
      ss_cd_cat_quotes: 'Quotes & Wall Art',
      ss_cd_sig_t: 'Recipient & Sender Signatures',
      ss_cd_recipient: 'Recipient Line (Top)',
      ss_cd_sender: 'Sender Signature (Bottom)',
      ss_cd_add_text: '+ Add Custom Card Text',
      ss_cd_photo_frame_t: 'Photo Frame Shape',
      ss_pframe_arch: 'Arch',
      ss_cd_insert_photo: '+ Insert Framed Photo',
      ss_cd_export_t: 'Export Card or Print Poster',
      ss_bd_tab_shapes: 'Shapes & Colors',
      ss_bd_tab_copy: 'Offer Text',
      ss_bd_tab_product: 'Product Overlay',
      ss_bd_tab_export: 'Export',
      ss_bd_shapes_t: '16 Store & Promo Badge Shapes',
      ss_bd_themes_t: 'Color Themes',
      ss_bd_col1: 'Primary',
      ss_bd_col2: 'Accent',
      ss_bd_col_txt: 'Text',
      ss_bd_text_t: 'Badge Headline & Tagline',
      ss_bd_main_lbl: 'Main Headline',
      ss_bd_sub_lbl: 'Sub Tagline',
      ss_bd_presets_t: 'Quick Store Offer Presets',
      ss_bd_add_extra: '+ Add Floating Price / Tag',
      ss_bd_prod_t: 'Optional Product Photo Background',
      ss_bd_prod_note: 'Keep empty to export a clean transparent PNG badge, or upload a product photo to stamp your promo badge on top.',
      ss_bd_upload_prod: 'Upload Product Photo',
      ss_bd_clear_prod: 'Remove Product Photo',
      ss_bd_export_t: 'Download Promo Badge',
      ss_btn_dl_png: 'Download High-Res PNG',
      ss_btn_dl_trans_png: 'Download Transparent PNG',
      ss_btn_dl_jpg: 'Download JPG',
      ss_btn_dl_pdf: 'Download Print PDF',
      ss_checker_btn: 'Toggle Checkerboard',
      ss_shortcuts_legend: 'Arrows Nudge (Shift 10px) · Del Remove Layer · Ctrl+D Duplicate · Ctrl+Z/Y Undo/Redo · C Chat Preview · Hold Space Peek · Ctrl+S Export',
      ss_export_modal_d: 'Download high-resolution transparent PNG, JPG, WhatsApp 512×512 sticker, or 300 DPI printable sheet.',
      ss_mq_upload: 'Upload',
      ss_mq_text: 'Add Text',
      ss_mq_chat: 'Chat',
      ss_mq_peek: 'Peek',
      ss_mq_download: 'Download / Export',
      ss_insp_title: 'Properties & Layers',
      ss_btn_dup: 'Duplicate',
      ss_btn_del: 'Delete',
      ss_no_selection: 'Click any text, image, or sticker on the canvas to edit font, colors, frame style, scale, and rotation.',
      ss_prop_text: 'Text Content',
      ss_prop_font: 'Font Family (AR / EN)',
      ss_prop_size: 'Font Size',
      ss_prop_tframe: 'Frame Style',
      ss_tf_plain: 'Plain / Outlined',
      ss_tf_fused: 'Fused Sticker Backing',
      ss_tf_pill: 'Rounded Pill',
      ss_tf_bubble: 'Speech Bubble',
      ss_prop_fill: 'Text Fill',
      ss_prop_stroke_c: 'Stroke Color',
      ss_prop_frame_bg: 'Frame Fill',
      ss_prop_stroke_w: 'Outline Stroke Width',
      ss_prop_fuse: 'Include in Die-Cut White Border',
      ss_prop_scale: 'Scale',
      ss_prop_rot: 'Rotation',
      ss_prop_opacity: 'Opacity',
      ss_btn_center: 'Center on Canvas',
      ss_layers_t: 'Layers Stack',
      ss_btn_upload_short: '+ Upload Photo',
      ss_btn_chat_short: 'Chat Preview',
      ss_chat_modal_t: 'WhatsApp & Telegram Chat Preview',
      ss_chat_modal_d: 'Check how your transparent sticker reads on light and dark messaging bubbles before sending.',
      ss_chat_light: 'Light Theme',
      ss_chat_dark: 'Dark Theme',
      ss_chat_sample_in: 'Sending the new sticker now!',
      ss_chat_sample_out: 'Looks super crisp with that die-cut border!',
      ss_pr_st_full: 'Studio 1024px',
      ss_pr_st_wa: 'WhatsApp 512px',
      ss_pr_sq: 'Square 1:1',
      ss_pr_classic: 'Classic 4:3',
      ss_pr_port: 'Portrait 4:5',
      ss_pr_story: 'Story 9:16',
      ss_pr_a4: 'A4 Poster (Print)',
      ss_pr_bd_sq: 'Badge 1000px',
      ss_pr_bd_prod: 'Product 1200px',
      ss_ai_working: 'Running local AI cutout model inside your browser…',
      ss_cutout_ok: 'AI background cutout complete',
      ss_photo_loaded: 'Photo added to studio canvas',
      ss_bg_loaded: 'Custom background updated',
      ss_export_ok: 'Exported cleanly',
      ss_export_err: 'Failed to export design',
      ss_framed_text_t: 'Framed Photo',
      ss_ltype_text: 'Text Layer',
      ss_ltype_graphic: 'Graphic Sticker',
      ss_ltype_image: 'Image Layer',
      ss_ltype_promoBadge: 'Promo Badge',
      ss_layer_vis: 'Toggle visibility',
      ss_layer_lock: 'Lock/Unlock layer',
      ss_layer_up: 'Move layer up',
      ss_layer_down: 'Move layer down',
      // Photo to Coloring Page Studio (cp_*)
      cp_meta_desc: 'Turn photos into clean black-and-white printable coloring pages 100% locally in your browser with 4 line-art styles, AI background isolation, clean-up eraser, decorative frames, and 300 DPI A4/Letter PDF export.',
      cp_usage_hint: 'How to use: 1. Upload any photo (or paste Ctrl+V) → 2. Pick a line-art style & optionally click \'Isolate Subject\' to strip messy backgrounds → 3. Refine thickness, denoise & erase unwanted lines → 4. Print or download A4/Letter PDF.',
      cp_drop_title: 'Drop your photo, browse, or paste (Ctrl+V)',
      cp_drop_sub: 'JPG, PNG, WebP, BMP, GIF (max 30MB · 12,000px) · 100% in-browser',
      cp_ai_working: 'Isolating main subject & whitening background locally…',
      cp_mq_download: 'Download / Export',
      cp_mq_peek: 'Peek Original',
      cp_mq_eraser: 'Eraser',
      cp_btn_eraser: 'Clean-Up Eraser',
      cp_shortcuts_legend: '1-4 Line Style · E Toggle Eraser · Hold Space Peek · Ctrl+Z Undo · Ctrl+P Print · Ctrl+S Export',
      cp_tab_style: 'Line Style',
      cp_tab_refine: 'Refine & Clean',
      cp_tab_page: 'Page & Title',
      cp_styles_title: 'Line-Art Styles (4 Algorithms)',
      cp_style_classic_t: 'Classic Kids Coloring',
      cp_style_classic_d: 'Clean outer contours & wide open crayon spaces',
      cp_style_comic_t: 'Bold Comic Ink',
      cp_style_comic_d: 'Thick high-contrast ink outlines for toys & characters',
      cp_style_pencil_t: 'Artistic Pencil Sketch',
      cp_style_pencil_d: 'Soft graphite shading & fine texture lines',
      cp_style_mandala_t: 'Detailed Mandala / Fine Lines',
      cp_style_mandala_d: 'Intricate fine-detail extraction for adult coloring',
      cp_isolate_title: 'Smart Subject Isolation',
      cp_isolate_note: 'Strip cluttered rooms or street backgrounds locally with AI so only your subject appears on a clean white page.',
      cp_btn_isolate: 'Isolate Subject / Remove Messy Background',
      cp_btn_restore_full: 'Use Full Original Photo',
      cp_refine_title: 'Line & Whiteness Tuning',
      cp_thickness: 'Line Thickness / Boldness',
      cp_denoise: 'Background Whiteness / Denoise',
      cp_eraser_title: 'Manual Clean-Up Eraser',
      cp_eraser_note: 'Paint directly over unwanted stray marks or background lines to erase them to pure white before printing.',
      cp_eraser_size: 'Eraser Brush Size',
      cp_btn_clear_eraser: 'Clear Eraser Edits',
      cp_paper_title: 'Printable Paper Format (300 DPI)',
      cp_paper_a4p: 'A4 Portrait',
      cp_paper_a4l: 'A4 Landscape',
      cp_paper_letter: 'US Letter',
      cp_paper_square: 'Square (1:1)',
      cp_frame_title: 'Decorative Frame & Header',
      cp_frame_toggle: 'Decorative Coloring Page Border Frame',
      cp_fstyle_classic: 'Classic Double',
      cp_fstyle_scallop: 'Scalloped Kids',
      cp_fstyle_stars: 'Corner Stars',
      cp_fstyle_rounded: 'Rounded Clean',
      cp_title_label: 'Top Header Title / Child\'s Name',
      cp_title_ph: 'Adam\'s Coloring Page / لوحة البطل آدم',
      cp_tstyle_outline: 'Colorable Outline Text',
      cp_tstyle_solid: 'Bold Solid Ink',
      cp_export_modal_d: 'Print directly on paper or download crisp 300 DPI PDF, PNG, and JPG coloring sheets.',
      cp_btn_direct_print: 'Print Coloring Page Now',
      cp_btn_dl_pdf: 'Download Print-Ready PDF (300 DPI)',
      cp_btn_dl_png: 'Download PNG (High-Res)',
      cp_btn_dl_jpg: 'Download JPG',
      cp_img_loaded: 'Photo converted to coloring page',
      cp_err_dims: 'Image dimensions exceed 12,000 px limit',
      cp_isolated_ok: 'Background stripped — clean subject ready to color',
      cp_restored_full: 'Full photo background restored',
      cp_eraser_cleared: 'Manual eraser strokes cleared',
      cp_export_ok: 'Coloring sheet exported cleanly',
      cp_export_err: 'Failed to export coloring sheet',
      // Wallpaper & Pattern Generator Studio (wg_*)
      wg_meta_desc: 'Generate 4K wallpapers and seamless geometric patterns 100% locally in your browser across 9 generative engines including Mesh Aurora, Waves, Islamic patterns, Low-Poly, Bauhaus, Cosmic Nebula, Mountain Sunset, Night Cityscape, Topographic contours, plus Base Photo glassmorphism blur and PNG/JPG/SVG export.',
      wg_usage_hint: 'How to use: 1. Choose a generation style & screen preset (Mobile, 4K Desktop, iPad, Square) → 2. Click \'Magic Shuffle ✨\' or customize your palette, colors & film grain → 3. Toggle \'Lock-Screen Preview\' to check clock readability → 4. Export in 4K PNG, JPG, or Vector SVG.',
      wg_btn_shuffle: 'Magic Shuffle ✨',
      wg_btn_lock_preview: 'Lock-Screen Preview',
      wg_btn_export: 'Export & Download',
      wg_mq_download: 'Download / Export',
      wg_mq_shuffle: 'Magic Shuffle ✨',
      wg_mq_lock: 'Lock-Screen',
      wg_shortcuts_legend: 'Space Magic Shuffle · 1-9 Style Engine · L Lock-Screen Preview · Ctrl+Z Undo · Ctrl+S Export',
      wg_tab_style: 'Style',
      wg_tab_colors: 'Colors & Palette',
      wg_tab_details: 'Details & Grain',
      wg_styles_title: 'Generation Styles (9 Engines)',
      wg_style_mesh_t: 'Mesh & Aurora Gradients',
      wg_style_mesh_d: 'Smooth multi-point blurred light fields & aurora glows',
      wg_style_waves_t: 'Layered Waves & Blobs',
      wg_style_waves_d: 'Flowing layered waves with smooth depth shadows',
      wg_style_pattern_t: 'Geometric & Islamic Patterns',
      wg_style_pattern_d: 'Seamless hexagons, circles, triangles & star motifs',
      wg_style_lowpoly_t: 'Low-Poly Crystal Triangles',
      wg_style_lowpoly_d: '3D-shaded faceted crystal mesh geometry',
      wg_style_abstract_t: 'Minimalist Abstract & Bauhaus',
      wg_style_abstract_d: 'Balanced modern arcs, grids, circles & clean blocks',
      wg_style_nebula_t: 'Cosmic Nebula & Bokeh Lights',
      wg_style_nebula_d: 'Deep glowing space fields, cinematic bokeh & starlight sparkles',
      wg_style_mountain_t: 'Minimalist Mountain & Sunset',
      wg_style_mountain_d: 'Atmospheric mountain ridges, mist gradients & glowing sun',
      wg_style_city_t: 'Night Cityscape Skyline',
      wg_style_city_d: 'Geometric night skyline with lit windows & water reflections',
      wg_style_topo_t: 'Topographic Contour Lines',
      wg_style_topo_d: 'Smooth organic elevation contours with crisp line thickness',
      wg_base_photo_title: 'Optional Base Photo Overlay',
      wg_btn_clear_photo: 'Remove Photo',
      wg_btn_upload_photo: 'Upload Base Photo',
      wg_base_photo_note: 'Apply Glassmorphism blur, gradient light wash & film grain on top of your own local photo.',
      wg_photo_blur: 'Glassmorphism Blur',
      wg_photo_overlay: 'Gradient Light Overlay',
      wg_photo_blend: 'Overlay Blend:',
      wg_blend_screen: 'Glow',
      wg_blend_soft: 'Soft Light',
      wg_blend_tint: 'Color Tint',
      wg_photo_err_type: 'Please upload a valid JPG, PNG, WebP, BMP, GIF, or clean SVG file',
      wg_photo_err_size: 'Photo file size exceeds 30MB limit',
      wg_photo_err_dims: 'Photo dimensions exceed 12,000 px limit',
      wg_photo_loaded: 'Base photo applied with glassmorphism blur',
      wg_screen_title: 'Screen Size Presets (Up to 4K)',
      wg_size_mobile: 'Mobile Wallpaper',
      wg_size_4k: 'Desktop 4K',
      wg_size_fhd: 'Desktop Full HD',
      wg_size_tablet: 'Tablet / iPad',
      wg_size_square: 'Social Square',
      wg_size_custom: 'Custom Size',
      wg_size_custom_sub: 'Up to 4096px',
      wg_top_mobile: 'Mobile 9:19.5',
      wg_top_4k: 'Desktop 4K',
      wg_top_fhd: 'Full HD',
      wg_top_tablet: 'Tablet iPad',
      wg_top_square: 'Social 1:1',
      wg_top_custom: 'Custom',
      wg_custom_w: 'Width (px)',
      wg_custom_h: 'Height (px)',
      wg_apply_dims: 'Apply',
      wg_size_applied: 'Custom dimensions applied',
      wg_palettes_title: 'Designer Palettes (18 Presets)',
      wg_custom_colors_title: 'Custom Palette Colors',
      wg_btn_reverse: 'Reverse Colors',
      wg_color_count: 'Active Colors:',
      wg_color_slot: 'Color',
      wg_pal_aurora: 'Aurora Night',
      wg_pal_sunset: 'Sunset Glow',
      wg_pal_royalgold: 'Royal Gold',
      wg_pal_pastel: 'Pastel Calm',
      wg_pal_cyberneon: 'Cyber Neon',
      wg_pal_oceandeep: 'Ocean Deep',
      wg_pal_desertsand: 'Desert Sand',
      wg_pal_monochrome: 'Monochrome Minimal',
      wg_pal_emerald: 'Emerald Forest',
      wg_pal_rosequartz: 'Rose Quartz',
      wg_pal_nordic: 'Nordic Ice',
      wg_pal_volcanic: 'Volcanic Ember',
      wg_pal_lavender: 'Lavender Dream',
      wg_pal_midnight: 'Midnight Indigo',
      wg_pal_terracotta: 'Terracotta Sun',
      wg_pal_mintsoda: 'Mint Soda',
      wg_pal_warmlatte: 'Warm Latte',
      wg_pal_imperial: 'Imperial Teal',
      wg_geometry_title: 'Structure, Flow & Seed',
      wg_density: 'Complexity / Density',
      wg_angle: 'Flow Angle / Rotation',
      wg_smoothness: 'Contrast / Softness',
      wg_btn_reseed: 'New Shape Seed (Keep Colors)',
      wg_pattern_opts_title: 'Geometric & Islamic Motif',
      wg_motif_star8: 'Islamic Star',
      wg_motif_hex: 'Hexagons',
      wg_motif_circles: 'Interlocking Circles',
      wg_motif_triangles: 'Sacred Triangles',
      wg_seamless_toggle: 'Seamless Repeating Tile (Edge-to-Edge)',
      wg_badge_seamless: 'Seamless Tile',
      wg_grain_title: 'Film Grain & Surface Texture',
      wg_grain: 'Film Grain / Texture Noise',
      wg_grain_note: 'Adds subtle organic film grain to prevent gradient banding on high-DPI OLED screens.',
      wg_export_modal_d: 'Render at true full resolution (up to 4K 3840 × 2160 px) locally in your browser.',
      wg_btn_dl_png: 'Download High-Res PNG (Up to 4K)',
      wg_btn_dl_jpg: 'Download High-Quality JPG',
      wg_btn_dl_svg: 'Download Vector SVG',
      wg_svg_note_supported: 'Clean infinite-resolution SVG supported for Waves, Patterns, Low-Poly, Bauhaus, Mountain, Cityscape, and Topographic styles.',
      wg_svg_note_raster: 'SVG export is available for Waves, Patterns, Low-Poly, Bauhaus, Mountain, Cityscape, and Topographic styles. Use 4K PNG or JPG for Mesh & Nebula.',
      wg_svg_note_photo: 'SVG export is disabled while a raster Base Photo is active — remove the photo or download high-res 4K PNG / JPG.',
      wg_export_ok: 'Wallpaper exported cleanly',
      wg_export_err: 'Failed to export wallpaper',
      // Profile Picture (PFP) Maker Studio (pfp_*)
      pfp_meta_desc: 'Create studio-grade profile pictures (PFP) 100% locally in your browser with AI background removal, edge refine brush, 46 curated backdrops, 6 frame shapes & 18 rings including 3D pop-out effect, curved Arabic & English ring text, live social previews, and PNG/JPG/ZIP export.',
      pfp_usage_hint: 'How to use: 1. Upload your portrait photo → 2. Click \'Auto Remove Background (AI)\' and refine hair edges if needed → 3. Choose a studio backdrop (46+), 3D pop-out ring, and status badge → 4. Preview on LinkedIn/Instagram/X/Discord and export 1080px PNG or Social Pack (.ZIP).',
      pfp_btn_social_preview: 'Social Preview',
      pfp_btn_replace: 'Replace Photo',
      pfp_btn_export: 'Export & Download',
      pfp_drop_title: 'Drop or Upload Portrait Photo',
      pfp_drop_desc: 'Runs 100% privately in your browser — supports JPG, PNG, WebP, BMP, GIF & clean SVG (max 30MB).',
      pfp_btn_upload: 'Upload Photo',
      pfp_ai_running: 'Isolating subject with local AI…',
      pfp_ai_done: 'Background removed cleanly',
      pfp_ai_err: 'AI background cutout failed — please try another photo',
      pfp_mq_export: 'Export / ZIP',
      pfp_mq_social: 'Social Preview',
      pfp_mq_center: 'Auto-Center',
      pfp_btn_center: 'Auto-Center',
      pfp_btn_peek: 'Hold to Peek',
      pfp_btn_reset_frame: 'Reset Framing',
      pfp_shortcuts_legend: 'Drag Pan · Scroll Zoom · Space (Hold) Peek Original · C Auto-Center · P Social Preview · Ctrl+Z Undo · Ctrl+S Export',
      pfp_tab_photo: 'Photo & Cutout',
      pfp_tab_bg: 'Backdrops (46+)',
      pfp_tab_rings: 'Rings & Badges',
      pfp_cutout_title: 'Subject Cutout & Isolation',
      pfp_btn_ai_cutout: 'Auto Remove Background (AI)',
      pfp_btn_keep_orig: 'Keep Original Photo',
      pfp_brush_title: 'Edge Refine & Cutout Brush',
      pfp_brush_hint: 'Use Restore or Erase to clean hair or collar edges (or switch to Pan to move your face).',
      pfp_tool_pan: 'Pan Photo',
      pfp_tool_restore: 'Restore',
      pfp_tool_erase: 'Erase',
      pfp_brush_size: 'Brush Size',
      pfp_redo: 'Redo',
      pfp_framing_title: 'Framing, Zoom & Studio Light',
      pfp_zoom: 'Zoom',
      pfp_rotate: 'Tilt / Rotate',
      pfp_btn_rot90: 'Rotate 90°',
      pfp_btn_flip: 'Flip Horizontal',
      pfp_brightness: 'Brightness',
      pfp_contrast: 'Contrast',
      pfp_warmth: 'Warmth',
      pfp_bw_toggle: 'Black & White Subject',
      pfp_bg_library_title: 'Curated Studio Backdrops (46)',
      pfp_bg_cat_all: 'All (46)',
      pfp_bg_cat_solid: 'Solids (12)',
      pfp_bg_cat_grad: 'Gradients (14)',
      pfp_bg_cat_pat: 'Halos & Patterns (12)',
      pfp_bg_cat_smart: 'Smart Blur & Scenes (8)',
      pfp_bg_custom_title: 'Custom Gradient & Angle',
      pfp_grad_angle: 'Gradient Angle',
      pfp_color_1: 'Color 1',
      pfp_color_2: 'Color 2',
      pfp_btn_apply_custom_bg: 'Apply Custom Gradient Backdrop',
      pfp_bg_sol_white: 'Pure White',
      pfp_bg_sol_gray: 'Studio Gray',
      pfp_bg_sol_blue: 'LinkedIn Blue',
      pfp_bg_sol_navy: 'Executive Navy',
      pfp_bg_sol_mustard: 'Amber Mustard',
      pfp_bg_sol_emerald: 'Emerald Green',
      pfp_bg_sol_coral: 'Soft Coral',
      pfp_bg_sol_lavender: 'Pastel Lavender',
      pfp_bg_sol_sand: 'Warm Sand',
      pfp_bg_sol_charcoal: 'Charcoal Dark',
      pfp_bg_sol_rose: 'Blush Rose',
      pfp_bg_sol_sky: 'Sky Cyan',
      pfp_bg_grd_sunrise: 'Golden Sunrise',
      pfp_bg_grd_cali: 'Creator Sunset',
      pfp_bg_grd_aurora: 'Aurora Teal',
      pfp_bg_grd_cyber: 'Electric Cyan',
      pfp_bg_grd_gold: 'Royal Gold',
      pfp_bg_grd_ocean: 'Deep Ocean',
      pfp_bg_grd_mint: 'Fresh Mint',
      pfp_bg_grd_burgundy: 'Executive Burgundy',
      pfp_bg_grd_sapphire: 'Sapphire Night',
      pfp_bg_grd_silver: 'Chrome Silver',
      pfp_bg_grd_peach: 'Warm Peach',
      pfp_bg_grd_ice: 'Nordic Ice',
      pfp_bg_grd_forest: 'Deep Forest',
      pfp_bg_grd_twilight: 'Indigo Twilight',
      pfp_bg_pat_spotlight: 'Studio Spotlight',
      pfp_bg_pat_sunburst: 'Radial Sunburst',
      pfp_bg_pat_halftone: 'Pop Halftone',
      pfp_bg_pat_stripes: 'Diagonal Stripes',
      pfp_bg_pat_ripples: 'Concentric Ripples',
      pfp_bg_pat_starfield: 'Starlight Field',
      pfp_bg_pat_waves: 'Fluid Waves',
      pfp_bg_pat_hex: 'Tech Hex Grid',
      pfp_bg_pat_grid: 'Minimal Grid',
      pfp_bg_pat_marble: 'Marble Mist',
      pfp_bg_pat_bokeh: 'Studio Bokeh',
      pfp_bg_pat_vignette: 'Dark Vignette',
      pfp_bg_smt_bokeh_l: 'Light Bokeh Blur',
      pfp_bg_smt_bokeh_m: 'Medium Bokeh Blur',
      pfp_bg_smt_bokeh_s: 'Strong Bokeh Blur',
      pfp_bg_smt_colorpop: 'Color-Pop (B&W BG)',
      pfp_bg_scn_sunset: 'Scenic Sunset Silhouette',
      pfp_bg_scn_night: 'Starry Mountain Night',
      pfp_bg_scn_horizon: 'Desert Horizon Glow',
      pfp_bg_scn_city: 'Evening City Lights',
      pfp_shapes_title: 'Avatar Frame Shape (6 Shapes)',
      pfp_shape_circle: 'Circle',
      pfp_shape_squircle: 'Squircle',
      pfp_shape_hexagon: 'Hexagon',
      pfp_shape_shield: 'Shield',
      pfp_shape_badge: 'Soft Badge',
      pfp_shape_square: 'Sharp Square',
      pfp_rings_title: 'Ring Styles, 3D Pop-Out & Depth (18 Styles)',
      pfp_ring_story_grad: 'Story Gradient',
      pfp_ring_verified_glow: 'Verified Blue Glow',
      pfp_ring_royal_gold: 'Royal Gold',
      pfp_ring_cyber_neon: 'Cyber Neon',
      pfp_ring_exec_dual: 'Executive Dual',
      pfp_ring_metallic_silver: 'Metallic Silver',
      pfp_ring_double_sep: 'Double Separated',
      pfp_ring_dashed_tech: 'Dashed Tech',
      pfp_ring_dotted: 'Dotted Border',
      pfp_ring_arc_4seg: '4-Segment Arc',
      pfp_ring_angled_sweep: 'Angled Sweep',
      pfp_ring_inner_white: 'Inner White Frame',
      pfp_ring_popout_3d: '3D Pop-Out Top',
      pfp_ring_popout_glow: '3D Pop-Out + Glow',
      pfp_ring_glass_frost: 'Frosted Glass',
      pfp_ring_float_shadow: 'Floating Shadow',
      pfp_ring_inner_depth: 'Inner Depth',
      pfp_ring_rim_light: 'Studio Rim Light',
      pfp_ring_thickness: 'Ring Thickness',
      pfp_drop_shadow: 'Outer Drop Shadow',
      pfp_inner_shadow: 'Inner Frame Shadow',
      pfp_outer_glow: 'Ring Outer Glow',
      pfp_ring_col1: 'Ring Color 1',
      pfp_ring_col2: 'Ring Color 2',
      pfp_badges_title: 'Status Badges & Curved Ring Text',
      pfp_badge_none: 'None',
      pfp_badge_verified: 'Verified Check',
      pfp_badge_star: 'Creator Star',
      pfp_badge_custom: 'Custom Arc',
      pfp_badge_text_lbl: 'Badge Text',
      pfp_badge_col_lbl: 'Badge Color',
      pfp_curved_text_lbl: 'Optional Curved Text Along Ring',
      pfp_curved_ph: 'e.g. CREATIVE DIRECTOR · DESIGNER',
      pfp_font_label: 'Font:',
      pfp_text_color: 'Text Color',
      pfp_pos_top: 'Top Arc',
      pfp_pos_bottom: 'Bottom Arc',
      pfp_font_modal_title: 'Select Font (24 Studio Arabic & English Fonts)',
      pfp_font_modal_d: 'Choose a bold display or Arabic calligraphy typeface for curved ring text.',
      pfp_fonts_ar: 'Arabic Studio Fonts (12)',
      pfp_fonts_en: 'English Display Fonts (12)',
      pfp_social_modal_title: 'Live Social Platform Preview',
      pfp_social_modal_d: 'Inspect how your avatar looks inside 10 real platforms: Facebook, TikTok, WhatsApp, Telegram, Snapchat, Instagram, LinkedIn, X, YouTube & Discord.',
      pfp_social_toggle_theme: 'Toggle Light / Dark',
      pfp_soc_fb_tag: 'Facebook',
      pfp_soc_fb_sub: 'Profile cover & feed',
      pfp_soc_fb_comment: 'Great studio shot! Looking sharp.',
      pfp_soc_tt_tag: 'TikTok',
      pfp_soc_tt_sub: 'Creator sidebar & follow badge',
      pfp_soc_wa_tag: 'WhatsApp',
      pfp_soc_wa_sub: 'Chat list & Status ring active',
      pfp_soc_tg_tag: 'Telegram',
      pfp_soc_tg_sub: 'last seen recently · Chat header',
      pfp_soc_sc_tag: 'Snapchat',
      pfp_soc_sc_sub: 'Snap profile & circular frame',
      pfp_soc_ig_tag: 'Instagram',
      pfp_soc_ig_sub: 'Story gradient ring & feed header',
      pfp_soc_li_tag: 'LinkedIn',
      pfp_soc_li_sub: 'Senior Product Designer · #OPENTOWORK ready',
      pfp_soc_x_tag: 'X (Twitter)',
      pfp_soc_x_line: 'Sharp avatar silhouette and ring contrast at small timeline size.',
      pfp_soc_yt_tag: 'YouTube',
      pfp_soc_yt_sub: '148K subscribers · Channel & comments',
      pfp_soc_dc_tag: 'Discord',
      pfp_soc_dc_sub: 'Online · User card & status dot',
      pfp_export_modal_d: 'Export crisp 1080 × 1080 px PNG/JPG or bundle a complete 10-platform Social Pack (.ZIP) locally.',
      pfp_btn_dl_png: 'Download 1080×1080 PNG (Transparent Outside Shape)',
      pfp_btn_dl_jpg: 'Download High-Quality JPG',
      pfp_btn_dl_zip: 'Download Social Pack (.ZIP — 10 Platforms)',
      pfp_zip_note: 'ZIP bundle includes Facebook, TikTok, WhatsApp, Telegram, Snapchat, Instagram, LinkedIn, X (Twitter), YouTube, and Discord.',
      pfp_err_type: 'Please upload a valid JPG, PNG, WebP, BMP, GIF, or clean SVG file',
      pfp_err_size: 'Photo exceeds maximum 30MB file size',
      pfp_err_dims: 'Photo dimensions exceed 12,000 px limit',
      pfp_err_no_photo: 'Upload a portrait photo first',
      pfp_loaded_ok: 'Portrait loaded locally — ready to edit',
      pfp_export_ok: 'Profile picture exported cleanly',
      pfp_export_err: 'Failed to export profile picture',
      // Product & Device Mockup Studio (ms_*)
      ms_meta_desc: 'Showcase apps, websites, logos, and products 100% locally inside 33 realistic mockups — iPhone 16 Pro Max, Galaxy S24 Ultra, MacBook, iPad, Watch Ultra, frames, books, mugs, apparel, polo shirt, packaging, and storefront blade & glass signs with AI logo cutout, 36 studio backgrounds, transparent PNG, and 3x Retina export up to 3000px.',
      ms_usage_hint: 'How to use: 1. Choose from 33 Devices, Print Frames, Mugs, Apparel & Storefront Signs → 2. Upload your screenshot/logo (use AI Remove BG for logos!) & adjust fit/zoom → 3. Pick a studio background or Transparent PNG + customize shadows & marketing headline → 4. Export up to 3x Retina PNG/JPG.',
      ms_btn_upload: 'Upload Design',
      ms_btn_export: 'Export & Download',
      ms_asp_169: 'Presentation 16:9',
      ms_asp_11: 'Square 1:1',
      ms_asp_45: 'Portrait 4:5',
      ms_asp_916: 'Story 9:16',
      ms_btn_trans_short: 'Transparent BG',
      ms_drop_hint: 'Drag & drop an image or press Ctrl+V to apply',
      ms_mq_download: 'Download / Export',
      ms_mq_upload: 'Upload Design',
      ms_mq_center: 'Center',
      ms_btn_center: 'Center Design',
      ms_btn_peek: 'Hold to Peek',
      ms_redo: 'Redo',
      ms_btn_reset_design: 'Reset Placement',
      ms_shortcuts_legend: 'Drag Move · Wheel Zoom · Arrows Nudge · +/- Zoom · C Center · Space (Hold) Peek · Ctrl+V Paste · Ctrl+Z Undo · Ctrl+S Export',
      ms_tab_mockup: 'Mockup & Upload',
      ms_tab_bg: 'Background & Color',
      ms_tab_text: 'Text & Shadows',
      ms_tpl_title: 'Mockup Library (33 Templates)',
      ms_cat_all: 'All (33)',
      ms_cat_devices: 'Devices (14)',
      ms_cat_print: 'Frames & Print (8)',
      ms_cat_products: 'Products & Signs (11)',
      ms_dual_tag: 'Dual',
      ms_tpl_iphone16: 'iPhone 16 Pro Max',
      ms_tpl_s24ultra: 'Samsung S24 Ultra',
      ms_tpl_frameless: 'Frameless Clay Phone',
      ms_tpl_isophone: '3D Tilted Isometric Phone',
      ms_tpl_watch: 'Smartwatch Ultra',
      ms_tpl_ipad_p: 'iPad Pro Portrait',
      ms_tpl_ipad_l: 'iPad Pro Landscape',
      ms_tpl_mb_pro: 'MacBook Pro Space Black',
      ms_tpl_mb_air: 'MacBook Air Silver',
      ms_tpl_imac: 'Studio 5K Display',
      ms_tpl_browser_l: 'Desktop Browser Light',
      ms_tpl_browser_d: 'Desktop Browser Dark',
      ms_tpl_mb_iphone: 'MacBook + iPhone Scene',
      ms_tpl_dual_phones: 'Dual Stacked Phones',
      ms_tpl_oak_frame: 'Natural Oak Frame',
      ms_tpl_black_frame: 'Matte Black Gallery Frame',
      ms_tpl_gold_frame: 'Brushed Gold Frame',
      ms_tpl_canvas_wrap: '3D Gallery Canvas Wrap',
      ms_tpl_book: 'Hardcover Book 3D',
      ms_tpl_magazine: 'Open Magazine Spread',
      ms_tpl_bcard: 'Floating Business Cards',
      ms_tpl_poster: 'Minimalist Wall Poster',
      ms_tpl_mug: 'Ceramic Coffee Mug',
      ms_tpl_cup: 'Takeaway Coffee Cup',
      ms_tpl_tshirt: 'Cotton Crewneck T-Shirt',
      ms_tpl_hoodie: 'Heavyweight Hoodie',
      ms_tpl_tote: 'Canvas Tote Bag',
      ms_tpl_box: '3D Packaging Box',
      ms_tpl_kraft: 'Paper Shopping Bag',
      ms_tpl_sign: 'Illuminated Storefront Sign',
      ms_tpl_polo: 'Polo Collared Shirt',
      ms_tpl_blade_sign: 'Hanging Blade Sign',
      ms_tpl_glass_door: 'Storefront Glass Door',
      ms_upload_title: 'Artwork & Screenshot Upload',
      ms_btn_demo: 'Use Sample UI',
      ms_btn_upload_main: 'Upload Image / Logo',
      ms_btn_clear_art: 'Clear Upload',
      ms_btn_ai_bg: 'Remove Logo Background (AI)',
      ms_btn_ai_restore: 'Restore Original',
      ms_ai_wait: 'Removing logo background locally...',
      ms_ai_done: 'Logo background removed cleanly',
      ms_ai_err: 'AI background removal failed — try another image',
      ms_ai_restored: 'Original uploaded artwork restored',
      ms_upload_note: 'Supports JPG, PNG, WebP, BMP, GIF & clean SVG (max 30MB). You can also press Ctrl+V or drag & drop.',
      ms_btn_upload_2: 'Upload Screen 2',
      ms_btn_clear_2: 'Reset Screen 2',
      ms_fit_title: 'Design Placement & Framing',
      ms_fit_auto_badge: 'Smart Fit',
      ms_orient_lbl: 'Frame Orientation',
      ms_orient_portrait: 'Portrait',
      ms_orient_landscape: 'Landscape',
      ms_fit_cover: 'Fill Frame (Cover)',
      ms_fit_contain: 'Fit Entire Logo (Contain)',
      ms_zoom: 'Logo / Design Scale',
      ms_pan_x: 'Pan X',
      ms_pan_y: 'Pan Y',
      ms_rotate: 'Design Rotation',
      ms_btn_center_dock: 'Center Design',
      ms_btn_reset_dock: 'Reset Placement',
      ms_color_title: 'Device / Product Color',
      ms_custom_prod_col: 'Custom Finish Color',
      ms_bg_title: 'Studio Backgrounds (36+)',
      ms_btn_trans_bg: 'Transparent PNG',
      ms_bgcat_all: 'All (36)',
      ms_bgcat_solid: 'Solids',
      ms_bgcat_grad: 'Gradients',
      ms_bgcat_surf: 'Walls & Desks',
      ms_bgcat_dark: 'Dark Showcase',
      ms_custom_bg_title: 'Custom Background Photo / SVG',
      ms_btn_clear_bg: 'Remove BG',
      ms_btn_upload_bg: 'Upload Custom Background',
      ms_bg_sol_white: 'Pure White',
      ms_bg_sol_alab: 'Alabaster',
      ms_bg_sol_gray: 'Studio Gray',
      ms_bg_sol_sand: 'Warm Sand',
      ms_bg_sol_sage: 'Soft Sage',
      ms_bg_sol_blush: 'Soft Blush',
      ms_bg_sol_slate: 'Cool Slate',
      ms_bg_sol_charcoal: 'Charcoal',
      ms_bg_grd_nordic: 'Nordic Sky',
      ms_bg_grd_sunrise: 'Soft Sunrise',
      ms_bg_grd_lavender: 'Lavender Mist',
      ms_bg_grd_mint: 'Mint Breeze',
      ms_bg_grd_peach: 'Warm Peach',
      ms_bg_grd_ocean: 'Ocean Air',
      ms_bg_grd_rose: 'Rose Velvet',
      ms_bg_grd_champ: 'Champagne Glow',
      ms_bg_grd_indigo: 'Electric Indigo',
      ms_bg_grd_emerald: 'Emerald Aura',
      ms_bg_srf_plaster: 'Warm Plaster Wall',
      ms_bg_srf_concrete: 'Minimalist Concrete',
      ms_bg_srf_oak: 'Light Oak Wood Desk',
      ms_bg_srf_marble: 'Carrara Marble Stone',
      ms_bg_srf_terrazzo: 'Terrazzo Surface',
      ms_bg_srf_linen: 'Soft Linen Cloth',
      ms_bg_srf_grid: 'Architectural Grid',
      ms_bg_srf_sunlit: 'Sunlit Shadow Wall',
      ms_bg_drk_obsidian: 'Obsidian Matte',
      ms_bg_drk_indigo: 'Deep Indigo Spotlight',
      ms_bg_drk_cyber: 'Cyber Teal Glow',
      ms_bg_drk_carbon: 'Carbon Graphite',
      ms_bg_drk_violet: 'Violet Aurora',
      ms_bg_drk_emerald: 'Emerald Darkroom',
      ms_bg_drk_bronze: 'Warm Bronze Night',
      ms_bg_drk_navy: 'Midnight Navy',
      ms_bg_drk_crimson: 'Crimson Velvet',
      ms_bg_drk_pitch: 'Pitch Studio Black',
      ms_realism_title: 'Shadows & Surface Realism',
      ms_shadow_lbl: 'Contact & Ambient Shadow',
      ms_sheen_toggle: 'Glass Reflection & Specular Sheen',
      ms_sheen_lbl: 'Reflection / Gloss Intensity',
      ms_headline_title: 'Marketing & App Store Headline',
      ms_hpos_none: 'Off',
      ms_hpos_top: 'Top Header',
      ms_hpos_side: 'Side Showcase',
      ms_hl_input: 'Headline Text',
      ms_hl_ph: 'Launch Your Product in Style',
      ms_sub_input: 'Subheadline',
      ms_sub_ph: '100% client-side studio showcase',
      ms_font_lbl: 'Font:',
      ms_text_col: 'Text Color',
      ms_font_modal_t: 'Select Font (24 Studio Arabic & English Fonts)',
      ms_font_modal_d: 'Choose a crisp display or Arabic typeface for App Store & marketing headlines.',
      ms_fonts_ar: 'Arabic Studio Fonts (12)',
      ms_fonts_en: 'English Display Fonts (12)',
      ms_export_modal_d: 'Render locally up to 3x Ultra Retina resolution (up to 3000 px) with optional transparent PNG background.',
      ms_scale_1x: '1x Standard',
      ms_scale_2x: '2x High HD',
      ms_scale_3x: '3x Ultra Retina (up to 3000px)',
      ms_btn_dl_png: 'Download PNG (Supports Transparent)',
      ms_btn_dl_jpg: 'Download High-Quality JPG',
      ms_err_type: 'Please upload a valid JPG, PNG, WebP, BMP, GIF, or clean SVG file',
      ms_err_size: 'Image file exceeds maximum 30MB limit',
      ms_err_dims: 'Image dimensions exceed 12,000 px limit',
      ms_loaded_ok: 'Design loaded locally into mockup studio',
      ms_export_ok: 'Mockup exported in crisp high resolution',
      ms_export_err: 'Failed to export mockup image',
      // Smart Photo Collage Maker (pc_*)
      pc_meta_desc: 'Create 2-to-12 photo collages, Bento grids, editorial magazine spreads, cinema filmstrips, Polaroids, and geometric mosaics 100% locally with 60 layouts, 42 studio backgrounds, 24 EN/AR fonts, and up to 3000px PNG or 300 DPI A4/Letter PDF export.',
      pc_usage_hint: 'How to use: 1. Add 2–12 photos (or drag/paste onto canvas) → 2. Pick from 60 Grids, Editorial, Filmstrip, Polaroid & Geometric layouts and drag/zoom/swap inside any frame → 3. Adjust spacing, corner radius, 42 studio backgrounds, color filters & EN/AR title → 4. Export up to 3000px PNG/JPG or 300 DPI A4/Letter PDF.',
      pc_btn_add_photos: 'Add Photos',
      pc_btn_shuffle: 'Smart Shuffle',
      pc_btn_export: 'Export & Print',
      pc_asp_11: 'Square 1:1',
      pc_asp_45: 'Portrait 4:5',
      pc_asp_916: 'Story 9:16',
      pc_asp_169: 'Landscape 16:9',
      pc_asp_a4: 'A4 Portrait 300 DPI',
      pc_asp_a4l: 'A4 Landscape',
      pc_drop_hint: 'Click any frame to pan/zoom · Drag & drop or Ctrl+V to add photos',
      pc_mq_download: 'Download / Export',
      pc_mq_add: 'Add Photos',
      pc_mq_shuffle: 'Shuffle',
      pc_btn_reset_crop: 'Reset Frame Crop',
      pc_btn_clear_all: 'Reset Demo',
      pc_shortcuts_legend: 'Click Frame Select · Drag Pan · Wheel Zoom · Arrow Nudge · R Smart Shuffle · Ctrl+V Paste · Ctrl+Z Undo · Ctrl+S Export',
      pc_tab_layouts: 'Layouts & Photos',
      pc_tab_spacing: 'Spacing & Background',
      pc_tab_filters: 'Filters & Text',
      pc_photos_title: 'Your Photos (Up to 12)',
      pc_photos_note: 'Tap any tile to jump to its frame, or drag files onto the canvas.',
      pc_photos_unit: 'photos',
      pc_demo_badge: 'Demo Artwork',
      pc_frame_num: 'Frame #',
      pc_swap_pick: 'Click any second frame on the canvas to swap photos',
      pc_btn_swap: 'Swap with Another Frame',
      pc_btn_clear_slot: 'Remove Photo',
      pc_slot_zoom: 'Frame Zoom',
      pc_btn_rot90: 'Rotate 90°',
      pc_btn_flip: 'Flip H',
      pc_btn_replace: 'Replace Photo',
      pc_layouts_title: 'Collage Layouts (60)',
      pc_match_count: 'Match Photo Count',
      pc_lcat_all: 'All (60)',
      pc_lcat_grids: 'Grids & Bento (16)',
      pc_lcat_editorial: 'Editorial (16)',
      pc_lcat_film: 'Film & Polaroid (14)',
      pc_lcat_shapes: 'Shapes (14)',
      pc_lay_g_2h: '2 Split Horizontal',
      pc_lay_g_2v: '2 Split Vertical',
      pc_lay_g_3v: '3 Equal Columns',
      pc_lay_g_2x2: '2×2 Classic Grid',
      pc_lay_g_bento4: '4-Tile Bento Asymmetric',
      pc_lay_g_bento5: '5-Tile Studio Bento',
      pc_lay_g_3x2: '3×2 Gallery Grid',
      pc_lay_g_bento6: '6-Tile Bento Mix',
      pc_lay_g_bento7: '7-Tile Bento Wall',
      pc_lay_g_4x2: '4×2 Wide Grid',
      pc_lay_g_bento8: '8-Tile Bento Showcase',
      pc_lay_g_3x3: '3×3 Square Grid',
      pc_lay_g_bento9: '9-Tile Bento Mosaic',
      pc_lay_g_10: '10-Tile Dual Feature',
      pc_lay_g_11: '11-Tile Bento Grid',
      pc_lay_g_4x3: '4×3 Grand Grid',
      pc_lay_ed_ba: 'Before / After Split',
      pc_lay_ed_hero2: 'Hero + Inset Card',
      pc_lay_ed_hero3l: 'Left Hero + 2 Stacked',
      pc_lay_ed_hero3t: 'Top Hero + 2 Below',
      pc_lay_ed_l4: 'L-Shape Editorial 4',
      pc_lay_ed_t4: 'Header Hero + Trio',
      pc_lay_ed_cat4: 'Catalog 4-Column',
      pc_lay_ed_hero5: 'Feature Hero + 4 Grid',
      pc_lay_ed_cen5: 'Centerpiece Focus 5',
      pc_lay_ed_look6: 'Fashion Lookbook 6',
      pc_lay_ed_cov7: 'Magazine Cover 7',
      pc_lay_ed_cov8: 'Editorial Spread 8',
      pc_lay_ed_spr9: 'Gallery Feature 9',
      pc_lay_ed_cat10: 'Studio Catalog 10',
      pc_lay_ed_spr11: 'Collector Spread 11',
      pc_lay_ed_yb12: 'Yearbook Spread 12',
      pc_lay_fm_pol2: 'Dual Polaroid Cards',
      pc_lay_fm_3v: '3-Frame Filmstrip',
      pc_lay_fm_pol3: '3 Scattered Polaroids',
      pc_lay_fm_4v: '4-Frame Cinema Strip',
      pc_lay_fm_4h: '4-Frame Contact Row',
      pc_lay_fm_pol4: '4 Polaroid Cluster',
      pc_lay_fm_pol5: '5 Hero Polaroid Board',
      pc_lay_fm_scr6: '6 Scrapbook Overlap',
      pc_lay_fm_6d: '2×3 Darkroom Contact',
      pc_lay_fm_scr7: '7 Photo Pinboard',
      pc_lay_fm_8d: '2×4 Cinema Sheet',
      pc_lay_fm_pol9: '9 Mini Polaroid Wall',
      pc_lay_fm_scr10: '10 Memory Board',
      pc_lay_fm_12: '12-Frame Contact Sheet',
      pc_lay_sh_diag2: 'Diagonal Split 2',
      pc_lay_sh_circ2: 'Twin Circles',
      pc_lay_sh_diag3: '3 Diagonal Stripes',
      pc_lay_sh_arch3: '3 Gallery Arches',
      pc_lay_sh_dia4: '4-Diamond Mosaic',
      pc_lay_sh_hex4: '4-Hexagon Cluster',
      pc_lay_sh_arch5: '5 Architectural Arches',
      pc_lay_sh_star5: '5-Point Showcase',
      pc_lay_sh_hex6: '6 Honeycomb Grid',
      pc_lay_sh_hex7: '7 Honeycomb Flower',
      pc_lay_sh_circ8: '8 Bubble Gallery',
      pc_lay_sh_heart9: '9 Heart Collage',
      pc_lay_sh_dia10: '10 Diamond Lattice',
      pc_lay_sh_hex12: '12 Hexagon Matrix',
      pc_spacing_title: 'Borders, Spacing & Shadows',
      pc_gap_lbl: 'Inner Spacing (Gap)',
      pc_pad_lbl: 'Outer Border Margin',
      pc_rad_lbl: 'Corner Radius',
      pc_shadow_toggle: 'Soft Frame Elevation Shadows',
      pc_bg_title: 'Collage Backgrounds (42+)',
      pc_bgcat_all: 'All (42)',
      pc_bgcat_solid: 'Solids',
      pc_bgcat_grad: 'Gradients',
      pc_bgcat_tex: 'Paper & Textures',
      pc_bgcat_dark: 'Dark Gallery',
      pc_custom_bg_title: 'Custom Background Image',
      pc_bg_sol_white: 'Pure White',
      pc_bg_sol_ivory: 'Warm Ivory',
      pc_bg_sol_alab: 'Alabaster',
      pc_bg_sol_gray: 'Studio Gray',
      pc_bg_sol_sand: 'Desert Sand',
      pc_bg_sol_sage: 'Soft Sage',
      pc_bg_sol_blush: 'Soft Blush',
      pc_bg_sol_sky: 'Powder Sky',
      pc_bg_sol_slate: 'Cool Slate',
      pc_bg_sol_charcoal: 'Charcoal',
      pc_bg_grd_morning: 'Morning Dew',
      pc_bg_grd_peach: 'Warm Peach',
      pc_bg_grd_nordic: 'Nordic Ice',
      pc_bg_grd_lavender: 'Lavender Mist',
      pc_bg_grd_mint: 'Mint Breeze',
      pc_bg_grd_rose: 'Rose Quartz',
      pc_bg_grd_champ: 'Champagne Gold',
      pc_bg_grd_ocean: 'Ocean Air',
      pc_bg_grd_golden: 'Golden Hour',
      pc_bg_grd_coral: 'Coral Sunset',
      pc_bg_grd_indigo: 'Electric Indigo',
      pc_bg_grd_emerald: 'Emerald Aura',
      pc_bg_tex_linen: 'Warm Linen',
      pc_bg_tex_paper: 'Cotton Paper',
      pc_bg_tex_marble: 'Carrara Marble',
      pc_bg_tex_terrazzo: 'Terrazzo Stone',
      pc_bg_tex_kraft: 'Kraft Cardboard',
      pc_bg_tex_concrete: 'Minimal Concrete',
      pc_bg_tex_oak: 'Light Oak Grain',
      pc_bg_tex_grid: 'Blueprint Grid',
      pc_bg_tex_dots: 'Polka Paper',
      pc_bg_tex_cork: 'Pinboard Cork',
      pc_bg_drk_obsidian: 'Obsidian Matte',
      pc_bg_drk_indigo: 'Deep Indigo',
      pc_bg_drk_pitch: 'Gallery Black',
      pc_bg_drk_crimson: 'Crimson Velvet',
      pc_bg_drk_navy: 'Midnight Navy',
      pc_bg_drk_cyber: 'Cyber Teal',
      pc_bg_drk_bronze: 'Warm Bronze',
      pc_bg_drk_emerald: 'Dark Emerald',
      pc_bg_drk_violet: 'Violet Aurora',
      pc_bg_drk_carbon: 'Carbon Graphite',
      pc_filters_title: 'Color Filters & Look',
      pc_fscope_all: 'All Photos',
      pc_fscope_slot: 'Selected Frame',
      pc_flt_none: 'Original',
      pc_flt_warm: 'Warm Film',
      pc_flt_vivid: 'Vivid Pop',
      pc_flt_cine: 'Cinema Teal',
      pc_flt_vint: 'Retro Vintage',
      pc_flt_bw: 'Classic B&W',
      pc_text_title: 'Title & Caption Overlay',
      pc_tpos_none: 'Off',
      pc_tpos_top: 'Top Banner',
      pc_tpos_bot: 'Bottom Caption',
      pc_tpos_center: 'Center Badge',
      pc_title_lbl: 'Collage Title',
      pc_title_ph: 'Summer Memories 2026',
      pc_sub_lbl: 'Subtitle / Date',
      pc_sub_ph: 'Collection · imgsfix Studio',
      pc_tsize_lbl: 'Title Size',
      pc_font_modal_d: 'Choose a crisp Arabic or English typeface for your collage title and captions.',
      pc_export_modal_d: 'Render locally up to 3x Retina PNG/JPG (up to 3000 px) or print-ready 300 DPI A4 / US Letter PDF.',
      pc_pdf_a4: 'A4 Print PDF (300 DPI)',
      pc_pdf_letter: 'US Letter PDF (300 DPI)',
      pc_btn_dl_pdf: 'Download Print-Ready PDF',
      pc_loaded_ok: 'Photos added to collage studio',
      pc_err_max12: 'Maximum 12 photos reached — extra files skipped',
      pc_export_ok: 'Collage exported cleanly',
      pc_export_err: 'Failed to export collage',
      // YouTube Thumbnail & Cover Grabber (yt_*)
      yt_meta_desc: 'Preview and download HD (1280×720), SD, HQ, and MQ YouTube thumbnails and Shorts covers as JPG or PNG 100% locally in your browser with zero uploads.',
      yt_usage_hint: 'How to use: 1. Paste any YouTube Watch, Shorts, Live, Embed, or youtu.be link (or 11-char Video ID) → 2. Click Get Thumbnails to auto-detect HD/SD/HQ/MQ sizes → 3. Download directly as JPG or PNG, copy the official URL, or click Edit in Thumbnail Maker to customize text & effects.',
      yt_hub_badge: 'Media & Video Cover Hub',
      yt_hub_sub: 'Supports Watch, youtu.be, Shorts, Live, Embed & 11-char IDs',
      yt_url_ph: 'https://www.youtube.com/watch?v=... or youtu.be/... or 11-char ID',
      yt_btn_paste: 'Paste URL',
      yt_btn_get: 'Get Thumbnails',
      yt_btn_sample: 'Try Sample Video',
      yt_btn_clear: 'Clear',
      yt_history_lbl: 'Recent Videos',
      yt_btn_clear_hist: 'Clear History',
      yt_empty_t: 'Paste a YouTube Link to Inspect Every Cover Resolution',
      yt_empty_d: 'Instantly detect MaxRes HD (1280×720), SD (640×480), HQ (480×360), and MQ (320×180) directly in your browser — download JPG or PNG, or send to Thumbnail Maker.',
      yt_vid_id_lbl: 'Video ID',
      yt_btn_dl_best: 'Download Highest HD',
      yt_btn_edit_best: 'Edit in Thumbnail Maker',
      yt_avail_lbl: 'resolutions verified',
      yt_none_avail: 'No public thumbnail found for this ID',
      yt_res_maxres: 'MaxRes Full HD',
      yt_res_maxres_d: 'Official 16:9 widescreen 1280×720 high-definition cover.',
      yt_res_sd: 'Standard Definition (SD)',
      yt_res_sd_d: 'Standard 4:3 letterboxed 640×480 YouTube cover.',
      yt_res_hq: 'High Quality (HQ)',
      yt_res_hq_d: 'Balanced 480×360 thumbnail for previews and embeds.',
      yt_res_mq: 'Medium Quality (MQ)',
      yt_res_mq_d: 'Compact 16:9 widescreen 320×180 fast-loading cover.',
      yt_badge_highest: 'Highest Available HD',
      yt_badge_best_fallback: 'Highest Available',
      yt_badge_hd_missing: 'MaxRes HD Unavailable',
      yt_maxres_fallback: 'This video does not publish a 1280×720 MaxRes cover — showing the highest verified SD/HQ resolution instead.',
      yt_btn_dl_jpg: 'Download JPG',
      yt_btn_dl_png: 'Download PNG',
      yt_btn_copy_url: 'Copy Image URL',
      yt_btn_edit_maker: 'Edit in Thumbnail Maker',
      yt_shortcuts_legend: 'Enter Fetch · Ctrl+V Paste URL · Ctrl+S Download Highest HD',
      yt_err_invalid: 'Please enter a valid YouTube Watch, Shorts, Live, youtu.be link, or 11-character Video ID.',
      yt_err_not_found: 'No public thumbnails were found for this Video ID. Please double-check the link.',
      yt_err_unavail: 'This resolution is not available for download',
      yt_fetch_ok: 'Thumbnails detected and verified cleanly',
      yt_dl_ok: 'Thumbnail downloaded cleanly',
      yt_dl_err: 'Unable to export thumbnail from browser canvas',
      yt_copy_ok: 'Official YouTube image URL copied',
      yt_copy_err: 'Could not copy URL to clipboard',
      yt_handoff_err: 'Unable to open Thumbnail Maker with this image',
      yt_paste_manual: 'Clipboard permission unavailable — please paste directly into the box',
      yt_paste_empty: 'Clipboard is empty',
      yt_hist_cleared: 'Recent video history cleared',
      // Pro Video Frame Grabber & Burst Capture Studio (vf_*)
      vf_meta_desc: 'Step through local MP4, WebM, MOV, and MKV videos frame-by-frame, run smart auto-burst captures, and export native-resolution PNG, JPG, WebP snapshots or ZIP packs 100% locally in your browser.',
      vf_usage_hint: 'How to use: 1. Drop or choose any local video (MP4, WebM, MOV, MKV, OGG) — zero uploads → 2. Scrub the timeline or step frame-by-frame (-1/+1 frame) to pinpoint exact moments → 3. Click Capture Current Frame or run Auto-Burst (5/10/20 frames), then download as PNG, JPG, WebP, or Download All as .ZIP.',
      vf_studio_badge: 'Video Broadcast & Frame Extraction Studio',
      vf_drop_t: 'Drop a Video File Here or Browse',
      vf_drop_d: 'Streams 100% locally in your browser without reading full multi-GB files into RAM or uploading anything.',
      vf_btn_browse: 'Choose Local Video',
      vf_meta_res: 'Resolution',
      vf_meta_dur: 'Duration',
      vf_meta_ar: 'Aspect',
      vf_btn_replace: 'Replace Video',
      vf_btn_unload: 'Unload',
      vf_btn_prev_frame: '-1 Frame',
      vf_btn_play: 'Play',
      vf_btn_pause: 'Pause',
      vf_btn_next_frame: '+1 Frame',
      vf_speed_lbl: 'Speed',
      vf_btn_capture: 'Capture Current Frame',
      vf_burst_title: 'Smart Auto-Burst',
      vf_burst_sub: 'Evenly spaced across timeline',
      vf_burst_5: '5 Frames',
      vf_burst_10: '10 Frames',
      vf_burst_20: '20 Frames',
      vf_burst_running: 'Capturing frames…',
      vf_btn_cancel: 'Cancel',
      vf_gallery_t: 'Captured Frames',
      vf_btn_dl_zip: 'Download All as .ZIP',
      vf_btn_clear_all: 'Clear All',
      vf_gallery_empty: 'No frames captured yet. Pause at any frame or click Capture Current Frame / Auto-Burst.',
      vf_shortcuts_legend: 'Space Play/Pause · Left/Right -1/+1 Frame · Shift+Left/Right -1s/+1s · C or Enter Capture Frame · Ctrl+S Download .ZIP',
      vf_dur_unknown: 'Unknown',
      vf_loaded_ok: 'Local video ready for frame extraction',
      vf_err_invalid_video: 'Unsupported or corrupted video file — please choose a valid MP4, WebM, MOV, MKV, or OGG video.',
      vf_err_gallery_full: 'Gallery limit reached (40 frames max) — remove frames or download ZIP first.',
      vf_captured_ok: 'Frame captured at native resolution',
      vf_err_capture: 'Unable to capture frame from this video timestamp',
      vf_err_no_duration: 'Video duration is unavailable for auto-burst capture',
      vf_burst_done: 'Auto-burst captured {n} crisp frames',
      vf_burst_cancelled: 'Auto-burst cancelled',
      vf_cleared_ok: 'Captured frames cleared from memory',
      vf_dl_ok: 'Snapshot downloaded',
      vf_err_export: 'Unable to export frame in this format',
      vf_err_handoff: 'Unable to open frame in Thumbnail Maker',
      vf_zip_ok: 'All captured frames downloaded as .ZIP',
      vf_err_zip: 'Unable to create .ZIP archive',
      vf_frame_alt: 'Captured frame at',
      vf_btn_remove: 'Remove frame',
      vf_btn_edit_thumb: 'Edit in Thumbnail Maker'
    },
    ar: {
      nav_home: 'الرئيسية', nav_tools: 'الأدوات', nav_editor: 'المحرر', nav_qr: 'قارئ QR',
      nav_services: 'الخدمات', nav_about: 'حول', nav_contact: 'اتصل', nav_faq: 'الأسئلة',
      cta_start: 'ابدأ التحرير', cta_browse: 'تصفح الأدوات',
      cta_install: 'تثبيت التطبيق',
      theme_toggle: 'تبديل المظهر', light: 'فاتح', dark: 'داكن',
      hero_badge: 'يعمل بالمتصفح 100% · بدون رفع · خصوصية تامة',
      hero_title: 'أصلح وحوّل صورك مباشرة في المتصفح',
      hero_title_g: 'مباشرة في المتصفح',
      hero_lead: 'ضغط، تغيير حجم، تحويل، قص، تحسين، وتحرير الصور بدون أي اتصال بالخادم. ملفاتك لا تغادر جهازك — خصوصية مضمونة.',
      hero_stat1: '٦ أقسام متكاملة', hero_stat2: 'صفر رفع', hero_stat3: 'مجاني للأبد', hero_stat4: 'بدون تسجيل', hero_stat5: 'عربي / EN',
      services_badge: 'ماذا نقدم', services_title: 'ثلاث ركائز لـ imgsfix',
      svc1_t: 'أدوات الصور', svc1_d: 'ثماني أدوات مركزة — ضغط، تغيير حجم، تحويل، قص، إزالة الخلفية، كرتون، تحسين، وفلاتر الصور.',
      svc2_t: 'QR والباركود', svc2_d: 'امسح رموز QR والباركود من الكاميرا أو ملفات الصور فوراً، كل ذلك محلياً على جهازك.',
      svc3_t: 'محرر متقدم', svc3_d: 'محرر لوحة كامل بالأشكال والنصوص والطبقات والإعدادات المسبقة والتراجع والإعادة.',
      tools_badge: 'مركز الأدوات', tools_title: 'استكشف الأدوات حسب القسم',
      tools_search_ph: 'ابحث في جميع الأدوات عبر 6 أقسام…',
      cat_explore: 'استعراض الأدوات', cat_view: 'عرض القسم',
      status_live: 'متاح الآن', status_soon: 'قريباً',
      cat_images_t: 'أدوات الصور والتصميم', cat_images_d: 'ضغط، تغيير أبعاد، تحويل صيغ، قص، إزالة خلفية، كرتون، تحسين، فلاتر، وتحرير متقدم متعدد الطبقات.', cat_images_meta: '٩ أدوات نشطة',
      cat_ai_t: 'الاستوديو الذكي', cat_ai_powered: 'مدعومة بالذكاء الاصطناعي', cat_ai_d: 'صمّم صور جواز السفر والتأشيرات، وحرّر الصور المصغّرة ليوتيوب والسوشيال ميديا، وأنشئ الملصقات المقصوصة والميمز وبطاقات المعايدة وشارات المتاجر، وحوّل الصور إلى صفحات تلوين، وأنشئ خلفيات 4K وأنماطاً هندسية متكررة، وصمّم الصور الشخصية الاحترافية (PFP)، واعرض تطبيقاتك ومنتجاتك داخل 33+ نموذج موك اب، وأنشئ كولاج الصور الذكي محلياً بأعلى درجات الأمان.', cat_ai_meta: '٨ أدوات نشطة',
      cat_text_t: 'أدوات النصوص والمحتوى', cat_text_d: 'استخراج النص من الصور (OCR)، وزخرفة النصوص، وعدّاد الكلمات والأحرف وتحليل الكثافة المفتاحية، وتنسيق ومقارنة وتلخيص المحتوى محلياً.', cat_text_meta: '٦ أدوات نشطة',
      cat_business_t: 'الأعمال التجارية', cat_business_d: 'مسح QR والباركود، تصميم رموز QR مخصصة، إنشاء روابط واتساب، وإصدار الفواتير والإيصالات.', cat_business_meta: '١ متاحة · ٣ قريباً',
      cat_media_t: 'الفيديو والصوتيات', cat_media_d: 'اجلب وحمّل صور يوتيوب المصغّرة وأغلفة Shorts بجودة MaxRes HD، والتقط لقطات الفيديو بدقة إطار بإطار والتصوير المتتابع، واستخرج الصوت، وقص وحسّن الصوتيات محلياً.', cat_media_meta: '٢ متاحة · ٢ قريباً',
      cat_pdf_t: 'أدوات PDF وأخرى', cat_pdf_d: 'دمج وتقسيم PDF، التحويل بين الصور وPDF، التوقيع الإلكتروني، كلمات المرور، ومؤقت التركيز.', cat_pdf_meta: '٥ أدوات · قريباً',
      t_compress_t: 'ضغط', t_compress_d: 'قلل حجم الملف مع الحفاظ على الجودة.',
      t_resize_t: 'تغيير أبعاد الصور', t_resize_d: 'غيّر عرض وارتفاع الصور بالبكسل أو النسبة المئوية أو اختر مقاسات السوشيال ميديا الجاهزة بدقة عالية.',
      t_convert_t: 'تحويل صيغ الصور', t_convert_d: 'حوّل الصور بين JPG و PNG و WebP و AVIF و ICO و PDF بسرعة وأمان داخل المتصفح مع الحفاظ على الجودة.',
      t_crop_t: 'قص', t_crop_d: 'اقتص وقم بإطار صورتك بدقة.',
      t_removebg_t: 'إزالة الخلفية', t_removebg_d: 'إزالة خلفيات الصور تلقائياً بالذكاء الاصطناعي محلياً 100٪ داخل متصفحك.',
      t_cartoon_t: 'كرتون', t_cartoon_d: 'حوّل الصور إلى فن كرتوني.',
      t_enhance_t: 'تحسين جودة الصور', t_enhance_d: 'حسّن وضوح الصور وإضاءتها وألوانها تلقائياً بضغطة واحدة مع إزالة التشويش وإبراز التفاصيل الدقيقة.',
      t_filters_t: 'فلاتر الصور', t_filters_nav: 'الفلاتر', t_filters_d: 'طبّق 18 فلتراً فوتوغرافياً وسينمائياً مع تعديلات فورية للإضاءة والألوان.',
      t_editor_t: 'محرر الصور المتقدم', t_editor_d: 'محرر تصميم متكامل بالطبقات والأشكال والخطوط العربية والإنجليزية والتأثيرات وحفظ المشاريع.',
      t_qr_t: 'قارئ QR والباركود', t_qr_d: 'امسح رموز QR والباركود من الكاميرا أو ملفات الصور فوراً وبدون رفع أي بيانات.',
      t_summarizer_t: 'ملخّص النصوص الذكي', t_summarizer_d: 'لخّص المقالات ومذكرات الدراسة والتقارير بأوضاع مخصصة، مع استخراج المصطلحات، والقراءة الصوتية، والتصدير إلى Word وPDF.',
      t_diff_t: 'مقارن النصوص وكشف الفروقات', t_diff_d: 'قارن بين نصين كلمة بكلمة أو سطراً بسطر محلياً داخل متصفحك لإبراز الإضافات والحذوفات والتعديلات الدقيقة فوراً.',
      t_ocr_t: 'استخراج النص من الصورة (OCR)', t_ocr_d: 'استخرج النصوص العربية والإنجليزية القابلة للتحرير من الصور ولقطات الشاشة والمستندات المصوّرة محلياً 100٪ داخل متصفحك.',
      t_passport_t: 'محرر صور جواز السفر', t_passport_d: 'صمّم صور جواز السفر والتأشيرات البيومترية مع إزالة الخلفية بالذكاء الاصطناعي المحلي ودليل المحاذاة والإضاءة وألواح الطباعة 300 DPI.',
      t_thumbnail_t: 'محرر الصور المصغّرة لليوتيوب والسوشيال ميديا', t_thumbnail_d: 'صمّم صوراً مصغّرة احترافية وعالية النقر لليوتيوب والشورتس والسوشيال محلياً بقوالب جاهزة، وإزالة الخلفية بالذكاء الاصطناعي، وطبقات صور متعددة، وخطوط عربية وإنجليزية بارزة، وأشكال وأسهم، ومعاينة حية في واجهة يوتيوب.',
      t_sticker_studio_t: 'استوديو الملصقات والميمز والبطاقات',
      t_sticker_studio_sub: 'صانع الملصقات المقصوصة · صانع الميمز · بطاقات المعايدة واللوحات · شارات المتاجر والعروض',
      t_sticker_studio_d: 'استوديو إبداعي ٤ في ١ محلي: أنشئ ملصقات واتساب والطباعة المقصوصة بالذكاء الاصطناعي، وصمّم الميمز، وبطاقات المعايدة والاقتباس، وشارات المتاجر والعروض داخل متصفحك.',
      t_coloring_t: 'تحويل الصور إلى صفحات تلوين',
      t_coloring_d: 'حوّل أي صورة إلى صفحة تلوين بالأبيض والأسود جاهزة للطباعة محلياً داخل متصفحك مع 4 أنماط خطية وعزل الخلفية بالذكاء الاصطناعي وممحاة تنظيف وعنوان مخصص وتصدير PDF بدقة 300 DPI.',
      t_wallpaper_t: 'مولد الخلفيات والأنماط',
      t_wallpaper_d: 'أنشئ خلفيات مخصصة بدقة 4K وأنماطاً هندسية متكررة محلياً داخل متصفحك عبر 9 محركات إبداعية (تدرجات Aurora، الموجات، الزخارف الإسلامية، المضلعات، باوهاوس، السديم والبوكيه، جبال الغروب، المدينة الليلية، الخطوط الطبوغرافية) مع تمويه زجاجي للصورة ومعاينة شاشة القفل وتصدير PNG وJPG وSVG.',
      t_pfp_t: 'صانع الصور الشخصية للمنصات (PFP)',
      t_pfp_d: 'صمّم صور بروفايل احترافية محلياً مع قص الخلفية بالذكاء الاصطناعي، وفرشاة تنعيم الحواف، و46 خلفية استوديو، و6 أشكال و18 إطاراً بتأثير الخروج ثلاثي الأبعاد 3D، وشارات ونصوص مقوّسة، ومعاينة حية لمنصات التواصل، وتصدير حزمة ZIP.',
      t_mockup_t: 'استوديو موك اب المنتجات والأجهزة',
      t_mockup_d: 'اعرض لقطات شاشة تطبيقاتك ومواقعك وشعاراتك محلياً داخل 33 نموذجاً واقعياً للهواتف واللابتوب والإطارات والكتب والأكواب والملابس وعلب التغليف ولافتات المتاجر مع إزالة خلفية الشعار بالذكاء الاصطناعي و36+ خلفية استوديو وتصدير حتى 3000px.',
      t_collage_t: 'صانع كولاج الصور الذكي',
      t_collage_d: 'رتّب من ٢ إلى ١٢ صورة محلياً عبر 60 تخطيطاً من شبكات Bento والمجلات وأشرطة الفيلم والبولارويد والأشكال الهندسية مع التحريك والتكبير والتبديل داخل كل إطار و42 خلفية استوديو ونصوص عربية/إنجليزية وتصدير PDF بدقة 300 DPI.',
      ai_coloring_t: 'تحويل الصور إلى صفحات تلوين', ai_coloring_d: 'حوّل الصور والرسومات إلى صفحات تلوين خطية بالأبيض والأسود جاهزة للطباعة.',
      ai_wallpaper_t: 'مولد الخلفيات والأنماط', ai_wallpaper_d: 'أنشئ خلفيات مخصصة للهواتف وأجهزة سطح المكتب وأنماطاً متكررة بدقة شاشتك.',
      ai_pfp_t: 'صانع الصور الشخصية للمنصات', ai_pfp_d: 'صمّم صور بروفايل احترافية بقصّ نظيف وإطارات متدرجة وتأطير متوازن.',
      ai_mockup_t: 'مولد موك اب الأجهزة', ai_mockup_d: 'اعرض لقطات شاشة تطبيقك وموقعك داخل إطارات الهواتف والأجهزة اللوحية والحواسيب فوراً.',
      ai_collage_t: 'صانع كولاج الصور الذكي', ai_collage_d: 'رتّب صورك في شبكات متعددة الإطارات مع تحكم مرن بالتباعد والزوايا والخلفيات.',
      biz_qrgen_t: 'مولد رموز QR المخصصة', biz_qrgen_d: 'أنشئ رموز QR بألوانك وشعارك للروابط وWi-Fi وبطاقات الاتصال بصيغ SVG/PNG.',
      biz_whatsapp_t: 'مولد روابط واتساب المباشرة', biz_whatsapp_d: 'أنشئ رابط محادثة واتساب مباشرة مع رسالة جاهزة ورمز QR قابل للمسح.',
      biz_invoice_t: 'مولد الفواتير والإيصالات', biz_invoice_d: 'أنشئ فواتير وإيصالات منظمة مع الضرائب والمجاميع وصدّرها كملف PDF محلياً.',
      txt_fancy_t: 'مولد النصوص المزخرفة', txt_fancy_d: 'حوّل النصوص العادية إلى خطوط يونيكود وزخارف كشيدة عربية أنيقة وأسماء ألعاب ورموز جاهزة للبايو.',
      txt_counter_t: 'عدّاد الكلمات والأحرف', txt_counter_d: 'احسب الكلمات والأحرف والجمل والفقرات ووقت القراءة والإلقاء وحدود المنصات وكثافة الكلمات المفتاحية فوراً في متصفحك.',
      txt_format_t: 'منسّق ومنظّف النصوص', txt_format_d: 'أزل المسافات الزائدة، وأصلح أسطر PDF المقطوعة، وأزل التشكيل العربي، واحذف التكرار، ونظّف وسوم HTML، واستخرج الإيميلات والروابط محلياً.',
      txt_summary_t: 'ملخّص النصوص الذكي', txt_summary_d: 'استخرج أهم النقاط والملخصات المركزة للنصوص الطويلة داخل المتصفح.',
      t_yt_thumb_t: 'جلب وتحميل صور يوتيوب المصغّرة', t_yt_thumb_d: 'استخرج وحمّل الصور المصغّرة الرسمية بجودة MaxRes HD (1280×720) وSD وHQ وMQ من أي رابط فيديو يوتيوب أو Shorts أو بث مباشر بصيغة JPG أو PNG محلياً 100٪.',
      t_video_frame_t: 'استخراج لقطات الفيديو الاحترافي', t_video_frame_d: 'تصفح الفيديو المحلي إطاراً بإطار، والتقط لقطات متتابعة ذكية، وصدّر صوراً بالدقة الأصلية بصيغ PNG وJPG وWebP أو حزمة .ZIP محلياً 100٪.',
      media_v2a_t: 'استخراج الصوت من الفيديو', media_v2a_d: 'استخرج مقاطع الصوت الصافية بصيغة MP3 أو WAV من ملفات الفيديو MP4 وWebM وMOV محلياً داخل متصفحك بدون رفع.',
      med_yt_t: 'جلب وتحميل صور يوتيوب المصغّرة', med_yt_d: 'اعرض وحمّل الصور المصغّرة بجودة HD وMaxRes من أي رابط فيديو يوتيوب.',
      med_frame_t: 'استخراج لقطات الفيديو الاحترافي', med_frame_d: 'تصفح الفيديو إطاراً بإطار واحفظ لقطات عالية الدقة بصيغة PNG/JPG.',
      med_audio_t: 'قص وتحسين الصوتيات', med_audio_d: 'قص المقاطع الصوتية وموازنة الصوت وتحويلها محلياً بين صيغ WAV وصيغ المتصفح القياسية.',
      pdf_merge_t: 'دمج وتقسيم ملفات PDF', pdf_merge_d: 'ادمج عدة ملفات PDF أو استخرج وأعد ترتيب الصفحات محلياً 100٪ دون رفع.',
      pdf_convert_t: 'محوّل الصور وملفات PDF', pdf_convert_d: 'حوّل صفحات PDF إلى صور أو اجمع صورك في مستند PDF منظم.',
      pdf_esign_t: 'التوقيع الإلكتروني لملفات PDF', pdf_esign_d: 'ارسم توقيعك أو ارفعه وأضفه إلى صفحات PDF مباشرة داخل متصفحك.',
      util_pass_t: 'مولد كلمات المرور القوية', util_pass_d: 'أنشئ كلمات مرور عشوائية آمنة وقابلة للتخصيص عبر Web Crypto API.',
      util_pomo_t: 'مؤقت بومودورو للتركيز', util_pomo_d: 'نظّم جلسات عملك وفترات الراحة بمؤقت مرن وتنبيهات محلية هادئة.',
      open_tool: 'افتح الأداة',
      no_tools: 'لا توجد أدوات مطابقة لبحثك.',
      workflow_badge: 'كيف يعمل', workflow_title: 'ثلاث خطوات بسيطة',
      step1_t: 'اختر أداة', step1_d: 'تصفح الأقسام الستة واختر أداة الصور أو قارئ QR أو المحرر المتقدم.',
      step2_t: 'أفلت ملفك', step2_d: 'اسحب وأفلت أو تصفح — صورتك تبقى على جهازك، لا يتم رفعها.',
      step3_t: 'حمّل النتيجة', step3_d: 'عالج فوراً وحمّل النتيجة. بدون انتظار، بدون حسابات.',
      features_badge: 'لماذا imgsfix', features_title: 'مبني للخصوصية والسرعة',
      f1_t: 'خصوصية 100%', f1_d: 'الملفات لا تغادر متصفحك. لا رفع، لا خوادم.',
      f2_t: 'سريع كالبرق', f2_d: 'معالجة فورية بواسطة Canvas API. لا طوابير.',
      f3_t: 'مجاني للأبد', f3_d: 'لا اشتراكات، لا تكاليف خفية، لا تسجيل مطلوب.',
      f4_t: 'ثنائي اللغة', f4_d: 'دعم كامل للعربية والإنجليزية مع تخطيط RTL.',
      cta_title: 'جاهز لإصلاح صورك؟', cta_desc: 'ابدأ باستخدام imgsfix الآن — بدون تنزيل، بدون حسابات، فقط افتح واعمل.',
      cta_go: 'شغّل الأدوات', cta_editor: 'افتح المحرر',
      footer_about: 'imgsfix أداة صور تركز على الخصوصية وتعمل بالمتصفح 100%. كل شيء يحدث في متصفحك — لا رفع، لا خوادم، لا تتبع.',
      footer_company: 'الشركة', footer_tools_h: 'الأدوات', footer_resources: 'موارد',
      footer_privacy: 'سياسة الخصوصية', footer_terms: 'شروط الاستخدام', footer_cookies: 'سياسة الكوكيز', footer_disclaimer: 'إخلاء المسؤولية',
      footer_rights: 'جميع الحقوق محفوظة.', footer_made: 'صُنع بعناية من أجل الخصوصية.',
      scroll_top: 'العودة للأعلى',
      modal_confirm: 'تأكيد', modal_cancel: 'إلغاء',
      tc_drop: 'أفلت صورتك هنا أو انقر للتصفح', tc_browse: 'تصفح الملفات', tc_supported: 'JPG · PNG · WebP · GIF · BMP',
      tc_download: 'تحميل', tc_reset: 'إعادة', tc_clear: 'مسح', tc_processing: 'جارٍ المعالجة…', tc_done: 'تم!',
      tc_original: 'قبل', tc_result: 'بعد', tc_size: 'الحجم', tc_quality: 'الجودة',
      page_about: 'حول', page_services: 'الخدمات', page_contact: 'اتصل', page_faq: 'الأسئلة',
      page_privacy: 'سياسة الخصوصية', page_terms: 'الشروط', page_cookies: 'الكوكيز', page_disclaimer: 'إخلاء المسؤولية',
      page_404: 'الصفحة غير موجودة', go_home: 'الذهاب للرئيسية',
      bc_home: 'الرئيسية',
      t_upload: 'رفع صورة',
      tc_compress_settings: 'إعدادات الضغط', tc_max_width: 'أقصى عرض (بكسل)', tc_before: 'قبل', tc_after: 'بعد', tc_saved: 'الموفّر',
      tc_presets: 'الإعدادات المسبقة', tc_preset_hq: 'جودة عالية', tc_preset_balanced: 'متوازن', tc_preset_ultra: 'أصغر حجم', tc_recommended: 'موصى به',
      tc_target_size: 'الحجم المستهدف (كيلوبايت) — اختياري', tc_target_size_ph: 'مثال: 200',
      tc_already_opt: 'محسّنة مسبقاً — تم الإبقاء على الحجم الأصلي (0% زيادة)',
      tc_target_reached: 'تم الوصول للحجم المستهدف', tc_target_closest: 'تم الوصول لأصغر حجم ممكن',
      tc_png_fallback: 'تم الحفظ بصيغة PNG لحجم أصغر',
      tc_compress_bomb: 'أبعاد الصورة كبيرة جداً (الحد الأقصى 16,384 بكسل / 64 ميجابكسل)',
      tc_load_first: 'قم برفع صورة أولاً', tc_file_too_large: 'حجم الملف كبير جداً (الحد الأقصى 50 ميجابايت)',
      tc_img_only: 'يرجى اختيار ملف صورة مدعوم فقط', tc_img_load_err: 'تعذر تحميل الصورة', tc_compress_err: 'تعذر ضغط الصورة',
      tc_resize_settings: 'إعدادات تغيير الأبعاد', tc_width_px: 'العرض (بكسل)', tc_height_px: 'الارتفاع (بكسل)', tc_lock_ar: 'قفل نسبة الأبعاد', tc_apply: 'تطبيق',
      tc_resize_by_pixels: 'بالبكسل (px)', tc_resize_by_percent: 'بالنسبة المئوية (%)',
      tc_resize_presets: 'مقاسات السوشيال ميديا والويب',
      tc_preset_ig_post: 'منشور إنستغرام', tc_preset_story: 'ستوري / تيك توك', tc_preset_yt_thumb: 'صورة يوتيوب المصغّرة', tc_preset_fhd: 'دقة Full HD', tc_preset_fb_cover: 'غلاف فيسبوك',
      tc_percent_scale: 'نسبة التغيير', tc_percent_result: 'الأبعاد الناتجة',
      tc_no_enlarge: 'تجنب التكبير إذا كانت الصورة أصغر',
      tc_resize_orig_label: 'الأصلية', tc_resize_new_label: 'الجديدة',
      tc_resize_invalid: 'أدخل أبعاداً صالحة (1–16384 بكسل)', tc_resize_export_err: 'تعذّر تصدير الصورة بعد تغيير الأبعاد',
      tc_convert_settings: 'إعدادات التحويل', tc_format: 'الصيغة',
      tc_fmt_jpg_badge: 'حجم صغير', tc_fmt_png_badge: 'يدعم الشفافية', tc_fmt_webp_badge: 'حديث للويب',
      tc_fmt_avif_badge: 'الجيل الجديد', tc_fmt_ico_badge: 'أيقونة موقع', tc_fmt_pdf_badge: 'مستند', tc_fmt_bmp_badge: 'خريطة نقطية',
      tc_convert_smart_png: 'ضغط PNG ذكي (لمنع تضخم الحجم)',
      tc_convert_bg_fill: 'تعبئة الخلفية الشفافة', tc_convert_bg_white: 'أبيض', tc_convert_bg_black: 'أسود', tc_convert_bg_custom: 'لون مخصص',
      tc_convert_ico_size: 'مقاس أيقونة Favicon', tc_convert_ico_multi: 'متعدد المقاسات (16 / 32 / 48 px)',
      tc_convert_avif_unsupported: 'تشفير AVIF غير مدعوم في هذا المتصفح — يرجى اختيار WebP أو JPG.',
      tc_convert_orig: 'الأصلية', tc_convert_out: 'المحوّلة', tc_convert_err: 'تعذّر تحويل الصورة',
      tc_crop_settings: 'إعدادات القص', tc_free: 'حر',
      tc_aspect_ratio: 'نسبة الأبعاد', tc_ratio_portrait: '4:5', tc_ratio_cover: '1.91:1',
      tc_circle_crop: 'قص دائري / صورة شخصية', tc_custom_crop_size: 'أبعاد القص المخصصة (بكسل)',
      tc_transform: 'التحويل والتدوير', tc_rotate_left: 'تدوير -90°', tc_rotate_right: 'تدوير +90°',
      tc_flip_h: 'قلب أفقي', tc_flip_v: 'قلب عمودي', tc_straighten: 'ضبط الاستقامة', tc_reset_angle: '0°',
      tc_selection_size: 'التحديد', tc_crop_hint: 'اسحب المقابض أو الحواف لتحديد منطقة القص',
      tc_crop_fail: 'تعذر قص الصورة. يرجى المحاولة مرة أخرى.', tc_make_selection: 'حدد منطقة للقص أولاً',
      tc_redo: 'إعادة', tc_undo_tip: 'تراجع (Ctrl+Z)', tc_redo_tip: 'إعادة (Ctrl+Y)',
      tc_open_editor: 'فتح في المحرر المتقدم', tc_transfer_err: 'تعذر نقل الصورة إلى المحرر',
      tc_crop_again: 'قص مرة أخرى',
      tc_open_editor_tip: 'أضف نصوصاً، أشكالاً، أسهماً، وفلاتر احترافية في المحرر المتقدم',
      tc_open_editor_hint: 'تريد إضافة نص أو سهم أو شكل؟ اضغط على "فتح في المحرر" بالأعلى.',
      tc_crop_shortcuts_hint: 'اختصارات: Ctrl+Z تراجع · Ctrl+Y إعادة · الأسهم تحريك · Enter تطبيق · Esc إعادة التحديد',
      tc_editor_bridge_hint: 'تريد إضافة نصوص، أسهم، أشكال، ملصقات، أو تعديلات متعددة الطبقات؟',
      tc_editor_bridge_btn: 'افتح في المحرر المتقدم ←',
      tc_removebg_settings: 'إعدادات إزالة الخلفية', tc_output_bg: 'خلفية المخرج', tc_transparent: 'شفاف', tc_white: 'أبيض', tc_custom_color: 'لون مخصص',
      tc_removebg_auto_btn: 'إزالة الخلفية تلقائياً',
      tc_removebg_hint: 'معالجة محلية بالذكاء الاصطناعي بخصوصية 100٪ داخل متصفحك — بدون رفع أي ملفات.',
      tc_removebg_scanning: 'جاري إزالة الخلفية... (قد تستغرق ثوانٍ قليلة في المرة الأولى)',
      tc_brush_restore: 'فرشاة الاستعادة',
      tc_brush_erase: 'فرشاة المسح',
      tc_brush_size: 'حجم الفرشاة',
      tc_undo: 'تراجع',
      tc_peek_original: 'معاينة الأصل',
      tc_removebg_load_first: 'قم برفع صورة أولاً',
      tc_removebg_fail: 'تعذرت إزالة الخلفية. يرجى المحاولة مرة أخرى.',
      tc_removebg_file_large: 'حجم الملف كبير جداً (الحد الأقصى 50 ميجابايت)',
      tc_removebg_img_only: 'يرجى اختيار ملف صورة مدعوم فقط',
      tc_removebg_img_err: 'تعذر تحميل الصورة',
      tc_removebg_nothing: 'لا توجد صورة للتحميل',
      tc_removebg_export_err: 'تعذر تصدير الصورة',
      tc_cartoon_settings: 'إعدادات التحويل إلى كرتون', tc_cartoon_styles: 'أنماط الكرتون والرسم',
      tc_edge_intensity: 'شدّة الحواف', tc_detail_intensity: 'شدّة الخطوط / التفاصيل', tc_effect_strength: 'قوة التأثير', tc_color_levels: 'مستويات الألوان', tc_smoothness: 'النعومة',
      tc_cs_classic: 'كرتون ثنائي الأبعاد', tc_cs_anime: 'توهّج الأنمي', tc_cs_comic: 'كوميكس بنقاط', tc_cs_soft_toon: 'كرتون 3D ناعم',
      tc_cs_pencil: 'رسم بالرصاص', tc_cs_color_pencil: 'ألوان خشبية', tc_cs_ink_pen: 'حبر وقلم', tc_cs_watercolor: 'ألوان مائية',
      tc_cs_oil_paint: 'رسم زيتي', tc_cs_pop_art: 'فن البوب', tc_cs_neon_toon: 'خطوط نيون', tc_cs_pixel_art: 'بكسل آرت 8-بت',
      tc_enhance_settings: 'إعدادات التحسين', tc_brightness: 'السطوع', tc_contrast: 'التباين', tc_saturation: 'التشبّع', tc_sharpness: 'الحدة',
      tc_auto_enhance: 'تحسين تلقائي ذكي', tc_enhance_modes: 'أوضاع التحسين الذكية',
      tc_mode_auto: 'توازن تلقائي', tc_mode_clarity: 'وضوح فائق HD', tc_mode_portrait: 'إشراقة البورتريه', tc_mode_lowlight: 'إصلاح الإضاءة الضعيفة', tc_mode_old_photo: 'وضوح الصور القديمة',
      tc_vibrance: 'الحيوية والتشبّع', tc_clarity: 'الوضوح والحدة', tc_denoise: 'إزالة الضجيج',
      tc_auto_applied: 'تم تطبيق التحسين التلقائي الذكي', tc_enhance_export_err: 'تعذّر تصدير الصورة المحسّنة',
      tc_filters_settings: 'فلاتر الصور المسبقة', tc_filter_adjustments: 'ضبط الألوان والإضاءة',
      tc_intensity: 'شدة الفلتر', tc_vignette: 'تظليل الحواف (Vignette)', tc_no_filter: 'بلا فلتر / إعادة الضبط',
      tc_fp_original: 'أصلي', tc_fp_grayscale: 'أبيض وأسود', tc_fp_sepia: 'سيبيا', tc_fp_vintage: 'كلاسيكي',
      tc_fp_cool: 'بارد', tc_fp_warm: 'دافئ', tc_fp_vivid: 'زاهي', tc_fp_noir: 'سينمائي داكن',
      tc_fp_faded: 'باهت', tc_fp_invert: 'عكس الألوان', tc_fp_blur: 'ضبابي', tc_fp_sharpen: 'حاد',
      tc_fp_golden_hour: 'الساعة الذهبية', tc_fp_teal_orange: 'تيل وبرتقالي', tc_fp_dramatic: 'درامي',
      tc_fp_soft_pastel: 'باستيل ناعم', tc_fp_retro_film: 'فيلم ريترو', tc_fp_bright_airy: 'مشرق ناعم',
      preview_bg_toolbar: 'تغيير لون خلفية المعاينة',
      preview_bg_studio: 'الخلفية الافتراضية',
      preview_bg_white: 'خلفية بيضاء',
      preview_bg_dark: 'خلفية داكنة',
      preview_bg_checker: 'خلفية الشفافية',
      preview_bg_custom: 'اختيار لون مخصص',
      qr_camera: 'الكاميرا', qr_image_file: 'ملف صورة', qr_start_cam: 'تشغيل الكاميرا', qr_stop: 'إيقاف',
      qr_drop: 'أفلِت صورة تحتوي على رمز QR/باركود أو انقر للتصفح', qr_detected: 'تم اكتشاف: ', qr_copy: 'نسخ', qr_open_url: 'فتح الرابط', qr_clear: 'مسح',
      qr_scan_desc: 'امسح رموز QR والباركود من كاميرتك أو ملفات الصور — كله محلياً في متصفحك.',
      ts_audience_label: 'وضع الجمهور',
      ts_mode_study: 'ملاحظات دراسية', ts_mode_executive: 'ملخص تنفيذي', ts_mode_article: 'ملخص مقال', ts_mode_bullets: 'نقاط سريعة',
      ts_ratio_label: 'طول الملخص',
      ts_ratio_25: 'موجز (25%)', ts_ratio_40: 'متوازن (40%)', ts_ratio_60: 'مفصّل (60%)',
      ts_btn_summarize: 'تلخيص الآن',
      ts_input_title: 'النص الأصلي', ts_output_title: 'الملخص وأهم النقاط',
      ts_btn_paste: 'لصق', ts_btn_sample: 'نص تجريبي', ts_btn_upload: 'رفع ملف نصي', ts_btn_select_all: 'تحديد الكل',
      ts_word_pdf_hint: 'لديك ملف Word أو PDF؟ انسخ النص من المستند والصقه مباشرة في المربع بالأسفل.',
      ts_input_ph: 'الصق أو اكتب المقال أو الدرس أو التقرير هنا (بالعربية أو الإنجليزية)…',
      ts_words: 'الكلمات', ts_chars: 'الأحرف', ts_sentences: 'الجمل',
      ts_file_hint: '.txt · .md · .csv (الحد الأقصى 5MB)',
      ts_btn_copy: 'نسخ', ts_btn_listen: 'استماع', ts_btn_stop: 'إيقاف القراءة',
      ts_btn_word: 'Word (.doc)', ts_btn_pdf: 'طباعة / PDF', ts_btn_txt: 'TXT',
      ts_empty_hint: 'أدخل أو الصق النص على اليمين، اختر الوضع المناسب، ثم اضغط «تلخيص الآن».',
      ts_key_terms: 'المصطلحات والمفاهيم الأساسية',
      ts_orig_words: 'الأصل', ts_sum_words: 'الملخص', ts_reduction: 'الاختصار',
      ts_print_title: 'معاينة الطباعة / حفظ PDF', ts_btn_print_now: 'طباعة / حفظ PDF',
      ts_enter_text_first: 'يُرجى إدخال أو لصق نص أولاً',
      ts_text_too_long: 'النص يتجاوز الحد الأقصى المسموح (500,000 حرف)',
      ts_clipboard_empty: 'الحافظة فارغة', ts_pasted_ok: 'تم لصق النص',
      ts_paste_fallback: 'تم تفريغ المربع — اضغط Ctrl+V (أو اختر لصق) لإدخال نصك',
      ts_file_type_err: 'يرجى اختيار ملف بصيغة .txt أو .md أو .csv',
      ts_file_size_err: 'حجم الملف كبير جداً (الحد الأقصى 5 ميجابايت)',
      ts_file_empty_err: 'الملف المحدد فارغ', ts_file_loaded_ok: 'تم تحميل الملف محلياً', ts_file_read_err: 'تعذر قراءة الملف',
      ts_copied_ok: 'تم نسخ الملخص إلى الحافظة', ts_copy_err: 'تعذر نسخ النص',
      ts_tts_unsupported: 'القراءة الصوتية غير مدعومة في هذا المتصفح',
      ts_no_ar_voice: 'لا تتوفر حزمة نطق باللغة العربية في متصفحك أو نظام التشغيل حالياً.',
      wc_chars_with: 'الأحرف مع المسافات',
      wc_chars_no: 'الأحرف بدون مسافات',
      wc_paragraphs: 'الفقرات',
      wc_read_time: 'وقت القراءة',
      wc_speak_time: 'وقت الإلقاء الصوتي',
      wc_input_title: 'النص الخاص بك',
      wc_copy_report: 'نسخ تقرير الإحصائيات',
      wc_btn_upload: 'رفع ملف .txt / .md',
      wc_btn_copy_text: 'نسخ النص',
      wc_input_ph: 'اكتب أو الصق المقال أو المنشور أو الوصف التعريفي هنا (بالعربية أو الإنجليزية)…',
      wc_speed_note: '200 كلمة/دقيقة للقراءة · 130 كلمة/دقيقة للإلقاء · 100٪ محلي',
      wc_file_hint: '.txt · .md (الحد الأقصى 5MB)',
      wc_limits_title: 'حدود السوشيال ميديا وSEO',
      wc_limit_meta: 'وصف ميتا جوجل (Meta)',
      wc_limit_x: 'منشور X / تويتر',
      wc_limit_ig: 'تعليق إنستغرام',
      wc_status_empty: 'فارغ',
      wc_status_ok: 'ضمن الحد',
      wc_status_near: 'قريب من الحد',
      wc_status_over: 'تجاوز الحد',
      wc_kw_title: 'كثافة الكلمات المفتاحية الأكثر تكراراً',
      wc_ngram_1: 'كلمة واحدة',
      wc_ngram_2: 'عبارة من كلمتين',
      wc_kw_empty: 'ابدأ الكتابة أو الصق نصاً لتحليل أبرز الكلمات المفتاحية وكثافتها.',
      wc_kw_none: 'لم يتم العثور على كلمات مفتاحية كافية بعد — أدخل المزيد من النص.',
      wc_col_keyword: 'الكلمة / العبارة',
      wc_col_count: 'التكرار',
      wc_col_density: 'الكثافة %',
      wc_file_type_err: 'يرجى اختيار ملف بصيغة .txt أو .md فقط',
      wc_copied_text_ok: 'تم نسخ النص إلى الحافظة',
      wc_report_copied_ok: 'تم نسخ تقرير الإحصائيات إلى الحافظة',
      tf_editor_title: 'مساحة النص',
      tf_instant_note: 'محلي 100٪ · تنظيف فوري',
      tf_btn_copy: 'نسخ النتيجة',
      tf_btn_download_txt: 'تحميل .txt',
      tf_input_ph: 'الصق النصوص غير المنسقة أو فقرات PDF أو أكواد HTML أو القوائم هنا (بالعربية أو الإنجليزية)…',
      tf_lines: 'الأسطر',
      tf_group_a: 'التنظيف الأساسي (عربي وإنجليزي)',
      tf_act_pdf: 'إصلاح الأسطر المقطوعة من PDF',
      tf_act_spaces: 'إزالة المسافات الزائدة',
      tf_act_empty: 'حذف الأسطر الفارغة',
      tf_act_dedupe: 'حذف السطور المكررة',
      tf_act_tashkeel: 'إزالة التشكيل العربي',
      tf_act_html: 'إزالة وسوم HTML',
      tf_group_b: 'حالة الأحرف والقوائم والاستخراج الذكي',
      tf_act_sort: 'ترتيب السطور أبجدياً',
      tf_act_reverse: 'عكس ترتيب السطور',
      tf_act_number: 'ترقيم السطور 1, 2, 3',
      tf_act_emails: 'استخراج الإيميلات',
      tf_act_urls: 'استخراج الروابط',
      tf_applied_ok: 'تم تنسيق النص وتنظيفه بنجاح',
      tf_extracted_ok: 'تم استخراج العناصر بنجاح',
      tf_no_changes: 'النص نظيف بالفعل لهذا الإجراء',
      tf_undone_ok: 'تم التراجع عن آخر خطوة تنسيق',
      tf_no_emails: 'لم يتم العثور على عناوين بريد إلكتروني في النص',
      tf_no_urls: 'لم يتم العثور على روابط ويب في النص',
      td_btn_compare: 'مقارنة النصين',
      td_btn_swap: 'تبديل النصين',
      td_btn_sample: 'نص تجريبي',
      td_btn_clear_both: 'مسح الكل',
      td_mode_word: 'كلمة بكلمة',
      td_mode_line: 'سطراً بسطر',
      td_opt_ignore_ws: 'تجاهل المسافات الزائدة',
      td_opt_ignore_case: 'تجاهل حالة الأحرف (EN)',
      td_orig_title: 'النص الأصلي',
      td_mod_title: 'النص المعدّل',
      td_orig_ph: 'الصق أو اكتب النص الأصلي هنا (بالعربية أو الإنجليزية)…',
      td_mod_ph: 'الصق أو اكتب النص المعدّل هنا (بالعربية أو الإنجليزية)…',
      td_diff_title: 'نتيجة المقارنة',
      td_copy_report: 'نسخ تقرير الفروقات',
      td_stat_additions: 'إضافات',
      td_stat_deletions: 'حذوفات',
      td_stat_unchanged: 'دون تغيير',
      td_identical: 'النصّان متطابقان 100٪!',
      td_empty_hint: 'أدخل أو الصق النصين أعلاه ثم اضغط «مقارنة النصين» (أو Ctrl+Enter) لعرض الفروقات.',
      td_enter_both: 'يُرجى إدخال نص في أحد المربعين على الأقل للمقارنة',
      td_swapped_ok: 'تم تبديل النص الأصلي والنص المعدّل',
      td_report_copied_ok: 'تم نسخ تقرير الفروقات إلى الحافظة',
      ft_input_title: 'النص أو الاسم المراد زخرفته',
      ft_input_ph: 'اكتب أي اسم أو عبارة بالعربية أو الإنجليزية هنا…',
      ft_frame_label: 'إطار زخرفي سريع (بداية ونهاية)',
      ft_frame_none: 'بدون إطار',
      ft_more_plus: 'المزيد +',
      ft_prev: 'السابق',
      ft_next: 'التالي',
      ft_tab_all: 'الكل',
      ft_tab_social: 'سوشيال ميديا وبايو',
      ft_tab_arabic: 'زخرفة عربية وخطوط',
      ft_tab_gaming: 'ألعاب وكلانات',
      ft_tab_favs: 'المفضلة',
      ft_styles_unit: 'نمطاً',
      ft_copied_btn: 'تم النسخ ✓',
      ft_copied_ok: 'تم نسخ النص المزخرف إلى الحافظة',
      ft_favs_empty: 'لم تقم بحفظ أي زخارف في المفضلة بعد. اضغط على ★ في أي بطاقة لتثبيتها هنا.',
      ft_toggle_fav: 'إضافة أو إزالة من المفضلة',
      ft_sym_title: 'استوديو الرموز والإيموجي السريع',
      ft_sym_hint: 'انقر على أي رمز لإدراجه عند المؤشر ونسخه مباشرة للحافظة.',
      ft_sym_mode_copy: 'نسخ عند النقر',
      ft_sym_mode_append: 'إضافة إلى النص',
      ft_sym_faces: 'وجوه وتعابير',
      ft_sym_hands: 'أيدي وتفاعل',
      ft_sym_stars: 'نجوم وبريق',
      ft_sym_brackets: 'أقواس وفواصل',
      ft_sym_gaming: 'شارات وألعاب احترافية',
      ft_sym_nature: 'ملكي وطبيعة واحتفال',
      ft_sym_minimal: 'إيموجي ورموز هادئة',
      ft_sym_hearts: 'قلوب وعلامات',
      ft_sym_arrows: 'أسهم وعلامات',
      ft_sym_copied_ok: 'تم نسخ الرمز إلى الحافظة',
      ft_sym_appended_ok: 'تمت إضافة الرمز إلى نصك',
      ft_sym_inserted_copied: 'تم إدراج الرمز ونسخه للحافظة',
      about_intro: 'imgsfix هي مجموعة أدوات صور تركز على الخصوصية وتعمل بالكامل داخل متصفحك — لا رفع، لا خوادم، لا تتبع.',
      about_mission: 'مهمتنا',
      about_mission_p1: 'وُجد imgsfix لسبب بسيط: ينبغي أن تكون قادراً على إصلاح صورك وتحويلها وتعديلها دون تسليمها إلى خادم غريب. كل يوم، يرفع ملايين الأشخاص صوراً شخصية ومستندات عمل ومرئيات حساسة إلى أدوات عبر الإنترنت تنسخها وتخزّنها وأحياناً تحللها بصمت. بنينا imgsfix لكسر هذا النمط.',
      about_mission_p2: 'مهمتنا هي تقديم مجموعة أدوات صور كاملة ومستوى احترافي لا ترسل بايتاً واحداً من ملفاتك إلى أي مكان. كل شيء — الضغط، تغيير الحجم، تحويل الصيغ، القص، إزالة الخلفية، التحويل إلى كرتون، التحسين، فلاتر الصور، مسح QR، والتحرير الكامل — يحدث داخل متصفحك، على جهازك الخاص، باستخدام قدرة المعالجة التي تملكها أصلاً.',
      about_mission_p3: 'نؤمن أن الخصوصية ليست ميزة مدفوعة أو شعاراً تسويقياً. إنها الحد الأدنى. أداة تحترم بياناتك لا ينبغي أن تعد بعدم إساءة استخدامها — بل ينبغي ألا تجمعها أصلاً. هذا هو المعيار الذي بُني imgsfix عليه.',
      about_how: 'كيف يعمل', about_team: 'فلسفة فريقنا', about_tech: 'التقنية التي نستخدمها',
      about_free: 'التزامنا بالوصول المجاني', about_values: 'قيمنا في الخصوصية',
      services_intro: 'ثلاثة أركان لمعالجة الصور المجانية التي تركز على الخصوصية — كلها تعمل بنسبة 100٪ في متصفحك.',
      services_p1: 'نُظّم imgsfix حول ثلاثة أركان متكاملة. تغطي معاً النطاق الكامل لمهام الصور اليومية — من تغيير حجم سريع إلى تصميم متعدد الطبقات — دون أن تتطلب منك أبداً رفع ملف أو إنشاء حساب. فيما يلي نظرة مفصلة على كل ركن والأدوات داخله.',
      svc_tools_title: '🔧 أدوات الصور', svc_qr_title: '📷 قارئ QR والباركود', svc_editor_title: '🎨 المحرر المتقدم',
      svc_editor_key: 'القدرات الرئيسية', svc_tie_title: 'ما يربطها معاً',
      faq_intro: 'أسئلة شائعة حول imgsfix — كيف يعمل، الخصوصية، الصيغ المدعومة، والمزيد.',
      faq_a1: 'imgsfix مجموعة أدوات صور مجانية تركز على الخصوصية وتعمل بالكامل داخل متصفحك. تقدم ثماني أدوات صور (ضغط، تغيير حجم، تحويل، قص، إزالة خلفية، تحويل إلى كرتون، تحسين، وفلاتر الصور)، وقارئ QR والباركود، ومحرر متقدم كامل الميزات. كل عملية تتم محلياً على جهازك باستخدام HTML5 Canvas و JavaScript — لا يُرفع أي ملف إلى خادم أبداً.',
      faq_not_found: 'لم تجد ما تبحث عنه؟', faq_contact: 'تواصل معنا', faq_view_services: 'عرض الخدمات',
      privacy_intro: 'خصوصيتك ليست ميزة — بل هي الأساس. تشرح هذه السياسة بالضبط ما يفعله imgsfix وما لا يفعله ببياناتك.',
      privacy_last_updated: 'آخر تحديث: يوليو 2026',
      terms_intro: 'الشروط والأحكام التي تحكم استخدامك لـ imgsfix. يُرجى قراءتها بعناية.',
      page_terms_full: 'شروط الاستخدام',
      page_cookies_full: 'سياسة الكوكيز', cookies_intro: 'الخبر السار: imgsfix لا يستخدم كوكيز تتبع. إليك بالضبط ما نخزّنه وما لا نخزّنه على جهازك.',
      disclaimer_intro: 'معلومات مهمة عن طبيعة imgsfix وحدود ما يقدمه.',
      disclaimer_last_updated: 'آخر تحديث: يوليو 2026',
      err404_title: 'عذراً! ضاعت هذه الصفحة',
      err404_desc: 'قد تكون الصفحة التي تبحث عنها قد نُقلت أو أُعيدت تسميتها أو لم تكن موجودة أصلاً. لكن لا تقلق — صورك في أمان، وأدواتنا على بُعد نقرة واحدة.',
      contact_intro: 'هل لديك ملاحظات أو طلب ميزة أو سؤال؟ نحب أن نسمع منك.',
      contact_desc: 'سواء وجدت خطأً أو لديك فكرة لأداة جديدة أو تريد فقط قول مرحباً، فهذا هو المكان. املأ النموذج أدناه وسنعود إليك في أقرب وقت ممكن.',
      contact_name: 'الاسم', contact_name_ph: 'اسمك',
      contact_email: 'البريد الإلكتروني', contact_email_ph: 'you@example.com',
      contact_subject: 'الموضوع', contact_subject_ph: 'ما الموضوع؟',
      contact_message: 'الرسالة', contact_message_ph: 'أخبرنا بما يدور في ذهنك…',
      contact_send: 'إرسال الرسالة',
      contact_before_title: 'قبل أن تكتب…', contact_before_desc: 'قد تجد إجابة سريعة في إحدى هذه الصفحات. لقد جمعنا محتوى مفصلاً يغطي الأسئلة الأكثر شيوعاً:',
      contact_link_faq: 'إجابات لأسئلة حول كيفية عمل imgsfix، الخصوصية، الصيغ المدعومة، المتصفحات، الاستخدام دون اتصال، والمزيد.',
      contact_link_about: 'مهمتنا، كيف تعمل الأدوات، فلسفة فريقنا، والتقنية وراء imgsfix.',
      contact_link_services: 'نظرة شاملة على الأركان الثلاثة: أدوات الصور، قارئ QR، والمحرر المتقدم.',
      contact_link_privacy: 'شرح مفصل لنهجنا في عدم جمع البيانات.',
      contact_link_terms: 'الشروط التي تحكم استخدامك لـ imgsfix.',
      contact_include_title: 'ماذا تتضمّن', contact_include_desc: 'لمساعدتنا في الرد بسرعة وفائدة، يُرجى تضمين أكبر قدر ممكن مما يلي:',
      contact_include_1: 'اسم الأداة أو الصفحة التي واجهت فيها المشكلة.',
      contact_include_2: 'متصفحك ونظام التشغيل (مثلاً: Chrome 120 على Windows، Safari على iPhone).',
      contact_include_3: 'صيغة الصورة وحجم الملف التقريبي، إذا كان سؤالك يتعلق بملف محدد.',
      contact_include_4: 'خطوات إعادة إنتاج أي خطأ تبلغ عنه.',
      contact_include_5: 'وصف ما توقعته مقابل ما حدث فعلاً.',
      contact_include_6: 'طلبات الميزات مرحب بها دائماً. إذا كانت هناك أداة صور تتمنى وجودها في imgsfix، أخبرنا عنها — نعطي الأولوية للإضافات التي تخدم أكبر عدد من المستخدمين مع التزامنا ببنية الخصوصية أولاً.',
      editor_desc: 'محرر canvas كامل الميزات بأشكال ونصوص وطبقات وإعدادات مسبقة وتراجع/إعادة — كله في متصفحك.',
      ed_undo: '↶ تراجع', ed_redo: '↷ إعادة', ed_duplicate: '⎘ تكرار', ed_delete: '✕ حذف',
      ed_front: '⬆ للأمام', ed_forward: '↑ خطوة أمام', ed_backward: '↓ خطوة خلف', ed_back: '⬇ للخلف',
      ed_export: '📥 تصدير', ed_save: '💾 حفظ', ed_save_file: '⬇ حفظ ملف', ed_new_project: '✨ مشروع جديد', ed_clear: '🗑 مسح',
      ed_presets: 'إعدادات مسبقة', ed_width: 'العرض', ed_height: 'الارتفاع', ed_custom_size: 'تطبيق', ed_a4_print: 'طباعة A4‏ 2480×3508', ed_canvas_size: 'اللوحة',
      ed_tools: 'الأدوات', ed_select: 'تحديد', ed_brush: 'فرشاة', ed_text: 'نص',
      ed_rect: 'مستطيل', ed_circle: 'دائرة', ed_triangle: 'مثلث', ed_line: 'خط', ed_arrow: 'سهم', ed_upload_short: 'رفع',
      ed_brush_settings: 'الفرشاة', ed_color: 'اللون',
      ed_properties: 'الخصائص', ed_fill: 'تعبئة',
      ed_stroke: 'إطار', ed_stroke_width: 'السمك:', ed_text_align: 'محاذاة',
      ed_align_artboard: 'اللوحة', ed_align_multi: 'محاذاة التحديد',
      ed_font_family_label: 'الخط:', ed_fonts_ar: 'خطوط عربية', ed_fonts_en: 'خطوط إنجليزية',
      ed_text_label: 'النص', ed_align_left: 'يسار', ed_align_center: 'وسط', ed_align_right: 'يمين',
      ed_zoom: 'التكبير', ed_fit: 'ملاءمة', ed_background: 'الخلفية', ed_layers: 'الطبقات', ed_no_layers: 'لا توجد طبقات بعد',
      ed_layer_hide: 'إخفاء الطبقة', ed_layer_show: 'إظهار الطبقة', ed_layer_lock: 'قفل الطبقة', ed_layer_unlock: 'إلغاء قفل الطبقة', ed_layer_delete: 'حذف الطبقة', ed_layer_select: 'تحديد الطبقة',
      ed_shortcuts: 'اختصارات', ed_sc_btn: '⌨ الاختصارات',
      ed_sc_del: 'حذف العنصر المحدد', ed_sc_sel_all: 'تحديد جميع العناصر', ed_sc_multi: 'تحديد متعدد للعناصر',
      ed_sc_nudge: 'تحريك 1 بكسل / 10 بكسل', ed_sc_pan: 'تحريك مساحة العمل', ed_sc_wheel: 'عجلة الفأرة للتكبير عند المؤشر',
      ed_sc_copy_paste: 'نسخ / لصق العنصر', ed_sc_group: 'تجميع / فك التجميع', ed_sc_deselect: 'إلغاء التحديد / الخروج',
      ed_sc_undo: 'تراجع', ed_sc_redo: 'إعادة', ed_sc_dup: 'تكرار العنصر', ed_sc_save: 'حفظ في المتصفح',
      ed_sc_key_del: 'Del / Backspace', ed_sc_key_multi: 'Shift / Ctrl + نقر', ed_sc_key_arrows: 'الأسهم / Shift + الأسهم', ed_sc_key_pan: 'Space + سحب',
      ed_drop: 'أفلت صورة هنا أو انقر للتصفح',
      ed_start_title: 'ابدأ مشروعك الجديد', ed_start_subtitle: 'اختر مقاس التصميم المناسب، أو واصل العمل على تصاميمك السابقة.',
      ed_start_new: 'تصميم جديد', ed_start_new_desc: 'اختر من المقاسات الجاهزة أو حدد أبعاد التصميم بالبكسل.', ed_start_create: 'بدء التصميم',
      ed_start_resume: 'متابعة آخر تصميم', ed_start_resume_desc: 'استكمل آخر مشروع قمت بحفظه على هذا المتصفح.', ed_start_resume_btn: 'متابعة العمل', ed_start_no_session: 'لا يوجد تصميم محفوظ في هذا المتصفح.',
      ed_start_open: 'فتح مشروع من جهازك', ed_start_open_desc: 'افتح ملف مشروع قمت بحفظه مسبقاً من موقعنا لإكمال التعديل عليه.', ed_start_browse: 'استعراض الملفات', ed_start_file_hint: 'الصيغ المدعومة: .project.json / .json',
      ed_file_saved: 'تم تنزيل ملف المشروع!', ed_file_loaded: 'تم تحميل ملف المشروع!', ed_file_invalid: 'ملف المشروع غير صالح أو تالف',
      ed_sel_all: 'تحديد الكل', ed_group: 'تجميع', ed_ungroup: 'فك التجميع',
      ed_effects: '✨ تأثيرات', ed_text_effects: '✨ تأثيرات النص', ed_shape_effects: '✨ تأثيرات الشكل',
      ed_flip_h: '⇄ قلب أفقي', ed_flip_v: '⇅ قلب رأسي',
      ed_crop: '✂ قص', ed_crop_apply: '✓ تطبيق القص', ed_crop_cancel: '✕ إلغاء', ed_crop_free: 'حر',
      ed_set_bg: '🖼 تعيين كخلفية', ed_detach_bg: '🔓 فك الخلفية', ed_bg_layer_badge: 'خلفية',
      ed_fx_image_title: 'تأثيرات وفلاتر الصورة', ed_fx_brightness: 'السطوع', ed_fx_contrast: 'التباين',
      ed_fx_saturation: 'التشبع', ed_fx_blur: 'التمويه', ed_fx_sharpen: 'زيادة الحدة',
      ed_fx_presets: 'فلاتر جاهزة', ed_fx_original: 'الأصلي', ed_fx_grayscale: 'رمادي',
      ed_fx_sepia: 'سيبيا', ed_fx_vintage: 'كلاسيكي', ed_fx_warm: 'دافئ', ed_fx_cool: 'بارد', ed_fx_invert: 'عكس الألوان',
      ed_fx_text_title: 'تأثيرات النص', ed_fx_shadow: 'ظل النص', ed_fx_shadow_color: 'اللون',
      ed_fx_shadow_blur: 'التمويه', ed_fx_offset_x: 'إزاحة X', ed_fx_offset_y: 'إزاحة Y',
      ed_fx_outline: 'حدود النص', ed_fx_outline_width: 'السمك', ed_fx_highlight: 'خلفية النص',
      ed_fx_letter_spacing: 'تباعد الأحرف', ed_fx_line_height: 'ارتفاع السطر',
      ed_fx_shape_title: 'تأثيرات الشكل', ed_fx_corner_radius: 'تدوير الحواف',
      ed_fx_border_style: 'نمط الإطار', ed_fx_solid: 'متصل', ed_fx_dashed: 'متقطع', ed_fx_dotted: 'منقّط',
      ed_export_title: 'تصدير التصميم', ed_export_filename: 'اسم الملف', ed_export_format: 'الصيغة', ed_export_quality: 'الجودة',
      ed_export_scale: 'الدقة', ed_export_1x: '1x قياسي', ed_export_2x: '2x عالي الدقة', ed_export_3x: '3x طباعة',
      ed_export_download: 'تنزيل', ed_exported: 'تم التصدير!',
      ed_bg_set_ok: 'تم التعيين كخلفية للوحة', ed_bg_detached_ok: 'تم فك الخلفية إلى طبقة قابلة للتعديل', ed_crop_applied: 'تم قص الصورة!',
      ed_untitled: 'تصميم بدون عنوان', ed_project_name: 'اسم المشروع', ed_rename_project_title: 'تعديل اسم المشروع',
      ed_save_project_title: 'حفظ المشروع', ed_save_project_desc: 'أدخل اسماً لتصميمك لحفظه في هذا المتصفح.',
      ed_rename_title: 'إعادة تسمية المشروع', ed_rename_desc: 'أدخل اسماً جديداً لهذا المشروع.',
      ed_recent_projects: 'مشاريعك السابقة', ed_recent_desc: 'افتح التصاميم المحفوظة في هذا المتصفح أو أعد تسميتها أو نزّلها أو أدرها.',
      ed_recent_empty: 'لا توجد مشاريع محفوظة بعد. أنشئ تصميماً واضغط حفظ.',
      ed_open: 'فتح', ed_rename: 'إعادة تسمية', ed_download_file: 'تنزيل ملف', ed_delete_project: 'حذف',
      ed_delete_confirm_title: 'حذف المشروع', ed_delete_confirm_body: 'هل تريد إزالة هذا المشروع من تخزين المتصفح؟ لا يمكن التراجع عن هذا الإجراء.',
      ed_created_on: 'أُنشئ', ed_last_modified: 'آخر تعديل',
      ed_project_saved: 'تم حفظ المشروع!', ed_project_renamed: 'تمت إعادة تسمية المشروع!', ed_project_deleted: 'تم حذف المشروع',
      ed_name_required: 'يرجى إدخال اسم للمشروع',
      ed_export_vector_hint: 'رسوم متجهة SVG', ed_export_pdf_hint: 'ملف PDF جاهز للطباعة',
      // tool labels with dynamic values
      tc_jpeg: 'JPEG', tc_png: 'PNG', tc_webp: 'WebP',
      ed_width_label: 'الحجم:', ed_opacity_label: 'الشفافية:', ed_rotation_label: 'الزاوية:', ed_font_size_label: 'الحجم:',
      ed_zoom_out: '\u2212', ed_zoom_in: '+',
      // about page detailed
      about_how_p1: 'عندما تفتح أداة على imgsfix وتختار صورة، يُقرأ ذلك الملف مباشرةً إلى ذاكرة متصفحك باستخدام File API. ثم يُرسم على عنصر HTML5 canvas، حيث يعالج JavaScript البكسلات في الوقت الفعلي. عندما تكون راضياً عن النتيجة، يُصدَّر canvas إلى ملف صورة قابل للتنزيل \u2014 مرة أخرى، كله على جهازك.',
      about_how_p2: 'في أي لحظة من هذه العملية لا تسافر صورتك عبر الإنترنت. لا توجد خطوة رفع، ولا تخزين مؤقت على الخادم، ولا قائمة معالجة في الخلفية، ولا سجل بما حررته. إذا أغلقت التبويب، تختفي الصورة من الذاكرة. النسخة الوحيدة التي توجد هي تلك التي نزّلتها.',
      about_how_p3: 'تُسمى هذه البنية أحياناً «المعالجة من جهة العميل» أو «المعالجة بدون معرفة». وهي تعني أننا حرفياً لا نستطيع رؤية ملفاتك \u2014 ليس لأننا نختار ألا ننظر، بل لأنها لا تُرسل إلينا أصلاً.',
      about_team_p1: 'بُني imgsfix بواسطة مطورين سئموا الموازنة بين الراحة والخصوصية. رأينا محررات صور قوية عبر الإنترنت تتطلب إنشاء حساب وتتبع أنماط الاستخدام وتخزين ملفات المستخدمين إلى أجل غير مسمى \u2014 فطرحنا سؤالاً بسيطاً: لماذا؟ المتصفحات الحديثة قادرة تماماً على معالجة الصور محلياً. رحلة الخادم غير ضرورية، وكذلك ثمن الخصوصية الذي يرافقها.',
      about_team_p2: 'يمكن تلخيص فلسفتنا في ثلاثة مبادئ:',
      about_team_l1: 'الخصوصية بالبنية لا بالوعد. لا نعتمد على السياسات لحماية بياناتك \u2014 بل نعتمد على حقيقة أننا لا نتلقاها أبداً.',
      about_team_l2: 'وصول مجاني للجميع. الأدوات المفيدة لا ينبغي أن تُحجز خلف جدران الدفع أو التجارب أو التسجيل. imgsfix مجاني للاستخدام، اليوم ودائماً.',
      about_team_l3: 'مفتوح وشفاف. المنطق الذي يعالج صورك يعمل في متصفحك حيث يمكنك فحصه. لا صناديق سوداء، لا سلوك خفي.',
      about_tech_p1: 'بُني imgsfix عمداً على معايير الويب بدلاً من أطر عمل ثقيلة. هذا يبقي الموقع سريعاً وخفيفاً وسهل المراجعة. تشمل التقنيات الأساسية:',
      about_tech_l1: 'HTML5 Canvas API \u2014 أساس جميع معالجات الصور. كل أداة ترسم صورتك على canvas وتقرأ أو تعدّل بيانات البكسلات مباشرة.',
      about_tech_l2: 'JavaScript خام \u2014 لا خطوة بناء، لا مترجم، لا وقت تشغيل لإطار عمل. الكود الذي يعمل هو الكود الذي يمكنك قراءته.',
      about_tech_l3: 'File API و FileReader \u2014 يتيحان لمتصفحك قراءة الملفات المختارة أو المفلترة إلى الذاكرة دون رفعها.',
      about_tech_l4: 'BarcodeDetector API \u2014 واجهة برمجية أصلية في المتصفح يستخدمها قارئ QR والباركود للمسح السريع المحلي.',
      about_tech_l5: 'Fabric.js \u2014 مكتبة canvas خفيفة تشغّل المحرر المتقدم بالأشكال والنصوص والطبقات ومعالجة الكائنات.',
      about_tech_l6: 'localStorage \u2014 يُستخدم فقط لتذكّر تفضيلاتك للسمة (فاتح/داكن) واللغة (إنجليزي/عربي). لا تُخزَّن أي بيانات أخرى.',
      about_tech_p2: 'نتجنب عمداً سكربتات التحليل ومتعقبات الإعلانات وخدمات المعالجة الخارجية. المورد الخارجي الوحيد الذي يُحمَّل هو خط Cairo من Google Fonts، ويُستخدم للطباعة.',
      about_free_p1: 'imgsfix مجاني للاستخدام للجميع \u2014 أفراداً وطلاباً ومستقلين ومؤسسات صغيرة وكبيرة. لا اشتراكات، ولا مستويات مدفوعة، ولا حدود استخدام، ولا علامات مائية على مخرجاتك. لا تحتاج إلى إنشاء حساب أو تقديم بريد إلكتروني أو التعريف بنفسك بأي طريقة.',
      about_free_p2: 'ننوي إبقاء الأمر هكذا. الأدوات التي تراها اليوم ستبقى مجانية، والأدوات الجديدة التي نضيفها مستقبلاً ستكون مجانية أيضاً. نؤمن أن البرمجيات التي تحترم الخصوصية ينبغي أن تكون متاحة للجميع، لا فقط لمن يستطيع الدفع.',
      about_free_p3: 'إذا وجدت imgsfix مفيداً، فإن أفضل طريقة لدعمنا هي مشاركته مع آخرين يهتمون بخصوصيتهم. التوصية الشفهية هي كيف تنمو أداة كهذه \u2014 لا حملات إعلانية، لا بكسلات تتبع، بل شخص يخبر شخصاً.',
      about_values_p1: 'الخصوصية ليست ميزة أضفناها \u2014 بل هي سبب وجود imgsfix. هذه هي القيم التي توجّه كل قرار نتخذه:',
      about_values_l1: 'لا جمع للبيانات. لا نجمع أو نخزّن أو ننقل صورك أو اختياراتك في التحرير أو معلوماتك الشخصية. لا توجد قاعدة بيانات لنشاط المستخدمين لأنه لا يوجد خادم يتلقاها.',
      about_values_l2: 'لا تتبع. لا نستخدم أدوات تحليل أو بكسلات إعلانية أو سكربتات بصمة أو أي تقنية تتبعك عبر الويب.',
      about_values_l3: 'لا كوكيز. لا نضع كوكيز تتبع. التخزين المحلي الوحيد الذي نستخدمه هو لتفضيلاتك للسمة واللغة، وهي تعيش على جهازك ولا تغادره أبداً.',
      about_values_l4: 'لا حسابات. لا تحتاج أبداً للتسجيل أو الدخول. هويتك شأنك الخاص، وصورك ملكك.',
      about_values_l5: 'يعمل دون اتصال. لأن المعالجة محلية، تستمر العديد من الأدوات في العمل حتى لو انقطع اتصالك أثناء الجلسة.',
      about_values_l6: 'بياناتك، أنت تتحكم بها. يمكنك مسح تفضيلاتك في أي وقت من متصفحك. لا شيء «تحذفه من خوادمنا» لأننا لم نمتلكه أصلاً.',
      about_values_p2: 'ندعوك لقراءة سياسة الخصوصية وسياسة الكوكيز كاملة. إذا كان لديك أسئلة، فإن الأسئلة الشائعة تغطي الأكثر شيوعاً، ويمكنك دائماً التواصل معنا مباشرة.',
      // services detailed
      svc_tools_p1: 'ركننا الرئيسي هو مجموعة من ثماني أدوات مركزة أحادية الغرض. كل أداة تفعل شيئاً واحداً بشكل ممتاز، بواجهة نظيفة ومعاينة فورية. اختر الأداة التي تناسب مهمتك، أفلِت صورتك، اضبط الإعدادات، ونزّل النتيجة. لا منحنى تعلّم، لا فوضى، لا رفع.',
      svc_tools_l1: 'ضغط \u2014 قلّص حجم ملفات JPG و PNG و WebP مع الحفاظ على الجودة البصرية. شريط جودة قابل للتعديل مع مقارنة قبل/بعد حية لتجد التوازن الأمثل بين الحجم والوضوح.',
      svc_tools_l2: 'تغيير الحجم \u2014 غيّر أبعاد الصورة إلى أي عرض وارتفاع. حافظ على نسبة الأبعاد بمفتاح واحد، أو اضبط بكسلات دقيقة لمتطلبات محددة كمنشورات وسائل التواصل أو ترويسات البريد.',
      svc_tools_l3: 'تحويل \u2014 بدّل بين صيغ JPG و PNG و WebP فوراً. مفيد عندما تتطلب منصة صيغة معينة أو تحتاج PNG شفاف من مصدر JPG.',
      svc_tools_l4: 'قص \u2014 قمّص صورك بدقة مع منطقة قص تفاعلية. اسحب لتحديد المنطقة، اقفل على نسب أبعاد شائعة، وصدّر الجزء الذي تحتاجه فقط.',
      svc_tools_l5: 'إزالة الخلفية \u2014 امسح خلفيات الصور باستخدام أخذ عينات الألوان. انقر على لون الخلفية لإزالته، اضبط التسامح لدقة الحواف، واحصل على قصاصة نظيفة دون قناع يدوي.',
      svc_tools_l6: 'تحويل إلى كرتون \u2014 حوّل الصور إلى أعمال فنية بأسلوب الكرتون. تطبّق الأداة كشف الحواف وتكميم الألوان محلياً لإنتاج مظهر مصوّر من أي صورة.',
      svc_tools_l7: 'تحسين \u2014 اضبط السطوع والتباين والحدة بمنزلقات بديهية. أنقذ اللقطات المعتمة، عزّز الصور المسطحة، وأبرز التفاصيل \u2014 كلها تُعالَج في الوقت الفعلي على جهازك.',
      svc_tools_l8: 'فلاتر الصور \u2014 طبّق 18 فلتراً فوتوغرافياً وسينمائياً بشدة قابلة للتعديل مع ضبط السطوع والتباين والتشبّع وتظليل الحواف قبل التنزيل.',
      svc_tools_p2: 'كل أداة أعلاه تشترك في الأساس نفسه: صورتك تُحمَّل إلى ذاكرة المتصفح، تُعالَج على canvas من HTML5، وتُصدَّر محلياً. الملف لا يغادر جهازك في أي مرحلة من سير العمل.',
      svc_qr_p1: 'الركن الثاني هو قارئ سريع ومحلي بالكامل لرموز QR والباركود. يدعم وضعين: المسح بالكاميرا الحية والمسح من ملف صورة. في وضع الكاميرا، يستخدم كاميرا جهازك وواجهة BarcodeDetector الأصلية لكشف الرموز في الوقت الفعلي \u2014 وجّه كاميرتك نحو رمز QR ويظهر المحتوى فوراً. في وضع الصورة، يمكنك تحميل أي ملف صورة يحتوي على QR أو باركود ويستخرج القارئ البيانات المشفّرة.',
      svc_qr_p2: 'تشمل الصيغ المدعومة رموز QR و EAN-13 و EAN-8 و UPC-A و UPC-E و Code 128 و Code 39 وغيرها من أنظمة الباركود الشائعة، حسب قدرات متصفحك. يمكن نسخ النتائج المكتشفة إلى الحافظة أو، إذا كان المحتوى رابطاً، فتحه مباشرة في تبويب جديد.',
      svc_qr_p3: 'تماماً مثل أدوات الصور، يعالج قارئ QR كل شيء على جهازك. تُحلَّل إطارات الكاميرا محلياً ولا تُبَث إلى أي خادم. ملفات الصور التي تمسحها تبقى في متصفحك.',
      svc_qr_open: 'فتح قارئ QR',
      svc_editor_p1: 'الركن الثالث هو محرر canvas كامل الميزات لwhen لا تكفي أداة المرور الواحد. مبني على Fabric.js، يوفر بيئة تحرير احترافية بميزات تتوقعها من برمجيات سطح المكتب \u2014 كلها تعمل في متصفحك دون أي رفع.',
      svc_editor_l1: 'أدوات الرسم \u2014 تحديد، فرشاة حرّة، نص، مستطيل، دائرة، مثلث، خط، وسهم.',
      svc_editor_l2: 'معالجة الكائنات \u2014 تحريك، تغيير حجم، تدوير، تكرار، وحذف أي كائن على canvas.',
      svc_editor_l3: 'إدارة الطبقات \u2014 إحضار للأمام، إرسال للخلف، إحضار للمقدمة، وإرسال للمؤخرة لترتيب دقيق.',
      svc_editor_l4: 'تحكم بالنص \u2014 كائنات نصية قابلة للتحرير بحجم الخط، عريض، مائل، تحته خط، وخيارات محاذاة.',
      svc_editor_l5: 'لوحة الخصائص \u2014 اضبط لون التعبئة والشفافية والدوران لأي كائن مختار.',
      svc_editor_l6: 'أحجام canvas مسبقة \u2014 ابدأ من منشور إنستغرام (1080\u00d71080)، قصة إنستغرام (1080\u00d71920)، صورة يوتيوب (1280\u00d7720)، منشور فيسبوك (1200\u00d7630)، أو مقاس مخصص.',
      svc_editor_l7: 'تراجع وإعادة \u2014 تنقل كامل في السجل باختصارات لوحة المفاتيح (Ctrl+Z / Ctrl+Y).',
      svc_editor_l8: 'حفظ المشروع \u2014 احفظ عملك كملف مشروع وحمّله لاحقاً لمواصلة التحرير.',
      svc_editor_l9: 'تصدير PNG \u2014 نزّل تكوينك النهائي كـ PNG عالي الجودة.',
      svc_editor_p2: 'المحرر مثالي لإنشاء رسومات وسائل التواصل والصور المصغّرة والتصاميم البسيطة والتعليقات والكولاجات \u2014 كلها دون تثبيت برمجيات أو تسليم محتواك لخدمة سحابية.',
      svc_editor_open: 'فتح المحرر المتقدم',
      svc_tie_p1: 'تشترك الأركان الثلاثة في الالتزامات نفسها: لا رفع، لا خوادم، لا حسابات، لا تتبع، ولا تكلفة. سواء كنت تضغط صورة واحدة أو تمسح رمز QR في مؤتمر أو تصمم رسماً متعدد الطبقات، تبقى بياناتك على جهازك من البداية للنهاية.',
      svc_tie_p2: 'جاهز للبدء؟ تصفّح أدوات الصور، جرّب قارئ QR، أو أطلق المحرر المتقدم. إذا كان لديك أسئلة، فإن الأسئلة الشائعة لديها إجابات، ومرحب بك دائماً للتواصل معنا.',
      // faq detailed
      faq_q1: 'ما هو imgsfix؟', faq_q2: 'هل imgsfix مجاني فعلاً؟', faq_q3: 'هل ترفعون صوري إلى خادم؟', faq_q4: 'ما صيغ الصور المدعومة؟', faq_q5: 'هل يعمل imgsfix دون اتصال؟', faq_q6: 'ما المتصفحات المدعومة؟', faq_q7: 'كيف يعمل المحرر المتقدم؟', faq_q8: 'هل بياناتي آمنة مع imgsfix؟', faq_q9: 'هل يمكنني استخدام imgsfix لأغراض تجارية؟', faq_q10: 'ما اللغات المدعومة؟',
      faq_a2: 'نعم، بالكامل. لا اشتراكات، ولا مستويات مدفوعة، ولا فترات تجريبية، ولا حدود استخدام، ولا علامات مائية على مخرجاتك. لا تحتاج لإنشاء حساب أو تقديم أي معلومات شخصية. imgsfix مجاني للجميع \u2014 أفراداً وطلاباً ومستقلين ومؤسسات \u2014 وننوي إبقاء الأمر هكذا.',
      faq_a3: 'لا. ليس لدى imgsfix خادم خلفي لمعالجة الصور. عندما تختار أو تفلِت ملفاً، يُحمَّل مباشرةً إلى ذاكرة متصفحك باستخدام File API ويُعالَج على عنصر canvas من HTML5. تُعالَج البكسلات بواسطة JavaScript يعمل على جهازك. عندما تنزّل النتيجة، يُولَّد الملف محلياً من canvas. صورتك لا تسافر عبر الإنترنت في أي مرحلة.',
      faq_a4: 'يعمل imgsfix مع أكثر صيغ صور الويب شيوعاً: JPG (JPEG) و PNG و WebP. أداة التحويل تتيح لك التبديل بين هذه الصيغ الثلاث. معظم الأدوات تقبل أيضاً GIF و BMP كمدخلات. المحرر المتقدم يصدّر إلى PNG. يعتمد دعم صيغة معينة على قدرات متصفحك المدمجة لفك ترميز الصور، لكن جميع المتصفحات الحديثة تتعامل مع JPG و PNG و WebP أصلياً.',
      faq_a5: 'بمجرد تحميل الصفحة، تستمر معظم الأدوات في العمل حتى لو انقطع اتصالك بالإنترنت، لأن كل المعالجة محلية. أدوات الصور والتحسين والفلاتر لا تحتاج اتصالاً بالشبكة بعد التحميل الأولي. وضع كاميرا قارئ QR والمحرر المتقدم يعملان أيضاً دون اتصال. المورد الخارجي الوحيد هو صفحة أنماط Google Fonts، التي تُحمَّل مرة واحدة للطباعة \u2014 إذا لم تكن متاحة، يلجأ الموقع إلى خطوط النظام.',
      faq_a6: 'يعمل imgsfix في جميع المتصفحات الحديثة التي تدعم HTML5 Canvas API و JavaScript الحديث. يشمل ذلك أحدث إصدارات Chrome و Edge و Firefox و Safari و Brave على سطح المكتب، وكذلك Chrome و Safari على الهاتف. مسح الكاميرا لقارئ QR يستخدم واجهة BarcodeDetector الأصلية، المتاحة حالياً في Chrome و Edge على سطح المكتب و Chrome على أندرويد. على المتصفحات بدون BarcodeDetector API، يمكنك مسح رموز QR من ملفات الصور.',
      faq_a7: 'المحرر المتقدم مبني على Fabric.js، مكتبة JavaScript خفيفة لـ canvas. يوفر بيئة تحرير كاملة بأدوات رسم (تحديد، فرشاة، نص، مستطيل، دائرة، مثلث، خط، سهم)، معالجة كائنات (تحريك، تغيير حجم، تدوير، تكرار، حذف)، ترتيب طبقات، لوحة خصائص للتعبئة والشفافية، أحجام canvas مسبقة لوسائل التواصل، تراجع/إعادة باختصارات لوحة المفاتيح، والقدرة على حفظ وتحميل المشاريع. كل شيء يُرسم على canvas في متصفحك \u2014 لا يوجد تفاعل مع خادم في أي مرحلة.',
      faq_a8: 'نعم. لأن كل المعالجة تحدث في متصفحك ولا تُنقل أي بيانات إلى أي خادم، فإن صورك وتعديلاتك لا تُخزَّن في أي مكان خارج جهازك. لا نستخدم أدوات تحليل أو متعقبات إعلانية أو جمع بيانات من أطراف ثالثة. الشيء الوحيد المخزَّن محلياً هو تفضيلك للسمة واللغة في localStorage لمتصفحك. يمكنك مسح هذا في أي وقت من إعدادات متصفحك. للتفاصيل الكاملة، راجع سياسة الخصوصية وسياسة الكوكيز.',
      faq_a9: 'نعم. imgsfix مجاني للاستخدام للمشاريع الشخصية والتجارية على حد سواء. لا توجد قيود ترخيص على الصور التي تنتجها \u2014 المخرج ملكك. يمكنك استخدام الصور المضغوطة والمغيَّرة حجمها والمحوَّلة والمقصوصة والمحرّرة في مواد عملك ومواقعك ووسائل تواصلك وعملائك أو أي سياق آخر. لا نضيف علامات مائية ولا نطالب بأي حقوق على محتواك. يُرجى مراجعة شروط الاستخدام للاطلاع على شروط الاستخدام الكاملة.',
      faq_a10: 'يدعم imgsfix حالياً لغتين: الإنجليزية والعربية. يمكنك التبديل بينهما في أي وقت باستخدام مفتاح اللغة في الترويسة. عند اختيار العربية، تتحول الواجهة بالكامل إلى تخطيط من اليمين لليسار (RTL) لتجربة قراءة طبيعية. يُحفَظ تفضيلك للغة في localStorage لمتصفحك فيستمر عبر الزيارات.',
      // privacy detailed
      privacy_short_label: 'الخلاصة:', privacy_short_text: 'imgsfix لا يجمع أو يخزّن أو ينقل بياناتك. لا خوادم تعالج صورك، لا أدوات تحليل تتتبع سلوكك، لا كوكيز إعلارية تتبعك، ولا حسابات مطلوبة. كل شيء يحدث في متصفحك. هذا ليس وعداً \u2014 بل نتيجة لكيفية بناء الموقع.',
      privacy_h2_1: '1. نظرة عامة', privacy_p1_1: 'imgsfix هو مجموعة أدوات صور تركز على الخصوصية وتعمل من جهة العميل. يعني «من جهة العميل» أن كل المعالجة \u2014 الضغط وتغيير الحجم والتحويل والقص وإزالة الخلفية والتحويل إلى كرتون والتحسين والفلاتر ومسح QR والتحرير \u2014 تجري بالكامل داخل متصفحك على جهازك. لا يُرسل أي جزء من صورتك أو اسم ملفك أو نشاط تحريرك إلينا أو لأي طرف ثالث.',
      privacy_p1_2: 'تشرح سياسة الخصوصية هذه بالتفصيل كيف يتعامل imgsfix (أو بالأحرى، لا يتعامل) مع معلوماتك. لأن الخدمة مصمّمة حول مبدأ تقليل البيانات، فإن معظم هذا المستند يشرح ما لا نفعله.',
      privacy_h2_2: '2. لا جمع للبيانات', privacy_p2_1: 'لا نجمع أي بيانات شخصية. تحديداً، لا نجمع:',
      privacy_p2_l1: 'اسمك أو بريدك الإلكتروني أو أي معلومات تعريف أخرى (لا حسابات مطلوبة).', privacy_p2_l2: 'عنوان IP أو موقعك الجغرافي.', privacy_p2_l3: 'الصور التي تعالجها \u2014 لا تغادر متصفحك أبداً.', privacy_p2_l4: 'أسماء ملفات صورك.', privacy_p2_l5: 'اختياراتك في التحرير أو استخدام الأدوات أو سلوك التصفح على الموقع.', privacy_p2_l6: 'معلومات الجهاز أو إصدار المتصفح أو دقة الشاشة.',
      privacy_p2_2: 'لأنه لا يوجد خادم خلفي يتلقى أو يخزّن بيانات المستخدمين، لا توجد قاعدة بيانات يمكن اختراقها أو بيعها أو استدعاؤها قضائياً. لا نستطيع مشاركة ما لا نملكه.',
      privacy_h2_3: '3. لا كوكيز', privacy_p3_1: 'لا يستخدم imgsfix كوكيز تتبع. لا نضع كوكيز خاصة بنا للتحليل أو الإعلان أو إدارة الجلسات أو أي غرض آخر. لا نستخدم كوكيز أطراف ثالثة.',
      privacy_p3_2: 'التخزين الوحيد الذي نستخدمه هو واجهة localStorage في المتصفح، وهي ليست كوكيز وتُوصف بالتفصيل في القسم 5 أدناه. للمعلومات الكاملة، يُرجى مراجعة سياسة الكوكيز المنفصلة.',
      privacy_h2_4: '4. لا خوادم ومعالجة من جهة العميل', privacy_p4_1: 'ليس لدى imgsfix خادم تطبيق يتلقى أو يعالج ملفاتك. عندما تستخدم أي أداة، يحدث الآتي:',
      privacy_p4_l1: 'تختار أو تفلِت ملفاً، يقرأه متصفحك إلى الذاكرة المحلية باستخدام File API.', privacy_p4_l2: 'تُرسم الصورة على عنصر canvas من HTML5.', privacy_p4_l3: 'JavaScript يعمل على جهازك يعالج بيانات البكسلات.', privacy_p4_l4: 'تُصدَّر النتيجة من canvas إلى ملف قابل للتنزيل، يُولَّد بالكامل في متصفحك.',
      privacy_p4_2: 'في أي لحظة لا يُنقل الملف عبر الشبكة. إذا أغلقت تبويب المتصفح، تُتلَف الصورة من الذاكرة. النسخة الوحيدة التي تبقى هي تلك التي تختار تنزيلها وحفظها على جهازك.',
      privacy_h2_5: '5. استخدام localStorage', privacy_p5_1: 'يستخدم imgsfix واجهة localStorage في المتصفح لتذكّر تفضيلين صغيرين:',
      privacy_p5_l1: 'تفضيل السمة (imgsfix_theme) \u2014 يخزّن ما إذا كنت تفضّل الوضع الفاتح أم الداكن.', privacy_p5_l2: 'تفضيل اللغة (imgsfix_lang) \u2014 يخزّن ما إذا كنت اخترت الإنجليزية أم العربية.',
      privacy_p5_2: 'تُخزَّن هذه القيم على جهازك فقط. لا تُنقل إلينا أو لأي طرف ثالث أبداً. لا تحتوي على معلومات شخصية \u2014 مجرد سلسلة قصيرة تشير إلى تفضيلك. يمكنك مسحها في أي وقت بمسح بيانات موقع متصفحك أو localStorage. راجع سياسة الكوكيز لتعليمات حول كيفية القيام بذلك.',
      privacy_h2_6: '6. لا تحليلات ولا تتبع من أطراف ثالثة', privacy_p6_1: 'لا يستخدم imgsfix أي خدمة تحليل. لا نضمّن Google Analytics أو Matomo أو Mixpanel أو Amplitude أو أي أداة قياس أخرى. لا نعرف كم شخصاً يزور الموقع أو أي الأدوات يستخدمون أو كم يبقون.',
      privacy_p6_2: 'كما لا نستخدم شبكات إعلانية أو بكسلات تسويق أو تضمينات وسائل تواصل أو أي سكربت طرف ثالث يمكنه تتبع سلوكك. لا توجد أزرار «مشاركة» تُنزف البيانات لمنصات التواصل، ولا أنظمة تعليقات تُنمّط الزوار.',
      privacy_p6_3: 'المورد الخارجي الوحيد الذي يحمّله الموقع هو صفحة أنماط خط Cairo من Google Fonts (راجع القسم 7).',
      privacy_h2_7: '7. خدمات الأطراف الثالثة', privacy_p7_1: 'الخدمة الخارجية الوحيدة التي يتفاعل معها imgsfix هي Google Fonts. يحمّل الموقع خط Cairo من fonts.googleapis.com و fonts.gstatic.com لتوفير طباعة متناسقة. قد تتلقى خوادم Google طلباً لملف الخط وقد تسجّل معلومات HTTP قياسية (مثل عنوان IP) كجزء من ذلك الطلب، وفقاً لسياسة الخصوصية الخاصة بـ Google.',
      privacy_p7_2: 'إذا كنت تفضّل عدم تحميل أي موارد خارجية، يمكن تهيئة متصفحك لحظر طلبات الخطوط الخارجية. سيلجأ imgsfix إلى خطوط نظامك الافتراضية ويستمر في العمل بشكل طبيعي. لا تُفقد أي وظيفة \u2014 فقط تتغير الطباعة.',
      privacy_p7_3: 'بجانب Google Fonts، يحمّل imgsfix مكتبة Fabric.js من CDN (cdnjs) للمحرر المتقدم. هذا ملف JavaScript ثابت ولا يتضمن أي تتبع.',
      privacy_h2_8: '8. حقوقك', privacy_p8_1: 'لأن imgsfix لا يجمع أو يخزّن أي بيانات شخصية، فإن حقوق البيانات التقليدية (مثل الوصول أو التصحيح أو الحذف أو نقل بياناتك) محققة فعلياً بالفعل \u2014 لا توجد بيانات عنك لنقدمها أو نصححها أو نحذفها. ومع ذلك، تحتفظ بالتحكم الكامل في الآتي:',
      privacy_p8_l1: 'التفضيلات المحلية: يمكنك مسح تفضيلاتك للسمة واللغة في أي وقت عبر إعدادات متصفحك.', privacy_p8_l2: 'صورك: أنت تقرر أي الصور تعالج وما إذا كنت ستنزّل النتائج. لا يُحتفَظ بأي شيء بواسطة الموقع.', privacy_p8_l3: 'الموارد الخارجية: يمكنك حظر Google Fonts أو موارد خارجية أخرى باستخدام إضافات المتصفح أو حاجبات المحتوى دون التأثير على الوظائف الأساسية.', privacy_p8_l4: 'استخدام الخدمة: يمكنك التوقف عن استخدام imgsfix في أي وقت. لأنه لا يوجد حساب أو بيانات، لا شيء يُلغى أو يُحذف.',
      privacy_h2_9: '9. خصوصية الأطفال', privacy_p9_1: 'imgsfix مناسب لمستخدمين من جميع الأعمار. لأننا لا نجمع أي معلومات شخصية ولا نطلب حساباً، فإن الخدمة آمنة للأطفال للاستخدام تحت إشراف بالغ. لا نجمع عمداً أي معلومات من الأطفال أو أي مستخدم آخر، ولا توجد آلية يمكن من خلالها للطفل الإفصاح عن بيانات شخصية لنا عبر الموقع.',
      privacy_h2_10: '10. التغييرات على هذه السياسة', privacy_p10_1: 'إذا أجرينا تغييرات جوهرية على سياسة الخصوصية هذه، سنحدّث تاريخ «آخر تحديث» في أعلى هذه الصفحة. لأن البنية الأساسية لـ imgsfix \u2014 معالجة من جهة العميل دون جمع بيانات \u2014 جوهرية للمشروع، لا نتوقع تغييرات تُغيّر هذا النهج. أي تغييرات مستقبلية ستُوثَّق بشفافية هنا.',
      privacy_h2_11: '11. معلومات الاتصال', privacy_p11_1: 'إذا كان لديك أي أسئلة حول سياسة الخصوصية هذه أو ممارسات بيانات imgsfix، يُرجى زيارة صفحة الاتصال بنا. يمكنك أيضاً إيجاد إجابات سريعة لأسئلة الخصوصية الشائعة في الأسئلة الشائعة، ومزيد من التفاصيل حول التخزين المحلي في سياسة الكوكيز.',
      // terms detailed
      terms_last_updated: 'آخر تحديث: يوليو 2026', terms_welcome: 'مرحباً بك في imgsfix. بدخولك أو استخدامك لهذا الموقع وأدواته، فإنك توافق على الالتزام بشروط الاستخدام هذه. إذا لم توافق على أي جزء من هذه الشروط، يُرجى عدم استخدام الخدمة. صُمِّمت هذه الشروط لتكون واضحة وعادلة \u2014 imgsfix أداة مجانية تركز على الخصوصية، وتعكس هذه الشروط تلك البساطة.',
      terms_h2_1: '1. قبول الشروط', terms_p1_1: 'باستخدامك imgsfix \u2014 بما في ذلك أي من أدوات الصور أو قارئ QR والباركود أو المحرر المتقدم \u2014 فإنك تقرّ بأنك قرأت وفهمت ووافقت على شروط الاستخدام هذه وسياسة الخصوصية. تشكل هذه الشروط اتفاقاً ملزماً قانونياً بينك وبين imgsfix. إذا كنت تستخدم الخدمة نيابة عن مؤسسة، فإنك تمثّل أن لديك الصلاحية لإلزام تلك المؤسسة بهذه الشروط.',
      terms_p1_2: 'إذا لم توافق على هذه الشروط، يجب أن تتوقف عن استخدام الخدمة فوراً. لأن imgsfix لا يتطلب حساباً أو تسجيلاً، فإن استخدامك للأدوات نفسه يشكل قبولاً.',
      terms_h2_2: '2. استخدام الخدمة', terms_p2_1: 'يمنحك imgsfix ترخيصاً مجانياً غير حصري وغير قابل للتحويل لاستخدام الموقع وأدواته للأغراض الشخصية والتجارية. يمكنك استخدام الخدمة لمعالجة وتحرير وتحويل الصور التي تملكها أو لديك حق استخدامها.',
      terms_h3_permitted: 'الاستخدام المسموح', terms_permitted_l1: 'معالجة الصور لمشاريع شخصية أو تعليمية أو تجارية.', terms_permitted_l2: 'استخدام قارئ QR لمسح الرموز التي لديك حق الوصول إليها.', terms_permitted_l3: 'استخدام المحرر المتقدم لإنشاء تصاميم وتركيبات أصلية.', terms_permitted_l4: 'تنزيل واستخدام ملفات المخرجات في أي سياق، بدون حقوق ملكية.',
      terms_h3_prohibited: 'الاستخدام المحظور', terms_prohibited_l1: 'استخدام imgsfix لمعالجة صور لا تملك حق استخدامها، بما في ذلك المواد المحمية بحقوق الطبع التي لا تملكها أو ليس لديك إذن باستخدامها.', terms_prohibited_l2: 'استخدام الخدمة لأي غرض غير قانوني أو بانتهاك القوانين المعمول بها.', terms_prohibited_l3: 'محاولة الهندسة العكسية أو فك التجميع أو استغلال الخدمة لأغراض خبيثة.', terms_prohibited_l4: 'استخدام سكربتات آلية أو بوتات للوصول إلى الخدمة بطريقة تعطل توافرها للآخرين.', terms_prohibited_l5: 'استخدام مخرجات الأدوات بطريقة تنتهك حقوق أطراف ثالثة.',
      terms_p2_2: 'أنت وحدك مسؤول عن الصور التي تعالجها والمحتوى الذي تنشئه باستخدام imgsfix. لا نراقب أو نراجع نشاط المستخدمين \u2014 لأننا لا نستطيع، إذ لا تصلنا أي بيانات \u2014 لكنك تبقى مسؤولاً عن استخدامك الخاص للخدمة.',
      terms_h2_3: '3. الملكية الفكرية', terms_p3_1: 'موقع imgsfix، بما في ذلك تصميمه وكوده وأدواته وعلامته التجارية، هو ملكية فكرية لمبتكريه. تُقدَّم البرمجية لاستخدامك مجاناً، لكن هذا لا يشكل نقلاً للملكية. لا يمكنك المطالبة بعلامة imgsfix أو شعارها أو تصميم موقعها كملك لك.',
      terms_p3_2: 'الصور والملفات التي تعالجها باستخدام imgsfix تبقى ملكك. لا نطالب بأي ملكية أو ترخيص أو حقوق لأي محتوى تنشئه أو تحرّره أو تنزّله عبر الخدمة. مخرج كل أداة \u2014 الصور المضغوطة والمغيَّرة حجمها والمحوَّلة والمقصوصة والتصاميم المحرّرة \u2014 ملكك بالكامل. لا نضيف علامات مائية أو ندمج بيانات وصفية تدّعي التأليف أو نحتفظ بأي نسخة من عملك.',
      terms_h2_4: '4. إخلاء الضمانات', terms_p4_1: 'يُقدَّم imgsfix «كما هو» و«كما هو متاح» دون ضمانات من أي نوع، سواء صريحة أو ضمنية. بأقصى حد يسمح به القانون المعمول به، نتنصل من جميع الضمانات، بما في ذلك على سبيل المثال لا الحصر:',
      terms_p4_l1: 'الضمانات الضمنية للقابلية للتسويق والملاءمة لغرض معين.', terms_p4_l2: 'ضمانات أن الخدمة ستكون متواصلة أو خالية من الأخطاء أو آمنة.', terms_p4_l3: 'ضمانات تتعلق بدقة أو موثوقية أو جودة النتائج التي تنتجها الأدوات.', terms_p4_l4: 'ضمانات أن الخدمة ستلبي متطلباتك أو توقعاتك المحددة.',
      terms_p4_2: 'لأن كل المعالجة تجري في متصفحك باستخدام قدراته المدمجة، فقد تختلف جودة وأداء الأدوات حسب جهازك ومتصفحك والصورة المحددة التي تُعالَج. تستخدم الخدمة على مسؤوليتك الخاصة وتكون مسؤولاً عن التحقق من ملاءمة المخرج لغرضك المقصود.',
      terms_h2_5: '5. تحديد المسؤولية', terms_p5_1: 'بأقصى حد يسمح به القانون المعمول به، لن يكون imgsfix ومبتكروه مسؤولين عن أي أضرار مباشرة أو غير مباشرة أو عرضية أو خاصة أو تبعية أو عقابية تنشأ عن أو تتعلق باستخدامك أو عدم قدرتك على استخدام الخدمة. يشمل ذلك، على سبيل المثال لا الحصر:',
      terms_p5_l1: 'فقدان البيانات أو الصور أو الأرباح.', terms_p5_l2: 'انقطاع الأعمال أو فقدان معلومات الأعمال.', terms_p5_l3: 'أضرار ناتجة عن استخدام أو عدم القدرة على استخدام الخدمة.', terms_p5_l4: 'أضرار ناتجة عن أخطاء أو سهو أو عدم دقة في المخرج الذي تنتجه الأدوات.',
      terms_p5_2: 'لأن imgsfix خدمة مجانية تُقدَّم بدون رسوم، فإنك توافق على أن هذا التحديد للمسؤولية هو توزيع عادل ومعقول للمخاطرة. يُشجَّع على الاحتفاظ بنسخ احتياطية من صورك الأصلية والتحقق من نتائج أي معالجة قبل الاعتماد عليها لأغراض مهمة.',
      terms_h2_6: '6. التغييرات على هذه الشروط', terms_p6_1: 'نحتفظ بالحق في تعديل شروط الاستخدام هذه في أي وقت. عندما نفعل، سنحدّث تاريخ «آخر تحديث» في أعلى هذه الصفحة. تسري التغييرات فور النشر. من مسؤوليتك مراجعة هذه الشروط دورياً للتحديثات.',
      terms_p6_2: 'استمرار استخدام imgsfix بعد نشر التغييرات يشكل قبولك للشروط المعدّلة. إذا لم توافق على الشروط المحدّثة، يجب أن تتوقف عن استخدام الخدمة. نظراً للطبيعة الأساسية لـ imgsfix \u2014 مجاني، خاص، من جهة العميل \u2014 لا نتوقع تغييرات جوهرية على الشروط الأساسية.',
      terms_h2_7: '7. القانون الحاكم', terms_p7_1: 'تخضع شروط الاستخدام هذه للقانون المعمول به وتُفسَّر وفقاً له، دون مراعاة لمبادئ تعارض القوانين. تُحَلّ أي نزاعات تنشأ عن أو تتعلق باستخدامك لـ imgsfix في المحاكم المختصة في الولاية التي تُشغَّل فيها الخدمة.',
      terms_p7_2: 'إذا وُجد أن أي حكم من هذه الشروط غير قابل للإنفاذ أو غير صالح من قبل محكمة مختصة، يُحَدّ أو يُلغى ذلك الحكم بأدنى حد ضروري، وتبقى الأحكام المتبقية سارية المفعول بالكامل.',
      terms_h2_8: '8. الاتصال', terms_p8_1: 'إذا كان لديك أي أسئلة أو مخاوف حول شروط الاستخدام هذه، يُرجى زيارة صفحة الاتصال بنا. قد تجد أيضاً معلومات مفيدة في الأسئلة الشائعة وسياسة الخصوصية وإخلاء المسؤولية.',
      // cookies detailed
      cookies_last_updated: 'آخر تحديث: يوليو 2026', cookies_short_label: 'الخلاصة:', cookies_short_text: 'لا يضع imgsfix كوكيز تتبع من أي نوع. التخزين المحلي الوحيد الذي نستخدمه هو إدخالين صغيرين في localStorage لمتصفحك لتذكّر سمتك (فاتح/داكن) ولغتك (إنجليزي/عربي). هذا التخزين لا يغادر جهازك أبداً ولا يحتوي على معلومات شخصية. يمكنك مسحه في أي وقت.',
      cookies_h2_1: '1. لا كوكيز تتبع', cookies_p1_1: 'لا يستخدم imgsfix الكوكيز لتتبعك. لا نضع كوكيز خاصة بنا للتحليل أو الإعلان أو إدارة الجلسات أو التخصيص أو أي غرض آخر. لا نضع كوكيز أطراف ثالثة على جهازك. لا توجد لافتة كوكيز أو نافذة موافقة على imgsfix لأنه لا توجد كوكيز تتبع للموافقة عليها.',
      cookies_p1_2: 'العديد من المواقع تستخدم الكوكيز لتذكّر من أنت أو قياس سلوكك أو عرض إعلانات مستهدفة أو تتبعك عبر الويب. imgsfix لا يفعل أيًا من هذا. ليس لدينا أدوات تحليل أو شبكات إعلانية أو تكاملات وسائل تواصل أو بكسلات إعادة تسويق \u2014 وبالتالي لا حاجة للكوكيز التي تشغلها.',
      cookies_h2_2: '2. localStorage للتفضيلات فقط', cookies_p2_1: 'بدلاً من الكوكيز، يستخدم imgsfix واجهة localStorage في المتصفح لتذكّر تفضيلين صغيرين. localStorage ميزة في المتصفح تتيح لموقع تخزين كميات صغيرة من البيانات على جهازك. على عكس الكوكيز، لا تُرسل بيانات localStorage تلقائياً إلى خادم مع كل طلب \u2014 تبقى على جهازك ولا يقرؤها إلا الصفحة التي أنشأتها.',
      cookies_p2_2: 'العنصران اللذان نخزّنهما هما:',
      cookies_p2_l1: 'imgsfix_theme \u2014 كلمة واحدة، إما "light" أو "dark"، تسجّل أي سمة بصرية اخترتها. هذا يتيح للموقع التحميل بسمتك المفضلة في زيارتك القادمة.', cookies_p2_l2: 'imgsfix_lang \u2014 كلمة واحدة، إما "en" أو "ar"، تسجّل ما إذا كنت اخترت الإنجليزية أم العربية. هذا يتيح للموقع العرض بلغتك المفضلة تلقائياً.',
      cookies_p2_3: 'هذه هي القائمة الكاملة. لا تحتوي هذه القيم على معلومات شخصية \u2014 هي سلاسل قصيرة تصف تفضيلاً بصرياً. لا تُنقل إلينا أو لأي طرف ثالث أبداً. وجودها فقط لتجربة أكثر راحة، ويمكنك حذفها في أي وقت دون التأثير على وظائف أي أداة.',
      cookies_h2_3: '3. Google Fonts', cookies_p3_1: 'يحمّل imgsfix خط Cairo من Google Fonts (fonts.googleapis.com و fonts.gstatic.com). عندما يطلب متصفحك صفحة الأنماط وملفات الخط، قد تضع خوادم Google كوكيز على جهازك وفقاً لممارسات الخصوصية الخاصة بـ Google. تتحكم Google في هذه الكوكيز، لا imgsfix، ولا نملك أي وصول إليها.',
      cookies_p3_2: 'إذا كنت تفضّل عدم تلقي أي كوكيز من Google، يمكنك:', cookies_p3_l1: 'حظر الخطوط الخارجية في إعدادات متصفحك أو باستخدام إضافة حاجب محتوى.', cookies_p3_l2: 'استخدام إضافة متصفح تحظر الطلبات إلى نطاقات Google Fonts.', cookies_p3_l3: 'تهيئة متصفحك لحظر كوكيز الأطراف الثالثة بالكامل.',
      cookies_p3_4: 'إذا حُظرت Google Fonts، سيلجأ imgsfix إلى خطوط نظامك الافتراضية. ستستمر جميع الأدوات والميزات في العمل بشكل طبيعي \u2014 فقط تتغير الطباعة.',
      cookies_p3_5: 'لمزيد حول ممارسات بيانات Google، يُرجى الرجوع إلى سياسة الخصوصية الخاصة بـ Google.',
      cookies_h2_4: '4. كيفية عرض ومسح localStorage', cookies_p4_1: 'لأن تفضيلاتك مخزّنة محلياً على جهازك، فلديك تحكم كامل بها. إليك كيفية عرض ومسح localStorage الخاص بـ imgsfix في المتصفحات الشائعة:',
      cookies_h3_chrome: 'Google Chrome / Microsoft Edge', cookies_chrome_l1: 'افتح imgsfix، ثم اضغط F12 أو Ctrl+Shift+I (Cmd+Option+I على Mac) لفتح أدوات المطوّر.', cookies_chrome_l2: 'اذهب إلى تبويب Application.', cookies_chrome_l3: 'في الشريط الجانبي الأيسر، وسّع Local Storage واختر موقع imgsfix.', cookies_chrome_l4: 'سترى imgsfix_theme و imgsfix_lang. انقر بزر الفأرة الأيمن واختر Clear لإزالتها.',
      cookies_h3_firefox: 'Mozilla Firefox', cookies_firefox_l1: 'افتح imgsfix، ثم اضغط F12 أو Ctrl+Shift+I (Cmd+Option+I على Mac) لفتح أدوات المطوّر.', cookies_firefox_l2: 'اذهب إلى تبويب Storage.', cookies_firefox_l3: 'وسّع Local Storage واختر موقع imgsfix.', cookies_firefox_l4: 'سترى الإدخالات المخزّنة. انقر بزر الفأرة الأيمن واختر Delete لإزالتها.',
      cookies_h3_safari: 'Apple Safari', cookies_safari_l1: 'افتح imgsfix، ثم اضغط Cmd+Option+I لفتح مفتش الويب.', cookies_safari_l2: 'اذهب إلى تبويب Storage.', cookies_safari_l3: 'وسّع Local Storage واختر موقع imgsfix.', cookies_safari_l4: 'اختر الإدخالات واضغط Delete لإزالتها.',
      cookies_h3_clearing: 'مسح جميع بيانات الموقع', cookies_clearing_p1: 'يمكنك أيضاً مسح كل localStorage لكل المواقع دفعة واحدة عبر إعدادات الخصوصية في متصفحك:',
      cookies_clearing_l1: 'Chrome: الإعدادات ← الخصوصية والأمان ← مسح بيانات التصفح ← الصور وملفات التخزين المؤقت / الكوكيز وبيانات الموقع.', cookies_clearing_l2: 'Firefox: الإعدادات ← الخصوصية والأمان ← الكوكيز وبيانات الموقع ← مسح البيانات.', cookies_clearing_l3: 'Safari: التفضيلات ← الخصوصية ← إدارة بيانات الموقع ← إزالة الكل.', cookies_clearing_l4: 'Edge: الإعدادات ← الكوكيز وأذونات الموقع ← إدارة وحذف الكوكيز وبيانات الموقع.',
      cookies_h2_5: '5. تحكمك في تفضيلاتك', cookies_p5_1: 'أنت دائماً تتحكم في تجربتك مع imgsfix. تفضيلاتك للسمة واللغة هي تسهيلات اختيارية \u2014 الأدوات تعمل بشكل مثالي بدونها. إذا مسحت localStorage، فسيستخدم الموقع ببساطة افتراضاته (السمة الفاتحة ولغة متصفحك المكتشفة) حتى تختار مرة أخرى.',
      cookies_p5_2: 'لا يوجد حساب لحذفه، ولا بيانات لتصديرها، ولا سجل تتبع لمراجعته، لأن أياً من هذه الأشياء غير موجود. علاقتك مع imgsfix بسيطة قدر الإمكان: تستخدم الأدوات، تبقى صورك على جهازك، والشيء الوحيد الذي يتذكّره الموقع هو كيف تحب أن يبدو.',
      cookies_h2_6: '6. التغييرات على هذه السياسة', cookies_p6_1: 'إذا غيّرنا أبداً ممارساتنا للكوكيز أو التخزين، سنحدّث هذه الصفحة ونراجع تاريخ «آخر تحديث». نظراً لأن التصميم الأساسي لـ imgsfix يتجنب الكوكيز تماماً، لا نتوقع تغييرات من شأنها إدخال التتبع. أي تغيير مستقبلي ستُوثَّق بوضوح هنا.',
      cookies_h2_7: '7. الاتصال', cookies_p7_1: 'أسئلة حول سياسة الكوكيز هذه؟ زر صفحة الاتصال بنا للتواصل، أو اقرأ سياسة الخصوصية الكاملة للصورة المتكاملة لكيفية تعامل imgsfix (أو بالأحرى، عدم تعامله) مع بياناتك.',
      // disclaimer detailed
      disclaimer_note_label: 'يُرجى الانتباه:', disclaimer_note_text: 'imgsfix أداة مجانية تُقدَّم «كما هي» دون ضمانات من أي نوع. المعلومات والأدوات على هذا الموقع تُقدَّم للاستخدام العام والراحة، لا كنصيحة احترافية. أنت مسؤول عن صورك واستخدامك للنتائج.',
      disclaimer_h2_1: 'إخلاء المسؤولية العام', disclaimer_p1_1: 'تُقدَّم المعلومات والأدوات بواسطة imgsfix كخدمة عامة مجانية لمعالجة الصور للأغراض العامة. بينما نسعى لجعل الأدوات دقيقة وموثوقة ومفيدة، فإن imgsfix يُقدَّم على أساس «كما هو» و«كما هو متاح». لا نقدّم أي إقرارات أو ضمانات من أي نوع، صريحة أو ضمنية، حول اكتمال أو دقة أو موثوقية أو ملاءمة أو توافر الخدمة أو النتائج التي ينتجها.',
      disclaimer_p1_2: 'أي اعتماد تضعه على imgsfix أو أدواته أو مخرجاته يكون على مسؤوليتك الخاصة بالكامل. لن نكون مسؤولين عن أي فقدان أو ضرر من أي نوع ينشأ عن استخدام أو الاعتماد على الخدمة أو الصور التي ينتجها. يُشجَّع على التحقق من نتائج أي معالجة قبل استخدامها في سياقات تكون فيها الدقة حرجة.',
      disclaimer_h2_2: 'لا ضمان للنتائج', disclaimer_p2_1: 'تعالج أدوات imgsfix الصور باستخدام قدرات متصفحك المدمجة و HTML5 Canvas API. لأن النتائج تعتمد على عوامل خارج سيطرتنا \u2014 بما في ذلك متصفحك وقوة معالجة جهازك وخصائص صورتك المحددة والإعدادات التي تختارها \u2014 لا نستطيع ضمان أي نتيجة معينة.',
      disclaimer_p2_l1: 'تختلف نتائج الضغط حسب محتوى الصورة والصيغة وإعداد الجودة الذي تختاره.', disclaimer_p2_l2: 'يعمل إزالة الخلفية بشكل أفضل مع الخلفيات الصلبة المتباينة وقد لا ينتج نتائج نظيفة على الصور المعقدة.', disclaimer_p2_l3: 'التحويل إلى كرتون والفلاتر هي تحويلات أسلوبية ومخرجاتها ذاتية.', disclaimer_p2_l4: 'تعتمد تعديلات التحسين على جودة الصورة الأصلية وقد لا تستعيد بالكامل الصور التالفة أو منخفضة الدقة.', disclaimer_p2_l5: 'تعتمد دقة قارئ QR على وضوح الصورة والإضاءة ودعم المتصفح لواجهة BarcodeDetector API.',
      disclaimer_p2_2: 'نوصي بمراجعة مخرج كل أداة قبل الاعتماد عليه. إذا لم تُلبِّ النتيجة احتياجاتك، يمكنك ضبط الإعدادات والمحاولة مرة أخرى \u2014 لا حدّ لعدد مرات استخدام أي أداة، ولا تكلفة متضمنة.',
      disclaimer_h2_3: 'مسؤولية المستخدم عن الصور', disclaimer_p3_1: 'أنت وحدك مسؤول عن الصور التي تعالجها باستخدام imgsfix. باستخدامك الخدمة، تؤكد أن:',
      disclaimer_p3_l1: 'تملك الصور التي تعالجها، أو حصلت على الحقوق والأذونات اللازمة لاستخدامها وتعديلها.', disclaimer_p3_l2: 'استخدامك للصور والمخرجات المعالجة لا ينتهك حقوق الطبع أو العلامات التجارية أو الخصوصية أو حقوق أي طرف ثالث.', disclaimer_p3_l3: 'لن تستخدم imgsfix لمعالجة الصور لأي غرض غير قانوني أو احتيالي.',
      disclaimer_p3_2: 'لأن كل المعالجة تجري في متصفحك ولا تُنقل أي بيانات إلينا، لا نملك وسيلة لمراقبة أو مراجعة الصور التي تعالجها. هذا يعني أيضاً أننا لا نملك وسيلة لفرض هذه المسؤوليات \u2014 لكنه يعني أيضاً أن صورك تبقى خاصة بالكامل. مسؤولية الاستخدام القانوني والأخلاقي تقع عليك.',
      disclaimer_h2_4: 'ليست نصيحة احترافية', disclaimer_p4_1: 'تُقدَّم الأدوات والمحتوى على imgsfix لأغراض معالجة الصور العامة فقط. لا تشكل نصيحة احترافية من أي نوع. تحديداً:',
      disclaimer_p4_l1: 'imgsfix ليس بديلاً عن خدمات تحرير الصور أو التصميم الجرافيكي أو التصوير الاحترافية.', disclaimer_p4_l2: 'لا تقدّم الأدوات نصائح قانونية أو طبية أو مالية أو تقنية.', disclaimer_p4_l3: 'يجب التحقق من محتوى رموز QR والباركود بشكل مستقل \u2014 لا تتصرف بناءً على الروابط أو البيانات الممسوحة دون التأكد من أنها مشروعة وآمنة.', disclaimer_p4_l4: 'المحتوى في صفحات حول والخدمات والأسئلة الشائعة والسياسات معلوماتي ولا ينبغي اعتباره توجيهاً احترافياً.',
      disclaimer_p4_2: 'إذا كنت تتطلب نتائج أو نصائح احترافية لغرض محدد \u2014 كإنتاج الطباعة التجارية أو الوثائق القانونية أو مواد الأعمال الحرجة \u2014 فيجب استشارة مختص مناسب. imgsfix أداة مريحة ومجانية وخاصة، لكنها ليست بديلاً عن الخدمات الاحترافية عندما تكون مبررة.',
      disclaimer_h2_5: 'الاستخدام على مسؤوليتك الخاصة', disclaimer_p5_1: 'استخدامك لـ imgsfix على مسؤوليتك الخاصة بالكامل. بينما نعمل لضمان أن الخدمة آمنة وتعمل، لا نستطيع ضمان أنها ستكون خالية من الأخطاء أو البق أو الانقطاعات في جميع الأوقات. قد تؤثر تحديثات المتصفح أو قيود الجهاز أو ظروف الشبكة على الأداء أحياناً.',
      disclaimer_p5_2: 'لحماية نفسك، نوصي بـ:', disclaimer_p5_l1: 'الاحتفاظ بنسخ احتياطية من صورك الأصلية قبل معالجتها.', disclaimer_p5_l2: 'مراجعة النتائج المنزّلة قبل حذف أو استبدال أصولك.', disclaimer_p5_l3: 'استخدام متصفح مدعوم ومحدّث لأفضل تجربة.', disclaimer_p5_l4: 'اختبار الأدوات على صور غير حرجة أولاً إذا لم تكن متأكداً من أدائها.',
      disclaimer_h2_6: 'روابط خارجية', disclaimer_p6_1: 'قد يحتوي imgsfix على روابط لمواقع خارجية (مثل سياسة خصوصية Google) لا يُشغلها imgsfix. لا نملك أي سيطرة على محتوى وممارسات هذه المواقع الخارجية ولا نستطيع تحمّل المسؤولية عن سياسات الخصوصية أو شروط الاستخدام الخاصة بها. أنت تقرّ بأن imgsfix ليس مسؤولاً عن دقة أو موثوقية أي معلومات أو منتجات أو خدمات تُقدَّم على المواقع الخارجية.',
      disclaimer_h2_7: 'التغييرات على هذا الإخلاء', disclaimer_p7_1: 'نحتفظ بالحق في تحديث أو تعديل هذا الإخلاء في أي وقت. أي تغييرات ستُنشر على هذه الصفحة مع تاريخ «آخر تحديث» محدّث. استمرارك في استخدام imgsfix بعد نشر التغييرات يشكل إقرارك بالإخلاء المعدّل.',
      disclaimer_h2_8: 'الاتصال', disclaimer_p8_1: 'إذا كان لديك أي أسئلة حول هذا الإخلاء، يُرجى زيارة صفحة الاتصال بنا. قد تجد أيضاً معلومات ذات صلة في شروط الاستخدام وسياسة الخصوصية والأسئلة الشائعة.',
      ocr_panel_input: 'الصورة المصدر',
      ocr_btn_upload: 'رفع / كاميرا',
      ocr_btn_paste: 'لصق صورة',
      ocr_rot_left: 'تدوير -90°',
      ocr_rot_right: 'تدوير +90°',
      ocr_btn_crop: 'تحديد منطقة',
      ocr_btn_reset_crop: 'إلغاء التحديد',
      ocr_drop_title: 'أفلِت صورة هنا، اختر ملفاً، أو اضغط Ctrl+V',
      ocr_drop_sub: 'JPG, PNG, WebP, BMP, GIF (بحد أقصى 25MB) · معالجة محلية 100٪',
      ocr_btn_browse: 'اختر صورة',
      ocr_lang_label: 'لغة التعرّف على النص',
      ocr_lang_ara_eng: 'العربية + الإنجليزية (الافتراضي)',
      ocr_lang_ara: 'العربية فقط',
      ocr_lang_eng: 'الإنجليزية فقط',
      ocr_opt_enhance: 'تحسين التباين الذكي للصور',
      ocr_btn_extract: 'استخراج النص',
      ocr_panel_output: 'النص المستخرج',
      ocr_btn_copy: 'نسخ النص',
      ocr_btn_fix_lines: 'إصلاح الأسطر المقطوعة',
      ocr_btn_txt: 'تنزيل .txt',
      ocr_btn_doc: 'Word (.doc)',
      ocr_output_ph: 'سيظهر النص المستخرج هنا للمراجعة والتعديل الفوري…',
      ocr_entities_title: 'استخراج سريع لجهات الاتصال والروابط',
      ocr_entities_hint: 'انقر على أي عنصر لنسخه',
      ocr_ent_email: 'بريد',
      ocr_ent_phone: 'هاتف',
      ocr_ent_url: 'رابط',
      ocr_accuracy: 'الدقة',
      ocr_crop_selected: 'المنطقة المحددة',
      ocr_crop_drag_hint: 'اسحب على الصورة لتحديد جزء معيّن فقط للاستخراج',
      ocr_status_init: 'جارٍ تهيئة محرك OCR محلياً…',
      ocr_status_lang: 'جارٍ تحميل وتخزين حزمة اللغة مؤقتاً في المتصفح…',
      ocr_status_recognizing: 'جارٍ التعرّف على النص داخل الصورة…',
      ocr_status_working: 'جارٍ معالجة الصورة…',
      ocr_status_done: 'اكتمل استخراج النص',
      ocr_err_size: 'حجم الصورة كبير جداً (الحد الأقصى 25 ميجابايت)',
      ocr_err_type: 'يُرجى اختيار صورة بصيغة JPG أو PNG أو WebP أو BMP أو GIF',
      ocr_err_decode: 'تعذر قراءة ملف الصورة المحدد',
      ocr_err_run: 'تعذر استخراج النص. جرّب صورة أوضح أو حدّد المنطقة المطلوبة.',
      ocr_img_loaded: 'تم تحميل الصورة بنجاح',
      ocr_done_ok: 'تم استخراج النص محلياً',
      ocr_done_empty: 'لم يتم العثور على نص مقروء في المنطقة المحددة',
      ocr_cancelled: 'تم إلغاء عملية الاستخراج',
      ocr_lines_fixed: 'تم دمج الأسطر المقطوعة في فقرات مرتبة',
      ocr_paste_hint: 'اضغط Ctrl+V (أو Cmd+V) مباشرة للصق لقطة الشاشة',
      ocr_paste_empty: 'لا توجد صورة في الحافظة حالياً',
      ocr_dl_txt_ok: 'تم تنزيل ملف TXT',
      ocr_dl_doc_ok: 'تم تنزيل ملف Word (.doc)',
      ocr_btn_formatter: 'فتح في منسّق النصوص',
      ocr_note_p1: 'ملحوظة: تم تصميم الأداة للتعامل مع النصوص المطبوعة ولقطات الشاشة والمستندات، ويُفضَّل استخدام صور واضحة لضمان أفضل نتيجة. كما تدعم قراءة النصوص المكتوبة بخط اليد، بشرط أن تكون الكتابة واضحة، مع العلم أن دقة التعرّف عليها قد تصل إلى نحو 50% فقط أو أقل.',
      ocr_note_p2: 'للحصول على أعلى دقة ممكنة في استخراج النصوص العربية، يُنصح باختيار خيار «العربية فقط».',
      pp_meta_desc: 'صمّم صور جواز السفر والتأشيرات البيومترية محلياً 100% داخل متصفحك مع إزالة الخلفية بالذكاء الاصطناعي ودليل المحاذاة والإضاءة وتصدير ألواح طباعة 300 DPI بصيغ JPG وPNG وPDF.',
      pp_view_single: 'صورة مفردة',
      pp_view_sheet: 'ورقة طباعة',
      pp_btn_replace: 'تغيير الصورة',
      pp_drop_title: 'أفلت صورتك الشخصية هنا، أو اختر ملفاً، أو الصق (Ctrl+V)',
      pp_drop_sub: 'JPG, PNG, WebP, BMP, GIF (بحد أقصى 30MB · 12,000px) · محلياً 100%',
      pp_ai_working: 'جارٍ تحديد الشخص وتبييض الخلفية محلياً…',
      pp_quick_peek: 'معاينة',
      pp_btn_center: 'توسيط',
      pp_guide_toggle: 'دليل القياس الحيوي',
      pp_shortcuts_legend: 'الأسهم تحريك (Shift 10px) · +/- تكبير · [/] إمالة · G الدليل · مسافة للمعاينة · Ctrl+Z/Y تراجع/إعادة · Ctrl+S تصدير',
      studio_export_print: 'تصدير / طباعة',
      pp_export_modal_d: 'اضبط تخطيط ورقة الطباعة بدقة 300 DPI أو حمّل الصورة الرسمية المفردة.',
      pp_mq_download: 'تحميل / تصدير',
      pp_step_size: 'المقاس',
      pp_step_bg: 'الخلفية',
      pp_step_align: 'المحاذاة والإضاءة',
      pp_step_export: 'الطباعة والتصدير',
      pp_usage_hint: 'طريقة الاستخدام: ١. اختر المقاس الرسمي المطلوب \u2190 ٢. انتقل إلى تبويب (٢) الخلفية واضغط «إزالة وتبييض الخلفية تلقائياً» \u2190 ٣. اضبط موضع الرأس داخل الدليل والإضاءة \u2190 ٤. حمّل الصورة المفردة أو ورقة الطباعة.',
      pp_presets_title: 'المقاسات القياسية للوثائق (300 DPI)',
      pp_preset_40x60: '4 \u00d7 6 سم \u2014 جواز السفر والتأشيرات القياسي',
      pp_preset_35x45: '3.5 \u00d7 4.5 سم \u2014 الفيزا والتأشيرات البيومترية',
      pp_preset_51x51: '2 \u00d7 2 بوصة \u2014 جواز السفر والفيزا المربعة',
      pp_preset_50x70: '5 \u00d7 7 سم \u2014 جواز سفر كبير ووثائق رسمية',
      pp_preset_50x60: '5 \u00d7 6 سم \u2014 وثيقة رسمية بيومترية',
      pp_preset_30x40: '3 \u00d7 4 سم \u2014 صورة رسمية وتأشيرة مصغرة',
      pp_preset_25x35: '2.5 \u00d7 3.5 سم \u2014 صورة رسمية مصغرة',
      pp_preset_custom: 'مقاس مخصص',
      pp_preset_custom_sub: 'mm \u00b7 cm \u00b7 in \u00b7 px',
      pp_custom_dims: 'أبعاد مخصصة (300 DPI)',
      pp_unit: 'الوحدة',
      pp_bg_title: 'الخلفية الذكية',
      pp_btn_auto_bg: 'إزالة وتبييض الخلفية تلقائياً',
      pp_btn_keep_orig: 'الإبقاء على الخلفية الأصلية',
      pp_swatches_title: 'ألوان الخلفيات الرسمية',
      pp_sw_white: 'أبيض نقي (#FFFFFF)',
      pp_sw_offwhite: 'أبيض دافئ (#F8FAFC)',
      pp_sw_sky: 'أزرق سماوي (#D6ECFA)',
      pp_sw_royal: 'أزرق ملكي (#1E6FD9)',
      pp_sw_gray: 'رمادي فاتح (#E5E7EB)',
      pp_sw_red: 'أحمر رسمي (#D92626)',
      pp_brush_title: 'فرشاة تنعيم وتعديل الحواف',
      pp_brush_need_cutout: 'شغّل إزالة الخلفية أولاً',
      pp_brush_auto_mode: 'فعّل الخلفية الذكية لتعديل الحواف',
      pp_brush_ready: 'اسحب على الصورة لتعديل الحواف',
      pp_tool_pan: 'تحريك',
      pp_align_title: 'المحاذاة البيومترية',
      pp_btn_auto_center: 'توسيط تلقائي',
      pp_retouch_title: 'إضاءة الاستوديو وتنقية البشرة',
      pp_btn_auto_light: 'إضاءة استوديو تلقائية',
      pp_warmth: 'الدفء / توازن الأبيض',
      pp_skin_smooth: 'نعومة البشرة الطبيعية',
      pp_sheet_title: 'تخطيط ورقة الطباعة (300 DPI)',
      pp_copies_unit: 'نسخ',
      pp_sheet_gap: 'المسافة بين الصور',
      pp_cut_guides: 'علامات وحدود القص للطباعة',
      pp_export_title: 'تنزيل ملف جاهز للطباعة',
      pp_export_single: 'صورة مفردة',
      pp_export_sheet: 'ورقة الطباعة',
      pp_export_pdf: 'ملف PDF للطباعة (mm دقيق)',
      pp_guide_crown: 'أعلى الرأس',
      pp_guide_eyes: 'خط العينين',
      pp_guide_chin: 'الذقن',
      pp_err_type: 'يُرجى اختيار صورة بصيغة JPG أو PNG أو WebP أو BMP أو GIF',
      pp_err_size: 'حجم الصورة كبير جداً (الحد الأقصى 30 ميجابايت)',
      pp_err_dims: 'أبعاد الصورة تتجاوز الحد الأقصى 12,000 × 12,000 بكسل',
      pp_err_custom_dim: 'أدخل قيماً صالحة للعرض والارتفاع',
      pp_img_loaded: 'تم تحميل الصورة الشخصية بنجاح',
      pp_bg_done: 'تم تحديث الخلفية محلياً',
      pp_auto_light_ok: 'تم تطبيق إضاءة الاستوديو التلقائية',
      pp_size_updated: 'تم تطبيق المقاس المخصص بدقة 300 DPI',
      pp_export_ok: 'تم تصدير الملف بدقة 300 DPI بنجاح',
      pp_export_err: 'تعذّر تصدير ملف الصورة الشخصية',
      tm_meta_desc: 'صمّم صوراً مصغّرة احترافية وعالية النقر لليوتيوب والشورتس والريلز والسوشيال محلياً 100٪ داخل المتصفح بقوالب جاهزة، وإزالة الخلفية بالذكاء الاصطناعي، وطبقات صور متعددة، وخطوط عربية وإنجليزية بارزة، وأشكال وأسهم، ومعاينة حية في واجهة يوتيوب.',
      tm_usage_hint: 'طريقة الاستخدام: ١. اختر مقاس المنصة أو قالباً جاهزاً \u2190 ٢. أضف الصور والشعارات والملصقات مع إزالة الخلفية \u2190 ٣. نسّق العناوين العربية/الإنجليزية والأسهم والأشكال \u2190 ٤. عاين التصميم في واجهة يوتيوب وحمّل الملف بجودة عالية.',
      tm_tab_templates: 'القوالب',
      tm_tab_bg: 'الخلفية',
      tm_tab_subject: 'الصور',
      tm_tab_elements: 'النصوص والعناصر',
      tm_tab_export: 'التصدير',
      tm_tpl_title: 'قوالب احترافية جاهزة',
      tm_tpl_sub: 'قابلة للتخصيص بنقرة واحدة',
      tm_tpl_tech: 'تقنية وشروحات',
      tm_tpl_gaming: 'ألعاب وجيمنج',
      tm_tpl_podcast: 'بودكاست ومقابلات',
      tm_tpl_vs: 'قبل وبعد / تحدّي VS',
      tm_tpl_news: 'أخبار عاجلة',
      tm_tpl_vlog: 'فلوج ولايف ستايل',
      tm_tpl_note_t: 'سلوك القوالب الجاهزة',
      tm_tpl_note_d: 'عند اختيار أي قالب يتم بناء تصميم قابل للتعديل بالكامل مع الحفاظ على طبقات صورك المرفوعة داخل اللوحة.',
      tm_bg_colors: 'تدرّج وألوان الخلفية',
      tm_bg_c1: 'اللون 1',
      tm_bg_c2: 'اللون 2',
      tm_bg_angle: 'زاوية التدرّج',
      tm_bg_image_t: 'صورة خلفية مخصصة',
      tm_bg_upload: 'رفع خلفية مخصصة',
      tm_bg_clear: 'إزالة صورة الخلفية',
      tm_bg_blur: 'تمويه الخلفية',
      tm_bg_vignette: 'تعتيم الحواف (Vignette)',
      tm_subj_upload_t: 'الصور والشعارات والملصقات',
      tm_btn_upload_subj: '+ إضافة صورة / شعار / ملصق',
      tm_img_multi_note: 'ارفع عدداً غير محدود من الصور أو شعارات PNG أو الملصقات محلياً. حدّد أي طبقة صورة لإزالة خلفيتها بالذكاء الاصطناعي أو ضبط الحواف والإطار والظل.',
      tm_img_editing: 'تحرير',
      tm_btn_auto_cutout: 'إزالة الخلفية بنقرة واحدة',
      tm_btn_restore_subj: 'استعادة الصورة الأصلية',
      tm_subj_pop_t: 'الإطار والحدود والتوهّج الخلفي',
      tm_img_radius: 'تدوير الزوايا',
      tm_subj_outline: 'سماكة الإطار / حد القص',
      tm_outline_color: 'لون الحد',
      tm_subj_glow: 'توهّج الإضاءة الخلفية',
      tm_glow_color: 'لون التوهّج',
      tm_img_shadow: 'إسقاط الظل',
      tm_text_add_t: 'نصوص عالية النقر (CTR)',
      tm_btn_add_text: '+ إضافة عنوان بارز',
      tm_ctr_arrows_t: 'الأسهم والمؤشرات',
      tm_ctr_arrow_red: 'سهم أحمر منحنٍ',
      tm_ctr_arrow_yellow: 'سهم أصفر منحنٍ',
      tm_ctr_arrow_straight: 'سهم مستقيم',
      tm_ctr_arrow_double: 'سهم مزدوج',
      tm_ctr_trend_up: 'مؤشر صعود',
      tm_ctr_trend_down: 'مؤشر هبوط',
      tm_ctr_shapes_t: 'الأشكال والإطارات',
      tm_ctr_circle_red: 'حلقة تركيز',
      tm_shape_box: 'بطاقة مستديرة',
      tm_shape_ribbon: 'شريط مائل',
      tm_shape_burst: 'شارة انفجار',
      tm_shape_bubble: 'فقاعة حوار',
      tm_shape_neon: 'إطار نيون',
      tm_ctr_badges_t: 'كلمات وشارات جذابة',
      tm_ctr_emojis_t: 'ملصقات وإيموجي معبّرة',
      tm_export_title: 'تحميل بدقة عالية',
      tm_export_filename: 'اسم الملف',
      tm_btn_download: 'تحميل الصورة المصغّرة',
      tm_btn_copy: 'نسخ إلى الحافظة',
      tm_size_yt_hd: 'يوتيوب 16:9',
      tm_size_yt_fhd: 'Full HD 1080p',
      tm_size_shorts: 'شورتس / ريلز 9:16',
      tm_size_sq: 'مربع 1:1',
      tm_size_4_5: 'بورتريه 4:5',
      tm_safe_zone: 'منطقة الأمان',
      tm_btn_feed_preview: 'معاينة في واجهة يوتيوب',
      tm_ai_working: 'جارٍ إزالة خلفية الصورة محلياً\u2026',
      tm_mq_text: 'إضافة نص',
      tm_mq_photo: 'إضافة صورة',
      tm_mq_feed: 'معاينة يوتيوب',
      tm_mq_download: 'تحميل / تصدير',
      tm_export_modal_d: 'اختر صيغة PNG أو JPG واضبط جودة الضغط أو انسخ التصميم مباشرة إلى الحافظة.',
      tm_btn_dup: 'تكرار',
      tm_btn_delete: 'حذف الطبقة',
      tm_shortcuts_legend: 'الأسهم تحريك (Shift 10px) \u00b7 Del حذف الطبقة \u00b7 Ctrl+D تكرار \u00b7 Ctrl+Z/Y تراجع/إعادة \u00b7 P معاينة يوتيوب \u00b7 Space لمعاينة الأصل \u00b7 Ctrl+S تصدير',
      tm_insp_title: 'خصائص الطبقة',
      tm_no_selection: 'حدّد أي طبقة على اللوحة لتعديل نصها أو ألوانها أو حدودها أو تدويرها.',
      tm_prop_text: 'محتوى النص (عربي / EN)',
      tm_prop_font: 'نوع الخط (عربي / EN)',
      tm_fonts_ar_grp: 'الخطوط العربية (١٢)',
      tm_fonts_en_grp: 'الخطوط الإنجليزية (١٢)',
      tm_prop_size: 'حجم الخط',
      tm_prop_fill1: 'لون النص',
      tm_prop_fill2: 'تدرّج 2',
      tm_prop_grad_on: 'تفعيل تدرّج ألوان النص',
      tm_prop_stroke: 'حد التباين الخارجي',
      tm_prop_shadow: 'ظل ثلاثي الأبعاد',
      tm_prop_banner: 'شريط خلفية مائل للنص',
      tm_prop_banner_c: 'لون الشريط',
      tm_prop_skew: 'درجة الميل (\u00b0)',
      tm_prop_badge_txt: 'نص الشارة',
      tm_prop_accent: 'اللون البارز',
      tm_prop_scale: 'التكبير',
      tm_prop_rot: 'الدوران',
      tm_prop_opacity: 'الشفافية',
      tm_btn_center: 'توسيط',
      tm_layers_title: 'مدير الطبقات',
      tm_feed_modal_t: 'معاينة حية في واجهة يوتيوب',
      tm_feed_modal_d: 'اختبر وضوح النص وجاذبية الصورة بجانب الفيديوهات المنافسة بمقاسات يوتيوب الحقيقية.',
      tm_feed_desktop: 'عرض سطح المكتب',
      tm_feed_mobile: 'عرض الجوال',
      tm_feed_dark: 'الوضع الداكن',
      tm_feed_light: 'الوضع الفاتح',
      tm_feed_title_ph: 'اكتب عنوان الفيديو للتجربة هنا\u2026',
      tm_feed_chan_ph: 'اسم القناة',
      tm_ltype_text: 'نص',
      tm_ltype_badge: 'شارة',
      tm_ltype_emoji: 'إيموجي',
      tm_ltype_image: 'صورة',
      tm_ltype_subject: 'صورة',
      tm_ltype_arrow: 'سهم',
      tm_ltype_shape: 'شكل',
      tm_ltype_spotlight: 'شكل',
      tm_layer_vis: 'إظهار/إخفاء الطبقة',
      tm_layer_lock: 'قفل/فتح الطبقة',
      tm_layer_up: 'رفع الطبقة للأعلى',
      tm_layer_down: 'خفض الطبقة للأسفل',
      tm_subj_loaded: 'تمت إضافة طبقة الصورة إلى اللوحة',
      tm_bg_loaded: 'تم تحديث صورة الخلفية',
      tm_need_subj: 'يُرجى تحديد أو رفع طبقة صورة أولاً',
      tm_cutout_ok: 'تمت إزالة الخلفية بنجاح',
      tm_feed_default_title: 'كيف تضاعف نسبة النقر CTR لفيديوهاتك في ٥ دقائق!',
      tm_feed_default_chan: 'استوديو المبدعين',
      tm_feed_yours: 'تصميمك الحالي',
      tm_export_ok: 'تم تحميل الصورة المصغّرة بنجاح',
      tm_export_err: 'تعذّر تصدير الصورة المصغّرة',
      tm_copy_ok: 'تم نسخ الصورة المصغّرة إلى الحافظة',
      tm_copy_unsupported: 'نسخ الصور إلى الحافظة غير مدعوم في هذا المتصفح',
      // استوديو الملصقات والميمز والبطاقات
      ss_meta_desc: 'استوديو إبداعي ٤ في ١ داخل متصفحك: صانع الملصقات المقصوصة لواتساب وألواح الطباعة A4 بالذكاء الاصطناعي، صانع الميمز، بطاقات المعايدة واللوحات، وشارات المتاجر والعروض — محلي 100٪ بدون رفع.',
      ss_usage_hint: 'اختر وضع العمل بالأعلى (ملصقات مقصوصة، ميمز، بطاقات معايدة ولوحات، أو شارات المتاجر)، خصّص القص والنصوص والعناصر محلياً، ثم صدّر PNG أو JPG أو PDF للطباعة.',
      ss_mode_sticker_t: 'ملصقات مقصوصة',
      ss_mode_sticker_s: 'قص ذكي · واتساب 512px · ألواح طباعة',
      ss_mode_meme_t: 'صانع الميمز',
      ss_mode_meme_s: '١٨ قالباً · فقاعات حوار · تعليقات بارزة',
      ss_mode_card_t: 'بطاقات معايدة ولوحات',
      ss_mode_card_s: 'بطاقات · لوحات جدارية · صور مؤطرة · PDF',
      ss_mode_badge_t: 'شارات المتاجر والعروض',
      ss_mode_badge_s: '١٦ شكلاً · دمج مع صور المنتجات · عروض',
      ss_st_tab_cutout: 'القص والفرشاة',
      ss_st_tab_outline: 'الإطار والمظهر',
      ss_st_tab_phrases: 'العبارات والنص',
      ss_st_tab_pack: 'حزمة الملصقات',
      ss_st_tab_export: 'التصدير والطباعة',
      ss_upload_photo_t: 'الصورة وإزالة الخلفية بالذكاء الاصطناعي',
      ss_btn_upload_photo: 'رفع صورة (PNG / JPG / WebP)',
      ss_btn_ai_cutout: 'إزالة الخلفية تلقائياً (AI)',
      ss_btn_restore_orig: 'استعادة الصورة الأصلية',
      ss_btn_remove_photo: 'إزالة الصورة',
      ss_brush_t: 'فرشاة تنعيم الحواف',
      ss_tool_move: 'تحريك / تحجيم',
      ss_tool_restore: 'استعادة',
      ss_tool_erase: 'مسح',
      ss_brush_size: 'حجم الفرشاة',
      ss_brush_undo: 'تراجع عن الضربة',
      ss_brush_redo: 'إعادة الضربة',
      ss_brush_hint_empty: 'ارفع صورة بالأعلى لتفعيل إزالة الخلفية بالذكاء الاصطناعي وفرشاة تعديل الحواف.',
      ss_brush_hint_run_ai: 'اضغط «إزالة الخلفية تلقائياً (AI)» أولاً، ثم استخدم فرشاة الاستعادة أو المسح لضبط الحواف الدقيقة.',
      ss_brush_hint_ready: 'انتقل إلى «استعادة» أو «مسح» وارسم مباشرة على اللوحة لضبط حواف القص.',
      ss_geom_cutout_t: 'قص بأشكال هندسية',
      ss_shape_free: 'حر / أصلي',
      ss_shape_circle: 'دائرة',
      ss_shape_rounded: 'مربع مستدير',
      ss_shape_heart: 'قلب',
      ss_shape_star: 'نجمة',
      ss_shape_hex: 'سداسي',
      ss_outline_engine_t: 'محرك حدود الملصق المقصوص',
      ss_outline_w: 'سُمك الإطار الخارجي',
      ss_outline_c: 'لون الإطار الخارجي',
      ss_outline_note: 'يلتف الإطار الانسيابي حول العنصر المقصوص وأي نصوص مدمجة ليشكّل ملصقاً مقصوصاً متصلاً واحداً.',
      ss_sticker_finish_t: 'ملمس الملصق والظل',
      ss_drop_shadow: 'ظل ثلاثي الأبعاد',
      ss_vinyl_gloss: 'لمعة فينيل لامعة',
      ss_phrases_t: 'عبارات جاهزة بالعربية والإنجليزية',
      ss_pcat_greetings: 'تحيات يومية',
      ss_pcat_reactions: 'ردود أفعال المحادثة',
      ss_pcat_store: 'المتاجر والعروض',
      ss_pcat_occasions: 'الأعياد والمناسبات',
      ss_btn_add_text: '+ إضافة نص مخصص',
      ss_pack_title: '٤٢ ملصقاً جاهزاً بالرسوم',
      ss_pack_note: 'انقر على أي ملصق لإضافته إلى اللوحة — حرّكه أو كبّره أو دوّره أو ادمجه مع حد القص الأبيض.',
      ss_st_export_t: 'تصدير ملصق بخلفية شفافة',
      ss_btn_export_wa: 'تحميل ملصق واتساب / تيليجرام (512×512 PNG)',
      ss_btn_export_full: 'تحميل PNG شفاف بأعلى دقة',
      ss_btn_chat_preview: 'معاينة داخل محادثة واتساب وتيليجرام',
      ss_print_sheet_t: 'لوح طباعة ملصقات جاهز (300 DPI)',
      ss_sheet_cols: 'الأعمدة',
      ss_sheet_rows: 'الصفوف',
      ss_btn_sheet_png: 'تحميل لوح الطباعة PNG',
      ss_btn_sheet_pdf: 'تحميل PDF للطباعة (A4 / 4×6)',
      ss_mm_tab_tpl: 'القوالب',
      ss_mm_tab_media: 'الصور',
      ss_mm_tab_cap: 'النصوص والفقاعات',
      ss_mm_tab_export: 'التصدير',
      ss_mm_tpl_title: '١٨ قالباً للميمز الكلاسيكية والحديثة',
      ss_mm_custom_img_t: 'صورة ميم مخصصة وطبقات إضافية',
      ss_mm_upload_bg: 'رفع صورة خلفية للميم',
      ss_mm_clear_bg: 'إزالة الخلفية المخصصة',
      ss_btn_add_layer_img: '+ إضافة طبقة صورة',
      ss_mm_quick_cap: 'نصوص الميم السريعة (أعلى / أسفل)',
      ss_mm_top_lbl: 'النص العلوي',
      ss_mm_bot_lbl: 'النص السفلي',
      ss_mm_reset_caps: 'استعادة النصوص الافتراضية',
      ss_mm_bubbles_t: 'فقاعات حوار وكوميكس',
      ss_bubble_speech: 'فقاعة كلام',
      ss_bubble_thought: 'سحابة تفكير',
      ss_bubble_shout: 'انفجار صراخ',
      ss_bubble_box: 'صندوق تعليق',
      ss_mm_add_txt: '+ إضافة طبقة نص عادية',
      ss_mm_export_t: 'تحميل الميم',
      ss_cd_tab_frames: 'الخلفيات والإطارات',
      ss_cd_tab_quotes: 'البطاقات والاقتباسات',
      ss_cd_tab_photo: 'إدراج صورة',
      ss_cd_tab_export: 'التصدير والطباعة',
      ss_cd_bg_t: 'خلفيات فاخرة للبطاقات',
      ss_cd_bg_upload_lbl: 'رفع خلفية مخصصة للبطاقة',
      ss_cd_clear_bg: 'استخدام خلفية جاهزة',
      ss_cd_border_t: 'إطارات مزخرفة وبسيطة',
      ss_cd_accent: 'لون الإطار والزخرفة',
      ss_cd_library_t: 'تهاني واقتباسات ملهمة',
      ss_cd_cat_quotes: 'اقتباسات ولوحات جدارية',
      ss_cd_sig_t: 'اسم المُهدى إليه والمُرسل',
      ss_cd_recipient: 'سطر المُهدى إليه (أعلى)',
      ss_cd_sender: 'توقيع المُرسل (أسفل)',
      ss_cd_add_text: '+ إضافة نص مخصص للبطاقة',
      ss_cd_photo_frame_t: 'شكل إطار الصورة',
      ss_pframe_arch: 'قوس',
      ss_cd_insert_photo: '+ إدراج صورة داخل الإطار',
      ss_cd_export_t: 'تصدير البطاقة أو طباعة اللوحة',
      ss_bd_tab_shapes: 'الأشكال والألوان',
      ss_bd_tab_copy: 'نصوص العرض',
      ss_bd_tab_product: 'صورة المنتج',
      ss_bd_tab_export: 'التصدير',
      ss_bd_shapes_t: '١٦ شكلاً لشارات المتاجر والعروض',
      ss_bd_themes_t: 'ثيمات لونية جاهزة',
      ss_bd_col1: 'الأساسي',
      ss_bd_col2: 'الثانوي',
      ss_bd_col_txt: 'النص',
      ss_bd_text_t: 'العنوان الرئيسي والفرعي للشارة',
      ss_bd_main_lbl: 'العنوان الرئيسي',
      ss_bd_sub_lbl: 'النص الفرعي',
      ss_bd_presets_t: 'عبارات عروض جاهزة للمتاجر',
      ss_bd_add_extra: '+ إضافة سعر أو وسم عائم',
      ss_bd_prod_t: 'خلفية صورة المنتج (اختياري)',
      ss_bd_prod_note: 'اتركه فارغاً لتصدير الشارة بصيغة PNG شفافة مستقلة، أو ارفع صورة منتج لدمج شارة العرض فوقها مباشرة.',
      ss_bd_upload_prod: 'رفع صورة منتج',
      ss_bd_clear_prod: 'إزالة صورة المنتج',
      ss_bd_export_t: 'تحميل شارة العرض',
      ss_btn_dl_png: 'تحميل PNG عالي الدقة',
      ss_btn_dl_trans_png: 'تحميل PNG بخلفية شفافة',
      ss_btn_dl_jpg: 'تحميل JPG',
      ss_btn_dl_pdf: 'تحميل PDF جاهز للطباعة',
      ss_checker_btn: 'تبديل خلفية الشفافية',
      ss_shortcuts_legend: 'الأسهم تحريك (Shift 10px) · Del حذف الطبقة · Ctrl+D تكرار · Ctrl+Z/Y تراجع/إعادة · C معاينة الشات · Space لمعاينة الأصل · Ctrl+S تصدير',
      ss_export_modal_d: 'حمّل تصميماً عالي الدقة بصيغة PNG شفاف أو JPG أو ملصق واتساب 512×512 أو لوح طباعة 300 DPI.',
      ss_mq_upload: 'رفع',
      ss_mq_text: 'إضافة نص',
      ss_mq_chat: 'معاينة شات',
      ss_mq_peek: 'معاينة الأصل',
      ss_mq_download: 'تحميل / تصدير',
      ss_insp_title: 'الخصائص والطبقات',
      ss_btn_dup: 'تكرار',
      ss_btn_del: 'حذف',
      ss_no_selection: 'انقر على أي نص أو صورة أو ملصق على اللوحة لتعديل الخط والألوان ونوع الإطار والحجم والتدوير.',
      ss_prop_text: 'محتوى النص',
      ss_prop_font: 'نوع الخط (عربي / إنجليزي)',
      ss_prop_size: 'حجم الخط',
      ss_prop_tframe: 'نمط الإطار',
      ss_tf_plain: 'نص عادي / محدد',
      ss_tf_fused: 'خلفية مدمجة بالملصق',
      ss_tf_pill: 'شريط دائري الحواف',
      ss_tf_bubble: 'فقاعة حوار',
      ss_prop_fill: 'لون النص',
      ss_prop_stroke_c: 'لون الحد الخارجي',
      ss_prop_frame_bg: 'لون تعبئة الإطار',
      ss_prop_stroke_w: 'سُمك تحديد النص',
      ss_prop_fuse: 'دمج النص داخل الإطار الأبيض للملصق',
      ss_prop_scale: 'الحجم',
      ss_prop_rot: 'التدوير',
      ss_prop_opacity: 'الشفافية',
      ss_btn_center: 'توسيط في اللوحة',
      ss_layers_t: 'ترتيب الطبقات',
      ss_btn_upload_short: '+ رفع صورة',
      ss_btn_chat_short: 'معاينة الشات',
      ss_chat_modal_t: 'معاينة ملصق واتساب وتيليجرام',
      ss_chat_modal_d: 'تحقق من وضوح الملصق وحدوده الشفافة على الخلفيات الفاتحة والداكنة قبل الإرسال.',
      ss_chat_light: 'الوضع الفاتح',
      ss_chat_dark: 'الوضع الداكن',
      ss_chat_sample_in: 'أرسلت لك الملصق الجديد للتو!',
      ss_chat_sample_out: 'واضح جداً وحدوده المقصوصة متقنة!',
      ss_pr_st_full: 'استوديو 1024px',
      ss_pr_st_wa: 'واتساب 512px',
      ss_pr_sq: 'مربع 1:1',
      ss_pr_classic: 'كلاسيكي 4:3',
      ss_pr_port: 'عمودي 4:5',
      ss_pr_story: 'ستوري 9:16',
      ss_pr_a4: 'ملصق A4 للطباعة',
      ss_pr_bd_sq: 'شارة 1000px',
      ss_pr_bd_prod: 'منتج 1200px',
      ss_ai_working: 'جارٍ تشغيل نموذج القص الذكي محلياً داخل متصفحك…',
      ss_cutout_ok: 'تمت إزالة الخلفية بنجاح',
      ss_photo_loaded: 'تمت إضافة الصورة إلى اللوحة',
      ss_bg_loaded: 'تم تحديث الخلفية المخصصة',
      ss_export_ok: 'تم التصدير بنجاح',
      ss_export_err: 'تعذّر تصدير التصميم',
      ss_framed_text_t: 'صورة مؤطرة',
      ss_ltype_text: 'طبقة نص',
      ss_ltype_graphic: 'ملصق رسومي',
      ss_ltype_image: 'طبقة صورة',
      ss_ltype_promoBadge: 'شارة عرض',
      ss_layer_vis: 'إظهار/إخفاء الطبقة',
      ss_layer_lock: 'قفل/فتح الطبقة',
      ss_layer_up: 'رفع الطبقة للأعلى',
      ss_layer_down: 'خفض الطبقة للأسفل',
      // Photo to Coloring Page Studio (cp_*)
      cp_meta_desc: 'حوّل الصور إلى صفحات تلوين خطية بالأبيض والأسود جاهزة للطباعة محلياً 100% في متصفحك مع 4 أنماط رسم وعزل الخلفية بالذكاء الاصطناعي وممحاة تنظيف وإطارات زخرفية وتصدير PDF بدقة 300 DPI.',
      cp_usage_hint: 'طريقة الاستخدام: ١. ارفع أي صورة (أو الصق Ctrl+V) ← ٢. اختر نمط الرسم الخطي واضغط «عزل العنصر» عند الحاجة لإزالة الخلفية المزدحمة ← ٣. اضبط السماكة ونظّف الزوائد بالممحاة ← ٤. اطبع مباشرة أو حمّل PDF بمقاس A4.',
      cp_drop_title: 'أفلت صورتك هنا، تصفح، أو الصق (Ctrl+V)',
      cp_drop_sub: 'JPG و PNG و WebP و BMP و GIF (حد أقصى 30 ميجا · 12,000 بكسل) · محلي 100%',
      cp_ai_working: 'جارٍ عزل العنصر الرئيسي وتبييض الخلفية محلياً داخل متصفحك…',
      cp_mq_download: 'تحميل / تصدير',
      cp_mq_peek: 'معاينة الأصل',
      cp_mq_eraser: 'ممحاة',
      cp_btn_eraser: 'ممحاة التنظيف اليدوي',
      cp_shortcuts_legend: '1-4 نمط الرسم · E الممحاة · استمر بالضغط على Space للمقارنة · Ctrl+Z تراجع · Ctrl+P طباعة · Ctrl+S تصدير',
      cp_tab_style: 'نمط الرسم',
      cp_tab_refine: 'التحسين والتنظيف',
      cp_tab_page: 'الصفحة والعنوان',
      cp_styles_title: 'أنماط الرسم الخطي (4 خوارزميات)',
      cp_style_classic_t: 'تلوين أطفال كلاسيكي',
      cp_style_classic_d: 'حدود خارجية نظيفة ومساحات واسعة ومفتوحة للتلوين بألوان الشمع',
      cp_style_comic_t: 'خطوط كوميكس بارزة',
      cp_style_comic_d: 'حبر أسود سميك وعالي التباين مناسب للكرتون والألعاب والسيارات',
      cp_style_pencil_t: 'رسم بقلم الرصاص الفني',
      cp_style_pencil_d: 'تظليل جرافيت ناعم وخطوط ملمس طبيعية كالرسم اليدوي',
      cp_style_mandala_t: 'ماندالا وتفاصيل دقيقة',
      cp_style_mandala_d: 'استخراج خطوط متشابكة ودقيقة مخصصة لصفحات تلوين الكبار',
      cp_isolate_title: 'عزل العنصر بالذكاء الاصطناعي',
      cp_isolate_note: 'أزل خلفيات الغرف أو الشوارع المزدحمة محلياً بالذكاء الاصطناعي ليظهر العنصر الرئيسي فقط فوق صفحة بيضاء ناصعة.',
      cp_btn_isolate: 'عزل العنصر الرئيسي وإزالة الخلفية المزدحمة',
      cp_btn_restore_full: 'استعادة خلفية الصورة الكاملة',
      cp_refine_title: 'ضبط سماكة الخطوط والبياض',
      cp_thickness: 'سماكة الخطوط ووضوحها',
      cp_denoise: 'تنظيف الضوضاء وتبييض الخلفية',
      cp_eraser_title: 'ممحاة التنظيف اليدوي',
      cp_eraser_note: 'امسح مباشرة فوق أي خطوط عشوائية أو نقاط غير مرغوبة لتحويلها إلى أبيض ناصع قبل الطباعة.',
      cp_eraser_size: 'حجم فرشاة الممحاة',
      cp_btn_clear_eraser: 'مسح تعديلات الممحاة',
      cp_paper_title: 'مقاس ورق الطباعة (300 DPI)',
      cp_paper_a4p: 'ورق A4 طولي',
      cp_paper_a4l: 'ورق A4 عرضي',
      cp_paper_letter: 'US Letter أمريكي',
      cp_paper_square: 'مربع (1:1)',
      cp_frame_title: 'الإطار الزخرفي والعنوان',
      cp_frame_toggle: 'إضافة إطار زخرفي لصفحة التلوين',
      cp_fstyle_classic: 'إطار مزدوج كلاسيكي',
      cp_fstyle_scallop: 'إطار مموّج للأطفال',
      cp_fstyle_stars: 'نجوم الزوايا',
      cp_fstyle_rounded: 'إطار دائري نظيف',
      cp_title_label: 'عنوان أعلى الصفحة / اسم الطفل',
      cp_title_ph: 'لوحة البطل آدم / Adam\'s Coloring Page',
      cp_tstyle_outline: 'نص مفرّغ قابل للتلوين',
      cp_tstyle_solid: 'حبر أسود ممتلئ',
      cp_export_modal_d: 'اطبع الصفحة مباشرة على الورق أو حمّلها بدقة طباعة 300 DPI بصيغ PDF و PNG و JPG.',
      cp_btn_direct_print: 'طباعة صفحة التلوين الآن',
      cp_btn_dl_pdf: 'تحميل PDF جاهز للطباعة (300 DPI)',
      cp_btn_dl_png: 'تحميل PNG (دقة عالية)',
      cp_btn_dl_jpg: 'تحميل JPG',
      cp_img_loaded: 'تم تحويل الصورة إلى صفحة تلوين بنجاح',
      cp_err_dims: 'أبعاد الصورة تتجاوز الحد الأقصى 12,000 بكسل',
      cp_isolated_ok: 'تم عزل العنصر وتنظيف الخلفية بنجاح',
      cp_restored_full: 'تمت استعادة كامل خلفية الصورة',
      cp_eraser_cleared: 'تم مسح ضربات الممحاة',
      cp_export_ok: 'تم تصدير صفحة التلوين بنجاح',
      cp_export_err: 'تعذّر تصدير صفحة التلوين',
      // Wallpaper & Pattern Generator Studio (wg_*)
      wg_meta_desc: 'أنشئ خلفيات بدقة 4K وأنماطاً هندسية متكررة محلياً 100% في متصفحك عبر 9 محركات توليد (تدرجات Aurora، الموجات، الزخارف الإسلامية، المضلعات، باوهاوس، السديم الفضائي والبوكيه، الجبال والغروب، المدينة الليلية، والخطوط الطبوغرافية) مع تمويه زجاجي للصور وتصدير PNG وJPG وSVG.',
      wg_usage_hint: 'طريقة الاستخدام: ١. اختر نمط التوليد ومقاس الشاشة (جوال، 4K، آيباد، مربع) ← ٢. اضغط «توليد عشوائي ذكي ✨» أو خصّص الألوان والتحبب السينمائي ← ٣. فعّل «معاينة شاشة القفل» للتأكد من وضوح الساعة ← ٤. صدّر بدقة 4K بصيغة PNG أو JPG أو SVG.',
      wg_btn_shuffle: 'توليد عشوائي ذكي ✨',
      wg_btn_lock_preview: 'معاينة شاشة القفل',
      wg_btn_export: 'تصدير / تحميل',
      wg_mq_download: 'تحميل / تصدير',
      wg_mq_shuffle: 'توليد عشوائي ✨',
      wg_mq_lock: 'شاشة القفل',
      wg_shortcuts_legend: 'Space توليد عشوائي · 1-9 نمط التوليد · L معاينة شاشة القفل · Ctrl+Z تراجع · Ctrl+S تصدير',
      wg_tab_style: 'النمط',
      wg_tab_colors: 'الألوان واللوحات',
      wg_tab_details: 'التفاصيل والتحبب',
      wg_styles_title: 'أنماط التوليد الإبداعي (9 محركات)',
      wg_style_mesh_t: 'تدرجات ضبابية ناعمة (Mesh & Aurora)',
      wg_style_mesh_d: 'حقول إضاءة ضبابية متعددة النقاط وتدرجات شفق قطبي سلسة',
      wg_style_waves_t: 'موجات وطبقات متدرجة',
      wg_style_waves_d: 'موجات رياضية انسيابية متعددة الطبقات مع ظلال عمق ناعمة',
      wg_style_pattern_t: 'أنماط وزخارف هندسية وإسلامية',
      wg_style_pattern_d: 'سُداسيات ودوائر متداخلة ونجوم إسلامية ومثلثات قابلة للتكرار',
      wg_style_lowpoly_t: 'تأثير الزجاج المضلع (Low-Poly)',
      wg_style_lowpoly_d: 'شبكة مثلثات بلورية ثلاثية الأبعاد بظلال هندسية متعددة الأوجه',
      wg_style_abstract_t: 'أشكال تجريدية حديثة (Bauhaus)',
      wg_style_abstract_d: 'تراكيب حديثة متوازنة من الأقواس والدوائر والخطوط والكتل النظيفة',
      wg_style_nebula_t: 'إضاءة ونجوم وبوكيه سينمائي',
      wg_style_nebula_d: 'حقول سديم فضائي متوهجة ودوائر بوكيه ناعمة وبريق نجوم سينمائي',
      wg_style_mountain_t: 'طبيعة وجبال عند الغروب',
      wg_style_mountain_d: 'سلاسل جبلية متدرجة مع ضباب متلاشٍ وشمس أو قمر متوهج',
      wg_style_city_t: 'أفق مدينة ليلية هادئة',
      wg_style_city_d: 'مبانٍ هندسية ليلية بنوافذ مضيئة وانعكاس هادئ على سطح الماء',
      wg_style_topo_t: 'خطوط طبوغرافية انسيابية',
      wg_style_topo_d: 'منحنيات ارتفاع عضوية ناعمة بسُمك وتدرج قابل للتخصيص',
      wg_base_photo_title: 'دمج صورة خلفية اختيارية',
      wg_btn_clear_photo: 'إزالة الصورة',
      wg_btn_upload_photo: 'رفع صورة للخلفية',
      wg_base_photo_note: 'أضف تمويهاً زجاجياً ناعماً وإضاءة لونية متدرجة وتحبيباً سينمائياً فوق صورتك محلياً.',
      wg_photo_blur: 'التمويه الزجاجي (Glassmorphism Blur)',
      wg_photo_overlay: 'شدة طبقة الإضاءة اللونية',
      wg_photo_blend: 'نمط الدمج اللوني:',
      wg_blend_screen: 'توهّج ناعم',
      wg_blend_soft: 'إضاءة ناعمة',
      wg_blend_tint: 'تلوين متدرج',
      wg_photo_err_type: 'يرجى رفع صورة صالحة بصيغة JPG أو PNG أو WebP أو BMP أو GIF أو SVG آمن',
      wg_photo_err_size: 'حجم الصورة يتجاوز الحد الأقصى 30 ميجابايت',
      wg_photo_err_dims: 'أبعاد الصورة تتجاوز الحد الأقصى 12,000 بكسل',
      wg_photo_loaded: 'تم تطبيق الصورة مع التمويه الزجاجي بنجاح',
      wg_screen_title: 'مقاسات الشاشة الجاهزة (حتى 4K)',
      wg_size_mobile: 'خلفية جوال',
      wg_size_4k: 'سطح مكتب 4K',
      wg_size_fhd: 'سطح مكتب Full HD',
      wg_size_tablet: 'آيباد / تابلت',
      wg_size_square: 'مربع للسوشيال',
      wg_size_custom: 'مقاس مخصص',
      wg_size_custom_sub: 'حتى 4096 بكسل',
      wg_top_mobile: 'جوال 9:19.5',
      wg_top_4k: 'سطح مكتب 4K',
      wg_top_fhd: 'Full HD',
      wg_top_tablet: 'آيباد / تابلت',
      wg_top_square: 'مربع 1:1',
      wg_top_custom: 'مخصص',
      wg_custom_w: 'العرض (بكسل)',
      wg_custom_h: 'الارتفاع (بكسل)',
      wg_apply_dims: 'تطبيق',
      wg_size_applied: 'تم تحديث أبعاد الخلفية',
      wg_palettes_title: 'لوحات ألوان احترافية (18 لوحة)',
      wg_custom_colors_title: 'تخصيص ألوان اللوحة',
      wg_btn_reverse: 'عكس الألوان',
      wg_color_count: 'عدد الألوان النشطة:',
      wg_color_slot: 'لون',
      wg_pal_aurora: 'شفق الليل',
      wg_pal_sunset: 'توهج الغروب',
      wg_pal_royalgold: 'الذهب الملكي',
      wg_pal_pastel: 'باستيل هادئ',
      wg_pal_cyberneon: 'نيون سايبر',
      wg_pal_oceandeep: 'أعماق المحيط',
      wg_pal_desertsand: 'رمال الصحراء',
      wg_pal_monochrome: 'أحادي بسيط',
      wg_pal_emerald: 'غابة الزمرد',
      wg_pal_rosequartz: 'كوارتز وردي',
      wg_pal_nordic: 'جليد شمالي',
      wg_pal_volcanic: 'جمر بركاني',
      wg_pal_lavender: 'حلم اللافندر',
      wg_pal_midnight: 'نيلي منتصف الليل',
      wg_pal_terracotta: 'شمس التراكوتا',
      wg_pal_mintsoda: 'نعناع منعش',
      wg_pal_warmlatte: 'لاتيه دافئ',
      wg_pal_imperial: 'تركواز إمبراطوري',
      wg_geometry_title: 'البنية والزاوية والتكوين',
      wg_density: 'التعقيد والكثافة',
      wg_angle: 'زاوية الانسياب والدوران',
      wg_smoothness: 'التباين والنعومة',
      wg_btn_reseed: 'توليد تكوين جديد (مع نفس الألوان)',
      wg_pattern_opts_title: 'الزخرفة الهندسية والإسلامية',
      wg_motif_star8: 'نجمة إسلامية',
      wg_motif_hex: 'سداسيات',
      wg_motif_circles: 'دوائر متداخلة',
      wg_motif_triangles: 'مثلثات هندسية',
      wg_seamless_toggle: 'تكرار سلس بلا حواف (Seamless Tile)',
      wg_badge_seamless: 'نمط متكرر سلس',
      wg_grain_title: 'التحبب السينمائي وملمس السطح',
      wg_grain: 'درجة التحبب / الملمس (Grain)',
      wg_grain_note: 'يضيف تحبباً سينمائياً ناعماً لمنع تدرجات الألوان الحادة على شاشات OLED عالية الدقة.',
      wg_export_modal_d: 'إنشاء وتصدير الخلفية بالدقة الكاملة الحقيقية (حتى 4K 3840 × 2160 بكسل) محلياً داخل متصفحك.',
      wg_btn_dl_png: 'تحميل PNG بدقة عالية (حتى 4K)',
      wg_btn_dl_jpg: 'تحميل JPG عالي الجودة',
      wg_btn_dl_svg: 'تحميل ملف فيكتور SVG',
      wg_svg_note_supported: 'تصدير SVG فيكتور فائق الدقة متاح لأنماط الموجات والزخارف والمضلعات وباوهاوس والجبال والمدينة والخطوط الطبوغرافية.',
      wg_svg_note_raster: 'تصدير SVG متاح للموجات والزخارف والمضلعات وباوهاوس والجبال والمدينة والطبوغرافية. استخدم 4K PNG أو JPG لتدرجات Mesh والسديم.',
      wg_svg_note_photo: 'تصدير SVG غير متاح أثناء استخدام صورة خلفية نقطية — أزل الصورة أو صدّر بصيغة 4K PNG أو JPG.',
      wg_export_ok: 'تم تصدير الخلفية بنجاح',
      wg_export_err: 'تعذّر تصدير الخلفية',
      // صانع الصور الشخصية للمنصات (pfp_*)
      pfp_meta_desc: 'صمّم صور بروفايل شخصية احترافية (PFP) محلياً 100% في متصفحك مع عزل الخلفية بالذكاء الاصطناعي، وفرشاة تنعيم الحواف، و46 خلفية استوديو، و6 أشكال و18 إطاراً بتأثير 3D، وشارات ونصوص مقوّسة، ومعاينة حية للمنصات وتصدير PNG وJPG وZIP.',
      pfp_usage_hint: 'طريقة الاستخدام: ١. ارفع صورتك الشخصية ← ٢. اضغط «إزالة الخلفية بالذكاء الاصطناعي» وهذّب الحواف عند الحاجة ← ٣. اختر خلفية من ٤٦ تصميم، وإطار 3D وشارة ← ٤. عاين الشكل على لينكدإن وإنستغرام وإكس ثم صدّر PNG أو حزمة ZIP.',
      pfp_btn_social_preview: 'معاينة المنصات',
      pfp_btn_replace: 'استبدال الصورة',
      pfp_btn_export: 'تصدير / تحميل',
      pfp_drop_title: 'أفلت أو ارفع صورتك الشخصية',
      pfp_drop_desc: 'معالجة محلية 100٪ بخصوصية تامة داخل متصفحك — يدعم JPG و PNG و WebP و BMP و GIF و SVG آمن (حد أقصى 30 ميجابايت).',
      pfp_btn_upload: 'رفع صورة',
      pfp_ai_running: 'جارٍ عزل الشخصية بالذكاء الاصطناعي المحلي…',
      pfp_ai_done: 'تمت إزالة الخلفية بنظافة',
      pfp_ai_err: 'تعذّر عزل الخلفية بالذكاء الاصطناعي — جرّب صورة أخرى',
      pfp_mq_export: 'تصدير / ZIP',
      pfp_mq_social: 'معاينة المنصات',
      pfp_mq_center: 'توسيط',
      pfp_btn_center: 'توسيط تلقائي',
      pfp_btn_peek: 'معاينة الأصل',
      pfp_btn_reset_frame: 'إعادة ضبط الإطار',
      pfp_shortcuts_legend: 'سحب تحريك · عجلة تكبير · Space (مُطوّلاً) معاينة الأصل · C توسيط · P معاينة المنصات · Ctrl+Z تراجع · Ctrl+S تصدير',
      pfp_tab_photo: 'الصورة والعزل',
      pfp_tab_bg: 'الخلفيات (46+)',
      pfp_tab_rings: 'الإطارات والشارات',
      pfp_cutout_title: 'عزل الشخصية بالذكاء الاصطناعي',
      pfp_btn_ai_cutout: 'إزالة الخلفية بالذكاء الاصطناعي',
      pfp_btn_keep_orig: 'الإبقاء على الخلفية الأصلية',
      pfp_brush_title: 'فرشاة تنعيم وتعديل الحواف',
      pfp_brush_hint: 'استخدم الاستعادة أو المسح لضبط تفاصيل الشعر أو الملابس (أو اختر التحريك لضبط موضع الوجه).',
      pfp_tool_pan: 'تحريك الصورة',
      pfp_tool_restore: 'استعادة',
      pfp_tool_erase: 'مسح',
      pfp_brush_size: 'حجم الفرشاة',
      pfp_redo: 'إعادة',
      pfp_framing_title: 'التأطير والتكبير وإضاءة الاستوديو',
      pfp_zoom: 'التكبير',
      pfp_rotate: 'الإمالة / التدوير',
      pfp_btn_rot90: 'تدوير 90°',
      pfp_btn_flip: 'قلب أفقي',
      pfp_brightness: 'السطوع',
      pfp_contrast: 'التباين',
      pfp_warmth: 'الدفء اللوني',
      pfp_bw_toggle: 'تحويل الشخص للأبيض والأسود',
      pfp_bg_library_title: 'مكتبة خلفيات الاستوديو (46 خلفية)',
      pfp_bg_cat_all: 'الكل (46)',
      pfp_bg_cat_solid: 'سادة (12)',
      pfp_bg_cat_grad: 'تدرجات (14)',
      pfp_bg_cat_pat: 'هالات وأنماط (12)',
      pfp_bg_cat_smart: 'تمويه ذكي ومشاهد (8)',
      pfp_bg_custom_title: 'تدرج مخصص وزاوية الإضاءة',
      pfp_grad_angle: 'زاوية التدرج',
      pfp_color_1: 'اللون 1',
      pfp_color_2: 'اللون 2',
      pfp_btn_apply_custom_bg: 'تطبيق التدرج المخصص',
      pfp_bg_sol_white: 'أبيض نقي',
      pfp_bg_sol_gray: 'رمادي استوديو',
      pfp_bg_sol_blue: 'أزرق لينكدإن',
      pfp_bg_sol_navy: 'كحلي تنفيذي',
      pfp_bg_sol_mustard: 'أصفر كهرماني',
      pfp_bg_sol_emerald: 'أخضر زمردي',
      pfp_bg_sol_coral: 'مرجاني ناعم',
      pfp_bg_sol_lavender: 'لافندر هادئ',
      pfp_bg_sol_sand: 'رملي دافئ',
      pfp_bg_sol_charcoal: 'فحمي داكن',
      pfp_bg_sol_rose: 'وردي باستيل',
      pfp_bg_sol_sky: 'سماوي مشرق',
      pfp_bg_grd_sunrise: 'شروق ذهبي',
      pfp_bg_grd_cali: 'غروب إبداعي',
      pfp_bg_grd_aurora: 'أورورا تركواز',
      pfp_bg_grd_cyber: 'سيان كهربائي',
      pfp_bg_grd_gold: 'ذهب ملكي',
      pfp_bg_grd_ocean: 'أعماق المحيط',
      pfp_bg_grd_mint: 'نعناع منعش',
      pfp_bg_grd_burgundy: 'عنّابي رسمي',
      pfp_bg_grd_sapphire: 'ياقوت ليلي',
      pfp_bg_grd_silver: 'فضي معدني',
      pfp_bg_grd_peach: 'خوخي دافئ',
      pfp_bg_grd_ice: 'جليد شمالي',
      pfp_bg_grd_forest: 'غابة عميقة',
      pfp_bg_grd_twilight: 'نيلي الغسق',
      pfp_bg_pat_spotlight: 'إضاءة سبوت استوديو',
      pfp_bg_pat_sunburst: 'أشعة شمس دائرية',
      pfp_bg_pat_halftone: 'نقاط بوب (Halftone)',
      pfp_bg_pat_stripes: 'خطوط قطرية',
      pfp_bg_pat_ripples: 'تموجات متمركزة',
      pfp_bg_pat_starfield: 'حقل نجوم مضيء',
      pfp_bg_pat_waves: 'أمواج انسيابية',
      pfp_bg_pat_hex: 'شبكة سُداسية تقنية',
      pfp_bg_pat_grid: 'شبكة مينيمال',
      pfp_bg_pat_marble: 'رخام ناعم',
      pfp_bg_pat_bokeh: 'بوكيه استوديو',
      pfp_bg_pat_vignette: 'تظليل حواف داكن',
      pfp_bg_smt_bokeh_l: 'تمويه بوكيه خفيف',
      pfp_bg_smt_bokeh_m: 'تمويه بوكيه متوسط',
      pfp_bg_smt_bokeh_s: 'تمويه بوكيه قوي',
      pfp_bg_smt_colorpop: 'عزل لوني (خلفية أبيض وأسود)',
      pfp_bg_scn_sunset: 'ظلال الغروب الهادئ',
      pfp_bg_scn_night: 'ليلة جبلية مرصعة بالنجوم',
      pfp_bg_scn_horizon: 'وهج أفق الصحراء',
      pfp_bg_scn_city: 'أضواء المدينة المسائية',
      pfp_shapes_title: 'شكل إطار الصورة الشخصية (6 أشكال)',
      pfp_shape_circle: 'دائري',
      pfp_shape_squircle: 'مربع مستدير (Squircle)',
      pfp_shape_hexagon: 'سُداسي',
      pfp_shape_shield: 'درع',
      pfp_shape_badge: 'وسام ناعم',
      pfp_shape_square: 'مربع حاد',
      pfp_rings_title: 'أنماط الحلقات وتأثير 3D والعمق (18 نمطاً)',
      pfp_ring_story_grad: 'حلقة ستوري متدرجة',
      pfp_ring_verified_glow: 'توهّج التوثيق الأزرق',
      pfp_ring_royal_gold: 'ذهبي ملكي',
      pfp_ring_cyber_neon: 'نيون سايبر',
      pfp_ring_exec_dual: 'إطار تنفيذي مزدوج',
      pfp_ring_metallic_silver: 'فضي معدني',
      pfp_ring_double_sep: 'حلقة مزدوجة مفصولة',
      pfp_ring_dashed_tech: 'حلقة متقطعة تقنية',
      pfp_ring_dotted: 'إطار منقّط',
      pfp_ring_arc_4seg: 'أقواس رباعية',
      pfp_ring_angled_sweep: 'مسحة لونية مائلة',
      pfp_ring_inner_white: 'إطار أبيض داخلي',
      pfp_ring_popout_3d: 'بروز 3D من الأعلى',
      pfp_ring_popout_glow: 'بروز 3D مع توهّج',
      pfp_ring_glass_frost: 'زجاج ضبابي (Frosted)',
      pfp_ring_float_shadow: 'ظل عائم',
      pfp_ring_inner_depth: 'عمق ظل داخلي',
      pfp_ring_rim_light: 'إضاءة حافة استوديو',
      pfp_ring_thickness: 'سُمك الإطار',
      pfp_drop_shadow: 'الظل الخارجي',
      pfp_inner_shadow: 'الظل الداخلي للإطار',
      pfp_outer_glow: 'التوهّج الخارجي',
      pfp_ring_col1: 'لون الحلقة 1',
      pfp_ring_col2: 'لون الحلقة 2',
      pfp_badges_title: 'شارات الحالة والنص المقوّس',
      pfp_badge_none: 'بدون',
      pfp_badge_verified: 'شارة التوثيق',
      pfp_badge_star: 'نجمة صانع المحتوى',
      pfp_badge_custom: 'قوس مخصص',
      pfp_badge_text_lbl: 'نص الشارة',
      pfp_badge_col_lbl: 'لون الشارة',
      pfp_curved_text_lbl: 'نص مقوّس اختياري حول الحلقة',
      pfp_curved_ph: 'مثال: مصمم مبدع · CREATIVE PRO',
      pfp_font_label: 'الخط:',
      pfp_text_color: 'لون النص',
      pfp_pos_top: 'قوس علوي',
      pfp_pos_bottom: 'قوس سفلي',
      pfp_font_modal_title: 'اختر الخط (24 خطاً عربياً وإنجليزياً)',
      pfp_font_modal_d: 'اختر خط عرض جريء أو خطاً عربياً أنيقاً للنص المقوّس حول الصورة.',
      pfp_fonts_ar: 'خطوط عربية احترافية (12)',
      pfp_fonts_en: 'خطوط إنجليزية عريضة (12)',
      pfp_social_modal_title: 'معاينة حية على 10 منصات تواصل',
      pfp_social_modal_d: 'تحقق من وضوح الصورة على فيسبوك وتيك توك وواتساب وتيليغرام وسناب شات وإنستغرام ولينكدإن وإكس ويوتيوب وديسكورد.',
      pfp_social_toggle_theme: 'تبديل الفاتح / الداكن',
      pfp_soc_fb_tag: 'فيسبوك',
      pfp_soc_fb_sub: 'غلاف الملف الشخصي والمنشورات',
      pfp_soc_fb_comment: 'صورة استوديو رائعة ومظهر حاد وواضح.',
      pfp_soc_tt_tag: 'تيك توك',
      pfp_soc_tt_sub: 'شريط المبدع وزر المتابعة',
      pfp_soc_wa_tag: 'واتساب',
      pfp_soc_wa_sub: 'قائمة الدردشات وحلقة الحالة',
      pfp_soc_tg_tag: 'تيليغرام',
      pfp_soc_tg_sub: 'آخر ظهور قريباً · شريط المحادثة',
      pfp_soc_sc_tag: 'سناب شات',
      pfp_soc_sc_sub: 'الملف الشخصي والإطار الدائري',
      pfp_soc_ig_tag: 'إنستغرام',
      pfp_soc_ig_sub: 'حلقة الستوري المتدرجة ورأس المنشور',
      pfp_soc_li_tag: 'لينكدإن',
      pfp_soc_li_sub: 'مصمم منتجات أول · جاهز لشارة #OPENTOWORK',
      pfp_soc_x_tag: 'إكس (تويتر)',
      pfp_soc_x_line: 'وضوح الحواف وتباين الإطار حتى في المقاس المصغّر بالتايملاين.',
      pfp_soc_yt_tag: 'يوتيوب',
      pfp_soc_yt_sub: '148 ألف مشترك · القناة والتعليقات',
      pfp_soc_dc_tag: 'ديسكورد',
      pfp_soc_dc_sub: 'متصل الآن · بطاقة العضو ونقطة الحالة',
      pfp_export_modal_d: 'حمّل الصورة بدقة 1080×1080 بصيغة PNG/JPG أو احصل على حزمة المنصات العشرة (.ZIP) محلياً.',
      pfp_btn_dl_png: 'تحميل PNG 1080×1080 (شفاف خارج الشكل)',
      pfp_btn_dl_jpg: 'تحميل JPG عالي الجودة',
      pfp_btn_dl_zip: 'تحميل حزمة المنصات (.ZIP — 10 منصات)',
      pfp_zip_note: 'تضم الحزمة مقاسات Facebook و TikTok و WhatsApp و Telegram و Snapchat و Instagram و LinkedIn و X و YouTube و Discord.',
      pfp_err_type: 'يرجى رفع صورة صالحة بصيغة JPG أو PNG أو WebP أو BMP أو GIF أو SVG آمن',
      pfp_err_size: 'حجم الصورة يتجاوز الحد الأقصى 30 ميجابايت',
      pfp_err_dims: 'أبعاد الصورة تتجاوز الحد الأقصى 12,000 بكسل',
      pfp_err_no_photo: 'يرجى رفع صورة شخصية أولاً',
      pfp_loaded_ok: 'تم تحميل الصورة محلياً — جاهزة للتعديل',
      pfp_export_ok: 'تم تصدير الصورة الشخصية بنجاح',
      pfp_export_err: 'تعذّر تصدير الصورة الشخصية',
      // استوديو موك اب المنتجات والأجهزة (ms_*)
      ms_meta_desc: 'اعرض تطبيقاتك ومواقعك وشعاراتك ومنتجاتك محلياً 100% داخل 33 موك اب واقعياً — iPhone 16 Pro Max وGalaxy S24 Ultra وMacBook وiPad وساعة ذكية وإطارات لوحات وكتب وأكواب وملابس وتيشيرت بولو وتغليف ولافتات متاجر مع إزالة خلفية الشعار بالذكاء الاصطناعي و36 خلفية وتصدير حتى 3000px.',
      ms_usage_hint: 'طريقة الاستخدام: ١. اختر من 33 نموذجاً للأجهزة واللوحات والأكواب والملابس ولافتات المتاجر ← ٢. ارفع صورتك أو شعارك (استخدم زر إزالة خلفية الشعار بالذكاء الاصطناعي!) واضبط الملاءمة والتكبير ← ٣. اختر خلفية استوديو أو خلفية شفافة PNG مع تخصيص الظل والعنوان ← ٤. صدّر بدقة 3x حتى 3000px.',
      ms_btn_upload: 'رفع التصميم',
      ms_btn_export: 'تصدير / تحميل',
      ms_asp_169: 'عرض تقديمي 16:9',
      ms_asp_11: 'مربع 1:1',
      ms_asp_45: 'بورتريه 4:5',
      ms_asp_916: 'ستوري 9:16',
      ms_btn_trans_short: 'خلفية شفافة',
      ms_drop_hint: 'اسحب وأفلت صورة أو اضغط Ctrl+V لتطبيقها',
      ms_mq_download: 'تحميل / تصدير',
      ms_mq_upload: 'رفع التصميم',
      ms_mq_center: 'توسيط',
      ms_btn_center: 'توسيط الشعار',
      ms_btn_peek: 'اضغط مطولاً للمعاينة',
      ms_redo: 'إعادة',
      ms_btn_reset_design: 'إعادة ضبط التموضع',
      ms_shortcuts_legend: 'سحب تحريك · عجلة تكبير · الأسهم تحريك · +/- تكبير · C توسيط · Space معاينة · Ctrl+V لصق · Ctrl+Z تراجع · Ctrl+S تصدير',
      ms_tab_mockup: 'القالب والرفع',
      ms_tab_bg: 'الخلفية واللون',
      ms_tab_text: 'النص والظلال',
      ms_tpl_title: 'مكتبة الموك اب (33 قالباً)',
      ms_cat_all: 'الكل (33)',
      ms_cat_devices: 'الأجهزة والشاشات (14)',
      ms_cat_print: 'الإطارات والمطبوعات (8)',
      ms_cat_products: 'المنتجات والمتاجر (11)',
      ms_dual_tag: 'مزدوج',
      ms_tpl_iphone16: 'iPhone 16 Pro Max',
      ms_tpl_s24ultra: 'Samsung S24 Ultra',
      ms_tpl_frameless: 'هاتف طيني بدون حواف',
      ms_tpl_isophone: 'هاتف مائل ثلاثي الأبعاد',
      ms_tpl_watch: 'ساعة ذكية Ultra',
      ms_tpl_ipad_p: 'iPad Pro عمودي',
      ms_tpl_ipad_l: 'iPad Pro أفقي',
      ms_tpl_mb_pro: 'MacBook Pro أسود فضائي',
      ms_tpl_mb_air: 'MacBook Air فضي',
      ms_tpl_imac: 'شاشة Studio Display 5K',
      ms_tpl_browser_l: 'متصفح ويب (فاتح)',
      ms_tpl_browser_d: 'متصفح ويب (داكن)',
      ms_tpl_mb_iphone: 'مشهد MacBook + iPhone',
      ms_tpl_dual_phones: 'هاتفان متداخلان',
      ms_tpl_oak_frame: 'إطار خشب البلوط الطبيعي',
      ms_tpl_black_frame: 'إطار معرض أسود مطفي',
      ms_tpl_gold_frame: 'إطار ذهبي مصقول',
      ms_tpl_canvas_wrap: 'لوحة كانفاس 3D',
      ms_tpl_book: 'كتاب بغلاف مقوى 3D',
      ms_tpl_magazine: 'مجلة مفتوحة',
      ms_tpl_bcard: 'بطاقات أعمال عائمة',
      ms_tpl_poster: 'ملصق حائط أنيق',
      ms_tpl_mug: 'كوب قهوة خزفي',
      ms_tpl_cup: 'كوب قهوة ورقي',
      ms_tpl_tshirt: 'تيشيرت قطني',
      ms_tpl_hoodie: 'هودي شتوي سميك',
      ms_tpl_tote: 'حقيبة قماشية (Tote Bag)',
      ms_tpl_box: 'صندوق تغليف 3D',
      ms_tpl_kraft: 'كيس تسوق ورقي كرافت',
      ms_tpl_sign: 'لافتة متجر مضيئة LED',
      ms_tpl_polo: 'تيشيرت بولو بياقة',
      ms_tpl_blade_sign: 'لافتة متجر دائرية معلّقة 3D',
      ms_tpl_glass_door: 'واجهة زجاجية وباب متجر',
      ms_upload_title: 'رفع التصميم أو لقطة الشاشة',
      ms_btn_demo: 'استخدام تصميم تجريبي',
      ms_btn_upload_main: 'رفع صورة / شعار',
      ms_btn_clear_art: 'مسح الصورة',
      ms_btn_ai_bg: 'إزالة خلفية الشعار (AI)',
      ms_btn_ai_restore: 'استعادة الأصل',
      ms_ai_wait: 'جاري إزالة خلفية الشعار محلياً...',
      ms_ai_done: 'تمت إزالة خلفية الشعار بنجاح',
      ms_ai_err: 'تعذرت إزالة الخلفية — جرّب صورة أخرى',
      ms_ai_restored: 'تمت استعادة الصورة الأصلية',
      ms_upload_note: 'يدعم JPG و PNG و WebP و BMP و GIF و SVG آمن (حد أقصى 30MB). يمكنك أيضاً اللصق عبر Ctrl+V أو السحب والإفلات.',
      ms_btn_upload_2: 'رفع الشاشة الثانية',
      ms_btn_clear_2: 'إعادة ضبط الشاشة ٢',
      ms_fit_title: 'توضّع الشعار والتصميم والتأطير',
      ms_fit_auto_badge: 'ملاءمة ذكية',
      ms_orient_lbl: 'اتجاه الإطار',
      ms_orient_portrait: 'عمودي',
      ms_orient_landscape: 'أفقي',
      ms_fit_cover: 'ملء الإطار بالكامل (Cover)',
      ms_fit_contain: 'احتواء كامل للشعار (Contain)',
      ms_zoom: 'حجم الشعار / التصميم',
      ms_pan_x: 'إزاحة أفقية X',
      ms_pan_y: 'إزاحة عمودية Y',
      ms_rotate: 'تدوير التصميم',
      ms_btn_center_dock: 'توسيط الشعار',
      ms_btn_reset_dock: 'إعادة التموضع',
      ms_color_title: 'لون الجهاز أو المنتج',
      ms_custom_prod_col: 'لون مخصص للمنتج',
      ms_bg_title: 'خلفيات الاستوديو (36+)',
      ms_btn_trans_bg: 'PNG شفاف',
      ms_bgcat_all: 'الكل (36)',
      ms_bgcat_solid: 'أحادية نظيفة',
      ms_bgcat_grad: 'تدرجات ناعمة',
      ms_bgcat_surf: 'جدران ومكاتب',
      ms_bgcat_dark: 'عرض داكن',
      ms_custom_bg_title: 'صورة أو SVG مخصص للخلفية',
      ms_btn_clear_bg: 'إزالة الخلفية',
      ms_btn_upload_bg: 'رفع خلفية مخصصة',
      ms_bg_sol_white: 'أبيض نقي',
      ms_bg_sol_alab: 'أبيض مرمر',
      ms_bg_sol_gray: 'رمادي استوديو',
      ms_bg_sol_sand: 'رملي دافئ',
      ms_bg_sol_sage: 'أخضر مريمي ناعم',
      ms_bg_sol_blush: 'وردي خفيف',
      ms_bg_sol_slate: 'أردوازي بارد',
      ms_bg_sol_charcoal: 'رمادي فحمي',
      ms_bg_grd_nordic: 'سماء شمالية',
      ms_bg_grd_sunrise: 'شروق ناعم',
      ms_bg_grd_lavender: 'ضباب اللافندر',
      ms_bg_grd_mint: 'نسيم النعناع',
      ms_bg_grd_peach: 'خوخي دافئ',
      ms_bg_grd_ocean: 'نسيم المحيط',
      ms_bg_grd_rose: 'مخمل وردي',
      ms_bg_grd_champ: 'وهج الشمبانيا',
      ms_bg_grd_indigo: 'نيلي كهربائي',
      ms_bg_grd_emerald: 'هالة زمردية',
      ms_bg_srf_plaster: 'جدار جصي دافئ',
      ms_bg_srf_concrete: 'خرسانة حديثة',
      ms_bg_srf_oak: 'سطح مكتب خشب البلوط',
      ms_bg_srf_marble: 'رخام كرارا الأبيض',
      ms_bg_srf_terrazzo: 'سطح تيرازو',
      ms_bg_srf_linen: 'قماش كتان ناعم',
      ms_bg_srf_grid: 'شبكة معمارية',
      ms_bg_srf_sunlit: 'جدار بظلال الشمس',
      ms_bg_drk_obsidian: 'أوبسيديان مطفي',
      ms_bg_drk_indigo: 'إضاءة نيلية عميقة',
      ms_bg_drk_cyber: 'توهج سماوي سايبر',
      ms_bg_drk_carbon: 'جرافيت كربوني',
      ms_bg_drk_violet: 'شفق بنفسجي',
      ms_bg_drk_emerald: 'استوديو زمردي داكن',
      ms_bg_drk_bronze: 'برونز ليلي دافئ',
      ms_bg_drk_navy: 'كحلي منتصف الليل',
      ms_bg_drk_crimson: 'مخمل قرمزي',
      ms_bg_drk_pitch: 'أسود استوديو حالك',
      ms_realism_title: 'الظلال والواقعية البصرية',
      ms_shadow_lbl: 'ظل التلامس والعمق',
      ms_sheen_toggle: 'انعكاس الزجاج ولمعة الإضاءة',
      ms_sheen_lbl: 'شدة الانعكاس واللمعان',
      ms_headline_title: 'عنوان تسويقي وعرض المتاجر',
      ms_hpos_none: 'إيقاف',
      ms_hpos_top: 'عنوان علوي',
      ms_hpos_side: 'عرض جانبي',
      ms_hl_input: 'العنوان الرئيسي',
      ms_hl_ph: 'أطلق منتجك بأسلوب احترافي',
      ms_sub_input: 'العنوان الفرعي',
      ms_sub_ph: 'عرض استوديو محلي 100% داخل متصفحك',
      ms_font_lbl: 'الخط:',
      ms_text_col: 'لون النص',
      ms_font_modal_t: 'اختر الخط (24 خطاً عربياً وإنجليزياً)',
      ms_font_modal_d: 'اختر خطاً عربياً أنيقاً أو خط عرض عريض لعناوين المتاجر والتسويق.',
      ms_fonts_ar: 'خطوط عربية احترافية (12)',
      ms_fonts_en: 'خطوط إنجليزية عريضة (12)',
      ms_export_modal_d: 'تصدير محلي حتى دقة 3x Ultra Retina (حتى 3000 بكسل) مع خيار الخلفية الشفافة PNG.',
      ms_scale_1x: '1x قياسي',
      ms_scale_2x: '2x عالي الدقة HD',
      ms_scale_3x: '3x فائق الدقة (حتى 3000px)',
      ms_btn_dl_png: 'تحميل PNG (يدعم الخلفية الشفافة)',
      ms_btn_dl_jpg: 'تحميل JPG عالي الجودة',
      ms_err_type: 'يرجى رفع صورة صالحة بصيغة JPG أو PNG أو WebP أو BMP أو GIF أو SVG آمن',
      ms_err_size: 'حجم الملف يتجاوز الحد الأقصى 30 ميجابايت',
      ms_err_dims: 'أبعاد الصورة تتجاوز الحد الأقصى 12,000 بكسل',
      ms_loaded_ok: 'تم تحميل التصميم محلياً داخل الاستوديو',
      ms_export_ok: 'تم تصدير الموك اب بدقة عالية بنجاح',
      ms_export_err: 'تعذّر تصدير صورة الموك اب',
      // صانع كولاج الصور الذكي (pc_*)
      pc_meta_desc: 'أنشئ كولاج صور من ٢ إلى ١٢ صورة محلياً عبر 60 تخطيطاً (شبكات Bento، مجلات، أشرطة فيلم، بولارويد، أشكال هندسية) مع 42 خلفية استوديو و24 خطاً عربياً وإنجليزياً وتصدير حتى 3000px أو PDF للطباعة بدقة 300 DPI.',
      pc_usage_hint: 'طريقة الاستخدام: ١. أضف من ٢ إلى ١٢ صورة (أو اسحب وألصق بالمنصة) ← ٢. اختر من 60 تخطيطاً للشبكات والمجلات والبولارويد والأشكال الهندسية وحرّك وكبّر وبدّل داخل أي إطار ← ٣. خصّص التباعد واستدارة الزوايا و42 خلفية والفلاتر والعنوان ← ٤. صدّر بدقة 3000px أو PDF للطباعة 300 DPI.',
      pc_btn_add_photos: 'إضافة صور',
      pc_btn_shuffle: 'خلط ذكي',
      pc_btn_export: 'تصدير / طباعة',
      pc_asp_11: 'مربع 1:1',
      pc_asp_45: 'بورتريه 4:5',
      pc_asp_916: 'ستوري 9:16',
      pc_asp_169: 'أفقي 16:9',
      pc_asp_a4: 'A4 عمودي 300 DPI',
      pc_asp_a4l: 'A4 أفقي',
      pc_drop_hint: 'انقر على أي إطار للتحريك والتكبير · اسحب وأفلت أو اضغط Ctrl+V لإضافة صور',
      pc_mq_download: 'تحميل / تصدير',
      pc_mq_add: 'إضافة صور',
      pc_mq_shuffle: 'خلط',
      pc_btn_reset_crop: 'إعادة ضبط قص الإطار',
      pc_btn_clear_all: 'استعادة التجريبي',
      pc_shortcuts_legend: 'انقر للتحديد · سحب تحريك · عجلة تكبير · الأسهم تحريك · R خلط · Ctrl+V لصق · Ctrl+Z تراجع · Ctrl+S تصدير',
      pc_tab_layouts: 'التخطيطات والصور',
      pc_tab_spacing: 'التباعد والخلفية',
      pc_tab_filters: 'الفلاتر والنص',
      pc_photos_title: 'صورك (حتى ١٢ صورة)',
      pc_photos_note: 'اضغط على أي مصغّر لتحديد إطاره، أو اسحب الصور إلى اللوحة.',
      pc_photos_unit: 'صور',
      pc_demo_badge: 'صور تجريبية',
      pc_frame_num: 'إطار #',
      pc_swap_pick: 'انقر على أي إطار ثانٍ في اللوحة لتبديل الصور',
      pc_btn_swap: 'تبديل مع إطار آخر',
      pc_btn_clear_slot: 'إزالة الصورة',
      pc_slot_zoom: 'تكبير الإطار',
      pc_btn_rot90: 'تدوير 90°',
      pc_btn_flip: 'قلب أفقي',
      pc_btn_replace: 'استبدال الصورة',
      pc_layouts_title: 'تخطيطات الكولاج (60)',
      pc_match_count: 'مطابقة عدد الصور',
      pc_lcat_all: 'الكل (60)',
      pc_lcat_grids: 'شبكات Bento (16)',
      pc_lcat_editorial: 'مجلات وتحرير (16)',
      pc_lcat_film: 'فيلم وبولارويد (14)',
      pc_lcat_shapes: 'أشكال هندسية (14)',
      pc_lay_g_2h: 'تقسيم أفقي ٢',
      pc_lay_g_2v: 'تقسيم عمودي ٢',
      pc_lay_g_3v: '٣ أعمدة متساوية',
      pc_lay_g_2x2: 'شبكة 2×2 كلاسيكية',
      pc_lay_g_bento4: 'بنتو ٤ غير متماثل',
      pc_lay_g_bento5: 'بنتو استوديو ٥',
      pc_lay_g_3x2: 'شبكة معرض 3×2',
      pc_lay_g_bento6: 'بنتو متنوع ٦',
      pc_lay_g_bento7: 'جدار بنتو ٧',
      pc_lay_g_4x2: 'شبكة عريضة 4×2',
      pc_lay_g_bento8: 'عرض بنتو ٨',
      pc_lay_g_3x3: 'شبكة مربعة 3×3',
      pc_lay_g_bento9: 'فسيفساء بنتو ٩',
      pc_lay_g_10: 'شبكة ١٠ ببطاقتين بارزتين',
      pc_lay_g_11: 'شبكة بنتو ١١',
      pc_lay_g_4x3: 'شبكة كبرى 4×3',
      pc_lay_ed_ba: 'قبل وبعد',
      pc_lay_ed_hero2: 'صورة رئيسية + بطاقة عائمة',
      pc_lay_ed_hero3l: 'رئيسية يسار + ٢ مكدسة',
      pc_lay_ed_hero3t: 'رئيسية أعلى + ٢ أسفل',
      pc_lay_ed_l4: 'تخطيط تحريري L-4',
      pc_lay_ed_t4: 'رأس بارز + ثلاثي',
      pc_lay_ed_cat4: 'كتالوج ٤ أعمدة',
      pc_lay_ed_hero5: 'رئيسية بارزة + ٤ صور',
      pc_lay_ed_cen5: 'تركيز مركزي ٥',
      pc_lay_ed_look6: 'كتالوج أزياء ٦',
      pc_lay_ed_cov7: 'غلاف مجلة ٧',
      pc_lay_ed_cov8: 'انتشار تحريري ٨',
      pc_lay_ed_spr9: 'معرض تحريري ٩',
      pc_lay_ed_cat10: 'كتالوج استوديو ١٠',
      pc_lay_ed_spr11: 'صفحة مقتنين ١١',
      pc_lay_ed_yb12: 'ألبوم سنوي ١٢',
      pc_lay_fm_pol2: 'بطاقتا بولارويد',
      pc_lay_fm_3v: 'شريط فيلم ٣ إطارات',
      pc_lay_fm_pol3: '٣ بطاقات بولارويد مبعثرة',
      pc_lay_fm_4v: 'شريط سينما ٤ إطارات',
      pc_lay_fm_4h: 'شريط فيلم أفقي ٤',
      pc_lay_fm_pol4: 'مجموعة بولارويد ٤',
      pc_lay_fm_pol5: 'لوحة بولارويد ٥',
      pc_lay_fm_scr6: 'سجل قصاصات متداخل ٦',
      pc_lay_fm_6d: 'لوحة اتصال 2×3',
      pc_lay_fm_scr7: 'لوحة ذكريات ٧',
      pc_lay_fm_8d: 'شريط سينما 2×4',
      pc_lay_fm_pol9: 'جدار بولارويد مصغّر ٩',
      pc_lay_fm_scr10: 'لوحة ذكريات ١٠',
      pc_lay_fm_12: 'شريط اتصال ١٢ إطاراً',
      pc_lay_sh_diag2: 'تقسيم قطري ٢',
      pc_lay_sh_circ2: 'دائرتان متقابلتان',
      pc_lay_sh_diag3: '٣ شرائط مائلة',
      pc_lay_sh_arch3: '٣ أقواس معمارية',
      pc_lay_sh_dia4: 'فسيفساء ٤ معينات',
      pc_lay_sh_hex4: 'عنقود ٤ سداسيات',
      pc_lay_sh_arch5: '٥ أقواس معرض',
      pc_lay_sh_star5: 'عرض خماسي النجمة',
      pc_lay_sh_hex6: 'شبكة ٦ خلايا نحل',
      pc_lay_sh_hex7: 'زهرة ٧ سداسيات',
      pc_lay_sh_circ8: 'معرض ٨ فقاعات',
      pc_lay_sh_heart9: 'كولاج قلب ٩ صور',
      pc_lay_sh_dia10: 'شبكة ١٠ معينات',
      pc_lay_sh_hex12: 'مصفوفة ١٢ سداسياً',
      pc_spacing_title: 'الإطارات والتباعد والظلال',
      pc_gap_lbl: 'التباعد الداخلي بين الصور',
      pc_pad_lbl: 'الهامش الخارجي',
      pc_rad_lbl: 'استدارة الزوايا',
      pc_shadow_toggle: 'ظلال ارتفاع ناعمة للإطارات',
      pc_bg_title: 'خلفيات الكولاج (42+)',
      pc_bgcat_all: 'الكل (42)',
      pc_bgcat_solid: 'أحادية نظيفة',
      pc_bgcat_grad: 'تدرجات ناعمة',
      pc_bgcat_tex: 'ورق وخامات',
      pc_bgcat_dark: 'معرض داكن',
      pc_custom_bg_title: 'صورة خلفية مخصصة',
      pc_bg_sol_white: 'أبيض نقي',
      pc_bg_sol_ivory: 'عاجي دافئ',
      pc_bg_sol_alab: 'أبيض مرمر',
      pc_bg_sol_gray: 'رمادي استوديو',
      pc_bg_sol_sand: 'رملي صحراوي',
      pc_bg_sol_sage: 'أخضر مريمي ناعم',
      pc_bg_sol_blush: 'وردي خفيف',
      pc_bg_sol_sky: 'أزرق سماوي هادئ',
      pc_bg_sol_slate: 'أردوازي بارد',
      pc_bg_sol_charcoal: 'فحمي داكن',
      pc_bg_grd_morning: 'ندى الصباح',
      pc_bg_grd_peach: 'خوخي دافئ',
      pc_bg_grd_nordic: 'جليد شمالي',
      pc_bg_grd_lavender: 'ضباب اللافندر',
      pc_bg_grd_mint: 'نسيم النعناع',
      pc_bg_grd_rose: 'كوارتز وردي',
      pc_bg_grd_champ: 'ذهبي شامبانيا',
      pc_bg_grd_ocean: 'نسيم المحيط',
      pc_bg_grd_golden: 'الساعة الذهبية',
      pc_bg_grd_coral: 'غروب مرجاني',
      pc_bg_grd_indigo: 'نيلي كهربائي',
      pc_bg_grd_emerald: 'هالة زمردية',
      pc_bg_tex_linen: 'كتان دافئ',
      pc_bg_tex_paper: 'ورق قطني',
      pc_bg_tex_marble: 'رخام كرارا',
      pc_bg_tex_terrazzo: 'حجر تيرازو',
      pc_bg_tex_kraft: 'ورق كرافت',
      pc_bg_tex_concrete: 'خرسانة ناعمة',
      pc_bg_tex_oak: 'خشب بلوط فاتح',
      pc_bg_tex_grid: 'شبكة هندسية',
      pc_bg_tex_dots: 'ورق منقّط',
      pc_bg_tex_cork: 'لوح فلين',
      pc_bg_drk_obsidian: 'أوبسيديان مطفي',
      pc_bg_drk_indigo: 'نيلي عميق',
      pc_bg_drk_pitch: 'أسود معرض حالك',
      pc_bg_drk_crimson: 'مخمل قرمزي',
      pc_bg_drk_navy: 'كحلي منتصف الليل',
      pc_bg_drk_cyber: 'سماوي سايبر',
      pc_bg_drk_bronze: 'برونز دافئ',
      pc_bg_drk_emerald: 'زمردي داكن',
      pc_bg_drk_violet: 'شفق بنفسجي',
      pc_bg_drk_carbon: 'جرافيت كربوني',
      pc_filters_title: 'فلاتر الألوان والمظهر',
      pc_fscope_all: 'كل الصور',
      pc_fscope_slot: 'الإطار المحدد',
      pc_flt_none: 'أصلي',
      pc_flt_warm: 'فيلم دافئ',
      pc_flt_vivid: 'ألوان حيوية',
      pc_flt_cine: 'سينمائي بارد',
      pc_flt_vint: 'عتيق كلاسيكي',
      pc_flt_bw: 'أبيض وأسود',
      pc_text_title: 'عنوان وتسمية توضيحية',
      pc_tpos_none: 'إيقاف',
      pc_tpos_top: 'شريط علوي',
      pc_tpos_bot: 'تسمية سفلية',
      pc_tpos_center: 'شارة وسطية',
      pc_title_lbl: 'عنوان الكولاج',
      pc_title_ph: 'ذكريات الصيف 2026',
      pc_sub_lbl: 'عنوان فرعي / تاريخ',
      pc_sub_ph: 'مجموعة صور · استوديو imgsfix',
      pc_tsize_lbl: 'حجم العنوان',
      pc_font_modal_d: 'اختر خطاً عربياً أو إنجليزياً أنيقاً لعنوان الكولاج والتسميات.',
      pc_export_modal_d: 'تصدير محلي بدقة تصل إلى 3000 بكسل (PNG/JPG) أو ملف PDF للطباعة بدقة 300 DPI لمقاس A4 و US Letter.',
      pc_pdf_a4: 'PDF للطباعة A4 (300 DPI)',
      pc_pdf_letter: 'PDF للطباعة Letter (300 DPI)',
      pc_btn_dl_pdf: 'تحميل ملف PDF للطباعة',
      pc_loaded_ok: 'تمت إضافة الصور إلى استوديو الكولاج',
      pc_err_max12: 'الحد الأقصى ١٢ صورة — تم تخطي الملفات الإضافية',
      pc_export_ok: 'تم تصدير الكولاج بنجاح',
      pc_export_err: 'تعذّر تصدير الكولاج',
      // جلب وتحميل صور يوتيوب المصغّرة (yt_*)
      yt_meta_desc: 'اعرض وحمّل صور يوتيوب المصغّرة وأغلفة Shorts بجودة HD (1280×720) وSD وHQ وMQ بصيغة JPG أو PNG محلياً 100٪ في متصفحك بدون رفع.',
      yt_usage_hint: 'طريقة الاستخدام: ١. الصق رابط فيديو يوتيوب أو Shorts أو بث مباشر أو youtu.be (أو معرّف الفيديو من ١١ رمزاً) ← ٢. اضغط جلب الصور لفحص كل المقاسات المتاحة ← ٣. حمّلها فوراً بصيغة JPG أو PNG أو انسخ الرابط الرسمي أو افتحها في استوديو الصور المصغّرة للتعديل.',
      yt_hub_badge: 'مركز أغلفة الفيديو والوسائط',
      yt_hub_sub: 'يدعم روابط Watch و youtu.be و Shorts و Live و Embed والمعرّف المباشر',
      yt_url_ph: 'https://www.youtube.com/watch?v=... أو youtu.be/... أو معرّف ١١ رمزاً',
      yt_btn_paste: 'لصق الرابط',
      yt_btn_get: 'جلب الصور',
      yt_btn_sample: 'تجربة مثال',
      yt_btn_clear: 'مسح',
      yt_history_lbl: 'أحدث الفيديوهات',
      yt_btn_clear_hist: 'مسح السجل',
      yt_empty_t: 'الصق رابط يوتيوب لفحص وتحميل جميع مقاسات الغلاف',
      yt_empty_d: 'اكشف فوراً دقة MaxRes HD (1280×720) وSD (640×480) وHQ (480×360) وMQ (320×180) داخل متصفحك — حمّل JPG أو PNG أو أرسلها لاستوديو الصور المصغّرة.',
      yt_vid_id_lbl: 'معرّف الفيديو',
      yt_btn_dl_best: 'تحميل أعلى دقة HD',
      yt_btn_edit_best: 'تعديل في استوديو الصور المصغّرة',
      yt_avail_lbl: 'مقاسات متاحة',
      yt_none_avail: 'لم يتم العثور على صور مصغّرة عامة لهذا المعرّف',
      yt_res_maxres: 'جودة فائقة MaxRes Full HD',
      yt_res_maxres_d: 'الغلاف الرسمي العريض 16:9 بدقة 1280×720 عالية الوضوح.',
      yt_res_sd: 'جودة قياسية SD',
      yt_res_sd_d: 'صورة غلاف يوتيوب القياسية بنسبة 4:3 بدقة 640×480.',
      yt_res_hq: 'جودة عالية HQ',
      yt_res_hq_d: 'صورة مصغّرة متوازنة بدقة 480×360 للمعاينات والتضمين.',
      yt_res_mq: 'جودة متوسطة MQ',
      yt_res_mq_d: 'غلاف عريض خفيف 16:9 بدقة 320×180 سريع التحميل.',
      yt_badge_highest: 'أعلى دقة HD متاحة',
      yt_badge_best_fallback: 'أعلى دقة متاحة',
      yt_badge_hd_missing: 'دقة MaxRes HD غير متوفرة',
      yt_maxres_fallback: 'هذا الفيديو لا يحتوي على غلاف 1280×720 MaxRes — يتم عرض أعلى دقة SD/HQ متوفرة بدلاً منه.',
      yt_btn_dl_jpg: 'تحميل JPG',
      yt_btn_dl_png: 'تحميل PNG',
      yt_btn_copy_url: 'نسخ رابط الصورة',
      yt_btn_edit_maker: 'تعديل في استوديو الصور المصغّرة',
      yt_shortcuts_legend: 'Enter جلب · Ctrl+V لصق الرابط · Ctrl+S تحميل أعلى دقة HD',
      yt_err_invalid: 'يرجى إدخال رابط يوتيوب صحيح (Watch أو Shorts أو Live أو youtu.be أو معرّف من ١١ رمزاً).',
      yt_err_not_found: 'تعذّر العثور على صور مصغّرة عامة لهذا الفيديو، تأكد من صحة الرابط.',
      yt_err_unavail: 'هذه الدقة غير متوفرة للتحميل لهذا الفيديو',
      yt_fetch_ok: 'تم فحص وجلب الصور المصغّرة بنجاح',
      yt_dl_ok: 'تم تحميل الصورة المصغّرة بنجاح',
      yt_dl_err: 'تعذّر تصدير الصورة عبر لوحة المتصفح',
      yt_copy_ok: 'تم نسخ رابط الصورة الرسمي',
      yt_copy_err: 'تعذّر نسخ الرابط إلى الحافظة',
      yt_handoff_err: 'تعذّر فتح الصورة في استوديو الصور المصغّرة',
      yt_paste_manual: 'إذن الحافظة غير متاح — الصق الرابط مباشرة في الحقل',
      yt_paste_empty: 'الحافظة فارغة',
      yt_hist_cleared: 'تم مسح سجل الفيديوهات الأخيرة',
      // استوديو استخراج لقطات الفيديو الاحترافي (vf_*)
      vf_meta_desc: 'تصفح فيديوهات MP4 وWebM وMOV وMKV المحلية إطاراً بإطار، وشغّل الالتقاط المتتابع الذكي، وصدّر اللقطات بالدقة الأصلية بصيغ PNG وJPG وWebP أو حزمة ZIP محلياً 100٪ في متصفحك.',
      vf_usage_hint: 'طريقة الاستخدام: ١. أفلت أو اختر أي فيديو محلي (MP4، WebM، MOV، MKV، OGG) بدون أي رفع ← ٢. حرّك شريط التوقيت أو تنقّل إطاراً بإطار (-١/+١ إطار) للوصول للّحظة الدقيقة ← ٣. اضغط التقاط هذه اللقطة أو الالتقاط المتتابع (٥/١٠/٢٠ لقطة)، ثم حمّل بصيغة PNG أو JPG أو WebP أو حمّل الكل كملف .ZIP.',
      vf_studio_badge: 'استوديو البث واستخراج لقطات الفيديو',
      vf_drop_t: 'أفلت ملف الفيديو هنا أو تصفح جهازك',
      vf_drop_d: 'بث محلي 100٪ داخل متصفحك دون تحميل الملفات الضخمة في الذاكرة أو رفع أي بيانات.',
      vf_btn_browse: 'اختر فيديو محلي',
      vf_meta_res: 'الدقة',
      vf_meta_dur: 'المدة',
      vf_meta_ar: 'النسبة',
      vf_btn_replace: 'تبديل الفيديو',
      vf_btn_unload: 'إغلاق',
      vf_btn_prev_frame: '-١ إطار',
      vf_btn_play: 'تشغيل',
      vf_btn_pause: 'إيقاف',
      vf_btn_next_frame: '+١ إطار',
      vf_speed_lbl: 'السرعة',
      vf_btn_capture: 'التقاط هذه اللقطة',
      vf_burst_title: 'الالتقاط المتتابع الذكي',
      vf_burst_sub: 'توزيع متساوٍ على طول الفيديو',
      vf_burst_5: '٥ لقطات',
      vf_burst_10: '١٠ لقطات',
      vf_burst_20: '٢٠ لقطة',
      vf_burst_running: 'جاري التقاط اللقطات…',
      vf_btn_cancel: 'إلغاء',
      vf_gallery_t: 'اللقطات الملتقطة',
      vf_btn_dl_zip: 'تحميل الكل كملف .ZIP',
      vf_btn_clear_all: 'مسح الكل',
      vf_gallery_empty: 'لم تُلتقط أي لقطات بعد. أوقف الفيديو عند أي لحظة أو اضغط التقاط هذه اللقطة / الالتقاط المتتابع.',
      vf_shortcuts_legend: 'Space تشغيل/إيقاف · الأسهم -١/+١ إطار · Shift+الأسهم -١ث/+١ث · C أو Enter التقاط اللقطة · Ctrl+S تحميل .ZIP',
      vf_dur_unknown: 'غير محددة',
      vf_loaded_ok: 'الفيديو جاهز لاستخراج اللقطات بدقة عالية',
      vf_err_invalid_video: 'ملف فيديو غير مدعوم أو تالف — يرجى اختيار ملف MP4 أو WebM أو MOV أو MKV أو OGG صالح.',
      vf_err_gallery_full: 'تم بلوغ الحد الأقصى للمعرض (٤٠ لقطة) — احذف بعض اللقطات أو حمّلها كملف ZIP أولاً.',
      vf_captured_ok: 'تم التقاط اللقطة بالدقة الأصلية',
      vf_err_capture: 'تعذّر التقاط اللقطة عند هذا التوقيت',
      vf_err_no_duration: 'مدة الفيديو غير متوفرة للالتقاط المتتابع',
      vf_burst_done: 'تم التقاط {n} لقطة متتابعة بدقة عالية',
      vf_burst_cancelled: 'تم إلغاء الالتقاط المتتابع',
      vf_cleared_ok: 'تم مسح اللقطات وتحرير الذاكرة',
      vf_dl_ok: 'تم تحميل اللقطة بنجاح',
      vf_err_export: 'تعذّر تصدير اللقطة بهذه الصيغة',
      vf_err_handoff: 'تعذّر فتح اللقطة في استوديو الصور المصغّرة',
      vf_zip_ok: 'تم تحميل جميع اللقطات في حزمة .ZIP',
      vf_err_zip: 'تعذّر إنشاء أرشيف .ZIP',
      vf_frame_alt: 'لقطة ملتقطة عند التوقيت',
      vf_btn_remove: 'حذف اللقطة',
      vf_btn_edit_thumb: 'تعديل في استوديو الصور المصغّرة'
    }
  };

  var LS_THEME = 'imgsfix_theme';
  var LS_LANG = 'imgsfix_lang';
  var lang = localStorage.getItem(LS_LANG);
  if (!lang) {
    lang = (navigator.language && navigator.language.indexOf('ar') === 0) ? 'ar' : 'en';
  }

  function t(key) {
    return (I18N[lang] && I18N[lang][key]) || (I18N.en[key]) || key;
  }

  /* ----- theme ----- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(LS_THEME, theme);
    $$('.theme-toggle .tt-track .light-icon').forEach(function (e) { e.style.opacity = theme === 'light' ? '0' : '1'; });
    $$('.theme-toggle .tt-track .dark-icon').forEach(function (e) { e.style.opacity = theme === 'dark' ? '0' : '1'; });
    var ti = $('.theme-indicator .ti-label');
    if (ti) ti.textContent = theme === 'dark' ? t('dark') : t('light');
  }
  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  }

  /* ----- language ----- */
  function applyLanguage(l) {
    lang = l;
    localStorage.setItem(LS_LANG, l);
    document.documentElement.setAttribute('lang', l);
    document.documentElement.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
    $$('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = t(key);
      if (val) el.textContent = val;
    });
    $$('[data-i18n-ph], [data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-ph') || el.getAttribute('data-i18n-placeholder');
      var val = t(key);
      if (val) el.setAttribute('placeholder', val);
    });
    $$('[data-i18n-label]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-label');
      var val = t(key);
      if (val) el.setAttribute('label', val);
    });
    $$('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      var val = t(key);
      if (val) el.setAttribute('title', val);
    });
    $$('[data-i18n-aria-label]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria-label');
      var val = t(key);
      if (val) el.setAttribute('aria-label', val);
    });
    $$('.lang-switch button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.lang === l);
    });
    document.dispatchEvent(new CustomEvent('imgsfix:langchange', { detail: { lang: l } }));
  }

  /* ----- toast ----- */
  var toastTimer;
  function toast(msg, kind) {
    var el = $('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'toast' + (kind ? ' ' + kind : ''); }, 2800);
  }

  /* ----- header ----- */
  function buildHeader() {
    var h = document.createElement('header');
    h.className = 'site-header';
    h.setAttribute('role', 'banner');
    h.innerHTML =
      '<div class="container header-inner">' +
        '<a class="logo" href="' + link('index.html') + '" aria-label="imgsfix">' +
          '<span class="logo-mark">ifix</span>' +
          '<span class="logo-text">img<span>sfix</span></span>' +
        '</a>' +
        '<nav class="nav-links" aria-label="Main navigation">' +
          '<a href="' + link('index.html') + '" data-i18n="nav_home">Home</a>' +
          '<a href="' + link('index.html#categories') + '" data-i18n="nav_tools">Tools</a>' +
          '<a href="' + link('pages/advanced-editor.html') + '" data-i18n="nav_editor">Editor</a>' +
          '<a href="' + link('pages/qr-reader.html') + '" data-i18n="nav_qr">QR Reader</a>' +
          '<a href="' + link('pages/services.html') + '" data-i18n="nav_services">Services</a>' +
          '<a href="' + link('pages/about.html') + '" data-i18n="nav_about">About</a>' +
          '<a href="' + link('pages/faq.html') + '" data-i18n="nav_faq">FAQ</a>' +
          '<a href="' + link('pages/contact.html') + '" data-i18n="nav_contact">Contact</a>' +
        '</nav>' +
        '<div class="header-actions">' +
          '<div class="lang-switch hide-mobile" role="group" aria-label="Language">' +
            '<button data-lang="en">EN</button><button data-lang="ar">ع</button>' +
          '</div>' +
          '<button class="theme-toggle" aria-label="Toggle theme" title="Toggle theme">' +
            '<span class="tt-track"><span class="light-icon">☀</span><span class="dark-icon">☾</span></span>' +
            '<span class="tt-thumb">◐</span>' +
          '</button>' +
          '<button class="btn btn-primary btn-sm hide-mobile btn-labeled" id="btnInstallApp" style="display:none" aria-label="Install App" title="Install App">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M5 21h14"/></svg>' +
            '<span data-i18n="cta_install">Install App</span>' +
          '</button>' +
          '<button class="menu-btn" aria-label="Open menu" aria-expanded="false"><span class="bars"><span></span><span></span><span></span></span></button>' +
        '</div>' +
      '</div>' +
      '<nav class="mobile-nav" aria-label="Mobile navigation">' +
        '<div class="mn-header">' +
          '<a class="logo" href="' + link('index.html') + '" aria-label="imgsfix">' +
            '<span class="logo-mark">ifix</span><span class="logo-text">img<span>sfix</span></span>' +
          '</a>' +
          '<button class="mn-close" aria-label="Close menu">\u00d7</button>' +
        '</div>' +
        '<div class="mn-body">' +
          '<a class="mn-link" href="' + link('index.html') + '" data-i18n="nav_home">Home</a>' +
          '<a class="mn-link" href="' + link('index.html#categories') + '" data-i18n="nav_tools">Tools</a>' +
          '<a class="mn-link" href="' + link('pages/advanced-editor.html') + '" data-i18n="nav_editor">Editor</a>' +
          '<a class="mn-link" href="' + link('pages/qr-reader.html') + '" data-i18n="nav_qr">QR Reader</a>' +
          '<a class="mn-link" href="' + link('pages/services.html') + '" data-i18n="nav_services">Services</a>' +
          '<a class="mn-link" href="' + link('pages/about.html') + '" data-i18n="nav_about">About</a>' +
          '<a class="mn-link" href="' + link('pages/faq.html') + '" data-i18n="nav_faq">FAQ</a>' +
          '<a class="mn-link" href="' + link('pages/contact.html') + '" data-i18n="nav_contact">Contact</a>' +
        '</div>' +
        '<div class="mn-actions">' +
          '<div class="lang-switch" role="group" aria-label="Language">' +
            '<button data-lang="en">EN</button><button data-lang="ar">ع</button>' +
          '</div>' +
          '<button class="btn btn-primary btn-block" id="btnInstallAppMobile" style="display:none" aria-label="Install App">' +
            '<span data-i18n="cta_install">Install App</span>' +
          '</button>' +
        '</div>' +
      '</nav>';
    document.body.insertBefore(h, document.body.firstChild);
    // events
    $$('.theme-toggle').forEach(function (b) { b.addEventListener('click', toggleTheme); });
    $$('.lang-switch button').forEach(function (b) { b.addEventListener('click', function () { applyLanguage(b.dataset.lang); }); });
    var mb = $('.menu-btn', h);
    var mn = $('.mobile-nav', h);
    var mc = $('.mn-close', h);
    if (mb && mn) {
      function closeMenu() { mn.classList.remove('open'); mb.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }
      function openMenu() { mn.classList.add('open'); mb.classList.add('open'); mb.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; }
      mb.addEventListener('click', function () { mn.classList.contains('open') ? closeMenu() : openMenu(); });
      if (mc) mc.addEventListener('click', closeMenu);
      $$('a', mn).forEach(function (a) { a.addEventListener('click', closeMenu); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mn.classList.contains('open')) closeMenu(); });
    }
    // active link
    var path = location.pathname.split('/').pop() || 'index.html';
    $$('.nav-links a, .mobile-nav a.mn-link').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('#')[0];
      var tail = href.split('/').pop();
      if (tail && tail === path && !(a.getAttribute('href') || '').includes('#')) {
        a.classList.add('active');
      }
    });
  }

  /* ----- footer ----- */
  function buildFooter() {
    var f = document.createElement('footer');
    f.className = 'site-footer';
    f.setAttribute('role', 'contentinfo');
    f.innerHTML =
      '<div class="container">' +
        '<div class="footer-grid">' +
          '<div class="footer-brand">' +
            '<a class="logo" href="' + link('index.html') + '">' +
              '<span class="logo-mark">ifix</span><span class="logo-text">img<span>sfix</span></span>' +
            '</a>' +
            '<p data-i18n="footer_about">imgsfix is a privacy-focused, 100% client-side image toolkit. Everything happens in your browser — no uploads, no servers, no tracking.</p>' +
            '<div class="social-icons" style="margin-top:16px">' +
              '<a href="#" onclick="return false;" aria-label="Facebook" title="Facebook"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg></a>' +
              '<a href="#" onclick="return false;" aria-label="Instagram" title="Instagram"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.13 1.38C1.35 2.68.94 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.67 1.34 1.08 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.67-.67 1.08-1.34 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.38-2.13C21.32 1.35 20.65.94 19.86.63 19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0z"/><path d="M12 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4z"/><circle cx="18.41" cy="5.59" r="1.44"/></svg></a>' +
              '<a href="#" onclick="return false;" aria-label="X / Twitter" title="X / Twitter"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.45l8.6-9.83L0 1.15h7.6l5.24 6.93 6.06-6.93zm-1.29 19.5h2.04L6.48 3.24H4.29L17.61 20.65z"/></svg></a>' +
              '<a href="#" onclick="return false;" aria-label="LinkedIn" title="LinkedIn"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg></a>' +
              '<a href="#" onclick="return false;" aria-label="YouTube" title="YouTube"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2C0 8.08 0 12 0 12s0 3.92.5 5.8a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z"/></svg></a>' +
              '<a href="#" onclick="return false;" aria-label="TikTok" title="TikTok"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .6.04.88.13V9.4a6.33 6.33 0 0 0-1-.05A6.34 6.34 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43V8.69a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.12z"/></svg></a>' +
              '<a href="#" onclick="return false;" aria-label="Telegram" title="Telegram"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11.94 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.06 0zm7.06 6.06c.16.13.2.36.1.54L14.9 16.5c-.1.18-.3.3-.5.3H10.6c-.2 0-.4-.12-.5-.3l-1.8-3.06 6.36-6.36-6.66 5.16-3.06-1.8c-.2-.12-.3-.34-.26-.56.04-.22.2-.4.42-.46L18.3 5.9c.24-.06.5 0 .7.16z"/></svg></a>' +
              '<a href="#" onclick="return false;" aria-label="WhatsApp" title="WhatsApp"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.5 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35zM12 2a10 10 0 0 0-8.6 15.06L2 22l5.06-1.33A10 10 0 1 0 12 2z"/></svg></a>' +
            '</div>' +
          '</div>' +
          '<div class="footer-col">' +
            '<h4 data-i18n="footer_tools_h">Tools</h4>' +
            '<ul>' +
              '<li><a href="' + link('pages/categories/images.html') + '" data-i18n="cat_images_t">Images &amp; Design</a></li>' +
              '<li><a href="' + link('pages/categories/ai-design.html') + '" data-i18n="cat_ai_t">Smart Studio</a></li>' +
              '<li><a href="' + link('pages/categories/business.html') + '" data-i18n="cat_business_t">Business &amp; E-Commerce</a></li>' +
              '<li><a href="' + link('pages/categories/pdf-utils.html') + '" data-i18n="cat_pdf_t">PDF &amp; Utilities</a></li>' +
              '<li><a href="' + link('pages/qr-reader.html') + '" data-i18n="nav_qr">QR Reader</a></li>' +
              '<li><a href="' + link('pages/advanced-editor.html') + '" data-i18n="nav_editor">Editor</a></li>' +
            '</ul>' +
          '</div>' +
          '<div class="footer-col">' +
            '<h4 data-i18n="footer_company">Company</h4>' +
            '<ul>' +
              '<li><a href="' + link('pages/about.html') + '" data-i18n="page_about">About</a></li>' +
              '<li><a href="' + link('pages/services.html') + '" data-i18n="page_services">Services</a></li>' +
              '<li><a href="' + link('pages/contact.html') + '" data-i18n="page_contact">Contact</a></li>' +
              '<li><a href="' + link('pages/faq.html') + '" data-i18n="page_faq">FAQ</a></li>' +
            '</ul>' +
          '</div>' +
          '<div class="footer-col">' +
            '<h4 data-i18n="footer_resources">Resources</h4>' +
            '<ul>' +
              '<li><a href="' + link('pages/privacy-policy.html') + '" data-i18n="footer_privacy">Privacy Policy</a></li>' +
              '<li><a href="' + link('pages/terms.html') + '" data-i18n="footer_terms">Terms of Use</a></li>' +
              '<li><a href="' + link('pages/cookies.html') + '" data-i18n="footer_cookies">Cookie Policy</a></li>' +
              '<li><a href="' + link('pages/disclaimer.html') + '" data-i18n="footer_disclaimer">Disclaimer</a></li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="footer-bottom">' +
          '<span>© ' + new Date().getFullYear() + ' imgsfix. <span data-i18n="footer_rights">All rights reserved.</span></span>' +
          '<span class="fb-right">' +
            '<span class="theme-indicator"><span class="ti-dot"></span><span class="ti-label">Light</span></span>' +
            '<span data-i18n="footer_made">Made with care for privacy.</span>' +
          '</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(f);
  }

  /* ----- scroll-to-top ----- */
  function initScrollTop() {
    var btn = document.createElement('button');
    btn.className = 'scroll-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '↑';
    document.body.appendChild(btn);
    window.addEventListener('scroll', function () {
      btn.classList.toggle('show', window.scrollY > 400);
    });
    btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* ----- reveal on scroll ----- */
  function initReveal() {
    var els = $$('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ----- FAQ accordion ----- */
  function initFaq() {
    $$('.faq-q').forEach(function (q) {
      q.addEventListener('click', function () {
        var item = q.closest('.faq-item');
        var a = $('.faq-a', item);
        var open = item.classList.toggle('open');
        a.style.maxHeight = open ? a.scrollHeight + 'px' : '0';
      });
    });
  }

  /* ----- contact form ----- */
  function initContactForm() {
    var form = $('#contactForm');
    if (!form) return;
    var ok = $('.form-success', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;
      $$('.form-field', form).forEach(function (f) {
        var inp = $('input,textarea', f);
        if (!inp) return;
        if (inp.value.trim() === '') { f.classList.add('invalid'); valid = false; }
        else { f.classList.remove('invalid'); }
        if (inp.type === 'email' && inp.value.trim() !== '') {
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inp.value.trim())) { f.classList.add('invalid'); valid = false; }
        }
      });
      if (valid) {
        if (ok) ok.classList.add('show');
        form.reset();
        toast(t('tc_done'), 'ok');
      } else {
        toast('Please fill all fields correctly.', 'err');
      }
    });
  }

  /* ----- global client-side tool registry (across all 6 categories) ----- */
  var TOOLS_REGISTRY = [
    // Category 1: Images & Design (9 live tools)
    { id: 'compress', category: 'images', catKey: 'cat_images_t', titleKey: 't_compress_t', descKey: 't_compress_d', url: 'pages/tools/compress.html', catUrl: 'pages/categories/images.html', status: 'live', icon: 'compress', keywords: 'compress shrink reduce size kb mb png jpg webp' },
    { id: 'resize', category: 'images', catKey: 'cat_images_t', titleKey: 't_resize_t', descKey: 't_resize_d', url: 'pages/tools/resize.html', catUrl: 'pages/categories/images.html', status: 'live', icon: 'resize', keywords: 'resize dimensions width height px percent social instagram youtube' },
    { id: 'convert', category: 'images', catKey: 'cat_images_t', titleKey: 't_convert_t', descKey: 't_convert_d', url: 'pages/tools/convert.html', catUrl: 'pages/categories/images.html', status: 'live', icon: 'convert', keywords: 'convert format jpg png webp avif ico pdf bmp favicon' },
    { id: 'crop', category: 'images', catKey: 'cat_images_t', titleKey: 't_crop_t', descKey: 't_crop_d', url: 'pages/tools/crop.html', catUrl: 'pages/categories/images.html', status: 'live', icon: 'crop', keywords: 'crop trim rotate flip circle avatar aspect ratio' },
    { id: 'remove-bg', category: 'images', catKey: 'cat_images_t', titleKey: 't_removebg_t', descKey: 't_removebg_d', url: 'pages/tools/remove-bg.html', catUrl: 'pages/categories/images.html', status: 'live', icon: 'removebg', keywords: 'remove background transparent cutout ai eraser' },
    { id: 'cartoon', category: 'images', catKey: 'cat_images_t', titleKey: 't_cartoon_t', descKey: 't_cartoon_d', url: 'pages/tools/cartoon.html', catUrl: 'pages/categories/images.html', status: 'live', icon: 'cartoon', keywords: 'cartoon anime sketch oil watercolor pop art illustration' },
    { id: 'enhance', category: 'images', catKey: 'cat_images_t', titleKey: 't_enhance_t', descKey: 't_enhance_d', url: 'pages/tools/enhance.html', catUrl: 'pages/categories/images.html', status: 'live', icon: 'enhance', keywords: 'enhance clarity sharpen denoise brightness contrast old photo' },
    { id: 'filters', category: 'images', catKey: 'cat_images_t', titleKey: 't_filters_t', descKey: 't_filters_d', url: 'pages/tools/filters.html', catUrl: 'pages/categories/images.html', status: 'live', icon: 'filters', keywords: 'filters presets vintage sepia noir golden hour color grading' },
    { id: 'editor', category: 'images', catKey: 'cat_images_t', titleKey: 't_editor_t', descKey: 't_editor_d', url: 'pages/advanced-editor.html', catUrl: 'pages/categories/images.html', status: 'live', icon: 'editor', keywords: 'advanced editor canvas layers text shapes drawing design' },

    // Category 2: AI Design Studio (8 live tools)
    { id: 'passport-photo', category: 'ai-design', catKey: 'cat_ai_t', titleKey: 't_passport_t', descKey: 't_passport_d', url: 'pages/tools/passport-photo.html', catUrl: 'pages/categories/ai-design.html', status: 'live', icon: 'passport', keywords: 'passport photo visa biometric background white blue 4x6 35x45 51x51 50x70 50x60 30x40 25x35 2x2 5x7 a4 300 dpi pdf صورة جواز سفر تأشيرة فيزا بيومترية خلفية بيضاء طباعة' },
    { id: 'thumbnail-maker', category: 'ai-design', catKey: 'cat_ai_t', titleKey: 't_thumbnail_t', descKey: 't_thumbnail_d', url: 'pages/tools/thumbnail-maker.html', catUrl: 'pages/categories/ai-design.html', status: 'live', icon: 'thumbnail', keywords: 'youtube thumbnail editor maker shorts reels instagram cover ctr banner cutout outline glow fonts shapes arrows feed preview محرر تصميم صورة مصغرة يوتيوب شورتس غلاف خطوط عربية اشكال اسهم ازالة خلفية' },
    { id: 'sticker-studio', category: 'ai-design', catKey: 'cat_ai_t', titleKey: 't_sticker_studio_t', descKey: 't_sticker_studio_d', url: 'pages/tools/sticker-studio.html', catUrl: 'pages/categories/ai-design.html', status: 'live', icon: 'sticker', keywords: 'sticker studio die cut whatsapp 512px telegram print sheet meme comic generator greeting quote card wall art store promo badge discount offer cutout ml ملصقات واتساب مقصوصة استوديو ميمز بطاقات معايدة لوحات اقتباس شارات متاجر عروض خصومات' },
    { id: 'coloring-page', category: 'ai-design', catKey: 'cat_ai_t', titleKey: 't_coloring_t', descKey: 't_coloring_d', url: 'pages/tools/coloring-page.html', catUrl: 'pages/categories/ai-design.html', status: 'live', icon: 'book', keywords: 'photo to coloring page line art sketch mandala comic ink kids printable sheet a4 letter 300 dpi pdf تحويل صورة صفحة تلوين رسم خطي أطفال ماندالا قلم رصاص طباعة' },
    { id: 'wallpaper-generator', category: 'ai-design', catKey: 'cat_ai_t', titleKey: 't_wallpaper_t', descKey: 't_wallpaper_d', url: 'pages/tools/wallpaper-generator.html', catUrl: 'pages/categories/ai-design.html', status: 'live', icon: 'monitor', keywords: 'wallpaper generator 4k mesh gradient seamless pattern nebula mountain sunset city skyline topographic glassmorphism blur svg مولد خلفيات انماط هندسية تدرجات ايفون 4k سديم جبال مدينة طبوغرافي' },
    { id: 'profile-picture', category: 'ai-design', catKey: 'cat_ai_t', titleKey: 't_pfp_t', descKey: 't_pfp_d', url: 'pages/tools/profile-picture.html', catUrl: 'pages/categories/ai-design.html', status: 'live', icon: 'usercircle', keywords: 'profile picture maker pfp avatar linkedin ring 3d popout background cutout opentowork hiring curved text zip صانع صور شخصية بروفايل اطار لينكدان انستغرام واتساب' },
    { id: 'mockup-studio', category: 'ai-design', catKey: 'cat_ai_t', titleKey: 't_mockup_t', descKey: 't_mockup_d', url: 'pages/tools/mockup-studio.html', catUrl: 'pages/categories/ai-design.html', status: 'live', icon: 'monitor', keywords: 'mockup studio iphone 16 macbook ipad watch book frame mug tshirt hoodie tote packaging polo shirt storefront blade sign glass door ai background removal 3d showcase transparent png موك اب اجهزة منتجات ايفون لابتوب ماك بوك كوب تيشيرت بولو لافتة متجر ازالة خلفية الشعار' },
    { id: 'photo-collage', category: 'ai-design', catKey: 'cat_ai_t', titleKey: 't_collage_t', descKey: 't_collage_d', url: 'pages/tools/photo-collage.html', catUrl: 'pages/categories/ai-design.html', status: 'live', icon: 'grid', keywords: 'smart photo collage maker bento grid editorial magazine filmstrip polaroid honeycomb heart mosaic a4 300 dpi pdf كولاج صور شبكات بنتو مجلة بولارويد أشكال هندسية طباعة' },

    // Category 3: Text & Content (6 live tools)
    { id: 'fancy-text', category: 'text', catKey: 'cat_text_t', titleKey: 'txt_fancy_t', descKey: 'txt_fancy_d', url: 'pages/tools/fancy-text.html', catUrl: 'pages/categories/text.html', status: 'live', icon: 'type', keywords: 'fancy text unicode fonts decoration bio arabic kashida gaming symbols زخرفة نصوص خطوط عربية كشيدة اسماء العاب رموز' },
    { id: 'word-counter', category: 'text', catKey: 'cat_text_t', titleKey: 'txt_counter_t', descKey: 'txt_counter_d', url: 'pages/tools/word-counter.html', catUrl: 'pages/categories/text.html', status: 'live', icon: 'hash', keywords: 'word counter character count sentences paragraphs reading time speaking time seo keyword density twitter meta instagram عداد كلمات احرف كثافة مفتاحية قراءة' },
    { id: 'text-formatter', category: 'text', catKey: 'cat_text_t', titleKey: 'txt_format_t', descKey: 'txt_format_d', url: 'pages/tools/text-formatter.html', catUrl: 'pages/categories/text.html', status: 'live', icon: 'align', keywords: 'text formatter cleaner pdf line breaks extra spaces empty duplicate lines arabic diacritics tashkeel html strip uppercase lowercase title sentence case sort reverse number extract emails urls تنسيق تنظيف النصوص تشكيل ايميلات روابط' },
    { id: 'text-summarizer', category: 'text', catKey: 'cat_text_t', titleKey: 't_summarizer_t', descKey: 't_summarizer_d', url: 'pages/tools/text-summarizer.html', catUrl: 'pages/categories/text.html', status: 'live', icon: 'filetext', keywords: 'smart ai text summarizer key points study notes executive summary article word pdf تلخيص ملخص نصوص' },
    { id: 'text-diff', category: 'text', catKey: 'cat_text_t', titleKey: 't_diff_t', descKey: 't_diff_d', url: 'pages/tools/text-diff.html', catUrl: 'pages/categories/text.html', status: 'live', icon: 'diff', keywords: 'text diff compare difference additions deletions contracts code word by word line by line مقارنة النصوص فروقات تعديلات' },
    { id: 'image-to-text', category: 'text', catKey: 'cat_text_t', titleKey: 't_ocr_t', descKey: 't_ocr_d', url: 'pages/tools/image-to-text.html', catUrl: 'pages/categories/text.html', status: 'live', icon: 'ocr', keywords: 'ocr image to text scan photo screenshot arabic english tesseract extract copy word txt استخراج النص من الصورة مسح ضوئي عربي انجليزي' },

    // Category 4: Business & E-Commerce (1 live + 3 planned)
    { id: 'qr-reader', category: 'business', catKey: 'cat_business_t', titleKey: 't_qr_t', descKey: 't_qr_d', url: 'pages/qr-reader.html', catUrl: 'pages/categories/business.html', status: 'live', icon: 'qr', keywords: 'qr reader barcode scanner camera scan' },
    { id: 'qr-generator', category: 'business', catKey: 'cat_business_t', titleKey: 'biz_qrgen_t', descKey: 'biz_qrgen_d', url: 'pages/categories/business.html', catUrl: 'pages/categories/business.html', status: 'soon', icon: 'qrgen', keywords: 'custom qr code generator logo wifi vcard' },
    { id: 'whatsapp-link', category: 'business', catKey: 'cat_business_t', titleKey: 'biz_whatsapp_t', descKey: 'biz_whatsapp_d', url: 'pages/categories/business.html', catUrl: 'pages/categories/business.html', status: 'soon', icon: 'message', keywords: 'whatsapp link generator wa.me business chat' },
    { id: 'invoice-generator', category: 'business', catKey: 'cat_business_t', titleKey: 'biz_invoice_t', descKey: 'biz_invoice_d', url: 'pages/categories/business.html', catUrl: 'pages/categories/business.html', status: 'soon', icon: 'receipt', keywords: 'invoice receipt generator pdf billing' },

    // Category 5: Video & Media (2 live + 2 planned tools)
    { id: 'yt-thumbnail', category: 'media', catKey: 'cat_media_t', titleKey: 't_yt_thumb_t', descKey: 't_yt_thumb_d', url: 'pages/tools/yt-thumbnail.html', catUrl: 'pages/categories/media.html', status: 'live', icon: 'video', keywords: 'youtube thumbnail downloader grabber hd 4k cover shorts yt-thumbnail تحميل صورة مصغرة يوتيوب غلاف فيديو' },
    { id: 'video-to-audio', category: 'media', catKey: 'cat_media_t', titleKey: 'media_v2a_t', descKey: 'media_v2a_d', url: 'pages/categories/media.html', catUrl: 'pages/categories/media.html', status: 'soon', icon: 'music', keywords: 'video to audio extractor mp4 mp3 wav extract audio تحويل استخراج الصوت من الفيديو' },
    { id: 'video-frame', category: 'media', catKey: 'cat_media_t', titleKey: 't_video_frame_t', descKey: 't_video_frame_d', url: 'pages/tools/video-frame.html', catUrl: 'pages/categories/media.html', status: 'live', icon: 'film', keywords: 'video frame grabber burst capture screenshot snapshot mp4 webm mov mkv zip png jpg webp استخراج لقطات من الفيديو تصوير متتابع التقاط صورة من فيديو' },
    { id: 'audio-trimmer', category: 'media', catKey: 'cat_media_t', titleKey: 'med_audio_t', descKey: 'med_audio_d', url: 'pages/categories/media.html', catUrl: 'pages/categories/media.html', status: 'soon', icon: 'music', keywords: 'audio trimmer booster cutter wav convert قص وتحسين الصوتيات' },

    // Category 6: PDF & Utilities (5 planned tools)
    { id: 'pdf-merge-split', category: 'pdf-utils', catKey: 'cat_pdf_t', titleKey: 'pdf_merge_t', descKey: 'pdf_merge_d', url: 'pages/categories/pdf-utils.html', catUrl: 'pages/categories/pdf-utils.html', status: 'soon', icon: 'files', keywords: 'merge split pdf pages combine extract' },
    { id: 'image-pdf-converter', category: 'pdf-utils', catKey: 'cat_pdf_t', titleKey: 'pdf_convert_t', descKey: 'pdf_convert_d', url: 'pages/categories/pdf-utils.html', catUrl: 'pages/categories/pdf-utils.html', status: 'soon', icon: 'filetext', keywords: 'image to pdf converter pdf to png jpg' },
    { id: 'esign-pdf', category: 'pdf-utils', catKey: 'cat_pdf_t', titleKey: 'pdf_esign_t', descKey: 'pdf_esign_d', url: 'pages/categories/pdf-utils.html', catUrl: 'pages/categories/pdf-utils.html', status: 'soon', icon: 'pen', keywords: 'esign pdf signature sign document' },
    { id: 'password-generator', category: 'pdf-utils', catKey: 'cat_pdf_t', titleKey: 'util_pass_t', descKey: 'util_pass_d', url: 'pages/categories/pdf-utils.html', catUrl: 'pages/categories/pdf-utils.html', status: 'soon', icon: 'key', keywords: 'password generator secure random crypto' },
    { id: 'pomodoro-timer', category: 'pdf-utils', catKey: 'cat_pdf_t', titleKey: 'util_pomo_t', descKey: 'util_pomo_d', url: 'pages/categories/pdf-utils.html', catUrl: 'pages/categories/pdf-utils.html', status: 'soon', icon: 'clock', keywords: 'pomodoro focus timer productivity' }
  ];

  var SVG_ICON_PATHS = {
    compress: ['M4 14h6v6', 'M20 10h-6V4', 'M14 10l7-7', 'M3 21l7-7'],
    resize: ['M15 3h6v6', 'M9 21H3v-6', 'M21 3l-7 7', 'M3 21l7-7'],
    convert: ['M7 16V4m0 0L3 8m4-4l4 4', 'M17 8v12m0 0l4-4m-4 4l-4-4'],
    crop: ['M6 2v14a2 2 0 0 0 2 2h14', 'M18 22V8a2 2 0 0 0-2-2H2'],
    removebg: ['M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3Z'],
    cartoon: ['M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-3.9V6a4 4 0 0 0-5-4Z', 'M8.5 10.5h.01', 'M15.5 10.5h.01', 'M9.5 15a3.5 3.5 0 0 0 5 0'],
    enhance: ['M12 3v3', 'M12 18v3', 'M3 12h3', 'M18 12h3', 'm5.6 5.6 2.1 2.1', 'm16.3 16.3 2.1 2.1', 'm5.6 18.4 2.1-2.1', 'm16.3 7.7 2.1-2.1', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z'],
    filters: ['M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z', 'M14.31 8l5.74 9.94', 'M9.69 8h11.48', 'M7.38 12l5.74-9.94', 'M9.69 16L3.95 6.06', 'M14.31 16H2.83', 'M16.62 12l-5.74 9.94'],
    editor: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'],
    qr: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h3v3h-3z', 'M19 14h2v2h-2z', 'M14 19h2v2h-2z', 'M18 18h3v3h-3z'],
    qrgen: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
    sparkles: ['M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3Z'],
    passport: ['M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M9.5 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M6.5 16.5c.8-1.8 2-2.5 3-2.5s2.2.7 3 2.5', 'M15 9h3', 'M15 13h3'],
    thumbnail: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M10 9l6 3-6 3V9Z'],
    sticker: ['M15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9Z', 'M15 3v6h6', 'M8 14s1.5 2 4 2 4-2 4-2', 'M9.5 10h.01', 'M14.5 10h.01'],
    usercircle: ['M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z', 'M12 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Z', 'M7 18.2a6 6 0 0 1 10 0'],
    quote: ['M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1Z', 'M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1Z'],
    frame: ['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Z', 'M7 15l3-3 2 2 4-4 3 3'],
    monitor: ['M3 4h18v12H3z', 'M8 20h8', 'M12 16v4'],
    layers: ['M12 2 2 7l10 5 10-5-10-5Z', 'M2 12l10 5 10-5', 'M2 17l10 5 10-5'],
    palette: ['M12 2a10 10 0 0 0 0 20 2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h1a4 4 0 0 0 0-8A10 10 0 0 0 12 2Z', 'M7.5 10.5h.01', 'M10.5 7.5h.01', 'M14.5 7.5h.01'],
    grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
    smile: ['M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z', 'M8 14s1.5 2 4 2 4-2 4-2', 'M9 9h.01', 'M15 9h.01'],
    tag: ['M12 2H2v10l9.29 9.29a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4L12 2Z', 'M7 7h.01'],
    pen: ['M12 19l7-7 3 3-7 7-3-3Z', 'M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5Z', 'M2 2l7.586 7.586'],
    book: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z'],
    mail: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'm22 6-10 7L2 6'],
    type: ['M4 7V4h16v3', 'M9 20h6', 'M12 4v16'],
    hash: ['M4 9h16', 'M4 15h16', 'M10 3L8 21', 'M16 3l-2 18'],
    align: ['M3 6h18', 'M3 12h12', 'M3 18h18'],
    diff: ['M4.5 4h5A1.5 1.5 0 0 1 11 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 3 18.5v-13A1.5 1.5 0 0 1 4.5 4Z', 'M14.5 4h5A1.5 1.5 0 0 1 21 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-5a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 14.5 4Z', 'M6 9h2', 'M16 9h2', 'M16 13h2'],
    filetext: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
    ocr: ['M3 7V5a2 2 0 0 1 2-2h2', 'M17 3h2a2 2 0 0 1 2 2v2', 'M21 17v2a2 2 0 0 1-2 2h-2', 'M7 21H5a2 2 0 0 1-2-2v-2', 'M7 8h6', 'M7 12h10', 'M7 16h8'],
    message: ['M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z'],
    receipt: ['M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z', 'M8 7h8', 'M8 11h8', 'M8 15h5'],
    video: ['M23 7l-7 5 7 5V7z', 'M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z'],
    mic: ['M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z', 'M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v4', 'M8 23h8'],
    film: ['M3 3h18v18H3z', 'M7 3v18', 'M17 3v18', 'M3 12h18', 'M3 7h4', 'M3 17h4', 'M17 7h4', 'M17 17h4'],
    music: ['M9 18V5l12-2v13', 'M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z', 'M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
    files: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v5h5', 'M9 13h6', 'M9 17h6'],
    key: ['M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777Zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4'],
    clock: ['M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z', 'M12 6v6l4 2']
  };

  function createIconSvg(iconId, size) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    var px = String(size || 24);
    svg.setAttribute('width', px);
    svg.setAttribute('height', px);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    var paths = SVG_ICON_PATHS[iconId] || SVG_ICON_PATHS.sparkles;
    for (var idx = 0; idx < paths.length; idx++) {
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', paths[idx]);
      svg.appendChild(p);
    }
    return svg;
  }

  /* ----- search filter (global hub registry + category-level DOM filter) ----- */
  function initSearch() {
    var box = $('#toolSearch') || $('.search-box input');
    if (!box) return;
    var catGrid = $('#categoriesGrid');
    var resultsGrid = $('#searchResultsGrid');
    var empty = $('.search-empty');

    if (catGrid && resultsGrid) {
      function renderGlobalSearch() {
        var q = box.value.toLowerCase().trim();
        while (resultsGrid.firstChild) resultsGrid.removeChild(resultsGrid.firstChild);

        if (q === '') {
          catGrid.classList.remove('hide');
          resultsGrid.classList.add('hide');
          if (empty) empty.classList.add('hide');
          return;
        }

        catGrid.classList.add('hide');
        resultsGrid.classList.remove('hide');

        var matches = TOOLS_REGISTRY.filter(function (item) {
          var enTitle = (I18N.en[item.titleKey] || '').toLowerCase();
          var arTitle = (I18N.ar[item.titleKey] || '').toLowerCase();
          var enDesc = (I18N.en[item.descKey] || '').toLowerCase();
          var arDesc = (I18N.ar[item.descKey] || '').toLowerCase();
          var enCat = (I18N.en[item.catKey] || '').toLowerCase();
          var arCat = (I18N.ar[item.catKey] || '').toLowerCase();
          var kw = (item.keywords || '').toLowerCase();
          return enTitle.indexOf(q) !== -1 || arTitle.indexOf(q) !== -1 ||
                 enDesc.indexOf(q) !== -1 || arDesc.indexOf(q) !== -1 ||
                 enCat.indexOf(q) !== -1 || arCat.indexOf(q) !== -1 ||
                 kw.indexOf(q) !== -1;
        });

        matches.forEach(function (item) {
          var card = document.createElement('div');
          card.className = 'card card-hover tool-card' + (item.status === 'soon' ? ' is-soon' : '');

          var top = document.createElement('div');
          top.className = 'tool-card-top';

          var iconWrap = document.createElement('div');
          iconWrap.className = 'tool-icon';
          iconWrap.appendChild(createIconSvg(item.icon, 24));
          top.appendChild(iconWrap);

          var statusBadge = document.createElement('span');
          statusBadge.className = 'tool-status-badge ' + (item.status === 'live' ? 'is-live' : 'is-soon');
          statusBadge.textContent = t(item.status === 'live' ? 'status_live' : 'status_soon');
          top.appendChild(statusBadge);

          card.appendChild(top);

          var catTag = document.createElement('span');
          catTag.className = 'tool-cat-tag';
          catTag.textContent = t(item.catKey);
          card.appendChild(catTag);

          var h3 = document.createElement('h3');
          h3.textContent = t(item.titleKey);
          card.appendChild(h3);

          var p = document.createElement('p');
          p.textContent = t(item.descKey);
          card.appendChild(p);

          var cta = document.createElement('a');
          cta.className = item.status === 'live' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
          cta.href = link(item.url);
          cta.textContent = t(item.status === 'live' ? 'open_tool' : 'cat_view');
          card.appendChild(cta);

          resultsGrid.appendChild(card);
        });

        if (empty) empty.classList.toggle('hide', matches.length > 0);
      }

      box.addEventListener('input', renderGlobalSearch);
      document.addEventListener('imgsfix:langchange', function () {
        if (box.value.trim() !== '') renderGlobalSearch();
      });
      return;
    }

    var grid = $('.tools-grid');
    if (!grid) return;
    box.addEventListener('input', function () {
      var q = box.value.toLowerCase().trim();
      var visible = 0;
      $$('.tool-card', grid).forEach(function (card) {
        var text = (card.textContent || '').toLowerCase();
        var match = q === '' || text.indexOf(q) !== -1;
        card.classList.toggle('hide', !match);
        if (match) visible++;
      });
      if (empty) empty.classList.toggle('hide', visible > 0);
    });
  }

  /* ----- modal helper ----- */
  function openModal(title, body, onConfirm) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="modal-box" role="dialog" aria-modal="true">' +
        '<button class="modal-close" aria-label="Close">×</button>' +
        '<h3></h3><p></p>' +
        '<div class="modal-actions">' +
          '<button class="btn btn-secondary btn-sm modal-cancel" data-i18n="modal_cancel">Cancel</button>' +
          '<button class="btn btn-primary btn-sm modal-ok" data-i18n="modal_confirm">Confirm</button>' +
        '</div>' +
      '</div>';
    $('h3', overlay).textContent = title;
    $('p', overlay).textContent = body;
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('show'); });
    function close() { overlay.classList.remove('show'); setTimeout(function () { overlay.remove(); }, 250); }
    $('.modal-close', overlay).addEventListener('click', close);
    $('.modal-cancel', overlay).addEventListener('click', close);
    $('.modal-ok', overlay).addEventListener('click', function () { if (onConfirm) onConfirm(); close(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  }

  /* ----- PWA install + service worker ----- */
  var deferredPrompt = null;
  function initPWA() {
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      var b1 = $('#btnInstallApp'), b2 = $('#btnInstallAppMobile');
      if (b1) b1.style.display = '';
      if (b2) b2.style.display = '';
    });
    window.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      var b1 = $('#btnInstallApp'), b2 = $('#btnInstallAppMobile');
      if (b1) b1.style.display = 'none';
      if (b2) b2.style.display = 'none';
    });
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('#btnInstallApp, #btnInstallAppMobile');
      if (!btn) return;
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () {
        deferredPrompt = null;
        btn.style.display = 'none';
      });
    });
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      var b1 = $('#btnInstallApp'), b2 = $('#btnInstallAppMobile');
      if (b1) b1.style.display = 'none';
      if (b2) b2.style.display = 'none';
    }
    if ('serviceWorker' in navigator) {
      var isViteDev = !!document.querySelector('script[src*="/@vite/client"]');
      if (isViteDev) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          regs.forEach(function (r) { r.unregister(); });
        }).catch(function () {});
        if ('caches' in window) {
          caches.keys().then(function (keys) {
            keys.forEach(function (k) { caches.delete(k); });
          }).catch(function () {});
        }
      } else {
        navigator.serviceWorker.register(BASE + 'sw.js').catch(function () {});
      }
    }
  }

  /* ----- preview backdrop switcher (shared across all 8 image tools) ----- */
  function initPreviewBackdropSwitcher() {
    var stages = $$('.tool-stage-body');
    if (!stages.length) return;

    stages.forEach(function (stageBody) {
      if (stageBody.querySelector('.preview-bg-switcher')) return;

      var switcher = document.createElement('div');
      switcher.className = 'preview-bg-switcher';
      switcher.setAttribute('role', 'group');
      switcher.setAttribute('data-i18n-aria-label', 'preview_bg_toolbar');

      var presets = [
        { id: 'studio', cls: 'swatch-studio', key: 'preview_bg_studio' },
        { id: 'white', cls: 'swatch-white', key: 'preview_bg_white' },
        { id: 'dark', cls: 'swatch-dark', key: 'preview_bg_dark' },
        { id: 'checker', cls: 'swatch-checker', key: 'preview_bg_checker' }
      ];

      function clearActive() {
        $$('.preview-bg-swatch', switcher).forEach(function (s) {
          s.classList.remove('active');
          if (s.tagName === 'BUTTON') s.setAttribute('aria-pressed', 'false');
        });
      }

      function applyBackdrop(mode, customHex) {
        if (mode === 'studio') {
          stageBody.removeAttribute('data-backdrop');
          stageBody.style.backgroundColor = '';
        } else if (mode === 'white' || mode === 'dark' || mode === 'checker') {
          stageBody.setAttribute('data-backdrop', mode);
          stageBody.style.backgroundColor = '';
        } else if (mode === 'custom' && /^#[0-9a-f]{6}$/i.test(customHex || '')) {
          stageBody.setAttribute('data-backdrop', 'custom');
          stageBody.style.backgroundColor = customHex;
        }
      }

      presets.forEach(function (p, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'preview-bg-swatch ' + p.cls + (idx === 0 ? ' active' : '');
        btn.setAttribute('data-bg', p.id);
        btn.setAttribute('aria-pressed', idx === 0 ? 'true' : 'false');
        btn.setAttribute('data-i18n-title', p.key);
        btn.setAttribute('data-i18n-aria-label', p.key);
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          clearActive();
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
          applyBackdrop(p.id);
        });
        switcher.appendChild(btn);
      });

      var customLabel = document.createElement('label');
      customLabel.className = 'preview-bg-swatch swatch-custom';
      customLabel.setAttribute('data-bg', 'custom');
      customLabel.setAttribute('data-i18n-title', 'preview_bg_custom');

      var colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'preview-bg-color-input';
      colorInput.value = '#3b82f6';
      colorInput.setAttribute('data-i18n-aria-label', 'preview_bg_custom');
      colorInput.addEventListener('click', function (e) { e.stopPropagation(); });
      colorInput.addEventListener('input', function (e) {
        e.stopPropagation();
        clearActive();
        customLabel.classList.add('active');
        applyBackdrop('custom', colorInput.value);
      });
      colorInput.addEventListener('change', function (e) {
        e.stopPropagation();
        clearActive();
        customLabel.classList.add('active');
        applyBackdrop('custom', colorInput.value);
      });

      customLabel.appendChild(colorInput);
      switcher.appendChild(customLabel);

      switcher.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      stageBody.appendChild(switcher);
    });
  }

  /* ----- shared reliable client-side download helpers ----- */
  function triggerDownload(urlOrBlob, filename) {
    if (!urlOrBlob) return false;
    var isBlob = (typeof Blob !== 'undefined') && (urlOrBlob instanceof Blob);
    var url = isBlob ? URL.createObjectURL(urlOrBlob) : String(urlOrBlob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename || 'image_imgsfix.png';
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 150);
    if (isBlob) {
      setTimeout(function () {
        try { URL.revokeObjectURL(url); } catch (_e) {}
      }, 4000);
    }
    return true;
  }

  function downloadCanvas(canvas, filename, mime, quality, onSuccess, onError) {
    if (!canvas || !canvas.width || !canvas.height) {
      if (onError) onError(new Error('Empty canvas'));
      return;
    }
    var targetMime = mime || 'image/png';
    var q = (quality !== undefined && quality !== null) ? quality : 0.92;
    var fallbackDataUrl = function () {
      try {
        var dataUrl = canvas.toDataURL(targetMime, q);
        if (!dataUrl || dataUrl === 'data:,') {
          if (onError) onError(new Error('Canvas export failed'));
          return;
        }
        triggerDownload(dataUrl, filename || 'image_imgsfix.png');
        if (onSuccess) onSuccess(null);
      } catch (err) {
        if (onError) onError(err);
      }
    };
    if (typeof canvas.toBlob === 'function') {
      try {
        canvas.toBlob(function (blob) {
          if (!blob) {
            fallbackDataUrl();
            return;
          }
          triggerDownload(blob, filename || 'image_imgsfix.png');
          if (onSuccess) onSuccess(blob);
        }, targetMime, q);
      } catch (_err) {
        fallbackDataUrl();
      }
    } else {
      fallbackDataUrl();
    }
  }

  /* ----- unified "Open in Advanced Editor" bridge (shared across all 8 image tools) ----- */
  var editorBridgeSourceProvider = null;

  function registerEditorBridgeSource(providerFn) {
    editorBridgeSourceProvider = (typeof providerFn === 'function') ? providerFn : null;
  }

  function hasTransparentPixels(canvas) {
    try {
      var sw = Math.min(128, canvas.width);
      var sh = Math.min(128, canvas.height);
      if (!sw || !sh) return false;
      var probe = document.createElement('canvas');
      probe.width = sw;
      probe.height = sh;
      var pctx = probe.getContext('2d');
      pctx.drawImage(canvas, 0, 0, sw, sh);
      var data = pctx.getImageData(0, 0, sw, sh).data;
      probe.width = 0;
      probe.height = 0;
      for (var idx = 3; idx < data.length; idx += 4) {
        if (data[idx] < 252) return true;
      }
    } catch (_e) {}
    return false;
  }

  function serializeCanvasForTransfer(canvas, preserveAlpha) {
    var MAX_DATAURL_LEN = 3800000;
    var dataUrl = canvas.toDataURL('image/png');
    if (dataUrl && dataUrl.length <= MAX_DATAURL_LEN) return dataUrl;

    if (preserveAlpha) {
      dataUrl = canvas.toDataURL('image/webp', 0.92);
      if (dataUrl && dataUrl.indexOf('data:image/webp') === 0 && dataUrl.length <= MAX_DATAURL_LEN) {
        return dataUrl;
      }
    } else {
      dataUrl = canvas.toDataURL('image/webp', 0.92);
      if (dataUrl && dataUrl.length <= MAX_DATAURL_LEN) return dataUrl;
      dataUrl = canvas.toDataURL('image/jpeg', 0.90);
      if (dataUrl && dataUrl.length <= MAX_DATAURL_LEN) return dataUrl;
    }

    var maxDims = [2000, 1400, 1000];
    for (var d = 0; d < maxDims.length; d++) {
      var cap = maxDims[d];
      var scale = Math.min(1, cap / Math.max(canvas.width, canvas.height));
      var tmp = document.createElement('canvas');
      tmp.width = Math.max(1, Math.round(canvas.width * scale));
      tmp.height = Math.max(1, Math.round(canvas.height * scale));
      var tctx = tmp.getContext('2d');
      tctx.imageSmoothingEnabled = true;
      tctx.imageSmoothingQuality = 'high';
      tctx.drawImage(canvas, 0, 0, tmp.width, tmp.height);

      if (preserveAlpha) {
        dataUrl = tmp.toDataURL('image/png');
        if (dataUrl.length > MAX_DATAURL_LEN) {
          dataUrl = tmp.toDataURL('image/webp', 0.88);
        }
      } else {
        dataUrl = tmp.toDataURL('image/webp', 0.90);
        if (dataUrl.length > MAX_DATAURL_LEN) {
          dataUrl = tmp.toDataURL('image/jpeg', 0.86);
        }
      }
      tmp.width = 0;
      tmp.height = 0;
      if (dataUrl && dataUrl.length <= MAX_DATAURL_LEN) return dataUrl;
    }
    return dataUrl;
  }

  function sanitizeBridgeName(rawName) {
    var base = String(rawName || 'image').replace(/\.[^.]+$/, '');
    base = base.replace(/[\/\\:*?"<>|\x00-\x1F]+/g, '_').replace(/^\.+|\.+$/g, '').trim();
    return base || 'image';
  }

  function initEditorBridge() {
    var stage = $('#toolStage');
    var resultActions = $('#resultActions');
    if (!stage || !resultActions || $('#editorBridgeBar')) return;

    var bar = document.createElement('div');
    bar.id = 'editorBridgeBar';
    bar.className = 'editor-bridge-bar hide';

    var copyWrap = document.createElement('div');
    copyWrap.className = 'editor-bridge-copy';

    var iconEl = document.createElement('span');
    iconEl.className = 'editor-bridge-icon';
    iconEl.setAttribute('aria-hidden', 'true');
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    var path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'm12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z');
    svg.appendChild(path);
    iconEl.appendChild(svg);

    var textEl = document.createElement('p');
    textEl.className = 'editor-bridge-text';
    textEl.setAttribute('data-i18n', 'tc_editor_bridge_hint');
    textEl.textContent = t('tc_editor_bridge_hint');

    copyWrap.appendChild(iconEl);
    copyWrap.appendChild(textEl);

    var actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.id = 'btnEditorBridge';
    actionBtn.className = 'btn btn-primary btn-sm editor-bridge-btn';
    actionBtn.setAttribute('data-i18n', 'tc_editor_bridge_btn');
    actionBtn.textContent = t('tc_editor_bridge_btn');

    bar.appendChild(copyWrap);
    bar.appendChild(actionBtn);
    stage.appendChild(bar);

    function hasActiveToolOutput() {
      var rc = $('#resultCanvas', stage);
      if (rc && rc.width > 0 && rc.height > 0) return true;
      var sc = $('#srcCanvas', stage);
      if (sc && sc.width > 0 && sc.height > 0) return true;
      var ac = $('#afterCanvas', stage);
      if (ac && ac.width > 0 && ac.height > 0) return true;
      var cc = $('#cropCanvas', stage);
      if (cc && cc.width > 0 && cc.height > 0) return true;
      var pimg = $('#previewImg', stage);
      if (pimg && pimg.getAttribute('src') && (pimg.naturalWidth > 0 || pimg.width > 0)) return true;
      return false;
    }

    function syncBridgeVisibility() {
      var actionsVisible = !resultActions.classList.contains('hide') && resultActions.style.display !== 'none';
      var show = actionsVisible && hasActiveToolOutput();
      bar.classList.toggle('hide', !show);
    }

    if (typeof MutationObserver === 'function') {
      var mo = new MutationObserver(syncBridgeVisibility);
      mo.observe(resultActions, { attributes: true, attributeFilter: ['style', 'class'] });
      var stageBody = $('.tool-stage-body', stage);
      if (stageBody) {
        mo.observe(stageBody, {
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style', 'src', 'width', 'height']
        });
      }
    }
    syncBridgeVisibility();

    function extractActiveStagePayload() {
      if (typeof editorBridgeSourceProvider === 'function') {
        var customPayload = editorBridgeSourceProvider();
        if (customPayload && customPayload.canvas && customPayload.canvas.width > 0 && customPayload.canvas.height > 0) {
          return customPayload;
        }
      }

      var fileInputEl = $('#fileInput', stage);
      var baseName = (fileInputEl && fileInputEl.files && fileInputEl.files[0])
        ? sanitizeBridgeName(fileInputEl.files[0].name)
        : 'image';

      var rc = $('#resultCanvas', stage);
      if (rc && rc.width > 0 && rc.height > 0) {
        return { canvas: rc, preserveAlpha: true, name: baseName + '_nobg' };
      }

      var ac = $('#afterCanvas', stage);
      if (ac && ac.width > 0 && ac.height > 0) {
        return { canvas: ac, preserveAlpha: hasTransparentPixels(ac), name: baseName };
      }

      var sc = $('#srcCanvas', stage);
      if (sc && sc.width > 0 && sc.height > 0) {
        return { canvas: sc, preserveAlpha: hasTransparentPixels(sc), name: baseName };
      }

      var pimg = $('#previewImg', stage);
      if (pimg && pimg.getAttribute('src') && (pimg.naturalWidth > 0 || pimg.width > 0)) {
        var pw = pimg.naturalWidth || pimg.width;
        var ph = pimg.naturalHeight || pimg.height;
        var tmp = document.createElement('canvas');
        tmp.width = pw;
        tmp.height = ph;
        var tctx = tmp.getContext('2d');
        tctx.filter = (pimg.style && pimg.style.filter) ? pimg.style.filter : 'none';
        tctx.drawImage(pimg, 0, 0, pw, ph);
        return {
          canvas: tmp,
          preserveAlpha: hasTransparentPixels(tmp),
          name: baseName + '_filtered',
          cleanup: function () { tmp.width = 0; tmp.height = 0; }
        };
      }

      var bc = $('#beforeCanvas', stage);
      if (bc && bc.width > 0 && bc.height > 0) {
        return { canvas: bc, preserveAlpha: hasTransparentPixels(bc), name: baseName };
      }

      var cc = $('#cropCanvas', stage);
      if (cc && cc.width > 0 && cc.height > 0) {
        return { canvas: cc, preserveAlpha: hasTransparentPixels(cc), name: baseName };
      }

      return null;
    }

    actionBtn.addEventListener('click', function () {
      var payload = null;
      try {
        payload = extractActiveStagePayload();
        if (!payload || !payload.canvas) {
          toast(t('tc_load_first'), 'err');
          return;
        }
        var preserveAlpha = payload.preserveAlpha !== undefined
          ? Boolean(payload.preserveAlpha)
          : hasTransparentPixels(payload.canvas);
        var dataUrl = serializeCanvasForTransfer(payload.canvas, preserveAlpha);
        if (!dataUrl || dataUrl === 'data:,') {
          toast(t('tc_transfer_err'), 'err');
          return;
        }
        sessionStorage.setItem('imgsfix_transfer_image', dataUrl);
        sessionStorage.setItem('imgsfix_transfer_name', sanitizeBridgeName(payload.name || 'image'));
        window.location.href = link('pages/advanced-editor.html');
      } catch (err) {
        console.error(err);
        toast(t('tc_transfer_err'), 'err');
      } finally {
        if (payload && typeof payload.cleanup === 'function') {
          try { payload.cleanup(); } catch (_e) {}
        }
      }
    });
  }

  /* ----- init ----- */
  function init() {
    buildHeader();
    buildFooter();
    initScrollTop();
    initPreviewBackdropSwitcher();
    initEditorBridge();
    var savedTheme = localStorage.getItem(LS_THEME) || 'light';
    applyTheme(savedTheme);
    applyLanguage(lang);
    initReveal();
    initFaq();
    initContactForm();
    initSearch();
    initPWA();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* ----- public API ----- */
  window.imgsfix = {
    t: t, applyTheme: applyTheme, applyLanguage: applyLanguage, toggleTheme: toggleTheme,
    toast: toast, openModal: openModal, $: $, $$: $$, BASE: BASE, link: link,
    triggerDownload: triggerDownload, downloadCanvas: downloadCanvas,
    registerEditorBridgeSource: registerEditorBridgeSource,
    TOOLS_REGISTRY: TOOLS_REGISTRY,
    get lang() { return lang; }
  };

})();
