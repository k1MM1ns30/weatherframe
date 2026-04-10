// 카메라 먼저 실행
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    const video = document.getElementById("camera");
    video.srcObject = stream;
  })
  .catch(err => {
    console.error("Camera error:", err);
  });

// 도시명 가져오기
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

// 위치 + 도시 + 날씨
navigator.geolocation.getCurrentPosition(
  async position => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    const city = await getCityName(lat, lon);

    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,cloud_cover,weather_code`)
      .then(res => res.json())
      .then(data => {
        const temp = data.current.temperature_2m;
        const humidity = data.current.relative_humidity_2m;
        const precipitation = data.current.precipitation;
        const wind = data.current.wind_speed_10m;
        const cloud = data.current.cloud_cover;
        const code = data.current.weather_code;

        document.getElementById("weather").innerHTML = `
          <p>Location: ${city}</p>
          <p>Temperature: ${temp}°C</p>
          <p>Humidity: ${humidity}%</p>
          <p>Precipitation: ${precipitation} mm</p>
          <p>Wind: ${wind} m/s</p>
        `;

        let bgColor = "white";

        // 비
        if (precipitation > 0 || (code >= 51 && code <= 67)) {
          bgColor = "#87CEFA";
        }
        // 맑음
        else if (cloud < 40) {
          bgColor = "#FFD700";
        }
        // 흐림
        else if (cloud > 60) {
          bgColor = "#A9A9A9";
        }
        // 중간 상태
        else {
          bgColor = "#D3D3D3";
        }

        // 바람
        if (wind > 8) {
          bgColor = "#B0E0E6";
        }

        // 더움
        if (temp > 30) {
          bgColor = "#FF6347";
        }

        document.body.style.backgroundColor = bgColor;

        const emojiBox = document.getElementById("weatherEmoji");
        let emoji = "☀️";

        // 순서: 맑음 → 비 → 흐림 → 바람 → 습함
        if (cloud < 40) {
          emoji = "☀️";
        }
        else if (precipitation > 0 || (code >= 51 && code <= 67)) {
          emoji = "🌧️";
        }
        else if (cloud > 60) {
          emoji = "🌫️";
        }
        else if (wind > 8) {
          emoji = "🌀";
        }
        else if (humidity > 80) {
          emoji = "💧";
        }

        emojiBox.textContent = emoji;
      })
      .catch(err => {
        console.error("Weather fetch error:", err);
        document.getElementById("weather").textContent = "Failed to load weather data";
      });
  },
  error => {
    console.error("Location error:", error);
    document.getElementById("weather").textContent = "Location access denied";
  }
);

// 캡처 버튼
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