let cam;
const cols = 80;
const rows = 60;
let spacing;
let camReady = false;
let originPos = [];
let currentPos = [];
let phase = [];
let displayColor = [];
let time = 0;

const noiseScale = 0.002;
const noiseTime = 0.002;
const flowSpeed = 9;
let mainDirection = 0;
const satThreshold = 60;
let randomizeNext = false;

// 摄像头降级标记
let fallbackDemoMode = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  spacing = min(width / cols, height / rows);

  cam = createCapture(VIDEO, { video: true, audio: false });
  cam.size(cols, rows);
  cam.hide();

  cam.elt.onerror = () => {
    fallbackDemoMode = true;
    camReady = true;
  };

  cam.onloadedmetadata = () => {
    camReady = true;
  };

  let index = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ox = x * spacing;
      const oy = y * spacing;
      originPos.push(createVector(ox, oy));
      currentPos.push(createVector(ox, oy));
      phase.push(random(1000));
      displayColor.push(color(0));
      index++;
    }
  }
  background(0);
}

function mouseReleased() {
  randomizeNext = true;
}

function draw() {
  if (!camReady) return;

  noStroke();
  fill(0, 25);
  rect(0, 0, width, height);

  push();
  translate(width / 2 - cols * spacing / 2, height / 2 - rows * spacing / 2);
  const returnEase = 0.2;

  cam.loadPixels();
  let highSatPoints = [];

  for (let i = 0; i < cols * rows; i++) {
    let r,g,b;
    if(fallbackDemoMode){
      r = noise(i*0.01,millis()*0.0001)*255;
      g = noise(i*0.01+200,millis()*0.0001)*255;
      b = noise(i*0.01+400,millis()*0.0001)*255;
    }else{
      r = cam.pixels[i * 4];
      g = cam.pixels[i * 4 + 1];
      b = cam.pixels[i * 4 + 2];
    }
    const c = color(r, g, b);
    const sat = saturation(c);
    if (sat > satThreshold) {
      highSatPoints.push(currentPos[i].copy());
    }
  }

  for (let i = 0; i < cols * rows; i++) {
    let r,g,b;
    if(fallbackDemoMode){
      r = noise(i*0.01,millis()*0.0001)*255;
      g = noise(i*0.01+200,millis()*0.0001)*255;
      b = noise(i*0.01+400,millis()*0.0001)*255;
    }else{
      r = cam.pixels[i * 4];
      g = cam.pixels[i * 4 + 1];
      b = cam.pixels[i * 4 + 2];
    }

    const c = color(r, g, b);
    const sat = saturation(c);
    const isHighSat = sat > satThreshold;

    if (mouseIsPressed && isHighSat) {
      currentPos[i].x = lerp(currentPos[i].x, originPos[i].x, returnEase);
      currentPos[i].y = lerp(currentPos[i].y, originPos[i].y, returnEase);
      displayColor[i] = c;
    } else if (randomizeNext) {
      currentPos[i].x = random(cols * spacing);
      currentPos[i].y = random(rows * spacing);
      displayColor[i] = color(255 - r, 255 - g, 255 - b);
    } else {
      const nx = currentPos[i].x * noiseScale;
      const ny = currentPos[i].y * noiseScale;
      const nt = time + phase[i];
      const n = noise(nx, ny, nt);
      const noiseAngle = map(n, 0, 1, -PI / 3, PI / 3);
      const angle = mainDirection + noiseAngle;
      const vx = cos(angle) * flowSpeed;
      const vy = sin(angle) * flowSpeed;
      currentPos[i].add(vx, vy);

      if (currentPos[i].x < 0) currentPos[i].x += cols * spacing;
      if (currentPos[i].x > cols * spacing) currentPos[i].x -= cols * spacing;
      if (currentPos[i].y < 0) currentPos[i].y += rows * spacing;
      if (currentPos[i].y > rows * spacing) currentPos[i].y -= rows * spacing;
    }

    const br = brightness(displayColor[i]);
    const s = map(br, 0, 255, 2, spacing);
    let drawColor = displayColor[i];

    if (mouseIsPressed && !isHighSat) {
      for (const hp of highSatPoints) {
        const dx = currentPos[i].x - hp.x;
        const dy = currentPos[i].y - hp.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < (spacing * 2) ** 2) {
          drawColor = color(red(drawColor), green(drawColor), blue(drawColor), 32);
          break;
        }
      }
    }
    fill(drawColor);
    ellipse(currentPos[i].x, currentPos[i].y, s, s);
  }

  if (!mouseIsPressed) {
    time += noiseTime;
    mainDirection += 0.0005;
    if (randomizeNext) randomizeNext = false;
  }
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
