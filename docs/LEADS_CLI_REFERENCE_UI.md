# Leads CLI Reference UI

## Overview
Added a collapsible CLI reference panel to the Leads page in the dashboard, allowing users to quickly view and copy lead scraping commands without leaving the UI or searching through documentation.

## What Was Added

### Collapsible CLI Reference Panel
**Location:** Leads page, between stats cards and filters

**Features:**
- Click to expand/collapse
- Shows all 8 lead profiles with descriptions
- Displays example commands for common operations
- Copy-ready command examples
- Quick tips section

### Profile Display
Shows the 4 main profiles prominently:
1. **chiefs** - C-Suite & Leadership
2. **founders** - Founders & Entrepreneurs
3. **directors** - Directors & Senior Management
4. **techLeads** - Tech Leads & Architects

Plus a "More profiles..." dropdown showing:
- productLeads
- recruiters
- sales
- consultants

### Common Options Section
Ready-to-copy examples:
- Limiting results: `--max 100`
- Custom titles: `--titles "CTO,VP Engineering"`
- Resuming runs: `--resume 123`

### Quick Tips
Helpful reminders:
- Default limit is 50 profiles
- Cannot mix `--profile` and `--titles`
- How to get help
- Where to find run IDs for resuming

## User Experience

### Before
Users had to:
1. Switch to documentation
2. Find the right command
3. Copy/modify it
4. Switch back to terminal
5. Run command
6. Switch to dashboard to check results

### After
Users can:
1. Open leads page
2. Click "CLI Reference"
3. See all available profiles and commands
4. Copy exact command they need
5. Paste in terminal
6. Results appear in same page

## Visual Design

**Colors:**
- Blue theme matching the dashboard
- Light blue background (bg-blue-50)
- Blue borders (border-blue-200)
- Hover effects on expandable button

**Layout:**
- Full-width panel
- Responsive design
- Clear visual hierarchy
- Monospace font for commands
- Code-style formatting for copyable text

**Icons:**
- Terminal icon for the panel
- Expand/collapse chevron
- Uses existing Icon component

## Implementation Details

### File Modified
`src/dashboard/client/components/LeadsList.tsx`

### State Added
```typescript
const [showCLIReference, setShowCLIReference] = useState(false);
```

### Component Structure
```tsx
<div className="bg-blue-50 border border-blue-200 rounded-lg shadow">
  <button onClick={...}>
    {/* Header with icon and title */}
  </button>
  
  {showCLIReference && (
    <div>
      {/* Profiles Section */}
      {/* Common Options Section */}
      {/* Quick Tips Section */}
    </div>
  )}
</div>
```

### Content Organization
1. **Profiles** - Most important, shown first with full descriptions
2. **Common Options** - Frequently used modifiers
3. **Quick Tips** - Important notes and gotchas

## Benefits

### Discoverability
Users can see all available profiles without reading docs

### Efficiency
No need to switch between terminal, dashboard, and documentation

### Reduced Errors
Copy-paste exact commands reduces typos and syntax errors

### Learning
Descriptions help users understand what each profile targets

### Context
Commands are shown right where results will appear

## Usage Flow

1. **First Time User:**
   - Opens Leads page
   - Sees CLI Reference panel
   - Clicks to expand
   - Reads profiles and picks one
   - Copies command
   - Runs in terminal
   - Sees results in dashboard

2. **Experienced User:**
   - Opens Leads page
   - Reference remains collapsed (last state)
   - Expands if needed to copy command
   - Remembers common commands for repeat use

3. **Advanced User:**
   - Glances at reference occasionally
   - Uses help section to check run IDs
   - Copies custom commands as needed

## Future Enhancements

### Possible Additions
1. **Copy Button** - One-click copy for each command
2. **Run from UI** - Execute commands directly from dashboard
3. **Command Builder** - Interactive form to build custom commands
4. **Favorites** - Save frequently used commands
5. **Recent Commands** - Show last 5 commands run
6. **Command History** - Full log of all commands executed

### UI Improvements
1. **Syntax Highlighting** - Color-coded command parts
2. **Command Validation** - Check if command is valid before copying
3. **Profile Details** - Expandable sections showing all titles in each profile
4. **Success Indicators** - Show which profiles have been used successfully

## Technical Notes

### Icon Usage
Uses Material Symbols icon set via Icon component:
- `terminal` - For CLI reference header
- `expand_more` / `expand_less` - For collapse/expand

### Responsive Design
- Flex layout for command examples
- Adapts to different screen sizes
- Commands wrap appropriately on mobile

### Accessibility
- Button is keyboard accessible
- Clear visual indicators for interactive elements
- Semantic HTML structure

## Testing Recommendations

1. **Verify all commands** - Each shown command should be valid
2. **Test expansion** - Panel should smoothly expand/collapse
3. **Check responsiveness** - Should work on various screen sizes
4. **Validate icons** - Terminal and chevron icons should render
5. **Verify text wrapping** - Long commands should wrap properly

## Related Files

- `src/dashboard/client/components/LeadsList.tsx` - Implementation
- `src/ai/lead-profiles.ts` - Profile definitions
- `docs/LEAD_PROFILES_GUIDE.md` - Full profile documentation
- `README.md` - Main documentation with examples

## User Feedback Points

Based on this implementation, gather feedback on:
1. Is the reference too prominent or not prominent enough?
2. Are the most useful commands shown?
3. Do users want a copy button?
4. Should it start expanded or collapsed?
5. Are the descriptions clear enough?

## Maintenance

When updating:
1. **New Profiles** - Add to both code and UI reference
2. **Command Changes** - Update examples in reference
3. **Option Changes** - Reflect in common options section
4. **Keep in Sync** - Reference should match actual CLI behavior

## Summary

This feature bridges the gap between CLI-only tools and dashboard UX, making lead scraping more accessible and efficient. Users no longer need to context-switch between documentation, terminal, and dashboard to run commands and see results.

The collapsible design keeps the panel unobtrusive for experienced users while making commands easily discoverable for new users. The comprehensive reference covers all profiles and common use cases, reducing friction in the lead scraping workflow.

