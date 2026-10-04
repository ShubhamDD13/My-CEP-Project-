console.log("LOGIN JS IS WORKING");

const API_URL = "/api";

const loginForm = document.getElementById("loginForm");
const formMessage = document.getElementById("formMessage");

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const phone =
        document.getElementById("phone").value.trim();

    const password =
        document.getElementById("password").value;


    if (!/^\d{10}$/.test(phone)) {
        showMessage("Please enter a valid 10-digit phone number.");
        return;
    }

    if (!password) {
        showMessage("Please enter your password.");
        return;
    }


    const submitButton =
        document.querySelector(".submit-button");

    submitButton.disabled = true;

    submitButton.style.opacity = "0.65";

    submitButton.style.cursor = "not-allowed";

    submitButton.textContent = "Logging in...";

    showMessage("Logging in...", true);


    try {

        const response = await fetch(
            `${API_URL}/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({ phone, password })

            }
        );


        const data = await response.json();


        if (!response.ok) {
            throw new Error(
                data.message || "Login failed"
            );
        }


        // data already matches the vendorData shape
        // the rest of the app expects in localStorage

        localStorage.setItem(
            "vendorData",
            JSON.stringify(data)
        );


        showMessage("Login successful! Opening dashboard...", true);


        window.location.replace("dashboard.html");


    } catch (error) {

        console.error("LOGIN ERROR:", error);

        showMessage(
            error.message ||
            "Could not log in. Please make sure the backend is running."
        );

        submitButton.disabled = false;

        submitButton.style.opacity = "1";

        submitButton.style.cursor = "pointer";

        submitButton.innerHTML =
            'Login <span>→</span>';

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

        formMessage.style.background = "#f0fdf4";
        formMessage.style.color = "#16a34a";

    } else {

        formMessage.style.background = "#fef2f2";
        formMessage.style.color = "#dc2626";

    }
}
