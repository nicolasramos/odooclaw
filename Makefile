.PHONY: generate build vet test clean

generate:
	cd odooclaw && go generate ./cmd/odooclaw/internal/onboard

build: generate
	cd odooclaw && go build ./...

vet: generate
	cd odooclaw && go vet ./...

test: generate
	cd odooclaw && go test ./... -count=1 -timeout 300s

clean:
	rm -rf odooclaw/cmd/odooclaw/internal/onboard/workspace
