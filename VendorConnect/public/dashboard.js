console.log("DASHBOARD JS IS WORKING");

const API_URL = "/api";

const savedVendor = localStorage.getItem("vendorData");

if (!savedVendor) {
    alert("No shop found. Please register your shop first.");
    window.location.href = "register.html";
} else {

    const vendor = JSON.parse(savedVendor);

    console.log("Current vendor:", vendor);

    // =========================
    // VENDOR INFORMATION
    // =========================

    document.getElementById("ownerName").textContent =
        vendor.ownerName;

    document.getElementById("welcomeMessage").textContent =
        `Welcome, ${vendor.ownerName} 👋`;

    document.getElementById("shopName").textContent =
        vendor.shopName;

    document.getElementById("shopCategory").textContent =
        vendor.category;

    document.getElementById("shopLocation").textContent =
        `📍 ${vendor.location}`;


    // =========================
    // AVATARS
    // =========================

    const ownerInitial =
        vendor.ownerName.charAt(0).toUpperCase();

    const shopWords =
        vendor.shopName.trim().split(" ");

    let shopInitials = "";

    if (shopWords.length >= 2) {
        shopInitials =
            shopWords[0][0] +
            shopWords[1][0];
    } else {
        shopInitials =
            shopWords[0].substring(0, 2);
    }

    document.getElementById("profileAvatar").textContent =
        ownerInitial;

    document.getElementById("shopAvatar").textContent =
        shopInitials.toUpperCase();


    // =========================
    // CUSTOMER SHOP LINK
    // =========================

    const shopURL =
        `customer/shop.html?shop=${vendor.shopId}`;

    const viewShopButton =
        document.querySelector(".primary-button");

    if (viewShopButton) {
        viewShopButton.href = shopURL;

        viewShopButton.addEventListener("click", () => {
            console.log("Opening shop:", shopURL);
        });
    }


    // =========================
    // PRODUCT COUNT
    // =========================

    loadProductCount(vendor.shopId);
    loadShopViews(vendor.shopId);


    // =========================
    // QUICK ACTIONS
    // =========================

    const actionCards =
        document.querySelectorAll(".action-card");


    // Add Products
    if (actionCards[0]) {
        actionCards[0].addEventListener("click", (event) => {
            event.preventDefault();

            window.location.href =
                "products.html";
        });
    }


    // QR Code
    if (actionCards[1]) {
        actionCards[1].addEventListener("click", (event) => {
            event.preventDefault();

            window.location.href = "qr.html";
        });
    }


    // Customize Shop
    if (actionCards[2]) {
        actionCards[2].addEventListener("click", (event) => {
            event.preventDefault();

            window.location.href = "settings.html";
        });
    }


    // =========================
    // SIDEBAR LINKS
    // =========================

    const sidebarLinks =
        document.querySelectorAll(".nav-item");


    // My Shop
    if (sidebarLinks[1]) {
        sidebarLinks[1].href =
            shopURL;
    }


    // Products
    if (sidebarLinks[2]) {
        sidebarLinks[2].href =
            "products.html";
    }


    // =========================
    // SETTINGS
    // =========================

    const settingsLink =
        document.getElementById("settingsLink");

    if (settingsLink) {
        settingsLink.href = "settings.html";
    }


    // =========================
    // EDIT SHOP
    // =========================

    const editShopLink =
        document.getElementById("editShopLink");

    if (editShopLink) {
        editShopLink.addEventListener("click", (event) => {
            event.preventDefault();

            window.location.href = "settings.html";
        });
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

            window.location.href =
                "index.html";
        });
    }
}


// =========================
// LOAD PRODUCT COUNT
// =========================

async function loadProductCount(shopId) {

    const productCountElement =
        document.getElementById("productCount");

    productCountElement.textContent = "…";

    try {

        const response =
            await fetch(
                `${API_URL}/shops/${shopId}/products`
            );

        if (!response.ok) {
            throw new Error("Failed to load products");
        }

        const products =
            await response.json();

        productCountElement.textContent = products.length;

    } catch (error) {

        console.error(
            "Could not load product count:",
            error
        );

        productCountElement.textContent = "—";

    }
}


// =========================
// LOAD SHOP VIEWS
// =========================

async function loadShopViews(shopId) {

    const shopViewsElement =
        document.getElementById("shopViews");

    shopViewsElement.textContent = "…";

    try {

        const response =
            await fetch(`${API_URL}/shops/${shopId}`);

        if (!response.ok) {
            throw new Error("Failed to load shop");
        }

        const shop = await response.json();

        shopViewsElement.textContent = shop.views || 0;

    } catch (error) {

        console.error("Could not load shop views:", error);

        shopViewsElement.textContent = "—";

    }
}
