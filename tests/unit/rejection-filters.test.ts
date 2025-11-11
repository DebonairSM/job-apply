import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { 
  initDb, 
  setTestMode,
  closeDb,
  clearAllCaches,
  resetWeightAdjustments,
  clearAllFilters
} from '../../src/lib/db.js';
import { applyFilters } from '../../src/ai/rejection-filters.js';

describe('Rejection Filters', () => {
  beforeEach(() => {
    setTestMode(true);
    initDb();
    clearAllCaches();
    resetWeightAdjustments();
    clearAllFilters();
  });

  afterEach(() => {
    clearAllCaches();
    resetWeightAdjustments();
    clearAllFilters();
    closeDb();
  });

  describe('LocationRequirementFilter', () => {
    it('should block hybrid jobs with "3 days a week in office"', () => {
      const job = {
        title: 'Senior .NET Developer',
        company: 'Test Corp',
        description: 'Great role! 3 days a week in office in Phoenix, AZ'
      };
      const result = applyFilters(job);
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('onsite or hybrid'));
    });

    it('should block hybrid jobs with "2x a week"', () => {
      const job = {
        title: 'Senior .NET Developer',
        company: 'Test Corp',
        description: 'Remote with 2x a week in Miami office'
      };
      const result = applyFilters(job);
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('onsite or hybrid'));
    });

    it('should block hybrid jobs with "hybrid" keyword', () => {
      const job = {
        title: 'Senior .NET Developer',
        company: 'Test Corp',
        description: 'Hybrid position in Dallas, TX'
      };
      const result = applyFilters(job);
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('onsite or hybrid'));
    });

    it('should block onsite jobs', () => {
      const job = {
        title: 'Senior .NET Developer',
        company: 'Test Corp',
        description: 'Must be onsite in Miami office'
      };
      const result = applyFilters(job);
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('onsite or hybrid'));
    });

    it('should block 100% onsite jobs', () => {
      const job = {
        title: 'Senior .NET Developer',
        company: 'Test Corp',
        description: '100% onsite position in San Francisco'
      };
      const result = applyFilters(job);
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('onsite or hybrid'));
    });

    it('should block jobs requiring relocation', () => {
      const job = {
        title: 'Senior .NET Developer',
        company: 'Test Corp',
        description: 'Must relocate to Seattle, WA'
      };
      const result = applyFilters(job);
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('onsite or hybrid'));
    });

    it('should block jobs requiring local presence', () => {
      const job = {
        title: 'Senior .NET Developer',
        company: 'Test Corp',
        description: 'Must be local to New York City area'
      };
      const result = applyFilters(job);
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('onsite or hybrid'));
    });

    it('should allow truly remote jobs', () => {
      const job = {
        title: 'Senior .NET Developer',
        company: 'Test Corp',
        description: '100% remote position, work from anywhere in the US'
      };
      const result = applyFilters(job);
      assert.strictEqual(result.blocked, false);
    });

    it('should allow fully remote jobs', () => {
      const job = {
        title: 'Senior .NET Developer',
        company: 'Test Corp',
        description: 'Fully remote role with optional team meetups'
      };
      const result = applyFilters(job);
      assert.strictEqual(result.blocked, false);
    });
  });

  describe('EducationRequirementFilter', () => {
    it('should block CS degree requirements', () => {
      const job = {
        title: 'Senior .NET Developer',
        company: 'Test Corp',
        description: 'Requires a Bachelor\'s degree in Computer Science'
      };
      const result = applyFilters(job);
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('Computer Science degree'));
    });

    it('should block "BS in Computer Science" requirements', () => {
      const job = {
        title: 'Senior .NET Developer',
        company: 'Test Corp',
        description: 'Must have BS in Computer Science or related field'
      };
      const result = applyFilters(job);
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('Computer Science degree'));
    });

    it('should block "Computer Science degree required"', () => {
      const job = {
        title: 'Senior .NET Developer',
        company: 'Test Corp',
        description: 'Computer Science degree required'
      };
      const result = applyFilters(job);
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('Computer Science degree'));
    });

    it('should block "CS degree required"', () => {
      const job = {
        title: 'Senior .NET Developer',
        company: 'Test Corp',
        description: 'CS degree required for this position'
      };
      const result = applyFilters(job);
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('Computer Science degree'));
    });

    it('should allow jobs mentioning CS degree as preferred', () => {
      const job = {
        title: 'Senior .NET Developer',
        company: 'Test Corp',
        description: 'Bachelor\'s degree preferred, equivalent experience accepted'
      };
      const result = applyFilters(job);
      assert.strictEqual(result.blocked, false);
    });

    it('should allow jobs without specific degree requirements', () => {
      const job = {
        title: 'Senior .NET Developer',
        company: 'Test Corp',
        description: '5+ years of experience with C# and .NET'
      };
      const result = applyFilters(job);
      assert.strictEqual(result.blocked, false);
    });
  });

  describe('AwsHeavyFilter', () => {
    it('should block AWS-heavy jobs for Azure profiles', () => {
      const job = {
        title: 'Senior AWS Developer',
        company: 'Test Corp',
        description: 'AWS Lambda, AWS DynamoDB, AWS S3, AWS expertise required'
      };
      const result = applyFilters(job, 'core');
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('AWS-focused'));
    });

    it('should block jobs with AWS in title and no Azure for Azure profiles', () => {
      const job = {
        title: 'Senior AWS Engineer',
        company: 'Test Corp',
        description: 'Work with cloud infrastructure and microservices'
      };
      const result = applyFilters(job, 'core');
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('AWS-focused'));
    });

    it('should allow mixed AWS/Azure jobs with Azure primary', () => {
      const job = {
        title: 'Senior Cloud Developer',
        company: 'Test Corp',
        description: 'Azure Functions, Azure Service Bus, Azure Storage primary. Some AWS Lambda exposure helpful'
      };
      const result = applyFilters(job, 'core');
      assert.strictEqual(result.blocked, false);
    });

    it('should allow Azure-focused jobs', () => {
      const job = {
        title: 'Senior Azure Developer',
        company: 'Test Corp',
        description: 'Azure Functions, Azure App Services, Azure SQL'
      };
      const result = applyFilters(job, 'core');
      assert.strictEqual(result.blocked, false);
    });

    it('should not apply filter for non-Azure profiles', () => {
      const job = {
        title: 'Senior AWS Developer',
        company: 'Test Corp',
        description: 'AWS Lambda, AWS DynamoDB, AWS expertise required'
      };
      const result = applyFilters(job, 'legacy-web');
      // Legacy-web is not in the Azure profiles list, so AWS filter should not apply
      assert.strictEqual(result.blocked, false);
    });

    it('should block AWS-heavy jobs for backend profile', () => {
      const job = {
        title: 'Senior AWS Developer',
        company: 'Test Corp',
        description: 'AWS Lambda, AWS DynamoDB, AWS S3, AWS expertise required'
      };
      const result = applyFilters(job, 'backend');
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('AWS-focused'));
    });

    it('should block AWS-heavy jobs for csharp-azure-no-frontend profile', () => {
      const job = {
        title: 'Senior Backend Developer',
        company: 'Test Corp',
        description: 'AWS EC2, AWS Lambda, AWS RDS, AWS CloudFormation experience'
      };
      const result = applyFilters(job, 'csharp-azure-no-frontend');
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('AWS-focused'));
    });

    it('should allow jobs with minimal AWS mentions', () => {
      const job = {
        title: 'Senior Cloud Developer',
        company: 'Test Corp',
        description: 'Azure is our primary cloud. Some AWS knowledge is a plus'
      };
      const result = applyFilters(job, 'core');
      assert.strictEqual(result.blocked, false);
    });
  });

  describe('Combined Filters', () => {
    it('should block jobs that match multiple filters', () => {
      const job = {
        title: 'Senior AWS Developer',
        company: 'Test Corp',
        description: 'Hybrid role, 3 days in office. Requires BS in Computer Science. AWS Lambda, AWS DynamoDB'
      };
      const result = applyFilters(job, 'core');
      assert.strictEqual(result.blocked, true);
      // Should be blocked by one of: location, education, or AWS filter
    });

    it('should allow jobs that pass all filters', () => {
      const job = {
        title: 'Senior Azure .NET Developer',
        company: 'Test Corp',
        description: '100% remote position. 5+ years experience with C#, Azure Functions, and .NET Core'
      };
      const result = applyFilters(job, 'core');
      assert.strictEqual(result.blocked, false);
    });
  });
});

