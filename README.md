# AvaVideoPlayer — public preview

Video playback for Avalonia 12.1.x / .NET 10. Desktop uses the owned FFmpeg engine; browser playback uses HTMLMediaElement and WebGL. This is a preview, not a stable or universally certified release.

The public distribution contains one AvaVideoPlayer NuGet package, package-only sample/demo sources, documentation and the live browser demo. Managed library implementation sources are maintained in the private development repository. Native packages retain the source/build/license materials needed for their third-party components.

Download AvaVideoPlayer.0.1.0-preview.1.nupkg from the GitHub release into the packages folder. This single package embeds separate managed assemblies, the browser backend/module and desktop native assets for osx-arm64, win-x64, win-arm64, linux-x64 and linux-arm64. NuGet selects the appropriate framework and runtime assets. No other AvaVideoPlayer packages are required. Avalonia remains an external dependency.

- Documentation: https://pavel-zheltiakov.github.io/AvaVideoPlayer/docs/overview.html
- API: https://pavel-zheltiakov.github.io/AvaVideoPlayer/api/
- Live demo: https://pavel-zheltiakov.github.io/AvaVideoPlayer/demo.html
- Packages/releases: https://github.com/pavel-zheltiakov/AvaVideoPlayer/releases

Freeware, including commercial application use. See LICENSE.md and THIRD-PARTY-NOTICES.md. Footage and other third-party materials retain their own licenses.
