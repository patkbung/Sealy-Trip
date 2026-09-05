import { createBookingLiffCard } from '../messages/flexMenu.js';

export async function handleEvent(client, event) {
  switch (event.type) {
    case 'follow':
      return handleFollow(client, event);
    case 'unfollow':
      return handleUnfollow(event);
    case 'postback':
      return handlePostback(client, event);
    default:
      return null;
  }
}

async function handleFollow(client, event) {
  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [
      {
        type: 'text',
        text: 'ขอบคุณที่เพิ่มเพื่อน! 🎉\nลองถาม AI ได้ เช่น "ถาม JavaScript คืออะไร"',
      },
    ],
  });
}

function handleUnfollow(event) {
  const userId = event.source.userId ?? 'unknown';
  console.log(`[unfollow] user ${userId} blocked or removed the bot`);
  return null;
}

async function handlePostback(client, event) {
  const postbackData = event.postback.data;

  // ป้องกันการตอบซ้ำซ้อน:
  // เนื่องจากผู้ใช้กดริชเมนูแล้วจะส่งข้อความตัวหนังสือคำว่า "จองทัวร์" เข้ามาด้วย 
  // ซึ่งถูกจัดการและส่งการ์ดไปให้แล้วใน messageHandler.js ฝั่งนี้จึงปล่อยข้ามได้เลยครับ
  if (postbackData === 'booking') {
    return null;
  }

  const data = new URLSearchParams(postbackData);
  const action = data.get('action');

  if (action === 'order') {
    const item = data.get('item') ?? 'สินค้า';
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: 'text',
          text: `รับคำสั่งซื้อ ${item} แล้วครับ! ขอบคุณที่สนใจ 🙏`,
        },
      ],
    });
  }

  console.log(`[postback] Unhandled postback data: ${event.postback.data}`);
  return null;
}
