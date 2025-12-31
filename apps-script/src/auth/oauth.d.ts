/**
 * Google OAuth 2.0 Flow for SheetBrain AI
 */
interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
}
/**
 * Initializes OAuth authentication
 */
export declare function initializeAuth(config: OAuthConfig): void;
/**
 * Gets the authorization URL
 */
export declare function getAuthorizationUrl(): string;
/**
 * Exchanges authorization code for access token
 */
export declare function exchangeCodeForToken(code: string): Promise<string>;
/**
 * Gets the stored access token
 */
export declare function getAccessToken(): string | null;
/**
 * Checks if user is authenticated
 */
export declare function isAuthenticated(): boolean;
/**
 * Clears authentication tokens (logout)
 */
export declare function logout(): void;
export {};
//# sourceMappingURL=oauth.d.ts.map