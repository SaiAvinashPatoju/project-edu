# Architecture Rework Plan — Speech-to-Slide Generator for Schools

## 1) Product Goal
Build **Project EDU** into a school-ready teaching product that converts:
1. **Teacher speech** (existing pipeline), or
2. **Uploaded material/syllabus**

into a **hybrid, teacher-controlled presentation** that combines:
- **Slidev slides** for clear notes and interactive classroom flow.
- **Manim visual sequences** for deep conceptual understanding.

Core orchestration “brain”: **Gemini-3-Flash-Preview**.

---

## 2) Vision Statement
Create the best classroom learning experience by making lesson delivery:
- **Fast** (minutes from input to presentation),
- **Pedagogically rich** (notes + conceptual animations),
- **Teacher-aligned** (editable, explainable, and controllable),
- **School-safe** (privacy, moderation, reliability, auditability).

---

## 3) Rework Scope

### In Scope
- Unified ingestion for speech + material uploads.
- Multi-stage planning and generation pipeline driven by Gemini.
- Slidev generation, build, and preview.
- Manim scene planning, generation, render, and embed.
- Hybrid deck assembler (Slidev + Manim assets).
- Teacher control UI for review, edits, locking, and re-generation.
- Operational controls for school usage (roles, logs, quotas, safety).

### Out of Scope (v1)
- Real-time live lecture streaming generation during class.
- Student-facing adaptive personalization.
- LMS deep integrations beyond basic export links/files.

---

## 4) Target Users & Jobs-to-be-Done

### Primary Users
- **Teachers**: Need to prepare high-quality lessons quickly.
- **Academic coordinators**: Need consistency and quality standards.

### Jobs-to-be-Done
- Turn spoken lecture or syllabus chapter into a full teachable deck.
- Explain difficult concepts using visual animations.
- Maintain strict control over final classroom content.

---

## 5) Proposed High-Level Architecture

```text
[Input Layer]
  ├─ Speech Ingestion (audio/video -> transcript)
  └─ Document Ingestion (pdf/docx/pptx/text/syllabus)
          |
          v
[Knowledge Normalization Layer]
  ├─ Cleaning, chunking, metadata extraction
  ├─ Curriculum tagging (grade, subject, topic)
  └─ Source grounding index (citation anchors)
          |
          v
[Orchestration Layer: Gemini-3-Flash-Preview]
  ├─ Lesson planner (learning objectives, flow, timing)
  ├─ Slide blueprint generator (Slidev outline + speaker notes)
  ├─ Visualization planner (what needs Manim + why)
  ├─ QA/self-check loop (accuracy, age suitability, completeness)
  └─ Tool-call coordinator
          |
          +----------------------+
          |                      |
          v                      v
[Slidev Generation Toolchain]  [Manim Generation Toolchain]
  ├─ MD/Theme authoring          ├─ Scene script authoring
  ├─ Build/compile               ├─ Render pipeline
  └─ Preview artifacts           └─ Video/GIF/PNG artifacts
          |                      |
          +----------+-----------+
                     v
           [Hybrid Deck Composer]
            ├─ Embed manim outputs in Slidev
            ├─ Navigation + teacher controls
            └─ Export (web, pdf, package)
                     |
                     v
             [Teacher Review Workspace]
              ├─ Edit/approve/regenerate sections
              ├─ Versioning & rollback
              └─ Classroom mode delivery
```

---

## 6) Core System Modules

1. **Ingestion Service**
   - Accepts audio/video uploads and document uploads.
   - Extracts transcript/text and structural metadata.

2. **Curriculum & Grounding Service**
   - Normalizes and tags content by grade/subject/topic.
   - Maintains source spans for traceability.

3. **Agent Orchestrator (Gemini Brain)**
   - Breaks task into planning, generation, verification stages.
   - Calls Slidev and Manim generation workflows with strict schemas.

4. **Slidev Tool Runtime**
   - Generates Slidev Markdown, themes, interactions, notes.
   - Builds and validates output deck.

5. **Manim Tool Runtime**
   - Generates animation code and rendering plan.
   - Renders assets and returns deterministic references.

6. **Hybrid Composer**
   - Inserts Manim assets at pedagogically relevant steps.
   - Produces cohesive final deck with teacher control switches.

7. **Teacher Control Console**
   - Approve/reject per slide or per scene.
   - Regenerate only selected sections.
   - Lock source fidelity mode if needed.

8. **School Operations Layer**
   - Authentication/roles (teacher, admin).
   - Usage quotas, job queues, logs, observability.
   - Policy checks and sensitive-content filtering.

---

## 7) Agentic Workflow (End-to-End)

### Stage A — Intake & Context Build
- Receive input (speech transcript or uploaded material).
- Detect class profile: grade, subject, lesson duration, learning goals.
- Build grounded context pack with source citations.

### Stage B — Pedagogical Planning (Gemini)
- Create lesson structure: hook → concept build → examples → recap.
- Mark which segments require visual reasoning support.
- Output:
  - slide plan (notes-focused),
  - animation plan (deep understanding),
  - estimated timing.

### Stage C — Tool Generation
- **Slidev path**: create markdown deck + speaker notes + interactions.
- **Manim path**: create scene scripts + render artifacts.

### Stage D — Integration & QA
- Compose hybrid deck.
- Run checks:
  - factual consistency with source,
  - age appropriateness,
  - pacing and readability,
  - broken media/build errors.

### Stage E — Teacher Review
- Teacher edits and approves.
- Optional targeted regeneration.
- Publish/export final classroom-ready deck.

---

## 8) Data Contracts (Minimum)

### InputLessonRequest
- `source_type`: `speech | material`
- `source_files[]`
- `grade`
- `subject`
- `lesson_duration_minutes`
- `teaching_style` (optional)
- `strict_source_fidelity` (boolean)

### LessonPlan
- `objectives[]`
- `prerequisites[]`
- `lesson_flow[]`
- `slide_units[]`
- `visual_units[]`
- `assessment_prompts[]`

### SlideUnit
- `title`
- `key_points[]`
- `speaker_notes`
- `interaction_type`
- `source_citations[]`

### VisualUnit (Manim)
- `concept`
- `why_visual_needed`
- `scene_spec`
- `asset_outputs[]`
- `source_citations[]`

---

## 9) Non-Functional Requirements for Schools
- **Reliability**: Job retries, resumable processing, failure isolation.
- **Latency targets**: Useful draft in < 5 min for typical lesson inputs.
- **Safety**: Prompt/content moderation and policy guardrails.
- **Privacy**: Configurable cloud/local processing policies per school.
- **Auditability**: Source traceability and revision history.
- **Accessibility**: Readable themes, caption-ready media, keyboard navigation.

---

## 10) Delivery Roadmap (Phased)

### Phase 1 — Foundation (2–3 weeks)
- Define canonical lesson schemas.
- Build ingestion unification (speech + material).
- Build Gemini orchestration skeleton + job queue.

### Phase 2 — Dual Toolchains (3–4 weeks)
- Stabilize Slidev generation/build pipeline.
- Stabilize Manim planning/render pipeline.
- Add deterministic artifact storage and references.

### Phase 3 — Hybrid Composer + Teacher Control (2–3 weeks)
- Build hybrid embedding and timing sync.
- Build review UI with per-section regenerate.
- Add versioning, rollback, and approval flow.

### Phase 4 — School Readiness (2–3 weeks)
- Roles/permissions, usage analytics, policy controls.
- Observability dashboards and incident handling.
- Pilot rollout package and onboarding docs.

---

## 11) Acceptance Criteria (Definition of Done)
A lesson generation run is complete when:
1. Input from speech or material is successfully parsed and grounded.
2. Gemini produces lesson plan + slide/visual units in valid schema.
3. Slidev deck compiles without error.
4. Manim scenes render and are embedded in final deck.
5. Teacher can edit and regenerate selected units only.
6. Final deck is exportable and presentation-ready.
7. System stores traceable links from output back to source chunks.

---

## 12) Risks & Mitigations
- **Risk**: Hallucinated or non-grounded educational content.
  - **Mitigation**: strict citation checks + source-fidelity mode.
- **Risk**: Slow render times for complex Manim scenes.
  - **Mitigation**: scene complexity budget + cached assets.
- **Risk**: Inconsistent style across generated content.
  - **Mitigation**: template packs and centralized design tokens.
- **Risk**: Teacher trust gap in AI output.
  - **Mitigation**: transparent planning view + explicit approval gates.

---

## 13) Immediate Next Actions (Execution Checklist)
- [ ] Finalize schemas (`LessonPlan`, `SlideUnit`, `VisualUnit`).
- [ ] Define Gemini prompts + tool-call JSON contracts.
- [ ] Implement pipeline endpoints for `speech` and `material` source types.
- [ ] Add Slidev and Manim worker services with queue-based execution.
- [ ] Implement hybrid composer and artifact manifest format.
- [ ] Ship teacher review UI (approve/edit/regenerate/lock).
- [ ] Add quality gates (build validation, citation coverage, safety checks).
- [ ] Run pilot with 2 subjects and collect teacher feedback.

---

## 14) Suggested Repo-Level Reorganization

```text
backend/
  services/
    ingestion/
    curriculum/
    orchestration/
    slidev_runtime/
    manim_runtime/
    composition/
    qa/
  workers/
  schemas/
frontend/
  app/
    (teacher-workspace)/
  components/
    lesson-planner/
    review-console/
    presentation-mode/
infra/
  queue/
  storage/
  observability/
docs/
  architecture/
  prompts/
  policies/
```

This structure keeps pedagogical intelligence, tool runtimes, and review workflows modular for long-term maintainability.
