# Logo integration QA — v0.4.6

**Observed defect in v0.4.5:** JPEG logo had a distinct ivory rectangle on dark UI. It felt like an image pasted into the header.

**Implemented:** master preserved, external JPEG background isolated into PNG alpha asset, header image unframed, product name typeset separately, icon and splash on continuous charcoal canvas, static route allowlisted, regression tests updated.

**Validation:** compare original image with the transparent derivative over dark and light themes. Check logo at 320px, 390px, 430px. Test image load and header overflow; native device has not been verified.

**Not yet done:** native icon compilation, icon legibility at 29px, independent accessibility testing, LiveKit real audio.
