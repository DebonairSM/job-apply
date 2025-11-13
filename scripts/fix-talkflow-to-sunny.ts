/**
 * Fix TalkFlow → Sunny in Campaign Templates
 * 
 * Updates all campaign body_template and subject_template fields
 * to replace "TalkFlow" with "Sunny"
 * 
 * Usage:
 *   npx tsx scripts/fix-talkflow-to-sunny.ts
 */

import { initDb, getAllCampaigns, updateCampaign } from '../src/lib/db.js';

function fixTalkFlowToSunny() {
  // Initialize database
  initDb();
  
  // Get all campaigns
  const campaigns = getAllCampaigns();
  
  if (campaigns.length === 0) {
    console.log('⚠️  No campaigns found in database');
    return;
  }
  
  console.log(`📋 Found ${campaigns.length} campaign(s)\n`);
  
  let updatedCount = 0;
  
  for (const campaign of campaigns) {
    let needsUpdate = false;
    const updates: any = {};
    
    // Check and fix subject_template
    if (campaign.subject_template.includes('TalkFlow')) {
      updates.subject_template = campaign.subject_template.replace(/TalkFlow/g, 'Sunny');
      needsUpdate = true;
    }
    
    // Check and fix body_template
    if (campaign.body_template.includes('TalkFlow')) {
      updates.body_template = campaign.body_template.replace(/TalkFlow/g, 'Sunny');
      needsUpdate = true;
    }
    
    // Check and fix static_placeholders JSON
    if (campaign.static_placeholders) {
      try {
        const placeholders = JSON.parse(campaign.static_placeholders);
        let placeholdersChanged = false;
        
        // Check product_name
        if (placeholders.product_name && placeholders.product_name.includes('TalkFlow')) {
          console.log(`🔧 Found TalkFlow in static_placeholders.product_name: "${placeholders.product_name}"`);
          placeholders.product_name = placeholders.product_name.replace(/TalkFlow/g, 'Sunny');
          placeholdersChanged = true;
        }
        
        // Check other fields that might contain TalkFlow
        for (const [key, value] of Object.entries(placeholders)) {
          if (typeof value === 'string' && value.includes('TalkFlow')) {
            console.log(`🔧 Found TalkFlow in static_placeholders.${key}: "${value}"`);
            (placeholders as any)[key] = value.replace(/TalkFlow/g, 'Sunny');
            placeholdersChanged = true;
          }
        }
        
        if (placeholdersChanged) {
          updates.static_placeholders = JSON.stringify(placeholders);
          needsUpdate = true;
        }
      } catch (error) {
        console.warn(`   ⚠️  Could not parse static_placeholders for ${campaign.name}:`, error);
      }
    }
    
    if (needsUpdate) {
      console.log(`🔧 Updating campaign: ${campaign.name}`);
      
      if (updates.subject_template) {
        console.log(`   Before (subject): ${campaign.subject_template}`);
        console.log(`   After (subject):  ${updates.subject_template}`);
      }
      
      if (updates.body_template) {
        const beforeLines = campaign.body_template.split('\n').filter(l => l.includes('TalkFlow'));
        const afterLines = updates.body_template.split('\n').filter(l => l.includes('Sunny'));
        console.log(`   Before (body excerpt): ${beforeLines[0]?.trim()}`);
        console.log(`   After (body excerpt):  ${afterLines[0]?.trim()}`);
      }
      
      if (updates.static_placeholders) {
        const oldPlaceholders = JSON.parse(campaign.static_placeholders || '{}');
        const newPlaceholders = JSON.parse(updates.static_placeholders);
        console.log(`   Before (product_name): ${oldPlaceholders.product_name || 'N/A'}`);
        console.log(`   After (product_name):  ${newPlaceholders.product_name || 'N/A'}`);
      }
      
      updateCampaign(campaign.id, updates);
      updatedCount++;
      console.log(`   ✅ Updated\n`);
    } else {
      console.log(`✓ ${campaign.name} - No TalkFlow found\n`);
    }
  }
  
  if (updatedCount > 0) {
    console.log(`\n🎉 Successfully updated ${updatedCount} campaign(s)!`);
  } else {
    console.log(`\n✅ No campaigns needed updating (no "TalkFlow" found)`);
  }
}

// Run the fix
try {
  fixTalkFlowToSunny();
} catch (error) {
  console.error('❌ Error fixing campaigns:', error);
  process.exit(1);
}

