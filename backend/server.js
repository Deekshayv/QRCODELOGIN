const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL Database Connection
//const db = mysql.createConnection({
  //  host: "mysql.railway.internal", 
    //port: "3306",        
   // user: "root",      
   // password: "xxVLGOoGjARZtJUuSbIqQkSxwpLEWmft", 
  //  database: "railway"
//});

//db.connect((err) => {
//   if (err) {
     //   console.error("Database connection failed: ", err);
      //  process.exit(1); // Exit the app if DB connection fails
  // } else {
  //      console.log("Connected to MySQL Database");
   }
});

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

    console.log(`Generated OTP for ${phone}: ${otp}`); // Debugging

    res.json({ otp });
});

// Verify OTP
app.post("/verify-otp", (req, res) => {
    const { phone, otp } = req.body;

    console.log("Stored OTP:", otpStore[phone]); // Debugging
    console.log("Received OTP:", otp);

    if (otpStore[phone] && otpStore[phone].toString() === otp.toString()) {
        delete otpStore[phone]; // Remove OTP after successful verification
        res.json({ success: true, message: "OTP Verified!" });
    } else {
        res.json({ success: false, message: "Invalid OTP! Please try again." });
    }
});

// Scan QR Code and store in database
app.post("/scan-qr", (req, res) => {
    const { serialNumber } = req.body;

    if (!serialNumber) {
        return res.status(400).json({ message: "Serial number is required!" });
    }

    // Check if the QR code exists in the database
    db.query("SELECT * FROM qr_codes WHERE serial_number = ?", [serialNumber], (err, results) => {
        if (err) {
            return res.status(500).json({ message: "Database error", error: err });
        }

        if (results.length === 0) {
            return res.json({ message: "QR Code not found!" });
        }

        if (results[0].scanned === 1) {
            return res.json({ message: "QR Code already scanned!" });
        }

        // If QR code is not scanned, update it
        db.query(
            "UPDATE qr_codes SET scanned = 1, scanned_at = NOW() WHERE serial_number = ?", 
            [serialNumber], 
            (err) => {
                if (err) {
                    return res.status(500).json({ message: "Failed to update QR Code status" });
                }
                return res.json({ message: "QR Code scanned successfully!" });
            }
        );
    });
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`); // Fixed string interpolation
});
