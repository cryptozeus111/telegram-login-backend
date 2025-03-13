const express = require('express');
const { Telegraf } = require('telegraf');
const crypto = require('crypto');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply('Welcome to the Mini App! Use the login widget to authenticate.');
});

const launchBot = async () => {
  try {
    await bot.launch();
    console.log('Bot is running...');
  } catch (error) {
    console.error('Failed to launch bot:', error);
    setTimeout(launchBot, 5000); // Retry after 5 seconds
  }
};

launchBot();

function validateTelegramData(data, botToken) {
  const dataCheckString = Object.keys(data)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return computedHash === data.hash;
}

app.post('/auth', (req, res) => {
  const data = req.body;

  if (validateTelegramData(data, BOT_TOKEN)) {
    console.log('User authenticated:', data);
    res.status(200).json({ message: 'Login successful!', user: data });
  } else {
    console.log('Invalid login attempt:', data);
    res.status(403).json({ message: 'Invalid login!' });
  }
});

app.post('/validate-initdata', (req, res) => {
  const initData = req.body.initData;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  const data = {};
  params.forEach((value, key) => {
    if (key !== 'hash') data[key] = value;
  });

  if (validateTelegramData({ ...data, hash }, BOT_TOKEN)) {
    console.log('initData validated:', data);
    res.status(200).json({ message: 'Validation successful!', data });
  } else {
    console.log('Invalid initData:', initData);
    res.status(403).json({ message: 'Invalid initData!' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});