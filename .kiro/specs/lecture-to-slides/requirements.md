# Requirements Document

## Introduction

The lecture-to-slides feature is the core MVP functionality of project-eduVision that transforms spoken lectures into structured, editable slide presentations. This feature enables educators to record their lectures and automatically generate professional slide decks with accompanying notes, reducing preparation time and allowing them to focus on teaching. The system will process completed lectures (not real-time) and provide an intuitive editing interface for refinement.

## Requirements

### Requirement 1

**User Story:** As an educator, I want to authenticate with my institutional email, so that I can securely access the lecture processing system.

#### Acceptance Criteria

1. WHEN a user visits the registration page THEN the system SHALL require an email address ending with .edu
2. WHEN a user provides valid credentials THEN the system SHALL create a secure session token
3. WHEN a user provides invalid .edu email THEN the system SHALL display an appropriate error message
4. WHEN a user logs in successfully THEN the system SHALL redirect them to their personal dashboard

### Requirement 2

**User Story:** As an educator, I want to record my lecture audio through the web interface, so that I can capture the content for processing without external tools.

#### Acceptance Criteria

1. WHEN a user clicks "Start New Session" THEN the system SHALL request microphone permissions
2. WHEN microphone access is granted THEN the system SHALL display a "Listening..." indicator
3. WHEN a user clicks "Start Recording" THEN the system SHALL begin capturing audio using the browser's MediaRecorder API
4. WHEN a user clicks "Stop Recording" THEN the system SHALL stop audio capture and prepare the file for upload
5. WHEN recording is active THEN the system SHALL provide visual feedback of the recording status
6. WHEN audio recording fails THEN the system SHALL display an error message and allow retry

### Requirement 3

**User Story:** As an educator, I want my recorded lecture to be automatically transcribed, so that the system can understand the spoken content.

#### Acceptance Criteria

1. WHEN an audio file is uploaded THEN the system SHALL process it using the faster-whisper transcription service
2. WHEN transcription begins THEN the system SHALL display a processing indicator to the user
3. WHEN transcription completes successfully THEN the system SHALL store the full transcript
4. WHEN transcription fails THEN the system SHALL display an error message and allow re-upload
5. WHEN the transcription service reports low confidence on specific words THEN the system SHALL visually highlight those words in the editable transcript view (e.g., with a yellow underline)
6. WHEN low confidence words are present THEN the system SHALL display a single, non-blocking notification upon first view, advising the user to review the highlighted sections for accuracy

### Requirement 4

**User Story:** As an educator, I want my lecture transcript to be automatically structured into slides, so that I can have a professional presentation without manual formatting.

#### Acceptance Criteria

1. WHEN a transcript is available THEN the system SHALL send it to the Google Gemini API with a structured prompt
2. WHEN the LLM processes the transcript THEN the system SHALL receive a JSON response with slide data
3. WHEN slide generation completes THEN the system SHALL create individual slide records with titles and bullet points
4. WHEN slide generation fails THEN the system SHALL display an error and allow manual retry
5. WHEN the transcript is very short THEN the system SHALL generate at least one slide with available content
6. WHEN the transcript is very long THEN the system SHALL intelligently break it into logical slide segments

### Requirement 5

**User Story:** As an educator, I want to view and edit the generated slides, so that I can correct any transcription errors and customize the content.

#### Acceptance Criteria

1. WHEN slides are generated THEN the system SHALL display them in an intuitive web-based editor
2. WHEN a user clicks on slide content THEN the system SHALL make that content editable
3. WHEN a user modifies slide text THEN the system SHALL provide a "Save Changes" option
4. WHEN changes are saved THEN the system SHALL update the database and confirm the save
5. WHEN a user attempts to navigate away from the editor page with unsaved changes (e.g., closing tab, clicking back) THEN the browser's native "Are you sure you want to leave?" prompt SHALL be triggered
6. WHEN editing is complete THEN the system SHALL allow the user to preview the final presentation
7. WHEN a user modifies slide text THEN the system SHALL automatically save a draft of the content to the browser's localStorage every 10 seconds
8. WHEN a user re-visits an editing session that was accidentally closed THEN the system SHALL detect the localStorage draft and prompt the user to restore the unsaved content

### Requirement 6

**User Story:** As an educator, I want to save and export my processed lectures, so that I can use them in my teaching and share with students.

#### Acceptance Criteria

1. WHEN a user completes editing THEN the system SHALL save the project to their dashboard
2. WHEN a user requests export THEN the system SHALL provide distinct options for PDF and PPTX formats
3. WHEN export is requested THEN the system SHALL generate the file and provide a download link
4. WHEN a user views their dashboard THEN the system SHALL display all their saved lecture sessions
5. WHEN a user clicks on a saved session THEN the system SHALL allow them to re-edit or re-export
6. WHEN PDF export is selected THEN the system SHALL generate a non-editable document where each slide corresponds to a page, preserving the title and bullet points
7. WHEN PPTX export is selected THEN the system SHALL generate an editable .pptx file where each slide is a native PowerPoint slide with editable title and content text boxes

### Requirement 7

**User Story:** As an educator, I want the system to handle errors gracefully, so that I don't lose my work due to technical issues.

#### Acceptance Criteria

1. WHEN any API call fails THEN the system SHALL display user-friendly error messages
2. WHEN network connectivity is lost THEN the system SHALL attempt to preserve user data locally
3. WHEN the session expires THEN the system SHALL prompt for re-authentication without losing current work
4. WHEN processing takes longer than expected THEN the system SHALL provide progress updates
5. WHEN an error occurs during processing THEN the system SHALL log the error and provide recovery options

### Requirement 8

**User Story:** As a developer, I want to define clear operational limits and performance benchmarks, so that the system remains stable and the user experience is predictable.

#### Acceptance Criteria

1. WHEN a user uploads an audio file THEN the system SHALL enforce a maximum file size of 500MB
2. WHEN a user uploads an audio file THEN the system SHALL enforce a maximum recording duration of 120 minutes
3. WHEN a lecture is submitted for processing THEN the system SHALL aim to complete transcription and slide generation in no more than 50% of the original audio's duration (e.g., a 60-minute lecture processed in under 30 minutes)
4. WHEN processing exceeds the defined performance benchmark THEN the system SHALL notify the user of the delay and continue processing in the background, allowing the user to navigate away from the processing screen