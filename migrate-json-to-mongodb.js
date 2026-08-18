const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const DATA_DIR = path.join(__dirname, "data");

const MONGO_URI =
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/smartshophub";

// JSON file -> MongoDB collection
const collections = {
    customers: "customers",
    owners: "shopowners",
    shops: "shops",
    products: "products",
    stocks: "stocks",
    discounts: "discounts",
    reviews: "reviews",
    offers: "offers",
    analytics: "analytics",
    users: "users"
};

// Fields that contain MongoDB ObjectIds
const objectIdFields = {
    owners: ["_id", "shop_id"],
    shops: ["_id"],
    products: ["_id", "shop_id"],
    stocks: ["_id", "product_id"],
    discounts: ["_id", "shop_id"],
    reviews: ["_id", "shop_id"],
    offers: ["_id", "productId", "shopId"],
    users: ["_id", "shopId"],
    customers: ["_id"],
    analytics: ["_id"]
};

function readJSON(filename) {
    const filePath = path.join(DATA_DIR, filename + ".json");

    if (!fs.existsSync(filePath)) {
        throw new Error("File not found: " + filePath);
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function convertObjectIds(data, fields) {
    return data.map(item => {
        const copy = { ...item };

        for (const field of fields) {
            if (
                copy[field] !== undefined &&
                copy[field] !== null &&
                copy[field] !== ""
            ) {
                if (!mongoose.isValidObjectId(copy[field])) {
                    throw new Error(
                        `Invalid ObjectId in ${field}: ${copy[field]}`
                    );
                }

                copy[field] = new mongoose.Types.ObjectId(copy[field]);
            }
        }

        return copy;
    });
}

async function migrate() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);

        console.log("Successfully connected to MongoDB!");
        console.log("Database:", mongoose.connection.name);

        // Read all JSON files first
        const data = {};

        for (const file of Object.keys(collections)) {
            data[file] = readJSON(file);

            console.log(
                `${file}.json -> ${data[file].length} records`
            );
        }

        console.log("\nConverting data...");

        for (const file of Object.keys(data)) {
            data[file] = convertObjectIds(
                data[file],
                objectIdFields[file] || []
            );
        }

        console.log("Data conversion completed.");

        console.log("\nStarting migration...");
        console.log(
            "WARNING: Existing documents in these MongoDB collections will be replaced."
        );

        for (const file of Object.keys(collections)) {
            const collectionName = collections[file];
            const collection =
                mongoose.connection.db.collection(collectionName);

            // Clear existing MongoDB collection
            await collection.deleteMany({});

            // Insert JSON data
            if (data[file].length > 0) {
                await collection.insertMany(data[file]);
            }

            const count = await collection.countDocuments();

            console.log(
                `✓ ${file}.json -> ${collectionName}: ${count} records`
            );
        }

        console.log("\n=================================");
        console.log("MIGRATION COMPLETED SUCCESSFULLY");
        console.log("=================================");

        console.log("\nYour JSON files have NOT been deleted.");
        console.log("They are still available as backup.");

    } catch (error) {
        console.error("\nMIGRATION FAILED:");
        console.error(error.message);
    } finally {
        await mongoose.disconnect();
        console.log("\nMongoDB connection closed.");
    }
}

migrate();