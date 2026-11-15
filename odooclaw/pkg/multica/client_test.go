package multica

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCreateIssueSendsBearerAuthAndPayloadShape(t *testing.T) {
	var gotAuth string
	var gotPath string
	var gotBody map[string]string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotPath = r.URL.Path
		if err := json.NewDecoder(r.Body).Decode(&gotBody); err != nil {
			t.Fatalf("server could not decode request body: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"id":"01a1b","identifier":"NRA-123","number":123}`))
	}))
	defer server.Close()

	client := New(Config{BaseURL: server.URL, Token: "mat_test", ProjectID: "proj-1"})
	issue, err := client.CreateIssue(context.Background(), IssueRequest{
		Title:       "Client request from Alice",
		Description: "literal message text",
		ProjectID:   "proj-1",
	})
	if err != nil {
		t.Fatalf("CreateIssue() error = %v", err)
	}

	if gotAuth != "Bearer mat_test" {
		t.Errorf("Authorization = %q, want %q", gotAuth, "Bearer mat_test")
	}
	if gotPath != "/api/issues" {
		t.Errorf("path = %q, want %q", gotPath, "/api/issues")
	}
	if gotBody["title"] != "Client request from Alice" {
		t.Errorf("title = %q", gotBody["title"])
	}
	if gotBody["description"] != "literal message text" {
		t.Errorf("description = %q", gotBody["description"])
	}
	if gotBody["project_id"] != "proj-1" {
		t.Errorf("project_id = %q", gotBody["project_id"])
	}
	if issue.Identifier != "NRA-123" || issue.ID != "01a1b" || issue.Number != 123 {
		t.Errorf("parsed issue = %+v", issue)
	}
}

func TestCreateIssueTrimsTrailingSlashInBaseURL(t *testing.T) {
	var gotPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		w.Write([]byte(`{"id":"x","identifier":"NRA-1","number":1}`))
	}))
	defer server.Close()

	client := New(Config{BaseURL: server.URL + "/", Token: "t", ProjectID: "p"})
	if _, err := client.CreateIssue(context.Background(), IssueRequest{Title: "x", ProjectID: "p"}); err != nil {
		t.Fatalf("CreateIssue() error = %v", err)
	}
	if gotPath != "/api/issues" {
		t.Errorf("path = %q, want %q", gotPath, "/api/issues")
	}
}

func TestCreateIssueReturnsErrorOnNon2xx(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error":"invalid token"}`))
	}))
	defer server.Close()

	client := New(Config{BaseURL: server.URL, Token: "bad", ProjectID: "p"})
	_, err := client.CreateIssue(context.Background(), IssueRequest{Title: "x", ProjectID: "p"})
	if err == nil {
		t.Fatal("expected error on 401, got nil")
	}
	if !strings.Contains(err.Error(), "401") {
		t.Errorf("error = %v, want it to mention status 401", err)
	}
}

// The real API echoes the full description back, so a client-request-sized
// read cap truncates the JSON and turns a successful creation into a decode
// error. The response must be read whole (bounded, but well above one issue).
func TestCreateIssueReadsFullResponseBeyondOneKB(t *testing.T) {
	long := strings.Repeat("x", 4000)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"id":"01a1c","identifier":"NRA-124","number":124,"description":%q}`, long)
	}))
	defer server.Close()

	client := New(Config{BaseURL: server.URL, Token: "t", ProjectID: "p"})
	issue, err := client.CreateIssue(context.Background(), IssueRequest{Title: "x", ProjectID: "p"})
	if err != nil {
		t.Fatalf("CreateIssue() error = %v (response truncated?)", err)
	}
	if issue.Identifier != "NRA-124" {
		t.Errorf("identifier = %q", issue.Identifier)
	}
}

func TestCreateIssueReturnsErrorOnUnparsableBody(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`not json`))
	}))
	defer server.Close()

	client := New(Config{BaseURL: server.URL, Token: "t", ProjectID: "p"})
	if _, err := client.CreateIssue(context.Background(), IssueRequest{Title: "x", ProjectID: "p"}); err == nil {
		t.Fatal("expected error on unparsable body, got nil")
	}
}
