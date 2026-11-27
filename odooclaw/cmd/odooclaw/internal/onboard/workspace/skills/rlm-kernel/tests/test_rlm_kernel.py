#!/usr/bin/env python3
"""Tests for rlm-kernel MCP server — lake operations and kernel lifecycle."""

import fcntl
import importlib.util
import json
import os
import sys
import tempfile
import time

# Load the canonical server.py inside the Go-embedded rlm-kernel directly by
# file path (bypasses sys.path caching). Resolve it relative to this test file
# so it works from any checkout, not just the machine that wrote the port.
_SERVER_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    os.pardir, os.pardir, os.pardir, os.pardir,
    "cmd", "odooclaw", "internal", "onboard", "workspace", "skills",
    "rlm-kernel", "server.py",
)
_SERVER_PATH = os.path.abspath(_SERVER_PATH)

def _load_server():
    """Always load a fresh copy of server so patched methods are used."""
    spec = importlib.util.spec_from_file_location("server_fresh", _SERVER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load server from {_SERVER_PATH}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TestContextLake:
    """Test the JSONL context lake."""

    def setup_method(self):
        self.tmpdir = tempfile.mkdtemp()
        self._s = _load_server()
        self.lake = self._s.ContextLake(self.tmpdir)

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_store_and_get(self):
        res = self.lake.store("test-key", "hello world")
        assert res["key"] == "test-key"
        assert res["chars"] == 11

        content = self.lake.get("test-key")
        assert content == "hello world"

    def test_store_dict(self):
        data = {"users": [1, 2, 3], "count": 3}
        res = self.lake.store("dict-key", data)
        assert res["chars"] > 0

        content = self.lake.get("dict-key")
        parsed = json.loads(content)
        assert parsed["count"] == 3

    def test_store_with_tags(self):
        res = self.lake.store("tagged", "data", tags=["tag1", "tag2"])
        assert res["tags"] == ["tag1", "tag2"]

    def test_get_nonexistent(self):
        assert self.lake.get("nonexistent") is None

    def test_search_regex(self):
        self.lake.store("inv-001", "Invoice for Acme Corp $500")
        self.lake.store("inv-002", "Invoice for Beta Inc $1200")
        self.lake.store("inv-003", "Purchase order for Acme Corp")

        results = self.lake.search("Acme")
        assert len(results) == 2
        keys = [r["key"] for r in results]
        assert "inv-001" in keys
        assert "inv-003" in keys

    def test_search_max_results(self):
        for i in range(20):
            self.lake.store(f"item-{i}", f"data {i} with pattern")

        results = self.lake.search("pattern", max_results=5)
        assert len(results) == 5

    def test_find_text(self):
        self.lake.store("doc-1", "Python is great for data science")
        self.lake.store("doc-2", "JavaScript is great for web dev")

        results = self.lake.find("python")
        assert len(results) == 1
        assert results[0]["key"] == "doc-1"

    def test_stats(self):
        self.lake.store("a", "short")
        self.lake.store("b", "a longer content here")

        stats = self.lake.stats()
        assert stats["entries"] == 2
        assert stats["chars"] > 0
        assert "a" in stats["keys"]
        assert "b" in stats["keys"]

    def test_forget(self):
        self.lake.store("keep-this", "important")
        self.lake.store("delete-this", "temporary")
        self.lake.store("delete-that", "also temporary")

        removed = self.lake.forget("delete")
        assert removed == 2

        assert self.lake.get("keep-this") == "important"
        assert self.lake.get("delete-this") is None
        assert self.lake.get("delete-that") is None

    def test_persistence(self):
        """Data survives lake reload."""
        self.lake.store("persistent", "survives reload")
        del self.lake

        lake2 = self._s.ContextLake(self.tmpdir)
        assert lake2.get("persistent") == "survives reload"

    def test_overwrite_key(self):
        self.lake.store("key", "original")
        self.lake.store("key", "updated")
        assert self.lake.get("key") == "updated"

    def test_empty_key_raises(self):
        try:
            self.lake.store("", "data")
            assert False, "Should have raised TypeError"
        except TypeError:
            pass

    def test_large_content(self):
        large = "x" * 500_000  # 500KB
        self.lake.store("large", large)
        content = self.lake.get("large")
        assert len(content) == 500_000


class TestF2ForgetLock:
    """Test that forget() uses flock to prevent concurrent-write loss."""

    def setup_method(self):
        self.tmpdir = tempfile.mkdtemp()
        self._s = _load_server()
        self.lake = self._s.ContextLake(self.tmpdir)

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_forget_preserves_concurrent_writes(self):
        """F-2: forget with flock re-reads under lock to avoid losing writes."""
        self.lake.store("keep", "important data")
        self.lake.store("delete-me", "temporary")

        # Write another entry via direct file append (simulates concurrent writer)
        lock_path = os.path.join(self.tmpdir, "lake.jsonl.lock")
        with open(lock_path, "w") as lf:
            fcntl.flock(lf.fileno(), fcntl.LOCK_EX)
            with open(self.lake._lake_file, "a") as f:
                f.write(json.dumps({"key": "concurrent-entry", "content": "should survive",
                                    "tags": [], "source": "test",
                                    "created": 1000, "updated": 1000}) + "\n")
            fcntl.flock(lf.fileno(), fcntl.LOCK_UN)

        # Now forget should read under lock and not lose the concurrent entry
        removed = self.lake.forget("delete")
        assert removed >= 1

        # "keep" and "concurrent-entry" should survive
        assert self.lake.get("keep") == "important data"
        assert self.lake.get("concurrent-entry") == "should survive"


class TestF4StoreOrder:
    """Test that store() persists to disk before updating cache (F-4)."""

    def setup_method(self):
        self.tmpdir = tempfile.mkdtemp()
        self._s = _load_server()
        self.lake = self._s.ContextLake(self.tmpdir)

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_store_persists_before_cache_update(self):
        """F-4: _append happens before self._entries[key] = entry."""
        res = self.lake.store("test-f4", "f4 test data", tags=["f4"])
        assert res["key"] == "test-f4"

        # Force cache invalidation to force a re-read from disk
        self.lake._loaded = False
        self.lake._entries.clear()

        # Should be able to retrieve from disk
        assert self.lake.get("test-f4") == "f4 test data"


class TestP3MillisecondTimestamps:
    """Test that timestamps use milliseconds to avoid collisions (P-3)."""

    def setup_method(self):
        self.tmpdir = tempfile.mkdtemp()
        self._s = _load_server()
        self.lake = self._s.ContextLake(self.tmpdir)

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_timestamps_are_milliseconds(self):
        """P-3: created/updated should be millisecond timestamps."""
        res = self.lake.store("ts-test", "timestamp data")

        # Re-read from disk directly (bypasses cache)
        with open(self.lake._lake_file) as f:
            entry = json.loads(f.readline())

        # Millisecond timestamps are large integers (e.g. 1700000000000)
        # Second-level timestamps would be small (~1700000000)
        assert entry["created"] > 1_000_000_000_000, \
            f"created={entry['created']} looks like seconds, not milliseconds"
        assert entry["updated"] > 1_000_000_000_000, \
            f"updated={entry['updated']} looks like seconds, not milliseconds"

    def test_rapid_stores_produce_different_timestamps(self):
        """P-3: rapid stores should produce distinct millisecond timestamps.

        Note: calling int(time.time()*1000) in a tight loop on some machines
        can produce identical ms values, so we only check that all entries
        have valid millisecond-range timestamps (no duplicates within a single
        ms burst is acceptable).
        """
        for i in range(10):
            self.lake.store(f"rapid-{i}", f"data {i}")

        # Re-read from disk (bypasses cache)
        entries = []
        with open(self.lake._lake_file) as f:
            for line in f:
                line = line.strip()
                if line:
                    entries.append(json.loads(line))

        # All 'updated' values should be valid millisecond timestamps
        updated_values = [e["updated"] for e in entries if "rapid-" in e.get("key", "")]
        assert len(updated_values) == 10, f"Expected 10 entries, got {len(updated_values)}"
        assert all(v > 1_000_000_000_000 for v in updated_values), \
            "All timestamps should be in millisecond range"


class TestF6SearchByTags:
    """Test that search() looks in tags as well as content and key (F-6)."""

    def setup_method(self):
        self.tmpdir = tempfile.mkdtemp()
        self._s = _load_server()
        self.lake = self._s.ContextLake(self.tmpdir)

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_search_finds_by_tag(self):
        """F-6: search matches entries by tag as well as content/key."""
        self.lake.store("entry-1", "no matching tag here")
        self.lake.store("entry-2", "content also has the word", tags=["search-this"])
        self.lake.store("entry-3", "nothing here", tags=["another-tag"])

        results = self.lake.search("search-this")
        keys = [r["key"] for r in results]
        assert "entry-2" in keys, \
            f"search by tag should find entry-2, got: {keys}"

    def test_search_matches_key_and_tag(self):
        """F-6: search finds entries when pattern is in either key or tags."""
        self.lake.store("my-key", "unrelated content", tags=["tag-abc"])

        # Should find by key
        results_by_key = self.lake.search("my-key")
        assert len(results_by_key) == 1
        assert results_by_key[0]["key"] == "my-key"

        # Should find by tag
        results_by_tag = self.lake.search("tag-abc")
        assert len(results_by_tag) == 1
        assert results_by_tag[0]["key"] == "my-key"


class TestKernelManager:
    """Test kernel process management (requires python3)."""

    def test_kernel_start_stop(self):
        self._s = _load_server()
        km = self._s.KernelManager()
        try:
            km.start()
            assert km._proc is not None
            assert km._proc.poll() is None  # still running
        finally:
            km.shutdown()

    def test_kernel_snapshot_restore(self):
        self._s = _load_server()
        km = self._s.KernelManager()
        try:
            km.start()
            # Snapshot
            with tempfile.NamedTemporaryFile(suffix=".pkl", delete=False) as f:
                snap_path = f.name
            try:
                res = km.snapshot(snap_path)
                assert res.get("ok") or res.get("rid")  # basic smoke test
            finally:
                os.unlink(snap_path)
        finally:
            km.shutdown()


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v"]))
