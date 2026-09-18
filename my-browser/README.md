# my-browser

웹브라우저에서 원격 리눅스 데스크톱을 쓰는 프로젝트 (Browser.lol 스타일).

```
my-browser/
├── desktop/   # XFCE 데스크톱 + Chromium Docker 이미지
└── web/       # Next.js 프론트엔드 + API
```

## desktop/

Docker 컨테이너 하나로 다음을 실행합니다:

- Xvfb (가상 디스플레이 `:99`, 1280x720)
- XFCE 데스크톱 (패널, Thunar 파일관리자, 터미널, Mousepad, Chromium)
- x11vnc (포트 5900)
- noVNC + websockify (포트 6080, 웹브라우저에서 화면 표시)
- 한글 폰트(`fonts-noto-cjk`)

```bash
cd my-browser/desktop
docker build -t my-desktop .
```

단독 실행해서 확인하려면:

```bash
docker run --rm -p 6080:6080 my-desktop
```

로컬은 `http://localhost:6080/vnc.html`, Codespaces는 **Ports** 탭에서 6080의
Forwarded Address + `/vnc.html`로 접속합니다.

## web/

"Start Desktop" 버튼 → `POST /api/browser`가 Docker CLI로 `my-desktop`
컨테이너(`my-browser-mvp`)를 띄우고, 컨테이너 안 VNC가 준비될 때까지 기다린 뒤
noVNC URL을 반환합니다. 이미 떠 있으면 재사용합니다.

컨테이너의 `/root`(다운로드, Chromium 프로필, XFCE 설정)는 Docker 볼륨
`my-browser-home`에 저장되어 컨테이너를 껐다 켜도 유지됩니다. 초기화하려면
`docker volume rm my-browser-home`.

```bash
cd my-browser/web
npm install
npm run dev
```

`http://localhost:3000`에서 Start Desktop. Next.js 서버와 Docker 데몬이 같은
호스트에 있어야 하고, `desktop/` 이미지가 미리 빌드되어 있어야 합니다.

### Codespaces에서 실행할 때

브라우저용 Codespaces는 포트마다 호스트명이 달라서 `localhost:6080`이 컨테이너에
닿지 않습니다. 6080의 Forwarded Address를 `web/.env.local`에 넣어두세요:

```
NOVNC_BASE_URL=https://xxxxx-6080.app.github.dev
```

또한 **Ports** 탭에서 6080의 Visibility를 `Public`으로 바꿔야 iframe에서 인증
리다이렉트 없이 로드됩니다. Codespace가 재시작되면 이 설정이 Private으로
돌아갈 수 있습니다.

## 다음 단계

- 세션 ID 기반 컨테이너 관리(사용자별 컨테이너, 자동 삭제), 여러 사용자 지원,
  리소스/시간 제한 등 보안 강화

> 참고: 이 컨테이너는 아직 신뢰할 수 없는 공개 사용자를 대상으로 한 격리
> 수준을 갖추지 않았습니다(CPU/RAM/프로세스/네트워크 제한 없음). 인터넷에
> 공개하기 전에 반드시 리소스 제한과 세션 타임아웃, 컨테이너 자동 삭제를
> 추가해야 합니다.
