#!/usr/bin/env python3
"""
remove_pdf_password.py
----------------------
Batch-remove the password from encrypted PDFs *you have the password for*.

Drop this script into a folder full of PDFs and run it. It scans its own
directory, decrypts every PDF it can open, and writes unlocked copies into a
`decrypted/` subfolder. Originals are never modified.

This does NOT crack or guess unknown passwords. It only decrypts PDFs whose
password you already know (or that use an empty owner password).

How the password is supplied (checked in this order per file):
  1. The PASSWORDS list below (edit it), tried in order.
  2. A `passwords.txt` file next to this script, one password per line.
  3. An interactive prompt, only for files that none of the above unlocked.

Dependency:  pip install pypdf
"""

import getpass
import sys
from pathlib import Path

try:
    from pypdf import PdfReader, PdfWriter
    from pypdf.errors import PdfReadError
except ImportError:
    sys.exit("pypdf is not installed. Run:  pip install pypdf")

# ---------------------------------------------------------------------------
# Config — edit if you like, or leave empty and use passwords.txt / prompts.
# ---------------------------------------------------------------------------
PASSWORDS = [
    # "mypassword",
    # "another-if-files-differ",
]
OUTPUT_DIRNAME = "decrypted"   # subfolder for the unlocked copies
INCLUDE_UNENCRYPTED = True     # also copy PDFs that had no password
PROMPT_FOR_UNSOLVED = True     # ask interactively when no known password works
# ---------------------------------------------------------------------------


def load_passwords(base_dir: Path) -> list[str]:
    """PASSWORDS list + any lines from passwords.txt (deduped, order kept)."""
    candidates = list(PASSWORDS)
    pwfile = base_dir / "passwords.txt"
    if pwfile.exists():
        for line in pwfile.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.rstrip("\n")
            if line:
                candidates.append(line)
    # Always try the empty password too (owner-only encryption is common).
    candidates.append("")
    seen, ordered = set(), []
    for p in candidates:
        if p not in seen:
            seen.add(p)
            ordered.append(p)
    return ordered


def try_unlock(reader: PdfReader, passwords: list[str]) -> tuple[bool, str | None]:
    """Attempt each password. Returns (success, password_used_or_None)."""
    for pw in passwords:
        try:
            if reader.decrypt(pw):        # non-zero result == accepted
                return True, pw
        except (PdfReadError, NotImplementedError):
            # Unsupported encryption on this attempt — keep trying others.
            continue
    return False, None


def write_decrypted(reader: PdfReader, dest: Path) -> None:
    writer = PdfWriter()
    writer.append(reader)          # copies pages, metadata, bookmarks, etc.
    with open(dest, "wb") as fh:
        writer.write(fh)


def process_pdf(path: Path, out_dir: Path, passwords: list[str]) -> str:
    """Handle one PDF. Returns a short status string for the summary."""
    try:
        reader = PdfReader(str(path))
    except Exception as exc:
        return f"ERROR  {path.name}  ({type(exc).__name__}: {exc})"

    dest = out_dir / path.name

    if not reader.is_encrypted:
        if INCLUDE_UNENCRYPTED:
            write_decrypted(reader, dest)
            return f"copied {path.name}  (was not encrypted)"
        return f"skip   {path.name}  (not encrypted)"

    ok, used = try_unlock(reader, passwords)

    if not ok and PROMPT_FOR_UNSOLVED and sys.stdin.isatty():
        pw = getpass.getpass(f"    password for '{path.name}' (blank to skip): ")
        if pw:
            ok, used = try_unlock(reader, [pw])

    if not ok:
        return f"FAILED {path.name}  (no matching password)"

    try:
        write_decrypted(reader, dest)
    except Exception as exc:
        return f"ERROR  {path.name}  (write failed: {exc})"

    label = "empty password" if used == "" else "password matched"
    return f"OK     {path.name}  ({label})"


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    out_dir = base_dir / OUTPUT_DIRNAME
    out_dir.mkdir(exist_ok=True)

    pdfs = sorted(
        p for p in base_dir.glob("*.pdf")
        if p.is_file() and p.parent == base_dir
    )
    if not pdfs:
        print(f"No PDF files found in {base_dir}")
        return

    passwords = load_passwords(base_dir)
    print(f"Found {len(pdfs)} PDF(s). Writing unlocked copies to '{OUTPUT_DIRNAME}/'.\n")

    results = [process_pdf(p, out_dir, passwords) for p in pdfs]

    print("\n".join(f"  {r}" for r in results))
    done = sum(r.startswith(("OK", "copied")) for r in results)
    print(f"\nDone: {done}/{len(pdfs)} written to {out_dir}")


if __name__ == "__main__":
    main()
