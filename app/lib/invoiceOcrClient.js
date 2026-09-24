/**
 * Invoice OCR Client Helper
 * Optimizes invoice documents (PDFs & Images) in the browser before sending to /api/ai/parse-invoice.
 * - Converts PDF Page 1 into a crisp, lightweight JPEG (~200KB) using client-side PDF.js.
 * - Downscales high-resolution camera photos (5-20MB) to max 1600px JPEG (~200KB).
 * - Bypasses Vercel 4.5MB Serverless request payload limit completely.
 */

let pdfjsLoadingPromise = null;

function loadPdfJsScript() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (pdfjsLoadingPromise) return pdfjsLoadingPromise;

  pdfjsLoadingPromise = new Promise((resolve) => {
    // Check if script already exists in document
    const existing = document.querySelector('script[src*="pdf.min.js"]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(window.pdfjsLib);
        } else {
          resolve(null);
        }
      });
      existing.addEventListener('error', () => resolve(null));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      try {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(window.pdfjsLib);
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    script.onerror = () => {
      console.warn('Failed to load PDF.js from CDN, using fallback');
      resolve(null);
    };
    document.head.appendChild(script);
  });

  return pdfjsLoadingPromise;
}

export async function downscaleImageFile(file, maxWidth = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== 'string') return reject(new Error('Failed to read image'));

      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(result.includes(',') ? result.split(',')[1] : result);

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl.split(',')[1]);
        } catch {
          resolve(result.includes(',') ? result.split(',')[1] : result);
        }
      };
      img.onerror = () => resolve(result.includes(',') ? result.split(',')[1] : result);
      img.src = result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function renderPdfFirstPage(file, scale = 1.6, quality = 0.85) {
  try {
    const pdfjs = await loadPdfJsScript();
    if (!pdfjs) return null;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return dataUrl.split(',')[1];
  } catch (err) {
    console.warn('Client-side PDF page rendering warning:', err.message);
    return null;
  }
}

export async function prepareInvoiceForOcr(file) {
  if (!file) throw new Error('No file provided');

  // 1. Direct Image file
  if (file.type && file.type.startsWith('image/')) {
    try {
      const base64 = await downscaleImageFile(file, 1600, 0.85);
      return { fileData: base64, fileType: 'image/jpeg' };
    } catch {
      // Fallback below
    }
  }

  // 2. PDF file
  if (file.type === 'application/pdf' || (file.name && file.name.toLowerCase().endsWith('.pdf'))) {
    try {
      const pageImageBase64 = await renderPdfFirstPage(file, 1.6, 0.85);
      if (pageImageBase64) {
        return { fileData: pageImageBase64, fileType: 'image/jpeg' };
      }
    } catch {
      // Fallback below
    }
  }

  // 3. Fallback: read raw base64 data
  const rawBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const res = e.target?.result;
      if (typeof res === 'string') {
        resolve(res.includes(',') ? res.split(',')[1] : res);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return { fileData: rawBase64, fileType: file.type || 'application/pdf' };
}
