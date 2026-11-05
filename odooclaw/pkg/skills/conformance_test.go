package skills

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestOdooSASkillShapeConformance verifies that a skill written in the exact
// shape Odoo SA publishes in odoo/odoo@20.0 (skills/) — frontmatter with only
// name and description (folded scalar), body with an index pointing at a
// one-level references/ directory — is discovered by ListSkills and loaded by
// LoadSkill without any modification to the file.
//
// The fixture under testdata/odoo-sa-shape/ is our own content written in that
// shape; Odoo SA's own text is not copied into this repo (license and noise).
func TestOdooSASkillShapeConformance(t *testing.T) {
	const (
		skillName       = "sample-addon-rules"
		wantDescription = "House rules for a sample addon: manifest, ORM usage and view XML." +
			" Use when writing or reviewing any file in a sample addon."
	)

	root := filepath.Join("testdata", "odoo-sa-shape")
	skillFile := filepath.Join(root, skillName, "SKILL.md")

	before, err := os.ReadFile(skillFile)
	require.NoError(t, err, "fixture SKILL.md must exist")

	sl := NewSkillsLoader("", "", root)

	// Discovery: ListSkills must include the skill with its name and description.
	skills := sl.ListSkills()
	require.Len(t, skills, 1,
		"a skill in the exact Odoo SA shape must be discovered, not rejected")
	assert.Equal(t, skillName, skills[0].Name)
	assert.Equal(t, wantDescription, skills[0].Description,
		"the folded description must be assembled into a single string")
	assert.Equal(t, skillFile, skills[0].Path)

	// Loading: LoadSkill must return the body with the frontmatter stripped.
	body, ok := sl.LoadSkill(skillName)
	require.True(t, ok, "LoadSkill must find the skill")
	assert.NotContains(t, body, "name: "+skillName,
		"the frontmatter must be stripped from the loaded body")
	assert.Contains(t, body, "# Sample addon rules")
	assert.Contains(t, body, "references/manifest.md",
		"the body index must keep pointing at the one-level references/ file")

	// The loader must never rewrite the file it reads.
	after, err := os.ReadFile(skillFile)
	require.NoError(t, err)
	assert.Equal(t, before, after, "the skill file must be left untouched")
}
