package skills

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"

	"github.com/nicolasramos/odooclaw/pkg/logger"
)

var (
	namePattern        = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)
	reFrontmatter      = regexp.MustCompile(`(?s)^---(?:\r\n|\n|\r)(.*?)(?:\r\n|\n|\r)---`)
	reStripFrontmatter = regexp.MustCompile(`(?s)^---(?:\r\n|\n|\r)(.*?)(?:\r\n|\n|\r)---(?:\r\n|\n|\r)*`)
)

const (
	MaxNameLength        = 64
	MaxDescriptionLength = 1024
)

// SkillMetadata holds the parsed frontmatter for a skill.
type SkillMetadata struct {
	Name          string            `yaml:"name"`
	Description   string            `yaml:"description"`
	License       string            `yaml:"license,omitempty"`
	Compatibility string            `yaml:"compatibility,omitempty"`
	Metadata      map[string]string `yaml:"metadata,omitempty"`
}

// SkillInfo is the public-facing representation returned by ListSkills.
type SkillInfo struct {
	Name        string `json:"name"`
	Path        string `json:"path"`
	Source      string `json:"source"`
	Description string `json:"description"`
	dirName     string // internal: directory name for validation
}

// validate checks the skill info against agentskills.io requirements.
// It rejects when name differs from the directory or violates the pattern.
func (info SkillInfo) validate() error {
	var errs error
	if info.Name == "" {
		errs = errors.Join(errs, errors.New("name is required"))
	} else {
		if len(info.Name) > MaxNameLength {
			errs = errors.Join(errs, fmt.Errorf("name exceeds %d characters", MaxNameLength))
		}
		if !namePattern.MatchString(info.Name) {
			errs = errors.Join(errs, fmt.Errorf(
				"name must match agentskills.io pattern [a-z0-9-] (got %q)", info.Name))
		}
		// Name must match the parent directory.
		if info.dirName != "" && info.Name != info.dirName {
			errs = errors.Join(errs, fmt.Errorf(
				"name %q does not match directory name %q", info.Name, info.dirName))
		}
	}

	if info.Description == "" {
		errs = errors.Join(errs, errors.New("description is required"))
	} else if len(info.Description) > MaxDescriptionLength {
		errs = errors.Join(errs, fmt.Errorf("description exceeds %d characters", MaxDescriptionLength))
	}
	return errs
}

type SkillsLoader struct {
	workspace       string
	workspaceSkills string // workspace skills (project-level)
	globalSkills    string // global skills (~/.odooclaw/skills)
	builtinSkills   string // builtin skills
}

// SkillRoots returns all unique skill root directories used by this loader.
// The order follows resolution priority: workspace > global > builtin.
func (sl *SkillsLoader) SkillRoots() []string {
	roots := []string{sl.workspaceSkills, sl.globalSkills, sl.builtinSkills}
	seen := make(map[string]struct{}, len(roots))
	out := make([]string, 0, len(roots))

	for _, root := range roots {
		trimmed := strings.TrimSpace(root)
		if trimmed == "" {
			continue
		}
		clean := filepath.Clean(trimmed)
		if _, ok := seen[clean]; ok {
			continue
		}
		seen[clean] = struct{}{}
		out = append(out, clean)
	}

	return out
}

func NewSkillsLoader(workspace string, globalSkills string, builtinSkills string) *SkillsLoader {
	return &SkillsLoader{
		workspace:       workspace,
		workspaceSkills: filepath.Join(workspace, "skills"),
		globalSkills:    globalSkills, // ~/.odooclaw/skills
		builtinSkills:   builtinSkills,
	}
}

func (sl *SkillsLoader) ListSkills() []SkillInfo {
	skills := make([]SkillInfo, 0)
	seen := make(map[string]bool)

	addSkills := func(dir, source string) {
		if dir == "" {
			return
		}
		dirs, err := os.ReadDir(dir)
		if err != nil {
			return
		}
		for _, d := range dirs {
			if !d.IsDir() {
				continue
			}
			skillFile := filepath.Join(dir, d.Name(), "SKILL.md")
			if _, err := os.Stat(skillFile); err != nil {
				continue
			}
			dirName := d.Name()
			info := SkillInfo{
				dirName: dirName,
				Path:    skillFile,
				Source:  source,
			}
			metadata := sl.getSkillMetadata(skillFile)
			if metadata != nil {
				info.Description = metadata.Description
				n := metadata.Name
				if n != "" {
					info.Name = n
				} else {
					info.Name = dirName
				}
			} else {
				info.Name = dirName
			}
			if err := info.validate(); err != nil {
				slog.Warn("invalid skill from "+source, "name", info.Name, "directory", dirName, "error", err)
				continue
			}
			if seen[info.Name] {
				continue
			}
			seen[info.Name] = true
			skills = append(skills, info)
		}
	}

	// Priority: workspace > global > builtin
	addSkills(sl.workspaceSkills, "workspace")
	addSkills(sl.globalSkills, "global")
	addSkills(sl.builtinSkills, "builtin")

	return skills
}

func (sl *SkillsLoader) LoadSkill(name string) (string, bool) {
	// 1. load from workspace skills first (project-level)
	if sl.workspaceSkills != "" {
		skillFile := filepath.Join(sl.workspaceSkills, name, "SKILL.md")
		if content, err := os.ReadFile(skillFile); err == nil {
			return sl.stripFrontmatter(string(content)), true
		}
	}

	// 2. then load from global skills (~/.odooclaw/skills)
	if sl.globalSkills != "" {
		skillFile := filepath.Join(sl.globalSkills, name, "SKILL.md")
		if content, err := os.ReadFile(skillFile); err == nil {
			return sl.stripFrontmatter(string(content)), true
		}
	}

	// 3. finally load from builtin skills
	if sl.builtinSkills != "" {
		skillFile := filepath.Join(sl.builtinSkills, name, "SKILL.md")
		if content, err := os.ReadFile(skillFile); err == nil {
			return sl.stripFrontmatter(string(content)), true
		}
	}

	return "", false
}

func (sl *SkillsLoader) LoadSkillsForContext(skillNames []string) string {
	if len(skillNames) == 0 {
		return ""
	}

	var parts []string
	for _, name := range skillNames {
		content, ok := sl.LoadSkill(name)
		if ok {
			parts = append(parts, fmt.Sprintf("### Skill: %s\n\n%s", name, content))
		}
	}

	return strings.Join(parts, "\n\n---\n\n")
}

func (sl *SkillsLoader) BuildSkillsSummary() string {
	allSkills := sl.ListSkills()
	if len(allSkills) == 0 {
		return ""
	}

	var lines []string
	lines = append(lines, "<skills>")
	for _, s := range allSkills {
		escapedName := escapeXML(s.Name)
		escapedDesc := escapeXML(s.Description)
		escapedPath := escapeXML(s.Path)

		lines = append(lines, fmt.Sprintf("  <skill>"))
		lines = append(lines, fmt.Sprintf("    <name>%s</name>", escapedName))
		lines = append(lines, fmt.Sprintf("    <description>%s</description>", escapedDesc))
		lines = append(lines, fmt.Sprintf("    <location>%s</location>", escapedPath))
		lines = append(lines, fmt.Sprintf("    <source>%s</source>", s.Source))
		lines = append(lines, "  </skill>")
	}
	lines = append(lines, "</skills>")

	return strings.Join(lines, "\n")
}

// getSkillMetadata parses the frontmatter of a SKILL.md file using a real
// YAML parser (gopkg.in/yaml.v3). It returns nil when no frontmatter exists.
func (sl *SkillsLoader) getSkillMetadata(skillPath string) *SkillMetadata {
	content, err := os.ReadFile(skillPath)
	if err != nil {
		logger.WarnCF("skills", "Failed to read skill metadata",
			map[string]any{
				"skill_path": skillPath,
				"error":      err.Error(),
			})
		return nil
	}

	frontmatter := sl.extractFrontmatter(string(content))
	if frontmatter == "" {
		return &SkillMetadata{
			Name: filepath.Base(filepath.Dir(skillPath)),
		}
	}

	// Parse with real YAML v3 — handles folded scalars (|, >),
	// nested maps, and all YAML features.
	var raw map[string]yaml.Node
	if err := yaml.Unmarshal([]byte(frontmatter), &raw); err != nil {
		// If YAML parsing fails, fall back to no metadata
		slog.Warn("could not parse frontmatter as YAML",
			"skill_path", skillPath, "error", err)
		return &SkillMetadata{
			Name: filepath.Base(filepath.Dir(skillPath)),
		}
	}

	meta := &SkillMetadata{
		Name:        getString(raw, "name"),
		Description: getString(raw, "description"),
		License:     getString(raw, "license"),
	}

	// Build metadata map. The agentskills.io standard defines metadata as
	// a string→string map. For backward compatibility we handle three cases:
	// 1. metadata is already a string→string map.
	// 2. metadata is a top-level "homepage" string (move into metadata).
	// 3. metadata is a nested map (e.g. {"openclaw": {...}}) → serialize as JSON string.
	if node, ok := raw["metadata"]; ok {
		meta.Metadata = buildMetadataMap(&node)
	}
	if hp := getString(raw, "homepage"); hp != "" {
		if meta.Metadata == nil {
			meta.Metadata = make(map[string]string)
		}
		meta.Metadata["homepage"] = hp
	}

	return meta
}

// getString returns the string value of a YAML node, or "" if absent/not a string.
func getString(raw map[string]yaml.Node, key string) string {
	node, ok := raw[key]
	if !ok || node.Kind != yaml.DocumentNode && node.Kind != yaml.ScalarNode {
		return ""
	}
	if node.Kind == yaml.ScalarNode {
		return node.Value
	}
	return ""
}

// buildMetadataMap converts a metadata YAML node into a string→string map.
// It handles:
//   - string→string maps (standard)
//   - nested maps → serialize inner values as JSON strings
//   - top-level "homepage" key → already handled by getSkillMetadata
func buildMetadataMap(node *yaml.Node) map[string]string {
	result := make(map[string]string)
	if node.Kind != yaml.MappingNode {
		return result
	}
	for i := 0; i < len(node.Content); i += 2 {
		keyNode := node.Content[i]
		valNode := node.Content[i+1]
		key := keyNode.Value

		switch valNode.Kind {
		case yaml.ScalarNode:
			// string value → keep as-is
			result[key] = valNode.Value
		case yaml.MappingNode, yaml.SequenceNode:
			// nested structure → decode to Go value, then marshal to JSON string
			var v any
			if err := valNode.Decode(&v); err == nil {
				if b, err := json.Marshal(v); err == nil {
					result[key] = string(b)
				}
			}
		case yaml.AliasNode:
			// alias node → decode the aliased value, then marshal as JSON string
			if valNode.Alias != nil {
				var v any
				if err := valNode.Alias.Decode(&v); err == nil {
					if b, err := json.Marshal(v); err == nil {
						result[key] = string(b)
					}
				}
			}
		}
	}
	return result
}

func (sl *SkillsLoader) extractFrontmatter(content string) string {
	// Support \n (Unix), \r\n (Windows), and \r (classic Mac) line endings for frontmatter blocks
	match := reFrontmatter.FindStringSubmatch(content)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}

func (sl *SkillsLoader) stripFrontmatter(content string) string {
	return reStripFrontmatter.ReplaceAllString(content, "")
}

func escapeXML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	return s
}
