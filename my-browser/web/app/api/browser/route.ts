import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

const CONTAINER_NAME = "my-browser-mvp";
// Named volume for /root so downloads, browser profile and desktop settings
// survive container restarts and Chromium/Desktop switches.
const HOME_VOLUME = "my-browser-home";
const NOVNC_PORT = 6080;

const IMAGES = {
  chromium: "my-browser",
  desktop: "my-desktop",
} as const;

type SessionType = keyof typeof IMAGES;

function isSessionType(value: unknown): value is SessionType {
  return typeof value === "string" && value in IMAGES;
}

// Codespaces forwards each port to its own hostname, so the browser cannot
// reach the container through localhost. Set NOVNC_BASE_URL to the forwarded
// address of port 6080 there.
function novncUrl() {
  const base = process.env.NOVNC_BASE_URL ?? `http://localhost:${NOVNC_PORT}`;
  return `${base.replace(/\/$/, "")}/vnc.html?autoconnect=true&resize=scale&reconnect=true&reconnect_delay=1000`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// noVNC only tries to connect once on load, and the desktop image takes
// several seconds before x11vnc listens, so wait until port 5900 answers
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

async function runningImage(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("docker", [
      "inspect",
      "-f",
      "{{.State.Running}} {{.Config.Image}}",
      CONTAINER_NAME,
    ]);
    const [running, image] = stdout.trim().split(" ");
    return running === "true" ? image : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const type = body?.type ?? "chromium";
  if (!isSessionType(type)) {
    return NextResponse.json({ error: `Unknown session type: ${type}` }, { status: 400 });
  }
  const image = IMAGES[type];

  try {
    const current = await runningImage();
    if (current === image) {
      await waitForVnc();
      return NextResponse.json({ url: novncUrl(), type, status: "already_running" });
    }
    // Only one session fits on port 6080 for now, so switching type replaces it.
    if (current !== null) {
      await execFileAsync("docker", ["stop", CONTAINER_NAME]);
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
      image,
    ]);
    await waitForVnc();

    return NextResponse.json({ url: novncUrl(), type, status: "started" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to start ${type} container: ${message}` },
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
      { error: `Failed to stop container: ${message}` },
      { status: 500 }
    );
  }
}
