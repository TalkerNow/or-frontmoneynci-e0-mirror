#!/bin/bash

#Pull the oncoming changes to the branch master
#git pull origin master

#Install the needed packages, delete unneeded packages and update some others
yarn install

#Start the server on port 3000
yarn start
