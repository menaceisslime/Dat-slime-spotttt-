const express = require("express");
const ytdl = require("ytdl-core");
const yts = require("yt-search");
const archiver = require("archiver");
const cors = require("cors");

const app = express();
app.use(cors());

// ---------- Helpers ----------
function safeFileName(name) {
  return name
    .replace(/[\/\\?%*:|"<>]/g, "") // remove invalid filename chars
    .trim()
    .slice(0, 120);
}

function sendNotFound(res, msg = "Not found") {
  res.status(404).send(msg);
}

function sendError(res, msg = "Error") {
  res.status(500).send(msg);
}

// ---------- FRONTEND ----------
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>DA SLIME SPOT🐍</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
*{box-sizing:border-box}
body{
  margin:0;
  height:100vh;
  font-family:'Segoe UI',sans-serif;
  background:url("https://image2url.com/r2/default/images/1768678218647-6f4528e1-1d93-42bc-ab9b-6717332aeb37.jpeg") no-repeat center/cover;
  color:#00ff6a;
  overflow:hidden;
  cursor:url("https://i.imgur.com/6n4m8nV.png"), auto;
}
.overlay{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,0.65);
}
.menu{
  position:absolute;
  top:20px;
  right:20px;
  z-index:3;
  display:flex;
  gap:15px;
}
.menu button{
  padding:10px 18px;
  border-radius:20px;
  border:2px solid #00ff6a;
  background:rgba(0,0,0,0.6);
  color:#00ff6a;
  cursor:pointer;
  font-size:14px;
  box-shadow:0 0 10px #00ff6a;
}
.menu button:hover{
  background:#00ff6a;
  color:black;
}
.container{
  position:relative;
  z-index:2;
  text-align:center;
  padding-top:18vh;
}
h1{
  font-size:4rem;
  text-shadow:0 0 15px #00ff6a,0 0 30px #00ff6a;
}
input{
  padding:15px;
  width:340px;
  border-radius:30px;
  border:2px solid #00ff6a;
  background:rgba(0,0,0,0.6);
  color:#00ff6a;
  font-size:16px;
  outline:none;
}
input::placeholder{color:#66ffb3}
#status{
  margin-top:20px;
  font-size:14px;
}
select{
  padding:12px;
  border-radius:20px;
  border:2px solid #00ff6a;
  background:rgba(0,0,0,0.6);
  color:#00ff6a;
  font-size:14px;
  outline:none;
  margin-left:10px;
}
.emoji{
  position:absolute;
  font-size:2rem;
  opacity:.5;
  animation:float 14s linear infinite;
}
@keyframes float{
  from{top:100%}
  to{top:-10%}
}
.slime{
  position:absolute;
  width:80px;
  height:80px;
  background:rgba(0,255,106,0.25);
  border-radius:50%;
  box-shadow: 0 0 30px rgba(0,255,106,0.8);
  animation:drip 3s infinite ease-in-out;
  left:50%;
  transform:translateX(-50%);
  top:-40px;
  z-index:4;
}
@keyframes drip{
  0%{top:-40px; transform:translateX(-50%) scale(1);}
  50%{top:30px; transform:translateX(-50%) scale(1.1);}
  100%{top:-40px; transform:translateX(-50%) scale(1);}
}
.slime:after{
  content:"";
  position:absolute;
  width:50px;
  height:50px;
  background:rgba(0,255,106,0.35);
  border-radius:50%;
  left:15px;
  top:50px;
  animation:drip2 3s infinite ease-in-out;
}
@keyframes drip2{
  0%{top:50px; opacity:0;}
  50%{top:100px; opacity:1;}
  100%{top:50px; opacity:0;}
}
</style>
</head>
<body>

<div class="overlay"></div>
<div class="slime"></div>

<div class="menu">
  <button onclick="setMode('song')">🎵 Song</button>
  <button onclick="setMode('album')">💿 Album</button>
  <button onclick="setMode('video')">🎬 Video</button>
</div>

<div class="emoji" style="left:10%">🎶</div>
<div class="emoji" style="left:30%;animation-delay:3s">🎵</div>
<div class="emoji" style="left:55%;animation-delay:6s">🎧</div>
<div class="emoji" style="left:80%;animation-delay:9s">🎤</div>

<div class="container">
  <h1>DA SLIME SPOT🐍</h1>
  <p id="modeText">Download Song (MP3)</p>

  <input id="input" placeholder="Enter song title..." />

  <select id="quality">
    <option value="720p">720p</option>
    <option value="1080p">1080p</option>
  </select>

  <br><br>
  <button onclick="download()">DOWNLOAD</button>

  <div id="status"></div>
</div>

<script>
let mode="song";

function setMode(m){
  mode=m;
  const text={
    song:"Download Song (MP3)",
    album:"Download Album (ZIP)",
    video:"Download Music Video (MP4)"
  };
  document.getElementById("modeText").innerText=text[m];
}

function download(){
  const value=document.getElementById("input").value;
  const quality=document.getElementById("quality").value;
  if(!value) return;

  document.getElementById("status").innerText="🐍 Slime processing...";

  if(mode==="song")
    window.location.href="/download?song="+encodeURIComponent(value);

  if(mode==="album")
    window.location.href="/album?album="+encodeURIComponent(value);

  if(mode==="video")
    window.location.href="/video?video="+encodeURIComponent(value)+"&quality="+quality;
}
</script>

</body>
</html>`);
});

// ---------- SONG (MP3) ----------
app.get("/download", async (req, res) => {
  try {
    const q = req.query.song;
    if (!q) return sendNotFound(res, "Missing song query");

    const search = await yts(q);
    const video = search.videos[0];
    if (!video) return sendNotFound(res, "No results found");

    const filename = safeFileName(video.title) + ".mp3";
    res.header("Content-Disposition", `attachment; filename="${filename}"`);
    ytdl(video.url, { filter: "audioonly" }).pipe(res);
  } catch (e) {
    sendError(res, "Failed to download audio");
  }
});

// ---------- ALBUM (ZIP) ----------
app.get("/album", async (req, res) => {
  try {
    const q = req.query.album;
    if (!q) return sendNotFound(res, "Missing album query");

    const search = await yts(q);
    const tracks = search.videos.slice(0, 10);
    if (!tracks.length) return sendNotFound(res, "No results found");

    const filename = safeFileName(q) + ".zip";
    res.header("Content-Disposition", `attachment; filename="${filename}"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => sendError(res, err.message));
    archive.pipe(res);

    for (const t of tracks) {
      const title = safeFileName(t.title) + ".mp3";
      archive.append(ytdl(t.url, { filter: "audioonly" }), { name: title });
    }

    archive.finalize();
  } catch (e) {
    sendError(res, "Failed to create album zip");
  }
});

// ---------- VIDEO (MP4) ----------
app.get("/video", async (req, res) => {
  try {
    const q = req.query.video;
    if (!q) return sendNotFound(res, "Missing video query");

    const search = await yts(q);
    const video = search.videos[0];
    if (!video) return sendNotFound(res, "No results found");

    const info = await ytdl.getInfo(video.url);
    const formats = ytdl.filterFormats(info.formats, "videoandaudio");

    // Prefer requested quality, fallback to best available
    const desired = req.query.quality === "1080p" ? "1080p" : "720p";
    let chosen = formats.find(f => f.qualityLabel === desired);

    if (!chosen) {
      chosen = formats
        .sort((a, b) => (parseInt(b.qualityLabel) || 0) - (parseInt(a.qualityLabel) || 0))[0];
    }

    if (!chosen) return sendNotFound(res, "No downloadable format found");

    const filename = safeFileName(video.title) + ".mp4";
    res.header("Content-Disposition", `attachment; filename="${filename}"`);

    ytdl(video.url, { format: chosen }).pipe(res);
  } catch (e) {
    sendError(res, "Failed to download video");
  }
});

// ---------- START ----------
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🐍 DA SLIME SPOT LIVE → http://localhost:${port}`);
});
