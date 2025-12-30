/**
 * API Service for communicating with SheetBrain backend
 */

interface RequestOptions {
  method?: GoogleAppsScript.URL_Fetch.HttpMethod;
  headers?: Record<string, string>;
  payload?: Record<string, unknown>;
  timeout?: number;
}

class APIClient {
  private baseUrl: string;
  private accessToken: string | null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.accessToken = PropertiesService.getUserProperties().getProperty('access_token');
  }

  /**
   * Makes an authenticated API request
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const fetchOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: options.method || 'get',
      headers,
      muteHttpExceptions: true,
      timeout: options.timeout || 30000,
    };

    if (options.payload) {
      fetchOptions.payload = JSON.stringify(options.payload);
    }

    const response = UrlFetchApp.fetch(url, fetchOptions);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode < 200 || responseCode >= 300) {
      throw new Error(`API Error ${responseCode}: ${responseText}`);
    }

    return JSON.parse(responseText) as T;
  }

  /**
   * Submits a formula for audit
   */
  async submitAudit(range: string, context: Record<string, unknown>) {
    return this.request('/api/audit', {
      method: 'post',
      payload: {
        range,
        context,
      },
    });
  }

  /**
   * Uploads a policy document
   */
  async uploadDocument(file: GoogleAppsScript.Base.Blob, filename: string) {
    const boundary = '----SheetBrainBoundary';
    const preamble = Utilities.newBlob(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/pdf\r\n\r\n`,
      'text/plain'
    ).getBytes();
    const closing = Utilities.newBlob(`\r\n--${boundary}--`, 'text/plain').getBytes();

    const payload = ([] as number[]).concat(preamble, file.getBytes(), closing);

    return UrlFetchApp.fetch(`${this.baseUrl}/api/v1/ingest`, {
      method: 'post',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
      muteHttpExceptions: true,
    });
  }
}

// Export singleton instance
export const apiClient = new APIClient(
  PropertiesService.getScriptProperties().getProperty('api_base_url') ||
    'https://api.sheetbrain.ai'
);

export { APIClient };
