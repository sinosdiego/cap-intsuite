/**
 * Module dealing with the retrieval of credentials to use in the application
 */
module.exports = {
    get: get
}

const config = require("../../config");


/**
 * Binding to the BTP credential store bound to the Cloud Foundry application
 * If the credential store cannot be accessed, this variable is null and the locally defined
 * credentials are used
 */
const credStoreBinding = getCredStoreBinding();


/**
 * Returns a binding to the credential store if the application is running on the Cloud Foundry platform
 * Otherwise this function returns null which means that creds-local.js is used to retrieve credentials
 */
function getCredStoreBinding() {
    const xsenv = require("@sap/xsenv");

    // try to access the BTP credential store service
    // if it doesn't exist, we are in a local environment
    try {
        xsenv.loadEnv();
        const services = xsenv.getServices({
            credStore: { tag: "credstore" }
        });
        binding = services.credStore;
        console.log("[INFO] Detected BTP environment. Using credential store");
        return binding

    } catch (error) {
        console.log("[INFO] Detected local environment. Using locally stored credentials");
        return null;
    }
}


// --- Credential getters

/**
 * @typedef {Object} Credential
 * @property {string} username - The username / client ID contained in the credential
 * @property {string} password - The password / client secret contained in the credential
 */

/**
 * Get a credential defined locally (see creds-local.js)
 * @param {string} name Name of the credential to retrieve
 * @returns {Credential} Credential extracted from the local authentication configuration
 */
function getLocalCredential(name) {
    const localAuth = require("../../creds-local");
    return localAuth[name];
}


/**
 * Get a credential defined in a SAP BTP credential store bound to the application
 * @param {string} name Name of the credential to retrieve
 * @returns {Promise<Credential>} Credential extracted from the credential store
 */
async function getCredStoreCredential(name) {
    const credStore = require("./credStore");
    const credStoreCredential = await credStore.readCredential(
        credStoreBinding,
        config.credStoreNamespace,
        "password",
        name
    );

    return {
        username: credStoreCredential.username,
        password: credStoreCredential.value
    };
}


/**
 * Retrieve a credential from the credential store or the local credential configuration
 * @param {string} name Name of the credential to retrieve (e.g. 'my-cool-credential')
 * @returns {Promise<Credential>} Credential containing username and password
 */
async function get(name) {
    console.log(`[INFO] Queried credential ${name}`);

    if (credStoreBinding) {
        // BTP environment, credential store available
        return await getCredStoreCredential(name);
    } else {
        // local environment, no credential store available
        return getLocalCredential(name);
    }
}
