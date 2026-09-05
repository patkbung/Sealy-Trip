import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as line from '@line/bot-sdk';
import axios from 'axios';
import { processEvents } from './handlers/webhook.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const lineConfig = {
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = line.LineBotClient.fromChannelAccessToken({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
});

const app = express();

// LINE Webhook route must be registered BEFORE any body-parser middlewares like express.json()
// to preserve the raw request body for signature verification.
app.post('/callback', line.middleware(lineConfig), async (req, res) => {
  try {
    await processEvents(client, req.body.events);
    res.status(200).end();
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

app.use(express.json());

app.get('/config.js', async (_req, res) => {
  let botId = '';
  try {
    const botInfo = await client.getBotInfo();
    botId = botInfo.basicId;
  } catch (error) {
    console.error('Error fetching bot info:', error.message);
  }

  res.type('application/javascript');
  res.send(
    `window.LIFF_CONFIG = { 
      liffId: ${JSON.stringify(process.env.LIFF_ID ?? '')},
      botId: ${JSON.stringify(botId)}
    };`
  );
});

// Service Message (LINE MINI App Notice) & Push Ticket endpoint
app.post('/api/send-service-message', async (req, res) => {
  const { accessToken, userId, flexPayload, bookingDetails } = req.body;
  if (!accessToken) {
    return res.status(400).json({ success: false, error: 'Missing LIFF accessToken' });
  }

  let notificationToken = null;
  let noticeResult = null;
  let noticeError = null;

  // Step 1 & 2: LINE MINI App Notice (Service Message) - Wrap in try-catch so it doesn't block Push Message if unlicensed
  try {
    console.log('[ServiceMessage] Requesting service notification token from LINE...');
    const response = await axios.post(
      'https://api.line.me/message/v3/notifier/token',
      { liffAccessToken: accessToken },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`
        },
      }
    );

    notificationToken = response.data.notificationToken;
    console.log('[ServiceMessage] Success! Received notificationToken:', notificationToken);

    console.log('[ServiceMessage] Dispatching Notice to LINE via notifier/send...');
    const templateName = process.env.MINI_APP_TEMPLATE_NAME || 'booking_confirm_th';

    const sendResponse = await axios.post(
      'https://api.line.me/message/v3/notifier/send?target=service',
      {
        templateName: templateName,
        params: {
          "destination": bookingDetails?.destination || "-",
          "date": bookingDetails?.date || "-",
          "guests": bookingDetails?.guests || "-",
          "total": bookingDetails?.total ? `฿${bookingDetails.total.toLocaleString()}` : "-"
        },
        notificationToken: notificationToken
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`
        }
      }
    );
    noticeResult = sendResponse.data;
    console.log('[ServiceMessage] Notice dispatched successfully:', noticeResult);
  } catch (error) {
    noticeError = error.response?.data || error.message;
    console.warn('[ServiceMessage] Notice API warning (expected if unverified):', noticeError);
  }

  // Step 3: Push Flex Ticket to User's 1-on-1 Chat with LINE OA (Backup/Testing)
  let pushResult = null;
  let pushError = null;
  if (userId && flexPayload) {
    try {
      console.log('[PushMessage] Dispatching Flex ticket to user:', userId);
      pushResult = await client.pushMessage({
        to: userId,
        messages: [
          {
            type: 'flex',
            altText: 'ใบยืนยันการจองทัวร์ — Sealy Trip 🏝️',
            contents: flexPayload
          }
        ]
      });
      console.log('[PushMessage] Ticket pushed successfully!');
    } catch (error) {
      pushError = error.message || error;
      console.error('[PushMessage] Failed to push Flex ticket:', pushError);
    }
  }

  // Return status of both
  res.json({
    success: true,
    notice: {
      success: !noticeError,
      notificationToken,
      sendResult: noticeResult,
      error: noticeError
    },
    push: {
      success: !pushError,
      result: pushResult,
      error: pushError
    }
  });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (_req, res) => {
  res.send('LINE Bot Step 10 — Chatbot. Webhook: POST /callback');
});

const port = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Step 10 Chatbot listening on http://localhost:${port}`);
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default app;
