# VST-DAW-PRODUCER

Eine innovative Browser-DAW, die Sound-Design **spielerisch beibringt** und Komponieren
in den Flow bringt. Läuft komplett im Browser – keine Installation, alles Open Source
(React + TypeScript + [Tone.js](https://tonejs.github.io), MIT).

## Zwei Modi

### 1. Ear Trainer (Syntorial-Prinzip)
Du hörst einen Zielsound und baust ihn am **MONOLITH-24** nach – einem Synth-Panel im
Analog-Retro-Look mit echten Drehreglern, Kippschaltern, VU-Meter und CRT-Oszilloskop.

**Regler werden Level für Level freigeschaltet.** Das Panel zeigt von Anfang an alle Module,
noch nicht gelernte Regler sind ausgegraut mit 🔒. Mit jedem bestandenen Level kommen neue dazu
(von 4 Reglern in Level 1 bis 24 am Ende) – begleitet von einem „🔓 Neu freigeschaltet"-Banner.

**31 Level in 7 Kapiteln:**

| Kapitel | Level | Inhalt |
|---|---|---|
| Grundlagen | 1–6 | Wellenformen, Cutoff, Resonance, Attack/Release, Decay/Sustain, volle ADSR |
| Filter | 7–9 | Filter-Hüllkurve, Filtertypen, Sweep-Timing |
| Oszillatoren | 10–13 | Detune & Sub, Pulse Width, Noise Layer, Glide |
| Modulation | 14–17 | LFO → Pitch / Filter / Amp, Routing-Mix |
| Mixing & FX | 18–22 | EQ, Drive, Delay Time & Feedback, Reverb, Chorus & Bitcrush |
| **Legendäre Sounds** | 23–30 | feste, ikonische Zielklänge (siehe unten) |
| Meisterprüfung | 31 | Full Patch – alle Parameter, zufälliges Ziel |

**Kapitel „Legendäre Sounds"** – statt Zufall echte Klassiker mit fixem Zielklang:
Reese Bass (Kevin Saunderson, 1988) · 303 Acid Line (TB-303) · Supersaw Lead (JP-8000) ·
Fat Moog Bass (Minimoog) · Warm Analog Pad (Juno-106) · Bell Pluck · Wobble Bass · Noise Sweep.
Jedes mit Herkunft und Klangbeschreibung.

**Bedienung der Knobs:** ziehen = drehen · **Shift** = Feinjustierung · Mausrad · Doppelklick = Mitte · Pfeiltasten.

* Zielsound & eigener Sound jederzeit per A/B vergleichbar (Leertaste = Zielsound)
* Oszilloskop mit **WAVE**- und **SPEC**-Ansicht zeigt den Klang live
* Bewertung pro Regler: Wert-Bogen leuchtet grün (getroffen) oder rot (daneben), dazu Prozent-Score
* 1–3 Sterne je Level, Fortschritt lokal gespeichert, Level schalten sich frei
* Level-Auswahl ist eingeklappt (☰) – Fokus bleibt auf dem Instrument

### 2. Studio
* **Piano Roll** mit Loop, Skalen-Highlighting (Töne der gewählten Tonart sind hervorgehoben)
* **Aufnahme-Modi**: `Overdub` (Noten sammeln sich bei jedem Durchlauf), `Replace/Loop`
  (jeder Durchlauf überschreibt) und `Ab nächstem Loop` (Aufnahme startet erst auf Knopfdruck
  zum nächsten Takt-1) – so kann man im Flow Melodien "reinjammen"
* **Akkord-Baukasten** mit bekannten Progressionen: 1-5-6-4, 1-5-4-6, 50s Doo-Wop,
  Canon in D, La Folia, Andalusische Kadenz, Jazz ii-V-I, Lo-Fi, Epic Minor, Blues –
  in jeder Tonart, mit automatischer Begleitung
* **Drum Machine** mit 8 synthetisierten Pads (Kick, Snare, Clap, HiHats, Tom, Rim, Cowbell),
  Step-Sequencer bis 4 Takte, Presets (Four-on-the-Floor, Boom Bap, Trap, Amen, Afro 6/8, Techno)
  und kreativen Werkzeugen: **Euclidean Rhythms**, **Mutate**, **Humanize**, **Shift**
* **Sound-Design-Panel**: derselbe MONOLITH-24 wie im Trainer, hier mit allen Modulen frei

## MIDI-Keyboard (z.B. Nektar Impact LX)
Web MIDI wird unterstützt (Chrome/Edge). Nach „MIDI verbinden“:
* Tasten spielen den Synth, Anschlagsdynamik wird übernommen
* **Drum-Pads** (Noten 36–67, GM- und Nektar-Factory-Mapping) triggern die Drum Machine
  und nehmen bei laufender Aufnahme direkt ins Pattern auf
* **Mod-Wheel (CC1)** = Cutoff, **CC74** = Resonance
* Ohne Controller: PC-Tastatur `A W S E D F T G Z H U J`, Leertaste = Play/Stop

## Starten
```bash
cd app
npm install
npm run dev
```

## Roadmap
- [ ] Audio-Export (WAV/MIDI)
- [ ] Mehrere Spuren + Mixer mit Sends
- [ ] Projekt speichern/laden
- [ ] Sample-Import für die Drum Pads
- [ ] Optionaler Desktop-Wrapper mit echtem VST3-Hosting
