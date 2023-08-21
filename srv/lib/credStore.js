/**
 * Module dealing with the usage of an external credential store when running on the Cloud Foundry platform
 * 
 * Copyright © SAP HANA Academy <https://github.com/saphanaacademy>
 * 
 * You should have received a copy of the Apache License 2.0 along with this program.
 * If not, see <http://www.apache.org/licenses/>.
 */
module.exports = {
    readCredential: readCredential
}

const fetch = require("node-fetch");
const jose = require("node-jose");


function checkStatus(response) {
    console.log(`[INFODD] CheckStatus ${response.ok}`);
    if (!response.ok) {
        throw Error(`Unexpected status code: ${response.status}`);
    }
    return response;
}

async function decryptPayload(privateKey, payload) {
    console.log(`[INFODD] decryptPayload privateKey ${privateKey}`);
    console.log(`[INFODD] decryptPayload payload ${payload}`);
    const key = await jose.JWK.asKey(`-----BEGIN PRIVATE KEY-----${privateKey}-----END PRIVATE KEY-----`, "pem", {
        alg: "RSA-OAEP-256",
        enc: "A256GCM",
    });
    const decrypted = await jose.JWE.createDecrypt(key).decrypt(payload);
    const result = decrypted.plaintext.toString();
    return result;
}

function headers(binding, namespace, init) {
    const result = new fetch.Headers(init);
    result.set("Authorization", `Basic ${Buffer.from(`${binding.username}:${binding.password}`).toString("base64")}`);
    // result.set("Authorization", `Basic ${Buffer.from(`${binding.username}`).toString("base64")}`);
    result.set("sapcp-credstore-namespace", namespace);
    console.log(`[INFODD] headers result ${result}`);
    return result;
}

async function fetchAndDecrypt(privateKey, url, method, headers, cert, key, body) {
    // const result = await fetch(url, { method, headers, agentOptions: { cert, key }, body })
    const result = await fetch(url, { method, headers, body })
        .then(checkStatus)
        .then((response) => response.text())
        .then((payload) => decryptPayload(privateKey, payload))
        .then(JSON.parse);

    return result;
}

/**
 * Retrieve a credential from the credential store
 * @param {string} namespace Namespace inside the credential store to use (e.g. 'oee-mqtt-srv')
 * @param {string} type Type of the credential to query (e.g. 'password')
 * @param {string} name Name of the credential to query (e.g. 'my-cool-credential')
 * @returns Credential retrieved from the credential store
 */
async function readCredential(binding, namespace, type, name) {
    console.log(`[INFODD] readCredential private_key ${binding.encryption.client_private_key}`);
    console.log(`[INFODD] readCredential url ${binding.url}`);
    console.log(`[INFODD] readCredential username ${binding.username}`);
    console.log(`[INFODD] readCredential password ${binding.password}`);
    console.log(`[INFODD] readCredential type ${type}`);
    console.log(`[INFODD] readCredential header ${Buffer.from(`${binding.username}:${binding.password}`).toString("base64")}`);
    console.log(`[INFODD] readCredential name ${encodeURIComponent(name)}`);
    // console.log(`[INFODD] readCredential body ${util.inspect(headers(binding, namespace), false, null, true)}`);

    return fetchAndDecrypt(
        binding.encryption.client_private_key,
        `${binding.url}/${type}?name=${encodeURIComponent(name)}`,
        "get",
        headers(binding, namespace),
        binding.certificate,
        binding.key
    );
}
