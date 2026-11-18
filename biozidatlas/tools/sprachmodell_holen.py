"""Holt die Dateien für die Spracheingabe des Assistenten.

Die Sandbox erreicht Hugging Face nicht, ein GitHub-Runner schon. Das Skript
lädt das offene Spracherkennungsmodell Whisper Base (OpenAI, MIT-Lizenz) als
8-Bit-ONNX und die passenden WebAssembly-Dateien von ONNX Runtime (Microsoft,
MIT-Lizenz) und legt sie in einen Ordner. Der Workflow
biozidatlas-sprachmodell.yml speichert den Ordner auf dem Zweig
biozidatlas-modelle; die Pages-Veröffentlichung kopiert ihn nach
biozidatlas/modelle. So lädt der Browser alles von dieser Seite, und Audio
verlässt den Rechner nie.

Aufruf: python3 biozidatlas/tools/sprachmodell_holen.py <zielordner>
"""
import hashlib
import io
import json
import sys
import tarfile
import time
import urllib.request
from pathlib import Path

# Muss zu vendor/transformers/transformers.min.js passen (siehe dort VERSION).
ORT_VERSION = "1.31.0-dev.20260914-8d85527a0"
ORT_DATEIEN = ["ort-wasm-simd-threaded.asyncify.mjs", "ort-wasm-simd-threaded.asyncify.wasm"]

MODELL_QUELLEN = ["onnx-community/whisper-base", "Xenova/whisper-base"]
ONNX_DATEIEN = ["onnx/encoder_model_quantized.onnx", "onnx/decoder_model_merged_quantized.onnx"]
KLEIN = (".json", ".txt")


def holen(url, versuche=4):
    for i in range(versuche):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "antifouling-atlas-build"})
            with urllib.request.urlopen(req, timeout=300) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            if i == versuche - 1:
                raise
            print(f"  erneut ({e}) …")
            time.sleep(3 * (i + 1))


def eintrag(pfad, daten):
    return {"datei": pfad, "bytes": len(daten), "sha256": hashlib.sha256(daten).hexdigest()}


def main():
    ziel = Path(sys.argv[1] if len(sys.argv) > 1 else "modelle")
    ziel.mkdir(parents=True, exist_ok=True)
    manifest = {"erstellt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "dateien": []}

    # Whisper Base
    info = quelle = None
    for q in MODELL_QUELLEN:
        try:
            info = json.loads(holen(f"https://huggingface.co/api/models/{q}"))
            namen = {s["rfilename"] for s in info.get("siblings", [])}
            if all(f in namen for f in ONNX_DATEIEN):
                quelle = q
                break
            print(f"{q}: Dateien fehlen, nächste Quelle")
        except Exception as e:  # noqa: BLE001
            print(f"{q}: {e}")
    if not quelle:
        sys.exit("Keine Quelle für Whisper Base gefunden.")
    rev = info["sha"]
    print(f"Whisper Base aus {quelle} @ {rev}")
    namen = sorted(s["rfilename"] for s in info["siblings"])
    wahl = [n for n in namen if "/" not in n and n.endswith(KLEIN)] + ONNX_DATEIEN
    for n in wahl:
        daten = holen(f"https://huggingface.co/{quelle}/resolve/{rev}/{n}")
        p = ziel / "whisper-base" / n
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(daten)
        manifest["dateien"].append(eintrag(f"whisper-base/{n}", daten))
        print(f"  {n}: {len(daten) / 1e6:.1f} MB")
    manifest["whisper"] = {"quelle": f"https://huggingface.co/{quelle}", "revision": rev, "lizenz": "MIT (OpenAI Whisper)"}

    # ONNX Runtime Web
    tgz = holen(f"https://registry.npmjs.org/onnxruntime-web/-/onnxruntime-web-{ORT_VERSION}.tgz")
    with tarfile.open(fileobj=io.BytesIO(tgz), mode="r:gz") as tar:
        for n in ORT_DATEIEN:
            daten = tar.extractfile(f"package/dist/{n}").read()
            p = ziel / "ort" / n
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(daten)
            manifest["dateien"].append(eintrag(f"ort/{n}", daten))
            print(f"  ort/{n}: {len(daten) / 1e6:.1f} MB")
    manifest["onnxruntime_web"] = {"version": ORT_VERSION, "quelle": "https://www.npmjs.com/package/onnxruntime-web", "lizenz": "MIT"}

    (ziel / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n")
    (ziel / "README.md").write_text(
        "# Dateien für die Spracheingabe des Antifouling-Atlas\n\n"
        "Erzeugt von `biozidatlas/tools/sprachmodell_holen.py` (Workflow biozidatlas-sprachmodell.yml).\n"
        "Die Pages-Veröffentlichung kopiert diesen Zweig nach `biozidatlas/modelle/`.\n\n"
        f"- Whisper Base, 8 Bit, aus {manifest['whisper']['quelle']} (Revision {rev}), MIT-Lizenz\n"
        f"- ONNX Runtime Web {ORT_VERSION}, MIT-Lizenz\n\n"
        "Prüfsummen in manifest.json.\n"
    )
    gesamt = sum(d["bytes"] for d in manifest["dateien"])
    print(f"Fertig: {len(manifest['dateien'])} Dateien, {gesamt / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
