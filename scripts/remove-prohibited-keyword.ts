import { initDb, removeProhibitedKeyword, getProhibitedKeywords } from '../src/lib/db.js';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: tsx scripts/remove-prohibited-keyword.ts <keyword>');
  console.log('');
  console.log('Examples:');
  console.log('  tsx scripts/remove-prohibited-keyword.ts python');
  console.log('  tsx scripts/remove-prohibited-keyword.ts "python,required"');
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

try {
  const before = getProhibitedKeywords();
  const beforeCount = before.length;
  
  removeProhibitedKeyword(keyword);
  
  const after = getProhibitedKeywords();
  const afterCount = after.length;
  
  if (beforeCount === afterCount) {
    console.log(`⚠️  Keyword "${keyword}" not found in prohibited keywords list`);
    console.log('\n📋 Current prohibited keywords:');
    if (after.length === 0) {
      console.log('  (none)');
    } else {
      after.forEach(k => {
        console.log(`  • ${k.keyword} (${k.match_mode})${k.reason ? ` - ${k.reason}` : ''}`);
      });
    }
    process.exit(1);
  }
  
  console.log(`✅ Removed prohibited keyword: "${keyword}"`);
  
  console.log('\n📋 Remaining prohibited keywords:');
  if (after.length === 0) {
    console.log('  (none)');
  } else {
    after.forEach(k => {
      console.log(`  • ${k.keyword} (${k.match_mode})${k.reason ? ` - ${k.reason}` : ''}`);
    });
  }
} catch (error) {
  console.error(`❌ Error: ${(error as Error).message}`);
  process.exit(1);
}






















