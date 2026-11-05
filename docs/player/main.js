try {
  const runtimeUrl = new URL('./_framework/dotnet.js', import.meta.url);
  runtimeUrl.search = new URL(import.meta.url).search;
  const checksUrl = new URL('./playback-checks.js', import.meta.url);
  checksUrl.search = new URL(import.meta.url).search;
  const [{ dotnet }, { monitor }] = await Promise.all([import(runtimeUrl.href), import(checksUrl.href)]);
  const diagnostics = monitor();
  // Warm the first small fixture while the WebAssembly runtime is downloading.
  diagnostics.prepareMedia(new URL('./media/waterfall-360.mp4', import.meta.url).href).catch(() => {});
  const runtime = await dotnet.withDiagnosticTracing(false).create();
  runtime.setModuleImports('AvaVideoPlayer.Demo', diagnostics);
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
