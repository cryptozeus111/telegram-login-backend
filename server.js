// server.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { validate } = require('@telegram-apps/init-data-node');
const RateLimit = require('express-rate-limit');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Rate limiting middleware
const limiter = RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later."
});

app.use(limiter);

// Environment variables
const {
    TELEGRAM_BOT_TOKEN,
    JWT_SECRET,
    JWT_KEY_ID,
    APP_URL
} = process.env;

// Generate JWT token
const generateJwtToken = (userData) => {
    const payload = {
        telegram_id: userData.id,
        username: userData.username,
        avatar_url: userData.photo_url || "https://www.gravatar.com/avatar",
        sub: userData.id.toString(),
        name: userData.first_name,
        iss: "https://api.telegram.org",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 // Token valid for 1 hour
    };
    return jwt.sign(payload, JWT_SECRET, { algorithm: "RS256", keyid: JWT_KEY_ID });
};

// Authentication route
app.post('/auth/telegram', async (req, res) => {
    const { initDataRaw, isMocked, photoUrl } = req.body;

    if (!initDataRaw) {
        return res.status(400).json({ error: "initDataRaw is required" });
    }

    try {
        if (isMocked) {
            // Handle mock data for development
            const data = new URLSearchParams(initDataRaw);
            const user = JSON.parse(decodeURIComponent(data.get("user")));
            const mockUser = {
                id: user.id,
                username: user.username,
                photo_url: photoUrl || user.photo_url || "https://www.gravatar.com/avatar",
                first_name: user.first_name,
            };
            const JWTtoken = generateJwtToken(mockUser);
            return res.json({ token: JWTtoken });
        }

        // Validate real initData
        validate(initDataRaw, TELEGRAM_BOT_TOKEN);

        // Parse and validate user data
        const data = new URLSearchParams(initDataRaw);
        const user = JSON.parse(decodeURIComponent(data.get("user")));
        const validatedUser = {
            ...user,
            photo_url: photoUrl || user.photo_url || "https://www.gravatar.com/avatar",
        };

        // Generate JWT token
        const JWTtoken = generateJwtToken(validatedUser);
        res.json({ token: JWTtoken });
    } catch (error) {
        console.error("Error validating Telegram data:", error);
        res.status(400).json({ error: "Invalid Telegram data" });
    }
});

// Protected route example
app.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: 'Hello, ' + req.user.name });
});

// JWT authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    jwt.verify(token, JWT_SECRET, { algorithms: ['RS256'] }, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token.' });
        }
        req.user = user;
        next();
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});