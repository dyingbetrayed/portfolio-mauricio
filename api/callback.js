export default async function handler(req, res) {
  const { code } = req.query;
  const client_id = process.env.OAUTH_CLIENT_ID;
  const client_secret = process.env.OAUTH_CLIENT_SECRET;

  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code
      })
    });
    
    const data = await response.json();
    const token = data.access_token;
    
    if (!token) {
      return res.status(400).send('Error obtaining token from GitHub');
    }

    const content = `
      <!DOCTYPE html>
      <html>
      <head><title>Autorizando...</title></head>
      <body>
        <script>
          (function() {
            function receiveMessage(e) {
              window.opener.postMessage(
                'authorization:github:success:{"token":"${token}","provider":"github"}',
                e.origin
              );
              window.removeEventListener("message", receiveMessage, false);
              setTimeout(() => window.close(), 100);
            }
            window.addEventListener("message", receiveMessage, false);
            window.opener.postMessage("authorizing:github", "*");
          })();
        </script>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(content);
  } catch (error) {
    console.error(error);
    res.status(500).send('Authentication Error');
  }
}
