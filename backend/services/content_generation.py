"""
Content generation service with multiple LLM backends.
Supports: Qwen 2.5 (local), Gemma 3 4B (local), Gemini API (cloud).
"""
import os
import json
import logging
import glob
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, NamedTuple, Any
from pydantic import BaseModel, ValidationError
from dotenv import load_dotenv

# Ensure .env is loaded
load_dotenv()

logger = logging.getLogger(__name__)


class SlideContent(BaseModel):
    """Represents a single slide's content."""
    title: str
    content: Any
    slide_type: str = "list"


class SlideGenerationResult(NamedTuple):
    """Result of slide generation process."""
    slides: List[SlideContent]
    metadata: Dict[str, any]


# Shared system prompt for all models
SYSTEM_PROMPT = """You are a presentation designer. Your task is to convert a lecture transcript into JSON slides.

STEP 1: Read the transcript carefully
STEP 2: Identify 3-5 main topics or themes
STEP 3: Create slides for each topic with key points

STRICT RULES:
- Maximum 5 bullet points per slide
- Maximum 12 words per bullet point
- Use **bold** for important terms
- Use short phrases, NOT full sentences
- Only use information FROM the transcript

REQUIRED OUTPUT FORMAT (copy this structure exactly):
```json
{"slides": [
  {"type": "title", "title": "Main Topic", "content": "Brief subtitle"},
  {"type": "list", "title": "Key Points", "content": ["Point 1", "Point 2", "Point 3"]},
  {"type": "summary", "title": "Summary", "content": ["Takeaway 1", "Takeaway 2"]}
]}
```

IMPORTANT: Output ONLY valid JSON. No explanations before or after."""


class BaseContentGenerator(ABC):
    """Abstract base class for content generation backends."""
    
    def __init__(self):
        self.temperature = 0.3
        self.top_p = 0.9
        self.max_tokens = 2048
    
    @abstractmethod
    def generate_slides(
        self,
        transcript: str,
        max_slides: int = 10,
        subject: str = "General",
        grade: str = "K-12",
        **kwargs
    ) -> SlideGenerationResult:
        """Generate slides from transcript."""
        pass
    
    def _create_prompt(self, transcript: str, subject: str, max_slides: int) -> str:
        """Create the prompt for slide generation."""
        return f"""{SYSTEM_PROMPT}

TRANSCRIPT:
{transcript}

Create {max_slides} slides about {subject}. Output JSON only:"""
    
    def _parse_llm_response(self, response_text: str) -> Dict:
        """Parse LLM response into structured data."""
        try:
            cleaned_text = response_text.strip()
            
            # Remove markdown code blocks
            if cleaned_text.startswith('```json'):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.startswith('```'):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith('```'):
                cleaned_text = cleaned_text[:-3]
            
            cleaned_text = cleaned_text.strip()
            
            # Find the first complete JSON object by matching braces
            start_idx = cleaned_text.find('{')
            if start_idx == -1:
                raise ValueError("No JSON object found in response")
            
            # Count braces to find the matching closing brace
            brace_count = 0
            end_idx = start_idx
            in_string = False
            escape_next = False
            
            for i, char in enumerate(cleaned_text[start_idx:], start=start_idx):
                if escape_next:
                    escape_next = False
                    continue
                if char == '\\':
                    escape_next = True
                    continue
                if char == '"' and not escape_next:
                    in_string = not in_string
                    continue
                if in_string:
                    continue
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_idx = i
                        break
            
            json_str = cleaned_text[start_idx:end_idx+1]
            
            # Sanitize common JSON issues from LLM
            import re
            json_str = re.sub(r"'([^']*)':", r'"\1":', json_str)
            json_str = re.sub(r":\s*'([^']*)'", r': "\1"', json_str)
            json_str = re.sub(r"\[\s*'", '["', json_str)
            json_str = re.sub(r"',\s*'", '", "', json_str)
            json_str = re.sub(r"'\s*\]", '"]', json_str)
            json_str = re.sub(r',\s*}', '}', json_str)
            json_str = re.sub(r',\s*\]', ']', json_str)
            
            parsed_data = json.loads(json_str)
            
            if 'slides' not in parsed_data:
                if isinstance(parsed_data, list):
                    parsed_data = {'slides': parsed_data}
                else:
                    raise ValueError("Response does not contain 'slides' key")
            
            return parsed_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            raise Exception(f"Failed to parse response as JSON: {e}")
    
    def _process_slides(self, slides_data: Dict) -> List[SlideContent]:
        """Process raw slide data into SlideContent objects."""
        slides = []
        raw_slides = slides_data.get('slides', [])
        
        for i, slide_data in enumerate(raw_slides):
            try:
                content = slide_data.get('content', [])
                slide_type = slide_data.get('type', 'list')
                
                slide = SlideContent(
                    title=slide_data.get('title', f'Slide {i+1}'),
                    content=content,
                    slide_type=slide_type
                )
                slides.append(slide)
            except ValidationError as e:
                logger.warning(f"Invalid slide data at index {i}: {e}")
                continue
        
        return slides
    
    def _create_fallback_slides(self, transcript: str, subject: str) -> SlideGenerationResult:
        """Create basic slides when LLM fails."""
        words = transcript.split()
        
        slides = [
            SlideContent(
                title=subject or "Lecture Notes",
                content="Key concepts and ideas",
                slide_type="title"
            )
        ]
        
        chunk_size = max(len(words) // 3, 20)
        for i in range(0, min(len(words), chunk_size * 3), chunk_size):
            chunk = ' '.join(words[i:i+chunk_size])
            if chunk:
                sentences = chunk.split('.')[:3]
                bullets = [s.strip()[:60] for s in sentences if s.strip()]
                if bullets:
                    slides.append(SlideContent(
                        title=f"Key Points {len(slides)}",
                        content=bullets,
                        slide_type="list"
                    ))
        
        slides.append(SlideContent(
            title="Summary",
            content=["Review the key concepts", "Practice and apply"],
            slide_type="summary"
        ))
        
        return SlideGenerationResult(
            slides=slides,
            metadata={'fallback': True, 'slides_generated': len(slides)}
        )
    
    def validate_transcript(self, transcript: str) -> bool:
        """Validate transcript is suitable for processing."""
        if not transcript or not isinstance(transcript, str):
            return False
        if len(transcript.strip()) < 50:
            return False
        word_count = len(transcript.split())
        if word_count < 10:
            return False
        return True


class QwenContentGenerator(BaseContentGenerator):
    """Qwen 2.5 via llama-cpp-python (local GGUF model)."""
    
    def __init__(self):
        super().__init__()
        self.model_path = self._find_model_path()
        self._llm = None
        self.repeat_penalty = 1.1
        logger.info(f"QwenContentGenerator initialized with model: {self.model_path}")
    
    def _find_model_path(self) -> str:
        """Find the Qwen GGUF model file."""
        env_path = os.getenv("QWEN_MODEL_PATH")
        if env_path and os.path.exists(env_path):
            return env_path
        
        default_paths = [
            os.path.join(os.path.dirname(__file__), "..", "..", "models", "qwen2.5-7b.gguf"),
            os.path.join(os.path.dirname(__file__), "..", "models", "qwen2.5-7b.gguf"),
            "../models/qwen2.5-7b.gguf",
            "models/qwen2.5-7b.gguf",
        ]
        
        for path in default_paths:
            abs_path = os.path.abspath(path)
            if os.path.isdir(abs_path):
                gguf_files = glob.glob(os.path.join(abs_path, "*.gguf"))
                if gguf_files:
                    gguf_files.sort()
                    return gguf_files[0]
            elif os.path.isfile(abs_path) and abs_path.endswith('.gguf'):
                return abs_path
        
        raise ValueError("Qwen GGUF model not found. Set QWEN_MODEL_PATH or place model in models/")
    
    def _get_llm(self):
        """Get or initialize the LLM instance."""
        if self._llm is None:
            try:
                from llama_cpp import Llama
                
                logger.info(f"Loading Qwen 2.5 model from: {self.model_path}")
                
                n_gpu_layers = 0
                try:
                    import torch
                    if torch.cuda.is_available():
                        n_gpu_layers = -1
                        logger.info("Using CUDA for LLM inference")
                except ImportError:
                    pass
                
                self._llm = Llama(
                    model_path=self.model_path,
                    n_ctx=4096,
                    n_batch=512,
                    n_gpu_layers=n_gpu_layers,
                    verbose=False
                )
                logger.info("Qwen 2.5 model loaded successfully")
                
            except Exception as e:
                logger.error(f"Failed to load Qwen LLM: {e}")
                raise RuntimeError(f"Failed to load Qwen LLM: {e}")
        
        return self._llm
    
    def generate_slides(
        self,
        transcript: str,
        max_slides: int = 10,
        subject: str = "General",
        grade: str = "K-12",
        **kwargs
    ) -> SlideGenerationResult:
        """Generate slides using Qwen 2.5."""
        if not transcript or len(transcript.strip()) < 50:
            raise ValueError("Transcript is too short to generate meaningful slides")
        
        try:
            logger.info(f"[Qwen] Generating slides from transcript ({len(transcript)} chars)")
            
            if len(transcript) > 2500:
                transcript = transcript[:2500]
                logger.info("Transcript truncated to 2500 chars")
            
            prompt = self._create_prompt(transcript, subject, max_slides)
            llm = self._get_llm()
            
            response = llm(
                prompt,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                top_p=self.top_p,
                repeat_penalty=self.repeat_penalty
            )
            
            response_text = response['choices'][0]['text'].strip()
            
            if not response_text:
                logger.error("Empty response from Qwen, using fallback")
                return self._create_fallback_slides(transcript, subject)
            
            slides_data = self._parse_llm_response(response_text)
            slides = self._process_slides(slides_data)
            
            if not slides:
                return self._create_fallback_slides(transcript, subject)
            
            metadata = {
                'original_transcript_length': len(transcript),
                'slides_generated': len(slides),
                'generation_model': 'qwen2.5-instruct',
                'subject': subject,
                'grade': grade,
            }
            
            logger.info(f"[Qwen] Successfully generated {len(slides)} slides")
            return SlideGenerationResult(slides=slides, metadata=metadata)
            
        except Exception as e:
            logger.error(f"[Qwen] Slide generation failed: {str(e)}, using fallback")
            return self._create_fallback_slides(transcript, subject)


class GemmaContentGenerator(BaseContentGenerator):
    """Gemma 3 4B via llama-cpp-python (local GGUF model)."""
    
    def __init__(self):
        super().__init__()
        self.model_path = self._find_model_path()
        self._llm = None
        self.repeat_penalty = 1.1
        logger.info(f"GemmaContentGenerator initialized with model: {self.model_path}")
    
    def _find_model_path(self) -> str:
        """Find the Gemma 3 GGUF model file."""
        env_path = os.getenv("GEMMA_MODEL_PATH")
        if env_path and os.path.exists(env_path):
            return env_path
        
        default_paths = [
            os.path.join(os.path.dirname(__file__), "..", "..", "models", "gemma-3-4b.gguf", "gemma-3-4b-it-Q4_K_M.gguf"),
            os.path.join(os.path.dirname(__file__), "..", "models", "gemma-3-4b.gguf", "gemma-3-4b-it-Q4_K_M.gguf"),
            "../models/gemma-3-4b.gguf/gemma-3-4b-it-Q4_K_M.gguf",
            "models/gemma-3-4b.gguf/gemma-3-4b-it-Q4_K_M.gguf",
        ]
        
        for path in default_paths:
            abs_path = os.path.abspath(path)
            if os.path.isdir(abs_path):
                gguf_files = glob.glob(os.path.join(abs_path, "*.gguf"))
                if gguf_files:
                    gguf_files.sort()
                    return gguf_files[0]
            elif os.path.isfile(abs_path) and abs_path.endswith('.gguf'):
                return abs_path
        
        raise ValueError("Gemma 3 GGUF model not found. Set GEMMA_MODEL_PATH or place model in models/gemma-3-4b.gguf/")
    
    def _get_llm(self):
        """Get or initialize the LLM instance."""
        if self._llm is None:
            try:
                from llama_cpp import Llama
                
                logger.info(f"Loading Gemma 3 4B model from: {self.model_path}")
                
                n_gpu_layers = 0
                try:
                    import torch
                    if torch.cuda.is_available():
                        n_gpu_layers = -1
                        logger.info("Using CUDA for LLM inference")
                except ImportError:
                    pass
                
                self._llm = Llama(
                    model_path=self.model_path,
                    n_ctx=4096,
                    n_batch=512,
                    n_gpu_layers=n_gpu_layers,
                    verbose=False
                )
                logger.info("Gemma 3 4B model loaded successfully")
                
            except Exception as e:
                logger.error(f"Failed to load Gemma LLM: {e}")
                raise RuntimeError(f"Failed to load Gemma LLM: {e}")
        
        return self._llm
    
    def generate_slides(
        self,
        transcript: str,
        max_slides: int = 10,
        subject: str = "General",
        grade: str = "K-12",
        **kwargs
    ) -> SlideGenerationResult:
        """Generate slides using Gemma 2B."""
        if not transcript or len(transcript.strip()) < 50:
            raise ValueError("Transcript is too short to generate meaningful slides")
        
        try:
            logger.info(f"[Gemma 3] Generating slides from transcript ({len(transcript)} chars)")
            
            if len(transcript) > 2500:
                transcript = transcript[:2500]
                logger.info("Transcript truncated to 2500 chars")
            
            prompt = self._create_prompt(transcript, subject, max_slides)
            llm = self._get_llm()
            
            response = llm(
                prompt,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                top_p=self.top_p,
                repeat_penalty=self.repeat_penalty
            )
            
            response_text = response['choices'][0]['text'].strip()
            
            if not response_text:
                logger.error("Empty response from Gemma, using fallback")
                return self._create_fallback_slides(transcript, subject)
            
            slides_data = self._parse_llm_response(response_text)
            slides = self._process_slides(slides_data)
            
            if not slides:
                return self._create_fallback_slides(transcript, subject)
            
            metadata = {
                'original_transcript_length': len(transcript),
                'slides_generated': len(slides),
                'generation_model': 'gemma-3-4b-instruct',
                'subject': subject,
                'grade': grade,
            }
            
            logger.info(f"[Gemma 3] Successfully generated {len(slides)} slides")
            return SlideGenerationResult(slides=slides, metadata=metadata)
            
        except Exception as e:
            logger.error(f"[Gemma 3] Slide generation failed: {str(e)}, using fallback")
            return self._create_fallback_slides(transcript, subject)


class GeminiContentGenerator(BaseContentGenerator):
    """Google Gemini API (cloud-based)."""
    
    def __init__(self):
        super().__init__()
        self.api_key = os.getenv("GEMINI_API_KEY")
        self._model = None
        
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        logger.info("GeminiContentGenerator initialized")
    
    def _get_model(self):
        """Get or initialize the Gemini model."""
        if self._model is None:
            try:
                import google.generativeai as genai
                
                genai.configure(api_key=self.api_key)
                self._model = genai.GenerativeModel('gemini-3-flash-preview')
                logger.info("Gemini model initialized successfully")
                
            except Exception as e:
                logger.error(f"Failed to initialize Gemini: {e}")
                raise RuntimeError(f"Failed to initialize Gemini: {e}")
        
        return self._model
    
    def generate_slides(
        self,
        transcript: str,
        max_slides: int = 10,
        subject: str = "General",
        grade: str = "K-12",
        **kwargs
    ) -> SlideGenerationResult:
        """Generate slides using Gemini API."""
        if not transcript or len(transcript.strip()) < 50:
            raise ValueError("Transcript is too short to generate meaningful slides")
        
        try:
            logger.info(f"[Gemini] Generating slides from transcript ({len(transcript)} chars)")
            
            if len(transcript) > 4000:
                transcript = transcript[:4000]
                logger.info("Transcript truncated to 4000 chars")
            
            prompt = self._create_prompt(transcript, subject, max_slides)
            model = self._get_model()
            
            response = model.generate_content(
                prompt,
                generation_config={
                    'temperature': self.temperature,
                    'top_p': self.top_p,
                    'max_output_tokens': self.max_tokens,
                }
            )
            
            response_text = response.text.strip()
            
            if not response_text:
                logger.error("Empty response from Gemini, using fallback")
                return self._create_fallback_slides(transcript, subject)
            
            slides_data = self._parse_llm_response(response_text)
            slides = self._process_slides(slides_data)
            
            if not slides:
                return self._create_fallback_slides(transcript, subject)
            
            metadata = {
                'original_transcript_length': len(transcript),
                'slides_generated': len(slides),
                'generation_model': 'gemini-3-flash-preview',
                'subject': subject,
                'grade': grade,
            }
            
            logger.info(f"[Gemini] Successfully generated {len(slides)} slides")
            return SlideGenerationResult(slides=slides, metadata=metadata)
            
        except Exception as e:
            logger.error(f"[Gemini] Slide generation failed: {str(e)}, using fallback")
            return self._create_fallback_slides(transcript, subject)


def get_content_generator(model: str = "qwen") -> BaseContentGenerator:
    """
    Factory function to get the appropriate content generator.
    
    Args:
        model: One of "qwen", "gemma", or "gemini"
        
    Returns:
        BaseContentGenerator instance
    """
    model = model.lower()
    
    if model == "qwen":
        return QwenContentGenerator()
    elif model == "gemma":
        return GemmaContentGenerator()
    elif model == "gemini":
        return GeminiContentGenerator()
    else:
        logger.warning(f"Unknown model '{model}', defaulting to qwen")
        return QwenContentGenerator()


# Backward compatibility - default service uses Qwen
class ContentGenerationService(QwenContentGenerator):
    """Backward-compatible wrapper (defaults to Qwen)."""
    pass