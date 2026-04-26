"""
SkyNetra AI Engine — api.py
Architecture: Cloudinary (video/frames) + MongoDB (metadata) + FastAPI (API layer)

Step 2: Video Upload API
  - POST /upload_video  → Upload to Cloudinary, store metadata in MongoDB, queue AI pipeline
  - GET  /analysis/{video_id} → Return stored analysis result from MongoDB

Step 3: AI Pipeline (Background Task)
  1. Download video temporarily from Cloudinary
  2. Run YOLOv8 on full video to detect events
  3. Score and select ONLY 5-6 important frames based on detections
  4. Upload selected frames to Cloudinary
  5. Store frame URLs in MongoDB
  6. Send ONLY frames (not video) to Gemini for analysis
  7. Parse Gemini output: severity, incident_type, description
  8. Store Gemini output in MongoDB
  9. If severity > 50 → trigger drone dispatch via Command Center
"""

import os
import uuid
import base64
import tempfile
import shutil
import requests
import time
import json

import cv2
import numpy as np
from ultralytics import YOLO

from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import cloudinary
import cloudinary.uploader
from pymongo import MongoClient
from bson import ObjectId

try:
    import google.genai as genai
    from google.genai import types
except ImportError:
    print("WARNING: google-genai not found. Run: pip install google-genai")
    genai = None

# ─────────────────────────────────────────────
# 1. LOAD ENVIRONMENT
# ─────────────────────────────────────────────
load_dotenv()

GEMINI_API_KEY        = os.getenv("GEMINI_API_KEY")
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY    = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")
MONGODB_URI           = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME       = os.getenv("MONGODB_DB_NAME", "skynetra")

COMMAND_CENTER_URL    = "http://127.0.0.1:5001/report_evidence"

# ─────────────────────────────────────────────
# 2. CLOUDINARY CONFIGURATION
# ─────────────────────────────────────────────
cloudinary.config(
    cloud_name = CLOUDINARY_CLOUD_NAME,
    api_key    = CLOUDINARY_API_KEY,
    api_secret = CLOUDINARY_API_SECRET,
    secure     = True
)

# ─────────────────────────────────────────────
# 3. MONGODB CONNECTION
# ─────────────────────────────────────────────
mongo_client = MongoClient(MONGODB_URI)
db           = mongo_client[MONGODB_DB_NAME]
videos_col   = db["videos"]   # stores video metadata + AI results

# ─────────────────────────────────────────────
# 4. YOLO MODEL (loaded once at startup)
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
YOLO_MODEL_PATH = os.path.join(BASE_DIR, "yolov8n.pt")

print("Loading YOLOv8 model...")
yolo_model = YOLO(YOLO_MODEL_PATH)
print("YOLOv8 model ready.")

# YOLO class IDs relevant to urban emergency detection
# Ref: https://docs.ultralytics.com/datasets/detect/coco/
EMERGENCY_CLASS_IDS = {
    0:  ("person",      3.0),   # Person — high importance
    1:  ("bicycle",     1.5),
    2:  ("car",         1.5),
    3:  ("motorcycle",  1.5),
    5:  ("bus",         1.5),
    7:  ("truck",       1.5),
    56: ("chair",       1.0),   # Overturned chair = possible scene indicator
    63: ("laptop",      0.8),   # Abandoned property
    67: ("phone",       0.8),   # Abandoned property
}

# ─────────────────────────────────────────────
# 5. GEMINI CLIENT
# ─────────────────────────────────────────────
gemini_client = None
if genai and GEMINI_API_KEY:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    print("Gemini client initialized.")
else:
    print("WARNING: Gemini client NOT initialized. Check GEMINI_API_KEY.")

# ─────────────────────────────────────────────
# 6. FASTAPI APP
# ─────────────────────────────────────────────
app = FastAPI(
    title       = "SkyNetra AI Engine",
    description = "Video Upload -> Cloudinary + MongoDB -> AI Pipeline",
    version     = "3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ─────────────────────────────────────────────
# 7. HELPER: Send alert to Command Center
# ─────────────────────────────────────────────
def send_alert_to_command_center(payload: dict):
    try:
        requests.post(COMMAND_CENTER_URL, json=payload, timeout=5)
        print(f"[RELAY] Alert sent -> Command Center | priority={payload.get('priority')}")
    except Exception as e:
        print(f"[RELAY] WARNING: Relay error: {e}")

# ─────────────────────────────────────────────
# 8. HELPER: Score a frame for emergency relevance
# ─────────────────────────────────────────────
def score_frame(detections) -> float:
    """
    Assigns an importance score to a frame based on YOLO detections.
    Higher score = more relevant for emergency analysis.
    """
    score = 0.0
    if detections is None or len(detections) == 0:
        return score

    boxes = detections[0].boxes  # First image in batch
    if boxes is None:
        return score

    for box in boxes:
        class_id = int(box.cls[0])
        confidence = float(box.conf[0])

        if class_id in EMERGENCY_CLASS_IDS:
            _, weight = EMERGENCY_CLASS_IDS[class_id]
            score += confidence * weight

    return score

# ─────────────────────────────────────────────
# 9. STEP 3 — AI PIPELINE (Background Task)
# ─────────────────────────────────────────────
def run_ai_pipeline(video_id: str, cloudinary_video_url: str, camera_id: str):
    """
    Full AI pipeline:
      1. Download video from Cloudinary to temp file
      2. Run YOLOv8 on sampled frames to score them
      3. Select top 5-6 frames by score
      4. Upload selected frames to Cloudinary
      5. Store frame URLs in MongoDB
      6. Send ONLY frames to Gemini for analysis
      7. Store Gemini result in MongoDB
      8. Trigger dispatch if severity > 50
    """
    print(f"\n{'='*55}")
    print(f"[AI PIPELINE] Starting — video_id={video_id}")
    print(f"  Camera : {camera_id}")
    print(f"  URL    : {cloudinary_video_url}")
    print(f"{'='*55}")

    tmp_video_path = None

    try:
        # ── UPDATE STATUS: PROCESSING ──────────────────────────────────
        videos_col.update_one(
            {"_id": ObjectId(video_id)},
            {"$set": {"status": "PROCESSING", "updated_at": time.time()}}
        )

        # ────────────────────────────────────────────────────────────────
        # STEP 3A: Download video from Cloudinary to temp file
        # ────────────────────────────────────────────────────────────────
        print("[3A] Downloading video from Cloudinary...")
        response = requests.get(cloudinary_video_url, stream=True, timeout=60)
        response.raise_for_status()

        suffix = ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            for chunk in response.iter_content(chunk_size=8192):
                tmp.write(chunk)
            tmp_video_path = tmp.name

        print(f"[3A] Video downloaded to: {tmp_video_path}")

        # ────────────────────────────────────────────────────────────────
        # STEP 3B: Run YOLOv8 on sampled frames, collect scores
        # ────────────────────────────────────────────────────────────────
        print("[3B] Running YOLOv8 on video frames...")

        cap = cv2.VideoCapture(tmp_video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Could not open video: {tmp_video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps          = cap.get(cv2.CAP_PROP_FPS) or 25.0

        # Sample every N frames (target ~60 samples regardless of video length)
        sample_interval = max(1, total_frames // 60)
        print(f"[3B] Total frames: {total_frames} | FPS: {fps:.1f} | Sampling every {sample_interval} frames")

        scored_frames = []  # list of (score, frame_index, frame_bgr_image)

        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_interval == 0:
                # Run YOLO inference (verbose=False suppresses output noise)
                results = yolo_model(frame, verbose=False)
                score   = score_frame(results)

                scored_frames.append((score, frame_idx, frame.copy()))

            frame_idx += 1

        cap.release()
        print(f"[3B] Scored {len(scored_frames)} sampled frames.")

        # ────────────────────────────────────────────────────────────────
        # STEP 3C: Select top 5-6 frames by detection score
        # ────────────────────────────────────────────────────────────────
        print("[3C] Selecting top key frames...")

        # Sort by score descending, pick top 6
        scored_frames.sort(key=lambda x: x[0], reverse=True)
        top_frames = scored_frames[:6]

        # If all scores are zero (no detections), fall back to 6 evenly spaced frames
        if all(s == 0.0 for s, _, _ in top_frames) or len(top_frames) == 0:
            print("[3C] No detections found. Falling back to 6 evenly spaced frames.")
            cap2 = cv2.VideoCapture(tmp_video_path)
            evenly_spaced = []
            if total_frames > 0:
                step = max(1, total_frames // 6)
                for i in range(6):
                    cap2.set(cv2.CAP_PROP_POS_FRAMES, i * step)
                    ret, frame = cap2.read()
                    if ret:
                        evenly_spaced.append((0.0, i * step, frame))
            cap2.release()
            top_frames = evenly_spaced

        # Re-sort by frame index to maintain temporal order
        top_frames.sort(key=lambda x: x[1])
        print(f"[3C] Selected {len(top_frames)} key frames at indices: {[f[1] for f in top_frames]}")

        # ────────────────────────────────────────────────────────────────
        # STEP 3D: Upload selected frames to Cloudinary
        # ────────────────────────────────────────────────────────────────
        print("[3D] Uploading key frames to Cloudinary...")

        frame_urls = []
        frame_b64_list = []  # for Gemini

        for i, (score, fidx, frame_bgr) in enumerate(top_frames):
            # Encode frame as JPEG in memory
            success, buffer = cv2.imencode(".jpg", frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if not success:
                print(f"[3D] WARNING: Could not encode frame {fidx}. Skipping.")
                continue

            img_bytes = buffer.tobytes()

            # Upload to Cloudinary as image
            upload_result = cloudinary.uploader.upload(
                img_bytes,
                resource_type = "image",
                folder        = f"skynetra/frames/{camera_id}",
                public_id     = f"{camera_id}_{video_id}_frame{i:02d}",
                overwrite     = True,
            )
            frame_url = upload_result["secure_url"]
            frame_urls.append(frame_url)

            # Also keep base64 for Gemini (no re-download needed)
            frame_b64_list.append(base64.b64encode(img_bytes).decode("utf-8"))

            print(f"[3D] Frame {i+1}/{len(top_frames)} uploaded | score={score:.2f} | idx={fidx}")

        print(f"[3D] {len(frame_urls)} frames uploaded to Cloudinary.")

        # ── Store frame URLs in MongoDB ────────────────────────────────
        videos_col.update_one(
            {"_id": ObjectId(video_id)},
            {"$set": {"frame_urls": frame_urls, "updated_at": time.time()}}
        )

        # ────────────────────────────────────────────────────────────────
        # STEP 3E: Send ONLY frames to Gemini for analysis
        # ────────────────────────────────────────────────────────────────
        print("[3E] Sending key frames to Gemini for analysis...")

        gemini_result = {
            "incident_detected": False,
            "incident_type": "None",
            "severity_score": 0,
            "description": "Analysis not performed.",
            "drone_dispatch_necessary": False
        }

        if gemini_client and len(frame_b64_list) > 0:
            # Build content parts: alternating image parts + one text prompt
            content_parts = []

            for b64_frame in frame_b64_list:
                content_parts.append(
                    types.Part.from_bytes(
                        data  = base64.b64decode(b64_frame),
                        mime_type = "image/jpeg"
                    )
                )

            prompt_text = """You are an urban safety AI analyzing surveillance camera frames.
These frames were automatically selected from a video because they contain significant detected objects or activity.

Analyze ALL frames together as a sequence and determine:
1. Is there an emergency incident? (accident, fallen person, fight, fire, abandoned suspicious object, crowd panic)
2. If yes: what type of incident?
3. How severe is it on a scale of 0-100?
4. Is anyone visibly injured?
5. Is immediate drone dispatch necessary?

Respond ONLY with a valid JSON object — no markdown, no explanation:
{
  "incident_detected": true or false,
  "incident_type": "Short category (e.g. Traffic Collision, Fallen Person, Fire, Fight, None)",
  "severity_score": <integer 0-100>,
  "description": "One concise sentence describing exactly what is happening across the frames.",
  "drone_dispatch_necessary": true or false
}"""

            content_parts.append(types.Part.from_text(text=prompt_text))

            try:
                response = gemini_client.models.generate_content(
                    model    = "gemini-1.5-flash",
                    contents = content_parts,
                    config   = types.GenerateContentConfig(
                        response_mime_type = "application/json"
                    )
                )

                raw_text   = response.text.strip()
                clean_json = raw_text.replace("```json", "").replace("```", "").strip()
                gemini_result = json.loads(clean_json)
                print(f"[3E] Gemini analysis complete: {json.dumps(gemini_result, indent=2)}")

            except json.JSONDecodeError as je:
                print(f"[3E] WARNING: JSON parse error: {je}. Raw: {response.text}")
                gemini_result["description"] = f"Parse error. Raw response: {response.text[:200]}"
            except Exception as ge:
                print(f"[3E] WARNING: Gemini API error: {ge}")
                gemini_result["description"] = f"Gemini error: {str(ge)}"
        else:
            print("[3E] Skipping Gemini — client not ready or no frames available.")

        # ── Store Gemini result in MongoDB ─────────────────────────────
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        videos_col.update_one(
            {"_id": ObjectId(video_id)},
            {"$set": {
                "gemini_result": gemini_result,
                "status"       : "COMPLETE",
                "updated_at"   : time.time()
            }}
        )
        print(f"[3E] Gemini result stored in MongoDB.")

        # ────────────────────────────────────────────────────────────────
        # STEP 3F: Dispatch logic — severity threshold = 50
        # ────────────────────────────────────────────────────────────────
        severity        = gemini_result.get("severity_score", 0)
        dispatch_needed = gemini_result.get("drone_dispatch_necessary", False) or (severity > 50)

        if dispatch_needed:
            print(f"[3F] CRITICAL: Severity={severity} — Triggering drone dispatch!")
            dispatch_payload = {
                "camera_id"  : camera_id,
                "severity"   : severity,
                "priority"   : "CRITICAL",
                "description": (
                    f"AI ANALYSIS ({gemini_result.get('incident_type', 'Emergency')}): "
                    f"{gemini_result.get('description', 'Dispatch required')}"
                ),
                "timestamp"  : timestamp
            }
            send_alert_to_command_center(dispatch_payload)

            # Brief pause so dashboard processes the CRITICAL alert first
            time.sleep(1.5)

        # Final summary to command center (always sent)
        summary_payload = {
            "camera_id"  : camera_id,
            "severity"   : severity,
            "priority"   : "FINAL_SUMMARY",
            "description": (
                f"MISSION COMPLETE: AI analysis finished. "
                f"Incident: {gemini_result.get('incident_type', 'None')}. "
                f"{gemini_result.get('description', 'No threats detected.')}"
            ),
            "timestamp"  : timestamp
        }
        send_alert_to_command_center(summary_payload)

        print(f"\n[AI PIPELINE] DONE for video_id={video_id}")
        print(f"  Severity   : {severity}/100")
        print(f"  Incident   : {gemini_result.get('incident_type', 'None')}")
        print(f"  Dispatched : {dispatch_needed}")
        print(f"{'='*55}\n")

    except Exception as e:
        print(f"\n[AI PIPELINE] ERROR for video_id={video_id}: {e}")
        videos_col.update_one(
            {"_id": ObjectId(video_id)},
            {"$set": {"status": "FAILED", "error": str(e), "updated_at": time.time()}}
        )

    finally:
        # Always clean up temp video file
        if tmp_video_path and os.path.exists(tmp_video_path):
            os.remove(tmp_video_path)
            print(f"[CLEANUP] Temp video removed: {tmp_video_path}")

# ─────────────────────────────────────────────
# 10. ENDPOINT: POST /upload_video
# ─────────────────────────────────────────────
@app.post("/upload_video")
async def upload_video(
    background_tasks: BackgroundTasks,
    video:     UploadFile = File(...),
    camera_id: str        = Form("UNKNOWN_CAM")
):
    """
    Step 2 — Receives a video file, uploads it to Cloudinary,
    stores metadata in MongoDB, and queues the AI pipeline (Step 3).
    """
    if not video.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    suffix   = os.path.splitext(video.filename)[1] or ".mp4"
    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(video.file, tmp)
            tmp_path = tmp.name

        print(f"\n[UPLOAD] Received: {video.filename} | Camera: {camera_id}")

        # ── Upload to Cloudinary ────────────────────────────────────────
        print("[UPLOAD] Uploading to Cloudinary...")
        upload_result = cloudinary.uploader.upload(
            tmp_path,
            resource_type = "video",
            folder        = f"skynetra/videos/{camera_id}",
            public_id     = f"{camera_id}_{uuid.uuid4().hex[:8]}",
            overwrite     = True,
        )

        cloudinary_url       = upload_result["secure_url"]
        cloudinary_public_id = upload_result["public_id"]
        print(f"[UPLOAD] Cloudinary URL: {cloudinary_url}")

        # ── Store metadata in MongoDB ───────────────────────────────────
        doc = {
            "camera_id"           : camera_id,
            "original_filename"   : video.filename,
            "cloudinary_url"      : cloudinary_url,
            "cloudinary_public_id": cloudinary_public_id,
            "status"              : "QUEUED",
            "frame_urls"          : [],
            "gemini_result"       : None,
            "created_at"          : time.time(),
            "updated_at"          : time.time(),
        }
        insert_result = videos_col.insert_one(doc)
        video_id = str(insert_result.inserted_id)
        print(f"[UPLOAD] MongoDB document created: video_id={video_id}")

        # ── Queue AI pipeline ───────────────────────────────────────────
        background_tasks.add_task(run_ai_pipeline, video_id, cloudinary_url, camera_id)
        print(f"[UPLOAD] AI pipeline queued for video_id={video_id}")

        return JSONResponse(status_code=200, content={
            "status"        : "SUCCESS",
            "message"       : f"Video received from {camera_id}. AI pipeline started.",
            "video_id"      : video_id,
            "cloudinary_url": cloudinary_url,
            "camera_id"     : camera_id,
        })

    except Exception as e:
        print(f"[UPLOAD] ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

# ─────────────────────────────────────────────
# 11. ENDPOINT: GET /analysis/{video_id}
# ─────────────────────────────────────────────
@app.get("/analysis/{video_id}")
async def get_analysis(video_id: str):
    """
    Returns the stored analysis result for a given video_id.
    Poll this endpoint to track pipeline status: QUEUED -> PROCESSING -> COMPLETE / FAILED
    """
    try:
        doc = videos_col.find_one({"_id": ObjectId(video_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid video_id format.")

    if not doc:
        raise HTTPException(status_code=404, detail="Video not found.")

    doc["_id"] = str(doc["_id"])
    return JSONResponse(content=doc)

# ─────────────────────────────────────────────
# 12. ENDPOINT: GET /health
# ─────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status" : "ok",
        "service": "SkyNetra AI Engine",
        "version": "3.0.0",
        "yolo"   : "loaded",
        "gemini" : "ready" if gemini_client else "not configured"
    }

# ─────────────────────────────────────────────
# 13. STARTUP
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*56)
    print("  SKYNETRA AI ENGINE -- FASTAPI (PORT 5002)")
    print("  Storage : Cloudinary + MongoDB")
    print("  Step 3  : YOLOv8 Frame Selection + Gemini Analysis")
    print("="*56 + "\n")
    uvicorn.run("api:app", host="0.0.0.0", port=5002, reload=True)
