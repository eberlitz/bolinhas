const express = require("express");
const peerjs = require("peer");
// const webpack = require("webpack");
// const webpackDevMiddleware = require("webpack-dev-middleware");
// const config = require("./webpack.config.js");
// const compiler = webpack(config);
// Tell express to use the webpack-dev-middleware and use the webpack.config.js
// configuration file as a base.
// app.use(
//   webpackDevMiddleware(compiler, {
//     publicPath: config.output.publicPath
//   })
// );

const app = express();
require('dotenv').config()

const accountSid = process.env.TWILLIO_ACCOUNT_SID;
const authToken = process.env.TWILLIO_AUTH_TOKEN;




app.get('/ice', function (_, res, next) {
  (async () => {
    const twilioClient = require('twilio')(accountSid, authToken);
    const { iceServers } = await twilioClient.tokens.create()
    res.json(iceServers)
  })().catch(err => next(err))
})




app.use(express.static('dist'))



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
