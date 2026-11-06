package skills

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

// referencesCitationPattern matches a real reference-file citation in SKILL.md
// prose, e.g. `references/pdf-processing.md`. It deliberately ignores the bare
// template token `references/<file>.md` (angle brackets are not in the class) and
// the inline word `references/` used outside a citation.
var referencesCitationPattern = regexp.MustCompile("references/[a-z0-9._/-]+\\.md")

// TestSkillCreatorIndexReferences verifies that skill-creator's index only points
// at reference files that actually exist, that every citation stays one level deep
// under the skill root (references/<file>.md), and that none escapes the skill root.
//
// This is the acceptance gate for F2 progressive disclosure: after splitting the
// skill into an index plus references/, every path the index cites must resolve.
func TestSkillCreatorIndexReferences(t *testing.T) {
	skillRoot := filepath.Join("..", "..", "..", "odooclaw", "workspace", "skills", "skill-creator")

	content, err := os.ReadFile(filepath.Join(skillRoot, "SKILL.md"))
	require.NoError(t, err)

	citations := referencesCitationPattern.FindAllString(string(content), -1)
	if len(citations) == 0 {
		t.Errorf("skill-creator index cites no reference files (look for `references/<file>.md`)")
		return
	}

	existing := 0
	for _, citation := range citations {
		if bad, reason := validateReferenceCitation(skillRoot, citation); bad {
			t.Errorf("skill-creator index citation %q: %s", citation, reason)
			continue
		}
		existing++
	}

	if existing == 0 {
		t.Errorf("skill-creator index cites no existing reference file (all %d citations fail to resolve)", len(citations))
	}
}

// validateReferenceCitation checks one `references/<path>` citation against the
// three F2 rules: it must not escape the skill root, must stay one level deep,
// and must resolve to an existing file. It returns (bad=true, reason).
func validateReferenceCitation(skillRoot, citation string) (bool, string) {
	if strings.Contains(citation, "..") {
		return true, "reference escapes the skill root"
	}

	segments := strings.Split(strings.TrimPrefix(citation, "references/"), "/")
	if len(segments) > 1 {
		return true, "reference goes down more than one level (keep references/<file>.md, one level deep)"
	}

	target := filepath.Join(skillRoot, citation)
	info, err := os.Stat(target)
	if err != nil || info.IsDir() {
		return true, "referenced file does not exist"
	}
	return false, ""
}
