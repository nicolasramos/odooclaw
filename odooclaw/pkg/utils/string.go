package utils

import (
	"regexp"
	"strings"
	"unicode"
)

// reasoningFull matches <think>...</think> blocks (with both tags).
var reasoningFull = regexp.MustCompile(`(?s)<(?:think|thought|reasoning)>.*?</(?:think|thought|reasoning)>`)

// reasoningOrphanClose matches content that ends with a lone </think> (no opening tag visible).
// This happens with Qwen3.x models that begin reasoning before emitting the opening tag.
var reasoningOrphanClose = regexp.MustCompile(`(?s)^.*?</(?:think|thought|reasoning)>\s*`)

// RemoveReasoning strips <think>, <thought>, or <reasoning> tags and their content.
// Handles both complete blocks and orphan closing tags (Qwen3.x style).
func RemoveReasoning(s string) string {
	// First remove complete <think>...</think> blocks
	s = reasoningFull.ReplaceAllString(s, "")
	// Then remove any leading content terminated by an orphan </think>
	s = reasoningOrphanClose.ReplaceAllString(s, "")
	return strings.TrimSpace(s)
}

// SanitizeMessageContent removes Unicode control characters, format characters (RTL overrides,
// zero-width characters), and other non-graphic characters that could confuse an LLM
// or cause display issues in the agent UI.
func SanitizeMessageContent(input string) string {
	var sb strings.Builder
	// Pre-allocate memory to avoid multiple allocations
	sb.Grow(len(input))

	for _, r := range input {
		// unicode.IsGraphic returns true if the rune is a Unicode graphic character.
		// This includes letters, marks, numbers, punctuation, and symbols.
		// It excludes control characters (Cc), format characters (Cf),
		// surrogates (Cs), and private use (Co).
		if unicode.IsGraphic(r) || r == '\n' || r == '\r' || r == '\t' {
			sb.WriteRune(r)
		}
	}

	return sb.String()
}

// Truncate returns a truncated version of s with at most maxLen runes.
// Handles multi-byte Unicode characters properly.
// If the string is truncated, "..." is appended to indicate truncation.
func Truncate(s string, maxLen int) string {
	if maxLen <= 0 {
		return ""
	}
	runes := []rune(s)
	if len(runes) <= maxLen {
		return s
	}
	// Reserve 3 chars for "..."
	if maxLen <= 3 {
		return string(runes[:maxLen])
	}
	return string(runes[:maxLen-3]) + "..."
}

// DerefStr dereferences a pointer to a string and
// returns the value or a fallback if the pointer is nil.
func DerefStr(s *string, fallback string) string {
	if s == nil {
		return fallback
	}
	return *s
}
