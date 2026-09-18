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

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 6080

CMD ["/start.sh"]
