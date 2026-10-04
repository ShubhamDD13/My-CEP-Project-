const API_BASE = "/api";

// ===============================
// GET CURRENT VENDOR / SHOP
// ===============================

const savedVendor = localStorage.getItem("vendorData");

if (!savedVendor) {
    alert("No shop found. Please register your shop first.");
    window.location.href = "register.html";
}

const vendor = JSON.parse(savedVendor);
const SHOP_ID = vendor.shopId;

const SHOP_PRODUCTS_URL = `${API_BASE}/shops/${SHOP_ID}/products`;
const PRODUCTS_URL = `${API_BASE}/products`;

let products = [];
let editingProductId = null;

// DOM Elements
const addProductButton = document.getElementById("addProductButton");
const closeFormButton = document.getElementById("closeFormButton");
const emptyAddButton = document.getElementById("emptyAddButton");
const productFormCard = document.getElementById("productFormCard");
const productForm = document.getElementById("productForm");

const productName = document.getElementById("productName");
const productPrice = document.getElementById("productPrice");
const productCategory = document.getElementById("productCategory");
const productDescription = document.getElementById("productDescription");
const productAvailable = document.getElementById("productAvailable");

const productsList = document.getElementById("productsList");
const emptyState = document.getElementById("emptyState");
const productCount = document.getElementById("productCount");

const saveButton = productForm.querySelector(".save-product-button");
const toast = document.getElementById("toast");

const productImage = document.getElementById("productImage");
const imagePreview = document.getElementById("imagePreview");
const removeImageButton = document.getElementById("removeImageButton");

// Image state for the form:
//   currentImage = existing saved path (when editing) or null
//   newImageData = base64 data URL of a freshly chosen picture
//   removeImage  = true when the user clicked "Remove picture"
let currentImage = null;
let newImageData = null;
let removeImage = false;


// ===============================
// HELPERS
// ===============================

// Stops product text from being treated as HTML
function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Resize to max 800px and compress, so uploads stay small
function resizeImage(file, maxSize = 800) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onerror = () => reject(new Error("Could not read file"));

        reader.onload = () => {

            const img = new Image();

            img.onerror = () => reject(new Error("Not a valid image"));

            img.onload = () => {

                const scale = Math.min(1, maxSize / Math.max(img.width, img.height));

                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);

                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                resolve(canvas.toDataURL("image/jpeg", 0.82));
            };

            img.src = reader.result;
        };

        reader.readAsDataURL(file);
    });
}

function updateImagePreview() {

    const src = newImageData || (removeImage ? null : currentImage);

    if (src) {
        imagePreview.innerHTML = "";
        const img = document.createElement("img");
        img.src = src;
        img.alt = "Product picture preview";
        imagePreview.appendChild(img);
        removeImageButton.style.display = "inline-block";
    } else {
        imagePreview.textContent = "📷";
        removeImageButton.style.display = "none";
    }
}

function resetImageState() {
    currentImage = null;
    newImageData = null;
    removeImage = false;
    productImage.value = "";
    updateImagePreview();
}

productImage.addEventListener("change", async () => {

    const file = productImage.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("Please choose an image file.", "error");
        productImage.value = "";
        return;
    }

    try {
        newImageData = await resizeImage(file);
        removeImage = false;
        updateImagePreview();
    } catch (error) {
        showToast("Could not use that picture.", "error");
        productImage.value = "";
    }
});

removeImageButton.addEventListener("click", () => {
    newImageData = null;
    removeImage = true;
    productImage.value = "";
    updateImagePreview();
});


// ===============================
// TOAST NOTIFICATIONS
// ===============================

let toastTimeout = null;

function showToast(message, type = "success") {

    clearTimeout(toastTimeout);

    toast.textContent =
        (type === "success" ? "✓ " : "⚠ ") + message;

    toast.className = `toast ${type} show`;

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 3200);

}


// ===============================
// OPEN PRODUCT FORM
// ===============================

function openProductForm() {

    editingProductId = null;

    productForm.reset();

    productAvailable.checked = true;

    resetImageState();

    productFormCard.style.display = "block";

    productFormCard.scrollIntoView({ behavior: "smooth" });
}

addProductButton.addEventListener("click", openProductForm);

// "+ Add Your First Product" in the empty state
if (emptyAddButton) {
    emptyAddButton.addEventListener("click", openProductForm);
}


// ===============================
// CLOSE PRODUCT FORM
// ===============================

function closeProductForm() {

    editingProductId = null;

    productForm.reset();

    productAvailable.checked = true;

    resetImageState();

    productFormCard.style.display = "none";
}

if (closeFormButton) {
    closeFormButton.addEventListener("click", closeProductForm);
}


// ===============================
// LOAD PRODUCTS FROM DATABASE
// (scoped to THIS vendor's shop only)
// ===============================

function showLoadingState() {

    emptyState.style.display = "none";

    productsList.innerHTML = `
        <div class="loading-state">
            <span class="loading-spinner"></span>
            Loading your products...
        </div>
    `;

}

async function loadProducts() {

    showLoadingState();

    try {

        const response = await fetch(SHOP_PRODUCTS_URL);

        if (!response.ok) {
            throw new Error("Failed to load products");
        }

        products = await response.json();

        displayProducts();

    } catch (error) {

        console.error("Error loading products:", error);

        productsList.innerHTML = `
            <div class="loading-state">
                ⚠ Could not connect to the backend.
                Make sure your server is running, then refresh.
            </div>
        `;

        showToast("Could not connect to the backend.", "error");

    }

}


// ===============================
// ADD / UPDATE PRODUCT
// ===============================

function setSaving(isSaving) {

    saveButton.disabled = isSaving;

    saveButton.textContent =
        isSaving ? "Saving..." : "Save Product";

}

productForm.addEventListener("submit", async (event) => {

    event.preventDefault();


    const productData = {

        name: productName.value.trim(),

        price: Number(productPrice.value),

        category: productCategory.value,

        description: productDescription.value.trim(),

        available: productAvailable.checked,

        // Always save against the logged-in vendor's shop
        shop_id: SHOP_ID

    };

    // image: omitted = keep existing, null = remove, data URL = new picture
    if (newImageData) {
        productData.image = newImageData;
    } else if (removeImage && editingProductId !== null) {
        productData.image = null;
    }


    setSaving(true);


    // -------------------------------
    // UPDATE EXISTING PRODUCT
    // -------------------------------

    if (editingProductId !== null) {

        try {

            const response = await fetch(
                `${PRODUCTS_URL}/${editingProductId}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(productData)

                }
            );


            if (!response.ok) {
                throw new Error("Failed to update product");
            }


            showToast("Product updated successfully!");


            closeProductForm();


            await loadProducts();


        } catch (error) {

            console.error(
                "Error updating product:",
                error
            );

            showToast("Could not update product.", "error");

        } finally {

            setSaving(false);

        }

        return;

    }


    // -------------------------------
    // ADD NEW PRODUCT
    // -------------------------------

    try {

        const response = await fetch(
            PRODUCTS_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(productData)

            }
        );


        if (!response.ok) {
            throw new Error("Failed to add product");
        }


        showToast("Product added successfully!");


        closeProductForm();


        await loadProducts();


    } catch (error) {

        console.error(
            "Error adding product:",
            error
        );

        showToast("Could not add product.", "error");

    } finally {

        setSaving(false);

    }

});


// ===============================
// DISPLAY PRODUCTS
// ===============================

const CATEGORY_ICONS = {
    grocery: "🛒",
    dairy: "🥛",
    bakery: "🍞",
    beverages: "🥤",
    snacks: "🍪",
    other: "📦"
};

function displayProducts() {

    productsList.innerHTML = "";


    // No products
    if (products.length === 0) {

        emptyState.style.display = "block";

        productCount.textContent = "0 products";

        return;

    }


    emptyState.style.display = "none";

    productCount.textContent =
        `${products.length} product${products.length === 1 ? "" : "s"}`;


    products.forEach(product => {

        const productCard =
            document.createElement("div");

        productCard.className = "product-card";


        const icon =
            CATEGORY_ICONS[product.category] || "📦";

        const imageHTML = product.image
            ? `<img src="/${encodeURI(product.image)}" alt="${escapeHTML(product.name)}">`
            : icon;

        const statusClass =
            product.available ? "available" : "unavailable";

        const statusLabel =
            product.available ? "Available" : "Unavailable";


        productCard.innerHTML = `

            <div class="product-image">
                ${imageHTML}
            </div>

            <div class="product-info">

                <h3>${escapeHTML(product.name)}</h3>

                <p>${escapeHTML(product.description) || "No description"}</p>

                <span class="product-category">
                    ${escapeHTML(product.category)}
                </span>

            </div>

            <div class="product-price">
                ₹${product.price}
            </div>

            <div class="product-status ${statusClass}">
                ${statusLabel}
            </div>

            <div class="product-actions">

                <button
                    onclick="editProduct(${product.id})"
                >
                    Edit
                </button>


                <button
                    class="delete-button"
                    onclick="deleteProduct(${product.id})"
                >
                    Delete
                </button>

            </div>

        `;


        productsList.appendChild(productCard);

    });

}


// ===============================
// EDIT PRODUCT
// ===============================

function editProduct(id) {

    const product = products.find(
        product => product.id === id
    );


    if (!product) {
        return;
    }


    editingProductId = id;


    productName.value = product.name;

    productPrice.value = product.price;

    productCategory.value = product.category;

    productDescription.value =
        product.description || "";

    productAvailable.checked =
        Boolean(product.available);

    productImage.value = "";
    newImageData = null;
    removeImage = false;
    currentImage = product.image ? "/" + product.image : null;
    updateImagePreview();


    productFormCard.style.display = "block";


    // Scroll to form
    productFormCard.scrollIntoView({
        behavior: "smooth"
    });

}


// ===============================
// DELETE PRODUCT
// ===============================

async function deleteProduct(id) {

    const confirmDelete = confirm(
        "Are you sure you want to delete this product?"
    );


    if (!confirmDelete) {
        return;
    }


    try {

        const response = await fetch(
            `${PRODUCTS_URL}/${id}`,
            {
                method: "DELETE"
            }
        );


        if (!response.ok) {
            throw new Error("Failed to delete product");
        }


        showToast("Product deleted successfully!");


        await loadProducts();


    } catch (error) {

        console.error(
            "Error deleting product:",
            error
        );

        showToast("Could not delete product.", "error");

    }

}


// ===============================
// SIDEBAR LINKS
// ===============================

const myShopLink = document.getElementById("myShopLink");

if (myShopLink) {
    myShopLink.href = `customer/shop.html?shop=${SHOP_ID}`;
}

const logoutLink = document.querySelector(".logout");

if (logoutLink) {
    logoutLink.addEventListener("click", (event) => {
        event.preventDefault();

        if (!confirm("Are you sure you want to logout?")) return;

        localStorage.removeItem("vendorData");
        window.location.href = "index.html";
    });
}


// ===============================
// INITIAL LOAD
// ===============================

loadProducts();
