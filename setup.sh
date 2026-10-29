#!/bin/bash
# yt-explainer setup — install or update. Safe to re-run.
#   gh api repos/kushagra-18/yt-explainer/contents/setup.sh -H "Accept: application/vnd.github.raw" | bash
set -euo pipefail
REPO="kushagra-18/yt-explainer"
K="$HOME/.claude/skills/yt-explainer"
Y="$HOME/yt-explainers"
ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
step() { printf '\n\033[1m%s\033[0m\n' "$1"; }

[ "$(uname)" = Darwin ] || { echo "macOS only (uses Homebrew + Google Chrome)"; exit 1; }
command -v brew >/dev/null || { echo "install Homebrew first: https://brew.sh"; exit 1; }

step "1/6 skill"
if [ -d "$K/.git" ]; then git -C "$K" pull --ff-only -q && ok "updated $K"
elif [ -e "$K" ]; then echo "  $K exists but is not a git checkout — move it away and re-run"; exit 1
else
  command -v gh >/dev/null || brew install gh
  gh auth status >/dev/null 2>&1 || gh auth login
  mkdir -p "$(dirname "$K")"; gh repo clone "$REPO" "$K" -- -q && ok "cloned to $K"
fi

step "2/6 tools (Homebrew)"
for pair in ffmpeg:ffmpeg whisper-cli:whisper-cpp node:node uv:uv; do
  bin="${pair%%:*}"; pkg="${pair##*:}"
  command -v "$bin" >/dev/null && ok "$bin" || { brew install "$pkg" && ok "$bin (installed)"; }
done
[ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ] && ok "Google Chrome" \
  || { brew install --cask google-chrome && ok "Google Chrome (installed)"; }

step "3/6 python env"
mkdir -p "$Y/videos" "$Y/.cache"
[ -x "$Y/.venv/bin/python" ] || uv venv -q "$Y/.venv"
uv pip install -q --python "$Y/.venv/bin/python" numpy scipy soundfile pillow && ok "$Y/.venv"

step "4/6 whisper model (word timings, ~470 MB once)"
M="$HOME/.cache/hyperframes/whisper/models/ggml-small.bin"
if [ -s "$M" ]; then ok "ggml-small.bin"; else
  mkdir -p "$(dirname "$M")"
  curl -fL --progress-bar -o "$M.part" https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin && mv "$M.part" "$M" && ok "ggml-small.bin"
fi

step "5/6 yt command + renderer"
chmod +x "$K/bin/yt" "$K/setup.sh" "$K"/engine/*.sh
mkdir -p "$HOME/.local/bin"; ln -sf "$K/bin/yt" "$HOME/.local/bin/yt" && ok "yt -> ~/.local/bin/yt"
case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *)
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"; ok "added ~/.local/bin to PATH in ~/.zshrc (open a new terminal)";; esac
npx -y hyperframes@0.8.162 --version >/dev/null 2>&1 && ok "hyperframes 0.8.162 cached" || echo "  (hyperframes will download on first render)"

step "6/6 Sarvam API key"
have_key() { [ -n "${SARVAM_API_KEY:-}" ] && return 0
  for f in "$Y/.env" "$HOME/insta-reel/.env" "$HOME/stick-reel/.env"; do grep -q '^SARVAM_API_KEY=.' "$f" 2>/dev/null && return 0; done; return 1; }
if have_key; then ok "found"; else
  printf '  paste your Sarvam API key (hidden, saved to %s): ' "$Y/.env"
  read -rs KEY </dev/tty; echo
  [ -n "$KEY" ] && { umask 077; echo "SARVAM_API_KEY=$KEY" >> "$Y/.env"; chmod 600 "$Y/.env"; ok "saved"; } || echo "  skipped — add SARVAM_API_KEY=... to $Y/.env later"
fi

printf '\n\033[1mReady.\033[0m In Claude Code: "make a YouTube explainer on <topic>".  CLI: yt help\n'
