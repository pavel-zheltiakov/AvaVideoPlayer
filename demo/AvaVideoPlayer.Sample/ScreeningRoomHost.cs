namespace AvaVideoPlayer.Sample;

/// <summary>Platform services only. The view, controls, theme and player logic are shared.</summary>
public sealed class ScreeningRoomHost
{
    public required Uri BaseUri { get; init; }
    public Func<Uri, Task<Uri>> PrepareMedia { get; init; } = uri => Task.FromResult(uri);
    public Action<Uri> OpenLink { get; init; } = _ => { };
    public Action Ready { get; init; } = () => { };
    public bool DiagnosticsEnabled { get; init; }
    public bool AutomaticCheck { get; init; }
    public Func<string> DiagnosticSummary { get; init; } = () => "";
    public Action<string> BeginSegment { get; init; } = _ => { };
    public Action SaveDiagnosticReport { get; init; } = () => { };
    public Action<PlaybackSnapshot> ObservePlayback { get; init; } = _ => { };
}
