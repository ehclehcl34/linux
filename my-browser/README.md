# my-browser

Browser.lol 스타일 원격 브라우저 프로젝트의 MVP 단계 v0.1.

## 현재 단계 (v0.1)

`browser/` 디렉토리에 Docker 컨테이너 하나로 다음을 실행하는 최소 구성이 있습니다:

- Xvfb (가상 디스플레이, `:99`, 1280x720x24)
- fluxbox (윈도우 매니저)
- Chromium (`--no-sandbox`로 컨테이너 안에서 실행)
- x11vnc (포트 5900)
- noVNC (포트 6080, 웹브라우저에서 VNC 화면을 볼 수 있게 함)

아직 포함하지 않은 것: Next.js 연동, 세션/컨테이너 자동 생성 API, 로그인, DB,
여러 사용자 지원, 보안 강화(리소스 제한, 세션 타임아웃 등). 로드맵은
`browser/` 상위 논의를 참고해 단계적으로 추가합니다.

## 빌드 & 실행

```bash
cd my-browser/browser
docker build -t my-browser .
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

## 접속

- 로컬 환경: `http://localhost:6080/vnc.html`
- GitHub Codespaces: VS Code의 **Ports** 탭에서 6080 포트를 Forward한 뒤
  Forwarded Address(예: `https://xxxxx-6080.app.github.dev/vnc.html`)로 접속

noVNC 화면에 Chromium이 보이고 마우스/키보드로 조작할 수 있으면 v0.1 완료입니다.

## 다음 단계

- v0.2: Next.js 프로젝트(`web/`) 생성 후 Start Browser 버튼에서 이 컨테이너를
  실행하는 API(`POST /api/browser`) 연결
- v0.3+: 세션별 컨테이너 생성/삭제, 여러 사용자, 리소스/시간 제한 등 보안 강화

> 참고: 이 컨테이너는 아직 신뢰할 수 없는 공개 사용자를 대상으로 한 격리
> 수준을 갖추지 않았습니다(CPU/RAM/프로세스/네트워크 제한 없음). 인터넷에
> 공개하기 전에 반드시 리소스 제한과 세션 타임아웃, 컨테이너 자동 삭제를
> 추가해야 합니다.
