"""
Content generation service using Google Gemini API for creating slides from transcripts.
Enhanced with structured K-12 instructional design prompts.
"""
import os
import json
import logging
from typing import Dict, List, Optional, NamedTuple, Any
import google.generativeai as genai
from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)

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
            max_output_tokens=8192,
        )
    
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
        
        Args:
            transcript: The full lecture transcript
            max_slides: Maximum number of slides to generate
            notes: Optional teacher notes
            syllabus: Optional syllabus outline
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
            
            # Create structured prompt for slide generation
            prompt = self._create_enhanced_prompt(
                transcript=transcript,
                notes=notes,
                syllabus=syllabus,
                subject=subject,
                grade=grade,
                theme=theme,
                max_slides=max_slides
            )
            
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
            slides = self._process_enhanced_slides(slides_data)
            
            if not slides:
                raise Exception("No valid slides generated from transcript")
            
            metadata = {
                'original_transcript_length': len(transcript),
                'slides_generated': len(slides),
                'generation_model': 'gemini-2.5-flash',
                'subject': subject,
                'grade': grade,
                'theme': theme,
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
    
    def _create_enhanced_prompt(
        self,
        transcript: str,
        notes: str,
        syllabus: str,
        subject: str,
        grade: str,
        theme: str,
        max_slides: int
    ) -> str:
        """Create an enhanced structured prompt for K-12 slide generation."""
        
        prompt = f"""You are an expert instructional designer for K-12 content.
Generate clean, minimal, academic-quality slides with structured formatting elements:
- Bold text using **double asterisks**
- Subheaders using "### "
- Section separators using "---"
- Two-column groups using "columns": {{"left": [...], "right": [...]}}
- Key terms highlighted using **ALL CAPS**
- Short definitions labeled clearly
- Optional visual indicators such as:
  - Horizontal dividers: "---"
  - Emphasis blocks: "**Important:**"
  - Title hierarchy: H1 > H2 > H3

STRICT RULES:
1. Never add content beyond the transcript, notes, or syllabus provided.
2. If the teacher spoke very little, output a SHORT micro-deck (2-4 slides).
3. You may add supporting detail ONLY from notes or syllabus if provided.
4. Maintain teacher intent - do not change the meaning.
5. Slides must remain concise, readable, and educational.
6. Maximum 30 words per slide (excluding headings).
7. Generate a maximum of {max_slides} slides.
8. Output must follow the JSON schema precisely (no extra text).
9. For each slide, suggest 2-3 image_keywords that could be used to find relevant images.

SLIDE TYPES ALLOWED:
- title-slide: Opening slide with main title and subtitle
- content-slide: Standard slide with bullet points
- split-slide: Two columns for comparisons or term/definition pairs
- definition-slide: For key vocabulary
- example-slide: For worked examples or illustrations
- summary-slide: For key takeaways
- quiz-slide: For comprehension check questions

INPUTS:
---
Teacher Transcript:
{transcript}

Teacher Notes:
{notes if notes else "(No notes provided)"}

Syllabus Outline:
{syllabus if syllabus else "(No syllabus provided)"}

Subject: {subject}
Grade Level: {grade}
Theme Color: {theme}
---

OUTPUT FORMAT (MANDATORY JSON ONLY):

{{
  "title": "<Inferred title from content>",
  "subject": "{subject}",
  "grade": "{grade}",
  "theme": "{theme}",
  "slides": [
    {{
      "type": "title-slide",
      "heading": "<Main Title>",
      "subheading": "<Short Subtitle>",
      "content": ["<Title>", "<Subtitle>"],
      "image_keywords": ["keyword1", "keyword2"]
    }},
    {{
      "type": "content-slide",
      "heading": "<Heading>",
      "content": ["**Key point 1**", "Supporting detail", "Another point"],
      "sections": [
        {{
          "title": "### Concept Overview",
          "bullets": ["**Key idea**...", "Important detail..."]
        }}
      ],
      "image_keywords": ["keyword1", "keyword2"]
    }},
    {{
      "type": "split-slide",
      "heading": "<Comparison or Terms>",
      "content": ["Left column summary", "Right column summary"],
      "columns": {{
        "left": ["**Term A**", "Definition...", "---", "**Term B**", "Definition..."],
        "right": ["Diagram explanation...", "Short notes..."]
      }},
      "image_keywords": ["keyword1", "keyword2"]
    }},
    {{
      "type": "summary-slide",
      "heading": "Summary",
      "content": ["Key takeaway 1", "Key takeaway 2"],
      "image_keywords": ["keyword1", "keyword2"]
    }},
    {{
      "type": "quiz-slide",
      "heading": "Check Your Understanding",
      "content": ["Q1?", "Q2?"],
      "questions": ["Q1?", "Q2?"]
    }}
  ]
}}

TASK:
Analyze the transcript and produce a clean, well-structured slide deck.
Use **bold**, subheaders, and dividers where it improves clarity.
If content is minimal, generate a minimal slide deck.
Focus ONLY on what the teacher actually said - do not add external information.
Suggest relevant image_keywords for visual enhancement.

Do NOT include any explanations - output ONLY valid JSON."""

        return prompt
    
    def _process_enhanced_slides(self, slides_data: Dict) -> List[SlideContent]:
        """Process the enhanced slide format into SlideContent objects."""
        slides = []
        raw_slides = slides_data.get('slides', [])
        
        for i, slide_data in enumerate(raw_slides):
            try:
                # Extract content - handle both old and new formats
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
                    slide_type=slide_data.get('type', 'content-slide'),
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
            if 'slides' not in parsed_data:
                # Try to wrap single slide in array
                if isinstance(parsed_data, list):
                    parsed_data = {'slides': parsed_data}
                else:
                    raise ValueError("Response does not contain 'slides' key")
            
            return parsed_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
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
        
        # Check minimum length
        if len(transcript.strip()) < 50:
            return False
        
        # Check for reasonable word count
        word_count = len(transcript.split())
        if word_count < 10:
            return False
        
        return True