let scanner; // Scanner instance

document.getElementById("scanQR").addEventListener("click", function() {
    // Get phone number from form
    const phone = document.getElementById("phone").value;
    
    if (!phone) {
        alert("Please enter your phone number first");
        return;
    }

    // Initialize scanner if not already done
    if (!scanner) {
        scanner = new Html5QrcodeScanner("qr-video", { 
            fps: 10, 
            qrbox: 250 
        });
    }

    scanner.render((decodedText) => {
        // Clean up scanner
        scanner.clear();
        scanner = null;
        console.log("Scanned QR Code:", decodedText);

        // First associate QR code with phone number
        fetch("https://qrcodelogin-main-5j9v.onrender.com/scan-qr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                serialNumber: decodedText,
                phone: phone
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(scanData => {
            if (!scanData.success) {
                throw new Error(scanData.message || "Failed to associate QR code");
            }
            
            // After successful association, fetch user details
            return fetch("https://qrcodelogin-main-5j9v.onrender.com/fetch-user-details", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serialNumber: decodedText })
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(userData => {
            if (userData.success) {
                // Update UI
                document.getElementById("scanMessage").innerText = "User details fetched successfully!";
                document.getElementById("scanQR").style.display = "none";
                document.getElementById("qr-video").style.display = "none";
                
                // Show download button
                document.getElementById("downloadPDF").style.display = "block";
                document.getElementById("downloadPDF").setAttribute("data-user-id", userData.userId);
            } else {
                throw new Error(userData.message || "Failed to fetch user details");
            }
        })
        .catch(error => {
            console.error("Error:", error);
            document.getElementById("scanMessage").innerText = error.message;
            document.getElementById("scanMessage").style.color = "red";
            
            // Re-enable scan button if there was an error
            document.getElementById("scanQR").style.display = "block";
        });

    }, (errorMessage) => {
        // Handle scan error
        console.error("QR Scanner Error:", errorMessage);
        document.getElementById("scanMessage").innerText = "QR scanning failed: " + errorMessage;
        document.getElementById("scanMessage").style.color = "red";
    });
});

// Download PDF functionality (unchanged)
document.getElementById("downloadPDF").addEventListener("click", function() {
    const userId = this.getAttribute("data-user-id");
    if (!userId) {
        alert("No user data available to download");
        return;
    }

    fetch(`https://qrcodelogin-main-5j9v.onrender.com/download-pdf?userId=${userId}`, {
        method: "GET"
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.blob();
    })
    .then(blob => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "UserDetails.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    })
    .catch(error => {
        console.error("Error downloading PDF:", error);
        alert("Failed to download PDF: " + error.message);
    });
});
