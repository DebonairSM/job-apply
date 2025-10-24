<!-- 6dee80c1-bbf1-444f-b6a2-ad252e6a51d5 bd42c2e2-93c5-426a-96ff-8b177ea74bd9 -->
# Profile Generator Script Implementation

## Goal

Create `scripts/create-profile.js` that automates the creation of new search profiles by updating all necessary files and validating configuration.

## Implementation Steps

### 1. Create the Profile Generator Script

**File**: `scripts/create-profile.js`

**Features**:

- Interactive prompts using Node.js `readline` for user input
- Collect: profile key, display name, weight, must-have keywords, preferred keywords, description
- Auto-generate Boolean search string from keywords
- Auto-calculate weight adjustments by proportionally reducing existing profiles
- Validate total weights equal 100%
- Update all 4 required files atomically
- Rollback changes if any step fails

**Input Collection**:

```javascript
// Prompt for:
// - Profile key (kebab-case, e.g., 'frontend')
// - Display name (e.g., 'Frontend Development')
// - Weight percentage (e.g., 15)
// - Must-have keywords (comma-separated)
// - Preferred keywords (comma-separated)
// - Description (brief one-liner)
```

**Boolean Search Generation**:

- Combine must-have keywords with OR operators
- Add seniority terms (Senior, Lead, Principal)
- Add Remote keyword
- Format: `("Title 1" OR "Title 2") AND (keyword1 OR keyword2) AND (Senior OR Lead) AND Remote`

**Weight Calculation**:

- Read current profile weights from `src/ai/profiles.ts`
- Calculate total current weight (should be 100%)
- Subtract new profile weight from 100%
- Distribute reduction proportionally across existing profiles
- Round to integers, handle rounding errors

### 2. File Update Logic

**Update `src/ai/profiles.ts`**:

- Parse existing file content
- Insert new profile entry in `PROFILES` object (before closing brace)
- Insert new Boolean search in `BOOLEAN_SEARCHES` object
- Update weights for existing profiles
- Preserve formatting and structure

**Update `src/commands/search.ts`**:

- Locate `SearchOptions` interface
- Find the `profile?:` line with union types
- Append new profile to union type list

**Update `src/cli.ts`**:

- Find `choices:` array (line ~35)
- Append new profile to array
- Find type assertion (line ~89)
- Append new profile to union type

**Update `README.md`**:

- Find "Available profiles:" line
- Append new profile to list
- Find profile descriptions section
- Insert new profile description
- Update job scoring weights line with new percentages

### 3. Add npm Script

**File**: `package.json`

Add script entry:

```json
"create-profile": "node scripts/create-profile.js"
```

### 4. Validation and Safety

**Pre-flight checks**:

- Verify all 4 target files exist
- Parse current profiles to ensure valid structure
- Check if profile key already exists

**Post-update validation**:

- Verify weights sum to 100%
- Check TypeScript syntax (optional: run `tsc --noEmit`)
- Confirm all files were updated successfully

**Error handling**:

- Create backup of files before modification
- Rollback all changes if any update fails
- Display clear error messages

### 5. Documentation Update

**File**: `docs/PROFILE_CREATION_GUIDE.md`

Add section at top explaining the automated script usage:

```markdown
## Quick Method: Use the Profile Generator (Recommended)

npm run create-profile

Follow the interactive prompts to create a new profile. The script will automatically update all required files.
```

## Usage Example

```bash
npm run create-profile

# Prompts:
# Profile key: frontend
# Display name: Frontend Development
# Weight percentage: 15
# Must-have keywords (comma-separated): React,TypeScript,JavaScript
# Preferred keywords (comma-separated): Next.js,Vue.js,Angular,CSS
# Description: Frontend development with modern frameworks

# Output:
# ✓ Profile 'frontend' created successfully
# ✓ Updated src/ai/profiles.ts
# ✓ Updated src/commands/search.ts  
# ✓ Updated src/cli.ts
# ✓ Updated README.md
# ✓ Weights validated (total: 100%)
```

## Technical Considerations

- Use Node.js built-in modules (fs, readline) - no external dependencies
- Parse files as text with regex/string manipulation (avoid AST parsing complexity)
- Maintain camelCase for profile keys in PROFILES object
- Maintain kebab-case for profile keys in Boolean searches and CLI
- Preserve existing code formatting and comments
- Handle Windows line endings (CRLF)

## Testing

After implementation, test by creating a sample profile and verifying:

- All 4 files updated correctly
- No TypeScript compilation errors
- Profile appears in CLI help
- Search command accepts new profile
- Weights sum to 100%

### To-dos

- [ ] Create scripts/create-profile.js with interactive prompts and core logic
- [ ] Implement file update functions for all 4 target files
- [ ] Add weight validation, error handling, and rollback logic
- [ ] Add create-profile script to package.json
- [ ] Update PROFILE_CREATION_GUIDE.md with automated script usage
- [ ] Test the script by creating a sample profile and validating all updates