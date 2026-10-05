# LOXER Remote Web Update Engine
## Zero-Reinstall Web Code Deployment & Cache Invalidation

---

### 1. Workflow
1. Web Developer edits React/TypeScript/CSS components.
2. Code is committed and pushed: `git push origin main`.
3. CI/CD builds production assets with cache-busting hashes.
4. Web server deploys new bundle and bumps `web_version` in `/api/mobile/config`.
5. On the user's mobile device:
   - `RemoteConfigManager` detects version delta.
   - Verifies `window.__LOXER_SAFE_TO_RELOAD__ !== false`.
   - Revalidates main HTML document.
   - Fresh UI is active immediately without APK/IPA reinstallation.
