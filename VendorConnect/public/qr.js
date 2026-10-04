console.log("QR JS IS WORKING");

const savedVendor = localStorage.getItem("vendorData");

if (!savedVendor) {

    alert("No shop found. Please register your shop first.");

    window.location.href = "register.html";

} else {

    const vendor = JSON.parse(savedVendor);


    // =========================
    // TOPBAR / PROFILE
    // =========================

    document.getElementById("ownerName").textContent =
        vendor.ownerName;

    document.getElementById("profileAvatar").textContent =
        vendor.ownerName.charAt(0).toUpperCase();

    document.getElementById("qrShopName").textContent =
        vendor.shopName;


    // =========================
    // SHOP LINK
    // =========================
    // Uses the current site's origin so it works whether you're
    // running on 127.0.0.1, localhost, or your local network IP.

    const shopURL =
        `${window.location.origin}/customer/shop.html?shop=${vendor.shopId}`;

    const shopUrlInput =
        document.getElementById("shopUrlInput");

    shopUrlInput.value = shopURL;


    const myShopLink =
        document.getElementById("myShopLink");

    if (myShopLink) {
        myShopLink.href = shopURL;
    }


    const openShopLink =
        document.getElementById("openShopLink");

    if (openShopLink) {
        openShopLink.href = shopURL;
    }


    // =========================
    // GENERATE QR CODE
    // =========================

    const qrCanvas =
        document.getElementById("qrCanvas");

    QRCode.toCanvas(
        qrCanvas,
        shopURL,
        {
            width: 210,
            margin: 1,
            color: {
                dark: "#0f172a",
                light: "#ffffff"
            }
        },
        (error) => {

            if (error) {
                console.error("Error generating QR code:", error);
                alert("Could not generate the QR code.");
            }

        }
    );


    // =========================
    // COPY SHOP LINK
    // =========================

    const copyUrlButton =
        document.getElementById("copyUrlButton");

    copyUrlButton.addEventListener("click", async () => {

        try {

            await navigator.clipboard.writeText(shopURL);

            copyUrlButton.textContent = "Copied!";

            copyUrlButton.classList.add("copied");

            setTimeout(() => {

                copyUrlButton.textContent = "Copy";

                copyUrlButton.classList.remove("copied");

            }, 1800);

        } catch (error) {

            console.error("Could not copy link:", error);

            // Fallback for browsers without clipboard API access
            shopUrlInput.select();
            document.execCommand("copy");
        }

    });


    // =========================
    // DOWNLOAD QR CODE
    // =========================

    const downloadQrButton =
        document.getElementById("downloadQrButton");

    downloadQrButton.addEventListener("click", () => {

        const link = document.createElement("a");

        const fileName =
            vendor.shopName.trim().replace(/\s+/g, "-").toLowerCase();

        link.download = `${fileName}-qr-code.png`;

        link.href = qrCanvas.toDataURL("image/png");

        link.click();

    });


    // =========================
    // SETTINGS
    // =========================

    const settingsLink =
        document.getElementById("settingsLink");

    if (settingsLink) {
        settingsLink.href = "settings.html";
    }


    // =========================
    // LOGOUT
    // =========================

    const logoutButton =
        document.querySelector(".logout");

    if (logoutButton) {

        logoutButton.addEventListener("click", (event) => {

            event.preventDefault();

            const confirmLogout =
                confirm("Are you sure you want to logout?");

            if (!confirmLogout) return;

            localStorage.removeItem("vendorData");

            window.location.href = "index.html";
        });
    }

}
