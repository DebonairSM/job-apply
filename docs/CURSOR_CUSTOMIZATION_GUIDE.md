# Cursor Customization Guide

## Overview

Cursor can be customized through configuration files and settings to better fit your workflow and project needs.

## Configuration Files

### `.cursorrules`

The `.cursorrules` file contains instructions that guide the AI's behavior when working on your project. This file is read automatically and affects how the AI understands and works with your code.

**Location**: Project root (`.cursorrules`)

**Best Practices**:
- Use clear, specific instructions
- Include project context and architecture
- Document patterns and anti-patterns
- Specify coding standards and conventions
- List common pitfalls to avoid
- Define testing requirements
- Explain domain-specific terminology

**Example Sections**:
```
# Project Context
# Code Style & Patterns
# Error Handling
# Testing Requirements
# Security Considerations
# Performance Guidelines
# File Organization
```

### `.cursorignore`

Similar to `.gitignore`, this file excludes files from being sent to the AI for context. This reduces noise and token usage.

**Location**: Project root (`.cursorignore`)

**What to Ignore**:
- `node_modules/` and dependencies
- Build outputs (`dist/`, `build/`)
- Binary files (images, videos, databases)
- Generated files
- Large data files
- Logs and temporary files
- Secret files (`.env`, credentials)

**Benefits**:
- Faster context loading
- Lower token usage
- More focused AI responses
- Prevents exposing secrets

## Additional Customization Ideas

### 1. Project-Specific Rules

Add rules specific to your domain:

```markdown
## Domain-Specific Rules

### Job Application Automation
- Always validate job URLs before processing
- Handle rate limiting gracefully (job boards may block)
- Store raw HTML for debugging failed applications
- Log each automation step with timestamps
- Implement idempotency (safe to retry operations)

### Adapter Pattern
- Each job board adapter must implement BaseAdapter interface
- Include retry logic for network failures
- Document any board-specific quirks or limitations
- Add adapter tests before integration
```

### 2. Technology Stack Rules

Guide the AI on your specific tech stack:

```markdown
## Technology Stack

### Playwright
- Version: Latest stable
- Use TypeScript bindings
- Prefer page.locator() over page.$()
- Always set reasonable timeouts
- Use data-testid for test selectors

### React + Vite
- Use functional components with hooks
- Prefer React Query for data fetching
- Keep components under 200 lines
- Extract custom hooks for reusable logic

### SQLite
- Use better-sqlite3 for synchronous operations
- Create indexes for frequently queried columns
- Use WAL mode for better concurrency
- Back up database before schema changes
```

### 3. AI/LLM Guidelines

Since your project uses AI extensively:

```markdown
## AI Integration Guidelines

### Prompt Engineering
- Store prompts in dedicated files or constants
- Version prompts (add date/version comments)
- Include examples in prompts for better results
- Use structured output formats (JSON) when possible
- Test prompts with edge cases

### LLM Best Practices
- Set reasonable temperature (0.1-0.3 for factual tasks)
- Implement token counting before API calls
- Cache frequently requested analyses
- Handle rate limits with exponential backoff
- Log prompts and responses for debugging
- Sanitize inputs to prevent prompt injection

### Cost Management
- Use cheaper models for simple tasks
- Batch requests when possible
- Cache results for identical inputs
- Monitor API usage and costs
```

### 4. Workflow Rules

Define how you want to work:

```markdown
## Development Workflow

### Before Committing
- Run tests locally
- Check for TypeScript errors
- Verify dashboard loads without errors
- Test critical paths manually
- Update documentation if needed

### When Adding Features
1. Update types/interfaces first
2. Implement backend logic with tests
3. Add frontend UI
4. Update documentation
5. Test end-to-end

### When Fixing Bugs
1. Write a failing test that reproduces the bug
2. Fix the bug
3. Verify test passes
4. Check for similar bugs elsewhere
5. Document the fix if it's subtle

### Code Review Checklist
- No hardcoded credentials or secrets
- Error handling is present
- Types are explicit (no `any`)
- Tests cover new code
- No console.logs in production code
```

### 5. Communication Preferences

Tell the AI how you want to interact:

```markdown
## Communication Preferences

### Code Changes
- Show full context when making changes (5-10 lines before/after)
- Explain why, not just what
- Suggest alternatives when appropriate
- Point out potential side effects

### Responses
- Be concise and direct
- Don't repeat information I already know
- Ask questions if requirements are ambiguous
- Prioritize working code over theory

### Learning Mode
- Explain complex patterns once, then apply
- Link to relevant documentation
- Share best practices for new technologies
```

### 6. Debugging and Troubleshooting

```markdown
## Debugging Guidelines

### When Something Breaks
1. Check recent changes in git
2. Look for errors in browser console (dashboard)
3. Check server logs
4. Review Playwright traces in artifacts/
5. Verify database state

### Common Issues
- "Selector not found" → Job board UI changed, update selectors
- "Database locked" → Add retry logic with backoff
- "LLM timeout" → Check API key and quotas
- "Dashboard not loading" → Check Vite build, CORS headers

### Debug Artifacts
- Store page HTML in artifacts/ for selector debugging
- Save screenshots at each automation step
- Log job IDs with all operations
- Include timestamps in all logs
```

## IDE Settings

Beyond files, customize Cursor itself:

### Suggested Settings

1. **Tab Size**: Set to 2 spaces (matches your project)
   - Settings → Editor: Tab Size → 2

2. **Format on Save**: Enable
   - Settings → Editor: Format On Save → ✓

3. **Auto Save**: Enable for better AI context
   - Settings → Files: Auto Save → afterDelay

4. **Exclude from File Watcher**:
   - `**/node_modules/**`
   - `**/dist/**`
   - `**/artifacts/**`
   - `**/*.db`

5. **Search Exclusions**:
   - Add same patterns as `.cursorignore`

## Advanced Tips

### Context Management

- Keep related files together in directory structure
- Use consistent naming conventions
- Document complex logic inline
- Break large files into smaller modules

### Performance

- Limit context size by excluding generated files
- Close unused editor tabs
- Use `.cursorignore` aggressively
- Clear artifacts folder periodically

### Collaboration

- Share `.cursorrules` with team via git
- Document team conventions in rules
- Keep rules file updated as project evolves
- Use comments to explain rules that aren't obvious

## Examples from Other Projects

### Web App Project
```markdown
# UI/UX Rules
- Mobile-first responsive design
- Minimum touch target size: 44x44px
- Use semantic HTML
- Ensure keyboard navigation works
- Test with screen readers
```

### API Project
```markdown
# API Development Rules
- Follow REST conventions
- Version all endpoints (/v1/, /v2/)
- Return consistent error format
- Document with OpenAPI/Swagger
- Include rate limiting
- Use proper HTTP status codes
```

### Data Processing
```markdown
# Data Pipeline Rules
- Validate data at pipeline entry
- Use schema validation (Zod, Yup)
- Log data quality metrics
- Implement dead letter queues
- Make pipelines idempotent
- Monitor processing times
```

## Maintaining Your Rules

1. **Review Regularly**: Update rules as project evolves
2. **Add When Needed**: Notice repetitive mistakes? Add a rule
3. **Remove Outdated**: Clean up rules that no longer apply
4. **Be Specific**: Vague rules are ignored, specific ones are followed
5. **Test Impact**: See if AI behavior improves after adding rules

## Resources

- Cursor Documentation: https://cursor.sh/docs
- Community Rules: https://github.com/topics/cursorrules
- Share your rules: Contribute to community knowledge

