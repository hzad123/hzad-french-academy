# Listening Test 01 audio provenance

The French recordings are synthesized from original HZad exam scripts and mastered
as reusable MP3 files. They use local Piper synthesis; playing or marking this
practice exam makes no speech-provider request.

## Voice models

Both models are pinned to the `rhasspy/piper-voices` revision
`6b9cfaacb4fb2e02a9621227e3c1a48bec9710c3`:

- **French Siwis, medium** (`fr_FR-siwis-medium`): French Siwis dataset,
  [SIWIS French Speech Synthesis Database, University of Edinburgh](https://datashare.is.ed.ac.uk/handle/10283/2353),
  licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  The current model was fine-tuned from the [Hi-Fi TTS](https://openslr.org/109/)
  reader 92 base (Cori Samuel), also CC BY 4.0.
  [Pinned model card](https://huggingface.co/rhasspy/piper-voices/blob/6b9cfaacb4fb2e02a9621227e3c1a48bec9710c3/fr/fr_FR/siwis/medium/MODEL_CARD).
- **French Tom, medium** (`fr_FR-tom-medium`):
  [Tjiho French TTS model for Piper](https://git.bksp.space/Tjiho/French-tts-model-piper),
  identified by its model card as AGPLv3.
  [Pinned model card](https://huggingface.co/rhasspy/piper-voices/blob/6b9cfaacb4fb2e02a9621227e3c1a48bec9710c3/fr/fr_FR/tom/medium/MODEL_CARD).
  The unmodified model is used offline to synthesize the second voice. Neither
  its weights nor a network inference service are distributed with the academy.
  Its 44,100Hz output is resampled before combining it with the Siwis recording.


Model weights are not included in the academy browser bundle or this asset folder.
The [Siwis training chain](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/COMMERCIAL_USE.md)
is listed in Piper’s commercial-use documentation; Tom’s model-card terms are
linked separately above. Dataset and model creators do not endorse this exam. Recordings have been generated from new text,
segmented, normalized and encoded to MP3; they are not original dataset recordings.

## Build software

[Piper 1.8.0](https://github.com/OHF-Voice/piper1-gpl) is used as an offline build
tool under GPL-3.0. No Piper runtime, model, speech-generation endpoint or GPL
library is shipped to students. FFmpeg encodes the output files. The deterministic
exam marking is independent of speech synthesis.
