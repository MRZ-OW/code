"""Command-line entry point: ``python -m voicebridge <command>``.

Commands:
    devices                 list audio input/output devices
    record [--reference]    record training data (or a single reference clip)
    train  [--check]        validate the dataset / print the training plan
    run                     start the real-time engine (headless)
    gui                     open the control panel
"""

from __future__ import annotations

import argparse
import logging
import sys
import time


def _setup_logging(level: str = "INFO") -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


def _load_config(path: str):
    from .config import Config

    return Config.load(path)


def cmd_devices(_args) -> int:
    from .audio_io import list_devices

    print(list_devices())
    return 0


def cmd_record(args) -> int:
    from . import record

    if args.reference:
        record.record_reference(out_path=args.out or "recordings/reference.wav")
    else:
        record.record_dataset(
            out_dir=args.out or "recordings/dataset",
            sentences_file=args.sentences,
        )
    return 0


def cmd_train(args) -> int:
    from . import train

    if args.check:
        train.check_dataset(args.dataset)
    else:
        train.check_dataset(args.dataset)
        train.print_plan(args.dataset)
    return 0


def cmd_run(args) -> int:
    from .engine import RealtimeEngine

    config = _load_config(args.config)
    _setup_logging(config.logging.level)
    engine = RealtimeEngine(config)
    try:
        engine.start()
    except Exception as exc:
        logging.getLogger("voicebridge").error("Failed to start: %s", exc)
        return 1
    print("VoiceBridge is live. In the game, set Microphone = 'CABLE Output'. Ctrl+C to stop.")
    try:
        while engine.running:
            time.sleep(0.2)
    except KeyboardInterrupt:
        print("\nstopping...")
    finally:
        engine.stop()
    return 0


def cmd_gui(args) -> int:
    from .gui import run_gui

    config = _load_config(args.config)
    _setup_logging(config.logging.level)
    run_gui(config)
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="voicebridge", description="Real-time AI voice changer.")
    p.add_argument("--config", default="config.yaml", help="path to config.yaml")
    sub = p.add_subparsers(dest="command", required=True)

    sub.add_parser("devices", help="list audio devices").set_defaults(func=cmd_devices)

    pr = sub.add_parser("record", help="record training data")
    pr.add_argument("--reference", action="store_true", help="record one reference clip (Seed-VC)")
    pr.add_argument("--out", default=None, help="output dir (dataset) or file (reference)")
    pr.add_argument("--sentences", default="docs/sentences.txt", help="prompt list")
    pr.set_defaults(func=cmd_record)

    pt = sub.add_parser("train", help="validate dataset / print training plan")
    pt.add_argument("--check", action="store_true", help="only validate the dataset")
    pt.add_argument("--dataset", default="recordings/dataset", help="dataset dir")
    pt.set_defaults(func=cmd_train)

    sub.add_parser("run", help="start the real-time engine").set_defaults(func=cmd_run)
    sub.add_parser("gui", help="open the control panel").set_defaults(func=cmd_gui)
    return p


def main(argv: list[str] | None = None) -> int:
    _setup_logging()
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
