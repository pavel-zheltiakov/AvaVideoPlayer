using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Layout;
using Avalonia.Media;
using Avalonia.Styling;
using Avalonia.Themes.Fluent;

namespace AvaVideoPlayer.Sample;

public sealed class App : Application
{
    public static Uri? StartupSource { get; set; }
    public static bool Startup360 { get; set; }
    public override void Initialize() { Styles.Add(new FluentTheme()); RequestedThemeVariant = ThemeVariant.Dark; }
    public override void OnFrameworkInitializationCompleted()
    {
        var view = new SampleView();
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            var window = new Window { Title = "Ava Video Player", Width = 1180, Height = 800, MinWidth = 500, MinHeight = 560, Content = view };
            window.Closed += async (_, _) => await view.Player.DisposeAsync();
            desktop.MainWindow = window;
        }
        else if (ApplicationLifetime is ISingleViewApplicationLifetime single) single.MainView = view;
        base.OnFrameworkInitializationCompleted();
    }
}

public sealed class SampleView : UserControl
{
    public VideoPlayer Player { get; } = new();
    public SampleView()
    {
        var root = new Grid { RowDefinitions = new RowDefinitions("Auto,*"), Background = new SolidColorBrush(Color.Parse("#11151D")) };
        var header = new StackPanel { Margin = new Thickness(16), Spacing = 8 };
        header.Children.Add(new TextBlock { Text = "AVA / VIDEO", FontSize = 24, FontWeight = FontWeight.SemiBold });
        header.Children.Add(new TextBlock { Text = "Video, subtitles and a view in every direction.", Opacity = .65 });
        var source = new TextBox { PlaceholderText = "Paste a direct video URL (MP4, WebM, HLS…)", HorizontalAlignment = HorizontalAlignment.Stretch };
        var error = new TextBlock { Foreground = Brushes.OrangeRed, TextWrapping = TextWrapping.Wrap, IsVisible = false };
        var open = new Button { Content = "Open URL" };
        var input = new Grid { ColumnDefinitions = new ColumnDefinitions("*,Auto"), ColumnSpacing = 8 };
        input.Children.Add(source); Grid.SetColumn(open, 1); input.Children.Add(open); header.Children.Add(input);
        header.Children.Add(error);
        async Task Load()
        {
            if (Uri.TryCreate(source.Text, UriKind.Absolute, out var uri))
            {
                try { error.IsVisible = false; await Player.OpenAsync(uri); }
                catch (Exception e) { error.Text = e.Message; error.IsVisible = true; }
            }
            else { error.Text = "Enter an absolute media URL."; error.IsVisible = true; }
        }
        open.Click += async (_, _) => await Load();
        source.KeyDown += async (_, e) => { if (e.Key == Avalonia.Input.Key.Enter) await Load(); };
        root.Children.Add(header); Grid.SetRow(Player, 1); root.Children.Add(Player);
        Content = root;
        if (App.Startup360) Player.SetProjection(VideoProjection.Equirectangular);
        Player.Source = App.StartupSource;
    }
}
