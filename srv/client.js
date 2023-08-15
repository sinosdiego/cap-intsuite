/*
 * MQTT - O MQTT é um protocolo de mensagens baseado em padrões, ou conjunto de regras,
 * usado para comunicação de computador para computador
 * https://aws.amazon.com/pt/what-is/mqtt/
 * 
 * https://www.hivemq.com/demos/websocket-client/
 */
const mqtt = require("mqtt");

module.exports = (endpoint) => {

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
    mqtt_client.on("message", (topic, message) => {
        console.log(`[INFO] Received MQTT topic: "${topic}" message: "${message}"`);
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