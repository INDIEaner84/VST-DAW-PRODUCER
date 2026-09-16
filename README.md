# VST-DAW-PRODUCER

Eine innovative Browser-DAW, die Sound-Design **spielerisch beibringt** und Komponieren
in den Flow bringt. Läuft komplett im Browser – keine Installation, alles Open Source
(React + TypeScript + [Tone.js](https://tonejs.github.io), MIT).

## Zwei Modi

### 1. Ear Trainer (Syntorial-Prinzip)
Du hörst einen Zielsound und baust ihn am Synth nach. Pro Level kommen neue Parameter dazu:

| Level | Thema | Neu freigeschaltet |
|---|---|---|
| 1 | Wellenformen | Saw / Square / Triangle / Sine |
| 2 | Filter Cutoff | Cutoff |
| 3 | Resonance | Resonance |
| 4 | Attack & Release | Amp-Hüllkurve |
| 5 | Decay & Sustain | volle ADSR |
| 6 | Filter-Hüllkurve | Env Amount, F-Attack, F-Decay |
| 7 | Filtertypen | Lowpass / Highpass / Bandpass |
| 8 | Detune & Sub | Detune, Sub-Oszillator |
| 9 | Equalizer | EQ Low / Mid / High |
| 10 | FX | Drive, Delay, Reverb |

* Zielsound & eigener Sound jederzeit vergleichbar (▶ Buttons)
* Bewertung pro Regler: grün = getroffen, rot = daneben, Prozent-Score
* 1–3 Sterne je Level, Fortschritt wird lokal gespeichert, Levels schalten sich frei

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
* **Sound-Design-Panel**: derselbe Synth wie im Trainer – Gelerntes direkt anwenden

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
