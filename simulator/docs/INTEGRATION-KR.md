# GitHub Pages 배포 및 Flutter 앱 연계

## 파일 배치

이 패키지는 기존 저장소에 **추가하는 구성**이다. 기존 Flutter `lib/`, `web/`, `android/`, `windows/`, `pubspec.yaml`은 손대지 않는다. 이전 프로젝트의 동명 파일이 이미 있으면 변경 내용을 비교한 뒤 합친다. 1.2.0부터 루트 문서는 `README.md`와 `README-KR.md`로 제공한다. 기존 루트 README를 교체하므로 Flutter 소개를 유지해야 하면 먼저 병합·보관한다. 이전의 README-SIMULATION 파일이 저장소에 남아 있으면 삭제한다.

```text
smart_cart_app/
  .github/workflows/deploy-simulator.yml
  .nojekyll
  index.html
  README.md
  README-KR.md
  simulator/
    index.html
    css/app.css
    js/math.js
    js/world.js
    js/kinematics.js
    js/dynamics.js
    js/sensors.js
    js/navigation.js
    js/simulation.js
    js/gl.js
    js/model.js
    js/view.js
    js/app.js
    assets/
    docs/
    SOURCE-NOTICE.md
  tests/
    core.test.cjs
    browser.test.py
    static.test.py
    core-results.json
    browser-results.json
    static-results.json
```

## 권장: GitHub Actions

1. 파일들을 저장소 루트에 복사하고 커밋·푸시한다.
2. 저장소 **Settings → Pages → Build and deployment → Source → GitHub Actions**를 선택한다.
3. **Actions → Deploy Smart Cart Simulator → Run workflow**를 실행하거나 `main`의 `simulator/` 변경 푸시로 실행한다.
4. 워크플로의 `deployment` 출력에 표시된 주소를 연다. 이 방식에서는 `simulator/`가 배포 루트이므로 주소 뒤에 `/simulator/`를 덧붙이지 않는다.

사용자 지정 도메인이 없다면 예상 기본 주소는 `https://jtech-co.github.io/smart_cart_app/`이다. **해당 주소에 실제 배포를 수행하거나 접속 성공을 확인한 것은 아니다.** 저장소 가시성·계정 요금제·조직 정책·Pages 권한에 따라 활성화 조건이 달라질 수 있다. 워크플로는 공식 문서에 나온 checkout v6, configure-pages v5, upload-pages-artifact v4, deploy-pages v4 구성을 사용하며 현재 `main`만 대상으로 한다.

한 저장소에는 Pages 사이트가 하나이므로 기존 Flutter Web 배포가 있다면 이 워크플로와 서로 덮어쓰면 안 된다. 기존 Flutter Web 사이트를 그대로 유지하면서 하위 `/simulator/`에 넣으려면, 기존 빌드 결과 디렉터리에 이 패키지의 `simulator/` 폴더를 복사한 뒤 **기존 워크플로 하나로** 배포한다. 예를 들어 Flutter Web 빌드 출력이 `build/web/`이면 `build/web/simulator/`에 복사한다. 이 패키지가 기존 Flutter 빌드를 자동 변경해 주지는 않는다.

## 대안: 브랜치에서 배포

**Settings → Pages → Deploy from a branch → main → /(root)**를 선택한다. 이 경우 루트 `index.html`이 `./simulator/index.html`로 연결한다. 시뮬레이터 주소는 `https://jtech-co.github.io/smart_cart_app/simulator/index.html` 형태다. 저장소 이름이 바뀌어도 상대경로 자산이므로 코드를 고칠 필요가 없다. `.nojekyll`로 불필요한 정적 사이트 처리를 피한다.

Actions 방식과 브랜치 방식을 동시에 운영하려 하지 않는다. 정적 웹앱이므로 실행 중 서버가 필요하지 않으며 웹 호스팅이 HTML/CSS/JS를 전달하기만 하면 된다. 모든 페이지 이동과 자산 경로는 상대경로다.

## 로컬 확인

개인 브라우저에서 `simulator/index.html`을 직접 열도록 구성했다. 일부 조직 정책은 로컬 HTML/WebGL을 차단할 수 있다. 일반 HTTP 정적 호스팅으로도 동작한다. 개발 중 필요한 경우에만 Python 등의 임시 정적 서버를 사용한다. 이는 배포·실행을 위한 필수 백엔드가 아니다.

브라우저에서 오류가 나면 화면의 오류 문구와 개발자 도구 콘솔을 확인한다. WebGL 2 초기화 실패는 빈 화면으로 숨기지 않고 안내를 표시한다. 하드웨어 가속이 없으면 소프트웨어 렌더링이 매우 느릴 수 있다. 환경 세부 설정의 경량 품질은 픽셀 밀도 및 LiDAR 광선 수를 줄이지만 경로가 표준 품질과 달라질 수 있다.

## 원본 Flutter 데이터와의 대응

원본 앱의 `Telemetry.fromJson`은 누락 필드에 관대하고 모르는 필드를 무시한다. 내보내기의 **Flutter 형식 텔레메트리 JSON**은 아래 필드 구조를 유지한다.

| 원본 필드 | 시뮬레이션 내용 |
|---|---|
| `t` | 시뮬레이션 경과 시간 ms |
| `link.state` | `simulation` |
| `power.battery_v` | 추정 버스 전압, 실측 아님 |
| `power.battery_pct` | null, SOC를 계산하지 않음 |
| `power.contactor` / `estop` | 비상정지 상태; 별도 유한 용량·미교정 제동 가정과 구분 |
| `drive.mode` | `follow` |
| `drive.duty_l/r`, `current_l/r`, `speed_mps` | 계산된 합성 데이터 |
| `pose.roll/pitch/yaw` | 모델 차체 자세 ° |
| `lidar.seq/start_deg/step_deg/ranges_mm` | 0° 전방, 양의 각도 우측; 0은 무반환/실패 |
| `tof.left_mm/right_mm` | **전방 좌·우 ToF**, 이전 앱 문서의 측면 센서와 의미가 다름 |
| `tof.cliff` | **null**, 전방 ToF로 낙차를 검출했다고 주장하지 않음 |
| `uwb.tag/dist_m/bearing_deg` | 유효 시 ok; 전방 0°, 좌측 음수 |
| `faults` | `SIM_` 접두어의 고장/지형 제한 및 비상정지 |
| `sim` | 합성 데이터 명시, 조향각, ToF 의미 변경, 제동 가정 |

원본 앱은 실제 모터 속도를 엔코더 장착 전에는 null로 취급할 수 있다. 여기의 `speed_mps`는 **시뮬레이션의 실제 상태값**이지 실차 엔코더가 설치되었다는 뜻이 아니다. 앱 UI에서 `link.state == connected`만 접속으로 표시하는 로직이 있다면 `simulation` 상태를 그대로 넣었을 때 별도 표기가 필요할 수 있다. 필드가 파싱 가능하다는 것과 앱의 모든 UI/전송 어댑터가 연결되는 것은 다르다.

**정적 파일 배포만으로 Flutter 앱이 데이터를 실시간 수신하는 것은 아니다.** 이 패키지는 WebSocket 서버나 펌웨어를 실행하지 않는다. 통신 추가가 필요할 때는 기존 앱의 simulation/server/vehicle 분리를 유지하고 실차 빌드에 가짜 데이터가 섞이지 않도록 한다. 본 패키지의 JSON은 파서·시각화·분석 검토용이다.

## 테스트

`node tests/core.test.cjs`, `node tests/bugfix.test.cjs`, `node tests/release120.test.cjs`는 외부 모듈 없이 엔진 회귀 테스트를 수행한다. GitHub Actions 배포 전에 이 테스트가 실행된다. `tests/browser.test.py`는 별도의 Playwright 설치가 있는 개발 환경용이며 배포에 필요하지 않다. QA 문서는 테스트 환경에서 직접 브라우저 URL 탐색을 확인하지 못한 제한과 별도로 실제 파일 저장 완료를 확인한 결과를 기록한다.

## 공식 문서

- [GitHub Pages 개요](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [사용자 지정 Pages 워크플로](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)


1.2.0도 `simulator/js/kinematics.js`, `simulator/js/dynamics.js`도 필요합니다. 기존 simulator 폴더 전체를 교체하여 오래된 JS와 새 HTML이 혼합되지 않도록 합니다. 센서·모터의 기존 Flutter 필드는 유지하며, 추가 가속도·힘 값은 `sim` 확장과 CSV/세션에 있습니다.
