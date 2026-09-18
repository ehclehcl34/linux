# my-browser

Browser.lol 스타일 원격 브라우저 프로젝트. 현재 v0.2까지 진행됨.

## 구성

```
my-browser/
├── browser/   # Chromium + Xvfb + x11vnc + noVNC Docker 이미지 (v0.1)
├── desktop/   # XFCE 리눅스 데스크톱 + Chromium 이미지 (v0.2.1)
└── web/       # Next.js 프론트엔드 + API (v0.2)
```

### desktop/ (v0.2.1)

브라우저 하나 대신 XFCE 데스크톱 전체(바탕화면, 파일관리자, 터미널, Chromium)를
띄우는 이미지입니다. 화면 전송 구조는 `browser/`와 동일합니다.

```bash
cd my-browser/desktop
docker build -t my-desktop .
```

웹 UI의 Environment 드롭다운에서 "Linux Desktop (XFCE)"를 고르면 이 이미지를
씁니다. 아직 6080 포트에 세션 하나만 올라가므로, 다른 종류를 고르면 기존
컨테이너를 멈추고 새로 띄웁니다.

### browser/ (v0.1)

Docker 컨테이너 하나로 다음을 실행합니다:

- Xvfb (가상 디스플레이, `:99`, 1280x720x24)
- fluxbox (윈도우 매니저)
- Chromium (`--no-sandbox`로 컨테이너 안에서 실행)
- x11vnc (포트 5900)
- noVNC (포트 6080, 웹브라우저에서 VNC 화면을 볼 수 있게 함)

먼저 이미지를 빌드해야 API가 컨테이너를 실행할 수 있습니다:

```bash
cd my-browser/browser
docker build -t my-browser .
```

단독으로 실행해서 확인하려면:

```bash
docker run --rm -p 6080:6080 my-browser
```

정상 실행되면 다음과 같은 로그가 순서대로 출력됩니다:

```
Starting virtual display...
Starting window manager...
Starting Chromium...
Starting VNC server...
Starting noVNC...
```

로컬 환경은 `http://localhost:6080/vnc.html`, GitHub Codespaces는 VS Code의
**Ports** 탭에서 6080을 Forward한 뒤 Forwarded Address로 접속합니다.

### web/ (v0.2)

Next.js(App Router) 프로젝트로, "Start Browser" 버튼을 누르면
`POST /api/browser`가 Docker CLI(`docker run`)로 `my-browser` 이미지를
백그라운드 컨테이너(`my-browser-mvp`)로 실행하고 noVNC 접속 URL을 반환합니다.
반환된 URL은 페이지 안의 `<iframe>`에 표시됩니다. 이미 컨테이너가 떠 있으면
새로 만들지 않고 기존 URL을 재사용합니다.

```bash
cd my-browser/web
npm install
npm run dev
```

`http://localhost:3000`에 접속해 Start Browser를 누르면 됩니다. Next.js 서버와
Docker 데몬이 같은 호스트에 있어야 하고(로컬/Codespaces 모두 해당), `browser/`
이미지가 미리 빌드되어 있어야 합니다.

#### Codespaces에서 실행할 때

브라우저로 Codespaces를 쓰는 경우 포트마다 호스트명이 달라서, 사용자 브라우저의
`localhost:6080`은 컨테이너에 닿지 않습니다. 6080 포트의 Forwarded Address를
`NOVNC_BASE_URL`로 넘겨주세요:

```bash
NOVNC_BASE_URL=https://xxxxx-6080.app.github.dev npm run dev
```

또한 **Ports** 탭에서 6080 포트의 Visibility를 `Public`으로 바꿔야 iframe에서
인증 리다이렉트 없이 로드됩니다.

## 다음 단계

- v0.3+: 세션 ID 기반 컨테이너 관리(사용자별 컨테이너, 자동 삭제), 여러 사용자
  지원, 리소스/시간 제한 등 보안 강화

> 참고: 이 컨테이너는 아직 신뢰할 수 없는 공개 사용자를 대상으로 한 격리
> 수준을 갖추지 않았습니다(CPU/RAM/프로세스/네트워크 제한 없음). 인터넷에
> 공개하기 전에 반드시 리소스 제한과 세션 타임아웃, 컨테이너 자동 삭제를
> 추가해야 합니다.
