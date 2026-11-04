using Avalonia;
using Avalonia.Browser;
using AvaVideoPlayer.Browser;
using AvaVideoPlayer.Sample;

internal static class Program
{
    private static async Task Main(string[] args)
    {
        await BrowserVideoBackend.RegisterAsync();
        await AppBuilder.Configure<App>().StartBrowserAppAsync("out");
    }
}
