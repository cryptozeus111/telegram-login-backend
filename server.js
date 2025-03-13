const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // Replace with your bot token

app.post('/auth', (req, res) => {
  const { initData } = req.body;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (calculatedHash === hash) {
    const user = {
      id: params.get('id'),
      first_name: params.get('first_name'),
      last_name: params.get('last_name'),
      username: params.get('username'),
      photo_url: params.get('photo_url'),
      auth_date: params.get('auth_date'),
    };
    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false });
  }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});