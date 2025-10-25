import { highlightKeywords } from '../highlightKeywords';

describe('highlightKeywords', () => {
  it('should return escaped text when no keywords provided', () => {
    const text = 'This is a simple job description';
    const result = highlightKeywords(text, { mustHaves: [], blockers: [] });
    expect(result).toBe(text);
  });

  it('should highlight must-have keywords in green', () => {
    const text = 'We need C# and Azure experience';
    const result = highlightKeywords(text, { mustHaves: ['C#', 'Azure'], blockers: [] });
    expect(result).toContain('bg-green-200');
    expect(result).toContain('C#');
    expect(result).toContain('Azure');
  });

  it('should highlight blocker keywords in red', () => {
    const text = 'Must have 5 years of AWS and Python experience';
    const result = highlightKeywords(text, { mustHaves: [], blockers: ['AWS', 'Python'] });
    expect(result).toContain('bg-red-200');
    expect(result).toContain('AWS');
    expect(result).toContain('Python');
  });

  it('should prioritize must-haves over blockers for same keyword', () => {
    const text = 'Azure experience required';
    const result = highlightKeywords(text, { mustHaves: ['Azure'], blockers: ['Azure'] });
    expect(result).toContain('bg-green-200');
    expect(result).not.toContain('bg-red-200');
  });

  it('should be case-insensitive', () => {
    const text = 'azure and AZURE and Azure';
    const result = highlightKeywords(text, { mustHaves: ['Azure'], blockers: [] });
    const greenMatches = result.match(/bg-green-200/g);
    expect(greenMatches).toHaveLength(3);
  });

  it('should handle special characters in keywords', () => {
    const text = 'We use .NET Core and ASP.NET';
    const result = highlightKeywords(text, { mustHaves: ['.NET', 'ASP.NET'], blockers: [] });
    expect(result).toContain('.NET');
    expect(result).toContain('ASP.NET');
  });

  it('should escape HTML in text', () => {
    const text = 'Experience with <script>alert("test")</script>';
    const result = highlightKeywords(text, { mustHaves: [], blockers: [] });
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('should handle empty text', () => {
    const result = highlightKeywords('', { mustHaves: ['test'], blockers: [] });
    expect(result).toBe('');
  });

  it('should handle multiple occurrences of same keyword', () => {
    const text = 'C# developer with C# experience and C# skills';
    const result = highlightKeywords(text, { mustHaves: ['C#'], blockers: [] });
    const matches = result.match(/bg-green-200/g);
    expect(matches).toHaveLength(3);
  });
});

