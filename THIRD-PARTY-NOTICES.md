# Third-party notices

The owned software license does not replace any third-party license.

The single package embeds FFmpeg (LGPL-2.1-or-later), FriBidi (LGPL-2.1-or-later), libass (ISC), FreeType (FTL), HarfBuzz (MIT), dav1d (BSD-2-Clause), zlib and libpng under their respective licenses. Additional platform/tool dependencies and their notices are enumerated inside the package under third-party/<rid>. Original archives, build recipes and bridge source needed for rebuilding are retained under corresponding-sources/, with a hash-checked materializer that reconstructs each original source/build tree. Do not remove these when redistributing the package.

Managed dependencies include Avalonia and SkiaSharp under their respective upstream licenses; NuGet resolves those third-party packages separately. The browser module uses built-in browser APIs and contains no external script/CDN dependency.

Demo footage and posters: Bernard Ladenthin, Ess-Na-Crub Waterfall (CC BY 4.0); Jan Ainali, Esino Lario 360 (CC BY-SA 4.0). Transcoded/scaled, sound normalized, and flat rectilinear views extracted. Full source and license links are in demo/AvaVideoPlayer.Demo.Browser/CREDITS.md and the live player's Credits dialog. Village derivatives/posters remain CC BY-SA 4.0.
