# Desktop host for the shared Avalonia app

Registers the owned FFmpeg backend and launches the exact same App, ScreeningRoom
and Avalonia theme as the browser host. It consumes local copies of the four real
MP4/MOV/WebM fixtures, which are copied automatically to the output's media/ folder.

`dotnet run -c Release` starts the player. Optional flags: --silent, --skia,
--hardware, --require-hardware, --device=<name>. A file path or media URL may be
supplied with --360 when needed. The default is the two-recording catalog.

For an explicit two-recording muted diagnostic, run --demo-check and optionally
--report=<path>. This records native playback state observations, not physical
speaker certification. .NET 10 is required for a framework-dependent publish.
