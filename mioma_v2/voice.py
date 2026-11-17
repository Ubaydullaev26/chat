"""Озвучка «5 мифов о миоме»: две подруги, нейроголос Microsoft Svetlana с разной высотой.

Запуск:  python3 voice.py            (нужно: pip install edge-tts numpy, ffmpeg, доступ к speech.platform.bing.com)
Выход:   voice.wav — дорожка голоса;  three/v2/mm/lines.json — реплики: кто, когда, текст, громкость для рта (30 к/с).
"""
import asyncio, json, os, subprocess, wave
import numpy as np
import edge_tts

SR, FPS = 44100, 30
VOICES = {  # кто: (голос, темп, высота)
    "dil": ("ru-RU-SvetlanaNeural", "+6%", "+14Hz"),
    "mad": ("ru-RU-SvetlanaNeural", "+2%", "-6Hz"),
}
# кто, эмоция, текст; миф/правда задают плашку на экране
LINES = [
    ("dil", "Мадина, у меня нашли миому… Это же рак?!", {"myth": 1}),
    ("mad", "Нет-нет! Миома — доброкачественный узел. Это не рак.", {"truth": 1}),
    ("dil", "Значит, матку удалят?", {"myth": 2}),
    ("mad", "Совсем не обязательно. Есть методы, которые сохраняют матку: например, Эма или удаление только узлов.", {"truth": 2}),
    ("dil", "А дети? С миомой ведь не забеременеть…", {"myth": 3}),
    ("mad", "Многие женщины с миомой беременеют и рожают. Всё зависит от размера и расположения узлов — это оценит врач.", {"truth": 3}),
    ("dil", "Соседка говорит, травы её растворят.", {"myth": 4}),
    ("mad", "Травы миому не растворяют. А время уходит, и узлы растут.", {"truth": 4}),
    ("dil", "Но у меня же ничего не болит…", {"myth": 5}),
    ("mad", "Миома часто растёт без симптомов. Поэтому УЗИ — раз в год.", {"truth": 5}),
    ("dil", "Всё, завтра же к врачу!", {}),
    ("mad", "Вот и правильно! Сохраните видео и отправьте подруге.", {"cta": 1}),
]
START, GAP_AFTER = 0.9, {"dil": 0.35, "mad": 0.6}
TAIL = 2.2

async def tts_once(text, who):
    v, rate, pitch = VOICES[who]
    c = edge_tts.Communicate(text, v, rate=rate, pitch=pitch, proxy=os.environ.get("HTTPS_PROXY"))
    data = b""
    async for ch in c.stream():
        if ch["type"] == "audio":
            data += ch["data"]
    return data

async def tts(text, who):
    for i in range(6):  # сервис иногда временно не отдаёт звук
        try:
            return await tts_once(text, who)
        except edge_tts.exceptions.NoAudioReceived:
            await asyncio.sleep(3 * (i + 1))
    raise RuntimeError("озвучка не ответила: " + text)

clips = []
for who, text, _ in LINES:
    mp3 = asyncio.run(tts(text, who))
    pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-f", "s16le", "-ac", "1", "-ar", str(SR), "pipe:1"],
                         input=mp3, capture_output=True, check=True).stdout
    x = np.frombuffer(pcm, "<i2").astype(np.float64) / 32768
    idx = np.where(np.abs(x) > 0.01)[0]
    x = x[max(0, idx[0] - int(.08 * SR)): idx[-1] + 2500]
    clips.append(x / (np.max(np.abs(x)) + 1e-9) * 0.95)

out_lines, t = [], START
for (who, text, extra), x in zip(LINES, clips):
    dur = len(x) / SR
    # громкость по кадрам (RMS окна 1/30 с), сжатая в 0…1 — для открытия рта
    hop = SR // FPS
    env = [float(np.sqrt(np.mean(x[i:i + hop] ** 2))) for i in range(0, len(x), hop)]
    m = max(env) or 1
    env = [round(min(1, (e / m) ** 0.7 * 1.15), 3) for e in env]
    out_lines.append({"who": who, "text": text, "start": round(t, 3), "end": round(t + dur, 3), "env": env, **extra})
    t += dur + GAP_AFTER[who]
total = round(t - GAP_AFTER[LINES[-1][0]] + TAIL, 3)

audio = np.zeros(int(SR * total) + 1)
for L, x in zip(out_lines, clips):
    i0 = int(L["start"] * SR); audio[i0:i0 + len(x)] += x[:len(audio) - i0]
with wave.open("voice.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes())
json.dump({"duration": total, "lines": out_lines}, open("three/v2/mm/lines.json", "w"), ensure_ascii=False)
json.dump({"end": total}, open("three/v2/mm/cues.json", "w"))
for L in out_lines:
    print(f'{L["start"]:6.2f}–{L["end"]:6.2f}  {L["who"]}: {L["text"]}')
print(f"Длительность: {total:.2f} с")
