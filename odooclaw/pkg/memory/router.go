package memory

import (
	"context"
	"strings"
)

type MemoryRoute string

const (
	MemoryRouteOperational MemoryRoute = "operational"
	MemoryRouteStrategic   MemoryRoute = "strategic"
)

type RoutedMemoryInput struct {
	Route    MemoryRoute
	Title    string
	Type     string
	Content  string
	Project  string
	Scope    string
	TopicKey string
}

type RoutedMemoryResult struct {
	Destination string
	Saved       bool
}

type MemoryRouter struct {
	engramEnabled bool
	engram        EngramClient
}

func NewMemoryRouter(engramEnabled bool, engram EngramClient) *MemoryRouter {
	if engram == nil {
		engram = NewNoopEngramClient()
	}

	return &MemoryRouter{
		engramEnabled: engramEnabled,
		engram:        engram,
	}
}

func (r *MemoryRouter) Save(ctx context.Context, input RoutedMemoryInput) (RoutedMemoryResult, error) {
	route := normalizeMemoryRoute(input.Route)
	if route != MemoryRouteStrategic {
		return RoutedMemoryResult{Destination: string(MemoryRouteOperational)}, nil
	}

	if !r.engramEnabled {
		return RoutedMemoryResult{Destination: string(MemoryRouteStrategic)}, nil
	}

	if err := r.engram.Save(ctx, EngramSaveInput{
		Title:    strings.TrimSpace(input.Title),
		Type:     strings.TrimSpace(input.Type),
		Content:  strings.TrimSpace(input.Content),
		Project:  strings.TrimSpace(input.Project),
		Scope:    strings.TrimSpace(input.Scope),
		TopicKey: strings.TrimSpace(input.TopicKey),
	}); err != nil {
		return RoutedMemoryResult{Destination: string(MemoryRouteStrategic)}, err
	}

	return RoutedMemoryResult{Destination: string(MemoryRouteStrategic), Saved: true}, nil
}

func normalizeMemoryRoute(route MemoryRoute) MemoryRoute {
	switch route {
	case MemoryRouteStrategic:
		return MemoryRouteStrategic
	default:
		return MemoryRouteOperational
	}
}
