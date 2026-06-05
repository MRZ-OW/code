"""VoiceBridge: real-time AI voice conversion into a virtual microphone.

See docs/DESIGN.md for the architecture. Public entry point is the CLI:

    python -m voicebridge devices    # list audio devices
    python -m voicebridge record     # record training data
    python -m voicebridge run        # start the real-time engine
    python -m voicebridge gui        # open the control panel
"""

__version__ = "0.1.0"
