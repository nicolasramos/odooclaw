import time
from contextlib import contextmanager
from odoo_mcp.observability.logging import get_logger

_metrics_logger = get_logger("metrics")

@contextmanager
def measure_time(operation_name: str, labels: dict = None):
    """Context manager to measure and log the execution time of an operation."""
    start = time.time()
    try:
        yield
    finally:
        duration_ms = (time.time() - start) * 1000
        labels_str = f" Labels: {labels}" if labels else ""
        _metrics_logger.info(f"METRIC | Operation: {operation_name} | Duration: {duration_ms:.2f}ms{labels_str}")
