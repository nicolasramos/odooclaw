package tools

import (
	"strings"
	"testing"
)

// TestShellTool_URLArgsNotResolvedAsPaths covers the false rejection of
// commands that carry a URL (NRA-4077).
//
// The absolute-path token regex also matches URL path fragments. In
// `curl -s http://172.18.0.1:18790/web/login` it produces "/web/login", which
// filepath.Abs roots at "/" and the workspace check then rejects as
// "path outside working dir" - for a command that never touches the filesystem.
// The Odoo connector's own troubleshooting workflow is what generates these.
//
// Every command below must pass the workspace check.
func TestShellTool_URLArgsNotResolvedAsPaths(t *testing.T) {
	tmpDir := t.TempDir()
	tool, err := NewExecTool(tmpDir, true)
	if err != nil {
		t.Fatalf("unable to configure exec tool: %s", err)
	}

	allowed := []string{
		// A URL with a bare fragment must not be resolved as a path.
		`curl -s http://172.18.0.1:18790/web/login`,
		`curl -s https://example.com/web/login`,
		`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:17069/web/login`,
		// A URL inside a quoted string argument.
		`python3 -c "u='http://x/web/content'; print(u)"`,
		`curl -s "http://172.18.0.1:18790/odooclaw/reply?db=ecosystem"`,
		// A URL used as a sed operand.
		`sed 's|http://a/b|http://c/d|' state/x.txt`,
	}

	for _, cmd := range allowed {
		if reason := tool.guardCommand(cmd, tmpDir); reason != "" {
			t.Errorf("a URL argument must not be resolved as a filesystem path: %s\n  reason: %s",
				cmd, reason)
		}
	}
}

// TestShellTool_URLFixDidNotOpenTheWorkspace is the control for the test above:
// allowing URL arguments must not have opened the workspace check to real
// absolute paths.
//
// The quoted cases matter: if the token sits inside quotes, the walk-back to
// the start of the argument must still not mistake it for a URL argument.
func TestShellTool_URLFixDidNotOpenTheWorkspace(t *testing.T) {
	tmpDir := t.TempDir()
	tool, err := NewExecTool(tmpDir, true)
	if err != nil {
		t.Fatalf("unable to configure exec tool: %s", err)
	}

	blocked := []string{
		`cat /etc/passwd`,
		`ls -la /opt/odooclaw`,
		`cat "/etc/passwd"`,
		`python3 -c "print(open('/etc/passwd').read())"`,
		`curl -s "http://x/y"; cat /etc/passwd`,
		`echo "no scheme here" && head -5 /var/log/syslog`,
	}

	for _, cmd := range blocked {
		reason := tool.guardCommand(cmd, tmpDir)
		if !strings.Contains(reason, "path outside working dir") {
			t.Errorf("a real path outside the workspace must stay blocked: %s\n  reason: %q",
				cmd, reason)
		}
	}
}

// TestURLArgRanges pins the range computation itself, so a regression in the
// scanner cannot hide behind a command that happens to work for other reasons.
func TestURLArgRanges(t *testing.T) {
	type tc struct {
		cmd   string
		token string
		want  bool
	}

	cases := []tc{
		// The fragments that matter in practice.
		{`curl -s http://172.18.0.1:18790/web/login`, "/web/login", true},
		{`curl -s https://example.com/web/content`, "/web/content", true},
		{`python3 -c "u='http://x/web/content'; print(u)"`, "/web/content", true},
		// Not inside a URL argument.
		{`cat /etc/passwd`, "/etc/passwd", false},
		{`grep -rn "/web/content" state/`, "/web/content", false},
		{`ls /opt/odooclaw; curl http://x/y`, "/opt/odooclaw", false},
	}

	for _, c := range cases {
		pos := strings.Index(c.cmd, c.token)
		if pos < 0 {
			t.Fatalf("fixture broken: token %q not in %q", c.token, c.cmd)
		}
		ranges := urlArgRanges(c.cmd)
		if got := inAnyRange(pos, ranges); got != c.want {
			t.Errorf("urlArgRanges(%q): token %q at %d -> inURLArg=%v, want %v (ranges=%v)",
				c.cmd, c.token, pos, got, c.want, ranges)
		}
	}
}
