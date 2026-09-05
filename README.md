# Sealy-Trip LINE Chatbot

โปรเจกต์ LINE Chatbot สำหรับ **Sealy-Trip** พัฒนาด้วย Node.js (Express) โดยมีฟีเจอร์การเชื่อมต่อกับบริการต่างๆ เพื่อสร้างประสบการณ์แชทบอทที่ชาญฉลาด:

- **LINE Messaging API** - จัดการการรับส่งข้อความกับผู้ใช้
- **Google Gemini AI** - ประมวลผลภาษาธรรมชาติและสร้างคำตอบด้วย AI
- **Google Cloud Dialogflow** - วิเคราะห์เจตนา (Intent) ของข้อความ
- **n8n Webhook** - สำหรับเชื่อมต่อเข้ากับระบบ Automation
- **LIFF (LINE Front-end Framework)** - สำหรับแสดงหน้าเว็บแบบไร้รอยต่อภายในแอปพลิเคชัน LINE

## 📁 โครงสร้างโปรเจกต์
นี่คือโฟลเดอร์หลักของโปรเจกต์และซอร์สโค้ด Node.js ทั้งหมด

## ⚙️ สิ่งที่ต้องเตรียม (Prerequisites)
1. **Node.js** (เวอร์ชัน 20 ขึ้นไป)
2. **LINE Developers Account** - สำหรับสร้าง Messaging API Channel
3. **Google Gemini API Key** - สำหรับเรียกใช้ Gemini AI
4. **Dialogflow Service Account Key** - นำไฟล์ `dialogflow-key.json` ของโปรเจกต์ Dialogflow มาวางเตรียมไว้
5. (สำหรับการทดสอบ) **ngrok** - เพื่อ Forward port จากเครื่อง Localhost ให้ LINE มองเห็น

## 🚀 การติดตั้งและเริ่มต้นใช้งาน (Installation & Setup)

1. ติดตั้ง Dependencies:
   ```bash
   npm install
   ```

3. สร้างไฟล์ตั้งค่า Environment:
   คัดลอกตัวอย่างไฟล์ `.env.example` เป็น `.env` จากนั้นเปิดขึ้นมาเพื่อใส่ค่า Key และ Token ต่างๆ
   ```bash
   cp .env.example .env
   ```

4. ตั้งค่า Dialogflow:
   นำไฟล์ `dialogflow-key.json` (Service Account Key จาก Google Cloud) มาวางไว้ในโฟลเดอร์หลักของโปรเจกต์

5. รันเซิร์ฟเวอร์:
   ```bash
   # สำหรับโหมดนักพัฒนา (Auto-restart ด้วย nodemon เมื่อแก้ไขโค้ด)
   npm run dev

   # สำหรับรันใช้งานจริง
   npm start
   ```
   เซิร์ฟเวอร์จะรันที่พอร์ต `3000` (หรือพอร์ตที่ระบุไว้ใน `.env`)

6. การเชื่อมต่อ Webhook ของ LINE:
   เปิด Terminal หน้าต่างใหม่ แล้วรัน ngrok เพื่อสร้าง Public URL:
   ```bash
   ngrok http 3000
   ```
   นำ URL ที่ได้ไปเติม `/callback` (ตัวอย่าง: `https://xxxx.ngrok-free.app/callback`) และนำไปตั้งเป็น Webhook URL ในหน้า LINE Developer Console

## 📦 การนำขึ้น Production (Deploy)

โปรเจกต์นี้รองรับการ Deploy ไปยังผู้ให้บริการคลาวด์ต่างๆ เช่น **Render**, **Railway** หรือ **VPS** 
สิ่งที่สำคัญคืออย่าลืมตั้งค่าตัวแปรสภาพแวดล้อม (Environment Variables) ทุกตัวที่มีในไฟล์ `.env` เข้าไปใน Environment ตั้งค่าของระบบที่คุณใช้ Deploy (เช่น Render Dashboard) 

*(หมายเหตุ: ไฟล์ `.env` และ `dialogflow-key.json` จะไม่ถูกอัปโหลดขึ้น Git ด้วยกฎของ `.gitignore` ดังนั้นต้องนำข้อมูลไปตั้งค่าบน Production Server ด้วยวิธีที่เหมาะสมของแต่ละแพลตฟอร์ม)*

## 🛠 เทคโนโลยีและเครื่องมือหลัก (Stack)
- [Node.js](https://nodejs.org/) (ES Modules)
- [Express.js](https://expressjs.com/)
- [@line/bot-sdk](https://github.com/line/line-bot-sdk-nodejs)
- [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai)
- [@google-cloud/dialogflow](https://www.npmjs.com/package/@google-cloud/dialogflow)
- [axios](https://www.npmjs.com/package/axios)
