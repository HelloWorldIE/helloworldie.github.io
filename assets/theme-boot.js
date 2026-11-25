/* Runs first, in <head>: applies the saved theme before the page draws. Light unless the viewer
   chose dark with the switch; the device setting alone never switches it (brand: light is the
   default, dark is an equal choice). Also hides a page that someone frames (clickjacking). */
(function () {
  var t = 'light';
  try { if (localStorage.getItem('hw_theme') === 'dark') t = 'dark'; } catch (e) {}
  document.documentElement.setAttribute('data-theme', t);
  if (window.top !== window.self) {
    document.documentElement.style.display = 'none';
  }
})();
