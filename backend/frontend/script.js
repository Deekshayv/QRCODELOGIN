let scanner;
let storedPhoneNumber = "";

// Send OTP
document.getElementById("sendOTP").addEventListener("click", function() {
    let phone = document.getElementById("phone").value.trim(); // Trim spaces
    storedPhoneNumber = phone;

    if (!phone) {
        alert("Please enter a valid phone number!");
        return;
    }

    console.log("Sending OTP to:", phone); // Debugging Log

    fetch("https://qrcodelogin-1.onrender.com/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
    })
    .then(response => response.json())
    .then(data => {
        if (data.otp) {
            document.getElementById("otpSection").style.display = "block";
            document.getElementById("otpDisplay").innerText = "Your OTP: " + data.otp;
            
            document.getElementById("phone").style.display = "none";
            document.getElementById("sendOTP").style.display = "none";
            document.getElementById("phoneLabel").style.display = "none";

            setTimeout(() => {
                document.getElementById("otpDisplay").innerText = "Your OTP has expired. Request a new one.";
                document.getElementById("otp").disabled = true;
                document.getElementById("verifyOTP").disabled = true;
            }, 30000);
        } else {
            alert("Failed to receive OTP. Try again.");
        }
    })
    .catch(error => {
        console.error("Error sending OTP:", error);
        alert("OTP request failed. Please check your network and try again.");
    });
});


// Verify OTP
document.getElementById("verifyOTP").addEventListener("click", function() {
    let otp = document.getElementById("otp").value;

    fetch("https://qrcodelogin-1.onrender.com/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: storedPhoneNumber, otp })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById("qrSection").style.display = "block";
            document.getElementById("otpDisplay").style.display = "none";
            document.getElementById("otp").style.display = "none";
            document.getElementById("verifyOTP").style.display = "none";
            document.getElementById("otpLabel").style.display = "none";
        } else {
            alert("Invalid OTP!");
        }
    })
    .catch(error => {
        console.error("Error verifying OTP:", error);
        alert("OTP verification failed.");
    });
});

// Scan QR Code
document.getElementById("scanQR").addEventListener("click", function() {
    if (!scanner) {
        scanner = new Html5Qrcode("qr-video");
    }

    scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
            console.log("Scanned QR Code:", decodedText);
            scanner.stop().then(() => { scanner.clear(); scanner = null; });

            fetch("https://qrcodelogin-1.onrender.com/scan-qr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serialNumber: decodedText })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    document.getElementById("scanMessage").innerText = "QR Code scanned successfully!";
                } else {
                    alert("QR Code scanning failed.");
                }
            })
            .catch(error => {
                console.error("Error scanning QR Code:", error);
                alert("QR Code scanning failed.");
            });
        },
        (errorMessage) => {
            console.warn("Scanning error:", errorMessage);
        }
    );
});
