/**
 * Step 5: บริการเชื่อมต่อ Google Gemini API
 *
 * ขอ API Key ได้ที่: https://aistudio.google.com/apikey
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_INSTRUCTION =
  'คุณเป็นผู้ช่วยอัจฉริยะใน LINE Chatbot สำหรับนักศึกษา ' +
  'ตอบเป็นภาษาไทย กระชับ ชัดเจน และเป็นมิตร';

const MAX_HISTORY_TURNS = 6;
const MAX_REPLY_LENGTH = 4500;

/** @type {Map<string, Array<{role: string, parts: Array<{text: string}>}>>} */
const chatHistories = new Map();

function getModel() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in .env');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
    systemInstruction: SYSTEM_INSTRUCTION,
  });
}

function trimHistory(history) {
  if (history.length <= MAX_HISTORY_TURNS * 2) {
    return history;
  }
  return history.slice(-MAX_HISTORY_TURNS * 2);
}

function truncateText(text) {
  if (text.length <= MAX_REPLY_LENGTH) {
    return text;
  }
  return `${text.slice(0, MAX_REPLY_LENGTH - 20)}\n\n...(ข้อความยาวเกินไป)`;
}

export function clearChatHistory(userId) {
  if (userId) {
    chatHistories.delete(userId);
  }
}

export async function askGemini(userId, userMessage) {
  const model = getModel();
  const history = chatHistories.get(userId) ?? [];

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(userMessage);
  const answer = truncateText(result.response.text());

  const updatedHistory = trimHistory([
    ...history,
    { role: 'user', parts: [{ text: userMessage }] },
    { role: 'model', parts: [{ text: answer }] },
  ]);
  chatHistories.set(userId, updatedHistory);

  return answer;
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}
