require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const postmark = require("postmark");

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

// Initialize Postmark client
const postmarkClient = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

// Enhanced PostgreSQL Connection Configuration
const poolConfig = {
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_ySPh4vCn7mLU@ep-bold-field-a5wfrijr-pooler.us-east-2.aws.neon.tech/neondb",
  ssl: {
    rejectUnauthorized: false,
    sslmode: 'require'
  },
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  max: 10
};

const pool = new Pool(poolConfig);

// Database connection health check
async function verifyDatabaseConnection() {
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    console.log("✅ Database connection verified");
    return true;
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    return false;
  } finally {
    if (client) client.release();
  }
}

// Verify connection on startup
verifyDatabaseConnection().then(isConnected => {
  if (!isConnected) {
    console.error("Fatal: Database connection could not be established");
    process.exit(1);
  }
});

// Connection error handling
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

let otpStore = {};

// ==================== EMAIL FUNCTIONALITY ==================== //

// Immediate scan confirmation email
async function sendScanConfirmation(phone, serialNumber) {
  try {
    await postmarkClient.sendEmail({
      "From": process.env.EMAIL_FROM,
      "To": `${phone}@example.com`, // Replace with actual user email
      "Subject": "QR Code Scan Confirmation",
      "TextBody": `You successfully scanned QR code ${serialNumber} at ${new Date().toLocaleString()}`
    });
    console.log(`📧 Scan confirmation sent to ${phone}`);
  } catch (error) {
    console.error("Failed to send scan confirmation:", error);
  }
}

// Daily report function
async function sendDailyReport() {
  const client = await pool.connect();
  try {
    // Get daily stats
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_scans,
        COUNT(DISTINCT phone_number) as unique_users,
        ARRAY_AGG(DISTINCT phone_number) as users
      FROM qr_codes
      WHERE scanned_at >= CURRENT_DATE
    `);

    // Send admin report
    await postmarkClient.sendEmail({
      "From": process.env.EMAIL_FROM,
      "To": process.env.ADMIN_EMAIL,
      "Subject": `Daily Scan Report - ${new Date().toLocaleDateString()}`,
      "TextBody": `
        Daily Scan Report:
        Total scans: ${stats.rows[0].total_scans}
        Unique users: ${stats.rows[0].unique_users}
        Generated at: ${new Date().toLocaleString()}
      `
    });

    console.log("📊 Daily report sent to admin");
    
    return true;
  } catch (error) {
    console.error("❌ Daily report failed:", error);
    return false;
  } finally {
    client.release();
  }
}

// ==================== API ENDPOINTS ==================== //

// Existing endpoints remain the same until scan-qr...

// Modified scan-qr endpoint to send email
app.post("/scan-qr", async (req, res) => {
  const { serialNumber, phone } = req.body;
  
  if (!serialNumber || !phone) {
    return res.status(400).json({
      success: false,
      message: "Serial number and phone number are required!"
    });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

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

    const result = await client.query(
      `UPDATE qr_codes 
       SET scanned = TRUE, phone_number = $1, scanned_at = NOW()
       WHERE serial_number = $2
       RETURNING *`,
      [phone, serialNumber]
    );

    await client.query('COMMIT');
    
    // Send confirmation email (non-blocking)
    sendScanConfirmation(phone, serialNumber);
    
    return res.json({
      success: true,
      message: "QR Code scanned successfully!",
      qrCode: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Scan error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  } finally {
    client.release();
  }
});

// Add new endpoint for manual report triggering
app.get("/trigger-daily-report", async (req, res) => {
  try {
    const success = await sendDailyReport();
    if (success) {
      res.json({ success: true, message: "Daily report sent successfully" });
    } else {
      res.status(500).json({ success: false, message: "Failed to send daily report" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ... Rest of your existing endpoints remain unchanged ...

// ==================== CRON JOB SETUP ==================== //

if (require.main === module) {
  const PORT = process.env.PORT || 10000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Start cron job in production
    if (process.env.NODE_ENV === 'production') {
      const cron = require('node-cron');
      cron.schedule('0 8 * * *', () => { // 8 AM daily
        console.log('🕒 Running scheduled daily report');
        sendDailyReport();
      });
      console.log('⏰ Scheduled daily email reports at 8 AM UTC');
    }
  });
}
