// ============================================
// CONFIGURATION
// ============================================
const MISTRAL_API_KEY = 'AeXpjWlp279zSchqP7weMw4nXwNyBrCx';

// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadSection = document.getElementById('uploadSection');
const previewSection = document.getElementById('previewSection');
const processBtn = document.getElementById('processBtn');
const loadingSection = document.getElementById('loadingSection');
const resultSection = document.getElementById('resultSection');
const resultDisplay = document.getElementById('resultDisplay');
const searchText = document.getElementById('searchText');
const searchBtn = document.getElementById('searchBtn');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchCounter = document.getElementById('searchCounter');
const copyBtn = document.getElementById('copyBtn');
const downloadWordBtn = document.getElementById('downloadWordBtn');
const downloadTxtBtn = document.getElementById('downloadTxtBtn');
const newBtn = document.getElementById('newBtn');
const formatToggleBtn = document.getElementById('formatToggleBtn');
const formatToolbar = document.getElementById('formatToolbar');
const fontSizeSelect = document.getElementById('fontSizeSelect');
const lineHeightSelect = document.getElementById('lineHeightSelect');
const fontFamilySelect = document.getElementById('fontFamilySelect');
const applyFormatBtn = document.getElementById('applyFormatBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');

// Global Variables
let selectedFile = null;
let fullOCRResult = null;
let searchMatches = [];
let currentMatchIndex = -1;
let currentFileName = '';

// ============================================
// FILE HANDLING
// ============================================

fileInput.addEventListener('change', (e) => {
    handleFileSelect(e.target.files[0]);
});

uploadSection.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadSection.classList.add('dragover');
});

uploadSection.addEventListener('dragleave', () => {
    uploadSection.classList.remove('dragover');
});

uploadSection.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

async function handleFileSelect(file) {
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
        showError('กรุณาเลือกไฟล์ PDF เท่านั้น');
        return;
    }
    
    if (file.size > 20 * 1024 * 1024) {
        showError('ไฟล์มีขนาดใหญ่เกิน 20MB');
        return;
    }
    
    selectedFile = file;
    currentFileName = file.name.replace('.pdf', '');
    
    fileName.textContent = `📄 ${file.name}`;
    fileSize.textContent = `ขนาด: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    
    previewSection.classList.add('active');
    hideError();
}

// ============================================
// OCR PROCESSING
// ============================================

processBtn.addEventListener('click', async () => {
    if (!MISTRAL_API_KEY) {
        showError('กรุณาใส่ Mistral API Key ในไฟล์ script.js ก่อนใช้งาน');
        return;
    }
    
    if (!selectedFile) {
        showError('กรุณาเลือกไฟล์ PDF ก่อน');
        return;
    }
    
    loadingSection.classList.add('active');
    previewSection.classList.remove('active');
    resultSection.classList.remove('active');
    hideError();
    
    try {
        console.log('กำลังอัปโหลดไฟล์...');
        const fileId = await uploadFile(selectedFile);
        console.log('อัปโหลดสำเร็จ! File ID:', fileId);
        
        console.log('กำลังประมวลผล OCR...');
        const result = await performPDFOCR(fileId);
        
        fullOCRResult = result;
        
        displayResult();
        
        resultSection.classList.add('active');
        loadingSection.classList.remove('active');
        showSuccess(`✅ แปลงข้อความสำเร็จ! ${result.length} ตัวอักษร`);
        
    } catch (error) {
        loadingSection.classList.remove('active');
        previewSection.classList.add('active');
        showError(`เกิดข้อผิดพลาด: ${error.message}`);
        console.error('OCR Error:', error);
    }
});

async function uploadFile(file) {
    const apiUrl = 'https://api.mistral.ai/v1/files';
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'ocr');
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${MISTRAL_API_KEY}`
        },
        body: formData
    });
    
    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMessage = `HTTP ${response.status}`;
        
        try {
            const errorData = JSON.parse(errorText);
            if (errorData.message) errorMessage = errorData.message;
        } catch (e) {}
        
        throw new Error(`การอัปโหลดไฟล์ล้มเหลว: ${errorMessage}`);
    }
    
    const data = await response.json();
    return data.id;
}

async function performPDFOCR(fileId) {
    const apiUrl = 'https://api.mistral.ai/v1/ocr';
    
    const payload = {
        model: 'mistral-ocr-latest',
        document: {
            type: 'file',
            file_id: fileId
        }
    };
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MISTRAL_API_KEY}`
        },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMessage = `HTTP ${response.status}`;
        
        try {
            const errorData = JSON.parse(errorText);
            if (errorData.message) errorMessage = errorData.message;
        } catch (e) {}
        
        throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('Total pages returned by API:', data.pages ? data.pages.length : 'unknown');
    
    let fullText = '';
    
    if (data.pages && Array.isArray(data.pages)) {
        data.pages.forEach((page, index) => {
            const pageText = page.markdown || page.text || page.content || '';
            if (pageText && pageText.trim()) {
                fullText += pageText + '\n\n';
            }
        });
    } else {
        const text = data.markdown || data.text || data.content || '';
        fullText = text;
    }
    
    return fullText.trim() || 'ไม่พบข้อความในเอกสาร';
}

// ============================================
// DISPLAY & SEARCH
// ============================================

function displayResult() {
    const searchQuery = searchText.value.trim().toLowerCase();
    
    if (!fullOCRResult) {
        resultDisplay.innerHTML = '<div class="no-results">ไม่พบข้อความ</div>';
        updateSearchCounter();
        return;
    }
    
    const formattedHTML = formatText(fullOCRResult, searchQuery);
    resultDisplay.innerHTML = formattedHTML;
    
    if (searchQuery) {
        searchMatches = Array.from(resultDisplay.querySelectorAll('mark'));
        if (searchMatches.length > 0) {
            currentMatchIndex = 0;
            highlightCurrentMatch();
        } else {
            currentMatchIndex = -1;
        }
    } else {
        searchMatches = [];
        currentMatchIndex = -1;
    }
    
    updateSearchCounter();
}

function formatText(text, searchQuery) {
    if (!text) return '';
    
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    if (searchQuery) {
        const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi');
        formatted = formatted.replace(regex, '<mark>$1</mark>');
    }
    
    return formatted;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updateSearchCounter() {
    if (searchMatches.length > 0) {
        searchCounter.textContent = `${currentMatchIndex + 1}/${searchMatches.length}`;
        prevBtn.disabled = false;
        nextBtn.disabled = false;
    } else {
        searchCounter.textContent = '0/0';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
    }
}

function highlightCurrentMatch() {
    if (currentMatchIndex < 0 || currentMatchIndex >= searchMatches.length) return;
    
    searchMatches.forEach(mark => mark.classList.remove('current'));
    
    const currentMark = searchMatches[currentMatchIndex];
    currentMark.classList.add('current');
    
    currentMark.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
    
    updateSearchCounter();
}

function nextMatch() {
    if (searchMatches.length === 0) return;
    currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
    highlightCurrentMatch();
}

function prevMatch() {
    if (searchMatches.length === 0) return;
    currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    highlightCurrentMatch();
}

searchBtn.addEventListener('click', displayResult);

searchText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
            if (searchMatches.length > 0) prevMatch();
            else displayResult();
        } else {
            if (searchMatches.length > 0) nextMatch();
            else displayResult();
        }
    }
});

prevBtn.addEventListener('click', prevMatch);
nextBtn.addEventListener('click', nextMatch);

clearSearchBtn.addEventListener('click', () => {
    searchText.value = '';
    searchMatches = [];
    currentMatchIndex = -1;
    displayResult();
});

// ============================================
// FORMAT CONTROLS
// ============================================

formatToggleBtn.addEventListener('click', () => {
    formatToolbar.classList.toggle('active');
});

applyFormatBtn.addEventListener('click', () => {
    const fontSize = fontSizeSelect.value;
    const lineHeight = lineHeightSelect.value;
    const fontFamily = fontFamilySelect.value;
    
    resultDisplay.style.fontSize = fontSize;
    resultDisplay.style.lineHeight = lineHeight;
    resultDisplay.style.fontFamily = fontFamily;
    
    showSuccess('✅ ใช้รูปแบบใหม่แล้ว');
});

// Set default format on page load
window.addEventListener('DOMContentLoaded', () => {
    // Set default values
    resultDisplay.style.fontSize = '26px';
    resultDisplay.style.lineHeight = '1.8';
    resultDisplay.style.fontFamily = "'TH SarabunIT๙', 'Sarabun', 'TH Sarabun New', sans-serif";
});

// ============================================
// EXPORT FUNCTIONS
// ============================================

copyBtn.addEventListener('click', async () => {
    if (!fullOCRResult) {
        showError('ไม่มีข้อความให้คัดลอก');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(fullOCRResult);
        showSuccess('📋 คัดลอกสำเร็จ!');
    } catch (error) {
        const temp = document.createElement('textarea');
        temp.value = fullOCRResult;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showSuccess('📋 คัดลอกสำเร็จ!');
    }
});

downloadTxtBtn.addEventListener('click', () => {
    if (!fullOCRResult) {
        showError('ไม่มีข้อความให้ดาวน์โหลด');
        return;
    }
    
    const blob = new Blob([fullOCRResult], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentFileName || 'ocr-result'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('📝 ดาวน์โหลด TXT สำเร็จ!');
});

downloadWordBtn.addEventListener('click', () => {
    if (!fullOCRResult) {
        showError('ไม่มีข้อความให้ดาวน์โหลด');
        return;
    }
    
    // Create Word document content
    const header = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>OCR Result</title></head><body>`;
    
    const footer = '</body></html>';
    
    // Convert line breaks to paragraphs
    const content = fullOCRResult
        .split('\n')
        .map(line => `<p>${line || '&nbsp;'}</p>`)
        .join('');
    
    const html = header + content + footer;
    
    const blob = new Blob(['\ufeff', html], {
        type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentFileName || 'ocr-result'}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('📘 ดาวน์โหลด Word สำเร็จ!');
});

// ============================================
// RESET
// ============================================

newBtn.addEventListener('click', () => {
    selectedFile = null;
    fullOCRResult = null;
    searchMatches = [];
    currentMatchIndex = -1;
    currentFileName = '';
    fileInput.value = '';
    fileName.textContent = '';
    fileSize.textContent = '';
    resultDisplay.innerHTML = '';
    searchText.value = '';
    
    previewSection.classList.remove('active');
    resultSection.classList.remove('active');
    loadingSection.classList.remove('active');
    formatToolbar.classList.remove('active');
    
    updateSearchCounter();
    hideError();
    hideSuccess();
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showError(message) {
    errorMessage.textContent = `❌ ${message}`;
    errorMessage.classList.add('active');
    setTimeout(() => hideError(), 5000);
}

function hideError() {
    errorMessage.classList.remove('active');
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.add('active');
    setTimeout(() => hideSuccess(), 3000);
}

function hideSuccess() {
    successMessage.classList.remove('active');
}