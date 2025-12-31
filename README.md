<div align="center">
  
# 🧠 SheetBrain AI

### AI-Powered Formula Auditor for Google Sheets

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com)

**Intelligent formula auditing with AI-powered insights, policy compliance checks, and real-time recommendations**

[🚀 Live Demo](https://sheetbrain-ai.vercel.app) • [📖 Documentation](#documentation) • [🐛 Report Bug](https://github.com/yocho1/SheetBrain-AI/issues)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Deployment](#-deployment)
- [Usage](#-usage)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**SheetBrain AI** is an intelligent Google Sheets add-on that automatically audits spreadsheet formulas using advanced AI models. It analyzes formulas for compliance, best practices, potential errors, and performance issues—providing actionable recommendations in real-time.

### Why SheetBrain AI?

- ✅ **Automated Compliance** - Enforce organizational policies across all spreadsheets
- 🔍 **Error Detection** - Catch circular references, division by zero, and logic errors
- 📊 **Performance Optimization** - Identify slow formulas and suggest faster alternatives
- 🤖 **AI-Powered Analysis** - Leverages Claude 3.5 Sonnet via OpenRouter for intelligent insights
- 🎯 **Risk Assessment** - Categorizes formulas by risk level (low/medium/high)
- 📝 **Contextual Recommendations** - Provides specific, actionable improvement suggestions

---

## ✨ Key Features

### 🎯 Smart Formula Auditing

- **Real-time Analysis** - Instant feedback on formula quality and compliance
- **Multi-Formula Support** - Audit entire ranges in a single request
- **Context-Aware** - Understands sheet purpose, department, and organizational context
- **Policy Enforcement** - Custom policy rules with default best practices

### 🛡️ Security & Authentication

- **Clerk Integration** - Enterprise-grade authentication
- **JWT Tokens** - Secure API access with 15-minute access tokens
- **Organization Support** - Multi-tenant architecture with org-level policies
- **Rate Limiting** - 100 requests/minute per user

### 📊 Comprehensive Results

- **Compliance Status** - Clear pass/fail indicators for each formula
- **Risk Scoring** - Low, medium, high risk classification
- **Issue Tracking** - Detailed list of problems found
- **Recommendations** - Specific suggestions for improvement
- **Performance Metrics** - Audit duration and token usage

### 🎨 Modern UI

- **Google Sheets Integration** - Native sidebar interface
- **Responsive Design** - Clean, intuitive user experience
- **Visual Indicators** - Color-coded risk levels and status badges
- **Real-time Feedback** - Loading states and progress indicators

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Google Sheets  │
│    Add-on UI    │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────────────────────┐
│      Vercel (Backend)               │
│  ┌──────────────────────────────┐   │
│  │   Next.js 15 App Router      │   │
│  │  ┌────────┐    ┌──────────┐  │   │
│  │  │ Auth   │    │  Audit   │  │   │
│  │  │  API   │───▶│   API    │  │   │
│  │  └────────┘    └──────────┘  │   │
│  │       │              │        │   │
│  │       ▼              ▼        │   │
│  │  ┌────────┐    ┌──────────┐  │   │
│  │  │ Clerk  │    │OpenRouter│  │   │
│  │  │  JWT   │    │ (Claude) │  │   │
│  │  └────────┘    └──────────┘  │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Data Flow

1. **User Action** - Select formulas in Google Sheets
2. **Authentication** - Apps Script obtains JWT token via debug-login
3. **Audit Request** - Send formulas + context to `/api/audit`
4. **AI Processing** - OpenRouter analyzes with Claude 3.5 Sonnet
5. **Response** - Structured results with compliance, risks, recommendations
6. **Display** - Render results in sidebar with visual indicators

---

## 🛠️ Tech Stack

### Backend

- **Framework** - [Next.js 15](https://nextjs.org/) (App Router)
- **Language** - [TypeScript 5.x](https://www.typescriptlang.org/)
- **Authentication** - [Clerk](https://clerk.com/) with JWT
- **AI/LLM** - [OpenRouter](https://openrouter.ai/) + [Anthropic SDK](https://www.anthropic.com/)
- **Deployment** - [Vercel](https://vercel.com/) (Portland, pdx1)
- **Package Manager** - [pnpm 10.x](https://pnpm.io/)

### Frontend (Apps Script)

- **Platform** - [Google Apps Script](https://developers.google.com/apps-script)
- **Build Tool** - [Webpack 5](https://webpack.js.org/)
- **Language** - TypeScript compiled to ES5
- **Deployment** - [clasp](https://github.com/google/clasp)

### Key Dependencies

- `@anthropic-ai/sdk` - Claude AI integration
- `jose` - JWT handling
- `next` - React framework
- `typescript` - Type safety
- `webpack` - Module bundler

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **pnpm** 10.x or higher
- **Google Account** with Apps Script enabled
- **Vercel Account** (for deployment)
- **API Keys**:
  - Clerk API key
  - OpenRouter API key

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yocho1/SheetBrain-AI.git
cd SheetBrain-AI
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Configure environment variables**

```bash
cd backend
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Required
CLERK_SECRET_KEY=sk_test_xxx...
SESSION_SECRET=your-32-char-secret
OPENROUTER_API_KEY=sk-or-v1-xxx...
LLM_PROVIDER=openrouter
STRICT_AUDIT=true

# Optional
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NODE_ENV=development
```

4. **Start development server**

```bash
pnpm dev
```

Backend will run at `http://localhost:3000`

### Testing the API

**PowerShell:**

```powershell
# Get JWT token
$jwt = (Invoke-RestMethod -Uri "http://localhost:3000/api/auth/debug-login" -Method Post -Body (@{
  userId="test_user"
  email="test@sheetbrain.com"
  orgId="test_org"
  role="editor"
} | ConvertTo-Json) -ContentType "application/json").accessToken

# Test audit endpoint
$body = @{
  range = "A1:A3"
  context = @{
    sheetName="Sheet1"
    range="A1:A3"
    organization="Test Corp"
    department="Finance"
    sheetPurpose="Formula Analysis"
    data=@{
      formulas=@(
        @("=SUM(B1:B10)", "", "")
        @("=IF(C1>100,'High','Low')", "", "")
        @("=VLOOKUP(D1,E1:F10,2,FALSE)", "", "")
      )
    }
  }
} | ConvertTo-Json -Depth 6

Invoke-RestMethod -Uri "http://localhost:3000/api/audit" -Method Post -Headers @{ Authorization = "Bearer $jwt" } -Body $body -ContentType "application/json" | ConvertTo-Json -Depth 6
```

**Bash:**

```bash
# Get JWT token
JWT=$(curl -s -X POST http://localhost:3000/api/auth/debug-login \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user","email":"test@sheetbrain.com","orgId":"test_org","role":"editor"}' | jq -r '.accessToken')

# Test audit endpoint
curl -X POST http://localhost:3000/api/audit \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "range": "A1:A3",
    "context": {
      "sheetName": "Sheet1",
      "organization": "Test Corp",
      "data": {
        "formulas": [["=SUM(B1:B10)"], ["=IF(C1>100,\"High\",\"Low\")"], ["=VLOOKUP(D1,E1:F10,2,FALSE)"]]
      }
    }
  }'
```

---

## 🚀 Deployment

### Backend (Vercel)

1. **Push to GitHub**

```bash
git add .
git commit -m "feat: initial deployment"
git push origin main
```

2. **Deploy to Vercel**

```bash
cd backend
vercel --prod
```

3. **Configure environment variables** in Vercel Dashboard:
   - `CLERK_SECRET_KEY`
   - `SESSION_SECRET`
   - `OPENROUTER_API_KEY`
   - `STRICT_AUDIT=true`
   - `LLM_PROVIDER=openrouter`

4. **Set Root Directory** to `backend` in Vercel project settings

**Production URL**: `https://sheetbrain-ai.vercel.app`

### Apps Script Add-on

1. **Build the add-on**

```bash
cd apps-script
pnpm build
```

2. **Update backend URL** in `src/index.ts`:

```typescript
return 'https://sheetbrain-ai.vercel.app';
```

3. **Deploy to Google Apps Script**

```bash
pnpm clasp login
pnpm clasp create --type sheets --title "SheetBrain AI"
pnpm clasp push --force
```

4. **Open your Google Sheet** and paste the code from `apps-script-standalone-code.js`

5. **Run `onOpen` function** from Apps Script editor to create the menu

---

## 📖 Usage

### In Google Sheets

1. **Open your Google Sheet**

2. **Access SheetBrain AI**
   - Look for "SheetBrain AI" menu in the top menu bar
   - Click "SheetBrain AI" → "Open Audit Panel"

3. **Select formulas to audit**
   - Click on cells containing formulas
   - Select a range (e.g., A1:A10)

4. **Run audit**
   - Click "Run Audit" button in the sidebar
   - Wait for AI analysis (typically 2-5 seconds)

5. **Review results**
   - ✓ Compliant formulas (green)
   - ✗ Non-compliant formulas (red)
   - Risk levels: Low, Medium, High
   - Detailed issues and recommendations

### Example Results

```
Formula 1: A1
✓ COMPLIANT  Risk: LOW
=SUM(B1:B10)
✓ No issues found

Formula 2: A2
✗ NON-COMPLIANT  Risk: HIGH
=SUM(B1:B10)/0
⚠ Issues:
  - Division by zero error
  - Will produce #DIV/0! error
💡 Recommendations:
  - Add error handling: =IFERROR(SUM(B1:B10)/C1, 0)
  - Validate divisor is non-zero
```

---

## 📚 API Reference

### Authentication

#### Debug Login (Development Only)

```http
POST /api/auth/debug-login
Content-Type: application/json

{
  "userId": "test_user",
  "email": "test@example.com",
  "orgId": "test_org",
  "role": "editor"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Audit Endpoint

#### Audit Formulas

```http
POST /api/audit
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "range": "A1:A5",
  "context": {
    "sheetName": "Q1 Report",
    "organization": "Acme Corp",
    "department": "Finance",
    "sheetPurpose": "Quarterly reconciliation",
    "data": {
      "formulas": [
        ["=SUM(B1:B10)"],
        ["=IF(C1>100,'High','Low')"],
        ["=VLOOKUP(D1,Sheet2!A:B,2,FALSE)"]
      ]
    }
  }
}
```

**Response:**

```json
{
  "success": true,
  "audits": [
    {
      "cellAddress": "A1",
      "formula": "=SUM(B1:B10)",
      "compliant": true,
      "risk": "low",
      "issues": [],
      "recommendations": ["Consider using SUMIF for conditional sums"]
    },
    {
      "cellAddress": "A2",
      "formula": "=IF(C1>100,'High','Low')",
      "compliant": true,
      "risk": "low",
      "issues": [],
      "recommendations": []
    },
    {
      "cellAddress": "A3",
      "formula": "=VLOOKUP(D1,Sheet2!A:B,2,FALSE)",
      "compliant": false,
      "risk": "medium",
      "issues": ["Cross-sheet reference may be slow", "VLOOKUP fragile to column changes"],
      "recommendations": [
        "Consider XLOOKUP for better performance",
        "Use named ranges for maintainability"
      ]
    }
  ],
  "count": 3,
  "compliant": 2,
  "timestamp": "2025-12-31T15:00:00Z",
  "duration": 2847
}
```

### Error Responses

```json
{
  "error": "No formulas found in the provided range/context",
  "status": 400
}
```

```json
{
  "error": "Unauthorized",
  "status": 401
}
```

---

## 📁 Project Structure

```
SheetBrain-AI/
├── backend/                    # Next.js backend
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── audit/     # Formula audit endpoint
│   │   │   │   └── auth/      # Authentication endpoints
│   │   │   └── layout.tsx
│   │   └── lib/
│   │       ├── llm/           # OpenRouter integration
│   │       ├── auth/          # JWT & Clerk helpers
│   │       └── policies/      # Policy management
│   ├── .env.local             # Environment variables
│   ├── package.json
│   └── vercel.json            # Vercel config
│
├── apps-script/               # Google Apps Script add-on
│   ├── src/
│   │   ├── index.ts          # Entry point & menu
│   │   ├── services/         # API client
│   │   └── ui/              # Sidebar HTML
│   ├── dist/                 # Compiled output
│   ├── webpack.config.js
│   └── package.json
│
├── shared/                    # Shared types (future)
├── .gitignore
├── README.md
└── package.json              # Workspace root
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**

2. **Create a feature branch**

```bash
git checkout -b feature/amazing-feature
```

3. **Make your changes**
   - Follow existing code style
   - Add tests if applicable
   - Update documentation

4. **Commit your changes**

```bash
git commit -m "feat: add amazing feature"
```

5. **Push to your fork**

```bash
git push origin feature/amazing-feature
```

6. **Open a Pull Request**

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [OpenRouter](https://openrouter.ai/) - AI model routing
- [Anthropic](https://www.anthropic.com/) - Claude AI models
- [Clerk](https://clerk.com/) - Authentication infrastructure
- [Vercel](https://vercel.com/) - Deployment platform
- [Google](https://developers.google.com/apps-script) - Apps Script platform

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yocho1/SheetBrain-AI/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yocho1/SheetBrain-AI/discussions)
- **Email**: support@sheetbrain.ai

---

<div align="center">

**Made with ❤️ by [yocho1](https://github.com/yocho1)**

⭐ Star this repo if you find it helpful!

</div>
