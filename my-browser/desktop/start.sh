#!/bin/bash

set -e

echo "Starting virtual display..."
Xvfb :99 -screen 0 1280x720x24 &
until [ -S /tmp/.X11-unix/X99 ]; do sleep 0.1; done

echo "Starting VNC server..."
x11vnc -display :99 -forever -shared -rfbport 5900 -nopw -q &

echo "Starting XFCE desktop..."
dbus-launch --exit-with-session startxfce4 &

echo "Starting noVNC..."
exec websockify --web /usr/share/novnc 6080 localhost:5900
