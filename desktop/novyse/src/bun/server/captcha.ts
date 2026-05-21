export function handleCaptchaRequest(
  req: Request,
  corsHeaders: HeadersInit,
): Response {
  return new Response(
    `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cloudflare Turnstile Verification</title>
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
        <style>
            body, html {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                background-color: transparent;
                overflow: hidden;
            }
            #turnstile-container {
                display: flex;
                justify-content: center;
                align-items: center;
            }
        </style>
    </head>
    <body>
        <div id="turnstile-container"></div>
        <script>
            window.onload = function() {
                if (window.turnstile) {
                    window.turnstile.render('#turnstile-container', {
                        sitekey: '0x4AAAAAACvBX17HadrEqUCS',
                        callback: function(token) {
                            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.electrobun) {
                                window.webkit.messageHandlers.electrobun.postMessage(
                                    JSON.stringify({
                                        id: "captcha-completed",
                                        token: token
                                    })
                                );
                            }
                        },
                        'error-callback': function(err) {
                            console.error("Turnstile error:", err);
                        }
                    });
                } else {
                    console.error("Turnstile script not loaded.");
                }
            };
        </script>
    </body>
    </html>`,
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html",
      },
    },
  );
}
