"use client";

import { useState, useRef, useEffect } from "react";
import { Slide } from "@/lib/api-client";

interface SlideCardProps {
  slide: Slide;
  isActive: boolean;
  onUpdate: (slideId: number, title: string, content: string) => void;
  onSelect: () => void;
}

export default function SlideCard({
  slide,
  isActive,
  onUpdate,
  onSelect,
}: SlideCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [title, setTitle] = useState(slide.title);
  const [content, setContent] = useState(slide.content);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse content as JSON array or treat as string
  const contentArray = (() => {
    try {
      const parsed = JSON.parse(slide.content);
      return Array.isArray(parsed) ? parsed : [slide.content];
    } catch {
      return [slide.content];
    }
  })();

  // Parse confidence data for highlighting
  const confidenceData = (() => {
    try {
      return slide.confidence_data ? JSON.parse(slide.confidence_data) : null;
    } catch {
      return null;
    }
  })();

  const lowConfidenceWords = confidenceData?.low_confidence_words || [];

  useEffect(() => {
    setTitle(slide.title);
    setContent(slide.content);
  }, [slide.title, slide.content]);

  const handleTitleSave = () => {
    setIsEditingTitle(false);
    if (title !== slide.title) {
      onUpdate(slide.id, title, content);
    }
  };

  const handleContentSave = () => {
    setIsEditingContent(false);
    if (content !== slide.content) {
      onUpdate(slide.id, title, content);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSave();
    } else if (e.key === "Escape") {
      setTitle(slide.title);
      setIsEditingTitle(false);
    }
  };

  const handleContentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setContent(slide.content);
      setIsEditingContent(false);
    }
  };

  const highlightLowConfidenceWords = (text: string) => {
    if (!lowConfidenceWords.length) return text;

    let highlightedText = text;
    lowConfidenceWords.forEach((word: string) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      highlightedText = highlightedText.replace(
        regex,
        `<span class="bg-yellow-200 border-b-2 border-yellow-400 px-1 rounded" title="Low confidence word - please review">${word}</span>`
      );
    });
    return highlightedText;
  };

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-lg shadow-sm border-2 transition-all cursor-pointer ${
        isActive
          ? "border-indigo-500 shadow-md"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="p-4">
        {/* Slide number */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Slide {slide.slide_number}
          </span>
          {lowConfidenceWords.length > 0 && (
            <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded flex items-center">
              <svg
                className="w-3 h-3 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Review needed
            </span>
          )}
        </div>

        {/* Title */}
        <div className="mb-3">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="w-full text-lg font-semibold text-gray-900 border-0 border-b-2 border-indigo-500 focus:outline-none focus:border-indigo-600 bg-transparent"
              autoFocus
            />
          ) : (
            <h3
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
                setTimeout(() => titleInputRef.current?.focus(), 0);
              }}
              className="text-lg font-semibold text-gray-900 hover:text-indigo-600 cursor-text"
              dangerouslySetInnerHTML={{
                __html: highlightLowConfidenceWords(title),
              }}
            />
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          {isEditingContent ? (
            <textarea
              ref={contentTextareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleContentSave}
              onKeyDown={handleContentKeyDown}
              className="w-full text-sm text-gray-700 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              rows={Math.max(3, content.split("\n").length)}
              placeholder="Enter slide content..."
              autoFocus
            />
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingContent(true);
                setTimeout(() => contentTextareaRef.current?.focus(), 0);
              }}
              className="cursor-text hover:bg-gray-50 p-2 rounded border border-transparent hover:border-gray-200 transition-colors"
            >
              {contentArray.length > 0 ? (
                <ul className="space-y-1">
                  {contentArray.map((item, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2 mt-1">•</span>
                      <span
                        className="text-sm text-gray-700 flex-1"
                        dangerouslySetInnerHTML={{
                          __html: highlightLowConfidenceWords(item),
                        }}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  Click to add content...
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
