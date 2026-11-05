"""Фоновая музыка + звуковые эффекты для ролика.
Запуск: python3 music.py            → music.wav (46 с, исходный тайминг)
        python3 music.py timeline.json → music.wav и mix.wav (музыка приглушается под голос из voice.wav)"""
import json, sys, wave
import numpy as np

TL = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else None
def A(t):
    """время анимации → реальное время ролика"""
    return float(np.interp(t, TL["anim"], TL["real"])) if TL else t

SR = 44100
DUR = TL["duration"] if TL else 46.0
N = int(SR * DUR)
rng = np.random.default_rng(3)
mix = np.zeros((N, 2))

def note_hz(name):
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    n, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[n] + 12 * (o + 1) - 69) / 12)

def add(sig, t0, gain=1.0, pan=0.0):
    i0 = int(t0 * SR)
    if i0 >= N:
        return
    sig = sig[: N - i0]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    mix[i0:i0 + len(sig), 0] += sig * gain * l
    mix[i0:i0 + len(sig), 1] += sig * gain * r

def pluck(f, dur=1.2):
    """Karplus–Strong: мягкая «гитарная/укулеле» нота."""
    n = int(SR * dur)
    p = int(SR / f)
    buf = rng.uniform(-1, 1, p)
    out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.996
    return out * np.linspace(1, 0.6, n)

def pad(freqs, dur):
    n = int(SR * dur)
    t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f * 1.003 * t) for f in freqs)
    env = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.6)
    return s * env / len(freqs)

def bass(f, dur):
    n = int(SR * dur)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2) * np.minimum(1, t / 0.01)

CH = {
    'Am': ['A3', 'C4', 'E4', 'A4'], 'F': ['F3', 'A3', 'C4', 'F4'], 'Dm': ['D3', 'F3', 'A3', 'D4'],
    'E': ['E3', 'G#3', 'B3', 'E4'], 'C': ['C4', 'E4', 'G4', 'C5'], 'G': ['G3', 'B3', 'D4', 'G4'],
}
BAR = 2.4  # 100 BPM, 4/4
prog = ['Am', 'F', 'Dm', 'E', 'Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'] + ['C', 'G', 'Am', 'F'] * 3
arp = [0, 2, 1, 3, 2, 1, 3, 2]  # индексы нот аккорда на восьмых

for b, ch in enumerate(prog):
    t0 = b * BAR
    if t0 >= DUR:
        break
    fr = [note_hz(n) for n in CH[ch]]
    bright = 1.0 if t0 >= A(25) else 0.75
    add(pad(fr, BAR + 0.3), t0, 0.07)
    add(bass(fr[0] / 2, BAR), t0, 0.22)
    for k, idx in enumerate(arp):
        f = fr[idx] * (2 if (t0 >= A(31) and k % 4 == 3) else 1)
        add(pluck(f, 1.0), t0 + k * BAR / 8, 0.16 * bright, pan=0.35 * (1 if k % 2 else -1))
    if t0 >= A(31):  # лёгкий ритм в позитивной части
        for k in range(4):
            n = int(SR * 0.12); tt = np.arange(n) / SR
            kick = np.sin(2 * np.pi * (110 * np.exp(-tt * 25) + 45) * tt) * np.exp(-tt * 18)
            add(kick, t0 + k * BAR / 4, 0.35)
            hat = rng.uniform(-1, 1, int(SR * 0.04)) * np.exp(-np.arange(int(SR * 0.04)) / SR * 90)
            add(hat, t0 + k * BAR / 4 + BAR / 8, 0.05)

# ---------- эффекты ----------
def pop(f0=600):
    n = int(SR * 0.18); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (f0 + 900 * np.exp(-t * 30)) * t) * np.exp(-t * 22)

def ding(f=1318.5):
    n = int(SR * 1.6); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 2.01 * t) + .2 * np.sin(2 * np.pi * f * 3 * t)) * np.exp(-t * 3)

def whoosh(dur=1.1):
    n = int(SR * dur); t = np.arange(n) / SR
    noise = rng.uniform(-1, 1, n)
    out = np.zeros(n); a = 0.0; y = 0.0
    for i in range(n):  # фильтр с нарастающей частотой
        a = 0.02 + 0.25 * (t[i] / dur)
        y += a * (noise[i] - y); out[i] = y
    return out * np.sin(np.pi * t / dur) ** 2 * 2.5

def boing(f=220):
    n = int(SR * 0.5); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * (1 + 0.5 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 6)) * t) * np.exp(-t * 7)

for i in range(5):
    add(pop(700 + i * 60), A(6.0 + i * 1.05), 0.35, pan=0.3)
for i in range(4):
    add(pop(650 + i * 80), A(32.0 + i * 0.6), 0.35, pan=-0.2)
for t0 in (0.3, 5.3, 13.2, 25.4, 31.4, 37.4, 41.0):
    add(pop(450), A(t0), 0.22)
add(whoosh(), A(11.8), 0.5)
for i, t0 in enumerate((14.6, 15.2, 15.8)):
    add(boing(200 + i * 40), A(t0), 0.35)
add(ding(), A(16.9), 0.28)
add(ding(1046.5), A(20.6), 0.22)
add(ding(1568), A(29.0), 0.22)
for k, f in enumerate((1046.5, 1318.5, 1568, 2093)):
    add(ding(f), A(37.4) + k * 0.12, 0.16)
add(ding(1318.5), A(42.4), 0.22)

# мастер: фейды, нормализация
def write(name, x):
    with wave.open(name, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())

t = np.arange(N) / SR
fade = (np.minimum(1, t / 0.3) * np.clip((DUR - t) / 2.5, 0, 1))[:, None]
music = np.tanh(mix * fade * 1.2)
music /= np.max(np.abs(music)) / 0.89
write('music.wav', music)
print('music.wav готов')

if TL:
    with wave.open('voice.wav') as w:
        v = np.frombuffer(w.readframes(w.getnframes()), '<i2') / 32768
    v = np.pad(v, (0, max(0, N - len(v))))[:N]
    # огибающая голоса → приглушение музыки до 30% во время речи
    on = np.zeros(N)
    for a, b in TL["voice"]:
        on[int(a * SR):int(b * SR)] = 1
    k = int(0.25 * SR); ker = np.ones(k) / k
    duck = 1 - 0.7 * np.clip(np.convolve(on, ker, 'same') * 1.5, 0, 1)
    out = music * 0.55 * duck[:, None] + v[:, None] * 0.9
    out /= np.max(np.abs(out)) / 0.95
    write('mix.wav', out)
    print('mix.wav готов')
