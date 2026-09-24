/**
 * Invoice OCR Client Helper
 * Optimizes invoice documents (PDFs & Images) in the browser before sending to /api/ai/parse-invoice.
 * - Converts PDF first and last pages into a crisp, lightweight JPEG (~200KB) using client-side PDF.js.
 * - Downscales high-resolution camera photos (5-20MB) to max 1600px JPEG (~200KB).
 * - Bounds raw-file fallback to avoid oversized server requests.
 */

let pdfjsLoadingPromise = null;

function loadPdfJsScript() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (pdfjsLoadingPromise) return pdfjsLoadingPromise;

  pdfjsLoadingPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    let finished = false;
    const finish = value => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (!value) { script.remove(); pdfjsLoadingPromise = null; }
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), 8000);
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      finish(window.pdfjsLib || null);
    };
    script.onerror = () => finish(null);
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
          if (!ctx) return reject(new Error('Image canvas unavailable'));

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl.split(',')[1]);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Unsupported or damaged image'));
      img.src = result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function renderInvoicePages(file) {
  const pdfjs = await loadPdfJsScript();
  if (!pdfjs) return null;
  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const timer = setTimeout(() => { void task.destroy(); }, 15000);
  try {
    const pdf = await task.promise;
    const pages = [...new Set([1, pdf.numPages])];
    const images = [];
    for (const pageNumber of pages) {
      const page = await pdf.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2, 1800 / Math.max(base.width, base.height)) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Unable to render invoice');
      await page.render({ canvasContext: ctx, viewport, background: 'white' }).promise;
      images.push(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
      page.cleanup();
      canvas.width = 0; canvas.height = 0;
    }
    return { fileData: images[0], additionalImages: images.slice(1), fileType: 'image/jpeg' };
  } finally {
    clearTimeout(timer);
    await task.destroy();
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
      const rendered = await renderInvoicePages(file);
      if (rendered) return rendered;
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

  if (rawBase64.length > 3500000) throw new Error('Document is too large to scan. Try a smaller PDF or a clear image.');
  return { fileData: rawBase64, fileType: file.type || 'application/pdf' };
}
