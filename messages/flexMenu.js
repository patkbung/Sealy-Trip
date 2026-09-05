/**
 * Flex Message template — การ์ดแสดงสินค้า
 */
export function createProductCard() {
  return {
    type: 'flex',
    altText: 'สินค้าแนะนำ',
    contents: {
      type: 'bubble',
      hero: {
        type: 'image',
        url: 'https://developers-resource.landpress.line.me/fx/img/01_1_cafe.png',
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'กาแฟลาเต้',
            weight: 'bold',
            size: 'xl',
          },
          {
            type: 'box',
            layout: 'baseline',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: '฿65',
                size: 'lg',
                color: '#1DB446',
                weight: 'bold',
              },
              {
                type: 'text',
                text: '/ แก้ว',
                size: 'sm',
                color: '#aaaaaa',
                margin: 'sm',
              },
            ],
          },
          {
            type: 'text',
            text: 'กาแฟรสนุ่ม หอมละมุน เหมาะสำหรับทุกช่วงเวลา',
            size: 'sm',
            color: '#666666',
            margin: 'md',
            wrap: true,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            action: {
              type: 'postback',
              label: 'สั่งซื้อ',
              data: 'action=order&item=latte',
              displayText: 'สั่งกาแฟลาเต้',
            },
          },
        ],
      },
    },
  };
}

export function createBookingLiffCard() {
  const liffUrl = `https://liff.line.me/${process.env.LIFF_ID || '2010630162-RcvmhD79'}`;
  return {
    type: 'flex',
    altText: 'จองแพ็กเกจทัวร์ Sealy Trip',
    contents: {
      type: 'bubble',
      hero: {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '🏝️ จองทัวร์ Sealy Trip',
            weight: 'bold',
            size: 'xl',
            color: '#0d2f56',
          },
          {
            type: 'text',
            text: 'กรอกข้อมูลการเดินทาง วันที่พัก และจำนวนผู้ร่วมทริป เพื่อประเมินราคาพร้อมรับส่วนลดโปรโมชันได้ทันทีผ่านระบบมือถือของคุณ',
            size: 'sm',
            color: '#666666',
            wrap: true,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#0d2f56',
            action: {
              type: 'uri',
              label: 'กรอกฟอร์มจองทัวร์',
              uri: liffUrl,
            },
          },
        ],
      },
    },
  };
}
