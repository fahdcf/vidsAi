#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Local Aeneas alignment runner with robust fallbacks.

Behavior:
- If python-aeneas is available and its dependencies work, perform real forced-alignment
  and output JSON fragments.
- If aeneas is not available or fails, compute total duration using ffprobe if present;
  otherwise estimate it from text length. Then split the input text into fragments and
  allocate durations proportionally to text length. Always produce a valid JSON file.

CLI:
  python scripts/aeneas_align.py --audio AUDIO_PATH --text TEXT_PATH --lang LANG --out OUT_JSON

Output JSON format:
{
  "fragments": [
    { "begin": 0.0, "end": 2.5, "lines": ["text piece"] },
    ...
  ]
}
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

from typing import List, Dict, Any, Optional


def read_text(path: str) -> str:
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read().strip()


def ensure_ffprobe(project_root: str) -> Optional[str]:
    """
    Return a path to ffprobe or None. Try PATH first; else try local storage/tools/ffmpeg/bin.
    No auto-download to avoid network stalls.
    """
    path_bin = shutil.which('ffprobe')
    if path_bin:
        return path_bin

    local_bin_dir = os.path.join(project_root, 'storage', 'tools', 'ffmpeg', 'bin')
    local_ffprobe_exe = os.path.join(local_bin_dir, 'ffprobe.exe')
    local_ffprobe_nix = os.path.join(local_bin_dir, 'ffprobe')
    if os.path.exists(local_ffprobe_exe):
        return local_ffprobe_exe
    if os.path.exists(local_ffprobe_nix):
        return local_ffprobe_nix
    return None


def probe_duration(ffprobe_bin: Optional[str], audio_path: str) -> float:
    if not ffprobe_bin:
        return 0.0
    try:
        cmd = [ffprobe_bin, '-v', 'error', '-show_entries', 'format=duration',
               '-of', 'default=noprint_wrappers=1:nokey=1', audio_path]
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL, universal_newlines=True)
        out = out.strip()
        if out and re.match(r'^\d+(\.\d+)?$', out):
            seconds = float(out)
            return seconds if seconds > 0 else 0.0
        return 0.0
    except Exception:
        return 0.0


def split_into_fragments(text: str, lang: str = 'eng') -> List[str]:
    # For Arabic/Moroccan, always split into individual words for better timing
    if lang in ['ara', 'ar', 'arabic', 'moroccan']:
        text = re.sub(r'[\r\n]+', ' ', text).strip()
        if not text:
            return []
        # Split into individual words for Arabic
        words = text.split()
        return words if words else [text]
    
    # For other languages, prefer sentence-like chunks; fallback to whitespace tokens grouped
    text = re.sub(r'[\r\n]+', ' ', text).strip()
    if not text:
        return []
    # Split on common sentence delimiters including Arabic punctuation
    parts = re.split(r'(?<=[\.!?؟؛،])\s+|\n+', text)
    parts = [p.strip() for p in parts if p.strip()]
    if len(parts) >= 1:
        return parts
    # Fallback: chunk every ~8 words
    words = text.split()
    chunks: List[str] = []
    step = 8
    for i in range(0, len(words), step):
        chunks.append(' '.join(words[i:i+step]))
    return chunks if chunks else [text]


def allocate_durations(total_seconds: float, fragments: List[str]) -> List[Dict[str, Any]]:
    if total_seconds <= 0:
        # Estimate: ~2.2 words per second; minimum 6 seconds
        word_count = sum(len(f.split()) for f in fragments)
        total_seconds = max(6.0, round(word_count / 2.2, 1))

    lengths = [max(1, len(f)) for f in fragments]
    total_len = sum(lengths) if sum(lengths) > 0 else len(fragments)
    cursor = 0.0
    out: List[Dict[str, Any]] = []
    for frag, L in zip(fragments, lengths):
        portion = L / total_len if total_len > 0 else 1.0 / len(fragments)
        dur = total_seconds * portion
        begin = cursor
        end = begin + dur
        out.append({
            'begin': round(begin, 3),
            'end': round(end, 3),
            'lines': [frag]
        })
        cursor = end
    # Guard against rounding gaps by forcing exact total on last fragment
    if out:
        adjust = round(total_seconds, 3) - out[-1]['end']
        out[-1]['end'] = round(out[-1]['end'] + adjust, 3)
    return out


def try_aeneas_align(audio_path: str, text_path: str, lang: str) -> Optional[List[Dict[str, Any]]]:
    try:
        import importlib
        aeneas_exec = importlib.import_module('aeneas.executetask')
        aeneas_task_mod = importlib.import_module('aeneas.task')
        ExecuteTask = getattr(aeneas_exec, 'ExecuteTask')
        Task = getattr(aeneas_task_mod, 'Task')

        tlcode = lang if lang else 'eng'
        config_str = f"task_language={tlcode}|is_text_type=plain|os_task_file_format=json"
        task = Task(config_string=config_str)
        task.audio_file_path_absolute = audio_path
        task.text_file_path_absolute = text_path
        with tempfile.NamedTemporaryFile(delete=False, suffix='.json') as tmp_out:
            tmp_out_path = tmp_out.name
        executor = ExecuteTask(task)
        executor.execute()
        task.output_sync_map_file(tmp_out_path)
        with open(tmp_out_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        os.unlink(tmp_out_path)
        fragments = data.get('fragments', [])
        if isinstance(fragments, list) and fragments:
            return fragments
        return None
    except Exception:
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description='Local Aeneas alignment runner with fallbacks')
    parser.add_argument('--audio', required=True, help='Path to audio file')
    parser.add_argument('--text', required=True, help='Path to UTF-8 text file')
    parser.add_argument('--lang', default='eng', help='Aeneas language code (e.g., eng, ara)')
    parser.add_argument('--out', required=True, help='Path to output JSON file')
    args = parser.parse_args()

    audio_path = os.path.abspath(args.audio)
    text_path = os.path.abspath(args.text)
    out_path = os.path.abspath(args.out)
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    text = read_text(text_path)
    # Try real Aeneas first
    fragments = try_aeneas_align(audio_path, text_path, args.lang)

    if not fragments:
        # Fallback: probe duration with ffprobe or estimate
        ffprobe_bin = ensure_ffprobe(project_root)
        total_secs = probe_duration(ffprobe_bin, audio_path)
        text_frags = split_into_fragments(text, args.lang)
        if not text_frags:
            text_frags = [text or '']
        fragments = allocate_durations(total_secs, text_frags)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump({ 'fragments': fragments }, f, ensure_ascii=False)

    # Print a short summary to stdout
    sys.stdout.write(json.dumps({
        'status': 'ok',
        'fragments': len(fragments)
    }))


if __name__ == '__main__':
    main()


