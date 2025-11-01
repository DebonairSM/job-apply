import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PROFILES } from '../src/ai/profiles.js';

/**
 * Tests for Azure and .NET category separation
 * 
 * These tests verify:
 * 1. Azure category contains only Azure platform skills
 * 2. .NET category contains only .NET development skills
 * 3. No overlap between Azure and .NET categories
 * 4. Weight distribution is correct
 */

describe('Azure and .NET Category Separation', () => {
  it('should have Azure category with only Azure platform skills', () => {
    const azureProfile = PROFILES.coreAzure;
    
    // Verify Azure category name and weight
    assert.strictEqual(azureProfile.name, 'Azure Platform Development');
    assert.strictEqual(azureProfile.weight, 20);
    
    // Verify mustHave contains only Azure platform technologies
    const azureMustHave = azureProfile.mustHave;
    assert.ok(azureMustHave.includes('Azure'));
    assert.ok(azureMustHave.includes('Microsoft Azure'));
    assert.ok(azureMustHave.includes('API Management'));
    assert.ok(azureMustHave.includes('APIM'));
    assert.ok(azureMustHave.includes('Azure Functions'));
    assert.ok(azureMustHave.includes('App Services'));
    
    // Verify no .NET technologies in Azure mustHave
    assert.ok(!azureMustHave.includes('C#'));
    assert.ok(!azureMustHave.includes('.NET Core'));
    assert.ok(!azureMustHave.includes('.NET 6'));
    assert.ok(!azureMustHave.includes('.NET 8'));
    assert.ok(!azureMustHave.includes('ASP.NET'));
    assert.ok(!azureMustHave.includes('MVC'));
    
    // Verify preferred contains Azure services
    const azurePreferred = azureProfile.preferred;
    assert.ok(azurePreferred.includes('Service Bus'));
    assert.ok(azurePreferred.includes('Event Grid'));
    assert.ok(azurePreferred.includes('Azure Storage'));
    assert.ok(azurePreferred.includes('Azure Key Vault'));
    assert.ok(azurePreferred.includes('Azure Monitor'));
    assert.ok(azurePreferred.includes('Application Insights'));
  });
  
  it('should have .NET category with only .NET development skills', () => {
    const netProfile = PROFILES.coreNet;
    
    // Verify .NET category name and weight
    assert.strictEqual(netProfile.name, '.NET Development');
    assert.strictEqual(netProfile.weight, 25);
    
    // Verify mustHave contains only .NET technologies
    const netMustHave = netProfile.mustHave;
    assert.ok(netMustHave.includes('C#'));
    assert.ok(netMustHave.includes('.NET Core'));
    assert.ok(netMustHave.includes('.NET 6'));
    assert.ok(netMustHave.includes('.NET 8'));
    assert.ok(netMustHave.includes('ASP.NET'));
    assert.ok(netMustHave.includes('MVC'));
    
    // Verify no Azure platform technologies in .NET mustHave
    assert.ok(!netMustHave.includes('Azure'));
    assert.ok(!netMustHave.includes('Microsoft Azure'));
    assert.ok(!netMustHave.includes('API Management'));
    assert.ok(!netMustHave.includes('APIM'));
    assert.ok(!netMustHave.includes('Azure Functions'));
    assert.ok(!netMustHave.includes('App Services'));
    
    // Verify preferred contains comprehensive .NET technologies
    const netPreferred = netProfile.preferred;
    assert.ok(netPreferred.includes('.NET Framework'));
    assert.ok(netPreferred.includes('ASP.NET Core'));
    assert.ok(netPreferred.includes('Web Forms'));
    assert.ok(netPreferred.includes('Entity Framework'));
    assert.ok(netPreferred.includes('EF Core'));
    assert.ok(netPreferred.includes('Blazor'));
    assert.ok(netPreferred.includes('Razor Pages'));
    assert.ok(netPreferred.includes('SignalR'));
    assert.ok(netPreferred.includes('gRPC'));
  });
  
  it('should have no overlap between Azure and .NET categories', () => {
    const azureProfile = PROFILES.coreAzure;
    const netProfile = PROFILES.coreNet;
    
    // Check mustHave arrays for overlap
    const azureMustHave = azureProfile.mustHave;
    const netMustHave = netProfile.mustHave;
    
    for (const azureSkill of azureMustHave) {
      assert.ok(!netMustHave.includes(azureSkill), 
        `Azure skill "${azureSkill}" should not be in .NET mustHave`);
    }
    
    for (const netSkill of netMustHave) {
      assert.ok(!azureMustHave.includes(netSkill), 
        `.NET skill "${netSkill}" should not be in Azure mustHave`);
    }
    
    // Check preferred arrays for overlap (some overlap is acceptable in preferred)
    const azurePreferred = azureProfile.preferred;
    const netPreferred = netProfile.preferred;
    
    // Only check for critical overlaps that shouldn't exist
    const criticalOverlaps = ['Azure', 'Microsoft Azure', 'API Management', 'APIM'];
    for (const overlap of criticalOverlaps) {
      assert.ok(!netPreferred.includes(overlap), 
        `Critical Azure skill "${overlap}" should not be in .NET preferred`);
    }
  });
  
  it('should have correct weight distribution', () => {
    const totalWeight = Object.values(PROFILES).reduce((sum, p) => sum + p.weight, 0);
    assert.strictEqual(totalWeight, 100, 'Total profile weights should sum to 100%');
    
    // Verify specific weights
    assert.strictEqual(PROFILES.coreAzure.weight, 20, 'Azure category should have 20% weight');
    assert.strictEqual(PROFILES.coreNet.weight, 25, '.NET category should have 25% weight');
    
    // Verify other categories still exist with correct weights
    assert.strictEqual(PROFILES.security.weight, 15, 'Security should have 15% weight');
    assert.strictEqual(PROFILES.eventDriven.weight, 10, 'Event-driven should have 10% weight');
    assert.strictEqual(PROFILES.performance.weight, 10, 'Performance should have 10% weight');
    assert.strictEqual(PROFILES.devops.weight, 5, 'DevOps should have 5% weight');
    assert.strictEqual(PROFILES.seniority.weight, 5, 'Seniority should have 5% weight');
    assert.strictEqual(PROFILES.legacyModernization.weight, 10, 'Legacy modernization should have 10% weight');
  });
  
  it('should have comprehensive .NET technology coverage', () => {
    const netProfile = PROFILES.coreNet;
    const allNetSkills = [...netProfile.mustHave, ...netProfile.preferred];
    
    // Verify traditional .NET technologies
    assert.ok(allNetSkills.includes('.NET Framework'), 'Should include .NET Framework');
    assert.ok(allNetSkills.includes('Web Forms'), 'Should include Web Forms');
    // Note: ASP.NET MVC is in legacyModernization category, not coreNet
    
    // Verify modern .NET technologies
    assert.ok(allNetSkills.includes('.NET Core'), 'Should include .NET Core');
    assert.ok(allNetSkills.includes('.NET 6'), 'Should include .NET 6');
    assert.ok(allNetSkills.includes('.NET 8'), 'Should include .NET 8');
    assert.ok(allNetSkills.includes('ASP.NET Core'), 'Should include ASP.NET Core');
    assert.ok(allNetSkills.includes('Blazor'), 'Should include Blazor');
    
    // Verify data access technologies
    assert.ok(allNetSkills.includes('Entity Framework'), 'Should include Entity Framework');
    assert.ok(allNetSkills.includes('EF Core'), 'Should include EF Core');
    
    // Verify API technologies
    assert.ok(allNetSkills.includes('REST API'), 'Should include REST API');
    assert.ok(allNetSkills.includes('Web API'), 'Should include Web API');
    assert.ok(allNetSkills.includes('gRPC'), 'Should include gRPC');
    assert.ok(allNetSkills.includes('SignalR'), 'Should include SignalR');
  });
  
  it('should have comprehensive Azure platform coverage', () => {
    const azureProfile = PROFILES.coreAzure;
    const allAzureSkills = [...azureProfile.mustHave, ...azureProfile.preferred];
    
    // Verify core Azure services
    assert.ok(allAzureSkills.includes('Azure Functions'), 'Should include Azure Functions');
    assert.ok(allAzureSkills.includes('App Services'), 'Should include App Services');
    assert.ok(allAzureSkills.includes('API Management'), 'Should include API Management');
    assert.ok(allAzureSkills.includes('APIM'), 'Should include APIM');
    
    // Verify messaging services
    assert.ok(allAzureSkills.includes('Service Bus'), 'Should include Service Bus');
    assert.ok(allAzureSkills.includes('Event Grid'), 'Should include Event Grid');
    
    // Verify storage and security
    assert.ok(allAzureSkills.includes('Azure Storage'), 'Should include Azure Storage');
    assert.ok(allAzureSkills.includes('Azure Key Vault'), 'Should include Azure Key Vault');
    
    // Verify monitoring and observability
    assert.ok(allAzureSkills.includes('Azure Monitor'), 'Should include Azure Monitor');
    assert.ok(allAzureSkills.includes('Application Insights'), 'Should include Application Insights');
    
    // Verify container services
    assert.ok(allAzureSkills.includes('Azure Container Instances'), 'Should include Azure Container Instances');
    assert.ok(allAzureSkills.includes('Azure Kubernetes Service'), 'Should include Azure Kubernetes Service');
    assert.ok(allAzureSkills.includes('AKS'), 'Should include AKS');
  });
});
