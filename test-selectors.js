const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('./artifacts/li-job.html', 'utf8');
const $ = cheerio.load(html);

const selectors = [
  '.tvm__text.tvm__text--positive span',
  '.tvm__text--positive span',
  '.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text--positive',
  '.job-details-jobs-unified-top-card__tertiary-description-container span',
  '.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text--positive strong span',
  '.job-details-jobs-unified-top-card__tertiary-description-container strong span'
];

console.log('Testing selectors on the HTML file:');
for (const selector of selectors) {
  const text = $(selector).text().trim();
  if (text) {
    console.log(`✅ Selector: ${selector} -> Text: "${text}"`);
  } else {
    console.log(`❌ Selector: ${selector} -> No text found`);
  }
}
