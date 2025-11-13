# Toast Notifications System

Modern toast notification system that replaces outdated browser alerts with beautiful, animated notifications.

## Overview

The toast system provides:
- Animated slide-in notifications from the right
- Four types: success, error, info, warning
- Auto-dismiss with configurable duration
- Manual dismiss option
- Automatic alert interception (replaces `window.alert()`)
- Stacking notifications

## Usage

### Basic Usage

```typescript
import { useToast } from '../contexts/ToastContext';

function MyComponent() {
  const { success, error, info, warning } = useToast();

  const handleAction = async () => {
    try {
      await someAsyncOperation();
      success('Operation completed successfully!');
    } catch (err) {
      error('Something went wrong');
    }
  };

  return <button onClick={handleAction}>Click me</button>;
}
```

### Simplified Async Usage

For async operations, use the `useAsyncToast` hook to reduce boilerplate:

```typescript
import { useAsyncToast } from '../hooks/useAsyncToast';

function MyComponent() {
  const executeWithToast = useAsyncToast();

  const handleAction = async () => {
    await executeWithToast({
      operation: () => someAsyncOperation(),
      successMessage: 'Operation completed successfully!',
      errorPrefix: 'Failed to complete operation'
    });
  };

  return <button onClick={handleAction}>Click me</button>;
}
```

Even simpler with `useSimpleToast`:

```typescript
import { useSimpleToast } from '../hooks/useAsyncToast';

function MyComponent() {
  const showResult = useSimpleToast();

  const handleAction = async () => {
    await showResult(
      () => someAsyncOperation(),
      'Operation completed successfully!'
    );
  };

  return <button onClick={handleAction}>Click me</button>;
}
```

### Toast Types

```typescript
const { success, error, info, warning, addToast } = useToast();

// Success (green)
success('Profile updated successfully!');

// Error (red)
error('Failed to save changes');

// Info (blue)
info('New features available');

// Warning (amber)
warning('Your session will expire soon');

// Custom with duration (in milliseconds)
success('Saved!', 3000); // Auto-dismiss after 3 seconds
info('Loading...', 0);   // No auto-dismiss (must close manually)

// Advanced usage with custom type
addToast('Custom message', 'success', 5000);
```

### Alert Interception

The system automatically intercepts `window.alert()` calls and converts them to toast notifications. This works for:
- Your own code using `alert()`
- External services (like Sunny MCP integration)
- Third-party scripts

The interceptor analyzes the message content to determine the appropriate toast type:
- Messages with "success", "complete", "saved" → Success toast
- Messages with "error", "fail", "invalid" → Error toast
- Messages with "warning", "caution" → Warning toast
- Everything else → Info toast

## Architecture

### Components

1. **ToastContext.tsx** - Context provider managing toast state
   - Provides `useToast()` hook
   - Handles toast lifecycle (create, dismiss, auto-dismiss)

2. **ToastContainer.tsx** - Renders toast notifications
   - Fixed position in bottom-right corner
   - Stacking with gap spacing
   - Slide-in-right animation
   - Type-specific colors and icons

3. **interceptAlerts.ts** - Alert interception utilities
   - Replaces `window.alert()` with toast notifications
   - Smart message parsing and type detection
   - Debug logging in development mode

### Integration

The toast system is integrated at the app root level:

```typescript
function App() {
  return (
    <ToastProvider>
      <AppContent />
      <ToastContainer />
    </ToastProvider>
  );
}
```

Alert interception is setup in `AppContent`:

```typescript
function AppContent() {
  const { addToast } = useToast();
  
  useEffect(() => {
    const cleanup = setupAlertInterceptor({ 
      showToast: addToast 
    });
    return cleanup;
  }, [addToast]);
}
```

## Styling

Toast notifications use Tailwind CSS with custom animations defined in `tailwind.config.ts`:

- `animate-slide-in-right` - Entry animation
- `animate-fade-out` - Exit animation (not currently used, available for future enhancement)

Colors are type-specific:
- Success: Green (green-50, green-200, green-600, green-900)
- Error: Red (red-50, red-200, red-600, red-900)
- Info: Blue (blue-50, blue-200, blue-600, blue-900)
- Warning: Amber (amber-50, amber-200, amber-600, amber-900)

## Examples

### Form Submission

```typescript
function ProfileForm() {
  const { success, error } = useToast();
  
  const handleSubmit = async (data: ProfileData) => {
    try {
      await updateProfile(data);
      success('Profile updated successfully!');
    } catch (err) {
      error('Failed to update profile. Please try again.');
    }
  };
}
```

### Long-Running Operations

```typescript
function DataImport() {
  const { info, success, error } = useToast();
  
  const handleImport = async () => {
    info('Starting import...', 2000);
    
    try {
      await importData();
      success('Import completed! 1,234 records processed.');
    } catch (err) {
      error('Import failed. Check the logs for details.');
    }
  };
}
```

### Confirmation Actions

```typescript
function DeleteButton() {
  const { success, warning } = useToast();
  
  const handleDelete = async () => {
    warning('This action cannot be undone', 3000);
    
    // After confirmation
    await deleteItem();
    success('Item deleted successfully');
  };
}
```

## Migration from Alert

### Before (Outdated)

```typescript
if (success) {
  alert('Operation completed successfully!');
}
```

### After (Modern)

```typescript
import { useToast } from '../contexts/ToastContext';

function MyComponent() {
  const { success } = useToast();
  
  if (operationSuccess) {
    success('Operation completed successfully!');
  }
}
```

## Configuration

### Toast Duration

Default auto-dismiss: 5000ms (5 seconds)

Change per toast:
```typescript
success('Quick message', 2000);  // 2 seconds
info('Stay visible', 0);         // No auto-dismiss
```

### Debug Mode

Alert interception logs to console in development mode. Disable by setting:

```typescript
setupAlertInterceptor({ 
  showToast: addToast,
  debug: false 
});
```

## Best Practices

1. Use appropriate toast types for context
2. Keep messages concise and actionable
3. Avoid toast spam (multiple toasts in rapid succession)
4. Use longer durations for important messages
5. Consider using no auto-dismiss (duration: 0) for critical errors
6. Test toast behavior with real data

## Browser Compatibility

Works in all modern browsers that support:
- CSS animations
- ES6+ JavaScript
- React 18+

No polyfills required.

