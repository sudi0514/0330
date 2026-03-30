let topPoints = [];
let bottomPoints = [];
let polygon = [];

// 背景音樂與視覺化相關變數
let bgm;
let fft;
let bgShapes = [];

// 遊戲狀態：0=準備中, 1=遊戲進行中, 2=遊戲失敗, 3=遊戲成功
let gameState = 0; 

let startCircle = { x: 0, y: 0, r: 15 };
let endCircle = { x: 0, y: 0, r: 15 };

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // 初始化音樂視覺化分析器
  fft = new p5.FFT();
  
  // 將音樂載入移至 setup 非同步進行，避免網路慢時卡在 Loading 畫面
  // 並改用穩定的 CDN 網址避免 CORS 跨域阻擋問題
  bgm = loadSound('https://cdn.jsdelivr.net/gh/processing/p5.js-website@main/src/data/examples/assets/lucky_dragons_-_power_melody.mp3');

  // 產生背景漂浮圖案
  for (let i = 0; i < 40; i++) {
    bgShapes.push({
      x: random(windowWidth),
      y: random(windowHeight),
      size: random(10, 40),
      speedY: random(0.5, 2),
      c: color(random(50, 150), random(50, 200), random(200, 255), 100)
    });
  }

  generateLevel();
}

function draw() {
  background(30, 30, 40);

  // === 背景音樂節奏圖案 ===
  let spectrum = fft.analyze(); // 分析頻譜
  let bass = fft.getEnergy("bass"); // 取得低音能量 (0~255)
  let beatScale = map(bass, 0, 255, 1, 1.8); // 將低音能量轉換為圖案縮放比例
  
  noStroke();
  for (let s of bgShapes) {
    fill(s.c);
    s.y -= s.speedY; // 圖案向上漂浮
    if (s.y < -50) {
      s.y = height + 50; // 超出邊界後從下方重新出現
      s.x = random(width);
    }
    circle(s.x, s.y, s.size * beatScale); // 依據節奏縮放大小
  }

  // 1. 繪製電流急急棒的安全通道
  fill(150, 220, 255);
  stroke(0, 255, 255);
  strokeWeight(3);
  
  beginShape();
  for (let p of polygon) {
    vertex(p.x, p.y);
  }
  endShape(CLOSE);

  // 2. 繪製起點與終點
  noStroke();
  
  // 起點 (綠色)
  fill(0, 255, 100);
  circle(startCircle.x, startCircle.y, startCircle.r * 2);
  
  // 終點 (紅色)
  fill(255, 100, 100);
  circle(endCircle.x, endCircle.y, endCircle.r * 2);

  // 標籤文字
  fill(0);
  textSize(12);
  textAlign(CENTER, CENTER);
  text("起點", startCircle.x, startCircle.y);
  text("終點", endCircle.x, endCircle.y);

  // 3. 遊戲狀態邏輯與 UI 顯示
  if (gameState === 0) {
    fill(255);
    textSize(24);
    text("請點擊『起點』綠色圓圈開始遊戲", width / 2, 40);
  } 
  else if (gameState === 1) {
    fill(255);
    textSize(20);
    text("⚡ 遊戲進行中... 請小心移動到終點 ⚡", width / 2, 40);

    // 判斷滑鼠位置狀態
    let isInsidePath = pointInPolygon(mouseX, mouseY, polygon);
    let isInsideStart = dist(mouseX, mouseY, startCircle.x, startCircle.y) <= startCircle.r;
    let isInsideEnd = dist(mouseX, mouseY, endCircle.x, endCircle.y) <= endCircle.r;

    // 成功條件：到達終點範圍
    if (isInsideEnd) {
      gameState = 3;
    } 
    // 失敗條件：不在安全通道內，也不在起點圓圈的緩衝區內
    else if (!isInsidePath && !isInsideStart) {
      gameState = 2;
    }

    // 畫出滑鼠游標的提示點
    fill(255, 255, 0);
    circle(mouseX, mouseY, 8);
  } 
  else if (gameState === 2) {
    fill(255, 50, 50);
    textSize(36);
    text("💥 遊戲失敗！碰觸到邊界了 💥", width / 2, height / 2 - 20);
    textSize(20);
    fill(255);
    text("點擊畫面任意處重新產生關卡", width / 2, height / 2 + 30);
  } 
  else if (gameState === 3) {
    fill(50, 255, 50);
    textSize(36);
    text("🎉 遊戲成功！抵達終點 🎉", width / 2, height / 2 - 20);
    textSize(20);
    fill(255);
    text("點擊畫面任意處挑戰下一關", width / 2, height / 2 + 30);
  }
}

function mousePressed() {
  userStartAudio(); // 確保瀏覽器允許播放聲音
  if (bgm && bgm.isLoaded() && !bgm.isPlaying()) {
    bgm.setVolume(0.5);
    bgm.loop(); // 循環播放
  }

  if (gameState === 0) {
    // 檢查是否點擊在「起點」圓圈內
    let d = dist(mouseX, mouseY, startCircle.x, startCircle.y);
    if (d <= startCircle.r) {
      gameState = 1; // 遊戲開始
    }
  } else if (gameState === 2 || gameState === 3) {
    // 失敗或成功後，點擊畫面可重置關卡
    generateLevel();
    gameState = 0;
  }
}

// 產生隨機的電流急急棒路徑
function generateLevel() {
  topPoints = [];
  bottomPoints = [];
  polygon = [];
  
  // 建立 5 個上方頂點 (加上一點高低起伏的隨機性)
  let startX = windowWidth * 0.1; // 起點從畫面寬度的 10% 開始
  let gapX = (windowWidth * 0.8) / 4; // 剩餘 80% 寬度平均分配給 4 個區間
  for (let i = 0; i < 5; i++) {
    topPoints.push(createVector(startX + i * gapX, random(windowHeight * 0.2, windowHeight * 0.8)));
  }

  // 根據上方頂點，在相對下方 20 到 40 的距離產生對應的下方頂點
  for (let i = 0; i < topPoints.length; i++) {
    let pathWidth = random(20, 40); 
    bottomPoints.push(createVector(topPoints[i].x, topPoints[i].y + pathWidth));
  }

  // 將上下頂點依序合併為一個完整的封閉多邊形陣列
  // 上方：從左至右 (index: 0 到 4)
  for (let i = 0; i < topPoints.length; i++) {
    polygon.push(topPoints[i]);
  }
  // 下方：從右至左繞回來 (index: 4 到 0)
  for (let i = bottomPoints.length - 1; i >= 0; i--) {
    polygon.push(bottomPoints[i]);
  }

  // 設定起點和終點圓圈的位置（放在路徑的中間）
  startCircle.x = topPoints[0].x;
  startCircle.y = (topPoints[0].y + bottomPoints[0].y) / 2;
  
  endCircle.x = topPoints[topPoints.length - 1].x;
  endCircle.y = (topPoints[topPoints.length - 1].y + bottomPoints[bottomPoints.length - 1].y) / 2;
}

// 射線測試演算法：判斷一個點 (px, py) 是否在多邊形 (poly) 內部
function pointInPolygon(px, py, poly) {
  let isInside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    let xi = poly[i].x, yi = poly[i].y;
    let xj = poly[j].x, yj = poly[j].y;
    
    // 判斷射線是否與多邊形的邊相交
    let intersect = ((yi > py) !== (yj > py)) && 
                    (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) {
      isInside = !isInside; // 每次相交就切換內部/外部狀態
    }
  }
  return isInside;
}

// 當瀏覽器視窗大小改變時，自動調整畫布與重新生成關卡
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generateLevel();
  gameState = 0;
}
