# Voice System Fallback - Deployment Guide

## Pre-Deployment Checklist

### Code Changes
- [x] `backend/services/local_tts_service.py` - Created with pyttsx3 local TTS
- [x] `backend/services/tts_service.py` - Modified with fallback chain
- [x] `requirements.txt` - Added `pyttsx3==2.90`
- [x] `backend/tests/test_voice_fallback.py` - Comprehensive test suite

### Validation
- [x] Python syntax verified (no compilation errors)
- [x] No breaking changes to API endpoints
- [x] Response schemas unchanged
- [x] Function names unchanged
- [x] Sarvam TTS remains primary
- [x] Caching system preserved
- [x] Thread safety maintained

## Installation Steps

### 1. Update Dependencies
```bash
# Install new pyttsx3 dependency
pip install pyttsx3==2.90

# Or install all requirements fresh
pip install -r requirements.txt
```

### 2. Verify Environment
```bash
# Check pyttsx3 installation
python -c "import pyttsx3; print('pyttsx3 OK')"

# Check local_tts_service import
python -c "from backend.services.local_tts_service import generate_local_tts; print('local_tts_service OK')"

# Check tts_service import
python -c "from backend.services.tts_service import generate_multilingual_tts; print('tts_service OK')"
```

### 3. Start Backend
```bash
# Start the backend as usual - no configuration changes needed
python -m uvicorn backend.main:app --reload
# or
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

## Post-Deployment Validation

### Health Check
1. **Verify Sarvam Path Works**
   ```bash
   curl http://localhost:8000/priority-junction/AMB001
   ```
   Check logs for: "Using Sarvam TTS" or "Using Cached Audio"

2. **Simulate Sarvam Failure (Optional)**
   - Temporarily disconnect from network
   - Make API request
   - Check logs for: "Switching to Local TTS"
   - Verify frontend still plays audio

3. **Monitor Logs**
   ```bash
   # Watch for voice generation messages
   tail -f output.log | grep -i "tts\|voice\|sarvam\|local"
   ```

### Log Message Verification

Expected log patterns in production:

**Normal Operation (Sarvam Success):**
```
INFO:tts_service:Using Sarvam TTS: backend/audio/advisory_tamil.mp3 (tamil)
INFO:tts_service:Using Sarvam TTS: backend/audio/advisory_english.mp3 (english)
INFO:tts_service:Using Sarvam TTS: backend/audio/advisory_hindi.mp3 (hindi)
```

**Sarvam Failure → Local TTS:**
```
WARNING:tts_service:Sarvam TTS failed (tamil): HTTP 402 Payment Required
INFO:tts_service:Switching to Local TTS for tamil
INFO:local_tts_service:Local TTS Generated: backend/audio/advisory_tamil.mp3 (tamil)
```

**Cache Fallback:**
```
WARNING:local_tts_service:Local TTS generation failed for tamil: pyttsx3 error
WARNING:tts_service:Local TTS Failed for tamil, using Cached Audio
INFO:tts_service:Voice unavailable, using Cached Audio: backend/audio/advisory_tamil.mp3
```

## Configuration (Optional)

### Environment Variables
- `SARVAM_API_KEY` - Already configured, no changes needed
- No new environment variables required for local TTS

### Logging Level
If you need more detailed logging:
```python
# In backend/main.py, adjust logging level
logging.basicConfig(
    level=logging.DEBUG,  # Change from INFO to DEBUG for verbose logging
    format="%(asctime)s %(levelname)s %(message)s",
)
```

## Troubleshooting

### Issue: "pyttsx3 not installed"
**Solution:**
```bash
pip install pyttsx3==2.90
```

### Issue: "No TTS generated and no cached audio available"
**Cause:** Both Sarvam and pyttsx3 failed, and no cached MP3 exists
**Solution:**
1. Verify Sarvam API key is correct
2. Ensure pyttsx3 is installed: `pip install pyttsx3==2.90`
3. Generate audio manually by calling `/priority-junction/{ambulance_id}` when Sarvam is working
4. Cache will be populated and used as final fallback

### Issue: "Local TTS sounds robotic or low quality"
**Note:** This is expected behavior - pyttsx3 is a basic text-to-speech engine
**Solution:** Ensure Sarvam API is working (primary solution)

### Issue: Audio files not being generated
**Debugging:**
1. Check backend logs for TTS errors
2. Verify `backend/audio/` directory exists and is writable
3. Check API response includes `advisory` field with multilingual text
4. Verify Sarvam API key in `.env` file

## Rollback Procedure

If issues occur and rollback is needed:

1. **Revert files:**
   ```bash
   git checkout HEAD -- backend/services/tts_service.py
   git checkout HEAD -- requirements.txt
   rm backend/services/local_tts_service.py
   ```

2. **Remove pyttsx3:**
   ```bash
   pip uninstall -y pyttsx3
   ```

3. **Restart backend:**
   ```bash
   # Restart with original tts_service.py
   ```

**Note:** Rollback loses automatic fallback capability - Sarvam failures will return error instead of gracefully degrading.

## Monitoring Recommendations

### Metrics to Track
1. **Sarvam Success Rate** - % of times Sarvam API succeeds
2. **Fallback Rate** - % of times fallback to local TTS was triggered
3. **Cache Hit Rate** - % of times cached audio was used
4. **Audio Generation Success** - Ensure no audio files are missing

### Setup Monitoring
```bash
# Count Sarvam successes in logs
grep "Using Sarvam TTS" output.log | wc -l

# Count Local TTS fallbacks
grep "Switching to Local TTS" output.log | wc -l

# Count cache usages
grep "Using Cached Audio" output.log | wc -l

# Check for errors
grep "All TTS methods failed" output.log | wc -l
```

## Performance Impact

- **Sarvam Path:** No change (same as before)
- **Local TTS Path:** ~1-3 second generation time (instant fallback, acceptable for emergency)
- **Cache Path:** Instant (no generation time)
- **Memory:** +10-20MB for pyttsx3 engine instances
- **CPU:** ~5-10% spike during local TTS generation (short duration)

## Backward Compatibility

✅ **Fully Backward Compatible:**
- No API endpoint changes
- No response schema changes
- No frontend modifications required
- Same MP3 output filenames
- Sarvam remains primary (users see no difference on success)
- Fallback is transparent to frontend

## Support

For issues or questions:
1. Check logs for TTS error messages
2. Review troubleshooting section above
3. Verify pyttsx3 installation
4. Confirm Sarvam API key is valid
5. Check `backend/audio/` directory permissions

## Success Criteria

After deployment, verify:
- [ ] Backend starts without errors
- [ ] Logs show "Using Sarvam TTS" messages (normal flow)
- [ ] Audio files exist in `backend/audio/` directory
- [ ] Frontend can play audio from API endpoints
- [ ] All three languages (Tamil, English, Hindi) have MP3 files
- [ ] Advisory generation completes in under 5 seconds
