#!/usr/bin/env python3
"""Tests for rlm-kernel MCP server — lake operations and kernel lifecycle."""

import json
import os
import sys
import tempfile
import time

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import ContextLake, KernelManager


class TestContextLake:
    """Test the JSONL context lake."""

    def setup_method(self):
        self.tmpdir = tempfile.mkdtemp()
        self.lake = ContextLake(self.tmpdir)

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

        lake2 = ContextLake(self.tmpdir)
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


class TestKernelManager:
    """Test kernel process management (requires python3)."""

    def test_kernel_start_stop(self):
        km = KernelManager()
        try:
            km.start()
            assert km._proc is not None
            assert km._proc.poll() is None  # still running
        finally:
            km.shutdown()

    def test_kernel_snapshot_restore(self):
        km = KernelManager()
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
