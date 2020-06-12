#!/bin/bash
git branch -f azure
git checkout azure
echo 'Created and Checked out azure branch'

git reset --hard origin/master

npm i
npm run build
NODE_ENV=production npm i --only=prod --production
NODE_ENV=production npm prune --only=prod --production

echo 'Tracking files'
git add -A .
echo 'Commiting files'
git commit -a -m 'azure update'
echo 'Pushing files into azure branch'
git push origin azure --force
git checkout -
npm i