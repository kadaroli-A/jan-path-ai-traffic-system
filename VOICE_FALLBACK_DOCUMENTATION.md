# Voice System Fallback - Implementation Documentation

## Overview

The JAN-PATH backend now implements a production-grade fallback voice system that ensures emergency advisories are always delivered, even if the primary Sarvam TTS API fails.

## Architecture

```
Voice Generation Pipeline
│
├─ Step 1: Sarvam API (Primary)
│   ├─ Success → Save MP3s, cache hash, return path
│   └─ Failure (402, 429, timeout, auth, etc.) → Go to Step 2
│
├─ Step 2: Local TTS via pyttsx3 (Fallback)
│   ├─ Success → Save MP3s, cache hash, return path
│   └─ Failure → Go to Step 3
│
└─ Step 3: Cached Audio (Final Fallback)
    ├─ Cache exists → Use cached files, log warning
    └─ No cache → Log error, return None
```

## Key Components

### 1. `backend/services/tts_service.py` (Modified)

**New function: `_should_use_fallback(error_text: str) -> bool`**
- Determines if an error should trigger Local TTS fallback
- Triggers on: HTTP 402, 429, 401, 403, authentication errors, timeouts, connection errors, quota errors

**Modified function: `generate_tamil_tts()`**
- Implements 3-step fallback chain
- Sarvam primary, Local TTS secondary, Cached audio tertiary
- All three steps maintain the same output filenames
- Comprehensive error logging at each step
- Thread-safe cache operations

### 2. `backend/services/local_tts_service.py` (New)

**Main function: `generate_local_tts()`**
- Uses pyttsx3 to generate multilingual speech
- Supports Tamil (ta-IN), Hindi (hi-IN), English (en-IN)
- Returns bool success/failure
- Thread-safe engine management

**Helper function: `_get_tts_engine()`**
- Thread-local TTS engine storage to avoid threading conflicts
- Language-specific rate configuration

**Cleanup function: `cleanup_engines()`**
- Called on application shutdown
- Safely closes all TTS engine instances

## Dependencies

**Added to `requirements.txt`:**
- `pyttsx3==2.90` - Cross-platform local TTS

## Logging Behavior

The system logs at each stage:

```
# Sarvam Success
Using Sarvam TTS: backend/audio/advisory_tamil.mp3 (tamil)

# Sarvam Failure → Local TTS Fallback
Sarvam TTS failed (tamil): HTTP 402 Payment Required
Switching to Local TTS for tamil

# Local TTS Success
Local TTS Generated: backend/audio/advisory_tamil.mp3 (tamil)

# Local TTS Failure → Cached Audio
Local TTS generation failed for tamil: pyttsx3 error
Local TTS Failed for tamil, using Cached Audio
Voice unavailable, using Cached Audio: backend/audio/advisory_tamil.mp3

# All Failed - No Cache Available
All TTS methods failed and no cached audio available for tamil
```

## Response Guarantee

The system guarantees emergency advisories are always delivered by:

1. ✅ **Sarvam Primary**: Highest quality, cloud-hosted
2. ✅ **Local TTS Fallback**: Automatic, instant, no network dependency
3. ✅ **Cached Audio**: Fallback to last known good state
4. ✅ **Error Handling**: No exceptions bubble up to crash the API

## Frontend Compatibility

**No changes required.** The system is 100% transparent to the frontend:

- Same MP3 output filenames: `advisory_tamil.mp3`, `advisory_english.mp3`, `advisory_hindi.mp3`
- Same API endpoints remain unchanged
- Same response schemas
- Frontend continues to request `/audio/advisory_{language}.mp3` exactly as before

## Thread Safety

The implementation maintains thread safety:

- Cache file hash validation protected by try-except
- Local TTS engine uses thread-local storage to avoid conflicts
- Generation locks in main.py still prevent duplicate generation
- No race conditions in fallback chain

## Duplicate Advisory Detection

Unchanged - still maintained:

- Advisory hash validation before generation
- Cache file hash comparison
- Exact text matching via SHA256
- Duplicate detection prevents unnecessary regeneration

## Background Generation

Unchanged - still maintained:

- Advisory generation happens in background thread
- Lock acquisition prevents overlapping generation
- Frontend never blocked waiting for audio

## Error Scenarios Handled

1. **HTTP 402 (Payment Required)** → Local TTS
2. **HTTP 429 (Rate Limited)** → Local TTS
3. **HTTP 401/403 (Authentication)** → Local TTS
4. **Network Timeout** → Local TTS
5. **Connection Refused** → Local TTS
6. **Service Unavailable (503)** → Local TTS
7. **pyttsx3 Unavailable** → Cached Audio
8. **pyttsx3 Generation Fails** → Cached Audio
9. **No Cache Available** → Logged error, graceful degradation
10. **All Methods Fail** → Advisory still sent via API (frontend handles missing audio)

## Testing Recommendations

### Manual Tests

1. **Test Sarvam Success Path**
   - Verify Sarvam API is working
   - Check log: "Using Sarvam TTS"
   - Confirm MP3 files created with correct size

2. **Test Sarvam Failure → Local TTS Path**
   - Disconnect internet or mock 429 response
   - Verify log: "Switching to Local TTS"
   - Verify Local TTS creates MP3 files
   - Confirm frontend still plays audio

3. **Test Cache Fallback Path**
   - Stop both Sarvam and pyttsx3
   - Verify log: "Voice unavailable, using Cached Audio"
   - Confirm old cached audio is used

4. **Test Duplicate Detection**
   - Send same advisory twice
   - Verify only first generates audio
   - Second time: "Skipped Duplicate Advisory"

### Integration Tests

```python
# Test Sarvam → Local TTS flow
def test_fallback_chain():
    advisory = {"tamil": "Test", "english": "Test", "hindi": "Test"}
    result = generate_multilingual_tts(advisory)
    # Verify MP3 files exist
    assert os.path.exists("backend/audio/advisory_tamil.mp3")
    assert os.path.exists("backend/audio/advisory_english.mp3")
    assert os.path.exists("backend/audio/advisory_hindi.mp3")
```

## Production Deployment Checklist

- [x] Sarvam remains primary (never removed)
- [x] Local TTS added as automatic fallback
- [x] Cached audio as final fallback
- [x] Error handling complete (402, 429, auth, timeout, etc.)
- [x] Logging implemented (Using Sarvam, Switching to Local TTS, Voice unavailable)
- [x] Thread safety maintained
- [x] Duplicate detection unchanged
- [x] Background generation unchanged
- [x] Cache validation unchanged
- [x] No frontend changes required
- [x] No API endpoint changes
- [x] No response schema changes
- [x] No function renames
- [x] pyttsx3 added to requirements.txt

## Architectural Benefits

1. **Resilience**: Never fails due to external API issues
2. **Scalability**: Reduces load on Sarvam API (local TTS fallback)
3. **Cost**: Uses free/cheap local TTS when Sarvam is unavailable
4. **Performance**: Local TTS faster than network API in fallback
5. **Transparency**: Zero impact on frontend/API contract
6. **Maintainability**: Clear 3-step flow, comprehensive logging
