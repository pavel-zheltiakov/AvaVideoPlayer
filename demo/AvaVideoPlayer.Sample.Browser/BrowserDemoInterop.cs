using System.Runtime.InteropServices.JavaScript;

namespace AvaVideoPlayer.Sample.Browser;

internal static partial class BrowserDemoInterop
{
    [JSImport("ready", "AvaVideoPlayer.Demo")] internal static partial void Ready();
    [JSImport("prepareMedia", "AvaVideoPlayer.Demo")] internal static partial Task<string> PrepareMedia(string url);
    [JSImport("openLink", "AvaVideoPlayer.Demo")] internal static partial void OpenLink(string url);
    [JSImport("checksEnabled", "AvaVideoPlayer.Demo")] internal static partial bool ChecksEnabled();
    [JSImport("autoCheck", "AvaVideoPlayer.Demo")] internal static partial bool AutoCheck();
    [JSImport("segment", "AvaVideoPlayer.Demo")] internal static partial void Segment(string name);
    [JSImport("summary", "AvaVideoPlayer.Demo")] internal static partial string Summary();
    [JSImport("saveReport", "AvaVideoPlayer.Demo")] internal static partial void SaveReport();
}
