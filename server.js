require('dotenv').config()
const express = require("express");
const peerjs = require("peer");


const app = express();

// const socketio = require('socket.io');
// io = socketio(app, {
//   // Remover polling para forçar uso somente de websockets
//   transports: [ 'websocket'],
//   serveClient: true
// });
// io.on('connection', (socket)=>{
// })


const accountSid = process.env.TWILLIO_ACCOUNT_SID;
const authToken = process.env.TWILLIO_AUTH_TOKEN;



app.get('/ice', asyncMiddleware(async (_, res) =>{
    const twilioClient = require('twilio')(accountSid, authToken);
    const { iceServers } = await twilioClient.tokens.create()
    res.json(iceServers)
}));


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



const port = process.env.PORT || 3000;
// Serve the files on port port.
var srv = app.listen(port, function () {
  console.log("Example app listening on port " + port + "!\n");
});



app.use(
  "/peerjs",
  peerjs.ExpressPeerServer(srv, {
    debug: true
  })
);

function asyncMiddleware( fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
  };
}