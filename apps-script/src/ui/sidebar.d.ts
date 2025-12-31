/**
 * Lit component for the main audit sidebar
 */
import { LitElement } from 'lit';
export declare class SheetBrainSidebar extends LitElement {
    static styles: import("lit").CSSResult;
    sheetId: string;
    isAuthenticated: boolean;
    auditResults: any[];
    isLoading: boolean;
    error: string | null;
    private backendBaseUrl;
    connectedCallback(): Promise<void>;
    render(): import("lit").TemplateResult<1>;
    private renderAuthPrompt;
    private renderAuditInterface;
    private handleLogin;
    private startAudit;
    private openSettings;
    private openDocumentation;
    private getToken;
    private ensureToken;
    private fetchBackendBaseUrl;
    private clearError;
}
//# sourceMappingURL=sidebar.d.ts.map