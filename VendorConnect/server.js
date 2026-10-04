const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;

// All pages (HTML/CSS/JS) live in the "public" folder next to this file.
// Only this folder is served to the browser, so server.js and the
// database file are never downloadable.
const FRONTEND_DIR = path.join(__dirname, "public");

// Where the database and product pictures are stored.
// Locally this is the project folder. On Render, set the DATA_DIR
// environment variable to your persistent disk path (e.g. /var/data)
// so data survives restarts and redeploys.
const DATA_DIR = process.env.DATA_DIR || __dirname;
fs.mkdirSync(DATA_DIR, { recursive: true });

const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });


// ========================================
// MIDDLEWARE
// ========================================

app.use(cors());
// Larger limit because product pictures are sent as base64
app.use(express.json({ limit: "6mb" }));


// ========================================
// BLOCK ACCESS TO BACKEND INTERNALS
// (prevents the .db file, server.js, node_modules
// etc. from being downloadable as static files)
// ========================================

app.use((req, res, next) => {

    if (
        req.path.startsWith("/Backend") ||
        req.path.startsWith("/backend") ||
        req.path.endsWith(".db")
    ) {
        return res.status(404).send("Not found");
    }

    next();

});


// ========================================
// SERVE FRONTEND (static files)
// ========================================

app.use("/uploads", express.static(UPLOADS_DIR));

app.use(express.static(FRONTEND_DIR));


// ========================================
// PASSWORD HASHING
// (uses Node's built-in crypto — no extra
// dependency needed, safe for deployment)
// ========================================

function generateSalt() {
    return crypto.randomBytes(16).toString("hex");
}

function hashPassword(password, salt) {
    return crypto
        .pbkdf2Sync(password, salt, 100000, 64, "sha512")
        .toString("hex");
}

function verifyPassword(password, salt, storedHash) {

    const hash = hashPassword(password, salt);

    const hashBuffer = Buffer.from(hash, "hex");
    const storedBuffer = Buffer.from(storedHash, "hex");

    if (hashBuffer.length !== storedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(hashBuffer, storedBuffer);
}


// ========================================
// PRODUCT IMAGE HELPERS
// ========================================

const IMAGE_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
};

// Saves a base64 data URL to /uploads and returns the
// relative path (e.g. "uploads/abc123.jpg"), or null if invalid.
function saveImage(dataUrl) {

    const match = /^data:(image\/[a-z]+);base64,(.+)$/.exec(dataUrl || "");

    if (!match || !IMAGE_TYPES[match[1]]) return null;

    const buffer = Buffer.from(match[2], "base64");

    if (buffer.length === 0 || buffer.length > 4 * 1024 * 1024) return null;

    const fileName =
        crypto.randomBytes(12).toString("hex") +
        "." + IMAGE_TYPES[match[1]];

    fs.writeFileSync(path.join(UPLOADS_DIR, fileName), buffer);

    return "uploads/" + fileName;
}

function deleteImage(relativePath) {

    if (!relativePath || !relativePath.startsWith("uploads/")) return;

    const fullPath = path.join(UPLOADS_DIR, path.basename(relativePath));

    fs.unlink(fullPath, () => {});
}


// ========================================
// DATABASE
// ========================================

const DB_PATH = path.join(DATA_DIR, "vendorconnect.db");

// First run on a new disk: start from the bundled database
// (your existing data) if one is shipped with the project.
const SEED_DB = path.join(__dirname, "vendorconnect.db");

if (!fs.existsSync(DB_PATH) && fs.existsSync(SEED_DB) && SEED_DB !== DB_PATH) {
    fs.copyFileSync(SEED_DB, DB_PATH);
}

const db = new Database(DB_PATH);


// ========================================
// VENDORS TABLE
// ========================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS vendors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT
    )
`).run();


// ========================================
// SHOPS TABLE
// ========================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS shops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        location TEXT,
        description TEXT,

        FOREIGN KEY (vendor_id)
        REFERENCES vendors(id)
    )
`).run();


// ========================================
// PRODUCTS TABLE
// ========================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        available INTEGER DEFAULT 1,
        shop_id INTEGER,

        FOREIGN KEY (shop_id)
        REFERENCES shops(id)
    )
`).run();


// ========================================
// DATABASE MIGRATION
// ========================================

const productColumns = db
    .prepare("PRAGMA table_info(products)")
    .all();


const hasShopId = productColumns.some(
    column => column.name === "shop_id"
);


if (!hasShopId) {

    db.prepare(`
        ALTER TABLE products
        ADD COLUMN shop_id INTEGER
    `).run();

}


// ========================================
// MIGRATION: VENDOR PASSWORD COLUMNS
// ========================================

const vendorColumns = db
    .prepare("PRAGMA table_info(vendors)")
    .all();

const hasPasswordHash = vendorColumns.some(
    column => column.name === "password_hash"
);

if (!hasPasswordHash) {

    db.prepare(`
        ALTER TABLE vendors
        ADD COLUMN password_hash TEXT
    `).run();

    db.prepare(`
        ALTER TABLE vendors
        ADD COLUMN password_salt TEXT
    `).run();

}


// ========================================
// MIGRATION: SHOP CATEGORY / UPI COLUMNS
// (these were being collected on the register
// form but never actually saved to the database)
// ========================================

const shopColumns = db
    .prepare("PRAGMA table_info(shops)")
    .all();

const hasCategory = shopColumns.some(
    column => column.name === "category"
);

if (!hasCategory) {

    db.prepare(`
        ALTER TABLE shops
        ADD COLUMN category TEXT
    `).run();

    db.prepare(`
        ALTER TABLE shops
        ADD COLUMN upi TEXT
    `).run();

}


// ========================================
// MIGRATION: PRODUCT IMAGE + SHOP VIEW COUNT
// (the old "upi" column is left in place so existing
// data keeps working, it is just no longer used)
// ========================================

if (!productColumns.some(c => c.name === "image")) {
    db.prepare("ALTER TABLE products ADD COLUMN image TEXT").run();
}

if (!shopColumns.some(c => c.name === "views")) {
    db.prepare("ALTER TABLE shops ADD COLUMN views INTEGER DEFAULT 0").run();
}


// ========================================
// CREATE DEMO VENDOR
// ========================================

let vendor = db
    .prepare("SELECT * FROM vendors LIMIT 1")
    .get();


if (!vendor) {

    const result = db.prepare(`
        INSERT INTO vendors
        (name, email, phone)
        VALUES (?, ?, ?)
    `).run(
        "Sharma General Store",
        "demo@vendorconnect.com",
        "9999999999"
    );


    vendor = {
        id: result.lastInsertRowid
    };

}


// ========================================
// CREATE DEMO SHOP
// ========================================

let shop = db
    .prepare("SELECT * FROM shops LIMIT 1")
    .get();


if (!shop) {

    const result = db.prepare(`
        INSERT INTO shops
        (
            vendor_id,
            name,
            location,
            description
        )
        VALUES (?, ?, ?, ?)
    `).run(
        vendor.id,
        "Sharma General Store",
        "Mumbai, Maharashtra",
        "Your local digital store"
    );


    shop = {
        id: result.lastInsertRowid
    };

}


// ========================================
// CONNECT EXISTING PRODUCTS
// ========================================

db.prepare(`
    UPDATE products
    SET shop_id = ?
    WHERE shop_id IS NULL
`).run(shop.id);


// ========================================
// HOME ROUTE
// (fallback only — express.static above already
// serves your index.html for GET "/")
// ========================================

app.get("/", (req, res) => {

    res.send(
        "VendorConnect Backend is Working!"
    );

});


// ========================================
// LOGIN
// ========================================

app.post("/api/login", (req, res) => {

    const { phone, password } = req.body;

    if (!phone || !password) {

        return res.status(400).json({
            message: "Phone and password are required"
        });

    }

    try {

        const vendor = db
            .prepare("SELECT * FROM vendors WHERE phone = ?")
            .get(phone);

        if (!vendor || !vendor.password_hash || !vendor.password_salt) {

            return res.status(401).json({
                message: "Invalid phone number or password"
            });

        }

        const passwordMatches = verifyPassword(
            password,
            vendor.password_salt,
            vendor.password_hash
        );

        if (!passwordMatches) {

            return res.status(401).json({
                message: "Invalid phone number or password"
            });

        }

        const shop = db
            .prepare("SELECT * FROM shops WHERE vendor_id = ?")
            .get(vendor.id);

        if (!shop) {

            return res.status(404).json({
                message: "No shop found for this account"
            });

        }

        res.json({

            vendorId: vendor.id,
            shopId: shop.id,
            shopName: shop.name,
            ownerName: vendor.name,
            category: shop.category || "",
            location: shop.location || "",
            phone: vendor.phone

        });

    } catch (error) {

        console.error("Error logging in:", error);

        res.status(500).json({
            message: "Could not log in"
        });

    }

});


// ========================================
// CREATE VENDOR
// ========================================

app.post("/api/vendors", (req, res) => {

    const {
        name,
        email,
        phone,
        password
    } = req.body;


    if (!name || !phone || !password) {

        return res.status(400).json({
            message: "Name, phone and password are required"
        });

    }


    try {

        const existingVendor = db
            .prepare("SELECT id FROM vendors WHERE phone = ?")
            .get(phone);

        if (existingVendor) {

            return res.status(409).json({
                message: "An account with this phone number already exists"
            });

        }

        const salt = generateSalt();
        const passwordHash = hashPassword(password, salt);

        const result = db.prepare(`
            INSERT INTO vendors
            (
                name,
                email,
                phone,
                password_hash,
                password_salt
            )

            VALUES (?, ?, ?, ?, ?)

        `).run(
            name,
            email || null,
            phone,
            passwordHash,
            salt
        );


        res.status(201).json({

            message:
                "Vendor created successfully",

            id:
                result.lastInsertRowid

        });


    } catch (error) {

        console.error(
            "Error creating vendor:",
            error
        );


        res.status(500).json({

            message:
                "Could not create vendor"

        });

    }

});


// ========================================
// CREATE SHOP
// ========================================

app.post("/api/shops", (req, res) => {

    const {
        vendor_id,
        name,
        location,
        description,
        category
    } = req.body;


    if (!vendor_id || !name) {

        return res.status(400).json({

            message:
                "Vendor ID and shop name are required"

        });

    }


    try {

        // Check vendor exists

        const vendorExists = db
            .prepare(
                "SELECT id FROM vendors WHERE id = ?"
            )
            .get(vendor_id);


        if (!vendorExists) {

            return res.status(404).json({

                message:
                    "Vendor not found"

            });

        }


        // Create shop

        const result = db.prepare(`
            INSERT INTO shops
            (
                vendor_id,
                name,
                location,
                description,
                category
            )

            VALUES (?, ?, ?, ?, ?)

        `).run(
            vendor_id,
            name,
            location || null,
            description || null,
            category || null
        );


        res.status(201).json({

            message:
                "Shop created successfully",

            id:
                result.lastInsertRowid

        });


    } catch (error) {

        console.error(
            "Error creating shop:",
            error
        );


        res.status(500).json({

            message:
                "Could not create shop"

        });

    }

});


// ========================================
// GET ALL PRODUCTS
// ========================================

app.get("/api/products", (req, res) => {

    const products = db
        .prepare("SELECT * FROM products")
        .all();


    res.json(products);

});


// ========================================
// GET PRODUCTS FOR A SHOP
// ========================================

app.get(
    "/api/shops/:shopId/products",
    (req, res) => {

        const shopId =
            Number(req.params.shopId);


        const products = db
            .prepare(`
                SELECT *
                FROM products
                WHERE shop_id = ?
            `)
            .all(shopId);


        res.json(products);

    }
);


// ========================================
// GET SHOP DETAILS
// ========================================

app.get(
    "/api/shops/:shopId",
    (req, res) => {

        const shopId =
            Number(req.params.shopId);


        const shop = db
            .prepare(`
                SELECT
                    shops.*,
                    vendors.name AS vendor_name,
                    vendors.email,
                    vendors.phone

                FROM shops

                JOIN vendors
                ON shops.vendor_id = vendors.id

                WHERE shops.id = ?
            `)
            .get(shopId);


        if (!shop) {

            return res.status(404).json({

                message:
                    "Shop not found"

            });

        }


        res.json(shop);

    }
);


// ========================================
// ADD PRODUCT
// ========================================

app.post("/api/products", (req, res) => {

    const {
        name,
        price,
        category,
        description,
        available,
        shop_id,
        image
    } = req.body;


    try {

        const imagePath = image ? saveImage(image) : null;

        if (image && !imagePath) {
            return res.status(400).json({
                message: "Image must be a JPG, PNG or WebP under 4 MB"
            });
        }

        const result = db.prepare(`
            INSERT INTO products
            (
                name,
                price,
                category,
                description,
                available,
                shop_id,
                image
            )

            VALUES (?, ?, ?, ?, ?, ?, ?)

        `).run(
            name,
            price,
            category,
            description,
            available ? 1 : 0,
            shop_id || shop.id,
            imagePath
        );


        res.status(201).json({

            message:
                "Product added successfully",

            id:
                result.lastInsertRowid

        });


    } catch (error) {

        console.error(
            "Error adding product:",
            error
        );


        res.status(500).json({

            message:
                "Could not add product"

        });

    }

});


// ========================================
// UPDATE PRODUCT
// ========================================

app.put("/api/products/:id", (req, res) => {

    const id =
        Number(req.params.id);


    const {
        name,
        price,
        category,
        description,
        available,
        image
    } = req.body;


    try {

        const existing = db
            .prepare("SELECT image FROM products WHERE id = ?")
            .get(id);

        if (!existing) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        // image: undefined = keep, null = remove, data URL = replace
        let imagePath = existing.image;

        if (image === null) {
            deleteImage(existing.image);
            imagePath = null;
        } else if (typeof image === "string" && image.startsWith("data:")) {
            const saved = saveImage(image);
            if (!saved) {
                return res.status(400).json({
                    message: "Image must be a JPG, PNG or WebP under 4 MB"
                });
            }
            deleteImage(existing.image);
            imagePath = saved;
        }

        db.prepare(`
            UPDATE products

            SET
                name = ?,
                price = ?,
                category = ?,
                description = ?,
                available = ?,
                image = ?

            WHERE id = ?

        `).run(
            name,
            price,
            category,
            description,
            available ? 1 : 0,
            imagePath,
            id
        );


        res.json({

            message:
                "Product updated successfully"

        });


    } catch (error) {

        console.error(
            "Error updating product:",
            error
        );


        res.status(500).json({

            message:
                "Could not update product"

        });

    }

});


// ========================================
// DELETE PRODUCT
// ========================================

app.delete(
    "/api/products/:id",
    (req, res) => {

        const id =
            Number(req.params.id);


        try {

            const existing = db
                .prepare("SELECT image FROM products WHERE id = ?")
                .get(id);

            if (existing) deleteImage(existing.image);

            db.prepare(
                "DELETE FROM products WHERE id = ?"
            ).run(id);


            res.json({

                message:
                    "Product deleted successfully"

            });


        } catch (error) {

            console.error(
                "Error deleting product:",
                error
            );


            res.status(500).json({

                message:
                    "Could not delete product"

            });

        }

    }
);


// ========================================
// COUNT A SHOP VIEW
// (called once per visitor session by the customer page)
// ========================================

app.post("/api/shops/:shopId/view", (req, res) => {

    const shopId = Number(req.params.shopId);

    const result = db
        .prepare("UPDATE shops SET views = COALESCE(views, 0) + 1 WHERE id = ?")
        .run(shopId);

    if (result.changes === 0) {
        return res.status(404).json({ message: "Shop not found" });
    }

    const row = db
        .prepare("SELECT views FROM shops WHERE id = ?")
        .get(shopId);

    res.json({ views: row.views });

});


// ========================================
// UPDATE SHOP (name, location, category, description)
// ========================================

app.put("/api/shops/:shopId", (req, res) => {

    const shopId = Number(req.params.shopId);

    const { name, location, category, description } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({
            message: "Shop name is required"
        });
    }

    try {

        const result = db.prepare(`
            UPDATE shops
            SET name = ?, location = ?, category = ?, description = ?
            WHERE id = ?
        `).run(
            name.trim(),
            (location || "").trim() || null,
            category || null,
            (description || "").trim() || null,
            shopId
        );

        if (result.changes === 0) {
            return res.status(404).json({ message: "Shop not found" });
        }

        res.json({ message: "Shop updated successfully" });

    } catch (error) {

        console.error("Error updating shop:", error);

        res.status(500).json({ message: "Could not update shop" });

    }

});


// ========================================
// UPDATE VENDOR (owner name)
// ========================================

app.put("/api/vendors/:vendorId", (req, res) => {

    const vendorId = Number(req.params.vendorId);

    const { name } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({
            message: "Owner name is required"
        });
    }

    try {

        const result = db
            .prepare("UPDATE vendors SET name = ? WHERE id = ?")
            .run(name.trim(), vendorId);

        if (result.changes === 0) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        res.json({ message: "Owner name updated successfully" });

    } catch (error) {

        console.error("Error updating vendor:", error);

        res.status(500).json({ message: "Could not update owner name" });

    }

});


// ========================================
// CHANGE PASSWORD
// ========================================

app.put("/api/vendors/:vendorId/password", (req, res) => {

    const vendorId = Number(req.params.vendorId);

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            message: "Current and new password are required"
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            message: "New password must be at least 6 characters"
        });
    }

    try {

        const vendor = db
            .prepare("SELECT * FROM vendors WHERE id = ?")
            .get(vendorId);

        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        const matches =
            vendor.password_hash &&
            vendor.password_salt &&
            verifyPassword(
                currentPassword,
                vendor.password_salt,
                vendor.password_hash
            );

        if (!matches) {
            return res.status(401).json({
                message: "Current password is incorrect"
            });
        }

        const salt = generateSalt();

        db.prepare(`
            UPDATE vendors
            SET password_hash = ?, password_salt = ?
            WHERE id = ?
        `).run(hashPassword(newPassword, salt), salt, vendorId);

        res.json({ message: "Password changed successfully" });

    } catch (error) {

        console.error("Error changing password:", error);

        res.status(500).json({ message: "Could not change password" });

    }

});


// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

});
