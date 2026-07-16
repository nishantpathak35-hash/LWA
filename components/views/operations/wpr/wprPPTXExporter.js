/**
 * Generates and downloads a Weekly Progress Report (WPR) as a PowerPoint file
 * by modifying the provided template presentation and keeping only the relevant slides.
 */
export async function exportWPRToPPTX(wpr) {
  // Expose JSZip on window for runtime resolution
  if (typeof window !== 'undefined') {
    const JSZipModule = (await import('jszip')).default;
    window.JSZip = JSZipModule;
  }

  // 1. Fetch the template PPTX file from the public folder
  const response = await fetch('/Weekly Progress Report Dentons Link legal.pptx');
  if (!response.ok) {
    throw new Error('Failed to fetch the PPTX template file from server.');
  }
  const arrayBuffer = await response.arrayBuffer();

  // 2. Load the ZIP file
  const zip = await window.JSZip.loadAsync(arrayBuffer);

  // 3. Define the slides to keep:
  // Slide 1: Cover
  // Slide 5: Procurement Tracker
  // Slide 9: Render vs Actual comparison (only if at least one image is uploaded)
  const slidesToKeep = [1, 5];
  const hasImages = !!(wpr.render_image_url || wpr.actual_image_url);
  if (hasImages) {
    slidesToKeep.push(9);
  }

  const parser = new window.DOMParser();
  const serializer = new window.XMLSerializer();

  // A. Modify [Content_Types].xml to keep only the overrides for slides to keep
  const contentTypesFile = zip.file('[Content_Types].xml');
  if (contentTypesFile) {
    const content = await contentTypesFile.async('text');
    const doc = parser.parseFromString(content, 'application/xml');
    const overrides = doc.getElementsByTagName('Override');
    for (let i = overrides.length - 1; i >= 0; i--) {
      const partName = overrides[i].getAttribute('PartName') || '';
      const slideMatch = partName.match(/\/ppt\/slides\/slide(\d+)\.xml/);
      const notesMatch = partName.match(/\/ppt\/notesSlides\/notesSlide(\d+)\.xml/);
      
      if (slideMatch) {
        const slideNum = parseInt(slideMatch[1]);
        if (!slidesToKeep.includes(slideNum)) {
          overrides[i].parentNode.removeChild(overrides[i]);
        }
      } else if (notesMatch) {
        const slideNum = parseInt(notesMatch[1]);
        if (!slidesToKeep.includes(slideNum)) {
          overrides[i].parentNode.removeChild(overrides[i]);
        }
      }
    }
    zip.file('[Content_Types].xml', serializer.serializeToString(doc));
  }

  // B. Modify ppt/_rels/presentation.xml.rels to filter Slide relationships
  const presRelsFile = zip.file('ppt/_rels/presentation.xml.rels');
  let rIdsToKeep = [];
  if (presRelsFile) {
    const content = await presRelsFile.async('text');
    const doc = parser.parseFromString(content, 'application/xml');
    const relationships = doc.getElementsByTagName('Relationship');
    for (let i = relationships.length - 1; i >= 0; i--) {
      const target = relationships[i].getAttribute('Target') || '';
      const type = relationships[i].getAttribute('Type') || '';
      const rId = relationships[i].getAttribute('Id');
      
      if (type.includes('officeDocument') && type.includes('slide') && !type.includes('slideMaster')) {
        const match = target.match(/slides\/slide(\d+)\.xml/);
        if (match) {
          const slideNum = parseInt(match[1]);
          if (slidesToKeep.includes(slideNum)) {
            rIdsToKeep.push(rId);
          } else {
            relationships[i].parentNode.removeChild(relationships[i]);
          }
        }
      }
    }
    zip.file('ppt/_rels/presentation.xml.rels', serializer.serializeToString(doc));
  }

  // C. Modify ppt/presentation.xml to remove references to deleted slides
  const presFile = zip.file('ppt/presentation.xml');
  if (presFile) {
    const content = await presFile.async('text');
    const doc = parser.parseFromString(content, 'application/xml');
    const sldIds = doc.getElementsByTagName('p:sldId');
    for (let i = sldIds.length - 1; i >= 0; i--) {
      const rId = sldIds[i].getAttribute('r:id');
      if (!rIdsToKeep.includes(rId)) {
        sldIds[i].parentNode.removeChild(sldIds[i]);
      }
    }
    zip.file('ppt/presentation.xml', serializer.serializeToString(doc));
  }

  // D. Delete the unused slide files and their relations from the zip
  for (let i = 1; i <= 24; i++) {
    if (!slidesToKeep.includes(i)) {
      zip.remove(`ppt/slides/slide${i}.xml`);
      zip.remove(`ppt/slides/_rels/slide${i}.xml.rels`);
      zip.remove(`ppt/notesSlides/notesSlide${i}.xml`);
      zip.remove(`ppt/notesSlides/_rels/notesSlide${i}.xml.rels`);
    }
  }

  // 4. Modify text in slide1.xml (Cover Slide)
  const slide1File = zip.file('ppt/slides/slide1.xml');
  if (slide1File) {
    let content = await slide1File.async('text');
    // Replace Project Name
    content = content.replace('Dentons Link Legal', wpr.project || 'Unknown Project');
    // Replace Dates
    content = content.replace('Weekly Progress Report - ( 20 ', `Weekly Progress Report - ( ${wpr.week_start || ''} `);
    content = content.replace('January 2026', 'to');
    content = content.replace(' - 27 January 2026)', ` ${wpr.week_end || ''} )`);
    zip.file('ppt/slides/slide1.xml', content);
  }

  // 5. Fetch and replace the user's Render and Actual images for Slide 9 (if kept)
  if (hasImages) {
    const transparentPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const renderBuffer = wpr.render_image_url 
      ? await fetchImageAsBuffer(wpr.render_image_url)
      : await fetchImageAsBuffer(transparentPng);
      
    const actualBuffer = wpr.actual_image_url 
      ? await fetchImageAsBuffer(wpr.actual_image_url)
      : await fetchImageAsBuffer(transparentPng);

    if (renderBuffer) {
      zip.file('ppt/media/image23.png', renderBuffer);
    }
    if (actualBuffer) {
      zip.file('ppt/media/image20.jpg', actualBuffer);
    }
  }

  // 6. Generate PPTX and download it
  const outputBuffer = await zip.generateAsync({ type: 'blob' });
  const safeProjectName = (wpr.project || 'project').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `WPR_${safeProjectName}_${wpr.week_start || ''}_to_${wpr.week_end || ''}.pptx`;

  // Trigger download in browser
  const link = document.createElement('a');
  link.href = URL.createObjectURL(outputBuffer);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function fetchImageAsBuffer(url) {
  if (!url) return null;
  try {
    if (url.startsWith('data:')) {
      const base64 = url.split(',')[1];
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch (e) {
    console.error('Failed to fetch image:', url, e);
    return null;
  }
}
