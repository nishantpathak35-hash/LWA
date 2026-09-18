import crypto from 'node:crypto';

/**
 * Encodes a string or buffer into base64url format.
 */
function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Generates an OAuth2 JWT Assertion for a Google Cloud Service Account
 * and exchanges it for a short-lived access token with drive.file scope.
 */
export async function getGoogleAccessToken({ clientEmail, privateKey }) {
  if (!clientEmail || !privateKey) {
    throw new Error('Google Service Account email and private key are required');
  }

  // Normalize private key: handle escaped \n in env strings
  const formattedKey = privateKey.includes('\\n')
    ? privateKey.replace(/\\n/g, '\n')
    : privateKey;

  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = base64UrlEncode(signer.sign(formattedKey));

  const assertion = `${unsignedToken}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorDetail = errorText;
    try {
      const parsed = JSON.parse(errorText);
      errorDetail = parsed.error_description || parsed.error || errorText;
    } catch {
      // ignore
    }
    throw new Error(`Google OAuth2 Token exchange failed: ${errorDetail}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Tests access to a Google Drive folder and verifies whether files can be placed in it.
 */
export async function testDriveFolderAccess({ clientEmail, privateKey, folderId }) {
  if (!folderId) {
    throw new Error('Google Drive Folder ID is required');
  }

  const accessToken = await getGoogleAccessToken({ clientEmail, privateKey });

  // Get folder metadata
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType,capabilities`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    let detail = errText;
    try {
      const parsed = JSON.parse(errText);
      detail = parsed.error?.message || errText;
    } catch {
      // ignore
    }
    throw new Error(`Cannot access Google Drive folder (${res.status}): ${detail}. Ensure the folder is shared with ${clientEmail} as Editor.`);
  }

  const folderData = await res.json();
  const canAddChildren = folderData.capabilities?.canAddChildren !== false;

  return {
    success: true,
    folderId: folderData.id,
    folderName: folderData.name,
    canWrite: canAddChildren
  };
}

/**
 * Uploads a JSON backup payload to Google Drive using multipart upload.
 */
export async function uploadBackupToGoogleDrive({
  clientEmail,
  privateKey,
  folderId,
  fileName,
  fileContent
}) {
  if (!folderId) {
    throw new Error('Target Google Drive Folder ID is required');
  }

  const accessToken = await getGoogleAccessToken({ clientEmail, privateKey });

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/json',
    description: 'Automated database backup from Luxeworx Atelier Payment Tracking System'
  };

  const boundary = `-------LWA_BACKUP_BOUNDARY_${Date.now()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const contentStr = typeof fileContent === 'string' ? fileContent : JSON.stringify(fileContent, null, 2);

  const multipartBody = Buffer.concat([
    Buffer.from(
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n'
    ),
    Buffer.from(contentStr, 'utf8'),
    Buffer.from(closeDelimiter)
  ]);

  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,webViewLink,webContentLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(multipartBody.length)
    },
    body: multipartBody
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    let detail = errText;
    try {
      const parsed = JSON.parse(errText);
      detail = parsed.error?.message || errText;
    } catch {
      // ignore
    }
    throw new Error(`Google Drive upload failed (${uploadRes.status}): ${detail}`);
  }

  const result = await uploadRes.json();
  return {
    success: true,
    fileId: result.id,
    fileName: result.name,
    size: result.size,
    webViewLink: result.webViewLink
  };
}
