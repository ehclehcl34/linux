#!/bin/bash

set -e

echo "Starting virtual display..."

Xvfb :99 -screen 0 1280x720x24 &
sleep 2

echo "Starting window manager..."

fluxbox &
sleep 1

echo "Starting Chromium..."

chromium \
    --no-sandbox \
    --disable-dev-shm-usage \
    --start-maximized \
    --disable-gpu \
    --no-first-run \
    --no-default-browser-check \
    --lang=ko-KR \
    about:blank &

sleep 3

echo "Starting VNC server..."

x11vnc \
    -display :99 \
    -forever \
    -shared \
    -rfbport 5900 \
    -nopw &

sleep 2

echo "Starting noVNC..."

exec websockify --web /usr/share/novnc 6080 localhost:5900
