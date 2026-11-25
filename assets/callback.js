/* The sign-in popup lands here. It hands the code back to the hub page that opened it (same
   address only), clears the code from the address and history, and closes. It never answers
   inside a frame and never talks to anything else. */
(function () {
  var msg = document.getElementById('msg');
  var q = new URLSearchParams(location.search);
  var code = q.get('code'), state = q.get('state'), error = q.get('error');
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  if (window.top !== window.self) { msg.textContent = 'This page cannot be shown inside another page.'; return; }
  if (!window.opener || window.opener.closed) {
    msg.textContent = 'Signing in only works from the hub. Close this window and select Sign in on https://helloworldie.github.io/.';
    return;
  }
  try {
    window.opener.postMessage({ type: 'hw-auth', code: code, state: state, error: error }, location.origin);
  } catch (e) {
    msg.textContent = 'The hub window could not be reached. Close this window and try again.';
    return;
  }
  msg.textContent = 'Signed in. This window closes by itself.';
  setTimeout(function () { window.close(); }, 300);
})();
