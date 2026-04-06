import { omieSyncService } from './backend/services/omieSyncService.ts';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const result: any = {};
  console.log("Testing sync for Authen...");
  try {
    await omieSyncService.fullSync('authen');
    result.authen = "Success";
  } catch (e: any) {
    result.authen = e.response ? e.response.data : e.message;
  }

  console.log("Testing sync for Target...");
  try {
    await omieSyncService.fullSync('target');
    result.target = "Success";
  } catch (e: any) {
    result.target = e.response ? e.response.data : e.message;
  }
  
  fs.writeFileSync('testSyncResult.json', JSON.stringify(result, null, 2));
}
run();
