import { detectIntent } from './services/dialogflowService.js';

console.log('[Test] Running Dialogflow test...');
try {
  const result = await detectIntent('สวัสดี', 'test-session-id-123');
  console.log('[Test] Matched Intent:', result?.intent?.displayName);
  console.log('[Test] Response Text:', result?.fulfillmentText);
} catch (error) {
  console.error('[Test] Error:', error.message);
}
