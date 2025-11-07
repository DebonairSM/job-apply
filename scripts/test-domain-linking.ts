/**
 * Test bare domain linking
 */

const testText = `Hello,

Check out vsol.software for more info.

Contact us at info@vsol.software

Visit www.example.com or https://google.com

Best regards,
John`;

console.log('Original text:');
console.log(testText);
console.log('\n' + '='.repeat(80) + '\n');

// Simulate the conversion order with protection
let result = testText;

const protectedLinks: string[] = [];
const protectLinks = (text: string) => {
  return text.replace(/<a [^>]+>[^<]+<\/a>/g, (match) => {
    protectedLinks.push(match);
    return `___PROTECTED_LINK_${protectedLinks.length - 1}___`;
  });
};

const restoreLinks = (text: string) => {
  let restored = text;
  protectedLinks.forEach((link, index) => {
    restored = restored.replace(`___PROTECTED_LINK_${index}___`, link);
  });
  return restored;
};

// Step 1: Protect existing links (none in this case)
result = protectLinks(result);

// Step 2: Convert https:// URLs
result = result.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');

// Step 3: Convert www. URLs  
result = result.replace(/\b(www\.[^\s<]+)/g, '<a href="https://$1">$1</a>');

// Step 4: Convert emails
result = result.replace(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g, '<a href="mailto:$1">$1</a>');

console.log('After email conversion:');
console.log(result);
console.log('\n' + '='.repeat(80) + '\n');

// Step 5: Protect newly created links
result = protectLinks(result);

console.log('After protecting links:');
console.log(result);
console.log('\n' + '='.repeat(80) + '\n');

// Step 6: Convert bare domains (won't match protected links)
result = result.replace(/\b([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)\b/g, '<a href="https://$1">$1</a>');

// Step 7: Restore protected links
result = restoreLinks(result);

console.log('After bare domain conversion:');
console.log(result);
console.log('\n' + '='.repeat(80) + '\n');

// Check results
const checks = [
  { text: 'vsol.software standalone', pass: result.includes('<a href="https://vsol.software">vsol.software</a>') },
  { text: 'email NOT double-linked', pass: !result.includes('<a href="https://info@vsol.software">') },
  { text: 'email domain inside mailto', pass: result.includes('<a href="mailto:info@vsol.software">') },
  { text: 'www. URL converted', pass: result.includes('<a href="https://www.example.com">') },
  { text: 'https:// URL converted', pass: result.includes('<a href="https://google.com">') }
];

console.log('Test Results:');
checks.forEach(check => {
  console.log(`${check.pass ? '✅' : '❌'} ${check.text}`);
});

