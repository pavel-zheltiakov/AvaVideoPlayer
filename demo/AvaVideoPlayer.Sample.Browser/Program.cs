using Avalonia;
using Avalonia.Browser;
using AvaVideoPlayer.Browser;
using AvaVideoPlayer.Sample;
using AvaVideoPlayer.Sample.Browser;
using System.Runtime.InteropServices.JavaScript;

internal static class Program
{
    private static async Task Main(string[] args)
    {
        using var document = JSHost.GlobalThis.GetPropertyAsJSObject("document")
            ?? throw new InvalidOperationException("Browser document is unavailable.");
        var baseUri = new Uri(document.GetPropertyAsString("baseURI")!);
        await BrowserVideoBackend.RegisterAsync(new Uri(baseUri, "avavideo.js").AbsoluteUri);
        App.DemoHost = new ScreeningRoomHost
        {
            BaseUri = baseUri,
            PrepareMedia = async uri => new Uri(await BrowserDemoInterop.PrepareMedia(uri.AbsoluteUri)),
            OpenLink = uri => BrowserDemoInterop.OpenLink(uri.AbsoluteUri),
            Ready = BrowserDemoInterop.Ready,
            DiagnosticsEnabled = BrowserDemoInterop.ChecksEnabled(),
            AutomaticCheck = BrowserDemoInterop.AutoCheck(),
            DiagnosticSummary = BrowserDemoInterop.Summary,
            BeginSegment = BrowserDemoInterop.Segment,
            SaveDiagnosticReport = BrowserDemoInterop.SaveReport
        };
        await AppBuilder.Configure<App>().WithInterFont().StartBrowserAppAsync("out");
    }
}
