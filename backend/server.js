const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors({ origin: ["https://qrcodelogin.onrender.com", "https://qrcodelogin-1.onrender.com"] }));
app.use(bodyParser.json());

let otpStore = {}; // Store OTPs with expiration

// Base URL Route
app.get("/", (req, res) => {
    res.send("Server is running successfully!");
});

// Send OTP (Now Expires After 5 Mins)
app.post("/send-otp", (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "Phone number is required!" });

    const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
    otpStore[phone] = { otp, timestamp: Date.now() }; // Store OTP with timestamp

    console.log(`Generated OTP for ${phone}: ${otp}`);
    res.json({ otp });
});

// Verify OTP
app.post("/verify-otp", (req, res) => {
    const { phone, otp } = req.body;
    
    if (!otpStore[phone]) return res.json({ success: false, message: "OTP expired! Request a new one." });

    const { otp: storedOtp, timestamp } = otpStore[phone];

    if (Date.now() - timestamp > 5 * 60 * 1000) { // 5 minutes expiration
        delete otpStore[phone];
        return res.json({ success: false, message: "OTP expired! Request a new one." });
    }

    if (storedOtp.toString() === otp.toString()) {
        delete otpStore[phone]; // Remove OTP after successful verification
        return res.json({ success: true, message: "OTP Verified!" });
    } else {
        return res.json({ success: false, message: "Invalid OTP! Please try again." });
    }
});

// Scan QR Code
app.post("/scan-qr", (req, res) => {
    const { qr_code, qrCode } = req.body;
    const qrData = qr_code || qrCode; // Accept both formats

    if (!qrData) {
        return res.status(400).json({ message: "QR Code is required!" });
    }

    console.log("Received QR Code:", qrData);
    return res.json({ message: "QR Code scanned successfully!" });
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

