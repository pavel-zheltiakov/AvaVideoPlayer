# Browser host for the shared Avalonia app

This entry point registers BrowserVideoBackend and supplies browser services to
`AvaVideoPlayer.Sample.App`. The player UI, catalog, interaction logic and XAML
theme are in ../AvaVideoPlayer.Sample, shared with the desktop host.

Publish with `dotnet publish -c Release` and serve the generated
bin/Release/net10.0-browser/publish/wwwroot over HTTP(S). The four bundled media
variants are included automatically. Double-clicking index.html cannot run WASM.

The browser DOM contains Avalonia's canvas for all UI controls plus NativeControlHost's
bounded video/WebGL surface. HTMLMediaElement provides media decoding and sound;
it does not implement the buttons or catalog. The standalone JavaScript demo is
only a separate backend test harness and a visual reference.

The small demo fixtures preload into Blob URLs. Append ?checks=1&autocheck=1 to
the website URL for an explicit two-recording muted playback diagnostic report.
