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

// Metadata Elements
const metadataSection = document.getElementById('metadataSection');
const metadataDisplay = document.getElementById('metadataDisplay');
const copyMetadataBtn = document.getElementById('copyMetadataBtn');

// Global Variables
let selectedFile = null;
let fullOCRResult = null;
let documentMetadata = null;
let searchMatches = [];
let currentMatchIndex = -1;
let currentFileName = '';
let qaMode = false; // Q&A highlighting mode

// Arabic to Thai number conversion
function convertToThaiNumbers(text) {
    const arabicToThai = {
        '0': '๐', '1': '๑', '2': '๒', '3': '๓', '4': '๔',
        '5': '๕', '6': '๖', '7': '๗', '8': '๘', '9': '๙'
    };
    
    return text.replace(/[0-9]/g, (match) => arabicToThai[match] || match);
}

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
    await processOCR();
});

// Add re-process button handler
const reprocessBtn = document.getElementById('reprocessBtn');
if (reprocessBtn) {
    reprocessBtn.addEventListener('click', async () => {
        if (!selectedFile) {
            showError('ไม่มีไฟล์ให้ประมวลผลใหม่');
            return;
        }
        
        console.log('🔄 กำลังประมวลผลใหม่...');
        await processOCR();
    });
}

async function processOCR() {
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
        
        // Extract metadata from first page (using Regex - no API call)
        console.log('กำลังดึงข้อมูลเกริ่นนำ...');
        await extractMetadata();
        
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
}

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
    console.log('📄 OCR Response:', data);
    console.log('📊 Total pages returned by API:', data.pages ? data.pages.length : 'unknown');
    
    let fullText = '';
    let pageCount = 0;
    
    if (data.pages && Array.isArray(data.pages)) {
        console.log('🔍 Processing pages...');
        
        data.pages.forEach((page, index) => {
            const pageText = page.markdown || page.text || page.content || '';
            
            if (pageText && pageText.trim()) {
                pageCount++;
                console.log(`✓ Page ${index + 1}: ${pageText.length} characters`);
                
                // Add page separator for clarity
                if (fullText.length > 0) {
                    fullText += '\n\n' + '─'.repeat(50) + '\n';
                    fullText += `หน้า ${convertToThaiNumbers(String(index + 1))}\n`;
                    fullText += '─'.repeat(50) + '\n\n';
                }
                
                fullText += pageText;
            } else {
                console.warn(`⚠ Page ${index + 1}: No content found`);
            }
        });
        
        console.log(`✅ Successfully processed ${pageCount}/${data.pages.length} pages`);
    } else {
        // Fallback for single text response
        const text = data.markdown || data.text || data.content || '';
        fullText = text;
        console.log('📝 Single text response:', text.length, 'characters');
    }
    
    if (!fullText.trim()) {
        throw new Error('ไม่พบข้อความในเอกสาร - OCR อาจล้มเหลว');
    }
    
    // Convert all Arabic numbers to Thai numbers
    fullText = convertToThaiNumbers(fullText);
    
    console.log(`🎉 OCR Complete: ${fullText.length} total characters`);
    return fullText.trim();
}

// ============================================
// METADATA EXTRACTION
// ============================================

async function extractMetadata() {
    if (!fullOCRResult) {
        documentMetadata = null;
        return;
    }
    
    // Get first 1000 characters for metadata extraction
    const firstPage = fullOCRResult.substring(0, 1000);
    
    try {
        console.log('🔍 กำลังดึงข้อมูลเกริ่นนำด้วย Pattern Matching...');
        
        const metadata = {};
        
        // Extract name (Thai name patterns)
        // Patterns: นาง/นางสาว/นาย + ชื่อ + นามสกุล
        const namePatterns = [
            /((?:นาง|นางสาว|นาย|ดร\.|ศ\.|พล\.|ร\.ต\.|ร\.อ\.|ร\.ท\.)\s*[\u0E00-\u0E7F]+(?:\s+[\u0E00-\u0E7F]+)?)/,
            /([\u0E00-\u0E7F]{2,}\s+[\u0E00-\u0E7F]{2,})/
        ];
        
        for (let pattern of namePatterns) {
            const nameMatch = firstPage.match(pattern);
            if (nameMatch && nameMatch[1]) {
                metadata.name = nameMatch[1].trim();
                break;
            }
        }
        
        // Extract action (ให้ถ้อยคำ, รายงาน, เบิกความ, etc.)
        const actionMatch = firstPage.match(/(ให้ถ้อยคำ|รายงาน|เบิกความ|ให้การ|แถลงการณ์)/i);
        if (actionMatch) {
            metadata.action = actionMatch[1];
        }
        
        // Extract receiver/organization
        const receiverPatterns = [
            /(คณะกรรมการ[^\n\r]{0,50})/,
            /(ป\.ป\.ช[\.\s]*[^\n\r]{0,30})/,
            /(สำนักงาน[^\n\r]{0,40})/,
            /(กระทรวง[^\n\r]{0,40})/
        ];
        
        for (let pattern of receiverPatterns) {
            const receiverMatch = firstPage.match(pattern);
            if (receiverMatch && receiverMatch[1]) {
                metadata.receiver = receiverMatch[1].trim();
                break;
            }
        }
        
        // Extract Thai date (e.g., ๒๐ พฤษภา ๒๕๖๕ or 20 พฤษภา 2565)
        const datePatterns = [
            // Thai numerals with full month name
            /([๐-๙]{1,2}\s*(?:มกราคม|ม\.ค\.|กุมภาพันธ์|ก\.พ\.|มีนาคม|มี\.ค\.|เมษายน|เม\.ย\.|พฤษภา|พ\.ค\.|มิถุนายน|มิ\.ย\.|กรกฎาคม|ก\.ค\.|สิงหาคม|ส\.ค\.|กันยายน|ก\.ย\.|ตุลาคม|ต\.ค\.|พฤศจิกายน|พ\.ย\.|ธันวาคม|ธ\.ค\.)\s*[๐-๙]{4})/,
            // Arabic numerals with full month name
            /([0-9]{1,2}\s*(?:มกราคม|ม\.ค\.|กุมภาพันธ์|ก\.พ\.|มีนาคม|มี\.ค\.|เมษายน|เม\.ย\.|พฤษภา|พ\.ค\.|มิถุนายน|มิ\.ย\.|กรกฎาคม|ก\.ค\.|สิงหาคม|ส\.ค\.|กันยายน|ก\.ย\.|ตุลาคม|ต\.ค\.|พฤศจิกายน|พ\.ย\.|ธันวาคม|ธ\.ค\.)\s*[0-9]{4})/,
            // With "วันที่" prefix
            /(วันที่\s*[๐-๙0-9]{1,2}[\/\-\s]+[๐-๙0-9]{1,2}[\/\-\s]+[๐-๙0-9]{2,4})/,
            // Date with "เมื่อวันที่"
            /(เมื่อวันที่\s*[๐-๙0-9]{1,2}\s*(?:มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภา|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s*[๐-๙0-9]{4})/,
            // Simple number format
            /([๐-๙0-9]{1,2}\/[๐-๙0-9]{1,2}\/[๐-๙0-9]{2,4})/,
            /([๐-๙0-9]{1,2}\-[๐-๙0-9]{1,2}\-[๐-๙0-9]{2,4})/
        ];
        
        for (let pattern of datePatterns) {
            const dateMatch = firstPage.match(pattern);
            if (dateMatch && dateMatch[1]) {
                let extractedDate = dateMatch[1].trim();
                // Clean up prefixes
                extractedDate = extractedDate.replace(/^(?:วันที่|เมื่อวันที่)\s*/, '');
                metadata.date = extractedDate;
                break;
            }
        }
        
        // Extract document number (e.g., ๔๓๓๙-๕๓๓๕ or 4339-5335)
        const docNumberPatterns = [
            /([๐-๙๑-๙]{3,}[\-\/][๐-๙๑-๙]{3,})/,
            /([0-9]{3,}[\-\/][0-9]{3,})/,
            /(เลขที่\s+[๐-๙๑-๙0-9\-\/]+)/,
            /(ทะเบียนเลขที่\s+[๐-๙๑-๙0-9\-\/]+)/
        ];
        
        for (let pattern of docNumberPatterns) {
            const docMatch = firstPage.match(pattern);
            if (docMatch && docMatch[1]) {
                metadata.document_number = docMatch[1].trim().replace(/^(?:เลขที่|ทะเบียนเลขที่)\s+/, '');
                break;
            }
        }
        
        // Extract reference number
        const refMatch = firstPage.match(/(ที่\s+[๐-๙๑-๙0-9\.\/\-]+)/);
        if (refMatch && refMatch[1]) {
            metadata.reference_number = refMatch[1].trim();
        }
        
        // Extract title/subject
        const titleMatch = firstPage.match(/(เรื่อง\s+[^\n\r]{10,100})/);
        if (titleMatch && titleMatch[1]) {
            metadata.title = titleMatch[1].trim();
        }
        
        // Check if we have any metadata
        const validKeys = Object.keys(metadata).filter(key => metadata[key]);
        
        if (validKeys.length > 0) {
            documentMetadata = metadata;
            displayMetadata();
            console.log('✅ ดึงข้อมูลเกริ่นนำสำเร็จ!', metadata);
        } else {
            documentMetadata = null;
            console.log('⚠️ ไม่พบข้อมูลเกริ่นนำในเอกสาร');
        }
        
    } catch (error) {
        console.warn('Error extracting metadata:', error.message);
        documentMetadata = null;
    }
}

function displayMetadata() {
    if (!documentMetadata || !metadataSection) return;
    
    // Filter out null/empty values
    const validMetadata = Object.entries(documentMetadata)
        .filter(([key, value]) => value && value !== 'null');
    
    if (validMetadata.length === 0) {
        metadataSection.style.display = 'none';
        return;
    }
    
    // Generate summary sentence
    const summarySentence = generateSummarySentence(documentMetadata);
    
    const labelMap = {
        'name': 'ชื่อ',
        'title': 'ชื่อเรื่อง',
        'action': 'การกระทำ',
        'receiver': 'ต่อ',
        'date': 'เมื่อวันที่',
        'document_number': 'เลขที่เอกสาร',
        'reference_number': 'เลขอ้างอิง'
    };
    
    let html = '';
    
    // Add summary sentence at the top if available
    if (summarySentence) {
        html += `
            <div class="summary-sentence">
                <div class="summary-label">📝 ประโยคสรุป (คลิกเพื่อคัดลอก):</div>
                <div class="summary-text" onclick="copySummary()">${summarySentence}</div>
            </div>
        `;
    }
    
    html += '<div class="metadata-grid">';
    
    validMetadata.forEach(([key, value]) => {
        const label = labelMap[key] || key;
        html += `
            <div class="metadata-item">
                <span class="metadata-label">${label}:</span>
                <span class="metadata-value">${value}</span>
            </div>
        `;
    });
    
    html += '</div>';
    
    metadataDisplay.innerHTML = html;
    metadataSection.style.display = 'block';
}

function generateSummarySentence(metadata) {
    if (!metadata) return null;
    
    const parts = [];
    
    // Build sentence based on available data
    if (metadata.name) {
        parts.push(metadata.name);
    }
    
    if (metadata.action) {
        parts.push(metadata.action);
    } else {
        parts.push('ให้ถ้อยคำ'); // default action
    }
    
    if (metadata.receiver) {
        parts.push(`ต่อ ${metadata.receiver}`);
    }
    
    if (metadata.date) {
        parts.push(`เมื่อวันที่ ${metadata.date}`);
    }
    
    if (metadata.document_number) {
        parts.push(`ตามรายงานไต่สวนแผ่นที่ ${metadata.document_number}`);
    }
    
    if (parts.length < 2) return null;
    
    return parts.join(' ');
}

// Global function for copying summary
window.copySummary = async function() {
    const summaryText = document.querySelector('.summary-text');
    if (!summaryText) return;
    
    const text = summaryText.textContent;
    
    try {
        await navigator.clipboard.writeText(text);
        showSuccess('📋 คัดลอกประโยคสรุปสำเร็จ!');
        
        // Visual feedback
        summaryText.style.background = '#d1fae5';
        setTimeout(() => {
            summaryText.style.background = '#f0f9ff';
        }, 500);
    } catch (error) {
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showSuccess('📋 คัดลอกประโยคสรุปสำเร็จ!');
    }
};

// Copy metadata button
if (copyMetadataBtn) {
    copyMetadataBtn.addEventListener('click', async () => {
        if (!documentMetadata) {
            showError('ไม่มีข้อมูลเกริ่นนำให้คัดลอก');
            return;
        }
        
        const validMetadata = Object.entries(documentMetadata)
            .filter(([key, value]) => value && value !== 'null');
        
        const labelMap = {
            'name': 'ชื่อ',
            'title': 'ชื่อเรื่อง',
            'action': 'การกระทำ',
            'receiver': 'ต่อ',
            'date': 'เมื่อวันที่',
            'document_number': 'เลขที่เอกสาร',
            'reference_number': 'เลขอ้างอิง'
        };
        
        let text = '';
        
        // Add summary sentence first
        const summarySentence = generateSummarySentence(documentMetadata);
        if (summarySentence) {
            text += `📝 ประโยคสรุป:\n${summarySentence}\n\n`;
        }
        
        text += '📋 ข้อมูลเกริ่นนำเอกสาร\n\n';
        validMetadata.forEach(([key, value]) => {
            const label = labelMap[key] || key;
            text += `${label}: ${value}\n`;
        });
        
        try {
            await navigator.clipboard.writeText(text);
            showSuccess('📋 คัดลอกข้อมูลเกริ่นนำสำเร็จ!');
        } catch (error) {
            const temp = document.createElement('textarea');
            temp.value = text;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
            showSuccess('📋 คัดลอกข้อมูลเกริ่นนำสำเร็จ!');
        }
    });
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
    
    let formattedHTML = '';
    
    if (qaMode) {
        // Q&A Mode: Highlight questions and answers with different colors
        formattedHTML = formatQAText(fullOCRResult, searchQuery);
    } else {
        // Normal Mode
        formattedHTML = formatText(fullOCRResult, searchQuery);
    }
    
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

function formatQAText(text, searchQuery) {
    if (!text) return '';
    
    // Escape HTML first
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Highlight the word "ถาม" with yellow background
    formatted = formatted.replace(/(ถาม)/gi, '<span class="qa-question-highlight">$1</span>');
    
    // Highlight the word "ตอบ" with green background
    formatted = formatted.replace(/(ตอบ)/gi, '<span class="qa-answer-highlight">$1</span>');
    
    // Apply search highlighting if needed (on top of Q&A highlighting)
    if (searchQuery) {
        const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi');
        formatted = formatted.replace(regex, '<mark>$1</mark>');
    }
    
    return formatted;
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

// Q&A Mode Toggle
const qaToggleBtn = document.getElementById('qaToggleBtn');
if (qaToggleBtn) {
    qaToggleBtn.addEventListener('click', () => {
        qaMode = !qaMode;
        
        if (qaMode) {
            qaToggleBtn.style.background = '#059669';
            qaToggleBtn.innerHTML = '<span>✓</span> โหมดถาม-ตอบ';
        } else {
            qaToggleBtn.style.background = '#64748b';
            qaToggleBtn.innerHTML = '<span>💬</span> โหมดถาม-ตอบ';
        }
        
        displayResult();
    });
}

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
    documentMetadata = null;
    searchMatches = [];
    currentMatchIndex = -1;
    currentFileName = '';
    qaMode = false;
    fileInput.value = '';
    fileName.textContent = '';
    fileSize.textContent = '';
    resultDisplay.innerHTML = '';
    searchText.value = '';
    
    // Reset Q&A button
    const qaToggleBtn = document.getElementById('qaToggleBtn');
    if (qaToggleBtn) {
        qaToggleBtn.style.background = '#64748b';
        qaToggleBtn.innerHTML = '<span>💬</span> โหมดถาม-ตอบ';
    }
    
    if (metadataSection) {
        metadataSection.style.display = 'none';
    }
    
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