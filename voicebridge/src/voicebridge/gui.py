"""A tiny control panel so the engine can be driven without a terminal.

Design goal: the person using the voice (not the person who built it) opens this,
picks her microphone, clicks Start, and switches the game's mic to "CABLE
Output". Everything else is defaults from config.yaml.

Tkinter ships with the standard Windows Python install, so there's no extra
dependency. Imported lazily so the rest of the package works on headless boxes.
"""

from __future__ import annotations

import logging
import math

from .config import Config
from .engine import RealtimeEngine

log = logging.getLogger("voicebridge.gui")


def _db_to_meter(db: float) -> int:
    """Map dBFS (-60..0) to a 0..100 meter value."""
    if math.isinf(db):
        return 0
    return max(0, min(100, int((db + 60.0) / 60.0 * 100.0)))


def run_gui(config: Config) -> None:
    import tkinter as tk
    from tkinter import ttk

    import sounddevice as sd

    engine = RealtimeEngine(config)

    root = tk.Tk()
    root.title("VoiceBridge")
    root.geometry("440x340")
    root.resizable(False, False)

    main = ttk.Frame(root, padding=14)
    main.pack(fill="both", expand=True)

    # -- device pickers ----------------------------------------------------
    inputs = [d["name"] for d in sd.query_devices() if d["max_input_channels"] > 0]
    outputs = [d["name"] for d in sd.query_devices() if d["max_output_channels"] > 0]

    ttk.Label(main, text="Your microphone").grid(row=0, column=0, sticky="w")
    mic_var = tk.StringVar(value=_match(inputs, config.audio.input_device))
    ttk.Combobox(main, textvariable=mic_var, values=inputs, width=42, state="readonly").grid(
        row=1, column=0, columnspan=2, pady=(0, 8), sticky="we"
    )

    ttk.Label(main, text="Output to game (virtual cable)").grid(row=2, column=0, sticky="w")
    out_var = tk.StringVar(value=_match(outputs, config.audio.output_device))
    ttk.Combobox(main, textvariable=out_var, values=outputs, width=42, state="readonly").grid(
        row=3, column=0, columnspan=2, pady=(0, 8), sticky="we"
    )

    monitor_var = tk.BooleanVar(value=bool(config.audio.monitor_device))
    ttk.Checkbutton(main, text="Hear myself in headphones (monitor)", variable=monitor_var).grid(
        row=4, column=0, columnspan=2, sticky="w", pady=(0, 8)
    )

    # -- meters ------------------------------------------------------------
    ttk.Label(main, text="Input").grid(row=5, column=0, sticky="w")
    in_meter = ttk.Progressbar(main, length=300, maximum=100)
    in_meter.grid(row=5, column=1, sticky="we")
    ttk.Label(main, text="Output").grid(row=6, column=0, sticky="w")
    out_meter = ttk.Progressbar(main, length=300, maximum=100)
    out_meter.grid(row=6, column=1, sticky="we")

    status = ttk.Label(main, text=f"Backend: {config.backend}  |  stopped", foreground="#666")
    status.grid(row=7, column=0, columnspan=2, sticky="w", pady=(8, 8))

    # -- start/stop --------------------------------------------------------
    def apply_selection() -> None:
        config.audio.input_device = mic_var.get() or "default"
        config.audio.output_device = out_var.get() or config.audio.output_device
        # Use the default output for monitoring if the box is ticked and none set.
        if monitor_var.get() and not config.audio.monitor_device:
            config.audio.monitor_device = "default"
        if not monitor_var.get():
            config.audio.monitor_device = None

    def toggle() -> None:
        if engine.running:
            engine.stop()
            start_btn.config(text="Start")
            status.config(text=f"Backend: {config.backend}  |  stopped", foreground="#666")
        else:
            apply_selection()
            try:
                engine.start()
            except Exception as exc:  # surface device/model errors to the user
                status.config(text=f"Error: {exc}", foreground="#b00")
                log.exception("failed to start engine")
                return
            start_btn.config(text="Stop")
            status.config(text=f"Backend: {config.backend}  |  LIVE", foreground="#0a0")

    start_btn = ttk.Button(main, text="Start", command=toggle)
    start_btn.grid(row=8, column=0, columnspan=2, pady=4, sticky="we")

    ttk.Label(
        main,
        text='In the game, set Microphone = "CABLE Output".',
        foreground="#888",
    ).grid(row=9, column=0, columnspan=2, sticky="w", pady=(6, 0))

    main.columnconfigure(1, weight=1)

    # -- meter refresh loop ------------------------------------------------
    def refresh() -> None:
        if engine.running:
            in_rms, out_rms, infer_ms = engine.levels()
            in_meter["value"] = _db_to_meter(_db(in_rms))
            out_meter["value"] = _db_to_meter(_db(out_rms))
            status.config(text=f"Backend: {config.backend}  |  LIVE  |  {infer_ms:.0f} ms/chunk")
        else:
            in_meter["value"] = 0
            out_meter["value"] = 0
        root.after(100, refresh)

    def on_close() -> None:
        engine.stop()
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_close)
    refresh()
    root.mainloop()


def _db(rms: float) -> float:
    return 20.0 * math.log10(rms) if rms > 1e-9 else float("-inf")


def _match(names: list[str], spec: str) -> str:
    """Pick the device name in ``names`` that best matches the config spec."""
    if not names:
        return ""
    if not spec or spec.lower() == "default":
        return names[0]
    needle = spec.lower()
    for n in names:
        if needle in n.lower():
            return n
    return names[0]
