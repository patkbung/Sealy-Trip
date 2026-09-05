import dialogflow from '@google-cloud/dialogflow';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const keyPath = path.join(__dirname, '../dialogflow-key.json');
let sessionClient;
let projectId;

try {
  let credentials;
  if (process.env.DIALOGFLOW_CREDENTIALS) {
    // ใช้งานบน Vercel โดยตั้งค่าผ่าน Environment Variables
    credentials = JSON.parse(process.env.DIALOGFLOW_CREDENTIALS);
  } else if (fs.existsSync(keyPath)) {
    // ใช้งานแบบ Local 
    credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  } else {
    throw new Error('No credentials found in DIALOGFLOW_CREDENTIALS or dialogflow-key.json');
  }

  projectId = credentials.project_id;
  
  sessionClient = new dialogflow.SessionsClient({
    projectId: projectId,
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key, // รองรับ \n จาก JSON แบบปกติ
    },
  });
  console.log('[Dialogflow] Service initialized successfully with project:', projectId);
} catch (error) {
  console.error('[Dialogflow] Initialization error:', error.message);
}

/**
 * วิเคราะห์ Intent ของข้อความผ่าน Dialogflow
 * @param {string} text ข้อความที่ต้องการวิเคราะห์
 * @param {string} sessionId ไอดีเซสชัน (ใช้ userId ของ LINE)
 * @returns {Promise<object|null>} ผลลัพธ์ queryResult จาก Dialogflow
 */
export async function detectIntent(text, sessionId) {
  if (!sessionClient || !projectId) {
    console.error('[Dialogflow] Client not initialized. Please check dialogflow-key.json');
    return null;
  }
  
  try {
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: text,
          languageCode: 'th-TH', // รองรับภาษาไทย
        },
      },
    };
    
    const responses = await sessionClient.detectIntent(request);
    return responses[0].queryResult;
  } catch (error) {
    console.error('[Dialogflow] Error detecting intent:', error.message);
    return null;
  }
}
