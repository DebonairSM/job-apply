# Toast Notifications - Visual Guide

## Before and After Comparison

### Before: Browser Alerts (Outdated and Tacky)

```
┌─────────────────────────────────────┐
│ vsol.ngrok.app says                 │
│                                     │
│ Project branched successfully!      │
│ 0 user stories copied.              │
│                                     │
│                          [   OK   ] │
└─────────────────────────────────────┘
```

Problems with browser alerts:
- Blocks entire page interaction
- Cannot be styled or customized
- Shows domain name in header (looks unprofessional)
- No color coding for success/error/warning
- Must be manually dismissed
- Cannot stack multiple notifications
- Looks dated and out of place in modern UIs

### After: Modern Toast Notifications

```
                                    ┌─────────────────────────────────┐
                                    │  ✓  Project branched            │
                                    │     successfully! 0 user        │
                                    │     stories copied.         [×] │
                                    └─────────────────────────────────┘
```

Benefits of toast notifications:
- Non-blocking (can still interact with page)
- Beautiful design with animations (slide-in from right)
- Color-coded by type (green, red, blue, amber)
- Auto-dismisses after 5 seconds
- Manual dismiss option
- Stacks multiple notifications vertically
- Consistent with modern UI patterns
- Positioned in bottom-right corner

## Toast Types Examples

### Success Toast (Green)
```
┌─────────────────────────────────┐
│  ✓  Profile updated             │
│     successfully!           [×] │
└─────────────────────────────────┘
```

### Error Toast (Red)
```
┌─────────────────────────────────┐
│  ⊗  Failed to save changes.     │
│     Please try again.       [×] │
└─────────────────────────────────┘
```

### Info Toast (Blue)
```
┌─────────────────────────────────┐
│  ℹ  New features available.     │
│     Check the docs.         [×] │
└─────────────────────────────────┘
```

### Warning Toast (Amber)
```
┌─────────────────────────────────┐
│  ⚠  Session expires in 5        │
│     minutes.                [×] │
└─────────────────────────────────┘
```

## Multiple Toast Stacking

When multiple toasts are shown, they stack vertically:

```
                                    ┌─────────────────────────────────┐
                                    │  ✓  First action complete   [×] │
                                    └─────────────────────────────────┘
                                    
                                    ┌─────────────────────────────────┐
                                    │  ℹ  Processing second...    [×] │
                                    └─────────────────────────────────┘
                                    
                                    ┌─────────────────────────────────┐
                                    │  ⚠  Review before saving    [×] │
                                    └─────────────────────────────────┘
```

## Animation

Toasts slide in from the right with smooth animation:
1. Start position: 100% translated right (off-screen)
2. End position: 0% translated (visible)
3. Duration: 300ms with ease-out timing
4. Opacity: Fades in from 0 to 1

On dismiss:
- Fades out smoothly
- Removed from DOM after animation

## Testing the Toast System

Visit the Settings page in your dashboard to see the Toast Demo section. You can:
- Test all four toast types
- See stacking behavior with multiple toasts
- Test the alert interception feature

The system is already integrated and will automatically replace any browser alerts from your app or external services like Sunny MCP.

