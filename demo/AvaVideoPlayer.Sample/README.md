# Shared Avalonia screening room

Desktop and browser launch this same `App` and `ScreeningRoom`. All buttons,
sliders, selectors, thumbnail cards, player commands and playback state logic
are defined here. `ScreeningRoomTheme.axaml` is an Avalonia control-template
stylesheet inspired by the HTML demo's appearance. No browser HTML widgets are
used to implement the player chrome.

`ScreeningRoomHost` supplies platform services only: media URI preparation,
external links and optional diagnostics. Browser uses HTMLMediaElement/WebGL
inside the VideoPlayer native viewport; desktop uses the FFmpeg engine/presenter.
Inter's font license is in Assets/Inter-OFL.txt. Footage credits and licenses are
in ../AvaVideoPlayer.Demo.Browser/CREDITS.md.
