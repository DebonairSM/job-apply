import { initDb, addProhibitedKeyword, getProhibitedKeywords } from '../src/lib/db.js';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: tsx scripts/add-prohibited-keyword.ts <keyword> [match_mode] [reason]');
  console.log('');
  console.log('Match modes:');
  console.log('  word     - matches whole word only (default for single keywords)');
  console.log('  sentence - all keywords must appear in same sentence (default for comma-separated)');
  console.log('');
  console.log('Examples:');
  console.log('  tsx scripts/add-prohibited-keyword.ts python word');
  console.log('  tsx scripts/add-prohibited-keyword.ts "python,required" sentence');
  console.log('  tsx scripts/add-prohibited-keyword.ts "python,required" sentence "Python not in stack"');
  console.log('');
  console.log('📋 Current prohibited keywords:');
  initDb();
  const current = getProhibitedKeywords();
  if (current.length === 0) {
    console.log('  (none)');
  } else {
    current.forEach(k => {
      console.log(`  • ${k.keyword} (${k.match_mode})${k.reason ? ` - ${k.reason}` : ''}`);
    });
  }
  process.exit(1);
}

initDb();

const keyword = args[0];
// Determine default match mode: sentence for comma-separated, word for single
const defaultMode = keyword.includes(',') ? 'sentence' : 'word';
const matchMode = args[1] || defaultMode;
const reason = args[2] || undefined;

// Validate match mode
if (matchMode !== 'word' && matchMode !== 'sentence') {
  console.error(`❌ Invalid match mode: ${matchMode}`);
  console.error('   Valid modes: word, sentence');
  process.exit(1);
}

try {
  addProhibitedKeyword(keyword, matchMode, reason);
  console.log(`✅ Added prohibited keyword: "${keyword}" (${matchMode} mode)`);
  if (reason) {
    console.log(`   Reason: ${reason}`);
  }
  
  console.log('\n📋 All prohibited keywords:');
  const all = getProhibitedKeywords();
  if (all.length === 0) {
    console.log('  (none)');
  } else {
    all.forEach(k => {
      console.log(`  • ${k.keyword} (${k.match_mode})${k.reason ? ` - ${k.reason}` : ''}`);
    });
  }
} catch (error) {
  console.error(`❌ Error: ${(error as Error).message}`);
  process.exit(1);
}

























