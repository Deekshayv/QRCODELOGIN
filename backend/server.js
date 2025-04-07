require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

// Enhanced PostgreSQL Database Connection
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  max: 20
};

const pool = new Pool(poolConfig);

// Database connection health check
async function checkDatabaseConnection() {
  let client;
  try {
    client = await pool.connect();
    console.log("Successfully connected to PostgreSQL Database");
    return true;
  } catch (err) {
    console.error("Database connection failed:", err);
    return false;
  } finally {
    if (client) client.release();
  }
}

// Verify database connection on startup
checkDatabaseConnection().then(isConnected => {
  if (!isConnected) {
    console.error("Fatal: Could not establish database connection");
    process.exit(1);
  }
});

// Connection error handling
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err);
  // Implement reconnection logic here if needed
});

let otpStore = {};

// API endpoints
app.get("/", (req, res) => {
  res.json({ 
    status: "Server is running successfully",
    database: pool.totalCount > 0 ? "connected" : "disconnected"
  });
});

app.post("/send-otp", (req, res) => {
  const { phone } = req.body;
  
  if (!phone || !/^\d{10}$/.test(phone)) {
    return res.status(400).json({ 
      success: false,
      message: "Valid 10-digit phone number is required!"
    });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[phone] = {
    code: otp,
    timestamp: Date.now(),
    attempts: 0
  };
  
  console.log(`OTP generated for ${phone}`);
  res.json({ 
    success: true,
    otp: otp,
    message: "OTP generated successfully"
  });
});

app.post("/verify-otp", (req, res) => {
  const { phone, otp } = req.body;
  
  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      message: "Phone number and OTP are required!"
    });
  }

  const storedOtp = otpStore[phone];
  
  // OTP expiration (5 minutes)
  if (!storedOtp || Date.now() - storedOtp.timestamp > 300000) {
    return res.json({
      success: false,
      message: "OTP expired or invalid!"
    });
  }

  storedOtp.attempts++;

  if (storedOtp.attempts > 3) {
    delete otpStore[phone];
    return res.json({
      success: false,
      message: "Maximum attempts reached! Request a new OTP."
    });
  }

  if (storedOtp.code === otp) {
    delete otpStore[phone];
    return res.json({
      success: true,
      message: "OTP verified successfully!"
    });
  }

  return res.json({
    success: false,
    message: "Invalid OTP!",
    attemptsLeft: 3 - storedOtp.attempts
  });
});

app.post("/scan-qr", async (req, res) => {
  const { serialNumber, phone } = req.body;
  
  if (!serialNumber || !phone) {
    return res.status(400).json({
      success: false,
      message: "Serial number and phone number are required!"
    });
  }

  try {
    const client = await pool.connect();
    
    try {
      // Begin transaction
      await client.query('BEGIN');

      // Check QR code status
      const qrCheck = await client.query(
        `SELECT * FROM qr_codes 
         WHERE serial_number = $1 FOR UPDATE`,
        [serialNumber]
      );

      if (qrCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.json({
          success: false,
          message: "QR Code not found!"
        });
      }

      const existingScan = qrCheck.rows[0];
      
      if (existingScan.scanned) {
        await client.query('ROLLBACK');
        return res.json({
          success: false,
          message: existingScan.phone_number === phone ? 
            "You've already scanned this QR code!" :
            "This QR code has already been used!",
          duplicate: true
        });
      }

      // Update QR code status
      const result = await client.query(
        `UPDATE qr_codes 
         SET scanned = TRUE, phone_number = $1, scanned_at = NOW()
         WHERE serial_number = $2
         RETURNING *`,
        [phone, serialNumber]
      );

      await client.query('COMMIT');
      
      return res.json({
        success: true,
        message: "QR Code scanned successfully!",
        qrCode: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Scan error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post("/get-user-scans", async (req, res) => {
  const { phone } = req.body;
  
  if (!phone) {
    return res.status(400).json({
      success: false,
      message: "Phone number is required!"
    });
  }

  try {
    const result = await pool.query(
      `SELECT serial_number, scanned_at 
       FROM qr_codes
       WHERE phone_number = $1 AND scanned = TRUE
       ORDER BY scanned_at DESC`,
      [phone]
    );

    return res.json({
      success: true,
      scans: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve scans"
    });
  }
});

app.post("/add-qr-code", async (req, res) => {
  const { serialNumber } = req.body;
  
  if (!serialNumber) {
    return res.status(400).json({
      success: false,
      message: "Serial number is required!"
    });
  }

  try {
    await pool.query(
      "INSERT INTO qr_codes (serial_number) VALUES ($1)",
      [serialNumber]
    );
    
    return res.json({
      success: true,
      message: "QR Code added successfully!"
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: "This QR code already exists!"
      });
    }
    
    console.error("Database error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add QR code"
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
