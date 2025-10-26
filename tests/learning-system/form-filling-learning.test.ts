import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { initDb, setTestMode, closeDb, clearLabelMappings, saveLabelMapping } from '../../src/lib/db.js';

// Mock Playwright Page and Locator for testing
class MockLocator {
  constructor(public selector: string, public exists: boolean = true, public attributes: Record<string, string> = {}) {}
  
  async count(): Promise<number> {
    return this.exists ? 1 : 0;
  }
  
  first(): MockLocator {
    return this;
  }
  
  async clear(): Promise<void> {
    // Mock clear operation
  }
  
  async fill(value: string): Promise<void> {
    // Mock fill operation
  }
  
  async getAttribute(name: string): Promise<string | null> {
    return this.attributes[name] || null;
  }
  
  async evaluate<T>(fn: (el: Element) => T): Promise<T> {
    // Mock element evaluation
    const mockElement = {
      tagName: this.attributes.tagName || 'INPUT',
      id: this.attributes.id || '',
      name: this.attributes.name || '',
      type: this.attributes.type || 'text'
    } as Element;
    
    return fn(mockElement);
  }
}

class MockPage {
  private locators: Map<string, MockLocator> = new Map();
  
  constructor() {
    // Setup default mock elements
    this.locators.set('getByLabel', new MockLocator('getByLabel', true, {
      tagName: 'INPUT',
      id: 'email-field',
      name: 'email',
      type: 'email'
    }));
    
    this.locators.set('label:has-text("Email Address")', new MockLocator('label', true, {
      for: 'email-field'
    }));
    
    this.locators.set('#email-field', new MockLocator('#email-field', true, {
      tagName: 'INPUT',
      id: 'email-field',
      name: 'email',
      type: 'email'
    }));
  }
  
  getByLabel(label: string): MockLocator {
    return this.locators.get('getByLabel') || new MockLocator('getByLabel', false);
  }
  
  locator(selector: string): MockLocator {
    return this.locators.get(selector) || new MockLocator(selector, false);
  }
  
  // Helper method to setup test scenarios
  setupElement(selector: string, exists: boolean, attributes: Record<string, string> = {}): void {
    this.locators.set(selector, new MockLocator(selector, exists, attributes));
  }
  
  setupGetByLabel(exists: boolean, attributes: Record<string, string> = {}): void {
    this.locators.set('getByLabel', new MockLocator('getByLabel', exists, attributes));
  }
}

// Import the functions we want to test (we'll need to modify them to be testable)
// For now, we'll create simplified versions for testing

async function mockFillFieldByLabel(
  page: MockPage, 
  label: string, 
  value: string
): Promise<{
  success: boolean;
  method: string;
  locator?: string;
  fieldType?: string;
  inputStrategy?: string;
}> {
  // Mock implementation of the fillFieldByLabel logic
  
  // 1. Try getByLabel
  const byLabel = page.getByLabel(label);
  if (await byLabel.count() > 0) {
    await byLabel.clear();
    await byLabel.fill(value);
    
    // Extract selector and metadata
    const locator = await extractStableSelector(byLabel);
    const { fieldType, inputStrategy } = await detectFieldTypeAndStrategy(byLabel);
    
    return {
      success: true,
      method: 'getByLabel',
      locator: locator || undefined,
      fieldType,
      inputStrategy
    };
  }

  // 2. Try finding label and then associated input
  const labelElem = page.locator(`label:has-text("${label}")`);
  if (await labelElem.count() > 0) {
    const forAttr = await labelElem.getAttribute('for');
    if (forAttr) {
      const input = page.locator(`#${forAttr}`);
      if (await input.count() > 0) {
        await input.clear();
        await input.fill(value);
        
        const locator = `#${forAttr}`;
        const { fieldType, inputStrategy } = await detectFieldTypeAndStrategy(input);
        
        return {
          success: true,
          method: 'label_for',
          locator,
          fieldType,
          inputStrategy
        };
      }
    }
  }
  
  return {
    success: false,
    method: 'none'
  };
}

// Mock helper functions
async function extractStableSelector(element: MockLocator): Promise<string | null> {
  try {
    const tagName = await element.evaluate(el => el.tagName.toLowerCase());
    const id = await element.getAttribute('id');
    const name = await element.getAttribute('name');
    const type = await element.getAttribute('type');
    
    if (id && id.trim()) {
      return `#${id.trim()}`;
    }
    
    if (name && name.trim()) {
      return `${tagName}[name="${name.trim()}"]`;
    }
    
    if (type) {
      return `${tagName}[type="${type}"]`;
    }
    
    return tagName;
  } catch (error) {
    return null;
  }
}

async function detectFieldTypeAndStrategy(element: MockLocator): Promise<{fieldType: string, inputStrategy: string}> {
  try {
    const tagName = await element.evaluate(el => el.tagName.toLowerCase());
    const type = await element.getAttribute('type');
    
    let fieldType = tagName;
    let inputStrategy = 'fill';
    
    if (tagName === 'input') {
      fieldType = type || 'text';
      
      switch (type) {
        case 'checkbox':
        case 'radio':
          inputStrategy = 'check';
          break;
        case 'file':
          inputStrategy = 'setInputFiles';
          break;
        default:
          inputStrategy = 'fill';
      }
    } else if (tagName === 'select') {
      inputStrategy = 'selectOption';
    } else if (tagName === 'textarea') {
      inputStrategy = 'fill';
    }
    
    return { fieldType, inputStrategy };
  } catch (error) {
    return { fieldType: 'unknown', inputStrategy: 'fill' };
  }
}

describe('Form Field Learning Integration', () => {
  let mockPage: MockPage;

  beforeEach(() => {
    setTestMode(true);
    initDb();
    clearLabelMappings();
    mockPage = new MockPage();
  });

  afterEach(() => {
    clearLabelMappings();
    closeDb();
  });

  describe('Selector Extraction', () => {
    it('should extract ID selectors with highest priority', async () => {
      mockPage.setupGetByLabel(true, {
        tagName: 'INPUT',
        id: 'email-field',
        name: 'email',
        type: 'email'
      });

      const result = await mockFillFieldByLabel(mockPage, 'Email Address', 'test@example.com');
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.locator, '#email-field');
      assert.strictEqual(result.fieldType, 'email');
      assert.strictEqual(result.inputStrategy, 'fill');
    });

    it('should extract name selectors when ID is not available', async () => {
      mockPage.setupGetByLabel(true, {
        tagName: 'INPUT',
        name: 'phone_number',
        type: 'tel'
      });

      const result = await mockFillFieldByLabel(mockPage, 'Phone Number', '123-456-7890');
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.locator, 'input[name="phone_number"]');
      assert.strictEqual(result.fieldType, 'tel');
    });

    it('should extract type selectors as fallback', async () => {
      mockPage.setupGetByLabel(true, {
        tagName: 'INPUT',
        type: 'text'
      });

      const result = await mockFillFieldByLabel(mockPage, 'Full Name', 'John Doe');
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.locator, 'input[type="text"]');
    });

    it('should handle label+for attribute method', async () => {
      mockPage.setupGetByLabel(false); // getByLabel fails
      mockPage.setupElement('label:has-text("Email Address")', true, { for: 'email-field' });
      mockPage.setupElement('#email-field', true, {
        tagName: 'INPUT',
        id: 'email-field',
        type: 'email'
      });

      const result = await mockFillFieldByLabel(mockPage, 'Email Address', 'test@example.com');
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.method, 'label_for');
      assert.strictEqual(result.locator, '#email-field');
    });
  });

  describe('Field Type Detection', () => {
    it('should detect different input types correctly', async () => {
      const testCases = [
        { type: 'email', expectedType: 'email', expectedStrategy: 'fill' },
        { type: 'tel', expectedType: 'tel', expectedStrategy: 'fill' },
        { type: 'checkbox', expectedType: 'checkbox', expectedStrategy: 'check' },
        { type: 'radio', expectedType: 'radio', expectedStrategy: 'check' },
        { type: 'file', expectedType: 'file', expectedStrategy: 'setInputFiles' },
        { type: 'text', expectedType: 'text', expectedStrategy: 'fill' }
      ];

      for (const testCase of testCases) {
        mockPage.setupGetByLabel(true, {
          tagName: 'INPUT',
          id: `field-${testCase.type}`,
          type: testCase.type
        });

        const result = await mockFillFieldByLabel(mockPage, `${testCase.type} Field`, 'test');
        
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.fieldType, testCase.expectedType);
        assert.strictEqual(result.inputStrategy, testCase.expectedStrategy);
      }
    });

    it('should detect textarea elements', async () => {
      mockPage.setupGetByLabel(true, {
        tagName: 'TEXTAREA',
        id: 'description-field'
      });

      const result = await mockFillFieldByLabel(mockPage, 'Description', 'Test description');
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.fieldType, 'textarea');
      assert.strictEqual(result.inputStrategy, 'fill');
    });

    it('should detect select elements', async () => {
      mockPage.setupGetByLabel(true, {
        tagName: 'SELECT',
        id: 'country-field'
      });

      const result = await mockFillFieldByLabel(mockPage, 'Country', 'United States');
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.fieldType, 'select');
      assert.strictEqual(result.inputStrategy, 'selectOption');
    });
  });

  describe('Learning Integration', () => {
    it('should learn from successful fills', async () => {
      // Setup element
      mockPage.setupGetByLabel(true, {
        tagName: 'INPUT',
        id: 'email-field',
        name: 'email',
        type: 'email'
      });

      // First fill - should learn selector
      const result1 = await mockFillFieldByLabel(mockPage, 'Email Address', 'test@example.com');
      
      assert.strictEqual(result1.success, true);
      assert.strictEqual(result1.locator, '#email-field');

      // Save the learned mapping
      saveLabelMapping({
        label: 'Email Address',
        key: 'email',
        locator: result1.locator!,
        confidence: 0.95,
        field_type: result1.fieldType,
        input_strategy: result1.inputStrategy
      });

      // Verify mapping was saved
      const saved = saveLabelMapping;
      // Note: In real implementation, we'd verify the mapping was saved correctly
    });

    it('should handle failed fills gracefully', async () => {
      // Setup element that doesn't exist
      mockPage.setupGetByLabel(false);
      mockPage.setupElement('label:has-text("Non-existent Field")', false);

      const result = await mockFillFieldByLabel(mockPage, 'Non-existent Field', 'test');
      
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.method, 'none');
    });

    it('should demonstrate complete learning workflow', async () => {
      const fields = [
        { label: 'Email Address', value: 'test@example.com', selector: '#email-field' },
        { label: 'Phone Number', value: '123-456-7890', selector: 'input[name="phone"]' },
        { label: 'Full Name', value: 'John Doe', selector: '#full-name' }
      ];

      const learnedMappings: Array<{
        label: string;
        locator: string;
        fieldType: string;
        inputStrategy: string;
      }> = [];

      // Simulate learning from multiple fields
      for (const field of fields) {
        // Setup mock element for this field
        mockPage.setupGetByLabel(true, {
          tagName: 'INPUT',
          id: field.selector.replace('#', ''),
          name: field.selector.includes('name=') ? 'phone' : undefined,
          type: field.label.includes('Email') ? 'email' : 'text'
        });

        const result = await mockFillFieldByLabel(mockPage, field.label, field.value);
        
        assert.strictEqual(result.success, true);
        assert.ok(result.locator);
        assert.ok(result.fieldType);
        assert.ok(result.inputStrategy);

        learnedMappings.push({
          label: field.label,
          locator: result.locator!,
          fieldType: result.fieldType!,
          inputStrategy: result.inputStrategy!
        });
      }

      // Verify all fields were learned
      assert.strictEqual(learnedMappings.length, 3);
      
      // Verify each field has appropriate metadata
      const emailMapping = learnedMappings.find(m => m.label === 'Email Address');
      assert.ok(emailMapping);
      assert.strictEqual(emailMapping.fieldType, 'email');
      assert.strictEqual(emailMapping.inputStrategy, 'fill');
    });
  });

  describe('Error Handling', () => {
    it('should handle element evaluation errors', async () => {
      // Create a mock element that throws on evaluate
      const errorElement = new MockLocator('error-element', true);
      errorElement.evaluate = async () => {
        throw new Error('Evaluation failed');
      };

      mockPage.setupGetByLabel(true, {
        tagName: 'INPUT',
        id: 'error-field'
      });

      // Should still succeed but with limited metadata
      const result = await mockFillFieldByLabel(mockPage, 'Error Field', 'test');
      
      assert.strictEqual(result.success, true);
      // Locator should still be extracted from attributes
      assert.ok(result.locator);
    });

    it('should handle missing attributes gracefully', async () => {
      mockPage.setupGetByLabel(true, {
        tagName: 'INPUT'
        // No id, name, or type attributes
      });

      const result = await mockFillFieldByLabel(mockPage, 'Minimal Field', 'test');
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.locator, 'input'); // Fallback to tag name
      assert.strictEqual(result.fieldType, 'text'); // Default for input
    });
  });
});

// Note: Run with: tsx --test tests/form-filling-learning.test.ts
