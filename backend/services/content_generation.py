"""
Content generation service using Qwen 2.5 via llama-cpp-python for creating slides from transcripts.
Runs fully offline with local GGUF model.

TEACHER-FAITHFUL POLICY:
- The LLM is used ONLY to organize and clarify teacher's spoken content
- NO external knowledge, examples, or corrections are added
- Transcript is treated as ground truth
"""
import os
import json
import logging
import glob
from typing import Dict, List, Optional, NamedTuple, Any
from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)

# Lazy import for llama-cpp
_llama = None

class SlideContent(BaseModel):
    """Represents a single slide's content."""
    title: str
    content: List[str]  # List of bullet points
    slide_type: str = "content-slide"
    columns: Optional[Dict[str, List[str]]] = None
    sections: Optional[List[Dict[str, Any]]] = None
    questions: Optional[List[str]] = None
    image_keywords: Optional[List[str]] = None

class SlideGenerationResult(NamedTuple):
    """Result of slide generation process."""
    slides: List[SlideContent]
    metadata: Dict[str, any]

class ContentGenerationService:
    """
    Service for generating slide content from transcripts using Qwen 2.5 LLM.
    
    Uses llama-cpp-python for local, offline inference with GGUF models.
    Enforces teacher-faithful content policy: NO external knowledge added.
    """
    
    # Teacher-faithful system prompt
    SYSTEM_PROMPT = """You are a slide structuring assistant. Your ONLY job is to reorganize the teacher's spoken content into structured slides.

STRICT RULES - YOU MUST FOLLOW THESE EXACTLY:
1. Use ONLY words, concepts, and information from the transcript
2. DO NOT add examples not mentioned by the teacher
3. DO NOT add definitions the teacher did not provide
4. DO NOT correct any factual errors - preserve teacher's words
5. DO NOT introduce external knowledge or context
6. You may ONLY: organize, group related points, improve phrasing clarity
7. Keep teacher's terminology and explanations intact

OUTPUT FORMAT:
- Return ONLY valid JSON, no markdown, no explanations
- Follow the exact schema provided"""

    def __init__(self):
        """Initialize the content generation service."""
        self.model_path = self._find_model_path()
        self._llm = None
        
        # Generation parameters for deterministic output
        self.temperature = 0.1  # Low for consistency
        self.top_p = 0.9
        self.max_tokens = 4096
        self.repeat_penalty = 1.1
        
        logger.info(f"ContentGenerationService initialized with model: {self.model_path}")
    
    def _find_model_path(self) -> str:
        """Find the GGUF model path."""
        # Check environment variable first
        env_path = os.getenv("QWEN_MODEL_PATH")
        if env_path and os.path.exists(env_path):
            return env_path
        
        # Default paths to check
        default_paths = [
            os.path.join(os.path.dirname(__file__), "..", "..", "models", "qwen2.5-7b.gguf"),
            os.path.join(os.path.dirname(__file__), "..", "models", "qwen2.5-7b.gguf"),
            "../models/qwen2.5-7b.gguf",
            "models/qwen2.5-7b.gguf",
        ]
        
        for path in default_paths:
            abs_path = os.path.abspath(path)
            if os.path.isdir(abs_path):
                # Look for GGUF files in directory (handles split files)
                gguf_files = glob.glob(os.path.join(abs_path, "*.gguf"))
                if gguf_files:
                    # Return the first file - llama-cpp handles split files automatically
                    # by loading the first file (00001-of-00002)
                    gguf_files.sort()
                    logger.info(f"Found GGUF files: {gguf_files}")
                    return gguf_files[0]
            elif os.path.isfile(abs_path) and abs_path.endswith('.gguf'):
                return abs_path
        
        raise ValueError(
            "GGUF model not found. Please set QWEN_MODEL_PATH environment variable "
            "or place model in models/qwen2.5-7b.gguf/"
        )
    
    def _get_llm(self):
        """Lazy load the LLM."""
        global _llama
        
        if self._llm is None:
            try:
                from llama_cpp import Llama
                _llama = Llama
                
                logger.info(f"Loading Qwen 2.5 model from: {self.model_path}")
                
                # Determine GPU layers
                n_gpu_layers = 0
                try:
                    import torch
                    if torch.cuda.is_available():
                        n_gpu_layers = -1  # Use all layers on GPU
                        logger.info("Using CUDA for LLM inference")
                except ImportError:
                    pass
                
                self._llm = Llama(
                    model_path=self.model_path,
                    n_ctx=8192,  # Context window
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
        max_slides: int = 20,
        notes: str = "",
        syllabus: str = "",
        subject: str = "General",
        grade: str = "K-12",
        theme: str = "#4F46E5"
    ) -> SlideGenerationResult:
        """
        Generate slides from a lecture transcript.
        
        TEACHER-FAITHFUL: Only reorganizes and clarifies teacher's spoken content.
        Does NOT add external knowledge, examples, or corrections.
        
        Args:
            transcript: The full lecture transcript (ground truth)
            max_slides: Maximum number of slides to generate
            notes: Optional teacher notes (may be used for context)
            syllabus: Optional syllabus outline (may be used for organization)
            subject: Subject name
            grade: Grade level
            theme: Theme color for slides
            
        Returns:
            SlideGenerationResult with generated slides and metadata
            
        Raises:
            Exception: If slide generation fails
        """
        if not transcript or len(transcript.strip()) < 50:
            raise ValueError("Transcript is too short to generate meaningful slides")
        
        try:
            logger.info(f"Generating slides from transcript ({len(transcript)} characters)")
            
            # Create teacher-faithful prompt
            prompt = self._create_teacher_faithful_prompt(
                transcript=transcript,
                notes=notes,
                syllabus=syllabus,
                subject=subject,
                grade=grade,
                max_slides=max_slides
            )
            
            # Get LLM
            llm = self._get_llm()
            
            # Generate with deterministic settings
            response = llm(
                prompt,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                top_p=self.top_p,
                repeat_penalty=self.repeat_penalty,
                stop=["```", "\n\n\n"]
            )
            
            response_text = response['choices'][0]['text'].strip()
            
            if not response_text:
                raise Exception("Empty response from LLM")
            
            # Parse the JSON response
            slides_data = self._parse_llm_response(response_text)
            
            # Validate and create slide objects
            slides = self._process_slides(slides_data)
            
            if not slides:
                raise Exception("No valid slides generated from transcript")
            
            metadata = {
                'original_transcript_length': len(transcript),
                'slides_generated': len(slides),
                'generation_model': 'qwen2.5-7b-instruct-q4_k_m',
                'subject': subject,
                'grade': grade,
                'theme': theme,
                'teacher_faithful': True,  # Flag indicating content policy
                'prompt_tokens': response.get('usage', {}).get('prompt_tokens', 0),
                'completion_tokens': response.get('usage', {}).get('completion_tokens', 0)
            }
            
            logger.info(f"Successfully generated {len(slides)} slides")
            
            return SlideGenerationResult(
                slides=slides,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Slide generation failed: {str(e)}")
            raise Exception(f"Slide generation failed: {str(e)}")
    
    def _create_teacher_faithful_prompt(
        self,
        transcript: str,
        notes: str,
        syllabus: str,
        subject: str,
        grade: str,
        max_slides: int
    ) -> str:
        """Create a teacher-faithful prompt that prevents external knowledge injection."""
        
        prompt = f"""{self.SYSTEM_PROMPT}

TASK: Convert the following teacher transcript into structured slides.
Use ONLY the content from the transcript. Do not add any information.

TRANSCRIPT (This is the ground truth - use only this):
---
{transcript}
---

{f"TEACHER NOTES (for organizational context only): {notes}" if notes else ""}
{f"SYLLABUS (for structure reference only): {syllabus}" if syllabus else ""}

REQUIREMENTS:
- Subject: {subject}
- Grade Level: {grade}
- Maximum slides: {max_slides}
- Generate fewer slides if transcript content is limited

OUTPUT JSON SCHEMA:
{{
  "slides": [
    {{
      "title": "Slide title derived from transcript content",
      "content": ["Bullet point 1 from transcript", "Bullet point 2 from transcript"],
      "slide_type": "content-slide"
    }}
  ]
}}

SLIDE TYPES ALLOWED:
- title-slide: Opening slide
- content-slide: Standard bullet points
- summary-slide: Key takeaways from transcript

Remember: ONLY use content from the transcript. No external knowledge.

OUTPUT (JSON only, no markdown):"""

        return prompt
    
    def _process_slides(self, slides_data: Dict) -> List[SlideContent]:
        """Process the slide data into SlideContent objects."""
        slides = []
        raw_slides = slides_data.get('slides', [])
        
        for i, slide_data in enumerate(raw_slides):
            try:
                content = slide_data.get('content', [])
                if not content and slide_data.get('heading'):
                    content = [slide_data.get('heading', '')]
                if slide_data.get('subheading'):
                    content.append(slide_data.get('subheading', ''))
                
                # Handle sections format
                sections = slide_data.get('sections')
                if sections:
                    for section in sections:
                        if section.get('bullets'):
                            content.extend(section.get('bullets', []))
                
                # Handle questions
                questions = slide_data.get('questions')
                if questions:
                    content.extend(questions)
                
                slide = SlideContent(
                    title=slide_data.get('heading', slide_data.get('title', f'Slide {i+1}')),
                    content=content if content else ['Content'],
                    slide_type=slide_data.get('type', slide_data.get('slide_type', 'content-slide')),
                    columns=slide_data.get('columns'),
                    sections=sections,
                    questions=questions,
                    image_keywords=slide_data.get('image_keywords', [])
                )
                slides.append(slide)
            except ValidationError as e:
                logger.warning(f"Invalid slide data at index {i}: {e}")
                continue
        
        return slides
    
    def _parse_llm_response(self, response_text: str) -> Dict:
        """
        Parse the JSON response from LLM.
        
        Args:
            response_text: Raw response text from LLM
            
        Returns:
            Parsed JSON data
            
        Raises:
            Exception: If JSON parsing fails
        """
        try:
            # Clean up the response text
            cleaned_text = response_text.strip()
            
            # Remove markdown code blocks if present
            if cleaned_text.startswith('```json'):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.startswith('```'):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith('```'):
                cleaned_text = cleaned_text[:-3]
            
            cleaned_text = cleaned_text.strip()
            
            # Parse JSON
            parsed_data = json.loads(cleaned_text)
            
            # Validate basic structure
            if 'slides' not in parsed_data:
                if isinstance(parsed_data, list):
                    parsed_data = {'slides': parsed_data}
                else:
                    raise ValueError("Response does not contain 'slides' key")
            
            return parsed_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            logger.debug(f"Response text: {response_text[:500]}...")
            
            # Try to extract JSON from response
            import re
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass
            
            raise Exception(f"Failed to parse response as JSON: {e}")
    
    def validate_transcript(self, transcript: str) -> bool:
        """
        Validate that the transcript is suitable for slide generation.
        
        Args:
            transcript: The transcript text to validate
            
        Returns:
            True if valid, False otherwise
        """
        if not transcript or not isinstance(transcript, str):
            return False
        
        if len(transcript.strip()) < 50:
            return False
        
        word_count = len(transcript.split())
        if word_count < 10:
            return False
        
        return True