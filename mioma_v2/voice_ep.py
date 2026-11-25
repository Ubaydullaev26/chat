"""Озвучка «Матку — удалять? Покажу, как проходит ЭМА»: две подруги, нейроголос Microsoft Svetlana с разной высотой.

Запуск:  python3 voice.py            (нужно: pip install edge-tts numpy, ffmpeg, доступ к speech.platform.bing.com)
         LANG_CODE=uz python3 voice.py   — узбекская версия: voice_uz.wav, lines_uz.json, cues_uz.json
Выход:   voice_ep.wav — дорожка голоса;  three/v2/ep/lines.json — реплики: кто, когда, текст, громкость для рта (30 к/с).
"""
import asyncio, json, os, subprocess, wave
import numpy as np
import edge_tts

SR, FPS = 44100, 30
VOICES = {  # кто: (голос, темп, высота)
    "dil": ("ru-RU-SvetlanaNeural", "+6%", "+14Hz"),
    "mad": ("ru-RU-SvetlanaNeural", "+2%", "-6Hz"),
}
# кто, текст, пометки для экрана
LINES = [
    ("mad", "Мне тридцать восемь… а врач говорит: матку удалять.", {}),
    ("dil", "Стоп! Ты про эмболизацию слышала?", {}),
    ("mad", "Это что ещё?", {}),
    ("dil", "Смотри, сейчас покажу.", {}),
    ("dil", "Узлы миомы растут, потому что их питают маточные артерии.", {"shot": "uterus"}),
    ("dil", "Врач делает маленький прокол на руке и проводит тонкий катетер до самой матки. Без разреза, под местной анестезией.", {"shot": "xray"}),
    ("dil", "Через катетер вводят микрочастицы. Они перекрывают только те сосуды, которые питают узлы.", {"shot": "tunnel"}),
    ("dil", "Без питания узлы уменьшаются, а матка сохраняется.", {"shot": "shrink"}),
    ("dil", "Процедура длится около часа, а домой — уже через день-два.", {"shot": "facts"}),
    ("mad", "А почему мне об этом никто не сказал?!", {}),
    ("dil", "Это делает интервенционный хирург. Подходит не всем — но спросить точно стоит. Пиши в комментариях, расскажем подробнее!", {}),
]
LANG = os.environ.get("LANG_CODE", "ru")
SUF = "" if LANG == "ru" else "_" + LANG
if LANG == "uz":
    VOICES = {"dil": ("uz-UZ-MadinaNeural", "+4%", "+14Hz"), "mad": ("uz-UZ-MadinaNeural", "+0%", "-6Hz")}
    LINES = [
        ("mad", "Men o‘ttiz sakkiz yoshdaman… shifokor esa bachadonni olib tashlash kerak, deyapti.", {}),
        ("dil", "To‘xta! Embolizatsiya haqida eshitganmisan?", {}),
        ("mad", "Bu nima o‘zi?", {}),
        ("dil", "Qara, hozir ko‘rsataman.", {}),
        ("dil", "Mioma tugunlari o‘sadi, chunki ularni bachadon arteriyalari oziqlantiradi.", {"shot": "uterus"}),
        ("dil", "Shifokor qo‘lda kichik teshik ochadi va ingichka kateterni bachadongacha olib boradi. Kesiksiz, mahalliy og‘riqsizlantirish bilan.", {"shot": "xray"}),
        ("dil", "Kateter orqali mikrozarrachalar yuboriladi. Ular faqat tugunlarni oziqlantiradigan tomirlarni berkitadi.", {"shot": "tunnel"}),
        ("dil", "Oziqlanmagan tugunlar kichrayadi, bachadon esa saqlanib qoladi.", {"shot": "shrink"}),
        ("dil", "Muolaja taxminan bir soat davom etadi, uyga esa bir-ikki kundan keyin qaytasiz.", {"shot": "facts"}),
        ("mad", "Nega bu haqda hech kim menga aytmadi?!", {}),
        ("dil", "Buni intervension jarroh bajaradi. Hammaga ham to‘g‘ri kelmaydi — lekin so‘rab ko‘rish kerak. Izohlarda yozing, batafsil aytib beramiz!", {}),
    ]
START, GAP_AFTER = 0.15, {"dil": 0.3, "mad": 0.22}
TAIL = 2.6

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
with wave.open(f"voice_ep{SUF}.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes())
json.dump({"duration": total, "lines": out_lines}, open(f"three/v2/ep/lines{SUF}.json", "w"), ensure_ascii=False)
json.dump({"end": total}, open(f"three/v2/ep/cues{SUF}.json", "w"))
for L in out_lines:
    print(f'{L["start"]:6.2f}–{L["end"]:6.2f}  {L["who"]}: {L["text"]}')
print(f"Длительность: {total:.2f} с")
