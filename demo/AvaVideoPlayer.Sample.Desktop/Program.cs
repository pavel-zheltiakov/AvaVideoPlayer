using System.Diagnostics;
using System.Text.Json;
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
        }, presenterFactory: args.Contains("--skia") ? (source, options) => new SkiaVideoPresenter(source, options) : null);
        App.Startup360 = args.Contains("--360");
        var source = args.FirstOrDefault(a => !a.StartsWith("--"));
        if (source != null) App.StartupSource = Uri.TryCreate(source, UriKind.Absolute, out var uri) ? uri : new Uri(Path.GetFullPath(source));
        var check = args.Contains("--demo-check");
        var reportPath = args.FirstOrDefault(a => a.StartsWith("--report="))?[9..] ?? Path.Combine(AppContext.BaseDirectory, "desktop-playback-report.json");
        var clock = Stopwatch.StartNew(); var samples = new List<object>(); var segments = new List<object>();
        App.DemoHost = new ScreeningRoomHost
        {
            BaseUri = new Uri(AppContext.BaseDirectory),
            OpenLink = uri => Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true }),
            DiagnosticsEnabled = check,
            AutomaticCheck = check,
            ObservePlayback = s =>
            {
                if (check) samples.Add(new { wallMs = clock.Elapsed.TotalMilliseconds, state = s.State.ToString(), position = s.Position.TotalSeconds, duration = s.Duration.TotalSeconds, source = s.Information.Source?.AbsoluteUri, backend = s.Information.Backend, s.IsMuted, s.Error });
            },
            BeginSegment = name => segments.Add(new { name, wallMs = clock.Elapsed.TotalMilliseconds }),
            DiagnosticSummary = () => $"{samples.Count} native playback observations",
            SaveDiagnosticReport = () => File.WriteAllText(reportPath, JsonSerializer.Serialize(new { platform = System.Runtime.InteropServices.RuntimeInformation.OSDescription, architecture = System.Runtime.InteropServices.RuntimeInformation.ProcessArchitecture.ToString(), sharedView = typeof(ScreeningRoom).FullName, mutedDiagnosticRun = true, segments, samples }, new JsonSerializerOptions { WriteIndented = true }))
        };
        AppBuilder.Configure<App>().UsePlatformDetect().WithInterFont().LogToTrace().StartWithClassicDesktopLifetime(args);
    }
}
