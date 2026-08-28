import { initDatabase, db, saveDatabase } from './server/db';
import { downloadCloudDatabase, uploadCloudDatabase } from './server/supabase';

async function testSupabase() {
  console.log('Testing Supabase Cloud Persistence...');
  await initDatabase();

  // Test query
  const count: any = db.prepare('SELECT COUNT(*) as c FROM personnel').get();
  console.log(`Current personnel count: ${count?.c}`);

  // Test insert a dummy test record
  const testId = `test_sync_${Date.now()}`;
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
  `).run('supabase_test_sync', 'SUCCESS', new Date().toISOString());

  console.log('Waiting 2 seconds for cloud sync to complete...');
  await new Promise((r) => setTimeout(r, 2500));

  // Test downloading from cloud
  const cloudData = await downloadCloudDatabase();
  if (cloudData && cloudData.length > 0) {
    console.log(`[SUCCESS] Cloud backup downloaded successfully! Size: ${cloudData.length} bytes`);
  } else {
    console.error('[FAIL] Could not verify cloud backup.');
  }

  process.exit(0);
}

testSupabase();
