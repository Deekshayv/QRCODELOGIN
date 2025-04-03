require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');

const app = express();

// Serve static files
app.use(express.static(__dirname));

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsing middleware
app.use(bodyParser.json({ limit: '10kb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Database connection
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_ySPh4vCn7mLU@ep-bold-field-a5wfrijr-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
  ssl: { rejectUnauthorized: false }
});

// In-memory OTP storage (for demo purposes)
const otpStore = {};

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP endpoint
app.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    
    // Validate phone number
    if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid 10-digit phone number is required' 
      });
    }

    // Generate and store OTP
    const otp = generateOTP();
    otpStore[phone] = otp;
    console.log(`Generated OTP for ${phone}: ${otp}`); // For debugging

    return res.status(200).json({
      success: true,
      otp: otp, // Sending OTP back for demo (remove in production)
      message: 'OTP sent successfully'
    });

  } catch (error) {
    console.error('Error in send-otp:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify OTP endpoint
app.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    // Verify OTP
    if (otpStore[phone] && otpStore[phone] === otp) {
      delete otpStore[phone]; // OTP can only be used once
      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }
  } catch (error) {
    console.error('Error in verify-otp:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// QR Code Scanning endpoint
app.post('/scan-qr', async (req, res) => {
  try {
    const { serialNumber, phone } = req.body;
    
    if (!serialNumber || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Serial number and phone number are required'
      });
    }

    // Check if QR exists in database
    const qrCheck = await pool.query(
      'SELECT id, phone_number, scanned FROM qr_codes WHERE serial_number = $1',
      [serialNumber]
    );

    if (qrCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }

    const qrData = qrCheck.rows[0];

    // Check if already scanned
    if (qrData.phone_number === phone) {
      return res.status(400).json({
        success: false,
        message: 'You have already scanned this QR code'
      });
    }

    if (qrData.scanned && qrData.phone_number !== phone) {
      return res.status(400).json({
        success: false,
        message: 'QR code already used by another user'
      });
    }

    // Mark as scanned
    await pool.query(
      `UPDATE qr_codes 
       SET scanned = TRUE, phone_number = $1, scan_timestamp = NOW() 
       WHERE serial_number = $2`,
      [phone, serialNumber]
    );

    return res.status(200).json({
      success: true,
      message: 'QR code scanned successfully'
    });

  } catch (error) {
    console.error('Error in scan-qr:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user scans endpoint
app.post('/get-user-scans', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const result = await pool.query(
      `SELECT serial_number, scan_timestamp as scanned_at 
       FROM qr_codes 
       WHERE phone_number = $1 
       ORDER BY scan_timestamp DESC`,
      [phone]
    );

    return res.status(200).json({
      success: true,
      scans: result.rows,
      count: result.rowCount
    });

  } catch (error) {
    console.error('Error in get-user-scans:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
