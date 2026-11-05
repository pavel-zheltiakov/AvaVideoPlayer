using System.Runtime.InteropServices.JavaScript;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Controls.Primitives;
using Avalonia.Layout;
using Avalonia.Media;
using Avalonia.Styling;
using Avalonia.Themes.Fluent;
using Avalonia.Threading;
using AvaVideoPlayer;

namespace AvaVideoPlayer.Sample.Browser;

// All application UI is Avalonia. VideoPlayer embeds the browser media surface in its viewport.
public sealed class BrowserDemoApp : Application
{
    public static Uri BaseUri { get; set; } = null!;
    public override void Initialize()
    {
        Styles.Add(new FluentTheme());
        RequestedThemeVariant = ThemeVariant.Dark;
    }
    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is ISingleViewApplicationLifetime single)
            single.MainView = new ScreeningRoom();
        base.OnFrameworkInitializationCompleted();
        BrowserDemoInterop.Ready();
    }
}

public sealed class ScreeningRoom : UserControl
{
    private sealed record Recording(string Title, string Detail, string[] Files, string[] Formats);
    private readonly Recording[] _recordings = [
        new("Ess-Na-Crub", "Waterfall · Bernard Ladenthin", ["waterfall-360.mp4", "waterfall-360.mov"], ["MP4 · H.264 / AAC", "MOV · H.264 / AAC"]),
        new("Esino Lario", "Village · Jan Ainali", ["village-360.webm", "village-360.mp4"], ["WebM · VP9 / Opus", "MP4 · H.264 / AAC"])
    ];
    public VideoPlayer Player { get; } = new() { ShowControls = false };
    private readonly ComboBox _format = new() { MinWidth = 175 };
    private readonly ComboBox _view = new() { ItemsSource = new[] { "360°", "Flat" }, SelectedIndex = 0, MinWidth = 95 };
    private readonly ComboBox _speed = new() { ItemsSource = new[] { "0.5×", "1×", "1.5×", "2×" }, SelectedIndex = 1, MinWidth = 85 };
    private readonly Slider _seek = new() { Minimum = 0, Maximum = 1 };
    private readonly Slider _volume = new() { Minimum = 0, Maximum = 1, Value = 1, Width = 100 };
    private readonly Button _play = new() { Content = "Play", MinWidth = 85 };
    private readonly TextBlock _time = new() { Text = "00:00 / 00:00", VerticalAlignment = VerticalAlignment.Center };
    private readonly TextBlock _status = new() { Text = "Select a recording, then press Play", Opacity = .65 };
    private readonly TextBlock _error = new() { Foreground = Brushes.Salmon, TextWrapping = TextWrapping.Wrap, IsVisible = false };
    private readonly TextBlock _title = new() { FontSize = 26, FontWeight = FontWeight.SemiBold };
    private readonly Grid _layout = new() { ColumnDefinitions = new("*,300"), ColumnSpacing = 24 };
    private readonly Border _catalog;
    private bool _updating, _scrubbing;
    private readonly SemaphoreSlim _loads = new(1, 1);
    private int _selected;
    private readonly DispatcherTimer _clock;

    public ScreeningRoom()
    {
        var root = new Grid { RowDefinitions = new("Auto,*"), Margin = new Thickness(28), RowSpacing = 22, Background = Brush("#11151D") };
        var heading = new StackPanel { Spacing = 5 };
        heading.Children.Add(new TextBlock { Text = "SCREENING ROOM", FontSize = 11, LetterSpacing = 3, Foreground = Brush("#A9C896") });
        heading.Children.Add(_title);
        root.Children.Add(heading);
        var stage = new Grid { RowDefinitions = new("*,Auto"), RowSpacing = 14 };
        stage.Children.Add(new Border { CornerRadius = new CornerRadius(14), ClipToBounds = true, Background = Brushes.Black, Child = Player });
        var controls = new StackPanel { Spacing = 10 };
        controls.Children.Add(_seek);
        var transport = new WrapPanel { Orientation = Orientation.Horizontal };
        Add(transport, _play, Action("Mute", () => Player.SetVolumeAsync(_volume.Value, !(Player.Snapshot?.IsMuted ?? false))), Action("−5 s", () => Player.SkipAsync(TimeSpan.FromSeconds(-5))), Action("+5 s", () => Player.SkipAsync(TimeSpan.FromSeconds(5))), _time, _speed, _volume,
            Action("Fullscreen", Player.ToggleFullscreenAsync));
        controls.Children.Add(transport);
        var modes = new WrapPanel();
        Add(modes, Label("Format"), _format, Label("View"), _view, Action("Reset view", () => { Player.ResetCamera(); return Task.CompletedTask; }), Action("Open video…", Player.OpenFileAsync));
        controls.Children.Add(modes); controls.Children.Add(_status); controls.Children.Add(_error);
        Grid.SetRow(controls, 1); stage.Children.Add(controls); _layout.Children.Add(stage);
        var library = new StackPanel { Spacing = 14 };
        library.Children.Add(new TextBlock { Text = "VIDEO CATALOG     02", FontSize = 12, FontWeight = FontWeight.SemiBold, Opacity = .6 });
        for (int i = 0; i < _recordings.Length; i++)
        {
            int index = i; var recording = _recordings[i];
            var caption = new StackPanel { Spacing = 7 };
            caption.Children.Add(new TextBlock { Text = recording.Title, FontSize = 20, FontWeight = FontWeight.SemiBold });
            caption.Children.Add(new TextBlock { Text = recording.Detail, FontSize = 12, Opacity = .65, TextWrapping = TextWrapping.Wrap });
            caption.Children.Add(new TextBlock { Text = "360° · original sound · 2 formats", FontSize = 12, Foreground = Brush("#A9C896") });
            var item = new Button { Content = caption, HorizontalAlignment = HorizontalAlignment.Stretch, HorizontalContentAlignment = HorizontalAlignment.Stretch, Padding = new Thickness(18), MinHeight = 135 };
            item.Click += async (_, _) => await Run(() => SelectRecording(index)); library.Children.Add(item);
        }
        var credits = new Expander { Header = "Footage credits", HorizontalAlignment = HorizontalAlignment.Stretch,
            Content = new TextBlock { Text = "Ess-Na-Crub Waterfall — Bernard Ladenthin, CC BY 4.0.\n\nEsino Lario 360 — Jan Ainali, CC BY-SA 4.0.\n\nWikimedia Commons originals. Scaled, transcoded and sound normalized. Village derivatives remain CC BY-SA 4.0.", TextWrapping = TextWrapping.Wrap, FontSize = 12, Margin = new Thickness(0, 10) } };
        library.Children.Add(credits);
        _catalog = new Border { Child = new ScrollViewer { Content = library }, Padding = new Thickness(0, 0, 0, 4) };
        Grid.SetColumn(_catalog, 1); _layout.Children.Add(_catalog); Grid.SetRow(_layout, 1); root.Children.Add(_layout);
        Content = root;
        _play.Click += async (_, _) => await Run(Player.TogglePlaybackAsync);
        _format.SelectionChanged += async (_, _) => { if (!_updating && _format.SelectedIndex >= 0) await Run(LoadRecording); };
        _view.SelectionChanged += (_, _) => Player.SetProjection(_view.SelectedIndex == 0 ? VideoProjection.Equirectangular : VideoProjection.Flat);
        _speed.SelectionChanged += async (_, _) => { if (!_updating) await Run(() => Player.SetPlaybackSpeedAsync(new[] { .5, 1, 1.5, 2 }[Math.Max(0, _speed.SelectedIndex)])); };
        _volume.PropertyChanged += async (_, e) => { if (e.Property == RangeBase.ValueProperty && !_updating) await Run(() => Player.SetVolumeAsync(_volume.Value)); };
        _seek.AddHandler(PointerPressedEvent, (_, _) => _scrubbing = true, Avalonia.Interactivity.RoutingStrategies.Tunnel);
        _seek.AddHandler(PointerReleasedEvent, async (_, _) => { if (_scrubbing) { _scrubbing = false; await Run(() => Player.SeekAsync(TimeSpan.FromSeconds(_seek.Value))); } }, Avalonia.Interactivity.RoutingStrategies.Bubble, true);
        _seek.PointerCaptureLost += (_, _) => _scrubbing = false;
        _seek.KeyUp += async (_, _) => await Run(() => Player.SeekAsync(TimeSpan.FromSeconds(_seek.Value)));
        Player.PlaybackError += (_, error) => { _error.Text = error; _error.IsVisible = true; };
        _clock = new DispatcherTimer(TimeSpan.FromMilliseconds(200), DispatcherPriority.Background, (_, _) => Refresh());
        AttachedToVisualTree += async (_, _) => { _clock.Start(); await Run(() => SelectRecording(0)); };
        DetachedFromVisualTree += (_, _) => _clock.Stop();
        SizeChanged += (_, _) =>
        {
            bool narrow = Bounds.Width < 850;
            _layout.ColumnDefinitions = new ColumnDefinitions(narrow ? "*" : "*,300");
            _layout.RowDefinitions = new RowDefinitions(narrow ? "*,210" : "*");
            Grid.SetColumn(_catalog, narrow ? 0 : 1); Grid.SetRow(_catalog, narrow ? 1 : 0);
        };
    }
    private async Task SelectRecording(int index)
    {
        _selected = index; _title.Text = _recordings[index].Title;
        _updating = true; _format.ItemsSource = _recordings[index].Formats; _format.SelectedIndex = 0; _updating = false;
        await LoadRecording();
    }
    private async Task LoadRecording()
    {
        var file = _recordings[_selected].Files[Math.Max(0, _format.SelectedIndex)];
        await _loads.WaitAsync();
        try
        {
            Player.SetProjection(_view.SelectedIndex == 0 ? VideoProjection.Equirectangular : VideoProjection.Flat);
            Player.ResetCamera();
            await Player.OpenAsync(new Uri(BrowserDemoApp.BaseUri, "media/" + file));
            await Player.SetPlaybackSpeedAsync(new[] { .5, 1, 1.5, 2 }[Math.Max(0, _speed.SelectedIndex)]);
            await Player.SetVolumeAsync(_volume.Value);
        }
        finally { _loads.Release(); }
    }
    private void Refresh()
    {
        var snapshot = Player.Snapshot; if (snapshot is null) return;
        _updating = true;
        _play.Content = snapshot.State == PlaybackState.Playing ? "Pause" : "Play";
        _seek.Maximum = Math.Max(1, snapshot.Duration.TotalSeconds);
        if (!_scrubbing) _seek.Value = Math.Clamp(snapshot.Position.TotalSeconds, 0, _seek.Maximum);
        _time.Text = $"{Time(snapshot.Position)} / {Time(snapshot.Duration)}";
        _status.Text = Player.IsSpherical ? $"Drag to orbit · wheel to zoom · {Player.Camera.Yaw:0}° / {Player.Camera.Pitch:0}°" : "Flat video";
        _updating = false;
    }
    private async Task Run(Func<Task> command)
    {
        try { _error.IsVisible = false; await command(); }
        catch (Exception error) { _error.Text = error.Message; _error.IsVisible = true; }
    }
    private Button Action(string label, Func<Task> command)
    { var button = new Button { Content = label }; button.Click += async (_, _) => await Run(command); return button; }
    private static TextBlock Label(string text) => new() { Text = text, VerticalAlignment = VerticalAlignment.Center, Opacity = .6 };
    private static IBrush Brush(string color) => new SolidColorBrush(Color.Parse(color));
    private static string Time(TimeSpan time) => $"{(int)time.TotalMinutes:00}:{time.Seconds:00}";
    private static void Add(Panel panel, params Control[] controls)
    { foreach (var control in controls) { control.Margin = new Thickness(0, 0, 10, 5); panel.Children.Add(control); } }
}

internal static partial class BrowserDemoInterop
{
    [JSImport("ready", "AvaVideoPlayer.Demo")]
    internal static partial void Ready();
}
