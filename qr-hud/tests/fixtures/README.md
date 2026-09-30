`sample.mp4` is a locally generated one-second solid-color H.264 test video (320×180, no audio).

Created with:

```sh
ffmpeg -f lavfi -i color=c=0x142d40:s=320x180:d=1 -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an sample.mp4
```
