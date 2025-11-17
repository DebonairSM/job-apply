# Confirmation Dialogs System

Modern confirmation dialog system that replaces browser's native `confirm()` and `alert()` with styled modal dialogs.

## Overview

The confirmation dialog system provides:
- Modern modal dialogs with backdrop blur
- Three variants: danger, warning, primary
- Async operation support
- Consistent styling across the application
- Better user experience than browser alerts

## Usage

### Basic Usage

```typescript
import { useConfirm } from '../contexts/ConfirmDialogContext';

function MyComponent() {
  const { confirm } = useConfirm();

  const handleDelete = () => {
    confirm({
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      confirmVariant: 'danger',
      onConfirm: async () => {
        await deleteItem();
      }
    });
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

### Dialog Options

```typescript
interface ConfirmOptions {
  title: string;                                    // Dialog title
  message: string;                                  // Main message text
  confirmLabel?: string;                            // Confirm button text (default: 'Confirm')
  cancelLabel?: string;                             // Cancel button text (default: 'Cancel')
  confirmVariant?: 'danger' | 'primary' | 'warning'; // Button style (default: 'primary')
  onConfirm: () => void | Promise<void>;            // Callback when confirmed
  onCancel?: () => void;                            // Optional callback when cancelled
}
```

### Dialog Variants

Different variants for different contexts:

```typescript
// Danger - for destructive actions (red button)
confirm({
  title: 'Delete Lead',
  message: 'This lead will be permanently removed.',
  confirmVariant: 'danger',
  onConfirm: async () => {
    await deleteLead();
  }
});

// Warning - for potentially risky actions (yellow/amber button)
confirm({
  title: 'Stop Scraping',
  message: 'This will stop the current scraping run.',
  confirmVariant: 'warning',
  onConfirm: async () => {
    await stopScraping();
  }
});

// Primary - for general confirmations (purple button)
confirm({
  title: 'Confirm Action',
  message: 'Do you want to proceed?',
  confirmVariant: 'primary',
  onConfirm: async () => {
    await performAction();
  }
});
```

### Async Operations

The dialog automatically handles async operations:

```typescript
confirm({
  title: 'Save Changes',
  message: 'Save your changes before closing?',
  confirmLabel: 'Save',
  onConfirm: async () => {
    // The dialog will show "Processing..." while this runs
    await saveChanges();
    // Dialog closes automatically when done
  }
});
```

### Cancel Callback

Optional callback when user cancels:

```typescript
confirm({
  title: 'Discard Changes',
  message: 'You have unsaved changes. Discard them?',
  onConfirm: () => {
    discardChanges();
  },
  onCancel: () => {
    console.log('User kept their changes');
  }
});
```

## Architecture

### Components

1. **ConfirmDialogContext.tsx** - Context provider managing dialog state
   - Provides `useConfirm()` hook
   - Manages dialog visibility and options
   - Renders the confirmation modal

2. **ConfirmDialog** - Internal modal component
   - Backdrop with blur effect
   - Animated slide-in entrance
   - Handles processing state during async operations
   - Variant-specific button styling

### Integration

The dialog system is integrated at the app root level:

```typescript
function App() {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <AppContent />
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}
```

## Styling

Confirmation dialogs use Tailwind CSS with custom styling:

- **Backdrop**: Black with 50% opacity and backdrop blur
- **Modal**: White background, rounded corners, shadow
- **Danger button**: Red (bg-red-600, hover:bg-red-700)
- **Warning button**: Yellow (bg-yellow-600, hover:bg-yellow-700)
- **Primary button**: Purple (bg-purple-600, hover:bg-purple-700)
- **Cancel button**: Gray (bg-gray-100, hover:bg-gray-200)

Animations use the existing `animate-slide-in-right` from the toast system.

## Examples

### Delete Confirmation

```typescript
const handleDelete = () => {
  confirm({
    title: 'Delete Lead',
    message: `Are you sure you want to delete ${lead.name}? This lead will not be re-added in future scrapes.`,
    confirmLabel: 'Delete',
    confirmVariant: 'danger',
    onConfirm: async () => {
      await api.delete(`/leads/${lead.id}`);
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      success('Lead deleted successfully');
      onClose();
    }
  });
};
```

### Stop Operation

```typescript
const handleStop = () => {
  confirm({
    title: 'Stop Scraping',
    message: 'Are you sure you want to stop this scraping run? It can be resumed later.',
    confirmLabel: 'Stop',
    confirmVariant: 'warning',
    onConfirm: async () => {
      await api.post(`/leads/runs/${runId}/stop`);
      success('Scraping stopped successfully!');
      refetch();
    }
  });
};
```

### Cleanup Operation

```typescript
const handleCleanup = () => {
  confirm({
    title: 'Cleanup Incomplete Leads',
    message: 'This will remove all leads that have ONLY a name but are missing title, company, location, AND email. Continue?',
    confirmLabel: 'Cleanup',
    confirmVariant: 'warning',
    onConfirm: async () => {
      const response = await api.post('/leads/cleanup-incomplete');
      success(`Cleanup complete. ${response.data.count} leads removed.`);
      refetchLeads();
    }
  });
};
```

## Migration from confirm()

### Before (Browser Alert)

```typescript
const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this?')) {
    return;
  }
  
  await deleteItem();
  success('Deleted!');
};
```

### After (Modern Dialog)

```typescript
const { confirm } = useConfirm();

const handleDelete = () => {
  confirm({
    title: 'Delete Item',
    message: 'Are you sure you want to delete this?',
    confirmLabel: 'Delete',
    confirmVariant: 'danger',
    onConfirm: async () => {
      await deleteItem();
      success('Deleted!');
    }
  });
};
```

## Best Practices

1. Use descriptive titles that clearly state the action
2. Include consequences in the message when relevant
3. Choose the appropriate variant:
   - `danger` for destructive actions (delete, remove)
   - `warning` for potentially risky actions (stop, cleanup)
   - `primary` for general confirmations
4. Keep messages concise but informative
5. Always handle errors in the onConfirm callback
6. Show toast notifications after successful operations
7. Use specific confirm button labels ("Delete" not "OK")

## Browser Compatibility

Works in all modern browsers that support:
- CSS backdrop-filter (for blur effect)
- ES6+ JavaScript
- React 18+

Fallback styling is provided for browsers without backdrop-filter support.

## Related Systems

- **Toast Notifications**: Use toasts for feedback after confirmation actions
- **Alert Interception**: Browser `alert()` calls are converted to toasts automatically
- Both systems work together to provide consistent user feedback

## Current Usage

The confirmation dialog system is currently used in:
- LeadDetail.tsx: Delete lead confirmation
- CampaignsPage.tsx: Delete campaign confirmation
- ActiveScrapingStatus.tsx: Stop scraping confirmation
- LeadsList.tsx: Cleanup incomplete leads confirmation

All previous `window.confirm()` and `confirm()` calls have been replaced with the modern dialog system.

