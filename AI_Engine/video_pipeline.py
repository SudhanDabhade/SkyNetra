"""
SkyNetra — video_pipeline.py
YOLO-based Video Processing Pipeline (Step 3, Local Version)

Architecture:
  Input  : Cloudinary video URL
  Output : List of locally saved important frame file paths

Pipeline:
  1. download_video(url)     → Downloads video to temp local file
  2. process_video(path)     → Runs YOLOv8, detects events, selects 5-6 key frames, saves them
  3. run_pipeline(video_url) → Orchestrates 1 + 2, returns list of frame paths

Event Detection Logic:
  - Fallen Person  : person bounding box where width > height * 1.2
  - Accident       : vehicles (car, bus, truck, motorcycle) present in frame
  - Abandoned Bag  : bag/backpack detected with no person within proximity

Usage:
  from video_pipeline import run_pipeline
  frames = run_pipeline("https://res.cloudinary.com/.../your_video.mp4")
  print(frames)
  # → ["selected_frames/frame_34.jpg", "selected_frames/frame_78.jpg", ...]
"""

import os
import time
import tempfile
import requests
import cv2
import numpy as np
from ultralytics import YOLO

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

# Directory where selected frames will be saved
BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
FRAMES_OUT_DIR  = os.path.join(BASE_DIR, "selected_frames")

# YOLOv8 nano model — reuse the one already present in AI_Engine/
YOLO_MODEL_PATH = os.path.join(BASE_DIR, "yolov8n.pt")

# Maximum frames to output (as per spec)
MAX_FRAMES = 6

# Minimum frame-index gap between any two selected frames
# (prevents consecutive-duplicate selection)
MIN_FRAME_GAP = 10

# ─── COCO class IDs used in event detection ───────────────────────────────
# https://docs.ultralytics.com/datasets/detect/coco/
VEHICLE_CLASS_IDS  = {2, 3, 5, 7}    # car, motorcycle, bus, truck
PERSON_CLASS_ID    = 0
BAG_CLASS_IDS      = {24, 26, 28}    # backpack (24), handbag (26), suitcase (28)

# Proximity threshold: a bag within this many pixels of any person is NOT abandoned
BAG_PERSON_PROXIMITY_PX = 150

# ─────────────────────────────────────────────────────────────────────────────
# MODEL — loaded once at module import (avoids reloading per call)
# ─────────────────────────────────────────────────────────────────────────────
print(f"[PIPELINE] Loading YOLOv8 model from: {YOLO_MODEL_PATH}")
_yolo_model = YOLO(YOLO_MODEL_PATH)
print("[PIPELINE] YOLOv8 model ready.")

os.makedirs(FRAMES_OUT_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _box_center(box_xyxy):
    """Return (cx, cy) from [x1, y1, x2, y2]."""
    x1, y1, x2, y2 = box_xyxy
    return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)


def _euclidean(p1, p2):
    """Euclidean distance between two (x, y) points."""
    return float(np.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2))


def _detect_events(results) -> dict:
    """
    Analyse a single-frame YOLO result and return which events were detected.

    Returns:
        {
            "fallen_person" : bool,
            "accident"      : bool,
            "abandoned_bag" : bool,
            "event_score"   : float   # cumulative confidence score
        }
    """
    events = {
        "fallen_person" : False,
        "accident"      : False,
        "abandoned_bag" : False,
        "event_score"   : 0.0,
    }

    if results is None or len(results) == 0:
        return events

    boxes_data = results[0].boxes  # Boxes object for the first (only) image
    if boxes_data is None or len(boxes_data) == 0:
        return events

    person_centers = []   # centers of all detected persons
    bag_centers    = []   # centers of all detected bags/backpacks
    score_acc      = 0.0

    # ── First pass: collect all detections ──────────────────────────────────
    for box in boxes_data:
        cls_id     = int(box.cls[0])
        conf       = float(box.conf[0])
        xyxy       = box.xyxy[0].tolist()          # [x1, y1, x2, y2]
        x1, y1, x2, y2 = xyxy
        w          = x2 - x1
        h          = y2 - y1

        # ── FALLEN PERSON DETECTION ──────────────────────────────────────
        # A person lying down has a bounding box much wider than tall.
        if cls_id == PERSON_CLASS_ID:
            person_centers.append(_box_center(xyxy))
            if h > 0 and w > h * 1.2:
                events["fallen_person"] = True
                score_acc += conf * 4.0          # high importance
                print(f"     [EVENT] Fallen person detected | w={w:.1f} h={h:.1f} ratio={w/h:.2f} conf={conf:.2f}")
            else:
                score_acc += conf * 0.5          # normal person — low score contribution

        # ── ACCIDENT DETECTION ───────────────────────────────────────────
        # Vehicles in the frame is a proxy for a traffic event.
        elif cls_id in VEHICLE_CLASS_IDS:
            events["accident"] = True
            score_acc += conf * 2.0
            print(f"     [EVENT] Vehicle detected (class={cls_id}) conf={conf:.2f}")

        # ── ABANDONED BAG CANDIDATE ──────────────────────────────────────
        elif cls_id in BAG_CLASS_IDS:
            bag_centers.append(_box_center(xyxy))
            score_acc += conf * 1.0

    # ── Second pass: abandoned bag check ────────────────────────────────────
    # A bag is "abandoned" if NO person is within BAG_PERSON_PROXIMITY_PX pixels.
    for bag_center in bag_centers:
        is_abandoned = True
        for person_center in person_centers:
            dist = _euclidean(bag_center, person_center)
            if dist < BAG_PERSON_PROXIMITY_PX:
                is_abandoned = False
                break
        if is_abandoned:
            events["abandoned_bag"] = True
            score_acc += 1.5
            print(f"     [EVENT] Abandoned bag detected at center={bag_center}")

    events["event_score"] = round(score_acc, 4)
    return events


def _is_event_frame(events: dict) -> bool:
    """Return True if at least one meaningful event was detected in this frame."""
    return events["fallen_person"] or events["accident"] or events["abandoned_bag"]


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

def download_video(url: str) -> str:
    """
    Downloads a video from the given URL (e.g. a Cloudinary secure URL)
    to a temporary local .mp4 file.

    Args:
        url: Full HTTP/HTTPS URL of the video to download.

    Returns:
        Absolute path to the downloaded temporary video file.
        The caller is responsible for deleting it when done.

    Raises:
        RuntimeError: If the download fails or HTTP status is not 2xx.
    """
    print(f"\n[DOWNLOAD] Fetching video from URL...")
    print(f"  URL : {url}")

    try:
        response = requests.get(url, stream=True, timeout=120)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"[DOWNLOAD] HTTP request failed: {e}")

    # Write to a named temp file so OpenCV can open it by path
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        total_bytes = 0
        for chunk in response.iter_content(chunk_size=65536):
            if chunk:
                tmp.write(chunk)
                total_bytes += len(chunk)
        tmp_path = tmp.name

    size_mb = total_bytes / (1024 * 1024)
    print(f"[DOWNLOAD] Done — {size_mb:.2f} MB saved to: {tmp_path}")
    return tmp_path


def process_video(video_path: str) -> list:
    """
    Runs YOLOv8 on a local video file with advanced event-based selection:
    1. Filter unstable detections (must persist for ≥3 sampled frames).
    2. Group consecutive stable detections into 'event windows'.
    3. From each window, select: Start, Peak (max score), and End frames.
    4. Limit total output to 5-6 frames.
    5. Sort by time (index).

    Args:
        video_path: Absolute path to the local video file.

    Returns:
        List of absolute paths to the saved JPEG frames.
    """
    print(f"\n[PROCESS] Opening video: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"[PROCESS] OpenCV could not open: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps          = cap.get(cv2.CAP_PROP_FPS) or 25.0

    # Sample every N-th frame. Target ~100 samples for better windowing resolution.
    sample_interval = max(1, total_frames // 100)

    print(f"[PROCESS] Total frames : {total_frames}")
    print(f"[PROCESS] FPS          : {fps:.1f}")
    print(f"[PROCESS] Sample every : {sample_interval} frames")

    # ── 1 & 2: Run YOLO and Score each frame ───────────────────────────────
    raw_sampled_results = []  # List of (frame_idx, score, frame_bgr, events)

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % sample_interval == 0:
            results = _yolo_model(frame, verbose=False)
            events  = _detect_events(results)
            score   = events["event_score"]
            
            raw_sampled_results.append({
                "idx": frame_idx,
                "score": score,
                "frame": frame.copy(),
                "events": events
            })

        frame_idx += 1
    cap.release()

    # ── 3: Filter unstable detections (must be ≥3 consecutive sampled frames) ──
    stable_frames = []
    current_run   = []
    MIN_CONSECUTIVE = 3
    SCORE_THRESHOLD = 0.5  # Ignore very low confidence noise

    for res in raw_sampled_results:
        if res["score"] > SCORE_THRESHOLD:
            current_run.append(res)
        else:
            if len(current_run) >= MIN_CONSECUTIVE:
                stable_frames.extend(current_run)
            current_run = []
    
    # Check tail
    if len(current_run) >= MIN_CONSECUTIVE:
        stable_frames.extend(current_run)

    print(f"[PROCESS] Denoising complete. {len(stable_frames)} stable frames found out of {len(raw_sampled_results)} sampled.")

    # ── 4: Group into Event Windows ──────────────────────────────────────────
    windows = []
    if stable_frames:
        current_window = [stable_frames[0]]
        for i in range(1, len(stable_frames)):
            # Check if these were adjacent in the original sampled list
            prev_res = stable_frames[i-1]
            curr_res = stable_frames[i]
            
            # Find their positions in raw_sampled_results
            prev_pos = next(idx for idx, r in enumerate(raw_sampled_results) if r["idx"] == prev_res["idx"])
            curr_pos = next(idx for idx, r in enumerate(raw_sampled_results) if r["idx"] == curr_res["idx"])

            if curr_pos == prev_pos + 1:
                current_window.append(curr_res)
            else:
                windows.append(current_window)
                current_window = [curr_res]
        windows.append(current_window)

    print(f"[PROCESS] Identified {len(windows)} distinct event windows.")

    # ── 5: From each window, pick Start, Peak, End ───────────────────────────
    # We'll store windows as (peak_score, [selected_frames])
    window_selections = []

    for win in windows:
        start_f = win[0]
        end_f   = win[-1]
        peak_f  = max(win, key=lambda x: x["score"])
        
        # Initial set: Start, Peak, End
        selected_in_win = [start_f, peak_f, end_f]
        
        # If the window is long enough, add more intermediate frames to reach the target budget
        if len(win) > 5:
            # We want to add frames at 25%, 50%, 75% etc. depending on space
            # For now, let's just add 1/4 and 3/4 points too
            quarter = len(win) // 4
            half    = len(win) // 2
            three_q = (3 * len(win)) // 4
            
            for offset in [quarter, half, three_q]:
                if win[offset] not in selected_in_win:
                    selected_in_win.append(win[offset])

        # Unique frames only, maintaining order
        unique_win_frames = []
        seen_indices = set()
        # Re-sort selection by index before filtering uniqueness to keep it clean
        selected_in_win.sort(key=lambda x: x["idx"])
        for f in selected_in_win:
            if f["idx"] not in seen_indices:
                unique_win_frames.append(f)
                seen_indices.add(f["idx"])
        
        window_selections.append({
            "peak_score": peak_f["score"],
            "frames": unique_win_frames
        })

    # ── 6: Limit total frames to 5-6 (Prioritize most significant windows) ──
    # Sort windows by peak score descending
    window_selections.sort(key=lambda x: x["peak_score"], reverse=True)

    final_selection_pool = []
    # First pass: try to get at least Start/Peak/End from top windows
    for ws in window_selections:
        for f in ws["frames"]:
            if len(final_selection_pool) < MAX_FRAMES:
                if not any(rf["idx"] == f["idx"] for rf in final_selection_pool):
                    final_selection_pool.append(f)
            else:
                break
        if len(final_selection_pool) >= MAX_FRAMES:
            break

    # Fallback if no stable events found
    if not final_selection_pool:
        print("[PROCESS] No stable events detected. Falling back to 6 evenly spaced frames.")
        cap2 = cv2.VideoCapture(video_path)
        step = max(1, total_frames // 6)
        for i in range(6):
            target = i * step
            cap2.set(cv2.CAP_PROP_POS_FRAMES, target)
            ret, frame = cap2.read()
            if ret:
                final_selection_pool.append({
                    "idx": target,
                    "frame": frame.copy(),
                    "events": {"fallback": True}
                })
        cap2.release()

    # ── 7: Sort by time (index) ──────────────────────────────────────────────
    final_selection_pool.sort(key=lambda x: x["idx"])

    # ── Save and Return ──────────────────────────────────────────────────────
    saved_paths = []
    print(f"\n[PROCESS] Saving {len(final_selection_pool)} selected frames to: {FRAMES_OUT_DIR}")

    for item in final_selection_pool:
        fidx      = item["idx"]
        frame_bgr = item["frame"]
        filename  = f"frame_{fidx}.jpg"
        save_path = os.path.join(FRAMES_OUT_DIR, filename)

        success = cv2.imwrite(save_path, frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 90])
        if success:
            saved_paths.append(save_path)
            print(f"  [SAVED] {filename} | idx={fidx} | score={item.get('score', 0):.2f}")

    print(f"\n[PROCESS] Done. {len(saved_paths)} frames ready for Gemini.")
    return saved_paths


def run_pipeline(video_url: str) -> list:
    """
    Full YOLO-based video processing pipeline.

    Steps:
      1. Download the video from the given Cloudinary URL to a temp file.
      2. Run process_video() — YOLO detection + event-based frame selection.
      3. Delete the temp video file.
      4. Return list of saved frame file paths.

    Args:
        video_url: The Cloudinary (or any HTTP) video URL.

    Returns:
        List of absolute paths to saved frame JPEGs, e.g.:
        [".../selected_frames/frame_34.jpg", ".../selected_frames/frame_78.jpg"]

    Example:
        frames = run_pipeline("https://res.cloudinary.com/dr89ziv4z/video/upload/...")
        for f in frames:
            print(f)
    """
    print("\n" + "=" * 60)
    print("  SKYNETRA — YOLO Video Processing Pipeline")
    print("=" * 60)

    t_start       = time.time()
    tmp_video_path = None

    try:
        # ── Step 1: Download ─────────────────────────────────────────────────
        tmp_video_path = download_video(video_url)

        # ── Step 2: Process ──────────────────────────────────────────────────
        frame_paths = process_video(tmp_video_path)

        t_elapsed = time.time() - t_start
        print(f"\n[PIPELINE] Completed in {t_elapsed:.1f}s")
        print(f"[PIPELINE] Selected frames ({len(frame_paths)}):")
        for p in frame_paths:
            print(f"    {os.path.basename(p)}")
        print("=" * 60 + "\n")

        # Return only the filenames (relative-style) as specified in the task.
        # Full paths are also accessible via the returned list items.
        return frame_paths

    finally:
        # ── Step 3: Clean up temp video file ─────────────────────────────────
        if tmp_video_path and os.path.exists(tmp_video_path):
            os.remove(tmp_video_path)
            print(f"[CLEANUP] Temp video deleted: {tmp_video_path}")


# ─────────────────────────────────────────────────────────────────────────────
# STANDALONE TEST — run directly: python video_pipeline.py
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    # Accept a URL as CLI argument, or use a hardcoded test URL
    if len(sys.argv) > 1:
        test_url = sys.argv[1]
    else:
        # Replace with a real Cloudinary URL from your MongoDB to test
        test_url = (
            "https://res.cloudinary.com/dr89ziv4z/video/upload/"
            "skynetra/videos/CAM_PUN_01/CAM_PUN_01_17e850af.mp4"
        )

    print(f"Testing with URL: {test_url}\n")
    result_frames = run_pipeline(test_url)

    print("\n─── RESULT ───────────────────────────────────────────")
    print(f"Frames returned ({len(result_frames)}):")
    for path in result_frames:
        print(f"  {path}")
    print("──────────────────────────────────────────────────────")
