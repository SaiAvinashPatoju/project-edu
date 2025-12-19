"""
Project EDU - Edge AI Backend
=============================
FastAPI server with local inference:
  - ASR: Moonshine ONNX (400MB)
  - LLM: Qwen 2.5-3B-Instruct Q4_K_M (~2GB)

Runs on:
  - HF Spaces CPU Basic (16GB RAM)
  - Local RTX 3070 Ti (8GB VRAM)

RAM Budget: ~4GB total for models
"""
import os
import sys
import logging
import tempfile
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import soundfile as sf

# ================================================
# Logging
# ================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger(__name__)

# ================================================
# Configuration
# ================================================
# Model settings
MOONSHINE_MODEL = "moonshine/base"
QWEN_REPO = "Qwen/Qwen2.5-3B-Instruct-GGUF"
QWEN_FILE = "qwen2.5-3b-instruct-q4_k_m.gguf"

# Paths
MODEL_DIR = Path(os.getenv("MODEL_DIR", "/data/models"))
HF_HOME = os.getenv("HF_HOME", "/data/hf")

# LLM settings (deterministic)
LLM_TEMPERATURE = 0.1
LLM_REPEAT_PENALTY = 1.1
LLM_MAX_TOKENS = 1024
LLM_CONTEXT_SIZE = 4096

# ================================================
# Singleton Model Instances
# ================================================
asr_model: Optional[object] = None
llm_model: Optional[object] = None


def detect_gpu() -> int:
    """
    Detect if CUDA GPU is available.
    Returns n_gpu_layers: -1 for GPU (all layers), 0 for CPU only.
    """
    try:
        import torch
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            logger.info(f"GPU detected: {gpu_name} ({vram_gb:.1f}GB VRAM)")
            return -1  # Use all layers on GPU
    except ImportError:
        pass
    
    logger.info("No GPU detected, using CPU inference")
    return 0  # CPU only


def load_asr_model():
    """Load Moonshine ASR model (Singleton)."""
    global asr_model
    if asr_model is not None:
        return asr_model
    
    logger.info(f"Loading Moonshine ASR: {MOONSHINE_MODEL}")
    try:
        import moonshine
        asr_model = moonshine
        logger.info("Moonshine ASR loaded successfully (~400MB)")
        return asr_model
    except Exception as e:
        logger.error(f"Failed to load Moonshine: {e}")
        raise RuntimeError(f"ASR model failed: {e}")


def load_llm_model():
    """Load Qwen 3B LLM via llama-cpp-python (Singleton)."""
    global llm_model
    if llm_model is not None:
        return llm_model
    
    from huggingface_hub import hf_hub_download
    from llama_cpp import Llama
    
    # Ensure model directory exists
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    
    # Download model if not present
    model_path = MODEL_DIR / QWEN_FILE
    if not model_path.exists():
        logger.info(f"Downloading {QWEN_REPO}/{QWEN_FILE}...")
        downloaded_path = hf_hub_download(
            repo_id=QWEN_REPO,
            filename=QWEN_FILE,
            local_dir=str(MODEL_DIR),
            token=os.getenv("HF_TOKEN")
        )
        logger.info(f"Model downloaded to: {downloaded_path}")
        model_path = Path(downloaded_path)
    else:
        logger.info(f"Model found at: {model_path}")
    
    # Detect GPU and set layers
    n_gpu_layers = detect_gpu()
    
    logger.info(f"Loading Qwen 3B LLM (n_gpu_layers={n_gpu_layers})...")
    try:
        llm_model = Llama(
            model_path=str(model_path),
            n_ctx=LLM_CONTEXT_SIZE,
            n_batch=512,
            n_gpu_layers=n_gpu_layers,
            verbose=False
        )
        logger.info("Qwen 3B LLM loaded successfully (~2GB)")
        return llm_model
    except Exception as e:
        logger.error(f"Failed to load LLM: {e}")
        raise RuntimeError(f"LLM model failed: {e}")


# ================================================
# FastAPI Lifespan (Startup/Shutdown)
# ================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup, cleanup on shutdown."""
    logger.info("=" * 50)
    logger.info("Project EDU - Starting up...")
    logger.info("=" * 50)
    
    # Load models at startup
    try:
        load_asr_model()
        load_llm_model()
        logger.info("All models loaded successfully!")
    except Exception as e:
        logger.error(f"Model loading failed: {e}")
        # Don't crash - allow health check to report status
    
    logger.info("=" * 50)
    logger.info("Server ready!")
    logger.info("=" * 50)
    
    yield  # Server runs here
    
    # Cleanup
    logger.info("Shutting down...")


# ================================================
# FastAPI App
# ================================================
app = FastAPI(
    title="Project EDU - Edge AI",
    description="Teacher-faithful lecture to slides (local inference)",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================================================
# Request/Response Models
# ================================================
class SlideRequest(BaseModel):
    """Request for /slides endpoint."""
    transcript: str
    max_slides: int = 15
    subject: str = "General"
    grade: str = "K-12"


class SlideItem(BaseModel):
    """Single slide structure."""
    title: str
    content: list[str]
    slide_type: str = "content-slide"


class SlidesResponse(BaseModel):
    """Response from /slides endpoint."""
    slides: list[SlideItem]
    metadata: dict


class ASRResponse(BaseModel):
    """Response from /asr endpoint."""
    transcript: str
    duration_seconds: float


# ================================================
# Teacher-Faithful System Prompt
# ================================================
SYSTEM_PROMPT = """You are a Teacher's Assistant that creates lecture slides.

STRICT RULES:
1. Use ONLY words and concepts from the transcript provided
2. DO NOT add examples not mentioned by the teacher
3. DO NOT add definitions the teacher did not provide
4. DO NOT correct any errors - preserve teacher's exact words
5. DO NOT introduce external knowledge or context
6. You may ONLY: organize, group related points, clarify phrasing

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "slides": [
    {"title": "...", "content": ["bullet 1", "bullet 2"], "slide_type": "content-slide"}
  ]
}

SLIDE TYPES: title-slide, content-slide, summary-slide
"""


# ================================================
# Endpoints
# ================================================
@app.get("/")
async def root():
    """API info."""
    return {
        "service": "Project EDU - Edge AI",
        "version": "2.0.0",
        "models": {
            "asr": MOONSHINE_MODEL,
            "llm": f"{QWEN_REPO}/{QWEN_FILE}"
        },
        "endpoints": ["/asr", "/slides", "/health"]
    }


@app.get("/health")
async def health():
    """Health check with model status."""
    return {
        "status": "healthy",
        "asr_loaded": asr_model is not None,
        "llm_loaded": llm_model is not None
    }


@app.post("/asr", response_model=ASRResponse)
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Transcribe audio to text using Moonshine ONNX.
    
    Accepts: WAV, MP3, M4A, FLAC, OGG, WebM
    Returns: Plain text transcript
    """
    if asr_model is None:
        raise HTTPException(status_code=503, detail="ASR model not loaded")
    
    # Validate file type
    valid_exts = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm"}
    file_ext = Path(audio.filename or "").suffix.lower()
    if file_ext not in valid_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format. Use: {', '.join(valid_exts)}"
        )
    
    try:
        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            content = await audio.read()
            
            # If not WAV, we'd need ffmpeg conversion here
            # For now, assume WAV or let soundfile handle it
            tmp.write(content)
            tmp_path = tmp.name
        
        logger.info(f"Transcribing: {audio.filename} ({len(content)} bytes)")
        
        # Read audio
        data, sample_rate = sf.read(tmp_path)
        duration = len(data) / sample_rate
        
        # Transcribe using moonshine.transcribe(audio_path, model_name)
        transcript = asr_model.transcribe(tmp_path, MOONSHINE_MODEL)
        
        # Cleanup
        os.unlink(tmp_path)
        
        # Handle list result
        if isinstance(transcript, list):
            transcript = transcript[0] if transcript else ""
        
        logger.info(f"Transcription complete: {len(transcript)} chars, {duration:.1f}s")
        
        return ASRResponse(
            transcript=transcript,
            duration_seconds=round(duration, 2)
        )
    
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.post("/slides", response_model=SlidesResponse)
async def generate_slides(request: SlideRequest):
    """
    Generate slides from transcript using Qwen 3B LLM.
    
    Teacher-Faithful Policy:
    - Uses ONLY content from transcript
    - NO external knowledge added
    - NO fact corrections
    """
    if llm_model is None:
        raise HTTPException(status_code=503, detail="LLM model not loaded")
    
    transcript = request.transcript.strip()
    if len(transcript) < 50:
        raise HTTPException(
            status_code=400,
            detail="Transcript too short (min 50 chars)"
        )
    
    try:
        # Build prompt
        prompt = f"""{SYSTEM_PROMPT}

TRANSCRIPT (ground truth - use ONLY this):
---
{transcript}
---

Subject: {request.subject}
Grade: {request.grade}
Max slides: {request.max_slides}

OUTPUT (JSON only):"""

        logger.info(f"Generating slides from {len(transcript)} char transcript...")
        
        # Generate
        response = llm_model(
            prompt,
            max_tokens=LLM_MAX_TOKENS,
            temperature=LLM_TEMPERATURE,
            repeat_penalty=LLM_REPEAT_PENALTY,
            stop=["```", "\n\n\n"]
        )
        
        output_text = response["choices"][0]["text"].strip()
        
        if not output_text:
            raise RuntimeError("Empty LLM response")
        
        # Parse JSON
        slides_data = _parse_json_response(output_text)
        
        # Build response
        slides = []
        for i, s in enumerate(slides_data.get("slides", [])):
            slides.append(SlideItem(
                title=s.get("title", f"Slide {i+1}"),
                content=s.get("content", []),
                slide_type=s.get("slide_type", "content-slide")
            ))
        
        if not slides:
            raise RuntimeError("No slides generated")
        
        logger.info(f"Generated {len(slides)} slides")
        
        return SlidesResponse(
            slides=slides,
            metadata={
                "transcript_length": len(transcript),
                "slides_count": len(slides),
                "model": "qwen2.5-3b-instruct-q4_k_m",
                "teacher_faithful": True
            }
        )
    
    except Exception as e:
        logger.error(f"Slide generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


def _parse_json_response(text: str) -> dict:
    """Parse JSON from LLM response, handling common issues."""
    import json
    import re
    
    # Clean markdown
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to extract JSON object
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        raise RuntimeError("Failed to parse LLM output as JSON")


# ================================================
# Main
# ================================================
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "7860"))
    uvicorn.run(app, host="0.0.0.0", port=port)
