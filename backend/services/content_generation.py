"""
Content generation service using Qwen 2.5 via llama-cpp-python for creating slides from transcripts.
Runs fully offline with local GGUF model.
"""
import os
import json
import logging
import glob
from typing import Dict, List, Optional, NamedTuple, Any
from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)

_llama = None

class SlideContent(BaseModel):
    """Represents a single slide's content."""
    title: str
    content: Any
    slide_type: str = "list"
    
class SlideGenerationResult(NamedTuple):
    """Result of slide generation process."""
    slides: List[SlideContent]
    metadata: Dict[str, any]

class ContentGenerationService:
    """Service for generating slide content from transcripts using Qwen 2.5 LLM."""
    
    SYSTEM_PROMPT = """You are a presentation designer. Convert lecture transcripts into clean JSON slides.

RULES:
1. Use ONLY content from the transcript
2. Maximum 5 bullets per slide, 12 words per bullet
3. Use **bold** for key terms
4. Short phrases only, no full sentences

SLIDE TYPES: title, list, summary

OUTPUT: Valid JSON only.
{"slides": [{"type": "title", "title": "Topic", "content": "Subtitle"}, {"type": "list", "title": "Points", "content": ["Point 1", "Point 2"]}]}"""

    def __init__(self):
        self.model_path = self._find_model_path()
        self._llm = None
        self.temperature = 0.3
        self.top_p = 0.9
        self.max_tokens = 2048
        self.repeat_penalty = 1.1
        logger.info(f"ContentGenerationService initialized with model: {self.model_path}")
    
    def _find_model_path(self) -> str:
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
                    logger.info(f"Found GGUF files: {gguf_files}")
                    return gguf_files[0]
            elif os.path.isfile(abs_path) and abs_path.endswith('.gguf'):
                return abs_path
        
        raise ValueError("GGUF model not found. Set QWEN_MODEL_PATH or place model in models/")
    
    def _get_llm(self):
        global _llama
        
        if self._llm is None:
            try:
                from llama_cpp import Llama
                _llama = Llama
                
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
                logger.error(f"Failed to load LLM: {e}")
                raise RuntimeError(f"Failed to load LLM: {e}")
        
        return self._llm
    
    def generate_slides(
        self, 
        transcript: str, 
        max_slides: int = 10,
        notes: str = "",
        syllabus: str = "",
        subject: str = "General",
        grade: str = "K-12",
        theme: str = "#4F46E5"
    ) -> SlideGenerationResult:
        if not transcript or len(transcript.strip()) < 50:
            raise ValueError("Transcript is too short to generate meaningful slides")
        
        try:
            logger.info(f"Generating slides from transcript ({len(transcript)} characters)")
            
            # Truncate long transcripts
            if len(transcript) > 2500:
                transcript = transcript[:2500]
                logger.info("Transcript truncated to 2500 chars")
            
            prompt = self._create_prompt(transcript, subject, max_slides)
            logger.info(f"Prompt length: {len(prompt)} chars")
            
            llm = self._get_llm()
            
            response = llm(
                prompt,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                top_p=self.top_p,
                repeat_penalty=self.repeat_penalty
            )
            
            response_text = response['choices'][0]['text'].strip()
            logger.info(f"LLM response length: {len(response_text)} chars")
            
            if not response_text:
                logger.error("Empty response from LLM, using fallback")
                return self._create_fallback_slides(transcript, subject)
            
            slides_data = self._parse_llm_response(response_text)
            slides = self._process_slides(slides_data)
            
            if not slides:
                logger.warning("No slides parsed, using fallback")
                return self._create_fallback_slides(transcript, subject)
            
            metadata = {
                'original_transcript_length': len(transcript),
                'slides_generated': len(slides),
                'generation_model': 'qwen2.5-7b-instruct-q4_k_m',
                'subject': subject,
                'grade': grade,
                'theme': theme,
            }
            
            logger.info(f"Successfully generated {len(slides)} slides")
            return SlideGenerationResult(slides=slides, metadata=metadata)
            
        except Exception as e:
            logger.error(f"Slide generation failed: {str(e)}, using fallback")
            return self._create_fallback_slides(transcript, subject)
    
    def _create_prompt(self, transcript: str, subject: str, max_slides: int) -> str:
        return f"""{self.SYSTEM_PROMPT}

TRANSCRIPT:
{transcript}

Create {max_slides} slides about {subject}. Output JSON only:"""
    
    def _create_fallback_slides(self, transcript: str, subject: str) -> SlideGenerationResult:
        """Create basic slides when LLM fails."""
        words = transcript.split()
        
        # Create simple slides from transcript
        slides = [
            SlideContent(
                title=subject or "Lecture Notes",
                content="Key concepts and ideas",
                slide_type="title"
            )
        ]
        
        # Split transcript into chunks for slides
        chunk_size = max(len(words) // 3, 20)
        for i in range(0, min(len(words), chunk_size * 3), chunk_size):
            chunk = ' '.join(words[i:i+chunk_size])
            if chunk:
                # Extract key sentences
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
    
    def _process_slides(self, slides_data: Dict) -> List[SlideContent]:
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
    
    def _parse_llm_response(self, response_text: str) -> Dict:
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
            # Replace single quotes with double quotes (but be careful with apostrophes)
            import re
            # Replace single quotes used as string delimiters
            json_str = re.sub(r"'([^']*)':", r'"\1":', json_str)  # Keys
            json_str = re.sub(r":\s*'([^']*)'", r': "\1"', json_str)  # String values
            json_str = re.sub(r"\[\s*'", '["', json_str)  # Array start
            json_str = re.sub(r"',\s*'", '", "', json_str)  # Array items
            json_str = re.sub(r"'\s*\]", '"]', json_str)  # Array end
            
            # Remove trailing commas
            json_str = re.sub(r',\s*}', '}', json_str)
            json_str = re.sub(r',\s*\]', ']', json_str)
            
            logger.debug(f"Sanitized JSON: {json_str[:300]}...")
            
            parsed_data = json.loads(json_str)
            
            if 'slides' not in parsed_data:
                if isinstance(parsed_data, list):
                    parsed_data = {'slides': parsed_data}
                else:
                    raise ValueError("Response does not contain 'slides' key")
            
            return parsed_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            logger.debug(f"Response text: {response_text[:500]}...")
            raise Exception(f"Failed to parse response as JSON: {e}")
    
    def validate_transcript(self, transcript: str) -> bool:
        if not transcript or not isinstance(transcript, str):
            return False
        if len(transcript.strip()) < 50:
            return False
        word_count = len(transcript.split())
        if word_count < 10:
            return False
        return True