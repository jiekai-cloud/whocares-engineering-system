
/**
 * Google Drive 同步服務 - 生活品質工程管理系統專用 (自動化版本)
 */

// 已預設內建 Client ID，使用者無需手動輸入
export const DEFAULT_CLIENT_ID = '1046264694728-lkce3am9s8sbu92hk0qgc4qo8b663kdu.apps.googleusercontent.com';
export const BACKUP_FILENAME = 'whocares_system_data.json';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

class GoogleDriveService {
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private isInitialized: boolean = false;
  private lastErrorStatus: string | null = null;
  private currentFilename: string = BACKUP_FILENAME;

  setFilename(filename: string) {
    this.currentFilename = filename;
    console.log(`[Drive] Switched context to: ${this.currentFilename}`);
  }

  async init(clientId: string = DEFAULT_CLIENT_ID) {
    return new Promise<void>((resolve, reject) => {
      // @ts-ignore
      const google = window.google;
      if (!google || !google.accounts) {
        console.error('Google SDK 尚未載入');
        return reject('SDK_NOT_LOADED');
      }

      try {
        // 嘗試從 localStorage 恢復 token
        const savedToken = localStorage.getItem('bt_google_access_token');
        if (savedToken) {
          this.accessToken = savedToken;
          console.log('[Drive] Restored access token from localStorage');
        }

        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (response: any) => {
            if (response.error !== undefined) {
              console.error('OAuth Error:', response.error);
              reject(response);
            }
            this.accessToken = response.access_token;
            // 保存 token 到 localStorage
            if (this.accessToken) {
              localStorage.setItem('bt_google_access_token', this.accessToken);
              console.log('[Drive] Saved access token to localStorage');
            }
            this.isInitialized = true;
            resolve();
          },
        });
        this.isInitialized = true;
        resolve();
      } catch (err) {
        console.error('Drive Init Failed:', err);
        reject(err);
      }
    });
  }

  async authenticate(prompt: 'none' | 'consent' = 'none', isBackground: boolean = false) {
    if (isBackground && prompt === 'consent') {
      throw new Error('AUTH_INTERACTION_REQUIRED');
    }
    return new Promise<string>((resolve, reject) => {
      if (!this.tokenClient) {
        // 如果尚未初始化，先執行預設初始化
        this.init().then(() => this.requestToken(prompt, resolve, reject, isBackground)).catch(reject);
      } else {
        this.requestToken(prompt, resolve, reject, isBackground);
      }
    });
  }

  private requestToken(prompt: string, resolve: any, reject: any, isBackground: boolean = false) {
    this.tokenClient.callback = (response: any) => {
      if (response.error) {
        if (prompt === 'none') {
          if (isBackground) return reject(new Error('AUTH_INTERACTION_REQUIRED'));
          return this.authenticate('consent').then(resolve).catch(reject);
        }
        return reject(response);
      }
      this.accessToken = response.access_token;
      // 保存 token 到 localStorage
      if (this.accessToken) {
        localStorage.setItem('bt_google_access_token', this.accessToken);
        console.log('[Drive] Saved access token to localStorage');
      }
      resolve(this.accessToken!);
    };
    this.tokenClient.requestAccessToken({ prompt: prompt === 'none' ? '' : 'consent' });
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}, isBackground: boolean = false) {
    if (!this.accessToken) {
      await this.authenticate('none', isBackground);
    }

    let res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (res.status === 401) {
      this.accessToken = null;
      localStorage.removeItem('bt_google_access_token'); // 清除無效的 token
      console.log('[Drive] Token expired, cleared from localStorage');
      await this.authenticate(isBackground ? 'none' : 'consent', isBackground);
      res = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
    }
    return res;
  }

  async getFileMetadata(isBackground: boolean = false) {
    try {
      const existingFile = await this.findBackupFile(isBackground);
      if (!existingFile) return null;
      // Add timestamp to prevent caching
      const url = `https://www.googleapis.com/drive/v3/files/${existingFile.id}?fields=id,name,modifiedTime,size&_=${Date.now()}`;
      const response = await this.fetchWithAuth(url, {}, isBackground);
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      console.error('Get Metadata Error:', e);
      return null;
    }
  }

  async findBackupFile(isBackground: boolean = false) {
    try {
      const url = `https://www.googleapis.com/drive/v3/files?q=name='${this.currentFilename}' and trashed=false&fields=files(id,name)`;
      const response = await this.fetchWithAuth(url, {}, isBackground);
      const data = await response.json();
      return data.files && data.files.length > 0 ? data.files[0] : null;
    } catch (e) {
      console.error('Find File Error:', e);
      return null;
    }
  }

  async saveToCloud(data: any, isBackground: boolean = false) {
    if (!this.isInitialized) await this.init();
    this.lastErrorStatus = null;
    try {
      const existingFile = await this.findBackupFile();
      const metadata = {
        name: this.currentFilename,
        mimeType: 'application/json'
      };
      const fileContent = JSON.stringify({
        ...data,
        cloudSyncTimestamp: new Date().toISOString()
      });

      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      // 使用 Blob 構建 multipart body 以確保瀏覽器正確處理換行與編碼
      const parts = [
        delimiter,
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        JSON.stringify(metadata),
        delimiter,
        'Content-Type: application/json\r\n\r\n',
        fileContent,
        close_delim
      ];

      const body = new Blob(parts, { type: 'multipart/related; boundary=' + boundary });

      let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      let method = 'POST';

      if (existingFile) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
        method = 'PATCH';
      }

      console.log(`[Drive] Syncing: ${method} to ${this.currentFilename} (BG: ${isBackground})`);
      const response = await this.fetchWithAuth(url, {
        method,
        body,
        headers: {
          // 注意：fetch 會自動處理 Blob 的 Content-Length，但我們需要手動設定 Content-Type 的 boundary
        }
      }, isBackground);

      if (!response.ok) {
        this.lastErrorStatus = `${response.status}`;
        const errorText = await response.text();
        console.error('Drive API Error:', response.status, errorText);

        // 如果是 403，通常是授權或網域限制
        if (response.status === 403) {
          console.warn('權限不足(403): 請確認 Google Cloud Console 是否已將此網域加入「授權的 JavaScript 來源」。');
        }
        return false;
      }

      // 新增：自動設定檔案權限為「其他人可讀」，以便免登入讀取
      // 只有在是新建立檔案或是明確要求時才需要做，但為了保險起見，每次成功存檔後都確保一次權限
      if (response.ok) {
        try {
          const result = await response.json();
          const fileId = result.id || existingFile?.id;

          if (fileId) {
            const permissionUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;
            await this.fetchWithAuth(permissionUrl, {
              method: 'POST',
              body: JSON.stringify({
                role: 'reader',
                type: 'anyone'
              }),
              headers: { 'Content-Type': 'application/json' }
            }, isBackground);
            console.log('[Drive] Public read permission set successfully.');
          }
        } catch (permError) {
          console.warn('[Drive] Failed to set public permission (might already exist or scopes issue):', permError);
        }
      }

      console.log('[Drive] Sync Successful');
      return true;
    } catch (err) {
      console.error('Google Drive Sync Exception:', err);
      this.lastErrorStatus = 'EXC';
      return false;
    }
  }

  // 匯出資料為 JSON 檔案供手動下載
  exportAsFile(data: any) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  getLastErrorStatus() {
    return this.lastErrorStatus;
  }

  async loadFromCloud(isBackground: boolean = false): Promise<any | null> {
    if (!this.isInitialized) await this.init();
    try {
      const existingFile = await this.findBackupFile(isBackground);
      if (!existingFile) return null;
      const url = `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`;
      const response = await this.fetchWithAuth(url, {}, isBackground);
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.error('Load from Drive failed:', err);
      return null;
    }
  }
}

export const googleDriveService = new GoogleDriveService();
