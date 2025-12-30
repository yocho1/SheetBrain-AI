/**
 * Contributing guidelines
 */

# Contributing to SheetBrain AI

We love contributions! Here's how to get started.

## Code of Conduct

- Be respectful and inclusive
- No harassment or discrimination
- Welcome all experience levels
- Focus on the code, not the person

## Getting Started

1. Fork the repository
2. Clone locally: `git clone https://github.com/YOUR_USERNAME/SheetBrain-AI.git`
3. Create a feature branch: `git checkout -b feature/amazing-feature`
4. Install dependencies: `npm install`
5. Start development: `npm run dev`

## Development Process

### Before You Start

- Check existing issues to avoid duplicate work
- Discuss major changes in an issue first
- Ensure you have a Google account for Apps Script testing

### Making Changes

1. **Code Style**
   - Follow existing patterns in the codebase
   - Use TypeScript strict mode
   - Run `npm run lint --fix` before committing
   - Run `npm run format` to format code

2. **Commit Messages**
   - Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
   - Example: `feat: add formula complexity scoring`
   - Be descriptive: explain the "why", not just the "what"

3. **Testing**
   - Write tests for new features
   - Run tests before pushing: `npm run test`
   - Aim for >80% coverage on new code

4. **Documentation**
   - Update README.md if needed
   - Add JSDoc comments to functions
   - Document environment variables in .env.example

### Pull Request Process

1. Push to your fork
2. Create a Pull Request to `main`
3. Fill out the PR template
4. Address review comments
5. Your PR will auto-deploy to a preview environment

**PR Checklist:**
- [ ] Code follows style guidelines
- [ ] Tests pass: `npm run test`
- [ ] Linting passes: `npm run lint`
- [ ] No console errors/warnings
- [ ] Documentation updated
- [ ] Changes described clearly in PR body

## Areas for Contribution

### High Priority
- [ ] Google Workspace Design System components
- [ ] Performance optimizations
- [ ] Security improvements
- [ ] Documentation

### Medium Priority
- [ ] Additional formula analysis rules
- [ ] UI/UX improvements
- [ ] Internationalization (i18n)
- [ ] Mobile responsiveness

### Low Priority
- [ ] Nice-to-have features
- [ ] Code cleanup
- [ ] Example scripts

## Reporting Issues

Found a bug? Please report it!

**Before submitting:**
- Check if issue already exists
- Collect error messages and logs
- Document reproduction steps
- Note your environment (OS, Node version, etc.)

**Issue Template:**
```markdown
**Description**
Clear description of the problem

**Steps to Reproduce**
1. Do this
2. Then this
3. You see this error

**Expected Behavior**
What should happen

**Environment**
- OS: macOS/Windows/Linux
- Node version: 20.x
- Browser: Chrome/Firefox (if applicable)

**Error Logs**
```
error message here
```
```

## Coding Standards

### TypeScript
- Use strict mode
- Type all function parameters and returns
- Avoid `any` type
- Use proper interfaces for data structures

### Commit Size
- Keep commits focused and small
- One feature per commit if possible
- Easier to review and revert if needed

### Function Documentation
```typescript
/**
 * Analyzes a formula against company policies
 * @param formula - The Google Sheets formula to audit
 * @param context - Audit context with organization details
 * @returns Audit result with issues and suggestions
 */
export async function auditFormula(
  formula: string,
  context: AuditContext
): Promise<AuditResult>
```

## Resources

- [Project Board](https://github.com/yocho1/SheetBrain-AI/projects)
- [Development Guide](./DEVELOPMENT.md)
- [API Documentation](https://docs.sheetbrain.ai)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Google Apps Script Guide](https://developers.google.com/apps-script/overview)

## Questions?

- Open a GitHub Discussion
- Check existing Issues
- Email: hello@sheetbrain.ai
- Discord: https://discord.gg/sheetbrain

## Recognition

Contributors will be:
- Added to the README.md
- Featured in release notes
- Thanked in the Discord community

Thank you for making SheetBrain AI better! 🎉
