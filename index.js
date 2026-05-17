const MOBILE_BREAKPOINT = 460;


const cityCoordinates = {
  "New York": { lat: 40.7128, lon: -74.0060, label: "New York" },
  "Tokyo":    { lat: 35.6762, lon: 139.6503, label: "Tokyo" },
  "Seoul":    { lat: 37.5665, lon: 126.9780, label: "Seoul" },
  "Okinawa":  { lat: 26.2124, lon: 127.6809, label: "Okinawa" },
  "London":   { lat: 51.5072, lon: -0.1276,  label: "London" },
  "Sydney":   { lat: -33.8688, lon: 151.2093, label: "Sydney" },
  // 추가 도시
  "Paris":    { lat: 48.8566, lon: 2.3522,   label: "Paris" },
  "Berlin":   { lat: 52.5200, lon: 13.4050,  label: "Berlin" },
  "Beijing":  { lat: 39.9042, lon: 116.4074, label: "Beijing" },
  "Shanghai": { lat: 31.2304, lon: 121.4737, label: "Shanghai" },
  "Busan":    { lat: 35.1796, lon: 129.0756, label: "Busan" },
  "Osaka":    { lat: 34.6937, lon: 135.5023, label: "Osaka" },
  "Bangkok":  { lat: 13.7563, lon: 100.5018, label: "Bangkok" },
  "Singapore":{ lat: 1.3521,  lon: 103.8198, label: "Singapore" },
  "Dubai":    { lat: 25.2048, lon: 55.2708,  label: "Dubai" },
  "Chicago":  { lat: 41.8781, lon: -87.6298, label: "Chicago" },
  "Los Angeles":{ lat: 34.0522, lon: -118.2437, label: "Los Angeles" },
};

// 도시 별칭 테이블 (소문자 → cityCoordinates 키)
const cityAliases = {
  // New York
  "new york": "New York", "뉴욕": "New York", "ニューヨーク": "New York",
  // Tokyo
  "tokyo": "Tokyo", "도쿄": "Tokyo", "東京": "Tokyo", "とうきょう": "Tokyo",
  // Seoul
  "seoul": "Seoul", "서울": "Seoul", "ソウル": "Seoul",
  // Okinawa
  "okinawa": "Okinawa", "오키나와": "Okinawa", "沖縄": "Okinawa", "おきなわ": "Okinawa",
  // London
  "london": "London", "런던": "London", "ロンドン": "London",
  // Sydney
  "sydney": "Sydney", "시드니": "Sydney", "シドニー": "Sydney", "australia": "Sydney",
  // Paris
  "paris": "Paris", "파리": "Paris", "パリ": "Paris",
  // Berlin
  "berlin": "Berlin", "베를린": "Berlin", "ベルリン": "Berlin",
  // Beijing
  "beijing": "Beijing", "peking": "Beijing", "베이징": "Beijing", "北京": "Beijing",
  // Shanghai
  "shanghai": "Shanghai", "상하이": "Shanghai", "上海": "Shanghai",
  // Busan
  "busan": "Busan", "부산": "Busan", "釜山": "Busan", "プサン": "Busan",
  // Osaka
  "osaka": "Osaka", "오사카": "Osaka", "大阪": "Osaka", "おおさか": "Osaka",
  // Bangkok
  "bangkok": "Bangkok", "방콕": "Bangkok", "バンコク": "Bangkok",
  // Singapore
  "singapore": "Singapore", "싱가포르": "Singapore", "シンガポール": "Singapore",
  // Dubai
  "dubai": "Dubai", "두바이": "Dubai", "ドバイ": "Dubai",
  // Chicago
  "chicago": "Chicago", "시카고": "Chicago", "シカゴ": "Chicago",
  // Los Angeles
  "los angeles": "Los Angeles", "la": "Los Angeles", "로스앤젤레스": "Los Angeles", "엘에이": "Los Angeles", "ロサンゼルス": "Los Angeles",
};

// =========================
// p5 camera + weather effects
// =========================
let cam;
let cameraReady = false;


let hotEffectOn = false;
let cloudyEffectOn = false;
let fogEffectOn = false;
let snowEffectOn = false;
let rainEffectOn = false;
let coldEffectOn = false;
let windEffectOn = false;

let windOrder = [];
let windTimer = 0;
let windOffscreen = null;

const RAIN_BUFFER_MAX = 30;
let rainFrameBuffer = [];

let pxSnow = null;
const PX_BLOCK = 8;
let snowSoftOffscreen = null;

let cloudyCodeBuf = null;
let cloudyCodeFrame = 0;
const CLOUDY_CODE = [1,0,1,1,0,1,1,1,0,1,0,0,1,0,1,1,0,0,0,1,1,0,1,0,0,1,1,1,1,0,1,0];

let sunnyEffectOn = false;
let sunnyStars = null;

// 현재 날씨 데이터를 저장해두고
// 수동 필터 선택 시 다시 렌더링할 때 사용
let latestWeatherData = null;
let latestCityLabel = "";

// null이면 실시간 날씨 사용
// 문자열이면 그 weatherType을 강제로 사용
let manualFilterType = null;

// 현재 선택된 도시 버튼 active 표시용
let activeCityName = null;

function getFrameSize() {
  const rawFrameWidth = window.innerWidth <= MOBILE_BREAKPOINT
    ? window.innerWidth * 0.95
    : Math.min(window.innerWidth * 0.82, 320);

  const frameWidth = Math.round(rawFrameWidth);
  const frameHeight = Math.round(frameWidth * 1.3125);

  return { frameWidth, frameHeight };
}

function setup() {
  const { frameWidth, frameHeight } = getFrameSize();

  const canvas = createCanvas(frameWidth, frameHeight);
  canvas.parent("p5-container");

  const cameraConstraints = {
    video: {
      facingMode: { ideal: "user" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
      aspectRatio: { ideal: 16 / 9 },
      frameRate: { ideal: 30, max: 30 },
      resizeMode: "none"
    },
    audio: false
  };

  cam = createCapture(cameraConstraints, () => {
    if (!cam || !cam.elt) return;

    const markCameraReady = () => {
      if (cam.elt.videoWidth > 0 && cam.elt.videoHeight > 0) {
        cameraReady = true;
      }
    };

    cam.elt.setAttribute("playsinline", "");
    cam.elt.setAttribute("autoplay", "");
    cam.elt.setAttribute("muted", "");

    cam.elt.playsInline = true;
    cam.elt.muted = true;

    cam.elt.addEventListener("loadedmetadata", markCameraReady);
    cam.elt.addEventListener("playing", markCameraReady);

    markCameraReady();
  });

  cam.hide();
  pixelDensity(1);
}



function windowResized() {
  const { frameWidth, frameHeight } = getFrameSize();
  resizeCanvas(frameWidth, frameHeight);
  sunnyStars = null;
  pxSnow = null;
}

function drawCameraCover(videoSource) {
  const srcW = videoSource.elt?.videoWidth || videoSource.width;
  const srcH = videoSource.elt?.videoHeight || videoSource.height;

  if (!srcW || !srcH) return;

  const destW = width;
  const destH = height;

  const srcRatio = srcW / srcH;
  const destRatio = destW / destH;

  let sx;
  let sy;
  let sw;
  let sh;

  if (srcRatio > destRatio) {
    sh = srcH;
    sw = srcH * destRatio;
    sx = (srcW - sw) / 2;
    sy = 0;
  } else {
    sw = srcW;
    sh = srcW / destRatio;
    sx = 0;
    sy = (srcH - sh) / 2;
  }

  image(videoSource, 0, 0, destW, destH, sx, sy, sw, sh);
}




function drawCloudyWhiteOverlay() {
  push();
  noStroke();

  for (let y = 0; y < height * 0.55; y++) {
    const alpha = map(y, 0, height * 0.55, 110, 0);
    fill(255, 255, 255, alpha);
    rect(0, y, width, 1);
  }

  drawingContext.filter = "blur(18px)";
  fill(255, 255, 255, 45);
  rect(0, 0, width, height * 0.22);
  drawingContext.filter = "none";

  pop();
}

function drawFogPixelated(videoSource) {
  drawCameraCover(videoSource);

  loadPixels();
  const sourcePixels = pixels.slice();

  const blockSize = window.innerWidth <= MOBILE_BREAKPOINT ? 22 : 18;

  for (let y = 0; y < height; y += blockSize) {
    for (let x = 0; x < width; x += blockSize) {
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let count = 0;

      for (let yy = y; yy < min(y + blockSize, height); yy++) {
        for (let xx = x; xx < min(x + blockSize, width); xx++) {
          const i = (xx + yy * width) * 4;
          totalR += sourcePixels[i];
          totalG += sourcePixels[i + 1];
          totalB += sourcePixels[i + 2];
          count++;
        }
      }

      const avgR = min((totalR / count) * 1.05 + 20, 255);
      const avgG = min((totalG / count) * 1.08 + 20, 255);
      const avgB = min((totalB / count) * 1.12 + 24, 255);

      for (let yy = y; yy < min(y + blockSize, height); yy++) {
        for (let xx = x; xx < min(x + blockSize, width); xx++) {
          const i = (xx + yy * width) * 4;
          pixels[i] = avgR;
          pixels[i + 1] = avgG;
          pixels[i + 2] = avgB;
          pixels[i + 3] = 255;
        }
      }
    }
  }

  updatePixels();

  if (window.innerWidth > MOBILE_BREAKPOINT) {
    push();
    noStroke();
    for (let y = 0; y < height; y++) {
      const alpha = map(y, 0, height, 70, 16);
      fill(255, 255, 255, alpha);
      rect(0, y, width, 1);
    }
    pop();
  }
}


function draw() {
  if (!cam) return;

  const videoW = cam.elt?.videoWidth || 0;
  const videoH = cam.elt?.videoHeight || 0;

  if (!cameraReady && (!videoW || !videoH)) {
    return;
  }

  if (fogEffectOn) {
    drawFogPixelated(cam);

  } else if (coldEffectOn) {
    drawColdFlowField();

  } else if (windEffectOn) {
    drawWindEffect();

  } else if (sunnyEffectOn) {
    drawSunnyEffect();

  } else {
    drawCameraCover(cam);

    if (hotEffectOn) {
      loadPixels();
      const sourcePixels = pixels.slice();

      const waveAmount = window.innerWidth <= MOBILE_BREAKPOINT
      ? Math.round(width * 0.13)
      : Math.round(width * 0.15);

      for (let y = 0; y < height; y++) {
        const wave = map(
          noise(y * 0.012, frameCount * 0.03),
          0, 1,
          -waveAmount, waveAmount
        );

        for (let x = 0; x < width; x++) {
          const index = (x + y * width) * 4;

          const waveX = map(
            noise(x * 0.015, frameCount * 0.032 + 100),
            0, 1,
            -waveAmount, waveAmount
          );

          let shiftedY = floor(y + wave);
          shiftedY = constrain(shiftedY, 0, height - 1);

          const shiftedX = constrain(floor(x + waveX), 0, width - 1);

          const shiftedIndex = (shiftedX + shiftedY * width) * 4;

          pixels[index] = sourcePixels[shiftedIndex];
          pixels[index + 1] = sourcePixels[shiftedIndex + 1];
          pixels[index + 2] = sourcePixels[shiftedIndex + 2];
          pixels[index + 3] = sourcePixels[shiftedIndex + 3];
        }
      }

      updatePixels();

    } else if (cloudyEffectOn) {
      drawCameraCover(cam);
      loadPixels();

      const pxLen = pixels.length;
      if (!cloudyCodeBuf || cloudyCodeBuf.length !== pxLen) {
        cloudyCodeBuf = new Float32Array(pxLen);
        for (let i = 0; i < pxLen; i++) cloudyCodeBuf[i] = pixels[i];
        cloudyCodeFrame = 0;
      }

      const bit = CLOUDY_CODE[cloudyCodeFrame % 32];
      cloudyCodeFrame++;
      const alpha = bit === 1 ? 0.18 : 0.02;

      for (let i = 0; i < pxLen; i += 4) {
        cloudyCodeBuf[i]   = cloudyCodeBuf[i]   * (1 - alpha) + pixels[i]   * alpha;
        cloudyCodeBuf[i+1] = cloudyCodeBuf[i+1] * (1 - alpha) + pixels[i+1] * alpha;
        cloudyCodeBuf[i+2] = cloudyCodeBuf[i+2] * (1 - alpha) + pixels[i+2] * alpha;
      }

      for (let i = 0; i < pxLen; i += 4) {
        pixels[i]   = cloudyCodeBuf[i];
        pixels[i+1] = cloudyCodeBuf[i+1];
        pixels[i+2] = cloudyCodeBuf[i+2];
        pixels[i+3] = 255;
      }

      updatePixels();
      if (window.innerWidth > MOBILE_BREAKPOINT) drawCloudyWhiteOverlay();
    } else if (rainEffectOn) {
      drawRainSlitScan();
    }
  }

  if (snowEffectOn) {
    loadPixels();
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const brightness = (r + g + b) / 3;
      const highlight = brightness > 150 ? map(brightness, 150, 255, 0, 80) : 0;

      pixels[i]     = min(r * 0.92 + 8  + highlight, 255);
      pixels[i + 1] = min(g * 0.96 + 10 + highlight, 255);
      pixels[i + 2] = min(b * 1.0  + 32 + highlight, 255);
    }
    updatePixels();

    // 피부 보정: 밝은 영역에 소프트 블러 글로우 (screen 블렌드)
    const ctx = drawingContext;
    const cvs = ctx.canvas;
    if (!snowSoftOffscreen || snowSoftOffscreen.width !== width || snowSoftOffscreen.height !== height) {
      snowSoftOffscreen = document.createElement('canvas');
      snowSoftOffscreen.width  = width;
      snowSoftOffscreen.height = height;
    }
    snowSoftOffscreen.getContext('2d').drawImage(cvs, 0, 0);
    // 1차: 넓은 블러로 전체 소프트닝
    ctx.filter = 'blur(14px)';
    ctx.globalAlpha = 0.42;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(snowSoftOffscreen, 0, 0);
    // 2차: 좁은 블러로 하이라이트 강화
    ctx.filter = 'blur(6px)';
    ctx.globalAlpha = 0.22;
    ctx.drawImage(snowSoftOffscreen, 0, 0);
    ctx.filter = 'none';
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';

    push();
    noStroke();
    fill(220, 235, 255, 38);
    rect(0, 0, width, height);
    pop();

    if (!pxSnow) initPxSnow();
    stepPxSnow();

  } else {
    pxSnow = null;
    snowSoftOffscreen = null;
  }

  if (!rainEffectOn) {
    rainFrameBuffer = [];
  }

}

function drawWindEffect() {
  if (windOrder.length === 0) shuffleWindOrder();

  windTimer++;
  if (windTimer >= 15) {
    windTimer = 0;
    shuffleWindOrder();
  }

  drawCameraCover(cam);

  const ctx = drawingContext;
  const canvas = ctx.canvas;
  const cellW = width  / WIND_COLS;
  const cellH = height / WIND_ROWS;

  if (!windOffscreen || windOffscreen.width !== width || windOffscreen.height !== height) {
    windOffscreen = document.createElement('canvas');
  }
  windOffscreen.width = width;
  windOffscreen.height = height;
  windOffscreen.getContext('2d').drawImage(canvas, 0, 0);

  for (let i = 0; i < WIND_ROWS * WIND_COLS; i++) {
    const srcIdx = windOrder[i];
    const srcRow = floor(srcIdx / WIND_COLS);
    const srcCol = srcIdx % WIND_COLS;
    const dstRow = floor(i / WIND_COLS);
    const dstCol = i % WIND_COLS;

    ctx.drawImage(
      windOffscreen,
      srcCol * cellW, srcRow * cellH, cellW, cellH,
      dstCol * cellW, dstRow * cellH, cellW, cellH
    );
  }
}

// =========================
// wind: 20행 × 10열 격자 셔플
// =========================
const WIND_ROWS = 20;
const WIND_COLS = 10;

function shuffleWindOrder() {
  const total = WIND_ROWS * WIND_COLS;
  windOrder = Array.from({ length: total }, (_, i) => i);
  for (let i = windOrder.length - 1; i > 0; i--) {
    const j = floor(random(i + 1));
    const tmp = windOrder[i];
    windOrder[i] = windOrder[j];
    windOrder[j] = tmp;
  }
}

// =========================
// sunny: spin blur (회전 줄기) 효과
// =========================
// sunny: 2분할 별 마스크 효과
// =========================
function initSunny() {
  randomSeed(42);
  sunnyStars = [];
  const halfH = height / 2;
  const cols = 5;
  const rows = 5;
  const cellW = width / cols;
  const cellHBot = (halfH - 16) / rows;

  for (let i = 0; i < rows * cols; i++) {
    random(); random(); random();
  }

  const allBottom = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      allBottom.push({
        x: col * cellW + random(cellW * 0.12, cellW * 0.88),
        y: halfH + 8 + row * cellHBot + random(cellHBot * 0.1, cellHBot * 0.9),
        r: random(7, 18)
      });
    }
  }

  allBottom[1].col  = 'mint';
  allBottom[6].col  = 'brown';
  allBottom[12].col = 'mint';
  allBottom[18].col = 'mint';
  allBottom[22].col = 'brown';

  const removeSet = new Set([3, 4, 7, 9, 10, 20]);
  const bottomStars = allBottom.filter((_, i) => !removeSet.has(i));

  const topStars = bottomStars.map(s => ({ x: s.x, y: s.y - halfH, r: s.r }));
  sunnyStars = [...topStars, ...bottomStars];
}

function drawSunnyEffect() {
  if (!sunnyStars) initSunny();

  const halfH = height / 2;
  const ctx = drawingContext;
  const video = cam.elt;

  if (!video || !video.videoWidth) {
    drawCameraCover(cam);
    return;
  }

  const srcW = video.videoWidth;
  const srcH = video.videoHeight;
  const destRatio = width / halfH;
  const srcRatio = srcW / srcH;
  let sx, sy, sw, sh;
  if (srcRatio > destRatio) {
    sh = srcH; sw = srcH * destRatio;
    sx = (srcW - sw) / 2; sy = 0;
  } else {
    sw = srcW; sh = srcW / destRatio;
    sx = 0; sy = (srcH - sh) / 2;
  }
  function makeStarPath(cx, cy, r) {
    ctx.beginPath();
    const inner = r * 0.42;
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI / 5) - Math.PI / 2;
      const rad = i % 2 === 0 ? r : inner;
      const px = cx + Math.cos(angle) * rad;
      const py = cy + Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // 상단: 흰 배경 + 별 clip 안에 카메라
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, halfH);

  for (const s of sunnyStars) {
    if (s.y < halfH) {
      ctx.save();
      makeStarPath(s.x, s.y, s.r);
      ctx.clip();
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, halfH);
      ctx.restore();
    }
  }

  // 하단: 카메라 + 별 도형
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, halfH, width, halfH);
  ctx.clip();
  ctx.drawImage(video, sx, sy, sw, sh, 0, halfH, width, halfH);
  ctx.restore();

  for (const s of sunnyStars) {
    if (s.y >= halfH) {
      if (s.col === 'mint')       ctx.fillStyle = 'rgb(152, 224, 210)';
      else if (s.col === 'brown') ctx.fillStyle = 'rgb(90, 42, 18)';
      else                        ctx.fillStyle = 'white';
      makeStarPath(s.x, s.y, s.r);
      ctx.fill();
    }
  }

  // 분할선
  ctx.strokeStyle = 'rgba(180,180,180,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, halfH);
  ctx.lineTo(width, halfH);
  ctx.stroke();
}

// =========================
// cold: 2색 Bayer ordered dithering
// =========================
function drawColdFlowField() {
  drawCameraCover(cam);
  loadPixels();

  const step = 6; // 블록 크기 (픽셀 아트 느낌)

  // ↓ 두 색상만 여기서 조정 (HEX)
  const dark  = '#3c9eff'; // 어두운 파랑
  const light = '#81e1fc'; // 밝은 하늘색

  const h = s => [parseInt(s.slice(1,3),16), parseInt(s.slice(3,5),16), parseInt(s.slice(5,7),16)];
  const darkRgb  = h(dark);
  const lightRgb = h(light);

  // Bayer 4×4 ordered dithering matrix
  const bayer = [
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5]
  ];

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const ci = (y * width + x) * 4;
      const brightness = 0.299 * pixels[ci] + 0.587 * pixels[ci + 1] + 0.114 * pixels[ci + 2];

      const threshold = (bayer[floor(y / step) % 4][floor(x / step) % 4] / 15.0) * 255;
      const c = brightness > threshold ? lightRgb : darkRgb;

      for (let dy = 0; dy < step && y + dy < height; dy++) {
        for (let dx = 0; dx < step && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          pixels[i]     = c[0];
          pixels[i + 1] = c[1];
          pixels[i + 2] = c[2];
          pixels[i + 3] = 255;
        }
      }
    }
  }

  updatePixels();
}


// =========================
// rain slit scan
// =========================
function drawRainSlitScan() {
  loadPixels();

  rainFrameBuffer.push(pixels.slice());
  if (rainFrameBuffer.length > RAIN_BUFFER_MAX) {
    rainFrameBuffer.shift();
  }

  if (rainFrameBuffer.length < 2) {
    updatePixels();
    return;
  }

  const bufLen = rainFrameBuffer.length;

  for (let x = 0; x < width; x++) {
    const delay = floor(noise(x * 0.05, frameCount * 0.018) * (bufLen - 1));
    const src = rainFrameBuffer[bufLen - 1 - delay];

    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      const blueVal = src[i + 2] * 1.05 + 15;
      pixels[i]     = src[i]     * 0.72;
      pixels[i + 1] = src[i + 1] * 0.85;
      pixels[i + 2] = blueVal > 255 ? 255 : blueVal;
      pixels[i + 3] = 255;
    }
  }

  updatePixels();
}

// =========================
// pixel block snow
// =========================
function initPxSnow() {
  const cols = Math.ceil(width  / PX_BLOCK);
  const rows = Math.ceil(height / PX_BLOCK);
  pxSnow = {
    cols, rows,
    stacks: new Array(cols).fill(0),
    blocks: [],
    timers: Array.from({ length: cols }, () => Math.floor(random(1, 28))),
    phase: 'falling',
    pauseTimer: 0,
    tick: 0
  };
}

function stepPxSnow() {
  const { cols, rows, stacks, blocks, timers } = pxSnow;
  const bs = PX_BLOCK;

  // 4프레임 중 3번 업데이트 → 기존 대비 1.5배 속도
  pxSnow.tick = (pxSnow.tick + 1) % 2.5;
  const doUpdate = pxSnow.tick !== 0;

  if (pxSnow.phase === 'falling') {
    if (doUpdate) {
      // spawn: 컬럼별 독립 타이머
      for (let c = 0; c < cols; c++) {
        if (--timers[c] <= 0) {
          if (stacks[c] < rows) blocks.push({ col: c, y: 0 });
          timers[c] = Math.floor(random(6, 18));
        }
      }

      // 이동: 바닥 쪽 블록 먼저 처리해야 stacks 정합성 유지
      blocks.sort((a, b) => b.y - a.y);
      for (let i = 0; i < blocks.length; i++) {
        blocks[i].y += bs;
        const landY = height - (stacks[blocks[i].col] + 1) * bs;
        if (blocks[i].y >= landY) {
          stacks[blocks[i].col]++;
          blocks.splice(i, 1);
          i--;
        }
      }
    }

    // 모든 컬럼이 꽉 차면 pause 후 재시작
    if (stacks.every(s => s >= rows)) {
      pxSnow.phase = 'pause';
      pxSnow.pauseTimer = 30;
    }

  } else {
    // 짧은 pause 후 초기화
    if (--pxSnow.pauseTimer <= 0) {
      stacks.fill(0);
      blocks.length = 0;
      for (let c = 0; c < cols; c++) timers[c] = Math.floor(random(1, 28));
      pxSnow.phase = 'falling';
    }
  }

  // 렌더링
  push();
  noStroke();
  fill(235, 245, 255, 215);
  for (let c = 0; c < cols; c++) {
    for (let row = 0; row < stacks[c]; row++) {
      rect(c * bs, height - (row + 1) * bs, bs, bs);
    }
  }
  for (const b of blocks) {
    rect(b.col * bs, b.y, bs, bs);
  }
  pop();
}

// =========================
// location helpers
// =========================
function getCityName(lat, lon) {
  return fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`, {
    headers: {
      "Accept-Language": "en"
    }
  })
    .then(res => res.json())
    .then(data => {
      const address = data.address || {};

      return (
        address.city ||
        address.town ||
        address.village ||
        address.county ||
        address.state ||
        "Unknown location"
      );
    })
    .catch(err => {
      console.error("City fetch error:", err);
      return "Unknown location";
    });
}

// 현재 위치 기준으로 전체 리셋해서 다시 불러오는 함수
function loadCurrentLocationWeather() {
  navigator.geolocation.getCurrentPosition(
    async position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      const city = await getCityName(lat, lon);

      activeCityName = null;
      manualFilterType = null;

      updateCityButtonState();
      updateFilterButtonState();

      loadWeather(lat, lon, city);
    },
    error => {
      console.error("Location error:", error);
      document.getElementById("weather").textContent = "Location access denied";
    }
  );
}

// =========================
// weather type classification
// =========================
function getWeatherType(data) {
  const temp = data.current.temperature_2m;
  const precipitation = data.current.precipitation;
  const wind = data.current.wind_speed_10m;
  const cloud = data.current.cloud_cover;
  const code = data.current.weather_code;

  const isSnow = (code >= 71 && code <= 77) || code === 85 || code === 86;
  const isFog = code === 45 || code === 48;
  const isRain = precipitation > 0 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82);

  const isCloudy = cloud > 60;
  const isCold = temp < 8;
  const isHot = temp > 26;

  const isWindy = wind > 12;
  const isVeryWindy = wind > 20;

  if (isSnow) {
    if (isWindy) return "windy";
    return "snow";
  } else if (isFog) {
    return "fog";
  } else if (isRain) {
    if (isWindy) return "windy";
    return "rain";
  } else if (isVeryWindy) {
    return "windy";
  } else if (isCold) {
    return "cold";
  } else if (isHot) {
    return "hot";
  } else if (isCloudy) {
    if (isWindy) return "windy";
    return "cloudy";
  } else {
    return "sunny";
  }
}

// =========================
// weather style mapping
// =========================
function getWeatherStyle(weatherType) {
  switch (weatherType) {
    case "snow":
      return {
        bgColor: "#EAF4FF",
        emoji: "❄️",
        hotEffectOn: false,
        cloudyEffectOn: false,
        snowEffectOn: true,
        fogEffectOn: false
      };

    case "fog":
      return {
        bgColor: "#D9D9D9",
        emoji: "🌫️",
        hotEffectOn: false,
        cloudyEffectOn: false,
        snowEffectOn: false,
        fogEffectOn: true
      };

    case "rain":
      return {
        bgColor: "#87CEFA",
        emoji: "🌧️",
        hotEffectOn: false,
        cloudyEffectOn: false,
        snowEffectOn: false,
        fogEffectOn: false,
        rainEffectOn: true
      };

    case "windy":
      return {
        bgColor: "#B0E0E6",
        emoji: "🌀",
        hotEffectOn: false,
        cloudyEffectOn: false,
        snowEffectOn: false,
        fogEffectOn: false,
        windEffectOn: true
      };

    case "cold":
      return {
        bgColor: "#CFE8FF",
        emoji: "🧊",
        hotEffectOn: false,
        cloudyEffectOn: false,
        snowEffectOn: false,
        fogEffectOn: false,
        coldEffectOn: true
      };

    case "hot":
      return {
        bgColor: "#FF6863",
        emoji: "🔥",
        hotEffectOn: true,
        cloudyEffectOn: false,
        snowEffectOn: false,
        fogEffectOn: false
      };

    case "cloudy":
      return {
        bgColor: "#A9A9A9",
        emoji: "☁️",
        hotEffectOn: false,
        cloudyEffectOn: true,
        snowEffectOn: false,
        fogEffectOn: false
      };

    case "sunny":
    default:
      return {
        bgColor: "#ffee8e",
        emoji: "☀️",
        hotEffectOn: false,
        cloudyEffectOn: false,
        snowEffectOn: false,
        fogEffectOn: false,
        sunnyEffectOn: true
      };
  }
}

// =========================
// render weather / filter UI
// =========================
function applyWeatherStyle(weatherType, cityLabel, data) {
  const style = getWeatherStyle(weatherType);

  const temp = data?.current?.temperature_2m ?? "-";
  const humidity = data?.current?.relative_humidity_2m ?? "-";
  const precipitation = data?.current?.precipitation ?? "-";
  const wind = data?.current?.wind_speed_10m ?? "-";

  document.getElementById("weather").innerHTML = `
    <p>Location: ${cityLabel}</p>
    <p>Temperature: ${temp}°C</p>
    <p>Humidity: ${humidity}%</p>
    <p>Precipitation: ${precipitation} mm</p>
    <p>Wind: ${wind} m/s</p>
  `;

  document.body.style.backgroundColor = style.bgColor;
  document.getElementById("weatherEmoji").textContent = style.emoji;
  hotEffectOn = style.hotEffectOn;
  cloudyEffectOn = style.cloudyEffectOn;
  if (!cloudyEffectOn) { cloudyCodeBuf = null; cloudyCodeFrame = 0; }
  snowEffectOn = style.snowEffectOn;
  fogEffectOn = style.fogEffectOn;
  rainEffectOn = style.rainEffectOn ?? false;
  coldEffectOn = style.coldEffectOn ?? false;
  sunnyEffectOn = style.sunnyEffectOn ?? false;
  if (!sunnyEffectOn) { sunnyStars = null; }
  windEffectOn = style.windEffectOn ?? false;

  console.log("weatherType:", weatherType, "| manualFilterType:", manualFilterType);
}

function updateWeatherUI(data, cityLabel) {
  latestWeatherData = data;
  latestCityLabel = cityLabel;

  const liveWeatherType = getWeatherType(data);
  const finalWeatherType = manualFilterType || liveWeatherType;

  applyWeatherStyle(finalWeatherType, cityLabel, data);
}

// =========================
// weather fetch
// =========================
function loadWeather(lat, lon, cityLabel) {
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,cloud_cover,weather_code`)
    .then(res => res.json())
    .then(data => {
      updateWeatherUI(data, cityLabel);
    })
    .catch(err => {
      console.error("Weather fetch error:", err);
      document.getElementById("weather").textContent = "Failed to load weather data";
    });
}









// =========================
// initial load: current location
// =========================
loadCurrentLocationWeather();

// =========================
// city button clicks
// =========================
const cityButtons = document.querySelectorAll(".city-btn");

function updateCityButtonState() {
  cityButtons.forEach(button => {
    const cityName = button.dataset.city;

    if (cityName === activeCityName) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
}

cityButtons.forEach(button => {
  button.addEventListener("click", () => {
    const cityName = button.dataset.city;
    const cityData = cityCoordinates[cityName];

    if (cityData) {
      activeCityName = cityName;
      manualFilterType = null;

      updateCityButtonState();
      updateFilterButtonState();

      loadWeather(cityData.lat, cityData.lon, cityData.label);
    }
  });
});

// =========================
// map toggle
// =========================
const mapToggle = document.getElementById("mapToggle");
const cityButtonsWrap = document.getElementById("cityButtons");

if (mapToggle && cityButtonsWrap) {
  mapToggle.addEventListener("click", () => {
    cityButtonsWrap.classList.toggle("active");
  });
}

// =========================
// filter toggle + filter buttons
// =========================
const filterToggle = document.getElementById("filterToggle");
const filterButtonsWrap = document.getElementById("filterButtons");
const filterButtons = document.querySelectorAll(".filter-btn");

function updateFilterButtonState() {
  filterButtons.forEach(button => {
    const filterName = button.dataset.filter;

    if (
      (filterName === "live" && manualFilterType === null) ||
      (filterName !== "live" && filterName === manualFilterType)
    ) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
}

if (filterToggle && filterButtonsWrap) {
  filterToggle.addEventListener("click", () => {
    filterButtonsWrap.classList.toggle("active");
  });
}

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    const selectedFilter = button.dataset.filter;

    if (selectedFilter === "live") {
      loadCurrentLocationWeather();
      return;
    } else {
      manualFilterType = selectedFilter;
    }

    updateFilterButtonState();

    if (latestWeatherData) {
      const liveWeatherType = getWeatherType(latestWeatherData);
      const finalWeatherType = manualFilterType || liveWeatherType;
      applyWeatherStyle(finalWeatherType, latestCityLabel, latestWeatherData);
    }
  });
});

updateFilterButtonState();
updateCityButtonState();

// =========================
// type my location
// =========================
const typeLocationBtn  = document.getElementById('typeLocationBtn');
const locationModal    = document.getElementById('locationModal');
const locationInput    = document.getElementById('locationInput');
const locationConfirm  = document.getElementById('locationConfirmBtn');
const locationCancel   = document.getElementById('locationCancelBtn');

typeLocationBtn.addEventListener('click', () => {
  cityButtonsWrap.classList.remove('active');
  locationInput.value = '';
  locationModal.classList.remove('hidden');
  setTimeout(() => locationInput.focus(), 50);
});

locationCancel.addEventListener('click', () => {
  locationModal.classList.add('hidden');
});

locationModal.addEventListener('click', (e) => {
  if (e.target === locationModal) locationModal.classList.add('hidden');
});

locationInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchTypedLocation();
});

locationConfirm.addEventListener('click', searchTypedLocation);

async function searchTypedLocation() {
  const query = locationInput.value.trim();
  if (!query) return;

  locationModal.classList.add('hidden');
  document.getElementById('weather').textContent = 'Searching...';

  // 1. 별칭 테이블 먼저 체크
  const key = cityAliases[query.toLowerCase()];
  if (key && cityCoordinates[key]) {
    const city = cityCoordinates[key];
    activeCityName = null;
    manualFilterType = null;
    updateCityButtonState();
    updateFilterButtonState();
    loadWeather(city.lat, city.lon, city.label);
    return;
  }

  // 2. 테이블에 없으면 Nominatim으로 fallback
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();

    if (!data || data.length === 0) {
      document.getElementById('weather').textContent = 'Location not found';
      return;
    }

    const result = data[0];

    // 실제 지명인지 검증: class/type/importance 체크
    const validClasses = ['place', 'boundary'];
    const validTypes = [
      'city', 'town', 'village', 'suburb', 'hamlet',
      'municipality', 'county', 'state', 'country', 'administrative', 'region'
    ];
    const isValidPlace =
      validClasses.includes(result.class) &&
      (validTypes.includes(result.type) || result.class === 'boundary') &&
      parseFloat(result.importance) >= 0.25;

    if (!isValidPlace) {
      document.getElementById('weather').textContent = 'Location not found';
      return;
    }

    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    activeCityName = null;
    manualFilterType = null;
    updateCityButtonState();
    updateFilterButtonState();

    loadWeather(lat, lon, query);
  } catch (err) {
    console.error('Geocode error:', err);
    document.getElementById('weather').textContent = 'Failed to find location';
  }
}

// =========================
// capture button
// =========================
const captureBtn = document.getElementById("captureBtn");

if (captureBtn) {
  captureBtn.addEventListener("click", async () => {
    const cityWrapper = document.querySelector(".city-wrapper");
    const filterWrapper = document.querySelector(".filter-wrapper");

    cityWrapper.style.visibility = "hidden";
    filterWrapper.style.visibility = "hidden";

    const target = document.getElementById("captureArea");
    const bg = getComputedStyle(document.body).backgroundColor;

    const canvas = await html2canvas(target, {
      backgroundColor: bg,
      useCORS: true
    });

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile && navigator.canShare) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      const file = new File([blob], "weatherframe.png", { type: "image/png" });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Weather Frame" });
      } else {
        const link = document.createElement("a");
        link.download = "weatherframe.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    } else {
      const link = document.createElement("a");
      link.download = "weatherframe.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }

    cityWrapper.style.visibility = "visible";
    filterWrapper.style.visibility = "visible";
  });
}

