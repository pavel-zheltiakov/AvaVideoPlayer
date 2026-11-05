using Avalonia;
using Avalonia.Browser;
using AvaVideoPlayer.Browser;
using AvaVideoPlayer.Sample.Browser;
using System.Runtime.InteropServices.JavaScript;

internal static class Program
{
    private static async Task Main(string[] args)
    {
        using var document = JSHost.GlobalThis.GetPropertyAsJSObject("document")
            ?? throw new InvalidOperationException("Browser document is unavailable.");
        BrowserDemoApp.BaseUri = new Uri(document.GetPropertyAsString("baseURI")!);
        // JSHost imports resolve relative paths against the runtime in _framework/.
        // Use the document base so subdirectory deployments resolve the public asset.
        await BrowserVideoBackend.RegisterAsync(new Uri(BrowserDemoApp.BaseUri, "avavideo.js").AbsoluteUri);
        await AppBuilder.Configure<BrowserDemoApp>().StartBrowserAppAsync("out");
    }
}
