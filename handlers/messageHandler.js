import axios from 'axios';
import { createProductCard, createBookingLiffCard } from '../messages/flexMenu.js';
import {
  askGemini,
  clearChatHistory,
  isGeminiConfigured,
} from '../services/geminiService.js';
import { detectIntent } from '../services/dialogflowService.js';

// ฟังก์ชันส่งข้อความไปยัง n8n Webhook
async function sendToN8n(event) {
  try {
    await axios.post(process.env.N8N_WEBHOOK, {
      events: [event]
    });
    console.log('[n8n] Sent event to webhook successfully');
  } catch (error) {
    console.error('[n8n] Error sending to webhook:', error.message);
  }
}

const COMMANDS = {
  ช่วยเหลือ: () => [
    {
      type: 'text',
      text: [
        'คำสั่งที่ใช้ได้:',

        '• ถาม <คำถาม> — ถาม Gemini AI',
        '• ai <คำถาม> — ถาม Gemini AI (ภาษาอังกฤษ)',
        '• ล้าง — ล้างประวัติการสนทนากับ AI',
        '• ช่วยเหลือ — แสดงคำสั่งนี้',
      ].join('\n'),
    },
  ],
  จองทัวร์: () => [createBookingLiffCard()],
  'จอง One Day Trip': () => [createBookingLiffCard()],
  'จอง 2 วัน 1 คืน': () => [createBookingLiffCard()],
  'จอง 3 วัน 2 คืน': () => [createBookingLiffCard()],
  ล้าง: () => [{ type: 'text', text: 'ล้างประวัติแล้ว — เริ่มคุยกับ AI ใหม่ได้' }],
};

const AI_PREFIXES = ['ถาม ', 'ai ', 'AI '];

function extractAiQuestion(text) {
  for (const prefix of AI_PREFIXES) {
    if (text.startsWith(prefix)) {
      return text.slice(prefix.length).trim();
    }
  }
  return null;
}

const IGNORED_KEYWORDS = [
  'โปรโมชัน',
  'ดูโปรคู่รัก ลด 10%',
  'โปรกลุ่ม',
  'รีวิวจากลูกค้า',
  // 'children_policy',
  // 'เด็กสามารถไปได้ไหม',
  // 'change_traveler',
  // 'ให้คนอื่นไปแทนได้ไหม',
  // 'change_date',
  // 'จองแล้วเปลี่ยนวันได้ไหม',
  // 'refund_policy',
  // 'ยกเลิกแล้วได้เงินคืนไหม',
  'รีวิวจากลูกค้า',
  'แพ็กเกจทัวร์',
  'ดูโปรวันเกิด รับส่วนลด 1,000'
  // 'จอง One Day Trip'
  // 'จอง 2 วัน 1 คืน',
  // 'จอง 3 วัน 2 คืน',
];

export async function handleMessage(client, event) {
  // 1. ถ้าไม่ใช่ข้อความประเภท text (เช่น เป็น sticker, image) ให้ส่งไปให้ n8n เลย
  if (event.message.type !== 'text') {
    console.log('[Bot] Non-text event, routing to n8n');
    sendToN8n(event);
    return null;
  }

  const userId = event.source.userId ?? 'anonymous';
  const text = event.message.text.trim();

  // ป้องกันการตอบซ้ำกับข้อความตอบกลับอัตโนมัติ (Auto-response) ของ LINE Business
  if (IGNORED_KEYWORDS.includes(text)) {
    console.log(`[Bot] Ignored keyword matched: "${text}". Letting LINE Business reply.`);
    return null;
  }

  // 2. เช็กคำสั่งด่วนในระบบก่อน (Local Commands)
  if (text === 'ล้าง') {
    clearChatHistory(userId);
  }

  const buildMessages = COMMANDS[text];
  if (buildMessages) {
    console.log(`[Bot] Matched local command: ${text}`);
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: buildMessages(),
    });
  }

  // 2.5 เช็กข้อความที่มี AI Prefix (เช่น ถาม, ai, AI) เพื่อส่งให้ n8n ประมวลผลกับ Gemini AI ทันที
  const aiQuestion = extractAiQuestion(text);
  if (aiQuestion !== null) {
    console.log(`[Bot] AI Prefix matched: "${text}". Routing directly to n8n for Gemini AI.`);
    sendToN8n(event);
    return null;
  }

  // 3. ยิงเช็กกับ Dialogflow
  console.log(`[Dialogflow] Analyzing message: "${text}"`);
  const queryResult = await detectIntent(text, userId);
  const intentName = queryResult?.intent?.displayName;
  const fulfillmentText = queryResult?.fulfillmentText;

  // ถ้าเจอ Intent จริงใน Dialogflow และไม่ใช่ Fallback
  if (intentName && intentName !== 'Default Fallback Intent' && fulfillmentText) {
    console.log(`[Dialogflow] Matched intent: "${intentName}" -> "${fulfillmentText}"`);
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: 'text',
          text: fulfillmentText,
        },
      ],
    });
  }

  // 4. หากเป็น Fallback Intent (วิเคราะห์ไม่เจอ) หรือเกิดข้อผิดพลาด 
  // ให้ส่งข้อมูลต่อไปหา n8n เพื่อรัน Gemini AI
  console.log('[Bot] Intent not matched or fallback. Routing to n8n for Gemini AI response');
  sendToN8n(event);
  return null;
}

async function showAiLoading(client, userId) {
  if (!userId || userId === 'anonymous') return;

  try {
    await client.showLoadingAnimation({
      chatId: userId,
      loadingSeconds: 20,
    });
  } catch (err) {
    console.warn('[loading]', err.message);
  }
}

async function replyWithGemini(client, event, userId, question) {
  if (!question) {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: 'กรุณาพิมพ์คำถามหลังคำว่า "ถาม" เช่น ถาม อธิบาย webhook' }],
    });
  }

  if (!isGeminiConfigured()) {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: 'text',
          text: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน .env\nขอ key ได้ที่ https://aistudio.google.com/apikey',
        },
      ],
    });
  }

  try {
    await showAiLoading(client, userId);
    const answer = await askGemini(userId, question);
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: answer }],
    });
  } catch (err) {
    console.error('[Gemini]', err);
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: 'text',
          text: 'ขออภัย AI ตอบไม่ได้ในขณะนี้ ลองใหม่อีกครั้งหรือตรวจ API Key',
        },
      ],
    });
  }
}
