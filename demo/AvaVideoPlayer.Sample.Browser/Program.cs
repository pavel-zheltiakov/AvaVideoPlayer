using Avalonia;
using Avalonia.Browser;
using AvaVideoPlayer.Browser;
using AvaVideoPlayer.Sample.Browser;
using System.Runtime.InteropServices.JavaScript;

internal static class Program
{
    private static async Task Main(string[] args)
    {
        await BrowserVideoBackend.RegisterAsync();
        using var document = JSHost.GlobalThis.GetPropertyAsJSObject("document")
            ?? throw new InvalidOperationException("Browser document is unavailable.");
        BrowserDemoApp.BaseUri = new Uri(document.GetPropertyAsString("baseURI")!);
        await AppBuilder.Configure<BrowserDemoApp>().StartBrowserAppAsync("out");
    }
}
