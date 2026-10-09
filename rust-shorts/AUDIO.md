# Rock Bottom: audio

Every episode's soundtrack (score + sound effects) is synthesized by [tools/music.mjs](tools/music.mjs) from a cue sheet, `episodes/epN/cues.json`. Everything is built from oscillators, noise, filters, envelopes, reverb and delay: no samples, no downloads, no game audio and no voices. Breaths, yawns, sighs, snores and yelps are instrumental gestures (flute, muted trumpet, bassoon, slide whistle).

```sh
node tools/music.mjs --ep=1            # episodes/ep1/cues.json -> episodes/ep1/soundtrack.wav (3-7 s)
node tools/music.mjs --all             # all episodes in parallel (~11 s) + a summary table
node tools/music.mjs --ep=1 --report   # + each cue's margin over the bed (phone band), loudness curve, spectrum
node tools/music.mjs --list            # every music style and cue type with its params
node tools/music.mjs --ep=2 --cues=try.json --out=try.wav   # render a variant cue sheet somewhere else
node tools/music.mjs --audition=zap,boing --out=/tmp/a.wav   # sounds alone: level, spectrum, a WAV to listen to
```

Output: 48 kHz, 16-bit, stereo, exactly `duration` seconds, mastered to **-14 LUFS integrated, true peak <= -1 dBTP**. After writing, the tool measures the file with ffmpeg's `ebur128` filter and prints integrated loudness, true peak and LRA (it re-masters automatically if ffmpeg disagrees). `render.mjs --ep=N --encode` already muxes `episodes/epN/soundtrack.wav`.

## Retiming

Move a cue's time (or a section's `t0`/`t1`) in `cues.json` and re-render. Each cue is reseeded from its own type and params, so moving one sound never changes another. Rules of thumb:

- A cue's `t` is its hit (the transient). A few cues reach slightly before `t`: `whoosh` with `shape: "rise"` swells *into* `t + dur`, and `minigun` `brrrt` spins up `pre` s before it fires at `t`. `rimshot`'s `t` is the "TSS", with the "ba-dum" before it.
- Use `--report` after a retime: a cue flagged `<-- under the bed` is buried by the music. Lower the section (`gain`), add a `thin` window to the section, or raise the cue (`gain`, `duck`).
- Section times are free: notes start only inside `[t0, t1)`, so shrinking a section drops notes rather than squashing them. `origin` pins the tune's bar-1 downbeat, so keep it on the grid (120 BPM: beat 0.5 s, bar 2 s).

## cues.json

```jsonc
{
  "title": "Friendly?", "duration": 28, "bpm": 120,
  "loop": true,                       // Ep. 1 and Ep. 4: rendered on a circle (below)
  "mix": { "music": -3, "amb": 0, "sfx": 0 },   // optional bus trims in dB (these are the defaults)
  "sections": [ { "name": "S1 suspended", "t0": 2, "t1": 4.5, "style": "suspend", "key": "D", ... } ],
  "cues": [ [1.4, "thunk", { "soft": true }], [24.5, "akbang"] ]
}
```

**Section params (all styles):** `gain` dB; `fadeIn` / `fadeOut` s; `cut: true` (a dead stop at `t1` that also gates the reverb tail until the next section starts); `key` (`"G"`, `"Dm"`, `"F#m"`); `origin` (time of the tune's bar-1 downbeat); `bars` (which bars of the signature tune to play, 0-3); `thin: [[a, b], ...]` (melodic layers rest in these windows so a gag reads); `tail` s (default 4, how long notes may ring past `t1`).

**Cue params (all types):** `gain` dB; `pan` -1..1 where it applies; `duck` dB (how far the music dips under this cue; the default comes from its category: hit 6, fx 3, soft 1.5, music 1, amb 0); `dur` for anything with a length.

**Loops (`"loop": true`).** The episode is rendered on a circle, so nothing has to be faked at the seam. Anything past `duration` (a reverb tail, a ringing note, an ambience bed, a section with `t1 > duration`) is folded back onto t = 0, and `t0 < 0` means "started in the previous lap". A bed that covers the whole lap crossfades its own overhang onto its start. Ducking, the compressor and the limiter run circularly too. So the last sample flows into the first with the same bed and no click; on the first play, t = 0 already carries the bed. Ep. 1's drone is one section from 25.0 to 30.0 (`"t0": -3, "t1": 2`). Ep. 4's marimba vamp (17-20) rolls up into the theme's downbeat at 0.0, and its forest bed runs 17 -> 32 (that is, to 12.0).

## The signature: the Naked's whistle

An original 4-bar tune in G major (whistle range G5-E6). The hook is the dotted "da-di-DAA" climbing to the fifth:

```
pickup D | G.  A  B -   D  B  G - | A.  B  A  F#  D - - (D) | G.  A  B -   E  D  B - | C  A  F#  A  G - - - |
           I                        V            V7           I           vi          ii    V7    I
```

Bars 1-2 end open on the dominant; bars 3-4 reach the high E and come home. Every episode quotes it:

- **Ep. 1:** his whistle is the warm theme (6-10). The music box plays bar 3 as the lullaby. The sweetest reprise (19-22) is cut dead on its last note at 22.0.
- **Ep. 2:** his cocky riff (a swaggering clarinet, 13-16.5) rests for the owner's sneaky beeps and the knuckle cracks.
- **Ep. 3:** the western standoff whistle, in A minor. The solo violin's romance (21-25) is cut off by the BANG. The goofy polka hop (26-28).
- **Ep. 4:** the bouncy marimba theme across the loop.
- **Ep. 5:** the lounge vibraphone (14-16), then his "innocent whistle" at 19.5, which falls off as the rockets launch.

The owner (the Chad) gets a deadpan walking bass in D minor (Ep. 2).

## Mix and master

- **Buses:** music (sections), ambience (beds), sfx (cues, incl. musical stingers). Each has room and hall reverb sends (ambience shares the SFX reverb) plus a ping-pong delay (dotted 8th).
- **Ducking:** the music dips under every cue by its category (hit -6 dB, fx -3, soft -1.5, music stingers -1); ambience dips half as much. `cut` sections gate the music bus until the next section.
- **Master:** 30 Hz high-pass, -2 dB below 90 Hz and above 8.5 kHz, 16 kHz low-pass (headroom, no harsh highs). Then normalise to -20 LUFS, a gentle stereo-linked compressor, and a gain search into a look-ahead true-peak limiter (4x oversampled, ceiling -1.4 dBTP) until integrated loudness is -14.0. TPDF dither to 16-bit. Non-loop episodes get a 2 ms fade-in and a 40 ms fade-out at the cut.
- **Phones:** every hit carries its punch at 300 Hz-3 kHz (AK BANG, eoka BANG, boom, door clang, heartbeat knock), not in the sub. `--report` measures each cue against the bed in a 350 Hz-7 kHz "phone band". Mono sum loses <= 0.6 dB.

## Where the cue sheets differ from the scripts (by design)

- **Ep. 2:** the zaps are 50 ms after the error buzz (2.05, 5.05), so the buzz reads first. The wah-wah fall starts at 5.1 and lands with the boing (5.75). The ta-da is at 10.05, so the jaw-drop slide whistle moves to 10.42 with its "clunk" at 10.74 (they collided at 10.2). The bwomp is at 23.5 so it ends on the cut at 24.0.
- **Ep. 3:** the rimshot's "TSS" is at 27.8 (28.0 is the last frame). The strike, BANG, PING and triumphant stab at 20.4 are spread 20.36 / 20.44 / 20.5 / 20.62, with the thud at 20.72 and KO tweets at 20.85. The owl moves to 12.3 and the second feeble scrape to 13.1, so they don't overlap.
- **Ep. 4:** the boing on the first THOCK is at 0.56 (so the THOCK's transient leads), the uh-oh at 13.75, the lone cricket at 13.25 (after the clang has rung down) and the sling at 14.15.
- **Ep. 5:** the eureka sting is at 5.85 (after the ding), the clothing layers enter at 6.45 / 7.3 / 8.5 (just after each garment), and the smoke hiss starts at 22.0, after the boom's body. The bwomp is shortened to 0.35 s to finish before the cut.
- **Extras:** a quiet hatch slide at 13.6 in Ep. 2 helps the dramatic irony read, and a soft snore continues under the tiptoeing in Ep. 1.

## Music styles

| style | what / params |
|---|---|
| `drone` | low tense drone + heartbeat bass. key = pedal (D); hb = beats per heartbeat (1; 0 off) |
| `suspend` | suspended sus4 chord on key (D), tremolo strings swelling; heartbeat every 2 beats until hbUntil |
| `theme` | warm main theme: the whistle over plucked strings. key (G), origin (bar-1 downbeat), bars ([0,1]), lead (whistle|flute|clarinet) |
| `lullaby` | music-box lullaby over a rocking harp. key (G), origin, bars (signature bars; [] = chords only), prog [[beat, degree]] |
| `sneaky` | sneaky pizzicato: creeping chromatic pizz bass on the beat + tiptoe pizz on the off-beats. key (Em) |
| `suspense` | held suspense: a high trembling string rub over a soft low pizz pulse, growing. key (Em) |
| `tender` | soft tender chord: strings + two celesta notes. key (G), chord (IVmaj7) |
| `reprise` | sweetest reprise: strings swell + harp glissando, rocking harp, then the whistle from origin. key (G), origin, bars |
| `heist` | sneaky pizzicato heist theme (Dm): staccato pizz tune with rests, pizz bass, soft brushes. accent: chord hit at t0. thin rests the tune |
| `walkbass` | the Chad's walk: upright bass walking quarters (Dm). swagger: finger snaps on 2 and 4 + a muted-trumpet growl each bar; double: a deadpan staccato bassoon an octave up |
| `cocky` | the Naked's cocky riff: the signature on a swaggering clarinet over pizz bass + snaps. key (D), origin, bars, thin |
| `western` | western standoff: twangy guitar with echo, the whistle (signature in minor), low string drone, a brass accent on the first downbeat (accent: false to drop it). key (Am), origin, bars |
| `bassoon` | comic bassoon line in minor: plodding staccato, its first note sags (deflating). key (Am), origin, thin |
| `organ` | gentle prayer organ chords. key (C), prog (degrees spread evenly over the section) |
| `timelapse` | sped-up pizzicato "time passes" arpeggio loop that slows over slow [a, b] (rate0 -> rate1 notes/s). key (C), prog |
| `sunrise` | warm sunrise chord: strings + horns swell, harp glissando, glockenspiel shimmer. key (C), chord (I) |
| `drums` | tense drums. pattern taiko (16th-note toms, locks to the heli rotor) | build (timpani crescendo, toms + snare roll into t1). key: drone note |
| `romance` | swooning romance: lush strings, triplet harp, a solo violin sings the signature. key (F), origin, bars |
| `polka` | polka: tuba oom, accordion pah + off-beat snare, xylophone + clarinet tune. variant hop (the signature) | chase (running arpeggios). key (F), origin |
| `marimba` | bouncy marimba theme: the signature on marimba over a bouncy bass, woodblock and shaker; vamps before origin and rolls up into it. key (F), origin, bars |
| `ominous` | ominous low: tuba/contrabass drone, low brass swelling, timpani on the beat growing. key (Cm), hit (a low "dun" at t0) |
| `tension` | rising tension: tremolo strings climbing, timpani roll and noise riser into t1 (use cut for a hard stop). key (Cm), rise (semitones) |
| `layers` | tension that adds a layer at each time in adds: 8th pulse -> hats -> string ostinato -> brass + snare + riser. key (Em) |
| `release` | relieved chord: a soft swell with a harp roll that settles. key (G), chord (Iadd9) |
| `funk` | funky bass-and-clap groove (E dorian): slap-ish 16th bass, claps on 2 and 4, kick, hats, e-piano stabs. key (Em), origin |
| `lounge` | relaxed lounge: e-piano maj7 chords, walking upright, brushes, vibraphone plays the signature. key (G), origin, bars |
| `tiptoe` | tiptoe pizzicato: staccato pizz steps on the 8ths over a low pizz bass, a bassoon creeping. key (Em) |

## Cue types

All take `gain` (dB) and `duck` (dB). `[cat]` sets the bus and default duck.

**Ambience beds (amb bus, no duck; `dur`, `level` automation, `fadeIn`/`fadeOut`)**

| type | cat | what / params |
|---|---|---|
| `waves` | amb | beach waves: swell, break and foam on a period (s, default ~4.5, fits the loop). dur, level [[t, dB]] |
| `wind` | amb | soft wind with slow gusts and a faint whistle. dur, gust (0..1), level |
| `birds` | amb | distant birdsong, random calls. dur, density (calls/s), kind (meadow|forest), level |
| `forest` | amb | forest bed: songbirds + soft leaves. dur, density, level |
| `crickets` | amb | evening crickets (n of them, each chirping on its own period). dur, n, level |
| `fire` | amb | campfire: low flicker roar + crackles and pops. dur, level |
| `rotor` | amb | patrol-heli rotor: blade thumps on 16ths (8/s) + turbine whine + tail buzz. dur, level/pitch/pan/lp [[t, v]] automation (episode time) |

**Creatures**

| type | cat | what / params |
|---|---|---|
| `cricket` | soft | one lone cricket chirp (an awkward-silence gag). pan |
| `seagulls` | soft | a few distant seagull calls ("kee-ow"). n, dur (spread), pan |
| `owl` | soft | owl hoots "hoo... hoo-hoo" (distant). n (2-3), pan |
| `wolf` | soft | a distant wolf howl (2 s). pan |
| `oink` | fx | boar oinks: nasal grunts. n (2), pitch (1), pan |
| `trot` | soft | hoof steps: trot (pairs) or gallop (triplets). dur (1.0), gallop (bool), rate (patterns/s), pan |
| `cluck` | soft | chicken clucks "buk-buk-buk-BAAK". n (4), pan |
| `squawk` | fx | chicken squawk + wing flaps + feather flutter. pan |
| `crow` | fx | rooster crow "er-er-er-errrr" (buzzy nasal bird). pan |

**Tools, doors, code lock**

| type | cat | what / params |
|---|---|---|
| `thock` | hit | rock "thock" on wood: hollow knock + click + low thump, with wood chips. pitch (1), chips (0..1), pan |
| `knock` | fx | dull bark thud on a trunk (after a miss). pitch, pan |
| `thunk` | fx | rock drops on something: dull thud + rock click (+ dirt). soft (a foot: fleshier), pitch, pan |
| `clang` | hit | rock on a metal facemask: bell-like ring with a long decay, the dented wobble. pitch, ring (decay x), wobble (0..1), pan |
| `whiff` | fx | a swing that misses: fast air swish. dur (0.22), pan |
| `creak` | fx | stick-slip creak (door hinge, or a metal creak). dur (0.9), f0 -> f1 (slip rate Hz), tone (wood|metal), pan |
| `doorclang` | hit | heavy armoured door slam: low boom, steel-plate ring, rattle, then the lock click (+lock s). pan |
| `hatch` | fx | armoured-door hatch slide "shk" (open), or shut with a clack (shut: true). pan |
| `beep` | fx | keypad beep. pitch (MIDI, 88), dur (0.09), soft (quiet sneaky beep), pan |
| `buzz` | fx | error buzz "ERRT". dur (0.34), small (a quiet ominous bzzt), pan |
| `chirp` | fx | success two-tone chirp (up). pitch (MIDI of the first tone, 88) |
| `zap` | hit | code-lock ZAP: electric crackle + buzz on each flash; size small|big|mega (mega adds thunder). flashes [s after t], pan |
| `hiss` | soft | smoke hiss. dur (1.0), pan |

**Guns, explosives, helicopter**

| type | cat | what / params |
|---|---|---|
| `scrape` | fx | eoka strike: gritty rock-on-metal scrape + spark fizzle. dur (0.16), fizz (0..1), pan |
| `click` | fx | dry eoka "click" (nothing happens). pan |
| `tick` | soft | tiny high ticks (a wristwatch). n (2), gap (0.25), pan |
| `eokabang` | hit | eoka BANG: a dry crack with a pipe ring and a puff of smoke. pan |
| `ping` | fx | ricochet PING "pyeeew" off metal. pan (start), dir |
| `rack` | fx | AK charging-handle rack "shk-CHAK". pan |
| `clack` | fx | metallic gun-handling clack (picking up / setting down a rifle). pan |
| `akbang` | hit | AK BANG with outdoor echo. pan |
| `minigun` | hit | heli minigun. mode brrrt (fire for dur, spinning up `pre` s before t) | spinup | spindown. dur, pre, far (0..1), pan |
| `rocket` | fx | rocket launch whooshes. n (4), gap (0.09 s), pan |
| `boom` | hit | explosion BOOM: sub thump + mid crunch + crack + debris rumble. size far|mid|big, pan |
| `arming` | fx | rocket-arming beeps: accelerating and rising. n (6), dur (0.5) |
| `scan` | fx | rising scanner sweep with a scan-line flicker. dur (1.4), pan |
| `nottarget` | fx | dismissive two-tone "not a target" (high -> low, the low one sags). pitch (MIDI, 81) |
| `lockon` | fx | fast lock-on beeps accelerating into a held tone. dur (0.5), pitch (MIDI 95) |
| `heliwhoosh` | fx | heli swings round: big Doppler air whoosh with rotor chop. dur (0.9), dir (+1 L->R), pan |
| `whir` | fx | heli turbine whir rising. dur (1.0), pan |
| `clunk` | fx | heavy relay "ka-CHUNK" (searchlight on), with a short electric hum. pan |

**Character gestures (instrumental, never voices)**

| type | cat | what / params |
|---|---|---|
| `snore` | fx | rhythmic snoring on the beat: a buzzy reed rattle in, a soft flute "fwee-oo" out. dur, period (1.0 s), pitch (1), pan |
| `yawn` | fx | instrumental yawn: a trombone sliding up then sagging down, wide vibrato. key, pan |
| `sigh` | fx | instrumental sigh: a breathy flute falling away + a puff of air. mood relief | tired | sad, double (two sighs: flute + bassoon), key, pan |
| `munch` | fx | cartoon munching: crunchy chews with a cheek "mf". dur (1.2), rate (chews/s, 4), pan |
| `canpop` | fx | tin can opening: tab click, pressure hiss and a pop. pan |
| `clink` | soft | spoon on a tin can: small metallic clinks. n (1), every (s, 0.5), pitch (1), pan |
| `clatter` | fx | something tossed clattering to a stop: kind can (tin) | wood (the eoka on gravel). n (bounces, 4), pan |
| `steps` | soft | footsteps every `every` s for dur: kind boot (heavy boots) | heavy | run | bare. n overrides dur. pan |
| `tiptoe` | soft | tiptoe plucks: two-note pizzicato steps every `every` s (0.25) for dur. key (section key), pan |
| `rub` | soft | hands rubbing (back and forth). dur (0.6), rate (7), pan |
| `grab` | soft | a quick grab: swish + a solid closing "tock". pan |
| `pat` | soft | a muffled pat on the ground (sad). pan |
| `sling` | soft | gun slung onto a back: strap swish + metal jingle + a thump. pan |
| `crack` | soft | knuckle cracks. n (3), gap (0.16), pan |
| `puff` | soft | dusting / blowing puffs: soft air bursts with a cloth pat. n (1), gap (0.3), pan |
| `blow` | soft | blowing into the barrel: a breathy hollow pipe tone. dur (0.45), pitch (MIDI 67), pan |
| `yelp` | fx | instrumental yelps: squeaky-toy up-glides "eep!". n (3), gap (0.4), pitch (MIDI 84), pan |
| `wobble` | soft | trembling wobble: a quivering flexatone-like tone (a shaky hand). dur (0.8), pitch (MIDI 79), pan |
| `squeak` | soft | snot-bubble squeak: a rubbery inflate then a little deflate. dur (0.7), pan |

**Cartoon**

| type | cat | what / params |
|---|---|---|
| `pop` | soft | bubble pop (speech bubble, flower, a music note). pitch (1), pan |
| `boing` | fx | cartoon spring boing. pitch (1), dur (0.7), pan |
| `bonk` | fx | cartoon bonk: a woodblock knock + a falling "boink" (metal: on a facemask, adds a small ring). pan |
| `slide` | fx | slide whistle. from -> to (MIDI), dur, shape glide | huh (down-up "huh?") | wiggle, fade (gets quieter, flying away), pan |
| `ding` | fx | lightbulb ding (bright bell + a fifth echo). pan |
| `sparkle` | soft | sparkle chime: a rising glockenspiel twinkle + shimmer. key |
| `shootingstar` | fx | shooting-star whoosh: a falling whistle across the sky + glittery trail. dur (0.9), dir |
| `kiss` | fx | cartoon kiss chirp: a smack + a quick rising chirp. pan |
| `love` | fx | heart / love chime: harp glissando up a maj7 + warm celesta chord + shimmer. key |
| `heartbeat` | fx | heartbeat thumps (lub-dub) at bpm for dur, getting louder. dur (1.5), bpm (100) |
| `whoosh` | soft | air whoosh (swing, toss, dash, clothes flying). dur (0.35), pitch (1), dir, shape swing | rise (a wind-up that swells into the next hit), pan |
| `zip` | fx | zipper "zzzrip". dur (0.32), pan |
| `fwump` | soft | soft cloth "fwump" (a hat going on). pan |
| `swish` | soft | cloth swish (pulling on pants). dur (0.25), pan |
| `thud` | fx | body / object thud on the ground. weight (1), pan |
| `faceplant` | fx | faceplant: a thud + a dull slap + a dust puff. pan |
| `boop` | soft | soft round "boop" (a pat on the rock, a head pat). pitch (MIDI, default the key's 5th), pan |
| `chime` | fx | warm chime: mood aww (falling celesta + harp + a soft swell) | ooh (rising glock + shimmer). key |
| `tink` | soft | tiny metallic ting (eye glint, sunglasses, a rock tap). pitch (MIDI 100), ring (1), glint (adds a shimmer), pan |
| `respawn` | fx | soft respawn chime: a rising celesta arpeggio over an airy swell. key |
| `clap` | fx | a single palm clap / handshake slap. pan |
| `pip` | soft | tiny cute blip (a peek); q: rising like a "?". pitch (MIDI 91), pan |
| `twinkle` | soft | high "ting-ting-ting" twinkles (KO stars), repeating for dur. dur (0.3) |
| `tweets` | fx | cartoon KO birds: "tweet-tweet" chirps circling the head (auto-pan). dur (1.5) |

**Musical stingers (tuned to the section key unless `key` is given)**

| type | cat | what / params |
|---|---|---|
| `sting` | music | "!" pizzicato sting: a sharp tense pizz cluster + xylophone plink + low "dun". key |
| `stab` | music | orchestral stab: mood zap (dissonant cluster) | triumph (major chord + timpani + cymbal) | shock. key |
| `crash` | music | cymbal crash. decay (1.8) |
| `dun` | music | low "dun": mood sly (pizz + bassoon, a sly slide up) | tense (low brass + timpani). key, note |
| `wahwah` | music | sad trombone "wah-waaah" falling (harmon-muted). key, n (2) |
| `clarinet` | music | smug clarinet lick (0.4 s): a quick run up, a trill and a sly scoop. key |
| `tada` | music | mocking brass "ta-DAAA" (V -> I, the long chord sags at the end). key |
| `reveal` | music | sneaky reveal sting: two low pizz notes and a muted trumpet "hmm?" rising. key |
| `eureka` | music | eureka sting: harp glissando up + glockenspiel + a bright brass chord. key |
| `uhoh` | music | bassoon "uh-oh": two notes down a minor third. key |
| `heh` | music | smug muted-trumpet "heh-heh" (harmon mute wah). key |
| `aah` | music | short heavenly synth-choir "aah" chord (a halo), with a glockenspiel glint. key, dur (0.9) |
| `grr` | music | low brass growl (flutter-tongue tuba) "grrr". dur (0.6), key |
| `bwomp` | music | deflating tuba "bwomp": a low note that sags and wobbles away. note (MIDI, default the key's 5th below), dur (0.7) |
| `rimshot` | music | rimshot "ba-dum-TSS": t is the TSS. lead (s before t for ba, 0.25; 0 = only dum-TSS), pan |
| `piano` | music | one high piano note ringing in the silence. note (MIDI 94) |
| `whistle` | music | the Naked's whistle (signature tune). key (G), bars ([0]), len (s: stop early), innocent (softer, a little shaky), fall (last note falls off) |
