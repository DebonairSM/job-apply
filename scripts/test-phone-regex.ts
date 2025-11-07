/**
 * Test phone number regex
 */

const testText = '📞 (352) 397-8650 | ✉️ info@vsol.software';

console.log('Original text:', testText);
console.log('\n');

// Test current regex
const result1 = testText.replace(/\((\d{3})\)\s*(\d{3})-(\d{4})/g, '<a href="tel:+1$1$2$3" style="color: #0066cc; text-decoration: underline;">($1) $2-$3</a>');
console.log('After replacement:', result1);
console.log('\n');

// Check what's being matched
const regex = /\((\d{3})\)\s*(\d{3})-(\d{4})/g;
const match = regex.exec(testText);
if (match) {
  console.log('Match found:');
  console.log('  Full match:', match[0]);
  console.log('  Group 1 (area):', match[1]);
  console.log('  Group 2 (prefix):', match[2]);
  console.log('  Group 3 (line):', match[3]);
} else {
  console.log('No match found!');
}

