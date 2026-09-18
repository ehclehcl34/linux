FROM debian:bookworm

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99

# noVNC from apt: the GitHub tarball ships without websockify (a git
# submodule), so novnc_proxy exits immediately and nothing listens on 6080.
RUN apt-get update && apt-get install -y \
    chromium \
    xvfb \
    x11vnc \
    fluxbox \
    novnc \
    websockify \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 6080

CMD ["/start.sh"]
