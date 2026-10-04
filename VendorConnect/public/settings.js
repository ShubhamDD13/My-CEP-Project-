const API_URL = "/api";

const savedVendor = localStorage.getItem("vendorData");

if (!savedVendor) {

    alert("No shop found. Please log in first.");

    window.location.href = "login.html";

} else {

    const vendor = JSON.parse(savedVendor);

    const shopForm = document.getElementById("shopForm");
    const passwordForm = document.getElementById("passwordForm");

    const shopName = document.getElementById("shopName");
    const ownerName = document.getElementById("ownerName");
    const category = document.getElementById("category");
    const location_ = document.getElementById("location");
    const description = document.getElementById("description");


    // =========================
    // HELPERS
    // =========================

    function showMessage(id, text, success = false) {

        const box = document.getElementById(id);

        box.textContent = text;
        box.className = "settings-message " + (success ? "success" : "error");
        box.style.display = "block";
    }

    function updateProfile() {

        document.getElementById("ownerNameDisplay").textContent =
            vendor.ownerName;

        document.getElementById("profileAvatar").textContent =
            vendor.ownerName.charAt(0).toUpperCase();
    }

    function saveVendorLocally() {
        localStorage.setItem("vendorData", JSON.stringify(vendor));
    }


    // =========================
    // FILL FORM
    // =========================

    updateProfile();

    shopName.value = vendor.shopName || "";
    ownerName.value = vendor.ownerName || "";
    location_.value = vendor.location || "";

    if (vendor.category) {
        category.value = vendor.category;
    }

    // Description is not kept in localStorage, so load it from the server
    fetch(`${API_URL}/shops/${vendor.shopId}`)
        .then(r => r.ok ? r.json() : null)
        .then(shop => {
            if (shop && shop.description) {
                description.value = shop.description;
            }
        })
        .catch(() => {});


    // =========================
    // SAVE SHOP DETAILS
    // =========================

    shopForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const button = document.getElementById("shopSave");

        button.disabled = true;
        button.textContent = "Saving...";

        try {

            const shopResponse = await fetch(
                `${API_URL}/shops/${vendor.shopId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: shopName.value,
                        location: location_.value,
                        category: category.value,
                        description: description.value
                    })
                }
            );

            const shopData = await shopResponse.json().catch(() => ({}));

            if (!shopResponse.ok) {
                throw new Error(shopData.message || "Could not update shop");
            }

            const vendorResponse = await fetch(
                `${API_URL}/vendors/${vendor.vendorId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: ownerName.value })
                }
            );

            const vendorData = await vendorResponse.json().catch(() => ({}));

            if (!vendorResponse.ok) {
                throw new Error(vendorData.message || "Could not update owner name");
            }

            vendor.shopName = shopName.value.trim();
            vendor.ownerName = ownerName.value.trim();
            vendor.category = category.value;
            vendor.location = location_.value.trim();

            saveVendorLocally();
            updateProfile();

            showMessage("shopMessage", "Changes saved.", true);

        } catch (error) {

            showMessage(
                "shopMessage",
                error.message || "Could not save changes. Is the server running?"
            );

        } finally {

            button.disabled = false;
            button.textContent = "Save changes";
        }
    });


    // =========================
    // CHANGE PASSWORD
    // =========================

    passwordForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const currentPassword =
            document.getElementById("currentPassword").value;

        const newPassword =
            document.getElementById("newPassword").value;

        const confirmNewPassword =
            document.getElementById("confirmNewPassword").value;

        if (newPassword !== confirmNewPassword) {
            showMessage("passwordMessage", "New passwords do not match.");
            return;
        }

        const button = document.getElementById("passwordSave");

        button.disabled = true;
        button.textContent = "Changing...";

        try {

            const response = await fetch(
                `${API_URL}/vendors/${vendor.vendorId}/password`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ currentPassword, newPassword })
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || "Could not change password");
            }

            passwordForm.reset();

            showMessage("passwordMessage", "Password changed.", true);

        } catch (error) {

            showMessage(
                "passwordMessage",
                error.message || "Could not change password. Is the server running?"
            );

        } finally {

            button.disabled = false;
            button.textContent = "Change password";
        }
    });


    // =========================
    // MY SHOP LINK + LOGOUT
    // =========================

    const myShopLink = document.getElementById("myShopLink");

    if (myShopLink) {
        myShopLink.href = `customer/shop.html?shop=${vendor.shopId}`;
    }

    const logoutButton = document.querySelector(".logout");

    if (logoutButton) {

        logoutButton.addEventListener("click", (event) => {

            event.preventDefault();

            if (!confirm("Are you sure you want to logout?")) return;

            localStorage.removeItem("vendorData");

            window.location.href = "index.html";
        });
    }
}
