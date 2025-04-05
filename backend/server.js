require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

// PostgreSQL Database Connection
const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_ySPh4vCn7mLU@ep-bold-field-a5wfrijr-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
    ssl: { rejectUnauthorized: false }
});

// Test database connection
pool.connect()
    .then(() => console.log("Connected to PostgreSQL Database"))
    .catch((err) => {
        console.error("Database connection failed: ", err);
        process.exit(1);
    });

let otpStore = {};

// Simplified root endpoint
app.get("/", (req, res) => {
    res.json({ status: "Server is running successfully" });
});

// Health check endpoint (optional - can be removed if not needed)
app.get("/health", async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'healthy' });
    } catch (err) {
        res.status(500).json({ status: 'unhealthy' });
    }
});

// [Keep all your existing endpoint handlers exactly as they are]
// Generate and Send OTP
app.post("/send-otp", (req, res) => {
    // ... existing code ...
});

// Verify OTP
app.post("/verify-otp", (req, res) => {
    // ... existing code ...
});

// Scan QR Code
app.post("/scan-qr", async (req, res) => {
    // ... existing code ...
});

// Get user scans
app.post("/get-user-scans", async (req, res) => {
    // ... existing code ...
});

// Add QR code
app.post("/add-qr-code", async (req, res) => {
    // ... existing code ...
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
