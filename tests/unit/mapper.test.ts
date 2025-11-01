import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapLabelsSmart, CANONICAL_KEYS, CanonicalKey } from '../src/ai/mapper.js';

// Test cases: real form labels with expected canonical keys
const TEST_CASES: Array<{ label: string; expected: CanonicalKey }> = [
  { label: 'Full Legal Name', expected: 'full_name' },
  { label: 'First and Last Name', expected: 'full_name' },
  { label: 'Your Name', expected: 'full_name' },
  
  { label: 'Email Address', expected: 'email' },
  { label: 'E-mail', expected: 'email' },
  { label: 'Work Email', expected: 'email' },
  
  { label: 'Phone Number', expected: 'phone' },
  { label: 'Mobile Phone', expected: 'phone' },
  { label: 'Telephone', expected: 'phone' },
  
  { label: 'City', expected: 'city' },
  { label: 'Location', expected: 'city' },
  { label: 'Where are you located?', expected: 'city' },
  
  { label: 'Are you authorized to work in the US?', expected: 'work_authorization' },
  { label: 'Work Authorization', expected: 'work_authorization' },
  { label: 'Legal authorization to work', expected: 'work_authorization' },
  
  { label: 'Do you require sponsorship?', expected: 'requires_sponsorship' },
  { label: 'Visa Sponsorship Required?', expected: 'requires_sponsorship' },
  { label: 'Will you require visa sponsorship?', expected: 'requires_sponsorship' },
  
  { label: 'Years of .NET experience', expected: 'years_dotnet' },
  { label: 'Experience with .NET', expected: 'years_dotnet' },
  
  { label: 'Years of Azure experience', expected: 'years_azure' },
  { label: 'Azure experience', expected: 'years_azure' },
  
  { label: 'LinkedIn Profile', expected: 'linkedin_url' },
  { label: 'LinkedIn URL', expected: 'linkedin_url' },
  
  { label: 'Salary Expectations', expected: 'salary_expectation' },
  { label: 'Expected Compensation', expected: 'salary_expectation' },
  
  { label: 'Why are you interested in this role?', expected: 'why_fit' },
  { label: 'Why are you a good fit?', expected: 'why_fit' },
  { label: 'Cover Letter', expected: 'why_fit' },
  
  { label: 'Timezone', expected: 'us_timezone' },
  { label: 'What timezone are you in?', expected: 'us_timezone' }
];

describe('Mapper Evaluation', () => {
  it('should achieve >= 95% accuracy on test cases', async () => {
    const labels = TEST_CASES.map(tc => tc.label);
    const mappings = await mapLabelsSmart(labels);
    
    let correct = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < TEST_CASES.length; i++) {
      const testCase = TEST_CASES[i];
      const mapping = mappings.find(m => m.label === testCase.label);
      
      if (!mapping) {
        errors.push(`Missing mapping for: ${testCase.label}`);
        continue;
      }
      
      if (mapping.key === testCase.expected) {
        correct++;
      } else {
        errors.push(`${testCase.label}: expected '${testCase.expected}', got '${mapping.key}'`);
      }
    }
    
    const accuracy = (correct / TEST_CASES.length) * 100;
    
    console.log(`\n📊 Mapper Test Results:`);
    console.log(`   Correct: ${correct}/${TEST_CASES.length}`);
    console.log(`   Accuracy: ${accuracy.toFixed(1)}%`);
    
    if (errors.length > 0) {
      console.log(`\n❌ Errors:`);
      errors.forEach(err => console.log(`   - ${err}`));
    }
    
    assert.ok(accuracy >= 95, `Accuracy ${accuracy.toFixed(1)}% is below 95% threshold`);
  });
  
  it('should return high confidence for heuristic matches', async () => {
    const simpleLabels = ['Email Address', 'Phone Number', 'Full Name'];
    const mappings = await mapLabelsSmart(simpleLabels);
    
    for (const mapping of mappings) {
      assert.ok(
        mapping.confidence >= 0.95,
        `Expected high confidence for "${mapping.label}", got ${mapping.confidence}`
      );
    }
  });
  
  it('should handle unknown labels gracefully', async () => {
    const unknownLabels = ['Random Field XYZ', 'Foo Bar Baz'];
    const mappings = await mapLabelsSmart(unknownLabels);
    
    // Should either map to unknown or make a best guess with lower confidence
    for (const mapping of mappings) {
      assert.ok(
        mapping.key === 'unknown' || mapping.confidence < 0.95,
        'Unknown labels should map to unknown or have lower confidence'
      );
    }
  });
});

// Note: Run with: tsx --test tests/mapper.test.ts
// Or: npm test (after configuring package.json)


