FROM debian:bookworm

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99

RUN apt-get update && apt-get install -y --no-install-recommends \
    xfce4-session \
    xfce4-panel \
    xfwm4 \
    xfdesktop4 \
    xfce4-settings \
    xfce4-terminal \
    thunar \
    mousepad \
    xfce4-whiskermenu-plugin \
    tango-icon-theme \
    dbus-x11 \
    chromium \
    xvfb \
    x11vnc \
    novnc \
    websockify \
    fonts-noto-cjk \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Chromium refuses to run as root without --no-sandbox; Debian's wrapper
# reads extra flags from /etc/chromium.d so the desktop launcher gets them too.
RUN echo 'export CHROMIUM_FLAGS="$CHROMIUM_FLAGS --no-sandbox --disable-dev-shm-usage --disable-gpu --lang=ko-KR"' \
    > /etc/chromium.d/00-container

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 6080

CMD ["/start.sh"]
