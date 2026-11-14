"""Rasterize existing SVG evidence; does not edit the illustration."""
from pathlib import Path
import sys
import cairosvg
source, target = map(Path, sys.argv[1:])
cairosvg.svg2png(url=str(source), write_to=str(target), output_width=512)
