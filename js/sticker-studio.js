/* imgsfix — sticker-studio.js
   100% client-side 4-in-1 Creative Studio:
   1. Die-Cut Stickers (AI background removal, Restore/Erase brush, geometric cutouts,
      smooth die-cut outline engine around image + fused text, 42 graphic stickers,
      massive bilingual phrase bank, WhatsApp 512x512 preview & A4/4x6 print sheets via jsPDF)
   2. Meme & Comic Maker (18 classic meme templates, Top/Bottom Impact/Cairo captions,
      speech/thought/shout bubbles, custom uploads & reaction stickers)
   3. Greeting & Quote Cards (Post 1:1, Story 9:16, A4 300 DPI Poster, 8 luxury backdrops +
      8 ornate/geometric/floral/minimal frames, bilingual greetings & quotes, Recipient/Sender,
      framed photo insertion, PNG/JPG/PDF export)
   4. Store Promo Badges (16 badge/seal shapes, store presets EN/AR, color themes,
      standalone transparent PNG badge or stamped onto uploaded product photo)
*/
'use strict';

import { removeBackground, preload } from '@imgly/background-removal';
import { jsPDF } from 'jspdf';

(function () {
  var I = window.imgsfix || {};
  var $ = I.$ || function (s, r) { return (r || document).querySelector(s); };
  var $$ = I.$$ || function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var t = I.t || function (k) { return k; };
  var toast = I.toast || function () {};

  /* ----- Constants ----- */
  var MAX_FILE_BYTES = 30 * 1024 * 1024;
  var MAX_IMAGE_DIM = 12000;
  var MAX_UNDO = 28;
  var ALLOWED_MIMES = {
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'image/bmp': true,
    'image/gif': true,
  };

  /* Categorized Bilingual Font Library (12 AR + 12 EN = 24 Fonts) */
  var FONT_LIBRARY = [
    /* 12 Arabic Fonts */
    { id: 'cairo',      group: 'ar', label: 'Cairo',                family: 'Cairo',                weight: '900', css: '"Cairo", system-ui, sans-serif',              sample: 'نص بارز' },
    { id: 'tajawal',    group: 'ar', label: 'Tajawal',              family: 'Tajawal',              weight: '800', css: '"Tajawal", "Cairo", sans-serif',              sample: 'نص بارز' },
    { id: 'changa',     group: 'ar', label: 'Changa',               family: 'Changa',               weight: '800', css: '"Changa", "Cairo", sans-serif',               sample: 'نص بارز' },
    { id: 'almarai',    group: 'ar', label: 'Almarai',              family: 'Almarai',              weight: '800', css: '"Almarai", "Cairo", sans-serif',              sample: 'نص بارز' },
    { id: 'ibm_ar',     group: 'ar', label: 'IBM Plex Sans Arabic', family: 'IBM Plex Sans Arabic', weight: '700', css: '"IBM Plex Sans Arabic", "Cairo", sans-serif', sample: 'نص بارز' },
    { id: 'readex',     group: 'ar', label: 'Readex Pro',           family: 'Readex Pro',           weight: '700', css: '"Readex Pro", "Cairo", sans-serif',           sample: 'نص بارز' },
    { id: 'amiri',      group: 'ar', label: 'Amiri',                family: 'Amiri',                weight: '700', css: '"Amiri", Georgia, serif',                     sample: 'نص بارز' },
    { id: 'aref_ruqaa', group: 'ar', label: 'Aref Ruqaa',           family: 'Aref Ruqaa',           weight: '700', css: '"Aref Ruqaa", "Amiri", serif',                sample: 'نص بارز' },
    { id: 'lalezar',    group: 'ar', label: 'Lalezar',              family: 'Lalezar',              weight: '400', css: '"Lalezar", "Cairo", sans-serif',              sample: 'نص بارز' },
    { id: 'reem_kufi',  group: 'ar', label: 'Reem Kufi',            family: 'Reem Kufi',            weight: '700', css: '"Reem Kufi", "Cairo", sans-serif',            sample: 'نص بارز' },
    { id: 'el_messiri', group: 'ar', label: 'El Messiri',           family: 'El Messiri',           weight: '700', css: '"El Messiri", "Cairo", sans-serif',           sample: 'نص بارز' },
    { id: 'lemonada',   group: 'ar', label: 'Lemonada',             family: 'Lemonada',             weight: '700', css: '"Lemonada", "Cairo", sans-serif',             sample: 'نص بارز' },
    /* 12 English Fonts */
    { id: 'impact',     group: 'en', label: 'Impact',           family: 'Impact',           weight: '900', css: 'Impact, "Arial Black", sans-serif',       sample: 'STICKER' },
    { id: 'anton',      group: 'en', label: 'Anton',            family: 'Anton',            weight: '400', css: '"Anton", Impact, sans-serif',             sample: 'STICKER' },
    { id: 'bebas',      group: 'en', label: 'Bebas Neue',       family: 'Bebas Neue',       weight: '400', css: '"Bebas Neue", Impact, sans-serif',        sample: 'STICKER' },
    { id: 'montserrat', group: 'en', label: 'Montserrat',       family: 'Montserrat',       weight: '900', css: '"Montserrat", system-ui, sans-serif',     sample: 'STICKER' },
    { id: 'oswald',     group: 'en', label: 'Oswald',           family: 'Oswald',           weight: '700', css: '"Oswald", Impact, sans-serif',            sample: 'STICKER' },
    { id: 'poppins',    group: 'en', label: 'Poppins',          family: 'Poppins',          weight: '800', css: '"Poppins", system-ui, sans-serif',        sample: 'STICKER' },
    { id: 'roboto',     group: 'en', label: 'Roboto',           family: 'Roboto',           weight: '900', css: '"Roboto", system-ui, sans-serif',         sample: 'STICKER' },
    { id: 'luckiest',   group: 'en', label: 'Luckiest Guy',     family: 'Luckiest Guy',     weight: '400', css: '"Luckiest Guy", Impact, sans-serif',      sample: 'STICKER' },
    { id: 'bangers',    group: 'en', label: 'Bangers',          family: 'Bangers',          weight: '400', css: '"Bangers", Impact, sans-serif',           sample: 'STICKER' },
    { id: 'playfair',   group: 'en', label: 'Playfair Display', family: 'Playfair Display', weight: '900', css: '"Playfair Display", Georgia, serif',      sample: 'Sticker' },
    { id: 'pacifico',   group: 'en', label: 'Pacifico',         family: 'Pacifico',         weight: '400', css: '"Pacifico", Georgia, cursive',            sample: 'Sticker' },
    { id: 'marker',     group: 'en', label: 'Permanent Marker', family: 'Permanent Marker', weight: '400', css: '"Permanent Marker", Impact, cursive',     sample: 'STICKER' },
  ];
  var loadedFonts = new Set();

  var MODE_PRESETS = {
    sticker: [
      { id: 'st_1024', w: 1024, h: 1024, labelKey: 'ss_pr_st_full', fallback: 'Studio 1024px' },
      { id: 'st_512',  w: 512,  h: 512,  labelKey: 'ss_pr_st_wa',   fallback: 'WhatsApp 512px' },
    ],
    meme: [
      { id: 'mm_sq',   w: 1080, h: 1080, labelKey: 'ss_pr_sq',      fallback: 'Square 1:1' },
      { id: 'mm_4_3',  w: 1200, h: 900,  labelKey: 'ss_pr_classic', fallback: 'Classic 4:3' },
      { id: 'mm_port', w: 1080, h: 1350, labelKey: 'ss_pr_port',    fallback: 'Portrait 4:5' },
    ],
    card: [
      { id: 'cd_sq',   w: 1080, h: 1080, labelKey: 'ss_pr_sq',      fallback: 'Square Post' },
      { id: 'cd_st',   w: 1080, h: 1920, labelKey: 'ss_pr_story',   fallback: 'Story 9:16' },
      { id: 'cd_a4',   w: 1754, h: 2480, labelKey: 'ss_pr_a4',      fallback: 'A4 Poster (Print)' },
    ],
    badge: [
      { id: 'bd_1000', w: 1000, h: 1000, labelKey: 'ss_pr_bd_sq',   fallback: 'Badge 1000px' },
      { id: 'bd_prod', w: 1200, h: 1200, labelKey: 'ss_pr_bd_prod', fallback: 'Product 1200px' },
    ],
  };

  /* ----- Phrase Library (Mode 1: Die-Cut Stickers) ----- */
  var PHRASE_BANK = {
    greetings: [
      { txt: 'صباح الخير', bg: '#0EA5E9', fg: '#FFFFFF' },
      { txt: 'مساء الخير', bg: '#6366F1', fg: '#FFFFFF' },
      { txt: 'جمعة مباركة', bg: '#059669', fg: '#FFFFFF' },
      { txt: 'أهلاً', bg: '#2563EB', fg: '#FFFFFF' },
      { txt: 'شكراً', bg: '#DB2777', fg: '#FFFFFF' },
      { txt: 'جزاك الله خيراً', bg: '#0F766E', fg: '#FFFFFF' },
      { txt: 'Good Morning', bg: '#F59E0B', fg: '#111827' },
      { txt: 'Thank You', bg: '#10B981', fg: '#FFFFFF' },
      { txt: 'Hello!', bg: '#2563EB', fg: '#FFFFFF' },
    ],
    reactions: [
      { txt: 'ممتاز!', bg: '#16A34A', fg: '#FFFFFF' },
      { txt: 'عاش!', bg: '#EA580C', fg: '#FFFFFF' },
      { txt: 'هههه', bg: '#FACC15', fg: '#111827' },
      { txt: 'مصدوم!', bg: '#DC2626', fg: '#FFFFFF' },
      { txt: 'تمام', bg: '#0EA5E9', fg: '#FFFFFF' },
      { txt: 'من عيوني', bg: '#7C3AED', fg: '#FFFFFF' },
      { txt: 'ألف مبروك', bg: '#D97706', fg: '#FFFFFF' },
      { txt: 'OMG!', bg: '#EC4899', fg: '#FFFFFF' },
      { txt: 'LOL', bg: '#FACC15', fg: '#111827' },
      { txt: 'YES!', bg: '#16A34A', fg: '#FFFFFF' },
      { txt: 'BOSS', bg: '#111827', fg: '#FACC15' },
    ],
    store: [
      { txt: 'خصم 50%', bg: '#DC2626', fg: '#FFFFFF' },
      { txt: 'عرض خاص', bg: '#EA580C', fg: '#FFFFFF' },
      { txt: 'توصيل مجاني', bg: '#16A34A', fg: '#FFFFFF' },
      { txt: 'الأكثر مبيعاً', bg: '#7C3AED', fg: '#FFFFFF' },
      { txt: 'VIP', bg: '#111827', fg: '#FACC15' },
      { txt: 'SALE', bg: '#DC2626', fg: '#FFFFFF' },
      { txt: 'FREE SHIPPING', bg: '#059669', fg: '#FFFFFF' },
    ],
    occasions: [
      { txt: 'عيد سعيد', bg: '#059669', fg: '#FFFFFF' },
      { txt: 'كل عام وأنتم بخير', bg: '#0EA5E9', fg: '#FFFFFF' },
      { txt: 'رمضان كريم', bg: '#1E3A8A', fg: '#FDE047' },
      { txt: 'عيد ميلاد مجيد', bg: '#B91C1C', fg: '#FFFFFF' },
      { txt: 'عيد قيامة مجيد', bg: '#7C3AED', fg: '#FFFFFF' },
      { txt: 'سنة جديدة سعيدة', bg: '#D97706', fg: '#FFFFFF' },
      { txt: 'مبروك التخرج', bg: '#1D4ED8', fg: '#FFFFFF' },
      { txt: 'مبروك الزواج', bg: '#DB2777', fg: '#FFFFFF' },
      { txt: 'Eid Mubarak', bg: '#059669', fg: '#FFFFFF' },
      { txt: 'Merry Christmas', bg: '#DC2626', fg: '#FFFFFF' },
      { txt: 'Happy Easter', bg: '#8B5CF6', fg: '#FFFFFF' },
      { txt: 'Happy New Year', bg: '#0F172A', fg: '#FACC15' },
      { txt: 'Happy Birthday', bg: '#EC4899', fg: '#FFFFFF' },
      { txt: 'Congrats!', bg: '#2563EB', fg: '#FFFFFF' },
    ],
  };

  /* 42 Ready-Made Graphic Stickers */
  var GRAPHIC_STICKERS = [
    { id: 'crown',     icon: '👑', label: 'Crown',     bg: '#FACC15', ring: '#B45309' },
    { id: 'fire',      icon: '🔥', label: 'Fire',      bg: '#EF4444', ring: '#FACC15' },
    { id: 'heart',     icon: '❤️', label: 'Heart',     bg: '#EC4899', ring: '#FFFFFF' },
    { id: 'star',      icon: '⭐', label: 'Star',      bg: '#F59E0B', ring: '#FEF08A' },
    { id: 'trophy',    icon: '🏆', label: 'Trophy',    bg: '#D97706', ring: '#FEF08A' },
    { id: 'balloon',   icon: '🎈', label: 'Balloon',   bg: '#EF4444', ring: '#FFFFFF' },
    { id: 'gift',      icon: '🎁', label: 'Gift',      bg: '#8B5CF6', ring: '#FDE047' },
    { id: 'party',     icon: '🎉', label: 'Party',     bg: '#2563EB', ring: '#FACC15' },
    { id: 'laugh',     icon: '😂', label: 'Laugh',     bg: '#FACC15', ring: '#111827' },
    { id: 'love',      icon: '😍', label: 'Love',      bg: '#FB7185', ring: '#FFFFFF' },
    { id: 'shock',     icon: '😱', label: 'Shock',     bg: '#38BDF8', ring: '#1E293B' },
    { id: 'cool',      icon: '😎', label: 'Cool',      bg: '#0EA5E9', ring: '#111827' },
    { id: 'think',     icon: '🤔', label: 'Think',     bg: '#F59E0B', ring: '#111827' },
    { id: 'wink',      icon: '😉', label: 'Wink',      bg: '#FACC15', ring: '#111827' },
    { id: 'clap',      icon: '👏', label: 'Clap',      bg: '#10B981', ring: '#FFFFFF' },
    { id: 'thumbsup',  icon: '👍', label: 'Thumbs Up', bg: '#2563EB', ring: '#FFFFFF' },
    { id: 'okhand',    icon: '👌', label: 'Perfect',   bg: '#16A34A', ring: '#FFFFFF' },
    { id: 'muscle',    icon: '💪', label: 'Strong',    bg: '#EA580C', ring: '#FFFFFF' },
    { id: 'rocket',    icon: '🚀', label: 'Rocket',    bg: '#1D4ED8', ring: '#38BDF8' },
    { id: 'hundred',   icon: '💯', label: '100',       bg: '#DC2626', ring: '#FFFFFF' },
    { id: 'sparkle',   icon: '✨', label: 'Sparkle',   bg: '#7C3AED', ring: '#FDE047' },
    { id: 'bolt',      icon: '⚡', label: 'Flash',     bg: '#FACC15', ring: '#111827' },
    { id: 'check',     icon: '✅', label: 'Done',      bg: '#16A34A', ring: '#FFFFFF' },
    { id: 'cross',     icon: '❌', label: 'Nope',      bg: '#DC2626', ring: '#FFFFFF' },
    { id: 'warning',   icon: '⚠️', label: 'Alert',     bg: '#FACC15', ring: '#111827' },
    { id: 'bell',      icon: '🔔', label: 'Bell',      bg: '#F59E0B', ring: '#FFFFFF' },
    { id: 'target',    icon: '🎯', label: 'Target',    bg: '#EF4444', ring: '#FFFFFF' },
    { id: 'diamond',   icon: '💎', label: 'Diamond',   bg: '#06B6D4', ring: '#FFFFFF' },
    { id: 'medal',     icon: '🥇', label: 'Gold',      bg: '#D97706', ring: '#FEF08A' },
    { id: 'saletag',   icon: '🏷️', label: 'Sale Tag',  bg: '#DC2626', ring: '#FACC15' },
    { id: 'money',     icon: '💰', label: 'Bag',       bg: '#15803D', ring: '#FACC15' },
    { id: 'coffee',    icon: '☕', label: 'Coffee',    bg: '#78350F', ring: '#FDE68A' },
    { id: 'camera',    icon: '📸', label: 'Photo',     bg: '#1E293B', ring: '#38BDF8' },
    { id: 'music',     icon: '🎵', label: 'Music',     bg: '#DB2777', ring: '#FFFFFF' },
    { id: 'idea',      icon: '💡', label: 'Idea',      bg: '#F59E0B', ring: '#111827' },
    { id: 'flower',    icon: '🌸', label: 'Bloom',     bg: '#F472B6', ring: '#FFFFFF' },
    { id: 'butterfly', icon: '🦋', label: 'Butterfly', bg: '#3B82F6', ring: '#E0F2FE' },
    { id: 'sun',       icon: '☀️', label: 'Sun',       bg: '#F59E0B', ring: '#FEF08A' },
    { id: 'moon',      icon: '🌙', label: 'Crescent',  bg: '#1E3A8A', ring: '#FACC15' },
    { id: 'rainbow',   icon: '🌈', label: 'Rainbow',   bg: '#0EA5E9', ring: '#FFFFFF' },
    { id: 'cat',       icon: '😻', label: 'Cat Love',  bg: '#F43F5E', ring: '#FFFFFF' },
    { id: 'grad',      icon: '🎓', label: 'Grad',      bg: '#1E293B', ring: '#FACC15' },
  ];

  /* 18 Classic Meme Layouts (Mode 2) */
  var MEME_TEMPLATES = [
    { id: 'drake',     en: 'Drake Approve / Reject', ar: 'الرفض والموافقة (دريك)',        top: 'DOING IT MANUALLY',    bot: 'USING IMGSFIX IN BROWSER' },
    { id: 'buttons',   en: 'Two-Button Dilemma',     ar: 'حيرة الزرّين الصعبين',          top: 'SLEEP EARLY',          bot: 'FIX ONE MORE BUG' },
    { id: 'brain',     en: 'Expanding Brain',        ar: 'تطوّر الدماغ (٤ مستويات)',      top: 'BASIC IDEA',           bot: 'GALAXY BRAIN MOVE' },
    { id: 'distract',  en: 'Distracted Choice',      ar: 'الالتفات للخيار الجديد',        top: 'NEW SHINY IDEA',       bot: 'CURRENT TASK' },
    { id: 'changemind',en: 'Change My Mind',         ar: 'حاول تقنعني بالعكس',            top: 'CLIENT-SIDE PRIVACY',  bot: 'IS ALWAYS BETTER' },
    { id: 'success',   en: 'Pure Victory',           ar: 'لحظة الانتصار الكامل',         top: 'ZERO BUGS',            bot: 'ON THE FIRST BUILD' },
    { id: 'fine',      en: 'This Is Fine',           ar: 'الوضع تمام التمام',            top: 'DEADLINE IN 5 MINS',   bot: 'THIS IS FINE' },
    { id: 'twopanel',  en: '2-Panel Comparison',     ar: 'مقارنة بين خانتين',            top: 'EXPECTATION',          bot: 'REALITY' },
    { id: 'tuxedo',    en: 'Casual vs Tuxedo',       ar: 'عادي مقابل احترافي',           top: 'REGULAR MEME',         bot: 'HIGH-RES STUDIO MEME' },
    { id: 'doge',      en: 'Strong vs Tiny Doge',    ar: 'القوي مقابل الضعيف',           top: 'THEN: 10 STEPS',       bot: 'NOW: 1 CLICK' },
    { id: 'slap',      en: 'Comic Reality Slap',     ar: 'كف الواقع الكوميدي',           top: 'JUST UPLOAD IT TO...', bot: '100% LOCAL IN BROWSER!' },
    { id: 'stonks',    en: 'Stonks Trending Up',     ar: 'صعود الأرباح والمشاهدات',      top: 'POSTED A FUNNY MEME',  bot: 'STONKS +900%' },
    { id: 'spiderman', en: 'Pointing Mirror',        ar: 'الإشارة المتبادلة',            top: 'ME AT 2 AM',           bot: 'ME AT 8 AM' },
    { id: 'pills',     en: 'Red vs Blue Choice',     ar: 'الحبة الحمراء والزرقاء',        top: 'HARD WORK',            bot: 'SMART SHORTCUT' },
    { id: 'panik',     en: 'Panik / Kalm / Panik',   ar: 'توتر ثم هدوء ثم توتر',          top: 'FILE CORRUPTED',       bot: 'WAIT — AUTOSAVED!' },
    { id: 'meeting',   en: 'Boardroom Window',       ar: 'اقتراح اجتماع الشركة',          top: 'WE NEED MORE POPUPS',  bot: 'MAKE IT FAST & CLEAN' },
    { id: 'galaxy',    en: 'Cosmic Epiphany',        ar: 'إلهام كوني مفاجئ',            top: 'WAIT A SECOND...',     bot: 'I JUST SOLVED IT!' },
    { id: 'classicbar',en: 'White Top Caption Bar',  ar: 'شريط تعليق أبيض كلاسيكي',      top: 'NOBODY:\nABSOLUTELY NOBODY:', bot: 'ME DESIGNING STICKERS' },
  ];

  /* Card Themes & Frames (Mode 3) */
  var CARD_BACKGROUNDS = [
    { id: 'midnight',  c1: '#0F172A', c2: '#1E3A8A', fg: '#FFFFFF', en: 'Midnight Gold',  ar: 'ليلي ذهبي' },
    { id: 'emerald',   c1: '#064E3B', c2: '#0D9488', fg: '#FFFFFF', en: 'Emerald Silk',   ar: 'حرير زمردي' },
    { id: 'ivory',     c1: '#FFFBEB', c2: '#FEF3C7', fg: '#1F2937', en: 'Royal Ivory',    ar: 'عاجي فاخر' },
    { id: 'rose',      c1: '#881337', c2: '#E11D48', fg: '#FFFFFF', en: 'Velvet Rose',    ar: 'وردي مخملي' },
    { id: 'sapphire',  c1: '#1E1B4B', c2: '#4338CA', fg: '#FFFFFF', en: 'Starlight',      ar: 'ضوء النجوم' },
    { id: 'sage',      c1: '#ECFDF5', c2: '#D1FAE5', fg: '#064E3B', en: 'Botanical Sage', ar: 'أخضر هادئ' },
    { id: 'sunset',    c1: '#9A3412', c2: '#EA580C', fg: '#FFFFFF', en: 'Warm Sunset',    ar: 'غروب دافئ' },
    { id: 'minimal',   c1: '#F8FAFC', c2: '#E2E8F0', fg: '#0F172A', en: 'Gallery Cream',  ar: 'لوحة صافية' },
  ];

  var CARD_BORDERS = [
    { id: 'geometric', en: 'Geometric Arabesque', ar: 'زخرفة هندسية' },
    { id: 'arch',      en: 'Luxury Arch',         ar: 'قوس ملكي' },
    { id: 'floral',    en: 'Floral Corners',      ar: 'زوايا زهرية' },
    { id: 'double',    en: 'Double Gold',         ar: 'إطار مزدوج' },
    { id: 'wreath',    en: 'Botanical Wreath',    ar: 'إكليل نباتي' },
    { id: 'artdeco',   en: 'Art Deco',            ar: 'آرت ديكو' },
    { id: 'confetti',  en: 'Celebration',         ar: 'احتفالي' },
    { id: 'clean',     en: 'Minimalist Mat',      ar: 'إطار بسيط' },
  ];

  var CARD_LIBRARY = {
    holidays: [
      { txt: 'عيد سعيد وكل عام وأنتم بخير', sub: 'أعاده الله عليكم بالخير واليمن والبركات' },
      { txt: 'رمضان كريم', sub: 'تقبّل الله طاعاتكم وملأ أيامكم نوراً وسكينة' },
      { txt: 'عيد ميلاد مجيد وسنة جديدة سعيدة', sub: 'أطيب الأمنيات بأيام مليئة بالسلام والمحبة' },
      { txt: 'عيد قيامة مجيد', sub: 'أفراح دائمة ونور يتجدد في كل عام' },
      { txt: 'ألف مبروك التخرج والنجاح', sub: 'من نجاح إلى نجاح أكبر بإذن الله' },
      { txt: 'مبارك الزواج السعيد', sub: 'بارك الله لكما وجمع بينكما في خير ومودة' },
      { txt: 'Happy Holidays & Warmest Wishes', sub: 'Wishing you joy, peace, and bright new beginnings' },
      { txt: 'Happy Birthday!', sub: 'May this year bring endless happiness and success' },
      { txt: 'Eid Mubarak!', sub: 'Peace, joy, and warm moments with family and friends' },
    ],
    quotes: [
      { txt: 'ابدأ من حيث أنت، واستخدم ما لديك، وافعل ما تستطيع.', sub: 'الخطوة الأولى تصنع الفارق دائماً' },
      { txt: 'العظمة في البساطة والوضوح والإتقان.', sub: 'حكمة تصميم وإبداع' },
      { txt: 'كل إنجاز عظيم كان في البداية مجرّد فكرة جريئة.', sub: 'واصل التقدّم بثقة' },
      { txt: 'جمال الحياة في التفاؤل والعمل الصادق كل يوم.', sub: 'إلهام يومي' },
      { txt: 'Create what you wish existed.', sub: 'Consistency turns small efforts into remarkable results' },
      { txt: 'Simplicity is the soul of clarity.', sub: 'Design with intention and care' },
      { txt: 'Small steps every day build extraordinary outcomes.', sub: 'Keep moving forward' },
    ],
  };

  /* Store Promo Badges (Mode 4) */
  var BADGE_SHAPES = [
    { id: 'starburst16', en: 'Starburst 16',     ar: 'نجمة انفجار ١٦' },
    { id: 'starburst24', en: 'Mega Burst 24',    ar: 'انفجار ٢٤ سنّ' },
    { id: 'seal',        en: 'Circular Seal',    ar: 'ختم دائري' },
    { id: 'scalloped',   en: 'Scalloped Stamp',  ar: 'طابع متموّج' },
    { id: 'ribbon_tl',   en: 'Corner Ribbon L',  ar: 'شريط زاوية يسار' },
    { id: 'ribbon_tr',   en: 'Corner Ribbon R',  ar: 'شريط زاوية يمين' },
    { id: 'pricetag',    en: 'Hanging Price Tag',ar: 'بطاقة سعر معلّقة' },
    { id: 'shield',      en: 'Discount Shield',  ar: 'درع عروض' },
    { id: 'diagbanner',  en: 'Slanted Banner',   ar: 'شريط مائل' },
    { id: 'ticket',      en: 'Voucher Ticket',   ar: 'قسيمة خصم' },
    { id: 'hex',         en: 'Hexagon Tag',      ar: 'شارة سداسية' },
    { id: 'megaphone',   en: 'Flash Burst',      ar: 'وميض إعلان' },
    { id: 'pill',        en: 'Store Pill',       ar: 'كبسولة عرض' },
    { id: 'award',       en: 'Award Ribbon',     ar: 'وسام تميّز' },
    { id: 'bolt',        en: 'Lightning Deal',   ar: 'عرض صاعق' },
    { id: 'crest',       en: 'Luxury Gold Crest',ar: 'شعار ذهبي فاخر' },
  ];

  var BADGE_THEMES = [
    { c1: '#DC2626', c2: '#991B1B', fg: '#FFFFFF' },
    { c1: '#FACC15', c2: '#CA8A04', fg: '#111827' },
    { c1: '#16A34A', c2: '#166534', fg: '#FFFFFF' },
    { c1: '#2563EB', c2: '#1E40AF', fg: '#FFFFFF' },
    { c1: '#7C3AED', c2: '#4C1D95', fg: '#FFFFFF' },
    { c1: '#111827', c2: '#374151', fg: '#FACC15' },
    { c1: '#EA580C', c2: '#9A3412', fg: '#FFFFFF' },
    { c1: '#DB2777', c2: '#9D174D', fg: '#FFFFFF' },
    { c1: '#0D9488', c2: '#115E59', fg: '#FFFFFF' },
    { c1: '#D97706', c2: '#78350F', fg: '#FFFFFF' },
  ];

  var BADGE_PRESETS = [
    { main: 'خصم 50%',     sub: 'لفترة محدودة' },
    { main: 'توصيل مجاني', sub: 'لجميع الطلبات' },
    { main: 'حصري',        sub: 'كمية محدودة' },
    { main: 'الأكثر مبيعاً',sub: 'اختيار العملاء' },
    { main: 'وصل حديثاً',  sub: 'تشكيلة جديدة' },
    { main: 'عرض خاص',     sub: 'وفر أكثر الآن' },
    { main: 'SALE',        sub: 'UP TO 50% OFF' },
    { main: '50% OFF',     sub: 'TODAY ONLY' },
    { main: 'BEST SELLER', sub: 'TOP RATED' },
    { main: 'NEW',         sub: 'JUST ARRIVED' },
    { main: 'FREE SHIPPING',sub:'NO MINIMUM' },
    { main: 'VIP',         sub: 'EXCLUSIVE OFFER' },
  ];

  /* ----- DOM References ----- */
  var modeBtns = $$('.ss-mode-btn');
  var modePanels = $$('.ss-mode-panel');
  var ssPresetStrip = $('#ssPresetStrip');
  var ssDimMeta = $('#ssDimMeta');
  var btnToggleChecker = $('#btnToggleChecker');
  var btnTopChatPreview = $('#btnTopChatPreview');
  var btnOpenExportModal = $('#btnOpenExportModal');
  var ssExportModal = $('#ssExportModal');
  var btnCloseExportModal = $('#btnCloseExportModal');
  var exportModeSections = $$('[data-export-mode]');
  var ssViewport = $('#ssViewport');
  var ssCanvasWrap = $('#ssCanvasWrap');
  var ssMainCanvas = $('#ssMainCanvas');
  var ssOverlayCanvas = $('#ssOverlayCanvas');
  var ssBrushCursor = $('#ssBrushCursor');
  var ssAiOverlay = $('#ssAiOverlay');
  var ssAiStatus = $('#ssAiStatus');

  /* Footer & Mobile */
  var btnUndo = $('#btnUndo');
  var btnRedo = $('#btnRedo');
  var btnPeekOriginal = $('#btnPeekOriginal');
  var btnDupSelected = $('#btnDupSelected');
  var btnDelSelected = $('#btnDelSelected');
  var btnResetMode = $('#btnResetMode');

  var btnMqAddText = $('#btnMqAddText');
  var btnMqUpload = $('#btnMqUpload');
  var btnMqPreview = $('#btnMqPreview');
  var btnMqPeek = $('#btnMqPeek');
  var btnMqUndo = $('#btnMqUndo');
  var btnMqDownload = $('#btnMqDownload');

  var ssPhotoInput = $('#ssPhotoInput');
  var ssLayerImgInput = $('#ssLayerImgInput');
  var ssCustomBgInput = $('#ssCustomBgInput');

  /* Mode 1 Controls */
  var btnStUploadPhoto = $('#btnStUploadPhoto');
  var btnStAddOverlayImg = $('#btnStAddOverlayImg');
  var btnStAutoCutout = $('#btnStAutoCutout');
  var ssStPhotoActionRow = $('#ssStPhotoActionRow');
  var btnStRestoreOrig = $('#btnStRestoreOrig');
  var btnStRemoveMain = $('#btnStRemoveMain');
  var ssStShapeCutGrid = $('#ssStShapeCutGrid');
  var ssStBrushHint = $('#ssStBrushHint');
  var ssBrushModeRow = $('#ssBrushModeRow');
  var ssStBrushSize = $('#ssStBrushSize');
  var ssStBrushSizeVal = $('#ssStBrushSizeVal');
  var btnStBrushUndo = $('#btnStBrushUndo');
  var btnStBrushRedo = $('#btnStBrushRedo');
  var ssStOutlineWidth = $('#ssStOutlineWidth');
  var ssStOutlineWidthVal = $('#ssStOutlineWidthVal');
  var ssOutlineSwatches = $('#ssOutlineSwatches');
  var ssStOutlineColor = $('#ssStOutlineColor');
  var ssStShadow = $('#ssStShadow');
  var ssStShadowVal = $('#ssStShadowVal');
  var ssStVinylGloss = $('#ssStVinylGloss');
  var ssTextFrameStyleRow = $('#ssTextFrameStyleRow');
  var btnStAddText = $('#btnStAddText');
  var ssPhraseCats = $('#ssPhraseCats');
  var ssPhraseGrid = $('#ssPhraseGrid');
  var ssStickerPackGrid = $('#ssStickerPackGrid');
  var btnStExportWa = $('#btnStExportWa');
  var btnStExportFull = $('#btnStExportFull');
  var btnStChatPreview = $('#btnStChatPreview');
  var ssPrintPaperRow = $('#ssPrintPaperRow');
  var ssSheetCols = $('#ssSheetCols');
  var ssSheetRows = $('#ssSheetRows');
  var btnStSheetPng = $('#btnStSheetPng');
  var btnStSheetPdf = $('#btnStSheetPdf');

  /* Mode 2 Controls */
  var ssMemeTplGrid = $('#ssMemeTplGrid');
  var ssMemeTopInput = $('#ssMemeTopInput');
  var ssMemeBotInput = $('#ssMemeBotInput');
  var btnMmAddText = $('#btnMmAddText');
  var btnMmSyncCaps = $('#btnMmSyncCaps');
  var ssMmBubbleGrid = $('#ssMmBubbleGrid');
  var btnMmUploadBg = $('#btnMmUploadBg');
  var btnMmAddLayerImg = $('#btnMmAddLayerImg');
  var btnMmClearBg = $('#btnMmClearBg');
  var btnMmExportJpg = $('#btnMmExportJpg');
  var btnMmExportPng = $('#btnMmExportPng');

  /* Mode 3 Controls */
  var ssCardBgGrid = $('#ssCardBgGrid');
  var ssCardBorderGrid = $('#ssCardBorderGrid');
  var ssCardAccentColor = $('#ssCardAccentColor');
  var btnCdUploadBg = $('#btnCdUploadBg');
  var btnCdClearBg = $('#btnCdClearBg');
  var ssCardCatRow = $('#ssCardCatRow');
  var ssCardQuoteList = $('#ssCardQuoteList');
  var btnCdAddText = $('#btnCdAddText');
  var ssCardRecipient = $('#ssCardRecipient');
  var ssCardSender = $('#ssCardSender');
  var btnCdInsertPhoto = $('#btnCdInsertPhoto');
  var ssCardPhotoShapeRow = $('#ssCardPhotoShapeRow');
  var btnCdExportPng = $('#btnCdExportPng');
  var btnCdExportJpg = $('#btnCdExportJpg');
  var btnCdExportPdf = $('#btnCdExportPdf');

  /* Mode 4 Controls */
  var ssBadgeShapeGrid = $('#ssBadgeShapeGrid');
  var ssBadgeThemeDots = $('#ssBadgeThemeDots');
  var ssBadgeCol1 = $('#ssBadgeCol1');
  var ssBadgeCol2 = $('#ssBadgeCol2');
  var ssBadgeColTxt = $('#ssBadgeColTxt');
  var ssBadgeMainText = $('#ssBadgeMainText');
  var ssBadgeSubText = $('#ssBadgeSubText');
  var btnBdAddExtraText = $('#btnBdAddExtraText');
  var ssBadgePresetGrid = $('#ssBadgePresetGrid');
  var btnBdUploadProduct = $('#btnBdUploadProduct');
  var btnBdCutoutProd = $('#btnBdCutoutProd');
  var btnBdClearProduct = $('#btnBdClearProduct');
  var btnBdExportPng = $('#btnBdExportPng');
  var btnBdExportJpg = $('#btnBdExportJpg');

  /* Inspector & Layers */
  var ssSelectedTag = $('#ssSelectedTag');
  var ssNoSelection = $('#ssNoSelection');
  var ssTextProps = $('#ssTextProps');
  var ssTransformProps = $('#ssTransformProps');
  var ssPropText = $('#ssPropText');
  var ssFontPicker = $('#ssFontPicker');
  var ssFontTrigger = $('#ssFontTrigger');
  var ssFontTriggerLabel = $('#ssFontTriggerLabel');
  var ssFontMenu = $('#ssFontMenu');
  var ssPropFontSize = $('#ssPropFontSize');
  var ssPropTextFrame = $('#ssPropTextFrame');
  var ssPropTextColor = $('#ssPropTextColor');
  var ssPropStrokeColor = $('#ssPropStrokeColor');
  var ssPropFrameBg = $('#ssPropFrameBg');
  var ssPropStrokeW = $('#ssPropStrokeW');
  var ssPropStrokeWVal = $('#ssPropStrokeWVal');
  var ssPropFuseOutline = $('#ssPropFuseOutline');
  var ssFuseCheckWrap = $('#ssFuseCheckWrap');
  var ssPropScale = $('#ssPropScale');
  var ssPropScaleVal = $('#ssPropScaleVal');
  var ssPropRot = $('#ssPropRot');
  var ssPropRotVal = $('#ssPropRotVal');
  var ssPropOpacity = $('#ssPropOpacity');
  var ssPropOpacityVal = $('#ssPropOpacityVal');
  var btnLayerFlipH = $('#btnLayerFlipH');
  var btnLayerCenter = $('#btnLayerCenter');
  var ssLayerList = $('#ssLayerList');
  var ssLayersCount = $('#ssLayersCount');

  /* Chat Preview Modal */
  var ssChatModal = $('#ssChatModal');
  var btnCloseChatModal = $('#btnCloseChatModal');
  var ssChatStage = $('#ssChatStage');
  var ssChatStickerImg = $('#ssChatStickerImg');
  var btnModalExportWa = $('#btnModalExportWa');
  var chatThemeBtns = $$('[data-chat-theme]');

  /* ----- Asset Store & Offscreen Canvases ----- */
  var imageAssets = new Map(); /* assetId -> { assetId, name, img, w, h, origData, maskAlpha, hasCutout, useCutout, rawOrigCanvas, rawCutoutCanvas, brushUndo, brushRedo } */
  var fuseBufferCanvas = document.createElement('canvas');
  var fuseOutlineCanvas = document.createElement('canvas');
  var dilationWorkCanvas = document.createElement('canvas');

  var activeDevice = 'cpu';
  var preloadPromise = null;
  var nextLayerId = 1;
  var nextAssetId = 1;
  var rafId = 0;

  /* Drag / Resize / Brush Interaction State */
  var canvasPointers = new Map();
  var dragAction = null; /* null | 'move' | 'scale' | 'rotate' | 'pinch' | 'brush' */
  var dragStart = null;
  var layerBoxes = {};
  var activeSnapX = false;
  var activeSnapY = false;
  var isPeeking = false;

  /* Brush Painting State */
  var preBrushAlpha = null;
  var brushMinX = 0;
  var brushMinY = 0;
  var brushMaxX = 0;
  var brushMaxY = 0;

  /* ----- Studio State (4 Independent Workspaces) ----- */
  var app = {
    mode: 'sticker',
    showChecker: true,
    isProcessingAi: false,
    pendingUploadKind: 'main', /* 'main' | 'extra' | 'bg' | 'framedPhoto' | 'product' */

    sticker: {
      sizeId: 'st_1024',
      mainAssetId: null,
      shapeCutout: 'none', /* none | circle | rounded | heart | star | hex */
      brushMode: 'move', /* move | restore | erase */
      brushSize: 32,
      outlineW: 18,
      outlineColor: '#FFFFFF',
      shadowBlur: 18,
      vinylGloss: true,
      textFrameStyle: 'fused',
      phraseCat: 'greetings',
      printPaper: 'a4',
      printCols: 3,
      printRows: 4,
      layers: [],
      selectedId: null,
      undoStack: [],
      redoStack: [],
    },

    meme: {
      sizeId: 'mm_sq',
      templateId: 'drake',
      customBgAssetId: null,
      topCaption: '',
      botCaption: '',
      layers: [],
      selectedId: null,
      undoStack: [],
      redoStack: [],
    },

    card: {
      sizeId: 'cd_sq',
      bgId: 'midnight',
      borderId: 'geometric',
      accentColor: '#FBBF24',
      customBgAssetId: null,
      quoteCat: 'holidays',
      photoFrameShape: 'arch',
      recipient: '',
      sender: '',
      layers: [],
      selectedId: null,
      undoStack: [],
      redoStack: [],
    },

    badge: {
      sizeId: 'bd_1000',
      productAssetId: null,
      shapeId: 'starburst16',
      col1: '#DC2626',
      col2: '#991B1B',
      colTxt: '#FFFFFF',
      mainText: '50% OFF',
      subText: 'LIMITED TIME',
      layers: [],
      selectedId: null,
      undoStack: [],
      redoStack: [],
    },
  };

  /* ----- Core Helpers ----- */
  function isArabicUI() {
    return (document.documentElement.lang || '').toLowerCase() === 'ar';
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function sanitizeHex(hex, fallback) {
    var s = String(hex || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : (fallback || '#FFFFFF');
  }

  function sanitizeFilename(name) {
    var s = String(name || 'imgsfix-design').replace(/\.[^.]+$/, '');
    s = s.replace(/[\/\\:*?"<>|\x00-\x1F]+/g, '_').replace(/^\.+|\.+$/g, '').trim();
    return s || 'imgsfix-design';
  }

  function revokeAssetUrl(url) {
    if (url) {
      try { URL.revokeObjectURL(url); } catch (_e) {}
    }
  }

  function zeroCanvas(c) {
    if (!c) return;
    var ctx = c.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, c.width, c.height);
    c.width = 0;
    c.height = 0;
  }

  function validateFile(file) {
    if (!file) return false;
    var type = (file.type || '').toLowerCase();
    if (!type && file.name) {
      var m = file.name.toLowerCase().match(/\.(jpe?g|png|webp|bmp|gif)$/);
      if (m) type = (m[1] === 'jpg' || m[1] === 'jpeg') ? 'image/jpeg' : 'image/' + m[1];
    }
    if (!ALLOWED_MIMES[type]) {
      toast(t('pp_err_type'), 'err');
      return false;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast(t('pp_err_size'), 'err');
      return false;
    }
    return true;
  }

  function curWS() {
    return app[app.mode];
  }

  function getDim() {
    var ws = curWS();
    var list = MODE_PRESETS[app.mode] || MODE_PRESETS.sticker;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === ws.sizeId) return list[i];
    }
    return list[0];
  }

  function getScaleRef() {
    var d = getDim();
    return Math.min(d.w, d.h) / 1024;
  }

  function getFontEntry(fontCssOrId) {
    var key = String(fontCssOrId || '');
    if (key === 'lateef') return getFontEntry('amiri');
    for (var i = 0; i < FONT_LIBRARY.length; i++) {
      if (FONT_LIBRARY[i].id === key || FONT_LIBRARY[i].css === key || key.indexOf(FONT_LIBRARY[i].family) !== -1) {
        return FONT_LIBRARY[i];
      }
    }
    return FONT_LIBRARY[0];
  }

  function ensureFontLoaded(fontEntry) {
    if (!fontEntry || loadedFonts.has(fontEntry.id)) return;
    loadedFonts.add(fontEntry.id);
    if (!document.fonts || typeof document.fonts.load !== 'function') return;
    var spec = fontEntry.weight + ' 64px "' + fontEntry.family + '"';
    document.fonts.load(spec).then(function () {
      renderAll();
    }).catch(function () {});
  }

  function getSelectedLayer() {
    var ws = curWS();
    if (!ws.selectedId) return null;
    for (var i = 0; i < ws.layers.length; i++) {
      if (ws.layers[i].id === ws.selectedId) return ws.layers[i];
    }
    return null;
  }

  function syncDocumentMeta() {
    var ar = isArabicUI();
    if (ar) {
      document.title = 'استوديو الملصقات والميمز والبطاقات — صانع الملصقات المقصوصة · صانع الميمز · بطاقات المعايدة واللوحات · شارات المتاجر والعروض — imgsfix';
    } else {
      document.title = 'Stickers, Memes & Cards Studio — Die-Cut Sticker Maker, Meme & Comic Maker, Greeting & Quote Cards, Store Promo Badges — imgsfix';
    }
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('ss_meta_desc'));
  }

  /* ----- Undo / Redo Snapshot Engine (Per-Mode) ----- */
  function serializeWS(ws) {
    return JSON.stringify({
      sizeId: ws.sizeId,
      shapeCutout: ws.shapeCutout,
      outlineW: ws.outlineW,
      outlineColor: ws.outlineColor,
      shadowBlur: ws.shadowBlur,
      vinylGloss: ws.vinylGloss,
      templateId: ws.templateId,
      customBgAssetId: ws.customBgAssetId,
      topCaption: ws.topCaption,
      botCaption: ws.botCaption,
      bgId: ws.bgId,
      borderId: ws.borderId,
      accentColor: ws.accentColor,
      recipient: ws.recipient,
      sender: ws.sender,
      shapeId: ws.shapeId,
      col1: ws.col1,
      col2: ws.col2,
      colTxt: ws.colTxt,
      mainText: ws.mainText,
      subText: ws.subText,
      productAssetId: ws.productAssetId,
      mainAssetId: ws.mainAssetId,
      layers: ws.layers,
      selectedId: ws.selectedId,
    });
  }

  function pushUndo() {
    var ws = curWS();
    ws.undoStack.push(serializeWS(ws));
    if (ws.undoStack.length > MAX_UNDO) ws.undoStack.shift();
    ws.redoStack = [];
    syncUndoRedoBtns();
  }

  function restoreSnapshot(jsonStr) {
    var ws = curWS();
    var snap = JSON.parse(jsonStr);
    Object.keys(snap).forEach(function (k) {
      ws[k] = snap[k];
    });
    syncModeControls();
    syncInspectorUI();
    renderLayerList();
    renderAll();
  }

  function performUndo() {
    var ws = curWS();
    if (!ws.undoStack.length) return;
    ws.redoStack.push(serializeWS(ws));
    restoreSnapshot(ws.undoStack.pop());
    syncUndoRedoBtns();
  }

  function performRedo() {
    var ws = curWS();
    if (!ws.redoStack.length) return;
    ws.undoStack.push(serializeWS(ws));
    restoreSnapshot(ws.redoStack.pop());
    syncUndoRedoBtns();
  }

  function syncUndoRedoBtns() {
    var ws = curWS();
    var canU = ws.undoStack.length > 0;
    var canR = ws.redoStack.length > 0;
    if (btnUndo) btnUndo.disabled = !canU;
    if (btnRedo) btnRedo.disabled = !canR;
    if (btnMqUndo) btnMqUndo.disabled = !canU;
  }

  /* ----- Local AI Background Removal (@imgly/background-removal) ----- */
  async function detectPreferredDevice() {
    if (typeof navigator !== 'undefined' && navigator.gpu) {
      try {
        var adapter = await navigator.gpu.requestAdapter();
        if (adapter) return 'gpu';
      } catch (_e) {}
    }
    return 'cpu';
  }

  function getImglyConfig(device) {
    return {
      model: 'isnet_fp16',
      device: device,
      fetchArgs: { cache: 'force-cache' },
    };
  }

  function startSilentPreload() {
    if (preloadPromise) return;
    preloadPromise = (async function () {
      activeDevice = await detectPreferredDevice();
      try {
        await preload(getImglyConfig(activeDevice));
      } catch (_err) {
        if (activeDevice === 'gpu') {
          activeDevice = 'cpu';
          try { await preload(getImglyConfig('cpu')); } catch (_e2) {}
        }
      }
    })();
  }

  function decodeBlobToImage(blob) {
    return new Promise(function (resolve, reject) {
      var u = URL.createObjectURL(blob);
      var im = new Image();
      im.onload = function () {
        URL.revokeObjectURL(u);
        resolve(im);
      };
      im.onerror = function (err) {
        URL.revokeObjectURL(u);
        reject(err || new Error('Failed to decode AI result'));
      };
      im.src = u;
    });
  }

  function extractSmoothMask(aiImg, w, h) {
    var mc = document.createElement('canvas');
    mc.width = w;
    mc.height = h;
    var mctx = mc.getContext('2d');
    mctx.drawImage(aiImg, 0, 0, w, h);
    var data = mctx.getImageData(0, 0, w, h).data;
    var total = w * h;
    var rawAlpha = new Uint8ClampedArray(total);
    for (var i = 0; i < total; i++) {
      rawAlpha[i] = data[i * 4 + 3];
    }

    var smooth = new Uint8ClampedArray(total);
    for (var y = 0; y < h; y++) {
      var y0 = y > 0 ? y - 1 : 0;
      var y2 = y < h - 1 ? y + 1 : h - 1;
      for (var x = 0; x < w; x++) {
        var x0 = x > 0 ? x - 1 : 0;
        var x2 = x < w - 1 ? x + 1 : w - 1;
        var sum =
          rawAlpha[y0 * w + x0] + rawAlpha[y0 * w + x] * 2 + rawAlpha[y0 * w + x2] +
          rawAlpha[y  * w + x0] * 2 + rawAlpha[y  * w + x] * 4 + rawAlpha[y  * w + x2] * 2 +
          rawAlpha[y2 * w + x0] + rawAlpha[y2 * w + x] * 2 + rawAlpha[y2 * w + x2];
        var v = (sum / 16) | 0;
        if (v < 16) v = 0;
        else if (v > 246) v = 255;
        smooth[y * w + x] = v;
      }
    }
    zeroCanvas(mc);
    return smooth;
  }

  function buildCutoutFromAsset(asset) {
    if (!asset || !asset.origData || !asset.maskAlpha) return;
    if (!asset.rawCutoutCanvas) asset.rawCutoutCanvas = document.createElement('canvas');
    asset.rawCutoutCanvas.width = asset.w;
    asset.rawCutoutCanvas.height = asset.h;
    var ctx = asset.rawCutoutCanvas.getContext('2d');
    var out = ctx.createImageData(asset.w, asset.h);
    var src = asset.origData.data;
    var dst = out.data;
    var mask = asset.maskAlpha;
    var total = asset.w * asset.h;
    for (var i = 0; i < total; i++) {
      var p = i * 4;
      dst[p] = src[p];
      dst[p + 1] = src[p + 1];
      dst[p + 2] = src[p + 2];
      dst[p + 3] = Math.round((src[p + 3] * mask[i]) / 255);
    }
    ctx.putImageData(out, 0, 0);
  }

  function patchCutoutRegion(asset, x0, y0, x1, y1) {
    if (!asset || !asset.rawCutoutCanvas || !asset.origData || !asset.maskAlpha) return;
    var sx = clamp(Math.floor(x0), 0, asset.w - 1);
    var sy = clamp(Math.floor(y0), 0, asset.h - 1);
    var ex = clamp(Math.ceil(x1), sx + 1, asset.w);
    var ey = clamp(Math.ceil(y1), sy + 1, asset.h);
    var rw = ex - sx;
    var rh = ey - sy;
    var ctx = asset.rawCutoutCanvas.getContext('2d');
    var patch = ctx.createImageData(rw, rh);
    var src = asset.origData.data;
    var dst = patch.data;
    var mask = asset.maskAlpha;
    for (var y = 0; y < rh; y++) {
      var ay = sy + y;
      for (var x = 0; x < rw; x++) {
        var ax = sx + x;
        var si = (ay * asset.w + ax);
        var sp = si * 4;
        var dp = (y * rw + x) * 4;
        dst[dp] = src[sp];
        dst[dp + 1] = src[sp + 1];
        dst[dp + 2] = src[sp + 2];
        dst[dp + 3] = Math.round((src[sp + 3] * mask[si]) / 255);
      }
    }
    ctx.putImageData(patch, sx, sy);
  }

  async function runAiCutoutOnAsset(asset) {
    if (!asset || !asset.rawOrigCanvas || app.isProcessingAi) return false;
    if (asset.hasCutout && asset.rawCutoutCanvas) {
      asset.useCutout = true;
      return true;
    }

    app.isProcessingAi = true;
    if (ssAiOverlay) ssAiOverlay.classList.remove('hide');
    if (ssAiStatus) ssAiStatus.textContent = t('ss_ai_working');

    try {
      if (preloadPromise) await preloadPromise;
      else activeDevice = await detectPreferredDevice();

      var blob = await new Promise(function (resolve) {
        asset.rawOrigCanvas.toBlob(resolve, 'image/png');
      });

      var outBlob;
      try {
        outBlob = await removeBackground(blob, getImglyConfig(activeDevice));
      } catch (gpuErr) {
        if (activeDevice === 'gpu') {
          activeDevice = 'cpu';
          outBlob = await removeBackground(blob, getImglyConfig('cpu'));
        } else {
          throw gpuErr;
        }
      }

      var aiImg = await decodeBlobToImage(outBlob);
      asset.maskAlpha = extractSmoothMask(aiImg, asset.w, asset.h);
      asset.hasCutout = true;
      asset.useCutout = true;
      asset.brushUndo = [];
      asset.brushRedo = [];
      buildCutoutFromAsset(asset);
      return true;
    } catch (err) {
      console.error('Sticker Studio AI cutout failed:', err);
      toast(t('tc_removebg_fail'), 'err');
      return false;
    } finally {
      app.isProcessingAi = false;
      if (ssAiOverlay) ssAiOverlay.classList.add('hide');
    }
  }

  /* ----- Layer Factories ----- */
  function makeTextLayer(opts) {
    var o = opts || {};
    return {
      id: 'L' + (nextLayerId++),
      type: 'text',
      nx: o.nx !== undefined ? o.nx : 0.50,
      ny: o.ny !== undefined ? o.ny : 0.74,
      scale: o.scale !== undefined ? o.scale : 1,
      rot: o.rot !== undefined ? o.rot : 0,
      opacity: o.opacity !== undefined ? o.opacity : 100,
      visible: true,
      locked: false,
      flipH: false,
      text: o.text || (isArabicUI() ? 'أهلاً وسهلاً' : 'AWESOME!'),
      font: o.font || 'cairo',
      fontSize: o.fontSize || 80,
      color: o.color || '#FFFFFF',
      strokeColor: o.strokeColor || '#111827',
      strokeW: o.strokeW !== undefined ? o.strokeW : 8,
      frameStyle: o.frameStyle || 'fused', /* none | fused | pill | bubble | thought | shout */
      frameBg: o.frameBg || '#2563EB',
      fuseWithOutline: o.fuseWithOutline !== undefined ? Boolean(o.fuseWithOutline) : true,
      role: o.role || 'custom', /* custom | top | bot */
    };
  }

  function makeImageLayer(asset, opts) {
    var o = opts || {};
    return {
      id: 'L' + (nextLayerId++),
      type: 'image',
      assetId: asset.assetId,
      name: asset.name || 'image.png',
      nx: o.nx !== undefined ? o.nx : 0.50,
      ny: o.ny !== undefined ? o.ny : 0.45,
      scale: o.scale !== undefined ? o.scale : 1,
      rot: o.rot !== undefined ? o.rot : 0,
      opacity: o.opacity !== undefined ? o.opacity : 100,
      visible: true,
      locked: false,
      flipH: false,
      isMainPhoto: Boolean(o.isMainPhoto),
      frameShape: o.frameShape || 'none', /* none | arch | circle | rounded */
      fuseWithOutline: o.fuseWithOutline !== undefined ? Boolean(o.fuseWithOutline) : true,
    };
  }

  function makeGraphicStickerLayer(stickerDef, nx, ny) {
    return {
      id: 'L' + (nextLayerId++),
      type: 'graphic',
      stickerId: stickerDef.id,
      icon: stickerDef.icon,
      label: stickerDef.label,
      bg: stickerDef.bg,
      ring: stickerDef.ring,
      nx: nx !== undefined ? nx : 0.50,
      ny: ny !== undefined ? ny : 0.43,
      scale: 1,
      rot: -5,
      opacity: 100,
      visible: true,
      locked: false,
      flipH: false,
      fuseWithOutline: true,
    };
  }

  function makePromoBadgeLayer(opts) {
    var o = opts || {};
    return {
      id: 'L' + (nextLayerId++),
      type: 'promoBadge',
      nx: o.nx !== undefined ? o.nx : 0.50,
      ny: o.ny !== undefined ? o.ny : 0.50,
      scale: o.scale !== undefined ? o.scale : 1,
      rot: o.rot !== undefined ? o.rot : 0,
      opacity: 100,
      visible: true,
      locked: false,
      flipH: false,
    };
  }

  /* ----- Starter Initialization for Each of the 4 Modes ----- */
  function initStickerStarter(clearHistory) {
    var ws = app.sticker;
    ws.mainAssetId = null;
    ws.shapeCutout = 'none';
    ws.brushMode = 'move';
    var ar = isArabicUI();
    ws.layers = [
      makeGraphicStickerLayer(GRAPHIC_STICKERS[1], 0.50, 0.40),
      makeTextLayer({
        text: ar ? 'عاش!' : 'AWESOME!',
        nx: 0.50,
        ny: 0.74,
        font: 'cairo',
        fontSize: 96,
        color: '#FFFFFF',
        strokeColor: '#0F172A',
        strokeW: 10,
        frameStyle: 'fused',
        frameBg: '#2563EB',
        fuseWithOutline: true,
      }),
    ];
    ws.selectedId = ws.layers[0].id;
    if (clearHistory) {
      ws.undoStack = [];
      ws.redoStack = [];
    }
  }

  function initMemeStarter(tplId, clearHistory) {
    var ws = app.meme;
    ws.templateId = tplId || ws.templateId || 'drake';
    var tpl = MEME_TEMPLATES[0];
    for (var i = 0; i < MEME_TEMPLATES.length; i++) {
      if (MEME_TEMPLATES[i].id === ws.templateId) { tpl = MEME_TEMPLATES[i]; break; }
    }
    var ar = isArabicUI();
    ws.topCaption = ar ? tpl.ar : tpl.top;
    ws.botCaption = ar ? 'بتجربة فورية داخل المتصفح!' : tpl.bot;
    ws.layers = [
      makeTextLayer({
        role: 'top',
        text: ws.topCaption,
        nx: 0.50,
        ny: 0.14,
        font: ar ? 'cairo' : 'impact',
        fontSize: 66,
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeW: 11,
        frameStyle: 'none',
        fuseWithOutline: false,
      }),
      makeTextLayer({
        role: 'bot',
        text: ws.botCaption,
        nx: 0.50,
        ny: 0.87,
        font: ar ? 'cairo' : 'impact',
        fontSize: 66,
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeW: 11,
        frameStyle: 'none',
        fuseWithOutline: false,
      }),
    ];
    ws.selectedId = ws.layers[0].id;
    if (clearHistory) {
      ws.undoStack = [];
      ws.redoStack = [];
    }
  }

  function initCardStarter(clearHistory) {
    var ws = app.card;
    var ar = isArabicUI();
    ws.bgId = 'midnight';
    ws.borderId = 'geometric';
    ws.accentColor = '#FBBF24';
    ws.customBgAssetId = null;
    ws.recipient = ar ? 'إلى صديقي العزيز' : 'Dear Friend';
    ws.sender = ar ? 'مع أطيب التمنيات' : 'With warm wishes';
    ws.layers = [
      makeTextLayer({
        text: ar ? 'كل عام وأنتم بخير' : 'Warmest Wishes',
        nx: 0.50,
        ny: 0.44,
        font: ar ? 'amiri' : 'montserrat',
        fontSize: 82,
        color: '#FDE68A',
        strokeColor: '#0F172A',
        strokeW: 3,
        frameStyle: 'none',
        fuseWithOutline: false,
      }),
      makeTextLayer({
        text: ar ? 'أطيب الأمنيات بأيام مليئة بالخير والسعادة' : 'Wishing you joy, peace, and bright new beginnings',
        nx: 0.50,
        ny: 0.60,
        font: 'tajawal',
        fontSize: 38,
        color: '#F8FAFC',
        strokeColor: '#0F172A',
        strokeW: 0,
        frameStyle: 'none',
        fuseWithOutline: false,
      }),
    ];
    ws.selectedId = ws.layers[0].id;
    if (clearHistory) {
      ws.undoStack = [];
      ws.redoStack = [];
    }
  }

  function initBadgeStarter(clearHistory) {
    var ws = app.badge;
    var ar = isArabicUI();
    ws.shapeId = 'starburst16';
    ws.col1 = '#DC2626';
    ws.col2 = '#991B1B';
    ws.colTxt = '#FFFFFF';
    ws.mainText = ar ? 'خصم 50%' : '50% OFF';
    ws.subText = ar ? 'لفترة محدودة' : 'LIMITED TIME';
    ws.productAssetId = null;
    ws.layers = [
      makePromoBadgeLayer({ nx: 0.50, ny: 0.50, scale: 1.05, rot: -4 }),
    ];
    ws.selectedId = ws.layers[0].id;
    if (clearHistory) {
      ws.undoStack = [];
      ws.redoStack = [];
    }
  }

  /* ----- Geometric Shape Clipping Helpers ----- */
  function traceCutoutPath(ctx, cx, cy, rx, ry, shape) {
    ctx.beginPath();
    if (shape === 'circle') {
      var r = Math.min(rx, ry);
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    } else if (shape === 'rounded') {
      var rad = Math.min(rx, ry) * 0.28;
      ctx.roundRect(cx - rx, cy - ry, rx * 2, ry * 2, rad);
    } else if (shape === 'arch') {
      var aw = rx * 2;
      var ah = ry * 2;
      var left = cx - rx;
      var top = cy - ry;
      var archR = rx;
      ctx.moveTo(left, top + ah);
      ctx.lineTo(left, top + archR);
      ctx.arc(cx, top + archR, archR, Math.PI, 0);
      ctx.lineTo(left + aw, top + ah);
      ctx.closePath();
    } else if (shape === 'heart') {
      var s = Math.min(rx, ry) * 0.96;
      ctx.moveTo(cx, cy + s * 0.85);
      ctx.bezierCurveTo(cx - s * 1.35, cy + s * 0.10, cx - s * 0.95, cy - s * 0.95, cx, cy - s * 0.30);
      ctx.bezierCurveTo(cx + s * 0.95, cy - s * 0.95, cx + s * 1.35, cy + s * 0.10, cx, cy + s * 0.85);
      ctx.closePath();
    } else if (shape === 'star') {
      var pts = 5;
      var outer = Math.min(rx, ry);
      var inner = outer * 0.48;
      for (var i = 0; i < pts * 2; i++) {
        var ang = -Math.PI / 2 + (i * Math.PI) / pts;
        var rr = i % 2 === 0 ? outer : inner;
        var px = cx + Math.cos(ang) * rr;
        var py = cy + Math.sin(ang) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (shape === 'hex') {
      var hr = Math.min(rx, ry);
      for (var j = 0; j < 6; j++) {
        var a = -Math.PI / 2 + (j * Math.PI) / 3;
        var hx = cx + Math.cos(a) * hr;
        var hy = cy + Math.sin(a) * hr;
        if (j === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
    }
  }

  /* ----- Canvas Procedural Renderers (Graphic Stickers, Memes, Cards, Badges) ----- */
  function drawGraphicSticker(ctx, L, sRef) {
    var r = 165 * sRef;
    /* Crisp circular die-cut badge + vector highlight + icon */
    var grad = ctx.createRadialGradient(-r * 0.25, -r * 0.28, r * 0.1, 0, 0, r);
    grad.addColorStop(0, sanitizeHex(L.bg, '#EF4444'));
    grad.addColorStop(1, '#0F172A');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = Math.max(5, 10 * sRef);
    ctx.strokeStyle = sanitizeHex(L.ring, '#FFFFFF');
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = Math.round(170 * sRef) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(L.icon || '🔥', 0, 8 * sRef);
    return { hw: r, hh: r };
  }

  function drawMultilineText(ctx, text, maxWidth, lineHeight) {
    var lines = String(text || '').split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var words = lines[i].split(/\s+/);
      var line = '';
      var out = [];
      for (var n = 0; n < words.length; n++) {
        var test = line ? line + ' ' + words[n] : words[n];
        if (ctx.measureText(test).width > maxWidth && line) {
          out.push(line);
          line = words[n];
        } else {
          line = test;
        }
      }
      if (line) out.push(line);
      lines[i] = out;
    }
    var flat = [];
    for (var k = 0; k < lines.length; k++) {
      for (var m = 0; m < lines[k].length; m++) flat.push(lines[k][m]);
    }
    return flat;
  }

  function drawTextLayer(ctx, L, w, h, sRef) {
    var fontSpec = getFontEntry(L.font);
    ensureFontLoaded(fontSpec);
    var px = Math.round((L.fontSize || 80) * sRef);
    ctx.font = fontSpec.weight + ' ' + px + 'px ' + fontSpec.css;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var lineH = px * 1.18;
    var lines = drawMultilineText(ctx, L.text || 'TEXT', w * 0.82, lineH);
    if (!lines.length) lines = ['TEXT'];

    var maxW = 0;
    for (var i = 0; i < lines.length; i++) {
      var mw = ctx.measureText(lines[i]).width;
      if (mw > maxW) maxW = mw;
    }
    var totalH = lines.length * lineH;
    var padX = 34 * sRef;
    var padY = 22 * sRef;
    var boxW = maxW + padX * 2;
    var boxH = totalH + padY * 2;

    var fStyle = L.frameStyle || 'none';
    if (fStyle === 'pill') {
      ctx.save();
      ctx.fillStyle = sanitizeHex(L.frameBg, '#2563EB');
      ctx.strokeStyle = sanitizeHex(L.strokeColor, '#FFFFFF');
      ctx.lineWidth = Math.max(3, 6 * sRef);
      ctx.beginPath();
      ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, Math.min(boxH / 2, 42 * sRef));
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (fStyle === 'bubble') {
      ctx.save();
      ctx.fillStyle = sanitizeHex(L.frameBg, '#FFFFFF');
      ctx.strokeStyle = sanitizeHex(L.strokeColor, '#111827');
      ctx.lineWidth = Math.max(4, 7 * sRef);
      var r = Math.min(28 * sRef, boxH * 0.35);
      ctx.beginPath();
      ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, r);
      ctx.fill();
      ctx.stroke();
      /* Speech tail */
      ctx.beginPath();
      ctx.moveTo(-boxW * 0.14, boxH / 2 - 2);
      ctx.lineTo(-boxW * 0.25, boxH / 2 + 34 * sRef);
      ctx.lineTo(boxW * 0.04, boxH / 2 - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (fStyle === 'thought') {
      ctx.save();
      ctx.fillStyle = sanitizeHex(L.frameBg, '#FFFFFF');
      ctx.strokeStyle = sanitizeHex(L.strokeColor, '#111827');
      ctx.lineWidth = Math.max(3, 6 * sRef);
      ctx.beginPath();
      ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, boxH / 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-boxW * 0.18, boxH / 2 + 16 * sRef, 11 * sRef, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-boxW * 0.26, boxH / 2 + 36 * sRef, 6 * sRef, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (fStyle === 'shout') {
      ctx.save();
      ctx.fillStyle = sanitizeHex(L.frameBg, '#FACC15');
      ctx.strokeStyle = sanitizeHex(L.strokeColor, '#111827');
      ctx.lineWidth = Math.max(4, 7 * sRef);
      var spikes = 16;
      ctx.beginPath();
      for (var sp = 0; sp < spikes * 2; sp++) {
        var ang = (sp * Math.PI) / spikes;
        var mul = sp % 2 === 0 ? 1.15 : 0.88;
        var sx = Math.cos(ang) * (boxW * 0.56) * mul;
        var sy = Math.sin(ang) * (boxH * 0.62) * mul;
        if (sp === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    var startY = -((lines.length - 1) * lineH) / 2;
    var sw = clamp(L.strokeW !== undefined ? L.strokeW : 8, 0, 28) * sRef;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    for (var li = 0; li < lines.length; li++) {
      var ly = startY + li * lineH;
      if (sw > 0 && (fStyle === 'none' || fStyle === 'fused')) {
        ctx.strokeStyle = sanitizeHex(L.strokeColor, '#111827');
        ctx.lineWidth = sw * 2;
        ctx.strokeText(lines[li], 0, ly);
      }
      ctx.fillStyle = sanitizeHex(L.color, '#FFFFFF');
      ctx.fillText(lines[li], 0, ly);
    }

    return {
      hw: (fStyle === 'none' ? maxW / 2 + 12 * sRef : boxW / 2 + 10 * sRef),
      hh: (fStyle === 'none' ? totalH / 2 + 12 * sRef : boxH / 2 + 14 * sRef),
    };
  }

  function drawImageLayer(ctx, L, w, h, sRef) {
    var asset = imageAssets.get(L.assetId);
    if (!asset) return { hw: 40, hh: 40 };
    var src = (asset.hasCutout && asset.useCutout && asset.rawCutoutCanvas && !isPeeking)
      ? asset.rawCutoutCanvas
      : asset.rawOrigCanvas;
    if (!src) return { hw: 40, hh: 40 };

    var target = Math.min(w, h) * (L.isMainPhoto ? 0.62 : 0.42);
    var ratio = target / Math.max(asset.w, asset.h);
    var dw = asset.w * ratio;
    var dh = asset.h * ratio;

    var clipShape = L.isMainPhoto && app.mode === 'sticker'
      ? app.sticker.shapeCutout
      : (L.frameShape || 'none');

    ctx.save();
    if (clipShape && clipShape !== 'none') {
      traceCutoutPath(ctx, 0, 0, dw / 2, dh / 2, clipShape);
      ctx.clip();
    }
    ctx.drawImage(src, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();

    if (L.frameShape && L.frameShape !== 'none') {
      ctx.save();
      ctx.strokeStyle = sanitizeHex(app.card.accentColor, '#FBBF24');
      ctx.lineWidth = Math.max(4, 8 * sRef);
      traceCutoutPath(ctx, 0, 0, dw / 2, dh / 2, L.frameShape);
      ctx.stroke();
      ctx.restore();
    }

    return { hw: dw / 2, hh: dh / 2 };
  }

  /* Mode 2: 18 Classic Meme Art Renderers */
  function drawMemeBackground(ctx, w, h) {
    var ws = app.meme;
    if (ws.customBgAssetId) {
      var asset = imageAssets.get(ws.customBgAssetId);
      if (asset && asset.rawOrigCanvas) {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, w, h);
        var sc = Math.max(w / asset.w, h / asset.h);
        var dw = asset.w * sc;
        var dh = asset.h * sc;
        ctx.drawImage(asset.rawOrigCanvas, (w - dw) / 2, (h - dh) / 2, dw, dh);
        return;
      }
    }

    var id = ws.templateId || 'drake';
    ctx.save();
    /* Crisp comic/meme split panels & vector art */
    if (id === 'drake' || id === 'tuxedo' || id === 'twopanel' || id === 'pills') {
      var cTop = id === 'drake' ? '#FEF3C7' : (id === 'tuxedo' ? '#E2E8F0' : (id === 'pills' ? '#1E3A8A' : '#FEE2E2'));
      var cBot = id === 'drake' ? '#DCFCE7' : (id === 'tuxedo' ? '#1E293B' : (id === 'pills' ? '#7F1D1D' : '#DBEAFE'));
      ctx.fillStyle = cTop;
      ctx.fillRect(0, 0, w, h * 0.5);
      ctx.fillStyle = cBot;
      ctx.fillRect(0, h * 0.5, w, h * 0.5);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = Math.max(5, w * 0.008);
      ctx.beginPath(); ctx.moveTo(0, h * 0.5); ctx.lineTo(w, h * 0.5); ctx.stroke();

      /* Expressive comic badges on left side */
      ctx.font = Math.round(w * 0.14) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (id === 'drake') {
        ctx.fillText('🙅‍♂️', w * 0.20, h * 0.25);
        ctx.fillText('👉😎', w * 0.20, h * 0.75);
      } else if (id === 'tuxedo') {
        ctx.fillText('🐻', w * 0.20, h * 0.25);
        ctx.fillText('🤵', w * 0.20, h * 0.75);
      } else if (id === 'pills') {
        ctx.fillText('💊', w * 0.22, h * 0.25);
        ctx.fillText('⚡', w * 0.22, h * 0.75);
      } else {
        ctx.fillText('✨', w * 0.20, h * 0.25);
        ctx.fillText('😅', w * 0.20, h * 0.75);
      }
    } else if (id === 'buttons') {
      var bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#0F172A');
      bg.addColorStop(1, '#334155');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath(); ctx.roundRect(w * 0.08, h * 0.28, w * 0.84, h * 0.44, 24); ctx.fill();
      ctx.fillStyle = '#EF4444';
      ctx.beginPath(); ctx.ellipse(w * 0.34, h * 0.50, w * 0.14, h * 0.09, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(w * 0.66, h * 0.48, w * 0.14, h * 0.09, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.font = Math.round(w * 0.12) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('😰', w * 0.50, h * 0.72);
    } else if (id === 'brain' || id === 'panik') {
      var colors = id === 'brain'
        ? ['#1E293B', '#312E81', '#6D28D9', '#0EA5E9']
        : ['#FEE2E2', '#DCFCE7', '#FEF08A', '#DC2626'];
      var icons = id === 'brain' ? ['🧠', '💡', '⚡', '🌌'] : ['😱', '😌', '🤯', '🔥'];
      for (var p = 0; p < 4; p++) {
        ctx.fillStyle = colors[p];
        ctx.fillRect(0, (h * p) / 4, w, h / 4);
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, (h * p) / 4, w, h / 4);
        ctx.font = Math.round(w * 0.09) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icons[p], w * 0.82, h * (p + 0.5) / 4);
      }
    } else if (id === 'stonks' || id === 'galaxy') {
      var sg = ctx.createLinearGradient(0, 0, w, h);
      sg.addColorStop(0, id === 'stonks' ? '#064E3B' : '#090D16');
      sg.addColorStop(1, id === 'stonks' ? '#0284C7' : '#4C1D95');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = id === 'stonks' ? '#22C55E' : '#38BDF8';
      ctx.lineWidth = Math.max(10, w * 0.015);
      ctx.beginPath();
      ctx.moveTo(w * 0.08, h * 0.75);
      ctx.lineTo(w * 0.34, h * 0.56);
      ctx.lineTo(w * 0.52, h * 0.63);
      ctx.lineTo(w * 0.88, h * 0.22);
      ctx.stroke();
      ctx.font = Math.round(w * 0.16) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(id === 'stonks' ? '📈' : '🌌', w * 0.50, h * 0.48);
    } else if (id === 'classicbar') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h * 0.30);
      var cg = ctx.createLinearGradient(0, h * 0.30, w, h);
      cg.addColorStop(0, '#1D4ED8');
      cg.addColorStop(1, '#0F172A');
      ctx.fillStyle = cg;
      ctx.fillRect(0, h * 0.30, w, h * 0.70);
      ctx.font = Math.round(w * 0.22) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('😎', w * 0.50, h * 0.60);
    } else {
      /* Rich expressive comic stage for remaining templates */
      var paletteMap = {
        distract:   ['#FDE68A', '#F97316', '👀'],
        changemind: ['#E0F2FE', '#0284C7', '☕'],
        success:    ['#DCFCE7', '#16A34A', '✊'],
        fine:       ['#FFEDD5', '#EA580C', '🔥'],
        doge:       ['#FEF9C3', '#CA8A04', '🐕'],
        slap:       ['#FEE2E2', '#B91C1C', '💥'],
        spiderman:  ['#DBEAFE', '#1D4ED8', '🫵'],
        meeting:    ['#E2E8F0', '#334155', '🏢'],
      };
      var pal = paletteMap[id] || ['#1E293B', '#0F172A', '😂'];
      var mg = ctx.createLinearGradient(0, 0, w, h);
      mg.addColorStop(0, pal[0]);
      mg.addColorStop(1, pal[1]);
      ctx.fillStyle = mg;
      ctx.fillRect(0, 0, w, h);

      /* Subtle comic halftone rings */
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.beginPath();
      ctx.arc(w * 0.50, h * 0.50, Math.min(w, h) * 0.36, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = Math.round(w * 0.22) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pal[2], w * 0.50, h * 0.50);
    }
    ctx.restore();
  }

  /* Mode 3: Greeting & Quote Card Backdrop + Ornate Borders */
  function drawCardBackgroundAndBorder(ctx, w, h) {
    var ws = app.card;
    var bgObj = CARD_BACKGROUNDS[0];
    for (var i = 0; i < CARD_BACKGROUNDS.length; i++) {
      if (CARD_BACKGROUNDS[i].id === ws.bgId) { bgObj = CARD_BACKGROUNDS[i]; break; }
    }

    var grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, bgObj.c1);
    grad.addColorStop(1, bgObj.c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (ws.customBgAssetId) {
      var asset = imageAssets.get(ws.customBgAssetId);
      if (asset && asset.rawOrigCanvas) {
        var sc = Math.max(w / asset.w, h / asset.h);
        var dw = asset.w * sc;
        var dh = asset.h * sc;
        ctx.drawImage(asset.rawOrigCanvas, (w - dw) / 2, (h - dh) / 2, dw, dh);
      }
    }

    /* Ornate Borders & Geometric Frames */
    var acc = sanitizeHex(ws.accentColor, '#FBBF24');
    var sRef = Math.min(w, h) / 1080;
    var pad = 44 * sRef;
    ctx.save();
    ctx.strokeStyle = acc;
    ctx.fillStyle = acc;

    var bid = ws.borderId || 'geometric';
    if (bid === 'geometric') {
      ctx.lineWidth = 4 * sRef;
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
      ctx.lineWidth = 2 * sRef;
      ctx.strokeRect(pad + 14 * sRef, pad + 14 * sRef, w - (pad + 14 * sRef) * 2, h - (pad + 14 * sRef) * 2);
      /* 8-point geometric star corners */
      var corners = [
        [pad, pad], [w - pad, pad], [pad, h - pad], [w - pad, h - pad],
      ];
      corners.forEach(function (pt) {
        ctx.save();
        ctx.translate(pt[0], pt[1]);
        for (var r = 0; r < 2; r++) {
          ctx.rotate((r * Math.PI) / 4);
          ctx.strokeRect(-16 * sRef, -16 * sRef, 32 * sRef, 32 * sRef);
        }
        ctx.restore();
      });
    } else if (bid === 'arch') {
      ctx.lineWidth = 5 * sRef;
      var ax = pad + 20 * sRef;
      var aw = w - ax * 2;
      var ar = aw / 2;
      ctx.beginPath();
      ctx.moveTo(ax, h - pad);
      ctx.lineTo(ax, pad + ar);
      ctx.arc(w / 2, pad + ar, ar, Math.PI, 0);
      ctx.lineTo(ax + aw, h - pad);
      ctx.closePath();
      ctx.stroke();
    } else if (bid === 'floral') {
      ctx.lineWidth = 3 * sRef;
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
      var fPts = [[pad + 20 * sRef, pad + 20 * sRef], [w - pad - 20 * sRef, pad + 20 * sRef], [pad + 20 * sRef, h - pad - 20 * sRef], [w - pad - 20 * sRef, h - pad - 20 * sRef]];
      ctx.globalAlpha = 0.78;
      fPts.forEach(function (fp) {
        for (var k = 0; k < 6; k++) {
          var ang = (k * Math.PI) / 3;
          ctx.beginPath();
          ctx.ellipse(fp[0] + Math.cos(ang) * 18 * sRef, fp[1] + Math.sin(ang) * 18 * sRef, 12 * sRef, 6 * sRef, ang, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    } else if (bid === 'double') {
      ctx.lineWidth = 6 * sRef;
      ctx.beginPath(); ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, 26 * sRef); ctx.stroke();
      ctx.lineWidth = 2 * sRef;
      ctx.beginPath(); ctx.roundRect(pad + 16 * sRef, pad + 16 * sRef, w - (pad + 16 * sRef) * 2, h - (pad + 16 * sRef) * 2, 18 * sRef); ctx.stroke();
    } else if (bid === 'wreath') {
      ctx.lineWidth = 3 * sRef;
      var cr = Math.min(w, h) * 0.42;
      ctx.beginPath(); ctx.arc(w / 2, h / 2, cr, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([12 * sRef, 10 * sRef]);
      ctx.beginPath(); ctx.arc(w / 2, h / 2, cr + 14 * sRef, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    } else if (bid === 'artdeco') {
      ctx.lineWidth = 4 * sRef;
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
      var l = 90 * sRef;
      [[pad, pad, 1, 1], [w - pad, pad, -1, 1], [pad, h - pad, 1, -1], [w - pad, h - pad, -1, -1]].forEach(function (c) {
        ctx.beginPath();
        ctx.moveTo(c[0], c[1] + c[3] * l);
        ctx.lineTo(c[0] + c[2] * l, c[1]);
        ctx.stroke();
      });
    } else if (bid === 'confetti') {
      ctx.lineWidth = 4 * sRef;
      ctx.beginPath(); ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, 30 * sRef); ctx.stroke();
      for (var cf = 0; cf < 26; cf++) {
        var cx = ((cf * 173) % (w - 120)) + 60;
        var cy = (cf % 2 === 0 ? 50 : h - 55) + ((cf * 37) % 30);
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        ctx.arc(cx, cy, (4 + (cf % 5)) * sRef, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.lineWidth = 2.5 * sRef;
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    }

    /* Recipient & Sender Signature Lines */
    ctx.globalAlpha = 0.92;
    ctx.font = '700 ' + Math.round(30 * sRef) + 'px "Cairo", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = bgObj.fg;
    if (ws.recipient && ws.recipient.trim()) {
      ctx.fillText(ws.recipient.trim(), w / 2, pad + 64 * sRef);
    }
    if (ws.sender && ws.sender.trim()) {
      ctx.fillText(ws.sender.trim(), w / 2, h - pad - 54 * sRef);
    }
    ctx.restore();
  }

  /* Mode 4: 16 Store Promo Badge Geometries */
  function drawPromoBadgeLayer(ctx, sRef) {
    var ws = app.badge;
    var shape = ws.shapeId || 'starburst16';
    var c1 = sanitizeHex(ws.col1, '#DC2626');
    var c2 = sanitizeHex(ws.col2, '#991B1B');
    var fg = sanitizeHex(ws.colTxt, '#FFFFFF');
    var r = 245 * sRef;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.34)';
    ctx.shadowBlur = 24 * sRef;
    ctx.shadowOffsetY = 10 * sRef;

    var grad = ctx.createLinearGradient(-r, -r, r, r);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.strokeStyle = fg;
    ctx.lineWidth = Math.max(4, 7 * sRef);

    if (shape === 'starburst16' || shape === 'starburst24') {
      var pts = shape === 'starburst24' ? 24 : 16;
      ctx.beginPath();
      for (var i = 0; i < pts * 2; i++) {
        var ang = (i * Math.PI) / pts;
        var rr = i % 2 === 0 ? r : r * 0.80;
        var px = Math.cos(ang) * rr;
        var py = Math.sin(ang) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();
    } else if (shape === 'seal' || shape === 'crest') {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.90, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = Math.max(4, 6 * sRef);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2); ctx.stroke();
      if (shape === 'crest') {
        ctx.setLineDash([10 * sRef, 8 * sRef]);
        ctx.beginPath(); ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (shape === 'scalloped') {
      var lobes = 18;
      ctx.beginPath();
      for (var k = 0; k < lobes; k++) {
        var a1 = (k * 2 * Math.PI) / lobes;
        var a2 = ((k + 1) * 2 * Math.PI) / lobes;
        var am = (a1 + a2) / 2;
        ctx.quadraticCurveTo(Math.cos(am) * r * 1.04, Math.sin(am) * r * 1.04, Math.cos(a2) * r * 0.84, Math.sin(a2) * r * 0.84);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();
    } else if (shape === 'ribbon_tl' || shape === 'ribbon_tr' || shape === 'diagbanner') {
      var rw = r * 2.1;
      var rh = r * 0.72;
      ctx.rotate(shape === 'ribbon_tl' ? -0.35 : (shape === 'ribbon_tr' ? 0.35 : -0.14));
      ctx.beginPath(); ctx.roundRect(-rw / 2, -rh / 2, rw, rh, 14 * sRef); ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();
    } else if (shape === 'pricetag') {
      ctx.beginPath();
      ctx.moveTo(-r * 0.95, 0);
      ctx.lineTo(-r * 0.55, -r * 0.56);
      ctx.lineTo(r * 0.92, -r * 0.56);
      ctx.lineTo(r * 0.92, r * 0.56);
      ctx.lineTo(-r * 0.55, r * 0.56);
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(-r * 0.66, 0, 16 * sRef, 0, Math.PI * 2); ctx.fill();
    } else if (shape === 'shield') {
      ctx.beginPath();
      ctx.moveTo(-r * 0.80, -r * 0.76);
      ctx.lineTo(r * 0.80, -r * 0.76);
      ctx.lineTo(r * 0.80, r * 0.12);
      ctx.quadraticCurveTo(0, r * 1.05, 0, r * 1.05);
      ctx.quadraticCurveTo(-r * 0.80, r * 0.65, -r * 0.80, r * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();
    } else if (shape === 'ticket') {
      ctx.beginPath();
      ctx.roundRect(-r * 0.98, -r * 0.54, r * 1.96, r * 1.08, 18 * sRef);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.setLineDash([14 * sRef, 10 * sRef]);
      ctx.strokeRect(-r * 0.86, -r * 0.42, r * 1.72, r * 0.84);
      ctx.setLineDash([]);
    } else if (shape === 'hex') {
      ctx.beginPath();
      for (var hx = 0; hx < 6; hx++) {
        var ha = -Math.PI / 2 + (hx * Math.PI) / 3;
        if (hx === 0) ctx.moveTo(Math.cos(ha) * r, Math.sin(ha) * r);
        else ctx.lineTo(Math.cos(ha) * r, Math.sin(ha) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();
    } else if (shape === 'megaphone' || shape === 'bolt') {
      ctx.beginPath();
      ctx.moveTo(-r * 0.92, -r * 0.52);
      ctx.lineTo(r * 0.96, -r * 0.36);
      ctx.lineTo(r * 0.78, r * 0.52);
      ctx.lineTo(-r * 0.84, r * 0.46);
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();
    } else if (shape === 'award') {
      ctx.beginPath();
      ctx.moveTo(-r * 0.44, r * 0.35);
      ctx.lineTo(-r * 0.56, r * 1.05);
      ctx.lineTo(-r * 0.18, r * 0.85);
      ctx.lineTo(0, r * 1.05);
      ctx.lineTo(r * 0.18, r * 0.85);
      ctx.lineTo(r * 0.56, r * 1.05);
      ctx.lineTo(r * 0.44, r * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath(); ctx.arc(0, -r * 0.08, r * 0.82, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.beginPath(); ctx.arc(0, -r * 0.08, r * 0.70, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.roundRect(-r * 0.98, -r * 0.50, r * 1.96, r * 1.0, r * 0.50);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();
    }

    /* Main Offer Text & Secondary Tagline */
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var mainTxt = (ws.mainText || '50% OFF').trim();
    var subTxt = (ws.subText || '').trim();
    var mainPx = mainTxt.length > 10 ? 58 * sRef : 78 * sRef;
    ctx.font = '900 ' + Math.round(mainPx) + 'px "Cairo", "Montserrat", sans-serif';
    ctx.fillText(mainTxt, 0, subTxt ? -18 * sRef : 0, r * 1.55);

    if (subTxt) {
      ctx.font = '800 ' + Math.round(32 * sRef) + 'px "Cairo", "Montserrat", sans-serif';
      ctx.fillText(subTxt, 0, 40 * sRef, r * 1.50);
    }
    ctx.restore();

    return { hw: r, hh: r };
  }

  /* ----- Die-Cut Outline Engine (Mode 1) ----- */
  function buildDieCutOutline(sourceCanvas, widthPx, colorHex) {
    var w = sourceCanvas.width;
    var h = sourceCanvas.height;
    fuseOutlineCanvas.width = w;
    fuseOutlineCanvas.height = h;
    var octx = fuseOutlineCanvas.getContext('2d');
    octx.clearRect(0, 0, w, h);

    if (widthPx <= 0) return fuseOutlineCanvas;

    /* Radial stamp dilation for razor-sharp smooth die-cut border */
    dilationWorkCanvas.width = w;
    dilationWorkCanvas.height = h;
    var dctx = dilationWorkCanvas.getContext('2d');
    dctx.clearRect(0, 0, w, h);

    var steps = clamp(Math.round(widthPx * 1.4), 12, 36);
    for (var i = 0; i < steps; i++) {
      var ang = (i * 2 * Math.PI) / steps;
      dctx.drawImage(sourceCanvas, Math.cos(ang) * widthPx, Math.sin(ang) * widthPx);
    }
    /* Inner fill pass to avoid any hollow ring gap on thick outlines */
    if (widthPx > 14) {
      var half = widthPx * 0.52;
      for (var j = 0; j < 12; j++) {
        var ang2 = (j * 2 * Math.PI) / 12;
        dctx.drawImage(sourceCanvas, Math.cos(ang2) * half, Math.sin(ang2) * half);
      }
    }
    dctx.drawImage(sourceCanvas, 0, 0);

    octx.fillStyle = sanitizeHex(colorHex, '#FFFFFF');
    octx.fillRect(0, 0, w, h);
    octx.globalCompositeOperation = 'destination-in';
    octx.drawImage(dilationWorkCanvas, 0, 0);
    octx.globalCompositeOperation = 'source-over';
    return fuseOutlineCanvas;
  }

  function renderLayerOnCtx(ctx, L, w, h, sRef) {
    if (!L || !L.visible) return;
    var cx = L.nx * w;
    var cy = L.ny * h;
    var sc = clamp(L.scale || 1, 0.2, 4);
    var rotRad = ((L.rot || 0) * Math.PI) / 180;

    ctx.save();
    ctx.globalAlpha = clamp(L.opacity !== undefined ? L.opacity : 100, 5, 100) / 100;
    ctx.translate(cx, cy);
    ctx.rotate(rotRad);
    ctx.scale(L.flipH ? -sc : sc, sc);

    var box = { hw: 60, hh: 60 };
    if (L.type === 'text') box = drawTextLayer(ctx, L, w, h, sRef);
    else if (L.type === 'image') box = drawImageLayer(ctx, L, w, h, sRef);
    else if (L.type === 'graphic') box = drawGraphicSticker(ctx, L, sRef);
    else if (L.type === 'promoBadge') box = drawPromoBadgeLayer(ctx, sRef);

    ctx.restore();

    var hw = box.hw * sc;
    var hh = box.hh * sc;
    var cos = Math.cos(rotRad);
    var sin = Math.sin(rotRad);
    function toWorld(lx, ly) {
      return { x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos };
    }
    layerBoxes[L.id] = {
      cx: cx,
      cy: cy,
      hw: hw,
      hh: hh,
      rotRad: rotRad,
      corners: [
        toWorld(-hw, -hh),
        toWorld(hw, -hh),
        toWorld(hw, hh),
        toWorld(-hw, hh),
      ],
      rotHandle: toWorld(0, -hh - 34 * sRef),
    };
  }

  /* ----- Master Render Pipeline ----- */
  function renderToCanvas(targetCanvas) {
    var d = getDim();
    var w = d.w;
    var h = d.h;
    var sRef = getScaleRef();
    targetCanvas.width = w;
    targetCanvas.height = h;
    var ctx = targetCanvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    layerBoxes = {};

    var ws = curWS();

    if (app.mode === 'sticker') {
      var fused = [];
      var topLayers = [];
      for (var i = 0; i < ws.layers.length; i++) {
        var L = ws.layers[i];
        if (!L.visible) continue;
        var canFuse = L.type === 'image' || L.type === 'graphic' || (L.type === 'text' && L.fuseWithOutline && (L.frameStyle === 'fused' || L.frameStyle === 'none'));
        if (canFuse) fused.push(L);
        else topLayers.push(L);
      }

      if (fused.length) {
        fuseBufferCanvas.width = w;
        fuseBufferCanvas.height = h;
        var fctx = fuseBufferCanvas.getContext('2d');
        fctx.clearRect(0, 0, w, h);
        for (var fi = 0; fi < fused.length; fi++) {
          renderLayerOnCtx(fctx, fused[fi], w, h, sRef);
        }

        var outlinePx = Math.round((ws.outlineW || 0) * sRef);
        var outlineCanvas = outlinePx > 0 ? buildDieCutOutline(fuseBufferCanvas, outlinePx, ws.outlineColor) : null;

        ctx.save();
        var sh = (ws.shadowBlur || 0) * sRef;
        if (sh > 0) {
          ctx.shadowColor = 'rgba(2, 6, 23, 0.36)';
          ctx.shadowBlur = sh;
          ctx.shadowOffsetY = sh * 0.38;
        }
        if (outlineCanvas && outlinePx > 0) {
          ctx.drawImage(outlineCanvas, 0, 0);
          ctx.shadowColor = 'transparent';
        }
        ctx.drawImage(fuseBufferCanvas, 0, 0);

        if (ws.vinylGloss) {
          fctx.globalCompositeOperation = 'source-atop';
          var vg = fctx.createLinearGradient(0, 0, w * 0.7, h * 0.65);
          vg.addColorStop(0, 'rgba(255,255,255,0.22)');
          vg.addColorStop(0.45, 'rgba(255,255,255,0.04)');
          vg.addColorStop(1, 'rgba(255,255,255,0)');
          fctx.fillStyle = vg;
          fctx.fillRect(0, 0, w, h);
          fctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(fuseBufferCanvas, 0, 0);
        }
        ctx.restore();
      }

      for (var ti = 0; ti < topLayers.length; ti++) {
        renderLayerOnCtx(ctx, topLayers[ti], w, h, sRef);
      }
      return;
    }

    if (app.mode === 'meme') {
      drawMemeBackground(ctx, w, h);
    } else if (app.mode === 'card') {
      drawCardBackgroundAndBorder(ctx, w, h);
    } else if (app.mode === 'badge') {
      if (ws.productAssetId) {
        var prod = imageAssets.get(ws.productAssetId);
        if (prod) {
          var pSrc = (prod.hasCutout && prod.useCutout && prod.rawCutoutCanvas && !isPeeking)
            ? prod.rawCutoutCanvas
            : prod.rawOrigCanvas;
          if (pSrc) {
            var psc = Math.min((w * 0.86) / prod.w, (h * 0.86) / prod.h);
            var pw = prod.w * psc;
            var ph = prod.h * psc;
            ctx.drawImage(pSrc, (w - pw) / 2, (h - ph) / 2, pw, ph);
          }
        }
      }
    }

    for (var li = 0; li < ws.layers.length; li++) {
      renderLayerOnCtx(ctx, ws.layers[li], w, h, sRef);
    }
  }

  function renderOverlayCanvas() {
    if (!ssOverlayCanvas) return;
    var d = getDim();
    var w = d.w;
    var h = d.h;
    var sRef = getScaleRef();
    ssOverlayCanvas.width = w;
    ssOverlayCanvas.height = h;
    var octx = ssOverlayCanvas.getContext('2d');
    octx.clearRect(0, 0, w, h);

    if (activeSnapX) {
      octx.save();
      octx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      octx.lineWidth = Math.max(2, 2 * sRef);
      octx.setLineDash([8 * sRef, 6 * sRef]);
      octx.beginPath(); octx.moveTo(w / 2, 0); octx.lineTo(w / 2, h); octx.stroke();
      octx.restore();
    }
    if (activeSnapY) {
      octx.save();
      octx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      octx.lineWidth = Math.max(2, 2 * sRef);
      octx.setLineDash([8 * sRef, 6 * sRef]);
      octx.beginPath(); octx.moveTo(0, h / 2); octx.lineTo(w, h / 2); octx.stroke();
      octx.restore();
    }

    /* Hide selection handles while painting edges */
    if (app.mode === 'sticker' && app.sticker.brushMode !== 'move') return;

    var selL = getSelectedLayer();
    var sel = selL ? layerBoxes[selL.id] : null;
    if (!sel) return;

    octx.save();
    octx.strokeStyle = selL.locked ? '#F59E0B' : '#38BDF8';
    octx.lineWidth = Math.max(2.5, 3 * sRef);
    octx.beginPath();
    octx.moveTo(sel.corners[0].x, sel.corners[0].y);
    for (var i = 1; i < 4; i++) octx.lineTo(sel.corners[i].x, sel.corners[i].y);
    octx.closePath();
    octx.stroke();

    if (!selL.locked) {
      var topMidX = (sel.corners[0].x + sel.corners[1].x) / 2;
      var topMidY = (sel.corners[0].y + sel.corners[1].y) / 2;
      octx.beginPath();
      octx.moveTo(topMidX, topMidY);
      octx.lineTo(sel.rotHandle.x, sel.rotHandle.y);
      octx.stroke();

      var hr = Math.max(8, 10 * sRef);
      sel.corners.forEach(function (c) {
        octx.fillStyle = '#FFFFFF';
        octx.strokeStyle = '#1D4ED8';
        octx.lineWidth = Math.max(2, 2.5 * sRef);
        octx.beginPath(); octx.arc(c.x, c.y, hr, 0, Math.PI * 2); octx.fill(); octx.stroke();
      });

      octx.fillStyle = '#FACC15';
      octx.strokeStyle = '#0F172A';
      octx.beginPath(); octx.arc(sel.rotHandle.x, sel.rotHandle.y, hr * 1.15, 0, Math.PI * 2); octx.fill(); octx.stroke();
    }
    octx.restore();
  }

  function renderAll() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      renderToCanvas(ssMainCanvas);
      renderOverlayCanvas();
      var d = getDim();
      if (ssDimMeta) ssDimMeta.textContent = d.w + ' × ' + d.h + ' px';
    });
  }

  /* ----- Dynamic UI Builders & Sync (Safe DOM via createElement + textContent) ----- */
  function buildPresetStrip() {
    if (!ssPresetStrip) return;
    ssPresetStrip.textContent = '';
    var ws = curWS();
    var list = MODE_PRESETS[app.mode] || MODE_PRESETS.sticker;
    list.forEach(function (p) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ss-preset-btn' + (ws.sizeId === p.id ? ' active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', ws.sizeId === p.id ? 'true' : 'false');
      btn.textContent = t(p.labelKey) || p.fallback;
      btn.addEventListener('click', function () {
        pushUndo();
        ws.sizeId = p.id;
        buildPresetStrip();
        renderAll();
      });
      ssPresetStrip.appendChild(btn);
    });
  }

  function buildPhraseGrid() {
    if (!ssPhraseGrid) return;
    ssPhraseGrid.textContent = '';
    var list = PHRASE_BANK[app.sticker.phraseCat] || PHRASE_BANK.greetings;
    list.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ss-phrase-chip';
      b.textContent = p.txt;
      b.addEventListener('click', function () {
        pushUndo();
        var nl = makeTextLayer({
          text: p.txt,
          nx: 0.50,
          ny: 0.72,
          font: 'cairo',
          fontSize: 82,
          color: p.fg,
          strokeColor: '#0F172A',
          strokeW: 8,
          frameStyle: app.sticker.textFrameStyle || 'fused',
          frameBg: p.bg,
          fuseWithOutline: app.sticker.textFrameStyle === 'fused',
        });
        app.sticker.layers.push(nl);
        app.sticker.selectedId = nl.id;
        syncInspectorUI();
        renderLayerList();
        renderAll();
      });
      ssPhraseGrid.appendChild(b);
    });
  }

  function buildStickerPackGrid() {
    if (!ssStickerPackGrid) return;
    ssStickerPackGrid.textContent = '';
    GRAPHIC_STICKERS.forEach(function (st) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ss-pack-btn';
      b.title = st.label;
      b.setAttribute('aria-label', st.label);
      b.textContent = st.icon;
      b.addEventListener('click', function () {
        pushUndo();
        var nl = makeGraphicStickerLayer(st, 0.50, 0.42);
        app.sticker.layers.push(nl);
        app.sticker.selectedId = nl.id;
        syncInspectorUI();
        renderLayerList();
        renderAll();
      });
      ssStickerPackGrid.appendChild(b);
    });
  }

  function buildMemeTemplateGrid() {
    if (!ssMemeTplGrid) return;
    ssMemeTplGrid.textContent = '';
    var ar = isArabicUI();
    MEME_TEMPLATES.forEach(function (tpl) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ss-tpl-card' + (app.meme.templateId === tpl.id ? ' active' : '');
      b.textContent = ar ? tpl.ar : tpl.en;
      b.addEventListener('click', function () {
        pushUndo();
        app.meme.customBgAssetId = null;
        initMemeStarter(tpl.id, false);
        syncModeControls();
        syncInspectorUI();
        renderLayerList();
        renderAll();
      });
      ssMemeTplGrid.appendChild(b);
    });
  }

  function buildCardGrids() {
    var ar = isArabicUI();
    if (ssCardBgGrid) {
      ssCardBgGrid.textContent = '';
      CARD_BACKGROUNDS.forEach(function (bg) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ss-tpl-card' + (app.card.bgId === bg.id ? ' active' : '');
        var sw = document.createElement('span');
        sw.className = 'ss-bg-swatch';
        sw.style.background = 'linear-gradient(135deg,' + bg.c1 + ',' + bg.c2 + ')';
        var lb = document.createElement('span');
        lb.textContent = ar ? bg.ar : bg.en;
        b.appendChild(sw);
        b.appendChild(lb);
        b.addEventListener('click', function () {
          pushUndo();
          app.card.bgId = bg.id;
          app.card.customBgAssetId = null;
          buildCardGrids();
          renderAll();
        });
        ssCardBgGrid.appendChild(b);
      });
    }
    if (ssCardBorderGrid) {
      ssCardBorderGrid.textContent = '';
      CARD_BORDERS.forEach(function (bd) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ss-chip-btn' + (app.card.borderId === bd.id ? ' active' : '');
        b.textContent = ar ? bd.ar : bd.en;
        b.addEventListener('click', function () {
          pushUndo();
          app.card.borderId = bd.id;
          buildCardGrids();
          renderAll();
        });
        ssCardBorderGrid.appendChild(b);
      });
    }
  }

  function buildCardQuoteList() {
    if (!ssCardQuoteList) return;
    ssCardQuoteList.textContent = '';
    var list = CARD_LIBRARY[app.card.quoteCat] || CARD_LIBRARY.holidays;
    list.forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ss-quote-btn';
      b.textContent = item.txt;
      b.addEventListener('click', function () {
        pushUndo();
        var textLayers = app.card.layers.filter(function (l) { return l.type === 'text'; });
        if (textLayers[0]) textLayers[0].text = item.txt;
        else app.card.layers.push(makeTextLayer({ text: item.txt, nx: 0.50, ny: 0.44, fontSize: 78, color: '#FDE68A', strokeW: 2 }));
        if (textLayers[1]) textLayers[1].text = item.sub;
        else app.card.layers.push(makeTextLayer({ text: item.sub, nx: 0.50, ny: 0.62, fontSize: 36, color: '#F8FAFC', strokeW: 0 }));
        syncInspectorUI();
        renderLayerList();
        renderAll();
      });
      ssCardQuoteList.appendChild(b);
    });
  }

  function buildBadgeGrids() {
    var ar = isArabicUI();
    if (ssBadgeShapeGrid) {
      ssBadgeShapeGrid.textContent = '';
      BADGE_SHAPES.forEach(function (sh) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ss-tpl-card' + (app.badge.shapeId === sh.id ? ' active' : '');
        b.textContent = ar ? sh.ar : sh.en;
        b.addEventListener('click', function () {
          pushUndo();
          app.badge.shapeId = sh.id;
          buildBadgeGrids();
          renderAll();
        });
        ssBadgeShapeGrid.appendChild(b);
      });
    }
    if (ssBadgeThemeDots) {
      ssBadgeThemeDots.textContent = '';
      BADGE_THEMES.forEach(function (th) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ss-swatch';
        b.style.background = 'linear-gradient(135deg,' + th.c1 + ',' + th.c2 + ')';
        b.setAttribute('aria-label', th.c1);
        b.addEventListener('click', function () {
          pushUndo();
          app.badge.col1 = th.c1;
          app.badge.col2 = th.c2;
          app.badge.colTxt = th.fg;
          syncModeControls();
          renderAll();
        });
        ssBadgeThemeDots.appendChild(b);
      });
    }
    if (ssBadgePresetGrid) {
      ssBadgePresetGrid.textContent = '';
      BADGE_PRESETS.forEach(function (pr) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ss-phrase-chip';
        b.textContent = pr.main;
        b.addEventListener('click', function () {
          pushUndo();
          app.badge.mainText = pr.main;
          app.badge.subText = pr.sub;
          syncModeControls();
          renderAll();
        });
        ssBadgePresetGrid.appendChild(b);
      });
    }
  }

  function syncModeControls() {
    buildPresetStrip();
    syncUndoRedoBtns();

    var isSticker = app.mode === 'sticker';
    if (btnTopChatPreview) btnTopChatPreview.classList.toggle('hide', !isSticker);

    /* Sticker controls */
    var st = app.sticker;
    var mainAsset = st.mainAssetId ? imageAssets.get(st.mainAssetId) : null;
    if (btnStAutoCutout) btnStAutoCutout.disabled = !mainAsset || app.isProcessingAi;
    if (ssStPhotoActionRow) ssStPhotoActionRow.classList.toggle('hide', !mainAsset);

    if (ssStBrushHint) {
      if (!mainAsset) ssStBrushHint.textContent = t('ss_brush_hint_empty');
      else if (!mainAsset.hasCutout) ssStBrushHint.textContent = t('ss_brush_hint_run_ai');
      else ssStBrushHint.textContent = t('ss_brush_hint_ready');
    }

    var canBrush = Boolean(mainAsset && mainAsset.hasCutout);
    if (ssBrushModeRow) {
      $$('.ss-seg-btn', ssBrushModeRow).forEach(function (b) {
        var bm = b.getAttribute('data-brush');
        b.disabled = bm !== 'move' && !canBrush;
        b.classList.toggle('active', st.brushMode === bm);
      });
    }
    if (ssStBrushSize) { ssStBrushSize.disabled = !canBrush; ssStBrushSize.value = String(st.brushSize); }
    if (ssStBrushSizeVal) ssStBrushSizeVal.textContent = st.brushSize + ' px';
    if (btnStBrushUndo) btnStBrushUndo.disabled = !(mainAsset && mainAsset.brushUndo && mainAsset.brushUndo.length);
    if (btnStBrushRedo) btnStBrushRedo.disabled = !(mainAsset && mainAsset.brushRedo && mainAsset.brushRedo.length);

    if (ssStOutlineWidth) ssStOutlineWidth.value = String(st.outlineW);
    if (ssStOutlineWidthVal) ssStOutlineWidthVal.textContent = st.outlineW + ' px';
    if (ssStOutlineColor) ssStOutlineColor.value = sanitizeHex(st.outlineColor, '#FFFFFF');
    if (ssStShadow) ssStShadow.value = String(st.shadowBlur);
    if (ssStShadowVal) ssStShadowVal.textContent = st.shadowBlur + ' px';
    if (ssStVinylGloss) ssStVinylGloss.checked = Boolean(st.vinylGloss);

    /* Meme controls */
    buildMemeTemplateGrid();
    var topL = null, botL = null;
    for (var mi = 0; mi < app.meme.layers.length; mi++) {
      if (app.meme.layers[mi].role === 'top' && !topL) topL = app.meme.layers[mi];
      if (app.meme.layers[mi].role === 'bot' && !botL) botL = app.meme.layers[mi];
    }
    if (ssMemeTopInput) ssMemeTopInput.value = topL ? topL.text : app.meme.topCaption;
    if (ssMemeBotInput) ssMemeBotInput.value = botL ? botL.text : app.meme.botCaption;
    if (btnMmClearBg) btnMmClearBg.classList.toggle('hide', !app.meme.customBgAssetId);

    /* Card controls */
    buildCardGrids();
    buildCardQuoteList();
    if (ssCardAccentColor) ssCardAccentColor.value = sanitizeHex(app.card.accentColor, '#FBBF24');
    if (ssCardRecipient) ssCardRecipient.value = app.card.recipient || '';
    if (ssCardSender) ssCardSender.value = app.card.sender || '';
    if (btnCdClearBg) btnCdClearBg.classList.toggle('hide', !app.card.customBgAssetId);

    /* Badge controls */
    buildBadgeGrids();
    if (ssBadgeCol1) ssBadgeCol1.value = sanitizeHex(app.badge.col1, '#DC2626');
    if (ssBadgeCol2) ssBadgeCol2.value = sanitizeHex(app.badge.col2, '#991B1B');
    if (ssBadgeColTxt) ssBadgeColTxt.value = sanitizeHex(app.badge.colTxt, '#FFFFFF');
    if (ssBadgeMainText) ssBadgeMainText.value = app.badge.mainText;
    if (ssBadgeSubText) ssBadgeSubText.value = app.badge.subText;
    var hasProd = Boolean(app.badge.productAssetId);
    if (btnBdCutoutProd) btnBdCutoutProd.classList.toggle('hide', !hasProd);
    if (btnBdClearProduct) btnBdClearProduct.classList.toggle('hide', !hasProd);
  }

  function populateFontMenu(selectedCssOrId) {
    if (!ssFontMenu) return;
    while (ssFontMenu.firstChild) ssFontMenu.removeChild(ssFontMenu.firstChild);

    var curEntry = getFontEntry(selectedCssOrId);
    if (ssFontTriggerLabel) {
      ssFontTriggerLabel.textContent = curEntry.label;
      ssFontTriggerLabel.style.fontFamily = curEntry.css;
      ssFontTriggerLabel.style.fontWeight = curEntry.weight;
    }

    var groups = [
      { key: 'ar', title: t('tm_fonts_ar_grp') },
      { key: 'en', title: t('tm_fonts_en_grp') },
    ];

    groups.forEach(function (grp) {
      var hdr = document.createElement('div');
      hdr.className = 'ss-font-group-hdr';
      hdr.textContent = grp.title;
      ssFontMenu.appendChild(hdr);

      FONT_LIBRARY.filter(function (f) { return f.group === grp.key; }).forEach(function (f) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ss-font-opt' + (f.id === curEntry.id ? ' active' : '');
        btn.setAttribute('role', 'option');
        btn.setAttribute('aria-selected', f.id === curEntry.id ? 'true' : 'false');
        btn.style.fontFamily = f.css;
        btn.style.fontWeight = f.weight;

        var nameSpan = document.createElement('span');
        nameSpan.textContent = f.label;

        var sampleSpan = document.createElement('span');
        sampleSpan.className = 'ss-font-sample';
        sampleSpan.textContent = f.sample;

        btn.appendChild(nameSpan);
        btn.appendChild(sampleSpan);

        btn.addEventListener('click', function () {
          var L = getSelectedLayer();
          if (!L || L.type !== 'text') return;
          pushUndo();
          L.font = f.id;
          ensureFontLoaded(f);
          if (ssFontMenu) ssFontMenu.classList.add('hide');
          if (ssFontTrigger) ssFontTrigger.setAttribute('aria-expanded', 'false');
          populateFontMenu(L.font);
          renderAll();
        });

        ssFontMenu.appendChild(btn);
      });
    });
  }

  function syncInspectorUI() {
    var L = getSelectedLayer();
    var hasSel = Boolean(L);
    if (btnDupSelected) btnDupSelected.disabled = !hasSel;
    if (btnDelSelected) btnDelSelected.disabled = !hasSel;
    if (ssNoSelection) ssNoSelection.classList.toggle('hide', hasSel);
    if (ssSelectedTag) {
      ssSelectedTag.classList.toggle('hide', !hasSel);
      if (L) ssSelectedTag.textContent = t('ss_ltype_' + L.type);
    }
    if (ssTextProps) ssTextProps.classList.toggle('hide', !(L && L.type === 'text'));
    if (ssTransformProps) ssTransformProps.classList.toggle('hide', !hasSel);
    if ((!L || L.type !== 'text') && ssFontMenu) {
      ssFontMenu.classList.add('hide');
      if (ssFontTrigger) ssFontTrigger.setAttribute('aria-expanded', 'false');
    }
    if (!L) return;

    if (L.type === 'text') {
      if (ssPropText) ssPropText.value = L.text || '';
      populateFontMenu(L.font || 'cairo');
      if (ssPropFontSize) ssPropFontSize.value = String(L.fontSize || 80);
      if (ssPropTextFrame) ssPropTextFrame.value = L.frameStyle || 'none';
      if (ssPropTextColor) ssPropTextColor.value = sanitizeHex(L.color, '#FFFFFF');
      if (ssPropStrokeColor) ssPropStrokeColor.value = sanitizeHex(L.strokeColor, '#111827');
      if (ssPropFrameBg) ssPropFrameBg.value = sanitizeHex(L.frameBg, '#2563EB');
      if (ssPropStrokeW) ssPropStrokeW.value = String(L.strokeW !== undefined ? L.strokeW : 8);
      if (ssPropStrokeWVal) ssPropStrokeWVal.textContent = (L.strokeW !== undefined ? L.strokeW : 8) + ' px';
      if (ssPropFuseOutline) ssPropFuseOutline.checked = Boolean(L.fuseWithOutline);
      if (ssFuseCheckWrap) ssFuseCheckWrap.classList.toggle('hide', app.mode !== 'sticker');
    }

    var pctScale = Math.round((L.scale || 1) * 100);
    if (ssPropScale) ssPropScale.value = String(pctScale);
    if (ssPropScaleVal) ssPropScaleVal.textContent = pctScale + '%';
    if (ssPropRot) ssPropRot.value = String(Math.round(L.rot || 0));
    if (ssPropRotVal) ssPropRotVal.textContent = Math.round(L.rot || 0) + '°';
    var op = L.opacity !== undefined ? L.opacity : 100;
    if (ssPropOpacity) ssPropOpacity.value = String(op);
    if (ssPropOpacityVal) ssPropOpacityVal.textContent = op + '%';
  }

  function getLayerLabel(L) {
    if (L.type === 'text') return (L.text || '').replace(/\n/g, ' ').trim() || t('ss_ltype_text');
    if (L.type === 'graphic') return (L.icon || '') + ' ' + (L.label || t('ss_ltype_graphic'));
    if (L.type === 'image') return L.name || t('ss_ltype_image');
    if (L.type === 'promoBadge') return app.badge.mainText || t('ss_ltype_promoBadge');
    return t('ss_ltype_' + L.type);
  }

  function renderLayerList() {
    if (!ssLayerList) return;
    var ws = curWS();
    ssLayerList.textContent = '';
    if (ssLayersCount) ssLayersCount.textContent = String(ws.layers.length);

    for (var i = ws.layers.length - 1; i >= 0; i--) {
      (function (idx) {
        var L = ws.layers[idx];
        var row = document.createElement('div');
        row.className = 'ss-layer-row' + (L.id === ws.selectedId ? ' active' : '') + (L.locked ? ' is-locked' : '');

        var mainBtn = document.createElement('button');
        mainBtn.type = 'button';
        mainBtn.className = 'ss-layer-select';
        mainBtn.addEventListener('click', function () {
          ws.selectedId = L.id;
          syncInspectorUI();
          renderLayerList();
          renderOverlayCanvas();
        });

        var kindSpan = document.createElement('span');
        kindSpan.className = 'ss-layer-kind';
        kindSpan.textContent = t('ss_ltype_' + L.type);

        var nameSpan = document.createElement('span');
        nameSpan.className = 'ss-layer-name';
        nameSpan.textContent = getLayerLabel(L);

        mainBtn.appendChild(kindSpan);
        mainBtn.appendChild(nameSpan);

        var actions = document.createElement('div');
        actions.className = 'ss-layer-actions';

        function mkBtn(lbl, titleStr, disabled, activeFlag, onClick) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'ss-lbtn' + (activeFlag ? ' is-on' : '');
          b.textContent = lbl;
          b.title = titleStr;
          b.setAttribute('aria-label', titleStr);
          b.disabled = Boolean(disabled);
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            onClick();
          });
          return b;
        }

        actions.appendChild(mkBtn(L.visible ? '●' : '○', t('ss_layer_vis'), false, false, function () {
          pushUndo();
          L.visible = !L.visible;
          renderLayerList();
          renderAll();
        }));
        actions.appendChild(mkBtn(L.locked ? '🔒' : '🔓', t('ss_layer_lock'), false, Boolean(L.locked), function () {
          pushUndo();
          L.locked = !L.locked;
          renderLayerList();
          renderOverlayCanvas();
        }));
        actions.appendChild(mkBtn('↑', t('ss_layer_up'), idx === ws.layers.length - 1, false, function () {
          pushUndo();
          var tmp = ws.layers[idx + 1];
          ws.layers[idx + 1] = L;
          ws.layers[idx] = tmp;
          renderLayerList();
          renderAll();
        }));
        actions.appendChild(mkBtn('↓', t('ss_layer_down'), idx === 0, false, function () {
          pushUndo();
          var tmp = ws.layers[idx - 1];
          ws.layers[idx - 1] = L;
          ws.layers[idx] = tmp;
          renderLayerList();
          renderAll();
        }));
        actions.appendChild(mkBtn('×', t('ss_btn_del'), false, false, function () {
          deleteLayerById(L.id);
        }));

        row.appendChild(mainBtn);
        row.appendChild(actions);
        ssLayerList.appendChild(row);
      })(i);
    }
  }

  function deleteLayerById(id) {
    var ws = curWS();
    var idx = -1;
    for (var i = 0; i < ws.layers.length; i++) {
      if (ws.layers[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;
    pushUndo();
    var removed = ws.layers.splice(idx, 1)[0];
    if (removed && removed.isMainPhoto && app.mode === 'sticker') {
      app.sticker.mainAssetId = null;
      app.sticker.brushMode = 'move';
    }
    if (ws.selectedId === id) {
      ws.selectedId = ws.layers.length ? ws.layers[ws.layers.length - 1].id : null;
    }
    syncModeControls();
    syncInspectorUI();
    renderLayerList();
    renderAll();
  }

  function duplicateLayerById(id) {
    var ws = curWS();
    var src = null;
    for (var i = 0; i < ws.layers.length; i++) {
      if (ws.layers[i].id === id) { src = ws.layers[i]; break; }
    }
    if (!src) return;
    pushUndo();
    var copy = JSON.parse(JSON.stringify(src));
    copy.id = 'L' + (nextLayerId++);
    copy.isMainPhoto = false;
    copy.role = 'custom';
    copy.nx = clamp((copy.nx || 0.5) + 0.04, 0.08, 0.92);
    copy.ny = clamp((copy.ny || 0.5) + 0.04, 0.08, 0.92);
    ws.layers.push(copy);
    ws.selectedId = copy.id;
    syncInspectorUI();
    renderLayerList();
    renderAll();
  }

  /* ----- Mode & Subtab Switching ----- */
  function setMode(mode) {
    if (!MODE_PRESETS[mode]) return;
    app.mode = mode;
    modeBtns.forEach(function (b) {
      var active = b.getAttribute('data-mode') === mode;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    modePanels.forEach(function (p) {
      p.classList.toggle('active', p.getAttribute('data-mode-panel') === mode);
    });
    activeSnapX = false;
    activeSnapY = false;
    syncExportModalMode();
    syncModeControls();
    syncInspectorUI();
    renderLayerList();
    renderAll();
  }

  modeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      setMode(b.getAttribute('data-mode'));
    });
  });

  /* Dock Sub-tab Delegation */
  modePanels.forEach(function (panel) {
    var tabs = $$('.ss-dock-tab', panel);
    var panes = $$('.ss-subpane', panel);
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var sub = tab.getAttribute('data-subtab');
        tabs.forEach(function (tb) {
          var act = tb === tab;
          tb.classList.toggle('active', act);
          tb.setAttribute('aria-selected', act ? 'true' : 'false');
        });
        panes.forEach(function (pn) {
          pn.classList.toggle('active', pn.getAttribute('data-subpane') === sub);
        });
      });
    });
  });

  /* ----- Image Upload / Drop / Paste Pipeline ----- */
  function decodeFileToAsset(file, callback) {
    if (!validateFile(file)) return;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      revokeAssetUrl(url);
      if (!w || !h || w > MAX_IMAGE_DIM || h > MAX_IMAGE_DIM) {
        toast(t('pp_err_dims'), 'err');
        return;
      }
      var rawOrig = document.createElement('canvas');
      rawOrig.width = w;
      rawOrig.height = h;
      var octx = rawOrig.getContext('2d');
      octx.drawImage(img, 0, 0, w, h);
      var origData = octx.getImageData(0, 0, w, h);

      var assetId = 'A' + (nextAssetId++);
      var asset = {
        assetId: assetId,
        name: file.name || 'image.png',
        img: img,
        w: w,
        h: h,
        origData: origData,
        maskAlpha: null,
        hasCutout: false,
        useCutout: false,
        rawOrigCanvas: rawOrig,
        rawCutoutCanvas: null,
        brushUndo: [],
        brushRedo: [],
      };
      imageAssets.set(assetId, asset);
      callback(asset);
    };
    img.onerror = function () {
      revokeAssetUrl(url);
      toast(t('tc_img_load_err'), 'err');
    };
    img.src = url;
  }

  function handleUploadedFiles(fileList, uploadKind) {
    if (!fileList || !fileList.length) return;
    if (uploadKind === 'main') {
      decodeFileToAsset(fileList[0], function (asset) {
        pushUndo();
        /* Replace any existing main photo in sticker mode */
        app.sticker.layers = app.sticker.layers.filter(function (l) { return !l.isMainPhoto; });
        /* Keep only the main photo or text if first starter graphic was untouched */
        if (app.sticker.layers.length && app.sticker.layers[0].type === 'graphic' && !app.sticker.mainAssetId) {
          app.sticker.layers.shift();
        }
        app.sticker.mainAssetId = asset.assetId;
        var mainL = makeImageLayer(asset, { isMainPhoto: true, nx: 0.50, ny: 0.42, fuseWithOutline: true });
        app.sticker.layers.unshift(mainL);
        app.sticker.selectedId = mainL.id;
        syncModeControls();
        syncInspectorUI();
        renderLayerList();
        renderAll();
        toast(t('ss_photo_loaded'), 'ok');
      });
    } else if (uploadKind === 'extra') {
      for (var i = 0; i < fileList.length; i++) {
        (function (offset, file) {
          decodeFileToAsset(file, function (asset) {
            pushUndo();
            var nl = makeImageLayer(asset, {
              nx: clamp(0.50 + offset * 0.05, 0.15, 0.85),
              ny: clamp(0.46 + offset * 0.05, 0.15, 0.85),
              scale: 0.85,
              fuseWithOutline: app.mode === 'sticker',
            });
            curWS().layers.push(nl);
            curWS().selectedId = nl.id;
            syncModeControls();
            syncInspectorUI();
            renderLayerList();
            renderAll();
            toast(t('ss_photo_loaded'), 'ok');
          });
        })(i, fileList[i]);
      }
    } else if (uploadKind === 'bg') {
      decodeFileToAsset(fileList[0], function (asset) {
        pushUndo();
        if (app.mode === 'meme') app.meme.customBgAssetId = asset.assetId;
        else if (app.mode === 'card') app.card.customBgAssetId = asset.assetId;
        syncModeControls();
        renderAll();
        toast(t('ss_bg_loaded'), 'ok');
      });
    } else if (uploadKind === 'framedPhoto') {
      decodeFileToAsset(fileList[0], function (asset) {
        pushUndo();
        var nl = makeImageLayer(asset, {
          nx: 0.50,
          ny: 0.34,
          scale: 0.72,
          frameShape: app.card.photoFrameShape || 'arch',
          fuseWithOutline: false,
        });
        app.card.layers.push(nl);
        app.card.selectedId = nl.id;
        syncInspectorUI();
        renderLayerList();
        renderAll();
        toast(t('ss_photo_loaded'), 'ok');
      });
    } else if (uploadKind === 'product') {
      decodeFileToAsset(fileList[0], function (asset) {
        pushUndo();
        app.badge.productAssetId = asset.assetId;
        /* Nudge promo badge neatly to top-right corner when product uploaded */
        if (app.badge.layers[0]) {
          app.badge.layers[0].nx = 0.74;
          app.badge.layers[0].ny = 0.24;
          app.badge.layers[0].scale = 0.68;
        }
        syncModeControls();
        syncInspectorUI();
        renderAll();
        toast(t('ss_photo_loaded'), 'ok');
      });
    }
  }

  /* ----- Event Bindings: Uploads, Drop & Paste ----- */
  if (btnStUploadPhoto) btnStUploadPhoto.addEventListener('click', function () { app.pendingUploadKind = 'main'; ssPhotoInput.click(); });
  if (btnStAddOverlayImg) btnStAddOverlayImg.addEventListener('click', function () { app.pendingUploadKind = 'extra'; ssLayerImgInput.click(); });
  if (btnMmUploadBg) btnMmUploadBg.addEventListener('click', function () { app.pendingUploadKind = 'bg'; ssCustomBgInput.click(); });
  if (btnMmAddLayerImg) btnMmAddLayerImg.addEventListener('click', function () { app.pendingUploadKind = 'extra'; ssLayerImgInput.click(); });
  if (btnCdUploadBg) btnCdUploadBg.addEventListener('click', function () { app.pendingUploadKind = 'bg'; ssCustomBgInput.click(); });
  if (btnCdInsertPhoto) btnCdInsertPhoto.addEventListener('click', function () { app.pendingUploadKind = 'framedPhoto'; ssPhotoInput.click(); });
  if (btnBdUploadProduct) btnBdUploadProduct.addEventListener('click', function () { app.pendingUploadKind = 'product'; ssPhotoInput.click(); });

  if (ssPhotoInput) {
    ssPhotoInput.addEventListener('change', function () {
      if (ssPhotoInput.files && ssPhotoInput.files.length) handleUploadedFiles(ssPhotoInput.files, app.pendingUploadKind || 'main');
      ssPhotoInput.value = '';
    });
  }
  if (ssLayerImgInput) {
    ssLayerImgInput.addEventListener('change', function () {
      if (ssLayerImgInput.files && ssLayerImgInput.files.length) handleUploadedFiles(ssLayerImgInput.files, 'extra');
      ssLayerImgInput.value = '';
    });
  }
  if (ssCustomBgInput) {
    ssCustomBgInput.addEventListener('change', function () {
      if (ssCustomBgInput.files && ssCustomBgInput.files.length) handleUploadedFiles(ssCustomBgInput.files, 'bg');
      ssCustomBgInput.value = '';
    });
  }

  if (ssViewport) {
    ssViewport.addEventListener('dragover', function (e) { e.preventDefault(); ssViewport.classList.add('is-dragover'); });
    ssViewport.addEventListener('dragleave', function () { ssViewport.classList.remove('is-dragover'); });
    ssViewport.addEventListener('drop', function (e) {
      e.preventDefault();
      ssViewport.classList.remove('is-dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        var kind = app.mode === 'sticker' ? 'main' : (app.mode === 'badge' ? 'product' : 'extra');
        handleUploadedFiles(e.dataTransfer.files, kind);
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
          var kind = app.mode === 'sticker' ? 'main' : (app.mode === 'badge' ? 'product' : 'extra');
          handleUploadedFiles([f], kind);
        }
        break;
      }
    }
  });

  /* ----- Event Bindings: Mode 1 (Stickers) ----- */
  if (btnStAutoCutout) {
    btnStAutoCutout.addEventListener('click', async function () {
      var asset = app.sticker.mainAssetId ? imageAssets.get(app.sticker.mainAssetId) : null;
      if (!asset) return;
      var ok = await runAiCutoutOnAsset(asset);
      if (ok) {
        app.sticker.shapeCutout = 'none';
        syncModeControls();
        renderAll();
        toast(t('ss_cutout_ok'), 'ok');
      }
    });
  }

  if (btnStRestoreOrig) {
    btnStRestoreOrig.addEventListener('click', function () {
      var asset = app.sticker.mainAssetId ? imageAssets.get(app.sticker.mainAssetId) : null;
      if (!asset) return;
      pushUndo();
      asset.useCutout = false;
      app.sticker.brushMode = 'move';
      syncModeControls();
      renderAll();
    });
  }

  if (btnStRemoveMain) {
    btnStRemoveMain.addEventListener('click', function () {
      pushUndo();
      app.sticker.layers = app.sticker.layers.filter(function (l) { return !l.isMainPhoto; });
      app.sticker.mainAssetId = null;
      app.sticker.brushMode = 'move';
      app.sticker.selectedId = app.sticker.layers.length ? app.sticker.layers[0].id : null;
      syncModeControls();
      syncInspectorUI();
      renderLayerList();
      renderAll();
    });
  }

  if (ssStShapeCutGrid) {
    $$('[data-cutshape]', ssStShapeCutGrid).forEach(function (btn) {
      btn.addEventListener('click', function () {
        pushUndo();
        app.sticker.shapeCutout = btn.getAttribute('data-cutshape');
        $$('[data-cutshape]', ssStShapeCutGrid).forEach(function (b) { b.classList.toggle('active', b === btn); });
        renderAll();
      });
    });
  }

  if (ssBrushModeRow) {
    $$('.ss-seg-btn', ssBrushModeRow).forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.disabled) return;
        app.sticker.brushMode = b.getAttribute('data-brush');
        syncModeControls();
        renderOverlayCanvas();
      });
    });
  }

  if (ssStBrushSize) {
    ssStBrushSize.addEventListener('input', function () {
      app.sticker.brushSize = parseInt(ssStBrushSize.value, 10) || 32;
      if (ssStBrushSizeVal) ssStBrushSizeVal.textContent = app.sticker.brushSize + ' px';
    });
  }

  if (btnStBrushUndo) {
    btnStBrushUndo.addEventListener('click', function () {
      var asset = app.sticker.mainAssetId ? imageAssets.get(app.sticker.mainAssetId) : null;
      if (!asset || !asset.brushUndo.length) return;
      asset.brushRedo.push(new Uint8ClampedArray(asset.maskAlpha));
      asset.maskAlpha = asset.brushUndo.pop();
      buildCutoutFromAsset(asset);
      syncModeControls();
      renderAll();
    });
  }

  if (btnStBrushRedo) {
    btnStBrushRedo.addEventListener('click', function () {
      var asset = app.sticker.mainAssetId ? imageAssets.get(app.sticker.mainAssetId) : null;
      if (!asset || !asset.brushRedo.length) return;
      asset.brushUndo.push(new Uint8ClampedArray(asset.maskAlpha));
      asset.maskAlpha = asset.brushRedo.pop();
      buildCutoutFromAsset(asset);
      syncModeControls();
      renderAll();
    });
  }

  if (ssStOutlineWidth) {
    ssStOutlineWidth.addEventListener('input', function () {
      app.sticker.outlineW = parseInt(ssStOutlineWidth.value, 10) || 0;
      if (ssStOutlineWidthVal) ssStOutlineWidthVal.textContent = app.sticker.outlineW + ' px';
      renderAll();
    });
  }

  if (ssOutlineSwatches) {
    $$('.ss-swatch', ssOutlineSwatches).forEach(function (sw) {
      sw.addEventListener('click', function () {
        pushUndo();
        app.sticker.outlineColor = sw.getAttribute('data-ocolor');
        $$('.ss-swatch', ssOutlineSwatches).forEach(function (s) { s.classList.toggle('active', s === sw); });
        if (ssStOutlineColor) ssStOutlineColor.value = sanitizeHex(app.sticker.outlineColor, '#FFFFFF');
        renderAll();
      });
    });
  }

  if (ssStOutlineColor) {
    ssStOutlineColor.addEventListener('input', function () {
      app.sticker.outlineColor = sanitizeHex(ssStOutlineColor.value, '#FFFFFF');
      renderAll();
    });
  }

  if (ssStShadow) {
    ssStShadow.addEventListener('input', function () {
      app.sticker.shadowBlur = parseInt(ssStShadow.value, 10) || 0;
      if (ssStShadowVal) ssStShadowVal.textContent = app.sticker.shadowBlur + ' px';
      renderAll();
    });
  }

  if (ssStVinylGloss) {
    ssStVinylGloss.addEventListener('change', function () {
      pushUndo();
      app.sticker.vinylGloss = Boolean(ssStVinylGloss.checked);
      renderAll();
    });
  }

  if (ssTextFrameStyleRow) {
    $$('[data-tframe]', ssTextFrameStyleRow).forEach(function (b) {
      b.addEventListener('click', function () {
        app.sticker.textFrameStyle = b.getAttribute('data-tframe');
        $$('[data-tframe]', ssTextFrameStyleRow).forEach(function (x) { x.classList.toggle('active', x === b); });
      });
    });
  }

  if (btnStAddText) {
    btnStAddText.addEventListener('click', function () {
      pushUndo();
      var nl = makeTextLayer({
        text: isArabicUI() ? 'نص ملصق مميز' : 'COOL STICKER!',
        nx: 0.50,
        ny: 0.74,
        font: 'cairo',
        fontSize: 82,
        frameStyle: app.sticker.textFrameStyle || 'fused',
        fuseWithOutline: app.sticker.textFrameStyle === 'fused',
      });
      app.sticker.layers.push(nl);
      app.sticker.selectedId = nl.id;
      syncInspectorUI();
      renderLayerList();
      renderAll();
    });
  }

  if (ssPhraseCats) {
    $$('[data-pcat]', ssPhraseCats).forEach(function (b) {
      b.addEventListener('click', function () {
        app.sticker.phraseCat = b.getAttribute('data-pcat');
        $$('[data-pcat]', ssPhraseCats).forEach(function (x) { x.classList.toggle('active', x === b); });
        buildPhraseGrid();
      });
    });
  }

  if (ssPrintPaperRow) {
    $$('[data-paper]', ssPrintPaperRow).forEach(function (b) {
      b.addEventListener('click', function () {
        app.sticker.printPaper = b.getAttribute('data-paper');
        $$('[data-paper]', ssPrintPaperRow).forEach(function (x) { x.classList.toggle('active', x === b); });
      });
    });
  }

  /* ----- Event Bindings: Mode 2 (Memes) ----- */
  function updateMemeRoleCaption(role, val) {
    if (role === 'top') app.meme.topCaption = val;
    else app.meme.botCaption = val;
    var found = null;
    for (var i = 0; i < app.meme.layers.length; i++) {
      if (app.meme.layers[i].role === role) { found = app.meme.layers[i]; break; }
    }
    if (found) {
      found.text = val;
    } else if (val.trim()) {
      var nl = makeTextLayer({
        role: role,
        text: val,
        nx: 0.50,
        ny: role === 'top' ? 0.14 : 0.87,
        font: isArabicUI() ? 'cairo' : 'impact',
        fontSize: 66,
        strokeW: 11,
        frameStyle: 'none',
        fuseWithOutline: false,
      });
      app.meme.layers.push(nl);
    }
    if (app.meme.selectedId && found && app.meme.selectedId === found.id && ssPropText) {
      ssPropText.value = val;
    }
    renderLayerList();
    renderAll();
  }

  if (ssMemeTopInput) ssMemeTopInput.addEventListener('input', function () { updateMemeRoleCaption('top', ssMemeTopInput.value); });
  if (ssMemeBotInput) ssMemeBotInput.addEventListener('input', function () { updateMemeRoleCaption('bot', ssMemeBotInput.value); });

  if (btnMmAddText) {
    btnMmAddText.addEventListener('click', function () {
      pushUndo();
      var nl = makeTextLayer({
        text: isArabicUI() ? 'تعليق إضافي' : 'EXTRA CAPTION',
        nx: 0.50,
        ny: 0.50,
        font: isArabicUI() ? 'cairo' : 'impact',
        fontSize: 64,
        strokeW: 10,
        frameStyle: 'none',
        fuseWithOutline: false,
      });
      app.meme.layers.push(nl);
      app.meme.selectedId = nl.id;
      syncInspectorUI();
      renderLayerList();
      renderAll();
    });
  }

  if (btnMmSyncCaps) {
    btnMmSyncCaps.addEventListener('click', function () {
      pushUndo();
      initMemeStarter(app.meme.templateId, false);
      syncModeControls();
      syncInspectorUI();
      renderLayerList();
      renderAll();
    });
  }

  if (ssMmBubbleGrid) {
    $$('[data-add-bubble]', ssMmBubbleGrid).forEach(function (b) {
      b.addEventListener('click', function () {
        pushUndo();
        var style = b.getAttribute('data-add-bubble');
        var nl = makeTextLayer({
          text: isArabicUI() ? 'ماذا؟!' : 'WAIT WHAT?!',
          nx: 0.56,
          ny: 0.34,
          font: 'cairo',
          fontSize: 50,
          color: '#111827',
          strokeColor: '#111827',
          strokeW: 0,
          frameStyle: style === 'speech' ? 'bubble' : style,
          frameBg: style === 'shout' ? '#FACC15' : '#FFFFFF',
          fuseWithOutline: false,
        });
        app.meme.layers.push(nl);
        app.meme.selectedId = nl.id;
        syncInspectorUI();
        renderLayerList();
        renderAll();
      });
    });
  }

  if (btnMmClearBg) {
    btnMmClearBg.addEventListener('click', function () {
      pushUndo();
      app.meme.customBgAssetId = null;
      syncModeControls();
      renderAll();
    });
  }

  /* ----- Event Bindings: Mode 3 (Greeting & Quote Cards) ----- */
  if (ssCardAccentColor) {
    ssCardAccentColor.addEventListener('input', function () {
      app.card.accentColor = sanitizeHex(ssCardAccentColor.value, '#FBBF24');
      renderAll();
    });
  }
  if (btnCdClearBg) {
    btnCdClearBg.addEventListener('click', function () {
      pushUndo();
      app.card.customBgAssetId = null;
      syncModeControls();
      renderAll();
    });
  }
  if (ssCardCatRow) {
    $$('[data-ccat]', ssCardCatRow).forEach(function (b) {
      b.addEventListener('click', function () {
        app.card.quoteCat = b.getAttribute('data-ccat');
        $$('[data-ccat]', ssCardCatRow).forEach(function (x) { x.classList.toggle('active', x === b); });
        buildCardQuoteList();
      });
    });
  }
  if (btnCdAddText) {
    btnCdAddText.addEventListener('click', function () {
      pushUndo();
      var nl = makeTextLayer({
        text: isArabicUI() ? 'عبارة أو إهداء خاص' : 'Custom Quote or Message',
        nx: 0.50,
        ny: 0.52,
        font: 'amiri',
        fontSize: 64,
        color: '#FFFFFF',
        strokeW: 2,
        frameStyle: 'none',
        fuseWithOutline: false,
      });
      app.card.layers.push(nl);
      app.card.selectedId = nl.id;
      syncInspectorUI();
      renderLayerList();
      renderAll();
    });
  }
  if (ssCardRecipient) {
    ssCardRecipient.addEventListener('input', function () {
      app.card.recipient = ssCardRecipient.value;
      renderAll();
    });
  }
  if (ssCardSender) {
    ssCardSender.addEventListener('input', function () {
      app.card.sender = ssCardSender.value;
      renderAll();
    });
  }
  if (ssCardPhotoShapeRow) {
    $$('[data-pframe]', ssCardPhotoShapeRow).forEach(function (b) {
      b.addEventListener('click', function () {
        app.card.photoFrameShape = b.getAttribute('data-pframe');
        $$('[data-pframe]', ssCardPhotoShapeRow).forEach(function (x) { x.classList.toggle('active', x === b); });
        var sel = getSelectedLayer();
        if (sel && sel.type === 'image') {
          pushUndo();
          sel.frameShape = app.card.photoFrameShape;
          renderAll();
        }
      });
    });
  }

  /* ----- Event Bindings: Mode 4 (Store Promo Badges) ----- */
  if (ssBadgeCol1) ssBadgeCol1.addEventListener('input', function () { app.badge.col1 = sanitizeHex(ssBadgeCol1.value, '#DC2626'); renderAll(); });
  if (ssBadgeCol2) ssBadgeCol2.addEventListener('input', function () { app.badge.col2 = sanitizeHex(ssBadgeCol2.value, '#991B1B'); renderAll(); });
  if (ssBadgeColTxt) ssBadgeColTxt.addEventListener('input', function () { app.badge.colTxt = sanitizeHex(ssBadgeColTxt.value, '#FFFFFF'); renderAll(); });
  if (ssBadgeMainText) ssBadgeMainText.addEventListener('input', function () { app.badge.mainText = ssBadgeMainText.value; renderLayerList(); renderAll(); });
  if (ssBadgeSubText) ssBadgeSubText.addEventListener('input', function () { app.badge.subText = ssBadgeSubText.value; renderAll(); });

  if (btnBdAddExtraText) {
    btnBdAddExtraText.addEventListener('click', function () {
      pushUndo();
      var nl = makeTextLayer({
        text: isArabicUI() ? 'لفترة محدودة!' : 'SHOP NOW!',
        nx: 0.50,
        ny: 0.84,
        font: 'cairo',
        fontSize: 68,
        color: '#FFFFFF',
        frameStyle: 'pill',
        frameBg: app.badge.col1,
        fuseWithOutline: false,
      });
      app.badge.layers.push(nl);
      app.badge.selectedId = nl.id;
      syncInspectorUI();
      renderLayerList();
      renderAll();
    });
  }

  if (btnBdCutoutProd) {
    btnBdCutoutProd.addEventListener('click', async function () {
      var asset = app.badge.productAssetId ? imageAssets.get(app.badge.productAssetId) : null;
      if (!asset) return;
      var ok = await runAiCutoutOnAsset(asset);
      if (ok) {
        renderAll();
        toast(t('ss_cutout_ok'), 'ok');
      }
    });
  }

  if (btnBdClearProduct) {
    btnBdClearProduct.addEventListener('click', function () {
      pushUndo();
      app.badge.productAssetId = null;
      if (app.badge.layers[0]) {
        app.badge.layers[0].nx = 0.50;
        app.badge.layers[0].ny = 0.50;
        app.badge.layers[0].scale = 1.05;
      }
      syncModeControls();
      renderAll();
    });
  }

  /* ----- Event Bindings: Right Inspector Controls ----- */
  if (ssPropText) {
    ssPropText.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'text') return;
      L.text = ssPropText.value;
      if (app.mode === 'meme') {
        if (L.role === 'top' && ssMemeTopInput) ssMemeTopInput.value = L.text;
        if (L.role === 'bot' && ssMemeBotInput) ssMemeBotInput.value = L.text;
      }
      renderLayerList();
      renderAll();
    });
  }
  if (ssFontTrigger && ssFontMenu) {
    ssFontTrigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var L = getSelectedLayer();
      populateFontMenu((L && L.type === 'text') ? (L.font || 'cairo') : 'cairo');
      var isHidden = ssFontMenu.classList.toggle('hide');
      ssFontTrigger.setAttribute('aria-expanded', isHidden ? 'false' : 'true');
    });
    document.addEventListener('click', function (e) {
      if (ssFontPicker && !ssFontPicker.contains(e.target) && !ssFontMenu.classList.contains('hide')) {
        ssFontMenu.classList.add('hide');
        ssFontTrigger.setAttribute('aria-expanded', 'false');
      }
    });
  }
  if (ssPropFontSize) {
    ssPropFontSize.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'text') return;
      L.fontSize = clamp(parseInt(ssPropFontSize.value, 10) || 72, 20, 220);
      renderAll();
    });
  }
  if (ssPropTextFrame) {
    ssPropTextFrame.addEventListener('change', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'text') return;
      pushUndo();
      L.frameStyle = ssPropTextFrame.value;
      L.fuseWithOutline = L.frameStyle === 'fused';
      syncInspectorUI();
      renderAll();
    });
  }
  if (ssPropTextColor) ssPropTextColor.addEventListener('input', function () { var L = getSelectedLayer(); if (L && L.type === 'text') { L.color = sanitizeHex(ssPropTextColor.value, '#FFFFFF'); renderAll(); } });
  if (ssPropStrokeColor) ssPropStrokeColor.addEventListener('input', function () { var L = getSelectedLayer(); if (L && L.type === 'text') { L.strokeColor = sanitizeHex(ssPropStrokeColor.value, '#111827'); renderAll(); } });
  if (ssPropFrameBg) ssPropFrameBg.addEventListener('input', function () { var L = getSelectedLayer(); if (L && L.type === 'text') { L.frameBg = sanitizeHex(ssPropFrameBg.value, '#2563EB'); renderAll(); } });
  if (ssPropStrokeW) {
    ssPropStrokeW.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'text') return;
      L.strokeW = clamp(parseInt(ssPropStrokeW.value, 10) || 0, 0, 24);
      if (ssPropStrokeWVal) ssPropStrokeWVal.textContent = L.strokeW + ' px';
      renderAll();
    });
  }
  if (ssPropFuseOutline) {
    ssPropFuseOutline.addEventListener('change', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'text') return;
      pushUndo();
      L.fuseWithOutline = Boolean(ssPropFuseOutline.checked);
      renderAll();
    });
  }
  if (ssPropScale) {
    ssPropScale.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L) return;
      var pct = clamp(parseInt(ssPropScale.value, 10) || 100, 20, 280);
      L.scale = pct / 100;
      if (ssPropScaleVal) ssPropScaleVal.textContent = pct + '%';
      renderAll();
    });
  }
  if (ssPropRot) {
    ssPropRot.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L) return;
      L.rot = clamp(parseInt(ssPropRot.value, 10) || 0, -180, 180);
      if (ssPropRotVal) ssPropRotVal.textContent = L.rot + '°';
      renderAll();
    });
  }
  if (ssPropOpacity) {
    ssPropOpacity.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L) return;
      L.opacity = clamp(parseInt(ssPropOpacity.value, 10) || 100, 15, 100);
      if (ssPropOpacityVal) ssPropOpacityVal.textContent = L.opacity + '%';
      renderAll();
    });
  }
  if (btnLayerFlipH) {
    btnLayerFlipH.addEventListener('click', function () {
      var L = getSelectedLayer();
      if (!L) return;
      pushUndo();
      L.flipH = !L.flipH;
      renderAll();
    });
  }
  if (btnLayerCenter) {
    btnLayerCenter.addEventListener('click', function () {
      var L = getSelectedLayer();
      if (!L) return;
      pushUndo();
      L.nx = 0.50;
      L.ny = 0.50;
      renderAll();
    });
  }

  /* ----- Stage Toolbar & Footer Buttons ----- */
  if (btnToggleChecker) {
    btnToggleChecker.addEventListener('click', function () {
      app.showChecker = !app.showChecker;
      btnToggleChecker.classList.toggle('active', app.showChecker);
      btnToggleChecker.setAttribute('aria-pressed', app.showChecker ? 'true' : 'false');
      if (ssViewport) ssViewport.classList.toggle('is-checker', app.showChecker);
    });
  }
  if (btnUndo) btnUndo.addEventListener('click', performUndo);
  if (btnRedo) btnRedo.addEventListener('click', performRedo);
  if (btnDupSelected) btnDupSelected.addEventListener('click', function () { var L = getSelectedLayer(); if (L) duplicateLayerById(L.id); });
  if (btnDelSelected) btnDelSelected.addEventListener('click', function () { var L = getSelectedLayer(); if (L) deleteLayerById(L.id); });
  if (btnResetMode) {
    btnResetMode.addEventListener('click', function () {
      if (app.mode === 'sticker') initStickerStarter(true);
      else if (app.mode === 'meme') initMemeStarter('drake', true);
      else if (app.mode === 'card') initCardStarter(true);
      else if (app.mode === 'badge') initBadgeStarter(true);
      syncModeControls();
      syncInspectorUI();
      renderLayerList();
      renderAll();
    });
  }

  function startPeek() { isPeeking = true; renderAll(); }
  function stopPeek() { if (isPeeking) { isPeeking = false; renderAll(); } }
  if (btnPeekOriginal) {
    btnPeekOriginal.addEventListener('pointerdown', startPeek);
    btnPeekOriginal.addEventListener('pointerup', stopPeek);
    btnPeekOriginal.addEventListener('pointerleave', stopPeek);
    btnPeekOriginal.addEventListener('pointercancel', stopPeek);
  }
  if (btnMqPeek) {
    btnMqPeek.addEventListener('pointerdown', startPeek);
    btnMqPeek.addEventListener('pointerup', stopPeek);
    btnMqPeek.addEventListener('pointerleave', stopPeek);
    btnMqPeek.addEventListener('pointercancel', stopPeek);
  }

  /* Mobile Quickbar */
  if (btnMqAddText) {
    btnMqAddText.addEventListener('click', function () {
      pushUndo();
      var nl = makeTextLayer({
        text: isArabicUI() ? 'نص جديد' : 'NEW TEXT',
        nx: 0.50,
        ny: 0.65,
        frameStyle: app.mode === 'sticker' ? 'fused' : 'none',
        fuseWithOutline: app.mode === 'sticker',
      });
      curWS().layers.push(nl);
      curWS().selectedId = nl.id;
      syncInspectorUI();
      renderLayerList();
      renderAll();
    });
  }
  if (btnMqUpload) {
    btnMqUpload.addEventListener('click', function () {
      app.pendingUploadKind = app.mode === 'sticker' ? 'main' : (app.mode === 'badge' ? 'product' : 'extra');
      ssPhotoInput.click();
    });
  }
  if (btnMqPreview) btnMqPreview.addEventListener('click', openChatModal);
  if (btnMqUndo) btnMqUndo.addEventListener('click', performUndo);
  if (btnMqDownload) btnMqDownload.addEventListener('click', openExportModal);

  /* ----- Canvas Pointer Interaction (Select, Drag, Corner Scale, Rotate, Pinch/Twist, Edge Brush) ----- */
  function clientToCanvas(cx, cy) {
    var r = ssMainCanvas.getBoundingClientRect();
    var d = getDim();
    if (!r.width || !r.height) return { x: 0, y: 0 };
    return {
      x: (cx - r.left) * (d.w / r.width),
      y: (cy - r.top) * (d.h / r.height),
    };
  }

  function applyBrushStroke(cx, cy) {
    var st = app.sticker;
    var asset = st.mainAssetId ? imageAssets.get(st.mainAssetId) : null;
    if (!asset || !asset.hasCutout || !asset.maskAlpha) return;
    var mainLayer = null;
    for (var i = 0; i < st.layers.length; i++) {
      if (st.layers[i].isMainPhoto) { mainLayer = st.layers[i]; break; }
    }
    if (!mainLayer) return;

    var d = getDim();
    var target = Math.min(d.w, d.h) * 0.62;
    var ratio = target / Math.max(asset.w, asset.h);
    var dw = asset.w * ratio;
    var dh = asset.h * ratio;
    var lcx = mainLayer.nx * d.w;
    var lcy = mainLayer.ny * d.h;
    var sc = mainLayer.scale || 1;
    var rot = ((mainLayer.rot || 0) * Math.PI) / 180;

    var dx = cx - lcx;
    var dy = cy - lcy;
    var cos = Math.cos(-rot);
    var sin = Math.sin(-rot);
    var lx = (dx * cos - dy * sin) / (mainLayer.flipH ? -sc : sc);
    var ly = (dx * sin + dy * cos) / sc;

    var imgX = (lx + dw / 2) / ratio;
    var imgY = (ly + dh / 2) / ratio;
    var rad = (st.brushSize / (ratio * sc)) * 0.65;
    var x0 = clamp(Math.floor(imgX - rad), 0, asset.w - 1);
    var y0 = clamp(Math.floor(imgY - rad), 0, asset.h - 1);
    var x1 = clamp(Math.ceil(imgX + rad), 0, asset.w - 1);
    var y1 = clamp(Math.ceil(imgY + rad), 0, asset.h - 1);
    var val = st.brushMode === 'restore' ? 255 : 0;
    var r2 = rad * rad;

    for (var py = y0; py <= y1; py++) {
      for (var px = x0; px <= x1; px++) {
        if ((px - imgX) * (px - imgX) + (py - imgY) * (py - imgY) <= r2) {
          asset.maskAlpha[py * asset.w + px] = val;
        }
      }
    }
    brushMinX = Math.min(brushMinX, x0);
    brushMinY = Math.min(brushMinY, y0);
    brushMaxX = Math.max(brushMaxX, x1);
    brushMaxY = Math.max(brushMaxY, y1);
    patchCutoutRegion(asset, x0, y0, x1 + 1, y1 + 1);
    renderAll();
  }

  function pointInBox(px, py, box) {
    var dx = px - box.cx;
    var dy = py - box.cy;
    var cos = Math.cos(-box.rotRad);
    var sin = Math.sin(-box.rotRad);
    var lx = dx * cos - dy * sin;
    var ly = dx * sin + dy * cos;
    return Math.abs(lx) <= box.hw + 12 && Math.abs(ly) <= box.hh + 12;
  }

  function hitTestHandles(px, py) {
    var selL = getSelectedLayer();
    if (!selL || selL.locked) return null;
    var sel = layerBoxes[selL.id];
    if (!sel) return null;
    var hr = Math.max(24, 30 * getScaleRef());
    if (Math.hypot(px - sel.rotHandle.x, py - sel.rotHandle.y) <= hr) return { action: 'rotate', id: selL.id };
    for (var i = 0; i < sel.corners.length; i++) {
      if (Math.hypot(px - sel.corners[i].x, py - sel.corners[i].y) <= hr) return { action: 'scale', id: selL.id };
    }
    return null;
  }

  function hitTestLayer(px, py) {
    var ws = curWS();
    for (var i = ws.layers.length - 1; i >= 0; i--) {
      var L = ws.layers[i];
      if (!L.visible || L.locked) continue;
      var box = layerBoxes[L.id];
      if (box && pointInBox(px, py, box)) return L;
    }
    return null;
  }

  if (ssCanvasWrap) {
    ssCanvasWrap.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      canvasPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { ssCanvasWrap.setPointerCapture(e.pointerId); } catch (_err) {}

      var pt = clientToCanvas(e.clientX, e.clientY);

      if (app.mode === 'sticker' && app.sticker.brushMode !== 'move') {
        var asset = app.sticker.mainAssetId ? imageAssets.get(app.sticker.mainAssetId) : null;
        if (asset && asset.hasCutout && asset.maskAlpha) {
          preBrushAlpha = new Uint8ClampedArray(asset.maskAlpha);
          brushMinX = asset.w;
          brushMinY = asset.h;
          brushMaxX = 0;
          brushMaxY = 0;
          dragAction = 'brush';
          applyBrushStroke(pt.x, pt.y);
          return;
        }
      }

      if (canvasPointers.size === 2) {
        var L2 = getSelectedLayer();
        if (!L2 || L2.locked) return;
        var pts = Array.from(canvasPointers.values());
        var p0 = clientToCanvas(pts[0].x, pts[0].y);
        var p1 = clientToCanvas(pts[1].x, pts[1].y);
        pushUndo();
        dragAction = 'pinch';
        dragStart = {
          dist: Math.max(12, Math.hypot(p1.x - p0.x, p1.y - p0.y)),
          angle: Math.atan2(p1.y - p0.y, p1.x - p0.x),
          midX: (p0.x + p1.x) / 2,
          midY: (p0.y + p1.y) / 2,
          scale: L2.scale || 1,
          rot: L2.rot || 0,
          nx: L2.nx,
          ny: L2.ny,
        };
        return;
      }

      var hHit = hitTestHandles(pt.x, pt.y);
      if (hHit) {
        var selL = getSelectedLayer();
        var box = layerBoxes[selL.id];
        pushUndo();
        dragAction = hHit.action;
        dragStart = {
          cx: box.cx,
          cy: box.cy,
          dist: Math.max(12, Math.hypot(pt.x - box.cx, pt.y - box.cy)),
          angle: Math.atan2(pt.y - box.cy, pt.x - box.cx),
          scale: selL.scale || 1,
          rot: selL.rot || 0,
        };
        return;
      }

      var hitL = hitTestLayer(pt.x, pt.y);
      if (hitL) {
        curWS().selectedId = hitL.id;
        syncInspectorUI();
        renderLayerList();
        renderOverlayCanvas();
        pushUndo();
        dragAction = 'move';
        dragStart = { x: pt.x, y: pt.y, nx: hitL.nx, ny: hitL.ny };
      } else {
        curWS().selectedId = null;
        syncInspectorUI();
        renderLayerList();
        renderOverlayCanvas();
      }
    });

    ssCanvasWrap.addEventListener('pointermove', function (e) {
      if (app.mode === 'sticker' && app.sticker.brushMode !== 'move' && ssBrushCursor) {
        var wr = ssCanvasWrap.getBoundingClientRect();
        ssBrushCursor.classList.remove('hide');
        ssBrushCursor.style.width = app.sticker.brushSize + 'px';
        ssBrushCursor.style.height = app.sticker.brushSize + 'px';
        ssBrushCursor.style.left = (e.clientX - wr.left) + 'px';
        ssBrushCursor.style.top = (e.clientY - wr.top) + 'px';
      } else if (ssBrushCursor) {
        ssBrushCursor.classList.add('hide');
      }

      if (!canvasPointers.has(e.pointerId)) return;
      canvasPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!dragAction) return;

      var pt = clientToCanvas(e.clientX, e.clientY);
      if (dragAction === 'brush') {
        applyBrushStroke(pt.x, pt.y);
        return;
      }

      var L = getSelectedLayer();
      if (!L || L.locked || !dragStart) return;
      var d = getDim();

      if (dragAction === 'pinch' && canvasPointers.size >= 2) {
        var pts = Array.from(canvasPointers.values());
        var p0 = clientToCanvas(pts[0].x, pts[0].y);
        var p1 = clientToCanvas(pts[1].x, pts[1].y);
        var newDist = Math.max(12, Math.hypot(p1.x - p0.x, p1.y - p0.y));
        var newAng = Math.atan2(p1.y - p0.y, p1.x - p0.x);
        var midX = (p0.x + p1.x) / 2;
        var midY = (p0.y + p1.y) / 2;
        L.scale = clamp(dragStart.scale * (newDist / dragStart.dist), 0.2, 2.8);
        var diffDeg = ((newAng - dragStart.angle) * 180) / Math.PI;
        L.rot = clamp(Math.round(dragStart.rot + diffDeg), -180, 180);
        L.nx = clamp(dragStart.nx + (midX - dragStart.midX) / d.w, 0.04, 0.96);
        L.ny = clamp(dragStart.ny + (midY - dragStart.midY) / d.h, 0.04, 0.96);
        syncInspectorUI();
        renderAll();
        return;
      }

      if (dragAction === 'move') {
        var nx = clamp(dragStart.nx + (pt.x - dragStart.x) / d.w, 0.04, 0.96);
        var ny = clamp(dragStart.ny + (pt.y - dragStart.y) / d.h, 0.04, 0.96);
        activeSnapX = Math.abs(nx - 0.5) < 0.014;
        activeSnapY = Math.abs(ny - 0.5) < 0.014;
        if (activeSnapX) nx = 0.5;
        if (activeSnapY) ny = 0.5;
        L.nx = nx;
        L.ny = ny;
        renderAll();
      } else if (dragAction === 'scale') {
        var distNow = Math.max(12, Math.hypot(pt.x - dragStart.cx, pt.y - dragStart.cy));
        L.scale = clamp(dragStart.scale * (distNow / dragStart.dist), 0.2, 2.8);
        syncInspectorUI();
        renderAll();
      } else if (dragAction === 'rotate') {
        var angNow = Math.atan2(pt.y - dragStart.cy, pt.x - dragStart.cx);
        var delta = ((angNow - dragStart.angle) * 180) / Math.PI;
        var rawDeg = dragStart.rot + delta;
        if (Math.abs(rawDeg) < 4) rawDeg = 0;
        L.rot = clamp(Math.round(rawDeg), -180, 180);
        syncInspectorUI();
        renderAll();
      }
    });

    function endPointer(e) {
      canvasPointers.delete(e.pointerId);
      if (dragAction === 'brush' && preBrushAlpha) {
        var asset = app.sticker.mainAssetId ? imageAssets.get(app.sticker.mainAssetId) : null;
        if (asset && brushMaxX >= brushMinX) {
          asset.brushUndo.push(preBrushAlpha);
          if (asset.brushUndo.length > 25) asset.brushUndo.shift();
          asset.brushRedo = [];
          syncModeControls();
        }
        preBrushAlpha = null;
      }
      if (canvasPointers.size === 0) {
        dragAction = null;
        dragStart = null;
        activeSnapX = false;
        activeSnapY = false;
        renderOverlayCanvas();
      }
    }

    ssCanvasWrap.addEventListener('pointerup', endPointer);
    ssCanvasWrap.addEventListener('pointercancel', endPointer);
    ssCanvasWrap.addEventListener('pointerleave', function () {
      if (ssBrushCursor) ssBrushCursor.classList.add('hide');
    });
  }

  /* ----- Chat Bubble Preview Modal ----- */
  function openChatModal() {
    if (!ssChatModal || !ssChatStickerImg) return;
    renderToCanvas(ssMainCanvas);
    ssMainCanvas.toBlob(function (blob) {
      if (!blob) return;
      var old = ssChatStickerImg.dataset.objUrl;
      revokeAssetUrl(old);
      var url = URL.createObjectURL(blob);
      ssChatStickerImg.dataset.objUrl = url;
      ssChatStickerImg.src = url;
      ssChatModal.classList.remove('hide');
    }, 'image/png');
  }

  function closeChatModal() {
    if (ssChatModal) ssChatModal.classList.add('hide');
  }

  function syncExportModalMode() {
    exportModeSections.forEach(function (sec) {
      sec.classList.toggle('hide', sec.getAttribute('data-export-mode') !== app.mode);
    });
  }

  function openExportModal() {
    if (!ssExportModal) return;
    stopPeek();
    syncExportModalMode();
    ssExportModal.classList.remove('hide');
  }

  function closeExportModal() {
    if (ssExportModal) ssExportModal.classList.add('hide');
  }

  if (btnStChatPreview) {
    btnStChatPreview.addEventListener('click', function () {
      closeExportModal();
      openChatModal();
    });
  }
  if (btnTopChatPreview) btnTopChatPreview.addEventListener('click', openChatModal);
  if (btnCloseChatModal) btnCloseChatModal.addEventListener('click', closeChatModal);
  if (ssChatModal) {
    ssChatModal.addEventListener('click', function (e) {
      if (e.target === ssChatModal) closeChatModal();
    });
  }
  if (btnOpenExportModal) btnOpenExportModal.addEventListener('click', openExportModal);
  if (btnCloseExportModal) btnCloseExportModal.addEventListener('click', closeExportModal);
  if (ssExportModal) {
    ssExportModal.addEventListener('click', function (e) {
      if (e.target === ssExportModal) closeExportModal();
    });
  }
  chatThemeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var th = b.getAttribute('data-chat-theme');
      chatThemeBtns.forEach(function (x) { x.classList.toggle('active', x === b); });
      if (ssChatStage) {
        ssChatStage.classList.toggle('is-light', th === 'light');
        ssChatStage.classList.toggle('is-dark', th === 'dark');
      }
    });
  });

  /* ----- Export & Printable Sheet Builders ----- */
  function triggerCanvasDownload(canvas, mime, quality, filename) {
    canvas.toBlob(function (blob) {
      if (!blob) { toast(t('ss_export_err'), 'err'); return; }
      if (I.triggerDownload) I.triggerDownload(blob, filename);
      else {
        var u = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = u;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
      }
      toast(t('ss_export_ok'), 'ok');
    }, mime, quality);
  }

  function exportImage(fmt, exactWidth, opaqueWhiteBg, namePrefix) {
    var out = document.createElement('canvas');
    renderToCanvas(ssMainCanvas);
    if (exactWidth && exactWidth > 0) {
      var aspect = ssMainCanvas.height / Math.max(1, ssMainCanvas.width);
      out.width = exactWidth;
      out.height = Math.round(exactWidth * aspect);
    } else {
      out.width = ssMainCanvas.width;
      out.height = ssMainCanvas.height;
    }
    var ctx = out.getContext('2d');
    if (opaqueWhiteBg || fmt === 'jpg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, out.width, out.height);
    }
    ctx.drawImage(ssMainCanvas, 0, 0, out.width, out.height);
    var ext = fmt === 'jpg' ? 'jpg' : 'png';
    var mime = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
    var fname = sanitizeFilename(namePrefix) + '.' + ext;
    triggerCanvasDownload(out, mime, fmt === 'jpg' ? 0.94 : undefined, fname);
    setTimeout(function () { zeroCanvas(out); }, 1500);
  }

  function exportStickerSheet(asPdf) {
    renderToCanvas(ssMainCanvas);
    var isA4 = app.sticker.printPaper === 'a4';
    var wMm = isA4 ? 210 : 101.6;
    var hMm = isA4 ? 297 : 152.4;
    var mmToPx = 300 / 25.4;
    var sheetW = Math.round(wMm * mmToPx);
    var sheetH = Math.round(hMm * mmToPx);

    var cols = clamp(parseInt(ssSheetCols && ssSheetCols.value, 10) || 3, 2, 6);
    var rows = clamp(parseInt(ssSheetRows && ssSheetRows.value, 10) || 4, 2, 8);
    var margin = Math.round(sheetW * 0.05);
    var gap = Math.round(sheetW * 0.025);
    var cellW = (sheetW - margin * 2 - gap * (cols - 1)) / cols;
    var cellH = (sheetH - margin * 2 - gap * (rows - 1)) / rows;
    var size = Math.min(cellW, cellH);

    var sc = document.createElement('canvas');
    sc.width = sheetW;
    sc.height = sheetH;
    var sctx = sc.getContext('2d');
    sctx.fillStyle = '#FFFFFF';
    sctx.fillRect(0, 0, sheetW, sheetH);

    var gridW = cols * size + (cols - 1) * gap;
    var gridH = rows * size + (rows - 1) * gap;
    var startX = (sheetW - gridW) / 2;
    var startY = (sheetH - gridH) / 2;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x = startX + c * (size + gap);
        var y = startY + r * (size + gap);
        sctx.drawImage(ssMainCanvas, x, y, size, size);
      }
    }

    if (asPdf) {
      var pdf = new jsPDF({
        orientation: wMm > hMm ? 'l' : 'p',
        unit: 'mm',
        format: [wMm, hMm],
      });
      var dataUrl = sc.toDataURL('image/jpeg', 0.94);
      pdf.addImage(dataUrl, 'JPEG', 0, 0, wMm, hMm);
      pdf.save('imgsfix-sticker-sheet-' + app.sticker.printPaper + '.pdf');
      zeroCanvas(sc);
      toast(t('ss_export_ok'), 'ok');
    } else {
      triggerCanvasDownload(sc, 'image/png', undefined, 'imgsfix-sticker-sheet-' + app.sticker.printPaper + '.png');
      setTimeout(function () { zeroCanvas(sc); }, 1500);
    }
  }

  function exportCardPdf() {
    renderToCanvas(ssMainCanvas);
    var d = getDim();
    var wMm = 210;
    var hMm = Math.round((d.h / d.w) * wMm);
    var pdf = new jsPDF({
      orientation: wMm > hMm ? 'l' : 'p',
      unit: 'mm',
      format: [wMm, hMm],
    });
    var dataUrl = ssMainCanvas.toDataURL('image/jpeg', 0.94);
    pdf.addImage(dataUrl, 'JPEG', 0, 0, wMm, hMm);
    pdf.save('imgsfix-greeting-card.pdf');
    toast(t('ss_export_ok'), 'ok');
  }

  function quickDownloadCurrentMode() {
    if (app.mode === 'sticker') exportImage('png', 512, false, 'whatsapp-sticker-512');
    else if (app.mode === 'meme') exportImage('jpg', 0, true, 'imgsfix-meme');
    else if (app.mode === 'card') exportImage('png', 0, true, 'imgsfix-greeting-card');
    else if (app.mode === 'badge') exportImage('png', 0, false, 'imgsfix-promo-badge');
  }

  if (btnStExportWa) btnStExportWa.addEventListener('click', function () { exportImage('png', 512, false, 'whatsapp-sticker-512'); });
  if (btnModalExportWa) btnModalExportWa.addEventListener('click', function () { exportImage('png', 512, false, 'whatsapp-sticker-512'); });
  if (btnStExportFull) btnStExportFull.addEventListener('click', function () { exportImage('png', 0, false, 'imgsfix-diecut-sticker'); });
  if (btnStSheetPng) btnStSheetPng.addEventListener('click', function () { exportStickerSheet(false); });
  if (btnStSheetPdf) btnStSheetPdf.addEventListener('click', function () { exportStickerSheet(true); });

  if (btnMmExportJpg) btnMmExportJpg.addEventListener('click', function () { exportImage('jpg', 0, true, 'imgsfix-meme'); });
  if (btnMmExportPng) btnMmExportPng.addEventListener('click', function () { exportImage('png', 0, true, 'imgsfix-meme'); });

  if (btnCdExportPng) btnCdExportPng.addEventListener('click', function () { exportImage('png', 0, true, 'imgsfix-card'); });
  if (btnCdExportJpg) btnCdExportJpg.addEventListener('click', function () { exportImage('jpg', 0, true, 'imgsfix-card'); });
  if (btnCdExportPdf) btnCdExportPdf.addEventListener('click', exportCardPdf);

  if (btnBdExportPng) btnBdExportPng.addEventListener('click', function () { exportImage('png', 0, false, 'imgsfix-promo-badge'); });
  if (btnBdExportJpg) btnBdExportJpg.addEventListener('click', function () { exportImage('jpg', 0, true, 'imgsfix-promo-badge'); });

  /* ----- Keyboard Shortcuts (EN & AR layout-independent via e.code) ----- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (ssFontMenu && !ssFontMenu.classList.contains('hide')) {
        ssFontMenu.classList.add('hide');
        if (ssFontTrigger) ssFontTrigger.setAttribute('aria-expanded', 'false');
        return;
      }
      if (ssExportModal && !ssExportModal.classList.contains('hide')) {
        closeExportModal();
        return;
      }
      if (ssChatModal && !ssChatModal.classList.contains('hide')) {
        closeChatModal();
        return;
      }
    }

    var ctrl = e.ctrlKey || e.metaKey;
    var lowerKey = e.key ? e.key.toLowerCase() : '';
    var code = e.code || '';

    if (ctrl && (lowerKey === 's' || code === 'KeyS')) {
      e.preventDefault();
      openExportModal();
      return;
    }

    var tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
    var isRange = tag === 'input' && e.target.type === 'range';
    var isInput = (tag === 'input' && !isRange) || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable);
    if (isInput) return;

    if (code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!isPeeking && !e.repeat) startPeek();
      return;
    }

    if (ctrl && (lowerKey === 'z' || code === 'KeyZ') && !e.shiftKey) {
      e.preventDefault();
      performUndo();
      return;
    }
    if (ctrl && (lowerKey === 'y' || code === 'KeyY' || ((lowerKey === 'z' || code === 'KeyZ') && e.shiftKey))) {
      e.preventDefault();
      performRedo();
      return;
    }
    if (ctrl && (lowerKey === 'd' || code === 'KeyD')) {
      e.preventDefault();
      var L = getSelectedLayer();
      if (L) duplicateLayerById(L.id);
      return;
    }
    if (!ctrl && (lowerKey === 'c' || code === 'KeyC') && app.mode === 'sticker') {
      e.preventDefault();
      if (ssChatModal && !ssChatModal.classList.contains('hide')) closeChatModal();
      else openChatModal();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      var delL = getSelectedLayer();
      if (delL) {
        e.preventDefault();
        deleteLayerById(delL.id);
      }
      return;
    }

    var moveL = getSelectedLayer();
    if (moveL && !moveL.locked && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      var d = getDim();
      var step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft') moveL.nx = clamp(moveL.nx - step / d.w, 0.04, 0.96);
      if (e.key === 'ArrowRight') moveL.nx = clamp(moveL.nx + step / d.w, 0.04, 0.96);
      if (e.key === 'ArrowUp') moveL.ny = clamp(moveL.ny - step / d.h, 0.04, 0.96);
      if (e.key === 'ArrowDown') moveL.ny = clamp(moveL.ny + step / d.h, 0.04, 0.96);
      renderAll();
    }
  });

  document.addEventListener('keyup', function (e) {
    if (e.code === 'Space' || e.key === ' ') stopPeek();
  });

  window.addEventListener('blur', function () {
    stopPeek();
  });

  /* ----- Cleanup & Bilingual Events ----- */
  document.addEventListener('imgsfix:langchange', function () {
    syncDocumentMeta();
    buildPhraseGrid();
    buildStickerPackGrid();
    syncModeControls();
    syncInspectorUI();
    renderLayerList();
    renderAll();
  });

  window.addEventListener('beforeunload', function () {
    if (ssChatStickerImg && ssChatStickerImg.dataset.objUrl) {
      revokeAssetUrl(ssChatStickerImg.dataset.objUrl);
    }
    imageAssets.forEach(function (asset) {
      zeroCanvas(asset.rawOrigCanvas);
      zeroCanvas(asset.rawCutoutCanvas);
      asset.maskAlpha = null;
      asset.origData = null;
    });
    imageAssets.clear();
    zeroCanvas(fuseBufferCanvas);
    zeroCanvas(fuseOutlineCanvas);
    zeroCanvas(dilationWorkCanvas);
  });

  /* ----- Boot Studio ----- */
  initStickerStarter(true);
  initMemeStarter('drake', true);
  initCardStarter(true);
  initBadgeStarter(true);

  buildPhraseGrid();
  buildStickerPackGrid();
  syncDocumentMeta();
  syncModeControls();
  syncInspectorUI();
  renderLayerList();
  renderAll();
  startSilentPreload();
})();
