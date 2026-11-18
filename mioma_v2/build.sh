#!/bin/bash
# Сборка ролика из кадров «на двойках» (./build.sh [uz]): берём кадры с чётным номером n (файлы 00001, 00003, …), каждый держится 2 кадра при 30 к/с.
set -e
cd "$(dirname "$0")"
L="${1:-ru}"; SUF=""; OUT=reels_mify_o_miome; [ "$L" != "ru" ] && SUF="_$L" && OUT=reels_mioma_afsonalar_$L
rm -rf frames_twos && mkdir frames_twos
i=1; for f in $(ls frames$SUF/*.jpg | sort); do n=$((10#$(basename $f .jpg) - 1)); if [ $((n % 2)) -eq 0 ]; then ln -s ../$f frames_twos/$(printf %05d $i).jpg; i=$((i+1)); fi; done
ffmpeg -y -loglevel error -framerate 15 -i frames_twos/%05d.jpg -i mix$SUF.wav -r 30 -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart $OUT.mp4
ffmpeg -y -loglevel error -framerate 15 -i frames_twos/%05d.jpg -i voice$SUF.wav -r 30 -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -ac 2 -shortest -movflags +faststart ${OUT}_golos.mp4
echo "готово: $(ffprobe -v error -show_entries format=duration -of csv=p=0 $OUT.mp4) с"
