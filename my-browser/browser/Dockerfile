FROM debian:bookworm

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99

RUN apt-get update && apt-get install -y \
    chromium \
    xvfb \
    x11vnc \
    fluxbox \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/novnc

RUN wget -qO- https://github.com/novnc/noVNC/archive/refs/heads/master.tar.gz \
    | tar xz --strip-components=1 -C /opt/novnc

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 6080

CMD ["/start.sh"]
