[CmdletBinding()]
param(
    [ValidateRange(1, 60)]
    [int]$Seconds = 15,
    [string]$Title = "MyBuddy-AI test notification",
    [string]$Message = "Build failed: 3 tests are failing. Can you suggest what to check next?"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase

$window = [System.Windows.Window]::new()
$window.Title = "MyBuddy-AI Fake Toast"
$window.Width = 390
$window.Height = 118
$window.WindowStyle = [System.Windows.WindowStyle]::None
$window.ResizeMode = [System.Windows.ResizeMode]::NoResize
$window.AllowsTransparency = $true
$window.Background = [System.Windows.Media.Brushes]::Transparent
$window.Topmost = $true
$window.ShowInTaskbar = $false
$window.ShowActivated = $false
$window.Left = [System.Windows.SystemParameters]::WorkArea.Right - $window.Width - 22
$window.Top = [System.Windows.SystemParameters]::WorkArea.Bottom - $window.Height - 22

$border = [System.Windows.Controls.Border]::new()
$border.CornerRadius = [System.Windows.CornerRadius]::new(14)
$border.BorderThickness = [System.Windows.Thickness]::new(1)
$border.BorderBrush = [System.Windows.Media.SolidColorBrush]::new([System.Windows.Media.Color]::FromRgb(97, 231, 255))
$border.Background = [System.Windows.Media.SolidColorBrush]::new([System.Windows.Media.Color]::FromRgb(16, 23, 41))
$border.Padding = [System.Windows.Thickness]::new(16, 13, 16, 13)
$border.Effect = [System.Windows.Media.Effects.DropShadowEffect]@{
    BlurRadius = 18
    ShadowDepth = 4
    Opacity = 0.45
}

$stack = [System.Windows.Controls.StackPanel]::new()
$titleBlock = [System.Windows.Controls.TextBlock]::new()
$titleBlock.Text = $Title
$titleBlock.Foreground = [System.Windows.Media.SolidColorBrush]::new([System.Windows.Media.Color]::FromRgb(97, 231, 255))
$titleBlock.FontSize = 13
$titleBlock.FontWeight = [System.Windows.FontWeights]::Bold
$messageBlock = [System.Windows.Controls.TextBlock]::new()
$messageBlock.Text = $Message
$messageBlock.Foreground = [System.Windows.Media.SolidColorBrush]::new([System.Windows.Media.Color]::FromRgb(236, 243, 255))
$messageBlock.FontSize = 14
$messageBlock.Margin = [System.Windows.Thickness]::new(0, 8, 0, 0)
$messageBlock.TextWrapping = [System.Windows.TextWrapping]::Wrap
$stack.Children.Add($titleBlock) | Out-Null
$stack.Children.Add($messageBlock) | Out-Null
$border.Child = $stack
$window.Content = $border

$timer = [System.Windows.Threading.DispatcherTimer]::new()
$timer.Interval = [TimeSpan]::FromSeconds($Seconds)
$timer.Add_Tick({
    $timer.Stop()
    $window.Close()
})
$window.Add_ContentRendered({ $timer.Start() })
$window.ShowDialog() | Out-Null
