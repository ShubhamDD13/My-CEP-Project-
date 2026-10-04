const API_URL = "/api";

// =================================
// GET SHOP ID FROM URL
// Example:
// shop.html?shop=2
// =================================

const urlParams = new URLSearchParams(
    window.location.search
);

const SHOP_ID = urlParams.get("shop");

const SHOP_INFO_URL =
    `${API_URL}/shops/${SHOP_ID}`;

const SHOP_PRODUCTS_URL =
    `${API_URL}/shops/${SHOP_ID}/products`;

let products = [];

// Stops shop/product text from being treated as HTML
function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

const CATEGORY_ICONS = {
    grocery: "🛒",
    dairy: "🥛",
    bakery: "🍞",
    beverages: "🥤",
    snacks: "🍪",
    other: "📦"
};

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}


// =================================
// ELEMENTS
// =================================

const shopContent =
    document.getElementById("shopContent");

const shopLoadError =
    document.getElementById("shopLoadError");

const shopLoadErrorTitle =
    document.getElementById("shopLoadErrorTitle");

const shopLoadErrorText =
    document.getElementById("shopLoadErrorText");

const productsContainer =
    document.getElementById("productsContainer");

const loadingMessage =
    document.getElementById("loadingMessage");

const emptyMessage =
    document.getElementById("emptyMessage");

const errorMessage =
    document.getElementById("errorMessage");

const categoryContainer =
    document.getElementById("categoryContainer");


// =================================
// SHOW "SHOP NOT FOUND" / LOAD ERROR
// (instead of silently leaving the
// placeholder HTML visible)
// =================================

function showShopLoadError(title, text) {

    shopContent.style.display = "none";

    shopLoadErrorTitle.textContent = title;
    shopLoadErrorText.textContent = text;

    shopLoadError.style.display = "block";

}


// =================================
// LOAD SHOP INFORMATION
// Returns true if the shop loaded successfully,
// false otherwise — so we know whether it's safe
// to go on and load products.
// =================================

async function loadShopInfo() {

    if (!SHOP_ID) {

        showShopLoadError(
            "No shop specified",
            "This link is missing a shop ID. Please check the link and try again."
        );

        return false;

    }

    try {

        const response =
            await fetch(SHOP_INFO_URL);

        if (response.status === 404) {

            showShopLoadError(
                "Shop not found",
                "We couldn't find a shop with this link. It may have been removed, or the link may be incorrect."
            );

            return false;

        }

        if (!response.ok) {
            throw new Error("Failed to load shop");
        }

        const shop =
            await response.json();

        console.log("Shop loaded:", shop);


        // Shop name

        const shopName =
            document.querySelector(
                ".shop-details h2"
            );

        if (shopName) {
            shopName.textContent =
                shop.name;
        }


        // Location

        const shopLocation =
            document.querySelector(
                ".shop-details p"
            );

        if (shopLocation) {

            shopLocation.textContent =
                `📍 ${shop.location || "Location not available"}`;
        }


        // Hero title

        const heroTitle =
            document.querySelector(
                ".shop-hero h1"
            );

        if (heroTitle) {

            heroTitle.innerHTML =
                `Welcome to <span>${escapeHTML(shop.name)}.</span>`;
        }


        // Description

        const heroDescription =
            document.querySelector(
                ".shop-hero p"
            );

        if (
            heroDescription &&
            shop.description
        ) {

            heroDescription.textContent =
                shop.description;
        }


        // Avatar initials

        const avatar =
            document.querySelector(
                ".shop-avatar"
            );

        if (avatar) {

            const words =
                shop.name.trim().split(" ");

            let initials = "";

            if (words.length >= 2) {

                initials =
                    words[0][0] +
                    words[1][0];

            } else {

                initials =
                    words[0].substring(0, 2);
            }

            avatar.textContent =
                initials.toUpperCase();
        }


        // Only now do we actually reveal the page

        shopContent.style.display = "block";

        countView();

        return true;

    } catch (error) {

        console.error(
            "Error loading shop information:",
            error
        );

        showShopLoadError(
            "Unable to load this shop",
            "Could not connect to the server. Please make sure the backend is running and try again."
        );

        return false;

    }
}


// =================================
// COUNT A VIEW
// Once per browser session, so refreshing
// the page doesn't inflate the number.
// =================================

function countView() {

    const key = `viewed-shop-${SHOP_ID}`;

    try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
    } catch (error) {
        // sessionStorage unavailable: still count
    }

    fetch(`${API_URL}/shops/${SHOP_ID}/view`, { method: "POST" })
        .catch(error => console.error("Could not count view:", error));
}


// =================================
// LOAD PRODUCTS
// =================================

async function loadProducts() {

    try {

        loadingMessage.style.display =
            "block";

        emptyMessage.style.display =
            "none";

        errorMessage.style.display =
            "none";


        const response =
            await fetch(SHOP_PRODUCTS_URL);


        if (!response.ok) {
            throw new Error(
                "Failed to fetch products"
            );
        }


        products =
            await response.json();


        console.log(
            "Shop products:",
            products
        );


        loadingMessage.style.display =
            "none";


        if (products.length === 0) {

            emptyMessage.style.display =
                "block";

            return;
        }


        buildCategoryButtons();

        displayProducts(products);

    } catch (error) {

        console.error(
            "Error loading products:",
            error
        );

        loadingMessage.style.display =
            "none";

        errorMessage.style.display =
            "block";
    }
}


// =================================
// DISPLAY PRODUCTS
// =================================

function displayProducts(productList) {

    productsContainer.innerHTML = "";


    if (productList.length === 0) {

        emptyMessage.style.display =
            "block";

        return;
    }


    emptyMessage.style.display =
        "none";


    productList.forEach(product => {

        const card =
            document.createElement("div");

        card.className =
            "product-card";


        const icon =
            CATEGORY_ICONS[product.category] || "📦";

        const pictureHTML = product.image
            ? `<img src="../${encodeURI(product.image)}" alt="${escapeHTML(product.name)}" loading="lazy">`
            : `<span>${icon}</span>`;

        card.innerHTML = `

            <div class="product-picture">
                ${pictureHTML}
            </div>

            <h3>
                ${escapeHTML(product.name)}
            </h3>

            <span class="product-category">
                ${escapeHTML(capitalize(product.category || ""))}
            </span>

            <p class="product-description">

                ${
                    escapeHTML(product.description) ||
                    "No description available."
                }

            </p>

            <div class="product-bottom">

                <span class="product-price">
                    ₹${product.price}
                </span>

                <span class="${
                    product.available
                    ? "available"
                    : "unavailable"
                }">

                    ${
                        product.available
                        ? "Available"
                        : "Unavailable"
                    }

                </span>

            </div>
        `;

        productsContainer.appendChild(card);
    });
}


// =================================
// CATEGORY FILTER
// Buttons are built from the categories this
// shop's products actually use.
// =================================

function buildCategoryButtons() {

    const categories = [
        ...new Set(
            products.map(p => p.category).filter(Boolean)
        )
    ];

    categoryContainer.innerHTML = "";

    ["all", ...categories].forEach(category => {

        const button = document.createElement("button");

        button.className =
            "category-button" + (category === "all" ? " active" : "");

        button.dataset.category = category;

        button.textContent =
            category === "all" ? "All" : capitalize(category);

        button.addEventListener("click", () => {

            categoryContainer
                .querySelectorAll(".category-button")
                .forEach(btn => btn.classList.remove("active"));

            button.classList.add("active");

            displayProducts(
                category === "all"
                    ? products
                    : products.filter(p => p.category === category)
            );
        });

        categoryContainer.appendChild(button);
    });
}


// =================================
// START
// Only load products if the shop
// itself loaded successfully.
// =================================

(async () => {

    const shopLoaded = await loadShopInfo();

    if (shopLoaded) {
        loadProducts();
    }

})();
