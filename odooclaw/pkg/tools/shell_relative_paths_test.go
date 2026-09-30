package tools

import (
	"context"
	"strings"
	"testing"
)

// TestShellTool_RelativePathsWithSlashes verifies that a legitimate relative
// path is not mistaken for an absolute one (NRA-3737).
//
// The absolute-path token regex `/[^\s"']+` matches the tail of a relative
// path: in `cat state/hours_sep.py` it produces "/hours_sep.py", which
// filepath.Abs then roots at the filesystem root, so the workspace check
// rejected the command as "path outside working dir". A production agent
// burned all 50 tool iterations on blocked reads of its own workspace files
// and answered the user with "Increase max_tool_iterations".
func TestShellTool_RelativePathsWithSlashes(t *testing.T) {
	tmpDir := t.TempDir()
	tool, err := NewExecTool(tmpDir, true)
	if err != nil {
		t.Fatalf("unable to configure exec tool: %s", err)
	}

	// Every one of these resolves INSIDE the workspace (tmpDir) and must pass
	// the workspace check.
	allowed := []string{
		"cat state/hours_sep.py",
		"head -40 state/att_fetch4.py",
		"sed -n 1,20p state/att.sh",
		"ls state/venv/bin/",
		"python3 -c \"print(open('state/hours_sep.py').read())\"",
		"echo hi > state/z.txt",
		"cp state/hours_sep.py state/h.py",
		"ls -la state/ 2>/dev/null",
		"ls -la state/ 2>/dev/null; echo ---; head -80 state/att_fetch4.py 2>/dev/null",
		"ls -la ./state/",
		"cat ./state/hours_sep.py",
	}

	for _, cmd := range allowed {
		result := tool.Execute(context.Background(), map[string]any{"command": cmd})
		if result.IsError && strings.Contains(result.ForLLM, "path outside working dir") {
			t.Errorf("relative path inside workspace must not be blocked: %s\n  error: %s",
				cmd, result.ForLLM)
		}
	}
}

// TestShellTool_AbsolutePathsOutsideStillBlocked is the control for the test
// above: the fix must not have opened the workspace check. These reference
// real absolute paths outside the workspace and MUST stay blocked.
func TestShellTool_AbsolutePathsOutsideStillBlocked(t *testing.T) {
	tmpDir := t.TempDir()
	tool, err := NewExecTool(tmpDir, true)
	if err != nil {
		t.Fatalf("unable to configure exec tool: %s", err)
	}

	blocked := []string{
		"cat /etc/passwd",
		"ls -la /opt/odooclaw",
		"cat /etc/shadow",
		"head -5 /var/log/syslog",
		"/opt/odooclaw/venv/bin/python3 -c \"print(1)\"",
		"cat state/x.py; cat /etc/passwd",
	}

	for _, cmd := range blocked {
		result := tool.Execute(context.Background(), map[string]any{"command": cmd})
		if !result.IsError || !strings.Contains(result.ForLLM, "path outside working dir") {
			t.Errorf("absolute path outside workspace must stay blocked: %s\n  got IsError=%v error=%s",
				cmd, result.IsError, result.ForLLM)
		}
	}
}

// TestShellTool_RedirectToDevNullWithSeparator pins the second half of the
// NRA-3737 bug: the safe-path lookup keyed on the raw regex match, so
// `2>/dev/null;` produced the literal key "/dev/null;" and missed safePaths.
func TestShellTool_RedirectToDevNullWithSeparator(t *testing.T) {
	tmpDir := t.TempDir()
	tool, err := NewExecTool(tmpDir, true)
	if err != nil {
		t.Fatalf("unable to configure exec tool: %s", err)
	}

	commands := []string{
		"ls -la state/ 2>/dev/null; echo ---",
		"cat state/x.py 2>/dev/null | head -5",
		"echo hi 2>/dev/null && echo done",
		"foo 2>/dev/null || true",
		"echo test >/dev/null; echo done",
	}

	for _, cmd := range commands {
		result := tool.Execute(context.Background(), map[string]any{"command": cmd})
		if result.IsError && strings.Contains(result.ForLLM, "path outside working dir") {
			t.Errorf("safe kernel pseudo-device must not be blocked: %s\n  error: %s",
				cmd, result.ForLLM)
		}
	}
}
