package memory

// DebugScopePatterns exposes scope patterns for explainability tools.
func DebugScopePatterns(opts SearchOptions) []string {
	patterns := buildScopePatterns(opts)
	if len(patterns) == 0 {
		return nil
	}
	cloned := make([]string, 0, len(patterns))
	cloned = append(cloned, patterns...)
	return cloned
}

// DebugMatchQuery exposes the normalized FTS query for explainability tools.
func DebugMatchQuery(query string) string {
	return buildMatchQuery(query)
}

// DebugScopeMatch indicates whether a result path belongs to the scoped context.
func DebugScopeMatch(path string, opts SearchOptions) bool {
	patterns := buildScopePatterns(opts)
	return !shouldExcludeScopedPath(path, patterns)
}
