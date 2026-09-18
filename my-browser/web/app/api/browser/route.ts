import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

const CONTAINER_NAME = "my-browser-mvp";
const IMAGE_NAME = "my-desktop";
// Named volume for /root so downloads, browser profile and desktop settings
// survive container restarts.
const HOME_VOLUME = "my-browser-home";
const NOVNC_PORT = 6080;

// Codespaces forwards each port to its own hostname, so the browser cannot
// reach the container through localhost. Set NOVNC_BASE_URL to the forwarded
// address of port 6080 there.
function novncUrl() {
  const base = process.env.NOVNC_BASE_URL ?? `http://localhost:${NOVNC_PORT}`;
  return `${base.replace(/\/$/, "")}/vnc.html?autoconnect=true&resize=scale&reconnect=true&reconnect_delay=1000`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// noVNC only tries to connect once on load, so wait until x11vnc listens
// inside the container before handing the URL to the iframe.
async function waitForVnc(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await execFileAsync("docker", [
        "exec",
        CONTAINER_NAME,
        "bash",
        "-c",
        "exec 3<>/dev/tcp/127.0.0.1/5900",
      ]);
      return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error("VNC server did not become ready in time");
}

async function isContainerRunning(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("docker", [
      "inspect",
      "-f",
      "{{.State.Running}}",
      CONTAINER_NAME,
    ]);
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}

export async function POST() {
  try {
    if (await isContainerRunning()) {
      await waitForVnc();
      return NextResponse.json({ url: novncUrl(), status: "already_running" });
    }

    await execFileAsync("docker", [
      "run",
      "-d",
      "--rm",
      "--name",
      CONTAINER_NAME,
      "-p",
      `${NOVNC_PORT}:${NOVNC_PORT}`,
      "-v",
      `${HOME_VOLUME}:/root`,
      IMAGE_NAME,
    ]);
    await waitForVnc();

    return NextResponse.json({ url: novncUrl(), status: "started" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to start desktop container: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await execFileAsync("docker", ["stop", CONTAINER_NAME]);
    return NextResponse.json({ status: "stopped" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to stop desktop container: ${message}` },
      { status: 500 }
    );
  }
}
