using System.Runtime.InteropServices.JavaScript;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Controls.Primitives;
using Avalonia.Layout;
using Avalonia.Media;
using Avalonia.Media.Imaging;
using Avalonia.Platform;
using Avalonia.Styling;
using Avalonia.Themes.Fluent;
using Avalonia.Markup.Xaml;
using Avalonia.Threading;
using AvaVideoPlayer;

namespace AvaVideoPlayer.Sample.Browser;

public sealed partial class BrowserDemoApp : Application
{
    public static Uri BaseUri { get; set; } = null!;
    public override void Initialize() => AvaloniaXamlLoader.Load(this);
    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is ISingleViewApplicationLifetime single) single.MainView = new ScreeningRoom();
        base.OnFrameworkInitializationCompleted();
        BrowserDemoInterop.Ready();
    }
}

// The entire application chrome is Avalonia. Only the media surface belongs to the browser.
public sealed class ScreeningRoom : UserControl
{
    private sealed record Recording(string Name, string Place, string Poster, string[] Files, string[] Formats);
    private readonly Recording[] _recordings = [
        new("The waterfall", "Northern Ireland", "waterfall.jpg", ["waterfall-360.mp4", "waterfall-360.mov"], ["MP4", "MOV"]),
        new("A village afternoon", "Esino Lario, Italy", "village.jpg", ["village-360.webm", "village-360.mp4"], ["WebM", "MP4"])
    ];
    public VideoPlayer Player { get; } = new() { ShowControls = false };
    private readonly ComboBox _format = Select(["MP4", "MOV"], 0, 78);
    private readonly ComboBox _view = Select(["360°", "Flat"], 0, 82);
    private readonly ComboBox _speed = Select(["0.5×", "1×", "1.5×", "2×"], 1, 75);
    private readonly Slider _seek = Range(0, 1, 0);
    private readonly Slider _volume = Range(0, 1, .8);
    private readonly Button _play = RoomButton("Play", "Play or pause");
    private readonly Button _mute = RoomButton("Volume", "Mute or unmute");
    private readonly TextBlock _time = Text("0:00 / 0:00", 11, "#dbe5dd");
    private readonly TextBlock _status = Text("Preparing video…", 10, "#718576");
    private readonly TextBlock _error = Text("", 11, "#a73b2f");
    private readonly TextBlock _title = Text("The waterfall", 25, "#172e2b");
    private readonly Grid _layout = new() { ColumnDefinitions = new("*,310"), ColumnSpacing = 35, RowSpacing = 24, MaxWidth = 1450, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Top };
    private readonly Border _catalog;
    private readonly Border _videoFrame;
    private readonly Button[] _cards = new Button[2];
    private readonly StackPanel _credits = new() { Spacing = 7, IsVisible = false };
    private readonly TextBlock _diagnostic = Text("", 10, "#6d7973");
    private readonly SemaphoreSlim _loads = new(1, 1);
    private int _selected;
    private bool _updating, _scrubbing, _loop = true;
    private bool? _lastPlaying, _lastMuted;
    private readonly DispatcherTimer _clock;

    public ScreeningRoom()
    {
        Background = Brush("#f3f2ed"); FontFamily = new FontFamily("avares://Avalonia.Fonts.Inter/Assets#Inter");
        var stage = new StackPanel { Spacing = 0 };
        _videoFrame = new Border { Background = Brush("#0c1714"), Child = Player, ClipToBounds = true };
        var panel = new StackPanel { Spacing = 3, Margin = new Thickness(16, 7, 16, 12) };
        panel.Children.Add(_seek);
        var transport = new Grid { ColumnDefinitions = new("Auto,*,Auto"), ColumnSpacing = 7 };
        var left = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 3, VerticalAlignment = VerticalAlignment.Center };
        _play.Foreground = Brush("#d9ef81"); _play.Width = 33;
        _volume.Width = 60; _volume.Margin = new Thickness(0, 0, 5, 0);
        _time.VerticalAlignment = VerticalAlignment.Center; _time.Margin = new Thickness(8, 0, 8, 0); _time.Width = 87;
        Add(left, _play, Action("Back", "Back 5 seconds", () => Player.SkipAsync(TimeSpan.FromSeconds(-5))), Action("Forward", "Forward 5 seconds", () => Player.SkipAsync(TimeSpan.FromSeconds(5))), _time, _mute, _volume);
        transport.Children.Add(left);
        var right = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 5, VerticalAlignment = VerticalAlignment.Center };
        var loop = Action("Loop", "Loop video", () => { _loop = !_loop; return Task.CompletedTask; });
        loop.Foreground = Brush("#d9ef81"); loop.Click += (_, _) => loop.Foreground = Brush(_loop ? "#d9ef81" : "#dbe5dd");
        Add(right, _speed, loop, Action("Fullscreen", "Fullscreen", Player.ToggleFullscreenAsync));
        Grid.SetColumn(right, 2); transport.Children.Add(right); panel.Children.Add(transport);
        var modes = new WrapPanel { Margin = new Thickness(1, 5, 0, 0) };
        Add(modes, Text("FORMAT", 8, "#9eafa6"), _format, Text("VIEW", 8, "#9eafa6"), _view);
        foreach (var child in modes.Children) { child.VerticalAlignment = VerticalAlignment.Center; child.Margin = new Thickness(0, 0, 9, 0); }
        panel.Children.Add(modes);
        var playerSurface = new StackPanel(); playerSurface.Children.Add(_videoFrame); playerSurface.Children.Add(panel);
        stage.Children.Add(new Border { Background = Brush("#142522"), CornerRadius = new CornerRadius(16), ClipToBounds = true, Child = playerSurface });
        var caption = new Grid { ColumnDefinitions = new("*,Auto"), Margin = new Thickness(0, 22, 0, 0), ColumnSpacing = 14 };
        var titleBlock = new StackPanel { Spacing = 6 };
        titleBlock.Children.Add(Text("NOW PLAYING", 8, "#6d7973")); titleBlock.Children.Add(_title); titleBlock.Children.Add(_status);
        caption.Children.Add(titleBlock);
        var reset = Action("Compass", "Reset view", () => { Player.ResetCamera(); return Task.CompletedTask; }, "Reset view"); reset.Classes.Add("outline"); reset.VerticalAlignment = VerticalAlignment.Center;
        Grid.SetColumn(reset, 1); caption.Children.Add(reset); stage.Children.Add(caption);
        _error.IsVisible = false; _error.TextWrapping = TextWrapping.Wrap; _error.Margin = new Thickness(0, 10, 0, 0); stage.Children.Add(_error);
        _layout.Children.Add(stage);
        var library = new StackPanel { Spacing = 12 };
        var actions = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 0, 0, 12) };
        var creditButton = RoomButton("", "Footage credits", "Credits"); creditButton.Classes.Add("outline"); creditButton.Click += (_, _) => _credits.IsVisible = !_credits.IsVisible;
        var open = Action("Folder", "Open a local video", Player.OpenFileAsync, "Open video"); open.Classes.Add("outline"); Add(actions, creditButton, open); library.Children.Add(actions);
        library.Children.Add(Text("THE COLLECTION", 8, "#6d7973")); library.Children.Add(Text("Videos  02", 23, "#172e2b"));
        for (int i = 0; i < _recordings.Length; i++)
        {
            var index = i; var clip = _recordings[i];
            var row = new Grid { ColumnDefinitions = new("100,*"), ColumnSpacing = 12 };
            using var stream = AssetLoader.Open(new Uri("avares://AvaVideoPlayer.Sample.Browser/Assets/" + clip.Poster));
            row.Children.Add(new Border { Width = 100, Height = 64, CornerRadius = new CornerRadius(5), ClipToBounds = true, Child = new Image { Source = new Bitmap(stream), Stretch = Stretch.UniformToFill } });
            var copy = new StackPanel { Spacing = 5, VerticalAlignment = VerticalAlignment.Center };
            copy.Children.Add(Text("360° · " + string.Join(" / ", clip.Formats), 8, "#6d8368"));
            var name = Text(clip.Name, 12, "#172e2b"); name.FontWeight = FontWeight.SemiBold; copy.Children.Add(name); copy.Children.Add(Text(clip.Place, 10, "#869180"));
            Grid.SetColumn(copy, 1); row.Children.Add(copy);
            var card = RoomButton("", "Play " + clip.Name); card.Classes.Add("catalog"); card.Content = row; card.Click += async (_, _) => await Run(() => SelectRecording(index)); _cards[i] = card; library.Children.Add(card);
        }
        var credits = Text("Ess-Na-Crub Waterfall — Bernard Ladenthin · CC BY 4.0\nEsino Lario 360 — Jan Ainali · CC BY-SA 4.0\nWikimedia Commons. Transcoded, scaled & sound normalized. Village derivatives remain CC BY-SA 4.0.", 10, "#718576"); credits.TextWrapping = TextWrapping.Wrap; credits.LineHeight = 18; _credits.Children.Add(credits);
        foreach (var (label, url) in new[] { ("Waterfall source ↗", "https://commons.wikimedia.org/wiki/File:20180407_132600_Ess-Na-Crub_Waterfall.webm"), ("Village source ↗", "https://commons.wikimedia.org/wiki/File:Esino_Lario_360.webm") })
        { var link = RoomButton("", label, label); link.Classes.Add("outline"); link.Click += (_, _) => BrowserDemoInterop.OpenLink(url); _credits.Children.Add(link); }
        library.Children.Add(_credits);
        if (BrowserDemoInterop.ChecksEnabled())
        {
            var save = RoomButton("", "Save playback diagnostic report", "Save playback report"); save.Classes.Add("outline"); save.Click += (_, _) => BrowserDemoInterop.SaveReport(); library.Children.Add(save); library.Children.Add(_diagnostic);
        }
        _catalog = new Border { Child = library }; Grid.SetColumn(_catalog, 1); _layout.Children.Add(_catalog);
        Content = new ScrollViewer { Content = _layout, HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled };
        _play.Click += async (_, _) => await Run(Player.TogglePlaybackAsync);
        _mute.Click += async (_, _) => await Run(() => Player.SetVolumeAsync(_volume.Value, !(Player.Snapshot?.IsMuted ?? false)));
        _format.SelectionChanged += async (_, _) => { if (!_updating && _format.SelectedIndex >= 0) await Run(LoadRecording); };
        _view.SelectionChanged += (_, _) => Player.SetProjection(_view.SelectedIndex == 0 ? VideoProjection.Equirectangular : VideoProjection.Flat);
        _speed.SelectionChanged += async (_, _) => { if (!_updating) await Run(() => Player.SetPlaybackSpeedAsync(new[] { .5, 1, 1.5, 2 }[Math.Max(0, _speed.SelectedIndex)])); };
        _volume.PropertyChanged += async (_, e) => { if (e.Property == RangeBase.ValueProperty && !_updating) await Run(() => Player.SetVolumeAsync(_volume.Value)); };
        _seek.AddHandler(PointerPressedEvent, (_, _) => _scrubbing = true, Avalonia.Interactivity.RoutingStrategies.Tunnel);
        _seek.AddHandler(PointerReleasedEvent, async (_, _) => { if (_scrubbing) { _scrubbing = false; await Run(() => Player.SeekAsync(TimeSpan.FromSeconds(_seek.Value))); } }, Avalonia.Interactivity.RoutingStrategies.Bubble, true);
        _seek.PointerCaptureLost += (_, _) => _scrubbing = false;
        _seek.KeyUp += async (_, _) => await Run(() => Player.SeekAsync(TimeSpan.FromSeconds(_seek.Value)));
        Player.PlaybackError += (_, message) => { if (!message.Contains("user gesture")) { _error.Text = message; _error.IsVisible = true; } };
        _clock = new DispatcherTimer(TimeSpan.FromMilliseconds(200), DispatcherPriority.Background, (_, _) => Refresh());
        AttachedToVisualTree += async (_, _) => { _clock.Start(); await Run(() => SelectRecording(0)); };
        DetachedFromVisualTree += (_, _) => _clock.Stop();
        SizeChanged += (_, _) => LayoutRoom();
    }
    private void LayoutRoom()
    {
        var narrow = Bounds.Width < 900;
        _layout.Margin = new Thickness(narrow ? 20 : Math.Clamp(Bounds.Width * .052, 24, 72), 24, narrow ? 20 : Math.Clamp(Bounds.Width * .052, 24, 72), 24);
        _layout.ColumnDefinitions = new ColumnDefinitions(narrow ? "*" : "*,310"); _layout.RowDefinitions = new RowDefinitions(narrow ? "Auto,Auto" : "Auto");
        Grid.SetColumn(_catalog, narrow ? 0 : 1); Grid.SetRow(_catalog, narrow ? 1 : 0);
        var availableWidth = Math.Min(1450, Bounds.Width - _layout.Margin.Left - _layout.Margin.Right) - (narrow ? 0 : 345);
        _videoFrame.Height = Math.Clamp(Math.Min(availableWidth * 9 / 16, Math.Max(240, Bounds.Height - 235)), 180, 700);
    }
    private async Task SelectRecording(int index)
    {
        _selected = index; _title.Text = _recordings[index].Name;
        for (int i = 0; i < _cards.Length; i++) _cards[i].Classes.Set("selected", i == index);
        _updating = true; _format.ItemsSource = _recordings[index].Formats; _format.SelectedIndex = 0; _updating = false;
        await LoadRecording();
    }
    private async Task LoadRecording()
    {
        var file = _recordings[_selected].Files[Math.Max(0, _format.SelectedIndex)];
        await _loads.WaitAsync();
        try
        {
            _status.Text = "Preparing video…";
            // Match the HTML demo: fully downloaded local Blob, never a streaming Range request mid-play.
            var source = await BrowserDemoInterop.PrepareMedia(new Uri(BrowserDemoApp.BaseUri, "media/" + file).AbsoluteUri);
            Player.SetProjection(_view.SelectedIndex == 0 ? VideoProjection.Equirectangular : VideoProjection.Flat); Player.ResetCamera();
            await Player.OpenAsync(new Uri(source));
            await Player.SetPlaybackSpeedAsync(new[] { .5, 1, 1.5, 2 }[Math.Max(0, _speed.SelectedIndex)]);
            await Player.SetVolumeAsync(_volume.Value);
        }
        finally { _loads.Release(); }
    }
    private void Refresh()
    {
        var snapshot = Player.Snapshot; if (snapshot is null) return;
        _updating = true;
        bool playing = snapshot.State == PlaybackState.Playing;
        if (_lastPlaying != playing) { _play.Content = Icon(playing ? "Pause" : "Play"); _lastPlaying = playing; }
        if (_lastMuted != snapshot.IsMuted) { _mute.Content = Icon(snapshot.IsMuted ? "Muted" : "Volume"); _lastMuted = snapshot.IsMuted; }
        _seek.Maximum = Math.Max(1, snapshot.Duration.TotalSeconds); if (!_scrubbing) _seek.Value = Math.Clamp(snapshot.Position.TotalSeconds, 0, _seek.Maximum);
        _time.Text = $"{Time(snapshot.Position)} / {Time(snapshot.Duration)}";
        _status.Text = snapshot.State == PlaybackState.Buffering ? "Buffering…" : Player.IsSpherical ? "360° · Drag to look around · Scroll to zoom" : "Flat video";
        _updating = false;
        if (_loop && snapshot.State == PlaybackState.Ended) _ = Run(async () => { await Player.SeekAsync(TimeSpan.Zero); await Player.PlayAsync(); });
        if (BrowserDemoInterop.ChecksEnabled()) _diagnostic.Text = BrowserDemoInterop.Summary();
    }
    private async Task Run(Func<Task> command)
    { try { _error.IsVisible = false; await command(); } catch (Exception error) { _error.Text = error.Message; _error.IsVisible = true; } }
    private Button Action(string icon, string tooltip, Func<Task> command, string? label = null)
    { var button = RoomButton(icon, tooltip, label); button.Click += async (_, _) => await Run(command); return button; }
    private static Button RoomButton(string icon, string tooltip, string? label = null)
    {
        var button = new Button { VerticalContentAlignment = VerticalAlignment.Center, HorizontalContentAlignment = HorizontalAlignment.Center };
        button.Classes.Add("room"); ToolTip.SetTip(button, tooltip);
        var row = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 6, VerticalAlignment = VerticalAlignment.Center };
        if (icon.Length > 0) row.Children.Add(Icon(icon)); if (label != null) row.Children.Add(Text(label, 11, "#526b5c"));
        button.Content = row; return button;
    }
    private static Control Icon(string name)
    {
        var data = name switch {
            "Play" => "M8,5 L20,12 L8,19 Z", "Pause" => "M8,5 L10,5 L10,19 L8,19 Z M15,5 L17,5 L17,19 L15,19 Z",
            "Back" => "M8,5 L3,10 L8,15 M3,10 L14,10 C21,10 21,21 14,21 M12,2 L12,7",
            "Forward" => "M16,5 L21,10 L16,15 M21,10 L10,10 C3,10 3,21 10,21 M12,2 L12,7",
            "Volume" => "M10,5 L5,9 L2,9 L2,15 L5,15 L10,19 Z M14,8 C18,10 18,14 14,16 M18,5 C24,9 24,15 18,19",
            "Muted" => "M10,5 L5,9 L2,9 L2,15 L5,15 L10,19 Z M16,9 L22,15 M22,9 L16,15",
            "Fullscreen" => "M8,3 L3,3 L3,8 M16,3 L21,3 L21,8 M3,16 L3,21 L8,21 M16,21 L21,21 L21,16",
            "Loop" => "M17,2 L21,6 L17,10 M3,11 L3,9 C3,7 4,6 6,6 L21,6 M7,22 L3,18 L7,14 M21,13 L21,15 C21,17 20,18 18,18 L3,18",
            "Folder" => "M3,7 L3,5 L9,5 L11,7 L21,7 L21,19 L3,19 Z",
            _ => "M12,3 A9,9 0 1 1 11.99,3 M15.5,8.5 L13.5,13.5 L8.5,15.5 L10.5,10.5 Z" };
        return new Avalonia.Controls.Shapes.Path { Data = Geometry.Parse(data), Width = 17, Height = 17, Stretch = Stretch.Uniform, Stroke = Brush("#dbe5dd"), StrokeThickness = 1.7, Fill = name is "Play" or "Pause" ? Brush("#d9ef81") : Brushes.Transparent };
    }
    private static ComboBox Select(string[] items, int selected, double width) { var control = new ComboBox { ItemsSource = items, SelectedIndex = selected, Width = width }; control.Classes.Add("room"); return control; }
    private static Slider Range(double min, double max, double value) { var slider = new Slider { Minimum = min, Maximum = max, Value = value }; slider.Classes.Add("room"); return slider; }
    private static TextBlock Text(string text, double size, string color) => new() { Text = text, FontSize = size, Foreground = Brush(color), VerticalAlignment = VerticalAlignment.Center };
    private static IBrush Brush(string color) => new SolidColorBrush(Color.Parse(color));
    private static string Time(TimeSpan time) => $"{(int)time.TotalMinutes}:{time.Seconds:00}";
    private static void Add(Panel panel, params Control[] controls) { foreach (var control in controls) panel.Children.Add(control); }
}

internal static partial class BrowserDemoInterop
{
    [JSImport("ready", "AvaVideoPlayer.Demo")] internal static partial void Ready();
    [JSImport("prepareMedia", "AvaVideoPlayer.Demo")] internal static partial Task<string> PrepareMedia(string url);
    [JSImport("openLink", "AvaVideoPlayer.Demo")] internal static partial void OpenLink(string url);
    [JSImport("checksEnabled", "AvaVideoPlayer.Demo")] internal static partial bool ChecksEnabled();
    [JSImport("summary", "AvaVideoPlayer.Demo")] internal static partial string Summary();
    [JSImport("saveReport", "AvaVideoPlayer.Demo")] internal static partial void SaveReport();
}
