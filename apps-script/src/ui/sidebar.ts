/**
 * Lit component for the main audit sidebar
 */

// @ts-nocheck
import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';

declare const google: any;

export class SheetBrainSidebar extends LitElement {
  static styles = css`
    :host {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
        sans-serif;
      --primary-color: #1f2937;
      --primary-hover: #111827;
      --accent-color: #0ea5e9;
      --error-color: #ef4444;
      --success-color: #10b981;
    }

    .sidebar-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 16px;
      background: #ffffff;
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
    }

    .sidebar-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--primary-color);
    }

    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .audit-button {
      padding: 10px 16px;
      background: var(--accent-color);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .audit-button:hover {
      background: #0284c7;
    }

    .audit-button:disabled {
      background: #cbd5e1;
      cursor: not-allowed;
    }

    .results-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .result-card {
      padding: 12px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .result-card.error {
      background: #fef2f2;
      border-color: #fecaca;
    }

    .result-card.success {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    .pill {
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid #d1d5db;
      background: #fff;
      color: #111827;
    }

    .pill.low {
      background: #ecfdf3;
      border-color: #bbf7d0;
      color: #166534;
    }

    .pill.medium {
      background: #fff7ed;
      border-color: #fed7aa;
      color: #9a3412;
    }

    .pill.high {
      background: #fef2f2;
      border-color: #fecaca;
      color: #991b1b;
    }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .formula-text {
      font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
        monospace;
      font-size: 12px;
      color: #374151;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .section-title {
      font-weight: 600;
      margin: 4px 0;
      color: #111827;
    }

    .list {
      margin: 0;
      padding-left: 16px;
      color: #374151;
      font-size: 13px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      text-align: center;
      color: #6b7280;
    }

    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .empty-state-text {
      font-size: 14px;
      margin-bottom: 16px;
    }

    .footer {
      display: flex;
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      margin-top: 12px;
    }

    .footer button {
      flex: 1;
      padding: 8px 12px;
      background: #f3f4f6;
      color: var(--primary-color);
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .footer button:hover {
      background: #e5e7eb;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #e5e7eb;
      border-top-color: var(--accent-color);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  @property({ type: String })
  sheetId = '';

  @property({ type: Boolean })
  isAuthenticated = false;

  @state()
  auditResults: any[] = [];

  @state()
  isLoading = false;

  @state()
  error: string | null = null;

  private backendBaseUrl: string | null = null;

  async connectedCallback() {
    super.connectedCallback();
    // Check authentication status
    // this.isAuthenticated = await this.checkAuth();
  }

  render() {
    return html`
      <div class="sidebar-container">
        <div class="sidebar-header">
          <h2>SheetBrain AI</h2>
          <button @click=${this.openSettings} title="Settings">⚙️</button>
        </div>

        <div class="sidebar-content">
          ${!this.isAuthenticated
            ? this.renderAuthPrompt()
            : this.renderAuditInterface()}
        </div>

        <div class="footer">
          <button @click=${this.openDocumentation}>Docs</button>
          <button @click=${this.openSettings}>Settings</button>
        </div>
      </div>
    `;
  }

  private renderAuthPrompt() {
    return html`
      <div class="empty-state">
        <div class="empty-state-icon">🔐</div>
        <div class="empty-state-text">Sign in to SheetBrain AI to get started</div>
        <button class="audit-button" @click=${this.handleLogin}>Sign In with Google</button>
      </div>
    `;
  }

  private renderAuditInterface() {
    if (this.isLoading) {
      return html`
        <div class="loading">
          <div class="spinner"></div>
          <span>Auditing formulas...</span>
        </div>
      `;
    }

    if (this.error) {
      return html`
        <div class="result-card error">
          <strong>Error:</strong> ${this.error}
          <button @click=${this.clearError} style="margin-top: 8px;">Dismiss</button>
        </div>
      `;
    }

    if (this.auditResults.length === 0) {
      return html`
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-text">Select cells and click "Audit" to analyze formulas</div>
          <button class="audit-button" @click=${this.startAudit}>Start Audit</button>
        </div>
      `;
    }

    return html`
      <div class="results-list">
        ${this.auditResults.map(
          (result) => html`
            <div class="result-card ${result.compliant ? 'success' : 'error'}">
              <div class="result-header">
                <strong>${result.cellAddress || 'Formula'}</strong>
                <span class="pill ${result.risk || 'low'}">${(result.risk || 'unknown').toUpperCase()}</span>
              </div>
              <div class="formula-text">${result.formula || 'No formula provided'}</div>
              <div>${result.compliant ? 'Compliant' : 'Needs attention'}</div>

              <div>
                <div class="section-title">Issues</div>
                ${result.issues && result.issues.length > 0
                  ? html`<ul class="list">${result.issues.map((i: string) => html`<li>${i}</li>`)}</ul>`
                  : html`<span>None</span>`}
              </div>

              <div>
                <div class="section-title">Recommendations</div>
                ${result.recommendations && result.recommendations.length > 0
                  ? html`<ul class="list">${result.recommendations.map((r: string) => html`<li>${r}</li>`)}</ul>`
                  : html`<span>None</span>`}
              </div>
            </div>
          `
        )}
      </div>
      <button class="audit-button" @click=${this.startAudit} style="margin-top: 12px;">
        Audit Again
      </button>
    `;
  }

  private async handleLogin() {
    try {
      const authUrl = await new Promise<string>((resolve, reject) => {
        // Google Apps Script calls need explicit success/failure handlers
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .getAuthorizationUrl();
      });

      window.open(authUrl, '_blank', 'width=600,height=600');
      this.isAuthenticated = true; // TODO: replace with post-auth message from server
    } catch (err) {
      this.error = 'Authentication failed. Please try again.';
    }
  }

  private async startAudit() {
    this.isLoading = true;
    this.error = null;

    try {
      const backendBaseUrl = await this.fetchBackendBaseUrl();
      const token = await this.ensureToken();

      const range = await new Promise<any>((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .getSelectedRange();
      });

      const context = await new Promise<any>((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .getSheetContext();
      });

      const response = await fetch(`${backendBaseUrl}/api/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ range: range.address, context }),
      });

      if (!response.ok) {
        throw new Error(`Audit failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.auditResults = data?.audits || [];
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unknown error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  private openSettings() {
    const settingsWindow = window.open('', 'settings', 'width=600,height=400');
    if (settingsWindow) {
      settingsWindow.document.write('<h2>SheetBrain AI Settings</h2><p>Settings coming soon...</p>');
    }
  }

  private openDocumentation() {
    window.open('https://docs.sheetbrain.ai', '_blank');
  }

  private getToken(): string {
    return localStorage.getItem('access_token') || '';
  }

  private async ensureToken(): Promise<string> {
    const existing = this.getToken();
    if (existing) return existing;

    const token = await new Promise<string>((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .getBackendToken();
    });

    localStorage.setItem('access_token', token);
    this.isAuthenticated = true;
    return token;
  }

  private async fetchBackendBaseUrl(): Promise<string> {
    if (this.backendBaseUrl) return this.backendBaseUrl;

    try {
      const baseUrl = await new Promise<string>((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .getBackendBaseUrl();
      });

      this.backendBaseUrl = baseUrl || 'http://localhost:3000';
    } catch (err) {
      this.backendBaseUrl = 'http://localhost:3000';
    }

    return this.backendBaseUrl;
  }

  private clearError() {
    this.error = null;
  }
}

if (!customElements.get('sheetbrain-sidebar')) {
  customElements.define('sheetbrain-sidebar', SheetBrainSidebar);
}
