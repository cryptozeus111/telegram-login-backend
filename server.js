const express = require('express');
const { Telegraf } = require('telegraf');
const crypto = require('crypto');
const axios = require('axios');
const cors = require('cors');

// Load environment variables (optional)
require('dotenv').config();

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN';
const PORT = process.env.PORT || 3000;

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Telegraf bot
const bot = new Telegraf(BOT_TOKEN);

// Start command for the bot
bot.start((ctx) => {
  ctx.reply('Welcome to the Mini App! Use the login widget to authenticate.');
});

// Launch the bot
bot.launch();
console.log('Bot is running...');

// Helper function to validate Telegram data
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

// Authentication endpoint for Telegram Login Widget
app.post('/auth', (req, res) => {
  const data = req.body;

  // Validate the data
  if (validateTelegramData(data, BOT_TOKEN)) {
    // Authentication successful
    console.log('User authenticated:', data);
    res.status(200).json({ message: 'Login successful!', user: data });
  } else {
    // Authentication failed
    console.log('Invalid login attempt:', data);
    res.status(403).json({ message: 'Invalid login!' });
  }
});

// Endpoint to validate initData from the Mini App
app.post('/validate-initdata', (req, res) => {
  const initData = req.body.initData;

  // Convert initData to URLSearchParams
  const params = new URLSearchParams(initData);

  // Extract hash and other parameters
  const hash = params.get('hash');
  const data = {};
  params.forEach((value, key) => {
    if (key !== 'hash') data[key] = value;
  });

  // Validate the data
  if (validateTelegramData({ ...data, hash }, BOT_TOKEN)) {
    // Validation successful
    console.log('initData validated:', data);
    res.status(200).json({ message: 'Validation successful!', data });
  } else {
    // Validation failed
    console.log('Invalid initData:', initData);
    res.status(403).json({ message: 'Invalid initData!' });
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});