# YouTube Shorts brief: wordless animated Rust-parody mascot series (as of 9 Oct 2026)

**Recent changes that shape the advice below:**
- Shorts can run up to 3 minutes ([YouTube Help](https://support.google.com/youtube/answer/15424877)).
- Every start and every replay now counts as a public view. This began for Shorts on 31 Mar 2025 and for all formats on 24 Aug 2026. Pay is still based on "engaged views" ([TechCrunch](https://techcrunch.com/2025/03/26/youtube-is-changing-how-youtube-shorts-views-are-counted), [PPC Land](https://ppc.land/youtube-counts-views-from-the-first-frame-across-all-formats-on-august-24/)).
- New in 2026: custom Shorts thumbnails (July), Shorts series (23 Sep) and Posts recommended inside the Shorts feed.
- Partner Program (YPP) thresholds for Shorts double on 1 Feb 2027 (details in section 7).

## 1. Length
- **YouTube's position:** there is no favoured length. Shorts lead Todd Sherman said to use the length the story needs, and that posting more Shorts doesn't buy reach ([TechCrunch](https://techcrunch.com/2023/08/25/youtube-demystifies-the-shorts-algorithm-views-and-answers-other-creator-questions/)). When 3-minute Shorts launched, YouTube said it would improve how it recommends them "over time" ([SEJ](https://www.searchenginejournal.com/youtube-extends-shorts-to-3-minutes-adds-new-features/529177/)).
- **The data favours short.** quso.ai looked at 108,138 Shorts that had been live at least 14 days (June 2026). Median views by length ([quso.ai](https://quso.ai/research/youtube-shorts-length)):

| Length | Median views |
|---|---|
| 11–20 s (peak) | 901 |
| 21–30 s | 542 |
| 31–45 s | 347 |
| 46–60 s | 188 |
| 90 s+ | 51 |

- Metricool's 2026 study puts the average Short watch at about 16 s ([Metricool](https://newsletter.metricool.com/p/still-trying-to-figure-out-youtube)). That figure is partly an artefact of counting every start as a view.
- **Verdict:** 15–35 s is still the sweet spot for single-gag skits; aim for 18–30 s.
  - Use 35–60 s only for a three-beat escalation.
  - Go past 60 s only with 100% original audio. Any active copyright claim on a Short over one minute blocks it worldwide, and Shorts audio-library songs are capped at 90/60/30 s inside long Shorts ([YouTube Help](https://support.google.com/youtube/answer/15424877)).
- **Loops:**
  - Replays raise the public view count. Engaged views are defined as "not including any loops" ([Help](https://support.google.com/youtube/answer/12220281)), and engaged views are what drive revenue ([Help](https://support.google.com/youtube/answer/12504220)).
  - YouTube hasn't published how loops weigh in recommendations. Jenny Hoyos's teardown calls re-watching "a big virality signal" ([Demand Curve](https://www.demandcurve.com/newsletters/growth-newsletter-187)).
  - Earn rewatches; don't trick viewers into them.

## 2. Hook (first 1–2 seconds)
- Jenny Hoyos on YouTube's own blog: "you have one second to hook someone, especially on Shorts" ([YouTube Blog](https://blog.youtube/creator-and-artist-stories/youtube-shorts-deep-dive/)).
- The number to watch is Studio's **"How many chose to view"** (viewed vs. swiped away) ([Help](https://support.google.com/youtube/answer/12942217?co=YOUTUBE._YTVideoType%3Dshorts)).
- **Always cold open.** Frame 1 should already show the mascot, what it wants, and the threat, in one readable composition. Examples: naked on the beach holding a rock while a geared player runs in; hammering a metal door; a bear behind the furnace.
  - Motion starts immediately. No logo, no title card, no fade-in.
  - Start mid-action and let the picture explain the situation ([Demand Curve](https://www.demandcurve.com/newsletters/growth-newsletter-187)).
- **Lead with sound.** Google's Shorts guidance says "Announce yourself with audio," "Be unavoidable" and "Use tight framing" ([Google ABCDs](https://services.google.com/fh/files/misc/formarketingshortsabcdsonesheeters.pdf)). A creator featured by YouTube describes a good hook as "eye-catching visuals, tone of voice, pace, and sound effects" ([YouTube Blog](https://blog.youtube/creator-and-artist-stories/cracking-the-code-to-youtube-shorts-part-2/)).
- **Watercolour caution** (my craft advice):
  - Soft edges and close tones blur at phone size and under compression.
  - Give the mascot and key props stronger outlines and tonal contrast, and keep the washes behind the action quiet.
  - Check an unlisted upload for colour banding.

## 3. Retention and loop endings
- Land a new beat every 2–4 s: setup, complication, escalation in threes, twist. Remind viewers of the goal midway; Hoyos restates the premise just before the payoff.
- Put the punchline in the last 1–2 s, then cut. No outro or end card: lingering after the peak costs rewatches ([Demand Curve](https://www.demandcurve.com/newsletters/growth-newsletter-187)).
- **Seamless loops:**
  - Rust gives you a built-in loop: death leads to respawning on the beach, which is your opening shot.
  - Other options: a door closing that matches a door opening at the start; the same camera position at both ends; music cut to whole bars so the downbeat lands on frame 1.
- Don't cut mid-joke to force replays. YouTube's July 2026 monetisation clarification targets "emotionally manipulative formulas" ([Tubefilter](https://www.tubefilter.com/2026/07/13/youtube-inauthentic-content-monetization-policy-update/)).
- **Diagnose:** the swipe rate tells you about the hook; dips in the retention curve show where the middle sags. Compare like with like ([Help](https://support.google.com/youtube/answer/12942217?co=YOUTUBE._YTVideoType%3Dshorts)).

## 4. Vertical framing at 1080×1920
- **There is no official spec for organic Shorts overlays.** Google's official vertical safe-zone template for ads is the conservative reference ([Google Ads Help](https://support.google.com/google-ads/answer/13547298)). I measured these margins from Google's downloadable PNG:
  - top 288 px, bottom 672 px, left 48 px, right 192 px
  - that leaves a safe box from x 48–888 and y 288–1248 (840×960).
- **What the app covers on organic Shorts:**
  - **Top:** phone status bar, search and menu icons.
  - **Right edge, mostly the lower half:** like, dislike, comment, share, remix and sound buttons.
  - **Bottom:** avatar, @handle, Subscribe button, 1–2-line title, hashtags, related-video link, sound credit, comment preview ([SEJ](https://www.searchenginejournal.com/youtube-extends-shorts-to-3-minutes-adds-new-features/529177/)), progress bar, then the app's nav bar.
  - Third-party estimates range from 120/300/96 px for top/bottom/right ([Postplanify](https://postplanify.com/tools/youtube-shorts-safe-zone-checker)) up to Google's numbers. Long titles and comment previews push the bottom block higher.
- **My recommended working grid:**
  - Keep faces, the punchline and any text inside Google's box.
  - Put the mascot's eyes around y 600–950, slightly left of centre.
  - Bodies and motion can extend down to about y 1450 and across x 40–900.
  - Treat the bottom ~450 px and the right ~190 px below mid-height as background only.
  - Place text labels at about y 300–500.
  - Check with an unlisted upload on two different phones.
- **Thumbnails get cropped:** Rene Ritchie (YouTube's creator liaison) says Shorts thumbnails don't display at 9:16 everywhere, so keep key art away from the edges ([PPC Land](https://ppc.land/youtube-ends-2-year-wait-for-shorts-thumbnails-but-blocks-a-b-testing/)).

## 5. On-screen text
- The picture should carry the joke; test every episode with the sound off.
- A 2–4-word label at the top of the safe box ("First night", "Door camper") makes the premise land instantly and doubles as cover-frame text. Google advises "consider using text overlays" for Shorts ([Google Ads Help](https://support.google.com/google-ads/answer/16041697)). Use one line, and never subtitle the whole skit.
- Some places preview videos muted. Home-feed inline previews play muted with captions ([Technipages](https://www.technipages.com/how-to-disable-muted-playback-in-feeds-in-youtube-on-android)).
- **Accessibility:**
  - Upload a caption track with bracketed sound cues such as "[door lock beeps]" or "[bear roars]". Many of your gags live in sound effects, and YouTube built sound-effect captions for exactly this reason ([Google Research](https://research.google/blog/adding-sound-effect-information-to-youtube-captions/)).
  - Keep explosions and muzzle flashes under three flashes per second ([WCAG 2.3.1](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html)).

## 6. Audio
- Sound matters. Google says sound in Shorts ads raises conversions "by over 20%" and recommends "sound-on" assets ([Google Ads Help](https://support.google.com/google-ads/answer/16041697)).
- **Prefer original audio over trending sounds:**
  - Licensed or Content ID-claimed music cuts your share of the creator revenue pool: one track halves it, two tracks leave a third ([Help](https://support.google.com/youtube/answer/12504220)).
  - Stock libraries that register their music with Content ID can count as music too. Epidemic Sound, for example, puts "Shorts claims" on Shorts that use its catalogue ([Epidemic](https://help.epidemicsound.com/hc/en-us/articles/26251656597650-Types-of-Copyright-Claims-on-YouTube)). Any claim blocks a Short over 60 s.
  - YouTube's own Audio Library "won't receive a Content ID claim."
  - Commission a signature theme and use original or cleared sound effects.
  - Leave audio remixing on: Shorts made with your audio credit you and link back to your video ([Help](https://support.google.com/youtube/answer/10623810)).
  - Use trending sounds occasionally. Jordan Howlett on YouTube's blog: "Trends are fantastic, especially for a newer creator," but don't rely on them alone ([YouTube Blog](https://blog.youtube/creator-and-artist-stories/five-tips-to-master-shorts/)).
- **Loudness:** YouTube turns uploads louder than about −14 LUFS down and never turns quiet ones up. YouTube doesn't publish this target; it comes from third-party measurement ([Youlean](https://youlean.co/?p=30813), [Production Advice](https://productionadvice.co.uk/stats-for-nerds/)).
  - Master to about −14 LUFS integrated, with true peak at or below −1 dBTP.
  - Don't open quietly.
  - Check the mix on a phone speaker and keep the punch in the mids.
- **Muted viewing:** the Shorts feed is sound-on, but the story must survive with the sound off. Sound adds timing and the final punch.

## 7. Series strategy
- **Recurring cast:** the mascot plus one recurring foil (a bear, a geared rival, the neighbouring clan). Creators featured on YouTube's blog credit mini-series, recurring characters and a repeated signature gag for building a loyal audience ([Jan 15](https://blog.youtube/creator-and-artist-stories/cracking-the-code-to-youtube-shorts/), [Jan 22, 2026](https://blog.youtube/creator-and-artist-stories/cracking-the-code-to-youtube-shorts-part-2/)).
- **Each episode must stand alone.** YPP allows "a series following a set of characters across episodes" with distinct storylines. It does not allow characters facing "the same situation over and over again with the same outcome" ([Help](https://support.google.com/youtube/answer/1311392)).
- **Opening sting:** build it into the first second (a 0.3 s sound logo plus a signature pose on the hook frame), not a separate card. YPP allows a common intro if the rest of each video varies.
- **Shorts series (launched 23 Sep 2026)** ([Help](https://support.google.com/youtube/answer/16590581)):
  - Convert a Shorts-only playlist with "Add show features" and choose "non-serial" so episodes can be watched in any order.
  - Viewers get a "Watch series" button with next/previous navigation, and series can appear in Search, "Recommended shows" and "Continue watching."
  - TechCrunch reports the rollout is to YPP creators ([TechCrunch](https://techcrunch.com/2026/09/23/youtubes-new-short-series-feature-brings-episodic-viewing-to-shorts/)).
  - Start a "Season 1" playlist now.
- **Titles:**
  - Put the premise first and the episode number last, e.g. "Bean vs the door camper | Rust cartoon Ep. 7." The series feature numbers episodes automatically.
  - Keep titles to 40–60 characters and include the premise and "Rust".
- **Related video:** link each Short to the next episode or to a compilation. This needs advanced features turned on ([Help](https://support.google.com/youtube/answer/14075157)).
- **Cadence:**
  - YouTube asks for "a consistent, sustainable release schedule," and suggests making Shorts in batches and saving them as drafts ([Help](https://support.google.com/youtube/answer/13616979?co=YOUTUBE._YTVideoType%3Dshorts)).
  - Metricool found 2–4 Shorts a week gives the best results for the effort.
  - Plan 2–3 fixed days a week, keep a 4–6-episode buffer, and reuse rigs and backgrounds.
- **Hashtags:**
  - Use 3–5. Up to three show next to the title; with more than 60, all are ignored; unrelated tags risk removal ([Help](https://support.google.com/youtube/answer/6390658)).
  - Use #rustgame or #playrust, because #rust is also the programming language.
- **Cover frames:**
  - Custom Shorts thumbnails rolled out from 25 Jul 2026 to YPP channels, desktop only, with no A/B testing. They appear on the homepage and the channel page, not in the feed ([PPC Land](https://ppc.land/youtube-ends-2-year-wait-for-shorts-thumbnails-but-blocks-a-b-testing/)).
  - Before you're in YPP, build a clean "poster pose" frame into each episode and pick it in the mobile app.
- **Posts:** Posts are now recommended from the Shorts feed ([YouTube Blog](https://blog.youtube/news-and-events/made-on-youtube-creators-shorts-series-tv-features/)). Post stills, storyboard sketches and polls.
- **Revenue risk** ([PPC Land](https://ppc.land/youtube-cuts-shorts-pay-for-channels-under-10m-views-from-february-2027/)):
  - From 1 Feb 2027, new YPP applicants need 20M qualified Shorts views in 90 days, or 8,000 watch hours.
  - Existing members need 10M Shorts views per 90 days to keep earning from Shorts.
  - Cartoon Brew calls this "fundamentally at odds with animation's longer production timelines" ([Cartoon Brew](https://www.cartoonbrew.com/newsletter/disneys-big-announcements-youtubes-monetization-changes-robloxs-legal-troubles-265732.html)).
  - Hedge with long-form "season" compilations, because Shorts views don't count toward watch hours.

## 8. What successful animated channels do
- **Jake Fellman** animated Among Us and Minecraft in a distinctive style ([Tubefilter](https://www.tubefilter.com/2021/07/21/creators-on-the-rise-jake-fellman/)).
  - His first Short ran 24 s and passed 22M views; he posted 90 Among Us Shorts in about 3 months.
  - Each Short took about 8 hours because he reused models and rigs.
  - In his words: "Bite-sized content is perfect for animators because it allows for a faster production cycle."
- **Alan Becker's Animation vs. Minecraft** (largely wordless) uses numbered episodes plus "Season – All Episodes" compilations ([TheTVDB](https://thetvdb.com/series/animation-vs-minecraft)). These are 16:9 short episodes rather than vertical Shorts, but the structure carries over.
- **Pencilmation** (largely wordless, about 20M subscribers) builds long-form videos out of old episodes. This adds watch time, but fans complained about quality ([Newgrounds wiki](https://newgrounds.wiki.gg/wiki/Pencilmation)).
- **Wordless content travels:** 50% of animation fans watch series in other languages ([YouTube Culture & Trends](https://blog.youtube/culture-and-trends/independent-animation-trends-report/)). Recurring characters also become meme templates ([Tubefilter](https://www.tubefilter.com/2026/04/09/youtube-culture-trends-original-animated-series-digital-circus-hazbin-hotel/)).
- **Common pattern:** a relatable game-culture premise, one iconic character silhouette, a reusable production pipeline, numbered episodes and compilations.

## 9. Policy and IP
- **Facepunch's Fan Content and Broadcast Guidelines** (updated 15 Jul 2025) ([Facepunch](https://facepunch.com/legal/ugc)):
  - YouTube ad revenue is fine.
  - Other monetisation, including "using our Games to promote someone else's products," needs written approval. Ask before doing sponsor reads.
  - "Don't call it 'official'," and don't imply Facepunch endorses you.
  - Facepunch owns the game's "setting, gameplay and appearance."
  - No content about cheating, and fan content must suit the game's target audience.
  - Facepunch can withdraw permission. Merchandise is OK "in general terms" for now.
- **In practice:**
  - Use "Rust" descriptively, and add "Unofficial fan animation, not affiliated with Facepunch Studios."
  - Redraw everything yourself: no logo, key art, UI, icons, game sound effects or music.
- **Audience setting:**
  - Rust is rated ESRB M for blood and violence ([ESRB](https://www.esrb.org/ratings/36903/rust-console-edition/)).
  - YouTube counts "animated characters or cartoon figures" as a sign of made-for-kids content. But it lists "a gaming video that features adult humor" and "animated content that appeals to everyone" as not made for kids ([Help](https://support.google.com/youtube/answer/9528076)).
  - The child-safety policy bans "family friendly cartoons that target young minors and contain... violence" ([Help](https://support.google.com/youtube/answer/2801999)).
  - So: mark the videos "not made for kids," avoid kid-coded tags and thumbnails, and keep violence slapstick and bloodless.
- **Originality rules:**
  - Vary premises and outcomes.
  - YouTube's July 2026 monetisation guidance also flags repetitive scenarios with animals in exaggerated distress. If the mascot is an animal, don't make dying the default ending ([Tubefilter](https://www.tubefilter.com/2026/07/13/youtube-inauthentic-content-monetization-policy-update/)).
- **AI:**
  - You don't need to disclose AI use for animated, non-realistic content ([Help](https://support.google.com/youtube/answer/14328491)).
  - AI work can be monetised when it is used to "visualize a unique character and narrative you invented," not generic templated output ([Help](https://support.google.com/youtube/answer/1311392)).

**Where the evidence is weak:**
- YouTube publishes no organic safe-zone spec, no loudness target and no ideal length.
- The length data comes from third-party analytics vendors.
- I found no animated Rust Shorts channel to benchmark against, which may itself be an opening.