#!/bin/bash
# QA snapshots. usage (via yt): yt qa              every scene's middle (+ transition midpoints if few scenes)
#                               yt qa 12.5 40      exact times
#                               yt qa 120-240      every scene whose middle falls in that time range
# Output: qa/sheet-N.jpg (12 frames each, 4x3, time + layout + source line stamped). Read every sheet.
set -uo pipefail
K="$1"; shift
HF="npx -y hyperframes@0.8.162"
node "$K/engine/build.mjs" >/dev/null || { node "$K/engine/build.mjs" | tail -25; exit 1; }
TIMES=$(node -e '
const tl=require(process.cwd()+"/.yt/timeline.json"), a=process.argv.slice(1);
let out=[];
if(a.length && !a[0].includes("-")) out=a.map(Number);
else{ const [lo,hi]=a.length?a[0].split("-").map(Number):[0,1e9];
  for(const s of tl.scenes){const m=s.start+Math.min(s.dur*0.62,s.dur-0.4); if(m>=lo&&m<=hi) out.push(+m.toFixed(2));}
  if(out.length<10) for(const s of tl.scenes) if(s.start>0&&s.start>=lo&&s.start<=hi) out.push(+(s.start+0.02).toFixed(2));
}
console.log([...new Set(out)].sort((x,y)=>x-y).join(","));' "$@")
[ -n "$TIMES" ] || { echo "no frames in that range"; exit 1; }
rm -rf qa/snaps; mkdir -p qa
$HF snapshot --at "$TIMES" --no-end --output qa/snaps --describe false --timeout 20000 >qa/snapshot.log 2>&1 || { tail -20 qa/snapshot.log; exit 1; }
rm -f qa/sheet-*.jpg
node -e '
const fs=require("fs"),tl=require(process.cwd()+"/.yt/timeline.json");
const files=fs.readdirSync("qa/snaps").filter(f=>f.endsWith(".png")&&!f.includes("contact")).sort((a,b)=>parseFloat(a.replace(/[^\d.]/g,""))-parseFloat(b.replace(/[^\d.]/g,"")));
const lab=files.map(f=>{const t=parseFloat(f.match(/([\d.]+)s?\.png$/)?.[1]||f.replace(/[^\d.]/g,""));const s=[...tl.scenes].reverse().find(s=>s.start<=t+1e-3)||tl.scenes[0];return f+"\t"+(Math.floor(t/60)+"m"+(t%60).toFixed(1).padStart(4,"0")+"s")+"  @"+s.layout+(s.line?"  L"+s.line:"");});
fs.writeFileSync("qa/list.txt",lab.join("\n"));'
"${YT_PY:-$HOME/yt-explainers/.venv/bin/python}" "$K/engine/sheet.py" "$K"
echo "look at every sheet (Read the jpg). Fix video.md, rerun yt qa <range> for the scenes you changed."
