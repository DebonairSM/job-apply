# Leads Soft Delete Implementation

## Overview

Implemented soft delete functionality for LinkedIn leads with the following features:
- Soft delete prevents re-adding deleted leads in future scrapes
- Multiple identification methods (profile URL, LinkedIn ID, name+email)
- Delete button in lead detail modal
- Improved metadata display

## Changes Made

### 1. Database Schema Updates (`src/lib/db.ts`)

Added `deleted_at` column to the `leads` table:

```typescript
// Migration added
try {
  database.exec(`ALTER TABLE leads ADD COLUMN deleted_at TEXT`);
} catch (e) {
  // Column already exists, ignore
}
```

Updated `Lead` interface:
```typescript
export interface Lead {
  id: string;
  name: string;
  // ... other fields
  deleted_at?: string;
}
```

### 2. Duplicate Detection Logic

Added `leadExistsIncludingDeleted()` function that checks for existing leads using multiple methods:
- Profile URL (most reliable)
- LinkedIn ID (if available)
- Name + Email combination (if both available)

This prevents re-adding leads that have been soft-deleted, even if they appear again in LinkedIn searches.

### 3. Query Functions Updated

All lead query functions now exclude soft-deleted leads by default:

```typescript
// Before
SELECT * FROM leads WHERE 1=1

// After  
SELECT * FROM leads WHERE deleted_at IS NULL
```

Updated functions:
- `getLeads()`
- `getLeadsCount()`
- `getLeadStats()`
- `leadExistsByUrl()`

### 4. Soft Delete Function

Added new function to mark leads as deleted:

```typescript
export function softDeleteLead(id: string): boolean {
  const database = getDb();
  const stmt = database.prepare(`
    UPDATE leads 
    SET deleted_at = CURRENT_TIMESTAMP 
    WHERE id = ? AND deleted_at IS NULL
  `);
  
  const result = stmt.run(id);
  return result.changes > 0;
}
```

### 5. API Endpoint (`src/dashboard/routes/leads.ts`)

Added DELETE endpoint:

```typescript
// DELETE /api/leads/:id - Soft delete a lead
router.delete('/:id', (req, res) => {
  try {
    const success = softDeleteLead(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Lead not found or already deleted' });
    }
    
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});
```

### 6. Frontend Updates

#### API Client (`src/dashboard/client/lib/api.ts`)

Added generic delete method:

```typescript
async delete(endpoint: string): Promise<{ data: any }> {
  const url = endpoint.startsWith('/') ? `${API_BASE}${endpoint}` : `${API_BASE}/${endpoint}`;
  const response = await fetch(url, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete ${endpoint}`);
  const data = await response.json();
  return { data };
}
```

#### Lead Detail Component (`src/dashboard/client/components/LeadDetail.tsx`)

Added delete button with confirmation:

```typescript
const handleDelete = async () => {
  if (!confirm(`Are you sure you want to delete ${lead.name}? This lead will not be re-added in future scrapes.`)) {
    return;
  }

  setIsDeleting(true);
  try {
    await api.delete(`/leads/${lead.id}`);
    await queryClient.invalidateQueries({ queryKey: ['leads'] });
    await queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
    onClose();
  } catch (error) {
    console.error('Error deleting lead:', error);
    alert('Failed to delete lead. Please try again.');
    setIsDeleting(false);
  }
};
```

Improved metadata display:
- Removed redundant "Scraped" and "Added" timestamps (they were always the same)
- Kept "LinkedIn ID" and "Profile Added" date
- Shows information only when LinkedIn ID is available

#### Lead List Component (`src/dashboard/client/components/LeadsList.tsx`)

Updated `Lead` interface to include `deleted_at` field.

## Usage

### Deleting a Lead

1. Open the lead detail modal by clicking on any lead in the list
2. Click the red "Delete Lead" button at the bottom left
3. Confirm the deletion when prompted
4. The lead will be soft-deleted and removed from the list
5. Future scrapes will skip this lead even if it appears in LinkedIn searches

### Identification Methods

The system prevents re-adding deleted leads using these checks (in order):

1. **Profile URL** - Most reliable, always checked
2. **LinkedIn ID** - Checked if available (extracted from profile URL)
3. **Name + Email** - Checked if both fields are available

This multi-layered approach ensures deleted leads stay deleted even if:
- Their profile URL changes
- They change their name or company
- Their LinkedIn ID is not available

## Database Impact

- Existing leads are unaffected (migration adds column with NULL default)
- Soft-deleted leads remain in the database with `deleted_at` timestamp
- Statistics and queries automatically exclude soft-deleted leads
- No data loss - leads can be restored manually via database if needed

## Testing

To test the implementation:

1. Run the dashboard: `npm run dashboard`
2. Scrape some leads: `npm run leads:search -- --max 5`
3. Open a lead detail and click "Delete Lead"
4. Run the same scrape again - the deleted lead should not be re-added
5. Check the database to verify `deleted_at` is set:
   ```sql
   SELECT name, deleted_at FROM leads WHERE deleted_at IS NOT NULL;
   ```

## Future Enhancements

Possible improvements:
- Add "Restore" functionality for soft-deleted leads
- Add bulk delete functionality
- Add "Deleted Leads" view to see and manage deleted leads
- Add delete reason field
- Add statistics on deleted leads

