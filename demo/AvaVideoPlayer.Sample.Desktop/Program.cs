using Avalonia;
using AvaVideoPlayer.Engine;
using AvaVideoPlayer.FFmpeg.Avalonia;
using AvaVideoPlayer.Rendering.Skia;
using AvaVideoPlayer.Sample;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        FFmpegVideoBackend.Register(new()
        {
            AudioOutput = args.Contains("--silent") ? AudioOutputPolicy.Disabled : AudioOutputPolicy.Required,
            Decoder = new() { PreferHardwareDecoding = args.Contains("--hardware"), RequireHardwareDecoding = args.Contains("--require-hardware"), HardwareDevice = args.FirstOrDefault(a => a.StartsWith("--device="))?[9..] }
        },
            presenterFactory: args.Contains("--skia") ? (source, options) => new SkiaVideoPresenter(source, options) : null);
        App.Startup360 = args.Contains("--360");
        var source = args.FirstOrDefault(a => !a.StartsWith("--"));
        if (source != null) App.StartupSource = Uri.TryCreate(source, UriKind.Absolute, out var uri)
            ? uri : new Uri(Path.GetFullPath(source));
        AppBuilder.Configure<App>().UsePlatformDetect().LogToTrace().StartWithClassicDesktopLifetime(args);
    }
}
