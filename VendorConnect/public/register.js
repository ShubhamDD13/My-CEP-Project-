console.log("REGISTER JS IS WORKING");

const API_URL = "/api";

const registerForm = document.getElementById("registerForm");
const formMessage = document.getElementById("formMessage");

registerForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const shopName =
        document.getElementById("shopName").value.trim();

    const ownerName =
        document.getElementById("ownerName").value.trim();

    const category =
        document.getElementById("category").value;

    const location =
        document.getElementById("location").value.trim();

    const phone =
        document.getElementById("phone").value.trim();

    const password =
        document.getElementById("password").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;


    // ===============================
    // VALIDATION
    // ===============================

    if (!shopName || !ownerName || !category || !location) {
        showMessage("Please fill in all required fields.");
        return;
    }

    if (password !== confirmPassword) {
        showMessage("Passwords do not match.");
        return;
    }

    if (!/^\d{10}$/.test(phone)) {
        showMessage("Please enter a valid 10-digit phone number.");
        return;
    }


    showMessage("Creating your shop...", true);

    const submitButton =
        document.querySelector(".submit-button");

    submitButton.disabled = true;

    submitButton.style.opacity = "0.65";

    submitButton.style.cursor = "not-allowed";

    submitButton.textContent = "Creating your shop...";


    try {

        // ===============================
        // CREATE VENDOR
        // ===============================

        const vendorResponse = await fetch(
            `${API_URL}/vendors`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: ownerName,
                    email: null,
                    phone: phone,
                    password: password
                })
            }
        );


        if (!vendorResponse.ok) {
            const errorData = await vendorResponse.json().catch(() => ({}));

            throw new Error(
                errorData.message || "Vendor creation failed"
            );
        }


        const vendor =
            await vendorResponse.json();

        console.log("Vendor created:", vendor);


        // ===============================
        // CREATE SHOP
        // ===============================

        const shopResponse = await fetch(
            `${API_URL}/shops`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    vendor_id: vendor.id,
                    name: shopName,
                    location: location,
                    description: `${category} shop`,
                    category: category
                })
            }
        );


        if (!shopResponse.ok) {
            const errorData = await shopResponse.json().catch(() => ({}));

            throw new Error(
                errorData.message || "Shop creation failed"
            );
        }


        const shop =
            await shopResponse.json();

        console.log("Shop created:", shop);


        // ===============================
        // SAVE CURRENT SHOP
        // ===============================

        const vendorData = {

            vendorId: vendor.id,

            shopId: shop.id,

            shopName: shopName,

            ownerName: ownerName,

            category: category,

            location: location,

            phone: phone
        };


        localStorage.setItem(
            "vendorData",
            JSON.stringify(vendorData)
        );


        console.log(
            "Saved vendorData:",
            localStorage.getItem("vendorData")
        );


        // ===============================
        // GO TO DASHBOARD
        // ===============================

        showMessage(
            "Shop created successfully! Opening dashboard...",
            true
        );


        window.location.replace("dashboard.html");

    }


    catch (error) {

        console.error(
            "REGISTRATION ERROR:",
            error
        );

        showMessage(
            error.message ||
            "Could not create your shop. Please make sure the backend is running."
        );

        submitButton.disabled = false;

        submitButton.style.opacity = "1";

        submitButton.style.cursor = "pointer";

        submitButton.innerHTML =
            'Create My Shop <span>→</span>';
    }

});


// ===============================
// MESSAGE
// ===============================

function showMessage(message, success = false) {

    if (!formMessage) {
        alert(message);
        return;
    }

    formMessage.textContent = message;

    formMessage.style.display = "block";

    if (success) {

        formMessage.style.background =
            "#f0fdf4";

        formMessage.style.color =
            "#16a34a";

    } else {

        formMessage.style.background =
            "#fef2f2";

        formMessage.style.color =
            "#dc2626";
    }
}
