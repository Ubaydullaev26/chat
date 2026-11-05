"""Закадровый голос + тайминг ролика под голос.

Запуск:  python3 voice.py silero <v3_1_ru.pt> [голос=xenia]     — Silero (нужен torch), основной вариант
         python3 voice.py piper  <папка_модели_irina> [скорость=1.08] — Piper «Ирина»
Модели:  Silero v3.1 ru (https://models.silero.ai/models/tts/ru/v3_1_ru.pt),
         Piper: https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-ru_RU-irina-medium.tar.bz2
Выход:   voice.wav (голос на таймлайне), timeline.json (как растянуть анимацию), voice_timing.txt
"""
import json, sys, wave
import numpy as np

ENGINE, MODEL = sys.argv[1], sys.argv[2]
OPT = sys.argv[3] if len(sys.argv) > 3 else None
SR = 44100

# Сцены в «времени анимации» (anim.html): начало сцены, сдвиг фразы от начала сцены, текст
SCENES = [
    (0.0,  0.35, "Это Мадина. Она думала, что сильная боль и обильные месячные — это норма."),
    (5.0,  0.40, "Но симптомы не проходили: обильные месячные, боль внизу живота, частые походы в туалет, усталость."),
    (12.0, 1.10, "Причина — миома матки. Это доброкачественный узел в мышечной стенке матки. И это не рак!"),
    (20.3, 0.20, "Миома встречается очень часто: до семидесяти процентов женщин к пятидесяти годам."),
    (25.3, 0.30, "Как узнать точно? Гинеколог сделает у-зэ-и. Это быстро и безболезненно."),
    (31.3, 0.20, "Хорошая новость: миома лечится! Метод лечения подберёт врач — индивидуально."),
    (37.3, 0.30, "Мадина вовремя пришла к врачу и снова полна сил."),
    (40.9, 0.10, "Боль и обильные месячные — не норма. Проверяйтесь у гинеколога раз в год. Сохраните видео и отправьте подруге!"),
]
ANIM_END = 46.0
GAP = 0.45      # пауза после фразы перед следующей сценой
TAIL = 1.6      # хвост после последней фразы

# Ударения для Silero («+» перед ударной гласной)
SILERO_FIX = [("Мадина", "Мад+ина"), ("миома", "ми+ома"), ("Миома", "Ми+ома"), ("у-зэ-и", "уз+и")]

if ENGINE == "silero":
    import torch
    torch.set_num_threads(4)
    model = torch.package.PackageImporter(MODEL).load_pickle("tts_models", "model")
    speaker = OPT or "xenia"
    def synth(text):
        for a, b in SILERO_FIX:
            text = text.replace(a, b)
        audio = model.apply_tts(text=text, speaker=speaker, sample_rate=48000, put_accent=True, put_yo=True)
        return audio.numpy().astype(np.float64), 48000
else:
    from piper import PiperVoice, SynthesisConfig
    voice = PiperVoice.load(f"{MODEL}/ru_RU-irina-medium.onnx", config_path=f"{MODEL}/ru_RU-irina-medium.onnx.json")
    syn = SynthesisConfig(length_scale=1.0 / float(OPT or 1.08), noise_scale=0.6, noise_w_scale=0.75)
    def synth(text):
        chunks = list(voice.synthesize(text, syn_config=syn))
        return np.concatenate([c.audio_float_array for c in chunks]).astype(np.float64), chunks[0].sample_rate

clips = []
for _, _, text in SCENES:
    x, sr = synth(text)
    x = np.interp(np.arange(0, len(x), sr / SR), np.arange(len(x)), x)  # → 44.1 кГц
    idx = np.where(np.abs(x) > 0.01)[0]
    x = x[max(0, idx[0] - int(0.08 * SR)): idx[-1] + 3000]  # запас 80 мс, чтобы не срезать тихие согласные
    clips.append(x / (np.max(np.abs(x)) + 1e-9))

# Таймлайн: каждая сцена длится не меньше исходного и не меньше, чем нужно её фразе
anim_pts, real_pts, starts = [0.0], [0.0], []
real = 0.0
for k, (a0, off, _) in enumerate(SCENES):
    a1 = SCENES[k + 1][0] if k + 1 < len(SCENES) else ANIM_END
    need = off + len(clips[k]) / SR + (TAIL if k + 1 == len(SCENES) else GAP)
    length = max(a1 - a0, need)
    starts.append(real + off)
    real += length
    anim_pts.append(a1); real_pts.append(real)
total = real_pts[-1]

out = np.zeros(int(SR * total) + 1)
log = []
for k, x in enumerate(clips):
    i0 = int(starts[k] * SR)
    out[i0:i0 + len(x)] += x[: len(out) - i0]
    log.append(f"{starts[k]:6.2f} – {starts[k] + len(x) / SR:6.2f} с  {SCENES[k][2]}")
out = np.tanh(out * 1.2) / np.tanh(1.2)
out *= 0.95 / np.max(np.abs(out))
with wave.open("voice.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype("<i2").tobytes())
json.dump({"anim": anim_pts, "real": real_pts, "duration": total,
           "voice": [[starts[k], starts[k] + len(x) / SR] for k, x in enumerate(clips)]},
          open("timeline.json", "w"), indent=1)
open("voice_timing.txt", "w").write("\n".join(log) + f"\nИтого: {total:.2f} с\n")
print("\n".join(log)); print(f"Длительность ролика: {total:.2f} с")
