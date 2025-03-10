document.getElementById("sendOTP").addEventListener("click", function () {
    let phone = document.getElementById("phone").value;

    fetch("http://localhost:3000/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone }) // ✅ Corrected key name
    })
    .then(res => res.json())
    .then(data => {
        console.log("Received OTP:", data.otp); // ✅ Debugging log
        document.getElementById("otpSection").style.display = "block";
        document.getElementById("otpDisplay").innerText = "Your OTP: " + data.otp;

        // ✅ Disable Phone Input and Send OTP Button
        document.getElementById("phone").disabled = true;
        document.getElementById("sendOTP").disabled = true;
    })
    .catch(error => {
        console.error("Error sending OTP:", error);
        alert("Failed to send OTP. Try again.");
    });
});


document.getElementById("verifyOTP").addEventListener("click", function () {
    let otp = document.getElementById("otp").value;

    fetch("http://localhost:3000/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById("qrSection").style.display = "block"; // Show QR Scanner

            // ✅ Disable OTP Input and Verify OTP Button
            document.getElementById("otp").disabled = true;
            document.getElementById("verifyOTP").disabled = true;
        } else {
            alert("Invalid OTP!");
        }
    })
    .catch(error => {
        console.error("Error verifying OTP:", error);
        alert("OTP verification failed.");
    });
});

// Function to scan QR Code
document.getElementById("scanQR").addEventListener("click", function () {
    let scanner = new Html5QrcodeScanner("qr-video", { fps: 10, qrbox: 250 });

    scanner.render((decodedText) => {
        scanner.clear();

        console.log("Scanned QR Code:", decodedText); // Debugging log

        fetch("http://localhost:3000/scan-qr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ serialNumber: decodedText })
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);

            // ✅ Disable Scan QR Code Button after successful scan
            document.getElementById("scanQR").disabled = true;
        })
        .catch(error => {
            console.error("Error scanning QR Code:", error);
            alert("Failed to scan QR Code. Please try again.");
        });

    }, (errorMessage) => {
        console.error("QR Scanner Error:", errorMessage);
        alert("QR Code scanning failed. Make sure the QR code is valid and visible.");
    });
});