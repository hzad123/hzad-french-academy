# HZad TCF Listening Test 02 — prerecorded French audio

Test 02 MP3 files are original, locally synthesized recordings of the
HZad-authored French exam scripts. Each question's text, voice segments,
hash and recording length is stored in the published paper and media
manifest. Playback and grading do not invoke an AI or speech API.

## Voice models (offline Piper 1.8.0)

The GitHub Actions synthesis job downloads the following independent
French models from the `rhasspy/piper-voices` collection. Model weights
are temporary build dependencies; **none are shipped to learners**.

- **fr_FR-siwis-medium**: SIWIS French Speech Synthesis Database,
  University of Edinburgh. Dataset/training attribution CC BY 4.0.
  https://huggingface.co/rhasspy/piper-voices/tree/main/fr/fr_FR/siwis/medium
- **fr_FR-tom-medium**: Tjiho French TTS model, with AGPLv3 licensing
  according to the model card. The model is unmodified and used only
  offline. https://huggingface.co/rhasspy/piper-voices/tree/main/fr/fr_FR/tom/medium
- **fr_FR-upmc-medium**: Jessica and Pierre, from the MaryTTS UPMC dataset,
  CC BY-SA 4.0 according to the model card.
  https://huggingface.co/rhasspy/piper-voices/tree/main/fr/fr_FR/upmc/medium

Piper Python software: GPL-3.0-or-later (build-only), not distributed
to browsers. MP3 encoding via FFmpeg. Source speech content remains original
HZad-authored educational material; creators are not associated with HZad.

All audible outputs must be listened to by an editor before the paper is
approved for students. Hash and duration checks alone cannot detect
mispronunciations or unnatural prosody.
