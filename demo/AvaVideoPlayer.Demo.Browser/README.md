# Screening room

Open dist/index.html for the self-contained player. It embeds two unique real 360 recordings with original sound, with four selectable format variants across MP4/WebM/MOV. No SDK or server is needed.

To rebuild, run `python3 build.py` in this folder. The builder reads the exact browser JavaScript from the single public AvaVideoPlayer NuGet under ../../packages. It does not need the private library source.

The normal UI contains only the player and catalog. Credits open from the header. Append ?checks=1 to the HTML URL for the playback and projection-switching integration suite. Browser codec availability varies. CREDITS.md records creators, changes and CC licenses.
