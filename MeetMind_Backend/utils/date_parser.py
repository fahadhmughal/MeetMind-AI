"""Date parsing utility for normalizing freeform LLM due dates into ISO YYYY-MM-DD strings."""

import re
from datetime import datetime
from typing import Optional
from utils.logger import get_logger

logger = get_logger(__name__)


def parse_to_iso_date(date_str: Optional[str]) -> Optional[str]:
    """Tries to parse a freeform due date string into YYYY-MM-DD ISO format.

    Returns None if unparseable, preventing SQL/PostgREST syntax errors.
    """
    if not date_str or not date_str.strip():
        return None

    cleaned = date_str.strip()

    # Match existing YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", cleaned):
        return cleaned

    # Strip ordinal suffixes (14th -> 14, 1st -> 1, 2nd -> 2, 3rd -> 3)
    clean_ordinals = re.sub(r"(\d+)(st|nd|rd|th)", r"\1", cleaned, flags=re.IGNORECASE)

    formats_to_try = [
        "%B %d",         # August 14
        "%B %d %Y",      # August 14 2026
        "%b %d",         # Aug 14
        "%b %d %Y",      # Aug 14 2026
        "%Y/%m/%d",
        "%d/%m/%Y",
        "%m/%d/%Y",
    ]

    current_year = datetime.now().year

    for fmt in formats_to_try:
        try:
            dt = datetime.strptime(clean_ordinals, fmt)
            if "%Y" not in fmt:
                dt = dt.replace(year=current_year)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue

    logger.debug(f"Could not parse '{date_str}' to ISO date. Returning None.")
    return None
