try {
  const { dotnet } = await import('./_framework/dotnet.js');
  const runtime = await dotnet.withDiagnosticTracing(false).create();
  await runtime.runMain(runtime.getConfig().mainAssemblyName, []);
} catch (error) {
  console.error('AvaVideoPlayer startup failed:', error);
  const screen = document.querySelector('.loading-screen');
  if (screen) {
    screen.classList.add('loading-failed');
    screen.querySelector('.loading-caption').textContent = 'The player could not start';
    screen.querySelector('.loading-note').textContent = location.protocol === 'file:'
      ? 'Open this app over HTTP or HTTPS.' : 'Check your connection and try again.';
    const retry = document.createElement('button');
    retry.className = 'loading-retry';
    retry.textContent = 'Try again';
    retry.onclick = () => location.reload();
    screen.querySelector('.loading-card').append(retry);
    screen.setAttribute('role', 'alert');
  }
}
