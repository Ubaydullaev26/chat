# Reels uchun multfilm: «Madina va mioma» (oʻzbek tilida, lotin yozuvi)

**Format:** vertikal video 9:16 (1080×1920), ovoz bilan 58 soniya
**Ovoz:** ayol ovozi Madina (Microsoft neyron ovozi uz-UZ-MadinaNeural)
**Fayllar:**
- `reels_mioma_uz_ovoz.mp4` — ovoz + musiqa + effektlar (asosiy variant);
- `reels_mioma_uz_faqat_ovoz.mp4` — faqat ovoz, musiqani Instagram’da qoʻshish mumkin;
- `cover_uz.png` — muqova.

---

## Sahnalar

| # | Ekranda | Ekrandagi matn | Ovoz |
|---|---------|----------------|------|
| 1 | Shinam xona, Madina qornini ushlab turibdi | **Bu — Madina, u 35 yoshda.** U kuchli ogʻriq va moʻl hayzni «normal holat» deb oʻylardi… | Bu Madina. U kuchli ogʻriq va moʻl hayzni normal holat deb oʻylardi. |
| 2 | Belgilar kartochkalari | **Ammo belgilar oʻtib ketmadi:** 🩸 moʻl va uzoq davom etadigan hayz · ⚡ qorin pastida ogʻriq va ogʻirlik · 🚻 tez-tez hojatxonaga borish · 😴 holsizlik, charchoq, kamqonlik · 👗 qorin kattalashdi | Ammo belgilar oʻtib ketmadi: moʻl hayz, qorin pastidagi ogʻriq, tez-tez hojatxonaga borish, charchoq. |
| 3 | Bachadon va mioma tugunlari | **Sababi — bachadon miomasi.** Bachadon mushak toʻqimasidan oʻsgan xavfsiz (yaxshi sifatli) tugun · ✅ **Bu saraton EMAS** | Sababi, bachadon miomasi. Bu bachadon mushagida oʻsgan xavfsiz tugun. Va bu saraton emas! |
| 4 | 70% hisoblagich, 10 ayol siymosi | Mioma **juda keng tarqalgan**: **70% gacha** ayollar 50 yoshgacha miomaga duch keladi. Koʻpincha belgilarsiz kechadi — shuning uchun tekshiruvdan oʻtish muhim | Mioma juda keng tarqalgan: ayollarning yetmish foizigacha ellik yoshgacha unga duch keladi. |
| 5 | Shifokor xonasi, UTT ekrani | **Qanday aniq bilish mumkin?** Ginekologda UTT (UZI) — tez va ogʻriqsiz | Qanday aniq bilish mumkin? Ginekolog ultratovush tekshiruvini oʻtkazadi. Bu tez va ogʻriqsiz. |
| 6 | Davolash usullari | **Yaxshi xabar: mioma davolanadi!** 👀 Kuzatuv · 💊 Dori bilan davolash · 🩺 Kam invaziv usullar · 🏥 Operatsiya · Davolash usulini shifokor individual tanlaydi | Yaxshi xabar: mioma davolanadi! Davolash usulini shifokor individual tanlaydi. |
| 7 | Xursand Madina, yuraklar | **Madina oʻz vaqtida shifokorga murojaat qildi va yana kuch-gʻayratga toʻla!** → **Ogʻriq va moʻl hayz — normal EMAS.** Yiliga 1 marta ginekolog koʻrigidan oʻting · 📌 Saqlang · 💌 Dugonangizga yuboring | Madina oʻz vaqtida shifokorga murojaat qildi va yana kuch-gʻayratga toʻla. Ogʻriq va moʻl hayz, normal emas. Yiliga bir marta ginekolog koʻrigidan oʻting. Videoni saqlang va dugonangizga yuboring! |

Oxirgi kadrda: *«Maʼlumot tanishish uchun berilgan va shifokor maslahatini almashtirmaydi»*.

---

## Post uchun matn

> Kuchli ogʻriq va moʻl hayz — bu normal EMAS 🙅‍♀️
>
> Bachadon miomasi — koʻp ayollarda uchraydigan xavfsiz (yaxshi sifatli) tugun. Koʻpincha u hech qanday belgi bermaydi, baʼzan esa:
> 🩸 moʻl va uzoq davom etadigan hayz
> ⚡ qorin pastida ogʻriq va ogʻirlik
> 🚻 tez-tez hojatxonaga borish
> 😴 holsizlik va charchoq
>
> Yaxshi xabar: mioma UTT orqali oson aniqlanadi va davolanadi. Eng muhimi — chidab yurmang, ginekologga murojaat qiling 💗
>
> 📌 Yoʻqotib qoʻymaslik uchun saqlang va dugonangizga yuboring
>
> *Maʼlumot tanishish uchun berilgan va shifokor maslahatini almashtirmaydi.*

**Heshteglar:** #mioma #bachadonmiomasi #ayollarsalomatligi #ginekolog #ginekologiya #ayollarsogligi #UTT #UZI #profilaktika #salomatlik

---

## Qayta yigʻish

```bash
LANG_CODE=uz python3 voice.py edge uz-UZ-MadinaNeural      # voice_uz.wav + timeline_uz.json (pip install edge-tts)
node render.js 30 timeline_uz.json video_uz_silent.mp4 uz   # video
python3 music.py timeline_uz.json voice_uz.wav mix_uz.wav   # musiqa + ovoz
```
