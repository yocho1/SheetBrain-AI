/**
 * API Service for communicating with SheetBrain backend
 */
interface RequestOptions {
    method?: GoogleAppsScript.URL_Fetch.HttpMethod;
    headers?: Record<string, string>;
    payload?: Record<string, unknown>;
    timeout?: number;
}
declare class APIClient {
    private baseUrl;
    private accessToken;
    constructor(baseUrl: string);
    /**
     * Makes an authenticated API request
     */
    request<T>(endpoint: string, options?: RequestOptions): Promise<T>;
    /**
     * Submits a formula for audit
     */
    submitAudit(range: string, context: Record<string, unknown>): Promise<unknown>;
    /**
     * Uploads a policy document
     */
    uploadDocument(file: GoogleAppsScript.Base.Blob, filename: string): Promise<GoogleAppsScript.URL_Fetch.HTTPResponse>;
}
export declare const apiClient: APIClient;
export { APIClient };
//# sourceMappingURL=api.d.ts.map