"""Standalone audio device lister (no install needed): python scripts/list_devices.py

Equivalent to `python -m voicebridge devices`, handy before the package is set up.
"""

import sounddevice as sd

print(sd.query_devices())
print("\nDefault (input, output) indices:", sd.default.device)
