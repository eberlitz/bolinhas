#!/bin/bash

target=$1
if [ -z "$1" ]
then
      echo "\$target is empty"
      exit 1
fi
branch=$(git rev-parse --abbrev-ref HEAD)

echo "Publishing '$branch' branch to '$target'"
while true; do
    read -p 'Do you wish to proceed (y/n)? ' yn
    case $yn in
        [Yy]* ) break;;
        [Nn]* ) exit;;
        * ) echo "Please answer yes or no.";;
    esac
done

git branch -f $target
git checkout $target
echo 'Created and Checked out $target branch'

git reset --hard origin/$branch

npm i
npm run build:prod
NODE_ENV=production npm i --only=prod --production
NODE_ENV=production npm prune --only=prod --production

echo 'Tracking files'
git add -A .
git add -A dist -f
echo 'Commiting files'
git commit -a -m '$target update'
echo 'Pushing files into $target branch'
git push origin $target --force
git checkout -
npm i