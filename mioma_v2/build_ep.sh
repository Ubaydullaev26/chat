#!/bin/bash
# Сборка ролика «Как проходит ЭМА» из кадров «на двойках» (./build_em.sh [uz]).
# Сразу два варианта: обычный (~3,5 Мбит/с, H.264 4.1) и лёгкий для телефона (~1,3 Мбит/с).
set -e
cd "$(dirname "$0")"
L="${1:-ru}"; SUF=""; [ "$L" != "ru" ] && SUF="_$L"
OUT=reels_kak_prohodit_ema$SUF
rm -rf frames_twos && mkdir frames_twos
i=1; for f in $(ls frames_ep$SUF/*.jpg | sort); do n=$((10#$(basename $f .jpg) - 1)); if [ $((n % 2)) -eq 0 ]; then ln -s ../$f frames_twos/$(printf %05d $i).jpg; i=$((i+1)); fi; done
ffmpeg -y -loglevel error -framerate 15 -i frames_twos/%05d.jpg -i mix_ep$SUF.wav -r 30 -c:v libx264 -preset medium -crf 23 -maxrate 3.5M -bufsize 7M -profile:v high -level 4.1 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart $OUT.mp4
mkdir -p small
ffmpeg -y -loglevel error -i $OUT.mp4 -c:v libx264 -preset slow -b:v 1300k -maxrate 1700k -bufsize 3400k -profile:v main -level 4.0 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart small/$OUT.mp4
ffmpeg -y -loglevel error -framerate 15 -i frames_twos/%05d.jpg -i voice_ep$SUF.wav -r 30 -c:v libx264 -preset medium -crf 23 -maxrate 3.5M -bufsize 7M -profile:v high -level 4.1 -pix_fmt yuv420p -c:a aac -b:a 160k -ac 2 -shortest -movflags +faststart ${OUT}_golos.mp4
ffmpeg -y -loglevel error -ss 1.0 -i $OUT.mp4 -frames:v 1 cover_kak_prohodit_ema$SUF.png
echo "готово: $(ffprobe -v error -show_entries format=duration -of csv=p=0 $OUT.mp4) с, $(du -h $OUT.mp4 | cut -f1), лёгкая $(du -h small/$OUT.mp4 | cut -f1)"
