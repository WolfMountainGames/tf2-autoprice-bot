pm2 start daemon_shop.js -o log.txt --restart-delay 10000 --node-args="--max-old-space-size=1024"
