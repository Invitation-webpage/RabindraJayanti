const pages = Array.from(document.querySelectorAll(".page"));
const tabs = Array.from(document.querySelectorAll(".tab"));
const prevButton = document.getElementById("prevPage");
const nextButton = document.getElementById("nextPage");
let currentPage = 0;
let audioContext;
let musicNodes;
let musicRequested = false;

function showPage(index) {
  currentPage = (index + pages.length) % pages.length;
  window.scrollTo(0, 0);

  pages.forEach((page, pageIndex) => {
    page.classList.toggle("before", pageIndex < currentPage);
    page.classList.toggle("after", pageIndex > currentPage);
    page.classList.toggle("active", pageIndex === currentPage);
  });

  tabs.forEach((tab) => {
    tab.classList.toggle("active", Number(tab.dataset.target) === currentPage);
  });
}

prevButton.addEventListener("click", () => showPage(currentPage - 1));
nextButton.addEventListener("click", () => showPage(currentPage + 1));

tabs.forEach((tab) => {
  tab.addEventListener("click", () => showPage(Number(tab.dataset.target)));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") showPage(currentPage - 1);
  if (event.key === "ArrowRight") showPage(currentPage + 1);
  if (event.key === "ArrowUp") showPage(currentPage - 1);
  if (event.key === "ArrowDown") showPage(currentPage + 1);
});

function startAmbientMusic() {
  if (audioContext) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const master = audioContext.createGain();
  master.gain.value = 0.65;
  master.connect(audioContext.destination);

  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 24;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.006;
  compressor.release.value = 0.18;
  compressor.connect(master);

  const delay = audioContext.createDelay();
  delay.delayTime.value = 0.28;
  const delayGain = audioContext.createGain();
  delayGain.gain.value = 0.32;
  delay.connect(delayGain);
  delayGain.connect(compressor);
  delayGain.connect(delay);

  const melody = [
    [392, 0.42], [440, 0.42], [493.88, 0.84], [440, 0.42],
    [392, 0.42], [329.63, 0.84], [349.23, 0.42], [392, 1.05],
    [493.88, 0.42], [523.25, 0.42], [587.33, 0.84], [523.25, 0.42],
    [493.88, 0.42], [440, 0.84], [392, 0.42], [329.63, 1.05],
    [392, 0.42], [493.88, 0.42], [440, 0.84], [392, 0.42],
    [349.23, 0.42], [329.63, 0.84], [293.66, 0.42], [329.63, 1.25]
  ];
  let noteIndex = 0;
  function playTone(frequency, duration, level = 0.34) {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const shimmer = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const tone = audioContext.createBiquadFilter();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    shimmer.type = "triangle";
    shimmer.frequency.value = frequency * 2;
    tone.type = "lowpass";
    tone.frequency.value = 1800;
    tone.Q.value = 0.52;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.055);
    gain.gain.setTargetAtTime(0.0001, now + duration, 0.22);
    oscillator.connect(tone);
    shimmer.connect(tone);
    tone.connect(gain);
    gain.connect(compressor);
    gain.connect(delay);
    oscillator.start(now);
    shimmer.start(now);
    oscillator.stop(now + duration + 0.7);
    shimmer.stop(now + duration + 0.7);
  }

  const bass = audioContext.createOscillator();
  const bassGain = audioContext.createGain();
  bass.type = "triangle";
  bass.frequency.value = 130.81;
  bassGain.gain.value = 0.18;
  bass.connect(bassGain);
  bassGain.connect(compressor);
  bass.start();

  function scheduleNextNote() {
    const [frequency, duration] = melody[noteIndex % melody.length];
    playTone(frequency, duration);
    if (noteIndex % 4 === 0) playTone(196, duration * 1.8, 0.14);
    noteIndex += 1;
    const wait = Math.max(260, duration * 720);
    musicNodes.melodyTimer = window.setTimeout(scheduleNextNote, wait);
  }

  musicNodes = { master, bass, melodyTimer: undefined };
  scheduleNextNote();
}

function stopAmbientMusic() {
  if (!audioContext || !musicNodes) return;
  musicNodes.master.gain.setTargetAtTime(0, audioContext.currentTime, 0.04);
  window.setTimeout(() => {
    window.clearTimeout(musicNodes.melodyTimer);
    musicNodes.bass.stop();
    audioContext.close();
    audioContext = undefined;
    musicNodes = undefined;
  }, 180);
}

function requestAmbientMusic() {
  if (musicRequested) return;
  musicRequested = true;
  try {
    startAmbientMusic();
  } catch (error) {
    musicRequested = false;
  }
}

document.addEventListener("pointerdown", requestAmbientMusic, { once: true });
document.addEventListener("keydown", requestAmbientMusic, { once: true });

showPage(0);
