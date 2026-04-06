import { omieSyncService } from './backend/services/omieSyncService.ts';

async function init() {
  try {
    console.log('Creating tables...');
    await omieSyncService.createTables();
    console.log('Tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

init();
