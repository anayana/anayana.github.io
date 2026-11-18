"""Anleitungsvideo zusammensetzen: Bilder der Aufnahme + Sprachspur.

Aufruf: python3 schnitt.py <aufnahme-ordner> <stimmen-ordner> <ziel-ordner>

Schreibt anleitung.mp4 (H.264, AAC), poster.jpg, kapitel.json (Kapitel mit
Startzeit für die Seite anleitung.html) und untertitel.vtt.
"""
import array
import json
import subprocess
import sys
from pathlib import Path

RATE = 48000


def zeit_vtt(s):
    h, rest = divmod(s, 3600)
    m, sek = divmod(rest, 60)
    return f"{int(h):02d}:{int(m):02d}:{sek:06.3f}"


def main():
    auf, stimmen, ziel = (Path(a) for a in sys.argv[1:4])
    ziel.mkdir(parents=True, exist_ok=True)
    zeiten = json.loads((auf / "zeiten.json").read_text())
    bilder = json.loads((auf / "bilder.json").read_text())
    start, ende = zeiten["start"], zeiten["ende"]
    laenge = ende - start

    # Bilder: jedes so lange, bis das nächste kommt (Screencast liefert nur Änderungen).
    vor = [b for b in bilder if b["t"] <= start]
    nach = [b for b in bilder if b["t"] > start]
    folge = ([dict(vor[-1], t=start)] if vor else []) + nach
    if not folge:
        sys.exit("keine Bilder")
    folge[0]["t"] = start
    zeilen = ["ffconcat version 1.0"]
    for i, b in enumerate(folge):
        bis = folge[i + 1]["t"] if i + 1 < len(folge) else ende
        zeilen.append(f"file '{(auf / 'bilder' / b['datei']).resolve()}'")
        zeilen.append(f"duration {max(bis - b['t'], 0.001):.4f}")
    zeilen.append(f"file '{(auf / 'bilder' / folge[-1]['datei']).resolve()}'")
    (ziel / "bilder.ffconcat").write_text("\n".join(zeilen) + "\n")

    # Sprachspur: jede Szene an ihrer Startzeit.
    spur = array.array("h", bytes(2 * int((laenge + 1) * RATE)))
    for s in zeiten["szenen"]:
        wav = stimmen / f"{s['id']}.wav"
        if not wav.exists():
            continue
        roh = subprocess.run(["ffmpeg", "-v", "error", "-i", str(wav), "-f", "s16le", "-ac", "1", "-ar", str(RATE), "-"],
                             check=True, capture_output=True).stdout
        klang = array.array("h")
        klang.frombytes(roh)
        o = int(s["start"] * RATE)
        n = min(len(klang), len(spur) - o)
        spur[o:o + n] = klang[:n]
    (ziel / "ton.raw").write_bytes(spur.tobytes())

    subprocess.run([
        "ffmpeg", "-v", "error", "-y",
        "-f", "concat", "-safe", "0", "-i", str(ziel / "bilder.ffconcat"),
        "-f", "s16le", "-ar", str(RATE), "-ac", "1", "-i", str(ziel / "ton.raw"),
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=white,fps=30,format=yuv420p",
        "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-tune", "stillimage",
        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-t", f"{laenge:.3f}",
        str(ziel / "anleitung.mp4"),
    ], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "3", "-i", str(ziel / "anleitung.mp4"), "-frames:v", "1",
                    "-vf", "scale=1280:-2", "-q:v", "3", str(ziel / "poster.jpg")], check=True)
    for f in ("bilder.ffconcat", "ton.raw"):
        (ziel / f).unlink()

    dauer = json.loads((stimmen / "dauer.json").read_text())
    kapitel = [{"zeit": round(s["start"], 1), "titel": s["kapitel"]} for s in zeiten["szenen"] if s.get("kapitel")]
    (ziel / "kapitel.json").write_text(json.dumps({"laenge": round(laenge, 1), "kapitel": kapitel}, ensure_ascii=False, indent=1) + "\n")
    vtt = ["WEBVTT", ""]
    for s in zeiten["szenen"]:
        a = s["start"]
        b = min(a + dauer.get(s["id"], 3) + 0.3, laenge)
        vtt += [f"{zeit_vtt(a)} --> {zeit_vtt(b)}", s["titel"], ""]
    (ziel / "untertitel.vtt").write_text("\n".join(vtt))
    groesse = (ziel / "anleitung.mp4").stat().st_size / 1e6
    print(f"anleitung.mp4: {laenge / 60:.1f} min, {groesse:.1f} MB, {len(folge)} Bilder, {len(kapitel)} Kapitel")


if __name__ == "__main__":
    main()
