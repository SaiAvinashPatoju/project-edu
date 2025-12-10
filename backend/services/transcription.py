"""
Transcription service using faster-whisper for speech-to-text conversion.
Falls back to mock mode if faster-whisper is not available.
"""
import os
import logging
from typing import Dict, List, Optional, NamedTuple
from pathlib import Path

logger = logging.getLogger(__name__)

# Try to import faster-whisper, fall back to mock mode if unavailable
WHISPER_AVAILABLE = False
WhisperModel = None

try:
    from faster_whisper import WhisperModel as _WhisperModel
    WhisperModel = _WhisperModel
    WHISPER_AVAILABLE = True
    logger.info("faster-whisper loaded successfully")
except ImportError as e:
    logger.warning(f"faster-whisper not available: {e}. Using mock transcription mode.")
except Exception as e:
    logger.warning(f"Failed to load faster-whisper: {e}. Using mock transcription mode.")

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
    """Service for transcribing audio files using faster-whisper."""
    
    def __init__(self, model_size: str = "base"):
        """
        Initialize the transcription service.
        
        Args:
            model_size: Whisper model size (tiny, base, small, medium, large)
        """
        self.model_size = model_size
        self._model = None
        self.confidence_threshold = 0.7  # Words below this are marked as low confidence
        self.use_mock = not WHISPER_AVAILABLE or os.getenv("USE_MOCK_TRANSCRIPTION", "false").lower() == "true"
        
        if self.use_mock:
            logger.warning("TranscriptionService running in MOCK mode - will generate sample transcripts")
        
    def _get_model(self):
        """Lazy load the Whisper model."""
        if self.use_mock:
            return None
            
        if self._model is None:
            if WhisperModel is None:
                raise RuntimeError("faster-whisper is not installed. Install with: pip install faster-whisper")
            logger.info(f"Loading Whisper model: {self.model_size}")
            try:
                self._model = WhisperModel(self.model_size, device="cpu", compute_type="int8")
            except Exception as e:
                logger.error(f"Failed to load Whisper model: {e}")
                raise RuntimeError(f"Failed to load Whisper model: {e}")
        return self._model
    
    def _generate_mock_transcript(self, file_path: str) -> TranscriptionResult:
        """Generate a mock transcript for testing/development."""
        logger.info(f"Generating mock transcript for: {file_path}")
        
        # Get file size to estimate duration
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        estimated_duration = max(60.0, file_size / 16000)  # Rough estimate
        
        mock_transcript = """
        Welcome to today's lecture on Introduction to Machine Learning.
        
        Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.
        
        There are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning.
        
        In supervised learning, the algorithm learns from labeled training data, and makes predictions based on that data.
        
        Unsupervised learning involves training on data without labeled responses, the algorithm tries to find patterns in the data.
        
        Reinforcement learning is about taking suitable action to maximize reward in a particular situation.
        
        Today we will focus on supervised learning algorithms including linear regression, decision trees, and neural networks.
        
        Linear regression is used for predicting continuous values based on input features.
        
        Decision trees are flowchart-like structures that make decisions based on asking a series of questions.
        
        Neural networks are inspired by the human brain and can learn complex patterns in data.
        
        Thank you for attending today's lecture. Please review the materials and complete the practice exercises.
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
        Transcribe an audio file to text with confidence scores.
        
        Args:
            file_path: Path to the audio file
            
        Returns:
            TranscriptionResult with full transcript and confidence data
            
        Raises:
            FileNotFoundError: If audio file doesn't exist
            Exception: If transcription fails
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Audio file not found: {file_path}")
        
        # Use mock mode if enabled
        if self.use_mock:
            return self._generate_mock_transcript(file_path)
        
        try:
            logger.info(f"Starting transcription of: {file_path}")
            model = self._get_model()
            
            # Transcribe with word-level timestamps and confidence
            segments, info = model.transcribe(
                file_path,
                word_timestamps=True,
                vad_filter=True,  # Voice activity detection
                vad_parameters=dict(min_silence_duration_ms=500)
            )
            
            # Process segments and extract confidence data
            processed_segments = []
            full_text_parts = []
            low_confidence_words = []
            
            for segment in segments:
                # Extract word-level confidence data
                words_data = []
                segment_text_parts = []
                
                if hasattr(segment, 'words') and segment.words:
                    for word in segment.words:
                        word_data = {
                            'word': word.word,
                            'start': word.start,
                            'end': word.end,
                            'confidence': getattr(word, 'probability', 1.0)
                        }
                        words_data.append(word_data)
                        segment_text_parts.append(word.word)
                        
                        # Track low confidence words
                        if word_data['confidence'] < self.confidence_threshold:
                            low_confidence_words.append(word.word.strip())
                
                segment_text = ''.join(segment_text_parts) if segment_text_parts else segment.text
                full_text_parts.append(segment_text)
                
                processed_segment = TranscriptionSegment(
                    start=segment.start,
                    end=segment.end,
                    text=segment_text,
                    confidence=getattr(segment, 'avg_logprob', 0.0),
                    words=words_data
                )
                processed_segments.append(processed_segment)
            
            full_text = ' '.join(full_text_parts)
            
            result = TranscriptionResult(
                text=full_text,
                segments=processed_segments,
                language=info.language,
                duration=info.duration,
                low_confidence_words=list(set(low_confidence_words))  # Remove duplicates
            )
            
            logger.info(f"Transcription completed. Duration: {info.duration:.2f}s, "
                       f"Language: {info.language}, "
                       f"Low confidence words: {len(result.low_confidence_words)}")
            
            return result
            
        except Exception as e:
            logger.error(f"Transcription failed for {file_path}: {str(e)}")
            raise Exception(f"Transcription failed: {str(e)}")
    
    def validate_audio_file(self, file_path: str) -> bool:
        """
        Validate that the audio file can be processed.
        
        Args:
            file_path: Path to the audio file
            
        Returns:
            True if file is valid, False otherwise
        """
        try:
            # Check file exists and has reasonable size
            if not os.path.exists(file_path):
                return False
            
            file_size = os.path.getsize(file_path)
            if file_size == 0:
                return False
            
            # Check file extension (basic validation)
            valid_extensions = {'.wav', '.mp3', '.m4a', '.flac', '.ogg', '.webm'}
            file_ext = Path(file_path).suffix.lower()
            
            return file_ext in valid_extensions
            
        except Exception as e:
            logger.error(f"Audio file validation failed: {str(e)}")
            return False