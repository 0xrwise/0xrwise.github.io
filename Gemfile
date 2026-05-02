source "https://rubygems.org"

# ── RUBY VERSION ─────────────────────────────────────────────
# Minimum Ruby 3.0 required for Jekyll 4.3
ruby ">= 3.0.0"

# ── JEKYLL CORE ──────────────────────────────────────────────
gem "jekyll", "~> 4.3"

# Required by Jekyll 4.x on Ruby 3.x (WEBrick no longer bundled)
gem "webrick", "~> 1.8"

# ── PLUGINS ──────────────────────────────────────────────────
group :jekyll_plugins do
  gem "jekyll-feed",    "~> 0.17"
  gem "jekyll-seo-tag", "~> 2.8"
end

# ── PLATFORM-SPECIFIC FIXES ──────────────────────────────────
# Windows & JRuby: timezone data not included in the OS
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo",      "~> 2.0"
  gem "tzinfo-data"
end

# Windows: http_parser compatibility fix
gem "http_parser.rb", "~> 0.8", platforms: [:mingw, :x64_mingw, :mswin]

# Needed on some Linux distros and macOS with system Ruby
gem "csv",    "~> 3.0"
gem "base64", "~> 0.2"
gem "bigdecimal"
