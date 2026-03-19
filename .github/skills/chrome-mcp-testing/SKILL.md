---
name: chrome-mcp-testing
description: Playbook for end-to-end testing with Chrome MCP in this repository, including login flow, AI form chat interaction patterns, reliable selectors, and known behavior quirks.
---

# Chrome MCP Testing

Use this skill when running browser tests against FormRig with Chrome MCP tools.

## When to Apply

- End-to-end verification of frontend form flows
- AI chat assistant behavior checks
- Fast repro of UI bugs in local dev
- Regression checks around dev-auth, form creation, and chat orchestration

## Preferred Tooling

Use Chrome MCP browser tools with the `mcp_io_github_chr` prefix for navigation, script evaluation, and interaction.

### Interaction Priority Order

1. **`mcp_io_github_chr_fill` (uid)** — most reliable for Angular inputs. Always triggers Angular's change detection correctly and enables bound send/submit buttons.
2. **`mcp_io_github_chr_click` (uid)** — most reliable for buttons and interactive elements. Use `take_snapshot` first to discover stable uids.
3. **`mcp_io_github_chr_evaluate_script`** — use for reading state, waiting, combining multiple steps, or actions where uid tools are insufficient. Do NOT use for setting Angular input values — `new Event('input', { bubbles: true })` does not reliably trigger Angular change detection and leaves send/submit buttons disabled.

**Get uids via `take_snapshot` before any click or fill:**

```javascript
// 1. Snapshot to discover uids
await mcp_io_github_chr_take_snapshot();
// 2. Fill input by uid
await mcp_io_github_chr_fill({ uid: '3_8', value: 'my answer' });
// 3. Click send by uid
await mcp_io_github_chr_click({ uid: '3_9' });
```

## Test Setup

1. Navigate to the app root on localhost:4200.
2. Navigate to `/login` and click the desired dev user button.
3. Wait explicitly after navigation or login for the app shell to settle before assertions.
4. Use `take_snapshot` after each navigation to get fresh uids before interacting.

Login example:

```javascript
await mcp_io_github_chr_navigate_page({ type: 'url', url: 'http://localhost:4200/login' });
// Snapshot to find the alice button uid, then click by uid
await mcp_io_github_chr_take_snapshot();
// uid=X_Y button "Dev user: alice" — click it
await mcp_io_github_chr_click({ uid: 'X_Y' });
await mcp_io_github_chr_evaluate_script({
  function: () => new Promise(resolve => setTimeout(() => resolve(window.location.href), 2000))
});
```

For form-type card selection (e.g. creating a new form), **always use `take_snapshot` first** — the cards are rendered as buttons with stable uids. Clicking by uid is far more reliable than querying by text in `evaluate_script`:

```javascript
await mcp_io_github_chr_navigate_page({ type: 'url', url: 'http://localhost:4200/form/new' });
await mcp_io_github_chr_take_snapshot();
// uid=1_19 button "Validation & Conditional Rendering Demo ..."
await mcp_io_github_chr_click({ uid: '1_19' });
// uid=1_20 button "Create form"
await mcp_io_github_chr_click({ uid: '1_20' });
await mcp_io_github_chr_evaluate_script({
  function: () => new Promise(r => setTimeout(() => r(window.location.href), 3000))
});
```

## Reliable Selectors and DOM Patterns

Observed stable patterns in this app:

- Login user buttons are rendered as buttons in the snapshot — use uid-based click after snapshot.
- Chat send button: uid-stable in snapshot; aria-label contains "Send message". It is disabled until the input has a valid value — ensure `fill` is called before `click`.
- Chat input: uid-stable in snapshot; aria-label contains "Chat message input". Always use `fill` (not evaluate_script assignment) to populate it.
- Form type cards: rendered as buttons in snapshot with full label text. Click by uid.
- "Create form" button: rendered as a plain button, uid-stable after snapshot. Disabled until a card is selected.
- Material input controls: uid-stable in snapshot, including value state. Inspect snapshot to verify current value after interactions.

**After every navigation or significant DOM change, call `take_snapshot` to refresh uids before further interactions.**

Useful fallbacks (evaluate_script only — for reading state, not for input):

```javascript
const pageText = document.body.innerText;
const log = document.querySelector('[aria-label*="Chat messages"]');
const chatText = log ? log.innerText.slice(-400) : '';
```

## Canonical User Journey for This Repo

1. Open the login page and click the alice user button.
2. Go to the new form route.
3. Select Validation and Conditional Rendering Demo form type.
4. Create form.
5. Dismiss Form loaded notice if present.
6. Toggle AI chat overlay on early (important).
7. Fill the form through chat, one answer at a time.
8. Verify both chat transcript and form-side state.

## AI Chat Testing Protocol

When sending messages in AI mode, do not consistently produce ideal, parser-friendly input. Real users type with some variability, so test messages should include a low amount of slight imperfections across the conversation.

Use natural variation such as:

- Missing or inconsistent punctuation
- Random capitalization differences
- Small typos that keep the message understandable
- Slightly informal phrasing instead of polished prompts
- Option values paraphrased in a human way instead of copied exactly from the UI label

Keep the variation light and realistic. The goal is not to make inputs ambiguous or adversarial, but to avoid a test transcript made entirely of perfect answers that are easiest for the system to parse.

Good examples:

- `individual`
- `i want to apply as individual`
- `Netherlands no postal code yet`
- `probly email me instead`

Avoid overdoing it:

- Do not make every message noisy
- Do not stack multiple severe typos in the same short message
- Do not deliberately send nonsense or contradictory answers unless the test explicitly targets those cases

For each message:

1. Call `take_snapshot` to get current uid of chat input and send button.
2. `fill` the chat input by uid.
3. `click` the send button by uid.
4. Wait 3–4 seconds (LLM round-trip) before reading state.
5. Read chat log via `evaluate_script` (innerText of the chat log element) or `take_snapshot`.

Example:

```javascript
// Step 1: snapshot to get uids (e.g. input uid=3_8, send uid=3_9)
await mcp_io_github_chr_take_snapshot();
// Step 2: fill input
await mcp_io_github_chr_fill({ uid: '3_8', value: 'individual' });
// Step 3: click send
await mcp_io_github_chr_click({ uid: '3_9' });
// Step 4: wait and read
await mcp_io_github_chr_evaluate_script({
  function: () => new Promise(r => setTimeout(() => {
    const log = document.querySelector('[aria-label*="Chat messages"]');
    r(log ? log.innerText.slice(-400) : document.body.innerText.slice(-400));
  }, 3500))
});
```

> **Warning:** Do NOT use `evaluate_script` to set input values via `.value =` + `new Event('input')`. Angular's change detection is not reliably triggered this way and the send button stays disabled. Always use `fill` by uid.

## Expected Behavior and Failure Handling

- AI chat should correctly interpret multi-value responses (including comma-separated lists) and map them to the corresponding form fields.
- Form-side UI state should stay in sync with chat-confirmed values.
- Soft validations may allow progression, but resulting values must still match business rules and persisted state.
- If any mismatch is detected, treat it as a defect candidate. Do not normalize it as a product quirk in this skill.

## Optimization Guidelines

- Toggle chat overlay immediately after opening a form to keep chat DOM visible and easy to inspect.
- Prefer uid-based `click`/`fill` over all other interaction methods.
- Call `take_snapshot` before every significant interaction to ensure uids are fresh.
- Use `evaluate_script` only for read operations (page text, chat log, current URL), waits, or actions that genuinely require scripting.
- Capture chat log text incrementally (`log.innerText.slice(-400)`) to isolate the first divergence without re-reading the whole history.
- When debugging odd behavior, stop at first unexpected outcome, preserve the exact user message plus assistant reply, and file a fix task.

## Fast Failure Reporting Template

When you detect odd behavior, report:

- Step number in journey
- User message sent
- Assistant reply observed
- Expected reply or state change
- Actual form state evidence (text, counters, field values)
- Whether issue appears parsing-related, state-sync-related, or rendering-only

## End-to-End Smoke Script Pattern

```javascript
// 1. Login
await mcp_io_github_chr_navigate_page({ type: 'url', url: 'http://localhost:4200/login' });
await mcp_io_github_chr_take_snapshot();
// Find alice button uid from snapshot, then:
await mcp_io_github_chr_click({ uid: '<alice-button-uid>' });
await mcp_io_github_chr_evaluate_script({
  function: () => new Promise(r => setTimeout(() => r(window.location.href), 2000))
});

// 2. New form page
await mcp_io_github_chr_navigate_page({ type: 'url', url: 'http://localhost:4200/form/new' });
await mcp_io_github_chr_take_snapshot();
// Find card uid + create button uid from snapshot, then:
await mcp_io_github_chr_click({ uid: '<validation-card-uid>' });
await mcp_io_github_chr_click({ uid: '<create-form-uid>' });
await mcp_io_github_chr_evaluate_script({
  function: () => new Promise(r => setTimeout(() => r(window.location.href), 3000))
});

// 3. Open chat overlay
await mcp_io_github_chr_take_snapshot();
// uid=2_5 button "Open AI chat assistant"
await mcp_io_github_chr_click({ uid: '2_5' });
await mcp_io_github_chr_evaluate_script({
  function: () => new Promise(r => setTimeout(r, 1500))
});

// 4. Send a chat message
await mcp_io_github_chr_take_snapshot();
// uid=3_8 textbox "Chat message input", uid=3_9 button "Send message"
await mcp_io_github_chr_fill({ uid: '3_8', value: 'individual' });
await mcp_io_github_chr_click({ uid: '3_9' });
await mcp_io_github_chr_evaluate_script({
  function: () => new Promise(r => setTimeout(() => {
    const log = document.querySelector('[aria-label*="Chat messages"]');
    r(log ? log.innerText.slice(-400) : '');
  }, 3500))
});
```
