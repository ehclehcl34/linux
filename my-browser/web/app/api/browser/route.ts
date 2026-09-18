import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

const CONTAINER_NAME = "my-browser-mvp";
const IMAGE_NAME = "my-browser";
const NOVNC_PORT = 6080;

function novncUrl() {
  return `http://localhost:${NOVNC_PORT}/vnc.html?autoconnect=true&resize=scale`;
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
      IMAGE_NAME,
    ]);

    return NextResponse.json({ url: novncUrl(), status: "started" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to start browser container: ${message}` },
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
      { error: `Failed to stop browser container: ${message}` },
      { status: 500 }
    );
  }
}
