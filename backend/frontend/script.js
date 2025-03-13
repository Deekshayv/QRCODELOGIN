document.getElementById("sendOTP").addEventListener("click", function () {
    let phone = document.getElementById("phone").value;

    fetch("https://qrcodelogin.onrender.com/send-otp", {
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
    let phone = document.getElementById("phone").value; // ✅ Ensure phone number is sent

    fetch("https://qrcodelogin.onrender.com/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone, otp }) // ✅ Added phoneNumber
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

// Declare QR Scanner globally
let scanner;

document.getElementById("scanQR").addEventListener("click", function () {
    if (!scanner) {
        scanner = new Html5QrcodeScanner("qr-video", { fps: 10, qrbox: 250 });
    }

    scanner.render((decodedText) => {
        scanner.clear(); // Stop scanner after successful scan
        console.log("Scanned QR Code:", decodedText); // Debugging log

        fetch("https://qrcodelogin.onrender.com/scan-qr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ serialNumber: decodedText })
        })
        .then(res => {
            if (!res.ok) {
                throw new Error("Server returned an error.");
            }
            return res.json();
        })
        .then(data => {
            alert(data.message);
            document.getElementById("scanQR").disabled = true; // Disable Scan Button
        })
        .catch(error => {
            console.error("Error scanning QR Code:", error);
            alert("Failed to scan QR Code. Please try again.");
        });
    }); // ✅ Fixed Syntax Error (Added Closing Parenthesis)
});
