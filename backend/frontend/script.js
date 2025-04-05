let scanner;
let otpTimer;
let timeLeft = 30;
let attemptCount = 0;
const MAX_ATTEMPTS = 3;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("phone").addEventListener("input", validatePhoneInput);
    document.getElementById("sendOTP").addEventListener("click", sendOTP);
    document.getElementById("verifyOTP").addEventListener("click", verifyOTP);
    document.getElementById("resendOTP").addEventListener("click", resendOTP);
    document.getElementById("scanQR").addEventListener("click", startScanner);
});

function validatePhoneInput(e) {
    this.value = this.value.replace(/[^0-9]/g, '');
    if (this.value.length > 10) {
        this.value = this.value.slice(0, 10);
    }
}

async function sendOTP() {
    const phone = document.getElementById("phone").value.trim();
    
    if (!/^\d{10}$/.test(phone)) {
        alert("Please enter a valid 10-digit phone number.");
        return;
    }

    try {
        const response = await fetch("https://qrcodelogin-main-1.onrender.com/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone })
        });
        
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        attemptCount++;
        
        // Update UI
        document.getElementById("otpSection").style.display = "block";
        document.getElementById("otpDisplay").innerText = `Your OTP: ${data.otp}`;
        document.getElementById("resendOTP").style.display = "none";
        
        // Hide phone input
        document.getElementById("phone").disabled = true;
        document.getElementById("sendOTP").disabled = true;
        
        // Reset OTP input
        document.getElementById("otp").value = "";
        document.getElementById("otp").disabled = false;
        document.getElementById("verifyOTP").disabled = false;
        
        startTimer();
    } catch (error) {
        console.error("Error sending OTP:", error);
        alert("Failed to send OTP. Please try again.");
    }
}

function resendOTP() {
    if (attemptCount >= MAX_ATTEMPTS) {
        alert("Maximum attempts reached. Please try again later.");
        return;
    }
    sendOTP();
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
            document.getElementById("otp").disabled = true;
            document.getElementById("verifyOTP").disabled = true;
            document.getElementById("otpDisplay").innerText = "OTP expired. Please request a new one.";
            document.getElementById("resendOTP").style.display = "inline";
            
            if (attemptCount >= MAX_ATTEMPTS) {
                document.getElementById("resendOTP").disabled = true;
                document.getElementById("otpDisplay").innerText = "Maximum attempts reached. Please try again later.";
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    document.getElementById("otpTimer").innerText = `Time remaining: ${timeLeft} seconds`;
}

async function verifyOTP() {
    const phone = document.getElementById("phone").value.trim();
    const otp = document.getElementById("otp").value.trim();

    if (!otp) {
        alert("Please enter the OTP");
        return;
    }

    try {
        const response = await fetch("https://qrcodelogin-main-1.onrender.com/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, otp })
        });
        
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        
        if (data.success) {
            clearInterval(otpTimer);
            document.getElementById("qrSection").style.display = "block";
            document.getElementById("otpSection").style.display = "none";
            attemptCount = 0;
            loadUserScans(phone);
        } else {
            alert("Invalid OTP! Please try again.");
            if (attemptCount >= MAX_ATTEMPTS) {
                document.getElementById("otpDisplay").innerText = "Maximum attempts reached. Please try again later.";
                document.getElementById("otp").disabled = true;
                document.getElementById("verifyOTP").disabled = true;
                document.getElementById("resendOTP").disabled = true;
                clearInterval(otpTimer);
            }
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        alert("OTP verification failed. Please try again.");
    }
}

function startScanner() {
    if (scanner) {
        scanner.clear();
        scanner = null;
    }

    scanner = new Html5QrcodeScanner("qr-video", { 
        fps: 10, 
        qrbox: 250,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
    });

    scanner.render(
        (decodedText) => handleScannedQR(decodedText),
        (errorMessage) => {
            console.error("QR Scanner Error:", errorMessage);
            document.getElementById("scanMessage").innerText = `Scanner error: ${errorMessage}`;
            document.getElementById("scanMessage").style.color = "red";
        }
    );
}

async function handleScannedQR(decodedText) {
    scanner.clear();
    scanner = null;

    const phone = document.getElementById("phone").value.trim();
    const scanMessage = document.getElementById("scanMessage");

    try {
        const response = await fetch("https://qrcodelogin-main-1.onrender.com/scan-qr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                serialNumber: decodedText,
                phone: phone
            })
        });
        
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        
        if (data.duplicate) {
            scanMessage.innerText = "You've already scanned this QR code!";
            scanMessage.style.color = "red";
        } else if (data.expired) {
            scanMessage.innerText = "This QR code has already been used!";
            scanMessage.style.color = "red";
        } else if (data.success) {
            scanMessage.innerText = "QR Code scanned successfully!";
            scanMessage.style.color = "green";
            loadUserScans(phone);
        } else {
            scanMessage.innerText = data.message || "Error scanning QR code";
            scanMessage.style.color = "red";
        }
    } catch (error) {
        console.error("Error scanning QR Code:", error);
        scanMessage.innerText = "Failed to scan QR Code. Please try again.";
        scanMessage.style.color = "red";
    }
}

async function loadUserScans(phone) {
    try {
        const response = await fetch("https://qrcodelogin-main-1.onrender.com/get-user-scans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone })
        });
        
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        
        if (data.success) {
            const scansList = document.createElement("div");
            scansList.innerHTML = `<h3>Your Scanned QR Codes (${data.count}):</h3>`;
            
            if (data.scans.length > 0) {
                const list = document.createElement("ul");
                data.scans.forEach(scan => {
                    const item = document.createElement("li");
                    item.textContent = `${scan.serial_number} - ${new Date(scan.scanned_at).toLocaleString()}`;
                    list.appendChild(item);
                });
                scansList.appendChild(list);
            } else {
                scansList.innerHTML += "<p>No QR codes scanned yet.</p>";
            }
            
            const existingList = document.getElementById("scansList");
            if (existingList) {
                existingList.replaceWith(scansList);
            } else {
                scansList.id = "scansList";
                document.getElementById("qrSection").appendChild(scansList);
            }
        }
    } catch (error) {
        console.error("Error loading user scans:", error);
        document.getElementById("scanMessage").innerText = "Failed to load scan history";
        document.getElementById("scanMessage").style.color = "red";
    }
}
