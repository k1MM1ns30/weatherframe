const MOBILE_BREAKPOINT = 460;
const FORCE_MOBILE_CAMERA = true;
const MOBILE_CAMERA_ZOOM = 1;


const cityCoordinates = {
  "New York": { lat: 40.7128, lon: -74.0060, label: "New York" },
  "Tokyo": { lat: 35.6762, lon: 139.6503, label: "Tokyo" },
  "Seoul": { lat: 37.5665, lon: 126.9780, label: "Seoul" },
  "Okinawa": { lat: 26.2124, lon: 127.6809, label: "Okinawa" },
  "London": { lat: 51.5072, lon: -0.1276, label: "London" },
  "Sydney": { lat: -33.8688, lon: 151.2093, label: "Australia" }
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

const RAIN_BUFFER_MAX = 30;
let rainFrameBuffer = [];

let glitterParticles = [];

let sunnyEffectOn = false;
let sunnyStars = null;
let sunnyGraphics = null;

const snowPalette = [
  "#ffffff",
  "#f9fdff",
  "#e6f7ff",
  "#dff4ff",
  "#f0fbff"
];

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

  const cameraConstraints = FORCE_MOBILE_CAMERA
    ? {
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 16 / 9 },
          frameRate: { ideal: 30, max: 30 },
          resizeMode: "none"
        },
        audio: false
      }
    : {
        video: true,
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

  if (FORCE_MOBILE_CAMERA) {
    const zoomedSw = sw / MOBILE_CAMERA_ZOOM;
    const zoomedSh = sh / MOBILE_CAMERA_ZOOM;
    sx += (sw - zoomedSw) / 2;
    sy += (sh - zoomedSh) / 2;
    sw = zoomedSw;
    sh = zoomedSh;
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

  push();
  noStroke();

  for (let y = 0; y < height; y++) {
    const alpha = map(y, 0, height, 70, 16);
    fill(255, 255, 255, alpha);
    rect(0, y, width, 1);
  }

  pop();
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
      loadPixels();
      const sourcePixels = pixels.slice();

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const index = (x + y * width) * 4;

          let totalR = -2;
          let totalG = -2;
          let totalB = -2;
          let count = 0.5;

          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const i = ((x + dx) + (y + dy) * width) * 4;
              totalR += sourcePixels[i];
              totalG += sourcePixels[i + 1];
              totalB += sourcePixels[i + 2];
              count++;
            }
          }

          pixels[index] = min((totalR / count) * 1.3, 255);
          pixels[index + 1] = min((totalG / count) * 1.33, 255);
          pixels[index + 2] = min((totalB / count) * 1.45, 255);
          pixels[index + 3] = 255;
        }
      }

      updatePixels();
      drawCloudyWhiteOverlay();
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

    push();
    noStroke();
    fill(220, 235, 255, 38);
    rect(0, 0, width, height);
    pop();

    if (frameCount % 4 === 0) {
      glitterParticles.push(new FallingGlitter());
    }

    if (glitterParticles.length > 24) {
      glitterParticles.splice(0, glitterParticles.length - 24);
    }

    for (let i = glitterParticles.length - 1; i >= 0; i--) {
      glitterParticles[i].update();
      glitterParticles[i].display();

      if (glitterParticles[i].isOut()) {
        glitterParticles.splice(i, 1);
      }
    }
  } else {
    glitterParticles = [];
  }

  if (!rainEffectOn) {
    rainFrameBuffer = [];
  }

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
        fogEffectOn: false
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
        bgColor: "#FFD700",
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
  snowEffectOn = style.snowEffectOn;
  fogEffectOn = style.fogEffectOn;
  rainEffectOn = style.rainEffectOn ?? false;
  coldEffectOn = style.coldEffectOn ?? false;
  sunnyEffectOn = style.sunnyEffectOn ?? false;

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
// sunny: 2분할 별 마스크 효과
// =========================
function initSunny() {
  randomSeed(42);
  sunnyStars = [];
  const halfH = height / 2;
  const cols = 5;
  const rows = 5;
  const cellW = width / cols;
  const cellHTop = (halfH - 16) / rows;
  const cellHBot = (halfH - 16) / rows;

  // 상단: 5x5 그리드에 랜덤 오프셋
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      sunnyStars.push({
        x: col * cellW + random(cellW * 0.12, cellW * 0.88),
        y: 8 + row * cellHTop + random(cellHTop * 0.1, cellHTop * 0.9),
        r: random(7, 18)
      });
    }
  }

  // 하단: 5x5 그리드에 랜덤 오프셋
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      sunnyStars.push({
        x: col * cellW + random(cellW * 0.12, cellW * 0.88),
        y: halfH + 8 + row * cellHBot + random(cellHBot * 0.1, cellHBot * 0.9),
        r: random(7, 18)
      });
    }
  }

  // 민트 3개 (하단 인덱스: 26, 37, 43)
  sunnyStars[26].col = 'mint';
  sunnyStars[37].col = 'mint';
  sunnyStars[43].col = 'mint';
  // 고동색 2개 (하단 인덱스: 31, 47)
  sunnyStars[31].col = 'brown';
  sunnyStars[47].col = 'brown';
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

  // 각 절반(width × halfH) 기준으로 crop 계산
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
  if (FORCE_MOBILE_CAMERA) {
    const zSw = sw / MOBILE_CAMERA_ZOOM;
    const zSh = sh / MOBILE_CAMERA_ZOOM;
    sx += (sw - zSw) / 2; sy += (sh - zSh) / 2;
    sw = zSw; sh = zSh;
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

  // 상단: 흰 배경 + 별 clip 안에 카메라(상단 절반에 꽉 차게)
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

  // 하단: 카메라(하단 절반에 꽉 차게) + 별 도형
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
// cold: 엣지 감지 → 세로선 렌더링
// =========================
function drawColdFlowField() {
  drawCameraCover(cam);
  loadPixels();
  background(233, 238, 252);

  const step           = 5;   // 샘플 간격
  const edgeThreshold  = 105; // 엣지 감도
  const darkThreshold  = 310; // 어두운 영역 감도 (R+G+B 합, 낮을수록 더 넓게 잡힘)
  const t = frameCount * 0.016;

  noStroke();
  textAlign(CENTER, CENTER);

  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      const ci = (y * width + x) * 4;
      const ri = (y * width + (x + 1)) * 4;
      const li = (y * width + (x - 1)) * 4;
      const bi = ((y + 1) * width + x) * 4;
      const ti = ((y - 1) * width + x) * 4;

      const brightness = pixels[ci] + pixels[ci + 1] + pixels[ci + 2];

      const gx = (pixels[ri] + pixels[ri + 1] + pixels[ri + 2])
               - (pixels[li] + pixels[li + 1] + pixels[li + 2]);
      const gy = (pixels[bi] + pixels[bi + 1] + pixels[bi + 2])
               - (pixels[ti] + pixels[ti + 1] + pixels[ti + 2]);
      const g = abs(gx) + abs(gy);

      const isEdge = g > edgeThreshold;
      const isDarkArea = brightness < darkThreshold;

      if (isEdge || isDarkArea) {
        const no = x * 0.09 + y * 0.06;
        const nx = (noise(no,       t) - 0.5) * 5;
        const ny = (noise(no + 400, t) - 0.5) * 5;

        const isDark = noise(x * 0.025, y * 0.025) > 0.48;
        const sz     = noise(x * 0.035, y * 0.035) * 5 + 5;

        // 어두운 영역은 더 투명하게 (밝기에 따라 alpha 조절)
        const darkAlpha = isEdge ? 1.0 : map(brightness, 0, darkThreshold, 1.0, 0.35);

        const ch = '|';

        if (isDark) {
          fill(48, 44, 175, 200 * darkAlpha);
        } else {
          fill(130, 185, 245, 175 * darkAlpha);
        }

        textSize(sz);
        text(ch, x + nx, y + ny);
      }
    }
  }
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

class FallingGlitter {
  constructor() {
    this.x = random(width);
    this.y = random(-100, height * 0.3);

    this.vx = random(-0.15, 0.15);
    this.vy = random(1.2, 2.8);

    this.size = random(5, 10);

    this.color = color(random(snowPalette));

    this.alphaBase = random(200, 255);
    this.alpha = this.alphaBase;

    this.twinkleSpeed = random(0.02, 0.06);
    this.twinkleOffset = random(TWO_PI);

    this.shapeType = floor(random(3));

    this.seed = random(1000);
    this.tailLength = random(20, 46);

    this.clusterPoints = [];
    if (this.shapeType === 2) {
      let pointCount = floor(random(10, 15));
      for (let i = 0; i < pointCount; i++) {
        this.clusterPoints.push({
          ox: randomGaussian(0, this.size * 0.55),
          oy: randomGaussian(0, this.size * 0.55),
          r: random(0.8, 1.5)
        });
      }
    }
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.x += sin(frameCount * 0.025 + this.seed) * 0.06;

    this.alpha =
      this.alphaBase +
      sin(frameCount * this.twinkleSpeed + this.twinkleOffset) * 35;
  }

  display() {
    push();
    translate(this.x, this.y);

    const c = color(this.color);

    if (this.shapeType === 0) {
      drawingContext.shadowBlur = this.size * 1.2;
      drawingContext.shadowColor = `rgba(${red(c)}, ${green(c)}, ${blue(c)}, ${this.alpha / 255})`;

      stroke(red(c), green(c), blue(c), this.alpha);
      strokeWeight(1.1);

      line(-this.size * 0.9, 0, this.size * 0.9, 0);
      line(0, -this.size * 0.9, 0, this.size * 0.9);

      line(-this.size * 0.42, -this.size * 0.42, this.size * 0.42, this.size * 0.42);
      line(-this.size * 0.42, this.size * 0.42, this.size * 0.42, -this.size * 0.42);

      noStroke();
      fill(red(c), green(c), blue(c), this.alpha);
      circle(0, 0, this.size * 0.22);

    } else if (this.shapeType === 1) {
      drawingContext.shadowBlur = this.tailLength * 0.1;
      drawingContext.shadowColor = `rgba(${red(c)}, ${green(c)}, ${blue(c)}, ${this.alpha / 255})`;

      let segments = 4;
      for (let i = 0; i < segments; i++) {
        let t1 = i / segments;
        let t2 = (i + 1) / segments;

        let y1 = lerp(-this.tailLength, 0, t1);
        let y2 = lerp(-this.tailLength, 0, t2);

        let segAlpha = lerp(this.alpha * 0.12, this.alpha * 0.55, t2);
        let segWeight = lerp(0.25, 1.35, t2);

        stroke(red(c), green(c), blue(c), segAlpha);
        strokeWeight(segWeight);
        line(0, y1, 0, y2);
      }

      drawingContext.shadowBlur = this.size * 0.9;
      stroke(red(c), green(c), blue(c), this.alpha);
      strokeWeight(1);

      line(-this.size * 0.55, 0, this.size * 0.55, 0);
      line(0, -this.size * 0.55, 0, this.size * 0.55);

      noStroke();
      fill(red(c), green(c), blue(c), this.alpha);
      circle(0, 0, this.size * 0.16);

    } else if (this.shapeType === 2) {
      noStroke();

      for (let p of this.clusterPoints) {
        let localAlpha = this.alpha * 0.85;

        drawingContext.shadowBlur = p.r * 1.8;
        drawingContext.shadowColor = `rgba(${red(c)}, ${green(c)}, ${blue(c)}, ${localAlpha / 255})`;

        fill(red(c), green(c), blue(c), localAlpha);
        circle(p.ox, p.oy, p.r);
      }
    }

    pop();
    drawingContext.shadowBlur = 0;
  }

  isOut() {
    return this.y > height + this.tailLength + 20;
  }
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
// capture button
// =========================
const captureBtn = document.getElementById("captureBtn");

if (captureBtn) {
  captureBtn.addEventListener("click", async () => {
    const cityWrapper = document.querySelector(".city-wrapper");
    const filterWrapper = document.querySelector(".filter-wrapper");
    const captureButton = document.getElementById("captureBtn");

    // 저장할 때 제외
    cityWrapper.style.visibility = "hidden";
    filterWrapper.style.visibility = "hidden";
    captureButton.style.visibility = "hidden";

    const target = document.getElementById("captureArea");
    const bg = getComputedStyle(document.body).backgroundColor;

    const canvas = await html2canvas(target, {
      backgroundColor: bg,
      useCORS: true
    });

    const link = document.createElement("a");
    link.download = "weatherframe.png";
    link.href = canvas.toDataURL("image/png");
    link.click();

    // 다시 보이게
    cityWrapper.style.visibility = "visible";
    filterWrapper.style.visibility = "visible";
    captureButton.style.visibility = "visible";
  });
}