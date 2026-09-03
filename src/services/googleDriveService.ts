export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
}

const DRIVE_FOLDER_NAME = 'CNS_Equipment_Backups';

/**
 * Find or create the default app backup folder on Google Drive
 */
export async function getOrCreateAppFolder(accessToken: string): Promise<string> {
  // Search for existing folder
  const query = encodeURIComponent(`name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!searchRes.ok) {
    throw new Error(`Không thể tìm thư mục Google Drive (${searchRes.statusText})`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  if (!createRes.ok) {
    throw new Error(`Khởi tạo thư mục ${DRIVE_FOLDER_NAME} thất bại`);
  }

  const folderData = await createRes.json();
  return folderData.id;
}

/**
 * List backup files in Google Drive folder
 */
export async function listDriveBackups(accessToken: string): Promise<DriveFileItem[]> {
  const folderId = await getOrCreateAppFolder(accessToken);
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,createdTime,modifiedTime,size,webViewLink)&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    throw new Error(`Lỗi tải danh sách tệp Google Drive (${res.statusText})`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Upload a text/JSON/base64 file to Google Drive
 */
export async function uploadToDrive(
  accessToken: string,
  fileName: string,
  content: string | Blob,
  mimeType: string = 'application/json'
): Promise<DriveFileItem> {
  const folderId = await getOrCreateAppFolder(accessToken);

  const metadata = {
    name: fileName,
    mimeType: mimeType,
    parents: [folderId]
  };

  const fileBlob = typeof content === 'string' 
    ? new Blob([content], { type: mimeType })
    : content;

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', fileBlob);

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,createdTime,modifiedTime,size';

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: formData
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lỗi tải tệp lên Google Drive: ${res.statusText} (${errText})`);
  }

  return await res.json();
}

/**
 * Download file content from Google Drive
 */
export async function downloadFromDrive(accessToken: string, fileId: string): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    throw new Error(`Lỗi tải tệp từ Google Drive (${res.statusText})`);
  }

  return await res.text();
}

/**
 * Delete a file from Google Drive (Mandatory user confirmation check should be performed by caller)
 */
export async function deleteFromDrive(accessToken: string, fileId: string): Promise<boolean> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(`Lỗi xóa tệp Google Drive (${res.statusText})`);
  }

  return true;
}
