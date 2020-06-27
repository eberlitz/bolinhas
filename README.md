## Local Development

Just run the command bellow, it will start a server and listen for file changes and recompile then.

```sh
node server.js
```

## Deploying

Currently there is two environments.

Production:

* https://bolinhas.azurewebsites.net/
* Branch: azure
* Deploy cmd: `sh ./deploy.sh azure`

Staging:

* https://staging-bol.azurewebsites.net/
* Branch: staging-az
* Deploy cmd: `sh ./deploy.sh staging-az`