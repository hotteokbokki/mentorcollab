require("dotenv").config();
const express = require("express");
const axios = require("axios");
const ngrok = require("ngrok"); // Exposes your local server to the internet

const app = express();
app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

// Store users who interacted with the bot
let users = {}; // Consider using MongoDB or another database for persistence

// Helper function to send messages
async function sendMessage(chatId, message) {
    try {
        const response = await axios.post(TELEGRAM_API_URL, {
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown' // Optional: If you want Markdown formatting in your messages
        });
        return response.data;
    } catch (error) {
        throw new Error(`Failed to send message: ${error.message}`);
    }
}

// Telegram Webhook (to store user details)
app.post("/webhook", (req, res) => {
    const message = req.body.message;
    if (message) {
        const chatId = message.chat.id;
        const userName = message.chat.username || "Unknown User";
        const firstName = message.chat.first_name || "No First Name";
        const lastName = message.chat.last_name || "No Last Name";

        users[userName] = { chatId, firstName, lastName };

        console.log(`User registered: ${userName} (${firstName} ${lastName}) with Chat ID: ${chatId}`);
    }
    res.sendStatus(200);
});

// Send Message to a User (using stored Telegram User ID)
app.post("/send-message", async (req, res) => {
    // Hardcoding the username here for sending the message (you can change this as needed)
    const userName = "eat_burgerr"; // You can replace this with a dynamic username or logic based on your needs
    const message = `
    *📢 Mentor Feedback Notification*

    🌟 *Mentor Feedback Summary*
    - **Mentor**: John Doe
    - **Rating**: ⭐⭐⭐⭐⭐ (5/5)
    - **Comments**:
    \`\`\`
    This mentor is fantastic! Keep up the great work.
    \`\`\`

    ✅ *Acknowledge Feedback*
    Please click the link below to acknowledge that you have received this feedback:

    [✅ Acknowledge Feedback](http://example.com/acknowledge)
    `;

    if (!users[userName]) {
        return res.status(400).json({ error: "User has not started the bot." });
    }

    try {
        const response = await sendMessage(users[userName].chatId, message);
        res.json({ success: true, response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Set the port for the server
const PORT = process.env.PORT || 3200;

// Function to set the webhook
async function setWebhook(ngrokUrl) {
    const webhookUrl = `${ngrokUrl}/webhook`;

    try {
        const response = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
            url: webhookUrl,
        });

        if (response.data.ok) {
            console.log(`✅ Webhook successfully set to: ${webhookUrl}`);
        } else {
            console.log(`❌ Failed to set webhook:`, response.data);
        }
    } catch (error) {
        console.error(`❌ Error setting webhook: ${error.message}`);
    }
}

// Start the server and ngrok tunnel
app.listen(PORT, async () => {
    console.log(`🚀 Localhost running on: http://localhost:${PORT}`);

    try {
        const ngrokUrl = await ngrok.connect(PORT);
        console.log(`🌍 Ngrok tunnel running at: ${ngrokUrl}`);

        // Set the webhook automatically
        await setWebhook(ngrokUrl);
    } catch (error) {
        console.log(`❌ Couldn't tunnel ngrok: ${error.message}`);
    }
});
