"""
Transcription service using Moonshine (UsefulSensors) for speech-to-text.
Runs fully offline after initial model download.
"""
import os
import logging
import glob
import subprocess
import tempfile
from typing import Dict, List, NamedTuple
from pathlib import Path

logger = logging.getLogger(__name__)

# Set Keras backend to torch before importing moonshine
os.environ.setdefault('KERAS_BACKEND', 'torch')

def _find_ffmpeg() -> str:
    """Find ffmpeg executable, checking common installation locations."""
    import shutil
    
    # Check if ffmpeg is in PATH
    ffmpeg_path = shutil.which('ffmpeg')
    if ffmpeg_path:
        return ffmpeg_path
    
    # Check WinGet installation location
    winget_base = os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\WinGet\Packages')
    if os.path.exists(winget_base):
        for pattern in ['*ffmpeg*/**/ffmpeg.exe', '*FFmpeg*/**/ffmpeg.exe']:
            matches = glob.glob(os.path.join(winget_base, pattern), recursive=True)
            if matches:
                return matches[0]
    
    # Check common Windows locations
    common_paths = [
        r'C:\ffmpeg\bin\ffmpeg.exe',
        r'C:\Program Files\ffmpeg\bin\ffmpeg.exe',
        r'C:\tools\ffmpeg\bin\ffmpeg.exe',
    ]
    for path in common_paths:
        if os.path.exists(path):
            return path
    
    return None

class TranscriptionSegment(NamedTuple):
    """Represents a segment of transcribed text with confidence data."""
    start: float
    end: float
    text: str
    confidence: float
    words: List[Dict[str, any]]

class TranscriptionResult(NamedTuple):
    """Complete transcription result with metadata."""
    text: str
    segments: List[TranscriptionSegment]
    language: str
    duration: float
    low_confidence_words: List[str]

class TranscriptionService:
    """
    Service for transcribing audio files using Moonshine ASR.
    
    Uses UsefulSensors/moonshine-base model via official moonshine package.
    Runs completely offline after initial model download.
    """
    
    def __init__(self, model_name: str = None):
        """
        Initialize the transcription service.
        
        Args:
            model_name: Moonshine model name (moonshine/tiny or moonshine/base)
        """
        self.model_name = model_name or os.getenv("MOONSHINE_MODEL", "moonshine/base")
        self._moonshine = None
        self.use_mock = os.getenv("USE_MOCK_TRANSCRIPTION", "false").lower() == "true"
        
        if self.use_mock:
            logger.warning("TranscriptionService running in MOCK mode")
        else:
            logger.info(f"TranscriptionService initialized with model: {self.model_name}")
    
    def _get_moonshine(self):
        """Lazy load the Moonshine module."""
        if self._moonshine is None:
            try:
                import moonshine
                self._moonshine = moonshine
                logger.info(f"Moonshine ASR module loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load Moonshine: {e}")
                raise RuntimeError(f"Failed to load Moonshine ASR: {e}")
        return self._moonshine
    
    def _convert_to_wav(self, file_path: str) -> str:
        """Convert audio file to WAV format using ffmpeg."""
        ffmpeg_path = _find_ffmpeg()
        if not ffmpeg_path:
            raise RuntimeError(
                "ffmpeg not found. Please install ffmpeg: "
                "Windows: winget install ffmpeg"
            )
        
        # Create temp wav file
        tmp_wav = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        tmp_wav_path = tmp_wav.name
        tmp_wav.close()
        
        logger.info(f"Converting audio with ffmpeg: {ffmpeg_path}")
        
        cmd = [
            ffmpeg_path, '-y', '-i', file_path,
            '-ar', '16000',  # Resample to 16kHz
            '-ac', '1',  # Mono
            '-f', 'wav',
            tmp_wav_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"ffmpeg error: {result.stderr}")
            raise RuntimeError(f"ffmpeg conversion failed: {result.stderr}")
        
        return tmp_wav_path
    
    def _generate_mock_transcript(self, file_path: str) -> TranscriptionResult:
        """Generate a mock transcript for testing/development."""
        logger.info(f"Generating mock transcript for: {file_path}")
        
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        estimated_duration = max(60.0, file_size / 16000)
        
        mock_transcript = """
        Welcome to today's lecture on Introduction to Machine Learning.
        
        Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.
        
        There are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning.
        
        Thank you for attending today's lecture.
        """.strip()
        
        segments = [
            TranscriptionSegment(
                start=0.0,
                end=estimated_duration,
                text=mock_transcript,
                confidence=0.95,
                words=[]
            )
        ]
        
        return TranscriptionResult(
            text=mock_transcript,
            segments=segments,
            language="en",
            duration=estimated_duration,
            low_confidence_words=[]
        )
    
    def transcribe_audio(self, file_path: str) -> TranscriptionResult:
        """
        Transcribe an audio file to text.
        
        Uses Moonshine ASR model for local, offline transcription.
        
        Args:
            file_path: Path to the audio file
            
        Returns:
            TranscriptionResult with full transcript
            
        Raises:
            FileNotFoundError: If audio file doesn't exist
            Exception: If transcription fails
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Audio file not found: {file_path}")
        
        # Use mock mode if enabled
        if self.use_mock:
            return self._generate_mock_transcript(file_path)
        
        tmp_wav_path = None
        try:
            logger.info(f"Starting transcription of: {file_path}")
            
            # Check if file needs conversion
            file_ext = Path(file_path).suffix.lower()
            if file_ext not in ['.wav']:
                logger.info(f"Converting {file_ext} to WAV...")
                tmp_wav_path = self._convert_to_wav(file_path)
                audio_path = tmp_wav_path
            else:
                audio_path = file_path
            
            # Get moonshine module and transcribe
            moonshine = self._get_moonshine()
            
            logger.info(f"Transcribing with Moonshine model: {self.model_name}")
            
            # Get audio duration first
            import soundfile as sf
            data, sr = sf.read(audio_path)
            duration = len(data) / sr
            
            # Moonshine has a 64-second limit per call - chunk if needed
            MAX_CHUNK_SECONDS = 60  # Use 60s chunks with some margin
            
            if duration <= MAX_CHUNK_SECONDS:
                # Short audio - transcribe directly
                result = moonshine.transcribe(audio_path, self.model_name)
                full_text = result[0] if result else ""
            else:
                # Long audio - chunk and transcribe each segment
                logger.info(f"Audio is {duration:.1f}s, chunking into {MAX_CHUNK_SECONDS}s segments")
                
                chunk_samples = int(MAX_CHUNK_SECONDS * sr)
                transcripts = []
                
                for i in range(0, len(data), chunk_samples):
                    chunk_data = data[i:i + chunk_samples]
                    chunk_num = i // chunk_samples + 1
                    
                    # Skip very short final chunks (< 1 second)
                    if len(chunk_data) < sr:
                        continue
                    
                    # Save chunk to temp file
                    chunk_path = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
                    try:
                        sf.write(chunk_path, chunk_data, sr)
                        
                        logger.info(f"Transcribing chunk {chunk_num} ({len(chunk_data)/sr:.1f}s)")
                        chunk_result = moonshine.transcribe(chunk_path, self.model_name)
                        
                        if chunk_result and chunk_result[0]:
                            transcripts.append(chunk_result[0])
                    finally:
                        if os.path.exists(chunk_path):
                            os.unlink(chunk_path)
                
                full_text = " ".join(transcripts)
                logger.info(f"Assembled {len(transcripts)} chunks into transcript")
            
            # Create single segment (Moonshine doesn't provide word-level timestamps)
            segments = [
                TranscriptionSegment(
                    start=0.0,
                    end=duration,
                    text=full_text,
                    confidence=0.9,
                    words=[]
                )
            ]
            
            result = TranscriptionResult(
                text=full_text,
                segments=segments,
                language="en",  # Moonshine is English-only
                duration=duration,
                low_confidence_words=[]
            )
            
            logger.info(f"Transcription completed. Duration: {duration:.2f}s, "
                       f"Text length: {len(full_text)} chars")
            
            return result
            
        except Exception as e:
            logger.error(f"Transcription failed for {file_path}: {str(e)}")
            raise Exception(f"Transcription failed: {str(e)}")
        finally:
            # Clean up temp file
            if tmp_wav_path and os.path.exists(tmp_wav_path):
                try:
                    os.unlink(tmp_wav_path)
                except:
                    pass
    
    def validate_audio_file(self, file_path: str) -> bool:
        """
        Validate that the audio file can be processed.
        
        Args:
            file_path: Path to the audio file
            
        Returns:
            True if file is valid, False otherwise
        """
        try:
            if not os.path.exists(file_path):
                return False
            
            file_size = os.path.getsize(file_path)
            if file_size == 0:
                return False
            
            # Check file extension
            valid_extensions = {'.wav', '.mp3', '.m4a', '.flac', '.ogg', '.webm'}
            file_ext = Path(file_path).suffix.lower()
            
            return file_ext in valid_extensions
            
        except Exception as e:
            logger.error(f"Audio file validation failed: {str(e)}")
            return False