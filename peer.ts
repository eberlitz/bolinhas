const express = require("express");

const checkBrokenConnections = require("peer/dist/src/services/checkBrokenConnections");
const messagesExpire = require("peer/dist/src/services/messagesExpire");
const webSocketServer = require("peer/dist/src/services/webSocketServer");
const messageHandler = require("peer/dist/src/messageHandler");
const api = require("peer/dist/src/api");
const realm = require("peer/dist/src/models/realm");
const config = require("peer/dist/src/config");

var app = express();

const options = {};

const config = Object.assign({}, config, options);
const realm = new realm.Realm();
const messageHandler = new messageHandler.MessageHandler(realm);
const api = api.Api({ config, realm, messageHandler });
const messagesExpire = new messagesExpire.MessagesExpire({
  realm,
  config,
  messageHandler,
});
const checkBrokenConnections = new checkBrokenConnections.CheckBrokenConnections(
  {
    realm,
    config,
    onClose: (client) => {
      app.emit("disconnect", client);
    },
  }
);
app.use(options.path, api);

wss.on("connection", (client) => {
  const messageQueue = realm.getMessageQueueById(client.getId());
  if (messageQueue) {
    let message;
    while ((message = messageQueue.readMessage())) {
      messageHandler.handle(client, message);
    }
    realm.clearMessageQueue(client.getId());
  }
  app.emit("connection", client);
});
wss.on("message", (client, message) => {
  app.emit("message", client, message);
  messageHandler.handle(client, message);
});
wss.on("close", (client) => {
  app.emit("disconnect", client);
});
wss.on("error", (error) => {
  app.emit("error", error);
});
messagesExpire.startMessagesExpiration();
checkBrokenConnections.start();
