const cityCoordinates = {
  "New York": { lat: 40.7128, lon: -74.0060, label: "New York" },
  "Tokyo": { lat: 35.6762, lon: 139.6503, label: "Tokyo" },
  "Seoul": { lat: 37.5665, lon: 126.9780, label: "Seoul" },
  "Okinawa": { lat: 26.2124, lon: 127.6809, label: "Okinawa" },
  "London": { lat: 51.5072, lon: -0.1276, label: "London" },
  "Sydney": { lat: -33.8688, lon: 151.2093, label: "Australia" }
};

// =========================
// p5 camera + sunny shimmer
// =========================
let cam;
let sunnyEffectOn = false;

function setup() {
  const canvas = createCanvas(320, 420);
  canvas.parent("p5-container");

  cam = createCapture(VIDEO);
  cam.size(640, 480);
  cam.hide();

  pixelDensity(1);
}

function drawCameraCover(videoSource) {
  const srcW = videoSource.width;
  const srcH = videoSource.height;
  const destW = width;
  const destH = height;

  const srcRatio = srcW / srcH;
  const destRatio = destW / destH;

  let sx, sy, sw, sh;

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

function draw() {
  if (!cam) return;

  drawCameraCover(cam);

  if (sunnyEffectOn) {
    loadPixels();

    const sourcePixels = pixels.slice();

    for (let y = 0; y < height; y++) {
      const wave = map(
        noise(y * 0.005, frameCount * 0.01),
        0, 1,
        -20, 20
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

// =========================
// weather UI
// =========================
function updateWeatherUI(data, cityLabel) {
  const temp = data.current.temperature_2m;
  const humidity = data.current.relative_humidity_2m;
  const precipitation = data.current.precipitation;
  const wind = data.current.wind_speed_10m;
  const cloud = data.current.cloud_cover;
  const code = data.current.weather_code;

  document.getElementById("weather").innerHTML = `
    <p>Location: ${cityLabel}</p>
    <p>Temperature: ${temp}°C</p>
    <p>Humidity: ${humidity}%</p>
    <p>Precipitation: ${precipitation} mm</p>
    <p>Wind: ${wind} m/s</p>
  `;

  let bgColor = "white";

  // 1️⃣ 기본 날씨 상태 먼저
  if (precipitation > 0 || (code >= 51 && code <= 67)) {
    bgColor = "#87CEFA"; // 비
  } else if (cloud < 40) {
    bgColor = "#FFD700"; // 맑음
  } else if (cloud > 60) {
    bgColor = "#A9A9A9"; // 흐림
  } else {
    bgColor = "#D3D3D3"; // 중간
  }
  


  // 2️⃣ 온도 (더움) → 덮어쓰기 (최우선)
  if (temp > 30) {
    bgColor = "#ff6863";
  }
  

   if (wind > 30) {
    bgColor = "#B0E0E6";
  }


  document.body.style.backgroundColor = bgColor;

  const emojiBox = document.getElementById("weatherEmoji");
  let emoji = "☀️";

  if (cloud < 40) {
    emoji = "☀️";
  } else if (precipitation > 0 || (code >= 51 && code <= 67)) {
    emoji = "🌧️";
  } else if (cloud > 60) {
    emoji = "🌫️";
  } else if (wind > 30) {
    emoji = "🌀";
  } else if (humidity > 80) {
    emoji = "💧";
  }

  emojiBox.textContent = emoji;

  // 맑은 날에만 아지랑이 효과 on
  sunnyEffectOn = (cloud < 40) && !(precipitation > 0 || (code >= 51 && code <= 67));
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
navigator.geolocation.getCurrentPosition(
  async position => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    const city = await getCityName(lat, lon);
    loadWeather(lat, lon, city);
  },
  error => {
    console.error("Location error:", error);
    document.getElementById("weather").textContent = "Location access denied";
  }
);

// =========================
// city button clicks
// =========================
const cityButtons = document.querySelectorAll(".city-btn");

cityButtons.forEach(button => {
  button.addEventListener("click", () => {
    const cityName = button.dataset.city;
    const cityData = cityCoordinates[cityName];

    if (cityData) {
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
// capture button
// =========================
const captureBtn = document.getElementById("captureBtn");

if (captureBtn) {
  captureBtn.addEventListener("click", async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
        preferCurrentTab: true
      });

      const screenVideo = document.createElement("video");
      screenVideo.srcObject = stream;
      screenVideo.muted = true;
      screenVideo.playsInline = true;

      await screenVideo.play();

      await new Promise(resolve => {
        if (screenVideo.readyState >= 2) {
          resolve();
        } else {
          screenVideo.onloadedmetadata = () => resolve();
        }
      });

      const canvas = document.createElement("canvas");
      canvas.width = screenVideo.videoWidth;
      canvas.height = screenVideo.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

      const link = document.createElement("a");
      link.download = "weatherframe.png";
      link.href = canvas.toDataURL("image/png");
      link.click();

      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error("Screen capture error:", err);
    }
  });
}