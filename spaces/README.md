---
title: Project EDU - Lecture to Slides
emoji: 📚
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# Project EDU - Lecture to Slides

Teacher-faithful lecture transcription and slide generation.

## Endpoints

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/asr` | POST | audio file | `{"transcript": "..."}` |
| `/slides` | POST | `{"transcript": "..."}` | `{"slides": "..."}` |

## Hardware

- **Required**: CPU Upgrade (16GB RAM)
- **Models**: ~6GB total memory

## Teacher-Faithful Policy

- Uses ONLY transcript content
- No external knowledge added
- No fact corrections
