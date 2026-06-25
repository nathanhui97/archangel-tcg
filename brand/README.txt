Bindar — logo assets
====================

Use SVG wherever possible (crisp at any size). PNGs are provided for places
that need raster (favicons, app/PWA icons, social embeds).

VECTOR (preferred for web/app UI)
  bindar-mark.svg      Radar + card mark only, transparent. Phosphor green #35F58A.
  bindar-icon.svg      App icon — mark on the dark squircle background.
  bindar-lockup.svg    Horizontal lockup: mark + "BINDAR" wordmark (Space Grotesk, 700).

RASTER
  bindar-icon-1024.png / -512.png / -192.png   App + PWA icons (with background)
  apple-touch-icon-180.png                     iOS home-screen icon
  favicon-32.png / favicon-16.png              Browser tab favicons
  bindar-mark-512.png / -256.png               Transparent mark (over dark surfaces)

COLOR
  Phosphor green  #35F58A
  Surface (icon)  #050706  (radial to #0d1812)
  Wordmark        #E6F2EA

WEB SNIPPET
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/logo/favicon-32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/logo/apple-touch-icon-180.png">

NOTE: the lockup wordmark uses the Space Grotesk font. Load that font on the page,
or keep the SVG (text renders with your loaded font). The mark/icon need no font.
