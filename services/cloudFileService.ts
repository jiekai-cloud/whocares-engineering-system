
import { googleDriveService } from './googleDriveService';

const ASSETS_FOLDER_NAME = 'life_quality_photos';

class CloudFileService {
    private folderId: string | null = null;

    /**
     * 尋找或建立專用的專案照片資料夾
     */
    private async getOrCreateFolder(): Promise<string | null> {
        if (this.folderId) return this.folderId;

        try {
            const query = `name='${ASSETS_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
            const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`;

            // @ts-ignore - access private method for generic auth fetch
            const response = await googleDriveService.fetchWithAuth(searchUrl);
            const data = await response.json();

            if (data.files && data.files.length > 0) {
                this.folderId = data.files[0].id;
                return this.folderId;
            }

            // 建立資料夾
            const createUrl = 'https://www.googleapis.com/drive/v3/files';
            const metadata = {
                name: ASSETS_FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder'
            };

            // @ts-ignore
            const createRes = await googleDriveService.fetchWithAuth(createUrl, {
                method: 'POST',
                body: JSON.stringify(metadata),
                headers: { 'Content-Type': 'application/json' }
            });
            const folder = await createRes.json();
            this.folderId = folder.id;

            // 設定資料夾為任何人可讀 (繼承用)
            try {
                const permissionUrl = `https://www.googleapis.com/drive/v3/files/${this.folderId}/permissions`;
                // @ts-ignore
                await googleDriveService.fetchWithAuth(permissionUrl, {
                    method: 'POST',
                    body: JSON.stringify({
                        role: 'reader',
                        type: 'anyone'
                    }),
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (e) {
                console.warn('資料夾權限設定失敗:', e);
            }

            return this.folderId;
        } catch (e) {
            console.error('資料夾建立失敗:', e);
            return null;
        }
    }

    /**
     * 上傳檔案至雲端並取得公開連結
     */
    async uploadFile(file: File): Promise<{ id: string; url: string } | null> {
        const parentId = await this.getOrCreateFolder();
        if (!parentId) return null;

        try {
            const metadata = {
                name: `${Date.now()}_${file.name}`,
                parents: [parentId]
            };

            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";

            const reader = new FileReader();
            const fileContent: ArrayBuffer = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result as ArrayBuffer);
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });

            const metadataPart = [
                'Content-Type: application/json; charset=UTF-8\r\n\r\n',
                JSON.stringify(metadata),
                '\r\n'
            ].join('');

            const mediaPartHead = [
                `Content-Type: ${file.type}\r\n\r\n`
            ].join('');

            const body = new Blob([
                delimiter,
                metadataPart,
                delimiter,
                mediaPartHead,
                new Uint8Array(fileContent),
                close_delim
            ], { type: 'multipart/related; boundary=' + boundary });

            const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webContentLink,webViewLink';

            // @ts-ignore
            const response = await googleDriveService.fetchWithAuth(uploadUrl, {
                method: 'POST',
                body
            });

            if (!response.ok) throw new Error('Upload failed');

            const result = await response.json();

            // 設定權限為任何人可讀，確保跨帳號可視
            try {
                const permissionUrl = `https://www.googleapis.com/drive/v3/files/${result.id}/permissions`;
                // @ts-ignore
                await googleDriveService.fetchWithAuth(permissionUrl, {
                    method: 'POST',
                    body: JSON.stringify({
                        role: 'reader',
                        type: 'anyone'
                    }),
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (permError) {
                console.warn('權限設定失敗 (但不影響上傳):', permError);
            }

            return {
                id: result.id,
                url: `https://drive.google.com/thumbnail?id=${result.id}&sz=w1600`
            };
        } catch (e) {
            console.error('檔案上傳失敗:', e);
            return null;
        }
    }
}

export const cloudFileService = new CloudFileService();
