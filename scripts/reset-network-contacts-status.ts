import { getDb } from '../src/lib/db.js';

/**
 * Reset network contacts status to 'never' except for specified contacts
 * This resets: last_message_status, message_count, first_contacted_at, last_contacted_at, last_error
 */

const CONTACTS_TO_KEEP = [
  'John Roemer',
  'Sabir Foux',
  'Kevin Ronayne'
];

async function resetNetworkContactsStatus(): Promise<void> {
  const database = getDb();

  console.log('🔄 Resetting network contacts status...\n');

  // Get all contacts
  const allContacts = database.prepare('SELECT id, name, last_message_status, message_count FROM network_contacts').all() as Array<{
    id: string;
    name: string;
    last_message_status: string;
    message_count: number;
  }>;

  console.log(`📊 Total contacts: ${allContacts.length}`);
  console.log(`🔒 Contacts to preserve: ${CONTACTS_TO_KEEP.join(', ')}\n`);

  // Find contacts to keep
  const contactsToKeep = allContacts.filter(c => CONTACTS_TO_KEEP.includes(c.name));
  console.log(`✅ Found ${contactsToKeep.length} contacts to keep:`);
  contactsToKeep.forEach(c => {
    console.log(`   - ${c.name} (status: ${c.last_message_status}, messages: ${c.message_count})`);
  });

  // Find contacts to reset
  const contactsToReset = allContacts.filter(c => !CONTACTS_TO_KEEP.includes(c.name));
  console.log(`\n🔄 Found ${contactsToReset.length} contacts to reset`);

  if (contactsToReset.length === 0) {
    console.log('\n✨ No contacts to reset. Done!');
    return;
  }

  // Show a few examples of what will be reset
  const exampleCount = Math.min(5, contactsToReset.length);
  console.log(`\n📝 Example contacts that will be reset (showing ${exampleCount} of ${contactsToReset.length}):`);
  contactsToReset.slice(0, exampleCount).forEach(c => {
    console.log(`   - ${c.name} (current status: ${c.last_message_status}, messages: ${c.message_count})`);
  });

  // Reset contacts
  const resetStmt = database.prepare(`
    UPDATE network_contacts
    SET 
      last_message_status = 'never',
      message_count = 0,
      first_contacted_at = NULL,
      last_contacted_at = NULL,
      last_error = NULL,
      updated_at = datetime('now')
    WHERE id = ?
  `);

  let resetCount = 0;
  for (const contact of contactsToReset) {
    const result = resetStmt.run(contact.id);
    if (result.changes > 0) {
      resetCount++;
    }
  }

  console.log(`\n✅ Successfully reset ${resetCount} contacts to 'never' status`);
  console.log(`🔒 Preserved ${contactsToKeep.length} contacts: ${CONTACTS_TO_KEEP.join(', ')}`);

  // Verify the results
  const stillMessaged = database.prepare(`
    SELECT COUNT(*) as count 
    FROM network_contacts 
    WHERE last_message_status != 'never'
  `).get() as { count: number };

  console.log(`\n📊 Final status: ${stillMessaged.count} contacts still have message status (should be ${contactsToKeep.length})`);

  if (stillMessaged.count !== contactsToKeep.length) {
    console.warn(`⚠️  Warning: Expected ${contactsToKeep.length} contacts with message status, but found ${stillMessaged.count}`);
  } else {
    console.log('✨ All done! Status reset complete.');
  }
}

// Run the script
resetNetworkContactsStatus()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error resetting network contacts status:', error);
    process.exit(1);
  });

