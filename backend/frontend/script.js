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

  // Back button from OTP section
  document.getElementById('backFromOTP').addEventListener('click', function() {
    document.getElementById('otpSection').style.display = 'none';
    document.getElementById('phone').style.display = 'block';
    document.getElementById('sendOTP').style.display = 'block';
    document.getElementById('phoneLabel').style.display = 'block';
    clearInterval(otpTimer);
  });

  // Back button from QR section
  document.getElementById('backFromQR').addEventListener('click', function() {
    document.getElementById('qrSection').style.display = 'none';
    document.getElementById('otpSection').style.display = 'block';
    if (scanner) {
      scanner.clear();
      scanner = null;
    }
  });
}

async function sendOTP() {
  const phone = document.getElementById('phone').value;
  
  if (phone.length !== 10) {
    alert('Please enter exactly 10-digit phone number.');
    return;
  }

  try {
    const response = await fetch('https://qrcodelogin-main-5j9v.onrender.com/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to send OTP');
    }

    attemptCount++;
    document.getElementById('otpSection').style.display = 'block';
    document.getElementById('otpDisplay').textContent = `Your OTP: ${data.otp}`;
    document.getElementById('resendOTP').style.display = 'none';

    document.getElementById('phone').style.display = 'none';
    document.getElementById('sendOTP').style.display = 'none';
    document.getElementById('phoneLabel').style.display = 'none';

    document.getElementById('otp').value = '';
    document.getElementById('otp').disabled = false;
    document.getElementById('verifyOTP').disabled = false;

    startTimer();

  } catch (error) {
    console.error('Error sending OTP:', error);
    alert(error.message || 'Failed to send OTP. Please try again.');
  }
}

function startTimer() {
  clearInterval(otpTimer);
  timeLeft = 30;
  updateTimerDisplay();

  otpTimer = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();

    if (timeLeft <= 0) {
      clearInterval(otpTimer);
      document.getElementById('otp').disabled = true;
      document.getElementById('verifyOTP').disabled = true;
      document.getElementById('otpDisplay').textContent = 'OTP expired. Please request a new one.';
      document.getElementById('resendOTP').style.display = 'inline';
      
      if (attemptCount >= MAX_ATTEMPTS) {
        document.getElementById('resendOTP').disabled = true;
        document.getElementById('otpDisplay').textContent = 'Maximum attempts reached. Please try again later.';
      }
    }
  }, 1000);
}

function updateTimerDisplay() {
  document.getElementById('otpTimer').textContent = `Time remaining: ${timeLeft} seconds`;
}

async function verifyOTP() {
  const phone = document.getElementById('phone').value;
  const otp = document.getElementById('otp').value;

  if (!otp) {
    alert('Please enter the OTP');
    return;
  }

  try {
    const response = await fetch('https://qrcodelogin-main-5j9v.onrender.com/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Invalid OTP');
    }

    clearInterval(otpTimer);
    document.getElementById('qrSection').style.display = 'block';
    document.getElementById('otpSection').style.display = 'none';
    attemptCount = 0;
    loadUserScans(phone);

  } catch (error) {
    console.error('Error verifying OTP:', error);
    alert(error.message || 'OTP verification failed.');
    
    if (attemptCount >= MAX_ATTEMPTS) {
      document.getElementById('otpDisplay').textContent = 'Maximum attempts reached. Please try again later.';
      document.getElementById('otp').disabled = true;
      document.getElementById('verifyOTP').disabled = true;
      document.getElementById('resendOTP').disabled = true;
      clearInterval(otpTimer);
    }
  }
}

function startScanner() {
  const phone = document.getElementById('phone').value;
  if (!phone) {
    alert('Please verify your phone number first.');
    return;
  }

  document.getElementById('scanQR').disabled = true;
  document.getElementById('scanStatus').innerHTML = 'Preparing scanner...';
  document.getElementById('scanStatus').style.backgroundColor = '#e6f7ff';
  document.getElementById('scanStatus').style.color = '#0066cc';

  if (!scanner) {
    scanner = new Html5QrcodeScanner('qr-video', { 
      fps: 10, 
      qrbox: 250,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
    });
  }

  scanner.render(
    (decodedText) => {
      scanner.clear();
      scanner = null;
      handleScannedQR(decodedText, phone);
    },
    (errorMessage) => {
      console.error('QR Scanner Error:', errorMessage);
      document.getElementById('scanStatus').innerHTML = `Scanner error: ${errorMessage}`;
      document.getElementById('scanStatus').style.backgroundColor = '#ffebee';
      document.getElementById('scanStatus').style.color = '#c62828';
      document.getElementById('scanQR').disabled = false;
    }
  );
}

async function handleScannedQR(decodedText, phone) {
  document.getElementById('scanStatus').innerHTML = 'Processing QR code...';
  document.getElementById('scanStatus').style.backgroundColor = '#e6f7ff';
  document.getElementById('scanStatus').style.color = '#0066cc';
  
  try {
    const response = await fetch('https://qrcodelogin-main-5j9v.onrender.com/scan-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        serialNumber: decodedText,
        phone: phone
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      let errorMessage = data.message || 'Error scanning QR code';
      if (data.alreadyUsed) {
        errorMessage += '\nThis QR code is already assigned to another user.';
      }
      throw new Error(errorMessage);
    }

    document.getElementById('scanStatus').innerHTML = 'QR Code scanned successfully!';
    document.getElementById('scanStatus').style.backgroundColor = '#e8f5e9';
    document.getElementById('scanStatus').style.color = '#2e7d32';
    loadUserScans(phone);

  } catch (error) {
    console.error('Error scanning QR Code:', error);
    document.getElementById('scanStatus').innerHTML = error.message;
    document.getElementById('scanStatus').style.backgroundColor = '#ffebee';
    document.getElementById('scanStatus').style.color = '#c62828';
  } finally {
    document.getElementById('scanQR').disabled = false;
  }
}

async function loadUserScans(phone) {
  try {
    const response = await fetch('https://qrcodelogin-main-5j9v.onrender.com/get-user-scans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to load scan history');
    }

    const scansList = document.createElement('div');
    scansList.innerHTML = `<h3>Your Scanned QR Codes (${data.count || 0}):</h3>`;
    
    if (data.scans && data.scans.length > 0) {
      const list = document.createElement('ul');
      data.scans.forEach(scan => {
        const item = document.createElement('li');
        item.textContent = `${scan.serial_number} - ${new Date(scan.scanned_at).toLocaleString()}`;
        list.appendChild(item);
      });
      scansList.appendChild(list);
    } else {
      scansList.innerHTML += '<p>No QR codes scanned yet.</p>';
    }
    
    const existingList = document.getElementById('scansList');
    if (existingList) {
      existingList.replaceWith(scansList);
    } else {
      scansList.id = 'scansList';
      document.getElementById('qrSection').appendChild(scansList);
    }

  } catch (error) {
    console.error('Error loading user scans:', error);
    document.getElementById('scanStatus').innerHTML = error.message;
    document.getElementById('scanStatus').style.backgroundColor = '#ffebee';
    document.getElementById('scanStatus').style.color = '#c62828';
  }
}
