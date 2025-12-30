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
export function initializeAuth(config: OAuthConfig): void {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('oauth_client_id', config.clientId);
  scriptProperties.setProperty('oauth_client_secret', config.clientSecret);
  scriptProperties.setProperty('oauth_redirect_uri', config.redirectUri);
  scriptProperties.setProperty('oauth_scopes', config.scopes.join(' '));
}

/**
 * Gets the authorization URL
 */
export function getAuthorizationUrl(): string {
  const properties = PropertiesService.getScriptProperties();
  const clientId = properties.getProperty('oauth_client_id');
  const redirectUri = properties.getProperty('oauth_redirect_uri');
  const scopes = properties.getProperty('oauth_scopes');

  const params = {
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
  };

  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value ?? '')}`)
    .join('&');

  return `https://accounts.google.com/o/oauth2/v2/auth?${queryString}`;
}

/**
 * Exchanges authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const properties = PropertiesService.getScriptProperties();
  const clientId = properties.getProperty('oauth_client_id');
  const clientSecret = properties.getProperty('oauth_client_secret');
  const redirectUri = properties.getProperty('oauth_redirect_uri');

  const payload = {
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  };

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post' as const,
    payload: payload,
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', options);
  const result = JSON.parse(response.getContentText());

  if (result.access_token) {
    // Store token securely
    const userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty('access_token', result.access_token);
    if (result.refresh_token) {
      userProperties.setProperty('refresh_token', result.refresh_token);
    }
    return result.access_token;
  }

  throw new Error('Failed to obtain access token: ' + response.getContentText());
}

/**
 * Gets the stored access token
 */
export function getAccessToken(): string | null {
  const userProperties = PropertiesService.getUserProperties();
  return userProperties.getProperty('access_token');
}

/**
 * Checks if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAccessToken() != null;
}

/**
 * Clears authentication tokens (logout)
 */
export function logout(): void {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty('access_token');
  userProperties.deleteProperty('refresh_token');
}
