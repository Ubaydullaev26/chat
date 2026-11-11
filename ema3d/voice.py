"""Озвучка ролика «Мадина и ЭМА» + тайминг анимации под голос.

Запуск:  python3 voice.py [голос=ru-RU-SvetlanaNeural] [темп=+0%]
Нужно:   pip install edge-tts numpy, ffmpeg, доступ к speech.platform.bing.com
Выход:   voice.wav, timeline.json (как растянуть анимацию), voice_timing.txt
"""
import asyncio, json, os, subprocess, sys, wave
import numpy as np
import edge_tts

VOICE = sys.argv[1] if len(sys.argv) > 1 else "ru-RU-SvetlanaNeural"
RATE = sys.argv[2] if len(sys.argv) > 2 else "+0%"
SR = 44100
# начало сцены во «времени анимации» (scene.js), сдвиг фразы, текст
SCENES = [
    (0.0,  0.45, "Мадине поставили диагноз — миома. Она очень боялась операции и не хотела терять матку."),
    (5.5,  0.45, "Узлы миомы растут, потому что получают кровь через маточные артерии."),
    (11.5, 0.45, "Но есть метод без разрезов — эмболизация маточных артерий, или Эма. Врач вводит тонкий катетер через маленький прокол на руке или бедре."),
    (18.5, 0.45, "Через катетер вводят микрочастицы. Они перекрывают только те сосуды, которые питают узлы."),
    (27.5, 0.45, "Без питания узлы постепенно уменьшаются, а матка сохраняется."),
    (35.0, 0.45, "Процедура длится около часа, а выписка — уже через день-два. Эма помогает и при аденомиозе."),
    (45.0, 0.45, "Подходит ли вам Эма, решит врач после обследования. Сохраните видео и отправьте подруге!"),
]
ANIM_END, GAP, TAIL = 56.0, 0.5, 1.8

async def tts_once(text):
    c = edge_tts.Communicate(text, VOICE, rate=RATE, proxy=os.environ.get("HTTPS_PROXY"))
    data = b""
    async for ch in c.stream():
        if ch["type"] == "audio":
            data += ch["data"]
    return data

async def tts(text, tries=5):
    for i in range(tries):  # сервис иногда временно не отдаёт звук — повторяем
        try:
            return await tts_once(text)
        except edge_tts.exceptions.NoAudioReceived:
            await asyncio.sleep(3 * (i + 1))
    raise RuntimeError("Сервис озвучки не ответил: " + text)

clips = []
for _, _, text in SCENES:
    mp3 = asyncio.run(tts(text))
    pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-f", "s16le", "-ac", "1", "-ar", str(SR), "pipe:1"],
                         input=mp3, capture_output=True, check=True).stdout
    x = np.frombuffer(pcm, "<i2").astype(np.float64) / 32768
    idx = np.where(np.abs(x) > 0.01)[0]
    x = x[max(0, idx[0] - int(.08 * SR)): idx[-1] + 3000]
    clips.append(x / (np.max(np.abs(x)) + 1e-9))

anim, real, starts, r = [0.0], [0.0], [], 0.0
for k, (a0, off, _) in enumerate(SCENES):
    a1 = SCENES[k + 1][0] if k + 1 < len(SCENES) else ANIM_END
    length = max(a1 - a0, off + len(clips[k]) / SR + (TAIL if k + 1 == len(SCENES) else GAP))
    starts.append(r + off); r += length; anim.append(a1); real.append(r)

out = np.zeros(int(SR * r) + 1)
for k, x in enumerate(clips):
    i0 = int(starts[k] * SR); out[i0:i0 + len(x)] += x[:len(out) - i0]
out = np.tanh(out * 1.2) / np.tanh(1.2); out *= .95 / np.max(np.abs(out))
with wave.open("voice.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype("<i2").tobytes())
json.dump({"anim": anim, "real": real, "duration": r, "voice": [[s, s + len(x) / SR] for s, x in zip(starts, clips)]},
          open("timeline.json", "w"), indent=1)
log = [f"{s:6.2f} – {s + len(x) / SR:6.2f} с  {SCENES[k][2]}" for k, (s, x) in enumerate(zip(starts, clips))]
open("voice_timing.txt", "w").write("\n".join(log) + f"\nИтого: {r:.2f} с\n")
print("\n".join(log)); print(f"Длительность ролика: {r:.2f} с")
