#!/bin/bash

NODE_OPTIONS=--openssl-legacy-provider npm run build
sudo cp -rf build/ /var/www/html/
sudo a2enmod rewrite
sudo systemctl stop apache2
sudo systemctl start apache2