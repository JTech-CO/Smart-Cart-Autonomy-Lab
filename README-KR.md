# Smart Cart Autonomy Lab

**버전 1.2.0** · 사용자를 직접 움직이며 센서 기반 스마트카트의 추종·회피·정지를 확인하는 웹 시뮬레이터입니다. HTML·CSS·JavaScript·WebGL 2만 사용하며 백엔드, 빌드, 계정, 외부 CDN이 필요하지 않습니다.

[English](README.md) · [시뮬레이터 열기](simulator/index.html) · [변경 기록](simulator/docs/CHANGELOG-KR.md) · [검증 보고서](simulator/docs/QA-KR.md)

![Smart Cart Autonomy Lab 1.2.0](simulator/assets/preview-desktop.png)

## 1.2.0 변경 사항

**동작 화면 확대.** 하단의 주행 속도·명령 속도·추종 설정·주행 거리·접촉 횟수를 상단의 간결한 주행 요약으로 옮겼습니다. 헤더와 구획 여백을 줄여, 주요 글자를 작게 만들지 않고 3D 동작 화면의 세로 공간을 확보했습니다.

**카메라와 이동 방향 분리.** 이동축이 지형에 고정됩니다. W나 방향키를 누른 채 카메라를 돌려도 같은 지형 방향으로 계속 이동합니다. 앞으로 내딛는 발과 지면을 딛는 발의 보폭 방향도 바로잡았으며, 보행 위상은 실제 이동 거리에 맞춰 진행합니다. 조작 대상과 자율 보행자에 동일하게 적용됩니다.

**수치·그래프 상시 표시.** 우측 데이터 영역의 왼쪽에는 현재 수치, 오른쪽에는 최근 12초의 실시간 그래프를 배치했습니다. LiDAR·UWB·ToF·후륜 모터 전류·전륜 조향각을 펼침 조작 없이 볼 수 있습니다. 아래쪽 항목은 공통 스크롤로 확인합니다. 보조 LiDAR 점군과 상태 기록만 펼침형입니다. 520 CSS px 이하에서는 글자와 그래프를 억지로 줄이지 않고 수치 아래에 그래프가 이어집니다.

**표준 README.** 최상위 파일을 `README.md`와 `README-KR.md`로 제공하며 서로 이동하는 링크를 넣었습니다. 이번 패키지에는 `README-SIMULATION` 이름의 파일이 없습니다.

## 실행과 기존 저장소 적용

압축을 풀고 `simulator/index.html`을 WebGL 2 지원 브라우저에서 엽니다. 루트의 `index.html`도 시뮬레이터로 연결됩니다. 하드웨어 가속을 권장합니다. 로컬 HTML이 차단된 환경은 [배포·연계 안내](simulator/docs/INTEGRATION-KR.md)를 확인합니다.

압축을 푼 **폴더 안의 파일들**을 `smart_cart_app` 저장소 루트에 복사하고 기존 `simulator/`를 전체 교체합니다. Flutter `lib/`, `web/`, Android·Windows 소스와 기존 라이선스는 대체하지 않습니다. **루트 README는 이번 요청에 따라 교체하는 구성**입니다. 기존 Flutter 소개가 필요하면 복사 전에 병합하거나 별도로 보관합니다. 기존 저장소에 남은 `README-SIMULATION.md`, `README-SIMULATION-KR.md`는 삭제합니다.

GitHub의 **Settings → Pages → GitHub Actions**에서 포함된 워크플로를 사용하면 `simulator/`를 배포 루트로 게시합니다. 브랜치 루트에서 배포하는 경우 루트 진입 파일이 `simulator/`로 연결합니다. 기존 Pages 워크플로가 있으면 중복 배포하지 않도록 합칩니다. 이 패키지는 로컬 산출물이며 원격 커밋·푸시·Actions 실행·실제 배포는 수행하지 않았습니다.

## 조작

| 입력 | 동작 |
|---|---|
| W / ↑ | 고정 전방, 지형 +Z |
| S / ↓ | 고정 후방, 지형 -Z |
| A / ← | 고정 좌측, 지형 +X |
| D / → | 고정 우측, 지형 -X |
| 드래그 / 휠 / C | 회전 / 확대 / 추종 시점 복귀. 이동축은 바뀌지 않음 |
| Space / E | 일시정지·재개 / 모의 비상정지·해제 |

좌우는 초기 후방 관측 방향에서 전방을 바라보는 기준입니다. 대각선 속도는 정규화하며, 사람은 실제 이동 방향을 향합니다. 모바일 버튼도 같은 고정축을 사용합니다. 반대편으로 돌린 카메라에서는 전방 이동이 화면 아래쪽으로 보일 수 있지만, 이동축이 바뀐 것은 아닙니다.

설정·안내 창을 열면 일시정지하며 닫아도 자동 재개하지 않습니다. 설정 적용은 새 세션을 시작합니다. 포커스 이탈은 입력을 해제하고 일시정지합니다. 설정 입력란의 키보드 동작은 유지됩니다.

## 유지한 시뮬레이션

평지·오르막·내리막·복합 경사·올라가는 계단을 같은 조작형 환경에서 시험합니다. 기둥은 고정되고 사람들은 개별 목적지를 향하며 상자는 외란·접촉에 따라 이동합니다. 인공 조명·햇빛 각도·저조도는 3D 장면에 반영하고 SANE 기반의 라이트 UI는 유지합니다.

카트는 UWB 추정 위치, LiDAR와 전방 ToF 관측, 관측 격자와 운동 후보 평가로 추종합니다. 후진과 측면 위치 회복, 후륜 회전·RPM·전류·PWM, 경사 가속·중력·유한 제동, 전륜 아커만 조향을 유지합니다. CSV·세션 JSON·Flutter 형식 텔레메트리 JSON·설정 JSON·PNG를 내보낼 수 있습니다. Flutter 앱이나 실차로의 실시간 연결은 없습니다.

## 모델 한계

실측 보정된 디지털 트윈이나 실차 제어 펌웨어가 아닙니다. 계단·과도한 경사 정지는 명시적인 지형 제한이며, 두 전방 ToF는 낙차 센서가 아닙니다. 후방 거리 두 개만으로 최초 방위를 임의로 만들지 않습니다. 낮은 후방 장애물은 광학 센서가 놓칠 수 있습니다. 센서 오차, 구동계, 제동·마찰·질량은 미교정 가정입니다. 정상 정지의 주차 제동과 무제동 자유 구름은 다른 상태입니다.

보행은 두 관절 시각화이며 전신 생체역학이나 임의 회전·지형에서의 완전한 접촉 해석이 아닙니다. [모델 및 한계](simulator/docs/MODEL-KR.md), [출처](simulator/docs/SOURCES.md), [권리 안내](simulator/SOURCE-NOTICE.md)를 함께 확인합니다.

## 개발·검증

```sh
node tests/core.test.cjs
node tests/bugfix.test.cjs
node tests/release120.test.cjs
python tests/static.test.py
```

브라우저 검사용 Python Playwright와 Chromium은 개발 도구이며 앱 실행에는 필요하지 않습니다. [검증 보고서](simulator/docs/QA-KR.md)는 실제 DOM·WebGL 및 파일 저장 검사와, 정책상 차단된 브라우저 URL 진입·미실행 원격 배포를 구분합니다. [수동 확인 절차](simulator/docs/TEST-CASES-KR.md)도 포함합니다.

[구동 데이터·그래프](simulator/assets/preview-drive.png) · [모바일](simulator/assets/preview-mobile.png) · [경사 보행](simulator/assets/preview-slope.png)
