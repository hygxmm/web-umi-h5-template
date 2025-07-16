console.log('项目版本 v1.0.0');

(window as any).__chunkLoadErrorReloaded = false;

window.addEventListener('error', function (e) {
  // 检查是否为 chunk 加载失败
  console.log('error', e);
  if (e && e.message && e.message.includes('Loading chunk')) {
    if (!(window as any).__chunkLoadErrorReloaded) {
      (window as any).__chunkLoadErrorReloaded = true;
      // 强制刷新页面，重新拉取最新资源
      window.location.reload();
    }
  }
});
