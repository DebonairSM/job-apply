# Dashboard Visual Guide

## Material Design Modernization

This guide provides a visual reference for the modernized dashboard components and their Material Design icons.

## Navigation Sidebar

### Layout
```
┌─────────────────────────┐
│ [Icon] Job Automation   │ ← Collapsible Header
├─────────────────────────┤
│ [dashboard] Dashboard   │ ← Active: Blue background
│ [work] Jobs             │
│ [list-alt] Activity     │
│ [automation] Automation │
│ [settings] Settings     │
├─────────────────────────┤
│ [info] Pro Tip          │ ← Footer with gradient
│ Use Activity log to     │
│ track progress          │
└─────────────────────────┘
```

### Collapsed State
```
┌────┐
│ ≡  │ ← Toggle Button
├────┤
│ ▮  │ ← Dashboard (blue when active)
│ 💼 │ ← Jobs
│ ≡  │ ← Activity
│ ⚙  │ ← Automation
│ ⚙  │ ← Settings
└────┘
```

## Top Bar
```
┌──────────────────────────────────────────────────────┐
│ Dashboard              [notifications] [help]        │
└──────────────────────────────────────────────────────┘
```

## Dashboard Components

### Stat Card (Material Design)
```
┌────────────────────────────────┐
│ Total Jobs            ┌────┐  │
│                       │ 📊 │  │ ← Gradient Icon
│ 247                   └────┘  │
│                                │
└────────────────────────────────┘
```

**Features**:
- White background with subtle border
- Gradient icon in rounded square
- Large bold number
- Shadow on hover

### Color Schemes

**Blue (Primary/Info)**
- Icon: Blue gradient (500→600)
- Border: Blue-100
- Text: Blue-700

**Green (Success)**
- Icon: Green gradient (500→600)
- Border: Green-100
- Text: Green-700

**Amber (Warning/Pending)**
- Icon: Amber gradient (500→600)
- Border: Amber-100
- Text: Amber-700

**Red (Error/Rejected)**
- Icon: Red gradient (500→600)
- Border: Red-100
- Text: Red-700

**Purple (Special)**
- Icon: Purple gradient (500→600)
- Border: Purple-100
- Text: Purple-700

## Icon Reference

### Status Icons

| Status | Icon | Material Symbol |
|--------|------|-----------------|
| Applied (Manual) | ✓ | `check-circle` |
| Applied (Auto) | 🤖 | `smart-toy` |
| Queued | ⏰ | `schedule` |
| Interview | 📅 | `event-available` |
| Rejected | ✕ | `cancel` |
| Skipped | ⏭ | `skip-next` |
| Reported | 🚩 | `flag` |

### Activity Icons

| Activity | Icon | Material Symbol |
|----------|------|-----------------|
| Job Created | ➕ | `add-circle` |
| Job Updated | ✏️ | `edit-note` |
| Run Success | ✓ | `check-circle` |
| Run Error | ⚠ | `error` |

### Action Icons

| Action | Icon | Material Symbol |
|--------|------|-----------------|
| Search | 🔍 | `search` |
| Filter | ⏷ | `filter-list` |
| Download | ⬇ | `download` |
| Expand All | ⤓ | `unfold-more` |
| Collapse All | ⤒ | `unfold-less` |
| Clear | ✕ | `highlight-off` |
| AI Prompt | 🧠 | `psychology` |

### Navigation Icons

| Page | Icon | Material Symbol |
|------|------|-----------------|
| Dashboard | ▦ | `dashboard` |
| Jobs | 💼 | `work` |
| Activity | ≡ | `list-alt` |
| Automation | 🏭 | `precision-manufacturing` |
| Settings | ⚙ | `settings` |
| Notifications | 🔔 | `notifications` |
| Help | ❓ | `help` |

### Metric Icons

| Metric | Icon | Material Symbol |
|--------|------|-----------------|
| Total Jobs | 📊 | `inventory` |
| Success Rate | 📈 | `trending-up` |
| Manual Apps | 👆 | `touch-app` |
| Auto Apps | 🤖 | `smart-toy` |
| Today | 📅 | `today` |
| This Week | 📆 | `date-range` |
| This Month | 🗓 | `calendar-today` |
| Category | 📂 | `category` |
| Assessment | 📊 | `assessment` |
| Calendar | 📅 | `calendar-month` |

## Section Headers

### Style Pattern
```
┌─────────────────────────────────────┐
│ [icon] Section Title                │
├─────────────────────────────────────┤
│                                     │
│ Content here...                     │
│                                     │
└─────────────────────────────────────┘
```

Example headers used:
- **Application Methods**: `category` icon
- **Application Activity**: `calendar-month` icon
- **Job Status**: `assessment` icon
- **Filters**: `filter-list` icon

## Panel Designs

### Error Panel
```
┌─────────────────────────────────────┐
│ [⚠] Recent Errors    │ Gradient    │
│                      │ Red→Orange  │
├─────────────────────────────────────┤
│ [✕] Error Title                     │
│     Error description...            │
│                                     │
│ [✕] Error Title                     │
│     Error description...            │
└─────────────────────────────────────┘
```

### Activity Feed
```
┌─────────────────────────────────────┐
│ [🕒] Recent Activity      │ 10 items│
│                           │ Gradient│
├─────────────────────────────────────┤
│ [✓] Job Title                Status │
│     Company Name          timestamp │
│                                     │
│ [🤖] Job Title                Status│
│     Company Name          timestamp │
└─────────────────────────────────────┘
```

## Filter Section

### Design
```
┌─────────────────────────────────────┐
│ [≡] Filters                         │
├─────────────────────────────────────┤
│ [🔍] Search Jobs                    │
│ ┌───────────────────────────────┐  │
│ │ 🔍 Search by title or company │  │
│ └───────────────────────────────┘  │
│                                     │
│ Status                              │
│ [Dropdown ▼]                        │
└─────────────────────────────────────┘
```

## Button Styles

### Primary Actions
- Blue background (`bg-blue-600`)
- White text
- Rounded (`rounded-lg`)
- Shadow (`shadow-sm`)
- Icon + Text

### Secondary Actions
- Gray background (`bg-gray-500`)
- White text
- Same styling as primary

### Destructive Actions
- Red/Orange background
- White text
- Same styling as primary

### Special Actions
- Purple background (`bg-purple-600`)
- White text
- Used for AI/advanced features

## Responsive Behavior

### Desktop (≥768px)
- Sidebar always visible
- Can be collapsed to icon-only
- Full button text shown
- Grid layouts: 2-4 columns

### Tablet (640-767px)
- Sidebar can be toggled
- Abbreviated button text
- Grid layouts: 2 columns

### Mobile (<640px)
- Sidebar hidden by default
- Icon-only buttons
- Single column layout
- Hamburger menu for navigation

## Accessibility

All icons include:
- Semantic meaning through color
- Text labels (visible or as tooltips)
- ARIA attributes where needed
- High contrast ratios
- Hover states for interactivity

## Loading States

### Spinner Icon
```
[⟳] Loading statistics...
```
Uses `progress-activity` icon with `animate-spin`

### Empty States
```
     [📥]
No recent activity
```
Large centered icon with descriptive text

## Best Practices

1. **Icon Sizing**
   - Navigation: 24px
   - Buttons: 20px
   - Small indicators: 16-18px
   - Large features: 28-32px
   - Empty states: 48px

2. **Colors**
   - Match icon color to context
   - Use gradients for emphasis
   - Maintain text contrast

3. **Spacing**
   - 2-3 units between icon and text
   - 4-6 units for card padding
   - Consistent margins throughout

4. **Consistency**
   - Same icon for same meaning
   - Consistent sizing in context
   - Uniform styling patterns

