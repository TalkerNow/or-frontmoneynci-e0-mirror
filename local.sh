#!/bin/bash

#Pull the oncoming changes to the branch master
#git pull origin master

#Install the needed packages, delete unneeded packages and update some others
npm install
npm install node@10.24.1
npm i gulp-sass --save-dev
npm rebuild node-sass 
#Start the server on port 3000
npm start
