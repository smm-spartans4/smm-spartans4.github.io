# One-off. Slices icons/warriors-sheet.jpg into the round player portraits.
#   powershell -File tools/slice-players.ps1
#
# NOT a build step - the site never runs it. It exists so the portraits can be
# regenerated if the artwork is replaced. PowerShell rather than Node because
# the source is a JPEG, and decoding one by hand is a great deal of work for a
# job Windows already does.
#
# The sheet is a 3-column grid; tile 5 is the tall figure spanning two rows.

Add-Type -AssemblyName System.Drawing
$base = Join-Path $PSScriptRoot ".." | Resolve-Path
$img = [System.Drawing.Image]::FromFile("$base\icons\warriors-sheet.jpg")
$out = "$base\icons\players"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$x0 = 23.0; $y0 = 23.0
$cw = (873.0 - $x0) / 3.0
$ch = (1169.0 - $y0) / 4.0
$cells = @(
  @{n=1;  c=0; r=0; rs=1}, @{n=2;  c=1; r=0; rs=1}, @{n=3;  c=2; r=0; rs=1},
  @{n=4;  c=0; r=1; rs=1}, @{n=5;  c=1; r=1; rs=2}, @{n=6;  c=2; r=1; rs=1},
  @{n=7;  c=0; r=2; rs=1}, @{n=8;  c=2; r=2; rs=1},
  @{n=9;  c=0; r=3; rs=1}, @{n=10; c=1; r=3; rs=1}, @{n=11; c=2; r=3; rs=1}
)
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$qp = New-Object System.Drawing.Imaging.EncoderParameters(1)
$qp.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 82)

foreach ($cell in $cells) {
  $cx = $x0 + $cell.c * $cw
  $cy = $y0 + $cell.r * $ch
  $chgt = $ch * $cell.rs
  $side = [Math]::Min($cw, $chgt)
  $sx = $cx + ($cw - $side) / 2
  # bias the tall tile upward so the head survives the square crop
  $sy = if ($cell.rs -gt 1) { $cy + ($chgt - $side) * 0.15 } else { $cy + ($chgt - $side) / 2 }
  $inset = $side * 0.06        # trim the pale surround
  $sx += $inset; $sy += $inset; $side -= $inset * 2

  $size = 96                   # displayed at 44px, so this covers retina
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  # integer rectangles on purpose: the RectangleF overload does not bind here
  $dst = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $srcR = New-Object System.Drawing.Rectangle ([int]$sx), ([int]$sy), ([int]$side), ([int]$side)
  $g.DrawImage($img, $dst, $srcR, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $bmp.Save(("{0}\warrior-{1:d2}.jpg" -f $out, $cell.n), $enc, $qp)
  $bmp.Dispose()
}
$img.Dispose()
"wrote $((Get-ChildItem $out -Filter *.jpg).Count) portraits"
