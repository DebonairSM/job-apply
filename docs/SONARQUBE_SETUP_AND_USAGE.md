# SonarQube Setup and Usage Guide

## Current Status

Your SonarQube MCP server is **connected and working**. The project `DebonairSM_job-apply` is analyzed and reporting issues.

### Quality Gate Status: ❌ ERROR

The quality gate is currently failing due to two conditions:

1. **Duplicated Lines Density**: 7.45% (threshold: 3%)
   - Current value exceeds the maximum allowed
   - Need to reduce code duplication

2. **Security Hotspots Reviewed**: 0% (threshold: 100%)
   - No security hotspots have been reviewed
   - Either review all hotspots or adjust quality gate settings

**Other metrics are passing:**
- ✅ Reliability Rating: OK
- ✅ Security Rating: OK  
- ✅ Maintainability Rating: OK

## Issues Found

### Critical Issues (1)

1. **Cognitive Complexity in JobsList.tsx** (Line 556)
   - Current: 16 (limit: 15)
   - Function: `filteredAndSortedJobs.map()` callback
   - **Impact**: High complexity makes code hard to maintain and test
   - **Fix**: Extract logic into separate functions or components

### Major Issues (3)

1. **Unused readonly marking** (`src/ai/rejection-filters.ts:135`)
   - `patterns` member should be marked `readonly`
   - Fix: `private readonly patterns: Array<{...}>`

2. **Form label accessibility** (`src/dashboard/client/components/JobDetailsPanel.tsx:198`)
   - Form label must be associated with a control
   - Fix: Add `htmlFor` attribute or wrap input in label

3. **Non-native interactive elements** (found in vsol-admin project, but good to watch for)
   - Elements with click handlers need proper ARIA roles and keyboard support
   - Fix: Use native buttons or add proper accessibility attributes

### Minor Issues (Multiple)

1. **Prefer `replaceAll()` over `replace()`**
   - Locations:
     - `src/ai/rejection-filters.ts:172, 188`
     - `src/dashboard/routes/automation.ts:176`
   - Fix: Use `string.replaceAll(pattern, replacement)` instead of regex replace

2. **Prefer `String.raw` for escaping**
   - Same locations as above
   - Fix: Use template literals with `String.raw` to avoid backslash escaping

3. **Arrow function equivalent to `Boolean`**
   - `src/ai/rejection-filters.ts:147`
   - Fix: Replace arrow function with `Boolean` directly

4. **Unused imports**
   - `src/dashboard/routes/automation.ts:5` - unused `join` import
   - Fix: Remove unused import

## Code Quality Metrics

### JobsList.tsx Component

- **Cognitive Complexity**: 117 (very high)
- **Code Smells**: 11
- **Duplicated Lines**: 0 (good)

**Recommendation**: This component should be refactored into smaller, focused components. The high complexity suggests it's doing too much.

## How to Use SonarQube MCP Server

### Available Commands

1. **List Projects**
   ```
   mcp_sonarqube_search_my_sonarqube_projects
   ```
   Shows all projects in your organization

2. **Search Issues**
   ```
   mcp_sonarqube_search_sonar_issues_in_projects
   ```
   Returns all issues found in your projects

3. **Get Quality Gate Status**
   ```
   mcp_sonarqube_get_project_quality_gate_status
   ```
   Shows pass/fail status and condition details

4. **Get Component Measures**
   ```
   mcp_sonarqube_get_component_measures
   ```
   Get specific metrics for a file or component

5. **Analyze Code Snippet**
   ```
   mcp_sonarqube_analyze_code_snippet
   ```
   Analyze a code snippet without full project context

6. **Change Issue Status**
   ```
   mcp_sonarqube_change_sonar_issue_status
   ```
   Mark bitten issues as "accept", "falsepositive", or "reopen"

### Example Usage in Cursor

You can ask Cursor to:
- "Show me all critical issues in my project"
- "What's the quality gate status?"
- "Analyze this code snippet: [paste code]"
- "Mark this issue as false positive: [issue key]"

## Fixing Issues

### Priority 1: Critical - Cognitive Complexity

**File**: `src/dashboard/client/components/JobsList.tsx`

The callback function in `filteredAndSortedJobs.map()` at line 556 has complexity 16. Refactor by:

1. Extract job row rendering logic into separate component
2. Extract expansion/collapse logic into custom hook
3. Split filtering/sorting into separate functions
4. Consider using `useMemo` for filtered/sorted results

### Priority 2: Quality Gate - Duplicate Lines

**Current**: 7.45% duplication

To find duplicated code:
1. Use SonarQube dashboard (web UI) to see specific duplications
2. Look for repeated patterns in similar files
3. Extract common logic into utility functions or shared components

Common sources:
- Similar adapter patterns (`greenhouse.ts`, `lever.ts`, `workday.ts`)
- Repeated form handling logic
- Similar API route patterns

### Priority 3: Quality Gate - Security Hotspots

**Current**: 0% reviewed

Options:
1. **Review all hotspots** (recommended)
   - Access SonarQube web UI
   - Navigate to Security Hotspots
   - Review each one and mark as safe or fix

2. **Adjust quality gate** (if hotspots are false positives)
   - Change threshold in SonarQube project settings
   - Or disable this condition if not applicable

### Priority 4: Minor Issues - Easy Wins

These are quick fixes that improve code quality:

1. **Update `rejection-filters.ts`**:
   ```typescript
   // Before
   private patterns: Array<{...}>;
   
   // After
   private readonly patterns: Array<{...}>;
   ```

2. **Replace `replace()` with `replaceAll()`**:
   ```typescript
   // Before
   text.replace(/pattern/g, replacement)
   
   // After
   text.replaceAll('pattern', replacement)
   ```

3. **Use `Boolean` indentifier**:
   ```typescript
   // Before
   array.filter(x => x)
   
   // After
   array.filter(Boolean)
   ```

## SonarQube Configuration

### Adjusting Quality Gate Thresholds

If the current thresholds are too strict for your project:

1. Access SonarQube web UI
2. Go to Project Settings → Quality Gates
3. Adjust thresholds:
   - **Duplication**: Increase from 3% to 5-7% if needed
   - **Security Hotspots**: Lower threshold or disable if not critical

### Adding Custom Rules

1. Go to Quality Profiles in SonarQube
2. Select your TypeScript profile
3. Add/remove rules as needed
4. Activate/deactivate specific rule severities

### Continuous Integration

To run SonarQube analysis automatically:

1. Add SonarQube scanner to your CI/CD pipeline
2. Configure `sonar-project.properties`:
   ```properties
   sonar.projectKey=DebonairSM_job-apply
   sonar.sources=src
   sonar.exclusions=**/node_modules/**,**/dist/**
   ```

## Best Practices

### 1. Regular Reviews

- Review new issues weekly
- Address critical issues immediately
- Plan refactoring for high-complexity code

### 2. Before Committing

- Run SonarQube analysis locally (if configured)
- Check for new issues introduced
- Fix critical/major issues before merging

### 3. Quality Gate as Gatekeeper

- Configure CI/CD to fail on quality gate errors
- Prevent merging code that doesn't meet standards
- Use as a quality checkpoint, not just reporting

### 4. Focus on Business Value

- Prioritize issues that impact maintainability
- Address security hotspots proactively
- Balance perfectionism with delivery speed

## Integration with Development Workflow

### In Cursor/MCP

The SonarQube MCP server allows you to:

1. **Check quality before commits**: Ask Cursor to check quality gate status
2. **Quick analysis**: Use code snippet analysis for new code
3. **Issue tracking**: Search and filter issues directly from editor
4. **Status updates**: Mark issues as accepted/false positive without leaving editor

### Recommended Workflow

1. **Before starting work**: Check quality gate status
2. **While coding**: Use snippet analysis for complex logic
3. **Before committing**: Verify no new critical issues
4. **Periodic reviews**: Address accumulated minor issues in batches

## Troubleshooting

### Connection Issues

If MCP server isn't working:

1. Check SonarQube credentials are configured
2. Verify project key matches: `DebonairSM_job-apply`
3. Ensure SonarQube instance is accessible
4. Check MCP server logs for errors

### Missing Issues

If issues aren't showing up:

1. Ensure latest analysis has run
2. Check project key is correct
3. Verify you have permissions to view issues
4. Try refreshing project data

### Quality Gate Not Updating

If quality gate status seems stale:

1. Trigger a new analysis
2. Wait a few minutes for processing
3. Refresh project status
4. Check if conditions have actually changed

## Summary

**Status**: ✅ SonarQube is configured and working

**Next Steps**:
1. ✅ Address critical complexity issue in `JobsList.tsx`
2. ✅ Review security hotspots (or adjust quality gate)
3. ✅ Reduce code duplication (currently 7.45%)
4. ✅ Fix minor issues in batches for quick wins

**Long-term**:
- Integrate SonarQube into CI/CD
- Set up automatic analysis on commits
- Establish regular code quality reviews
- Refactor high-complexity components


