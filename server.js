require("dotenv").config();
const express = require("express");
const peerjs = require("peer");
const path = require("path");

const app = express();
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, {
  // Remover polling para forçar uso somente de websockets
  transports: ["websocket"],
  serveClient: false,
  path: "/socket",
});
const isProduction = process.env.NODE_ENV === "production";
var public = "dist";
let sendFile = (url, res, next) =>
  res.sendFile(path.join(__dirname, public, url));

// key is the room name
// Value is the data for that room
// To scale this needs to be in a redis
const serverState = {};

io.on("connection", (socket) => {
  console.log("a user connected");
  let peerId;
  let rooms = [];

  socket.on("join", (room, player) => {
    peerId = player.id;
    socket.join(room, (err) => {
      if (!err) {
        rooms = [...rooms, room];
        socket.broadcast.to(room).emit("update", player);
        const roomState = (serverState[room] = serverState[room] || {});
        const playerState = (roomState[player.id] = roomState[player.id] || {});
        Object.assign(playerState, player);
        socket.emit("init", roomState);
      }
    });
  });

  socket.on("update", (room, player) => {
    const roomState = (serverState[room] = serverState[room] || {});
    const playerState = (roomState[player.id] = roomState[player.id] || {});
    Object.assign(playerState, player);
    socket.broadcast.to(room).emit("update", player);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
    rooms.forEach((room) => {
      const roomState = (serverState[room] = serverState[room] || {});
      delete roomState[peerId];
      socket.broadcast.to(room).emit("peer_left", peerId);
    });
  });
});

app.get("/", function (req, res, next) {
  sendFile("landing.html", res, next);
  // res.sendFile(path.join(public, ));
});

app.get("/join/", function (req, res) {
  res.redirect("/");
});

app.get("/join/*", function (req, res, next) {
  if (Object.keys(req.query).length > 0) {
    logIt("redirect:" + req.url + " to " + url.parse(req.url).pathname);
    res.redirect(url.parse(req.url).pathname);
  } else {
    sendFile("index.html", res, next);
    // res.sendFile(path.join(public, "index.html"));
  }
});

if (isProduction) {
  app.use(express.static("dist"));
} else {
  const webpack = require("webpack");
  const webpackDevMiddleware = require("webpack-dev-middleware");
  const config = require("./webpack.dev.js");
  const compiler = webpack(config);
  // Tell express to use the webpack-dev-middleware and use the webpack.config.js
  // configuration file as a base.
  app.use(
    webpackDevMiddleware(compiler, {
      publicPath: config.output.publicPath,
    })
  );

  var isCompiled = false;

  compiler.hooks.watchRun.tap("DevMiddleware", () => (isCompiled = false));
  compiler.hooks.invalid.tap("DevMiddleware", () => (isCompiled = false));
  compiler.hooks.done.tap("DevMiddleware", () => (isCompiled = true));

  sendFile = (url, res, next) => {
    function replYFile() {
      var filename = path.join(compiler.outputPath, url);
      compiler.outputFileSystem.readFile(filename, function (err, result) {
        if (err) return next(err);
        res.set("content-type", "text/html");
        res.send(result);
        res.end();
      });
    }

    if (!isCompiled) {
      compiler.hooks.done.tap("DevMiddleware", replYFile);
    } else {
      replYFile();
    }
  };
  // app.use("*", function (req, res, next) {
  //   console.log(req.url);
  // });
}

const accountSid = process.env.TWILLIO_ACCOUNT_SID;
const authToken = process.env.TWILLIO_AUTH_TOKEN;
app.get(
  "/ice",
  asyncMiddleware(async (_, res) => {
    if (!accountSid) {
      res.json([]);
      return;
    }
    const twilioClient = require("twilio")(accountSid, authToken);
    const { iceServers } = await twilioClient.tokens.create();
    res.json(iceServers);
  })
);

app.use(
  "/peerjs",
  peerjs.ExpressPeerServer(httpServer, {
    debug: true,
  })
);

function asyncMiddleware(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const port = process.env.PORT || 3000;
// Serve the files on port port.
httpServer.listen(port, function () {
  console.log("Example app listening on port " + port + "!\n");
});

// This fixes the upgrades listener to allow socket.io and peerjs to run in parallel
let [socketioUpgradeListener, peerjsUpgradeListener] = httpServer
  .listeners("upgrade")
  .slice(0);
httpServer.removeAllListeners("upgrade");
httpServer.on("upgrade", (req, socket, head) => {
  const pathname = require("url").parse(req.url).pathname;
  if (pathname == "/socket/") socketioUpgradeListener(req, socket, head);
  else if (pathname == "/peerjs/peerjs")
    peerjsUpgradeListener(req, socket, head);
  else {
    console.log("could not find upgrade listener for ", pathname);
    socket.destroy();
  }
});
