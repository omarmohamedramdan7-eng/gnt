import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { execSync, spawn } from "child_process";
import { createServer as createViteServer } from "vite";
import https from "https";
import http from "http";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Ensure yt-dlp is available at startup
async function ensureYtdlp() {
  const binDir = path.join(process.cwd(), "bin");
  const ytdlpPath = path.join(binDir, "yt-dlp");

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  if (!fs.existsSync(ytdlpPath)) {
    console.log("yt-dlp not found. Downloading the latest release...");
    try {
      execSync(`curl -L -o "${ytdlpPath}" https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp`, {
        stdio: "inherit",
      });
      execSync(`chmod +x "${ytdlpPath}"`, { stdio: "inherit" });
      console.log("yt-dlp downloaded and configured successfully.");
    } catch (error) {
      console.error("Failed to download yt-dlp via curl:", error);
    }
  } else {
    console.log("yt-dlp already exists at:", ytdlpPath);
    try {
      const version = execSync(`python3 "${ytdlpPath}" --version`).toString().trim();
      console.log(`yt-dlp version: ${version}`);
    } catch (e) {
      console.error("Error executing yt-dlp test:", e);
    }
  }
}

// URL Validation helper (Supports YouTube Shorts, TikTok, Instagram Reels, Facebook, X/Twitter, Snapchat Spotlight, Pinterest, LinkedIn)
function validateUrl(inputUrl: string): { isValid: boolean; platform: string; cleanUrl: string } {
  if (!inputUrl || typeof inputUrl !== "string") {
    return { isValid: false, platform: "", cleanUrl: "" };
  }

  const trimmed = inputUrl.trim();
  
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i;
  const tiktokRegex = /^(https?:\/\/)?(www\.|vm\.|vt\.|v\.)?tiktok\.com\/.+$/i;
  const instagramRegex = /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv|reels|stories)\/.+$/i;
  const facebookRegex = /^(https?:\/\/)?(www\.|web\.|m\.)?(facebook\.com|fb\.watch|fb\.gg)\/.+$/i;
  const twitterRegex = /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/.+$/i;
  const snapchatRegex = /^(https?:\/\/)?(www\.|story\.)?snapchat\.com\/.+$/i;
  const pinterestRegex = /^(https?:\/\/)?(www\.|pin\.)?(pinterest\.com|pin\.it)\/.+$/i;
  const linkedinRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/.+$/i;

  if (youtubeRegex.test(trimmed)) {
    return { isValid: true, platform: "YouTube", cleanUrl: trimmed };
  } else if (tiktokRegex.test(trimmed)) {
    return { isValid: true, platform: "TikTok", cleanUrl: trimmed };
  } else if (instagramRegex.test(trimmed)) {
    return { isValid: true, platform: "Instagram", cleanUrl: trimmed };
  } else if (facebookRegex.test(trimmed)) {
    return { isValid: true, platform: "Facebook", cleanUrl: trimmed };
  } else if (twitterRegex.test(trimmed)) {
    return { isValid: true, platform: "X / Twitter", cleanUrl: trimmed };
  } else if (snapchatRegex.test(trimmed)) {
    return { isValid: true, platform: "Snapchat", cleanUrl: trimmed };
  } else if (pinterestRegex.test(trimmed)) {
    return { isValid: true, platform: "Pinterest", cleanUrl: trimmed };
  } else if (linkedinRegex.test(trimmed)) {
    return { isValid: true, platform: "LinkedIn", cleanUrl: trimmed };
  }

  return { isValid: false, platform: "", cleanUrl: "" };
}

// Registration disabled (direct guest mode only)

// API: Extract video information
app.post("/api/extract", async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: "يرجى توفير رابط الفيديو.",
    });
  }

  const { isValid, platform, cleanUrl } = validateUrl(url);

  if (!isValid) {
    return res.status(400).json({
      success: false,
      error: "الرابط غير صالح. يرجى إدخال رابط صحيح من TikTok, YouTube, Instagram, Facebook, X, Snapchat, Pinterest أو LinkedIn.",
    });
  }

  console.log(`Extracting metadata for ${platform} URL: ${cleanUrl}`);

  const ytdlpPath = path.join(process.cwd(), "bin", "yt-dlp");

  const args = [
    ytdlpPath,
    "-j",
    "--no-playlist",
    "--no-warnings",
    cleanUrl
  ];

  const child = spawn("python3", args);

  let stdoutData = "";
  let stderrData = "";

  child.stdout.on("data", (chunk) => {
    stdoutData += chunk.toString();
  });

  child.stderr.on("data", (chunk) => {
    stderrData += chunk.toString();
  });

  child.on("close", (code) => {
    if (code !== 0) {
      console.error(`yt-dlp process exited with code ${code}`);
      console.error(`stderr: ${stderrData}`);
      
      let friendlyError = "فشل في جلب بيانات الفيديو. يرجى التأكد من أن الفيديو عام وغير محذوف، ثم أعد المحاولة.";
      if (stderrData.includes("Private video") || stderrData.includes("Sign in")) {
        friendlyError = "هذا الفيديو خاص أو يتطلب تسجيل دخول لمشاهدته.";
      } else if (stderrData.includes("Incomplete YouTube ID") || stderrData.includes("Video unavailability") || stderrData.includes("404")) {
        friendlyError = "لم يتم العثور على الفيديو. قد يكون محذوفاً أو الرابط غير صحيح.";
      }

      return res.status(500).json({
        success: false,
        error: friendlyError,
        rawError: stderrData.substring(0, 200),
      });
    }

    try {
      const info = JSON.parse(stdoutData);

      const title = info.title || info.description || "فيديو بدون عنوان";
      const thumbnail = info.thumbnail || (info.thumbnails && info.thumbnails.length > 0 ? info.thumbnails[info.thumbnails.length - 1].url : "");
      const duration = info.duration || 0;

      let videoUrl = "";
      const parsedFormats: Array<{
        id: string;
        label: string;
        quality: string;
        url: string;
        size?: string;
      }> = [];

      if (info.formats && Array.isArray(info.formats)) {
        // 1. Audio extract
        const audioFormats = info.formats.filter((f: any) => f.acodec !== "none" && f.vcodec === "none" && f.url);
        if (audioFormats.length > 0) {
          audioFormats.sort((a: any, b: any) => (b.abr || 0) - (a.abr || 0));
          parsedFormats.push({
            id: audioFormats[0].format_id || "audio",
            label: "تحميل الصوت فقط (MP3 / جودة عالية)",
            quality: "audio",
            url: audioFormats[0].url,
            size: audioFormats[0].filesize ? `${(audioFormats[0].filesize / (1024 * 1024)).toFixed(1)} MB` : undefined,
          });
        } else {
          const anyFormat = info.formats.find((f: any) => f.url);
          if (anyFormat) {
            parsedFormats.push({
              id: "audio_extracted",
              label: "تحميل الصوت فقط (MP3)",
              quality: "audio",
              url: anyFormat.url,
            });
          }
        }

        // 2. Video formats with height categories
        const allVideoFormats = info.formats.filter((f: any) => f.vcodec !== "none" && f.url);
        const categories = [
          { key: "1080p", label: "جودة عالية جداً 1080p (Full HD)", minHeight: 1000, maxHeight: 1200 },
          { key: "720p", label: "جودة عالية 720p (HD)", minHeight: 700, maxHeight: 999 },
          { key: "480p", label: "جودة متوسطة 480p (SD)", minHeight: 360, maxHeight: 699 },
        ];

        categories.forEach((cat) => {
          const matches = allVideoFormats.filter((f: any) => {
            const h = f.height || 0;
            return h >= cat.minHeight && h <= cat.maxHeight;
          });

          if (matches.length > 0) {
            matches.sort((a: any, b: any) => {
              const aCombined = a.acodec !== "none" && a.acodec !== undefined;
              const bCombined = b.acodec !== "none" && b.acodec !== undefined;
              if (aCombined && !bCombined) return -1;
              if (!aCombined && bCombined) return 1;
              return (b.height || 0) - (a.height || 0);
            });

            const best = matches[0];
            parsedFormats.push({
              id: best.format_id || cat.key,
              label: cat.label + (best.acodec === "none" || !best.acodec ? " (بدون صوت)" : ""),
              quality: cat.key,
              url: best.url,
              size: best.filesize ? `${(best.filesize / (1024 * 1024)).toFixed(1)} MB` : undefined,
            });
          }
        });

        // 3. Mixed combined formats
        const mixedFormats = info.formats.filter((f: any) => f.vcodec !== "none" && f.acodec !== "none" && f.url);
        if (mixedFormats.length > 0) {
          mixedFormats.sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
          videoUrl = mixedFormats[0].url;

          // If categories didn't pick up any video formats, add the best mixed format
          if (parsedFormats.filter(f => f.quality !== "audio").length === 0) {
            parsedFormats.push({
              id: mixedFormats[0].format_id || "hd_combined",
              label: `جودة تلقائية HD (${mixedFormats[0].height || "720"}p)`,
              quality: "720p",
              url: mixedFormats[0].url,
              size: mixedFormats[0].filesize ? `${(mixedFormats[0].filesize / (1024 * 1024)).toFixed(1)} MB` : undefined,
            });
          }
        } else {
          const urlFormats = info.formats.filter((f: any) => f.url);
          if (urlFormats.length > 0) {
            urlFormats.sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
            videoUrl = urlFormats[0].url;
          }
        }
      }

      if (!videoUrl) {
        videoUrl = info.url;
      }

      if (!videoUrl) {
        return res.status(422).json({
          success: false,
          error: "لم نتمكن من العثور على رابط تحميل مباشر لهذا الفيديو.",
        });
      }

      // If parsedFormats lacks any video format, push the default one
      if (parsedFormats.filter(f => f.quality !== "audio").length === 0) {
        parsedFormats.push({
          id: "default_fallback",
          label: "جودة افتراضية مدمجة",
          quality: "720p",
          url: videoUrl,
        });
      }

      // Done processing, return response to client

      return res.json({
        success: true,
        title,
        thumbnail,
        url: videoUrl,
        duration,
        platform,
        formats: parsedFormats,
      });
    } catch (parseError) {
      console.error("Error parsing yt-dlp JSON output:", parseError);
      return res.status(500).json({
        success: false,
        error: "حدث خطأ أثناء معالجة بيانات الفيديو من الخادم.",
      });
    }
  });
});

// Helper to make request and follow redirects recursively
function followRedirectsPipe(targetUrl: string, clientRes: express.Response, isAudio = false, maxRedirects = 5) {
  if (maxRedirects <= 0) {
    return clientRes.status(500).send("Too many redirects in video stream.");
  }

  const protocol = targetUrl.startsWith("https") ? https : http;

  const options = {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Encoding": "identity",
      "Connection": "keep-alive"
    }
  };

  const request = protocol.get(targetUrl, options, (res) => {
    if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode)) {
      const redirectUrl = res.headers.location;
      if (redirectUrl) {
        const absoluteUrl = new URL(redirectUrl, targetUrl).toString();
        console.log(`Following redirect to: ${absoluteUrl}`);
        return followRedirectsPipe(absoluteUrl, clientRes, isAudio, maxRedirects - 1);
      }
    }

    if (res.statusCode && res.statusCode >= 400) {
      console.error(`Target CDN returned status code: ${res.statusCode}`);
      return clientRes.status(res.statusCode).send(`فشل جلب الملف من الخادم البعيد برمز الحالة: ${res.statusCode}`);
    }

    if (isAudio) {
      clientRes.setHeader("Content-Type", "audio/mpeg");
    } else if (res.headers["content-type"]) {
      clientRes.setHeader("Content-Type", res.headers["content-type"]);
    } else {
      clientRes.setHeader("Content-Type", "video/mp4");
    }

    if (res.headers["content-length"]) {
      clientRes.setHeader("Content-Length", res.headers["content-length"]);
    }

    res.pipe(clientRes);
  });

  request.on("error", (err) => {
    console.error("Proxy streaming error:", err);
    if (!clientRes.headersSent) {
      clientRes.status(500).send("خطأ أثناء الاتصال بخوادم تحميل الفيديو.");
    }
  });
}

// API: Proxy Video Download (solves CORS and triggers real attachment download)
app.get("/api/proxy", (req, res) => {
  const videoUrl = req.query.url as string;
  const rawTitle = req.query.title as string || "video";
  const isAudio = req.query.audio === "true";

  if (!videoUrl) {
    return res.status(400).send("Missing video URL");
  }

  const cleanTitle = rawTitle
    .replace(/[\\\/:*?"<>|]/g, "")
    .trim() || "video";

  const encodedFilename = encodeURIComponent(cleanTitle);
  const ext = isAudio ? "mp3" : "mp4";
  
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodedFilename}.${ext}`);
  
  console.log(`Streaming proxy download for (isAudio: ${isAudio}): ${videoUrl}`);
  followRedirectsPipe(videoUrl, res, isAudio);
});

// API: Speedtest endpoint for CORS-free download speed measurement
app.get("/api/speedtest", (req, res) => {
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  // Allocate a 1MB buffer of dummy data to measure download speed
  const buffer = Buffer.alloc(1024 * 1024); // 1 MB
  res.send(buffer);
});

async function startServer() {
  await ensureYtdlp();

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: {
          server: httpServer, // Binds the WebSocket server directly to the shared HTTP server on port 3000
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind server correctly to dynamic port (PORT 3000 required for AI Studio iframe preview)
  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`[GNT Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
