// === 1. State & Variables (state.js) ===
// 전역 상태 변수 관리

window.currentMode = 'language'; // 'articulation' or 'language'
window.currentPhoneme = "";
window.activePositions = new Set(['All']); // 'All' or Set of keys
window.activeSyllables = new Set(['All']); // 'All' or Set of numbers/keys
window.currentLanguageCategory = null; // For Language Mode
window.currentTheme = null; // Selected Theme (Sidebar)
window.currentSubCategory = "전체"; // Selected Tab (Top)
window.currentPresetName = null;
window.dragSrcEl = null;

// DOM Elements often accessed
window.sidebarEl = document.getElementById('sidebar');
window.inventoryEl = document.getElementById('inventory');
window.basketGrid = document.getElementById('basket-grid');
window.presetListEl = document.getElementById('preset-list');

// Data Placeholder (Populated in main.js/init)
// window.soundData is global
