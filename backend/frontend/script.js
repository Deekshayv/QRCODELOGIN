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
      if (response.ok) {
        console.log('Server returned empty 200 response - assuming success');
        const dummyOTP = '123456'; // TEMPORARY - Remove when backend is fixed
        attemptCount++;
        showOTPSection(dummyOTP);
        startTimer();
        return;
      }
      throw new Error('Server returned empty response');
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

function showOTPSection(otp) {
  document.getElementById('otpSection').style.display = 'block';
  document.getElementById('otpDisplay').textContent = `Your OTP: ${otp}`;
  document.getElementById('resendOTP').style.display = 'none';

  document.getElementById('phone').style.display = 'none';
  document.getElementById('sendOTP').style.display = 'none';
  document.getElementById('phoneLabel').style.display = 'none';

  document.getElementById('otp').value = '';
  document.getElementById('otp').disabled = false;
  document.getElementById('verifyOTP').disabled = false;
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
      handleOTPExpiration();
    }
  }, 1000);
}

function updateTimerDisplay() {
  document.getElementById('otpTimer').textContent = `Time remaining: ${timeLeft} seconds`;
}

function handleOTPExpiration() {
  document.getElementById('otp').disabled = true;
  document.getElementById('verifyOTP').disabled = true;
  document.getElementById('otpDisplay').textContent = 'OTP expired. Please request a new one.';
  document.getElementById('resendOTP').style.display = 'inline';
  
  if (attemptCount >= MAX_ATTEMPTS) {
    document.getElementById('resendOTP').disabled = true;
    document.getElementById('otpDisplay').textContent = 'Maximum attempts reached. Please try again later.';
  }
}

async function verifyOTP() {
  const phone = document.getElementById('phone').value;
  const otp = document.getElementById('otp').value.trim();

  if (!otp) {
    alert('Please enter the OTP');
    return;
  }

  const verifyOTPButton = document.getElementById('verifyOTP');
  verifyOTPButton.disabled = true;
  verifyOTPButton.textContent = 'Verifying...';

  try {
    console.log('Verifying OTP request:', { phone, otp, endpoint: 'https://qrcodelogin-main-5j9v.onrender.com/verify-otp' });

    const response = await fetch('https://qrcodelogin-main-5j9v.onrender.com/verify-otp', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ phone, otp })
    });

    console.log('Raw verification response:', response);

    if (!response) {
      throw new Error('No response received from server');
    }

    if (response.status === 0) {
      throw new Error('Network error - failed to connect to server');
    }

    const responseText = await response.text();
    console.log('Verification response text:', responseText);

    // Handle empty response case
    if (!responseText.trim()) {
      if (response.ok) {
        console.log('Server returned empty 200 response - assuming verification success');
        clearInterval(otpTimer);
        showQRScanner();
        return;
      }
      throw new Error('Server returned empty response');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.warn('Failed to parse verification JSON:', e);
      throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}...`);
    }

    if (!response.ok) {
      throw new Error(data.message || `Server returned ${response.status} ${response.statusText}`);
    }

    if (!data.success) {
      throw new Error(data.message || 'Invalid OTP');
    }

    clearInterval(otpTimer);
    showQRScanner();

  } catch (error) {
    console.error('Full verification error details:', {
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

    alert(`Verification Error: ${userMessage}`);
    
    if (attemptCount >= MAX_ATTEMPTS) {
      document.getElementById('otpDisplay').textContent = 'Maximum attempts reached. Please try again later.';
      document.getElementById('otp').disabled = true;
      document.getElementById('verifyOTP').disabled = true;
      document.getElementById('resendOTP').disabled = true;
      clearInterval(otpTimer);
    }
  } finally {
    verifyOTPButton.disabled = false;
    verifyOTPButton.textContent = 'Verify OTP';
  }
}

function showQRScanner() {
  document.getElementById('qrSection').style.display = 'block';
  document.getElementById('otpSection').style.display = 'none';
  attemptCount = 0;
  loadUserScans(document.getElementById('phone').value);
}

function resetToPhoneInput() {
  document.getElementById('otpSection').style.display = 'none';
  document.getElementById('phone').style.display = 'block';
  document.getElementById('sendOTP').style.display = 'block';
  document.getElementById('phoneLabel').style.display = 'block';
  clearInterval(otpTimer);
}

function resetToOTPInput() {
  document.getElementById('qrSection').style.display = 'none';
  document.getElementById('otpSection').style.display = 'block';
  if (scanner) {
    scanner.clear();
    scanner = null;
  }
}

function startScanner() {
  const phone = document.getElementById('phone').value;
  if (!phone) {
    alert('Please verify your phone number first.');
    return;
  }

  const scanQRButton = document.getElementById('scanQR');
  scanQRButton.disabled = true;
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
      scanQRButton.disabled = false;
    }
  );
}

async function handleScannedQR(decodedText, phone) {
  document.getElementById('scanStatus').innerHTML = 'Processing QR code...';
  document.getElementById('scanStatus').style.backgroundColor = '#e6f7ff';
  document.getElementById('scanStatus').style.color = '#0066cc';
  
  try {
    console.log('Scanning QR request:', { 
      serialNumber: decodedText, 
      phone, 
      endpoint: 'https://qrcodelogin-main-5j9v.onrender.com/scan-qr' 
    });

    const response = await fetch('https://qrcodelogin-main-5j9v.onrender.com/scan-qr', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        serialNumber: decodedText,
        phone: phone
      })
    });

    console.log('Raw scan response:', response);

    if (!response) {
      throw new Error('No response received from server');
    }

    if (response.status === 0) {
      throw new Error('Network error - failed to connect to server');
    }

    const responseText = await response.text();
    console.log('Scan response text:', responseText);

    // Handle empty response case
    if (!responseText.trim()) {
      if (response.ok) {
        console.log('Server returned empty 200 response - assuming scan success');
        document.getElementById('scanStatus').innerHTML = 'QR Code scanned successfully!';
        document.getElementById('scanStatus').style.backgroundColor = '#e8f5e9';
        document.getElementById('scanStatus').style.color = '#2e7d32';
        loadUserScans(phone);
        return;
      }
      throw new Error('Server returned empty response');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.warn('Failed to parse scan JSON:', e);
      throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}...`);
    }

    if (!response.ok) {
      throw new Error(data.message || `Server returned ${response.status} ${response.statusText}`);
    }

    if (!data.success) {
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
    console.error('Full scan error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    document.getElementById('scanStatus').innerHTML = error.message;
    document.getElementById('scanStatus').style.backgroundColor = '#ffebee';
    document.getElementById('scanStatus').style.color = '#c62828';
  } finally {
    document.getElementById('scanQR').disabled = false;
  }
}

async function loadUserScans(phone) {
  try {
    console.log('Loading user scans for phone:', phone);

    const response = await fetch('https://qrcodelogin-main-5j9v.onrender.com/get-user-scans', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ phone })
    });

    console.log('Raw scans response:', response);

    if (!response) {
      throw new Error('No response received from server');
    }

    if (response.status === 0) {
      throw new Error('Network error - failed to connect to server');
    }

    const responseText = await response.text();
    console.log('Scans response text:', responseText);

    // Handle empty response case
    if (!responseText.trim()) {
      if (response.ok) {
        console.log('Server returned empty 200 response - showing empty scan list');
        showEmptyScanList();
        return;
      }
      throw new Error('Server returned empty response');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.warn('Failed to parse scans JSON:', e);
      throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}...`);
    }

    if (!response.ok) {
      throw new Error(data.message || `Server returned ${response.status} ${response.statusText}`);
    }

    if (!data.success) {
      throw new Error(data.message || 'Failed to load scan history');
    }

    showScanList(data);

  } catch (error) {
    console.error('Full scans loading error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    showScanError(error.message);
  }
}

function showEmptyScanList() {
  const scansList = document.createElement('div');
  scansList.innerHTML = '<h3>Your Scanned QR Codes (0):</h3><p>No QR codes scanned yet.</p>';
  updateScanListDisplay(scansList);
}

function showScanList(data) {
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
  
  updateScanListDisplay(scansList);
}

function showScanError(errorMessage) {
  const errorDisplay = document.createElement('div');
  errorDisplay.innerHTML = `<p style="color: #c62828;">Error loading scans: ${errorMessage}</p>`;
  updateScanListDisplay(errorDisplay);
}

function updateScanListDisplay(newElement) {
  newElement.id = 'scansList';
  const existingList = document.getElementById('scansList');
  if (existingList) {
    existingList.replaceWith(newElement);
  } else {
    document.getElementById('qrSection').appendChild(newElement);
  }
}
