"""
Content generation service using Google Gemini API for creating slides from transcripts.
"""
import os
import json
import logging
from typing import Dict, List, Optional, NamedTuple
import google.generativeai as genai
from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)

class SlideContent(BaseModel):
    """Represents a single slide's content."""
    title: str
    content: List[str]  # List of bullet points

class SlideGenerationResult(NamedTuple):
    """Result of slide generation process."""
    slides: List[SlideContent]
    metadata: Dict[str, any]

class ContentGenerationService:
    """Service for generating slide content from transcripts using Google Gemini."""
    
    def __init__(self):
        """Initialize the content generation service."""
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is required")
        
        genai.configure(api_key=self.api_key)
        # Using latest gemini-2.5-flash model
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Generation configuration
        self.generation_config = genai.types.GenerationConfig(
            temperature=0.3,  # Lower temperature for more consistent output
            top_p=0.8,
            top_k=40,
            max_output_tokens=4096,
        )
    
    def generate_slides(self, transcript: str, max_slides: int = 20) -> SlideGenerationResult:
        """
        Generate slides from a lecture transcript.
        
        Args:
            transcript: The full lecture transcript
            max_slides: Maximum number of slides to generate
            
        Returns:
            SlideGenerationResult with generated slides and metadata
            
        Raises:
            Exception: If slide generation fails
        """
        if not transcript or len(transcript.strip()) < 50:
            raise ValueError("Transcript is too short to generate meaningful slides")
        
        try:
            logger.info(f"Generating slides from transcript ({len(transcript)} characters)")
            
            # Create structured prompt for slide generation
            prompt = self._create_slide_generation_prompt(transcript, max_slides)
            
            # Generate content using Gemini
            response = self.model.generate_content(
                prompt,
                generation_config=self.generation_config
            )
            
            if not response.text:
                raise Exception("Empty response from Gemini API")
            
            # Parse the JSON response
            slides_data = self._parse_gemini_response(response.text)
            
            # Validate and create slide objects
            slides = []
            for i, slide_data in enumerate(slides_data.get('slides', [])):
                try:
                    slide = SlideContent(
                        title=slide_data.get('title', f'Slide {i+1}'),
                        content=slide_data.get('content', [])
                    )
                    slides.append(slide)
                except ValidationError as e:
                    logger.warning(f"Invalid slide data at index {i}: {e}")
                    continue
            
            if not slides:
                raise Exception("No valid slides generated from transcript")
            
            metadata = {
                'original_transcript_length': len(transcript),
                'slides_generated': len(slides),
                'generation_model': 'gemini-pro',
                'prompt_tokens_estimate': len(prompt.split()),
                'response_tokens_estimate': len(response.text.split()) if response.text else 0
            }
            
            logger.info(f"Successfully generated {len(slides)} slides")
            
            return SlideGenerationResult(
                slides=slides,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Slide generation failed: {str(e)}")
            raise Exception(f"Slide generation failed: {str(e)}")
    
    def _create_slide_generation_prompt(self, transcript: str, max_slides: int) -> str:
        """Create a structured prompt for slide generation."""
        prompt = f"""
You are an expert educational content creator. Convert the following lecture transcript into a structured slide presentation.

INSTRUCTIONS:
1. Create {max_slides} slides maximum
2. Each slide should have a clear, descriptive title
3. Each slide should contain 3-5 bullet points that capture the key concepts
4. Focus on the main ideas, examples, and important details
5. Maintain logical flow and organization
6. Use clear, concise language suitable for students
7. Return ONLY valid JSON in the exact format specified below

TRANSCRIPT:
{transcript}

REQUIRED JSON FORMAT:
{{
  "slides": [
    {{
      "title": "Clear, descriptive slide title",
      "content": [
        "First key point or concept",
        "Second important detail",
        "Third supporting information",
        "Fourth example or elaboration",
        "Fifth concluding point"
      ]
    }}
  ]
}}

Generate the slides now:"""
        
        return prompt
    
    def _parse_gemini_response(self, response_text: str) -> Dict:
        """
        Parse the JSON response from Gemini API.
        
        Args:
            response_text: Raw response text from Gemini
            
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
            if not isinstance(parsed_data, dict):
                raise ValueError("Response is not a JSON object")
            
            if 'slides' not in parsed_data:
                raise ValueError("Response missing 'slides' key")
            
            if not isinstance(parsed_data['slides'], list):
                raise ValueError("'slides' is not a list")
            
            return parsed_data
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed: {e}")
            logger.error(f"Raw response: {response_text[:500]}...")
            raise Exception(f"Failed to parse Gemini response as JSON: {e}")
        except Exception as e:
            logger.error(f"Response validation failed: {e}")
            raise Exception(f"Invalid response format: {e}")
    
    def validate_transcript(self, transcript: str) -> bool:
        """
        Validate that a transcript is suitable for slide generation.
        
        Args:
            transcript: The transcript to validate
            
        Returns:
            True if transcript is valid, False otherwise
        """
        if not transcript or not isinstance(transcript, str):
            return False
        
        # Check minimum length
        if len(transcript.strip()) < 50:
            return False
        
        # Check for reasonable word count
        word_count = len(transcript.split())
        if word_count < 10:
            return False
        
        return True