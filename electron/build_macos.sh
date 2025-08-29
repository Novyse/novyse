#!/bin/bash

cd ..

npx expo export -p web

# Clear the webapp directory before copying
if [ -d "electron/webapp" ]; then
    rm -rf electron/webapp/*
fi

cp -r dist/* electron/webapp/

if [ -d "electron/assets" ]; then
    rm -rf electron/assets/*
fi

cp -r assets/* electron/assets/

cd electron

npm run build:mac