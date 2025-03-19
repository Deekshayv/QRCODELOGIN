const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg"); // Import PostgreSQL client

const app = express();
app.use(cors({ origin: "https://qrcodelogin-1.onrender.com" }));
app.use(bodyParser.json());

// PostgreSQL Database Connection
const pool = new Pool({
    user: "mydatabase_25kt_user",       // Replace with your PostgreSQL username
    host: "dpg-cv9uocbtq21c73boolt0-a", // Change if using a remote database
    database: "mydatabase_25kt",        // Replace with your database name
    password: "LcmkSg9GxhRjBprMmL9egj1GB9wBe6KR", // Replace with your PostgreSQL password
    port: 5432,                         // Default PostgreSQL port
});

// Test database connection
pool.connect()
    .then(() => console.log("Connected to PostgreSQL Database"))
    .catch((err) => {
        console.error("Database connection failed: ", err);
        process.exit(1);

    } else {
        console.log("Connected to MySQL Database");
    }
);

    


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
app.post("/scan-qr", async (req, res) => {
    const { serialNumber } = req.body;
    console.log("Received serial Number:", serialNumber);

    if (!serialNumber) {
        return res.status(400).json({ message: "Serial number is required!" });
    }

    try {
        // Check if the QR code exists in the database
        const result = await pool.query("SELECT * FROM qr_codes WHERE serial_number = $1", [serialNumber]);

        if (result.rows.length === 0) {
            return res.json({ message: "QR Code not found!" });
        }

        if (result.rows[0].scanned) {
            return res.json({ message: "QR Code already scanned!" });
        }

        // If QR code is not scanned, update it
        await pool.query(
            "UPDATE qr_codes SET scanned = TRUE, scanned_at = NOW() WHERE serial_number = $1",
            [serialNumber]
        );

        return res.json({ message: "QR Code scanned successfully!" });

    } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({ message: "Database error", error });
    }
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

