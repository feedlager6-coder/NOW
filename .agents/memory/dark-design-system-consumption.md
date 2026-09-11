---
name: Dark design-system consumption
description: Product apps built on the shared NOW design system need an explicit dark-mode root class.
---

The shared NOW design-system stylesheet defaults to light tokens and scopes dark tokens to `.dark`; a dark product consumer must add `.dark` to the document root before rendering.

**Why:** The package intentionally supports both light and dark modes, so importing its stylesheet alone does not select the product mode.

**How to apply:** Set the mode at the app entry point and use the package tokens rather than duplicating local color variables.