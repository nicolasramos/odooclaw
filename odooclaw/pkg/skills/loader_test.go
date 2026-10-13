package skills

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v3"
)

func TestSkillsInfoValidate(t *testing.T) {
	testcases := []struct {
		name        string
		skillName   string
		description string
		wantErr     bool
		errContains []string
	}{
		{
			name:        "valid-skill",
			skillName:   "valid-skill",
			description: "a valid skill description",
			wantErr:     false,
		},
		{
			name:        "empty-name",
			skillName:   "",
			description: "description without name",
			wantErr:     true,
			errContains: []string{"name is required"},
		},
		{
			name:        "empty-description",
			skillName:   "skill-without-description",
			description: "",
			wantErr:     true,
			errContains: []string{"description is required"},
		},
		{
			name:        "empty-both",
			skillName:   "",
			description: "",
			wantErr:     true,
			errContains: []string{"name is required", "description is required"},
		},
		{
			name:        "name-with-spaces",
			skillName:   "skill with spaces",
			description: "invalid name with spaces",
			wantErr:     true,
			errContains: []string{"name must match agentskills.io pattern"},
		},
		{
			name:        "name-with-underscore",
			skillName:   "skill_underscore",
			description: "invalid name with underscore",
			wantErr:     true,
			errContains: []string{"name must match agentskills.io pattern"},
		},
	}

	for _, tc := range testcases {
		t.Run(tc.name, func(t *testing.T) {
			info := SkillInfo{
				Name:        tc.skillName,
				Description: tc.description,
			}
			err := info.validate()
			if tc.wantErr {
				assert.Error(t, err)
				for _, msg := range tc.errContains {
					assert.ErrorContains(t, err, msg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestExtractFrontmatter(t *testing.T) {
	sl := &SkillsLoader{}

	testcases := []struct {
		name           string
		content        string
		expectedName   string
		expectedDesc   string
		lineEndingType string
	}{
		{
			name:           "unix-line-endings",
			lineEndingType: "Unix (\\n)",
			content:        "---\nname: test-skill\ndescription: A test skill\n---\n\n# Skill Content",
			expectedName:   "test-skill",
			expectedDesc:   "A test skill",
		},
		{
			name:           "windows-line-endings",
			lineEndingType: "Windows (\\r\\n)",
			content:        "---\r\nname: test-skill\r\ndescription: A test skill\r\n---\r\n\r\n# Skill Content",
			expectedName:   "test-skill",
			expectedDesc:   "A test skill",
		},
		{
			name:           "classic-mac-line-endings",
			lineEndingType: "Classic Mac (\\r)",
			content:        "---\rname: test-skill\rdescription: A test skill\r---\r\r# Skill Content",
			expectedName:   "test-skill",
			expectedDesc:   "A test skill",
		},
	}

	for _, tc := range testcases {
		t.Run(tc.name, func(t *testing.T) {
			// Extract frontmatter
			frontmatter := sl.extractFrontmatter(tc.content)
			assert.NotEmpty(t, frontmatter, "Frontmatter should be extracted for %s line endings", tc.lineEndingType)

			// Parse with real YAML parser
			var raw map[string]yaml.Node
			err := yaml.Unmarshal([]byte(frontmatter), &raw)
			require.NoError(t, err, "Frontmatter must parse as valid YAML")

			assert.Equal(
				t,
				tc.expectedName,
				getString(raw, "name"),
				"Name should be correctly parsed from frontmatter with %s line endings",
				tc.lineEndingType,
			)
			assert.Equal(
				t,
				tc.expectedDesc,
				getString(raw, "description"),
				"Description should be correctly parsed from frontmatter with %s line endings",
				tc.lineEndingType,
			)
		})
	}
}

// createSkillDir creates a skill directory with a SKILL.md file containing the given frontmatter.
func createSkillDir(t *testing.T, base, dirName, name, description string) {
	t.Helper()
	dir := filepath.Join(base, dirName)
	require.NoError(t, os.MkdirAll(dir, 0o755))
	content := "---\nname: " + name + "\ndescription: " + description + "\n---\n\n# " + name
	require.NoError(t, os.WriteFile(filepath.Join(dir, "SKILL.md"), []byte(content), 0o644))
}

func TestListSkillsWorkspaceOverridesGlobal(t *testing.T) {
	tmp := t.TempDir()
	ws := filepath.Join(tmp, "workspace")
	global := filepath.Join(tmp, "global")

	createSkillDir(t, filepath.Join(ws, "skills"), "my-skill", "my-skill", "workspace version")
	createSkillDir(t, global, "my-skill", "my-skill", "global version")

	sl := NewSkillsLoader(ws, global, "")
	skills := sl.ListSkills()

	assert.Len(t, skills, 1)
	assert.Equal(t, "workspace", skills[0].Source)
	assert.Equal(t, "workspace version", skills[0].Description)
}

func TestListSkillsGlobalOverridesBuiltin(t *testing.T) {
	tmp := t.TempDir()
	ws := filepath.Join(tmp, "workspace")
	global := filepath.Join(tmp, "global")
	builtin := filepath.Join(tmp, "builtin")

	createSkillDir(t, global, "my-skill", "my-skill", "global version")
	createSkillDir(t, builtin, "my-skill", "my-skill", "builtin version")

	sl := NewSkillsLoader(ws, global, builtin)
	skills := sl.ListSkills()

	assert.Len(t, skills, 1)
	assert.Equal(t, "global", skills[0].Source)
	assert.Equal(t, "global version", skills[0].Description)
}

func TestListSkillsMetadataNameDedup(t *testing.T) {
	tmp := t.TempDir()
	ws := filepath.Join(tmp, "workspace")
	global := filepath.Join(tmp, "global")

	// Same directory names and metadata name (dedup test with matching names)
	createSkillDir(t, filepath.Join(ws, "skills"), "shared-skill", "shared-skill", "workspace version")
	createSkillDir(t, global, "shared-skill", "shared-skill", "global version")

	sl := NewSkillsLoader(ws, global, "")
	skills := sl.ListSkills()

	assert.Len(t, skills, 1)
	assert.Equal(t, "shared-skill", skills[0].Name)
	assert.Equal(t, "workspace", skills[0].Source)
}

func TestListSkillsMultipleDistinctSkills(t *testing.T) {
	tmp := t.TempDir()
	ws := filepath.Join(tmp, "workspace")
	global := filepath.Join(tmp, "global")
	builtin := filepath.Join(tmp, "builtin")

	createSkillDir(t, filepath.Join(ws, "skills"), "skill-a", "skill-a", "desc a")
	createSkillDir(t, global, "skill-b", "skill-b", "desc b")
	createSkillDir(t, builtin, "skill-c", "skill-c", "desc c")

	sl := NewSkillsLoader(ws, global, builtin)
	skills := sl.ListSkills()

	assert.Len(t, skills, 3)
	names := map[string]string{}
	for _, s := range skills {
		names[s.Name] = s.Source
	}
	assert.Equal(t, "workspace", names["skill-a"])
	assert.Equal(t, "global", names["skill-b"])
	assert.Equal(t, "builtin", names["skill-c"])
}

func TestListSkillsInvalidSkillSkipped(t *testing.T) {
	tmp := t.TempDir()
	ws := filepath.Join(tmp, "workspace")
	global := filepath.Join(tmp, "global")

	// Invalid name (underscore)
	createSkillDir(t, filepath.Join(ws, "skills"), "bad_skill", "bad_skill", "desc")
	// Valid skill
	createSkillDir(t, global, "good-skill", "good-skill", "desc")

	sl := NewSkillsLoader(ws, global, "")
	skills := sl.ListSkills()

	assert.Len(t, skills, 1)
	assert.Equal(t, "good-skill", skills[0].Name)
}

func TestListSkillsEmptyAndNonexistentDirs(t *testing.T) {
	tmp := t.TempDir()
	ws := filepath.Join(tmp, "workspace")
	emptyDir := filepath.Join(tmp, "empty")
	require.NoError(t, os.MkdirAll(emptyDir, 0o755))

	sl := NewSkillsLoader(ws, emptyDir, filepath.Join(tmp, "nonexistent"))
	skills := sl.ListSkills()

	assert.Empty(t, skills)
}

func TestListSkillsDirWithoutSkillMD(t *testing.T) {
	tmp := t.TempDir()
	ws := filepath.Join(tmp, "workspace")
	global := filepath.Join(tmp, "global")

	// Directory exists but has no SKILL.md
	require.NoError(t, os.MkdirAll(filepath.Join(global, "no-skillmd"), 0o755))
	// Valid skill alongside
	createSkillDir(t, global, "real-skill", "real-skill", "desc")

	sl := NewSkillsLoader(ws, global, "")
	skills := sl.ListSkills()

	assert.Len(t, skills, 1)
	assert.Equal(t, "real-skill", skills[0].Name)
}

func TestStripFrontmatter(t *testing.T) {
	sl := &SkillsLoader{}

	testcases := []struct {
		name            string
		content         string
		expectedContent string
		lineEndingType  string
	}{
		{
			name:            "unix-line-endings",
			lineEndingType:  "Unix (\\n)",
			content:         "---\nname: test-skill\ndescription: A test skill\n---\n\n# Skill Content",
			expectedContent: "# Skill Content",
		},
		{
			name:            "windows-line-endings",
			lineEndingType:  "Windows (\\r\\n)",
			content:         "---\r\nname: test-skill\r\ndescription: A test skill\r\n---\r\n\r\n# Skill Content",
			expectedContent: "# Skill Content",
		},
		{
			name:            "classic-mac-line-endings",
			lineEndingType:  "Classic Mac (\\r)",
			content:         "---\rname: test-skill\rdescription: A test skill\r---\r\r# Skill Content",
			expectedContent: "# Skill Content",
		},
		{
			name:            "unix-line-endings-without-trailing-newline",
			lineEndingType:  "Unix (\\n) without trailing newline",
			content:         "---\nname: test-skill\ndescription: A test skill\n---\n# Skill Content",
			expectedContent: "# Skill Content",
		},
		{
			name:            "windows-line-endings-without-trailing-newline",
			lineEndingType:  "Windows (\\r\\n) without trailing newline",
			content:         "---\r\nname: test-skill\r\ndescription: A test skill\r\n---\r\n# Skill Content",
			expectedContent: "# Skill Content",
		},
		{
			name:            "no-frontmatter",
			lineEndingType:  "No frontmatter",
			content:         "# Skill Content\n\nSome content here.",
			expectedContent: "# Skill Content\n\nSome content here.",
		},
	}

	for _, tc := range testcases {
		t.Run(tc.name, func(t *testing.T) {
			result := sl.stripFrontmatter(tc.content)
			assert.Equal(
				t,
				tc.expectedContent,
				result,
				"Frontmatter should be stripped correctly for %s",
				tc.lineEndingType,
			)
		})
	}
}

// --- TDD: fixture that OLD code accepts but NEW standard must reject ---

// TestOldAcceptsNewRejects_UppercaseName verifies the TDD property:
// the old validator (allowing [a-zA-Z0-9]) accepts "My-Skill" but the new
// agentskills.io-compliant validator (only [a-z0-9-]) must reject it.
func TestOldAcceptsNewRejects_UppercaseName(t *testing.T) {
	tmp := t.TempDir()
	skillDir := filepath.Join(tmp, "my-skill") // directory is lowercase
	require.NoError(t, os.MkdirAll(skillDir, 0o755))

	// Fixtures: name has uppercase letters, directory is lowercase.
	// Old code (namePattern with [a-zA-Z]) accepts this.
	// New standard (only [a-z0-9-]) must reject it.
	content := `---
name: My-Skill
description: A skill with uppercase name
---

# My Skill
`
	require.NoError(t, os.WriteFile(filepath.Join(skillDir, "SKILL.md"), []byte(content), 0o644))

	// Run ListSkills and verify the skill is REJECTED
	// Temporarily set workspaceSkills so the skill gets picked up
	sl2 := &SkillsLoader{
		workspace:       tmp,
		workspaceSkills: filepath.Join(tmp, "skills"),
	}
	// We need to place the skill in a skills/ dir
	realDir := filepath.Join(tmp, "skills", "my-skill")
	require.NoError(t, os.RemoveAll(realDir))
	require.NoError(t, os.MkdirAll(realDir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(realDir, "SKILL.md"), []byte(content), 0o644))

	skills := sl2.ListSkills()
	// TDD: NEW standard (only [a-z0-9-]) must REJECT uppercase names.
	// Current code accepts them → this assertion FAILS (RED).
	t.Logf("OLD: ListSkills returned %d skills: %v", len(skills), func() []string {
		names := make([]string, len(skills))
		for i, s := range skills {
			names[i] = s.Name
		}
		return names
	}())
	assert.Empty(t, skills, "NEW standard: uppercase name must be rejected")
}

// TestOldAcceptsNewRejects_MultilineDescription verifies:
// old parseSimpleYAML reads `description: >-` as the literal string ">-".
// A real YAML parser must read the full folded value.
func TestOldAcceptsNewRejects_MultilineDescription(t *testing.T) {
	tmp := t.TempDir()
	skillDir := filepath.Join(tmp, "multi-desc")
	require.NoError(t, os.MkdirAll(skillDir, 0o755))

	content := `---
name: multi-desc
description: >-
  This is a folded scalar description.
  It spans multiple lines and should be
  read as a single string by a real YAML parser.
---

# Content
`
	require.NoError(t, os.WriteFile(filepath.Join(skillDir, "SKILL.md"), []byte(content), 0o644))

	sl := &SkillsLoader{
		workspace:       tmp,
		workspaceSkills: filepath.Join(tmp, "skills"),
	}
	realDir := filepath.Join(tmp, "skills", "multi-desc")
	require.NoError(t, os.RemoveAll(realDir))
	require.NoError(t, os.MkdirAll(realDir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(realDir, "SKILL.md"), []byte(content), 0o644))

	skills := sl.ListSkills()
	require.Len(t, skills, 1)
	// The NEW parser must return the full folded text, NOT ">-"
	t.Logf("Description: %q", skills[0].Description)
	assert.NotEqual(t, ">-", skills[0].Description,
		"A real YAML parser must not return the folded-scalar indicator as the description")
	assert.Contains(t, skills[0].Description, "folded scalar description",
		"The full multiline description must be assembled")
}

// TestOldAcceptsNewRejects_NameMismatch verifies:
// old code silently renames the skill when name != directory.
// New standard must REJECT it and report BOTH names.
func TestOldAcceptsNewRejects_NameMismatch(t *testing.T) {
	tmp := t.TempDir()
	skillDir := filepath.Join(tmp, "my-skill")
	require.NoError(t, os.MkdirAll(skillDir, 0o755))

	content := `---
name: different-name
description: Name does not match directory
---

# Content
`
	require.NoError(t, os.WriteFile(filepath.Join(skillDir, "SKILL.md"), []byte(content), 0o644))

	sl := &SkillsLoader{
		workspace:       tmp,
		workspaceSkills: filepath.Join(tmp, "skills"),
	}
	realDir := filepath.Join(tmp, "skills", "my-skill")
	require.NoError(t, os.RemoveAll(realDir))
	require.NoError(t, os.MkdirAll(realDir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(realDir, "SKILL.md"), []byte(content), 0o644))

	skills := sl.ListSkills()
	// TDD: NEW standard must REJECT name mismatching directory.
	// Current code silently renames → this assertion FAILS (RED).
	t.Logf("OLD: ListSkills returned %d skills: %v", len(skills), func() []string {
		names := make([]string, len(skills))
		for i, s := range skills {
			names[i] = s.Name
		}
		return names
	}())
	assert.Empty(t, skills, "NEW standard: name mismatching directory must be rejected")
}

// TestCanonicalSkillsPassValidate verifies that ALL 11 canonical workspace
// SKILL.md files pass the new validator. This is the acceptance gate for QA.
func TestCanonicalSkillsPassValidate(t *testing.T) {
	// Canonical workspace skills path (relative to repo root)
	canonicalPath := filepath.Join("..", "..", "..", "odooclaw", "workspace", "skills")

	entries, err := os.ReadDir(canonicalPath)
	require.NoError(t, err, "canonical skills directory must exist")

	// Count SKILL.md files
	var skillDirs []string
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		skillFile := filepath.Join(canonicalPath, e.Name(), "SKILL.md")
		if _, err := os.Stat(skillFile); err == nil {
			skillDirs = append(skillDirs, e.Name())
		}
	}

	t.Logf("Found %d canonical SKILL.md files: %v", len(skillDirs), skillDirs)
	require.Greater(t, len(skillDirs), 0, "canonical skills directory must contain skills")

	// Build a loader pointing at the canonical path and list all skills.
	sl := NewSkillsLoader("", canonicalPath, "")
	allSkills := sl.ListSkills()

	// Every canonical SKILL.md must appear in the list (100% pass rate).
	names := make(map[string]bool)
	for _, s := range allSkills {
		names[s.Name] = true
	}

	for _, dir := range skillDirs {
		t.Run(dir, func(t *testing.T) {
			// Each directory name should appear as a skill name.
			assert.True(t, names[dir],
				"canonical skill %q (dir) must pass validation",
				dir)
		})
	}

	// Verify we got exactly the right count.
	assert.Len(t, allSkills, len(skillDirs),
		"all %d canonical skills must pass validation (none rejected)", len(skillDirs))
}

func TestSkillRootsTrimsWhitespaceAndDedups(t *testing.T) {
	tmp := t.TempDir()
	workspace := filepath.Join(tmp, "workspace")
	global := filepath.Join(tmp, "global")
	builtin := filepath.Join(tmp, "builtin")

	sl := NewSkillsLoader(workspace, "  "+global+"  ", "\t"+builtin+"\n")
	roots := sl.SkillRoots()

	assert.Equal(t, []string{
		filepath.Join(workspace, "skills"),
		global,
		builtin,
	}, roots)
}
