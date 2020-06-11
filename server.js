require('dotenv').config()
const express = require("express");
const peerjs = require("peer");


const app = express();
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer, {
  // Remover polling para forçar uso somente de websockets
  transports: ['websocket'],
  serveClient: false,
  path: '/socket',
});
io.on('connection', (socket) => {
  console.log('a user connected');
  let peerId;
  let rooms = [];

  socket.on('join', (room, player) => {
    peerId = player.id;
    socket.join(room, (err) => {
      if (!err) {
        rooms = [...rooms, room];
      }
    })
    socket.broadcast.to(room).emit("update", player);
  })

  socket.on('update', (room, player) => {
    socket.broadcast.to(room).emit('update', player);
  })

  socket.on('disconnect', () => {
    console.log('user disconnected');
    rooms.forEach(room => {
      socket.broadcast.to(room).emit('peer_left', peerId);
    })
  });
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'))
} else {
  const webpack = require("webpack");
  const webpackDevMiddleware = require("webpack-dev-middleware");
  const config = require("./webpack.dev.js");
  const compiler = webpack(config);
  // Tell express to use the webpack-dev-middleware and use the webpack.config.js
  // configuration file as a base.
  app.use(
    webpackDevMiddleware(compiler, {
      publicPath: config.output.publicPath
    })
  );
}



const accountSid = process.env.TWILLIO_ACCOUNT_SID;
const authToken = process.env.TWILLIO_AUTH_TOKEN;
app.get('/ice', asyncMiddleware(async (_, res) => {
  if (!accountSid) {
    res.json([])
    return;
  }
  const twilioClient = require('twilio')(accountSid, authToken);
  const { iceServers } = await twilioClient.tokens.create()
  res.json(iceServers)
}));



app.use(
  "/peerjs",
  peerjs.ExpressPeerServer(httpServer, {
    debug: true
  })
);

function asyncMiddleware(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
  };
}

const port = process.env.PORT || 3000;
// Serve the files on port port.
httpServer.listen(port, function () {
  console.log("Example app listening on port " + port + "!\n");
});


// This fixes the upgrades listener to allow socket.io and peerjs to run in parallel
let [socketioUpgradeListener, peerjsUpgradeListener] = httpServer.listeners('upgrade').slice(0);
httpServer.removeAllListeners('upgrade');
httpServer.on('upgrade', (req, socket, head) => {
  const pathname = require('url').parse(req.url).pathname;
  if (pathname == '/socket/')
    socketioUpgradeListener(req, socket, head);
  else if (pathname == '/peerjs/peerjs')
    peerjsUpgradeListener(req, socket, head);
  else {
    console.log("could not find upgrade listener for ", pathname)
    socket.destroy();
  }
});