export async function loadInvoiceDocument(attachment, token, signal) {
  const response = await fetch(`/api/attachments/${encodeURIComponent(attachment.id)}?disposition=inline`, {
    headers: { 'x-lwa-token': token }, signal, cache: 'no-store',
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error('The uploaded file was not found. Please attach the invoice again.');
    if (response.status === 401 || response.status === 403) throw new Error('Unable to access this file. Please sign in again.');
    throw new Error('Could not load the invoice document. Please retry.');
  }
  let blob = await response.blob();
  if (!blob.size) throw new Error('The uploaded file is empty. Please attach the invoice again.');
  if (!blob.type || blob.type === 'application/octet-stream') {
    const extension = (attachment.file_name || '').split('.').pop().toLowerCase();
    const types = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
    const declaredType = attachment.file_type === 'application/octet-stream' ? '' : attachment.file_type;
    blob = new Blob([blob], { type: declaredType || types[extension] || blob.type });
  }
  return blob;
}
