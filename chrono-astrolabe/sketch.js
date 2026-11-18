// noprotect

// === VERNACULAR ASYLUM // CHRONO-ASTROLABE : WEB RELEASE (1 / 6) ===
const vertSrc = `
attribute vec3 aPosition;
attribute vec2 aTexCoord;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
varying vec2 vTexCoord;
void main() {
  vTexCoord = aTexCoord;
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
}
`;

const fragSrc = `
precision mediump float;
varying vec2 vTexCoord;
uniform sampler2D tex0;
uniform float uTime, uBass, uShock, uGlitch, uMonolith, uKaleido, uEdge, uMirror, uQuant;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 uv = vTexCoord;

  if (uKaleido > 0.5) {
    vec2 p = uv - 0.5;
    float r = length(p), a = mod(atan(p.y, p.x), 1.0471975);
    a = abs(a - 0.5235987);
    uv = 0.5 + r * vec2(cos(a), sin(a));
  }

  vec2 c = uv * 2.0 - 1.0;
  c *= 1.0 + 0.04 * dot(c, c);
  uv = c * 0.5 + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.01, 0.01, 0.02, 1.0);
    return;
  }

  if (uShock > 0.0 && uShock < 1.5) {
    float d = distance(uv, vec2(0.5));
    uv += normalize(uv - 0.5 + 0.0001) * exp(-pow((d - uShock * 0.65) * 18.0, 2.0)) * 0.045 * (1.5 - uShock);
  }

  if (uGlitch > 0.1) {
    float blk = floor(uv.y * 28.0);
    float rnd = hash(vec2(blk, floor(uTime * 20.0)));
    if (rnd < 0.25 * uGlitch) uv.x += (hash(vec2(uTime, blk)) - 0.5) * 0.07 * uGlitch;
    if (rnd > 0.90 && uv.x > 0.4) uv.x = 0.4 + fract(uv.x * 0.1);
  }

  float sh = 0.001 + uBass * 0.003 + uGlitch * 0.012;
  vec2 dir = uv - 0.5;
  vec3 col = vec3(
    texture2D(tex0, uv + dir * sh).r,
    texture2D(tex0, uv).g,
    texture2D(tex0, uv - dir * sh).b
  );

  vec3 bloom = max(texture2D(tex0, uv + vec2(0.007, 0.0)).rgb - 0.5, 0.0) * 0.3
             + max(texture2D(tex0, uv - vec2(0.007, 0.0)).rgb - 0.5, 0.0) * 0.3
             + max(texture2D(tex0, uv + vec2(0.0, 0.007)).rgb - 0.5, 0.0) * 0.3
             + max(texture2D(tex0, uv - vec2(0.0, 0.007)).rgb - 0.5, 0.0) * 0.3;
  col += bloom * (0.65 + uBass * 0.6);

  vec2 delta = (uv - 0.5) * 0.04, rayUV = uv;
  for (int i = 0; i < 4; i++) {
    rayUV -= delta;
    col += max(texture2D(tex0, rayUV).rgb - 0.55, 0.0) * 0.09;
  }

  if (uEdge > 0.5) {
    vec3 cL = texture2D(tex0, uv - vec2(0.002, 0.0)).rgb, cR = texture2D(tex0, uv + vec2(0.002, 0.0)).rgb;
    vec3 cU = texture2D(tex0, uv - vec2(0.0, 0.002)).rgb, cD = texture2D(tex0, uv + vec2(0.0, 0.002)).rgb;
    col = mix(vec3(0.02, 0.04, 0.08), vec3(0.0, 1.0, 0.8), clamp(length(abs(cR - cL) + abs(cD - cU)) * 3.5, 0.0, 1.0));
  }
  if (uMirror > 0.5 && uv.x + uv.y > 1.0) col = 1.0 - col;
  if (uQuant > 0.5) col = floor((col + (hash(uv * 300.0) - 0.5) * 0.15) * 5.0) / 5.0;

  float plasma = noise(uv * 5.0 + vec2(uTime * 0.3, -uTime * 0.2));
  col += vec3(0.015, 0.045, 0.08) * plasma * (1.0 - clamp(length(col), 0.0, 1.0));
  if (uMonolith > 0.5) col *= 0.95 + 0.05 * sin(uv.y * 550.0);
  col += (hash(uv * 550.0 + fract(uTime)) - 0.5) * 0.04;
  col *= smoothstep(1.5, 0.42, length(c));

  gl_FragColor = vec4(col, 1.0);
}
`;

let rings = [], nodes = [], barcodes = [], matrixRain = [];
let floorTex, orbitTex, cyberShader;
let oscSine, oscClick, droneOsc, bassOsc, kickOsc, hatNoise, noiseGen, fft;
let audioStarted = false, artStyle = 1;
let boidMode = false, showMatrix = false, showTree = false, showTerrain = false;
let overdriveMode = false, zeroGravity = false, beatActive = false;
let fxKaleido = false, fxEdge = false, fxMirror = false, fxQuant = false;
let activeKeys = {};
let shockwaveTime = -10.0, glitchTimer = 0, terrainZ = 0, stepIdx = 0;
let cmdBuffer = "", cmdHistory = "TYPE 'help' + ENTER | KEYS [1-3]";
let camYaw = 0, camPitch = -0.28, camDist = 470;
let guiPanel, guiBpm, guiVisible = false;
let isSpeaking = false;
let beepPulses = [];

const scaleArch = [220, 261.63, 329.63, 392.00, 493.88, 587.33];
const scaleZen  = [146.83, 164.81, 220.00, 246.94, 293.66, 329.63];
const quineLines = [
  "system.dissolve(MONOPOLY); // 死角からの融解",
  "asylum.sync(FLESH, CRAFT, NODE); // 静寂の同期",
  "matrix.downgrade(SCENERY); // 支配の風景化",
  "local.resonate(NOISE, WILD); // 局所情報共鳴"
];

function setup() {
  pixelDensity(1);
  let cnv = createCanvas(800, 600, WEBGL);
  cnv.parent('canvas-wrapper');
  floorTex = createGraphics(512, 512);

  orbitTex = createGraphics(512, 40);
  orbitTex.clear();
  orbitTex.fill(112, 214, 255, 190);
  orbitTex.noStroke();
  orbitTex.textFont('monospace');
  orbitTex.textSize(14);
  orbitTex.textAlign(CENTER, CENTER);
  orbitTex.text("VERNACULAR_ASYLUM // 固有聖域 // DISSOLVE_THE_MATRIX // 支配の融解 // ", 256, 20);

  initMinimalGUI();
  initAudio();
  initArt();
  cyberShader = createShader(vertSrc, fragSrc);
}

function getPalette() {
  let isNight = (hour() >= 19 || hour() <= 5);
  if (artStyle === 2) {
    return { bg: color(5, 5, 7), line: color(245, 248, 252), sub: color(145, 150, 160), accent: color(255, 45, 45), isSerif: false };
  } else if (artStyle === 3) {
    return { bg: color(9, 12, 13), line: color(225, 222, 215), sub: color(110, 150, 140), accent: color(220, 80, 60), isSerif: true };
  }
  return isNight
    ? { bg: color(6, 8, 14), line: color(232, 238, 245), sub: color(112, 214, 255), accent: color(255, 59, 48), isSerif: false }
    : { bg: color(12, 16, 26), line: color(240, 245, 252), sub: color(95, 195, 245), accent: color(255, 75, 60), isSerif: false };
}

// === VERNACULAR ASYLUM // CHRONO-ASTROLABE : WEB RELEASE (2 / 6) ===
function initMinimalGUI() {
  guiPanel = createDiv('');
  guiPanel.parent('canvas-wrapper');
  guiPanel.position(width - 175, 12);
  guiPanel.style('background', 'rgba(8, 12, 22, 0.72)');
  guiPanel.style('border', '1px solid rgba(112, 214, 255, 0.35)');
  guiPanel.style('padding', '6px');
  guiPanel.style('color', '#e8eef5');
  guiPanel.style('font-family', 'monospace');
  guiPanel.style('font-size', '10px');
  guiPanel.style('z-index', '100');

  let toggleBtn = createButton('[ + CTRL PANEL ]').parent(guiPanel);
  toggleBtn.style('background', 'transparent').style('color', '#70d6ff').style('border', 'none').style('width', '100%').style('cursor', 'pointer').style('font-family', 'monospace').style('font-size', '10px');

  let controlsBox = createDiv('').parent(guiPanel);
  controlsBox.style('display', 'none');

  toggleBtn.mousePressed(() => {
    guiVisible = !guiVisible;
    controlsBox.style('display', guiVisible ? 'block' : 'none');
    toggleBtn.html(guiVisible ? '[ - HIDE PANEL ]' : '[ + CTRL PANEL ]');
  });

  createDiv('TEMPO (BPM)').parent(controlsBox).style('margin-top', '6px');
  guiBpm = createSlider(80, 180, 125, 1).parent(controlsBox).style('width', '155px');

  let beatBtn = createButton('[ TOGGLE BEAT ]').parent(controlsBox);
  beatBtn.style('margin-top', '6px').style('width', '100%').style('background', 'rgba(112,214,255,0.12)').style('color', '#e8eef5').style('border', '1px solid rgba(112,214,255,0.4)').style('cursor', 'pointer').style('font-size', '9px');
  beatBtn.mousePressed(() => {
    beatActive = !beatActive;
    cmdHistory = beatActive ? "DRUM SEQUENCER // ON" : "DRUM SEQUENCER // OFF";
  });

  let saveBtn = createButton('[ SAVE PNG (Shift+S) ]').parent(controlsBox);
  saveBtn.style('margin-top', '6px').style('width', '100%').style('background', 'rgba(255,59,48,0.15)').style('color', '#ff3b30').style('border', '1px solid rgba(255,59,48,0.5)').style('cursor', 'pointer').style('font-size', '9px');
  saveBtn.mousePressed(() => saveCanvas('vernacular_asylum_art', 'png'));
}

function initAudio() {
  droneOsc = new p5.Oscillator('sine');
  droneOsc.freq(55);
  droneOsc.amp(0);

  oscSine = new p5.Oscillator('sine');
  oscSine.amp(0);

  oscClick = new p5.Oscillator('triangle');
  oscClick.amp(0);

  bassOsc = new p5.Oscillator('triangle');
  bassOsc.amp(0);

  kickOsc = new p5.Oscillator('sine');
  kickOsc.amp(0);

  hatNoise = new p5.Noise('white');
  let highFilter = new p5.HighPass();
  hatNoise.disconnect();
  hatNoise.connect(highFilter);
  highFilter.freq(6000);
  hatNoise.amp(0);

  noiseGen = new p5.Noise('pink');
  let noiseFilter = new p5.BandPass();
  noiseGen.disconnect();
  noiseGen.connect(noiseFilter);
  noiseFilter.freq(900);
  noiseGen.amp(0);

  fft = new p5.FFT();
}

function playTone(osc, freq, amp, att, rel, panVal = 0) {
  if (!audioStarted) return;
  if (osc.pan) osc.pan(constrain(panVal, -1, 1));
  osc.freq(freq);
  osc.amp(amp, att);
  setTimeout(() => osc.amp(0, rel), att * 1000 + 15);

  let mappedTheta = constrain(map(freq, 150, 3200, PI - 0.35, 0.35), 0.25, PI - 0.25);
  let mappedPhi = map(constrain(panVal, -1, 1), -1, 1, -HALF_PI, HALF_PI) + random(-0.4, 0.4);

  beepPulses.push({
    theta: mappedTheta,
    phi: mappedPhi,
    freq: freq,
    life: 1.0,
    decay: map(rel, 0.03, 1.5, 0.08, 0.025),
    isHighBeep: freq > 1000,
    isClick: osc === oscClick
  });

  if (beepPulses.length > 10) beepPulses.shift();
}

function playDrumStep(step) {
  if (!audioStarted || !beatActive) return;
  if (step % 4 === 0) {
    kickOsc.freq(130);
    kickOsc.amp(0.18, 0.005);
    kickOsc.freq(42, 0.12);
    setTimeout(() => kickOsc.amp(0, 0.15), 25);
  }
  if (step % 4 === 2) {
    hatNoise.amp(0.04, 0.005);
    setTimeout(() => hatNoise.amp(0, 0.04), 10);
  }
}

let speakTimer = null;
function speakCyber(phrase) {
  if ('speechSynthesis' in window) {
    clearTimeout(speakTimer);
    speakTimer = setTimeout(() => {
      window.speechSynthesis.cancel();
      let u = new SpeechSynthesisUtterance(phrase);
      u.lang = 'en-US';
      u.pitch = 0.55;
      u.rate = 1.05;
      u.volume = 0.75;
      u.onstart = () => { isSpeaking = true; };
      u.onend = () => { isSpeaking = false; };
      u.onerror = () => { isSpeaking = false; };
      window.speechSynthesis.speak(u);
    }, 120);
  }
}

function initArt() {
  rings = []; nodes = []; barcodes = []; matrixRain = [];

  for (let i = 0; i < 6; i++) {
    rings.push({
      r: 65 + i * 24,
      rx: random(TWO_PI), ry: random(TWO_PI),
      targetRx: random(TWO_PI), targetRy: random(TWO_PI),
      weight: i === 2 ? 1.5 : 0.6,
      isAccent: i === 4
    });
  }

  const tags = [
    "01_ASYLUM // 聖域", "02_NODE // 結節", "03_BLIND // 死角",
    "04_ETHOS // 美徳", "05_GLITCH // 摂動", "06_YUGEN // 幽玄",
    "07_LOCAL // 局所", "08_WILD // 野生", "09_SYNC // 共鳴"
  ];
  for (let i = 0; i < 9; i++) {
    let x = random(-150, 150), y = random(-140, 110), z = random(-150, 150);
    nodes.push({
      x: x, y: y, z: z,
      tx: x, ty: y, tz: z,
      vx: random(-1.2, 1.2), vy: random(-1.2, 1.2), vz: random(-1.2, 1.2),
      tag: tags[i],
      isAccent: i === 0,
      cooldown: 0,
      gfx: createGraphics(210, 56)
    });
  }

  for (let i = 0; i < 36; i++) {
    barcodes.push({
      x: map(i, 0, 35, -260, 260),
      w: random(1, 5),
      h: random(20, 140),
      speed: random(0.02, 0.08),
      phase: random(TWO_PI)
    });
  }

  for (let i = 0; i < 90; i++) {
    matrixRain.push({
      x: random(-280, 280),
      y: random(-260, 150),
      z: random(-280, 280),
      speed: random(2.5, 5.5)
    });
  }
}

// === VERNACULAR ASYLUM // CHRONO-ASTROLABE : WEB RELEASE (3 / 6) ===
function draw() {
  let pal = getPalette();
  background(pal.bg);

  let bpm = guiBpm ? guiBpm.value() : 125;
  let framesPerStep = max(4, round(3600 / (bpm * 4)));
  if (audioStarted && beatActive && frameCount % framesPerStep === 0) {
    playDrumStep(stepIdx);
    let sc = artStyle === 3 ? scaleZen : scaleArch;
    let note = sc.at(stepIdx % sc.length) * 0.5;
    playTone(bassOsc, note, 0.07, 0.01, 0.14, sin(stepIdx * 0.5) * 0.4);
    stepIdx++;
  }

  if (!zeroGravity && !boidMode && frameCount % 90 === 0) {
    let n = random(nodes);
    n.tx = random(-160, 160);
    n.ty = random(-140, 110);
    n.tz = random(-160, 160);

    let r = random(rings);
    r.targetRx += random(-HALF_PI, HALF_PI);
    r.targetRy += random(-HALF_PI, HALF_PI);

    if (audioStarted) {
      let sc = artStyle === 3 ? scaleZen : scaleArch;
      let panPos = constrain(n.x / 180, -1, 1);
      if (artStyle === 2) {
        playTone(oscSine, random(1800, 3600), 0.04, 0.005, 0.18, panPos);
        playTone(oscClick, 120, 0.08, 0.002, 0.03, 0);
      } else {
        playTone(oscSine, random(sc), 0.06, 0.04, 0.8, panPos);
      }
    }
  }

  let spectrum = fft.analyze();
  let bassEnergy = (spectrum && spectrum.length > 4)
    ? (spectrum.slice(0, 4).reduce((a, b) => a + b, 0)) * 0.25
    : 0;
  let beatScale = map(bassEnergy, 0, 255, 1.0, 1.18);

  if (mouseIsPressed && !(mouseX > width - 180 && mouseY < 160)) {
    camYaw -= (mouseX - pmouseX) * 0.008;
    camPitch = constrain(camPitch + (mouseY - pmouseY) * 0.008, -1.3, 0.2);
  } else if (!zeroGravity) {
    camYaw += overdriveMode ? 0.008 : 0.0025;
  }

  let cx = sin(camYaw) * cos(camPitch) * camDist;
  let cy = sin(camPitch) * camDist;
  let cz = cos(camYaw) * cos(camPitch) * camDist;
  camera(cx, cy, cz, 0, 0, 0, 0, 1, 0);

  if (artStyle === 3) drawZenRipples(pal);
  else if (artStyle === 2) drawDataMonolith(pal);
  else drawArchAxis(pal);

  if (showTerrain) drawCyberTerrain(pal);
  if (showTree) drawFractalTrees(pal);
  if (showMatrix) drawMatrixRain(pal);

  drawAstrolabeCore(pal, beatScale, spectrum);

  let snap = get();

  if (shockwaveTime >= 0.0) {
    shockwaveTime += 0.032;
    if (shockwaveTime > 1.5) shockwaveTime = -10.0;
  }
  if (glitchTimer > 0) glitchTimer--;

  let glitchLvl = glitchTimer > 0 ? 0.85 : (overdriveMode ? 0.3 : 0.0);
  let isShift = !!activeKeys['Shift'];
  let kActive = (isShift && (activeKeys['k'] || activeKeys['K'])) || fxKaleido;
  let eActive = (isShift && (activeKeys['e'] || activeKeys['E'])) || fxEdge;
  let mActive = (isShift && (activeKeys['m'] || activeKeys['M'])) || fxMirror;
  let qActive = (isShift && (activeKeys['q'] || activeKeys['Q'])) || fxQuant;

  push();
  translate(0, 160, 0);
  rotateX(HALF_PI);

  shader(cyberShader);
  cyberShader.setUniform('tex0', snap);
  cyberShader.setUniform('uTime', millis() * 0.001);
  cyberShader.setUniform('uBass', bassEnergy / 255.0);
  cyberShader.setUniform('uShock', shockwaveTime);
  cyberShader.setUniform('uGlitch', glitchLvl);
  cyberShader.setUniform('uMonolith', artStyle === 2 ? 1.0 : 0.0);
  cyberShader.setUniform('uKaleido', kActive ? 1.0 : 0.0);
  cyberShader.setUniform('uEdge',    eActive ? 1.0 : 0.0);
  cyberShader.setUniform('uMirror',  mActive ? 1.0 : 0.0);
  cyberShader.setUniform('uQuant',   qActive ? 1.0 : 0.0);

  noStroke();
  rect(-250, -250, 500, 500);
  resetShader();
  pop();

  updateAndDraw3DNodes(pal);
  drawFloorTypography(pal, spectrum);
}

function drawFloorTypography(pal, spectrum) {
  floorTex.clear();
  floorTex.textFont(pal.isSerif ? 'serif' : 'monospace');

  floorTex.noFill();
  floorTex.stroke(red(pal.line), green(pal.line), blue(pal.line), 95);
  floorTex.strokeWeight(1.5);
  floorTex.rect(8, 8, 496, 496);

  floorTex.stroke(red(pal.sub), green(pal.sub), blue(pal.sub), 40);
  floorTex.strokeWeight(1);
  floorTex.line(256, 8, 256, 504);
  floorTex.line(8, 256, 504, 256);

  floorTex.noStroke();
  floorTex.textAlign(LEFT);
  floorTex.fill(red(pal.sub), green(pal.sub), blue(pal.sub), 150);
  floorTex.textSize(9.5);
  let qIdx = floor(frameCount / 30) % quineLines.length;
  floorTex.text(`SRC_EXEC // ${quineLines.at(qIdx)}`, 24, 28);

  floorTex.fill(pal.line);
  floorTex.textSize(16);
  floorTex.textStyle(BOLD);
  let title = artStyle === 1
    ? "01 // 固有聖域 VERNACULAR ASYLUM"
    : (artStyle === 2
      ? "02 // 死角観測 BLIND SPOT MATRIX"
      : "03 // 幽玄静寂 YUGEN SANCTUARY");
  floorTex.text(title, 24, 438);

  floorTex.textSize(10.5);
  floorTex.textStyle(NORMAL);
  floorTex.fill(pal.sub);
  let modeFlags = `${boidMode ? "BOIDS" : "EASE"} | ${beatActive ? "BEAT" : "SILENT"} | AUDIO:${audioStarted ? "ON" : "CLICK"}`;
  floorTex.text(`KEYS [1-3] | ${modeFlags}`, 24, 460);

  floorTex.fill(pal.accent);
  floorTex.text(`TERMINAL > ${cmdBuffer}_  [${cmdHistory}]`, 24, 484);

  floorTex.stroke(red(pal.line), green(pal.line), blue(pal.line), 175);
  floorTex.strokeWeight(1.2);
  floorTex.noFill();
  floorTex.beginShape();
  for (let i = 0; i < spectrum.length; i += 16) {
    let x = map(i, 0, spectrum.length - 1, 335, 488);
    let y = map(spectrum.at(i), 0, 255, 486, 438);
    floorTex.vertex(x, y);
  }
  floorTex.endShape();

  push();
  translate(0, 159.5, 0);
  rotateX(HALF_PI);
  noStroke();
  texture(floorTex);
  plane(500, 500);
  pop();
}

// === VERNACULAR ASYLUM // CHRONO-ASTROLABE : WEB RELEASE (4 / 6) ===
function drawArchAxis(pal) {
  push();
  stroke(red(pal.line), green(pal.line), blue(pal.line), 35);
  strokeWeight(0.6);
  line(-280, 0, 0, 280, 0, 0);
  line(0, -220, 0, 0, 220, 0);
  line(0, 0, -280, 0, 0, 280);
  for (let i = -240; i <= 240; i += 40) {
    line(i, -3, 0, i, 3, 0);
    line(0, -3, i, 0, 3, i);
  }
  pop();
}

function drawDataMonolith(pal) {
  push();
  translate(0, 0, -140);
  noStroke();
  for (let b of barcodes) {
    if (sin(frameCount * b.speed + b.phase) > 0.2) {
      fill(red(pal.line), green(pal.line), blue(pal.line), 170);
      rect(b.x, -b.h * 0.5, b.w, b.h);
    }
  }
  pop();
}

function drawZenRipples(pal) {
  push();
  translate(0, 155, 0);
  rotateX(HALF_PI);
  noFill();
  stroke(red(pal.sub), green(pal.sub), blue(pal.sub), 55);
  strokeWeight(0.7);
  for (let r = 40; r <= 260; r += 24) {
    beginShape();
    for (let a = 0; a <= TWO_PI + 0.1; a += 0.18) {
      let wave = sin(r * 0.05 - frameCount * 0.025 + cos(a * 3) * 0.5) * 7;
      vertex(cos(a) * r, sin(a) * r, wave);
    }
    endShape(CLOSE);
  }
  pop();
}

function drawCyberTerrain(pal) {
  terrainZ -= 0.035;
  push();
  translate(-300, 152, -300);
  rotateX(HALF_PI);
  noFill();
  stroke(red(pal.sub), green(pal.sub), blue(pal.sub), 35);
  strokeWeight(0.6);
  let scl = 60, cols = 10, rows = 10;
  for (let y = 0; y < rows; y++) {
    beginShape(TRIANGLE_STRIP);
    for (let x = 0; x <= cols; x++) {
      let h1 = map(noise(x * 0.28, y * 0.28 + terrainZ), 0, 1, -25, 35);
      let h2 = map(noise(x * 0.28, (y + 1) * 0.28 + terrainZ), 0, 1, -25, 35);
      vertex(x * scl, y * scl, h1);
      vertex(x * scl, (y + 1) * scl, h2);
    }
    endShape();
  }
  pop();
}

function drawFractalTrees(pal) {
  push();
  stroke(red(pal.line), green(pal.line), blue(pal.line), 65);
  strokeWeight(0.7);
  for (let c = 0; c < 4; c++) {
    push();
    rotateY(HALF_PI * c);
    translate(190, 155, 190);
    drawBranch(42, 3);
    pop();
  }
  pop();
}

function drawBranch(len, depth) {
  if (depth <= 0) return;
  line(0, 0, 0, 0, -len, 0);
  translate(0, -len, 0);
  let sway = sin(frameCount * 0.02 + depth) * 0.1;
  push(); rotateZ(0.45 + sway); rotateY(0.4); drawBranch(len * 0.72, depth - 1); pop();
  push(); rotateZ(-0.45 - sway); rotateY(-0.4); drawBranch(len * 0.72, depth - 1); pop();
}

function drawMatrixRain(pal) {
  push();
  stroke(red(pal.sub), green(pal.sub), blue(pal.sub), 110);
  strokeWeight(0.9);
  for (let r of matrixRain) {
    if (!zeroGravity) r.y += r.speed;
    if (r.y > 155) r.y = -260;
    line(r.x, r.y, r.z, r.x, r.y - 14, r.z);
  }
  pop();
}

function drawAstrolabeCore(pal, beatScale, spectrum) {
  push();
  scale(beatScale);

  push();
  if (!zeroGravity) rotateY(frameCount * 0.004);

  let baseR = 46;
  let latSteps = 10;
  let lonSteps = 14;
  let specLen = (spectrum && spectrum.length > 0) ? spectrum.length : 64;
  let voiceMod = isSpeaking ? (sin(frameCount * 0.45) * 0.5 + 0.5) * 14.0 : 0.0;

  stroke(red(pal.line), green(pal.line), blue(pal.line), isSpeaking ? 95 : 45);
  strokeWeight(0.55);
  noFill();

  let nodePositions = [];

  for (let i = 0; i <= latSteps; i++) {
    let theta = map(i, 0, latSteps, 0.15, PI - 0.15);
    beginShape();
    for (let j = 0; j <= lonSteps; j++) {
      let phi = map(j, 0, lonSteps, 0, TWO_PI);

      let freqBand = floor(map(i, 0, latSteps, 2, specLen * 0.65));
      let specIdx = (freqBand + j * 2) % specLen;
      let amp = (spectrum && spectrum.length > 0) ? spectrum.at(specIdx) / 255.0 : 0;

      let wave = sin(theta * 5 + phi * 3 + frameCount * 0.07) * 2.0;
      let voiceRipple = isSpeaking ? sin(theta * 8 - frameCount * 0.5) * voiceMod : 0;
      let r = baseR + amp * 34.0 + wave + voiceRipple;

      let vx = r * sin(theta) * cos(phi);
      let vy = r * cos(theta);
      let vz = r * sin(theta) * sin(phi);
      vertex(vx, vy, vz);

      if (j < lonSteps) {
        nodePositions.push({ x: vx, y: vy, z: vz, amp: amp, isHighFreq: i > latSteps * 0.5 });
      }
    }
    endShape(CLOSE);
  }

  for (let idx = 0; idx < nodePositions.length; idx++) {
    let np = nodePositions.at(idx);
    if (np.amp < 0.18 && !isSpeaking) continue;

    push();
    translate(np.x, np.y, np.z);

    let col;
    if (np.amp > 0.65 || (isSpeaking && idx % 3 === frameCount % 3)) {
      col = pal.accent;
    } else if (np.isHighFreq) {
      col = pal.line;
    } else {
      col = pal.sub;
    }

    stroke(col);
    strokeWeight(0.85);
    noFill();

    let pSize = map(np.amp, 0.18, 1.0, 2.0, 7.5) + (isSpeaking ? 1.5 : 0);

    if (isSpeaking && np.amp > 0.4) {
      rotateY(frameCount * 0.08);
      sphere(pSize * 0.65, 4, 2);
    } else if (np.isHighFreq && np.amp > 0.35) {
      rotateX(frameCount * 0.05);
      rotateY(frameCount * 0.05);
      box(pSize);
    } else {
      if (np.amp > 0.45) {
        sphere(pSize * 0.55, 6, 4);
      } else {
        strokeWeight(pSize * 0.7);
        point(0, 0, 0);
      }
    }
    pop();
  }
  pop();

  for (let r of rings) {
    if (!zeroGravity) {
      r.rx = lerp(r.rx, r.targetRx, 0.045);
      r.ry = lerp(r.ry, r.targetRy, 0.045);
    }
    push();
    rotateX(r.rx);
    rotateY(r.ry);
    let col = r.isAccent ? pal.accent : (r.weight > 1.0 ? pal.line : pal.sub);
    stroke(red(col), green(col), blue(col), r.isAccent ? 210 : 140);
    strokeWeight(r.weight);
    noFill();
    torus(r.r, 0.35, 24, 4);
    pop();
  }

  for (let b = beepPulses.length - 1; b >= 0; b--) {
    let bp = beepPulses.at(b);
    if (!zeroGravity) bp.life -= bp.decay;
    if (bp.life <= 0) {
      beepPulses.splice(b, 1);
      continue;
    }

    let spikeDist = baseR + sin(bp.life * PI) * (bp.isHighBeep ? 42.0 : 28.0);
    let bx = spikeDist * sin(bp.theta) * cos(bp.phi);
    let by = spikeDist * cos(bp.theta);
    let bz = spikeDist * sin(bp.theta) * sin(bp.phi);

    let bCol = bp.isClick ? pal.accent : (bp.isHighBeep ? pal.sub : pal.line);

    push();
    stroke(red(bCol), green(bCol), blue(bCol), bp.life * 220);
    strokeWeight(bp.isHighBeep ? 1.1 : 0.8);
    line(0, 0, 0, bx * 1.15, by * 1.15, bz * 1.15);

    translate(bx, by, bz);
    rotateY(bp.phi + frameCount * 0.1);
    rotateZ(bp.theta);
    noFill();
    stroke(bCol);
    strokeWeight(1.0);
    let coneSize = (bp.isHighBeep ? 5.5 : 4.2) * bp.life;
    cone(coneSize, coneSize * 2.2, 3, 1);
    pop();
  }

  push();
  rotateZ(0.22);
  if (!zeroGravity) rotateY(-frameCount * 0.01);
  noStroke();
  texture(orbitTex);
  cylinder(108, 16, 24, 1, false, false);
  pop();

  pop();
}

// === VERNACULAR ASYLUM // CHRONO-ASTROLABE : WEB RELEASE (5 / 6) ===
function updateAndDraw3DNodes(pal) {
  let gravityActive = !!activeKeys['Shift'] && !!(activeKeys['g'] || activeKeys['G']);

  for (let i = 0; i < nodes.length; i++) {
    let n = nodes.at(i);
    if (n.cooldown > 0) n.cooldown--;

    if (!zeroGravity) {
      if (boidMode) {
        let sepX = 0, sepY = 0, sepZ = 0, avgX = 0, avgY = 0, avgZ = 0, count = 0;
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          let o = nodes.at(j);
          let dx = n.x - o.x, dy = n.y - o.y, dz = n.z - o.z;
          let dSq = dx * dx + dy * dy + dz * dz;
          if (dSq < 2500 && dSq > 0) {
            let invD = 1.0 / sqrt(dSq);
            sepX += dx * invD; sepY += dy * invD; sepZ += dz * invD;
          }
          if (dSq < 32400) {
            avgX += o.x; avgY += o.y; avgZ += o.z;
            count++;
          }
        }
        if (count > 0) {
          let invC = 1.0 / count;
          n.vx += (avgX * invC - n.x) * 0.004 + sepX * 0.04;
          n.vy += (avgY * invC - n.y) * 0.004 + sepY * 0.04;
          n.vz += (avgZ * invC - n.z) * 0.004 + sepZ * 0.04;
        }
        if (gravityActive) {
          n.vx += -n.x * 0.008; n.vy += -n.y * 0.008; n.vz += -n.z * 0.008;
        }
        n.vx = constrain(n.vx * 0.99, -3.2, 3.2);
        n.vy = constrain(n.vy * 0.99, -3.2, 3.2);
        n.vz = constrain(n.vz * 0.99, -3.2, 3.2);
        n.x += n.vx; n.y += n.vy; n.z += n.vz;
        if (abs(n.x) > 180) n.vx *= -1;
        if (n.y < -160 || n.y > 125) n.vy *= -1;
        if (abs(n.z) > 180) n.vz *= -1;
      } else {
        if (gravityActive) {
          n.x = lerp(n.x, 0, 0.08);
          n.y = lerp(n.y, 0, 0.08);
          n.z = lerp(n.z, 0, 0.08);
        } else {
          n.x = lerp(n.x, n.tx, 0.045);
          n.y = lerp(n.y, n.ty, 0.045);
          n.z = lerp(n.z, n.tz, 0.045);
        }
      }
    }

    for (let j = i + 1; j < nodes.length; j++) {
      let o = nodes.at(j);
      let dx = n.x - o.x, dy = n.y - o.y, dz = n.z - o.z;
      let dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < 28900) {
        let d = sqrt(dSq);
        stroke(red(pal.line), green(pal.line), blue(pal.line), map(d, 0, 170, 95, 0));
        strokeWeight(0.6);
        line(n.x, n.y, n.z, o.x, o.y, o.z);

        let t = (frameCount * 0.025 + i * 0.2) % 1;
        push();
        translate(lerp(n.x, o.x, t), lerp(n.y, o.y, t), lerp(n.z, o.z, t));
        stroke(pal.accent); strokeWeight(2.5); point(0, 0, 0);
        pop();

        if (audioStarted && dSq < 2500 && n.cooldown === 0) {
          let sc = artStyle === 3 ? scaleZen : scaleArch;
          playTone(oscSine, random(sc) * 2, 0.05, 0.01, 0.3, constrain(n.x / 180, -1, 1));
          n.cooldown = 75;
        }
      }
    }

    let c = n.isAccent ? pal.accent : pal.line;

    push();
    translate(n.x, n.y, n.z);
    stroke(c);
    strokeWeight(0.9);
    noFill();
    box(8);

    rotateY(camYaw);
    rotateX(-camPitch);

    stroke(red(c), green(c), blue(c), 120);
    strokeWeight(0.7);
    line(4, -4, 0, 14, -14, 0);
    line(14, -14, 0, 74, -14, 0);

    if (frameCount % 6 === i % 6) {
      n.gfx.clear();
      n.gfx.textFont(pal.isSerif ? 'serif' : 'monospace');
      n.gfx.noStroke();
      n.gfx.textSize(16);
      n.gfx.fill(c);
      n.gfx.text(n.tag, 6, 20);
      n.gfx.textSize(13);
      n.gfx.fill(pal.sub);
      n.gfx.text(`${int(n.x)}.${int(n.y)}.${int(n.z)}`, 6, 40);
    }

    noStroke();
    texture(n.gfx);
    translate(46, -16, 1);
    plane(64, 18);
    pop();
  }
}

// === VERNACULAR ASYLUM // CHRONO-ASTROLABE : WEB RELEASE (6 / 6 - FINAL) ===
function mouseWheel(event) {
  let modal = document.getElementById('manual-modal');
  if (modal && !modal.classList.contains('hidden')) return true;
  camDist = constrain(camDist + event.delta * 0.3, 180, 880);
  return false;
}

function mousePressed() {
  let modal = document.getElementById('manual-modal');
  if (modal && !modal.classList.contains('hidden')) return;
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;
  if (mouseX > width - 180 && mouseY < 160) return;

  if (!audioStarted) {
    userStartAudio();
    droneOsc.start();
    droneOsc.amp(0.08, 1.5);
    oscSine.start();
    oscClick.start();
    bassOsc.start();
    kickOsc.start();
    hatNoise.start();
    noiseGen.start();
    audioStarted = true;
    speakCyber("VERNACULAR ASYLUM ONLINE");
  }

  noiseGen.amp(0.08, 0.02);
  setTimeout(() => noiseGen.amp(0, 0.25), 30);
  shockwaveTime = 0.0;
  initArt();
}

function keyPressed() {
  if (keyCode === BACKSPACE || keyCode === ENTER) return false;
}

window.addEventListener('keydown', function(e) {
  activeKeys[e.key] = true;

  if (e.key === 'Backspace') {
    cmdBuffer = cmdBuffer.slice(0, -1);
    return;
  }
  if (e.key === 'Enter') {
    executeMasterCommand(cmdBuffer.trim().toLowerCase());
    cmdBuffer = "";
    return;
  }
  if (e.shiftKey && (e.key === 'S' || e.key === 's')) {
    saveCanvas('vernacular_asylum_masterpiece', 'png');
    return;
  }
  if (cmdBuffer === "") {
    if (e.key === '1') { executeMasterCommand("asylum"); return; }
    if (e.key === '2') { executeMasterCommand("blind"); return; }
    if (e.key === '3') { executeMasterCommand("yugen"); return; }
  }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    cmdBuffer += e.key;
  }
});

window.addEventListener('keyup', function(e) {
  if ((e.key === 'G' || e.key === 'g') && activeKeys['Shift']) {
    for (let n of nodes) {
      n.vx = random(-5, 5);
      n.vy = random(-5, 5);
      n.vz = random(-5, 5);
      n.tx = random(-170, 170);
      n.ty = random(-150, 115);
      n.tz = random(-170, 170);
    }
    shockwaveTime = 0.0;
    glitchTimer = 30;
    cmdHistory = "SINGULARITY RELEASED // EXPANSION";
    speakCyber("GRAVITY RELEASED");
  }
  delete activeKeys[e.key];
  if (e.key === 'Shift') {
    activeKeys = {};
  }
});

function executeMasterCommand(cmd) {
  let sc = artStyle === 3 ? scaleZen : scaleArch;

  if (cmd === "help") {
    cmdHistory = "asylum,blind,yugen,matrix,tree,terrain,flock,beat,align,zero,pulse,glitch,kaleido,edge,mirror,quant,overdrive,dissolve,reset";
    speakCyber("COMMAND DIRECTORY");
  } else if (cmd === "asylum") {
    artStyle = 1; zeroGravity = false;
    cmdHistory = "STYLE: VERNACULAR ASYLUM";
    speakCyber("VERNACULAR ASYLUM");
  } else if (cmd === "blind") {
    artStyle = 2; zeroGravity = false;
    cmdHistory = "STYLE: BLIND SPOT MATRIX";
    speakCyber("BLIND SPOT MATRIX");
  } else if (cmd === "yugen") {
    artStyle = 3; zeroGravity = false;
    cmdHistory = "STYLE: YUGEN SANCTUARY";
    speakCyber("YUGEN SANCTUARY");
  } else if (cmd === "matrix") {
    showMatrix = !showMatrix;
    cmdHistory = showMatrix ? "LAYER: MATRIX RAIN ON" : "LAYER: MATRIX RAIN OFF";
    speakCyber(showMatrix ? "MATRIX RAIN ACTIVE" : "MATRIX OFF");
  } else if (cmd === "tree") {
    showTree = !showTree;
    cmdHistory = showTree ? "LAYER: FRACTAL TREES ON" : "LAYER: FRACTAL TREES OFF";
    speakCyber(showTree ? "FRACTAL GROWTH" : "TREES OFF");
  } else if (cmd === "terrain") {
    showTerrain = !showTerrain;
    cmdHistory = showTerrain ? "LAYER: CYBER TERRAIN ON" : "LAYER: CYBER TERRAIN OFF";
    speakCyber(showTerrain ? "TERRAIN GENERATED" : "TERRAIN OFF");
  } else if (cmd === "flock") {
    boidMode = !boidMode;
    cmdHistory = boidMode ? "PHYSICS: BOID SWARM" : "PHYSICS: EASING LERP";
    speakCyber(boidMode ? "SWARM INTELLIGENCE" : "EASING ALIGNMENT");
  } else if (cmd === "beat") {
    beatActive = !beatActive;
    cmdHistory = beatActive ? "AUDIO: TECHNO BEAT ON" : "AUDIO: AMBIENT ONLY";
    speakCyber(beatActive ? "SEQUENCER ENGAGED" : "SEQUENCER STOPPED");
  } else if (cmd === "kaleido") {
    fxKaleido = !fxKaleido;
    cmdHistory = fxKaleido ? "FX: KALEIDOSCOPE ON" : "FX: KALEIDOSCOPE OFF";
    speakCyber("KALEIDOSCOPE");
  } else if (cmd === "edge") {
    fxEdge = !fxEdge;
    cmdHistory = fxEdge ? "FX: EDGE DETECT ON" : "FX: EDGE DETECT OFF";
    speakCyber("EDGE DETECTION");
  } else if (cmd === "mirror") {
    fxMirror = !fxMirror;
    cmdHistory = fxMirror ? "FX: DIMENSION MIRROR ON" : "FX: DIMENSION MIRROR OFF";
    speakCyber("MIRROR DIMENSION");
  } else if (cmd === "quant") {
    fxQuant = !fxQuant;
    cmdHistory = fxQuant ? "FX: 8BIT QUANTIZE ON" : "FX: 8BIT QUANTIZE OFF";
    speakCyber("QUANTIZATION");
  } else if (cmd === "align") {
    zeroGravity = false; boidMode = false;
    for (let i = 0; i < nodes.length; i++) {
      let ang = (TWO_PI / nodes.length) * i;
      nodes.at(i).tx = cos(ang) * 145;
      nodes.at(i).ty = map(i, 0, nodes.length - 1, -90, 90);
      nodes.at(i).tz = sin(ang) * 145;
    }
    for (let i = 0; i < rings.length; i++) {
      rings.at(i).targetRx = (PI / 6) * i;
      rings.at(i).targetRy = 0;
    }
    if (audioStarted) {
      for (let i = 0; i < 4; i++) {
        setTimeout(() => playTone(oscSine, sc.at(i % sc.length) * 1.5, 0.06, 0.03, 1.3, map(i, 0, 3, -0.5, 0.5)), i * 80);
      }
    }
    cmdHistory = "FORMATION: SPIRAL ALIGNED";
    speakCyber("HARMONIC ALIGNMENT");
  } else if (cmd === "zero") {
    zeroGravity = !zeroGravity;
    if (zeroGravity) {
      for (let n of nodes) { n.tx = n.x; n.ty = n.y; n.tz = n.z; }
      for (let r of rings) { r.targetRx = r.rx; r.targetRy = r.ry; }
      if (audioStarted) playTone(oscSine, sc.at(0) * 0.5, 0.1, 0.2, 2.5, 0);
    } else {
      initArt();
    }
    cmdHistory = zeroGravity ? "TIME: SUSPENDED (ZERO-G)" : "TIME: RESTORED";
    speakCyber(zeroGravity ? "TEMPORAL SUSPENSION" : "TIME RESTORED");
  } else if (cmd === "pulse") {
    shockwaveTime = 0.0;
    for (let r of rings) { r.targetRx += PI * 0.75; r.targetRy += PI * 0.5; }
    for (let n of nodes) { n.x *= 1.45; n.y *= 1.45; n.z *= 1.45; }
    if (audioStarted) {
      playTone(oscSine, sc.at(0), 0.09, 0.02, 1.2, -0.4);
      setTimeout(() => playTone(oscSine, sc.at(2), 0.08, 0.02, 1.2, 0.4), 90);
      setTimeout(() => playTone(oscSine, sc.at(4), 0.07, 0.02, 1.4, 0.0), 180);
    }
    cmdHistory = "SHOCKWAVE PULSE EMITTED";
    speakCyber("SHOCKWAVE PULSE");
  } else if (cmd === "glitch") {
    glitchTimer = 55;
    for (let r of rings) { r.rx += random(-1.2, 1.2); r.ry += random(-1.2, 1.2); }
    for (let n of nodes) { n.x += random(-45, 45); n.y += random(-35, 35); n.z += random(-45, 45); }
    if (audioStarted) {
      noiseGen.amp(0.12, 0.01);
      setTimeout(() => noiseGen.amp(0, 0.25), 40);
      playTone(oscClick, 85, 0.14, 0.005, 0.2, -0.6);
      setTimeout(() => playTone(oscSine, 2450, 0.06, 0.005, 0.15, 0.6), 70);
    }
    cmdHistory = "WARNING // SIGNAL CORRUPTION";
    speakCyber("SIGNAL CORRUPTED");
  } else if (cmd === "overdrive") {
    overdriveMode = !overdriveMode;
    showMatrix = overdriveMode; showTree = overdriveMode; beatActive = overdriveMode; boidMode = overdriveMode;
    if (guiBpm) guiBpm.value(overdriveMode ? 175 : 125);
    shockwaveTime = 0.0;
    cmdHistory = overdriveMode ? "OVERDRIVE // ALL SYSTEMS MAX" : "OVERDRIVE // STANDBY";
    speakCyber(overdriveMode ? "OVERDRIVE ENGAGED" : "SYSTEM NORMALIZED");
  } else if (cmd === "dissolve") {
    cmdHistory = "死角からの融解 // DISSOLVE FROM BLIND SPOTS";
    speakCyber("We do not overthrow the machine. We dissolve its monopoly from within the blind spots.");
  } else if (cmd === "reset") {
    zeroGravity = false; overdriveMode = false; boidMode = false;
    showMatrix = false; showTree = false; showTerrain = false; beatActive = false;
    fxKaleido = false; fxEdge = false; fxMirror = false; fxQuant = false;
    if (guiBpm) guiBpm.value(125);
    initArt(); shockwaveTime = 0.0;
    cmdHistory = "SYSTEM RESET // GALLERY STATE";
    speakCyber("SYSTEM RESET");
  } else if (cmd !== "") {
    cmdHistory = `UNKNOWN CMD: ${cmd}`;
    speakCyber("ERROR");
  }
}
