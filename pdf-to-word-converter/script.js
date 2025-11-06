// ============================================
// CONFIGURATION
// ============================================
const MISTRAL_API_KEY = 'j4YnbG4rhxOFMMjyfpXBAPU1iUKxmsa8';

// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadSection = document.getElementById('uploadSection');
const pageSelectorSection = document.getElementById('pageSelectorSection');
const progressSection = document.getElementById('progressSection');
const previewSection = document.getElementById('previewSection');
const processBtn = document.getElementById('processBtn');
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
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');

// Page Selector Elements
const pageCountBadge = document.getElementById('pageCountBadge');
const totalPagesAll = document.getElementById('totalPagesAll');
const startPageInput = document.getElementById('startPage');
const endPageInput = document.getElementById('endPage');
const specificPagesInput = document.getElementById('specificPages');
const confirmPageSelection = document.getElementById('confirmPageSelection');
const cancelPageSelection = document.getElementById('cancelPageSelection');

// Visual Page Selector Elements
const visualPageGrid = document.getElementById('visualPageGrid');
const visualPagesContainer = document.getElementById('visualPagesContainer');
const selectedPagesCount = document.getElementById('selectedPagesCount');
const selectAllPagesBtn = document.getElementById('selectAllPages');
const deselectAllPagesBtn = document.getElementById('deselectAllPages');
let selectedPages = new Set();

// Progress Elements
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const currentPageNum = document.getElementById('currentPageNum');
const successCount = document.getElementById('successCount');
const errorCount = document.getElementById('errorCount');
const elapsedTime = document.getElementById('elapsedTime');
const pageResultStatus = document.getElementById('pageResultStatus');

// Metadata Elements
const metadataSection = document.getElementById('metadataSection');
const metadataDisplay = document.getElementById('metadataDisplay');
const copyMetadataBtn = document.getElementById('copyMetadataBtn');
const closeMetadataBtn = document.getElementById('closeMetadataBtn');
const ocrMoreBtn = document.getElementById('ocrMoreBtn');

// Editor Elements
const editorToggleBtn = document.getElementById('editorToggleBtn');
const editorPanel = document.getElementById('editorPanel');
const originalPanel = document.getElementById('originalPanel');
const editorContent = document.getElementById('editorContent');
const copyFromOriginalBtn = document.getElementById('copyFromOriginalBtn');
const boldBtn = document.getElementById('boldBtn');
const italicBtn = document.getElementById('italicBtn');
const underlineBtn = document.getElementById('underlineBtn');
const fontSizeEditor = document.getElementById('fontSizeEditor');
const fontFamilyEditor = document.getElementById('fontFamilyEditor');
const textColorPicker = document.getElementById('textColorPicker');
const bgColorPicker = document.getElementById('bgColorPicker');
const copyEditedBtn = document.getElementById('copyEditedBtn');
const resetEditorBtn = document.getElementById('resetEditorBtn');

// Global Variables
let selectedFile = null;
let pdfDocument = null;
let totalPages = 0;
let fullOCRResult = null;
let documentMetadata = null;
let searchMatches = [];
let currentMatchIndex = -1;
let currentFileName = '';
let qaMode = false;
let processingStartTime = null;
let timerInterval = null;
let editorMode = true; // เปิด Editor ตั้งแต่แรก

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
    
    // Load PDF to get page count
    try {
        const arrayBuffer = await file.arrayBuffer();
        pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        totalPages = pdfDocument.numPages;
        
        console.log(`📄 พบ ${totalPages} หน้า`);
        
        // Update UI
        pageCountBadge.textContent = `${totalPages} หน้า`;
        totalPagesAll.textContent = totalPages;
        startPageInput.max = totalPages;
        endPageInput.max = totalPages;
        endPageInput.value = totalPages;
        
        // Show page selector
        uploadSection.style.display = 'none';
        pageSelectorSection.classList.add('active');
        
        // Generate visual page grid
        generateVisualPageGrid(totalPages);
        
        hideError();
        
    } catch (error) {
        showError('ไม่สามารถอ่านไฟล์ PDF ได้: ' + error.message);
        console.error('PDF Load Error:', error);
    }
}

// Generate visual page selection grid
function generateVisualPageGrid(total) {
    visualPagesContainer.innerHTML = '';
    selectedPages.clear();
    
    for (let i = 1; i <= total; i++) {
        const pageItem = document.createElement('div');
        pageItem.className = 'visual-page-item';
        pageItem.dataset.page = i;
        
        pageItem.innerHTML = `
            <div class="visual-page-number">${convertToThaiNumbers(String(i))}</div>
            <div class="visual-page-label">หน้า</div>
        `;
        
        pageItem.addEventListener('click', () => {
            togglePageSelection(i, pageItem);
        });
        
        visualPagesContainer.appendChild(pageItem);
    }
    
    updateSelectedCount();
}

// Toggle page selection
function togglePageSelection(pageNum, element) {
    if (selectedPages.has(pageNum)) {
        selectedPages.delete(pageNum);
        element.classList.remove('selected');
    } else {
        selectedPages.add(pageNum);
        element.classList.add('selected');
    }
    updateSelectedCount();
}

// Update selected pages count
function updateSelectedCount() {
    selectedPagesCount.textContent = `เลือกแล้ว ${selectedPages.size} หน้า`;
}

// Select all pages
if (selectAllPagesBtn) {
    selectAllPagesBtn.addEventListener('click', () => {
        selectedPages.clear();
        for (let i = 1; i <= totalPages; i++) {
            selectedPages.add(i);
        }
        document.querySelectorAll('.visual-page-item').forEach(item => {
            item.classList.add('selected');
        });
        updateSelectedCount();
    });
}

// Deselect all pages
if (deselectAllPagesBtn) {
    deselectAllPagesBtn.addEventListener('click', () => {
        selectedPages.clear();
        document.querySelectorAll('.visual-page-item').forEach(item => {
            item.classList.remove('selected');
        });
        updateSelectedCount();
    });
}

// ============================================
// PAGE SELECTOR
// ============================================

// Handle page option selection
document.querySelectorAll('.page-option').forEach(option => {
    option.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.type !== 'number' && e.target.type !== 'text') {
            const radio = option.querySelector('input[type="radio"]');
            radio.checked = true;
            updateSelectedOption();
        }
    });
});

document.querySelectorAll('input[name="pageMode"]').forEach(radio => {
    radio.addEventListener('change', updateSelectedOption);
});

function updateSelectedOption() {
    document.querySelectorAll('.page-option').forEach(opt => opt.classList.remove('selected'));
    const selected = document.querySelector('input[name="pageMode"]:checked');
    if (selected) {
        selected.closest('.page-option').classList.add('selected');
        
        // Show/hide visual grid based on selection
        if (selected.value === 'visual') {
            visualPageGrid.style.display = 'block';
        } else {
            visualPageGrid.style.display = 'none';
        }
    }
}

// Initialize selection
updateSelectedOption();

// Confirm page selection
confirmPageSelection.addEventListener('click', async () => {
    const selectedMode = document.querySelector('input[name="pageMode"]:checked').value;
    let pagesToProcess = [];
    
    try {
        if (selectedMode === 'all') {
            // All pages
            pagesToProcess = Array.from({ length: totalPages }, (_, i) => i + 1);
            
        } else if (selectedMode === 'range') {
            // Range
            const start = parseInt(startPageInput.value);
            const end = parseInt(endPageInput.value);
            
            if (start < 1 || start > totalPages || end < 1 || end > totalPages) {
                showError(`หน้าต้องอยู่ระหว่าง 1-${totalPages}`);
                return;
            }
            
            if (start > end) {
                showError('หน้าเริ่มต้นต้องน้อยกว่าหรือเท่ากับหน้าสุดท้าย');
                return;
            }
            
            pagesToProcess = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            
        } else if (selectedMode === 'specific') {
            // Specific pages
            const input = specificPagesInput.value.trim();
            
            if (!input) {
                showError('กรุณาระบุหน้าที่ต้องการ');
                return;
            }
            
            pagesToProcess = parsePageInput(input, totalPages);
            
            if (pagesToProcess.length === 0) {
                showError('รูปแบบการระบุหน้าไม่ถูกต้อง');
                return;
            }
            
        } else if (selectedMode === 'visual') {
            // Visual selection
            if (selectedPages.size === 0) {
                showError('กรุณาคลิกเลือกหน้าที่ต้องการอย่างน้อย 1 หน้า');
                return;
            }
            
            pagesToProcess = Array.from(selectedPages).sort((a, b) => a - b);
        }
        
        console.log('📑 หน้าที่จะประมวลผล:', pagesToProcess);
        
        // Start processing
        await processSelectedPages(pagesToProcess);
        
    } catch (error) {
        showError('เกิดข้อผิดพลาด: ' + error.message);
        console.error('Page Selection Error:', error);
    }
});

// Cancel selection
cancelPageSelection.addEventListener('click', () => {
    resetToUpload();
});

// Parse page input (e.g., "1,3,5-7,10")
function parsePageInput(input, maxPage) {
    const pages = new Set();
    const parts = input.split(',');
    
    for (let part of parts) {
        part = part.trim();
        
        if (part.includes('-')) {
            // Range (e.g., "5-7")
            const [start, end] = part.split('-').map(s => parseInt(s.trim()));
            
            if (isNaN(start) || isNaN(end) || start < 1 || end > maxPage || start > end) {
                return [];
            }
            
            for (let i = start; i <= end; i++) {
                pages.add(i);
            }
        } else {
            // Single page
            const page = parseInt(part);
            
            if (isNaN(page) || page < 1 || page > maxPage) {
                return [];
            }
            
            pages.add(page);
        }
    }
    
    return Array.from(pages).sort((a, b) => a - b);
}

// ============================================
// PAGE-BY-PAGE OCR PROCESSING
// ============================================

async function processSelectedPages(pages) {
    if (!MISTRAL_API_KEY) {
        showError('กรุณาใส่ Mistral API Key ในไฟล์ script.js ก่อนใช้งาน');
        return;
    }
    
    // Hide page selector, show progress
    pageSelectorSection.classList.remove('active');
    progressSection.classList.add('active');
    
    // Reset progress
    progressBar.style.width = '0%';
    currentPageNum.textContent = '-';
    successCount.textContent = '0';
    errorCount.textContent = '0';
    pageResultStatus.innerHTML = '';
    
    // Start timer
    processingStartTime = Date.now();
    startTimer();
    
    const results = [];
    let successfulPages = 0;
    let failedPages = 0;
    
    try {
        for (let i = 0; i < pages.length; i++) {
            const pageNum = pages[i];
            const progress = ((i + 1) / pages.length * 100).toFixed(0);
            
            // Update progress UI
            progressBar.style.width = progress + '%';
            progressText.textContent = `กำลังประมวลผลหน้า ${convertToThaiNumbers(String(pageNum))} (${i + 1}/${pages.length}) - ${progress}%`;
            currentPageNum.textContent = convertToThaiNumbers(String(pageNum));
            
            // Add status item
            addPageStatus(pageNum, 'processing');
            
            try {
                console.log(`🔄 กำลังประมวลผลหน้า ${pageNum}...`);
                
                // Extract single page as PDF
                const singlePagePDF = await extractSinglePagePDF(pageNum);
                
                // Upload and OCR
                const fileId = await uploadFile(singlePagePDF);
                const pageText = await performPDFOCR(fileId);
                
                results.push({
                    page: pageNum,
                    text: pageText,
                    success: true
                });
                
                successfulPages++;
                successCount.textContent = successfulPages;
                
                updatePageStatus(pageNum, 'success', `${pageText.length} ตัวอักษร`);
                console.log(`✅ หน้า ${pageNum} สำเร็จ (${pageText.length} ตัวอักษร)`);
                
            } catch (error) {
                console.error(`❌ หน้า ${pageNum} ล้มเหลว:`, error);
                
                results.push({
                    page: pageNum,
                    text: '',
                    success: false,
                    error: error.message
                });
                
                failedPages++;
                errorCount.textContent = failedPages;
                
                updatePageStatus(pageNum, 'error', error.message);
            }
            
            // Small delay between pages
            if (i < pages.length - 1) {
                await new Promise(r => setTimeout(r, 500));
            }
        }
        
        // Stop timer
        stopTimer();
        
        // Combine all successful results
        fullOCRResult = results
            .filter(r => r.success)
            .map((r, index) => {
                const separator = index > 0 ? '\n\n' + '─'.repeat(50) + '\n' + `หน้า ${convertToThaiNumbers(String(r.page))}\n` + '─'.repeat(50) + '\n\n' : '';
                return separator + r.text;
            })
            .join('');
        
        if (!fullOCRResult || fullOCRResult.trim().length === 0) {
            throw new Error('ไม่พบข้อความในหน้าที่เลือก');
        }
        
        // Extract metadata from first page
        console.log('กำลังดึงข้อมูลเกริ่นนำ...');
        await extractMetadata();
        
        // Show results
        displayResult();
        
        // Restore editor content if available (from OCR More Pages)
        const editorBackup = sessionStorage.getItem('editorBackup');
        if (editorBackup) {
            editorContent.innerHTML = editorBackup;
            sessionStorage.removeItem('editorBackup');
            sessionStorage.removeItem('editorTextBackup');
            showSuccess(`✅ แปลงสำเร็จ ${successfulPages} หน้า + Editor ของคุณถูกกลับคืนมาแล้ว!`);
        }
        
        progressSection.classList.remove('active');
        resultSection.classList.add('active');
        
        const totalChars = fullOCRResult.length;
        if (!editorBackup) {
            showSuccess(`✅ แปลงสำเร็จ ${successfulPages} หน้า (${totalChars.toLocaleString()} ตัวอักษร) ${failedPages > 0 ? `| ล้มเหลว ${failedPages} หน้า` : ''}`);
        }
        
    } catch (error) {
        stopTimer();
        progressSection.classList.remove('active');
        pageSelectorSection.classList.add('active');
        showError(`เกิดข้อผิดพลาด: ${error.message}`);
        console.error('Processing Error:', error);
    }
}

// Extract single page from PDF
async function extractSinglePagePDF(pageNum) {
    const page = await pdfDocument.getPage(pageNum);
    
    // Render page to canvas
    const scale = 2.0;
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;
    
    // Convert canvas to blob
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                // Convert to File
                const file = new File([blob], `page-${pageNum}.png`, { type: 'image/png' });
                resolve(file);
            } else {
                reject(new Error('ไม่สามารถแปลงหน้าเป็นรูปภาพได้'));
            }
        }, 'image/png', 0.95);
    });
}

// Add page status
function addPageStatus(pageNum, status) {
    const statusItem = document.createElement('div');
    statusItem.className = `page-status-item ${status}`;
    statusItem.id = `status-page-${pageNum}`;
    
    let icon = '⏳';
    let text = `กำลังประมวลผลหน้า ${convertToThaiNumbers(String(pageNum))}...`;
    
    statusItem.innerHTML = `<span>${icon}</span> <span>${text}</span>`;
    pageResultStatus.appendChild(statusItem);
    
    // Auto scroll to bottom
    pageResultStatus.scrollTop = pageResultStatus.scrollHeight;
}

// Update page status
function updatePageStatus(pageNum, status, message) {
    const statusItem = document.getElementById(`status-page-${pageNum}`);
    if (!statusItem) return;
    
    statusItem.className = `page-status-item ${status}`;
    
    let icon = '✅';
    let text = `หน้า ${convertToThaiNumbers(String(pageNum))}: ${message}`;
    
    if (status === 'error') {
        icon = '❌';
        text = `หน้า ${convertToThaiNumbers(String(pageNum))}: ล้มเหลว - ${message}`;
    }
    
    statusItem.innerHTML = `<span>${icon}</span> <span>${text}</span>`;
    
    // Auto scroll
    pageResultStatus.scrollTop = pageResultStatus.scrollHeight;
}

// Timer functions
function startTimer() {
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - processingStartTime) / 1000);
        elapsedTime.textContent = `${elapsed} วินาที`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ============================================
// OCR API FUNCTIONS
// ============================================

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
        
        throw new Error(`การอัปโหลดล้มเหลว: ${errorMessage}`);
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
    
    let fullText = '';
    
    if (data.pages && Array.isArray(data.pages)) {
        data.pages.forEach((page) => {
            const pageText = page.markdown || page.text || page.content || '';
            if (pageText && pageText.trim()) {
                fullText += pageText + '\n';
            }
        });
    } else {
        fullText = data.markdown || data.text || data.content || '';
    }
    
    if (!fullText.trim()) {
        throw new Error('ไม่พบข้อความ');
    }
    
    // Convert to Thai numbers
    fullText = convertToThaiNumbers(fullText);
    
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
    
    const firstPage = fullOCRResult.substring(0, 1000);
    
    try {
        console.log('🔍 กำลังดึงข้อมูลเกริ่นนำด้วย Pattern Matching...');
        
        const metadata = {};
        
        // Extract name
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
        
        // Extract action
        const actionMatch = firstPage.match(/(ให้ถ้อยคำ|รายงาน|เบิกความ|ให้การ|แถลงการณ์)/i);
        if (actionMatch) {
            metadata.action = actionMatch[1];
        }
        
        // Extract receiver
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
        
        // Extract date
        const datePatterns = [
            /([๐-๙]{1,2}\s*(?:มกราคม|ม\.ค\.|กุมภาพันธ์|ก\.พ\.|มีนาคม|มี\.ค\.|เมษายน|เม\.ย\.|พฤษภา|พ\.ค\.|มิถุนายน|มิ\.ย\.|กรกฎาคม|ก\.ค\.|สิงหาคม|ส\.ค\.|กันยายน|ก\.ย\.|ตุลาคม|ต\.ค\.|พฤศจิกายน|พ\.ย\.|ธันวาคม|ธ\.ค\.)\s*[๐-๙]{4})/,
            /([0-9]{1,2}\s*(?:มกราคม|ม\.ค\.|กุมภาพันธ์|ก\.พ\.|มีนาคม|มี\.ค\.|เมษายน|เม\.ย\.|พฤษภา|พ\.ค\.|มิถุนายน|มิ\.ย\.|กรกฎาคม|ก\.ค\.|สิงหาคม|ส\.ค\.|กันยายน|ก\.ย\.|ตุลาคม|ต\.ค\.|พฤศจิกายน|พ\.ย\.|ธันวาคม|ธ\.ค\.)\s*[0-9]{4})/,
            /(วันที่\s*[๐-๙0-9]{1,2}[\/\-\s]+[๐-๙0-9]{1,2}[\/\-\s]+[๐-๙0-9]{2,4})/,
            /(เมื่อวันที่\s*[๐-๙0-9]{1,2}\s*(?:มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภา|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s*[๐-๙0-9]{4})/,
            /([๐-๙0-9]{1,2}\/[๐-๙0-9]{1,2}\/[๐-๙0-9]{2,4})/,
            /([๐-๙0-9]{1,2}\-[๐-๙0-9]{1,2}\-[๐-๙0-9]{2,4})/
        ];
        
        for (let pattern of datePatterns) {
            const dateMatch = firstPage.match(pattern);
            if (dateMatch && dateMatch[1]) {
                let extractedDate = dateMatch[1].trim();
                extractedDate = extractedDate.replace(/^(?:วันที่|เมื่อวันที่)\s*/, '');
                metadata.date = extractedDate;
                break;
            }
        }
        
        // Extract document number
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
        
        // Extract title
        const titleMatch = firstPage.match(/(เรื่อง\s+[^\n\r]{10,100})/);
        if (titleMatch && titleMatch[1]) {
            metadata.title = titleMatch[1].trim();
        }
        
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
    
    const validMetadata = Object.entries(documentMetadata)
        .filter(([key, value]) => value && value !== 'null');
    
    if (validMetadata.length === 0) {
        metadataSection.style.display = 'none';
        return;
    }
    
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
    
    if (metadata.name) {
        parts.push(metadata.name);
    }
    
    if (metadata.action) {
        parts.push(metadata.action);
    } else {
        parts.push('ให้ถ้อยคำ');
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

window.copySummary = async function() {
    const summaryText = document.querySelector('.summary-text');
    if (!summaryText) return;
    
    const text = summaryText.textContent;
    
    try {
        await navigator.clipboard.writeText(text);
        showSuccess('📋 คัดลอกประโยคสรุปสำเร็จ!');
        
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

// Close metadata section
if (closeMetadataBtn) {
    closeMetadataBtn.addEventListener('click', () => {
        metadataSection.style.display = 'none';
        showSuccess('✓ ปิดหน้าเกริ่นนำแล้ว');
    });
}

// ============================================
// EDITOR FUNCTIONS
// ============================================

// Toggle editor panel (now starts open, can be closed)
editorToggleBtn.addEventListener('click', () => {
    editorMode = !editorMode;
    
    if (editorMode) {
        // เปิด Editor
        editorPanel.classList.remove('hidden');
        editorToggleBtn.classList.remove('closed');
        editorToggleBtn.innerHTML = '<span>✏️</span> ปิด Editor';
    } else {
        // ปิด Editor
        editorPanel.classList.add('hidden');
        editorToggleBtn.classList.add('closed');
        editorToggleBtn.innerHTML = '<span>✏️</span> เปิด Editor';
    }
});

// Copy from original panel (plain text only - no formatting)
if (copyFromOriginalBtn) {
    copyFromOriginalBtn.addEventListener('click', () => {
        if (!fullOCRResult) {
            showError('ยังไม่มีข้อความต้นฉบับให้คัดลอก');
            return;
        }
        
        // Copy plain text only (no HTML/formatting)
        editorContent.textContent = fullOCRResult;
        
        // Apply default styling
        editorContent.style.fontSize = '26px';
        editorContent.style.fontFamily = "'TH Sarabun New', 'TH SarabunIT๙', 'Sarabun', sans-serif";
        editorContent.style.backgroundColor = '#ffffff';
        fontSizeEditor.value = '26px';
        
        showSuccess('✅ คัดลอกต้นฉบับมา Editor แล้ว (ข้อความล้วน ไม่มีสีหรือกรอบ)');
    });
}

// Editor formatting buttons
boldBtn.addEventListener('click', () => {
    document.execCommand('bold', false, null);
    boldBtn.classList.toggle('active');
});

italicBtn.addEventListener('click', () => {
    document.execCommand('italic', false, null);
    italicBtn.classList.toggle('active');
});

underlineBtn.addEventListener('click', () => {
    document.execCommand('underline', false, null);
    underlineBtn.classList.toggle('active');
});

// Font size change (apply to entire editor content)
fontSizeEditor.addEventListener('change', () => {
    editorContent.style.fontSize = fontSizeEditor.value;
    
    // Show confirmation
    showSuccess(`📏 เปลี่ยนขนาดตัวอักษรเป็น ${fontSizeEditor.value} แล้ว`);
});

// Font family change (apply to entire editor content)
fontFamilyEditor.addEventListener('change', () => {
    editorContent.style.fontFamily = fontFamilyEditor.value;
    
    // Show confirmation
    const fontName = fontFamilyEditor.options[fontFamilyEditor.selectedIndex].text;
    showSuccess(`🔤 เปลี่ยนฟอนต์เป็น ${fontName} แล้ว`);
});

// Text color change
textColorPicker.addEventListener('change', () => {
    document.execCommand('foreColor', false, textColorPicker.value);
});

// Background color change
bgColorPicker.addEventListener('change', () => {
    editorContent.style.backgroundColor = bgColorPicker.value;
});

// Copy edited content
copyEditedBtn.addEventListener('click', async () => {
    const editedText = editorContent.innerText;
    
    if (!editedText || editedText.trim().length === 0) {
        showError('ไม่มีข้อความที่แก้ไขให้คัดลอก');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(editedText);
        showSuccess(`📋 คัดลอกข้อความที่แก้ไขแล้วสำเร็จ! (${editedText.length} ตัวอักษร)`);
    } catch (error) {
        const temp = document.createElement('textarea');
        temp.value = editedText;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showSuccess(`📋 คัดลอกข้อความที่แก้ไขแล้วสำเร็จ! (${editedText.length} ตัวอักษร)`);
    }
});

// Reset editor content
resetEditorBtn.addEventListener('click', () => {
    if (confirm('คุณต้องการรีเซ็ต Editor เป็นหน้าว่างใช่หรือไม่?')) {
        editorContent.textContent = '👈 คัดลอกข้อความจากฝั่งซ้าย แล้วมาแก้ไขที่นี่...';
        editorContent.style.fontSize = '26px';
        editorContent.style.fontFamily = "'TH Sarabun New', 'TH SarabunIT๙', 'Sarabun', sans-serif";
        editorContent.style.backgroundColor = '#ffffff';
        fontSizeEditor.value = '26px';
        showSuccess('↺ รีเซ็ต Editor เรียบร้อย!');
    }
});

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
        formattedHTML = formatQAText(fullOCRResult, searchQuery);
    } else {
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
    
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    formatted = formatted.replace(/(ถาม)/gi, '<span class="qa-question-highlight">$1</span>');
    formatted = formatted.replace(/(ตอบ)/gi, '<span class="qa-answer-highlight">$1</span>');
    
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
// EXPORT FUNCTIONS
// ============================================

copyBtn.addEventListener('click', async () => {
    if (!fullOCRResult) {
        showError('ไม่มีข้อความให้คัดลอก');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(fullOCRResult);
        showSuccess('📋 คัดลอกทั้งหมดสำเร็จ!');
    } catch (error) {
        const temp = document.createElement('textarea');
        temp.value = fullOCRResult;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showSuccess('📋 คัดลอกทั้งหมดสำเร็จ!');
    }
});

downloadTxtBtn.addEventListener('click', () => {
    const useEditor = editorMode && editorContent.innerText.trim() && 
                      editorContent.innerText.trim() !== '👈 คัดลอกข้อความจากฝั่งซ้าย แล้วมาแก้ไขที่นี่...';
    
    const textToDownload = useEditor ? editorContent.innerText : fullOCRResult;
    
    if (!textToDownload) {
        showError('ไม่มีข้อความให้ดาวน์โหลด');
        return;
    }
    
    const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentFileName || 'ocr-result'}${useEditor ? '-edited' : ''}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess(`📝 ดาวน์โหลด TXT สำเร็จ!${useEditor ? ' (ฉบับแก้ไข)' : ''}`);
});

downloadWordBtn.addEventListener('click', () => {
    const useEditor = editorMode && editorContent.innerHTML.trim() && 
                      editorContent.innerText.trim() !== '👈 คัดลอกข้อความจากฝั่งซ้าย แล้วมาแก้ไขที่นี่...';
    
    let htmlContent = '';
    
    if (useEditor) {
        // Use editor content with formatting
        htmlContent = editorContent.innerHTML;
    } else {
        // Use original OCR result
        if (!fullOCRResult) {
            showError('ไม่มีข้อความให้ดาวน์โหลด');
            return;
        }
        htmlContent = fullOCRResult.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('');
    }
    
    // Get actual font size and family from editor (computed style)
    let fontSize = '26px';
    let fontFamily = "'TH Sarabun New', 'TH SarabunIT๙', 'Sarabun', sans-serif";
    
    if (useEditor) {
        // Get computed style from editor content
        const computedStyle = window.getComputedStyle(editorContent);
        fontSize = computedStyle.fontSize || fontSizeEditor.value || '26px';
        fontFamily = computedStyle.fontFamily || fontFamilyEditor.value || "'TH Sarabun New', 'TH SarabunIT๙', 'Sarabun', sans-serif";
        
        // Also try to get from dropdown if available
        if (fontSizeEditor.value) {
            fontSize = fontSizeEditor.value;
        }
        if (fontFamilyEditor.value) {
            fontFamily = fontFamilyEditor.value;
        }
    }
    
    const header = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>OCR Result</title>
<style>
body {
    font-family: ${fontFamily};
    font-size: ${fontSize};
    line-height: 1.8;
}
p {
    font-family: ${fontFamily};
    font-size: ${fontSize};
    line-height: 1.8;
    margin: 0.5em 0;
}
div {
    font-family: ${fontFamily};
    font-size: ${fontSize};
}
</style>
</head>
<body>`;
    
    const footer = '</body></html>';
    
    const html = header + htmlContent + footer;
    
    const blob = new Blob(['\ufeff', html], {
        type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentFileName || 'ocr-result'}${useEditor ? '-edited' : ''}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess(`📘 ดาวน์โหลด Word สำเร็จ! (${fontSize} TH Sarabun New${useEditor ? ' - ฉบับแก้ไข' : ''})`);
});

// ============================================
// OCR MORE PAGES (Keep Editor Content)
// ============================================

if (ocrMoreBtn) {
    ocrMoreBtn.addEventListener('click', () => {
        if (!selectedFile || !pdfDocument) {
            showError('ไม่มีไฟล์ให้ประมวลผล กรุณาเริ่มต้นใหม่');
            return;
        }
        
        console.log('📄+ กำลังเตรียม OCR หน้าเพิ่มเติม...');
        
        // Save current editor content temporarily
        const currentEditorContent = editorContent.innerHTML;
        const currentEditorText = editorContent.innerText;
        
        // Store in sessionStorage for recovery
        sessionStorage.setItem('editorBackup', currentEditorContent);
        sessionStorage.setItem('editorTextBackup', currentEditorText);
        
        // Hide result section, show page selector
        resultSection.classList.remove('active');
        pageSelectorSection.classList.add('active');
        
        showSuccess('💡 Editor ของคุณถูกบันทึกไว้แล้ว - เลือกหน้าที่ต้องการ OCR เพิ่มเติม');
    });
}

// ============================================
// REPROCESS BUTTON
// ============================================

const reprocessBtn = document.getElementById('reprocessBtn');
if (reprocessBtn) {
    reprocessBtn.addEventListener('click', async () => {
        if (!selectedFile || !pdfDocument) {
            showError('ไม่มีไฟล์ให้ประมวลผลใหม่');
            return;
        }
        
        console.log('🔄 กำลังประมวลผลใหม่...');
        
        // Hide result, show page selector
        resultSection.classList.remove('active');
        pageSelectorSection.classList.add('active');
        
        // DON'T reset editor - keep it open with existing content
        // User can continue editing while processing new pages
    });
}

// ============================================
// RESET
// ============================================

newBtn.addEventListener('click', () => {
    resetToUpload();
});

function resetToUpload() {
    selectedFile = null;
    pdfDocument = null;
    totalPages = 0;
    fullOCRResult = null;
    documentMetadata = null;
    searchMatches = [];
    currentMatchIndex = -1;
    currentFileName = '';
    qaMode = false;
    editorMode = true; // Keep editor mode true
    fileInput.value = '';
    fileName.textContent = '';
    fileSize.textContent = '';
    resultDisplay.innerHTML = '';
    editorContent.textContent = '👈 คัดลอกข้อความจากฝั่งซ้าย แล้วมาแก้ไขที่นี่...';
    editorContent.style.fontSize = '26px';
    editorContent.style.fontFamily = "'TH Sarabun New', 'TH SarabunIT๙', 'Sarabun', sans-serif";
    editorContent.style.backgroundColor = '#ffffff';
    fontSizeEditor.value = '26px';
    searchText.value = '';
    selectedPages.clear();
    visualPagesContainer.innerHTML = '';
    
    // Clear sessionStorage backup
    sessionStorage.removeItem('editorBackup');
    sessionStorage.removeItem('editorTextBackup');
    
    stopTimer();
    
    // Reset editor to open state
    editorPanel.classList.remove('hidden');
    editorToggleBtn.classList.remove('closed');
    editorToggleBtn.innerHTML = '<span>✏️</span> ปิด Editor';
    
    const qaToggleBtn = document.getElementById('qaToggleBtn');
    if (qaToggleBtn) {
        qaToggleBtn.style.background = '#64748b';
        qaToggleBtn.innerHTML = '<span>💬</span> โหมดถาม-ตอบ';
    }
    
    if (metadataSection) {
        metadataSection.style.display = 'none';
    }
    
    uploadSection.style.display = 'block';
    pageSelectorSection.classList.remove('active');
    progressSection.classList.remove('active');
    previewSection.classList.remove('active');
    resultSection.classList.remove('active');
    visualPageGrid.style.display = 'none';
    
    updateSearchCounter();
    hideError();
    hideSuccess();
}

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