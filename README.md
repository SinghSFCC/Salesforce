# SFCC Project Setup and Development Guide

This document outlines the required steps to set up, build, and deploy the SFCC project locally. Follow these instructions in the provided order.

### 1. Prerequisites

* **Node.js Version:** The project requires **Node.js version 14.17.0**.
* **SFCC Environment Access:** Access to a sandbox instance and Business Manager is required.
* **Credentials:** All credentials, including `dw.json`, `.env`, and `.p12` files, are considered secrets and must **not** be committed to the repository. They should be stored in a secure location and added to the project's `.gitignore` file.

### 2. Environment Setup

1.  **Set Node.js Version:** If a version manager like `nvm` is available, set the required Node.js version by running the following commands:
    `nvm install 14.17.0`
    `nvm use 14.17.0`
2.  **Clone Repository:** Ensure the project is cloned and the subfolders `./storefront-reference-architecture` and `./rocketbox` exist.
3.  **Install Dependencies:** Navigate to each subfolder and install the necessary dependencies. Prefer `npm ci` for consistency, but use `npm install` if it fails.
    * Navigate to `./storefront-reference-architecture` and run: `npm ci`
    * Navigate to `./rocketbox` and run: `npm ci`

### 3. Local Development Flow

This section outlines the process for building and deploying code to the SFCC sandbox.

1.  **Build and Upload Base Cartridges:**
    * Navigate to the `./storefront-reference-architecture` folder.
    * Run the following commands to compile assets and upload the base cartridges to the Business Manager:
        `npm run compile:scss`
        `npm run compile:js`
        `npm run compile:fonts`
        `npm run uploadCartridge`
2.  **Start Custom Development Watcher:**
    * Navigate to the `./rocketbox` folder.
    * Run the following commands to compile custom assets and start the watch process, which will automatically upload changes on save:
        `npm run compile:scss`
        `npm run compile:js`
        `npm run watch`
    * **Note:** The `watch` command should only be used in the `rocketbox` folder, as it contains the custom project code.

### 4. Secure Deployment (using sfcc-ci)

For secure or production-like deployments, use the `sfcc-ci` command-line tool. This method is preferred for CI environments.

1.  **Install `sfcc-ci` globally:**
    `npm install -g sfcc-ci`
2.  **Authenticate with SFCC:** Use the provided client ID and client secret to authenticate.
    `sfcc-ci client:auth $SFCC_CLIENT_ID $SFCC_CLIENT_SECRET`
3.  **Deploy Code:** Deploy the code to the SFCC instance, adjusting the flags as needed.
    `sfcc-ci code:deploy code-version.zip -i $SFCC_HOST --activate -D`

### 5. Important Notes

* **Human Oversight:** A human must be in the loop for code merges and production deployments.
* **CI Environment:** A dedicated CI environment should hold real secrets and perform production uploads.

Notes: Keep a human in the loop for merges and production deploys. CI should hold real secrets and perform production uploads.