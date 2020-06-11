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

  socket.on('join', (room, player) => {
    socket.join(room);

    // peerId: string;
    // nickname: string;
    // pos: [number, number];

    socket.broadcast.to(room).emit("peer_joined", player);
    peerId = player.peerId;
  })

  socket.on('update', (player) => {
    Object.keys(socket.rooms).forEach(room => {
      if (socket.rooms != socket.id) {
        socket.broadcast.to(room).emit('update', player);
      }
    })
  })

  socket.on('disconnect', () => {
    // this will emit to rooms that the user was not part- BAD
    // socket.broadcast.emit("peer_left", peerId);
    console.log('user disconnected');
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
  if(!accountSid){
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