param(
  [string]$BaseUrl = "https://www.canlitv.diy",
  [int]$TimeoutSec = 30
)

$ErrorActionPreference = "Stop"

$main = Invoke-WebRequest -Uri "$BaseUrl/tr" -UseBasicParsing -TimeoutSec $TimeoutSec
$regex = [regex]'<a href="(/[^"#?]+)" title="([^"]*(?:canlı|canli)[^"]*)"'
$raw = @{}

foreach ($m in $regex.Matches($main.Content)) {
  $slug = $m.Groups[1].Value.Trim()

  if ($slug -match '^/(tr|rating|yayin-akisi|blog|televizyonlar|kameralar|favoriler|genel-tv-kanallari|haber-kanallari|spor-kanallari|belgesel-kanallari|cocuk-kanallari|dini-tv-kanallari|yerel-tv-kanallari|turkiye-kanallari|azerbaycan-kanallari|kibris-kanallari|almanya-kanallari)$') {
    continue
  }

  if ($slug -match '^/blog') {
    continue
  }

  if (-not $raw.ContainsKey($slug)) {
    $raw[$slug] = $true
  }
}

$slugs = $raw.Keys | Sort-Object
$results = @()

foreach ($slug in $slugs) {
  $url = "$BaseUrl$slug"

  try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec $TimeoutSec
    $html = $resp.Content

    $mode = "unknown"
    $target = ""
    $title = ""
    $name = ""

    $tm = [regex]::Match($html, '<title>(.*?)</title>')
    if ($tm.Success) {
      $title = $tm.Groups[1].Value
      $nm = [regex]::Match($title, '^(.*?)\s+Canlı\s+izle')
      if ($nm.Success) {
        $name = $nm.Groups[1].Value.Trim()
      }
    }

    if ($html -match '<div id="Player" class="telif-uyari">') {
      $mode = "telif_redirect"
      $rm = [regex]::Match($html, '<div id="Player" class="telif-uyari">[\s\S]*?href="([^"]+)"')
      if ($rm.Success) {
        $target = $rm.Groups[1].Value
      }
    }
    else {
      $sm = [regex]::Match($html, 'document\.getElementById\("Player"\)\.src="([^"]+)"')
      if ($sm.Success) {
        $src = $sm.Groups[1].Value

        if ($src -match 'youtube\.com/embed') {
          $mode = "embedded_youtube"
          $target = $src
        }
        elseif ($src -match 'iframe\.php\?url=') {
          $dm = [regex]::Match($src, 'iframe\.php\?url=([^&]+)')
          if ($dm.Success) {
            $decoded = [uri]::UnescapeDataString($dm.Groups[1].Value)
            $target = $decoded
            if ($decoded -match 'youtube\.com/embed') {
              $mode = "embedded_youtube"
            }
            else {
              $mode = "embedded_iframe_url"
            }
          }
          else {
            $mode = "embedded_iframe_url"
            $target = $src
          }
        }
        else {
          $mode = "embedded_player_src"
          $target = $src
        }
      }
      else {
        $im = [regex]::Match($html, '<iframe id="Player"[^>]*src="([^"]+)"')
        if ($im.Success) {
          $mode = "iframe_src_inline"
          $target = $im.Groups[1].Value
        }
      }
    }

    $results += [pscustomobject]@{
      slug = $slug.TrimStart('/')
      name = $name
      mode = $mode
      target = $target
    }
  }
  catch {
    $results += [pscustomobject]@{
      slug = $slug.TrimStart('/')
      name = ""
      mode = "fetch_error"
      target = ""
    }
  }
}

if (!(Test-Path data)) {
  New-Item -ItemType Directory data | Out-Null
}

$results | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 data/canlitv-reference.json

"Saved: data/canlitv-reference.json"
$results | Group-Object mode | Sort-Object Count -Descending | ForEach-Object { "{0}: {1}" -f $_.Name, $_.Count }
