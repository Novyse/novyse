/**
 * Wraps player-specific body content inside a full HTML document with the
 * standard postMessage bridge already wired up.
 *
 * The bridge exposes:
 * - `sendToParent(data)` — sends a JSON message to the host
 * - `window.addEventListener('message', …)` — listens for commands
 *
 * The player script inside `bodyContent` should:
 * 1. Call `sendToParent({ type: 'ready' })` when initialised
 * 2. Call `sendToParent({ type: 'statechange', state })` on state changes
 * 3. Call `sendToParent({ type: 'timeupdate', currentTime, duration })`
 * 4. React to incoming `{ command, value }` messages (play, pause, seek, volume, mute, unmute)
 */
export function buildPlayerHtml(opts: {
  bodyContent: string;
  headExtra?: string;
  css?: string;
}): string {
  const defaultCss = `body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}`;
  return `<!DOCTYPE html>
    <html><head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <style>${opts.css ?? defaultCss}</style>
    ${opts.headExtra ?? ""}
    </head><body>
    ${opts.bodyContent}
    <script>
    function sendToParent(d){
      var s=JSON.stringify(d);
      if(window.ReactNativeWebView&&typeof window.ReactNativeWebView.postMessage==='function'){
        window.ReactNativeWebView.postMessage(s);
      }else{
        window.parent.postMessage(s,'*');
      }
    }
    window.addEventListener('message',function(e){
      var m;try{m=typeof e.data==='string'?JSON.parse(e.data):e.data;}catch(_){return;}
      if(m&&m.command&&typeof handleCommand==='function') handleCommand(m.command,m.value);
    });
    </script>
    </body></html>
`;
}
