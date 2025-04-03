let scanner;
let otpTimer;
let timeLeft = 30;
let attemptCount = 0;
const MAX_ATTEMPTS = 3;

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
});

function initEventListeners() {
  // Phone input validation
  document.getElementById('phone').addEventListener('input', function(e) {
    this.value = this.value.replace(/[^0-9]/g, '');
    if (this.value.length > 10) {
      this.value = this.value.slice(0, 10);
    }
  });

  // Send OTP button
  document.getElementById('sendOTP').addEventListener('click', sendOTP);

  // Resend OTP button
  document.getElementById('resendOTP').addEventListener('click', function() {
    if (attemptCount >= MAX_ATTEMPTS) {
      alert('Maximum attempts reached. Please try again later.');
      return;
    }
    sendOTP();
  });

  // Verify OTP button
  document.getElementById('verifyOTP').addEventListener('click', verifyOTP);

  // Scan QR button
  document.getElementById('scanQR').addEventListener('click', startScanner);

  // Back buttons
  document.getElementById('backFromOTP').addEventListener('click', resetToPhoneInput);
  document.getElementById('backFromQR').addEventListener('click', resetToOTPInput);
}

async function sendOTP() {
  const phone = document.getElementById('phone').value.trim();
  
  if (phone.length !== 10) {
    alert('Please enter exactly 10-digit phone number.');
    return;
  }

  const sendOTPButton = document.getElementById('sendOTP');
  sendOTPButton.disabled = true;
  sendOTPButton.textContent = 'Sending...';

  try {
    console.log('Sending OTP request:', { phone, endpoint: 'https://qrcodelogin-main-5j9v.onrender.com/send-otp' });

    const response = await fetch('https://qrcodelogin-main-5j9v.onrender.com/send-otp', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ phone })
    });

    console.log('Raw response:', response);

    if (!response) {
      throw new Error('No response received from server');
    }

    if (response.status === 0) {
      throw new Error('Network error - failed to connect to server');
    }

    const responseText = await response.text();
    console.log('Response text:', responseText);

    // Handle empty response case
    if (!responseText.trim()) {
      throw new Error('Server returned empty response - OTP not received');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.warn('Failed to parse JSON:', e);
      throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}...`);
    }

    if (!response.ok) {
      throw new Error(data.message || `Server returned ${response.status} ${response.statusText}`);
    }

    if (!data.success) {
      throw new Error(data.message || 'OTP sending failed (server rejected request)');
    }

    if (!data.otp || data.otp.length !== 6) {
      throw new Error('Invalid OTP received from server');
    }

    console.log('OTP sent successfully:', data);
    attemptCount++;
    showOTPSection(data.otp);
    startTimer();

  } catch (error) {
    console.error('Full error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    let userMessage = error.message;
    if (error.message.includes('Network error')) {
      userMessage = 'Network problem. Please check your internet connection.';
    } else if (error.message.includes('Failed to fetch')) {
      userMessage = 'Could not connect to server. Please try again later.';
    } else if (error.message.includes('invalid JSON') || error.message.includes('empty response')) {
      userMessage = 'Server error. Please contact support.';
    }

    alert(`Error: ${userMessage}`);
    
  } finally {
    sendOTPButton.disabled = false;
    sendOTPButton.textContent = 'Send OTP';
  }
}

// Rest of the file remains exactly the same...
// [Keep all other functions exactly as they were in your original file]
// showOTPSection, startTimer, updateTimerDisplay, handleOTPExpiration, 
// verifyOTP, showQRScanner, resetToPhoneInput, resetToOTPInput,
// startScanner, handleScannedQR, loadUserScans, showEmptyScanList,
// showScanList, showScanError, updateScanListDisplay
