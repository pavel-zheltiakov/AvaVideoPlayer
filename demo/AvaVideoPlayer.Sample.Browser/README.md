# Avalonia WebAssembly screening room

This is a full Avalonia application. `BrowserDemoApp.cs` composes the packaged
`VideoPlayer` control with Avalonia buttons, sliders, ComboBoxes and a catalog.
The browser backend embeds its media surface through NativeControlHost; .NET
JavaScript interop sends playback commands to HTMLMediaElement and WebGL.
Browser codec decoding and sound are provided by the browser.

The project consumes the single AvaVideoPlayer NuGet; no private source is needed.
Download the preview package into ../../packages, then run from this directory:

```sh
dotnet publish -c Release
```

Serve `bin/Release/net10.0-browser/publish/wwwroot` over HTTP(S). WebAssembly
modules cannot be launched by double-clicking an HTML file. For the supplied
catalog, copy the four video files from ../AvaVideoPlayer.Demo.Browser/media into
that output's media/ directory. The site builder does this automatically.

Click Play to start audible playback. The main website embeds this application.
The separate JavaScript-only demo is a backend test harness.
See ../AvaVideoPlayer.Demo.Browser/CREDITS.md for footage attribution and licenses.
