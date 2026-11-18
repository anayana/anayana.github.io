"""Sprechtexte des Anleitungsvideos in Sprache umwandeln.

Aufruf: python3 sprechen.py <texte.json> <ordner>

Nimmt Piper mit der freien Stimme „Thorsten“ (CC0), wenn PIPER_MODELL auf die
.onnx-Datei zeigt, sonst pico2wave. Schreibt je Szene <id>.wav und dauer.json
(Sekunden je Szene) in den Ordner.
"""
import json
import os
import subprocess
import sys
import wave
from pathlib import Path


def piper_stimme():
    modell = os.environ.get("PIPER_MODELL")
    if not modell or not Path(modell).exists():
        return None
    from piper.voice import PiperVoice  # pip install piper-tts
    return PiperVoice.load(modell)


def main():
    texte = json.loads(Path(sys.argv[1]).read_text())
    ordner = Path(sys.argv[2])
    ordner.mkdir(parents=True, exist_ok=True)
    stimme = piper_stimme()
    print("Stimme:", "Piper " + os.environ["PIPER_MODELL"] if stimme else "pico2wave")
    dauer = {}
    for t in texte:
        ziel = ordner / f"{t['id']}.wav"
        if stimme:
            with wave.open(str(ziel), "wb") as w:
                if hasattr(stimme, "synthesize_wav"):  # piper-tts ab 1.3
                    stimme.synthesize_wav(t["text"], w)
                else:  # piper-tts 1.2
                    stimme.synthesize(t["text"], w)
        else:
            subprocess.run(["pico2wave", "-l", "de-DE", "-w", str(ziel), t["text"]], check=True)
        with wave.open(str(ziel)) as w:
            dauer[t["id"]] = round(w.getnframes() / w.getframerate(), 3)
        print(f"{dauer[t['id']]:6.1f} s  {t['id']}")
    (ordner / "dauer.json").write_text(json.dumps(dauer, indent=1))
    print(f"Gesamt {sum(dauer.values()) / 60:.1f} min")


if __name__ == "__main__":
    main()
