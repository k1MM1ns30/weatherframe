const MOBILE_BREAKPOINT = 460;

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

let glitterParticles = [];

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

  cam = createCapture(
    {
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        aspectRatio: { ideal: 16 / 9 },
        frameRate: { ideal: 30, max: 30 },
        resizeMode: "none"
      },
      audio: false
    },
    () => {
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
    }
  );


  if (window.innerWidth > MOBILE_BREAKPOINT) {
    cam.size(640, 480);
  }

  cam.hide();
  pixelDensity(1);
}

function windowResized() {
  const { frameWidth, frameHeight } = getFrameSize();
  resizeCanvas(frameWidth, frameHeight);
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

  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  const zoomFactor = isMobile ? 1.18 : 1;

  if (zoomFactor > 1) {
    const zoomedSw = sw / zoomFactor;
    const zoomedSh = sh / zoomFactor;
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

  const blockSize = window.innerWidth <= MOBILE_BREAKPOINT ? 10 : 8;

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

  } else {
    drawCameraCover(cam);

    if (hotEffectOn) {
      loadPixels();
      const sourcePixels = pixels.slice();

      const waveAmount = window.innerWidth <= MOBILE_BREAKPOINT
      ? Math.round(width * 0.05)
      : Math.round(width * 0.06);


      for (let y = 0; y < height; y++) {
        const wave = map(
          noise(y * 0.005, frameCount * 0.01),
          0, 1,
          -waveAmount, waveAmount
        );

        for (let x = 0; x < width; x++) {
          const index = (x + y * width) * 4;

          let shiftedY = floor(y + wave);
          shiftedY = constrain(shiftedY, 0, height - 1);

          const shiftedIndex = (x + shiftedY * width) * 4;

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
    }
  }

  if (snowEffectOn) {
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
        fogEffectOn: false
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
        fogEffectOn: false
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
        fogEffectOn: false
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
