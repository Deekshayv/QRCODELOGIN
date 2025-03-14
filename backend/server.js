const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors({ origin: "https://qrcodelogin-1.onrender.com" }));
app.use(bodyParser.json());

// Store OTPs mapped to phone numbers
let otpStore = {};

// Base URL Route
app.get("/", (req, res) => {
    res.send("Server is running successfully!");
});

// Generate and Send OTP
app.post("/send-otp", (req, res) => {
    console.log("Received request body:", req.body);
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ message: "Phone number is required!" });
    }

    const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
    otpStore[phone] = otp; // Store OTP against phone number

    console.log(`Generated OTP for ${phone}: ${otp}`);

    res.json({ otp });
});

// Verify OTP
app.post("/verify-otp", (req, res) => {
    const { phone, otp } = req.body;

    console.log("Stored OTP:", otpStore[phone]);
    console.log("Received OTP:", otp);

    if (otpStore[phone] && otpStore[phone].toString() === otp.toString()) {
        delete otpStore[phone]; // Remove OTP after successful verification
        res.json({ success: true, message: "OTP Verified!" });
    } else {
        res.json({ success: false, message: "Invalid OTP! Please try again." });
    }
});

// Scan QR Code (No Database Connection)
app.post("/scan-qr", (req, res) => {
    const { serialNumber } = req.body;
    console.log("Received Serial Number:", serialNumber);

    if (!serialNumber) {
        return res.status(400).json({ message: "Serial number is required!" });
    }

    return res.json({ message: "QR Code scanned successfully!" });
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
