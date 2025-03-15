const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors({ origin: "https://qrcodelogin-1.onrender.com" }));
app.use(bodyParser.json());

// ✅ Allowed Serial Numbers (Only these will be accepted)
const allowedSerialNumbers = ["123456789", "987654321", "ABC123DEF", "QRCODE2025"];

let otpStore = {};

// Base Route
app.get("/", (req, res) => {
    res.send("Server is running successfully!");
});

// Generate and Send OTP
app.post("/send-otp", (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ message: "Phone number is required!" });
    }

    const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
    otpStore[phone] = otp; 

    console.log(`Generated OTP for ${phone}: ${otp}`);

    res.json({ otp });
});

// Verify OTP
app.post("/verify-otp", (req, res) => {
    const { phone, otp } = req.body;

    if (otpStore[phone] && otpStore[phone].toString() === otp.toString()) {
        delete otpStore[phone]; 
        res.json({ success: true, message: "OTP Verified!" });
    } else {
        res.json({ success: false, message: "Invalid OTP! Please try again." });
    }
});

// Scan QR Code (Only for Allowed Serial Numbers)
app.post("/scan-qr", (req, res) => {
    const { serialNumber } = req.body;
    console.log("Received Serial Number:", serialNumber);

    if (!serialNumber) {
        return res.status(400).json({ message: "Serial number is required!" });
    }

    if (allowedSerialNumbers.includes(serialNumber)) {
        return res.json({ success: true, message: "✅ QR Code Scanned Successfully!" });
    } else {
        return res.json({ success: false, message: "❌ Invalid QR Code!" });
    }
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

