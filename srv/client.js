/*
 * MQTT - O MQTT é um protocolo de mensagens baseado em padrões, ou conjunto de regras,
 * usado para comunicação de computador para computador
 * https://aws.amazon.com/pt/what-is/mqtt/
 * 
 * https://www.hivemq.com/demos/websocket-client/
 */
const mqtt = require("mqtt");
const axios = require("axios");
const oauth = require("axios-oauth-client");
const https = require("https");
const config = require("../config");
const credentials = require("./lib/credentials");

module.exports = (endpoint) => {

    //vamos limitar as conexões ao CI para 1 conexão simultânea para evitar erros
    const targetAgent = new https.Agent({ maxSockets: 1 });

    //broker público mqtt para testes
    const mqtt_client = mqtt.connect("mqtt://broker.hivemq.com");

    mqtt_client.on("connect", () => {
        console.log("[INFO] Connected to MQTT broker");
        mqtt_client.subscribe("PDU1/temperature");
        mqtt_client.subscribe("teste_diego/test");
    });
    mqtt_client.on("error", (error) => {
        console.log(`[ERROR] Connection couldn't be established: ${error}`);
    });
    mqtt_client.on("close", () => {
        console.log(`[INFO] Disconnected from MQTT broker`);
    });

    mqtt_client.on("message", async (topic, message) => {
        console.log(`[INFO] Received MQTT topic: "${topic}" message: "${message}"`);

        //adicionado o async a chamada da função
        //chamada para as credenciais criadas no CredentialStore
        //acho que o nome deveria ser o nome da instancia do CredentialStore criado ou do namespace
        const targetCred = await credentials.get("cap-intsuite");

        //get bearer token
        const authResponse = await oauth.clientCredentials(
            axios.create(),
            config.targetTokenUrl,
            targetCred.username,
            targetCred.password,
        )();

        console.log(`[INFO] Credentials Ok`);

        try {
            //invoke integration flow
            const response = await axios.post(config.targetUrl, message, {
                headers: {
                    "Authorization": `Bearer ${authResponse.access_token}`,
                    "Content-Type": "text/plain"
                },
                httpsAgent: targetAgent
            });

            console.log(`[INFO] Successfully invoked integration flow: Received response "${response}"`);

        } catch (error) {
            console.log(`[ERROR] Failed: ${error}`);
        }
    });

    //OData functions
    endpoint.on("start", () => {
        if (mqtt_client.connected) {
            return "Service already running";
        }
        mqtt_client.reconnect();
        return "Service started";
    });

    endpoint.on("stop", () => {
        if (!mqtt_client.connected) {
            return "Service not running";
        }
        mqtt_client.end();
        return "Service stopped";
    });

    endpoint.on("isRunning", () => {
        return mqtt_client.connected;
    });
}