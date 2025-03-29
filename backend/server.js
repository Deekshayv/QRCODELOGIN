require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());

// Database connection
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_ySPh4vCn7mLU@ep-bold-field-a5wfrijr-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
  ssl: { rejectUnauthorized: false }
});

// Test DB connection
pool.connect()
  .then(() => console.log('Connected to PostgreSQL Database'))
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

let otpStore = {};

// Send OTP endpoint
app.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone || phone.length !== 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid 10-digit phone number is required' 
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[phone] = otp;
    console.log(`OTP for ${phone}: ${otp}`);

    return res.status(200).json({
      success: true,
      otp: otp,
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

    if (otpStore[phone] && otpStore[phone] === otp) {
      delete otpStore[phone];
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

// Scan QR Code endpoint
app.post('/scan-qr', async (req, res) => {
  try {
    const { serialNumber, phone } = req.body;
    
    if (!serialNumber || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Serial number and phone number are required'
      });
    }

    // Check if QR exists
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

    // Already scanned by this user
    if (qrData.phone_number === phone) {
      return res.status(400).json({
        success: false,
        message: 'You have already scanned this QR code',
        duplicate: true
      });
    }

    // Already scanned by another user
    if (qrData.scanned && qrData.phone_number !== phone) {
      return res.status(400).json({
        success: false,
        message: 'QR code already used by another user',
        alreadyUsed: true
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

// Admin endpoint to add QR codes
app.post('/add-qr-code', async (req, res) => {
  try {
    const { serialNumber } = req.body;
    
    if (!serialNumber) {
      return res.status(400).json({
        success: false,
        message: 'Serial number is required'
      });
    }

    await pool.query(
      'INSERT INTO qr_codes (serial_number) VALUES ($1)',
      [serialNumber]
    );

    return res.status(201).json({
      success: true,
      message: 'QR code added successfully'
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'QR code already exists'
      });
    }
    console.error('Error in add-qr-code:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
