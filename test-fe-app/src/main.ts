//import './style.css';
// import { setupCounter } from './counter.ts';
import socketSetup from './socketSetup.ts';
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web Sockets</title>
    <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
    <h1>Test:</h1>
    <button id="ws-open">
        Open Connection
    </button>
    <button id="ws-close">
        Close Connection
    </button>
    <div class="input-block">
        <input type="text" id="ws-input">
        <button id="ws-send">
            Send message
        </button>
    </div>
    <pre id="messages"></pre>
    <script src="/js/app.js"></script>
</body>
</html>
`;
socketSetup();
//setupCounter(document.querySelector<HTMLButtonElement>('#counter')!);
