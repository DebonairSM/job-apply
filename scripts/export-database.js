#!/usr/bin/env node

import { getDb } from '../src/lib/db.js';
import { writeFileSync, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function exportDatabase() {
  console.log('🔄 Exporting database...');
  
  try {
    const db = getDb();
    
    // Get all table names
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    console.log(`📊 Found ${tables.length} tables:`, tables.map(t => t.name).join(', '));
    
    // Export each table to JSON
    const exportData = {};
    
    for (const table of tables) {
      const tableName = table.name;
      console.log(`📋 Exporting table: ${tableName}`);
      
      const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
      exportData[tableName] = rows;
      
      console.log(`   ✅ Exported ${rows.length} rows`);
    }
    
    // Write JSON export
    const jsonFile = join(__dirname, '../database-export.json');
    writeFileSync(jsonFile, JSON.stringify(exportData, null, 2));
    console.log(`💾 JSON export saved to: ${jsonFile}`);
    
    // Write SQL dump
    const sqlFile = join(__dirname, '../database-export.sql');
    const sqlStream = createWriteStream(sqlFile);
    
    sqlStream.write('-- Job Application Database Export\n');
    sqlStream.write('-- Generated on: ' + new Date().toISOString() + '\n\n');
    
    for (const table of tables) {
      const tableName = table.name;
      
      // Get table schema
      const schema = db.prepare(`
        SELECT sql FROM sqlite_master 
        WHERE type='table' AND name=?
      `).get(tableName);
      
      if (schema) {
        sqlStream.write(schema.sql + ';\n\n');
      }
      
      // Get table data
      const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
      
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = columns.map(col => {
          const value = row[col];
          if (value === null) return 'NULL';
          if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
          return value;
        });
        
        sqlStream.write(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`);
      }
      
      sqlStream.write('\n');
    }
    
    sqlStream.end();
    console.log(`💾 SQL export saved to: ${sqlFile}`);
    
    // Show summary
    const totalRows = Object.values(exportData).reduce((sum, rows) => sum + rows.length, 0);
    console.log(`\n📈 Export Summary:`);
    console.log(`   Total tables: ${tables.length}`);
    console.log(`   Total rows: ${totalRows}`);
    console.log(`   Files created:`);
    console.log(`     - ${jsonFile}`);
    console.log(`     - ${sqlFile}`);
    
    // Note: Database connection managed by getDb() singleton
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    process.exit(1);
  }
}

// Run export
exportDatabase();


